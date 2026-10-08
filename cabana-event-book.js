/* ═══════════════════════════════════════════════════════════════════
   CABANA · EVENT TICKETS
   ───────────────────────────────────────────────────────────────────
   Tier, quantity, name and phone, then a row in event_tickets and the
   M-Pesa push. Built on the Checkout Atelier ("events" room).

   What the database owns, and this file only displays:
     · the ticket price (read from the event's tiers on insert),
     · the Cabana facilitation fee (cabana_fee_quote previews it; the
       insert trigger charges it — no schedule ships to the browser),
     · the reference format EVENT-<event id>-<ms>, which the insert
       trigger rejects otherwise,
     · whether money claimed seats. A ticket is only ever called
       "confirmed" by the settle RPC after M-Pesa reports the money; this
       file never writes a status.

   A free event goes straight to the door list (status 'reserved').
   A paid one never shows "you're in" without a payment.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.CabanaEventBook) return;

  var MAX_PER_ORDER = 10;
  var sb = null, ev = null, tierIdx = 0, q = 1, fee = null, feeSeq = 0, h = null;

  function client() {
    if (sb) return sb;
    sb = (window.ApaSession && window.ApaSession.client && window.ApaSession.client()) || null;
    if (!sb && window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(
        'https://gfwgbgdvxtocwhilrtdw.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw');
    }
    return sb;
  }
  function kit(cb) {
    if (window.CabanaCheckout) return cb(window.CabanaCheckout);
    var s = document.querySelector('script[src*="cabana-checkout.js"]');
    if (!s) { s = document.createElement('script'); s.src = '/cabana-checkout.js'; document.head.appendChild(s); }
    s.addEventListener('load', function () { cb(window.CabanaCheckout); });
  }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) {} }
    return [];
  }
  function tiersOf(e) {
    var t = arr(e.tiers).map(function (x, i) {
      var qty = x.qty == null ? null : Number(x.qty);
      return { name: x.name || ('Tier ' + (i + 1)), price: Number(x.price_kes) || 0, note: x.note || '',
               left: qty == null ? null : Math.max(0, qty - (Number(x.sold) || 0)) };
    });
    if (!t.length) t = [{ name: 'General admission', price: Number(e.price_from) || 0, note: '', left: null }];
    return t;
  }
  function when(e) {
    var d = e.starts_at || e.event_date || e.date;
    if (!d) return '';
    try {
      var x = new Date(d);
      return x.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) +
        (/T\d\d:\d\d/.test(String(d)) ? ' · ' + x.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '');
    } catch (err) { return ''; }
  }
  function ceiling() {
    var t = tiersOf(ev)[tierIdx];
    return t && t.left != null ? Math.max(1, Math.min(MAX_PER_ORDER, t.left)) : MAX_PER_ORDER;
  }

  async function signedIn() {
    var c = client(); if (!c) return null;
    try { var r = await c.auth.getSession(); return r && r.data && r.data.session; } catch (e) { return null; }
  }

  function open(e) {
    if (!e) return;
    kit(function (CX) { render(CX, e); });
  }

  function render(CX, e) {
    ev = e; q = 1; fee = null;
    var ts = tiersOf(e);
    tierIdx = 0;
    for (var i = 0; i < ts.length; i++) { if (ts[i].left == null || ts[i].left > 0) { tierIdx = i; break; } }
    var esc = CX.esc;
    var place = [e.venue, e.city].filter(Boolean).join(', ');
    var body =
      '<div><span class="cx-label">Choose your tier</span><div class="cx-options" role="radiogroup" aria-label="Ticket tier">' +
        ts.map(function (t, i) {
          var gone = t.left != null && t.left <= 0;
          return '<label class="cx-option' + (i === tierIdx ? ' is-on' : '') + '"' + (gone ? ' aria-disabled="true"' : '') + ' data-t="' + i + '">' +
            '<input type="radio" name="ceb-tier" value="' + i + '"' + (i === tierIdx ? ' checked' : '') + (gone ? ' disabled' : '') + '/>' +
            '<span class="cx-tick"></span>' +
            '<span class="cx-option-t"><b>' + esc(t.name) + '</b>' +
              '<small>' + esc(gone ? 'Sold out' : [t.note, t.left != null && t.left <= 10 ? t.left + ' left' : ''].filter(Boolean).join(' · ')) + '</small></span>' +
            '<span class="cx-option-v" data-allin="' + t.price + '">' + (t.price === 0 ? 'Free' : CX.money(allInSync(t.price))) + '</span></label>';
        }).join('') + '</div></div>' +
      '<div class="cx-stepper"><div><b>Tickets</b><small id="ceb-cap">Up to ' + ceiling() + ' per order</small></div>' +
        '<div class="cx-stepper-ctl"><button type="button" id="ceb-minus" aria-label="One fewer">−</button><output id="ceb-q">1</output><button type="button" id="ceb-plus" aria-label="One more">+</button></div></div>' +
      '<div><label class="cx-label" for="ceb-name">Name on the door list</label><input class="cx-input" id="ceb-name" autocomplete="name" placeholder="As on your ID"/></div>' +
      '<div id="ceb-phone-wrap"><label class="cx-label" for="ceb-phone">M-Pesa number</label><div class="cx-phone"><span>+254</span><input id="ceb-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="7XX XXX XXX"/></div></div>' +
      '<div class="cx-ticket"><div class="cx-ticket-head"><div><div class="cx-ticket-name">' + esc(e.title) + '</div>' +
        '<div class="cx-ticket-meta">' + esc([when(e), place].filter(Boolean).join(' · ')) + '</div></div></div>' +
        '<div class="cx-perf"><i></i></div><div class="cx-lines" id="ceb-lines"></div>' +
        '<div class="cx-total"><div class="cx-total-k" id="ceb-tk">Total<small>Paid in full to hold your seats</small></div><div class="cx-total-v" id="ceb-total"></div></div></div>' +
      '<div class="cx-err" id="ceb-err" role="alert"></div>' +
      '<button class="cx-pay" type="button" id="ceb-go"><span class="cx-pay-l" id="ceb-go-l">Pay with M-Pesa</span></button>' +
      '<div class="cx-assure"><span>' + CX.icon('shield') + 'Seats held the moment M-Pesa confirms</span><span>' + CX.icon('ticket') + 'Door code in My Bookings</span></div>';

    h = CX.sheet({ vibe: 'events', kicker: 'Tickets', titleHtml: esc(e.title || 'Tickets'), sub: place || 'Secure your place', body: body, label: 'Get tickets' });
    var root = h.sheet;
    var $ = function (id) { return root.querySelector('#' + id); };

    Array.prototype.forEach.call(root.querySelectorAll('.cx-option'), function (o) {
      o.addEventListener('click', function (x) {
        if (o.getAttribute('aria-disabled') === 'true') { x.preventDefault(); return; }
        tierIdx = Number(o.getAttribute('data-t'));
        Array.prototype.forEach.call(root.querySelectorAll('.cx-option'), function (y) { y.classList.toggle('is-on', y === o); });
        setQty(1);
      });
    });
    $('ceb-minus').onclick = function () { setQty(q - 1); };
    $('ceb-plus').onclick = function () { setQty(q + 1); };
    $('ceb-go').onclick = function () { submit(CX); };
    ['ceb-name', 'ceb-phone'].forEach(function (id) { $(id).addEventListener('input', function () { $(id).removeAttribute('aria-invalid'); $('ceb-err').textContent = ''; }); });
    (window.ApaSession && window.ApaSession.getUser ? Promise.resolve(window.ApaSession.getUser()) : signedIn().then(function (s) { return s && s.user; }))
      .then(function (u) {
        var m = (u && u.user_metadata) || {};
        var n = m.full_name || [m.first_name, m.last_name].filter(Boolean).join(' ');
        if (n && !$('ceb-name').value) $('ceb-name').value = n;
      }, function () {});

    function setQty(n) {
      var top = ceiling();
      q = Math.max(1, Math.min(top, n));
      $('ceb-q').textContent = q;
      $('ceb-minus').disabled = q <= 1; $('ceb-plus').disabled = q >= top;
      $('ceb-cap').textContent = 'Up to ' + top + ' per order';
      paint(CX, root);
      quote(CX, root);
    }
    setQty(1);
    /* Tier prices are shown all-in: what one ticket costs the guest. */
    if (window.ApaFees) ApaFees.allInMany('events', ts.map(function (t) { return t.price; })).then(function () {
      Array.prototype.forEach.call(root.querySelectorAll('.cx-option-v[data-allin]'), function (el) {
        var p = Number(el.getAttribute('data-allin')); if (p > 0) el.textContent = CX.money(allInSync(p));
      });
    });
  }

  function allInSync(price) {
    var r = window.ApaFees && ApaFees.allInSync ? ApaFees.allInSync('events', price) : null;
    return r ? r.total : price;
  }

  function subtotal() { var t = tiersOf(ev)[tierIdx]; return t.price * q; }

  /* The fee comes from the server for this exact amount. Until it
     answers the total says so, rather than showing a number that may
     be wrong. */
  function quote(CX, root) {
    var sub = subtotal(), seq = ++feeSeq;
    if (sub <= 0) { fee = 0; paint(CX, root); return; }
    fee = null; paint(CX, root);
    var t = tiersOf(ev)[tierIdx];
    var ask = window.ApaFees && ApaFees.bookingFee ? ApaFees.bookingFee('events', t.price, q) : CX.feeQuote(client(), 'events', sub);
    Promise.resolve(ask).then(function (f) {
      if (seq !== feeSeq) return;
      fee = f; paint(CX, root);
    });
  }

  function paint(CX, root) {
    var t = tiersOf(ev)[tierIdx], sub = subtotal(), free = sub <= 0;
    var lines = root.querySelector('#ceb-lines');
    lines.innerHTML = free
      ? '<div class="cx-line is-good"><span>' + CX.esc(t.name) + ' × ' + q + '</span><b>Free</b></div>'
      : '<div class="cx-line"><span>' + CX.esc(t.name) + ' × ' + q + '<small>' + (fee == null ? '…' : CX.money(Math.round((sub + fee) / q))) + ' each</small></span><b>' + (fee == null ? '…' : CX.money(sub + fee)) + '</b></div>';
    var tot = root.querySelector('#ceb-total');
    if (free) { tot.innerHTML = 'Free'; }
    else if (fee == null) { tot.innerHTML = '<span class="cx-cur">KES</span>…'; }
    else CX.countTo(tot, sub + fee);
    root.querySelector('#ceb-tk').innerHTML = free ? 'Free entry<small>You go on the door list</small>' : 'Total<small>Paid in full to hold your seats</small>';
    root.querySelector('#ceb-phone-wrap').hidden = free;
    var go = root.querySelector('#ceb-go');
    root.querySelector('#ceb-go-l').textContent = free ? 'Reserve my place' : (fee == null ? 'Checking total…' : 'Pay ' + CX.money(sub + fee));
    go.disabled = !free && fee == null;
  }

  async function submit(CX) {
    var root = h && h.sheet; if (!root) return;
    var $ = function (id) { return root.querySelector('#' + id); };
    var err = $('ceb-err'), go = $('ceb-go');
    var name = $('ceb-name').value.trim();
    var free = subtotal() <= 0;
    var phone = free ? null : CX.phone($('ceb-phone').value);
    if (!name) { $('ceb-name').setAttribute('aria-invalid', 'true'); err.textContent = 'Add the name for the door list.'; return; }
    if (!free && !phone) { $('ceb-phone').setAttribute('aria-invalid', 'true'); err.textContent = 'Enter the Safaricom number that will pay.'; return; }

    var session = await signedIn();
    if (!session) {
      try { sessionStorage.setItem('auth_next', location.href); } catch (x) {}
      err.innerHTML = 'Sign in to get tickets, so they live in your account. <a href="auth.html?next=' + encodeURIComponent(location.pathname + location.search) + '">Sign in</a>';
      return;
    }
    if (!free && !(window.ApatmentoPay && typeof window.ApatmentoPay.start === 'function')) {
      err.textContent = 'Payments are not available right now. Nothing was charged. Please try again in a moment.';
      return;
    }

    var t = tiersOf(ev)[tierIdx];
    var reference = 'EVENT-' + ev.id + '-' + Date.now();
    go.disabled = true; go.classList.add('is-busy');
    var ins = await client().from('event_tickets').insert({
      event_id: Number(ev.id), event_name: ev.title, organizer_name: ev.organiser_name || 'Cabana',
      tier_name: t.name, quantity: q, contact_phone: phone || null, guest_name: name.slice(0, 120),
      payment_reference: reference, payment_mode: 'full'
    }).select('payment_reference,grand_total,ticket_total,service_fee,status,confirmation_code').single();
    go.classList.remove('is-busy');

    if (ins.error || !ins.data) {
      go.disabled = false;
      var m = (ins.error && ins.error.message) || 'Please try again.';
      err.textContent = /remain/i.test(m) ? 'Those tickets just sold. Pick fewer or another tier.' :
                        /not available/i.test(m) ? 'This event is no longer on sale.' : 'Could not reserve: ' + m;
      return;
    }
    var row = ins.data;
    if (row.status === 'reserved' || Number(row.grand_total) === 0) {
      var out = { tone: 'settled', title: 'You\u2019re on the door list.', note: 'Show this code at the entrance. It is also in My Bookings.' };
      h.set(CX.outcomeHtml(out, { code: row.confirmation_code }) +
        '<a class="cx-pay" href="my-bookings.html"><span class="cx-pay-l">Open My Bookings</span></a>');
      h.hero('You\u2019re <em>in</em>.', ev.title, 'Free entry');
      return;
    }
    var title = ev.title, amount = Number(row.grand_total);
    h.close(true);
    window.ApatmentoPay.start({
      amount: amount, phone: phone, description: title + ' · ' + q + ' × ' + t.name,
      reference: row.payment_reference, service: 'events'
    });
  }

  function close() { if (h) h.close(); h = null; ev = null; }

  window.CabanaEventBook = { open: open, close: close };
})();
