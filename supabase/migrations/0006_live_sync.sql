-- =====================================================================
-- QuoteFlow · 0006_live_sync.sql
-- What the frontend needs to load and save a live workspace (live.js).
-- Run after 0005_admin_access.sql. Re-runnable.
--
--   1. `extra` jsonb on every table the app writes: fields a screen keeps
--      that have no column of their own (invoice attachments list, lead
--      notes, the display label of a payment, ...). Columns stay the
--      source of truth for everything the database computes or filters on.
--   2. Document counters follow numbers the app assigns. The builder shows
--      the next number before saving, so the app sends it; this keeps
--      doc_counters ahead of every number in use.
--   3. Sales orders and invoices get a number from the counter when the
--      app sends none, like the other documents already do.
-- =====================================================================

-- ---------------------------------------------------------------- extra
do $$
declare t text;
begin
  foreach t in array array['companies','company_members','customers','products','quotations','quotation_items','sales_orders',
    'delivery_challans','invoices','payments','credit_notes','debit_notes','leads','follow_ups',
    'customer_notes','communications']
  loop
    execute format('alter table public.%I add column if not exists extra jsonb not null default ''{}''::jsonb', t);
  end loop;
end $$;

-- ------------------------------------------------- numbers for SO and INV
create or replace function public.set_order_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.number, '') = '' then
    new.number := next_number(new.company_id,
      (case tg_table_name when 'sales_orders' then 'order' else 'invoice' end)::doc_kind);
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;

drop trigger if exists order_number on sales_orders;
create trigger order_number before insert on sales_orders
  for each row execute function public.set_order_invoice_number();
drop trigger if exists invoice_number on invoices;
create trigger invoice_number before insert on invoices
  for each row execute function public.set_order_invoice_number();

-- --------------------------------------- counters follow assigned numbers
-- If a document arrives as PREFIX + digits and the counter is not already
-- past it, move the counter to the next number.
create or replace function public.follow_counter()
returns trigger language plpgsql security definer set search_path = public as $$
declare k doc_kind; pre text; tail text;
begin
  k := (case tg_table_name
          when 'quotations' then 'quotation' when 'sales_orders' then 'order'
          when 'delivery_challans' then 'challan' when 'invoices' then 'invoice'
          when 'credit_notes' then 'credit_note' when 'debit_notes' then 'debit_note' end)::doc_kind;
  select prefix into pre from doc_counters where company_id = new.company_id and kind = k;
  if pre is null or left(new.number, length(pre)) <> pre then return null; end if;
  tail := substr(new.number, length(pre) + 1);
  if tail ~ '^[0-9]{1,9}$' then
    update doc_counters set next_no = tail::int + 1
    where company_id = new.company_id and kind = k and next_no <= tail::int;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['quotations','sales_orders','delivery_challans','invoices','credit_notes','debit_notes']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_follow_counter', t);
    execute format('create trigger %I after insert on public.%I for each row execute function public.follow_counter()', t || '_follow_counter', t);
  end loop;
end $$;
