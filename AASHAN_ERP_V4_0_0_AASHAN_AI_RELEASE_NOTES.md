# Aashan ERP v4.0.0 - Aashan AI Starter Build

## Added
- New **Aashan AI** module in the ERP navigation.
- Floating **Aashan AI** button available from all screens on desktop and mobile.
- Business summary assistant using loaded ERP data.
- Outstanding invoice assistant.
- Quote wording helper.
- Customer follow-up / email draft helper.
- Natural-language search across loaded customers, quotes, and invoices.

## Notes
- This first Aashan AI build is local/rule-based and does not require an OpenAI API key.
- No database SQL changes are required.
- Existing transaction, attachment, tax, report, and email logic was not changed.

## Deploy
```bash
npm install
npm run build
git add .
git commit -m "Add Aashan AI starter module"
git push origin main
```
