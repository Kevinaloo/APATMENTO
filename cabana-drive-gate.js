/* ═══════════════════════════════════════════════════════════════════
   CABANA DRIVE · the reveal
   ───────────────────────────────────────────────────────────────────
   A dark studio. One spotlight comes on, the outline of a car draws
   itself on the floor, the paint sweeps across it in Cabana aqua, the
   headlights flash twice as if the keys were just pressed, and the car
   rolls out of frame to the right. Its beam becomes the page's own
   pale aqua, so the reveal ends by handing you the showroom.

   Contract (shared with every Cabana gate):
     · CabanaDriveGate.play({ node })  → Promise, resolves as it clears
     · a tap, a key or hiding the tab skips it
     · brief on a repeat visit in the same session, near-instant under
       prefers-reduced-motion, and a hard ceiling so it always clears
     · nothing here is needed for the page to work: if this file never
       loads, carhire.html strips the placeholder itself
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  if (!doc || global.CabanaDriveGate) return;

  var ID = 'drive-gate';
  var SS_KEY = 'cbn-drive-gate-seen-v1';

  /* A modern crossover in profile: long roof, short front, wheel arches
     cut into the sill so the outline reads as one continuous stroke. */
  var BODY = 'M345 560L345 505Q345 478 368 470L392 462L420 408Q428 394 446 393L640 391Q660 391 674 402L738 456L820 468Q858 474 862 500L864 540Q864 560 848 560L818 560A48 48 0 0 0 722 560L478 560A48 48 0 0 0 382 560Z';
  var GLASS_R = 'M434 412Q440 404 452 404L558 403L558 452L412 452Z';
  var GLASS_F = 'M572 403L636 402Q652 402 664 412L712 452L572 452Z';

  function wheel(cx) {
    return '<g class="dg-wheel" style="transform-origin:' + cx + 'px 560px">' +
      '<circle cx="' + cx + '" cy="560" r="38" fill="#06161b"/>' +
      '<circle cx="' + cx + '" cy="560" r="23" fill="#123a44" stroke="#9ff7ea" stroke-opacity=".55" stroke-width="2"/>' +
      '<path d="M' + cx + ' 539V581M' + (cx - 21) + ' 560H' + (cx + 21) + 'M' + (cx - 15) + ' 545L' + (cx + 15) + ' 575M' + (cx + 15) + ' 545L' + (cx - 15) + ' 575" stroke="#9ff7ea" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="560" r="5" fill="#d9fffa"/>' +
    '</g>';
  }

  function car() {
    return '' +
              '<path class="dg-fill" d="' + BODY + '" fill="url(#dg-paint)"/>' +
              '<g clip-path="url(#dg-body-clip)"><rect class="dg-sweep" x="200" y="380" width="160" height="200" fill="url(#dg-shine)"/></g>' +
              '<path class="dg-glass" d="' + GLASS_R + GLASS_F + '" fill="url(#dg-glass)"/>' +
              '<path class="dg-line" d="M372 486L852 490" stroke="#e9fffb" stroke-opacity=".55" stroke-width="2" fill="none"/>' +
              '<path class="dg-outline" d="' + BODY + '" fill="none" stroke="#bff9ef" stroke-width="3" stroke-linejoin="round" pathLength="1"/>' +
              '<path class="dg-outline dg-outline-glass" d="' + GLASS_R + GLASS_F + '" fill="none" stroke="#bff9ef" stroke-width="2" stroke-linejoin="round" pathLength="1"/>' +
              '<rect class="dg-tail" x="345" y="480" width="10" height="16" rx="3" fill="#ff4d6d"/>' +
              '<rect class="dg-head" x="846" y="480" width="16" height="9" rx="4" fill="#fffbe0"/>' +
              wheel(430) + wheel(770);
  }

  function build() {
    var n = doc.createElement('div');
    n.id = ID;
    n.setAttribute('role', 'presentation');
    n.innerHTML =
      '<div class="dg-stage" aria-hidden="true">' +
        '<svg class="dg-scene" viewBox="0 0 1200 844" preserveAspectRatio="xMidYMid slice">' +
          '<defs>' +
            '<radialGradient id="dg-room" cx=".5" cy=".62" r=".75"><stop offset="0" stop-color="#0f4652"/><stop offset=".55" stop-color="#082b33"/><stop offset="1" stop-color="#03161b"/></radialGradient>' +
            '<linearGradient id="dg-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9fffb" stop-opacity=".0"/><stop offset=".25" stop-color="#e9fffb" stop-opacity=".10"/><stop offset="1" stop-color="#bff9ef" stop-opacity=".22"/></linearGradient>' +
            '<radialGradient id="dg-pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c9fff5" stop-opacity=".55"/><stop offset=".5" stop-color="#5fe8d6" stop-opacity=".18"/><stop offset="1" stop-color="#2ef2d0" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="dg-paint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2ef2d0"/><stop offset=".5" stop-color="#12c6e8"/><stop offset="1" stop-color="#3d7bff"/></linearGradient>' +
            '<linearGradient id="dg-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2b36"/><stop offset="1" stop-color="#1c5566"/></linearGradient>' +
            '<linearGradient id="dg-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="dg-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset=".35" stop-color="#e9fffb" stop-opacity=".35"/><stop offset="1" stop-color="#e9fffb" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="dg-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<mask id="dg-reflect-mask" maskUnits="userSpaceOnUse" x="0" y="560" width="1200" height="200"><rect x="0" y="560" width="1200" height="200" fill="url(#dg-fade)"/></mask>' +
            '<clipPath id="dg-body-clip"><path d="' + BODY + '"/></clipPath>' +
          '</defs>' +
          '<rect x="-600" y="-900" width="2400" height="2700" fill="url(#dg-room)"/>' +
          /* the cyclorama: a soft horizon where the wall bends into the floor */
          '<rect class="dg-floor" x="-600" y="600" width="2400" height="1200" fill="#041d23" opacity=".6"/>' +
          '<g class="dg-grid" stroke="#2ef2d0" stroke-opacity=".08" stroke-width="1.2" fill="none">' +
            '<path d="M-600 640H1800M-600 690H1800M-600 760H1800M-600 844H1800M-600 960H1800M-600 1120H1800"/>' +
            '<path d="M600 600L-900 1300M600 600L-160 1300M600 600L330 1300M600 600L870 1300M600 600L1360 1300M600 600L2100 1300"/></g>' +
          '<path class="dg-cone" d="M560 -900H640L1010 600H190Z" fill="url(#dg-cone)"/>' +
          '<ellipse class="dg-pool" cx="600" cy="585" rx="420" ry="58" fill="url(#dg-pool)"/>' +
          '<g class="dg-streaks" stroke="#9ff7ea" stroke-linecap="round" fill="none">' +
            '<path d="M180 520H330" stroke-width="3" stroke-opacity=".45"/><path d="M120 470H300" stroke-width="2" stroke-opacity=".3"/>' +
            '<path d="M240 548H340" stroke-width="2.5" stroke-opacity=".35"/><path d="M60 505H210" stroke-width="1.5" stroke-opacity=".25"/></g>' +
          '<g class="dg-rig">' +
            '<path class="dg-beam" d="M860 484L1500 380V620Z" fill="url(#dg-beam)"/>' +
            '<g class="dg-reflect" mask="url(#dg-reflect-mask)"><g transform="translate(0 1124) scale(1 -1)" opacity=".35">' + car() + '</g></g>' +
            '<ellipse class="dg-shadow" cx="604" cy="598" rx="290" ry="12" fill="#010a0d" opacity=".55"/>' +
            '<g class="dg-car">' + car() + '</g>' +
          '</g>' +
        '</svg>' +
        '<div class="dg-word">' +
          '<p class="dg-kicker"><span></span>Car hire across Africa</p>' +
          '<h2 class="dg-title"><span class="dg-t1">Cabana</span> <span class="dg-t2">Drive</span></h2>' +
          '<p class="dg-tag">Your car, your way. <b>Operators keep 100%.</b></p>' +
        '</div>' +
        '<div class="dg-iris"></div>' +
      '</div>' +
      '<button class="dg-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>';
    return n;
  }

  /* A landscape screen sees the whole studio; a phone would crop the car
     to its doors, so on a tall screen the camera pulls back until the car
     and its beam fit, with the car a little below the middle. */
  function frame(node) {
    var svg = node.querySelector('.dg-scene');
    if (!svg) return;
    var w = global.innerWidth || 390, h = global.innerHeight || 844, ar = w / h;
    if (ar >= 1.1) return;
    var vw = ar < .7 ? 700 : 820, vh = vw / ar;
    var y0 = 560 - vh * .6;
    svg.setAttribute('viewBox', (600 - vw / 2 + 20) + ' ' + y0.toFixed(0) + ' ' + vw + ' ' + vh.toFixed(0));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  var live = null;

  function play(opts) {
    opts = opts || {};
    if (live) return live.promise;
    var reduce = false;
    try { reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var seen = false;
    try { seen = global.sessionStorage.getItem(SS_KEY) === '1'; } catch (e) {}
    var brief = opts.brief != null ? !!opts.brief : seen;
    if (opts.force) brief = false;

    var node = opts.node || doc.getElementById(ID);
    if (!node) { node = build(); (doc.body || doc.documentElement).appendChild(node); }
    else if (!node.querySelector('.dg-stage')) { node.innerHTML = build().innerHTML; }
    node.classList.add('dg');
    frame(node);
    if (brief) node.classList.add('dg-brief');
    if (reduce) node.classList.add('dg-still');
    try { doc.documentElement.classList.add('dg-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(function (t) { global.clearTimeout(t); }); timers = []; }
    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('dg-lock'); } catch (e) {}
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
      node.classList.add('dg-gone');
      global.setTimeout(teardown, 460);
    }
    /* A skip still ends in the beam, so the page arrives rather than
       blinking on. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.add('dg-on', 'dg-paint', 'dg-lights', 'dg-drive', 'dg-go');
      at(reduce ? 160 : 480, finish);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } }
    function onHide() { if (doc.hidden) skip(); }
    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    var T = brief ? { on: 0, paint: 80, lights: 320, drive: 720, go: 980, done: 1420 }
      : { on: 30, paint: 1050, lights: 1650, drive: 2450, go: 2850, done: 3350 };
    if (reduce) T = { on: 0, paint: 0, lights: 0, drive: 9e9, go: 650, done: 1050 };

    at(T.on, function () { node.classList.add('dg-on'); });
    at(T.paint, function () { node.classList.add('dg-paint'); });
    at(T.lights, function () { node.classList.add('dg-lights'); });
    if (T.drive < 9e9) at(T.drive, function () { node.classList.add('dg-drive'); });
    at(T.go, function () { node.classList.add('dg-go'); });
    at(T.done, finish);
    at(T.done + 3000, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaDriveGate = {
    play: play,
    skip: function () { if (live) live.skip(); }
  };
})(typeof window !== 'undefined' ? window : this);
