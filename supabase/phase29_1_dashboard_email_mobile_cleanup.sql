-- Phase 29.1 - Dashboard, email templates, and mobile UI cleanup
-- Run this in Supabase SQL editor to update the Master Email Templates.

do $$
begin
  update email_templates
  set subject = 'Quote {{quote_no}} from Aashan & Co LLC',
      body = 'Thank you for considering Aashan & Co LLC for your project.

Please find the attached quotation for your review. The quote outlines the proposed scope of work and estimated costs based on the information provided. We kindly ask that you review the details and let us know if you have any questions or require any modifications.

Please note that this quotation includes the labor and services specified. Any additional materials, transportation, permits, equipment rentals, or other project-related expenses not specifically listed may be charged separately.

If you would like to proceed with the work, simply reply to this email or contact us directly, and we will be happy to schedule your service.

We appreciate the opportunity to earn your business and look forward to working with you.

Thank you for choosing Aashan & Co LLC.

Best Regards,

Aashan & Co LLC

Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co'
  where template_name = 'Quote Email';

  if not found then
    insert into email_templates (template_name, subject, body)
    values ('Quote Email', 'Quote {{quote_no}} from Aashan & Co LLC', 'Thank you for considering Aashan & Co LLC for your project.

Please find the attached quotation for your review. The quote outlines the proposed scope of work and estimated costs based on the information provided. We kindly ask that you review the details and let us know if you have any questions or require any modifications.

Please note that this quotation includes the labor and services specified. Any additional materials, transportation, permits, equipment rentals, or other project-related expenses not specifically listed may be charged separately.

If you would like to proceed with the work, simply reply to this email or contact us directly, and we will be happy to schedule your service.

We appreciate the opportunity to earn your business and look forward to working with you.

Thank you for choosing Aashan & Co LLC.

Best Regards,

Aashan & Co LLC

Phone: (832) 210-4248
Email: support@aashan.co
Website: www.aashan.co');
  end if;

  update email_templates
  set subject = 'Invoice {{invoice_no}} from Aashan & Co LLC',
      body = 'Thank you for choosing Aashan & Co LLC.

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
Website: www.aashan.co'
  where template_name = 'Invoice Email';

  if not found then
    insert into email_templates (template_name, subject, body)
    values ('Invoice Email', 'Invoice {{invoice_no}} from Aashan & Co LLC', 'Thank you for choosing Aashan & Co LLC.

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
Website: www.aashan.co');
  end if;

  update email_templates
  set subject = 'Payment Receipt {{receipt_no}} from Aashan & Co LLC',
      body = 'Thank you for your payment. We appreciate your business and the opportunity to serve you.

This email confirms that we have received your payment. Please retain this receipt for your records.

If you have any questions regarding your payment or require additional assistance, please feel free to contact us.

We would greatly appreciate your feedback. Please leave us a review on Facebook:

https://www.facebook.com/profile.php?id=61584788072935&sk=reviews

Your review helps us improve our services and assists other customers in making informed decisions.

Thank you for choosing Aashan & Co LLC.

Best Regards,
Aashan & Co LLC'
  where template_name = 'Payment Receipt Email';

  if not found then
    insert into email_templates (template_name, subject, body)
    values ('Payment Receipt Email', 'Payment Receipt {{receipt_no}} from Aashan & Co LLC', 'Thank you for your payment. We appreciate your business and the opportunity to serve you.

This email confirms that we have received your payment. Please retain this receipt for your records.

If you have any questions regarding your payment or require additional assistance, please feel free to contact us.

We would greatly appreciate your feedback. Please leave us a review on Facebook:

https://www.facebook.com/profile.php?id=61584788072935&sk=reviews

Your review helps us improve our services and assists other customers in making informed decisions.

Thank you for choosing Aashan & Co LLC.

Best Regards,
Aashan & Co LLC');
  end if;
end $$;
