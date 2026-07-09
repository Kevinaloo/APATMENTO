/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · DEEP SIGNAL  v1
   ───────────────────────────────────────────────────────────────────
   The intelligence layer. Sits above telemetry.js and turns raw
   pageviews into an asset: intent, attention, journeys, and a
   feature vector that is directly consumable by a model.

   What separates this from analytics:
     · Attention, not time-on-page. Blurred tabs earn nothing.
     · Intent scoring in real time — a 0-100 purchase probability
       computed from behaviour, updated on every event.
     · Journey graphs — the actual paths people take, not funnels
       we invented in a meeting.
     · Rage/dead click detection — where the product is failing.
     · Scroll velocity + reading depth — did they read, or bounce?
     · Ad viewability to IAB standard (50% pixels, 1s / 2s video).
     · Feature vectors emitted per session, ready for training.

   Privacy: first-party only. No cross-site identifiers, no canvas
   or font fingerprinting, no third-party beacons. A visitor can
   opt out and everything below becomes a no-op.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaSignal) return;

  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  var doc = global.document;
  var PAGE = (global.location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';

  function safe(fn, l) { try { return fn(); } catch (e) { if (global.console && global.console.debug) console.debug('[signal:' + l + ']', e && e.message); } }

  /* ── Opt-out is absolute ─────────────────────────────────────── */
  var OPTED_OUT = safe(function () {
    return localStorage.getItem('apa-no-track') === '1' ||
      global.navigator.doNotTrack === '1';
  }) || false;

  /* ── Identity ─────────────────────────────────────────────────── */
  function vid() {
    return safe(function () {
      var v = localStorage.getItem('apt_vid');
      if (!v) { v = 'V' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('apt_vid', v); }
      return v;
    }) || 'V0';
  }
  function sid() {
    return safe(function () {
      var s = sessionStorage.getItem('apt_sid');
      if (!s) { s = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('apt_sid', s); }
      return s;
    }) || 'S0';
  }

  var VID = vid(), SID = sid();
  var T0 = Date.now();

  /* ═══ 1 · ATTENTION ═══════════════════════════════════════════════
     Time-on-page is a lie: it counts backgrounded tabs, idle screens
     and abandoned sessions. Attention counts only the seconds a human
     could plausibly have been looking. */

  var attention = {
    ms: 0,            // true attentive milliseconds
    idle: 0,          // ms idle while visible
    blurred: 0,       // ms with tab hidden
    engaged: false
  };

  var IDLE_AFTER = 12000;   // no input for 12s → idle
  var lastInput = Date.now();
  var lastTick = Date.now();
  var visible = !doc.hidden;

  function tick() {
    var now = Date.now();
    var dt = now - lastTick;
    lastTick = now;
    if (dt > 5000) return;                     // machine slept

    if (!visible) { attention.blurred += dt; return; }
    if (now - lastInput > IDLE_AFTER) { attention.idle += dt; return; }
    attention.ms += dt;
    if (attention.ms > 8000) attention.engaged = true;
  }

  var tickTimer = null;
  function startTicking() { if (!tickTimer) tickTimer = setInterval(tick, 1000); }
  function stopTicking() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

  ['mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'pointerdown'].forEach(function (ev) {
    global.addEventListener(ev, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });

  doc.addEventListener('visibilitychange', function () {
    tick();
    visible = !doc.hidden;
    lastTick = Date.now();
    if (visible) lastInput = Date.now();
  });

  /* ═══ 2 · SCROLL & READING DEPTH ══════════════════════════════════
     Velocity distinguishes a reader from a scanner from a bouncer.  */

  var scroll = {
    maxDepth: 0,          // % of page
    milestones: {},       // 25/50/75/100 → ms since load
    reversals: 0,         // scroll-ups: hunting or re-reading
    velocitySum: 0,
    samples: 0,
    lastY: 0,
    lastT: Date.now(),
    reachedEnd: false
  };

  function onScroll() {
    var y = global.scrollY || doc.documentElement.scrollTop || 0;
    var h = Math.max(1, doc.documentElement.scrollHeight - global.innerHeight);
    var d = Math.min(100, Math.round((y / h) * 100));

    if (y < scroll.lastY - 40) scroll.reversals++;

    var now = Date.now();
    var dt = now - scroll.lastT;
    if (dt > 40 && dt < 3000) {
      scroll.velocitySum += Math.abs(y - scroll.lastY) / (dt / 1000);
      scroll.samples++;
    }
    scroll.lastY = y; scroll.lastT = now;

    if (d > scroll.maxDepth) {
      scroll.maxDepth = d;
      [25, 50, 75, 100].forEach(function (m) {
        if (d >= m && !scroll.milestones[m]) scroll.milestones[m] = Date.now() - T0;
      });
      if (d >= 96) scroll.reachedEnd = true;
    }
  }
  global.addEventListener('scroll', onScroll, { passive: true });

  function readingMode() {
    var v = scroll.samples ? scroll.velocitySum / scroll.samples : 0;
    if (scroll.maxDepth < 20 && attention.ms < 5000) return 'bounce';
    if (v > 2200) return 'skim';
    if (v > 900) return 'scan';
    if (attention.ms > 25000 && scroll.maxDepth > 55) return 'read';
    return 'browse';
  }

  /* ═══ 3 · FRICTION: rage clicks, dead clicks, thrash ══════════════
     Every one of these is a bug report the user never filed. */

  var friction = { rage: [], dead: [], thrash: 0, errors: [] };
  var clickBuf = [];

  function selectorOf(el) {
    return safe(function () {
      if (!el || !el.tagName) return '?';
      if (el.id) return '#' + el.id;
      var cls = (el.className && typeof el.className === 'string')
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      return el.tagName.toLowerCase() + cls;
    }) || '?';
  }

  doc.addEventListener('click', function (e) {
    var now = Date.now();
    var t = e.target;
    var sel = selectorOf(t);

    clickBuf = clickBuf.filter(function (c) { return now - c.t < 1200; });
    clickBuf.push({ t: now, x: e.clientX, y: e.clientY, sel: sel });

    // Rage: 3+ clicks, same 40px box, inside 1.2s
    var near = clickBuf.filter(function (c) {
      return Math.abs(c.x - e.clientX) < 40 && Math.abs(c.y - e.clientY) < 40;
    });
    if (near.length >= 3) {
      friction.rage.push({ sel: sel, at: now, n: near.length, page: PAGE });
      clickBuf = [];
    }

    // Dead: clicked something that cannot possibly do anything
    var inter = t.closest && t.closest('a,button,input,select,textarea,[onclick],[role="button"],[data-showcase],label,summary');
    if (!inter) friction.dead.push({ sel: sel, at: now, page: PAGE });

    if (friction.rage.length > 24) friction.rage.shift();
    if (friction.dead.length > 40) friction.dead.shift();
  }, { capture: true, passive: true });

  global.addEventListener('error', function (e) {
    friction.errors.push({ msg: String(e.message || '').slice(0, 200), page: PAGE, at: Date.now() });
    if (friction.errors.length > 20) friction.errors.shift();
  });

  /* Back-and-forth navigation inside 5s = the user is lost. */
  safe(function () {
    var hist = JSON.parse(sessionStorage.getItem('apt_nav') || '[]');
    hist.push({ p: PAGE, t: Date.now() });
    hist = hist.slice(-12);
    sessionStorage.setItem('apt_nav', JSON.stringify(hist));
    for (var i = 2; i < hist.length; i++) {
      if (hist[i].p === hist[i - 2].p && hist[i].t - hist[i - 2].t < 5000) friction.thrash++;
    }
  }, 'thrash');

  /* ═══ 4 · JOURNEY ═════════════════════════════════════════════════ */
  function journey() {
    return safe(function () { return JSON.parse(sessionStorage.getItem('apt_nav') || '[]'); }) || [];
  }
  function entryPage() { var j = journey(); return j.length ? j[0].p : PAGE; }
  function depth() { return journey().length; }

  /* ═══ 5 · INTENT ENGINE ═══════════════════════════════════════════
     A live 0-100 estimate of purchase intent. Not a vanity metric:
     this is the number that prices an ad slot and decides whether a
     visitor sees a discount. Weights are behavioural, additive, and
     saturate — no single signal can dominate.                       */

  var intentSignals = {
    searches: 0,
    filtersUsed: 0,
    listingsViewed: 0,
    galleryOpens: 0,
    priceChecks: 0,
    dateSelected: false,
    guestsSelected: false,
    ctaHovers: 0,
    savedItems: 0,
    sharedItems: 0,
    checkoutStarted: false,
    returningVisitor: false,
    priorBookings: 0
  };

  safe(function () {
    var seen = Number(localStorage.getItem('apt_visits') || 0) + 1;
    localStorage.setItem('apt_visits', String(seen));
    intentSignals.returningVisitor = seen > 1;
    intentSignals.priorBookings = Number(localStorage.getItem('apt_bookings') || 0);
  }, 'returning');

  function intent() {
    var s = 0;
    var S = intentSignals;

    s += Math.min(12, S.searches * 4);
    s += Math.min(10, S.filtersUsed * 2.5);
    s += Math.min(16, S.listingsViewed * 2);
    s += Math.min(8, S.galleryOpens * 2);
    s += Math.min(6, S.priceChecks * 2);
    if (S.dateSelected) s += 11;
    if (S.guestsSelected) s += 6;
    s += Math.min(5, S.ctaHovers * 1.2);
    s += Math.min(9, S.savedItems * 4);
    s += Math.min(4, S.sharedItems * 2);
    if (S.checkoutStarted) s += 22;

    if (S.returningVisitor) s += 6;
    s += Math.min(10, S.priorBookings * 5);

    // Attention gates everything. Two minutes of real focus is intent.
    var mins = attention.ms / 60000;
    s += Math.min(10, mins * 4);

    var mode = readingMode();
    if (mode === 'bounce') s *= 0.35;
    else if (mode === 'skim') s *= 0.8;
    else if (mode === 'read') s *= 1.12;

    // Friction destroys intent, and we should be honest about that.
    s -= Math.min(14, friction.rage.length * 4);
    s -= Math.min(6, friction.thrash * 3);

    s = Math.max(0, Math.min(100, Math.round(s)));

    return {
      score: s,
      band: s >= 72 ? 'hot' : s >= 45 ? 'warm' : s >= 20 ? 'cool' : 'cold',
      mode: mode,
      signals: S
    };
  }

  /* Public hooks the product calls as things happen. */
  var mark = {
    search: function (q) { intentSignals.searches++; emit('search', { q: String(q || '').slice(0, 80) }); },
    filter: function (k, v) { intentSignals.filtersUsed++; emit('filter', { key: k, value: v }); },
    viewListing: function (id, meta) { intentSignals.listingsViewed++; emit('listing_view', Object.assign({ id: id }, meta || {})); },
    gallery: function (id) { intentSignals.galleryOpens++; emit('gallery_open', { id: id }); },
    priceCheck: function (id) { intentSignals.priceChecks++; emit('price_check', { id: id }); },
    dates: function (a, b) { intentSignals.dateSelected = true; emit('dates_set', { from: a, to: b }); },
    guests: function (n) { intentSignals.guestsSelected = true; emit('guests_set', { n: n }); },
    save: function (id) { intentSignals.savedItems++; emit('save', { id: id }); },
    share: function (id, ch) { intentSignals.sharedItems++; emit('share', { id: id, channel: ch }); },
    checkout: function (id, amt) { intentSignals.checkoutStarted = true; emit('checkout_start', { id: id, amount: amt }); },
    booked: function (id, amt) {
      safe(function () { localStorage.setItem('apt_bookings', String(intentSignals.priorBookings + 1)); });
      emit('booking', { id: id, amount: amt }, true);
    },
    ctaHover: function (label) { intentSignals.ctaHovers++; }
  };

  /* ═══ 6 · AD VIEWABILITY (IAB standard) ═══════════════════════════
     50% of pixels for ≥1 continuous second (display) or ≥2s (video).
     Anything less is not an impression and we refuse to bill for it. */

  var adSessions = Object.create(null);

  function watchAd(el, meta) {
    if (OPTED_OUT || !el || !global.IntersectionObserver) return;
    var key = (meta && meta.campaign_id) || selectorOf(el);
    var st = adSessions[key] = adSessions[key] || {
      meta: meta || {}, viewableMs: 0, maxRatio: 0,
      counted: false, enteredAt: 0, hovers: 0, clicks: 0, format: (meta && meta.format) || 'unknown'
    };

    var need = st.format === 'video' ? 2000 : 1000;
    var timer = null;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        st.maxRatio = Math.max(st.maxRatio, en.intersectionRatio);
        var qualified = en.intersectionRatio >= 0.5 && !doc.hidden;

        if (qualified && !timer) {
          st.enteredAt = Date.now();
          timer = setInterval(function () {
            if (doc.hidden) return;
            st.viewableMs += 250;
            if (!st.counted && st.viewableMs >= need) {
              st.counted = true;
              emit('ad_viewable', {
                campaign_id: key, format: st.format,
                advertiser: st.meta.advertiser,
                slot: st.meta.slot, page: PAGE,
                viewable_ms: st.viewableMs, max_ratio: Math.round(st.maxRatio * 100)
              });
            }
          }, 250);
        } else if (!qualified && timer) {
          clearInterval(timer); timer = null;
        }
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    io.observe(el);

    el.addEventListener('mouseenter', function () { st.hovers++; }, { passive: true });
    el.addEventListener('click', function () {
      st.clicks++;
      emit('ad_click', {
        campaign_id: key, format: st.format, advertiser: st.meta.advertiser,
        slot: st.meta.slot, page: PAGE,
        dwell_before_click: st.viewableMs,
        intent_at_click: intent().score
      }, true);
    }, { passive: true });
  }

  function adReport() {
    return Object.keys(adSessions).map(function (k) {
      var a = adSessions[k];
      return {
        campaign_id: k, format: a.format, slot: a.meta.slot,
        viewable: a.counted, viewable_ms: a.viewableMs,
        max_ratio: Math.round(a.maxRatio * 100),
        hovers: a.hovers, clicks: a.clicks
      };
    });
  }

  /* ═══ 7 · FEATURE VECTOR — the ML payload ═════════════════════════
     A flat, numeric, model-ready representation of the session. This
     is the artifact that makes the data an asset rather than a log. */

  function features() {
    var i = intent();
    var now = new Date();
    var j = journey();
    var mode = readingMode();
    var modes = ['bounce', 'skim', 'scan', 'browse', 'read'];

    return {
      // identity (hashed downstream, never joined to PII here)
      visitor_id: VID, session_id: SID,

      // temporal
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      is_weekend: now.getDay() === 0 || now.getDay() === 6 ? 1 : 0,
      session_age_s: Math.round((Date.now() - T0) / 1000),

      // attention
      attention_s: Math.round(attention.ms / 1000),
      idle_s: Math.round(attention.idle / 1000),
      blurred_s: Math.round(attention.blurred / 1000),
      attention_ratio: attention.ms / Math.max(1, Date.now() - T0),
      engaged: attention.engaged ? 1 : 0,

      // scroll
      scroll_depth: scroll.maxDepth,
      scroll_reversals: scroll.reversals,
      scroll_velocity: scroll.samples ? Math.round(scroll.velocitySum / scroll.samples) : 0,
      reached_end: scroll.reachedEnd ? 1 : 0,
      time_to_50pct: scroll.milestones[50] || null,

      // navigation
      journey_depth: j.length,
      entry_page: entryPage(),
      current_page: PAGE,
      pages_unique: (function () { var s = {}; j.forEach(function (x) { s[x.p] = 1; }); return Object.keys(s).length; })(),

      // friction
      rage_clicks: friction.rage.length,
      dead_clicks: friction.dead.length,
      nav_thrash: friction.thrash,
      js_errors: friction.errors.length,

      // intent
      intent_score: i.score,
      intent_band: i.band,
      reading_mode: mode,
      reading_mode_ord: modes.indexOf(mode),

      // commerce signals
      searches: intentSignals.searches,
      filters_used: intentSignals.filtersUsed,
      listings_viewed: intentSignals.listingsViewed,
      gallery_opens: intentSignals.galleryOpens,
      dates_selected: intentSignals.dateSelected ? 1 : 0,
      saved_items: intentSignals.savedItems,
      checkout_started: intentSignals.checkoutStarted ? 1 : 0,
      returning: intentSignals.returningVisitor ? 1 : 0,
      prior_bookings: intentSignals.priorBookings,

      // device
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
        : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
      viewport_w: global.innerWidth,
      connection: (navigator.connection && navigator.connection.effectiveType) || null,
      pwa: matchMedia('(display-mode: standalone)').matches ? 1 : 0,

      // ads seen this session
      ads_viewable: adReport().filter(function (a) { return a.viewable; }).length,
      ads_clicked: adReport().reduce(function (s, a) { return s + a.clicks; }, 0),

      captured_at: new Date().toISOString()
    };
  }

  /* ═══ 8 · TRANSPORT ═══════════════════════════════════════════════
     Buffered, batched, beacon-flushed. Never blocks. Never retries
     into a storm. Drops before it degrades the page.                */

  var queue = [];
  var MAX_Q = 60;

  function emit(event, props, urgent) {
    if (OPTED_OUT) return;
    queue.push({
      visitor_id: VID, session_id: SID,
      event: event, page: PAGE,
      props: props || {},
      intent_score: (event === 'ad_viewable' || event === 'ad_click') ? undefined : undefined,
      created_at: new Date().toISOString()
    });
    if (queue.length > MAX_Q) queue.shift();
    if (urgent) flush();
  }

  var flushing = false;
  function flush(useBeacon) {
    if (OPTED_OUT || flushing || !queue.length) return;
    var batch = queue.splice(0, queue.length);
    flushing = true;

    var url = SUPA_URL + '/rest/v1/signal_events';
    var body = JSON.stringify(batch);

    if (useBeacon && navigator.sendBeacon) {
      safe(function () {
        navigator.sendBeacon(url + '?apikey=' + SUPA_KEY, new Blob([body], { type: 'application/json' }));
      }, 'beacon');
      flushing = false;
      return;
    }

    safe(function () {
      fetch(url, {
        method: 'POST', keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
          Prefer: 'return=minimal'
        },
        body: body
      }).catch(function () {}).finally(function () { flushing = false; });
    }, 'flush') || (flushing = false);
  }

  /* Session summary — the row that actually feeds the models. */
  function sealSession(useBeacon) {
    if (OPTED_OUT) return;
    tick();
    var row = Object.assign(features(), { ads: adReport() });
    var url = SUPA_URL + '/rest/v1/session_features';
    var body = JSON.stringify([row]);

    if (useBeacon && navigator.sendBeacon) {
      safe(function () {
        navigator.sendBeacon(url + '?apikey=' + SUPA_KEY, new Blob([body], { type: 'application/json' }));
      }, 'seal-beacon');
      return;
    }
    safe(function () {
      fetch(url, {
        method: 'POST', keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
          Prefer: 'return=minimal'
        },
        body: body
      }).catch(function () {});
    }, 'seal');
  }

  setInterval(function () { flush(); }, 15000);

  global.addEventListener('pagehide', function () { flush(true); sealSession(true); });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { flush(true); sealSession(true); }
  });

  /* ── Auto-wire ad slots that showcase.js mounted ──────────────── */
  function wireAds() {
    safe(function () {
      doc.querySelectorAll('[data-showcase]').forEach(function (el) {
        var fmt = el.getAttribute('data-showcase');
        var inner = el.firstElementChild;
        watchAd(inner || el, {
          format: fmt, slot: PAGE + ':' + fmt,
          campaign_id: el.getAttribute('data-campaign') || (PAGE + ':' + fmt),
          advertiser: el.getAttribute('data-advertiser') || null
        });
      });
    }, 'wireAds');
  }

  function boot() {
    if (OPTED_OUT) return;
    startTicking();
    emit('page_view', { entry: entryPage(), depth: depth(), referrer: doc.referrer || null });
    setTimeout(wireAds, 1200);
    setTimeout(wireAds, 3500);   // showcase mounts async
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.ApaSignal = {
    mark: mark,
    intent: intent,
    features: features,
    attention: function () { return Object.assign({}, attention); },
    scroll: function () { return Object.assign({}, scroll); },
    friction: function () { return JSON.parse(JSON.stringify(friction)); },
    journey: journey,
    adReport: adReport,
    watchAd: watchAd,
    emit: emit,
    flush: flush,
    optOut: function () { safe(function () { localStorage.setItem('apa-no-track', '1'); }); OPTED_OUT = true; stopTicking(); },
    optIn: function () { safe(function () { localStorage.removeItem('apa-no-track'); }); OPTED_OUT = false; startTicking(); },
    isOptedOut: function () { return OPTED_OUT; }
  };

})(window);
