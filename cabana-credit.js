/* ══════════════════════════════════════════════════════════════
   CABANA · WELCOME CREDIT
   cabana-credit.js

   Every new account opens with 200 credits. One credit is one
   shilling off the total, on everything except flights.

   THE ARGUMENT THIS FILE MAKES
   ────────────────────────────
   The offer is not persuasive because it is loud. It is persuasive
   because of one piece of arithmetic: our booking fee starts at
   KES 300, and 200 of it is already covered. So the module shows the
   sum. A three-line ledger that resolves to KES 100 does more than
   any amount of adjective, and it has the advantage of being true.

   Which is why there are no exclamation marks, no confetti, no
   "🚀 Unlock amazing rewards", and no countdown pretending the offer
   expires. Those all read as a business that does not believe its own
   number. The animation budget goes on one thing instead: the number
   itself, counted up and settled, once.

   MOUNTING
     <div data-cabana-credit></div>          inline, in the page flow
     <div data-cabana-credit="compact"></div> a single quiet line

   The module decides what to render from who is looking:
     signed out          → the offer, and a way to take it
     signed in, unclaimed → claims it, then reveals the balance
     signed in, claimed   → a quiet statement of what they hold
     no credits left      → nothing at all
══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.CabanaCredit) return;

  var CREDITS      = 200;      /* server is authoritative; this is the copy default */
  var MIN_FEE      = 300;      /* our lowest booking fee, the whole point of the pitch */
  var SEEN_KEY     = 'cabana_credit_revealed';
  var STATS_KEY    = 'cabana_credit_stats';
  var STATS_TTL_MS = 120000;

  var reduced = false;
  try {
    reduced = global.matchMedia
      && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
  var money = function (n) { return 'KES ' + Math.round(Number(n) || 0).toLocaleString(); };

  /* ── session ────────────────────────────────────────────────────
     Read through ApaSession where it exists so we never open a second
     Supabase client on the same storage key. */
  function session() {
    return new Promise(function (resolve) {
      var done = false;
      var finish = function (s) { if (!done) { done = true; resolve(s || null); } };

      try {
        if (global.ApaSession && global.ApaSession.client) {
          var c = global.ApaSession.client();
          if (c) {
            c.auth.getSession().then(function (r) {
              finish(r && r.data && r.data.session);
            }, function () { finish(null); });
            setTimeout(function () { finish(null); }, 3500);
            return;
          }
        }
      } catch (e) {}
      finish(null);
    });
  }

  function api(action, body, token) {
    return fetch('/api/rewards', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {}),
      body: JSON.stringify(Object.assign({ action: action }, body || {}))
    }).then(function (r) { return r.json(); }).catch(function () { return {}; });
  }

  /* ── styles ─────────────────────────────────────────────────────
     Injected once, and only when there is something to draw. */
  function css() {
    if (document.getElementById('cabana-credit-css')) return;
    var s = document.createElement('style');
    s.id = 'cabana-credit-css';
    s.textContent = [
      '.cc-card{position:relative;overflow:hidden;border-radius:24px;padding:1px;',
      '  background:linear-gradient(135deg,rgba(184,164,244,.55),rgba(45,212,191,.30) 42%,rgba(123,47,247,.55));',
      '  margin:0 0 20px;}',
      /* One slow sheen crossing the border. It reads as material, not
         as a notification demanding to be dealt with. */
      '.cc-card::before{content:"";position:absolute;inset:-40%;',
      '  background:conic-gradient(from 0deg,transparent 0turn,rgba(255,255,255,.55) .07turn,transparent .16turn,transparent 1turn);',
      '  animation:ccSheen 9s linear infinite;}',
      '@keyframes ccSheen{to{transform:rotate(1turn);}}',
      '.cc-in{position:relative;z-index:1;border-radius:23px;padding:28px 26px;',
      '  background:linear-gradient(150deg,#0F0D1C 0%,#171233 45%,#0C1F22 100%);',
      '  color:#fff;}',
      '.cc-in::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:23px;',
      '  background:radial-gradient(120% 130% at 88% 4%,rgba(123,47,247,.34),transparent 56%),',
      '  radial-gradient(90% 120% at 4% 98%,rgba(45,212,191,.20),transparent 58%);}',
      '.cc-body{position:relative;z-index:2;}',

      '.cc-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;',
      '  letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.62);margin-bottom:16px;}',
      '.cc-dot{width:5px;height:5px;border-radius:50%;background:#5EEAD4;',
      '  box-shadow:0 0 0 0 rgba(94,234,212,.7);animation:ccPulse 2.4s ease-out infinite;}',
      '@keyframes ccPulse{70%{box-shadow:0 0 0 7px rgba(94,234,212,0);}100%{box-shadow:0 0 0 0 rgba(94,234,212,0);}}',

      /* The number carries the whole message, so it gets the space. */
      '.cc-figure{display:flex;align-items:baseline;gap:11px;margin-bottom:6px;}',
      '.cc-num{font-family:"Geist","Inter",sans-serif;font-weight:700;font-size:clamp(52px,11vw,78px);',
      '  line-height:.92;letter-spacing:-.045em;font-variant-numeric:tabular-nums;',
      '  background:linear-gradient(115deg,#fff 18%,#C9B6FF 52%,#5EEAD4 96%);',
      '  -webkit-background-clip:text;background-clip:text;color:transparent;}',
      '.cc-unit{font-family:"Geist","Inter",sans-serif;font-size:17px;font-weight:500;font-style:italic;',
      '  color:rgba(255,255,255,.72);}',
      '.cc-worth{font-size:13px;color:rgba(255,255,255,.52);margin-bottom:20px;}',

      '.cc-lede{font-family:"Geist","Inter",sans-serif;font-weight:300;font-size:clamp(19px,2.6vw,25px);',
      '  line-height:1.28;letter-spacing:-.02em;color:#fff;margin-bottom:12px;}',
      '.cc-lede b{font-weight:600;}',
      '.cc-sub{font-size:13.5px;line-height:1.65;color:rgba(255,255,255,.62);margin-bottom:22px;max-width:46ch;}',

      /* The ledger. This is the argument. */
      '.cc-sum{border-top:1px solid rgba(255,255,255,.10);padding-top:14px;margin-bottom:22px;}',
      '.cc-row{display:flex;justify-content:space-between;align-items:baseline;gap:14px;',
      '  padding:7px 0;font-size:13.5px;color:rgba(255,255,255,.60);}',
      '.cc-row b{font-family:"Geist","Inter",sans-serif;font-weight:500;font-variant-numeric:tabular-nums;',
      '  color:rgba(255,255,255,.86);}',
      '.cc-row.cc-credit{color:#5EEAD4;}.cc-row.cc-credit b{color:#5EEAD4;}',
      '.cc-row.cc-total{border-top:1px solid rgba(255,255,255,.10);margin-top:6px;padding-top:13px;',
      '  font-size:15px;color:#fff;}',
      '.cc-row.cc-total b{font-size:21px;font-weight:650;color:#fff;letter-spacing:-.02em;}',

      '.cc-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;',
      '  padding:15px 22px;border-radius:14px;border:none;cursor:pointer;text-decoration:none;',
      '  font-family:"Inter",system-ui,sans-serif;font-weight:650;font-size:14.5px;color:#0B0A16;',
      '  background:linear-gradient(120deg,#fff,#DCD2FF 62%,#B7F5E9);',
      '  transition:transform .26s cubic-bezier(.16,1,.3,1),box-shadow .26s;}',
      '.cc-cta:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(123,47,247,.34);}',
      '.cc-cta svg{transition:transform .26s cubic-bezier(.16,1,.3,1);}',
      '.cc-cta:hover svg{transform:translateX(3px);}',
      '.cc-fine{margin-top:13px;font-size:11.5px;line-height:1.55;color:rgba(255,255,255,.42);text-align:center;}',
      '.cc-signin{margin-top:9px;font-size:12.5px;color:rgba(255,255,255,.42);text-align:center;}',
      '.cc-signin a{color:rgba(255,255,255,.78);text-decoration:none;border-bottom:1px solid rgba(255,255,255,.22);}',

      /* Entrance. Staggered, quick, once. */
      '.cc-rise{opacity:0;transform:translateY(14px);}',
      '.cc-go .cc-rise{opacity:1;transform:none;',
      '  transition:opacity .62s cubic-bezier(.16,1,.3,1),transform .62s cubic-bezier(.16,1,.3,1);}',
      '.cc-go .cc-rise:nth-child(2){transition-delay:.05s;}',
      '.cc-go .cc-rise:nth-child(3){transition-delay:.10s;}',
      '.cc-go .cc-rise:nth-child(4){transition-delay:.15s;}',
      '.cc-go .cc-rise:nth-child(5){transition-delay:.20s;}',
      '.cc-go .cc-rise:nth-child(6){transition-delay:.25s;}',

      /* Held balance: the same idea, said quietly. */
      '.cc-held{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:18px;',
      '  background:linear-gradient(140deg,#0F0D1C,#181336);border:1px solid rgba(184,164,244,.22);',
      '  color:#fff;margin:0 0 18px;text-decoration:none;}',
      '.cc-held-n{font-family:"Geist","Inter",sans-serif;font-weight:700;font-size:26px;line-height:1;',
      '  letter-spacing:-.03em;font-variant-numeric:tabular-nums;',
      '  background:linear-gradient(115deg,#fff,#5EEAD4);-webkit-background-clip:text;',
      '  background-clip:text;color:transparent;flex-shrink:0;}',
      '.cc-held-t{font-size:13.5px;font-weight:600;}',
      '.cc-held-s{font-size:12px;color:rgba(255,255,255,.55);margin-top:2px;}',

      '@media(max-width:560px){.cc-in{padding:24px 20px;}}',
      '@media(prefers-reduced-motion:reduce){',
      '  .cc-card::before{animation:none;}',
      '  .cc-rise{opacity:1;transform:none;}}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ── the number, counted ────────────────────────────────────────
     Ease-out so it decelerates into place rather than stopping dead.
     Skipped entirely under reduced motion: the value is the point,
     the motion is not. */
  function countTo(el, target, ms) {
    if (reduced || !ms) { el.textContent = String(target); return; }
    var t0 = null;
    var step = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / ms);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    };
    requestAnimationFrame(step);
  }

  function arrow() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
         + ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
         + '<path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  }

  /* ── the offer, for someone who has not signed up ───────────────── */
  function renderOffer(mount, amount) {
    css();
    var pay = Math.max(0, MIN_FEE - amount);

    mount.innerHTML =
      '<div class="cc-card"><div class="cc-in"><div class="cc-body">'
      + '<div class="cc-eyebrow cc-rise"><span class="cc-dot"></span>New accounts</div>'
      + '<div class="cc-figure cc-rise">'
      +   '<span class="cc-num" data-cc-count="' + amount + '">0</span>'
      +   '<span class="cc-unit">credits, free</span>'
      + '</div>'
      + '<div class="cc-worth cc-rise">One credit is one shilling. Yours the moment you sign up.</div>'
      + '<div class="cc-lede cc-rise">Your first booking is <b>two-thirds handled</b> before you have chosen it.</div>'
      + '<div class="cc-sub cc-rise">Hosts keep 100% of their price. The only thing we charge is a flat '
      +   'booking fee, starting at ' + money(MIN_FEE) + '. Here is what your credits do to it.</div>'
      + '<div class="cc-sum cc-rise">'
      +   '<div class="cc-row"><span>Cabana booking fee</span><b>' + money(MIN_FEE) + '</b></div>'
      +   '<div class="cc-row cc-credit"><span>Your welcome credits</span><b>−' + money(amount) + '</b></div>'
      +   '<div class="cc-row cc-total"><span>You pay</span><b>' + money(pay) + '</b></div>'
      + '</div>'
      + '<a class="cc-cta cc-rise" href="auth.html?mode=signup&amp;credit=1">'
      +   'Open your account' + arrow() + '</a>'
      + '<div class="cc-fine">Credits apply to stays, tours, rides, car hire, events and food. '
      +   'Not valid on flights.</div>'
      + '<div class="cc-signin">Already with us? <a href="auth.html">Sign in</a></div>'
      + '</div></div></div>';

    animateIn(mount, amount);
  }

  /* ── the reveal, the first time they see it credited ─────────────── */
  function renderReveal(mount, amount, balance) {
    css();
    mount.innerHTML =
      '<div class="cc-card"><div class="cc-in"><div class="cc-body">'
      + '<div class="cc-eyebrow cc-rise"><span class="cc-dot"></span>Credited to your account</div>'
      + '<div class="cc-figure cc-rise">'
      +   '<span class="cc-num" data-cc-count="' + amount + '">0</span>'
      +   '<span class="cc-unit">credits</span>'
      + '</div>'
      + '<div class="cc-worth cc-rise">Worth ' + money(amount) + ', already in your balance.</div>'
      + '<div class="cc-lede cc-rise">Welcome. <b>Now spend them.</b></div>'
      + '<div class="cc-sub cc-rise">They come off the total at checkout, on anything you book: a room '
      +   'in Kilimani, a morning in the Mara, a table on Friday. Nothing to enter, nothing to '
      +   'remember. They are simply there.</div>'
      + '<a class="cc-cta cc-rise" href="apartments.html">Find somewhere to stay' + arrow() + '</a>'
      + '<div class="cc-fine">Balance: ' + money(balance) + ' · Not valid on flights.</div>'
      + '</div></div></div>';

    animateIn(mount, amount);
  }

  /* ── what they hold, on every visit after ───────────────────────── */
  function renderHeld(mount, balance) {
    css();
    mount.innerHTML =
      '<a class="cc-held" href="rewards.html">'
      + '<span class="cc-held-n" data-cc-count="' + balance + '">0</span>'
      + '<span><span class="cc-held-t">credits in your account</span>'
      + '<span class="cc-held-s">' + money(balance)
      +   ' off your next booking. Not valid on flights.</span></span>'
      + '</a>';
    animateIn(mount, balance, 700);
  }

  function animateIn(mount, amount, ms) {
    var card = mount.firstElementChild;
    var num  = mount.querySelector('[data-cc-count]');

    var run = function () {
      if (card) card.classList.add('cc-go');
      if (num) countTo(num, amount, ms == null ? 1150 : ms);
    };

    /* Count when it is actually on screen. A number that finished
       counting while scrolled past has told nobody anything. */
    if (typeof IntersectionObserver === 'function' && !reduced) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { io.disconnect(); setTimeout(run, 90); }
        });
      }, { threshold: 0.35 });
      io.observe(mount);
      /* If it never intersects (hidden tab, odd layout), do not leave
         a zero sitting there forever. */
      setTimeout(function () {
        if (num && num.textContent === '0') { io.disconnect(); run(); }
      }, 4000);
    } else {
      run();
    }
  }

  /* ── stats, lightly cached so five mounts is one request ─────────── */
  function stats(token) {
    try {
      var raw = sessionStorage.getItem(STATS_KEY);
      if (raw) {
        var c = JSON.parse(raw);
        if (Date.now() - c.t < STATS_TTL_MS) return Promise.resolve(c.v);
      }
    } catch (e) {}
    return api('stats', {}, token).then(function (s) {
      try { sessionStorage.setItem(STATS_KEY, JSON.stringify({ t: Date.now(), v: s })); } catch (e) {}
      return s;
    });
  }
  function clearStats() { try { sessionStorage.removeItem(STATS_KEY); } catch (e) {} }

  /* ── boot ───────────────────────────────────────────────────────── */
  async function init() {
    var mounts = [].slice.call(document.querySelectorAll('[data-cabana-credit]'));
    if (!mounts.length) return;

    var ses = await session();

    /* Signed out: make the offer. */
    if (!ses || !ses.user) {
      mounts.forEach(function (m) { renderOffer(m, CREDITS); });
      return;
    }

    var token = ses.access_token;

    /* Signed in. Claiming is idempotent server-side and enforced by a
       unique index, so calling it on every load is safe and means a
       failed call at signup self-heals on the next page view rather
       than silently costing someone their credits. */
    var claim = await api('claim-welcome', {}, token);
    if (claim && claim.granted) clearStats();

    var s       = await stats(token);
    var balance = Number(s && (s.credit_kes != null ? s.credit_kes : s.available_points)) || 0;
    var amount  = Number(claim && claim.points) || CREDITS;

    var seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}

    /* The reveal happens once: on the first load after the grant, or
       for anyone arriving from signup who has not seen it yet. */
    if (!seen && (claim.granted || claim.already) && balance > 0) {
      try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
      mounts.forEach(function (m) { renderReveal(m, amount, balance); });
      return;
    }

    /* Nothing left to say if there is nothing left to spend. */
    if (balance <= 0) { mounts.forEach(function (m) { m.innerHTML = ''; }); return; }

    mounts.forEach(function (m) { renderHeld(m, balance); });
  }

  global.CabanaCredit = {
    init: init,
    refresh: function () { clearStats(); return init(); },
    /* Used by checkout to price a booking. Never trusts this number
       for the actual deduction: the server re-checks the balance. */
    balance: function () {
      return session().then(function (ses) {
        if (!ses || !ses.user) return 0;
        return stats(ses.access_token).then(function (s) {
          return Number(s && (s.credit_kes != null ? s.credit_kes : s.available_points)) || 0;
        });
      });
    },
    clearCache: clearStats,
    CREDITS: CREDITS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
