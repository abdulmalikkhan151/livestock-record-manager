-- Livestock Record Manager — production schema for Supabase Postgres
create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'staff');
create type public.animal_species as enum ('Cow', 'Buffalo', 'Goat');
create type public.animal_sex as enum ('Female', 'Male');
create type public.animal_status as enum ('Active', 'Sold', 'Deceased');
create type public.health_category as enum ('Vaccination', 'Treatment', 'Checkup');

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  email text not null,
  display_name text not null,
  role public.app_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (farm_id, email)
);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  email text not null,
  display_name text,
  token_hash text not null unique,
  active boolean not null default true,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, email)
);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  tag_number text not null,
  name text,
  species public.animal_species not null,
  breed text,
  sex public.animal_sex not null,
  status public.animal_status not null default 'Active',
  date_of_birth date,
  color text,
  location text,
  seller_name text,
  seller_phone text,
  purchase_date date,
  purchase_price bigint check (purchase_price is null or purchase_price >= 0),
  purchase_weight_kg numeric(10,2) check (purchase_weight_kg is null or purchase_weight_kg >= 0),
  current_weight_kg numeric(10,2) check (current_weight_kg is null or current_weight_kg >= 0),
  record_source text,
  notes text,
  photo_path text,
  photo_name text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, tag_number)
);

create table public.weight_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  weight_kg numeric(10,2) not null check (weight_kg >= 0),
  measured_at date not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now()
);

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  category public.health_category not null,
  title text not null,
  event_date date not null,
  veterinarian text,
  cost bigint check (cost is null or cost >= 0),
  next_due_date date,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now()
);

create table public.expense_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  category text not null,
  amount bigint not null check (amount >= 0),
  expense_date date not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now()
);

create table public.sale_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  sale_date date not null,
  sale_price bigint not null check (sale_price >= 0),
  sale_weight_kg numeric(10,2) check (sale_weight_kg is null or sale_weight_kg >= 0),
  buyer_name text,
  buyer_phone text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_email text not null,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  content_type text not null,
  category text not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  uploaded_by_email text not null,
  uploaded_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index animals_farm_updated_idx on public.animals (farm_id, updated_at desc);
create index animals_farm_species_idx on public.animals (farm_id, species);
create index animals_farm_status_idx on public.animals (farm_id, status);
create index weight_records_animal_idx on public.weight_records (animal_id, measured_at desc);
create index health_records_animal_idx on public.health_records (animal_id, event_date desc);
create index expense_records_animal_idx on public.expense_records (animal_id, expense_date desc);
create index sale_records_animal_idx on public.sale_records (animal_id, sale_date desc);
create index attachments_animal_idx on public.attachments (animal_id, uploaded_at desc);
create index activity_logs_farm_idx on public.activity_logs (farm_id, created_at desc);

create or replace function public.current_farm_id()
returns uuid language sql stable security definer set search_path = public
as $$ select farm_id from public.profiles where id = auth.uid() and active = true limit 1 $$;

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true limit 1 $$;

grant execute on function public.current_farm_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;

alter table public.farms enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.animals enable row level security;
alter table public.weight_records enable row level security;
alter table public.health_records enable row level security;
alter table public.expense_records enable row level security;
alter table public.sale_records enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_logs enable row level security;

create policy farms_select_team on public.farms for select to authenticated using (id = public.current_farm_id());
create policy profiles_select_team on public.profiles for select to authenticated using (farm_id = public.current_farm_id());
create policy profiles_owner_update on public.profiles for update to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id());
create policy invitations_owner_all on public.staff_invitations for all to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');

create policy animals_team_select on public.animals for select to authenticated using (farm_id = public.current_farm_id());
create policy animals_owner_insert on public.animals for insert to authenticated with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');
create policy animals_owner_update on public.animals for update to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id());
create policy animals_owner_delete on public.animals for delete to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');

create policy weights_team_select on public.weight_records for select to authenticated using (farm_id = public.current_farm_id());
create policy weights_owner_write on public.weight_records for all to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');
create policy health_team_select on public.health_records for select to authenticated using (farm_id = public.current_farm_id());
create policy health_owner_write on public.health_records for all to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');
create policy expenses_team_select on public.expense_records for select to authenticated using (farm_id = public.current_farm_id());
create policy expenses_owner_write on public.expense_records for all to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');
create policy sales_team_select on public.sale_records for select to authenticated using (farm_id = public.current_farm_id());
create policy sales_owner_write on public.sale_records for all to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');
create policy attachments_team_select on public.attachments for select to authenticated using (farm_id = public.current_farm_id());
create policy attachments_owner_write on public.attachments for all to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner') with check (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');
create policy logs_owner_select on public.activity_logs for select to authenticated using (farm_id = public.current_farm_id() and public.current_app_role() = 'owner');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('animal-files', 'animal-files', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy animal_files_team_read on storage.objects for select to authenticated
using (bucket_id = 'animal-files' and split_part(name, '/', 1) = public.current_farm_id()::text);
create policy animal_files_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'animal-files' and split_part(name, '/', 1) = public.current_farm_id()::text and public.current_app_role() = 'owner');
create policy animal_files_owner_update on storage.objects for update to authenticated
using (bucket_id = 'animal-files' and split_part(name, '/', 1) = public.current_farm_id()::text and public.current_app_role() = 'owner');
create policy animal_files_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'animal-files' and split_part(name, '/', 1) = public.current_farm_id()::text and public.current_app_role() = 'owner');
