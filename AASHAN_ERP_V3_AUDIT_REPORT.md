# Aashan ERP v3.0 Enterprise Audit Summary

## Audit inputs reviewed
- Latest ERP source package uploaded by the user.
- Supabase PostgreSQL custom backup metadata and schema strings.
- Existing transaction tables: customers, vendors, quotes, invoices, receipts, payments, purchase_invoices, expenses, vendor_payments, banks, journal_entries and GL tables.

## Main issues found
1. **Bank balance was using stored `banks.current_balance` and mixed calculations.** This allowed unrelated balances such as tax payable or owner equity to appear to affect Cash on Hand.
2. **Vendor payments were not loaded into the React state.** The bank register and reports were only using `expenses`, while the database also has a separate `vendor_payments` table.
3. **Reports were not using one consistent source of truth.** Dashboard, P&L, Balance Sheet, Trial Balance, General Ledger and Bank Register used different shortcuts.
4. **Potential duplicate vendor payments.** Some vendor payments exist in both `expenses` and `vendor_payments`; v3.0 includes matching logic to avoid double-counting.
5. **Document photo table exists in the DB, but UI needed to remain visible and tied to Quote/Invoice/Work Order screens.**

## v3.0 Enterprise fixes included
- Loads `vendor_payments` into the application.
- Bank Register includes receipts, legacy customer payments, expenses and non-duplicate vendor payments.
- Dashboard Cash & Bank is calculated from opening balance + receipts/payments - expenses/vendor payments.
- Cash & Bank no longer includes tax payable, owner equity, revenue or expenses.
- Balance Sheet separates:
  - Accounts Receivable
  - Cash & Bank
  - Accounts Payable
  - Tax Payable
  - Owner's Capital / Opening Balance
  - Current Year Profit
- Trial Balance is derived from the same calculated accounting layer.
- General Ledger now includes tax payable lines and vendor payment lines.
- Customer/Vendor statements include legacy and current receipt/payment records.
- SQL repair script creates/repairs reporting views and synchronizes `banks.current_balance` to calculated balances.
- Camera/photo attachment UI remains on Quote, Invoice and Work Order screens.

## Important accounting note
This build uses a practical small-business accounting model based on your current data. Some historic entries are stored as cash expenses rather than full AP bill/payment pairs. The v3 logic prevents duplicate counting when the same vendor payment appears in both `expenses` and `vendor_payments`.

## Install
1. Run `supabase/aashan_erp_v3_enterprise_database_repair.sql` in Supabase SQL Editor.
2. Run `npm install`.
3. Run `npm run build`.
4. Commit and push to Cloudflare.
