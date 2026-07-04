-- Aashan ERP v3.3.4 - Mobile attachment + email attachment stability
-- Safe to run multiple times.

-- Storage bucket for all document attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('aashan-erp-attachments', 'aashan-erp-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE TABLE IF NOT EXISTS public.document_attachments (
  id BIGSERIAL PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_no TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes BIGINT DEFAULT 0,
  data_url TEXT,
  storage_path TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_attachments
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Old builds created data_url as NOT NULL. Storage-based attachments need this nullable.
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

-- Allow the ERP PWA to upload/read/delete files from the attachment bucket.
DROP POLICY IF EXISTS allow_aashan_attachment_storage_all ON storage.objects;
DROP POLICY IF EXISTS allow_storage_attachments_all ON storage.objects;
CREATE POLICY allow_aashan_attachment_storage_all
ON storage.objects
FOR ALL
USING (bucket_id = 'aashan-erp-attachments')
WITH CHECK (bucket_id = 'aashan-erp-attachments');
