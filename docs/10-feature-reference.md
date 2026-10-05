# Feature reference

What exists today, per screen, so you do not have to read the source to find out.

## Quotation builder

- Customer search; selecting one fills contact, address, GSTIN, payment terms and ship-to,
  and shows their quotation history inline.
- Quotation number (auto), issue date, valid-until, project name, job number, salesperson,
  payment terms (Advance, Due on receipt, Net 7/15/30/45/60, Custom days).
- Business type selector swapping industry fields: contractor (site, materials, labour crew,
  duration), agency (deliverables, milestones, timeline, revisions), wholesale (SKU, bulk
  quantity, shipping), freelancer (hourly rate, hours, schedule).
- Customer PO block (checkbox, number, date, reference) and a separate ship-to address.
- Items: add from catalogue (multi-select with search and category filter), custom item,
  section heading, drag or arrows to reorder, inline delete.
- Item columns come from Settings; the standard set is Qty, Unit, Rate, Disc %, Tax,
  Description, SKU, HSN/SAC.
- Pricing: subtotal, item discounts, overall discount (% or flat), shipping, a named extra
  charge, tax split by rate, cess, round-off toggle, TDS toggle with rate, advance %,
  grand total and amount in words.
- Live A4 preview, template picker, Save draft, Preview, Save & send.

## Quotation document and sharing

- Seven templates. Status stamp for accepted, rejected and expired.
- Actions: send, WhatsApp, edit, PDF, print, client view, duplicate, convert, delete.
- Share sheet: Email tab (To/Cc/Bcc tag inputs, subject, editable body, attachment and link
  toggles, preview), WhatsApp tab (number validation, editable message, live bubble preview,
  opens WhatsApp), More (copy link, PDF, print, SMS, Telegram, device share), History.

## Client portal

Branded page at `#/portal/:id`. Counts the view and moves Sent → Viewed. Accept asks for a
typed signature; Decline asks for a reason; Request changes takes an area and details, logs
feedback, creates a follow-up and moves the lead to Negotiation.

## Invoices and money

- Invoice page: full tax invoice, payment summary with advance and balance, payment history
  table, attachments, audit trail, document relationship strip.
- Record payment: amount, date, nine methods, UTR, cheque number (only for cheque), bank,
  notes, attachment. Generates a numbered receipt with View, Print, PDF, Email, WhatsApp.
- Payment terms and due date editable after the fact; status follows automatically
  (Draft, Sent, Partially paid, Paid, Overdue, Void).
- Reminders by Email, WhatsApp or SMS with an editable professional message.
- Delivery challans, credit notes and debit notes as their own tabs with their own documents.
- Dashboard: total invoiced, collected, outstanding, overdue, due today, due this week,
  partially paid, paid, outstanding by customer, recent payments.

## Customers

Intelligence screen with 10 counters, a 6-step journey, a conversion funnel, 8 segments and a
sortable analytics table. Detail page adds performance cards, quotation history, activity
timeline, notes and follow-ups, insights, credit information (limit, outstanding, available,
status) and a full customer statement with debit/credit/balance rows and export.

## Elsewhere

- **Products**: catalogue with HSN/SAC, cost and margin, plus quoted vs accepted analytics.
- **Pipeline**: 10-stage kanban, drag to move, weighted forecast, win rate, salesperson view.
- **Follow-ups**: queue by status and due date, types, assignment, awaiting response,
  expiring quotations with an Extend action.
- **Reports**: nine reports with shared filters, charts, tables and simulated export.
- **Templates**: gallery with live preview, brand colour, font, header style, footer, terms,
  and "apply to drafts".
- **Settings**: business profile, logo and branding, business category, currency, tax
  (including place of supply and round-off), default terms, item columns, bank details,
  numbering prefixes for all seven document types, team members, roles and permissions,
  notifications, workspace.

## Deliberately not built yet

Proforma invoices, e-way bills, real e-invoicing (IRN), recurring invoices, multi-currency,
inventory and stock, purchase side (vendor bills), payment gateway collection.
