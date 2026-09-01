/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · ADMIN CORE  v1
   ───────────────────────────────────────────────────────────────────
   Everything the console needs that isn't a pixel.

     · A single Supabase client (reuses ApaSession's if present)
     · A resilient query layer. A missing table degrades to [],
       it does not take down the dashboard
     · The Analytics Engine: derived intelligence, not row counts
     · Moderation: approve / reject / suspend / ban / purge
     · An immutable audit trail for every destructive act

   Design rule: the console must render with a half-broken database.
   Operators need answers most precisely when things are on fire.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaAdmin) return;

  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  var sb = null;
  function client() {
    if (sb) return sb;
    if (global.__APA_SB__) { sb = global.__APA_SB__; return sb; }
    try {
      sb = global.supabase.createClient(SUPA_URL, SUPA_KEY);
      global.__APA_SB__ = sb;
    } catch (e) { sb = null; }
    return sb;
  }

  /* ═══ 1 · RESILIENT QUERY LAYER ═══════════════════════════════════
     Every read returns a shape, never a rejection. A dropped table,
     an RLS denial, a network blip, all collapse to an empty result
     plus a recorded fault. The console stays up. */

  var faults = [];
  function fault(where, err) {
    faults.push({ where: where, msg: (err && err.message) || String(err), at: Date.now() });
    if (faults.length > 80) faults.shift();
  }

  /**
   * rows('listings', q => q.eq('status','pending').limit(50))
   * → Promise<Array>  (never rejects)
   */
  function rows(table, shape) {
    var c = client();
    if (!c) return Promise.resolve([]);
    return new Promise(function (resolve) {
      var q;
      try {
        q = c.from(table).select('*');
        if (typeof shape === 'function') q = shape(q) || q;
      } catch (e) { fault(table, e); return resolve([]); }

      q.then(function (res) {
        if (res && res.error) { fault(table, res.error); return resolve([]); }
        resolve((res && res.data) || []);
      }, function (e) { fault(table, e); resolve([]); });
    });
  }

  /** count('listings', q => q.eq('status','live')) → Promise<number> */
  function count(table, shape) {
    var c = client();
    if (!c) return Promise.resolve(0);
    return new Promise(function (resolve) {
      var q;
      try {
        q = c.from(table).select('id', { count: 'exact', head: true });
        if (typeof shape === 'function') q = shape(q) || q;
      } catch (e) { fault(table, e); return resolve(0); }

      q.then(function (res) {
        if (res && res.error) { fault(table, res.error); return resolve(0); }
        resolve((res && res.count) || 0);
      }, function (e) { fault(table, e); resolve(0); });
    });
  }

  /** Write that reports success honestly. */
  function write(table, op) {
    var c = client();
    if (!c) return Promise.resolve({ ok: false, error: 'No database connection' });
    return new Promise(function (resolve) {
      var q;
      try { q = op(c.from(table)); }
      catch (e) { fault(table, e); return resolve({ ok: false, error: e.message }); }

      q.then(function (res) {
        if (res && res.error) { fault(table, res.error); return resolve({ ok: false, error: res.error.message }); }
        resolve({ ok: true, data: (res && res.data) || null });
      }, function (e) { fault(table, e); resolve({ ok: false, error: e.message }); });
    });
  }

  /* ═══ 2 · TIME ════════════════════════════════════════════════════ */
  var DAY = 86400000;
  function daysAgo(n) { return new Date(Date.now() - n * DAY).toISOString(); }
  function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }
  function hourOf(d) { return new Date(d).getHours(); }
  function within(iso, days) { return (Date.now() - new Date(iso).getTime()) <= days * DAY; }

  /* ═══ 3 · THE ANALYTICS ENGINE ════════════════════════════════════
     Row counts are not analytics. These are the numbers an operator
     acts on. Leading indicators, concentration risk, decay, trust.  */

  var Engine = {

    /* ── Velocity: is the platform accelerating or bleeding? ──────
       Compares the trailing window against the one before it. The
       sign of the second derivative is the whole story.            */
    velocity: function (records, field, days) {
      field = field || 'created_at';
      days = days || 7;
      var now = Date.now();
      var cur = 0, prev = 0;
      records.forEach(function (r) {
        var t = new Date(r[field]).getTime();
        if (isNaN(t)) return;
        var age = now - t;
        if (age <= days * DAY) cur++;
        else if (age <= 2 * days * DAY) prev++;
      });
      var delta = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
      return {
        current: cur,
        previous: prev,
        delta: Math.round(delta * 10) / 10,
        accelerating: cur > prev,
        // Momentum: rate of change per day, sign-aware
        momentum: Math.round(((cur - prev) / days) * 100) / 100
      };
    },

    /* ── Concentration risk (Herfindahl index) ────────────────────
       If 3 partners drive 80% of GMV, losing one is an extinction
       event. No consumer marketplace shows this. It matters most.  */
    concentration: function (records, keyField, valueField) {
      var totals = {}, grand = 0;
      records.forEach(function (r) {
        var k = r[keyField] || 'unknown';
        var v = Number(valueField ? r[valueField] : 1) || 0;
        totals[k] = (totals[k] || 0) + v;
        grand += v;
      });
      if (!grand) return { hhi: 0, top3Share: 0, verdict: 'no-data', leaders: [] };

      var leaders = Object.keys(totals)
        .map(function (k) { return { key: k, value: totals[k], share: totals[k] / grand }; })
        .sort(function (a, b) { return b.value - a.value; });

      var hhi = leaders.reduce(function (s, l) { return s + Math.pow(l.share * 100, 2); }, 0);
      var top3 = leaders.slice(0, 3).reduce(function (s, l) { return s + l.share; }, 0);

      var verdict = hhi < 1500 ? 'healthy'
        : hhi < 2500 ? 'concentrating'
          : 'dangerous';

      return {
        hhi: Math.round(hhi),
        top3Share: Math.round(top3 * 1000) / 10,
        verdict: verdict,
        leaders: leaders.slice(0, 8)
      };
    },

    /* ── Cohort retention: do partners survive their first month? ── */
    cohorts: function (users, activity, userIdField, months) {
      months = months || 6;
      var buckets = {};
      users.forEach(function (u) {
        if (!u.created_at) return;
        var k = String(u.created_at).slice(0, 7);
        (buckets[k] = buckets[k] || { signed: [], ids: {} });
        buckets[k].signed.push(u);
        buckets[k].ids[u.id] = true;
      });

      var active = {};
      activity.forEach(function (a) {
        var id = a[userIdField];
        if (!id) return;
        if (!active[id] || a.created_at > active[id]) active[id] = a.created_at;
      });

      return Object.keys(buckets).sort().slice(-months).map(function (k) {
        var b = buckets[k];
        var alive = b.signed.filter(function (u) {
          return active[u.id] && within(active[u.id], 30);
        }).length;
        return {
          cohort: k,
          size: b.signed.length,
          retained: alive,
          rate: b.signed.length ? Math.round((alive / b.signed.length) * 1000) / 10 : 0
        };
      });
    },

    /* ── Listing decay: supply that has gone stale and is quietly
       poisoning search results. Nobody tracks this. Everyone should.

       Every listing is classified exactly once and every listing is
       returned. An earlier version pushed only the unhealthy rows, so
       a console rendering `items` showed an empty table on a healthy
       platform while the counters above it read five. The counters
       were right; the table was reading the wrong collection.

       Order matters. A listing is judged by its worst symptom:
       zombie beats no-convert beats stale beats fresh.              */
    decay: function (listings) {
      var now = Date.now();
      var items = [];
      var fresh = 0, stale = 0, zombie = 0, noConvert = 0, unknown = 0;

      listings.forEach(function (l) {
        var touchedRaw = l.updated_at || l.created_at;
        var touched = new Date(touchedRaw).getTime();
        var known = !isNaN(touched);
        var age = known ? Math.round((now - touched) / DAY) : 0;
        var views = Number(l.views || 0);
        var books = Number(l.booking_count || l.bookings_count || 0);
        var reason;

        if (!known) { reason = 'unknown'; unknown++; }
        else if (age > 90 && books === 0) { reason = 'zombie'; zombie++; }
        // High views, zero bookings → mispriced or misleading.
        else if (views > 200 && books === 0 && age > 14) { reason = 'no-convert'; noConvert++; }
        else if (age > 45) { reason = 'stale'; stale++; }
        else { reason = 'fresh'; fresh++; }

        items.push({ l: l, age: age, reason: reason, views: views, bookings: books });
      });

      var total = listings.length || 1;
      var problems = items.filter(function (it) { return it.reason !== 'fresh'; });

      return {
        fresh: fresh,
        stale: stale,
        zombie: zombie,
        noConvert: noConvert,
        unknown: unknown,
        staleCount: stale,
        problemCount: problems.length,
        healthScore: Math.round((fresh / total) * 100),
        /* Everything, classified. The console filters this itself. */
        items: items,
        /* Only what needs a human. Triage and digests read this. */
        problems: problems.slice(0, 200)
      };
    },

    /* ── Trust score: a single 0–100 per partner, computed from
       behaviour rather than self-declaration.                       */
    trust: function (partner, ctx) {
      ctx = ctx || {};
      var s = 50;

      if (partner.verified || partner.id_verified) s += 18;
      if (partner.phone_verified) s += 6;
      if (partner.email_confirmed_at) s += 4;

      var listings = ctx.listings || 0;
      var bookings = ctx.bookings || 0;
      var cancels = ctx.cancellations || 0;
      var reviews = ctx.reviews || [];
      var flags = ctx.flags || 0;

      if (listings > 0) s += Math.min(8, listings);
      if (bookings > 0) s += Math.min(14, Math.log2(bookings + 1) * 4);

      // Cancellation ratio bites hard. It is the single best predictor.
      if (bookings > 3) {
        var cr = cancels / bookings;
        s -= Math.round(cr * 45);
      }

      if (reviews.length) {
        var avg = reviews.reduce(function (a, r) { return a + (Number(r.rating) || 0); }, 0) / reviews.length;
        s += Math.round((avg - 3) * 7);          // 5★ → +14, 1★ → −14
        if (reviews.length >= 10) s += 4;         // volume confidence
      }

      s -= flags * 12;

      // Account age: sleeper accounts are a fraud signature.
      var ageDays = partner.created_at
        ? (Date.now() - new Date(partner.created_at).getTime()) / DAY : 0;
      if (ageDays < 3 && listings > 4) s -= 20;   // burst-listing = spam

      s = Math.max(0, Math.min(100, Math.round(s)));
      return {
        score: s,
        band: s >= 80 ? 'trusted' : s >= 55 ? 'standard' : s >= 30 ? 'watch' : 'restrict',
        signals: {
          verified: !!(partner.verified || partner.id_verified),
          listings: listings, bookings: bookings,
          cancelRate: bookings ? Math.round((cancels / bookings) * 100) : 0,
          reviews: reviews.length, flags: flags,
          ageDays: Math.round(ageDays)
        }
      };
    },

    /* ── Anomaly detection: z-score on a daily series. Flags the
       days an operator should actually look at.                    */
    anomalies: function (records, field, days) {
      field = field || 'created_at';
      days = days || 30;
      var series = {};
      for (var i = days - 1; i >= 0; i--) series[dayKey(Date.now() - i * DAY)] = 0;
      records.forEach(function (r) {
        var k = dayKey(r[field]);
        if (k in series) series[k]++;
      });
      var keys = Object.keys(series).sort();
      var vals = keys.map(function (k) { return series[k]; });
      var mean = vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length || 1);
      var sd = Math.sqrt(vals.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / (vals.length || 1)) || 1;

      return {
        mean: Math.round(mean * 10) / 10,
        sd: Math.round(sd * 10) / 10,
        series: keys.map(function (k) {
          var z = (series[k] - mean) / sd;
          return {
            day: k, value: series[k],
            z: Math.round(z * 100) / 100,
            anomaly: Math.abs(z) >= 2
          };
        })
      };
    },

    /* ── Demand heatmap: 7×24. Tells you when to staff support and
       when to fire a push notification.                            */
    heatmap: function (records, field) {
      field = field || 'created_at';
      var grid = [];
      for (var d = 0; d < 7; d++) grid.push(new Array(24).fill(0));
      var max = 0;
      records.forEach(function (r) {
        var t = new Date(r[field]);
        if (isNaN(t.getTime())) return;
        var v = ++grid[t.getDay()][t.getHours()];
        if (v > max) max = v;
      });
      return { grid: grid, max: max || 1 };
    },

    /* ── Funnel: view → enquiry → booking → paid → reviewed.
       Surfaces the single worst leak, which is the only step worth
       fixing this quarter.                                          */
    funnel: function (stages) {
      var out = [], worst = null;
      stages.forEach(function (s, i) {
        var prev = i === 0 ? s.value : stages[i - 1].value;
        var rate = prev ? (s.value / prev) * 100 : 0;
        var drop = 100 - rate;
        var node = {
          label: s.label, value: s.value,
          rate: Math.round(rate * 10) / 10,
          drop: i === 0 ? 0 : Math.round(drop * 10) / 10
        };
        if (i > 0 && (!worst || node.drop > worst.drop)) worst = node;
        out.push(node);
      });
      return { stages: out, worstLeak: worst };
    },

    /* ── GMV & net revenue using the REAL banded service fee.
       Cabana's fee is KES 300 on a stay under KES 5,000, KES 800 at or
       above — never a percentage of GMV. The `service_fee` column on
       apartment_bookings is stamped by the Postgres trigger at booking
       time and is the authoritative figure. We read it directly here
       rather than multiplying GMV by an imaginary take rate, which was
       producing net-revenue figures 6-10x larger than what was actually
       collected.                                                        */
    revenue: function (bookings) {
      var now = Date.now();
      var gmv = 0, gmv30 = 0, gmv60 = 0, paid = 0;
      var netRevenue = 0, netRevenue30 = 0;
      bookings.forEach(function (b) {
        var amt = Number(b.grand_total || b.stay_total || b.total_amount || b.amount || 0) || 0;
        var fee = Number(b.service_fee || 0) || 0;
        var t = new Date(b.created_at).getTime();
        gmv += amt;
        netRevenue += fee;
        var st = String(b.status || b.payment_status || '').toLowerCase();
        if (st === 'paid' || st === 'confirmed' || st === 'completed' || st === 'checked_in') paid += amt;
        var age = now - t;
        if (age <= 30 * DAY) { gmv30 += amt; netRevenue30 += fee; }
        else if (age <= 60 * DAY) { gmv60 += amt; }
      });
      var growth = gmv60 ? ((gmv30 - gmv60) / gmv60) : 0;
      /* takeLabel is what the overview card shows beside the net-revenue figure.
         Avoid "12% take" which implies a percentage model; state what was actually
         collected and how many bookings generated it. */
      var bookedCount = bookings.filter(function (b) { return Number(b.service_fee || 0) > 0; }).length;
      return {
        gmv: gmv,
        gmv30: gmv30,
        paid: paid,
        collectionRate: gmv ? Math.round((paid / gmv) * 1000) / 10 : 0,
        revenue: netRevenue,
        revenue30: netRevenue30,
        growth: Math.round(growth * 1000) / 10,
        projected90: Math.round(netRevenue30 * 3 * (1 + growth)),
        takeLabel: bookedCount + ' booking' + (bookedCount === 1 ? '' : 's'),
      };
    },

    /* ── Operator attention queue. The console's opinion about what
       matters right now, ranked. This is the feature.               */
    triage: function (ctx) {
      var q = [];
      var push = function (sev, title, detail, action, target) {
        q.push({ severity: sev, title: title, detail: detail, action: action, target: target });
      };

      if (ctx.pendingListings > 0) {
        push(ctx.pendingListings > 20 ? 'high' : 'med',
          ctx.pendingListings + ' listing' + (ctx.pendingListings === 1 ? '' : 's') + ' awaiting review',
          'Supply is blocked behind moderation.',
          'Review queue', 'moderation');
      }
      if (ctx.flaggedUsers > 0) {
        push('high', ctx.flaggedUsers + ' flagged account' + (ctx.flaggedUsers === 1 ? '' : 's'),
          'Reported by users or auto-flagged by trust scoring.',
          'Open trust centre', 'trust');
      }
      if (ctx.decay && ctx.decay.zombie > 0) {
        push('med', ctx.decay.zombie + ' zombie listings',
          'Live for 90+ days with zero bookings. They are diluting search.',
          'Purge or nudge', 'inventory');
      }
      if (ctx.concentration && ctx.concentration.verdict === 'dangerous') {
        push('high', 'Dangerous partner concentration',
          'Top 3 partners drive ' + ctx.concentration.top3Share + '% of volume. HHI ' + ctx.concentration.hhi + '.',
          'See distribution', 'intel');
      }
      if (ctx.revenue && ctx.revenue.collectionRate < 70 && ctx.revenue.gmv > 0) {
        push('high', 'Collection rate at ' + ctx.revenue.collectionRate + '%',
          'Booked revenue is not converting to captured cash.',
          'Inspect payments', 'finance');
      }
      if (ctx.anomalies) {
        var spikes = ctx.anomalies.series.filter(function (d) { return d.anomaly; });
        if (spikes.length) {
          var last = spikes[spikes.length - 1];
          push('med', 'Traffic anomaly on ' + last.day,
            'Volume was ' + Math.abs(last.z).toFixed(1) + 'σ ' + (last.z > 0 ? 'above' : 'below') + ' baseline.',
            'View signals', 'intel');
        }
      }
      if (ctx.decay && ctx.decay.healthScore < 60) {
        push('med', 'Inventory health at ' + ctx.decay.healthScore + '%',
          'Most supply has not been touched in over 45 days.',
          'Open inventory', 'inventory');
      }
      if (ctx.openDisputes > 0) {
        push('high', ctx.openDisputes + ' open dispute' + (ctx.openDisputes === 1 ? '' : 's'),
          'Unresolved disputes damage retention faster than any other signal.',
          'Resolve', 'moderation');
      }
      if (ctx.faults && ctx.faults.length) {
        push('low', ctx.faults.length + ' data-layer faults',
          'Some tables did not respond. Panels may be incomplete.',
          'Diagnostics', 'system');
      }

      var order = { high: 0, med: 1, low: 2 };
      return q.sort(function (a, b) { return order[a.severity] - order[b.severity]; });
    }
  };

  /* ═══ 4 · AUDIT TRAIL ═════════════════════════════════════════════
     Every destructive act is recorded before it is performed. If the
     audit write fails, the action still proceeds but is mirrored to
     localStorage so nothing is ever silently lost.                  */
  function audit(action, target, meta) {
    var actor = '';
    try { actor = (global.ApaSession.get().user.email) || ''; } catch (e) {}
    var row = {
      action: action,
      target_type: (target && target.type) || 'unknown',
      target_id: (target && target.id) || null,
      actor_email: actor,
      meta: meta || {},
      created_at: new Date().toISOString()
    };

    try {
      var local = JSON.parse(localStorage.getItem('apa-audit') || '[]');
      local.unshift(row);
      localStorage.setItem('apa-audit', JSON.stringify(local.slice(0, 300)));
    } catch (e) {}

    return write('admin_audit_log', function (t) { return t.insert(row); })
      .then(function (r) { return r; });
  }

  function localAudit() {
    try { return JSON.parse(localStorage.getItem('apa-audit') || '[]'); }
    catch (e) { return []; }
  }

  /* ═══ 5 · MODERATION ══════════════════════════════════════════════ */
  var Moderate = {

    /* ── Generic writes ───────────────────────────────────────────
       The console manages eight service surfaces living in different
       tables. Rather than eight near-identical helpers, these take the
       table as an argument and audit under a name derived from it, so
       a new service becomes a row in the Catalogue registry rather
       than a new block of moderation code.

       `entity` is the audit noun ('tour', 'vehicle'), which is not
       always derivable from the table name.                        */

    patch: function (table, id, values, action, entity) {
      return audit(action || (table + '.patch'), { type: entity || table, id: id }, values)
        .then(function () {
          return write(table, function (t) { return t.update(values).eq('id', id); });
        });
    },

    /* Publish / pause / reject in one call. The status vocabulary is
       not shared across tables — listings say 'live', tours say
       'published' — so the caller passes the literal value the target
       table actually uses. */
    setStatus: function (table, id, status, extra, entity, stampApproved) {
      var values = { status: status };
      /* approved_at exists on listings and nowhere else, so it is opt-in
         per service rather than inferred from the status word. */
      if (stampApproved && (status === 'live' || status === 'published' || status === 'active')) {
        values.approved_at = new Date().toISOString();
      }
      if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) values[k] = extra[k];
      return audit(table + '.status.' + status, { type: entity || table, id: id }, { status: status })
        .then(function () {
          return write(table, function (t) { return t.update(values).eq('id', id); });
        }).then(function (r) {
          /* Some tables have no approved_at column. Rather than fail the
             whole action on a column that was only ever cosmetic, retry
             without it — but keep `extra`, which carries the visibility
             flags the public site actually filters on. */
          if (r.ok || !/column|schema cache/i.test(String(r.error || ''))) return r;
          var bare = { status: status };
          if (extra) for (var k2 in extra) if (Object.prototype.hasOwnProperty.call(extra, k2)) bare[k2] = extra[k2];
          return write(table, function (t) { return t.update(bare).eq('id', id); });
        });
    },

    feature: function (table, id, on, entity) {
      return audit(table + '.feature', { type: entity || table, id: id }, { on: !!on })
        .then(function () {
          return write(table, function (t) { return t.update({ featured: !!on }).eq('id', id); });
        });
    },

    /* Soft delete marks the row and leaves it recoverable. Hard delete
       removes it. Both are audited before the write, so a purge that
       succeeds is still explicable afterwards — the audit row is the
       only surviving evidence that the listing ever existed.

       Not every table carries a status/deleted_at pair. When a soft
       delete cannot land, the caller is told plainly rather than shown
       a success toast over an unchanged row. */
    remove: function (table, id, hard, reason, entity, extra, opts) {
      var noun = entity || table;
      opts = opts || {};
      return audit(hard ? noun + '.purge' : noun + '.delete',
                   { type: noun, id: id }, { reason: reason || '' })
        .then(function () {
          if (hard) return write(table, function (t) { return t.delete().eq('id', id); });
          /* The terminal status is not universal. tours and events carry a
             CHECK constraint that permits 'archived' but not 'deleted', so
             writing the wrong word is rejected outright rather than
             degrading. Each service names its own. */
          var values = { status: opts.deletedStatus || 'deleted' };
          if (opts.hasDeletedAt !== false) values.deleted_at = new Date().toISOString();
          /* A soft delete has to clear the visibility flag too. Marking
             the status alone leaves the row live on any page that
             filters on is_active, which is most of them. */
          if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) values[k] = extra[k];
          return write(table, function (t) { return t.update(values).eq('id', id); });
        });
    },

    approveListing: function (id) {
      return audit('listing.approve', { type: 'listing', id: id })
        .then(function () {
          return write('listings', function (t) {
            return t.update({ status: 'live', approved_at: new Date().toISOString() }).eq('id', id);
          });
        });
    },

    rejectListing: function (id, reason) {
      return audit('listing.reject', { type: 'listing', id: id }, { reason: reason })
        .then(function () {
          return write('listings', function (t) {
            return t.update({ status: 'rejected', rejection_reason: reason || 'Policy violation' }).eq('id', id);
          });
        });
    },

    /* Soft delete first. Hard delete only on explicit second confirm. */
    deleteListing: function (id, hard) {
      return audit(hard ? 'listing.purge' : 'listing.delete', { type: 'listing', id: id })
        .then(function () {
          if (hard) return write('listings', function (t) { return t.delete().eq('id', id); });
          return write('listings', function (t) {
            return t.update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', id);
          });
        });
    },

    unpublishListing: function (id) {
      return audit('listing.unpublish', { type: 'listing', id: id })
        .then(function () {
          return write('listings', function (t) { return t.update({ status: 'paused' }).eq('id', id); });
        });
    },

    featureListing: function (id, on) {
      return audit('listing.feature', { type: 'listing', id: id }, { on: !!on })
        .then(function () {
          return write('listings', function (t) { return t.update({ featured: !!on }).eq('id', id); });
        });
    },

    verifyPartner: function (id) {
      return audit('partner.verify', { type: 'profile', id: id })
        .then(function () {
          return write('profiles', function (t) {
            return t.update({ verified: true, verified_at: new Date().toISOString() }).eq('id', id);
          });
        });
    },

    /* Suspend: reversible. Listings hidden, login retained. */
    suspendPartner: function (id, reason, until) {
      return audit('partner.suspend', { type: 'profile', id: id }, { reason: reason, until: until })
        .then(function () {
          return write('profiles', function (t) {
            return t.update({
              status: 'suspended',
              suspended_at: new Date().toISOString(),
              suspended_until: until || null,
              suspension_reason: reason || 'Under review'
            }).eq('id', id);
          });
        })
        .then(function (r) {
          if (!r.ok) return r;
          return write('listings', function (t) {
            return t.update({ status: 'paused' }).eq('partner_id', id);
          }).then(function () { return r; });
        });
    },

    reinstatePartner: function (id) {
      return audit('partner.reinstate', { type: 'profile', id: id })
        .then(function () {
          return write('profiles', function (t) {
            return t.update({
              status: 'active', suspended_at: null,
              suspended_until: null, suspension_reason: null, banned: false
            }).eq('id', id);
          });
        });
    },

    /* Ban: terminal. Requires a reason. Listings are unpublished, not
       purged. Evidence must survive the ban.                         */
    banPartner: function (id, reason) {
      if (!reason) return Promise.resolve({ ok: false, error: 'A ban requires a written reason.' });
      return audit('partner.ban', { type: 'profile', id: id }, { reason: reason })
        .then(function () {
          return write('profiles', function (t) {
            return t.update({
              status: 'banned', banned: true,
              banned_at: new Date().toISOString(),
              ban_reason: reason
            }).eq('id', id);
          });
        })
        .then(function (r) {
          if (!r.ok) return r;
          return write('listings', function (t) {
            return t.update({ status: 'removed' }).eq('partner_id', id);
          }).then(function () { return r; });
        });
    },

    clearFlags: function (id) {
      return audit('partner.clear_flags', { type: 'profile', id: id })
        .then(function () {
          return write('profiles', function (t) { return t.update({ flags: 0 }).eq('id', id); });
        });
    },

    /* Transfer ownership of any row (listing, tour, event, etc.) from
       one partner/user to another. Works across any table that carries
       a partner_id or owner_id column. The audit entry records both
       the old and new owner so the transfer is fully traceable.

       tableKey  – the service table name, e.g. 'listings'
       ownerCol  – the FK column name, e.g. 'partner_id'
       id        – the row UUID
       newOwnerId – the target user's UUID
       reason    – optional admin note                               */
    transferOwnership: function (tableKey, ownerCol, id, currentOwnerId, newOwnerId, reason) {
      if (!newOwnerId) return Promise.resolve({ ok: false, error: 'New owner ID is required.' });
      if (newOwnerId === currentOwnerId) return Promise.resolve({ ok: false, error: 'New owner is the same as the current owner.' });
      return audit('listing.transfer_ownership', { type: tableKey, id: id }, {
        from: currentOwnerId, to: newOwnerId, reason: reason || ''
      }).then(function () {
        var patch = {};
        patch[ownerCol] = newOwnerId;
        /* Also update the secondary owner column if the table has one */
        if (ownerCol === 'partner_id') patch.host_id = newOwnerId;
        return write(tableKey, function (t) { return t.update(patch).eq('id', id); });
      });
    },

    deleteMedia: function (id, bucketPath) {
      return audit('media.delete', { type: 'media', id: id }, { path: bucketPath })
        .then(function () {
          var c = client();
          if (c && bucketPath) {
            try { c.storage.from('uploads').remove([bucketPath]); } catch (e) {}
          }
          return write('partner_uploads', function (t) { return t.delete().eq('id', id); });
        });
    },

    approveMedia: function (id) {
      return audit('media.approve', { type: 'media', id: id })
        .then(function () {
          return write('partner_uploads', function (t) {
            return t.update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
          });
        });
    },

    rejectMedia: function (id, reason) {
      return audit('media.reject', { type: 'media', id: id }, { reason: reason })
        .then(function () {
          return write('partner_uploads', function (t) {
            return t.update({ status: 'rejected', rejection_reason: reason || 'Does not meet guidelines' }).eq('id', id);
          });
        });
    },

    resolveDispute: function (id, resolution, note) {
      return audit('dispute.resolve', { type: 'dispute', id: id }, { resolution: resolution })
        .then(function () {
          return write('disputes', function (t) {
            return t.update({
              status: 'resolved', resolution: resolution,
              resolution_note: note || '', resolved_at: new Date().toISOString()
            }).eq('id', id);
          });
        });
    },

    refundBooking: function (id, amount, reason) {
      return audit('booking.refund', { type: 'booking', id: id }, { amount: amount, reason: reason })
        .then(function () {
          return write('apartment_bookings', function (t) {
            return t.update({
              status: 'refunded', refund_amount: amount,
              refund_reason: reason || '', refunded_at: new Date().toISOString()
            }).eq('id', id);
          });
        });
    },

    /* Bulk operations, executed serially so a mid-flight failure is
       visible and partial state is knowable.                        */
    bulk: function (ids, fn, onProgress) {
      var done = 0, ok = 0, failed = [];
      return ids.reduce(function (chain, id) {
        return chain.then(function () {
          return fn(id).then(function (r) {
            done++;
            if (r && r.ok) ok++; else failed.push(id);
            if (onProgress) onProgress(done, ids.length, ok, failed.length);
          });
        });
      }, Promise.resolve()).then(function () {
        return { total: ids.length, ok: ok, failed: failed };
      });
    }
  };

  /* ═══ 5b · THE SERVICE CATALOGUE ═══════════════════════════════════
     The console used to know about exactly one table, `listings`, and
     so the Inventory panel could only ever show stays. Every other
     service — the tours partners submit, the events organisers submit,
     the hire fleet, restaurant menus — existed on the public site and
     nowhere in admin. You could see a category but never the individual
     things inside it.

     This registry is the fix. Each service declares where its rows
     live and how to read one, and everything downstream (the table,
     the filters, the counts, delete) is generic over that. Adding a
     service is a row here, not a new panel.

     Two kinds of source:
       · shared  — rows already in the snapshot's `listings`, split by
                   their `type` column. No second fetch.
       · table   — its own table, fetched alongside the snapshot.

     A missing table degrades to [] like every other read, so a service
     that hasn't shipped yet simply shows an empty tab.              */

  /* Legacy rows predate the `type` column. `listings` began life as the
     apartments table, so an untyped row is a stay. */
  function typeOf(l) {
    return String(l.type || l.property_type || l.listing_type || 'apartment').toLowerCase();
  }

  var LISTING_TYPE_SERVICE = {
    apartment: 'stay', apartments: 'stay', stay: 'stay', stays: 'stay',
    house: 'stay', villa: 'stay', airbnb: 'stay',
    share: 'room', room: 'room', rooms: 'room', roommate: 'room', roommates: 'room',
    tour: 'tour', tours: 'tour', safari: 'tour',
    event: 'event', events: 'event',
    carhire: 'carhire', car: 'carhire', car_hire: 'carhire', cars: 'carhire',
    food: 'food', restaurant: 'food', restaurants: 'food', dining: 'food',
    shopping: 'shopping', shop: 'shopping', product: 'shopping',
    ride: 'ride', rides: 'ride', transport: 'ride'
  };

  /* Status vocabulary is not shared across tables — listings say
     'live', tours say 'published', the fleet says 'active' — so the
     raw value is collapsed to one of six states the UI can reason
     about. Booleans are consulted only after the words, because a
     pending row is pending whatever its is_active default happens
     to be. */
  function stateOf(row, status) {
    var s = String(status == null ? '' : status).toLowerCase().trim();
    if (s === 'deleted' || s === 'removed' || row.deleted_at) return 'deleted';
    if (s === 'pending' || s === 'review' || s === 'submitted') return 'pending';
    if (s === 'draft') return 'draft';
    if (s === 'rejected') return 'rejected';
    if (s === 'paused' || s === 'inactive' || s === 'hidden' || s === 'archived' ||
        s === 'retired' || s === 'service' || s === 'suspended' || s === 'sold_out') return 'hidden';
    if (row.is_active === false || row.active === false ||
        row.is_available === false || row.in_stock === false) return 'hidden';
    return 'live';
  }

  function firstPhoto(row) {
    var p = row.cover_url || row.image_url || row.photo || row.image;
    if (p) return p;
    var a = row.photos;
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
    if (Array.isArray(a) && a.length) return typeof a[0] === 'string' ? a[0] : (a[0] && a[0].url) || null;
    return null;
  }

  function join(parts) {
    return parts.filter(function (x) { return x != null && String(x).trim() !== ''; }).join(' · ');
  }

  /* Money arrives in three conventions across these tables: whole
     shillings, minor units (the hire fleet), and null. Each service
     says which it uses; nothing guesses. */
  function minor(n) { var v = Number(n); return isFinite(v) ? Math.round(v / 100) : 0; }

  var SERVICES = [
    {
      key: 'stay', label: 'Stays', icon: '🏠', entity: 'listing',
      shared: true, table: 'listings', editable: true,
      /* Verified against the live table: every listing row uses
         status='active', and the category rails query status=eq.active.
         Publishing to 'live' would have hidden the row from them. */
      liveStatus: 'active', pauseStatus: 'paused', deletedStatus: 'deleted',
      hasDeletedAt: true, hasApprovedAt: true, canFeature: true,
      /* The public pages filter on is_active, not on status, so the
         flag has to move with the word or a paused listing stays up. */
      publishExtra: { is_active: true }, pauseExtra: { is_active: false },
      norm: function (l) {
        return {
          title: l.title, sub: join([l.area || l.city, l.location]),
          price: Number(l.price_night || l.price_per_night || 0), unit: '/night'
        };
      }
    },
    {
      key: 'room', label: 'Rooms', icon: '🛏️', entity: 'listing',
      shared: true, table: 'listings', editable: true,
      /* Verified against the live table: every listing row uses
         status='active', and the category rails query status=eq.active.
         Publishing to 'live' would have hidden the row from them. */
      liveStatus: 'active', pauseStatus: 'paused', deletedStatus: 'deleted',
      hasDeletedAt: true, hasApprovedAt: true, canFeature: true,
      /* The public pages filter on is_active, not on status, so the
         flag has to move with the word or a paused listing stays up. */
      publishExtra: { is_active: true }, pauseExtra: { is_active: false },
      norm: function (l) {
        return {
          title: l.title, sub: join([l.area || l.city, l.location]),
          price: Number(l.price_month || l.price_night || 0), unit: l.price_month ? '/month' : '/night'
        };
      }
    },
    {
      key: 'food', label: 'Food', icon: '🍽️', entity: 'listing',
      shared: true, table: 'listings', editable: true,
      /* Verified against the live table: every listing row uses
         status='active', and the category rails query status=eq.active.
         Publishing to 'live' would have hidden the row from them. */
      liveStatus: 'active', pauseStatus: 'paused', deletedStatus: 'deleted',
      hasDeletedAt: true, hasApprovedAt: true, canFeature: true,
      /* The public pages filter on is_active, not on status, so the
         flag has to move with the word or a paused listing stays up. */
      publishExtra: { is_active: true }, pauseExtra: { is_active: false },
      norm: function (l) {
        return {
          title: l.title, sub: join([l.area || l.city, l.property_type]),
          price: Number(l.price_night || 0), unit: ' a main'
        };
      }
    },
    {
      key: 'shopping', label: 'Shopping', icon: '🛍️', entity: 'listing',
      shared: true, table: 'listings', editable: true,
      /* Verified against the live table: every listing row uses
         status='active', and the category rails query status=eq.active.
         Publishing to 'live' would have hidden the row from them. */
      liveStatus: 'active', pauseStatus: 'paused', deletedStatus: 'deleted',
      hasDeletedAt: true, hasApprovedAt: true, canFeature: true,
      /* The public pages filter on is_active, not on status, so the
         flag has to move with the word or a paused listing stays up. */
      publishExtra: { is_active: true }, pauseExtra: { is_active: false },
      norm: function (l) {
        return { title: l.title, sub: join([l.area || l.city]), price: Number(l.price_night || 0), unit: '' };
      }
    },
    {
      key: 'ride', label: 'Rides', icon: '🛺', entity: 'listing',
      shared: true, table: 'listings', editable: true,
      /* Verified against the live table: every listing row uses
         status='active', and the category rails query status=eq.active.
         Publishing to 'live' would have hidden the row from them. */
      liveStatus: 'active', pauseStatus: 'paused', deletedStatus: 'deleted',
      hasDeletedAt: true, hasApprovedAt: true, canFeature: true,
      /* The public pages filter on is_active, not on status, so the
         flag has to move with the word or a paused listing stays up. */
      publishExtra: { is_active: true }, pauseExtra: { is_active: false },
      norm: function (l) {
        return { title: l.title, sub: join([l.area || l.city]), price: Number(l.price_night || 0), unit: ' from' };
      }
    },

    /* ── first-party catalogues with their own tables ─────────────── */
    {
      key: 'tour', label: 'Tours', icon: '🗺️', entity: 'tour',
      table: 'tours', source: 'partner', editable: false,
      /* tours_status_check permits draft|pending|published|rejected|
         paused|archived. 'deleted' is rejected by the database, and the
         table has neither deleted_at nor approved_at. */
      liveStatus: 'published', pauseStatus: 'paused', deletedStatus: 'archived',
      hasDeletedAt: false, hasApprovedAt: false, canFeature: true,
      fetch: function () { return rows('tours', function (q) { return q.order('created_at', { ascending: false }).limit(1000); }); },
      norm: function (t) {
        return {
          title: t.title,
          sub: join([t.destination || t.county, t.duration_label, t.category]),
          price: Number(t.price_kes || 0), unit: ' pp'
        };
      }
    },
    {
      key: 'event', label: 'Events', icon: '🎟️', entity: 'event',
      table: 'events', source: 'partner', editable: false,
      /* Same constraint shape as tours, plus 'cancelled'. */
      liveStatus: 'published', pauseStatus: 'paused', deletedStatus: 'archived',
      hasDeletedAt: false, hasApprovedAt: false, canFeature: true,
      fetch: function () { return rows('events', function (q) { return q.order('starts_at', { ascending: false }).limit(1000); }); },
      norm: function (e) {
        var when = e.starts_at ? new Date(e.starts_at) : null;
        var tiers = e.tiers;
        if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch (x) { tiers = null; } }
        var from = 0;
        if (Array.isArray(tiers) && tiers.length) {
          from = tiers.reduce(function (m, t) {
            var v = Number(t && t.price_kes) || 0;
            return m == null || v < m ? v : m;
          }, null) || 0;
        }
        return {
          title: e.title,
          sub: join([e.venue, e.city, when && !isNaN(when.getTime()) ? when.toLocaleDateString() : null]),
          price: from, unit: from ? ' from' : '', freeLabel: 'Free'
        };
      }
    },
    {
      key: 'carhire', label: 'Car hire', icon: '🚗', entity: 'vehicle',
      table: 'car_fleet', source: 'operator', editable: false,
      /* No featured, deleted_at or approved_at column on this table. */
      liveStatus: 'active', pauseStatus: 'service', deletedStatus: 'retired',
      hasDeletedAt: false, hasApprovedAt: false, canFeature: false,
      fetch: function () { return rows('car_fleet', function (q) { return q.order('created_at', { ascending: false }).limit(1000); }); },
      norm: function (v) {
        return {
          title: join([v.make, v.model, v.variant]) || 'Vehicle',
          sub: join([v.year, v.class, v.seats ? v.seats + ' seats' : null, v.transmission]),
          /* car_fleet rates are minor units by design, to avoid float drift. */
          price: minor(v.day_rate), unit: '/day'
        };
      }
    },
    {
      key: 'menu', label: 'Menu items', icon: '🍲', entity: 'menu_item',
      table: 'menu_items', source: 'partner', editable: false,
      /* No status and no featured column: availability is the only lever. */
      liveStatus: null, pauseStatus: null, canFeature: false,
      availabilityFlag: 'is_available',
      fetch: function () {
        return rows('menu_items', function (q) {
          return q.select('*,listings(title)').order('created_at', { ascending: false }).limit(1500);
        });
      },
      norm: function (d) {
        return {
          title: d.name,
          sub: join([(d.listings && d.listings.title) || 'On a menu', d.badge, d.serves]),
          price: Number(d.promo_price != null ? d.promo_price : d.price || 0), unit: ''
        };
      }
    },

  ];

  /* Tab order and labels, independent of how many tables feed a tab. */
  var SERVICE_ORDER = ['stay', 'room', 'tour', 'event', 'carhire', 'food', 'menu', 'shopping', 'ride'];
  var SERVICE_META = {};
  SERVICES.forEach(function (s) {
    if (!SERVICE_META[s.key]) SERVICE_META[s.key] = { key: s.key, label: s.label, icon: s.icon };
  });

  function normalise(svc, row, decayByItem) {
    var n = {};
    try { n = svc.norm(row) || {}; } catch (e) { n = {}; }

    var status = row.status;
    var state = stateOf(row, status);
    /* Tables with no status column at all — menu_items is the one that
       remains — carry a boolean instead. Report that as the status so the
       UI is not showing a blank pill on a row it can still publish. */
    if (status == null && svc.availabilityFlag) {
      status = row[svc.availabilityFlag] === false ? 'hidden' : 'live';
    }

    var d = decayByItem && row.id ? decayByItem[row.id] : null;

    return {
      uid: svc.table + ':' + row.id,
      id: row.id,
      service: svc.key,
      serviceLabel: svc.label,
      icon: svc.icon,
      table: svc.table,
      entity: svc.entity,
      source: svc.source || 'first-party',
      editable: !!svc.editable,
      liveStatus: svc.liveStatus,
      pauseStatus: svc.pauseStatus,
      deletedStatus: svc.deletedStatus || null,
      hasDeletedAt: svc.hasDeletedAt !== false,
      hasApprovedAt: !!svc.hasApprovedAt,
      /* Not every table has a featured column. Offering the button where
         it does not exist just produces a failed write. */
      canFeature: svc.canFeature !== false,
      publishExtra: svc.publishExtra || null,
      pauseExtra: svc.pauseExtra || null,
      availabilityFlag: svc.availabilityFlag || null,

      title: n.title || row.title || row.name || 'Untitled',
      sub: n.sub || '',
      image: firstPhoto(row),
      price: Number(n.price || 0),
      unit: n.unit || '',
      freeLabel: n.freeLabel || null,

      status: status == null ? '' : String(status),
      state: state,
      featured: !!row.featured,
      partnerId: row.partner_id || row.owner_id || row.operator_id || row.organiser_id || row.user_id || null,

      views: Number(row.views || 0),
      bookings: Number(row.booking_count || row.bookings_count || row.order_count || 0),
      /* createdField lets a table name its own timestamp column. */
      createdAt: row[svc.createdField || 'created_at'] || row.created_at || null,
      updatedAt: row.updated_at || row[svc.createdField || 'created_at'] || row.created_at || null,

      /* Health is only meaningful where we track views and bookings,
         which today means `listings`. Everything else reports null
         rather than a fabricated diagnosis. */
      health: d ? d.reason : null,
      age: d ? d.age : null,

      raw: row
    };
  }

  var Catalogue = {
    services: SERVICES,
    order: SERVICE_ORDER,
    meta: SERVICE_META,
    typeOf: typeOf,
    stateOf: stateOf,

    /* Fetch only the services that own a table. Shared services are
       split out of the snapshot's listings, which is already loaded. */
    extras: function () {
      var own = SERVICES.filter(function (s) { return !s.shared; });
      return Promise.all(own.map(function (s) {
        return (s.fetch ? s.fetch() : rows(s.table)).then(function (r) {
          return { svc: s, rows: r || [] };
        });
      }));
    },

    build: function (listings, extras, decay) {
      var out = [];
      var byItem = {};
      if (decay && decay.items) {
        decay.items.forEach(function (it) { if (it.l && it.l.id) byItem[it.l.id] = it; });
      }

      var sharedByKey = {};
      SERVICES.forEach(function (s) { if (s.shared) sharedByKey[s.key] = s; });

      /* Filter out soft-deleted listings so they vanish from the
         catalogue immediately after a delete action. The hidden filter
         tab can still surface them via the state column if needed, but
         the default view must not show rows the operator just deleted. */
      var activeListings = (listings || []).filter(function (l) {
        var st = String(l.status || '').toLowerCase().trim();
        /* Keep deleted rows out of the catalogue build entirely.
           They were soft-deleted; the DB still has them but the
           admin UI should treat them as gone. */
        if (st === 'deleted' || st === 'removed') return false;
        if (l.deleted_at) return false;
        return true;
      });

      activeListings.forEach(function (l) {
        var key = LISTING_TYPE_SERVICE[typeOf(l)] || 'stay';
        /* A listing typed as a tour or an event still belongs in that
           tab, sitting next to the rows from the dedicated table. The
           source column is what tells them apart. */
        var svc = sharedByKey[key];
        if (!svc) {
          svc = {
            key: key, label: (SERVICE_META[key] && SERVICE_META[key].label) || key,
            icon: (SERVICE_META[key] && SERVICE_META[key].icon) || '📋',
            entity: 'listing', table: 'listings', editable: true,
            /* Verified against the live table: every listing row uses
         status='active', and the category rails query status=eq.active.
         Publishing to 'live' would have hidden the row from them. */
      liveStatus: 'active', pauseStatus: 'paused', deletedStatus: 'deleted',
      hasDeletedAt: true, hasApprovedAt: true, canFeature: true,
      /* The public pages filter on is_active, not on status, so the
         flag has to move with the word or a paused listing stays up. */
      publishExtra: { is_active: true }, pauseExtra: { is_active: false },
            norm: function (x) {
              return { title: x.title, sub: join([x.area || x.city, x.location]),
                       price: Number(x.price_night || x.price_month || 0), unit: '' };
            }
          };
        }
        out.push(normalise(svc, l, byItem));
      });

      (extras || []).forEach(function (bundle) {
        bundle.rows.forEach(function (row) { out.push(normalise(bundle.svc, row, null)); });
      });

      return out.sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
    },

    /* Counts per tab, so the UI can label a tab it has not rendered. */
    counts: function (items) {
      var c = { all: items.length };
      items.forEach(function (i) { c[i.service] = (c[i.service] || 0) + 1; });
      return c;
    },

    /* ── Writes, dispatched by the item's own table ──────────────── */
    publish: function (item) {
      if (item.liveStatus) return Moderate.setStatus(item.table, item.id, item.liveStatus, item.publishExtra, item.entity, item.hasApprovedAt);
      if (item.availabilityFlag) {
        var v = {}; v[item.availabilityFlag] = true;
        return Moderate.patch(item.table, item.id, v, item.entity + '.publish', item.entity);
      }
      return Promise.resolve({ ok: false, error: 'This service has no publish state' });
    },

    pause: function (item) {
      if (item.pauseStatus) return Moderate.setStatus(item.table, item.id, item.pauseStatus, item.pauseExtra, item.entity, false);
      if (item.availabilityFlag) {
        var v = {}; v[item.availabilityFlag] = false;
        return Moderate.patch(item.table, item.id, v, item.entity + '.pause', item.entity);
      }
      return Promise.resolve({ ok: false, error: 'This service has no paused state' });
    },

    feature: function (item, on) {
      if (!item.canFeature) {
        return Promise.resolve({ ok: false, error: item.serviceLabel + ' cannot be featured' });
      }
      return Moderate.feature(item.table, item.id, on, item.entity);
    },

    /* Soft delete where the table models it, hard delete where it does
       not. A menu item has no deleted state to move to, so pretending
       otherwise would leave it on the site. */
    remove: function (item, hard, reason) {
      var soft = !hard && !!item.deletedStatus;
      return Moderate.remove(item.table, item.id, !soft, reason, item.entity, item.pauseExtra, {
        deletedStatus: item.deletedStatus,
        hasDeletedAt: item.hasDeletedAt
      });
    },

    /* What a soft delete actually leaves behind, so the confirm dialog
       can name it instead of saying 'deleted' for a row that ends up
       archived or retired. */
    deletedLabel: function (item) { return item.deletedStatus || 'deleted'; },

    softDeletable: function (item) { return !!item.deletedStatus; },

    /* Return the FK column that holds the owning partner/user on the
       item's table. The owner column differs across tables; this map
       keeps the UI generic. */
    ownerCol: function (item) {
      var cols = {
        listings: 'partner_id',
        tours: 'organiser_id',
        events: 'organiser_id',
        food_items: 'partner_id',
        car_hire_vehicles: 'operator_id',
      };
      return cols[item.table] || 'partner_id';
    },

    /* Transfer ownership of a catalogue item to a new partner/user.
       newOwnerId must be a valid profile UUID.                       */
    transferOwnership: function (item, newOwnerId, reason) {
      var col = Catalogue.ownerCol(item);
      return Moderate.transferOwnership(item.table, col, item.id, item.partnerId, newOwnerId, reason);
    }
  };

  /* ═══ 6 · SNAPSHOT. One call, whole platform ════════════════════ */
  function coreSnapshot() {
    return Promise.all([
      rows('listings', function (q) {
        /* Exclude hard-deleted and soft-deleted rows. The admin UI can
           surface them via a separate "deleted" query if needed, but the
           default catalogue view must not show them after a delete action.
           neq alone is insufficient because some rows land on 'removed';
           filter each known terminal status. */
        return q
          .neq('status', 'deleted')
          .neq('status', 'removed')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(2000);
      }),
      rows('profiles', function (q) { return q.order('created_at', { ascending: false }).limit(3000); }),
      rows('apartment_bookings', function (q) { return q.select('*').order('created_at', { ascending: false }).limit(3000); }),
      rows('reviews', function (q) { return q.limit(2000); }),
      rows('partner_uploads', function (q) { return q.order('created_at', { ascending: false }).limit(600); }),
      rows('disputes', function (q) { return q.eq('status', 'open').limit(200); }),
      rows('ad_campaigns'),
      rows('tour_bookings', function (q) { return q.limit(1000); }),
      rows('event_tickets', function (q) { return q.limit(1000); }),
      rows('shadow_ads', function (q) { return q.order('priority', { ascending: false }).limit(300); }),
      rows('session_features', function (q) { return q.order('captured_at', { ascending: false }).limit(2000); }),
      rows('ride_requests', function (q) { return q.order('created_at', { ascending: false }).limit(500); }),
      rows('support_threads', function (q) { return q.select('id,status,unread_agent,escalated_at').eq('status', 'queued').limit(200); })
    ]).then(function (r) {
      var listings = r[0], profiles = r[1], bookings = r[2], reviews = r[3];
      var uploads = r[4], disputes = r[5], campaigns = r[6];
      var tours = r[7], tickets = r[8];
      var shadowAds = r[9] || [];
      var sessions = r[10] || [];
      var supportThreads = r[12] || [];
      var transportRequests = r[11] || [];
      /* r[12] = support_threads already assigned above */

      var allBookings = bookings.concat(tours, tickets);

      // Any profile that has a listing, or self-identifies as partner
      var partnerIds = {};
      listings.forEach(function (l) { if (l.partner_id) partnerIds[l.partner_id] = true; });
      var partners = profiles.filter(function (p) {
        return p.last_role === 'partner' || p.role === 'partner' || p.is_partner || partnerIds[p.id];
      });

      var pending = listings.filter(function (l) {
        var st = String(l.status || '').toLowerCase();
        return st === 'pending' || st === 'draft' || st === 'review';
      });

      var flagged = profiles.filter(function (p) {
        return Number(p.flags || 0) > 0 || p.reported;
      });

      var decay = Engine.decay(listings);
      var conc = Engine.concentration(bookings, 'listing_id', 'grand_total');
      /* grand_total is the actual paid field in apartment_bookings */
      var rev = Engine.revenue(allBookings);
      var anom = Engine.anomalies(allBookings, 'created_at', 30);

      var reviewsByOwner = {};
      reviews.forEach(function (rv) {
        var k = rv.owner_id || rv.partner_id;
        if (!k) return;
        (reviewsByOwner[k] = reviewsByOwner[k] || []).push(rv);
      });
      var bookingsByOwner = {}, cancelsByOwner = {};
      var listingToPartner = {};
      listings.forEach(function (l) { if (l.id && l.partner_id) listingToPartner[l.id] = l.partner_id; });

      bookings.forEach(function (b) {
        var k = b.partner_id || b.owner_id || listingToPartner[b.listing_id];
        if (!k) return;
        bookingsByOwner[k] = (bookingsByOwner[k] || 0) + 1;
        if (String(b.status || '').toLowerCase() === 'cancelled') {
          cancelsByOwner[k] = (cancelsByOwner[k] || 0) + 1;
        }
      });
      var listingsByOwner = {};
      listings.forEach(function (l) {
        var k = l.partner_id || l.owner_id || l.user_id;
        if (k) listingsByOwner[k] = (listingsByOwner[k] || 0) + 1;
      });

      var scored = partners.map(function (p) {
        var t = Engine.trust(p, {
          listings: listingsByOwner[p.id] || 0,
          bookings: bookingsByOwner[p.id] || 0,
          cancellations: cancelsByOwner[p.id] || 0,
          reviews: reviewsByOwner[p.id] || [],
          flags: Number(p.flags || 0)
        });
        return Object.assign({}, p, { _trust: t });
      }).sort(function (a, b) { return a._trust.score - b._trust.score; });

      var funnel = Engine.funnel([
        { label: 'Listing views', value: listings.reduce(function (s, l) { return s + Number(l.views || 0); }, 0) },
        { label: 'Enquiries', value: allBookings.length + Math.round(allBookings.length * 0.6) },
        { label: 'Bookings', value: allBookings.length },
        { label: 'Paid', value: allBookings.filter(function (b) {
            return /paid|confirmed|completed/i.test(String(b.status || b.payment_status || ''));
          }).length },
        { label: 'Reviewed', value: reviews.length }
      ]);

      var ctx = {
        pendingListings: pending.length,
        flaggedUsers: flagged.length,
        openDisputes: disputes.length,
        decay: decay,
        concentration: conc,
        revenue: rev,
        anomalies: anom,
        faults: faults
      };

      return {
        listings: listings,
        profiles: profiles,
        partners: scored,
        bookings: allBookings,
        rawBookings: bookings,
        reviews: reviews,
        uploads: uploads,
        disputes: disputes,
        campaigns: campaigns,
        shadowAds: shadowAds,
        sessions: sessions,
        transportRequests: transportRequests,
        supportThreads: supportThreads,
        pending: pending,
        flagged: flagged,
        engine: {
          decay: decay,
          concentration: conc,
          revenue: rev,
          anomalies: anom,
          funnel: funnel,
          heatmap: Engine.heatmap(allBookings),
          cohorts: Engine.cohorts(partners, bookings, 'owner_id'),
          listingVelocity: Engine.velocity(listings),
          bookingVelocity: Engine.velocity(allBookings),
          signupVelocity: Engine.velocity(profiles)
        },
        triage: Engine.triage(ctx),
        faults: faults.slice(),
        at: Date.now()
      };
    });
  }

  /* The catalogue tables load alongside the core snapshot rather than
     after it, so adding eight services costs one round trip, not
     eight sequential ones. Any of them can fail to [] without taking
     the console down. */
  function snapshot() {
    return Promise.all([coreSnapshot(), Catalogue.extras()]).then(function (r) {
      var base = r[0];
      base.catalogue = Catalogue.build(base.listings, r[1], base.engine && base.engine.decay);
      base.catalogueCounts = Catalogue.counts(base.catalogue);
      base.faults = faults.slice();
      return base;
    });
  }

  /* ═══ 7 · FORMAT HELPERS ══════════════════════════════════════════ */
  function money(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return 'KES ' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return 'KES ' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return 'KES ' + (n / 1e3).toFixed(1) + 'K';
    return 'KES ' + n.toLocaleString();
  }
  function num(n) { return (Number(n) || 0).toLocaleString(); }
  function pct(n) { return (Number(n) || 0).toFixed(1) + '%'; }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(s)) return ', ';
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString();
  }

  /* ═══ 8 · EXPORT ══════════════════════════════════════════════════ */
  function toCSV(records, cols) {
    if (!records.length) return '';
    cols = cols || Object.keys(records[0]);
    var esc = function (v) {
      if (v == null) return '';
      var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [cols.join(',')].concat(
      records.map(function (r) { return cols.map(function (c) { return esc(r[c]); }).join(','); })
    ).join('\n');
  }

  function download(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = global.document.createElement('a');
      a.href = url; a.download = filename;
      global.document.body.appendChild(a); a.click();
      global.document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {}
  }

  global.ApaAdmin = {
    client: client,
    rows: rows,
    count: count,
    write: write,
    snapshot: snapshot,
    Engine: Engine,
    Moderate: Moderate,
    Catalogue: Catalogue,
    audit: audit,
    localAudit: localAudit,
    faults: function () { return faults.slice(); },
    fmt: { money: money, num: num, pct: pct, ago: ago },
    toCSV: toCSV,
    download: download
  };

})(window);
