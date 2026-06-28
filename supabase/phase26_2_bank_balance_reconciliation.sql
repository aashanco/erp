-- Aashan ERP Phase 26.2 - Bank Balance Reconciliation
-- Recalculates bank current balance from opening balance + customer receipts + customer payments.
-- Run only if you want to rebuild bank balances after historical entries.

update public.banks b
set current_balance =
  coalesce(b.opening_balance, 0)
  + coalesce((
      select sum(r.amount)
      from public.receipts r
      where r.bank_name = b.bank_name
    ), 0)
  + coalesce((
      select sum(p.amount)
      from public.payments p
      where p.bank_name = b.bank_name
    ), 0);
