# Working on QuoteFlow

Read `docs/00-START-HERE.md` before changing anything. It is short and it tells you
where everything lives.

Quick facts:

- The app in the repo root is a **frontend-only prototype**: plain JavaScript, no framework,
  no build step, no bundler. Open `index.html` or serve the folder.
- Signed out, the app is a demo: data is generated in the browser by `genData()` in `core.js`
  and nothing is saved. Signed in with an active license, `live.js` loads the company's data from
  Supabase into the same `S` and saves every change back.
- `supabase/migrations/` holds the schema (0001-0006). Never edit an applied migration; add the
  next number. `docs/05-backend-integration-plan.md` maps `S` to the tables.
- Sending (email, WhatsApp, SMS) and payments are simulated and labelled as such in the UI.
  PDF download and the WhatsApp hand-off are real.

House rules:

- Keep the no-build setup. If you introduce a framework, say so explicitly and update the docs.
- Every new screen goes through the action registry (`A` / `IN` in `app.js`), not inline handlers.
- Money is `numeric(14,2)` in the database and integer-safe arithmetic in the frontend
  (`calcQuote` in `core.js` is the single source of truth for a quotation's totals).
- Never break the tenancy rule: every business row carries `company_id`.
