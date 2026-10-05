# Access control: super admin, companies, roles

> **Changed by migrations 0004 and 0005.** The flow below this note is the original design and is
> kept for reference. What runs today:
>
> 1. A visitor signs up from the landing page with their company details, email and password
>    (`register_company`). The company is created with a **pending** license.
> 2. A platform admin approves it at `#/admin` and sets a validity in days. That generates a
>    license key (`admin_approve_company`), which the admin hands over separately.
> 3. The owner logs in and enters the key (`activate_license`). The validity starts then.
> 4. A company with no active license, an expired one, or `is_active = false` can read and write
>    nothing (`company_open()` inside `is_member()` and `can()`).
> 5. Platform admins have full read and write on every company (0005). The support-window rule
>    described below no longer limits them.
>
> There is no forced password change, because owners choose their own password. No Edge Function
> or service role key is involved in onboarding.

There is **no self sign-up**. A platform super admin creates the company and the first user,
then shares those credentials with the customer separately (email, phone, in person). The user
signs in and is forced to change the password on first login.

## Two worlds

```
PLATFORM                                   COMPANY (tenant)
platform_admins                            company_members
  · create companies                         · owner / admin / sales_manager
  · create the owner's login                 · sales_executive / accountant / viewer
  · activate or suspend a company            · work only inside their own company
  · see business data ONLY while the
    company has a support window open
```

A platform admin is not a member of any company. By default they can list companies and seats
but cannot read quotations, customers or invoices. A company owner opens a time-boxed window
with `grant_support_access(company_id, hours)`; until it expires, platform admins can read that
company's data. Every grant is written to `document_events`.

## Provisioning a company (three steps)

Step 1 and 3 are SQL functions; step 2 needs the service role key, so it lives in an Edge
Function or a small admin server. Never ship the service role key to a browser.

```ts
// supabase/functions/create-company/index.ts  (Edge Function, service role)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 1. the company shell (counters + permission grid are seeded inside)
const { data: companyId } = await admin.rpc('admin_create_company', {
  p_name: 'Meridian Works',
  p_legal_name: 'Meridian Works Interiors Pvt Ltd',
  p_category: 'contractor',
  p_state: 'Maharashtra',
  p_state_code: '27',
  p_gstin: '27AAJCM4821K1Z6',
});

// 2. the owner's login, with a temporary password you hand over separately
const tempPassword = crypto.randomUUID().slice(0, 12);
const { data: created } = await admin.auth.admin.createUser({
  email: 'owner@meridian.in',
  password: tempPassword,
  email_confirm: true,
  user_metadata: { full_name: 'Aarav Mehta', must_change_password: true },
});

// 3. the owner seat
await admin.rpc('admin_attach_member', {
  p_company: companyId, p_user: created.user.id, p_role: 'owner',
});

return { companyId, email: 'owner@meridian.in', tempPassword };   // show once, never store
```

The caller's JWT must belong to a `platform_admins` row — the RPCs check `is_platform_admin()`
and refuse otherwise.

**First super admin** (run once in the SQL editor after creating your own account):

```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'you@yourdomain.com';
```

## Forced password change

`admin_attach_member` sets `profiles.must_change_password = true`. After sign-in the app checks
it, blocks the workspace behind a change-password screen, calls
`supabase.auth.updateUser({ password })`, then clears the flag.

## Roles and the permission grid

Roles: `owner`, `admin`, `sales_manager`, `sales_executive`, `accountant`, `viewer`.
Owners and admins pass every check. Everyone else is checked against `role_permissions`, which
is seeded per company and editable in Settings → Roles and permissions.

| Permission | Manager | Executive | Accountant | Viewer |
|---|---|---|---|---|
| `quotes.create` (create and edit) | ✓ | ✓ | | |
| `quotes.send` | ✓ | ✓ | | |
| `quotes.delete` | ✓ | | | |
| `discount.over10` (approve >10% discounts) | ✓ | | | |
| `customers.manage` | ✓ | ✓ | | |
| `products.manage` | ✓ | | | |
| `orders.manage` | ✓ | ✓ | | |
| `challans.manage` | ✓ | ✓ | | |
| `invoices.manage` | ✓ | | ✓ | |
| `payments.record` | | | ✓ | |
| `notes.manage` (credit/debit notes) | | | ✓ | |
| `reports.view` | ✓ | | ✓ | |
| `settings.manage` | | | | |
| `team.manage` | | | | |

Everyone who is an active member can **read** their company's data and write day-to-day
activity (communications, leads, follow-ups, audit entries).

## How it is enforced

Four SQL helpers, used by every policy:

| Helper | Meaning |
|--------|---------|
| `is_platform_admin()` | The caller is a platform operator |
| `is_member(company)` | Active seat in that company |
| `has_support_access(company)` | Platform admin **and** the company's support window is open |
| `can_read(company)` | `is_member` or `has_support_access` |
| `can(company, 'perm')` | Role check; owners and admins always pass |

Tables follow one of three patterns: read for members and write for members (activity tables),
read for members and write behind a permission (business documents), or self-only
(`profiles`, `notifications`).

Two rules cannot be expressed as policies because they depend on *what changed*, so they live
in triggers: discounts above 10% need `discount.over10`, and sending needs `quotes.send`
(checked inside `send_quotation`).

## Verified behaviour

The test run against a real database confirms:

- A platform admin creating a company gets counters and the permission grid seeded.
- A sales executive is blocked from a 15% discount, from deleting a quotation and from
  recording a payment, but can quote and sell.
- A user from another company sees **0** quotations, customers and companies.
- Anonymous visitors read **no** tables; the portal works only through the share token, and the
  token is stripped from the JSON the portal returns.
- A platform admin sees the company's data only while the support window is open.
