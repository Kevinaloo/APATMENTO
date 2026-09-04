/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE LOOM — engine
   ───────────────────────────────────────────────────────────────────
   Dresses a loom, throws a shuttle across it, and weaves a cloth.

   On the interlace
   ────────────────
   A plain weave is one rule: every weft thread passes over one warp
   and under the next, and the next row starts on the opposite foot.

   Expressed here as two numbers rather than a cell-by-cell render.
   Warp threads are continuous lines. Weft threads are dashed on
   exactly the cell pitch, so their gaps land on the warps they pass
   under, and every second row is offset by one cell so the phase
   flips. Where a weft gap falls, the warp behind shows through — and
   that is the whole illusion. Two attributes, one real weave.

   On the colour
   ─────────────
   Bands, not noise. Real cloth is warped in runs of the same colour
   and the weft is changed in blocks, so the pattern comes out in
   stripes that cross. Randomising every thread would produce static;
   drawing in runs produces something that looks woven by someone.

   On the draw-on
   ──────────────
   Transforms, never stroke-dashoffset. The dash pattern is already
   carrying the weave, so animating its offset would slide the
   interlace sideways instead of drawing the thread on. Warp threads
   scale from the top, weft threads scale from whichever edge that
   row's shuttle started at — which alternates, because a shuttle
   goes across and then comes back.

   On not hurting anyone
   ─────────────────────
   Nothing flashes and nothing repeats quickly. The only looping
   animation in the file is a six-second breath across the whole
   cloth, and under prefers-reduced-motion even that is held still.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;
  if (global.CabanaShopGate) return;

  var ID = 'shop-gate';
  var SS_KEY = 'cbn-shop-gate-seen';
  var V = 1000;                       /* the cloth's own coordinates */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* The page's palette. Green is the commission mark and is not woven
     into the cloth — it appears once, on the line that means it. */
  var WARP_COLS = ['#B8A4F4', '#C9BCF8', '#8B5CF6', '#D9D0FB', '#6D28FF'];
  var WEFT_COLS = ['#6D28FF', '#4361FF', '#8B5CF6', '#B8A4F4', '#5B21D6'];

  /* Colour arrives in runs, the way a loom is actually dressed. */
  function bands(count, palette, minRun, maxRun) {
    var out = [], i = 0;
    while (i < count) {
      var run = Math.round(rnd(minRun, maxRun));
      var c = pick(palette);
      for (var k = 0; k < run && i < count; k++, i++) out.push(c);
    }
    return out;
  }

  function weave() {
    /* Pitch: how wide one thread plus its gap is. Everything else —
       the dash pattern, the phase flip, the thread width — is derived
       from this, so the interlace cannot drift out of register. */
    var pitch = 22;
    /* A thread is as wide as the pitch, so the cloth is solid. The
       first pass made threads half the pitch, which left a quarter of
       the frame as bare white and washed the whole weave out. */
    var thread = pitch * 0.94;
    var cols = Math.ceil(V / pitch) + 3;
    var rows = Math.ceil(V / pitch) + 3;

    /* Warps sit on multiples of the pitch, and the weft lines start on
       a point where a dash should begin, so dashoffset 0 is already in
       register. Get this wrong and the interlace drifts across the
       cloth instead of alternating with the columns. */
    var x0 = -pitch * 1.5, x1e = V + pitch * 2;
    var y0 = -pitch * 1.5, y1e = V + pitch * 2;

    var warpCols = bands(cols, WARP_COLS, 2, 6);
    var weftCols = bands(rows, WEFT_COLS, 2, 7);

    var warp = '', weft = '', i;

    for (i = 0; i < cols; i++) {
      var x = r1(i * pitch - pitch);
      warp += '<line class="wv-warp" x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1e + '" ' +
        'style="--c:' + warpCols[i] + ';--w:' + thread + ';--d:' +
        Math.round(i * 14 + rnd(0, 34)) + 'ms"/>';
    }

    for (i = 0; i < rows; i++) {
      var y = r1(i * pitch - pitch);
      /* Over one warp, under the next: dash and gap are both exactly
         one pitch, and every second row shifts by one so the phase
         flips. That is a plain weave, in two numbers. */
      var phase = (i % 2) ? pitch : 0;
      var fromLeft = (i % 2) === 0;
      weft += '<line class="wv-weft" x1="' + x0 + '" y1="' + y + '" x2="' + x1e + '" y2="' + y + '" ' +
        'style="--c:' + weftCols[i] + ';--w:' + thread +
        ';--dash:' + pitch + ' ' + pitch +
        ';--phase:' + phase +
        ';--from:' + (fromLeft ? '0%' : '100%') +
        ';--d:' + Math.round(i * 30 + rnd(0, 42)) + 'ms"/>';
    }

    return {
      warp: warp, weft: weft, cols: cols, rows: rows, pitch: pitch,
      /* When the last thread lands, so the sequence can wait for the
         cloth rather than guessing at a duration. */
      warpMs: cols * 14 + 620,
      weftMs: rows * 30 + 520
    };
  }

  function build(opts) {
    var w = weave();

    var g = doc.createElement('div');
    g.id = ID;
    g.setAttribute('role', 'presentation');
    g.setAttribute('aria-hidden', 'true');

    g.innerHTML =
      '<div class="wv-stage">' +
        '<div class="wv-air"></div>' +
        '<div class="wv-cloth">' +
          '<svg class="wv-loom" viewBox="0 0 ' + V + ' ' + V + '" ' +
            'preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
            '<g>' + w.warp + '</g>' +
            '<g>' + w.weft + '</g>' +
          '</svg>' +
        '</div>' +
        '<div class="wv-plate"></div>' +
        '<div class="wv-word">' +
          '<div class="wv-line">' + esc(opts.title || 'Buy direct') +
            '<em>' + esc(opts.tail || 'from African sellers.') + '</em></div>' +
          '<div class="wv-sub"><i></i>' + esc(opts.sub || 'Zero seller commission') + '</div>' +
        '</div>' +
        '<div class="wv-flood"></div>' +
      '</div>' +
      '<button class="wv-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m9 6 6 6-6 6"/></svg>' +
      '</button>';

    g.__warpMs = w.warpMs;
    g.__weftMs = w.weftMs;
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
    } else if (!node.querySelector('.wv-stage')) {
      /* A placeholder the page painted before this script arrived.
         Fill it rather than stacking a second gate on top of it. */
      var built = build(opts);
      node.innerHTML = built.innerHTML;
      node.__warpMs = built.__warpMs;
      node.__weftMs = built.__weftMs;
    }
    if (brief) node.classList.add('wv-brief');

    /* The cloth is bigger than the frame and tilted, so it has to
       cover the diagonal or a corner shows bare page. */
    try {
      var vw = global.innerWidth || 390, vh = global.innerHeight || 844;
      node.style.setProperty('--cloth', Math.round(Math.hypot(vw, vh) * 1.15) + 'px');
    } catch (e) {}

    try { doc.documentElement.classList.add('wv-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }

    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('wv-lock'); } catch (e) {}
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
      node.classList.add('wv-gone');
      global.setTimeout(teardown, 520);
    }
    /* Skipping still finishes the cloth and opens it. Cutting away
       mid-weave would leave the one thing this animation is about
       visibly unfinished. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.add('wv-brief', 'wv-warping', 'wv-weaving', 'wv-go');
      at(reduce ? 220 : 620, finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    /* The weave's own length sets the pace: the weft starts while the
       warp is still dropping, because on a real loom it does. */
    var warpMs = node.__warpMs || 1100;
    var weftMs = node.__weftMs || 1900;

    var T;
    if (brief) {
      T = { warp: 0, weft: 90, held: 400, say: -1, go: 620, done: 1700 };
    } else if (reduce) {
      T = { warp: 0, weft: 0, held: 0, say: 0, go: 700, done: 1250 };
    } else {
      T = { warp: 40, weft: Math.round(warpMs * 0.55) };
      T.held = T.weft + weftMs;
      T.say = T.held - 240;
      T.go = T.held + 1350;
      T.done = T.go + 1450;
    }

    at(T.warp, function () { node.classList.add('wv-warping'); });
    at(T.weft, function () { node.classList.add('wv-weaving'); });
    at(T.held, function () { node.classList.add('wv-held'); });
    if (T.say >= 0) at(T.say, function () { node.classList.add('wv-say'); });
    at(T.go, function () { node.classList.add('wv-go'); });
    at(T.done, finish);
    /* Hard ceiling. Nothing above is allowed to be the only thing
       standing between a guest and the page. */
    at(T.done + 3000, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaShopGate = {
    play: play,
    skip: function () { if (live) live.skip(); },
    curtain: function (o) {
      o = o || {};
      if (doc.getElementById(ID)) return;
      var n = build(o);
      var vw = global.innerWidth || 390, vh = global.innerHeight || 844;
      n.style.setProperty('--cloth', Math.round(Math.hypot(vw, vh) * 1.15) + 'px');
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('wv-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
