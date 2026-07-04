/* ════════════════════════════════════════════════════════════════
   APA — Apatmento AI Assistant
   Front-end widget: voice + text, persistent memory, upsells.
   Loads on every page. Ctrl+Space or tap the APA button.
════════════════════════════════════════════════════════════════ */
const ApaAI = (() => {
  const VERSION = '1.0.0';
  let _open = false;
  let _messages = [];   // conversation history
  let _userCtx  = {};   // learned user context
  let _listening = false;
  let _recognition = null;
  let _vadTimer = null;

  /* ── CSS ─────────────────────────────────────────────────────── */
  const CSS = `
#apa-btn{
  position:fixed;bottom:88px;right:16px;z-index:7800;
  width:54px;height:54px;border-radius:50%;
  background:linear-gradient(135deg,#4361FF,#7B2FF7);
  border:none;cursor:pointer;
  box-shadow:0 4px 24px rgba(67,97,255,.45);
  display:flex;align-items:center;justify-content:center;
  transition:transform .25s,box-shadow .25s;
  animation:apa-pulse 3s ease-in-out infinite;
}
#apa-btn:hover{transform:scale(1.1);box-shadow:0 8px 32px rgba(67,97,255,.6);}
@keyframes apa-pulse{0%,100%{box-shadow:0 4px 24px rgba(67,97,255,.45);}50%{box-shadow:0 4px 32px rgba(123,47,247,.65),0 0 0 8px rgba(67,97,255,.08);}}
#apa-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:#FF4D6D;border:2.5px solid #fff;display:none;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;}
#apa-badge.show{display:flex;}
#apa-panel{
  position:fixed;bottom:156px;right:16px;z-index:7900;
  width:360px;max-height:76vh;
  background:#fff;border-radius:24px;
  box-shadow:0 24px 72px rgba(10,10,20,.2),0 4px 20px rgba(10,10,20,.1);
  display:flex;flex-direction:column;overflow:hidden;
  transform:scale(.92) translateY(20px);opacity:0;visibility:hidden;
  transition:all .35s cubic-bezier(.22,1,.36,1);
  pointer-events:none;
}
#apa-panel.open{transform:none;opacity:1;visibility:visible;pointer-events:all;}
@media(max-width:400px){#apa-panel{width:calc(100vw - 32px);bottom:150px;right:16px;}}

/* Header */
.apa-head{
  padding:16px 18px 14px;
  background:linear-gradient(135deg,#4361FF,#7B2FF7);
  display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.apa-head-avatar{
  width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;flex-shrink:0;
  border:2px solid rgba(255,255,255,.3);
}
.apa-head-title{font-weight:800;font-size:15px;color:#fff;}
.apa-head-status{font-size:11px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:4px;}
.apa-status-dot{width:6px;height:6px;border-radius:50%;background:#2DD4BF;animation:apa-pulse 2s infinite;}
.apa-close{margin-left:auto;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.15);border:none;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .2s;}
.apa-close:hover{background:rgba(255,255,255,.25);}

/* Messages */
.apa-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
.apa-msgs::-webkit-scrollbar{width:3px;}
.apa-msgs::-webkit-scrollbar-thumb{background:rgba(10,10,20,.1);border-radius:2px;}
.apa-msg{max-width:85%;display:flex;flex-direction:column;gap:3px;}
.apa-msg.apa{align-self:flex-start;}
.apa-msg.user{align-self:flex-end;align-items:flex-end;}
.apa-bubble{padding:10px 13px;border-radius:16px;font-size:13.5px;line-height:1.5;word-break:break-word;}
.apa-msg.apa .apa-bubble{background:#F1F2F8;color:#0A0A14;border-bottom-left-radius:4px;}
.apa-msg.user .apa-bubble{background:linear-gradient(135deg,#4361FF,#6B4FE8);color:#fff;border-bottom-right-radius:4px;}
.apa-msg.apa .apa-bubble a{color:#4361FF;font-weight:700;}
.apa-time{font-size:10px;color:rgba(10,10,20,.3);padding:0 2px;}
/* Typing indicator */
.apa-typing{display:none;align-self:flex-start;}
.apa-typing.show{display:flex;}
.apa-typing-dots{background:#F1F2F8;border-radius:16px;border-bottom-left-radius:4px;padding:12px 16px;display:flex;gap:4px;align-items:center;}
.apa-typing-dots span{width:6px;height:6px;border-radius:50%;background:#8E90AD;animation:apa-bounce .9s ease-in-out infinite;}
.apa-typing-dots span:nth-child(2){animation-delay:.15s;}
.apa-typing-dots span:nth-child(3){animation-delay:.3s;}
@keyframes apa-bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}

/* Quick actions */
.apa-quick{padding:8px 14px;display:flex;gap:6px;overflow-x:auto;flex-shrink:0;border-top:1px solid rgba(10,10,20,.05);}
.apa-quick::-webkit-scrollbar{display:none;}
.apa-qchip{border:1.5px solid rgba(67,97,255,.25);border-radius:100px;padding:5px 12px;font-size:12px;font-weight:600;color:#4361FF;background:rgba(67,97,255,.05);cursor:pointer;white-space:nowrap;transition:all .2s;flex-shrink:0;}
.apa-qchip:hover{background:rgba(67,97,255,.12);border-color:rgba(67,97,255,.5);}

/* Input area */
.apa-input-wrap{padding:10px 12px;border-top:1px solid rgba(10,10,20,.07);display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}
.apa-input{flex:1;border:1.5px solid rgba(10,10,20,.1);border-radius:18px;padding:9px 13px;font-size:13.5px;font-family:inherit;resize:none;outline:none;max-height:90px;min-height:38px;overflow-y:auto;line-height:1.4;transition:border-color .2s;background:#FAFAFA;}
.apa-input:focus{border-color:#4361FF;background:#fff;}
.apa-voice-btn{width:36px;height:36px;border-radius:50%;border:1.5px solid rgba(10,10,20,.12);background:#FAFAFA;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;color:#636480;}
.apa-voice-btn.listening{background:rgba(255,77,109,.1);border-color:#FF4D6D;color:#FF4D6D;animation:apa-pulse 1s infinite;}
.apa-send{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4361FF,#7B2FF7);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.apa-send:hover{transform:scale(1.08);}
.apa-send:disabled{background:rgba(10,10,20,.1);transform:none;cursor:not-allowed;}
`;

  function injectCSS() {
    if (document.getElementById('apa-css')) return;
    const s = document.createElement('style');
    s.id = 'apa-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Build DOM ───────────────────────────────────────────────── */
  function buildDOM() {
    if (document.getElementById('apa-btn')) return;

    // Floating button
    const btn = document.createElement('button');
    btn.id = 'apa-btn';
    btn.title = 'Chat with APA';
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a10 10 0 0 1-10-10C2 6.48 6.48 2 12 2z"/>
        <path d="M8 10h.01M12 10h.01M16 10h.01"/>
      </svg>
      <span id="apa-badge"></span>`;
    btn.onclick = toggle;
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'apa-panel';
    panel.innerHTML = `
      <div class="apa-head">
        <div class="apa-head-avatar">🤖</div>
        <div>
          <div class="apa-head-title">APA</div>
          <div class="apa-head-status">
            <span class="apa-status-dot"></span>
            Apatmento AI · Always on
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
        <div class="apa-qchip" onclick="ApaAI.quickSend('Find me a stay in Westlands')">🏠 Find a stay</div>
        <div class="apa-qchip" onclick="ApaAI.quickSend('What tours are available this weekend?')">🦁 Tours</div>
        <div class="apa-qchip" onclick="ApaAI.quickSend('I need a car hire in Nairobi')">🚗 Car hire</div>
        <div class="apa-qchip" onclick="ApaAI.quickSend('Surprise me — what's the best value stay right now?')">✨ Surprise me</div>
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
      </div>
    `;
    document.body.appendChild(panel);
  }

  /* ── Context gathering ───────────────────────────────────────── */
  function gatherContext() {
    const ctx = {};
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
      ctx.name = CURRENT_USER.user_metadata?.first_name || '';
      ctx.email = CURRENT_USER.email;
    }
    ctx.page = document.title || location.pathname;
    // Infer budget from URL/page context
    const price = new URLSearchParams(location.search).get('price');
    if (price) ctx.budget = `KES ${Number(price).toLocaleString()}/night`;
    // Stored preferences
    try {
      const stored = JSON.parse(localStorage.getItem('apa_ctx') || '{}');
      Object.assign(ctx, stored);
    } catch {}
    _userCtx = ctx;
    return ctx;
  }

  /* ── Render a message ────────────────────────────────────────── */
  function renderMsg(role, content) {
    const el = document.getElementById('apa-msgs');
    if (!el) return;
    const div = document.createElement('div');
    div.className = `apa-msg ${role === 'assistant' ? 'apa' : 'user'}`;
    // Convert markdown links to HTML
    const html = (content || '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    div.innerHTML = `
      <div class="apa-bubble">${html}</div>
      <div class="apa-time">${new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</div>`;
    const typing = document.getElementById('apa-typing');
    el.insertBefore(div, typing);
    el.scrollTop = el.scrollHeight;
  }

  function showTyping(show) {
    const t = document.getElementById('apa-typing');
    if (t) t.classList.toggle('show', show);
    const msgs = document.getElementById('apa-msgs');
    if (msgs && show) msgs.scrollTop = msgs.scrollHeight;
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

    try {
      const r = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: _messages.slice(-12),
          userContext: gatherContext(),
          source: 'web',
        }),
      });

      const data = await r.json();
      const reply = data.reply || "Sorry, I had a brain fart. Try again?";

      showTyping(false);
      _messages.push({ role: 'assistant', content: reply });
      renderMsg('assistant', reply);

      // Learn from response context
      learnFromConversation(msg, reply);

    } catch (e) {
      showTyping(false);
      renderMsg('assistant', "I'm having connectivity issues — like Safaricom during load shedding. Give it a second? 📶");
    }

    if (btn) btn.disabled = false;
  }

  /* ── Learn from conversation to personalise future messages ─── */
  function learnFromConversation(userMsg, aiReply) {
    const lower = userMsg.toLowerCase();
    const updates = {};

    if (/westlands|kilimani|karen|lavington|kileleshwa|upperhill|runda/i.test(lower)) {
      updates.preferred_area = lower.match(/westlands|kilimani|karen|lavington|kileleshwa|upperhill|runda/i)?.[0];
    }
    if (/budget|cheap|affordable|cheapest/i.test(lower)) updates.budget_sensitive = true;
    if (/luxury|premium|best|top|finest/i.test(lower)) updates.luxury_seeker = true;
    if (/family|kids|children/i.test(lower)) updates.travelling_with_family = true;
    if (/couple|wife|husband|girlfriend|boyfriend|romantic/i.test(lower)) updates.couple_travel = true;
    if (/business|work|meeting|conference/i.test(lower)) updates.business_traveller = true;

    if (Object.keys(updates).length) {
      const stored = JSON.parse(localStorage.getItem('apa_ctx') || '{}');
      localStorage.setItem('apa_ctx', JSON.stringify({ ...stored, ...updates }));
    }
  }

  function quickSend(msg) {
    const input = document.getElementById('apa-input');
    if (input) input.value = msg;
    send(msg);
  }

  /* ── Voice input via Web Speech API ─────────────────────────── */
  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      renderMsg('assistant', "Your browser doesn't support voice input. But honestly, typing is faster anyway 😄");
      return;
    }

    if (_listening) {
      stopListening();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    _recognition = new SR();
    _recognition.lang = 'en-KE';
    _recognition.interimResults = true;
    _recognition.maxAlternatives = 1;

    const voiceBtn = document.getElementById('apa-voice');
    const input = document.getElementById('apa-input');
    
    _recognition.onstart = () => {
      _listening = true;
      if (voiceBtn) voiceBtn.classList.add('listening');
      if (input) input.placeholder = '🎤 Listening…';
    };

    _recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript;
      if (input) input.value = transcript;
      // Auto-send on final result after brief pause
      clearTimeout(_vadTimer);
      if (e.results[e.results.length - 1].isFinal) {
        _vadTimer = setTimeout(() => send(transcript), 600);
      }
    };

    _recognition.onend = () => stopListening();
    _recognition.onerror = () => stopListening();
    _recognition.start();
  }

  function stopListening() {
    _listening = false;
    if (_recognition) { try { _recognition.stop(); } catch {} }
    const voiceBtn = document.getElementById('apa-voice');
    const input = document.getElementById('apa-input');
    if (voiceBtn) voiceBtn.classList.remove('listening');
    if (input) input.placeholder = 'Ask APA anything…';
  }

  /* ── Open/close ──────────────────────────────────────────────── */
  function open() {
    _open = true;
    document.getElementById('apa-panel')?.classList.add('open');
    document.getElementById('apa-badge')?.classList.remove('show');
    // Send greeting if first open
    if (_messages.length === 0) {
      const ctx = gatherContext();
      const name = ctx.name ? `, ${ctx.name}` : '';
      const page = location.pathname;
      let greeting;
      if (page.includes('apartments')) greeting = `Hey${name}! 👀 I see you're apartment hunting. Good call — I know every hidden gem on this platform. What area, dates, and budget?`;
      else if (page.includes('tours')) greeting = `Safari time${name}? 🦁 Tell me when you're going and how many of you there are. I'll find you something unforgettable.`;
      else if (page.includes('roommate')) greeting = `Looking for a roommate or a room${name}? Either way, I'll make sure you find a match that doesn't leave dishes in the sink. 🍽️ Tell me more.`;
      else greeting = `Hey${name}! I'm APA — your Apatmento AI. I can help you find stays, tours, car hire, events, and more. I'm faster than Google and funnier than your tour guide. What are you looking for? 🚀`;
      
      setTimeout(() => {
        showTyping(true);
        setTimeout(() => {
          showTyping(false);
          renderMsg('assistant', greeting);
          _messages.push({ role: 'assistant', content: greeting });
        }, 900);
      }, 300);
    }
    setTimeout(() => document.getElementById('apa-input')?.focus(), 400);
  }

  function close() {
    _open = false;
    document.getElementById('apa-panel')?.classList.remove('open');
  }

  function toggle() {
    _open ? close() : open();
  }

  /* ── Textarea autosize ───────────────────────────────────────── */
  function _autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 90) + 'px';
  }

  /* ── Keyboard shortcut ───────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); toggle(); }
  });

  /* ── Init on DOM ready ───────────────────────────────────────── */
  function init() {
    injectCSS();
    buildDOM();
    // Show proactive suggestion after 45s if user hasn't interacted
    setTimeout(() => {
      if (!_open && _messages.length === 0) {
        const badge = document.getElementById('apa-badge');
        if (badge) { badge.textContent = '1'; badge.classList.add('show'); }
      }
    }, 45000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { open, close, toggle, send, quickSend, toggleVoice, _autosize };
})();
