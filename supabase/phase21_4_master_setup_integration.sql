-- Aashan ERP Phase 21.4 - Master Setup Integration
-- Purpose:
-- 1. Make Accounting Ledger Accounts and Master COA use the same table: gl_accounts.
-- 2. Ensure master email and print templates exist and can drive ERP output.

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

-- Copy existing Master COA records into gl_accounts if the old table exists.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'chart_of_accounts'
  ) then
    insert into public.gl_accounts (
      account_code,
      account_name,
      account_type,
      normal_balance,
      is_active
    )
    select
      account_code,
      account_name,
      coalesce(account_type, 'Expense'),
      coalesce(normal_balance, 'Both'),
      coalesce(is_active, true)
    from public.chart_of_accounts
    where account_code is not null
      and account_name is not null
    on conflict (account_code) do update set
      account_name = excluded.account_name,
      account_type = excluded.account_type,
      normal_balance = excluded.normal_balance,
      is_active = excluded.is_active;
  end if;
end $$;

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

create table if not exists public.email_templates (
  id bigserial primary key,
  template_name text not null,
  subject text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists email_templates_template_name_uq
on public.email_templates(template_name);

alter table public.email_templates enable row level security;

drop policy if exists "Authenticated users can read email templates" on public.email_templates;
create policy "Authenticated users can read email templates"
on public.email_templates
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage email templates" on public.email_templates;
create policy "Authenticated users can manage email templates"
on public.email_templates
for all
to authenticated
using (true)
with check (true);

insert into public.email_templates (template_name, subject, body)
values
('Invoice Email', 'Invoice {{invoice_no}} from Aashan & Co LLC',
'Hi {{customer}},

Please find your invoice {{invoice_no}} for ${{amount}}.

Due Date: {{due_date}}
Balance Due: ${{balance}}

Thank you for choosing Aashan & Co LLC.

Best Regards,
Aashan & Co LLC'),
('Quote Email', 'Quote {{quote_no}} from Aashan & Co LLC',
'Hi {{customer}},

Please find your quote {{quote_no}} for ${{amount}}.

Please review and let us know if you would like to proceed.

Best Regards,
Aashan & Co LLC'),
('Payment Receipt Email', 'Receipt {{receipt_no}} from Aashan & Co LLC',
'Hi {{customer}},

Thank you for your payment of ${{amount}}.

Receipt No: {{receipt_no}}
Invoice No: {{invoice_no}}

We appreciate your business.

Best Regards,
Aashan & Co LLC'),
('Overdue Reminder Email', 'Payment Reminder for Invoice {{invoice_no}}',
'Hi {{customer}},

This is a friendly reminder that invoice {{invoice_no}} has a balance due of ${{balance}}.

Please contact us if you have any questions.

Best Regards,
Aashan & Co LLC')
on conflict (template_name) do nothing;

create table if not exists public.print_templates (
  id bigserial primary key,
  document_type text not null,
  header_title text not null default 'Aashan & Co LLC',
  header_subtitle text not null default 'Field Service & Accounting',
  logo_url text not null default '/aashan-logo.png',
  logo_data_url text not null default '',
  company_block text not null default 'Phone: (832) 210-4248
Email: support@aashan.co
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
