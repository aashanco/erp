-- Aashan ERP Phase 25 - CRM
-- Lead tracking, activities, opportunities, and customer portal foundation.

create table if not exists public.crm_leads (
  id bigserial primary key,
  lead_no text not null unique,
  lead_name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  service_interest text not null default '',
  source text not null default 'Referral',
  stage text not null default 'New',
  estimated_value numeric(18,2) not null default 0,
  next_follow_up date null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.crm_leads enable row level security;

drop policy if exists "Authenticated users can read crm leads" on public.crm_leads;
create policy "Authenticated users can read crm leads"
on public.crm_leads for select to authenticated using (true);

drop policy if exists "Authenticated users can manage crm leads" on public.crm_leads;
create policy "Authenticated users can manage crm leads"
on public.crm_leads for all to authenticated using (true) with check (true);

create table if not exists public.crm_activities (
  id bigserial primary key,
  customer_id bigint null,
  lead_id bigint null references public.crm_leads(id) on delete set null,
  activity_date date not null default current_date,
  activity_type text not null default 'Call',
  subject text not null,
  notes text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists crm_activities_date_idx on public.crm_activities(activity_date);
create index if not exists crm_activities_lead_idx on public.crm_activities(lead_id);
create index if not exists crm_activities_customer_idx on public.crm_activities(customer_id);

alter table public.crm_activities enable row level security;

drop policy if exists "Authenticated users can read crm activities" on public.crm_activities;
create policy "Authenticated users can read crm activities"
on public.crm_activities for select to authenticated using (true);

drop policy if exists "Authenticated users can manage crm activities" on public.crm_activities;
create policy "Authenticated users can manage crm activities"
on public.crm_activities for all to authenticated using (true) with check (true);

create table if not exists public.crm_opportunities (
  id bigserial primary key,
  opportunity_no text not null unique,
  customer_id bigint null,
  lead_id bigint null references public.crm_leads(id) on delete set null,
  name text not null,
  stage text not null default 'Open',
  estimated_value numeric(18,2) not null default 0,
  probability numeric(5,2) not null default 50,
  expected_close_date date null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists crm_opportunities_stage_idx on public.crm_opportunities(stage);
create index if not exists crm_opportunities_customer_idx on public.crm_opportunities(customer_id);
create index if not exists crm_opportunities_lead_idx on public.crm_opportunities(lead_id);

alter table public.crm_opportunities enable row level security;

drop policy if exists "Authenticated users can read crm opportunities" on public.crm_opportunities;
create policy "Authenticated users can read crm opportunities"
on public.crm_opportunities for select to authenticated using (true);

drop policy if exists "Authenticated users can manage crm opportunities" on public.crm_opportunities;
create policy "Authenticated users can manage crm opportunities"
on public.crm_opportunities for all to authenticated using (true) with check (true);

create table if not exists public.crm_portal_requests (
  id bigserial primary key,
  customer_id bigint null,
  customer_name text not null default '',
  phone text not null default '',
  email text not null default '',
  service_requested text not null default '',
  request_status text not null default 'New',
  preferred_date date null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.crm_portal_requests enable row level security;

drop policy if exists "Authenticated users can read portal requests" on public.crm_portal_requests;
create policy "Authenticated users can read portal requests"
on public.crm_portal_requests for select to authenticated using (true);

drop policy if exists "Authenticated users can manage portal requests" on public.crm_portal_requests;
create policy "Authenticated users can manage portal requests"
on public.crm_portal_requests for all to authenticated using (true) with check (true);
