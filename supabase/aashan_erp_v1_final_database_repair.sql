-- Aashan ERP v1.0 Final Database Repair
-- Run this once in Supabase SQL Editor before deploying the final build.
-- It standardizes RLS, invoice/receipt status recalculation, and GL reporting views.

BEGIN;

-- 1) RLS policies for active ERP tables. These policies are intentionally permissive for the current single-company ERP.
-- When multi-company/user isolation is added, replace these with company_id/user based policies.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'banks','chart_of_accounts','company_settings','customer_receipt_applications','customers',
    'email_logs','email_settings','email_templates','expenses','gl_accounts','gl_journal_headers',
    'gl_journal_lines','gl_journals','gl_ledger_entries','gl_transaction_headers','gl_transaction_lines',
    'invoices','jobs','journal_entries','number_sequences','payments','posting_profiles','print_templates',
    'purchase_invoices','quotes','receipts','user_profiles','vendor_payments','vendors','work_orders'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'aashan_erp_allow_all_' || t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)', 'aashan_erp_allow_all_' || t, t);
    END IF;
  END LOOP;
END $$;

-- 2) Invoice payment/status recalculation based on invoice_no.
CREATE OR REPLACE FUNCTION public.aashan_invoice_paid_amount(p_invoice_id bigint, p_invoice_no text)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE v_paid numeric := 0;
BEGIN
  IF to_regclass('public.receipts') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(SUM(amount),0) FROM public.receipts WHERE COALESCE(invoice_no, '''') = COALESCE($1, '''')'
    INTO v_paid USING p_invoice_no;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    v_paid := v_paid + COALESCE((
      SELECT SUM(amount) FROM public.payments
      WHERE COALESCE(invoice_no, '') = COALESCE(p_invoice_no, '')
         OR (p_invoice_id IS NOT NULL AND invoice_id = p_invoice_id)
    ), 0);
  END IF;

  RETURN COALESCE(v_paid, 0);
END $$;

CREATE OR REPLACE FUNCTION public.aashan_recalculate_invoice_status(p_invoice_no text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
  v_total numeric;
  v_paid numeric;
  v_status text;
BEGIN
  IF p_invoice_no IS NULL OR trim(p_invoice_no) = '' THEN
    RETURN;
  END IF;

  FOR r IN SELECT id, invoice_no, amount, total_amount, status FROM public.invoices WHERE invoice_no = p_invoice_no LOOP
    IF COALESCE(r.status,'') IN ('Draft','Cancelled') THEN
      CONTINUE;
    END IF;

    v_total := COALESCE(r.total_amount, r.amount, 0);
    v_paid := public.aashan_invoice_paid_amount(r.id, r.invoice_no);

    IF v_paid <= 0 THEN
      v_status := 'Open';
    ELSIF round((v_total - v_paid)::numeric, 2) < 0 THEN
      v_status := 'Overpaid';
    ELSIF abs(round((v_total - v_paid)::numeric, 2)) <= 0.01 THEN
      v_status := 'Paid';
    ELSE
      v_status := 'Partially Paid';
    END IF;

    UPDATE public.invoices SET status = v_status WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.aashan_receipt_invoice_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.aashan_recalculate_invoice_status(NEW.invoice_no);
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    PERFORM public.aashan_recalculate_invoice_status(OLD.invoice_no);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_aashan_receipts_invoice_status ON public.receipts;
CREATE TRIGGER trg_aashan_receipts_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.aashan_receipt_invoice_status_trigger();

DROP TRIGGER IF EXISTS trg_aashan_payments_invoice_status ON public.payments;
CREATE TRIGGER trg_aashan_payments_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.aashan_receipt_invoice_status_trigger();

-- Recalculate all existing invoices now.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT invoice_no FROM public.invoices LOOP
    PERFORM public.aashan_recalculate_invoice_status(r.invoice_no);
  END LOOP;
END $$;

-- 3) Clean GL reporting views from transaction headers/lines.
CREATE OR REPLACE VIEW public.v_trial_balance AS
SELECT
  l.account_code,
  l.account_name,
  COALESCE(SUM(l.debit), 0) AS debit,
  COALESCE(SUM(l.credit), 0) AS credit,
  COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) AS balance
FROM public.gl_transaction_lines l
JOIN public.gl_transaction_headers h ON h.id = l.header_id
WHERE COALESCE(h.status, 'Posted') = 'Posted'
GROUP BY l.account_code, l.account_name
ORDER BY l.account_code;

CREATE OR REPLACE VIEW public.v_profit_loss AS
SELECT
  l.account_code,
  l.account_name,
  CASE
    WHEN lower(COALESCE(a.account_type,'')) LIKE '%income%' OR lower(COALESCE(a.account_type,'')) LIKE '%revenue%' THEN 'Revenue'
    WHEN lower(COALESCE(a.account_type,'')) LIKE '%expense%' THEN 'Expense'
    WHEN lower(l.account_name) LIKE '%revenue%' OR lower(l.account_name) LIKE '%sales%' THEN 'Revenue'
    ELSE 'Expense'
  END AS section,
  CASE
    WHEN lower(COALESCE(a.account_type,'')) LIKE '%income%' OR lower(COALESCE(a.account_type,'')) LIKE '%revenue%' OR lower(l.account_name) LIKE '%revenue%' OR lower(l.account_name) LIKE '%sales%'
      THEN COALESCE(SUM(l.credit),0) - COALESCE(SUM(l.debit),0)
    ELSE COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0)
  END AS amount
FROM public.gl_transaction_lines l
JOIN public.gl_transaction_headers h ON h.id = l.header_id
LEFT JOIN public.gl_accounts a ON a.account_code = l.account_code
WHERE COALESCE(h.status, 'Posted') = 'Posted'
  AND (
    lower(COALESCE(a.account_type,'')) LIKE '%income%' OR
    lower(COALESCE(a.account_type,'')) LIKE '%revenue%' OR
    lower(COALESCE(a.account_type,'')) LIKE '%expense%' OR
    lower(l.account_name) LIKE '%revenue%' OR
    lower(l.account_name) LIKE '%sales%' OR
    lower(l.account_name) LIKE '%expense%' OR
    lower(l.account_name) LIKE '%materials%' OR
    lower(l.account_name) LIKE '%subcontractor%'
  )
GROUP BY l.account_code, l.account_name, a.account_type
ORDER BY section DESC, l.account_code;

CREATE OR REPLACE VIEW public.v_balance_sheet AS
SELECT
  l.account_code,
  l.account_name,
  CASE
    WHEN lower(COALESCE(a.account_type,'')) LIKE '%asset%' OR lower(l.account_name) LIKE '%bank%' OR lower(l.account_name) LIKE '%cash%' OR lower(l.account_name) LIKE '%receivable%' THEN 'Asset'
    WHEN lower(COALESCE(a.account_type,'')) LIKE '%liability%' OR lower(l.account_name) LIKE '%payable%' OR lower(l.account_name) LIKE '%tax%' THEN 'Liability'
    ELSE 'Equity'
  END AS section,
  CASE
    WHEN lower(COALESCE(a.account_type,'')) LIKE '%asset%' OR lower(l.account_name) LIKE '%bank%' OR lower(l.account_name) LIKE '%cash%' OR lower(l.account_name) LIKE '%receivable%'
      THEN COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0)
    ELSE COALESCE(SUM(l.credit),0) - COALESCE(SUM(l.debit),0)
  END AS amount
FROM public.gl_transaction_lines l
JOIN public.gl_transaction_headers h ON h.id = l.header_id
LEFT JOIN public.gl_accounts a ON a.account_code = l.account_code
WHERE COALESCE(h.status, 'Posted') = 'Posted'
  AND NOT (
    lower(COALESCE(a.account_type,'')) LIKE '%income%' OR
    lower(COALESCE(a.account_type,'')) LIKE '%revenue%' OR
    lower(COALESCE(a.account_type,'')) LIKE '%expense%'
  )
GROUP BY l.account_code, l.account_name, a.account_type
ORDER BY section, l.account_code;

-- 4) Ensure standard email templates exist/update in master data.
DO $$
DECLARE
  v_exists int;
BEGIN
  IF to_regclass('public.email_templates') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_exists FROM public.email_templates WHERE template_name = 'Quote Email';
    IF v_exists > 0 THEN
      UPDATE public.email_templates SET subject = 'Quotation {{quote_no}} from Aashan & Co LLC', body = 'Hi {{customer_name}},

Thank you for considering Aashan & Co LLC for your project.

Please find the attached quotation for your review. The quote outlines the proposed scope of work and estimated costs based on the information provided. We kindly ask that you review the details and let us know if you have any questions or require any modifications.

Please note that this quotation includes the labor and services specified. Any additional materials, transportation, permits, equipment rentals, or other project-related expenses not specifically listed may be charged separately.

If you would like to proceed with the work, simply reply to this email or contact us directly, and we will be happy to schedule your service.

We appreciate the opportunity to earn your business and look forward to working with you.

Thank you for choosing Aashan & Co LLC.

Best Regards,

Aashan & Co LLC

Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co' WHERE template_name = 'Quote Email';
    ELSE
      INSERT INTO public.email_templates (template_name, subject, body) VALUES ('Quote Email', 'Quotation {{quote_no}} from Aashan & Co LLC', 'Hi {{customer_name}},

Thank you for considering Aashan & Co LLC for your project.

Please find the attached quotation for your review.

Best Regards,
Aashan & Co LLC');
    END IF;

    SELECT COUNT(*) INTO v_exists FROM public.email_templates WHERE template_name = 'Invoice Email';
    IF v_exists > 0 THEN
      UPDATE public.email_templates SET subject = 'Invoice {{invoice_no}} from Aashan & Co LLC', body = 'Hi {{customer_name}},

Thank you for choosing Aashan & Co LLC.

Please find your invoice attached for the services provided. We kindly request that you review the invoice.

If you have any questions regarding this invoice or require additional information, please do not hesitate to contact us. We are happy to assist you.

We appreciate your business and look forward to serving you again in the future.

We would also greatly appreciate your feedback. Please leave us a review on Facebook:

https://www.facebook.com/profile.php?id=61584788072935&sk=reviews

Your review helps us improve our services and assists other customers in making informed decisions.

Thank you for choosing Aashan & Co LLC.

Best Regards,

Aashan & Co LLC

Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co' WHERE template_name = 'Invoice Email';
    ELSE
      INSERT INTO public.email_templates (template_name, subject, body) VALUES ('Invoice Email', 'Invoice {{invoice_no}} from Aashan & Co LLC', 'Hi {{customer_name}},

Thank you for choosing Aashan & Co LLC.

Please find your invoice attached for the services provided.

Best Regards,
Aashan & Co LLC');
    END IF;

    SELECT COUNT(*) INTO v_exists FROM public.email_templates WHERE template_name = 'Payment Receipt Email';
    IF v_exists > 0 THEN
      UPDATE public.email_templates SET subject = 'Payment Receipt {{receipt_no}} from Aashan & Co LLC', body = 'Hi {{customer_name}},

Thank you for your payment. We appreciate your business and the opportunity to serve you.

This email confirms that we have received your payment. Please retain this receipt for your records.

If you have any questions regarding your payment or require additional assistance, please feel free to contact us.

We would greatly appreciate your feedback. Please leave us a review on Facebook:

https://www.facebook.com/profile.php?id=61584788072935&sk=reviews

Your review helps us improve our services and assists other customers in making informed decisions.

Thank you for choosing Aashan & Co LLC.

Best Regards,
Aashan & Co LLC' WHERE template_name = 'Payment Receipt Email';
    ELSE
      INSERT INTO public.email_templates (template_name, subject, body) VALUES ('Payment Receipt Email', 'Payment Receipt {{receipt_no}} from Aashan & Co LLC', 'Hi {{customer_name}},

Thank you for your payment.

Best Regards,
Aashan & Co LLC');
    END IF;
  END IF;
END $$;

COMMIT;
