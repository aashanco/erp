# Aashan ERP v5.5.1 - Accounting Reconciliation & Drill-down Stability

## Goal
Make the accounting engine more robust and trustworthy without removing any existing feature or changing the mobile UI layout.

## What changed
- Loaded posted General Ledger headers and lines into the main ERP application so the report layer can prefer posted accounting data where available.
- Added account-name normalization to prevent duplicate balances caused by capitalization differences such as `Cash on hand` vs `Cash on Hand`.
- Rebuilt cash/bank account picking from real Bank, Cash, Petty Cash, and Credit Card style accounts only.
- Filtered payment account dropdowns so non-payment accounts such as Bank Charges, Equity, Revenue, and Initial Investment are not offered as payment accounts.
- Fixed dashboard Balance Sheet cash breakdown to show the real underlying cash/bank accounts instead of hard-coded generic `Bank` and `Cash on hand` lines.
- Improved Bank Register account matching so one-account view calculates that account only, while All Accounts remains combined.
- Preserved the existing mobile UI and transaction screens.

## Important accounting behavior
- Vendor payments that are already represented by matching expense transactions are excluded from the register duplicate list to avoid double-counting.
- Cash & Bank total is now built from normalized account-level balances.
- Dashboard drill-down from each bank/cash account opens the Bank Register filtered to that exact account.

## Validation
- TypeScript check completed successfully with `npx tsc --noEmit`.
- Next.js production compilation completed successfully; the final trace step exceeded sandbox execution time, but no TypeScript or compile errors were found before timeout.
