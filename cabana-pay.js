/* ══════════════════════════════════════════════════════════════════════
   CABANA — Cinematic Payment Experience
   Drop-in replacement for ApatmentoPay overlay.
   Exposes the exact same API: ApatmentoPay.start(opts), .cancel(), .close()

   States driven by video:
     loading/home  → bedroom ↔ sofa girl (site splash)
     processing    → old guy ↔ swing guy (waiting for M-Pesa PIN)
     success       → suitcase lady (payment confirmed)
     failed        → facepalm guy (payment declined)
══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Font injection ─────────────────────────────────────────── */
  const _fontLink = document.createElement('link');
  _fontLink.rel  = 'stylesheet';
  _fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@100;200;300;400;500&display=swap';
  document.head.appendChild(_fontLink);

  /* ── CSS ────────────────────────────────────────────────────── */
  const _style = document.createElement('style');
  _style.textContent = `
  /* ── Reset scoped to cabana-pay ── */
  #cbp-root *, #cbp-root *::before, #cbp-root *::after {
    box-sizing: border-box; margin: 0; padding: 0;
  }

  /* ── Root overlay ── */
  #cbp-root {
    position: fixed; inset: 0; z-index: 99999;
    font-family: 'Montserrat', sans-serif;
    display: none; /* shown via .cbp-open */
  }
  #cbp-root.cbp-open { display: block; }

  /* ── Full-bleed video layer ── */
  .cbp-video-layer {
    position: absolute; inset: 0; overflow: hidden;
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
  }
  .cbp-video-layer video {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center top;
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  .cbp-video-layer video.cbp-hidden { opacity: 0 !important; pointer-events: none; }

  /* gradient veil */
  .cbp-veil {
    position: absolute; inset: 0; z-index: 2;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,.28) 0%,
      rgba(0,0,0,.04) 35%,
      rgba(0,0,0,.04) 60%,
      rgba(0,0,0,.62) 100%
    );
  }
  /* heavier veil for processing & failed states */
  .cbp-veil-heavy {
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,.5) 0%,
      rgba(0,0,0,.28) 40%,
      rgba(0,0,0,.28) 60%,
      rgba(0,0,0,.72) 100%
    ) !important;
  }

  /* ── Content shell ── */
  .cbp-shell {
    position: absolute; inset: 0; z-index: 10;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    padding: clamp(40px, 8vh, 72px) clamp(20px, 6vw, 48px) clamp(44px, 9vh, 80px);
  }

  /* ── Brand mark ── */
  .cbp-brand {
    text-align: center;
    animation: cbpFadeDown .9s ease both;
  }
  .cbp-brand-name {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 300;
    font-size: clamp(30px, 6vw, 52px);
    letter-spacing: 14px;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 0 0 60px rgba(255,255,255,.18);
    line-height: 1;
  }
  .cbp-brand-sub {
    font-size: 8px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(255,255,255,.45);
    margin-top: 7px;
    font-weight: 200;
  }
  .cbp-iris {
    width: 48px; height: 1.5px;
    margin: 10px auto 0;
    background: linear-gradient(90deg, #7DF9FF, #FF6EFF, #FFE14D, #7DF9FF);
    background-size: 300%;
    animation: cbpShimmer 3.2s linear infinite;
  }

  /* ── State panels ── */
  .cbp-panel {
    display: none;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    width: 100%;
    max-width: 420px;
    animation: cbpFadeUp .8s ease both;
  }
  .cbp-panel.cbp-active { display: flex; }

  /* ── Processing panel ── */
  .cbp-proc-title {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-weight: 300;
    font-size: clamp(22px, 4.5vw, 34px);
    color: #fff;
    letter-spacing: 1px;
    line-height: 1.3;
  }
  .cbp-proc-sub {
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,.65);
    font-weight: 200;
  }
  .cbp-amount-badge {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 300;
    font-size: clamp(32px, 6vw, 48px);
    color: #fff;
    letter-spacing: 2px;
    text-shadow: 0 2px 30px rgba(0,0,0,.4);
  }
  .cbp-amount-label {
    font-size: 9px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,.5);
    font-weight: 200;
    margin-top: -8px;
  }
  /* breathing dots */
  .cbp-dots {
    display: flex; gap: 9px; align-items: center;
  }
  .cbp-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,.7);
    animation: cbpPulse 1.5s ease-in-out infinite;
  }
  .cbp-dot:nth-child(2) { animation-delay: .22s; }
  .cbp-dot:nth-child(3) { animation-delay: .44s; }

  /* glass cancel button */
  .cbp-glass-btn {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.25);
    color: rgba(255,255,255,.7);
    font-family: 'Montserrat', sans-serif;
    font-size: 9px;
    font-weight: 300;
    letter-spacing: 5px;
    text-transform: uppercase;
    padding: 13px 28px;
    cursor: pointer;
    border-radius: 2px;
    transition: all .35s ease;
    backdrop-filter: blur(6px);
  }
  .cbp-glass-btn:hover {
    background: rgba(255,255,255,.16);
    border-color: rgba(255,255,255,.55);
    color: #fff;
    transform: translateY(-1px);
  }

  /* ── Success panel ── */
  .cbp-success-icon {
    font-size: 28px;
    color: #fff;
    animation: cbpPopIn .7s cubic-bezier(.34,1.56,.64,1) .2s both;
  }
  .cbp-success-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 300;
    font-size: clamp(28px, 5.5vw, 44px);
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #fff;
  }
  .cbp-success-msg {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: clamp(15px, 3vw, 22px);
    color: rgba(255,255,255,.75);
    line-height: 1.55;
    max-width: 300px;
  }

  /* ── Failed panel ── */
  .cbp-fail-icon {
    font-size: 34px;
    animation: cbpShake .65s ease .1s both;
  }
  .cbp-fail-title {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 300;
    font-size: clamp(24px, 5vw, 38px);
    letter-spacing: 3px;
    color: #fff;
  }
  .cbp-fail-msg {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: clamp(13px, 2.8vw, 19px);
    color: rgba(255,255,255,.72);
    line-height: 1.6;
    max-width: 320px;
  }

  /* ── Footer line ── */
  .cbp-footer {
    font-size: 8px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,.22);
    animation: cbpFadeUp 1.2s ease .8s both;
    text-align: center;
  }

  /* ── Transition overlay (black flash between states) ── */
  #cbp-curtain {
    position: absolute; inset: 0; z-index: 50;
    background: #000;
    opacity: 0; pointer-events: none;
    transition: opacity .45s ease;
  }
  #cbp-curtain.cbp-closing { opacity: 1; pointer-events: all; }

  /* ── Keyframes ── */
  @keyframes cbpFadeDown {
    from { opacity: 0; transform: translateY(-14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cbpFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cbpPopIn {
    from { opacity: 0; transform: scale(.4) rotate(-10deg); }
    to   { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes cbpShimmer {
    0%   { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes cbpPulse {
    0%,80%,100% { opacity: .2; transform: scale(.75); }
    40%         { opacity: 1;  transform: scale(1.25); }
  }
  @keyframes cbpShake {
    0%,100% { transform: rotate(0deg); }
    20%     { transform: rotate(-10deg); }
    40%     { transform: rotate(10deg); }
    60%     { transform: rotate(-6deg); }
    80%     { transform: rotate(6deg); }
  }
  `;
  document.head.appendChild(_style);

  /* ── Sarcastic failure messages ─────────────────────────────── */
  const _failMsgs = [
    "It's not you. The universe simply wasn't ready for how good you'd look arriving at Cabana. Try again — destiny is patient, your suite is not.",
    "The payment gods looked down, shrugged, and went back to lunch. Rude of them. One more try.",
    "Technically, M-Pesa blinked. Spiritually, this is a sign you should try again immediately.",
    "Your money wanted to arrive. It just got lost en route. Help it find home.",
    "Not declined. Cosmically postponed. The suite still has your name on it.",
    "Mercury's in retrograde. Your booking is not. Try again before the planets realign against you.",
    "We asked M-Pesa nicely. It said 'maybe later.' You say 'right now.' We're on your side.",
  ];
  let _failIdx = 0;

  /* ── Video sources + poster frames ──────────────────────────── */
  const _VIDS = {
    oldguy:   '/cabana-vid-oldguy.mp4',
    sofa:     '/cabana-vid-sofa.mp4',
    suitcase: '/cabana-vid-suitcase.mp4',
    bedroom:  '/cabana-vid-bedroom.mp4',
    swing:    '/cabana-vid-swing.mp4',
    facepalm: '/cabana-vid-facepalm.mp4',
  };
  const _POSTERS = {
    oldguy:   '/cabana-poster-oldguy.jpg',
    sofa:     '/cabana-poster-sofa.jpg',
    suitcase: '/cabana-poster-suitcase.jpg',
    bedroom:  '/cabana-poster-bedroom.jpg',
    swing:    '/cabana-poster-swing.jpg',
    facepalm: '/cabana-poster-facepalm.jpg',
  };

  /* ── DOM construction ───────────────────────────────────────── */
  function _buildDOM() {
    if (document.getElementById('cbp-root')) return;

    const root = document.createElement('div');
    root.id = 'cbp-root';
    root.innerHTML = `
      <!-- Video layer: single video element, src swapped per state -->
      <div class="cbp-video-layer" id="cbp-vl">
        <video id="cbp-vid-a" autoplay muted playsinline loop></video>
        <video id="cbp-vid-b" autoplay muted playsinline loop class="cbp-hidden"></video>
        <div class="cbp-veil" id="cbp-veil"></div>
      </div>

      <!-- Black curtain for state transitions -->
      <div id="cbp-curtain"></div>

      <!-- UI shell -->
      <div class="cbp-shell">

        <!-- Brand top -->
        <div class="cbp-brand">
          <div class="cbp-brand-name">Cabana</div>
          <div class="cbp-brand-sub">Luxury Travel</div>
          <div class="cbp-iris"></div>
        </div>

        <!-- PROCESSING panel -->
        <div class="cbp-panel" id="cbp-panel-proc">
          <div class="cbp-proc-title" id="cbp-proc-title">Check your phone.</div>
          <div class="cbp-proc-sub">Enter your M-Pesa PIN to confirm</div>
          <div class="cbp-amount-badge" id="cbp-amount">KES 0</div>
          <div class="cbp-amount-label" id="cbp-amount-label">Total</div>
          <div class="cbp-dots">
            <div class="cbp-dot"></div>
            <div class="cbp-dot"></div>
            <div class="cbp-dot"></div>
          </div>
          <button class="cbp-glass-btn" id="cbp-cancel-btn">Cancel →</button>
        </div>

        <!-- SUCCESS panel -->
        <div class="cbp-panel" id="cbp-panel-success">
          <div class="cbp-success-icon">✦</div>
          <div class="cbp-success-title">You're booked.</div>
          <div class="cbp-success-msg">Pack light. Arrive boldly.<br>Your Cabana awaits.</div>
          <button class="cbp-glass-btn" id="cbp-done-btn">Continue →</button>
        </div>

        <!-- FAILED panel -->
        <div class="cbp-panel" id="cbp-panel-fail">
          <div class="cbp-fail-icon">🌀</div>
          <div class="cbp-fail-title">Oh. Well then.</div>
          <div class="cbp-fail-msg" id="cbp-fail-msg">
            It's not you. The universe simply wasn't ready for how good you'd look arriving at Cabana.
          </div>
          <button class="cbp-glass-btn" id="cbp-retry-btn">Try Again →</button>
        </div>

        <!-- Footer -->
        <div class="cbp-footer" id="cbp-footer">Secured via PayHero · M-Pesa</div>

      </div>
    `;
    document.body.appendChild(root);

    /* Wire buttons */
    document.getElementById('cbp-cancel-btn').onclick = () => ApatmentoPay.cancel();
    document.getElementById('cbp-done-btn').onclick   = () => ApatmentoPay.close();
    document.getElementById('cbp-retry-btn').onclick  = () => ApatmentoPay.retry();
  }

  /* ── Video crossfade engine ─────────────────────────────────── */
  let _activeVideo  = 'a';   // 'a' or 'b'
  let _xfadeTimer   = null;
  let _procVidIdx   = 0;     // cycles between oldguy & swing
  let _procXfadeInt = null;

  function _getVid(id) { return document.getElementById('cbp-vid-' + id); }

  function _crossfadeTo(src, loop = true) {
    const curr  = _activeVideo;
    const next  = curr === 'a' ? 'b' : 'a';
    const vNext = _getVid(next);
    const vl    = document.getElementById('cbp-vl');

    // Find poster key from src path
    const posterKey = Object.keys(_VIDS).find(k => _VIDS[k] === src);
    if (posterKey && vl) {
      vl.style.backgroundImage = 'url(' + _POSTERS[posterKey] + ')';
      vl.style.backgroundSize  = 'cover';
      vl.style.backgroundPosition = 'center top';
    }

    vNext.style.opacity = '0';
    vNext.style.transition = 'opacity 0.6s ease';
    vNext.src  = src;
    vNext.loop = loop;
    vNext.currentTime = 0;
    vNext.play().catch(() => {});

    // Fade video in once buffered — poster stays visible until then
    vNext.addEventListener('canplay', function onCanPlay() {
      vNext.removeEventListener('canplay', onCanPlay);
      vNext.style.opacity = '1';
    });

    _getVid(curr).classList.add('cbp-hidden');
    _getVid(curr).style.opacity = '0';
    vNext.classList.remove('cbp-hidden');
    _activeVideo = next;
  }

  function _startProcCycle() {
    _stopProcCycle();
    // Each payment attempt randomly picks one of the two waiting videos and plays it fully in loop
    const srcs = [_VIDS.oldguy, _VIDS.swing];
    const pick = srcs[Math.floor(Math.random() * srcs.length)];
    _crossfadeTo(pick, true);
  }

  function _stopProcCycle() {
    if (_procXfadeInt) { clearInterval(_procXfadeInt); _procXfadeInt = null; }
  }

  /* ── State machine ──────────────────────────────────────────── */
  let _currentState = null;
  let _lastOpts     = null;
  let _pollInterval = null;
  let _pollAttempts = 0;
  const MAX_POLL    = 40; // ~2 min

  function _showPanel(id) {
    ['proc', 'success', 'fail'].forEach(p => {
      document.getElementById('cbp-panel-' + p)?.classList.remove('cbp-active');
    });
    if (id) document.getElementById('cbp-panel-' + id)?.classList.add('cbp-active');
  }

  function _transition(fn) {
    /* Dip to black between states for that cinematic cut feel */
    const curtain = document.getElementById('cbp-curtain');
    curtain.classList.add('cbp-closing');
    setTimeout(() => {
      fn();
      curtain.classList.remove('cbp-closing');
    }, 440);
  }

  function _setState(state, opts) {
    const veil   = document.getElementById('cbp-veil');
    const footer = document.getElementById('cbp-footer');

    _currentState = state;

    if (state === 'sending') {
      _startProcCycle();
      veil.classList.add('cbp-veil-heavy');
      _showPanel('proc');
      document.getElementById('cbp-proc-title').textContent = 'Sending your request…';
      document.getElementById('cbp-amount').textContent = 'KES ' + (opts.amount || 0).toLocaleString();
      document.getElementById('cbp-amount-label').textContent = opts.description || 'Total';
      footer.textContent = 'Contacting M-Pesa · Please wait';
    }

    if (state === 'waiting') {
      _startProcCycle();
      veil.classList.add('cbp-veil-heavy');
      _showPanel('proc');
      document.getElementById('cbp-proc-title').textContent = 'Check your phone.';
      document.getElementById('cbp-amount').textContent = 'KES ' + (opts.amount || 0).toLocaleString();
      document.getElementById('cbp-amount-label').textContent = opts.description || 'Total';
      footer.textContent = 'Enter your PIN · Awaiting confirmation';
    }

    if (state === 'success') {
      _stopProcCycle();
      _crossfadeTo(_VIDS.suitcase, false); // plays once
      veil.classList.remove('cbp-veil-heavy');
      _showPanel('success');
      footer.textContent = 'Confirmation sent to your phone';
    }

    if (state === 'failed') {
      _stopProcCycle();
      _crossfadeTo(_VIDS.facepalm, true);
      veil.classList.add('cbp-veil-heavy');
      _showPanel('fail');
      _failIdx = (_failIdx + 1) % _failMsgs.length;
      document.getElementById('cbp-fail-msg').textContent = _failMsgs[_failIdx];
      footer.textContent = 'Payment not completed · ref: ' + (opts.reference || '—');
    }

    if (state === 'error') {
      _stopProcCycle();
      _crossfadeTo(_VIDS.facepalm, true);
      veil.classList.add('cbp-veil-heavy');
      _showPanel('fail');
      document.getElementById('cbp-fail-msg').textContent =
        opts.errorMsg || 'Couldn\'t reach PayHero. Check your connection and try again.';
      footer.textContent = 'Network error · Please retry';
    }
  }

  /* ── Polling ────────────────────────────────────────────────── */
  function _startPolling(opts) {
    if (_pollInterval) clearInterval(_pollInterval);
    _pollAttempts = 0;

    _pollInterval = setInterval(async () => {
      _pollAttempts++;

      if (_pollAttempts > MAX_POLL) {
        clearInterval(_pollInterval);
        _transition(() => _setState('failed', {
          ...opts,
          errorMsg: 'Payment timed out. If money was deducted, WhatsApp us on +254 716 206 494 with your reference.'
        }));
        if (opts.onFailure) opts.onFailure({ reason: 'timeout' });
        return;
      }

      try {
        const res  = await fetch(`/api/check-payment-status?table=${opts.table}&reference=${encodeURIComponent(opts.reference)}`);
        const data = await res.json();

        if (data.status === 'paid' || data.status === 'paid_pending_checkin') {
          clearInterval(_pollInterval);
          _transition(() => _setState('success', opts));
          if (opts.onSuccess) opts.onSuccess(data);
        } else if (data.status === 'failed') {
          clearInterval(_pollInterval);
          _transition(() => _setState('failed', opts));
          if (opts.onFailure) opts.onFailure(data);
        }
        /* else: still pending — keep polling */
      } catch (e) {
        /* transient network hiccup — keep polling */
        console.warn('[cabana-pay] poll error (non-fatal):', e.message);
      }
    }, 3000);
  }

  /* ── Public API — mirrors ApatmentoPay exactly ──────────────── */
  window.ApatmentoPay = {

    start(opts) {
      _buildDOM();
      _lastOpts = opts;
      _pollAttempts = 0;

      const root = document.getElementById('cbp-root');
      root.classList.add('cbp-open');

      /* Kick off with processing videos immediately */
      _transition(() => _setState('sending', opts));

      /* Fire STK push */
      fetch('/api/stk-push', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:      opts.amount,
          phone:       opts.phone,
          reference:   opts.reference,
          description: opts.description || 'Cabana Booking',
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (!data.success) {
            _transition(() => _setState('error', { ...opts, errorMsg: data.error || 'PayHero request failed.' }));
            if (opts.onFailure) opts.onFailure(data);
            return;
          }
          /* STK sent — switch to "waiting" state and start polling */
          _transition(() => _setState('waiting', opts));
          _startPolling(opts);
        })
        .catch(err => {
          _transition(() => _setState('error', { ...opts, errorMsg: 'Network error. Please check your connection.' }));
          if (opts.onFailure) opts.onFailure(err);
        });
    },

    cancel() {
      if (_pollInterval) clearInterval(_pollInterval);
      _stopProcCycle();
      const root = document.getElementById('cbp-root');
      if (root) root.classList.remove('cbp-open');
    },

    close() {
      if (_pollInterval) clearInterval(_pollInterval);
      _stopProcCycle();
      const root = document.getElementById('cbp-root');
      if (root) root.classList.remove('cbp-open');
    },

    retry() {
      if (_lastOpts) {
        this.close();
        setTimeout(() => this.start(_lastOpts), 120);
      }
    },
  };

})();
