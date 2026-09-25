/* ═══════════════════════════════════════════════════════════════════
   CABANA MOVE · the arrival
   ───────────────────────────────────────────────────────────────────
   Golden hour. The sun sits on a city skyline, a road runs to it, and
   a car's tail-lights pull away from you toward the light: the moment
   every ride on this page is for. The pickup pin drops under the car,
   the destination pin lands on the horizon, the sun flares, and the
   flare is the page's own cream, so the gate does not end, it becomes
   the app.

   Contract (shared with every Cabana gate):
     · CabanaRideGate.play({ node })  → Promise, resolves as it clears
     · a tap, a key or hiding the tab skips it
     · brief on a repeat visit in the same session, instant-ish under
       prefers-reduced-motion, and a hard ceiling so it always clears
     · nothing here is needed for the page to work: if this file never
       loads, rides.html strips the placeholder itself
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  if (!doc || global.CabanaRideGate) return;

  var ID = 'ride-gate';
  var SS_KEY = 'cbn-ride-gate-seen-v3';

  /* A skyline that reads as an African city at dusk without being any
     one city: towers, a dome, a mast, low blocks, two acacias. */
  var SKY_FAR = 'M0 612V586h14v-8h10v8h12v-22h16v22h8v-14h18v14h10v-30h6v-10h4v10h6v30h14v-18h20v18h12v-26h22v26h8v-12h14v12h10v-40h4v-8h6v8h4v40h16v-20h18v20h12v-16h20v16h8v-28h18v28h10v-10h16v10h12v-24h14v24h28V612Z';
  var SKY_NEAR = 'M0 612v-10h20v-18h22v18h10v-34a14 14 0 0 1 28 0v34h12v-22h26v22h14v-48h8v-12h6v12h8v48h10v-16h24v16h10v-26h30v26h12v-40h4l6-16 6 16h4v40h14v-20h26v20h12v-30h20v30h14v-12h26v12h18V612Z';
  var ACACIA = 'M-18 0c6-7 24-10 36-4 6-6 22-5 28 1-8 4-22 6-30 3-4 2-10 3-14 1-8 3-16 2-20-1ZM1 0v16h2V0Z';

  function build() {
    var n = doc.createElement('div');
    n.id = ID;
    n.setAttribute('role', 'presentation');
    n.innerHTML =
      '<div class="rg2-stage" aria-hidden="true">' +
        '<svg class="rg2-scene" viewBox="0 0 1200 844" preserveAspectRatio="xMidYMid slice">' +
          '<defs>' +
            '<linearGradient id="rg2-sky" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0" stop-color="#ff7e3a"/><stop offset=".38" stop-color="#ffa24a"/><stop offset=".62" stop-color="#ffc977"/><stop offset=".73" stop-color="#ffe3b0"/></linearGradient>' +
            '<radialGradient id="rg2-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe8"/><stop offset=".45" stop-color="#ffe9a8"/><stop offset=".75" stop-color="#ffc861" stop-opacity=".85"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="rg2-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1b4d"/><stop offset="1" stop-color="#1c0a20"/></linearGradient>' +
            '<linearGradient id="rg2-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset=".18" stop-color="#2b1236"/><stop offset="1" stop-color="#150717"/></linearGradient>' +
            '<linearGradient id="rg2-trail" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d8b" stop-opacity="0"/><stop offset=".4" stop-color="#ff5a5f"/><stop offset="1" stop-color="#ffd166"/></linearGradient>' +
            '<clipPath id="rg2-above"><rect x="-200" y="-10" width="1600" height="622"/></clipPath>' +
            '<path id="rg2-far-p" d="' + SKY_FAR + '"/><path id="rg2-near-p" d="' + SKY_NEAR + '"/><path id="rg2-tree-p" d="' + ACACIA + '"/>' +
          '</defs>' +
          '<rect class="rg2-sky" x="-200" y="-10" width="1600" height="880" fill="url(#rg2-sky)"/>' +
          '<g clip-path="url(#rg2-above)"><circle class="rg2-sun" cx="600" cy="604" r="118" fill="url(#rg2-sun)"/></g>' +
          '<g class="rg2-clouds" fill="#fff1dd">' +
            '<ellipse cx="160" cy="210" rx="120" ry="12" opacity=".45"/><ellipse cx="475" cy="300" rx="64" ry="9" opacity=".55"/>' +
            '<ellipse cx="705" cy="360" rx="80" ry="8" opacity=".45"/><ellipse cx="625" cy="250" rx="46" ry="6" opacity=".4"/>' +
            '<ellipse cx="525" cy="420" rx="70" ry="7" opacity=".35"/><ellipse cx="1010" cy="280" rx="140" ry="12" opacity=".4"/></g>' +
          '<g class="rg2-birds" fill="none" stroke="#6a2a52" stroke-width="1.6" stroke-linecap="round">' +
            '<path d="M665 452q4-4 8 0q4-4 8 0"/><path d="M687 440q3-3 6 0q3-3 6 0"/><path d="M651 466q3-3 6 0q3-3 6 0"/></g>' +
          /* the skyline, mirrored either side of the centre so a wide
             screen sees a city rather than a repeated strip */
          '<g class="rg2-far" fill="#b4466a" opacity=".55">' +
            '<use href="#rg2-far-p" transform="translate(405 0)"/><use href="#rg2-far-p" transform="translate(405 0) scale(-1 1)"/>' +
            '<use href="#rg2-far-p" transform="translate(1185 0) scale(-1 1)"/><path d="M0 612V592h15V612ZM1185 612V588h15V612Z"/></g>' +
          '<g class="rg2-near" fill="#6b2358">' +
            '<use href="#rg2-near-p" transform="translate(405 0)"/><use href="#rg2-near-p" transform="translate(395 4) scale(-1 1)"/>' +
            '<use href="#rg2-near-p" transform="translate(1195 4) scale(-1 1)"/><path d="M0 612V596h10V612ZM1195 612V598h5V612Z"/></g>' +
          '<g class="rg2-trees" fill="#4a1b4d">' +
            '<use href="#rg2-tree-p" transform="translate(445 598) scale(1.1)"/><use href="#rg2-tree-p" transform="translate(751 600)"/>' +
            '<use href="#rg2-tree-p" transform="translate(150 600) scale(1.3)"/><use href="#rg2-tree-p" transform="translate(1040 598) scale(1.2)"/></g>' +
          '<rect x="-200" y="612" width="1600" height="260" fill="url(#rg2-ground)"/>' +
          '<path class="rg2-road" d="M523 844 598.2 612h3.6L677 844Z" fill="url(#rg2-road)"/>' +
          '<path class="rg2-edge" d="M523 844 598.2 612M677 844 601.8 612" stroke="#ff9a3c" stroke-width="1.4" opacity=".7" fill="none"/>' +
          '<path class="rg2-dash" d="M600 844V613" stroke="#ffd166" stroke-width="3" stroke-dasharray="22 18" fill="none"/>' +
          '<path class="rg2-trail" d="M600 792V616" stroke="url(#rg2-trail)" stroke-width="5" stroke-linecap="round" fill="none" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>' +
          '<g class="rg2-lamps" fill="#ffd98a">' +
            '<circle cx="569" cy="700" r="2.2"/><circle cx="631" cy="700" r="2.2"/><circle cx="548" cy="766" r="3"/><circle cx="652" cy="766" r="3"/>' +
            '<circle cx="583" cy="660" r="1.5"/><circle cx="617" cy="660" r="1.5"/></g>' +
          '<g class="rg2-car">' +
            '<rect x="576" y="770" width="48" height="26" rx="9" fill="#231029"/>' +
            '<rect x="581" y="760" width="38" height="16" rx="7" fill="#3b2140"/>' +
            '<rect x="579" y="780" width="11" height="5" rx="2.5" fill="#ff3d57"/><rect x="610" y="780" width="11" height="5" rx="2.5" fill="#ff3d57"/>' +
            '<ellipse cx="584.5" cy="782.5" rx="14" ry="6" fill="#ff3d57" opacity=".35"/><ellipse cx="615.5" cy="782.5" rx="14" ry="6" fill="#ff3d57" opacity=".35"/>' +
            '<rect x="590" y="788" width="20" height="4" rx="1" fill="#ffd83b"/></g>' +
          '<g class="rg2-pin rg2-pin-a"><circle cx="600" cy="812" r="9" fill="#12b98f" stroke="#fff" stroke-width="3.5"/><circle class="rg2-ping" cx="600" cy="812" r="9" fill="none" stroke="#12b98f" stroke-width="2"/></g>' +
          '<g class="rg2-pin rg2-pin-b"><path d="M600 606c-7-7.6-11-13.4-11-18.2a11 11 0 0 1 22 0c0 4.8-4 10.6-11 18.2Z" fill="#231029" stroke="#fff" stroke-width="2.4"/><circle cx="600" cy="587.6" r="3.6" fill="#ffd166"/></g>' +
        '</svg>' +
        '<div class="rg2-word">' +
          '<div class="rg2-mark"><span></span></div>' +
          '<h2 class="rg2-title">Cabana <b>Move</b></h2>' +
          '<p class="rg2-tag">Name your fare. <span>Ride anywhere.</span></p>' +
        '</div>' +
        '<div class="rg2-flare"></div>' +
      '</div>' +
      '<button class="rg2-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>';
    return n;
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
    else if (!node.querySelector('.rg2-stage')) { node.innerHTML = build().innerHTML; }
    node.classList.add('rg2');
    if (brief) node.classList.add('rg2-brief');
    if (reduce) node.classList.add('rg2-still');
    try { doc.documentElement.classList.add('rg-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(function (t) { global.clearTimeout(t); }); timers = []; }
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
      node.classList.add('rg2-gone');
      global.setTimeout(teardown, 460);
    }
    /* A skip still ends on the flare: cutting straight to the page would
       feel like the lights went out, not like arriving. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.add('rg2-on', 'rg2-drive', 'rg2-arrive', 'rg2-go');
      at(reduce ? 160 : 520, finish);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } }
    function onHide() { if (doc.hidden) skip(); }
    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    var T = brief ? { on: 0, drive: 60, arrive: 380, go: 900, done: 1400 }
      : { on: 30, drive: 700, arrive: 1900, go: 2650, done: 3150 };
    if (reduce) T = { on: 0, drive: 0, arrive: 0, go: 650, done: 1050 };

    at(T.on, function () { node.classList.add('rg2-on'); });
    at(T.drive, function () { node.classList.add('rg2-drive'); });
    at(T.arrive, function () { node.classList.add('rg2-arrive'); });
    at(T.go, function () { node.classList.add('rg2-go'); });
    at(T.done, finish);
    at(T.done + 3000, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaRideGate = {
    play: play,
    skip: function () { if (live) live.skip(); },
    curtain: function () {
      if (doc.getElementById(ID)) return;
      var n = build();
      n.classList.add('rg2', 'rg2-on');
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('rg-lock'); } catch (e) {}
    }
  };
})(typeof window !== 'undefined' ? window : this);
