# Aashan ERP v3.1 - Receipt Status Logic Fix

## Issue fixed
Invoices stayed in **Draft** even after a receipt was created and linked to the invoice.

## Root cause
The frontend function `invoiceStatusFromRows()` returned `Draft` immediately before checking linked receipts. Because of that, any invoice currently marked Draft could never become Paid, Partially Paid, or Overpaid from the receipt save flow.

## Fix
- Cancelled invoices remain Cancelled.
- Draft invoices with no linked receipt remain Draft.
- Draft invoices with linked receipts now update immediately to:
  - Paid
  - Partially Paid
  - Overpaid
- Existing records can be repaired using:
  - `supabase/aashan_erp_v3_1_invoice_receipt_status_repair.sql`

## Build note
I patched the source file and added the SQL repair script. In this sandbox, `npm run build` could not be fully verified because Next.js attempted to download a missing SWC package and internet/package registry access is blocked here. Run `npm install` and `npm run build` on your local machine.
