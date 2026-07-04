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
#apt-chat-overlay{position:fixed;inset:0;z-index:8000;display:none;align-items:flex-end;justify-content:flex-end;padding:0 16px 16px;pointer-events:none;}
#apt-chat-overlay.open{display:flex;pointer-events:all;}
#apt-chat-panel{width:100%;max-width:380px;height:580px;max-height:92vh;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(10,10,20,.22),0 4px 16px rgba(10,10,20,.1);display:flex;flex-direction:column;overflow:hidden;animation:chat-rise .35s cubic-bezier(.22,1,.36,1);}
@keyframes chat-rise{from{opacity:0;transform:translateY(30px) scale(.97);}to{opacity:1;transform:none;}}
@media(max-width:440px){#apt-chat-panel{max-width:100%;border-radius:20px 20px 0 0;}#apt-chat-overlay{padding:0;align-items:flex-end;}}

/* Header */
.apt-ch-head{padding:14px 16px;background:linear-gradient(135deg,#4361FF,#7B2FF7);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.apt-ch-head-ico{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.apt-ch-head-info{flex:1;min-width:0;}
.apt-ch-head-title{font-weight:700;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.apt-ch-head-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:1px;}
.apt-ch-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.15);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:background .2s;}
.apt-ch-close:hover{background:rgba(255,255,255,.25);}

/* Safety banner */
.apt-ch-banner{background:rgba(67,97,255,.07);border-bottom:1px solid rgba(67,97,255,.1);padding:8px 14px;font-size:11px;color:#4361FF;display:flex;align-items:center;gap:6px;flex-shrink:0;}

/* Messages area */
.apt-ch-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
.apt-ch-msgs::-webkit-scrollbar{width:4px;}
.apt-ch-msgs::-webkit-scrollbar-thumb{background:rgba(10,10,20,.15);border-radius:2px;}

/* Message bubbles */
.apt-ch-msg{max-width:78%;display:flex;flex-direction:column;gap:3px;}
.apt-ch-msg.me{align-self:flex-end;align-items:flex-end;}
.apt-ch-msg.them{align-self:flex-start;align-items:flex-start;}
.apt-ch-bubble{padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.45;word-break:break-word;}
.apt-ch-msg.me .apt-ch-bubble{background:linear-gradient(135deg,#4361FF,#6B4FE8);color:#fff;border-bottom-right-radius:4px;}
.apt-ch-msg.them .apt-ch-bubble{background:#F1F2F8;color:#0A0A14;border-bottom-left-radius:4px;}
.apt-ch-msg.system .apt-ch-bubble{background:#FFF8E7;color:#856404;font-size:12px;border-radius:10px;text-align:center;max-width:100%;}
.apt-ch-msg.them .apt-ch-bubble .scrubbed{background:rgba(255,77,109,.12);color:#CC2233;border-radius:4px;padding:1px 5px;font-size:11px;font-weight:700;}
.apt-ch-time{font-size:10px;color:rgba(10,10,20,.35);padding:0 2px;}

/* Empty state */
.apt-ch-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center;}
.apt-ch-empty-ico{font-size:40px;}
.apt-ch-empty-title{font-size:15px;font-weight:700;color:#0A0A14;}
.apt-ch-empty-sub{font-size:13px;color:#8E90AD;line-height:1.55;max-width:240px;}

/* Typing indicator */
.apt-ch-typing{display:none;padding:4px 14px 0;font-size:11px;color:#8E90AD;flex-shrink:0;}
.apt-ch-typing.visible{display:block;}

/* Input area */
.apt-ch-input-wrap{padding:10px 12px;border-top:1px solid rgba(10,10,20,.07);display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}
.apt-ch-input{flex:1;border:1.5px solid rgba(10,10,20,.1);border-radius:20px;padding:10px 14px;font-size:14px;font-family:inherit;resize:none;outline:none;max-height:100px;min-height:40px;overflow-y:auto;line-height:1.4;transition:border-color .2s;background:#FAFAFA;}
.apt-ch-input:focus{border-color:#4361FF;background:#fff;}
.apt-ch-send{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#4361FF,#7B2FF7);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.apt-ch-send:hover{transform:scale(1.08);}
.apt-ch-send:disabled{background:rgba(10,10,20,.12);transform:none;cursor:not-allowed;}
.apt-ch-send svg{color:#fff;}

/* Inbox mode */
.apt-ch-inbox-list{flex:1;overflow-y:auto;}
.apt-ch-inbox-item{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;border-bottom:1px solid rgba(10,10,20,.05);transition:background .15s;}
.apt-ch-inbox-item:hover{background:#F8F9FF;}
.apt-ch-inbox-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.apt-ch-inbox-title{font-weight:700;font-size:14px;color:#0A0A14;margin-bottom:2px;}
.apt-ch-inbox-preview{font-size:12px;color:#8E90AD;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;}
.apt-ch-inbox-badge{min-width:18px;height:18px;border-radius:9px;background:#4361FF;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;margin-left:auto;flex-shrink:0;}

/* Floating chat button */
#apt-chat-fab{position:fixed;bottom:80px;right:16px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#4361FF,#7B2FF7);border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(67,97,255,.4);z-index:7999;transition:all .3s;}
#apt-chat-fab.visible{display:flex;}
#apt-chat-fab:hover{transform:scale(1.1);}
#apt-chat-fab-badge{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#FF4D6D;color:#fff;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;border:2px solid #fff;padding:0 4px;}
#apt-chat-fab-badge.visible{display:flex;}
    `;
    document.head.appendChild(s);
  }

  /* ── Build overlay HTML ──────────────────────────────────────── */
  function buildOverlay() {
    if (document.getElementById('apt-chat-overlay')) return;
    const el = document.createElement('div');
    el.id = 'apt-chat-overlay';
    el.innerHTML = `
      <div id="apt-chat-panel">
        <div class="apt-ch-head">
          <div class="apt-ch-head-ico" id="apt-ch-head-ico">💬</div>
          <div class="apt-ch-head-info">
            <div class="apt-ch-head-title" id="apt-ch-head-title">Apatmento Chat</div>
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
        <div class="apt-ch-typing" id="apt-ch-typing">typing…</div>
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

    // FAB button
    const fab = document.createElement('button');
    fab.id = 'apt-chat-fab';
    fab.title = 'Messages';
    fab.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span id="apt-chat-fab-badge"></span>
    `;
    fab.onclick = () => ApatmentoChat.openInbox();
    document.body.appendChild(fab);
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

  /* ── Open inbox (all conversations) ─────────────────────────── */
  async function openInbox() {
    const user = window.CURRENT_USER;
    if (!user) { window.location.href = 'auth.html'; return; }

    _userId = user.id;
    _inbox = true;
    injectCSS();
    buildOverlay();

    document.getElementById('apt-ch-head-title').textContent = 'Messages';
    document.getElementById('apt-ch-head-sub').textContent = 'All conversations';
    document.getElementById('apt-ch-head-ico').textContent = '📬';
    document.getElementById('apt-ch-input-wrap').style.display = 'none';
    document.getElementById('apt-chat-overlay').classList.add('open');

    const s = window.sb;
    if (!s) return;

    const { data: convs } = await s.from('chat_conversations')
      .select('*')
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .limit(50);

    const el = document.getElementById('apt-ch-msgs');
    if (!convs?.length) {
      el.innerHTML = `<div class="apt-ch-empty">
        <div class="apt-ch-empty-ico">📭</div>
        <div class="apt-ch-empty-title">No messages yet</div>
        <div class="apt-ch-empty-sub">When you enquire about a listing or receive an enquiry, your messages will appear here.</div>
      </div>`;
      return;
    }

    el.innerHTML = '<div class="apt-ch-inbox-list" id="apt-ch-inbox-list"></div>';
    const list = document.getElementById('apt-ch-inbox-list');
    list.innerHTML = convs.map(c => {
      const isHost = c.host_id === user.id;
      const unread = isHost ? c.host_unread : c.guest_unread;
      const ico = { apartment:'🏠', roommate:'🤝', tour:'🦁', event:'🎟', carhire:'🚗' }[c.listing_type] || '💬';
      return `<div class="apt-ch-inbox-item" onclick="ApatmentoChat._openConvById('${c.id}')">
        <div class="apt-ch-inbox-avatar">${ico}</div>
        <div style="flex:1;min-width:0;">
          <div class="apt-ch-inbox-title">${c.listing_title || 'Conversation'}</div>
          <div class="apt-ch-inbox-preview">${c.last_message || 'No messages yet'}</div>
        </div>
        ${unread > 0 ? `<div class="apt-ch-inbox-badge">${unread}</div>` : ''}
      </div>`;
    }).join('');
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

  return { open, openInbox, close, send, _autosize, _openConvById, initFAB, scrubContactInfo };
})();
