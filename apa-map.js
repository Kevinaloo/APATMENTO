/* ════════════════════════════════════════════════════════════════════
   apa-map.js — Cabana's shared map layer.

   One module, four maps. Every page that shows a location goes
   through here, so a guest sees the same pin language whether they
   are browsing results, reading a listing, or standing on the
   payment page.

     ApaMap.approx(el, o)          area map — pre-booking, blurred
     ApaMap.exact(el, o)           exact pin — after payment
     ApaMap.picker(el, o)          draggable pin — for hosts
     ApaMap.results(el, list, o)   every listing at once, priced

   Two rules the whole file is built around:

   1. An exact address is never sent to the browser before payment.
      The approximate map is drawn from an offset that is *derived
      from the listing id*, not rolled fresh on each load. Random
      jitter feels private and isn't: reload a listing twenty times,
      average the centres, and the true point falls out. A stable
      offset leaks nothing no matter how often you look.

   2. Leaflet is loaded once, lazily, and only on pages that ask
      for a map. Nothing here costs a byte until a map is built.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.ApaMap) return;

  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

  /* ── Basemaps ──────────────────────────────────────────────────────

     CARTO stopped serving its raster basemaps anonymously. Every tile
     now comes back stamped API KEY REQUIRED, which is the watermark
     that was lying diagonally across the results map. Nothing in this
     registry takes a key, and nothing in it bills.

       daylight   OpenStreetMap's own tiles. In Nairobi, Accra and
                  Lagos this is not a close call — OSM carries the
                  estates, the access roads and the shop names that
                  the global commercial sets flatten into blank
                  polygons, and a guest comparing Syokimau to South C
                  is reading exactly that detail. Toned down with a
                  filter so it reads as Cabana rather than raw OSM.
       canvas     Esri's light grey canvas. Almost no colour of its
                  own, so the price pills are the only saturated
                  thing on screen. Airbnb's trick, and it works.
       satellite  Esri world imagery, with a names-and-boundaries
                  layer over it so a roof is still an address.
       noir       The canvas, desaturated, for dark surfaces.

     Two rules hold across the table:

     `filter` is applied to the tile pane alone and never to the map
     container. A desaturated basemap under full-colour pins is the
     design; desaturated pins are a bug.

     `fallback` is not decoration either. OSM's tile policy is a
     courtesy, not a contract, and the day it rate-limits Cabana the
     map must degrade to another source rather than to a grey box. */

  var OSM_ATTRIB =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  var ESRI_ATTRIB =
    'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';
  var ESRI_IMAGERY_ATTRIB =
    'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics';

  var ESRI_STREET =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

  var BASEMAPS = {
    daylight: {
      label: 'Map',
      hint: 'Streets and landmarks',
      base: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attrib: OSM_ATTRIB,
      labels: null,
      maxNativeZoom: 19,
      filter: 'saturate(.66) contrast(1.05) brightness(1.04)',
      dark: false,
      fallback: { url: ESRI_STREET, attrib: ESRI_ATTRIB, maxNativeZoom: 19 }
    },
    canvas: {
      label: 'Minimal',
      hint: 'Quiet, for comparing prices',
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attrib: ESRI_ATTRIB,
      labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      maxNativeZoom: 16,
      filter: 'saturate(.92) brightness(1.03)',
      dark: false,
      fallback: { url: ESRI_STREET, attrib: ESRI_ATTRIB, maxNativeZoom: 19 }
    },
    satellite: {
      label: 'Satellite',
      hint: 'See the actual roof',
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: ESRI_IMAGERY_ATTRIB,
      labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      maxNativeZoom: 19,
      filter: 'saturate(1.05) contrast(1.04)',
      dark: true,
      fallback: null
    },
    noir: {
      label: 'Noir',
      hint: 'For dark surfaces',
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attrib: ESRI_ATTRIB,
      labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      maxNativeZoom: 16,
      filter: 'grayscale(1) contrast(1.16) brightness(.96)',
      dark: false,
      fallback: null
    }
  };

  var BASEMAP_ORDER = ['daylight', 'canvas', 'satellite', 'noir'];

  /* Callers written against the old CARTO names still work. A style
     string that no longer resolves to anything is a silently blank
     map, which is the worst failure this file can have. */
  var BASEMAP_ALIAS = {
    voyager: 'daylight', positron: 'canvas', light: 'canvas',
    dark: 'noir', imagery: 'satellite', hybrid: 'satellite', map: 'daylight'
  };

  function basemap(name) {
    var key = String(name || '').toLowerCase();
    return BASEMAPS[key] || BASEMAPS[BASEMAP_ALIAS[key]] || BASEMAPS.daylight;
  }

  /* ── Leaflet loader ───────────────────────────────────────────── */

  var _leaflet = null;

  function load() {
    if (window.L) return Promise.resolve(window.L);
    if (_leaflet) return _leaflet;

    _leaflet = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-apa-leaflet]')) {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = LEAFLET_CSS;
        css.setAttribute('data-apa-leaflet', '');
        document.head.appendChild(css);
      }
      var js = document.createElement('script');
      js.src = LEAFLET_JS;
      js.async = true;
      js.onload = function () {
        window.L ? resolve(window.L) : reject(new Error('Leaflet loaded but L is missing'));
      };
      js.onerror = function () { reject(new Error('Leaflet failed to load')); };
      document.head.appendChild(js);
    });

    /* A failed load must not poison the cache — the next caller
       deserves a fresh attempt, not a rejected promise forever. */
    _leaflet.catch(function () { _leaflet = null; });
    return _leaflet;
  }

  /* Put a basemap under a map and keep a handle on it, so the style
     can be swapped later without tearing the map down.

     Attribution is re-registered on every swap rather than re-pointed.
     Leaflet's credit line is driven by layer add/remove events, not by
     a layer's current URL, so calling setUrl on a live layer leaves
     the map crediting whoever used to be under it — which for a
     basemap licence is not a cosmetic mistake. */
  function paintBase(L, map, style, o) {
    o = o || {};
    var maxZoom = o.maxZoom || 20;

    var handle = {
      style: null,
      def: null,
      base: null,
      labels: null,
      set: setStyle,
      cycle: cycle,
      destroy: teardown
    };

    setStyle(style);
    return handle;

    function teardown() {
      if (handle.base) { map.removeLayer(handle.base); handle.base = null; }
      if (handle.labels) { map.removeLayer(handle.labels); handle.labels = null; }
    }

    function setStyle(next) {
      var def = basemap(next);
      var key = keyFor(def);
      if (handle.style === key) return handle;

      teardown();

      handle.style = key;
      handle.def = def;
      handle.base = layerFor(def.base, def.attrib, def.maxNativeZoom);
      handle.base.addTo(map);
      guard(handle.base, def);

      if (def.labels) {
        /* Same pane as the base, added after it, so DOM order puts the
           names on top of the imagery and both take the tint together. */
        handle.labels = layerFor(def.labels, '', def.maxNativeZoom);
        handle.labels.addTo(map);
      }

      var pane = map.getPane('tilePane');
      if (pane) {
        pane.style.filter = def.filter || 'none';
        pane.style.willChange = 'filter';
      }

      var box = map.getContainer();
      if (box) {
        box.setAttribute('data-basemap', key);
        box.classList.toggle('apa-map-dark', !!def.dark);
      }

      map.fire('apa:basemap', { style: key, def: def });
      return handle;
    }

    function cycle(list) {
      var order = list || o.order || BASEMAP_ORDER;
      var at = order.indexOf(handle.style);
      return setStyle(order[(at + 1) % order.length]);
    }

    function layerFor(url, attrib, native) {
      return L.tileLayer(url, {
        maxZoom: maxZoom,
        maxNativeZoom: native || 19,
        attribution: attrib,
        updateWhenIdle: false,
        keepBuffer: 3,
        detectRetina: true,
        className: 'apa-tile'
      });
    }

    /* A single 404 over the ocean is normal. A run of them is the tile
       server saying no, and at that point a second source beats an
       apology. */
    function guard(layer, def) {
      if (!def.fallback) return;
      var misses = 0, swapped = false;
      layer.on('tileerror', function () {
        if (swapped || ++misses < 4) return;
        swapped = true;
        var alt = layerFor(def.fallback.url, def.fallback.attrib, def.fallback.maxNativeZoom);
        map.removeLayer(layer);
        alt.addTo(map);
        if (handle.labels) handle.labels.bringToFront();
        handle.base = alt;
        console.warn('[apa-map] basemap fell back to a second source');
      });
    }

    function keyFor(def) {
      for (var k in BASEMAPS) if (BASEMAPS[k] === def) return k;
      return 'daylight';
    }
  }

  /* Kept for callers that only ever wanted a layer they could add
     themselves. New code should reach for paintBase. */
  function tileLayer(L, style) {
    var def = basemap(style);
    return L.tileLayer(def.base, {
      maxZoom: 20,
      maxNativeZoom: def.maxNativeZoom,
      attribution: def.attrib
    });
  }

  /* ── Deterministic blur ───────────────────────────────────────── */

  /* FNV-1a. Small, fast, and — the only property that matters here —
     stable. The same listing id yields the same offset on every
     device, every session, forever. */
  function hash32(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* Move a point somewhere inside a disc of `radius` metres, keeping
     it off the centre. If the true address sat at the middle of the
     circle we drew, the circle would be a bullseye rather than a
     blur, so the offset is held to the outer 45–90% band. The true
     point still lies inside the circle the guest is shown — the
     promise on screen stays honest. */
  function blur(lat, lng, seed, radius) {
    radius = radius || 500;
    var a = hash32(String(seed));
    var d = hash32(String(seed) + '::dist');

    var angle = (a % 36000) / 36000 * Math.PI * 2;
    var frac = 0.45 + (d % 10000) / 10000 * 0.45;
    var metres = radius * frac;

    var dLat = (metres * Math.cos(angle)) / 111320;
    var dLng = (metres * Math.sin(angle)) / (111320 * Math.cos(lat * Math.PI / 180) || 1);

    return [lat + dLat, lng + dLng];
  }

  /* ── Geocoding ────────────────────────────────────────────────── */

  /* Nominatim asks for no more than one request a second and takes a
     dim view of bursts. Every lookup in the app funnels through this
     one chain, so a results page that needs eight areas queues them
     politely instead of getting the whole platform rate-limited. */
  var _chain = Promise.resolve();

  function throttled(fn) {
    var out = _chain.then(fn, fn);
    _chain = out.then(pause, pause);
    return out;
    function pause() { return new Promise(function (r) { setTimeout(r, 1100); }); }
  }

  function cacheGet(key) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function cacheSet(key, val) {
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* Forward geocode. Note the absence of a country filter: Cabana
     lists in Abidjan, Accra, Lagos and Amsterdam, and the old
     five-country allowlist quietly made every one of those
     unsearchable. Callers that want a regional bias pass `country`
     themselves. */
  function geocode(q, opts) {
    opts = opts || {};
    q = String(q || '').trim();
    if (q.length < 3) return Promise.resolve([]);

    /* apa-geo.js is the platform's location layer: it proxies through
       /api/geocode (which can identify itself to OSM and hold provider
       keys), ranks by proximity, and caches across pages. When it is on
       the page, defer to it — two geocoders with two answers for the
       same address is exactly the drift this module exists to prevent.
       The direct path below stays for pages that load only the map. */
    if (window.ApaGeo) {
      return window.ApaGeo.search(q, { limit: opts.limit || 5, country: opts.country })
        .then(function (rows) {
          return rows.map(function (r) {
            return {
              lat: r.lat, lng: r.lng, label: r.label, short: r.short,
              type: r.kind, country: r.countryCode || null
            };
          });
        });
    }

    var key = 'apa_gc:' + q.toLowerCase() + '|' + (opts.country || '*');
    var hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);

    return throttled(function () {
      var u = new URL('https://nominatim.openstreetmap.org/search');
      u.searchParams.set('q', q);
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('addressdetails', '1');
      u.searchParams.set('limit', String(opts.limit || 5));
      if (opts.country) u.searchParams.set('countrycodes', opts.country);

      return fetch(u.toString(), { headers: { 'Accept-Language': 'en' } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          var out = (rows || []).map(function (x) {
            return {
              lat: parseFloat(x.lat),
              lng: parseFloat(x.lon),
              label: x.display_name,
              short: shortLabel(x),
              type: x.type,
              country: (x.address && x.address.country_code) || null
            };
          }).filter(function (x) { return isFinite(x.lat) && isFinite(x.lng); });
          cacheSet(key, out);
          return out;
        })
        .catch(function () { return []; });
    });
  }

  function reverse(lat, lng) {
    if (window.ApaGeo) {
      return window.ApaGeo.reverse(lat, lng).then(function (r) {
        if (!r) return null;
        return {
          lat: lat, lng: lng, label: r.label, short: r.short,
          address: { road: r.street, suburb: r.area, city: r.city,
                     state: r.state, country: r.country, postcode: r.postcode },
          country: r.countryCode || null
        };
      });
    }

    var key = 'apa_rgc:' + lat.toFixed(5) + ',' + lng.toFixed(5);
    var hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);

    return throttled(function () {
      var u = new URL('https://nominatim.openstreetmap.org/reverse');
      u.searchParams.set('lat', String(lat));
      u.searchParams.set('lon', String(lng));
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('addressdetails', '1');

      return fetch(u.toString(), { headers: { 'Accept-Language': 'en' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (x) {
          if (!x) return null;
          var out = {
            lat: lat,
            lng: lng,
            label: x.display_name,
            short: shortLabel(x),
            address: x.address || {},
            country: (x.address && x.address.country_code) || null
          };
          cacheSet(key, out);
          return out;
        })
        .catch(function () { return null; });
    });
  }

  /* Nominatim's display_name runs to eight comma-separated parts.
     Hosts want to recognise the place, not read a postal record. */
  function shortLabel(x) {
    var a = x.address || {};
    var parts = [
      a.road || a.pedestrian || a.neighbourhood || a.suburb || x.name,
      a.suburb || a.neighbourhood || a.city_district,
      a.city || a.town || a.village || a.county,
      a.country
    ];
    var seen = {};
    return parts.filter(function (p) {
      if (!p || seen[p]) return false;
      seen[p] = 1;
      return true;
    }).slice(0, 3).join(', ') || String(x.display_name || '').split(',').slice(0, 3).join(',');
  }

  /* ── Shared styling ───────────────────────────────────────────── */

  var CSS = [
    /* ── Surface ──────────────────────────────────────────────────
       The container owns the radius and the clip so a caller only has
       to give the thing a box. Everything inside is painted against
       the same two greys, which is why a half-loaded map still looks
       deliberate rather than broken. */
    '.apa-map{position:relative;width:100%;background:#EDEFF6;isolation:isolate;',
    '--apa-r:20px;--apa-ink:#12132A;--apa-soft:#5A5C78;--apa-line:rgba(10,10,20,.09);',
    '--apa-glass:rgba(252,252,253,.9);--apa-violet:#7B2FF7;--apa-blue:#4361FF;}',
    '.apa-map .leaflet-container{font:inherit;background:#EDEFF6;outline:none;}',
    '.apa-map .leaflet-control-attribution{font-size:9.5px;line-height:1.5;padding:1px 7px;',
    'background:rgba(255,255,255,.74);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    'border-radius:8px 0 0 0;color:#6C6E88;}',
    '.apa-map .leaflet-control-attribution a{color:#5A5C78;}',

    /* Tiles fade in instead of snapping. On a slow connection the
       difference between a map that assembles and a map that flickers
       is entirely this. */
    '.apa-map .leaflet-tile-container img{transition:opacity .32s ease;}',
    '.apa-map .leaflet-tile{image-rendering:-webkit-optimize-contrast;}',
    '.apa-map .leaflet-fade-anim .leaflet-tile{will-change:opacity;}',

    /* ── Zoom control ─────────────────────────────────────────────
       Leaflet's default is a browser chrome artefact from 2011. This
       is the same control wearing the product's clothes. */
    '.apa-map .leaflet-control-zoom{border:none!important;box-shadow:0 6px 22px rgba(10,10,20,.14)!important;',
    'border-radius:14px;overflow:hidden;}',
    '.apa-map .leaflet-control-zoom a{width:36px;height:36px;line-height:36px;color:#2A2B45;',
    'background:rgba(252,252,253,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
    'border:none;border-bottom:1px solid rgba(10,10,20,.07);font-size:19px;font-weight:500;',
    'transition:background .16s ease,color .16s ease;}',
    '.apa-map .leaflet-control-zoom a:last-child{border-bottom:none;}',
    '.apa-map .leaflet-control-zoom a:hover{background:#fff;color:var(--apa-violet);}',
    '.apa-map .leaflet-bar a.leaflet-disabled{color:#B9BBCE;background:rgba(252,252,253,.8);}',
    '@media(max-width:760px){.apa-map .leaflet-control-zoom{display:none;}}',

    /* ── Chips ────────────────────────────────────────────────────
       One badge language for every map on the platform: the legal
       note, the actions, the state. */
    '.apa-map-chip{position:absolute;z-index:640;display:inline-flex;align-items:center;gap:6px;',
    'padding:8px 13px;border-radius:100px;background:var(--apa-glass);',
    '-webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);',
    'border:1px solid var(--apa-line);font-size:11.5px;font-weight:650;color:#4A4C66;',
    'box-shadow:0 3px 14px rgba(10,10,20,.1);line-height:1;max-width:calc(100% - 24px);',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
    'transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s ease,color .16s ease,background .16s ease;}',
    '.apa-map-chip.bl{left:12px;bottom:12px;}',
    '.apa-map-chip.br{right:12px;bottom:12px;}',
    '.apa-map-chip.tl{left:12px;top:12px;}',
    '.apa-map-chip.tr{right:12px;top:12px;}',
    '.apa-map-chip button,button.apa-map-chip{cursor:pointer;font:inherit;}',
    'button.apa-map-chip:hover{color:var(--apa-violet);border-color:rgba(123,47,247,.4);',
    'transform:translateY(-1px);box-shadow:0 6px 20px rgba(123,47,247,.18);}',
    'button.apa-map-chip:active{transform:translateY(0) scale(.97);}',
    'button.apa-map-chip:focus-visible{outline:2px solid var(--apa-violet);outline-offset:2px;}',
    '.apa-map-chip.static{pointer-events:none;}',
    '.apa-map-chip svg{width:13px;height:13px;flex:none;}',

    /* ── Control stack ────────────────────────────────────────────
       Locate, expand and basemap live in one column top-right so the
       corner reads as a toolbar rather than three loose buttons. */
    '.apa-map-stack{position:absolute;top:12px;right:12px;z-index:645;display:flex;',
    'flex-direction:column;gap:8px;align-items:flex-end;}',
    '.apa-map-btn{width:38px;height:38px;border-radius:13px;border:1px solid var(--apa-line);',
    'background:var(--apa-glass);-webkit-backdrop-filter:blur(14px) saturate(150%);',
    'backdrop-filter:blur(14px) saturate(150%);color:#2A2B45;display:flex;align-items:center;',
    'justify-content:center;cursor:pointer;box-shadow:0 3px 14px rgba(10,10,20,.1);padding:0;',
    'transition:transform .18s cubic-bezier(.22,1,.36,1),color .16s ease,box-shadow .18s ease;}',
    '.apa-map-btn svg{width:17px;height:17px;}',
    '.apa-map-btn:hover{color:var(--apa-violet);transform:translateY(-1px);',
    'box-shadow:0 6px 20px rgba(123,47,247,.2);}',
    '.apa-map-btn:active{transform:scale(.94);}',
    '.apa-map-btn:focus-visible{outline:2px solid var(--apa-violet);outline-offset:2px;}',
    '.apa-map-btn.on{color:#fff;background:linear-gradient(135deg,var(--apa-blue),var(--apa-violet));',
    'border-color:transparent;box-shadow:0 6px 20px rgba(67,97,255,.4);}',
    '.apa-map-btn.busy svg{animation:apaSpin .9s linear infinite;}',
    '@keyframes apaSpin{to{transform:rotate(360deg);}}',

    /* Basemap switcher: a stack of thumbnails that opens off the
       toolbar. Naming a basemap tells a guest nothing; showing one
       tells them everything. */
    '.apa-map-skins{display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:15px;',
    'background:var(--apa-glass);-webkit-backdrop-filter:blur(14px) saturate(150%);',
    'backdrop-filter:blur(14px) saturate(150%);border:1px solid var(--apa-line);',
    'box-shadow:0 8px 28px rgba(10,10,20,.16);opacity:0;transform:translateY(-6px) scale(.96);',
    'pointer-events:none;transform-origin:top right;',
    'transition:opacity .2s ease,transform .22s cubic-bezier(.22,1,.36,1);}',
    '.apa-map-skins.open{opacity:1;transform:none;pointer-events:auto;}',
    '.apa-map-skin{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 5px;border:none;',
    'background:transparent;border-radius:11px;cursor:pointer;font:inherit;font-size:11.5px;',
    'font-weight:650;color:#4A4C66;white-space:nowrap;transition:background .16s ease,color .16s ease;}',
    '.apa-map-skin:hover{background:rgba(123,47,247,.08);color:var(--apa-violet);}',
    '.apa-map-skin.on{background:rgba(123,47,247,.12);color:var(--apa-violet);}',
    '.apa-map-skin i{width:26px;height:26px;border-radius:8px;flex:none;display:block;',
    'border:1px solid rgba(10,10,20,.1);}',
    '.apa-map-skin[data-skin="daylight"] i{background:linear-gradient(135deg,#E8EDE4,#CFE0C8 45%,#DDE6EF);}',
    '.apa-map-skin[data-skin="canvas"] i{background:linear-gradient(135deg,#F2F2F4,#E2E3E8);}',
    '.apa-map-skin[data-skin="satellite"] i{background:linear-gradient(135deg,#3F5B34,#8A7A4E 55%,#2E4258);}',
    '.apa-map-skin[data-skin="noir"] i{background:linear-gradient(135deg,#DADADA,#9C9C9C);}',

    /* ── Loading ──────────────────────────────────────────────────
       A slow tile server must never show a bare grey rectangle with
       no explanation. */
    '.apa-map-skel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    'flex-direction:column;gap:9px;color:#8E90AD;font-size:12px;font-weight:600;z-index:600;',
    'background:#EDEFF6;transition:opacity .4s ease;}',
    '.apa-map-skel.gone{opacity:0;pointer-events:none;}',
    '.apa-map-skel .dot{width:28px;height:28px;border-radius:50%;',
    'background:linear-gradient(135deg,#B8A4F4,#7B2FF7);',
    'opacity:.75;animation:apaMapPulse 1.5s ease-in-out infinite;}',
    '@keyframes apaMapPulse{0%,100%{transform:scale(.8);opacity:.45;}50%{transform:scale(1);opacity:.9;}}',

    /* ── Pins ─────────────────────────────────────────────────────── */
    '.apa-pin{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;',
    'justify-content:center;font-size:15px;background:linear-gradient(135deg,#4361FF,#7B2FF7);',
    'border:3px solid #fff;box-shadow:0 4px 14px rgba(67,97,255,.45);}',
    '.apa-pin-drag{cursor:grab;}',
    '.apa-pin-drag:active{cursor:grabbing;}',
    /* A soft halo under the approximate circle, so the blurred area
       reads as a place rather than as a drawing error. */
    '.apa-halo{animation:apaHalo 3.6s ease-in-out infinite;transform-origin:center;}',
    '@keyframes apaHalo{0%,100%{opacity:.5;}50%{opacity:.85;}}',

    /* ── Price bubbles ────────────────────────────────────────────
       The pill is the product on the map. It gets the same care as a
       card: a resting state, a hover, a selected state that reads at a
       glance, and a visited state so a guest can see where they have
       already been. */
    '.apa-price{padding:6px 11px;border-radius:100px;background:#fff;color:#0A0A14;',
    'font-size:12px;font-weight:750;white-space:nowrap;border:1.5px solid rgba(10,10,20,.1);',
    'box-shadow:0 3px 12px rgba(10,10,20,.18);cursor:pointer;',
    'transition:transform .2s cubic-bezier(.22,1,.36,1),background .18s ease,color .18s ease,',
    'box-shadow .18s ease,border-color .18s ease;}',
    '.apa-price:hover{transform:scale(1.09);box-shadow:0 6px 18px rgba(10,10,20,.24);',
    'border-color:rgba(123,47,247,.5);}',
    '.apa-price.on{background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;',
    'border-color:transparent;transform:scale(1.14);box-shadow:0 8px 24px rgba(67,97,255,.5);}',
    '.apa-price.seen{background:#F1F2F9;color:#70728C;border-color:rgba(10,10,20,.07);}',
    '.apa-price.seen.on{background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;}',
    '.apa-map-dark .apa-price{border-color:rgba(255,255,255,.55);',
    'box-shadow:0 3px 14px rgba(0,0,0,.4);}',
    '.apa-cluster{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;',
    'justify-content:center;font-size:13.5px;font-weight:800;color:#fff;cursor:pointer;',
    'background:linear-gradient(135deg,#4361FF,#7B2FF7);border:3px solid #fff;',
    'box-shadow:0 4px 16px rgba(67,97,255,.45);',
    'transition:transform .2s cubic-bezier(.22,1,.36,1);}',
    '.apa-cluster:hover{transform:scale(1.09);}',

    /* ── Peek card ────────────────────────────────────────────────
       Tapping a pin on a phone used to close the map to open a
       drawer, which threw away the geography the guest was reading.
       The card now rides at the bottom of the map and the rail scrolls
       with the pins, so choosing between four flats never costs the
       map. */
    '.apa-map-peek{position:absolute;left:0;right:0;bottom:0;z-index:650;',
    'display:flex;gap:10px;padding:10px 12px calc(12px + env(safe-area-inset-bottom));',
    'overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;',
    '-webkit-overflow-scrolling:touch;scrollbar-width:none;',
    'transform:translateY(115%);transition:transform .34s cubic-bezier(.22,1,.36,1);}',
    '.apa-map-peek::-webkit-scrollbar{display:none;}',
    '.apa-map-peek.open{transform:none;}',
    '.apa-peek-card{flex:0 0 min(86%,320px);scroll-snap-align:center;display:flex;gap:11px;',
    'padding:9px;border-radius:17px;background:rgba(252,252,253,.96);',
    '-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);',
    'border:1px solid var(--apa-line);box-shadow:0 10px 34px rgba(10,10,20,.2);',
    'cursor:pointer;text-align:left;font:inherit;align-items:center;',
    'transition:box-shadow .2s ease,transform .2s cubic-bezier(.22,1,.36,1);}',
    '.apa-peek-card:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(10,10,20,.26);}',
    '.apa-peek-card.on{border-color:rgba(123,47,247,.55);',
    'box-shadow:0 12px 36px rgba(123,47,247,.28);}',
    '.apa-peek-img{width:74px;height:74px;border-radius:12px;flex:none;object-fit:cover;',
    'background:linear-gradient(135deg,#B8A4F4,#7B2FF7);display:block;}',
    '.apa-peek-body{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;}',
    '.apa-peek-where{font-size:10.5px;font-weight:700;color:#8E90AD;text-transform:uppercase;',
    'letter-spacing:.05em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.apa-peek-name{font-size:13.5px;font-weight:750;color:var(--apa-ink);line-height:1.28;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.apa-peek-meta{font-size:11.5px;color:#70728C;overflow:hidden;text-overflow:ellipsis;',
    'white-space:nowrap;}',
    '.apa-peek-price{font-size:13.5px;font-weight:800;color:var(--apa-ink);margin-top:1px;}',
    '.apa-peek-price span{font-size:11px;font-weight:600;color:#8E90AD;}',
    '.apa-peek-close{position:absolute;top:-9px;right:14px;width:26px;height:26px;border-radius:50%;',
    'border:1px solid var(--apa-line);background:#fff;color:#4A4C66;cursor:pointer;display:none;',
    'align-items:center;justify-content:center;padding:0;box-shadow:0 3px 12px rgba(10,10,20,.16);}',

    /* Fullscreen is a class on the container, not the Fullscreen API:
       the API drops out of PWAs and iOS Safari, and a map that
       sometimes expands is worse than one that always does. */
    '.apa-map.apa-full{position:fixed;inset:0;width:100%;height:100%!important;',
    'max-height:none;border-radius:0;z-index:9998;margin:0;}',
    '.apa-map.apa-full .leaflet-control-zoom{display:block;}',
    'body.apa-map-locked{overflow:hidden;}',

    /* ── Host picker search box ───────────────────────────────────── */
    '.apa-geo{position:relative;}',
    '.apa-geo-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:900;',
    'background:#fff;border:1.5px solid rgba(10,10,20,.13);border-radius:12px;overflow:hidden;',
    'box-shadow:0 12px 36px rgba(10,10,20,.14);max-height:236px;overflow-y:auto;}',
    '.apa-geo-row{padding:10px 13px;font-size:13px;line-height:1.45;cursor:pointer;',
    'border-bottom:1px solid rgba(10,10,20,.06);color:#1A1B2E;}',
    '.apa-geo-row:last-child{border-bottom:none;}',
    '.apa-geo-row:hover,.apa-geo-row.hi{background:#F4F5FB;}',
    '.apa-geo-row small{display:block;color:#8E90AD;font-size:11.5px;margin-top:2px;}',
    '.apa-geo-empty{padding:12px 13px;font-size:12.5px;color:#8E90AD;}',

    /* Someone who has asked the OS to calm animations down did not
       mean "except on the map". */
    '@media(prefers-reduced-motion:reduce){',
    '.apa-map *,.apa-map-peek{transition-duration:.01ms!important;animation-duration:.01ms!important;}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('apa-map-css')) return;
    var s = document.createElement('style');
    s.id = 'apa-map-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Element plumbing ─────────────────────────────────────────── */

  function resolve(el) {
    if (typeof el === 'string') return document.getElementById(el.replace(/^#/, ''));
    return el || null;
  }

  function prep(el, height) {
    injectCSS();
    el.classList.add('apa-map');

    /* This one line used to be the whole mobile map bug.
       `height: 100%` written inline beats the stylesheet, and a
       percentage height resolves against a parent that has a height of
       its own — which the results column does not, once the list
       beside it goes display:none on a phone. The grid row then sizes
       itself to its tallest child, the tallest child is the map, the
       map is asking the row how tall it is, and the answer both ways
       is zero. Desktop never showed it because the list column was
       still there holding the row open.

       So: measure first. If CSS has already given this element a real
       height, it is in charge and nothing is written. Only a collapsed
       box gets an inline height, and never a percentage one. */
    var box = 0;
    try { box = Math.round(el.getBoundingClientRect().height); } catch (e) {}

    if (box < 80 && !el.style.height) {
      el.style.height = (!height || height === '100%' || /%$/.test(height))
        ? 'min(70vh, 620px)'
        : height;
    }
    if (!el.style.minHeight) el.style.minHeight = '180px';
    /* Placeholder markup often leaves an inline `display:flex` behind
       to centre a spinner. Inline beats the class, and a flex parent
       fights the absolutely-positioned map, so clear it. */
    if (el.style.display && el.style.display !== 'block') el.style.display = 'block';
    el.innerHTML =
      '<div class="apa-map-skel"><div class="dot"></div><div>Loading map…</div></div>';
    var skel = el.firstChild;
    var host = document.createElement('div');
    host.style.cssText = 'position:absolute;inset:0;';
    el.appendChild(host);
    return { host: host, skel: skel };
  }

  function ready(skel) {
    if (!skel) return;
    skel.classList.add('gone');
    setTimeout(function () { if (skel.parentNode) skel.parentNode.removeChild(skel); }, 400);
  }

  function fail(el, msg) {
    var skel = el.querySelector('.apa-map-skel');
    if (skel) skel.innerHTML = '<div style="font-size:22px">🗺️</div><div>' + msg + '</div>';
  }

  function chip(el, text, pos, onClick) {
    var tag = onClick ? 'button' : 'div';
    var node = document.createElement(tag);
    node.className = 'apa-map-chip ' + (pos || 'bl') + (onClick ? '' : ' static');
    node.innerHTML = text;
    if (onClick) {
      node.type = 'button';
      node.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }
    el.appendChild(node);
    return node;
  }

  /* ── Toolbar ──────────────────────────────────────────────────────

     Locate, expand and the basemap switcher, stacked in one corner.
     Built here rather than as Leaflet controls because Leaflet's
     control API insists on its own markup and its own bar styling,
     and fighting that costs more than owning the four buttons. */

  var ICO = {
    locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h4V4M20 8h-4V4M4 16h4v4M20 16h-4v4"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
    recentre: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };

  function stack(el) {
    var node = el.querySelector('.apa-map-stack');
    if (node) return node;
    node = document.createElement('div');
    node.className = 'apa-map-stack';
    el.appendChild(node);
    return node;
  }

  function stackBtn(el, html, title, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'apa-map-btn';
    b.innerHTML = html;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      onClick(b);
    });
    stack(el).appendChild(b);
    return b;
  }

  /* The switcher shows swatches, not names. "Voyager" and "Positron"
     told a guest nothing; a green square and a satellite square tell
     them everything without a word of copy. */
  function skinSwitcher(el, skin, order) {
    var keys = order || BASEMAP_ORDER;
    var menu = document.createElement('div');
    menu.className = 'apa-map-skins';
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', 'Map style');

    keys.forEach(function (k) {
      var def = BASEMAPS[k];
      if (!def) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'apa-map-skin' + (skin.style === k ? ' on' : '');
      b.setAttribute('data-skin', k);
      b.innerHTML = '<i aria-hidden="true"></i>' + esc(def.label);
      b.title = def.hint || def.label;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        skin.set(k);
        Array.prototype.forEach.call(menu.children, function (c) {
          c.classList.toggle('on', c.getAttribute('data-skin') === k);
        });
        close();
      });
      menu.appendChild(b);
    });

    var btn = stackBtn(el, ICO.layers, 'Map style', function () {
      menu.classList.contains('open') ? close() : open();
    });
    stack(el).appendChild(menu);

    function open() { menu.classList.add('open'); btn.classList.add('on'); }
    function close() { menu.classList.remove('open'); btn.classList.remove('on'); }

    /* Clicking the map is a decision to stop choosing a basemap. */
    el.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    return { open: open, close: close, button: btn };
  }

  /* Fullscreen by class, not by the Fullscreen API. The API is refused
     inside installed PWAs and on iOS Safari, so a map that expands
     only sometimes is worse than one that always does. */
  function expander(el, map) {
    var on = false;
    var btn = stackBtn(el, ICO.expand, 'Expand map', function () { set(!on); });

    function set(next) {
      on = next;
      el.classList.toggle('apa-full', on);
      document.body.classList.toggle('apa-map-locked', on);
      btn.innerHTML = on ? ICO.shrink : ICO.expand;
      btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Expand map');
      btn.title = on ? 'Exit full screen' : 'Expand map';
      btn.classList.toggle('on', on);
      setTimeout(function () { map.invalidateSize(); }, 60);
      setTimeout(function () { map.invalidateSize(); }, 340);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && on) set(false);
    });

    return { set: set, isOpen: function () { return on; } };
  }

  /* "Where am I" is the second question every results map is asked.
     The first is "where is this", and the list already answered it. */
  function locator(el, map, L) {
    var mark = null;
    return stackBtn(el, ICO.locate, 'Show my location', function (btn) {
      if (!navigator.geolocation) return;
      btn.classList.add('busy');
      navigator.geolocation.getCurrentPosition(function (pos) {
        btn.classList.remove('busy');
        btn.classList.add('on');
        var c = [pos.coords.latitude, pos.coords.longitude];
        if (mark) map.removeLayer(mark);
        mark = L.circleMarker(c, {
          radius: 7, color: '#fff', weight: 3,
          fillColor: '#4361FF', fillOpacity: 1
        }).addTo(map);
        map.flyTo(c, Math.max(map.getZoom(), 14), { duration: 1.1 });
      }, function () {
        btn.classList.remove('busy');
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    });
  }

  /* ── The focus beat ───────────────────────────────────────────────

     Straight-line panning across a city reads as a jump cut: the
     guest loses the thread of where the new pin sits relative to the
     old one. Pulling the camera up before it translates and letting it
     settle down onto the target keeps the geography continuous, which
     is the entire reason the move is worth animating at all. Short
     hops skip the rise — a camera that climbs to cross one street is
     just showing off. */
  function flyToPoint(map, latlng, zoom, done) {
    var from = map.getCenter();
    var span = map.distance(from, latlng);
    var to = Math.max(zoom || 15, 13);

    if (span < 1200) {
      map.flyTo(latlng, to, { duration: .7, easeLinearity: .3 });
      if (done) setTimeout(done, 720);
      return;
    }

    var lift = Math.max(map.getZoom() - (span > 40000 ? 3 : 1.6), 10);
    map.flyTo(from, lift, { duration: .42 });
    setTimeout(function () {
      map.flyTo(latlng, to, { duration: 1.15, easeLinearity: .22 });
      if (done) setTimeout(done, 1180);
    }, 440);
  }

  /* ── Peek rail ────────────────────────────────────────────────────

     Tapping a pin used to close the map and open the listing drawer,
     which threw away the one thing the guest opened the map for. The
     card now rides at the bottom instead: the pin selects the card,
     swiping the card selects the pin, and the listing only opens when
     someone actually asks for it. */
  function peekRail(el, items, o) {
    var rail = document.createElement('div');
    rail.className = 'apa-map-peek';
    rail.setAttribute('role', 'list');

    var render = o.card || defaultCard;
    var index = {};

    items.forEach(function (p, i) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'apa-peek-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-peek-id', p.id);
      card.innerHTML = render(p.item, p);
      card.addEventListener('click', function () { o.onOpen && o.onOpen(p.item, p); });
      index[p.id] = { node: card, at: i };
      rail.appendChild(card);
    });

    el.appendChild(rail);

    /* Swiping the rail is a way of walking the pins. Debounced,
       because a fling fires scroll forty times and each one would
       otherwise re-centre the map. */
    var settle = null;
    rail.addEventListener('scroll', function () {
      clearTimeout(settle);
      settle = setTimeout(function () {
        var at = Math.round(rail.scrollLeft / (rail.firstChild ? rail.firstChild.offsetWidth + 10 : 1));
        var card = rail.children[Math.max(0, Math.min(at, rail.children.length - 1))];
        if (card) o.onSwipe && o.onSwipe(card.getAttribute('data-peek-id'));
      }, 130);
    }, { passive: true });

    return {
      node: rail,
      show: function (id) {
        var hit = index[id];
        Object.keys(index).forEach(function (k) {
          index[k].node.classList.toggle('on', k === id);
        });
        rail.classList.add('open');
        if (hit) {
          rail.scrollTo({ left: hit.node.offsetLeft - 12, behavior: 'smooth' });
        }
      },
      hide: function () { rail.classList.remove('open'); },
      destroy: function () { if (rail.parentNode) rail.parentNode.removeChild(rail); }
    };
  }

  function defaultCard(item, p) {
    var photo = (item.photos && item.photos[0]) || item.photo || item.image || '';
    var where = item.location || item.area || item.city || '';
    var bits = [];
    if (item.beds != null) bits.push(item.beds === 0 ? 'Studio' : item.beds + ' bed' + (item.beds === 1 ? '' : 's'));
    if (item.baths != null) bits.push(item.baths + ' bath' + (item.baths === 1 ? '' : 's'));
    if (item.maxGuests != null) bits.push(item.maxGuests + ' guest' + (item.maxGuests === 1 ? '' : 's'));

    return (photo
        ? '<img class="apa-peek-img" src="' + esc(photo) + '" alt="" loading="lazy" decoding="async">'
        : '<span class="apa-peek-img"></span>') +
      '<span class="apa-peek-body">' +
        (where ? '<span class="apa-peek-where">' + esc(where) + '</span>' : '') +
        '<span class="apa-peek-name">' + esc(item.name || item.title || 'Stay') + '</span>' +
        (bits.length ? '<span class="apa-peek-meta">' + esc(bits.join(' · ')) + '</span>' : '') +
        '<span class="apa-peek-price">KES ' + Number(p.price || 0).toLocaleString() +
          ' <span>night</span></span>' +
      '</span>';
  }

  /* Leaflet measures its container on init. Inside a drawer or a
     wizard step that was display:none a moment ago, that measurement
     is zero and the map renders as a grey sliver. Watching the box
     and invalidating on the first real size fixes it once and for
     all, which is why every builder below calls this. */
  function watchSize(map, el) {
    setTimeout(function () { map.invalidateSize(); }, 60);
    if (typeof ResizeObserver === 'undefined') return;
    var seen = 0;
    var ro = new ResizeObserver(function () {
      var w = el.clientWidth;
      if (w && w !== seen) { seen = w; map.invalidateSize(); }
    });
    ro.observe(el);
    map._apaRO = ro;
  }

  /* ── 1. Approximate map ───────────────────────────────────────── */

  /* What a guest sees before they have paid: the neighbourhood, the
     roads, the walk to the beach — and a circle. Never the door. */
  function approx(target, o) {
    o = o || {};
    var el = resolve(target);
    if (!el) return Promise.resolve(null);

    var radius = o.radius || 500;

    return load().then(function (L) {
      var lat = o.lat, lng = o.lng;

      /* No stored coordinates? Fall back to geocoding the area text.
         A listing that never got pinned still deserves a map. */
      var start = (isFinite(lat) && isFinite(lng))
        ? Promise.resolve([lat, lng])
        : geocode(o.query || o.location || '', { limit: 1 }).then(function (r) {
            return r.length ? [r[0].lat, r[0].lng] : null;
          });

      return start.then(function (pt) {
        if (!pt) { fail(el, 'Map unavailable for this area'); return null; }

        var seed = o.seed || o.id || (pt[0].toFixed(4) + ',' + pt[1].toFixed(4));
        var c = blur(pt[0], pt[1], seed, radius);

        var parts = prep(el, o.height || '240px');
        var map = L.map(parts.host, {
          center: c,
          zoom: o.zoom || 14,
          zoomControl: o.zoomControl !== false,
          scrollWheelZoom: false,
          dragging: true,
          minZoom: 11,
          maxZoom: 16,
          attributionControl: true
        });

        /* Penning the guest into a few kilometres keeps the map about
           *this* listing. Panning to another city is what search is for. */
        map.setMaxBounds(L.latLng(c[0], c[1]).toBounds(o.roam || 9000));
        map.options.maxBoundsViscosity = 0.85;

        var skin = paintBase(L, map, o.style || 'daylight', { maxZoom: 17 });

        L.circle(c, {
          radius: radius,
          color: '#7B2FF7',
          weight: 2,
          opacity: .55,
          fillColor: '#7B2FF7',
          fillOpacity: .11
        }).addTo(map);

        L.marker(c, {
          icon: L.divIcon({
            html: '<div class="apa-pin">' + (o.icon || '🏠') + '</div>',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            className: ''
          }),
          keyboard: false,
          interactive: false
        }).addTo(map);

        ready(parts.skel);
        watchSize(map, el);

        chip(el, (o.note || '🔒 Approximate area · exact address after booking'), 'bl');
        chip(el, ICO.recentre + ' Recentre', 'br', function () {
          map.flyTo(c, o.zoom || 14, { duration: .7 });
        });

        /* Satellite earns its place on a listing map more than
           anywhere else on the platform: a guest deciding between two
           flats in Syokimau wants to know which one backs onto the
           quarry, and no street rendering will ever tell them that. */
        if (o.styleSwitcher !== false) skinSwitcher(el, skin, ['daylight', 'satellite', 'canvas']);
        if (o.fullscreen !== false) expander(el, map);

        /* Scroll-wheel zoom is off so the page still scrolls past the
           map on mobile. A deliberate click opts in. */
        map.on('click', function () { map.scrollWheelZoom.enable(); });
        map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

        return { map: map, center: c, L: L };
      });
    }).catch(function (e) {
      fail(el, 'Map unavailable');
      console.warn('[apa-map] approx failed:', e.message);
      return null;
    });
  }

  /* ── 2. Exact map ─────────────────────────────────────────────── */

  /* After payment, and on the host's own preview. The real point,
     no circle, no apology. */
  function exact(target, o) {
    o = o || {};
    var el = resolve(target);
    if (!el || !isFinite(o.lat) || !isFinite(o.lng)) return Promise.resolve(null);

    return load().then(function (L) {
      var parts = prep(el, o.height || '240px');
      var c = [o.lat, o.lng];

      var map = L.map(parts.host, {
        center: c,
        zoom: o.zoom || 16,
        zoomControl: o.zoomControl !== false,
        scrollWheelZoom: false,
        maxZoom: 20
      });

      var skin = paintBase(L, map, o.style || 'daylight', { maxZoom: 20 });

      L.marker(c, {
        icon: L.divIcon({
          html: '<div class="apa-pin">' + (o.icon || '📍') + '</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          className: ''
        })
      }).addTo(map);

      ready(parts.skel);
      watchSize(map, el);

      if (o.note !== false) chip(el, o.note || '📍 Exact location', 'bl');
      if (o.styleSwitcher !== false) skinSwitcher(el, skin, ['daylight', 'satellite', 'canvas']);
      if (o.fullscreen !== false) expander(el, map);

      /* Getting there is the whole point of an exact pin, so hand the
         guest off to whatever navigation app they actually use. */
      if (o.directions !== false) {
        chip(el, 'Directions ↗', 'br', function () {
          window.open('https://www.openstreetmap.org/directions?to=' + o.lat + ',' + o.lng, '_blank', 'noopener');
        });
      }

      map.on('click', function () { map.scrollWheelZoom.enable(); });
      map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

      return { map: map, center: c, L: L };
    }).catch(function (e) {
      fail(el, 'Map unavailable');
      console.warn('[apa-map] exact failed:', e.message);
      return null;
    });
  }

  /* ── 3. Host pin picker ───────────────────────────────────────── */

  /* The old picker was a read-only OpenStreetMap iframe: hosts could
     look at where geocoding guessed, and that was the end of it. Half
     the flats in Nairobi geocode to the middle of the nearest main
     road. This one lets the host drag the pin onto the actual gate,
     drop it with a click, or take the phone's own fix. */
  /* ── Picker ───────────────────────────────────────────────────────

     This used to draw its own street map and ask the host to drag a
     pin onto their house. In Nairobi, Lagos or Accra that is a request
     nobody can answer: half the residential streets are unnamed on
     OSM, newer estates are not drawn at all, and there is no landmark
     on a street map to aim at. Hosts did their best and the pins were
     wrong, which is how a listing ends up advertising a flat in the
     middle of a roundabout.

     cabana-pinpoint.js fixes the cause rather than the symptom —
     satellite imagery so the host can see their own roof, a crosshair
     so their thumb is never covering the target, Plus Codes for
     addresses that do not exist on paper, and a readout that refuses
     to overstate how good the pin is.

     This function stays because forty call sites use it. It now loads
     that module and hands back the same {set, get, locate, destroy}
     handle, so every host surface on Cabana was upgraded without
     touching a line of its own code.
     ──────────────────────────────────────────────────────────────── */
  function picker(target, o) {
    o = o || {};
    var el = resolve(target);
    if (!el) return Promise.resolve(null);

    return loadPinpoint()
      .then(function (CabanaPin) {
        return CabanaPin.mount(el, {
          lat: o.lat,
          lng: o.lng,
          fallback: o.fallback,
          height: o.height || '280px',
          view: o.view,
          crosshair: o.crosshair,
          searchPlaceholder: o.searchPlaceholder,
          /* The old picker emitted {lat, lng, label, full, address,
             pending}. Pinpoint emits those plus plusCode, precision,
             precisionMetres, zoom and source. Callers that ignore the
             new fields behave exactly as before; callers that want
             them — the listing form does — simply read them. */
          onChange: o.onChange || function () {}
        });
      })
      .then(function (pin) {
        if (!pin) return null;
        return {
          set: function (lat, lng, zoom) { pin.set(lat, lng, zoom); },
          get: function () { return pin.get(); },
          locate: function () { return pin.locate(); },
          isPrecise: function (min) { return pin.isPrecise(min); },
          destroy: function () { pin.destroy(); },
          /* The raw picker, for callers that want the parts the old
             contract had no room for. */
          pin: pin
        };
      })
      .catch(function (e) {
        fail(el, 'Map unavailable — you can still save the listing');
        console.warn('[apa-map] picker failed:', e.message);
        return null;
      });
  }

  /* cabana-pinpoint.js is loaded on demand rather than on every page
     that happens to include apa-map.js. Most pages that draw a map are
     showing one, not asking for one. */
  var _pinpoint = null;

  function loadPinpoint() {
    if (window.CabanaPin) return Promise.resolve(window.CabanaPin);
    if (_pinpoint) return _pinpoint;

    _pinpoint = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/cabana-pinpoint.js';
      s.async = true;
      s.onload = function () {
        window.CabanaPin ? resolve(window.CabanaPin)
                         : reject(new Error('pinpoint loaded but CabanaPin is missing'));
      };
      s.onerror = function () { reject(new Error('cabana-pinpoint.js failed to load')); };
      document.head.appendChild(s);
    });
    _pinpoint.catch(function () { _pinpoint = null; });
    return _pinpoint;
  }

  function autocomplete(input, pick, o) {
    o = o || {};
    input = resolve(input);
    if (!input) return;
    injectCSS();

    var wrap = input.parentNode;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    wrap.classList.add('apa-geo');

    var list = document.createElement('div');
    list.className = 'apa-geo-list';
    list.style.display = 'none';
    wrap.appendChild(list);

    var timer = null, rows = [], hi = -1;

    function close() { list.style.display = 'none'; hi = -1; }

    function render(results) {
      rows = results;
      hi = -1;
      if (!results.length) {
        list.innerHTML = '<div class="apa-geo-empty">No match. Drop the pin on the map instead.</div>';
        list.style.display = '';
        return;
      }
      list.innerHTML = results.map(function (r, i) {
        return '<div class="apa-geo-row" data-i="' + i + '">' + esc(r.short) +
               '<small>' + esc(r.label) + '</small></div>';
      }).join('');
      list.style.display = '';
    }

    function choose(i) {
      var r = rows[i];
      if (!r) return;
      close();
      input.value = r.short;
      pick(r);
    }

    list.addEventListener('mousedown', function (e) {
      var row = e.target.closest('.apa-geo-row');
      if (row) { e.preventDefault(); choose(+row.dataset.i); }
    });

    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 3) { close(); return; }
      timer = setTimeout(function () {
        geocode(q, { limit: 6, country: o.country }).then(render);
      }, 420);
    });

    input.addEventListener('keydown', function (e) {
      if (list.style.display === 'none') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        hi = Math.max(0, Math.min(rows.length - 1, hi + (e.key === 'ArrowDown' ? 1 : -1)));
        Array.prototype.forEach.call(list.children, function (c, i) {
          c.classList.toggle('hi', i === hi);
        });
      } else if (e.key === 'Enter') {
        if (hi >= 0) { e.preventDefault(); choose(hi); }
      } else if (e.key === 'Escape') { close(); }
    });

    input.addEventListener('blur', function () { setTimeout(close, 160); });

    return { search: function () {
      var q = input.value.trim();
      if (q.length >= 3) geocode(q, { limit: 6, country: o.country }).then(render);
    } };
  }

  /* ── 4. Results map ───────────────────────────────────────────── */

  /* Every listing at once, priced, so a guest can answer the question
     a list of cards never answers: *which of these is actually near
     the thing I came here for?*

     Each pin is blurred by the same deterministic rule as the single
     listing map — the map is a browsing tool, not a back door around
     the address policy. */
  function results(target, listings, o) {
    o = o || {};
    var el = resolve(target);
    if (!el) return Promise.resolve(null);

    var onSelect = o.onSelect || function () {};
    var onHover = o.onHover || function () {};
    var fmt = o.format || function (v) { return 'KES ' + Number(v || 0).toLocaleString(); };
    var wantPeek = o.peek !== false;

    return load().then(function (L) {
      return placeAll(listings, o).then(function (pts) {
        var parts = prep(el, o.height || '100%');

        var map = L.map(parts.host, {
          center: pts.length ? [pts[0].lat, pts[0].lng] : [-1.2921, 36.8219],
          zoom: 12,
          zoomControl: true,
          zoomSnap: .25,           /* quarter steps — the wheel stops feeling notched */
          zoomDelta: .5,
          wheelPxPerZoomLevel: 110,
          scrollWheelZoom: true,
          maxZoom: 19,
          minZoom: 3,
          fadeAnimation: true,
          preferCanvas: false,
          tap: true
        });

        var skin = paintBase(L, map, o.style || o.basemap || 'daylight', { maxZoom: 20 });
        ready(parts.skel);
        watchSize(map, el);

        if (o.locate !== false) locator(el, map, L);
        if (o.fullscreen !== false) expander(el, map);
        if (o.styleSwitcher !== false) skinSwitcher(el, skin, o.styles);

        if (!pts.length) {
          fail(el, 'No listings have a location yet');
          return { map: map, L: L, markers: {}, skin: skin,
                   highlight: function () {}, focus: function () {},
                   resize: function () { map.invalidateSize(); },
                   destroy: function () { map.remove(); } };
        }

        var markers = {};
        var layer = L.layerGroup().addTo(map);
        var chosen = null;

        pts.forEach(function (p) {
          var seen = o.isSeen ? o.isSeen(p.item) : false;
          var m = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              html: '<div class="apa-price' + (seen ? ' seen' : '') + '" role="button" tabindex="0">' +
                    esc(fmt(p.price)) + '</div>',
              iconSize: null,
              iconAnchor: [0, 0],
              className: ''
            }),
            riseOnHover: true,
            keyboard: true,
            alt: (p.item && (p.item.name || p.item.title)) || 'Stay'
          });

          m.on('click', function () { choose(p.id, true); });
          m.on('mouseover', function () { onHover(p.item, true); highlight(p.id, true); });
          m.on('mouseout', function () {
            onHover(p.item, false);
            if (p.id !== chosen) highlight(p.id, false);
          });

          markers[p.id] = m;
          m._apaPoint = p;
          layer.addLayer(m);
        });

        map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.18), {
          maxZoom: 15
        });

        /* The peek rail and the pins are one selection, expressed
           twice. Whichever the guest touches, the other follows. */
        var peek = wantPeek
          ? peekRail(el, pts, {
              card: o.card,
              onOpen: function (item, p) { onSelect(item, p); },
              onSwipe: function (id) { choose(id, false); }
            })
          : null;

        function choose(id, fly) {
          chosen = id;
          highlight(id, true);
          if (peek) peek.show(id);
          var m = markers[id];
          if (m && fly) {
            /* Leave room for the card: nudging the target up by a
               third of the map's height stops the rail covering the
               pin the guest just tapped. */
            var pt = map.project(m.getLatLng(), map.getZoom());
            var shifted = map.unproject(pt.add([0, wantPeek ? map.getSize().y * 0.16 : 0]), map.getZoom());
            map.panTo(shifted, { animate: true, duration: .5 });
          }
          if (o.onChoose) o.onChoose(m && m._apaPoint && m._apaPoint.item, m && m._apaPoint);
        }

        function clearChoice() {
          if (chosen) highlight(chosen, false);
          chosen = null;
          if (peek) peek.hide();
        }

        map.on('click', clearChoice);

        function highlight(id, on) {
          Object.keys(markers).forEach(function (k) {
            var node = markers[k].getElement();
            if (!node) return;
            var pill = node.querySelector('.apa-price');
            if (!pill) return;
            var lit = on ? (k === id) : (k === chosen);
            pill.classList.toggle('on', lit);
          });
          if (on && markers[id]) markers[id].setZIndexOffset(1000);
        }

        if (o.searchArea) {
          chip(el, ICO.search + ' Search this area', 'bl', function () {
            var b = map.getBounds();
            o.searchArea({
              north: b.getNorth(), south: b.getSouth(),
              east: b.getEast(), west: b.getWest(),
              centre: map.getCenter(), zoom: map.getZoom()
            });
          });
        }

        return {
          map: map,
          L: L,
          markers: markers,
          skin: skin,
          peek: peek,
          highlight: highlight,
          select: choose,
          clear: clearChoice,
          setStyle: function (name) { skin.set(name); },
          focus: function (id) {
            var m = markers[id];
            if (!m) return;
            flyToPoint(map, m.getLatLng(), Math.max(map.getZoom(), 15), function () {
              choose(id, false);
            });
          },
          fit: function () {
            map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.18),
              { maxZoom: 15, animate: true });
          },
          resize: function () { map.invalidateSize(); },
          destroy: function () {
            if (map._apaRO) map._apaRO.disconnect();
            if (peek) peek.destroy();
            document.body.classList.remove('apa-map-locked');
            map.remove();
          }
        };
      });
    }).catch(function (e) {
      fail(el, 'Map unavailable');
      console.warn('[apa-map] results failed:', e.message);
      return null;
    });
  }

  /* Turn a mixed list — some pinned, some only ever given an area
     name — into points.

     Listings that were never pinned are grouped by their area text so
     "Westlands, Nairobi" costs one geocode no matter how many flats
     share it, then scattered deterministically around that centre.
     Twelve pins stacked on one road junction is worse than no map;
     twelve pins spread across the neighbourhood is honest, because
     an area name is genuinely all we know about those. */
  function placeAll(listings, o) {
    o = o || {};
    var radius = o.radius || 400;
    var pinned = [], needs = {};

    (listings || []).forEach(function (it) {
      var lat = num(it.lat != null ? it.lat : it.latitude);
      var lng = num(it.lng != null ? it.lng : it.longitude);
      var id = String(it.id != null ? it.id : (it._dbId || Math.random()));
      var price = it.price != null ? it.price : it.price_night;

      if (isFinite(lat) && isFinite(lng)) {
        var c = blur(lat, lng, id, radius);
        pinned.push({ id: id, lat: c[0], lng: c[1], price: price, item: it, exactKnown: true });
      } else {
        var area = String(it.location || it.area || it.city || '').trim();
        if (!area) return;
        (needs[area] = needs[area] || []).push({ id: id, price: price, item: it });
      }
    });

    var areas = Object.keys(needs);
    if (!areas.length) return Promise.resolve(pinned);

    /* Cap the geocoding. A results page is not worth thirty
       throttled round-trips, and the pinned listings are already on
       screen while these resolve. */
    var budget = areas.slice(0, o.geocodeBudget || 8);

    return Promise.all(budget.map(function (area) {
      return geocode(area, { limit: 1 }).then(function (r) {
        if (!r.length) return [];
        return needs[area].map(function (x, i) {
          /* Spread within the area, seeded per listing so the pin
             does not wander between page loads. */
          var c = blur(r[0].lat, r[0].lng, x.id + '::area' + i, o.areaSpread || 1400);
          return { id: x.id, lat: c[0], lng: c[1], price: x.price, item: x.item, exactKnown: false };
        });
      });
    })).then(function (groups) {
      return pinned.concat.apply(pinned, groups);
    });
  }

  /* ── helpers ──────────────────────────────────────────────────── */

  function num(v) {
    if (v === null || v === undefined || v === '') return NaN;
    return typeof v === 'number' ? v : parseFloat(v);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Straight-line distance in metres. Used for "8 min walk to the
     beach" style copy, which is the single most persuasive line a
     listing page can carry. */
  function distance(a, b, c, d) {
    var R = 6371000, p = Math.PI / 180;
    var dLat = (c - a) * p, dLng = (d - b) * p;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  window.ApaMap = {
    load: load,
    basemaps: BASEMAPS,
    basemapOrder: BASEMAP_ORDER,
    paintBase: paintBase,
    flyTo: flyToPoint,
    approx: approx,
    exact: exact,
    picker: picker,
    results: results,
    autocomplete: autocomplete,
    geocode: geocode,
    reverse: reverse,
    blur: blur,
    distance: distance,
    placeAll: placeAll
  };
})();
