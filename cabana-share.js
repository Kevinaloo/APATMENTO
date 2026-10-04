/* ═══════════════════════════════════════════════════════════════════
   CABANA SHARE · send a place to someone
   ───────────────────────────────────────────────────────────────────
   Most stays are booked by more than one person. Somebody finds the
   flat, and then it goes to a partner, a sister, a group chat, a boss
   who signs off the expense. That hand-off is where a booking is won
   or lost, so it gets the same care as the checkout.

   On a phone the platform's own share sheet is the right answer: it
   knows which apps the guest actually uses. On a desktop there is no
   such thing (or a thin one), so this draws a sheet of its own with
   the usual places, the link, and a QR code for the phone on the desk.

   Every listing link goes through /s/<listing id>. That route answers
   link-preview crawlers with the listing's photo, price and area, and
   sends people on to the right page. A bare /apartments?open= link
   previews as the generic stays page.

     CabanaShare.share({title, text, url, image?})   native first, sheet otherwise
     CabanaShare.sheet({...})                        always the sheet
     CabanaShare.listingUrl(listing, {tour?})        the /s/ link for a listing
     CabanaShare.listingText(listing, {host?})       what the message says
     CabanaShare.shareListing(listing, opts)         both of the above, shared
     CabanaShare.button(listing, opts)               accessible button HTML
     CabanaShare.copy(text)                          clipboard, with fallback
     CabanaShare.toast(message)
     CabanaShare.qr.encode(text, {mask?})            QR matrix (byte mode, ECC M, v1–10)
     CabanaShare.qr.draw(canvas, text, opts)

   Any element with [data-cabana-share] is a share button (delegated):
     data-share-url, data-share-title, data-share-text, data-share-image,
     data-share-heading. button() writes all of them.

   Fires `cabana:share` on window with {channel, url} for analytics.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaShare) return;
  var D = global.document;

  var SITE = 'https://cabana.africa';
  /* Same shape the listing table uses for ids. Anything else is not a
     listing and never becomes part of a URL. */
  var ID_RE = /^[A-Za-z0-9-]{1,64}$/;
  /* The 3D tour's exact-view token (tools/tour-engine/src/share-code.ts).
     Opaque here; only its alphabet and length are checked. */
  var TOUR_RE = /^[a-z0-9~.\-]{1,120}$/i;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function emit(channel, url) {
    try { global.dispatchEvent(new global.CustomEvent('cabana:share', { detail: { channel: channel, url: url } })); } catch (e) {}
  }

  /* ══ QR ═══════════════════════════════════════════════════════════
     A small, complete encoder: byte mode, error correction level M,
     versions 1 to 10. That covers 213 bytes, several times the longest
     share link. Level M survives a scuffed screen or a glare spot and
     still keeps the code small enough to scan from across a desk.
     Structure follows ISO/IEC 18004; tests/listing-share.test.mjs
     checks it module for module against an independent encoder. */
  var qr = (function () {
    /* Level M, indexed by version: EC codewords per block, block count. */
    var ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
    var BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
    var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

    /* Modules left for data once every function pattern is placed. */
    function rawCodewords(v) {
      var r = (16 * v + 128) * v + 64;
      if (v >= 2) {
        var n = Math.floor(v / 7) + 2;
        r -= (25 * n - 10) * n - 55;
        if (v >= 7) r -= 36;
      }
      return Math.floor(r / 8);
    }
    function dataCodewords(v) { return rawCodewords(v) - ECC_PER_BLOCK[v] * BLOCKS[v]; }

    function utf8(s) {
      var out = [];
      s = String(s);
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 0xD800 && c < 0xDC00 && i + 1 < s.length) {
          var d = s.charCodeAt(i + 1);
          if (d >= 0xDC00 && d < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
        }
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xC0 | c >> 6, 0x80 | c & 63);
        else if (c < 0x10000) out.push(0xE0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
        else out.push(0xF0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      }
      return out;
    }

    /* GF(256) over the QR polynomial x^8 + x^4 + x^3 + x^2 + 1. */
    function gfMul(x, y) {
      var z = 0;
      for (var i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11D);
        z ^= ((y >>> i) & 1) * x;
      }
      return z;
    }
    function rsDivisor(degree) {
      var r = [];
      for (var i = 0; i < degree - 1; i++) r.push(0);
      r.push(1);
      var root = 1;
      for (i = 0; i < degree; i++) {
        for (var j = 0; j < r.length; j++) {
          r[j] = gfMul(r[j], root);
          if (j + 1 < r.length) r[j] ^= r[j + 1];
        }
        root = gfMul(root, 2);
      }
      return r;
    }
    function rsRemainder(data, divisor) {
      var r = divisor.map(function () { return 0; });
      data.forEach(function (b) {
        var f = b ^ r.shift();
        r.push(0);
        divisor.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
      });
      return r;
    }

    /* Split into blocks, append each block's EC bytes, interleave. The
       later blocks are one byte longer when the data does not divide. */
    function interleave(data, v) {
      var nb = BLOCKS[v], ecl = ECC_PER_BLOCK[v], raw = rawCodewords(v);
      var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
      var div = rsDivisor(ecl), blocks = [], k = 0;
      for (var i = 0; i < nb; i++) {
        var dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1));
        k += dat.length;
        var ecc = rsRemainder(dat, div);
        if (i < nShort) dat.push(0);
        blocks.push(dat.concat(ecc));
      }
      var out = [];
      for (i = 0; i < blocks[0].length; i++) {
        for (var j = 0; j < nb; j++) {
          if (i !== shortLen - ecl || j >= nShort) out.push(blocks[j][i]);
        }
      }
      return out;
    }

    var MASKS = [
      function (x, y) { return (x + y) % 2 === 0; },
      function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (x, y) { return x * y % 2 + x * y % 3 === 0; },
      function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
      function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
    ];

    function Grid(v) {
      var n = v * 4 + 17;
      this.n = n;
      this.m = [];
      this.fn = [];
      for (var y = 0; y < n; y++) { this.m.push(new Array(n).fill(0)); this.fn.push(new Array(n).fill(false)); }
    }
    Grid.prototype.set = function (x, y, dark) { this.m[y][x] = dark ? 1 : 0; this.fn[y][x] = true; };

    function drawFunctionPatterns(g, v) {
      var n = g.n, i, j;
      for (i = 0; i < n; i++) { g.set(6, i, i % 2 === 0); g.set(i, 6, i % 2 === 0); }
      [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function (c) {
        for (var dy = -4; dy <= 4; dy++) {
          for (var dx = -4; dx <= 4; dx++) {
            var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
            if (xx >= 0 && xx < n && yy >= 0 && yy < n) g.set(xx, yy, d !== 2 && d !== 4);
          }
        }
      });
      var a = ALIGN[v], last = a.length - 1;
      for (i = 0; i < a.length; i++) {
        for (j = 0; j < a.length; j++) {
          if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
          for (var dy2 = -2; dy2 <= 2; dy2++) {
            for (var dx2 = -2; dx2 <= 2; dx2++) g.set(a[i] + dx2, a[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
          }
        }
      }
      drawFormat(g, 0);
      if (v >= 7) {
        var rem = v;
        for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        var bits = v << 12 | rem;
        for (i = 0; i < 18; i++) {
          var bit = (bits >>> i) & 1, p = n - 11 + i % 3, q = Math.floor(i / 3);
          g.set(p, q, bit); g.set(q, p, bit);
        }
      }
    }

    /* Level M is format code 00, so the 5 data bits are just the mask. */
    function drawFormat(g, mask) {
      var n = g.n, data = mask, rem = data, i;
      for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = ((data << 10) | rem) ^ 0x5412;
      var bit = function (k) { return (bits >>> k) & 1; };
      for (i = 0; i <= 5; i++) g.set(8, i, bit(i));
      g.set(8, 7, bit(6)); g.set(8, 8, bit(7)); g.set(7, 8, bit(8));
      for (i = 9; i < 15; i++) g.set(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) g.set(n - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) g.set(8, n - 15 + i, bit(i));
      g.set(8, n - 8, 1);
    }

    /* The zigzag: two-module columns, right to left, alternating up and
       down, stepping over the vertical timing column. */
    function drawCodewords(g, words) {
      var n = g.n, i = 0, total = words.length * 8;
      for (var right = n - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < n; vert++) {
          for (var j = 0; j < 2; j++) {
            var x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
            if (!g.fn[y][x] && i < total) {
              g.m[y][x] = (words[i >>> 3] >>> (7 - (i & 7))) & 1;
              i++;
            }
          }
        }
      }
    }

    function applyMask(g, mask) {
      var f = MASKS[mask];
      for (var y = 0; y < g.n; y++) {
        for (var x = 0; x < g.n; x++) if (!g.fn[y][x] && f(x, y)) g.m[y][x] ^= 1;
      }
    }

    /* The standard's four penalties. Only the choice of mask depends on
       this; any mask scans, the best one scans more easily. */
    var F1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], F2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function penalty(g) {
      var n = g.n, m = g.m, p = 0, x, y, k, run, dark = 0;
      for (y = 0; y < n; y++) {
        run = 1;
        for (x = 1; x < n; x++) {
          if (m[y][x] === m[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
      }
      for (x = 0; x < n; x++) {
        run = 1;
        for (y = 1; y < n; y++) {
          if (m[y][x] === m[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
      }
      for (y = 0; y < n - 1; y++) {
        for (x = 0; x < n - 1; x++) {
          var c = m[y][x];
          if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
        }
      }
      function hit(get) {
        var a = true, b = true;
        for (var t = 0; t < 11; t++) { var v = get(t); if (v !== F1[t]) a = false; if (v !== F2[t]) b = false; }
        return (a ? 40 : 0) + (b ? 40 : 0);
      }
      for (y = 0; y < n; y++) {
        for (x = 0; x <= n - 11; x++) {
          p += hit(function (t) { return m[y][x + t]; });
          p += hit(function (t) { return m[x + t][y]; });
        }
      }
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) dark += m[y][x];
      k = Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1;
      return p + Math.max(0, k) * 10;
    }

    function encode(text, opts) {
      var bytes = utf8(text), v, cap;
      for (v = 1; v <= 10; v++) {
        cap = dataCodewords(v);
        if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= cap * 8) break;
      }
      if (v > 10) return null;

      var bits = [];
      var push = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
      push(4, 4);
      push(bytes.length, v < 10 ? 8 : 16);
      bytes.forEach(function (b) { push(b, 8); });
      push(0, Math.min(4, cap * 8 - bits.length));
      push(0, (8 - bits.length % 8) % 8);
      var words = [];
      for (var i = 0; i < bits.length; i += 8) {
        var w = 0;
        for (var j = 0; j < 8; j++) w = w << 1 | bits[i + j];
        words.push(w);
      }
      for (var pad = 0xEC; words.length < cap; pad ^= 0xEC ^ 0x11) words.push(pad);

      var g = new Grid(v);
      drawFunctionPatterns(g, v);
      drawCodewords(g, interleave(words, v));

      var mask = opts && opts.mask >= 0 && opts.mask <= 7 ? opts.mask : -1;
      if (mask < 0) {
        var best = Infinity;
        for (var mk = 0; mk < 8; mk++) {
          applyMask(g, mk); drawFormat(g, mk);
          var pen = penalty(g);
          if (pen < best) { best = pen; mask = mk; }
          applyMask(g, mk);
        }
      }
      applyMask(g, mask);
      drawFormat(g, mask);
      return { version: v, size: g.n, mask: mask, modules: g.m };
    }

    /* Crisp at any density: whole device pixels per module, the quiet
       zone the standard asks for, and the three finder eyes in the
       brand violet (dark enough that every scanner still sees black). */
    function draw(canvas, text, o) {
      o = o || {};
      var code = encode(text);
      if (!code || !canvas || !canvas.getContext) return null;
      var quiet = o.quiet == null ? 4 : o.quiet;
      var cells = code.size + quiet * 2;
      var css = o.size || 160;
      var dpr = o.scale || Math.min(3, global.devicePixelRatio || 1);
      var unit = Math.max(1, Math.floor(css * dpr / cells));
      var px = unit * cells;
      canvas.width = px; canvas.height = px;
      if (!o.scale) { canvas.style.width = (px / dpr) + 'px'; canvas.style.height = (px / dpr) + 'px'; }
      var ctx = canvas.getContext('2d');
      if (!ctx) return code;
      ctx.fillStyle = o.light || '#fff';
      ctx.fillRect(0, 0, px, px);
      var n = code.size, eye = function (x, y) {
        return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      };
      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          if (!code.modules[y][x]) continue;
          ctx.fillStyle = eye(x, y) ? (o.eye || '#3A1A8F') : (o.dark || '#120F2B');
          ctx.fillRect((x + quiet) * unit, (y + quiet) * unit, unit, unit);
        }
      }
      return code;
    }

    return { encode: encode, draw: draw };
  })();

  /* ══ LISTINGS ═════════════════════════════════════════════════════
     Listings reach this module in two shapes: the raw database row
     (title, price_night, max_guests) and the page models built from it
     (name, price, maxGuests, _dbId). One reader for both. */
  var UNIT = { stays: 'a night', roommates: 'a month', tours: 'a person', events: 'a ticket',
    carhire: 'a day', rides: 'a trip', shopping: '' };

  function origin() {
    var o = global.location && global.location.origin;
    return /^https?:\/\//.test(o || '') ? o : SITE;
  }
  function facts(l) {
    l = l || {};
    var id = String(l._dbId || l.id || '').replace(/^n_/, '');
    var service = String(l.service || (String(l.type || '').toLowerCase() === 'room' ? 'roommates' : 'stays')).toLowerCase();
    var monthly = service === 'roommates';
    var price = Number(monthly ? (l.price_month || l.price) : (l.price || l.price_night || l.price_per_night)) || 0;
    var where = l.neighbourhood || l.area || '';
    var city = l.city || '';
    var place = where && city && where.toLowerCase().indexOf(city.toLowerCase()) === -1 ? where + ', ' + city
      : (where || city || l.location || '');
    var photo = Array.isArray(l.photos) ? l.photos.filter(Boolean)[0] : null;
    if (photo && typeof photo === 'object') photo = photo.url || photo.src || null;
    return {
      id: ID_RE.test(id) ? id : '',
      title: String(l.name || l.title || 'A place on Cabana').trim(),
      place: String(place || '').trim(),
      price: price,
      currency: l.currency || 'KES',
      unit: UNIT[service] == null ? '' : UNIT[service],
      image: typeof photo === 'string' && /^https?:\/\//.test(photo) ? photo : '',
      service: service
    };
  }
  function money(f) {
    if (!f.price) return '';
    return f.currency + ' ' + Math.round(f.price).toLocaleString('en-US') + (f.unit ? ' ' + f.unit : '');
  }

  function listingUrl(listing, o) {
    var f = facts(listing);
    if (!f.id) return '';
    var url = origin() + '/s/' + encodeURIComponent(f.id);
    var tour = o && o.tour;
    if (tour != null && TOUR_RE.test(String(tour))) url += '?tour=' + encodeURIComponent(String(tour));
    return url;
  }

  /* The words that travel with the link. A guest is passing on a find;
     a host is inviting bookings, so it reads like an invitation. */
  function listingText(listing, o) {
    var f = facts(listing), price = money(f), bits = [];
    if (o && o.host) {
      bits.push((f.service === 'stays' ? 'Stay at ' : '') + f.title + (f.place ? ' in ' + f.place : '') + '.');
      if (price) bits.push(price + ', booked directly on Cabana.');
      else bits.push('Book it directly on Cabana.');
      return bits.join(' ');
    }
    bits.push(f.title + (f.place ? ', ' + f.place : ''));
    if (price) bits[0] += ' · ' + price;
    return bits[0] + '. Found it on Cabana.';
  }

  function listingPayload(listing, o) {
    o = o || {};
    var f = facts(listing);
    return {
      url: listingUrl(listing, o),
      title: f.title,
      text: o.text || listingText(listing, o),
      imageUrl: f.image ? thumb(f.image, 240, 240) : '',
      subtitle: [f.place, money(f)].filter(Boolean).join(' · '),
      heading: o.heading || (o.host ? 'Share your listing' : 'Share this place'),
      host: !!o.host
    };
  }
  function shareListing(listing, o) { return share(listingPayload(listing, o)); }

  /* Photos through the image CDN, so the preview in the sheet is a
     thumbnail and not a 6 MB phone original. */
  function thumb(src, w, h) {
    var OBJ = '/storage/v1/object/public/';
    if (typeof src !== 'string' || src.indexOf(OBJ) === -1) return src || '';
    return src.replace(OBJ, '/storage/v1/render/image/public/') + '?width=' + w + '&height=' + h + '&resize=cover&quality=70';
  }

  var ICON = {
    share: '<path d="M12 14.5V3.5"/><path d="m7.8 7.4 4.2-4.2 4.2 4.2"/><path d="M8.5 10.5H7A2.5 2.5 0 0 0 4.5 13v5.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V13a2.5 2.5 0 0 0-2.5-2.5h-1.5"/>',
    whatsapp: '<path d="M4.1 19.9 5.2 16A8.2 8.2 0 1 1 8.3 19z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.3 7.9c.2-.4.4-.5.7-.5h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4 0 .6l-.5.6c-.1.1-.2.3 0 .5a6.2 6.2 0 0 0 2.6 2.3c.2.1.4.1.5 0l.6-.7c.2-.2.3-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .9-.6 1.6-1.5 1.8-.8.2-2.4 0-4.3-1.6-1.9-1.7-2.6-3.6-2.3-6.1z" fill="currentColor"/>',
    telegram: '<path d="M20.6 4.3 2.9 11.1c-.9.4-.9 1.1 0 1.4l4.4 1.4 1.7 5.3c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.4-1.8-1.5-1.6z" fill="currentColor"/><path d="m7.6 13.8 9.6-6.1-7.3 6.9-.3 3.5" fill="none" stroke="#2AABEE" stroke-width="1.2" stroke-linejoin="round"/>',
    x: '<path d="M4.2 4h4.4l11.2 16h-4.4z" fill="currentColor"/><path d="M19 4l-6 6.9M5 20l6-6.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    facebook: '<path d="M13.6 21v-7.6h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.1H8v3h2.6V21z" fill="currentColor"/>',
    linkedin: '<rect x="4" y="9.2" width="3.3" height="10.8" rx=".4" fill="currentColor"/><circle cx="5.65" cy="5.6" r="1.95" fill="currentColor"/><path d="M10 9.2h3.1v1.5c.5-.9 1.7-1.8 3.4-1.8 3.1 0 3.6 2 3.6 4.6V20h-3.2v-5.7c0-1.4 0-3-1.9-3s-2.1 1.4-2.1 2.9V20H10z" fill="currentColor"/>',
    email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    sms: '<path d="M12 4.5c4.7 0 8.5 3 8.5 6.8s-3.8 6.8-8.5 6.8c-.9 0-1.8-.1-2.6-.3L5.2 19.5l.9-3.4c-1.6-1.2-2.6-2.9-2.6-4.8 0-3.8 3.8-6.8 8.5-6.8z" fill="currentColor"/>',
    link: '<path d="M10 13.6a4 4 0 0 0 6 .4l2.6-2.6a4 4 0 0 0-5.7-5.7L11.5 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M14 10.4a4 4 0 0 0-6-.4l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    more: '<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>',
    close: '<path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    tick: '<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    download: '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function svg(name, cls) {
    var stroke = name === 'share';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"' +
      (stroke ? ' fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"' : '') +
      '>' + ICON[name] + '</svg>';
  }

  /* Button HTML for any listing surface. Variants:
       icon   ghost glyph over a photo, like the heart beside it
       glass  frosted round control over a gallery
       pill   labelled button on a light surface
     opts.className replaces the variant's own class when a page wants
     its native button style (the host board uses its .btn). */
  function button(listing, o) {
    o = o || {};
    var p = listingPayload(listing, o);
    if (!p.url) return '';
    var variant = /^(icon|glass|pill)$/.test(o.variant || '') ? o.variant : 'pill';
    var label = o.label || (o.host ? 'Share your listing' : 'Share');
    var aria = o.ariaLabel || (o.host ? 'Share your listing, ' : 'Share ') + p.title;
    var cls = o.className ? 'cshare-btn ' + o.className : 'cshare-btn cshare-' + variant;
    var showLabel = variant === 'pill' || o.showLabel;
    return '<button type="button" class="' + esc(cls) + '" data-cabana-share' +
      ' data-share-url="' + esc(p.url) + '" data-share-title="' + esc(p.title) + '"' +
      ' data-share-text="' + esc(p.text) + '" data-share-heading="' + esc(p.heading) + '"' +
      ' data-share-sub="' + esc(p.subtitle) + '"' + (p.host ? ' data-share-host' : '') +
      (p.imageUrl ? ' data-share-image="' + esc(p.imageUrl) + '"' : '') +
      ' aria-label="' + esc(aria) + '" title="' + esc(label) + '">' + svg('share', 'cshare-glyph') +
      (showLabel ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  }

  /* ══ STYLES ═══════════════════════════════════════════════════════ */
  var CSS = [
    /* Buttons */
    /* Zero specificity, so a page that styles the button with its own
       class (opts.className) wins every property it sets. */
    ':where(.cshare-btn){font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;white-space:nowrap;}',
    '.cshare-btn .cshare-glyph{width:18px;height:18px;flex-shrink:0;}',
    '.cshare-icon{position:absolute;top:8px;right:44px;z-index:4;width:34px;height:34px;border-radius:50%;border:0;padding:0;background:none;color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .28s cubic-bezier(.34,1.56,.64,1);}',
    '.cshare-icon .cshare-glyph{width:20px;height:20px;stroke:#fff;stroke-width:2.1;filter:drop-shadow(0 1px 2px rgba(10,10,20,.45)) drop-shadow(0 0 6px rgba(10,10,20,.18));}',
    '.cshare-icon:hover{transform:scale(1.12);}.cshare-icon:active{transform:scale(.92);}',
    '.cshare-icon:focus-visible{outline:2px solid #fff;outline-offset:1px;border-radius:50%;}',
    '.cshare-glass{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;min-width:40px;padding:0 15px 0 13px;border:0;border-radius:999px;background:rgba(252,252,253,.92);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#120F2B;font-size:13px;font-weight:650;letter-spacing:-.005em;box-shadow:0 2px 10px rgba(10,10,20,.12);transition:transform .2s,box-shadow .2s;}',
    '.cshare-glass:hover{transform:scale(1.05);box-shadow:0 6px 18px rgba(10,10,20,.16);}',
    '.cshare-glass:focus-visible,.cshare-pill:focus-visible{outline:2px solid #7B2FF7;outline-offset:2px;}',
    '.cshare-pill{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 15px;border-radius:12px;border:1.5px solid rgba(18,15,43,.12);background:#fff;color:#120F2B;font-size:13px;font-weight:650;transition:border-color .2s,color .2s,background .2s;}',
    '.cshare-pill:hover{border-color:rgba(123,47,247,.45);color:#5B21D6;}',
    /* Sheet: the dialog is the full-viewport scrim, the panel animates.
       No transform on the dialog itself, so fixed children (the toast)
       stay anchored to the viewport. */
    'dialog.cshare{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:rgba(14,10,34,0);display:flex;align-items:center;justify-content:center;transition:background-color .28s cubic-bezier(.22,1,.36,1);overflow:hidden;color:#120F2B;font-family:"Geist","Inter",system-ui,-apple-system,"Segoe UI",sans-serif;}',
    'dialog.cshare:not([open]){display:none;}',
    'dialog.cshare::backdrop{background:transparent;}',
    'dialog.cshare.on{background:rgba(14,10,34,.42);}',
    '.cshare-panel{position:relative;width:min(468px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow-y:auto;overscroll-behavior:contain;background:#fff;border-radius:26px;box-shadow:0 2px 8px rgba(18,15,43,.06),0 34px 90px rgba(24,10,70,.32);opacity:0;transform:translateY(12px) scale(.97);transition:opacity .24s cubic-bezier(.22,1,.36,1),transform .38s cubic-bezier(.22,1,.36,1);}',
    'dialog.cshare.on .cshare-panel{opacity:1;transform:none;}',
    '@media(max-width:640px){dialog.cshare{align-items:flex-end;}.cshare-panel{width:100%;max-height:92dvh;border-radius:26px 26px 0 0;padding-bottom:env(safe-area-inset-bottom,0);transform:translateY(100%);opacity:1;}.cshare-grab{display:block!important;}}',
    '.cshare-grab{display:none;width:38px;height:4px;border-radius:9px;background:rgba(18,15,43,.14);margin:9px auto 0;}',
    '.cshare-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 4px;}',
    '.cshare-head h2{margin:0;font-size:17px;font-weight:720;letter-spacing:-.02em;}',
    '.cshare-x{width:34px;height:34px;border-radius:50%;border:0;background:rgba(18,15,43,.06);color:#4B4867;display:grid;place-items:center;cursor:pointer;transition:background .2s;}',
    '.cshare-x:hover{background:rgba(18,15,43,.1);}.cshare-x svg{width:15px;height:15px;}',
    '.cshare-x:focus-visible,.cshare-t:focus-visible,.cshare-copy:focus-visible,.cshare-more:focus-visible,.cshare-save:focus-visible{outline:2px solid #7B2FF7;outline-offset:2px;}',
    /* The postcard: what the recipient will see, before it is sent. */
    '.cshare-card{display:flex;gap:13px;align-items:center;margin:10px 20px 4px;padding:10px;border-radius:18px;background:linear-gradient(135deg,#F7F4FF,#F2F6FF);border:1px solid rgba(123,47,247,.1);}',
    '.cshare-card img,.cshare-card .cshare-ph{width:62px;height:62px;border-radius:13px;object-fit:cover;flex-shrink:0;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);}',
    '.cshare-card b{display:block;font-size:14.5px;font-weight:700;letter-spacing:-.012em;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
    '.cshare-card span{display:block;margin-top:3px;font-size:12px;line-height:1.4;color:#6E6A88;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.cshare-card i{font-style:normal;display:block;margin-top:4px;font-size:10.5px;font-weight:650;letter-spacing:.04em;color:#7B2FF7;}',
    '.cshare-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 4px;padding:14px 14px 6px;}',
    '.cshare-t{display:flex;flex-direction:column;align-items:center;gap:7px;padding:8px 2px;border:0;border-radius:16px;background:none;color:#2E2A4A;font:inherit;font-size:11.5px;font-weight:600;text-decoration:none;cursor:pointer;transition:background .2s;}',
    '.cshare-t:hover{background:rgba(18,15,43,.04);}',
    '.cshare-t .cshare-dot{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;color:#fff;box-shadow:0 4px 12px rgba(18,15,43,.12),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .22s cubic-bezier(.34,1.56,.64,1);}',
    '.cshare-t:hover .cshare-dot{transform:translateY(-2px) scale(1.04);}',
    '.cshare-t:active .cshare-dot{transform:scale(.94);}',
    '.cshare-dot svg{width:24px;height:24px;}',
    '.cshare-t.is-copied .cshare-dot{background:#0E9384!important;}',
    '.cshare-link{display:flex;align-items:center;gap:8px;margin:8px 20px 0;padding:6px 6px 6px 14px;border-radius:14px;background:#F6F4FD;border:1px solid rgba(18,15,43,.07);}',
    '.cshare-link input{flex:1;min-width:0;border:0;background:none;font:500 13px/1.2 inherit;font-family:inherit;color:#4B4867;outline:none;text-overflow:ellipsis;}',
    '.cshare-copy{flex-shrink:0;height:34px;padding:0 14px;border:0;border-radius:10px;background:#120F2B;color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:background .2s;}',
    '.cshare-copy svg{width:14px;height:14px;}.cshare-copy.is-copied{background:#0E9384;}',
    '.cshare-qr{display:flex;gap:16px;align-items:center;margin:14px 20px 0;padding:14px;border-radius:18px;border:1px solid rgba(18,15,43,.08);}',
    '.cshare-qr canvas{flex-shrink:0;border-radius:10px;background:#fff;box-shadow:0 0 0 1px rgba(18,15,43,.06);}',
    '.cshare-qr b{display:block;font-size:13.5px;font-weight:700;letter-spacing:-.01em;}',
    '.cshare-qr p{margin:4px 0 10px;font-size:12px;line-height:1.5;color:#6E6A88;}',
    '.cshare-save{height:32px;padding:0 12px;border-radius:10px;border:1px solid rgba(18,15,43,.12);background:#fff;color:#2E2A4A;font:inherit;font-size:12px;font-weight:650;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}',
    '.cshare-save svg{width:14px;height:14px;}.cshare-save:hover{border-color:rgba(123,47,247,.4);color:#5B21D6;}',
    '.cshare-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 20px 18px;font-size:11.5px;color:#8C89A6;}',
    '.cshare-more{border:0;background:none;color:#5B21D6;font:inherit;font-size:12.5px;font-weight:650;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:6px 4px;border-radius:8px;}',
    '.cshare-more svg{width:16px;height:16px;}',
    /* Toast */
    '.cshare-toast{position:fixed;left:50%;bottom:max(24px,env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;gap:9px;max-width:calc(100vw - 32px);padding:11px 16px 11px 13px;border-radius:14px;background:#120F2B;color:#fff;font:600 13px/1.35 "Geist","Inter",system-ui,sans-serif;box-shadow:0 12px 34px rgba(18,15,43,.32);opacity:0;transform:translate(-50%,14px);transition:opacity .22s,transform .32s cubic-bezier(.22,1,.36,1);pointer-events:none;}',
    '.cshare-toast.on{opacity:1;transform:translate(-50%,0);}',
    '.cshare-toast svg{width:16px;height:16px;flex-shrink:0;color:#5EE6C9;}',
    '@media(max-width:640px){dialog.cshare .cshare-toast{bottom:auto;top:max(18px,env(safe-area-inset-top,0px));transform:translate(-50%,-14px);}dialog.cshare .cshare-toast.on{transform:translate(-50%,0);}}',
    '@media(max-width:380px){.cshare-qr canvas{width:104px!important;height:104px!important;}.cshare-t .cshare-dot{width:46px;height:46px;}}',
    '@media(prefers-reduced-motion:reduce){dialog.cshare,.cshare-panel,.cshare-toast,.cshare-t .cshare-dot,.cshare-icon,.cshare-glass{transition:none!important;}}'
  ].join('');
  function ensureCSS() {
    if (!D || D.getElementById('cshare-css')) return;
    var st = D.createElement('style');
    st.id = 'cshare-css';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  /* ══ TOAST ════════════════════════════════════════════════════════ */
  var toastEl = null, toastTimer = 0;
  function toast(msg) {
    ensureCSS();
    /* Inside an open modal dialog everything outside is inert and sits
       below the top layer, so the toast goes where the guest is. */
    var host = (S && S.dialog) || D.body;
    if (!toastEl) {
      toastEl = D.createElement('div');
      toastEl.className = 'cshare-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
    }
    if (toastEl.parentNode !== host) host.appendChild(toastEl);
    toastEl.innerHTML = svg('tick') + '<span></span>';
    toastEl.querySelector('span').textContent = msg;
    void toastEl.offsetWidth;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl && toastEl.classList.remove('on'); }, 2400);
  }

  /* ══ CLIPBOARD ════════════════════════════════════════════════════ */
  function copy(text) {
    text = String(text || '');
    var legacy = function () {
      var host = (S && S.dialog) || D.body;
      var ta = D.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      host.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = D.execCommand('copy'); } catch (e) {}
      ta.remove();
      return ok;
    };
    var nav = global.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText && global.isSecureContext !== false) {
      return nav.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(); });
    }
    return Promise.resolve(legacy());
  }

  /* ══ SHARE ════════════════════════════════════════════════════════ */
  function isHandheld() {
    var nav = global.navigator || {};
    var coarse = false;
    try { coarse = global.matchMedia && global.matchMedia('(pointer:coarse)').matches && !global.matchMedia('(hover:hover)').matches; } catch (e) {}
    return coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '') ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  }
  function normal(o) {
    o = o || {};
    var url = String(o.url || (global.location && global.location.href) || SITE);
    return {
      url: url,
      title: String(o.title || 'Cabana'),
      text: String(o.text || ''),
      image: typeof global.Blob === 'function' && o.image instanceof global.Blob ? o.image : null,
      imageUrl: String(o.imageUrl || ''),
      subtitle: String(o.subtitle == null ? (o.text || '') : o.subtitle),
      heading: String(o.heading || 'Share'),
      host: !!o.host
    };
  }

  /* Native first on phones and tablets: it knows the guest's apps. The
     call happens synchronously inside the click, so the browser's user
     activation is still live. Anything but a cancel falls back to the
     sheet, so the guest is never left with nothing. */
  function share(opts) {
    var o = normal(opts), nav = global.navigator || {};
    if (typeof nav.share === 'function' && isHandheld() && !(opts && opts.sheet)) {
      var data = { title: o.title, text: o.text, url: o.url };
      if (o.image && typeof global.File === 'function' && typeof nav.canShare === 'function') {
        try {
          var file = new global.File([o.image], 'cabana-' + slug(o.title) + '.jpg', { type: o.image.type || 'image/jpeg' });
          if (nav.canShare({ files: [file], title: o.title, text: o.text, url: o.url })) data.files = [file];
        } catch (e) {}
      }
      var p;
      try { p = nav.share(data); } catch (e) { p = Promise.reject(e); }
      return Promise.resolve(p).then(function () { emit('native', o.url); return 'shared'; }, function (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
        openSheet(o);
        return 'sheet';
      });
    }
    openSheet(o);
    return Promise.resolve('sheet');
  }
  function slug(s) { return String(s || 'cabana').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cabana'; }

  function targets(o) {
    var u = encodeURIComponent(o.url);
    var line = o.text ? o.text + ' ' : '';
    var both = encodeURIComponent(line + o.url);
    return [
      { id: 'whatsapp', label: 'WhatsApp', bg: '#25D366', href: 'https://wa.me/?text=' + both },
      { id: 'telegram', label: 'Telegram', bg: '#2AABEE', href: 'https://t.me/share/url?url=' + u + (o.text ? '&text=' + encodeURIComponent(o.text) : '') },
      { id: 'x', label: 'X', bg: '#0F1419', href: 'https://x.com/intent/tweet?url=' + u + (o.text ? '&text=' + encodeURIComponent(o.text) : '') },
      { id: 'facebook', label: 'Facebook', bg: '#1877F2', href: 'https://www.facebook.com/sharer/sharer.php?u=' + u },
      { id: 'linkedin', label: 'LinkedIn', bg: '#0A66C2', href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u },
      { id: 'email', label: 'Email', bg: 'linear-gradient(135deg,#8B5CF6,#5B21D6)', href: 'mailto:?subject=' + encodeURIComponent(o.title) + '&body=' + encodeURIComponent(line + '\n\n' + o.url) },
      /* `sms:?&body=` is the one spelling both iOS and Android read. */
      { id: 'sms', label: 'Messages', bg: '#34C759', href: 'sms:?&body=' + both },
      { id: 'copy', label: 'Copy link', bg: '#2E2A4A' }
    ];
  }

  var S = null;
  function closeSheet() {
    if (!S) return;
    var s = S; S = null;
    D.removeEventListener('keydown', s.key, true);
    s.dialog.classList.remove('on');
    if (toastEl && toastEl.parentNode === s.dialog) toastEl.remove();
    var done = function () {
      try { s.dialog.close(); } catch (e) {}
      s.dialog.remove();
      D.body.style.overflow = s.overflow;
      if (s.returnFocus && s.returnFocus.isConnected && s.returnFocus.focus) s.returnFocus.focus({ preventScroll: true });
    };
    var reduce = false;
    try { reduce = global.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
    if (reduce) done(); else setTimeout(done, 240);
  }

  function openSheet(opts) {
    ensureCSS();
    if (S) closeSheet();
    var o = normal(opts);
    var dialog = D.createElement('dialog');
    dialog.className = 'cshare';
    dialog.setAttribute('aria-labelledby', 'cshare-title');
    var host = '';
    try { host = new URL(o.url).host.replace(/^www\./, ''); } catch (e) {}
    var tiles = targets(o).map(function (t) {
      var inner = '<span class="cshare-dot" style="background:' + t.bg + '">' + svg(t.id === 'copy' ? 'link' : t.id) + '</span><span class="cshare-tl">' + esc(t.label) + '</span>';
      return t.href
        ? '<a class="cshare-t" data-ch="' + t.id + '" href="' + esc(t.href) + '"' + (/^https:/.test(t.href) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + inner + '</a>'
        : '<button type="button" class="cshare-t" data-ch="' + t.id + '">' + inner + '</button>';
    }).join('');
    var canNative = typeof (global.navigator || {}).share === 'function';
    dialog.innerHTML =
      '<div class="cshare-panel" role="document">' +
        '<div class="cshare-grab" aria-hidden="true"></div>' +
        '<div class="cshare-head"><h2 id="cshare-title">' + esc(o.heading) + '</h2>' +
          '<button type="button" class="cshare-x" data-close aria-label="Close">' + svg('close') + '</button></div>' +
        '<div class="cshare-card">' +
          (o.imageUrl ? '<img src="' + esc(o.imageUrl) + '" alt="" decoding="async">' : '<span class="cshare-ph" aria-hidden="true"></span>') +
          '<div style="min-width:0"><b>' + esc(o.title) + '</b>' + (o.subtitle ? '<span>' + esc(o.subtitle) + '</span>' : '') +
          (host ? '<i>' + esc(host.toUpperCase()) + '</i>' : '') + '</div></div>' +
        '<div class="cshare-grid">' + tiles + '</div>' +
        '<div class="cshare-link"><input type="text" readonly aria-label="Link to share" value="' + esc(o.url) + '">' +
          '<button type="button" class="cshare-copy" data-ch="copy">' + svg('link') + '<span>Copy</span></button></div>' +
        '<div class="cshare-qr"><canvas width="132" height="132" role="img" aria-label="QR code for this link"></canvas>' +
          '<div><b>Scan to open</b><p>' + (o.host ? 'Print it, pin it at reception, or show it to a guest standing in front of you.' : 'Point a phone camera here to open it on that phone.') + '</p>' +
          '<button type="button" class="cshare-save">' + svg('download') + 'Save QR code</button></div></div>' +
        '<div class="cshare-foot"><span>Links show a preview with photo and price.</span>' +
          (canNative ? '<button type="button" class="cshare-more" data-ch="native">' + svg('more') + 'More apps</button>' : '') + '</div>' +
      '</div>';
    D.body.appendChild(dialog);

    var canvas = dialog.querySelector('canvas');
    try { qr.draw(canvas, o.url, { size: 132 }); } catch (e) { dialog.querySelector('.cshare-qr').remove(); }

    S = { dialog: dialog, opts: o, overflow: D.body.style.overflow, returnFocus: D.activeElement };
    D.body.style.overflow = 'hidden';

    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('[data-close]')) { closeSheet(); return; }
      var t = e.target.closest('[data-ch]');
      if (t) {
        var ch = t.getAttribute('data-ch');
        if (ch === 'copy') {
          e.preventDefault();
          copy(o.url).then(function (ok) {
            if (!ok) { dialog.querySelector('.cshare-link input').select(); toast('Select the link and copy it'); return; }
            var btn = dialog.querySelector('.cshare-copy'), tile = dialog.querySelector('.cshare-t[data-ch=copy]');
            [btn, tile].forEach(function (b) { if (b) b.classList.add('is-copied'); });
            if (btn) btn.querySelector('span').textContent = 'Copied';
            clearTimeout(S && S.copied);
            if (S) S.copied = setTimeout(function () {
              [btn, tile].forEach(function (b) { if (b) b.classList.remove('is-copied'); });
              if (btn) btn.querySelector('span').textContent = 'Copy';
            }, 1800);
            toast('Link copied');
            emit('copy', o.url);
          });
          return;
        }
        if (ch === 'native') {
          e.preventDefault();
          var nav = global.navigator;
          try {
            nav.share({ title: o.title, text: o.text, url: o.url }).then(function () { emit('native', o.url); closeSheet(); }, function () {});
          } catch (err) {}
          return;
        }
        emit(ch, o.url);
        /* Email and SMS open another app; a web target opens a tab. In
           both cases the sheet has done its job. */
        setTimeout(closeSheet, 120);
        return;
      }
      if (e.target.closest('.cshare-save')) saveQR(o);
    });
    S.key = function (e) {
      if (!S || e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(dialog.querySelectorAll('a[href],button,input'), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    D.addEventListener('keydown', S.key, true);

    try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); }
    var first = dialog.querySelector('.cshare-t');
    if (first) first.focus({ preventScroll: true });
    requestAnimationFrame(function () { requestAnimationFrame(function () { dialog.classList.add('on'); }); });
    return dialog;
  }

  /* A print-ready QR: big modules, a white margin, the place's name
     underneath, so a host can stick it on the fridge or the front desk. */
  function saveQR(o) {
    var c = D.createElement('canvas');
    var code = qr.draw(c, o.url, { scale: 1, size: 640 });
    if (!code) return;
    var out = D.createElement('canvas');
    var w = c.width, pad = 0, cap = 96;
    out.width = w; out.height = w + cap;
    var x = out.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, out.width, out.height);
    x.drawImage(c, pad, 0);
    x.fillStyle = '#120F2B';
    x.textAlign = 'center';
    x.font = '700 26px Geist, Inter, system-ui, sans-serif';
    var title = o.title.length > 38 ? o.title.slice(0, 37) + '…' : o.title;
    x.fillText(title, w / 2, w + 22);
    x.fillStyle = '#7B2FF7';
    x.font = '600 17px Geist, Inter, system-ui, sans-serif';
    x.fillText('Scan to open on Cabana', w / 2, w + 54);
    out.toBlob(function (blob) {
      if (!blob) return;
      var a = D.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cabana-' + slug(o.title) + '-qr.png';
      (S && S.dialog || D.body).appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast('QR code saved');
      emit('qr', o.url);
    }, 'image/png');
  }

  /* ══ DELEGATION ═══════════════════════════════════════════════════
     Bubble phase, so a page's own handlers (a card that opens on tap)
     see the click first and can step aside; preventDefault here still
     stops a surrounding link from navigating. */
  if (D) {
    D.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-cabana-share]');
      if (!b) return;
      e.preventDefault();
      share({
        url: b.getAttribute('data-share-url') || undefined,
        title: b.getAttribute('data-share-title') || D.title,
        text: b.getAttribute('data-share-text') || '',
        imageUrl: b.getAttribute('data-share-image') || '',
        subtitle: b.getAttribute('data-share-sub'),
        heading: b.getAttribute('data-share-heading') || 'Share',
        host: b.hasAttribute('data-share-host')
      });
    });
    ensureCSS();
  }

  global.CabanaShare = {
    share: share,
    sheet: function (o) { return openSheet(o); },
    close: closeSheet,
    listingUrl: listingUrl,
    listingText: listingText,
    shareListing: shareListing,
    button: button,
    copy: copy,
    toast: toast,
    qr: qr,
    TOUR_TOKEN: TOUR_RE
  };
  try { global.dispatchEvent(new global.CustomEvent('cabana:share-ready')); } catch (e) {}
})(window);
