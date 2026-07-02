# Aashan ERP v3.2.3 – Mobile Performance

## Scope
Mobile performance and usability only. No SQL required.

## New / Improved
- Parallelized initial ERP data loading to reduce mobile startup wait time.
- Added in-flight sync protection so repeated taps do not start duplicate Sync requests.
- Remember last opened ERP page on mobile/desktop refresh.
- Added mobile scrolling optimizations for iPhone and Android.
- Added safer mobile keyboard behavior so focused fields stay visible above sticky buttons.
- Added lightweight rendering hints for large mobile cards/tables.

## Not Changed
- Accounting logic
- Dashboard calculations
- General Ledger
- Trial Balance / P&L / Balance Sheet
- Bank Register calculations
- Receipt / invoice posting logic
- Email logic
- Camera logic
- Database schema

## Files Changed
- components/ERPApp.tsx
- AASHAN_ERP_V3_2_3_RELEASE_NOTES.md

## SQL
No SQL required.

## Regression Checklist
- Quotes: unchanged
- Invoices: unchanged
- Receipts: unchanged
- Purchase invoices: unchanged
- Vendor payments: unchanged
- Reports: unchanged
- Dashboard: unchanged
- PWA: unchanged
- Camera: unchanged
