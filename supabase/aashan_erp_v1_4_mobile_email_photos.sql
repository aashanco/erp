-- Aashan ERP v1.4 - Mobile email send button + document photos/attachments
CREATE TABLE IF NOT EXISTS public.document_attachments (
  id BIGSERIAL PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_no TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes BIGINT DEFAULT 0,
  data_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_doc
ON public.document_attachments (document_type, document_no);

ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_document_attachments_all ON public.document_attachments;
CREATE POLICY allow_document_attachments_all
ON public.document_attachments
FOR ALL
USING (true)
WITH CHECK (true);
