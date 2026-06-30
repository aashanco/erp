-- Aashan ERP v1.1 - Bank Balance / Vendor Payment Fix
-- Run in Supabase SQL Editor.
-- Purpose:
-- 1) Recalculate bank.current_balance from actual transactions.
-- 2) Deduct vendor payments saved in Expenses screen.
-- 3) Deduct legacy vendor_payments table records only when they are not already represented in Expenses.
-- 4) Add safe helper view to verify balances.

BEGIN;

-- Keep RLS permissive for current single-company ERP tables used here.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['banks','receipts','payments','expenses','vendor_payments']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'aashan_erp_allow_all_' || t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)', 'aashan_erp_allow_all_' || t, t);
    END IF;
  END LOOP;
END $$;

-- Bank balance = opening balance + customer receipts - vendor payments/expenses.
-- In this ERP, the Vendor Payments screen stores current/new vendor payments in public.expenses.
-- Older imports may also exist in public.vendor_payments, so those are only deducted if no matching expense exists.
UPDATE public.banks b
SET current_balance = ROUND((
  COALESCE(b.opening_balance, 0)

  -- Customer receipts / money in
  + COALESCE((
      SELECT SUM(COALESCE(r.amount, 0))
      FROM public.receipts r
      WHERE lower(trim(COALESCE(r.bank_name, ''))) = lower(trim(COALESCE(b.bank_name, '')))
        AND lower(trim(COALESCE(r.status, 'Posted'))) NOT IN ('void','cancelled','deleted')
    ), 0)

  -- Legacy customer payments / money in, if any old records still exist in payments table
  + COALESCE((
      SELECT SUM(COALESCE(p.amount, 0))
      FROM public.payments p
      WHERE lower(trim(COALESCE(p.bank_name, ''))) = lower(trim(COALESCE(b.bank_name, '')))
        AND lower(trim(COALESCE(p.status, 'Posted'))) NOT IN ('void','cancelled','deleted')
    ), 0)

  -- Expenses / vendor payments from the current Vendor Payments screen / money out
  - COALESCE((
      SELECT SUM(COALESCE(e.amount, 0))
      FROM public.expenses e
      WHERE lower(trim(COALESCE(e.payment_method, ''))) = lower(trim(COALESCE(b.bank_name, '')))
        AND lower(trim(COALESCE(e.status, 'Paid'))) NOT IN ('draft','submitted','void','cancelled','deleted')
    ), 0)

  -- Older vendor_payments table / money out, but avoid double deduction when same payment is already in expenses
  - COALESCE((
      SELECT SUM(COALESCE(vp.amount, 0))
      FROM public.vendor_payments vp
      WHERE lower(trim(COALESCE(vp.paid_from, ''))) = lower(trim(COALESCE(b.bank_name, '')))
        AND NOT EXISTS (
          SELECT 1
          FROM public.expenses e
          WHERE COALESCE(e.expense_date, DATE '1900-01-01') = COALESCE(vp.payment_date, DATE '1900-01-01')
            AND lower(trim(COALESCE(e.vendor, ''))) = lower(trim(COALESCE(vp.vendor, '')))
            AND ABS(COALESCE(e.amount, 0) - COALESCE(vp.amount, 0)) < 0.01
            AND (
              lower(trim(COALESCE(e.payment_method, ''))) = lower(trim(COALESCE(vp.paid_from, '')))
              OR lower(COALESCE(e.description, '')) LIKE '%' || lower(trim(COALESCE(vp.paid_from, ''))) || '%'
            )
        )
    ), 0)
)::numeric, 2);

-- Verification view for dashboard/bank troubleshooting.
DROP VIEW IF EXISTS public.v_bank_balance_detail;
CREATE VIEW public.v_bank_balance_detail AS
SELECT
  b.id,
  b.bank_name,
  COALESCE(b.opening_balance, 0) AS opening_balance,
  COALESCE((
    SELECT SUM(COALESCE(r.amount, 0))
    FROM public.receipts r
    WHERE lower(trim(COALESCE(r.bank_name, ''))) = lower(trim(COALESCE(b.bank_name, '')))
      AND lower(trim(COALESCE(r.status, 'Posted'))) NOT IN ('void','cancelled','deleted')
  ), 0) AS customer_receipts,
  COALESCE((
    SELECT SUM(COALESCE(p.amount, 0))
    FROM public.payments p
    WHERE lower(trim(COALESCE(p.bank_name, ''))) = lower(trim(COALESCE(b.bank_name, '')))
      AND lower(trim(COALESCE(p.status, 'Posted'))) NOT IN ('void','cancelled','deleted')
  ), 0) AS legacy_customer_payments,
  COALESCE((
    SELECT SUM(COALESCE(e.amount, 0))
    FROM public.expenses e
    WHERE lower(trim(COALESCE(e.payment_method, ''))) = lower(trim(COALESCE(b.bank_name, '')))
      AND lower(trim(COALESCE(e.status, 'Paid'))) NOT IN ('draft','submitted','void','cancelled','deleted')
  ), 0) AS expenses_vendor_payments,
  COALESCE((
    SELECT SUM(COALESCE(vp.amount, 0))
    FROM public.vendor_payments vp
    WHERE lower(trim(COALESCE(vp.paid_from, ''))) = lower(trim(COALESCE(b.bank_name, '')))
      AND NOT EXISTS (
        SELECT 1
        FROM public.expenses e
        WHERE COALESCE(e.expense_date, DATE '1900-01-01') = COALESCE(vp.payment_date, DATE '1900-01-01')
          AND lower(trim(COALESCE(e.vendor, ''))) = lower(trim(COALESCE(vp.vendor, '')))
          AND ABS(COALESCE(e.amount, 0) - COALESCE(vp.amount, 0)) < 0.01
          AND (
            lower(trim(COALESCE(e.payment_method, ''))) = lower(trim(COALESCE(vp.paid_from, '')))
            OR lower(COALESCE(e.description, '')) LIKE '%' || lower(trim(COALESCE(vp.paid_from, ''))) || '%'
          )
      )
  ), 0) AS legacy_vendor_payments_not_in_expenses,
  COALESCE(b.current_balance, 0) AS current_balance
FROM public.banks b
ORDER BY b.bank_name;

COMMIT;

-- Check result after running:
SELECT * FROM public.v_bank_balance_detail;
