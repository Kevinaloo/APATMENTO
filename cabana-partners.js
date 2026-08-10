/* ═══════════════════════════════════════════════════════════════════
   CABANA · PARTNER PLATFORM  v1.0
   ─────────────────────────────────────────────────────────────────
   Cabana is the marketplace. Partners supply inventory.
   This is the layer that makes that true for ANY partner
   GuruWalk, Wildbosses, or whoever signs next quarter.

   A partner registers once. Everything else is automatic:
     • Their tours merge into Cabana's native grid
     • Their brand colour + name appear on each card
     • Booking mode decides the flow:
         'external' → opens partner site (legacy / no agreement)
         'native'   → books INSIDE Cabana, we take our fee,
                      partner gets notified, payout is ledgered
     • Fee, payout and reconciliation are tracked per booking

   To add a partner: CabanaPartners.register({...}). Nothing else.
   To drop a partner: remove the register() call. Zero residue.
   ═══════════════════════════════════════════════════════════════════ */

(function (W, D) {
  'use strict';
  if (W.CabanaPartners) return;

  var REGISTRY = {};
  var TOUR_CACHE = [];

  /* ══════════════════════════════════════════
     PARTNER REGISTRY
     ══════════════════════════════════════════ */
  var CabanaPartners = {

    /**
     * Register a partner.
     * @param {object} cfg
     *   id            unique slug            'wildbosses'
     *   name          display name           'Wildbosses'
     *   colour        brand hex              '#0A3B1E'
     *   accent        secondary hex          '#DCA318'
     *   bookingMode   'native' | 'external'
     *   feeRate       Cabana's cut, 0–1      0.10
     *   currency      'KES'
     *   getTours      fn() → array of tours in partner's own shape
     *   normalise     fn(tour) → Cabana tour shape
     *   notifyUrl     fn(booking) → URL to ping partner (WhatsApp etc)
     *   siteUrl       partner's own site
     */
    register: function (cfg) {
      if (!cfg || !cfg.id) return;
      REGISTRY[cfg.id] = Object.assign({
        bookingMode: 'external',
        feeRate: 0,
        currency: 'KES',
        colour: '#00A082',
        accent: '#2DD4BF',
        getTours: function () { return []; },
        normalise: function (t) { return t; },
      }, cfg);
      TOUR_CACHE = [];  // invalidate
      return REGISTRY[cfg.id];
    },

    unregister: function (id) { delete REGISTRY[id]; TOUR_CACHE = []; },

    get: function (id) { return REGISTRY[id] || null; },

    list: function () {
      return Object.keys(REGISTRY).map(function (k) { return REGISTRY[k]; });
    },

    /* ══════════════════════════════════════════
       TOUR AGGREGATION
       Pulls from every registered partner, normalises
       into one shape Cabana's grid understands.
       ══════════════════════════════════════════ */
    getAllTours: function (opts) {
      if (TOUR_CACHE.length && !(opts && opts.fresh)) return TOUR_CACHE;
      var out = [];
      CabanaPartners.list().forEach(function (p) {
        var raw;
        try { raw = p.getTours() || []; } catch (e) { raw = []; }
        raw.forEach(function (t) {
          var n;
          try { n = p.normalise(t); } catch (e) { return; }
          if (!n) return;
          n.partner      = p.id;
          n.partnerName  = p.name;
          n.partnerColour= p.colour;
          n.partnerAccent= p.accent;
          n.bookingMode  = p.bookingMode;
          n.feeRate      = p.feeRate;
          n.currency     = p.currency;
          out.push(n);
        });
      });
      TOUR_CACHE = out;
      return out;
    },

    /* ══════════════════════════════════════════
       PRICING. Cabana's fee model, applied uniformly
       ══════════════════════════════════════════ */
    price: function (tour, guests) {
      guests = guests || 1;
      var base    = (tour.price || 0) * guests;
      var feeRate = tour.feeRate || 0;
      var fee     = Math.round(base * feeRate);
      var total   = base + fee;
      var depPct  = tour.depositPct != null ? tour.depositPct : 30;
      var deposit = tour.price === 0 ? 0 : Math.round(total * depPct / 100);
      return {
        guests:        guests,
        perPerson:     tour.price || 0,
        base:          base,
        fee:           fee,
        feePct:        Math.round(feeRate * 100),
        total:         total,
        deposit:       deposit,
        balance:       total - deposit,
        partnerPayout: base,   // partner gets face value
        cabanaRevenue: fee,    // Cabana keeps the fee
        currency:      tour.currency || 'KES',
        isFree:        (tour.price || 0) === 0,
      };
    },

    /* ══════════════════════════════════════════
       BOOKING. Native flow, stays inside Cabana
       ══════════════════════════════════════════ */
    book: function (tourId, details) {
      var tour = CabanaPartners.getAllTours().find(function (t) { return t.id === tourId; });
      if (!tour) throw new Error('Tour not found: ' + tourId);
      var p = REGISTRY[tour.partner];
      if (!p) throw new Error('Partner not registered: ' + tour.partner);

      var pricing = CabanaPartners.price(tour, details.guests || 1);
      var ref = 'CB-' + Date.now().toString(36).toUpperCase() +
                '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

      var booking = {
        ref:            ref,
        partner:        tour.partner,
        partner_name:   tour.partnerName,
        tour_id:        tour.id,
        tour_name:      tour.name,
        guest_name:     details.name,
        guest_phone:    details.phone,
        guest_email:    details.email || '',
        guests:         pricing.guests,
        travel_date:    details.date || 'Flexible',
        notes:          details.notes || '',
        payment_ref:    details.paymentRef || '',
        payment_type:   details.paymentType || 'deposit',
        total:          pricing.total,
        cabana_fee:     pricing.cabanaRevenue,
        partner_payout: pricing.partnerPayout,
        currency:       pricing.currency,
        payout_status:  'pending',
        status:         'confirmed',
        created_at:     new Date().toISOString(),
      };

      /* 1. Ledger it in Cabana's own DB */
      CabanaPartners._ledger(booking);

      /* 2. Tell the partner */
      if (typeof p.notifyUrl === 'function') {
        try {
          var url = p.notifyUrl(booking);
          if (url) CabanaPartners._ping(url);
        } catch (e) {}
      }

      return booking;
    },

    /* write to Supabase partner_bookings */
    _ledger: function (b) {
      var sb = W.__APA_SB__ || W.sb;
      if (!sb || !sb.from) return;
      try {
        sb.from('partner_bookings').insert({
          booking_ref:    b.ref,
          partner:        b.partner,
          tour_id:        b.tour_id,
          tour_name:      b.tour_name,
          guest_name:     b.guest_name,
          guest_phone:    b.guest_phone,
          guest_email:    b.guest_email,
          guests:         b.guests,
          travel_date:    b.travel_date,
          payment_ref:    b.payment_ref,
          payment_type:   b.payment_type,
          total_amount:   b.total,
          cabana_fee:     b.cabana_fee,
          partner_payout: b.partner_payout,
          currency:       b.currency,
          payout_status:  b.payout_status,
          status:         b.status,
          notes:          b.notes,
          created_at:     b.created_at,
        }).then(function (r) {
          if (r && r.error) console.warn('[Partners] ledger:', r.error.message);
        });
      } catch (e) {}
    },

    /* fire-and-forget notification */
    _ping: function (url) {
      try {
        var f = D.createElement('iframe');
        f.style.display = 'none';
        f.src = url;
        D.body.appendChild(f);
        setTimeout(function () { f.parentNode && f.parentNode.removeChild(f); }, 3000);
      } catch (e) {}
    },

    /* ══════════════════════════════════════════
       FINANCE. What we owe each partner
       ══════════════════════════════════════════ */
    payoutSummary: function (bookings) {
      var byPartner = {};
      (bookings || []).forEach(function (b) {
        var k = b.partner || 'unknown';
        if (!byPartner[k]) byPartner[k] = { partner: k, bookings: 0, gross: 0, fee: 0, owed: 0, paid: 0 };
        var s = byPartner[k];
        s.bookings++;
        s.gross += b.total_amount || b.total || 0;
        s.fee   += b.cabana_fee || 0;
        if ((b.payout_status || 'pending') === 'paid') s.paid += b.partner_payout || 0;
        else s.owed += b.partner_payout || 0;
      });
      return Object.keys(byPartner).map(function (k) { return byPartner[k]; });
    },

    version: '1.0.0',
  };

  W.CabanaPartners = CabanaPartners;

}(window, document));


/* ═══════════════════════════════════════════════════════════════════
   PARTNER REGISTRATIONS
   ─────────────────────────────────────────────────────────────────
   Each block below is self-contained. Delete one to drop a partner.
   ═══════════════════════════════════════════════════════════════════ */

/* ── WILDBOSSES. Native booking, 10% Cabana fee ── */
window.CabanaPartners.register({
  id:          'wildbosses',
  name:        'Wildbosses',
  colour:      '#0A3B1E',
  accent:      '#DCA318',
  bookingMode: 'native',
  feeRate:     0.10,
  currency:    'KES',
  siteUrl:     'https://wildbosses.com',
  tagline:     'Safaris & expeditions across Kenya and Tanzania',

  getTours: function () {
    return (window.WildbossesAPI && window.WildbossesAPI.getFeatured)
      ? window.WildbossesAPI.getFeatured()
      : [];
  },

  normalise: function (t) {
    return {
      id:         t.id,
      name:       t.name,
      guide:      t.guide || 'Wildbosses',
      loc:        (t.destination || '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
      area:       t.country || 'Kenya',
      category:   t.category === 'safari' ? 'nature'
                : t.category === 'walking' ? 'city'
                : t.category === 'culture' ? 'community'
                : 'nature',
      dur:        t.duration,
      group:      'Up to ' + t.group_max,
      rating:     t.rating,
      reviews:    t.reviews,
      price:      t.price_kes,
      depositPct: t.deposit_pct,
      priceLabel: t.price_kes === 0 ? 'Free (pay what you want)'
                : 'KES ' + t.price_kes.toLocaleString(),
      tags:       (t.tags || []).slice(0, 4),
      desc:       t.description,
      itinerary:  (t.itinerary || []).map(function (i) {
                    return typeof i === 'string' ? i : (i.title || '');
                  }),
      includes:   t.includes || [],
      img:        t.image || t.image_thumb,
      url:        'https://wildbosses.com/tours',
      spotsLeft:  t.spots_left,
      spotsTotal: t.spots_total,
      urgency:    t.urgency,
      departure:  t.departure_date,
    };
  },

  notifyUrl: function (b) {
    var msg = [
      '🌿 *NEW BOOKING via Cabana*', '',
      '📋 Ref: ' + b.ref,
      '🗺 Tour: ' + b.tour_name,
      '📅 Date: ' + b.travel_date,
      '👥 Guests: ' + b.guests, '',
      '👤 ' + b.guest_name,
      '📞 ' + b.guest_phone,
      b.guest_email ? '📧 ' + b.guest_email : '', '',
      '💰 Total: KES ' + b.total.toLocaleString(),
      '🔧 Cabana fee: KES ' + b.cabana_fee.toLocaleString(),
      '💵 *Your payout: KES ' + b.partner_payout.toLocaleString() + '*', '',
      '✅ ' + b.payment_type + ' · ' + b.payment_ref,
      b.notes ? '📝 ' + b.notes : '',
    ].filter(Boolean).join('\n');
    return 'https://wa.me/254796818671?text=' + encodeURIComponent(msg);
  },
});

/* ── GURUWALK. External booking, no fee (legacy affiliate) ── */
window.CabanaPartners.register({
  id:          'guruwalk',
  name:        'GuruWalk',
  colour:      '#00A082',
  accent:      '#2DD4BF',
  bookingMode: 'external',
  feeRate:     0,
  currency:    'KES',
  siteUrl:     'https://www.guruwalk.com/en/a/nairobi',
  tagline:     'Free walking tours by Nairobi locals',
  getTours:    function () { return window.TOURS_GURUWALK || []; },
  normalise:   function (t) { return t; },
});
