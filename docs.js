/* ================= sales documents: invoices, payments, receipts, challans, credit & debit notes ================= */

const amtWords = n => `Rupees ${numberToWordsIN(Math.round(n))} Only`;
const payOf = id => S.payments.filter(p => p.invId === id).sort((a, b) => a.date < b.date ? -1 : 1);
const invoice = id => S.invoices.find(i => i.id === id);
const challan = id => S.challans.find(d => d.id === id);
const order = id => S.orders.find(o => o.id === id);
const invBal = i => Math.max(0, Math.round((i.amount - i.paid) * 100) / 100);
const cnOf = id => S.cnotes.filter(n => n.invId === id);
const dnOf = id => S.dnotes.filter(n => n.invId === id);
const invDue = i => daysBetween(iso(TODAY), i.due);
function invStatus(i) {
  if (['draft', 'void'].includes(i.status)) return i.status;
  if (i.paid >= i.amount - 0.5) return 'paid';
  if (i.due < iso(TODAY)) return 'overdue';
  return i.paid > 0 ? 'partially-paid' : 'sent';
}
/* a payment and its receipt without the dialog, for "mark as paid": an invoice's paid amount is always the sum of its payments */
function quickPayment(i, amount, notes) {
  const pay = { id: uid('pay'), no: 'PAY-' + String(S.payments.length + 1).padStart(4, '0'), invId: i.id, cid: i.cid, amount, date: iso(TODAY), method: 'Other', ref: '', cheque: '', bank: '', notes, by: ME.name, ts: Date.now() };
  const rc = { id: uid('rc'), no: nextNo('rcpt'), payId: pay.id, invId: i.id, cid: i.cid, amount, date: pay.date, method: 'Other', ref: '' };
  pay.rcpt = rc.no; S.payments.push(pay); S.receipts.push(rc);
  logAudit('invoice', i.id, `Payment ${money(amount)} recorded`, `${notes} · receipt ${rc.no}`);
  return rc;
}
function syncInvoice(i) { i.paid = payOf(i.id).reduce((s, p) => s + p.amount, 0); if (!['draft', 'void'].includes(i.status)) i.status = invStatus(i); }
const shipOf = doc => { const c = cust(doc.cid); return doc.shipSame === false && doc.shipTo ? doc.shipTo : (c.shipSame === false && c.shipTo ? c.shipTo : { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin }); };
const dueFrom = (date, code, days) => iso(addDays(parse(date), code === 'custom' ? (+days || 0) : termDays(code)));

/* ---------- address + bank blocks shared by the documents ---------- */
function addrBlock(title, a, extra = '') {
  return `<div><small class="muted">${title}</small>
    <div><b style="font-weight:600">${esc(a.name || a.company || '')}</b></div>
    <div class="lr-s">${esc(a.address || '')}${a.city ? `<br>${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''}${a.pin ? ' - ' + esc(a.pin) : ''}` : ''}${a.gstin ? `<br>GSTIN ${esc(a.gstin)}` : ''}${extra}</div></div>`;
}
function bankBlock() {
  const b = S.settings.bank;
  return `<div class="pay-details"><small class="muted">Payment details</small>
    <div class="pd-grid">
      <span>Account name</span><b>${esc(b.accName)}</b>
      <span>Bank</span><b>${esc(b.bankName)}</b>
      <span>A/C no.</span><b>${esc(b.acc.length > 4 ? 'XXXXXXXX' + b.acc.slice(-4) : b.acc)}</b>
      <span>IFSC</span><b>${esc(b.ifsc)}</b>
      <span>Branch</span><b>${esc(b.branch)}</b>
      ${b.upi ? `<span>UPI</span><b>${esc(b.upi)}</b>` : ''}
    </div>${b.qr ? `<div class="qr" title="UPI QR (demo)">${qrSvg()}<small>Scan to pay</small></div>` : ''}</div>`;
}
function qrSvg() {
  let r = 7; const rnd2 = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
  let cells = '';
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const on = finder ? (x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5) || (x > 15 && x < 19 && y > 1 && y < 5) || (x > 1 && x < 5 && y > 15 && y < 19)) : rnd2() > .55;
    if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="0 0 21 21" width="74" height="74" aria-label="UPI QR code (demo)">${cells}</svg>`;
}

/* ---------- the invoice document ---------- */
function invoiceDoc(i, forPrint = false) {
  const c = cust(i.cid), q = quote(i.qid), o = order(i.oid), dc = S.challans.find(d => d.id === i.dcid) || S.challans.find(d => d.oid === i.oid);
  if (q && (q.template || S.settings.template) === 'tally') return tallyDoc(q, { inv: i });
  const s = S.settings, T = q ? calcQuote(q) : null;
  const bal = invBal(i), st = invStatus(i);
  const ship = shipOf(q || i);
  const cols = q ? qCols(q) : null;
  const rows = T ? T.lines.filter(l => l.type !== 'section') : [];
  const advAmt = i.advance ? Math.round((i.amount * i.advance / 100) * 100) / 100 : 0;
  return `<div class="inv-paper ${forPrint ? 'print-target' : ''}" style="--doc-accent:${s.brand}">
    <div class="ip-head">
      <div class="row" style="gap:12px;align-items:flex-start">
        <div class="d-logo-sm" style="background:${s.brand}">${s.logo ? `<img src="${s.logo}" alt="">` : esc(initials(s.bizName))}</div>
        <div><b class="ip-biz">${esc(s.bizName)}</b>
          <div class="lr-s">${esc(s.legal)}<br>${esc(s.address)}, ${esc(s.city)}<br>${esc(s.phone)} · ${esc(s.email)} · ${esc(s.website)}<br>GSTIN ${esc(s.gstin)}</div></div>
      </div>
      <div class="ip-title"><h2>Tax invoice</h2>${badge(st, INV_LABEL[st] || cap(st))}</div>
    </div>
    <div class="ip-meta">
      ${[['Invoice no.', i.no], ['Invoice date', fdate(i.date)], ['Due date', fdate(i.due)], ['Payment terms', termLabel(i.termsCode, i.termsDays)],
         ...(i.po && i.po.has ? [['Customer PO', i.po.no], ['PO date', i.po.date ? fdate(i.po.date) : '—']] : []),
         ...(o ? [['Sales order', o.no]] : []), ...(q ? [['Quotation', q.no]] : []),
         ...(dc ? [['Delivery challan', dc.no]] : []),
         ...(i.jobNo ? [['Job number', i.jobNo]] : []), ...(q && q.project ? [['Project', q.project]] : [])]
        .map(([k, v]) => `<div><span>${k}</span><b>${esc(String(v))}</b></div>`).join('')}
    </div>
    <div class="ip-parties">
      ${addrBlock('Bill to', { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin }, `<br>${esc(c.name)} · ${esc(c.phone)}`)}
      ${addrBlock('Ship to', ship)}
    </div>
    ${T ? `<div class="ip-scroll"><table class="ip-items"><thead><tr><th>#</th><th>Item &amp; description</th><th>HSN/SAC</th><th class="r">Qty</th><th>Unit</th><th class="r">Rate</th><th class="r">Disc.</th><th class="r">Taxable</th><th class="r">${T.interState ? 'IGST' : 'GST'}</th><th class="r">Amount</th></tr></thead><tbody>
      ${rows.map((l, n) => `<tr><td>${n + 1}</td><td><b>${esc(l.name || 'Item')}</b>${l.desc ? `<small>${esc(l.desc)}</small>` : ''}</td>
        <td>${esc(l.hsn || prod(l.pid)?.hsn || '—')}</td><td class="r">${numF(l.qty)}</td><td>${esc(l.unit || '')}</td>
        <td class="r">${money2(l.price)}</td><td class="r">${l.disc ? l.disc + '%' : '—'}</td><td class="r">${money2(l.net)}</td>
        <td class="r">${l.tax}%<small>${money2(l.taxAmt)}</small></td><td class="r">${money2(l.net + l.taxAmt)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="ip-foot">
      <div class="ip-left">
        <div class="ip-words"><small class="muted">Amount in words</small><b>${esc(amtWords(i.amount))}</b></div>
        ${s.showBank ? bankBlock() : ''}
        <div class="ip-terms"><small class="muted">Terms &amp; conditions</small><p>${esc(q ? q.terms : s.terms).replace(/\n/g, '<br>')}</p>
          ${q && q.notes ? `<small class="muted">Notes</small><p>${esc(q.notes)}</p>` : ''}</div>
      </div>
      <div class="ip-right">
        <div class="ip-tot">
          <span>Subtotal</span><b>${money2(T.sub)}</b>
          ${T.idisc ? `<span>Item discount</span><b>−${money2(T.idisc)}</b>` : ''}
          ${T.od ? `<span>Overall discount</span><b>−${money2(T.od)}</b>` : ''}
          ${T.ship ? `<span>Shipping</span><b>${money2(T.ship)}</b>` : ''}
          ${T.extra ? `<span>${esc(q.extraLabel || 'Additional charges')}</span><b>${money2(T.extra)}</b>` : ''}
          <span class="sep">Taxable value</span><b class="sep">${money2(T.taxable)}</b>
          ${T.interState ? `<span>IGST</span><b>${money2(T.igst)}</b>`
            : `<span>CGST</span><b>${money2(T.cgst)}</b><span>SGST</span><b>${money2(T.sgst)}</b>`}
          ${T.cess ? `<span>Cess (${T.cessRate}%)</span><b>${money2(T.cess)}</b>` : ''}
          ${T.roundDiff ? `<span>Round off</span><b>${T.roundDiff > 0 ? '+' : '−'}${money2(Math.abs(T.roundDiff))}</b>` : ''}
          <span class="g">Grand total</span><b class="g">${money2(i.amount)}</b>
          ${T.tdsAmt ? `<span>TDS (${q.tds.rate}%)</span><b>−${money2(T.tdsAmt)}</b><span>Net receivable</span><b>${money2(i.amount - T.tdsAmt)}</b>` : ''}
          ${i.advance ? `<span>Advance required (${i.advance}%)</span><b>${money2(advAmt)}</b>` : ''}
          <span>Amount paid</span><b class="ok">${money2(i.paid)}</b>
          <span class="g">Balance due</span><b class="g ${bal > 0 ? 'due' : 'ok'}">${money2(bal)}</b>
        </div>
      </div>
    </div>
    <div class="ip-sign"><div class="lr-s">${esc(s.footer)}</div>
      <div class="sig"><div class="stamp-circle">${esc(initials(s.bizName))}<small>${esc(s.city.split(',')[0])}</small></div>
        <div><span class="sig-line">${esc(spName(q ? q.sp : '') || ME.name)}</span><small>Authorised signatory, ${esc(s.bizName)}</small></div></div></div>
    <div class="ip-tag">${esc(i.no)} · ${esc(c.company)} · computer generated document (demo)</div>
  </div>` : '<div class="empty" style="padding:30px">Linked quotation not found</div>'}`;
}
const INV_LABEL = { draft: 'Draft', sent: 'Sent', paid: 'Paid', 'partially-paid': 'Partially paid', overdue: 'Overdue', void: 'Void' };

/* ---------- document relationship strip ---------- */
function relStrip(ctx) {
  const q = ctx.q, o = ctx.o, dc = ctx.dc, i = ctx.i, c = ctx.c;
  const pays = i ? payOf(i.id) : [];
  const item = (label, value, action) => `<div class="rel"><small>${label}</small>${value ? (action ? `<a ${action} style="cursor:pointer">${esc(value)}</a>` : `<b>${esc(value)}</b>`) : '<span class="muted">—</span>'}</div>`;
  return `<div class="rel-strip">
    ${item('Customer', c ? c.company : '', `data-a="go" data-to="#/app/customers/${c ? c.id : ''}"`)}
    ${item('Quotation', q ? q.no : '', q ? `data-a="go" data-to="#/app/quotations/${q.id}"` : '')}
    ${item('Customer PO', q && q.po && q.po.has ? q.po.no : (i && i.po && i.po.has ? i.po.no : ''), '')}
    ${item('Sales order', o ? o.no : '', o ? `data-a="ordView" data-id="${o.id}"` : '')}
    ${item('Delivery challan', dc ? dc.no : '', dc ? `data-a="dcView" data-id="${dc.id}"` : '')}
    ${item('Invoice', i ? i.no : '', i ? `data-a="go" data-to="#/app/invoices/${i.id}"` : '')}
    <div class="rel"><small>Payments</small>${pays.length ? pays.map(p => `<a data-a="rcptView" data-id="${p.id}" style="cursor:pointer">${esc(p.rcpt || p.no)}</a>`).join(' ') : '<span class="muted">—</span>'}</div>
  </div>`;
}

/* ---------- invoice detail page ---------- */
function pageInvoice(id) {
  const i = invoice(id);
  if (!i) return { html: `<div class="empty">${I('receipt')}<h4>Invoice not found</h4><button class="btn" data-a="go" data-to="#/app/invoices">Back to invoices</button></div>`, title: 'Invoice' };
  syncInvoice(i);
  const c = cust(i.cid), q = quote(i.qid), o = order(i.oid), dc = S.challans.find(d => d.id === i.dcid) || S.challans.find(d => d.oid === i.oid);
  const bal = invBal(i), st = invStatus(i), dl = invDue(i), pays = payOf(i.id);
  const html = `
  <div class="crumbs"><a data-a="go" data-to="#/app/invoices">Invoices</a> ${I('right', 'sm')} <span>${esc(i.no)}</span></div>
  <div class="ph"><div class="row wrap" style="gap:10px"><h1 style="margin:0">${esc(i.no)}</h1>${badge(st, INV_LABEL[st])}
      ${bal > 0 && st !== 'draft' ? `<span class="lr-s ${dl < 0 ? 'overdue-t' : ''}">${dl < 0 ? `Overdue by ${-dl} day${dl === -1 ? '' : 's'}` : dl === 0 ? 'Due today' : `Due in ${dl} days`}</span>` : ''}</div>
    <div class="row wrap">
      ${bal > 0 ? `<button class="btn primary" data-a="invPay" data-id="${i.id}">${I('rupee', 'sm')} Record payment</button>` : ''}
      ${i.status === 'draft' ? `<button class="btn" data-a="invSend" data-id="${i.id}">${I('send', 'sm')} Mark as sent</button>`
        : bal > 0 ? `<button class="btn" data-a="invRemind" data-id="${i.id}">${I('bell', 'sm')} Send reminder</button>` : ''}
      <button class="btn wa" data-a="invWa" data-id="${i.id}">${I('wa', 'sm')} WhatsApp</button>
      <button class="btn" data-a="invPdf" data-id="${i.id}">${I('download', 'sm')} PDF</button>
      <button class="btn" data-a="invPrint" data-id="${i.id}">${I('printer', 'sm')} Print</button>
      <button class="btn icon" data-a="invMenu2" data-id="${i.id}" aria-label="More">${I('more')}</button>
    </div></div>
  ${relStrip({ q, o, dc, i, c })}
  <div class="doc-layout">
    <div>${invoiceDoc(i)}</div>
    <div class="stack">
      <div class="panel"><div class="panel-h"><h3>Payment summary</h3></div><div class="panel-b">
        <div class="pay-sum"><span>Invoice total</span><b>${money2(i.amount)}</b>
          ${i.advance ? `<span>Advance required (${i.advance}%)</span><b>${money2(Math.round(i.amount * i.advance) / 100)}</b>` : ''}
          <span>Amount paid</span><b class="ok">${money2(i.paid)}</b>
          <span class="g">Balance due</span><b class="g">${money2(bal)}</b></div>
        <div class="hbar" style="margin:10px 0 4px"><i style="width:${pct(i.paid, i.amount)}%"></i></div>
        <div class="lr-s">${pct(i.paid, i.amount)}% collected · ${termLabel(i.termsCode, i.termsDays)} · due ${fdate(i.due)}
          <button class="btn sm ghost" data-a="invDue" data-id="${i.id}">${I('edit', 'sm')} Change</button></div>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Attachments <span class="muted">(${i.attachments ? i.attachments.length : 0})</span></h3><span class="spacer"></span><button class="btn sm" data-a="invAttach" data-id="${i.id}">${I('plus', 'sm')} Add</button></div>
        <div class="panel-b">${(i.attachments || []).length ? (i.attachments || []).map(a => `<div class="attach-row"><div class="row" style="gap:8px;min-width:0">${I('file', 'sm')}<div style="min-width:0"><b class="ell">${esc(a.name)}</b><small class="muted">${esc(a.kind)} · ${esc(a.size)}</small></div></div>
          <div class="row"><button class="btn sm ghost" data-a="attView" data-name="${esc(a.name)}">View</button><button class="btn sm ghost icon danger" data-a="attDel" data-id="${i.id}" data-aid="${a.id}" aria-label="Remove">${I('trash', 'sm')}</button></div></div>`).join('')
          : '<p class="muted" style="font-size:13px;margin:0">Customer PO, signed quotation, delivery challan or inspection reports can be attached here.</p>'}</div></div>
      <div class="panel"><div class="panel-h"><h3>Activity</h3></div><div class="panel-b">${auditHTML('invoice', i.id)}</div></div>
    </div>
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Payment history</h3><span class="spacer"></span>${bal > 0 ? `<button class="btn sm" data-a="invPay" data-id="${i.id}">${I('plus', 'sm')} Record payment</button>` : ''}</div>
        <div class="panel-b" style="padding:0">${pays.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Payment date</th><th class="r">Amount</th><th>Method</th><th>Reference</th><th>Bank</th><th>Recorded by</th><th class="r">Receipt</th></tr></thead><tbody>
          ${pays.map(p => `<tr><td>${fdate(p.date)}</td><td class="r num"><b style="font-weight:600">${money(p.amount)}</b></td>
            <td>${esc(p.method)}</td><td class="mono">${esc(p.ref || p.cheque || '—')}</td><td class="lr-s">${esc(p.bank || '—')}</td><td>${esc(p.by)}</td>
            <td class="r"><button class="btn sm ghost" data-a="rcptView" data-id="${p.id}">${esc(p.rcpt || 'Receipt')}</button></td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty" style="padding:22px">${I('rupee')}<h4>No payments yet</h4><p>Record one when the customer pays.</p></div>`}</div></div>
`;
  return { html, title: i.no, keepScroll: false };
}
function auditHTML(type, id) {
  const list = auditOf(type, id);
  if (!list.length) return '<p class="muted" style="font-size:13px;margin:0">No activity recorded yet.</p>';
  return `<div class="timeline">${list.slice().reverse().map(a => `<div class="tl"><span class="tl-i tone-slate">${I('clock', 'sm')}</span>
    <div><b>${esc(a.action)}</b>${a.detail ? `<small class="blk">${esc(a.detail)}</small>` : ''}<small class="muted">${ftime(a.ts)} · ${esc(a.by)}</small></div></div>`).join('')}</div>`;
}

/* ---------- payments ---------- */
A.invPay = el => {
  closeFloating(); const i = invoice(el.dataset.id); const bal = invBal(i);
  const adv = i.advance ? Math.round(i.amount * i.advance) / 100 : 0;
  openModal(`${mHead('Record payment', `${esc(i.no)} · ${esc(cust(i.cid).company)} · balance ${money(bal)}`)}
  <div class="mb stack">
    ${adv > 0 && i.paid < adv ? `<div class="note-info">${I('info', 'sm')} Advance of ${money(adv)} (${i.advance}%) is due on this invoice.</div>` : ''}
    <div class="grid2">
      <div class="field"><label for="ip-a">Payment amount</label><input class="input" type="number" min="1" max="${bal}" id="ip-a" value="${Math.round(bal)}" autofocus></div>
      <div class="field"><label for="ip-d">Payment date</label><input class="input" type="date" id="ip-d" value="${iso(TODAY)}" max="${iso(TODAY)}"></div>
      <div class="field"><label for="ip-m">Payment method</label><select class="select" id="ip-m" data-ch="payMethod">${PAY_METHODS.map(m => `<option ${m === 'NEFT' ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="field" id="ip-ref-w"><label for="ip-r">Transaction / UTR number</label><input class="input" id="ip-r" placeholder="e.g. HDFC123456789"></div>
      <div class="field" id="ip-chq-w" style="display:none"><label for="ip-chq">Cheque number</label><input class="input" id="ip-chq" placeholder="e.g. 456123"></div>
      <div class="field" id="ip-bank-w"><label for="ip-bank">Bank name</label><input class="input" id="ip-bank" placeholder="e.g. HDFC Bank"></div>
    </div>
    <div class="field"><label for="ip-n">Notes</label><input class="input" id="ip-n" placeholder="Optional reference for your team"></div>
    <div class="field"><label>Attachment</label><label class="attach-drop" for="ip-file">${I('upload', 'sm')} <span id="ip-fname">Attach payment advice or receipt</span><input type="file" id="ip-file" hidden data-ch="payFile"></label></div>
    <p class="hint">Recording a payment updates the invoice status and the dashboard. No money moves in this demo.</p><p class="hint err" id="ip-err"></p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="ip-ok">${I('check', 'sm')} Record payment</button></div>`, 'wide');
  $('#ip-ok').onclick = () => {
    const a = +$('#ip-a').value;
    if (!(a > 0) || a > bal + 0.5) { $('#ip-err').textContent = `Enter an amount between 1 and ${money(bal)}.`; return; }
    const method = $('#ip-m').value;
    const pay = { id: uid('pay'), no: 'PAY-' + String(S.payments.length + 1).padStart(4, '0'), invId: i.id, cid: i.cid,
      amount: a, date: $('#ip-d').value || iso(TODAY), method, ref: $('#ip-r').value.trim(), cheque: $('#ip-chq').value.trim(),
      bank: $('#ip-bank').value.trim(), notes: $('#ip-n').value.trim(), file: PAY_FILE, by: ME.name, ts: Date.now() };
    const rc = { id: uid('rc'), no: nextNo('rcpt'), payId: pay.id, invId: i.id, cid: i.cid, amount: a, date: pay.date, method, ref: pay.ref || pay.cheque };
    pay.rcpt = rc.no;
    S.payments.push(pay); S.receipts.push(rc);
    syncInvoice(i);
    logAudit('invoice', i.id, `Payment ${money(a)} recorded`, `${method}${pay.ref ? ' · ' + pay.ref : ''} · receipt ${rc.no}`);
    logAudit('invoice', i.id, `Status changed to ${INV_LABEL[invStatus(i)]}`, '');
    PAY_FILE = '';
    closeModal();
    toast('Payment recorded', `${money(a)} against ${i.no} · receipt ${rc.no}`);
    A.rcptView({ dataset: { id: pay.id } });
    rerender();
  };
};
let PAY_FILE = '';
IN.payMethod = el => {
  const chq = el.value === 'Cheque';
  $('#ip-chq-w').style.display = chq ? '' : 'none';
  $('#ip-ref-w').style.display = chq ? 'none' : '';
  $('#ip-bank-w').style.display = ['Cash', 'UPI', 'Card', 'Other'].includes(el.value) ? 'none' : '';
};
IN.payFile = el => { PAY_FILE = (el.files && el.files[0] ? el.files[0].name : ''); $('#ip-fname').textContent = PAY_FILE || 'Attach payment advice or receipt'; };

A.rcptView = el => {
  closeFloating();
  const pay = S.payments.find(p => p.id === el.dataset.id) || S.payments.find(p => p.rcpt === el.dataset.no);
  const rc = S.receipts.find(r => r.payId === pay.id); const i = invoice(pay.invId); const c = cust(pay.cid); const s = S.settings;
  openModal(`${mHead(`Payment receipt ${rc.no}`, `${esc(c.company)} · ${money(pay.amount)}`)}
  <div class="mb"><div class="rcpt print-target" style="--doc-accent:${s.brand}">
    <div class="row between" style="align-items:flex-start">
      <div><b style="font-family:var(--display);font-size:16px">${esc(s.bizName)}</b><div class="lr-s">${esc(s.address)}, ${esc(s.city)}<br>GSTIN ${esc(s.gstin)}</div></div>
      <div style="text-align:right"><div class="rcpt-t">Payment receipt</div><b>${esc(rc.no)}</b></div></div>
    <div class="rcpt-grid">
      <span>Receipt number</span><b>${esc(rc.no)}</b>
      <span>Payment date</span><b>${fdate(pay.date)}</b>
      <span>Customer</span><b>${esc(c.company)}</b>
      <span>Invoice</span><b>${esc(i.no)}</b>
      <span>Payment method</span><b>${esc(pay.method)}</b>
      <span>${pay.method === 'Cheque' ? 'Cheque number' : 'Transaction / UTR'}</span><b>${esc(pay.ref || pay.cheque || '—')}</b>
      ${pay.bank ? `<span>Bank</span><b>${esc(pay.bank)}</b>` : ''}
      ${pay.notes ? `<span>Notes</span><b>${esc(pay.notes)}</b>` : ''}
    </div>
    <div class="rcpt-amt"><span>Amount received</span><b>${money2(pay.amount)}</b></div>
    <div class="lr-s">${esc(amtWords(pay.amount))}</div>
    <div class="rcpt-bal lr-s">Invoice total ${money(i.amount)} · paid ${money(i.paid)} · balance ${money(invBal(i))}</div>
    <div class="row between" style="margin-top:16px;align-items:flex-end"><small class="muted">Received with thanks, subject to realisation.</small>
      <div style="text-align:right"><span class="sig-line">${esc(s.bizName)}</span><small>Authorised signatory</small></div></div>
  </div></div>
  <div class="mf"><button class="btn" data-a="rcptPdf" data-no="${esc(rc.no)}">${I('download', 'sm')} PDF</button>
    <button class="btn" data-a="printDoc">${I('printer', 'sm')} Print</button>
    <button class="btn" data-a="rcptSend" data-ch="email" data-id="${pay.id}">${I('mail', 'sm')} Email</button>
    <button class="btn wa" data-a="rcptSend" data-ch="whatsapp" data-id="${pay.id}">${I('wa', 'sm')} WhatsApp</button>
    <button class="btn primary" data-a="closeModal">Done</button></div>`, 'wide');
};
A.rcptPdf = el => toast('Receipt PDF prepared (simulation)', `${el.dataset.no}.pdf would download in the full product`, 'warn');
A.rcptSend = el => {
  const pay = S.payments.find(p => p.id === el.dataset.id); const c = cust(pay.cid);
  toast(el.dataset.ch === 'email' ? 'Receipt email simulated' : 'WhatsApp share simulated',
    `${pay.rcpt} for ${money(pay.amount)} would go to ${el.dataset.ch === 'email' ? c.email : c.phone}. Nothing was actually sent.`, 'warn');
};
A.printDoc = () => { window.print(); };
A.invPrint = el => { const i = invoice(el.dataset.id); if (location.hash !== `#/app/invoices/${i.id}`) { go(`#/app/invoices/${i.id}`); setTimeout(() => window.print(), 400); } else window.print(); };

/* ---------- due date, attachments, reminders ---------- */
A.invDue = el => {
  closeFloating(); const i = invoice(el.dataset.id);
  openModal(`${mHead('Payment terms & due date', esc(i.no))}
  <div class="mb stack"><div class="grid2">
    <div class="field"><label for="id-date">Invoice date</label><input class="input" type="date" id="id-date" value="${i.date}"></div>
    <div class="field"><label for="id-t">Payment terms</label><select class="select" id="id-t" data-ch="invTerms">${PAY_TERMS.map(t => `<option value="${t[0]}" ${t[0] === i.termsCode ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></div>
    <div class="field" id="id-c-w" style="${i.termsCode === 'custom' ? '' : 'display:none'}"><label for="id-c">Custom days</label><input class="input" type="number" min="0" id="id-c" value="${i.termsDays || 0}"></div>
    <div class="field"><label for="id-due">Due date</label><input class="input" type="date" id="id-due" value="${i.due}"></div>
  </div><p class="hint">Invoice date + payment terms sets the due date. You can still adjust it by hand.</p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="id-ok">Save</button></div>`);
  const recalc = () => { const code = $('#id-t').value; $('#id-c-w').style.display = code === 'custom' ? '' : 'none'; $('#id-due').value = dueFrom($('#id-date').value || i.date, code, +$('#id-c').value); };
  IN.invTerms = recalc; $('#id-date').onchange = recalc; $('#id-c').oninput = recalc;
  $('#id-ok').onclick = () => {
    i.date = $('#id-date').value || i.date; i.termsCode = $('#id-t').value; i.termsDays = +$('#id-c').value || termDays(i.termsCode);
    i.due = $('#id-due').value || dueFrom(i.date, i.termsCode, i.termsDays);
    syncInvoice(i); logAudit('invoice', i.id, 'Due date changed', `${termLabel(i.termsCode, i.termsDays)} · ${fdate(i.due)}`);
    closeModal(); toast('Payment terms updated', `${i.no} now due ${fdate(i.due)}`); rerender();
  };
};
A.invAttach = el => {
  const i = invoice(el.dataset.id);
  openModal(`${mHead('Add attachment', esc(i.no))}<div class="mb stack">
    <div class="field"><label for="ia-k">Document type</label><select class="select" id="ia-k">${['Customer PO', 'Work order', 'Delivery challan', 'Inspection report', 'Signed quotation', 'Supporting document'].map(k => `<option>${k}</option>`).join('')}</select></div>
    <label class="attach-drop" for="ia-f">${I('upload', 'sm')} <span id="ia-n">Choose a file</span><input type="file" id="ia-f" hidden></label>
    <p class="hint">Files are listed in this demo only; nothing is uploaded.</p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="ia-ok">Attach</button></div>`);
  $('#ia-f').onchange = e => { $('#ia-n').textContent = e.target.files[0] ? e.target.files[0].name : 'Choose a file'; };
  $('#ia-ok').onclick = () => {
    const f = $('#ia-f').files[0];
    const name = f ? f.name : `${$('#ia-k').value.replace(/\s+/g, '-').toLowerCase()}-${i.no}.pdf`;
    i.attachments = i.attachments || [];
    i.attachments.push({ id: uid('at'), name, kind: $('#ia-k').value, size: f ? Math.max(1, Math.round(f.size / 1024)) + ' KB' : '—' });
    logAudit('invoice', i.id, 'Attachment added', name);
    closeModal(); toast('Attachment added', name); rerender();
  };
};
A.attView = el => toast('Preview simulated', `${el.dataset.name} would open in the full product`, 'warn');
A.attDel = el => { const i = invoice(el.dataset.id); const a = i.attachments.find(x => x.id === el.dataset.aid); i.attachments = i.attachments.filter(x => x.id !== el.dataset.aid); logAudit('invoice', i.id, 'Attachment removed', a.name); toast('Attachment removed', a.name); rerender(); };

A.invRemind = el => {
  closeFloating(); const i = invoice(el.dataset.id); const c = cust(i.cid); const dl = invDue(i); const bal = invBal(i);
  const msg = `Dear ${c.name.split(' ')[0]},\n\nThis is a gentle reminder that invoice ${i.no} dated ${fdate(i.date)} for ${money(i.amount)} has a balance of ${money(bal)}${dl < 0 ? `, which became due on ${fdate(i.due)} (${-dl} days ago)` : `, due on ${fdate(i.due)}`}.\n\nPayment details are on the invoice. Please share the UTR once processed so we can update our records.\n\nThank you,\n${S.settings.bizName}`;
  openModal(`${mHead('Send payment reminder', `${esc(i.no)} · balance ${money(bal)}${dl < 0 ? ` · overdue by ${-dl} days` : ''}`)}
  <div class="mb stack">
    <div class="field"><label>Channel</label><div class="segmented" id="rm-ch">${[['email', 'Email'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS']].map((x, k) => `<button class="${k === 0 ? 'on' : ''}" data-a="rmCh" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>
    <div class="field"><label for="rm-to">To</label><input class="input" id="rm-to" value="${esc(c.email)}"></div>
    <div class="field"><label for="rm-s">Subject</label><input class="input" id="rm-s" value="Payment reminder: ${esc(i.no)} from ${esc(S.settings.bizName)}"></div>
    <div class="field"><label for="rm-m">Message</label><textarea class="input" id="rm-m" rows="9">${esc(msg)}</textarea></div>
    <p class="hint">Editable before sending. This prototype simulates the send and logs it against the invoice.</p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="rm-ok">${I('send', 'sm')} Send reminder</button></div>`, 'wide');
  let ch = 'email';
  A.rmCh = b => { ch = b.dataset.v; $$('#rm-ch button').forEach(x => x.classList.toggle('on', x === b));
    $('#rm-to').value = ch === 'email' ? c.email : c.phone; $('#rm-s').closest('.field').style.display = ch === 'email' ? '' : 'none'; };
  $('#rm-ok').onclick = () => {
    const to = $('#rm-to').value, subject = $('#rm-s').value, msg = $('#rm-m').value;
    closeModal();
    A.invRemindSend(i, ch, to, subject, msg);
    rerender();
  };
};
A.invMenu2 = el => {
  const i = invoice(el.dataset.id);
  rowMenu(el, [['invDue', 'calendar', 'Change payment terms', { id: i.id }],
    ['invAttach', 'upload', 'Add attachment', { id: i.id }],
    ['cnNew', 'swap', 'Create credit note', { id: i.id }],
    ['dnNew', 'plus', 'Create debit note', { id: i.id }],
    ...(invBal(i) > 0 && i.status !== 'draft' ? [['invPaid', 'checkc', 'Mark fully paid', { id: i.id }]] : []),
    ...(i.status !== 'void' ? [['invVoid', 'x', 'Void invoice', { id: i.id }]] : [])]);
};
A.invVoid = el => { closeFloating(); const i = invoice(el.dataset.id);
  confirmBox('Void this invoice?', `${i.no} stays in the records with a Void status and is left out of outstanding totals.`, 'Void invoice', () => {
    i.status = 'void'; logAudit('invoice', i.id, 'Invoice voided', ''); toast(`${i.no} voided`); rerender(); }); };

/* ---------- sales order detail ---------- */
A.ordView = el => {
  closeFloating(); const o = order(el.dataset.id); const q = quote(o.qid); const c = cust(o.cid); const T = q ? calcQuote(q) : null;
  const dc = S.challans.find(d => d.oid === o.id); const inv = S.invoices.find(i => i.oid === o.id);
  openModal(`${mHead(`Sales order ${o.no}`, `${esc(c.company)} · ${badge(o.status, cap(o.status))}`)}
  <div class="mb stack">
    ${relStrip({ q, o, dc, i: inv, c })}
    <div class="inv-doc" style="--doc-accent:${S.settings.brand}">
      <div class="row between" style="align-items:flex-start"><div><b style="font-family:var(--display);font-size:16px">${esc(S.settings.bizName)}</b><div class="lr-s">${esc(S.settings.address)}, ${esc(S.settings.city)}<br>GSTIN ${esc(S.settings.gstin)}</div></div>
        <div class="inv-t">Sales order</div></div>
      <div class="ip-meta" style="margin:14px 0">
        ${[['SO number', o.no], ['Order date', fdate(o.date)], ['Quotation', q ? q.no : '—'],
           ['Customer PO', o.po && o.po.has ? o.po.no : '—'], ['PO date', o.po && o.po.has && o.po.date ? fdate(o.po.date) : '—'],
           ['Customer reference', o.po && o.po.ref ? o.po.ref : '—'], ['Project / job no.', o.jobNo || (q ? q.project : '—')],
           ['Payment terms', termLabel(o.termsCode || 'net15')], ['Delivery date', o.delivery ? fdate(o.delivery) : '—'], ['Salesperson', spName(o.sp || (q ? q.sp : ''))]]
          .map(([k, v]) => `<div><span>${k}</span><b>${esc(String(v))}</b></div>`).join('')}
      </div>
      <div class="ip-parties">${addrBlock('Bill to', { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin })}${addrBlock('Ship to', shipOf(q || o))}</div>
      ${T ? `<table class="tbl" style="margin-top:12px"><thead><tr><th>Item</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
        ${T.lines.filter(l => l.type !== 'section').map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.hsn || prod(l.pid)?.hsn || '—')}</td><td class="r">${numF(l.qty)} ${esc(l.unit || '')}</td><td class="r num">${money2(l.price)}</td><td class="r num">${money2(l.net)}</td></tr>`).join('')}
      </tbody></table>
      <div class="inv-tot"><span>Taxable value</span><b>${money2(T.taxable)}</b><span>${T.interState ? 'IGST' : 'CGST + SGST'}</span><b>${money2(T.tax)}</b><span class="g">Order value</span><b class="g">${money2(o.amount)}</b></div>` : ''}
      ${o.notes ? `<p class="lr-s" style="margin-top:10px">${esc(o.notes)}</p>` : ''}
    </div>
    <div class="grid2">
      <div class="field"><label for="so-st">Order status</label><select class="select" id="so-st" data-ch="ordStatus" data-id="${o.id}">${['confirmed', 'processing', 'completed', 'cancelled'].map(x => `<option value="${x}" ${o.status === x ? 'selected' : ''}>${cap(x)}</option>`).join('')}</select></div>
      <div class="field"><label for="so-dl">Delivery date</label><input class="input" type="date" id="so-dl" value="${o.delivery || ''}" data-ch="ordDelivery" data-id="${o.id}"></div>
    </div>
  </div>
  <div class="mf"><button class="btn" style="margin-right:auto" data-a="poEdit" data-kind="order" data-id="${o.id}">${I('file', 'sm')} ${o.po && o.po.has ? 'Edit' : 'Add'} customer PO</button>
    ${dc ? `<button class="btn" data-a="dcView" data-id="${dc.id}">${I('truck', 'sm')} ${esc(dc.no)}</button>` : `<button class="btn" data-a="dcNew" data-oid="${o.id}">${I('truck', 'sm')} Delivery challan</button>`}
    ${inv ? `<button class="btn primary" data-a="go" data-to="#/app/invoices/${inv.id}">${I('receipt', 'sm')} ${esc(inv.no)}</button>` : `<button class="btn primary" data-a="ordInvoice" data-id="${o.id}">${I('receipt', 'sm')} Create invoice</button>`}</div>`, 'wide');
};
IN.ordDelivery = el => { const o = order(el.dataset.id); o.delivery = el.value; logAudit('order', o.id, 'Delivery date updated', fdate(el.value)); toast('Delivery date updated'); };

/* ---------- customer PO capture ---------- */
A.poEdit = el => {
  closeFloating();
  const kind = el.dataset.kind, id = el.dataset.id;
  const doc = kind === 'order' ? order(id) : kind === 'invoice' ? invoice(id) : quote(id);
  const po = doc.po || { has: false, no: '', date: '', ref: '' };
  openModal(`${mHead('Customer PO', 'A purchase order is the customer’s own reference. It never replaces your invoice number.')}
  <div class="mb stack">
    <label class="row" style="gap:8px;cursor:pointer;font-size:13.5px"><input type="checkbox" id="po-has" ${po.has ? 'checked' : ''} data-ch="poHas"> Customer has a PO</label>
    <div id="po-fields" style="${po.has ? '' : 'display:none'}"><div class="grid2">
      <div class="field"><label for="po-no">PO number</label><input class="input" id="po-no" value="${esc(po.no)}" placeholder="PO-4587"></div>
      <div class="field"><label for="po-dt">PO date</label><input class="input" type="date" id="po-dt" value="${po.date || ''}"></div>
      <div class="field"><label for="po-ref">Customer reference</label><input class="input" id="po-ref" value="${esc(po.ref || '')}" placeholder="Contact or department"></div>
      <div class="field"><label for="po-job">Project / job number</label><input class="input" id="po-job" value="${esc(doc.jobNo || '')}" placeholder="JOB-2026-041"></div>
    </div></div>
    <p class="hint">Shown on the sales order, delivery challan and invoice, and carried into documents created from this one.</p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="po-ok">Save</button></div>`);
  IN.poHas = e => { $('#po-fields').style.display = e.checked ? '' : 'none'; };
  $('#po-ok').onclick = () => {
    const has = $('#po-has').checked;
    doc.po = { has, no: $('#po-no').value.trim(), date: $('#po-dt').value, ref: $('#po-ref').value.trim() };
    doc.jobNo = $('#po-job').value.trim();
    // carry it along the chain
    const q = kind === 'quote' ? doc : quote(doc.qid);
    if (q) { [order(S.orders.find(o => o.qid === q.id)?.id), S.invoices.find(i => i.qid === q.id)].forEach(d => { if (d) { d.po = doc.po; d.jobNo = doc.jobNo; } }); if (kind !== 'quote') { q.po = doc.po; q.jobNo = doc.jobNo; } }
    logAudit(kind, id, has ? 'Customer PO recorded' : 'Customer PO removed', has ? `${doc.po.no}${doc.po.date ? ' · ' + fdate(doc.po.date) : ''}` : '');
    closeModal(); toast(has ? 'Customer PO saved' : 'Customer PO cleared', has ? doc.po.no : ''); rerender();
  };
};

/* ---------- delivery challans ---------- */
QS.dc = { status: 'all', q: '', page: 1, per: 10 };
function dcRows() {
  const st = QS.dc;
  return S.challans.filter(d => (st.status === 'all' || d.status === st.status) &&
    (!st.q || (d.no + ' ' + cust(d.cid).company + ' ' + (order(d.oid)?.no || '')).toLowerCase().includes(st.q.toLowerCase())))
    .sort((a, b) => a.date < b.date ? 1 : -1);
}
function dcTable() {
  const st = QS.dc; const rows = dcRows();
  const counts = { all: S.challans.length }; S.challans.forEach(d => counts[d.status] = (counts[d.status] || 0) + 1);
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / st.per)); if (st.page > pages) st.page = pages;
  const view = rows.slice((st.page - 1) * st.per, st.page * st.per);
  return `<div class="row wrap" style="padding:12px 12px 0">${statusFilterChips('dc', counts, [['all', 'All'], ...DC_STATUS])}</div>
  <div class="toolbar"><div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Challan, order or customer" value="${esc(st.q)}" data-in="setQS" data-key="dc" data-f="q" aria-label="Search challans"></div>
    <span class="spacer"></span><button class="btn" data-a="dcNew">${I('plus', 'sm')} New delivery challan</button></div>
  ${view.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Challan</th><th>Customer</th><th>Sales order</th><th>Customer PO</th><th>Dispatch</th><th>Transporter</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>
    ${view.map(d => { const c = cust(d.cid); const o = order(d.oid); return `<tr class="click" data-a="dcView" data-id="${d.id}">
      <td class="qn">${esc(d.no)}</td><td class="cell-2"><b>${esc(c.company)}</b><span>${esc(c.city)}</span></td>
      <td>${o ? esc(o.no) : '—'}</td><td>${o && o.po && o.po.has ? esc(o.po.no) : '—'}</td>
      <td>${d.dispatch ? fdate(d.dispatch) : '<span class="muted">Not dispatched</span>'}</td>
      <td class="lr-s">${esc(d.transporter)}<br>${esc(d.vehicle)}</td>
      <td>${badge(d.status, cap(d.status))}</td>
      <td class="r" data-stop><div class="row" style="justify-content:flex-end;gap:2px"><button class="btn sm ghost" data-a="dcView" data-id="${d.id}">Open</button>
        <button class="btn sm ghost icon" data-a="dcMenu" data-id="${d.id}" aria-label="More">${I('more')}</button></div></td></tr>`; }).join('')}
  </tbody></table></div>${pager('dc', total, st.per)}` : `<div class="empty">${I('truck')}<h4>No delivery challans match</h4><p>Create one from a sales order when material is dispatched.</p></div>`}`;
}
A.dcMenu = el => { const d = challan(el.dataset.id); rowMenu(el, [['dcView', 'eye', 'Open challan', { id: d.id }],
  ...(d.status === 'draft' ? [['dcStatus', 'truck', 'Mark dispatched', { id: d.id, v: 'dispatched' }]] : []),
  ...(d.status === 'dispatched' ? [['dcStatus', 'checkc', 'Mark delivered', { id: d.id, v: 'delivered' }]] : []),
  ['dcPdf', 'download', 'Download PDF', { id: d.id }],
  ...(d.status !== 'cancelled' ? [['dcStatus', 'x', 'Cancel challan', { id: d.id, v: 'cancelled' }]] : [])]); };
A.dcStatus = el => { closeFloating(); const d = challan(el.dataset.id); d.status = el.dataset.v;
  if (d.status === 'dispatched' && !d.dispatch) d.dispatch = iso(TODAY);
  logAudit('challan', d.id, `Marked ${d.status}`, ''); toast(`${d.no} marked ${d.status}`); closeModal(true); rerender(); };
A.dcPdf = el => { closeFloating(); toast('PDF prepared (simulation)', `${challan(el.dataset.id).no}.pdf would download in the full product`, 'warn'); };
A.dcNew = el => {
  const oid = el.dataset.oid;
  const opts = S.orders.filter(o => o.status !== 'cancelled' && !S.challans.some(d => d.oid === o.id)).slice(0, 60);
  const chosen = oid ? order(oid) : opts[0];
  if (!chosen) { toast('Every sales order already has a challan', '', 'warn'); return; }
  closeModal(true);
  openModal(`${mHead('New delivery challan', 'Dispatch details for material going to site.')}
  <div class="mb stack"><div class="grid2">
    <div class="field"><label for="dn-o">Sales order</label><select class="select" id="dn-o">${(oid ? [chosen] : opts).map(o => `<option value="${o.id}" ${o.id === chosen.id ? 'selected' : ''}>${o.no} · ${esc(cust(o.cid).company)}</option>`).join('')}</select></div>
    <div class="field"><label for="dn-d">Dispatch date</label><input class="input" type="date" id="dn-d" value="${iso(TODAY)}"></div>
    <div class="field"><label for="dn-t">Transporter</label><input class="input" id="dn-t" list="dn-tl" value="Own vehicle"><datalist id="dn-tl">${TRANSPORTERS.map(t => `<option>${t}</option>`).join('')}</datalist></div>
    <div class="field"><label for="dn-v">Vehicle number</label><input class="input" id="dn-v" placeholder="MH 04 GH 2291"></div>
    <div class="field"><label for="dn-r">Received by</label><input class="input" id="dn-r" placeholder="Site contact"></div>
    <div class="field"><label for="dn-s">Status</label><select class="select" id="dn-s">${DC_STATUS.map(x => `<option value="${x[0]}" ${x[0] === 'dispatched' ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
  </div><div class="field"><label for="dn-n">Notes</label><input class="input" id="dn-n" placeholder="Handling or site instructions"></div>
  <p class="hint">Items, quantities and the delivery address come from the sales order.</p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="dn-ok">${I('truck', 'sm')} Create challan</button></div>`, 'wide');
  $('#dn-ok').onclick = () => {
    const o = order($('#dn-o').value);
    const d = { id: uid('dc'), no: nextNo('dc'), oid: o.id, qid: o.qid, cid: o.cid, date: iso(TODAY), dispatch: $('#dn-d').value,
      transporter: $('#dn-t').value.trim(), vehicle: $('#dn-v').value.trim(), receivedBy: $('#dn-r').value.trim(),
      notes: $('#dn-n').value.trim(), status: $('#dn-s').value };
    S.challans.unshift(d);
    logAudit('challan', d.id, 'Delivery challan created', `For ${o.no}`);
    closeModal(); toast('Delivery challan created', `${d.no} for ${o.no}`);
    QS.inv.tab = 'challans'; go('#/app/invoices'); rerender();
    setTimeout(() => A.dcView({ dataset: { id: d.id } }), 100);
  };
};
A.dcView = el => {
  closeFloating(); const d = challan(el.dataset.id); const o = order(d.oid); const q = quote(d.qid); const c = cust(d.cid);
  const T = q ? calcQuote(q) : null; const inv = S.invoices.find(i => i.oid === d.oid);
  openModal(`${mHead(`Delivery challan ${d.no}`, `${esc(c.company)} · ${badge(d.status, cap(d.status))}`)}
  <div class="mb stack">${relStrip({ q, o, dc: d, i: inv, c })}
    <div class="inv-doc print-target" style="--doc-accent:${S.settings.brand}">
      <div class="row between" style="align-items:flex-start"><div><b style="font-family:var(--display);font-size:16px">${esc(S.settings.bizName)}</b><div class="lr-s">${esc(S.settings.address)}, ${esc(S.settings.city)}<br>GSTIN ${esc(S.settings.gstin)}</div></div>
        <div class="inv-t">Delivery challan</div></div>
      <div class="ip-meta" style="margin:14px 0">
        ${[['DC number', d.no], ['Date', fdate(d.date)], ['Sales order', o ? o.no : '—'], ['Customer PO', o && o.po && o.po.has ? o.po.no : '—'],
           ['Dispatch date', d.dispatch ? fdate(d.dispatch) : '—'], ['Transporter', d.transporter || '—'], ['Vehicle', d.vehicle || '—'],
           ['Job number', (o && o.jobNo) || '—']].map(([k, v]) => `<div><span>${k}</span><b>${esc(String(v))}</b></div>`).join('')}
      </div>
      <div class="ip-parties">${addrBlock('Delivery address', shipOf(q || d))}${addrBlock('Billed to', { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin })}</div>
      ${T ? `<table class="tbl" style="margin-top:12px"><thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th class="r">Qty</th><th>Unit</th></tr></thead><tbody>
        ${T.lines.filter(l => l.type !== 'section').map((l, n) => `<tr><td>${n + 1}</td><td>${esc(l.name)}${l.desc ? `<div class="lr-s">${esc(l.desc)}</div>` : ''}</td><td>${esc(l.hsn || prod(l.pid)?.hsn || '—')}</td><td class="r">${numF(l.qty)}</td><td>${esc(l.unit || '')}</td></tr>`).join('')}
      </tbody></table>` : ''}
      ${d.notes ? `<p class="lr-s" style="margin-top:10px">${esc(d.notes)}</p>` : ''}
      <div class="row between" style="margin-top:18px;align-items:flex-end">
        <div><span class="sig-line">${esc(d.receivedBy || '')}</span><small>Received by (customer)</small></div>
        <div style="text-align:right"><span class="sig-line">${esc(S.settings.bizName)}</span><small>Authorised signatory</small></div></div>
      <div class="ip-tag">Goods delivered against the above sales order. This is not a tax invoice.</div>
    </div>
    <div class="grid2">
      <div class="field"><label for="dv-st">Status</label><select class="select" id="dv-st" data-ch="dcSetStatus" data-id="${d.id}">${DC_STATUS.map(x => `<option value="${x[0]}" ${d.status === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
      <div class="field"><label for="dv-r">Received by</label><input class="input" id="dv-r" value="${esc(d.receivedBy || '')}" data-ch="dcReceived" data-id="${d.id}" placeholder="Site contact"></div>
    </div></div>
  <div class="mf"><button class="btn" data-a="dcPdf" data-id="${d.id}">${I('download', 'sm')} PDF</button><button class="btn" data-a="printDoc">${I('printer', 'sm')} Print</button>
    <button class="btn" data-a="dcShare" data-id="${d.id}">${I('share', 'sm')} Share</button>
    ${inv ? `<button class="btn primary" data-a="go" data-to="#/app/invoices/${inv.id}">${I('receipt', 'sm')} ${esc(inv.no)}</button>` : o ? `<button class="btn primary" data-a="ordInvoice" data-id="${o.id}">${I('receipt', 'sm')} Create invoice</button>` : ''}</div>`, 'wide');
};
IN.dcSetStatus = el => { const d = challan(el.dataset.id); d.status = el.value; if (d.status === 'dispatched' && !d.dispatch) d.dispatch = iso(TODAY); logAudit('challan', d.id, `Marked ${d.status}`, ''); toast(`${d.no} marked ${d.status}`); };
IN.dcReceived = el => { const d = challan(el.dataset.id); d.receivedBy = el.value; };
A.dcShare = el => { const d = challan(el.dataset.id); toast('Share simulated', `${d.no} would be shared with ${cust(d.cid).name}. Nothing was actually sent.`, 'warn'); };

/* ---------- credit & debit notes ---------- */
QS.note = { kind: 'cn', q: '' };
function notesTable(kind) {
  const list = (kind === 'cn' ? S.cnotes : S.dnotes).filter(n => !QS.note.q || (n.no + ' ' + cust(n.cid).company).toLowerCase().includes(QS.note.q.toLowerCase()));
  return `<div class="toolbar"><div class="searchbox">${I('search')}<input type="search" class="input" placeholder="Note, invoice or customer" value="${esc(QS.note.q)}" data-in="setQS" data-key="note" data-f="q" aria-label="Search notes"></div>
    <span class="spacer"></span><button class="btn" data-a="${kind === 'cn' ? 'cnNew' : 'dnNew'}">${I('plus', 'sm')} New ${kind === 'cn' ? 'credit' : 'debit'} note</button></div>
  ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${kind === 'cn' ? 'Credit note' : 'Debit note'}</th><th>Customer</th><th>Against invoice</th><th>Date</th><th>Reason</th><th class="r">Taxable</th><th class="r">Tax</th><th class="r">Total</th></tr></thead><tbody>
    ${list.map(n => { const inv = invoice(n.invId); return `<tr class="click" data-a="noteView" data-id="${n.id}" data-kind="${kind}">
      <td class="qn">${esc(n.no)}</td><td class="cell-2"><b>${esc(cust(n.cid).company)}</b></td>
      <td>${inv ? `<a data-stop data-a="go" data-to="#/app/invoices/${inv.id}" style="cursor:pointer">${esc(inv.no)}</a>` : '—'}</td>
      <td>${fdate(n.date)}</td><td class="lr-s">${esc(n.reason)}</td>
      <td class="r num">${money(n.taxable)}</td><td class="r num">${money(n.tax)}</td><td class="r num"><b style="font-weight:600">${money(n.total)}</b></td></tr>`; }).join('')}
  </tbody></table></div>` : `<div class="empty">${I('swap')}<h4>No ${kind === 'cn' ? 'credit' : 'debit'} notes yet</h4><p>${kind === 'cn' ? 'Raise one against an invoice for returns, cancellations or billing corrections.' : 'Raise one when additional amounts need to be billed against an invoice.'}</p></div>`}`;
}
function noteForm(kind, invId) {
  const inv = invId ? invoice(invId) : S.invoices[0];
  const list = S.invoices.filter(i => i.status !== 'draft').slice(0, 80);
  const isCn = kind === 'cn';
  openModal(`${mHead(`New ${isCn ? 'credit' : 'debit'} note`, `${isCn ? 'Credits' : 'Debits'} the customer against an existing invoice. The original invoice number stays unchanged.`)}
  <div class="mb stack"><div class="grid2">
    <div class="field"><label for="nt-i">Original invoice</label><select class="select" id="nt-i">${list.map(i => `<option value="${i.id}" ${inv && i.id === inv.id ? 'selected' : ''}>${i.no} · ${esc(cust(i.cid).company)} · ${money(i.amount)}</option>`).join('')}</select></div>
    <div class="field"><label for="nt-d">Date</label><input class="input" type="date" id="nt-d" value="${iso(TODAY)}"></div>
    <div class="field"><label for="nt-r">Reason</label>${isCn ? `<select class="select" id="nt-r">${CN_REASONS.map(r => `<option>${r}</option>`).join('')}</select>` : `<input class="input" id="nt-r" value="Additional billing" placeholder="Reason">`}</div>
    <div class="field"><label for="nt-q">Quantity / items affected</label><input class="input" id="nt-q" placeholder="e.g. 2 chairs returned"></div>
    <div class="field"><label for="nt-a">Taxable amount</label><input class="input" type="number" min="0" id="nt-a" value="0" data-in="noteCalc"></div>
    <div class="field"><label for="nt-t">Tax rate</label><select class="select" id="nt-t" data-ch="noteCalc">${TAXES.map(t => `<option value="${t}" ${t === 18 ? 'selected' : ''}>${t}%</option>`).join('')}</select></div>
  </div>
  <div class="field"><label for="nt-n">Notes</label><input class="input" id="nt-n" placeholder="Optional"></div>
  <div class="note-total"><span>Tax</span><b id="nt-tax">₹0.00</b><span class="g">Note total</span><b class="g" id="nt-tot">₹0.00</b></div>
  <p class="hint err" id="nt-err"></p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="nt-ok">Create ${isCn ? 'credit' : 'debit'} note</button></div>`, 'wide');
  IN.noteCalc = () => { const a = +$('#nt-a').value || 0, r = +$('#nt-t').value || 0;
    $('#nt-tax').textContent = money2(a * r / 100); $('#nt-tot').textContent = money2(a + a * r / 100); };
  $('#nt-ok').onclick = () => {
    const a = +$('#nt-a').value || 0, r = +$('#nt-t').value || 0;
    const i = invoice($('#nt-i').value);
    if (!(a > 0)) { $('#nt-err').textContent = 'Enter the taxable amount.'; return; }
    if (isCn && a + a * r / 100 > i.amount + 0.5) { $('#nt-err').textContent = `A credit note cannot exceed the invoice value (${money(i.amount)}).`; return; }
    const n = { id: uid(isCn ? 'cn' : 'dn'), no: nextNo(isCn ? 'cn' : 'dn'), invId: i.id, cid: i.cid, date: $('#nt-d').value || iso(TODAY),
      reason: $('#nt-r').value, qty: $('#nt-q').value.trim(), taxable: a, rate: r, tax: Math.round(a * r) / 100,
      total: Math.round((a + a * r / 100) * 100) / 100, notes: $('#nt-n').value.trim(), by: ME.name };
    (isCn ? S.cnotes : S.dnotes).unshift(n);
    logAudit('invoice', i.id, `${isCn ? 'Credit' : 'Debit'} note ${n.no} raised`, `${n.reason} · ${money(n.total)}`);
    closeModal(); toast(`${isCn ? 'Credit' : 'Debit'} note created`, `${n.no} against ${i.no} · ${money(n.total)}`);
    QS.inv.tab = isCn ? 'cnotes' : 'dnotes'; go('#/app/invoices'); rerender();
  };
}
A.cnNew = el => { closeFloating(); closeModal(true); noteForm('cn', el && el.dataset ? el.dataset.id : null); };
A.dnNew = el => { closeFloating(); closeModal(true); noteForm('dn', el && el.dataset ? el.dataset.id : null); };
A.noteView = el => {
  const kind = el.dataset.kind; const n = (kind === 'cn' ? S.cnotes : S.dnotes).find(x => x.id === el.dataset.id);
  const inv = invoice(n.invId); const c = cust(n.cid); const isCn = kind === 'cn';
  openModal(`${mHead(`${isCn ? 'Credit' : 'Debit'} note ${n.no}`, `${esc(c.company)} · against ${esc(inv ? inv.no : '—')}`)}
  <div class="mb"><div class="inv-doc print-target" style="--doc-accent:${S.settings.brand}">
    <div class="row between" style="align-items:flex-start"><div><b style="font-family:var(--display);font-size:16px">${esc(S.settings.bizName)}</b><div class="lr-s">${esc(S.settings.address)}, ${esc(S.settings.city)}<br>GSTIN ${esc(S.settings.gstin)}</div></div>
      <div class="inv-t">${isCn ? 'Credit note' : 'Debit note'}</div></div>
    <div class="ip-meta" style="margin:14px 0">${[['Number', n.no], ['Date', fdate(n.date)], ['Original invoice', inv ? inv.no : '—'],
      ['Invoice date', inv ? fdate(inv.date) : '—'], ['Reason', n.reason], ['Items', n.qty || '—']]
      .map(([k, v]) => `<div><span>${k}</span><b>${esc(String(v))}</b></div>`).join('')}</div>
    <div class="ip-parties">${addrBlock('Customer', { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin })}<div></div></div>
    <div class="inv-tot"><span>Taxable value</span><b>${money2(n.taxable)}</b><span>GST (${n.rate}%)</span><b>${money2(n.tax)}</b><span class="g">${isCn ? 'Credit' : 'Debit'} total</span><b class="g">${money2(n.total)}</b></div>
    <div class="lr-s" style="margin-top:8px">${esc(amtWords(n.total))}</div>
    ${n.notes ? `<p class="lr-s">${esc(n.notes)}</p>` : ''}
    <div class="row between" style="margin-top:16px;align-items:flex-end"><small class="muted">${isCn ? 'Issued against the referenced invoice.' : 'Additional amount billed against the referenced invoice.'}</small>
      <div style="text-align:right"><span class="sig-line">${esc(S.settings.bizName)}</span><small>Authorised signatory</small></div></div>
  </div></div>
  <div class="mf">${inv ? `<button class="btn" style="margin-right:auto" data-a="go" data-to="#/app/invoices/${inv.id}">${I('receipt', 'sm')} Open ${esc(inv.no)}</button>` : ''}
    <button class="btn" data-a="notePdf" data-no="${esc(n.no)}">${I('download', 'sm')} PDF</button>
    <button class="btn" data-a="printDoc">${I('printer', 'sm')} Print</button><button class="btn primary" data-a="closeModal">Done</button></div>`, 'wide');
};

/* ---------- customer statement ---------- */
function statementRows(cid) {
  const rows = [];
  S.invoices.filter(i => i.cid === cid && i.status !== 'draft' && i.status !== 'void').forEach(i => rows.push({ date: i.date, doc: i.no, type: 'invoice', id: i.id, debit: i.amount, credit: 0, label: 'Invoice' }));
  S.payments.filter(p => p.cid === cid).forEach(p => rows.push({ date: p.date, doc: p.rcpt || p.no, type: 'payment', id: p.id, debit: 0, credit: p.amount, label: `Payment · ${p.method}` }));
  S.cnotes.filter(n => n.cid === cid).forEach(n => rows.push({ date: n.date, doc: n.no, type: 'cn', id: n.id, debit: 0, credit: n.total, label: `Credit note · ${n.reason}` }));
  S.dnotes.filter(n => n.cid === cid).forEach(n => rows.push({ date: n.date, doc: n.no, type: 'dn', id: n.id, debit: n.total, credit: 0, label: 'Debit note' }));
  rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === 'invoice' ? -1 : 1);
  let bal = 0;
  rows.forEach(r => { bal += r.debit - r.credit; r.bal = Math.round(bal * 100) / 100; });
  return rows;
}
function custFinance(cid) {
  const inv = S.invoices.filter(i => i.cid === cid && !['draft', 'void'].includes(i.status));
  const invoiced = inv.reduce((s, i) => s + i.amount, 0);
  const paid = S.payments.filter(p => p.cid === cid).reduce((s, p) => s + p.amount, 0);
  const credits = S.cnotes.filter(n => n.cid === cid).reduce((s, n) => s + n.total, 0);
  const debits = S.dnotes.filter(n => n.cid === cid).reduce((s, n) => s + n.total, 0);
  const outstanding = Math.max(0, Math.round((invoiced + debits - paid - credits) * 100) / 100);
  const overdue = inv.filter(i => invBal(i) > 0 && i.due < iso(TODAY)).reduce((s, i) => s + invBal(i), 0);
  const c = cust(cid);
  const limit = c.creditLimit || 0;
  const available = limit ? Math.max(0, limit - outstanding) : 0;
  const status = !limit ? 'No limit set' : outstanding > limit ? 'Over limit' : outstanding > limit * 0.8 ? 'Near limit' : 'Within limit';
  return { invoiced, paid, credits, debits, outstanding, overdue, limit, available, status, count: inv.length };
}
function statementPanel(cid) {
  const rows = statementRows(cid); const f = custFinance(cid); const c = cust(cid);
  const open = rows.length ? 0 : 0;
  return `<div class="panel" id="statement"><div class="panel-h"><h3>Customer statement</h3><span class="muted" style="font-size:12.5px">All invoices, payments and notes</span><span class="spacer"></span>
    <button class="btn sm" data-a="stmtPrint" data-id="${cid}">${I('printer', 'sm')} Print</button>
    <button class="btn sm" data-a="stmtExport" data-id="${cid}" data-f="pdf">${I('download', 'sm')} PDF</button>
    <button class="btn sm" data-a="stmtExport" data-id="${cid}" data-f="csv">${I('download', 'sm')} Export</button></div>
  <div class="panel-b" style="padding:0">
    <div class="stmt-cards">
      <div><small>Total invoiced</small><b>${money(f.invoiced)}</b><span class="lr-s">${f.count} invoices</span></div>
      <div><small>Total paid</small><b class="ok-t">${money(f.paid)}</b><span class="lr-s">${f.credits ? money(f.credits) + ' credited' : 'No credit notes'}</span></div>
      <div><small>Outstanding</small><b>${money(f.outstanding)}</b><span class="lr-s">${f.limit ? `Limit ${money(f.limit)}` : 'No credit limit'}</span></div>
      <div><small>Overdue</small><b class="${f.overdue ? 'due-t' : ''}">${money(f.overdue)}</b><span class="lr-s">${f.overdue ? 'Needs follow-up' : 'Nothing past due'}</span></div>
    </div>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl stmt"><thead><tr><th>Date</th><th>Document</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr></thead><tbody>
      <tr class="muted"><td>${fdate(rows[0].date)}</td><td>Opening balance</td><td class="r">—</td><td class="r">—</td><td class="r num">${money(0)}</td></tr>
      ${rows.map(r => `<tr class="click" data-a="${r.type === 'invoice' ? 'go' : r.type === 'payment' ? 'rcptView' : 'noteView'}" ${r.type === 'invoice' ? `data-to="#/app/invoices/${r.id}"` : `data-id="${r.id}"`} ${r.type === 'cn' ? 'data-kind="cn"' : r.type === 'dn' ? 'data-kind="dn"' : ''}>
        <td>${fdate(r.date)}</td><td><b style="font-weight:600">${esc(r.doc)}</b><div class="lr-s">${esc(r.label)}</div></td>
        <td class="r num">${r.debit ? money(r.debit) : '—'}</td><td class="r num">${r.credit ? money(r.credit) : '—'}</td>
        <td class="r num"><b style="font-weight:600">${money(r.bal)}</b></td></tr>`).join('')}
      <tr class="stmt-end"><td colspan="2"><b>Closing balance</b></td><td class="r num">${money(f.invoiced + f.debits)}</td><td class="r num">${money(f.paid + f.credits)}</td><td class="r num"><b>${money(f.outstanding)}</b></td></tr>
    </tbody></table></div>` : `<div class="empty" style="padding:26px">${I('receipt')}<h4>No financial transactions yet</h4><p>Invoices and payments for ${esc(c.company)} will appear here.</p></div>`}
  </div></div>`;
}
A.stmtPrint = () => window.print();
A.stmtExport = el => toast(`${el.dataset.f.toUpperCase()} export simulated`, `The statement for ${cust(el.dataset.id).company} would download in the full product`, 'warn');

A.invFilter = el => {
  const v = el.dataset.v;
  Object.assign(QS.inv, { tab: 'invoices', page: 1, status: 'all', q: '', due: null });
  if (v === 'today' || v === 'week') QS.inv.due = v; else QS.inv.status = v;
  rerender();
};

IN.setBank = el => { S.settings.bank[el.dataset.k] = el.value; flashSaved(); };
IN.setSN = el => { S.settings[el.dataset.k] = Math.max(1, +el.value || 1); flashSaved(); };
A.setBankTog = el => { S.settings.bank[el.dataset.k] = !S.settings.bank[el.dataset.k]; rerender(); flashSaved(); };

/* ---------- customer credit information ---------- */
function creditPanel(cid) {
  const f = custFinance(cid); const c = cust(cid);
  const tone = f.status === 'Over limit' ? 'red' : f.status === 'Near limit' ? 'amber' : 'green';
  return `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Credit information</h3><span class="spacer"></span>
    <button class="btn sm" data-a="creditEdit" data-id="${cid}">${I('edit', 'sm')} Edit limit & terms</button></div>
  <div class="panel-b"><div class="credit-grid">
    <div><small>Credit limit</small><b>${f.limit ? money(f.limit) : '—'}</b></div>
    <div><small>Current outstanding</small><b>${money(f.outstanding)}</b></div>
    <div><small>Available credit</small><b>${f.limit ? money(f.available) : '—'}</b></div>
    <div><small>Payment terms</small><b>${esc(termLabel(c.terms || 'net15'))}</b></div>
    <div><small>Credit status</small><b><span class="badge tone-${tone} nodot">${esc(f.status)}</span></b></div>
    <div><small>Overdue</small><b class="${f.overdue ? 'due-t' : ''}">${money(f.overdue)}</b></div>
  </div>
  ${f.limit ? `<div class="hbar" style="margin-top:12px"><i class="${tone}" style="width:${Math.min(100, pct(f.outstanding, f.limit))}%"></i></div>
    <div class="lr-s" style="margin-top:6px">${pct(f.outstanding, f.limit)}% of the limit used</div>` : '<p class="hint" style="margin-top:10px">No credit limit set for this customer.</p>'}
  </div></div>`;
}
A.creditEdit = el => {
  const c = cust(el.dataset.id);
  openModal(`${mHead('Credit limit & terms', esc(c.company))}
  <div class="mb stack"><div class="grid2">
    <div class="field"><label for="cr-l">Credit limit</label><input class="input" type="number" min="0" step="10000" id="cr-l" value="${c.creditLimit || 0}"></div>
    <div class="field"><label for="cr-t">Default payment terms</label><select class="select" id="cr-t">${PAY_TERMS.filter(t => t[0] !== 'custom').map(t => `<option value="${t[0]}" ${c.terms === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></div>
  </div><p class="hint">Used on new quotations and invoices for this customer.</p></div>
  <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" id="cr-ok">Save</button></div>`);
  $('#cr-ok').onclick = () => { c.creditLimit = +$('#cr-l').value || 0; c.terms = $('#cr-t').value; closeModal(); toast('Credit details updated', esc(c.company)); rerender(); };
};

/* ================= real downloads and WhatsApp hand-off ================= */
const PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
let PDF_LOADING = null;
function ensurePdfLib() {
  if (window.html2pdf) return Promise.resolve(true);
  if (PDF_LOADING) return PDF_LOADING;
  PDF_LOADING = new Promise(res => {
    const s = document.createElement('script');
    s.src = PDF_LIB; s.onload = () => res(!!window.html2pdf); s.onerror = () => { PDF_LOADING = null; res(false); };
    document.head.appendChild(s);
  });
  return PDF_LOADING;
}
/* hands the file to the viewer: the artifact download capability when the page runs inside claude.ai, a normal browser download otherwise */
async function saveFile(filename, blob) {
  try {
    const d = window.claude && typeof claude.use === 'function' ? await claude.use('downloads') : null;
    if (d) { await d.save({ filename, data: blob }); return 'saved'; }
  } catch (e) { return e && e.code === 'declined' ? 'declined' : 'failed'; }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'saved';
  } catch (e) { return 'failed'; }
}
function pdfStage(html) {
  const w = document.createElement('div');
  w.className = 'pdf-stage'; w.innerHTML = html;
  document.body.appendChild(w);
  return w;
}
/* builds the A4 PDF from the same markup the screen shows */
async function downloadPdf(html, filename, label) {
  const t = toast('Preparing PDF', `${filename} · building the A4 layout`);
  const ok = await ensurePdfLib();
  if (!ok) {
    toast('PDF library could not load', 'Opening the print dialog instead — choose “Save as PDF” there.', 'warn');
    printHTML(html);
    return false;
  }
  const stage = pdfStage(html);
  stage.classList.add('capturing');   // html2canvas measures the live box, so it has to sit at 0,0 while we shoot it
  try {
    const node = stage.firstElementChild;
    node.classList.add('pdf-export');  // the library clones this node out of the stage, so the export styles ride on the node itself
    const blob = await html2pdf().set({
      margin: [8, 8, 10, 8], filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: document.documentElement.clientWidth },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(node).outputPdf('blob');
    const res = await saveFile(filename, blob);
    if (res === 'saved') toast('PDF downloaded', `${filename}${label ? ' · ' + label : ''}`);
    else if (res === 'declined') toast('Download cancelled', '', 'warn');
    else { toast('Could not save the file', 'Opening the print dialog instead.', 'warn'); printHTML(html); }
    return res === 'saved';
  } catch (e) {
    toast('PDF build failed', 'Opening the print dialog instead — choose “Save as PDF” there.', 'warn');
    printHTML(html);
    return false;
  } finally { stage.remove(); }
}
/* print just this document, whatever page we are on */
function printHTML(html) {
  const old = $('#print-stage'); if (old) old.remove();
  const w = document.createElement('div');
  w.id = 'print-stage'; w.className = 'pdf-stage print-only print-target'; w.innerHTML = html;
  document.body.appendChild(w);
  setTimeout(() => { window.print(); setTimeout(() => w.remove(), 1000); }, 120);
}
const docFile = (no, kind) => `${String(no).replace(/[^\w-]+/g, '-')}-${kind}.pdf`;

/* ---------- WhatsApp ---------- */
const waDigits = p => String(p || '').replace(/\D/g, '').replace(/^0+/, '');
function waUrl(phone, msg) {
  const d = waDigits(phone);
  const n = d.length === 10 ? '91' + d : d;              // plain Indian mobile numbers get the country code
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}
/* opens WhatsApp (app or web) with the message already typed in */
function openWhatsApp(phone, msg) {
  const url = waUrl(phone, msg);
  const w = window.open(url, '_blank', 'noopener');
  if (!w) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
  return url;
}
function openMail(to, subject, body, cc, bcc) {
  const q = [['subject', subject], ['body', body], ['cc', (cc || []).join(',')], ['bcc', (bcc || []).join(',')]]
    .filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `mailto:${encodeURIComponent(to || '')}${q ? '?' + q : ''}`;
  window.location.href = url;
  return url;
}

/* ---------- downloads wired to the real documents ---------- */
A.pdfDemo = el => {                                   // quotation PDF (list, document page, share sheet)
  const q = quote(el.dataset.id);
  closeFloating(); if (!el.dataset.keepModal) { modalCleanup = null; closeModal(true); }
  q.comms.push({ ch: 'system', ev: 'PDF downloaded', ts: Date.now(), to: '' });
  downloadPdf(docHTML(q, { noStamp: false }), docFile(q.no, 'quotation'), `${cust(q.cid).company}`);
};
A.pDownload = () => {                                  // client portal
  const q = quote((location.hash.match(/#\/portal\/([^/?]+)/) || [])[1]);
  if (!q) return;
  downloadPdf(docHTML(q), docFile(q.no, 'quotation'), 'Client copy');
};
A.invPdf = el => { closeFloating(); const i = invoice(el.dataset.id); downloadPdf(invoiceDoc(i), docFile(i.no, 'invoice'), cust(i.cid).company); };
A.rcptPdf = el => {
  const pay = S.payments.find(p => p.rcpt === el.dataset.no) || S.payments.find(p => p.id === el.dataset.id);
  const node = $('.rcpt');
  downloadPdf(node ? node.outerHTML : '', docFile(pay ? pay.rcpt : 'receipt', 'receipt'), pay ? money(pay.amount) : '');
};
A.dcPdf = el => {
  closeFloating(); const d = challan(el.dataset.id);
  const node = $('.modal .inv-doc');
  if (node) return downloadPdf(node.outerHTML, docFile(d.no, 'challan'), cust(d.cid).company);
  A.dcView({ dataset: { id: d.id } });
  setTimeout(() => { const n = $('.modal .inv-doc'); if (n) downloadPdf(n.outerHTML, docFile(d.no, 'challan'), cust(d.cid).company); }, 250);
};
A.notePdf = el => { const node = $('.modal .inv-doc'); if (node) downloadPdf(node.outerHTML, docFile(el.dataset.no, 'note'), ''); };
A.invPrint = el => { const i = invoice(el.dataset.id); printHTML(invoiceDoc(i)); };

/* ---------- WhatsApp hand-off ---------- */
A.rcptSend = el => {
  const pay = S.payments.find(p => p.id === el.dataset.id); const c = cust(pay.cid); const i = invoice(pay.invId);
  const msg = `Hi ${c.name.split(' ')[0]}, thank you for your payment.\n\n*Receipt ${pay.rcpt}*\nInvoice: ${i.no}\nAmount received: *${money2(pay.amount)}*\nMethod: ${pay.method}${pay.ref ? `\nReference: ${pay.ref}` : ''}\nBalance due: ${money2(invBal(i))}\n\n${S.settings.bizName}`;
  if (el.dataset.ch === 'whatsapp') { openWhatsApp(c.phone, msg); toast('WhatsApp opened', `Receipt ${pay.rcpt} message ready for ${c.phone}`); }
  else { openMail(c.email, `Payment receipt ${pay.rcpt} from ${S.settings.bizName}`, msg.replace(/\*/g, '')); toast('Email draft opened', `Receipt ${pay.rcpt} for ${c.email}`); }
  logAudit('invoice', i.id, `Receipt ${pay.rcpt} shared`, `${cap(el.dataset.ch)} to ${el.dataset.ch === 'whatsapp' ? c.phone : c.email}`);
};
A.dcShare = el => {
  const d = challan(el.dataset.id); const c = cust(d.cid); const o = order(d.oid);
  const msg = `Hi ${c.name.split(' ')[0]}, material for ${o ? o.no : 'your order'} has been dispatched.\n\n*Delivery challan ${d.no}*\nDispatch date: ${fdate(d.dispatch || d.date)}\nTransporter: ${d.transporter}\nVehicle: ${d.vehicle}\n\n${S.settings.bizName}`;
  openWhatsApp(c.phone, msg);
  logAudit('challan', d.id, 'Challan shared on WhatsApp', c.phone);
  toast('WhatsApp opened', `${d.no} message ready for ${c.phone}`);
};
A.invWa = el => {                                      // WhatsApp an invoice straight from the invoice page
  const i = invoice(el.dataset.id); const c = cust(i.cid); const bal = invBal(i); const dl = invDue(i);
  const msg = `Hi ${c.name.split(' ')[0]},\n\n*Invoice ${i.no}* from ${S.settings.bizName}\nAmount: *${money2(i.amount)}*${i.paid ? `\nPaid: ${money2(i.paid)}` : ''}\nBalance due: *${money2(bal)}*\nDue date: ${fdate(i.due)}${dl < 0 ? ` (overdue by ${-dl} days)` : ''}\n${i.po && i.po.has ? `Your PO: ${i.po.no}\n` : ''}\nPayment details are on the invoice. Please share the UTR once paid.\n\n${S.settings.bizName}`;
  openWhatsApp(c.phone, msg);
  logAudit('invoice', i.id, 'Invoice shared on WhatsApp', c.phone);
  toast('WhatsApp opened', `${i.no} message ready for ${c.phone}`);
};

/* share sheet: WhatsApp now opens WhatsApp with the template message already written */
A.shSendWA = () => {
  const W = SH.wa, q = SH.q;
  const wasDraft = q.status === 'draft';
  openWhatsApp(W.phone, W.msg);
  logSend(q, 'whatsapp', W.phone, W.msg.split('\n')[0]);
  SH.done = `<div class="stack" style="padding:10px 4px"><div class="send-state ok">${I('checkc')}<div><b style="font-weight:600">WhatsApp opened for ${esc(W.phone)}</b><div>The message below is already typed in — press send there. If nothing opened, allow pop-ups and use the button below.</div></div></div>
    <div class="wa-prev"><div class="bubble">${esc(W.msg).replace(/\*(.+?)\*/g, '<b>$1</b>')}</div></div>
    ${wasDraft ? `<p style="font-size:13px">${q.no} is now marked <b>Sent</b>.</p>` : ''}
    <div class="row wrap"><button class="btn wa" data-a="shWaAgain">${I('wa', 'sm')} Open WhatsApp again</button>
      <button class="btn" data-a="shOther" data-k="portal">${I('globe', 'sm')} Open client view</button>
      <button class="btn" data-a="shTab" data-t="history">View history</button>
      <button class="btn" data-a="closeModal">Done</button></div></div>`;
  drawShare();
  toast('WhatsApp opened', `${q.no} message ready for ${W.phone}`);
};
A.shWaAgain = () => openWhatsApp(SH.wa.phone, SH.wa.msg);

/* payment reminders: Email opens a draft, WhatsApp opens the chat, SMS stays a log entry */
A.invRemindSend = (i, ch, to, subject, msg) => {
  if (ch === 'whatsapp') openWhatsApp(to, msg);
  else if (ch === 'email') openMail(to, subject, msg);
  logAudit('invoice', i.id, 'Payment reminder sent', `${cap(ch)} to ${to}`);
  if (quote(i.qid)) quote(i.qid).comms.push({ ch, ev: `Payment reminder for ${i.no}`, ts: Date.now(), to, msg: msg.slice(0, 120), status: 'done' });
  toast(ch === 'sms' ? 'SMS reminder logged' : `${cap(ch)} opened`,
    ch === 'sms' ? 'SMS sending needs a gateway, so this is logged only.' : `${i.no} message ready for ${to}`, ch === 'sms' ? 'warn' : 'ok');
};

/* ================= GST tax invoice template (boxed Tally layout) ================= */
const sumRow = (label, amount) => `<tr class="ty-sub"><td class="sl"></td><td class="r">${label}</td><td class="hsn"></td><td class="qty"></td><td class="rate"></td><td class="per"></td><td class="amt">${amount}</td></tr>`;
const num2 = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const paiseWords = n => {
  const r = Math.floor(n), p = Math.round((n - r) * 100);
  return `${numberToWordsIN(r)} Indian Rupees${p ? ` and ${numberToWordsIN(p)} paise` : ''} Only`;
};
/* one layout for both documents: q is the quotation, opts.inv the invoice when printing one */
function tallyDoc(q, opts = {}) {
  const s = S.settings, c = q.cid ? cust(q.cid) : null, T = calcQuote(q), inv = opts.inv;
  const ship = shipOf(q);
  const title = inv ? 'Tax Invoice' : 'Quotation';
  const lines = T.lines.filter(l => l.type !== 'item' ? false : true);
  const totalQty = {};
  lines.forEach(l => { const u = l.unit || 'nos'; totalQty[u] = (totalQty[u] || 0) + (+l.qty || 0); });
  const qtyTotal = Object.entries(totalQty).map(([u, v]) => `${numF(v)} ${esc(u)}`).join(' + ');
  const grand = inv ? inv.amount : T.grand;
  /* HSN summary: taxable value and tax grouped by HSN code and rate */
  const netSum = lines.reduce((a, l) => a + l.net, 0);
  const factor = netSum > 0 ? (netSum - T.od) / netSum : 0;   // the overall discount is spread across the lines
  const hsnMap = {};
  lines.forEach(l => {
    const key = (l.hsn || prod(l.pid)?.hsn || '—') + '|' + l.tax;
    const h = hsnMap[key] || (hsnMap[key] = { hsn: l.hsn || prod(l.pid)?.hsn || '—', rate: +l.tax || 0, taxable: 0, tax: 0 });
    h.taxable += l.net * factor; h.tax += l.taxAmt * factor;
  });
  if (T.ship || T.extra) hsnMap.charges = { hsn: '996511', rate: 18, taxable: T.ship + T.extra, tax: (T.ship + T.extra) * 0.18 };
  const hsnRows = Object.values(hsnMap);
  const hsnTaxable = hsnRows.reduce((a, h) => a + h.taxable, 0), hsnTax = hsnRows.reduce((a, h) => a + h.tax, 0);
  const inter = T.interState;
  const meta = [
    [inv ? 'Invoice No.' : 'Quotation No.', inv ? inv.no : q.no],
    ['Dated', fdate(inv ? inv.date : q.date)],
    ['Delivery Note', (S.challans.find(d => d.qid === q.id) || {}).no || ''],
    ['Mode/Terms of Payment', termLabel(q.termsCode || 'net15', q.termsDays)],
    ['Reference No. & Date', q.po && q.po.has ? `${q.po.no}${q.po.date ? ' dt. ' + fdate(q.po.date) : ''}` : ''],
    ['Other References', q.jobNo || ''],
    ["Buyer's Order No.", q.po && q.po.has ? q.po.no : ''],
    ['Dispatch Doc No.', (S.challans.find(d => d.qid === q.id) || {}).no || ''],
    ['Delivery Note Date', (S.challans.find(d => d.qid === q.id) || {}).dispatch ? fdate(S.challans.find(d => d.qid === q.id).dispatch) : ''],
    ['Dispatched through', (S.challans.find(d => d.qid === q.id) || {}).transporter || ''],
    ['Destination', ship.city || ''],
    ['Terms of Delivery', inv ? 'As per agreed schedule' : `Valid until ${fdate(q.expiry)}`],
  ];
  const party = (label, a, extra) => `<div class="ty-party">${label ? `<small>${label}</small>` : ''}
    <b>${esc(a.name || '')}</b>
    <p>${esc(a.address || '')}${a.city ? `<br>${esc(a.city)}${a.state ? ', ' + esc(a.state) : ''}${a.pin ? ' - ' + esc(a.pin) : ''}` : ''}</p>
    ${a.gstin ? `<p>GSTIN/UIN&nbsp;: ${esc(a.gstin)}</p>` : ''}${a.state ? `<p>State Name : ${esc(a.state)}${a.code ? `, Code : ${esc(a.code)}` : ''}</p>` : ''}${extra || ''}</div>`;
  return `<article class="doc ty" aria-label="${title} document">
    <div class="ty-top">
      <div class="ty-irn">
        ${inv ? `<div><span>IRN</span><b>${esc((inv.no + s.gstin).replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(32, '0').slice(0, 32))}</b></div>
        <div><span>Ack No.</span><b>${esc(String(112200000000 + (parseInt(inv.no.replace(/\D/g, ''), 10) || 1) * 7).slice(0, 15))}</b></div>
        <div><span>Ack Date</span><b>${fdate(inv.date)}</b></div>` : `<div><span>Status</span><b>${cap(q.status)}</b></div>
        <div><span>Valid until</span><b>${fdate(q.expiry)}</b></div>`}
      </div>
      <div class="ty-title">${title}</div>
    </div>
    <div class="ty-grid">
      <div class="ty-left">
        ${party('', { name: s.bizName, address: `${s.address}`, city: s.city.split(',')[0], state: s.state, pin: '', gstin: s.gstin, code: s.stateCode }, `<p>E-Mail : ${esc(s.email)}</p>`)}
        ${party('Consignee (Ship to)', ship)}
        ${party('Buyer (Bill to)', c ? { name: c.company, address: c.address, city: c.city, state: c.state, pin: c.pin, gstin: c.gstin } : { name: 'Select a customer' })}
      </div>
      <div class="ty-meta">${meta.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(String(v || ''))}</b></div>`).join('')}</div>
    </div>
    <table class="ty-items">
      <thead><tr><th class="sl">Sl<br>No.</th><th>Description of Goods</th><th class="hsn">HSN/SAC</th><th class="qty">Quantity</th><th class="rate">Rate</th><th class="per">per</th><th class="amt">Amount</th></tr></thead>
      <tbody>
        ${lines.map((l, i) => `<tr><td class="sl">${i + 1}</td>
          <td><b>${esc(l.name || 'Item')}</b>${l.desc ? `<small>${esc(l.desc)}</small>` : ''}</td>
          <td class="hsn">${esc(l.hsn || prod(l.pid)?.hsn || '—')}</td>
          <td class="qty">${numF(l.qty)} ${esc(l.unit || '')}</td>
          <td class="rate">${num2(l.price)}</td><td class="per">${esc(l.unit || '')}</td>
          <td class="amt">${num2(l.gross)}</td></tr>`).join('')}
        ${T.idisc ? sumRow('Less : Item discount', `(-) ${num2(T.idisc)}`) : ''}
        ${T.od ? sumRow('Less : Discount', `(-) ${num2(T.od)}`) : ''}
        ${T.ship ? sumRow('Freight / delivery', num2(T.ship)) : ''}
        ${T.extra ? sumRow(esc(q.extraLabel || 'Additional charges'), num2(T.extra)) : ''}
        ${inter ? sumRow('Integrated Tax', num2(T.igst))
          : sumRow('Central Tax', num2(T.cgst)) + sumRow('State Tax', num2(T.sgst))}
        ${T.cess ? sumRow('Cess', num2(T.cess)) : ''}
        ${T.roundDiff ? sumRow('ROUND OFF', `${T.roundDiff < 0 ? '(-) ' : ''}${num2(Math.abs(T.roundDiff))}`) : ''}
        <tr class="ty-pad"><td class="sl"></td><td></td><td class="hsn"></td><td class="qty"></td><td class="rate"></td><td class="per"></td><td class="amt"></td></tr>
      </tbody>
      <tfoot><tr><td class="sl"></td><td class="r"><b>Total</b></td><td class="hsn"></td><td class="qty"><b>${qtyTotal}</b></td><td class="rate"></td><td class="per"></td><td class="amt"><b>₹ ${num2(grand)}</b></td></tr></tfoot>
    </table>
    <div class="ty-eoe">E. &amp; O.E</div>
    <div class="ty-words"><small>Amount Chargeable (in words)</small><b>${esc(paiseWords(grand))}</b></div>
    <table class="ty-hsn">
      <thead><tr><th rowspan="2">HSN/SAC</th><th rowspan="2" class="r">Taxable<br>Value</th>
        ${inter ? '<th colspan="2">IGST</th>' : '<th colspan="2">CGST</th><th colspan="2">SGST/UTGST</th>'}
        <th rowspan="2" class="r">Total<br>Tax Amount</th></tr>
        <tr>${inter ? '<th class="r">Rate</th><th class="r">Amount</th>' : '<th class="r">Rate</th><th class="r">Amount</th><th class="r">Rate</th><th class="r">Amount</th>'}</tr></thead>
      <tbody>${hsnRows.map(h => `<tr><td>${esc(h.hsn)}</td><td class="r">${num2(h.taxable)}</td>
        ${inter ? `<td class="r">${h.rate}%</td><td class="r">${num2(h.tax)}</td>`
          : `<td class="r">${h.rate / 2}%</td><td class="r">${num2(h.tax / 2)}</td><td class="r">${h.rate / 2}%</td><td class="r">${num2(h.tax / 2)}</td>`}
        <td class="r">${num2(h.tax)}</td></tr>`).join('')}
        <tr class="ty-tot"><td class="r"><b>Total</b></td><td class="r"><b>${num2(hsnTaxable)}</b></td>
        ${inter ? `<td></td><td class="r"><b>${num2(hsnTax)}</b></td>` : `<td></td><td class="r"><b>${num2(hsnTax / 2)}</b></td><td></td><td class="r"><b>${num2(hsnTax / 2)}</b></td>`}
        <td class="r"><b>${num2(hsnTax)}</b></td></tr></tbody>
    </table>
    <div class="ty-words"><small>Tax Amount (in words) :</small><b>${esc(paiseWords(hsnTax))}</b></div>
    <div class="ty-foot">
      <div class="ty-decl"><u>Declaration</u>
        <p>${esc(q.terms || s.terms).split('\n').filter(Boolean).map((t, i) => `${i + 1}) ${esc(t.replace(/^\d+[.)]\s*/, ''))}`).join('<br>')}</p></div>
      <div class="ty-bank"><b>Company's Bank Details</b>
        <div class="ty-bg"><span>Bank Name</span><b>: ${esc(s.bank.bankName)}</b>
          <span>A/c No.</span><b>: ${esc(s.bank.acc)}</b>
          <span>Branch &amp; IFS Code</span><b>: ${esc(s.bank.branch)} &amp; ${esc(s.bank.ifsc)}</b>
          ${s.bank.upi ? `<span>UPI</span><b>: ${esc(s.bank.upi)}</b>` : ''}</div>
        <div class="ty-sign">for <b>${esc(s.bizName)}</b><span class="ty-sl"></span><small>Authorised Signatory</small></div>
      </div>
    </div>
    <div class="ty-cg">This is a Computer Generated ${inv ? 'Invoice' : 'Quotation'}</div>
  </article>`;
}
