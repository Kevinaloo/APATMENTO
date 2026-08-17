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

  /* Carto's basemaps carry an attribution requirement. It is not
     decoration — dropping it is a licence breach, so it is baked
     into the layer factory rather than left to each caller. */
  var ATTRIB =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>';

  var TILES = {
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  };

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

  function tileLayer(L, style) {
    return L.tileLayer(TILES[style] || TILES.voyager, {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: ATTRIB
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
    '.apa-map{position:relative;width:100%;background:#EEF0F7;}',
    '.apa-map .leaflet-container{font:inherit;background:#EEF0F7;}',
    '.apa-map .leaflet-control-attribution{font-size:9.5px;background:rgba(255,255,255,.78);}',

    /* the badge strip that sits over every map */
    '.apa-map-chip{position:absolute;z-index:640;display:inline-flex;align-items:center;gap:6px;',
    'padding:7px 12px;border-radius:100px;background:rgba(252,252,253,.94);',
    '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
    'border:1px solid rgba(10,10,20,.08);font-size:11.5px;font-weight:650;color:#4A4C66;',
    'box-shadow:0 2px 10px rgba(10,10,20,.08);line-height:1;}',
    '.apa-map-chip.bl{left:12px;bottom:12px;}',
    '.apa-map-chip.br{right:12px;bottom:12px;}',
    '.apa-map-chip.tl{left:12px;top:12px;}',
    '.apa-map-chip button,button.apa-map-chip{cursor:pointer;}',
    'button.apa-map-chip:hover{color:#7B2FF7;border-color:#7B2FF7;}',
    '.apa-map-chip.static{pointer-events:none;}',

    /* the "still loading" state, so a slow tile server never shows a
       bare grey rectangle with no explanation */
    '.apa-map-skel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    'flex-direction:column;gap:7px;color:#8E90AD;font-size:12px;font-weight:600;z-index:600;',
    'background:#EEF0F7;transition:opacity .35s ease;}',
    '.apa-map-skel.gone{opacity:0;pointer-events:none;}',
    '.apa-map-skel .dot{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);',
    'opacity:.75;animation:apaMapPulse 1.5s ease-in-out infinite;}',
    '@keyframes apaMapPulse{0%,100%{transform:scale(.82);opacity:.5;}50%{transform:scale(1);opacity:.9;}}',

    /* pins */
    '.apa-pin{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;',
    'justify-content:center;font-size:15px;background:linear-gradient(135deg,#4361FF,#7B2FF7);',
    'border:3px solid #fff;box-shadow:0 4px 14px rgba(67,97,255,.45);}',
    '.apa-pin-drag{cursor:grab;}',
    '.apa-pin-drag:active{cursor:grabbing;}',

    /* price bubbles on the results map */
    '.apa-price{padding:5px 10px;border-radius:100px;background:#fff;color:#0A0A14;',
    'font-size:12px;font-weight:750;white-space:nowrap;border:1.5px solid rgba(10,10,20,.1);',
    'box-shadow:0 3px 12px rgba(10,10,20,.16);transition:transform .16s ease,background .16s ease,color .16s ease;}',
    '.apa-price:hover{transform:scale(1.08);}',
    '.apa-price.on{background:#0A0A14;color:#fff;border-color:#0A0A14;transform:scale(1.1);}',
    '.apa-price.seen{background:#F4F5FB;color:#4A4C66;}',
    '.apa-cluster{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;',
    'justify-content:center;font-size:13px;font-weight:800;color:#fff;',
    'background:linear-gradient(135deg,#4361FF,#7B2FF7);border:3px solid #fff;',
    'box-shadow:0 4px 14px rgba(67,97,255,.4);}',

    /* host picker search box */
    '.apa-geo{position:relative;}',
    '.apa-geo-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:900;',
    'background:#fff;border:1.5px solid rgba(10,10,20,.13);border-radius:12px;overflow:hidden;',
    'box-shadow:0 12px 36px rgba(10,10,20,.14);max-height:236px;overflow-y:auto;}',
    '.apa-geo-row{padding:10px 13px;font-size:13px;line-height:1.45;cursor:pointer;',
    'border-bottom:1px solid rgba(10,10,20,.06);color:#1A1B2E;}',
    '.apa-geo-row:last-child{border-bottom:none;}',
    '.apa-geo-row:hover,.apa-geo-row.hi{background:#F4F5FB;}',
    '.apa-geo-row small{display:block;color:#8E90AD;font-size:11.5px;margin-top:2px;}',
    '.apa-geo-empty{padding:12px 13px;font-size:12.5px;color:#8E90AD;}'
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
    if (height && !el.style.height) el.style.height = height;
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

        tileLayer(L, o.style).addTo(map);

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
        chip(el, 'Recentre', 'br', function () { map.setView(c, o.zoom || 14); });

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
        maxZoom: 19
      });

      tileLayer(L, o.style).addTo(map);

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
  function picker(target, o) {
    o = o || {};
    var el = resolve(target);
    if (!el) return Promise.resolve(null);

    var onChange = o.onChange || function () {};

    return load().then(function (L) {
      var start = [
        isFinite(o.lat) ? o.lat : (o.fallback ? o.fallback[0] : -1.2921),
        isFinite(o.lng) ? o.lng : (o.fallback ? o.fallback[1] : 36.8219)
      ];
      var placed = isFinite(o.lat) && isFinite(o.lng);

      var parts = prep(el, o.height || '280px');
      var map = L.map(parts.host, {
        center: start,
        zoom: placed ? 17 : 12,
        zoomControl: true,
        scrollWheelZoom: true,
        maxZoom: 19
      });

      tileLayer(L, o.style).addTo(map);

      var marker = L.marker(start, {
        draggable: true,
        autoPan: true,
        icon: L.divIcon({
          html: '<div class="apa-pin apa-pin-drag">📍</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          className: ''
        })
      }).addTo(map);

      if (!placed) marker.setOpacity(.45);

      ready(parts.skel);
      watchSize(map, el);

      chip(el, '✋ Drag the pin, or tap the map', 'tl');

      var accuracy = null;

      function commit(lat, lng, opts) {
        opts = opts || {};
        placed = true;
        marker.setOpacity(1);
        marker.setLatLng([lat, lng]);
        if (opts.pan !== false) map.setView([lat, lng], Math.max(map.getZoom(), 16));

        /* Reverse geocoding is a courtesy, not a gate. The coordinates
           are already good; the label just catches up when it can. */
        onChange({ lat: lat, lng: lng, label: null, pending: true });
        reverse(lat, lng).then(function (r) {
          onChange({ lat: lat, lng: lng, label: r ? r.short : null, full: r ? r.label : null, address: r ? r.address : null, pending: false });
        });
      }

      marker.on('dragend', function () {
        var p = marker.getLatLng();
        if (accuracy) { map.removeLayer(accuracy); accuracy = null; }
        commit(p.lat, p.lng, { pan: false });
      });

      map.on('click', function (e) {
        if (accuracy) { map.removeLayer(accuracy); accuracy = null; }
        commit(e.latlng.lat, e.latlng.lng, { pan: false });
      });

      var api = {
        map: map,
        marker: marker,
        L: L,

        set: function (lat, lng, zoom) {
          if (!isFinite(lat) || !isFinite(lng)) return;
          placed = true;
          marker.setOpacity(1);
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], zoom || 17);
        },

        get: function () {
          if (!placed) return null;
          var p = marker.getLatLng();
          return { lat: p.lat, lng: p.lng };
        },

        /* The phone knows where it is, and a host standing in the
           doorway is the most accurate geocoder ever built. */
        locate: function () {
          return new Promise(function (res, rej) {
            if (!navigator.geolocation) return rej(new Error('Location is not available on this device'));
            navigator.geolocation.getCurrentPosition(function (pos) {
              var lat = pos.coords.latitude, lng = pos.coords.longitude;
              if (accuracy) map.removeLayer(accuracy);
              accuracy = L.circle([lat, lng], {
                radius: Math.max(pos.coords.accuracy || 40, 20),
                color: '#4361FF', weight: 1, opacity: .5,
                fillColor: '#4361FF', fillOpacity: .1
              }).addTo(map);
              commit(lat, lng);
              res({ lat: lat, lng: lng, accuracy: pos.coords.accuracy });
            }, function (err) {
              rej(new Error(
                err.code === 1 ? 'Location permission was declined. Drag the pin instead.'
                               : 'Could not read your location. Drag the pin instead.'
              ));
            }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
          });
        },

        destroy: function () {
          if (map._apaRO) map._apaRO.disconnect();
          map.remove();
        }
      };

      if (placed) {
        /* An edit session re-opening a saved listing: tell the host
           what the stored pin resolves to, without making them wait. */
        reverse(start[0], start[1]).then(function (r) {
          if (r) onChange({ lat: start[0], lng: start[1], label: r.short, full: r.label, address: r.address, pending: false, initial: true });
        });
      }

      return api;
    }).catch(function (e) {
      fail(el, 'Map unavailable — you can still save the listing');
      console.warn('[apa-map] picker failed:', e.message);
      return null;
    });
  }

  /* Attach a type-ahead address search to an input, feeding a picker.
     Kept separate from picker() so a page can style its own input. */
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

    return load().then(function (L) {
      return placeAll(listings, o).then(function (pts) {
        var parts = prep(el, o.height || '100%');

        var map = L.map(parts.host, {
          center: pts.length ? [pts[0].lat, pts[0].lng] : [-1.2921, 36.8219],
          zoom: 12,
          zoomControl: true,
          scrollWheelZoom: true,
          maxZoom: 17,
          minZoom: 3
        });

        tileLayer(L, o.style).addTo(map);
        ready(parts.skel);
        watchSize(map, el);

        if (!pts.length) {
          fail(el, 'No listings have a location yet');
          return { map: map, L: L, markers: {} };
        }

        var markers = {};
        var layer = L.layerGroup().addTo(map);

        pts.forEach(function (p) {
          var seen = o.isSeen ? o.isSeen(p.item) : false;
          var m = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              html: '<div class="apa-price' + (seen ? ' seen' : '') + '">' + fmt(p.price) + '</div>',
              iconSize: null,
              iconAnchor: [0, 0],
              className: ''
            }),
            riseOnHover: true
          });

          m.on('click', function () { onSelect(p.item, p); });
          m.on('mouseover', function () { onHover(p.item, true); });
          m.on('mouseout', function () { onHover(p.item, false); });

          markers[p.id] = m;
          layer.addLayer(m);
        });

        map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.18), {
          maxZoom: 15
        });

        /* Cards and pins are two views of one list. Hovering either
           should light up the other, or the pairing is just decoration. */
        function highlight(id, on) {
          Object.keys(markers).forEach(function (k) {
            var node = markers[k].getElement();
            if (!node) return;
            var pill = node.querySelector('.apa-price');
            if (pill) pill.classList.toggle('on', on && k === id);
          });
          if (on && markers[id]) markers[id].setZIndexOffset(1000);
        }

        if (o.searchArea) {
          chip(el, '🔍 Search this area', 'bl', function () {
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
          highlight: highlight,
          focus: function (id) {
            var m = markers[id];
            if (!m) return;
            map.setView(m.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
            highlight(id, true);
          },
          resize: function () { map.invalidateSize(); },
          destroy: function () {
            if (map._apaRO) map._apaRO.disconnect();
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
