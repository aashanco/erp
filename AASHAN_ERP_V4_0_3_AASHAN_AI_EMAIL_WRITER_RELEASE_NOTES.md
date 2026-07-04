# Aashan ERP v4.0.3 - Aashan AI Email Writer

## Added
- Aashan AI customer-ready email writer for:
  - Quote emails
  - Invoice emails
  - Receipt/payment received emails
  - Payment reminder emails
  - General follow-up emails
- Added quick email buttons inside the Aashan AI module.
- Email writer pulls customer/document context from loaded ERP records when available.
- Uses company details from ERP setup for signature, phone, email, and website.
- Copy Response button can be used to paste the generated email into the ERP email popup.

## Notes
- No SQL required.
- This is rule-based AI/email drafting and does not require an OpenAI API key.
- Existing transaction, attachment, photo, and posting logic were not changed.

## Deploy
```bash
npm install
npm run build
git add .
git commit -m "Add Aashan AI email writer"
git push origin main
```
