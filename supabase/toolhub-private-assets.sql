-- ToolHub · Almacén privado / v24
-- Requiere haber ejecutado antes: supabase/toolhub-admin-v2.sql
-- Ejecutar una sola vez en Supabase > SQL Editor.
--
-- Seguridad:
--   * anon: sin acceso
--   * authenticated sin rol: sin acceso
--   * moderator: sin acceso
--   * owner / admin: lectura y escritura completas

begin;

create extension if not exists pgcrypto;

create table if not exists public.toolhub_private_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Otro',
  author text not null default '',
  platform text not null default 'No especificado',
  author_url text not null default '',
  preview_url text not null default '',
  download_url text not null default '',
  tags text[] not null default '{}'::text[],
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toolhub_private_assets_created_idx
  on public.toolhub_private_assets(created_at desc);

create index if not exists toolhub_private_assets_category_idx
  on public.toolhub_private_assets(category);

create or replace function public.toolhub_touch_private_asset()
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

drop trigger if exists toolhub_private_assets_touch on public.toolhub_private_assets;
create trigger toolhub_private_assets_touch
before update on public.toolhub_private_assets
for each row execute function public.toolhub_touch_private_asset();

alter table public.toolhub_private_assets enable row level security;

drop policy if exists private_assets_owner_admin_read on public.toolhub_private_assets;
drop policy if exists private_assets_owner_admin_insert on public.toolhub_private_assets;
drop policy if exists private_assets_owner_admin_update on public.toolhub_private_assets;
drop policy if exists private_assets_owner_admin_delete on public.toolhub_private_assets;

create policy private_assets_owner_admin_read
on public.toolhub_private_assets
for select
to authenticated
using (public.toolhub_has_role(array['owner','admin']));

create policy private_assets_owner_admin_insert
on public.toolhub_private_assets
for insert
to authenticated
with check (public.toolhub_has_role(array['owner','admin']));

create policy private_assets_owner_admin_update
on public.toolhub_private_assets
for update
to authenticated
using (public.toolhub_has_role(array['owner','admin']))
with check (public.toolhub_has_role(array['owner','admin']));

create policy private_assets_owner_admin_delete
on public.toolhub_private_assets
for delete
to authenticated
using (public.toolhub_has_role(array['owner','admin']));

revoke all on table public.toolhub_private_assets from anon, authenticated;
grant select, insert, update, delete on table public.toolhub_private_assets to authenticated;

commit;
