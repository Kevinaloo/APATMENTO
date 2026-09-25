/* ═══════════════════════════════════════════════════════════════════
   CABANA · WELCOME POSTER v4   (dashboard.welcome)
   ───────────────────────────────────────────────────────────────────
   The optional full-screen poster, image or video, that greets a
   member the moment their dashboard opens. It is an ad campaign like
   any other (format 'poster' in ad_campaigns), so it is created,
   scheduled, paused and measured in the console's Advertising room.

   When no poster is live, nothing changes: the dashboard's own Cabana
   cinematic splash runs exactly as before. When one is live, it takes
   that moment instead, once per its frequency (once, daily, session or
   every visit), and never traps anyone:

     · Skippable after a few seconds (set per campaign), Escape too.
     · Hard ceiling: duration + 6s, whatever the media does.
     · Coming back from a service page (?back=1) never shows it.
     · Reduced motion: an image poster shows, a video poster is skipped.

   Loaded synchronously in the dashboard <head>, before the brand
   splash script, so the decision is made before the first paint.
   ═══════════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';
  if (W.__cabanaPoster) return;
  W.__cabanaPoster = true;

  var D = W.document;
  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var CACHE = 'cads:v4:dashboard', SEEN = 'cabana-poster-seen', SLOT = 'dashboard.welcome';
  var T0 = Date.now();

  function safe(fn, fb) { try { return fn(); } catch (e) { return fb; } }
  var path = String(W.location.pathname || '');
  var ON_DASH = /(^|\/)dashboard(\.html)?\/?$/i.test(path) && !/[?&]back=1/.test(W.location.search);

  var REDUCED = safe(function () { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; }, false);
  var VID = safe(function () { return W.localStorage.getItem('apt_vid'); }, null) || 'V0';
  var DEVICE = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

  function today() { return safe(function () { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date()); }, new Date().toISOString().slice(0, 10)); }
  function readCache() { return safe(function () { var o = JSON.parse(W.localStorage.getItem(CACHE) || 'null'); return o && o.data ? o : null; }, null); }
  function seenMap() { return safe(function () { return JSON.parse(W.localStorage.getItem(SEEN) || '{}'); }, {}) || {}; }
  function markSeen(c) {
    var m = seenMap(); m[c.id] = Date.now();
    safe(function () { W.localStorage.setItem(SEEN, JSON.stringify(m)); });
    safe(function () { W.sessionStorage.setItem(SEEN + ':' + c.id, '1'); });
  }
  function due(c) {
    var f = c.frequency || 'daily', last = seenMap()[c.id];
    if (f === 'always') return true;
    if (f === 'session') return !safe(function () { return W.sessionStorage.getItem(SEEN + ':' + c.id); }, null);
    if (!last) return true;
    if (f === 'once') return false;
    return new Date(last).toDateString() !== new Date().toDateString();     // daily
  }
  function running(c) {
    if (!c || c.format !== 'poster' || c.status === 'paused' || c.status === 'draft' || c.active === false) return false;
    var d = today();
    if (c.start_date && String(c.start_date).slice(0, 10) > d) return false;
    if (c.end_date && String(c.end_date).slice(0, 10) < d) return false;
    if (!c.media_url || !/^https?:\/\//i.test(c.media_url)) return false;
    return true;
  }
  function isVideo(c) { return c.media_kind ? c.media_kind === 'video' : /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(c.media_url); }
  function choose(bundle) {
    if (!bundle) return null;
    var st = bundle.settings || {};
    if (st.enabled === false || (st.poster && st.poster.enabled === false)) return { off: true };
    if ((st.disabled_slots || []).indexOf(SLOT) !== -1) return { off: true };
    var list = (bundle.campaigns || []).filter(running).filter(function (c) { return !(REDUCED && isVideo(c)); });
    if (!list.length) return null;
    list.sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
    var ready = list.filter(due);
    return ready.length ? { c: ready[0] } : { none: 'already seen' };
  }

  function rpc(fn, body, keep) {
    return fetch(SUPA_URL + '/rest/v1/rpc/' + fn, { method: 'POST', keepalive: !!keep,
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }, body: JSON.stringify(body) });
  }
  function track(c, ev) { rpc('ad_track', { p_campaign: String(c.id), p_event: ev, p_page: 'dashboard', p_slot: SLOT, p_visitor: VID, p_device: DEVICE }, true).catch(function () {}); }
  function health(state, detail, id) {
    var sig = state + '|' + (id || ''), key = 'cads:hb:poster', last = safe(function () { return JSON.parse(W.localStorage.getItem(key) || 'null'); }, null);
    if (last && last.sig === sig && Date.now() - last.at < 10 * 60 * 1000) return;
    safe(function () { W.localStorage.setItem(key, JSON.stringify({ sig: sig, at: Date.now() })); });
    rpc('ad_heartbeat', { p_page: 'dashboard', p_reports: [{ slot: SLOT, format: 'poster', state: state, campaign: id || null, detail: detail || null }] }, true).catch(function () {});
  }
  function fetchBundle(ms) {
    return new Promise(function (res) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; res(null); } }, ms);
      rpc('ads_bundle', { p_page: 'dashboard' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (b) {
        if (b && typeof b === 'object') safe(function () { W.localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), data: b })); });
        if (!done) { done = true; clearTimeout(t); res(b); }
      }).catch(function () { if (!done) { done = true; clearTimeout(t); res(null); } });
    });
  }

  /* ── curtain ── */
  var CSS = [
    'html.cads-poster-lock,html.cads-poster-lock body{overflow:hidden!important;}',
    '#cads-poster{position:fixed;inset:0;z-index:2147483200;background:#07070D;color:#fff;font-family:"Geist","Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased;opacity:1;transition:opacity .45s ease,transform .6s cubic-bezier(.7,0,.3,1);overflow:hidden;}',
    '#cads-poster.out{opacity:0;transform:scale(1.04);}',
    '#cads-poster .pb{position:absolute;inset:-8%;background-size:cover;background-position:center;filter:blur(42px) saturate(1.2) brightness(.45);transform:scale(1.12);}',
    '#cads-poster .pm{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .8s ease;}',
    '#cads-poster .pm.on{opacity:1;}',
    '@media (min-aspect-ratio:1/1) and (min-width:721px){#cads-poster .pm{object-fit:contain;}}',
    '#cads-poster .pv{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,4,10,.55) 0%,rgba(4,4,10,0) 22%,rgba(4,4,10,0) 58%,rgba(4,4,10,.8) 100%);pointer-events:none;}',
    '#cads-poster .pt{position:absolute;top:max(18px,env(safe-area-inset-top));left:18px;right:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;z-index:3;}',
    '#cads-poster .pl{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:99px;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font:650 10.5px/1 "Geist",sans-serif;letter-spacing:.12em;text-transform:uppercase;}',
    '#cads-poster .ps{min-width:86px;height:36px;padding:0 16px;border-radius:99px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.34);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;font:650 12.5px/1 "Geist",sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;}',
    '#cads-poster .ps[disabled]{opacity:.62;cursor:default;}',
    '#cads-poster .ps:focus-visible,#cads-poster .pc:focus-visible{outline:3px solid #8F7BFF;outline-offset:3px;}',
    '#cads-poster .pbot{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:0 clamp(20px,6vw,56px) max(34px,calc(env(safe-area-inset-bottom) + 26px));display:flex;flex-direction:column;align-items:flex-start;gap:10px;max-width:760px;}',
    '#cads-poster .ph{font:500 clamp(26px,5vw,48px)/1.04 "Geist",sans-serif;letter-spacing:-.03em;margin:0;text-shadow:0 2px 30px rgba(0,0,0,.35);}',
    '#cads-poster .psub{font:400 clamp(13.5px,1.6vw,16px)/1.5 "Inter",sans-serif;opacity:.86;margin:0;}',
    '#cads-poster .pc{margin-top:8px;display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border-radius:99px;background:#fff;color:#0A0A14;font:700 14.5px/1 "Geist",sans-serif;text-decoration:none;box-shadow:0 10px 34px rgba(0,0,0,.35);}',
    '#cads-poster .pc svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;}',
    '#cads-poster .pp{position:absolute;left:0;bottom:0;height:3px;width:0;z-index:4;background:linear-gradient(90deg,#7B2FF7,#4F6DFF,#FF6A3C);}',
    '#cads-poster .ppv{position:absolute;top:70px;left:18px;z-index:4;background:#FFB020;color:#231500;border-radius:99px;padding:4px 10px;font:700 10px/1 "Geist",sans-serif;letter-spacing:.1em;text-transform:uppercase;}'
  ].join('\n');

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function href(u) { u = String(u || '').trim(); if (!u || u === '#') return ''; return /^https?:\/\//i.test(u) ? u : (u.charAt(0) === '/' ? u : '/' + u.replace(/^\.\//, '')); }

  var cover = null;
  function paintCurtain() {
    if (cover) return cover;
    if (!D.getElementById('cads-poster-css')) { var s = D.createElement('style'); s.id = 'cads-poster-css'; s.textContent = CSS; (D.head || D.documentElement).appendChild(s); }
    cover = D.createElement('div'); cover.id = 'cads-poster'; cover.setAttribute('role', 'dialog'); cover.setAttribute('aria-modal', 'true'); cover.setAttribute('aria-label', 'Sponsored welcome');
    (D.body || D.documentElement).appendChild(cover);
    D.documentElement.classList.add('cads-poster-lock');
    return cover;
  }
  function dropCurtain() {
    if (!cover) return;
    var c = cover; cover = null;
    c.classList.add('out');
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); D.documentElement.classList.remove('cads-poster-lock'); }, 520);
    if (W.CabanaAds && W.CabanaAds.releaseOverlay) W.CabanaAds.releaseOverlay('poster');
  }

  var playing = false;
  function play(c, preview) {
    if (playing) return; playing = true;
    // The brand splash yields: the poster owns this moment.
    var brand = D.getElementById('cbp-splash');
    if (brand && brand.parentNode) brand.parentNode.removeChild(brand);
    paintCurtain();
    if (D.body && cover.parentNode !== D.body) D.body.appendChild(cover);
    var vid = isVideo(c), total = Math.max(3, Math.min(60, c.duration_s || 8)) * 1000;
    var skipAfter = Math.max(0, Math.min(30, c.skip_after_s == null ? 3 : c.skip_after_s)) * 1000;
    var link = href(c.cta_url);
    cover.innerHTML = (c.poster_url || !vid ? '<div class="pb" style="background-image:url(&quot;' + esc(c.poster_url || c.media_url) + '&quot;)"></div>' : '') +
      (vid ? '<video class="pm" muted playsinline preload="auto"' + (c.poster_url ? ' poster="' + esc(c.poster_url) + '"' : '') + '></video>' : '<img class="pm" alt=""/>') +
      '<div class="pv"></div>' +
      '<div class="pt"><span class="pl">Sponsored' + (c.advertiser ? ' · ' + esc(c.advertiser) : '') + '</span>' +
      '<button type="button" class="ps" ' + (skipAfter ? 'disabled' : '') + ' aria-label="Skip">' + (skipAfter ? 'Skip in ' + Math.ceil(skipAfter / 1000) : 'Skip ✕') + '</button></div>' +
      '<div class="pbot">' + (c.headline ? '<h2 class="ph">' + esc(c.headline) + '</h2>' : '') +
      (c.sub_text ? '<p class="psub">' + esc(c.sub_text) + '</p>' : '') +
      (link ? '<a class="pc" href="' + esc(link) + '">' + esc(c.cta_text || 'Learn more') + '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' : '') + '</div>' +
      '<div class="pp"></div>' + (preview ? '<span class="ppv">Preview</span>' : '');

    var media = cover.querySelector('.pm'), bar = cover.querySelector('.pp'), skip = cover.querySelector('.ps');
    var started = false, finished = false, timers = [];
    function after(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function finish(how) {
      if (finished) return; finished = true;
      timers.forEach(clearTimeout);
      D.removeEventListener('keydown', onKey);
      // A poster that never managed to show is not "seen": it gets the next visit.
      if (!preview && started) { markSeen(c); track(c, how === 'skip' ? 'skip' : how === 'click' ? 'click' : 'complete'); }
      if (!preview && !started) health('error', 'The poster media did not load (' + (how || 'unknown') + '). Check the file.', String(c.id));
      dropCurtain();
    }
    function onKey(e) { if (e.key === 'Escape' && !skip.disabled) finish('skip'); }
    D.addEventListener('keydown', onKey);
    skip.addEventListener('click', function () { if (!skip.disabled) finish('skip'); });
    var cta = cover.querySelector('.pc');
    if (cta) cta.addEventListener('click', function (e) {
      if (preview) { e.preventDefault(); return; }
      var ext = /^https?:\/\//i.test(link) && link.indexOf(W.location.host) === -1;
      if (ext) { e.preventDefault(); W.open(link, '_blank', 'noopener'); }
      finish('click');
    });

    function begin() {
      if (started || finished) return; started = true;
      media.classList.add('on');
      if (!preview) { track(c, 'impression'); after(vid ? 2000 : 1000, function () { if (!finished) track(c, 'viewable'); }); health('live', 'Shown on arrival.', String(c.id)); }
      var len = total;
      if (vid && media.duration && isFinite(media.duration)) len = Math.min(total, media.duration * 1000);
      bar.style.transition = 'width ' + len + 'ms linear';
      W.requestAnimationFrame(function () { bar.style.width = '100%'; });
      after(len, function () { finish('complete'); });
      if (skipAfter) {
        var left = Math.ceil(skipAfter / 1000);
        var iv = setInterval(function () {
          left--; if (finished) { clearInterval(iv); return; }
          if (left <= 0) { clearInterval(iv); skip.disabled = false; skip.textContent = 'Skip ✕'; skip.focus({ preventScroll: true }); }
          else skip.textContent = 'Skip in ' + left;
        }, 1000);
      }
    }
    after(total + 6000, function () { finish('complete'); });          // never trap
    after(4500, function () { if (!started) finish('error'); });        // media never came
    if (vid) {
      media.addEventListener('playing', begin);
      media.addEventListener('ended', function () { finish('complete'); });
      media.addEventListener('error', function () {
        // A video the device cannot play falls back to its poster frame.
        if (c.poster_url && !started) {
          var img = D.createElement('img'); img.className = 'pm'; img.alt = '';
          img.onload = begin; img.onerror = function () { finish('error'); };
          media.parentNode.replaceChild(img, media); media = img; vid = false; img.src = c.poster_url;
        } else finish('error');
      });
      media.src = c.media_url;
      var p = safe(function () { return media.play(); }, null);
      if (p && p.catch) p.catch(function () { after(1200, function () { if (!started) finish('error'); }); });
    } else {
      media.onload = begin; media.onerror = function () { finish('error'); };
      media.src = c.media_url;
      if (media.complete && media.naturalWidth) begin();
    }
  }

  /* ── decide ── */
  var fromCache = ON_DASH ? choose(readCache() && readCache().data) : null;
  if (!ON_DASH) { /* elsewhere this file only offers preview() to the console */ }
  else if (fromCache && fromCache.c) {
    W.__cbpPosterClaim = true;           // the brand splash script checks this and stands down
    paintCurtain();
    var go = function () { play(fromCache.c, false); };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', go, { once: true }); else go();
    fetchBundle(4000);
  } else {
    fetchBundle(2600).then(function (b) {
      var pick = choose(b);
      if (!pick) return health('empty', 'No welcome poster is live.');
      if (pick.off) return health('off', 'The welcome poster is switched off in the rules.');
      if (!pick.c) return health('deferred', 'Live, already seen by this visitor (' + (pick.none || '') + ').');
      // Only take over if it is still the arrival moment: while the brand
      // splash is up, or within 3s of the page opening. Otherwise the
      // poster waits for the next visit rather than interrupting.
      var arriving = D.getElementById('cbp-splash') || Date.now() - T0 < 3000;
      if (!arriving) return health('deferred', 'Fetched after arrival; will greet the next visit.', String(pick.c.id));
      var go2 = function () { play(pick.c, false); };
      if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', go2, { once: true }); else go2();
    });
  }

  W.CabanaPoster = {
    preview: function (c) { playing = false; play(Object.assign({ skip_after_s: 0, duration_s: 8 }, c || {}), true); },
    reset: function () { safe(function () { W.localStorage.removeItem(SEEN); }); }
  };
})(window);
