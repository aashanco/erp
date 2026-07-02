-- Aashan ERP v3.2.5 - Camera, document photos, and mobile push notification foundation
-- Safe to run multiple times.

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

CREATE INDEX IF NOT EXISTS idx_document_attachments_document
ON public.document_attachments (document_type, document_no);

ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_document_attachments_all ON public.document_attachments;
CREATE POLICY allow_document_attachments_all
ON public.document_attachments
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL,
  email TEXT DEFAULT '',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT DEFAULT '',
  auth TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
ON public.push_subscriptions (active);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_push_subscriptions_all ON public.push_subscriptions;
CREATE POLICY allow_push_subscriptions_all
ON public.push_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);
