# Supabase setup

## 1. Create the project

Supabase dashboard → New project. Pick a region close to your users (Mumbai for India).
Keep the database password safe; you will not need it day to day.

## 2. Run the migrations

SQL Editor → paste each file in order and run:

1. `supabase/migrations/0001_schema.sql` — enums, 27 tables, indexes
2. `supabase/migrations/0002_rbac.sql` — helpers, provisioning RPCs, RLS policies
3. `supabase/migrations/0003_logic.sql` — numbering, totals, document flow, portal, views, storage, realtime
4. `supabase/migrations/0004_onboarding.sql` — sign-up requests, license keys, the license gate
5. `supabase/migrations/0005_admin_access.sql` — full access for platform admins, delete company
6. `supabase/migrations/0006_live_sync.sql` — `extra` columns and numbering triggers used by `live.js`
7. `supabase/migrations/0007_portal.sql` — what the customer's share link is allowed to read

With the CLI instead:

```bash
supabase link --project-ref <ref>
supabase db push
```

Expect a few `NOTICE: trigger … does not exist, skipping` lines. They are harmless: the
migration drops triggers before creating them so it can be re-run.

## 3. Extensions

Database → Extensions → enable `pg_cron`, then schedule the daily job:

```sql
select cron.schedule('quoteflow-daily', '5 0 * * *', 'select public.daily_housekeeping()');
```

`pgcrypto` and `citext` are created by the migration itself.

## 4. Auth settings

- Email provider on, **sign-ups enabled** and **Confirm email off**. Anyone can request a
  workspace; nothing opens until a platform admin approves it and the owner enters the license key.
- Set the Site URL and the redirect URLs for your app and the client portal.
- Decide on a password policy; the app forces a change on first login anyway.

## 5. Make yourself a platform admin

Create your own account (dashboard → Authentication → Users → Add user), then:

```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'you@yourdomain.com';
```

## 6. Create the first company

Deploy the Edge Function from `docs/04-rbac-and-auth.md` and call it with your platform-admin
JWT, or do it by hand in the SQL editor plus the dashboard's "Add user" button followed by
`admin_attach_member`.

```bash
supabase functions deploy create-company
supabase secrets set SERVICE_ROLE_KEY=<service role key>
```

Hand the customer their email and temporary password through a separate channel. Never email
the password together with the login link.

## 7. Storage

The migration creates three buckets: `logos` (public), `documents` and `invoice-attachments`
(both private). Paths must start with the company id: `<company_id>/<file>`. Policies depend on
that convention, so do not change it without updating them.

## 8. Keys for the frontend

Project Settings → API. The browser gets the **anon** key only. The service role key belongs in
Edge Function secrets and nowhere else.

```js
const SUPABASE_URL = 'https://<ref>.supabase.co';
const SUPABASE_ANON_KEY = '<anon key>';
```

## 9. Smoke test

```sql
-- as a platform admin
select admin_create_company('Test Co', 'Test Co Pvt Ltd', 'services', 'Maharashtra', '27', null);
-- as the company owner, after attaching the seat
insert into customers (company_id, name, company_name, state) values ('<cid>', 'A', 'A Pvt Ltd', 'Maharashtra');
insert into quotations (company_id, customer_id) values ('<cid>', '<customer id>') returning number, valid_until;
-- add an item, then check the totals the trigger wrote
select number, taxable_value, cgst, sgst, igst, round_off_amt, grand_total from quotations;
```

## 10. Backups and safety

- Daily backups are on by default; check the retention your plan gives you.
- Never run `drop schema public cascade` against a live project.
- Test every new migration against a branch or a local `supabase start` first.
