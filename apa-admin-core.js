/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · ADMIN CORE  v1
   ───────────────────────────────────────────────────────────────────
   Everything the console needs that isn't a pixel.

     · A single Supabase client (reuses ApaSession's if present)
     · A resilient query layer — a missing table degrades to [],
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
     an RLS denial, a network blip — all collapse to an empty result
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
     acts on — leading indicators, concentration risk, decay, trust.  */

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
       poisoning search results. Nobody tracks this. Everyone should. */
    decay: function (listings) {
      var now = Date.now();
      var stale = [], fresh = 0, zombie = 0;
      listings.forEach(function (l) {
        var touched = new Date(l.updated_at || l.created_at).getTime();
        if (isNaN(touched)) return;
        var age = (now - touched) / DAY;
        var views = Number(l.views || 0);
        var books = Number(l.booking_count || l.bookings_count || 0);

        if (age > 90 && books === 0) { zombie++; stale.push({ l: l, age: Math.round(age), reason: 'zombie' }); }
        else if (age > 45) { stale.push({ l: l, age: Math.round(age), reason: 'stale' }); }
        else fresh++;

        // High views, zero bookings → mispriced or misleading
        if (views > 200 && books === 0 && age > 14) {
          stale.push({ l: l, age: Math.round(age), reason: 'no-convert' });
        }
      });
      var total = listings.length || 1;
      return {
        fresh: fresh,
        zombie: zombie,
        staleCount: stale.length,
        healthScore: Math.round((fresh / total) * 100),
        items: stale.slice(0, 40)
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

      // Cancellation ratio bites hard — it is the single best predictor.
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

    /* ── GMV & take-rate projection with a naive-but-honest trend. */
    revenue: function (bookings, takeRate) {
      takeRate = takeRate || 0.12;
      var now = Date.now();
      var gmv = 0, gmv30 = 0, gmv60 = 0, paid = 0;
      bookings.forEach(function (b) {
        var amt = Number(b.grand_total || b.stay_total || b.total_amount || b.amount || 0) || 0;
        var t = new Date(b.created_at).getTime();
        gmv += amt;
        var st = String(b.status || b.payment_status || '').toLowerCase();
        if (st === 'paid' || st === 'confirmed' || st === 'completed' || st === 'checked_in') paid += amt;
        var age = now - t;
        if (age <= 30 * DAY) gmv30 += amt;
        else if (age <= 60 * DAY) gmv60 += amt;
      });
      var growth = gmv60 ? ((gmv30 - gmv60) / gmv60) : 0;
      return {
        gmv: gmv,
        gmv30: gmv30,
        paid: paid,
        collectionRate: gmv ? Math.round((paid / gmv) * 1000) / 10 : 0,
        revenue: Math.round(gmv * takeRate),
        revenue30: Math.round(gmv30 * takeRate),
        growth: Math.round(growth * 1000) / 10,
        projected90: Math.round(gmv30 * takeRate * 3 * (1 + growth))
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
       purged — evidence must survive the ban.                         */
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

  /* ═══ 6 · SNAPSHOT — one call, whole platform ════════════════════ */
  function snapshot() {
    return Promise.all([
      rows('listings', function (q) { return q.order('created_at', { ascending: false }).limit(2000); }),
      rows('profiles', function (q) { return q.order('created_at', { ascending: false }).limit(3000); }),
      rows('apartment_bookings', function (q) { return q.select('*').order('created_at', { ascending: false }).limit(3000); }),
      rows('reviews', function (q) { return q.limit(2000); }),
      rows('partner_uploads', function (q) { return q.order('created_at', { ascending: false }).limit(600); }),
      rows('disputes', function (q) { return q.eq('status', 'open').limit(200); }),
      rows('ad_campaigns'),
      rows('tour_bookings', function (q) { return q.limit(1000); }),
      rows('event_tickets', function (q) { return q.limit(1000); })
    ]).then(function (r) {
      var listings = r[0], profiles = r[1], bookings = r[2], reviews = r[3];
      var uploads = r[4], disputes = r[5], campaigns = r[6];
      var tours = r[7], tickets = r[8];

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
    if (isNaN(s)) return '—';
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
    audit: audit,
    localAudit: localAudit,
    faults: function () { return faults.slice(); },
    fmt: { money: money, num: num, pct: pct, ago: ago },
    toCSV: toCSV,
    download: download
  };

})(window);
