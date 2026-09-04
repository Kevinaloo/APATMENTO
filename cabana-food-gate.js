/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE FIRE — engine
   ───────────────────────────────────────────────────────────────────
   Lays a bed of charcoal, lights one coal, and lets the heat find the
   rest of them.

   On the spread
   ─────────────
   Every coal's delay is its distance from the coal that caught first.
   That single line is the whole effect: heat crosses the bed instead
   of the bed turning on. Divide by a speed to get a wavefront that
   travels at a believable rate, add a little jitter so the front is
   ragged rather than a clean circle, and that is a fire taking.

   The ignition point is deliberately off-centre and low. A fire that
   catches in the exact middle of the frame reads as a diagram.

   On the bed
   ──────────
   Coals are laid in rows with the back rows smaller, dimmer and more
   tightly packed. That size gradient is the only perspective in the
   scene and it is doing all the work of making a flat plane of divs
   read as a bed you are looking down into.

   Nothing here is a circle. Each coal gets four different corner
   radii on both axes, so it is a lump. An ellipse would be a pebble.

   On not hurting anyone
   ─────────────────────
   The breathing is around 0.6Hz — a slow swell between 72% and 100%
   opacity on an already-warm surface. That is far below the three
   flashes per second that WCAG 2.3.1 sets as the photosensitive
   seizure threshold, and it is a small enough swing to read as heat
   rather than as something switching. There is no flash anywhere in
   this sequence at all. Under prefers-reduced-motion the bed simply
   sits at heat and nothing moves.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;
  if (global.CabanaFoodGate) return;

  var ID = 'food-gate';
  var SS_KEY = 'cbn-food-gate-seen';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* A lump, expressed as eight radii. */
  function lump() {
    function p() { return Math.round(rnd(34, 66)); }
    return p() + '% ' + p() + '% ' + p() + '% ' + p() + '% / ' +
           p() + '% ' + p() + '% ' + p() + '% ' + p() + '%';
  }

  /* ═══ THE BED ═════════════════════════════════════════════════════
     Rows from the back of the bed forward. Back rows are smaller,
     packed tighter and set further apart in delay, because they are
     further away and the heat reaches them later.                  */

  function bed() {
    var ROWS = 9;
    var coals = [];

    for (var r = 0; r < ROWS; r++) {
      var t = r / (ROWS - 1);              /* 0 back … 1 front */
      /* Front coals are nearly twice the size of the back ones. */
      var scale = 0.34 + t * 1.15;
      var y = 2 + t * 50;                  /* % up from the bed floor */
      var perRow = Math.round(17 - t * 8); /* back rows hold more */
      var jitterY = 3 + t * 5;

      for (var i = 0; i < perRow; i++) {
        var x = (i + 0.5) * (108 / perRow) - 4 + rnd(-3.2, 3.2);
        coals.push({
          x: r1(x),
          y: r1(y + rnd(-jitterY, jitterY)),
          w: Math.round(rnd(20, 58) * scale),
          h: Math.round(rnd(13, 34) * scale),
          rot: Math.round(rnd(-26, 26)),
          depth: t
        });
      }
    }

    /* Where it catches. Off-centre and low, because the middle of the
       frame is where a diagram would start. */
    var ig = { x: rnd(28, 44), y: rnd(10, 22) };

    /* The furthest coal sets the scale, so the wavefront always
       finishes crossing the bed in about the same time however the
       bed happened to be laid out. */
    var far = 0, i2;
    for (i2 = 0; i2 < coals.length; i2++) {
      var dx0 = coals[i2].x - ig.x, dy0 = (coals[i2].y - ig.y) * 1.9;
      var d0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
      if (d0 > far) far = d0;
    }

    var out = '';
    for (i2 = 0; i2 < coals.length; i2++) {
      var c = coals[i2];
      var dx = c.x - ig.x;
      /* y is weighted because the bed is seen at an angle: a coal one
         unit further back is further away than one unit sideways. */
      var dy = (c.y - ig.y) * 1.9;
      var dist = Math.sqrt(dx * dx + dy * dy) / far;      /* 0 … 1 */

      var delay = Math.round(dist * 1500 + rnd(0, 190));
      /* Breathing is slower and shallower toward the back, so the bed
         never pulses as one object. */
      var bd = r1(2.5 + rnd(0, 1.9) + (1 - c.depth) * 0.7);
      var bo = Math.round(rnd(0, 2200));

      /* Ash forms first where it has been hot longest, which is
         nearest the ignition, and never on all of it. */
      /* Temperature. Coals near where it caught have been burning
         longest and run hottest; the edges of a bed never fully take.
         A little randomness on top so it is not a clean gradient. */
      var heat0 = Math.max(0, Math.min(1, (1 - dist) * 0.75 + rnd(-0.22, 0.34)));
      var cool = heat0 < 0.24;
      var core = heat0 > 0.72 ? '#FFF3DC' : heat0 > 0.44 ? '#FFE9C4' : '#FFC98A';
      var mid  = heat0 > 0.72 ? '#FFC978' : heat0 > 0.44 ? '#FFB35C' : '#F0803A';
      /* Depth dims as well as heat: the back of a bed is further from
         the eye and reads darker whatever temperature it is at. */
      var fade = 0.42 + c.depth * 0.58;
      var peak = r1((0.72 + heat0 * 0.28) * fade);
      var rest = r1((0.5 + heat0 * 0.42) * fade);

      var ashed = Math.random() < (0.16 + (1 - dist) * 0.4);
      var ash = ashed
        ? '<i class="fg-ash" style="--ao:' + r1(rnd(0.28, 0.66)) +
          ';--ad:' + Math.round(delay + rnd(900, 2400)) + 'ms"></i>'
        : '';

      out += '<i class="fg-c' + (cool ? ' is-cool' : '') + '" style="' +
        '--x:' + c.x + '%;--y:' + c.y + '%;' +
        '--w:' + c.w + 'px;--h:' + c.h + 'px;' +
        '--rot:' + c.rot + 'deg;--r:' + lump() + ';' +
        '--core:' + core + ';--mid:' + mid + ';' +
        '--peak:' + peak + ';--rest:' + rest + ';' +
        '--d:' + delay + 'ms;--bd:' + bd + 's;--bo:' + bo + 'ms' +
        '">' + ash + '</i>';
    }
    return out;
  }

  function heat() {
    var out = '', i;
    for (i = 0; i < 5; i++) {
      out += '<i class="fg-heat" style="' +
        '--x:' + r1(rnd(18, 82)) + '%;--b:' + r1(rnd(14, 30)) + '%;' +
        '--w:' + Math.round(rnd(90, 190)) + 'px;--h:' + Math.round(rnd(150, 260)) + 'px;' +
        '--dx:' + Math.round(rnd(-24, 24)) + 'px;' +
        '--hd:' + r1(rnd(4.2, 7)) + 's;--ho:' + Math.round(rnd(0, 3400)) + 'ms' +
        '"></i>';
    }
    return out;
  }

  function sparks() {
    var out = '', i;
    for (i = 0; i < 16; i++) {
      out += '<i class="fg-spark" style="' +
        '--x:' + r1(rnd(10, 90)) + '%;--b:' + r1(rnd(12, 32)) + '%;' +
        '--s:' + r1(rnd(2, 4.4)) + 'px;' +
        '--dx:' + Math.round(rnd(-56, 56)) + 'px;' +
        '--dy:' + Math.round(rnd(-140, -300)) + 'px;' +
        '--sd:' + r1(rnd(1.9, 3.6)) + 's;--so:' + Math.round(rnd(0, 3800)) + 'ms' +
        '"></i>';
    }
    return out;
  }

  function build(opts) {
    var g = doc.createElement('div');
    g.id = ID;
    g.setAttribute('role', 'presentation');
    g.setAttribute('aria-hidden', 'true');

    g.innerHTML =
      '<div class="fg-stage">' +
        '<div class="fg-air"></div>' +
        '<div class="fg-room"></div>' +
        heat() +
        '<div class="fg-bed">' + bed() + '</div>' +
        sparks() +
        '<div class="fg-word">' +
          '<div class="fg-line">' + esc(opts.title || 'Something is ') +
            '<em>' + esc(opts.emphasis || 'on the fire') + '</em></div>' +
          '<div class="fg-sub">' + esc(opts.sub || 'Cabana · Food') + '</div>' +
        '</div>' +
        '<div class="fg-flood"></div>' +
      '</div>' +
      '<button class="fg-skip" type="button" aria-label="Skip the intro">Skip' +
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
    } else if (!node.querySelector('.fg-stage')) {
      /* A placeholder the page painted before this script arrived.
         Fill it rather than stacking a second gate on top of it. */
      node.innerHTML = build(opts).innerHTML;
    }
    if (brief) node.classList.add('fg-brief');

    try { doc.documentElement.classList.add('fg-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }

    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('fg-lock'); } catch (e) {}
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
      node.classList.add('fg-gone');
      global.setTimeout(teardown, 520);
    }
    /* Skipping still rises through the heat. Cutting straight to the
       page would make the fire feel like something taken away. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.add('fg-brief', 'fg-go');
      at(reduce ? 220 : 600, finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    /* cold → catch → breathe → word → rise.
       About 5.4s, which lands with flights, tours, stays and events:
       five arrivals, one pace. */
    var T = brief
      ? { cold: 0,  lit: 0,   breathe: 260,  say: -1,   go: 420,  done: 1500 }
      : { cold: 0,  lit: 340, breathe: 2100, say: 1750, go: 3700, done: 5400 };
    if (reduce) T = { cold: 0, lit: 0, breathe: 0, say: 0, go: 620, done: 1150 };

    at(T.cold, function () { node.classList.add('fg-cold'); });
    at(T.lit, function () { node.classList.add('fg-lit'); });
    /* Breathing replaces the catch animation, so it must not start
       until the wavefront has finished crossing the bed. */
    at(T.breathe, function () { node.classList.add('fg-breathe'); });
    if (T.say >= 0) at(T.say, function () { node.classList.add('fg-say'); });
    at(T.go, function () { node.classList.add('fg-go'); });
    at(T.done, finish);
    /* Hard ceiling. Nothing above is allowed to be the only thing
       standing between a guest and the page. */
    at(T.done + 3000, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaFoodGate = {
    play: play,
    skip: function () { if (live) live.skip(); },
    curtain: function (o) {
      o = o || {};
      if (doc.getElementById(ID)) return;
      var n = build(o);
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('fg-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
