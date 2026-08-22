/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · CATEGORY RAILS  v2
   ───────────────────────────────────────────────────────────────────
   One horizontal slideshow per service on the dashboard, stacked below
   "Book a Space".

   Two rules earn this file its place, and v1 broke both:

     1. A rail reads the SAME table its service page reads.
        v1 read scraped_carhire while carhire.html reads car_fleet, and
        scraped_tours while tours.html reads tours_public. A guest was
        shown a Toyota that did not exist on the page the card opened.
        Every source below is the service page's own source, so the
        dashboard can never promise stock the destination cannot show.

     2. A card opens ITS listing, not its category.
        Each row carries an id, and each rail knows the deep link its
        service page answers to. Tapping a card lands on that listing
        with its sheet open, never on a generic index the guest then
        has to search.

   Flights and rides have no rail. Both are request flows with nothing
   to browse: a flight is a search against a live API, a ride is a
   dispatch. A thumbnail shelf of neither means anything.

   Design rules, unchanged and non-negotiable:
     · Every fetch is independent. One slow or empty table must never
       stop the others rendering.
     · A rail with no rows removes itself rather than showing an empty
       shell or invented stock, and reappears on the next load as soon
       as its service page has one live listing.
     · Nothing here throws. Ever.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaCategories) return;
  var doc = global.document;

  var SUPA = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  function safe(fn, l) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[cat:' + (l || '?') + ']', e && e.message); }
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n, cur) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return '';
    return (cur || 'KES') + ' ' + v.toLocaleString();
  }

  /* photos columns are jsonb on some tables and text[] on others, and a
     few rows still hold a JSON string. One reader for all three. */
  function firstPhoto(v) {
    if (!v) return null;
    if (Array.isArray(v)) return v.filter(Boolean)[0] || null;
    if (typeof v === 'string') {
      var t = v.trim();
      if (t.charAt(0) === '[') {
        try { var p = JSON.parse(t); return Array.isArray(p) ? (p.filter(Boolean)[0] || null) : null; }
        catch (e) { return null; }
      }
      return t || null;
    }
    return null;
  }

  function get(path) {
    return fetch(SUPA + '/rest/v1/' + path, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  /* Sorting happens here rather than in the URL on purpose. PostgREST
     fails the whole request with a 400 when an ordered column has been
     renamed, which turns a schema drift into a rail that silently
     vanishes. A client-side sort degrades to "unsorted", never to
     "empty". Same reasoning as the `select=*` below. */
  function by(key, dir) {
    var d = dir === 'desc' ? -1 : 1;
    return function (a, b) {
      var x = a[key], y = b[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;          // nulls last, either direction
      if (y == null) return -1;
      return x < y ? -d : x > y ? d : 0;
    };
  }

  var HOUR = 3600000;

  /* ═══ CATEGORIES ═════════════════════════════════════════════════
     Each declares:
       key    · slot id and placeholder glyph
       title  · rail heading
       dest   · the SVC key on the dashboard, for "View all" and for the
                service transition a card plays on its way out
       fetch  · a promise of raw rows from the service page's own table
       map    · row → { img, title, sub, price, q, to }
                `q`  a query fragment the destination page understands
                     (appended after ?back=1), or
                `to` a full URL when the listing lives on its own page. */
  var CATS = [
    {
      /* events_public, the same view events.html renders. */
      key: 'events',
      title: 'Events near you',
      dest: 'events',
      fetch: function () {
        return get('events_public?select=*&limit=60').then(function (rows) {
          var now = Date.now();
          return (rows || []).filter(function (e) {
            /* The page treats an event as over six hours after it starts
               unless it declares an end. The rail must agree, or the
               dashboard advertises a gig that finished on Saturday. */
            var end = e.ends_at ? Date.parse(e.ends_at)
                                : Date.parse(e.starts_at) + 6 * HOUR;
            return !isNaN(end) && end > now;
          }).sort(by('starts_at', 'asc')).slice(0, 12);
        });
      },
      map: function (e) {
        var d = e.starts_at
          ? new Date(e.starts_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
          : '';
        return {
          img: e.cover_url || firstPhoto(e.photos),
          title: e.title,
          sub: [d, e.venue || e.city].filter(Boolean).join(' · '),
          price: Number(e.price_from) === 0 ? 'Free' : money(e.price_from),
          q: e.id ? 'open=' + encodeURIComponent(e.id) : ''
        };
      }
    },
    {
      /* tours_public, the same view tours.html renders. v1 read
         scraped_tours, a table the tours page does not know about. */
      key: 'tours',
      title: 'Tours & safaris',
      dest: 'tours',
      fetch: function () {
        return get('tours_public?select=*&limit=40').then(function (rows) {
          return (rows || [])
            .sort(by('sort_weight', 'desc'))
            .sort(by('featured', 'desc'))
            .slice(0, 12);
        });
      },
      map: function (t) {
        return {
          img: t.cover_url || firstPhoto(t.photos),
          title: t.title,
          sub: [t.destination || t.county, t.duration_label].filter(Boolean).join(' · '),
          price: Number(t.price_kes) === 0 ? 'Free' : money(t.price_kes),
          q: t.id ? 'open=' + encodeURIComponent(t.id) : ''
        };
      }
    },
    {
      /* Real kitchens with real menus. The rail prefers the dish over the
         restaurant: a photographed plate with a price is the only thing
         on a home screen that makes anyone hungry. But a kitchen that has
         not built its menu yet is still live on food.html, and a rail that
         hid it would under-report the service. So dishes lead, kitchens
         with no dish of their own fill in behind, and either way the card
         opens the kitchen's page, which is where an order is placed. */
      key: 'food',
      title: 'Food & restaurants',
      dest: 'food',
      fetch: function () {
        return Promise.all([
          get('menu_items?is_available=eq.true'
            + '&select=id,name,price,promo_price,currency,photo,listing_id,listings(title,is_active)'
            + '&order=photo.desc.nullslast,created_at.desc&limit=18'),
          get('listings?select=id,title,area,city,location,photos,price_night,currency'
            + '&service=eq.food&is_active=is.true&limit=20')
        ]).then(function (res) {
          var seen = {};
          var dishes = (res[0] || []).filter(function (d) {
            /* A dish whose kitchen has been taken down must not linger on
               the dashboard pointing at a dead page. */
            if (!d.listing_id) return false;
            if (d.listings && d.listings.is_active === false) return false;
            seen[d.listing_id] = 1;
            return true;
          }).map(function (d) {
            var p = d.promo_price != null ? d.promo_price : d.price;
            return {
              img: d.photo,
              title: d.name,
              sub: (d.listings && d.listings.title) || 'On the menu',
              price: money(p, d.currency),
              lid: d.listing_id
            };
          });

          var kitchens = (res[1] || []).filter(function (l) {
            return l.id && !seen[l.id];
          }).map(function (l) {
            return {
              img: firstPhoto(l.photos),
              title: l.title,
              sub: l.area || l.city || (l.location ? String(l.location).split(',')[0] : 'Kitchen'),
              /* No dish price to quote, so nothing is quoted. A made-up
                 "from" figure on a menu nobody has written is a lie. */
              price: '',
              lid: l.id
            };
          });

          return dishes.concat(kitchens).slice(0, 12);
        });
      },
      map: function (d) {
        return {
          img: d.img,
          title: d.title,
          sub: d.sub,
          price: d.price,
          to: 'restaurant.html?id=' + encodeURIComponent(d.lid)
        };
      }
    },
    {
      /* car_fleet + car_operators, exactly what carhire.html loads.
         Rates are stored in minor units (KES cents); the page divides by
         100 before it shows anything and so must the rail, or a 9,500/day
         Rav4 reads as 950,000. */
      key: 'carhire',
      title: 'Car hire',
      dest: 'carhire',
      fetch: function () {
        return Promise.all([
          get('car_fleet?select=*&status=eq.active&limit=60'),
          get('car_operators?select=id,name,city&verified=is.true')
        ]).then(function (res) {
          var ops = {};
          (res[1] || []).forEach(function (o) { ops[o.id] = o; });
          return (res[0] || []).map(function (v) {
            v.__op = ops[v.operator_id] || null;
            return v;
          }).sort(by('day_rate', 'asc')).slice(0, 12);
        });
      },
      map: function (c) {
        var name = [c.make, c.model].filter(Boolean).join(' ');
        var rate = Number(c.day_rate) > 0 ? Number(c.day_rate) / 100 : 0;
        return {
          img: firstPhoto(c.photos),
          title: name || 'Vehicle',
          sub: [c.__op && c.__op.city, c.seats ? c.seats + ' seats' : '', c.transmission]
                 .filter(Boolean).join(' · '),
          price: rate ? money(rate) + '/day' : '',
          q: c.id ? 'open=' + encodeURIComponent(c.id) : ''
        };
      }
    },
    {
      /* shopping.html merges a curated seller catalogue with anything
         partners listed themselves, and prefixes the two id spaces so
         they cannot collide. The rail reproduces both the merge and the
         prefixes, so ?open= resolves to the same card on arrival. */
      key: 'shopping',
      title: 'Shopping',
      dest: 'shopping',
      fetch: function () {
        return Promise.all([
          get('scraped_shopping?select=*&active=is.true&in_stock=is.true&limit=40'),
          get('listings?select=*&type=eq.shopping&is_active=is.true&limit=40')
        ]).then(function (res) {
          var listed = (res[1] || []).map(function (l) {
            return {
              pid: 'l' + l.id,
              name: l.title || 'Product',
              seller: l.seller || l.area || l.city || 'Local seller',
              price: Number(l.price_night) || 0,
              img: firstPhoto(l.photos),
              hot: false
            };
          });
          var curated = (res[0] || []).map(function (r) {
            return {
              pid: 's' + r.id,
              name: r.name || 'Product',
              seller: r.seller || r.market || 'Local seller',
              price: Number(r.price) || 0,
              img: r.image_url || null,
              hot: !!r.hot
            };
          });
          return listed.concat(curated).sort(function (a, b) {
            return (Number(b.hot) - Number(a.hot)) || a.name.localeCompare(b.name);
          }).slice(0, 12);
        });
      },
      map: function (p) {
        return {
          img: p.img,
          title: p.name,
          sub: p.seller,
          price: p.price > 0 ? money(p.price) : 'Price on request',
          q: 'open=' + encodeURIComponent(p.pid)
        };
      }
    },
    {
      /* The rooms board: a flatshare priced by the month, never by the
         night. roommates.html accepts ?room=<id>. */
      key: 'roommates',
      title: 'Rooms & flatmates',
      dest: 'roommates',
      fetch: function () {
        return get('listings?select=id,title,area,city,location,price_month,price_night,photos,status,type,service'
                 + '&is_active=is.true&or=(type.eq.room,service.eq.roommates)&limit=40')
          .then(function (rows) {
            return (rows || []).filter(function (l) {
              var st = String(l.status || 'active').toLowerCase();
              return st === 'active' || st === 'published' || st === 'live';
            }).slice(0, 12);
          });
      },
      map: function (l) {
        /* A room is a monthly product. Where a monthly rate exists it is
           the honest number; a legacy row that only carries price_night
           is still shown per month, which is the unit it was let at. */
        var rent = l.price_month || l.price_night;
        return {
          img: firstPhoto(l.photos),
          title: l.title,
          sub: l.area || l.city || (l.location ? String(l.location).split(',')[0] : ''),
          price: rent ? money(rent) + '/mo' : '',
          q: l.id ? 'room=' + encodeURIComponent(l.id) : ''
        };
      }
    }
  ];

  /* ═══ STYLE ══════════════════════════════════════════════════════ */
  var CSS = ''
    + '.cat-sec{margin:0 0 28px;}'
    + '.cat-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px;}'
    + '.cat-link{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;cursor:pointer;'
    + 'font:700 12.5px/1 var(--font-body,system-ui);color:#4361FF;text-decoration:none;'
    + 'background:none;border:none;padding:0;transition:gap .2s;}'
    + '.cat-link:hover{gap:9px;}'

    /* Product card.
       No `width` here, deliberately. The rail owns slide width via
       `[data-rail-track] > *`, and both selectors weigh the same, so
       whichever stylesheet is injected last would win. This file loads
       after apa-rail.js, so a width here silently stretched every card
       to the full rail and turned a six-across shelf into a one-card
       slideshow with eleven dots under it. The rail decides. */
    + '.pc{display:block;padding:0;cursor:pointer;text-align:left;'
    + 'font-family:inherit;border-radius:16px;overflow:hidden;'
    + 'background:rgba(255,255,255,.7);border:1px solid var(--line,rgba(10,10,20,.08));'
    + 'transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,border-color .25s;}'
    + '.pc:hover{transform:translateY(-5px);box-shadow:0 14px 34px rgba(10,10,20,.13);'
    + 'border-color:rgba(67,97,255,.3);background:#fff;}'
    + '.pc:focus-visible{outline:2px solid #4361FF;outline-offset:2px;}'
    + '.pc-img{position:relative;display:flex;height:132px;overflow:hidden;'
    + 'align-items:center;justify-content:center;'
    + 'background:linear-gradient(135deg,rgba(67,97,255,.22),rgba(123,47,247,.22));}'
    + '.pc-img img{width:100%;height:100%;object-fit:cover;display:block;'
    + 'transition:transform .6s cubic-bezier(.22,1,.36,1);}'
    + '.pc:hover .pc-img img{transform:scale(1.07);}'
    + '.pc-ph{font-size:30px;opacity:.55;}'
    + '.pc-b{display:block;padding:11px 13px 13px;}'
    + '.pc-t{display:-webkit-box;font-weight:700;font-size:13.5px;line-height:1.3;'
    + 'color:var(--ink,#0A0A14);-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}'
    + '.pc-s{display:block;font-size:11.5px;color:var(--ink-faint,#8a8a99);margin-top:3px;'
    + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '.pc-p{display:block;font-weight:700;font-size:13px;color:#4361FF;margin-top:7px;}'
    + '.pc-p:empty{display:none;}';

  function injectCSS() {
    if (doc.getElementById('apa-cat-css')) return;
    var s = doc.createElement('style');
    s.id = 'apa-cat-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  var PH = { events: '🎫', tours: '🦁', food: '🍲', shopping: '🛍️', carhire: '🚗', roommates: '🏡' };

  /* ═══ CARD ═══════════════════════════════════════════════════════
     Destination lives in data attributes, not an inline onclick. A
     listing title is user-supplied text: quoting it into an attribute
     that a browser then evaluates as JavaScript is one apostrophe away
     from a broken card and one bracket away from something worse. The
     delegated handler below reads the attributes as plain data. */
  function cardHTML(cat, p) {
    var img = p.img
      ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">'
      : '<span class="pc-ph">' + (PH[cat.key] || '·') + '</span>';
    return '<button type="button" class="pc"'
      + ' data-svc="' + esc(cat.dest) + '"'
      + (p.to ? ' data-to="' + esc(p.to) + '"' : '')
      + (p.q ? ' data-q="' + esc(p.q) + '"' : '')
      + ' aria-label="' + esc(p.title) + (p.price ? ' — ' + esc(p.price) : '') + '">'
      + '<span class="pc-img">' + img + '</span>'
      + '<span class="pc-b">'
      + '<span class="pc-t">' + esc(p.title) + '</span>'
      + '<span class="pc-s">' + esc(p.sub) + '</span>'
      + '<span class="pc-p">' + esc(p.price) + '</span>'
      + '</span></button>';
  }

  function sectionHTML(cat, items) {
    return '<section class="cat-sec" data-cat="' + cat.key + '">'
      + '<div class="cat-head">'
      + '<h2 class="section-title">' + esc(cat.title) + '</h2>'
      + '<button type="button" class="cat-link" data-svc="' + esc(cat.dest) + '">'
      + 'View all <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
      + '</button></div>'
      + '<div data-rail data-autoplay="3200">'
      + '<div data-rail-track aria-label="' + esc(cat.title) + '">'
      + items.map(function (p) { return cardHTML(cat, p); }).join('')
      + '</div></div></section>';
  }

  /* One listener for every rail, bound once to the mount. Rails are
     replaced as their data lands, so per-card listeners would leak and
     per-section listeners would have to be rebound on every render. */
  function wire(mount) {
    if (mount.__apaCatWired) return;
    mount.__apaCatWired = 1;
    mount.addEventListener('click', function (ev) {
      safe(function () {
        var el = ev.target.closest('.pc, .cat-link');
        if (!el || !mount.contains(el)) return;
        var to = el.getAttribute('data-to');
        if (to) { global.location.href = to; return; }
        var svc = el.getAttribute('data-svc');
        if (!svc) return;
        var q = el.getAttribute('data-q') || '';
        /* navigateToService plays the service transition and is the one
           place that knows each page's URL. When the dashboard has not
           defined it (a rail embedded elsewhere), fall back to a plain
           navigation so a tap always lands somewhere. */
        if (typeof global.navigateToService === 'function') {
          global.navigateToService(svc, q);
        } else {
          global.location.href = svc + '.html?back=1' + (q ? '&' + q : '');
        }
      }, 'click');
    });
  }

  /* ═══ RENDER ═════════════════════════════════════════════════════ */
  function render(mountId) {
    var mount = doc.getElementById(mountId || 'cat-rails');
    if (!mount) return;
    injectCSS();
    wire(mount);

    /* Reserve one slot per category up front so rails always appear in
       a stable order, however the network reorders the responses. */
    mount.innerHTML = CATS.map(function (c) {
      return '<div data-slot="' + c.key + '"></div>';
    }).join('');

    CATS.forEach(function (cat) {
      safe(function () {
        cat.fetch().then(function (rows) {
          var slot = mount.querySelector('[data-slot="' + cat.key + '"]');
          if (!slot) return;

          var items = [];
          safe(function () {
            items = (rows || [])
              .map(cat.map)
              .filter(function (p) { return p && p.title; });
          }, cat.key + ':map');

          /* An empty category is removed, not padded with fake stock.
             Showing invented products would be worse than showing none.
             The removal is not permanent: the next dashboard load runs
             this fetch again, so the rail returns by itself the moment
             the service page has its first live listing. */
          if (!items.length) { slot.remove(); return; }

          slot.outerHTML = sectionHTML(cat, items);
          if (global.ApaRail) global.ApaRail.scan();
        }, function () {
          var slot = mount.querySelector('[data-slot="' + cat.key + '"]');
          if (slot) slot.remove();
        });
      }, cat.key);
    });
  }

  global.ApaCategories = { render: render, CATS: CATS };

})(window);
