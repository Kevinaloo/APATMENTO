/* ═══════════════════════════════════════════════════════════════════
   CABANA · AD ENGINE v4   (file name kept: every page already loads it)
   ───────────────────────────────────────────────────────────────────
   One engine for every inline ad on Cabana. It reads WHERE ads may go
   from apa-ad-registry.js and WHAT runs from the database, then places
   units under rules that protect the service itself:

     · Never the first thing a visitor sees on a service page. Units
       mount lazily, below the fold, only once the visitor is moving.
     · Never stacked. A page carries a small budget of units, each with
       a long stretch of real content between it and the next.
     · Never pushing what someone is reading. Units open below the
       viewport, so nothing on screen jumps.
     · Never silent when broken. Every slot reports what happened to it
       (live, house, empty, missing anchor, blocked by a rule) to the
       console, so a redesign that drops a slot is seen the same day.
     · Never dark because of the network. The last good answer is kept
       and used when the database cannot be reached.

   Tracking is honest: `impression` when a creative is actually shown,
   `viewable` at 50% on screen for 1s (2s for video), `click` on click.
   ═══════════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';
  if (W.CabanaAds && W.CabanaAds.version) return;

  var D = W.document;
  var VERSION = '4.0.0';
  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  function safe(fn, fb) { try { return fn(); } catch (e) { return fb; } }
  var LS = { get: function (k) { return safe(function () { return W.localStorage.getItem(k); }, null); },
             set: function (k, v) { safe(function () { W.localStorage.setItem(k, v); }); } };
  var SS = { get: function (k) { return safe(function () { return W.sessionStorage.getItem(k); }, null); },
             set: function (k, v) { safe(function () { W.sessionStorage.setItem(k, v); }); } };

  var QS = safe(function () { return new URLSearchParams(W.location.search); }, null);
  var DEBUG = (QS && QS.get('ads_debug') === '1') || LS.get('cads-debug') === '1';
  function log() { if (DEBUG && W.console) W.console.log.apply(W.console, ['[cabana-ads]'].concat([].slice.call(arguments))); }

  var REDUCED = safe(function () { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; }, false);
  var DEVICE = /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  var VID = safe(function () {
    var v = W.localStorage.getItem('apt_vid');
    if (!v) { v = 'V' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); W.localStorage.setItem('apt_vid', v); }
    return v;
  }, 'V0');

  /* ── helpers ─────────────────────────────────────────────────── */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function lines(v) { return esc(v).replace(/\r?\n/g, '<br/>'); }
  function plain(v) { return String(v == null ? '' : v).replace(/<[^>]*>/g, ''); }
  function mediaUrl(u) {
    u = String(u || '').trim();
    if (!u || /youtu\.?be/i.test(u)) return '';
    if (/^https?:\/\//i.test(u) || u.charAt(0) === '/') return u;
    return '';
  }
  function cssBg(v, fb) {
    v = String(v || '').trim();
    return /^(linear|radial|conic)-gradient\([#(),.%\sa-z0-9-]+\)$/i.test(v) || /^#[0-9a-f]{3,8}$/i.test(v) ? v : fb;
  }
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function rafThrottle(fn) { var q = false; return function () { if (q) return; q = true; W.requestAnimationFrame(function () { q = false; fn(); }); }; }

  var ICON = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };

  /* ── HOUSE CREATIVES ─────────────────────────────────────────────
     Cabana's own promos. They fill end-of-page slots when nobody has
     bought them, so a slot never collapses into an awkward gap. They
     are never billed and never placed inside results.               */
  var HOUSE = [
    { id: 'house_stays', advertiser: 'Cabana Stays', headline: 'Find your perfect space.', sub_text: 'Apartments, villas and studios. Hosts keep 100% of what they charge.',
      cta_text: 'Browse stays', cta_url: '/apartments', theme_gradient: 'linear-gradient(135deg,#6D28FF,#4F6DFF)' },
    { id: 'house_tours', advertiser: 'Cabana Tours', headline: 'Days you will never forget.', sub_text: 'Safaris, treks and city days, run by guides who keep every shilling.',
      cta_text: 'Explore tours', cta_url: '/tours', theme_gradient: 'linear-gradient(135deg,#0E9F8E,#4F6DFF)' },
    { id: 'house_events', advertiser: 'Cabana Events', headline: 'Face-value tickets. Nothing added.', sub_text: 'Concerts, festivals and match days at exactly the organiser’s price.',
      cta_text: 'Get tickets', cta_url: '/events', theme_gradient: 'linear-gradient(135deg,#7B2FF7,#FF6A3C)' },
    { id: 'house_list', advertiser: 'Cabana', headline: 'Your place could be earning.', sub_text: 'List free. Zero commission. Keep 100% of every booking.',
      cta_text: 'List for free', cta_url: '/add-listing', theme_gradient: 'linear-gradient(135deg,#0A0A14,#2B0F6F)' }
  ].map(function (h) { h._house = true; h.format = 'window'; h.status = 'live'; return h; });

  /* ── CSS ─────────────────────────────────────────────────────── */
  var CSS = [
    '.cads-band{position:relative;max-width:1180px;margin:clamp(34px,6vw,64px) auto;padding:0 clamp(16px,4vw,26px);box-sizing:border-box;}',
    '.cads-band.cads-inherit{max-width:none;padding:0;margin:22px 0;}',
    '.cads-bare{position:relative;}',
    '.cads,.cads *{box-sizing:border-box;}',
    '.cads{position:relative;font-family:"Geist","Inter",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;opacity:0;transform:translateY(14px);transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1);}',
    '.cads.in{opacity:1;transform:none;}',
    '.cads a{color:inherit;text-decoration:none;}',
    '.cads a.cads-cta{color:#0A0A14;}',
    '.cads-lbl{display:flex;align-items:center;gap:7px;margin:0 0 10px;font:600 10.5px/1 "Geist","Inter",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8E90AD;}',
    '.cads-lbl i{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.55;}',
    '.cads-lbl b{font-weight:600;color:#5A5C78;letter-spacing:.08em;}',
    '.cads-chip{position:absolute;top:14px;left:14px;z-index:4;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;background:rgba(10,10,20,.34);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);color:#fff;font:650 10px/1.2 "Geist","Inter",sans-serif;letter-spacing:.1em;text-transform:uppercase;}',
    '.cads-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;border:0;transition:opacity .45s ease;}',
    '.cads-cta{display:inline-flex;align-items:center;gap:9px;padding:12px 22px;border-radius:99px;background:#fff;color:#0A0A14;font:700 13.5px/1 "Geist","Inter",sans-serif;border:0;cursor:pointer;white-space:nowrap;box-shadow:0 6px 22px rgba(0,0,0,.22);transition:transform .25s,box-shadow .25s;}',
    '.cads-cta svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s;}',
    '.cads-cta:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.3);}.cads-cta:hover svg{transform:translateX(3px);}',
    '.cads-cta:focus-visible,.cads-hit:focus-visible{outline:3px solid #7B5CFF;outline-offset:3px;}',
    '.cads-ibtn{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(10,10,20,.38);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);color:#fff;cursor:pointer;padding:0;}',
    '.cads-ibtn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.cads-hit{position:absolute;inset:0;z-index:2;cursor:pointer;border-radius:inherit;}',

    /* stage: window + video banner */
    '.cads-stage{position:relative;border-radius:24px;overflow:hidden;background:#12122A;aspect-ratio:16/9;max-height:min(66vh,620px);width:100%;box-shadow:0 22px 60px rgba(10,10,20,.16);isolation:isolate;}',
    '.cads-stage.v-video{aspect-ratio:21/9;}',
    '.cads-stage::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(6,6,16,.28) 0%,rgba(6,6,16,0) 26%,rgba(6,6,16,0) 44%,rgba(6,6,16,.72) 100%);}',
    '.cads-stage-body{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:clamp(18px,3.2vw,42px);display:flex;align-items:flex-end;justify-content:space-between;gap:18px;pointer-events:none;}',
    '.cads-stage-body>*{pointer-events:auto;}',
    '.cads-stage-copy{min-width:0;max-width:640px;}',
    '.cads-adv{font:600 12px/1.2 "Geist","Inter",sans-serif;color:rgba(255,255,255,.78);margin-bottom:8px;letter-spacing:.02em;}',
    '.cads-h{font:500 clamp(21px,3.2vw,40px)/1.06 "Geist","Inter",sans-serif;letter-spacing:-.025em;color:#fff;margin:0 0 8px;text-shadow:0 2px 24px rgba(0,0,0,.28);}',
    '.cads-sub{font:400 clamp(12.5px,1.3vw,14.5px)/1.5 "Inter",sans-serif;color:rgba(255,255,255,.84);margin:0;max-width:520px;}',
    '.cads-ctrl{position:absolute;top:12px;right:12px;z-index:4;display:flex;gap:8px;}',
    '.cads-segs{position:absolute;left:14px;right:14px;bottom:10px;z-index:4;display:flex;gap:5px;pointer-events:none;}',
    '.cads-segs i{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.28);overflow:hidden;position:relative;}',
    '.cads-segs i b{position:absolute;inset:0;width:0;background:#fff;border-radius:3px;}',
    '.cads-segs i.done b{width:100%;}',
    '@media(max-width:640px){.cads-stage,.cads-stage.v-video{aspect-ratio:4/5;max-height:72vh;border-radius:20px;}.cads-stage-body{flex-direction:column;align-items:flex-start;}.cads-h{font-size:24px;}.cads-sub{font-size:13px;}}',
    '.cads-bare .cads-stage{border-radius:20px;max-height:none;}',

    /* carousel */
    '.cads-car{position:relative;border-radius:22px;overflow:hidden;min-height:176px;background:#15152E;box-shadow:0 14px 44px rgba(10,10,20,.12);}',
    '.cads-slide{position:absolute;inset:0;display:flex;align-items:center;gap:22px;padding:22px clamp(20px,4vw,48px);opacity:0;transform:translateX(26px);transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1);pointer-events:none;}',
    '.cads-slide.on{opacity:1;transform:none;pointer-events:auto;}',
    '.cads-slide::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(6,6,16,.72) 0%,rgba(6,6,16,.34) 55%,rgba(6,6,16,.08) 100%);}',
    '.cads-slide .cads-media{z-index:0;}',
    '.cads-slide-copy{position:relative;z-index:3;flex:1;min-width:0;}',
    '.cads-slide-copy .cads-adv{margin-bottom:4px;}',
    '.cads-slide-h{font:500 clamp(17px,2.3vw,24px)/1.12 "Geist","Inter",sans-serif;letter-spacing:-.02em;color:#fff;margin:0 0 4px;}',
    '.cads-slide-s{font:400 12.5px/1.45 "Inter",sans-serif;color:rgba(255,255,255,.82);margin:0;}',
    '.cads-slide .cads-cta{position:relative;z-index:3;}',
    '.cads-dots{position:absolute;bottom:11px;left:50%;transform:translateX(-50%);z-index:4;display:flex;gap:6px;}',
    '.cads-dots button{width:6px;height:6px;border-radius:3px;border:0;padding:0;background:rgba(255,255,255,.38);cursor:pointer;transition:width .35s,background .35s;}',
    '.cads-dots button.on{width:22px;background:#fff;}',
    '.cads-car .cads-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;}',
    '.cads-car .cads-nav.p{left:10px;}.cads-car .cads-nav.n{right:10px;}',
    '@media(max-width:640px){.cads-car{min-height:0;height:auto;}.cads-slide{position:relative;display:none;flex-direction:column;align-items:flex-start;gap:12px;min-height:200px;justify-content:flex-end;padding:44px 18px 30px;}.cads-slide.on{display:flex;}.cads-slide .cads-cta{width:100%;justify-content:center;}.cads-car .cads-nav{display:none;}}',

    /* split */
    '.cads-split{display:grid;grid-template-columns:1.05fr 1fr;border-radius:26px;overflow:hidden;min-height:280px;box-shadow:0 20px 60px rgba(10,10,20,.12);position:relative;}',
    '.cads-split-l{position:relative;z-index:3;padding:clamp(26px,4vw,52px);display:flex;flex-direction:column;justify-content:center;color:#fff;}',
    '.cads-split-l .cads-h{font-size:clamp(22px,2.8vw,34px);}',
    '.cads-split-l .cads-cta{align-self:flex-start;margin-top:22px;}',
    '.cads-split-r{position:relative;min-height:220px;overflow:hidden;}',
    '.cads-tagline{display:inline-flex;align-self:flex-start;align-items:center;gap:6px;margin-bottom:14px;padding:5px 12px;border-radius:99px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);font:650 10px/1.2 "Geist","Inter",sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.9);}',
    '.cads-stats{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:30px;align-content:center;}',
    '.cads-stats div{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:16px;text-align:center;color:#fff;}',
    '.cads-stats b{display:block;font:600 24px/1.1 "Geist",sans-serif;margin-bottom:4px;}.cads-stats span{font:500 11px/1.3 "Inter",sans-serif;opacity:.75;}',
    '@media(max-width:720px){.cads-split{grid-template-columns:1fr;}.cads-split-r{min-height:200px;}}',

    /* native card */
    '.cads-native{position:relative;border-radius:20px;overflow:hidden;background:#fff;border:1px solid rgba(10,10,20,.07);box-shadow:0 6px 24px rgba(10,10,20,.06);transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s;display:flex;flex-direction:column;height:100%;min-width:0;}',
    '.cads-native:hover{transform:translateY(-4px);box-shadow:0 22px 50px rgba(79,52,200,.16);}',
    '.cads-native-m{position:relative;aspect-ratio:4/3;overflow:hidden;background:#15152E;}',
    '.cads-native-b{padding:14px 16px 16px;display:flex;flex-direction:column;gap:4px;flex:1;}',
    '.cads-native-who{font:600 10.5px/1.3 "Geist","Inter",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8E90AD;display:flex;justify-content:space-between;gap:8px;}',
    '.cads-native-h{font:600 16px/1.25 "Geist","Inter",sans-serif;color:#0A0A14;letter-spacing:-.01em;margin:2px 0 0;}',
    '.cads-native-s{font:400 12.5px/1.5 "Inter",sans-serif;color:#4A4C66;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.cads-native-f{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;}',
    '.cads-native-p{font:600 14px/1.2 "Geist",sans-serif;color:#0A0A14;}',
    '.cads-native a.cads-cta{padding:9px 16px;font-size:12px;color:#fff;background:#0A0A14;box-shadow:none;}',
    '.cads-infeed{min-width:0;}',
    '.cads-infeed.wide{grid-column:1/-1;flex:1 0 100%;width:100%;margin:6px 0;}',

    /* ticker */
    '.cads-tick{display:flex;align-items:center;height:46px;border-radius:14px;overflow:hidden;background:#0A0A14;border:1px solid rgba(255,255,255,.08);}',
    '.cads-tick-b{flex:none;height:100%;display:flex;align-items:center;padding:0 14px;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;font:700 10.5px/1 "Geist",sans-serif;letter-spacing:.12em;text-transform:uppercase;}',
    '.cads-tick-t{flex:1;overflow:hidden;}',
    '.cads-tick-in{display:inline-flex;white-space:nowrap;animation:cadsTick 42s linear infinite;}',
    '.cads-tick-in span{padding:0 26px;color:rgba(255,255,255,.82);font:500 13px/46px "Inter",sans-serif;}',
    '.cads-tick:hover .cads-tick-in{animation-play-state:paused;}',
    '@keyframes cadsTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}',

    /* sticky corner */
    '.cads-sticky{position:fixed;right:22px;bottom:calc(22px + var(--cbn-corner-claim, 0px));z-index:9000;width:310px;max-width:calc(100vw - 24px);border-radius:20px;overflow:hidden;color:#fff;box-shadow:0 26px 70px rgba(10,10,20,.28);transform:translateY(calc(100% + 40px));opacity:0;transition:transform .6s cubic-bezier(.34,1.4,.64,1),opacity .4s;}',
    '.cads-sticky.show{transform:none;opacity:1;}',
    '.cads-sticky-in{position:relative;padding:18px 18px 16px;}',
    '.cads-sticky .cads-adv{font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;}',
    '.cads-sticky-h{font:600 15px/1.25 "Geist",sans-serif;margin:0 0 4px;}',
    '.cads-sticky-s{font:400 12.5px/1.45 "Inter",sans-serif;opacity:.85;margin:0 0 12px;}',
    '.cads-sticky .cads-cta{width:100%;justify-content:center;padding:10px 16px;font-size:12.5px;}',
    '.cads-sticky .cads-x{position:absolute;top:10px;right:10px;width:28px;height:28px;}',
    '@media(max-width:640px){.cads-sticky{right:12px;left:12px;width:auto;bottom:calc(84px + var(--cbn-corner-claim, 0px));}}',

    '.cads-pv{position:absolute;top:14px;right:14px;z-index:6;padding:5px 10px;border-radius:99px;background:#FFB020;color:#231500;font:700 10px/1 "Geist",sans-serif;letter-spacing:.1em;text-transform:uppercase;}',
    /* narrow containers (side panels, grid cells) get the phone layout whatever the screen */
    '.cads-car,.cads-stage,.cads-split{container-type:inline-size;}',
    '@container (max-width:560px){.cads-slide{position:relative;display:none;flex-direction:column;align-items:flex-start;gap:12px;min-height:200px;justify-content:flex-end;padding:44px 18px 30px;}.cads-slide.on{display:flex;}.cads-slide .cads-cta{width:100%;justify-content:center;}.cads-nav{display:none!important;}.cads-stage-body{flex-direction:column;align-items:flex-start;}.cads-h{font-size:22px;}.cads-split-l{padding:24px;}}',
    '@media(prefers-reduced-motion:reduce){.cads,.cads-slide,.cads-sticky{transition:none!important;}.cads-tick-in{animation:none!important;}}'
  ].join('\n');

  function injectCSS() {
    if (D.getElementById('cads-css')) return;
    var s = D.createElement('style'); s.id = 'cads-css'; s.textContent = CSS; (D.head || D.documentElement).appendChild(s);
  }

  /* ── STATE ───────────────────────────────────────────────────── */
  var REG = null, PAGE = 'index', SURF = null, S = null, BUNDLE = null, SOURCE = 'none';
  var PREVIEW = null;             // { campaign, slot }
  var units = [];                 // mounted inline units
  var reports = {};               // slot id → { slot, format, state, campaign, detail }
  var usedOnPage = {};            // campaign id → true
  var userMoved = false;
  var overlayOwner = null;
  var booted = false;

  /* ── NETWORK ─────────────────────────────────────────────────── */
  function rpc(fn, body, opts) {
    opts = opts || {};
    var ctl = W.AbortController ? new AbortController() : null;
    var t = ctl && opts.timeout ? setTimeout(function () { ctl.abort(); }, opts.timeout) : null;
    return fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST', keepalive: !!opts.keepalive, signal: ctl ? ctl.signal : undefined,
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.status === 204 ? null : r.json();
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }

  var CACHE_TTL = 3 * 60 * 1000, CACHE_MAX = 72 * 3600 * 1000;
  function cacheKey(page) { return 'cads:v4:' + page; }
  function readCache(page) { var o = safe(function () { return JSON.parse(LS.get(cacheKey(page)) || 'null'); }, null); return o && o.data ? o : null; }
  function writeCache(page, data) { LS.set(cacheKey(page), JSON.stringify({ at: Date.now(), data: data })); }

  function bundle(page) {
    var c = readCache(page), age = c ? Date.now() - c.at : Infinity;
    function fresh() { return rpc('ads_bundle', { p_page: page }, { timeout: 4500 }).then(function (d) { if (d && typeof d === 'object') writeCache(page, d); return d; }); }
    if (c && age < CACHE_TTL) {
      if (age > 45000) fresh().catch(function () {});
      SOURCE = 'cache'; return Promise.resolve(c.data);
    }
    return fresh().then(function (d) { SOURCE = 'network'; return d; }, function (e) {
      log('bundle failed', e && e.message);
      if (c && age < CACHE_MAX) { SOURCE = 'stale-cache'; return c.data; }
      SOURCE = 'offline'; return null;
    });
  }

  /* ── TRACKING ────────────────────────────────────────────────── */
  var sent = {};
  function track(c, ev, slotId) {
    if (!c || c._house || c._preview || PREVIEW) return;
    var key = ev + '|' + c.id + '|' + slotId;
    if ((ev === 'impression' || ev === 'viewable') && sent[key]) return;
    sent[key] = 1;
    rpc('ad_track', { p_campaign: String(c.id), p_event: ev, p_page: PAGE, p_slot: slotId, p_visitor: VID, p_device: DEVICE }, { keepalive: true }).catch(function () {});
    safe(function () { if (W.gtag) W.gtag('event', 'ad_' + ev, { campaign_id: c.campaign_id || c.id, advertiser: c.advertiser, slot: slotId, page: PAGE }); });
  }

  /* IAB viewability, per creative: 50% of the unit on screen for 1s
     (2s for video). `current` returns what the unit is showing now,
     because rotating units show several creatives. */
  function watchView(node, current, slotId) {
    if (!W.IntersectionObserver) return;
    var timer = null, ratio = 0, heldFor = 0, lastCamp = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (timer) return;
      timer = setInterval(function () {
        if (D.hidden || ratio < 0.5) return;
        var c = current(); if (!c) return;
        if (c !== lastCamp) { lastCamp = c; heldFor = 0; }
        heldFor += 250;
        if (heldFor >= (REG.isVideo(c) ? 2000 : 1000)) track(c, 'viewable', slotId);
      }, 250);
    }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { ratio = e.intersectionRatio; if (ratio >= 0.5) start(); else { stop(); heldFor = 0; } });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] }).observe(node);
    safe(function () {
      if (W.ApaSignal && W.ApaSignal.watchAd) {
        var c0 = current();
        W.ApaSignal.watchAd(node, { format: node.getAttribute('data-showcase') || 'unit', slot: PAGE + ':' + (node.getAttribute('data-showcase') || 'unit'),
          campaign_id: c0 && !c0._house ? String(c0.id) : PAGE + ':' + slotId, advertiser: c0 ? c0.advertiser : null });
      }
    });
  }

  function go(c, slotId, ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    track(c, 'click', slotId);
    var href = REG.safeHref(c.cta_url);
    if (!href || PREVIEW) return;
    var ext = /^https?:\/\//i.test(href) && href.indexOf(W.location.host) === -1;
    if (ext) W.open(href, '_blank', 'noopener');
    else W.location.href = href;
  }

  /* ── HEALTH REPORTS ──────────────────────────────────────────── */
  function report(sl, state, extra) {
    var prev = reports[sl.id];
    var r = { slot: sl.id, format: (extra && extra.format) || (prev && prev.format) || sl.formats[0], state: state,
      campaign: (extra && extra.campaign) || null, detail: (extra && extra.detail) || null };
    reports[sl.id] = r;
    log('slot', sl.id, state, r.detail || r.campaign || '');
  }
  var hbSent = '';
  function flushHealth(final) {
    if (PREVIEW || !SURF) return;
    var list = Object.keys(reports).map(function (k) { return reports[k]; });
    if (!list.length) return;
    var sig = JSON.stringify(list.map(function (r) { return [r.slot, r.state, r.campaign, r.detail]; }));
    if (sig === hbSent) return;
    var key = 'cads:hb:' + PAGE, last = safe(function () { return JSON.parse(LS.get(key) || 'null'); }, null);
    if (last && last.sig === sig && Date.now() - last.at < 10 * 60 * 1000) { hbSent = sig; return; }
    hbSent = sig;
    LS.set(key, JSON.stringify({ sig: sig, at: Date.now() }));
    rpc('ad_heartbeat', { p_page: PAGE, p_reports: list }, { keepalive: !!final }).catch(function () {});
  }

  /* ── POLICY: budget, spacing, fold ───────────────────────────── */
  function docTop(node) { var r = node.getBoundingClientRect(); return r.top + (W.pageYOffset || D.documentElement.scrollTop || 0); }
  function roomFor(anchorTop, estH, locked) {
    if (locked) return null;
    var inline = units.filter(function (u) { return u.node.isConnected; });
    units = inline;
    if (inline.length >= S.max_units) return 'the page already carries ' + S.max_units + ' ad units';
    for (var i = 0; i < inline.length; i++) {
      var t = docTop(inline[i].node), b = t + inline[i].node.offsetHeight;
      var gap = anchorTop >= b ? anchorTop - b : (anchorTop + estH <= t ? t - (anchorTop + estH) : -1);
      if (gap < S.min_gap) return 'too close to another ad unit (' + Math.max(0, Math.round(gap)) + 'px apart, rule is ' + S.min_gap + 'px)';
    }
    return null;
  }
  function foldClear(node) {
    if (!S.fold_guard || !SURF || !SURF.service) return true;
    var r = node.getBoundingClientRect(), vh = W.innerHeight || 800;
    if (r.bottom < 0) return false;            // above the viewport: opening it would shift the page
    if (!userMoved) return r.top >= vh;        // first screen stays ad-free
    return r.top >= vh * 0.55;                 // open below what they are reading
  }

  var pending = [];
  function whenReady(node, attempt, force) {
    var done = false;
    function tryIt() {
      if (done || !node.isConnected) return;
      if (!force && !foldClear(node)) return;
      var ok = attempt();
      if (ok !== false) { done = true; pending = pending.filter(function (p) { return p !== tryIt; }); }
    }
    pending.push(tryIt);
    if (W.IntersectionObserver) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) tryIt(); }); },
        { rootMargin: '0px 0px 700px 0px' }).observe(node);
    } else setTimeout(tryIt, 1500);
  }
  var recheck = rafThrottle(function () { pending.slice().forEach(function (fn) { fn(); }); });
  function onMove(e) {
    if (!userMoved) {
      var t = e && e.target;
      var inner = t && t !== D && t !== W && t !== D.documentElement && t !== D.body;
      if ((W.pageYOffset || 0) > 60 || (inner && t.scrollTop > 60)) userMoved = true;
    }
    recheck();
  }

  /* ── SELECTION ───────────────────────────────────────────────── */
  function rotate(list, slotId) {
    if (list.length < 2) return list;
    var k = 'cads:rot:' + slotId, n = parseInt(SS.get(k) || '0', 10) || 0;
    SS.set(k, String(n + 1));
    // Weighted: higher priority appears more often at the front.
    var weighted = [];
    list.forEach(function (x, i) { var w = Math.max(1, Math.round(((x.c.priority || 5) + 1) / 2)); for (var j = 0; j < w; j++) weighted.push(i); });
    var first = weighted[n % weighted.length];
    return list.slice(first).concat(list.slice(0, first));
  }
  function pick(sl, max, opts) {
    opts = opts || {};
    if (PREVIEW && PREVIEW.slot === sl.id) return [{ c: PREVIEW.campaign, fit: 'exact' }];
    var all = REG.candidates((BUNDLE && BUNDLE.campaigns) || [], sl);
    if (opts.only) all = all.filter(function (x) { return opts.only.indexOf(x.c.format) !== -1 || x.fit === 'adapted'; });
    var fresh = all.filter(function (x) { return !usedOnPage[x.c.id]; });
    var base = fresh.length ? fresh : all;
    var exact = base.filter(function (x) { return x.fit === 'exact'; }), adapted = base.filter(function (x) { return x.fit !== 'exact'; });
    return rotate(exact, sl.id).concat(rotate(adapted, sl.id + ':a')).slice(0, max || 1);
  }
  function houseFor(sl) {
    if (!S.house_ads || !sl.house) return [];
    var hs = HOUSE.filter(function (h) { return REG.safeHref(h.cta_url) !== '/' + PAGE && h.cta_url !== '/' + PAGE; });
    var n = (parseInt(SS.get('cads:house') || '0', 10) || 0); SS.set('cads:house', String(n + 1));
    return [{ c: hs[n % hs.length], fit: 'house' }];
  }

  /* ── RENDERERS ───────────────────────────────────────────────── */
  function labelHTML(c) {
    if (c._house) return '<div class="cads-lbl"><i></i>From Cabana</div>';
    return '<div class="cads-lbl"><i></i>Sponsored' + (c.advertiser ? ' · <b>' + esc(c.advertiser) + '</b>' : '') + '</div>';
  }
  function chipText(c) { return c._house ? 'Cabana' : (c.tag && !/^sponsored$/i.test(c.tag) ? plain(c.tag) + ' · Ad' : 'Sponsored'); }
  function chip(c) { return esc(chipText(c)); }

  function mediaNode(c, cls) {
    var u = mediaUrl(c.media_url);
    if (!u) return null;
    var m;
    if (REG.isVideo(c)) {
      m = D.createElement('video');
      m.muted = true; m.defaultMuted = true; m.playsInline = true; m.setAttribute('playsinline', ''); m.setAttribute('muted', '');
      m.preload = 'none'; m.setAttribute('data-src', u);
      var p = mediaUrl(c.poster_url); if (p) m.poster = p;
    } else {
      m = D.createElement('img'); m.alt = ''; m.decoding = 'async'; m.loading = 'lazy'; m.src = u;
      m.onerror = function () { m.style.display = 'none'; };
    }
    m.className = 'cads-media' + (cls ? ' ' + cls : '');
    return m;
  }
  /* Plays only while on screen; never autoplays for reduced motion. */
  function autoplay(host, getVideo) {
    if (!W.IntersectionObserver) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = getVideo(); if (!v) return;
        if (e.intersectionRatio >= 0.3 && !D.hidden) {
          if (!v.src && v.getAttribute('data-src')) { v.src = v.getAttribute('data-src'); v.preload = 'auto'; }
          if (!REDUCED) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        } else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.3, 0.6] }).observe(host);
  }

  /* STAGE: window (16:9) and video banner (21:9). Plays a short
     playlist of advertisers, one after another. */
  function renderStage(host, list, sl, variant, bare) {
    var pool = list.map(function (x) { return x.c; });
    var i = 0, timer = null, visible = false, startAt = 0, IMG_MS = 8000;
    var wrap = el('div', 'cads');
    wrap.setAttribute('data-showcase', variant);
    void bare;
    wrap.innerHTML = labelHTML(pool[0]) +
      '<div class="cads-stage v-' + variant + '" role="group" aria-roledescription="advertisement">' +
      '<span class="cads-chip"></span>' +
      '<a class="cads-hit" href="#" aria-label=""></a>' +
      '<div class="cads-stage-body"><div class="cads-stage-copy"><div class="cads-adv"></div><h3 class="cads-h"></h3><p class="cads-sub"></p></div>' +
      '<a class="cads-cta" href="#"><span></span>' + ICON.arrow + '</a></div>' +
      '<div class="cads-ctrl"></div>' +
      (pool.length > 1 ? '<div class="cads-segs">' + pool.map(function () { return '<i><b></b></i>'; }).join('') + '</div>' : '') +
      '</div>';
    host.appendChild(wrap);
    var stage = wrap.querySelector('.cads-stage'), ctrl = wrap.querySelector('.cads-ctrl');
    var hit = wrap.querySelector('.cads-hit'), cta = wrap.querySelector('.cads-cta');
    var media = null, soundBtn = null, guard = null;
    var segs = [].slice.call(wrap.querySelectorAll('.cads-segs i'));

    function cur() { return pool[i % pool.length]; }
    function paint() {
      var c = cur();
      stage.style.background = cssBg(c.theme_gradient, 'linear-gradient(135deg,#1A1440,#2B0F6F)');
      wrap.querySelector('.cads-chip').textContent = chipText(c);
      wrap.querySelector('.cads-adv').textContent = c.advertiser || '';
      wrap.querySelector('.cads-h').innerHTML = lines(plain(c.headline || c.advertiser || ''));
      var sub = wrap.querySelector('.cads-sub'); sub.textContent = plain(c.sub_text || c.sub || ''); sub.style.display = sub.textContent ? '' : 'none';
      cta.querySelector('span').textContent = c.cta_text || 'Learn more';
      var href = REG.safeHref(c.cta_url); cta.style.display = href || PREVIEW ? '' : 'none';
      cta.setAttribute('href', href || '#'); hit.setAttribute('href', href || '#');
      hit.setAttribute('aria-label', (c.advertiser ? c.advertiser + ': ' : '') + plain(c.headline || '') + ' (advertisement)');
      wrap.querySelector('.cads-lbl').outerHTML = labelHTML(c);
      if (media) { var old = media; old.style.opacity = '0'; setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 460); }
      media = mediaNode(c);
      ctrl.innerHTML = '';
      if (media) {
        stage.insertBefore(media, stage.firstChild);
        if (media.tagName === 'VIDEO') {
          media.loop = pool.length === 1;
          media.addEventListener('ended', next);
          media.addEventListener('error', function () { if (pool.length > 1) setTimeout(next, 800); else if (!media.poster) media.style.display = 'none'; });
          if (pool.length > 1) { clearTimeout(guard); guard = setTimeout(function () { if (visible) next(); }, 45000); }
          media.addEventListener('timeupdate', function () { if (segs[i % pool.length] && media.duration) segs[i % pool.length].firstChild.style.width = (media.currentTime / media.duration * 100) + '%'; });
          if (visible) { media.src = media.getAttribute('data-src'); if (!REDUCED) { var pr = media.play(); if (pr && pr.catch) pr.catch(function () {}); } }
          soundBtn = el('button', 'cads-ibtn', ICON.mute); soundBtn.type = 'button'; soundBtn.setAttribute('aria-label', 'Turn sound on');
          soundBtn.onclick = function (e) { e.preventDefault(); e.stopPropagation(); media.muted = !media.muted; soundBtn.innerHTML = media.muted ? ICON.mute : ICON.sound; soundBtn.setAttribute('aria-label', media.muted ? 'Turn sound on' : 'Mute'); if (!media.muted && media.paused) media.play().catch(function () {}); };
          ctrl.appendChild(soundBtn);
          if (REDUCED) { var pb = el('button', 'cads-ibtn', ICON.play); pb.type = 'button'; pb.setAttribute('aria-label', 'Play video'); pb.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (!media.src) media.src = media.getAttribute('data-src'); media.play().catch(function () {}); }; ctrl.appendChild(pb); }
        }
      }
      segs.forEach(function (s, k) { s.className = k < (i % pool.length) ? 'done' : ''; s.firstChild.style.transition = 'none'; s.firstChild.style.width = k < (i % pool.length) ? '100%' : '0'; });
      if (visible) track(c, 'impression', sl.id);
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (pool.length < 2 || !visible) return;
      var c = cur();
      if (media && media.tagName === 'VIDEO' && !REDUCED) return;       // advances on `ended`
      startAt = Date.now();
      var s = segs[i % pool.length];
      if (s) { s.firstChild.style.transition = 'width ' + IMG_MS + 'ms linear'; W.requestAnimationFrame(function () { s.firstChild.style.width = '100%'; }); }
      timer = setTimeout(next, IMG_MS);
      void c;
    }
    function next() { i = (i + 1) % pool.length; paint(); }

    function click(e) { go(cur(), sl.id, e); }
    hit.addEventListener('click', click); cta.addEventListener('click', click);

    if (W.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var was = visible; visible = e.intersectionRatio >= 0.3 && !D.hidden;
          if (visible && !was) {
            track(cur(), 'impression', sl.id);
            if (media && media.tagName === 'VIDEO') { if (!media.src) media.src = media.getAttribute('data-src'); if (!REDUCED) media.play().catch(function () {}); }
            schedule();
          } else if (!visible && was) { clearTimeout(timer); if (media && media.tagName === 'VIDEO') media.pause(); }
        });
      }, { threshold: [0, 0.3, 0.6] }).observe(stage);
    } else { visible = true; }
    watchView(stage, cur, sl.id);
    paint();
    return wrap;
  }

  function renderCarousel(host, list, sl) {
    var pool = list.map(function (x) { return x.c; });
    var wrap = el('div', 'cads'); wrap.setAttribute('data-showcase', 'carousel');
    var html = labelHTML(pool.length === 1 ? pool[0] : { advertiser: '' }) + '<div class="cads-car" role="group" aria-roledescription="carousel" aria-label="Sponsored">';
    pool.forEach(function (c, k) {
      var href = REG.safeHref(c.cta_url);
      html += '<div class="cads-slide' + (k === 0 ? ' on' : '') + '" data-k="' + k + '" style="background:' + esc(cssBg(c.theme_gradient, 'linear-gradient(135deg,#1A1440,#4F6DFF)')) + '" aria-hidden="' + (k === 0 ? 'false' : 'true') + '">' +
        '<a class="cads-hit" href="' + esc(href || '#') + '" aria-label="' + esc((c.advertiser || '') + ': ' + plain(c.headline || '')) + ' (advertisement)"></a>' +
        '<div class="cads-slide-copy"><div class="cads-adv">' + esc(c.advertiser || '') + ' · ' + (c._house ? 'Cabana' : 'Sponsored') + '</div>' +
        '<h3 class="cads-slide-h">' + lines(plain(c.headline || '')) + '</h3>' +
        (c.sub_text || c.sub ? '<p class="cads-slide-s">' + esc(plain(c.sub_text || c.sub)) + '</p>' : '') + '</div>' +
        (href || PREVIEW ? '<a class="cads-cta" href="' + esc(href || '#') + '"><span>' + esc(c.cta_text || 'Learn more') + '</span>' + ICON.arrow + '</a>' : '') +
        '</div>';
    });
    if (pool.length > 1) {
      html += '<button type="button" class="cads-ibtn cads-nav p" aria-label="Previous">' + ICON.prev + '</button><button type="button" class="cads-ibtn cads-nav n" aria-label="Next">' + ICON.next + '</button>';
      html += '<div class="cads-dots">' + pool.map(function (_, k) { return '<button type="button" aria-label="Show ad ' + (k + 1) + '"' + (k === 0 ? ' class="on"' : '') + '></button>'; }).join('') + '</div>';
    }
    html += '</div>';
    wrap.innerHTML = html;
    host.appendChild(wrap);
    var slides = [].slice.call(wrap.querySelectorAll('.cads-slide'));
    var dots = [].slice.call(wrap.querySelectorAll('.cads-dots button'));
    slides.forEach(function (s, k) { var m = mediaNode(pool[k]); if (m) s.insertBefore(m, s.firstChild); });
    var i = 0, timer = null, visible = false, hover = false;
    function cur() { return pool[i]; }
    function show(k) {
      slides[i].classList.remove('on'); slides[i].setAttribute('aria-hidden', 'true'); if (dots[i]) dots[i].classList.remove('on');
      var v0 = slides[i].querySelector('video'); if (v0) v0.pause();
      i = (k + slides.length) % slides.length;
      slides[i].classList.add('on'); slides[i].setAttribute('aria-hidden', 'false'); if (dots[i]) dots[i].classList.add('on');
      var v = slides[i].querySelector('video');
      if (v && visible) { if (!v.src) v.src = v.getAttribute('data-src'); if (!REDUCED) v.play().catch(function () {}); }
      if (visible) track(cur(), 'impression', sl.id);
      arm();
    }
    function arm() { clearTimeout(timer); if (pool.length > 1 && visible && !hover && !REDUCED) timer = setTimeout(function () { show(i + 1); }, 6500); }
    slides.forEach(function (s, k) { [].slice.call(s.querySelectorAll('a')).forEach(function (a) { a.addEventListener('click', function (e) { go(pool[k], sl.id, e); }); }); });
    dots.forEach(function (d, k) { d.onclick = function () { show(k); }; });
    var pb = wrap.querySelector('.cads-nav.p'), nb = wrap.querySelector('.cads-nav.n');
    if (pb) pb.onclick = function () { show(i - 1); };
    if (nb) nb.onclick = function () { show(i + 1); };
    var car = wrap.querySelector('.cads-car');
    car.addEventListener('mouseenter', function () { hover = true; clearTimeout(timer); });
    car.addEventListener('mouseleave', function () { hover = false; arm(); });
    var sx = 0;
    car.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) show(i + (dx < 0 ? 1 : -1)); }, { passive: true });
    if (W.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var was = visible; visible = e.intersectionRatio >= 0.3 && !D.hidden;
          var v = slides[i].querySelector('video');
          if (visible && !was) { track(cur(), 'impression', sl.id); if (v) { if (!v.src) v.src = v.getAttribute('data-src'); if (!REDUCED) v.play().catch(function () {}); } arm(); }
          else if (!visible && was) { clearTimeout(timer); if (v) v.pause(); }
        });
      }, { threshold: [0, 0.3] }).observe(car);
    }
    watchView(car, cur, sl.id);
    return wrap;
  }

  function renderSplit(host, list, sl) {
    var c = list[0].c, href = REG.safeHref(c.cta_url);
    var wrap = el('div', 'cads'); wrap.setAttribute('data-showcase', 'split');
    wrap.innerHTML = labelHTML(c) +
      '<div class="cads-split" style="background:' + esc(cssBg(c.theme_gradient, 'linear-gradient(135deg,#0A0A14,#2B0F6F)')) + '">' +
      '<a class="cads-hit" href="' + esc(href || '#') + '" aria-label="' + esc((c.advertiser || '') + ': ' + plain(c.headline || '')) + ' (advertisement)"></a>' +
      '<div class="cads-split-l"><span class="cads-tagline">' + chip(c) + '</span>' +
      '<h3 class="cads-h">' + lines(plain(c.headline || '')) + '</h3>' +
      (c.sub_text || c.sub ? '<p class="cads-sub">' + esc(plain(c.sub_text || c.sub)) + '</p>' : '') +
      (href || PREVIEW ? '<a class="cads-cta" href="' + esc(href || '#') + '"><span>' + esc(c.cta_text || 'Learn more') + '</span>' + ICON.arrow + '</a>' : '') + '</div>' +
      '<div class="cads-split-r"></div></div>';
    host.appendChild(wrap);
    var r = wrap.querySelector('.cads-split-r'), m = mediaNode(c);
    if (m) { r.appendChild(m); if (m.tagName === 'VIDEO') { m.loop = true; autoplay(r, function () { return m; }); } }
    else if (c._house) r.innerHTML = '<div class="cads-stats"><div><b>0%</b><span>Commission taken</span></div><div><b>100%</b><span>Earnings kept</span></div><div><b>Free</b><span>To list</span></div><div><b>24/7</b><span>Support</span></div></div>';
    [].slice.call(wrap.querySelectorAll('a')).forEach(function (a) { a.addEventListener('click', function (e) { go(c, sl.id, e); }); });
    var box = wrap.querySelector('.cads-split');
    onceVisible(box, function () { track(c, 'impression', sl.id); });
    watchView(box, function () { return c; }, sl.id);
    return wrap;
  }

  function renderNative(host, list, sl) {
    var c = list[0].c, href = REG.safeHref(c.cta_url);
    var card = el('article', 'cads cads-native'); card.setAttribute('data-showcase', 'native');
    card.setAttribute('aria-label', 'Sponsored: ' + (c.advertiser || ''));
    card.innerHTML = '<div class="cads-native-m" style="background:' + esc(cssBg(c.theme_gradient, 'linear-gradient(135deg,#6D28FF,#4F6DFF)')) + '"><span class="cads-chip">' + chip(c) + '</span></div>' +
      '<a class="cads-hit" href="' + esc(href || '#') + '" aria-label="' + esc((c.advertiser || '') + ': ' + plain(c.headline || '')) + ' (advertisement)"></a>' +
      '<div class="cads-native-b"><div class="cads-native-who"><span>' + esc(c.advertiser || '') + '</span></div>' +
      '<h3 class="cads-native-h">' + esc(plain(c.headline || '')) + '</h3>' +
      (c.sub_text || c.sub ? '<p class="cads-native-s">' + esc(plain(c.sub_text || c.sub)) + '</p>' : '') +
      '<div class="cads-native-f"><span class="cads-native-p">' + esc(c.price_display || '') + '</span>' +
      (href || PREVIEW ? '<a class="cads-cta" href="' + esc(href || '#') + '"><span>' + esc(c.cta_text || 'Learn more') + '</span></a>' : '') + '</div></div>';
    host.appendChild(card);
    var mbox = card.querySelector('.cads-native-m'), m = mediaNode(c);
    if (m) { mbox.insertBefore(m, mbox.firstChild); if (m.tagName === 'VIDEO') { m.loop = true; autoplay(mbox, function () { return m; }); } }
    [].slice.call(card.querySelectorAll('a')).forEach(function (a) { a.style.position = a.classList.contains('cads-hit') ? '' : 'relative'; a.style.zIndex = a.classList.contains('cads-hit') ? '' : '3'; a.addEventListener('click', function (e) { go(c, sl.id, e); }); });
    onceVisible(card, function () { track(c, 'impression', sl.id); });
    watchView(card, function () { return c; }, sl.id);
    return card;
  }

  function renderTicker(host, list, sl) {
    var c = list[0].c, parts = String(c.headline || '').split('·').map(function (t) { return t.trim(); }).filter(Boolean);
    var line = parts.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var wrap = el('div', 'cads'); wrap.setAttribute('data-showcase', 'ticker');
    wrap.innerHTML = '<div class="cads-tick"><span class="cads-tick-b">' + (c._house ? 'Cabana' : 'Ad') + '</span><div class="cads-tick-t"><div class="cads-tick-in">' + line + line + '</div></div></div>';
    host.appendChild(wrap);
    wrap.addEventListener('click', function (e) { go(c, sl.id, e); });
    onceVisible(wrap, function () { track(c, 'impression', sl.id); });
    return wrap;
  }

  function onceVisible(node, fn) {
    if (!W.IntersectionObserver) { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.intersectionRatio >= 0.3) { io.disconnect(); fn(); } }); }, { threshold: [0, 0.3] });
    io.observe(node);
  }

  function render(host, fmt, list, sl, opts) {
    opts = opts || {};
    if (fmt === 'window' || fmt === 'video') return renderStage(host, list, sl, fmt, opts.bare);
    if (fmt === 'carousel') return renderCarousel(host, list, sl);
    if (fmt === 'split') return renderSplit(host, list, sl);
    if (fmt === 'native') return renderNative(host, list, sl);
    if (fmt === 'ticker') return renderTicker(host, list, sl);
    return renderStage(host, list, sl, 'window', opts.bare);
  }
  function reveal(node) { W.requestAnimationFrame(function () { W.requestAnimationFrame(function () { (node.classList.contains('cads') ? node : node.querySelector('.cads') || node).classList.add('in'); }); }); }
  function markPreview(node) { if (PREVIEW) { var b = el('span', 'cads-pv', 'Preview'); (node.querySelector('.cads-stage,.cads-car,.cads-split,.cads-native-m') || node).appendChild(b); } }

  /* ── SLOTS ───────────────────────────────────────────────────── */
  function findAnchor(sl) {
    var sels = sl.anchor || [];
    for (var i = 0; i < sels.length; i++) { var n = safe(function () { return D.querySelector(sels[i]); }, null); if (n) return { node: n, via: sels[i], fallback: false }; }
    if (sl.fallback) { var f = safe(function () { return D.querySelector(sl.fallback); }, null); if (f) return { node: f, via: sl.fallback, fallback: true }; }
    return null;
  }

  /* A slot's candidate list, formats resolved. */
  function fill(sl, max) {
    var list = pick(sl, max);
    if (!list.length) list = houseFor(sl);
    if (!list.length) return null;
    var first = list[0];
    // The slot's own order of formats decides the presentation, so an
    // end-of-page band is a cinematic stage whenever any video is live.
    var fmt = sl.formats.filter(function (f) { return list.some(function (x) { return x.c.format === f; }); })[0] || sl.formats[0];
    if (fmt === 'window' || fmt === 'video') list = list.filter(function (x) { return x.c.format !== 'split' || x.c.media_url; });
    if (fmt === 'carousel') list = list.filter(function (x) { return x.c.format === 'carousel' || x.c.media_url; });
    list = list.filter(function (x) { return x.c.format === fmt; }).concat(list.filter(function (x) { return x.c.format !== fmt; }));
    void first;
    if (first.fit === 'house') fmt = sl.formats[0] === 'native' ? 'native' : (sl.formats[0] === 'carousel' ? 'carousel' : sl.formats[0]);
    // Stage/carousel units can carry a playlist; others take one creative.
    if (fmt !== 'window' && fmt !== 'video' && fmt !== 'carousel') list = list.slice(0, 1);
    return { list: list, fmt: fmt };
  }

  function mountSection(sl) {
    var a = findAnchor(sl);
    if (!a) { report(sl, 'missing', { detail: 'None of the anchors are on the page (' + (sl.anchor || []).join(', ') + '). The page layout changed.' }); return; }
    var locked = !!(SURF && SURF.locked);
    var mode = sl.kind === 'fixed' || sl.mode === 'use' ? 'use' : (sl.mode || 'before');
    var host;
    if (mode === 'use' && a.node.matches && a.node.matches('[data-showcase]') && !a.fallback) {
      host = a.node; host.innerHTML = ''; host.removeAttribute('data-showcase'); host.setAttribute('data-ad-slot', sl.id);
      host.classList.add(locked ? 'cads-bare' : 'cads-band');
    } else {
      host = el('div', 'cads-band' + (sl.width === 'inherit' ? ' cads-inherit' : ''));
      host.setAttribute('data-ad-slot', sl.id);
      if (mode === 'after') a.node.parentNode.insertBefore(host, a.node.nextSibling);
      else if (mode === 'use') a.node.parentNode.insertBefore(host, a.fallback ? a.node : a.node.nextSibling);
      else a.node.parentNode.insertBefore(host, a.node);
    }
    var note = a.fallback ? 'Its anchor is gone; placed at the fallback (' + a.via + ').' : null;
    report(sl, 'deferred', { detail: note || 'Waiting for the visitor to reach it.' });
    whenReady(host, function () {
      var isPreview = PREVIEW && PREVIEW.slot === sl.id;
      if (!isPreview) {
        var why = roomFor(docTop(host), 420, locked);
        if (why) { report(sl, 'blocked', { detail: why }); return true; }
      }
      var f = fill(sl, 4);
      if (!f) { report(sl, 'empty', { detail: 'No live campaign targets this slot' + (sl.house ? ' and house ads are off.' : '.') }); host.parentNode && host !== a.node && host.parentNode.removeChild(host); return true; }
      var node = render(host, f.fmt, f.list, sl, { bare: locked });
      markPreview(node);
      f.list.forEach(function (x) { usedOnPage[x.c.id] = 1; });
      units.push({ node: host, slot: sl.id });
      reveal(node);
      var c0 = f.list[0].c;
      report(sl, c0._house ? 'house' : 'live', { format: f.fmt, campaign: c0._house ? c0.id : String(c0.id),
        detail: (note ? note + ' ' : '') + (c0._house ? 'No paid campaign; showing a Cabana promo.' : f.list.length + ' creative(s): ' + f.list.map(function (x) { return x.c.advertiser; }).join(', ')) });
      if (isPreview) setTimeout(function () { host.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
      return true;
    }, PREVIEW && PREVIEW.slot === sl.id);
    if (PREVIEW && PREVIEW.slot === sl.id) { userMoved = true; setTimeout(function () { host.scrollIntoView({ block: 'center' }); recheck(); }, 400); }
  }

  /* In-results: woven between cards, whole rows only, never in the
     first screen. Survives the grid re-rendering (filters, sorting). */
  function isItem(n) {
    if (!n || n.nodeType !== 1 || n.hasAttribute('data-cads')) return false;
    if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(n.tagName)) return false;
    if (n.getAttribute('aria-hidden') === 'true' || n.hidden) return false;
    if (/skel|shimmer|placeholder|loading/i.test(n.className || '')) return false;
    return n.offsetHeight > 40;
  }
  function columns(items) {
    if (items.length < 2) return 1;
    var t = items[0].offsetTop, n = 0;
    for (var i = 0; i < items.length && i < 8; i++) { if (Math.abs(items[i].offsetTop - t) < 4) n++; else break; }
    return Math.max(1, n);
  }
  function mountFeed(sl) {
    var sels = (SURF.feed && SURF.feed.grid) || [];
    var grid = null, waited = 0, pos = [], built = {};
    function find() { for (var i = 0; i < sels.length; i++) { var g = D.querySelector(sels[i]); if (g) return g; } return null; }
    report(sl, 'deferred', { detail: 'Waiting for ' + ((SURF.feed && SURF.feed.label) || 'results') + ' to load.' });
    (function poll() {
      grid = find();
      if (grid) return start();
      waited += 700;
      if (waited > 20000) { report(sl, 'missing', { detail: 'The results list (' + sels.join(', ') + ') is not on the page. The page layout changed.' }); return; }
      setTimeout(poll, 700);
    })();
    function start() {
      var mo = new MutationObserver(rafThrottle(function () { setTimeout(layout, 350); }));
      mo.observe(grid, { childList: true });
      layout();
    }
    function layout() {
      if (!grid.isConnected) { grid = find(); if (!grid) return; }
      var items = [].slice.call(grid.children).filter(isItem);
      var cfg = S.infeed || {}, first = Math.max(3, cfg.first || 6), every = Math.max(6, cfg.every || 12), max = Math.max(0, Math.min(4, cfg.max == null ? 2 : cfg.max));
      if (!max) { report(sl, 'off', { detail: 'In-results ads are switched off in the rules.' }); return; }
      if (items.length < first + 1) { if (!Object.keys(built).length) report(sl, 'deferred', { detail: 'Only ' + items.length + ' results showing; ads start after ' + first + '.' }); return; }
      var cols = columns(items);
      var at = Math.ceil(first / cols) * cols, step = Math.ceil(every / cols) * cols;
      // Never inside the rows already on screen: start at the first row
      // that is still below the viewport when the results arrive.
      if (!Object.keys(built).length && S.fold_guard !== false && SURF.service) {
        var vh = W.innerHeight || 800;
        for (var q = at; q < items.length; q += cols) { if (items[q].getBoundingClientRect().top >= vh) { at = q; break; } if (q + cols >= items.length) at = items.length; }
      }
      pos = [];
      while (pos.length < max && at < items.length) { pos.push(at); at += step; }
      pos.forEach(function (p, k) {
        var anchor = items[p - 1], watch = items[p];
        if (!anchor || !watch) return;
        var next = anchor.nextElementSibling;
        if (next && next.hasAttribute('data-cads')) return;           // still in place
        if (watch._cadsWatch) return;
        watch._cadsWatch = true;
        whenReady(watch, function () {
          watch._cadsWatch = false;
          if (anchor.nextElementSibling && anchor.nextElementSibling.hasAttribute('data-cads')) return true;
          var isPreview = PREVIEW && PREVIEW.slot === sl.id;
          if (!isPreview) {
            var why = roomFor(docTop(anchor) + anchor.offsetHeight, 380, false);
            if (why) { if (!Object.keys(built).length) report(sl, 'blocked', { detail: why }); return true; }
          }
          var reuse = built[k];
          var f = reuse || fill(sl, k === 0 ? 1 : 4);
          if (!f) { report(sl, 'empty', { detail: 'No live campaign fits the results.' }); return true; }
          // The first in-results unit is always a card; a later one may be a full-width carousel.
          if (!reuse) {
            var hasCarousel = f.list.some(function (x) { return x.c.format === 'carousel'; });
            f.fmt = (k > 0 && hasCarousel && items.length >= first + step) ? 'carousel' : 'native';
            if (f.fmt === 'native') f.list = f.list.slice(0, 1);
            else f.list = f.list.filter(function (x) { return x.c.format === 'carousel'; });
            built[k] = f;
          }
          var box = el('div', 'cads-infeed' + (f.fmt === 'native' ? '' : ' wide'));
          box.setAttribute('data-cads', sl.id); box.setAttribute('data-ad-slot', sl.id);
          anchor.parentNode.insertBefore(box, anchor.nextSibling);
          var node = render(box, f.fmt, f.list, sl);
          markPreview(node);
          f.list.forEach(function (x) { usedOnPage[x.c.id] = 1; });
          units.push({ node: box, slot: sl.id });
          reveal(node);
          var c0 = f.list[0].c;
          report(sl, 'live', { format: f.fmt, campaign: String(c0.id), detail: Object.keys(built).length + ' unit(s) in ' + items.length + ' results' });
          return true;
        }, PREVIEW && PREVIEW.slot === sl.id);
      });
    }
  }

  /* ── OVERLAYS ────────────────────────────────────────────────── */
  function claimOverlay(owner) { if (overlayOwner && overlayOwner !== owner) return false; overlayOwner = owner; return true; }
  function releaseOverlay(owner) { if (overlayOwner === owner) overlayOwner = null; }

  function mountSticky(sl) {
    var cfg = S.sticky || {};
    if (cfg.enabled === false) { report(sl, 'off', { detail: 'Corner cards are switched off in the rules.' }); return; }
    if (SS.get('cads:sticky:x')) { report(sl, 'deferred', { detail: 'Dismissed by this visitor for the session.' }); return; }
    var list = pick(sl, 1);
    if (!list.length && S.house_ads) list = [{ c: { id: 'house_sticky', _house: true, advertiser: 'Cabana', headline: 'Your place could be earning', sub_text: 'Zero commission. Keep 100%.', cta_text: 'List for free', cta_url: '/add-listing', theme_gradient: 'linear-gradient(135deg,#0E9F8E,#4F6DFF)' }, fit: 'house' }];
    if (!list.length) { report(sl, 'empty', { detail: 'No corner-card campaign is live.' }); return; }
    var c = list[0].c, delay = Math.max(8, cfg.delay_s || 20) * 1000;
    report(sl, 'deferred', { format: 'sticky', campaign: String(c.id), detail: 'Appears after ' + Math.round(delay / 1000) + 's once the visitor scrolls.' });
    var t0 = Date.now();
    var iv = setInterval(function () {
      if (Date.now() - t0 < delay || D.hidden) return;
      var sh = D.documentElement.scrollHeight - W.innerHeight;
      if (sh > 400 && (W.pageYOffset || 0) / sh < 0.25) return;
      if (!claimOverlay('sticky')) return;
      clearInterval(iv);
      var href = REG.safeHref(c.cta_url);
      var n = el('aside', 'cads-sticky');
      n.setAttribute('aria-label', c._house ? 'From Cabana' : 'Sponsored');
      n.style.background = cssBg(c.theme_gradient, 'linear-gradient(135deg,#6D28FF,#4F6DFF)');
      n.innerHTML = '<div class="cads-sticky-in"><div class="cads-adv">' + esc(c.advertiser || '') + ' · ' + (c._house ? 'Cabana' : 'Sponsored') + '</div>' +
        '<p class="cads-sticky-h">' + esc(plain(c.headline || '')) + '</p>' + (c.sub_text ? '<p class="cads-sticky-s">' + esc(plain(c.sub_text)) + '</p>' : '') +
        (href ? '<a class="cads-cta" href="' + esc(href) + '"><span>' + esc(c.cta_text || 'Learn more') + '</span>' + ICON.arrow + '</a>' : '') +
        '<button type="button" class="cads-ibtn cads-x" aria-label="Dismiss">' + ICON.x + '</button></div>';
      D.body.appendChild(n);
      W.requestAnimationFrame(function () { W.requestAnimationFrame(function () { n.classList.add('show'); }); });
      track(c, 'impression', sl.id);
      setTimeout(function () { if (n.isConnected) track(c, 'viewable', sl.id); }, 1200);
      var a = n.querySelector('.cads-cta'); if (a) a.addEventListener('click', function (e) { go(c, sl.id, e); });
      n.querySelector('.cads-x').onclick = function () {
        n.classList.remove('show'); SS.set('cads:sticky:x', '1'); track(c, 'dismiss', sl.id);
        setTimeout(function () { n.remove(); releaseOverlay('sticky'); }, 650);
      };
      report(sl, c._house ? 'house' : 'live', { format: 'sticky', campaign: String(c.id), detail: 'Shown.' });
    }, 1000);
  }

  function mountManaged(sl) {
    setTimeout(function () {
      var n = sl.probe ? D.querySelector(sl.probe) : null;
      report(sl, n ? 'live' : 'missing', { detail: n ? 'Rendered by the page itself.' : 'The element ' + sl.probe + ' is not on the page.' });
    }, 2500);
  }

  function mountShadow() {
    var pool = (BUNDLE && BUNDLE.shadow) || [];
    var on = SURF && SURF.shadow && S.shadow && S.shadow.enabled !== false;
    W.__CABANA_SHADOW = { enabled: !!on, pool: on ? pool : [], page: PAGE };
    safe(function () { W.dispatchEvent(new CustomEvent('cabana-ads:shadow', { detail: W.__CABANA_SHADOW })); });
    if (!on || !pool.length || W.ApaShadow) return;
    var s = D.createElement('script'); s.src = '/apa-shadow.js?v=3'; s.defer = true; D.body.appendChild(s);
  }

  /* ── PREVIEW (from the console) ──────────────────────────────── */
  function loadPreview() {
    var id = QS && QS.get('ad_preview');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Promise.resolve(null);
    var fromBundle = ((BUNDLE && BUNDLE.campaigns) || []).filter(function (c) { return String(c.id) === id; })[0];
    var viaSession = safe(function () { return W.ApaSession && W.ApaSession.client && W.ApaSession.client(); }, null);
    var got = fromBundle ? Promise.resolve(fromBundle)
      : viaSession && viaSession.rpc ? viaSession.rpc('admin_ad_preview', { p_id: id }).then(function (r) { return r && r.data; }, function () { return null; })
      : Promise.resolve(null);
    return got.then(function (c) {
      if (!c) return null;
      var want = QS.get('ad_slot');
      var sl = want && REG.slot(want) && REG.slot(want).page === PAGE ? REG.slot(want) : null;
      if (!sl && SURF) sl = SURF.slots.filter(function (s) { return s.formats.indexOf(c.format) !== -1 && s.kind !== 'managed'; })[0] || SURF.slots.filter(function (s) { return s.kind === 'section' || s.kind === 'fixed'; })[0];
      if (!sl) return null;
      c = Object.assign({}, c, { _preview: true, status: 'live', active: true, start_date: null, end_date: null, slots: [sl.id], page_targets: ['all'] });
      PREVIEW = { campaign: c, slot: sl.id };
      return PREVIEW;
    });
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  function loadRegistry() {
    if (W.CabanaAdRegistry) return Promise.resolve(W.CabanaAdRegistry);
    return new Promise(function (res) {
      var s = D.createElement('script'); s.src = '/apa-ad-registry.js?v=2026.09.26';
      s.onload = function () { res(W.CabanaAdRegistry || null); }; s.onerror = function () { res(null); };
      (D.head || D.documentElement).appendChild(s);
    });
  }

  function boot() {
    if (booted) return; booted = true;
    loadRegistry().then(function (reg) {
      if (!reg) { log('registry missing'); return; }
      REG = reg;
      PAGE = reg.pageFromPath(W.location.pathname);
      API.page = PAGE;
      if (reg.never(PAGE) || W.__CABANA_ADS_PREVIEW_ONLY) { log('no ads on', PAGE); return; }
      SURF = reg.surface(PAGE);
      if (!SURF) { log('no surface for', PAGE); return; }
      injectCSS();
      return bundle(PAGE).then(function (b) {
        BUNDLE = b || { campaigns: [], shadow: [], settings: {} };
        S = reg.mergePolicy(BUNDLE.settings);
        API.settings = S;
        return loadPreview();
      }).then(function () {
        var offSlots = Array.isArray(S.disabled_slots) ? S.disabled_slots : [];
        if (S.enabled === false && !PREVIEW) {
          SURF.slots.forEach(function (sl) { report(sl, 'off', { detail: 'All ads are switched off in the rules.' }); });
          W.__CABANA_SHADOW = { enabled: false, pool: [], page: PAGE };
          setTimeout(flushHealth, 4000); return;
        }
        if (SOURCE === 'offline') log('ad server unreachable; house ads only');
        W.addEventListener('scroll', onMove, { passive: true, capture: true });
        W.addEventListener('resize', recheck, { passive: true });
        W.addEventListener('touchmove', function () { userMoved = true; recheck(); }, { passive: true });
        W.addEventListener('wheel', function () { userMoved = true; recheck(); }, { passive: true });
        SURF.slots.forEach(function (sl) {
          if (offSlots.indexOf(sl.id) !== -1 && !(PREVIEW && PREVIEW.slot === sl.id)) { report(sl, 'off', { detail: 'Switched off in the rules.' }); return; }
          safe(function () {
            if (sl.kind === 'section' || sl.kind === 'fixed') mountSection(sl);
            else if (sl.kind === 'infeed') mountFeed(sl);
            else if (sl.kind === 'overlay') mountSticky(sl);
            else if (sl.kind === 'managed') mountManaged(sl);
            // takeover (welcome poster) reports itself from apa-interstitial.js
          });
        });
        mountShadow();
        setTimeout(recheck, 600);
        setTimeout(function () { flushHealth(false); }, 12000);
        W.addEventListener('pagehide', function () { flushHealth(true); });
        D.addEventListener('visibilitychange', function () { if (D.hidden) flushHealth(true); });
      });
    }).catch(function (e) { log('boot failed', e && e.message); });
  }

  /* Render a creative into any element, exactly as the site would. The
     console uses this for its live previews, so what an operator sees
     is what a visitor gets. */
  function previewInto(host, campaign, format, opts) {
    opts = opts || {};
    return loadRegistry().then(function (reg) {
      if (!reg) return null;
      REG = REG || reg; S = S || reg.mergePolicy({});
      injectCSS();
      campaign = Object.assign({}, campaign, { _preview: true });
      var prev = PREVIEW; PREVIEW = PREVIEW || { campaign: campaign, slot: '__console' };
      host.innerHTML = '';
      if (!host._cadsGuard) { host._cadsGuard = true; host.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) { e.preventDefault(); e.stopPropagation(); } }, true); }
      var fmt = format || campaign.format || 'window';
      var sl = { id: '__console', page: 'console', kind: 'section', formats: [fmt] };
      var node = render(host, fmt === 'poster' ? 'window' : fmt, [{ c: campaign, fit: 'exact' }], sl, { bare: !!opts.bare });
      node.classList.add('in');
      PREVIEW = prev;
      return node;
    });
  }

  var API = {
    version: VERSION,
    page: PAGE,
    settings: null,
    reload: function () { units.forEach(function (u) { if (u.node && u.node.parentNode && !u.node.hasAttribute('data-showcase-keep')) u.node.innerHTML = ''; }); units = []; usedOnPage = {}; booted = false; boot(); },
    report: function () { return { page: PAGE, source: SOURCE, settings: S, slots: JSON.parse(JSON.stringify(reports)), units: units.length }; },
    preview: previewInto,
    claimOverlay: claimOverlay,
    releaseOverlay: releaseOverlay,
    overlayOwner: function () { return overlayOwner; },
    track: function (c, ev, slotId) { if (REG) track(c, ev, slotId); },
    bundle: function (page) { return loadRegistry().then(function (r) { REG = REG || r; return bundle(page || PAGE); }); },
    heartbeat: function (page, list) { return rpc('ad_heartbeat', { p_page: page, p_reports: list }, { keepalive: true }).catch(function () {}); }
  };
  W.CabanaAds = API;
  W.ApatmentoShowcase = { reload: API.reload };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
