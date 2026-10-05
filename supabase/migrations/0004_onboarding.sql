-- =====================================================================
-- QuoteFlow · 0004_onboarding.sql
-- Self-service sign-up with platform approval and a license key.
-- Run after 0003_logic.sql. Re-runnable.
--
-- Flow:
--   1. A visitor signs up (Supabase Auth) and calls register_company().
--      That creates the company, the owner seat and a 'pending' license.
--   2. A platform admin approves it with a validity in days. A unique
--      license key is generated; the admin hands it over separately.
--   3. The owner enters the key (activate_license). The validity starts
--      counting from that moment.
--   4. Until the license is active, and again once it expires or the
--      company is suspended, members can read and write nothing.
-- =====================================================================

-- ------------------------------------------------------------- license
-- One row per company. Kept out of `companies` on purpose: owners may
-- update their own company row, and must never be able to edit this.
create table if not exists company_licenses (
  company_id    uuid primary key references companies (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  license_key   text unique,
  validity_days int check (validity_days > 0),
  requested_by  uuid references profiles (id),
  requested_at  timestamptz not null default now(),
  decided_by    uuid references profiles (id),
  decided_at    timestamptz,
  reject_reason text,
  activated_at  timestamptz,                      -- when the owner entered the key
  expires_at    timestamptz                       -- activated_at + validity, moved by extensions
);

alter table company_licenses enable row level security;
drop policy if exists "platform only" on company_licenses;
create policy "platform only" on company_licenses for select using (is_platform_admin());
-- no write policies: every change goes through the functions below

-- ------------------------------------------------------------- helpers
-- Is this company allowed to work right now?
create or replace function public.company_open(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from companies c join company_licenses l on l.company_id = c.id
    where c.id = cid and c.is_active
      and l.status = 'approved' and l.activated_at is not null and l.expires_at > now());
$$;

-- Same as 0002, plus the license gate. Every RLS policy goes through these two.
create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select company_open(cid) and exists (
    select 1 from company_members
    where company_id = cid and user_id = auth.uid() and status = 'active');
$$;

create or replace function public.can(cid uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select company_open(cid) and exists (
    select 1 from company_members m
    left join role_permissions rp
      on rp.company_id = m.company_id and rp.role = m.role and rp.permission = perm
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active'
      and (m.role in ('owner', 'admin') or coalesce(rp.allowed, false)));
$$;

-- Owners can update their company row (settings), but not its lifecycle.
-- auth.uid() is null in the SQL editor and for the service role; those pass.
create or replace function public.protect_company_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_platform_admin()
     and (new.is_active is distinct from old.is_active or new.plan is distinct from old.plan) then
    raise exception 'only the platform can change a company''s plan or active state';
  end if;
  return new;
end $$;

drop trigger if exists companies_protect_lifecycle on companies;
create trigger companies_protect_lifecycle before update on companies
  for each row execute function public.protect_company_lifecycle();

-- ------------------------------------------------- sign-up (any user)
-- Called once, right after supabase.auth.signUp, by the new user.
create or replace function public.register_company(
  p_name text, p_full_name text, p_legal_name text default null,
  p_category business_category default 'services',
  p_state text default 'Maharashtra', p_state_code text default '27',
  p_gstin text default null, p_phone text default null, p_city text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first'; end if;
  if is_platform_admin() then raise exception 'a platform admin cannot register a company'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'company name is required'; end if;
  if exists (select 1 from company_members where user_id = uid and status in ('active', 'invited')) then
    raise exception 'this login already has a workspace or a pending request';
  end if;

  update profiles set full_name = coalesce(nullif(trim(p_full_name), ''), full_name) where id = uid;

  insert into companies (name, legal_name, category, state, state_code, gstin, phone, city, email, created_by)
  select trim(p_name), nullif(trim(p_legal_name), ''), p_category, p_state, p_state_code,
         nullif(upper(trim(p_gstin)), ''), nullif(trim(p_phone), ''), nullif(trim(p_city), ''), p.email, uid
  from profiles p where p.id = uid
  returning id into cid;

  perform seed_company_defaults(cid);
  insert into company_members (company_id, user_id, role, status, created_by)
  values (cid, uid, 'owner', 'active', uid);
  insert into company_licenses (company_id, requested_by) values (cid, uid);
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (cid, 'company', cid, 'Workspace requested', trim(p_name), uid);
  return cid;
end $$;

-- Where does the signed-in user stand? The app calls this after every login.
-- state: signed_out | admin | none | pending | rejected | suspended | needs_key | expired | active
create or replace function public.my_workspace()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then return jsonb_build_object('state', 'signed_out'); end if;
  if is_platform_admin() then return jsonb_build_object('state', 'admin'); end if;

  select c.id, c.name, c.is_active, m.role, l.status, l.activated_at, l.expires_at, l.reject_reason
    into r
  from company_members m
  join companies c on c.id = m.company_id
  left join company_licenses l on l.company_id = c.id
  where m.user_id = auth.uid() and m.status = 'active'
  order by m.created_at limit 1;
  if not found then return jsonb_build_object('state', 'none'); end if;

  return jsonb_build_object(
    'company_id', r.id, 'company_name', r.name, 'role', r.role,
    'expires_at', r.expires_at, 'reject_reason', r.reject_reason,
    'state', case
      when r.status is null or r.status = 'pending' then 'pending'
      when r.status = 'rejected' then 'rejected'
      when not r.is_active then 'suspended'
      when r.activated_at is null then 'needs_key'
      when r.expires_at <= now() then 'expired'
      else 'active' end);
end $$;

-- The owner enters the key the platform admin handed over. Validity starts now.
create or replace function public.activate_license(p_key text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare cid uuid; t timestamptz;
begin
  select m.company_id into cid from company_members m
  where m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'admin')
  order by m.created_at limit 1;
  if cid is null then raise exception 'only the workspace owner can enter the license key'; end if;

  update company_licenses
  set activated_at = now(), expires_at = now() + make_interval(days => validity_days)
  where company_id = cid and status = 'approved' and activated_at is null
    and license_key = upper(trim(p_key))
  returning expires_at into t;
  if t is null then raise exception 'that license key is not valid for this workspace'; end if;

  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (cid, 'company', cid, 'License activated', 'valid until ' || to_char(t, 'DD Mon YYYY'), auth.uid());
  return t;
end $$;

-- --------------------------------------------- platform admin only
create or replace function public.admin_list_companies()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'only a platform admin can do this'; end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by coalesce(x.requested_at, x.created_at) desc), '[]'::jsonb)
    from (
      select c.id, c.name, c.legal_name, c.category, c.state, c.city, c.gstin, c.phone, c.is_active, c.created_at,
             coalesce(l.status, 'pending') as status, l.license_key, l.validity_days, l.requested_at,
             l.decided_at, l.activated_at, l.expires_at, l.reject_reason,
             o.full_name as owner_name, o.email as owner_email
      from companies c
      left join company_licenses l on l.company_id = c.id
      left join lateral (
        select p.full_name, p.email from company_members m join profiles p on p.id = m.user_id
        where m.company_id = c.id and m.role = 'owner' order by m.created_at limit 1) o on true
    ) x);
end $$;

-- Approve a request: generates the key and returns it. p_days is the validity.
create or replace function public.admin_approve_company(p_company uuid, p_days int)
returns text language plpgsql security definer set search_path = public as $$
declare k text; raw text;
begin
  if not is_platform_admin() then raise exception 'only a platform admin can do this'; end if;
  if p_days is null or p_days < 1 then raise exception 'validity must be at least 1 day'; end if;
  if exists (select 1 from company_licenses where company_id = p_company and status = 'approved') then
    raise exception 'this company is already approved; extend the license instead';
  end if;

  raw := upper(replace(gen_random_uuid()::text, '-', ''));
  k := 'QF-' || substr(raw, 1, 5) || '-' || substr(raw, 6, 5) || '-' || substr(raw, 11, 5) || '-' || substr(raw, 16, 5);

  insert into company_licenses (company_id, status, license_key, validity_days, decided_by, decided_at)
  values (p_company, 'approved', k, p_days, auth.uid(), now())
  on conflict (company_id) do update
    set status = 'approved', license_key = excluded.license_key, validity_days = excluded.validity_days,
        decided_by = excluded.decided_by, decided_at = excluded.decided_at, reject_reason = null;

  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (p_company, 'company', p_company, 'Workspace approved', p_days || ' days', auth.uid());
  return k;
end $$;

create or replace function public.admin_reject_company(p_company uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'only a platform admin can do this'; end if;
  update company_licenses
  set status = 'rejected', reject_reason = nullif(trim(p_reason), ''), decided_by = auth.uid(), decided_at = now()
  where company_id = p_company and status = 'pending';
  if not found then raise exception 'only a pending request can be rejected'; end if;
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (p_company, 'company', p_company, 'Workspace rejected', coalesce(p_reason, ''), auth.uid());
end $$;

-- Add days. On an active or expired license it moves the expiry (from today if
-- already expired); before activation it adds to the validity still to start.
create or replace function public.admin_extend_license(p_company uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if not is_platform_admin() then raise exception 'only a platform admin can do this'; end if;
  if p_days is null or p_days < 1 then raise exception 'extend by at least 1 day'; end if;
  update company_licenses
  set validity_days = validity_days + p_days,
      expires_at = case when activated_at is null then null
                        else greatest(expires_at, now()) + make_interval(days => p_days) end
  where company_id = p_company and status = 'approved'
  returning expires_at into t;
  if not found then raise exception 'this company has no approved license'; end if;
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (p_company, 'company', p_company, 'License extended', p_days || ' days', auth.uid());
  return t;
end $$;

-- ------------------------------------------------------------- grants
-- Signed-in users only; each function checks who is calling.
revoke all on function
  public.register_company(text, text, text, business_category, text, text, text, text, text),
  public.my_workspace(), public.activate_license(text), public.admin_list_companies(),
  public.admin_approve_company(uuid, int), public.admin_reject_company(uuid, text),
  public.admin_extend_license(uuid, int)
from public, anon;
grant execute on function
  public.register_company(text, text, text, business_category, text, text, text, text, text),
  public.my_workspace(), public.activate_license(text), public.admin_list_companies(),
  public.admin_approve_company(uuid, int), public.admin_reject_company(uuid, text),
  public.admin_extend_license(uuid, int)
to authenticated;
