/* ══════════════════════════════════════════════════════════════════════
   CABANA. Cinematic Payment Experience  v2.0
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
    "It's not you. The universe simply wasn't ready for how good you'd look at Cabana. Try again. Destiny is patient, your suite is not.",
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

/*  Desktop letterbox  ────────────────────────────────────────────────
    Every payment video is shot portrait (602x1072 … 1168x1728). On a
    landscape viewport, object-fit:cover scales them to fill the width
    and crops away almost the entire frame. The guest sees a sliver
    (an eye, a shoulder) instead of the scene. Mobile is portrait so it
    was never visible there.

    On wider-than-tall viewports the video is CONTAINed so the whole
    frame shows, and the already-loaded poster is reused as a blurred,
    over-scaled backdrop to fill the sides. No extra video decode, no
    black pillarbox.                                                     */
@media (min-aspect-ratio: 1/1) {
  #cbp-vl::before {
    content: '';
    position: absolute; inset: -8%;
    background-image: inherit;
    background-size: cover;
    background-position: center;
    filter: blur(42px) saturate(1.2) brightness(.5);
    transform: scale(1.15);
    z-index: 0;
  }
  #cbp-vl video {
    object-fit: contain;
    object-position: center;
    z-index: 1;
  }
  /* The layer's own cover-painted poster would show through unblurred
     around the contained video, so hide it behind the ::before wash. */
  #cbp-vl { background-color: #0b0b10; }
}

/* Very tall/narrow desktop windows behave like mobile. Keep cover. */
@media (min-aspect-ratio: 1/1) and (max-width: 720px) {
  #cbp-vl video { object-fit: cover; }
  #cbp-vl::before { display: none; }
}

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
  transition: opacity .5s cubic-bezier(.4,0,.2,1);
}
#cbp-curtain.on { opacity: 1; pointer-events: all; }


/*  Trip detail lines on the success panel  */
.cbp-trip-prop { display:block; font-family: Helvetica, Arial, sans-serif;
  font-weight:700; font-size:15px; letter-spacing:.16em; text-transform:uppercase;
  color:rgba(255,255,255,.97); margin-top:14px; }
.cbp-trip-loc  { display:block; font-size:13.5px; color:rgba(255,255,255,.76);
  margin-top:5px; letter-spacing:.02em; }
.cbp-trip-when { display:block; font-weight:600; font-size:15px;
  color:rgba(255,255,255,.93); margin-top:13px; letter-spacing:.03em; }
.cbp-trip-note { display:block; font-size:12px; letter-spacing:.13em;
  text-transform:uppercase; color:rgba(255,255,255,.62); margin-top:15px; }

.cbp-act-row { display:flex; gap:11px; align-items:center; justify-content:center;
  flex-wrap:wrap; margin-top:6px; }
.cbp-btn-share { border-color:rgba(255,255,255,.55) !important; }
.cbp-btn-share:hover { background:rgba(255,255,255,.13) !important; }

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
/*  Readability scrim  ─────────────────────────────────────────────
    The copy sits directly on footage that ranges from a bright pavement
    to a dark field, so neither a light nor a dark text colour worked on
    its own. A soft radial wash anchored behind the panel lifts contrast
    everywhere without hiding the video. The scene stays fully visible
    around the edges.                                                   */
.cbp-panel.on::before {
  content: '';
  position: absolute;
  left: 50%; top: 50%;
  width: 168%; height: 148%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse at center,
    rgba(6,6,12,.80) 0%,
    rgba(6,6,12,.66) 34%,
    rgba(6,6,12,.34) 62%,
    rgba(6,6,12,0)   82%);
  z-index: -1;
  pointer-events: none;
}
.cbp-panel { position: relative; }

/* Every line also carries its own shadow so it survives a bright frame. */
.cbp-proc-title, .cbp-success-title, .cbp-fail-title,
.cbp-amount, .cbp-amount-desc, .cbp-success-msg, .cbp-fail-msg,
.cbp-proc-sub, #cbp-foot { color: rgba(255,255,255,.86);
  text-shadow: 0 1px 3px rgba(0,0,0,.9), 0 3px 18px rgba(0,0,0,.75);
}

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
.cbp-amount-desc { color: rgba(255,255,255,.92);
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
#cbp-foot { color: rgba(255,255,255,.86);
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
          <div class="cbp-success-title">You're booked.</div>
          <div class="cbp-success-msg">Pack light. Arrive boldly.<br>Your Cabana awaits.</div>
          <div class="cbp-act-row">
            <button class="cbp-btn cbp-btn-share" id="cbp-share">Share this</button>
            <button class="cbp-btn" id="cbp-done">Continue →</button>
          </div>
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
    const shareBtn = document.getElementById('cbp-share');
    if (shareBtn) shareBtn.onclick = () => _shareCard(_lastOpts && _lastOpts.trip);
    document.getElementById('cbp-retry').onclick  = () => ApatmentoPay.retry();
  }

  /*  Shareable card
      Composites the live video frame with the guest's name and trip
      into a 1080x1920 story-shaped image, then hands it to the native
      share sheet (WhatsApp, Instagram, TikTok) with a download fallback.

      An image rather than a clip, deliberately: personalising the video
      itself would mean re-encoding on the device, and MediaRecorder
      only produces .webm, which Instagram and TikTok reject on iOS. A
      still posts everywhere instantly and is what people screenshot
      anyway.

      Carries no amounts. Ever. */

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  function _fmtDayShort(iso) {
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short' });
    } catch (_) { return iso || ''; }
  }

  async function _buildCard(trip) {
    const W = 1080, H = 1920;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    const vid = [_va(), _vb()].find(v => v && v.classList.contains('cbp-show') && v.videoWidth);
    if (vid) {
      const vr = vid.videoWidth / vid.videoHeight, cr = W / H;
      let sw, sh, sx, sy;
      if (vr > cr) { sh = vid.videoHeight; sw = sh * cr; sx = (vid.videoWidth - sw) / 2; sy = 0; }
      else         { sw = vid.videoWidth;  sh = sw / cr; sx = 0; sy = (vid.videoHeight - sh) / 2; }
      g.drawImage(vid, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      g.fillStyle = '#0b0b12'; g.fillRect(0, 0, W, H);
    }

    let grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    'rgba(6,6,14,.72)');
    grad.addColorStop(0.30, 'rgba(6,6,14,.18)');
    grad.addColorStop(0.58, 'rgba(6,6,14,.32)');
    grad.addColorStop(1,    'rgba(6,6,14,.92)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    const centre = (txt, y, font, fill, spacing) => {
      g.font = font; g.fillStyle = fill; g.textAlign = 'center';
      g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 26; g.shadowOffsetY = 3;
      if (spacing) {
        const chars = String(txt).split('');
        const total = chars.reduce((w, ch) => w + g.measureText(ch).width + spacing, -spacing);
        let x = W / 2 - total / 2;
        g.textAlign = 'left';
        chars.forEach(ch => { g.fillText(ch, x, y); x += g.measureText(ch).width + spacing; });
        g.textAlign = 'center';
      } else {
        g.fillText(txt, W / 2, y);
      }
      g.shadowBlur = 0; g.shadowOffsetY = 0;
    };

    centre('CABANA', 190, '600 62px Georgia, "Times New Roman", serif', '#fff', 18);
    centre('LUXURY TRAVEL', 246, '600 21px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.72)', 9);

    grad = g.createLinearGradient(W/2 - 90, 0, W/2 + 90, 0);
    grad.addColorStop(0, '#7B2FF7'); grad.addColorStop(.5, '#22D3EE'); grad.addColorStop(1, '#F472B6');
    g.fillStyle = grad; g.fillRect(W/2 - 90, 276, 180, 3);

    const name = trip.guestName || 'Traveller';
    centre(name + ', you\u2019re in.', 1140, 'italic 600 84px Georgia, serif', '#fff');
    centre(String(trip.property || '').toUpperCase(), 1250,
           '700 40px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.97)', 3);
    if (trip.location)
      centre(trip.location, 1310, '400 30px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.80)');

    if (trip.checkin && trip.checkout) {
      const when = _fmtDayShort(trip.checkin) + '   \u2192   ' + _fmtDayShort(trip.checkout);
      centre(when, 1408, '600 34px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.94)');
      const meta = [
        trip.nights ? trip.nights + (trip.nights > 1 ? ' nights' : ' night') : null,
        trip.guests ? trip.guests + (trip.guests > 1 ? ' guests'  : ' guest') : null,
      ].filter(Boolean).join('   \u00b7   ');
      if (meta) centre(meta, 1462, '400 26px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.72)', 2);
    }

    const now = new Date();
    const stamp = 'BOOKED ' + now.toLocaleDateString('en-KE',
                    { day:'numeric', month:'short', year:'numeric' }).toUpperCase()
                + '  \u00b7  ' + now.toLocaleTimeString('en-KE',
                    { hour:'2-digit', minute:'2-digit', hour12:false });
    centre(stamp, 1700, '600 23px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.62)', 4);
    centre('cabana.africa', 1790, '600 26px Helvetica, Arial, sans-serif', 'rgba(255,255,255,.80)', 3);

    return new Promise(res => cv.toBlob(res, 'image/png', 0.95));
  }

  async function _shareCard(trip) {
    const btn = document.getElementById('cbp-share');
    const was = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true; }
    try {
      const blob = await _buildCard(trip || {});
      if (!blob) throw new Error('no blob');
      const file = new File([blob], 'cabana-booking.png', { type: 'image/png' });
      const text = (trip && trip.property)
        ? 'Booked ' + trip.property + ' on Cabana'
        : 'Booked on Cabana';
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, title: 'Cabana' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'cabana-booking.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') console.warn('[share]', e.message);
    } finally {
      if (btn) { btn.textContent = was || 'Share this'; btn.disabled = false; }
    }
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

    /* Show poster immediately, no black */
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
      /* Small delay then hide the old one. Creates a beautiful cross-dissolve */
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
  /* Hold the curtain until the incoming video can actually paint.
     Previously it lifted on a fixed 380 ms timer while the new clip was
     still decoding, so the swing/facepalm/suitcase change flashed the
     old frame, a black gap, or a stalled first frame. Now the curtain
     stays down until the next <video> reports it can play (or 2.2 s
     passes, so a slow network can never strand the guest). */
  function _cut(fn) {
    const c = document.getElementById('cbp-curtain');
    c.classList.add('on');

    setTimeout(() => {
      fn();

      const vids = [document.getElementById('cbp-va'),
                    document.getElementById('cbp-vb')].filter(Boolean);
      let done = false;
      const lift = () => {
        if (done) return;
        done = true;
        vids.forEach(v => v.removeEventListener('canplay', lift));
        /* One frame of settle so the poster/video swap is committed
           before the curtain starts fading. */
        requestAnimationFrame(() => setTimeout(() => c.classList.remove('on'), 60));
      };

      const ready = vids.some(v => v.readyState >= 3 && v.classList.contains('cbp-show'));
      if (ready) return lift();

      vids.forEach(v => v.addEventListener('canplay', lift, { once: true }));
      setTimeout(lift, 2200);          // hard fallback
    }, 380);
  }

  let _pollTimer = null;
  let _attempts  = 0;
  let _lastOpts  = null;

  function _setState(state, opts) {
    const veil = document.getElementById('cbp-veil');
    const foot = document.getElementById('cbp-foot');

    if (state === 'sending' || state === 'waiting') {
      _loadVideo(V.swing, true);
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
      /* What the guest sees here is the surface they screenshot, so it
         leads with the trip, never the money. Someone who has paid a
         holding amount and someone who paid in full get the same proud
         card; only the private panel behind Continue discusses balances.
         Nobody is embarrassed by a screenshot of their own booking. */
      const st   = (opts && opts.result && opts.result.status) || '';
      const trip = (opts && opts.trip) || {};
      const tEl  = document.querySelector('.cbp-success-title');
      const mEl  = document.querySelector('.cbp-success-msg');

      const fmtDay = iso => {
        try {
          const d = new Date(iso + 'T00:00:00');
          return d.toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short' });
        } catch (_) { return iso || ''; }
      };

      if (tEl && mEl) {
        /* `holds_dates` comes straight from the inventory table: it is
           true only when a row in listing_holds actually exists for this
           booking. It is never inferred from the status string and never
           from the amount, because those are what lied before. A KES 10
           instalment on a KES 2,300 stay used to print "Dates held" while
           holding nothing at all, and the guest had no way to know the
           room was still on sale behind them. */
        const r     = (opts && opts.result) || {};
        const held  = r.holds_dates === true;
        const lost  = r.dates_lost  === true;
        const short = Math.max(0, Number(r.shortfall_to_confirm || 0));
        const due   = Math.max(0, Number(r.outstanding || 0));
        const cred  = Math.max(0, Number(r.credited || 0));
        const kes   = n => 'KES\u2009' + Math.round(n).toLocaleString('en-KE');

        const name  = trip.guestName ? trip.guestName + ', ' : '';
        const where = trip.property || 'Your stay';
        const when  = trip.checkin && trip.checkout
          ? fmtDay(trip.checkin) + ' \u2192 ' + fmtDay(trip.checkout)
          : '';
        const nn = trip.nights ? trip.nights + (trip.nights > 1 ? ' nights' : ' night') : '';

        /* The headline follows the calendar, not the transaction. Only a
           guest who actually holds their nights is told they are in. */
        let headline, note, tone;

        if (lost) {
          headline = name + 'these dates just went.';
          note = cred > 0
            ? 'Someone completed their deposit first \u00b7 your ' + kes(cred)
              + ' is now credit and never expires'
            : 'Someone completed their deposit first \u00b7 nothing was charged';
          tone = 'lost';

        } else if (r.fully_paid === true || st === 'paid_pending_checkin') {
          headline = name + 'you\u2019re in.';
          note = 'Paid in full \u00b7 your check-in code is ready';
          tone = 'settled';

        } else if (held) {
          headline = name + 'you\u2019re in.';
          note = 'Dates held \u00b7 ' + kes(due) + ' before your code unlocks';
          tone = 'held';

        } else {
          /* Below the deposit. The money is real and it counts toward the
             stay, but it has not bought the calendar, and saying it has is
             how a guest arrives to find the room gone. */
          headline = name + 'that\u2019s a start.';
          note = short > 0
            ? kes(short) + ' more secures these dates \u00b7 not held yet'
            : 'These dates are not held yet \u00b7 finish up inside';
          tone = 'open';
        }

        tEl.textContent = headline.charAt(0).toUpperCase() + headline.slice(1);
        mEl.innerHTML =
            '<span class="cbp-trip-prop">' + _esc(where) + '</span>'
          + (trip.location ? '<span class="cbp-trip-loc">' + _esc(trip.location) + '</span>' : '')
          + (when ? '<span class="cbp-trip-when">' + when + (nn ? '  \u00b7  ' + nn : '') + '</span>' : '')
          + '<span class="cbp-trip-note cbp-note-' + tone + '">' + _esc(note) + '</span>';
      }

      _loadVideo(V.suitcase, true); /* loop so it never freezes on last frame */
      veil.classList.remove('cbp-heavy');
      _panel('cbp-success');
      foot.textContent = (opts && opts.result && opts.result.dates_lost)
        ? 'Your credit is in your account \u00b7 pick new dates any time'
        : 'Confirmation sent to your phone';
      try { navigator.vibrate && navigator.vibrate([30, 60, 30]); } catch(_){}
    }

    if (state === 'failed' || state === 'error') {
      _loadVideo(V.facepalm, true);
      veil.classList.add('cbp-heavy');
      _panel('cbp-fail');
      /* If PayHero told us WHY, say so plainly, "not enough M-Pesa
         balance" is far more useful than a witty line. The rotating
         copy is only for when we genuinely do not know. */
      if (opts && opts.failureReason) {
        document.getElementById('cbp-fail-msg').textContent = opts.failureReason;
      } else {
        _failIdx = (_failIdx + 1) % FAIL_LINES.length;
        document.getElementById('cbp-fail-msg').textContent = FAIL_LINES[_failIdx];
      }
      foot.textContent = state === 'error'
        ? 'Network error · Please retry'
        : 'Payment not completed · tap to retry';
      try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch(_){}
    }
  }

  /* ── Polling ────────────────────────────────────────────────────── */
  async function _accessToken() {
    const cached = window.ApaSession?.peekSession?.();
    if (cached?.access_token) return cached.access_token;
    const client = window.ApaSession?.client?.() || window.sb || window.__chSb;
    if (!client?.auth?.getSession) return '';
    try {
      const { data } = await client.auth.getSession();
      return data?.session?.access_token || '';
    } catch (_) { return ''; }
  }

  function _poll(opts) {
    if (_pollTimer) clearInterval(_pollTimer);
    _attempts = 0;
    _pollTimer = setInterval(async () => {
      _attempts++;
      /* Show a live countdown in the footer. Guests had no idea how long
         to wait. Timeout is 60 s (20 × 3 s polls) after which the
         facepalm video plays and they can retry. */
      const _remaining = Math.max(0, 23 - _attempts) * 2;
      const _foot = document.getElementById('cbp-foot');
      if (_foot && _remaining > 0) {
        _foot.textContent = `Enter your PIN  ·  ${_remaining}s`;
      }
      if (_attempts > 23) {
        clearInterval(_pollTimer);
        _cut(() => _setState('failed', opts));
        opts.onFailure?.({ reason: 'timeout' });
        return;
      }
      try {
        /* Direct PayHero query, no callback dependency.
           /api/poll-payment asks PayHero's own transaction status API
           using the CheckoutRequestID stored at push time, then writes
           the DB itself. Previously we waited for PayHero to call our
           callback URL; those calls never arrived (domain not whitelisted
           or Vercel env vars missing), leaving every payment at 'pending'
           regardless of whether the guest had paid. */
        const pollRef = opts.pollRef || opts.reference;
        const r = await fetch(`/api/poll-payment?ref=${encodeURIComponent(pollRef)}`, {
          headers: { Authorization: `Bearer ${opts.accessToken || ''}` },
        });
        let d = await r.json().catch(() => ({}));
        /* Any non-pending, non-failed status = money cleared. */
        /* 'dates_unavailable' is terminal too. The money cleared; the
           calendar did not. Without it here the poller ran to timeout and
           showed the facepalm video for a payment that actually succeeded
           and has already been converted to credit. */
        if (d.status === 'paid' || d.status === 'paid_pending_checkin'
            || d.status === 'confirmed_balance_due' || d.status === 'part_paid'
            || d.status === 'dates_unavailable') {
          clearInterval(_pollTimer);
          opts.result = d;
          _cut(() => _setState('success', opts));
          opts.onSuccess?.(d);
        } else if (d.status === 'failed') {
          /* PayHero has told us the transaction is dead. Insufficient
             balance, wrong PIN, cancelled. Cut straight to the failure
             screen rather than letting the clock run out. */
          clearInterval(_pollTimer);
          if (d.reason) opts.failureReason = d.reason;
          _cut(() => _setState('failed', opts));
          opts.onFailure?.(d);
        }
      } catch (_) { /* transient. Keep polling */ }
    }, 2000);
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  window.ApatmentoPay = {
    async start(opts) {
      _build();
      _lastOpts = opts;
      _attempts = 0;

      document.getElementById('cbp-root').classList.add('cbp-open');
      _cut(() => _setState('sending', opts));

      opts.accessToken = opts.accessToken || await _accessToken();
      if (!opts.accessToken) {
        _cut(() => _setState('error', {
          ...opts, errorMsg: 'Please sign in again before starting payment.'
        }));
        opts.onFailure?.({ error: 'authentication_required' });
        return;
      }

      fetch('/api/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.accessToken}`,
        },
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
          /* stk-push returns the per-instalment reference (…-P1, -P2).
             Poll that, not the booking reference. */
          if (d.reference) opts.pollRef = d.reference;
          if (d.amount)    opts.chargedAmount = d.amount;
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

  /* ── The name the rebrand left behind ────────────────────────────
     booking-confirm.html calls CabanaPay.start(). Nothing in the
     repository has ever defined CabanaPay: this file and payment.js
     both export ApatmentoPay, and a comment in booking-confirm even
     claims payment.js "also defines window.CabanaPay", which it does
     not. So every Pay button on the stays checkout threw
     "CabanaPay is not defined", the surrounding try/catch turned it
     into a toast, and the booking row that had already been inserted
     was stranded at pending_payment. That is why the two most recent
     bookings in the database are identical rows seven seconds apart:
     someone pressed Pay, saw an error, and pressed it again.

     Both names now point at the same object. */
  window.CabanaPay = window.ApatmentoPay;

})();
