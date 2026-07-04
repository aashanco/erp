# Aashan ERP v3.4.1 - Photo Display + Storage Fix

## Fixed
- Camera and Files attachments now show immediately after selection on mobile and browser.
- Added compressed image fallback preview so photos still display even if Supabase Storage public URL is blocked by an old private bucket setting.
- SQL now forces the `aashan-erp-attachments` Supabase Storage bucket to public if it already existed as private.
- Attachment grid CSS added for mobile-friendly photo/file display.
- Saved document attachments keep both Storage path and compressed image fallback for reliable preview and email attachment handling.

## Run first
Run:

```sql
supabase/aashan_erp_v3_4_1_photo_display_storage_fix.sql
```

Then deploy the app.
