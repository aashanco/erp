
create table if not exists public.gl_accounts (
  id bigserial primary key,
  account_code text unique not null,
  account_name text not null,
  account_type text not null,
  normal_balance text not null default 'Debit',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gl_journals (
  id bigserial primary key,
  journal_no text unique not null,
  journal_date date not null default current_date,
  source_type text not null default 'Manual',
  source_no text,
  description text,
  total_debit numeric(14,2) not null default 0,
  total_credit numeric(14,2) not null default 0,
  status text not null default 'Posted',
  created_at timestamptz not null default now()
);

create table if not exists public.gl_journal_lines (
  id bigserial primary key,
  journal_id bigint not null references public.gl_journals(id) on delete cascade,
  account_code text not null,
  account_name text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.gl_accounts enable row level security;
alter table public.gl_journals enable row level security;
alter table public.gl_journal_lines enable row level security;

drop policy if exists "Authenticated manage gl_accounts" on public.gl_accounts;
create policy "Authenticated manage gl_accounts" on public.gl_accounts for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage gl_journals" on public.gl_journals;
create policy "Authenticated manage gl_journals" on public.gl_journals for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage gl_journal_lines" on public.gl_journal_lines;
create policy "Authenticated manage gl_journal_lines" on public.gl_journal_lines for all to authenticated using (true) with check (true);

insert into public.gl_accounts (account_code, account_name, account_type, normal_balance) values
('1000','Cash on Hand','Asset','Debit'),
('1010','Bank Account','Asset','Debit'),
('1100','Accounts Receivable','Asset','Debit'),
('2000','Accounts Payable','Liability','Credit'),
('3000','Owner Equity','Equity','Credit'),
('4000','Service Revenue','Revenue','Credit'),
('4100','Installation Revenue','Revenue','Credit'),
('5000','Materials Expense','Expense','Debit'),
('5100','Labor Expense','Expense','Debit'),
('5200','Fuel & Transportation Expense','Expense','Debit')
on conflict (account_code) do nothing;

create or replace view public.v_trial_balance as
select a.account_code, a.account_name, a.account_type, a.normal_balance,
coalesce(sum(l.debit),0) as debit,
coalesce(sum(l.credit),0) as credit,
coalesce(sum(l.debit-l.credit),0) as net_balance
from public.gl_accounts a
left join public.gl_journal_lines l on l.account_code = a.account_code
group by a.account_code, a.account_name, a.account_type, a.normal_balance
order by a.account_code;

create or replace view public.v_profit_loss as
select a.account_type, a.account_code, a.account_name,
case when a.account_type='Revenue' then coalesce(sum(l.credit-l.debit),0)
else coalesce(sum(l.debit-l.credit),0) end as amount
from public.gl_accounts a
left join public.gl_journal_lines l on l.account_code = a.account_code
where a.account_type in ('Revenue','Expense')
group by a.account_type, a.account_code, a.account_name
order by a.account_type desc, a.account_code;

create or replace view public.v_balance_sheet as
select a.account_type, a.account_code, a.account_name,
case when a.account_type='Asset' then coalesce(sum(l.debit-l.credit),0)
else coalesce(sum(l.credit-l.debit),0) end as amount
from public.gl_accounts a
left join public.gl_journal_lines l on l.account_code = a.account_code
where a.account_type in ('Asset','Liability','Equity')
group by a.account_type, a.account_code, a.account_name
order by a.account_type, a.account_code;
