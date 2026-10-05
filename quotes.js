/* ================= quotations list ================= */
QS.quotes = { status: 'all', q: '', sp: 'all', range: 'all', min: '', max: '', cid: '', sort: 'date', dir: -1, page: 1, per: 10, sel: {} };
function pageQuotes() {
  refreshExpiry();
  const st = QS.quotes;
  const counts = { all: S.quotes.length }; S.quotes.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; }); counts.pending = (counts.sent || 0) + (counts.viewed || 0);
  let rows = S.quotes.filter(q => {
    if (st.status === 'pending' ? !['sent', 'viewed'].includes(q.status) : st.status !== 'all' && q.status !== st.status) return false;
    if (st.sp !== 'all' && q.sp !== st.sp) return false;
    if (st.cid && q.cid !== st.cid) return false;
    if (st.pid && !q.items.some(i => i.pid === st.pid)) return false;
    if (st.range !== 'all' && daysBetween(q.date, iso(TODAY)) > +st.range) return false;
    if (st.min && q.total < +st.min) return false;
    if (st.max && q.total > +st.max) return false;
    if (st.q) { const c = cust(q.cid); if (!(q.no + ' ' + q.project + ' ' + c.name + ' ' + c.company).toLowerCase().includes(st.q.toLowerCase())) return false; }
    return true;
  });
  const key = { date: q => q.date + q.no, total: q => q.total, no: q => q.no, cust: q => cust(q.cid).company, expiry: q => q.expiry, status: q => q.status }[st.sort] || (q => q.date);
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
  const total = rows.length; const per = st.per; const pages = Math.max(1, Math.ceil(total / per)); if (st.page > pages) st.page = pages;
  const view = rows.slice((st.page - 1) * per, st.page * per);
  const sumV = rows.reduce((s, q) => s + q.total, 0);
  const selIds = Object.keys(st.sel).filter(k => st.sel[k]);
  const html = `
  <div class="ph"><div><h1>Quotations</h1><p>${numF(total)} quotations worth ${money(sumV)} match your filters.</p></div>
  <div class="row wrap"><button class="btn" data-a="exportDemo" data-what="quotations">${I('download')} Export</button><button class="btn primary" data-a="go" data-to="#/app/quotations/new">${I('plus')} New quotation</button></div></div>
  <div class="row wrap" style="margin-bottom:12px">${statusFilterChips('quotes', counts, [['all', 'All'], ['draft', 'Draft'], ['sent', 'Sent'], ['viewed', 'Viewed'], ['pending', 'Awaiting response'], ['accepted', 'Accepted'], ['rejected', 'Rejected'], ['expired', 'Expired']])}</div>
  <div class="panel">
    <div class="toolbar">
      <div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Number, project or customer" value="${esc(st.q)}" data-in="setQS" data-key="quotes" data-f="q" aria-label="Search quotations"></div>
      <select class="select" data-ch="setQS" data-key="quotes" data-f="range" aria-label="Date range">${[['all', 'Any date'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 12 months']].map(([v, l]) => `<option value="${v}" ${st.range === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="select" data-ch="setQS" data-key="quotes" data-f="sp" aria-label="Salesperson"><option value="all">All salespeople</option>${SALES.map(s => `<option value="${s.id}" ${st.sp === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
      <input class="input" style="width:110px" type="number" min="0" placeholder="Min ₹" value="${esc(st.min)}" data-ch="setQS" data-key="quotes" data-f="min" aria-label="Minimum amount">
      <input class="input" style="width:110px" type="number" min="0" placeholder="Max ₹" value="${esc(st.max)}" data-ch="setQS" data-key="quotes" data-f="max" aria-label="Maximum amount">
      ${st.cid ? `<span class="chip on" data-a="setQS" data-key="quotes" data-f="cid" data-v="">${esc(cust(st.cid).company)} ${I('x', 'sm')}</span>` : ''}
      ${st.pid && prod(st.pid) ? `<span class="chip on" data-a="setQS" data-key="quotes" data-f="pid" data-v="">${esc(prod(st.pid).name)} ${I('x', 'sm')}</span>` : ''}
      <span class="spacer"></span>
      ${selIds.length ? `<span class="muted">${selIds.length} selected</span><button class="btn sm" data-a="bulkSend">${I('send', 'sm')} Send</button><button class="btn sm danger" data-a="bulkDelete">${I('trash', 'sm')} Delete</button>` : ''}
      ${(st.q || st.range !== 'all' || st.sp !== 'all' || st.min || st.max || st.status !== 'all' || st.cid || st.pid) ? `<button class="btn sm ghost" data-a="clearQ">Clear filters</button>` : ''}
    </div>
    ${view.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:30px"><input type="checkbox" aria-label="Select page" data-ch="selAll" ${view.every(q => st.sel[q.id]) ? 'checked' : ''}></th>${sortTh('quotes', 'no', 'Quote')}${sortTh('quotes', 'cust', 'Customer')}<th>Project</th>${sortTh('quotes', 'date', 'Date')}${sortTh('quotes', 'expiry', 'Expiry')}${sortTh('quotes', 'total', 'Amount', 'r')}${sortTh('quotes', 'status', 'Status')}<th>Salesperson</th><th class="r">Actions</th></tr></thead><tbody>
    ${view.map(q => { const c = cust(q.cid); const dl = daysBetween(iso(TODAY), q.expiry); return `<tr class="click" data-a="rowGo" data-to="#/app/quotations/${q.id}">
      <td data-stop><input type="checkbox" aria-label="Select ${q.no}" data-ch="selOne" data-id="${q.id}" ${st.sel[q.id] ? 'checked' : ''}></td>
      <td class="qn">${q.no}${q.views ? `<div class="lr-s" style="font-weight:400">${I('eye', 'sm')} ${q.views}</div>` : ''}</td>
      <td class="cell-2"><b>${esc(c.company)}</b><span>${esc(c.name)}</span></td>
      <td>${esc(q.project)}</td><td>${fdate(q.date)}</td>
      <td>${fdate(q.expiry)}${['sent', 'viewed'].includes(q.status) && dl <= 7 ? `<div class="lr-s ${dl <= 2 ? 'overdue-t' : ''}">${dl === 0 ? 'Today' : dl + ' days left'}</div>` : ''}</td>
      <td class="r num"><b style="font-weight:600">${money(q.total)}</b></td>
      <td>${badge(q.status)}</td>
      <td><span class="row">${av(spName(q.sp), 'xs')}${spName(q.sp).split(' ')[0]}</span></td>
      <td class="r" data-stop><div class="row" style="justify-content:flex-end;gap:2px">
        <button class="btn sm ghost icon" data-a="shareQ" data-id="${q.id}" data-ch="email" aria-label="Send ${q.no}" title="Send quotation">${I('send', 'sm')}</button>
        <div class="menu-wrap"><button class="btn sm ghost icon" data-a="qMenu" data-id="${q.id}" aria-label="More actions">${I('more')}</button></div></div></td></tr>`; }).join('')}
    </tbody></table></div>${pager('quotes', total, per)}` : `<div class="empty">${I('file')}<h4>No quotations match these filters</h4><p>Clear a filter or create a new quotation.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="clearQ">Clear filters</button><button class="btn primary" data-a="go" data-to="#/app/quotations/new">New quotation</button></div></div>`}
  </div>`;
  return { html, title: 'Quotations', keepScroll: true };
}
A.rowGo = (el, e) => { if (e.target.closest('[data-stop]') || e.target.closest('button,input,a')) return; go(el.dataset.to); };
A.clearQ = () => { Object.assign(QS.quotes, { status: 'all', q: '', sp: 'all', range: 'all', min: '', max: '', cid: '', pid: '', page: 1 }); rerender(); };
IN.selAll = el => { const rows = $$('[data-ch="selOne"]'); rows.forEach(r => QS.quotes.sel[r.dataset.id] = el.checked); rerender(); };
IN.selOne = el => { QS.quotes.sel[el.dataset.id] = el.checked; rerender(); };
A.bulkDelete = () => { const ids = Object.keys(QS.quotes.sel).filter(k => QS.quotes.sel[k]); confirmBox(`Delete ${ids.length} quotations?`, 'They will be removed from lists and analytics in this demo.', 'Delete', () => { S.quotes = S.quotes.filter(q => !ids.includes(q.id)); QS.quotes.sel = {}; toast(`${ids.length} quotations deleted`); rerender(); }); };
A.bulkSend = () => { const ids = Object.keys(QS.quotes.sel).filter(k => QS.quotes.sel[k]); let n = 0; ids.forEach(id => { const q = quote(id); if (q.status === 'draft' || q.status === 'sent' || q.status === 'viewed') { logSend(q, 'email', cust(q.cid).email, 'Quotation shared in bulk'); n++; } }); QS.quotes.sel = {}; toast(`Email send simulated for ${n} quotations`, 'Statuses updated to Sent where they were drafts'); rerender(); };
A.exportDemo = el => { toast(`Export prepared (simulation)`, `A CSV of ${el.dataset.what} would download in the full product`, 'warn'); };
A.qMenu = el => {
  const q = quote(el.dataset.id);
  rowMenu(el, [['go', 'eye', 'View', { to: '#/app/quotations/' + q.id }], ['go', 'edit', 'Edit', { to: `#/app/quotations/${q.id}/edit` }], ['dupQ', 'copy', 'Duplicate', { id: q.id }], ['shareQ', 'wa', 'Send on WhatsApp', { id: q.id, ch: 'whatsapp' }], ['openPortal', 'globe', 'Open client view', { id: q.id }],
  ...(q.status === 'accepted' && !q.invoiced ? [['convertQ', 'receipt', 'Convert to invoice', { id: q.id }]] : []), ['setStatus', 'refresh', 'Change status', { id: q.id }], '-', ['delQ', 'trash', 'Delete', { id: q.id }, true]]);
};
A.dupQ = el => {
  const src = quote(el.dataset.id);
  const q = JSON.parse(JSON.stringify(src));
  Object.assign(q, { id: S.live ? uid('q') : 'q' + S.settings.nextNo, no: S.settings.prefix + S.settings.nextNo, date: iso(TODAY), expiry: iso(addDays(TODAY, S.settings.validity)), status: 'draft', views: 0, sentAt: null, viewedAt: null, respondedAt: null, reason: '', invoiced: null, created: Date.now(), feedback: [], token: '' });
  q.items.forEach(i => i.id = uid('i'));
  q.comms = [{ ch: 'system', ev: `Quotation created (copy of ${src.no})`, ts: Date.now(), to: '' }];
  S.settings.nextNo++; S.quotes.push(q);
  toast(`${q.no} created`, `Copied from ${src.no} as a draft`);
  go(`#/app/quotations/${q.id}/edit`);
};
A.delQ = el => { const q = quote(el.dataset.id); confirmBox(`Delete ${q.no}?`, `This removes the quotation for ${esc(cust(q.cid).company)} from lists and analytics in this demo.`, 'Delete quotation', () => { S.quotes = S.quotes.filter(x => x.id !== q.id); S.leads = S.leads.filter(l => l.qid !== q.id); toast(`${q.no} deleted`); if (location.hash.includes(q.id)) go('#/app/quotations'); else rerender(); }); };
A.setStatus = el => {
  const q = quote(el.dataset.id);
  openModal(`${mHead('Change status', `${q.no} · ${esc(cust(q.cid).company)}`)}<div class="mb"><div class="reason-opts">${['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'].map(s => `<label><input type="radio" name="ns" value="${s}" ${q.status === s ? 'checked' : ''}> ${badge(s)}</label>`).join('')}</div>
  <div class="field" style="margin-top:12px" id="ns-reason-w" hidden><label for="ns-reason">Rejection reason</label><select class="select" id="ns-reason">${REJECT_REASONS.map(r => `<option>${r}</option>`).join('')}</select></div></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="ns-save">Update status</button></div>`, '', s => {
    const upd = () => { $('#ns-reason-w').hidden = s.querySelector('input[name=ns]:checked').value !== 'rejected'; };
    s.querySelectorAll('input[name=ns]').forEach(r => r.onchange = upd); upd();
    $('#ns-save').onclick = () => { const v = s.querySelector('input[name=ns]:checked').value; applyStatus(q, v, $('#ns-reason').value, 'Status changed manually'); closeModal(); toast(`${q.no} marked ${v}`, 'Dashboard and customer analytics updated'); rerender(); };
  });
};
function applyStatus(q, v, reason, via) {
  if (q.status === v) return;
  const now = Date.now(); const c = cust(q.cid);
  if (v !== 'draft' && !q.sentAt) q.sentAt = now;
  if (['viewed', 'accepted', 'rejected'].includes(v) && !q.viewedAt) { q.viewedAt = now; q.views = Math.max(1, q.views); }
  if (v === 'accepted' || v === 'rejected') q.respondedAt = now;
  if (v === 'rejected') q.reason = reason || q.reason || 'Not specified';
  if (v === 'expired') q.expiry = q.expiry > iso(TODAY) ? iso(addDays(TODAY, -1)) : q.expiry;
  if (v !== 'expired' && ['sent', 'viewed'].includes(v) && q.expiry < iso(TODAY)) q.expiry = iso(addDays(TODAY, S.settings.validity));
  q.status = v;
  const ev = { accepted: 'Customer accepted quotation', rejected: 'Customer rejected quotation', viewed: 'Customer viewed quotation', sent: 'Marked as sent', draft: 'Moved back to draft', expired: 'Quotation expired' }[v];
  q.comms.push({ ch: v === 'accepted' || v === 'rejected' || v === 'viewed' ? 'portal' : 'system', ev, ts: now, to: via === 'portal' ? c.name : ME.name, msg: v === 'rejected' ? q.reason : (via && via !== 'portal' ? via : '') });
  const lead = S.leads.find(l => l.qid === q.id);
  const map = { draft: 'created', sent: 'sent', viewed: 'viewed', accepted: 'accepted', rejected: 'rejected', expired: 'negotiation' };
  if (lead) { lead.stage = q.invoiced && v === 'accepted' ? 'converted' : map[v]; lead.last = now; lead.value = q.total; }
  if (v === 'accepted' || v === 'rejected' || v === 'viewed') S.notifications.unshift({ id: uid('nt'), kind: v, qid: q.id, text: v === 'viewed' ? `${c.name} viewed ${q.no}` : `${c.company} ${v} ${q.no}${v === 'rejected' ? ': ' + q.reason.toLowerCase() : ''}`, ts: now, read: false });
  renderTopbar();
}
A.convertQ = el => {
  const q = quote(el.dataset.id);
  if (q.invoiced) { go('#/app/invoices'); return; }
  const c = cust(q.cid);
  openModal(`${mHead('Convert to invoice', `${q.no} · ${esc(c.company)}`)}
  <div class="mb stack">
    <p style="color:var(--ink-2)">Creates a sales order and an invoice with the same ${q.items.filter(i => i.type !== 'section').length} items, taxes and terms.</p>
    <div class="grid2">
      <div class="field"><label for="cv-no">Invoice number</label><input class="input" id="cv-no" value="${S.settings.invPrefix}${S.settings.invNext}"></div>
      <div class="field"><label for="cv-date">Invoice date</label><input class="input" type="date" id="cv-date" value="${iso(TODAY)}"></div>
      <div class="field"><label for="cv-due">Due in</label><select class="select" id="cv-due"><option value="7">7 days</option><option value="15" selected>15 days</option><option value="30">30 days</option><option value="45">45 days</option></select></div>
      <div class="field"><label for="cv-adv">Advance received</label><input class="input" type="number" id="cv-adv" value="${Math.round(calcQuote(q).adv)}"></div>
    </div>
    <div class="attach"><span class="pdf" style="background:var(--accent-soft);color:var(--accent-ink)">INV</span><div style="flex:1"><b style="font-weight:500">Invoice total</b><div class="muted" style="font-size:12px">Carried over from the accepted quotation</div></div><b class="num" style="font-size:16px">${money(q.total)}</b></div>
  </div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="cv-go">Create order & invoice</button></div>`);
  $('#cv-go').onclick = () => {
    const btn = $('#cv-go'); btn.innerHTML = '<span class="spin"></span> Creating'; btn.disabled = true;
    const F = { adv: +$('#cv-adv').value || 0, date: $('#cv-date').value || iso(TODAY), no: $('#cv-no').value, due: +$('#cv-due').value || 15 };
    setTimeout(() => {
      const now = Date.now(); const adv = F.adv; const idate = F.date;
      const ord = { id: uid('o'), no: S.live ? nextNo('order') : 'SO-' + (300 + S.orders.length + 90), qid: q.id, cid: q.cid, amount: q.total, date: idate, status: 'confirmed' };
      S.orders.unshift(ord);
      const inv = { id: uid('inv'), no: F.no || S.settings.invPrefix + S.settings.invNext, qid: q.id, cid: q.cid, amount: q.total, paid: Math.min(adv, q.total), date: idate, due: iso(addDays(parse(idate), F.due)), status: adv >= q.total ? 'paid' : adv > 0 ? 'partially-paid' : 'draft', fresh: true };
      S.invoices.unshift(inv); S.settings.invNext++;
      /* a live invoice's paid amount is the sum of its payments, so an advance is recorded as one */
      if (S.live && inv.paid > 0) {
        const pay = { id: uid('pay'), no: 'PAY-' + String(S.payments.length + 1).padStart(4, '0'), invId: inv.id, cid: inv.cid, amount: inv.paid, date: idate, method: 'Other', ref: '', cheque: '', bank: '', notes: 'Advance received at invoicing', by: ME.name, ts: now };
        const rc = { id: uid('rc'), no: nextNo('rcpt'), payId: pay.id, invId: inv.id, cid: inv.cid, amount: pay.amount, date: idate, method: 'Other', ref: '' };
        pay.rcpt = rc.no; S.payments.push(pay); S.receipts.push(rc);
      }
      if (q.status !== 'accepted') applyStatus(q, 'accepted', '', 'Converted to invoice');
      q.invoiced = inv.id;
      q.comms.push({ ch: 'system', ev: `Order ${ord.no} and invoice ${inv.no} created`, ts: now, to: ME.name });
      const lead = S.leads.find(l => l.qid === q.id); if (lead) { lead.stage = 'converted'; lead.last = now; }
      closeModal(); toast(`Invoice ${inv.no} created`, `Sales order ${ord.no} confirmed for ${c.company}`);
      QS.inv.tab = 'invoices'; QS.inv.hl = inv.id; go('#/app/invoices');
    }, 700);
  };
};
A.openPortal = el => { go('#/portal/' + el.dataset.id); };

/* ================= builder ================= */
let BQ = null; let BQ_DIRTY = false;
function blankQuote() {
  const no = S.settings.nextNo;
  const cat = S.settings.category;
  return {
    id: S.live ? uid('q') : 'q' + no, no: S.settings.prefix + no, cid: '', project: '', date: iso(TODAY), expiry: iso(addDays(TODAY, S.settings.validity)), sp: S.live ? ME.id : 'sp1',
    items: [
      /* the demo opens with a sample line; a live workspace opens with an empty one */
      prod('p11') ? { id: uid('i'), type: 'item', pid: 'p11', name: prod('p11').name, desc: prod('p11').desc, sku: prod('p11').sku, hsn: prod('p11').hsn, qty: 1, unit: prod('p11').unit, price: prod('p11').price, disc: 0, tax: prod('p11').tax }
        : { id: uid('i'), type: 'item', pid: null, name: '', desc: '', sku: '', qty: 1, unit: 'nos', price: 0, disc: 0, tax: S.settings.defaultTax },
    ],
    odisc: 0, odiscType: 'pct', ship: 0, extra: 0, extraLabel: 'Additional charges', advance: 50,
    notes: 'Rates include transportation to site and debris removal.', terms: S.settings.terms, paymentTerms: S.settings.paymentTerms,
    category: cat, catFields: Object.fromEntries(CATEGORIES[cat].fields.map(f => [f[0], ''])), template: S.settings.template,
    po: { has: false, no: '', date: '', ref: '' }, jobNo: '', shipSame: true, shipTo: null,
    termsCode: S.settings.termsCode || 'net15', termsDays: 0, cess: 0, tds: { on: false, rate: 2 },
    cols: workspaceCols(), flatTax: S.settings.itemFlatTax ?? S.settings.defaultTax,
    status: 'draft', views: 0, comms: [], feedback: [], isNew: true,
  };
}
function pageBuilder(id) {
  if (!BQ || (id ? BQ.id !== id : !BQ.isNew) || BQ._route !== location.hash) {
    if (id) { const src = quote(id); if (!src) { go('#/app/quotations'); return { html: '' }; } BQ = JSON.parse(JSON.stringify(src)); }
    else BQ = blankQuote();
    BQ._route = location.hash; BQ_DIRTY = false;
    if (!BQ.catFields) BQ.catFields = {};
  }
  const q = BQ; const c = q.cid ? cust(q.cid) : null; const T = calcQuote(q);
  const cat = CATEGORIES[q.category] || CATEGORIES.contractor;
  const html = `
  <div class="crumb"><a data-a="go" data-to="#/app/quotations">Quotations</a>${I('right', 'sm')}<span>${q.isNew ? 'New quotation' : q.no}</span></div>
  <div class="ph" style="align-items:center"><div class="row" style="gap:12px"><h1>${q.isNew ? 'New quotation' : 'Edit ' + q.no}</h1>${badge(q.status)}<span class="save-state" id="save-state">${BQ_DIRTY ? 'Unsaved changes' : q.isNew ? 'Not saved yet' : 'All changes saved'}</span></div>
    <div class="row wrap">
      <select class="select" style="width:auto" data-ch="bTemplate" aria-label="Template">${TEMPLATES.map(t => `<option value="${t.id}" ${q.template === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
      ${!q.isNew ? `<button class="btn" data-a="dupQ" data-id="${q.id}">${I('copy')} Duplicate</button>` : ''}
      <button class="btn" data-a="bPreview">${I('eye')} Preview</button>
      <button class="btn" data-a="bSave">Save draft</button>
      <button class="btn primary" data-a="bSend">${I('send')} Save & send</button>
    </div></div>

  <div class="builder">
    <div class="bcol">
      <div class="bsec"><div class="hd"><h3>Customer</h3><span class="spacer"></span><button class="btn sm ghost" data-a="addCustomer" data-then="builder">${I('userplus', 'sm')} New customer</button></div>
        <div class="bd">
          <div class="field"><label for="b-cust">Bill to</label><div class="searchbox">${I('search')}<input id="b-cust" class="input" placeholder="Search customers by name or company" autocomplete="off" data-in="bCustSearch" value="${c ? esc(c.name + ', ' + c.company) : ''}"></div><div id="b-cust-res" style="position:relative"></div></div>
          ${c ? `<div class="attach" style="margin-top:10px;background:var(--surface)">${av(c.name)}<div style="flex:1;min-width:0;font-size:12.5px"><b style="font-weight:600;font-size:13.5px">${esc(c.company)}</b><div class="muted">${esc(c.name)} · ${esc(c.email)} · ${esc(c.phone)}</div><div class="muted">${esc(c.address)}${c.gstin ? ' · GSTIN ' + c.gstin : ''}</div></div><button class="btn sm ghost" data-a="go" data-to="#/app/customers/${c.id}">Profile</button></div>
            ${(() => { const s = custStats(c.id); return s.n ? `<p class="hint" style="margin-top:8px">${s.n} previous quotations · ${s.acc} accepted · ${moneyC(s.accV)} won · ${s.conv}% win rate</p>` : '<p class="hint" style="margin-top:8px">First quotation for this customer.</p>'; })()}` : `<p class="hint" style="margin-top:8px">Selecting a customer fills in their contact, address and GSTIN.</p>`}
        </div></div>

      <div class="bsec"><div class="hd"><h3>Quotation details</h3></div><div class="bd">
        <div class="grid3">
          <div class="field"><label for="b-no">Quotation no.</label><input class="input" id="b-no" value="${esc(q.no)}" data-in="bf" data-f="no"></div>
          <div class="field"><label for="b-date">Issue date</label><input class="input" type="date" id="b-date" value="${q.date}" data-ch="bf" data-f="date"></div>
          <div class="field"><label for="b-exp">Valid until</label><input class="input" type="date" id="b-exp" value="${q.expiry}" data-ch="bf" data-f="expiry"></div>
        </div>
        <div class="grid3" style="margin-top:12px">
          <div class="field"><label for="b-proj">Project name</label><input class="input" id="b-proj" value="${esc(q.project)}" placeholder="e.g. Reception redesign" data-in="bf" data-f="project"></div>
          <div class="field"><label for="b-job">Project / job number</label><input class="input" id="b-job" value="${esc(q.jobNo || '')}" placeholder="JOB-2026-041" data-in="bf" data-f="jobNo"></div>
          <div class="field"><label for="b-terms">Payment terms</label><select class="select" id="b-terms" data-ch="bf" data-f="termsCode">${PAY_TERMS.map(t => `<option value="${t[0]}" ${q.termsCode === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></div>
        </div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label for="b-sp">Salesperson</label><select class="select" id="b-sp" data-ch="bf" data-f="sp">${SALES.map(s => `<option value="${s.id}" ${q.sp === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
        </div>
        <div class="field" style="margin-top:12px"><label for="b-cat">Business type</label><select class="select" id="b-cat" data-ch="bCat">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${q.category === k ? 'selected' : ''}>${v.label}: ${v.desc.toLowerCase()}</option>`).join('')}</select></div>
        <div class="bsub">
          <label class="row" style="gap:8px;cursor:pointer;font-size:13.5px"><input type="checkbox" ${q.po && q.po.has ? 'checked' : ''} data-ch="bPoHas"> Customer has a PO</label>
          ${q.po && q.po.has ? `<div class="grid3" style="margin-top:10px">
            <div class="field"><label for="b-pono">PO number</label><input class="input" id="b-pono" value="${esc(q.po.no)}" placeholder="PO-4587" data-in="bPo" data-f="no"></div>
            <div class="field"><label for="b-podt">PO date</label><input class="input" type="date" id="b-podt" value="${q.po.date || ''}" data-ch="bPo" data-f="date"></div>
            <div class="field"><label for="b-poref">Customer reference</label><input class="input" id="b-poref" value="${esc(q.po.ref || '')}" placeholder="Contact or department" data-in="bPo" data-f="ref"></div>
          </div>` : '<p class="hint">Optional. A PO is the customer\'s reference and is printed alongside your own numbers.</p>'}
        </div>
        <div class="bsub">
          <label class="row" style="gap:8px;cursor:pointer;font-size:13.5px"><input type="checkbox" ${q.shipSame !== false ? 'checked' : ''} data-ch="bShipSame"> Ship to same as billing address</label>
          ${q.shipSame === false ? `<div class="grid2" style="margin-top:10px">
            <div class="field" style="grid-column:1/-1"><label for="b-shn">Consignee name</label><input class="input" id="b-shn" value="${esc((q.shipTo || {}).name || '')}" data-in="bShip" data-f="name"></div>
            <div class="field" style="grid-column:1/-1"><label for="b-sha">Delivery address</label><input class="input" id="b-sha" value="${esc((q.shipTo || {}).address || '')}" data-in="bShip" data-f="address"></div>
            <div class="field"><label for="b-shc">City</label><input class="input" id="b-shc" value="${esc((q.shipTo || {}).city || '')}" data-in="bShip" data-f="city"></div>
            <div class="field"><label for="b-shs">State</label><select class="select" id="b-shs" data-ch="bShip" data-f="state">${STATES.map(v => `<option ${(q.shipTo || {}).state === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
            <div class="field"><label for="b-shp">PIN</label><input class="input" id="b-shp" value="${esc((q.shipTo || {}).pin || '')}" data-in="bShip" data-f="pin"></div>
            <div class="field"><label for="b-shg">GSTIN</label><input class="input" id="b-shg" value="${esc((q.shipTo || {}).gstin || '')}" data-in="bShip" data-f="gstin"></div>
          </div>` : ''}
        </div>
        <div class="ind-fields">${cat.fields.map(([k, l, ph]) => `<div class="field"><label for="cf-${k}">${l}</label><input class="input" id="cf-${k}" placeholder="${esc(ph)}" value="${esc(q.catFields[k] || '')}" data-in="bCatField" data-k="${k}"></div>`).join('')}</div>
      </div></div>

      <div class="bsec"><div class="hd"><h3>Items</h3><span class="muted" style="font-size:12.5px">${q.items.filter(i => i.type !== 'section').length} lines</span><span class="spacer"></span></div>
        <div class="bd" style="padding:10px 10px 14px"><div class="tbl-wrap"><table class="items-tbl" id="items-tbl" style="min-width:${itemMinW(q)}px">${itemHead(q)}
          <tbody id="items-body">${itemRows(q, T)}</tbody></table></div>
          <div class="row wrap" style="margin-top:10px;padding:0 5px">
            <button class="btn sm" data-a="bPick">${I('box', 'sm')} Add from catalogue</button>
            <button class="btn sm" data-a="bAddCustom">${I('plus', 'sm')} Custom item</button>
            <button class="btn sm ghost" data-a="bAddSection">${I('layers', 'sm')} Add section</button>
          </div>
        </div></div>

      <div class="bsec"><div class="hd"><h3>Pricing</h3></div><div class="bd"><div class="totals" id="totals">${totalsBlock(q, T)}</div></div></div>

      <div class="bsec"><div class="hd"><h3>Notes & terms</h3></div><div class="bd stack">
        <div class="field"><label for="b-notes">Notes for customer</label><textarea class="textarea" id="b-notes" style="min-height:60px" data-in="bf" data-f="notes">${esc(q.notes)}</textarea></div>
        <div class="field"><label for="b-pt">Payment terms</label><input class="input" id="b-pt" value="${esc(q.paymentTerms)}" data-in="bf" data-f="paymentTerms"></div>
        <div class="field"><label for="b-terms">Terms and conditions</label><textarea class="textarea" id="b-terms" style="min-height:120px" data-in="bf" data-f="terms">${esc(q.terms)}</textarea></div>
      </div></div>
    </div>

    <div class="preview-col"><div class="row between" style="margin-bottom:8px"><b style="font-size:13px">Live preview</b><span class="muted" style="font-size:12px">${TEMPLATES.find(t => t.id === q.template).name}</span></div>
      <div class="preview-frame" id="pv-frame"><div id="pv-scale" class="preview-scale">${docHTML(q)}</div></div></div>
  </div>`;
  return { html, title: q.isNew ? 'New quotation' : 'Edit ' + q.no, keepScroll: true, after: () => { fitPreview(); bindDrag(); window.onresize = fitPreview; } };
}
function fitPreview() {
  const f = $('#pv-frame'), s = $('#pv-scale'); if (!f || !s) return;
  const w = f.clientWidth - 32; const sc = Math.min(1, w / 794);
  s.style.transform = `scale(${sc})`; s.style.width = '794px'; s.style.height = (s.firstElementChild.offsetHeight * sc) + 'px';
}
/* Item table: same layout as before (name on top, figures in columns under the headers, description/SKU underneath),
   but the columns come from Settings → Item columns. */
const CELL_W = { qty: 74, unit: 80, price: 96, disc: 62, tax: 74 };
const cellW = c => CELL_W[c.key] || 76;
const itemMinW = q => 18 + itemLayout(q).cells.reduce((a, c) => a + cellW(c), 0) + 110 + 82;
function itemLayout(q) {
  const on = qCols(q).filter(c => c.on && !['name', 'amount'].includes(c.key));
  const cells = on.filter(c => !(['desc', 'sku', 'hsn'].includes(c.key) || (c.custom && c.type === 'text')));
  const texts = on.filter(c => ['desc', 'sku', 'hsn'].includes(c.key) || (c.custom && c.type === 'text'));
  return { cells, texts };
}
function itemHead(q) {
  const { cells } = itemLayout(q), cols = qCols(q);
  return `<thead><tr><th style="width:18px"></th>${cells.map((c, i) => `<th style="width:${cellW(c)}px" title="${esc(c.label)}">${i === 0 ? esc(colLabel(cols, 'name')) + ' · ' : ''}${esc(c.label)}</th>`).join('')}<th style="width:110px;text-align:right">${esc(colLabel(cols, 'amount'))}</th><th style="width:82px"></th></tr></thead>`;
}
function itemCell(c, it, idx) {
  const d = `data-idx="${idx}"`, al = `aria-label="${esc(c.label)}"`;
  const num = (f, extra = '') => `<td><input class="input num" type="number" min="0" step="any" ${extra} value="${it[f] ?? 0}" data-in="bItem" ${d} data-f="${f}" ${al}></td>`;
  switch (c.key) {
    case 'qty': return num('qty');
    case 'price': return num('price');
    case 'disc': return num('disc', 'max="100"');
    case 'unit': return `<td><select class="select" data-ch="bItem" ${d} data-f="unit" ${al}>${[...new Set([it.unit || 'nos', ...UNITS])].map(u => `<option ${u === it.unit ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></td>`;
    case 'tax': return `<td><select class="select" data-ch="bItem" ${d} data-f="tax" ${al}>${TAXES.map(t => `<option value="${t}" ${+it.tax === t ? 'selected' : ''}>${t}%</option>`).join('')}</select></td>`;
  }
  const v = it.cf?.[c.key] ?? '';
  return `<td><input class="input num" type="number" step="any" value="${esc(v)}" placeholder="${c.mult ? '1' : ''}" data-in="bItemCf" ${d} data-k="${c.key}" ${al}></td>`;
}
function itemText(c, it, idx) {
  const d = `data-idx="${idx}"`, ph = esc(c.key === 'desc' ? c.label + ' (optional)' : c.label);
  const st = c.key === 'desc' ? 'flex:2 1 180px' : 'flex:1 1 110px';
  if (['desc', 'sku', 'hsn'].includes(c.key)) return `<input class="input desc" style="${st}" value="${esc(it[c.key] || '')}" placeholder="${ph}" data-in="bItem" ${d} data-f="${c.key}" aria-label="${esc(c.label)}">`;
  return `<input class="input desc" style="${st}" value="${esc(it.cf?.[c.key] ?? '')}" placeholder="${ph}" data-in="bItemCf" ${d} data-k="${c.key}" aria-label="${esc(c.label)}">`;
}
const ltxText = L => `${L.mult !== 1 ? `×${numF(L.mult)} · ` : ''}${L.d ? `−${money(L.d)} disc · ` : ''}${money(L.taxAmt)} tax`;
function itemRows(q, T) {
  const { cells, texts } = itemLayout(q), N = cells.length, rs = texts.length ? 3 : 2;
  const nameLbl = esc(colLabel(qCols(q), 'name'));
  return q.items.map((it, idx) => {
    const L = T.lines[idx];
    if (it.type === 'section') return `<tr class="section-row" draggable="true" data-idx="${idx}"><td><span class="handle" title="Drag to reorder">${I('grip', 'sm')}</span></td><td colspan="${N + 1}"><input class="input" value="${esc(it.name)}" data-in="bItem" data-idx="${idx}" data-f="name" aria-label="Section title"></td><td><div class="row-acts">${rowActs(idx, q)}</div></td></tr>`;
    return `<tr class="item-row" draggable="true" data-idx="${idx}">
      <td rowspan="${rs}"><span class="handle" title="Drag to reorder">${I('grip', 'sm')}</span></td>
      <td colspan="${N}"><input class="input nm" value="${esc(it.name)}" data-in="bItem" data-idx="${idx}" data-f="name" aria-label="${nameLbl}" placeholder="${nameLbl} name"></td>
      <td class="lt" data-lt="${idx}">${money2(L.total)}</td>
      <td rowspan="${rs}"><div class="row-acts">${rowActs(idx, q)}</div></td></tr>
      <tr class="qty-row" data-idx="${idx}">${cells.map(c => itemCell(c, it, idx)).join('')}
      <td class="lr-s" style="text-align:right;padding-top:9px;white-space:nowrap" data-ltx="${idx}">${ltxText(L)}</td></tr>
      ${texts.length ? `<tr class="desc-row" data-idx="${idx}"><td colspan="${N + 1}"><div class="row" style="gap:8px;flex-wrap:wrap">${texts.map(c => itemText(c, it, idx)).join('')}</div></td></tr>` : ''}`;
  }).join('') || `<tr><td colspan="${N + 3}"><div class="empty" style="padding:24px">${I('box')}<h4>No items yet</h4><p>Add from your catalogue or type a custom line.</p></div></td></tr>`;
}
const rowActs = (idx, q) => `<button class="btn sm ghost icon" data-a="bMove" data-idx="${idx}" data-d="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Move up">${I('up', 'sm')}</button><button class="btn sm ghost icon" data-a="bMove" data-idx="${idx}" data-d="1" ${idx === q.items.length - 1 ? 'disabled' : ''} aria-label="Move down">${I('down', 'sm')}</button><button class="btn sm ghost icon danger" data-a="bRemove" data-idx="${idx}" aria-label="Remove line">${I('trash', 'sm')}</button>`;
function totalsBlock(q, T) {
  const taxRows = Object.entries(T.taxBreak).filter(([r, v]) => v > 0).map(([r, v]) => `<div class="tr"><span class="muted">${S.settings.taxLabel} @ ${r}% <span style="font-size:11.5px">(${T.interState ? `IGST ${r}%` : `CGST ${r / 2}% + SGST ${r / 2}%`})</span></span><span class="num">${money2(v)}</span></div>`).join('');
  return `
    <div class="tr"><span>Subtotal</span><span class="num" data-t="sub">${money2(T.sub)}</span></div>
    ${colOn(qCols(q), 'disc') ? `<div class="tr"><span class="muted">Item discounts</span><span class="num" data-t="idisc">−${money2(T.idisc)}</span></div>` : ''}
    <div class="tr"><span>Overall discount</span><span class="row" style="gap:6px"><select class="select" data-ch="bf" data-f="odiscType" aria-label="Discount type"><option value="pct" ${q.odiscType === 'pct' ? 'selected' : ''}>%</option><option value="flat" ${q.odiscType === 'flat' ? 'selected' : ''}>${cur().sym.trim()}</option></select><input class="input num" type="number" min="0" value="${q.odisc}" data-in="bTot" data-f="odisc" aria-label="Overall discount"><span class="num" style="min-width:90px;text-align:right" data-t="od">−${money2(T.od)}</span></span></div>
    <div class="tr"><span>Shipping / delivery</span><span class="row" style="gap:6px"><input class="input num" type="number" min="0" value="${q.ship}" data-in="bTot" data-f="ship" aria-label="Shipping"><span style="min-width:90px"></span></span></div>
    <div class="tr"><input class="input" style="width:170px;text-align:left;height:30px" value="${esc(q.extraLabel)}" data-in="bf" data-f="extraLabel" aria-label="Additional charge label"><span class="row" style="gap:6px"><input class="input num" type="number" min="0" value="${q.extra}" data-in="bTot" data-f="extra" aria-label="Additional charges"><span style="min-width:90px"></span></span></div>
    <div class="tr"><span class="muted">Taxable value</span><span class="num" data-t="taxable">${money2(T.taxable)}</span></div>
    <div data-t="taxrows">${taxRows}</div>
    ${T.roundDiff ? `<div class="tr"><span class="muted">Round off</span><span class="num" data-t="round">${T.roundDiff > 0 ? '+' : '−'}${money2(Math.abs(T.roundDiff))}</span></div>` : ''}
    <div class="tr gt"><span>Grand total</span><span class="num" data-t="grand">${money2(T.grand)}</span></div>
    <div class="tr"><label class="row" style="gap:7px;cursor:pointer;font-size:12.5px;color:var(--ink-2)"><input type="checkbox" ${q.roundOff != null ? (q.roundOff ? 'checked' : '') : (S.settings.roundOff ? 'checked' : '')} data-ch="bRound"> Round off to the nearest rupee</label><span></span></div>
    <div class="tr"><label class="row" style="gap:7px;cursor:pointer;font-size:12.5px;color:var(--ink-2)"><input type="checkbox" ${q.tds && q.tds.on ? 'checked' : ''} data-ch="bTds"> Apply TDS</label>
      ${q.tds && q.tds.on ? `<span class="row" style="gap:6px"><input class="input num" style="width:64px" type="number" min="0" max="20" step="0.1" value="${q.tds.rate}" data-in="bTdsRate" aria-label="TDS rate"><span class="muted">%</span><span class="num" style="min-width:90px">−${money2(T.tdsAmt)}</span></span>` : '<span></span>'}</div>
    ${T.tdsAmt ? `<div class="tr"><span>Net receivable after TDS</span><span class="num">${money2(T.netReceivable)}</span></div>` : ''}
    <div class="tr"><span>Advance payment</span><span class="row" style="gap:6px"><input class="input num" style="width:64px" type="number" min="0" max="100" value="${q.advance}" data-in="bTot" data-f="advance" aria-label="Advance percent"><span class="muted">%</span><span class="num" style="min-width:90px;text-align:right" data-t="adv">${money2(T.adv)}</span></span></div>
    <p class="hint">${amtWords(T.grand)}</p>`;
}
function bUpdate(full) {
  BQ_DIRTY = true; const ss = $('#save-state'); if (ss) ss.textContent = 'Unsaved changes';
  if (full) { rerender(); return; }
  const T = calcQuote(BQ);
  T.lines.forEach((L, i) => { const e = $(`[data-lt="${i}"]`); if (e && L.total !== undefined) e.textContent = money2(L.total); const x = $(`[data-ltx="${i}"]`); if (x && L.total !== undefined) x.textContent = ltxText(L); });
  const set = (k, v) => { const e = $(`[data-t="${k}"]`); if (e) e.innerHTML = v; };
  set('sub', money2(T.sub)); set('idisc', '−' + money2(T.idisc)); set('round', (T.roundDiff > 0 ? '+' : '−') + money2(Math.abs(T.roundDiff))); set('od', '−' + money2(T.od)); set('taxable', money2(T.taxable)); set('grand', money2(T.grand)); set('adv', money2(T.adv));
  set('taxrows', Object.entries(T.taxBreak).filter(([r, v]) => v > 0).map(([r, v]) => `<div class="tr"><span class="muted">${S.settings.taxLabel} @ ${r}% <span style="font-size:11.5px">(${T.interState ? `IGST ${r}%` : `CGST ${r / 2}% + SGST ${r / 2}%`})</span></span><span class="num">${money2(v)}</span></div>`).join(''));
  const h = $('#totals .hint'); if (h) h.textContent = amtWords(T.grand);
  const pv = $('#pv-scale'); if (pv) { pv.innerHTML = docHTML(BQ); fitPreview(); }
}
IN.bf = el => { BQ[el.dataset.f] = el.value; bUpdate(el.dataset.f === 'odiscType'); };
IN.bTot = el => { BQ[el.dataset.f] = el.value === '' ? 0 : +el.value; bUpdate(); };
IN.bItem = el => { const it = BQ.items[+el.dataset.idx]; const f = el.dataset.f; it[f] = ['qty', 'price', 'disc', 'tax'].includes(f) ? (el.value === '' ? 0 : +el.value) : el.value; bUpdate(); };
IN.bItemCf = el => { const it = BQ.items[+el.dataset.idx]; it.cf = it.cf || {}; it.cf[el.dataset.k] = el.value; bUpdate(); };
IN.bCatField = el => { BQ.catFields[el.dataset.k] = el.value; bUpdate(); };
IN.bCat = el => { BQ.category = el.value; const f = CATEGORIES[el.value].fields; const nf = {}; f.forEach(([k]) => nf[k] = BQ.catFields[k] || ''); if (BQ.cid && 'site' in nf && !nf.site) nf.site = cust(BQ.cid).address; BQ.catFields = nf; bUpdate(true); toast(`${CATEGORIES[el.value].label} fields added`, 'Suggested fields now appear on the quotation'); };
IN.bTemplate = el => { BQ.template = el.value; bUpdate(true); };
IN.bCustSearch = el => {
  const v = el.value.trim().toLowerCase(); const box = $('#b-cust-res');
  const list = S.customers.filter(c => !v || (c.name + ' ' + c.company + ' ' + c.email).toLowerCase().includes(v)).slice(0, 8);
  box.innerHTML = `<div class="sresults" style="top:4px">${list.map(c => { const s = custStats(c.id); return `<button data-a="bSetCust" data-id="${c.id}">${av(c.name, 'xs')}<span style="flex:1;min-width:0"><b style="font-weight:500">${esc(c.company)}</b> <span class="muted">${esc(c.name)} · ${esc(c.city)}</span></span><span class="muted" style="font-size:12px">${s.n} quotes</span></button>`; }).join('') || '<div class="empty" style="padding:16px">No customer found</div>'}<button data-a="addCustomer" data-then="builder" style="border-top:1px solid var(--line);border-radius:0;margin-top:4px">${I('userplus', 'sm')} Add “${esc(el.value || 'new customer')}”</button></div>`;
};
A.bSetCust = el => {
  BQ.cid = el.dataset.id; const c = cust(BQ.cid);
  if ('site' in BQ.catFields && !BQ.catFields.site) BQ.catFields.site = c.address;
  if (c.terms) BQ.termsCode = c.terms;
  if (c.shipSame === false && c.shipTo) { BQ.shipSame = false; BQ.shipTo = { ...c.shipTo }; }
  BQ.sp = c.owner; bUpdate(true); toast('Customer details filled in', `${c.name}, ${c.company}`);
};
A.bMove = el => { const i = +el.dataset.idx, j = i + (+el.dataset.d); const a = BQ.items; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; bUpdate(true); };
A.bRemove = el => { const i = +el.dataset.idx; const it = BQ.items.splice(i, 1)[0]; bUpdate(true); toast(`Removed ${it.name || 'line'}`); };
A.bAddCustom = () => { BQ.items.push({ id: uid('i'), type: 'item', pid: null, name: '', desc: '', sku: '', qty: 1, unit: 'nos', price: 0, disc: 0, tax: S.settings.defaultTax }); bUpdate(true); setTimeout(() => { const ins = $$('#items-body input[data-f="name"]'); ins[ins.length - 1]?.focus(); }, 30); };
A.bAddSection = () => { BQ.items.push({ id: uid('i'), type: 'section', name: 'New section' }); bUpdate(true); setTimeout(() => { const ins = $$('#items-body .section-row input'); const l = ins[ins.length - 1]; l?.focus(); l?.select(); }, 30); };
A.bPick = () => {
  const sel = {};
  const cats = [...new Set(S.products.map(p => p.category))];
  openModal(`${mHead('Add from catalogue', 'Select one or more products and services.')}
    <div class="mb"><div class="row wrap" style="margin-bottom:10px"><div class="searchbox" style="flex:1;min-width:200px">${I('search')}<input class="input" id="pk-q" placeholder="Search by name or SKU" autofocus></div><select class="select" id="pk-cat" style="width:auto"><option value="">All categories</option>${cats.map(c => `<option>${c}</option>`).join('')}</select></div>
    <div class="picker-list" id="pk-list"></div></div>
    <div class="mf"><span class="muted" id="pk-count" style="margin-right:auto">Nothing selected</span><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="pk-add" disabled>Add items</button></div>`, 'wide', () => {
    const draw = () => {
      const q = $('#pk-q').value.toLowerCase(), c = $('#pk-cat').value;
      $('#pk-list').innerHTML = S.products.filter(p => p.active && (!c || p.category === c) && (p.name + p.sku).toLowerCase().includes(q)).map(p => `<div class="picker-item ${sel[p.id] ? 'sel' : ''}" data-pid="${p.id}" role="checkbox" aria-checked="${!!sel[p.id]}" tabindex="0"><input type="checkbox" ${sel[p.id] ? 'checked' : ''} tabindex="-1" aria-hidden="true"><div style="flex:1;min-width:0"><b style="font-weight:500">${esc(p.name)}</b> <span class="muted" style="font-size:12px">${p.sku}</span><div class="lr-s">${esc(p.desc)}</div></div><span class="badge nodot s-draft">${p.category}</span><div style="text-align:right;min-width:110px"><b class="num">${money(p.price)}</b><div class="lr-s">per ${p.unit} · ${p.tax}%</div></div></div>`).join('') || '<div class="empty">No items match. Try another search.</div>';
      $$('#pk-list .picker-item').forEach(r => { r.onclick = () => { sel[r.dataset.pid] = !sel[r.dataset.pid]; draw(); }; r.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); r.click(); } }; });
      const n = Object.values(sel).filter(Boolean).length; $('#pk-count').textContent = n ? `${n} selected` : 'Nothing selected'; $('#pk-add').disabled = !n;
    };
    draw(); $('#pk-q').oninput = draw; $('#pk-cat').onchange = draw;
    $('#pk-add').onclick = () => { const ids = Object.keys(sel).filter(k => sel[k]); ids.forEach(pid => { const p = prod(pid); BQ.items.push({ id: uid('i'), type: 'item', pid, name: p.name, desc: p.desc, sku: p.sku, hsn: p.hsn, qty: 1, unit: p.unit, price: p.price, disc: 0, tax: p.tax }); }); closeModal(); bUpdate(true); toast(`${ids.length} item${ids.length > 1 ? 's' : ''} added`, 'Totals updated'); };
  });
};
function bindDrag() {
  let from = null;
  $$('#items-body tr[draggable]').forEach(tr => {
    tr.addEventListener('dragstart', e => { if (!e.target.closest || document.activeElement?.tagName === 'INPUT') { } from = +tr.dataset.idx; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', from); } catch (x) { } });
    tr.addEventListener('dragover', e => { e.preventDefault(); $$('#items-body tr').forEach(r => r.classList.remove('drag-over')); tr.classList.add('drag-over'); });
    tr.addEventListener('drop', e => { e.preventDefault(); const to = +tr.dataset.idx; if (from === null || from === to) return; const it = BQ.items.splice(from, 1)[0]; BQ.items.splice(to, 0, it); from = null; bUpdate(true); });
    tr.addEventListener('dragend', () => $$('#items-body tr').forEach(r => r.classList.remove('drag-over')));
  });
  $$('#items-body input').forEach(i => { const r = () => $(`#items-body tr[draggable][data-idx="${i.dataset.idx}"]`) || { }; i.addEventListener('focus', () => r().draggable = false); i.addEventListener('blur', () => r().draggable = true); });
}
function bValidate() {
  const errs = [];
  if (!BQ.cid) errs.push('Select a customer');
  if (!BQ.items.some(i => i.type !== 'section' && i.name && (!colOn(qCols(BQ), 'qty') || i.qty > 0))) errs.push(colOn(qCols(BQ), 'qty') ? 'Add at least one item with a quantity' : 'Add at least one item');
  if (BQ.items.some(i => i.type !== 'section' && !i.name)) errs.push('Name every item line');
  if (BQ.expiry < BQ.date) errs.push('Valid-until date must be after the issue date');
  if (errs.length) { toast('Quotation not saved', errs.join('. ') + '.', 'err'); if (!BQ.cid) $('#b-cust')?.focus(); return false; }
  return true;
}
function bCommit() {
  const q = BQ; const T = calcQuote(q);
  if (!q.project) q.project = 'Untitled project';
  q.total = T.grand;
  const clean = JSON.parse(JSON.stringify(q)); delete clean._route;
  if (q.isNew) {
    delete clean.isNew; clean.created = Date.now(); clean.comms = [{ ch: 'system', ev: 'Quotation created', ts: Date.now(), to: '', by: spName(q.sp) }];
    if (!S.live) clean.id = 'q' + S.settings.nextNo;
    S.settings.nextNo++;
    S.quotes.push(clean);
    const lead = S.leads.find(l => l.cid === clean.cid && !l.qid);
    if (lead) Object.assign(lead, { qid: clean.id, stage: 'created', value: clean.total, title: clean.project, last: Date.now() });
    else S.leads.push({ id: uid('l'), cid: clean.cid, qid: clean.id, title: clean.project, value: clean.total, stage: 'created', sp: clean.sp, last: Date.now(), fu: iso(addDays(TODAY, 3)) });
    BQ = null; BQ_DIRTY = false;
    return clean;
  } else {
    const i = S.quotes.findIndex(x => x.id === q.id);
    clean.comms = S.quotes[i].comms.concat([{ ch: 'system', ev: 'Quotation edited', ts: Date.now(), to: '' }]);
    S.quotes[i] = clean;
    const lead = S.leads.find(l => l.qid === q.id); if (lead) { lead.value = clean.total; lead.title = clean.project; }
    BQ = null; BQ_DIRTY = false;
    return clean;
  }
}
A.bSave = () => { if (!bValidate()) return; const isNew = BQ.isNew; const q = bCommit(); toast(isNew ? `${q.no} saved as draft` : `${q.no} updated`, `${money(q.total)} · ${cust(q.cid).company}`); go('#/app/quotations/' + q.id); };
A.bSend = () => { if (!bValidate()) return; const q = bCommit(); go('#/app/quotations/' + q.id); setTimeout(() => openShare(q.id, 'email'), 150); };
A.bPreview = () => { openModal(`${mHead('Preview', `${esc(BQ.no)} · ${TEMPLATES.find(t => t.id === BQ.template).name}`)}<div class="mb" style="background:var(--surface-3)"><div class="doc-scroll">${docHTML(BQ)}</div></div><div class="mf"><button class="btn" data-a="closeModal">Keep editing</button><button class="btn primary" id="pv-send">${I('send')} Save & send</button></div>`, 'xl'); $('#pv-send').onclick = () => { closeModal(); A.bSend(); }; };

/* ================= document ================= */
function docHTML(q, opts = {}) {
  const s = S.settings; const c = q.cid ? cust(q.cid) : null; const T = calcQuote(q);
  const tpl = q.template || s.template; const brand = opts.brand || s.brand;
  if (tpl === 'tally') return tallyDoc(q, opts);
  const cat = CATEGORIES[q.category];
  const catFields = cat ? cat.fields.filter(([k]) => q.catFields && q.catFields[k]).map(([k, l]) => [l, q.catFields[k]]) : [];
  const proj = [['Project', q.project || '—'], ...(q.jobNo ? [['Job number', q.jobNo]] : []), ['Prepared by', spName(q.sp)],
    ...(q.po && q.po.has && q.po.no ? [['Customer PO', q.po.no + (q.po.date ? ' · ' + fdate(q.po.date) : '')]] : []),
    ...(q.po && q.po.has && q.po.ref ? [['Customer reference', q.po.ref]] : []), ...catFields].slice(0, 9);
  let n = 0;
  const stampable = ['accepted', 'rejected', 'expired'].includes(q.status) && !opts.noStamp;
  const fontVar = s.font === 'Inter' ? '' : `--doc-font:'${s.font}',Georgia,serif;`;
  return `<article class="doc t-${tpl} ${s.header === 'center' ? 'h-center' : ''}" style="--doc-accent:${brand};--doc-accent-soft:${brand}1f;${fontVar}" aria-label="Quotation document">
    ${stampable ? `<span class="stamp ${q.status} ${opts.hit ? 'hit' : ''}">${cap(q.status)}<small>${q.respondedAt ? fdate(new Date(q.respondedAt)) : fdate(q.expiry)}</small></span>` : ''}
    <div class="d-head">
      <div class="d-biz"><div class="d-logo">${s.logo ? `<img src="${s.logo}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:10px;background:#fff">` : esc(initials(s.bizName))}</div><h2>${esc(s.bizName)}</h2><p>${esc(s.address)}, ${esc(s.city)}</p><p>${esc(s.phone)} · ${esc(s.email)}</p><p>GSTIN ${esc(s.gstin)}</p></div>
      <div class="d-title"><h1>Quotation</h1><div class="d-meta"><span>Quotation no.</span><b>${esc(q.no)}</b><span>Issue date</span><b>${fdate(q.date)}</b><span>Valid until</span><b>${fdate(q.expiry)}</b>${q.status !== 'draft' ? '' : '<span>Status</span><b>Draft</b>'}</div></div>
    </div>
    <div class="d-parties">
      <div class="d-to"><div class="d-lbl">Quotation for</div>${c ? `<h4>${esc(c.company)}</h4><p>Attn: ${esc(c.name)}</p><p>${esc(c.address)}</p><p>${esc(c.email)} · ${esc(c.phone)}</p>${c.gstin ? `<p>GSTIN ${esc(c.gstin)}</p>` : ''}` : `<h4 style="color:#9AA1B0">Select a customer</h4><p>Customer details appear here</p>`}</div>
      ${q.shipSame === false && q.shipTo ? `<div class="d-to"><div class="d-lbl">Ship to</div><h4>${esc(q.shipTo.name || (c ? c.company : ''))}</h4><p>${esc(q.shipTo.address || '')}</p><p>${esc([q.shipTo.city, q.shipTo.state, q.shipTo.pin].filter(Boolean).join(', '))}</p>${q.shipTo.gstin ? `<p>GSTIN ${esc(q.shipTo.gstin)}</p>` : ''}</div>` : ''}
      <div class="d-to"><div class="d-lbl">Payment terms</div><p style="color:#1D2638">${esc(termLabel(q.termsCode || 'net15', q.termsDays))}</p><p style="color:#1D2638">${esc(q.paymentTerms)}</p>${+q.advance ? `<div class="d-lbl" style="margin-top:10px">Advance due on acceptance</div><p style="color:#1D2638;font-weight:600">${money2(T.adv)} (${q.advance}%)</p>` : ''}</div>
    </div>
    <div class="d-proj">${proj.map(([l, v]) => `<div><span class="d-lbl">${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${(() => {
      const cols = qCols(q), on = k => colOn(cols, k);
      const dc = cols.filter(c => c.on && !['name', 'amount', 'desc', 'sku'].includes(c.key)).filter(c => !(c.key === 'unit' && on('qty')) && !(c.key === 'disc' && !T.idisc)).map(c => {
        const h = c.key === 'tax' && c.label === 'Tax' ? s.taxLabel : c.key === 'disc' && c.label === 'Disc %' ? 'Disc.' : c.label;
        const v = L => { switch (c.key) {
          case 'qty': return `${numF(L.qty)}${on('unit') && L.unit ? ' ' + esc(L.unit) : ''}`;
          case 'unit': return esc(L.unit || '');
          case 'price': return money2(L.price);
          case 'disc': return L.disc ? L.disc + '%' : '—';
          case 'tax': return L.tax + '%';
          case 'hsn': return esc(L.hsn || prod(L.pid)?.hsn || '—');
          default: { const x = L.cf?.[c.key]; return x === '' || x == null ? '—' : c.type === 'number' ? numF(+x) : esc(x); }
        } };
        return { h, v, r: c.type !== 'text' || c.key === 'unit' };
      });
      const nameH = colLabel(cols, 'name') === 'Item' ? 'Item & description' : colLabel(cols, 'name');
      const span = dc.length + 3;
      return `<table class="d-items"><thead><tr><th style="width:26px">#</th><th>${esc(nameH)}</th>${dc.map(c => `<th class="${c.r ? 'r' : ''}">${esc(c.h)}</th>`).join('')}<th class="r">${esc(colLabel(cols, 'amount'))}</th></tr></thead><tbody>
      ${T.lines.map(L => L.type === 'section' ? `<tr class="sec"><td colspan="${span}">${esc(L.name)}</td></tr>` : `<tr><td>${++n}</td><td><b style="font-weight:600;color:#16213A">${esc(L.name || 'Untitled item')}</b>${on('desc') && L.desc ? `<small>${esc(L.desc)}</small>` : ''}${on('sku') && L.sku ? `<small>${esc(L.sku)}</small>` : ''}</td>${dc.map(c => `<td class="${c.r ? 'r' : ''}">${c.v(L)}</td>`).join('')}<td class="r">${money2(L.net)}</td></tr>`).join('')}`;
    })()}
    </tbody></table>
    <div class="d-bottom">
      <div class="d-notes">${q.notes ? `<h5>Notes</h5><p>${esc(q.notes)}</p>` : ''}<h5 style="margin-top:12px">Terms and conditions</h5><p>${esc(q.terms)}</p></div>
      <div class="d-tot">
        <div><span>Subtotal</span><span>${money2(T.sub)}</span></div>
        ${T.idisc ? `<div><span>Item discounts</span><span>−${money2(T.idisc)}</span></div>` : ''}
        ${T.od ? `<div><span>Discount${q.odiscType === 'pct' ? ` (${q.odisc}%)` : ''}</span><span>−${money2(T.od)}</span></div>` : ''}
        ${T.ship ? `<div><span>Shipping / delivery</span><span>${money2(T.ship)}</span></div>` : ''}
        ${T.extra ? `<div><span>${esc(q.extraLabel)}</span><span>${money2(T.extra)}</span></div>` : ''}
        ${Object.entries(T.taxBreak).filter(([, v]) => v > 0).map(([r, v]) => `<div><span>CGST ${r / 2}% + SGST ${r / 2}%</span><span>${money2(v)}</span></div>`).join('')}
        <div class="g"><span>Grand total</span><span>${money2(T.grand)}</span></div>
        <p class="d-words">${cur().sym === '₹' ? 'Rupees ' + numberToWordsIN(T.grand) + ' only' : ''}</p>
      </div>
    </div>
    <div class="d-sign"><div style="font-size:11px;color:#5B6477;max-width:320px">${esc(s.footer)}</div><div class="sg"><div class="scr">A. Mehta</div><div class="line">Authorised signatory, ${esc(s.bizName)}</div></div></div>
    <div class="d-foot"><span>${esc(s.legal)} · ${esc(s.website)}</span><span>${esc(q.no)} · Page 1 of 1</span></div>
  </article>`;
}

/* ================= quotation view ================= */
function pageQuoteView(id) {
  refreshExpiry();
  const q = quote(id); if (!q) { setTimeout(() => go('#/app/quotations'), 0); return { html: '' }; }
  const c = cust(q.cid); const T = calcQuote(q);
  const inv = q.invoiced ? S.invoices.find(i => i.id === q.invoiced) : null;
  const html = `
  <div class="crumb"><a data-a="go" data-to="#/app/quotations">Quotations</a>${I('right', 'sm')}<span>${q.no}</span></div>
  <div class="ph" style="margin-bottom:6px"><div><div class="row" style="gap:10px"><h1>${q.no}</h1>${badge(q.status)}${q.views ? `<span class="muted row" style="gap:4px;font-size:12.5px">${I('eye', 'sm')} Viewed ${q.views}×</span>` : ''}</div><p><a style="cursor:pointer" data-a="go" data-to="#/app/customers/${c.id}">${esc(c.company)}</a> · ${esc(q.project)} · ${money(q.total)}</p></div></div>
  <div class="doc-actions">
    <button class="btn primary" data-a="shareQ" data-id="${q.id}" data-ch="email">${I('send')} Send quotation</button>
    <button class="btn wa" data-a="shareQ" data-id="${q.id}" data-ch="whatsapp">${I('wa')} WhatsApp</button>
    <button class="btn" data-a="go" data-to="#/app/quotations/${q.id}/edit">${I('edit')} Edit</button>
    <button class="btn" data-a="pdfDemo" data-id="${q.id}">${I('download')} Download PDF</button>
    <button class="btn" data-a="printQ">${I('print')} Print</button>
    <button class="btn" data-a="openPortal" data-id="${q.id}">${I('globe')} Client view</button>
    <span class="spacer"></span>
    ${q.status === 'accepted' ? (inv ? `<button class="btn" data-a="go" data-to="#/app/invoices">${I('receipt')} Invoice ${inv.no}</button>` : `<button class="btn dark" data-a="convertQ" data-id="${q.id}">${I('receipt')} Convert to invoice</button>`) : ''}
    <div class="menu-wrap"><button class="btn icon" data-a="qMenu" data-id="${q.id}" aria-label="More actions">${I('more')}</button></div>
  </div>
  <div class="doc-layout">
    <div class="doc-scroll print-target" id="doc-wrap">${docHTML(q)}</div>
    <div class="stack">
      <div class="panel"><div class="panel-h"><h3>Summary</h3></div><div class="panel-b stack" style="gap:8px;font-size:13px">
        <div class="row between"><span class="muted">Customer</span><a style="cursor:pointer;font-weight:500" data-a="go" data-to="#/app/customers/${c.id}">${esc(c.name)}</a></div>
        <div class="row between"><span class="muted">Salesperson</span><span>${spName(q.sp)}</span></div>
        <div class="row between"><span class="muted">Issued</span><span>${fdate(q.date)}</span></div>
        <div class="row between"><span class="muted">Valid until</span><span>${fdate(q.expiry)}</span></div>
        <div class="row between"><span class="muted">Items</span><span>${T.lines.filter(l => l.type !== 'section').length}</span></div>
        <div class="row between"><span class="muted">Tax</span><span class="num">${money(T.tax)}</span></div>
        <div class="row between" style="border-top:1px solid var(--line);padding-top:8px"><b>Total</b><b class="num">${money2(T.grand)}</b></div>
        ${q.status === 'rejected' ? `<div class="send-state" style="background:var(--red-soft);color:var(--red)">${I('info', 'sm')} Reason: ${esc(q.reason)}</div>` : ''}
        ${q.feedback?.length ? `<div class="send-state" style="background:var(--amber-soft);color:var(--amber);align-items:flex-start">${I('message', 'sm')}<div><b style="font-weight:600">Change requested</b><div style="color:var(--ink-2)">${esc(q.feedback[q.feedback.length - 1].text)}</div></div></div>` : ''}
        ${['sent', 'viewed', 'draft', 'expired'].includes(q.status) ? `<div class="row" style="margin-top:6px"><button class="btn sm" style="flex:1" data-a="markQ" data-id="${q.id}" data-s="accepted">${I('check', 'sm')} Mark accepted</button><button class="btn sm" style="flex:1" data-a="setStatus" data-id="${q.id}">${I('refresh', 'sm')} Change status</button></div>` : ''}
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Communication history</h3><span class="spacer"></span><button class="btn sm ghost" data-a="addFollowup" data-cid="${c.id}" data-qid="${q.id}">${I('plus', 'sm')} Follow-up</button></div>
        <div class="panel-b">${timelineHTML(q.comms.slice().reverse().map(x => ({ ...x, chLabel: { email: 'Email', whatsapp: 'WhatsApp', portal: 'Client portal', sms: 'SMS', telegram: 'Telegram', link: 'Link', system: '' }[x.ch] || '' })))}</div></div>
    </div>
  </div>`;
  return { html, title: q.no };
}
A.markQ = el => { const q = quote(el.dataset.id); applyStatus(q, el.dataset.s, '', 'Marked by ' + ME.name); toast(`${q.no} marked ${el.dataset.s}`, 'Customer and dashboard analytics updated'); rerender(); };
A.printQ = () => { toast('Opening print dialog', 'Only the quotation page is printed'); setTimeout(() => window.print(), 300); };
A.pdfDemo = el => {
  const q = quote(el.dataset.id);
  openModal(`${mHead('Download PDF', q.no)}<div class="mb"><div class="progress-steps" id="pdf-steps"><div><span class="spin"></span> Rendering A4 layout</div></div></div><div class="mf"><button class="btn" data-a="closeModal">Close</button></div>`);
  const steps = ['Rendering A4 layout', 'Embedding fonts and logo', 'Adding tax summary'];
  let i = 0; const t = setInterval(() => {
    const box = $('#pdf-steps'); if (!box) return clearInterval(t);
    i++; box.innerHTML = steps.slice(0, i).map(s => `<div class="done">${I('check', 'sm')} ${s}</div>`).join('') + (i < steps.length ? `<div><span class="spin"></span> ${steps[i]}</div>` : `<div class="send-state ok" style="margin-top:8px">${I('checkc')} <div><b style="font-weight:600">${q.no}.pdf prepared (simulation)</b><div>In the full product this downloads a PDF. Use Print to save a copy now.</div></div></div>`);
    if (i >= steps.length) { clearInterval(t); q.comms.push({ ch: 'system', ev: 'PDF generated', ts: Date.now(), to: '' }); }
  }, 550);
};

/* ================= share modal ================= */
const SH = { tab: 'email' };
A.shareQ = el => { closeFloating(); openShare(el.dataset.id, el.dataset.ch || 'email', !!el.dataset.rem); };
function openShare(qid, tab = 'email', reminder = false) {
  const q = quote(qid); const c = cust(q.cid); const s = S.settings;
  const first = c.name.split(' ')[0];
  /* live: the real customer link, opened without a login (enterGuest in auth.js) */
  const link = S.live ? location.origin + location.pathname + '#/portal/' + quoteToken(q) : `https://qflow.link/q/${q.id.slice(1)}${q.no.slice(-2)}x`;
  SH.tab = tab; SH.q = q; SH.link = link; SH.reminder = reminder;
  SH.email = { to: [c.email], cc: [], bcc: [], subject: reminder ? `Reminder: Quotation #${q.no} from ${s.bizName}` : `Quotation #${q.no} from ${s.bizName}`, attach: true, includeLink: true,
    body: reminder ? `Hi ${first},\n\nJust following up on quotation ${q.no} for ${q.project}, which is valid until ${fdate(q.expiry)}.\n\nThe total comes to ${money2(q.total)}. You can review and accept it online using the link below. Happy to walk you through anything on a quick call.\n\nWarm regards,\n${spName(q.sp)}\n${s.bizName} · ${s.phone}`
      : `Hi ${first},\n\nThank you for the opportunity. Please find attached our quotation ${q.no} for ${q.project}.\n\nTotal: ${money2(q.total)} (incl. ${s.taxLabel})\nValid until: ${fdate(q.expiry)}\n\nYou can view, accept or request changes online using the secure link below. Let me know if you'd like to go over any line item.\n\nWarm regards,\n${spName(q.sp)}\n${s.bizName} · ${s.phone}` };
  SH.wa = { phone: c.phone, msg: reminder ? `Hi ${first}, a quick reminder about quotation *${q.no}* for ${q.project}.\n\nTotal: *${money2(q.total)}*\nValid till ${fdate(q.expiry)}\n\nView & accept: ${link}\n\n– ${spName(q.sp)}, ${s.bizName}` : `Hi ${first}, here is quotation *${q.no}* from ${s.bizName} for ${q.project}.\n\nTotal: *${money2(q.total)}*\nValid till ${fdate(q.expiry)}\n\nView & accept securely: ${link}\n\n– ${spName(q.sp)}` };
  SH.sending = false; SH.done = null;
  openModal(`<div class="mh"><div style="flex:1;min-width:0"><h3>${reminder ? 'Send reminder' : 'Send quotation'}</h3><p>${q.no} · ${esc(c.company)} · ${money(q.total)}</p></div>${badge(q.status)}<button class="btn icon ghost sm" data-a="closeModal" aria-label="Close">${I('x')}</button></div>
    <div class="share-grid"><nav class="share-nav" id="sh-nav"></nav><div class="share-body" id="sh-body"></div></div>`, 'wide', () => drawShare());
  modalCleanup = () => { rerender(); };
}
function drawShare() {
  const nav = $('#sh-nav'); if (!nav) return;
  const q = SH.q;
  const tabs = [['email', 'Email', 'mail', 'tone-blue'], ['whatsapp', 'WhatsApp', 'wa', 'tone-green'], ['more', 'More options', 'share', 'tone-slate'], ['history', 'History', 'clock', 'tone-slate']];
  nav.innerHTML = tabs.map(([k, l, ic, tone]) => `<button class="${SH.tab === k ? 'on' : ''}" data-a="shTab" data-t="${k}"><span class="sn-ico ${tone}">${I(ic, 'sm')}</span>${l}${k === 'history' ? `<span class="muted" style="margin-left:auto;font-size:12px">${q.comms.filter(x => x.ch !== 'system').length}</span>` : ''}</button>`).join('');
  const b = $('#sh-body');
  if (SH.done) { b.innerHTML = SH.done; return; }
  if (SH.tab === 'email') {
    const E = SH.email;
    const tagField = (k, label) => `<div class="field"><label>${label}</label><div class="tag-input" data-tags="${k}">${E[k].map((t, i) => `<span class="tag ${/^\S+@\S+\.\S+$/.test(t) ? '' : 'bad'}">${esc(t)}<button data-a="shTagDel" data-k="${k}" data-i="${i}" aria-label="Remove ${esc(t)}">×</button></span>`).join('')}<input data-tagin="${k}" placeholder="${E[k].length ? '' : 'Type an email and press Enter'}" aria-label="${label}"></div></div>`;
    b.innerHTML = `<div class="stack">
      ${tagField('to', 'To')}
      <div class="grid2">${tagField('cc', 'Cc')}${tagField('bcc', 'Bcc')}</div>
      <div class="field"><label for="sh-sub">Subject</label><input class="input" id="sh-sub" value="${esc(E.subject)}"></div>
      <div class="field"><label for="sh-body-t">Message</label><textarea class="textarea" id="sh-body-t" style="min-height:190px">${esc(E.body)}</textarea></div>
      <label class="attach" style="cursor:pointer"><input type="checkbox" id="sh-att" ${E.attach ? 'checked' : ''}><span class="pdf">PDF</span><div style="flex:1"><b style="font-weight:500">${q.no}.pdf</b><div class="muted" style="font-size:12px">Quotation attachment</div></div></label>
      <label class="row" style="font-size:13px;cursor:pointer"><input type="checkbox" id="sh-lnk" ${E.includeLink ? 'checked' : ''}> Include secure quotation link</label>
      <div class="linkbox"><input class="input" readonly value="${SH.link}" aria-label="Share link"><button class="btn" data-a="shCopy">${I('copy', 'sm')} Copy</button></div>
      <p class="hint err" id="sh-err"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-a="shEmailPrev">${I('eye', 'sm')} Preview email</button><button class="btn primary" data-a="shSendEmail">${I('send', 'sm')} Send email</button></div>
    </div>`;
    const sync = () => { E.subject = $('#sh-sub').value; E.body = $('#sh-body-t').value; E.attach = $('#sh-att').checked; E.includeLink = $('#sh-lnk').checked; };
    ['#sh-sub', '#sh-body-t'].forEach(s => $(s).oninput = sync); ['#sh-att', '#sh-lnk'].forEach(s => $(s).onchange = sync);
    $$('[data-tagin]').forEach(inp => {
      const k = inp.dataset.tagin;
      const commit = () => { const v = inp.value.trim().replace(/[,;]$/, ''); if (v) { E[k].push(v); inp.value = ''; sync(); drawShare(); setTimeout(() => $(`[data-tagin="${k}"]`)?.focus(), 0); } };
      inp.onkeydown = e => { if (['Enter', ',', ';', 'Tab'].includes(e.key) && inp.value.trim()) { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !inp.value && E[k].length) { E[k].pop(); drawShare(); setTimeout(() => $(`[data-tagin="${k}"]`)?.focus(), 0); } };
      inp.onblur = () => { if (inp.value.trim()) commit(); };
    });
  } else if (SH.tab === 'whatsapp') {
    const W = SH.wa; const digits = W.phone.replace(/\D/g, ''); const valid = digits.length === 12 && digits.startsWith('91') || digits.length === 10;
    b.innerHTML = `<div class="grid2" style="align-items:start">
      <div class="stack">
        <div class="field"><label for="wa-ph">Customer WhatsApp number</label><input class="input ${valid ? '' : 'err'}" id="wa-ph" value="${esc(W.phone)}"><span class="hint ${valid ? '' : 'err'}" id="wa-hint">${valid ? `${I('check', 'sm')} Valid Indian mobile number` : 'Enter a 10-digit mobile number with country code, e.g. +91 98220 41567'}</span></div>
        <div class="field"><label for="wa-msg">Message</label><textarea class="textarea" id="wa-msg" style="min-height:220px">${esc(W.msg)}</textarea><span class="hint">Use *asterisks* for bold. <span id="wa-len">${W.msg.length}</span> characters.</span></div>
        <div class="row wrap"><button class="btn sm" data-a="waInsert" data-v="amount">+ Total</button><button class="btn sm" data-a="waInsert" data-v="link">+ Link</button><button class="btn sm" data-a="waInsert" data-v="expiry">+ Expiry</button></div>
      </div>
      <div class="stack"><span class="lbl">Preview</span><div class="wa-prev"><div class="bubble" id="wa-bub"></div></div>
        <div class="send-state" style="background:var(--surface-2);color:var(--ink-2);font-size:12.5px">${I('info', 'sm')} In the full product this opens WhatsApp with the message ready to send from your number. Here it’s simulated.</div>
        <button class="btn wa lg" data-a="shSendWA" ${valid ? '' : 'disabled'} id="wa-go">${I('wa')} Send via WhatsApp</button></div></div>`;
    const bub = () => { $('#wa-bub').innerHTML = esc(W.msg).replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/(https?:\/\/\S+)/g, '<span style="color:#0B6BCB;text-decoration:underline">$1</span>') + `<div style="text-align:right;font-size:10px;color:#6B7386;margin-top:4px">${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} ✓✓</div>`; $('#wa-len').textContent = W.msg.length; };
    bub();
    $('#wa-msg').oninput = e => { W.msg = e.target.value; bub(); };
    $('#wa-ph').oninput = e => { W.phone = e.target.value; const d = W.phone.replace(/\D/g, ''); const ok = (d.length === 12 && d.startsWith('91')) || d.length === 10; e.target.classList.toggle('err', !ok); $('#wa-hint').className = 'hint ' + (ok ? '' : 'err'); $('#wa-hint').innerHTML = ok ? `${I('check', 'sm')} Valid Indian mobile number` : 'Enter a 10-digit mobile number with country code, e.g. +91 98220 41567'; $('#wa-go').disabled = !ok; };
  } else if (SH.tab === 'more') {
    b.innerHTML = `<div class="stack"><div class="linkbox"><input class="input" readonly value="${SH.link}" aria-label="Share link"><button class="btn primary" data-a="shCopy">${I('copy', 'sm')} Copy link</button></div>
      <div class="opt-grid">
        <button class="opt" data-a="shOther" data-k="pdf">${I('download', 'lg')}<b>Download PDF</b><span>Save a copy to attach anywhere</span></button>
        <button class="opt" data-a="shOther" data-k="print">${I('print', 'lg')}<b>Print</b><span>Print the A4 quotation</span></button>
        <button class="opt" data-a="shOther" data-k="sms">${I('sms', 'lg')}<b>SMS</b><span>Text the link and total</span></button>
        <button class="opt" data-a="shOther" data-k="telegram">${I('tg', 'lg')}<b>Telegram</b><span>Share to a chat</span></button>
        <button class="opt" data-a="shOther" data-k="device">${I('share', 'lg')}<b>Device share</b><span>Use your phone’s share sheet</span></button>
        <button class="opt" data-a="shOther" data-k="portal">${I('globe', 'lg')}<b>Open client view</b><span>See what the customer sees</span></button>
      </div></div>`;
  } else {
    const list = q.comms.slice().reverse();
    b.innerHTML = `<table class="tbl"><thead><tr><th>Channel</th><th>Event</th><th>Recipient</th><th>When</th><th>Status</th></tr></thead><tbody>${list.map(x => { const [ic, tone] = tlIcon(x.ch, x.ev); return `<tr><td><span class="row"><span class="ni-ico ${tone}" style="width:26px;height:26px">${I(ic, 'sm')}</span>${{ email: 'Email', whatsapp: 'WhatsApp', portal: 'Portal', sms: 'SMS', telegram: 'Telegram', link: 'Link', system: 'System' }[x.ch]}</span></td><td style="white-space:normal;min-width:180px">${esc(x.ev)}${x.msg ? `<div class="lr-s" style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.msg)}</div>` : ''}</td><td>${esc(x.to || '—')}</td><td>${rel(x.ts)}</td><td>${x.status ? badge(x.status === 'delivered' || x.status === 'shared' ? 'sent' : x.status === 'done' ? 'draft' : x.status, cap(x.status)) : '—'}</td></tr>`; }).join('')}</tbody></table>`;
  }
}
A.shTab = el => { SH.tab = el.dataset.t; SH.done = null; drawShare(); };
A.shTagDel = el => { SH.email[el.dataset.k].splice(+el.dataset.i, 1); drawShare(); };
A.waInsert = el => { const q = SH.q; const v = { amount: `Total: *${money2(q.total)}*`, link: SH.link, expiry: `Valid till ${fdate(q.expiry)}` }[el.dataset.v]; const t = $('#wa-msg'); const p = t.selectionStart ?? t.value.length; SH.wa.msg = t.value.slice(0, p) + (p && t.value[p - 1] !== '\n' ? ' ' : '') + v + t.value.slice(p); drawShare(); };
A.shCopy = () => { const done = () => { toast('Link copied', SH.link); logSend(SH.q, 'link', 'Clipboard', 'Share link copied'); }; try { navigator.clipboard.writeText(SH.link).then(done, done); } catch (e) { done(); } };
A.shEmailPrev = () => {
  const E = SH.email; const q = SH.q;
  SH.done = `<div class="stack"><button class="btn sm ghost" style="align-self:flex-start" data-a="shTab" data-t="email">${I('left', 'sm')} Back to edit</button>
    <div class="mail-card"><div class="mh"><span>From</span><b>${spName(q.sp)} &lt;${SALES.find(s => s.id === q.sp)?.email}&gt;</b><span>To</span><b>${E.to.map(esc).join(', ') || '—'}</b>${E.cc.length ? `<span>Cc</span><b>${E.cc.map(esc).join(', ')}</b>` : ''}<span>Subject</span><b>${esc(E.subject)}</b></div>
    <div style="white-space:pre-wrap;line-height:1.6">${esc(E.body)}</div>
    ${E.includeLink ? `<div style="margin:14px 0"><span class="btn primary sm" style="pointer-events:none">View quotation ${q.no}</span></div>` : ''}
    ${E.attach ? `<div class="attach" style="margin-top:12px"><span class="pdf">PDF</span><b style="font-weight:500">${q.no}.pdf</b></div>` : ''}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" data-a="shSendEmail">${I('send', 'sm')} Send email</button></div></div>`;
  drawShare();
};
function logSend(q, ch, to, msg, ev) {
  const evs = { email: SH.reminder ? 'Reminder email sent' : 'Email sent', whatsapp: SH.reminder ? 'WhatsApp reminder initiated' : 'WhatsApp share initiated', sms: 'SMS share initiated', telegram: 'Telegram share initiated', link: 'Share link copied', device: 'Shared via device', pdf: 'PDF generated', print: 'Quotation printed' };
  q.comms.push({ ch: ['device', 'pdf', 'print'].includes(ch) ? 'system' : ch, ev: ev || evs[ch], ts: Date.now(), to, status: ch === 'email' ? 'delivered' : 'shared', msg });
  if (q.status === 'draft' && ['email', 'whatsapp', 'sms', 'telegram', 'link', 'device'].includes(ch)) { q.status = 'sent'; q.sentAt = Date.now(); const lead = S.leads.find(l => l.qid === q.id); if (lead) { lead.stage = 'sent'; lead.last = Date.now(); } }
  if (q.status === 'expired' && ['email', 'whatsapp'].includes(ch) && SH.reminder === false) { }
}
A.shSendEmail = () => {
  const E = SH.email; const q = SH.q;
  const bad = [...E.to, ...E.cc, ...E.bcc].filter(t => !/^\S+@\S+\.\S+$/.test(t));
  if (!E.to.length || bad.length) { SH.done = null; SH.tab = 'email'; drawShare(); $('#sh-err').textContent = !E.to.length ? 'Add at least one recipient.' : `Fix invalid address: ${bad.join(', ')}`; return; }
  const steps = ['Preparing message', E.attach ? `Attaching ${q.no}.pdf` : 'Adding quotation link', `Sending to ${E.to.length + E.cc.length + E.bcc.length} recipient${E.to.length + E.cc.length + E.bcc.length > 1 ? 's' : ''}`];
  let i = 0;
  const draw = () => { SH.done = `<div class="stack" style="padding:20px 4px"><h3 style="font-size:16px">Sending email</h3><div class="progress-steps">${steps.map((s, j) => j < i ? `<div class="done">${I('check', 'sm')} ${s}</div>` : j === i ? `<div><span class="spin"></span> ${s}</div>` : `<div style="opacity:.5">${I('clock', 'sm')} ${s}</div>`).join('')}</div></div>`; drawShare(); };
  draw();
  const t = setInterval(() => {
    i++;
    if (i < steps.length) return draw();
    clearInterval(t);
    const wasDraft = q.status === 'draft';
    logSend(q, 'email', E.to.join(', '), E.subject);
    SH.done = `<div class="stack" style="padding:10px 4px"><div class="send-state ok">${I('checkc')}<div><b style="font-weight:600">Email send simulated</b><div>No real email left this prototype. In the full product ${esc(E.to.join(', '))} would receive it now.</div></div></div>
      <div class="progress-steps">${steps.map(s => `<div class="done">${I('check', 'sm')} ${s}</div>`).join('')}</div>
      ${wasDraft ? `<p style="font-size:13px">${q.no} moved from Draft to <b>Sent</b>. It now counts toward pending quotations.</p>` : ''}
      <p class="muted" style="font-size:13px">Next: see what ${esc(cust(q.cid).name.split(' ')[0])} sees, and try accepting or rejecting as the customer.</p>
      <div class="row wrap"><button class="btn primary" data-a="shOther" data-k="portal">${I('globe', 'sm')} Open client view</button><button class="btn wa" data-a="shTab" data-t="whatsapp">${I('wa', 'sm')} Also send on WhatsApp</button><button class="btn" data-a="closeModal">Done</button></div></div>`;
    drawShare();
    toast('Email send simulated', `${q.no} to ${E.to[0]}${E.to.length > 1 ? ` +${E.to.length - 1}` : ''}`);
  }, 520);
};
A.shSendWA = () => {
  const W = SH.wa; const q = SH.q;
  SH.done = `<div class="stack" style="padding:30px 4px;align-items:center;text-align:center"><span class="spin" style="width:28px;height:28px;color:#1F8F55"></span><p>Preparing WhatsApp share…</p></div>`; drawShare();
  setTimeout(() => {
    const wasDraft = q.status === 'draft';
    logSend(q, 'whatsapp', W.phone, W.msg.split('\n')[0]);
    SH.done = `<div class="stack" style="padding:10px 4px"><div class="send-state ok">${I('checkc')}<div><b style="font-weight:600">WhatsApp share simulated</b><div>No message was actually sent. In the full product WhatsApp opens with this message for ${esc(W.phone)}.</div></div></div>
      <div class="wa-prev"><div class="bubble">${esc(W.msg).replace(/\*(.+?)\*/g, '<b>$1</b>')}</div></div>
      ${wasDraft ? `<p style="font-size:13px">${q.no} is now marked <b>Sent</b>.</p>` : ''}
      <div class="row wrap"><button class="btn primary" data-a="shOther" data-k="portal">${I('globe', 'sm')} Open client view</button><button class="btn" data-a="shTab" data-t="history">View history</button><button class="btn" data-a="closeModal">Done</button></div></div>`;
    drawShare(); toast('WhatsApp share simulated', `${q.no} for ${W.phone}`);
  }, 900);
};
A.shOther = el => {
  const k = el.dataset.k; const q = SH.q; const c = cust(q.cid);
  if (k === 'portal') { modalCleanup = null; closeModal(); go('#/portal/' + q.id); return; }
  if (k === 'print') { logSend(q, 'print', '', ''); closeModal(); go('#/app/quotations/' + q.id); setTimeout(() => window.print(), 400); return; }
  if (k === 'pdf') { logSend(q, 'pdf', '', ''); modalCleanup = null; closeModal(); A.pdfDemo({ dataset: { id: q.id } }); return; }
  if (k === 'device') {
    if (navigator.share) { navigator.share({ title: q.no, text: `Quotation ${q.no} · ${money(q.total)}`, url: SH.link }).then(() => { logSend(q, 'device', 'Device', ''); toast('Shared'); }).catch(() => { }); }
    else { logSend(q, 'device', 'Device', ''); toast('Device share simulated', 'Your browser has no share sheet here, so nothing was opened'); }
    drawShare(); return;
  }
  logSend(q, k, c.phone, `Quotation ${q.no} · ${money(q.total)} · ${SH.link}`);
  toast(`${k === 'sms' ? 'SMS' : 'Telegram'} share simulated`, `Nothing was sent. Logged in communication history.`);
  drawShare();
};

/* ================= client portal ================= */
function pagePortal(id) {
  const own = S.live && S.quotes.find(x => x.token === id);   // a team member opening the customer's link
  if (own) { go('#/portal/' + own.id); return {}; }
  const q = quote(id); const root = $('#root');
  if (!q) { root.innerHTML = `<div class="empty" style="padding:80px">${I('file')}<h4>Quotation not found</h4><p>The link may be incorrect.</p>${S.live ? `<button class="btn" style="margin-top:12px" data-a="go" data-to="#/app/quotations">Back to QuoteFlow</button>` : ''}</div>`; return {}; }
  const c = cust(q.cid); const s = S.settings; const T = calcQuote(q);
  // record a view once per visit
  if (!UI.portalViewed || UI.portalViewed !== id + ':' + (UI.portalVisit || 0)) {
    UI.portalViewed = id + ':' + (UI.portalVisit || 0);
    if (q.status !== 'draft') {
      q.views = (q.views || 0) + 1; q.viewedAt = q.viewedAt || Date.now();
      q.comms.push({ ch: 'portal', ev: `Customer viewed quotation (view ${q.views})`, ts: Date.now(), to: c.name, status: 'viewed' });
      if (q.status === 'sent') { q.status = 'viewed'; const lead = S.leads.find(l => l.qid === q.id); if (lead) { lead.stage = 'viewed'; lead.last = Date.now(); } S.notifications.unshift({ id: uid('nt'), kind: 'viewed', qid: q.id, text: `${c.name} viewed ${q.no}`, ts: Date.now(), read: false }); }
    }
  }
  document.title = `${q.no} from ${s.bizName}`;
  const open = ['sent', 'viewed'].includes(q.status);
  const dl = daysBetween(iso(TODAY), q.expiry);
  root.innerHTML = `<div class="portal">
    ${S.guest ? '' : `<div class="demo-banner">Client view preview. This is what ${esc(c.name)} sees. <button data-a="go" data-to="#/app/quotations/${q.id}">Back to QuoteFlow</button></div>`}
    <div class="portal-top"><div class="wrap" style="max-width:1180px"><span class="ws-logo" style="background:${s.brand};width:34px;height:34px">${esc(initials(s.bizName))}</span><div><b style="font-family:var(--display)">${esc(s.bizName)}</b><div class="muted" style="font-size:12px">${esc(s.tagline)}</div></div><span class="spacer"></span><span class="row muted hide-sm" style="font-size:12.5px">${I('lock', 'sm')} Secure quotation link</span></div></div>
    <div class="wrap portal-body" style="max-width:1180px">
      <div><div class="doc-scroll" id="portal-doc">${docHTML(q, { hit: UI.portalHit })}</div></div>
      <aside class="portal-card stack">
        <div><span class="muted" style="font-size:12.5px">Quotation ${q.no} for ${esc(c.company)}</span><div class="amt">${money2(T.grand)}</div><span class="muted" style="font-size:12.5px">Including ${s.taxLabel} ${money(T.tax)}${+q.advance ? ` · ${money(T.adv)} advance on acceptance` : ''}</span></div>
        <div class="stack" style="gap:6px;font-size:13px;border-top:1px solid var(--line);padding-top:12px">
          <div class="row between"><span class="muted">Project</span><b style="font-weight:500">${esc(q.project)}</b></div>
          <div class="row between"><span class="muted">Issued</span><span>${fdate(q.date)}</span></div>
          <div class="row between"><span class="muted">Valid until</span><span class="${open && dl <= 3 ? 'overdue-t' : ''}">${fdate(q.expiry)}${open ? ` (${dl} days)` : ''}</span></div>
          <div class="row between"><span class="muted">Contact</span><span>${spName(q.sp)}</span></div>
        </div>
        ${open ? `<button class="btn primary lg" data-a="pAccept">${I('check')} Accept quotation</button>
          <div class="row"><button class="btn" style="flex:1" data-a="pChanges">${I('message', 'sm')} Request changes</button><button class="btn" style="flex:1" data-a="pReject">${I('x', 'sm')} Decline</button></div>`
      : `<div class="send-state ${q.status === 'accepted' ? 'ok' : ''}" style="${q.status === 'rejected' ? 'background:var(--red-soft);color:var(--red)' : q.status !== 'accepted' ? 'background:var(--amber-soft);color:var(--amber)' : ''}">${I(q.status === 'accepted' ? 'checkc' : q.status === 'rejected' ? 'xc' : 'info')}<div>${q.status === 'accepted' ? `<b style="font-weight:600">You accepted this quotation</b><div>${fdate(new Date(q.respondedAt))}. ${esc(s.bizName)} will be in touch about next steps.</div>` : q.status === 'rejected' ? `<b style="font-weight:600">You declined this quotation</b><div>Reason: ${esc(q.reason)}</div>` : q.status === 'expired' ? `<b style="font-weight:600">This quotation has expired</b><div>Request an updated quotation below.</div>` : `<b style="font-weight:600">Not shared yet</b><div>This quotation is still a draft. Send it first to let the customer respond.</div>`}</div></div>
        ${q.status === 'expired' ? `<button class="btn" data-a="pChanges">${I('message', 'sm')} Request an updated quotation</button>` : ''}
        ${q.status === 'draft' ? `<button class="btn primary" data-a="shareQ" data-id="${q.id}">${I('send', 'sm')} Send quotation</button>` : ''}`}
        <button class="btn ghost" data-a="pDownload">${I('download', 'sm')} Download PDF</button>
        ${q.feedback?.length ? `<div style="border-top:1px solid var(--line);padding-top:12px"><span class="lbl">Your change requests</span>${q.feedback.map(f => `<div class="tq" style="margin-top:6px;background:var(--surface-2);border-radius:6px;padding:8px;font-size:12.5px">${esc(f.text)}<div class="lr-s">${rel(f.ts)}</div></div>`).join('')}</div>` : ''}
        <p class="muted" style="font-size:12px">Questions? Call ${esc(s.phone)} or reply to the email you received.</p>
      </aside>
    </div></div>`;
  UI.portalHit = false;
  return {};
}
A.pDownload = () => { toast('PDF download simulated', 'In the full product the quotation PDF downloads here'); };
A.pAccept = () => {
  const q = quote(location.hash.split('/').pop()); const c = cust(q.cid); const T = calcQuote(q);
  openModal(`${mHead('Accept quotation', `${q.no} · ${money2(T.grand)}`)}
  <div class="mb stack">
    <p style="color:var(--ink-2)">By accepting, you confirm the scope, pricing and terms in this quotation from ${esc(S.settings.bizName)}.</p>
    <div class="grid2"><div class="field"><label for="pa-name">Your full name</label><input class="input" id="pa-name" value="${esc(c.name)}"></div><div class="field"><label for="pa-po">PO number (optional)</label><input class="input" id="pa-po" placeholder="e.g. PO-2291"></div></div>
    <div class="field"><label for="pa-sig">Type your name to sign</label><input class="input" id="pa-sig" placeholder="${esc(c.name)}" style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:20px;height:46px" autofocus></div>
    <label class="row" style="font-size:13px;cursor:pointer;align-items:flex-start"><input type="checkbox" id="pa-ok" style="margin-top:3px"> I agree to the terms and conditions${+q.advance ? ` and the ${q.advance}% advance of ${money(T.adv)}` : ''}.</label>
    <p class="hint err" id="pa-err"></p>
  </div><div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="pa-go">${I('check', 'sm')} Accept & sign</button></div>`);
  $('#pa-go').onclick = async () => {
    if (!$('#pa-sig').value.trim()) { $('#pa-err').textContent = 'Type your name to sign.'; $('#pa-sig').classList.add('err'); return; }
    if (!$('#pa-ok').checked) { $('#pa-err').textContent = 'Tick the box to agree to the terms.'; return; }
    if (S.guest) {
      $('#pa-go').disabled = true;
      if (!await guestRespond('accept', { name: $('#pa-sig').value.trim(), message: $('#pa-po').value ? 'PO ' + $('#pa-po').value.trim() : '' })) { $('#pa-go').disabled = false; return; }
      applyStatus(q, 'accepted', '', 'portal'); closeModal(); pagePortal(q.id);
      toast('Quotation accepted', `Thank you. ${S.settings.bizName} has been notified.`); return;
    }
    applyStatus(q, 'accepted', '', 'portal');
    q.comms[q.comms.length - 1].msg = `Signed by ${$('#pa-sig').value.trim()}${$('#pa-po').value ? ' · PO ' + $('#pa-po').value : ''}`;
    closeModal(); UI.portalHit = true; UI.portalVisit = (UI.portalVisit || 0); pagePortal(q.id);
    openModal(`<div class="mb" style="text-align:center;padding:34px 24px"><span class="ni-ico tone-green" style="width:52px;height:52px;border-radius:50%;margin:0 auto 14px">${I('check', 'lg')}</span><h3 style="font-size:20px">Quotation accepted</h3><p class="muted" style="margin-top:6px">Thank you, ${esc(c.name.split(' ')[0])}. ${esc(S.settings.bizName)} has been notified and will share next steps.</p>
      <div class="send-state" style="background:var(--surface-2);margin-top:18px;text-align:left;font-size:12.5px;color:var(--ink-2)">${I('info', 'sm')} Demo: the quotation, customer profile, pipeline and dashboard have all been updated.</div>
      <div class="row" style="justify-content:center;margin-top:18px;flex-wrap:wrap"><button class="btn" data-a="closeModal">Stay on this page</button><button class="btn primary" data-a="go" data-to="#/app/quotations/${q.id}">See it in QuoteFlow</button></div></div>`);
  };
};
A.pReject = () => {
  const q = quote(location.hash.split('/').pop());
  openModal(`${mHead('Decline quotation', 'A short reason helps us improve our offer.')}
  <div class="mb stack"><div class="reason-opts">${REJECT_REASONS.concat(['Other']).map((r, i) => `<label><input type="radio" name="rr" value="${r}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div>
  <div class="field"><label for="rr-note">Anything else? (optional)</label><textarea class="textarea" id="rr-note" style="min-height:70px" placeholder="e.g. Budget is capped at ₹4.5 L for this phase"></textarea></div></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn dark" id="rr-go">Decline quotation</button></div>`);
  $('#rr-go').onclick = async () => {
    const r = $('input[name=rr]:checked').value; const note = $('#rr-note').value.trim();
    if (S.guest) { $('#rr-go').disabled = true; if (!await guestRespond('reject', { reason: note ? `${r}: ${note}` : r })) { $('#rr-go').disabled = false; return; } }
    applyStatus(q, 'rejected', note ? `${r}: ${note}` : r, 'portal');
    closeModal(); UI.portalHit = true; pagePortal(q.id);
    toast('Quotation declined', S.guest ? `${S.settings.bizName} has been notified.` : 'Rejected count and reason updated in analytics');
  };
};
A.pChanges = () => {
  const q = quote(location.hash.split('/').pop()); const c = cust(q.cid);
  openModal(`${mHead('Request changes', `Tell ${esc(S.settings.bizName)} what you’d like adjusted.`)}
  <div class="mb stack"><div class="field"><label for="ch-area">What should change?</label><select class="select" id="ch-area"><option>Pricing</option><option>Scope or items</option><option>Quantities</option><option>Timeline</option><option>Payment terms</option><option>Something else</option></select></div>
  <div class="field"><label for="ch-text">Details</label><textarea class="textarea" id="ch-text" autofocus placeholder="e.g. Could you quote vinyl flooring instead of carpet tiles for the cabins?"></textarea></div></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="ch-go">Send request</button></div>`);
  $('#ch-go').onclick = async () => {
    const t = $('#ch-text').value.trim(); if (!t) { $('#ch-text').classList.add('err'); return; }
    if (S.guest) { $('#ch-go').disabled = true; if (!await guestRespond('changes', { name: c.name, area: $('#ch-area').value, message: t })) { $('#ch-go').disabled = false; return; } }
    const text = `${$('#ch-area').value}: ${t}`;
    q.feedback = q.feedback || []; q.feedback.push({ text, ts: Date.now(), by: c.name });
    q.comms.push({ ch: 'portal', ev: 'Customer requested changes', ts: Date.now(), to: c.name, status: 'pending', msg: text });
    const lead = S.leads.find(l => l.qid === q.id); if (lead) { lead.stage = 'negotiation'; lead.last = Date.now(); }
    S.followups.push({ id: uid('f'), cid: c.id, qid: q.id, type: 'Call', due: iso(TODAY), sp: q.sp, status: 'pending', note: `Revise ${q.no}: ${text}`, created: Date.now() });
    S.notifications.unshift({ id: uid('nt'), kind: 'changes', qid: q.id, text: `${c.name} requested changes on ${q.no}`, ts: Date.now(), read: false });
    closeModal(); pagePortal(q.id);
    toast('Change request sent', S.guest ? `${S.settings.bizName} will get back to you.` : 'Added to the quotation history and today’s follow-ups');
  };
};

/* ================= item column manager ================= */
let CW = null; // working copy while the dialog is open
const COL_KIND = { number: 'Number', text: 'Text', unit: 'List', tax: 'Tax rate' };
function cwInit() { CW = { cols: workspaceCols(), flatTax: S.settings.itemFlatTax ?? +S.settings.defaultTax, nt: 'text', nm: false, drafts: false }; }
function cwApplyTo(q) {
  const removed = qCols(q).filter(c => c.custom && !CW.cols.some(x => x.key === c.key)).map(c => c.key);
  q.items.forEach(it => { if (it.cf) removed.forEach(k => delete it.cf[k]); });
  q.cols = JSON.parse(JSON.stringify(CW.cols)); q.flatTax = CW.flatTax;
}
A.cwSave = () => {
  if (!CW) return;
  const bad = CW.cols.find(c => !c.label.trim()); if (bad) { toast('Every column needs a name', '', 'err'); return; }
  CW.cols.forEach(c => c.label = c.label.trim());
  S.settings.itemCols = JSON.parse(JSON.stringify(CW.cols)); S.settings.itemFlatTax = CW.flatTax;
  let n = 0;
  if (CW.drafts) S.quotes.forEach(q => { if (q.status === 'draft') { cwApplyTo(q); n++; } });
  if (BQ && BQ.isNew) cwApplyTo(BQ);
  flashSaved();
  toast('Item columns saved', CW.drafts ? `Used for new quotations and ${n} draft${n === 1 ? '' : 's'}` : 'Used for every new quotation');
};
A.cwReset = () => { CW.cols = defaultCols(); CW.flatTax = +S.settings.defaultTax; drawCols(); toast('Columns reset to the standard layout', 'Click Save columns to keep this'); };
function drawCols() {
  const b = $('#cw-body'); if (!b) return;
  const L = CW.cols, mid = L.filter(c => !['name', 'amount'].includes(c.key));
  const row = c => {
    const i = L.indexOf(c), fixed = c.key === 'name' || c.key === 'amount';
    const mi = mid.indexOf(c);
    return `<div class="cw-row${c.on ? '' : ' off'}">
      <div class="cw-move">${fixed ? `<span class="cw-pin" title="Always ${c.key === 'name' ? 'first' : 'last'}">${I('lock', 'sm')}</span>` : `<button class="btn sm ghost icon" data-a="cwMove" data-i="${i}" data-d="-1" ${mi === 0 ? 'disabled' : ''} aria-label="Move up">${I('up', 'sm')}</button><button class="btn sm ghost icon" data-a="cwMove" data-i="${i}" data-d="1" ${mi === mid.length - 1 ? 'disabled' : ''} aria-label="Move down">${I('down', 'sm')}</button>`}</div>
      <input class="input" value="${esc(c.label)}" data-in="cwLabel" data-i="${i}" aria-label="Column name" maxlength="28">
      <span class="cw-kind">${c.custom ? 'Custom' : 'Built-in'} · ${COL_KIND[c.type] || 'Text'}</span>
      <div class="cw-acts">
        ${c.custom && c.type === 'number' ? `<label class="cw-mult" title="Multiply this value into the line amount, like quantity"><input type="checkbox" data-ch="cwMult" data-i="${i}" ${c.mult ? 'checked' : ''}> × amount</label>` : '<span></span>'}
        ${c.lock ? `<span class="cw-req">Required</span>` : `<button class="toggle ${c.on ? 'on' : ''}" data-a="cwToggle" data-i="${i}" role="switch" aria-checked="${c.on}" aria-label="Show ${esc(c.label)}"></button>`}
        ${c.custom ? `<button class="btn sm ghost icon danger" data-a="cwDel" data-i="${i}" aria-label="Delete ${esc(c.label)}">${I('trash', 'sm')}</button>` : '<span></span>'}
      </div></div>
      ${c.key === 'tax' && !c.on ? `<div class="cw-note">${I('info', 'sm')} Tax per line is off. Apply one rate to every item: <select class="select" data-ch="cwFlat" style="width:auto;height:30px">${TAXES.map(t => `<option value="${t}" ${CW.flatTax === t ? 'selected' : ''}>${t === 0 ? 'No tax' : t + '%'}</option>`).join('')}</select></div>` : ''}
      ${c.key === 'qty' && !c.on ? `<div class="cw-note">${I('info', 'sm')} Quantity is off, so every line counts as 1 × rate.</div>` : ''}`;
  };
  b.innerHTML = `<div class="cw-list">${L.map(row).join('')}</div>
    <div class="cw-add">
      <b>Add your own column</b>
      <div class="cw-add-row">
        <input class="input" id="cw-nn" placeholder="e.g. Brand, Colour, Hours, Warranty" maxlength="28" aria-label="New column name">
        <select class="select" id="cw-nt" aria-label="Column type"><option value="text" ${CW.nt === 'text' ? 'selected' : ''}>Text</option><option value="number" ${CW.nt === 'number' ? 'selected' : ''}>Number</option></select>
        <button class="btn" data-a="cwAdd">${I('plus', 'sm')} Add column</button>
      </div>
      <label class="cw-mult" id="cw-nm-wrap" style="${CW.nt === 'number' ? '' : 'display:none'}"><input type="checkbox" id="cw-nm" ${CW.nm ? 'checked' : ''}> Multiply into the line amount (e.g. Hours × Rate, or Days × Qty × Rate)</label>
      <p class="hint">${esc(colLabel(L, 'name'))}, ${esc(colLabel(L, 'price'))} and ${esc(colLabel(L, 'amount'))} drive the totals, so they can be renamed but not removed. Everything else can be hidden, reordered or deleted.</p>
    </div>`;
  $('#cw-nt').onchange = e => { CW.nt = e.target.value; $('#cw-nm-wrap').style.display = CW.nt === 'number' ? '' : 'none'; };
  $('#cw-nm').onchange = e => CW.nm = e.target.checked;
  $('#cw-nn').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); A.cwAdd(); } };
}
IN.cwLabel = el => { CW.cols[+el.dataset.i].label = el.value; };
IN.cwMult = el => { CW.cols[+el.dataset.i].mult = el.checked; drawCols(); };
IN.cwFlat = el => { CW.flatTax = +el.value; };
A.cwToggle = el => { const c = CW.cols[+el.dataset.i]; c.on = !c.on; drawCols(); };
A.cwMove = el => {
  const i = +el.dataset.i, d = +el.dataset.d, L = CW.cols; let j = i + d;
  while (L[j] && ['name', 'amount'].includes(L[j].key)) j += d;
  if (!L[j]) return; [L[i], L[j]] = [L[j], L[i]]; drawCols();
};
A.cwDel = el => { const i = +el.dataset.i; const c = CW.cols[i]; CW.cols.splice(i, 1); drawCols(); toast(`“${c.label}” removed`, 'Click Save columns to keep this'); };
A.cwAdd = () => {
  const inp = $('#cw-nn'); const nm = inp.value.trim();
  if (!nm) { inp.focus(); toast('Give the column a name', '', 'err'); return; }
  if (CW.cols.some(c => c.label.toLowerCase() === nm.toLowerCase())) { toast('A column with that name already exists', '', 'err'); return; }
  const at = CW.cols.findIndex(c => c.key === 'amount');
  CW.cols.splice(at, 0, { key: 'c_' + uid('').slice(-6), label: nm, type: CW.nt, custom: true, on: true, mult: CW.nt === 'number' && CW.nm });
  CW.nm = false; drawCols(); setTimeout(() => $('#cw-nn')?.focus(), 20);
};

/* ---------- builder: customer PO, shipping address, TDS and round-off ---------- */
IN.bPoHas = el => { BQ.po = BQ.po || { has: false, no: '', date: '', ref: '' }; BQ.po.has = el.checked; bUpdate(true); };
IN.bPo = el => { BQ.po = BQ.po || { has: true, no: '', date: '', ref: '' }; BQ.po[el.dataset.f] = el.value; bUpdate(); };
IN.bShipSame = el => {
  BQ.shipSame = el.checked;
  if (!el.checked && !BQ.shipTo) { const c = cust(BQ.cid); BQ.shipTo = c ? { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin } : { name: '', address: '', city: '', state: S.settings.state, pin: '', gstin: '' }; }
  bUpdate(true);
};
IN.bShip = el => { BQ.shipTo = BQ.shipTo || {}; BQ.shipTo[el.dataset.f] = el.value; bUpdate(); };
IN.bTds = el => { BQ.tds = BQ.tds || { on: false, rate: 2 }; BQ.tds.on = el.checked; bUpdate(true); };
IN.bTdsRate = el => { BQ.tds = BQ.tds || { on: true, rate: 2 }; BQ.tds.rate = +el.value || 0; bUpdate(true); };
IN.bRound = el => { BQ.roundOff = el.checked; bUpdate(true); };
