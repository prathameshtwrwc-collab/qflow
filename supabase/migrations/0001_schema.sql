-- =====================================================================
-- QuoteFlow · 0001_schema.sql
-- Tables, enums and indexes. Run this first.
-- Tenancy rule: every business row carries company_id. Nothing is global
-- except profiles, platform_admins and the companies table itself.
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------- enums
create type member_role      as enum ('owner', 'admin', 'sales_manager', 'sales_executive', 'accountant', 'viewer');
create type member_status    as enum ('invited', 'active', 'suspended', 'removed');
create type customer_type    as enum ('business', 'individual', 'government');
create type business_category as enum ('agency', 'contractor', 'wholesale', 'freelancer', 'manufacturer', 'retail', 'services', 'consulting');
create type quote_status     as enum ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');
create type discount_type    as enum ('pct', 'flat');
create type item_kind        as enum ('item', 'section');
create type terms_code       as enum ('advance', 'receipt', 'net7', 'net15', 'net30', 'net45', 'net60', 'custom');
create type comm_channel     as enum ('email', 'whatsapp', 'sms', 'telegram', 'link', 'portal', 'system');
create type comm_status      as enum ('queued', 'sent', 'delivered', 'failed', 'done');
create type lead_stage       as enum ('new_lead', 'contacted', 'requirement', 'created', 'sent', 'viewed', 'negotiation', 'accepted', 'rejected', 'converted');
create type followup_type    as enum ('call', 'meeting', 'email', 'whatsapp', 'site_visit', 'other');
create type followup_status  as enum ('pending', 'done', 'snoozed', 'cancelled');
create type order_status     as enum ('confirmed', 'processing', 'completed', 'cancelled');
create type challan_status   as enum ('draft', 'dispatched', 'delivered', 'cancelled');
create type invoice_status   as enum ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void');
create type payment_method   as enum ('bank_transfer', 'neft', 'rtgs', 'imps', 'upi', 'cheque', 'cash', 'card', 'other');
create type doc_kind         as enum ('quotation', 'order', 'challan', 'invoice', 'payment', 'credit_note', 'debit_note', 'customer', 'company');

-- ------------------------------------------------------------- identity
-- One row per signed-in person. Created by a trigger on auth.users.
create table profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text not null default '',
  email                citext,
  phone                text,
  avatar_path          text,
  must_change_password boolean not null default false,  -- set when a super admin hands out credentials
  last_seen_at         timestamptz,
  created_at           timestamptz not null default now()
);

-- Platform operators. They create companies and hand out the first login.
-- They are NOT members of any company and cannot read business data
-- unless the company switches support access on (see 0002_rbac.sql).
create table platform_admins (
  user_id    uuid primary key references profiles (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

-- -------------------------------------------------------------- tenants
create table companies (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  legal_name           text,
  tagline              text,
  email                citext,
  phone                text,
  website              text,
  address              text,
  city                 text,
  state                text not null default 'Maharashtra',
  state_code           text,                       -- GST state code, e.g. 27
  pin                  text,
  gstin                text,
  pan                  text,
  logo_path            text,
  category             business_category not null default 'services',
  currency             char(3) not null default 'INR',
  -- tax and rounding
  default_tax          numeric(5,2) not null default 18,
  tax_label            text not null default 'GST',
  tax_inclusive        boolean not null default false,
  round_off            boolean not null default true,
  -- documents
  validity_days        int not null default 30 check (validity_days between 1 and 365),
  default_terms_code   terms_code not null default 'net15',
  terms                text,
  payment_terms        text,
  footer_text          text,
  template             text not null default 'minimal',   -- minimal | corporate | creative | contractor | wholesale | service | tally
  brand_color          text not null default '#0E7C66',
  font                 text not null default 'Inter',
  header_style         text not null default 'split',
  item_columns         jsonb not null default '[]'::jsonb, -- builder column layout, see docs/03-data-model.md
  item_flat_tax        numeric(5,2),
  -- bank block printed on invoices
  bank_account_name    text,
  bank_name            text,
  bank_account_no      text,
  bank_ifsc            text,
  bank_branch          text,
  upi_id               text,
  show_bank_on_invoice boolean not null default true,
  show_upi_qr          boolean not null default true,
  notification_prefs   jsonb not null default
    '{"accepted":true,"rejected":true,"viewed":true,"expiring":true,"followup":true,"digest":false}'::jsonb,
  -- lifecycle, owned by the platform
  is_active            boolean not null default true,
  plan                 text not null default 'business',
  support_access_until timestamptz,               -- lets platform admins read this company's data until then
  created_by           uuid references profiles (id),
  created_at           timestamptz not null default now()
);

-- Sequential document numbers. One row per company per document kind.
create table doc_counters (
  company_id uuid not null references companies (id) on delete cascade,
  kind       doc_kind not null,
  prefix     text not null,
  next_no    int  not null default 1 check (next_no > 0),
  pad        int  not null default 0,             -- zero padding, e.g. 4 -> RCPT-0001
  primary key (company_id, kind)
);

create table company_members (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  user_id       uuid references profiles (id) on delete cascade,
  invited_email citext,
  role          member_role not null default 'sales_executive',
  status        member_status not null default 'invited',
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  unique (company_id, user_id),
  check (user_id is not null or invited_email is not null)
);

-- Per-company permission grid. Owners bypass it; everyone else is checked here.
create table role_permissions (
  company_id uuid not null references companies (id) on delete cascade,
  role       member_role not null,
  permission text not null,
  allowed    boolean not null default false,
  primary key (company_id, role, permission)
);

-- ------------------------------------------------------------ customers
create table customers (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  name           text not null,                   -- contact person
  company_name   text,                            -- the customer's business
  email          citext,
  phone          text,
  whatsapp       text,
  type           customer_type not null default 'business',
  address        text,
  city           text,
  state          text,
  pin            text,
  gstin          text,
  ship_same      boolean not null default true,
  ship_to        jsonb,                           -- {name,address,city,state,pin,gstin}
  credit_limit   numeric(14,2) not null default 0,
  terms_code     terms_code not null default 'net15',
  owner_id       uuid references profiles (id),   -- account owner (salesperson)
  customer_since date not null default current_date,
  notes          text,
  created_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  name        text not null,
  category    text,
  description text,
  sku         text,
  hsn         text,                               -- HSN (goods) or SAC (services)
  unit        text not null default 'nos',
  price       numeric(14,2) not null default 0 check (price >= 0),
  cost_price  numeric(14,2) check (cost_price >= 0),
  tax_rate    numeric(5,2) not null default 18,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (company_id, sku)
);

-- ----------------------------------------------------------- quotations
create table quotations (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies (id) on delete cascade,
  number           text not null,
  customer_id      uuid not null references customers (id),
  salesperson_id   uuid references profiles (id),
  project          text,
  job_no           text,                          -- project / job number, carried to SO, DC and invoice
  issue_date       date not null default current_date,
  valid_until      date not null,
  status           quote_status not null default 'draft',
  category         business_category,
  industry_fields  jsonb not null default '{}'::jsonb,
  template         text not null default 'minimal',
  item_columns     jsonb not null default '[]'::jsonb,  -- frozen copy of the layout
  -- customer purchase order (a reference only; never replaces our numbers)
  po_has           boolean not null default false,
  po_number        text,
  po_date          date,
  po_reference     text,
  -- addresses
  ship_same        boolean not null default true,
  ship_to          jsonb,
  -- pricing inputs
  terms_code       terms_code,                    -- filled from the customer, else the company default
  terms_days       int,
  overall_discount numeric(14,2) not null default 0,
  discount_type    discount_type not null default 'pct',
  shipping         numeric(14,2) not null default 0,
  extra_charge     numeric(14,2) not null default 0,
  extra_label      text not null default 'Additional charges',
  cess_rate        numeric(5,2) not null default 0,
  flat_tax         numeric(5,2),                  -- used when the per-line Tax column is hidden
  round_off        boolean,                       -- null = follow the company setting
  tds_on           boolean not null default false,
  tds_rate         numeric(5,2) not null default 0,
  advance_pct      numeric(5,2) not null default 0 check (advance_pct between 0 and 100),
  notes            text,
  payment_terms    text,
  terms            text,
  -- totals, maintained by trigger (see 0003_logic.sql)
  subtotal         numeric(14,2) not null default 0,
  item_discount    numeric(14,2) not null default 0,
  overall_disc_amt numeric(14,2) not null default 0,
  taxable_value    numeric(14,2) not null default 0,
  cgst             numeric(14,2) not null default 0,
  sgst             numeric(14,2) not null default 0,
  igst             numeric(14,2) not null default 0,
  cess             numeric(14,2) not null default 0,
  tax_total        numeric(14,2) not null default 0,
  round_off_amt    numeric(14,2) not null default 0,
  grand_total      numeric(14,2) not null default 0,
  tds_amount       numeric(14,2) not null default 0,
  tax_breakdown    jsonb not null default '[]'::jsonb,   -- [{rate, taxable, tax}]
  inter_state      boolean not null default false,
  -- sharing and tracking
  share_token      text not null unique default encode(gen_random_bytes(18), 'hex'),
  view_count       int not null default 0,
  sent_at          timestamptz,
  first_viewed_at  timestamptz,
  last_viewed_at   timestamptz,
  responded_at     timestamptz,
  rejection_reason text,
  accepted_by_name text,
  duplicated_from  uuid references quotations (id) on delete set null,
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (company_id, number),
  check (valid_until >= issue_date)
);

create table quotation_items (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  position     int not null,
  kind         item_kind not null default 'item',
  product_id   uuid references products (id) on delete set null,
  name         text not null default '',
  description  text,
  sku          text,
  hsn          text,
  quantity     numeric(14,3) not null default 1,
  unit         text,
  unit_price   numeric(14,2) not null default 0,
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  tax_rate     numeric(5,2) not null default 0,
  custom       jsonb not null default '{}'::jsonb,  -- values of user-defined columns
  line_gross   numeric(14,2) not null default 0,
  line_net     numeric(14,2) not null default 0,
  line_tax     numeric(14,2) not null default 0
);

create table quotation_views (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations (id) on delete cascade,
  viewed_at    timestamptz not null default now(),
  user_agent   text,
  ip_hash      text
);

create table quotation_feedback (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations (id) on delete cascade,
  area         text,
  message      text not null,
  author_name  text,
  created_at   timestamptz not null default now()
);

-- -------------------------------------------- orders, challans, invoices
create table sales_orders (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  number         text not null,
  quotation_id   uuid unique references quotations (id),
  customer_id    uuid not null references customers (id),
  order_date     date not null default current_date,
  delivery_date  date,
  salesperson_id uuid references profiles (id),
  po_has         boolean not null default false,
  po_number      text,
  po_date        date,
  po_reference   text,
  job_no         text,
  terms_code     terms_code not null default 'net15',
  ship_to        jsonb,
  amount         numeric(14,2) not null default 0,
  notes          text,
  status         order_status not null default 'confirmed',
  created_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  unique (company_id, number)
);

create table delivery_challans (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  number         text not null,
  order_id       uuid references sales_orders (id) on delete set null,
  quotation_id   uuid references quotations (id) on delete set null,
  customer_id    uuid not null references customers (id),
  challan_date   date not null default current_date,
  dispatch_date  date,
  transporter    text,
  vehicle_no     text,
  lr_no          text,
  delivery_address jsonb,
  received_by    text,
  notes          text,
  status         challan_status not null default 'draft',
  created_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  unique (company_id, number)
);

-- Optional: only needed when a challan dispatches part of an order.
create table challan_items (
  id           uuid primary key default gen_random_uuid(),
  challan_id   uuid not null references delivery_challans (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  item_id      uuid references quotation_items (id) on delete set null,
  name         text not null,
  hsn          text,
  quantity     numeric(14,3) not null default 0,
  unit         text,
  position     int not null default 0
);

create table invoices (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  number        text not null,
  quotation_id  uuid references quotations (id),
  order_id      uuid references sales_orders (id),
  challan_id    uuid references delivery_challans (id),
  customer_id   uuid not null references customers (id),
  issue_date    date not null default current_date,
  due_date      date not null,
  terms_code    terms_code not null default 'net15',
  terms_days    int,
  po_has        boolean not null default false,
  po_number     text,
  po_date       date,
  po_reference  text,
  job_no        text,
  amount        numeric(14,2) not null,            -- copied from the quotation at conversion
  amount_paid   numeric(14,2) not null default 0,  -- maintained by trigger from payments
  advance_pct   numeric(5,2) not null default 0,
  status        invoice_status not null default 'draft',
  sent_at       timestamptz,
  notes         text,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  unique (company_id, number),
  check (due_date >= issue_date),
  check (amount_paid >= 0)
);

create table invoice_attachments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices (id) on delete cascade,
  company_id  uuid not null references companies (id) on delete cascade,
  kind        text not null default 'Supporting document',
  file_name   text not null,
  storage_path text,                                -- bucket: invoice-attachments/<company_id>/<invoice_id>/<file>
  size_bytes  bigint,
  uploaded_by uuid references profiles (id),
  created_at  timestamptz not null default now()
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  invoice_id    uuid not null references invoices (id) on delete cascade,
  customer_id   uuid not null references customers (id),
  amount        numeric(14,2) not null check (amount > 0),
  paid_on       date not null default current_date,
  method        payment_method not null default 'neft',
  reference_no  text,                               -- UTR / transaction reference
  cheque_no     text,
  bank_name     text,
  notes         text,
  attachment_path text,
  recorded_by   uuid references profiles (id),
  created_at    timestamptz not null default now()
);

create table payment_receipts (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  payment_id uuid not null unique references payments (id) on delete cascade,
  number     text not null,
  issued_on  date not null default current_date,
  created_at timestamptz not null default now(),
  unique (company_id, number)
);

create table credit_notes (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  number        text not null,
  invoice_id    uuid not null references invoices (id),
  customer_id   uuid not null references customers (id),
  note_date     date not null default current_date,
  reason        text not null,
  items_note    text,
  taxable_value numeric(14,2) not null check (taxable_value >= 0),
  tax_rate      numeric(5,2) not null default 18,
  tax_amount    numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  notes         text,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  unique (company_id, number)
);

create table debit_notes (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  number        text not null,
  invoice_id    uuid not null references invoices (id),
  customer_id   uuid not null references customers (id),
  note_date     date not null default current_date,
  reason        text not null,
  taxable_value numeric(14,2) not null check (taxable_value >= 0),
  tax_rate      numeric(5,2) not null default 18,
  tax_amount    numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  notes         text,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now(),
  unique (company_id, number)
);

-- ------------------------------------------------------ sales activity
create table leads (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies (id) on delete cascade,
  customer_id      uuid not null references customers (id) on delete cascade,
  quotation_id     uuid references quotations (id) on delete set null,
  title            text not null,
  value            numeric(14,2) not null default 0,
  stage            lead_stage not null default 'new_lead',
  salesperson_id   uuid references profiles (id),
  next_follow_up   date,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create table follow_ups (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  customer_id  uuid not null references customers (id) on delete cascade,
  quotation_id uuid references quotations (id) on delete set null,
  invoice_id   uuid references invoices (id) on delete set null,
  lead_id      uuid references leads (id) on delete set null,
  type         followup_type not null default 'call',
  note         text not null,
  due_date     date not null,
  status       followup_status not null default 'pending',
  assigned_to  uuid references profiles (id),
  completed_at timestamptz,
  created_by   uuid references profiles (id),
  created_at   timestamptz not null default now()
);

create table customer_notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  body        text not null,
  author_id   uuid references profiles (id),
  created_at  timestamptz not null default now()
);

create table communications (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  quotation_id uuid references quotations (id) on delete cascade,
  invoice_id   uuid references invoices (id) on delete cascade,
  customer_id  uuid references customers (id) on delete cascade,
  channel      comm_channel not null,
  event        text not null,
  recipient    text,
  cc           text[],
  bcc          text[],
  subject      text,
  message      text,
  status       comm_status not null default 'done',
  actor_id     uuid references profiles (id),
  created_at   timestamptz not null default now()
);

-- Audit trail shown on documents. Never deleted when a document is edited.
create table document_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  doc_kind    doc_kind not null,
  doc_id      uuid not null,
  action      text not null,
  detail      text,
  meta        jsonb not null default '{}'::jsonb,
  actor_id    uuid references profiles (id),
  created_at  timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- indexes
create index on company_members (user_id) where status = 'active';
create index on customers (company_id, name) where deleted_at is null;
create index on customers (company_id, owner_id);
create index on products (company_id, category) where deleted_at is null;
create index on quotations (company_id, status, issue_date desc) where deleted_at is null;
create index on quotations (company_id, customer_id);
create index on quotations (company_id, salesperson_id);
create index on quotations (company_id, valid_until) where status in ('sent', 'viewed');
create index on quotation_items (quotation_id, position);
create index on quotation_items (company_id, product_id);
create index on sales_orders (company_id, status, order_date desc);
create index on delivery_challans (company_id, status, challan_date desc);
create index on invoices (company_id, status, due_date);
create index on invoices (company_id, customer_id);
create index on payments (invoice_id);
create index on payments (company_id, paid_on desc);
create index on credit_notes (company_id, invoice_id);
create index on debit_notes (company_id, invoice_id);
create index on communications (quotation_id, created_at desc);
create index on communications (company_id, created_at desc);
create index on document_events (company_id, doc_kind, doc_id, created_at);
create index on leads (company_id, stage);
create index on follow_ups (company_id, status, due_date);
create index on follow_ups (assigned_to, due_date) where status = 'pending';
create index on customer_notes (customer_id, created_at desc);
create index on notifications (user_id, created_at desc) where read_at is null;
