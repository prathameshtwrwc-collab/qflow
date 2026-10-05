-- =====================================================================
-- QuoteFlow · 0003_logic.sql
-- Numbering, totals, document flow, portal, payments, views, storage.
-- Run after 0002_rbac.sql.
-- =====================================================================

-- --------------------------------------------------- document numbers
-- One UPDATE per call takes a row lock, so two users never get the same number.
create or replace function public.next_number(cid uuid, p_kind doc_kind)
returns text language plpgsql security definer set search_path = public as $$
declare pre text; n int; p int;
begin
  update doc_counters set next_no = next_no + 1
  where company_id = cid and kind = p_kind
  returning prefix, next_no - 1, pad into pre, n, p;
  if pre is null then raise exception 'no counter for % in this company', p_kind; end if;
  return pre || case when p > 0 then lpad(n::text, p, '0') else n::text end;
end $$;

create or replace function public.term_days(p_code terms_code, p_days int default null)
returns int language sql immutable as $$
  select case p_code
    when 'advance' then 0 when 'receipt' then 0
    when 'net7' then 7 when 'net15' then 15 when 'net30' then 30
    when 'net45' then 45 when 'net60' then 60
    else coalesce(p_days, 0) end;
$$;

-- --------------------------------------------------- quotation defaults
create or replace function public.quotation_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
declare co companies; cu customers;
begin
  select * into co from companies where id = new.company_id;
  select * into cu from customers where id = new.customer_id;
  if coalesce(new.number, '') = '' then new.number := next_number(new.company_id, 'quotation'); end if;
  if new.valid_until is null then new.valid_until := new.issue_date + co.validity_days; end if;
  if new.item_columns = '[]'::jsonb then new.item_columns := co.item_columns; end if;
  if new.flat_tax is null then new.flat_tax := coalesce(co.item_flat_tax, co.default_tax); end if;
  new.terms_code    := coalesce(new.terms_code, cu.terms_code, co.default_terms_code);
  new.terms         := coalesce(new.terms, co.terms);
  new.payment_terms := coalesce(new.payment_terms, co.payment_terms);
  new.template      := coalesce(nullif(new.template, ''), co.template);
  new.category      := coalesce(new.category, co.category);
  new.created_by    := coalesce(new.created_by, auth.uid());
  if new.ship_same and cu.ship_same = false then new.ship_same := false; new.ship_to := cu.ship_to; end if;
  return new;
end $$;

drop trigger if exists quotations_defaults on quotations;
create trigger quotations_defaults
 before insert on quotations
  for each row execute function public.quotation_defaults();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists quotations_touch on quotations;
create trigger quotations_touch
 before update on quotations
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------- totals
-- Mirrors calcQuote() in the frontend. The frontend may preview, the
-- database decides. Order of operations:
--   line gross = qty x rate x (custom multiplier columns)
--   line net   = gross - line discount
--   overall discount spreads across lines in proportion to their net
--   tax per line on the discounted net; shipping and extra charges at 18%
--   cess on the taxable value, then round off, then TDS (reported only)
create or replace function public.col_on(cols jsonb, k text)
returns boolean language sql immutable as $$
  select exists (select 1 from jsonb_array_elements(cols) c
                 where c->>'key' = k and coalesce((c->>'on')::boolean, false));
$$;

create or replace function public.recalc_quotation(qid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  q quotations; co companies; cu customers; cols jsonb; mult_keys text[];
  gross_sum numeric := 0; net_sum numeric := 0; od numeric := 0; factor numeric := 1;
  line_tax_sum numeric := 0; charges numeric := 0; charge_tax numeric := 0;
  taxable numeric := 0; cess_amt numeric := 0; tax_all numeric := 0;
  inter boolean; grand numeric; rounded numeric; rdiff numeric; do_round boolean;
begin
  select * into q from quotations where id = qid for update;
  if not found then return; end if;
  select * into co from companies where id = q.company_id;
  select * into cu from customers where id = q.customer_id;
  cols := q.item_columns;

  select coalesce(array_agg(c->>'key'), '{}') into mult_keys
  from jsonb_array_elements(cols) c
  where coalesce((c->>'custom')::boolean, false) and coalesce((c->>'on')::boolean, false)
    and c->>'type' = 'number' and coalesce((c->>'mult')::boolean, false);

  with x as (
    select it.id,
      (case when col_on(cols, 'qty') then it.quantity else 1 end) * it.unit_price *
      coalesce((select exp(sum(ln(greatest(coalesce(nullif(it.custom->>k, '')::numeric, 1), 0.000001))))
                from unnest(mult_keys) k), 1) as gross,
      case when col_on(cols, 'disc') then it.discount_pct else 0 end as disc
    from quotation_items it where it.quotation_id = qid and it.kind = 'item'
  ), u as (
    update quotation_items i
       set line_gross = round(x.gross, 2),
           line_net   = round(x.gross * (1 - x.disc / 100), 2)
    from x where i.id = x.id
    returning x.gross as g, i.line_net as n
  )
  select coalesce(sum(g), 0), coalesce(sum(n), 0) into gross_sum, net_sum from u;

  od := case when q.discount_type = 'pct' then net_sum * q.overall_discount / 100
             else least(q.overall_discount, net_sum) end;
  factor := case when net_sum > 0 then (net_sum - od) / net_sum else 0 end;

  update quotation_items set line_tax = round(line_net * factor *
      (case when col_on(cols, 'tax') then tax_rate else coalesce(q.flat_tax, 0) end) / 100, 2)
  where quotation_id = qid and kind = 'item';

  select coalesce(sum(line_tax), 0) into line_tax_sum
  from quotation_items where quotation_id = qid and kind = 'item';

  charges    := q.shipping + q.extra_charge;
  charge_tax := round(charges * 0.18, 2);
  taxable    := net_sum - od + charges;
  cess_amt   := round(taxable * q.cess_rate / 100, 2);
  tax_all    := line_tax_sum + charge_tax + cess_amt;
  inter      := coalesce(cu.state, co.state) is distinct from co.state;

  grand   := taxable + tax_all;
  do_round := coalesce(q.round_off, co.round_off);
  rounded := case when do_round then round(grand) else round(grand, 2) end;
  rdiff   := round(rounded - grand, 2);

  update quotations set
    subtotal         = round(gross_sum, 2),
    item_discount    = round(gross_sum - net_sum, 2),
    overall_disc_amt = round(od, 2),
    taxable_value    = round(taxable, 2),
    cess             = cess_amt,
    tax_total        = round(tax_all, 2),
    cgst             = case when inter then 0 else round((tax_all - cess_amt) / 2, 2) end,
    sgst             = case when inter then 0 else round((tax_all - cess_amt) / 2, 2) end,
    igst             = case when inter then round(tax_all - cess_amt, 2) else 0 end,
    inter_state      = inter,
    round_off_amt    = rdiff,
    grand_total      = rounded,
    tds_amount       = case when q.tds_on then round(taxable * q.tds_rate / 100, 2) else 0 end,
    tax_breakdown    = (
      select coalesce(jsonb_agg(jsonb_build_object('rate', rate, 'taxable', taxable_v, 'tax', tax) order by rate), '[]'::jsonb)
      from (select case when col_on(cols, 'tax') then tax_rate else coalesce(q.flat_tax, 0) end as rate,
                   round(sum(line_net * factor), 2) as taxable_v, sum(line_tax) as tax
            from quotation_items where quotation_id = qid and kind = 'item' group by 1) t)
  where id = qid;
end $$;

create or replace function public.items_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op <> 'DELETE' and new.discount_pct > 10 and not can(new.company_id, 'discount.over10') then
    raise exception 'Discounts above 10%% need approval (discount.over10)';
  end if;
  perform recalc_quotation(coalesce(new.quotation_id, old.quotation_id));
  return null;
end $$;

drop trigger if exists quotation_items_recalc on quotation_items;
create trigger quotation_items_recalc
  after insert or delete or update of quantity, unit_price, discount_pct, tax_rate, custom, kind
  on quotation_items for each row execute function public.items_changed();

create or replace function public.pricing_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.discount_type = 'pct' and new.overall_discount > 10 and not can(new.company_id, 'discount.over10') then
    raise exception 'Discounts above 10%% need approval (discount.over10)';
  end if;
  perform recalc_quotation(new.id);
  return null;
end $$;

drop trigger if exists quotations_recalc on quotations;
create trigger quotations_recalc
  after update of overall_discount, discount_type, shipping, extra_charge, item_columns,
                  flat_tax, cess_rate, round_off, tds_on, tds_rate, customer_id
  on quotations for each row execute function public.pricing_changed();

-- --------------------------------------- status side effects + audit
create or replace function public.quotation_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare prefs jsonb;
begin
  update leads set
    stage = case new.status when 'draft' then 'created' when 'sent' then 'sent' when 'viewed' then 'viewed'
                            when 'accepted' then 'accepted' when 'rejected' then 'rejected'
                            else 'negotiation' end::lead_stage,
    value = new.grand_total, last_activity_at = now()
  where quotation_id = new.id and stage <> 'converted';

  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (new.company_id, 'quotation', new.id, 'Status changed to ' || new.status,
          coalesce(new.rejection_reason, ''), auth.uid());

  select notification_prefs into prefs from companies where id = new.company_id;
  if new.status in ('accepted', 'rejected', 'viewed')
     and coalesce((prefs->>new.status::text)::boolean, true) and new.salesperson_id is not null then
    insert into notifications (company_id, user_id, kind, title, body, link)
    values (new.company_id, new.salesperson_id, new.status::text,
            new.number || ' ' || new.status::text, coalesce(new.rejection_reason, new.project),
            '/app/quotations/' || new.id);
  end if;
  return null;
end $$;

drop trigger if exists quotations_status on quotations;
create trigger quotations_status
 after update of status on quotations
  for each row when (old.status is distinct from new.status)
  execute function public.quotation_status_changed();

-- ------------------------------------------------------- sending
-- Writes the communication row and flips Draft -> Sent. An Edge Function
-- picks up rows with status 'queued' and does the actual delivery.
create or replace function public.send_quotation(
  qid uuid, p_channel comm_channel, p_recipient text,
  p_cc text[] default null, p_bcc text[] default null,
  p_subject text default null, p_message text default null)
returns text language plpgsql security definer set search_path = public as $$
declare q quotations;
begin
  select * into q from quotations where id = qid;
  if not found or not can(q.company_id, 'quotes.send') then raise exception 'not allowed'; end if;
  insert into communications (company_id, quotation_id, customer_id, channel, event, recipient, cc, bcc, subject, message, status, actor_id)
  values (q.company_id, qid, q.customer_id, p_channel,
          case p_channel when 'email' then 'Email sent' when 'whatsapp' then 'WhatsApp share' else 'Link shared' end,
          p_recipient, p_cc, p_bcc, p_subject, p_message,
          (case when p_channel in ('email', 'sms') then 'queued' else 'done' end)::comm_status, auth.uid());
  update quotations set status = 'sent', sent_at = coalesce(sent_at, now())
  where id = qid and status = 'draft';
  return q.share_token;
end $$;

-- --------------------------------------------- client portal (no login)
create or replace function public.portal_get(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'company', jsonb_build_object('name', co.name, 'legal_name', co.legal_name, 'tagline', co.tagline,
                 'email', co.email, 'phone', co.phone, 'address', co.address, 'city', co.city, 'state', co.state,
                 'gstin', co.gstin, 'logo_path', co.logo_path, 'brand_color', co.brand_color, 'font', co.font,
                 'currency', co.currency, 'tax_label', co.tax_label, 'footer_text', co.footer_text,
                 'template', coalesce(q.template, co.template)),
    'customer', jsonb_build_object('name', c.name, 'company', c.company_name, 'email', c.email, 'phone', c.phone,
                 'address', c.address, 'city', c.city, 'state', c.state, 'pin', c.pin, 'gstin', c.gstin),
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

create or replace function public.portal_open(p_token text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare q quotations;
begin
  select * into q from quotations where share_token = p_token and deleted_at is null and status <> 'draft';
  if not found then return; end if;
  insert into quotation_views (quotation_id, user_agent) values (q.id, p_user_agent);
  update quotations set view_count = view_count + 1,
    first_viewed_at = coalesce(first_viewed_at, now()), last_viewed_at = now(),
    status = case when status = 'sent' then 'viewed'::quote_status else status end
  where id = q.id;
  insert into communications (company_id, quotation_id, customer_id, channel, event, status)
  values (q.company_id, q.id, q.customer_id, 'portal', 'Customer viewed quotation', 'done');
end $$;

-- p_action: accept | reject | changes
create or replace function public.portal_respond(p_token text, p_action text,
  p_name text default null, p_reason text default null, p_area text default null, p_message text default null)
returns quote_status language plpgsql security definer set search_path = public as $$
declare q quotations;
begin
  select * into q from quotations where share_token = p_token and deleted_at is null
    and status in ('sent', 'viewed') and valid_until >= current_date;
  if not found then raise exception 'This quotation can no longer be answered'; end if;

  if p_action = 'accept' then
    if coalesce(trim(p_name), '') = '' then raise exception 'Type your name to sign'; end if;
    update quotations set status = 'accepted', responded_at = now(), accepted_by_name = p_name where id = q.id;
  elsif p_action = 'reject' then
    update quotations set status = 'rejected', responded_at = now(), rejection_reason = p_reason where id = q.id;
  elsif p_action = 'changes' then
    insert into quotation_feedback (quotation_id, area, message, author_name)
    values (q.id, p_area, p_message, p_name);
    insert into follow_ups (company_id, customer_id, quotation_id, type, note, due_date, assigned_to)
    values (q.company_id, q.customer_id, q.id, 'call',
            'Change request: ' || coalesce(p_area, '') || ' - ' || coalesce(p_message, ''),
            current_date, q.salesperson_id);
    update leads set stage = 'negotiation', last_activity_at = now() where quotation_id = q.id;
  else
    raise exception 'unknown action %', p_action;
  end if;

  insert into communications (company_id, quotation_id, customer_id, channel, event, recipient, message, status)
  values (q.company_id, q.id, q.customer_id, 'portal',
          case p_action when 'accept' then 'Customer accepted quotation'
                        when 'reject' then 'Customer rejected quotation'
                        else 'Customer requested changes' end,
          p_name, coalesce(p_reason, p_message), 'done');
  return (select status from quotations where id = q.id);
end $$;

revoke all on function public.portal_get(text), public.portal_open(text, text),
  public.portal_respond(text, text, text, text, text, text) from public;
grant execute on function public.portal_get(text), public.portal_open(text, text),
  public.portal_respond(text, text, text, text, text, text) to anon, authenticated;

-- ----------------------------------- quotation -> order -> challan -> invoice
create or replace function public.create_sales_order(qid uuid, p_po_number text default null,
  p_po_date date default null, p_po_reference text default null, p_delivery_date date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare q quotations; oid uuid;
begin
  select * into q from quotations where id = qid for update;
  if not found or not can(q.company_id, 'orders.manage') then raise exception 'not allowed'; end if;
  if exists (select 1 from sales_orders where quotation_id = qid) then raise exception 'Already converted'; end if;
  update quotations set status = 'accepted', responded_at = coalesce(responded_at, now())
  where id = qid and status in ('sent', 'viewed');
  if p_po_number is not null then
    update quotations set po_has = true, po_number = p_po_number, po_date = p_po_date, po_reference = p_po_reference
    where id = qid;
    select * into q from quotations where id = qid;
  end if;
  insert into sales_orders (company_id, number, quotation_id, customer_id, order_date, delivery_date,
    salesperson_id, po_has, po_number, po_date, po_reference, job_no, terms_code, ship_to, amount, created_by)
  values (q.company_id, next_number(q.company_id, 'order'), qid, q.customer_id, current_date, p_delivery_date,
    q.salesperson_id, q.po_has, q.po_number, q.po_date, q.po_reference, q.job_no, q.terms_code, q.ship_to,
    q.grand_total, auth.uid())
  returning id into oid;
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (q.company_id, 'order', oid, 'Sales order created', 'From ' || q.number, auth.uid());
  update leads set stage = 'accepted', last_activity_at = now() where quotation_id = qid;
  return oid;
end $$;

create or replace function public.create_invoice(p_order uuid, p_issue_date date default current_date,
  p_terms terms_code default null, p_terms_days int default null, p_advance_pct numeric default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare o sales_orders; q quotations; iid uuid; code terms_code; days int;
begin
  select * into o from sales_orders where id = p_order for update;
  if not found or not can(o.company_id, 'invoices.manage') then raise exception 'not allowed'; end if;
  if exists (select 1 from invoices where order_id = p_order) then raise exception 'Invoice already exists'; end if;
  select * into q from quotations where id = o.quotation_id;
  code := coalesce(p_terms, o.terms_code);
  days := term_days(code, p_terms_days);
  insert into invoices (company_id, number, quotation_id, order_id, challan_id, customer_id, issue_date, due_date,
    terms_code, terms_days, po_has, po_number, po_date, po_reference, job_no, amount, advance_pct, status, created_by)
  values (o.company_id, next_number(o.company_id, 'invoice'), o.quotation_id, o.id,
    (select id from delivery_challans where order_id = o.id order by created_at limit 1),
    o.customer_id, p_issue_date, p_issue_date + days, code, days,
    o.po_has, o.po_number, o.po_date, o.po_reference, o.job_no, coalesce(q.grand_total, o.amount),
    p_advance_pct, 'draft', auth.uid())
  returning id into iid;
  insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
  values (o.company_id, 'invoice', iid, 'Invoice created', 'From ' || o.number, auth.uid());
  update leads set stage = 'converted', last_activity_at = now() where quotation_id = o.quotation_id;
  return iid;
end $$;

-- numbers for challans and notes
create or replace function public.set_doc_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare k doc_kind;
begin
  k := case tg_table_name when 'delivery_challans' then 'challan'
                          when 'credit_notes' then 'credit_note'
                          when 'debit_notes' then 'debit_note' end::doc_kind;
  if coalesce(new.number, '') = '' then new.number := next_number(new.company_id, k); end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;

drop trigger if exists challan_number on delivery_challans;
create trigger challan_number
 before insert on delivery_challans
  for each row execute function public.set_doc_number();
drop trigger if exists cn_number on credit_notes;
create trigger cn_number
 before insert on credit_notes
  for each row execute function public.set_doc_number();
drop trigger if exists dn_number on debit_notes;
create trigger dn_number
 before insert on debit_notes
  for each row execute function public.set_doc_number();

create or replace function public.note_totals()
returns trigger language plpgsql as $$
begin
  new.tax_amount := round(new.taxable_value * new.tax_rate / 100, 2);
  new.total := round(new.taxable_value + new.tax_amount, 2);
  return new;
end $$;

drop trigger if exists cn_totals on credit_notes;
create trigger cn_totals
 before insert or update on credit_notes
  for each row execute function public.note_totals();
drop trigger if exists dn_totals on debit_notes;
create trigger dn_totals
 before insert or update on debit_notes
  for each row execute function public.note_totals();

-- --------------------------------------------- payments and receipts
create or replace function public.payment_recorded()
returns trigger language plpgsql security definer set search_path = public as $$
declare iid uuid; paid numeric; inv invoices;
begin
  iid := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(amount), 0) into paid from payments where invoice_id = iid;
  select * into inv from invoices where id = iid;
  update invoices set amount_paid = paid,
    status = case
      when status = 'void' then 'void'
      when paid >= inv.amount then 'paid'
      when paid > 0 and due_date < current_date then 'overdue'
      when paid > 0 then 'partially_paid'
      when status = 'draft' then 'draft'
      when due_date < current_date then 'overdue'
      else status end::invoice_status
  where id = iid;

  if tg_op = 'INSERT' then
    insert into payment_receipts (company_id, payment_id, number, issued_on)
    values (new.company_id, new.id, next_number(new.company_id, 'payment'), new.paid_on);
    insert into document_events (company_id, doc_kind, doc_id, action, detail, actor_id)
    values (new.company_id, 'invoice', iid, 'Payment recorded',
            new.amount::text || ' via ' || new.method::text || coalesce(' · ' || new.reference_no, ''), auth.uid());
  end if;
  return null;
end $$;

drop trigger if exists payments_sync on payments;
create trigger payments_sync
 after insert or update or delete on payments
  for each row execute function public.payment_recorded();

-- ---------------------------------------------------- daily maintenance
create or replace function public.daily_housekeeping()
returns void language sql security definer set search_path = public as $$
  update quotations set status = 'expired'
  where status in ('sent', 'viewed') and valid_until < current_date and deleted_at is null;
  update invoices set status = 'overdue'
  where status in ('sent', 'partially_paid') and due_date < current_date and amount_paid < amount;
$$;
-- enable pg_cron in the dashboard, then:
-- select cron.schedule('quoteflow-daily', '5 0 * * *', 'select public.daily_housekeeping()');

-- ------------------------------------------------------------- views
create or replace view public.v_customer_stats with (security_invoker = true) as
select c.id as customer_id, c.company_id, c.name, c.company_name, c.owner_id, c.customer_since, c.credit_limit,
  count(q.id)                                                         as total_quotes,
  count(q.id) filter (where q.status = 'accepted')                    as accepted,
  count(q.id) filter (where q.status = 'rejected')                    as rejected,
  count(q.id) filter (where q.status in ('sent', 'viewed'))           as pending,
  count(q.id) filter (where q.status = 'expired')                     as expired,
  coalesce(sum(q.grand_total), 0)                                     as total_value,
  coalesce(sum(q.grand_total) filter (where q.status = 'accepted'), 0) as accepted_value,
  round(100.0 * count(q.id) filter (where q.status = 'accepted')
        / nullif(count(q.id) filter (where q.status in ('accepted', 'rejected')), 0), 1) as conversion_pct,
  max(q.issue_date)                                                   as last_quote_date
from customers c
left join quotations q on q.customer_id = c.id and q.deleted_at is null and q.status <> 'draft'
where c.deleted_at is null
group by c.id;

-- Ledger used by the customer statement screen.
create or replace view public.v_customer_ledger with (security_invoker = true) as
select company_id, customer_id, doc_date, doc_no, label, debit, credit from (
  select i.company_id, i.customer_id, i.issue_date as doc_date, i.number as doc_no,
         'Invoice'::text as label, i.amount as debit, 0::numeric as credit
  from invoices i where i.status not in ('draft', 'void')
  union all
  select p.company_id, p.customer_id, p.paid_on, coalesce(r.number, 'PAY'), 'Payment · ' || p.method::text, 0, p.amount
  from payments p left join payment_receipts r on r.payment_id = p.id
  union all
  select n.company_id, n.customer_id, n.note_date, n.number, 'Credit note · ' || n.reason, 0, n.total
  from credit_notes n
  union all
  select n.company_id, n.customer_id, n.note_date, n.number, 'Debit note · ' || n.reason, n.total, 0
  from debit_notes n) t;

create or replace view public.v_customer_balance with (security_invoker = true) as
select company_id, customer_id,
  sum(debit) as total_debit, sum(credit) as total_credit,
  greatest(sum(debit) - sum(credit), 0) as outstanding
from v_customer_ledger group by company_id, customer_id;

create or replace view public.v_product_stats with (security_invoker = true) as
select p.id as product_id, p.company_id, p.name, p.category, p.hsn,
  count(distinct i.quotation_id)                                       as times_quoted,
  coalesce(sum(i.line_net), 0)                                         as quoted_value,
  coalesce(sum(i.line_net) filter (where q.status = 'accepted'), 0)     as accepted_value,
  round(100.0 * count(distinct q.id) filter (where q.status = 'accepted')
        / nullif(count(distinct q.id) filter (where q.status in ('accepted', 'rejected')), 0), 1) as win_rate_pct,
  round(100.0 * (p.price - p.cost_price) / nullif(p.price, 0), 1)       as margin_pct
from products p
left join quotation_items i on i.product_id = p.id
left join quotations q on q.id = i.quotation_id and q.deleted_at is null
where p.deleted_at is null
group by p.id;

create or replace view public.v_monthly_summary with (security_invoker = true) as
select company_id, date_trunc('month', issue_date)::date as month,
  count(*)                                            as created,
  count(*) filter (where sent_at is not null)         as sent,
  count(*) filter (where first_viewed_at is not null) as viewed,
  count(*) filter (where status = 'accepted')         as accepted,
  count(*) filter (where status = 'rejected')         as rejected,
  sum(grand_total)                                    as quoted_value,
  sum(grand_total) filter (where status = 'accepted') as accepted_value
from quotations where deleted_at is null
group by company_id, 2;

-- GST summary per HSN, the figures the Tally-style template prints.
create or replace view public.v_hsn_summary with (security_invoker = true) as
with per_q as (
  select quotation_id, sum(line_net) as net_sum
  from quotation_items where kind = 'item' group by quotation_id
)
select q.company_id, q.id as quotation_id, i.hsn, i.tax_rate,
  round(sum(i.line_net) * case when p.net_sum > 0 then (p.net_sum - q.overall_disc_amt) / p.net_sum else 1 end, 2) as taxable_value,
  round(sum(i.line_tax), 2) as tax_amount
from quotations q
join quotation_items i on i.quotation_id = q.id and i.kind = 'item'
join per_q p on p.quotation_id = q.id
group by q.company_id, q.id, i.hsn, i.tax_rate, p.net_sum, q.overall_disc_amt;

-- ------------------------------------------------------------ storage
insert into storage.buckets (id, name, public) values
  ('logos', 'logos', true),
  ('documents', 'documents', false),
  ('invoice-attachments', 'invoice-attachments', false)
on conflict (id) do nothing;

-- path convention: <company_id>/<rest>
drop policy if exists "logos read" on storage.objects;
create policy "logos read"   on storage.objects for select to authenticated
  using (bucket_id = 'logos');
drop policy if exists "logos write" on storage.objects;
create policy "logos write"  on storage.objects for all to authenticated
  using (bucket_id = 'logos' and can(((storage.foldername(name))[1])::uuid, 'settings.manage'))
  with check (bucket_id = 'logos' and can(((storage.foldername(name))[1])::uuid, 'settings.manage'));
drop policy if exists "docs read" on storage.objects;
create policy "docs read"    on storage.objects for select to authenticated
  using (bucket_id in ('documents', 'invoice-attachments') and can_read(((storage.foldername(name))[1])::uuid));
drop policy if exists "docs write" on storage.objects;
create policy "docs write"   on storage.objects for insert to authenticated
  with check (bucket_id in ('documents', 'invoice-attachments') and is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "docs delete" on storage.objects;
create policy "docs delete"  on storage.objects for delete to authenticated
  using (bucket_id in ('documents', 'invoice-attachments') and can(((storage.foldername(name))[1])::uuid, 'invoices.manage'));

-- ----------------------------------------------------------- realtime
do $$
declare t text;
begin
  foreach t in array array['quotations','communications','follow_ups','leads','notifications','invoices','payments'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
