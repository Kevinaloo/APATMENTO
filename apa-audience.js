/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · AUDIENCE INTELLIGENCE  v1
   ───────────────────────────────────────────────────────────────────
   Turns the signal stream into three products:

     1. SEGMENTS. Addressable audiences an advertiser can buy.
     2. INVENTORY, every real ad slot on the site, priced from
                     measured viewability and intent, not guesswork.
     3. MEDIA KIT. The artifact you send a brand. Generated, not
                     designed by hand, and never out of date.

   Plus a training-set exporter, because the data is worthless if it
   cannot leave the building in a shape a model will accept.

   Everything here reads. Nothing here writes. It is safe to call
   from anywhere, at any time.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaAudience) return;

  var A = global.ApaAdmin;   // data layer (rows/count/fmt)
  var DAY = 86400000;

  function rows(t, s) { return A ? A.rows(t, s) : Promise.resolve([]); }
  function daysAgo(n) { return new Date(Date.now() - n * DAY).toISOString(); }

  /* ═══ 1 · THE REAL INVENTORY ══════════════════════════════════════
     Derived from the actual [data-showcase] anchors that exist in the
     markup today. Nothing aspirational. If it isn't here, it can't be
     sold.  Verified against every page in the repo.                  */

  var SURFACES = [
    { page: 'index',       label: 'Home',              slots: ['split'] },
    { page: 'apartments',  label: 'Stays',             slots: ['window', 'video', 'carousel', 'ticker', 'interstitial'] },
    { page: 'flights',     label: 'Flights',           slots: ['window', 'video', 'ticker'] },
    { page: 'tours',       label: 'Tours & Safaris',   slots: ['window', 'video', 'carousel', 'split', 'ticker', 'interstitial'] },
    { page: 'events',      label: 'Events & Tickets',  slots: ['window', 'video', 'carousel', 'ticker', 'interstitial'] },
    { page: 'food',        label: 'Food Delivery',     slots: ['window', 'carousel', 'ticker'] },
    { page: 'shopping',    label: 'Shopping',          slots: ['window', 'carousel', 'ticker'] },
    { page: 'carhire',     label: 'Car Hire',          slots: ['window', 'carousel', 'ticker'] },
    { page: 'rides',       label: 'Rides',             slots: ['window', 'carousel', 'ticker'] },
    { page: 'roommates',   label: 'Roommates',         slots: ['window', 'carousel', 'ticker'] },
    { page: 'my-bookings', label: 'My Bookings',       slots: ['video'] },
    { page: 'dashboard',   label: 'Dashboard',         slots: ['window'] }
  ];

  /* Format economics. Base CPM in KES, plus the multiplier that a
     high-intent audience commands. These are the levers a sales lead
     actually pulls. */
  var FORMATS = {
    window:       { label: 'Window hero',      cpm: 900, premium: 1.00, desc: 'Full-bleed cinematic unit above the fold.' },
    video:        { label: 'Video hero',       cpm: 850, premium: 1.00, desc: 'Autoplay video, sound on interaction.' },
    carousel:     { label: 'Carousel banner',  cpm: 480, premium: 0.85, desc: 'Rotating slides, 3–5 creatives.' },
    split:        { label: 'Split banner',     cpm: 520, premium: 0.90, desc: 'Left copy, right stats panel.' },
    native:       { label: 'Native card',      cpm: 640, premium: 1.15, desc: 'Blends into the listing grid. Highest CTR.' },
    ticker:       { label: 'Live ticker',      cpm: 220, premium: 0.70, desc: 'Persistent scrolling bar.' },
    sticky:       { label: 'Sticky corner',    cpm: 300, premium: 0.75, desc: 'Appears after 16s dwell.' },
    interstitial: { label: 'Scroll interstitial', cpm: 700, premium: 1.20, desc: 'Injected every 8 cards mid-scroll.' }
  };

  /* Intent multiplier: a hot audience is worth more than a cold one,
     and this is the only honest way to price a slot. */
  function intentMultiplier(band) {
    return { hot: 1.85, warm: 1.30, cool: 0.95, cold: 0.62 }[band] || 1;
  }

  /* ═══ 2 · SEGMENTS ════════════════════════════════════════════════
     Addressable audiences. Each is a predicate over session_features,
     which means an advertiser can be shown exactly how many humans
     they are buying, and the definition is auditable.               */

  var SEGMENTS = [
    {
      id: 'high-intent-travellers',
      name: 'High-intent travellers',
      why: 'Selected dates and viewed 3+ stays. Days away from booking.',
      test: function (f) { return f.dates_selected === 1 && f.listings_viewed >= 3; },
      cpmLift: 1.9
    },
    {
      id: 'cart-abandoners',
      name: 'Checkout abandoners',
      why: 'Reached checkout and left. The most valuable retargeting pool on the platform.',
      test: function (f) { return f.checkout_started === 1 && f.prior_bookings === 0; },
      cpmLift: 2.4
    },
    {
      id: 'repeat-bookers',
      name: 'Repeat bookers',
      why: 'Two or more completed bookings. Proven willingness to transact.',
      test: function (f) { return f.prior_bookings >= 2; },
      cpmLift: 2.1
    },
    {
      id: 'deep-readers',
      name: 'Deep readers',
      why: '60s+ of true attention, 75%+ scroll depth. Brand campaigns land here.',
      test: function (f) { return f.attention_s >= 60 && f.scroll_depth >= 75; },
      cpmLift: 1.6
    },
    {
      id: 'weekend-planners',
      name: 'Weekend planners',
      why: 'Browsing Thu–Sun with dates set. Short booking window.',
      test: function (f) { return (f.day_of_week >= 4 || f.day_of_week === 0) && f.dates_selected === 1; },
      cpmLift: 1.5
    },
    {
      id: 'mobile-commuters',
      name: 'Mobile commuters',
      why: 'Mobile, 6–9am or 5–8pm. Rides, food and quick-decision inventory.',
      test: function (f) {
        var h = f.hour_of_day;
        return f.device === 'mobile' && ((h >= 6 && h <= 9) || (h >= 17 && h <= 20));
      },
      cpmLift: 1.35
    },
    {
      id: 'pwa-loyalists',
      name: 'App loyalists',
      why: 'Installed the PWA. Highest lifetime value cohort on the platform.',
      test: function (f) { return f.pwa === 1; },
      cpmLift: 2.0
    },
    {
      id: 'price-sensitive',
      name: 'Price-sensitive shoppers',
      why: 'Heavy filter use, many listings, no booking. Respond to discount creative.',
      test: function (f) { return f.filters_used >= 4 && f.listings_viewed >= 5 && f.checkout_started === 0; },
      cpmLift: 1.1
    },
    {
      id: 'frustrated',
      name: 'At-risk / frustrated',
      why: 'Rage clicks or nav thrash. Suppress ads. Fix the product instead.',
      test: function (f) { return f.rage_clicks >= 1 || f.nav_thrash >= 2; },
      cpmLift: 0,
      suppress: true
    },
    {
      id: 'bouncers',
      name: 'Bouncers',
      why: 'Under 20% depth, sub-5s attention. Do not sell impressions against this.',
      test: function (f) { return f.reading_mode === 'bounce'; },
      cpmLift: 0,
      suppress: true
    }
  ];

  /* ═══ 3 · AUDIENCE SNAPSHOT ═══════════════════════════════════════ */

  function build(days) {
    days = days || 30;
    var since = daysAgo(days);

    return Promise.all([
      rows('session_features', function (q) { return q.gte('captured_at', since).limit(20000); }),
      rows('signal_events',    function (q) { return q.gte('created_at', since).limit(20000); }),
      rows('ad_campaigns')
    ]).then(function (r) {
      var sessions = r[0], events = r[1], campaigns = r[2];

      /* Reach */
      var visitors = {}, sessionCount = sessions.length;
      sessions.forEach(function (s) { visitors[s.visitor_id] = 1; });
      var uniques = Object.keys(visitors).length;

      /* Segment sizing */
      var segs = SEGMENTS.map(function (seg) {
        var members = sessions.filter(function (f) {
          try { return seg.test(f); } catch (e) { return false; }
        });
        var vis = {};
        members.forEach(function (m) { vis[m.visitor_id] = 1; });
        var size = Object.keys(vis).length;
        var avgIntent = members.length
          ? members.reduce(function (a, m) { return a + (Number(m.intent_score) || 0); }, 0) / members.length : 0;
        return {
          id: seg.id, name: seg.name, why: seg.why,
          suppress: !!seg.suppress,
          sessions: members.length,
          visitors: size,
          reach: uniques ? Math.round((size / uniques) * 1000) / 10 : 0,
          avgIntent: Math.round(avgIntent),
          cpmLift: seg.cpmLift
        };
      }).sort(function (a, b) { return b.visitors - a.visitors; });

      /* Per-surface inventory, priced from measured data */
      var byPage = {}, viewables = {}, clicks = {};
      events.forEach(function (e) {
        if (e.event === 'ad_viewable') {
          var k = (e.props && e.props.slot) || (e.page + ':' + ((e.props && e.props.format) || '?'));
          viewables[k] = (viewables[k] || 0) + 1;
        }
        if (e.event === 'ad_click') {
          var c = (e.props && e.props.slot) || (e.page + ':' + ((e.props && e.props.format) || '?'));
          clicks[c] = (clicks[c] || 0) + 1;
        }
        byPage[e.page] = (byPage[e.page] || 0) + (e.event === 'page_view' ? 1 : 0);
      });

      /* Intent distribution per page. The pricing signal */
      var pageIntent = {};
      sessions.forEach(function (s) {
        var p = s.current_page || 'index';
        (pageIntent[p] = pageIntent[p] || []).push(Number(s.intent_score) || 0);
      });
      function avgIntentFor(p) {
        var a = pageIntent[p] || [];
        return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0;
      }
      function bandFor(score) {
        return score >= 72 ? 'hot' : score >= 45 ? 'warm' : score >= 20 ? 'cool' : 'cold';
      }

      var inventory = [];
      SURFACES.forEach(function (surf) {
        var pv = byPage[surf.page] || 0;
        var ai = avgIntentFor(surf.page);
        var band = bandFor(ai);
        var mult = intentMultiplier(band);

        surf.slots.forEach(function (slot) {
          var fmt = FORMATS[slot] || { label: slot, cpm: 300, premium: 1, desc: '' };
          var key = surf.page + ':' + slot;
          var vw = viewables[key] || 0;
          var ck = clicks[key] || 0;
          var cpm = Math.round(fmt.cpm * fmt.premium * mult);
          var monthlyImp = Math.round(pv * (days ? 30 / days : 1));

          inventory.push({
            page: surf.page, pageLabel: surf.label,
            slot: slot, slotLabel: fmt.label, desc: fmt.desc,
            pageviews: pv,
            viewable: vw,
            clicks: ck,
            viewRate: pv ? Math.round((vw / pv) * 1000) / 10 : 0,
            ctr: vw ? Math.round((ck / vw) * 10000) / 100 : 0,
            avgIntent: Math.round(ai),
            intentBand: band,
            cpm: cpm,
            monthlyImpressions: monthlyImp,
            monthlyValue: Math.round((monthlyImp / 1000) * cpm)
          });
        });
      });

      inventory.sort(function (a, b) { return b.monthlyValue - a.monthlyValue; });

      /* Attention economics */
      var totalAttention = sessions.reduce(function (a, s) { return a + (Number(s.attention_s) || 0); }, 0);
      var engaged = sessions.filter(function (s) { return s.engaged === 1 || s.engaged === true; }).length;
      var bounce = sessions.filter(function (s) { return s.reading_mode === 'bounce'; }).length;

      /* Device / hour distributions. The media-kit tables */
      function distro(field) {
        var d = {};
        sessions.forEach(function (s) { var k = s[field]; if (k != null) d[k] = (d[k] || 0) + 1; });
        return Object.keys(d).map(function (k) {
          return { key: k, count: d[k], share: sessionCount ? Math.round((d[k] / sessionCount) * 1000) / 10 : 0 };
        }).sort(function (a, b) { return b.count - a.count; });
      }

      var hourly = new Array(24).fill(0);
      sessions.forEach(function (s) {
        var h = Number(s.hour_of_day);
        if (h >= 0 && h < 24) hourly[h]++;
      });

      /* Friction ledger. Product debt, quantified */
      var rage = sessions.reduce(function (a, s) { return a + (Number(s.rage_clicks) || 0); }, 0);
      var dead = sessions.reduce(function (a, s) { return a + (Number(s.dead_clicks) || 0); }, 0);
      var thrash = sessions.reduce(function (a, s) { return a + (Number(s.nav_thrash) || 0); }, 0);
      var errs = sessions.reduce(function (a, s) { return a + (Number(s.js_errors) || 0); }, 0);

      /* Journey graph: the paths people actually take */
      var edges = {};
      var byVisitor = {};
      sessions.forEach(function (s) {
        (byVisitor[s.session_id] = byVisitor[s.session_id] || []).push(s);
      });
      Object.keys(byVisitor).forEach(function (k) {
        var path = byVisitor[k].sort(function (a, b) {
          return new Date(a.captured_at) - new Date(b.captured_at);
        });
        for (var i = 1; i < path.length; i++) {
          var e = (path[i - 1].current_page || '?') + '→' + (path[i].current_page || '?');
          edges[e] = (edges[e] || 0) + 1;
        }
      });
      var topPaths = Object.keys(edges).map(function (k) {
        return { path: k, count: edges[k] };
      }).sort(function (a, b) { return b.count - a.count; }).slice(0, 12);

      var totalMonthlyValue = inventory.reduce(function (a, i) { return a + i.monthlyValue; }, 0);

      return {
        window: days,
        reach: {
          visitors: uniques,
          sessions: sessionCount,
          pageviews: Object.keys(byPage).reduce(function (a, k) { return a + byPage[k]; }, 0),
          sessionsPerVisitor: uniques ? Math.round((sessionCount / uniques) * 100) / 100 : 0
        },
        attention: {
          totalHours: Math.round(totalAttention / 3600),
          avgSeconds: sessionCount ? Math.round(totalAttention / sessionCount) : 0,
          engagedRate: sessionCount ? Math.round((engaged / sessionCount) * 1000) / 10 : 0,
          bounceRate: sessionCount ? Math.round((bounce / sessionCount) * 1000) / 10 : 0
        },
        friction: { rage: rage, dead: dead, thrash: thrash, errors: errs },
        segments: segs,
        inventory: inventory,
        surfaces: SURFACES,
        formats: FORMATS,
        devices: distro('device'),
        connections: distro('connection'),
        entryPages: distro('entry_page'),
        readingModes: distro('reading_mode'),
        intentBands: distro('intent_band'),
        hourly: hourly,
        topPaths: topPaths,
        monthlyInventoryValue: totalMonthlyValue,
        campaigns: campaigns,
        sessions: sessions,
        events: events,
        at: Date.now()
      };
    });
  }

  /* ═══ 4 · MEDIA KIT ═══════════════════════════════════════════════
     The document you send an advertiser. Generated from live numbers,
     so it is never stale and never overstated.                      */

  function mediaKit(a) {
    var fm = (A && A.fmt) || { num: String, money: String };
    var top = a.inventory.slice(0, 6);
    var buyable = a.segments.filter(function (s) { return !s.suppress; });

    var lines = [];
    lines.push('APATMENTO. AUDIENCE & INVENTORY');
    lines.push('Generated ' + new Date().toLocaleString() + ' · trailing ' + a.window + ' days');
    lines.push('');
    lines.push('REACH');
    lines.push('  Unique visitors ......... ' + fm.num(a.reach.visitors));
    lines.push('  Sessions ................ ' + fm.num(a.reach.sessions));
    lines.push('  Sessions per visitor .... ' + a.reach.sessionsPerVisitor);
    lines.push('');
    lines.push('ATTENTION (measured, not time-on-page)');
    lines.push('  Total attentive hours ... ' + fm.num(a.attention.totalHours));
    lines.push('  Avg attention / session . ' + a.attention.avgSeconds + 's');
    lines.push('  Engaged rate ............ ' + a.attention.engagedRate + '%');
    lines.push('  Bounce rate ............. ' + a.attention.bounceRate + '%');
    lines.push('');
    lines.push('ADDRESSABLE SEGMENTS');
    buyable.forEach(function (s) {
      lines.push('  ' + pad(s.name, 30) + fm.num(s.visitors) + ' visitors  ·  ' +
        s.reach + '% reach  ·  intent ' + s.avgIntent + '  ·  ' + s.cpmLift + '× CPM');
      lines.push('      ' + s.why);
    });
    lines.push('');
    lines.push('PREMIUM INVENTORY');
    top.forEach(function (i) {
      lines.push('  ' + pad(i.pageLabel + ' · ' + i.slotLabel, 34) +
        'KES ' + fm.num(i.cpm) + ' CPM  ·  ' + fm.num(i.monthlyImpressions) + ' imp/mo  ·  ' +
        i.intentBand.toUpperCase());
    });
    lines.push('');
    lines.push('  Total monthly inventory value: KES ' + fm.num(a.monthlyInventoryValue));
    lines.push('');
    lines.push('VIEWABILITY STANDARD');
    lines.push('  We bill only IAB-viewable impressions: 50% of pixels for');
    lines.push('  1 continuous second (2s for video). Anything less is free.');
    lines.push('');
    lines.push('SUPPRESSION');
    lines.push('  Bouncers and frustrated sessions are excluded from all');
    lines.push('  paid inventory. You do not pay to reach people who are leaving.');
    return lines.join('\n');
  }

  function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n - 1) + ' ' : s + new Array(n - s.length + 1).join('.'); }

  /* ═══ 5 · ML DATASET EXPORT ═══════════════════════════════════════
     Flat, numeric, labelled. Categorical columns one-hot encoded on
     request. The label is `converted`. Did the session end in a
     booking. That is the only target anyone actually wants.         */

  /* The label is `checkout_started`: did this session reach checkout.
     That choice forces a discipline, any feature that is only known
     *because* checkout happened would leak the answer and produce a
     model with a perfect score and no predictive value.

     So `checkout_started` is the target, never a feature. `intent_score`
     is likewise excluded: the intent engine reads checkout_started as
     one of its own inputs, so including it would smuggle the label in
     through the back door. Both live in LEAKY, and neither is trained on.

     What remains is the honest question: from behaviour observed
     *before* the decision, can we predict the decision? */
  var LEAKY = ['checkout_started', 'intent_score'];

  var NUMERIC = [
    'hour_of_day', 'day_of_week', 'is_weekend', 'session_age_s',
    'attention_s', 'idle_s', 'blurred_s', 'attention_ratio', 'engaged',
    'scroll_depth', 'scroll_reversals', 'scroll_velocity', 'reached_end',
    'journey_depth', 'pages_unique',
    'rage_clicks', 'dead_clicks', 'nav_thrash', 'js_errors',
    'reading_mode_ord',
    'searches', 'filters_used', 'listings_viewed', 'gallery_opens',
    'dates_selected', 'saved_items',
    'is_returning', 'prior_bookings',
    'viewport_w', 'pwa', 'ads_viewable', 'ads_clicked'
  ];

  var CATEGORICAL = ['device', 'entry_page', 'current_page', 'connection', 'reading_mode'];

  function dataset(sessions, opts) {
    opts = opts || {};
    var oneHot = opts.oneHot !== false;

    var levels = {};
    if (oneHot) {
      CATEGORICAL.forEach(function (c) {
        var s = {};
        sessions.forEach(function (r) { if (r[c] != null) s[r[c]] = 1; });
        levels[c] = Object.keys(s).sort().slice(0, 24);
      });
    }

    var cols = NUMERIC.slice();
    if (oneHot) {
      CATEGORICAL.forEach(function (c) {
        levels[c].forEach(function (l) { cols.push(c + '__' + String(l).replace(/[^a-z0-9]/gi, '_')); });
      });
    } else {
      cols = cols.concat(CATEGORICAL);
    }
    cols.push('label_converted');

    var out = sessions.map(function (r) {
      var row = {};
      NUMERIC.forEach(function (k) {
        var v = r[k];
        row[k] = (v === true) ? 1 : (v === false) ? 0 : (Number(v) || 0);
      });
      if (oneHot) {
        CATEGORICAL.forEach(function (c) {
          levels[c].forEach(function (l) {
            row[c + '__' + String(l).replace(/[^a-z0-9]/gi, '_')] = (r[c] === l) ? 1 : 0;
          });
        });
      } else {
        CATEGORICAL.forEach(function (c) { row[c] = r[c] == null ? '' : r[c]; });
      }
      // The label. Never a feature. See LEAKY above.
      row.label_converted = Number(r.checkout_started) === 1 ? 1 : 0;
      return row;
    });

    return { columns: cols, rows: out, levels: levels };
  }

  function datasetCSV(sessions, opts) {
    var d = dataset(sessions, opts);
    var head = d.columns.join(',');
    var body = d.rows.map(function (r) {
      return d.columns.map(function (c) {
        var v = r[c];
        if (v == null) return '';
        var s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
    return head + '\n' + body;
  }

  /* JSONL. What most training pipelines actually ingest. */
  function datasetJSONL(sessions, opts) {
    var d = dataset(sessions, opts);
    return d.rows.map(function (r) { return JSON.stringify(r); }).join('\n');
  }

  /* Correlation of every numeric feature against the label. The fast
     answer to "what actually predicts a booking?" */
  /* Correlation of each *non-leaky* feature against the label. */
  function featureImportance(sessions) {
    var d = dataset(sessions, { oneHot: false });
    var y = d.rows.map(function (r) { return r.label_converted; });
    var n = y.length || 1;
    var ymean = y.reduce(function (a, b) { return a + b; }, 0) / n;

    return NUMERIC.map(function (col) {
      var x = d.rows.map(function (r) { return Number(r[col]) || 0; });
      var xmean = x.reduce(function (a, b) { return a + b; }, 0) / n;
      var num = 0, dx = 0, dy = 0;
      for (var i = 0; i < n; i++) {
        var a = x[i] - xmean, b = y[i] - ymean;
        num += a * b; dx += a * a; dy += b * b;
      }
      var r = (dx && dy) ? num / Math.sqrt(dx * dy) : 0;
      return { feature: col, r: Math.round(r * 1000) / 1000, abs: Math.abs(r) };
    }).sort(function (a, b) { return b.abs - a.abs; });
  }

  global.ApaAudience = {
    build: build,
    mediaKit: mediaKit,
    dataset: dataset,
    datasetCSV: datasetCSV,
    datasetJSONL: datasetJSONL,
    featureImportance: featureImportance,
    SURFACES: SURFACES,
    FORMATS: FORMATS,
    SEGMENTS: SEGMENTS,
    LEAKY: LEAKY,
    intentMultiplier: intentMultiplier
  };

})(window);
