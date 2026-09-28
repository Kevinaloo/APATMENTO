/* ═══════════════════════════════════════════════════════════════════
   CABANA · KARIBU — engine for the way into Stays
   ───────────────────────────────────────────────────────────────────
   A door at the guest's own hour. The lantern flickers on, the mat
   says welcome in one of fifteen languages spoken where our hosts live,
   the door swings open and the light inside carries the camera through
   it into the page. A different door colour and greeting every visit,
   a cat on some of them, a real place name when the page knows one.

   On the place name
   ─────────────────
   Every candidate is checked against the map below, built from the
   landing pages that exist. An unrecognised value never renders; the
   line falls back to "…, somewhere in Africa". A guess never outranks
   something the page was told.

   On never trapping anyone
   ────────────────────────
   Six ways out: the sequence ending, a tap, Escape, a hard wall-clock
   ceiling, the tab being hidden, and the page's own pre-armed escape
   hatch. Any one removes the gate and unlocks scrolling.

   On speed
   ────────
   About twenty elements, every animation transform or opacity, one
   layout read (where the door is) before anything moves. The old
   facade built several hundred nodes and a blurred skyline; on a
   mid-range phone that was the lag.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;
  if (global.CabanaStayGate) return;

  var ID = 'stay-gate';
  var SS_KEY = 'cbn-stay-gate-seen';

  /* ═══ WHERE ═══════════════════════════════════════════════════════
     The line under the block names a place, and it must never name the
     wrong one. A guest who arrived from a Lagos search and is told
     "Tonight in Kigali" has learned, forty milliseconds in, that the
     site does not know what it is showing them.

     So: name the place only when the page tells us what it is, and be
     honest rather than specific when it does not. Landing pages hand
     off as /apartments?q=Kilimani, which is the route most search
     traffic takes, so the specific case is also the common one.

     Every candidate is checked against the map below, which is built
     from the landing pages that actually exist. An unrecognised value
     never renders; it falls back. Guessing is the thing that would
     let us down. */

  var PLACES = {
    'abidjan':'Abidjan',
    'abuja':'Abuja',
    'accra':'Accra',
    'addis-ababa':'Addis Ababa',
    'africa':'Africa',
    'airport-residential-accra':'Airport Residential',
    'americas':'the Americas',
    'amsterdam':'Amsterdam',
    'arusha':'Arusha',
    'asia':'Asia',
    'athens':'Athens',
    'bali':'Bali',
    'bamburi':'Bamburi',
    'bangkok':'Bangkok',
    'barcelona':'Barcelona',
    'berlin':'Berlin',
    'best-lagos':'Best Lagos',
    'budapest':'Budapest',
    'buenos-aires':'Buenos Aires',
    'cairo':'Cairo',
    'cape-coast':'Cape Coast',
    'cape-town':'Cape Town',
    'cartagena':'Cartagena',
    'chiang-mai':'Chiang Mai',
    'copenhagen':'Copenhagen',
    'dakar':'Dakar',
    'dar-es-salaam':'Dar es Salaam',
    'diani':'Diani',
    'dubai':'Dubai',
    'dubrovnik':'Dubrovnik',
    'east-legon':'East Legon',
    'edinburgh':'Edinburgh',
    'europe':'Europe',
    'florence':'Florence',
    'ghana':'Ghana',
    'gigiri':'Gigiri',
    'ikeja':'Ikeja',
    'ikoyi':'Ikoyi',
    'istanbul':'Istanbul',
    'johannesburg':'Johannesburg',
    'kampala':'Kampala',
    'karen':'Karen',
    'kenya':'Kenya',
    'kigali':'Kigali',
    'kileleshwa':'Kileleshwa',
    'kilimani':'Kilimani',
    'kuala-lumpur':'Kuala Lumpur',
    'kumasi':'Kumasi',
    'kyoto':'Kyoto',
    'lagos':'Lagos',
    'lamu':'Lamu',
    'lavington':'Lavington',
    'lekki':'Lekki',
    'lisbon':'Lisbon',
    'lisbon-porto':'Lisbon',
    'london':'London',
    'los-angeles':'Los Angeles',
    'madrid':'Madrid',
    'malindi':'Malindi',
    'marrakech':'Marrakech',
    'masai-mara':'the Masai Mara',
    'medellin':'Medellín',
    'melbourne':'Melbourne',
    'mexico-city':'Mexico City',
    'miami':'Miami',
    'milan':'Milan',
    'mombasa':'Mombasa',
    'morocco':'Morocco',
    'muthaiga':'Muthaiga',
    'nairobi':'Nairobi',
    'naivasha':'Naivasha',
    'nakuru':'Nakuru',
    'nanyuki':'Nanyuki',
    'new-york':'New York',
    'ngong-road':'Ngong Road',
    'ngorongoro':'Ngorongoro',
    'nigeria':'Nigeria',
    'nyali':'Nyali',
    'oceania':'Oceania',
    'paris':'Paris',
    'parklands':'Parklands',
    'phuket':'Phuket',
    'port-harcourt':'Port Harcourt',
    'prague':'Prague',
    'rio-de-janeiro':'Rio de Janeiro',
    'rome':'Rome',
    'rongai':'Rongai',
    'runda':'Runda',
    'santorini':'Santorini',
    'seoul':'Seoul',
    'serengeti':'the Serengeti',
    'singapore':'Singapore',
    'south-africa':'South Africa',
    'south-c':'South C',
    'sydney':'Sydney',
    'syokimau':'Syokimau',
    'tanzania':'Tanzania',
    'thika-road':'Thika Road',
    'tokyo':'Tokyo',
    'upperhill':'Upper Hill',
    'victoria-island':'Victoria Island',
    'vienna':'Vienna',
    'watamu':'Watamu',
    'westlands':'Westlands',
    'zanzibar':'Zanzibar'
  };

  /* "cbd" (whose central business district?) and "global" (not a
     place) are deliberately absent from the map above. */

  function tidy(v) {
    var t = String(v || '');
    /* Someone typing "Medellín" should land on the same entry as the
       slug medellin. Strip the marks, keep the letter. */
    try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return t
      .toLowerCase()
      .replace(/\+/g, ' ')
      .replace(/[^a-z0-9\s-]/g, ' ')       /* commas, quotes, punctuation */
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function lookup(v) {
    var k = tidy(v);
    if (!k) return null;
    if (PLACES[k]) return PLACES[k];
    /* "Kilimani, Nairobi" and "kilimani apartments" should both land. */
    k = k.replace(/-(apartments|apartment|stays|stay|kenya|nigeria|ghana|tanzania)$/, '');
    if (PLACES[k]) return PLACES[k];
    var head = k.split('-')[0];
    if (head.length > 3 && PLACES[head]) return PLACES[head];
    return null;
  }

  /* Ordered by how much the page actually knows, most certain first. */
  function resolvePlace(explicit) {
    if (explicit) return lookup(explicit);
    var hit = null;
    try {
      hit = lookup(doc.documentElement.getAttribute('data-cabana-place'));
      if (hit) return hit;

      var m = doc.querySelector('meta[name="cabana-place"]');
      if (m && (hit = lookup(m.getAttribute('content')))) return hit;

      var q = new URLSearchParams(global.location.search);
      var keys = ['place', 'city', 'location', 'q', 'where'];
      for (var i = 0; i < keys.length; i++) {
        if ((hit = lookup(q.get(keys[i])))) return hit;
      }

      /* The slug of a landing page, for when the gate is put on one. */
      var seg = (global.location.pathname || '').split('/').filter(Boolean).pop() || '';
      if ((hit = lookup(seg.replace(/\.html$/, '')))) return hit;
    } catch (e) {}
    return null;
  }

  /* ═══ THE ONE GUESS THIS FILE MAKES ══════════════════════════════
     Everything above resolves what the PAGE was explicitly told. This
     is different: an attempt at what the platform itself believes
     about where the request came from, read from /api/geocode?whoami=1
     — which, on Vercel, is answering from a header the platform
     already computed before the function ran, not a network call this
     file makes. It is genuinely fast, but it is still a guess, and the
     one rule that matters more than speed is that a guess must never
     outrank something the page actually said.

     So: only attempted when nothing more certain was found, matched
     through the exact same validated map as everything else (never
     rendered from the response directly), and given a hard, short
     deadline. If it is not back — confidently, and pointing at a
     place on the map — before the word is due to reveal, the honest
     fallback stands and nothing is ever swapped in after the fact.
     A city correcting itself mid-reveal would read as a bug, not as
     precision. */
  function tryGeo(deadlineMs) {
    return new Promise(function (resolve) {
      var settled = false;
      function done(v) { if (!settled) { settled = true; resolve(v); } }

      var ac = null;
      try { ac = new global.AbortController(); } catch (e) {}
      var timer = global.setTimeout(function () {
        if (ac) try { ac.abort(); } catch (e) {}
        done(null);
      }, deadlineMs);

      var opts = ac ? { signal: ac.signal } : {};
      global.fetch('/api/geocode?whoami=1', opts).then(function (r) {
        return r && r.ok ? r.json() : null;
      }).then(function (d) {
        global.clearTimeout(timer);
        if (!d || !d.ok) return done(null);
        /* City first, then the wider region, then the country — the
           first of those that is actually on the map. Most IP geo
           resolves to a metro area, so city is the common case; region
           and country are what is left for it to be honest about
           when city does not land anywhere on the map. */
        done(lookup(d.city) || lookup(d.region) || lookup(d.country) || null);
      }).catch(function () {
        global.clearTimeout(timer);
        done(null);
      });
    });
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function r1(n) { return Math.round(n * 10) / 10; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ═══ THE HOUR ════════════════════════════════════════════════════
     The scene is the guest's own time of day: a peach dawn, a blue
     afternoon, a pink dusk, a night with stars and a lamp. The line
     under it says the same thing in words. The page sets the class
     before first paint (see apartments.html) so the frame is never the
     wrong colour for a moment; this is the fallback. */
  function hourOf(d) {
    /* The page decided before first paint; say the same thing. */
    var m = !d && /\bsg-(dawn|day|dusk|night)\b/.exec(doc.documentElement.className || '');
    if (m) return m[1];
    var h = (d || new Date()).getHours();
    return h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'dusk' : 'night';
  }
  var LEAD = { dawn: 'This morning', day: 'This afternoon', dusk: 'This evening', night: 'Tonight' };

  /* ═══ WHAT MAKES IT NEW EACH TIME ═════════════════════════════════
     Welcome, in a language spoken where Cabana hosts live. Never the
     same one twice in a row. A door colour from the coast, the hills or
     the old towns, and on some visits a cat who lives there. */
  var WELCOME = ['Karibu', 'Akwaaba', 'Ẹ káàbọ̀', 'Sannu', 'Sawubona', 'Murakaza neza', 'Bienvenue', 'Marhaba',
                 'Welkom', 'Tukutendereza', 'Mwaiseni', 'Dumela', 'Welcome', 'Kaabo', 'Nnoo'];
  var DOORS = [
    { a: '#1F6F78', b: '#164F56', c: '#2A8C96' },   /* Lamu teal */
    { a: '#B4533A', b: '#7E3524', c: '#CC6A4E' },   /* terracotta */
    { a: '#3D3A8C', b: '#28265F', c: '#5552B0' },   /* indigo */
    { a: '#C98A12', b: '#8C5E06', c: '#E0A21A' },   /* saffron */
    { a: '#2F6B4F', b: '#1E4A36', c: '#3E8663' },   /* forest */
    { a: '#8E2F5A', b: '#5F1D3C', c: '#AE4474' }    /* hibiscus */
  ];
  function pickFresh(list, key) {
    var last = null;
    try { last = global.localStorage.getItem(key); } catch (e) {}
    var opts = list.filter(function (x) { return String(x.a || x) !== last; });
    var v = pick(opts.length ? opts : list);
    try { global.localStorage.setItem(key, String(v.a || v)); } catch (e) {}
    return v;
  }

  function stars() {
    var a = [], b = [];
    for (var i = 0; i < 70; i++) {
      var s = r1(Math.random() * 100) + 'vw ' + r1(Math.random() * 58) + 'vh 0 ' + (Math.random() < .15 ? '1px' : '0') + ' rgba(255,255,255,' + (0.4 + Math.random() * 0.6).toFixed(2) + ')';
      (i % 2 ? a : b).push(s);
    }
    return '<i class="sg-stars" style="box-shadow:' + a.join(',') + '"></i><i class="sg-stars b" style="box-shadow:' + b.join(',') + '"></i>';
  }

  var PLANT = '<svg class="sg-plant" viewBox="0 0 80 120" aria-hidden="true">' +
    '<g class="lv">' +
      '<path d="M40 70 C30 50 14 44 8 30 C22 30 36 42 40 62Z" fill="#2E7D5B"/>' +
      '<path d="M40 70 C48 44 64 36 74 22 C66 42 54 52 42 68Z" fill="#3A9A6E"/>' +
      '<path d="M40 72 C38 46 40 22 44 6 C50 28 48 50 42 72Z" fill="#2A6E50"/>' +
      '<path d="M40 74 C28 64 16 66 6 58 C18 54 32 60 40 70Z" fill="#46A879"/>' +
    '</g>' +
    '<path d="M22 72 H58 L53 116 H27 Z" fill="#C8643B"/><path d="M20 70 H60 V78 H20Z" fill="#D9794E"/>' +
    '</svg>';
  var CAT = '<svg class="sg-cat" viewBox="0 0 60 70" aria-hidden="true">' +
    '<path class="tail" d="M14 60 C2 58 0 44 8 40" stroke="#1E1A2B" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="52" rx="17" ry="16" fill="#1E1A2B"/>' +
    '<circle cx="30" cy="28" r="12" fill="#1E1A2B"/>' +
    '<path d="M19 22 L21 9 L28 18Z M41 22 L39 9 L32 18Z" fill="#1E1A2B"/>' +
    '<g class="blink"><ellipse cx="25.5" cy="28" rx="2.2" ry="2.8" fill="#FFD66B"/><ellipse cx="34.5" cy="28" rx="2.2" ry="2.8" fill="#FFD66B"/></g>' +
    '</svg>';
  var BIRDS = '<svg class="sg-birds" viewBox="0 0 60 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
    '<path d="M2 8 Q6 3 10 8 Q14 3 18 8"/><path d="M26 14 Q29 10 32 14 Q35 10 38 14"/><path d="M44 5 Q47 1 50 5 Q53 1 56 5"/></svg>';

  /* Two grammars. Naming a place is a claim, so it is only made when
     something (an explicit param, a landing page, or a confident geo
     read) has told us the place. Otherwise the line says the one thing
     that is true on every load. Rendered twice at most: once at build
     time, and again if a geo lookup resolves before the reveal. */
  function placeLine(place, fallback, hour) {
    var lead = LEAD[hour || hourOf()] || 'Tonight';
    var words = function (t, d0) {
      return String(t).split(' ').map(function (wd, i) {
        return '<span style="--d:' + r1(d0 + i * 0.07) + 's">' + esc(wd) + '</span>';
      }).join(' ');
    };
    if (place) return words(lead + ' in', 0) + ' <b>' + words(place, 0.16) + '</b>';
    return words(lead + ', somewhere in', 0) + ' <b>' + words(fallback || 'Africa', 0.24) + '</b>';
  }

  function build(opts) {
    var place = opts.place || null;
    var hour = opts.hour || hourOf();
    var door = pickFresh(DOORS, 'cbn-karibu-door');
    var hello = pickFresh(WELCOME, 'cbn-karibu-word');
    var cat = Math.random() < 0.34 || hour === 'night' && Math.random() < 0.5;

    var g = doc.createElement('div');
    g.id = ID;
    g.setAttribute('role', 'presentation');
    g.setAttribute('aria-hidden', 'true');
    g.setAttribute('data-hour', hour);
    g.style.setProperty('--sg-door', door.a);
    g.style.setProperty('--sg-door-2', door.b);
    g.style.setProperty('--sg-door-3', door.c);
    g.innerHTML =
      '<div class="sg-sky"></div>' +
      (hour === 'night' ? stars() : BIRDS) +
      '<div class="sg-orb"></div>' +
      '<div class="sg-cam">' +
        '<div class="sg-scene">' +
          '<div class="sg-floor"></div>' +
          '<div class="sg-wall"></div>' +
          '<div class="sg-glow"></div>' +
          '<div class="sg-frame"><div class="sg-inside"></div><div class="sg-leaf sg-hero"><i class="sg-knob"></i></div></div>' +
          '<div class="sg-lamp"></div>' +
          '<div class="sg-spill"></div>' +
          '<div class="sg-step"></div>' +
          '<div class="sg-mat"><b>' + esc(hello) + '</b></div>' +
          PLANT + (cat ? CAT : '') +
        '</div>' +
      '</div>' +
      '<div class="sg-flood"></div>' +
      '<div class="sg-word">' +
        '<div class="sg-kicker"><i></i>Cabana &middot; Stays</div>' +
        '<div class="sg-place">' + placeLine(place, opts.fallback, hour) + '</div>' +
        '<div class="sg-note">Booked direct. The host keeps all of it.</div>' +
      '</div>' +
      '<button class="sg-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m9 6 6 6-6 6"/></svg>' +
      '</button>';
    return g;
  }

  /* The camera travels through the doorway, so its origin is the door,
     measured once after layout (before anything moves). */
  function aim(node) {
    try {
      var hero = node.querySelector('.sg-frame');
      if (!hero) return;
      var r = hero.getBoundingClientRect();
      var vw = global.innerWidth || 1, vh = global.innerHeight || 1;
      node.style.setProperty('--hx', r1(((r.left + r.width / 2) / vw) * 100) + '%');
      node.style.setProperty('--hy', r1(((r.top + r.height * 0.55) / vh) * 100) + '%');
    } catch (e) {}
  }

  function setHour(hour) {
    try {
      var cl = doc.documentElement.classList;
      if (!/sg-(dawn|day|dusk|night)/.test(doc.documentElement.className)) cl.add('sg-' + hour);
    } catch (e) {}
  }

  /* ═══ THE RUN ═════════════════════════════════════════════════════ */

  var live = null;

  function play(opts) {
    opts = opts || {};
    if (live) return live.promise;

    var reduce = false;
    try {
      reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var seen = false;
    try { seen = global.sessionStorage.getItem(SS_KEY) === '1'; } catch (e) {}
    var brief = opts.brief != null ? !!opts.brief : seen;
    if (opts.force) brief = false;

    /* Resolved once, here, rather than inside build() — play() needs
       to know whether something explicit already answered before it
       decides whether a geo guess is even worth attempting. */
    var explicitPlace = resolvePlace(opts.place);
    var hour = hourOf();
    setHour(hour);
    var buildOpts = { place: explicitPlace, fallback: opts.fallback, hour: hour };

    var node = opts.node || doc.getElementById(ID);
    if (!node) {
      node = build(buildOpts);
      (doc.body || doc.documentElement).appendChild(node);
    } else if (!node.querySelector('.sg-scene')) {
      /* A placeholder the page painted before this script arrived.
         Fill it rather than stacking a second gate on top of it. */
      var built = build(buildOpts);
      node.innerHTML = built.innerHTML;
      ['--sg-door', '--sg-door-2', '--sg-door-3'].forEach(function (k) { node.style.setProperty(k, built.style.getPropertyValue(k)); });
      node.setAttribute('data-hour', hour);
    }
    if (brief) node.classList.add('sg-brief');

    try { doc.documentElement.classList.add('sg-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }

    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('sg-lock'); } catch (e) {}
      if (node && node.parentNode) node.parentNode.removeChild(node);
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('visibilitychange', onHide);
      live = null;
    }
    function finish() {
      if (settled) return;
      settled = true;
      try { global.sessionStorage.setItem(SS_KEY, '1'); } catch (e) {}
      if (typeof opts.onDone === 'function') { try { opts.onDone(); } catch (e) {} }
      resolveFn();
      node.classList.add('sg-gone');
      global.setTimeout(teardown, 520);
    }
    /* Skipping still goes through the window. Cutting to the page
       would make the animation feel like something being taken away. */
    function skip() {
      if (settled) return;
      clearAll();
      aim(node);
      node.classList.add('sg-run', 'sg-now', 'sg-open', 'sg-go');
      at(reduce ? 300 : 880, finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    /* Starts at first script parse rather than waiting for
       DOMContentLoaded — see the note beside this script's tag in
       apartments.html. Held a beat longer here too, in step with
       flights and tours: three arrivals, one pace. */
    /* Trimmed from the original { lit:40, say:1050, go:3450, done:5900 }
       (a 6.4s hold on the very first load of a session) and the brief
       { lit:0, say:-1, go:420, done:1500 } (~2s on every repeat visit).
       Those read as a stall rather than a flourish, so the same beats
       — light, name the place, go, done — now land in well under half
       the time. */
    /* First visit of the session: lamp, welcome, door, through. Every
       visit after: the door is there and opens. Under two seconds and
       under one, and the page underneath is already loading. */
    var T = brief
      ? { lit: 0, say: -1,  open: 340, go: 500,  done: 1050 }
      : { lit: 0, say: 380, open: 820, go: 1200, done: 2450 };
    if (reduce) T = { lit: 0, say: 0, open: -1, go: 400, done: 700 };

    /* The whole sequence is CSS, scheduled now (see sg-run in the
       stylesheet), so it keeps time on the compositor while the page
       boots underneath. The timers below only mirror its milestones as
       classes and tidy up at the end. The doorway is measured first so
       the camera knows where to go. */
    aim(node);
    node.classList.add('sg-run', 'sg-lit');
    global.requestAnimationFrame(function () { aim(node); });

    /* The one guess this file makes, attempted only when nothing more
       certain answered and only when the word will actually be shown
       (brief mode hides it entirely — no point asking). Bounded well
       inside the gap before T.say, and it only ever writes to the DOM
       if that reveal has not happened yet: a city correcting itself
       mid-animation would read as a bug, not as precision. */
    if (!explicitPlace && !brief && T.say > 0) {
      var wordShown = false;
      var geoBudget = Math.max(120, T.say - 150);
      tryGeo(geoBudget).then(function (guess) {
        if (!guess || wordShown || settled) return;
        var el = node.querySelector('.sg-place');
        if (el) el.innerHTML = placeLine(guess, opts.fallback, hour);
      });
      at(T.say, function () { wordShown = true; node.classList.add('sg-say'); });
    } else if (T.say >= 0) {
      at(T.say, function () { node.classList.add('sg-say'); });
    }

    if (T.open >= 0) at(T.open, function () { aim(node); node.classList.add('sg-open'); });
    at(T.go, function () { node.classList.add('sg-open', 'sg-go'); });
    at(T.done, finish);
    at(T.done + 3000, finish);   /* hard ceiling */

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaStayGate = {
    play: play,
    /* Exposed so tests can assert that nothing outside the map is
       ever rendered, and so a page can check what it would resolve to. */
    places: PLACES,
    resolve: resolvePlace,
    skip: function () { if (live) live.skip(); },
    curtain: function (o) {
      o = o || {};
      if (doc.getElementById(ID)) return;
      var hr = hourOf();
      setHour(hr);
      var n = build({ place: resolvePlace(o.place), fallback: o.fallback, hour: hr });
      n.classList.add('sg-lit');
      (doc.body || doc.documentElement).appendChild(n);
      aim(n);
      try { doc.documentElement.classList.add('sg-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
