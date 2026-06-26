-- Aashan ERP - Posting Profiles
create table if not exists public.posting_profiles (
  id bigserial primary key,
  profile_code text not null unique,
  profile_name text not null,
  module text not null,
  transaction_type text not null,
  debit_account_code text not null,
  debit_account_name text not null default '',
  credit_account_code text not null,
  credit_account_name text not null default '',
  description text not null default '',
  is_default boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.posting_profiles enable row level security;

drop policy if exists "Authenticated users can read posting profiles" on public.posting_profiles;
create policy "Authenticated users can read posting profiles"
on public.posting_profiles for select to authenticated using (true);

drop policy if exists "Authenticated users can manage posting profiles" on public.posting_profiles;
create policy "Authenticated users can manage posting profiles"
on public.posting_profiles for all to authenticated using (true) with check (true);

insert into public.posting_profiles
(profile_code, profile_name, module, transaction_type, debit_account_code, debit_account_name, credit_account_code, credit_account_name, description, is_default, is_active)
values
('AR-INVOICE', 'Customer Invoice', 'Accounts Receivable', 'Customer Invoice', '1000', 'Accounts Receivable', '4010', 'Repair & Maintenance Revenue', 'Debit Accounts Receivable and credit Repair & Maintenance Revenue.', true, true),
('AR-PAYMENT', 'Customer Payment / Receipt', 'Accounts Receivable', 'Customer Payment', '1010', 'Bank', '1000', 'Accounts Receivable', 'Debit Bank and credit Accounts Receivable.', true, true),
('AP-BILL', 'Vendor Bill / Purchase Invoice', 'Accounts Payable', 'Vendor Invoice', '5000', 'COGS', '2000', 'Accounts Payable', 'Debit expense/COGS and credit Accounts Payable.', true, true),
('AP-PAYMENT', 'Vendor Payment', 'Accounts Payable', 'Vendor Payment', '2000', 'Accounts Payable', '1010', 'Bank', 'Debit Accounts Payable and credit Bank.', true, true),
('EXP-CASH', 'Cash Expense', 'Expenses', 'Expense', '5000', 'COGS', '1020', 'Cash on Hand', 'Debit expense/COGS and credit Cash on Hand.', true, true),
('TAX-PAYABLE', 'Sales Tax Payable', 'Tax', 'Sales Tax', '1000', 'Accounts Receivable', '2100', 'Tax Payable', 'Customer tax receivable to Sales Tax Payable.', true, true)
on conflict (profile_code) do update set
profile_name = excluded.profile_name,
module = excluded.module,
transaction_type = excluded.transaction_type,
debit_account_code = excluded.debit_account_code,
debit_account_name = excluded.debit_account_name,
credit_account_code = excluded.credit_account_code,
credit_account_name = excluded.credit_account_name,
description = excluded.description,
is_default = excluded.is_default,
is_active = excluded.is_active;
