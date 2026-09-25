/* ═══════════════════════════════════════════════════════════════════
   CABANA · SECRET ADS v3   (shadow ads)
   ───────────────────────────────────────────────────────────────────
   A secret ad is invisible until the moment is right. It waits for a
   visitor who has settled in (time on page, scroll, reading mode and
   intent from ApaSignal), matches where they are and what they look
   at, then slides in at the edge of the screen for a few seconds and
   leaves on its own. It never covers what someone is using:

     · Never on money, identity or form pages (registry NEVER list).
     · Never while a dialog is open or the visitor is typing.
     · Never at the same time as another overlay (shared lock with the
       corner card and the welcome poster).
     · One dismissal silences every secret ad for the session.
     · Frequency cap per ad, a cooldown between any two, hard stop on
       hidden tabs, and no motion for prefers-reduced-motion.

   v3 fixes the reasons v2 never showed anything in production:
     · It read ApaSignal.dwell(), which does not exist, so the dwell rule
       could never pass. Dwell is now measured here (visible time).
     · It was only included on four pages; the console offered eleven.
       The ad engine now loads it on every surface that allows it.
     · Its counters ran without permission (fixed in the database).
     · min_scroll_pct and areas were saved but never checked.
   ═══════════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';
  if (W.ApaShadow) return;

  var D = W.document;
  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  function safe(fn, fb) { try { return fn(); } catch (e) { return fb; } }
  var PAGE = safe(function () {
    return W.CabanaAdRegistry ? W.CabanaAdRegistry.pageFromPath(W.location.pathname)
      : ((W.location.pathname.split('/').pop() || 'index').replace(/\.html?$/, '') || 'index');
  }, 'index');
  var NEVER = (W.CabanaAdRegistry && W.CabanaAdRegistry.NEVER) || ['admin', 'auth', 'add-listing', 'booking-confirm', 'checkout', 'order', 'dashboard'];
  var QS = safe(function () { return new URLSearchParams(W.location.search); }, null);
  var PREVIEW_JSON = QS && QS.get('shadow_preview');
  /* On pages that never carry ads (the console included) only the
     preview API exists, so operators can play a secret ad in place. */
  var PREVIEW_ONLY = !PREVIEW_JSON && (NEVER.indexOf(PAGE) !== -1 || PAGE === 'dashboard' ||
    safe(function () { return localStorage.getItem('apa-no-track') === '1'; }, false));

  var REDUCE = safe(function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; }, false);
  var DEVICE = /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  var SLOT = PAGE + '.secret';

  var VID = safe(function () {
    var v = localStorage.getItem('apt_vid');
    if (!v) { v = 'V' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('apt_vid', v); }
    return v;
  }, 'V0');
  var SID = safe(function () {
    var s = sessionStorage.getItem('apt_sid');
    if (!s) { s = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('apt_sid', s); }
    return s;
  }, 'S0');

  /* ── session memory ── */
  var SEEN = 'cabana_secret_seen', QUIET = 'cabana_secret_quiet', LAST = 'cabana_secret_last';
  function seen() { return safe(function () { return JSON.parse(sessionStorage.getItem(SEEN) || '{}'); }, {}); }
  function bump(id) { var m = seen(); m[id] = (m[id] || 0) + 1; safe(function () { sessionStorage.setItem(SEEN, JSON.stringify(m)); }); }
  function quiet() { return safe(function () { return sessionStorage.getItem(QUIET) === '1'; }, false); }
  function lastShown() { return safe(function () { return parseInt(sessionStorage.getItem(LAST) || '0', 10) || 0; }, 0); }

  /* ── measurements ── */
  var visibleMs = 0, lastTick = Date.now(), maxScroll = 0;
  function measure() {
    var now = Date.now();
    if (!D.hidden) visibleMs += Math.min(now - lastTick, 2000);
    lastTick = now;
    var h = Math.max(1, D.documentElement.scrollHeight - W.innerHeight);
    var inner = D.querySelector('.mv-scroll');   // app-style pages scroll a panel, not the page
    var pct = h > 50 ? (W.pageYOffset || 0) / h * 100 : 100;
    if (inner && inner.scrollHeight > inner.clientHeight + 50) pct = Math.max(pct, inner.scrollTop / (inner.scrollHeight - inner.clientHeight) * 100);
    maxScroll = Math.max(maxScroll, Math.min(100, pct));
  }
  var area = null;
  function learnArea() {
    var fromUrl = QS && (QS.get('area') || QS.get('city') || QS.get('location') || QS.get('q'));
    if (fromUrl) area = fromUrl;
    safe(function () {
      if (W.ApaLocation && W.ApaLocation.current && W.ApaLocation.current() && W.ApaLocation.label) {
        W.ApaLocation.label().then(function (l) { if (l) area = (area ? area + ' ' : '') + l; }, function () {});
      }
    });
  }

  /* ── network ── */
  function post(path, body, prefer) {
    var h = { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY };
    if (prefer) h.Prefer = prefer;
    return fetch(SUPA_URL + path, { method: 'POST', keepalive: true, headers: h, body: JSON.stringify(body) }).catch(function () {});
  }
  function counter(fn, id) { if (/^\d+$/.test(String(id))) post('/rest/v1/rpc/' + fn, { p_ad_id: Number(id) }); }
  function logEvent(ad, event, dwellMs, pos) {
    if (ad._preview || !/^\d+$/.test(String(ad.id))) return;
    var sig = W.ApaSignal, it = sig && sig.intent ? safe(function () { return sig.intent(); }, {}) || {} : {};
    post('/rest/v1/shadow_ad_events', {
      ad_id: Number(ad.id), visitor_id: VID, session_id: SID, event: event, surface: PAGE, position: pos || 'auto',
      intent_score: typeof it.score === 'number' ? Math.round(it.score) : null, reading_mode: it.mode || null,
      dwell_ms: dwellMs == null ? null : Math.round(dwellMs), device: DEVICE
    }, 'return=minimal');
  }
  var hb = null;
  function health(state, detail, id) {
    var sig = state + '|' + (id || '') + '|' + (detail || '');
    if (hb === sig) return; hb = sig;
    var key = 'cads:hb:secret:' + PAGE, last = safe(function () { return JSON.parse(localStorage.getItem(key) || 'null'); }, null);
    if (last && last.sig === sig && Date.now() - last.at < 10 * 60 * 1000) return;
    safe(function () { localStorage.setItem(key, JSON.stringify({ sig: sig, at: Date.now() })); });
    post('/rest/v1/rpc/ad_heartbeat', { p_page: PAGE, p_reports: [{ slot: SLOT, format: 'secret', state: state, campaign: id ? String(id) : null, detail: detail || null }] });
  }

  /* ── eligibility ── */
  var POOL = [], why = 'waiting';
  function today() { return safe(function () { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date()); }, new Date().toISOString().slice(0, 10)); }
  function list(v, fb) { return Array.isArray(v) && v.length ? v : fb; }
  function eligible(ad) {
    var d = today();
    if (ad.start_date && String(ad.start_date).slice(0, 10) > d) return (why = 'scheduled later', false);
    if (ad.end_date && String(ad.end_date).slice(0, 10) < d) return (why = 'ended', false);
    var surfs = list(ad.surfaces, ['all']);
    if (surfs.indexOf('all') === -1 && surfs.indexOf(PAGE) === -1) return (why = 'not for this page', false);
    if ((seen()[ad.id] || 0) >= (ad.max_per_session || 1)) return (why = 'already shown this session', false);
    if (ad.device && ad.device !== 'all' && ad.device !== DEVICE) return (why = 'other device', false);
    var sig = W.ApaSignal, it = sig && sig.intent ? safe(function () { return sig.intent(); }, null) : null;
    var score = it && typeof it.score === 'number' ? it.score : 50, mode = (it && it.mode) || 'browse';
    if (score < (ad.intent_min || 0) || score > (ad.intent_max == null ? 100 : ad.intent_max)) return (why = 'intent ' + Math.round(score) + ' outside range', false);
    var modes = list(ad.reading_modes, ['skim', 'scan', 'browse', 'read']);
    if (it && it.mode && modes.indexOf(mode) === -1) return (why = 'reading mode ' + mode, false);
    if (visibleMs < (ad.min_dwell_s || 0) * 1000) return (why = 'dwell', false);
    if (maxScroll < (ad.min_scroll_pct || 0)) return (why = 'scroll', false);
    var areas = list(ad.areas, ['all']);
    if (areas.indexOf('all') === -1) {
      var hay = ((area || '') + ' ' + (D.title || '') + ' ' + W.location.search).toLowerCase();
      if (!areas.some(function (a) { return hay.indexOf(String(a).toLowerCase()) !== -1; })) return (why = 'area', false);
    }
    var kws = list(ad.keywords, []);
    if (kws.length) {
      var ctx = (decodeURIComponent(W.location.search) + ' ' + (D.title || '') + ' ' + (area || '')).toLowerCase();
      if (!kws.some(function (k) { return ctx.indexOf(String(k).toLowerCase()) !== -1; })) return (why = 'keywords', false);
    }
    return true;
  }
  function busy() {
    var ae = D.activeElement;
    if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return 'typing';
    var modal = D.querySelector('[aria-modal="true"]:not([hidden]), dialog[open]');
    if (modal && modal.offsetParent !== null) return 'dialog open';
    if (D.documentElement.classList.contains('apa-splash-lock')) return 'splash';
    return null;
  }
  function pick() {
    var ok = POOL.filter(eligible);
    if (!ok.length) return null;
    var total = ok.reduce(function (s, a) { return s + (a.priority || 1); }, 0), r = Math.random() * total, acc = 0;
    for (var i = 0; i < ok.length; i++) { acc += ok[i].priority || 1; if (r <= acc) return ok[i]; }
    return ok[ok.length - 1];
  }
  function place(ad) {
    var p = ad.position || 'auto';
    if (DEVICE === 'mobile') return p === 'top' ? 'top' : 'bottom';
    if (p === 'auto') return DEVICE === 'desktop' ? 'rise' : 'bottom';
    return p;
  }

  /* ── look ── */
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = D.createElement('style'); s.id = 'cabana-secret-css';
    s.textContent = [
      '.csa{position:fixed;z-index:8800;width:340px;max-width:calc(100vw - 24px);font-family:"Geist","Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased;opacity:0;pointer-events:none;transition:opacity .45s ease,transform .6s cubic-bezier(.22,1.2,.36,1);}',
      '.csa.in{opacity:1;pointer-events:auto;transform:none!important;}',
      '.csa-side{right:18px;top:50%;margin-top:-80px;transform:translateX(calc(100% + 30px));}',
      '.csa-rise{right:22px;bottom:calc(22px + var(--cbn-corner-claim, 0px));transform:translateY(calc(100% + 40px));}',
      '.csa-bottom{left:50%;bottom:calc(84px + var(--cbn-corner-claim, 0px));margin-left:-170px;transform:translateY(calc(100% + 120px));}',
      '.csa-top{left:50%;top:14px;margin-left:-170px;transform:translateY(-140%);}',
      '@media(max-width:640px){.csa-bottom,.csa-top{left:12px;right:12px;margin-left:0;width:auto;}}',
      '.csa-card{position:relative;border-radius:20px;overflow:hidden;cursor:pointer;color:#fff;box-shadow:0 24px 64px rgba(8,8,20,.30),0 0 0 1px rgba(255,255,255,.08);}',
      '.csa-glass .csa-card{display:flex;gap:12px;align-items:stretch;padding:12px;background:rgba(18,16,40,.82);-webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);}',
      '.csa-glass .csa-thumb{position:relative;flex:none;width:92px;border-radius:14px;overflow:hidden;background:var(--csa-bg);}',
      '.csa-glass .csa-thumb img,.csa-glass .csa-thumb video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}',
      '.csa-photo .csa-card{min-height:190px;background:var(--csa-bg);}',
      '.csa-photo .csa-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}',
      '.csa-photo .csa-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,6,16,.1) 20%,rgba(6,6,16,.82) 100%);}',
      '.csa-photo .csa-body{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:16px;}',
      '.csa-minimal .csa-card{background:#fff;color:#0A0A14;padding:16px;border:1px solid rgba(10,10,20,.08);}',
      '.csa-body{min-width:0;flex:1;padding:2px 26px 2px 0;}',
      '.csa-ad{font-size:10px;font-weight:650;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin-bottom:4px;}',
      '.csa-h{font-size:15px;font-weight:600;line-height:1.25;letter-spacing:-.01em;margin:0 0 3px;}',
      '.csa-s{font-size:12.5px;line-height:1.45;opacity:.82;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
      '.csa-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:99px;border:0;background:#fff;color:#0A0A14;font:700 12px/1 "Geist",sans-serif;cursor:pointer;}',
      '.csa-minimal .csa-cta{background:#0A0A14;color:#fff;}',
      '.csa-cta svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}',
      '.csa-x{position:absolute;top:8px;right:8px;z-index:3;width:26px;height:26px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;}',
      '.csa-minimal .csa-x{background:rgba(10,10,20,.06);}',
      '.csa-x svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;}',
      '.csa-x:focus-visible,.csa-cta:focus-visible{outline:3px solid #8F7BFF;outline-offset:2px;}',
      '.csa-prog{position:absolute;left:0;bottom:0;height:3px;width:100%;transform-origin:left;background:var(--csa-accent,#fff);z-index:3;}',
      '.csa-pv{position:absolute;top:8px;left:8px;z-index:4;background:#FFB020;color:#231500;border-radius:99px;padding:3px 8px;font:700 9.5px/1 "Geist",sans-serif;letter-spacing:.1em;text-transform:uppercase;}',
      '@media(prefers-reduced-motion:reduce){.csa{transition:opacity .2s!important;transform:none!important;}}'
    ].join('');
    (D.head || D.documentElement).appendChild(s);
  }
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function url(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) || u.charAt(0) === '/' ? u : ''; }
  function bg(v) { v = String(v || ''); return /^(linear|radial)-gradient\([#(),.%\sa-z0-9-]+\)$/i.test(v) || /^#[0-9a-f]{3,8}$/i.test(v) ? v : 'linear-gradient(135deg,#6D28FF,#4F6DFF)'; }
  var ARROW = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var XICON = '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* ── show ── */
  var active = null;
  function show(ad, pos) {
    if (active) return;
    var own = W.CabanaAds && W.CabanaAds.claimOverlay;
    if (own && !ad._preview && !W.CabanaAds.claimOverlay('secret')) { why = 'another overlay on screen'; return; }
    css();
    var style = ad.style || (ad.media_url ? 'glass' : 'minimal');
    if (style !== 'glass' && style !== 'photo' && style !== 'minimal') style = 'glass';
    if (style === 'photo' && !url(ad.media_url)) style = 'glass';
    var m = url(ad.media_url), isVid = ad.media_type === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(m);
    var media = m ? (isVid ? '<video class="csa-media" src="' + esc(m) + '"' + (url(ad.poster_url) ? ' poster="' + esc(url(ad.poster_url)) + '"' : '') + ' muted ' + (REDUCE ? '' : 'autoplay ') + 'loop playsinline></video>'
      : '<img class="csa-media" src="' + esc(m) + '" alt="" onerror="this.remove()"/>') : '';
    var wrap = D.createElement('aside');
    wrap.className = 'csa csa-' + pos + ' csa-' + style;
    wrap.setAttribute('role', 'complementary');
    wrap.setAttribute('aria-label', 'Sponsored: ' + (ad.advertiser || 'advertisement'));
    wrap.style.setProperty('--csa-bg', bg(ad.theme_gradient));
    wrap.style.setProperty('--csa-accent', /^#[0-9a-f]{3,8}$/i.test(ad.accent || '') ? ad.accent : '#fff');
    var body = '<div class="csa-body"><div class="csa-ad">Sponsored' + (ad.advertiser ? ' · ' + esc(ad.advertiser) : '') + '</div>' +
      (ad.headline ? '<p class="csa-h">' + esc(ad.headline) + '</p>' : '') + (ad.sub_text ? '<p class="csa-s">' + esc(ad.sub_text) + '</p>' : '') +
      '<button type="button" class="csa-cta">' + esc(ad.cta_text || 'View') + ARROW + '</button></div>';
    wrap.innerHTML = '<div class="csa-card" tabindex="-1">' +
      (style === 'glass' ? '<div class="csa-thumb">' + media + '</div>' + body : style === 'photo' ? media + body : body) +
      '<button type="button" class="csa-x" aria-label="Dismiss">' + XICON + '</button>' +
      '<div class="csa-prog"></div>' + (ad._preview ? '<span class="csa-pv">Preview</span>' : '') + '</div>';
    D.body.appendChild(wrap);
    active = { ad: ad, el: wrap, at: Date.now(), pos: pos, timer: null, imp: null };
    lastShownSet();

    var card = wrap.querySelector('.csa-card'), prog = wrap.querySelector('.csa-prog');
    card.addEventListener('click', function (e) { if (e.target.closest('.csa-x')) return; click(ad); });
    wrap.querySelector('.csa-x').addEventListener('click', function (e) { e.stopPropagation(); dismiss(ad); });
    active.key = function (e) { if (e.key === 'Escape') dismiss(ad); };
    D.addEventListener('keydown', active.key);
    W.requestAnimationFrame(function () { W.requestAnimationFrame(function () { wrap.classList.add('in'); }); });

    active.imp = setTimeout(function () {
      if (!active || active.ad !== ad) return;
      bump(ad.id); counter('increment_shadow_impression', ad.id); logEvent(ad, 'viewable', null, pos);
      if (!ad._preview) health('live', 'Shown at ' + pos + ' after ' + Math.round(visibleMs / 1000) + 's.', ad.id);
    }, 900);

    var ms = Math.max(4, ad.dwell_show_s || 8) * 1000;
    function run(t) {
      if (!prog || REDUCE) return;
      prog.style.transition = 'none'; prog.style.transform = 'scaleX(1)';
      W.requestAnimationFrame(function () { prog.style.transition = 'transform ' + t + 'ms linear'; prog.style.transform = 'scaleX(0)'; });
    }
    run(ms);
    active.timer = setTimeout(function () { retract(ad); }, ms);
    function hold() { if (active && active.timer) { clearTimeout(active.timer); active.timer = null; if (prog) { prog.style.transition = 'none'; } } }
    function release() { if (active && !active.timer) { run(3500); active.timer = setTimeout(function () { retract(ad); }, 3500); } }
    wrap.addEventListener('mouseenter', hold); wrap.addEventListener('mouseleave', release);
    wrap.addEventListener('focusin', hold); wrap.addEventListener('focusout', release);
  }
  function lastShownSet() { safe(function () { sessionStorage.setItem(LAST, String(Date.now())); }); }
  function teardown() {
    if (!active) return;
    var a = active; active = null;
    clearTimeout(a.timer); clearTimeout(a.imp);
    if (a.key) D.removeEventListener('keydown', a.key);
    a.el.classList.remove('in');
    setTimeout(function () { if (a.el.parentNode) a.el.parentNode.removeChild(a.el); }, 650);
    if (W.CabanaAds && W.CabanaAds.releaseOverlay) W.CabanaAds.releaseOverlay('secret');
    lastShownSet();
  }
  function retract(ad) { if (!active || active.ad !== ad) return; logEvent(ad, 'ignore', Date.now() - active.at, active.pos); teardown(); }
  function dismiss(ad) {
    if (!active || active.ad !== ad) return;
    counter('increment_shadow_dismiss', ad.id); logEvent(ad, 'dismiss', Date.now() - active.at, active.pos);
    if (!ad._preview) safe(function () { sessionStorage.setItem(QUIET, '1'); });
    teardown();
  }
  function click(ad) {
    var dwell = active ? Date.now() - active.at : 0, pos = active ? active.pos : 'auto';
    counter('increment_shadow_click', ad.id); logEvent(ad, 'click', dwell, pos);
    var href = url(ad.cta_url);
    teardown();
    if (!href || ad._preview) return;
    if (/^https?:\/\//i.test(href) && href.indexOf(W.location.host) === -1) W.open(href, '_blank', 'noopener');
    else W.location.href = href;
  }

  /* ── engine ── */
  var iv = null, started = false;
  function tick() {
    measure();
    if (active || quiet() || D.hidden || !POOL.length) return;
    var gap = Math.min.apply(null, POOL.map(function (a) { return (a.cooldown_s || 90) * 1000; }));
    if (Date.now() - lastShown() < Math.max(gap, 20000)) { why = 'cooling down'; return; }
    var b = busy(); if (b) { why = b; return; }
    var ad = pick();
    if (ad) show(ad, place(ad));
  }
  function start(pool) {
    POOL = (pool || []).filter(function (a) { return a && a.id != null; });
    if (!POOL.length) { health('empty', 'No live secret ad targets this page.'); return; }
    if (started) return; started = true;
    learnArea();
    iv = setInterval(function () { safe(tick); }, 1500);
    W.addEventListener('scroll', function () { measure(); }, { passive: true, capture: true });
    D.addEventListener('visibilitychange', function () { lastTick = Date.now(); if (D.hidden && active) teardown(); });
    W.addEventListener('pagehide', function () {
      if (active) logEvent(active.ad, 'ignore', Date.now() - active.at, active.pos);
      else if (!hb || hb.indexOf('live') !== 0) health('deferred', 'Not shown on this visit: ' + why + '.');
    });
  }

  /* Pool: handed over by the ad engine (one request for the whole page),
     or fetched here when a page includes this script on its own. */
  function boot() {
    if (PREVIEW_JSON) return previewFromUrl();
    var ready = W.__CABANA_SHADOW;
    if (ready) { if (ready.enabled === false) return health('off', 'Secret ads are switched off in the rules.'); return start(ready.pool); }
    var handed = false;
    W.addEventListener('cabana-ads:shadow', function (e) { if (handed) return; handed = true; var d = e.detail || {}; if (d.enabled === false) health('off', 'Secret ads are switched off in the rules.'); else start(d.pool); });
    setTimeout(function () {
      if (handed || W.__CABANA_SHADOW) { if (!handed && W.__CABANA_SHADOW) { handed = true; start(W.__CABANA_SHADOW.pool); } return; }
      handed = true;
      fetch(SUPA_URL + '/rest/v1/rpc/ads_bundle', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }, body: JSON.stringify({ p_page: PAGE }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (b) { if (!b) return; var st = b.settings && b.settings.shadow; if (st && st.enabled === false) return health('off', 'Secret ads are switched off in the rules.'); start(b.shadow || []); })
        .catch(function () {});
    }, 6000);
  }

  function previewAd(ad, pos) {
    ad = Object.assign({ id: 'preview', dwell_show_s: 25, max_per_session: 99 }, ad || {}, { _preview: true });
    if (active) teardown();
    show(ad, pos || place(ad));
  }
  function previewFromUrl() {
    var ad = safe(function () { return JSON.parse(PREVIEW_JSON); }, null);
    if (ad) setTimeout(function () { previewAd(ad); }, 1200);
  }
  W.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'apa_shadow_preview' || e.origin !== W.location.origin) return;
    safe(function () { previewAd(e.data.ad, e.data.position); });
  });

  if (!PREVIEW_ONLY) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot(); }

  W.ApaShadow = {
    version: 3,
    reload: function () { started = false; if (iv) clearInterval(iv); boot(); },
    stop: function () { if (iv) clearInterval(iv); teardown(); started = false; },
    preview: previewAd,
    status: function () { measure(); return { page: PAGE, pool: POOL.length, dwell_s: Math.round(visibleMs / 1000), scroll: Math.round(maxScroll), area: area, waiting_on: why, quiet: quiet(), active: active && active.ad.id }; },
    _pool: function () { return POOL.slice(); }
  };
})(window);
