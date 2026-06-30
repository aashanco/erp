-- Aashan ERP v2.0 Stable database repair
-- Safe to run multiple times. Adds document photo storage and restores permissive RLS for ERP tables.

CREATE TABLE IF NOT EXISTS public.document_attachments (
  id BIGSERIAL PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_no TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes BIGINT DEFAULT 0,
  data_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_doc
ON public.document_attachments (document_type, document_no);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','vendors','quotes','invoices','receipts','payments','expenses','banks',
    'purchase_invoices','vendor_payments','customer_receipt_applications',
    'jobs','work_orders','journal_entries','gl_accounts','gl_transaction_headers',
    'gl_transaction_lines','gl_ledger_entries','email_templates','email_settings',
    'company_settings','number_sequences','posting_profiles','print_templates',
    'document_attachments','user_profiles'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS allow_%s_all ON public.%I', t, t);
      EXECUTE format('CREATE POLICY allow_%s_all ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
    END IF;
  END LOOP;
END $$;

-- Recalculate invoice status from receipts by invoice_no.
UPDATE public.invoices i
SET status = CASE
  WHEN COALESCE(paid.total_paid,0) <= 0 THEN
    CASE WHEN i.due_date IS NOT NULL AND i.due_date::date < CURRENT_DATE THEN 'Overdue' ELSE 'Coming due' END
  WHEN COALESCE(paid.total_paid,0) + 0.005 < COALESCE(NULLIF(i.total_amount::text,'')::numeric, NULLIF(i.amount::text,'')::numeric, 0) THEN 'Partially Paid'
  WHEN COALESCE(paid.total_paid,0) - COALESCE(NULLIF(i.total_amount::text,'')::numeric, NULLIF(i.amount::text,'')::numeric, 0) > 0.005 THEN 'Overpaid'
  ELSE 'Paid in full'
END
FROM (
  SELECT invoice_no, SUM(COALESCE(NULLIF(amount::text,'')::numeric,0)) total_paid
  FROM public.receipts
  WHERE COALESCE(invoice_no,'') <> ''
  GROUP BY invoice_no
) paid
WHERE paid.invoice_no = i.invoice_no;
