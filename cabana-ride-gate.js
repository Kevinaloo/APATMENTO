/* ═══════════════════════════════════════════════════════════════════
   CABANA · EVERY WAY ACROSS
   ───────────────────────────────────────────────────────────────────
   The arrival animation for /rides — Cabana Move.

   A journey draws itself across the continent and changes what it is
   as the ground changes: road, then water, then trail, then a
   transfer. It arrives. Then every other way across Africa draws at
   once behind it.

   Five decisions worth stating.

   · The route changes mode mid-journey, and that is the product. The
     page is explicit: a crossing, a city commute, a boda ride and a
     horse trail should never be squeezed into one generic taxi form.
     An animation of cars converging on a pin would have been exactly
     the generic taxi form the page rejects.

   · One colour per way of moving, from the page's own tokens. Coral
     is road, aqua is water, amber is trail, blue is a shuttle or
     transfer. A leg is not a coloured line — it is a different kind
     of movement that happens to have a colour.

   · The signature is the shape, not a dash pattern. Water legs
     genuinely undulate, trails wander, road legs run nearly straight
     and transfers are dead straight. Dash patterns were the obvious
     way to say "different mode" and they would have fought the
     stroke-dashoffset that draws each leg on.

   · The last beat is the whole point. One journey becoming a
     continent of journeys is the difference between "here is your
     route" and "every way across Africa", which is what the headline
     directly above this animation says.

   · Nothing animates inside a filtered subtree and nothing scales a
     field of glowing elements. Five previous gates, five lessons.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;
  if (global.CabanaRideGate) return;

  var ID = 'ride-gate';
  var SS_KEY = 'cbn-ride-gate-seen';
  var V = 1000;                      /* the map's own coordinate space */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function r1(n) { return Math.round(n * 10) / 10; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ═══ THE GROUND ═════════════════════════════════════════════════
     Not a map of Africa. Drawing a recognisable coastline badly would
     be worse than not drawing one, so the ground is an abstract field
     of faint connectors — enough to read as terrain with places on
     it, and honest about being a diagram.                          */

  function ground() {
    var out = '', i;
    for (i = 0; i < 26; i++) {
      var x1 = rnd(-60, V + 60), y1 = rnd(-60, V + 60);
      var x2 = x1 + rnd(-380, 380), y2 = y1 + rnd(-380, 380);
      var len = Math.round(Math.hypot(x2 - x1, y2 - y1)) + 2;
      out += '<path class="rg-road" d="M' + r1(x1) + ' ' + r1(y1) +
             'L' + r1(x2) + ' ' + r1(y2) + '" stroke-width="' +
             (Math.random() < 0.22 ? 2.4 : 1.2) + '" style="--len:' + len +
             ';--rd:' + Math.round(rnd(0, 700)) + 'ms"/>';
    }
    return out;
  }

  /* The slice of the map that is actually on screen.

     The map is a square wider than the viewport and anchored on the
     origin, so only a band around the origin is ever visible — about
     39% of its width on a phone. Markets are placed inside that band
     rather than across the whole square, or the journey spends most
     of its length off-frame. */
  function window_() {
    var vw = 390, vh = 844;
    try { vw = global.innerWidth || vw; vh = global.innerHeight || vh; } catch (e) {}
    var M = Math.max(vw, vh) * 1.18;
    var visW = Math.min(1, vw / M), visH = Math.min(1, vh / M);
    var pad = 0.1;
    return {
      w: visW * (1 - pad), h: visH * (1 - pad),
      ax: 0.5, ay: 0.56          /* where the origin sits in frame */
    };
  }

  /* Markets. Scattered, but never so close they read as one blob. */
  function markets(n, win) {
    var x0 = (0.5 - win.w * win.ax) * V, x1 = (0.5 + win.w * (1 - win.ax)) * V;
    var y0 = (0.5 - win.h * win.ay) * V, y1 = (0.5 + win.h * (1 - win.ay)) * V;
    var out = [], tries = 0;
    while (out.length < n && tries++ < n * 40) {
      var p = { x: rnd(x0, x1), y: rnd(y0, y1) };
      var ok = true;
      for (var i = 0; i < out.length; i++) {
        if (Math.hypot(out[i].x - p.x, out[i].y - p.y) < 46) { ok = false; break; }
      }
      if (ok) out.push(p);
    }
    return out;
  }

  /* ═══ THE WAYS OF MOVING ══════════════════════════════════════════
     Colour and stroke from the page's tokens; the shape is what
     actually distinguishes them.                                   */

  var MODES = [
    { key: 'Road',     c: '#ff715b', w: 2.8, wobble: 14,  steps: 5 },
    { key: 'Water',    c: '#63efdc', w: 2.4, wobble: 52,  steps: 9 },
    { key: 'Trail',    c: '#ffc565', w: 2.0, wobble: 34,  steps: 8 },
    { key: 'Shuttle',  c: '#8abfff', w: 2.6, wobble: 3,   steps: 3 }
  ];

  /* A leg between two points, bent according to how that mode moves.
     Water undulates across the line, a trail wanders, road bends a
     little around what is in the way, a shuttle does not bend. */
  function leg(from, to, mode) {
    var dx = to.x - from.x, dy = to.y - from.y;
    var dist = Math.hypot(dx, dy) || 1;
    var nx = -dy / dist, ny = dx / dist;          /* perpendicular */
    var d = 'M' + r1(from.x) + ' ' + r1(from.y);
    var len = 0, px = from.x, py = from.y;

    for (var i = 1; i <= mode.steps; i++) {
      var t = i / mode.steps;
      /* Water alternates side to side; everything else drifts. */
      var swing = mode.key === 'Water'
        ? Math.sin(t * Math.PI * 2.4) * mode.wobble
        : Math.sin(t * Math.PI) * rnd(-mode.wobble, mode.wobble);
      var x = from.x + dx * t + nx * swing;
      var y = from.y + dy * t + ny * swing;
      d += 'L' + r1(x) + ' ' + r1(y);
      len += Math.hypot(x - px, y - py);
      px = x; py = y;
    }
    return { d: d, len: Math.round(len) + 4 };
  }

  /* ═══ BUILD ═══════════════════════════════════════════════════════ */

  function build(opts) {
    var pct = function (v) { return r1((v / V) * 100) + '%'; };
    var win = window_();
    var places = markets(26, win);

    /* The journey: four or five stops picked so each leg is a real
       distance rather than a hop between neighbours. */
    var stops = [];
    var pool = places.slice();
    /* Start from the market nearest the middle of the map. The frame
       is anchored on the origin and the visible window is measured
       from the map's centre, so those two have to be the same point. */
    var ci = 0, cbest = Infinity;
    for (var c0 = 0; c0 < pool.length; c0++) {
      var cd = Math.hypot(pool[c0].x - V / 2, pool[c0].y - V / 2);
      if (cd < cbest) { cbest = cd; ci = c0; }
    }
    stops.push(pool.splice(ci, 1)[0]);
    var legCount = 4;
    /* A leg has to cross a real part of the frame, and how much that
       is depends on how much frame there is. */
    var minLeg = Math.min(win.w, win.h) * V * 0.38;
    for (var s2 = 0; s2 < legCount; s2++) {
      var last = stops[stops.length - 1], bestI = 0, best = -1;
      for (var i = 0; i < pool.length; i++) {
        var dd = Math.hypot(pool[i].x - last.x, pool[i].y - last.y);
        /* Far, but not the far corner every time. */
        var score = dd * rnd(0.6, 1.4);
        if (score > best && dd > minLeg) { best = score; bestI = i; }
      }
      stops.push(pool.splice(bestI, 1)[0]);
    }

    /* Modes along the way. Road first, because most journeys start on
       one, then whatever the ground turns into. */
    var order = [MODES[0]].concat(
      [MODES[1], MODES[2], MODES[3]].sort(function () { return Math.random() - 0.5; }));

    var legs = '', cursor = 0, timeline = [];
    for (var k = 0; k < stops.length - 1; k++) {
      var m = order[k % order.length];
      var g = leg(stops[k], stops[k + 1], m);
      var dur = Math.round(620 + g.len * 0.55);
      legs += '<path class="rg-leg" d="' + g.d + '" style="--c:' + m.c +
        ';--sw:' + m.w + ';--len:' + g.len +
        ';--ld:' + dur + 'ms;--lo:' + cursor + 'ms"/>';
      timeline.push({ at: cursor, mode: m.key, colour: m.c });
      cursor += dur + 90;
    }

    /* Every other way across, drawn at the end. Thin, many, and in
       every mode's colour, because that is the claim being made. */
    var web = '';
    for (var w = 0; w < 34; w++) {
      var A = places[Math.floor(Math.random() * places.length)];
      var B = places[Math.floor(Math.random() * places.length)];
      if (A === B) continue;
      if (Math.hypot(A.x - B.x, A.y - B.y) < minLeg * 0.6) continue;
      var wm = MODES[Math.floor(Math.random() * MODES.length)];
      var wg = leg(A, B, wm);
      web += '<path class="rg-web" d="' + wg.d + '" style="--c:' + wm.c +
        ';--len:' + wg.len + ';--wl:' + Math.round(900 + wg.len * 0.5) +
        'ms;--wo:' + Math.round(rnd(0, 900)) + 'ms"/>';
    }

    /* Dots: every market, with the journey's own stops marked. */
    var dots = '';
    places.forEach(function (p2) {
      var idx = stops.indexOf(p2);
      var isStop = idx > 0;      /* the first stop is the origin pin */
      var so = 0;
      if (isStop && timeline[idx - 1]) so = timeline[idx - 1].at + 500;
      dots += '<i class="rg-dot' + (isStop ? ' is-stop' : '') + '" style="' +
        '--x:' + pct(p2.x) + ';--y:' + pct(p2.y) + ';' +
        '--dd:' + Math.round(rnd(0, 620)) + 'ms;--so:' + so + 'ms"></i>';
    });

    var o = stops[0];
    var last2 = stops[stops.length - 1];
    var tx = r1((50 - (last2.x / V) * 100) * 0.5);
    var ty = r1((50 - (last2.y / V) * 100) * 0.5);

    var g2 = doc.createElement('div');
    g2.id = ID;
    g2.setAttribute('role', 'presentation');
    g2.setAttribute('aria-hidden', 'true');
    g2.style.setProperty('--ox', pct(o.x));
    g2.style.setProperty('--oy', pct(o.y));
    /* Four decimals, not one: r1() is for percentages like 43.2, and
       rounding a 0-1 fraction the same way moves the whole map. */
    g2.style.setProperty('--oxf', (o.x / V).toFixed(4));
    g2.style.setProperty('--oyf', (o.y / V).toFixed(4));
    g2.style.setProperty('--vx', (win.ax * 100) + '%');
    g2.style.setProperty('--vy', (win.ay * 100) + '%');
    g2.style.setProperty('--tx', tx + '%');
    g2.style.setProperty('--ty', ty + '%');

    g2.innerHTML =
      '<div class="rg-stage">' +
        '<div class="rg-air"></div>' +
        '<div class="rg-map">' +
          '<svg class="rg-net" viewBox="0 0 ' + V + ' ' + V + '" ' +
            'preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
            '<g>' + ground() + '</g>' +
            '<g>' + web + '</g>' +
            '<g>' + legs + '</g>' +
          '</svg>' +
          dots +
          '<i class="rg-origin"></i>' +
        '</div>' +
        '<div class="rg-word">' +
          '<div class="rg-line">' + esc(opts.title || 'Every way') +
            '<span>' + esc(opts.tail || 'across Africa.') + '</span></div>' +
          '<div class="rg-sub">' + esc(opts.sub || 'Cabana Move') + '</div>' +
        '</div>' +
        '<div class="rg-readout" id="rg-readout">Mode <b>Road</b></div>' +
        '<div class="rg-flood"></div>' +
      '</div>' +
      '<button class="rg-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m9 6 6 6-6 6"/></svg>' +
      '</button>';

    g2.__timeline = timeline;
    g2.__journeyMs = cursor;
    return g2;
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
    } else if (!node.querySelector('.rg-stage')) {
      /* A placeholder the page painted before this script arrived.
         Fill it rather than stacking a second gate on top of it. */
      var built = build(opts);
      node.innerHTML = built.innerHTML;
      ['--ox', '--oy', '--oxf', '--oyf', '--vx', '--vy', '--tx', '--ty'].forEach(function (v) {
        node.style.setProperty(v, built.style.getPropertyValue(v));
      });
      node.__timeline = built.__timeline;
      node.__journeyMs = built.__journeyMs;
    }
    if (brief) node.classList.add('rg-brief');

    /* The map is a square larger than the viewport so the city runs
       off every edge. Set here rather than in CSS because the driver
       dots and the SVG have to agree on it exactly. */
    try {
      node.style.setProperty('--map',
        Math.round(Math.max(global.innerWidth, global.innerHeight) * 1.18) + 'px');
    } catch (e) {}

    try { doc.documentElement.classList.add('rg-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }

    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('rg-lock'); } catch (e) {}
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
      node.classList.add('rg-gone');
      global.setTimeout(teardown, 520);
    }
    /* Skipping still locks a driver and closes on them. Cutting to the
       page would make the dispatch feel abandoned rather than served. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.add('rg-brief', 'rg-move', 'rg-web-on', 'rg-go');
      at(reduce ? 220 : 620, finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    var read = node.querySelector('#rg-readout');
    function say(mode, colour) {
      if (!read) return;
      read.innerHTML = 'Mode <b style="color:' + colour + '">' + esc(mode) + '</b>';
    }

    var journey = node.__journeyMs || 3200;
    var line = node.__timeline || [];

    /* ground → start → journey → every other way → word → go.
       The journey's own length decides the pace, so a long route is
       not cut off and a short one does not leave the screen idling. */
    var T = brief
      ? { online: 0, tap: 0,   move: 120, web: 400,  say: -1, go: 900, done: 2000 }
      : { online: 0, tap: 800, move: 1250 };
    if (!brief) {
      T.web = T.move + journey - 260;
      T.say = T.web + 420;
      T.go = T.web + 1500;
      T.done = T.go + 1400;
    }
    if (reduce) T = { online: 0, tap: 0, move: 0, web: 0, say: 0, go: 700, done: 1250 };

    at(T.online, function () { node.classList.add('rg-online'); });
    at(T.tap, function () { node.classList.add('rg-tap'); });
    at(T.move, function () { node.classList.add('rg-move'); });
    at(T.web, function () { node.classList.add('rg-web-on'); });

    /* The readout names the mode the journey is on right now, taken
       from the legs themselves rather than a second hard-coded list
       that could drift out of step with them. */
    if (!brief && !reduce) {
      line.forEach(function (leg2) {
        at(T.move + leg2.at + 60, function () { say(leg2.mode, leg2.colour); });
      });
      at(T.web + 200, function () { say('Every mode', '#f5f1e8'); });
    }

    if (T.say >= 0) at(T.say, function () { node.classList.add('rg-say'); });
    at(T.go, function () { node.classList.add('rg-go'); });
    at(T.done, finish);
    /* Hard ceiling. Nothing above is allowed to be the only thing
       standing between a guest and the page. */
    at(T.done + 3000, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaRideGate = {
    play: play,
    skip: function () { if (live) live.skip(); },
    curtain: function (o) {
      o = o || {};
      if (doc.getElementById(ID)) return;
      var n = build(o);
      n.style.setProperty('--map',
        Math.round(Math.max(global.innerWidth, global.innerHeight) * 1.18) + 'px');
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('rg-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
