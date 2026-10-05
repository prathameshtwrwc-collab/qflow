/* ================= products & services ================= */
QS.prod = { q: '', cat: 'all', status: 'all', sort: 'quoted', dir: -1, page: 1, per: 10 };
function prodStats() {
  const m = {};
  S.products.forEach(p => m[p.id] = { n: 0, qty: 0, v: 0, accV: 0, acc: 0, rej: 0, qids: new Set() });
  for (const q of S.quotes) for (const it of q.items) {
    if (it.type === 'section' || !it.pid || !m[it.pid]) continue;
    const r = m[it.pid]; const v = it.qty * it.price * (1 - (it.disc || 0) / 100);
    r.v += v; r.qty += +it.qty;
    if (!r.qids.has(q.id)) { r.qids.add(q.id); r.n++; if (q.status === 'accepted') r.acc++; if (q.status === 'rejected') r.rej++; }
    if (q.status === 'accepted') r.accV += v;
  }
  Object.values(m).forEach(r => r.conv = r.acc + r.rej ? pct(r.acc, r.acc + r.rej) : 0);
  return m;
}
function pageProducts() {
  const st = QS.prod; const PS = prodStats();
  const cats = [...new Set(S.products.map(p => p.category))].sort();
  let rows = S.products.filter(p => {
    if (st.cat !== 'all' && p.category !== st.cat) return false;
    if (st.status !== 'all' && (st.status === 'active') !== p.active) return false;
    if (st.q && !(p.name + ' ' + p.sku + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(st.q.toLowerCase())) return false;
    return true;
  });
  const key = { name: p => p.name.toLowerCase(), price: p => p.price, quoted: p => PS[p.id].n, value: p => PS[p.id].v, conv: p => PS[p.id].conv, margin: p => p.price ? (p.price - p.cost) / p.price : 0, cat: p => p.category, created: p => p.created }[st.sort] || (p => p.name);
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / st.per)); if (st.page > pages) st.page = pages;
  const view = rows.slice((st.page - 1) * st.per, st.page * st.per);
  const ranked = S.products.slice().sort((a, b) => PS[b.id].n - PS[a.id].n);
  const bestConv = S.products.filter(p => PS[p.id].acc + PS[p.id].rej >= 5).sort((a, b) => PS[b.id].conv - PS[a.id].conv);
  const svc = S.products.filter(p => ['hour', 'day', 'job', 'month', 'year', 'lot'].includes(p.unit) || /service|design|install|amc/i.test(p.category));
  const bestSvc = svc.sort((a, b) => PS[b.id].accV - PS[a.id].accV).slice(0, 4);
  const totV = Object.values(PS).reduce((s, r) => s + r.v, 0), totA = Object.values(PS).reduce((s, r) => s + r.accV, 0);
  const catCount = {}; S.products.forEach(p => catCount[p.category] = (catCount[p.category] || 0) + 1);

  const html = `
  <div class="ph"><div><h1>Products & services</h1><p>${S.products.filter(p => p.active).length} active items across ${cats.length} categories. Anything here can be added to a quotation in one click.</p></div>
    <div class="row wrap"><button class="btn" data-a="exportDemo" data-what="products">${I('download')} Export</button><button class="btn primary" data-a="productEdit">${I('plus')} Add product</button></div></div>

  <div class="report-cards">
    <div class="rc"><small>Quoted value, all items</small><b>${moneyC(totV)}</b><span class="lr-s">${moneyC(totA)} accepted (${pct(totA, totV)}%)</span></div>
    <div class="rc"><small>Most quoted</small><b class="rc-t">${ranked[0] ? esc(ranked[0].name) : '—'}</b><span class="lr-s">In ${ranked[0] ? PS[ranked[0].id].n : 0} quotations</span></div>
    <div class="rc"><small>Best conversion</small><b class="rc-t">${bestConv[0] ? esc(bestConv[0].name) : '—'}</b><span class="lr-s">${bestConv[0] ? PS[bestConv[0].id].conv + '% of decided quotes won' : 'Not enough decisions yet'}</span></div>
    <div class="rc"><small>Average margin</small><b>${pct(S.products.reduce((s, p) => s + (p.price - p.cost), 0), S.products.reduce((s, p) => s + p.price, 0))}%</b><span class="lr-s">List price vs cost price</span></div>
  </div>

  <div class="dgrid">
    <div class="panel c8"><div class="panel-h"><div><h3>Quoted vs accepted value</h3><div class="sub">Top 8 items by quoted value</div></div><span class="spacer"></span><span class="demo-tag">Sample data</span></div>
      <div class="panel-b"><div class="chart-box"><canvas id="ch-prod" role="img" aria-label="Quoted and accepted value by product"></canvas></div></div></div>
    <div class="panel c4"><div class="panel-h"><h3>Best-performing services</h3><span class="spacer"></span><span class="sub">by accepted value</span></div>
      <div class="panel-b">${bestSvc.map((p, i) => `<div class="list-row click" data-a="productEdit" data-id="${p.id}"><span class="rank">${i + 1}</span><div style="flex:1;min-width:0"><div class="row between"><span class="lr-t">${esc(p.name)}</span><b class="num">${moneyC(PS[p.id].accV)}</b></div><div class="hbar"><i style="width:${PS[p.id].conv}%"></i></div><span class="lr-s">${PS[p.id].conv}% conversion · ${PS[p.id].n} quotes</span></div></div>`).join('') || emptyMini('No services yet')}
      <h5 class="mini-h">Categories</h5><div class="row wrap" style="gap:6px">${cats.map(c => `<button class="chip ${st.cat === c ? 'on' : ''}" data-a="setQS" data-key="prod" data-f="cat" data-v="${st.cat === c ? 'all' : esc(c)}">${esc(c)}<span class="ct">${catCount[c]}</span></button>`).join('')}</div></div></div>
  </div>

  <div class="panel" style="margin-top:14px">
    <div class="toolbar">
      <div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Name, SKU or description" value="${esc(st.q)}" data-in="setQS" data-key="prod" data-f="q" aria-label="Search products"></div>
      <select class="select" data-ch="setQS" data-key="prod" data-f="cat" aria-label="Category"><option value="all">All categories</option>${cats.map(c => `<option ${st.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select class="select" data-ch="setQS" data-key="prod" data-f="status" aria-label="Status">${[['all', 'Active & inactive'], ['active', 'Active only'], ['inactive', 'Inactive only']].map(([v, l]) => `<option value="${v}" ${st.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <span class="spacer"></span>
      ${st.q || st.cat !== 'all' || st.status !== 'all' ? `<button class="btn sm ghost" data-a="prodClear">Clear filters</button>` : ''}
    </div>
    ${view.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${sortTh('prod', 'name', 'Item')}${sortTh('prod', 'cat', 'Category')}<th>SKU</th><th>HSN/SAC</th>${sortTh('prod', 'price', 'Price', 'r')}<th>Tax</th>${sortTh('prod', 'margin', 'Margin', 'r')}${sortTh('prod', 'quoted', 'Quoted', 'r')}${sortTh('prod', 'value', 'Quoted value', 'r')}${sortTh('prod', 'conv', 'Conversion')}<th>Active</th><th class="r">Actions</th></tr></thead><tbody>
    ${view.map(p => { const r = PS[p.id]; const mg = p.price ? pct(p.price - p.cost, p.price) : 0; return `<tr class="click ${p.active ? '' : 'dim'}" data-a="prodRow" data-id="${p.id}">
      <td><div class="cell-2" style="max-width:300px"><b>${esc(p.name)}</b><span class="ell">${esc(p.desc)}</span></div></td>
      <td>${esc(p.category)}</td><td class="mono">${esc(p.sku)}</td><td class="mono">${esc(p.hsn || '—')}</td>
      <td class="r num"><b style="font-weight:600">${money(p.price)}</b><div class="lr-s">per ${esc(p.unit)}</div></td>
      <td>${p.tax}%</td><td class="r num">${mg}%</td><td class="r num">${r.n}</td><td class="r num">${money(r.v)}</td>
      <td>${r.acc + r.rej ? `<span class="bar-mini"><i style="width:${r.conv}%"></i></span><span class="num">${r.conv}%</span>` : '<span class="muted">—</span>'}</td>
      <td data-stop><button class="toggle ${p.active ? 'on' : ''}" data-a="prodToggle" data-id="${p.id}" role="switch" aria-checked="${p.active}" aria-label="Active"></button></td>
      <td class="r" data-stop><div class="row" style="justify-content:flex-end;gap:2px">
        <button class="btn sm ghost" data-a="prodUse" data-id="${p.id}" ${p.active ? '' : 'disabled'} title="Start a quotation with this item">${I('plus', 'sm')} Quote</button>
        <div class="menu-wrap"><button class="btn sm ghost icon" data-a="prodMenu" data-id="${p.id}" aria-label="More actions">${I('more')}</button></div></div></td></tr>`; }).join('')}
    </tbody></table></div>${pager('prod', total, st.per)}` : `<div class="empty">${I('box')}<h4>No items match</h4><p>Change the filters or add a new product or service.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="prodClear">Clear filters</button><button class="btn primary" data-a="productEdit">${I('plus')} Add product</button></div></div>`}
  </div>`;
  return {
    html, title: 'Products & services', keepScroll: true, after: () => {
      const top = S.products.slice().sort((a, b) => PS[b.id].v - PS[a.id].v).slice(0, 8); const C = COL();
      mkChart('ch-prod', { type: 'bar', data: { labels: top.map(p => p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name), datasets: [{ label: 'Quoted value', data: top.map(p => Math.round(PS[p.id].v)), backgroundColor: C.line, borderRadius: 3, maxBarThickness: 22 }, { label: 'Accepted value', data: top.map(p => Math.round(PS[p.id].accV)), backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 22 }] }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9 } }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${money(x.raw)}` } } }, scales: { y: { ticks: { callback: v => moneyC(v) } }, x: { ticks: { maxRotation: 0, autoSkip: false, font: { size: 10.5 }, callback(v) { const l = this.getLabelForValue(v); return l.length > 12 ? l.split(' ').reduce((a, w) => { const last = a[a.length - 1]; if ((last + ' ' + w).length > 13 && last) a.push(w); else a[a.length - 1] = (last ? last + ' ' : '') + w; return a; }, ['']) : l; } } } } } });
    }
  };
}
A.prodClear = () => { Object.assign(QS.prod, { q: '', cat: 'all', status: 'all', page: 1 }); rerender(); };
A.prodRow = (el, e) => { if (e.target.closest('[data-stop]')) return; A.productEdit(el); };
A.prodToggle = el => { const p = prod(el.dataset.id); p.active = !p.active; toast(p.active ? 'Item activated' : 'Item deactivated', p.active ? `${p.name} is available in the quotation builder` : `${p.name} is hidden from the builder`); rerender(); };
A.prodMenu = el => { const id = el.dataset.id; rowMenu(el, [['productEdit', 'edit', 'View & edit', { id }], ['prodUse', 'plus', 'Use in new quotation', { id }], ['prodDup', 'copy', 'Duplicate', { id }], ['prodQuotes', 'file', 'Quotations with this item', { id }], '-', ['prodDel', 'trash', 'Delete', { id }, true]]); };
A.prodUse = el => {
  closeFloating(); const p = prod(el.dataset.id);
  BQ = blankQuote(); BQ.items = [{ id: uid('i'), type: 'item', pid: p.id, name: p.name, desc: p.desc, sku: p.sku, hsn: p.hsn, qty: 1, unit: p.unit, price: p.price, disc: 0, tax: p.tax }];
  BQ._route = '#/app/quotations/new'; BQ_DIRTY = false; closeModal(true); go('#/app/quotations/new');
  toast('Added to a new quotation', `${p.name}, pick a customer to continue`);
};
A.prodDup = el => { closeFloating(); const p = prod(el.dataset.id); const n = { ...p, id: uid('p'), name: p.name + ' (copy)', sku: p.sku + '-C', created: iso(TODAY) }; S.products.splice(S.products.indexOf(p) + 1, 0, n); toast('Item duplicated', n.name); rerender(); };
A.prodQuotes = el => { closeFloating(); closeModal(true); Object.assign(QS.quotes, { status: 'all', q: '', sp: 'all', range: 'all', min: '', max: '', cid: '', pid: el.dataset.id, page: 1 }); go('#/app/quotations'); };
A.prodDel = el => {
  closeFloating(); const p = prod(el.dataset.id); const used = prodStats()[p.id].n;
  confirmBox(`Delete ${esc(p.name)}?`, used ? `It appears in ${used} existing quotations. Those quotations keep their line items; the item just won’t be available for new ones. You could deactivate it instead.` : 'This item has not been quoted yet.', 'Delete item', () => { S.products = S.products.filter(x => x.id !== p.id); closeModal(true); toast('Item deleted', p.name); rerender(); });
};
A.productEdit = el => {
  closeFloating();
  const id = el?.dataset?.id; const p = id ? prod(id) : null; const isNew = !p;
  const cats = [...new Set(S.products.map(x => x.category))].sort();
  const r = p ? prodStats()[p.id] : null;
  const d = p || { name: '', category: cats[0], desc: '', sku: 'MW-' + String(S.products.length + 1).padStart(3, '0'), hsn: '', price: '', unit: 'nos', tax: S.settings.defaultTax, cost: '', active: true };
  openModal(`${mHead(isNew ? 'Add product or service' : d.name, isNew ? 'Items you add appear in the quotation builder catalogue.' : `${esc(d.sku)} · ${esc(d.category)}`)}
  <div class="mb">
    ${r ? `<div class="mini-kpis" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px"><div><small>Quoted</small><b>${r.n}×</b></div><div><small>Quoted value</small><b>${moneyC(r.v)}</b></div><div><small>Accepted value</small><b>${moneyC(r.accV)}</b></div><div><small>Conversion</small><b>${r.acc + r.rej ? r.conv + '%' : '—'}</b></div></div>` : ''}
    <div class="grid2">
      <div class="field" style="grid-column:1/-1"><label for="pe-name">Name</label><input class="input" id="pe-name" value="${esc(d.name)}" placeholder="e.g. Acoustic ceiling panel" autofocus></div>
      <div class="field"><label for="pe-cat">Category</label><input class="input" id="pe-cat" list="pe-cats" value="${esc(d.category)}"><datalist id="pe-cats">${cats.map(c => `<option>${esc(c)}</option>`).join('')}</datalist></div>
      <div class="field"><label for="pe-sku">SKU / item code</label><input class="input mono" id="pe-sku" value="${esc(d.sku)}"></div>
      <div class="field"><label for="pe-hsn">HSN / SAC code</label><input class="input mono" id="pe-hsn" value="${esc(d.hsn || '')}" placeholder="e.g. 9403" list="pe-hsns"><datalist id="pe-hsns">${[...new Set(Object.values(HSN_BY_CAT))].map(h => `<option>${h}</option>`).join('')}</datalist></div>
      <div class="field" style="grid-column:1/-1"><label for="pe-desc">Description</label><textarea class="textarea" id="pe-desc" rows="2">${esc(d.desc)}</textarea></div>
      <div class="field"><label for="pe-price">Selling price (${cur().sym.trim()})</label><input class="input" type="number" min="0" id="pe-price" value="${d.price}"></div>
      <div class="field"><label for="pe-cost">Cost price (${cur().sym.trim()})</label><input class="input" type="number" min="0" id="pe-cost" value="${d.cost}"></div>
      <div class="field"><label for="pe-unit">Unit</label><select class="select" id="pe-unit">${UNITS.map(u => `<option ${u === d.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      <div class="field"><label for="pe-tax">Tax rate</label><select class="select" id="pe-tax">${TAXES.map(t => `<option value="${t}" ${t === +d.tax ? 'selected' : ''}>${S.settings.taxLabel} ${t}%</option>`).join('')}</select></div>
    </div>
    <div class="row between" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><div><b style="font-weight:500">Active</b><div class="hint">Inactive items are hidden from the builder.</div></div><button class="toggle ${d.active ? 'on' : ''}" id="pe-act" role="switch" aria-checked="${d.active}" aria-label="Active" onclick="this.classList.toggle('on');this.setAttribute('aria-checked',this.classList.contains('on'))"></button></div>
    <p class="hint" id="pe-margin" style="margin-top:10px"></p><p class="hint err" id="pe-err"></p>
  </div>
  <div class="mf">${p ? `<button class="btn ghost" style="margin-right:auto;color:var(--red)" data-a="prodDel" data-id="${p.id}">${I('trash', 'sm')} Delete</button><button class="btn" data-a="prodUse" data-id="${p.id}">${I('plus', 'sm')} Use in quotation</button>` : ''}<button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="pe-save">${isNew ? 'Add item' : 'Save changes'}</button></div>`, 'wide', () => {
    const mg = () => { const pr = +$('#pe-price').value, co = +$('#pe-cost').value; $('#pe-margin').textContent = pr ? `Margin ${money(pr - co)} per ${$('#pe-unit').value} (${pct(pr - co, pr)}%)` : ''; };
    ['pe-price', 'pe-cost', 'pe-unit'].forEach(i => $('#' + i).addEventListener('input', mg)); mg();
  });
  $('#pe-save').onclick = () => {
    const v = i => $('#' + i).value.trim();
    const errs = [];
    if (!v('pe-name')) errs.push('a name'); if (!(+v('pe-price') > 0)) errs.push('a selling price');
    if (S.products.some(x => x.sku.toLowerCase() === v('pe-sku').toLowerCase() && x !== p)) errs.push('a unique SKU');
    if (errs.length) { $('#pe-err').textContent = 'Add ' + errs.join(', ') + '.'; return; }
    const data = { name: v('pe-name'), category: v('pe-cat') || 'General', sku: v('pe-sku'), hsn: v('pe-hsn'), desc: v('pe-desc'), price: +v('pe-price'), cost: +v('pe-cost') || 0, unit: v('pe-unit'), tax: +v('pe-tax'), active: $('#pe-act').classList.contains('on') };
    if (p) Object.assign(p, data); else S.products.unshift({ id: uid('p'), created: iso(TODAY), ...data });
    closeModal(); toast(p ? 'Item updated' : 'Item added', p ? data.name : `${data.name} is ready to use in quotations`);
    if (!p) Object.assign(QS.prod, { sort: 'created', dir: -1, page: 1, q: '', cat: 'all', status: 'all' });
    rerender();
  };
};

/* ================= sales pipeline ================= */
const STAGES = [
  ['new', 'New lead', '--slate'], ['contacted', 'Contacted', '--slate'], ['requirement', 'Requirement collected', '--blue'],
  ['created', 'Quotation created', '--blue'], ['sent', 'Quotation sent', '--blue'], ['viewed', 'Quotation viewed', '--cyan'],
  ['negotiation', 'Negotiation', '--amber'], ['accepted', 'Accepted', '--accent'], ['rejected', 'Rejected', '--red'], ['converted', 'Converted', '--accent'],
];
const OPEN_ST = ['new', 'contacted', 'requirement', 'created', 'sent', 'viewed', 'negotiation'];
QS.pipe = { sp: 'all', q: '', hideClosed: false };
function pagePipeline() {
  const st = QS.pipe; const today = iso(TODAY);
  const leads = S.leads.filter(l => {
    if (st.sp !== 'all' && l.sp !== st.sp) return false;
    if (st.q) { const c = cust(l.cid); if (!(c.name + ' ' + c.company + ' ' + l.title).toLowerCase().includes(st.q.toLowerCase())) return false; }
    return true;
  });
  const open = leads.filter(l => OPEN_ST.includes(l.stage));
  const won = leads.filter(l => ['accepted', 'converted'].includes(l.stage)), lost = leads.filter(l => l.stage === 'rejected');
  const pendFu = open.filter(l => l.fu && l.fu <= today);
  const openV = open.reduce((s, l) => s + l.value, 0);
  const weights = { new: .05, contacted: .1, requirement: .2, created: .3, sent: .4, viewed: .5, negotiation: .65 };
  const weighted = open.reduce((s, l) => s + l.value * weights[l.stage], 0);
  const stages = STAGES.filter(s => !(st.hideClosed && ['accepted', 'rejected', 'converted'].includes(s[0])));

  const perf = SALES.map(sp => {
    const L = S.leads.filter(l => l.sp === sp.id); const Q = S.quotes.filter(q => q.sp === sp.id);
    const w = L.filter(l => ['accepted', 'converted'].includes(l.stage)).length, lo = L.filter(l => l.stage === 'rejected').length;
    const qa = Q.filter(q => q.status === 'accepted'), qr = Q.filter(q => q.status === 'rejected');
    return { sp, leads: L.length, open: L.filter(l => OPEN_ST.includes(l.stage)).reduce((s, l) => s + l.value, 0), wonV: qa.reduce((s, q) => s + q.total, 0), sent: Q.filter(q => q.status !== 'draft').length, rate: pct(qa.length, qa.length + qr.length), fu: S.followups.filter(f => f.sp === sp.id && f.status === 'pending' && f.due <= today).length, leadWin: pct(w, w + lo) };
  });
  const maxWon = Math.max(...perf.map(p => p.wonV), 1);

  const html = `
  <div class="ph"><div><h1>Sales pipeline</h1><p>Drag a card to move it between stages, or use the stage menu on the card. Linked quotations update with it.</p></div>
    <div class="row wrap"><button class="btn" data-a="exportDemo" data-what="pipeline">${I('download')} Export</button><button class="btn primary" data-a="addLead">${I('plus')} Add lead</button></div></div>
  <div class="report-cards five">
    <div class="rc"><small>Open pipeline value</small><b>${moneyC(openV)}</b><span class="lr-s">${moneyC(weighted)} weighted forecast</span></div>
    <div class="rc"><small>Open leads</small><b>${numF(open.length)}</b><span class="lr-s">${numF(leads.length)} total in view</span></div>
    <div class="rc"><small>Win rate</small><b>${pct(won.length, won.length + lost.length)}%</b><span class="lr-s">${won.length} won · ${lost.length} lost</span></div>
    <div class="rc"><small>Won value</small><b>${moneyC(won.reduce((s, l) => s + l.value, 0))}</b><span class="lr-s">${leads.filter(l => l.stage === 'converted').length} converted to invoice</span></div>
    <button class="rc rc-btn" data-a="go" data-to="#/app/followups"><small>Follow-ups due</small><b style="color:${pendFu.length ? 'var(--red)' : 'inherit'}">${pendFu.length}</b><span class="lr-s">Open follow-ups ${I('right', 'sm')}</span></button>
  </div>
  <div class="panel" style="margin-top:14px"><div class="toolbar" style="border-bottom:0">
    <div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Customer or deal" value="${esc(st.q)}" data-in="setQS" data-key="pipe" data-f="q" aria-label="Search leads"></div>
    <select class="select" data-ch="setQS" data-key="pipe" data-f="sp" aria-label="Salesperson"><option value="all">All salespeople</option>${SALES.map(s => `<option value="${s.id}" ${st.sp === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
    <label class="row" style="gap:8px;font-size:13px;cursor:pointer"><button class="toggle ${st.hideClosed ? 'on' : ''}" data-a="pipeClosed" role="switch" aria-checked="${st.hideClosed}" aria-label="Hide closed stages"></button>Hide closed stages</label>
    <span class="spacer"></span>
    <div class="stagebar" aria-hidden="true">${STAGES.map(([k, l, c]) => { const n = leads.filter(x => x.stage === k).length; return `<i style="flex:${Math.max(n, .3)};background:var(${c})" title="${l}: ${n}"></i>`; }).join('')}</div>
  </div></div>
  <div class="kanban" id="kanban" style="margin-top:12px">
    ${stages.map(([k, l, c]) => { const L = leads.filter(x => x.stage === k).sort((a, b) => b.last - a.last); return `<section class="kcol" data-stage="${k}" aria-label="${l}">
      <div class="kcol-h"><span class="stage-dot" style="background:var(${c})"></span><b>${l}</b><span class="ct">${L.length}</span><span class="val">${moneyC(L.reduce((s, x) => s + x.value, 0))}</span></div>
      <div class="kcol-b">${L.length ? L.map(leadCard).join('') : `<div class="kempty">Drop a lead here</div>`}</div></section>`; }).join('')}
  </div>
  <div class="dgrid">
    <div class="panel c8"><div class="panel-h"><div><h3>Salesperson performance</h3><div class="sub">All-time, based on quotations and leads they own</div></div></div>
      <div class="panel-b" style="padding-top:8px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Salesperson</th><th class="r">Leads</th><th class="r">Open value</th><th class="r">Quotes sent</th><th>Quote win rate</th><th class="r">Won value</th><th class="r">Follow-ups due</th></tr></thead><tbody>
      ${perf.map(p => `<tr><td><div class="row" style="gap:9px">${av(p.sp.name, 'xs')}<div class="cell-2"><b>${p.sp.name}</b><span>${p.sp.role}</span></div></div></td><td class="r num">${p.leads}</td><td class="r num">${moneyC(p.open)}</td><td class="r num">${p.sent}</td><td><span class="bar-mini"><i style="width:${p.rate}%"></i></span><span class="num">${p.rate}%</span></td><td class="r num"><b style="font-weight:600">${moneyC(p.wonV)}</b><div class="hbar" style="width:80px;margin-left:auto"><i style="width:${p.wonV / maxWon * 100}%"></i></div></td><td class="r num" style="color:${p.fu ? 'var(--red)' : 'inherit'}">${p.fu}</td></tr>`).join('')}
      </tbody></table></div></div></div>
    <div class="panel c4"><div class="panel-h"><div><h3>Stage conversion</h3><div class="sub">Leads that reached each stage or beyond</div></div></div>
      <div class="panel-b">${OPEN_ST.concat(['accepted']).map((k, i, arr) => { const idx = STAGES.findIndex(s => s[0] === k); const reached = leads.filter(l => { const li = STAGES.findIndex(s => s[0] === l.stage); return l.stage === 'rejected' ? idx <= 6 : li >= idx; }).length; return `<div style="margin-bottom:8px"><div class="row between" style="font-size:12.5px"><span>${STAGES[idx][1]}</span><span class="num muted">${reached} · ${pct(reached, leads.length)}%</span></div><div class="hbar"><i style="width:${pct(reached, leads.length)}%;background:var(${STAGES[idx][2]})"></i></div></div>`; }).join('')}</div></div>
  </div>`;
  return { html, title: 'Sales pipeline', keepScroll: true, after: bindKanban };
}
function leadCard(l) {
  const c = cust(l.cid); const q = l.qid ? quote(l.qid) : null; const od = l.fu && l.fu < iso(TODAY) && OPEN_ST.includes(l.stage);
  return `<article class="kcard" draggable="true" data-id="${l.id}" tabindex="0">
    <div class="row between" style="gap:6px;align-items:flex-start"><div style="min-width:0"><div class="kt ell">${esc(c.company)}</div><div class="lr-s ell">${esc(l.title)}${q ? ` · <a data-a="go" data-to="#/app/quotations/${q.id}" style="cursor:pointer">${q.no}</a>` : ''}</div></div>
    <div class="menu-wrap"><button class="btn sm ghost icon" data-a="leadMenu" data-id="${l.id}" aria-label="Lead actions" style="margin:-4px -6px 0 0">${I('more', 'sm')}</button></div></div>
    <div class="km"><span class="amt">${l.value ? money(l.value) : '<span class="muted" style="font-weight:400">No value</span>'}</span>${q ? badge(q.status) : ''}</div>
    <select class="select" data-ch="leadStage" data-id="${l.id}" aria-label="Move ${esc(c.company)} to stage">${STAGES.map(([k, n]) => `<option value="${k}" ${k === l.stage ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <div class="kf">${av(spName(l.sp), 'xs')}<span class="ell" style="flex:1">${spName(l.sp).split(' ')[0]} · ${rel(l.last)}</span>${l.fu && OPEN_ST.includes(l.stage) ? `<span class="${od ? 'overdue-t' : ''}" title="Follow-up date">${I('clock', 'sm')} ${l.fu === iso(TODAY) ? 'Today' : fdateS(l.fu)}</span>` : ''}</div>
  </article>`;
}
function bindKanban() {
  const k = $('#kanban'); if (!k) return;
  let dragId = null;
  k.addEventListener('dragstart', e => { const c = e.target.closest('.kcard'); if (!c) return; dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  k.addEventListener('dragend', e => { e.target.closest('.kcard')?.classList.remove('dragging'); $$('.kcol.over').forEach(x => x.classList.remove('over')); });
  k.addEventListener('dragover', e => { const col = e.target.closest('.kcol'); if (!col || !dragId) return; e.preventDefault(); $$('.kcol.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
  k.addEventListener('dragleave', e => { const col = e.target.closest('.kcol'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
  k.addEventListener('drop', e => { const col = e.target.closest('.kcol'); if (!col || !dragId) return; e.preventDefault(); const id = dragId; dragId = null; moveLead(id, col.dataset.stage); });
}
IN.leadStage = el => moveLead(el.dataset.id, el.value);
function moveLead(id, stage) {
  const l = S.leads.find(x => x.id === id); if (!l || l.stage === stage) { rerender(); return; }
  const from = STAGES.find(s => s[0] === l.stage)[1], to = STAGES.find(s => s[0] === stage)[1];
  const q = l.qid ? quote(l.qid) : null; const c = cust(l.cid);
  const finish = () => { l.stage = stage; l.last = Date.now(); if (q) l.value = q.total; rerender(); setNav(CURRENT); };
  if (q && stage === 'rejected' && q.status !== 'rejected') {
    openModal(`${mHead('Mark as rejected', `${q.no} · ${esc(c.company)}`)}<div class="mb"><p class="hint" style="margin-bottom:10px">The linked quotation will be marked rejected and counted in analytics.</p><div class="reason-opts">${REJECT_REASONS.map((r, i) => `<label><input type="radio" name="lr" value="${esc(r)}" ${i ? '' : 'checked'}>${esc(r)}</label>`).join('')}</div></div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn dark" id="lr-ok">Mark rejected</button></div>`);
    modalCleanup = () => rerender();
    $('#lr-ok').onclick = () => { applyStatus(q, 'rejected', $('input[name=lr]:checked').value, 'Pipeline update'); modalCleanup = null; closeModal(); finish(); toast(`${q.no} marked rejected`, 'Rejected count and reasons updated'); };
    return;
  }
  if (q && stage === 'converted' && !q.invoiced) { A.convertQ({ dataset: { id: q.id } }); modalCleanup = () => rerender(); return; }
  if (q) {
    const want = { sent: 'sent', viewed: 'viewed', accepted: 'accepted' }[stage];
    if (want && q.status !== want && !(want === 'sent' && q.status !== 'draft')) applyStatus(q, want, '', 'Pipeline update');
  }
  finish();
  toast(`Moved to ${to}`, `${c.company}, from ${from}${q && ['sent', 'viewed', 'accepted'].includes(stage) ? `. ${q.no} is now ${q.status}` : ''}`);
  if (!q && ['created', 'sent'].includes(stage)) setTimeout(() => toast('No quotation linked yet', 'Use the card menu to create one for this lead', 'warn'), 400);
}
A.pipeClosed = () => { QS.pipe.hideClosed = !QS.pipe.hideClosed; rerender(); };
A.leadMenu = el => {
  const l = S.leads.find(x => x.id === el.dataset.id);
  rowMenu(el, [['go', 'user', 'Open customer', { to: '#/app/customers/' + l.cid }],
    l.qid ? ['go', 'file', 'Open quotation', { to: '#/app/quotations/' + l.qid }] : ['leadQuote', 'plus', 'Create quotation', { id: l.id }],
    ...(l.qid ? [['shareQ', 'send', 'Send quotation', { id: l.qid, ch: 'email' }]] : []),
    ['leadFu', 'clock', 'Set follow-up date', { id: l.id }], ['addFollowup', 'note', 'Add follow-up task', { cid: l.cid, qid: l.qid || '' }], '-',
    ['leadDel', 'trash', 'Remove from pipeline', { id: l.id }, true]]);
};
A.leadQuote = el => { const l = S.leads.find(x => x.id === el.dataset.id); A.newQFor({ dataset: { cid: l.cid } }); if (l.title) BQ.project = l.title; l.pendingQuote = true; };
A.leadFu = el => {
  closeFloating(); const l = S.leads.find(x => x.id === el.dataset.id);
  openModal(`${mHead('Follow-up date', esc(cust(l.cid).company))}<div class="mb"><div class="field"><label for="lf-d">Next follow-up</label><input class="input" type="date" id="lf-d" value="${l.fu || iso(addDays(TODAY, 2))}"></div></div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="lf-ok">Save</button></div>`);
  $('#lf-ok').onclick = () => { l.fu = $('#lf-d').value; closeModal(); toast('Follow-up date set', fdate(l.fu)); rerender(); };
};
A.leadDel = el => { closeFloating(); const l = S.leads.find(x => x.id === el.dataset.id); confirmBox('Remove lead?', `${esc(cust(l.cid).company)} will be removed from the pipeline. The customer and any quotations stay.`, 'Remove', () => { S.leads = S.leads.filter(x => x !== l); toast('Lead removed'); rerender(); }); };
A.addLead = () => {
  openModal(`${mHead('Add lead', 'Track a new opportunity from first contact to invoice.')}
  <div class="mb stack">
    <div class="field"><label for="al-c">Customer</label><div class="row" style="gap:6px"><select class="select" id="al-c">${S.customers.slice(0, 500).map(c => `<option value="${c.id}">${esc(c.company)} · ${esc(c.name)}</option>`).join('')}</select><button class="btn" data-a="addCustomer" title="New customer">${I('userplus', 'sm')}</button></div></div>
    <div class="field"><label for="al-t">Opportunity</label><input class="input" id="al-t" placeholder="e.g. Second floor fit-out" autofocus></div>
    <div class="grid2">
      <div class="field"><label for="al-v">Estimated value (${cur().sym.trim()})</label><input class="input" type="number" min="0" id="al-v" placeholder="250000"></div>
      <div class="field"><label for="al-s">Stage</label><select class="select" id="al-s">${STAGES.slice(0, 3).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="field"><label for="al-sp">Owner</label><select class="select" id="al-sp">${SALES.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div class="field"><label for="al-f">Follow-up</label><input class="input" type="date" id="al-f" value="${iso(addDays(TODAY, 2))}"></div>
    </div><p class="hint err" id="al-err"></p>
  </div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="al-ok">Add lead</button></div>`);
  $('#al-ok').onclick = () => {
    const t = $('#al-t').value.trim(); if (!t) { $('#al-err').textContent = 'Give the opportunity a name.'; $('#al-t').classList.add('err'); return; }
    const cc = cust($('#al-c').value);
    S.leads.push({ id: uid('l'), cid: cc.id, qid: null, title: t, value: +$('#al-v').value || 0, stage: $('#al-s').value, sp: $('#al-sp').value, last: Date.now(), fu: $('#al-f').value });
    closeModal(); toast('Lead added', `${cc.company} added to the pipeline`); rerender();
  };
};

/* ================= follow-ups ================= */
QS.fu = { tab: 'open', sp: 'all', type: 'all', q: '' };
function pageFollowups() {
  refreshExpiry();
  const st = QS.fu; const today = iso(TODAY); const wk = iso(addDays(TODAY, 7)); const ago14 = Date.now() - 14 * DAY;
  const all = S.followups;
  const pend = all.filter(f => f.status === 'pending');
  const dueToday = pend.filter(f => f.due === today), overdue = pend.filter(f => f.due < today), upcoming = pend.filter(f => f.due > today && f.due <= wk);
  const doneWeek = all.filter(f => f.status === 'done' && f.doneAt && f.doneAt > Date.now() - 7 * DAY);
  let list = all.filter(f => {
    if (st.tab === 'open' && f.status !== 'pending') return false;
    if (st.tab === 'today' && !(f.status === 'pending' && f.due === today)) return false;
    if (st.tab === 'overdue' && !(f.status === 'pending' && f.due < today)) return false;
    if (st.tab === 'upcoming' && !(f.status === 'pending' && f.due > today)) return false;
    if (st.tab === 'done' && f.status !== 'done') return false;
    if (st.sp !== 'all' && f.sp !== st.sp) return false;
    if (st.type !== 'all' && f.type !== st.type) return false;
    if (st.q) { const c = cust(f.cid); if (!(c.name + ' ' + c.company + ' ' + f.note).toLowerCase().includes(st.q.toLowerCase())) return false; }
    return true;
  }).sort((a, b) => st.tab === 'done' ? (b.doneAt || 0) - (a.doneAt || 0) : a.due.localeCompare(b.due));
  const groups = [];
  const bucket = f => f.status === 'done' ? 'Completed' : f.due < today ? 'Overdue' : f.due === today ? 'Today' : f.due === iso(addDays(TODAY, 1)) ? 'Tomorrow' : f.due <= wk ? 'Next 7 days' : 'Later';
  list.forEach(f => { const b = bucket(f); let g = groups.find(x => x[0] === b); if (!g) groups.push(g = [b, []]); g[1].push(f); });

  const awaiting = S.quotes.filter(q => ['sent', 'viewed'].includes(q.status)).sort((a, b) => (b.viewedAt || b.sentAt || 0) - (a.viewedAt || a.sentAt || 0)).slice(0, 6);
  const expiring = S.quotes.filter(q => ['sent', 'viewed'].includes(q.status) && q.expiry <= wk).sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 6);
  const recRej = S.quotes.filter(q => q.status === 'rejected' && q.respondedAt > ago14).sort((a, b) => b.respondedAt - a.respondedAt).slice(0, 5);
  const recAcc = S.quotes.filter(q => q.status === 'accepted' && q.respondedAt > ago14).sort((a, b) => b.respondedAt - a.respondedAt).slice(0, 5);
  const qRow = (q, right, act) => { const c = cust(q.cid); return `<div class="list-row click" data-a="rowGo" data-to="#/app/quotations/${q.id}">${av(c.name, 'xs')}<div style="flex:1;min-width:0"><div class="lr-t">${esc(c.company)}</div><span class="lr-s">${q.no} · ${money(q.total)}${right ? ' · ' + right : ''}</span></div>${act || ''}</div>`; };
  const tabs = [['open', 'Open', pend.length], ['today', 'Today', dueToday.length], ['overdue', 'Overdue', overdue.length], ['upcoming', 'Upcoming', pend.length - dueToday.length - overdue.length], ['done', 'Completed', all.length - pend.length], ['all', 'All', all.length]];

  const html = `
  <div class="ph"><div><h1>Follow-ups & activity</h1><p>Every reminder, next action and quotation that needs a nudge, in one place.</p></div>
    <div class="row wrap"><button class="btn primary" data-a="addFollowup">${I('plus')} Add follow-up</button></div></div>
  <div class="report-cards">
    <button class="rc rc-btn ${st.tab === 'today' ? 'on' : ''}" data-a="setQS" data-key="fu" data-f="tab" data-v="today"><small>${I('cal', 'sm')} Today’s follow-ups</small><b>${dueToday.length}</b><span class="lr-s">${dueToday.filter(f => f.type === 'Call').length} calls</span></button>
    <button class="rc rc-btn ${st.tab === 'overdue' ? 'on' : ''}" data-a="setQS" data-key="fu" data-f="tab" data-v="overdue"><small>${I('alert', 'sm')} Overdue</small><b style="color:${overdue.length ? 'var(--red)' : 'inherit'}">${overdue.length}</b><span class="lr-s">Oldest ${overdue[0] ? fdate(overdue.sort((a, b) => a.due.localeCompare(b.due))[0].due) : '—'}</span></button>
    <button class="rc rc-btn ${st.tab === 'upcoming' ? 'on' : ''}" data-a="setQS" data-key="fu" data-f="tab" data-v="upcoming"><small>${I('clock', 'sm')} Next 7 days</small><b>${upcoming.length}</b><span class="lr-s">Scheduled</span></button>
    <button class="rc rc-btn ${st.tab === 'done' ? 'on' : ''}" data-a="setQS" data-key="fu" data-f="tab" data-v="done"><small>${I('checkc', 'sm')} Completed this week</small><b>${doneWeek.length}</b><span class="lr-s">${all.length - pend.length} completed overall</span></button>
  </div>
  <div class="dgrid">
    <div class="panel c8"><div class="panel-h" style="padding-bottom:0"><h3>Follow-up queue</h3></div>
      <div class="panel-b" style="padding-top:6px">
        <div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button class="${st.tab === k ? 'on' : ''}" role="tab" aria-selected="${st.tab === k}" data-a="setQS" data-key="fu" data-f="tab" data-v="${k}">${l}<span class="ct">${n}</span></button>`).join('')}</div>
        <div class="row wrap" style="margin-bottom:6px">
          <div class="searchbox" style="width:220px">${I('search')}<input type="search" class="input" placeholder="Customer or note" value="${esc(st.q)}" data-in="setQS" data-key="fu" data-f="q" aria-label="Search follow-ups"></div>
          <select class="select" style="width:auto" data-ch="setQS" data-key="fu" data-f="type" aria-label="Action type"><option value="all">All actions</option>${['Call', 'Email', 'WhatsApp', 'Meeting', 'Site visit'].map(t => `<option ${st.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <select class="select" style="width:auto" data-ch="setQS" data-key="fu" data-f="sp" aria-label="Assigned to"><option value="all">Everyone</option>${SALES.map(s => `<option value="${s.id}" ${st.sp === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
        </div>
        ${groups.length ? groups.map(([g, fs]) => `<h5 class="mini-h ${g === 'Overdue' ? 'overdue-t' : ''}">${g} <span class="muted" style="font-weight:400">${fs.length}</span></h5>${fs.slice(0, 25).map(fuRow).join('')}${fs.length > 25 ? `<p class="hint">+ ${fs.length - 25} more</p>` : ''}`).join('') : `<div class="empty">${I('checkc')}<h4>${st.tab === 'overdue' ? 'Nothing overdue' : st.tab === 'today' ? 'Nothing due today' : 'No follow-ups here'}</h4><p>New reminders you add show up in this queue.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" data-a="addFollowup">${I('plus')} Add follow-up</button></div></div>`}
      </div></div>
    <div class="c4 stack" style="gap:14px">
      <div class="panel"><div class="panel-h"><h3>Awaiting response</h3><span class="spacer"></span><button class="btn sm ghost" data-a="kpiGo" data-t="pending">All ${I('right', 'sm')}</button></div>
        <div class="panel-b">${awaiting.length ? awaiting.map(q => qRow(q, q.status === 'viewed' ? `viewed ${q.views}×` : `sent ${rel(q.sentAt)}`, `<button class="btn sm ghost icon" data-a="shareQ" data-id="${q.id}" data-ch="whatsapp" data-rem="1" title="Send reminder" aria-label="Remind about ${q.no}">${I('wa', 'sm')}</button>`)).join('') : emptyMini('No one is waiting on you')}</div></div>
      <div class="panel"><div class="panel-h"><h3>Expiring quotations</h3><span class="spacer"></span><span class="sub">7 days</span></div>
        <div class="panel-b">${expiring.length ? expiring.map(q => { const d = daysBetween(today, q.expiry); return qRow(q, `<span class="${d <= 2 ? 'overdue-t' : ''}">${d < 0 ? 'expired' : d === 0 ? 'expires today' : `${d} days left`}</span>`, `<button class="btn sm" data-a="extendQ" data-id="${q.id}">Extend</button>`); }).join('') : emptyMini('Nothing expiring this week')}</div></div>
    </div>
    <div class="panel c6"><div class="panel-h"><h3>Recently accepted</h3><span class="spacer"></span><span class="sub">last 14 days</span></div>
      <div class="panel-b">${recAcc.length ? recAcc.map(q => qRow(q, rel(q.respondedAt), q.invoiced ? `<span class="badge s-paid nodot">Invoiced</span>` : `<button class="btn sm" data-a="convertQ" data-id="${q.id}">${I('receipt', 'sm')} Invoice</button>`)).join('') : emptyMini('No acceptances in the last two weeks')}</div></div>
    <div class="panel c6"><div class="panel-h"><h3>Recently rejected</h3><span class="spacer"></span><span class="sub">last 14 days</span></div>
      <div class="panel-b">${recRej.length ? recRej.map(q => qRow(q, esc(q.reason), `<button class="btn sm ghost" data-a="addFollowup" data-cid="${q.cid}" data-qid="${q.id}">Follow up</button>`)).join('') : emptyMini('No rejections in the last two weeks')}</div></div>
  </div>`;
  return { html, title: 'Follow-ups', keepScroll: true };
}
A.extendQ = el => {
  const q = quote(el.dataset.id); const old = q.expiry;
  q.expiry = iso(addDays(parse(q.expiry < iso(TODAY) ? iso(TODAY) : q.expiry), 15));
  if (q.status === 'expired') q.status = q.viewedAt ? 'viewed' : 'sent';
  q.comms.push({ ch: 'system', ev: 'Validity extended', ts: Date.now(), to: ME.name, msg: `From ${fdate(old)} to ${fdate(q.expiry)}` });
  toast(`${q.no} extended`, `Now valid until ${fdate(q.expiry)}`); rerender();
};
