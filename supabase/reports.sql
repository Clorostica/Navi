-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Creates the reports table that powers "Report here" + community reports per station.
-- Safe to re-run: uses "if not exists" everywhere, including for columns, so it
-- also patches a table that was already created by an older version of this file.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  station_name text not null,
  description text not null,
  additional_details text,
  severity text not null,
  status text not null default 'submitted'
);

-- Patches for tables created before this column set existed/was renamed.
alter table public.reports add column if not exists station_name text;
alter table public.reports add column if not exists additional_details text;
alter table public.reports add column if not exists severity text;
alter table public.reports add column if not exists status text not null default 'submitted';

-- If an older version of this table left a "station" column behind (before
-- the rename to "station_name"), stop it from blocking inserts.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'station'
  ) then
    execute 'alter table public.reports alter column station drop not null';
  end if;
end $$;

create index if not exists reports_station_name_idx on public.reports (station_name);
create index if not exists reports_user_id_idx on public.reports (user_id);

alter table public.reports enable row level security;

-- Every signed-in user can see every report (this is the "what others reported" feed).
drop policy if exists "reports_select_all_authenticated" on public.reports;
create policy "reports_select_all_authenticated"
  on public.reports for select
  to authenticated
  using (true);

-- Users can only create reports attributed to themselves.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Refresh PostgREST's cached view of the schema so new/renamed columns are
-- picked up immediately instead of erroring until the cache next refreshes.
notify pgrst, 'reload schema';
