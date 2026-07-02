-- Aashan ERP v3.3 Scheduling + Technician App
-- Safe additive migration. Does not change accounting, invoices, receipts, reports, or dashboard logic.

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.technicians (
  id bigserial PRIMARY KEY,
  technician_name text NOT NULL,
  phone text,
  email text,
  role text DEFAULT 'Technician',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_status_history (
  id bigserial PRIMARY KEY,
  work_order_id bigint,
  work_order_no text,
  old_status text,
  new_status text,
  notes text,
  changed_at timestamptz DEFAULT now(),
  changed_by text
);

CREATE TABLE IF NOT EXISTS public.work_order_schedule (
  id bigserial PRIMARY KEY,
  work_order_id bigint,
  work_order_no text,
  technician text,
  scheduled_date date,
  start_time time,
  end_time time,
  status text DEFAULT 'Scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_schedule_date ON public.work_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON public.work_orders(technician);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['technicians','work_order_status_history','work_order_schedule']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_%s_all ON public.%I', t, t);
    EXECUTE format('CREATE POLICY allow_%s_all ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
