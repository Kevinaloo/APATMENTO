/* ═══════════════════════════════════════════════════════════════════
   CABANA ROOMS · THE PASS
   ───────────────────────────────────────────────────────────────────
   KES 100 (about $1) opens every room on Cabana for 30 days: message
   any host, book viewings, move in. Renewing early stacks onto the time
   already bought.

     CabanaRoomsPass.status()          → { active, ends_at, days_left, price_kes, ... }
     CabanaRoomsPass.require(room?)    → Promise<boolean>; opens the pass sheet if needed
     CabanaRoomsPass.open(room?)       → the membership sheet
     CabanaRoomsPass.ribbon(el)        → paints the page ribbon into el

   The gate that matters is in Postgres (cabana_chat_start refuses a room
   conversation without an active pass). This file is the doorway, not
   the lock. Price and length come from rooms_pass_status(), never from
   a constant here.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaRoomsPass) return;
  var doc = global.document;
  var ST = null, at = 0, listeners = [];

  function sb() {
    try { return (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || null; } catch (e) { return null; }
  }
  function kit(cb) {
    if (global.CabanaCheckout) return cb(global.CabanaCheckout);
    var s = doc.querySelector('script[src*="cabana-checkout.js"]');
    if (!s) { s = doc.createElement('script'); s.src = '/cabana-checkout.js'; doc.head.appendChild(s); }
    s.addEventListener('load', function () { cb(global.CabanaCheckout); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function status(force) {
    if (!force && ST && Date.now() - at < 20000) return Promise.resolve(ST);
    var c = sb();
    if (!c) return Promise.resolve(ST || { active: false, signed_in: false, price_kes: 100, price_usd: 1, days: 30 });
    return c.rpc('rooms_pass_status').then(function (r) {
      if (r && !r.error && r.data) { ST = r.data; at = Date.now(); listeners.forEach(function (f) { try { f(ST); } catch (e) {} }); }
      return ST || { active: false, price_kes: 100, price_usd: 1, days: 30 };
    }, function () { return ST || { active: false, price_kes: 100, price_usd: 1, days: 30 }; });
  }
  function onChange(f) { listeners.push(f); if (ST) f(ST); }

  function require(room) {
    return status().then(function (s) {
      if (s.active) return true;
      open(room);
      return false;
    });
  }

  /* ── the membership card ─────────────────────────────────────────── */
  var CSS =
    '.rp-card{position:relative;isolation:isolate;overflow:hidden;border-radius:26px;padding:22px 22px 20px;color:#F3F1FF;' +
      'background:radial-gradient(120% 120% at 100% 0%,#FF8A5B 0%,#C2417E 28%,#3D5AFE 62%,#0C0B1A 100%);' +
      'box-shadow:0 30px 60px -30px rgba(61,90,254,.8),inset 0 1px 0 rgba(255,255,255,.3);transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.9,.2,1)}' +
    '.rp-card::before{content:"";position:absolute;inset:-50%;z-index:-1;background:conic-gradient(from 210deg,transparent 0 60%,rgba(255,255,255,.28) 70%,transparent 80%);animation:rpSheen 6s linear infinite}' +
    '.rp-card::after{content:"";position:absolute;inset:0;z-index:-1;background-image:radial-gradient(rgba(255,255,255,.14) 1px,transparent 1px);background-size:14px 14px;mask-image:linear-gradient(120deg,#000 10%,transparent 60%);-webkit-mask-image:linear-gradient(120deg,#000 10%,transparent 60%)}' +
    '@keyframes rpSheen{to{transform:rotate(360deg)}}' +
    '.rp-top{display:flex;justify-content:space-between;align-items:center;font:600 10.5px/1 "CX Mono",ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;opacity:.86}' +
    '.rp-chip{width:38px;height:28px;border-radius:7px;background:linear-gradient(135deg,#FFE3A6,#C79A45);box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}' +
    '.rp-price{margin-top:22px;display:flex;align-items:baseline;gap:10px;font-family:"CX Unbounded","Arial Black",sans-serif}' +
    '.rp-price b{font-size:clamp(40px,11vw,54px);font-weight:600;letter-spacing:-.05em;line-height:.9}' +
    '.rp-price span{font-size:13px;opacity:.75;letter-spacing:0}' +
    '.rp-sub{margin-top:8px;font:500 13.5px/1.45 "CX Jakarta",system-ui,sans-serif;opacity:.86;max-width:30ch}' +
    '.rp-foot{margin-top:18px;display:flex;justify-content:space-between;align-items:flex-end;font:600 11px/1.2 "CX Mono",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.8}' +
    '.rp-keys{display:flex;gap:4px}.rp-keys i{width:5px;height:16px;border-radius:2px;background:rgba(255,255,255,.7);animation:rpKey 1.8s ease-in-out infinite}' +
    '.rp-keys i:nth-child(2){animation-delay:.15s}.rp-keys i:nth-child(3){animation-delay:.3s}' +
    '@keyframes rpKey{50%{transform:scaleY(.5);opacity:.4}}' +
    '.rp-perks{display:grid;gap:10px}' +
    '.rp-perk{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:var(--cx-paper-2,#EEECFB)}' +
    '.rp-perk i{flex:none;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#3D5AFE;color:#fff;font-style:normal;font:700 13px "CX Unbounded",sans-serif}' +
    '.rp-perk b{display:block;font:650 14px "CX Jakarta",system-ui,sans-serif}' +
    '.rp-perk small{display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--cx-ink-3,#8C89A8)}' +
    '.rp-math{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 14px;border-radius:16px;border:1.5px dashed rgba(61,90,254,.28);font:500 12.5px/1.45 "CX Jakarta",system-ui,sans-serif;color:var(--cx-ink-2,#4E4B6B)}' +
    '.rp-math b{font:600 13px "CX Unbounded",sans-serif;color:#3D5AFE;white-space:nowrap}' +
    '.rp-ribbon{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;margin:0 0 14px;color:#F3F1FF;' +
      'background:linear-gradient(115deg,#0C0B1A 0%,#2A2470 45%,#3D5AFE 80%,#C2417E 100%);box-shadow:0 18px 40px -24px rgba(61,90,254,.9);cursor:pointer;border:0;width:100%;text-align:left;font:inherit}' +
    '.rp-ribbon::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);transform:translateX(-100%);animation:rpSweep 3.6s ease-in-out infinite}' +
    '@keyframes rpSweep{60%,100%{transform:translateX(100%)}}' +
    '.rp-ribbon .k{flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.14)}' +
    '.rp-ribbon .k svg{width:18px;height:18px}' +
    '.rp-ribbon .t{flex:1;min-width:0}.rp-ribbon .t b{display:block;font:600 14px/1.25 "CX Unbounded","Arial Black",sans-serif;letter-spacing:-.02em}' +
    '.rp-ribbon .t small{display:block;margin-top:3px;font:500 12px/1.35 "CX Jakarta",system-ui,sans-serif;opacity:.8}' +
    '.rp-ribbon .go{flex:none;padding:9px 13px;border-radius:99px;background:#fff;color:#15132A;font:700 12.5px "CX Jakarta",system-ui,sans-serif;white-space:nowrap}' +
    '.rp-ribbon.is-on{background:linear-gradient(115deg,#0C0B1A,#1D3A2E 60%,#16A06B);cursor:default}' +
    '.rp-ribbon.is-on::after{display:none}' +
    '@media(prefers-reduced-motion:reduce){.rp-card::before,.rp-keys i,.rp-ribbon::after{animation:none}}';
  function css() {
    if (doc.getElementById('rp-css')) return;
    var s = doc.createElement('style'); s.id = 'rp-css'; s.textContent = CSS; doc.head.appendChild(s);
  }
  var KEY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.2"/><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2"/></svg>';

  function money(n) { return 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE'); }

  function open(room) {
    css();
    kit(function (CX) {
      status(true).then(function (s) {
        var price = Number(s.price_kes) || 100, days = Number(s.days) || 30;
        if (s.active) {
          var h0 = CX.sheet({ vibe: 'rooms', kicker: 'Cabana Rooms', titleHtml: 'You’re <em>in</em>.', sub: 'Every room is open to you.',
            body: card(s, price, days, true) +
              '<div class="cx-note is-ok">' + CX.icon('check') + '<span>Your pass runs until <b>' + esc(CX.day(s.ends_at, { day: 'numeric', month: 'long' })) + '</b>. Renew any time and the new month is added on top.</span></div>' +
              '<button class="cx-pay" type="button" data-rp-close><span class="cx-pay-l">Back to rooms</span></button>' +
              '<button class="cx-ghost" type="button" data-rp-renew>Add another month · ' + esc(money(price)) + '</button>' });
          h0.sheet.querySelector('[data-rp-close]').onclick = function () { h0.close(); };
          h0.sheet.querySelector('[data-rp-renew]').onclick = function () { h0.close(true); payFlow(CX, s, room, true); };
          return;
        }
        payFlow(CX, s, room, false);
      });
    });
  }

  function card(s, price, days, on) {
    return '<div class="rp-card" aria-hidden="true"><div class="rp-top"><span>Cabana Rooms · Pass</span><span class="rp-chip"></span></div>' +
      '<div class="rp-price"><b>' + (on ? (s.days_left || days) : esc(String(price))) + '</b><span>' + (on ? 'days left' : 'KES · ' + days + ' days') + '</span></div>' +
      '<div class="rp-sub">' + (on ? 'Message any host and book viewings, as often as you like.' : 'Every room on Cabana. Every host. One month.') + '</div>' +
      '<div class="rp-foot"><span>' + (on ? 'Active' : 'About $' + esc(String(s.price_usd || 1))) + '</span><span class="rp-keys"><i></i><i></i><i></i></span></div></div>';
  }

  function payFlow(CX, s, room, renew) {
    var price = Number(s.price_kes) || 100, days = Number(s.days) || 30;
    var rent = room && Number(room.price) > 0 ? Number(room.price) : 0;
    var saved = ''; try { saved = global.localStorage.getItem('rp:phone') || ''; } catch (e) {}
    var body =
      card(s, price, days, false) +
      '<div class="rp-perks">' +
        '<div class="rp-perk"><i>1</i><div><b>Message every host</b><small>Ask about bills, flatmates and move-in dates, in writing, on Cabana.</small></div></div>' +
        '<div class="rp-perk"><i>2</i><div><b>Book viewings</b><small>See the room in person or on a live video walk-through before any money moves.</small></div></div>' +
        '<div class="rp-perk"><i>3</i><div><b>First to new rooms</b><small>Rooms that match your search reach you the moment they are listed.</small></div></div>' +
      '</div>' +
      (rent ? '<div class="rp-math"><span>Less than a cup of coffee, against a room at ' + esc(money(rent)) + ' a month.</span><b>' + esc((price / rent * 100).toFixed(2)) + '%</b></div>' : '') +
      '<div><label class="cx-label" for="rp-phone">M-Pesa number</label><div class="cx-phone"><span>+254</span><input id="rp-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="7XX XXX XXX" value="' + esc(saved) + '"/></div></div>' +
      '<div class="cx-err" id="rp-err" role="alert"></div>' +
      '<button class="cx-pay" type="button" id="rp-go"><span class="cx-pay-l">' + (renew ? 'Add 30 days · ' : 'Unlock every room · ') + esc(money(price)) + '</span></button>' +
      '<div class="cx-assure"><span>' + CX.icon('shield') + 'One payment, no auto-renew</span><span>' + CX.icon('clock') + days + ' days from today</span></div>';
    var h = CX.sheet({ vibe: 'rooms', kicker: renew ? 'Renew your pass' : 'Cabana Rooms Pass',
      titleHtml: renew ? 'Another <em>month</em>.' : 'Find your <em>people</em>.',
      sub: renew ? 'Added on top of the days you still have.' : (room && room.title ? 'Unlock ' + room.title + ' and every other room on Cabana.' : 'One month with every room on Cabana.'),
      body: body, label: 'Cabana Rooms Pass' });
    var root = h.sheet, err = root.querySelector('#rp-err'), go = root.querySelector('#rp-go');
    root.querySelector('#rp-phone').addEventListener('input', function () { err.textContent = ''; });
    go.onclick = function () {
      var raw = root.querySelector('#rp-phone').value;
      var phone = CX.phone(raw);
      if (!phone) { err.textContent = 'Enter the Safaricom number that will pay.'; return; }
      var c = sb();
      if (!c) { err.textContent = 'Not connected. Please try again.'; return; }
      go.disabled = true; go.classList.add('is-busy');
      c.auth.getSession().then(function (r) {
        if (!(r && r.data && r.data.session)) {
          try { global.sessionStorage.setItem('auth_next', global.location.href); } catch (e) {}
          global.location.href = '/auth.html?next=' + encodeURIComponent(global.location.pathname + '?pass=1');
          return;
        }
        return c.rpc('rooms_pass_start').then(function (x) {
          go.disabled = false; go.classList.remove('is-busy');
          if (x.error || !x.data) { err.textContent = (x.error && x.error.message) || 'Could not start. Please try again.'; return; }
          if (!(global.ApatmentoPay && global.ApatmentoPay.start)) { err.textContent = 'Payments are loading. Try again in a moment.'; return; }
          try { global.localStorage.setItem('rp:phone', raw.trim()); } catch (e) {}
          h.close(true);
          global.ApatmentoPay.start({
            amount: Number(x.data.amount), phone: phone, reference: x.data.reference, service: 'rooms',
            description: 'Cabana Rooms Pass · ' + (Number(x.data.days) || days) + ' days',
            trip: { property: 'Cabana Rooms Pass', whenText: (Number(x.data.days) || days) + ' days, every room' },
            onSuccess: function () { status(true); },
            onFailure: function () { status(true); }
          });
        });
      }).catch(function (e) { go.disabled = false; go.classList.remove('is-busy'); err.textContent = (e && e.message) || 'Please try again.'; });
    };
  }

  /* A slim ribbon for the top of the rooms page: an invitation when
     locked, a countdown when unlocked. */
  function ribbon(el) {
    if (!el) return;
    css();
    function paint(s) {
      s = s || {};
      if (s.active) {
        el.innerHTML = '<div class="rp-ribbon is-on" role="status"><span class="k">' + KEY + '</span><span class="t"><b>Rooms Pass · ' + (s.days_left || '') + ' days left</b><small>Every room is open to you. Message hosts and book viewings.</small></span></div>';
        return;
      }
      el.innerHTML = '<button type="button" class="rp-ribbon" data-rp-open><span class="k">' + KEY + '</span><span class="t"><b>Unlock every room · KES ' + esc(String(s.price_kes || 100)) + '</b><small>' + esc(String(s.days || 30)) + ' days to message any host and book viewings. About $1.</small></span><span class="go">Unlock</span></button>';
      el.querySelector('[data-rp-open]').onclick = function () { open(null); };
    }
    onChange(paint);
    status().then(paint);
  }

  global.CabanaRoomsPass = { status: status, require: require, open: open, ribbon: ribbon, onChange: onChange };

  if (/[?&]pass=1\b/.test(global.location.search)) {
    global.addEventListener('load', function () { setTimeout(function () { open(null); }, 400); });
  }
})(window);
