-- Aashan ERP Phase 26.5 - Email View Button Public Read

alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.receipts enable row level security;
alter table public.customers enable row level security;
alter table public.company_settings enable row level security;

drop policy if exists "Public can view quotes from email link" on public.quotes;
create policy "Public can view quotes from email link" on public.quotes for select to anon using (true);

drop policy if exists "Public can view invoices from email link" on public.invoices;
create policy "Public can view invoices from email link" on public.invoices for select to anon using (true);

drop policy if exists "Public can view receipts from email link" on public.receipts;
create policy "Public can view receipts from email link" on public.receipts for select to anon using (true);

drop policy if exists "Public can view customer contact for document link" on public.customers;
create policy "Public can view customer contact for document link" on public.customers for select to anon using (true);

drop policy if exists "Public can view company settings for document link" on public.company_settings;
create policy "Public can view company settings for document link" on public.company_settings for select to anon using (true);
