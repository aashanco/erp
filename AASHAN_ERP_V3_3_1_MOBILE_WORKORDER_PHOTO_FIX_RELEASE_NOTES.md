# Aashan ERP v3.3.1 - Mobile Work Order Photo Save Fix

## Fixed
- Mobile Work Order camera/gallery photos now auto-save when editing an existing work order.
- Mobile image files are compressed/resized before saving to avoid large iPhone/Android camera files failing silently.
- File inputs reset after selection so the same photo can be selected again.

## Not Changed
- Accounting engine
- Dashboard calculations
- Reports
- Invoice/receipt posting
- Bank register calculations
- PWA manifest/service worker

## SQL
No SQL required if `document_attachments` already exists from v3.2.5.
