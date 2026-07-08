# Aashan ERP v5.5.0 — Bank/Cash Payment Engine

## Added
- Added **Paid From Account** to Vendor Payments and Cash / Bank Expenses.
- Added separate **Payment Method** field so account and method are no longer mixed together.
- Added **Reference #** field for checks, Zelle, ACH, debit card, or credit card references.
- Payment account dropdown reads from Bank/Cash setup and relevant Chart of Accounts names.

## Accounting behavior
- Expenses and vendor payments now post to the selected paid-from account in reports and bank register.
- General Ledger now credits the selected bank/cash/credit card account instead of using payment method as the account.
- Bank Register now filters expenses by the selected paid-from account.

## SQL required
Run this before deploying:

`supabase/aashan_erp_v5_5_0_bank_cash_payment_engine.sql`

This adds:
- `expenses.bank_name`
- `expenses.reference_no`
- an index for bank register filtering

## Tested
- `npm run build` completed successfully.
