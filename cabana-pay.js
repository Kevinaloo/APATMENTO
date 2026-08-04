/* ══════════════════════════════════════════════════════════════════════
   CABANA — Cinematic Payment Experience  v2.0
   World-class. Drop-in replacement for ApatmentoPay.
   API: ApatmentoPay.start(opts), .cancel(), .close(), .retry()
══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Fonts ─────────────────────────────────────────────────────── */
  if (!document.getElementById('cbp-fonts')) {
    const l = document.createElement('link');
    l.id   = 'cbp-fonts';
    l.rel  = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@100;200;300;400&display=swap';
    document.head.appendChild(l);
  }

  /* ── Video & poster map ─────────────────────────────────────────── */
  const V = {
    oldguy:   '/cabana-vid-oldguy.mp4',
    swing:    '/cabana-vid-swing.mp4',
    suitcase: '/cabana-vid-suitcase.mp4',
    facepalm: '/cabana-vid-facepalm.mp4',
  };
  const P = {
    oldguy:   '/cabana-poster-oldguy.jpg',
    swing:    '/cabana-poster-swing.jpg',
    suitcase: '/cabana-poster-suitcase.jpg',
    facepalm: '/cabana-poster-facepalm.jpg',
  };

  /* ── Preload all payment videos the moment this script loads ───── */
  Object.values(V).forEach(src => {
    const l = document.createElement('link');
    l.rel  = 'preload'; l.as = 'video'; l.href = src;
    document.head.appendChild(l);
  });

  /* ── Sarcastic failure lines ────────────────────────────────────── */
  const FAIL_LINES = [
    "It's not you. The universe simply wasn't ready for how good you'd look at Cabana. Try again — destiny is patient, your suite is not.",
    "The payment gods clocked out early. Rude of them. One more try and they'll have no choice.",
    "M-Pesa blinked. Spiritually, this is a sign you should try again immediately.",
    "Your money wanted to arrive. It just took a wrong turn. Help it find home.",
    "Not declined. Cosmically postponed. The suite still has your name on it.",
    "Mercury's in retrograde. Your booking is not. Try again before the planets realign against you.",
    "We asked M-Pesa nicely. It said 'perhaps later.' You say 'right now.' We're on your side.",
  ];
  let _failIdx = 0;

  /* ── CSS ────────────────────────────────────────────────────────── */
  if (!document.getElementById('cbp-css')) {
    const s = document.createElement('style');
    s.id = 'cbp-css';
    s.textContent = `
/* ── root overlay ── */
#cbp-root {
  position: fixed; inset: 0; z-index: 99999;
  font-family: 'Montserrat', sans-serif;
  display: none;
  background: #050505;
}
#cbp-root.cbp-open { display: block; }

/* ── video layer ── */
#cbp-vl {
  position: absolute; inset: 0;
  overflow: hidden;
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}
#cbp-vl video {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
  opacity: 0;
  transition: opacity 0.9s cubic-bezier(.4,0,.2,1);
}
#cbp-vl video.cbp-show { opacity: 1; }

/* ── cinematic grain overlay ── */
#cbp-root::after {
  content: '';
  position: absolute; inset: 0; z-index: 3;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  opacity: .028;
  mix-blend-mode: overlay;
}

/* ── gradient veil ── */
#cbp-veil {
  position: absolute; inset: 0; z-index: 2;
  background: linear-gradient(
    160deg,
    rgba(0,0,0,.55) 0%,
    rgba(0,0,0,.05) 35%,
    rgba(0,0,0,.05) 60%,
    rgba(0,0,0,.75) 100%
  );
  transition: background .8s ease;
}
#cbp-veil.cbp-heavy {
  background: linear-gradient(
    160deg,
    rgba(0,0,0,.72) 0%,
    rgba(0,0,0,.32) 40%,
    rgba(0,0,0,.32) 60%,
    rgba(0,0,0,.88) 100%
  );
}

/* ── black curtain for state transitions ── */
#cbp-curtain {
  position: absolute; inset: 0; z-index: 50;
  background: #050505;
  opacity: 0; pointer-events: none;
  transition: opacity .38s ease;
}
#cbp-curtain.on { opacity: 1; pointer-events: all; }

/* ── shell ── */
#cbp-shell {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column;
  align-items: center; justify-content: space-between;
  padding: clamp(48px,10vh,80px) clamp(24px,6vw,48px) clamp(56px,11vh,90px);
}

/* ── brand ── */
#cbp-brand {
  text-align: center;
  animation: cbpFD 1s cubic-bezier(.16,1,.3,1) both;
}
.cbp-name {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: clamp(32px,7.5vw,54px);
  letter-spacing: 16px;
  text-transform: uppercase;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2px 40px rgba(0,0,0,.3);
}
.cbp-sub {
  font-size: 7.5px; letter-spacing: 5.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,.38);
  margin-top: 9px; font-weight: 200;
}
.cbp-iris {
  width: 56px; height: 2px;
  margin: 12px auto 0;
  border-radius: 2px;
  background: linear-gradient(90deg,#7DF9FF,#B06EFF,#FF6EFF,#FFD84D,#7DF9FF);
  background-size: 400%;
  animation: cbpSh 4s linear infinite;
}

/* ── panels ── */
.cbp-panel {
  display: none; flex-direction: column;
  align-items: center; text-align: center;
  gap: 18px; width: 100%; max-width: 360px;
}
.cbp-panel.on { display: flex; animation: cbpFU .7s cubic-bezier(.16,1,.3,1) both; }

/* ── processing ── */
.cbp-proc-title {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-weight: 300;
  font-size: clamp(24px,5.5vw,36px);
  color: #fff; letter-spacing: .5px; line-height: 1.25;
}
.cbp-proc-hint {
  font-size: 9px; letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(255,255,255,.5); font-weight: 200;
}
.cbp-amount {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: clamp(38px,8vw,56px);
  color: #fff; letter-spacing: 1px;
  line-height: 1;
}
.cbp-amount-desc {
  font-size: 8.5px; letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,.38);
  font-weight: 200; margin-top: -10px;
}

/* ── heartbeat dots ── */
.cbp-dots { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
.cbp-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.55);
  animation: cbpHB 1.6s ease-in-out infinite;
}
.cbp-dot:nth-child(2) { animation-delay: .26s; }
.cbp-dot:nth-child(3) { animation-delay: .52s; }

/* ── glass button ── */
.cbp-btn {
  font-family: 'Montserrat', sans-serif;
  font-size: 8.5px; font-weight: 300;
  letter-spacing: 5.5px; text-transform: uppercase;
  color: rgba(255,255,255,.65); cursor: pointer;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.2);
  padding: 15px 34px; border-radius: 2px;
  transition: background .3s, border-color .3s, color .3s, transform .25s;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* subtle pulse to invite tapping */
  animation: cbpBtnPulse 3s ease-in-out infinite;
}
.cbp-btn:hover, .cbp-btn:active {
  background: rgba(255,255,255,.16);
  border-color: rgba(255,255,255,.55);
  color: #fff; transform: translateY(-2px);
}

/* ── success ── */
.cbp-success-glyph {
  font-size: 26px; color: #fff;
  animation: cbpPop .7s cubic-bezier(.34,1.56,.64,1) .15s both;
}
.cbp-success-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: clamp(30px,6.5vw,46px);
  letter-spacing: 5px; text-transform: uppercase; color: #fff;
}
.cbp-success-msg {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-weight: 300;
  font-size: clamp(15px,3.5vw,21px);
  color: rgba(255,255,255,.68); line-height: 1.6;
}

/* ── failed ── */
.cbp-fail-glyph {
  font-size: 32px;
  animation: cbpShake .7s ease .1s both;
}
.cbp-fail-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: clamp(26px,6vw,40px);
  letter-spacing: 3px; color: #fff;
}
.cbp-fail-msg {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-weight: 300;
  font-size: clamp(13px,3vw,18px);
  color: rgba(255,255,255,.65); line-height: 1.65;
  max-width: 300px;
}

/* ── footer ── */
#cbp-foot {
  font-size: 7.5px; letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,.18);
  text-align: center;
  animation: cbpFU 1.2s ease .6s both;
}

/* ── keyframes ── */
@keyframes cbpFD {
  from { opacity:0; transform:translateY(-16px) scale(.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes cbpFU {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes cbpPop {
  from { opacity:0; transform:scale(.3) rotate(-15deg); }
  to   { opacity:1; transform:scale(1) rotate(0deg); }
}
@keyframes cbpSh {
  0%   { background-position:0% 50%; }
  100% { background-position:400% 50%; }
}
@keyframes cbpHB {
  0%,80%,100% { opacity:.2; transform:scale(.7); }
  40%         { opacity:1;  transform:scale(1.3); }
}
@keyframes cbpBtnPulse {
  0%,100% { box-shadow:0 0 0 0 rgba(255,255,255,0); }
  50%     { box-shadow:0 0 0 6px rgba(255,255,255,.05); }
}
@keyframes cbpShake {
  0%,100% { transform:rotate(0); }
  18%     { transform:rotate(-12deg); }
  36%     { transform:rotate(12deg); }
  54%     { transform:rotate(-7deg); }
  72%     { transform:rotate(7deg); }
}
@keyframes cbpScaleOut {
  to { opacity:0; transform:scale(1.06); }
}
`;
    document.head.appendChild(s);
  }

  /* ── DOM ────────────────────────────────────────────────────────── */
  function _build() {
    if (document.getElementById('cbp-root')) return;
    const r = document.createElement('div');
    r.id = 'cbp-root';
    r.innerHTML = `
      <div id="cbp-vl">
        <video id="cbp-va" autoplay muted playsinline loop></video>
        <video id="cbp-vb" autoplay muted playsinline loop></video>
      </div>
      <div id="cbp-veil"></div>
      <div id="cbp-curtain"></div>
      <div id="cbp-shell">
        <div id="cbp-brand">
          <div class="cbp-name">Cabana</div>
          <div class="cbp-sub">Luxury Travel</div>
          <div class="cbp-iris"></div>
        </div>

        <div class="cbp-panel" id="cbp-proc">
          <div class="cbp-proc-title" id="cbp-proc-title">Check your phone.</div>
          <div class="cbp-proc-hint">Enter your M-Pesa PIN to confirm</div>
          <div class="cbp-amount" id="cbp-amount">KES 0</div>
          <div class="cbp-amount-desc" id="cbp-desc"></div>
          <div class="cbp-dots">
            <div class="cbp-dot"></div>
            <div class="cbp-dot"></div>
            <div class="cbp-dot"></div>
          </div>
          <button class="cbp-btn" id="cbp-cancel">Cancel</button>
        </div>

        <div class="cbp-panel" id="cbp-success">
          <div class="cbp-success-glyph">✦</div>
          <div class="cbp-success-title">You're booked.</div>
          <div class="cbp-success-msg">Pack light. Arrive boldly.<br>Your Cabana awaits.</div>
          <button class="cbp-btn" id="cbp-done">Continue →</button>
        </div>

        <div class="cbp-panel" id="cbp-fail">
          <div class="cbp-fail-glyph">🌀</div>
          <div class="cbp-fail-title">Oh. Well then.</div>
          <div class="cbp-fail-msg" id="cbp-fail-msg"></div>
          <button class="cbp-btn" id="cbp-retry">Try Again →</button>
        </div>

        <div id="cbp-foot">Secured via PayHero · M-Pesa</div>
      </div>`;
    document.body.appendChild(r);
    document.getElementById('cbp-cancel').onclick = () => ApatmentoPay.cancel();
    document.getElementById('cbp-done').onclick   = () => ApatmentoPay.close();
    document.getElementById('cbp-retry').onclick  = () => ApatmentoPay.retry();
  }

  /* ── Video engine ───────────────────────────────────────────────── */
  let _active = 'a';

  function _va() { return document.getElementById('cbp-va'); }
  function _vb() { return document.getElementById('cbp-vb'); }
  function _cur() { return _active === 'a' ? _va() : _vb(); }
  function _nxt() { return _active === 'a' ? _vb() : _va(); }

  function _loadVideo(src, loop = true) {
    const vl   = document.getElementById('cbp-vl');
    const next = _nxt();
    const curr = _cur();

    /* Show poster immediately — no black */
    const key = Object.keys(V).find(k => V[k] === src);
    if (key && vl) {
      vl.style.backgroundImage    = `url(${P[key]})`;
      vl.style.backgroundSize     = 'cover';
      vl.style.backgroundPosition = 'center top';
    }

    next.loop        = loop;
    next.src         = src;
    next.currentTime = 0;

    const showNext = () => {
      next.classList.add('cbp-show');
      /* Small delay then hide the old one — creates a beautiful cross-dissolve */
      setTimeout(() => { curr.classList.remove('cbp-show'); curr.src = ''; }, 1000);
      _active = _active === 'a' ? 'b' : 'a';
    };

    next.addEventListener('canplay', showNext, { once: true });
    next.play().catch(() => {});
    /* Fallback: if canplay doesn't fire in 2s (offline etc), show anyway */
    setTimeout(() => { if (!next.classList.contains('cbp-show')) showNext(); }, 2000);
  }

  /* ── Panels ─────────────────────────────────────────────────────── */
  function _panel(id) {
    ['cbp-proc','cbp-success','cbp-fail'].forEach(p => {
      document.getElementById(p)?.classList.remove('on');
    });
    if (id) document.getElementById(id)?.classList.add('on');
  }

  /* ── State transitions ──────────────────────────────────────────── */
  function _cut(fn) {
    const c = document.getElementById('cbp-curtain');
    c.classList.add('on');
    setTimeout(() => { fn(); c.classList.remove('on'); }, 380);
  }

  let _pollTimer = null;
  let _attempts  = 0;
  let _lastOpts  = null;

  function _setState(state, opts) {
    const veil = document.getElementById('cbp-veil');
    const foot = document.getElementById('cbp-foot');

    if (state === 'sending' || state === 'waiting') {
      const pick = Math.random() < .5 ? V.oldguy : V.swing;
      _loadVideo(pick, true);
      veil.classList.add('cbp-heavy');
      _panel('cbp-proc');
      document.getElementById('cbp-proc-title').textContent =
        state === 'sending' ? 'Sending your request…' : 'Check your phone.';
      document.getElementById('cbp-amount').textContent =
        'KES\u2009' + Number(opts.amount || 0).toLocaleString('en-KE');
      document.getElementById('cbp-desc').textContent = opts.description || '';
      foot.textContent = state === 'sending'
        ? 'Contacting M-Pesa · Please wait'
        : 'Enter your PIN · Awaiting confirmation';
      /* haptic nudge on mobile */
      try { navigator.vibrate && navigator.vibrate(10); } catch(_){}
    }

    if (state === 'success') {
      _loadVideo(V.suitcase, true); /* loop so it never freezes on last frame */
      veil.classList.remove('cbp-heavy');
      _panel('cbp-success');
      foot.textContent = 'Confirmation sent to your phone';
      try { navigator.vibrate && navigator.vibrate([30, 60, 30]); } catch(_){}
    }

    if (state === 'failed' || state === 'error') {
      _loadVideo(V.facepalm, true);
      veil.classList.add('cbp-heavy');
      _panel('cbp-fail');
      _failIdx = (_failIdx + 1) % FAIL_LINES.length;
      document.getElementById('cbp-fail-msg').textContent = FAIL_LINES[_failIdx];
      foot.textContent = state === 'error'
        ? 'Network error · Please retry'
        : 'Payment not completed · tap to retry';
      try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch(_){}
    }
  }

  /* ── Polling ────────────────────────────────────────────────────── */
  function _poll(opts) {
    if (_pollTimer) clearInterval(_pollTimer);
    _attempts = 0;
    _pollTimer = setInterval(async () => {
      _attempts++;
      if (_attempts > 40) {
        clearInterval(_pollTimer);
        _cut(() => _setState('failed', opts));
        opts.onFailure?.({ reason: 'timeout' });
        return;
      }
      try {
        const r = await fetch(
          `/api/check-payment-status?table=${opts.table}&reference=${encodeURIComponent(opts.reference)}`
        );
        const d = await r.json();
        if (d.status === 'paid' || d.status === 'paid_pending_checkin') {
          clearInterval(_pollTimer);
          _cut(() => _setState('success', opts));
          opts.onSuccess?.(d);
        } else if (d.status === 'failed') {
          clearInterval(_pollTimer);
          _cut(() => _setState('failed', opts));
          opts.onFailure?.(d);
        }
      } catch (_) { /* transient — keep polling */ }
    }, 3000);
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  window.ApatmentoPay = {
    start(opts) {
      _build();
      _lastOpts = opts;
      _attempts = 0;

      document.getElementById('cbp-root').classList.add('cbp-open');
      _cut(() => _setState('sending', opts));

      fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:      opts.amount,
          phone:       opts.phone,
          reference:   opts.reference,
          description: opts.description || 'Cabana Booking',
        }),
      })
        .then(r => r.json())
        .then(d => {
          if (!d.success) {
            _cut(() => _setState('error', {
              ...opts, errorMsg: d.error || 'PayHero request failed.'
            }));
            opts.onFailure?.(d);
            return;
          }
          _cut(() => _setState('waiting', opts));
          _poll(opts);
        })
        .catch(() => {
          _cut(() => _setState('error', {
            ...opts, errorMsg: 'Network error. Check your connection.'
          }));
          opts.onFailure?.({ reason: 'network' });
        });
    },

    cancel() {
      if (_pollTimer) clearInterval(_pollTimer);
      const r = document.getElementById('cbp-root');
      if (r) { r.style.animation = 'cbpScaleOut .5s ease forwards'; setTimeout(() => r.classList.remove('cbp-open'), 500); }
    },

    close() {
      if (_pollTimer) clearInterval(_pollTimer);
      const r = document.getElementById('cbp-root');
      if (r) { r.style.animation = 'cbpScaleOut .5s ease forwards'; setTimeout(() => { r.classList.remove('cbp-open'); r.style.animation = ''; }, 500); }
    },

    retry() {
      if (_lastOpts) { this.close(); setTimeout(() => this.start(_lastOpts), 120); }
    },
  };

})();
