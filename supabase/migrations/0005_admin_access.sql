-- =====================================================================
-- QuoteFlow · 0005_admin_access.sql
-- Platform admins get full read and write on every company, and can
-- delete a company. Run after 0004_onboarding.sql. Re-runnable.
--
-- This replaces the "support window" rule from 0002: a platform admin no
-- longer needs a company to open access first. The license gate from
-- 0004 still applies to everyone else.
-- =====================================================================

create or replace function public.can_read(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_admin() or is_member(cid) or has_support_access(cid);
$$;

create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_admin() or (company_open(cid) and exists (
    select 1 from company_members
    where company_id = cid and user_id = auth.uid() and status = 'active'));
$$;

create or replace function public.can(cid uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_admin() or (company_open(cid) and exists (
    select 1 from company_members m
    left join role_permissions rp
      on rp.company_id = m.company_id and rp.role = m.role and rp.permission = perm
    where m.company_id = cid and m.user_id = auth.uid() and m.status = 'active'
      and (m.role in ('owner', 'admin') or coalesce(rp.allowed, false))));
$$;

-- Removes the company and everything that hangs off it (cascade).
-- The owner's login stays; it simply has no workspace any more.
create or replace function public.admin_delete_company(p_company uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'only a platform admin can do this'; end if;
  delete from companies where id = p_company;
  if not found then raise exception 'company not found'; end if;
end $$;

revoke all on function public.admin_delete_company(uuid) from public, anon;
grant execute on function public.admin_delete_company(uuid) to authenticated;
