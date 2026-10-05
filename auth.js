/* ================= sign-up, login, license ================= */
/* GST state codes, used for the company's place of supply */
const GST_STATES = [['Andaman and Nicobar Islands', '35'], ['Andhra Pradesh', '37'], ['Arunachal Pradesh', '12'], ['Assam', '18'], ['Bihar', '10'], ['Chandigarh', '04'], ['Chhattisgarh', '22'], ['Dadra and Nagar Haveli and Daman and Diu', '26'], ['Delhi', '07'], ['Goa', '30'], ['Gujarat', '24'], ['Haryana', '06'], ['Himachal Pradesh', '02'], ['Jammu and Kashmir', '01'], ['Jharkhand', '20'], ['Karnataka', '29'], ['Kerala', '32'], ['Ladakh', '38'], ['Lakshadweep', '31'], ['Madhya Pradesh', '23'], ['Maharashtra', '27'], ['Manipur', '14'], ['Meghalaya', '17'], ['Mizoram', '15'], ['Nagaland', '13'], ['Odisha', '21'], ['Puducherry', '34'], ['Punjab', '03'], ['Rajasthan', '08'], ['Sikkim', '11'], ['Tamil Nadu', '33'], ['Telangana', '36'], ['Tripura', '16'], ['Uttar Pradesh', '09'], ['Uttarakhand', '05'], ['West Bengal', '19']];
const authDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function authCard(title, sub, body, wide) {
  $('#root').innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px">
    <div class="panel" style="width:100%;max-width:${wide ? 560 : 420}px"><div class="panel-b" style="display:flex;flex-direction:column;gap:16px;padding:24px">
      <a class="brand" data-a="go" data-to="#/"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">${IP.logo}</svg></span>QuoteFlow</a>
      <div><h3 style="font-size:18px;font-weight:600">${esc(title)}</h3>${sub ? `<p class="muted" style="margin-top:4px">${sub}</p>` : ''}</div>
      ${body}
    </div></div></div>`;
}
const authField = (id, label, attrs = '', hint = '') => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" ${attrs}>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
const authErr = () => `<div class="hint err" id="auth-err" role="alert" style="display:none"></div>`;
function authFail(msg) { const el = $('#auth-err'); if (el) { el.textContent = msg; el.style.display = ''; } }
/* disables the submit button while a request is running; returns a function that restores it */
function authBusy(el, label) { const old = el.innerHTML; el.disabled = true; el.textContent = label; const e = $('#auth-err'); if (e) e.style.display = 'none'; return () => { el.disabled = false; el.innerHTML = old; }; }
const authLogoutBtn = `<button class="btn ghost" data-a="authLogout">Log out</button>`;

function pageAuth(mode) {
  const at = location.hash;
  document.title = ({ signup: 'Create your workspace', login: 'Login', status: 'Your workspace' })[mode] + ' · QuoteFlow';
  authCard('One moment', '', `<p class="muted">Loading…</p>`);
  (async () => {
    const session = await DB.session();
    let ws = null;
    if (session) ws = await DB.workspace();
    if (location.hash !== at) return;                       // the user moved on while we were asking
    if (mode === 'login') return session ? go('#/status') : authLoginForm();
    if (mode === 'signup') return !session ? authSignupForm(false) : ws.state === 'none' ? authSignupForm(true) : go('#/status');
    if (!session) return go('#/login');
    if (ws.state === 'none') return go('#/signup');
    if (ws.state === 'admin') return go('#/admin');
    authStatus(ws, session.user.email);
  })().catch(e => { if (location.hash === at) authCard('Something went wrong', esc(e.message), `<div class="row"><button class="btn" data-a="authRefresh">Try again</button><button class="btn ghost" data-a="go" data-to="#/">Back to website</button></div>`); });
}

function authLoginForm() {
  authCard('Login', 'Sign in to your company workspace.', `<form style="display:flex;flex-direction:column;gap:12px">
    ${authField('au-email', 'Email', 'type="email" autocomplete="username" autofocus')}
    ${authField('au-pass', 'Password', 'type="password" autocomplete="current-password"')}
    ${authErr()}
    <button class="btn primary lg" type="submit" data-a="authLogin">Login</button>
  </form>
  <div class="row between"><button class="btn ghost" data-a="go" data-to="#/">${I('left', 'sm')} Back to website</button><button class="btn ghost" data-a="go" data-to="#/signup">Create a workspace</button></div>`);
}

/* companyOnly: the login already exists (sign-up went through but the company step did not), so ask for the company alone */
function authSignupForm(companyOnly) {
  authCard('Create your workspace', 'Tell us about your business. We review every request before the workspace opens.', `<form style="display:flex;flex-direction:column;gap:12px">
    <div class="grid2">
      ${authField('au-name', 'Your name', 'autocomplete="name" autofocus')}
      ${authField('au-phone', 'Phone', 'type="tel" autocomplete="tel"')}
    </div>
    ${authField('au-company', 'Company name', 'autocomplete="organization"', 'The name your customers know you by.')}
    ${authField('au-legal', 'Legal name (optional)', '', 'As registered, e.g. ABC Industries Pvt. Ltd.')}
    <div class="grid2">
      <div class="field"><label for="au-cat">Business type</label><select class="select" id="au-cat">${Object.entries(CATEGORIES).map(([k, c]) => `<option value="${k}" ${k === 'services' ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="au-state">State</label><select class="select" id="au-state">${GST_STATES.map(([n, c]) => `<option value="${c}" ${c === '27' ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    </div>
    <div class="grid2">
      ${authField('au-city', 'City')}
      ${authField('au-gstin', 'GSTIN (optional)', 'maxlength="15" style="text-transform:uppercase"')}
    </div>
    ${companyOnly ? '' : `<div class="grid2">
      ${authField('au-email', 'Email', 'type="email" autocomplete="username"')}
      ${authField('au-pass', 'Password', 'type="password" autocomplete="new-password"', 'At least 8 characters.')}
    </div>`}
    ${authErr()}
    <button class="btn primary lg" type="submit" data-a="authSignup">Submit request</button>
  </form>
  <div class="row between"><button class="btn ghost" data-a="go" data-to="#/">${I('left', 'sm')} Back to website</button>${companyOnly ? authLogoutBtn : `<button class="btn ghost" data-a="go" data-to="#/login">I already have a login</button>`}</div>`, true);
}

function authStatus(ws, email) {
  const co = `<b>${esc(ws.company_name || 'your company')}</b>`;
  const foot = extra => `<div class="row between"><div class="row">${extra || ''}</div>${authLogoutBtn}</div><p class="hint">Signed in as ${esc(email)}</p>`;
  const again = `<button class="btn" data-a="authRefresh">Check again</button>`;
  const canKey = ws.role === 'owner' || ws.role === 'admin';
  const S_ = {
    pending: ['Request under review', `We have received the request for ${co}. Once it is approved you will be given a license key to open the workspace.`, foot(again)],
    rejected: ['Request not approved', `The request for ${co} was not approved.${ws.reject_reason ? ' Reason: ' + esc(ws.reject_reason) : ''} Contact us if you think this is a mistake.`, foot()],
    suspended: ['Workspace suspended', `Access to ${co} has been paused. Your data is kept. Contact us to restore access.`, foot(again)],
    expired: ['License expired', `The license for ${co} ended on ${ws.expires_at ? authDate(ws.expires_at) : 'its expiry date'}. Your data is kept. Contact us to renew, then check again.`, foot(again)],
    needs_key: canKey
      ? ['Enter your license key', `The request for ${co} is approved. Enter the license key you were given to open the workspace.`,
        `<form style="display:flex;flex-direction:column;gap:12px">${authField('au-key', 'License key', 'placeholder="QF-XXXXX-XXXXX-XXXXX-XXXXX" autocomplete="off" autofocus style="text-transform:uppercase;font-family:ui-monospace,monospace"')}${authErr()}<button class="btn primary lg" type="submit" data-a="authKey">Activate workspace</button></form>${foot()}`]
      : ['Workspace not activated yet', `${co} is approved but its license key has not been entered. Ask the workspace owner to activate it.`, foot(again)],
    active: ['Workspace is active', `${co} is licensed until <b>${authDate(ws.expires_at)}</b>. `, foot(`<button class="btn primary" data-a="authOpen">Open workspace</button>`)],
  };
  const [title, sub, body] = S_[ws.state] || ['Unknown status', esc(ws.state), foot(again)];
  authCard(title, sub, body);
}

A.authRefresh = () => route();
/* a reload brings the demo data back after a live session */
A.authLogout = async () => { await DB.signOut(); const live = S.live; location.hash = '#/'; if (live) location.reload(); };
A.authOpen = async el => {
  const done = authBusy(el, 'Opening…');
  try { await enterLive(await DB.workspace()); go('#/app/overview'); }
  catch (e) { done(); toast('Could not open the workspace', e.message, 'err'); }
};
A.authLogin = async el => {
  const email = $('#au-email').value.trim(), pass = $('#au-pass').value;
  if (!email || !pass) return authFail('Enter your email and password.');
  const done = authBusy(el, 'Signing in…');
  try { await DB.signIn(email, pass); go('#/status'); }
  catch (e) { done(); authFail(/invalid login/i.test(e.message) ? 'Wrong email or password.' : e.message); }
};
A.authSignup = async el => {
  const v = id => ($('#' + id)?.value || '').trim();
  const st = $('#au-state');
  const f = { name: v('au-name'), phone: v('au-phone'), company: v('au-company'), legal: v('au-legal'), category: v('au-cat'), stateCode: st.value, state: st.options[st.selectedIndex].text, city: v('au-city'), gstin: v('au-gstin').toUpperCase() };
  const needLogin = !!$('#au-email'), email = v('au-email'), pass = $('#au-pass')?.value || '';
  if (!f.name || !f.company || !f.phone) return authFail('Your name, phone and company name are required.');
  if (f.gstin && !/^\d{2}[A-Z0-9]{13}$/.test(f.gstin)) return authFail('A GSTIN has 15 characters and starts with the two-digit state code.');
  if (needLogin && (!/^\S+@\S+\.\S+$/.test(email) || pass.length < 8)) return authFail('Enter a valid email and a password of at least 8 characters.');
  const done = authBusy(el, 'Submitting…');
  try {
    if (needLogin && !(await DB.signUp(email, pass, f.name))) { done(); return authFail('Your login was created but needs email confirmation. Open the link we emailed you, then log in to finish.'); }
    /* someone invited to an existing team already has a seat: no company to register */
    if (needLogin && (await DB.workspace()).state !== 'none') return go('#/status');
    await DB.registerCompany(f);
    go('#/status');
  } catch (e) {
    /* the login may exist by now even though the company step failed: re-render so the form asks for the company alone */
    if (needLogin && await DB.session()) { route(); setTimeout(() => authFail(e.message), 400); return; }
    done(); authFail(/already registered/i.test(e.message) ? 'This email already has a login. Use Login instead.' : e.message);
  }
};
A.authKey = async el => {
  const key = $('#au-key').value.trim();
  if (!key) return authFail('Paste the license key you were given.');
  const done = authBusy(el, 'Activating…');
  try { await DB.activateLicense(key); toast('Workspace activated'); route(); }
  catch (e) { done(); authFail(e.message); }
};

/* ================= live workspace ================= */
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', sales_manager: 'Sales Manager', sales_executive: 'Sales Executive', accountant: 'Accountant', viewer: 'Viewer' };
const LIVE_COUNTERS = { quotation: ['prefix', 'nextNo'], order: ['ordPrefix', 'ordNext'], invoice: ['invPrefix', 'invNext'], challan: ['dcPrefix', 'dcNext'], credit_note: ['cnPrefix', 'cnNext'], debit_note: ['dnPrefix', 'dnNext'], payment: ['rcptPrefix', 'rcptNext'] };

/* a companies row -> S.settings */
function applyCompany(c) {
  const s = S.settings;
  Object.assign(s, {
    bizName: c.name, legal: c.legal_name || c.name, tagline: c.tagline || '', email: c.email || '', phone: c.phone || '', website: c.website || '',
    address: c.address || '', city: [c.city, [c.state, c.pin].filter(Boolean).join(' ')].filter(Boolean).join(', '), gstin: c.gstin || '',
    currency: c.currency, category: c.category, defaultTax: +c.default_tax, taxLabel: c.tax_label, taxInclusive: c.tax_inclusive,
    validity: c.validity_days, template: c.template, brand: c.brand_color, font: c.font, header: c.header_style,
    footer: c.footer_text || '', terms: c.terms || '', paymentTerms: c.payment_terms || '',
    bank: { accName: c.bank_account_name || '', bankName: c.bank_name || '', acc: c.bank_account_no || '', ifsc: c.bank_ifsc || '', branch: c.bank_branch || '', upi: c.upi_id || '', qr: c.show_upi_qr },
    showBank: c.show_bank_on_invoice, roundOff: c.round_off, state: c.state, stateCode: c.state_code || '', termsCode: c.default_terms_code,
    notif: c.notification_prefs || {}, workspace: c.id,
  });
  const x = c.extra || {};
  for (const k in x) if (k !== 'cityLine') s[k] = x[k];
  if (x.cityLine != null) s.city = x.cityLine;
  if (c.item_columns && c.item_columns.length) s.itemCols = c.item_columns; else delete s.itemCols;
  if (c.item_flat_tax != null) s.itemFlatTax = +c.item_flat_tax;
}
const LIVE_LISTS = ['products', 'customers', 'quotes', 'invoices', 'orders', 'followups', 'leads', 'notes', 'notifications', 'payments', 'receipts', 'challans', 'cnotes', 'dnotes', 'audit'];

/* ---------- permissions ---------- */
/* The database is the real check (0002_rbac.sql). This mirrors it so people are told before they try. */
const canDo = perm => !S.live || !S.perms || S.perms.has(perm);
const ACT_PERM = {
  'quotes.create': ['dupQ', 'bSave', 'bSend', 'newQFor', 'leadQuote', 'prodUse', 'extendQ', 'setStatus', 'markQ', 'applyTplDrafts'],
  'quotes.send': ['shareQ', 'bulkSend', 'shSendEmail', 'shSendWA', 'custSend', 'sendReminder'],
  'quotes.delete': ['delQ', 'bulkDelete'],
  'customers.manage': ['addCustomer', 'editCustomer', 'addNote', 'delNote', 'creditEdit'],
  'products.manage': ['productEdit', 'prodDup', 'prodDel', 'prodToggle'],
  'orders.manage': ['poEdit', 'ordStatus', 'ordDelivery'],
  'challans.manage': ['dcNew', 'dcStatus', 'dcSetStatus', 'dcReceived'],
  'invoices.manage': ['convertQ', 'pickConvert', 'ordInvoice', 'invSend', 'invRemind', 'invVoid', 'invDue', 'invAttach', 'attDel', 'invRemindSend'],
  'payments.record': ['invPay', 'invPaid'],
  'notes.manage': ['cnNew', 'dnNew'],
  'settings.manage': ['pickTpl', 'setBrand', 'setSv', 'rmLogo', 'setSvN', 'setTog', 'notifTog', 'permTog', 'setBankTog', 'setS', 'brandPick', 'logoUp', 'setBank', 'setSN', 'wsName'],
  'team.manage': ['invite', 'rmMember', 'reinvite', 'teamRole'],
};
const PERM_OF = Object.fromEntries(Object.entries(ACT_PERM).flatMap(([p, list]) => list.map(a => [a, p])));
const ROUTE_PERM = [[/^#\/app\/quotations\/(new|[^/]+\/edit)$/, 'quotes.create'], [/^#\/app\/reports$/, 'reports.view']];
const NAV_PERM = { reports: 'reports.view' };
/* true when the action may run; otherwise tells the user why not */
function allowed(action) {
  const p = PERM_OF[action];
  if (!p || canDo(p)) return true;
  toast('Your role cannot do this', `Ask the workspace owner for the "${p}" permission.`, 'warn');
  return false;
}

/* Swaps the demo dataset for a company: real profile, counters, team and permissions.
   liveLoad() in live.js then fills the records and starts saving changes.
   ws.admin is set when a platform admin opens a client's workspace from #/admin. */
async function enterLive(ws) {
  if (ws.state !== 'active' && !ws.admin) throw new Error('This workspace is not active.');
  const { company: c, counters, members, perms } = await DB.loadWorkspace(ws.company_id);
  const session = await DB.session();
  /* the template gallery needs one document to preview until the company has its own */
  if (!S.sampleQuote) { S.sampleQuote = sampleDoc(); S.sampleCust = cust(S.sampleQuote.cid); }
  for (const k of LIVE_LISTS) S[k].length = 0;
  applyCompany(c);
  for (const r of counters) { const m = LIVE_COUNTERS[r.kind]; if (m) { S.settings[m[0]] = r.prefix; S.settings[m[1]] = r.next_no; } }

  const team = members.map(m => ({ mid: m.id, user: m.user_id, key: m.role, id: m.user_id || m.invited_email, name: (m.profiles && m.profiles.full_name) || (m.extra && m.extra.name) || m.invited_email || 'Team member', role: ROLE_LABEL[m.role] || m.role, email: (m.profiles && m.profiles.email) || m.invited_email || '', status: m.status, last: m.status === 'invited' ? 'Invite pending' : '' }));
  SALES.length = 0; SALES.push(...team.filter(t => t.user).map(({ id, name, role, email }) => ({ id, name, role, email })));
  S.team = team;
  const me = team.find(t => t.id === session.user.id);
  ME.name = me ? me.name || session.user.email : 'Platform admin'; ME.email = session.user.email;
  ME.id = me ? me.id : (SALES[0] || {}).id;                 // default salesperson on new documents
  /* owners, admins and platform admins pass every check; everyone else gets their role's row of the grid */
  S.perms = !me || ['owner', 'admin'].includes(me.key) ? null : new Set(perms.filter(p => p.role === me.key && p.allowed).map(p => p.permission));
  S.workspaces = [{ id: c.id, name: c.name, sub: [c.city || c.state, ws.admin ? 'Admin view' : 'Live workspace'].join(' · '), color: c.brand_color, init: initials(c.name) }];
  S.license = ws; S.live = true;
  await liveLoad(c.id, session.user.id);
  $('.app')?.remove();                                      // the shell is rebuilt with the live footer
}

/* A customer opening a share link, with no login: one quotation, read through portal_get().
   The quotation's id is set to the token so the portal screen and its handlers find it by the URL. */
async function enterGuest(token) {
  const d = await sbRpc('portal_get', { p_token: token });
  if (!d) return false;
  for (const k of LIVE_LISTS) S[k].length = 0;
  applyCompany(d.company);
  const c = lvUnpack(d.customer, M_CUSTOMER);
  const q = lvNest(lvUnpack(d.quotation, M_QUOTE), true);
  q.items = d.items.map(r => lvUnpack(r, M_ITEM)); q.comms = []; q.id = token; q.cid = c.id;
  q.feedback = d.feedback.length ? d.feedback.map(f => ({ text: [f.area, f.message].filter(Boolean).join(': '), ts: +new Date(f.created_at), by: f.author_name })) : (q.feedback || []);
  S.customers.push(c); S.quotes.push(q); q.total = calcQuote(q).grand;
  SALES.length = 0; SALES.push({ id: q.sp, name: d.salesperson || d.company.name, role: '', email: d.company.email || '' });
  ME.name = c.name; S.guest = token;
  sbRpc('portal_open', { p_token: token, p_user_agent: navigator.userAgent }).catch(() => { });
  return true;
}
/* the customer's answer goes straight to the database; false means it did not arrive */
async function guestRespond(action, f = {}) {
  try { await sbRpc('portal_respond', { p_token: S.guest, p_action: action, p_name: f.name || null, p_reason: f.reason || null, p_area: f.area || null, p_message: f.message || null }); return true; }
  catch (e) { toast('Could not send your response', e.message, 'err'); return false; }
}

/* first paint: a share link opens the customer view; a signed-in user with an active license gets
   their own workspace; everyone else gets the demo */
async function boot() {
  try {
    const session = await DB.session();
    const link = location.hash.match(/^#\/portal\/([0-9a-f]{36})$/);
    if (session) {
      const ws = await DB.workspace();
      if (ws.state === 'active') await enterLive(ws);
      else if (/^#\/app/.test(location.hash)) location.hash = ws.state === 'admin' ? '#/admin' : '#/status';
    }
    if (link && !S.live) await enterGuest(link[1]);
  } catch (e) { console.warn('QuoteFlow: could not restore the session', e); }
  route();
}
