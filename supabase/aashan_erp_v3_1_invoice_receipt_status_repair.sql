-- Aashan ERP v3.1 - Invoice receipt status repair
-- Fixes invoices that stayed Draft/Open after a receipt was linked by invoice_no.

BEGIN;

WITH receipt_totals AS (
  SELECT
    lower(trim(invoice_no)) AS invoice_key,
    SUM(COALESCE(amount, 0))::numeric AS paid_amount
  FROM public.receipts
  WHERE COALESCE(trim(invoice_no), '') <> ''
  GROUP BY lower(trim(invoice_no))
)
UPDATE public.invoices i
SET status = CASE
  WHEN rt.paid_amount <= 0 THEN CASE WHEN i.status = 'Draft' THEN 'Draft' ELSE 'Open' END
  WHEN (COALESCE(i.total_amount, i.amount, 0)::numeric - rt.paid_amount) < -0.009 THEN 'Overpaid'
  WHEN ABS(COALESCE(i.total_amount, i.amount, 0)::numeric - rt.paid_amount) <= 0.009 THEN 'Paid'
  ELSE 'Partially Paid'
END
FROM receipt_totals rt
WHERE lower(trim(i.invoice_no)) = rt.invoice_key
  AND COALESCE(i.status, '') <> 'Cancelled';

COMMIT;
