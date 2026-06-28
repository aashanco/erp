-- Aashan ERP Phase 26.1 - Transaction Control & Accounting Engine

-- Document control fields
alter table public.quotes
add column if not exists converted_invoice_no text default '',
add column if not exists converted_at timestamptz null;

alter table public.invoices
add column if not exists posted_at timestamptz null,
add column if not exists posted_by text default '',
add column if not exists quote_id bigint null,
add column if not exists notes text default '';

alter table public.receipts
add column if not exists status text default 'Posted',
add column if not exists posted_at timestamptz default now();

alter table public.payments
add column if not exists status text default 'Posted',
add column if not exists bank_name text default '',
add column if not exists posted_at timestamptz default now();

-- General Ledger transaction/audit tables
create table if not exists public.gl_transaction_headers (
  id bigserial primary key,
  transaction_no text not null unique,
  transaction_date date not null default current_date,
  source_type text not null,
  source_id bigint null,
  source_no text not null default '',
  description text not null default '',
  status text not null default 'Posted',
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gl_transaction_lines (
  id bigserial primary key,
  header_id bigint not null references public.gl_transaction_headers(id) on delete cascade,
  line_no integer not null,
  account_code text not null,
  account_name text not null default '',
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.gl_transaction_headers enable row level security;
alter table public.gl_transaction_lines enable row level security;

drop policy if exists "Authenticated users can read gl transaction headers" on public.gl_transaction_headers;
create policy "Authenticated users can read gl transaction headers"
on public.gl_transaction_headers for select to authenticated using (true);

drop policy if exists "Authenticated users can manage gl transaction headers" on public.gl_transaction_headers;
create policy "Authenticated users can manage gl transaction headers"
on public.gl_transaction_headers for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read gl transaction lines" on public.gl_transaction_lines;
create policy "Authenticated users can read gl transaction lines"
on public.gl_transaction_lines for select to authenticated using (true);

drop policy if exists "Authenticated users can manage gl transaction lines" on public.gl_transaction_lines;
create policy "Authenticated users can manage gl transaction lines"
on public.gl_transaction_lines for all to authenticated using (true) with check (true);

-- Fix existing invoice status from payments + receipts
with paid as (
  select invoice_no, sum(amount) amount
  from (
    select invoice_no, amount from public.payments
    union all
    select invoice_no, amount from public.receipts
  ) x
  group by invoice_no
)
update public.invoices i
set status =
  case
    when coalesce(paid.amount,0) <= 0 then i.status
    when coalesce(paid.amount,0) >= coalesce(i.total_amount, i.amount, 0) then 'Paid'
    else 'Partially Paid'
  end
from paid
where paid.invoice_no = i.invoice_no;
