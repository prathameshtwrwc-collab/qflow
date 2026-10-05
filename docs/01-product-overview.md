# Product overview

QuoteFlow is sold to a company (the tenant). A platform super admin creates the company and
hands over the first login. Inside, a team quotes, sells, delivers, invoices and collects.

## The document flow

```
Lead → Quotation (QT-) → Customer PO (their reference) → Sales order (SO-)
     → Delivery challan (DC-) → Invoice (INV-) → Payment → Receipt (RCPT-)
                                       ↘ Credit note (CN-) / Debit note (DN-)
```

Every document keeps a link back to the one before it, and each screen shows that chain as a
clickable strip. Numbers are issued per company and never reused.

## Screens

| Route | Screen | What it does |
|-------|--------|--------------|
| `#/` | Landing page | Public marketing page, 13 sections, interactive hero |
| `#/app/overview` | Dashboard | 10 KPIs with period comparison, performance chart, status mix, funnel, value pipeline, top customers and products, expiring quotations, follow-ups, activity |
| `#/app/quotations` | Quotations | List with status chips, filters, bulk send, row menu, export |
| `#/app/quotations/new` | Builder | Customer, dates, PO block, job number, payment terms, ship-to, items with custom columns, pricing with GST/round-off/TDS, live A4 preview |
| `#/app/quotations/:id` | Quotation | A4 document in 7 templates, send, WhatsApp, PDF, print, client view, convert, communication history |
| `#/portal/:token` | Client portal | What the customer sees: accept (typed signature), decline (reason), request changes, download |
| `#/app/customers` | Customer intelligence | Counters, 6-step journey, conversion funnel, 8 segments, analytics table |
| `#/app/customers/:id` | Customer | Performance cards, quotation history, timeline, notes, insights, credit limit, statement |
| `#/app/products` | Products & services | Catalogue with HSN/SAC, price, cost, tax, analytics |
| `#/app/pipeline` | Sales pipeline | 10-stage kanban, drag to move, pipeline value, win rate |
| `#/app/followups` | Follow-ups | Queue by due date, types, assignment, awaiting response, expiring quotations |
| `#/app/invoices` | Invoices & orders | Dashboard cards, invoices, sales orders, delivery challans, credit and debit notes, ready-to-invoice |
| `#/app/invoices/:id` | Invoice | Tax invoice, payment summary, payment history, attachments, audit trail, reminders |
| `#/app/reports` | Reports | 9 reports with shared filters, charts and tables |
| `#/app/templates` | Templates | 7 document layouts and branding |
| `#/app/settings` | Settings | Business profile, branding, category, currency, tax, terms, item columns, bank details, numbering, team, roles, notifications |

## Document templates

`minimal`, `corporate`, `creative`, `contractor`, `wholesale`, `service`, and `tally`.

`tally` is a boxed GST tax invoice modelled on Tally's print layout: IRN/Ack header, consignee
and buyer blocks, Sl No. / Description / HSN-SAC / Quantity / Rate / per / Amount columns,
Central Tax and State Tax (or Integrated Tax) rows, round off, amount in words, the HSN summary
with CGST and SGST columns, declaration, bank details and authorised signatory.

## Pricing rules

For each line: `gross = qty × rate × (custom multiplier columns)`, then the line discount.
The overall discount spreads across lines in proportion to their net. Tax applies per line at
its own rate, or at one flat rate if the per-line Tax column is switched off. Shipping and
additional charges carry 18%. Cess applies to the taxable value. The grand total is rounded to
the nearest rupee when round-off is on, and the difference is printed. TDS is reported
separately as "net receivable" and never changes the invoice amount.

Within the company's own state the tax splits into CGST + SGST; for any other state it is IGST.

## What is simulated

Email and SMS sending, payment collection and the IRN/Ack numbers on the Tally template are
demo values. PDF download and WhatsApp sharing are real. The UI says so wherever it matters —
keep that honesty when you extend it.
