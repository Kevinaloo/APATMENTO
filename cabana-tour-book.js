/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · booking
   ───────────────────────────────────────────────────────────────────
   Pick a real departure, say how many are coming, pay the deposit by
   M-Pesa. That is the whole flow, and every number in it is decided by
   Postgres, not here:

     · the date must be one the tour runs on (cabana_secure_tour_booking)
     · booking closes at the operator's cutoff, seats are counted live
     · a private offer from the guide is honoured automatically when the
       date and group size match it exactly
     · the reference is TOUR-<tour>-<ms>, the only shape the server and
       /api/stk-push accept (the old CT-… reference was refused, which is
       why tour bookings never reached payment)
     · the status moves only when the payment path says the money arrived

   The page shows its sums so the traveller knows before paying; the
   row that comes back from the insert is what is actually charged.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  /* A Kenyan mobile in any of the forms people actually type. */
  function normalisePhone(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    if (/^\+?254[17]\d{8}$/.test(d)) return d.replace(/^\+/, '');
    if (/^0[17]\d{8}$/.test(d)) return '254' + d.slice(1);
    if (/^[17]\d{8}$/.test(d)) return '254' + d;
    return null;
  }
  function friendly(e) {
    var m = String((e && (e.message || e.details)) || e || '');
    if (/Authentication is required|JWT|not authenticated/i.test(m)) return 'Please sign in again to book.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'You seem to be offline. Check your connection and try again.';
    if (/Invalid payment reference/i.test(m)) return 'Something went wrong preparing your payment. Please try again.';
    return m.replace(/^.*?:\s(?=[A-Z])/, '').slice(0, 220) || 'Could not book this tour. Please try again.';
  }

  var S = { t: null, date: null, people: 1, deps: [], offers: [], busy: false, booking: null };

  function root() {
    var r = doc.getElementById('ct-bk');
    if (!r) {
      r = doc.createElement('div'); r.id = 'ct-bk'; r.className = 'ct-bk';
      r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); r.setAttribute('aria-label', 'Book a tour');
      doc.body.appendChild(r);
      r.addEventListener('click', function (e) { if (e.target === r) close(); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && r.classList.contains('open')) close(); });
    }
    return r;
  }
  function close() {
    var r = doc.getElementById('ct-bk'); if (!r) return;
    r.classList.remove('open');
    if (!(doc.getElementById('ct-sheet') && doc.getElementById('ct-sheet').classList.contains('open'))) doc.documentElement.style.overflow = '';
  }
  function show(html) {
    var r = root();
    r.innerHTML = '<div class="ct-bk-card">' + html + '</div>';
    r.classList.add('open');
    doc.documentElement.style.overflow = 'hidden';
    var x = $('[data-bk-close]', r); if (x) x.addEventListener('click', close);
    return r;
  }
  function head(t, kick) {
    var kit = K();
    return '<div class="ct-bk-head"><small>' + kit.esc(kick || 'Boarding pass') + '</small><h3>' + kit.esc(t.title) + '</h3>' +
      '<button class="ct-sheet-close" type="button" data-bk-close aria-label="Close">' + kit.icon.close + '</button></div>';
  }

  /* ── what this traveller would pay ──────────────────────────────── */
  function offerFor(date, people) {
    var now = Date.now();
    return S.offers.filter(function (o) { return o.status === 'sent' && new Date(o.expires_at).getTime() > now && o.tour_date === date && Number(o.people) === Number(people); })[0] || null;
  }
  function quote() {
    var t = S.t, o = offerFor(S.date, S.people);
    var per = o ? Number(o.price) : Number(t.price_kes) || 0;
    var total = t.price_basis === 'per_group' ? per : per * S.people;
    var list = t.price_basis === 'per_group' ? Number(t.price_kes) : Number(t.price_kes) * S.people;
    var pct = Number(t.deposit_pct) || 0;
    var due = pct > 0 && pct < 100 ? Math.round(total * pct / 100) : total;
    return { offer: o, per: per, total: total, list: list, due: due, balance: Math.max(0, total - due), pct: pct, free: total === 0 };
  }
  function seatsFor(date) {
    var d = S.deps.filter(function (x) { return x.departs_on === date; })[0];
    return d && d.seats_left != null ? Number(d.seats_left) : null;
  }
  function limits() {
    var t = S.t, min = Math.max(1, Number(t.group_min) || 1), max = Math.max(min, Number(t.group_max) || 20);
    var left = seatsFor(S.date); if (left != null) max = Math.min(max, left);
    return { min: min, max: max };
  }

  /* ═══ OPEN ═════════════════════════════════════════════════════════ */
  function open(t, o) {
    o = o || {};
    var kit = K(); if (!kit || !t) return;
    S.t = t; S.booking = null; S.offers = [];
    var u = kit.user();
    if (!u) {
      var next = '/tours?book=' + encodeURIComponent(t.id) + (o.date ? '&date=' + encodeURIComponent(o.date) : '') + (o.people ? '&people=' + o.people : '');
      show(head(t, 'Almost there') + '<div class="ct-bk-b"><div class="ct-note">' + kit.icon.shield +
        '<span>Sign in to book. It keeps your booking, your chat with the guide and your receipt in one place, and your deposit protected.</span></div>' +
        '<a class="ct-btn ct-btn-sun ct-btn-block" href="/auth.html?next=' + encodeURIComponent(next) + '">Sign in to book</a>' +
        '<button class="ct-btn ct-btn-block" type="button" data-bk-close>Not now</button></div>');
      return;
    }
    S.deps = kit.departures(t.id).filter(function (d) { return !d.closes_at || new Date(d.closes_at).getTime() > Date.now(); });
    var firstOpen = S.deps.filter(function (d) { return d.seats_left !== 0; })[0];
    S.date = o.date && (S.deps.some(function (d) { return d.departs_on === o.date; }) || !S.deps.length) ? o.date : (firstOpen ? firstOpen.departs_on : (o.date || null));
    var lim = limits();
    S.people = Math.min(lim.max, Math.max(lim.min, Number(o.people) || lim.min));
    paint();
    // A private offer from the guide, if there is one.
    var c = kit.sb();
    if (c && /^\d+$/.test(String(t.id))) c.from('tour_offers').select('id,tour_date,people,price,total,status,expires_at,note')
      .eq('tour_id', Number(t.id)).eq('status', 'sent').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(5)
      .then(function (r) { if (r && Array.isArray(r.data) && r.data.length) { S.offers = r.data; if (!o.date && !o.people) { S.date = r.data[0].tour_date; S.people = Number(r.data[0].people) || S.people; } paint(); } }, function () {});
  }

  function paint() {
    var kit = K(), t = S.t, esc = kit.esc, I = kit.icon, q = quote(), lim = limits();
    var cutoffH = Number(t.booking_cutoff_hours) || 48;
    var minDay = new Date(Date.now() + 3 * 3600e3 + cutoffH * 3600e3 + 864e5 * 0).toISOString().slice(0, 10);
    var dateUI;
    if (S.deps.length) {
      dateUI = '<div class="ct-dates" role="group" aria-label="Departure date">' + S.deps.slice(0, 14).map(function (d) {
        var left = d.seats_left == null ? null : Number(d.seats_left);
        return '<button class="ct-date' + (left != null && left <= 3 ? ' low' : '') + '" type="button" data-bk-date="' + esc(d.departs_on) + '" aria-pressed="' + (d.departs_on === S.date) + '"' + (left === 0 ? ' disabled' : '') + '>' +
          '<small>' + esc(kit.fmtDay(d.departs_on, { weekday: 'short', timeZone: 'UTC' })) + '</small><b>' + esc(kit.fmtDay(d.departs_on, { day: 'numeric', timeZone: 'UTC' })) + '</b><span>' + (left == null ? esc(kit.fmtDay(d.departs_on, { month: 'short', timeZone: 'UTC' })) : left === 0 ? 'Full' : left + ' left') + '</span></button>';
      }).join('') + '</div>';
    } else if (t.schedule_type === 'daily' || t.schedule_type === 'on_request' || !t.schedule_type) {
      dateUI = '<input class="ct-input" type="date" data-bk-input min="' + esc(minDay) + '" value="' + esc(S.date || '') + '" aria-label="Tour date"/>' +
        (t.schedule_type === 'on_request' ? '<div class="ct-note" style="margin-top:10px">' + I.chat + '<span>This tour runs on request. Pick your day; if it does not suit the guide they will say so in your messages, and you are refunded in full.</span></div>' : '');
    } else {
      dateUI = '<div class="ct-note warn">' + I.cal + '<span>No departures are open for booking right now. Ask the guide when the next one runs.</span></div>' +
        '<button class="ct-btn ct-btn-block" type="button" data-bk-msg style="margin-top:10px">' + I.chat + 'Message the guide</button>';
    }
    var dep = S.deps.filter(function (d) { return d.departs_on === S.date; })[0];
    var offerNote = '';
    if (S.offers.length) {
      var o = S.offers[0];
      offerNote = q.offer
        ? '<div class="ct-note">' + I.bolt + '<span><b>Your private offer is applied.</b> ' + esc(kit.money(o.price)) + (t.price_basis === 'per_group' ? ' for the group' : ' per person') + ' on ' + esc(kit.fmtDay(o.tour_date)) + ' for ' + o.people + '.</span></div>'
        : '<div class="ct-note">' + I.bolt + '<span>The guide sent you a private offer for <b>' + esc(kit.fmtDay(o.tour_date)) + ', ' + o.people + (o.people === 1 ? ' person' : ' people') + '</b>. <button type="button" data-bk-useoffer style="background:none;border:0;color:var(--ct-turq);font:inherit;font-weight:700;cursor:pointer;padding:0">Use it</button></span></div>';
    }
    var phone = K().esc(readPhone());
    var html = head(t, 'Boarding pass · ' + (t.destination || 'Cabana Tours')) +
      '<div class="ct-bk-b">' +
        '<div><div class="ct-bk-l">When</div>' + dateUI + '</div>' +
        (S.date && (S.deps.length || t.schedule_type !== 'fixed') ? '<div><div class="ct-bk-l">Who’s coming</div><div class="ct-step"><span style="font:600 14px var(--ct-f);color:var(--ct-cream-2)">' + (t.price_basis === 'per_group' ? 'People in your group' : 'Travellers') + '</span>' +
          '<span class="ct-step-v"><button type="button" data-bk-n="-1" aria-label="One fewer"' + (S.people <= lim.min ? ' disabled' : '') + '>−</button><b aria-live="polite">' + S.people + '</b><button type="button" data-bk-n="1" aria-label="One more"' + (S.people >= lim.max ? ' disabled' : '') + '>+</button></span></div>' +
          (lim.min > 1 ? '<div style="margin-top:8px;font:500 12px var(--ct-f);color:var(--ct-cream-3)">This tour runs for groups of ' + lim.min + ' or more.</div>' : '') + '</div>' : '') +
        offerNote +
        '<label class="ct-field"><span class="ct-bk-l" style="margin:0">M-Pesa number</span><input class="ct-input" data-bk-phone inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" value="' + phone + '"/></label>' +
        '<div class="ct-sum">' +
          (q.free ? '<div class="kv tot"><span>Your place</span><b>Free</b></div>'
            : '<div class="kv"><span>' + esc(kit.money(q.per)) + (t.price_basis === 'per_group' ? ' for the group' : ' × ' + S.people) + '</span><b>' + esc(kit.money(q.total)) + '</b></div>' +
              (q.offer && q.list > q.total ? '<div class="kv off"><span>Private offer saves you</span><span>− ' + esc(kit.money(q.list - q.total)) + '</span></div>' : '') +
              '<div class="kv"><span>Cabana fee</span><b>KES 0</b></div>' +
              (q.balance > 0 ? '<div class="kv"><span>Pay the guide on the day</span><b>' + esc(kit.money(q.balance)) + '</b></div>' : '') +
              '<div class="kv tot"><span>' + (q.balance > 0 ? 'Pay now to confirm (' + q.pct + '%)' : 'Pay now') + '</span><b>' + esc(kit.money(q.due)) + '</b></div>') +
        '</div>' +
        (dep && dep.closes_at ? '<div style="font:500 12.5px/1.5 var(--ct-f);color:var(--ct-cream-3);display:flex;gap:8px;align-items:center">' + I.clock.replace('<svg', '<svg width="15" height="15"') + 'Booking for this departure closes ' + esc(kit.fmtDay(String(new Date(new Date(dep.closes_at).getTime() + 3 * 3600e3).toISOString()).slice(0, 10))) + ' at ' + esc(kit.nboClock(dep.closes_at)) + '.</div>' : '') +
        '<div class="ct-err" data-bk-err role="alert"></div>' +
        '<button class="ct-btn ct-btn-sun ct-btn-block" type="button" data-bk-go' + (S.date ? '' : ' disabled') + '>' + (q.free ? 'Reserve my place' : 'Pay ' + esc(kit.money(q.due)) + ' with M-Pesa') + '</button>' +
        '<div style="display:flex;gap:8px"><button class="ct-btn ct-btn-s" style="flex:1" type="button" data-bk-msg>' + I.chat + 'Ask the guide first</button></div>' +
      '</div>';
    var r = show(html);
    wire(r);
  }
  function readPhone() {
    try { var p = global.ApaSession && global.ApaSession.get && global.ApaSession.get().profile; if (p && p.phone) return p.phone; } catch (e) {}
    try { return global.localStorage.getItem('ct:phone') || ''; } catch (e) { return ''; }
  }
  function wire(r) {
    $$('[data-bk-date]', r).forEach(function (b) { b.addEventListener('click', function () { S.date = b.getAttribute('data-bk-date'); var l = limits(); S.people = Math.min(l.max, Math.max(l.min, S.people)); paint(); }); });
    var inp = $('[data-bk-input]', r); if (inp) inp.addEventListener('change', function () { S.date = inp.value || null; paint(); });
    $$('[data-bk-n]', r).forEach(function (b) { b.addEventListener('click', function () { var l = limits(); S.people = Math.min(l.max, Math.max(l.min, S.people + Number(b.getAttribute('data-bk-n')))); paint(); }); });
    var use = $('[data-bk-useoffer]', r); if (use) use.addEventListener('click', function () { var o = S.offers[0]; S.date = o.tour_date; S.people = Number(o.people) || S.people; paint(); });
    $$('[data-bk-msg]', r).forEach(function (b) { b.addEventListener('click', function () { close(); K().message(S.t.id, { date: S.date, people: S.people }); }); });
    var go = $('[data-bk-go]', r); if (go) go.addEventListener('click', submit);
    var ph = $('[data-bk-phone]', r); if (ph) ph.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  /* ═══ SUBMIT ═══════════════════════════════════════════════════════ */
  function submit() {
    var kit = K(), r = root(), err = $('[data-bk-err]', r), go = $('[data-bk-go]', r);
    if (S.busy) return;
    var phoneRaw = ($('[data-bk-phone]', r) || {}).value || '';
    var phone = normalisePhone(phoneRaw), q = quote();
    if (!S.date) { err.textContent = 'Choose a date first.'; return; }
    if (!q.free && !phone) { err.textContent = 'Enter the Safaricom number that should get the M-Pesa prompt.'; $('[data-bk-phone]', r).focus(); return; }
    try { if (phone) global.localStorage.setItem('ct:phone', phoneRaw.trim()); } catch (e) {}
    var c = kit.sb(), u = kit.user();
    if (!c || !u) { kit.signIn(); return; }
    S.busy = true; err.textContent = '';
    if (go) { go.disabled = true; go.innerHTML = '<span class="ct-spin"></span>Holding your place…'; }
    var t = S.t, reference = 'TOUR-' + t.id + '-' + Date.now();
    c.from('tour_bookings').insert({
      tour_id: Number(t.id), tour_date: S.date, num_people: S.people,
      contact_phone: phone || normalisePhone(readPhone()) || null, contact_email: u.email || null,
      payment_reference: reference
    }).select('id,tour_date,num_people,tour_total,grand_total,operator_balance,status,payment_reference,offer_id').single().then(function (res) {
      S.busy = false;
      if (res.error || !res.data) { fail(friendly(res.error || 'Could not book this tour.')); return; }
      var b = S.booking = res.data;
      safeTrack('begin_checkout', b);
      if (Number(b.grand_total) <= 0 || b.status === 'reserved') { done(b, false); return; }
      pay(b, phone);
    }, function (e) { S.busy = false; fail(friendly(e)); });
    function fail(msg) {
      err.textContent = msg;
      if (go) { go.disabled = false; go.textContent = q.free ? 'Reserve my place' : 'Pay ' + kit.money(q.due) + ' with M-Pesa'; }
    }
  }
  function pay(b, phone) {
    var kit = K(), t = S.t;
    if (!global.ApatmentoPay || !global.ApatmentoPay.start) {
      done(b, true, 'Your place is held. Payment could not start on this page; finish it from My Bookings.');
      return;
    }
    close();
    var when = kit.fmtDay(b.tour_date) + (t.departure_time ? ' · ' + kit.fmtTime(t.departure_time) : '') + ' · ' + b.num_people + (b.num_people === 1 ? ' person' : ' people');
    global.ApatmentoPay.start({
      amount: Number(b.grand_total), phone: phone, reference: b.payment_reference,
      description: 'Cabana Tours · ' + String(t.title).slice(0, 60),
      trip: { property: t.title, location: t.destination || t.county || '', whenText: when },
      success: {
        title: 'You’re going.',
        note: Number(b.operator_balance) > 0 ? 'Deposit paid · ' + kit.money(b.operator_balance) + ' to the guide on the day' : 'Paid in full · see you on ' + kit.fmtDay(b.tour_date)
      },
      onSuccess: function () { safeTrack('purchase', b); setTimeout(function () { done(b, false); }, 400); },
      onFailure: function () { /* the payment sheet explains and offers a retry */ }
    });
  }
  function done(b, pending, msg) {
    var kit = K(), t = S.t, I = kit.icon, esc = kit.esc;
    show('<div class="ct-bk-done"><div class="stamp">' + (pending ? I.clock : I.check) + '</div>' +
      '<h3>' + (pending ? 'Your place is held' : Number(b.grand_total) > 0 ? 'You’re going.' : 'You’re on the list.') + '</h3>' +
      '<p>' + esc(msg || (t.title + ' · ' + kit.fmtDay(b.tour_date) + (t.departure_time ? ' at ' + kit.fmtTime(t.departure_time) : '') + ' · ' + b.num_people + (b.num_people === 1 ? ' person.' : ' people.') +
        ' The guide’s number and meeting details are now in your booking and your messages.')) + '</p>' +
      '<div class="acts"><button class="ct-btn ct-btn-sweep ct-btn-block" type="button" data-bk-chat>' + I.chat + 'Message your guide</button>' +
      '<a class="ct-btn ct-btn-block" href="/my-bookings.html">My bookings</a>' +
      '<button class="ct-btn ct-btn-s ct-btn-block" type="button" data-bk-close>Keep exploring</button></div></div>');
    var r = root(), ch = $('[data-bk-chat]', r);
    if (ch) ch.addEventListener('click', function () {
      close();
      if (global.CabanaChat && global.CabanaChat.openForTourBooking) global.CabanaChat.openForTourBooking(b.id);
      else kit.message(t.id, { date: b.tour_date, people: b.num_people });
    });
    try { kit.reload(); } catch (e) {}
  }
  function safeTrack(ev, b) {
    try { if (global.gtag) global.gtag('event', ev, { currency: 'KES', value: Number(b.grand_total) || 0, items: [{ item_id: String(S.t.id), item_name: S.t.title, item_category: 'tour', quantity: b.num_people }] }); } catch (e) {}
  }

  global.CabanaTourBook = { open: open, close: close, normalisePhone: normalisePhone };
})(window);
