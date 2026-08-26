/* ══════════════════════════════════════════════════════════════
   CABANA · WELCOME CREDIT
   cabana-credit.js

   Every new account opens with 200 credits. One credit is one
   shilling off the total, on everything except flights.

   THE ARGUMENT THIS FILE MAKES
   ────────────────────────────
   The offer is one fact, and the fact is the whole pitch: two
   hundred credits, free, for opening an account. Nothing else needs
   saying at the door. Explaining the arithmetic of our booking fee
   here made the gift read as a discount on our own invoice rather
   than as money in someone's hand — so the ledger is gone, and with
   it the fine print about what credits touch. That belongs later,
   inside the account, where it is useful instead of deflating.

   Which is why there are no exclamation marks and no countdown
   pretending the offer expires. The animation budget goes on one
   thing: the number itself, counted up and settled, once.

   THE INVITATION
   ──────────────
   A signed-out visitor also gets one transient card, centred, that
   arrives a few seconds in, holds for five, and leaves on its own.
   It never locks the page and it never has to be dealt with — the
   close button is a courtesy, not a toll. It is capped hard (see
   POPUP RULES below) and it stands down entirely around the referral
   modal, which is the one that must be dismissed by hand. Two
   overlays in one sitting is how a good offer becomes a nuisance.

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

      /* The offer card is four elements tall now, so the figure takes
         the room the ledger gave back. */
      '.cc-offer .cc-in{padding:32px 28px 24px;}',
      '.cc-offer .cc-num{font-size:clamp(60px,14vw,92px);}',
      '.cc-offer .cc-unit{font-size:18px;}',
      '.cc-offer .cc-worth{margin-bottom:26px;font-size:13.5px;}',
      '.cc-offer .cc-signin{margin-top:13px;}',
      '@media(max-width:560px){.cc-offer .cc-in{padding:28px 22px 22px;}}',

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

  /* ── the offer, for someone who has not signed up ─────────────────
     One number, one button. Everything that used to sit under the
     figure — the shilling conversion, the fee ledger, the exclusions
     — has been removed on purpose. See the note at the top. */
  function renderOffer(mount, amount) {
    css();

    mount.innerHTML =
      '<div class="cc-card cc-offer"><div class="cc-in"><div class="cc-body">'
      + '<div class="cc-eyebrow cc-rise"><span class="cc-dot"></span>New accounts</div>'
      + '<div class="cc-figure cc-rise">'
      +   '<span class="cc-num" data-cc-count="' + amount + '">0</span>'
      +   '<span class="cc-unit">credits, free</span>'
      + '</div>'
      + '<div class="cc-worth cc-rise">Yours the moment you open an account.</div>'
      + '<a class="cc-cta cc-rise" href="auth.html?mode=signup&amp;credit=1">'
      +   'Open your account' + arrow() + '</a>'
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
  var popScheduled = false;

  async function init() {
    var mounts = [].slice.call(document.querySelectorAll('[data-cabana-credit]'));

    var ses = await session();

    /* Signed out: make the offer, in the page and once over it. */
    if (!ses || !ses.user) {
      mounts.forEach(function (m) { renderOffer(m, CREDITS); });
      if (!popScheduled) { popScheduled = true; popSchedule(CREDITS); }
      return;
    }

    if (!mounts.length) return;

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

  /* ══════════════════════════════════════════════════════════════
     THE INVITATION
     ──────────────
     One transient card for a signed-out visitor: the number, and a
     button that takes it. It arrives a few seconds in, holds for
     five, and then leaves on its own.

     It is deliberately NOT the referral modal. That one is a decision
     you have to make and dismiss by hand, so it earns its interruption
     by appearing once a session, a full minute in. This one earns its
     interruption by costing nothing: the page never scroll-locks, the
     clock is visible along the bottom edge, and doing nothing at all
     is a valid answer. The close button is a courtesy, not a toll.

     POPUP RULES
       · signed out only, and never on auth, checkout or listing pages
       · once per session; three times ever; never twice inside three
         days, or inside two weeks if they closed it by hand
       · never while the referral modal is open — or even in a session
         where it has already run. Two overlays in one sitting is how
         a good offer becomes a nuisance
       · never over the intro or the campaign splash, and never while
         the tab is in the background, where it would burn its five
         seconds unseen
       · hovering, touching or tabbing into it pauses the clock, so it
         cannot vanish out from under someone reaching for the button
  ══════════════════════════════════════════════════════════════ */

  var POP_KEY       = 'cabana_credit_invite';
  var POP_SES_KEY   = 'cabana_credit_invite_seen';
  var POP_DELAY_MS  = 6500;        /* let the page settle and be read first */
  var POP_LIFE_MS   = 5000;        /* the five seconds it is allowed */
  var POP_MAX       = 3;           /* lifetime impressions, then never again */
  var POP_REST_MS   = 259200000;   /* 3 days after it simply expired  */
  var POP_CLOSED_MS = 1209600000;  /* 14 days after they closed it themselves */
  var POP_WAIT_MS   = 20000;       /* how long we will wait for a clear screen */
  var POP_SKIP      = ['auth', 'booking-confirm', 'add-listing'];

  function popState() {
    try {
      var raw = localStorage.getItem(POP_KEY);
      var v = raw ? JSON.parse(raw) : null;
      if (v && typeof v === 'object') return v;
    } catch (e) {}
    return { n: 0, t: 0, closed: false };
  }
  function popSave(v) {
    try { localStorage.setItem(POP_KEY, JSON.stringify(v)); } catch (e) {}
  }

  function page() {
    var f = (location.pathname.split('/').pop() || '').replace('.html', '');
    return f || 'index';
  }

  /* Anything already covering the screen, ours or otherwise. */
  function screenBusy() {
    if (global.__cabanaOverlay) return true;
    if (document.getElementById('apt-ref-popup')) return true;
    var intro = document.getElementById('intro');
    if (intro && intro.offsetParent !== null && !intro.classList.contains('lift')) return true;
    if (document.getElementById('apa-splash-curtain')) return true;
    if (document.hidden) return true;
    return false;
  }

  function popEligible() {
    if (POP_SKIP.indexOf(page()) !== -1) return false;

    /* Arriving from the offer itself, or from a referral link mid-flow:
       they are already on their way in. Do not stop them. */
    try {
      if (/[?&]credit=1/.test(location.search)) return false;
      if (/[?&]mode=signup/.test(location.search)) return false;
    } catch (e) {}

    /* One overlay per session, and the referral modal has first claim
       on that slot if it has already used it. */
    try {
      if (sessionStorage.getItem(POP_SES_KEY)) return false;
      if (sessionStorage.getItem('apt_ref_popup_shown')) return false;
    } catch (e) {}

    var st = popState();
    if ((st.n || 0) >= POP_MAX) return false;
    var rest = st.closed ? POP_CLOSED_MS : POP_REST_MS;
    if (st.t && Date.now() - st.t < rest) return false;

    return true;
  }

  function popCss() {
    if (document.getElementById('cabana-credit-pop-css')) return;
    var s = document.createElement('style');
    s.id = 'cabana-credit-pop-css';
    s.textContent = [
      '.ccp-wrap{position:fixed;inset:0;z-index:2147481500;display:flex;align-items:center;',
      '  justify-content:center;padding:22px;opacity:0;transition:opacity .34s ease;}',
      '.ccp-wrap.ccp-on{opacity:1;}',
      '.ccp-wrap.ccp-out{opacity:0;transition:opacity .28s ease;}',
      '.ccp-bg{position:absolute;inset:0;cursor:pointer;',
      '  background:radial-gradient(120% 100% at 50% 42%,rgba(12,8,30,.60),rgba(5,4,14,.84));',
      '  -webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);}',

      /* The card. Same material as the inline offer, lit a little harder,
         because this one has five seconds to be believed. */
      '.ccp-card{position:relative;width:100%;max-width:392px;border-radius:30px;padding:1.5px;',
      '  overflow:hidden;opacity:0;transform:translateY(30px) scale(.93);',
      '  background:linear-gradient(135deg,rgba(184,164,244,.78),rgba(45,212,191,.45) 45%,rgba(123,47,247,.85));',
      '  box-shadow:0 46px 104px rgba(0,0,0,.62),0 0 78px rgba(123,47,247,.24);',
      '  transition:transform .66s cubic-bezier(.2,1.16,.32,1),opacity .42s ease;}',
      '.ccp-on .ccp-card{opacity:1;transform:none;}',
      '.ccp-out .ccp-card{opacity:0;transform:translateY(14px) scale(.97);',
      '  transition:transform .28s ease-in,opacity .24s ease-in;}',
      '.ccp-card::before{content:"";position:absolute;inset:-45%;',
      '  background:conic-gradient(from 0deg,transparent 0turn,rgba(255,255,255,.6) .06turn,transparent .15turn,transparent 1turn);',
      '  animation:ccpSheen 7s linear infinite;}',
      '@keyframes ccpSheen{to{transform:rotate(1turn);}}',

      '.ccp-in{position:relative;z-index:1;border-radius:28.5px;overflow:hidden;text-align:center;',
      '  padding:34px 26px 22px;color:#fff;',
      '  background:linear-gradient(158deg,#100E20 0%,#191338 46%,#0B2024 100%);}',
      '.ccp-in::after{content:"";position:absolute;inset:0;pointer-events:none;',
      '  background:radial-gradient(105% 80% at 50% -8%,rgba(123,47,247,.42),transparent 62%),',
      '  radial-gradient(90% 90% at 6% 104%,rgba(45,212,191,.24),transparent 60%);}',
      '.ccp-body{position:relative;z-index:2;}',

      /* A handful of specks, drifting. Enough to feel like an occasion,
         far short of confetti. */
      '.ccp-spark{position:absolute;border-radius:50%;background:#fff;z-index:1;pointer-events:none;',
      '  opacity:.15;animation:ccpTwinkle var(--d,4s) var(--dl,0s) ease-in-out infinite;}',
      '@keyframes ccpTwinkle{0%,100%{opacity:.10;transform:translateY(0) scale(1);}',
      '  50%{opacity:.85;transform:translateY(-6px) scale(1.5);}}',

      '.ccp-x{position:absolute;top:13px;right:13px;z-index:3;width:32px;height:32px;border-radius:50%;',
      '  display:flex;align-items:center;justify-content:center;cursor:pointer;',
      '  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);',
      '  color:rgba(255,255,255,.55);font:400 17px/1 system-ui,sans-serif;',
      '  transition:background .2s,color .2s;}',
      '.ccp-x:hover{background:rgba(255,255,255,.14);color:#fff;}',

      '.ccp-badge{display:inline-flex;align-items:center;gap:7px;margin-bottom:16px;padding:6px 13px;',
      '  border-radius:100px;font:700 10px/1 "Inter",system-ui,sans-serif;letter-spacing:.15em;',
      '  text-transform:uppercase;color:#B7F5E9;',
      '  background:linear-gradient(135deg,rgba(123,47,247,.30),rgba(45,212,191,.16));',
      '  border:1px solid rgba(184,164,244,.32);}',
      '.ccp-badge span{width:5px;height:5px;border-radius:50%;background:#5EEAD4;',
      '  box-shadow:0 0 0 0 rgba(94,234,212,.7);animation:ccPulse 2.4s ease-out infinite;}',

      '.ccp-fig{display:flex;align-items:baseline;justify-content:center;gap:10px;}',
      '.ccp-num{font-family:"Geist","Inter",sans-serif;font-weight:700;font-size:clamp(62px,17vw,92px);',
      '  line-height:.9;letter-spacing:-.05em;font-variant-numeric:tabular-nums;',
      '  background:linear-gradient(115deg,#fff 16%,#C9B6FF 52%,#5EEAD4 96%);',
      '  -webkit-background-clip:text;background-clip:text;color:transparent;}',
      '.ccp-unit{font-family:"Geist","Inter",sans-serif;font-size:18px;font-weight:500;font-style:italic;',
      '  color:rgba(255,255,255,.74);}',
      '.ccp-line{font-size:13.5px;line-height:1.5;color:rgba(255,255,255,.56);margin:10px 0 24px;}',

      /* The button is the only loud thing on the card, and it is loud
         on purpose: it is the one action worth taking here. */
      '.ccp-cta{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;',
      '  gap:9px;width:100%;padding:17px 20px;border-radius:16px;border:none;cursor:pointer;',
      '  text-decoration:none;font:650 15.5px/1 "Inter",system-ui,sans-serif;color:#0B0A16;',
      '  background:linear-gradient(120deg,#fff,#DCD2FF 58%,#B7F5E9);',
      '  animation:ccpBreathe 3.6s ease-in-out infinite;}',
      '.ccp-cta::after{content:"";position:absolute;top:0;left:-65%;width:42%;height:100%;',
      '  transform:skewX(-18deg);pointer-events:none;',
      '  background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent);',
      '  animation:ccpShine 2.8s ease-in-out .7s infinite;}',
      '@keyframes ccpShine{0%{left:-65%;}58%,100%{left:135%;}}',
      '@keyframes ccpBreathe{0%,100%{box-shadow:0 14px 34px rgba(123,47,247,.34),inset 0 1px 0 rgba(255,255,255,.6);}',
      '  50%{box-shadow:0 20px 46px rgba(123,47,247,.52),inset 0 1px 0 rgba(255,255,255,.6);}}',
      '.ccp-cta:hover{filter:brightness(1.04);}',
      '.ccp-cta:active{filter:brightness(.95);}',
      '.ccp-cta svg{position:relative;z-index:1;transition:transform .26s cubic-bezier(.16,1,.3,1);}',
      '.ccp-cta:hover svg{transform:translateX(3px);}',

      '.ccp-sign{margin-top:13px;font-size:12.5px;color:rgba(255,255,255,.42);}',
      '.ccp-sign a{color:rgba(255,255,255,.8);text-decoration:none;',
      '  border-bottom:1px solid rgba(255,255,255,.24);}',

      /* The clock, said out loud. Knowing it will leave on its own is
         most of the reason it is not annoying. */
      '.ccp-time{position:absolute;left:0;right:0;bottom:0;height:2.5px;z-index:3;',
      '  background:rgba(255,255,255,.07);}',
      '.ccp-time i{display:block;height:100%;width:100%;transform-origin:left center;',
      '  background:linear-gradient(90deg,#C9B6FF,#5EEAD4);}',

      '@media(max-width:400px){.ccp-in{padding:30px 20px 20px;}.ccp-wrap{padding:16px;}}',
      '@media(prefers-reduced-motion:reduce){',
      '  .ccp-card::before,.ccp-cta,.ccp-cta::after,.ccp-spark{animation:none;}',
      '  .ccp-card{transition:opacity .3s ease;transform:none;}',
      '  .ccp-on .ccp-card,.ccp-out .ccp-card{transform:none;}}'
    ].join('');
    document.head.appendChild(s);
  }

  var popLive = null;

  function popShow(amount) {
    if (popLive || screenBusy()) return;
    popCss();

    var wrap = document.createElement('div');
    wrap.className = 'ccp-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'false');
    wrap.setAttribute('aria-label', amount + ' free credits when you open an account');
    wrap.innerHTML =
      '<div class="ccp-bg" data-ccp-close></div>'
      + '<div class="ccp-card"><div class="ccp-in">'
      +   '<button class="ccp-x" type="button" aria-label="Close" data-ccp-close>&times;</button>'
      +   '<div class="ccp-body">'
      +     '<div class="ccp-badge"><span></span>Welcome gift</div>'
      +     '<div class="ccp-fig">'
      +       '<span class="ccp-num" data-ccp-count>0</span>'
      +       '<span class="ccp-unit">credits, free</span>'
      +     '</div>'
      +     '<div class="ccp-line">Yours the moment you open an account.</div>'
      +     '<a class="ccp-cta" href="auth.html?mode=signup&amp;credit=1" data-ccp-claim>'
      +       'Claim my ' + amount + ' credits' + arrow() + '</a>'
      +     '<div class="ccp-sign">Already with us? <a href="auth.html">Sign in</a></div>'
      +   '</div>'
      +   '<div class="ccp-time"><i data-ccp-bar></i></div>'
      + '</div></div>';

    /* Specks. Skipped under reduced motion, where they would just be
       dots sitting on a card. */
    if (!reduced) {
      var host = wrap.querySelector('.ccp-in');
      for (var i = 0; i < 14; i++) {
        var sp = document.createElement('span');
        sp.className = 'ccp-spark';
        var sz = (Math.random() * 2.2 + 0.8).toFixed(1);
        sp.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;top:' + (Math.random() * 100).toFixed(1)
          + '%;left:' + (Math.random() * 100).toFixed(1) + '%;--d:' + (2.5 + Math.random() * 3.5).toFixed(1)
          + 's;--dl:' + (Math.random() * 3).toFixed(1) + 's;';
        host.appendChild(sp);
      }
    }

    document.body.appendChild(wrap);
    popLive = wrap;
    global.__cabanaOverlay = 'credit';

    /* Count it, and mark the impression. */
    var st = popState();
    popSave({ n: (st.n || 0) + 1, t: Date.now(), closed: !!st.closed });
    try { sessionStorage.setItem(POP_SES_KEY, '1'); } catch (e) {}

    var bar = wrap.querySelector('[data-ccp-bar]');
    var num = wrap.querySelector('[data-ccp-count]');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add('ccp-on');
        countTo(num, amount, reduced ? 0 : 900);
      });
    });

    /* ── the five seconds ──────────────────────────────────────────
       Driven by the frame clock rather than a setTimeout, so that the
       bar and the deadline are the same number and a pause is simply
       a frame that does not count. */
    var left   = POP_LIFE_MS;
    var last   = null;
    var held   = 0;              /* how many things are holding the clock */
    var ended  = false;

    function tick(t) {
      if (ended) return;
      if (last === null) last = t;
      var dt = t - last;
      last = t;
      if (!held && !document.hidden) {
        left -= dt;
        if (bar) bar.style.transform = 'scaleX(' + Math.max(0, left / POP_LIFE_MS) + ')';
      }
      if (left <= 0) { close(false); return; }
      requestAnimationFrame(tick);
    }

    function close(byHand) {
      if (ended) return;
      ended = true;
      var s2 = popState();
      /* Closing it by hand is a clearer signal than letting it lapse,
         and it buys a much longer silence. */
      if (byHand) popSave({ n: s2.n || 0, t: Date.now(), closed: true });
      wrap.classList.remove('ccp-on');
      wrap.classList.add('ccp-out');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (popLive === wrap) popLive = null;
        if (global.__cabanaOverlay === 'credit') global.__cabanaOverlay = null;
      }, 320);
    }

    function onKey(e) { if (e.key === 'Escape' || e.key === 'Esc') close(true); }
    document.addEventListener('keydown', onKey);

    wrap.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('[data-ccp-claim]')) {
        /* They took it. It has done its job and should never run again. */
        popSave({ n: POP_MAX, t: Date.now(), closed: false });
        return;                                   /* let the link navigate */
      }
      if (t && t.closest && t.closest('[data-ccp-close]')) { e.preventDefault(); close(true); }
    });

    /* Reaching for the button, reading it, or tabbing into it all stop
       the clock. It resumes the moment they let go. */
    var card = wrap.querySelector('.ccp-card');
    var hold    = function () { held++; };
    var release = function () { held = Math.max(0, held - 1); };
    card.addEventListener('mouseenter', hold);
    card.addEventListener('mouseleave', release);
    card.addEventListener('touchstart', hold, { passive: true });
    card.addEventListener('touchend', release, { passive: true });
    card.addEventListener('focusin', hold);
    card.addEventListener('focusout', release);

    requestAnimationFrame(tick);
  }

  /* Waits for a clear screen, then shows it once. Gives up quietly if
     the screen never clears — a card nobody can see is worse than none. */
  function popSchedule(amount) {
    var t0 = Date.now();
    var poll = function () {
      if (popLive) return;
      if (!popEligible()) return;
      if (!screenBusy()) { popShow(amount); return; }
      if (Date.now() - t0 > POP_WAIT_MS) return;
      setTimeout(poll, 900);
    };
    setTimeout(poll, POP_DELAY_MS);
  }

  global.CabanaCredit = {
    init: init,
    refresh: function () { clearStats(); return init(); },
    /* The transient welcome card. Exposed so it can be summoned or
       reset by hand while working on it, never so it can be shown
       twice to the same person. */
    invite: {
      show:     function () { popShow(CREDITS); },
      eligible: popEligible,
      reset:    function () {
        try { localStorage.removeItem(POP_KEY); sessionStorage.removeItem(POP_SES_KEY); } catch (e) {}
      }
    },
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
