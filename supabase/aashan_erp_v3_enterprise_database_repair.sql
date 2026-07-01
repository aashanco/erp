-- Aashan ERP v3.0 Enterprise database repair
-- Purpose: stabilize security, bank balances, document photos, and reporting views without deleting business data.

BEGIN;

-- 1) Photo/document attachments used by Quotes, Invoices and Work Orders
CREATE TABLE IF NOT EXISTS public.document_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_type text NOT NULL,
  document_no text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  size_bytes bigint DEFAULT 0,
  data_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_doc
  ON public.document_attachments (lower(document_type), document_no);

-- 2) Keep app usable while you are still in single-company/private ERP mode.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'banks','customers','vendors','quotes','invoices','receipts','payments',
    'customer_receipt_applications','purchase_invoices','vendor_payments','expenses',
    'jobs','work_orders','journal_entries','gl_accounts','gl_transaction_headers',
    'gl_transaction_lines','gl_ledger_entries','company_settings','email_settings',
    'email_templates','print_templates','number_sequences','user_profiles','document_attachments'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS aashan_v3_all ON public.%I', t);
      EXECUTE format('CREATE POLICY aashan_v3_all ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role', t);
    END IF;
  END LOOP;
END $$;

-- 3) Bank balance detail from actual cash movement only.
DROP VIEW IF EXISTS public.v_bank_balance_detail CASCADE;
CREATE VIEW public.v_bank_balance_detail AS
WITH expense_rows AS (
  SELECT
    e.id,
    COALESCE(e.expense_date, DATE '1900-01-01') AS txn_date,
    lower(trim(COALESCE(e.vendor,''))) AS vendor_key,
    lower(trim(COALESCE(e.payment_method,''))) AS bank_key,
    COALESCE(e.amount,0)::numeric AS amount
  FROM public.expenses e
  WHERE lower(trim(COALESCE(e.status,'Paid'))) NOT IN ('draft','submitted','void','cancelled','canceled','deleted')
), vendor_payment_rows AS (
  SELECT
    vp.id,
    COALESCE(vp.payment_date, DATE '1900-01-01') AS txn_date,
    lower(trim(COALESCE(vp.vendor,''))) AS vendor_key,
    lower(trim(COALESCE(vp.paid_from,''))) AS bank_key,
    COALESCE(vp.amount,0)::numeric AS amount
  FROM public.vendor_payments vp
), vendor_payments_not_in_expenses AS (
  SELECT vp.*
  FROM vendor_payment_rows vp
  WHERE NOT EXISTS (
    SELECT 1 FROM expense_rows e
    WHERE e.txn_date = vp.txn_date
      AND e.vendor_key = vp.vendor_key
      AND e.bank_key = vp.bank_key
      AND abs(e.amount - vp.amount) < 0.01
  )
)
SELECT
  b.id,
  b.bank_name,
  b.account_name,
  COALESCE(b.opening_balance,0)::numeric AS opening_balance,
  COALESCE((SELECT SUM(COALESCE(r.amount,0)) FROM public.receipts r
            WHERE lower(trim(COALESCE(r.bank_name,''))) IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))
              AND lower(trim(COALESCE(r.status,'Posted'))) NOT IN ('void','cancelled','canceled','deleted')),0)::numeric AS customer_receipts,
  COALESCE((SELECT SUM(COALESCE(p.amount,0)) FROM public.payments p
            WHERE lower(trim(COALESCE(p.bank_name,''))) IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))
              AND lower(trim(COALESCE(p.status,'Posted'))) NOT IN ('void','cancelled','canceled','deleted')),0)::numeric AS legacy_customer_payments,
  COALESCE((SELECT SUM(e.amount) FROM expense_rows e
            WHERE e.bank_key IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))),0)::numeric AS expenses_vendor_payments,
  COALESCE((SELECT SUM(vp.amount) FROM vendor_payments_not_in_expenses vp
            WHERE vp.bank_key IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))),0)::numeric AS legacy_vendor_payments_not_in_expenses,
  (
    COALESCE(b.opening_balance,0)
    + COALESCE((SELECT SUM(COALESCE(r.amount,0)) FROM public.receipts r
            WHERE lower(trim(COALESCE(r.bank_name,''))) IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))
              AND lower(trim(COALESCE(r.status,'Posted'))) NOT IN ('void','cancelled','canceled','deleted')),0)
    + COALESCE((SELECT SUM(COALESCE(p.amount,0)) FROM public.payments p
            WHERE lower(trim(COALESCE(p.bank_name,''))) IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))
              AND lower(trim(COALESCE(p.status,'Posted'))) NOT IN ('void','cancelled','canceled','deleted')),0)
    - COALESCE((SELECT SUM(e.amount) FROM expense_rows e
            WHERE e.bank_key IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))),0)
    - COALESCE((SELECT SUM(vp.amount) FROM vendor_payments_not_in_expenses vp
            WHERE vp.bank_key IN (lower(trim(COALESCE(b.bank_name,''))), lower(trim(COALESCE(b.account_name,''))))),0)
  )::numeric AS calculated_balance,
  COALESCE(b.current_balance,0)::numeric AS stored_current_balance
FROM public.banks b;

-- 4) Update stored current balance to match calculated movement; dashboard also calculates live in app.
UPDATE public.banks b
SET current_balance = d.calculated_balance
FROM public.v_bank_balance_detail d
WHERE d.id = b.id;

-- 5) Simple reliable reporting views from transaction source tables.
DROP VIEW IF EXISTS public.v_profit_loss CASCADE;
CREATE VIEW public.v_profit_loss AS
SELECT 'Income'::text AS section, 'Repair & Maintenance Revenue'::text AS account_name,
       COALESCE(SUM(COALESCE(i.total_amount, i.amount, 0) - COALESCE(i.tax_amount,0)),0)::numeric AS amount
FROM public.invoices i
WHERE lower(trim(COALESCE(i.status,'Open'))) NOT IN ('cancelled','canceled','deleted')
UNION ALL
SELECT 'Expense', COALESCE(NULLIF(trim(e.category),''),'Other'), COALESCE(SUM(COALESCE(e.amount,0)),0)::numeric
FROM public.expenses e
WHERE lower(trim(COALESCE(e.status,'Paid'))) NOT IN ('draft','submitted','void','cancelled','canceled','deleted')
GROUP BY COALESCE(NULLIF(trim(e.category),''),'Other');

DROP VIEW IF EXISTS public.v_balance_sheet CASCADE;
CREATE VIEW public.v_balance_sheet AS
WITH ar AS (
  SELECT COALESCE(SUM(COALESCE(i.total_amount, i.amount,0)),0) -
         COALESCE((SELECT SUM(COALESCE(r.amount,0)) FROM public.receipts r),0) -
         COALESCE((SELECT SUM(COALESCE(p.amount,0)) FROM public.payments p),0) AS amount
  FROM public.invoices i
  WHERE lower(trim(COALESCE(i.status,'Open'))) NOT IN ('cancelled','canceled','deleted')
), cash AS (
  SELECT COALESCE(SUM(calculated_balance),0) AS amount FROM public.v_bank_balance_detail
), tax AS (
  SELECT COALESCE(SUM(COALESCE(i.tax_amount,0)),0) AS amount
  FROM public.invoices i
  WHERE lower(trim(COALESCE(i.status,'Open'))) NOT IN ('cancelled','canceled','deleted')
), ap AS (
  SELECT GREATEST(0, COALESCE((SELECT SUM(COALESCE(pi.amount,0)) FROM public.purchase_invoices pi),0)
           - COALESCE((SELECT SUM(COALESCE(e.amount,0)) FROM public.expenses e WHERE lower(trim(COALESCE(e.status,'Paid'))) NOT IN ('draft','submitted','void','cancelled','canceled','deleted')),0)
           - COALESCE((SELECT SUM(COALESCE(vp.amount,0)) FROM public.vendor_payments vp),0)) AS amount
), pl AS (
  SELECT COALESCE(SUM(CASE WHEN section='Income' THEN amount ELSE -amount END),0) AS amount FROM public.v_profit_loss
), eq AS (
  SELECT (SELECT amount FROM ar) + (SELECT amount FROM cash) - (SELECT amount FROM tax) - (SELECT amount FROM ap) - (SELECT amount FROM pl) AS owner_capital
)
SELECT 'Asset'::text AS section, 'Accounts Receivable'::text AS account_name, amount FROM ar
UNION ALL SELECT 'Asset','Cash & Bank',amount FROM cash
UNION ALL SELECT 'Liability','Tax Payable',amount FROM tax
UNION ALL SELECT 'Liability','Accounts Payable',amount FROM ap
UNION ALL SELECT 'Equity','Owner''s Capital / Opening Balance',owner_capital FROM eq
UNION ALL SELECT 'Equity','Current Year Profit',amount FROM pl;

DROP VIEW IF EXISTS public.v_trial_balance CASCADE;
CREATE VIEW public.v_trial_balance AS
SELECT account_name,
       CASE WHEN section IN ('Asset','Expense') THEN GREATEST(amount,0) ELSE GREATEST(-amount,0) END AS debit,
       CASE WHEN section IN ('Liability','Equity','Income') THEN GREATEST(amount,0) ELSE GREATEST(-amount,0) END AS credit
FROM (
  SELECT section, account_name, amount FROM public.v_balance_sheet
  UNION ALL
  SELECT section, account_name, amount FROM public.v_profit_loss
) x
WHERE abs(amount) > 0.004;

GRANT SELECT ON public.v_bank_balance_detail, public.v_profit_loss, public.v_balance_sheet, public.v_trial_balance TO anon, authenticated, service_role;

COMMIT;
