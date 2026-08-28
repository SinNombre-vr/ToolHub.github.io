-- ToolHub email verification v1
-- Applied to production Supabase on 2026-08-28.

alter table public.toolhub_profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_verified_method text;

update public.toolhub_profiles
set email_verified_at = coalesce(email_verified_at, now()),
    email_verified_method = coalesce(email_verified_method, 'legacy')
where email_verified_at is null;

create or replace function public.toolhub_is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.toolhub_profiles p
    where p.user_id = auth.uid()
      and p.email_verified_at is not null
  );
$$;

revoke all on function public.toolhub_is_email_verified() from public, anon;
grant execute on function public.toolhub_is_email_verified() to authenticated;

create or replace function public.toolhub_mark_email_verified()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  method text := auth.jwt()->'amr'->0->>'method';
  verified_at timestamptz;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if method not in ('otp', 'magiclink') then
    raise exception 'A recent email verification is required';
  end if;

  update public.toolhub_profiles
  set email_verified_at = coalesce(email_verified_at, now()),
      email_verified_method = method,
      updated_at = now()
  where user_id = uid
  returning email_verified_at into verified_at;

  if verified_at is null then raise exception 'Profile not found'; end if;
  return verified_at;
end;
$$;

revoke all on function public.toolhub_mark_email_verified() from public, anon;
grant execute on function public.toolhub_mark_email_verified() to authenticated;

create or replace function public.toolhub_protect_email_verification_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.email_verified_at := old.email_verified_at;
    new.email_verified_method := old.email_verified_method;
  end if;
  return new;
end;
$$;

drop trigger if exists toolhub_profiles_protect_email_verification on public.toolhub_profiles;
create trigger toolhub_profiles_protect_email_verification
before update on public.toolhub_profiles
for each row execute function public.toolhub_protect_email_verification_fields();

drop policy if exists toolhub_favorites_verified_gate on public.toolhub_favorites;
create policy toolhub_favorites_verified_gate on public.toolhub_favorites
as restrictive for all to authenticated
using ((select public.toolhub_is_email_verified()))
with check ((select public.toolhub_is_email_verified()));

drop policy if exists toolhub_collections_verified_gate on public.toolhub_collections;
create policy toolhub_collections_verified_gate on public.toolhub_collections
as restrictive for all to authenticated
using ((select public.toolhub_is_email_verified()))
with check ((select public.toolhub_is_email_verified()));

drop policy if exists toolhub_collection_items_verified_gate on public.toolhub_collection_items;
create policy toolhub_collection_items_verified_gate on public.toolhub_collection_items
as restrictive for all to authenticated
using ((select public.toolhub_is_email_verified()))
with check ((select public.toolhub_is_email_verified()));

drop policy if exists toolhub_contributions_verified_gate on public.toolhub_contributions;
create policy toolhub_contributions_verified_gate on public.toolhub_contributions
as restrictive for all to authenticated
using ((select public.toolhub_is_email_verified()))
with check ((select public.toolhub_is_email_verified()));

drop policy if exists toolhub_creations_verified_gate on public.toolhub_creations;
create policy toolhub_creations_verified_gate on public.toolhub_creations
as restrictive for all to authenticated
using ((select public.toolhub_is_email_verified()))
with check ((select public.toolhub_is_email_verified()));

drop policy if exists assets_public_insert on public.assets;
drop policy if exists assets_verified_insert on public.assets;
create policy assets_verified_insert on public.assets
for insert to authenticated
with check (
  (select public.toolhub_is_email_verified())
  and is_hidden = false
  and is_featured = false
  and submitted_by = (select auth.uid())
);
