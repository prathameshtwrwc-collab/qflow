/* ================= action registry ================= */
const A = {};      // click actions: data-a
const IN = {};     // input actions: data-in
const UI = { drawer: false, menu: null, search: '', notifOpen: false, wsOpen: false, userOpen: false, charts: [] };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  // close floating menus when clicking elsewhere
  if (!e.target.closest('.menu-wrap') && !e.target.closest('.gsearch')) closeFloating();
  if (!el) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); if (allowed(el.dataset.a)) fn(el, e); }
});
document.addEventListener('click', () => liveTouch());
document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && IN[el.dataset.in] && allowed(el.dataset.in)) IN[el.dataset.in](el, e); liveTouch(); });
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && IN[el.dataset.ch] && allowed(el.dataset.ch)) IN[el.dataset.ch](el, e); liveTouch(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('.scrim')) closeModal(); closeFloating(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { const g = $('#gs-input'); if (g) { e.preventDefault(); g.focus(); } }
});

function closeFloating() {
  let changed = false;
  for (const k of ['notifOpen', 'wsOpen', 'userOpen']) if (UI[k]) { UI[k] = false; changed = true; }
  if (UI.menu) { UI.menu = null; $$('.menu.row-menu').forEach(m => m.remove()); }
  if (changed) renderTopbar();
  const sr = $('.sresults'); if (sr && !document.activeElement?.closest?.('.gsearch')) sr.remove();
}

/* ================= toast ================= */
function toast(msg, sub = '', kind = 'ok') {
  liveTouch();
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + kind;
  t.innerHTML = `${I(kind === 'ok' ? 'checkc' : kind === 'warn' ? 'info' : 'alert')}<div><b style="font-weight:500">${esc(msg)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, 3600);
}

/* ================= modal ================= */
let modalCleanup = null;
function openModal(html, cls = '', onMount) {
  closeModal(true);
  const s = document.createElement('div'); s.className = 'scrim';
  s.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  s.addEventListener('mousedown', e => { if (e.target === s) closeModal(); });
  document.body.appendChild(s);
  const f = s.querySelector('[autofocus]') || s.querySelector('input,select,textarea,button');
  setTimeout(() => f && f.focus(), 30);
  if (onMount) onMount(s);
}
function closeModal(silent) { const s = $('.scrim'); if (s) s.remove(); if (modalCleanup && !silent) { const f = modalCleanup; modalCleanup = null; f(); } }
A.closeModal = () => closeModal();
const mHead = (title, sub = '') => `<div class="mh"><div style="flex:1;min-width:0"><h3>${esc(title)}</h3>${sub ? `<p>${sub}</p>` : ''}</div><button class="btn icon ghost sm" data-a="closeModal" aria-label="Close">${I('x')}</button></div>`;
function confirmBox(title, body, okLabel, onOk, danger = true) {
  openModal(`${mHead(title)}<div class="mb"><p style="color:var(--ink-2)">${body}</p></div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn ${danger ? 'dark' : 'primary'}" id="cf-ok">${esc(okLabel)}</button></div>`);
  $('#cf-ok').onclick = () => { closeModal(); onOk(); };
}

/* ================= charts ================= */
function destroyCharts() { UI.charts.forEach(c => { try { c.destroy(); } catch (e) { } }); UI.charts = []; }
function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function mkChart(id, cfg) {
  const cv = document.getElementById(id); if (!cv) return null;
  if (!window.Chart) { cv.insertAdjacentHTML('afterend', `<div class="chart-fallback">Chart unavailable offline</div>`); return null; }
  const ink2 = cssv('--muted'), line = cssv('--line');
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = ink2;
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, plugins: {} }, cfg.options || {});
  cfg.options.plugins = Object.assign({ legend: { display: false }, tooltip: { backgroundColor: cssv('--ink'), titleColor: cssv('--bg'), bodyColor: cssv('--bg'), padding: 10, cornerRadius: 6, boxPadding: 4, usePointStyle: true } }, cfg.options.plugins);
  if (cfg.type === 'bar' || cfg.type === 'line') {
    cfg.options.scales = cfg.options.scales || {};
    for (const ax of ['x', 'y']) {
      cfg.options.scales[ax] = Object.assign({ grid: { color: ax === 'y' ? line : 'transparent', drawTicks: false }, border: { display: false }, ticks: { padding: 6 } }, cfg.options.scales[ax] || {});
    }
  }
  const c = new Chart(cv, cfg); UI.charts.push(c); return c;
}
const COL = () => ({ draft: cssv('--slate'), sent: cssv('--blue'), viewed: cssv('--cyan'), accepted: cssv('--accent'), rejected: cssv('--red'), expired: cssv('--amber'), ink: cssv('--ink'), line: cssv('--line-2'), soft: cssv('--surface-3') });

/* ================= router ================= */
const ROUTES = [
  [/^#?\/?$/, () => pageLanding(), 'landing'],
  [/^#\/signup$/, () => pageAuth('signup'), 'auth'],
  [/^#\/login$/, () => pageAuth('login'), 'auth'],
  [/^#\/status$/, () => pageAuth('status'), 'auth'],
  [/^#\/admin$/, () => pageAdmin(), 'auth'],
  [/^#\/app\/?$/, () => go('#/app/overview')],
  [/^#\/app\/overview$/, () => pageOverview(), 'overview'],
  [/^#\/app\/quotations$/, () => pageQuotes(), 'quotations'],
  [/^#\/app\/quotations\/new$/, () => pageBuilder(null), 'quotations'],
  [/^#\/app\/quotations\/([^/]+)\/edit$/, m => pageBuilder(m[1]), 'quotations'],
  [/^#\/app\/quotations\/([^/]+)$/, m => pageQuoteView(m[1]), 'quotations'],
  [/^#\/app\/customers$/, () => pageCustomers(), 'customers'],
  [/^#\/app\/customers\/([^/]+)$/, m => pageCustomer(m[1]), 'customers'],
  [/^#\/app\/products$/, () => pageProducts(), 'products'],
  [/^#\/app\/pipeline$/, () => pagePipeline(), 'pipeline'],
  [/^#\/app\/followups$/, () => pageFollowups(), 'followups'],
  [/^#\/app\/templates$/, () => pageTemplates(), 'templates'],
  [/^#\/app\/invoices$/, () => pageInvoices(), 'invoices'],
  [/^#\/app\/invoices\/([^/]+)$/, m => pageInvoice(m[1]), 'invoices'],
  [/^#\/app\/reports$/, () => pageReports(), 'reports'],
  [/^#\/app\/settings$/, () => pageSettings(), 'settings'],
  [/^#\/portal\/([^/]+)$/, m => pagePortal(m[1]), 'portal'],
];
const QS = {}; // per-route query state
function go(h) { if (location.hash === h) route(); else location.hash = h; }
A.go = el => { UI.drawer = false; go(el.dataset.to); };
window.addEventListener('hashchange', route);
let CURRENT = '';
function route() {
  const h = location.hash || '#/';
  destroyCharts(); closeModal(true);
  for (const [re, fn, key] of ROUTES) {
    const m = h.match(re);
    if (m) {
      if (!key) return fn(m);
      /* a share-link visitor has one quotation loaded, not a workspace */
      if (S.guest && key !== 'portal') { location.hash = '#/'; location.reload(); return; }
      const need = ROUTE_PERM.find(r => r[0].test(h));
      if (need && !canDo(need[1])) { toast('Your role cannot open this', `Ask the workspace owner for the "${need[1]}" permission.`, 'warn'); return go('#/app/overview'); }
      const prevKey = CURRENT; CURRENT = key;
      if (key === 'landing' || key === 'portal' || key === 'auth') { document.body.innerHTML = ''; mountRoot(); fn(m); window.scrollTo(0, 0); return; }
      ensureShell(); setNav(key);
      const out = fn(m);
      const pg = $('#page');
      pg.innerHTML = `<div class="page">${out.html}</div>`;
      if (out.after) out.after();
      if (prevKey !== key || !out.keepScroll) window.scrollTo(0, 0);
      $('.app')?.classList.toggle('drawer', UI.drawer);
      document.title = (out.title ? out.title + ' · ' : '') + 'QuoteFlow';
      return;
    }
  }
  go('#/');
}
function rerender() { const y = window.scrollY; const h = location.hash; const out = ROUTES.find(r => h.match(r[0])); if (!out) return; destroyCharts(); const m = h.match(out[0]); const res = out[1](m); if (out[2] === 'landing' || out[2] === 'portal' || out[2] === 'auth') return; $('#page').innerHTML = `<div class="page" style="animation:none">${res.html}</div>`; res.after && res.after(); setNav(out[2]); window.scrollTo(0, y); }
function mountRoot() { const r = document.createElement('div'); r.id = 'root'; document.body.appendChild(r); }

const NAV = [
  ['overview', 'Overview', 'home'], ['quotations', 'Quotations', 'file'], ['customers', 'Customers', 'users'], ['products', 'Products & Services', 'box'],
  ['pipeline', 'Sales Pipeline', 'kanban'], ['followups', 'Follow-ups', 'clock'], ['templates', 'Templates', 'layout'], ['invoices', 'Invoices', 'receipt'],
  ['reports', 'Reports & Analytics', 'chart'], ['settings', 'Settings', 'gear'],
];
function ensureShell() {
  if ($('.app')) return;
  document.body.innerHTML = `<div class="app">
    <aside class="side" aria-label="Main navigation">
      <a class="brand" data-a="go" data-to="#/"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">${IP.logo}</svg></span>QuoteFlow</a>
      <nav class="nav" id="nav"></nav>
      <div class="side-foot">
        ${S.live ? `<div class="usage"><div class="row between"><b style="font-weight:600">${S.license.admin ? 'Admin view' : 'Licensed'}</b><span class="muted">Live</span></div><span class="muted">${S.license.expires_at ? 'Valid until ' + fdate(new Date(S.license.expires_at)) : 'No active license'}</span><span class="muted" id="live-sync">All changes saved</span></div>
        ${S.license.admin ? `<button class="btn sm ghost" style="width:100%;justify-content:flex-start" data-a="admBack">${I('left', 'sm')} Back to admin console</button>` : `<button class="btn sm ghost" style="width:100%;justify-content:flex-start" data-a="authLogout">${I('logout', 'sm')} Log out</button>`}`
      : `<div class="usage"><div class="row between"><b style="font-weight:600">Business plan</b><span class="muted">Demo</span></div><div class="ub"><i></i></div><span class="muted">3 of 5 team seats used</span></div>
        <button class="btn sm ghost" style="width:100%;justify-content:flex-start" data-a="go" data-to="#/">${I('left', 'sm')} Back to website</button>`}
      </div>
    </aside>
    <div class="drawer-scrim" data-a="drawer"></div>
    <div class="main"><header class="topbar" id="topbar"></header><main id="page"></main></div>
  </div>`;
  renderTopbar();
}
function setNav(key) {
  const pend = S.followups.filter(f => f.status === 'pending' && f.due <= iso(TODAY)).length;
  const counts = { quotations: S.quotes.filter(q => ['sent', 'viewed'].includes(q.status)).length, followups: pend };
  $('#nav').innerHTML = NAV.map(([k, l, ic], i) => NAV_PERM[k] && !canDo(NAV_PERM[k]) ? '' : `${i === 4 ? '<div class="nav-sep">Sales</div>' : i === 8 ? '<div class="nav-sep">Business</div>' : ''}<a class="${k === key ? 'on' : ''}" data-a="go" data-to="#/app/${k}" ${k === key ? 'aria-current="page"' : ''}>${I(ic)}<span>${l}</span>${counts[k] ? `<span class="ct">${counts[k]}</span>` : ''}</a>`).join('');
}
A.drawer = () => { UI.drawer = !UI.drawer; $('.app').classList.toggle('drawer', UI.drawer); };

function renderTopbar() {
  const tb = $('#topbar'); if (!tb) return;
  const ws = S.workspaces.find(w => w.id === S.settings.workspace);
  const unread = S.notifications.filter(n => !n.read).length;
  tb.innerHTML = `
    <button class="btn icon ghost mobile-only" data-a="drawer" aria-label="Open menu">${I('menu')}</button>
    <div class="menu-wrap">
      <button class="ws-btn" data-a="wsToggle" aria-haspopup="true" aria-expanded="${UI.wsOpen}"><span class="ws-logo" style="background:${ws.color}">${ws.init}</span><span class="t"><b>${esc(ws.name)}</b><small>${esc(ws.sub)}</small></span>${I('down', 'sm')}</button>
      ${UI.wsOpen ? `<div class="menu" style="left:0;right:auto;min-width:240px">${S.workspaces.map(w => `<button data-a="wsPick" data-id="${w.id}"><span class="ws-logo" style="background:${w.color};width:24px;height:24px;font-size:10px">${w.init}</span><span style="flex:1"><b style="font-weight:500;display:block">${esc(w.name)}</b><small class="muted">${esc(w.sub)}</small></span>${w.id === ws.id ? I('check', 'sm') : ''}</button>`).join('')}<hr><button data-a="toastDemo" data-msg="Workspace creation is available in the full product">${I('plus', 'sm')} Create workspace</button></div>` : ''}
    </div>
    <div class="gsearch searchbox"><span style="position:absolute;left:10px;color:var(--muted);display:flex">${I('search')}</span><input id="gs-input" class="input" style="padding-left:34px" placeholder="Search quotations, customers, products" data-in="gsearch" autocomplete="off" aria-label="Global search"><kbd>Ctrl K</kbd></div>
    <div class="spacer"></div>
    <button class="btn primary" data-a="go" data-to="#/app/quotations/new">${I('plus')}<span class="hide-sm">Create quotation</span></button>
    <button class="btn icon ghost" data-a="theme" aria-label="Toggle theme">${I(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
    <div class="menu-wrap">
      <button class="btn icon ghost" style="position:relative" data-a="notifToggle" aria-label="Notifications">${I('bell')}${unread ? '<span class="dot-n"></span>' : ''}</button>
      ${UI.notifOpen ? `<div class="menu notif"><div class="nh"><b>Notifications</b><button class="btn sm ghost" data-a="notifRead">Mark all read</button></div>
        ${S.notifications.length ? S.notifications.slice(0, 7).map(n => `<div class="ni ${n.read ? '' : 'unread'}" style="cursor:pointer" data-a="notifOpen" data-id="${n.id}"><span class="ni-ico ${n.kind === 'accepted' ? 'tone-green' : n.kind === 'rejected' ? 'tone-red' : n.kind === 'viewed' ? 'tone-cyan' : n.kind === 'changes' ? 'tone-amber' : 'tone-blue'}">${I(n.kind === 'accepted' ? 'check' : n.kind === 'rejected' ? 'x' : n.kind === 'viewed' ? 'eye' : n.kind === 'changes' ? 'message' : 'bell', 'sm')}</span><div style="min-width:0"><div>${esc(n.text)}</div><small class="muted">${rel(n.ts)}</small></div></div>`).join('') : '<div class="empty">No notifications yet</div>'}
      </div>` : ''}
    </div>
    <div class="menu-wrap">
      <button class="btn icon ghost" style="border-radius:50%" data-a="userToggle" aria-label="Account">${av(ME.name, 'xs')}</button>
      ${UI.userOpen ? `<div class="menu"><div style="padding:8px 9px 10px;border-bottom:1px solid var(--line);margin-bottom:4px"><b style="font-weight:600">${esc(ME.name)}</b><div class="muted" style="font-size:12px">${esc(ME.email)}</div></div>
        <button data-a="go" data-to="#/app/settings">${I('user', 'sm')} Profile & business</button>
        <button data-a="setTab" data-tab="team">${I('users', 'sm')} Team members</button>
        ${S.live ? '' : `<button data-a="resetDemo">${I('refresh', 'sm')} Reset demo data</button>`}<hr>
        ${S.live ? `<button data-a="authLogout">${I('logout', 'sm')} Log out</button>` : `<button data-a="go" data-to="#/">${I('logout', 'sm')} Sign out</button>`}</div>` : ''}
    </div>`;
}
A.wsToggle = () => { const v = !UI.wsOpen; closeFloating(); UI.wsOpen = v; renderTopbar(); };
A.notifToggle = () => { const v = !UI.notifOpen; closeFloating(); UI.notifOpen = v; renderTopbar(); };
A.userToggle = () => { const v = !UI.userOpen; closeFloating(); UI.userOpen = v; renderTopbar(); };
A.wsPick = el => { S.settings.workspace = el.dataset.id; UI.wsOpen = false; const w = S.workspaces.find(x => x.id === el.dataset.id); renderTopbar(); toast(`Switched to ${w.name}`, 'Demo data stays the same across workspaces'); };
A.notifRead = () => { S.notifications.forEach(n => n.read = true); renderTopbar(); };
A.notifOpen = el => { const n = S.notifications.find(x => x.id === el.dataset.id); n.read = true; UI.notifOpen = false; renderTopbar(); if (n.qid) go('#/app/quotations/' + n.qid); };
A.toastDemo = el => { closeFloating(); toast(el.dataset.msg || 'Demo action', el.dataset.sub || 'This is a prototype, nothing was changed outside this page.', 'warn'); };
A.theme = () => {
  const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('qf-theme', r.dataset.theme); } catch (e) { }
  renderTopbar(); rerender();
};
A.resetDemo = () => { confirmBox('Reset demo data?', 'This restores all sample customers, quotations and invoices to their starting state. Changes you made in this session will be cleared.', 'Reset data', () => { location.reload(); }); };

/* global search */
IN.gsearch = el => {
  const q = el.value.trim().toLowerCase(); $('.sresults')?.remove();
  if (q.length < 2) return;
  const cs = S.customers.filter(c => (c.name + ' ' + c.company + ' ' + c.email).toLowerCase().includes(q)).slice(0, 5);
  const qs = S.quotes.filter(x => (x.no + ' ' + x.project + ' ' + cust(x.cid).company).toLowerCase().includes(q)).slice(-5).reverse();
  const ps = S.products.filter(p => (p.name + ' ' + p.sku).toLowerCase().includes(q)).slice(0, 4);
  const box = document.createElement('div'); box.className = 'sresults';
  box.innerHTML = (!cs.length && !qs.length && !ps.length) ? `<div class="empty" style="padding:24px">No matches for “${esc(el.value)}”. Try a quote number like QT-1200.</div>` :
    (qs.length ? `<h6>Quotations</h6>` + qs.map(x => `<button data-a="go" data-to="#/app/quotations/${x.id}">${I('file', 'sm')}<span style="flex:1"><b style="font-weight:500">${x.no}</b> <span class="muted">${esc(cust(x.cid).company)} · ${esc(x.project)}</span></span>${badge(x.status)}</button>`).join('') : '') +
    (cs.length ? `<h6>Customers</h6>` + cs.map(c => `<button data-a="go" data-to="#/app/customers/${c.id}">${av(c.name, 'xs')}<span style="flex:1"><b style="font-weight:500">${esc(c.name)}</b> <span class="muted">${esc(c.company)}</span></span></button>`).join('') : '') +
    (ps.length ? `<h6>Products & services</h6>` + ps.map(p => `<button data-a="productOpen" data-id="${p.id}">${I('box', 'sm')}<span style="flex:1"><b style="font-weight:500">${esc(p.name)}</b> <span class="muted">${p.sku}</span></span><span class="num">${money(p.price)}</span></button>`).join('') : '');
  el.parentElement.appendChild(box);
};

/* ================= shared components ================= */
function trendEl(cur, prev, invert = false) {
  if (!prev && !cur) return `<span class="trend flat">0%</span>`;
  const d = prev ? ((cur - prev) / prev) * 100 : 100;
  const up = d >= 0; const good = invert ? !up : up;
  if (Math.abs(d) < 0.5) return `<span class="trend flat">±0%</span>`;
  return `<span class="trend ${good ? 'up' : 'down'}">${I(up ? 'up' : 'down')}${Math.abs(d).toFixed(1)}%</span>`;
}
function pager(key, total, per) {
  const st = QS[key]; const pages = Math.max(1, Math.ceil(total / per)); const p = Math.min(st.page, pages);
  return `<div class="pager"><span>${total ? `${(p - 1) * per + 1}–${Math.min(p * per, total)} of ${numF(total)}` : 'No results'}</span><span class="spacer"></span>
    <select class="select" style="width:auto;height:30px" data-ch="perPage" data-key="${key}" aria-label="Rows per page">${[10, 25, 50].map(n => `<option ${n === per ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <button class="btn sm icon" data-a="page" data-key="${key}" data-d="-1" ${p <= 1 ? 'disabled' : ''} aria-label="Previous page">${I('left', 'sm')}</button>
    <span class="num">${p} / ${pages}</span>
    <button class="btn sm icon" data-a="page" data-key="${key}" data-d="1" ${p >= pages ? 'disabled' : ''} aria-label="Next page">${I('right', 'sm')}</button></div>`;
}
A.page = el => { QS[el.dataset.key].page += +el.dataset.d; rerender(); };
IN.perPage = el => { QS[el.dataset.key].per = +el.value; QS[el.dataset.key].page = 1; rerender(); };
function sortTh(key, col, label, cls = '') {
  const st = QS[key]; const on = st.sort === col;
  return `<th class="sortable ${cls}" data-a="sort" data-key="${key}" data-col="${col}" aria-sort="${on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">${label}${on ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
}
A.sort = el => { const st = QS[el.dataset.key]; if (st.sort === el.dataset.col) st.dir *= -1; else { st.sort = el.dataset.col; st.dir = -1; } rerender(); };

function rowMenu(el, items) {
  $$('.menu.row-menu').forEach(m => m.remove());
  const wrap = el.closest('.menu-wrap');
  const m = document.createElement('div'); m.className = 'menu row-menu';
  m.innerHTML = items.map(it => it === '-' ? '<hr>' : `<button data-a="${it[0]}" ${Object.entries(it[3] || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')} ${it[4] ? 'style="color:var(--red)"' : ''}>${I(it[1], 'sm')} ${esc(it[2])}</button>`).join('');
  wrap.appendChild(m); UI.menu = m;
  const r = m.getBoundingClientRect(); if (r.bottom > innerHeight - 10) { m.style.top = 'auto'; m.style.bottom = 'calc(100% + 4px)'; }
}

function statusFilterChips(key, counts, list) {
  const st = QS[key];
  return list.map(([v, l]) => `<button class="chip ${st.status === v ? 'on' : ''}" data-a="setQS" data-key="${key}" data-f="status" data-v="${v}">${l}<span class="ct">${numF(counts[v] || 0)}</span></button>`).join('');
}
A.setQS = el => { const st = QS[el.dataset.key]; st[el.dataset.f] = el.dataset.v; if ('page' in st) st.page = 1; rerender(); };
IN.setQS = el => {
  const st = QS[el.dataset.key]; st[el.dataset.f] = el.value; if ('page' in st) st.page = 1;
  if (el.tagName === 'INPUT' && el.type === 'search') {
    clearTimeout(UI._deb); UI._deb = setTimeout(() => { const pos = el.selectionStart; rerender(); const n = $(`[data-key="${el.dataset.key}"][data-f="${el.dataset.f}"]`); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 160);
  } else rerender();
};

function tlIcon(ch, ev = '') {
  const e = ev.toLowerCase();
  if (e.includes('accepted')) return ['check', 'tone-green'];
  if (e.includes('rejected') || e.includes('declined')) return ['x', 'tone-red'];
  if (e.includes('viewed')) return ['eye', 'tone-cyan'];
  if (e.includes('expired')) return ['hour', 'tone-amber'];
  if (e.includes('invoice')) return ['receipt', 'tone-green'];
  if (e.includes('change')) return ['message', 'tone-amber'];
  if (e.includes('follow')) return ['clock', 'tone-blue'];
  if (e.includes('note')) return ['note', 'tone-slate'];
  if (ch === 'email') return ['mail', 'tone-blue'];
  if (ch === 'whatsapp') return ['wa', 'tone-green'];
  if (ch === 'sms') return ['sms', 'tone-blue'];
  if (ch === 'telegram') return ['tg', 'tone-blue'];
  if (ch === 'link') return ['link', 'tone-slate'];
  if (e.includes('customer added')) return ['userplus', 'tone-slate'];
  return ['file', 'tone-slate'];
}
function timelineHTML(list, limit = 50) {
  if (!list.length) return `<div class="empty">${I('clock')}<h4>No activity yet</h4><p>Events appear here as quotations are shared and answered.</p></div>`;
  return `<div class="timeline">${list.slice(0, limit).map(x => { const [ic, tone] = tlIcon(x.ch, x.ev); return `<div class="tl"><span class="ti ${tone}">${I(ic)}</span><div class="tt"><b>${esc(x.ev)}</b>${x.sub ? ` <span class="muted">${x.sub}</span>` : ''}<small>${ftime(x.ts)}${x.to ? ` · ${esc(x.to)}` : ''}${x.chLabel ? ` · ${esc(x.chLabel)}` : ''}</small>${x.msg ? `<div class="tq">${esc(x.msg)}</div>` : ''}</div></div>`; }).join('')}</div>`;
}

/* customer & follow-up modals used across pages */
A.addCustomer = el => {
  openModal(`${mHead('Add customer', 'Customers you add appear in lists, the quotation builder and analytics.')}
  <div class="mb"><div class="grid2">
    <div class="field"><label for="nc-name">Contact name</label><input class="input" id="nc-name" autofocus placeholder="e.g. Kavya Rao"></div>
    <div class="field"><label for="nc-co">Company</label><input class="input" id="nc-co" placeholder="e.g. Lumen Clinics"></div>
    <div class="field"><label for="nc-email">Email</label><input class="input" id="nc-email" type="email" placeholder="name@company.com"></div>
    <div class="field"><label for="nc-phone">WhatsApp / phone</label><input class="input" id="nc-phone" placeholder="+91 98xxx xxxxx"></div>
    <div class="field"><label for="nc-type">Customer type</label><select class="select" id="nc-type"><option>Business</option><option>Individual</option><option>Government</option></select></div>
    <div class="field"><label for="nc-city">City</label><input class="input" id="nc-city" placeholder="Pune"></div>
    <div class="field"><label for="nc-gst">GSTIN (optional)</label><input class="input" id="nc-gst" placeholder="27ABCDE1234F1Z5"></div>
    <div class="field"><label for="nc-owner">Account owner</label><select class="select" id="nc-owner">${SALES.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
  </div><p class="hint err" id="nc-err" style="margin-top:10px"></p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="nc-save">Add customer</button></div>`);
  $('#nc-save').onclick = () => {
    const v = id => $('#' + id).value.trim();
    const errs = [];
    if (!v('nc-name')) errs.push('contact name');
    if (!/^\S+@\S+\.\S+$/.test(v('nc-email'))) errs.push('a valid email');
    if (v('nc-phone') && v('nc-phone').replace(/\D/g, '').length < 10) errs.push('a 10-digit phone number');
    ['nc-name', 'nc-email'].forEach(id => $('#' + id).classList.toggle('err', id === 'nc-name' ? !v(id) : !/^\S+@\S+\.\S+$/.test(v(id))));
    if (errs.length) { $('#nc-err').textContent = 'Add ' + errs.join(', ') + ' to continue.'; return; }
    const c = { id: uid('c'), name: v('nc-name'), company: v('nc-co') || v('nc-name'), email: v('nc-email'), phone: v('nc-phone') || '', type: v('nc-type'), city: v('nc-city') || 'Pune', since: iso(TODAY), gstin: v('nc-gst'), owner: v('nc-owner'), address: v('nc-city') || 'Pune' };
    S.customers.unshift(c);
    S.leads.push({ id: uid('l'), cid: c.id, qid: null, title: 'New enquiry', value: 0, stage: 'new', sp: c.owner, last: Date.now(), fu: iso(addDays(TODAY, 1)) });
    closeModal(); toast('Customer added', `${c.name} is now in your customer list and pipeline`);
    if (el.dataset.then === 'builder') { BQ.cid = c.id; rerender(); } else if (location.hash.startsWith('#/app/customers')) { QS.cust && (QS.cust.page = 1, QS.cust.seg = 'all'); rerender(); } else go('#/app/customers/' + c.id);
  };
};

A.addFollowup = el => {
  const cid = el.dataset.cid || ''; const qid = el.dataset.qid || '';
  const custOpts = (cid ? [cust(cid)] : S.customers.slice(0, 500)).map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)} · ${esc(c.company)}</option>`).join('');
  openModal(`${mHead('Add follow-up', 'Set a reminder so no quotation goes quiet.')}
  <div class="mb stack">
    <div class="field"><label for="fu-c">Customer</label><select class="select" id="fu-c">${custOpts}</select></div>
    <div class="grid2">
      <div class="field"><label for="fu-type">Action</label><select class="select" id="fu-type">${['Call', 'Email', 'WhatsApp', 'Meeting', 'Site visit'].map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="fu-date">Due date</label><input class="input" type="date" id="fu-date" value="${iso(addDays(TODAY, 1))}"></div>
      <div class="field"><label for="fu-sp">Assigned to</label><select class="select" id="fu-sp">${SALES.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div class="field"><label for="fu-q">Related quotation</label><select class="select" id="fu-q"></select></div>
    </div>
    <div class="field"><label for="fu-note">Next action</label><textarea class="textarea" id="fu-note" placeholder="e.g. Call to walk through the revised pricing" autofocus></textarea></div>
  </div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="fu-save">Add follow-up</button></div>`);
  const fillQ = () => { const c = $('#fu-c').value; $('#fu-q').innerHTML = `<option value="">None</option>` + qOf(c).slice().reverse().map(q => `<option value="${q.id}" ${q.id === qid ? 'selected' : ''}>${q.no} · ${esc(q.project)}</option>`).join(''); const cc = cust(c); if (cc) $('#fu-sp').value = cc.owner; };
  fillQ(); $('#fu-c').onchange = fillQ;
  $('#fu-save').onclick = () => {
    const note = $('#fu-note').value.trim();
    if (!note) { $('#fu-note').classList.add('err'); $('#fu-note').focus(); return; }
    const f = { id: uid('f'), cid: $('#fu-c').value, qid: $('#fu-q').value || null, type: $('#fu-type').value, due: $('#fu-date').value || iso(TODAY), sp: $('#fu-sp').value, status: 'pending', note, created: Date.now() };
    S.followups.push(f);
    if (f.qid) quote(f.qid).comms.push({ ch: 'system', ev: 'Follow-up added', ts: Date.now(), to: spName(f.sp), msg: `${f.type} on ${fdate(f.due)}: ${note}` });
    closeModal(); toast('Follow-up added', `${f.type} with ${cust(f.cid).name} on ${fdate(f.due)}`); rerender(); setNav(CURRENT);
  };
};
A.fuDone = el => {
  const f = S.followups.find(x => x.id === el.dataset.id);
  f.status = f.status === 'done' ? 'pending' : 'done';
  if (f.status === 'done') { f.doneAt = Date.now(); toast('Follow-up completed', `${f.type} with ${cust(f.cid).name}`); }
  rerender(); setNav(CURRENT);
};
A.fuSnooze = el => { const f = S.followups.find(x => x.id === el.dataset.id); const base = f.due < iso(TODAY) ? TODAY : parse(f.due); f.due = iso(addDays(base, +el.dataset.days || 1)); toast('Follow-up rescheduled', `Now due ${fdate(f.due)}`); rerender(); setNav(CURRENT); };

A.sendReminder = el => {
  const c = cust(el.dataset.cid);
  const open = qOf(c.id).filter(q => ['sent', 'viewed'].includes(q.status));
  if (!open.length) { toast('No open quotations', `${c.name} has nothing awaiting a response`, 'warn'); return; }
  openShare(open[open.length - 1].id, 'email', true);
};
A.productOpen = el => { closeFloating(); go('#/app/products'); setTimeout(() => A.productEdit({ dataset: { id: el.dataset.id } }), 60); };
