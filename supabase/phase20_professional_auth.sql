-- Aashan ERP Phase 20 - Professional Authentication
-- Run this in Supabase SQL Editor.

alter table public.user_profiles
add column if not exists phone text,
add column if not exists department text,
add column if not exists last_login_at timestamptz,
add column if not exists updated_at timestamptz default now();

create table if not exists public.login_audit_log (
  id bigserial primary key,
  user_id uuid,
  email text,
  action text not null,
  notes text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.login_audit_log enable row level security;

drop policy if exists "Authenticated users can insert login audit" on public.login_audit_log;
create policy "Authenticated users can insert login audit"
on public.login_audit_log
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can read login audit" on public.login_audit_log;
create policy "Authenticated users can read login audit"
on public.login_audit_log
for select
to authenticated
using (true);

drop policy if exists "Anon can insert login audit" on public.login_audit_log;
create policy "Anon can insert login audit"
on public.login_audit_log
for insert
to anon
with check (true);
