/* ================= overview ================= */
QS.dash = { period: '90', hidden: {} };
function periodRange(p) {
  const end = addDays(TODAY, 1);
  if (p === 'all') return { start: new Date(2000, 0, 1), end, pStart: new Date(1999, 0, 1), pEnd: new Date(2000, 0, 1), days: 9999 };
  const d = +p; const start = addDays(TODAY, -d + 1);
  return { start, end, pStart: addDays(start, -d), pEnd: start, days: d };
}
const inR = (dateStr, a, b) => { const d = parse(dateStr); return d >= a && d < b; };
function qStats(qs) {
  const by = s => qs.filter(q => q.status === s);
  const acc = by('accepted'), rej = by('rejected');
  const sent = qs.filter(q => q.status !== 'draft');
  return {
    n: qs.length, value: qs.reduce((s, q) => s + q.total, 0), acc: acc.length, rej: rej.length,
    pen: qs.filter(q => ['sent', 'viewed'].includes(q.status)).length, exp: by('expired').length, draft: by('draft').length,
    sent: sent.length, viewed: qs.filter(q => q.viewedAt).length, accV: acc.reduce((s, q) => s + q.total, 0),
    conv: pct(acc.length, sent.length), avg: qs.length ? qs.reduce((s, q) => s + q.total, 0) / qs.length : 0,
  };
}
function gotoQuotes(status) { QS.quotes = Object.assign(QS.quotes || {}, { status: status || 'all', page: 1 }); go('#/app/quotations'); }
A.kpiGo = el => {
  const t = el.dataset.t;
  if (['all', 'accepted', 'rejected', 'pending', 'expired'].includes(t)) gotoQuotes(t);
  else if (t === 'value' || t === 'avg') { QS.quotes = Object.assign(QS.quotes || {}, { status: 'all', sort: 'total', dir: -1, page: 1 }); go('#/app/quotations'); }
  else if (t === 'customers') { QS.cust.seg = 'all'; QS.cust.page = 1; go('#/app/customers'); }
  else if (t === 'newcust') { QS.cust.seg = 'new'; QS.cust.page = 1; go('#/app/customers'); }
  else if (t === 'conv') go('#/app/reports');
};

function pageOverview() {
  refreshExpiry();
  const st = QS.dash; const R = periodRange(st.period);
  const cur = S.quotes.filter(q => inR(q.date, R.start, R.end));
  const prev = S.quotes.filter(q => inR(q.date, R.pStart, R.pEnd));
  const a = qStats(cur), b = qStats(prev);
  const custNow = S.customers.length, custPrev = S.customers.filter(c => parse(c.since) < R.start).length;
  const newC = S.customers.filter(c => inR(c.since, R.start, R.end)).length, newP = S.customers.filter(c => inR(c.since, R.pStart, R.pEnd)).length;
  const cmp = st.period === 'all' ? 'all time' : `vs previous ${st.period} days`;
  const kpis = [
    ['all', 'Total quotations', numF(a.n), a.n, b.n, 'file', 'tone-slate'],
    ['value', 'Total quotation value', moneyC(a.value), a.value, b.value, 'rupee', 'tone-blue'],
    ['accepted', 'Accepted', numF(a.acc), a.acc, b.acc, 'check', 'tone-green'],
    ['rejected', 'Rejected', numF(a.rej), a.rej, b.rej, 'x', 'tone-red', true],
    ['pending', 'Pending response', numF(a.pen), a.pen, b.pen, 'hour', 'tone-cyan'],
    ['expired', 'Expired', numF(a.exp), a.exp, b.exp, 'alert', 'tone-amber', true],
    ['customers', 'Total customers', numF(custNow), custNow, custPrev, 'users', 'tone-slate'],
    ['newcust', 'New customers', numF(newC), newC, newP, 'userplus', 'tone-blue'],
    ['conv', 'Conversion rate', a.conv + '%', a.conv, b.conv, 'target', 'tone-green'],
    ['avg', 'Average quotation', moneyC(a.avg), a.avg, b.avg, 'layers', 'tone-slate'],
  ];
  const today = iso(TODAY);
  const fuToday = S.followups.filter(f => f.status === 'pending' && f.due <= today).sort((x, y) => x.due.localeCompare(y.due));
  const expiring = S.quotes.filter(q => ['sent', 'viewed'].includes(q.status) && daysBetween(today, q.expiry) <= 7).sort((x, y) => x.expiry.localeCompare(y.expiry));
  const activity = S.quotes.flatMap(q => q.comms.map(c => ({ ...c, q }))).sort((x, y) => y.ts - x.ts).slice(0, 8);

  // top customers
  const byC = {}; cur.forEach(q => { byC[q.cid] = byC[q.cid] || { v: 0, n: 0, acc: 0 }; byC[q.cid].v += q.total; byC[q.cid].n++; if (q.status === 'accepted') byC[q.cid].acc += q.total; });
  const topC = Object.entries(byC).sort((x, y) => y[1].v - x[1].v).slice(0, 6);
  const byP = {}; cur.forEach(q => q.items.forEach(it => { if (it.type === 'section' || !it.pid) return; const v = it.qty * it.price * (1 - it.disc / 100); byP[it.pid] = byP[it.pid] || { v: 0, n: 0 }; byP[it.pid].v += v; byP[it.pid].n++; }));
  const topP = Object.entries(byP).sort((x, y) => y[1].v - x[1].v).slice(0, 6);
  const maxC = topC[0]?.[1].v || 1, maxP = topP[0]?.[1].v || 1;

  // funnel (customers)
  const cq = new Set(cur.map(q => q.cid));
  const cSent = new Set(cur.filter(q => q.status !== 'draft').map(q => q.cid));
  const cv = new Set(cur.filter(q => q.viewedAt).map(q => q.cid));
  const ca = new Set(cur.filter(q => q.status === 'accepted').map(q => q.cid));
  const cr = new Set(cur.filter(q => q.status === 'rejected').map(q => q.cid));
  const funnel = [['Total customers', custNow, '--ink', 'customers'], ['Customers quoted', cq.size, '--slate', 'all'], ['Quotation sent', cSent.size, '--blue', 'pending'], ['Quotation viewed', cv.size, '--cyan', 'pending'], ['Accepted', ca.size, '--accent', 'accepted'], ['Rejected', cr.size, '--red', 'rejected']];

  const vp = [['Draft', cur.filter(q => q.status === 'draft'), '--slate', 'draft'], ['Sent', cur.filter(q => q.status === 'sent'), '--blue', 'sent'], ['Viewed', cur.filter(q => q.status === 'viewed'), '--cyan', 'viewed'], ['Accepted', cur.filter(q => q.status === 'accepted'), '--accent', 'accepted'], ['Rejected', cur.filter(q => q.status === 'rejected'), '--red', 'rejected']].map(([l, qs, c, s]) => [l, qs.reduce((t, q) => t + q.total, 0), c, s, qs.length]);
  const vpTot = vp.reduce((s, x) => s + x[1], 0) || 1;

  const html = `
  <div class="ph"><div><h1>Good ${TODAY.getHours() < 12 ? 'morning' : 'afternoon'}, ${esc(ME.name.split(" ")[0])}</h1><p>${fuToday.length} follow-ups due, ${expiring.length} quotations expiring this week. ${S.live ? "" : `<span class="demo-tag">Sample data</span>`}</p></div>
    <div class="row wrap"><div class="seg" role="group" aria-label="Period">${[['30', '30 days'], ['90', '90 days'], ['365', '12 months'], ['all', 'All time']].map(([v, l]) => `<button class="${st.period === v ? 'on' : ''}" data-a="dashPeriod" data-v="${v}">${l}</button>`).join('')}</div>
    <button class="btn" data-a="quickSend">${I('send')} Send quotation</button></div></div>

  <div class="kpis">${kpis.map(([t, l, v, c, p, ic, tone, inv]) => `<button class="kpi" data-a="kpiGo" data-t="${t}"><div class="kh"><span class="ki ${tone}">${I(ic)}</span>${l}</div><div class="kv">${v}</div><div class="kc">${st.period === 'all' ? '<span class="trend flat">All time</span>' : trendEl(c, p, inv)}<span>${st.period === 'all' ? '' : cmp}</span></div></button>`).join('')}</div>

  <div class="dgrid">
    <div class="panel c8"><div class="panel-h"><div><h3>Quotation performance</h3><div class="sub">Events by ${st.period === '30' ? 'day' : st.period === '90' ? 'week' : 'month'}</div></div><span class="spacer"></span><div class="legend" id="perf-legend"></div></div>
      <div class="panel-b"><div class="chart-box"><canvas id="ch-perf" aria-label="Quotation performance chart" role="img"></canvas></div></div></div>
    <div class="panel c4"><div class="panel-h"><div><h3>Status distribution</h3><div class="sub">${numF(a.n)} quotations</div></div></div>
      <div class="panel-b"><div class="chart-box sm"><canvas id="ch-status" role="img" aria-label="Status distribution"></canvas></div>
      <div class="legend" style="margin-top:12px;justify-content:center">${['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map(s => `<span data-a="kpiGo" data-t="${s === 'sent' || s === 'viewed' ? 'pending' : s === 'draft' ? 'all' : s}"><i style="background:var(--${{ draft: 'slate', sent: 'blue', viewed: 'cyan', accepted: 'accent', rejected: 'red', expired: 'amber' }[s]})"></i>${cap(s)} <b class="num">${cur.filter(q => q.status === s).length}</b></span>`).join('')}</div></div></div>

    <div class="panel c6"><div class="panel-h"><div><h3>Customer quotation funnel</h3><div class="sub">Unique customers in period</div></div><span class="spacer"></span><button class="btn sm ghost" data-a="go" data-to="#/app/customers">Customer intelligence ${I('right', 'sm')}</button></div>
      <div class="panel-b"><div class="funnel">${funnel.map(([l, v, c, t], i) => `<div class="fstep" data-a="kpiGo" data-t="${t}"><span>${l}</span><div class="fb"><i style="width:${Math.max(2, v / (funnel[0][1] || 1) * 100)}%;background:var(${c})"></i></div><span class="fv"><b>${numF(v)}</b><small>${i ? pct(v, i === 1 ? funnel[0][1] : funnel[1][1]) + '%' : ''}</small></span></div>`).join('')}</div></div></div>

    <div class="panel c6"><div class="panel-h"><div><h3>Quotation value pipeline</h3><div class="sub">${moneyC(vpTot)} across all stages</div></div></div>
      <div class="panel-b"><div class="vp">${vp.map(([l, v, c]) => `<i style="flex:${Math.max(v, vpTot * .01)};background:var(${c})" title="${l}: ${money(v)}"></i>`).join('')}</div>
      <div class="vp-legend">${vp.map(([l, v, c, s, n]) => `<div style="cursor:pointer" data-a="kpiGo" data-t="${s === 'sent' || s === 'viewed' ? 'pending' : s === 'draft' ? 'all' : s}"><i style="background:var(${c})"></i>${l}<b>${moneyC(v)}</b><span class="muted" style="font-size:11.5px">${n} quotes</span></div>`).join('')}</div>
      <div class="row between" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line);font-size:13px"><span class="muted">Pending value (sent + viewed)</span><b class="num">${money(vp[1][1] + vp[2][1])}</b></div></div></div>

    <div class="panel c4"><div class="panel-h"><h3>Top customers</h3><span class="spacer"></span><span class="sub">by quoted value</span></div>
      <div class="panel-b">${topC.length ? topC.map(([cid, v], i) => { const c = cust(cid); return `<div class="list-row click" data-a="go" data-to="#/app/customers/${cid}"><span class="rank">${i + 1}</span>${av(c.name, 'xs')}<div style="flex:1;min-width:0"><div class="row between"><span class="lr-t">${esc(c.company)}</span><b class="num">${moneyC(v.v)}</b></div><div class="hbar"><i style="width:${v.v / maxC * 100}%"></i></div><span class="lr-s">${v.n} quotations · ${moneyC(v.acc)} won</span></div></div>`; }).join('') : emptyMini('No quotations in this period')}</div></div>

    <div class="panel c4"><div class="panel-h"><h3>Top products & services</h3></div>
      <div class="panel-b">${topP.length ? topP.map(([pid, v], i) => { const p = prod(pid); return `<div class="list-row click" data-a="productOpen" data-id="${pid}"><span class="rank">${i + 1}</span><div style="flex:1;min-width:0"><div class="row between"><span class="lr-t">${esc(p.name)}</span><b class="num">${moneyC(v.v)}</b></div><div class="hbar"><i style="width:${v.v / maxP * 100}%;background:var(--blue)"></i></div><span class="lr-s">On ${v.n} quotations · ${p.category}</span></div></div>`; }).join('') : emptyMini('No items quoted yet')}</div></div>

    <div class="panel c4"><div class="panel-h"><h3>Expiring soon</h3><span class="spacer"></span><span class="sub">next 7 days</span></div>
      <div class="panel-b">${expiring.length ? expiring.slice(0, 6).map(q => { const d = daysBetween(today, q.expiry); return `<div class="list-row"><div style="flex:1;min-width:0;cursor:pointer" data-a="go" data-to="#/app/quotations/${q.id}"><span class="lr-t">${q.no} · ${esc(cust(q.cid).company)}</span><div class="lr-s">${money(q.total)} · <span class="${d <= 2 ? 'overdue-t' : ''}">${d === 0 ? 'expires today' : `in ${d} day${d > 1 ? 's' : ''}`}</span></div></div><button class="btn sm" data-a="shareQ" data-id="${q.id}" data-ch="email" data-rem="1">Remind</button></div>`; }).join('') : emptyMini('Nothing expiring this week')}</div></div>

    <div class="panel c6"><div class="panel-h"><h3>Follow-up reminders</h3><span class="spacer"></span><button class="btn sm" data-a="addFollowup">${I('plus', 'sm')} Add</button><button class="btn sm ghost" data-a="go" data-to="#/app/followups">View all</button></div>
      <div class="panel-b">${fuToday.length ? fuToday.slice(0, 6).map(fuRow).join('') : emptyMini('You’re clear for today')}</div></div>

    <div class="panel c6"><div class="panel-h"><h3>Recent activity</h3></div>
      <div class="panel-b">${timelineHTML(activity.map(x => ({ ...x, ev: x.ev, sub: `· <a style="cursor:pointer;text-decoration:underline" data-a="go" data-to="#/app/quotations/${x.q.id}">${x.q.no}</a>`, to: cust(x.q.cid).company })))}</div></div>

    <div class="panel c12"><div class="panel-h"><h3>Quick actions</h3></div><div class="panel-b"><div class="quick">
      <button data-a="go" data-to="#/app/quotations/new"><span class="ki tone-green" style="width:32px;height:32px;border-radius:8px;display:grid;place-items:center">${I('plus')}</span>Create quotation</button>
      <button data-a="quickSend"><span class="tone-blue" style="width:32px;height:32px;border-radius:8px;display:grid;place-items:center">${I('send')}</span>Send a quotation</button>
      <button data-a="addCustomer"><span class="tone-slate" style="width:32px;height:32px;border-radius:8px;display:grid;place-items:center">${I('userplus')}</span>Add customer</button>
      <button data-a="addFollowup"><span class="tone-amber" style="width:32px;height:32px;border-radius:8px;display:grid;place-items:center">${I('clock')}</span>Add follow-up</button>
    </div></div></div>
  </div>`;

  return {
    html, title: 'Overview', after: () => {
      const C = COL();
      // performance buckets
      const unit = st.period === '30' ? 1 : st.period === '90' ? 7 : 30.44;
      const nb = st.period === '30' ? 30 : st.period === '90' ? 13 : 12;
      const labels = [], starts = [];
      for (let i = nb - 1; i >= 0; i--) {
        if (unit === 30.44) { const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1); starts.push(+d); labels.push(MON[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : '')); }
        else { const d = addDays(TODAY, -(i + 1) * unit + 1); d.setHours(0, 0, 0, 0); starts.push(+d); labels.push(fdateS(d)); }
      }
      starts.push(Date.now() + DAY);
      const bucket = ts => { if (!ts) return -1; for (let i = 0; i < nb; i++) if (ts >= starts[i] && ts < starts[i + 1]) return i; return -1; };
      const series = { Created: [], Sent: [], Viewed: [], Accepted: [], Rejected: [] };
      Object.keys(series).forEach(k => series[k] = new Array(nb).fill(0));
      S.quotes.forEach(q => {
        const inc = (k, ts) => { const b = bucket(ts); if (b >= 0) series[k][b]++; };
        inc('Created', q.created); inc('Sent', q.sentAt); inc('Viewed', q.viewedAt);
        if (q.status === 'accepted') inc('Accepted', q.respondedAt); if (q.status === 'rejected') inc('Rejected', q.respondedAt);
      });
      const colors = { Created: C.ink, Sent: C.sent, Viewed: C.viewed, Accepted: C.accepted, Rejected: C.rejected };
      const ch = mkChart('ch-perf', {
        type: 'line', data: { labels, datasets: Object.keys(series).map(k => ({ label: k, data: series[k], borderColor: colors[k], backgroundColor: colors[k], borderWidth: k === 'Accepted' ? 2.5 : 1.75, pointRadius: 0, pointHoverRadius: 4, tension: .35, hidden: !!st.hidden[k], borderDash: k === 'Created' ? [4, 3] : [] })) },
        options: { interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 8 } } } },
      });
      $('#perf-legend').innerHTML = Object.keys(series).map((k, i) => `<span class="${st.hidden[k] ? 'off' : ''}" data-k="${k}" role="button" tabindex="0"><i style="background:${colors[k]}"></i>${k}</span>`).join('');
      $$('#perf-legend span').forEach(sp => sp.onclick = () => { const k = sp.dataset.k; st.hidden[k] = !st.hidden[k]; sp.classList.toggle('off'); if (ch) { const ds = ch.data.datasets.find(d => d.label === k); ds.hidden = st.hidden[k]; ch.update(); } });
      const ss = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
      mkChart('ch-status', {
        type: 'doughnut', data: { labels: ss.map(cap), datasets: [{ data: ss.map(s => cur.filter(q => q.status === s).length), backgroundColor: ss.map(s => C[s]), borderWidth: 2, borderColor: cssv('--surface'), hoverOffset: 6 }] },
        options: { cutout: '68%', onClick: (e, els) => { } },
        plugins: [{ id: 'center', afterDraw(c) { const { ctx, chartArea: a } = c; ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = cssv('--ink'); ctx.font = '600 22px Poppins, sans-serif'; const acc = cur.filter(q => q.status === 'accepted').length; ctx.fillText(pct(acc, a.n || cur.length) + '%', (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 2); ctx.font = '11.5px Inter, sans-serif'; ctx.fillStyle = cssv('--muted'); ctx.fillText('accepted', (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 20); ctx.restore(); } }],
      });
      const sc = UI.charts[UI.charts.length - 1];
      if (sc && sc.canvas) sc.canvas.onclick = evt => { const p = sc.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true); if (p.length) { const s = ss[p[0].index]; A.kpiGo({ dataset: { t: s === 'sent' || s === 'viewed' ? 'pending' : s === 'draft' ? 'all' : s } }); } };
    }
  };
}
const emptyMini = t => `<div class="empty" style="padding:24px 10px">${I('checkc')}<p>${t}</p></div>`;
function fuRow(f) {
  const c = cust(f.cid); const od = f.status === 'pending' && f.due < iso(TODAY);
  return `<div class="fu-row"><button class="fu-check ${f.status === 'done' ? 'done' : ''}" data-a="fuDone" data-id="${f.id}" aria-label="Mark ${f.status === 'done' ? 'not done' : 'done'}">${f.status === 'done' ? I('check') : ''}</button>
    <div style="flex:1;min-width:0"><div style="${f.status === 'done' ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(f.note)}</div>
    <div class="lr-s" style="margin-top:2px"><span class="badge nodot s-draft" style="height:19px">${f.type}</span> <a style="cursor:pointer" data-a="go" data-to="#/app/customers/${c.id}">${esc(c.name)}, ${esc(c.company)}</a>${f.qid ? ` · <a style="cursor:pointer" data-a="go" data-to="#/app/quotations/${f.qid}">${quote(f.qid).no}</a>` : ''} · <span class="${od ? 'overdue-t' : ''}">${od ? 'Overdue, ' : ''}${f.due === iso(TODAY) ? 'Today' : fdate(f.due)}</span> · ${spName(f.sp)}</div></div>
    ${f.status === 'pending' ? `<div class="menu-wrap"><button class="btn sm ghost icon" data-a="fuMenu" data-id="${f.id}" aria-label="More">${I('more')}</button></div>` : ''}</div>`;
}
A.fuMenu = el => rowMenu(el, [['fuSnooze', 'clock', 'Snooze 1 day', { id: el.dataset.id, days: 1 }], ['fuSnooze', 'cal', 'Snooze 1 week', { id: el.dataset.id, days: 7 }], ['fuContact', 'wa', 'Message on WhatsApp', { id: el.dataset.id }], ['fuDone', 'check', 'Mark done', { id: el.dataset.id }]]);
A.fuContact = el => { const f = S.followups.find(x => x.id === el.dataset.id); if (f.qid) openShare(f.qid, 'whatsapp', true); else toast('No quotation linked', 'Link a quotation to share it on WhatsApp', 'warn'); };
A.dashPeriod = el => { QS.dash.period = el.dataset.v; rerender(); };
A.quickSend = () => {
  const list = S.quotes.filter(q => ['draft', 'sent', 'viewed'].includes(q.status)).slice(-40).reverse();
  openModal(`${mHead('Send a quotation', 'Pick a draft or open quotation to share.')}<div class="mb"><div class="searchbox" style="margin-bottom:10px">${I('search')}<input class="input" id="qs-f" placeholder="Filter by number or customer" autofocus></div><div class="picker-list" id="qs-list"></div></div>`, '', () => {
    const draw = f => { $('#qs-list').innerHTML = list.filter(q => (q.no + cust(q.cid).company + cust(q.cid).name).toLowerCase().includes(f)).slice(0, 30).map(q => `<div class="picker-item" data-a="shareQ" data-id="${q.id}" data-ch="email">${I('file')}<div style="flex:1;min-width:0"><b style="font-weight:500">${q.no}</b> <span class="muted">${esc(q.project)}</span><div class="lr-s">${esc(cust(q.cid).company)} · ${fdate(q.date)}</div></div><span class="num">${money(q.total)}</span>${badge(q.status)}</div>`).join('') || '<div class="empty">No matching quotations</div>'; };
    draw(''); $('#qs-f').oninput = e => draw(e.target.value.toLowerCase());
  });
};
