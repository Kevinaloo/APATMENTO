/* ════════════════════════════════════════════════════════════════════
   CABANA · LISTING JOURNEYS  (cabana-listing-journeys.js)

   Turns each listing page into cards, service by service, without
   replacing its fields, its validation or its submission. What this file
   adds on top of the card engine:

     · going back is always one tap: a Back button on every step, Back on
       the first card of a step returns to the LAST card of the step
       before (where you just were), and finished steps in the side rail
       are links
     · a draft is kept on this device, so a host who leaves (or whose
       phone dies) picks up exactly where they stopped
     · every deck opens on what is already chosen
     · the service deck previews each service's personality as you swipe
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const C = window.CabanaListingCards; if (!C) return;
  const path = location.pathname.replace(/\.html$/, '');
  const services = { '/list-your-tour': 'tours', '/list-your-event': 'events', '/list-your-fleet': 'carhire', '/become-driver': 'rides' };
  document.body.dataset.listingService = services[path] || document.body.dataset.listingService || '';
  const ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>';
  const svgEl = (inner, sw) => { const t = document.createElement('template'); t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>'; return t.content.firstChild; };

  function children(root, exclude) { return Array.from(root.children).filter(el => !el.matches(exclude)); }
  /* One card per section. A note with nothing to fill in (a privacy
     notice, a tip) is not a card of its own: it rides with the section
     it explains, so no card is ever just something to read. */
  function group(root, nodes) {
    const units = []; let notes = [];
    const fillable = el => el.matches('input,select,textarea') || !!el.querySelector('input,select,textarea,button,[contenteditable],[data-svc]');
    nodes.forEach(n => {
      if (!fillable(n)) { notes.push(n); return; }
      const unit = C.make('div', 'cc-unit'); (notes[0] || n).before(unit);
      notes.concat(n).forEach(x => unit.append(x)); notes = []; units.push(unit);
    });
    if (notes.length) {
      if (units.length) notes.forEach(x => units[units.length - 1].append(x));
      else { const unit = C.make('div', 'cc-unit'); notes[0].before(unit); notes.forEach(x => unit.append(x)); units.push(unit); }
    }
    return units;
  }

  /* An icon for a feature, from its words. Hosts recognise a pool or a
     Wi-Fi fan faster than they read the label. */
  const FEAT_ICONS = [
    [/wi-?fi|internet|hotspot/i, '<path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12a10.5 10.5 0 0 1 14 0"/><path d="M8.5 15.5a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>'],
    [/air con|air-con|aircon/i, '<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9"/>'],
    [/kitchen|catering|meal|buffet|food/i, '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>'],
    [/parking|garage/i, '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>'],
    [/tv|stream/i, '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8"/>'],
    [/wash|laundry|dishwasher/i, '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01M11 6h.01"/>'],
    [/pool|swim|snorkel|life jacket|water sport/i, '<path d="M2 18c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M2 14c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M8 11V5a2 2 0 0 1 4 0M16 11V5a2 2 0 0 0-4 0"/>'],
    [/gym|fitness/i, '<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/>'],
    [/coffee|cafe/i, '<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/>'],
    [/heat|hot water|bath|shower/i, '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-2.1 0L3.5 4.4A1.5 1.5 0 0 0 3 5.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5H4"/><path d="M7 19v2M17 19v2"/>'],
    [/elevator|lift/i, '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="m9 9 3-3 3 3M9 15l3 3 3-3"/>'],
    [/security|cctv|gated|safety|insurance|first aid/i, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'],
    [/garden|outdoor|balcony|rooftop/i, '<path d="M12 22V12"/><path d="M12 12C12 7 8 4 4 4c0 5 3 8 8 8Z"/><path d="M12 12c0-5 4-8 8-8 0 5-3 8-8 8Z"/>'],
    [/generator|power|charging|usb|electric/i, '<path d="m13 2-9 12h8l-1 8 9-12h-8z"/>'],
    [/borehole|water/i, '<path d="M12 2.7 6.3 8.3a8 8 0 1 0 11.4 0Z"/>'],
    [/pet/i, '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>'],
    [/child|baby|kid|family/i, '<circle cx="12" cy="6" r="3"/><path d="M8 22v-7l-2-3 3-2h6l3 2-2 3v7"/>'],
    [/accessib|wheelchair/i, '<circle cx="10" cy="4.5" r="2"/><path d="M9 8v5h5l3 5M9 10H6M9 13a5 5 0 1 0 5 5"/>'],
    [/music|dj|karaoke|stage|live/i, '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'],
    [/bar|alcohol|drink|open bar/i, '<path d="M8 22h8M12 11v11M12 11a5 5 0 0 0 5-5c0-2-2-4-2-4H9S7 4 7 6a5 5 0 0 0 5 5z"/>'],
    [/photo|camera|photographer/i, '<rect x="2" y="6" width="20" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6l2-3h4l2 3"/>'],
    [/transport|shuttle|transfer|bike|delivery|dispatch/i, '<path d="M5 17h14M6 17V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>'],
    [/guide|certified|languages/i, '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>'],
    [/gps|navigation|tracking|map/i, '<path d="M12 21s-7-5.6-7-11.2A7 7 0 0 1 19 9.8C19 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.6"/>'],
    [/gift|goodie|wrap/i, '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'],
    [/card|cashless|payment/i, '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'],
    [/vip|limited|signed|authentic/i, '<path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8L12 3Z"/>'],
    [/smok/i, '<path d="M2 16h15v4H2zM18 16h4v4h-4M17 8c0-2.5-2-2.5-2-5M21 8c0-2.5-2-2.5-2-5"/>'],
    [/desk|study|wardrobe|furnish|seat/i, '<path d="M3 10h18M5 10v10M19 10v10M8 10V6h8v4"/>'],
    [/clean/i, '<path d="m14 4-8 8 6 6 8-8-6-6Z"/><path d="m3 21 3-3"/>'],
    [/eco|local|made|craft/i, '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>']
  ];
  function featIcon(label) {
    for (const [re, path] of FEAT_ICONS) if (re.test(label)) return svgEl(path);
    return svgEl('<path d="M20 6 9 17l-5-5"/>', 2);
  }

  /* ══ ADD LISTING (stays, roommates, food, shopping) ═══════════════ */
  if (path === '/add-listing') {
    document.body.classList.add('cc-listing');
    const QPx = new URLSearchParams(location.search);
    const wm = document.querySelector('.tb-wordmark'); if (wm) wm.textContent = 'cabana';
    const header = document.querySelector('#step-0 .step-title'); if (header) header.innerHTML = 'What will you bring to <em>Cabana</em>?';
    const sub = document.querySelector('#step-0 .step-sub'); if (sub) sub.textContent = 'Swipe through the services. Swipe right, or tap the one you offer — every service has its own set-up, built for it.';
    const defaults = JSON.parse(JSON.stringify(F)), drafts = new Map();
    function copyState() { const result = JSON.parse(JSON.stringify({ ...F, photoFiles: [] })); result.photoFiles = [...F.photoFiles]; return result; }

    /* ── service switching keeps each service's answers apart ─────── */
    const oldSelect = window.selSvc;
    window.selSvc = function (el) {
      if (F.svc === el.dataset.svc) return;
      if (F.svc) { collect(cur); drafts.set(F.svc, copyState()); }
      const next = el.dataset.svc;
      oldSelect(el);
      Object.assign(F, drafts.get(next) || JSON.parse(JSON.stringify(defaults)), { svc: next });
      // Shared DOM fields must not carry data from a different service.
      document.querySelectorAll('.step-card input:not([type=file]),.step-card textarea,.step-card select').forEach(input => {
        if (input.tagName === 'SELECT') { Array.from(input.options).forEach(o => o.selected = o.defaultSelected); if (input.selectedIndex < 0) input.selectedIndex = 0; }
        else if (input.type !== 'checkbox' && input.type !== 'radio') input.value = input.defaultValue;
      });
      for (const [id, key] of [['f-desc', 'desc'], ['f-rules', 'rules'], ['f-in', 'ci'], ['f-out', 'co']]) { const input = document.getElementById(id); if (input) input.value = F[key]; }
      for (const key of ['inst', 'ch', 'pets', 'smk']) document.getElementById('tog-' + key)?.classList.toggle('on', F[key]);
      document.body.dataset.listingService = next;
    };

    /* ── the service deck ─────────────────────────────────────────── */
    const svcGrid = document.querySelector('.svc-grid');
    const serviceHost = C.make('div', 'cc-service-host'); svcGrid.after(serviceHost); svcGrid.classList.add('cc-concealed');
    const serviceNodes = Array.from(svcGrid.children);
    /* What a type card asks, in each service's own voice. */
    const TYPE_ASK = {
      stays: 'Is this your kind of place?', roommates: 'Does this sound like your home?',
      tours: 'Is this the experience you run?', events: 'Is this the kind of event you’re putting on?',
      food: 'Is this how a regular would describe you?', carhire: 'Is this what sits in your garage?',
      rides: 'Is this how you move people?', shopping: 'Is this the shelf your product lives on?'
    };
    const SERVICE_LINES = {
      stays: 'Apartments, villas, cottages and serviced units. Nightly, weekly or monthly — and day passes.',
      roommates: 'A room in a shared home. Monthly rent, the right flatmate.',
      tours: 'Safaris, city walks, day trips and experiences people remember.',
      events: 'Concerts, festivals, shows and conferences. Sell every ticket here.',
      food: 'Restaurants, cafés, bars and kitchens. Orders straight to your phone.',
      carhire: 'Self-drive, chauffeured, 4x4s and airport transfers.',
      rides: 'Taxis, shuttles, boats, bikes and more. Move people across Africa.',
      shopping: 'Crafts, fashion, art and goods. A shop window for what you make.'
    };
    const svcDeck = C.choice(serviceHost, {
      label: 'Choose your service',
      items: serviceNodes.map(el => ({
        label: el.querySelector('.svc-name').textContent,
        detail: SERVICE_LINES[el.dataset.svc] || el.querySelector('.svc-desc').textContent,
        icon: el.querySelector('.svc-icon svg'), el, value: el.dataset.svc,
        selected: () => F.svc === el.dataset.svc
      })),
      snapshot: () => F.svc,
      restore: svc => { if (svc) { const el = serviceNodes.find(n => n.dataset.svc === svc); if (el) selSvc(el); } },
      set: item => selSvc(item.el),
      advance: () => goFromSvc(),
      /* The deck wears the personality of whichever service is on top. */
      onRender: ({ index }) => { const box = serviceHost.querySelector('.cc-choice'); const it = serviceNodes[index]; if (box && it) box.dataset.skin = it.dataset.svc; }
    });

    /* ── navigation that always knows the way back ────────────────── */
    const oldGo = window.go;
    let lastDir = 1;
    window.go = function (n) {
      const from = cur;
      if (F.svc && from !== n) collect(from); // Includes backward navigation, before dynamic controls are rebuilt.
      lastDir = n < from ? -1 : 1;
      oldGo(n);
      enhance(n, lastDir);
      saveDraft();
    };
    const back = n => window.go(Math.max(0, n - 1));

    /* A Back control on every step after the first. On a phone the side
       rail does not exist, and this was the only way back. */
    const LABELS = typeof LABS !== 'undefined' ? LABS : [];
    document.querySelectorAll('.step-card').forEach(panel => {
      const n = Number(panel.id.replace('step-', ''));
      if (!(n >= 1)) return;
      const bar = C.make('div', 'cc-stepbar');
      const b = C.make('button', 'cc-stepback'); b.type = 'button';
      /* "Back to features" on a wide screen; "Features" on a phone, where
         the whole bar has to sit on one line. */
      const prev = LABELS[n - 1] || '';
      b.innerHTML = ICON_BACK + (prev
        ? '<span class="cc-sb-long">Back to ' + prev.toLowerCase() + '</span><span class="cc-sb-short">' + prev + '</span>'
        : '<span>Back</span>');
      b.setAttribute('aria-label', prev ? 'Back to ' + prev.toLowerCase() : 'Back');
      b.addEventListener('click', () => back(n));
      const where = C.make('span', 'cc-stepwhere', 'Step ' + n + ' of 8' + (LABELS[n] ? ' · ' + LABELS[n] : ''));
      const help = C.make('button', 'cc-stephelp', 'Help'); help.type = 'button'; help.setAttribute('aria-label', 'Let Cabana set it up for you');
      help.addEventListener('click', () => document.querySelector('.cc-assist-btn')?.click());
      bar.append(b, where, help);
      panel.prepend(bar);
    });
    /* Finished steps in the side rail are links. */
    document.getElementById('snav')?.addEventListener('click', e => {
      const item = e.target.closest('.sni'); if (!item || !item.classList.contains('done') || !F.svc) return;
      const n = Number(item.id.replace('sni-', '')); if (n >= 0 && n < cur) window.go(n);
    });

    /* ── per-card checks, so a missing field is caught on its card ─── */
    const REQUIRED = {
      'f-title': 'Add a title for your listing.',
      'f-city': 'Enter the city or town.',
      'f-area': 'Enter the area or neighbourhood.',
      'f-desc': 'Write a short description. Guests decide on this.',
      'f-wa': 'Add your WhatsApp number. Guests need it after they pay.'
    };
    function checkUnit(unit) {
      for (const id of Object.keys(REQUIRED)) {
        const el = unit.querySelector('#' + id);
        if (el && el.offsetParent !== null && !String(el.value || '').trim()) {
          al(REQUIRED[id]);
          if (id === 'f-city' || id === 'f-area') { try { locMethod('manual', { quiet: true }); } catch (e) { /* */ } }
          el.classList.add('field-highlight'); setTimeout(() => el.classList.remove('field-highlight'), 1800);
          try { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* */ }
          return false;
        }
      }
      return true;
    }

    function enhance(n, dir) {
      document.body.dataset.listingService = F.svc || '';
      document.body.dataset.step = String(n);
      const panel = document.getElementById('step-' + n);
      if (!panel) return;
      panel.classList.remove('cc-entry'); void panel.offsetWidth; panel.classList.add('cc-entry');
      if (n === 0) {
        svcDeck && svcDeck.refresh();
      } else if (n === 1) {
        panel.querySelector('.cc-type-host')?.remove();
        const original = document.getElementById('type-grid'); original.classList.add('cc-concealed');
        const host = C.make('div', 'cc-type-host'); original.after(host);
        const S = SVCS[F.svc];
        C.choice(host, {
          label: S.lbl + ' · type',
          items: S.types.map(t => ({ label: t.n, detail: t.d || TYPE_ASK[F.svc] || S.s1s, value: t.n, icon: t.i ? svgEl(t.i) : null, selected: () => F.type === t.n })),
          snapshot: () => F.type,
          restore: v => { F.type = v; const el = Array.from(original.children).find(x => x.dataset.t === v); if (el) selType(el); },
          set: item => { const el = Array.from(original.children).find(x => x.dataset.t === item.value); selType(el); },
          advance: () => nxt(1),
          onBackOut: () => back(1)
        });
      } else if (n === 4) {
        panel.querySelector('.cc-features-host')?.remove();
        const grid = document.getElementById('feat-grid'); grid.classList.add('cc-concealed');
        const host = C.make('div', 'cc-features-host'); grid.after(host);
        C.choice(host, {
          label: `${SVCS[F.svc].lbl} · features`, multiple: true,
          items: SVCS[F.svc].feats.map(f => ({ label: f, detail: 'Is this available with your listing?', value: f, icon: featIcon(f), selected: () => F.feats.includes(f) })),
          snapshot: () => [...F.feats],
          restore: v => { F.feats = v; },
          set: (item, yes) => { F.feats = F.feats.filter(f => f !== item.value); if (yes) F.feats.push(item.value); },
          onBackOut: () => back(4)
        });
      } else if (n === 7) {
        // Ownership reveals dependent panels immediately. Keep the choice,
        // partners and payout consent together on one explicit form card.
        panel.classList.add('cc-form');
      } else if (n > 1 && n < 7) {
        if (!panel.dataset.ccFocus) {
          const nodes = children(panel, '.step-header,.step-nav,.cc-stepbar');
          C.focusForm(panel, group(panel, nodes), panel.querySelector('.step-nav'), {
            topAfter: panel.querySelector('.step-header'),
            onBackOut: () => back(n),
            onComplete: () => nxt(n),
            validate: (_, unit) => checkUnit(unit),
            reviewLabel: 'Continue →'
          });
        }
        const api = panel._ccForm;
        if (api) { if (dir < 0) api.last(); else api.refresh(); }
      }
      if (n === 5) wirePrices();
      const title = panel.querySelector('h1'); if (title) { title.tabIndex = -1; try { title.focus({ preventScroll: true }); } catch (e) { /* */ } }
    }

    /* ── live "guests see" under every price a host types ─────────── */
    function wirePrices() {
      if (!window.ApaFees) return;
      const svc = F.svc === 'stays' ? 'stays' : F.svc;
      const p = document.getElementById('f-price');
      const unit = SVCS[F.svc]?.pf === 'month' ? 'month' : (F.svc === 'food' ? 'plate' : F.svc === 'shopping' ? 'item' : 'night');
      if (p) { if (p._apf) p._apf.reconfig({ service: svc, unit }); else ApaFees.attach(p, { service: svc, unit }); }
      const w = document.getElementById('f-pw'); if (w && !w._apf) ApaFees.attach(w, { service: 'stays', unit: 'week', units: 7, compact: true });
      const m = document.getElementById('f-pm'); if (m && !m._apf) ApaFees.attach(m, { service: 'stays', unit: 'month', units: 30, compact: true });
      const d = document.getElementById('f-dp-price'); if (d && !d._apf) ApaFees.attach(d, { service: 'stays', unit: 'pass', note: 'Guests see one price for the pass. You keep 100% of your rate.' });
    }

    /* ── the draft kept on this device ────────────────────────────── */
    const DRAFT = 'cabana:listing-draft:v2';
    const editing = QPx.has('edit') || QPx.has('prefill');
    function saveDraft() {
      if (editing || !F.svc || window._published) return;
      try {
        const keep = JSON.parse(JSON.stringify({ ...F, photos: [], photoFiles: [], photoPositions: [] }));
        localStorage.setItem(DRAFT, JSON.stringify({ v: 2, at: Date.now(), cur, F: keep, behalf: typeof ON_BEHALF_OF !== 'undefined' && ON_BEHALF_OF ? ON_BEHALF_OF.contact : null }));
      } catch (e) { /* storage full or private */ }
    }
    function readDraft() {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
        if (!d || d.v !== 2 || !d.F || !d.F.svc || Date.now() - d.at > 21 * 864e5) return null;
        const behalf = typeof ON_BEHALF_OF !== 'undefined' && ON_BEHALF_OF ? ON_BEHALF_OF.contact : null;
        if ((d.behalf || null) !== (behalf || null)) return null;
        if (!SVCS[d.F.svc] || (typeof DEDICATED_PIPELINES !== 'undefined' && DEDICATED_PIPELINES[d.F.svc])) return null;
        return d;
      } catch (e) { return null; }
    }
    function dropDraft() { try { localStorage.removeItem(DRAFT); } catch (e) { /* */ } }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && F.svc) { try { collect(cur); } catch (e) { /* */ } saveDraft(); } });
    window.addEventListener('pagehide', () => { if (F.svc) { try { collect(cur); } catch (e) { /* */ } saveDraft(); } });
    /* Published: the draft has done its job. */
    const ov = document.getElementById('success-ov');
    if (ov && window.MutationObserver) new MutationObserver(() => { if (ov.classList.contains('show')) { window._published = true; dropDraft(); } }).observe(ov, { attributes: true, attributeFilter: ['class'] });

    function offerResume() {
      if (editing || QPx.get('service') || QPx.get('svc')) return;
      const d = readDraft(); if (!d) return;
      const S = SVCS[d.F.svc];
      const step = Math.min(Math.max(1, d.cur || 1), 7);
      const box = C.make('div', 'cc-resume'); box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Unfinished listing');
      const ico = C.make('span', 'cc-resume-ico'); ico.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
      const t = C.make('div', 'cc-resume-t');
      t.append(C.make('b', '', 'Pick up where you left off'), C.make('span', '', [S.lbl, d.F.title ? '“' + d.F.title + '”' : null, 'Step ' + step + ' of 8', LABELS[step] || null].filter(Boolean).join(' · ')));
      const go = C.make('button', 'cc-resume-go', 'Resume'); go.type = 'button';
      const x = C.make('button', 'cc-resume-x', 'Start fresh'); x.type = 'button';
      box.append(ico, t, go, x);
      document.querySelector('#step-0 .step-header')?.after(box);
      x.addEventListener('click', () => { dropDraft(); box.remove(); });
      go.addEventListener('click', () => {
        const el = serviceNodes.find(n => n.dataset.svc === d.F.svc); if (!el) { box.remove(); return; }
        if (F.svc && F.svc !== d.F.svc) { /* a different service is open; switch cleanly */ }
        F.svc = null;
        window.selSvc(el);
        Object.assign(F, d.F, { svc: d.F.svc, photos: [], photoFiles: [], photoPositions: [] });
        for (const [id, key] of [['f-desc', 'desc'], ['f-rules', 'rules'], ['f-in', 'ci'], ['f-out', 'co']]) { const input = document.getElementById(id); if (input) input.value = F[key] || ''; }
        for (const key of ['inst', 'ch', 'pets', 'smk']) document.getElementById('tog-' + key)?.classList.toggle('on', !!F[key]);
        box.remove();
        /* Walk the steps once so each one restores its fields. */
        const target = step;
        cur = 0;
        for (let i = 1; i <= target; i++) { try { oldGo(i); } catch (e) { /* */ } }
        enhance(target, 1);
        C.say('Welcome back. Your ' + S.lbl.toLowerCase() + ' listing is where you left it. Photos need adding again.');
        if (target >= 6) al('Welcome back. For your privacy, photos are not kept on this device — please add them again.');
      });
    }

    enhance(cur, 1);
    offerResume();
  } else if (path === '/list-your-tour' || path === '/list-your-event') {
    document.querySelectorAll('form.lt-f,form.le-f').forEach(form => {
      const actions = form.querySelector('.lt-acts,.le-acts');
      // Keep adjacent explanations with their field, instead of empty cards.
      const units = [];
      children(form, '.lt-acts,.le-acts').forEach(node => {
        if (node.matches('p,.lt-note,.le-note') && units.length) units[units.length - 1].append(node);
        else { const unit = C.make('div', 'cc-unit'); node.before(unit); unit.append(node); units.push(unit); }
      });
      C.focusForm(form, units, actions);
    });
    if (path === '/list-your-tour') { C.selectChoices('o-persona'); C.selectChoices('t-category'); C.selectChoices('t-schedule'); }
    else C.selectChoices('e-category');
  } else if (path === '/list-your-fleet') {
    document.querySelectorAll('#fleet-form .panel').forEach(panel => {
      const grid = panel.querySelector('.grid');
      // Country and city are dependent; show the country first in the same card.
      if (panel.dataset.panel === '1') {
        const country = document.getElementById('op-country').closest('.field'), city = document.getElementById('op-city').closest('.field');
        city.before(country);
      }
      // Each original grid is a coherent service-specific card. This retains
      // dependent selectors, engineering constraints and explicit final consent.
      const fields = Array.from(grid.children), units = [];
      for (let i = 0; i < fields.length;) {
        const unit = C.make('div', 'cc-unit'); grid.before(unit);
        const isName = fields[i].querySelector('#op-name');
        const count = isName || fields[i].matches('.wide') ? 1 : 2;
        const inner = C.make('div', 'grid'); unit.append(inner); fields.slice(i, i + count).forEach(n => inner.append(n)); i += count; units.push(unit);
      }
      grid.remove();
      C.focusForm(panel, units, panel.querySelector('.foot'));
    });
    C.selectChoices('v-class'); C.selectChoices('v-trans'); C.selectChoices('v-drive');
  } else if (path === '/become-driver') {
    // Driver identity / vehicle / payout panels have independent validation.
    document.querySelectorAll('.fs-step:not(#s4)').forEach(panel => {
      const nodes = Array.from(panel.children), units = []; let current = null;
      nodes.forEach(node => {
        if (node.matches('.fl,.f2,.chk')) { current = C.make('div', 'cc-unit'); node.before(current); units.push(current); }
        if (!current) { current = C.make('div', 'cc-unit'); node.before(current); units.push(current); }
        current.append(node);
      });
      C.focusForm(panel, units, null);
    });
    C.selectChoices('a-psv');
    const foot = document.getElementById('fs-foot');
    function syncFoot() { const panel = document.querySelector('.fs-step.on'); foot.classList.toggle('cc-concealed', !!panel?.matches('.cc-form:not(.cc-overview)')); }
    document.addEventListener('cc:form-view', syncFoot);
    document.querySelectorAll('.fs-step').forEach(panel => new MutationObserver(syncFoot).observe(panel, { attributes: true, attributeFilter: ['class'] }));
    syncFoot();
  }
  // Declarations, ownership, payments and consent are deliberately explicit.
  document.querySelectorAll('input[data-doc],#v-aircon,#v-border').forEach(C.checkboxChoice);
  C.assist();
})();
