-- Aashan ERP Phase 21.2 - Resend Email Engine

create table if not exists public.email_logs (
  id bigserial primary key,
  to_email text not null,
  subject text,
  document_type text,
  status text not null default 'Sent',
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

drop policy if exists "Authenticated users can read email logs" on public.email_logs;
create policy "Authenticated users can read email logs"
on public.email_logs
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert email logs" on public.email_logs;
create policy "Authenticated users can insert email logs"
on public.email_logs
for insert
to authenticated
with check (true);
