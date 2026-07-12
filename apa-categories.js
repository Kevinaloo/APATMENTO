/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · CATEGORY RAILS  v1
   ───────────────────────────────────────────────────────────────────
   Renders one horizontal product carousel per service category, stacked
   vertically beneath "Book a stay". Each rail shows real products from
   the same Supabase tables the dedicated service pages use, so what a
   person sees on the dashboard is what they'll find when they tap in.

   Only categories with a genuine catalogue are included. Flights and
   rides are deliberately excluded — they are search/booking flows with
   nothing meaningful to browse as thumbnails.

   Design rules:
     · Every fetch is independent. One slow or empty table must never
       stop the others rendering.
     · A rail with no products removes itself rather than showing an
       empty shell or fake placeholders.
     · Rails render progressively, in the order the data lands.
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

  function get(path) {
    return fetch(SUPA + '/rest/v1/' + path, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    }).then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  /* ═══ CATEGORIES ═════════════════════════════════════════════════
     Each declares where its products live, how to normalise a row into
     { img, title, sub, price }, and where "View all" leads.          */
  var CATS = [
    {
      key: 'events',
      title: 'Events near you',
      dest: 'events',
      fetch: function () {
        return get('scraped_events?active=eq.true&start_date=gte.' +
          new Date().toISOString() + '&order=start_date.asc&limit=12');
      },
      map: function (e) {
        var d = e.start_date
          ? new Date(e.start_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
          : '';
        return {
          img: e.image_url,
          title: e.title,
          sub: [d, e.venue || e.city].filter(Boolean).join(' · '),
          price: money(e.price_from, e.currency)
        };
      }
    },
    {
      key: 'tours',
      title: 'Tours & safaris',
      dest: 'tours',
      fetch: function () {
        return get('scraped_tours?active=eq.true&order=rating.desc.nullslast&limit=12');
      },
      map: function (t) {
        return {
          img: t.image_url,
          title: t.title,
          sub: [t.location, t.duration].filter(Boolean).join(' · '),
          price: money(t.price_from, t.currency)
        };
      }
    },
    {
      key: 'food',
      title: 'Food & restaurants',
      dest: 'food',
      fetch: function () {
        return get('scraped_restaurants?active=eq.true&order=rating.desc.nullslast&limit=12');
      },
      map: function (r) {
        var mins = r.delivery_mins ? r.delivery_mins + ' min' : '';
        return {
          img: r.image_url,
          title: r.name,
          sub: [r.cuisine, r.area].filter(Boolean).join(' · '),
          price: mins
        };
      }
    },
    {
      key: 'shopping',
      title: 'Shopping',
      dest: 'shopping',
      fetch: function () {
        return get('scraped_shopping?active=eq.true&in_stock=eq.true&order=hot.desc&limit=12');
      },
      map: function (p) {
        return {
          img: p.image_url,
          title: p.name,
          sub: [p.category, p.seller].filter(Boolean).join(' · '),
          price: money(p.price)
        };
      }
    },
    {
      key: 'carhire',
      title: 'Car hire',
      dest: 'carhire',
      fetch: function () {
        return get('scraped_carhire?active=eq.true&order=price_self.asc&limit=12');
      },
      map: function (c) {
        var seats = c.seats ? c.seats + ' seats' : '';
        return {
          img: c.image_url,
          title: c.name,
          sub: [c.vehicle_type, seats].filter(Boolean).join(' · '),
          price: c.price_self ? money(c.price_self) + '/day' : ''
        };
      }
    },
    {
      key: 'roommates',
      title: 'Rooms & flatmates',
      dest: 'roommates',
      fetch: function () {
        return get('listings?status=eq.active&is_active=eq.true&type=eq.share' +
          '&select=id,title,area,city,location,price_night,photos&limit=12');
      },
      map: function (l) {
        return {
          img: (l.photos && l.photos[0]) || null,
          title: l.title,
          sub: l.area || l.city || (l.location ? String(l.location).split(',')[0] : ''),
          price: l.price_night ? money(l.price_night) + '/mo' : ''
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

    /* product card */
    + '.pc{display:block;width:100%;padding:0;cursor:pointer;text-align:left;'
    + 'font-family:inherit;border-radius:16px;overflow:hidden;'
    + 'background:rgba(255,255,255,.7);border:1px solid var(--line,rgba(10,10,20,.08));'
    + 'transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,border-color .25s;}'
    + '.pc:hover{transform:translateY(-5px);box-shadow:0 14px 34px rgba(10,10,20,.13);'
    + 'border-color:rgba(67,97,255,.3);background:#fff;}'
    + '.pc:focus-visible{outline:2px solid #4361FF;outline-offset:2px;}'
    + '.pc-img{position:relative;height:132px;overflow:hidden;display:flex;'
    + 'align-items:center;justify-content:center;'
    + 'background:linear-gradient(135deg,rgba(67,97,255,.22),rgba(123,47,247,.22));}'
    + '.pc-img img{width:100%;height:100%;object-fit:cover;display:block;'
    + 'transition:transform .6s cubic-bezier(.22,1,.36,1);}'
    + '.pc:hover .pc-img img{transform:scale(1.07);}'
    + '.pc-ph{font-size:30px;opacity:.55;}'
    + '.pc-b{padding:11px 13px 13px;}'
    + '.pc-t{font-weight:700;font-size:13.5px;line-height:1.3;color:var(--ink,#0A0A14);'
    + 'display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;}'
    + '.pc-s{font-size:11.5px;color:var(--ink-faint,#8a8a99);margin-top:3px;'
    + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '.pc-p{font-weight:700;font-size:13px;color:#4361FF;margin-top:7px;}'
    + '.pc-p:empty{display:none;}';

  function injectCSS() {
    if (doc.getElementById('apa-cat-css')) return;
    var s = doc.createElement('style');
    s.id = 'apa-cat-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  var PH = { events: '🎫', tours: '🦁', food: '🍽️', shopping: '🛍️', carhire: '🚗', roommates: '🏡' };

  function cardHTML(cat, p) {
    var img = p.img
      ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">'
      : '<span class="pc-ph">' + (PH[cat.key] || cat.name.charAt(0)) + '</span>';
    return '<button type="button" class="pc" onclick="navigateToService(\'' + cat.dest + '\')">'
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
      + '<button type="button" class="cat-link" onclick="navigateToService(\'' + cat.dest + '\')">'
      + 'View all <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
      + '</button></div>'
      + '<div data-rail data-autoplay="3200">'
      + '<div data-rail-track aria-label="' + esc(cat.title) + '">'
      + items.map(function (p) { return cardHTML(cat, p); }).join('')
      + '</div></div></section>';
  }

  /* ═══ RENDER ═════════════════════════════════════════════════════ */
  function render(mountId) {
    var mount = doc.getElementById(mountId || 'cat-rails');
    if (!mount) return;
    injectCSS();

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
             Showing invented products would be worse than showing none. */
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
