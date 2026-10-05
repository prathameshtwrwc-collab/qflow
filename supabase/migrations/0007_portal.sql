-- =====================================================================
-- QuoteFlow · 0007_portal.sql
-- The customer's share link (#/portal/<token>), opened without a login.
-- Run after 0006_live_sync.sql. Re-runnable.
--
-- portal_get() now returns the full company and customer rows (minus
-- internal fields) instead of a hand-picked subset, plus the
-- salesperson's name. The document on the customer's screen is drawn by
-- the same code as inside the app, and that code needs the round-off
-- setting, state code, bank block and header style to match exactly.
-- The token stays the only key: no token, no data.
-- =====================================================================
create or replace function public.portal_get(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'company', to_jsonb(co) - 'plan' - 'is_active' - 'support_access_until' - 'created_by' - 'notification_prefs',
    'customer', to_jsonb(c) - 'notes' - 'credit_limit' - 'owner_id' - 'created_by' - 'extra',
    'salesperson', (select p.full_name from profiles p where p.id = q.salesperson_id),
    'quotation', to_jsonb(q) - 'share_token' - 'created_by' - 'deleted_at' - 'duplicated_from',
    'items', (select coalesce(jsonb_agg(to_jsonb(i) - 'company_id' order by i.position), '[]'::jsonb)
              from quotation_items i where i.quotation_id = q.id),
    'feedback', (select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]'::jsonb)
                 from quotation_feedback f where f.quotation_id = q.id))
  from quotations q
  join companies co on co.id = q.company_id
  join customers c on c.id = q.customer_id
  where q.share_token = p_token and q.deleted_at is null and q.status <> 'draft' and co.is_active;
$$;

revoke all on function public.portal_get(text) from public;
grant execute on function public.portal_get(text) to anon, authenticated;
