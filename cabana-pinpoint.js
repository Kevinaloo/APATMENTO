/* ════════════════════════════════════════════════════════════════════
   cabana-pinpoint.js — putting a pin exactly where the place is.

   THE PROBLEM THIS EXISTS TO SOLVE
   ────────────────────────────────
   Cabana's old picker showed a street map and asked the host to drag a
   pin onto their home. In Nairobi, Lagos, Accra or Kampala that is a
   request nobody can answer accurately, and not because hosts are
   careless:

     · Half the residential streets are unnamed on OSM, and a great many
       estates built in the last decade are not drawn at all.
     · A street map gives no landmark to aim at. You are asked to point
       at a building on a canvas with no buildings on it.
     · Dragging a 34px pin with a thumb, on a phone, is coarse — the
       finger covers the target it is trying to hit.

   Google Maps does not feel more accurate because its geocoder is
   better. It feels more accurate because you can SEE YOUR ROOF. That is
   the entire difference, and it is reproducible without Google:

     1. SATELLITE IMAGERY. Esri's World Imagery is free to use with
        attribution and resolves to roughly 30cm over most African
        cities. A host who can see their own compound wall places a pin
        to the metre without being told how.

     2. CROSSHAIR, NOT DRAG. The pin is fixed at the centre of the frame
        and the world moves underneath it. This is what Uber, Bolt and
        Google's own place picker do, for the reason above: your finger
        is never on top of the thing you are aiming at.

     3. PLUS CODES. Google's Open Location Code, an open standard built
        for precisely this — countries where street addresses do not
        exist or do not resolve. Eleven digits is a three-metre square.
        A host sends "6GCRPR78+CVW" to a guest and it opens in Google
        Maps, Organic Maps or anything else. No key, no provider, no
        dependency: the algorithm is thirty lines and it is below.

     4. TELL THE TRUTH ABOUT PRECISION. A pin dropped from a city-name
        geocode is not the same fact as a pin the host placed on their
        own roof at zoom 20, and the form should not pretend otherwise.
        Every pin carries how it was placed and how good it is.

   Nothing here needs an API key. Nothing here bills per request.

     CabanaPin.mount(el, opts)   → Promise<handle>
     CabanaPin.plusCode(lat,lng) → the Open Location Code
     CabanaPin.precisionOf(...)  → what we are entitled to claim

   Used by ApaMap.picker(), which now delegates to it, so every host
   surface on Cabana gets this without changing a line of its own code.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.CabanaPin) return;

  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  var CSS_HREF = '/cabana-pinpoint.css';

  /* ══ IMAGERY ═══════════════════════════════════════════════════════

     Three views, and the default is deliberately Hybrid rather than the
     street map. A host opening this should see their neighbourhood as
     it looks from the air on the first frame, because that is the frame
     in which they recognise their own home.

     Esri's World Imagery is free for this use and requires the
     attribution below — it is not decoration, and removing it breaks
     the terms the layer is served under.

     `maxNativeZoom` matters more here than anywhere else in the
     product. Esri stops serving new tiles at 19 in most of Africa; past
     that Leaflet upscales the last real tile rather than requesting a
     404. Without it the host zooms in for a closer look and the map
     goes blank at the exact moment they need it most.                  */

  var ESRI_ATTRIB =
    'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, ' +
    'and the GIS User Community';
  var OSM_ATTRIB =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>';

  var VIEWS = {
    hybrid: {
      label: 'Hybrid',
      hint: 'Satellite with street names',
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      baseAttrib: ESRI_ATTRIB,
      overlay: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      overlayAttrib: OSM_ATTRIB,
      maxNativeZoom: 19,
      dark: true
    },
    satellite: {
      label: 'Satellite',
      hint: 'Imagery only',
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      baseAttrib: ESRI_ATTRIB,
      overlay: null,
      maxNativeZoom: 19,
      dark: true
    },
    map: {
      label: 'Map',
      hint: 'Streets and landmarks',
      base: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      baseAttrib: OSM_ATTRIB,
      overlay: null,
      maxNativeZoom: 19,
      dark: false
    }
  };

  var VIEW_ORDER = ['hybrid', 'satellite', 'map'];

  /* ══ PLUS CODES (Open Location Code) ═══════════════════════════════

     Google's open standard, implemented here rather than fetched,
     because it is pure arithmetic over a latitude and a longitude and
     has no business being a network call.

     Verified against the specification's own test vectors, including
     Google's published code for their headquarters — see
     tests/pinpoint.test.mjs, which also round-trips twelve thousand
     random points through an independent decoder.

     Integer arithmetic throughout. The obvious floating-point version
     is subtly wrong near cell boundaries, which is exactly where a
     property line tends to sit.                                       */

  var OLC_ALPHABET = '23456789CFGHJMPQRVWX';
  var OLC_SEPARATOR = '+';
  var OLC_SEPARATOR_POS = 8;
  var OLC_PADDING = '0';
  var OLC_PAIR_LEN = 10;
  var OLC_GRID_LEN = 5;
  var OLC_GRID_COLS = 4;
  var OLC_GRID_ROWS = 5;
  var OLC_LAT_MUL = 8000 * 3125;      /* 25,000,000 */
  var OLC_LNG_MUL = 8000 * 1024;      /*  8,192,000 */
  var OLC_LAT_MAX = 90;
  var OLC_LNG_MAX = 180;

  function olcLatPrecision(len) {
    if (len <= OLC_PAIR_LEN) return Math.pow(20, Math.floor(len / -2 + 2));
    return Math.pow(20, -3) / Math.pow(OLC_GRID_ROWS, len - OLC_PAIR_LEN);
  }

  /**
   * The Open Location Code for a point.
   *
   * @param {number} lat
   * @param {number} lng
   * @param {number} [codeLength=11] 10 is a ~14m square, 11 is ~3m,
   *   12 is under a metre. 11 is the default because it is the finest
   *   resolution a host can actually verify from imagery, and claiming
   *   more precision than the picture supports is a lie with extra
   *   digits.
   * @returns {string}
   */
  function plusCode(lat, lng, codeLength) {
    codeLength = Math.min(Math.max(codeLength || 11, 2), 15);
    lat = Math.min(90, Math.max(-90, lat));
    while (lng < -180) lng += 360;
    while (lng >= 180) lng -= 360;
    /* The north pole belongs to no cell of its own — nudge it into the
       last one rather than emitting a code that decodes off the map. */
    if (lat === 90) lat -= olcLatPrecision(codeLength);

    var code = '';
    var latVal = Math.floor(Math.round((lat + OLC_LAT_MAX) * OLC_LAT_MUL * 1e6) / 1e6);
    var lngVal = Math.floor(Math.round((lng + OLC_LNG_MAX) * OLC_LNG_MUL * 1e6) / 1e6);
    var i;

    if (codeLength > OLC_PAIR_LEN) {
      for (i = 0; i < OLC_GRID_LEN; i++) {
        var ndx = (latVal % OLC_GRID_ROWS) * OLC_GRID_COLS + (lngVal % OLC_GRID_COLS);
        code = OLC_ALPHABET.charAt(ndx) + code;
        latVal = Math.floor(latVal / OLC_GRID_ROWS);
        lngVal = Math.floor(lngVal / OLC_GRID_COLS);
      }
    } else {
      latVal = Math.floor(latVal / Math.pow(OLC_GRID_ROWS, OLC_GRID_LEN));
      lngVal = Math.floor(lngVal / Math.pow(OLC_GRID_COLS, OLC_GRID_LEN));
    }

    for (i = 0; i < OLC_PAIR_LEN / 2; i++) {
      code = OLC_ALPHABET.charAt(lngVal % 20) + code;
      code = OLC_ALPHABET.charAt(latVal % 20) + code;
      latVal = Math.floor(latVal / 20);
      lngVal = Math.floor(lngVal / 20);
    }

    code = code.substring(0, OLC_SEPARATOR_POS) + OLC_SEPARATOR +
           code.substring(OLC_SEPARATOR_POS);
    if (codeLength >= OLC_SEPARATOR_POS) return code.substring(0, codeLength + 1);
    return code.substring(0, codeLength) +
           new Array(OLC_SEPARATOR_POS - codeLength + 1).join(OLC_PADDING) +
           OLC_SEPARATOR;
  }

  /**
   * The short form people actually read out: "PR78+CVW, Nairobi".
   *
   * The first four digits of a full code cover roughly a hundred
   * kilometres, so within a named town they carry no information a
   * human needs — and dropping them is what turns an eleven-character
   * string into something someone will read down a phone line. The
   * town name replaces them, which is exactly how Google presents it.
   */
  function shortPlusCode(lat, lng, locality, codeLength) {
    var full = plusCode(lat, lng, codeLength);
    if (!locality) return full;
    return full.substring(4) + ' ' + locality;
  }

  /* ══ PRECISION ═════════════════════════════════════════════════════

     What are we actually entitled to claim about this pin?

     A pin has a provenance, and the provenances are not equal. A
     rooftop the host placed by eye at zoom 20 over 30cm imagery is a
     different fact from a point a geocoder returned for the name of a
     city. The form has always stored both as "lat, lng" and treated
     them the same, which is how a listing ends up advertising a flat
     in the middle of a roundabout.

     So every pin carries how it got there, and the readout says so in
     words the host can act on.                                        */

  var PRECISION = {
    rooftop:  { m: 5,     label: 'Exact',        note: 'Placed on the building' },
    parcel:   { m: 25,    label: 'Very good',    note: 'Within the compound' },
    street:   { m: 120,   label: 'Good',         note: 'On the right street' },
    district: { m: 1200,  label: 'Approximate',  note: 'Right area, wrong building' },
    city:     { m: 8000,  label: 'Too rough',    note: 'This is just the city centre' },
    device:   { m: null,  label: 'From GPS',     note: 'Your device’s own fix' }
  };

  /**
   * Grade a pin.
   *
   * Zoom is the honest signal for a hand-placed pin: a host who zoomed
   * to 20 was looking at a roof, and a host who accepted a pin at zoom
   * 12 was looking at a suburb. It is not a guess about their care, it
   * is a statement about what was on screen when they said yes.
   *
   * @param {Object} pin {source, zoom, accuracy}
   * @returns {{key:string, label:string, note:string, metres:number}}
   */
  function precisionOf(pin) {
    pin = pin || {};

    /* A device fix reports its own error, so believe it rather than
       inferring anything. A 2,000m "fix" from a phone triangulating on
       cell towers must not be dressed up as a rooftop. */
    if (pin.source === 'device' && pin.accuracy != null) {
      var a = pin.accuracy;
      var key = a <= 12 ? 'rooftop' : a <= 40 ? 'parcel'
        : a <= 200 ? 'street' : a <= 2000 ? 'district' : 'city';
      return {
        key: key, label: PRECISION.device.label,
        note: 'GPS, accurate to about ' + Math.round(a) + ' m',
        metres: a
      };
    }

    var z = pin.zoom || 0;
    var k = z >= 19 ? 'rooftop' : z >= 17 ? 'parcel' : z >= 15 ? 'street'
      : z >= 12 ? 'district' : 'city';
    var p = PRECISION[k];
    return { key: k, label: p.label, note: p.note, metres: p.m };
  }

  /* Metres between two points. Used to tell a host when their pin has
     wandered a long way from the address they typed — the single most
     common way a listing ends up in the wrong place. */
  function metresBetween(a, b) {
    var R = 6371000, RAD = Math.PI / 180;
    var dLat = (b.lat - a.lat) * RAD;
    var dLng = (b.lng - a.lng) * RAD;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /* ══ PLUMBING ══════════════════════════════════════════════════════ */

  var _leaflet = null;

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (_leaflet) return _leaflet;
    _leaflet = new Promise(function (resolve, reject) {
      /* apa-map.js and cabana-globe.js use the same marker, so whichever
         of the three loads first pays for the stylesheet and the rest
         find it already there. */
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
    _leaflet.catch(function () { _leaflet = null; });
    return _leaflet;
  }

  function ensureCSS() {
    if (document.querySelector('link[data-cabana-pin]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.setAttribute('data-cabana-pin', '');
    document.head.appendChild(link);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function resolveEl(x) {
    if (typeof x === 'string') return document.getElementById(x.replace(/^#/, ''));
    return x || null;
  }

  /* ══ THE PICKER ════════════════════════════════════════════════════ */

  function Pin(host, opts) {
    this.host = host;
    this.opts = opts || {};
    this.view = this.opts.view || 'hybrid';
    /* Crosshair on touch, draggable marker on desktop. Both are always
       available — this only decides which one opens. A thumb is worse
       at dragging than a mouse and better at panning, and the reverse
       is true for a trackpad. */
    this.crosshair = this.opts.crosshair != null
      ? !!this.opts.crosshair
      : matchMedia('(pointer: coarse)').matches;

    this.pin = null;           /* {lat,lng,zoom,source,accuracy} */
    this.searched = null;      /* where the typed address landed */
    this.label = null;
    this.address = null;
    this._build();
  }

  Pin.prototype._build = function () {
    var self = this;
    var L = window.L;
    var o = this.opts;
    var host = this.host;

    host.classList.add('cpin');
    host.innerHTML = '';
    if (o.height) host.style.height = o.height;

    var stage = document.createElement('div');
    stage.className = 'cpin-stage';
    host.appendChild(stage);

    var start = [
      isFinite(o.lat) ? o.lat : (o.fallback ? o.fallback[0] : -1.2921),
      isFinite(o.lng) ? o.lng : (o.fallback ? o.fallback[1] : 36.8219)
    ];
    var placed = isFinite(o.lat) && isFinite(o.lng);

    var map = L.map(stage, {
      center: start,
      /* A host who already has a pin is here to check or nudge it, so
         open at the altitude where that is possible. A host with no pin
         is here to find their neighbourhood first. */
      zoom: placed ? 19 : 13,
      zoomControl: false,
      /* Past Esri's last real tile the map upscales rather than going
         blank, so 21 is reachable and still shows something true. */
      maxZoom: 21,
      zoomSnap: 0.5,
      attributionControl: true,
      /* On a page of form fields, a wheel over the map should scroll the
         page — losing your place in a long listing form because you
         rolled past the map is worse than an extra click. */
      scrollWheelZoom: o.scrollWheelZoom != null ? o.scrollWheelZoom : false,
      tap: true
    });
    this.map = map;
    this.stage = stage;
    map.attributionControl.setPrefix('');

    if (map.scrollWheelZoom && !map.options.scrollWheelZoom) {
      map.on('click', function () { map.scrollWheelZoom.enable(); });
    }

    this._buildLayers();
    this._buildMarker(start, placed);
    this._buildChrome();

    map.on('move', function () { if (self.crosshair) self._liveReadout(); });
    map.on('moveend zoomend', function () {
      if (self.crosshair) self._commitFromCentre();
      else self._paintReadout();
    });

    if (placed) {
      this.pin = {
        lat: start[0], lng: start[1], zoom: map.getZoom(),
        source: o.source || 'saved', accuracy: o.accuracy || null
      };
      this._paintReadout();
    } else {
      this._paintReadout();
    }

    this._wireSearch();
    setTimeout(function () { map.invalidateSize(); }, 60);
    this._watchSize();
  };

  /* ── Imagery ───────────────────────────────────────────────────── */

  /* Leaflet's attribution control is driven by layer add/remove events,
     NOT by the layer's current options. `setUrl` therefore swaps the
     tiles while leaving the credit line describing the layer that used
     to be there — which is how switching to the street map ended up
     crediting Esri for Carto's tiles and dropping OpenStreetMap
     entirely. Both are licence breaches, not cosmetic drift.

     So a base layer whose credit changes is removed and re-added
     rather than re-pointed. Hybrid and Satellite share both URL and
     credit, so the common toggle still costs nothing but the overlay. */
  Pin.prototype._setBase = function (view) {
    var L = window.L;
    if (this.base && this._baseUrl === view.base && this._baseAttrib === view.baseAttrib) {
      return;
    }
    if (this.base) this.map.removeLayer(this.base);
    this.base = L.tileLayer(view.base, {
      maxZoom: 21, maxNativeZoom: view.maxNativeZoom,
      subdomains: 'abcd', attribution: view.baseAttrib,
      keepBuffer: 2
    }).addTo(this.map);
    this._baseUrl = view.base;
    this._baseAttrib = view.baseAttrib;
    /* The base belongs under everything else Leaflet draws. */
    this.base.bringToBack();
  };

  Pin.prototype._setOverlay = function (view) {
    var L = window.L;
    if (this.overlay) { this.map.removeLayer(this.overlay); this.overlay = null; }
    if (!view.overlay) return;
    this.overlay = L.tileLayer(view.overlay, {
      maxZoom: 21, maxNativeZoom: view.maxNativeZoom,
      subdomains: 'abcd', attribution: view.overlayAttrib,
      pane: 'overlayPane', keepBuffer: 2
    }).addTo(this.map);
  };

  Pin.prototype._buildLayers = function () {
    var view = VIEWS[this.view];
    this._setBase(view);
    this._setOverlay(view);
    this.host.classList.toggle('cpin-dark', !!view.dark);
  };

  Pin.prototype.setView = function (key) {
    if (!VIEWS[key] || key === this.view) return;
    var view = VIEWS[key];
    this.view = key;

    this._setBase(view);
    this._setOverlay(view);
    this.host.classList.toggle('cpin-dark', !!view.dark);

    this.viewRail.querySelectorAll('.cpin-view').forEach(function (b) {
      var on = b.dataset.view === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  /* ── The pin itself ────────────────────────────────────────────── */

  Pin.prototype._buildMarker = function (start, placed) {
    var self = this;
    var L = window.L;

    this.marker = L.marker(start, {
      draggable: true,
      autoPan: true,
      icon: L.divIcon({
        className: '',
        html: '<div class="cpin-mark"><span class="cpin-mark-dot"></span></div>',
        iconSize: [30, 38],
        iconAnchor: [15, 36]
      })
    });

    this.accuracyRing = null;
    if (!this.crosshair) this.marker.addTo(this.map);
    if (!placed) this.marker.setOpacity(0.5);

    this.marker.on('dragstart', function () { self._clearRing(); });
    this.marker.on('dragend', function () {
      var p = self.marker.getLatLng();
      self._commit(p.lat, p.lng, { source: 'manual', pan: false });
    });

    /* Tapping the map places the pin. In crosshair mode the centre is
       already the pin, so a tap there would fight the gesture. */
    this.map.on('click', function (e) {
      if (self.crosshair) return;
      self._clearRing();
      self._commit(e.latlng.lat, e.latlng.lng, { source: 'manual', pan: false });
    });
  };

  Pin.prototype.setMode = function (crosshair) {
    crosshair = !!crosshair;
    if (crosshair === this.crosshair) return;
    this.crosshair = crosshair;
    this.host.classList.toggle('cpin-cross', crosshair);

    if (crosshair) {
      /* Handing over: the crosshair reads the map centre, so the centre
         has to become the pin before the mode is visible, or the first
         readout would describe wherever the map happened to be. */
      if (this.pin) this.map.setView([this.pin.lat, this.pin.lng], this.map.getZoom());
      this.map.removeLayer(this.marker);
      this._clearRing();
    } else {
      var c = this.pin || { lat: this.map.getCenter().lat, lng: this.map.getCenter().lng };
      this.marker.setLatLng([c.lat, c.lng]).addTo(this.map);
      this.marker.setOpacity(1);
    }
    this._paintReadout();
    if (this.modeBtn) {
      this.modeBtn.setAttribute('aria-pressed', crosshair ? 'true' : 'false');
      this.modeBtn.classList.toggle('on', crosshair);
    }
  };

  Pin.prototype._clearRing = function () {
    if (this.accuracyRing) {
      this.map.removeLayer(this.accuracyRing);
      this.accuracyRing = null;
    }
  };

  /**
   * Record a pin and tell the caller.
   *
   * @param {number} lat
   * @param {number} lng
   * @param {Object} [o]
   * @param {string} [o.source] how it got here — 'manual', 'search',
   *   'device', 'saved'. This is the provenance the precision grade is
   *   computed from, so it is never guessed.
   */
  Pin.prototype._commit = function (lat, lng, o) {
    o = o || {};
    var self = this;

    this.pin = {
      lat: lat, lng: lng,
      zoom: this.map.getZoom(),
      source: o.source || 'manual',
      accuracy: o.accuracy != null ? o.accuracy : null
    };

    if (!this.crosshair) {
      this.marker.setLatLng([lat, lng]);
      this.marker.setOpacity(1);
    }
    if (o.pan !== false) {
      this.map.setView([lat, lng], o.zoom || Math.max(this.map.getZoom(), 18));
    }

    this._paintReadout();

    /* The coordinates are already good; the street name is a courtesy
       that catches up when the network allows. The caller is told
       immediately so its form never waits on a geocoder. */
    this._emit({ pending: true });

    var token = (this._revToken = (this._revToken || 0) + 1);
    this._reverse(lat, lng).then(function (r) {
      if (token !== self._revToken) return;   /* a newer pin won */
      self.label = r ? r.short : null;
      self.address = r || null;
      self._paintReadout();
      self._emit({ pending: false });
    });
  };

  Pin.prototype._commitFromCentre = function () {
    var c = this.map.getCenter();
    this._commit(c.lat, c.lng, { source: 'manual', pan: false });
  };

  Pin.prototype._reverse = function (lat, lng) {
    /* apa-geo.js proxies through /api/geocode, which holds the provider
       keys, identifies itself to OSM as its usage policy requires, and
       caches at the edge. Going direct from here would be a second
       geocoder with a second opinion about the same point. */
    if (window.ApaGeo) return window.ApaGeo.reverse(lat, lng);
    return Promise.resolve(null);
  };

  Pin.prototype._emit = function (extra) {
    var onChange = this.opts.onChange;
    if (!onChange || !this.pin) return;
    var p = this.pin;
    var grade = precisionOf(p);
    onChange(Object.assign({
      lat: p.lat,
      lng: p.lng,
      zoom: p.zoom,
      source: p.source,
      accuracy: p.accuracy,
      label: this.label,
      full: this.address ? this.address.label : null,
      address: this.address ? this.address.address || this.address : null,
      plusCode: plusCode(p.lat, p.lng, 11),
      precision: grade.key,
      precisionMetres: grade.metres
    }, extra || {}));
  };

  /* ── Chrome ────────────────────────────────────────────────────── */

  Pin.prototype._buildChrome = function () {
    var self = this;
    var host = this.host;

    /* The crosshair. A ring with a hole rather than a filled pin: the
       point being aimed at has to stay visible, which is the entire
       argument for this mode. */
    var cross = document.createElement('div');
    cross.className = 'cpin-cross-mark';
    cross.setAttribute('aria-hidden', 'true');
    cross.innerHTML = '<span class="cpin-cross-ring"></span>' +
                      '<span class="cpin-cross-dot"></span>' +
                      '<span class="cpin-cross-stem"></span>';
    host.appendChild(cross);
    host.classList.toggle('cpin-cross', this.crosshair);

    /* Search */
    var search = document.createElement('div');
    search.className = 'cpin-search';
    search.innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/>' +
      '<path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="text" class="cpin-search-in" autocomplete="off" spellcheck="false" ' +
      'placeholder="' + esc(this.opts.searchPlaceholder ||
        'Search an address, estate or landmark') + '" ' +
      'aria-label="Search for a place"/>';
    host.appendChild(search);
    this.searchEl = search;
    this.searchInput = search.querySelector('.cpin-search-in');

    /* The free geocoder this runs on (OpenStreetMap) has excellent
       coverage of roads, estates and neighbourhoods and close to none
       of informally-named local businesses — "Blue Gate Apartments" is
       on it maybe, "Obama Mansion" almost certainly is not, because
       nobody has drawn it in. A guest searching a business name that
       misses gets back whatever ELSE has similar words in it, which
       reads as the picker being wrong rather than the index being thin.
       This hint names the actual working pattern up front, once,
       rather than after a bad pick — search the estate or the nearest
       road, which OSM almost always has, then walk the last few metres
       on the imagery, which is what the picker is FOR. */
    var tip = document.createElement('div');
    tip.className = 'cpin-tip';
    tip.textContent = "Business name not found? Search the estate or nearest road instead, "
      + 'then move the map onto the building.';
    host.appendChild(tip);
    this.tipEl = tip;

    /* View rail */
    var rail = document.createElement('div');
    rail.className = 'cpin-views';
    rail.setAttribute('role', 'group');
    rail.setAttribute('aria-label', 'Map imagery');
    VIEW_ORDER.forEach(function (key) {
      var v = VIEWS[key];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cpin-view' + (key === self.view ? ' on' : '');
      b.dataset.view = key;
      b.title = v.label + ' — ' + v.hint;
      b.setAttribute('aria-pressed', key === self.view ? 'true' : 'false');
      b.textContent = v.label;
      b.addEventListener('click', function () { self.setView(key); });
      rail.appendChild(b);
    });
    host.appendChild(rail);
    this.viewRail = rail;

    /* Controls */
    var ctl = document.createElement('div');
    ctl.className = 'cpin-ctls';
    function button(cls, html, title, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cpin-ctl ' + cls;
      b.innerHTML = html;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', fn);
      ctl.appendChild(b);
      return b;
    }
    button('', '+', 'Zoom in', function () { self.map.zoomIn(1); });
    button('', '−', 'Zoom out', function () { self.map.zoomOut(1); });
    this.locateBtn = button('cpin-locate',
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/>' +
      '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
      'Use my current location', function () { self.locate(); });
    /* Deliberately not another ringed-circle: this sat next to the
       locate control wearing almost the same glyph, and two adjacent
       buttons that look alike are two buttons nobody presses. A corner
       frame reads as "aim", which is what the mode does. */
    this.modeBtn = button('cpin-mode' + (this.crosshair ? ' on' : ''),
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3' +
      'M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>' +
      '<circle cx="12" cy="12" r="2.4"/></svg>',
      'Switch between crosshair and draggable pin', function () {
        self.setMode(!self.crosshair);
      });
    this.modeBtn.setAttribute('aria-pressed', this.crosshair ? 'true' : 'false');
    host.appendChild(ctl);

    /* Readout — the panel that tells the truth about the pin. */
    var out = document.createElement('div');
    out.className = 'cpin-out';
    out.innerHTML =
      '<div class="cpin-out-main">' +
        '<div class="cpin-grade"><span class="cpin-grade-dot"></span>' +
        '<span class="cpin-grade-t">Move the map onto your building</span></div>' +
        '<div class="cpin-addr">Nothing selected yet</div>' +
      '</div>' +
      '<div class="cpin-code" hidden>' +
        '<div class="cpin-code-h">Plus Code</div>' +
        '<button type="button" class="cpin-code-v" ' +
        'title="Copy — this opens in Google Maps, Organic Maps and most navigation apps">' +
        '<span></span>' +
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/>' +
        '<path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>' +
      '</div>';
    host.appendChild(out);
    this.outEl = out;
    this.gradeEl = out.querySelector('.cpin-grade');
    this.gradeText = out.querySelector('.cpin-grade-t');
    this.addrEl = out.querySelector('.cpin-addr');
    this.codeEl = out.querySelector('.cpin-code');
    this.codeBtn = out.querySelector('.cpin-code-v');
    this.codeVal = this.codeBtn.querySelector('span');
    this.codeBtn.addEventListener('click', function () { self._copyCode(); });

    /* Drift warning — its own strip, because it is advice rather than
       state and must not be mistaken for the readout. */
    var warn = document.createElement('div');
    warn.className = 'cpin-warn';
    warn.hidden = true;
    host.appendChild(warn);
    this.warnEl = warn;
  };

  /* During a crosshair drag the pin is not committed yet — nothing is
     reverse-geocoded and nothing is emitted — but the Plus Code and the
     grade are pure functions of the centre, so they can update on every
     frame. Watching the code change as you slide across a roof is what
     makes the precision legible. */
  Pin.prototype._liveReadout = function () {
    var c = this.map.getCenter();
    this._paintCode(c.lat, c.lng);
    this._paintGrade({ zoom: this.map.getZoom(), source: 'manual' });
  };

  Pin.prototype._paintReadout = function () {
    var p = this.pin;
    if (this.tipEl) this.tipEl.hidden = !!p;
    if (!p) {
      this.gradeEl.dataset.grade = 'none';
      this.gradeText.textContent = this.crosshair
        ? 'Move the map onto your building'
        : 'Tap the map, or drag the pin';
      this.addrEl.textContent = 'Nothing selected yet';
      this.codeEl.hidden = true;
      return;
    }
    this._paintGrade(p);
    this._paintCode(p.lat, p.lng);

    this.addrEl.textContent = this.label ||
      (p.lat.toFixed(6) + ', ' + p.lng.toFixed(6));
    this._paintWarning();
  };

  Pin.prototype._paintGrade = function (p) {
    var g = precisionOf(p);
    this.gradeEl.dataset.grade = g.key;
    this.gradeText.innerHTML = '<b>' + esc(g.label) + '</b> · ' + esc(g.note);
  };

  Pin.prototype._paintCode = function (lat, lng) {
    var locality = this.address && (this.address.city || this.address.area);
    this.codeVal.textContent = locality
      ? shortPlusCode(lat, lng, locality, 11)
      : plusCode(lat, lng, 11);
    this.codeEl.hidden = false;
  };

  /**
   * Warn when the pin has wandered from the address that was typed.
   *
   * This is the single most common way a listing ends up in the wrong
   * place: the host searches "Kilimani", the map lands there, they then
   * pan somewhere else entirely while looking for their block, and the
   * pin follows without anyone noticing the address text no longer
   * matches.
   *
   * It is a warning, never a block. A host who searched the nearest
   * landmark because their estate has no name is doing exactly the
   * right thing, and the pin they placed is better than the search.
   */
  Pin.prototype._paintWarning = function () {
    var w = this.warnEl;
    if (!this.pin || !this.searched) { w.hidden = true; return; }

    var d = metresBetween(this.searched, this.pin);
    if (d < 2000) { w.hidden = true; return; }

    var km = d >= 10000 ? Math.round(d / 1000) + ' km' : (d / 1000).toFixed(1) + ' km';
    w.innerHTML = '<b>' + km + ' from “' + esc(this.searched.label || 'your search') +
      '”.</b> If that is right, carry on — just check the address fields still match.';
    w.hidden = false;
  };

  Pin.prototype._copyCode = function () {
    var self = this;
    var text = this.codeVal.textContent;
    var done = function (ok) {
      self.codeBtn.classList.add(ok ? 'ok' : 'warn');
      setTimeout(function () { self.codeBtn.classList.remove('ok', 'warn'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); },
        function () { done(false); });
    } else {
      done(false);
    }
  };

  /* ── GPS ───────────────────────────────────────────────────────── */

  /**
   * Take the device's own fix.
   *
   * The accuracy circle is drawn because it is the honest picture: a
   * phone indoors in Nairobi routinely reports a 40m radius, and a host
   * who sees that circle covering four buildings understands
   * immediately why they still have to nudge the pin. A bare dot would
   * imply a precision the fix does not have.
   */
  Pin.prototype.locate = function () {
    var self = this;
    if (!window.ApaGeo || !navigator.geolocation) {
      this._flashWarning('This device cannot share a location — search for the address instead');
      return Promise.resolve(null);
    }

    this.locateBtn.classList.add('busy');
    return window.ApaGeo.locate({ highAccuracy: true, maximumAge: 0 })
      .then(function (fix) {
        self.locateBtn.classList.remove('busy');
        self._clearRing();

        var acc = fix.accuracy || null;
        /* Zoom to fit the reported error, so the frame matches the
           confidence. A 5m fix earns zoom 20; a 500m fix does not. */
        var z = !acc ? 18 : acc <= 10 ? 20 : acc <= 30 ? 19
          : acc <= 100 ? 17 : acc <= 500 ? 15 : 13;

        self.map.setView([fix.lat, fix.lng], z);
        if (self.crosshair) self._commitFromCentre();
        else self._commit(fix.lat, fix.lng, { source: 'device', accuracy: acc, pan: false });

        /* Keep the device provenance: _commitFromCentre records a
           manual placement, which is true of the pin but loses the
           fact that a GPS fix put the map here. */
        if (self.pin) {
          self.pin.source = 'device';
          self.pin.accuracy = acc;
          self._paintReadout();
          self._emit({ pending: false });
        }

        if (acc && acc > 15) {
          self.accuracyRing = window.L.circle([fix.lat, fix.lng], {
            radius: acc, className: 'cpin-ring',
            color: '#4F6DFF', weight: 1, fillColor: '#4F6DFF', fillOpacity: 0.1
          }).addTo(self.map);
        }
        if (acc && acc > 60) {
          self._flashWarning('Your device is only accurate to about ' +
            Math.round(acc) + ' m right now. Zoom in and place the pin on your building.');
        }
        return fix;
      })
      .catch(function (err) {
        self.locateBtn.classList.remove('busy');
        self._flashWarning(err && err.message ? err.message
          : 'Could not read your location — search for the address instead');
        return null;
      });
  };

  Pin.prototype._flashWarning = function (msg) {
    var self = this;
    this.warnEl.innerHTML = esc(msg);
    this.warnEl.hidden = false;
    clearTimeout(this._warnTimer);
    this._warnTimer = setTimeout(function () { self._paintWarning(); }, 7000);
  };

  /* ── Search ────────────────────────────────────────────────────── */

  Pin.prototype._wireSearch = function () {
    var self = this;
    if (!window.ApaGeo || !window.ApaGeo.attach) {
      this.searchEl.hidden = true;
      return;
    }

    /* Bias the search to where the picker is actually open, and pin it
       to a country when the caller knows one.
       ------------------------------------------------------------------
       Without `near`, ApaGeo falls back to whatever the LAST search on
       the page biased toward (or nothing at all), and every provider —
       including free OSM data — ranks a global text match by relevance
       score, not by distance. "The Obama Mansion" is not on OSM at all,
       so a global, unbiased query returns whatever else has the word
       "mansion" in its name: Playboy Mansion, a museum in Guangzhou, the
       White House. None of those are wrong matches for the QUERY — they
       are the best the free index has, ranked with no idea the host is
       standing in Nairobi.
       This does not fix the coverage gap — OSM still has never heard of
       the place, and closing that gap needs a paid provider (Google
       Places, Mapbox) configured via a real API key in
       api/lib/_geocode.js, which already implements the Google path and
       simply has no key deployed. What this DOES fix, at zero cost: a
       host in Nairobi searching for ANYTHING nearby now gets Nairobi
       results ranked first, which is most of what "near me" search
       needs most of the time. */
    var bias = { lat: this.map.getCenter().lat, lng: this.map.getCenter().lng };

    this._search = window.ApaGeo.attach(this.searchInput, {
      limit: 7,
      near: this.opts.near || bias,
      country: this.opts.country,
      onPick: function (r) {
        /* A geocoded result is a starting frame, not an answer. The
           zoom is chosen so the host arrives close enough to recognise
           the place but not so close that they assume the job is done —
           and the grade in the readout will say "wrong building" until
           they move it. */
        self.searched = { lat: r.lat, lng: r.lng, label: r.short || r.label };
        var z = r.kind === 'city' || r.kind === 'region' ? 14
          : r.kind === 'neighbourhood' || r.kind === 'suburb' ? 16 : 18;

        self.map.setView([r.lat, r.lng], z);
        if (self.crosshair) self._commitFromCentre();
        else self._commit(r.lat, r.lng, { source: 'search', pan: false });

        self.label = r.short || r.label;
        self.address = r;
        self._paintReadout();
        self._emit({ pending: false });
        if (self.opts.onSearch) self.opts.onSearch(r);
      }
    });
  };

  /* ── Sizing ────────────────────────────────────────────────────── */

  /* Leaflet measures its container on init. Inside a wizard step that
     was display:none a moment ago that measurement is zero and the map
     renders as a grey sliver — which is precisely where this picker
     lives, on step four of a listing form. */
  Pin.prototype._watchSize = function () {
    var self = this;
    if (typeof ResizeObserver === 'undefined') return;
    var seen = 0;
    this._ro = new ResizeObserver(function () {
      var w = self.host.clientWidth;
      if (w && w !== seen) { seen = w; self.map.invalidateSize(); }
    });
    this._ro.observe(this.host);
  };

  /* ── Public handle ─────────────────────────────────────────────── */

  Pin.prototype.set = function (lat, lng, zoom) {
    if (!isFinite(lat) || !isFinite(lng)) return;
    this.map.setView([lat, lng], zoom || Math.max(this.map.getZoom(), 18));
    if (this.crosshair) this._commitFromCentre();
    else this._commit(lat, lng, { source: 'search', pan: false });
  };

  Pin.prototype.get = function () {
    if (!this.pin) return null;
    var p = this.pin;
    var g = precisionOf(p);
    return {
      lat: p.lat, lng: p.lng, zoom: p.zoom,
      source: p.source, accuracy: p.accuracy,
      label: this.label, address: this.address,
      plusCode: plusCode(p.lat, p.lng, 11),
      precision: g.key, precisionMetres: g.metres
    };
  };

  /** Is this pin good enough to publish? */
  Pin.prototype.isPrecise = function (min) {
    if (!this.pin) return false;
    var order = ['city', 'district', 'street', 'parcel', 'rooftop'];
    var got = precisionOf(this.pin).key;
    return order.indexOf(got) >= order.indexOf(min || 'street');
  };

  Pin.prototype.destroy = function () {
    if (this._ro) this._ro.disconnect();
    if (this._search && this._search.destroy) this._search.destroy();
    clearTimeout(this._warnTimer);
    this.map.remove();
    this.host.innerHTML = '';
    this.host.classList.remove('cpin', 'cpin-cross', 'cpin-dark');
  };

  /* ══ API ═══════════════════════════════════════════════════════════ */

  var CabanaPin = {
    /**
     * Build a precision location picker inside `el`.
     *
     * @param {HTMLElement|string} el
     * @param {Object} [opts]
     * @param {number}   [opts.lat] [opts.lng]   an existing pin
     * @param {number[]} [opts.fallback]         where to open with no pin
     * @param {string}   [opts.height]
     * @param {string}   [opts.view='hybrid']    hybrid | satellite | map
     * @param {boolean}  [opts.crosshair]        defaults by pointer type
     * @param {Function} [opts.onChange]
     * @returns {Promise<Pin>}
     */
    mount: function (el, opts) {
      var host = resolveEl(el);
      if (!host) return Promise.reject(new Error('CabanaPin: no host element'));

      ensureCSS();
      host.classList.add('cpin', 'cpin-booting');
      host.innerHTML = '<div class="cpin-boot"><div class="cpin-boot-orb"></div>' +
        '<div>Loading the map…</div></div>';

      return loadLeaflet().then(function () {
        var pin = new Pin(host, opts || {});
        host.classList.remove('cpin-booting');
        return pin;
      }).catch(function (err) {
        host.classList.remove('cpin-booting');
        host.innerHTML = '<div class="cpin-boot cpin-boot-fail">' +
          '<div>The map could not load.</div>' +
          '<div class="cpin-boot-s">Type the address above — we will place the pin ' +
          'from it, and you can correct it later from your listing.</div></div>';
        throw err;
      });
    },

    plusCode: plusCode,
    shortPlusCode: shortPlusCode,
    precisionOf: precisionOf,
    metresBetween: metresBetween,

    _internals: {
      VIEWS: VIEWS, VIEW_ORDER: VIEW_ORDER, PRECISION: PRECISION,
      olcLatPrecision: olcLatPrecision
    }
  };

  window.CabanaPin = CabanaPin;
  if (typeof module !== 'undefined' && module.exports) module.exports = CabanaPin;
})();
