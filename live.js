/* ================= live workspace: load and save ================= */
/* The screens keep working on S exactly as in the demo. This file loads S from Supabase when a
   licensed user signs in, then watches S and writes every difference back:
     load:  rows -> lvUnpack -> S
     save:  S -> lvPack -> rows, compared with the last saved copy; new, changed and removed rows are written
   Fields the database has no column for travel in each table's `extra` jsonb (0006_live_sync.sql),
   so nothing a screen stores is lost. Totals are never sent: recalc_quotation() owns them. */
const LIVE = { on: false, cid: null, uid: null, t0: null, snap: {}, failed: {}, busy: false, again: false, timer: null, warned: false };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ---------- value converters ---------- */
const lvU = v => UUID_RE.test(v || '') ? v : null;                 // reference to another row
const lvT = v => v == null || v === '' ? null : v;                 // optional text or date
const lvS = v => v ?? '';
const lvN = v => +v || 0;
const lvNum = v => v == null ? 0 : +v;
const lvTs = v => v ? new Date(v).toISOString() : LIVE.t0;         // ms or date string -> timestamptz
const lvTsOpt = v => v ? new Date(v).toISOString() : null;
const lvMs = v => v ? +new Date(v) : null;
const lvD = v => v ? String(v).slice(0, 10) : '';
const lvPct = v => Math.min(100, Math.max(0, lvN(v)));
const lvSnake = v => String(v || '').toLowerCase().replace(/[ -]/g, '_');
/* a value the database enum cannot hold is saved as the default and kept verbatim in extra['~key'] */
const lvEnum = (allowed, def, toDb = v => v, fromDb = v => v) => [
  (v, row, k) => { const d = toDb(v); if (allowed.includes(d)) return d; if (v != null && v !== '') row.extra['~' + k] = v; return def; },
  fromDb];

/* Lists the screens unshift() into are shown newest first. Rows saved in one batch would share a database
   timestamp and shuffle on reload, so each gets its own the first time it is seen. */
const lvStamp = list => { const now = Date.now(); list.forEach((o, i) => { if (!o._at) o._at = now - i; }); return list; };
const AT = ['_at', 'created_at', lvTs, lvMs];

/* map entry: [key in S, column, toDb(value, row, key)?, fromDb(value, row)?] */
function lvPack(o, map, omit = []) {
  const used = new Set(omit), row = { extra: {} };
  for (const m of map) used.add(m[0]);
  for (const k in o) if (!used.has(k) && o[k] !== undefined) row.extra[k] = o[k];
  for (const [k, col, to] of map) row[col] = to ? to(o[k], row, k) : (o[k] ?? null);
  row.company_id = LIVE.cid;
  return row;
}
function lvUnpack(r, map) {
  const x = r.extra || {}, o = {};
  for (const k in x) if (k[0] !== '~') o[k] = x[k];
  for (const [k, col, , from] of map) o[k] = ('~' + k) in x ? x['~' + k] : from ? from(r[col], r) : r[col];
  return o;
}
/* the customer PO and TDS blocks are nested in S and flat in the database */
const lvFlat = o => { const { po, tds, ...x } = o; x.poHas = !!(po && po.has); x.poNo = po ? po.no : ''; x.poDate = po ? po.date : ''; x.poRef = po ? po.ref : ''; if (tds !== undefined) { x.tdsOn = !!(tds && tds.on); x.tdsRate = tds ? tds.rate : 0; } return x; };
const lvNest = (o, withTds) => { o.po = { has: !!o.poHas, no: o.poNo || '', date: o.poDate || '', ref: o.poRef || '' }; delete o.poHas; delete o.poNo; delete o.poDate; delete o.poRef; if (withTds) o.tds = { on: !!o.tdsOn, rate: o.tdsRate ?? 2 }; delete o.tdsOn; delete o.tdsRate; return o; };
const PO_MAP = [['poHas', 'po_has', v => !!v], ['poNo', 'po_number', lvT, lvS], ['poDate', 'po_date', lvT, lvD], ['poRef', 'po_reference', lvT, lvS]];

/* ---------- enums ---------- */
const TERM_CODES = PAY_TERMS.map(t => t[0]);
const FU_TYPES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site visit', 'Other'];
const lvLabel = list => v => list.find(x => lvSnake(x) === v) || v;
const E_CTYPE = lvEnum(['business', 'individual', 'government'], 'business', lvSnake, v => v[0].toUpperCase() + v.slice(1));
const E_TERMS = lvEnum(TERM_CODES, 'net15');
const E_QSTATUS = lvEnum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'], 'draft');
const E_OSTATUS = lvEnum(['confirmed', 'processing', 'completed', 'cancelled'], 'confirmed');
const E_DSTATUS = lvEnum(['draft', 'dispatched', 'delivered', 'cancelled'], 'draft');
const E_ISTATUS = lvEnum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'], 'draft', lvSnake, v => v.replace('_', '-'));
const E_METHOD = lvEnum(PAY_METHODS.map(lvSnake), 'other', lvSnake, lvLabel(PAY_METHODS));
const E_STAGE = lvEnum(['new_lead', 'contacted', 'requirement', 'created', 'sent', 'viewed', 'negotiation', 'accepted', 'rejected', 'converted'], 'new_lead', v => v === 'new' ? 'new_lead' : v, v => v === 'new_lead' ? 'new' : v);
const E_FUTYPE = lvEnum(FU_TYPES.map(lvSnake), 'other', lvSnake, lvLabel(FU_TYPES));
const E_FUSTATUS = lvEnum(['pending', 'done', 'snoozed', 'cancelled'], 'pending');
const E_CHANNEL = lvEnum(['email', 'whatsapp', 'sms', 'telegram', 'link', 'portal', 'system'], 'system');
const ROLE_KEY = Object.fromEntries(Object.entries(ROLE_LABEL).map(([k, v]) => [v, k]));
const AUDIT_KIND = { quote: 'quotation', order: 'order', challan: 'challan', invoice: 'invoice', payment: 'payment', cn: 'credit_note', dn: 'debit_note', customer: 'customer' };

/* ---------- column maps ---------- */
const M_CUSTOMER = [['id', 'id'], ['name', 'name', v => v || 'Customer'], ['company', 'company_name', lvT, lvS], ['email', 'email', lvT, lvS], ['phone', 'phone', lvT, lvS],
  ['type', 'type', ...E_CTYPE], ['address', 'address', lvT, lvS], ['city', 'city', lvT, lvS], ['state', 'state', lvT, lvS], ['pin', 'pin', lvT, lvS], ['gstin', 'gstin', lvT, lvS],
  ['shipSame', 'ship_same', v => v !== false], ['shipTo', 'ship_to'], ['creditLimit', 'credit_limit', lvN, lvNum], ['terms', 'terms_code', ...E_TERMS],
  ['owner', 'owner_id', lvU], ['since', 'customer_since', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], AT];
const M_PRODUCT = [['id', 'id'], ['name', 'name', v => v || 'Item'], ['category', 'category', lvT, lvS], ['desc', 'description', lvT, lvS], ['sku', 'sku', lvT, lvS], ['hsn', 'hsn', lvT, lvS],
  ['unit', 'unit', v => v || 'nos'], ['price', 'price', v => Math.max(0, lvN(v)), lvNum], ['cost', 'cost_price', v => v == null || v === '' ? null : Math.max(0, lvN(v)), lvNum],
  ['tax', 'tax_rate', lvN, lvNum], ['active', 'is_active', v => v !== false], AT];
const M_QUOTE = [['id', 'id'], ['no', 'number'], ['cid', 'customer_id', lvU], ['sp', 'salesperson_id', lvU], ['project', 'project', lvT, lvS], ['jobNo', 'job_no', lvT, lvS],
  ['date', 'issue_date', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], ['expiry', 'valid_until', (v, row) => lvT(v) || row.issue_date || LIVE.t0.slice(0, 10), lvD],
  ['status', 'status', ...E_QSTATUS], ['category', 'category', ...lvEnum(Object.keys(CATEGORIES), null)], ['catFields', 'industry_fields', v => v || {}, v => v || {}],
  ['template', 'template', v => v || 'minimal'], ['cols', 'item_columns', v => qCols({ cols: v })], ...PO_MAP,
  ['shipSame', 'ship_same', v => v !== false], ['shipTo', 'ship_to'], ['termsCode', 'terms_code', ...lvEnum(TERM_CODES, null)], ['termsDays', 'terms_days', v => v == null || v === '' ? null : Math.round(+v) || 0, lvNum],
  ['odisc', 'overall_discount', lvN, lvNum], ['odiscType', 'discount_type', v => v === 'flat' ? 'flat' : 'pct'], ['ship', 'shipping', lvN, lvNum], ['extra', 'extra_charge', lvN, lvNum],
  ['extraLabel', 'extra_label', v => v || 'Additional charges'], ['cess', 'cess_rate', lvN, lvNum], ['flatTax', 'flat_tax', v => v == null ? +S.settings.defaultTax : +v, lvNum],
  ['roundOff', 'round_off', v => v == null ? null : !!v], ['tdsOn', 'tds_on', v => !!v], ['tdsRate', 'tds_rate', lvN, lvNum], ['advance', 'advance_pct', lvPct, lvNum],
  ['notes', 'notes', lvT, lvS], ['paymentTerms', 'payment_terms', lvT, lvS], ['terms', 'terms', lvT, lvS], ['views', 'view_count', v => Math.round(lvN(v)), lvNum],
  ['sentAt', 'sent_at', lvTsOpt, lvMs], ['viewedAt', 'first_viewed_at', lvTsOpt, lvMs], ['respondedAt', 'responded_at', lvTsOpt, lvMs], ['reason', 'rejection_reason', lvT, lvS], ['created', 'created_at', lvTs, lvMs], ['token', 'share_token']];
const M_ITEM = [['id', 'id'], ['type', 'kind', v => v === 'section' ? 'section' : 'item'], ['pid', 'product_id', lvU], ['name', 'name', lvS, lvS], ['desc', 'description', lvT, lvS], ['sku', 'sku', lvT, lvS], ['hsn', 'hsn', lvT, lvS],
  ['qty', 'quantity', lvN, lvNum], ['unit', 'unit', lvT, lvS], ['price', 'unit_price', lvN, lvNum], ['disc', 'discount_pct', lvPct, lvNum], ['tax', 'tax_rate', lvN, lvNum], ['cf', 'custom', v => v || {}, v => v || {}]];
const M_ORDER = [['id', 'id'], ['no', 'number'], ['qid', 'quotation_id', lvU], ['cid', 'customer_id', lvU], ['date', 'order_date', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], ['delivery', 'delivery_date', lvT, lvD],
  ['sp', 'salesperson_id', lvU], ...PO_MAP, ['jobNo', 'job_no', lvT, lvS], ['termsCode', 'terms_code', ...E_TERMS], ['amount', 'amount', lvN, lvNum], ['notes', 'notes', lvT, lvS], ['status', 'status', ...E_OSTATUS], AT];
const M_CHALLAN = [['id', 'id'], ['no', 'number'], ['oid', 'order_id', lvU], ['qid', 'quotation_id', lvU], ['cid', 'customer_id', lvU], ['date', 'challan_date', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], ['dispatch', 'dispatch_date', lvT, lvD],
  ['transporter', 'transporter', lvT, lvS], ['vehicle', 'vehicle_no', lvT, lvS], ['receivedBy', 'received_by', lvT, lvS], ['notes', 'notes', lvT, lvS], ['status', 'status', ...E_DSTATUS], AT];
const M_INVOICE = [['id', 'id'], ['no', 'number'], ['qid', 'quotation_id', lvU], ['oid', 'order_id', lvU], ['dcid', 'challan_id', lvU], ['cid', 'customer_id', lvU],
  ['date', 'issue_date', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], ['due', 'due_date', (v, row) => lvT(v) && v >= row.issue_date ? v : row.issue_date, lvD],
  ['termsCode', 'terms_code', ...E_TERMS], ['termsDays', 'terms_days', v => v == null || v === '' ? null : Math.round(+v) || 0, lvNum], ...PO_MAP, ['jobNo', 'job_no', lvT, lvS],
  ['amount', 'amount', lvN, lvNum], ['advance', 'advance_pct', lvPct, lvNum], ['status', 'status', ...E_ISTATUS], AT];
const M_PAYMENT = [['id', 'id'], ['invId', 'invoice_id', lvU], ['cid', 'customer_id', lvU], ['amount', 'amount', lvN, lvNum], ['date', 'paid_on', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], ['method', 'method', ...E_METHOD],
  ['ref', 'reference_no', lvT, lvS], ['cheque', 'cheque_no', lvT, lvS], ['bank', 'bank_name', lvT, lvS], ['notes', 'notes', lvT, lvS], ['ts', 'created_at', lvTs, lvMs]];
const M_NOTE = [['id', 'id'], ['no', 'number'], ['invId', 'invoice_id', lvU], ['cid', 'customer_id', lvU], ['date', 'note_date', v => lvT(v) || LIVE.t0.slice(0, 10), lvD], ['reason', 'reason', v => v || 'Other'],
  ['taxable', 'taxable_value', v => Math.max(0, lvN(v)), lvNum], ['rate', 'tax_rate', lvN, lvNum], ['notes', 'notes', lvT, lvS]];
const M_LEAD = [['id', 'id'], ['cid', 'customer_id', lvU], ['qid', 'quotation_id', lvU], ['title', 'title', v => v || 'Enquiry'], ['value', 'value', lvN, lvNum], ['stage', 'stage', ...E_STAGE],
  ['sp', 'salesperson_id', lvU], ['last', 'last_activity_at', lvTs, lvMs], ['fu', 'next_follow_up', lvT, lvD]];
const M_FOLLOWUP = [['id', 'id'], ['cid', 'customer_id', lvU], ['qid', 'quotation_id', lvU], ['type', 'type', ...E_FUTYPE], ['note', 'note', v => v || 'Follow up'], ['due', 'due_date', v => lvT(v) || LIVE.t0.slice(0, 10), lvD],
  ['status', 'status', ...E_FUSTATUS], ['sp', 'assigned_to', lvU], ['created', 'created_at', lvTs, lvMs]];
const M_CNOTE = [['id', 'id'], ['cid', 'customer_id', lvU], ['text', 'body', v => v || ''], ['ts', 'created_at', lvTs, lvMs]];
const M_COMM = [['id', 'id'], ['qid', 'quotation_id', lvU], ['cid', 'customer_id', lvU], ['ch', 'channel', ...E_CHANNEL], ['ev', 'event', v => v || 'Activity'], ['to', 'recipient', lvT, lvS], ['msg', 'message', lvT], ['ts', 'created_at', lvTs, lvMs]];

/* the secret in a quotation's share link; made here so the link exists before the first save */
function quoteToken(q) { if (!q.token) q.token = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join(''); return q.token; }

/* ---------- company settings ---------- */
const SET_COLS = ['bizName', 'legal', 'tagline', 'email', 'phone', 'website', 'address', 'gstin', 'category', 'defaultTax', 'taxLabel', 'taxInclusive', 'validity', 'template', 'brand', 'font', 'header', 'footer', 'terms', 'paymentTerms', 'bank', 'showBank', 'roundOff', 'state', 'stateCode', 'termsCode', 'notif', 'itemCols', 'itemFlatTax'];
const SET_SKIP = ['city', 'currency', 'workspace', ...Object.values(LIVE_COUNTERS).flat()];
function lvCompanyRow() {
  const s = S.settings, b = s.bank || {}, extra = { cityLine: s.city };
  for (const k in s) if (!SET_COLS.includes(k) && !SET_SKIP.includes(k) && s[k] !== undefined) extra[k] = s[k];
  return { id: LIVE.cid, name: s.bizName || 'Company', legal_name: lvT(s.legal), tagline: lvT(s.tagline), email: lvT(s.email), phone: lvT(s.phone), website: lvT(s.website), address: lvT(s.address), gstin: lvT(s.gstin),
    category: CATEGORIES[s.category] ? s.category : 'services', default_tax: lvN(s.defaultTax), tax_label: s.taxLabel || 'GST', tax_inclusive: !!s.taxInclusive,
    validity_days: Math.min(365, Math.max(1, Math.round(+s.validity) || 30)), template: s.template || 'minimal', brand_color: s.brand || '#0E7C66', font: s.font || 'Inter', header_style: s.header || 'split',
    footer_text: lvT(s.footer), terms: lvT(s.terms), payment_terms: lvT(s.paymentTerms),
    bank_account_name: lvT(b.accName), bank_name: lvT(b.bankName), bank_account_no: lvT(b.acc), bank_ifsc: lvT(b.ifsc), bank_branch: lvT(b.branch), upi_id: lvT(b.upi), show_upi_qr: b.qr !== false,
    show_bank_on_invoice: s.showBank !== false, round_off: s.roundOff !== false, state: s.state || 'Maharashtra', state_code: lvT(s.stateCode),
    default_terms_code: TERM_CODES.includes(s.termsCode) ? s.termsCode : 'net15', notification_prefs: s.notif || {}, item_columns: s.itemCols || [], item_flat_tax: s.itemFlatTax == null ? null : lvN(s.itemFlatTax), extra };
}

/* ---------- collections: what is saved, where, and in which order (parents first) ---------- */
const lvValid = (list, name) => list.filter(o => { if (lvU(o.id)) return true; if (!LIVE.warned) { LIVE.warned = true; console.warn('QuoteFlow: a ' + name + ' has no database id and cannot be saved', o); } return false; });
const LIVE_DEF = {
  company: { table: 'companies', mode: 'update', rows: () => [lvCompanyRow()] },
  counters: { table: 'doc_counters', mode: 'upsert', key: 'kind', conflict: 'company_id,kind', keep: true,
    /* receipt numbers are issued by the payment_recorded trigger, so that counter is the database's to move */
    rows: () => Object.entries(LIVE_COUNTERS).filter(([kind]) => kind !== 'payment').map(([kind, [pk, nk]]) => ({ company_id: LIVE.cid, kind, prefix: S.settings[pk] || '', next_no: Math.max(1, Math.floor(+S.settings[nk]) || 1) })) },
  team: { table: 'company_members', mode: 'upsert',
    /* m.user is set on load for people who have signed in; an invite is a seat held by email until they do */
    rows: () => S.team.map(m => { if (!m.mid) m.mid = crypto.randomUUID(); const u = lvU(m.user); return { id: m.mid, company_id: LIVE.cid, user_id: u, invited_email: u ? null : (m.email || '').toLowerCase(), extra: { name: m.name }, role: ROLE_KEY[m.role] || 'sales_executive', status: ['invited', 'active', 'suspended', 'removed'].includes(m.status) ? m.status : 'invited' }; }) },
  customers: { table: 'customers', mode: 'upsert', soft: true, rows: () => lvValid(lvStamp(S.customers), 'customer').map(c => lvPack(c, M_CUSTOMER)) },
  products: { table: 'products', mode: 'upsert', soft: true, rows: () => lvValid(lvStamp(S.products), 'product').map(p => lvPack(p, M_PRODUCT)) },
  quotes: { table: 'quotations', mode: 'upsert', soft: true, rows: () => lvValid(S.quotes, 'quotation').filter(q => lvU(q.cid)).map(q => { quoteToken(q); return lvPack(lvFlat(q), M_QUOTE, ['items', 'comms', 'total', 'isNew', '_route']); }) },
  items: { table: 'quotation_items', mode: 'upsert',
    rows: () => S.quotes.filter(q => lvU(q.id) && lvU(q.cid)).flatMap(q => q.items.map((it, i) => { if (!lvU(it.id)) it.id = crypto.randomUUID(); return Object.assign(lvPack(it, M_ITEM), { quotation_id: q.id, position: i }); })) },
  orders: { table: 'sales_orders', mode: 'upsert', rows: () => lvValid(lvStamp(S.orders), 'sales order').map(o => lvPack(lvFlat(o), M_ORDER)) },
  challans: { table: 'delivery_challans', mode: 'upsert', rows: () => lvValid(lvStamp(S.challans), 'challan').map(d => lvPack(d, M_CHALLAN)) },
  invoices: { table: 'invoices', mode: 'upsert', rows: () => lvValid(lvStamp(S.invoices), 'invoice').map(i => lvPack(lvFlat(i), M_INVOICE, ['paid', 'fresh'])) },
  payments: { table: 'payments', mode: 'insert', after: lvReceipts, rows: () => lvValid(S.payments, 'payment').map(p => Object.assign(lvPack(p, M_PAYMENT, ['rcpt']), { recorded_by: LIVE.uid })) },
  cnotes: { table: 'credit_notes', mode: 'upsert', rows: () => lvValid(S.cnotes, 'credit note').map(n => lvPack(n, [...M_NOTE, ['qty', 'items_note', lvT, lvS]], ['tax', 'total'])) },
  dnotes: { table: 'debit_notes', mode: 'upsert', rows: () => lvValid(S.dnotes, 'debit note').map(n => lvPack(n, M_NOTE, ['tax', 'total'])) },
  leads: { table: 'leads', mode: 'upsert', rows: () => lvValid(S.leads, 'lead').filter(l => lvU(l.cid)).map(l => lvPack(l, M_LEAD)) },
  followups: { table: 'follow_ups', mode: 'upsert', rows: () => lvValid(S.followups, 'follow-up').filter(f => lvU(f.cid)).map(f => lvPack(f, M_FOLLOWUP)) },
  notes: { table: 'customer_notes', mode: 'upsert', rows: () => S.notes.filter(n => lvU(n.id) && lvU(n.cid)).map(n => Object.assign(lvPack(n, M_CNOTE), { author_id: n.author || LIVE.uid })) },
  comms: { table: 'communications', mode: 'upsert',
    rows: () => S.quotes.filter(q => lvU(q.id) && lvU(q.cid)).flatMap(q => (q.comms || []).map(m => { if (!m.id) m.id = crypto.randomUUID(); return Object.assign(lvPack({ ...m, qid: q.id, cid: q.cid }, M_COMM), { status: 'done' }); })) },
  audit: { table: 'document_events', mode: 'upsert',
    rows: () => S.audit.filter(a => lvU(a.id) && lvU(a.docId)).map(a => ({ id: a.id, company_id: LIVE.cid, doc_kind: AUDIT_KIND[a.docType] || 'company', doc_id: a.docId, action: a.action || 'Activity', detail: lvT(a.detail), meta: { src: 'app', by: a.by, docType: a.docType }, actor_id: LIVE.uid, created_at: lvTs(a.ts) })) },
  notifs: { table: 'notifications', mode: 'update', rows: () => S.notifications.filter(n => n.db).map(n => { if (n.read && !n.readAt) n.readAt = new Date().toISOString(); return { id: n.id, read_at: n.read ? n.readAt : null }; }) },
};
const LIVE_ORDER = ['company', 'counters', 'team', 'customers', 'products', 'quotes', 'items', 'orders', 'challans', 'invoices', 'payments', 'cnotes', 'dnotes', 'leads', 'followups', 'notes', 'comms', 'audit', 'notifs'];

/* ---------- load ---------- */
async function lvAll(table, filter = q => q, key = 'id') {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(sb.from(table).select('*').eq('company_id', LIVE.cid)).order(key).range(from, from + 999);
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...data); if (data.length < 1000) return out;
  }
}
/* every record of the company, as rows */
function liveFetch() {
  const live = q => q.is('deleted_at', null);
  return Promise.all([
    lvAll('customers', live), lvAll('products', live), lvAll('quotations', live), lvAll('quotation_items'), lvAll('sales_orders'), lvAll('delivery_challans'), lvAll('invoices'),
    lvAll('payments'), lvAll('payment_receipts'), lvAll('credit_notes'), lvAll('debit_notes'), lvAll('leads'), lvAll('follow_ups'), lvAll('customer_notes'),
    lvAll('communications'), lvAll('document_events', q => q.eq('meta->>src', 'app')), lvAll('notifications', q => q.eq('user_id', LIVE.uid)), lvAll('doc_counters', q => q, 'kind'),
  ]);
}
/* rows -> S, then remember what is saved so only later changes are written */
function liveApply([cu, pr, qu, it, so, dc, inv, pay, rc, cn, dn, ld, fu, nt, cm, au, nf, ct]) {
  const by = (k, dir = 1) => (a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * dir;
  /* someone else may have issued numbers since this session last looked */
  for (const r of ct) { const m = LIVE_COUNTERS[r.kind]; if (m) { S.settings[m[0]] = r.prefix; S.settings[m[1]] = Math.max(r.next_no, LIVE.on ? +S.settings[m[1]] || 0 : 0); } }

  S.customers = cu.sort(by('created_at', -1)).map(r => lvUnpack(r, M_CUSTOMER));
  S.products = pr.sort(by('created_at', -1)).map(r => lvUnpack(r, M_PRODUCT));
  const itemsOf = {}, commsOf = {};
  for (const r of it.sort(by('position'))) (itemsOf[r.quotation_id] ||= []).push(lvUnpack(r, M_ITEM));
  for (const r of cm.sort(by('created_at'))) if (r.quotation_id) { const m = lvUnpack(r, M_COMM); delete m.qid; delete m.cid; (commsOf[r.quotation_id] ||= []).push(m); }
  S.quotes = qu.sort(by('created_at')).map(r => { const q = lvNest(lvUnpack(r, M_QUOTE), true); q.items = itemsOf[r.id] || []; q.comms = commsOf[r.id] || []; q.feedback = q.feedback || []; q._dbTotal = +r.grand_total; return q; });
  /* calcQuote() is what every screen shows; say so loudly if the database computed something else */
  for (const q of S.quotes) { q.total = calcQuote(q).grand; if (Math.abs(q.total - q._dbTotal) > 0.01) console.warn(`QuoteFlow: ${q.no} totals differ — app ${q.total}, database ${q._dbTotal}`); delete q._dbTotal; }
  S.orders = so.sort(by('created_at', -1)).map(r => lvNest(lvUnpack(r, M_ORDER)));
  S.challans = dc.sort(by('created_at', -1)).map(r => lvUnpack(r, M_CHALLAN));
  S.invoices = inv.sort(by('created_at', -1)).map(r => { const i = lvNest(lvUnpack(r, M_INVOICE)); i.paid = +r.amount_paid; i.attachments = i.attachments || []; return i; });
  S.payments = pay.sort(by('created_at')).map(r => lvUnpack(r, M_PAYMENT));
  S.receipts = [];
  for (const r of rc.sort(by('created_at'))) { const p = S.payments.find(x => x.id === r.payment_id); if (p) { p.rcpt = r.number; S.receipts.push({ id: r.id, no: r.number, payId: p.id, invId: p.invId, cid: p.cid, amount: p.amount, date: p.date, method: p.method, ref: p.ref || p.cheque }); } }
  const note = (r, cn) => Object.assign(lvUnpack(r, cn ? [...M_NOTE, ['qty', 'items_note', lvT, lvS]] : M_NOTE), { tax: +r.tax_amount, total: +r.total });
  S.cnotes = cn.sort(by('created_at')).map(r => note(r, true)); S.dnotes = dn.sort(by('created_at')).map(r => note(r, false));
  S.leads = ld.sort(by('created_at')).map(r => lvUnpack(r, M_LEAD));
  S.followups = fu.sort(by('created_at')).map(r => lvUnpack(r, M_FOLLOWUP));
  S.notes = nt.sort(by('created_at')).map(r => Object.assign(lvUnpack(r, M_CNOTE), { author: r.author_id }));
  S.audit = au.sort(by('created_at')).map(r => ({ id: r.id, docType: (r.meta || {}).docType || r.doc_kind, docId: r.doc_id, action: r.action, detail: r.detail || '', by: (r.meta || {}).by || '', ts: +new Date(r.created_at) }));
  S.notifications = nf.sort(by('created_at', -1)).map(r => ({ id: r.id, kind: r.kind, qid: (r.link || '').split('/').pop(), text: r.title, ts: +new Date(r.created_at), read: !!r.read_at, readAt: r.read_at, db: true }));
  for (const q of S.quotes) { const i = S.invoices.find(x => x.qid === q.id); if (i && !q.invoiced) q.invoiced = i.id; }

  const cur = liveCollect();
  for (const name of LIVE_ORDER) LIVE.snap[name] = new Map([...cur[name]].map(([id, r]) => [id, JSON.stringify(r)]));
}
async function liveLoad(companyId, userId) {
  Object.assign(LIVE, { cid: companyId, uid: userId, t0: new Date().toISOString(), snap: {}, failed: {}, warned: false, pulled: Date.now() });
  liveApply(await liveFetch());
  LIVE.on = true;
  liveTouch = () => { clearTimeout(LIVE.timer); LIVE.timer = setTimeout(liveFlush, 700); };
  setInterval(liveFlush, 5000);                              // catches changes made outside a click, e.g. after a timer
  setInterval(liveRefresh, 60000);
  window.addEventListener('focus', liveRefresh);
  window.addEventListener('beforeunload', e => { if (LIVE.busy || liveDirty()) { liveFlush(); e.preventDefault(); e.returnValue = ''; } });
}
/* Picks up what teammates and customers (through the portal) changed. Skipped while this session has
   unsaved work, an open dialog, the builder, or a field in focus, so it never pulls the rug from under the user. */
const liveIdle = () => !LIVE.busy && !$('.scrim') && !/\/(new|edit)$/.test(location.hash) && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !liveDirty();
async function liveRefresh() {
  if (!LIVE.on || LIVE.pulling || document.hidden || Date.now() - LIVE.pulled < 20000 || !liveIdle()) return;
  LIVE.pulling = true;
  try {
    const data = await liveFetch();
    if (liveIdle()) {
      const sig = () => LIVE_ORDER.map(n => [...LIVE.snap[n].values()].join()).join();
      const before = sig(); liveApply(data);
      if (sig() !== before) { rerender(); renderTopbar(); }
    }
  } catch (e) { console.warn('QuoteFlow: refresh failed', e); }
  LIVE.pulling = false; LIVE.pulled = Date.now();
  if (LIVE.again) liveTouch();
}

/* ---------- save ---------- */
function liveCollect() {
  const cur = {};
  for (const name of LIVE_ORDER) { const d = LIVE_DEF[name]; cur[name] = new Map(d.rows().map(r => [r[d.key || 'id'], r])); }
  return cur;
}
function liveDiff(cur) {
  const out = [];
  for (const name of LIVE_ORDER) {
    const d = LIVE_DEF[name], snap = LIVE.snap[name], add = [], change = [], gone = [];
    for (const [id, r] of cur[name]) { const j = JSON.stringify(r); if (!snap.has(id)) add.push([id, r, j]); else if (snap.get(id) !== j) change.push([id, r, j]); }
    if (!d.keep && d.mode !== 'update') for (const id of snap.keys()) if (!cur[name].has(id)) gone.push(id);
    out.push({ name, d, add, change, gone });
  }
  return out;
}
const liveDirty = () => LIVE.on && liveDiff(liveCollect()).some(x => (x.d.mode === 'update' ? x.change.length : x.d.mode === 'insert' ? x.add.length : x.add.length + x.change.length + x.gone.length));
function liveStatus(text, bad) { const el = $('#live-sync'); if (el) { el.textContent = text; el.style.color = bad ? 'var(--red)' : ''; } }

/* writes a batch; when it fails, retries row by row so one bad row cannot block the rest */
async function liveWrite(d, list, isNew) {
  const send = rows => isNew ? sb.from(d.table).insert(rows) : sb.from(d.table).upsert(rows, d.conflict ? { onConflict: d.conflict } : undefined);
  const bad = [];
  for (let i = 0; i < list.length; i += 200) {
    const part = list.slice(i, i + 200);
    const { error } = await send(part.map(x => x[1]));
    if (!error) continue;
    if (part.length === 1) { bad.push([part[0], error.message]); continue; }
    for (const x of part) { const { error: e } = await send([x[1]]); if (e) bad.push([x, e.message]); }
  }
  return bad;
}
async function liveFlush() {
  if (!LIVE.on) return;
  if (LIVE.busy || LIVE.pulling) { LIVE.again = true; return; }
  LIVE.busy = true; LIVE.again = false;
  const errors = []; let wrote = 0;
  const fail = (name, id, json, msg) => { const k = name + ':' + id; if (LIVE.failed[k] !== json) { LIVE.failed[k] = json; errors.push(msg); } };
  const fresh = (name, list) => list.filter(([id, , j]) => LIVE.failed[name + ':' + id] !== j);
  try {
    const diff = liveDiff(liveCollect());
    /* removals first, children before parents */
    for (const { name, d, gone } of [...diff].reverse()) {
      const ids = gone.filter(id => LIVE.failed[name + ':' + id] !== 'gone'); if (!ids.length) continue;
      liveStatus('Saving…');
      const q = d.soft ? sb.from(d.table).update({ deleted_at: new Date().toISOString() }) : sb.from(d.table).delete();
      const { error } = await q.in('id', ids);
      if (error) ids.forEach(id => fail(name, id, 'gone', error.message)); else { ids.forEach(id => LIVE.snap[name].delete(id)); wrote += ids.length; }
    }
    for (const { name, d, add, change } of diff) {
      const ok = (list, bad) => { const b = new Set(bad.map(x => x[0][0])); for (const [id, , j] of list) if (!b.has(id)) { LIVE.snap[name].set(id, j); delete LIVE.failed[name + ':' + id]; wrote++; } bad.forEach(([x, msg]) => fail(name, x[0], x[2], msg)); };
      if (d.mode === 'update') {
        for (const x of fresh(name, change)) { liveStatus('Saving…'); const { id, company_id, ...patch } = x[1]; const { error } = await sb.from(d.table).update(patch).eq('id', x[0]); ok([x], error ? [[x, error.message]] : []); }
        continue;
      }
      const a = fresh(name, add), c = d.mode === 'insert' ? [] : fresh(name, change);
      if (d.mode === 'insert') for (const [id, , j] of change) LIVE.snap[name].set(id, j);          // insert-only rows are never rewritten
      if (a.length) { liveStatus('Saving…'); const bad = await liveWrite(d, a, true); ok(a, bad); if (d.after) try { await d.after(a.filter(x => !bad.some(b => b[0] === x)).map(x => x[0])); } catch (e) { console.warn('QuoteFlow:', e); } }
      if (c.length) { liveStatus('Saving…'); ok(c, await liveWrite(d, c, false)); }
    }
  } catch (e) { errors.push(e.message); }
  LIVE.busy = false;
  const stuck = Object.keys(LIVE.failed).length;
  if (errors.length) toast('Some changes were not saved', errors[0], 'err');
  liveStatus(stuck ? `${stuck} change${stuck > 1 ? 's' : ''} not saved` : 'All changes saved', stuck);
  if (LIVE.again) liveTouch();
}

/* the database issues the receipt for a payment (payment_recorded trigger); adopt its id and number */
async function lvReceipts(payIds) {
  if (!payIds.length) return;
  const { data, error } = await sb.from('payment_receipts').select('id, number, payment_id').in('payment_id', payIds);
  if (error || !data) return;
  let changed = false;
  for (const r of data) {
    const p = S.payments.find(x => x.id === r.payment_id), rc = S.receipts.find(x => x.payId === r.payment_id);
    if (rc) { rc.id = r.id; if (rc.no !== r.number) { rc.no = r.number; changed = true; } }
    if (p) p.rcpt = r.number;
    const n = +(r.number.match(/(\d+)$/) || [])[1]; if (n >= S.settings.rcptNext) S.settings.rcptNext = n + 1;
  }
  if (changed) rerender();
}
