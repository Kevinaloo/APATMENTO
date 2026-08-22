/* ═══════════════════════════════════════════════════════════════════
   CABANA · CAR HIRE  ·  interface  v2
   ───────────────────────────────────────────────────────────────────
   Rules this file holds to:
     1. Nothing is preselected. The guest says where and when; we do
        not guess a city or a route on their behalf.
     2. Real inventory or an honest empty state. Never a demo car.
     3. The route check is a refinement the guest opts into, not a
        gate they must pass before seeing prices.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const E = window.CabanaCarHire;
  if (!E) return;

  const $  = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  /* ── State. Everything null until the guest chooses it. ───────── */
  const S = {
    city:null, start:null, end:null,
    route:null, cls:'all', sort:'price',
    searched:false, loading:false,
    fleet:[], operators:[], source:null,
    vehicle:null, chauffeur:false, insurance:'basic', extras:[]
  };

  const opById = id => S.operators.find(o => o.id === id);
  const days = () => {
    if (!S.start || !S.end) return 0;
    const d = (new Date(S.end) - new Date(S.start)) / 86400000;
    return d > 0 ? Math.round(d) : 0;
  };
  const startDate = () => S.start ? new Date(S.start) : new Date();

  /* ── Theme. Remembered, and honours the system default first. ─── */
  function initTheme() {
    let t = null;
    try { t = localStorage.getItem('cabana-carhire-theme'); } catch (_) {}
    if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(t);
    const btn = $('ch-theme');
    if (btn) btn.addEventListener('click', () => {
      setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }
  function setTheme(t) {
    document.body.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0E0E15' : '#FAFAFC');
    const btn = $('ch-theme');
    if (btn) {
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      btn.innerHTML = t === 'dark'
        ? '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>'
        : '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.8 6.8 0 0 0 11 11Z"/></svg>';
    }
    try { localStorage.setItem('cabana-carhire-theme', t); } catch (_) {}
  }

  /* ── Search form ───────────────────────────────────────────────── */
  function buildSearch() {
    const city = $('ch-city');
    city.innerHTML = '<option value="" selected disabled>Choose a city</option>' +
      E.CITIES.map(c => `<option value="${c.key}">${esc(c.label)}</option>`).join('');
    city.classList.add('is-empty');
    city.addEventListener('change', () => {
      S.city = city.value || null;
      city.classList.remove('is-empty');
      syncGo();
    });

    const today = new Date(); today.setHours(0,0,0,0);
    const iso = d => d.toISOString().slice(0,10);
    const from = $('ch-from'), to = $('ch-to');
    from.min = iso(today); to.min = iso(today);

    from.addEventListener('change', () => {
      S.start = from.value || null;
      if (S.start) {
        to.min = S.start;
        if (S.end && new Date(S.end) <= new Date(S.start)) { to.value = ''; S.end = null; }
      }
      syncGo();
    });
    to.addEventListener('change', () => { S.end = to.value || null; syncGo(); });

    $('ch-form').addEventListener('submit', ev => { ev.preventDefault(); search(); });
  }

  function syncGo() {
    const ok = !!(S.city && S.start && S.end && days() > 0);
    $('ch-go').disabled = !ok;
    const m = $('ch-meta');
    if (S.start && S.end && days() > 0) {
      const season = E.seasonFor(startDate());
      m.innerHTML = `<span><b>${days()}</b> ${days() === 1 ? 'day' : 'days'}</span>` +
                    `<span>&middot;</span><span>${esc(season.label)}</span>`;
    } else {
      m.innerHTML = '<span>Pick your dates to see availability and the full price.</span>';
    }
  }

  /* ── Optional route refinement ─────────────────────────────────── */
  function buildRefine() {
    const rail = $('ch-routes');
    rail.innerHTML = `<button type="button" class="ch-chip" data-r="" aria-pressed="true">Any road</button>` +
      E.ROUTES.map(r => `<button type="button" class="ch-chip" data-r="${r.key}" aria-pressed="false">${esc(r.label)}</button>`).join('');
    rail.addEventListener('click', ev => {
      const b = ev.target.closest('.ch-chip'); if (!b) return;
      S.route = b.dataset.r || null;
      rail.querySelectorAll('.ch-chip').forEach(x =>
        x.setAttribute('aria-pressed', String(x === b)));
      renderDemands(); if (S.searched) renderGrid();
    });
    renderDemands();
  }

  function renderDemands() {
    const box = $('ch-demands');
    if (!S.route) {
      box.innerHTML = `<p class="ch-fact-t">Pick the road you are actually driving and we will check
        each vehicle's ground clearance, drivetrain and fuel range against it, in the season you travel.</p>`;
      return;
    }
    const r = E.ROUTE_BY_KEY[S.route], season = E.seasonFor(startDate());
    box.innerHTML = `<div class="ch-facts">
      <div class="ch-fact"><div class="ch-fact-n">${r.clearance_mm}<span style="font-size:11px">mm</span></div>
        <div class="ch-fact-t"><b>Clearance needed</b>${esc(r.note)}</div></div>
      <div class="ch-fact"><div class="ch-fact-n">${r.km}<span style="font-size:11px">km</span></div>
        <div class="ch-fact-t"><b>${esc(E.DRIVE_LABEL[r.drive] || r.drive)} minimum</b>Longest fuel gap ${r.range_km}km · ${esc(season.label)}</div></div>
    </div>`;
  }

  /* ── Class filter + sort ───────────────────────────────────────── */
  function buildFilters() {
    const rail = $('ch-classes');
    rail.innerHTML = E.CLASSES.map(c =>
      `<button type="button" class="ch-chip" data-c="${c.key}" aria-pressed="${c.key === 'all'}">${esc(c.label)}</button>`).join('');
    rail.addEventListener('click', ev => {
      const b = ev.target.closest('.ch-chip'); if (!b) return;
      S.cls = b.dataset.c;
      rail.querySelectorAll('.ch-chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      renderGrid();
    });
    $('ch-sort').addEventListener('change', e => { S.sort = e.target.value; renderGrid(); });
  }

  /* ── Search ────────────────────────────────────────────────────── */
  async function search() {
    S.searched = true; S.loading = true;
    $('ch-results').hidden = false;
    renderGrid();
    const res$ = $('ch-results');
    if (res$.scrollIntoView) res$.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const res = await E.loadFleet(window.__chSb || null);
    S.fleet = res.fleet; S.operators = res.operators; S.source = res.source;
    S.loading = false;
    renderGrid();
  }

  function visible() {
    let list = S.fleet.slice();
    if (S.city) list = list.filter(v => {
      const o = opById(v.operator_id);
      if (!o || !o.city) return true;
      const label = (E.CITIES.find(c => c.key === S.city) || {}).label || '';
      return o.city.toLowerCase().includes(label.toLowerCase().split(' ')[0]);
    });
    if (S.cls !== 'all') list = list.filter(v => v.class === S.cls);

    const d = days() || 1;
    list.forEach(v => {
      v.__g = S.route ? E.grade(v, S.route, startDate()) : null;
      const q = E.quote({ vehicle:v, days:d, chauffeur:false, insurance:'basic',
                          route:S.route, extras:[], start:S.start });
      v.__total = q ? q.total : v.day_rate * d;
    });

    if (S.sort === 'price')      list.sort((a,b) => a.__total - b.__total);
    else if (S.sort === 'price_desc') list.sort((a,b) => b.__total - a.__total);
    else if (S.sort === 'seats') list.sort((a,b) => (b.seats||0) - (a.seats||0));
    else if (S.sort === 'fit' && S.route)
      list.sort((a,b) => (b.__g?.score||0) - (a.__g?.score||0) || a.__total - b.__total);
    return list;
  }

  function renderGrid() {
    const grid = $('ch-grid'), bar = $('ch-bar');
    if (S.loading) {
      bar.hidden = true;
      grid.innerHTML = Array.from({length:6},
        () => '<div class="ch-skel"><div class="ch-skel-b"></div></div>').join('');
      return;
    }
    if (S.source === 'error') { bar.hidden = true; grid.innerHTML = stateError(); return; }

    const list = visible();
    if (!list.length) { bar.hidden = true; grid.innerHTML = stateEmpty(); return; }

    bar.hidden = false;
    $('ch-count').innerHTML = `<b>${list.length}</b> ${list.length === 1 ? 'vehicle' : 'vehicles'} available`;
    const fitOpt = $('ch-sort').querySelector('option[value="fit"]');
    if (fitOpt) fitOpt.hidden = !S.route;

    grid.innerHTML = list.map((v, i) => card(v, i)).join('');
    grid.querySelectorAll('.ch-card').forEach(el =>
      el.addEventListener('click', () => openSheet(el.dataset.id)));
  }

  function card(v, i) {
    const o = opById(v.operator_id);
    const g = v.__g;
    const photo = Array.isArray(v.photos) && v.photos[0];
    const d = days() || 1;
    return `<button type="button" class="ch-card" data-id="${esc(v.id)}" style="--d:${Math.min(i*45,400)}ms">
      <div class="ch-card-top">
        ${g ? `<span class="ch-verdict ${g.verdict}">${g.verdict}</span>` : ''}
        ${o ? `<span class="ch-op">✓ ${esc(o.name)}</span>` : ''}
        ${photo ? `<img src="${esc(photo)}" alt="${esc(v.make + ' ' + v.model)}" loading="lazy">`
                : E.silhouette(v.body)}
      </div>
      <div class="ch-card-body">
        <h3 class="ch-name">${esc(v.make)} ${esc(v.model)}<span class="ch-year">${esc(v.year)}</span></h3>
        <div class="ch-specs">
          <span class="ch-spec">${esc((E.DRIVE_LABEL[v.drive] || v.drive))}</span>
          <span class="ch-spec">${v.seats} seats</span>
          <span class="ch-spec">${esc(v.transmission)}</span>
          ${v.clearance_mm ? `<span class="ch-spec">${v.clearance_mm}mm</span>` : ''}
        </div>
        <div class="ch-price-row">
          <div class="ch-price">${E.KES(v.day_rate)}<small>per day</small></div>
          <div class="ch-total">${d} ${d === 1 ? 'day' : 'days'}<b>${E.KES(v.__total)}</b></div>
        </div>
      </div>
    </button>`;
  }

  /* ── States ────────────────────────────────────────────────────── */
  function stateEmpty() {
    const where = S.city ? (E.CITIES.find(c => c.key === S.city) || {}).label : 'this city';
    const anyFleet = S.fleet.length > 0;
    return `<div class="ch-state">
      <div class="ch-state-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 17h14M6.5 17V9.5l1.8-3.2A2 2 0 0 1 10 5.2h4a2 2 0 0 1 1.7 1.1L17.5 9.5V17"/>
        <circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg></div>
      <h3>${anyFleet ? `No vehicles match these filters` : `No cars listed in ${esc(where)} yet`}</h3>
      <p>${anyFleet
          ? `Try a different class, or widen the road you selected.`
          : `Cabana only shows vehicles from operators we have verified, so this page stays empty until a real fleet is listed here. If you run a car hire business, this is an open market.`}</p>
      <div class="ch-state-acts">
        ${anyFleet
          ? `<button type="button" class="ch-btn ch-btn-ghost" id="ch-clear">Clear filters</button>`
          : `<a class="ch-btn ch-btn-primary" href="/become-partner.html">List your fleet</a>
             <a class="ch-btn ch-btn-ghost" href="/rides.html">Book a ride instead</a>`}
      </div>
    </div>`;
  }

  function stateError() {
    return `<div class="ch-state">
      <h3>We could not load availability</h3>
      <p>The connection to our operators dropped. Check your network and try the search again.</p>
      <div class="ch-state-acts">
        <button type="button" class="ch-btn ch-btn-primary" id="ch-retry">Try again</button>
      </div></div>`;
  }

  document.addEventListener('click', ev => {
    if (ev.target.id === 'ch-retry') search();
    if (ev.target.id === 'ch-clear') {
      S.cls = 'all'; S.route = null;
      document.querySelectorAll('#ch-classes .ch-chip').forEach(x =>
        x.setAttribute('aria-pressed', String(x.dataset.c === 'all')));
      document.querySelectorAll('#ch-routes .ch-chip').forEach(x =>
        x.setAttribute('aria-pressed', String(!x.dataset.r)));
      renderDemands(); renderGrid();
    }
  });

  /* ── Sheet ─────────────────────────────────────────────────────── */
  const scrim = () => $('ch-scrim'), sheet = () => $('ch-sheet');
  let lastFocus = null;

  function openSheet(id) {
    const v = S.fleet.find(x => String(x.id) === String(id));
    if (!v) return;
    lastFocus = document.activeElement;
    S.vehicle = v; S.chauffeur = false; S.insurance = 'basic'; S.extras = [];
    $('ch-sheet-title').textContent = `${v.make} ${v.model} ${v.year}`;
    renderSheet();
    scrim().classList.add('on'); sheet().classList.add('on');
    document.body.style.overflow = 'hidden';
    sheet().querySelector('.ch-x').focus();
  }
  function closeSheet() {
    scrim().classList.remove('on'); sheet().classList.remove('on');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function renderSheet() {
    const v = S.vehicle, d = days() || 1;
    const g = S.route ? E.grade(v, S.route, startDate()) : null;
    const q = E.quote({ vehicle:v, days:d, chauffeur:S.chauffeur, insurance:S.insurance,
                        route:S.route, extras:S.extras, start:S.start });

    let html = '';
    if (g) {
      const cls = g.verdict === 'cleared' ? 'ok' : g.verdict === 'caution' ? 'warn' : 'stop';
      const msg = (g.blockers[0] || g.reasons[0] || '');
      html += `<div class="ch-note ${cls}"><b>${g.verdict === 'cleared' ? 'Cleared for this road' :
        g.verdict === 'caution' ? 'Passable, with a compromise' : 'Not suitable for this road'}</b><br>${esc(msg)}</div>`;
    }

    html += `<span class="ch-lab">Driver</span><div class="ch-opts">
      <button type="button" class="ch-opt" data-ch="0" aria-pressed="${!S.chauffeur}">
        <span class="ch-opt-l"><b>Self drive</b><span>You collect and drive it yourself.</span></span>
        <span class="cost">Included</span></button>
      <button type="button" class="ch-opt" data-ch="1" aria-pressed="${S.chauffeur}">
        <span class="ch-opt-l"><b>With a driver</b><span>A professional driver for the whole hire.</span></span>
        <span class="cost">+${E.KES((v.chauffeur_metro || 2500) * d)}</span></button></div>`;

    html += `<span class="ch-lab">Insurance</span><div class="ch-opts">` +
      Object.entries(E.INSURANCE).map(([k, t]) => `
      <button type="button" class="ch-opt" data-ins="${k}" aria-pressed="${S.insurance === k}">
        <span class="ch-opt-l"><b>${esc(t.label)}</b><span>${esc(t.blurb)}</span></span>
        <span class="cost">${t.perDay ? '+' + E.KES(t.perDay * d) : 'Included'}</span></button>`).join('') + `</div>`;

    if (q) {
      html += `<span class="ch-lab">What it costs</span><div>` +
        q.lines.map(l => `<div class="ch-line"><div class="ch-line-l"><b>${esc(l.label)}</b>${
          l.detail ? `<span>${esc(l.detail)}</span>` : ''}</div>
          <div class="ch-line-a${l.good ? ' good' : ''}">${l.amount === 0 ? 'KES 0' : E.KES(l.amount)}</div></div>`).join('') +
        `<div class="ch-line total"><div class="ch-line-l"><b>Total for ${d} ${d === 1 ? 'day' : 'days'}</b>
           <span>Refundable deposit ${q.deposit ? E.KES(q.deposit) : 'none'} · nothing to pay at the counter</span></div>
         <div class="ch-line-a">${E.KES(q.total)}</div></div></div>`;
    }

    html += `<span class="ch-lab">Your details</span>
      <input class="ch-in" id="ch-name" placeholder="Full name" autocomplete="name">
      <div style="height:8px"></div>
      <input class="ch-in" id="ch-phone" placeholder="Phone number" inputmode="tel" autocomplete="tel">
      <div style="height:8px"></div>
      <input class="ch-in" id="ch-email" placeholder="Email (optional)" inputmode="email" autocomplete="email">`;

    $('ch-sheet-body').innerHTML = html;
    $('ch-sheet-foot').innerHTML = (g && g.verdict === 'blocked')
      ? `<button type="button" class="ch-btn ch-btn-ghost" disabled style="flex:1;justify-content:center">Not available for this road</button>`
      : `<button type="button" class="ch-btn ch-btn-primary" id="ch-book">Request this car</button>`;

    $('ch-sheet-body').querySelectorAll('[data-ch]').forEach(b =>
      b.addEventListener('click', () => { S.chauffeur = b.dataset.ch === '1'; renderSheet(); }));
    $('ch-sheet-body').querySelectorAll('[data-ins]').forEach(b =>
      b.addEventListener('click', () => { S.insurance = b.dataset.ins; renderSheet(); }));
    const book = $('ch-book');
    if (book) book.addEventListener('click', submit);
  }

  /* ── Submit ────────────────────────────────────────────────────── */
  async function submit() {
    const v = S.vehicle, d = days() || 1;
    const name = ($('ch-name').value || '').trim();
    const phone = ($('ch-phone').value || '').trim();
    if (!name || !phone) { toast('Add your name and phone number so the operator can reach you.'); return; }

    const q = E.quote({ vehicle:v, days:d, chauffeur:S.chauffeur, insurance:S.insurance,
                        route:S.route, extras:S.extras, start:S.start });
    const g = S.route ? E.grade(v, S.route, startDate()) : null;
    const ref = 'CH' + Math.random().toString(36).slice(2, 7).toUpperCase();

    const btn = $('ch-book');
    btn.disabled = true; btn.textContent = 'Sending…';

    let saved = false;
    try {
      if (window.__chSb) {
        const { error } = await window.__chSb.from('car_bookings').insert({
          ref, vehicle_id:v.id, operator_id:v.operator_id,
          starts_on:S.start, ends_on:S.end, days:d,
          with_chauffeur:S.chauffeur, route_key:S.route, route_verdict:g ? g.verdict : null,
          pickup_mode:'depot', insurance_tier:S.insurance, extras:S.extras,
          price_breakdown:q ? { lines:q.lines } : {},
          total:E.toMinor(q ? q.total : 0),
          deposit_held:E.toMinor(q ? q.deposit : 0),
          pay_at_counter:0,
          customer_name:name, phone, email:($('ch-email').value || '').trim() || null,
          status:'pending'
        });
        if (!error) saved = true;
      }
    } catch (_) {}

    $('ch-sheet-body').innerHTML = `<div style="text-align:center;padding:24px 0 8px">
      <div class="ch-state-icon" style="margin-bottom:18px"><svg width="26" height="26" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/></svg></div>
      <h3 style="font-family:var(--font-display);font-size:22px;font-weight:640;margin:0 0 8px">Request sent</h3>
      <p style="color:var(--c-ink-2);font-size:15px;line-height:1.6;max-width:38ch;margin:0 auto">
        Your reference is <b style="font-family:var(--font-data)">${esc(ref)}</b>.
        ${saved ? 'The operator has it and will confirm shortly.'
                : 'Save this reference and send it to us in the support chat so we can confirm.'}
      </p></div>`;
    $('ch-sheet-foot').innerHTML =
      `<a href="/help.html" data-cbn-support data-cbn-prefill="${esc('Car hire reference ' + ref + '. Please confirm this booking.')}" class="ch-btn ch-btn-primary" style="flex:1;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg> Confirm in support chat</a>`;
  }

  /* ── Toast ─────────────────────────────────────────────────────── */
  let toastT;
  function toast(msg) {
    const t = $('ch-toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3600);
  }

  /* ── Arriving on one vehicle ───────────────────────────────────
     A dashboard rail card links here as carhire.html?back=1&open=<id>.
     The grid normally waits for the guest to say where and when, but a
     guest who tapped a specific car has already said what they want to
     see, so the fleet is loaded straight away and that car's sheet is
     opened on top of it. Rule 1 still holds: no city, date or route is
     invented on their behalf, so the sheet quotes a day rate and the
     search bar above is still empty and waiting. A stale id lands on
     the full grid rather than a dead end. */
  async function openFromQuery() {
    let id = null;
    try { id = new URLSearchParams(location.search).get('open'); } catch (_) {}
    if (!id) return;
    await search();
    openSheet(id);
  }

  /* ── Boot ──────────────────────────────────────────────────────── */
  function init() {
    initTheme();
    buildSearch();
    buildRefine();
    buildFilters();
    syncGo();
    scrim().addEventListener('click', closeSheet);
    sheet().querySelector('.ch-x').addEventListener('click', closeSheet);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && sheet().classList.contains('on')) closeSheet();
    });
    openFromQuery();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
