# Wiring the prototype to Supabase

> **How it was actually done.** Instead of rewriting each screen, `live.js` keeps the screens on
> `S` and syncs `S` with the database: it loads every table for the company at sign-in, then after
> each user action compares `S` with the last saved copy and writes the new, changed and removed
> rows. Column maps (`M_QUOTE`, `M_INVOICE`, ...) translate between the names in `S` and the
> columns; anything without a column goes in the table's `extra` jsonb (migration 0006). The demo
> generator stays, for signed-out visitors. The mapping tables below are still the reference for
> which field goes where. Known gaps: the anonymous customer portal, Storage uploads, realtime,
> and paging (everything is loaded up front, which is fine for thousands of rows, not millions).

The prototype keeps everything in `S` and calls `rerender()` after each change. The job is to
replace reads with queries and writes with mutations, screen by screen, without changing the UI.

## Suggested shape

Add one file, `data.js`, loaded after `core.js`, holding every Supabase call. Nothing else in
the app should import the client. Keep the function names close to the current globals so the
screens barely change:

```js
// data.js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DB = {
  async loadWorkspace(companyId) {
    const [company, customers, products, quotes] = await Promise.all([
      sb.from('companies').select('*').eq('id', companyId).single(),
      sb.from('customers').select('*').is('deleted_at', null).order('name'),
      sb.from('products').select('*').is('deleted_at', null),
      sb.from('quotations').select('*, quotation_items(*)').is('deleted_at', null)
        .order('issue_date', { ascending: false }).limit(200),
    ]);
    // map snake_case rows into the shapes the screens already use
  },
  saveQuotation(q) { /* upsert header, then items; totals come back from the trigger */ },
  send(qid, channel, to, subject, body) { return sb.rpc('send_quotation', { … }); },
  recordPayment(p) { return sb.from('payments').insert(p).select().single(); },
};
```

Fetch per screen rather than loading everything: the demo's 500 customers were free, real ones
are not.

## Mapping

| Prototype | Replace with |
|-----------|--------------|
| `genData()` | `DB.loadWorkspace()` after sign-in; delete the generator (keep it behind a `?demo=1` flag if you want a sandbox) |
| `S.settings` | `companies` row for the active company |
| `S.customers`, `S.products`, `S.quotes` | Queries, paged and filtered server-side |
| `calcQuote(q)` in save paths | Keep it for the live preview only; after saving items, read the stored totals back |
| `nextNo(kind)` | `next_number(company, kind)` — remove the client-side counters |
| `applyStatus()` | `update quotations set status = …`; triggers handle the lead, audit entry and notification |
| `logSend()` / share sheet | `rpc('send_quotation', …)`; an Edge Function drains `communications` rows with status `queued` |
| `pagePortal` visit and responses | `rpc('portal_open')`, `rpc('portal_get')`, `rpc('portal_respond')` using the token from the URL |
| `A.convertQ` | `rpc('create_sales_order')` then `rpc('create_invoice')` |
| `A.invPay` | insert into `payments`; the trigger updates the invoice and issues the receipt |
| `A.dcNew`, `noteForm` | inserts into `delivery_challans`, `credit_notes`, `debit_notes` (numbers come from triggers) |
| `logAudit()` | insert into `document_events`, or let the triggers do it |
| `statementRows()`, `custFinance()` | `v_customer_ledger`, `v_customer_balance` |
| Product analytics, reports | `v_product_stats`, `v_monthly_summary`, `v_hsn_summary` |
| Settings → Item columns | `update companies set item_columns, item_flat_tax` |
| `S.notifications` | `notifications` + a realtime subscription |

## Field renames

The database uses snake_case and spells things out. Common ones:

| Prototype | Column |
|---|---|
| `q.no`, `q.cid`, `q.sp` | `number`, `customer_id`, `salesperson_id` |
| `q.date`, `q.expiry` | `issue_date`, `valid_until` |
| `q.odisc`, `q.odiscType` | `overall_discount`, `discount_type` |
| `q.ship`, `q.extra`, `q.extraLabel` | `shipping`, `extra_charge`, `extra_label` |
| `q.advance`, `q.total`, `q.views` | `advance_pct`, `grand_total`, `view_count` |
| `q.po.has/no/date/ref` | `po_has`, `po_number`, `po_date`, `po_reference` |
| `q.jobNo`, `q.catFields`, `q.cols` | `job_no`, `industry_fields`, `item_columns` |
| `it.qty`, `it.price`, `it.disc`, `it.cf` | `quantity`, `unit_price`, `discount_pct`, `custom` |
| `c.company`, `c.since`, `c.terms` | `company_name`, `customer_since`, `terms_code` |
| `i.no`, `i.due`, `i.paid` | `number`, `due_date`, `amount_paid` |
| `p.ref`, `p.cheque`, `p.by` | `reference_no`, `cheque_no`, `recorded_by` |

## Order of work

1. **Auth shell** — sign-in page, session handling, forced password change, company switcher
   from `company_members`. Everything else stays on demo data meanwhile.
2. **Read path** — customers, products, quotations list and detail. The UI should not change.
3. **Write path** — quotation builder save, status changes, sending.
4. **Money path** — orders, challans, invoices, payments, receipts, notes.
5. **Portal** — the three RPCs; this is the only anonymous surface, so test it hard.
6. **Edge Functions** — company provisioning, email/WhatsApp delivery, server-side PDF.
7. **Realtime and reports** — subscriptions and the views.
8. **Delete the generator** and the "simulated" labels that no longer apply.

## Things to get right

- **Permissions in the UI mirror the database, they do not replace it.** Hide a button if
  `can()` says no, but assume the database is the real check.
- **Never trust client totals.** Save the inputs; read the totals back.
- **One company at a time.** Keep the active `company_id` in app state and pass it on every
  insert; RLS will reject a mismatch, which is what you want.
- **The share token is a secret.** It is stripped from `portal_get` output; keep it out of logs.
- **Edge Functions hold the service role key.** Nothing in the browser ever does.
