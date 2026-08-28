-- ToolHub · Perfil y aportes v2
-- Vincula los assets publicados con la cuenta comunitaria autenticada.

alter table public.assets
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

create index if not exists assets_submitted_by_created_idx
  on public.assets(submitted_by, created_at desc);

create or replace function public.toolhub_stamp_asset_submitter()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.submitted_by := auth.uid();
  else
    new.submitted_by := null;
  end if;
  return new;
end;
$$;

revoke all on function public.toolhub_stamp_asset_submitter() from public, anon, authenticated;

drop trigger if exists toolhub_assets_stamp_submitter on public.assets;
create trigger toolhub_assets_stamp_submitter
before insert on public.assets
for each row execute function public.toolhub_stamp_asset_submitter();

-- Los assets existentes antes del sistema de perfiles fueron aportados por el Owner.
-- El Owner se resuelve por rol para no fijar un UUID concreto.
update public.assets
set submitted_by = (
  select user_id
  from public.toolhub_admins
  where role = 'owner'
  order by created_at asc
  limit 1
)
where submitted_by is null;
