/* ═══════════════════════════════════════════════════════════════════
   CABANA · PARTNER BOOKING SHEET  v1.0
   Native in-Cabana booking for any partner with bookingMode:'native'.
   The guest never leaves Cabana. We take our fee. Partner gets paid.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';
  if (W.CabanaPartnerBook) return;

  /* ── styles ── */
  var css = D.createElement('style');
  css.textContent = [
    '#cpb-ov{position:fixed;inset:0;z-index:9700;background:rgba(10,10,20,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;opacity:0;visibility:hidden;transition:opacity .32s,visibility .32s}',
    '@media(min-width:640px){#cpb-ov{align-items:center;padding:24px}}',
    '#cpb-ov.open{opacity:1;visibility:visible}',
    '#cpb-box{width:100%;max-width:560px;background:#fff;border-radius:24px 24px 0 0;max-height:93vh;overflow-y:auto;transform:translateY(46px);opacity:0;transition:transform .46s cubic-bezier(.22,1,.36,1),opacity .36s;-webkit-overflow-scrolling:touch}',
    '@media(min-width:640px){#cpb-box{border-radius:24px;transform:translateY(18px) scale(.98)}}',
    '#cpb-ov.open #cpb-box{transform:none;opacity:1}',

    '.cpb-img{height:210px;position:relative;overflow:hidden;background:#EEF2F0}',
    '.cpb-img img{width:100%;height:100%;object-fit:cover}',
    '.cpb-img-g{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,10,20,.78) 0%,rgba(10,10,20,.05) 58%,transparent 82%)}',
    '.cpb-x{position:absolute;top:13px;right:13px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.94);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0F1117;transition:transform .2s;z-index:3}',
    '.cpb-x:hover{transform:scale(1.08) rotate(90deg)}',
    '.cpb-ptag{position:absolute;bottom:12px;left:14px;z-index:2;display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:100px;color:#fff;backdrop-filter:blur(8px)}',
    '.cpb-urg{position:absolute;bottom:12px;right:14px;z-index:2;font-size:10.5px;font-weight:700;padding:5px 11px;border-radius:100px;background:rgba(225,29,72,.92);color:#fff}',

    '.cpb-body{padding:20px 24px}',
    '@media(max-width:480px){.cpb-body{padding:16px 17px}}',
    '.cpb-eye{font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:7px}',
    '.cpb-title{font-size:clamp(18px,2.9vw,23px);font-weight:800;color:#0F1117;letter-spacing:-.03em;line-height:1.2;margin-bottom:12px}',
    '.cpb-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
    '.cpb-q{padding:10px 11px;border-radius:12px;background:#F6F7F9;border:1px solid rgba(15,17,23,.06)}',
    '.cpb-ql{font-size:8.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9499AD;margin-bottom:3px}',
    '.cpb-qv{font-size:12.5px;font-weight:700;color:#0F1117;letter-spacing:-.015em}',
    '.cpb-desc{font-size:13.5px;color:#5A5E70;line-height:1.7;margin-bottom:16px}',

    '.cpb-form{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}',
    '.cpb-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media(max-width:440px){.cpb-row{grid-template-columns:1fr}}',
    '.cpb-f{display:flex;flex-direction:column;gap:5px}',
    '.cpb-lb{font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#5A5E70}',
    '.cpb-in{padding:12px 13px;border-radius:12px;border:1.5px solid rgba(15,17,23,.11);background:#fff;font-family:inherit;font-size:14px;color:#0F1117;outline:none;transition:border-color .2s,box-shadow .2s;width:100%}',
    '.cpb-in:focus{border-color:var(--cpb-c,#00A082);box-shadow:0 0 0 3px rgba(0,160,130,.12)}',

    '.cpb-price{background:#F6F7F9;border-radius:14px;padding:13px 15px;margin-bottom:14px}',
    '.cpb-pr{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#5A5E70;margin-bottom:6px}',
    '.cpb-pr.tot{font-weight:800;color:#0F1117;font-size:15.5px;border-top:1px solid rgba(15,17,23,.09);padding-top:9px;margin-top:8px;margin-bottom:0}',
    '.cpb-feetag{font-size:9px;font-weight:800;padding:2px 7px;border-radius:100px;background:rgba(15,17,23,.06);color:#5A5E70;margin-left:5px}',
    '.cpb-note{font-size:11px;color:#9499AD;margin-top:9px;line-height:1.6}',
    '.cpb-payout{font-size:11px;font-weight:700;margin-top:5px}',

    '.cpb-cta{position:sticky;bottom:0;background:#fff;border-top:1px solid rgba(15,17,23,.08);padding:13px 24px 17px;margin:0 -24px -20px}',
    '@media(max-width:480px){.cpb-cta{margin:0 -17px -16px;padding:12px 17px 15px}}',
    '.cpb-btn{width:100%;padding:14px;border-radius:13px;border:none;cursor:pointer;color:#fff;font-family:inherit;font-weight:800;font-size:15px;letter-spacing:-.02em;transition:filter .22s,transform .22s}',
    '.cpb-btn:hover{filter:brightness(1.08);transform:translateY(-2px)}',
    '.cpb-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}',
    '.cpb-btn-note{font-size:10.5px;color:#9499AD;text-align:center;margin-top:8px;line-height:1.55}',
  ].join('\n');
  D.head.appendChild(css);

  /* ── DOM ──
     This file is included in <head> without defer on several pages, so
     document.body does not exist yet when it runs. Appending to it threw
     on every one of those pages, which took the rest of this module down
     with it — the booking sheet simply never worked there. Wait for the
     body instead of assuming it. */
  var ov = D.createElement('div');
  ov.id = 'cpb-ov';
  ov.innerHTML = '<div id="cpb-box"></div>';
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function mount() {
    if (ov.isConnected) return;
    (D.body || D.documentElement).appendChild(ov);
  }
  if (D.body) mount();
  else D.addEventListener('DOMContentLoaded', mount);

  var current = null;

  function close() {
    ov.classList.remove('open');
    D.body.style.overflow = '';
  }

  function money(n, cur) { return (cur || 'KES') + ' ' + (n || 0).toLocaleString(); }

  function priceBlock(t, guests) {
    var p = W.CabanaPartners.price(t, guests);
    if (p.isFree) {
      return '<div class="cpb-pr tot"><span>Tour price</span><span style="color:#00A082">Free</span></div>' +
             '<div class="cpb-note">Pay what you feel it was worth, directly to your guide on the day.</div>';
    }
    return (
      '<div class="cpb-pr"><span>' + money(p.perPerson, p.currency) + ' × ' + p.guests + ' guest' + (p.guests > 1 ? 's' : '') + '</span><span>' + money(p.base, p.currency) + '</span></div>' +
      (p.fee > 0 ? '<div class="cpb-pr"><span>Cabana service fee<span class="cpb-feetag">' + p.feePct + '%</span></span><span>' + money(p.fee, p.currency) + '</span></div>' : '') +
      '<div class="cpb-pr tot"><span>Total</span><span>' + money(p.total, p.currency) + '</span></div>' +
      '<div class="cpb-note">Pay <strong>' + money(p.deposit, p.currency) + '</strong> now to confirm. Balance of ' + money(p.balance, p.currency) + ' due before departure.</div>' +
      '<div class="cpb-payout" style="color:' + (t.partnerColour || '#00A082') + '">✓ ' + money(p.partnerPayout, p.currency) + ' goes directly to ' + t.partnerName + '</div>'
    );
  }

  function open(tourId) {
    var t = W.CabanaPartners.getAllTours().find(function (x) { return x.id === tourId; });
    if (!t) return;
    current = t;

    var urgent = t.spotsLeft > 0 && t.spotsLeft <= 4;
    var c = t.partnerColour || '#00A082';
    var a = t.partnerAccent || '#2DD4BF';
    var isFree = (t.price || 0) === 0;

    var guestOpts = '';
    var maxG = parseInt((t.group || '').replace(/\D/g, ''), 10) || 8;
    for (var i = 1; i <= Math.min(maxG, 12); i++) {
      guestOpts += '<option value="' + i + '">' + (i === 1 ? '1 person' : i + ' people') + '</option>';
    }

    /* Opening before the body existed would have left the overlay
       unmounted; mount on demand so a click always finds its box. */
    mount();
    var box = D.getElementById('cpb-box');
    if (!box) return;
    box.style.setProperty('--cpb-c', c);
    box.innerHTML =
      '<div class="cpb-img">' +
        '<img src="' + t.img + '" alt="' + t.name + '" loading="eager" onerror="this.style.display=\'none\'"/>' +
        '<div class="cpb-img-g"></div>' +
        '<button class="cpb-x" onclick="CabanaPartnerBook.close()" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<span class="cpb-ptag" style="background:' + c + 'E6">' + t.partnerName + '</span>' +
        (urgent ? '<span class="cpb-urg">' + t.spotsLeft + ' spot' + (t.spotsLeft > 1 ? 's' : '') + ' left</span>' : '') +
      '</div>' +
      '<div class="cpb-body">' +
        '<div class="cpb-eye" style="color:' + c + '">' + (t.loc || '') + ' · ' + (t.area || '') + '</div>' +
        '<div class="cpb-title">' + t.name + '</div>' +
        '<div class="cpb-quick">' +
          '<div class="cpb-q"><div class="cpb-ql">Duration</div><div class="cpb-qv">' + (t.dur || ', ') + '</div></div>' +
          '<div class="cpb-q"><div class="cpb-ql">Group</div><div class="cpb-qv">' + (t.group || ', ') + '</div></div>' +
          '<div class="cpb-q"><div class="cpb-ql">Rating</div><div class="cpb-qv" style="color:#F59E0B">★ ' + (t.rating || ', ') + '</div></div>' +
        '</div>' +
        '<div class="cpb-desc">' + (t.desc || '') + '</div>' +
        '<div class="cpb-form">' +
          '<div class="cpb-row">' +
            '<div class="cpb-f"><label class="cpb-lb">Full name</label><input class="cpb-in" id="cpb-name" type="text" placeholder="Your name" autocomplete="name"/></div>' +
            '<div class="cpb-f"><label class="cpb-lb">Phone / WhatsApp</label><input class="cpb-in" id="cpb-phone" type="tel" placeholder="+254 7…" autocomplete="tel"/></div>' +
          '</div>' +
          '<div class="cpb-row">' +
            '<div class="cpb-f"><label class="cpb-lb">Guests</label><select class="cpb-in" id="cpb-guests" onchange="CabanaPartnerBook.refresh()">' + guestOpts + '</select></div>' +
            '<div class="cpb-f"><label class="cpb-lb">Travel date</label><input class="cpb-in" id="cpb-date" type="date" value="' + (t.departure || '') + '" min="' + new Date().toISOString().slice(0, 10) + '"/></div>' +
          '</div>' +
          '<div class="cpb-f"><label class="cpb-lb">Requests (optional)</label><input class="cpb-in" id="cpb-notes" type="text" placeholder="Dietary needs, pick-up point…"/></div>' +
        '</div>' +
        '<div class="cpb-price" id="cpb-price">' + priceBlock(t, 1) + '</div>' +
        '<div class="cpb-cta">' +
          '<button class="cpb-btn" id="cpb-go" style="background:linear-gradient(135deg,' + c + ',' + a + ')" onclick="CabanaPartnerBook.submit()">' +
            (isFree ? 'Reserve my spot' : 'Confirm & pay deposit') +
          '</button>' +
          '<div class="cpb-btn-note">Booked through Cabana · operated by ' + t.partnerName + '</div>' +
        '</div>' +
      '</div>';

    ov.classList.add('open');
    D.body.style.overflow = 'hidden';
  }

  function refresh() {
    if (!current) return;
    var g = parseInt((D.getElementById('cpb-guests') || {}).value || '1', 10);
    var el = D.getElementById('cpb-price');
    if (el) el.innerHTML = priceBlock(current, g);
  }

  function submit() {
    if (!current) return;
    var name  = (D.getElementById('cpb-name')  || {}).value || '';
    var phone = (D.getElementById('cpb-phone') || {}).value || '';
    var guests= parseInt((D.getElementById('cpb-guests')|| {}).value || '1', 10);
    var date  = (D.getElementById('cpb-date')  || {}).value || '';
    var notes = (D.getElementById('cpb-notes') || {}).value || '';

    if (!name.trim())  { alert('Please enter your name'); return; }
    if (!phone.trim()) { alert('Please enter your phone number'); return; }

    var btn = D.getElementById('cpb-go');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

    var p = W.CabanaPartners.price(current, guests);
    var ref = 'CB-' + Date.now();

    function finalise(paymentRef, type) {
      try {
        var b = W.CabanaPartners.book(current.id, {
          name: name.trim(), phone: phone.trim(), guests: guests,
          date: date || 'Flexible', notes: notes,
          paymentRef: paymentRef, paymentType: type,
        });
        close();
        var msg = '✅ Booked · ' + b.tour_name + ' · Ref ' + b.ref;
        if (typeof W.showToast === 'function') W.showToast(msg, 5200);
        else alert(msg + '\n\n' + b.partner_name + ' will contact you shortly.');
      } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
        alert('Could not complete booking: ' + e.message);
      }
    }

    /* Free tours confirm instantly */
    if (p.isFree) { finalise('FREE-' + ref, 'full'); return; }

    /* Paid → Cabana's M-Pesa STK push */
    if (W.ApatmentoPay && typeof W.ApatmentoPay.start === 'function') {
      W.ApatmentoPay.start({
        amount: p.deposit,
        phone: phone.trim(),
        reference: ref,
        table: 'partner_bookings',
        description: current.name + ', ' + current.partnerName + ' via Cabana',
        onSuccess: function () { finalise(ref, 'deposit'); },
        onFailure: function () { if (btn) { btn.disabled = false; btn.textContent = 'Try again'; } },
      });
    } else {
      /* No payment module, still record, settle offline */
      finalise(ref, 'pending');
    }
  }

  W.CabanaPartnerBook = { open: open, close: close, refresh: refresh, submit: submit };

}(window, document));
