-- Aashan ERP v5.5.0 - Bank/Cash Payment Engine
-- Adds a real Paid From Account field to expenses / vendor payments.
-- Run once in Supabase SQL editor before deploying v5.5.0.

alter table public.expenses
add column if not exists bank_name text default 'Cash on hand',
add column if not exists reference_no text default '';

-- Backfill existing rows. Older builds stored the selected account inside payment_method.
-- This preserves existing data while separating account from method going forward.
update public.expenses
set bank_name = coalesce(nullif(bank_name, ''), nullif(payment_method, ''), 'Cash on hand')
where bank_name is null or trim(bank_name) = '';

-- Clean up obviously-method-only bank names so new rows default correctly.
update public.expenses
set bank_name = 'Cash on hand'
where lower(trim(bank_name)) in ('cash', 'check', 'zelle', 'ach', 'debit card', 'credit card', 'bank transfer', 'other');

-- Optional helpful index for bank register filtering.
create index if not exists idx_expenses_bank_name on public.expenses(bank_name);
