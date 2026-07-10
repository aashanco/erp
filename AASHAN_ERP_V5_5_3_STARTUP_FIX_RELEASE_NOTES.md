# Aashan ERP v5.5.3 – Startup Reliability Fix

- Prevents the ERP from remaining indefinitely on “Loading ERP…”.
- Adds a timeout around Supabase session restoration.
- Opens the login screen even when session restoration or network access is slow.
- Loads ERP database tables only after a valid authenticated session.
- Removes duplicate unconditional startup data loading.
- Moves database calls outside the Supabase authentication callback to avoid auth lock/deadlock behavior.
- Preserves all accounting, transaction, attachment, desktop, and mobile UI functionality.
- Bumps the service-worker cache name so deployed clients receive the corrected startup bundle.

No new SQL migration is required.
