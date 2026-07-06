# Aashan ERP v5.0.0 Enterprise Foundation Build

Base: v4.3.0 AI Copilot transaction build.

## Included
- Aashan AI module foundation
- Aashan AI actions, smart search, business summary, and email writer from prior v4 builds
- AI Copilot transaction helper buttons retained
- Dashboard drill-down foundation retained
- Mobile-friendly transaction description auto-expand retained
- Attachment/storage fixes retained from prior v3.4.x builds

## Build validation
- `npm install` completed
- `npm run build` completed successfully with Next.js production build

## SQL
- No new SQL migration required for this foundation build.

## Deploy
```bash
npm install
npm run build
git add .
git commit -m "Release Aashan ERP v5.0.0 Enterprise foundation"
git push origin main
```
