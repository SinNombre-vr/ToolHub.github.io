-- ToolHub · Profiles & Community v1
-- Applied to production on 2026-08-28. Idempotent where practical.

begin;

create table if not exists public.toolhub_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  reputation integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toolhub_profiles_username_length check (char_length(username) between 3 and 32),
  constraint toolhub_profiles_display_name_length check (char_length(display_name) <= 60),
  constraint toolhub_profiles_bio_length check (char_length(bio) <= 500)
);
create unique index if not exists toolhub_profiles_username_lower_uidx on public.toolhub_profiles(lower(username));

create table if not exists public.toolhub_favorites (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('asset','tool','guide','creation','external')),
  resource_key text not null,
  title text not null default '',
  url text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, resource_type, resource_key)
);
create index if not exists toolhub_favorites_user_created_idx on public.toolhub_favorites(user_id, created_at desc);
create index if not exists toolhub_favorites_resource_idx on public.toolhub_favorites(resource_type, resource_key);

create table if not exists public.toolhub_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toolhub_collections_name_length check (char_length(name) between 1 and 80),
  constraint toolhub_collections_description_length check (char_length(description) <= 300)
);
create index if not exists toolhub_collections_user_idx on public.toolhub_collections(user_id, created_at desc);

create table if not exists public.toolhub_collection_items (
  id bigint generated always as identity primary key,
  collection_id uuid not null references public.toolhub_collections(id) on delete cascade,
  resource_type text not null check (resource_type in ('asset','tool','guide','creation','external')),
  resource_key text not null,
  title text not null default '',
  url text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (collection_id, resource_type, resource_key)
);
create index if not exists toolhub_collection_items_collection_idx on public.toolhub_collection_items(collection_id, created_at desc);

create table if not exists public.toolhub_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('new_resource','edit','link_update','report_fix','preset','other')),
  target_type text not null default '',
  target_key text not null default '',
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reputation_awarded integer not null default 0 check (reputation_awarded between 0 and 10000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  constraint toolhub_contributions_title_length check (char_length(title) between 1 and 120),
  constraint toolhub_contributions_description_length check (char_length(description) <= 4000)
);
create index if not exists toolhub_contributions_user_idx on public.toolhub_contributions(user_id, created_at desc);
create index if not exists toolhub_contributions_status_idx on public.toolhub_contributions(status, created_at desc);
create index if not exists toolhub_contributions_reviewer_idx on public.toolhub_contributions(reviewer_id) where reviewer_id is not null;

create table if not exists public.toolhub_reputation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta between -10000 and 10000 and delta <> 0),
  reason text not null,
  contribution_id uuid references public.toolhub_contributions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists toolhub_reputation_events_user_idx on public.toolhub_reputation_events(user_id, created_at desc);
create unique index if not exists toolhub_reputation_contribution_uidx on public.toolhub_reputation_events(contribution_id) where contribution_id is not null;

create table if not exists public.toolhub_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creation_type text not null check (creation_type in ('matcap','shader','normal_map','texture')),
  name text not null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  settings jsonb not null default '{}'::jsonb,
  preview_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toolhub_creations_name_length check (char_length(name) between 1 and 100)
);
create index if not exists toolhub_creations_user_idx on public.toolhub_creations(user_id, created_at desc);
create index if not exists toolhub_creations_public_idx on public.toolhub_creations(visibility, created_at desc);

create or replace function public.toolhub_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function public.toolhub_touch_updated_at() from public, anon, authenticated;

drop trigger if exists toolhub_profiles_touch on public.toolhub_profiles;
create trigger toolhub_profiles_touch before update on public.toolhub_profiles for each row execute function public.toolhub_touch_updated_at();
drop trigger if exists toolhub_collections_touch on public.toolhub_collections;
create trigger toolhub_collections_touch before update on public.toolhub_collections for each row execute function public.toolhub_touch_updated_at();
drop trigger if exists toolhub_creations_touch on public.toolhub_creations;
create trigger toolhub_creations_touch before update on public.toolhub_creations for each row execute function public.toolhub_touch_updated_at();

create or replace function public.toolhub_create_profile_for_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_name text;
begin
  base_name := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), 'user-' || substr(new.id::text,1,8));
  base_name := left(regexp_replace(lower(base_name), '[^a-z0-9._-]+', '-', 'g'), 24);
  if char_length(base_name) < 3 then base_name := 'user-' || substr(new.id::text,1,8); end if;
  insert into public.toolhub_profiles(user_id,username,display_name)
  values(new.id, base_name || case when exists(select 1 from public.toolhub_profiles p where lower(p.username)=lower(base_name)) then '-' || substr(new.id::text,1,4) else '' end,
         coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(trim(new.raw_user_meta_data->>'name'),''),''))
  on conflict(user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.toolhub_create_profile_for_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_toolhub_profile on auth.users;
create trigger on_auth_user_created_toolhub_profile after insert on auth.users for each row execute function public.toolhub_create_profile_for_user();

insert into public.toolhub_profiles(user_id,username,display_name)
select u.id,'user-'||substr(u.id::text,1,8),coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'name','')
from auth.users u where not exists(select 1 from public.toolhub_profiles p where p.user_id=u.id)
on conflict do nothing;

create or replace function public.toolhub_sync_reputation()
returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  target := coalesce(new.user_id,old.user_id);
  update public.toolhub_profiles p set reputation=coalesce((select sum(e.delta)::integer from public.toolhub_reputation_events e where e.user_id=target),0),updated_at=now() where p.user_id=target;
  return coalesce(new,old);
end;
$$;
revoke all on function public.toolhub_sync_reputation() from public, anon, authenticated;
drop trigger if exists toolhub_reputation_sync_insert on public.toolhub_reputation_events;
create trigger toolhub_reputation_sync_insert after insert on public.toolhub_reputation_events for each row execute function public.toolhub_sync_reputation();
drop trigger if exists toolhub_reputation_sync_update on public.toolhub_reputation_events;
create trigger toolhub_reputation_sync_update after update on public.toolhub_reputation_events for each row execute function public.toolhub_sync_reputation();
drop trigger if exists toolhub_reputation_sync_delete on public.toolhub_reputation_events;
create trigger toolhub_reputation_sync_delete after delete on public.toolhub_reputation_events for each row execute function public.toolhub_sync_reputation();

create or replace function public.toolhub_sync_contribution_reputation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status='approved' and new.reputation_awarded<>0 then
    insert into public.toolhub_reputation_events(user_id,delta,reason,contribution_id)
    values(new.user_id,new.reputation_awarded,'Contribución aprobada: '||new.title,new.id)
    on conflict(contribution_id) where contribution_id is not null do update set user_id=excluded.user_id,delta=excluded.delta,reason=excluded.reason;
  else
    delete from public.toolhub_reputation_events where contribution_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.toolhub_sync_contribution_reputation() from public, anon, authenticated;
drop trigger if exists toolhub_contribution_reputation_sync on public.toolhub_contributions;
create trigger toolhub_contribution_reputation_sync after insert or update of status,reputation_awarded on public.toolhub_contributions for each row execute function public.toolhub_sync_contribution_reputation();

alter table public.toolhub_profiles enable row level security;
alter table public.toolhub_favorites enable row level security;
alter table public.toolhub_collections enable row level security;
alter table public.toolhub_collection_items enable row level security;
alter table public.toolhub_contributions enable row level security;
alter table public.toolhub_reputation_events enable row level security;
alter table public.toolhub_creations enable row level security;

-- Recreate policies so auth.uid() is initialized once per statement.
drop policy if exists toolhub_profiles_public_read on public.toolhub_profiles;
drop policy if exists toolhub_profiles_owner_update on public.toolhub_profiles;
create policy toolhub_profiles_public_read on public.toolhub_profiles for select to anon,authenticated using(true);
create policy toolhub_profiles_owner_update on public.toolhub_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

drop policy if exists toolhub_favorites_owner_all on public.toolhub_favorites;
create policy toolhub_favorites_owner_all on public.toolhub_favorites for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

drop policy if exists toolhub_collections_read on public.toolhub_collections;
drop policy if exists toolhub_collections_owner_insert on public.toolhub_collections;
drop policy if exists toolhub_collections_owner_update on public.toolhub_collections;
drop policy if exists toolhub_collections_owner_delete on public.toolhub_collections;
create policy toolhub_collections_read on public.toolhub_collections for select to anon,authenticated using(is_public or user_id=(select auth.uid()));
create policy toolhub_collections_owner_insert on public.toolhub_collections for insert to authenticated with check(user_id=(select auth.uid()));
create policy toolhub_collections_owner_update on public.toolhub_collections for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy toolhub_collections_owner_delete on public.toolhub_collections for delete to authenticated using(user_id=(select auth.uid()));

drop policy if exists toolhub_collection_items_read on public.toolhub_collection_items;
drop policy if exists toolhub_collection_items_owner_insert on public.toolhub_collection_items;
drop policy if exists toolhub_collection_items_owner_update on public.toolhub_collection_items;
drop policy if exists toolhub_collection_items_owner_delete on public.toolhub_collection_items;
create policy toolhub_collection_items_read on public.toolhub_collection_items for select to anon,authenticated using(exists(select 1 from public.toolhub_collections c where c.id=collection_id and (c.is_public or c.user_id=(select auth.uid()))));
create policy toolhub_collection_items_owner_insert on public.toolhub_collection_items for insert to authenticated with check(exists(select 1 from public.toolhub_collections c where c.id=collection_id and c.user_id=(select auth.uid())));
create policy toolhub_collection_items_owner_update on public.toolhub_collection_items for update to authenticated using(exists(select 1 from public.toolhub_collections c where c.id=collection_id and c.user_id=(select auth.uid()))) with check(exists(select 1 from public.toolhub_collections c where c.id=collection_id and c.user_id=(select auth.uid())));
create policy toolhub_collection_items_owner_delete on public.toolhub_collection_items for delete to authenticated using(exists(select 1 from public.toolhub_collections c where c.id=collection_id and c.user_id=(select auth.uid())));

drop policy if exists toolhub_contributions_read on public.toolhub_contributions;
drop policy if exists toolhub_contributions_owner_insert on public.toolhub_contributions;
drop policy if exists toolhub_contributions_admin_update on public.toolhub_contributions;
create policy toolhub_contributions_read on public.toolhub_contributions for select to authenticated using(user_id=(select auth.uid()) or status='approved' or public.toolhub_has_role(array['owner','admin','moderator']));
create policy toolhub_contributions_owner_insert on public.toolhub_contributions for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reputation_awarded=0);
create policy toolhub_contributions_admin_update on public.toolhub_contributions for update to authenticated using(public.toolhub_has_role(array['owner','admin','moderator'])) with check(public.toolhub_has_role(array['owner','admin','moderator']));

drop policy if exists toolhub_reputation_events_read on public.toolhub_reputation_events;
drop policy if exists toolhub_reputation_events_admin_all on public.toolhub_reputation_events;
drop policy if exists toolhub_reputation_events_admin_insert on public.toolhub_reputation_events;
drop policy if exists toolhub_reputation_events_admin_update on public.toolhub_reputation_events;
drop policy if exists toolhub_reputation_events_admin_delete on public.toolhub_reputation_events;
create policy toolhub_reputation_events_read on public.toolhub_reputation_events for select to authenticated using(user_id=(select auth.uid()) or public.toolhub_has_role(array['owner','admin','moderator']));
create policy toolhub_reputation_events_admin_insert on public.toolhub_reputation_events for insert to authenticated with check(public.toolhub_has_role(array['owner','admin','moderator']));
create policy toolhub_reputation_events_admin_update on public.toolhub_reputation_events for update to authenticated using(public.toolhub_has_role(array['owner','admin','moderator'])) with check(public.toolhub_has_role(array['owner','admin','moderator']));
create policy toolhub_reputation_events_admin_delete on public.toolhub_reputation_events for delete to authenticated using(public.toolhub_has_role(array['owner','admin','moderator']));

drop policy if exists toolhub_creations_read on public.toolhub_creations;
drop policy if exists toolhub_creations_owner_insert on public.toolhub_creations;
drop policy if exists toolhub_creations_owner_update on public.toolhub_creations;
drop policy if exists toolhub_creations_owner_delete on public.toolhub_creations;
create policy toolhub_creations_read on public.toolhub_creations for select to anon,authenticated using(visibility='public' or user_id=(select auth.uid()));
create policy toolhub_creations_owner_insert on public.toolhub_creations for insert to authenticated with check(user_id=(select auth.uid()));
create policy toolhub_creations_owner_update on public.toolhub_creations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy toolhub_creations_owner_delete on public.toolhub_creations for delete to authenticated using(user_id=(select auth.uid()));

grant select on public.toolhub_profiles to anon,authenticated;
grant update(username,display_name,bio,avatar_url,updated_at) on public.toolhub_profiles to authenticated;
grant select,insert,update,delete on public.toolhub_favorites to authenticated;
grant select on public.toolhub_collections to anon,authenticated;
grant insert,update,delete on public.toolhub_collections to authenticated;
grant select on public.toolhub_collection_items to anon,authenticated;
grant insert,update,delete on public.toolhub_collection_items to authenticated;
grant select,insert,update on public.toolhub_contributions to authenticated;
grant select,insert,update,delete on public.toolhub_reputation_events to authenticated;
grant select on public.toolhub_creations to anon,authenticated;
grant insert,update,delete on public.toolhub_creations to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',true,3145728,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists toolhub_avatar_public_read on storage.objects;
drop policy if exists toolhub_avatar_owner_insert on storage.objects;
drop policy if exists toolhub_avatar_owner_update on storage.objects;
drop policy if exists toolhub_avatar_owner_delete on storage.objects;
create policy toolhub_avatar_public_read on storage.objects for select to public using(bucket_id='profile-avatars');
create policy toolhub_avatar_owner_insert on storage.objects for insert to authenticated with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy toolhub_avatar_owner_update on storage.objects for update to authenticated using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy toolhub_avatar_owner_delete on storage.objects for delete to authenticated using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

commit;
