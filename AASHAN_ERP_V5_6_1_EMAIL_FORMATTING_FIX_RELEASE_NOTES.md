# Aashan ERP v5.6.1 — Email Formatting Fix

## Fixed
- Payment reminder emails no longer display literal `\\n` characters.
- Customer statement emails now preserve proper paragraphs and line breaks.
- Email preview, direct send, plain-text email, HTML email, and mail-app fallback all normalize stored line breaks.
- Added a Supabase correction script for templates already saved with literal escape characters.

## SQL
Run `supabase/aashan_erp_v5_6_1_email_line_break_fix.sql` once in Supabase SQL Editor.
