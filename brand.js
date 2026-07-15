/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · EQUATOR LIGHT — Brand Engine v1
   Safari Glyphs icon system · Meridian loader · Horizon route veil
   Scroll choreography · Interaction feel.
   Rules honoured: no template literals, defensive everywhere,
   zero hard dependencies — the site must never break because of this.
   ─────────────────────────────────────────────────────────────────── */
(function(){
'use strict';
if (window.__APA_BRAND__) return;
window.__APA_BRAND__ = 1;

var REDUCE = false;
try { REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}

function qs(s,r){ return (r||document).querySelector(s); }
function qsa(s,r){ try { return Array.prototype.slice.call((r||document).querySelectorAll(s)); } catch(e){ return []; } }
function safe(fn){ try { fn(); } catch(e){ if (window.console) console.warn('[brand]', e); } }

/* ═══ 1 · SAFARI GLYPHS — the bespoke duotone icon set ═══════════════
   24×24 grid · 1.7 stroke · every glyph carries the equator arc.     */
var I = {};

I.stays =
  '<path class="wash" d="M6.5 20V11a5.5 5.5 0 0 1 11 0v9z"/>' +
  '<path d="M6 20V11a6 6 0 0 1 12 0v9"/>' +
  '<path d="M4.2 20h15.6"/>' +
  '<path d="M9.4 20v-6.1a2.6 2.6 0 0 1 5.2 0V20"/>' +
  '<path class="d" d="M7.4 6.6Q12 4.3 16.6 6.6"/>' +
  '<circle class="df" cx="13.4" cy="15.1" r="1"/>';

I.roommates =
  '<path d="M5.2 20v-7.5a4.3 4.3 0 0 1 8.6 0V20"/>' +
  '<path d="M11.6 20v-8.3a4.6 4.6 0 0 1 9.2 0V20"/>' +
  '<path d="M3.4 20h17.2"/>' +
  '<path class="d" d="M6.2 6.4Q13 3.9 19.8 6.4"/>' +
  '<circle class="df" cx="12.7" cy="15.5" r="1"/>';

I.flights =
  '<path class="wash" d="M20.6 4.4 4.9 10.9l5.4 1.9 1.7 5.6z"/>' +
  '<path d="M20.6 4.4 4.3 11.1c-.6.25-.55 1.1.08 1.28l5.9 1.62 1.74 5.85c.19.62 1.04.66 1.28.06z"/>' +
  '<path d="M10.3 14 20.6 4.4"/>' +
  '<path class="d" d="M2.6 18.6q4.4-1.5 7-4.1"/>' +
  '<circle class="df" cx="2.6" cy="18.6" r=".9"/>';

I.tours =
  '<circle cx="12" cy="12" r="8.4"/>' +
  '<path d="M12 3.6v1.6M12 18.8v1.6M3.6 12h1.6M18.8 12h1.6"/>' +
  '<path class="df" d="M12 12l4.1-3.9-1.55 5.35z"/>' +
  '<path d="M12 12l-2.7 2.6"/>' +
  '<path class="d" d="M6.9 15.3q5.1 2.5 10.2 0"/>' +
  '<circle class="df" cx="12" cy="12" r="1.05"/>';

I.events =
  '<path d="M4 8.4c0-.8.6-1.4 1.4-1.4h13.2c.8 0 1.4.6 1.4 1.4v1.5a2.1 2.1 0 0 0 0 4.2v1.5c0 .8-.6 1.4-1.4 1.4H5.4c-.8 0-1.4-.6-1.4-1.4v-1.5a2.1 2.1 0 0 0 0-4.2z"/>' +
  '<path d="M9.2 7.2v9.6" stroke-dasharray="1.8 2.6"/>' +
  '<path class="d" d="M11.7 13.7a2.35 2.35 0 0 1 4.7 0"/>' +
  '<path class="d" d="M11.2 13.7h5.7"/>' +
  '<path class="df" d="M17.5 8.1l.35.87.87.35-.87.35-.35.87-.35-.87-.87-.35.87-.35z"/>';

I.rides =
  '<path class="wash" d="M4.9 15.3l1.4-4.2c.3-.9 1.1-1.5 2-1.5h6c.85 0 1.6.48 2 1.24l2.25 4.46z"/>' +
  '<path d="M5 15.4l1.35-4.1c.3-.9 1.1-1.5 2.05-1.5h5.9c.83 0 1.58.47 1.95 1.2l2.25 4.4"/>' +
  '<path d="M3.6 15.4h16.8"/>' +
  '<circle cx="7.7" cy="17.4" r="1.55"/>' +
  '<circle cx="16.3" cy="17.4" r="1.55"/>' +
  '<path class="d" d="M1.7 10.6h3M1 13.1h2.3"/>' +
  '<circle class="df" cx="18.55" cy="13" r=".85"/>';

I.food =
  '<path d="M4.4 15.6a7.6 7.6 0 0 1 15.2 0"/>' +
  '<path d="M2.8 18.6h18.4"/>' +
  '<circle cx="12" cy="6.3" r="1.15"/>' +
  '<path class="d" d="M7.6 4.4Q12 2.3 16.4 4.4"/>' +
  '<circle class="df" cx="12" cy="12.5" r=".95"/>';

I.shopping =
  '<path class="wash" d="M6.7 9.5h10.6l-.8 9.3c-.08 1-.9 1.7-1.9 1.7H9.4c-1 0-1.8-.7-1.9-1.7z"/>' +
  '<path d="M6.2 9.2h11.6l-.86 9.7a2 2 0 0 1-2 1.8H9.06a2 2 0 0 1-2-1.8z"/>' +
  '<path d="M9.1 9.2V7.4a2.9 2.9 0 0 1 5.8 0v1.8"/>' +
  '<path class="d" d="M8.2 14.3q3.8 1.9 7.6 0"/>' +
  '<path class="df" d="M12 11l.42 1.06 1.06.42-1.06.42L12 14l-.42-1.1-1.06-.42 1.06-.42z"/>';

I.carhire =
  '<circle cx="7.6" cy="8" r="3.5"/>' +
  '<path d="M10.1 10.5 17.5 18"/>' +
  '<path d="M14.5 15l1.6-1.6M16.7 17.2l1.6-1.6"/>' +
  '<circle class="df" cx="7.6" cy="8" r="1.05"/>' +
  '<path class="d" d="M11.3 4.7a6.4 6.4 0 0 1 2 2"/>';

/* Utility glyphs */
I.arrow  = '<path d="M4.5 12h15"/><path d="M13.7 6.2 19.5 12l-5.8 5.8"/><circle class="df" cx="4.5" cy="12" r=".9"/>';
I.chevr  = '<path d="M9.4 5.6 15.8 12l-6.4 6.4"/>';
I.chevl  = '<path d="M14.6 5.6 8.2 12l6.4 6.4"/>';
I.search = '<circle cx="10.8" cy="10.8" r="5.7"/><path d="M15.2 15.2 20 20"/><path class="d" d="M7.9 12.2q2.9 1.8 5.8 0"/>';
I.spark  = '<path d="M12 4.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/><circle class="df" cx="12" cy="12" r=".9"/>';
I.coin   = '<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="10.9" r="2.1"/><path class="d" d="M5.5 13.4q6.5 3.2 13 0"/><circle class="df" cx="17.8" cy="14.3" r=".95"/>';
I.pin    = '<path d="M12 20.6C12 20.6 5.8 14.9 5.8 10.3a6.2 6.2 0 0 1 12.4 0C18.2 14.9 12 20.6 12 20.6z"/><circle cx="12" cy="10.3" r="2.2"/><path class="d" d="M9.2 4.5Q12 3.3 14.8 4.5"/><circle class="df" cx="12" cy="10.3" r=".85"/>';
I.calendar='<rect x="4.2" y="5.8" width="15.6" height="14.2" rx="2.6"/><path d="M4.2 10.3h15.6M8.4 3.6v3M15.6 3.6v3"/><circle class="df" cx="12" cy="14.9" r="1"/>';
I.check  = '<path d="M5 12.7l4.3 4.3L19 7.4"/><circle class="df" cx="19" cy="7.4" r=".9"/>';
I.star   = '<path d="M12 4.6l2.15 4.55 4.85.63-3.6 3.4.94 4.82L12 15.6 7.66 18l.94-4.82-3.6-3.4 4.85-.63z"/><circle class="df" cx="12" cy="11.4" r=".85"/>';
I.close  = '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>';
I.menu   = '<path d="M4.6 7.4h14.8M4.6 12h11.2M4.6 16.6h14.8"/><circle class="df" cx="18.3" cy="12" r=".95"/>';
I.user   = '<circle cx="12" cy="8.2" r="3.6"/><path d="M5.2 19.6a6.9 6.9 0 0 1 13.6 0"/><path class="d" d="M8.6 16.4q3.4-1.6 6.8 0"/>';

function glyphInto(svgEl, key){
  if (!svgEl || !I[key]) return false;
  svgEl.setAttribute('viewBox','0 0 24 24');
  svgEl.setAttribute('fill','none');
  svgEl.setAttribute('stroke','currentColor');
  svgEl.setAttribute('stroke-width','1.7');
  svgEl.setAttribute('stroke-linecap','round');
  svgEl.setAttribute('stroke-linejoin','round');
  svgEl.setAttribute('aria-hidden','true');
  if (svgEl.classList) svgEl.classList.add('apa-glyph');
  svgEl.innerHTML = I[key];
  return true;
}
function glyphSvg(key, extraStyle){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" class="apa-glyph" aria-hidden="true" ' +
    'style="width:100%;height:100%;display:block;' + (extraStyle||'') + '">' + I[key] + '</svg>';
}

/* Sitewide legacy-arrow upgrade: known stock paths → Apatmento arrow */
var LEGACY = {
  'M5 12h14M12 5l7 7-7 7':'arrow',
  'M5 12h14M13 6l6 6-6 6':'arrow',
  'm9 18 6-6-6-6':'chevr',
  'M9 18l6-6-6-6':'chevr',
  'm15 18-6-6 6-6':'chevl'
};

function injectIcons(){
  /* Category PNG icon mapping */
  var ICON_IMGS = {
    stays: 'icon-stays.png',
    flights: 'icon-flights.png',
    tours: 'icon-tours.png',
    events: 'icon-events.png',
    rides: 'icon-rides.png',
    food: 'icon-food.png',
    shopping: 'icon-shopping.png',
    carhire: 'icon-carhire.png',
    roommates: 'icon-roommates.png'
  };
  /* Service tiles + intro parade + hero cards */
  qsa('[data-svc]').forEach(function(el){
    var key = el.getAttribute('data-svc');
    if (ICON_IMGS && ICON_IMGS[key]) {
      var ico = el.querySelector('.svc-tile-ico,.svc-fly-ico');
      if (ico) safe(function(){ ico.innerHTML = '<img src="' + ICON_IMGS[key] + '" alt="' + key + '" width="216" height="216" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;padding:6px;display:block;">'; return; });
    }
    var svg = el.querySelector('svg');
    if (svg) safe(function(){ glyphInto(svg, key); });
  });
  var pairs = [
    ['.svc-hero-stays .svc-hero-icon svg','stays'],
    ['.svc-hero-rooms .svc-hero-icon svg','roommates']
  ];
  pairs.forEach(function(p){
    var svg = qs(p[0]);
    if (svg) safe(function(){ glyphInto(svg, p[1]); });
  });
  /* Icon image mapping */
  var ICON_IMGS = {
    stays: 'icon-stays.png',
    flights: 'icon-flights.png',
    tours: 'icon-tours.png',
    events: 'icon-events.png',
    rides: 'icon-rides.png',
    food: 'icon-food.png',
    shopping: 'icon-shopping.png',
    carhire: 'icon-carhire.png',
    roommates: 'icon-roommates.png'
  };
  qsa('.svc-fly').forEach(function(fly){
    var nameEl = fly.querySelector('.svc-fly-name');
    var box = fly.querySelector('.svc-fly-ico');
    if (!nameEl || !box) return;
    var key = (nameEl.textContent||'').toLowerCase().replace(/[^a-z]/g,'');
    if (ICON_IMGS[key]) {
      safe(function(){ box.innerHTML = '<img src="' + ICON_IMGS[key] + '" alt="' + (nameEl.textContent||'') + '" width="216" height="216" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;padding:10px;display:block;">'; });
    } else if (I[key]) {
      safe(function(){ box.innerHTML = glyphSvg(key,'padding:22%'); });
    }
  });
  /* Explicit hooks anywhere */
  qsa('[data-apa-icon]').forEach(function(el){
    var key = el.getAttribute('data-apa-icon');
    if (!I[key]) return;
    safe(function(){
      if (el.tagName && el.tagName.toLowerCase() === 'svg') glyphInto(el, key);
      else el.innerHTML = glyphSvg(key);
    });
  });
  /* Legacy arrow/chevron sweep — instant sitewide consistency */
  qsa('svg').forEach(function(svg){
    safe(function(){
      if (svg.classList && svg.classList.contains('apa-glyph')) return;
      var kids = svg.children;
      if (!kids || kids.length < 1 || kids.length > 2) return;
      var ds = [];
      for (var k = 0; k < kids.length; k++){
        if (!kids[k].getAttribute || kids[k].tagName.toLowerCase() !== 'path') return;
        var d = kids[k].getAttribute('d');
        if (!d) return;
        ds.push(d.trim());
      }
      var key = LEGACY[ds.join('')] || LEGACY[ds[0]];
      if (key) glyphInto(svg, key);
    });
  });
}

/* ═══ 2 · MERIDIAN DEFS + LOADER ═════════════════════════════════════ */
function meridianDefs(){
  return '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="apaLegGrad" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#6D28FF"/><stop offset="1" stop-color="#4F6DFF"/>' +
    '</linearGradient>' +
    '<linearGradient id="apaEqGrad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#6D28FF"/><stop offset="0.45" stop-color="#4EE0C8"/><stop offset="1" stop-color="#F5B12E"/>' +
    '</linearGradient>' +
  '</defs></svg>';
}
function ensureDefs(){
  if (document.getElementById('apaEqGrad')) return;
  var host = document.createElement('div');
  host.setAttribute('aria-hidden','true');
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  host.innerHTML = meridianDefs();
  document.body.appendChild(host);
}
function meridianMark(){
  return '<svg class="apa-mark" viewBox="0 0 64 64" aria-hidden="true">' +
    '<path class="leg" d="M15 52 32 13"/>' +
    '<path class="leg leg-r" d="M32 13 49 52"/>' +
    '<path class="horizon" d="M6 40 Q32 31 58 40"/>' +
    '<circle class="orbit-dot" r="3"/>' +
  '</svg>';
}
function meridianLoaderHTML(){
  return '<div class="apa-meridian">' +
    '<img class="apa-load-emblem" src="/cabana-emblem.png" alt="Cabana" onerror="this.style.display=\'none\'"/>' +
    '<div class="apa-load-word">Welcome to <em>Cabana</em></div>' +
    '<div class="apa-load-tag">Where journeys begin</div>' +
    '<div class="apa-load-line"><i></i><b></b></div>' +
  '</div>';
}
function upgradeLoaders(){
  var l = document.getElementById('loader');
  if (l && !l.querySelector('.apa-meridian')) {
    safe(function(){ l.innerHTML = meridianLoaderHTML(); });
  }
}

/* ═══ 3 · HORIZON ROUTE VEIL ═════════════════════════════════════════ */
var veil = null;
function buildVeil(){
  if (veil) return veil;
  veil = document.createElement('div');
  veil.id = 'apa-veil';
  veil.innerHTML = '<div class="vp vp-t"></div><div class="vp vp-b"></div><div class="vl"></div>';
  document.body.appendChild(veil);
  return veil;
}
var navigating = false;
function clearVeil(){
  navigating = false;
  if (veil) veil.classList.remove('close');
}
function veilGo(fn){
  if (navigating) return;
  navigating = true;
  if (REDUCE) { fn(); return; }
  buildVeil().classList.add('close');
  setTimeout(fn, 300);
  /* Failsafe: if navigation is cancelled/blocked, never strand the page. */
  setTimeout(clearVeil, 1400);
}
function isInternalNav(a){
  if (!a || !a.href) return false;
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download')) return false;
  var href = a.getAttribute('href') || '';
  if (!href || href.charAt(0) === '#') return false;
  if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) return false;
  var url;
  try { url = new URL(a.href, location.href); } catch(e){ return false; }
  if (url.origin !== location.origin) return false;
  if (url.pathname === location.pathname && url.hash) return false;
  return true;
}
function bindVeil(){
  document.addEventListener('click', function(e){
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (t && t.closest && t.closest('[data-rail],[data-apa],.apa-sheet')) return;
    var a = t && t.closest ? t.closest('a[href]') : null;
    if (!isInternalNav(a)) return;
    e.preventDefault();
    var dest = a.href;
    veilGo(function(){ location.assign(dest); });
  }, true);

  /* Wrap tile navigation if the page defines it */
  setTimeout(function(){
    safe(function(){
      if (typeof window.navigateToService === 'function' && !window.navigateToService.__apa){
        var orig = window.navigateToService;
        var wrapped = function(s){ veilGo(function(){ orig(s); }); };
        wrapped.__apa = 1;
        window.navigateToService = wrapped;
      }
    });
  }, 700);

  window.addEventListener('pageshow', clearVeil);
  window.addEventListener('pagehide', clearVeil);
  window.addEventListener('popstate', clearVeil);
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') clearVeil();
  });
}

/* ═══ 4 · SCROLL CHOREOGRAPHY ════════════════════════════════════════ */
function choreograph(){
  if (REDUCE || !('IntersectionObserver' in window)) return;
  var sel = '.section,.svc-hero,.svc,.prop-grid>*,.promise>*,.how>*,.stmt-line,[data-reveal]';
  var nodes = qsa(sel).slice(0,90);
  if (!nodes.length) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin:'0px 0px -8% 0px', threshold:.12 });
  nodes.forEach(function(n,i){
    if (n.classList.contains('in')) return;
    n.classList.add('reveal');
    n.style.transitionDelay = ((i % 6) * 55) + 'ms';
    io.observe(n);
  });
  /* Meridian underline on section titles */
  qsa('.section-title').forEach(function(t){
    t.classList.add('apa-underline');
    io.observe(t);
  });
}

/* ═══ 5 · FEEL — press, sheen, aurora gold ═══════════════════════════ */
function feel(){
  qsa('button,[role="button"],.svc,.svc-hero,.btn,.card-cta').slice(0,160).forEach(function(el){
    el.classList.add('apa-press');
  });
  qsa('.nav-cta,.hero-cta,.hero-portal-btn,.btn-primary').forEach(function(el){
    el.classList.add('apa-sheen');
  });
  qsa('.aurora,.intro-aurora,.loader-aurora').forEach(function(a){
    if (a.querySelector('.ab-gold')) return;
    var g = document.createElement('div');
    g.className = 'aurora-blob ab-gold';
    a.appendChild(g);
  });
}

/* ═══ 6 · BOOT ═══════════════════════════════════════════════════════ */
function boot(){
  safe(function(){
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', '#6D28FF');
  });
  safe(ensureDefs);
  safe(upgradeLoaders);
  safe(bindVeil);
  document.documentElement.classList.add('brand-ready');
  var defer = window.requestAnimationFrame || function(fn){ setTimeout(fn, 16); };
  defer(function(){
    safe(injectIcons);
    safe(choreograph);
    safe(feel);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
