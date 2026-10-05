# Start here

QuoteFlow is a quotation-to-cash workspace for Indian B2B businesses:
quotation → customer PO → sales order → delivery challan → invoice → payment → receipt,
with customers, products, a sales pipeline, follow-ups, reports and GST-ready documents.

This repository contains the frontend and the database design. The same app runs in two modes:

- **Demo** (not signed in): sample data generated in the browser by `genData()`, nothing saved.
- **Live** (signed in with an active license): the company's own data, loaded from and saved to
  Supabase by `live.js`. There is no server of our own; Supabase is the backend.

## Read in this order

| # | File | What it answers |
|---|------|-----------------|
| 1 | `docs/01-product-overview.md` | What the product does, screen by screen |
| 2 | `docs/02-architecture.md` | How the frontend is built and how to find things |
| 3 | `docs/03-data-model.md` | Every table and why it exists |
| 4 | `docs/04-rbac-and-auth.md` | Super admin, companies, roles, who may do what |
| 5 | `docs/05-backend-integration-plan.md` | How to replace the in-memory state with Supabase, step by step |
| 6 | `docs/06-conventions.md` | Code style, naming, patterns to follow |
| 7 | `docs/07-supabase-setup.md` | Commands to get a working Supabase project |
| 8 | `docs/08-glossary.md` | Indian GST and trade terms used throughout |

## Run the prototype

```bash
cd quoteflow
python3 -m http.server 8000     # then open http://localhost:8000
```

`dist/quoteflow.html` is the same app inlined into one file; double-click it to run without a server.
Chart.js, the PDF library and the Inter/Poppins fonts load from CDNs, so charts and PDF export need internet.

## Repository layout

```
index.html              entry point: loads styles.css and the scripts, calls genData() then route()
styles.css              design system, components, light/dark themes, print and PDF-export rules
core.js                 helpers, icons, demo data generator, calcQuote() — the pricing engine
data.js                 the Supabase client and every auth / RPC call (DB.*)
auth.js                 sign-up, login, license key, enterLive() and boot()
live.js                 live workspace: loads S from Supabase and saves every change back
admin.js                platform admin console at #/admin
app.js                  action registry, hash router, app shell, modals, toasts, charts
landing.js              public marketing page
dashboard.js            overview dashboard
quotes.js               quotation list, builder, A4 document, share sheet, client portal
customers.js            customer intelligence and customer detail
modules.js              products, sales pipeline, follow-ups
business.js             templates, invoices/orders screen, reports, settings
docs.js                 invoice page, payments, receipts, challans, credit/debit notes,
                        customer statements, credit limits, audit trail, PDF + WhatsApp
build.py                inlines everything into dist/quoteflow.html
supabase/migrations/    0001 schema · 0002 RBAC and RLS · 0003 business logic · 0004 sign-up and
                        licenses · 0005 platform admin access · 0006 columns and triggers for live.js · 0007 customer portal
docs/                   this documentation
```

## Status

| Area | State |
|------|-------|
| UI for the full document flow | Done, demo data |
| Pricing, GST, round-off, TDS | Done in the frontend; mirrored in SQL |
| PDF download, WhatsApp hand-off | Real |
| Email / SMS sending, payment gateway | Simulated, clearly labelled |
| Sign-up, approval, license key, login | Done (`auth.js`, `admin.js`, migration 0004) |
| Loading and saving a live workspace | Done in `live.js`; needs testing against real data |
| Customer portal without a login | Done: the share link is `#/portal/<share token>`, read through `portal_get` (migration 0007) |
| Role permissions in the screens | Done as a guard: a blocked action explains itself (`ACT_PERM` in `auth.js`); buttons are not hidden |
| Platform admin opening a client's workspace | Done from `#/admin` ("Open workspace") |
| Email / SMS delivery | Still simulated; needs a mail provider and an Edge Function |
| File uploads (logo, attachments) to Storage | Not done; file names are kept, files are not |
