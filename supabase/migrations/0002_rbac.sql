-- =====================================================================
-- QuoteFlow · 0002_rbac.sql
-- Who may see and do what. Run after 0001_schema.sql.
--
-- Two separate worlds:
--   1. Platform admins (platform_admins) create companies and hand the
--      first login to the company owner. They never see business data
--      unless that company turns support access on.
--   2. Company members (company_members) work inside one company only.
--      Their role is checked against role_permissions.
-- There is no self sign-up: accounts are created by a platform admin
-- through the Admin API (see docs/04-rbac-and-auth.md).
-- =====================================================================

-- ------------------------------------------------------------- helpers
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- active member of this company?
create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from company_members
    where company_id = cid and user_id = auth.uid() and status = 'active');
$$;

-- platform admin reading a company that has support access switched on
create or replace function public.has_support_access(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_admin() and exists (
    select 1 from companies c where c.id = cid and c.support_access_until > now());
$$;

-- can read this company's data at all
create or replace function public.can_read(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_member(cid) or has_support_access(cid);
$$;

-- role check. Owners and admins pass everything; others go through the grid.
create or replace function public.can(cid uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from company_members m
    left join role_permissions rp
      on rp.company_id = m.company_id and rp.role = m.role and rp.permission = perm
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active'
      and (m.role in ('owner', 'admin') or coalesce(rp.allowed, false)));
$$;

create or replace function public.my_role(cid uuid)
returns member_role language sql stable security definer set search_path = public as $$
  select role from company_members
  where company_id = cid and user_id = auth.uid() and status = 'active';
$$;

-- The permission keys the app checks. Keep this list and the UI in step.
--   quotes.create quotes.send quotes.delete discount.over10
--   customers.manage products.manage orders.manage challans.manage
--   invoices.manage payments.record notes.manage reports.view
--   settings.manage team.manage

-- ------------------------------------------------- new user -> profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, must_change_password)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.email,
          coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false))
  on conflict (id) do nothing;

  -- attach any seats that were invited by email before the account existed
  update company_members set user_id = new.id, status = 'active'
  where invited_email = new.email and user_id is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------- provisioning (platform admin only)
-- Seeds counters and the permission grid for a new company.
create or replace function public.seed_company_defaults(cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into doc_counters (company_id, kind, prefix, next_no, pad) values
    (cid, 'quotation',   'QT-',   1001, 0),
    (cid, 'order',       'SO-',   1001, 0),
    (cid, 'challan',     'DC-',      1, 4),
    (cid, 'invoice',     'INV-',  1001, 0),
    (cid, 'credit_note', 'CN-',      1, 4),
    (cid, 'debit_note',  'DN-',      1, 4),
    (cid, 'payment',     'RCPT-',    1, 4)
  on conflict do nothing;

  insert into role_permissions (company_id, role, permission, allowed)
  select cid, r.role::member_role, p.perm, p.perm = any (r.perms)
  from (values
    ('admin',           array['quotes.create','quotes.send','quotes.delete','discount.over10','customers.manage','products.manage','orders.manage','challans.manage','invoices.manage','payments.record','notes.manage','reports.view','settings.manage','team.manage']),
    ('sales_manager',   array['quotes.create','quotes.send','quotes.delete','discount.over10','customers.manage','products.manage','orders.manage','challans.manage','invoices.manage','reports.view']),
    ('sales_executive', array['quotes.create','quotes.send','customers.manage','orders.manage','challans.manage']),
    ('accountant',      array['invoices.manage','payments.record','notes.manage','reports.view']),
    ('viewer',          array[]::text[])
  ) as r(role, perms)
  cross join unnest(array['quotes.create','quotes.send','quotes.delete','discount.over10','customers.manage',
    'products.manage','orders.manage','challans.manage','invoices.manage','payments.record','notes.manage',
    'reports.view','settings.manage','team.manage']) as p(perm)
  on conflict do nothing;
end $$;

-- Step 1 of provisioning: create the company shell.
-- Step 2 (creating the owner's auth user) happens in an Edge Function with
-- the service role key, which then calls admin_attach_owner below.
create or replace function public.admin_create_company(
  p_name text, p_legal_name text default null, p_category business_category default 'services',
  p_state text default 'Maharashtra', p_state_code text default '27', p_gstin text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not is_platform_admin() then raise exception 'only a platform admin can create companies'; end if;
  insert into companies (name, legal_name, category, state, state_code, gstin, created_by)
  values (p_name, p_legal_name, p_category, p_state, p_state_code, p_gstin, auth.uid())
  returning id into cid;
  perform seed_company_defaults(cid);
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (cid, 'company', cid, 'Company created', p_name, auth.uid());
  return cid;
end $$;

-- Step 3: give the new user the owner seat (called by the Edge Function).
create or replace function public.admin_attach_member(
  p_company uuid, p_user uuid, p_role member_role default 'owner')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'only a platform admin can attach members'; end if;
  insert into company_members (company_id, user_id, role, status, created_by)
  values (p_company, p_user, p_role, 'active', auth.uid())
  on conflict (company_id, user_id) do update set role = excluded.role, status = 'active';
  update profiles set must_change_password = true where id = p_user;
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (p_company, 'company', p_company, 'Member attached', p_role::text, auth.uid());
end $$;

create or replace function public.admin_set_company_active(p_company uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'only a platform admin can do this'; end if;
  update companies set is_active = p_active where id = p_company;
end $$;

-- A company owner opens a support window; platform admins can read until then.
create or replace function public.grant_support_access(p_company uuid, p_hours int default 24)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if not can(p_company, 'settings.manage') then raise exception 'not allowed'; end if;
  t := now() + make_interval(hours => greatest(1, least(p_hours, 168)));
  update companies set support_access_until = t where id = p_company;
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (p_company, 'company', p_company, 'Support access granted', p_hours || ' hours', auth.uid());
  return t;
end $$;

-- ------------------------------------------------------- enable RLS
do $$
declare t text;
begin
  foreach t in array array['profiles','platform_admins','companies','doc_counters','company_members','role_permissions',
    'customers','products','quotations','quotation_items','quotation_views','quotation_feedback','sales_orders',
    'delivery_challans','challan_items','invoices','invoice_attachments','payments','payment_receipts','credit_notes',
    'debit_notes','leads','follow_ups','customer_notes','communications','document_events','notifications']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ------------------------------- read for members, write for permissions
-- Tables every member may read and write (day-to-day activity).
do $$
declare t text;
begin
  foreach t in array array['communications','leads','follow_ups','document_events','challan_items']
  loop
    execute format('create policy "read" on public.%I for select using (can_read(company_id))', t);
    execute format('create policy "write" on public.%I for insert with check (is_member(company_id))', t);
    execute format('create policy "edit" on public.%I for update using (is_member(company_id)) with check (is_member(company_id))', t);
    execute format('create policy "remove" on public.%I for delete using (is_member(company_id))', t);
  end loop;
end $$;

-- quotation_views and quotation_feedback have no company_id: they hang off the quotation.
-- Rows are written only by the portal functions, which are security definer.
create policy "read" on quotation_views for select
  using (exists (select 1 from quotations q where q.id = quotation_id and can_read(q.company_id)));
create policy "read" on quotation_feedback for select
  using (exists (select 1 from quotations q where q.id = quotation_id and can_read(q.company_id)));

-- helper to write the four standard policies for a permission-gated table
create or replace function public.gate(tbl text, perm text)
returns void language plpgsql as $$
begin
  execute format('create policy "read" on public.%I for select using (can_read(company_id))', tbl);
  execute format('create policy "insert" on public.%I for insert with check (can(company_id, %L))', tbl, perm);
  execute format('create policy "update" on public.%I for update using (can(company_id, %L)) with check (can(company_id, %L))', tbl, perm, perm);
  execute format('create policy "delete" on public.%I for delete using (can(company_id, %L))', tbl, perm);
end $$;

select gate('customers',           'customers.manage');
select gate('customer_notes',      'customers.manage');
select gate('products',            'products.manage');
select gate('quotations',          'quotes.create');
select gate('quotation_items',     'quotes.create');
select gate('sales_orders',        'orders.manage');
select gate('delivery_challans',   'challans.manage');
select gate('invoices',            'invoices.manage');
select gate('invoice_attachments', 'invoices.manage');
select gate('credit_notes',        'notes.manage');
select gate('debit_notes',         'notes.manage');
select gate('payment_receipts',    'payments.record');

-- deleting a quotation needs its own permission
drop policy if exists "delete" on quotations;
create policy "delete" on quotations for delete using (can(company_id, 'quotes.delete'));

-- payments: record only, never edited in place
create policy "read"   on payments for select using (can_read(company_id));
create policy "insert" on payments for insert with check (can(company_id, 'payments.record'));
create policy "delete" on payments for delete using (can(company_id, 'invoices.manage'));

-- ------------------------------------------- company, team, counters
create policy "read" on companies for select using (can_read(id) or is_platform_admin());
create policy "settings" on companies for update
  using (can(id, 'settings.manage') or is_platform_admin())
  with check (can(id, 'settings.manage') or is_platform_admin());
create policy "platform creates" on companies for insert with check (is_platform_admin());

create policy "read" on doc_counters for select using (can_read(company_id));
create policy "settings" on doc_counters for all
  using (can(company_id, 'settings.manage')) with check (can(company_id, 'settings.manage'));

create policy "read" on company_members for select
  using (can_read(company_id) or user_id = auth.uid() or is_platform_admin());
create policy "team" on company_members for all
  using (can(company_id, 'team.manage') or is_platform_admin())
  with check (can(company_id, 'team.manage') or is_platform_admin());

create policy "read" on role_permissions for select using (can_read(company_id));
create policy "settings" on role_permissions for all
  using (can(company_id, 'settings.manage')) with check (can(company_id, 'settings.manage'));

-- ------------------------------------------- profiles, admins, alerts
create policy "self or teammates" on profiles for select using (
  id = auth.uid() or is_platform_admin() or exists (
    select 1 from company_members a join company_members b on a.company_id = b.company_id
    where a.user_id = auth.uid() and a.status = 'active' and b.user_id = profiles.id));
create policy "self update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "platform only" on platform_admins for select using (is_platform_admin());

create policy "own" on notifications for select using (user_id = auth.uid());
create policy "mark read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
