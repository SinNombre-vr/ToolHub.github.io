-- ToolHub Admin v2 / v23.0
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Añade edición, ocultación, destacados, reportes, actividad y gestión de administradores.

begin;

create extension if not exists pgcrypto;

alter table public.assets
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.toolhub_admins
  add column if not exists role text not null default 'admin',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'toolhub_admins_role_check'
  ) then
    alter table public.toolhub_admins
      add constraint toolhub_admins_role_check
      check (role in ('owner', 'admin', 'moderator'));
  end if;
end $$;

-- Si la instalación anterior solo tenía un administrador, lo conserva como propietario.
do $$
begin
  if exists (select 1 from public.toolhub_admins)
     and not exists (select 1 from public.toolhub_admins where role = 'owner') then
    update public.toolhub_admins
    set role = 'owner'
    where user_id = (select user_id from public.toolhub_admins limit 1);
  end if;
end $$;

create table if not exists public.toolhub_reports (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  reason text not null check (reason in ('broken_link','wrong_preview','duplicate','nsfw','wrong_info','other')),
  details text not null default '',
  status text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  resolution_note text not null default ''
);

create index if not exists toolhub_reports_asset_idx on public.toolhub_reports(asset_id);
create index if not exists toolhub_reports_status_idx on public.toolhub_reports(status, created_at desc);

create table if not exists public.toolhub_activity (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  asset_id uuid,
  asset_name text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists toolhub_activity_created_idx on public.toolhub_activity(created_at desc);
create index if not exists toolhub_activity_asset_idx on public.toolhub_activity(asset_id);

create or replace function public.toolhub_has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.toolhub_admins a
    where a.user_id = auth.uid()
      and a.role = any(allowed_roles)
  );
$$;

grant execute on function public.toolhub_has_role(text[]) to anon, authenticated;

create or replace function public.toolhub_touch_asset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists toolhub_assets_touch on public.assets;
create trigger toolhub_assets_touch
before update on public.assets
for each row execute function public.toolhub_touch_asset();

create or replace function public.toolhub_log_asset_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  action_name text;
  target_id uuid;
  target_name text;
  payload jsonb;
begin
  if tg_op = 'INSERT' then
    action_name := 'asset_created';
    target_id := new.id;
    target_name := coalesce(new.name, '');
    payload := jsonb_build_object('category', new.category);
  elsif tg_op = 'DELETE' then
    action_name := 'asset_deleted';
    target_id := old.id;
    target_name := coalesce(old.name, '');
    payload := jsonb_build_object('category', old.category);
  else
    target_id := new.id;
    target_name := coalesce(new.name, '');
    if new.is_hidden is distinct from old.is_hidden then
      action_name := case when new.is_hidden then 'asset_hidden' else 'asset_published' end;
    elsif new.is_featured is distinct from old.is_featured then
      action_name := case when new.is_featured then 'asset_featured' else 'asset_unfeatured' end;
    elsif new.tags is distinct from old.tags then
      action_name := 'asset_tags_updated';
    else
      action_name := 'asset_updated';
    end if;
    payload := jsonb_build_object(
      'old_hidden', old.is_hidden,
      'new_hidden', new.is_hidden,
      'old_featured', old.is_featured,
      'new_featured', new.is_featured
    );
  end if;

  insert into public.toolhub_activity(actor_id, action, asset_id, asset_name, metadata)
  values (auth.uid(), action_name, target_id, target_name, payload);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists toolhub_assets_activity on public.assets;
create trigger toolhub_assets_activity
after insert or update or delete on public.assets
for each row execute function public.toolhub_log_asset_activity();

alter table public.assets enable row level security;
alter table public.toolhub_admins enable row level security;
alter table public.toolhub_reports enable row level security;
alter table public.toolhub_activity enable row level security;

-- Reemplaza las políticas antiguas para evitar que una política SELECT USING(true)
-- haga visibles las fichas ocultas.
drop policy if exists assets_public_read on public.assets;
drop policy if exists assets_public_insert on public.assets;
drop policy if exists assets_admin_delete on public.assets;
drop policy if exists assets_admin_update on public.assets;
drop policy if exists admins_self_read on public.toolhub_admins;
drop policy if exists admins_owner_read on public.toolhub_admins;
drop policy if exists reports_public_insert on public.toolhub_reports;
drop policy if exists reports_admin_read on public.toolhub_reports;
drop policy if exists reports_admin_update on public.toolhub_reports;
drop policy if exists reports_admin_delete on public.toolhub_reports;
drop policy if exists activity_admin_read on public.toolhub_activity;

create policy assets_public_read
on public.assets
for select
to anon, authenticated
using (
  is_hidden = false
  or public.toolhub_has_role(array['owner','admin','moderator'])
);

create policy assets_public_insert
on public.assets
for insert
to anon, authenticated
with check (
  is_hidden = false
  and is_featured = false
);

create policy assets_admin_update
on public.assets
for update
to authenticated
using (public.toolhub_has_role(array['owner','admin','moderator']))
with check (public.toolhub_has_role(array['owner','admin','moderator']));

create policy assets_admin_delete
on public.assets
for delete
to authenticated
using (public.toolhub_has_role(array['owner','admin']));

create policy admins_self_read
on public.toolhub_admins
for select
to authenticated
using (user_id = auth.uid());

create policy reports_public_insert
on public.toolhub_reports
for insert
to anon, authenticated
with check (status = 'pending');

create policy reports_admin_read
on public.toolhub_reports
for select
to authenticated
using (public.toolhub_has_role(array['owner','admin','moderator']));

create policy reports_admin_update
on public.toolhub_reports
for update
to authenticated
using (public.toolhub_has_role(array['owner','admin','moderator']))
with check (public.toolhub_has_role(array['owner','admin','moderator']));

create policy reports_admin_delete
on public.toolhub_reports
for delete
to authenticated
using (public.toolhub_has_role(array['owner','admin']));

create policy activity_admin_read
on public.toolhub_activity
for select
to authenticated
using (public.toolhub_has_role(array['owner','admin','moderator']));

revoke all on table public.assets from anon, authenticated;
revoke all on table public.toolhub_admins from anon, authenticated;
revoke all on table public.toolhub_reports from anon, authenticated;
revoke all on table public.toolhub_activity from anon, authenticated;

grant select, insert on table public.assets to anon, authenticated;
grant update, delete on table public.assets to authenticated;
grant select on table public.toolhub_admins to authenticated;
grant insert on table public.toolhub_reports to anon, authenticated;
grant select, update, delete on table public.toolhub_reports to authenticated;
grant select on table public.toolhub_activity to authenticated;

-- RPC: lista administradores con correo sin exponer auth.users al cliente.
create or replace function public.toolhub_list_admins()
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.toolhub_has_role(array['owner']) then
    raise exception 'Not authorized';
  end if;

  return query
  select a.user_id, u.email::text, a.role, a.created_at
  from public.toolhub_admins a
  left join auth.users u on u.id = a.user_id
  order by case a.role when 'owner' then 0 when 'admin' then 1 else 2 end, a.created_at;
end;
$$;

grant execute on function public.toolhub_list_admins() to authenticated;

create or replace function public.toolhub_add_admin_by_email(target_email text, target_role text default 'moderator')
returns table(user_id uuid, email text, role text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_id uuid;
begin
  if not public.toolhub_has_role(array['owner']) then
    raise exception 'Not authorized';
  end if;

  if target_role not in ('owner','admin','moderator') then
    raise exception 'Invalid role';
  end if;

  select id into target_id
  from auth.users
  where lower(auth.users.email) = lower(trim(target_email))
  limit 1;

  if target_id is null then
    raise exception 'No existe un usuario de Supabase con ese correo';
  end if;

  insert into public.toolhub_admins(user_id, role)
  values (target_id, target_role)
  on conflict (user_id) do update set role = excluded.role;

  return query select target_id, target_email, target_role;
end;
$$;

grant execute on function public.toolhub_add_admin_by_email(text, text) to authenticated;

create or replace function public.toolhub_remove_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.toolhub_has_role(array['owner']) then
    raise exception 'Not authorized';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta propietaria desde este panel';
  end if;

  delete from public.toolhub_admins where user_id = target_user_id;
  return found;
end;
$$;

grant execute on function public.toolhub_remove_admin(uuid) to authenticated;

commit;
