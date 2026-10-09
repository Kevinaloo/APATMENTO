/* ══════════════════════════════════════════════════════════════════════
   CABANA · COMPASS (browser)
   cabana-compass.js

   What someone does on Cabana, said once, in one shape, to one place.

   Before this there were three trackers on twenty pages (analytics.js,
   telemetry.js, apa-signal.js), each with its own visitor id, each writing
   raw rows straight into a table with the public key, and nothing turning
   any of it into a picture of a person. This one is on every page (the
   support widget loads it), speaks in meaningful acts rather than clicks
   ("viewed this stay", "searched Diani for two, next weekend", "saved",
   "started checkout"), and sends them to the server, which enriches them
   from the live catalogue and folds them into a profile.

   It is deliberately light: no dependencies, nothing on the critical path,
   a batched POST every few seconds at most and a beacon on the way out.

   PRIVACY
   ───────
   · Do Not Track, or Cabana's own opt-out (localStorage apa-no-track),
     and nothing is collected. Global Privacy Control turns off any
     advertising use.
   · Operator and partner back-office pages are never tracked.
   · CabanaCompass.profile() shows a person what Cabana has inferred;
     CabanaCompass.forget() erases it and stops collection on this browser.

   PERSONALISATION
   ───────────────
   Any element with data-cbn-foryou becomes a "For you" rail:
     <section data-cbn-foryou data-service="stays" data-limit="8"
              data-personal-only></section>
   It stays hidden until there is something worth showing.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaCompass) return;
  var doc = global.document, loc = global.location, nav = global.navigator;
  var API = '/api/growth?op=';

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  function ls(k, v) {
    return safe(function () {
      if (v === undefined) return global.localStorage.getItem(k);
      if (v === null) global.localStorage.removeItem(k); else global.localStorage.setItem(k, v);
      return v;
    }, null);
  }

  /* Back-office pages say nothing about travellers. */
  var BACK_OFFICE = /^\/(admin|support-console|partner-|dashboard|agent-dashboard|ambassador-dashboard|tours-studio|driver|offline)/;
  var path = loc.pathname.replace(/\.html$/, '') || '/';
  var optedOut = ls('apa-no-track') === '1' || nav.doNotTrack === '1' || global.doNotTrack === '1';
  var gpc = nav.globalPrivacyControl === true;
  var active = !optedOut && !BACK_OFFICE.test(path);

  /* The same first-party ids the existing trackers use, so their history
     and this profile describe the same browser. */
  function visitorId() {
    var v = ls('apt_vid');
    if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) {
      v = 'V' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      ls('apt_vid', v);
    }
    return v;
  }
  function sessionId() {
    return safe(function () {
      var s = global.sessionStorage.getItem('apt_sid');
      if (!s) { s = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); global.sessionStorage.setItem('apt_sid', s); }
      return s;
    }, 'S0');
  }
  var VID = visitorId(), SID = sessionId();

  /* ── Transport ───────────────────────────────────────────────────── */

  var queue = [], timer = null, lastSig = '';
  function track(type, data) {
    if (!active) return;
    var sig = type + JSON.stringify(data || {});
    /* The same act twice in a row (a re-render, a double-fired event) is
       one act. */
    if (sig === lastSig && type !== 'dwell') return;
    lastSig = sig;
    queue.push({ t: type, at: Date.now(), d: data || {} });
    if (queue.length >= 10) flush();
    else { clearTimeout(timer); timer = setTimeout(flush, 6000); }
  }

  function session() {
    return safe(function () {
      var S = global.ApaSession;
      return S && S.peekSession ? S.peekSession() : null;
    }, null);
  }

  function payload(extra) {
    return Object.assign({
      v: VID, s: SID, page: path, gpc: gpc,
      ctx: { lang: nav.language, tz: safe(function () { return Intl.DateTimeFormat().resolvedOptions().timeZone; }, null),
             pwa: safe(function () { return global.matchMedia('(display-mode: standalone)').matches; }, false) },
      events: queue.splice(0, 40),
    }, extra || {});
  }

  function flush(leaving) {
    clearTimeout(timer);
    if (!active || !queue.length) return;
    var s = session();
    var uid = s && s.user && s.user.id;
    /* Signing in links this browser to the member, once per member. The
       token rides on a normal request because a beacon cannot carry one. */
    if (uid && ls('cbn.compass.uid') !== uid && s.access_token) {
      var body = JSON.stringify(payload({ identify: true }));
      ls('cbn.compass.uid', uid);
      safe(function () {
        global.fetch(API + 'compass', { method: 'POST', keepalive: true, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: body }).catch(function () { ls('cbn.compass.uid', null); });
      });
      return;
    }
    var data = JSON.stringify(payload());
    if (leaving && nav.sendBeacon) {
      safe(function () { nav.sendBeacon(API + 'compass', new Blob([data], { type: 'application/json' })); });
      return;
    }
    safe(function () {
      global.fetch(API + 'compass', { method: 'POST', keepalive: true, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: data }).catch(function () {});
    });
  }

  doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') { dwellStop(); flush(true); } });
  global.addEventListener('pagehide', function () { dwellStop(); flush(true); });

  /* ── What the URL says ───────────────────────────────────────────── */

  var DEEP = [
    [/^\/apartments$/, 'open', 'stay'], [/^\/tours$/, 'open', 'tour'], [/^\/carhire$/, 'open', 'car'],
    [/^\/shopping$/, 'open', 'shop'], [/^\/restaurant$/, 'id', 'food'], [/^\/roommates$/, 'room', 'room'],
  ];
  var SEARCH_KEYS = { q: 'q', where: 'place', place: 'place', destination: 'place', city: 'place', area: 'place',
                      guests: 'guests', people: 'guests', adults: 'guests', from: 'checkin', checkin: 'checkin', date: 'checkin',
                      to: 'checkout', checkout: 'checkout', max: 'max_price', max_price: 'max_price', price: 'max_price', beds: 'beds' };

  var current = null; // the entity on screen, for dwell and checkout

  function readUrl() {
    var p = loc.pathname.replace(/\.html$/, '') || '/';
    var qs = safe(function () { return new URLSearchParams(loc.search); }, null);
    var entity = null;

    var tag = doc.getElementById('cbn-entity');
    var beacon = tag ? safe(function () { return JSON.parse(tag.textContent); }, null) : null;
    if (beacon && beacon.kind === 'hub') track('hub_view', { place: beacon.place, service: beacon.service, path: p });
    else if (beacon && beacon.key) entity = { kind: beacon.kind, key: beacon.key, id: beacon.id };

    if (!entity && qs) {
      for (var i = 0; i < DEEP.length; i++) {
        if (DEEP[i][0].test(p) && qs.get(DEEP[i][1])) { entity = { kind: DEEP[i][2], id: qs.get(DEEP[i][1]) }; break; }
      }
      var ev = /^\/events\/e\/([A-Za-z0-9-]{1,40})/.exec(p);
      if (!entity && ev) entity = { kind: 'event', id: ev[1] };
    }

    if (entity) {
      if (!current || current.id !== entity.id || current.key !== entity.key) {
        dwellStop();
        current = entity;
        track('entity_view', { kind: entity.kind, id: entity.id, key: entity.key, path: p });
        dwellStart();
      }
    } else if (current) { dwellStop(); current = null; }

    if (qs) {
      var s = {}, any = false;
      qs.forEach(function (v, k) { var m = SEARCH_KEYS[k]; if (m && v) { s[m] = String(v).slice(0, 80); any = true; } });
      if (any && (s.q || s.place || s.checkin)) { s.path = p; track('search', s); }
    }
  }

  var lastUrl = '';
  function onUrl() {
    if (loc.href === lastUrl) return;
    lastUrl = loc.href;
    setTimeout(readUrl, 350);
  }
  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = global.history[m];
    if (typeof orig !== 'function') return;
    global.history[m] = function () { var r = orig.apply(this, arguments); safe(onUrl); return r; };
  });
  global.addEventListener('popstate', onUrl);

  /* ── Attention on one thing ──────────────────────────────────────── */

  var dwellMs = 0, dwellFrom = 0;
  function dwellStart() { dwellMs = 0; dwellFrom = doc.visibilityState === 'visible' ? Date.now() : 0; }
  function dwellStop() {
    if (!current) return;
    if (dwellFrom) dwellMs += Date.now() - dwellFrom;
    dwellFrom = 0;
    var seconds = Math.round(dwellMs / 1000);
    if (seconds >= 8) track('dwell', { kind: current.kind, id: current.id, key: current.key, seconds: Math.min(seconds, 3600) });
    dwellMs = 0;
  }
  doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible' && current) dwellFrom = Date.now(); });

  /* ── Acts the page already announces ─────────────────────────────── */

  function favIds() { return safe(function () { return JSON.parse(ls('apa_favorites') || '[]'); }, []); }
  var favs = favIds().map(function (f) { return String(f.id); });
  global.addEventListener('apa:favorites-changed', function () {
    var now = favIds(), ids = now.map(function (f) { return String(f.id); });
    now.forEach(function (f) {
      if (favs.indexOf(String(f.id)) === -1) track('save', { id: f.id, kind: /tour/i.test(f.type) ? 'tour' : /event/i.test(f.type) ? 'event' : /car/i.test(f.type) ? 'car' : 'stay' });
    });
    favs.forEach(function (id) { if (ids.indexOf(id) === -1) track('unsave', { id: id }); });
    favs = ids;
  });
  global.addEventListener('cabana:apa-message', function () { track('apa_message', { path: path }); });

  /* Commitment, read from what was clicked: a button that says "Book",
     "Reserve", "Pay" or "Get tickets" is a decision, wherever it lives. */
  var COMMIT = /^\s*(book( now| it| this)?|reserve|request to book|pay( now| with m-?pesa)?|confirm (booking|and pay)|get tickets|buy tickets|check ?out|order now|place order)\b/i;
  doc.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('a,button,[role="button"]');
    if (!el) return;
    var text = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60);
    if (el.hasAttribute('data-cbn-checkout') || COMMIT.test(text)) {
      track('checkout_start', current ? { kind: current.kind, id: current.id, key: current.key } : { path: path });
    } else if (el.hasAttribute('data-share') || /^\s*share\b/i.test(text)) {
      track('share', current ? { kind: current.kind, id: current.id, key: current.key } : { path: path });
    } else if (/^\/(become-partner|add-listing|list-property|become-driver)/.test((el.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''))) {
      track('list_start', { path: path });
    }
  }, true);

  /* Search boxes that never touch the URL. */
  doc.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.querySelector) return;
    var input = f.querySelector('input[type="search"],input[name="q"],input[name*="where" i],input[name*="dest" i],input[id*="search" i],input[id*="destination" i]');
    if (input && input.value && input.value.trim().length > 1) track('search', { q: input.value.trim().slice(0, 80), path: path });
  }, true);

  /* ── For you ─────────────────────────────────────────────────────── */

  var CSS = '.cbn-fy{margin:28px auto;max-width:1180px;padding:0 24px}.cbn-fy h2{font:600 clamp(19px,2.4vw,24px)/1.2 var(--font-display,"Geist","Inter",system-ui,sans-serif);letter-spacing:-.01em;margin:0 0 4px;color:inherit}' +
    '.cbn-fy p{margin:0 0 14px;font-size:13px;opacity:.65}.cbn-fy-row{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch}' +
    '.cbn-fy-c{flex:0 0 220px;scroll-snap-align:start;border-radius:16px;overflow:hidden;background:#fff;border:1px solid rgba(8,8,15,.08);color:#08080F;text-decoration:none;transition:transform .25s,box-shadow .25s}' +
    '.cbn-fy-c:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(8,8,15,.1)}.cbn-fy-i{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:linear-gradient(135deg,#F1ECFF,#E8F9F6)}' +
    '.cbn-fy-b{padding:10px 12px 12px}.cbn-fy-t{font-weight:600;font-size:14px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.cbn-fy-s{font-size:12px;color:#8B8EAC;margin-top:3px}.cbn-fy-p{font-weight:700;font-size:13px;margin-top:6px}.cbn-fy-n{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6D28FF;margin-bottom:4px}' +
    '.cbn-fy-sec+.cbn-fy-sec{margin-top:18px}@media(max-width:640px){.cbn-fy{padding:0 16px}.cbn-fy-c{flex-basis:72%}}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderRail(el, data) {
    var only = el.hasAttribute('data-personal-only');
    var want = (el.getAttribute('data-sections') || 'continue,picks,new').split(',');
    var secs = (data.sections || []).filter(function (s) { return want.indexOf(s.id) !== -1 && s.items.length; });
    if (!secs.length || (only && !data.personalised)) { el.hidden = true; return; }
    if (!doc.getElementById('cbn-fy-css')) {
      var st = doc.createElement('style'); st.id = 'cbn-fy-css'; st.textContent = CSS; doc.head.appendChild(st);
    }
    el.classList.add('cbn-fy');
    el.innerHTML = secs.map(function (s) {
      return '<div class="cbn-fy-sec"><h2>' + esc(s.title) + '</h2>' +
        (s.id === 'picks' && data.personalised ? '<p>Chosen from what you have been looking at. <a href="/privacy#personalisation" style="color:inherit">Why?</a></p>' : '') +
        '<div class="cbn-fy-row">' + s.items.map(function (it) {
          return '<a class="cbn-fy-c" href="' + esc(it.path) + '" data-cbn-fy="' + esc(s.id) + '">' +
            (it.photo ? '<img class="cbn-fy-i" src="' + esc(it.photo) + '" alt="" loading="lazy" decoding="async">' : '<div class="cbn-fy-i"></div>') +
            '<div class="cbn-fy-b">' + (it.isNew ? '<span class="cbn-fy-n">New</span>' : '') + '<div class="cbn-fy-t">' + esc(it.title) + '</div>' +
            '<div class="cbn-fy-s">' + esc([it.type, it.location].filter(Boolean).join(' · ')) + '</div>' +
            (it.price ? '<div class="cbn-fy-p">' + esc(it.price) + '</div>' : '') + '</div></a>';
        }).join('') + '</div></div>';
    }).join('');
    el.hidden = false;
  }

  function rails() {
    var els = doc.querySelectorAll('[data-cbn-foryou]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.getAttribute('data-cbn-loaded')) return;
      el.setAttribute('data-cbn-loaded', '1');
      el.hidden = true;
      var q = 'foryou&v=' + encodeURIComponent(active ? VID : '') + '&limit=' + encodeURIComponent(el.getAttribute('data-limit') || '8') +
        (el.getAttribute('data-service') ? '&service=' + encodeURIComponent(el.getAttribute('data-service')) : '');
      safe(function () {
        global.fetch(API + q, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { if (d) renderRail(el, d); }).catch(function () {});
      });
    });
  }

  /* ── Public surface ──────────────────────────────────────────────── */

  global.CabanaCompass = {
    visitorId: VID,
    track: track,
    flush: flush,
    rails: rails,
    /* { analytics, personalization, ads } — explicit choices only. */
    consent: function (c) {
      if (c && c.analytics === false) { ls('apa-no-track', '1'); active = false; }
      if (c && c.analytics === true) { ls('apa-no-track', null); active = !BACK_OFFICE.test(path); }
      return global.fetch(API + 'compass', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: VID, s: SID, gpc: gpc, consent: c || {}, events: [] }) }).then(function (r) { return r.json(); });
    },
    profile: function () { return global.fetch(API + 'profile&v=' + encodeURIComponent(VID)).then(function (r) { return r.json(); }); },
    forget: function () {
      queue.length = 0; active = false; ls('apa-no-track', '1');
      return global.fetch(API + 'forget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v: VID }) })
        .then(function (r) { return r.json(); });
    },
  };

  function boot() {
    if (active) {
      track('page_view', { path: path, ref: safe(function () { return doc.referrer ? new URL(doc.referrer).hostname : null; }, null) });
      lastUrl = loc.href;
      readUrl();
    }
    rails();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
