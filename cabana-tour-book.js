/* ═══════════════════════════════════════════════════════════════════
   CABANA · TOUR BOOKING
   ───────────────────────────────────────────────────────────────────
   Collects date, party size and a phone number, writes a row to
   tour_bookings, then hands off to ApatmentoPay for the M-Pesa push.

   On the money: Cabana promises no commission on the tour price, and
   this file keeps that promise literally — service_fee is 0 and the
   guest is shown a breakdown where the total equals the operator's
   own fare. If a booking fee is introduced later it belongs in
   SERVICE_FEE below, as a visible line, never as a silent margin on
   the fare the operator set.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SERVICE_FEE = 0;

  var sb = null, tour = null;

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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return 'KES ' + (Number(n) || 0).toLocaleString('en-KE'); }
  function $(id) { return document.getElementById(id); }

  /* A Kenyan mobile in any of the forms people actually type. */
  function normalisePhone(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    if (/^\+?254\d{9}$/.test(d)) return d.replace(/^\+/, '');
    if (/^0\d{9}$/.test(d))      return '254' + d.slice(1);
    if (/^\d{9}$/.test(d))       return '254' + d;
    return null;
  }

  function ref() {
    return 'CT-' + Date.now().toString(36).toUpperCase() +
           '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /* ── the sheet ───────────────────────────────────────────────────── */

  function ensureHost() {
    var h = $('ctb');
    if (h) return h;
    h = document.createElement('div');
    h.id = 'ctb';
    document.body.appendChild(h);

    var css = document.createElement('style');
    css.textContent =
      '#ctb{position:fixed;inset:0;z-index:900;display:none;}' +
      '#ctb.on{display:block;}' +
      '#ctb .v{position:absolute;inset:0;background:rgba(6,43,49,.55);backdrop-filter:blur(5px);}' +
      '#ctb .m{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'width:min(440px,calc(100% - 32px));max-height:88vh;overflow-y:auto;background:#fff;' +
        'border-radius:22px;box-shadow:0 30px 90px rgba(6,43,49,.35);padding:26px;}' +
      '#ctb h3{font-family:Geist,Inter,sans-serif;font-size:20px;font-weight:640;' +
        'letter-spacing:-.03em;margin-bottom:5px;color:#0A0A14;}' +
      '#ctb .sub{font-size:13px;color:#8E90AD;margin-bottom:20px;}' +
      '#ctb label{display:block;font-family:Geist,Inter,sans-serif;font-size:12.5px;' +
        'font-weight:600;color:#0A0A14;margin:0 0 6px;}' +
      '#ctb input{width:100%;padding:11px 13px;border-radius:11px;border:1px solid rgba(10,10,20,.14);' +
        'font-family:Inter,sans-serif;font-size:14.5px;outline:none;margin-bottom:14px;}' +
      '#ctb input:focus{border-color:#2DD4BF;box-shadow:0 0 0 4px rgba(45,212,191,.14);}' +
      '#ctb input[aria-invalid="true"]{border-color:#E0522C;}' +
      '#ctb .r{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
      '#ctb .bd{border-top:1px solid rgba(10,10,20,.08);margin-top:6px;padding-top:14px;}' +
      '#ctb .li{display:flex;justify-content:space-between;font-size:13.5px;color:#4A4C66;margin-bottom:8px;}' +
      '#ctb .li.tot{font-family:Geist,monospace;font-size:16px;font-weight:600;color:#0A0A14;' +
        'border-top:1px solid rgba(10,10,20,.08);padding-top:10px;margin-top:4px;}' +
      '#ctb .li b{font-variant-numeric:tabular-nums;}' +
      '#ctb .note{font-size:12px;color:#8E90AD;line-height:1.5;margin-top:10px;}' +
      '#ctb .err{font-size:12.5px;color:#C2410C;margin:-8px 0 12px;display:none;}' +
      '#ctb .err.on{display:block;}' +
      '#ctb .acts{display:flex;gap:10px;margin-top:18px;}' +
      '#ctb .x{position:absolute;top:14px;right:14px;width:32px;height:32px;border:0;border-radius:9px;' +
        'background:rgba(10,10,20,.05);cursor:pointer;color:#4A4C66;font-size:17px;line-height:1;}';
    document.head.appendChild(css);
    return h;
  }

  function open(t) {
    tour = t;
    var host = ensureHost();
    var per = Number(t.price_kes) || 0;
    var free = per === 0;
    var today = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    var fixed = t.schedule_type === 'fixed' && t.next_departure;

    host.innerHTML =
      '<div class="v" data-close="1"></div>' +
      '<div class="m" role="dialog" aria-modal="true" aria-label="Book this tour">' +
        '<button class="x" type="button" data-close="1" aria-label="Close">&times;</button>' +
        '<h3>' + esc(t.title) + '</h3>' +
        '<div class="sub">' + (t.operator_kind === 'cabana' ? 'Run by Cabana' :
          'By ' + esc(t.operator_name || 'a local operator')) + '</div>' +

        '<div class="r">' +
          '<div><label for="ctb-date">Date</label>' +
            '<input id="ctb-date" type="date" min="' + today + '" value="' +
              (fixed ? esc(t.next_departure) : '') + '"' + (fixed ? ' readonly' : '') + '/></div>' +
          '<div><label for="ctb-n">People</label>' +
            '<input id="ctb-n" type="number" min="' + (t.group_min || 1) + '" max="' +
              (t.group_max || 20) + '" value="' + (t.group_min || 1) + '"/></div>' +
        '</div>' +
        '<div class="err" id="ctb-e-date">Choose a date for the tour.</div>' +

        '<label for="ctb-phone">M-Pesa number</label>' +
        '<input id="ctb-phone" type="tel" inputmode="numeric" placeholder="07xx xxx xxx"/>' +
        '<div class="err" id="ctb-e-phone">Enter a valid Safaricom number.</div>' +

        '<label for="ctb-name">Your name</label>' +
        '<input id="ctb-name" type="text" placeholder="So the guide knows who to expect"/>' +
        '<div class="err" id="ctb-e-name">Please give a name for the booking.</div>' +

        '<div class="bd" id="ctb-bd"></div>' +

        '<div class="acts">' +
          '<button class="ct-btn ct-btn-primary" type="button" id="ctb-go" style="flex:1;justify-content:center;">' +
            (free ? 'Reserve' : 'Pay with M-Pesa') + '</button>' +
        '</div>' +
      '</div>';

    host.classList.add('on');
    document.body.style.overflow = 'hidden';

    Array.prototype.forEach.call(host.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
    $('ctb-n').addEventListener('input', breakdown);
    $('ctb-go').addEventListener('click', submit);
    ['ctb-date','ctb-phone','ctb-name'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () {
        var e = $('ctb-e-' + id.split('-')[1]);
        if (e) e.classList.remove('on');
        el.setAttribute('aria-invalid', 'false');
      });
    });
    breakdown();
  }

  function breakdown() {
    if (!tour) return;
    var per = Number(tour.price_kes) || 0;
    var n = Math.max(1, Number($('ctb-n').value) || 1);
    var group = tour.price_basis === 'per_group';
    var total = group ? per : per * n;
    var pct = Number(tour.deposit_pct) || 0;
    var due = pct > 0 && total > 0 ? Math.round(total * pct / 100) : total;

    var rows = '';
    if (total > 0) {
      rows += '<div class="li"><span>' + money(per) + (group ? ' per group' : ' × ' + n + ' people') +
              '</span><b>' + money(total) + '</b></div>';
      if (SERVICE_FEE > 0) {
        rows += '<div class="li"><span>Cabana booking fee</span><b>' + money(SERVICE_FEE) + '</b></div>';
      }
      rows += '<div class="li tot"><span>' + (due < total ? 'Pay now (' + pct + '% deposit)' : 'Total') +
              '</span><b>' + money(due + SERVICE_FEE) + '</b></div>';
      if (due < total) {
        rows += '<div class="note">Balance of ' + money(total - due) +
                ' is settled with the operator before you travel.</div>';
      }
      if (SERVICE_FEE === 0) {
        rows += '<div class="note">Cabana takes no commission — the operator receives the full fare.</div>';
      }
    } else {
      rows = '<div class="li tot"><span>Free tour</span><b>KES 0</b></div>' +
             '<div class="note">Reserving holds your place. No payment is taken.</div>';
    }
    $('ctb-bd').innerHTML = rows;
  }

  function close() {
    var h = $('ctb');
    if (h) { h.classList.remove('on'); h.innerHTML = ''; }
    document.body.style.overflow = '';
    tour = null;
  }

  /* ── submit ──────────────────────────────────────────────────────── */

  function submit() {
    if (!tour) return;
    var date = $('ctb-date').value;
    var name = $('ctb-name').value.trim();
    var raw  = $('ctb-phone').value;
    var per  = Number(tour.price_kes) || 0;
    var free = per === 0;
    var n    = Math.max(1, Number($('ctb-n').value) || 1);
    var bad  = false;

    if (!date) { $('ctb-e-date').classList.add('on'); $('ctb-date').setAttribute('aria-invalid','true'); bad = true; }
    if (!name) { $('ctb-e-name').classList.add('on'); $('ctb-name').setAttribute('aria-invalid','true'); bad = true; }

    var phone = normalisePhone(raw);
    // A free tour still needs a contact number, but it is not a payment number.
    if (!phone) { $('ctb-e-phone').classList.add('on'); $('ctb-phone').setAttribute('aria-invalid','true'); bad = true; }
    if (bad) return;

    var group = tour.price_basis === 'per_group';
    var total = group ? per : per * n;
    var pct   = Number(tour.deposit_pct) || 0;
    var due   = pct > 0 && total > 0 ? Math.round(total * pct / 100) : total;
    var payNow = due + SERVICE_FEE;
    var reference = ref();

    var btn = $('ctb-go');
    if (btn) { btn.disabled = true; btn.textContent = 'Working…'; }

    var c = client();
    if (!c) { alert('Not connected. Please try again.'); if (btn) { btn.disabled = false; } return; }

    c.from('tour_bookings').insert({
      tour_id: Number(tour.id),
      tour_name: tour.title,
      operator_name: tour.operator_name || 'Cabana',
      tour_date: date,
      num_people: n,
      contact_phone: phone,
      tour_total: total,
      service_fee: SERVICE_FEE,
      grand_total: total + SERVICE_FEE,
      payment_reference: reference,
      status: free ? 'reserved' : 'pending'
    }).then(function (r) {
      if (r && r.error) {
        if (btn) { btn.disabled = false; btn.textContent = free ? 'Reserve' : 'Pay with M-Pesa'; }
        alert('Could not create the booking: ' + r.error.message);
        return;
      }
      if (free) {
        close();
        alert('Reserved. The operator will confirm with you on ' + phone + '.');
        return;
      }
      pay(payNow, phone, reference);
    }, function (e) {
      if (btn) { btn.disabled = false; btn.textContent = free ? 'Reserve' : 'Pay with M-Pesa'; }
      alert('Could not create the booking: ' + ((e && e.message) || 'unknown error'));
    });
  }

  function pay(amount, phone, reference) {
    if (!window.ApatmentoPay || typeof window.ApatmentoPay.start !== 'function') {
      close();
      alert('Booking saved as ' + reference + '. We will contact you on ' + phone +
            ' to take payment.');
      return;
    }
    var title = tour ? tour.title : 'Cabana tour';
    close();
    window.ApatmentoPay.start({
      amount: amount,
      phone: phone,
      description: title,
      reference: reference,
      onSuccess: function () {
        var c = client();
        if (c) c.from('tour_bookings').update({ status: 'confirmed' })
                .eq('payment_reference', reference).then(function () {}, function () {});
      },
      onFailure: function () { /* the row stays 'pending' and can be retried */ }
    });
  }

  window.CabanaTourBook = { open: open, close: close };
})();
