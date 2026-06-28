-- Aashan ERP Phase 26 - Modular Finance SQL
-- Safe version for existing number_sequences where next_number is BIGINT.

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_no TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_no_uq
ON public.customers(customer_no)
WHERE customer_no IS NOT NULL AND customer_no <> '';

WITH numbered AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY id) rn
    FROM public.customers
    WHERE customer_no IS NULL OR customer_no = ''
)
UPDATE public.customers c
SET customer_no = 'CUST-' || LPAD(numbered.rn::text, 6, '0')
FROM numbered
WHERE c.id = numbered.id;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS quote_id BIGINT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS qty NUMERIC(18,2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS qty NUMERIC(18,2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';

UPDATE public.number_sequences
SET prefix = 'CUST-',
    next_number = (SELECT COUNT(*) + 1 FROM public.customers),
    padding = 6
WHERE document_type = 'Customer';

INSERT INTO public.number_sequences (document_type, prefix, next_number, padding)
SELECT 'Customer', 'CUST-', (SELECT COUNT(*) + 1 FROM public.customers), 6
WHERE NOT EXISTS (
    SELECT 1 FROM public.number_sequences WHERE document_type = 'Customer'
);
