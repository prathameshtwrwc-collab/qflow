# QuoteFlow

A frontend-only prototype of a quotation and sales management workspace: quotations, customers, products, sales pipeline, follow-ups, invoices, reports and a customer-facing client portal.

**Everything here is a prototype.** There is no backend, database, API, payment processing or authentication. Emails, WhatsApp messages, SMS, PDF downloads and payments are simulated in the interface and labelled as such. All customer and quotation data is generated in the browser at page load and is lost on refresh; only the light/dark preference is stored (in `localStorage`).

## Running it

No build step and no dependencies to install. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Chart.js is loaded from a CDN and the Inter/Poppins fonts from Google Fonts, so the charts and typography need an internet connection.

## Single-file build

`dist/quoteflow.html` is the whole app inlined into one HTML file, which is handy for sharing or hosting. Regenerate it after changing any source file:

```bash
python3 build.py
```

## Documentation

`docs/00-START-HERE.md` is the entry point for anyone (or any AI assistant) picking this up:
product overview, architecture, data model, access control, the backend integration plan,
conventions, Supabase setup, a glossary of Indian GST terms and a feature reference.
The database design lives in `supabase/migrations/`.

## Layout

| File | What's in it |
| --- | --- |
| `index.html` | Entry point: loads the stylesheet and scripts, generates the demo data, starts the router |
| `styles.css` | Design system, all component styles, light and dark themes, print rules |
| `core.js` | Helpers, icon set, seeded random generator, demo data generation, quotation maths |
| `app.js` | Action registry, hash router, app shell, sidebar, top bar, modals, toasts, charts |
| `landing.js` | Public marketing page |
| `dashboard.js` | Overview dashboard: KPI cards and analytics |
| `quotes.js` | Quotation list, builder, A4 document, share modal, client portal |
| `customers.js` | Customer intelligence dashboard and customer detail page |
| `modules.js` | Products and services, sales pipeline, follow-ups |
| `business.js` | Templates and branding, invoices and orders, reports, settings |
| `docs.js` | Invoice page, payments and receipts, delivery challans, credit and debit notes, customer statements, credit limits, audit trail, PDF export and WhatsApp sharing |

Written in plain JavaScript and CSS, with no framework or bundler. Pages render as HTML strings; `data-a` attributes on elements map to handlers in the action registry in `app.js`.

## Demo walkthrough

1. On the landing page, click **Explore demo**.
2. Open **Customers** and pick a customer to see their history.
3. Click **Create quotation**, add items from the catalogue and change quantities; totals and the live preview update as you type.
4. Click **Save & send**, then send by Email or WhatsApp.
5. Choose **Open client view** and accept, decline or request changes as the customer.
6. Back in the app, statuses, dashboard figures and the pipeline have updated. **Convert to invoice** creates the sales order and invoice.
7. Open **Invoices** and click **INV-1050** to follow the full document chain: quotation QT-1025 → customer PO-4587 → sales order SO-1008 → delivery challan DC-0042 → invoice INV-1050 → payments and receipts RCPT-0045/0046.
