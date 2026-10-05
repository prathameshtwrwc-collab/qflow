/* ================= utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const TODAY = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; })();
const addDays = (d, n) => new Date(+d + n * DAY);
const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fdate = s => { if (!s) return '—'; const d = typeof s === 'string' ? parse(s.slice(0, 10)) : s; return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fdateS = s => { const d = typeof s === 'string' ? parse(s.slice(0, 10)) : s; return `${d.getDate()} ${MON[d.getMonth()]}`; };
const ftime = ts => { const d = new Date(ts); return `${fdate(d)}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`; };
const rel = ts => {
  const diff = Date.now() - ts; const m = Math.round(diff / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return fdate(new Date(ts));
};
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
const CUR = { INR: { sym: '₹', loc: 'en-IN' }, USD: { sym: '$', loc: 'en-US' }, EUR: { sym: '€', loc: 'de-DE' }, GBP: { sym: '£', loc: 'en-GB' }, AED: { sym: 'AED ', loc: 'en-AE' } };
const cur = () => CUR[S.settings.currency] || CUR.INR;
const money = (n, dp = 0) => cur().sym + Number(n || 0).toLocaleString(cur().loc, { minimumFractionDigits: dp, maximumFractionDigits: dp });
const money2 = n => money(n, 2);
const moneyC = n => {
  const c = cur(); n = Number(n || 0);
  if (c.loc === 'en-IN') {
    if (Math.abs(n) >= 1e7) return c.sym + (n / 1e7).toFixed(2) + ' Cr';
    if (Math.abs(n) >= 1e5) return c.sym + (n / 1e5).toFixed(1) + ' L';
  } else {
    if (Math.abs(n) >= 1e6) return c.sym + (n / 1e6).toFixed(2) + 'M';
  }
  if (Math.abs(n) >= 1e3) return c.sym + (n / 1e3).toFixed(1) + 'K';
  return c.sym + Math.round(n);
};
const pct = (a, b) => b ? Math.round((a / b) * 1000) / 10 : 0;
const numF = n => Number(n || 0).toLocaleString('en-IN');
/* a live workspace needs database ids; the demo keeps its short readable ones */
const uid = p => S.live ? crypto.randomUUID() : p + Math.random().toString(36).slice(2, 9);
/* called after every user action; live.js replaces it with the save scheduler */
let liveTouch = () => { };
const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const AV_COL = ['#0E7C66', '#2B5FA6', '#9A620F', '#0E6F87', '#5A6478', '#7A4E2D', '#3F6B3A', '#8A3B4A', '#35507A', '#6B5B1F'];
const avColor = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV_COL[h % AV_COL.length]; };
const av = (name, cls = '') => `<span class="av ${cls}" style="background:${avColor(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const badge = (st, label) => `<span class="badge s-${String(st).toLowerCase().replace(/\s+/g, '-')}">${esc(label || cap(st))}</span>`;

function numberToWordsIN(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
  const three = n => (n >= 100 ? a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');
  let out = [];
  const cr = Math.floor(num / 1e7); num %= 1e7;
  const la = Math.floor(num / 1e5); num %= 1e5;
  const th = Math.floor(num / 1e3); num %= 1e3;
  if (cr) out.push(three(cr) + ' Crore');
  if (la) out.push(two(la) + ' Lakh');
  if (th) out.push(two(th) + ' Thousand');
  if (num) out.push(three(num));
  return out.join(' ');
}

/* ================= icons ================= */
const IP = {
  logo: '<path d="M5 4h10l4 4v12H5z" stroke="#fff"/><path d="M9 12h6M9 16h4" stroke="#5ED1B2"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  kanban: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M21 3 10 14"/><path d="M21 3 14 21l-4-7-7-4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  wa: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1z"/><path d="M9 9.5c.3 2.3 2.2 4.3 4.6 4.7l1.2-1.2 1.9.9c-.3 1.3-1.4 1.9-2.6 1.7-3.1-.6-5.6-3.1-6.1-6.2-.2-1.2.5-2.3 1.7-2.5l.9 1.9z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  xc: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  hour: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
  up: '<path d="m7 14 5-5 5 5"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.3M8.2 13.2l7.6 4.3"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  sms: '<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  tg: '<path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  rupee: '<path d="M7 4h11M7 9h11M7 4c6 0 7 5 0 7l8 9"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  userplus: '<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 3.5-6 7-6s6 2 7 6M19 8v6M16 11h6"/>',
  note: '<path d="M5 3h14v12l-6 6H5z"/><path d="M13 21v-6h6M9 8h6M9 12h3"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  building: '<path d="M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.4-1.2-1.6-1.2-2.8 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4c0-4.3-4-7.8-9-7.8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.5-1.5a4 4 0 0 1-5-5L9 6 6 3 3 6l3 3 2-2"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
  store: '<path d="M4 9h16l-1-5H5zM5 9v11h14V9M9 20v-6h6v6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
  factory: '<path d="M3 21V10l6 4V10l6 4V6h6v15z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17h10v4H7z"/>',
  cols: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
};
const I = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IP[n] || ''}</svg>`;

/* ================= seeded random ================= */
let _seed = 20260917;
const rnd = () => { _seed = (_seed * 1664525 + 1013904223) % 4294967296; return _seed / 4294967296; };
const ri = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const wpick = (pairs) => { const t = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * t; for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0]; };

/* ================= reference data ================= */
const SALES = [
  { id: 'sp1', name: 'Aarav Mehta', role: 'Owner', email: 'aarav@meridianworks.in' },
  { id: 'sp2', name: 'Priya Nair', role: 'Sales Manager', email: 'priya@meridianworks.in' },
  { id: 'sp3', name: 'Rohan Kulkarni', role: 'Sales Executive', email: 'rohan@meridianworks.in' },
  { id: 'sp4', name: 'Sneha Iyer', role: 'Sales Executive', email: 'sneha@meridianworks.in' },
];
/* the person using the app: the demo owner until a real login replaces it (enterLive in auth.js) */
const ME = { name: SALES[0].name, email: SALES[0].email };
const spName = id => (SALES.find(s => s.id === id) || {}).name || '—';
const TAXES = [0, 5, 12, 18, 28];
const UNITS = ['nos', 'sq ft', 'sq m', 'rft', 'hour', 'day', 'set', 'kg', 'box', 'lot', 'month', 'year', 'job'];
const CATEGORIES = {
  agency: { label: 'Digital agency', icon: 'sparkle', desc: 'Retainers, deliverables and milestones', fields: [['deliverables', 'Deliverables', 'Website, 12 social creatives, launch video'], ['milestones', 'Milestones', 'Discovery · Design · Build · Launch'], ['timeline', 'Timeline', '6 weeks'], ['revisions', 'Revision limit', '2 rounds per deliverable']] },
  contractor: { label: 'Contractor', icon: 'wrench', desc: 'Materials, labour and site work', fields: [['site', 'Site location', 'Plot 14, Hinjewadi Phase 2, Pune'], ['materials', 'Materials by', 'Contractor supplied'], ['labour', 'Labour crew', '8 workers, 2 supervisors'], ['duration', 'Work duration', '21 working days']] },
  wholesale: { label: 'Wholesaler', icon: 'truck', desc: 'Bulk pricing, SKUs and shipping', fields: [['moq', 'Minimum order', '50 units per SKU'], ['shipping', 'Shipping terms', 'FOR destination, 5–7 days'], ['packing', 'Packing', 'Palletised, shrink-wrapped'], ['validity', 'Price validity', 'Subject to stock']] },
  freelancer: { label: 'Freelancer', icon: 'pen', desc: 'Hourly rates and payment schedules', fields: [['rate', 'Hourly rate', '₹2,500 / hour'], ['hours', 'Estimated hours', '40 hours'], ['milestones', 'Milestones', 'Draft, revision, final handover'], ['schedule', 'Payment schedule', '40% upfront, 60% on delivery']] },
  manufacturer: { label: 'Manufacturer', icon: 'factory', desc: 'Production runs and lead times', fields: [['leadtime', 'Lead time', '4 weeks from PO'], ['tooling', 'Tooling', 'One-time, included'], ['inspection', 'Inspection', 'Pre-dispatch QC report'], ['warranty', 'Warranty', '12 months']] },
  retail: { label: 'Retailer', icon: 'store', desc: 'Store pricing and delivery', fields: [['delivery', 'Delivery', 'Free within city limits'], ['install', 'Installation', 'Included'], ['warranty', 'Warranty', 'Brand warranty applies'], ['exchange', 'Exchange', '7-day exchange']] },
  services: { label: 'Service provider', icon: 'briefcase', desc: 'AMCs, visits and service plans', fields: [['scope', 'Scope', 'Quarterly preventive maintenance'], ['visits', 'Visits', '4 scheduled + 2 breakdown'], ['response', 'Response time', 'Within 24 hours'], ['term', 'Contract term', '12 months']] },
  consulting: { label: 'Consultant', icon: 'target', desc: 'Engagements and advisory retainers', fields: [['engagement', 'Engagement', 'Fixed-scope advisory'], ['duration', 'Duration', '3 months'], ['reviews', 'Review cadence', 'Fortnightly'], ['schedule', 'Payment schedule', 'Monthly in advance']] },
};

const PRODUCT_SEED = [
  ['Modular workstation (4-seater)', 'Furniture', 'Linear cluster with 25mm prelam top, cable tray and privacy screens', 'MW-WS4', 64500, 'set', 18, 47800],
  ['Ergonomic task chair', 'Furniture', 'Mesh back, synchro tilt, adjustable lumbar and 3D arms', 'MW-CH12', 11800, 'nos', 18, 8200],
  ['Glass partition (12mm toughened)', 'Fit-out', 'Frameless partition with aluminium channels, frosted film band', 'MW-GP12', 685, 'sq ft', 18, 470],
  ['Gypsum false ceiling', 'Fit-out', 'Grid ceiling with 12.5mm board, taped and primed', 'MW-FC01', 145, 'sq ft', 18, 96],
  ['LED panel light 2x2', 'Electrical', '36W recessed panel, 4000K, 5-year warranty', 'MW-LED36', 2350, 'nos', 18, 1580],
  ['Electrical wiring & points', 'Electrical', 'Concealed FRLS wiring with modular switches, per point', 'MW-EW01', 1450, 'nos', 18, 980],
  ['Carpet tiles (nylon)', 'Flooring', '50x50 cm loop pile tiles with installation', 'MW-CT50', 1180, 'sq m', 12, 810],
  ['Vinyl plank flooring', 'Flooring', '4mm SPC click-lock planks, installed', 'MW-VP04', 118, 'sq ft', 12, 78],
  ['Interior design consultation', 'Design services', 'Space planning and concept direction with senior designer', 'SV-IDC', 3500, 'hour', 18, 1400],
  ['3D visualisation', 'Design services', 'Photoreal render per view with two revision rounds', 'SV-3DV', 8500, 'nos', 18, 3200],
  ['Site survey & measurement', 'Design services', 'Laser measurement, as-built drawing and site photographs', 'SV-SSM', 12000, 'job', 18, 4500],
  ['Project management fee', 'Services', 'End-to-end execution oversight, weekly reporting', 'SV-PMF', 45000, 'month', 18, 22000],
  ['Annual maintenance plan', 'Services', 'Quarterly preventive maintenance with breakdown support', 'SV-AMC', 96000, 'year', 18, 51000],
  ['Acoustic wall panels', 'Fit-out', 'PET felt panels, 9mm, fabric finish', 'MW-AP09', 420, 'sq ft', 18, 265],
  ['Conference table (10-seater)', 'Furniture', 'Veneer top with integrated power box', 'MW-CT10', 98000, 'nos', 18, 71000],
  ['Painting (premium emulsion)', 'Fit-out', 'Two coats on putty-finished walls, labour and material', 'MW-PT01', 38, 'sq ft', 18, 24],
  ['Brand signage (acrylic)', 'Branding', 'Backlit acrylic logo sign, up to 6 ft', 'BR-SG06', 42000, 'nos', 18, 26000],
  ['Workspace branding kit', 'Branding', 'Wall graphics, wayfinding and vinyl frosting design + install', 'BR-KIT', 68000, 'set', 18, 39000],
];

const FIRST = ['Ananya', 'Vikram', 'Neha', 'Arjun', 'Kavya', 'Rahul', 'Meera', 'Siddharth', 'Isha', 'Karan', 'Pooja', 'Aditya', 'Riya', 'Nikhil', 'Tanvi', 'Harsh', 'Divya', 'Manish', 'Shreya', 'Varun', 'Anjali', 'Rohit', 'Sanya', 'Kunal', 'Nisha', 'Amit', 'Farah', 'Gaurav', 'Lakshmi', 'Imran', 'Deepa', 'Yash', 'Zoya', 'Sameer', 'Bhavna', 'Omkar', 'Trisha', 'Jatin', 'Ayesha', 'Ravi'];
const LAST = ['Sharma', 'Patel', 'Deshpande', 'Reddy', 'Kapoor', 'Joshi', 'Menon', 'Bhatia', 'Chauhan', 'Rao', 'Gupta', 'Kulkarni', 'Shah', 'Pillai', 'Verma', 'Malhotra', 'Naik', 'Sethi', 'Banerjee', 'Qureshi', 'Fernandes', 'Agarwal', 'Pawar', 'Das', 'Khanna'];
const CO_A = ['Sahyadri', 'Vistara', 'Lumen', 'Kaveri', 'Northstar', 'Arcadia', 'Pinnacle', 'Monsoon', 'Evergreen', 'Silverline', 'Indus', 'Zenith', 'Harbor', 'Trident', 'Bluepeak', 'Saffron', 'Orbit', 'Granite', 'Aurum', 'Crescent', 'Nimbus', 'Vertex', 'Coastal', 'Banyan', 'Keystone', 'Meridian', 'Tatva', 'Nexa', 'Riverbend', 'Sterling'];
const CO_B = ['Technologies', 'Foods', 'Logistics', 'Pharma', 'Realty', 'Clinics', 'Fintech', 'Hospitality', 'Textiles', 'Labs', 'Retail', 'Motors', 'Studios', 'Legal LLP', 'Infra', 'Education', 'Analytics', 'Coworking', 'Exports', 'Healthcare'];
const CITIES = ['Pune', 'Mumbai', 'Navi Mumbai', 'Thane', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Nashik', 'Nagpur', 'Goa', 'Chennai', 'Delhi NCR'];
const PROJECTS = ['Office fit-out', 'Reception redesign', 'Floor expansion', 'Conference rooms', 'Cafeteria refresh', 'Branch interiors', 'Lab refurbishment', 'Workstation upgrade', 'Annual maintenance', 'Brand refresh', 'Showroom interiors', 'Clinic interiors', 'Co-working floor', 'Training centre', 'Lighting retrofit', 'Acoustic treatment'];
const PAY_TERMS = [['advance', 'Advance payment', 0], ['receipt', 'Due on receipt', 0], ['net7', 'Net 7', 7], ['net15', 'Net 15', 15], ['net30', 'Net 30', 30], ['net45', 'Net 45', 45], ['net60', 'Net 60', 60], ['custom', 'Custom', null]];
const termDays = (code, custom) => code === 'custom' ? (+custom || 0) : (PAY_TERMS.find(t => t[0] === code) || [])[2] || 0;
const termLabel = (code, custom) => code === 'custom' ? `Custom (${+custom || 0} days)` : (PAY_TERMS.find(t => t[0] === code) || ['', 'Net 15'])[1];
const PAY_METHODS = ['Bank transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash', 'Card', 'Other'];
const CN_REASONS = ['Product return', 'Price adjustment', 'Excess billing', 'Cancellation', 'Discount adjustment', 'Other'];
const DC_STATUS = [['draft', 'Draft'], ['dispatched', 'Dispatched'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const TRANSPORTERS = ['Gati KWE', 'VRL Logistics', 'Safexpress', 'TCI Express', 'Own vehicle'];
const HSN_BY_CAT = { Furniture: '9403', 'Fit-out': '9406', Flooring: '5703', Electrical: '8539', Branding: '4911', 'Design services': '998391', Services: '995461' };
const STATES = ['Maharashtra', 'Karnataka', 'Telangana', 'Gujarat', 'Delhi', 'Tamil Nadu', 'West Bengal', 'Haryana'];
const CITY_STATE = { Pune: 'Maharashtra', Mumbai: 'Maharashtra', Nashik: 'Maharashtra', Nagpur: 'Maharashtra', Bengaluru: 'Karnataka', Hyderabad: 'Telangana', Ahmedabad: 'Gujarat', Surat: 'Gujarat', Delhi: 'Delhi', Gurugram: 'Haryana', Noida: 'Delhi', Chennai: 'Tamil Nadu', Kolkata: 'West Bengal', Indore: 'Madhya Pradesh', Jaipur: 'Rajasthan', Kochi: 'Kerala', Coimbatore: 'Tamil Nadu', Lucknow: 'Uttar Pradesh' };

/* sequential document numbers, never reused */
function nextNo(kind) {
  const s = S.settings;
  const map = { quote: ['prefix', 'nextNo'], order: ['ordPrefix', 'ordNext'], invoice: ['invPrefix', 'invNext'], dc: ['dcPrefix', 'dcNext'], cn: ['cnPrefix', 'cnNext'], dn: ['dnPrefix', 'dnNext'], rcpt: ['rcptPrefix', 'rcptNext'] };
  const [pk, nk] = map[kind];
  if (s[nk] == null) s[nk] = 1;
  const n = s[nk]++;
  return s[pk] + (kind === 'rcpt' || kind === 'dc' ? String(n).padStart(4, '0') : n);
}
function logAudit(docType, docId, action, detail = '') {
  S.audit.push({ id: uid('a'), docType, docId, action, detail, by: ME.name, ts: Date.now() });
}
const auditOf = (t, id) => S.audit.filter(a => a.docType === t && a.docId === id).sort((a, b) => a.ts - b.ts);
const REJECT_REASONS = ['Price higher than budget', 'Chose another vendor', 'Project postponed', 'Scope changed', 'Timeline did not work'];

/* ================= state ================= */
const S = {
  settings: {
    bizName: 'Meridian Works', legal: 'Meridian Works Interiors Pvt. Ltd.', tagline: 'Workspace design & fit-out',
    email: 'hello@meridianworks.in', phone: '+91 98220 41567', website: 'meridianworks.in',
    address: '4th Floor, Kalpataru Square, Baner Road', city: 'Pune, Maharashtra 411045', gstin: '27AAJCM4821K1Z6',
    currency: 'INR', category: 'contractor', defaultTax: 18, taxLabel: 'GST', taxInclusive: false,
    prefix: 'QT-', nextNo: 1, invPrefix: 'INV-', invNext: 1, validity: 30,
    template: 'minimal', brand: '#0E7C66', font: 'Inter', header: 'split', footer: 'Thank you for considering Meridian Works. We look forward to building with you.',
    terms: '1. Prices are valid until the expiry date on this quotation.\n2. 50% advance with purchase order, balance on completion.\n3. Delivery timelines start from receipt of advance and approved drawings.\n4. Any work outside the stated scope will be quoted separately.\n5. Warranty as per manufacturer terms; workmanship warranty of 12 months.',
    paymentTerms: '50% advance, 40% on material delivery, 10% on handover',
    bank: { accName: 'Meridian Works Interiors Pvt. Ltd.', bankName: 'HDFC Bank', acc: '50200041587632', ifsc: 'HDFC0001234', branch: 'Baner, Pune', upi: 'meridianworks@hdfcbank', qr: true },
    showBank: true, roundOff: true, state: 'Maharashtra', stateCode: '27',
    dcPrefix: 'DC-', dcNext: 1, cnPrefix: 'CN-', cnNext: 1, dnPrefix: 'DN-', dnNext: 1, rcptPrefix: 'RCPT-', rcptNext: 1, ordPrefix: 'SO-',
    termsCode: 'net15',
    notif: { accepted: true, rejected: true, viewed: true, expiring: true, followup: true, digest: false },
    workspace: 'ws1',
  },
  workspaces: [
    { id: 'ws1', name: 'Meridian Works', sub: 'Pune · Business plan', color: '#0E7C66', init: 'MW' },
    { id: 'ws2', name: 'Meridian Studio', sub: 'Design practice', color: '#2B5FA6', init: 'MS' },
    { id: 'ws3', name: 'Meridian Supplies', sub: 'Wholesale division', color: '#9A620F', init: 'SU' },
  ],
  products: [], customers: [], quotes: [], invoices: [], orders: [], followups: [], leads: [], notes: [], notifications: [],
  payments: [], receipts: [], challans: [], cnotes: [], dnotes: [], audit: [],
  team: [
    { ...SALES[0], status: 'active', last: 'Online now' },
    { ...SALES[1], status: 'active', last: '2 hr ago' },
    { ...SALES[2], status: 'active', last: 'Yesterday' },
    { ...SALES[3], status: 'active', last: '3 days ago' },
    { id: 'sp5', name: 'Farhan Siddiqui', role: 'Accountant', email: 'accounts@meridianworks.in', status: 'invited', last: 'Invite pending' },
  ],
};

function genData() {
  S.products = PRODUCT_SEED.map((p, i) => ({ id: 'p' + (i + 1), name: p[0], category: p[1], desc: p[2], sku: p[3], hsn: HSN_BY_CAT[p[1]] || '9403', price: p[4], unit: p[5], tax: p[6], cost: p[7], active: i !== 15 || true, created: iso(addDays(TODAY, -400 + i * 7)) }));
  S.products[16].active = false;

  const NCUST = 500;
  const usedCo = new Set();
  for (let i = 0; i < NCUST; i++) {
    const fn = pick(FIRST), ln = pick(LAST);
    let co; do { co = pick(CO_A) + ' ' + pick(CO_B); } while (usedCo.has(co) && usedCo.size < 590); usedCo.add(co);
    const since = addDays(TODAY, -ri(0, 720));
    const city = pick(CITIES);
    S.customers.push({
      id: 'c' + (i + 1), name: `${fn} ${ln}`, company: co,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${co.split(' ')[0].toLowerCase()}${pick(['.in', '.com', '.co.in'])}`,
      phone: `+91 ${pick(['98', '97', '99', '90', '88', '70'])}${ri(100, 999)} ${ri(10000, 99999)}`,
      type: wpick([['Business', 8], ['Individual', 1], ['Government', 1]]), city, since: iso(since),
      gstin: rnd() > .3 ? `27${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))}${ri(1000, 9999)}${String.fromCharCode(65 + ri(0, 25))}1Z${ri(1, 9)}` : '',
      owner: pick(SALES).id, address: `${ri(1, 220)}, ${pick(['MG Road', 'Link Road', 'Senapati Bapat Road', 'Outer Ring Road', 'LBS Marg', 'SG Highway', 'Old Airport Road'])}, ${city}`,
      state: CITY_STATE[city] || 'Maharashtra', pin: String(ri(110, 682)) + String(ri(100, 999)),
      creditLimit: wpick([[0, 3], [200000, 2], [500000, 3], [1000000, 2]]), terms: pick(['net15', 'net30', 'net30', 'receipt', 'net45']),
      shipSame: rnd() > .18, shipTo: null,
    });
  }
  // quotations
  const quoted = S.customers.filter(() => rnd() < 0.64);
  let qn = 1001;
  const allQ = [];
  for (const c of quoted) {
    const n = wpick([[1, 50], [2, 28], [3, 14], [4, 8]]);
    for (let k = 0; k < n; k++) {
      const minAge = Math.max(0, daysBetween(c.since, iso(TODAY)) * -1);
      let age = ri(0, Math.min(360, Math.max(2, daysBetween(c.since, iso(TODAY)))));
      const date = addDays(TODAY, -age);
      allQ.push({ c, date });
    }
  }
  allQ.sort((a, b) => a.date - b.date);
  for (const { c, date } of allQ) {
    const items = [];
    const ni = wpick([[1, 2], [2, 4], [3, 4], [4, 2], [5, 1]]);
    const used = new Set();
    for (let j = 0; j < ni; j++) {
      let p; do { p = pick(S.products); } while (used.has(p.id)); used.add(p.id);
      const qty = ['sq ft'].includes(p.unit) ? ri(4, 45) * 50 : p.unit === 'sq m' ? ri(8, 60) * 5 : p.unit === 'hour' ? ri(6, 40) : ri(1, p.price > 40000 ? 3 : 18);
      items.push({ id: uid('i'), type: 'item', pid: p.id, name: p.name, desc: p.desc, sku: p.sku, hsn: p.hsn, qty, unit: p.unit, price: p.price, disc: pick([0, 0, 0, 5, 10]), tax: p.tax });
    }
    const age = daysBetween(iso(date), iso(TODAY));
    let status = wpick([['accepted', 30], ['rejected', 19], ['viewed', 18], ['sent', 16], ['draft', 7]]);
    if (age < 3 && status === 'accepted') status = 'viewed';
    const expiry = iso(addDays(date, 30));
    if ((status === 'sent' || status === 'viewed') && parse(expiry) < TODAY) status = 'expired';
    const q = {
      id: 'q' + qn, no: 'QT-' + qn, cid: c.id, project: pick(PROJECTS), date: iso(date), expiry,
      sp: c.owner, items, odisc: pick([0, 0, 0, 2, 5]), odiscType: 'pct', ship: pick([0, 0, 2500, 5000, 12000]), extra: 0, extraLabel: 'Additional charges',
      advance: pick([0, 25, 50]), notes: 'Rates include transportation to site and debris removal.', terms: S.settings.terms, paymentTerms: S.settings.paymentTerms,
      category: 'contractor', catFields: { site: c.address }, template: 'minimal',
      po: { has: false, no: '', date: '', ref: '' }, jobNo: '', shipSame: true, shipTo: null,
      termsCode: c.terms || 'net15', termsDays: 0, cess: 0, tds: { on: false, rate: 2 },
      status, views: 0, sentAt: null, viewedAt: null, respondedAt: null, reason: '', comms: [], feedback: [],
      created: +date + ri(9, 12) * 3600000,
    };
    if (status !== 'draft') { q.sentAt = q.created + ri(1, 26) * 3600000; }
    if (['viewed', 'accepted', 'rejected'].includes(status) || (status === 'expired' && rnd() > .4)) { q.views = ri(1, 7); q.viewedAt = q.sentAt + ri(1, 72) * 3600000; }
    if (status === 'accepted' || status === 'rejected') { q.respondedAt = Math.min(q.viewedAt + ri(4, 240) * 3600000, Date.now() - 3600000); }
    if (status === 'rejected') q.reason = pick(REJECT_REASONS);
    q.total = calcQuote(q).grand;
    buildComms(q, c);
    S.quotes.push(q);
    qn++;
  }
  S.settings.nextNo = qn;
  // orders, challans, invoices, payments, receipts
  let inv = 501, ord = 301, dc = 1, rcpt = 1;
  for (const q of S.quotes.filter(x => x.status === 'accepted')) {
    if (rnd() < 0.82) {
      let od = addDays(parse(iso(new Date(q.respondedAt))), ri(0, 3)); if (od > TODAY) od = new Date(TODAY);
      const hasPo = rnd() < 0.55;
      if (hasPo) { q.po = { has: true, no: 'PO-' + ri(3000, 9800), date: iso(addDays(od, -ri(0, 4))), ref: pick(['Purchase dept', 'Projects team', 'Admin', '']) }; }
      if (rnd() < 0.5) q.jobNo = 'JOB-2026-' + String(ri(1, 180)).padStart(3, '0');
      const o = { id: 'o' + ord, no: 'SO-' + ord, qid: q.id, cid: q.cid, amount: q.total, date: iso(od),
        po: q.po, jobNo: q.jobNo, termsCode: q.termsCode, delivery: iso(addDays(od, ri(10, 45))), sp: q.sp, notes: '',
        status: parse(iso(od)) < addDays(TODAY, -40) ? 'completed' : wpick([['confirmed', 2], ['processing', 3]]) };
      S.orders.push(o); ord++;
      logAudit('order', o.id, 'Sales order created', `From ${q.no}`);

      // delivery challan for orders that are moving or done
      if (o.status !== 'confirmed' && rnd() < 0.7) {
        const dd = addDays(od, ri(5, 30)); const dispatched = dd <= TODAY;
        const ch = { id: 'dc' + dc, no: 'DC-' + String(dc).padStart(4, '0'), oid: o.id, qid: q.id, cid: q.cid,
          date: iso(dispatched ? dd : TODAY), dispatch: dispatched ? iso(dd) : '', transporter: pick(TRANSPORTERS),
          vehicle: `MH ${ri(10, 48)} ${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))} ${ri(1000, 9999)}`,
          receivedBy: dispatched && rnd() > .4 ? pick(['Site supervisor', 'Store in-charge', 'Facility manager']) : '',
          notes: '', status: !dispatched ? 'draft' : (o.status === 'completed' || rnd() > .4 ? 'delivered' : 'dispatched') };
        S.challans.push(ch); dc++;
        logAudit('challan', ch.id, 'Delivery challan created', `For ${o.no}`);
      }

      if (rnd() < 0.9) {
        let idate = addDays(od, ri(0, 5)); if (idate > TODAY) idate = new Date(TODAY);
        const days = termDays(q.termsCode) || 15; const due = addDays(idate, days);
        let st = due < TODAY ? wpick([['paid', 7], ['overdue', 2], ['partially-paid', 1]]) : wpick([['sent', 4], ['paid', 2], ['draft', 1], ['partially-paid', 1]]);
        const iv = { id: 'inv' + inv, no: 'INV-' + inv, qid: q.id, oid: o.id, cid: q.cid, amount: q.total, paid: 0,
          date: iso(idate), due: iso(due), termsCode: q.termsCode, termsDays: days, po: q.po, jobNo: q.jobNo,
          advance: q.advance || 0, attachments: [], status: st };
        S.invoices.push(iv);
        logAudit('invoice', iv.id, 'Invoice created', `From ${q.no}`);
        if (st !== 'draft') logAudit('invoice', iv.id, 'Invoice sent', 'Emailed to ' + cust(q.cid).email);
        // payments
        const payTotal = st === 'paid' ? q.total : st === 'partially-paid' ? Math.round(q.total * pick([.3, .4, .5, .6])) : 0;
        if (payTotal > 0) {
          const parts = st === 'paid' && rnd() > .5 ? 2 : 1;
          let left = payTotal;
          for (let k = 0; k < parts; k++) {
            const amt = k === parts - 1 ? left : Math.round(payTotal / 2);
            left -= amt;
            const pd = addDays(idate, ri(2, Math.max(3, days + 10))); const pdate = pd > TODAY ? addDays(TODAY, -ri(0, 30)) : pd;
            const method = pick(PAY_METHODS.slice(0, 6));
            const pay = { id: 'pay' + (S.payments.length + 1), no: 'PAY-' + String(S.payments.length + 1).padStart(4, '0'),
              invId: iv.id, cid: q.cid, amount: amt, date: iso(pdate), method,
              ref: method === 'Cheque' ? '' : method + String(ri(100000, 999999)),
              cheque: method === 'Cheque' ? String(ri(100000, 999999)) : '', bank: method === 'Cheque' || method.includes('Bank') ? pick(['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'SBI']) : '',
              notes: '', by: 'Aarav Mehta', ts: +pdate };
            S.payments.push(pay);
            const rc = { id: 'rc' + rcpt, no: 'RCPT-' + String(rcpt).padStart(4, '0'), payId: pay.id, invId: iv.id, cid: q.cid, amount: amt, date: pay.date, method, ref: pay.ref };
            S.receipts.push(rc); pay.rcpt = rc.no; rcpt++;
            logAudit('invoice', iv.id, `Payment ${money(amt)} recorded`, `${method}${pay.ref ? ' · ' + pay.ref : ''}`);
          }
          iv.paid = payTotal;
        }
        q.invoiced = iv.id;
        inv++;
      }
    }
  }
  // credit & debit notes against a few invoices
  const cnPool = S.invoices.filter(i => i.status === 'paid' || i.status === 'partially-paid');
  let cnN = 1, dnN = 1;
  cnPool.filter(() => rnd() < 0.06).slice(0, 9).forEach(iv => {
    const taxable = Math.round(iv.amount * pick([.03, .05, .08, .12]) / 118 * 100);
    S.cnotes.push({ id: 'cn' + cnN, no: 'CN-' + cnN, invId: iv.id, cid: iv.cid, date: iso(addDays(parse(iv.date), ri(3, 40)) > TODAY ? TODAY : addDays(parse(iv.date), ri(3, 40))),
      reason: pick(CN_REASONS), qty: pick(['2 chairs returned', 'Rate revision as agreed', 'Short supply adjusted', '1 partition cancelled']),
      taxable, rate: 18, tax: Math.round(taxable * 18) / 100, total: Math.round(taxable * 1.18 * 100) / 100, notes: '', by: 'Aarav Mehta' });
    logAudit('invoice', iv.id, `Credit note CN-${cnN} raised`, money(Math.round(taxable * 1.18)));
    cnN++;
  });
  cnPool.filter(() => rnd() < 0.02).slice(0, 4).forEach(iv => {
    const taxable = Math.round(iv.amount * pick([.02, .04]) / 118 * 100);
    S.dnotes.push({ id: 'dn' + dnN, no: 'DN-' + dnN, invId: iv.id, cid: iv.cid, date: iso(addDays(parse(iv.date), ri(5, 30)) > TODAY ? TODAY : addDays(parse(iv.date), ri(5, 30))),
      reason: pick(['Additional site work', 'Extra material issued', 'Freight recovery']), qty: '', taxable, rate: 18,
      tax: Math.round(taxable * 18) / 100, total: Math.round(taxable * 1.18 * 100) / 100, notes: '', by: 'Aarav Mehta' });
    dnN++;
  });
  S.settings.cnNext = cnN; S.settings.dnNext = dnN;
  S.settings.dcNext = dc; S.settings.rcptNext = rcpt; S.settings.ordNext = ord;
  S.settings.invNext = inv;
  // follow-ups
  const fuTypes = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site visit'];
  const open = S.quotes.filter(q => ['sent', 'viewed'].includes(q.status)).slice(-60);
  open.forEach((q, i) => {
    if (i % 2) return;
    const c = cust(q.cid);
    const off = ri(-6, 10);
    S.followups.push({ id: uid('f'), cid: q.cid, qid: q.id, type: pick(fuTypes), due: iso(addDays(TODAY, off)), sp: q.sp, status: off < -3 && rnd() > .6 ? 'done' : 'pending', note: pick([`Check if ${c.name.split(' ')[0]} has reviewed the revised layout`, 'Confirm budget approval from finance', 'Share material samples and finish options', 'Discuss payment milestones', 'Walk through the 3D renders on a call', 'Follow up on the site-visit date']), created: Date.now() - ri(1, 20) * DAY });
  });
  // leads (pipeline)
  const stages = ['new', 'contacted', 'requirement', 'created', 'sent', 'viewed', 'negotiation', 'accepted', 'rejected', 'converted'];
  const recent = S.quotes.slice(-70);
  recent.forEach((q, i) => {
    if (i % 2) return;
    const map = { draft: 'created', sent: 'sent', viewed: rnd() > .5 ? 'viewed' : 'negotiation', accepted: q.invoiced ? 'converted' : 'accepted', rejected: 'rejected', expired: 'negotiation' };
    S.leads.push({ id: uid('l'), cid: q.cid, qid: q.id, title: q.project, value: q.total, stage: map[q.status], sp: q.sp, last: Date.now() - ri(1, 200) * 3600000, fu: iso(addDays(TODAY, ri(-3, 12))) });
  });
  const fresh = S.customers.filter(c => !S.quotes.some(q => q.cid === c.id)).slice(0, 16);
  fresh.forEach((c, i) => S.leads.push({ id: uid('l'), cid: c.id, qid: null, title: pick(PROJECTS), value: ri(4, 90) * 10000, stage: stages[i % 3], sp: c.owner, last: Date.now() - ri(1, 120) * 3600000, fu: iso(addDays(TODAY, ri(-2, 9))) }));
  buildShowcase();
  // notes
  S.notes.push({ id: uid('n'), cid: null, text: '', ts: 0 });
  // notifications
  const acc = S.quotes.filter(q => q.status === 'accepted').slice(-2);
  const vw = S.quotes.filter(q => q.status === 'viewed').slice(-2);
  const rj = S.quotes.filter(q => q.status === 'rejected').slice(-1);
  S.notifications = [
    ...acc.map((q, i) => ({ id: uid('nt'), kind: 'accepted', qid: q.id, text: `${cust(q.cid).company} accepted ${q.no}`, ts: Date.now() - (i + 1) * 3.2 * 3600000, read: false })),
    ...vw.map((q, i) => ({ id: uid('nt'), kind: 'viewed', qid: q.id, text: `${cust(q.cid).name} viewed ${q.no} (${q.views}×)`, ts: Date.now() - (i + 2) * 5 * 3600000, read: i > 0 })),
    ...rj.map(q => ({ id: uid('nt'), kind: 'rejected', qid: q.id, text: `${cust(q.cid).company} declined ${q.no}: ${q.reason.toLowerCase()}`, ts: Date.now() - 26 * 3600000, read: true })),
  ];
}

/* A fully linked demo chain: QT-1025 -> PO-4587 -> SO-1008 -> DC-0042 -> INV-1050 -> RCPT-0045 */
function buildShowcase() {
  const c = {
    id: 'c-abc', name: 'Rohit Deshpande', company: 'ABC Industries Pvt Ltd', email: 'rohit.deshpande@abcindustries.in',
    phone: '+91 98201 34567', type: 'Business', city: 'Mumbai', state: 'Maharashtra', pin: '400072',
    since: iso(addDays(TODAY, -420)), gstin: '27AABCA1234K1Z5', owner: SALES[0].id,
    address: 'Plot 22, MIDC Andheri East, Mumbai', creditLimit: 500000, terms: 'net30',
    shipSame: false, shipTo: { name: 'ABC Industries Pvt Ltd - Andheri site', address: 'Unit 4, Sakinaka Industrial Estate, Andheri East', city: 'Mumbai', state: 'Maharashtra', pin: '400072', gstin: '27AABCA1234K1Z5' },
  };
  S.customers.unshift(c);

  const pk = n => S.products.find(p => p.name.includes(n)) || S.products[0];
  const mk = (n, qty, disc = 0) => { const p = pk(n); return { id: uid('i'), type: 'item', pid: p.id, name: p.name, desc: p.desc, sku: p.sku, hsn: p.hsn, qty, unit: p.unit, price: p.price, disc, tax: p.tax }; };
  const qd = addDays(TODAY, -26);
  const q = {
    id: 'q-1025', no: 'QT-1025', cid: c.id, project: 'Office Interior - Andheri', jobNo: 'JOB-2026-041',
    date: iso(qd), expiry: iso(addDays(qd, 30)), sp: c.owner,
    items: [mk('Modular workstation', 6), mk('Ergonomic task chair', 24, 5), mk('Glass partition', 420), mk('Vinyl plank', 1800)],
    odisc: 2, odiscType: 'pct', ship: 12000, extra: 0, extraLabel: 'Additional charges', advance: 30,
    notes: 'Rates include transportation to site and debris removal.', terms: S.settings.terms, paymentTerms: S.settings.paymentTerms,
    category: 'contractor', catFields: { site: 'Unit 4, Sakinaka Industrial Estate, Andheri East, Mumbai' }, template: 'minimal',
    po: { has: true, no: 'PO-4587', date: iso(addDays(qd, 6)), ref: 'Projects team / Mr. Kulkarni' },
    shipSame: false, shipTo: c.shipTo, termsCode: 'net30', termsDays: 30, cess: 0, tds: { on: false, rate: 2 },
    status: 'accepted', views: 5, comms: [], feedback: [],
    created: +qd + 10 * 3600000,
  };
  q.sentAt = q.created + 4 * 3600000;
  q.viewedAt = q.sentAt + 20 * 3600000;
  q.respondedAt = +addDays(qd, 5) + 11 * 3600000;
  q.total = calcQuote(q).grand;
  buildComms(q, c);
  S.quotes.unshift(q);
  logAudit('quote', q.id, 'Quotation created', 'QT-1025 for ABC Industries Pvt Ltd');

  const od = addDays(qd, 6);
  const o = { id: 'o-1008', no: 'SO-1008', qid: q.id, cid: c.id, amount: q.total, date: iso(od), po: q.po, jobNo: q.jobNo,
    termsCode: 'net30', delivery: iso(addDays(od, 21)), sp: q.sp, notes: 'Site handover after 6 pm on working days.', status: 'completed' };
  S.orders.unshift(o);
  logAudit('order', o.id, 'Sales order created', 'From QT-1025, customer PO-4587');

  const dd = addDays(od, 12);
  const ch = { id: 'dc-42', no: 'DC-0042', oid: o.id, qid: q.id, cid: c.id, date: iso(dd), dispatch: iso(dd),
    transporter: 'VRL Logistics', vehicle: 'MH 04 GH 2291', receivedBy: 'Site supervisor - Mr. Pawar',
    notes: 'Partition glass handled as fragile cargo.', status: 'delivered' };
  S.challans.unshift(ch);
  logAudit('challan', ch.id, 'Delivery challan created', 'For SO-1008');
  logAudit('challan', ch.id, 'Marked delivered', 'Received by site supervisor');

  const idate = addDays(dd, 2);
  const iv = { id: 'inv-1050', no: 'INV-1050', qid: q.id, oid: o.id, dcid: ch.id, cid: c.id, amount: q.total, paid: 0,
    date: iso(idate), due: iso(addDays(idate, 30)), termsCode: 'net30', termsDays: 30, po: q.po, jobNo: q.jobNo,
    advance: 30, attachments: [{ id: uid('at'), name: 'PO-4587.pdf', kind: 'Customer PO', size: '218 KB' },
      { id: uid('at'), name: 'DC-0042-signed.pdf', kind: 'Delivery challan', size: '341 KB' },
      { id: uid('at'), name: 'QT-1025-signed.pdf', kind: 'Signed quotation', size: '402 KB' }], status: 'partially-paid' };
  S.invoices.unshift(iv);
  logAudit('invoice', iv.id, 'Invoice created', 'From SO-1008');
  logAudit('invoice', iv.id, 'Due date set', `Net 30 · ${fdate(iv.due)}`);
  logAudit('invoice', iv.id, 'Invoice sent', 'Emailed to ' + c.email);

  const half = Math.round(q.total / 2);
  [[half, 'NEFT', 'HDFC123456789', addDays(idate, 3)], [q.total - half - Math.round(q.total * .25), 'UPI', 'UPI98765432', addDays(TODAY, -2)]].forEach(([amt, method, ref, when], k) => {
    const pay = { id: 'pay-abc' + k, no: 'PAY-' + String(k + 1).padStart(4, '0'), invId: iv.id, cid: c.id, amount: amt,
      date: iso(when), method, ref, cheque: '', bank: method === 'NEFT' ? 'HDFC Bank' : '', notes: k ? 'Balance against running bill' : 'Advance as per PO terms', by: 'Aarav Mehta', ts: +when };
    S.payments.unshift(pay);
    const rc = { id: 'rc-abc' + k, no: k ? 'RCPT-0046' : 'RCPT-0045', payId: pay.id, invId: iv.id, cid: c.id, amount: amt, date: pay.date, method, ref };
    S.receipts.unshift(rc); pay.rcpt = rc.no;
    iv.paid += amt;
    logAudit('invoice', iv.id, `Payment ${money(amt)} recorded`, `${method} · ${ref} · receipt ${rc.no}`);
  });
  logAudit('invoice', iv.id, 'Status changed to Partially paid', '');
  q.invoiced = iv.id;

  S.leads.unshift({ id: uid('l'), cid: c.id, qid: q.id, title: q.project, value: q.total, stage: 'converted', sp: q.sp, last: Date.now() - 6 * 3600000, fu: iso(addDays(TODAY, 4)) });
  S.followups.unshift({ id: uid('f'), cid: c.id, qid: q.id, type: 'Call', due: iso(addDays(TODAY, 2)), sp: q.sp, status: 'pending',
    note: 'Collect balance against INV-1050 and confirm snag list closure', created: Date.now() - 2 * 86400000 });
  if (S.settings.rcptNext <= 46) S.settings.rcptNext = 47;
}

function buildComms(q, c) {
  const L = [];
  L.push({ ch: 'system', ev: 'Quotation created', ts: q.created, to: '', status: 'done', by: spName(q.sp) });
  if (q.sentAt) {
    L.push({ ch: 'email', ev: 'Email sent', ts: q.sentAt, to: c.email, status: 'delivered', msg: `Hi ${c.name.split(' ')[0]}, please find quotation ${q.no} for ${q.project}.` });
    if (rnd() > .5) L.push({ ch: 'whatsapp', ev: 'WhatsApp share initiated', ts: q.sentAt + 600000, to: c.phone, status: 'shared', msg: `Quotation ${q.no} · ${money(q.total)}` });
  }
  if (q.viewedAt) L.push({ ch: 'portal', ev: `Customer viewed quotation${q.views > 1 ? ` (${q.views} times)` : ''}`, ts: q.viewedAt, to: c.name, status: 'viewed' });
  if (q.viewedAt && (q.status === 'viewed' || q.status === 'expired') && rnd() > .4) L.push({ ch: 'email', ev: 'Reminder sent', ts: q.viewedAt + 3 * DAY, to: c.email, status: 'delivered', msg: 'Gentle reminder about the quotation shared last week.' });
  if (q.status === 'accepted') L.push({ ch: 'portal', ev: 'Customer accepted quotation', ts: q.respondedAt, to: c.name, status: 'accepted' });
  if (q.status === 'rejected') L.push({ ch: 'portal', ev: 'Customer rejected quotation', ts: q.respondedAt, to: c.name, status: 'rejected', msg: q.reason });
  if (q.status === 'expired') L.push({ ch: 'system', ev: 'Quotation expired', ts: +parse(q.expiry), to: '', status: 'expired' });
  q.comms = L.filter(x => x.ts <= Date.now()).sort((a, b) => a.ts - b.ts);
}

/* ================= calculations ================= */
/* ---------- item columns (customisable per quotation) ----------
   name, price (rate) and amount are needed for the maths: they can be renamed but not removed.
   Built-ins can be hidden; custom columns can be added (text or number) and deleted.
   A custom number column marked `mult` multiplies into the line amount, like quantity. */
const BASE_COLS = [
  { key: 'name', label: 'Item', type: 'text', lock: true },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'unit', label: 'Unit', type: 'unit' },
  { key: 'price', label: 'Rate', type: 'number', lock: true },
  { key: 'disc', label: 'Disc %', type: 'number' },
  { key: 'tax', label: 'Tax', type: 'tax' },
  { key: 'desc', label: 'Description', type: 'text' },
  { key: 'sku', label: 'SKU / code', type: 'text' },
  { key: 'hsn', label: 'HSN / SAC', type: 'text' },
  { key: 'amount', label: 'Amount', type: 'number', lock: true },
];
const defaultCols = () => BASE_COLS.map(c => ({ ...c, on: true }));
const BASE_ON = defaultCols();
/* quotes without their own layout use the built-in default, so changing the workspace default never rewrites old quotations */
function qCols(q) { return (q && q.cols) || BASE_ON; }
const workspaceCols = () => JSON.parse(JSON.stringify(S.settings.itemCols || BASE_ON));
const colOn = (cols, k) => cols.some(c => c.key === k && c.on);
const colLabel = (cols, k) => (cols.find(c => c.key === k) || BASE_COLS.find(c => c.key === k) || {}).label;
function qFlatTax(q) { return q && q.flatTax != null ? +q.flatTax : +S.settings.defaultTax; }

function calcQuote(q) {
  let sub = 0, idisc = 0, tax = 0; const lines = [];
  const taxable = [];
  const cols = qCols(q), on = k => colOn(cols, k);
  const mults = cols.filter(c => c.custom && c.on && c.type === 'number' && c.mult);
  const flat = qFlatTax(q);
  for (const it of q.items) {
    if (it.type === 'section') { lines.push({ ...it }); continue; }
    const qty = on('qty') ? (+it.qty || 0) : 1;
    let mult = 1; for (const c of mults) { const v = it.cf?.[c.key]; mult *= (v === '' || v == null) ? 1 : (+v || 0); }
    const disc = on('disc') ? (+it.disc || 0) : 0;
    const rate = on('tax') ? (+it.tax || 0) : flat;
    const gross = qty * (+it.price || 0) * mult;
    const d = gross * (disc / 100);
    const net = gross - d;
    sub += gross; idisc += d;
    taxable.push({ net, rate });
    lines.push({ ...it, qty, disc, tax: rate, mult, gross, d, net, taxAmt: net * rate / 100, total: net + net * rate / 100 });
  }
  const netSum = sub - idisc;
  const od = q.odiscType === 'flat' ? Math.min(+q.odisc || 0, netSum) : netSum * ((+q.odisc || 0) / 100);
  const ratio = netSum ? (netSum - od) / netSum : 0;
  const taxBreak = {};
  for (const t of taxable) { const a = t.net * ratio * t.rate / 100; tax += a; taxBreak[t.rate] = (taxBreak[t.rate] || 0) + a; }
  const ship = +q.ship || 0, extra = +q.extra || 0;
  const chargesTax = (ship + extra) * 0.18;
  tax += chargesTax; if (ship + extra) taxBreak[18] = (taxBreak[18] || 0) + chargesTax;
  const cessRate = +q.cess || 0;
  const taxableVal = netSum - od + ship + extra;
  const cess = taxableVal * cessRate / 100;
  tax += cess;
  let grand = taxableVal + tax;
  // inter-state supply is IGST; within the business's own state it splits into CGST + SGST
  const c = cust(q.cid);
  const interState = !!(c && c.state && S.settings.state && c.state !== S.settings.state);
  const roundOn = q.roundOff != null ? q.roundOff : S.settings.roundOff;
  const rounded = roundOn ? Math.round(grand) : Math.round(grand * 100) / 100;
  const roundDiff = Math.round((rounded - grand) * 100) / 100;
  grand = rounded;
  const adv = grand * ((+q.advance || 0) / 100);
  const tds = q.tds && q.tds.on ? Math.round(taxableVal * (+q.tds.rate || 0)) / 100 * 100 / 100 : 0;
  const tdsAmt = q.tds && q.tds.on ? Math.round(taxableVal * (+q.tds.rate || 0)) / 100 : 0;
  return { lines, sub, idisc, od, taxable: taxableVal, tax, taxBreak, ship, extra, cess, cessRate,
           interState, cgst: interState ? 0 : (tax - cess) / 2, sgst: interState ? 0 : (tax - cess) / 2, igst: interState ? tax - cess : 0,
           roundDiff, grand, adv, tdsAmt, netReceivable: Math.round((grand - tdsAmt) * 100) / 100 };
}

const cust = id => S.customers.find(c => c.id === id) || (S.sampleCust && S.sampleCust.id === id ? S.sampleCust : undefined);
const quote = id => S.quotes.find(q => q.id === id);
const prod = id => S.products.find(p => p.id === id);
const qOf = cid => S.quotes.filter(q => q.cid === cid);

function refreshExpiry() {
  for (const q of S.quotes) if ((q.status === 'sent' || q.status === 'viewed') && parse(q.expiry) < TODAY) { q.status = 'expired'; }
}

function custStats(cid) {
  const qs = qOf(cid);
  const acc = qs.filter(q => q.status === 'accepted'), rej = qs.filter(q => q.status === 'rejected');
  const pen = qs.filter(q => ['sent', 'viewed'].includes(q.status)), exp = qs.filter(q => q.status === 'expired');
  const decided = acc.length + rej.length;
  const total = qs.reduce((s, q) => s + q.total, 0), accV = acc.reduce((s, q) => s + q.total, 0);
  const last = qs.reduce((m, q) => q.date > m ? q.date : m, '');
  return { qs, n: qs.length, acc: acc.length, rej: rej.length, pen: pen.length, exp: exp.length, drafts: qs.filter(q => q.status === 'draft').length, total, accV, conv: decided ? pct(acc.length, decided) : 0, last, avg: qs.length ? total / qs.length : 0 };
}
function custSegment(c, st) {
  const tags = [];
  const ageDays = daysBetween(c.since, iso(TODAY));
  if (ageDays <= 90) tags.push('new');
  if (st.n >= 2) tags.push('returning');
  if (st.accV >= 700000) tags.push('high');
  if (st.pen) tags.push('pending');
  if (st.rej) tags.push('rejected');
  if (st.exp) tags.push('expired');
  if (!st.n) tags.push('inactive');
  const fu = S.followups.some(f => f.cid === c.id && f.status === 'pending');
  if (fu || st.pen && st.qs.some(q => q.status === 'viewed')) tags.push('followup');
  return tags;
}
function custStatus(st, c) {
  if (!st.n) return ['inactive', 'No activity'];
  if (st.acc && st.n >= 2) return ['returning', 'Returning'];
  if (st.acc) return ['active', 'Customer'];
  if (st.pen) return ['pending', 'Awaiting'];
  if (daysBetween(c.since, iso(TODAY)) <= 90) return ['new', 'New'];
  return ['lost', 'At risk'];
}
