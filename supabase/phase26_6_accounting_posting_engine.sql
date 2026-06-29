-- Aashan ERP Phase 26.6 - Accounting Posting Engine

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

-- Optional backfill for existing invoices. Safe to rerun.
delete from public.gl_transaction_headers where source_type in ('Invoice','Receipt','Customer Payment');

insert into public.gl_transaction_headers
(transaction_no, transaction_date, source_type, source_id, source_no, description, status, total_debit, total_credit)
select
  'GL-INVOICE-' || invoice_no,
  coalesce(invoice_date, current_date),
  'Invoice',
  id,
  invoice_no,
  'Invoice ' || invoice_no || ' - ' || customer,
  'Posted',
  coalesce(total_amount, amount, 0),
  coalesce(total_amount, amount, 0)
from public.invoices;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 1, '1000', 'Accounts Receivable', coalesce(i.total_amount, i.amount, 0), 0, 'Invoice ' || i.invoice_no
from public.gl_transaction_headers h
join public.invoices i on h.source_type = 'Invoice' and h.source_no = i.invoice_no;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 2, '4010', 'Repair & Maintenance Revenue', 0, greatest(coalesce(i.subtotal, i.amount, 0) - coalesce(i.discount, 0), 0), 'Revenue ' || i.invoice_no
from public.gl_transaction_headers h
join public.invoices i on h.source_type = 'Invoice' and h.source_no = i.invoice_no;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 3, '2100', 'Tax Payable', 0, coalesce(i.tax_amount, 0), 'Sales tax ' || i.invoice_no
from public.gl_transaction_headers h
join public.invoices i on h.source_type = 'Invoice' and h.source_no = i.invoice_no
where coalesce(i.tax_amount, 0) > 0;

insert into public.gl_transaction_headers
(transaction_no, transaction_date, source_type, source_id, source_no, description, status, total_debit, total_credit)
select
  'GL-RECEIPT-' || receipt_no,
  coalesce(receipt_date, current_date),
  'Receipt',
  id,
  receipt_no,
  'Receipt ' || receipt_no || ' - ' || customer,
  'Posted',
  coalesce(amount, 0),
  coalesce(amount, 0)
from public.receipts;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 1, '1010', coalesce(nullif(r.bank_name,''), 'Bank'), coalesce(r.amount, 0), 0, 'Receipt ' || r.receipt_no
from public.gl_transaction_headers h
join public.receipts r on h.source_type = 'Receipt' and h.source_no = r.receipt_no;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 2, '1000', 'Accounts Receivable', 0, coalesce(r.amount, 0), 'Receipt applied to invoice ' || r.invoice_no
from public.gl_transaction_headers h
join public.receipts r on h.source_type = 'Receipt' and h.source_no = r.receipt_no;

insert into public.gl_transaction_headers
(transaction_no, transaction_date, source_type, source_id, source_no, description, status, total_debit, total_credit)
select
  'GL-CUSTOMERPAYMENT-' || invoice_no,
  coalesce(payment_date, current_date),
  'Customer Payment',
  id,
  invoice_no,
  'Customer payment ' || invoice_no || ' - ' || customer,
  'Posted',
  coalesce(amount, 0),
  coalesce(amount, 0)
from public.payments;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 1, '1010', coalesce(nullif(p.bank_name,''), 'Bank'), coalesce(p.amount, 0), 0, 'Payment received ' || p.invoice_no
from public.gl_transaction_headers h
join public.payments p on h.source_type = 'Customer Payment' and h.source_no = p.invoice_no;

insert into public.gl_transaction_lines
(header_id, line_no, account_code, account_name, debit, credit, description)
select h.id, 2, '1000', 'Accounts Receivable', 0, coalesce(p.amount, 0), 'Payment applied to invoice ' || p.invoice_no
from public.gl_transaction_headers h
join public.payments p on h.source_type = 'Customer Payment' and h.source_no = p.invoice_no;
