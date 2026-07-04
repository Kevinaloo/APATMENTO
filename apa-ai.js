/* ════════════════════════════════════════════════════════════════
   APA v2 — Apatmento's Proactive AI Concierge
   
   BEHAVIOUR ENGINE:
   - Tracks page dwell time, scroll depth, clicks, hovers
   - Analyses intent from URL params, service page, listing viewed
   - Fires proactive messages at the PERFECT psychological moment
   - Never annoying — learns optimal engagement timing per user
   - Remembers every session detail and builds a profile
   
   ENGAGEMENT MODEL:
   1. Silent observation for first 8-15s (configurable by page type)
   2. If high-intent signal: proactive nudge within 20s
   3. If low-intent: wait until scroll depth >60% or 45s
   4. Converts hover/click patterns into booking suggestions
   5. Fades in a teaser message before full open
════════════════════════════════════════════════════════════════ */
const ApaAI = (() => {
  /* ── State ─────────────────────────────────────────────────── */
  let _open = false, _initialized = false, _engaged = false;
  let _messages = [], _userCtx = {}, _profile = {};
  let _listening = false, _recognition = null, _vadTimer = null;
  let _proactiveTimer = null, _teaserTimer = null;
  let _scrollDepth = 0, _clickCount = 0, _hoverTargets = new Set();
  let _pageEnterTime = Date.now(), _lastActivity = Date.now();
  let _teaserShown = false, _proactiveCount = 0;

  /* ── Page intelligence ──────────────────────────────────────── */
  const PAGE_INTEL = {
    'apartments':  { service:'stays',    icon:'🏠', wait:12, highIntent:['price','beds','location'] },
    'booking-confirm': { service:'booking', icon:'💳', wait:5, highIntent:['checkin','checkout','name'] },
    'roommates':   { service:'roommates',icon:'🤝', wait:15, highIntent:['type','area'] },
    'tours':       { service:'tours',    icon:'🦁', wait:14, highIntent:['date','guests'] },
    'events':      { service:'events',   icon:'🎟', wait:18, highIntent:['date'] },
    'carhire':     { service:'carhire',  icon:'🚗', wait:12, highIntent:['type','days'] },
    'food':        { service:'food',     icon:'🍽', wait:8,  highIntent:['cuisine'] },
    'dashboard':   { service:'browse',   icon:'✨', wait:45, highIntent:[] },
    'index':       { service:'landing',  icon:'🚀', wait:30, highIntent:[] },
  };

  function getPageType() {
    const path = location.pathname.replace(/.*\//, '').replace('.html', '');
    for (const [key, val] of Object.entries(PAGE_INTEL)) {
      if (path.includes(key)) return { key, ...val };
    }
    return { key:'other', service:'general', icon:'💬', wait:30, highIntent:[] };
  }

  /* ── Behaviour tracking ────────────────────────────────────── */
  function initBehaviourTracking() {
    // Scroll depth
    window.addEventListener('scroll', () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (pct > _scrollDepth) {
        _scrollDepth = pct;
        _lastActivity = Date.now();
        checkProactiveEngagement();
      }
    }, { passive: true });

    // Click tracking — what they're interested in
    document.addEventListener('click', e => {
      _clickCount++;
      _lastActivity = Date.now();
      const t = e.target.closest('[data-type],[class*="card"],[class*="tile"],[class*="listing"],[class*="btn"]');
      if (t) {
        const sig = t.dataset.type || t.className.split(' ')[0];
        _profile.lastClicked = sig;
        _userCtx.lastInteraction = sig;
      }
    }, true);

    // Hover on listings — strong buying signal
    document.addEventListener('mouseover', e => {
      const card = e.target.closest('[class*="card"],[class*="listing"],[class*="prop"]');
      if (card && !_hoverTargets.has(card)) {
        _hoverTargets.add(card);
        const name = card.querySelector('[class*="name"],[class*="title"]')?.textContent?.trim();
        const price = card.querySelector('[class*="price"]')?.textContent?.trim();
        if (name) {
          _userCtx.hoveredListing = name;
          if (price) _userCtx.hoveredPrice = price;
          _lastActivity = Date.now();
          // Strong signal — queue proactive in 8s if 3+ hovers
          if (_hoverTargets.size >= 3 && !_teaserShown) {
            clearTimeout(_proactiveTimer);
            _proactiveTimer = setTimeout(() => triggerProactive('hover_intent'), 8000);
          }
        }
      }
    }, { passive: true });

    // URL params intelligence
    const params = new URLSearchParams(location.search);
    if (params.get('price')) _userCtx.priceContext = 'KES ' + Number(params.get('price')).toLocaleString() + '/night';
    if (params.get('name')) _userCtx.viewingListing = params.get('name');
    if (params.get('type')) _userCtx.listingType = params.get('type');
    if (params.get('area')) _userCtx.preferredArea = params.get('area');
  }

  function checkProactiveEngagement() {
    if (_engaged || _open || _teaserShown || _proactiveCount >= 2) return;
    const page = getPageType();
    const dwell = (Date.now() - _pageEnterTime) / 1000;
    const isHighIntent = page.highIntent.some(h =>
      new URLSearchParams(location.search).has(h) || _userCtx[h]
    );
    if (_scrollDepth > 60 || (dwell > page.wait && (isHighIntent || _clickCount > 2))) {
      clearTimeout(_proactiveTimer);
      _proactiveTimer = setTimeout(() => triggerProactive('scroll_intent'), 2000);
    }
  }

  /* ── Proactive teaser (before full open) ──────────────────── */
  function triggerProactive(reason) {
    if (_engaged || _open || _teaserShown) return;
    _teaserShown = true;
    _proactiveCount++;

    const page = getPageType();
    const name = _userCtx.name ? `, ${_userCtx.name.split(' ')[0]}` : '';
    const listing = _userCtx.viewingListing || _userCtx.hoveredListing;

    const messages = {
      hover_intent: listing
        ? `I see you're eyeing "${listing}" 👀 Want the best rate or shall I check availability?`
        : `Found something interesting? I can check availability and book in 2 messages. 🏠`,
      scroll_intent: page.key === 'apartments'
        ? `${page.icon} Scrolling for the perfect stay${name}? Tell me your dates and I'll filter for you. ⚡`
        : page.key === 'tours'
        ? `${page.icon} Safari season in Nairobi is 🔥 right now. I can book you a spot in under 2 minutes.`
        : page.key === 'booking-confirm'
        ? `Almost there${name}! 💳 Anything I can help with before you confirm?`
        : `Hey${name}! ${page.icon} Can I help you find exactly what you're looking for? I'm faster than browsing.`,
      booking_assist: `Quick one${name} — need help with dates, guests or pricing? I'll sort it in seconds.`,
    };

    showTeaser(messages[reason] || messages.scroll_intent);
  }

  function showTeaser(text) {
    const teaser = document.getElementById('apa-teaser');
    if (!teaser) return;
    teaser.querySelector('.apa-teaser-text').textContent = text;
    teaser.style.opacity = '0';
    teaser.style.display = 'flex';
    requestAnimationFrame(() => {
      teaser.style.transition = 'opacity .4s, transform .4s';
      teaser.style.opacity = '1';
      teaser.style.transform = 'translateY(0)';
    });
    // Pulse the button
    const btn = document.getElementById('apa-btn');
    if (btn) {
      btn.classList.add('apa-attention');
      setTimeout(() => btn.classList.remove('apa-attention'), 3000);
    }
    // Auto-hide after 12s if not interacted
    setTimeout(() => {
      if (teaser.style.display !== 'none') {
        teaser.style.opacity = '0';
        setTimeout(() => { teaser.style.display = 'none'; }, 400);
      }
    }, 12000);
  }

  /* ── CSS ─────────────────────────────────────────────────────── */
  const CSS = `
/* ════ APA AI v2 ════ */

/* ── Button: premium, alive, unmissable ── */
#apa-btn {
  position: fixed;
  bottom: 90px;
  right: 16px;
  z-index: 7800;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: conic-gradient(from 0deg, #4361FF, #7B2FF7, #FF6B9D, #4361FF);
  background-size: 200% 200%;
  box-shadow: 0 6px 28px rgba(67,97,255,.55), 0 0 0 0 rgba(123,47,247,.4);
  animation: apa-rotate-bg 4s linear infinite, apa-heartbeat 2.8s ease-in-out infinite;
  transition: transform .2s, box-shadow .2s;
}
#apa-btn::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: linear-gradient(145deg, #1A0A3E, #0D0825);
  z-index: 0;
}
#apa-btn:hover {
  transform: scale(1.14);
  box-shadow: 0 10px 40px rgba(67,97,255,.7), 0 0 0 6px rgba(123,47,247,.15);
}
#apa-btn:active { transform: scale(.96); }
#apa-btn .apa-btn-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
#apa-btn .apa-star {
  font-size: 22px;
  filter: drop-shadow(0 0 6px rgba(255,255,255,.6));
  animation: apa-star-spin 6s linear infinite;
}
#apa-btn .apa-label {
  font-size: 8px;
  font-weight: 900;
  color: rgba(255,255,255,.85);
  letter-spacing: .12em;
  text-transform: uppercase;
}
@keyframes apa-rotate-bg {
  to { filter: hue-rotate(360deg); }
}
@keyframes apa-heartbeat {
  0%, 100% { box-shadow: 0 6px 28px rgba(67,97,255,.55), 0 0 0 0 rgba(123,47,247,.4); }
  50%       { box-shadow: 0 6px 36px rgba(67,97,255,.7), 0 0 0 10px rgba(123,47,247,0); }
}
@keyframes apa-star-spin {
  0%   { transform: rotate(0deg) scale(1); }
  25%  { transform: rotate(90deg) scale(1.12); }
  50%  { transform: rotate(180deg) scale(1); }
  75%  { transform: rotate(270deg) scale(1.12); }
  100% { transform: rotate(360deg) scale(1); }
}
#apa-btn.apa-attention {
  animation: apa-rotate-bg 1s linear infinite, apa-bounce-attention .4s ease-in-out 3;
}
@keyframes apa-bounce-attention {
  0%,100%{transform:scale(1);} 50%{transform:scale(1.22);}
}

/* Notification dot */
#apa-notif {
  position: absolute;
  top: 1px; right: 1px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #FF4D6D;
  border: 2.5px solid var(--page-bg, #fff);
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 900;
  color: #fff;
  z-index: 2;
}
#apa-notif.show { display: flex; }

/* ── Teaser bubble ── */
#apa-teaser {
  position: fixed;
  bottom: 162px;
  right: 16px;
  z-index: 7799;
  display: none;
  align-items: flex-end;
  gap: 8px;
  max-width: 280px;
  transform: translateY(12px);
}
.apa-teaser-bubble {
  background: #fff;
  border-radius: 16px 16px 4px 16px;
  padding: 11px 14px;
  font-size: 13px;
  line-height: 1.45;
  color: #0A0A14;
  box-shadow: 0 8px 32px rgba(10,10,20,.18), 0 2px 8px rgba(10,10,20,.1);
  border: 1px solid rgba(67,97,255,.15);
  cursor: pointer;
  transition: transform .15s;
}
.apa-teaser-bubble:hover { transform: scale(1.02); }
.apa-teaser-close {
  position: absolute;
  top: -6px; right: -6px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(10,10,20,.7);
  border: none;
  cursor: pointer;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity .2s;
}
#apa-teaser:hover .apa-teaser-close { opacity: 1; }

/* ── Main panel ── */
#apa-panel {
  position: fixed;
  bottom: 162px;
  right: 16px;
  z-index: 7900;
  width: 360px;
  max-height: 78vh;
  background: #fff;
  border-radius: 24px;
  box-shadow:
    0 32px 80px rgba(10,10,20,.22),
    0 8px 24px rgba(67,97,255,.12),
    inset 0 1px 0 rgba(255,255,255,.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: scale(.9) translateY(24px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all .38s cubic-bezier(.22,1,.36,1);
}
#apa-panel.open {
  transform: none;
  opacity: 1;
  visibility: visible;
  pointer-events: all;
}
@media(max-width:400px){
  #apa-panel { width:calc(100vw - 32px); bottom:158px; right:16px; }
  #apa-teaser { max-width: calc(100vw - 96px); }
}

/* Header with gradient glass */
.apa-head {
  padding: 16px 18px 14px;
  background: linear-gradient(135deg, #1A0A3E 0%, #0D1A5E 100%);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.apa-head::before {
  content: '';
  position: absolute;
  top: -30px; right: -30px;
  width: 100px; height: 100px;
  background: radial-gradient(circle, rgba(123,47,247,.4), transparent 70%);
  pointer-events: none;
}
.apa-head::after {
  content: '';
  position: absolute;
  bottom: -20px; left: -10px;
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(67,97,255,.3), transparent 70%);
  pointer-events: none;
}
.apa-head-avatar {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4361FF, #7B2FF7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.25);
  box-shadow: 0 4px 16px rgba(67,97,255,.4);
  position: relative;
  z-index: 1;
}
.apa-head-info { flex: 1; min-width: 0; position: relative; z-index: 1; }
.apa-head-name { font-weight: 800; font-size: 15px; color: #fff; }
.apa-head-status {
  font-size: 10.5px;
  color: rgba(255,255,255,.65);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}
.apa-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #2DD4BF;
  box-shadow: 0 0 6px #2DD4BF;
  animation: apa-blink 2s ease-in-out infinite;
}
@keyframes apa-blink {
  0%,100%{opacity:1;} 50%{opacity:.4;}
}
.apa-close {
  margin-left: auto;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(255,255,255,.12);
  border: none;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s;
  position: relative;
  z-index: 1;
}
.apa-close:hover { background: rgba(255,255,255,.22); }

/* Messages */
.apa-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}
.apa-msgs::-webkit-scrollbar { width: 3px; }
.apa-msgs::-webkit-scrollbar-thumb { background: rgba(10,10,20,.1); border-radius: 2px; }
.apa-msg { max-width: 85%; display: flex; flex-direction: column; gap: 3px; }
.apa-msg.apa { align-self: flex-start; }
.apa-msg.user { align-self: flex-end; align-items: flex-end; }
.apa-bubble {
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.5;
  word-break: break-word;
}
.apa-msg.apa .apa-bubble {
  background: #F1F2F8;
  color: #0A0A14;
  border-bottom-left-radius: 4px;
}
.apa-msg.user .apa-bubble {
  background: linear-gradient(135deg, #4361FF, #6B4FE8);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.apa-msg.apa .apa-bubble a { color: #4361FF; font-weight: 700; }
.apa-time { font-size: 10px; color: rgba(10,10,20,.3); padding: 0 2px; }
.apa-typing { display:none; align-self:flex-start; }
.apa-typing.show { display:flex; }
.apa-typing-dots {
  background: #F1F2F8;
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  display: flex;
  gap: 4px;
  align-items: center;
}
.apa-typing-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #8E90AD;
  animation: apa-bounce .9s ease-in-out infinite;
}
.apa-typing-dots span:nth-child(2) { animation-delay: .15s; }
.apa-typing-dots span:nth-child(3) { animation-delay: .3s; }
@keyframes apa-bounce { 0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);} }

/* Quick chips */
.apa-quick {
  padding: 8px 14px;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex-shrink: 0;
  border-top: 1px solid rgba(10,10,20,.05);
}
.apa-quick::-webkit-scrollbar { display: none; }
.apa-qchip {
  border: 1.5px solid rgba(67,97,255,.25);
  border-radius: 100px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #4361FF;
  background: rgba(67,97,255,.05);
  cursor: pointer;
  white-space: nowrap;
  transition: all .2s;
  flex-shrink: 0;
}
.apa-qchip:hover { background: rgba(67,97,255,.12); border-color: rgba(67,97,255,.5); }

/* Input */
.apa-input-wrap {
  padding: 10px 12px;
  border-top: 1px solid rgba(10,10,20,.07);
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.apa-input {
  flex: 1;
  border: 1.5px solid rgba(10,10,20,.1);
  border-radius: 18px;
  padding: 9px 13px;
  font-size: 13.5px;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 90px;
  min-height: 38px;
  overflow-y: auto;
  line-height: 1.4;
  transition: border-color .2s;
  background: #FAFAFA;
}
.apa-input:focus { border-color: #4361FF; background: #fff; }
.apa-voice-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1.5px solid rgba(10,10,20,.12);
  background: #FAFAFA;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .2s;
  color: #636480;
}
.apa-voice-btn.listening {
  background: rgba(255,77,109,.1);
  border-color: #FF4D6D;
  color: #FF4D6D;
  animation: apa-heartbeat 1s infinite;
}
.apa-send {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4361FF, #7B2FF7);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .2s;
  box-shadow: 0 4px 12px rgba(67,97,255,.3);
}
.apa-send:hover { transform: scale(1.1); }
.apa-send:disabled { background: rgba(10,10,20,.1); transform: none; cursor: not-allowed; box-shadow: none; }
`;

  function injectCSS() {
    if (document.getElementById('apa-css-v2')) return;
    const s = document.createElement('style');
    s.id = 'apa-css-v2';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Build DOM ───────────────────────────────────────────────── */
  function buildDOM() {
    if (document.getElementById('apa-btn')) return;

    // Button
    const btn = document.createElement('button');
    btn.id = 'apa-btn';
    btn.title = 'Chat with APA — AI Assistant';
    btn.setAttribute('aria-label', 'Open APA AI assistant');
    btn.innerHTML = `
      <span id="apa-notif"></span>
      <div class="apa-btn-inner">
        <span class="apa-star">✦</span>
        <span class="apa-label">APA</span>
      </div>`;
    btn.onclick = toggle;
    document.body.appendChild(btn);

    // Teaser bubble
    const teaser = document.createElement('div');
    teaser.id = 'apa-teaser';
    teaser.style.cssText = 'position:fixed;bottom:162px;right:16px;z-index:7799;display:none;max-width:280px;transform:translateY(12px);';
    teaser.innerHTML = `
      <div class="apa-teaser-bubble" onclick="ApaAI.open()">
        <span class="apa-teaser-text"></span>
      </div>
      <button class="apa-teaser-close" onclick="event.stopPropagation();this.closest('#apa-teaser').style.display='none'">✕</button>`;
    document.body.appendChild(teaser);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'apa-panel';
    panel.innerHTML = `
      <div class="apa-head">
        <div class="apa-head-avatar">✦</div>
        <div class="apa-head-info">
          <div class="apa-head-name">APA</div>
          <div class="apa-head-status">
            <span class="apa-status-dot"></span>
            Apatmento AI · Always watching 👁
          </div>
        </div>
        <button class="apa-close" onclick="ApaAI.close()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="apa-msgs" id="apa-msgs">
        <div class="apa-typing" id="apa-typing">
          <div class="apa-typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
      <div class="apa-quick" id="apa-quick">
        <div class="apa-qchip" onclick="ApaAI.quickSend('Find me the best stay in Nairobi right now')">🏠 Best stays</div>
        <div class="apa-qchip" onclick="ApaAI.quickSend('What tours can I book today?')">🦁 Tours</div>
        <div class="apa-qchip" onclick="ApaAI.quickSend('I need a car hire in Nairobi')">🚗 Cars</div>
        <div class="apa-qchip" onclick="ApaAI.quickSend('Surprise me with the best value listing')">✨ Surprise me</div>
      </div>
      <div class="apa-input-wrap">
        <textarea class="apa-input" id="apa-input" placeholder="Ask APA anything…" rows="1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ApaAI.send();}"
          oninput="ApaAI._autosize(this)"></textarea>
        <button class="apa-voice-btn" id="apa-voice" title="Voice input" onclick="ApaAI.toggleVoice()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
        </button>
        <button class="apa-send" id="apa-send" onclick="ApaAI.send()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
        </button>
      </div>`;
    document.body.appendChild(panel);
  }

  /* ── Context gathering ───────────────────────────────────────── */
  function gatherContext() {
    const ctx = {};
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
      ctx.name = CURRENT_USER.user_metadata?.first_name || '';
      ctx.userId = CURRENT_USER.id;
    }
    ctx.page = document.title;
    ctx.url = location.href;
    ctx.scrollDepth = _scrollDepth + '%';
    ctx.clickCount = _clickCount;
    ctx.dwellSeconds = Math.round((Date.now() - _pageEnterTime) / 1000);
    if (_userCtx.hoveredListing) ctx.recentlyViewed = _userCtx.hoveredListing;
    if (_userCtx.viewingListing) ctx.currentlyViewing = _userCtx.viewingListing;
    if (_userCtx.priceContext) ctx.priceContext = _userCtx.priceContext;
    if (_userCtx.preferredArea) ctx.preferredArea = _userCtx.preferredArea;
    // Saved preferences
    try { Object.assign(ctx, JSON.parse(localStorage.getItem('apa_ctx') || '{}')); } catch {}
    _userCtx = { ..._userCtx, ...ctx };
    return _userCtx;
  }

  /* ── Render messages ─────────────────────────────────────────── */
  function renderMsg(role, content) {
    const el = document.getElementById('apa-msgs');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'apa-msg ' + (role === 'assistant' ? 'apa' : 'user');
    const html = (content || '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    div.innerHTML = '<div class="apa-bubble">' + html + '</div>'
      + '<div class="apa-time">' + new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) + '</div>';
    const typing = document.getElementById('apa-typing');
    el.insertBefore(div, typing);
    el.scrollTop = el.scrollHeight;
  }

  function showTyping(v) {
    const t = document.getElementById('apa-typing');
    if (t) t.classList.toggle('show', v);
    if (v) { const m = document.getElementById('apa-msgs'); if (m) m.scrollTop = m.scrollHeight; }
  }

  /* ── Send message ────────────────────────────────────────────── */
  async function send(text) {
    const input = document.getElementById('apa-input');
    const msg = text || input?.value.trim();
    if (!msg) return;
    if (input && !text) { input.value = ''; input.style.height = ''; }
    _messages.push({ role: 'user', content: msg });
    renderMsg('user', msg);
    showTyping(true);
    const btn = document.getElementById('apa-send');
    if (btn) btn.disabled = true;
    _lastActivity = Date.now();
    learnFromMessage(msg);
    try {
      const r = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: _messages.slice(-12), userContext: gatherContext(), source: 'web' }),
      });
      const data = await r.json();
      const reply = data.reply || "Had a moment there. Try again? 😅";
      showTyping(false);
      _messages.push({ role: 'assistant', content: reply });
      renderMsg('assistant', reply);
    } catch (e) {
      showTyping(false);
      renderMsg('assistant', "Connection dropped — like Nairobi WiFi at 6pm. One sec? 📶");
    }
    if (btn) btn.disabled = false;
  }

  function learnFromMessage(msg) {
    const lower = msg.toLowerCase();
    const updates = {};
    const areaMatch = lower.match(/\b(westlands|kilimani|karen|lavington|kileleshwa|upperhill|runda|parklands|thika|mombasa|cbd)\b/);
    if (areaMatch) updates.preferred_area = areaMatch[0];
    if (/budget|cheap|affordable/.test(lower)) updates.budget_sensitive = true;
    if (/luxury|premium|best|finest/.test(lower)) updates.luxury_seeker = true;
    if (/family|kids|children/.test(lower)) updates.with_family = true;
    if (/couple|wife|husband|romantic/.test(lower)) updates.couple_travel = true;
    if (/business|work|meeting/.test(lower)) updates.business_traveller = true;
    if (Object.keys(updates).length) {
      try {
        const stored = JSON.parse(localStorage.getItem('apa_ctx') || '{}');
        localStorage.setItem('apa_ctx', JSON.stringify({ ...stored, ...updates }));
      } catch {}
    }
  }

  function quickSend(msg) {
    const input = document.getElementById('apa-input');
    if (input) input.value = msg;
    send(msg);
  }

  /* ── Voice ───────────────────────────────────────────────────── */
  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      renderMsg('assistant', "Voice not supported here, but typing is honestly faster anyway 😄 What are you looking for?");
      return;
    }
    if (_listening) { stopListening(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    _recognition = new SR();
    _recognition.lang = 'en-KE';
    _recognition.interimResults = true;
    const voiceBtn = document.getElementById('apa-voice');
    const input = document.getElementById('apa-input');
    _recognition.onstart = () => { _listening = true; if (voiceBtn) voiceBtn.classList.add('listening'); if (input) input.placeholder = '🎤 Listening…'; };
    _recognition.onresult = e => {
      const t = e.results[e.results.length - 1][0].transcript;
      if (input) input.value = t;
      clearTimeout(_vadTimer);
      if (e.results[e.results.length - 1].isFinal) _vadTimer = setTimeout(() => send(t), 600);
    };
    _recognition.onend = () => stopListening();
    _recognition.onerror = () => stopListening();
    _recognition.start();
  }
  function stopListening() {
    _listening = false;
    if (_recognition) { try { _recognition.stop(); } catch {} }
    const v = document.getElementById('apa-voice');
    const i = document.getElementById('apa-input');
    if (v) v.classList.remove('listening');
    if (i) i.placeholder = 'Ask APA anything…';
  }

  /* ── Open/close ──────────────────────────────────────────────── */
  function open() {
    _open = true;
    _engaged = true;
    document.getElementById('apa-panel')?.classList.add('open');
    document.getElementById('apa-teaser')?.style.setProperty('display', 'none');
    document.getElementById('apa-notif')?.classList.remove('show');
    clearTimeout(_proactiveTimer);
    clearTimeout(_teaserTimer);
    // First greeting
    if (_messages.length === 0) {
      const ctx = gatherContext();
      const name = ctx.name ? ', ' + ctx.name.split(' ')[0] : '';
      const page = getPageType();
      let greeting;
      const viewing = ctx.currentlyViewing || ctx.recentlyViewed;
      if (viewing) greeting = 'Hey' + name + '! I see you\'ve been looking at "' + viewing + '" 👀 Want me to check availability or find something similar?';
      else if (page.key === 'apartments') greeting = 'Hey' + name + '! 🏠 I\'ve been watching your browsing — I can filter these stays by price, area and vibe in seconds. What are you looking for?';
      else if (page.key === 'tours') greeting = 'Planning an adventure' + name + '? 🦁 I know every safari and day trip available right now. Tell me who\'s going and when.';
      else if (page.key === 'booking-confirm') greeting = 'Almost home' + name + '! 💳 Need help with anything before you confirm? Dates, guests, or special requests?';
      else if (page.key === 'roommates') greeting = 'Finding a roommate or a room' + name + '? 🤝 I\'ll make sure you find someone who actually does their dishes. Tell me more.';
      else greeting = 'Hey' + name + '! I\'m APA ✦ I\'ve been watching the site and I know exactly what\'s good right now. What are you looking for — stays, tours, cars, events?';
      setTimeout(() => {
        showTyping(true);
        setTimeout(() => { showTyping(false); renderMsg('assistant', greeting); _messages.push({ role:'assistant', content:greeting }); }, 850);
      }, 250);
    }
    setTimeout(() => document.getElementById('apa-input')?.focus(), 420);
  }

  function close() {
    _open = false;
    document.getElementById('apa-panel')?.classList.remove('open');
  }
  function toggle() { _open ? close() : open(); }

  function _autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 90) + 'px';
  }

  /* ── Proactive timer schedule ────────────────────────────────── */
  function scheduleProactive() {
    const page = getPageType();
    const baseWait = page.wait * 1000;
    // High-intent pages get faster proactive engagement
    const firstTrigger = page.key === 'booking-confirm' ? 6000
      : page.key === 'apartments' ? 14000
      : baseWait;
    _proactiveTimer = setTimeout(() => {
      if (!_engaged && !_open) triggerProactive('scroll_intent');
    }, firstTrigger);
  }

  /* ── Keyboard shortcut ───────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape' && _open) close();
  });

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    injectCSS();
    buildDOM();
    initBehaviourTracking();
    scheduleProactive();
    // Remove old css if present
    const old = document.getElementById('apa-css');
    if (old) old.remove();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { open, close, toggle, send, quickSend, toggleVoice, _autosize, initFAB: () => {} };
})();
