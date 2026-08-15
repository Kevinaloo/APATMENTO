/* ═══════════════════════════════════════════════════════════════════
   CABANA · EVENT TICKETS
   ───────────────────────────────────────────────────────────────────
   Tier choice, quantity, phone, then a row in event_tickets and a
   hand-off to ApatmentoPay for the M-Pesa push.

   Face value means face value: SERVICE_FEE is 0 and the breakdown
   shows a total identical to the organiser's own price. The page
   promises "Cabana adds nothing to the ticket price" — this is the
   file where that promise is either kept or quietly broken, so it is
   kept literally. Any future booking fee belongs here as a visible
   line, never folded into the ticket price.

   Sold-out tiers cannot be selected, and quantity is clamped to what
   is genuinely left rather than to a round number.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SERVICE_FEE = 0;
  var MAX_PER_ORDER = 10;

  var sb = null, ev = null, tierIdx = 0;

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
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) {} }
    return [];
  }

  function normalisePhone(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    if (/^\+?254\d{9}$/.test(d)) return d.replace(/^\+/, '');
    if (/^0\d{9}$/.test(d))      return '254' + d.slice(1);
    if (/^\d{9}$/.test(d))       return '254' + d;
    return null;
  }

  function code() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  function ref() {
    return 'CE-' + Date.now().toString(36).toUpperCase() + '-' + code().slice(0, 4);
  }

  /* tiers, normalised — an event with none still sells at price_from */
  function tiersOf(e) {
    var t = arr(e.tiers).map(function (x, i) {
      var qty = x.qty == null ? null : Number(x.qty);
      var sold = Number(x.sold) || 0;
      return {
        name: x.name || ('Tier ' + (i + 1)),
        price: Number(x.price_kes) || 0,
        note: x.note || '',
        left: qty == null ? null : Math.max(0, qty - sold)
      };
    });
    if (!t.length) {
      t = [{ name: 'General admission', price: Number(e.price_from) || 0, note: '', left: null }];
    }
    return t;
  }

  function styles() {
    if ($('ceb-css')) return;
    var s = document.createElement('style');
    s.id = 'ceb-css';
    s.textContent =
      '#ceb{position:fixed;inset:0;z-index:900;display:none;}' +
      '#ceb.on{display:block;}' +
      '#ceb .v{position:absolute;inset:0;background:rgba(5,4,10,.8);backdrop-filter:blur(6px);}' +
      '#ceb .m{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'width:min(440px,calc(100% - 30px));max-height:88vh;overflow-y:auto;' +
        'background:#0B0918;color:#F4F2FF;border:1px solid rgba(255,255,255,.16);' +
        'border-radius:22px;box-shadow:0 34px 100px rgba(0,0,0,.7);padding:26px;}' +
      '#ceb h3{font-family:Geist,Inter,sans-serif;font-size:20px;font-weight:740;' +
        'letter-spacing:-.03em;margin-bottom:4px;}' +
      '#ceb .sub{font-size:12.5px;color:#6E688F;margin-bottom:20px;}' +
      '#ceb label{display:block;font-family:Geist,Inter,sans-serif;font-size:12.5px;' +
        'font-weight:700;margin:0 0 7px;}' +
      '#ceb input{width:100%;padding:12px 13px;border-radius:11px;background:rgba(255,255,255,.05);' +
        'border:1px solid rgba(255,255,255,.14);color:#F4F2FF;font-family:Inter,sans-serif;' +
        'font-size:14.5px;outline:none;margin-bottom:14px;}' +
      '#ceb input:focus{border-color:#8B5CFF;box-shadow:0 0 0 4px rgba(139,92,255,.18);}' +
      '#ceb input[aria-invalid="true"]{border-color:#FF2E93;}' +
      '#ceb .tier{display:flex;justify-content:space-between;align-items:center;gap:12px;' +
        'padding:13px 15px;border-radius:13px;border:1px solid rgba(255,255,255,.14);' +
        'background:rgba(255,255,255,.03);margin-bottom:8px;cursor:pointer;transition:.2s;}' +
      '#ceb .tier:hover{border-color:#8B5CFF;}' +
      '#ceb .tier.on{border-color:#C6FF4D;background:rgba(198,255,77,.09);}' +
      '#ceb .tier.gone{opacity:.4;cursor:not-allowed;}' +
      '#ceb .tier b{font-family:Geist,Inter,sans-serif;font-size:14px;font-weight:700;}' +
      '#ceb .tier .n{font-size:11.5px;color:#6E688F;margin-top:2px;}' +
      '#ceb .tier .p{font-family:Geist,monospace;font-size:15px;font-weight:700;' +
        'font-variant-numeric:tabular-nums;white-space:nowrap;}' +
      '#ceb .qty{display:flex;align-items:center;gap:12px;margin-bottom:16px;}' +
      '#ceb .qty button{width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.16);' +
        'background:rgba(255,255,255,.05);color:#F4F2FF;font-size:19px;cursor:pointer;line-height:1;}' +
      '#ceb .qty button:hover:not([disabled]){border-color:#8B5CFF;}' +
      '#ceb .qty button[disabled]{opacity:.35;cursor:not-allowed;}' +
      '#ceb .qty .q{font-family:Geist,monospace;font-size:20px;font-weight:700;min-width:34px;text-align:center;}' +
      '#ceb .bd{border-top:1px solid rgba(255,255,255,.1);margin-top:6px;padding-top:14px;}' +
      '#ceb .li{display:flex;justify-content:space-between;font-size:13.5px;color:#A9A4C9;margin-bottom:8px;}' +
      '#ceb .li.tot{font-family:Geist,monospace;font-size:17px;font-weight:700;color:#F4F2FF;' +
        'border-top:1px solid rgba(255,255,255,.1);padding-top:11px;margin-top:5px;}' +
      '#ceb .note{font-size:12px;color:#6E688F;line-height:1.5;margin-top:10px;}' +
      '#ceb .err{font-size:12.5px;color:#FF2E93;margin:-8px 0 12px;display:none;}' +
      '#ceb .err.on{display:block;}' +
      '#ceb .x{position:absolute;top:14px;right:14px;width:32px;height:32px;border:0;border-radius:9px;' +
        'background:rgba(255,255,255,.07);color:#F4F2FF;font-size:17px;cursor:pointer;line-height:1;}' +
      '#ceb .done{text-align:center;padding:14px 0;}' +
      '#ceb .code{font-family:Geist,monospace;font-size:30px;font-weight:700;letter-spacing:.16em;' +
        'color:#C6FF4D;margin:14px 0 6px;}';
    document.head.appendChild(s);
  }

  function open(e) {
    styles();
    ev = e; tierIdx = 0;
    var host = $('ceb');
    if (!host) { host = document.createElement('div'); host.id = 'ceb'; document.body.appendChild(host); }

    var ts = tiersOf(e);
    // default to the first tier that is not sold out
    for (var i = 0; i < ts.length; i++) { if (ts[i].left == null || ts[i].left > 0) { tierIdx = i; break; } }

    host.innerHTML =
      '<div class="v" data-close="1"></div>' +
      '<div class="m" role="dialog" aria-modal="true" aria-label="Get tickets">' +
        '<button class="x" type="button" data-close="1" aria-label="Close">&times;</button>' +
        '<h3>' + esc(e.title) + '</h3>' +
        '<div class="sub">' + esc([e.venue, e.city].filter(Boolean).join(', ')) + '</div>' +
        '<div id="ceb-tiers">' +
          ts.map(function (t, i) {
            var gone = t.left != null && t.left <= 0;
            return '<div class="tier' + (gone ? ' gone' : (i === tierIdx ? ' on' : '')) + '"' +
              (gone ? '' : ' data-t="' + i + '"') + '>' +
              '<div><b>' + esc(t.name) + '</b>' +
              (t.note ? '<div class="n">' + esc(t.note) + '</div>' : '') +
              (gone ? '<div class="n">Sold out</div>'
                    : (t.left != null && t.left <= 10 ? '<div class="n">' + t.left + ' left</div>' : '')) +
              '</div><div class="p">' + (t.price === 0 ? 'Free' : money(t.price)) + '</div></div>';
          }).join('') +
        '</div>' +
        '<label style="margin-top:16px;">How many</label>' +
        '<div class="qty">' +
          '<button type="button" id="ceb-minus" aria-label="One fewer">&minus;</button>' +
          '<span class="q" id="ceb-q">1</span>' +
          '<button type="button" id="ceb-plus" aria-label="One more">+</button>' +
        '</div>' +
        '<label for="ceb-name">Name on the ticket</label>' +
        '<input id="ceb-name" type="text" placeholder="For the door list"/>' +
        '<div class="err" id="ceb-e-name">Please give a name.</div>' +
        '<label for="ceb-phone">M-Pesa number</label>' +
        '<input id="ceb-phone" type="tel" inputmode="numeric" placeholder="07xx xxx xxx"/>' +
        '<div class="err" id="ceb-e-phone">Enter a valid Safaricom number.</div>' +
        '<div class="bd" id="ceb-bd"></div>' +
        '<button class="ev-btn ev-btn-primary" type="button" id="ceb-go" ' +
          'style="width:100%;justify-content:center;margin-top:18px;">Continue</button>' +
      '</div>';

    host.classList.add('on');
    document.body.style.overflow = 'hidden';

    Array.prototype.forEach.call(host.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
    Array.prototype.forEach.call(host.querySelectorAll('[data-t]'), function (b) {
      b.addEventListener('click', function () {
        tierIdx = Number(b.getAttribute('data-t'));
        Array.prototype.forEach.call(host.querySelectorAll('.tier'), function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        setQty(1);
        breakdown();
      });
    });
    $('ceb-minus').addEventListener('click', function () { setQty(qty() - 1); breakdown(); });
    $('ceb-plus').addEventListener('click', function () { setQty(qty() + 1); breakdown(); });
    $('ceb-go').addEventListener('click', submit);
    ['ceb-name', 'ceb-phone'].forEach(function (id) {
      var n = $(id);
      if (n) n.addEventListener('input', function () {
        var e2 = $('ceb-e-' + id.split('-')[1]);
        if (e2) e2.classList.remove('on');
        n.setAttribute('aria-invalid', 'false');
      });
    });
    setQty(1);
    breakdown();
  }

  function qty() { return Number($('ceb-q').textContent) || 1; }

  function ceiling() {
    var t = tiersOf(ev)[tierIdx];
    // Never let someone buy more than genuinely remain.
    if (t && t.left != null) return Math.max(1, Math.min(MAX_PER_ORDER, t.left));
    return MAX_PER_ORDER;
  }

  function setQty(n) {
    var top = ceiling();
    n = Math.max(1, Math.min(top, n));
    $('ceb-q').textContent = n;
    $('ceb-minus').disabled = n <= 1;
    $('ceb-plus').disabled = n >= top;
  }

  function breakdown() {
    var t = tiersOf(ev)[tierIdx];
    var n = qty();
    var total = t.price * n;
    var rows;
    if (total > 0) {
      rows = '<div class="li"><span>' + esc(t.name) + ' × ' + n + '</span><b>' + money(total) + '</b></div>';
      if (SERVICE_FEE > 0) rows += '<div class="li"><span>Booking fee</span><b>' + money(SERVICE_FEE) + '</b></div>';
      rows += '<div class="li tot"><span>Total</span><b>' + money(total + SERVICE_FEE) + '</b></div>';
      if (SERVICE_FEE === 0) rows += '<div class="note">Face value. Cabana adds nothing to the ticket price.</div>';
    } else {
      rows = '<div class="li tot"><span>Free entry</span><b>KES 0</b></div>' +
             '<div class="note">Reserving puts you on the door list. No payment is taken.</div>';
    }
    $('ceb-bd').innerHTML = rows;
    var go = $('ceb-go');
    if (go) go.textContent = total > 0 ? 'Pay with M-Pesa' : 'Reserve a place';
  }

  function submit() {
    var name = $('ceb-name').value.trim();
    var phone = normalisePhone($('ceb-phone').value);
    var bad = false;
    if (!name)  { $('ceb-e-name').classList.add('on');  $('ceb-name').setAttribute('aria-invalid','true');  bad = true; }
    if (!phone) { $('ceb-e-phone').classList.add('on'); $('ceb-phone').setAttribute('aria-invalid','true'); bad = true; }
    if (bad) return;

    var t = tiersOf(ev)[tierIdx];
    var n = qty();
    var total = t.price * n;
    var free = total === 0;
    var reference = ref();
    var confirm = code();

    var go = $('ceb-go');
    if (go) { go.disabled = true; go.textContent = 'Working…'; }

    var c = client();
    if (!c) { alert('Not connected. Please try again.'); if (go) go.disabled = false; return; }

    c.from('event_tickets').insert({
      event_id: Number(ev.id),
      event_name: ev.title,
      organizer_name: ev.organiser_name || 'Cabana',
      tier_name: t.name,
      quantity: n,
      contact_phone: phone,
      ticket_total: total,
      service_fee: SERVICE_FEE,
      grand_total: total + SERVICE_FEE,
      confirmation_code: confirm,
      payment_reference: reference,
      status: free ? 'reserved' : 'pending'
    }).then(function (r) {
      if (r && r.error) {
        if (go) { go.disabled = false; breakdown(); }
        alert('Could not reserve: ' + r.error.message);
        return;
      }
      if (free) { done(confirm, phone); return; }
      pay(total + SERVICE_FEE, phone, reference, confirm);
    }, function (e) {
      if (go) { go.disabled = false; breakdown(); }
      alert('Could not reserve: ' + ((e && e.message) || 'unknown error'));
    });
  }

  function done(confirm, phone) {
    var host = $('ceb');
    if (!host) return;
    host.querySelector('.m').innerHTML =
      '<button class="x" type="button" data-close="1" aria-label="Close">&times;</button>' +
      '<div class="done"><h3>You\u2019re on the list</h3>' +
      '<div class="code">' + esc(confirm) + '</div>' +
      '<div class="sub">Show this code at the door. We\u2019ve sent it to ' + esc(phone) + '.</div>' +
      '<button class="ev-btn ev-btn-primary" type="button" data-close="1" ' +
      'style="width:100%;justify-content:center;margin-top:18px;">Done</button></div>';
    Array.prototype.forEach.call(host.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
  }

  function pay(amount, phone, reference, confirm) {
    if (!window.ApatmentoPay || typeof window.ApatmentoPay.start !== 'function') {
      done(confirm, phone);
      return;
    }
    var title = ev ? ev.title : 'Cabana event';
    close();
    window.ApatmentoPay.start({
      amount: amount,
      phone: phone,
      description: title,
      reference: reference,
      onSuccess: function () {
        var c = client();
        if (c) c.from('event_tickets').update({ status: 'confirmed' })
                .eq('payment_reference', reference).then(function () {}, function () {});
      },
      onFailure: function () { /* row stays pending and can be retried */ }
    });
  }

  function close() {
    var h = $('ceb');
    if (h) { h.classList.remove('on'); h.innerHTML = ''; }
    document.body.style.overflow = '';
    ev = null;
  }

  window.CabanaEventBook = { open: open, close: close };
})();
