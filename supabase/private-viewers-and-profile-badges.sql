-- ToolHub · acceso de solo lectura al almacén privado + badges decorativos
-- La asignación concreta de usuarios se gestiona fuera de esta migración.

create table if not exists public.toolhub_private_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_level text not null default 'viewer' check (access_level in ('viewer')),
  created_at timestamptz not null default now()
);

alter table public.toolhub_private_access enable row level security;

drop policy if exists private_access_self_read on public.toolhub_private_access;
create policy private_access_self_read
on public.toolhub_private_access
for select
to authenticated
using (user_id = auth.uid() or public.toolhub_has_role(array['owner','admin']));

grant select on public.toolhub_private_access to authenticated;
revoke insert, update, delete on public.toolhub_private_access from anon, authenticated;

create table if not exists public.toolhub_profile_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  label text not null check (char_length(label) between 1 and 32),
  color text not null default '#8b5cf6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.toolhub_profile_badges enable row level security;

drop policy if exists profile_badges_public_read on public.toolhub_profile_badges;
create policy profile_badges_public_read
on public.toolhub_profile_badges
for select
to anon, authenticated
using (active = true);

grant select on public.toolhub_profile_badges to anon, authenticated;
revoke insert, update, delete on public.toolhub_profile_badges from anon, authenticated;

create or replace function public.toolhub_can_view_private_assets()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and (
      public.toolhub_has_role(array['owner','admin'])
      or exists (
        select 1
        from public.toolhub_private_access pa
        where pa.user_id = auth.uid()
          and pa.access_level = 'viewer'
      )
    );
$$;

revoke all on function public.toolhub_can_view_private_assets() from public, anon;
grant execute on function public.toolhub_can_view_private_assets() to authenticated, service_role;

drop policy if exists private_assets_owner_admin_read on public.toolhub_private_assets;
drop policy if exists private_assets_authorized_read on public.toolhub_private_assets;
create policy private_assets_authorized_read
on public.toolhub_private_assets
for select
to authenticated
using (public.toolhub_can_view_private_assets());
