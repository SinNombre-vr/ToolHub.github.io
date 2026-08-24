-- ToolHub · Biblioteca de Assets
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Modelo: lectura pública + publicación pública + borrado SOLO por administradores autenticados.

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 90),
  category text not null check (category in ('Avatar','Ropa','Pelo','Accesorio','Shader','Textura','Prefab','Animación','Herramienta','Otro')),
  author text not null default '' check (char_length(author) <= 70),
  platform text not null default 'No especificado' check (platform in ('PC','Quest / Android','PC + Quest','No especificado')),
  author_url text not null check (char_length(author_url) between 8 and 2048),
  preview_url text not null default '' check (char_length(preview_url) <= 2048),
  download_url text not null check (char_length(download_url) between 8 and 2048),
  tags text[] not null default '{}'::text[] check (cardinality(tags) <= 20),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists assets_created_at_idx on public.assets (created_at desc);
create index if not exists assets_category_idx on public.assets (category);
create index if not exists assets_platform_idx on public.assets (platform);

create table if not exists public.toolhub_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;
alter table public.toolhub_admins enable row level security;

drop policy if exists assets_public_read on public.assets;
drop policy if exists assets_public_insert on public.assets;
drop policy if exists assets_admin_delete on public.assets;
drop policy if exists admins_self_read on public.toolhub_admins;

create policy assets_public_read
on public.assets
for select
to anon, authenticated
using (true);

create policy assets_public_insert
on public.assets
for insert
to anon, authenticated
with check (true);

create policy assets_admin_delete
on public.assets
for delete
to authenticated
using (
  exists (
    select 1
    from public.toolhub_admins admin
    where admin.user_id = auth.uid()
  )
);

create policy admins_self_read
on public.toolhub_admins
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.assets from anon, authenticated;
revoke all on table public.toolhub_admins from anon, authenticated;

grant select on table public.assets to anon, authenticated;
grant insert (name, category, author, platform, author_url, preview_url, download_url, tags, description)
on table public.assets to anon, authenticated;
grant delete on table public.assets to authenticated;
grant select on table public.toolhub_admins to authenticated;

-- IMPORTANTE:
-- 1) En Supabase > Authentication > Users crea tu usuario administrador.
-- 2) Copia su UUID.
-- 3) Ejecuta después esta línea sustituyendo TU_UUID:
--
-- insert into public.toolhub_admins (user_id)
-- values ('TU_UUID')
-- on conflict (user_id) do nothing;
--
-- No añadas usuarios normales a toolhub_admins: solo podrán borrar quienes estén aquí.
