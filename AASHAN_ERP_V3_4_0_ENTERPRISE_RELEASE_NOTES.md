# Aashan ERP v3.4.0 Enterprise

Base: `Aashan_ERP_v3_3_4_Mobile_Browser_Stability_Attachments_Fix(1).zip`

## Fixed
- Replaced quote / work order / invoice attachment handling with Supabase Storage-first upload.
- Added support for photos plus PDF, Word, Excel, TXT, and CSV attachments.
- Camera button remains on document screens and stores files in the `aashan-erp-attachments` bucket.
- Email popup includes document attachments and extra file attachments.
- Email body remains the actual message; document preview stays on the right side.
- Mobile auth persistence improved with a stable Supabase auth storage key.
- Admin role is forced for `thomasmathew77@gmail.com` and `support@aashan.co`.
- Added missing `SALES-DISCOUNT` posting profile.
- Added v3.4 SQL migration.

## Deploy steps
1. Backup Supabase.
2. Run `supabase/aashan_erp_v3_4_0_enterprise_mobile_attachments.sql` once.
3. Run `npm install`.
4. Run `npm run build`.
5. Deploy to Cloudflare Pages.
6. On mobile, fully close the installed PWA/app and reopen it after deployment.

## Test checklist
- Quote → add camera photo → save → email.
- Quote → add PDF attachment → save → email.
- Work Order → add photo/document → convert to Invoice.
- Invoice → confirm copied attachments → email.
- Invoice line tax → enter tax → clear tax / No Tax → save.
- Mobile email popup → Send button visible at bottom.
