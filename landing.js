/* ================= landing ================= */
const HERO = { items: [{ n: 'Modular workstation (4-seater)', p: 64500, q: 6 }, { n: 'Glass partition, 12mm', p: 685, q: 420 }, { n: 'LED panel light 2x2', p: 2350, q: 24 }], stage: 0, cat: 'contractor' };
const HERO_STAGES = [['draft', 'Draft'], ['sent', 'Sent'], ['viewed', 'Viewed'], ['accepted', 'Accepted']];
function heroTotal() { return HERO.items.reduce((s, i) => s + i.p * i.q, 0) * 1.18; }

function tplThumb(t, color) {
  const c = color || t.color;
  const hdStyle = t.id === 'corporate' ? `background:${c};height:26px;margin:-9px -9px 6px` : t.id === 'creative' ? `background:transparent;border-left:6px solid ${c}` : `background:${c};opacity:.9;width:${t.id === 'service' ? 40 : 30}%`;
  return `<div class="tpl-thumb">${t.id === 'creative' ? `<div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:${c}"></div>` : ''}
    <div class="hd" style="${hdStyle}"></div><div class="l" style="width:60%"></div><div class="l" style="width:40%"></div>
    <div class="tb" style="border-color:${t.id === 'wholesale' || t.id === 'corporate' ? '#16213A' : c}">${'<div class="tr"></div>'.repeat(t.id === 'wholesale' ? 8 : 5)}</div>
    <div class="l" style="width:35%;margin-left:auto;margin-top:10px;height:6px;background:${c};opacity:.5"></div>
    ${t.id === 'contractor' ? `<div style="position:absolute;inset:auto 9px 9px;border-top:2px double ${c}"></div>` : ''}
    ${t.id === 'tally' ? `<div class="th-grid" style="border-color:${c}"><i></i><i></i><i></i><i></i><i></i><i></i></div>` : ''}</div>`;
}
const TEMPLATES = [
  { id: 'minimal', name: 'Minimal Professional', desc: 'Clean, quiet, works for anyone', color: '#0E7C66' },
  { id: 'corporate', name: 'Corporate', desc: 'Full-width brand header', color: '#2B5FA6' },
  { id: 'creative', name: 'Creative Agency', desc: 'Bold title, brand spine', color: '#B4412D' },
  { id: 'contractor', name: 'Contractor', desc: 'Ruled tables for BOQs', color: '#9A620F' },
  { id: 'wholesale', name: 'Wholesale', desc: 'Dense rows for long SKU lists', color: '#16213A' },
  { id: 'service', name: 'Service Business', desc: 'Soft panels, light headings', color: '#0E6F87' },
  { id: 'tally', name: 'GST Tax Invoice', desc: 'Boxed Tally layout with HSN summary', color: '#1D2638' },
];

function pageLanding() {
  const root = $('#root');
  document.title = 'QuoteFlow · Create quotations. Win more business.';
  const cats = Object.entries(CATEGORIES);
  root.innerHTML = `<div class="lp">
  <nav class="lp-nav" id="lpnav"><div class="wrap">
    <a class="brand" data-a="go" data-to="#/"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">${IP.logo}</svg></span>QuoteFlow</a>
    <div class="lp-links"><a href="#how" data-a="scrollTo" data-id="how">How it works</a><a data-a="scrollTo" data-id="features" href="#features">Features</a><a data-a="scrollTo" data-id="templates" href="#templates">Templates</a><a data-a="scrollTo" data-id="pricing" href="#pricing">Pricing</a><a data-a="scrollTo" data-id="faq" href="#faq">FAQ</a></div>
    <span class="spacer"></span>
    <button class="btn ghost hide-sm" data-a="go" data-to="#/login">Login</button>
    <button class="btn dark" data-a="go" data-to="#/app/overview">Explore demo</button>
  </div></nav>

  <header class="hero"><div class="wrap">
    <div>
      <h1>Create quotations.<br>Win more business.</h1>
      <p class="lede">Create, send, track, and manage every quotation from one powerful business workspace. Know who opened it, who said yes, and what to follow up on next.</p>
      <div class="cta">
        <button class="btn primary lg" data-a="go" data-to="#/signup">Create your first quotation</button>
        <button class="btn lg" data-a="go" data-to="#/app/overview">Explore demo</button>
      </div>
      <div class="trust"><span>${I('check', 'sm')} GST-ready tax breakdowns</span><span>${I('check', 'sm')} Email and WhatsApp sharing</span><span>${I('check', 'sm')} One click to invoice</span></div>
    </div>
    <div class="stage" aria-label="Interactive quotation preview">
      <div class="dash-peek">
        <div class="row between"><b style="font-size:13px">This month</b><span class="demo-tag">Sample workspace</span></div>
        <div class="kp"><div><small>Quoted</small><b class="num" id="hp-q">₹48.6 L</b></div><div><small>Accepted</small><b class="num" id="hp-a">₹21.9 L</b></div><div><small>Win rate</small><b class="num" id="hp-w">61%</b></div></div>
        <div class="spark">${[38, 52, 44, 61, 57, 70, 64, 78, 72, 84, 80, 92].map((h, i) => `<i style="height:${h}%"><b style="height:${Math.round(h * (0.45 + (i % 3) * .1))}%"></b></i>`).join('')}</div>
      </div>
      <div class="hero-doc" id="hero-doc"></div>
    </div>
  </div></header>

  <section class="band alt" id="categories"><div class="wrap">
    <div class="sec-h"><h2>Built for the way your business quotes</h2><p>Pick your trade and QuoteFlow suggests the fields your customers expect to see, from site locations and labour to hourly rates and bulk shipping terms.</p></div>
    <div class="cats" role="tablist">${cats.map(([k, c]) => `<button class="cat ${HERO.cat === k ? 'on' : ''}" data-a="lpCat" data-k="${k}" role="tab" aria-selected="${HERO.cat === k}">${I(c.icon)}<h4>${c.label}</h4><p>${c.desc}</p></button>`).join('')}</div>
    <div class="cat-detail" id="cat-detail"></div>
  </div></section>

  <section class="band" id="how"><div class="wrap">
    <div class="sec-h"><h2>From enquiry to invoice in four steps</h2></div>
    <div class="steps">
      <div class="step"><span class="n">Step 1</span><h4>Add the customer</h4><p>Save contact, GSTIN and WhatsApp number once. Every quotation after that fills in by itself.</p></div>
      <div class="step"><span class="n">Step 2</span><h4>Build the quotation</h4><p>Pull items from your catalogue, adjust quantities and discounts, and watch taxes and totals update as you type.</p></div>
      <div class="step"><span class="n">Step 3</span><h4>Send and track</h4><p>Share by email or WhatsApp with a secure link. See when it’s opened and get nudged to follow up.</p></div>
      <div class="step"><span class="n">Step 4</span><h4>Win and invoice</h4><p>Customers accept online. Turn the accepted quotation into an order and invoice without retyping a line.</p></div>
    </div>
  </div></section>

  <section class="band alt" id="features"><div class="wrap feature">
    <div class="copy"><h2>Quotations that look as good as your work</h2><p>A builder with sections, item-level discounts, GST slabs, shipping and advance payments, beside a live A4 preview of exactly what your customer will see.</p>
      <ul class="ticks"><li>${I('check')}Catalogue items, custom lines and section headings</li><li>${I('check')}Drag to reorder, duplicate past quotations</li><li>${I('check')}Totals in figures and words, tax split by rate</li></ul>
      <button class="btn primary" style="margin-top:24px" data-a="go" data-to="#/app/quotations/new">Open the builder</button></div>
    <div class="shot">
      <table class="tbl"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">GST</th><th class="r">Amount</th></tr></thead><tbody>
        <tr><td><b style="font-weight:500">Ergonomic task chair</b><div class="muted" style="font-size:12px">Mesh back, synchro tilt</div></td><td class="r num">24</td><td class="r num">₹11,800</td><td class="r">18%</td><td class="r num">₹2,83,200</td></tr>
        <tr><td><b style="font-weight:500">Carpet tiles (nylon)</b><div class="muted" style="font-size:12px">50x50 cm, installed</div></td><td class="r num">180 sq m</td><td class="r num">₹1,180</td><td class="r">12%</td><td class="r num">₹2,12,400</td></tr>
        <tr><td><b style="font-weight:500">3D visualisation</b><div class="muted" style="font-size:12px">Per view, two revisions</div></td><td class="r num">4</td><td class="r num">₹8,500</td><td class="r">18%</td><td class="r num">₹34,000</td></tr>
      </tbody></table>
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><div style="width:250px;font-size:13px" class="stack"><div class="row between"><span class="muted">Subtotal</span><span class="num">₹5,29,600</span></div><div class="row between"><span class="muted">GST</span><span class="num">₹82,764</span></div><div class="row between" style="border-top:1px solid var(--line);padding-top:8px;font-family:var(--display);font-size:18px;font-weight:600"><span>Total</span><span class="num">₹6,12,364</span></div></div></div>
    </div>
  </div></section>

  <section class="band"><div class="wrap feature flip">
    <div class="copy"><h2>Know which customers are about to say yes</h2><p>Customer intelligence shows every account’s quotation history, win rate and value, so you spend your time on the conversations that close.</p>
      <ul class="ticks"><li>${I('check')}Funnel from customer added to invoice raised</li><li>${I('check')}Segments for high-value, pending and at-risk customers</li><li>${I('check')}Rejection reasons you can actually learn from</li></ul></div>
    <div class="shot">
      <div class="row between" style="margin-bottom:6px"><b>Customer quotation funnel</b><span class="demo-tag">Illustrative</span></div>
      ${[['Total customers', 500, 100, '--ink'], ['Received quotations', 320, 64, '--blue'], ['Viewed quotation', 240, 48, '--cyan'], ['Accepted', 145, 29, '--accent'], ['Rejected', 95, 19, '--red']].map(([l, v, w, c]) => `<div class="funnel-row"><span>${l}</span><div class="fb"><i style="width:${w}%;background:var(${c})"></i></div><b class="num" style="text-align:right">${v}</b></div>`).join('')}
    </div>
  </div></section>

  <section class="band alt"><div class="wrap feature">
    <div class="copy"><h2>Send on the channel your customer actually reads</h2><p>A pre-written email with the PDF attached, or a WhatsApp message with the total and a secure link. Every send lands in the quotation’s communication history.</p>
      <ul class="ticks"><li>${I('check')}Editable templates with CC, BCC and multiple recipients</li><li>${I('check')}Number validation before you share</li><li>${I('check')}Copy link, SMS, Telegram and print when you need them</li></ul></div>
    <div class="shot" style="display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center">
      <div class="mail-card"><div class="mh"><span>To</span><b>ananya.sharma@lumen.in</b><span>Subject</span><b>Quotation #QT-1024 from Meridian Works</b></div>
        <p>Hi Ananya,</p><p style="margin-top:8px">Thank you for the walkthrough on Tuesday. Please find our quotation for the reception redesign attached.</p>
        <div class="attach" style="margin-top:12px"><span class="pdf">PDF</span><div><b style="font-weight:500">QT-1024.pdf</b><div class="muted" style="font-size:12px">2 pages</div></div></div></div>
      <div class="phone hide-sm"><div class="ph-top">${av('Ananya Sharma', 'xs')} Ananya Sharma</div><div class="bubble">Hi Ananya, here is quotation <b>QT-1024</b> for the reception redesign.<span class="lk"><b>Total: ₹6,12,364</b><br>View securely: qflow.link/q/7Hk2</span>Valid till 17 Oct.</div></div>
    </div>
  </div></section>

  <section class="band"><div class="wrap feature flip">
    <div class="copy"><h2>Accepted today, invoiced today</h2><p>When a customer accepts, the quotation becomes a sales order and an invoice with the same items, taxes and terms. Payment status follows it through to paid.</p></div>
    <div class="shot"><div class="convert">
      <div class="mini-doc"><h5>Quotation QT-1024</h5><div class="ln"></div><div class="ln" style="width:70%"></div><div class="ln" style="width:85%"></div><span class="stamp accepted" style="right:10px;top:26px;font-size:13px;padding:3px 8px">Accepted</span></div>
      <span style="color:var(--muted)">${I('arrowr')}</span>
      <div class="mini-doc"><h5>Sales order SO-388</h5><div class="ln"></div><div class="ln" style="width:60%"></div><p class="muted" style="font-size:12px;margin-top:8px">Confirmed</p></div>
      <span style="color:var(--muted)">${I('arrowr')}</span>
      <div class="mini-doc"><h5>Invoice INV-642</h5><div class="ln"></div><div class="ln" style="width:75%"></div><p style="font-size:12px;margin-top:8px">${badge('paid', 'Paid')}</p></div>
    </div></div>
  </div></section>

  <section class="band alt"><div class="wrap feature">
    <div class="copy"><h2>Your price list, ready to quote</h2><p>Keep products and services with SKUs, units, GST rates and cost price. See which ones get quoted most and which ones actually win.</p></div>
    <div class="shot"><table class="tbl"><thead><tr><th>Item</th><th>SKU</th><th class="r">Price</th><th class="r">Win rate</th></tr></thead><tbody>
      ${[['Modular workstation', 'MW-WS4', '₹64,500 / set', 62], ['Glass partition', 'MW-GP12', '₹685 / sq ft', 58], ['Project management fee', 'SV-PMF', '₹45,000 / month', 71], ['Acoustic wall panels', 'MW-AP09', '₹420 / sq ft', 49]].map(r => `<tr><td>${r[0]}</td><td class="muted">${r[1]}</td><td class="r num">${r[2]}</td><td class="r"><span class="bar-mini"><i style="width:${r[3]}%"></i></span><span class="num">${r[3]}%</span></td></tr>`).join('')}
    </tbody></table></div>
  </div></section>

  <section class="band"><div class="wrap feature flip">
    <div class="copy"><h2>A pipeline that moves with every quotation</h2><p>Leads move from first contact to converted as quotations are sent, viewed and answered. Drag a card when a conversation moves offline.</p></div>
    <div class="shot"><div class="kanban-peek">
      ${[['Contacted', [['Banyan Clinics', '₹3.2 L']]], ['Quotation sent', [['Zenith Labs', '₹8.9 L'], ['Orbit Foods', '₹1.4 L']]], ['Negotiation', [['Aurum Realty', '₹14.6 L']]], ['Accepted', [['Indus Logistics', '₹5.1 L']]]].map(([h, cs]) => `<div class="col"><h6>${h}<span class="muted">${cs.length}</span></h6>${cs.map(c => `<div class="cd"><b style="font-weight:600">${c[0]}</b><div class="muted num">${c[1]}</div></div>`).join('')}</div>`).join('')}
    </div></div>
  </div></section>

  <section class="band alt" id="templates"><div class="wrap">
    <div class="sec-h"><h2>Six templates, your brand on all of them</h2><p>Choose a layout, set your colour, font and terms once. Every quotation after that looks like it came from your design team.</p></div>
    <div class="tpl-strip">${TEMPLATES.map(t => `<button class="tpl-card" data-a="go" data-to="#/app/templates">${tplThumb(t)}<div class="nm">${t.name}</div><div class="ds">${t.desc}</div></button>`).join('')}</div>
  </div></section>

  <section class="band" id="pricing"><div class="wrap">
    <div class="sec-h"><h2>Simple pricing</h2><p>Illustrative plans for this prototype. Start free and upgrade when your team grows.</p></div>
    <div class="pricing">
      ${[['Starter', '₹0', 'For freelancers getting started', ['25 quotations a month', 'Email and WhatsApp sharing', '2 templates', 'Customer list'], 'Start free', ''],
    ['Business', '₹799', 'For growing teams that quote daily', ['Unlimited quotations', 'Customer intelligence and pipeline', 'All templates and branding', 'Quotation to invoice', '5 team members'], 'Try the demo', 'hl'],
    ['Enterprise', 'Custom', 'For multi-branch businesses', ['Multiple workspaces', 'Roles and approvals', 'Custom numbering and taxes', 'Priority onboarding'], 'Talk to us', '']].map(([n, p, d, f, b, hl]) => `
        <div class="plan ${hl}"><h4>${n}</h4><p class="muted" style="font-size:13px">${d}</p><div class="pr">${p}${p.startsWith('₹') && p !== '₹0' ? '<small> / user / month</small>' : p === '₹0' ? '<small> forever</small>' : ''}</div>
        <ul>${f.map(x => `<li>${I('check', 'sm')}${x}</li>`).join('')}</ul>
        <button class="btn ${hl ? 'primary' : ''}" data-a="go" data-to="#/app/overview">${b}</button></div>`).join('')}
    </div>
  </div></section>

  <section class="band alt" id="faq"><div class="wrap">
    <div class="sec-h"><h2>Questions businesses ask</h2></div>
    <div class="faq">
      ${[['Does QuoteFlow work for my kind of business?', 'Yes. Pick a business category and QuoteFlow suggests the right fields: site location and labour for contractors, hourly rates for freelancers, MOQs and shipping for wholesalers. Everything stays editable.'],
    ['Can my customers accept a quotation online?', 'Each quotation has a secure page where your customer can view it, accept it, decline it with a reason, or ask for changes. Their response updates your dashboard straight away.'],
    ['How does WhatsApp sharing work?', 'QuoteFlow prepares a message with the quotation number, total and a secure link, and opens WhatsApp with it ready to send from your number. In this prototype the send is simulated.'],
    ['Is GST handled?', 'Set a GST rate per item, see CGST/SGST or IGST split on the document, and add your GSTIN to every quotation and invoice.'],
    ['Can I convert a quotation into an invoice?', 'Yes. Accepted quotations turn into a sales order and invoice with one click, carrying over items, taxes and terms.'],
    ['Is this the live product?', 'This is an interactive prototype with sample data. Nothing is emailed, messaged, charged or stored on a server.']].map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary>${q}${I('plus')}</summary><p>${a}</p></details>`).join('')}
    </div>
  </div></section>

  <section class="band"><div class="wrap"><div class="final-cta"><div><h2>Send your next quotation in minutes</h2><p>Explore a workspace filled with sample customers, quotations and invoices.</p></div><div class="row wrap"><button class="btn primary lg" data-a="go" data-to="#/signup">Create your first quotation</button><button class="btn lg" style="background:transparent;color:var(--bg);border-color:rgba(255,255,255,.3)" data-a="go" data-to="#/app/overview">Explore demo</button></div></div></div></section>

  <footer class="lp-foot"><div class="wrap">
    <div class="foot-grid">
      <div><a class="brand" data-a="go" data-to="#/" style="margin-bottom:12px"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">${IP.logo}</svg></span>QuoteFlow</a><p class="muted" style="max-width:30ch;margin-top:10px">Quotations, customers and invoices for businesses of every size.</p></div>
      <div><h6>Product</h6><a data-a="go" data-to="#/app/quotations/new">Quotation builder</a><a data-a="go" data-to="#/app/customers">Customer intelligence</a><a data-a="go" data-to="#/app/pipeline">Sales pipeline</a><a data-a="go" data-to="#/app/invoices">Invoices</a></div>
      <div><h6>For</h6><a data-a="scrollTo" data-id="categories">Contractors</a><a data-a="scrollTo" data-id="categories">Agencies</a><a data-a="scrollTo" data-id="categories">Wholesalers</a><a data-a="scrollTo" data-id="categories">Freelancers</a></div>
      <div><h6>Resources</h6><a data-a="go" data-to="#/app/templates">Templates</a><a data-a="scrollTo" data-id="faq">FAQ</a><a data-a="scrollTo" data-id="pricing">Pricing</a></div>
      <div><h6>Company</h6><a data-a="toastDemo" data-msg="About page is not part of this prototype">About</a><a data-a="toastDemo" data-msg="Contact form is not part of this prototype">Contact</a><a data-a="toastDemo" data-msg="Privacy policy is not part of this prototype">Privacy</a></div>
    </div>
    <div class="foot-base"><span>© 2026 QuoteFlow. Prototype with sample data.</span><span>Made for businesses in India and beyond</span></div>
  </div></footer></div>`;
  renderHeroDoc(); renderCatDetail();
  const nav = $('#lpnav'); const onS = () => nav && nav.classList.toggle('scrolled', scrollY > 8); window.onscroll = onS; onS();
  clearInterval(UI.heroTimer);
  UI.heroTimer = setInterval(() => { if (!$('#hero-doc')) return clearInterval(UI.heroTimer); if (HERO.auto !== false) { HERO.stage = (HERO.stage + 1) % 4; renderHeroDoc(true); } }, 2600);
  return {};
}
function renderHeroDoc(hit) {
  const d = $('#hero-doc'); if (!d) return;
  const [st, lbl] = HERO_STAGES[HERO.stage];
  const tot = heroTotal();
  d.innerHTML = `<div class="dh"><div><small>Quotation</small><h4>QT-1024 · Reception redesign</h4><small>Lumen Clinics, Pune</small></div><span class="ws-logo" style="background:#0E7C66">MW</span></div>
    ${HERO.stage ? `<span class="stamp ${st} ${hit ? 'hit' : ''}">${lbl}<small>${HERO.stage === 3 ? 'by Ananya S.' : HERO.stage === 2 ? 'opened 2×' : 'via WhatsApp'}</small></span>` : ''}
    <div class="items">${HERO.items.map((it, i) => `<div class="it"><span>${it.n}</span><span class="stepper"><button data-a="heroQty" data-i="${i}" data-d="-1" aria-label="Decrease">−</button><span>${it.q}</span><button data-a="heroQty" data-i="${i}" data-d="1" aria-label="Increase">+</button></span><span style="text-align:right" class="num">₹${Math.round(it.p * it.q).toLocaleString('en-IN')}</span></div>`).join('')}</div>
    <div class="tot"><small>Total incl. 18% GST</small><b>₹${Math.round(tot).toLocaleString('en-IN')}</b></div>
    <div class="acts"><button class="btn sm" data-a="heroStage" data-s="1">${I('mail', 'sm')} Email</button><button class="btn sm" data-a="heroStage" data-s="1">${I('wa', 'sm')} WhatsApp</button><span class="spacer"></span><button class="btn sm primary" data-a="heroStage" data-s="3">Customer accepts</button></div>
    <div class="flow-dots">${HERO_STAGES.map((s, i) => `<i class="${i <= HERO.stage ? 'on' : ''}"></i>`).join('')}<span style="margin-left:4px">${lbl}</span></div>`;
  const q = $('#hp-q'); if (q) { q.textContent = '₹' + ((4200000 + tot) / 1e5).toFixed(1) + ' L'; $('#hp-a').textContent = '₹' + ((1580000 + (HERO.stage === 3 ? tot : 0)) / 1e5).toFixed(1) + ' L'; $('#hp-w').textContent = (HERO.stage === 3 ? 63 : 61) + '%'; }
}
A.heroQty = el => { const it = HERO.items[+el.dataset.i]; const step = it.p < 1000 ? 20 : 1; it.q = Math.max(step, it.q + (+el.dataset.d) * step); HERO.auto = false; HERO.stage = 0; renderHeroDoc(); };
A.heroStage = el => { HERO.auto = false; HERO.stage = +el.dataset.s; renderHeroDoc(true); if (HERO.stage === 1) setTimeout(() => { HERO.stage = 2; renderHeroDoc(true); }, 1100); };
A.lpCat = el => { HERO.cat = el.dataset.k; $$('.cat').forEach(c => { c.classList.toggle('on', c.dataset.k === HERO.cat); c.setAttribute('aria-selected', c.dataset.k === HERO.cat); }); renderCatDetail(); };
function renderCatDetail() { const c = CATEGORIES[HERO.cat]; const d = $('#cat-detail'); if (d) d.innerHTML = `<span class="muted">Suggested fields for ${c.label.toLowerCase()}s:</span>${c.fields.map(f => `<span class="badge nodot s-draft">${f[1]}</span>`).join('')}<button class="btn sm" data-a="lpUseCat" data-k="${HERO.cat}">Try it in the builder</button>`; }
A.lpUseCat = el => { S.settings.category = el.dataset.k; go('#/app/quotations/new'); };
A.scrollTo = el => { const t = document.getElementById(el.dataset.id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
