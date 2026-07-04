# Aashan ERP v3.3.4 - Mobile Stability, Attachments, Email Attachments

## Fixed
- Mobile camera/gallery photos now save without sending huge base64 payloads to Supabase.
- Attachments are stored in Supabase Storage when available.
- Legacy database attachment fallback remains for compatibility.
- Saved attachment thumbnails display from either Storage URL or legacy data URL.
- Email sending supports attached images/documents by data URL or public Storage URL.
- Work Order photos copied to converted invoices keep Storage references.
- Mobile tax can be cleared with a dedicated **No Tax** button on Quote and Invoice line grids.

## Database
Run:
`supabase/aashan_erp_v3_3_4_mobile_full_stability.sql`

## Not changed
- Accounting posting logic
- Dashboard calculation logic
- Financial reports logic
- Invoice/receipt payment status logic
