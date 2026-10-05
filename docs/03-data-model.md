# Data model

Postgres on Supabase. Three migrations in `supabase/migrations/`:
`0001_schema.sql` (tables), `0002_rbac.sql` (roles and row-level security),
`0003_logic.sql` (numbering, totals, document flow, portal, views, storage).

All three have been applied to a clean Postgres 16 and exercised end to end, and `0003` is
re-runnable.

## The one rule

Every business row carries `company_id`. Access is decided by membership of that company.
That single rule gives multi-tenancy, the company switcher and RLS with one helper function.

```
platform_admins ─ creates ─▶ companies ─┬─ company_members ─ profiles ─ auth.users
                                        ├─ doc_counters        (QT-, SO-, DC-, INV-, CN-, DN-, RCPT-)
                                        ├─ role_permissions    (per-role permission grid)
                                        ├─ customers ─┬─ quotations ─ quotation_items
                                        │             │            ├─ quotation_views
                                        │             │            ├─ quotation_feedback
                                        │             │            └─ communications
                                        │             ├─ leads, follow_ups, customer_notes
                                        │             └─ sales_orders ─ delivery_challans ─ challan_items
                                        │                            └─ invoices ─┬─ payments ─ payment_receipts
                                        │                                         ├─ invoice_attachments
                                        │                                         ├─ credit_notes
                                        │                                         └─ debit_notes
                                        ├─ products
                                        ├─ document_events     (audit trail for every document)
                                        └─ notifications
```

## Tables

| Table | One row is | Notes |
|-------|-----------|-------|
| `profiles` | A signed-in person | `id` = `auth.users.id`; `must_change_password` is set when a super admin hands out credentials |
| `platform_admins` | A platform operator | Creates companies; cannot read business data unless support access is open |
| `companies` | A tenant | Profile, GST state, tax defaults, round-off, branding, item-column layout, bank block, plan, `is_active`, `support_access_until` |
| `doc_counters` | Next number for one document kind | Prefix, next number, zero padding |
| `company_members` | A seat | Role and status; a row can exist by email before the user does |
| `role_permissions` | One role × permission switch | Per company, editable in Settings |
| `customers` | A customer | Billing address, optional `ship_to` JSON, GSTIN, credit limit, default payment terms |
| `products` | A catalogue item | SKU, HSN/SAC, price, cost, tax rate, active flag |
| `quotations` | A quotation header | PO fields, job number, ship-to, terms, pricing inputs **and** stored totals |
| `quotation_items` | A line or section heading | `custom` JSON holds user-defined column values; `line_gross/net/tax` are computed |
| `quotation_views` | One portal open | Feeds the view counter |
| `quotation_feedback` | A change request from the portal | |
| `sales_orders` | A confirmed order | One per quotation; carries PO and job number forward |
| `delivery_challans` | A dispatch | Transporter, vehicle, LR, received by, status |
| `challan_items` | A partially dispatched line | Only needed for part deliveries |
| `invoices` | An invoice | Due date from payment terms; `amount_paid` maintained by trigger |
| `invoice_attachments` | A file on an invoice | Customer PO, signed quotation, inspection report… |
| `payments` | Money received | Method, UTR, cheque number, bank, notes, attachment |
| `payment_receipts` | The receipt for a payment | Numbered RCPT- |
| `credit_notes`, `debit_notes` | An adjustment against an invoice | Reason, taxable value, tax, total |
| `leads` | A pipeline card | 10 stages |
| `follow_ups` | A reminder | Type, due date, assignee, status |
| `customer_notes` | A note on a customer | |
| `communications` | One send, view or response | Channel, recipient, subject, message, status |
| `document_events` | An audit entry | `doc_kind` + `doc_id`; never deleted when a document is edited |
| `notifications` | An in-app alert for one member | |

## Design decisions

- **Money is `numeric(14,2)`.** Never float.
- **Totals are stored** on `quotations` and recomputed by trigger whenever items or pricing
  change. Lists and reports read one column instead of summing lines. `recalc_quotation()`
  mirrors `calcQuote()` in `core.js` — if you change one, change both.
- **Item columns are JSON.** The company default lives in `companies.item_columns`; each
  quotation freezes a copy at creation, so changing the default never rewrites a sent document.
  Shape: `{key, label, type: number|text|unit|tax, on, lock?, custom?, mult?}`.
  A custom number column with `mult: true` multiplies into the line amount (Hours × Rate).
- **Industry fields are JSON** (`quotations.industry_fields`) because they vary by trade.
- **Numbers come from `doc_counters`,** one `UPDATE … RETURNING` per call, so two users saving
  at once cannot collide.
- **The customer PO is a reference, never an identity.** It is stored alongside our own numbers
  on the quotation, order and invoice, and printed on each.
- **GST**: `inter_state` is derived from the customer's state versus the company's state;
  CGST+SGST within the state, IGST outside. The HSN summary that the Tally template prints
  comes from `v_hsn_summary`.
- **Soft delete** (`deleted_at`) on customers, products and quotations, because invoices and
  reports point at them.

## Views

| View | Used by |
|------|---------|
| `v_customer_stats` | Customer intelligence table, customer detail cards |
| `v_customer_ledger` | Customer statement (invoices, payments, credit and debit notes) |
| `v_customer_balance` | Outstanding and credit availability |
| `v_product_stats` | Product analytics |
| `v_monthly_summary` | Dashboard chart and monthly report |
| `v_hsn_summary` | GST summary block on documents and the GST report |

All views are `security_invoker`, so RLS applies to whoever queries them.

## Functions you will call from the app

| Function | Purpose |
|----------|---------|
| `next_number(company, kind)` | Issue the next document number |
| `recalc_quotation(id)` | Recompute totals (triggers call it; you rarely do) |
| `send_quotation(id, channel, recipient, cc, bcc, subject, message)` | Log the send, move Draft → Sent, return the share token |
| `portal_get(token)` / `portal_open(token, ua)` / `portal_respond(token, action, …)` | The client portal, callable by `anon` |
| `create_sales_order(quotation, po_number, po_date, po_reference, delivery_date)` | Quotation → sales order |
| `create_invoice(order, issue_date, terms, terms_days, advance_pct)` | Sales order → invoice |
| `daily_housekeeping()` | Expire quotations, mark invoices overdue (schedule with pg_cron) |
| `admin_create_company(...)`, `admin_attach_member(...)`, `admin_set_company_active(...)` | Platform provisioning |
| `grant_support_access(company, hours)` | Company opens a support window for platform admins |
