-- Aashan ERP v5.6.1 - Email template line-break correction
-- Converts stored literal backslash-n characters into real line breaks.

update public.email_templates
set body = replace(replace(replace(body, E'\\r\\n', chr(10)), E'\\n', chr(10)), E'\\r', chr(10))
where template_name in ('Payment Reminder Email', 'Customer Statement Email')
  and body is not null;

-- Ensure blank due dates render clearly in newly created reminder templates.
update public.email_templates
set body = replace(body, 'Due Date: {{due_date}}', 'Due Date: {{due_date}}')
where template_name = 'Payment Reminder Email';
