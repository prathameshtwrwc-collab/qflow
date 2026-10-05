/* ================= templates & branding ================= */
const BRAND_SW = ['#0E7C66', '#2B5FA6', '#16213A', '#9A620F', '#B4412D', '#0E6F87', '#5B4B8A', '#3F6B3A'];
const DOC_FONTS = [['Inter', 'Inter · modern sans'], ['Poppins', 'Poppins · geometric'], ['Source Serif 4', 'Source Serif · classic'], ['IBM Plex Mono', 'Plex Mono · technical']];
function sampleDoc() {
  const base = S.quotes.filter(q => q.items.length >= 3 && q.status === 'sent').slice(-1)[0] || S.quotes[S.quotes.length - 1] || S.sampleQuote;   // a live workspace with no quotations previews a sample
  const q = JSON.parse(JSON.stringify(base)); q.template = undefined; q.status = 'sent';
  return q;
}
function pageTemplates() {
  const s = S.settings;
  const drafts = S.quotes.filter(q => q.status === 'draft' && q.template !== s.template).length;
  const html = `
  <div class="ph"><div><h1>Templates & branding</h1><p>Pick a layout and make it yours. Every change updates the preview and becomes the default for new quotations.</p></div>
    <div class="row wrap"><button class="btn" data-a="applyTplDrafts" ${drafts ? '' : 'disabled'}>${I('layers')} Apply to ${drafts} draft${drafts === 1 ? '' : 's'}</button><button class="btn primary" data-a="go" data-to="#/app/quotations/new">${I('plus')} New quotation</button></div></div>
  <div class="tpl-layout">
    <div class="stack" style="gap:14px">
      <div class="panel"><div class="panel-h"><h3>Layout template</h3></div>
        <div class="panel-b"><div class="tpl-gallery">${TEMPLATES.map(t => `<button class="tpl-card ${s.template === t.id ? 'on' : ''}" data-a="pickTpl" data-id="${t.id}" aria-pressed="${s.template === t.id}">${tplThumb(t, s.template === t.id ? s.brand : t.color)}<div class="nm">${t.name}${s.template === t.id ? ` <span class="badge s-accepted nodot" style="height:18px;font-size:10.5px">Default</span>` : ''}</div><div class="ds">${t.desc}</div></button>`).join('')}</div></div></div>
      <div class="panel"><div class="panel-h"><h3>Customize</h3></div>
        <div class="panel-b stack">
          <div class="field"><span class="lbl">Logo</span>
            <label class="logo-drop" for="tp-logo"><span class="d-logo-sm" style="background:${s.brand}">${s.logo ? `<img src="${s.logo}" alt="">` : esc(initials(s.bizName))}</span><span style="flex:1"><b style="font-weight:500">${s.logo ? 'Replace logo' : 'Upload your logo'}</b><div class="hint">PNG, JPG or SVG. Stays in this browser tab only.</div></span>${s.logo ? `<button class="btn sm ghost" data-a="rmLogo">Remove</button>` : I('upload')}</label>
            <input type="file" id="tp-logo" accept="image/*" hidden data-ch="logoUp"></div>
          <div class="field"><span class="lbl">Brand colour</span>
            <div class="swatches">${BRAND_SW.map(c => `<button class="sw ${s.brand.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-a="setBrand" data-v="${c}" aria-label="Brand colour ${c}"></button>`).join('')}<label class="sw sw-custom" title="Custom colour"><input type="color" value="${s.brand}" data-ch="brandPick" aria-label="Custom brand colour"></label></div></div>
          <div class="grid2">
            <div class="field"><label for="tp-font">Document font</label><select class="select" id="tp-font" data-ch="setS" data-k="font">${DOC_FONTS.map(([v, l]) => `<option value="${v}" ${s.font === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><span class="lbl">Header layout</span><div class="seg" role="group">${[['split', 'Split'], ['center', 'Centered']].map(([v, l]) => `<button class="${s.header === v ? 'on' : ''}" data-a="setSv" data-k="header" data-v="${v}">${l}</button>`).join('')}</div></div>
          </div>
          <div class="field"><label for="tp-foot">Footer message</label><input class="input" id="tp-foot" value="${esc(s.footer)}" data-in="setS" data-k="footer" data-live="1"></div>
          <div class="field"><label for="tp-terms">Default terms & conditions</label><textarea class="textarea" id="tp-terms" rows="5" data-in="setS" data-k="terms" data-live="1">${esc(s.terms)}</textarea><span class="hint">Used for new quotations. Existing quotations keep their own terms.</span></div>
        </div></div>
    </div>
    <div class="panel tpl-prev"><div class="panel-h"><div><h3>Live preview</h3><div class="sub">${TEMPLATES.find(t => t.id === s.template).name} · ${esc(s.font)} · ${s.header === 'center' ? 'centered' : 'split'} header</div></div><span class="spacer"></span><span class="demo-tag">Sample quotation</span></div>
      <div class="panel-b"><div class="preview-frame" id="pv-frame"><div id="pv-scale" class="preview-scale">${docHTML(sampleDoc(), { noStamp: true })}</div></div></div></div>
  </div>`;
  return { html, title: 'Templates', keepScroll: true, after: () => { fitPreview(); window.onresize = fitPreview; } };
}
function refreshPreview() { const pv = $('#pv-scale'); if (pv) { pv.innerHTML = docHTML(sampleDoc(), { noStamp: true }); fitPreview(); } }
A.pickTpl = el => { S.settings.template = el.dataset.id; const t = TEMPLATES.find(x => x.id === el.dataset.id); toast(`${t.name} selected`, 'New quotations will use this layout'); rerender(); };
A.setBrand = el => { S.settings.brand = el.dataset.v; rerender(); };
IN.brandPick = el => { S.settings.brand = el.value; rerender(); };
A.setSv = el => { S.settings[el.dataset.k] = el.dataset.v; rerender(); };
IN.setS = el => {
  const k = el.dataset.k; let v = el.type === 'number' ? +el.value : el.value;
  S.settings[k] = v;
  if (k === 'currency' || k === 'bizName') renderTopbar();
  if (el.dataset.live) { clearTimeout(UI._pv); UI._pv = setTimeout(refreshPreview, 150); flashSaved(); }
  else { rerender(); flashSaved(); }
};
function flashSaved() { const b = $('#set-saved'); if (b) { b.classList.add('on'); clearTimeout(UI._sv); UI._sv = setTimeout(() => b.classList.remove('on'), 1600); } }
IN.logoUp = el => {
  const f = el.files[0]; if (!f) return;
  if (!f.type.startsWith('image/')) { toast('That file isn’t an image', 'Choose a PNG, JPG or SVG', 'err'); return; }
  if (f.size > 2 * 1024 * 1024) { toast('Logo is larger than 2 MB', 'Try a smaller file', 'err'); return; }
  const r = new FileReader(); r.onload = () => { S.settings.logo = r.result; toast('Logo added', 'It appears on every quotation document'); rerender(); }; r.readAsDataURL(f);
};
A.rmLogo = (el, e) => { e.preventDefault(); S.settings.logo = ''; rerender(); };
A.applyTplDrafts = () => { let n = 0; S.quotes.forEach(q => { if (q.status === 'draft' && q.template !== S.settings.template) { q.template = S.settings.template; n++; } }); toast(`Template applied to ${n} drafts`); rerender(); };

/* ================= invoices & orders ================= */
QS.inv = { tab: 'invoices', hl: null, status: 'all', q: '', page: 1, per: 10, sort: 'date', dir: -1 };
QS.ord = { status: 'all', q: '', page: 1, per: 10, sort: 'date', dir: -1 };
const INV_ST = [['draft', 'Draft'], ['sent', 'Sent'], ['partially-paid', 'Partially paid'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['void', 'Void']];
function refreshOverdue() { S.invoices.forEach(i => syncInvoice(i)); }
function refreshOverdueOld() { const t = iso(TODAY); S.invoices.forEach(i => { if (['sent', 'partially-paid'].includes(i.status) && i.due < t && i.paid < i.amount) i.status = i.paid > 0 ? 'partially-paid' : 'overdue'; }); }
function pageInvoices() {
  refreshOverdue();
  const st = QS.inv; const so = QS.ord;
  const invT = S.invoices.reduce((s, i) => s + i.amount, 0), paidT = S.invoices.reduce((s, i) => s + i.paid, 0);
  const odue = S.invoices.filter(i => i.status === 'overdue' || (i.status === 'partially-paid' && i.due < iso(TODAY)));
  const awaiting = S.quotes.filter(q => q.status === 'accepted' && !q.invoiced).sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0));
  const counts = { all: S.invoices.length }; S.invoices.forEach(i => { const k = invStatus(i); counts[k] = (counts[k] || 0) + 1; });
  const openInv = S.invoices.filter(i => invBal(i) > 0 && !['draft', 'void'].includes(i.status));
  const dueToday = openInv.filter(i => i.due === iso(TODAY));
  const dueWeek = openInv.filter(i => i.due >= iso(TODAY) && i.due <= iso(addDays(TODAY, 7)));
  const outMap = {}; openInv.forEach(i => outMap[i.cid] = (outMap[i.cid] || 0) + invBal(i));
  const topOut = Object.entries(outMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recentPays = S.payments.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 10);
  let body = '';
  if (st.tab === 'invoices') {
    let rows = S.invoices.filter(i => (st.status === 'all' || invStatus(i) === st.status) && (!st.due || (st.due === 'today' ? i.due === iso(TODAY) : i.due >= iso(TODAY) && i.due <= iso(addDays(TODAY, 7))) && invBal(i) > 0) && (!st.q || (i.no + ' ' + cust(i.cid).company + ' ' + (quote(i.qid)?.no || '')).toLowerCase().includes(st.q.toLowerCase())));
    const key = { date: i => i.date + i.no, due: i => i.due, amount: i => i.amount, no: i => i.no, bal: i => i.amount - i.paid }[st.sort] || (i => i.date);
    rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
    if (st.hl) { const h = rows.find(r => r.id === st.hl); if (h) { rows = [h, ...rows.filter(r => r !== h)]; } }
    const total = rows.length; const pages = Math.max(1, Math.ceil(total / st.per)); if (st.page > pages) st.page = pages;
    const view = rows.slice((st.page - 1) * st.per, st.page * st.per);
    body = `<div class="row wrap" style="padding:12px 12px 0">${statusFilterChips('inv', counts, [['all', 'All'], ...INV_ST])}</div>
    <div class="toolbar"><div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Invoice, quotation or customer" value="${esc(st.q)}" data-in="setQS" data-key="inv" data-f="q" aria-label="Search invoices"></div><span class="spacer"></span><button class="btn sm" data-a="exportDemo" data-what="invoices">${I('download', 'sm')} Export</button></div>
    ${view.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${sortTh('inv', 'no', 'Invoice')}<th>Customer</th><th>Converted from</th>${sortTh('inv', 'date', 'Issued')}${sortTh('inv', 'due', 'Due')}${sortTh('inv', 'amount', 'Amount', 'r')}${sortTh('inv', 'bal', 'Balance', 'r')}<th>Status</th><th class="r">Actions</th></tr></thead><tbody>
    ${view.map(i => { const c = cust(i.cid); const q = quote(i.qid); const bal = i.amount - i.paid; const dl = daysBetween(iso(TODAY), i.due); return `<tr class="click ${st.hl === i.id ? 'hl' : ''}" data-a="rowGo" data-to="#/app/invoices/${i.id}" data-a="invView" data-id="${i.id}">
      <td class="qn">${esc(i.no)}${st.hl === i.id ? ' <span class="badge s-new nodot" style="height:18px;font-size:10.5px">New</span>' : ''}</td>
      <td class="cell-2"><b>${esc(c.company)}</b><span>${esc(c.name)}</span></td>
      <td data-stop>${q ? `<a data-a="go" data-to="#/app/quotations/${q.id}" style="cursor:pointer">${q.no}</a>` : '—'}</td>
      <td>${fdate(i.date)}</td><td>${fdate(i.due)}${bal > 0 && i.status !== 'draft' ? `<div class="lr-s ${dl < 0 ? 'overdue-t' : ''}">${dl < 0 ? `${-dl} days late` : dl === 0 ? 'Due today' : `in ${dl} days`}</div>` : ''}</td>
      <td class="r num"><b style="font-weight:600">${money(i.amount)}</b></td><td class="r num">${bal > 0 ? money(bal) : '<span class="muted">—</span>'}</td>
      <td>${badge(invStatus(i), INV_LABEL[invStatus(i)])}</td>
      <td class="r" data-stop><div class="row" style="justify-content:flex-end;gap:2px">${bal > 0 ? `<button class="btn sm ghost" data-a="invPay" data-id="${i.id}">${I('rupee', 'sm')} Record payment</button>` : ''}<div class="menu-wrap"><button class="btn sm ghost icon" data-a="invMenu" data-id="${i.id}" aria-label="More actions">${I('more')}</button></div></div></td></tr>`; }).join('')}
    </tbody></table></div>${pager('inv', total, st.per)}` : `<div class="empty">${I('receipt')}<h4>No invoices match</h4><p>Accepted quotations can be converted from the “Ready to invoice” tab.</p></div>`}`;
  } else if (st.tab === 'orders') {
    let rows = S.orders.filter(o => (so.status === 'all' || o.status === so.status) && (!so.q || (o.no + ' ' + cust(o.cid).company).toLowerCase().includes(so.q.toLowerCase())));
    const key = { date: o => o.date + o.no, amount: o => o.amount, no: o => o.no }[so.sort] || (o => o.date);
    rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * so.dir; });
    const total = rows.length; const pages = Math.max(1, Math.ceil(total / so.per)); if (so.page > pages) so.page = pages;
    const view = rows.slice((so.page - 1) * so.per, so.page * so.per);
    const oc = { all: S.orders.length }; S.orders.forEach(o => oc[o.status] = (oc[o.status] || 0) + 1);
    body = `<div class="row wrap" style="padding:12px 12px 0">${statusFilterChips('ord', oc, [['all', 'All'], ['confirmed', 'Confirmed'], ['processing', 'Processing'], ['completed', 'Completed']])}</div>
    <div class="toolbar"><div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Order or customer" value="${esc(so.q)}" data-in="setQS" data-key="ord" data-f="q" aria-label="Search orders"></div><span class="spacer"></span><button class="btn sm" data-a="exportDemo" data-what="orders">${I('download', 'sm')} Export</button></div>
    ${view.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${sortTh('ord', 'no', 'Order')}<th>Customer</th><th>Quotation</th>${sortTh('ord', 'date', 'Order date')}${sortTh('ord', 'amount', 'Amount', 'r')}<th>Status</th><th>Invoice</th></tr></thead><tbody>
    ${view.map(o => { const c = cust(o.cid); const q = quote(o.qid); const inv = S.invoices.find(i => i.qid === o.qid); return `<tr><td class="qn">${o.no}</td><td class="cell-2"><b>${esc(c.company)}</b><span>${esc(c.name)}</span></td><td>${q ? `<a data-a="go" data-to="#/app/quotations/${q.id}" style="cursor:pointer">${q.no}</a>` : '—'}</td><td>${fdate(o.date)}</td><td class="r num"><b style="font-weight:600">${money(o.amount)}</b></td>
      <td><select class="select sel-badge s-${o.status}" data-ch="ordStatus" data-id="${o.id}" aria-label="Order status">${['confirmed', 'processing', 'completed'].map(x => `<option value="${x}" ${o.status === x ? 'selected' : ''}>${cap(x)}</option>`).join('')}</select></td>
      <td>${inv ? `<a data-a="invView" data-id="${inv.id}" style="cursor:pointer">${esc(inv.no)}</a>` : `<button class="btn sm" data-a="ordInvoice" data-id="${o.id}">${I('receipt', 'sm')} Create invoice</button>`}</td></tr>`; }).join('')}
    </tbody></table></div>${pager('ord', total, so.per)}` : `<div class="empty">${I('box')}<h4>No orders match</h4></div>`}`;
  } else if (st.tab === 'challans') {
    body = dcTable();
  } else if (st.tab === 'cnotes' || st.tab === 'dnotes') {
    body = notesTable(st.tab === 'cnotes' ? 'cn' : 'dn');
  } else {
    body = awaiting.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Quotation</th><th>Customer</th><th>Project</th><th>Accepted</th><th class="r">Amount</th><th class="r">Action</th></tr></thead><tbody>
    ${awaiting.map(q => { const c = cust(q.cid); return `<tr><td class="qn"><a data-a="go" data-to="#/app/quotations/${q.id}" style="cursor:pointer">${q.no}</a></td><td class="cell-2"><b>${esc(c.company)}</b><span>${esc(c.name)}</span></td><td>${esc(q.project)}</td><td>${q.respondedAt ? rel(q.respondedAt) : '—'}</td><td class="r num"><b style="font-weight:600">${money(q.total)}</b></td><td class="r"><button class="btn sm primary" data-a="convertQ" data-id="${q.id}">${I('swap', 'sm')} Convert to invoice</button></td></tr>`; }).join('')}
    </tbody></table></div>` : `<div class="empty">${I('checkc')}<h4>Everything accepted has been invoiced</h4><p>Accepted quotations appear here until you convert them.</p></div>`;
  }
  const html = `
  <div class="ph"><div><h1>Invoices & orders</h1><p>Accepted quotations become sales orders and invoices with the same items, taxes and terms. <span class="demo-tag">No real payments are processed</span></p></div>
    <div class="row wrap"><button class="btn primary" data-a="pickConvert">${I('swap')} Convert a quotation</button></div></div>
  <div class="report-cards">
    <div class="rc"><small>Total invoiced</small><b>${moneyC(invT)}</b><span class="lr-s">${S.invoices.length} invoices</span></div>
    <div class="rc"><small>Collected</small><b style="color:var(--accent-ink)">${moneyC(paidT)}</b><div class="hbar"><i style="width:${pct(paidT, invT)}%"></i></div></div>
    <div class="rc"><small>Outstanding</small><b>${moneyC(invT - paidT)}</b><span class="lr-s">${S.invoices.filter(i => i.paid < i.amount).length} unpaid or partial</span></div>
    <button class="rc rc-btn" data-a="invOverdue"><small>Overdue</small><b style="color:${odue.length ? 'var(--red)' : 'inherit'}">${moneyC(odue.reduce((s, i) => s + i.amount - i.paid, 0))}</b><span class="lr-s">${odue.length} past due ${I('right', 'sm')}</span></button>
  </div>
  <div class="report-cards five" style="margin-top:10px">
    <button class="rc rc-btn" data-a="invFilter" data-v="today"><small>Due today</small><b>${moneyC(dueToday.reduce((s, i) => s + invBal(i), 0))}</b><span class="lr-s">${dueToday.length} invoice${dueToday.length === 1 ? '' : 's'}</span></button>
    <button class="rc rc-btn" data-a="invFilter" data-v="week"><small>Due this week</small><b>${moneyC(dueWeek.reduce((s, i) => s + invBal(i), 0))}</b><span class="lr-s">${dueWeek.length} invoices</span></button>
    <button class="rc rc-btn" data-a="invFilter" data-v="partially-paid"><small>Partially paid</small><b>${moneyC(S.invoices.filter(i => invStatus(i) === 'partially-paid').reduce((s, i) => s + invBal(i), 0))}</b><span class="lr-s">${S.invoices.filter(i => invStatus(i) === 'partially-paid').length} invoices</span></button>
    <button class="rc rc-btn" data-a="invFilter" data-v="paid"><small>Paid</small><b>${moneyC(S.invoices.filter(i => invStatus(i) === 'paid').reduce((s, i) => s + i.amount, 0))}</b><span class="lr-s">${S.invoices.filter(i => invStatus(i) === 'paid').length} settled</span></button>
    <div class="rc"><small>Documents</small><b>${S.challans.length + S.cnotes.length + S.dnotes.length}</b><span class="lr-s">${S.challans.length} challans · ${S.cnotes.length} credit · ${S.dnotes.length} debit notes</span></div>
  </div>
  <div class="dgrid" style="margin-top:14px">
    <div class="panel c6"><div class="panel-h"><h3>Outstanding by customer</h3><span class="muted" style="font-size:12.5px">Top 6</span></div><div class="panel-b" style="padding:6px 0">
      ${topOut.length ? topOut.map(([cid, v]) => { const c = cust(cid); const f = custFinance(cid); return `<button class="list-row" data-a="go" data-to="#/app/customers/${cid}">
        <span class="av" style="background:${avColor(c.name)}">${esc(initials(c.company))}</span>
        <div style="flex:1;min-width:0"><b class="ell">${esc(c.company)}</b><small class="muted">${f.overdue ? `<span class="overdue-t">${money(f.overdue)} overdue</span> · ` : ''}${f.count} invoice${f.count === 1 ? '' : 's'}</small></div>
        <b class="num">${money(v)}</b></button>`; }).join('') : emptyMini('Nothing outstanding')}
    </div></div>
    <div class="panel c6"><div class="panel-h"><h3>Recent payments</h3><span class="spacer"></span><span class="muted" style="font-size:12.5px">${moneyC(recentPays.reduce((s, p) => s + p.amount, 0))} in the last 10</span></div><div class="panel-b" style="padding:6px 0">
      ${recentPays.length ? recentPays.map(p => { const iv = S.invoices.find(x => x.id === p.invId); return `<button class="list-row" data-a="rcptView" data-id="${p.id}">
        <span class="ki tone-green">${I('rupee', 'sm')}</span>
        <div style="flex:1;min-width:0"><b class="ell">${money(p.amount)} · ${esc(cust(p.cid).company)}</b><small class="muted">${esc(p.method)}${p.ref ? ' · ' + esc(p.ref) : ''} · ${iv ? esc(iv.no) : ''} · ${fdate(p.date)}</small></div>
        <span class="lr-s">${esc(p.rcpt || '')}</span></button>`; }).join('') : emptyMini('No payments recorded')}
    </div></div>
  </div>
  <div class="flow-strip">${[['check', 'Quotation accepted', S.quotes.filter(q => q.status === 'accepted').length], ['box', 'Sales order', S.orders.length], ['receipt', 'Invoice issued', S.invoices.filter(i => i.status !== 'draft').length], ['checkc', 'Paid in full', counts.paid || 0]].map(([ic, l, n], i) => `${i ? `<span class="fs-arrow">${I('arrowr', 'sm')}</span>` : ''}<div class="fs"><span class="ki tone-green">${I(ic, 'sm')}</span><div><b>${numF(n)}</b><small>${l}</small></div></div>`).join('')}</div>
  <div class="panel" style="margin-top:14px">
    <div class="tabs" style="margin:0;padding:0 12px" role="tablist">${[['invoices', 'Invoices', S.invoices.length], ['orders', 'Sales orders', S.orders.length], ['challans', 'Delivery challans', S.challans.length], ['cnotes', 'Credit notes', S.cnotes.length], ['dnotes', 'Debit notes', S.dnotes.length], ['awaiting', 'Ready to invoice', awaiting.length]].map(([k, l, n]) => `<button class="${st.tab === k ? 'on' : ''}" role="tab" aria-selected="${st.tab === k}" data-a="invTab" data-v="${k}">${l}<span class="ct">${n}</span></button>`).join('')}</div>
    ${body}
  </div>`;
  return { html, title: 'Invoices', keepScroll: true, after: () => { if (st.hl) { setTimeout(() => { st.hl = null; }, 4000); } } };
}
A.invTab = el => { QS.inv.tab = el.dataset.v; QS.inv.hl = null; rerender(); };
A.invOverdue = () => { Object.assign(QS.inv, { tab: 'invoices', status: 'overdue', page: 1 }); rerender(); };
IN.ordStatus = el => { const o = S.orders.find(x => x.id === el.dataset.id); o.status = el.value; toast(`${o.no} marked ${el.value}`); rerender(); };
A.ordInvoice = el => { const o = S.orders.find(x => x.id === el.dataset.id); const q = quote(o.qid); if (q) { q.invoiced = null; S.orders = S.orders.filter(x => x !== o); A.convertQ({ dataset: { id: q.id } }); } };
A.pickConvert = () => {
  const list = S.quotes.filter(q => q.status === 'accepted' && !q.invoiced).concat(S.quotes.filter(q => ['sent', 'viewed'].includes(q.status)).slice(-15)).slice(0, 40);
  openModal(`${mHead('Convert a quotation', 'Accepted quotations are listed first. Converting an open quotation marks it accepted.')}<div class="mb"><div class="picker-list">${list.map(q => `<div class="picker-item" data-a="convertQ" data-id="${q.id}">${I('file')}<div style="flex:1;min-width:0"><b style="font-weight:500">${q.no}</b> <span class="muted">${esc(q.project)}</span><div class="lr-s">${esc(cust(q.cid).company)}</div></div><span class="num">${money(q.total)}</span>${badge(q.status)}</div>`).join('') || '<div class="empty">No quotations ready to convert</div>'}</div></div>`);
};
A.invMenu = el => { const i = S.invoices.find(x => x.id === el.dataset.id); rowMenu(el, [['invView', 'eye', 'View invoice', { id: i.id }], ...(i.status === 'draft' ? [['invSend', 'send', 'Mark as sent', { id: i.id }]] : []), ...(i.amount > i.paid && i.status !== 'draft' ? [['invRemind', 'bell', 'Payment reminder (demo)', { id: i.id }]] : []), ['invPdf', 'download', 'Download PDF (demo)', { id: i.id }], '-', ['invPaid', 'checkc', 'Mark fully paid', { id: i.id }]]); };
A.invSend = el => { closeFloating(); const i = S.invoices.find(x => x.id === el.dataset.id); i.status = 'sent'; toast(`${i.no} marked as sent`, 'Status updated in this demo; no email was sent'); closeModal(true); rerender(); };
A.invRemind = el => { closeFloating(); const i = S.invoices.find(x => x.id === el.dataset.id); toast('Reminder simulated', `A payment reminder for ${i.no} would go to ${cust(i.cid).email}. Nothing was actually sent.`, 'warn'); };
A.invPdf = el => { closeFloating(); const i = S.invoices.find(x => x.id === el.dataset.id); toast('PDF prepared (simulation)', `${i.no}.pdf would download in the full product`, 'warn'); };
A.invPaid = el => { closeFloating(); const i = S.invoices.find(x => x.id === el.dataset.id); const bal = invBal(i); if (bal > 0) quickPayment(i, bal, 'Marked as paid'); syncInvoice(i); i.status = 'paid'; toast(`${i.no} marked paid`, money(i.amount)); closeModal(true); rerender(); };
A.invPay = el => {
  closeFloating(); const i = S.invoices.find(x => x.id === el.dataset.id); const bal = i.amount - i.paid;
  openModal(`${mHead('Record payment', `${esc(i.no)} · balance ${money(bal)}`)}
  <div class="mb stack"><div class="grid2">
    <div class="field"><label for="ip-a">Amount received</label><input class="input" type="number" min="1" max="${bal}" id="ip-a" value="${Math.round(bal)}" autofocus></div>
    <div class="field"><label for="ip-d">Payment date</label><input class="input" type="date" id="ip-d" value="${iso(TODAY)}"></div>
    <div class="field"><label for="ip-m">Method</label><select class="select" id="ip-m"><option>Bank transfer (NEFT/RTGS)</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></div>
    <div class="field"><label for="ip-r">Reference</label><input class="input" id="ip-r" placeholder="UTR or cheque no."></div>
  </div><p class="hint">This records a payment in the prototype only. No money moves.</p><p class="hint err" id="ip-err"></p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="ip-ok">Record payment</button></div>`);
  $('#ip-ok').onclick = () => {
    const a = +$('#ip-a').value; if (!(a > 0) || a > bal + 0.5) { $('#ip-err').textContent = `Enter an amount between 1 and ${money(bal)}.`; return; }
    i.paid = Math.min(i.amount, i.paid + a); i.status = i.paid >= i.amount - 0.5 ? 'paid' : 'partially-paid';
    closeModal(); toast('Payment recorded', `${money(a)} against ${i.no}${i.status === 'paid' ? ', now fully paid' : ''}`); rerender();
  };
};
A.invView = el => {
  closeFloating(); const i = S.invoices.find(x => x.id === el.dataset.id); const q = quote(i.qid); const c = cust(i.cid); const T = q ? calcQuote(q) : null; const s = S.settings;
  openModal(`${mHead(`Invoice ${i.no}`, `${esc(c.company)} · ${badge(i.status, INV_ST.find(x => x[0] === i.status)[1])}`)}
  <div class="mb"><div class="inv-doc" style="--doc-accent:${s.brand}">
    <div class="row between" style="align-items:flex-start"><div><b style="font-family:var(--display);font-size:17px">${esc(s.bizName)}</b><div class="lr-s">${esc(s.address)}, ${esc(s.city)}<br>GSTIN ${esc(s.gstin)}</div></div><div style="text-align:right"><div class="inv-t">Tax invoice</div><div class="lr-s">${esc(i.no)} · ${fdate(i.date)}<br>Due ${fdate(i.due)}</div></div></div>
    <div class="grid2" style="margin:16px 0"><div><small class="muted">Billed to</small><div><b style="font-weight:600">${esc(c.company)}</b></div><div class="lr-s">${esc(c.name)} · ${esc(c.address)}${c.gstin ? `<br>GSTIN ${esc(c.gstin)}` : ''}</div></div><div><small class="muted">Reference</small><div>${q ? `Quotation ${q.no}` : '—'}</div><div class="lr-s">${q ? esc(q.project) : ''}</div></div></div>
    ${T ? `<table class="tbl"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${T.lines.filter(l => l.type !== 'section').map(l => `<tr><td>${esc(l.name)}</td><td class="r num">${numF(l.qty)} ${esc(l.unit)}</td><td class="r num">${money(l.price)}</td><td class="r num">${money(l.net)}</td></tr>`).join('')}</tbody></table>
    <div class="inv-tot"><span>Taxable value</span><b>${money2(T.taxable)}</b><span>${s.taxLabel}</span><b>${money2(T.tax)}</b><span class="g">Invoice total</span><b class="g">${money2(i.amount)}</b><span>Paid</span><b>${money2(i.paid)}</b><span>Balance due</span><b style="color:${i.amount - i.paid > 0 ? 'var(--red)' : 'var(--accent-ink)'}">${money2(i.amount - i.paid)}</b></div>` : ''}
  </div></div>
  <div class="mf">${q ? `<button class="btn ghost" style="margin-right:auto" data-a="go" data-to="#/app/quotations/${q.id}">${I('file', 'sm')} Open quotation</button>` : ''}<button class="btn" data-a="invPdf" data-id="${i.id}">${I('download', 'sm')} PDF</button>${i.status === 'draft' ? `<button class="btn" data-a="invSend" data-id="${i.id}">Mark as sent</button>` : ''}${i.amount > i.paid ? `<button class="btn primary" data-a="invPay" data-id="${i.id}">Record payment</button>` : `<button class="btn" data-a="closeModal">Close</button>`}</div>`, 'wide');
};

/* ================= reports ================= */
QS.rep = { r: 'quotation', range: '365', cid: '', pid: '', sp: 'all', status: 'all' };
const REPORTS = [['quotation', 'Quotation performance', 'file'], ['conversion', 'Customer conversion', 'users'], ['decisions', 'Accepted vs rejected', 'swap'], ['value', 'Quotation value', 'rupee'], ['pipeline', 'Sales pipeline', 'kanban'], ['products', 'Product performance', 'box'], ['sales', 'Salesperson performance', 'user'], ['monthly', 'Monthly business summary', 'cal'], ['comms', 'Communication performance', 'send']];
function repMonths(range) { const n = range === 'all' ? 12 : Math.min(12, Math.max(3, Math.ceil(+range / 30))); const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1); out.push({ k: iso(d).slice(0, 7), l: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` }); } return out; }
function pageReports() {
  refreshExpiry();
  const st = QS.rep; const today = iso(TODAY);
  const F = S.quotes.filter(q => (st.range === 'all' || daysBetween(q.date, today) <= +st.range) && (!st.cid || q.cid === st.cid) && (!st.pid || q.items.some(i => i.pid === st.pid)) && (st.sp === 'all' || q.sp === st.sp) && (st.status === 'all' || (st.status === 'pending' ? ['sent', 'viewed'].includes(q.status) : q.status === st.status)));
  const M = repMonths(st.range);
  const inM = (d, k) => d && iso(typeof d === 'number' ? new Date(d) : parse(d)).slice(0, 7) === k;
  const cnt = s => F.filter(q => q.status === s).length;
  const sum = arr => arr.reduce((s, q) => s + q.total, 0);
  const acc = F.filter(q => q.status === 'accepted'), rej = F.filter(q => q.status === 'rejected');
  const winRate = pct(acc.length, acc.length + rej.length);
  const cards = (arr) => `<div class="report-cards">${arr.map(([l, v, sub]) => `<div class="rc"><small>${l}</small><b>${v}</b>${sub ? `<span class="lr-s">${sub}</span>` : ''}</div>`).join('')}</div>`;
  const chartPanel = (id, title, sub, h = 280) => `<div class="panel" style="margin-top:14px"><div class="panel-h"><div><h3>${title}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div><div class="panel-b"><div class="chart-box" style="height:${h}px"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div></div></div>`;
  const table = (title, head, rows, note) => `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${title}</h3><span class="spacer"></span>${note ? `<span class="sub">${note}</span>` : ''}</div><div class="panel-b" style="padding-top:8px">${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th class="${h[1] || ''}">${h[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : emptyMini('No data for these filters')}</div></div>`;
  const C = COL();
  let body = '', draw = () => { };

  if (st.r === 'quotation') {
    const sent = F.filter(q => q.status !== 'draft'), viewed = F.filter(q => q.viewedAt);
    body = cards([['Quotations created', numF(F.length), `${cnt('draft')} still in draft`], ['Sent to customers', numF(sent.length), `${pct(sent.length, F.length)}% of created`], ['View rate', pct(viewed.length, sent.length) + '%', `${viewed.length} viewed at least once`], ['Win rate', winRate + '%', `${acc.length} accepted of ${acc.length + rej.length} decided`]])
      + chartPanel('rp1', 'Quotation activity by month', 'Created, sent, viewed and accepted')
      + table('Monthly breakdown', [['Month'], ['Created', 'r'], ['Sent', 'r'], ['Viewed', 'r'], ['Accepted', 'r'], ['Rejected', 'r'], ['Win rate', 'r']], M.slice().reverse().map(m => { const x = F.filter(q => inM(q.date, m.k)); const a = x.filter(q => q.status === 'accepted').length, r = x.filter(q => q.status === 'rejected').length; return `<tr><td>${m.l}</td><td class="r num">${x.length}</td><td class="r num">${x.filter(q => q.sentAt).length}</td><td class="r num">${x.filter(q => q.viewedAt).length}</td><td class="r num">${a}</td><td class="r num">${r}</td><td class="r num">${pct(a, a + r)}%</td></tr>`; }));
    draw = () => mkChart('rp1', { type: 'line', data: { labels: M.map(m => m.l), datasets: [['Created', q => inM(q.date, 'K'), C.ink], ['Sent', 0, C.sent], ['Viewed', 0, C.viewed], ['Accepted', 0, C.accepted]].map(([l, _, col]) => ({ label: l, data: M.map(m => F.filter(q => l === 'Created' ? inM(q.date, m.k) : l === 'Sent' ? inM(q.sentAt, m.k) : l === 'Viewed' ? inM(q.viewedAt, m.k) : q.status === 'accepted' && inM(q.respondedAt, m.k)).length), borderColor: col, backgroundColor: col, tension: .35, pointRadius: 2, borderWidth: 2 })) }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } } }, scales: { y: { beginAtZero: true } } } });
  }
  if (st.r === 'conversion') {
    const byC = {}; F.forEach(q => { const r = byC[q.cid] = byC[q.cid] || { n: 0, a: 0, r: 0, v: 0, av: 0 }; r.n++; r.v += q.total; if (q.status === 'accepted') { r.a++; r.av += q.total; } if (q.status === 'rejected') r.r++; });
    const ids = Object.keys(byC); const won = ids.filter(id => byC[id].a); const repeat = ids.filter(id => byC[id].n > 1);
    const types = ['Business', 'Individual', 'Government'].map(t => { const x = ids.filter(id => cust(id).type === t); const w = x.filter(id => byC[id].a).length; return [t, x.length, w]; });
    const cities = {}; ids.forEach(id => { const c = cust(id).city; cities[c] = cities[c] || [0, 0]; cities[c][0]++; if (byC[id].a) cities[c][1]++; });
    body = cards([['Customers quoted', numF(ids.length)], ['Customers won', numF(won.length), `${pct(won.length, ids.length)}% conversion`], ['Repeat customers', numF(repeat.length), `${pct(repeat.length, ids.length)}% asked for 2+ quotes`], ['Revenue per won customer', moneyC(won.reduce((s, id) => s + byC[id].av, 0) / (won.length || 1))]])
      + chartPanel('rp1', 'Conversion by city', 'Customers quoted vs customers who accepted', 260)
      + table('Customer type', [['Type'], ['Quoted', 'r'], ['Won', 'r'], ['Conversion', 'r']], types.map(([t, n, w]) => `<tr><td>${t}</td><td class="r num">${n}</td><td class="r num">${w}</td><td class="r num">${pct(w, n)}%</td></tr>`))
      + table('Top converting customers', [['Customer'], ['Quotes', 'r'], ['Accepted', 'r'], ['Rejected', 'r'], ['Accepted value', 'r'], ['Conversion', 'r']], ids.filter(id => byC[id].a + byC[id].r >= 2).sort((a, b) => byC[b].av - byC[a].av).slice(0, 10).map(id => { const r = byC[id]; const c = cust(id); return `<tr class="click" data-a="rowGo" data-to="#/app/customers/${id}"><td class="cell-2"><b>${esc(c.company)}</b><span>${esc(c.name)}</span></td><td class="r num">${r.n}</td><td class="r num">${r.a}</td><td class="r num">${r.r}</td><td class="r num">${money(r.av)}</td><td class="r num">${pct(r.a, r.a + r.r)}%</td></tr>`; }), 'at least two decisions');
    const cl = Object.entries(cities).sort((a, b) => b[1][0] - a[1][0]).slice(0, 10);
    draw = () => mkChart('rp1', { type: 'bar', data: { labels: cl.map(c => c[0]), datasets: [{ label: 'Quoted', data: cl.map(c => c[1][0]), backgroundColor: C.line, borderRadius: 3, maxBarThickness: 20 }, { label: 'Won', data: cl.map(c => c[1][1]), backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 20 }] }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } } }, scales: { y: { beginAtZero: true } } } });
  }
  if (st.r === 'decisions') {
    const reasons = {}; rej.forEach(q => reasons[q.reason] = (reasons[q.reason] || 0) + 1);
    const rl = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
    const dt = arr => { const d = arr.filter(q => q.respondedAt && q.sentAt).map(q => (q.respondedAt - q.sentAt) / DAY); return d.length ? (d.reduce((s, x) => s + x, 0) / d.length).toFixed(1) : '—'; };
    body = cards([['Accepted', numF(acc.length), moneyC(sum(acc))], ['Rejected', numF(rej.length), moneyC(sum(rej))], ['Win rate', winRate + '%', 'Of decided quotations'], ['Days to decision', dt(acc.concat(rej)), `${dt(acc)} to accept · ${dt(rej)} to reject`]])
      + `<div class="dgrid"><div class="panel c8"><div class="panel-h"><h3>Decisions by month</h3></div><div class="panel-b"><div class="chart-box"><canvas id="rp1" role="img" aria-label="Accepted and rejected by month"></canvas></div></div></div>
         <div class="panel c4"><div class="panel-h"><h3>Rejection reasons</h3></div><div class="panel-b"><div class="chart-box sm"><canvas id="rp2" role="img" aria-label="Rejection reasons"></canvas></div>
         ${rl.map(([r, n], i) => `<div class="list-row"><i class="sq" style="background:${['#C4453A', '#D98A2B', '#6B7386', '#2B5FA6', '#0E6F87'][i % 5]}"></i><span style="flex:1">${esc(r)}</span><b class="num">${n}</b><span class="muted num" style="width:44px;text-align:right">${pct(n, rej.length)}%</span></div>`).join('')}</div></div></div>`;
    draw = () => {
      mkChart('rp1', { type: 'bar', data: { labels: M.map(m => m.l), datasets: [{ label: 'Accepted', data: M.map(m => acc.filter(q => inM(q.respondedAt, m.k)).length), backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 22 }, { label: 'Rejected', data: M.map(m => -rej.filter(q => inM(q.respondedAt, m.k)).length), backgroundColor: C.rejected, borderRadius: 3, maxBarThickness: 22 }] }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${Math.abs(x.raw)}` } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => Math.abs(v) } } } } });
      mkChart('rp2', { type: 'doughnut', data: { labels: rl.map(r => r[0]), datasets: [{ data: rl.map(r => r[1]), backgroundColor: ['#C4453A', '#D98A2B', '#6B7386', '#2B5FA6', '#0E6F87'], borderWidth: 2, borderColor: cssv('--surface') }] }, options: { cutout: '64%' } });
    };
  }
  if (st.r === 'value') {
    const bands = [['Under ₹50K', 0, 5e4], ['₹50K – ₹2L', 5e4, 2e5], ['₹2L – ₹10L', 2e5, 1e6], ['Above ₹10L', 1e6, Infinity]];
    const pend = F.filter(q => ['sent', 'viewed'].includes(q.status));
    body = cards([['Total quoted', moneyC(sum(F)), `${F.length} quotations`], ['Accepted value', moneyC(sum(acc)), `${pct(sum(acc), sum(F))}% of quoted`], ['Pending value', moneyC(sum(pend)), `${pend.length} awaiting response`], ['Average quotation', moneyC(sum(F) / (F.length || 1)), `Median ${moneyC(F.map(q => q.total).sort((a, b) => a - b)[Math.floor(F.length / 2)] || 0)}`]])
      + chartPanel('rp1', 'Quoted value by month and outcome', 'Stacked by current status')
      + table('Deal size bands', [['Band'], ['Quotations', 'r'], ['Quoted value', 'r'], ['Accepted value', 'r'], ['Win rate', 'r']], bands.map(([l, lo, hi]) => { const x = F.filter(q => q.total >= lo && q.total < hi); const a = x.filter(q => q.status === 'accepted'), r = x.filter(q => q.status === 'rejected'); return `<tr><td>${l}</td><td class="r num">${x.length}</td><td class="r num">${money(sum(x))}</td><td class="r num">${money(sum(a))}</td><td class="r num">${pct(a.length, a.length + r.length)}%</td></tr>`; }));
    draw = () => mkChart('rp1', { type: 'bar', data: { labels: M.map(m => m.l), datasets: ['accepted', 'viewed', 'sent', 'draft', 'expired', 'rejected'].map(s => ({ label: cap(s), data: M.map(m => Math.round(sum(F.filter(q => q.status === s && inM(q.date, m.k))))), backgroundColor: C[s], maxBarThickness: 28 })) }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${moneyC(x.raw)}` } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => moneyC(v) } } } } });
  }
  if (st.r === 'pipeline') {
    const L = S.leads.filter(l => st.sp === 'all' || l.sp === st.sp);
    const open = L.filter(l => OPEN_ST.includes(l.stage));
    body = cards([['Open pipeline', moneyC(open.reduce((s, l) => s + l.value, 0)), `${open.length} leads`], ['Won', numF(L.filter(l => ['accepted', 'converted'].includes(l.stage)).length), 'Accepted or converted'], ['Lost', numF(L.filter(l => l.stage === 'rejected').length)], ['Stuck in negotiation', numF(L.filter(l => l.stage === 'negotiation').length), 'Needs a push']])
      + chartPanel('rp1', 'Value by stage', 'Current pipeline, all leads in filter', 300)
      + table('Stage summary', [['Stage'], ['Leads', 'r'], ['Value', 'r'], ['Avg. value', 'r'], ['Follow-ups due', 'r']], STAGES.map(([k, l]) => { const x = L.filter(v => v.stage === k); const vs = x.reduce((s, v) => s + v.value, 0); return `<tr><td>${l}</td><td class="r num">${x.length}</td><td class="r num">${money(vs)}</td><td class="r num">${money(vs / (x.length || 1))}</td><td class="r num">${x.filter(v => v.fu && v.fu <= today && OPEN_ST.includes(k)).length}</td></tr>`; }));
    draw = () => mkChart('rp1', { type: 'bar', data: { labels: STAGES.map(s => s[1]), datasets: [{ label: 'Value', data: STAGES.map(([k]) => L.filter(l => l.stage === k).reduce((s, l) => s + l.value, 0)), backgroundColor: STAGES.map(s => cssv(s[2])), borderRadius: 3, maxBarThickness: 26 }] }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: x => moneyC(x.raw) } } }, scales: { x: { ticks: { callback: v => moneyC(v) }, grid: { color: cssv('--line') } }, y: { grid: { color: 'transparent' } } } } });
  }
  if (st.r === 'products') {
    const m = {}; F.forEach(q => { const seen = new Set(); q.items.forEach(it => { if (!it.pid) return; const r = m[it.pid] = m[it.pid] || { n: 0, v: 0, av: 0, a: 0, r: 0, qty: 0 }; const v = it.qty * it.price * (1 - it.disc / 100); r.v += v; r.qty += +it.qty; if (q.status === 'accepted') r.av += v; if (!seen.has(it.pid)) { seen.add(it.pid); r.n++; if (q.status === 'accepted') r.a++; if (q.status === 'rejected') r.r++; } }); });
    const ids = Object.keys(m).filter(prod).sort((a, b) => m[b].av - m[a].av);
    const cats = {}; ids.forEach(id => { const c = prod(id).category; cats[c] = (cats[c] || 0) + m[id].av; });
    body = cards([['Items quoted', numF(ids.length), `of ${S.products.length} in catalogue`], ['Top seller', ids[0] ? esc(prod(ids[0]).name) : '—', ids[0] ? moneyC(m[ids[0]].av) + ' accepted' : ''], ['Top category', Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'], ['Avg. items per quote', (F.reduce((s, q) => s + q.items.filter(i => i.type !== 'section').length, 0) / (F.length || 1)).toFixed(1)]])
      + chartPanel('rp1', 'Accepted value by item', 'Top 10', 320)
      + table('Product performance', [['Item'], ['Category'], ['Quotes', 'r'], ['Quantity', 'r'], ['Quoted value', 'r'], ['Accepted value', 'r'], ['Conversion', 'r']], ids.map(id => { const p = prod(id), r = m[id]; return `<tr class="click" data-a="productOpen" data-id="${id}"><td><b style="font-weight:500">${esc(p.name)}</b></td><td>${esc(p.category)}</td><td class="r num">${r.n}</td><td class="r num">${numF(r.qty)} ${esc(p.unit)}</td><td class="r num">${money(r.v)}</td><td class="r num">${money(r.av)}</td><td class="r num">${pct(r.a, r.a + r.r)}%</td></tr>`; }));
    draw = () => { const t = ids.slice(0, 10); mkChart('rp1', { type: 'bar', data: { labels: t.map(id => prod(id).name), datasets: [{ label: 'Accepted value', data: t.map(id => Math.round(m[id].av)), backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 18 }] }, options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: x => money(x.raw) } } }, scales: { x: { ticks: { callback: v => moneyC(v) }, grid: { color: cssv('--line') } }, y: { grid: { color: 'transparent' } } } } }); };
  }
  if (st.r === 'sales') {
    const P = SALES.map(sp => { const x = F.filter(q => q.sp === sp.id); const a = x.filter(q => q.status === 'accepted'), r = x.filter(q => q.status === 'rejected'); return { sp, n: x.length, sent: x.filter(q => q.sentAt).length, a: a.length, r: r.length, v: sum(x), av: sum(a), win: pct(a.length, a.length + r.length), fu: S.followups.filter(f => f.sp === sp.id && f.status === 'done').length }; });
    const best = P.slice().sort((a, b) => b.av - a.av)[0];
    body = cards([['Top performer', best.sp.name, moneyC(best.av) + ' won'], ['Team win rate', winRate + '%'], ['Team accepted value', moneyC(sum(acc))], ['Follow-ups completed', numF(P.reduce((s, p) => s + p.fu, 0))]])
      + chartPanel('rp1', 'Quoted vs won by salesperson', '', 260)
      + table('Leaderboard', [['Salesperson'], ['Quotes', 'r'], ['Sent', 'r'], ['Accepted', 'r'], ['Rejected', 'r'], ['Quoted value', 'r'], ['Won value', 'r'], ['Win rate', 'r']], P.sort((a, b) => b.av - a.av).map((p, i) => `<tr><td><div class="row" style="gap:8px"><span class="rank">${i + 1}</span>${av(p.sp.name, 'xs')}<b style="font-weight:500">${p.sp.name}</b></div></td><td class="r num">${p.n}</td><td class="r num">${p.sent}</td><td class="r num">${p.a}</td><td class="r num">${p.r}</td><td class="r num">${money(p.v)}</td><td class="r num"><b style="font-weight:600">${money(p.av)}</b></td><td class="r num">${p.win}%</td></tr>`));
    draw = () => mkChart('rp1', { type: 'bar', data: { labels: SALES.map(s => s.name), datasets: [{ label: 'Quoted value', data: SALES.map(s => Math.round(sum(F.filter(q => q.sp === s.id)))), backgroundColor: C.line, borderRadius: 3, maxBarThickness: 34 }, { label: 'Won value', data: SALES.map(s => Math.round(sum(acc.filter(q => q.sp === s.id)))), backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 34 }] }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${moneyC(x.raw)}` } } }, scales: { y: { ticks: { callback: v => moneyC(v) } } } } });
  }
  if (st.r === 'monthly') {
    const rows = M.slice().reverse().map(m => { const x = F.filter(q => inM(q.date, m.k)); const a = F.filter(q => q.status === 'accepted' && inM(q.respondedAt, m.k)); const inv = S.invoices.filter(i => inM(i.date, m.k)); return { m, n: x.length, v: sum(x), a: a.length, av: sum(a), nc: S.customers.filter(c => inM(c.since, m.k)).length, inv: inv.reduce((s, i) => s + i.amount, 0), col: inv.reduce((s, i) => s + i.paid, 0) }; });
    const th = rows[0], pv = rows[1] || th;
    body = cards([[`Quoted in ${th.m.l}`, moneyC(th.v), trendEl(th.v, pv.v)], [`Won in ${th.m.l}`, moneyC(th.av), trendEl(th.av, pv.av)], [`Invoiced in ${th.m.l}`, moneyC(th.inv), trendEl(th.inv, pv.inv)], [`New customers`, numF(th.nc), trendEl(th.nc, pv.nc)]])
      + chartPanel('rp1', 'Quoted, won and invoiced', 'By month', 260)
      + table('Month by month', [['Month'], ['Quotes', 'r'], ['Quoted', 'r'], ['Accepted', 'r'], ['Won value', 'r'], ['New customers', 'r'], ['Invoiced', 'r'], ['Collected', 'r']], rows.map(r => `<tr><td>${r.m.l}</td><td class="r num">${r.n}</td><td class="r num">${moneyC(r.v)}</td><td class="r num">${r.a}</td><td class="r num">${moneyC(r.av)}</td><td class="r num">${r.nc}</td><td class="r num">${moneyC(r.inv)}</td><td class="r num">${moneyC(r.col)}</td></tr>`));
    const rr = rows.slice().reverse();
    draw = () => mkChart('rp1', { type: 'line', data: { labels: rr.map(r => r.m.l), datasets: [['Quoted', 'v', C.line], ['Won', 'av', C.accepted], ['Invoiced', 'inv', C.sent]].map(([l, k, col]) => ({ label: l, data: rr.map(r => Math.round(r[k])), borderColor: col, backgroundColor: col, tension: .35, pointRadius: 2, borderWidth: 2 })) }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${moneyC(x.raw)}` } } }, scales: { y: { ticks: { callback: v => moneyC(v) } } } } });
  }
  if (st.r === 'comms') {
    const ev = F.flatMap(q => q.comms.map(c => ({ ...c, q })));
    const chs = [['email', 'Email', e => e.ch === 'email' && !/reminder/i.test(e.ev)], ['reminder', 'Reminders', e => /reminder/i.test(e.ev)], ['whatsapp', 'WhatsApp', e => e.ch === 'whatsapp'], ['sms', 'SMS', e => e.ch === 'sms'], ['telegram', 'Telegram', e => e.ch === 'telegram'], ['link', 'Link copied / shared', e => e.ch === 'link' || e.ch === 'device'], ['view', 'Portal views', e => e.ch === 'portal' && /viewed/i.test(e.ev)]];
    const counts = chs.map(([k, l, f]) => [l, ev.filter(f).length]);
    const emailQ = F.filter(q => q.comms.some(c => c.ch === 'email')), waQ = F.filter(q => q.comms.some(c => c.ch === 'whatsapp'));
    const vr = arr => pct(arr.filter(q => q.viewedAt).length, arr.length);
    const ttv = F.filter(q => q.viewedAt && q.sentAt).map(q => (q.viewedAt - q.sentAt) / 3600000);
    const remQ = F.filter(q => q.comms.some(c => /reminder/i.test(c.ev)));
    body = cards([['Messages & shares', numF(ev.filter(e => ['email', 'whatsapp', 'sms', 'telegram', 'link'].includes(e.ch)).length), 'Simulated sends logged'], ['View rate after email', vr(emailQ) + '%', `${emailQ.length} quotations emailed`], ['View rate with WhatsApp', vr(waQ) + '%', `${waQ.length} shared on WhatsApp`], ['Time to first view', ttv.length ? (ttv.reduce((s, x) => s + x, 0) / ttv.length).toFixed(0) + ' hrs' : '—', `Reminders nudged ${remQ.filter(q => ['accepted', 'rejected'].includes(q.status)).length} decisions`]])
      + chartPanel('rp1', 'Activity by channel', 'All logged events in filter', 250)
      + table('Recent communication', [['When'], ['Quotation'], ['Channel'], ['Event'], ['Recipient'], ['Status']], ev.filter(e => e.ch !== 'system').sort((a, b) => b.ts - a.ts).slice(0, 15).map(e => `<tr class="click" data-a="rowGo" data-to="#/app/quotations/${e.q.id}"><td>${ftime(e.ts)}</td><td class="qn">${e.q.no}</td><td>${{ email: 'Email', whatsapp: 'WhatsApp', portal: 'Client portal', sms: 'SMS', telegram: 'Telegram', link: 'Link', device: 'Device share', pdf: 'PDF' }[e.ch] || cap(e.ch)}</td><td>${esc(e.ev)}</td><td class="ell" style="max-width:200px">${esc(e.to || '—')}</td><td>${e.status ? badge(e.status === 'delivered' || e.status === 'shared' ? 'sent' : e.status, cap(e.status)) : '—'}</td></tr>`), 'Sends are simulated in this prototype');
    draw = () => mkChart('rp1', { type: 'bar', data: { labels: counts.map(c => c[0]), datasets: [{ label: 'Events', data: counts.map(c => c[1]), backgroundColor: [C.sent, C.expired, '#25A366', C.draft, C.viewed, C.draft, C.accepted], borderRadius: 3, maxBarThickness: 40 }] }, options: { scales: { y: { beginAtZero: true } } } });
  }

  const cur = REPORTS.find(r => r[0] === st.r);
  const filt = st.range !== '365' || st.cid || st.pid || st.sp !== 'all' || st.status !== 'all';
  const html = `
  <div class="ph"><div><h1>Reports & analytics</h1><p>Filter once; every report below uses the same filters. <span class="demo-tag">Sample data</span></p></div>
    <div class="row wrap"><button class="btn" data-a="repExport" data-f="CSV">${I('download')} CSV</button><button class="btn" data-a="repExport" data-f="Excel">${I('download')} Excel</button><button class="btn primary" data-a="repExport" data-f="PDF">${I('download')} PDF report</button></div></div>
  <div class="panel"><div class="toolbar" style="border-bottom:0">
    ${I('filter')}
    <select class="select" data-ch="setQS" data-key="rep" data-f="range" aria-label="Date range">${[['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months'], ['365', 'Last 12 months'], ['all', 'All time']].map(([v, l]) => `<option value="${v}" ${st.range === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select class="select" data-ch="setQS" data-key="rep" data-f="cid" aria-label="Customer" style="max-width:220px"><option value="">All customers</option>${S.customers.filter(c => S.quotes.some(q => q.cid === c.id)).sort((a, b) => a.company.localeCompare(b.company)).map(c => `<option value="${c.id}" ${st.cid === c.id ? 'selected' : ''}>${esc(c.company)}</option>`).join('')}</select>
    <select class="select" data-ch="setQS" data-key="rep" data-f="pid" aria-label="Product" style="max-width:220px"><option value="">All products</option>${S.products.map(p => `<option value="${p.id}" ${st.pid === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
    <select class="select" data-ch="setQS" data-key="rep" data-f="sp" aria-label="Salesperson"><option value="all">All salespeople</option>${SALES.map(s => `<option value="${s.id}" ${st.sp === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
    <select class="select" data-ch="setQS" data-key="rep" data-f="status" aria-label="Status"><option value="all">Any status</option>${[['draft', 'Draft'], ['sent', 'Sent'], ['viewed', 'Viewed'], ['pending', 'Awaiting response'], ['accepted', 'Accepted'], ['rejected', 'Rejected'], ['expired', 'Expired']].map(([v, l]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <span class="spacer"></span><span class="muted" style="font-size:12.5px">${numF(F.length)} quotations</span>
    ${filt ? `<button class="btn sm ghost" data-a="repClear">Reset</button>` : ''}
  </div></div>
  <div class="set-layout" style="margin-top:14px">
    <nav class="set-nav" aria-label="Reports">${REPORTS.map(([k, l, ic]) => `<button class="${st.r === k ? 'on' : ''}" data-a="setQS" data-key="rep" data-f="r" data-v="${k}">${I(ic, 'sm')}${l}</button>`).join('')}</nav>
    <div style="min-width:0"><h2 class="sec-t" style="margin-top:0">${cur[1]}</h2>${F.length || st.r === 'pipeline' ? body : `<div class="panel"><div class="empty">${I('chart')}<h4>No quotations match these filters</h4><p>Widen the date range or reset the filters.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="repClear">Reset filters</button></div></div></div>`}</div>
  </div>`;
  return { html, title: 'Reports', keepScroll: true, after: () => { if (F.length || st.r === 'pipeline') draw(); } };
}
A.repClear = () => { Object.assign(QS.rep, { range: '365', cid: '', pid: '', sp: 'all', status: 'all' }); rerender(); };
A.repExport = el => {
  const r = REPORTS.find(x => x[0] === QS.rep.r)[1];
  toast(`Preparing ${el.dataset.f} export…`, r, 'warn');
  setTimeout(() => toast(`${el.dataset.f} export ready (simulation)`, `“${r}” would download in the full product. No file was created.`, 'warn'), 1100);
};

/* ================= settings ================= */
QS.set = { tab: 'profile' };
const SET_TABS = [['profile', 'Business profile', 'building'], ['branding', 'Logo & branding', 'palette'], ['category', 'Business category', 'briefcase'], ['currency', 'Currency', 'globe'], ['tax', 'Tax settings', 'percent'], ['terms', 'Default terms', 'note'], ['items', 'Item columns', 'cols'], ['bank', 'Bank details', 'rupee'], ['numbering', 'Numbering', 'hash'], ['team', 'Team members', 'users'], ['roles', 'Roles & permissions', 'shield'], ['notif', 'Notifications', 'bell'], ['workspace', 'Workspace', 'layers']];
const PERMS = [['View quotations', 1, 1, 1, 1], ['Create & edit quotations', 1, 1, 1, 0], ['Send quotations', 1, 1, 1, 0], ['Approve discounts above 10%', 1, 1, 0, 0], ['Delete quotations', 1, 1, 0, 0], ['Manage customers', 1, 1, 1, 0], ['Manage products & pricing', 1, 1, 0, 0], ['Create invoices', 1, 1, 0, 1], ['Record payments', 1, 0, 0, 1], ['View reports', 1, 1, 0, 1], ['Manage team & billing', 1, 0, 0, 0]];
const ROLES = ['Owner', 'Sales Manager', 'Sales Executive', 'Accountant'];
A.setTab = el => { closeFloating(); QS.set.tab = el.dataset.tab; if (location.hash !== '#/app/settings') go('#/app/settings'); else rerender(); };
function pageSettings() {
  const s = S.settings; const t = QS.set.tab;
  const row = (h, p, inner) => `<div class="set-row"><div><h4>${h}</h4>${p ? `<p>${p}</p>` : ''}</div><div style="min-width:0">${inner}</div></div>`;
  const inp = (k, opts = {}) => `<input class="input" ${opts.type ? `type="${opts.type}"` : ''} value="${esc(s[k])}" data-ch="setS" data-k="${k}" aria-label="${esc(opts.label || k)}" ${opts.ph ? `placeholder="${esc(opts.ph)}"` : ''} style="${opts.w ? 'max-width:' + opts.w : ''}">`;
  let body = '';
  if (t === 'profile') body = row('Business name', 'Shown on quotations and emails.', `<div class="grid2">${inp('bizName', { label: 'Business name' })}${inp('legal', { label: 'Legal name', ph: 'Registered legal name' })}</div>`)
    + row('Tagline', '', inp('tagline', { label: 'Tagline' }))
    + row('Contact', 'Customers reply to these.', `<div class="grid2">${inp('email', { label: 'Email', type: 'email' })}${inp('phone', { label: 'Phone' })}${inp('website', { label: 'Website' })}</div>`)
    + row('Address', '', `<div class="stack" style="gap:8px">${inp('address', { label: 'Street address' })}${inp('city', { label: 'City, state, PIN' })}</div>`)
    + row('GSTIN', 'Printed on every quotation and invoice.', inp('gstin', { label: 'GSTIN', w: '260px' }));
  if (t === 'branding') body = row('Logo', 'Appears on documents and the client portal.', `<label class="logo-drop" for="st-logo"><span class="d-logo-sm" style="background:${s.brand}">${s.logo ? `<img src="${s.logo}" alt="">` : esc(initials(s.bizName))}</span><span style="flex:1"><b style="font-weight:500">${s.logo ? 'Replace logo' : 'Upload logo'}</b><div class="hint">PNG, JPG or SVG up to 2 MB</div></span>${s.logo ? `<button class="btn sm ghost" data-a="rmLogo">Remove</button>` : I('upload')}</label><input type="file" id="st-logo" accept="image/*" hidden data-ch="logoUp">`)
    + row('Brand colour', 'Used for headings, totals and buttons in the portal.', `<div class="swatches">${BRAND_SW.map(c => `<button class="sw ${s.brand.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-a="setBrand" data-v="${c}" aria-label="Brand colour ${c}"></button>`).join('')}<label class="sw sw-custom"><input type="color" value="${s.brand}" data-ch="brandPick" aria-label="Custom brand colour"></label></div>`)
    + row('Document font', '', `<select class="select" style="max-width:260px" data-ch="setS" data-k="font" aria-label="Document font">${DOC_FONTS.map(([v, l]) => `<option value="${v}" ${s.font === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)
    + row('Templates', 'Choose layouts and see a live preview.', `<button class="btn" data-a="go" data-to="#/app/templates">${I('layout', 'sm')} Open template gallery</button>`);
  if (t === 'category') { const cat = CATEGORIES[s.category]; body = row('What do you sell?', 'Changes the suggested fields in new quotations.', `<div class="opt-grid">${Object.entries(CATEGORIES).map(([k, c]) => `<button class="opt ${s.category === k ? 'on' : ''}" data-a="setSv" data-k="category" data-v="${k}" aria-pressed="${s.category === k}">${I(c.icon)}<b>${c.label}</b><span>${c.desc}</span></button>`).join('')}</div>`)
    + row('Suggested fields', `Added to the project section for ${cat.label.toLowerCase()} quotations.`, `<div class="row wrap" style="gap:6px">${cat.fields.map(f => `<span class="chip" style="cursor:default">${f[1]}<span class="ct">e.g. ${esc(f[2])}</span></span>`).join('')}</div><button class="btn sm" style="margin-top:12px" data-a="go" data-to="#/app/quotations/new">Try it in the builder ${I('right', 'sm')}</button>`); }
  if (t === 'currency') body = row('Currency', 'Applies to all amounts in this workspace.', `<select class="select" style="max-width:260px" data-ch="setS" data-k="currency" aria-label="Currency">${[['INR', 'Indian Rupee (₹)'], ['USD', 'US Dollar ($)'], ['EUR', 'Euro (€)'], ['GBP', 'Pound Sterling (£)'], ['AED', 'UAE Dirham (AED)']].map(([v, l]) => `<option value="${v}" ${s.currency === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)
    + row('Preview', 'Number format follows the currency’s locale.', `<div class="mini-kpis" style="grid-template-columns:repeat(3,1fr)"><div><small>Line amount</small><b>${money2(125400)}</b></div><div><small>Short form</small><b>${moneyC(2450000)}</b></div><div><small>Large total</small><b>${money(18750000)}</b></div></div><p class="hint" style="margin-top:8px">Demo amounts are not converted, only re-labelled.</p>`);
  if (t === 'tax') body = row('Tax label', 'What your tax is called on documents.', `<div class="seg">${['GST', 'VAT', 'Sales tax'].map(v => `<button class="${s.taxLabel === v ? 'on' : ''}" data-a="setSv" data-k="taxLabel" data-v="${v}">${v}</button>`).join('')}</div>`)
    + row('Default rate', 'Pre-selected for new items.', `<div class="seg">${TAXES.map(v => `<button class="${+s.defaultTax === v ? 'on' : ''}" data-a="setSvN" data-k="defaultTax" data-v="${v}">${v}%</button>`).join('')}</div>`)
    + row('Prices include tax', 'When on, unit prices are treated as tax-inclusive on new quotations.', `<button class="toggle ${s.taxInclusive ? 'on' : ''}" data-a="setTog" data-k="taxInclusive" role="switch" aria-checked="${s.taxInclusive}" aria-label="Prices include tax"></button>`)
    + row('Tax split', 'Intra-state supplies show CGST + SGST; inter-state show IGST.', `<div class="row wrap" style="gap:6px">${TAXES.filter(Boolean).map(v => `<span class="chip" style="cursor:default">${s.taxLabel} ${v}%<span class="ct">${v / 2}% + ${v / 2}%</span></span>`).join('')}</div>`)
    + row('Automatic round-off', 'Rounds the grand total to the nearest rupee and shows the difference on the document.', `<button class="toggle ${s.roundOff ? 'on' : ''}" data-a="setTog" data-k="roundOff" role="switch" aria-checked="${!!s.roundOff}" aria-label="Enable automatic round-off"></button>`)
    + row('Place of supply', 'Invoices to other states are charged IGST instead of CGST + SGST.', `<select class="select" style="width:auto" data-ch="setS" data-k="state" aria-label="Business state">${STATES.map(v => `<option ${s.state === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`)
    + row('Registration', '', inp('gstin', { label: 'GSTIN', w: '260px' }));
  if (t === 'bank') body = row('Payment details on invoices', 'Adds a Payment details block with your account and UPI to every invoice.', `<button class="toggle ${s.showBank ? 'on' : ''}" data-a="setTog" data-k="showBank" role="switch" aria-checked="${!!s.showBank}" aria-label="Show bank details on invoice"></button>`)
    + row('Account', '', `<div class="grid2">
        <div class="field"><label>Account holder name</label><input class="input" value="${esc(s.bank.accName)}" data-in="setBank" data-k="accName" aria-label="Account holder name"></div>
        <div class="field"><label>Bank name</label><input class="input" value="${esc(s.bank.bankName)}" data-in="setBank" data-k="bankName" aria-label="Bank name"></div>
        <div class="field"><label>Account number</label><input class="input" value="${esc(s.bank.acc)}" data-in="setBank" data-k="acc" aria-label="Account number"></div>
        <div class="field"><label>IFSC code</label><input class="input" value="${esc(s.bank.ifsc)}" data-in="setBank" data-k="ifsc" aria-label="IFSC code"></div>
        <div class="field"><label>Branch</label><input class="input" value="${esc(s.bank.branch)}" data-in="setBank" data-k="branch" aria-label="Branch"></div>
        <div class="field"><label>UPI ID</label><input class="input" value="${esc(s.bank.upi)}" data-in="setBank" data-k="upi" aria-label="UPI ID"></div>
      </div>`)
    + row('UPI QR code', 'Prints a scannable QR beside the payment details.', `<button class="toggle ${s.bank.qr ? 'on' : ''}" data-a="setBankTog" data-k="qr" role="switch" aria-checked="${!!s.bank.qr}" aria-label="Show UPI QR code"></button>`)
    + row('Preview', 'How it prints on the invoice.', `<div class="bank-prev">${bankBlock()}</div>`);
  if (t === 'terms') body = row('Validity', 'Days a new quotation stays open.', `<div class="row" style="gap:8px"><input class="input" type="number" min="1" max="180" style="max-width:100px" value="${s.validity}" data-ch="setS" data-k="validity" aria-label="Validity days"><span class="muted">days</span></div>`)
    + row('Payment terms', '', `<input class="input" value="${esc(s.paymentTerms)}" data-ch="setS" data-k="paymentTerms" aria-label="Payment terms">`)
    + row('Terms & conditions', 'Pre-filled on every new quotation; editable per quotation.', `<textarea class="textarea" rows="7" data-ch="setS" data-k="terms" aria-label="Terms and conditions">${esc(s.terms)}</textarea>`)
    + row('Document footer', '', `<input class="input" value="${esc(s.footer)}" data-ch="setS" data-k="footer" aria-label="Footer">`);
  if (t === 'numbering') body = row('Quotation numbers', `Next: <b class="mono">${esc(s.prefix)}${s.nextNo}</b>`, `<div class="grid2"><div class="field"><label>Prefix</label>${inp('prefix', { label: 'Quotation prefix' })}</div><div class="field"><label>Next number</label><input class="input" type="number" value="${s.nextNo}" data-ch="setS" data-k="nextNo" aria-label="Next quotation number"></div></div>`)
    + row('Invoice numbers', `Next: <b class="mono">${esc(s.invPrefix)}${s.invNext}</b>`, `<div class="grid2"><div class="field"><label>Prefix</label>${inp('invPrefix', { label: 'Invoice prefix' })}</div><div class="field"><label>Next number</label><input class="input" type="number" value="${s.invNext}" data-ch="setS" data-k="invNext" aria-label="Next invoice number"></div></div>`)
    + row('Other documents', 'Prefixes for the rest of the document flow.', `<div class="grid2">
        <div class="field"><label>Sales order</label><input class="input" value="${esc(s.ordPrefix)}" data-in="setS" data-k="ordPrefix" aria-label="Sales order prefix"></div>
        <div class="field"><label>Delivery challan</label><input class="input" value="${esc(s.dcPrefix)}" data-in="setS" data-k="dcPrefix" aria-label="Delivery challan prefix"></div>
        <div class="field"><label>Credit note</label><input class="input" value="${esc(s.cnPrefix)}" data-in="setS" data-k="cnPrefix" aria-label="Credit note prefix"></div>
        <div class="field"><label>Debit note</label><input class="input" value="${esc(s.dnPrefix)}" data-in="setS" data-k="dnPrefix" aria-label="Debit note prefix"></div>
        <div class="field"><label>Payment receipt</label><input class="input" value="${esc(s.rcptPrefix)}" data-in="setS" data-k="rcptPrefix" aria-label="Payment receipt prefix"></div>
        <div class="field"><label>Next receipt number</label><input class="input" type="number" min="1" value="${s.rcptNext}" data-in="setSN" data-k="rcptNext" aria-label="Next receipt number"></div>
      </div><p class="hint">Numbers are issued in sequence and never reused: ${esc(s.prefix)}${s.nextNo} · ${esc(s.ordPrefix)}${s.ordNext} · ${esc(s.invPrefix)}${s.invNext} · ${esc(s.dcPrefix)}${String(s.dcNext).padStart(4, '0')} · ${esc(s.rcptPrefix)}${String(s.rcptNext).padStart(4, '0')}</p>`)
    + row('Financial-year reset', 'Restart numbering every April.', `<button class="toggle ${s.fyReset ? 'on' : ''}" data-a="setTog" data-k="fyReset" role="switch" aria-checked="${!!s.fyReset}" aria-label="Reset numbering each financial year"></button>`);
  if (t === 'team') body = `<div class="row between" style="margin-bottom:10px"><p class="muted">${S.team.filter(m => m.status === 'active').length} active · ${S.team.filter(m => m.status === 'invited').length} invited</p><button class="btn primary" data-a="invite">${I('userplus')} Invite member</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Last active</th><th class="r"></th></tr></thead><tbody>${S.team.map(m => `<tr><td><div class="row" style="gap:10px">${av(m.name)}<div class="cell-2"><b>${esc(m.name)}</b><span>${esc(m.email)}</span></div></div></td>
      <td>${m.role === 'Owner' ? 'Owner' : `<select class="select" style="width:auto;height:30px" data-ch="teamRole" data-id="${m.id}" aria-label="Role for ${esc(m.name)}">${ROLES.slice(1).map(r => `<option ${m.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`}</td>
      <td>${m.status === 'active' ? badge('active', 'Active') : badge('pending', 'Invited')}</td><td class="muted">${esc(m.last)}</td>
      <td class="r">${m.role === 'Owner' ? '' : `${m.status === 'invited' ? `<button class="btn sm ghost" data-a="reinvite" data-id="${m.id}">Resend</button>` : ''}<button class="btn sm ghost icon" data-a="rmMember" data-id="${m.id}" aria-label="Remove ${esc(m.name)}">${I('trash', 'sm')}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  if (t === 'roles') body = `<p class="muted" style="margin-bottom:12px">Click a cell to change what each role can do. Owners always have full access.</p>
    <div class="tbl-wrap"><table class="tbl perm"><thead><tr><th>Permission</th>${ROLES.map(r => `<th style="text-align:center">${r}</th>`).join('')}</tr></thead><tbody>${PERMS.map((p, i) => `<tr><td>${p[0]}</td>${ROLES.map((r, j) => `<td><button class="perm-btn ${p[j + 1] ? 'on' : ''}" ${j === 0 ? 'disabled' : ''} data-a="permTog" data-i="${i}" data-j="${j + 1}" aria-pressed="${!!p[j + 1]}" aria-label="${esc(r)}: ${esc(p[0])}">${p[j + 1] ? I('check', 'sm') : ''}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (t === 'notif') body = [['accepted', 'Quotation accepted', 'When a customer accepts from the client portal'], ['rejected', 'Quotation rejected', 'Includes the reason they gave'], ['viewed', 'Quotation viewed', 'The first time and on repeat views'], ['expiring', 'Expiring soon', '3 days before a quotation expires'], ['followup', 'Follow-up reminders', 'On the morning a follow-up is due'], ['digest', 'Weekly digest', 'Monday summary of your pipeline']].map(([k, h, p]) => row(h, p, `<div class="row" style="gap:18px">${['In app', 'Email', 'WhatsApp'].map((ch, ci) => `<label class="row" style="gap:8px;font-size:13px"><button class="toggle ${ci === 0 ? (s.notif[k] ? 'on' : '') : (s.notif[k + ci] ? 'on' : '')}" data-a="notifTog" data-k="${ci === 0 ? k : k + ci}" role="switch" aria-checked="${!!(ci === 0 ? s.notif[k] : s.notif[k + ci])}" aria-label="${h} via ${ch}"></button>${ch}</label>`).join('')}</div>`)).join('');
  if (t === 'workspace') { const ws = S.workspaces.find(w => w.id === s.workspace); body = row('Workspaces', 'Separate brands or divisions, each with its own quotations.', `<div class="stack" style="gap:8px">${S.workspaces.map(w => `<div class="ws-row ${w.id === ws.id ? 'on' : ''}"><span class="ws-logo" style="background:${w.color}">${w.init}</span><div style="flex:1"><b style="font-weight:500">${esc(w.name)}</b><div class="lr-s">${esc(w.sub)}</div></div>${w.id === ws.id ? badge('active', 'Current') : `<button class="btn sm" data-a="wsPick" data-id="${w.id}">Switch</button>`}</div>`).join('')}</div>`)
    + row('Rename current workspace', '', `<input class="input" value="${esc(ws.name)}" data-ch="wsName" aria-label="Workspace name" style="max-width:320px">`)
    + row('Time zone & format', '', `<div class="grid2"><select class="select" aria-label="Time zone"><option>Asia/Kolkata (IST, UTC+5:30)</option><option>Asia/Dubai (GST, UTC+4)</option><option>Europe/London</option></select><select class="select" aria-label="Date format"><option>17 Sep 2026</option><option>17/09/2026</option><option>2026-09-17</option></select></div>`)
    + row('Demo data', 'Restore every sample record to its starting state.', `<button class="btn danger" data-a="resetDemo">${I('refresh', 'sm')} Reset demo data</button>`); }

  if (t === 'items') body = `<p class="muted" style="font-size:13px;margin:10px 0 14px">Choose which fields each line item asks for on the quotation builder and what prints on the quotation. Rename, reorder, hide, add or delete columns. Changes apply to new quotations; sent quotations keep the layout they were sent with.</p>
    <div id="cw-body"></div>
    <div class="row wrap" style="gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">
      <label class="row" style="gap:8px;font-size:13px;cursor:pointer;margin-right:auto"><input type="checkbox" id="cw-drafts"> Also update existing draft quotations</label>
      <button class="btn" data-a="cwReset">${I('refresh', 'sm')} Reset to standard</button>
      <button class="btn primary" data-a="cwSave">${I('check', 'sm')} Save columns</button>
    </div>`;

  const cur = SET_TABS.find(x => x[0] === t);
  const html = `
  <div class="ph"><div><h1>Settings</h1><p>Business profile, branding, taxes and team for ${esc(s.bizName)}.</p></div><span class="saved-pill" id="set-saved">${I('checkc', 'sm')} Saved</span></div>
  <div class="set-layout">
    <nav class="set-nav" aria-label="Settings sections">${SET_TABS.map(([k, l, ic]) => `<button class="${t === k ? 'on' : ''}" data-a="setTab" data-tab="${k}">${I(ic, 'sm')}${l}</button>`).join('')}</nav>
    <div class="panel"><div class="panel-h"><h3>${cur[1]}</h3></div><div class="panel-b" style="padding-top:4px">${body}</div></div>
  </div>`;
  return { html, title: 'Settings', keepScroll: true, after: () => { if (t === 'items') { cwInit(); drawCols(); $('#cw-drafts').onchange = e => CW.drafts = e.target.checked; } } };
}
A.setSvN = el => { S.settings[el.dataset.k] = +el.dataset.v; rerender(); flashSaved(); };
A.setTog = el => { S.settings[el.dataset.k] = !S.settings[el.dataset.k]; rerender(); flashSaved(); };
A.notifTog = el => { S.settings.notif[el.dataset.k] = !S.settings.notif[el.dataset.k]; rerender(); flashSaved(); };
A.permTog = el => { const p = PERMS[+el.dataset.i]; p[+el.dataset.j] = p[+el.dataset.j] ? 0 : 1; rerender(); flashSaved(); };
IN.teamRole = el => { const m = S.team.find(x => x.id === el.dataset.id); m.role = el.value; toast('Role updated', `${m.name} is now ${m.role}`); };
IN.wsName = el => { const w = S.workspaces.find(x => x.id === S.settings.workspace); if (!el.value.trim()) return; w.name = el.value.trim(); w.init = initials(w.name); renderTopbar(); toast('Workspace renamed'); };
A.rmMember = el => { const m = S.team.find(x => x.id === el.dataset.id); confirmBox(`Remove ${esc(m.name)}?`, 'They lose access to this workspace. Their quotations stay.', 'Remove', () => { S.team = S.team.filter(x => x !== m); toast('Member removed'); rerender(); }); };
A.reinvite = el => { const m = S.team.find(x => x.id === el.dataset.id); toast('Invite re-sent (simulation)', `No email was actually sent to ${m.email}`, 'warn'); };
A.invite = () => {
  openModal(`${mHead('Invite team member', 'They’ll get access to this workspace.')}<div class="mb stack"><div class="field"><label for="iv-n">Name</label><input class="input" id="iv-n" autofocus></div><div class="field"><label for="iv-e">Work email</label><input class="input" type="email" id="iv-e" placeholder="name@meridianworks.in"></div><div class="field"><label for="iv-r">Role</label><select class="select" id="iv-r">${ROLES.slice(1).map(r => `<option>${r}</option>`).join('')}</select></div><p class="hint err" id="iv-err"></p></div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="iv-ok">Send invite</button></div>`);
  $('#iv-ok').onclick = () => {
    const n = $('#iv-n').value.trim(), e = $('#iv-e').value.trim();
    if (!n || !/^\S+@\S+\.\S+$/.test(e)) { $('#iv-err').textContent = 'Add a name and a valid email.'; return; }
    if (S.team.some(m => m.email.toLowerCase() === e.toLowerCase())) { $('#iv-err').textContent = 'That person is already on the team.'; return; }
    S.team.push({ id: uid('sp'), name: n, email: e, role: $('#iv-r').value, status: 'invited', last: 'Invite pending' });
    closeModal(); toast('Invite created', `${n} appears as invited. No email was sent in this demo.`); rerender();
  };
};
