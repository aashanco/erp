-- Aashan ERP Phase 17 - User & Role Management
-- Run in Supabase SQL Editor.

alter table public.user_profiles
add column if not exists phone text,
add column if not exists department text,
add column if not exists last_login_at timestamptz,
add column if not exists updated_at timestamptz default now();

alter table public.user_profiles
drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
add constraint user_profiles_role_check
check (role in ('Admin', 'Staff', 'Office Staff', 'Technician', 'Customer', 'Read Only'));

drop policy if exists "Admins can delete profiles" on public.user_profiles;
create policy "Admins can delete profiles"
on public.user_profiles
for delete
to authenticated
using (
  exists (
    select 1 from public.user_profiles p
    where p.id = auth.uid()
    and p.role = 'Admin'
    and p.active = true
  )
);

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
