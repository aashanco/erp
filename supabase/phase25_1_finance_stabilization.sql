-- Aashan ERP Phase 25.1 - Finance Stabilization

-- 1. Customer number support
alter table public.customers
add column if not exists customer_no text;

create unique index if not exists customers_customer_no_uq
on public.customers(customer_no)
where customer_no is not null and customer_no <> '';

-- Update existing customer numbers.
with numbered as (
  select id, row_number() over (order by id) as rn
  from public.customers
  where customer_no is null or customer_no = ''
)
update public.customers c
set customer_no = 'CUST-' || lpad(numbered.rn::text, 6, '0')
from numbered
where c.id = numbered.id;

-- 2. Invoice stabilization columns
alter table public.invoices
add column if not exists quote_id bigint null,
add column if not exists notes text default '',
add column if not exists customer_phone text default '',
add column if not exists customer_email text default '',
add column if not exists customer_address text default '',
add column if not exists qty numeric(18,2) default 1,
add column if not exists unit_price numeric(18,2) default 0,
add column if not exists discount numeric(18,2) default 0,
add column if not exists tax_rate numeric(18,2) default 0,
add column if not exists tax_amount numeric(18,2) default 0,
add column if not exists subtotal numeric(18,2) default 0,
add column if not exists total_amount numeric(18,2) default 0;

-- 3. Quote stabilization columns
alter table public.quotes
add column if not exists qty numeric(18,2) default 1,
add column if not exists unit_price numeric(18,2) default 0,
add column if not exists discount numeric(18,2) default 0,
add column if not exists tax_rate numeric(18,2) default 0,
add column if not exists tax_amount numeric(18,2) default 0,
add column if not exists subtotal numeric(18,2) default 0,
add column if not exists total_amount numeric(18,2) default 0;

-- 4. Payment bank support
alter table public.payments
add column if not exists bank_name text default '';

-- 5. Number sequence setup for customers
create table if not exists public.number_sequences (
  id bigserial primary key,
  document_type text not null unique,
  prefix text not null default '',
  next_number text not null default '1001',
  padding text not null default '4',
  created_at timestamptz not null default now()
);

alter table public.number_sequences enable row level security;

drop policy if exists "Authenticated users can read number sequences" on public.number_sequences;
create policy "Authenticated users can read number sequences"
on public.number_sequences for select to authenticated using (true);

drop policy if exists "Authenticated users can manage number sequences" on public.number_sequences;
create policy "Authenticated users can manage number sequences"
on public.number_sequences for all to authenticated using (true) with check (true);

insert into public.number_sequences (document_type, prefix, next_number, padding)
values ('Customer', 'CUST-', (select (count(*) + 1)::text from public.customers), '6')
on conflict (document_type) do update set
  prefix = excluded.prefix,
  next_number = excluded.next_number,
  padding = excluded.padding;
