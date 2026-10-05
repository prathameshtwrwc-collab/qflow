/* ================= platform admin console (#/admin) ================= */
const ADM = { rows: [], filter: 'all', email: '' };

/* one label for the whole lifecycle, so the table and the filters agree */
function admState(r) {
  if (r.status === 'pending') return 'pending';
  if (r.status === 'rejected') return 'rejected';
  if (!r.is_active) return 'suspended';
  if (!r.activated_at) return 'awaiting';
  return new Date(r.expires_at) <= new Date() ? 'expired' : 'active';
}
const ADM_STATE = { pending: ['s-viewed', 'Pending review'], awaiting: ['s-sent', 'Key not entered'], active: ['s-accepted', 'Active'], expired: ['s-expired', 'Expired'], suspended: ['s-draft', 'Suspended'], rejected: ['s-rejected', 'Rejected'] };
const admRow = id => ADM.rows.find(r => r.id === id);
const admDaysLeft = r => Math.ceil((new Date(r.expires_at) - Date.now()) / DAY);

function pageAdmin() {
  const at = location.hash;
  document.title = 'Platform admin · QuoteFlow';
  $('#root').innerHTML = `<div style="padding:40px;text-align:center" class="muted">Loading…</div>`;
  (async () => {
    const session = await DB.session();
    if (!session) return go('#/login');
    const ws = await DB.workspace();
    if (ws.state !== 'admin') return go('#/status');
    ADM.email = session.user.email;
    ADM.rows = await DB.adminList();
    if (location.hash === at) admRender();
  })().catch(e => { if (location.hash === at) $('#root').innerHTML = `<div style="padding:40px;text-align:center"><p class="hint err">${esc(e.message)}</p><button class="btn" style="margin-top:12px" data-a="admReload">Try again</button></div>`; });
}

function admRender() {
  const count = k => ADM.rows.filter(r => admState(r) === k).length;
  const rows = ADM.rows.filter(r => ADM.filter === 'all' || admState(r) === ADM.filter);
  const tabs = [['all', 'All', ADM.rows.length], ...Object.entries(ADM_STATE).map(([k, v]) => [k, v[1], count(k)])];
  $('#root').innerHTML = `<div style="max-width:1280px;margin:0 auto;padding:20px 20px 60px;display:flex;flex-direction:column;gap:16px">
    <div class="row between" style="flex-wrap:wrap">
      <div class="row" style="gap:12px"><span class="brand"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">${IP.logo}</svg></span>QuoteFlow</span><span class="badge nodot s-draft">Platform admin</span></div>
      <div class="row"><span class="muted hide-sm" style="font-size:13px">${esc(ADM.email)}</span><button class="btn" data-a="admReload">${I('refresh', 'sm')} Refresh</button><button class="btn ghost" data-a="authLogout">${I('logout', 'sm')} Log out</button></div>
    </div>
    <div><h1 style="font-size:22px;font-weight:600">Companies</h1><p class="muted" style="margin-top:2px">Approve workspace requests, issue license keys and manage access.</p></div>
    <div class="row" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button class="btn sm ${ADM.filter === k ? 'dark' : ''}" data-a="admFilter" data-v="${k}">${l} <span style="opacity:.7">${n}</span></button>`).join('')}</div>
    <div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Company</th><th>Owner</th><th>Status</th><th>License</th><th>Requested</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${rows.length ? rows.map(admRowHTML).join('') : `<tr><td colspan="6"><div class="empty" style="padding:28px;text-align:center">No companies here yet.</div></td></tr>`}</tbody>
    </table></div></div>
  </div>`;
}

function admRowHTML(r) {
  const st = admState(r), [cls, label] = ADM_STATE[st];
  const b = (a, text, kind = '') => `<button class="btn sm ${kind}" data-a="${a}" data-id="${r.id}">${text}</button>`;
  const lic = r.license_key
    ? `<div class="row" style="gap:6px"><code style="font-size:12.5px">${esc(r.license_key)}</code><button class="btn icon ghost sm" data-a="admCopy" data-id="${r.id}" aria-label="Copy license key">${I('copy', 'sm')}</button></div>
       <small class="muted">${r.validity_days} days${r.activated_at ? ` · ${st === 'expired' ? 'ended' : 'until'} ${fdate(new Date(r.expires_at))}${st === 'active' ? ` (${admDaysLeft(r)} days left)` : ''}` : ' · starts when the key is entered'}</small>`
    : `<span class="muted">${st === 'rejected' && r.reject_reason ? esc(r.reject_reason) : '—'}</span>`;
  const acts = [];
  if (st === 'pending') acts.push(b('admApprove', 'Approve', 'primary'), b('admReject', 'Reject'));
  if (st === 'rejected') acts.push(b('admApprove', 'Approve'));
  if (r.status === 'approved') acts.push(b('admExtend', 'Extend'), r.is_active ? b('admSuspend', 'Suspend') : b('admResume', 'Reactivate', 'primary'));
  acts.unshift(b('admOpen', 'Open workspace'));
  acts.push(b('admDelete', 'Delete', 'ghost'));
  return `<tr>
    <td><b style="font-weight:600">${esc(r.name)}</b><div class="muted" style="font-size:12.5px">${esc([r.legal_name, (CATEGORIES[r.category] || {}).label].filter(Boolean).join(' · '))}</div><div class="muted" style="font-size:12.5px">${esc([r.city, r.state].filter(Boolean).join(', '))}${r.gstin ? ' · GSTIN ' + esc(r.gstin) : ''}</div></td>
    <td>${esc(r.owner_name || '—')}<div class="muted" style="font-size:12.5px">${esc(r.owner_email || '')}</div><div class="muted" style="font-size:12.5px">${esc(r.phone || '')}</div></td>
    <td><span class="badge ${cls}">${label}</span></td>
    <td>${lic}</td>
    <td class="muted">${fdate(new Date(r.requested_at || r.created_at))}</td>
    <td><div class="row" style="justify-content:flex-end;gap:6px;flex-wrap:wrap">${acts.join('')}</div></td>
  </tr>`;
}

/* runs an admin call, reloads the list, and reports failures in a toast */
async function admDo(fn, okMsg) {
  try { const out = await fn(); ADM.rows = await DB.adminList(); admRender(); if (okMsg) toast(okMsg); return out; }
  catch (e) { toast('That did not work', e.message, 'err'); }
}
const admDaysField = (id, label, val) => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="number" min="1" step="1" value="${val}"><div class="row" style="margin-top:4px">${[30, 90, 180, 365].map(d => `<button class="btn sm" type="button" data-a="admDays" data-for="${id}" data-v="${d}">${d} days</button>`).join('')}</div></div>`;
const admDays = id => { const n = Math.floor(+$('#' + id).value); return n >= 1 ? n : 0; };

A.admReload = () => route();
/* full read and write on the client's data (0005_admin_access.sql); a reload returns to the console */
A.admOpen = async el => {
  const r = admRow(el.dataset.id); el.disabled = true; el.textContent = 'Opening…';
  try { await enterLive({ admin: true, state: admState(r), company_id: r.id, company_name: r.name, expires_at: r.expires_at }); go('#/app/overview'); }
  catch (e) { el.disabled = false; el.textContent = 'Open workspace'; toast('Could not open the workspace', e.message, 'err'); }
};
A.admBack = () => { location.hash = '#/admin'; location.reload(); };
A.admFilter = el => { ADM.filter = el.dataset.v; admRender(); };
A.admDays = el => { $('#' + el.dataset.for).value = el.dataset.v; };
A.admCopy = async el => {
  const key = el.dataset.key || admRow(el.dataset.id).license_key;
  try { await navigator.clipboard.writeText(key); toast('License key copied'); } catch (e) { toast('Could not copy', 'Select the key and copy it by hand.', 'warn'); }
};
A.admApprove = el => {
  const r = admRow(el.dataset.id);
  openModal(`${mHead('Approve ' + r.name, 'A license key is generated. The validity starts when the owner enters it.')}
    <div class="mb">${admDaysField('adm-days', 'Validity', 365)}</div>
    <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" data-a="admApproveGo" data-id="${r.id}">Approve and generate key</button></div>`);
};
A.admApproveGo = async el => {
  const days = admDays('adm-days'); if (!days) return toast('Enter the validity in days', '', 'warn');
  const r = admRow(el.dataset.id); el.disabled = true;
  const key = await admDo(() => DB.adminApprove(r.id, days));
  if (!key) { el.disabled = false; return; }
  openModal(`${mHead('License key for ' + r.name, `Valid for ${days} days from activation. Send it to ${esc(r.owner_email || 'the owner')} yourself.`)}
    <div class="mb"><div class="row" style="gap:8px"><input class="input" readonly value="${esc(key)}" style="font-family:ui-monospace,monospace"><button class="btn primary" data-a="admCopy" data-key="${esc(key)}">${I('copy', 'sm')} Copy</button></div>
      <p class="hint" style="margin-top:8px">The key also stays visible in the companies table.</p></div>
    <div class="mf"><button class="btn" data-a="closeModal">Done</button></div>`);
};
A.admReject = el => {
  const r = admRow(el.dataset.id);
  openModal(`${mHead('Reject ' + r.name, 'The owner sees this reason when they log in.')}
    <div class="mb"><div class="field"><label for="adm-reason">Reason (optional)</label><textarea class="textarea" id="adm-reason"></textarea></div></div>
    <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn dark" data-a="admRejectGo" data-id="${r.id}">Reject request</button></div>`);
};
A.admRejectGo = async el => { const reason = $('#adm-reason').value.trim(); closeModal(); await admDo(() => DB.adminReject(el.dataset.id, reason), 'Request rejected'); };
A.admExtend = el => {
  const r = admRow(el.dataset.id);
  openModal(`${mHead('Extend ' + r.name, r.activated_at ? `Currently ${admState(r) === 'expired' ? 'expired on' : 'valid until'} ${fdate(new Date(r.expires_at))}. An expired license restarts from today.` : 'Not activated yet; the days are added to the validity.')}
    <div class="mb">${admDaysField('adm-days', 'Add days', 30)}</div>
    <div class="mf"><button class="btn" data-a="closeModal">Cancel</button><button class="btn primary" data-a="admExtendGo" data-id="${r.id}">Extend license</button></div>`);
};
A.admExtendGo = async el => { const days = admDays('adm-days'); if (!days) return toast('Enter the number of days', '', 'warn'); closeModal(); await admDo(() => DB.adminExtend(el.dataset.id, days), `License extended by ${days} days`); };
A.admSuspend = el => { const r = admRow(el.dataset.id); confirmBox('Suspend ' + r.name + '?', 'Everyone in this company is locked out until you reactivate it. Their data is kept.', 'Suspend', () => admDo(() => DB.adminSetActive(r.id, false), 'Company suspended')); };
A.admResume = el => admDo(() => DB.adminSetActive(el.dataset.id, true), 'Company reactivated');
A.admDelete = el => { const r = admRow(el.dataset.id); confirmBox('Delete ' + r.name + '?', 'This permanently deletes the company and all of its customers, quotations, invoices and payments. It cannot be undone. The owner’s login remains but has no workspace.', 'Delete permanently', () => admDo(() => DB.adminDelete(r.id), 'Company deleted')); };
