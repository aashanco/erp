-- Aashan ERP Phase 16 - Authentication and Security
-- Run this in Supabase SQL Editor.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'Technician',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_check check (role in ('Admin', 'Office Staff', 'Technician', 'Customer'))
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.user_profiles;
create policy "Admins can read all profiles"
on public.user_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.user_profiles p
    where p.id = auth.uid()
    and p.role = 'Admin'
    and p.active = true
  )
);

drop policy if exists "Users can create own pending profile" on public.user_profiles;
create policy "Users can create own pending profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Admins can update profiles" on public.user_profiles;
create policy "Admins can update profiles"
on public.user_profiles
for update
to authenticated
using (
  exists (
    select 1 from public.user_profiles p
    where p.id = auth.uid()
    and p.role = 'Admin'
    and p.active = true
  )
)
with check (
  exists (
    select 1 from public.user_profiles p
    where p.id = auth.uid()
    and p.role = 'Admin'
    and p.active = true
  )
);

-- After first signup, activate the admin user:
-- update public.user_profiles
-- set role = 'Admin', active = true, full_name = 'Anil Thomas'
-- where email = 'support@aashan.co';
