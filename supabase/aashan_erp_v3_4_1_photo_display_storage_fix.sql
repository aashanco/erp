-- Aashan ERP v3.4.1 Photo Display Storage Fix - Mobile/browser attachments, email documents, tax stability
-- Safe to run multiple times before deploying this build.

-- 1) Supabase Storage bucket for quote / work order / invoice / receipt attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('aashan-erp-attachments', 'aashan-erp-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE TABLE IF NOT EXISTS public.document_attachments (
  id BIGSERIAL PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_no TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT DEFAULT 0,
  data_url TEXT,
  storage_path TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_attachments
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

-- Old builds used data_url as NOT NULL. v3.4 stores the real file in Supabase Storage.
ALTER TABLE public.document_attachments
  ALTER COLUMN data_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_attachments_document
ON public.document_attachments (document_type, document_no);

CREATE INDEX IF NOT EXISTS idx_document_attachments_storage_path
ON public.document_attachments (storage_path);

ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_document_attachments_all ON public.document_attachments;
CREATE POLICY allow_document_attachments_all
ON public.document_attachments
FOR ALL
USING (true)
WITH CHECK (true);

-- Storage policies used by the PWA on mobile and desktop.
DROP POLICY IF EXISTS allow_aashan_attachment_storage_all ON storage.objects;
DROP POLICY IF EXISTS allow_storage_attachments_all ON storage.objects;
CREATE POLICY allow_aashan_attachment_storage_all
ON storage.objects
FOR ALL
USING (bucket_id = 'aashan-erp-attachments')
WITH CHECK (bucket_id = 'aashan-erp-attachments');

-- 2) Ensure user profile table exists and Anil/support are always Admin.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'Staff',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_user_profiles_all ON public.user_profiles;
CREATE POLICY allow_user_profiles_all
ON public.user_profiles
FOR ALL
USING (true)
WITH CHECK (true);

UPDATE public.user_profiles
SET role = 'Admin', active = true
WHERE lower(email) IN ('thomasmathew77@gmail.com', 'support@aashan.co');

-- 3) Add missing discount posting profile so invoice discount has a ledger mapping.
CREATE TABLE IF NOT EXISTS public.posting_profiles (
  id bigserial primary key,
  profile_code text not null unique,
  profile_name text not null,
  module text not null,
  transaction_type text not null,
  debit_account_code text not null,
  debit_account_name text not null default '',
  credit_account_code text not null,
  credit_account_name text not null default '',
  description text not null default '',
  is_default boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

ALTER TABLE public.posting_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_posting_profiles_all ON public.posting_profiles;
CREATE POLICY allow_posting_profiles_all
ON public.posting_profiles
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.posting_profiles
(profile_code, profile_name, module, transaction_type, debit_account_code, debit_account_name, credit_account_code, credit_account_name, description, is_default, is_active)
VALUES
('SALES-DISCOUNT', 'Sales Discount', 'Accounts Receivable', 'Invoice Discount', '4020', 'Sales Discounts', '1000', 'Accounts Receivable', 'Debit Sales Discounts and reduce Accounts Receivable for document line discounts.', true, true),
('TAX-PAYABLE', 'Sales Tax Payable', 'Tax', 'Sales Tax', '1000', 'Accounts Receivable', '2100', 'Tax Payable', 'Customer tax receivable to Sales Tax Payable.', true, true)
ON CONFLICT (profile_code) DO UPDATE SET
profile_name = EXCLUDED.profile_name,
module = EXCLUDED.module,
transaction_type = EXCLUDED.transaction_type,
debit_account_code = EXCLUDED.debit_account_code,
debit_account_name = EXCLUDED.debit_account_name,
credit_account_code = EXCLUDED.credit_account_code,
credit_account_name = EXCLUDED.credit_account_name,
description = EXCLUDED.description,
is_default = EXCLUDED.is_default,
is_active = EXCLUDED.is_active;
