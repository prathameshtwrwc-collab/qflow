/* ================= customer intelligence ================= */
QS.cust = { seg: 'all', q: '', sp: 'all', range: 'all', type: 'all', status: 'all', sort: 'total', dir: -1, page: 1, per: 10 };
const SEGMENTS = [
  ['new', 'New customers', 'Added in the last 90 days', 'userplus', 'tone-blue'],
  ['returning', 'Returning', 'Two or more quotations', 'refresh', 'tone-green'],
  ['high', 'High value', 'Accepted business ≥ ₹7 L', 'trend', 'tone-green'],
  ['pending', 'Pending quotations', 'Awaiting a response', 'hour', 'tone-cyan'],
  ['rejected', 'Rejected a quote', 'At least one decline', 'x', 'tone-red'],
  ['followup', 'Needs follow-up', 'Viewed or reminder due', 'clock', 'tone-amber'],
  ['expired', 'Expired quotes', 'Let a quotation lapse', 'alert', 'tone-amber'],
  ['inactive', 'No quote activity', 'Never quoted yet', 'user', 'tone-slate'],
];
const CSTATUS = { returning: ['s-accepted', 'Returning'], active: ['s-accepted', 'Customer'], pending: ['s-viewed', 'Awaiting'], new: ['s-new', 'New'], lost: ['s-rejected', 'At risk'], inactive: ['s-draft', 'No activity'] };
const cStatusBadge = k => `<span class="badge ${CSTATUS[k][0]}">${CSTATUS[k][1]}</span>`;

function allCustStats() {
  const byC = {};
  for (const q of S.quotes) (byC[q.cid] = byC[q.cid] || []).push(q);
  const pendFu = new Set(S.followups.filter(f => f.status === 'pending').map(f => f.cid));
  return S.customers.map(c => {
    const qs = byC[c.id] || [];
    const acc = qs.filter(q => q.status === 'accepted'), rej = qs.filter(q => q.status === 'rejected');
    const pen = qs.filter(q => ['sent', 'viewed'].includes(q.status)), exp = qs.filter(q => q.status === 'expired');
    const total = qs.reduce((s, q) => s + q.total, 0), accV = acc.reduce((s, q) => s + q.total, 0);
    const decided = acc.length + rej.length;
    const st = { qs, n: qs.length, acc: acc.length, rej: rej.length, pen: pen.length, exp: exp.length, total, accV, conv: decided ? pct(acc.length, decided) : 0, last: qs.reduce((m, q) => q.date > m ? q.date : m, ''), avg: qs.length ? total / qs.length : 0 };
    const tags = [];
    if (daysBetween(c.since, iso(TODAY)) <= 90) tags.push('new');
    if (st.n >= 2) tags.push('returning');
    if (st.accV >= 700000) tags.push('high');
    if (st.pen) tags.push('pending');
    if (st.rej) tags.push('rejected');
    if (st.exp) tags.push('expired');
    if (!st.n) tags.push('inactive');
    if (pendFu.has(c.id) || pen.some(q => q.status === 'viewed')) tags.push('followup');
    return { c, st, tags, status: custStatus(st, c)[0] };
  });
}

function pageCustomers() {
  refreshExpiry();
  const st = QS.cust; const today = iso(TODAY);
  const all = allCustStats();
  const segCount = {}; const segVal = {};
  all.forEach(r => r.tags.forEach(t => { segCount[t] = (segCount[t] || 0) + 1; segVal[t] = (segVal[t] || 0) + r.st.total; }));

  // overview
  const quoted = all.filter(r => r.st.n);
  const received = all.filter(r => r.st.qs.some(q => q.status !== 'draft'));
  const viewed = all.filter(r => r.st.qs.some(q => q.viewedAt));
  const accC = all.filter(r => r.st.acc), rejC = all.filter(r => r.st.rej), penC = all.filter(r => r.st.pen), expC = all.filter(r => r.st.exp);
  const invC = new Set(S.invoices.map(i => i.cid).concat(S.orders.map(o => o.cid)));
  const totalV = S.quotes.reduce((s, q) => s + q.total, 0);
  const custConv = pct(accC.length, received.length);
  const ov = [
    ['Total customers', numF(all.length), 'all', 'users'], ['New customers', numF(segCount.new || 0), 'new', 'userplus'],
    ['Returning', numF(segCount.returning || 0), 'returning', 'refresh'], ['Received quotations', numF(received.length), 'all', 'send'],
    ['Accepted', numF(accC.length), 'high', 'check'], ['Rejected', numF(rejC.length), 'rejected', 'x'],
    ['Awaiting response', numF(penC.length), 'pending', 'hour'], ['With expired quotes', numF(expC.length), 'expired', 'alert'],
    ['Customer conversion', custConv + '%', null, 'target'], ['Total quoted value', moneyC(totalV), null, 'rupee'],
  ];

  const journey = [
    ['Customer added', all.length, null], ['Quotation created', quoted.length, all.length], ['Quotation sent', received.length, quoted.length],
    ['Quotation viewed', viewed.length, received.length], ['split', [accC.length, rejC.length], viewed.length], ['Invoice / order', invC.size, accC.length],
  ];

  const funnel = [['Total customers', all.length, '--ink', 'all'], ['Received quotations', received.length, '--slate', 'all'], ['Viewed a quotation', viewed.length, '--cyan', 'followup'], ['Accepted', accC.length, '--accent', 'high'], ['Rejected', rejC.length, '--red', 'rejected'], ['Awaiting response', penC.length, '--blue', 'pending']];

  // filter
  let rows = all.filter(r => {
    if (st.seg !== 'all' && !r.tags.includes(st.seg)) return false;
    if (st.sp !== 'all' && r.c.owner !== st.sp) return false;
    if (st.type !== 'all' && r.c.type !== st.type) return false;
    if (st.status !== 'all' && r.status !== st.status) return false;
    if (st.range !== 'all') { const d = r.st.last || r.c.since; if (daysBetween(d, today) > +st.range) return false; }
    if (st.q && !(r.c.name + ' ' + r.c.company + ' ' + r.c.email + ' ' + r.c.city).toLowerCase().includes(st.q.toLowerCase())) return false;
    return true;
  });
  const key = { total: r => r.st.total, accV: r => r.st.accV, conv: r => r.st.conv + r.st.acc / 100, n: r => r.st.n, acc: r => r.st.acc, rej: r => r.st.rej, pen: r => r.st.pen, last: r => r.st.last || '0', name: r => r.c.name.toLowerCase(), company: r => r.c.company.toLowerCase() }[st.sort] || (r => r.st.total);
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
  const total = rows.length; const per = st.per; const pages = Math.max(1, Math.ceil(total / per)); if (st.page > pages) st.page = pages;
  const view = rows.slice((st.page - 1) * per, st.page * per);
  const filtered = st.q || st.sp !== 'all' || st.type !== 'all' || st.range !== 'all' || st.seg !== 'all' || st.status !== 'all';

  const html = `
  <div class="ph"><div><h1>Customer intelligence</h1><p>How every customer moves from first quotation to invoice. <span class="demo-tag">${I('info', 'sm')} Illustrative demo data</span></p></div>
    <div class="row wrap"><button class="btn" data-a="exportDemo" data-what="customers">${I('download')} Export</button><button class="btn" data-a="quickSend">${I('send')} Send quotation</button><button class="btn primary" data-a="addCustomer">${I('userplus')} Add customer</button></div></div>

  <div class="ov-grid">${ov.map(([l, v, seg, ic]) => `<button class="ov" ${seg ? `data-a="custSeg" data-v="${seg}"` : 'disabled'}><span class="ov-l">${I(ic, 'sm')}${l}</span><b>${v}</b></button>`).join('')}</div>

  <div class="panel" style="margin-top:14px"><div class="panel-h"><div><h3>Customer quotation journey</h3><div class="sub">Unique customers reaching each step, with the share that moved on from the step before</div></div></div>
    <div class="panel-b"><div class="journey">${journey.map(([l, v, prev]) => {
      if (l === 'split') { const p = pct(v[0], v[0] + v[1]); return `<div class="jn"><span class="jx">Step 5</span><div class="split"><div><b style="color:var(--accent-ink)">${numF(v[0])}</b><div class="jl">Accepted</div></div><div><b style="color:var(--red)">${numF(v[1])}</b><div class="jl">Rejected</div></div></div><div class="jp">${p}% win rate on decisions</div><span class="bar" style="width:${p}%"></span></div>`; }
      const p = prev ? pct(v, prev) : 100; const i = journey.findIndex(j => j[0] === l);
      return `<div class="jn"><span class="jx">Step ${i + 1}</span><b>${numF(v)}</b><div class="jl">${l}</div><div class="jp">${prev ? p + '% of previous step' : 'Starting point'}</div><span class="bar" style="width:${p}%"></span></div>`;
    }).join('')}</div></div></div>

  <div class="dgrid">
    <div class="panel c6"><div class="panel-h"><div><h3>Customer conversion funnel</h3><div class="sub">Click a stage to filter the table</div></div><span class="spacer"></span><span class="demo-tag">Sample data</span></div>
      <div class="panel-b"><div class="funnel">${funnel.map(([l, v, c, seg], i) => `<div class="fstep" data-a="custSeg" data-v="${seg}"><span>${l}</span><div class="fb"><i style="width:${Math.max(2, v / (funnel[0][1] || 1) * 100)}%;background:var(${c})"></i></div><span class="fv"><b>${numF(v)}</b><small>${i ? pct(v, funnel[0][1]) + '%' : ''}</small></span></div>`).join('')}</div>
      <p class="hint" style="margin-top:12px">Accepted and rejected overlap when a customer has answered more than one quotation.</p></div></div>
    <div class="panel c6"><div class="panel-h"><div><h3>Acquisition and conversion</h3><div class="sub">New customers vs customers who accepted, last 12 months</div></div></div>
      <div class="panel-b"><div class="chart-box" style="height:232px"><canvas id="ch-acq" role="img" aria-label="New customers and accepted customers by month"></canvas></div></div></div>
  </div>

  <h2 class="sec-t">Customer segments</h2>
  <div class="segs">
    <button class="segc ${st.seg === 'all' ? 'on' : ''}" data-a="custSeg" data-v="all"><span class="ki tone-slate">${I('users')}</span><div><b>All customers</b><small>${numF(all.length)} · ${moneyC(totalV)}</small></div></button>
    ${SEGMENTS.map(([k, l, d, ic, tone]) => `<button class="segc ${st.seg === k ? 'on' : ''}" data-a="custSeg" data-v="${k}" title="${d}"><span class="ki ${tone}">${I(ic)}</span><div><b>${l}</b><small>${numF(segCount[k] || 0)} · ${moneyC(segVal[k] || 0)}</small></div></button>`).join('')}
  </div>

  <div class="panel" style="margin-top:14px" id="cust-table">
    <div class="toolbar">
      <div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Name, company, email or city" value="${esc(st.q)}" data-in="setQS" data-key="cust" data-f="q" aria-label="Search customers"></div>
      <select class="select" data-ch="setQS" data-key="cust" data-f="range" aria-label="Last activity">${[['all', 'Any activity date'], ['30', 'Active in 30 days'], ['90', 'Active in 90 days'], ['180', 'Active in 6 months'], ['365', 'Active in 12 months']].map(([v, l]) => `<option value="${v}" ${st.range === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="select" data-ch="setQS" data-key="cust" data-f="status" aria-label="Customer status"><option value="all">Any status</option>${Object.entries(CSTATUS).map(([k, v]) => `<option value="${k}" ${st.status === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select>
      <select class="select" data-ch="setQS" data-key="cust" data-f="type" aria-label="Customer type">${[['all', 'All types'], ['Business', 'Business'], ['Individual', 'Individual'], ['Government', 'Government']].map(([v, l]) => `<option value="${v}" ${st.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="select" data-ch="setQS" data-key="cust" data-f="sp" aria-label="Account owner"><option value="all">All owners</option>${SALES.map(s => `<option value="${s.id}" ${st.sp === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
      <select class="select" data-ch="custSort" aria-label="Sort by">${[['total', 'Sort: quotation value'], ['conv', 'Sort: conversion rate'], ['accV', 'Sort: accepted value'], ['last', 'Sort: last quotation'], ['n', 'Sort: most quotations']].map(([v, l]) => `<option value="${v}" ${st.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <span class="spacer"></span>
      ${st.seg !== 'all' ? `<span class="chip on" data-a="custSeg" data-v="all">${esc(SEGMENTS.find(s => s[0] === st.seg)[1])} ${I('x', 'sm')}</span>` : ''}
      ${filtered ? `<button class="btn sm ghost" data-a="custClear">Clear filters</button>` : ''}
    </div>
    ${view.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${sortTh('cust', 'name', 'Customer')}${sortTh('cust', 'n', 'Quotes', 'r')}${sortTh('cust', 'acc', 'Accepted', 'r')}${sortTh('cust', 'rej', 'Rejected', 'r')}${sortTh('cust', 'pen', 'Pending', 'r')}${sortTh('cust', 'total', 'Quoted value', 'r')}${sortTh('cust', 'accV', 'Accepted value', 'r')}${sortTh('cust', 'conv', 'Conversion')}${sortTh('cust', 'last', 'Last quotation')}<th>Status</th><th class="r">Actions</th></tr></thead><tbody>
    ${view.map(({ c, st: s, status }) => `<tr class="click" data-a="rowGo" data-to="#/app/customers/${c.id}">
      <td><div class="row" style="gap:10px">${av(c.name)}<div class="cell-2"><b>${esc(c.name)}</b><span>${esc(c.company)}</span></div></div></td>
      <td class="r num">${s.n}</td><td class="r num" style="color:${s.acc ? 'var(--accent-ink)' : 'inherit'}">${s.acc}</td><td class="r num" style="color:${s.rej ? 'var(--red)' : 'inherit'}">${s.rej}</td><td class="r num">${s.pen}</td>
      <td class="r num"><b style="font-weight:600">${s.n ? money(s.total) : '—'}</b></td><td class="r num">${s.accV ? money(s.accV) : '—'}</td>
      <td>${s.acc + s.rej ? `<span class="bar-mini"><i style="width:${s.conv}%"></i></span><span class="num">${s.conv}%</span>` : '<span class="muted">—</span>'}</td>
      <td>${s.last ? fdate(s.last) : '<span class="muted">Never</span>'}</td>
      <td>${cStatusBadge(status)}</td>
      <td class="r" data-stop><div class="row" style="justify-content:flex-end;gap:2px">
        <button class="btn sm ghost icon" data-a="newQFor" data-cid="${c.id}" title="Create quotation" aria-label="Create quotation for ${esc(c.name)}">${I('plus', 'sm')}</button>
        <div class="menu-wrap"><button class="btn sm ghost icon" data-a="custMenu" data-id="${c.id}" aria-label="More actions">${I('more')}</button></div></div></td></tr>`).join('')}
    </tbody></table></div>${pager('cust', total, per)}` : `<div class="empty">${I('users')}<h4>No customers match</h4><p>Try another segment or clear the filters.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="custClear">Clear filters</button><button class="btn primary" data-a="addCustomer">${I('userplus')} Add customer</button></div></div>`}
  </div>`;

  return {
    html, title: 'Customers', keepScroll: true, after: () => {
      const labels = [], nNew = [], nAcc = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1); const k = iso(d).slice(0, 7);
        labels.push(MON[d.getMonth()]);
        nNew.push(S.customers.filter(c => c.since.slice(0, 7) === k).length);
        nAcc.push(new Set(S.quotes.filter(q => q.status === 'accepted' && q.respondedAt && iso(new Date(q.respondedAt)).slice(0, 7) === k).map(q => q.cid)).size);
      }
      const C = COL();
      mkChart('ch-acq', { type: 'bar', data: { labels, datasets: [{ label: 'New customers', data: nNew, backgroundColor: C.line, borderRadius: 3, maxBarThickness: 18 }, { label: 'Customers who accepted', data: nAcc, backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 18 }] }, options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9, boxHeight: 9, usePointStyle: false } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    }
  };
}
A.custSeg = el => { QS.cust.seg = el.dataset.v; QS.cust.page = 1; rerender(); if (el.closest('.fstep,.ov')) setTimeout(() => $('#cust-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
A.custClear = () => { Object.assign(QS.cust, { seg: 'all', q: '', sp: 'all', range: 'all', type: 'all', status: 'all', page: 1 }); rerender(); };
IN.custSort = el => { QS.cust.sort = el.value; QS.cust.dir = -1; QS.cust.page = 1; rerender(); };
A.custMenu = el => { const id = el.dataset.id; rowMenu(el, [['go', 'user', 'View customer', { to: '#/app/customers/' + id }], ['custHistory', 'file', 'View quotation history', { id }], ['newQFor', 'plus', 'Create quotation', { cid: id }], '-', ['addFollowup', 'clock', 'Add follow-up', { cid: id }], ['sendReminder', 'bell', 'Send reminder', { cid: id }], ['editCustomer', 'edit', 'Edit details', { id }]]); };
A.custHistory = el => { closeFloating(); Object.assign(QS.quotes, { status: 'all', q: '', sp: 'all', range: 'all', min: '', max: '', cid: el.dataset.id, page: 1 }); go('#/app/quotations'); };
A.newQFor = el => {
  closeFloating();
  const c = cust(el.dataset.cid);
  BQ = blankQuote(); BQ.cid = c.id; BQ.sp = c.owner; if ('site' in BQ.catFields) BQ.catFields.site = c.address; BQ._route = '#/app/quotations/new'; BQ_DIRTY = false;
  go('#/app/quotations/new');
  toast('New quotation started', `Customer details for ${c.company} are filled in`);
};
A.editCustomer = el => {
  closeFloating();
  const c = cust(el.dataset.id);
  openModal(`${mHead('Edit customer', esc(c.company))}
  <div class="mb"><div class="grid2">
    <div class="field"><label for="ec-name">Contact name</label><input class="input" id="ec-name" value="${esc(c.name)}"></div>
    <div class="field"><label for="ec-co">Company</label><input class="input" id="ec-co" value="${esc(c.company)}"></div>
    <div class="field"><label for="ec-email">Email</label><input class="input" id="ec-email" type="email" value="${esc(c.email)}"></div>
    <div class="field"><label for="ec-phone">WhatsApp / phone</label><input class="input" id="ec-phone" value="${esc(c.phone)}"></div>
    <div class="field"><label for="ec-type">Customer type</label><select class="select" id="ec-type">${['Business', 'Individual', 'Government'].map(t => `<option ${t === c.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="ec-city">City</label><input class="input" id="ec-city" value="${esc(c.city)}"></div>
    <div class="field" style="grid-column:1/-1"><label for="ec-addr">Address</label><input class="input" id="ec-addr" value="${esc(c.address)}"></div>
    <div class="field"><label for="ec-gst">GSTIN</label><input class="input" id="ec-gst" value="${esc(c.gstin)}"></div>
    <div class="field"><label for="ec-owner">Account owner</label><select class="select" id="ec-owner">${SALES.map(s => `<option value="${s.id}" ${s.id === c.owner ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
  </div><p class="hint err" id="ec-err" style="margin-top:10px"></p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="ec-save">Save changes</button></div>`);
  $('#ec-save').onclick = () => {
    const v = id => $('#' + id).value.trim();
    if (!v('ec-name') || !/^\S+@\S+\.\S+$/.test(v('ec-email'))) { $('#ec-err').textContent = 'A contact name and a valid email are required.'; return; }
    Object.assign(c, { name: v('ec-name'), company: v('ec-co') || v('ec-name'), email: v('ec-email'), phone: v('ec-phone'), type: v('ec-type'), city: v('ec-city'), address: v('ec-addr'), gstin: v('ec-gst'), owner: v('ec-owner') });
    closeModal(); toast('Customer updated', c.name); rerender();
  };
};

/* ================= customer detail ================= */
function pageCustomer(id) {
  refreshExpiry();
  const c = cust(id);
  if (!c) return { html: `<div class="empty">${I('users')}<h4>Customer not found</h4><p>It may have been removed in this session.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="go" data-to="#/app/customers">Back to customers</button></div></div>` };
  const st = custStats(id); const [sk] = custStatus(st, c);
  const qs = st.qs.slice().sort((a, b) => b.date.localeCompare(a.date));
  const open = qs.filter(q => ['draft', 'sent', 'viewed'].includes(q.status));
  const fus = S.followups.filter(f => f.cid === id).sort((a, b) => (a.status === b.status ? a.due.localeCompare(b.due) : a.status === 'pending' ? -1 : 1));
  const notes = S.notes.filter(n => n.cid === id).sort((a, b) => b.ts - a.ts);
  const invs = S.invoices.filter(i => i.cid === id);
  const tags = custSegment(c, st);

  // timeline
  const tl = [{ ch: 'system', ev: 'Customer added', ts: +parse(c.since) + 9 * 3600000, to: spName(c.owner) }];
  qs.forEach(q => q.comms.forEach(x => tl.push({ ...x, ev: `${x.ev}`, sub: `<a data-a="go" data-to="#/app/quotations/${q.id}" style="cursor:pointer">${q.no}</a>` })));
  S.followups.filter(f => f.cid === id && f.created).forEach(f => { if (!f.qid) tl.push({ ch: 'system', ev: 'Follow-up added', ts: f.created, to: spName(f.sp), msg: `${f.type} on ${fdate(f.due)}: ${f.note}` }); if (f.doneAt) tl.push({ ch: 'system', ev: 'Follow-up completed', ts: f.doneAt, to: spName(f.sp), msg: f.note }); });
  notes.forEach(n => tl.push({ ch: 'system', ev: 'Note added', ts: n.ts, to: n.by, msg: n.text }));
  invs.forEach(i => tl.push({ ch: 'system', ev: `Invoice ${i.no} created`, ts: +parse(i.date) + 11 * 3600000, to: money(i.amount) }));
  tl.sort((a, b) => b.ts - a.ts);
  const lastTs = tl[0]?.ts;

  // insights
  const svc = {};
  qs.forEach(q => q.items.forEach(it => { if (it.type === 'section') return; svc[it.name] = svc[it.name] || { n: 0, v: 0 }; svc[it.name].n++; svc[it.name].v += it.qty * it.price; }));
  const topSvc = Object.entries(svc).sort((a, b) => b[1].n - a[1].n || b[1].v - a[1].v).slice(0, 4);
  const maxSvc = topSvc[0]?.[1].n || 1;
  const pendingActions = [
    ...qs.filter(q => q.status === 'draft').map(q => ['file', `Send draft ${q.no}`, 'shareQ', { id: q.id, ch: 'email' }]),
    ...qs.filter(q => q.status === 'viewed').map(q => ['eye', `${q.no} viewed ${q.views}×, no reply yet`, 'shareQ', { id: q.id, ch: 'whatsapp', rem: 1 }]),
    ...qs.filter(q => q.status === 'sent' && daysBetween(iso(TODAY), q.expiry) <= 7).map(q => ['hour', `${q.no} expires ${fdate(q.expiry)}`, 'shareQ', { id: q.id, ch: 'email', rem: 1 }]),
    ...qs.filter(q => q.status === 'accepted' && !q.invoiced).map(q => ['receipt', `Invoice ${q.no}`, 'convertQ', { id: q.id }]),
    ...fus.filter(f => f.status === 'pending' && f.due <= iso(TODAY)).map(f => ['clock', `${f.type}: ${f.note}`, 'fuDone', { id: f.id }]),
  ].slice(0, 5);
  const dataAttrs = o => Object.entries(o).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');

  const kp = [['Total quotations', numF(st.n)], ['Accepted', numF(st.acc)], ['Rejected', numF(st.rej)], ['Pending', numF(st.pen)], ['Total quoted value', money(st.total)], ['Accepted business', money(st.accV)], ['Average quotation', money(st.avg)], ['Conversion rate', st.acc + st.rej ? st.conv + '%' : '—']];
  const segLabels = tags.map(t => SEGMENTS.find(s => s[0] === t)?.[1]).filter(Boolean);

  const html = `
  <div class="crumb"><a data-a="go" data-to="#/app/customers">Customers</a>${I('right', 'sm')}<span>${esc(c.company)}</span></div>
  <div class="panel" style="padding:18px 20px"><div class="cust-head">
    ${av(c.name, 'lg')}
    <div style="flex:1;min-width:240px">
      <div class="row wrap" style="gap:10px"><h1 style="font-size:22px;font-weight:600;letter-spacing:-.02em">${esc(c.name)}</h1>${cStatusBadge(sk)}${segLabels.slice(0, 3).map(l => `<span class="badge nodot s-draft">${esc(l)}</span>`).join('')}</div>
      <div style="color:var(--ink-2);font-weight:500;margin-top:2px">${esc(c.company)}</div>
      <div class="cust-meta">
        <span>${I('mail')}<a href="mailto:${esc(c.email)}" onclick="event.preventDefault()">${esc(c.email)}</a></span>
        <span>${I('phone')}${esc(c.phone || '—')}</span>
        <span>${I('building')}${esc(c.type)}</span>
        <span>${I('pin')}${esc(c.city)}</span>
        <span>${I('cal')}Customer since ${fdate(c.since)}</span>
        <span>${I('user')}Owner: ${spName(c.owner)}</span>
      </div>
    </div>
    <div class="row wrap">
      <button class="btn" data-a="editCustomer" data-id="${c.id}">${I('edit')} Edit</button>
      <button class="btn" data-a="addFollowup" data-cid="${c.id}">${I('clock')} Follow-up</button>
      <button class="btn" data-a="custSend" data-id="${c.id}">${I('send')} Send quotation</button>
      <button class="btn primary" data-a="newQFor" data-cid="${c.id}">${I('plus')} Create quotation</button>
    </div>
  </div></div>

  <div class="mini-kpis" style="margin-top:14px">${kp.map(([l, v]) => `<div><small>${l}</small><b>${v}</b></div>`).join('')}</div>

  <div class="dgrid">
    <div class="panel c8"><div class="panel-h"><div><h3>Quotation history</h3><div class="sub">${st.n} quotations · ${money(st.total)}</div></div><span class="spacer"></span>${st.n ? `<button class="btn sm ghost" data-a="custHistory" data-id="${c.id}">Open in list ${I('right', 'sm')}</button>` : ''}</div>
      <div class="panel-b" style="padding-top:8px">${qs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Quote</th><th>Project</th><th>Date</th><th class="r">Amount</th><th>Status</th><th>Expiry</th><th class="r">Actions</th></tr></thead><tbody>
      ${qs.map(q => `<tr class="click" data-a="rowGo" data-to="#/app/quotations/${q.id}"><td class="qn">${q.no}${q.views ? `<div class="lr-s" style="font-weight:400">${I('eye', 'sm')} ${q.views}</div>` : ''}</td><td>${esc(q.project)}</td><td>${fdate(q.date)}</td><td class="r num"><b style="font-weight:600">${money(q.total)}</b></td><td>${badge(q.status)}${q.status === 'rejected' && q.reason ? `<div class="lr-s">${esc(q.reason)}</div>` : ''}${q.invoiced ? `<div class="lr-s">Invoiced</div>` : ''}</td><td>${fdate(q.expiry)}</td>
        <td class="r" data-stop><div class="row" style="justify-content:flex-end;gap:2px">
          <button class="btn sm ghost icon" data-a="shareQ" data-id="${q.id}" data-ch="email" title="Send by email" aria-label="Email ${q.no}">${I('mail', 'sm')}</button>
          <button class="btn sm ghost icon" data-a="shareQ" data-id="${q.id}" data-ch="whatsapp" title="Share on WhatsApp" aria-label="WhatsApp ${q.no}">${I('wa', 'sm')}</button>
          <div class="menu-wrap"><button class="btn sm ghost icon" data-a="qMenu" data-id="${q.id}" aria-label="More actions">${I('more')}</button></div></div></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty">${I('file')}<h4>No quotations yet</h4><p>Create the first quotation for ${esc(c.name.split(' ')[0])}.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" data-a="newQFor" data-cid="${c.id}">${I('plus')} Create quotation</button></div></div>`}</div></div>

    <div class="panel c4"><div class="panel-h"><h3>Customer insights</h3></div>
      <div class="panel-b">
        <div class="ins-grid">
          <div><small>Total business value</small><b>${moneyC(st.accV)}</b><span>${invs.length} invoice${invs.length === 1 ? '' : 's'} · ${moneyC(invs.reduce((s, i) => s + i.paid, 0))} collected</span></div>
          <div><small>Last interaction</small><b>${lastTs ? rel(lastTs) : '—'}</b><span>${esc(tl[0]?.ev || 'No activity')}</span></div>
        </div>
        <h5 class="mini-h">Acceptance trend</h5>
        ${st.acc + st.rej ? `<div class="chart-box" style="height:120px"><canvas id="ch-ctrend" role="img" aria-label="Accepted and rejected quotations by quarter"></canvas></div>` : `<p class="hint">No decisions yet. The trend appears once quotations are accepted or rejected.</p>`}
        <h5 class="mini-h">Most quoted items</h5>
        ${topSvc.length ? topSvc.map(([n, v]) => `<div style="margin-bottom:9px"><div class="row between" style="font-size:12.5px"><span class="lr-t" style="max-width:70%">${esc(n)}</span><span class="muted">${v.n}× · ${moneyC(v.v)}</span></div><div class="hbar"><i style="width:${v.n / maxSvc * 100}%"></i></div></div>`).join('') : '<p class="hint">Nothing quoted yet.</p>'}
        <h5 class="mini-h">Pending actions</h5>
        ${pendingActions.length ? pendingActions.map(([ic, t, a, d]) => `<button class="pa" data-a="${a}" ${dataAttrs(d)}>${I(ic, 'sm')}<span>${esc(t)}</span>${I('right', 'sm')}</button>`).join('') : `<p class="hint">${I('checkc', 'sm')} All caught up.</p>`}
      </div></div>

    <div class="panel c6"><div class="panel-h"><div><h3>Activity timeline</h3><div class="sub">${tl.length} events</div></div></div>
      <div class="panel-b" style="max-height:520px;overflow:auto">${timelineHTML(tl, 40)}</div></div>

    <div class="panel c6"><div class="panel-h"><h3>Notes & follow-ups</h3><span class="spacer"></span><button class="btn sm" data-a="addFollowup" data-cid="${c.id}">${I('plus', 'sm')} Add reminder</button></div>
      <div class="panel-b">
        <div class="note-box"><textarea class="textarea" id="cn-text" rows="2" placeholder="Add a note about ${esc(c.name.split(' ')[0])}: budget, preferences, decision makers…" aria-label="New note"></textarea>
          <div class="row between" style="margin-top:8px"><span class="hint">Notes are visible to your team.</span><button class="btn sm primary" data-a="addNote" data-cid="${c.id}">Save note</button></div></div>
        <h5 class="mini-h">Follow-ups <span class="muted" style="font-weight:400">${fus.filter(f => f.status === 'pending').length} open</span></h5>
        ${fus.length ? fus.map(fuRow).join('') : `<p class="hint">No follow-ups. Add a reminder so this customer doesn’t go quiet.</p>`}
        ${notes.length ? `<h5 class="mini-h">Notes</h5>${notes.map(n => `<div class="note"><div class="row between"><span class="row" style="gap:6px">${av(n.by, 'xs')}<b style="font-weight:500;font-size:12.5px">${esc(n.by)}</b></span><span class="row" style="gap:4px"><small class="muted">${rel(n.ts)}</small><button class="btn sm ghost icon" data-a="delNote" data-id="${n.id}" aria-label="Delete note">${I('trash', 'sm')}</button></span></div><p>${esc(n.text)}</p></div>`).join('')}` : ''}
      </div></div>
  </div>
  ${creditPanel(c.id)}
  ${statementPanel(c.id)}`;
  return {
    html, title: c.name, after: () => {
      if (!(st.acc + st.rej)) return;
      const labels = [], a = [], r = [];
      for (let i = 3; i >= 0; i--) {
        const s = addDays(TODAY, -(i + 1) * 91), e = addDays(TODAY, -i * 91);
        labels.push(`${MON[s.getMonth()]}–${MON[e.getMonth()]}`);
        const inQ = x => x.respondedAt && x.respondedAt > +s && x.respondedAt <= +e;
        a.push(qs.filter(x => x.status === 'accepted' && inQ(x)).length); r.push(qs.filter(x => x.status === 'rejected' && inQ(x)).length);
      }
      const C = COL();
      mkChart('ch-ctrend', { type: 'bar', data: { labels, datasets: [{ label: 'Accepted', data: a, backgroundColor: C.accepted, borderRadius: 3, maxBarThickness: 16 }, { label: 'Rejected', data: r, backgroundColor: C.rejected, borderRadius: 3, maxBarThickness: 16 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 3 } }, x: { ticks: { font: { size: 10.5 } } } } } });
    }
  };
}
A.custSend = el => {
  const c = cust(el.dataset.id);
  const list = qOf(c.id).filter(q => ['draft', 'sent', 'viewed'].includes(q.status));
  if (!list.length) { confirmBox('No open quotations', `${esc(c.name)} has no draft or open quotations to send. Create a new one?`, 'Create quotation', () => A.newQFor({ dataset: { cid: c.id } }), false); return; }
  if (list.length === 1) { openShare(list[0].id, 'email'); return; }
  openModal(`${mHead('Send a quotation', `Choose which quotation to share with ${esc(c.name)}.`)}<div class="mb"><div class="picker-list">${list.reverse().map(q => `<div class="picker-item" data-a="shareQ" data-id="${q.id}" data-ch="email">${I('file')}<div style="flex:1;min-width:0"><b style="font-weight:500">${q.no}</b> <span class="muted">${esc(q.project)}</span><div class="lr-s">${fdate(q.date)}</div></div><span class="num">${money(q.total)}</span>${badge(q.status)}</div>`).join('')}</div></div>`);
};
A.addNote = el => {
  const t = $('#cn-text'); const v = t.value.trim();
  if (!v) { t.classList.add('err'); t.focus(); return; }
  S.notes.push({ id: uid('n'), cid: el.dataset.cid, text: v, ts: Date.now(), by: ME.name });
  toast('Note saved'); rerender();
};
A.delNote = el => { S.notes = S.notes.filter(n => n.id !== el.dataset.id); toast('Note deleted'); rerender(); };
