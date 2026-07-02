# Aashan ERP v3.2 - Mobile Experience

## Scope
Mobile UI only. No accounting, dashboard, reports, GL, invoice posting, receipt posting, or database logic was changed.

## Changes
- Removed the mobile status command center from the top of every page.
- Moved Online/Offline, Install App, Face ID/Biometrics, and offline sync count under the logged-in user profile menu.
- Kept PWA, Face ID, Sync, Logout, camera, email, documents, reports, and accounting logic unchanged.

## SQL
No SQL required.

## Files Changed
- components/ERPApp.tsx

## Regression Notes
These areas were intentionally not modified:
- Dashboard calculations
- General Ledger
- Trial Balance
- Profit & Loss
- Balance Sheet
- Bank Register
- Quotes/Invoices/Receipts posting
- Purchase Invoices/Vendor Payments
- Email sending
- Camera/photo attachment logic
- PWA manifest/service worker
