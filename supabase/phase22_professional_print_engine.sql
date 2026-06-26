-- Aashan ERP Phase 22 - Professional Print Engine
create table if not exists public.print_templates (
  id bigserial primary key,
  document_type text not null,
  header_title text not null default 'Aashan & Co LLC',
  header_subtitle text not null default 'Field Service & Accounting',
  logo_url text not null default '/aashan-logo.png',
  logo_data_url text not null default '',
  company_block text not null default 'Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co
Address: Dallas, Texas',
  footer_text text not null default 'Thank you for choosing Aashan & Co LLC.',
  terms_text text not null default 'Payment due within agreed terms.',
  notes_text text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists print_templates_document_type_uq
on public.print_templates(document_type);

alter table public.print_templates enable row level security;

drop policy if exists "Authenticated users can read print templates" on public.print_templates;
create policy "Authenticated users can read print templates"
on public.print_templates
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage print templates" on public.print_templates;
create policy "Authenticated users can manage print templates"
on public.print_templates
for all
to authenticated
using (true)
with check (true);

insert into public.print_templates (
  document_type, header_title, header_subtitle, logo_url, company_block, footer_text, terms_text, notes_text
)
values
('Invoice', 'Aashan & Co LLC', 'Field Service & Accounting', '/aashan-logo.png',
'Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co
Address: Dallas, Texas',
'Thank you for choosing Aashan & Co LLC.', 'Payment due within agreed terms.', ''),
('Quote', 'Aashan & Co LLC', 'Field Service & Accounting', '/aashan-logo.png',
'Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co
Address: Dallas, Texas',
'Thank you for the opportunity.', 'Quote valid as per agreed terms.', ''),
('Receipt', 'Aashan & Co LLC', 'Field Service & Accounting', '/aashan-logo.png',
'Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co
Address: Dallas, Texas',
'Thank you for your payment.', 'Please retain this receipt for your records.', '')
on conflict (document_type) do nothing;
