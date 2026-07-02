# Aashan ERP v3.2.5 - Camera, Photos & Push Notifications

## New
- Added separate **Camera** and **Gallery** buttons for Quote, Invoice, and Work Order photo attachments.
- Supports multiple gallery photos and mobile camera capture.
- Photos save to `document_attachments` and continue to attach to document emails.
- Added mobile push notification opt-in under the user profile menu.
- Added service worker push and notification click handlers.
- Added local notification after successful email send.

## Database
Run:

```sql
supabase/aashan_erp_v3_2_5_camera_push.sql
```

This creates/repairs:
- `document_attachments`
- `push_subscriptions`
- RLS policies for both tables

## Notes
- Server push requires a VAPID public key (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) and a send-notification backend later.
- Without VAPID, the app still requests notification permission and supports local ERP notifications.
- Accounting, dashboard, reports, and posting logic were not changed.
