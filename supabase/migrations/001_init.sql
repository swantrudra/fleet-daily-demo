-- Fleet Daily — initial schema
-- Run once in the Supabase SQL editor (or with `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid, -- kept for schema consistency; equals id for a company row
  name text not null,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null check (type in ('excavator', 'jcb', 'tipper', 'roller', 'other')),
  reading_type text not null check (reading_type in ('hours', 'km')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  current_site_id uuid references public.sites(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  mobile text not null unique,
  role text not null check (role in ('driver', 'owner')),
  machine_id uuid references public.machines(id) on delete set null,
  preferred_language text not null default 'mr' check (preferred_language in ('en', 'mr', 'hi')),
  created_at timestamptz not null default now()
);

create table public.shift_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  log_date date not null default ((now() at time zone 'Asia/Kolkata')::date),
  opening_reading numeric not null check (opening_reading >= 0),
  closing_reading numeric,
  worked numeric generated always as (closing_reading - opening_reading) stored,
  diesel_litres numeric not null default 0 check (diesel_litres >= 0),
  status text check (status in ('worked', 'idle', 'breakdown')), -- set when the shift ends
  start_photo_path text,
  end_photo_path text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint closing_not_below_opening check (closing_reading is null or closing_reading >= opening_reading),
  -- Demo simplification: one shift per machine per day.
  constraint one_log_per_machine_per_day unique (machine_id, log_date)
);

create table public.breakdowns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  reported_at timestamptz not null default now(),
  photo_path text,
  note text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index on public.shift_logs (company_id, log_date);
create index on public.shift_logs (machine_id, log_date desc);
create index on public.breakdowns (company_id, status);
create index on public.breakdowns (machine_id, reported_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer => they bypass RLS, so policies on
-- profiles can call them without recursing into profiles' own policies)
-- ---------------------------------------------------------------------------

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.app_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.app_machine_id()
returns uuid language sql stable security definer set search_path = public as $$
  select machine_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_owner_of(target_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and company_id = target_company
  )
$$;

-- ---------------------------------------------------------------------------
-- API grants (explicit, in case the project does not auto-expose new tables).
-- RLS below still decides which rows each user can see.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated, service_role;
grant select on public.companies, public.sites, public.machines, public.profiles to authenticated;
grant select, insert, update on public.shift_logs, public.breakdowns to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.app_role(), public.app_company_id(), public.app_machine_id(), public.is_owner_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies  enable row level security;
alter table public.sites      enable row level security;
alter table public.machines   enable row level security;
alter table public.profiles   enable row level security;
alter table public.shift_logs enable row level security;
alter table public.breakdowns enable row level security;

-- companies: anyone in the company can read its name
create policy companies_select on public.companies for select to authenticated
  using (id = public.app_company_id());

-- sites: owner reads all company sites; driver reads the site of his machine
create policy sites_select_owner on public.sites for select to authenticated
  using (public.is_owner_of(company_id));
create policy sites_select_driver on public.sites for select to authenticated
  using (id = (select current_site_id from public.machines where id = public.app_machine_id()));

-- machines
create policy machines_select_owner on public.machines for select to authenticated
  using (public.is_owner_of(company_id));
create policy machines_select_driver on public.machines for select to authenticated
  using (id = public.app_machine_id());

-- profiles
create policy profiles_select_self on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_select_owner on public.profiles for select to authenticated
  using (public.is_owner_of(company_id));

-- shift_logs
create policy shift_logs_select_owner on public.shift_logs for select to authenticated
  using (public.is_owner_of(company_id));
create policy shift_logs_select_driver on public.shift_logs for select to authenticated
  using (machine_id = public.app_machine_id());
create policy shift_logs_insert_driver on public.shift_logs for insert to authenticated
  with check (
    driver_id = auth.uid()
    and machine_id = public.app_machine_id()
    and company_id = public.app_company_id()
  );
create policy shift_logs_update_driver on public.shift_logs for update to authenticated
  using (driver_id = auth.uid())
  with check (
    driver_id = auth.uid()
    and machine_id = public.app_machine_id()
    and company_id = public.app_company_id()
  );

-- breakdowns
create policy breakdowns_select_owner on public.breakdowns for select to authenticated
  using (public.is_owner_of(company_id));
create policy breakdowns_select_driver on public.breakdowns for select to authenticated
  using (machine_id = public.app_machine_id());
create policy breakdowns_insert_driver on public.breakdowns for insert to authenticated
  with check (
    driver_id = auth.uid()
    and machine_id = public.app_machine_id()
    and company_id = public.app_company_id()
  );
-- Only the owner can update a breakdown ("Mark fixed" sets status = 'closed')
create policy breakdowns_update_owner on public.breakdowns for update to authenticated
  using (public.is_owner_of(company_id))
  with check (public.is_owner_of(company_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket "photos", path = <company_id>/<machine_id>/<file>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy photos_insert_driver on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.app_company_id()::text
    and (storage.foldername(name))[2] = public.app_machine_id()::text
  );

create policy photos_select_driver on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.app_company_id()::text
    and (storage.foldername(name))[2] = public.app_machine_id()::text
  );

-- Owner reads every photo in his company folder (used to create signed URLs)
create policy photos_select_owner on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.app_role() = 'owner'
    and (storage.foldername(name))[1] = public.app_company_id()::text
  );
