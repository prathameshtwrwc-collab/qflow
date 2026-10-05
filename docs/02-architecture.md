# Frontend architecture

No framework, no build step, no bundler. The scripts load in order and share one global scope
(`core.js → data.js → app.js → landing.js → auth.js → dashboard.js → quotes.js → customers.js →
modules.js → business.js → docs.js → live.js → admin.js`, then `genData(); boot();`).
That is deliberate: the prototype has to open from a file and stay readable.

```
index.html → core.js → app.js → landing.js → dashboard.js → quotes.js
           → customers.js → modules.js → business.js → docs.js → genData(); route();
```

Load order matters. `docs.js` loads last so it can override handlers defined earlier.

## The three mechanisms you need to know

### 1. State: one global object

`S` in `core.js` holds everything: `S.settings`, `S.customers`, `S.quotes`, `S.products`,
`S.orders`, `S.challans`, `S.invoices`, `S.payments`, `S.receipts`, `S.cnotes`, `S.dnotes`,
`S.leads`, `S.followups`, `S.notes`, `S.communications` (per quotation, as `q.comms`),
`S.audit`, `S.notifications`. `genData()` fills it with a seeded random dataset so every
reload looks the same. `QS` holds per-screen view state (filters, page, sort, active tab).

### 2. Rendering: pages return HTML strings

A page function returns `{ html, title, after?, keepScroll? }`. The router writes `html` into
`#page` and calls `after()` for anything that needs the DOM (charts, focus, drag handlers).
There is no virtual DOM and no reactivity: after changing state you call `rerender()`.

### 3. Events: the action registry

Instead of inline handlers, elements carry data attributes:

```html
<button data-a="invPay" data-id="inv-1050">Record payment</button>
<input data-in="bItem" data-idx="0" data-f="qty">
<select data-ch="bItem" data-idx="0" data-f="unit">
```

- `data-a` → click handler in the `A` registry
- `data-in` → input handler in the `IN` registry
- `data-ch` → change handler, also in `IN`

`app.js` has one document-level listener for each. Handlers live beside their screen.

## Routing

Hash based, declared in `app.js` as `[regexp, handler, navKey]`. Adding a screen means adding a
route, a page function and (optionally) a sidebar entry in `NAV`.

## Where each feature lives

| Feature | File | Key functions |
|---------|------|---------------|
| Pricing engine | `core.js` | `calcQuote(q)` — returns lines, taxable, cgst/sgst/igst, cess, roundDiff, grand, tdsAmt |
| Demo data | `core.js` | `genData()`, `buildShowcase()` (the fully linked ABC Industries chain) |
| Numbering | `core.js` | `nextNo(kind)` using the prefixes in `S.settings` |
| Audit trail | `core.js` | `logAudit(docType, docId, action, detail)`, `auditOf()` |
| Shell, router, modals, toasts, charts | `app.js` | `route()`, `rerender()`, `openModal()`, `toast()`, `mkChart()` |
| Quotation document | `quotes.js` | `docHTML(q, opts)` — dispatches to the Tally layout when the template is `tally` |
| Item columns | `core.js` + `quotes.js` | `BASE_COLS`, `qCols(q)`, `colOn()`, `itemLayout()` |
| Share sheet | `quotes.js` | `openShare()`, `A.shSendEmail`, `A.shSendWA` |
| Client portal | `quotes.js` | `pagePortal()`, `A.pAccept`, `A.pReject`, `A.pChanges` |
| Invoice document | `docs.js` | `invoiceDoc(i)`, `tallyDoc(q, {inv})` |
| Payments and receipts | `docs.js` | `A.invPay`, `A.rcptView`, `syncInvoice()` |
| Challans, credit/debit notes | `docs.js` | `dcTable()`, `A.dcNew`, `noteForm()` |
| Statements and credit | `docs.js` | `statementRows()`, `custFinance()`, `creditPanel()` |
| PDF and WhatsApp | `docs.js` | `downloadPdf()`, `openWhatsApp()`, `saveFile()` |

## PDF export

`downloadPdf(html, filename)` loads html2pdf from a CDN on first use, renders the document in an
off-screen stage (`.pdf-stage`, anchored to the document so scrolling cannot break the capture),
converts to A4 and saves. It falls back to the print dialog if the library cannot load.
`.pdf-export` carries the export styles because the library clones the node out of the stage.

## Styling

One stylesheet with CSS custom properties. Light and dark themes are token sets on `:root` and
`[data-theme]`. Components are flat class names (`.panel`, `.tbl`, `.btn`, `.kpi`, `.doc`).
Document templates are `.doc.t-<template>` variants; the Tally layout is `.doc.ty` with its own
block (`.ty-grid`, `.ty-items`, `.ty-hsn`).
