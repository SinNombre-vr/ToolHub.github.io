-- ToolHub Auth 2.0 · foundation
-- PREPARADA, no aplicar hasta la validación de la rama Auth 2.0.
-- Objetivo: usar el estado verificado real de Supabase Auth como fuente de verdad,
-- manteniendo las columnas email_verified_* por compatibilidad con ToolHub.

create or replace function public.toolhub_is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.toolhub_is_email_verified() from public, anon;
grant execute on function public.toolhub_is_email_verified() to authenticated;

create or replace function public.toolhub_sync_auth_verification()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  confirmed_at timestamptz;
  provider_name text;
begin
  if uid is null then
    return false;
  end if;

  select u.email_confirmed_at
    into confirmed_at
  from auth.users u
  where u.id = uid;

  if confirmed_at is null then
    return false;
  end if;

  provider_name := coalesce(
    auth.jwt()->'app_metadata'->>'provider',
    auth.jwt()->'amr'->0->>'method',
    'supabase'
  );

  update public.toolhub_profiles
  set email_verified_at = coalesce(email_verified_at, confirmed_at, now()),
      email_verified_method = coalesce(email_verified_method, 'supabase:' || provider_name),
      updated_at = now()
  where user_id = uid;

  return found;
end;
$$;

revoke all on function public.toolhub_sync_auth_verification() from public, anon;
grant execute on function public.toolhub_sync_auth_verification() to authenticated;

-- Los usuarios que ya están confirmados en Supabase se sincronizan sin cambiar UUID,
-- perfiles, favoritos, colecciones, reputación ni contribuciones.
update public.toolhub_profiles p
set email_verified_at = coalesce(p.email_verified_at, u.email_confirmed_at),
    email_verified_method = coalesce(p.email_verified_method, 'supabase:backfill'),
    updated_at = now()
from auth.users u
where u.id = p.user_id
  and u.email_confirmed_at is not null
  and p.email_verified_at is null;

create or replace function public.toolhub_create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  initial_method text;
begin
  base_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    'user-' || substr(new.id::text, 1, 8)
  );

  base_name := left(regexp_replace(lower(base_name), '[^a-z0-9._-]+', '-', 'g'), 24);
  if char_length(base_name) < 3 then
    base_name := 'user-' || substr(new.id::text, 1, 8);
  end if;

  initial_method := case
    when new.email_confirmed_at is not null
      then 'supabase:' || coalesce(new.raw_app_meta_data->>'provider', 'verified')
    else null
  end;

  insert into public.toolhub_profiles(
    user_id,
    username,
    display_name,
    avatar_url,
    email_verified_at,
    email_verified_method
  )
  values (
    new.id,
    base_name || case
      when exists(select 1 from public.toolhub_profiles p where lower(p.username) = lower(base_name))
      then '-' || substr(new.id::text, 1, 4)
      else ''
    end,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      ''
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data->>'picture'), ''),
      ''
    ),
    new.email_confirmed_at,
    initial_method
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- RPCs sensibles: nunca deben estar disponibles para anon.
revoke all on function public.toolhub_add_admin_by_email(text, text) from public, anon;
grant execute on function public.toolhub_add_admin_by_email(text, text) to authenticated;

revoke all on function public.toolhub_remove_admin(uuid) from public, anon;
grant execute on function public.toolhub_remove_admin(uuid) to authenticated;

revoke all on function public.toolhub_list_admins() from public, anon;
grant execute on function public.toolhub_list_admins() to authenticated;

revoke all on function public.toolhub_has_role(text[]) from public, anon;
grant execute on function public.toolhub_has_role(text[]) to authenticated;

-- Las funciones que solo deben ser ejecutadas por triggers no se exponen vía RPC.
revoke all on function public.toolhub_log_asset_activity() from public, anon, authenticated;
revoke all on function public.toolhub_touch_asset() from public, anon, authenticated;
revoke all on function public.toolhub_touch_private_asset() from public, anon, authenticated;

-- toolhub_home_like_status / toolhub_home_set_like se mantienen fuera de este hardening:
-- son RPCs anónimas intencionales para el contador público de likes y se revisarán aparte.