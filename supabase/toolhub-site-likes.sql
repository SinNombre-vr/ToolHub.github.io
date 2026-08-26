-- ToolHub v23.2 · Me gusta global de la página
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Guarda un voto por identificador aleatorio de navegador/perfil y expone únicamente
-- RPCs para consultar el estado y el contador global. No expone la tabla de votos al frontend.

begin;

create table if not exists public.toolhub_site_likes (
  id bigint generated always as identity primary key,
  site_key text not null default 'toolhub-home' check (site_key = 'toolhub-home'),
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  unique (site_key, visitor_id)
);

create index if not exists toolhub_site_likes_created_idx
  on public.toolhub_site_likes(created_at desc);

alter table public.toolhub_site_likes enable row level security;

-- La tabla no se consulta directamente desde el navegador.
revoke all on table public.toolhub_site_likes from anon, authenticated;

create or replace function public.toolhub_home_like_status(p_visitor uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'liked', exists (
      select 1
      from public.toolhub_site_likes
      where site_key = 'toolhub-home'
        and visitor_id = p_visitor
    ),
    'count', (
      select count(*)::integer
      from public.toolhub_site_likes
      where site_key = 'toolhub-home'
    )
  );
$$;

create or replace function public.toolhub_home_set_like(p_visitor uuid, p_liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_visitor is null then
    raise exception 'visitor_id requerido';
  end if;

  if coalesce(p_liked, false) then
    insert into public.toolhub_site_likes(site_key, visitor_id)
    values ('toolhub-home', p_visitor)
    on conflict (site_key, visitor_id) do nothing;
  else
    delete from public.toolhub_site_likes
    where site_key = 'toolhub-home'
      and visitor_id = p_visitor;
  end if;

  select jsonb_build_object(
    'liked', exists (
      select 1
      from public.toolhub_site_likes
      where site_key = 'toolhub-home'
        and visitor_id = p_visitor
    ),
    'count', (
      select count(*)::integer
      from public.toolhub_site_likes
      where site_key = 'toolhub-home'
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.toolhub_home_like_status(uuid) from public;
revoke all on function public.toolhub_home_set_like(uuid, boolean) from public;

grant execute on function public.toolhub_home_like_status(uuid) to anon, authenticated;
grant execute on function public.toolhub_home_set_like(uuid, boolean) to anon, authenticated;

commit;
