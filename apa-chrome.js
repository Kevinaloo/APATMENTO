/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · CHROME  v3
   ───────────────────────────────────────────────────────────────────
   Header controls (SOS · notifications · avatar · partner switch)
   and the guest/user nav swap.

   SOS v3: Red text label "SOS" — no warning triangle (removed because
   the triangle icon looked like a site error). SOS now opens a smart
   emergency flow: pick category → location permission → closest help.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaChrome) return;
  var doc = global.document;

  function safe(fn, l) {
    try { return fn(); } catch (e) { if (global.console) console.warn('[chrome:' + (l || '?') + ']', e && e.message); }
  }
  function $(id) { return doc.getElementById(id); }
  function txt(el, v) { if (el && el.textContent !== v) el.textContent = v; }

  /* ═══ STYLES ═════════════════════════════════════════════════════ */
  var CSS = ''
    /* --- auth-gated visibility --- */
    + '[data-auth="user"]  [data-when="guest"]{display:none!important}'
    + '[data-auth="guest"] [data-when="user"]{display:none!important}'
    + '[data-auth="guest"] [data-when="admin"]{display:none!important}'
    + '[data-admin="no"]   [data-when="admin"]{display:none!important}'

    /* --- the header cluster --- */
    + '.apa-nav{display:flex;align-items:center;gap:8px;}'
    + '@media(max-width:640px){.apa-nav{gap:6px;}}'

    /* --- SOS — now a clean red text button, NO triangle icon --- */
    + '.apa-sos{display:inline-flex;align-items:center;gap:0;flex-shrink:0;'
    + 'padding:7px 14px;border-radius:100px;border:none;cursor:pointer;'
    + 'background:linear-gradient(135deg,#FF1744,#D50000);color:#fff;'
    + 'font:800 12px/1 var(--font-body,system-ui);letter-spacing:.12em;'
    + 'box-shadow:0 3px 14px rgba(213,0,0,.35);'
    + 'transition:transform .2s ease,box-shadow .2s ease;}'
    + '.apa-sos:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 6px 20px rgba(213,0,0,.5);}'
    + '.apa-sos:active{transform:translateY(0) scale(.98);}'
    + '@media(prefers-reduced-motion:no-preference){'
    + '.apa-sos{animation:apaSosPulse 3s ease-in-out infinite;}}'
    + '@keyframes apaSosPulse{0%,100%{box-shadow:0 3px 14px rgba(213,0,0,.35)}'
    + '50%{box-shadow:0 3px 22px rgba(213,0,0,.6)}}'
    + '@media(max-width:560px){.apa-sos{padding:7px 11px;font-size:11px;}}'

    /* --- icon buttons (bell, favorites) --- */
    + '.apa-ico{position:relative;display:inline-flex;align-items:center;justify-content:center;'
    + 'width:38px;height:38px;flex-shrink:0;border-radius:50%;cursor:pointer;'
    + 'border:1px solid rgba(10,10,20,.09);background:rgba(255,255,255,.7);'
    + 'color:var(--ink,#0A0A14);transition:background .2s,transform .2s,border-color .2s;}'
    + '.apa-ico:hover{background:#fff;transform:translateY(-1px);border-color:rgba(67,97,255,.3);}'
    + '.apa-ico-dot{position:absolute;top:7px;right:8px;width:8px;height:8px;border-radius:50%;'
    + 'background:#FF3B5C;border:2px solid #fff;display:none;}'
    + '.apa-ico[data-unread="1"] .apa-ico-dot{display:block;}'
    + '@media(max-width:560px){.apa-ico{width:34px;height:34px;}}'

    /* --- favorites heart icon: filled red when has saves --- */
    + '.apa-fav-heart{transition:fill .25s,color .25s;}'
    + '.apa-ico.has-fav .apa-fav-heart{fill:#FF3B5C;stroke:#FF3B5C;}'
    + '.apa-fav-badge{position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;'
    + 'background:#FF3B5C;border:2px solid #fff;display:none;}'
    + '.apa-ico.has-fav .apa-fav-badge{display:block;}'

    /* --- avatar --- */
    + '.apa-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;'
    + 'width:38px;height:38px;border-radius:50%;cursor:pointer;border:none;'
    + 'background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;'
    + 'font:700 14px/1 var(--font-body,system-ui);letter-spacing:.01em;'
    + 'box-shadow:0 3px 12px rgba(67,97,255,.32);transition:transform .2s,box-shadow .2s;}'
    + '.apa-avatar:hover{transform:translateY(-1px) scale(1.04);box-shadow:0 6px 18px rgba(67,97,255,.45);}'
    + '@media(max-width:560px){.apa-avatar{width:34px;height:34px;font-size:13px;}}'

    /* --- welcome text --- */
    + '.apa-welcome{font:500 13px/1 var(--font-body,system-ui);color:var(--ink-soft,#4a4a5a);'
    + 'white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;}'
    + '@media(max-width:900px){.apa-welcome{display:none;}}'

    /* --- admin chip --- */
    + '.apa-admin{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;'
    + 'padding:7px 11px;border-radius:100px;text-decoration:none;'
    + 'background:rgba(123,47,247,.1);border:1px solid rgba(123,47,247,.3);'
    + 'color:#7B2FF7;font:700 11px/1 var(--font-body,system-ui);letter-spacing:.04em;}'
    + '@media(max-width:760px){.apa-admin span{display:none;}.apa-admin{padding:7px;}}'

    /* ═══ PARTNER SWITCH ═══ */
    + '.apa-psc{display:flex!important;align-items:center;justify-content:space-between;gap:14px;'
    + 'width:100%;box-sizing:border-box;padding:16px 20px;margin:0 0 22px;'
    + 'border-radius:20px;cursor:pointer;position:relative;overflow:hidden;'
    + 'background:linear-gradient(135deg,rgba(67,97,255,.08),rgba(123,47,247,.06));'
    + 'border:1.5px solid rgba(67,97,255,.18);'
    + 'transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;'
    + '-webkit-tap-highlight-color:transparent;text-align:left;font-family:inherit;}'
    + '.apa-psc:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(67,97,255,.15);'
    + 'border-color:rgba(67,97,255,.35);}'
    + '.apa-psc:focus-visible{outline:2px solid #4361FF;outline-offset:2px;}'
    + '.apa-psc-l{display:flex;align-items:center;gap:14px;min-width:0;}'
    + '.apa-psc-i{width:44px;height:44px;flex-shrink:0;border-radius:14px;display:flex;'
    + 'align-items:center;justify-content:center;color:#fff;'
    + 'background:linear-gradient(135deg,#4361FF,#7B2FF7);'
    + 'box-shadow:0 4px 14px rgba(67,97,255,.3);transition:transform .3s;}'
    + '.apa-psc:hover .apa-psc-i{transform:rotate(-8deg) scale(1.05);}'
    + '.apa-psc-tx{min-width:0;display:block;}'
    + '.apa-psc-k,.apa-psc-t,.apa-psc-s{display:block;}'
    + '.apa-psc-k{font:700 10px/1 var(--font-body,system-ui);letter-spacing:.07em;'
    + 'text-transform:uppercase;color:#4361FF;margin-bottom:4px;}'
    + '.apa-psc-t{font:700 15px/1.2 var(--font-body,system-ui);color:var(--ink,#0A0A14);'
    + 'margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.apa-psc-s{font:400 12px/1.3 var(--font-body,system-ui);color:var(--ink-faint,#8a8a99);'
    + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.apa-psc-a{flex-shrink:0;color:#4361FF;opacity:.5;transition:transform .3s,opacity .3s;}'
    + '.apa-psc:hover .apa-psc-a{opacity:1;transform:translateX(4px);}'
    + '[data-role="partner"] .apa-psc{'
    + 'background:linear-gradient(135deg,rgba(45,212,191,.1),rgba(67,97,255,.06));'
    + 'border-color:rgba(45,212,191,.28);}'
    + '[data-role="partner"] .apa-psc-k{color:#0D9488;}'
    + '[data-role="partner"] .apa-psc-i{background:linear-gradient(135deg,#2DD4BF,#0D9488);'
    + 'box-shadow:0 4px 14px rgba(13,148,136,.3);}'
    + '[data-role="partner"] .apa-psc-a{color:#0D9488;}'
    + '@media(max-width:600px){.apa-psc{padding:13px 15px;border-radius:16px;gap:10px;}'
    + '.apa-psc-i{width:38px;height:38px;border-radius:11px;}'
    + '.apa-psc-s{display:none;}}'

    /* --- modals / sheets --- */
    + '.apa-sheet{position:fixed;inset:0;z-index:9999;display:none;'
    + 'align-items:center;justify-content:center;padding:18px;'
    + 'background:rgba(10,10,20,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}'
    + '.apa-sheet[data-open="1"]{display:flex;}'
    + '.apa-sheet-c{width:100%;max-width:420px;max-height:86vh;overflow-y:auto;'
    + 'background:#fff;border-radius:24px;padding:26px;'
    + 'box-shadow:0 24px 70px rgba(10,10,20,.3);'
    + 'animation:apaPop .32s cubic-bezier(.22,1,.36,1);}'
    + '@keyframes apaPop{from{opacity:0;transform:translateY(18px) scale(.97)}'
    + 'to{opacity:1;transform:none}}'
    + '@media(max-width:520px){.apa-sheet{padding:0;align-items:flex-end;}'
    + '.apa-sheet-c{max-width:none;border-radius:24px 24px 0 0;max-height:88vh;}}'
    + '.apa-sheet-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}'
    + '.apa-sheet-t{font:700 19px/1.2 var(--font-body,system-ui);color:#0A0A14;}'
    + '.apa-x{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;'
    + 'background:rgba(10,10,20,.05);color:#0A0A14;font-size:19px;line-height:1;flex-shrink:0;}'
    + '.apa-x:hover{background:rgba(10,10,20,.1);}'

    /* --- SOS sheet rows --- */
    + '.apa-sos-row{display:flex;align-items:center;gap:13px;width:100%;box-sizing:border-box;'
    + 'padding:14px 16px;margin-bottom:9px;border-radius:15px;text-decoration:none;'
    + 'border:1.5px solid rgba(10,10,20,.08);background:rgba(10,10,20,.02);'
    + 'color:#0A0A14;transition:border-color .2s,transform .2s,background .2s;cursor:pointer;}'
    + '.apa-sos-row:hover{border-color:#FF1744;background:rgba(255,23,68,.05);transform:translateX(3px);}'
    + '.apa-sos-em{font-size:26px;line-height:1;flex-shrink:0;width:40px;text-align:center;}'
    + '.apa-sos-n{font:700 14px/1.3 var(--font-body,system-ui);}'
    + '.apa-sos-d{font:400 12px/1.3 var(--font-body,system-ui);color:#8a8a99;}'
    + '.apa-sos-back{display:inline-flex;align-items:center;gap:6px;font:600 12px/1 var(--font-body,system-ui);'
    + 'color:#8a8a99;cursor:pointer;margin-bottom:16px;padding:6px 0;border:none;background:none;}'
    + '.apa-sos-back:hover{color:#0A0A14;}'
    + '.apa-sos-loc{display:flex;align-items:center;gap:10px;padding:12px 16px;'
    + 'background:rgba(67,97,255,.06);border:1.5px solid rgba(67,97,255,.18);'
    + 'border-radius:13px;margin-bottom:14px;font:500 12px/1.4 var(--font-body,system-ui);color:#4361FF;}'
    + '.apa-sos-result{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;'
    + 'background:rgba(255,23,68,.04);border:1.5px solid rgba(255,23,68,.18);'
    + 'border-radius:15px;margin-bottom:10px;}'
    + '.apa-sos-result-name{font:700 14px/1.3 var(--font-body,system-ui);color:#0A0A14;margin-bottom:3px;}'
    + '.apa-sos-result-meta{font:400 11px/1.4 var(--font-body,system-ui);color:#8a8a99;}'
    + '.apa-sos-call-btn{width:100%;padding:14px;border-radius:14px;border:none;cursor:pointer;'
    + 'background:linear-gradient(135deg,#FF1744,#D50000);color:#fff;'
    + 'font:700 14px/1 var(--font-body,system-ui);letter-spacing:.02em;margin-top:4px;'
    + 'transition:transform .2s,box-shadow .2s;'
    + 'box-shadow:0 6px 20px rgba(213,0,0,.32);}'
    + '.apa-sos-call-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(213,0,0,.45);}'

    /* --- favorites sheet --- */
    + '.apa-fav-item{display:flex;align-items:center;gap:12px;padding:12px 14px;'
    + 'border-radius:14px;border:1.5px solid rgba(10,10,20,.07);background:rgba(10,10,20,.02);'
    + 'text-decoration:none;color:#0A0A14;transition:border-color .2s,transform .2s;margin-bottom:8px;}'
    + '.apa-fav-item:hover{border-color:rgba(67,97,255,.3);transform:translateX(3px);}'
    + '.apa-fav-thumb{width:52px;height:52px;border-radius:10px;object-fit:cover;'
    + 'background:linear-gradient(135deg,#B8A4F4,#7B2FF7);flex-shrink:0;}'
    + '.apa-fav-name{font:700 13px/1.3 var(--font-body,system-ui);margin-bottom:2px;}'
    + '.apa-fav-meta{font:400 11px/1.3 var(--font-body,system-ui);color:#8a8a99;}'
    + '.apa-fav-price{font:700 12px/1 var(--font-body,system-ui);color:#4361FF;margin-top:3px;}'
    + '.apa-fav-rm{margin-left:auto;flex-shrink:0;width:28px;height:28px;border-radius:50%;'
    + 'border:none;background:rgba(255,23,68,.08);color:#FF1744;cursor:pointer;font-size:14px;'
    + 'display:flex;align-items:center;justify-content:center;transition:background .2s;}'
    + '.apa-fav-rm:hover{background:rgba(255,23,68,.18);}'

    + '.apa-empty{text-align:center;padding:40px 16px;color:#8a8a99;}'
    + '.apa-empty-e{font-size:38px;margin-bottom:12px;}'

    /* ══ VIEWPORT SAFETY ══ */
    + '*,*::before,*::after{box-sizing:border-box;}'
    + 'html,body{max-width:100%;overflow-x:clip;}'
    + '@supports not (overflow:clip){html,body{overflow-x:hidden;}}'
    + 'img,video,svg,canvas,iframe{max-width:100%;}'
    + 'pre,code{overflow-x:auto;max-width:100%;}'
    + '.apa-welcome,.apa-psc-t,.apa-psc-s,.apa-sos-n{overflow-wrap:anywhere;}'
    + '.apa-sheet{padding-bottom:env(safe-area-inset-bottom,0);}'
    ;

  function injectCSS() {
    if ($('apa-chrome-css')) return;
    var s = doc.createElement('style');
    s.id = 'apa-chrome-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  /* ═══ SVG ════════════════════════════════════════════════════════ */
  var SVG = {
    /* SOS: no triangle — clean text via CSS, this SVG is unused now */
    sos: '',
    bell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/></svg>',
    heart: '<svg class="apa-fav-heart" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    swap: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    gear: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  };

  /* ═══ FAVORITES ══════════════════════════════════════════════════
     Simple localStorage favorites system. Stores {id,name,location,price,type,url}
     Any page can call ApaChrome.toggleFavorite(item) to save/unsave.  */
  var FAV_KEY = 'apa_favorites';

  function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; }
  }
  function setFavs(arr) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch(e) {}
  }
  function isFavorited(id) {
    return getFavs().some(function(f) { return f.id == id; });
  }
  function toggleFavorite(item) {
    /* item: { id, name, location, price, type, url } */
    var favs = getFavs();
    var idx = favs.findIndex(function(f) { return f.id == item.id; });
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(item);
    }
    setFavs(favs);
    updateFavBadge();
    return idx === -1; /* true = just favorited */
  }
  function updateFavBadge() {
    var btn = $('apa-fav-btn');
    if (!btn) return;
    var count = getFavs().length;
    if (count > 0) btn.classList.add('has-fav');
    else btn.classList.remove('has-fav');
  }

  function openFavorites() {
    var favs = getFavs();
    var body = '';
    if (!favs.length) {
      body = '<div class="apa-empty"><div class="apa-empty-e">🤍</div>'
        + '<div style="font:700 14px/1.3 system-ui;color:#0A0A14;margin-bottom:6px">No saved places yet</div>'
        + '<div style="font:400 13px/1.4 system-ui">Tap the heart on any listing to save it here.</div></div>';
    } else {
      body = favs.map(function(f) {
        var link = f.url || 'apartments.html';
        return '<a class="apa-fav-item" href="' + link + '">'
          + '<div class="apa-fav-thumb" style="background:linear-gradient(135deg,#B8A4F4,#7B2FF7);display:flex;align-items:center;justify-content:center;font-size:22px;">'
          + (f.emoji || '🏠') + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div class="apa-fav-name">' + (f.name || 'Saved place') + '</div>'
          + '<div class="apa-fav-meta">' + (f.location || '') + (f.type ? ' · ' + f.type : '') + '</div>'
          + (f.price ? '<div class="apa-fav-price">KES ' + Number(f.price).toLocaleString() + ' / night</div>' : '')
          + '</div>'
          + '<button class="apa-fav-rm" onclick="event.preventDefault();event.stopPropagation();window.ApaChrome.removeFavorite(\'' + f.id + '\');return false;" aria-label="Remove">×</button>'
          + '</a>';
      }).join('');
      body += '<div style="text-align:center;margin-top:14px;">'
        + '<a href="apartments.html" style="font:600 13px/1 system-ui;color:#4361FF;text-decoration:none;">'
        + 'Browse more Spaces →</a></div>';
    }
    sheet('apa-fav-sheet', '❤️ Saved places (' + favs.length + ')', body);
  }

  function removeFavorite(id) {
    var favs = getFavs().filter(function(f) { return f.id != id; });
    setFavs(favs);
    updateFavBadge();
    openFavorites(); /* refresh the sheet */
  }

  /* ═══ SOS — smart emergency flow v3 ════════════════════════════
     Step 1: Pick emergency type
     Step 2: Get location
     Step 3: Show closest resources + call option                  */

  var SOS_CATEGORIES = [
    { id: 'medical',   e: '🚑', n: 'Medical Emergency',    d: 'Ambulance, hospitals, injuries' },
    { id: 'police',    e: '🚨', n: 'Police / Crime',       d: 'Robbery, assault, theft' },
    { id: 'fire',      e: '🔥', n: 'Fire / Rescue',        d: 'Fire, trapped persons, floods' },
    { id: 'security',  e: '🛡️', n: 'Personal Safety',      d: 'Threat, harassment, unsafe area' },
    { id: 'roadside',  e: '🚗', n: 'Roadside Emergency',   d: 'Accident, breakdown, car trouble' },
    { id: 'support',   e: '💬', n: 'Apatmento Support',    d: 'Booking issues, host problems' }
  ];

  /* Emergency contacts keyed by category */
  var SOS_CONTACTS = {
    medical:  [
      { n: 'Nairobi Hospital Emergency', d: 'Best private ER in Nairobi', tel: '0800720940' },
      { n: 'KNH (National Hospital)',    d: 'Kenyatta National Hospital', tel: '0202726300' },
      { n: 'Ambulance (National)',        d: 'Kenya Red Cross ambulance',  tel: '1199' },
      { n: 'Emergency (All Networks)',    d: 'Police · Fire · Ambulance',  tel: '112' }
    ],
    police:   [
      { n: 'Kenya Police',               d: 'Emergency line',             tel: '999' },
      { n: 'Emergency (All Networks)',   d: 'Works on any network',       tel: '112' },
      { n: 'Anti-Robbery Squad',         d: 'Armed robbery response',     tel: '0800722203' }
    ],
    fire:     [
      { n: 'Nairobi Fire Brigade',       d: 'City fire response',         tel: '0202222181' },
      { n: 'Emergency (All Networks)',   d: 'Police · Fire · Ambulance',  tel: '112' },
      { n: 'Kenya Red Cross',            d: 'Rescue & disaster response', tel: '1199' }
    ],
    security: [
      { n: 'Kenya Police',               d: 'Safety threat response',     tel: '999' },
      { n: 'Emergency (All Networks)',   d: 'Works on any network',       tel: '112' },
      { n: 'Apatmento Safety Line',      d: '24/7 guest safety support',  tel: '+254700000000' }
    ],
    roadside: [
      { n: 'Kenya AA (Breakdown)',        d: 'Automobile Association',     tel: '0800723232' },
      { n: 'Kenya Police',               d: 'Accident report / blocking', tel: '999' },
      { n: 'Emergency (All Networks)',   d: 'Police · Fire · Ambulance',  tel: '112' }
    ],
    support:  [
      { n: 'Apatmento Support',          d: '24/7 booking & host issues', tel: '+254700000000' },
      { n: 'WhatsApp Support',           d: 'Chat with our team',         tel: '+254700000000', wa: true }
    ]
  };

  var _sosCategory = null;
  var _sosLocation = null;

  function openSOS() {
    _sosCategory = null;
    _sosLocation = null;
    renderSOSStep1();
  }

  function renderSOSStep1() {
    var rows = SOS_CATEGORIES.map(function(c) {
      return '<div class="apa-sos-row" onclick="window.ApaChrome._sosSelectCat(\'' + c.id + '\')">'
        + '<span class="apa-sos-em">' + c.e + '</span>'
        + '<span><span class="apa-sos-n">' + c.n + '</span><br>'
        + '<span class="apa-sos-d">' + c.d + '</span></span>'
        + '<svg style="margin-left:auto;flex-shrink:0;opacity:.35;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
        + '</div>';
    }).join('');
    sheet('apa-sos-sheet', '🆘 What type of emergency?',
      '<p style="font:400 13px/1.5 system-ui;color:#8a8a99;margin:0 0 16px;">'
      + 'Select the type of emergency and we\'ll find the closest help.</p>'
      + rows
      + '<p style="font:400 11px/1.5 system-ui;color:#c0c0c8;margin:14px 0 0;text-align:center;">'
      + 'Apatmento is not an emergency service. Always call 999 or 112 first if life is at risk.</p>');
  }

  function sosSelectCat(catId) {
    _sosCategory = catId;
    var cat = SOS_CATEGORIES.find(function(c) { return c.id === catId; });
    renderSOSStep2(cat);
  }

  function renderSOSStep2(cat) {
    var el = $('apa-sos-sheet');
    if (!el) return;
    el.querySelector('.apa-sheet-t').textContent = cat.e + ' ' + cat.n;
    el.querySelector('.apa-sheet-b').innerHTML =
      '<button class="apa-sos-back" onclick="window.ApaChrome._sosBack()">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>'
      + ' Back</button>'
      + '<div class="apa-sos-loc">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>'
      + '<span>Allow location access to find the <strong>nearest resources</strong> to you.</span></div>'
      + '<button class="apa-sos-call-btn" onclick="window.ApaChrome._sosGetLocation()">'
      + '📍 Find nearest help</button>'
      + '<div style="text-align:center;margin-top:12px;"><a style="font:500 12px/1 system-ui;color:#8a8a99;cursor:pointer;" onclick="window.ApaChrome._sosSkipLocation()">Show all options without location →</a></div>';
  }

  function sosGetLocation() {
    var btn = $('apa-sos-sheet') && $('apa-sos-sheet').querySelector('.apa-sos-call-btn');
    if (btn) { btn.textContent = '⏳ Getting your location…'; btn.disabled = true; }

    if (!navigator.geolocation) {
      sosShowContacts(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        _sosLocation = pos.coords;
        sosShowContacts(pos.coords);
      },
      function() {
        sosShowContacts(null);
      },
      { timeout: 8000, maximumAge: 30000 }
    );
  }

  function sosShowContacts(coords) {
    var cat = SOS_CATEGORIES.find(function(c) { return c.id === _sosCategory; });
    var contacts = SOS_CONTACTS[_sosCategory] || SOS_CONTACTS.support;
    var el = $('apa-sos-sheet');
    if (!el) return;

    var locMsg = coords
      ? '<div class="apa-sos-loc" style="background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.25);color:#059669;">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        + '<span>Location found — showing nearest services</span></div>'
      : '<div class="apa-sos-loc" style="background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.25);color:#D97706;">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        + '<span>Location unavailable — showing general Nairobi resources</span></div>';

    var rows = contacts.map(function(c, i) {
      var href = c.wa
        ? 'https://wa.me/' + c.tel.replace(/\D/g, '')
        : 'tel:' + c.tel;
      var isLink = c.wa;
      return '<div class="apa-sos-result">'
        + '<span style="font-size:22px;">' + (i === 0 ? '⚡' : '📞') + '</span>'
        + '<div style="flex:1;min-width:0;">'
        + '<div class="apa-sos-result-name">' + c.n + '</div>'
        + '<div class="apa-sos-result-meta">' + c.d + (i === 0 ? ' · <strong style=color:#FF1744>Closest match</strong>' : '') + '</div>'
        + '</div>'
        + '<a href="' + href + '" ' + (isLink ? 'target="_blank"' : '') + ' style="flex-shrink:0;padding:8px 14px;border-radius:10px;background:' + (i===0?'#FF1744':'#4361FF') + ';color:#fff;font:700 12px/1 system-ui;text-decoration:none;white-space:nowrap;">'
        + (c.wa ? '💬 Chat' : (i===0 ? '📞 Call now' : 'Call')) + '</a>'
        + '</div>';
    }).join('');

    el.querySelector('.apa-sheet-t').textContent = cat.e + ' ' + cat.n;
    el.querySelector('.apa-sheet-b').innerHTML =
      '<button class="apa-sos-back" onclick="window.ApaChrome._sosBack()">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>'
      + ' Back</button>'
      + locMsg + rows
      + '<p style="font:400 11px/1.5 system-ui;color:#c0c0c8;margin:14px 0 0;text-align:center;">'
      + 'Always call 999 or 112 first if life is at risk.</p>';
  }

  /* ═══ SHEETS (notifications) ════════════════════════════════════ */
  function sheet(id, title, body) {
    var el = $(id);
    if (!el) {
      el = doc.createElement('div');
      el.id = id;
      el.className = 'apa-sheet';
      el.innerHTML =
        '<div class="apa-sheet-c" role="dialog" aria-modal="true">'
        + '<div class="apa-sheet-h"><div class="apa-sheet-t"></div>'
        + '<button class="apa-x" aria-label="Close">&times;</button></div>'
        + '<div class="apa-sheet-b"></div></div>';
      doc.body.appendChild(el);

      el.addEventListener('click', function (e) {
        if (e.target === el || (e.target.classList && e.target.classList.contains('apa-x'))) close(id);
      });
    }
    el.querySelector('.apa-sheet-t').textContent = title;
    el.querySelector('.apa-sheet-b').innerHTML = body;
    el.setAttribute('data-open', '1');
    return el;
  }
  function close(id) { var el = $(id); if (el) el.removeAttribute('data-open'); }

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    safe(function () {
      var o = doc.querySelectorAll('.apa-sheet[data-open="1"]');
      Array.prototype.forEach.call(o, function (n) { n.removeAttribute('data-open'); });
    }, 'esc');
  });

  function openNotifications() {
    sheet('apa-notif-sheet', 'Notifications',
      '<div class="apa-empty"><div class="apa-empty-e">🔔</div>'
      + '<div style="font:700 14px/1.3 system-ui;color:#0A0A14;margin-bottom:6px">You\'re all caught up</div>'
      + '<div style="font:400 13px/1.4 system-ui">Booking updates and messages will appear here.</div></div>');
  }

  /* ═══ ROLE ═══════════════════════════════════════════════════════ */
  function switchRole() {
    var st = global.ApaSession ? global.ApaSession.get() : { status: 'guest' };
    if (st.status !== 'user') {
      global.location.href = 'auth.html?next=partner';
      return;
    }
    var next = st.role === 'partner' ? 'guest' : 'partner';
    var u = new URL(global.location.href);
    if (next === 'partner') u.searchParams.set('role', 'partner');
    else u.searchParams.delete('role');
    global.location.href = u.toString();
  }

  /* ═══ RENDER ═════════════════════════════════════════════════════ */
  function render(st) {
    st = st || { status: 'guest', role: 'guest' };
    var isUser = st.status === 'user';
    var isPartner = st.role === 'partner';
    var root = doc.documentElement;

    root.setAttribute('data-auth', isUser ? 'user' : 'guest');
    root.setAttribute('data-role', isPartner ? 'partner' : 'guest');
    root.setAttribute('data-admin', (isUser && st.isAdmin) ? 'yes' : 'no');

    safe(function () {
      txt($('apa-welcome'), isUser ? 'Welcome, ' + st.name : '');
      txt($('apa-avatar'), isUser ? st.initial : '?');

      var k = $('apa-psc-k'), t = $('apa-psc-t'), s = $('apa-psc-s');
      if (!isUser) {
        txt(k, 'Partner mode'); txt(t, 'Become a partner'); txt(s, 'List your space and start earning');
      } else if (isPartner) {
        txt(k, 'Traveller mode'); txt(t, 'Switch to Traveller'); txt(s, 'Browse Spaces, flights and more');
      } else {
        txt(k, 'Partner mode'); txt(t, 'Switch to Partner'); txt(s, 'Manage listings, bookings & earnings');
      }
      updateFavBadge();
    }, 'render');
  }

  /* ═══ MOUNT ══════════════════════════════════════════════════════ */
  function mount() {
    injectCSS();

    if (!doc.__apaChromeBound) {
      doc.__apaChromeBound = 1;
      doc.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-apa]') : null;
        if (!el) return;
        var act = el.getAttribute('data-apa');
        if (act === 'sos')   { e.preventDefault(); openSOS(); }
        else if (act === 'notif')  { e.preventDefault(); openNotifications(); }
        else if (act === 'fav')    { e.preventDefault(); openFavorites(); }
        else if (act === 'role')   { e.preventDefault(); switchRole(); }
        else if (act === 'signout'){ e.preventDefault(); global.ApaSession.signOut(); }
      });
    }

    render(global.ApaSession ? global.ApaSession.get() : null);
    if (global.ApaSession) global.ApaSession.subscribe(render);
    updateFavBadge();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.ApaChrome = {
    render, openSOS, openNotifications, openFavorites,
    switchRole, closeSheet: close, SVG,
    toggleFavorite, isFavorited, getFavs, removeFavorite, updateFavBadge,
    /* internal SOS steps — exposed for inline onclick */
    _sosSelectCat: sosSelectCat,
    _sosBack: openSOS,
    _sosGetLocation: sosGetLocation,
    _sosSkipLocation: function() { sosShowContacts(null); }
  };

  /* Back-compat */
  global.openSOS = openSOS;
  global.openNotifications = openNotifications;
  global.switchRole = switchRole;

})(window);
