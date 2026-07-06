-- Aashan ERP v5.4.0 - Customer/Vendor Multiple Contact Values
-- Keeps existing phone/email columns but ensures they are text fields suitable for multiple values.
-- UI stores one phone/email per line; comma and semicolon input is normalized on save.

alter table public.customers
  alter column phone type text,
  alter column email type text;

alter table public.vendors
  alter column phone type text,
  alter column email type text;
