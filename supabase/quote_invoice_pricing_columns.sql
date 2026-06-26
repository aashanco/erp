-- Aashan ERP - Quote & Invoice Pricing Columns
-- Already run by user, included for backup/rebuild.

alter table public.quotes
add column if not exists qty numeric(18,2) default 1,
add column if not exists unit_price numeric(18,2) default 0,
add column if not exists discount numeric(18,2) default 0,
add column if not exists tax_rate numeric(18,2) default 0,
add column if not exists tax_amount numeric(18,2) default 0,
add column if not exists subtotal numeric(18,2) default 0,
add column if not exists total_amount numeric(18,2) default 0;

alter table public.invoices
add column if not exists qty numeric(18,2) default 1,
add column if not exists unit_price numeric(18,2) default 0,
add column if not exists discount numeric(18,2) default 0,
add column if not exists tax_rate numeric(18,2) default 0,
add column if not exists tax_amount numeric(18,2) default 0,
add column if not exists subtotal numeric(18,2) default 0,
add column if not exists total_amount numeric(18,2) default 0;
