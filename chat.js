/* ════════════════════════════════════════════════════════════════
   APATMENTO CHAT SYSTEM — chat.js
   Real-time in-app messaging via Supabase Realtime.
   
   CONTACT INFO SCRUBBING: All outbound messages are scanned for
   phone numbers, emails, WhatsApp references, social handles,
   and other bypass attempts before storage and display.
   This is enforced client-side AND noted to the user.
   Server-side enforcement via Supabase functions is additive.
   
   Usage:
     ApatmentoChat.open({ listingId, listingType, listingTitle, hostId })
     ApatmentoChat.openInbox()
   
   Requires: Supabase client `sb` to be available globally,
             CURRENT_USER to be set.
════════════════════════════════════════════════════════════════ */

const ApatmentoChat = (() => {

  const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  let _sb = null; // will use window.sb

  let _conv = null;      // active conversation
  let _realtimeSub = null;
  let _userId = null;
  let _inbox = false;

  /* ── Contact info scrubbing ─────────────────────────────────── */
  const SCRUB_PATTERNS = [
    // Phone numbers (Kenyan + international)
    { re: /(?:\+?254|0)[\s\-.]?[17]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{3}/g,   label: 'phone' },
    { re: /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g, label: 'phone' },
    { re: /\b0[17]\d{8}\b/g, label: 'phone' },
    // Email addresses
    { re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, label: 'email' },
    // WhatsApp / social hints
    { re: /wh?a?ts?a?pp?[\s:]*(?:me|us|number)?/gi, label: 'WhatsApp' },
    { re: /text\s+me/gi, label: 'direct contact' },
    { re: /call\s+me/gi, label: 'direct contact' },
    { re: /dm\s+me/gi, label: 'direct contact' },
    { re: /reach\s+me\s+(?:on|at|via)/gi, label: 'direct contact' },
    // Social handles
    { re: /@[a-zA-Z0-9_]{2,30}\b(?!\s*apatmento)/g, label: 'social handle' },
    { re: /(?:instagram|twitter|facebook|telegram|tiktok|snapchat|linkedin)[\s:\/]+[a-zA-Z0-9_.]+/gi, label: 'social media' },
    // URL/link attempts
    { re: /https?:\/\/[^\s]+/gi, label: 'link' },
    { re: /[a-zA-Z0-9\-]+\.(?:com|co\.ke|ke|org|net|me|io)\b/gi, label: 'website' },
    // Number spelled out tricks
    { re: /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s\-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)/gi, label: 'number' },
    // Number obfuscation (dots/dashes between digits)
    { re: /\b\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d/g, label: 'phone' },
  ];

  function scrubContactInfo(text) {
    let scrubbed = false;
    let result = text;
    for (const { re, label } of SCRUB_PATTERNS) {
      const replaced = result.replace(re, `[${label} removed]`);
      if (replaced !== result) { scrubbed = true; result = replaced; }
    }
    return { text: result, scrubbed };
  }

  /* ── CSS injection ───────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('apt-chat-css')) return;
    const s = document.createElement('style');
    s.id = 'apt-chat-css';
    s.textContent = `
/* ═══ APATMENTO CHAT ═══ */

/* ── Small chat panel (host-specific, from listing) ── */
#apt-chat-overlay{position:fixed;inset:0;z-index:8000;display:none;align-items:flex-end;justify-content:flex-end;padding:0 16px 16px;pointer-events:none;}
#apt-chat-overlay.open{display:flex;pointer-events:all;}
#apt-chat-panel{width:100%;max-width:400px;height:600px;max-height:94vh;background:#fff;border-radius:22px;box-shadow:0 20px 60px rgba(10,10,20,.22),0 4px 16px rgba(10,10,20,.1);display:flex;flex-direction:column;overflow:hidden;animation:chat-rise .35s cubic-bezier(.22,1,.36,1);}
@keyframes chat-rise{from{opacity:0;transform:translateY(30px) scale(.97);}to{opacity:1;transform:none;}}
@media(max-width:480px){
  #apt-chat-panel{max-width:100%;border-radius:22px 22px 0 0;height:88vh;}
  #apt-chat-overlay{padding:0;align-items:flex-end;}
}

/* ── Full-screen inbox overlay (topbar inbox button) ── */
#apt-inbox-overlay{position:fixed;inset:0;z-index:8100;background:var(--glass,#FCFCFD);display:none;flex-direction:column;transform:translateX(100%);transition:transform .38s cubic-bezier(.22,1,.36,1);}
#apt-inbox-overlay.open{display:flex;transform:none;}
.apt-inbox-bar{height:60px;display:flex;align-items:center;gap:12px;padding:0 18px;background:rgba(252,252,253,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(10,10,20,.07);flex-shrink:0;}
.apt-inbox-back{width:38px;height:38px;border-radius:12px;border:1px solid rgba(10,10,20,.1);background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0A0A14;transition:all .2s;flex-shrink:0;}
.apt-inbox-back:hover{border-color:#8B6FE8;color:#8B6FE8;}
.apt-inbox-bar-title{font-family:'Geist','Inter',sans-serif;font-weight:600;font-size:18px;color:#0A0A14;flex:1;}
.apt-inbox-bar-sub{font-size:12px;color:#8E90AD;margin-top:1px;}

/* Thread view inside full inbox */
#apt-inbox-thread{display:none;flex-direction:column;flex:1;overflow:hidden;}
#apt-inbox-thread.open{display:flex;}
#apt-inbox-thread .apt-inbox-thread-head{height:56px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid rgba(10,10,20,.07);flex-shrink:0;}
#apt-inbox-thread .apt-thread-back{width:34px;height:34px;border-radius:10px;border:1px solid rgba(10,10,20,.1);background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0A0A14;transition:all .2s;flex-shrink:0;}
#apt-inbox-thread .apt-thread-back:hover{border-color:#8B6FE8;color:#8B6FE8;}
.apt-thread-title{font-weight:700;font-size:14px;color:#0A0A14;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.apt-thread-ico{font-size:20px;}

/* Conversation list */
#apt-inbox-list-wrap{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;}
#apt-inbox-list-wrap::-webkit-scrollbar{width:4px;}
#apt-inbox-list-wrap::-webkit-scrollbar-thumb{background:rgba(10,10,20,.12);border-radius:2px;}
.apt-inbox-conv{display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer;border-bottom:1px solid rgba(10,10,20,.05);transition:background .15s;position:relative;}
.apt-inbox-conv:active{background:rgba(139,111,232,.05);}
.apt-inbox-conv-ava{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;position:relative;}
.apt-inbox-conv-unread-dot{position:absolute;top:1px;right:1px;width:12px;height:12px;border-radius:50%;background:#4361FF;border:2px solid #FCFCFD;display:none;}
.apt-inbox-conv-unread-dot.on{display:block;}
.apt-inbox-conv-body{flex:1;min-width:0;}
.apt-inbox-conv-name{font-weight:700;font-size:14px;color:#0A0A14;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.apt-inbox-conv-preview{font-size:13px;color:#8E90AD;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.apt-inbox-conv.unread .apt-inbox-conv-name{color:#0A0A14;}
.apt-inbox-conv.unread .apt-inbox-conv-preview{color:#4A4C66;font-weight:500;}
.apt-inbox-conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.apt-inbox-conv-time{font-size:11px;color:#8E90AD;}
.apt-inbox-conv-badge{min-width:20px;height:20px;border-radius:10px;background:#4361FF;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;}

/* Messages area (reused inside thread) */
.apt-ch-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
.apt-ch-msgs::-webkit-scrollbar{width:4px;}
.apt-ch-msgs::-webkit-scrollbar-thumb{background:rgba(10,10,20,.15);border-radius:2px;}
.apt-ch-msg{max-width:78%;display:flex;flex-direction:column;gap:3px;}
.apt-ch-msg.me{align-self:flex-end;align-items:flex-end;}
.apt-ch-msg.them{align-self:flex-start;align-items:flex-start;}
.apt-ch-bubble{padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.45;word-break:break-word;}
.apt-ch-msg.me .apt-ch-bubble{background:linear-gradient(135deg,#4361FF,#6B4FE8);color:#fff;border-bottom-right-radius:4px;}
.apt-ch-msg.them .apt-ch-bubble{background:#F1F2F8;color:#0A0A14;border-bottom-left-radius:4px;}
.apt-ch-msg.system .apt-ch-bubble{background:#FFF8E7;color:#856404;font-size:12px;border-radius:10px;text-align:center;max-width:100%;}
.apt-ch-time{font-size:10px;color:rgba(10,10,20,.35);padding:0 2px;}
.apt-ch-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center;}
.apt-ch-empty-ico{font-size:40px;}
.apt-ch-empty-title{font-size:15px;font-weight:700;color:#0A0A14;}
.apt-ch-empty-sub{font-size:13px;color:#8E90AD;line-height:1.55;max-width:240px;}
.apt-ch-banner{background:rgba(67,97,255,.07);border-bottom:1px solid rgba(67,97,255,.1);padding:8px 14px;font-size:11px;color:#4361FF;display:flex;align-items:center;gap:6px;flex-shrink:0;}
.apt-ch-input-wrap{padding:10px 12px;border-top:1px solid rgba(10,10,20,.07);display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}
.apt-ch-input{flex:1;border:1.5px solid rgba(10,10,20,.1);border-radius:20px;padding:10px 14px;font-size:14px;font-family:inherit;resize:none;outline:none;max-height:100px;min-height:40px;overflow-y:auto;line-height:1.4;transition:border-color .2s;background:#FAFAFA;}
.apt-ch-input:focus{border-color:#4361FF;background:#fff;}
.apt-ch-send{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#4361FF,#7B2FF7);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.apt-ch-send:hover{transform:scale(1.08);}
.apt-ch-send:disabled{background:rgba(10,10,20,.12);transform:none;cursor:not-allowed;}
.apt-ch-send svg{color:#fff;}

/* Small panel header (host chat) */
.apt-ch-head{padding:14px 16px;background:linear-gradient(135deg,#4361FF,#7B2FF7);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.apt-ch-head-ico{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.apt-ch-head-info{flex:1;min-width:0;}
.apt-ch-head-title{font-weight:700;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.apt-ch-head-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:1px;}
.apt-ch-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.15);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:background .2s;}
.apt-ch-close:hover{background:rgba(255,255,255,.25);}

/* Empty state for inbox */
.apt-inbox-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px 28px;text-align:center;}
.apt-inbox-empty-ico{font-size:56px;}
.apt-inbox-empty-title{font-weight:700;font-size:18px;color:#0A0A14;}
.apt-inbox-empty-sub{font-size:14px;color:#8E90AD;line-height:1.6;max-width:260px;}

/* FAB — hidden by default, kept for other pages that use initFAB */
#apt-chat-fab{position:fixed;bottom:80px;right:16px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#4361FF,#7B2FF7);border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(67,97,255,.4);z-index:7999;transition:all .3s;}
#apt-chat-fab.visible{display:flex;}
    `;
    document.head.appendChild(s);
  }

  /* ── Build small chat panel (host-specific) ──────────────────── */
  function buildOverlay() {
    if (document.getElementById('apt-chat-overlay')) return;
    const el = document.createElement('div');
    el.id = 'apt-chat-overlay';
    el.innerHTML = `
      <div id="apt-chat-panel">
        <div class="apt-ch-head">
          <div class="apt-ch-head-ico" id="apt-ch-head-ico">💬</div>
          <div class="apt-ch-head-info">
            <div class="apt-ch-head-title" id="apt-ch-head-title">Chat with Host</div>
            <div class="apt-ch-head-sub" id="apt-ch-head-sub">Secure messaging</div>
          </div>
          <button class="apt-ch-close" onclick="ApatmentoChat.close()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="apt-ch-banner">
          🔒 Sharing contact details is not permitted — use this chat to arrange everything.
        </div>
        <div id="apt-ch-msgs" class="apt-ch-msgs"></div>
        <div class="apt-ch-input-wrap" id="apt-ch-input-wrap">
          <textarea class="apt-ch-input" id="apt-ch-input" placeholder="Type a message…" rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ApatmentoChat.send();}"
            oninput="ApatmentoChat._autosize(this)"></textarea>
          <button class="apt-ch-send" id="apt-ch-send" onclick="ApatmentoChat.send()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  /* ── Build full-screen inbox overlay ─────────────────────────── */
  function buildInboxOverlay() {
    if (document.getElementById('apt-inbox-overlay')) return;
    const el = document.createElement('div');
    el.id = 'apt-inbox-overlay';
    el.innerHTML = `
      <div class="apt-inbox-bar">
        <button class="apt-inbox-back" onclick="ApatmentoChat.closeInbox()" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <div class="apt-inbox-bar-title">Messages</div>
          <div class="apt-inbox-bar-sub" id="apt-inbox-bar-sub">All conversations</div>
        </div>
      </div>

      <!-- Conversation list view -->
      <div id="apt-inbox-list-wrap" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;"></div>

      <!-- Thread view (shown when a conversation is opened) -->
      <div id="apt-inbox-thread">
        <div class="apt-inbox-thread-head">
          <button class="apt-thread-back" onclick="ApatmentoChat._inboxBackToList()" aria-label="Back to messages">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span class="apt-thread-ico" id="apt-thread-ico">🏠</span>
          <span class="apt-thread-title" id="apt-thread-title">Conversation</span>
        </div>
        <div class="apt-ch-banner">
          🔒 Sharing contact details is not permitted — use this chat to arrange everything.
        </div>
        <div id="apt-inbox-msgs" class="apt-ch-msgs"></div>
        <div class="apt-ch-input-wrap">
          <textarea class="apt-ch-input" id="apt-inbox-input" placeholder="Type a message…" rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ApatmentoChat._inboxSend();}"
            oninput="ApatmentoChat._autosize(this)"></textarea>
          <button class="apt-ch-send" id="apt-inbox-send" onclick="ApatmentoChat._inboxSend()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  /* ── Format timestamp ────────────────────────────────────────── */
  function fmtTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-KE', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  /* ── Render messages ─────────────────────────────────────────── */
  function renderMessages(messages) {
    const el = document.getElementById('apt-ch-msgs');
    if (!el) return;
    if (!messages.length) {
      el.innerHTML = `<div class="apt-ch-empty">
        <div class="apt-ch-empty-ico">👋</div>
        <div class="apt-ch-empty-title">Start the conversation</div>
        <div class="apt-ch-empty-sub">Ask about availability, check-in details, or anything else. Keep it all in-app — it's safer for everyone.</div>
      </div>`;
      return;
    }
    el.innerHTML = messages.map(m => {
      const isMe = m.sender_id === _userId;
      const cls = m.is_system ? 'system' : isMe ? 'me' : 'them';
      // Highlight scrubbed text
      const content = m.content.replace(
        /\[(phone|email|link|website|WhatsApp|social handle|social media|direct contact|number) removed\]/gi,
        '<span class="scrubbed">[$1 removed]</span>'
      );
      return `<div class="apt-ch-msg ${cls}">
        <div class="apt-ch-bubble">${content}</div>
        <div class="apt-ch-time">${fmtTime(m.created_at)}${m.was_scrubbed ? ' · <span style="color:#CC2233;font-size:10px;">⚠ contact info removed</span>' : ''}</div>
      </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  /* ── Load conversation messages ──────────────────────────────── */
  async function loadMessages(convId) {
    const getSb = () => window.sb || null;
    const s = getSb();
    if (!s) return [];
    const { data } = await s.from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);
    return data || [];
  }

  /* ── Subscribe to real-time new messages ────────────────────── */
  function subscribeRealtime(convId) {
    const s = window.sb;
    if (!s || _realtimeSub) return;
    _realtimeSub = s.channel('chat-' + convId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${convId}`
      }, async (payload) => {
        // Append new message
        const msgs = await loadMessages(convId);
        renderMessages(msgs);
      })
      .subscribe();
  }

  /* ── Open a chat with a listing ──────────────────────────────── */
  async function open({ listingId, listingType, listingTitle, hostId }) {
    const user = window.CURRENT_USER;
    if (!user) { window.location.href = 'auth.html?next=' + encodeURIComponent(location.href); return; }
    if (user.id === hostId) { alert('You cannot message yourself.'); return; }

    _userId = user.id;
    _inbox = false;
    injectCSS();
    buildOverlay();

    // Update header
    document.getElementById('apt-ch-head-title').textContent = listingTitle || 'Chat with Host';
    document.getElementById('apt-ch-head-sub').textContent = listingType ? listingType.charAt(0).toUpperCase() + listingType.slice(1) : 'Listing';
    document.getElementById('apt-ch-head-ico').textContent = { apartment:'🏠', roommate:'🤝', tour:'🦁', event:'🎟', carhire:'🚗', food:'🍽', shopping:'🛍' }[listingType] || '💬';

    // Show panel
    document.getElementById('apt-chat-overlay').classList.add('open');
    document.getElementById('apt-ch-msgs').innerHTML = '<div class="apt-ch-empty"><div class="apt-ch-empty-ico">⏳</div><div class="apt-ch-empty-title">Loading…</div></div>';

    const s = window.sb;
    if (!s) return;

    // Get or create conversation
    let conv;
    const { data: existing } = await s.from('chat_conversations')
      .select('*').eq('listing_id', listingId).eq('guest_id', user.id).maybeSingle();

    if (existing) {
      conv = existing;
    } else {
      const { data: created } = await s.from('chat_conversations').insert({
        listing_id: listingId,
        listing_type: listingType,
        listing_title: listingTitle,
        host_id: hostId,
        guest_id: user.id,
      }).select().maybeSingle();
      conv = created;

      // Send welcome system message
      if (conv) {
        await s.from('chat_messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: `Hi! I'm interested in "${listingTitle}". Could you tell me more about availability?`,
          is_system: false,
        });
      }
    }

    _conv = conv;

    // Mark as read
    if (conv) {
      const field = user.id === conv.host_id ? 'host_unread' : 'guest_unread';
      await s.from('chat_conversations').update({ [field]: 0 }).eq('id', conv.id);
    }

    // Load and render messages
    if (conv) {
      const msgs = await loadMessages(conv.id);
      renderMessages(msgs);
      subscribeRealtime(conv.id);
    }
  }

  /* ── Open full-screen inbox ──────────────────────────────────── */
  async function openInbox() {
    const user = window.CURRENT_USER;
    if (!user) { window.location.href = 'auth.html?next=' + encodeURIComponent(location.href); return; }

    _userId = user.id;
    injectCSS();
    buildInboxOverlay();

    const overlay = document.getElementById('apt-inbox-overlay');
    const listWrap = document.getElementById('apt-inbox-list-wrap');
    const thread   = document.getElementById('apt-inbox-thread');

    // Make sure thread is hidden, list is shown
    thread.classList.remove('open');
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';

    // Loading state
    listWrap.innerHTML = `<div class="apt-inbox-empty"><div class="apt-inbox-empty-ico">⏳</div><div class="apt-inbox-empty-title">Loading…</div></div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const s = window.sb;
    if (!s) {
      listWrap.innerHTML = `<div class="apt-inbox-empty"><div class="apt-inbox-empty-ico">⚠️</div><div class="apt-inbox-empty-title">Not connected</div><div class="apt-inbox-empty-sub">Please refresh and try again.</div></div>`;
      return;
    }

    const { data: convs } = await s.from('chat_conversations')
      .select('*')
      .or(\`host_id.eq.\${user.id},guest_id.eq.\${user.id}\`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);

    if (!convs?.length) {
      listWrap.innerHTML = `<div class="apt-inbox-empty">
        <div class="apt-inbox-empty-ico">📭</div>
        <div class="apt-inbox-empty-title">No messages yet</div>
        <div class="apt-inbox-empty-sub">When you enquire about a listing or a guest messages you, conversations will appear here.</div>
      </div>`;
      return;
    }

    document.getElementById('apt-inbox-bar-sub').textContent = \`\${convs.length} conversation\${convs.length !== 1 ? 's' : ''}\`;

    const ICO = { apartment:'🏠', roommate:'🤝', tour:'🦁', event:'🎟', carhire:'🚗', food:'🍽', shopping:'🛍' };

    listWrap.innerHTML = convs.map(c => {
      const isHost = c.host_id === user.id;
      const unread = isHost ? (c.host_unread || 0) : (c.guest_unread || 0);
      const ico = ICO[c.listing_type] || '💬';
      const time = c.last_message_at ? _fmtInboxTime(c.last_message_at) : '';
      const preview = c.last_message || 'No messages yet';
      return \`<div class="apt-inbox-conv\${unread > 0 ? ' unread' : ''}" onclick="ApatmentoChat._inboxOpenConv('\${c.id}')">
        <div class="apt-inbox-conv-ava">
          \${ico}
          <div class="apt-inbox-conv-unread-dot \${unread > 0 ? 'on' : ''}"></div>
        </div>
        <div class="apt-inbox-conv-body">
          <div class="apt-inbox-conv-name">\${c.listing_title || 'Conversation'}</div>
          <div class="apt-inbox-conv-preview">\${preview}</div>
        </div>
        <div class="apt-inbox-conv-meta">
          <div class="apt-inbox-conv-time">\${time}</div>
          \${unread > 0 ? \`<div class="apt-inbox-conv-badge">\${unread}</div>\` : ''}
        </div>
      </div>\`;
    }).join('');
  }

  /* ── Format time for inbox list ──────────────────────────────── */
  function _fmtInboxTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)   return 'Now';
    if (diffMins < 60)  return diffMins + 'm';
    if (diffMins < 1440) return Math.floor(diffMins / 60) + 'h';
    if (diffMins < 10080) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  }

  /* ── Open a conversation thread from inbox ───────────────────── */
  async function _inboxOpenConv(convId) {
    const s = window.sb;
    if (!s) return;

    const { data: c } = await s.from('chat_conversations').select('*').eq('id', convId).maybeSingle();
    if (!c) return;

    _conv = c;
    const ICO = { apartment:'🏠', roommate:'🤝', tour:'🦁', event:'🎟', carhire:'🚗', food:'🍽', shopping:'🛍' };

    // Switch from list to thread view
    const listWrap = document.getElementById('apt-inbox-list-wrap');
    const thread   = document.getElementById('apt-inbox-thread');
    listWrap.style.display = 'none';
    thread.classList.add('open');

    document.getElementById('apt-thread-ico').textContent = ICO[c.listing_type] || '💬';
    document.getElementById('apt-thread-title').textContent = c.listing_title || 'Conversation';

    const msgsEl = document.getElementById('apt-inbox-msgs');
    msgsEl.innerHTML = '<div class="apt-ch-empty"><div class="apt-ch-empty-ico">⏳</div><div class="apt-ch-empty-title">Loading…</div></div>';

    const msgs = await _loadMsgsForEl(convId, msgsEl);

    // Mark as read
    const field = _userId === c.host_id ? 'host_unread' : 'guest_unread';
    await s.from('chat_conversations').update({ [field]: 0 }).eq('id', convId);

    // Subscribe realtime to the inbox msgs element
    if (_realtimeSub) { _realtimeSub.unsubscribe(); _realtimeSub = null; }
    _realtimeSub = s.channel('inbox-' + convId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: \`conversation_id=eq.\${convId}\` },
        async () => { await _loadMsgsForEl(convId, msgsEl); })
      .subscribe();
  }

  /* ── Load messages into a given element ──────────────────────── */
  async function _loadMsgsForEl(convId, el) {
    const s = window.sb;
    if (!s) return;
    const { data } = await s.from('chat_messages')
      .select('*').eq('conversation_id', convId)
      .order('created_at', { ascending: true }).limit(100);
    const msgs = data || [];
    if (!msgs.length) {
      el.innerHTML = \`<div class="apt-ch-empty">
        <div class="apt-ch-empty-ico">👋</div>
        <div class="apt-ch-empty-title">Start the conversation</div>
        <div class="apt-ch-empty-sub">Ask about availability, check-in details, or anything else.</div>
      </div>\`;
      return;
    }
    el.innerHTML = msgs.map(m => {
      const isMe = m.sender_id === _userId;
      const cls = m.is_system ? 'system' : isMe ? 'me' : 'them';
      const content = m.content.replace(/\[(phone|email|link|website|WhatsApp|social handle|social media|direct contact|number) removed\]/gi, '<span style="background:rgba(255,77,109,.12);color:#CC2233;border-radius:4px;padding:1px 5px;font-size:11px;font-weight:700;">[$1 removed]</span>');
      return \`<div class="apt-ch-msg \${cls}">
        <div class="apt-ch-bubble">\${content}</div>
        <div class="apt-ch-time">\${fmtTime(m.created_at)}</div>
      </div>\`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  /* ── Send from inbox thread ───────────────────────────────────── */
  async function _inboxSend() {
    const input = document.getElementById('apt-inbox-input');
    const raw = input?.value.trim();
    if (!raw || !_conv) return;
    const s = window.sb;
    if (!s) return;
    const { text: clean, scrubbed } = scrubContactInfo(raw);
    if (clean.replace(/\[.*? removed\]/g, '').trim().length < 2) {
      const el = document.getElementById('apt-inbox-msgs');
      el.insertAdjacentHTML('beforeend', '<div class="apt-ch-msg system"><div class="apt-ch-bubble">⚠️ Your message contained only contact information, which is not permitted.</div></div>');
      el.scrollTop = el.scrollHeight;
      input.value = '';
      return;
    }
    const btn = document.getElementById('apt-inbox-send');
    if (btn) btn.disabled = true;
    input.value = '';
    input.style.height = '';
    await s.from('chat_messages').insert({ conversation_id: _conv.id, sender_id: _userId, content: clean, content_raw: scrubbed ? raw : null, was_scrubbed: scrubbed });
    const otherField = _userId === _conv.host_id ? 'guest_unread' : 'host_unread';
    await s.from('chat_conversations').update({ last_message: clean.length > 60 ? clean.slice(0,60)+'…' : clean, last_message_at: new Date().toISOString(), last_sender_id: _userId, [otherField]: (_conv[otherField]||0)+1 }).eq('id', _conv.id);
    if (btn) btn.disabled = false;
    await _loadMsgsForEl(_conv.id, document.getElementById('apt-inbox-msgs'));
  }

  /* ── Back to list from thread ─────────────────────────────────── */
  function _inboxBackToList() {
    if (_realtimeSub) { _realtimeSub.unsubscribe(); _realtimeSub = null; }
    document.getElementById('apt-inbox-thread').classList.remove('open');
    const listWrap = document.getElementById('apt-inbox-list-wrap');
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';
  }

  /* ── Close full-screen inbox ──────────────────────────────────── */
  function closeInbox() {
    const overlay = document.getElementById('apt-inbox-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (_realtimeSub) { _realtimeSub.unsubscribe(); _realtimeSub = null; }
  }

  /* ── Open conversation by ID (from inbox) ────────────────────── */
  async function _openConvById(convId) {
    const s = window.sb;
    if (!s) return;
    const { data: c } = await s.from('chat_conversations').select('*').eq('id', convId).maybeSingle();
    if (!c) return;

    _conv = c;
    _inbox = false;
    document.getElementById('apt-ch-input-wrap').style.display = 'flex';
    document.getElementById('apt-ch-head-title').textContent = c.listing_title || 'Conversation';
    document.getElementById('apt-ch-head-sub').textContent = 'Chat';
    const ico = { apartment:'🏠', roommate:'🤝', tour:'🦁', event:'🎟', carhire:'🚗' }[c.listing_type] || '💬';
    document.getElementById('apt-ch-head-ico').textContent = ico;

    document.getElementById('apt-ch-msgs').innerHTML = '<div class="apt-ch-empty"><div class="apt-ch-empty-ico">⏳</div><div class="apt-ch-empty-title">Loading…</div></div>';
    const msgs = await loadMessages(convId);
    renderMessages(msgs);

    if (_realtimeSub) { _realtimeSub.unsubscribe(); _realtimeSub = null; }
    subscribeRealtime(convId);

    // Mark read
    const field = _userId === c.host_id ? 'host_unread' : 'guest_unread';
    await s.from('chat_conversations').update({ [field]: 0 }).eq('id', convId);
  }

  /* ── Send a message ──────────────────────────────────────────── */
  async function send() {
    const input = document.getElementById('apt-ch-input');
    const raw = input?.value.trim();
    if (!raw || !_conv) return;

    const s = window.sb;
    if (!s) return;

    // Scrub contact info
    const { text: clean, scrubbed } = scrubContactInfo(raw);

    // Block if entire message was contact info
    if (clean.replace(/\[.*? removed\]/g, '').trim().length < 2) {
      // Show warning in chat
      const el = document.getElementById('apt-ch-msgs');
      const warn = document.createElement('div');
      warn.className = 'apt-ch-msg system';
      warn.innerHTML = '<div class="apt-ch-bubble">⚠️ Your message contained only contact information, which is not permitted. Please use this chat to communicate.</div>';
      el.appendChild(warn);
      el.scrollTop = el.scrollHeight;
      input.value = '';
      return;
    }

    // Disable button while sending
    const btn = document.getElementById('apt-ch-send');
    if (btn) btn.disabled = true;
    input.value = '';
    input.style.height = '';

    await s.from('chat_messages').insert({
      conversation_id: _conv.id,
      sender_id: _userId,
      content: clean,
      content_raw: scrubbed ? raw : null,
      was_scrubbed: scrubbed,
    });

    // Update conversation last message + unread for other party
    const otherField = _userId === _conv.host_id ? 'guest_unread' : 'host_unread';
    await s.from('chat_conversations').update({
      last_message: clean.length > 60 ? clean.slice(0, 60) + '…' : clean,
      last_message_at: new Date().toISOString(),
      last_sender_id: _userId,
      [otherField]: (_conv[otherField] || 0) + 1,
    }).eq('id', _conv.id);

    if (btn) btn.disabled = false;

    // Reload messages (realtime will also trigger but this is instant)
    const msgs = await loadMessages(_conv.id);
    renderMessages(msgs);
  }

  /* ── Textarea auto-size ──────────────────────────────────────── */
  function _autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  /* ── Close ───────────────────────────────────────────────────── */
  function close() {
    document.getElementById('apt-chat-overlay')?.classList.remove('open');
    if (_realtimeSub) { _realtimeSub.unsubscribe(); _realtimeSub = null; }
  }

  /* ── Show FAB if logged in ───────────────────────────────────── */
  function initFAB() {
    const user = window.CURRENT_USER;
    if (!user) return;
    injectCSS();
    buildOverlay();
    const fab = document.getElementById('apt-chat-fab');
    if (fab) fab.classList.add('visible');
  }

  return { open, openInbox, closeInbox, close, send, _autosize, _openConvById, _inboxOpenConv, _inboxBackToList, _inboxSend, initFAB, scrubContactInfo };
})();
