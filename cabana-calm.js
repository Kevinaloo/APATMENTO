/* ═══════════════════════════════════════════════════════════════════
   CABANA · CALM
   ───────────────────────────────────────────────────────────────────
   Keeps decorative motion from running a phone hot.

   Cabana has a lot of looping decoration: sheens, drifting gradients,
   pulsing rings, tickers. Most of it is transform/opacity, which the
   GPU handles almost for free. Some of it animates background-position,
   box-shadow, filter, text-shadow, height or left, which makes the
   browser re-paint the element on every frame for as long as the tab
   is open, whether anyone can see it or not. Across a long session that
   is steady CPU/GPU load and a warm handset.

   Three rules, applied to every infinite CSS animation on the page:

     1. Off screen → paused. It resumes the moment it scrolls back in.
     2. Re-paint-heavy loops (anything that is not transform / opacity)
        play for a few seconds as a welcome, then rest on touch
        devices, where the heat and battery cost lands.
     3. In low-power situations (battery saver, low charge and not
        plugged in, Save-Data, a very low-memory phone) re-paint-heavy
        loops are paused everywhere, straight away.

   Nothing finite is touched: entrances, transitions and one-shot
   effects run as designed. Nothing is ever restarted or hidden, a
   paused loop stays on its current frame.

   It is event driven (scroll, resize, visibility, animationstart), with
   no polling timer, so it costs nothing while the page is still.

   API:  CabanaCalm.lowPower()  → bool
         CabanaCalm.scan()      → run a pass now
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.CabanaCalm) return;
  var doc = global.document;
  if (!doc || !doc.getAnimations) return;

  /* Properties the compositor can animate without re-painting. */
  var SAFE = /^(transform|translate|rotate|scale|opacity|offset.*|composite|computedOffset|easing|offset)$/;

  var WELCOME_MS = 8000;       // heavy loops may play this long on touch devices
  var MARGIN     = 120;        // px beyond the viewport still counts as "near"
  var T0         = Date.now();
  var _low       = false;
  var _timer     = null;
  var _paused    = typeof WeakMap === 'function' ? new WeakMap() : null;

  function coarse() {
    try { return !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches); }
    catch (e) { return false; }
  }

  function heavy(anim) {
    try {
      var kf = anim.effect.getKeyframes();
      for (var i = 0; i < kf.length; i++) {
        for (var k in kf[i]) {
          if (!SAFE.test(k)) return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function onScreen(el) {
    if (!el || !el.getBoundingClientRect) return true;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    var vh = global.innerHeight || doc.documentElement.clientHeight;
    var vw = global.innerWidth || doc.documentElement.clientWidth;
    return r.bottom > -MARGIN && r.top < vh + MARGIN && r.right > -MARGIN && r.left < vw + MARGIN;
  }

  function infinite(anim) {
    try {
      var t = anim.effect && anim.effect.getTiming && anim.effect.getTiming();
      return !!t && t.iterations === Infinity;
    } catch (e) { return false; }
  }

  function restHeavy() {
    /* Phones rest paint-heavy loops after the welcome; anything in a
       low-power state rests them at once. */
    if (_low) return true;
    return coarse() && Date.now() - T0 > WELCOME_MS;
  }

  function scan() {
    _timer = null;
    var list;
    try { list = doc.getAnimations(); } catch (e) { return; }
    var rest = restHeavy();
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!infinite(a)) continue;
      var why = _paused ? _paused.get(a) : null;
      var target = a.effect && a.effect.target;
      var shouldPause = !onScreen(target) || (rest && heavy(a));
      if (shouldPause) {
        if (a.playState === 'running') {
          try { a.pause(); if (_paused) _paused.set(a, 1); } catch (e) {}
        }
      } else if (why && a.playState === 'paused') {
        try { a.play(); } catch (e) {}
        if (_paused) _paused.delete(a);
      }
    }
  }

  function schedule() {
    if (_timer) return;
    _timer = setTimeout(scan, 160);
  }

  /* ── low-power signals ───────────────────────────────────────────── */
  function setLow(v) {
    if (v === _low) return;
    _low = v;
    try { doc.documentElement.classList.toggle('cab-lowpower', v); } catch (e) {}
    schedule();
  }

  function readBattery(b) {
    var saver = b && !b.charging && typeof b.level === 'number' && b.level <= 0.2;
    var other = false;
    try {
      var c = global.navigator.connection;
      other = !!(c && c.saveData) || (global.navigator.deviceMemory && global.navigator.deviceMemory <= 1);
    } catch (e) {}
    setLow(!!saver || other);
  }

  try {
    if (global.navigator && global.navigator.getBattery) {
      global.navigator.getBattery().then(function (b) {
        readBattery(b);
        b.addEventListener('levelchange', function () { readBattery(b); });
        b.addEventListener('chargingchange', function () { readBattery(b); });
      }, function () { readBattery(null); });
    } else {
      readBattery(null);
    }
  } catch (e) {}

  /* ── triggers: events only, never a polling loop ─────────────────── */
  global.addEventListener('scroll', schedule, { passive: true, capture: true });
  global.addEventListener('resize', schedule, { passive: true });
  doc.addEventListener('visibilitychange', schedule);
  /* New loops start whenever a screen, sheet or card is opened. */
  doc.addEventListener('animationstart', schedule, true);
  /* One pass when the welcome window ends, so phones settle on their own. */
  setTimeout(schedule, WELCOME_MS + 250);
  if (doc.readyState === 'complete') schedule();
  else global.addEventListener('load', schedule);

  global.CabanaCalm = {
    lowPower: function () { return _low; },
    scan: scan
  };
})(window);
