-- Aashan ERP Phase 23 - Finance Foundation
-- General Ledger, double-entry journals, trial balance, P&L, and balance sheet foundation.

create table if not exists public.gl_accounts (
  id bigserial primary key,
  account_code text not null,
  account_name text not null,
  account_type text not null default 'Expense',
  normal_balance text not null default 'Both',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists gl_accounts_account_code_uq
on public.gl_accounts(account_code);

alter table public.gl_accounts enable row level security;

drop policy if exists "Authenticated users can read gl accounts" on public.gl_accounts;
create policy "Authenticated users can read gl accounts"
on public.gl_accounts
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage gl accounts" on public.gl_accounts;
create policy "Authenticated users can manage gl accounts"
on public.gl_accounts
for all
to authenticated
using (true)
with check (true);

create table if not exists public.gl_journal_headers (
  id bigserial primary key,
  journal_no text not null unique,
  journal_date date not null,
  description text not null default '',
  status text not null default 'Draft',
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gl_journal_headers enable row level security;

drop policy if exists "Authenticated users can read journal headers" on public.gl_journal_headers;
create policy "Authenticated users can read journal headers"
on public.gl_journal_headers
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage journal headers" on public.gl_journal_headers;
create policy "Authenticated users can manage journal headers"
on public.gl_journal_headers
for all
to authenticated
using (true)
with check (true);

create table if not exists public.gl_journal_lines (
  id bigserial primary key,
  journal_id bigint not null references public.gl_journal_headers(id) on delete cascade,
  line_no integer not null,
  account_code text not null,
  account_name text not null,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.gl_journal_lines enable row level security;

drop policy if exists "Authenticated users can read journal lines" on public.gl_journal_lines;
create policy "Authenticated users can read journal lines"
on public.gl_journal_lines
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage journal lines" on public.gl_journal_lines;
create policy "Authenticated users can manage journal lines"
on public.gl_journal_lines
for all
to authenticated
using (true)
with check (true);

create table if not exists public.gl_ledger_entries (
  id bigserial primary key,
  journal_no text not null,
  journal_date date not null,
  account_code text not null,
  account_name text not null,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  description text not null default '',
  source_type text not null default 'Journal',
  source_id bigint null,
  created_at timestamptz not null default now()
);

create index if not exists gl_ledger_entries_date_idx on public.gl_ledger_entries(journal_date);
create index if not exists gl_ledger_entries_account_idx on public.gl_ledger_entries(account_code);

alter table public.gl_ledger_entries enable row level security;

drop policy if exists "Authenticated users can read ledger entries" on public.gl_ledger_entries;
create policy "Authenticated users can read ledger entries"
on public.gl_ledger_entries
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage ledger entries" on public.gl_ledger_entries;
create policy "Authenticated users can manage ledger entries"
on public.gl_ledger_entries
for all
to authenticated
using (true)
with check (true);

insert into public.gl_accounts (account_code, account_name, account_type, normal_balance, is_active)
values
('1000', 'Cash on Hand', 'Asset', 'Debit', true),
('1010', 'Bank Account', 'Asset', 'Debit', true),
('1100', 'Accounts Receivable', 'Asset', 'Debit', true),
('1200', 'Inventory', 'Asset', 'Debit', true),
('2000', 'Accounts Payable', 'Liability', 'Credit', true),
('2100', 'Sales Tax Payable', 'Liability', 'Credit', true),
('3000', 'Owner Equity', 'Equity', 'Credit', true),
('4000', 'Service Revenue', 'Revenue', 'Credit', true),
('4100', 'Installation Revenue', 'Revenue', 'Credit', true),
('5000', 'Materials Expense', 'Expense', 'Debit', true),
('5100', 'Labor Expense', 'Expense', 'Debit', true),
('5200', 'Fuel & Transportation Expense', 'Expense', 'Debit', true),
('5300', 'Tools & Supplies Expense', 'Expense', 'Debit', true)
on conflict (account_code) do update set
  account_name = excluded.account_name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  is_active = excluded.is_active;
