-- Phase 30 - Sales & Purchasing Module Cleanup
-- Safe to run multiple times. Keeps existing data and standardizes customer receipts / vendor payments terminology.

-- 1) Make sure existing customer payments are visible in Customer Receipts.
insert into receipts (receipt_no, customer, invoice_no, receipt_date, amount, payment_method, bank_name, notes, status, posted_at)
select
  coalesce(nullif(p.invoice_no, ''), 'RCPT') || '-PAY-' || p.id::text as receipt_no,
  coalesce(p.customer, '') as customer,
  coalesce(p.invoice_no, '') as invoice_no,
  p.payment_date as receipt_date,
  coalesce(p.amount, 0) as amount,
  coalesce(nullif(p.payment_method, ''), 'Cash') as payment_method,
  coalesce(p.bank_name, '') as bank_name,
  coalesce(nullif(p.notes, ''), 'Migrated from Payments screen') as notes,
  coalesce(nullif(p.status, ''), 'Posted') as status,
  coalesce(p.posted_at, now()) as posted_at
from payments p
where not exists (
  select 1 from receipts r
  where coalesce(r.invoice_no, '') = coalesce(p.invoice_no, '')
    and coalesce(r.customer, '') = coalesce(p.customer, '')
    and coalesce(r.amount, 0) = coalesce(p.amount, 0)
    and coalesce(r.receipt_date::text, '') = coalesce(p.payment_date::text, '')
);

-- 2) Standard email templates in Masters.
insert into email_templates (template_name, subject, body)
values
('Quote Email', 'Quote {{quote_no}} from Aashan & Co LLC', 'Hi {{customer_name}},

Thank you for considering Aashan & Co LLC for your project.

Please find the attached quotation for your review. The quote outlines the proposed scope of work and estimated costs based on the information provided. We kindly ask that you review the details and let us know if you have any questions or require any modifications.

Please note that this quotation includes the labor and services specified. Any additional materials, transportation, permits, equipment rentals, or other project-related expenses not specifically listed may be charged separately.

If you would like to proceed with the work, simply reply to this email or contact us directly, and we will be happy to schedule your service.

We appreciate the opportunity to earn your business and look forward to working with you.

Thank you for choosing Aashan & Co LLC.

Best Regards,

Aashan & Co LLC

Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co'),
('Invoice Email', 'Invoice {{invoice_no}} from Aashan & Co LLC', 'Hi {{customer_name}},

Thank you for choosing Aashan & Co LLC.

Please find your invoice attached for the services provided. We kindly request that you review the invoice.

If you have any questions regarding this invoice or require additional information, please do not hesitate to contact us. We are happy to assist you.

We appreciate your business and look forward to serving you again in the future.

We would also greatly appreciate your feedback. Please leave us a review on Facebook:

https://www.facebook.com/profile.php?id=61584788072935&sk=reviews

Your review helps us improve our services and assists other customers in making informed decisions.

Thank you for choosing Aashan & Co LLC.

Best Regards,

Aashan & Co LLC

Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co'),
('Payment Receipt Email', 'Payment Receipt {{receipt_no}} from Aashan & Co LLC', 'Hi {{customer_name}},

Thank you for your payment. We appreciate your business and the opportunity to serve you.

This email confirms that we have received your payment. Please retain this receipt for your records.

If you have any questions regarding your payment or require additional assistance, please feel free to contact us.

We would greatly appreciate your feedback. Please leave us a review on Facebook:

https://www.facebook.com/profile.php?id=61584788072935&sk=reviews

Your review helps us improve our services and assists other customers in making informed decisions.

Thank you for choosing Aashan & Co LLC.

Best Regards,
Aashan & Co LLC')
on conflict (template_name) do update
set subject = excluded.subject,
    body = excluded.body;

-- 3) Mark purchase invoices paid when matching vendor payment/expense exists for the same vendor and amount.
update purchase_invoices pi
set status = 'Paid'
where coalesce(pi.status, '') <> 'Paid'
  and exists (
    select 1 from expenses e
    where lower(trim(coalesce(e.vendor, ''))) = lower(trim(coalesce(pi.vendor, '')))
      and abs(coalesce(e.amount, 0) - coalesce(pi.amount, 0)) < 0.01
      and coalesce(e.status, '') in ('Paid', 'Approved', 'Submitted', 'Draft')
  );
