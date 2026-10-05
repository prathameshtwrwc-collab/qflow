# Supabase

```
migrations/
  0001_schema.sql   enums, 27 tables, indexes
  0002_rbac.sql     helpers, provisioning RPCs, row-level security
  0003_logic.sql    numbering, totals, document flow, portal, views, storage, realtime
```

Run them in order. See `docs/07-supabase-setup.md` for the full walkthrough and
`docs/04-rbac-and-auth.md` for how companies and logins are created.

All three have been applied to a clean Postgres 16 and exercised end to end:
company provisioning, quotation with GST and round-off, the client portal as an anonymous
visitor, order → challan → invoice, part and full payment with receipts, a credit note,
the customer ledger, role limits and tenant isolation. `0003` is safe to re-run.

Known notices on a re-run (`trigger … does not exist, skipping`) are expected.
