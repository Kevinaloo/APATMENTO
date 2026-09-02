/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE FACADE — engine
   ───────────────────────────────────────────────────────────────────
   Builds a block at night, wakes its windows, and goes through one.

   On the place name
   ─────────────────
   Every load names a market Cabana actually lists in, and it is not
   the same one twice in a row. This is the only part of any arrival
   animation on this platform that a competitor could not copy by
   looking at it, because copying it would mean having the inventory.
   It is also the reason people will watch it more than once, which is
   the whole difference between a loading screen and a brand.

   The list is held here rather than fetched. A gate that waits on the
   network to know what to say is a gate that sometimes says nothing,
   and these neighbourhoods change about once a year.

   On the cascade
   ──────────────
   Windows do not light at random. A random cascade reads as noise.
   They light in loose diagonal sweeps with a couple of clusters, the
   way a building fills up in the evening, and the one the camera goes
   through lights last and alone after a deliberate half-second of
   nothing. That pause is the only piece of timing here anyone will
   consciously register.

   On never trapping anyone
   ────────────────────────
   Six ways out: the sequence ending, window load, a tap, Escape, a
   hard wall-clock ceiling, and the tab being hidden. Any one removes
   the gate and unlocks scrolling. An arrival animation that can
   strand a visitor is not a flourish, it is an outage.
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

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function r1(n) { return Math.round(n * 10) / 10; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Window light temperatures. Warm dominates because most rooms are
     lit warm; the cold one is a television and is deliberately rare. */
  var TONES = [
    { a: '#FFB65C', b: '#FF9A3C', w: 30 },   /* lamp behind a curtain */
    { a: '#FFE4B8', b: '#FFC176', w: 26 },   /* kitchen, big light on */
    { a: '#FFCE8A', b: '#FFA94D', w: 20 },
    { a: '#FFF0D4', b: '#FFD9A0', w: 12 },   /* bathroom, very white  */
    { a: '#9FC2FF', b: '#6E93E8', w: 8, tv: true },
    { a: '#C9B4FF', b: '#9B79F0', w: 4 }     /* someone's violet strip light */
  ];
  function tone() {
    var total = 0, i;
    for (i = 0; i < TONES.length; i++) total += TONES[i].w;
    var r = Math.random() * total;
    for (i = 0; i < TONES.length; i++) { r -= TONES[i].w; if (r <= 0) return TONES[i]; }
    return TONES[0];
  }

  /* ═══ THE BLOCK ═══════════════════════════════════════════════════
     Percentages throughout, so the hero window's position is known
     without ever reading layout — which matters, because reading
     layout mid-build is how a smooth animation acquires a stutter. */

  function windows(opt) {
    var cols = opt.cols, rows = opt.rows;
    var padX = opt.padX, padY = opt.padY, gapX = opt.gapX, gapY = opt.gapY;
    var w = (100 - padX * 2 - gapX * (cols - 1)) / cols;
    var h = (100 - padY * 2 - gapY * (rows - 1)) / rows;

    /* Diagonal sweep: a building fills from a corner, not uniformly.
       Two clusters on top of that so it does not read as a wipe. */
    var c1 = { c: Math.floor(rnd(0, cols)), r: Math.floor(rnd(0, rows)) };
    var c2 = { c: Math.floor(rnd(0, cols)), r: Math.floor(rnd(0, rows)) };

    var out = [], hero = null;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = padX + c * (w + gapX);
        var y = padY + r * (h + gapY);
        var isHero = opt.hero && c === opt.hero.c && r === opt.hero.r;

        /* Dark windows are not failures. A block with every light on
           is a block nobody lives in. */
        var lit = isHero || Math.random() < (opt.litRate || 0.62);

        var d = (c / cols) * 0.55 + (1 - r / rows) * 0.5;
        var near1 = Math.abs(c - c1.c) + Math.abs(r - c1.r);
        var near2 = Math.abs(c - c2.c) + Math.abs(r - c2.r);
        var cluster = Math.min(near1, near2) < 2 ? -0.22 : 0;
        var delay = opt.t0 + (d + cluster) * opt.span + rnd(0, 0.16);

        var t = tone();
        /* Doors sit on balcony rows and run to the slab, so they are
           taller and narrower than the windows either side of them. */
        var isDoor = isHero ? !!opt.doors
                   : (opt.doors && r % 2 === 1 && Math.random() < 0.42);
        var wh = isDoor ? h * 1.34 : h;
        var wy = isDoor ? y - h * 0.34 : y;
        var ww = isDoor ? w * 0.76 : w;
        var wx = isDoor ? x + w * 0.12 : x;

        var w2 = { x: r1(wx), y: r1(wy), w: r1(ww), h: r1(wh), lit: lit,
                   on: Math.max(0, r1(delay)), t: t, hero: isHero, door: isDoor };
        if (isHero) { w2.on = opt.t0 + opt.span + 0.55; hero = w2; }  /* last, alone */
        out.push(w2);
      }
    }
    return { list: out, hero: hero, w: w, h: h };
  }

  function figure(win) {
    /* Only a handful of windows get anyone in them. Past about one in
       five it stops reading as life and starts reading as a pattern. */
    var kind = pick(['person', 'plant', 'lamp', 'curtain', 'curtain']);
    if (kind === 'curtain') {
      return '<i class="sg-fig sg-fig-curtain l"></i><i class="sg-fig sg-fig-curtain r"></i>';
    }
    return '<i class="sg-fig sg-fig-' + kind + '" style="--fx:' + r1(rnd(18, 62)) + '%"></i>';
  }

  function winHTML(w, withFig) {
    var s = 'left:' + w.x + '%;top:' + w.y + '%;width:' + w.w + '%;height:' + w.h + '%';
    var lit = '';
    if (w.lit) {
      var vars = '--tone:' + w.t.a + ';--tone-2:' + w.t.b + ';--on:' + w.on + 's';
      lit = '<i class="sg-win-l' + (w.t.tv ? ' is-tv' : '') + '" style="' + vars + '"></i>' +
            '<i class="sg-win-s" style="' + vars + '"></i>' +
            (withFig ? figure(w) : '');
    }
    return '<div class="sg-win' + (w.hero ? ' sg-hero' : '') + (w.door ? ' is-door' : '') +
           '" style="' + s + '">' + lit + '</div>';
  }

  /* One building. Returns its markup plus, if it holds the hero
     window, that window's centre in stage percentages. */
  function block(o) {
    var g = windows(o.grid);
    var inner = '', figs = 0;
    for (var i = 0; i < g.list.length; i++) {
      var w = g.list[i];
      var wantFig = w.lit && !w.hero && figs < (o.figures || 0) && Math.random() < 0.34;
      if (wantFig) figs++;
      inner += winHTML(w, wantFig);
    }

    /* Balconies on alternate rows, aligned to the window grid. */
    var balc = '';
    if (o.balconies) {
      var rows = o.grid.rows, padY = o.grid.padY, gapY = o.grid.gapY;
      var hh = (100 - padY * 2 - gapY * (rows - 1)) / rows;
      for (var r = 1; r < rows; r += 2) {
        var y = padY + r * (hh + gapY) - gapY * 0.4;
        balc += '<i class="sg-balc" style="left:4%;right:4%;top:' + r1(y) + '%"></i>' +
                '<i class="sg-rail" style="left:6%;right:6%;top:' + r1(y - 2.6) + '%"></i>';
      }
    }

    /* Roof clutter, positioned along the parapet. */
    var roof = '';
    if (o.roof) {
      roof += '<i class="sg-tank" style="left:11%;--tw:' + Math.round(rnd(22, 32)) + 'px;--th:' +
              Math.round(rnd(14, 20)) + 'px"></i>';
      if (Math.random() < 0.8) {
        roof += '<i class="sg-tank" style="left:29%;--tw:' + Math.round(rnd(18, 26)) + 'px;--th:' +
                Math.round(rnd(12, 17)) + 'px"></i>';
      }
      roof += '<i class="sg-dish" style="right:24%;--dw:' + Math.round(rnd(14, 20)) + 'px"></i>';
      roof += '<i class="sg-mast" style="right:12%;--mh:' + Math.round(rnd(26, 44)) + 'px"></i>';
    }

    /* Laundry, on one balcony, on one building. Any more and it is a
       theme rather than a detail. */
    var wash = '';
    if (o.laundry) {
      var ly = rnd(40, 68);
      wash += '<i class="sg-line" style="left:9%;right:9%;top:' + r1(ly) + '%"></i>';
      for (var k = 0; k < 5; k++) {
        wash += '<i class="sg-cloth" style="left:' + r1(14 + k * 14 + rnd(-2, 2)) + '%;top:' +
          r1(ly) + '%;--cw:' + Math.round(rnd(6, 10)) + 'px;--ch:' + Math.round(rnd(9, 15)) +
          'px;--cd:' + r1(rnd(3.2, 5.4)) + 's;--cdl:' + r1(rnd(0, 2)) + 's"></i>';
      }
    }

    var style = 'left:' + o.x + '%;width:' + o.w + '%;height:' + o.h + '%';
    var html = '<div class="sg-block" style="' + style + '">' +
                 '<div class="sg-face">' + balc + inner + wash + '</div>' +
                 roof +
               '</div>';

    var heroAt = null;
    if (g.hero) {
      heroAt = {
        x: o.x + (o.w * (g.hero.x + g.hero.w / 2) / 100),
        /* Blocks are bottom-anchored, so a window's y within the block
           has to be mapped back into the stage before it means anything. */
        y: (100 - o.h) + (o.h * (g.hero.y + g.hero.h / 2) / 100)
      };
    }
    return { html: html, hero: heroAt };
  }

  function farSkyline() {
    var out = '', x = -4;
    while (x < 104) {
      var w = rnd(7, 15), h = rnd(16, 40);
      out += block({
        x: r1(x), w: r1(w), h: r1(h),
        grid: { cols: Math.max(2, Math.round(w / 4)), rows: Math.max(4, Math.round(h / 4.5)),
                padX: 13, padY: 6, gapX: 10, gapY: 5, litRate: 0.34, t0: 0.1, span: 1.1 },
        roof: Math.random() < 0.35
      }).html;
      x += w + rnd(0.5, 3);
    }
    return out;
  }

  function build(opts) {
    var place = resolvePlace(opts.place);

    /* The hero block. Off-centre, because a building centred in frame
       is a diagram and a building slightly off it is a photograph. */
    var heroGrid = {
      cols: 4, rows: 8, padX: 8, padY: 4, gapX: 7, gapY: 3.4,
      litRate: 0.6, t0: 0.35, span: 1.15,
      hero: { c: 2, r: 3 }
    };
    var mid = block({ x: 24, w: 52, h: 70, grid: heroGrid, balconies: true,
                      roof: true, laundry: true, figures: 5, doors: true });

    var left = block({
      x: -3, w: 27, h: 56,
      grid: { cols: 3, rows: 5, padX: 9, padY: 7, gapX: 8, gapY: 7,
              litRate: 0.5, t0: 0.2, span: 1.3 },
      balconies: true, roof: true, figures: 2
    });
    var right = block({
      x: 68, w: 30, h: 63,
      grid: { cols: 3, rows: 5, padX: 9, padY: 6, gapX: 8, gapY: 6,
              litRate: 0.52, t0: 0.25, span: 1.25 },
      balconies: true, roof: true, laundry: true, figures: 2
    });

    var h = mid.hero || { x: 52, y: 46 };

    /* Two grammars. Naming a place is a claim, so it is only made when
       the page has told us the place. Otherwise the line says the one
       thing that is true on every load and can never be contradicted —
       and a facade full of lit windows is, if anything, a better
       picture of "somewhere" than of anywhere in particular. */
    var lead = place ? 'Tonight in ' : 'Tonight, somewhere in ';
    var name = place || (opts.fallback || 'Africa');

    var words = String(name).split(' ').map(function (wd, i) {
      return '<span style="--d:' + (0.18 + i * 0.09) + 's">' + esc(wd) + '</span>';
    }).join(' ');

    var g = doc.createElement('div');
    g.id = ID;
    g.setAttribute('role', 'presentation');
    g.setAttribute('aria-hidden', 'true');
    g.style.setProperty('--hx', r1(h.x) + '%');
    g.style.setProperty('--hy', r1(h.y) + '%');
    g.innerHTML =
      '<div class="sg-stage">' +
        '<div class="sg-sky"></div>' +
        '<div class="sg-plane sg-far"><div class="sg-blur">' + farSkyline() + '</div></div>' +
        '<div class="sg-haze"></div>' +
        '<div class="sg-city">' + left.html + right.html + mid.html + '</div>' +
        '<div class="sg-scrim"></div>' +
        '<div class="sg-word">' +
          '<div class="sg-kicker">Cabana &middot; Stays</div>' +
          '<div class="sg-place">' + lead + '<b>' + words + '</b></div>' +
          '<div class="sg-note">Booked direct. The host keeps all of it.</div>' +
        '</div>' +
        '<div class="sg-focus"></div>' +
        '<div class="sg-flood"></div>' +
      '</div>' +
      '<button class="sg-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m9 6 6 6-6 6"/></svg>' +
      '</button>';
    return g;
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

    var node = opts.node || doc.getElementById(ID);
    if (!node) {
      node = build(opts);
      (doc.body || doc.documentElement).appendChild(node);
    } else if (!node.querySelector('.sg-stage')) {
      /* A placeholder the page painted before this script arrived.
         Fill it rather than stacking a second gate on top of it. */
      var built = build(opts);
      node.innerHTML = built.innerHTML;
      node.style.setProperty('--hx', built.style.getPropertyValue('--hx'));
      node.style.setProperty('--hy', built.style.getPropertyValue('--hy'));
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
      node.classList.add('sg-brief', 'sg-go');
      at(reduce ? 260 : 620, finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    /* Matches the flights desk and the tours canopy: about 4.8s, so
       the three arrivals on this platform feel like one system. */
    var T = brief
      ? { lit: 0,  say: -1,  go: 420,  done: 1500 }
      : { lit: 40, say: 900, go: 2900, done: 4800 };
    if (reduce) T = { lit: 0, say: 0, go: 620, done: 1150 };

    at(T.lit, function () { node.classList.add('sg-lit'); });
    if (T.say >= 0) at(T.say, function () { node.classList.add('sg-say'); });
    at(T.go, function () { node.classList.add('sg-go'); });
    at(T.done, finish);
    at(T.done + 2800, finish);   /* hard ceiling */

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
      var n = build(o);
      n.classList.add('sg-lit');
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('sg-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
