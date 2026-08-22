/* ══════════════════════════════════════════════════════════════════════
   CABANA · SUPPORT DESK
   support-console.js

   The operator side of the guest's conversation. Not a separate system:
   the same thread, the same messages, the same call — seen from the desk.

   WHAT THE AGENT NEEDS, AND WHY THE LAYOUT IS WHAT IT IS
   ──────────────────────────────────────────────────────
   Left: what is waiting, ordered by how long it has waited and how badly
   it needs someone. Middle: everything already said, including every word
   APA said, so a human never contradicts the assistant. Right: the
   guest's actual bookings and payments, because "let me look that up" is
   the sentence that turns a two-minute fix into a two-day thread.

   Authorisation is not this file's job and it does not pretend otherwise.
   Every request goes to /api/support with op 'agent.*', which checks
   admin_users server-side, every time. This page is a view.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var API = '/api/support';
  var CALL_API = '/api/call';

  var QUEUE_POLL_MS  = 6000;
  var THREAD_POLL_MS = 3500;
  var RING_POLL_MS   = 5000;

  var state = {
    filter: 'open',
    threads: [],
    active: null,      // full thread row
    messages: [],
    ringing: null,     // an incoming call we are offering to answer
    me: null,
  };
  var timers = {};
  var el = {};

  var CANNED = [
    ['On it', 'Looking at this now — one moment.'],
    ['Refund started', 'I have started the refund on this. It lands back on your M-Pesa within 3 to 7 business days, and I will confirm here once it is out.'],
    ['Need booking ref', 'Could you give me the booking reference? It is on the booking in My Bookings, top of the card.'],
    ['Escalating', 'I am taking this to the team who can action it directly. I will come back here with an answer, not a holding message.'],
    ['Rehoming', 'I am finding you somewhere else now and Cabana covers the transport. Stay in this chat and I will send the options here.'],
    ['Resolved?', 'I think that is sorted — anything still open on your side before I close this?'],
  ];

  /* ══════════════════════════════════════════════════════════════════
     PLUMBING
  ══════════════════════════════════════════════════════════════════ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function token() {
    try {
      var sb = global.sb || (global.ApaSession && global.ApaSession.client && global.ApaSession.client());
      var s = sb && sb.auth && sb.auth._currentSession;
      return (s && s.access_token) || null;
    } catch (e) { return null; }
  }

  function api(url, op, payload) {
    var t = token();
    if (!t) return Promise.reject(new Error('no_session'));
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify(Object.assign({ op: op }, payload || {})),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || ('http_' + r.status)); e.status = r.status; e.data = d; throw e; }
        return d;
      });
    });
  }

  var support = function (op, p) { return api(API, op, p); };
  var call    = function (op, p) { return api(CALL_API, op, p); };

  function ago(iso) {
    if (!iso) return '';
    var s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }
  function clockOf(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }
  function money(n) { return 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE'); }

  /* ══════════════════════════════════════════════════════════════════
     QUEUE
  ══════════════════════════════════════════════════════════════════ */
  function loadQueue() {
    if (state.filter === 'platform') {
      return support('agent.chat_queue', { filter: state.chatFilter || 'all' })
        .then(function (d) {
          state.platformConvs = d.convs || [];
          paintPlatformQueue();
        })
        .catch(function (e) {
          if (e.status === 401 || e.status === 403) return gate(e.status);
        });
    }
    return support('agent.queue', { filter: state.filter })
      .then(function (d) {
        state.threads = d.threads || [];
        paintQueue();
        paintStats(d.stats || {});
      })
      .catch(function (e) {
        if (e.status === 401 || e.status === 403) return gate(e.status);
      });
  }

  function paintStats(s) {
    var rows = [
      ['Queued', s.queued, (s.queued || 0) > 0],
      ['Assigned', s.assigned, false],
      ['Live calls', s.live_calls, (s.live_calls || 0) > 0],
      ['Today', s.today_new, false],
      ['APA solved', s.today_apa_resolved, false],
    ];
    if (s.median_first_response_s != null) {
      var m = Math.round(Number(s.median_first_response_s) / 60);
      rows.push(['Median 1st reply', m > 0 ? m + 'm' : '<1m', false]);
    }
    if (s.csat_7d) rows.push(['CSAT 7d', s.csat_7d, false]);
    el.stats.innerHTML = rows.map(function (r) {
      return '<span class="stat"' + (r[2] ? ' data-hot="1"' : '') + '>' + esc(r[0]) + ' <b>' + esc(r[1] == null ? '0' : r[1]) + '</b></span>';
    }).join('');
  }

  function paintQueue() {
    if (!state.threads.length) {
      el.qlist.innerHTML = '<div class="empty" style="height:auto;padding:40px 16px"><div>✓</div><p>'
        + (state.filter === 'open' ? 'Nothing waiting. APA is handling everything.' : 'Nothing here.')
        + '</p></div>';
      return;
    }
    el.qlist.innerHTML = state.threads.map(function (t, i) {
      var who = t.display_name || t.email || 'Anonymous visitor';
      var pills = [
        '<span class="pill" data-k="' + esc(t.priority) + '">' + esc(t.priority) + '</span>',
        '<span class="pill" data-k="' + esc(t.status) + '">' + esc(t.status) + '</span>',
      ];
      if (t.category && t.category !== 'general') pills.push('<span class="pill" data-k="cat">' + esc(t.category) + '</span>');
      if (t.sentiment === 'frustrated' || t.sentiment === 'angry') {
        pills.push('<span class="pill" data-k="' + esc(t.sentiment) + '">' + esc(t.sentiment) + '</span>');
      }
      return '<div class="q" data-id="' + esc(t.id) + '"'
        + (state.active && state.active.id === t.id ? ' data-on="1"' : '')
        + ' style="animation-delay:' + Math.min(i * 24, 260) + 'ms">'
        + '<div class="q-h"><span class="q-n">' + esc(who) + '</span>'
        + (t.unread_agent ? '<span class="q-unread">' + esc(t.unread_agent) + '</span>' : '')
        + '<span class="q-t">' + esc(ago(t.last_message_at)) + '</span></div>'
        + '<div class="q-p">' + esc(t.last_message || t.subject || '') + '</div>'
        + '<div class="q-f">' + pills.join('') + '</div>'
        + '</div>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════════
     PLATFORM CHATS  (guest ↔ host/provider, read-only)
  ══════════════════════════════════════════════════════════════════ */
  function paintPlatformQueue() {
    var convs = state.platformConvs || [];
    if (!convs.length) {
      el.qlist.innerHTML = '<div class="empty" style="height:auto;padding:40px 16px"><div>✓</div><p>No platform conversations yet.</p></div>';
      return;
    }
    el.qlist.innerHTML = convs.map(function (c) {
      var locked = c.status === 'locked';
      var pills = [
        '<span class="pill" data-k="' + esc(c.status) + '">' + esc(c.status) + '</span>',
        '<span class="pill" data-k="cat">' + esc(c.listing_type || 'apt') + '</span>',
      ];
      if (locked && c.locked_reason) pills.push('<span class="pill" data-k="low">' + esc(c.locked_reason) + '</span>');
      if (c.contact_released) pills.push('<span class="pill" data-k="resolved">contact shared</span>');
      return '<div class="q" data-cid="' + esc(c.id) + '">'
        + '<div class="q-h"><span class="q-n">' + esc(c.guest_name) + ' → ' + esc(c.host_name) + '</span>'
        + (c.host_unread || c.guest_unread ? '<span class="q-unread">' + esc((c.host_unread || 0) + (c.guest_unread || 0)) + '</span>' : '')
        + '<span class="q-t">' + esc(ago(c.last_message_at)) + '</span></div>'
        + '<div class="q-p">' + esc(c.listing_title || c.listing_id) + '</div>'
        + '<div class="q-p" style="color:var(--soft);font-size:11px">' + esc(c.last_message || '') + '</div>'
        + '<div class="q-f">' + pills.join('') + '</div>'
        + '</div>';
    }).join('');
  }

  function openPlatformChat(id) {
    if (!id) return;
    doc.body.setAttribute('data-view', 'thread');
    support('agent.chat_thread', { convId: id })
      .then(function (d) {
        state.activePlatformChat = d;
        paintPlatformThread(d);
      })
      .catch(function (e) {
        if (e.status === 401 || e.status === 403) gate(e.status);
      });
  }

  function paintPlatformThread(d) {
    if (!d || !d.conv) return;
    var conv  = d.conv;
    var guest = d.guest;
    var host  = d.host;

    el.name.textContent = guest.name + ' ↔ ' + host.name;

    var bits = [
      '<span class="pill" data-k="' + esc(conv.status) + '">' + esc(conv.status) + '</span>',
      '<span class="pill" data-k="cat">' + esc(conv.listing_type || 'apartment') + '</span>',
    ];
    if (conv.contact_released) bits.push('<span class="pill" data-k="resolved">contact released</span>');
    if (conv.locked_reason) bits.push('<span>' + esc(conv.locked_reason) + '</span>');
    el.meta.innerHTML = bits.join('');

    el.body.innerHTML = (d.messages || []).map(function (m) {
      var label = m.sender === 'system' ? null
                : m.sender === 'guest'  ? guest.name
                : host.name;
      return '<div class="m" data-r="' + esc(m.sender) + '"><div>'
        + (label ? '<div class="m-f">' + esc(label) + '</div>' : '')
        + '<div class="m-b">' + esc(m.body) + '</div>'
        + (m.sender !== 'system' ? '<div class="m-t">' + esc(clockOf(m.at)) + '</div>' : '')
        + '</div></div>';
    }).join('');
    el.body.scrollTop = el.body.scrollHeight;

    /* Context panel */
    var ctxHtml = '<div style="padding:16px 14px;font:400 12px/1.7 Inter,sans-serif;color:var(--soft)">';
    ctxHtml += '<div style="font-weight:700;color:var(--ink);margin-bottom:10px">Conversation</div>';
    ctxHtml += row('Listing', esc(conv.listing_title || conv.listing_id));
    ctxHtml += row('Type', esc(conv.listing_type || '—'));
    ctxHtml += row('Status', esc(conv.status));
    ctxHtml += row('Contact released', conv.contact_released ? 'Yes' : 'No');
    if (conv.locked_reason) ctxHtml += row('Locked reason', esc(conv.locked_reason));
    ctxHtml += '<div style="margin-top:14px;font-weight:700;color:var(--ink)">Guest</div>';
    ctxHtml += row('Name',  esc(guest.name));
    ctxHtml += row('Email', esc(guest.email || '—'));
    ctxHtml += row('Phone', esc(guest.phone || '—'));
    ctxHtml += '<div style="margin-top:14px;font-weight:700;color:var(--ink)">Host / Provider</div>';
    ctxHtml += row('Name',  esc(host.name));
    ctxHtml += row('Email', esc(host.email || '—'));
    ctxHtml += row('Phone', esc(host.phone || '—'));
    ctxHtml += '<div style="margin-top:14px;padding:10px;background:rgba(255,255,255,.04);border-radius:8px;font-size:11px;color:var(--soft)">Read-only view. Intervening in platform chats is done through the admin panel.</div>';
    ctxHtml += '</div>';
    el.ctx.innerHTML = ctxHtml;

    /* Disable reply — platform chats are observation-only */
    el.reply.disabled = true;
    el.reply.placeholder = 'Platform chats are read-only. Use Admin to intervene.';
    doc.getElementById('send').disabled = true;
    el.resolve.disabled = true;
  }

  /* ══════════════════════════════════════════════════════════════════
     THREAD
  ══════════════════════════════════════════════════════════════════ */
  function openThread(id) {
    if (!id) return;
    doc.body.setAttribute('data-view', 'thread');
    return support('agent.thread', { threadId: id })
      .then(function (d) {
        state.active = d.thread;
        state.messages = d.messages || [];
        paintThread();
        paintContext(d.context, d.thread, d.events);
        paintQueue();
        schedule('thread', pollThread, THREAD_POLL_MS);
        try { history.replaceState(null, '', '?thread=' + id); } catch (e) { /* file:// or a locked history */ }
      })
      .catch(function (e) {
        if (e.status === 401 || e.status === 403) gate(e.status);
      });
  }

  function pollThread() {
    if (!state.active) return;
    support('agent.thread', { threadId: state.active.id })
      .then(function (d) {
        var grew = (d.messages || []).length !== state.messages.length;
        var statusChanged = d.thread && state.active && d.thread.status !== state.active.status;
        state.active = d.thread;
        state.messages = d.messages || [];
        if (grew || statusChanged) { paintThread(); paintContext(d.context, d.thread, d.events); }
        schedule('thread', pollThread, THREAD_POLL_MS);
      })
      .catch(function () { schedule('thread', pollThread, THREAD_POLL_MS * 2); });
  }

  function paintThread() {
    var t = state.active;
    if (!t) return;
    var who = t.display_name || t.email || 'Anonymous visitor';
    el.name.textContent = who;

    var bits = [];
    bits.push('<span class="pill" data-k="' + esc(t.status) + '">' + esc(t.status) + '</span>');
    bits.push('<span class="pill" data-k="' + esc(t.priority) + '">' + esc(t.priority) + '</span>');
    if (t.category) bits.push('<span class="pill" data-k="cat">' + esc(t.category) + '</span>');
    if (t.escalated_at) bits.push('<span>escalated ' + esc(ago(t.escalated_at)) + ' ago</span>');
    if (t.email) bits.push('<span>' + esc(t.email) + '</span>');
    if (!t.user_id) bits.push('<span>not signed in</span>');
    el.meta.innerHTML = bits.join('');

    var atBottom = el.body.scrollHeight - el.body.scrollTop - el.body.clientHeight < 120;
    el.body.innerHTML = state.messages.map(function (m) {
      var from = m.role === 'agent' ? (m.name || 'You')
               : m.role === 'apa' ? 'APA'
               : m.role === 'user' ? who : null;
      return '<div class="m" data-r="' + esc(m.role) + '"><div>'
        + (from ? '<div class="m-f">' + esc(from) + '</div>' : '')
        + '<div class="m-b">' + esc(m.body) + '</div>'
        + (m.role !== 'system' ? '<div class="m-t">' + esc(clockOf(m.at)) + '</div>' : '')
        + '</div></div>';
    }).join('');
    if (atBottom) el.body.scrollTop = el.body.scrollHeight;

    var closed = t.status === 'resolved' || t.status === 'closed';
    el.reply.disabled = false;
    el.reply.placeholder = closed ? 'Replying reopens this conversation…' : 'Reply as Cabana…';
    el.send.disabled = !el.reply.value.trim();
    el.claim.disabled = false;
    el.claim.textContent = t.assigned_to ? 'Release' : 'Claim';
    el.resolve.disabled = closed;
    /* A call needs somebody to ring. An anonymous visitor has no account
       to receive an in-app ring, so the button says so by being off. */
    el.callBtn.disabled = !t.user_id;
    el.callBtn.title = t.user_id ? 'Call this guest in the app' : 'This visitor is not signed in, so there is nobody to ring';
  }

  function paintContext(ctx, thread, events) {
    var html = '';

    html += '<h4>Conversation</h4><div class="cx">'
      + row('Opened', ago(thread.created_at) + ' ago')
      + row('APA replies', String(thread.apa_turns || 0))
      + (thread.origin_page ? row('Started on', thread.origin_page) : '')
      + (thread.escalation_reason ? '<div style="margin-top:9px;font:400 12px/1.6 Inter,sans-serif;color:var(--soft)">' + esc(thread.escalation_reason) + '</div>' : '')
      + '</div>';

    html += '<h4>Set</h4>'
      + '<select class="sel" id="sel-priority">'
      + ['low', 'normal', 'high', 'urgent'].map(function (p) {
          return '<option value="' + p + '"' + (thread.priority === p ? ' selected' : '') + '>Priority: ' + p + '</option>';
        }).join('') + '</select>';

    if (ctx && ctx.profile) {
      var p = ctx.profile;
      html += '<h4>Guest</h4><div class="cx">'
        + row('Name', [p.first_name, p.last_name].filter(Boolean).join(' ') || '—')
        + row('Email', p.email || '—')
        + row('Role', p.last_role || 'guest')
        + row('Verified', p.verified ? 'yes' : 'no')
        + row('With us', ago(p.created_at))
        + '</div>';
    }

    if (ctx && ctx.bookings && ctx.bookings.length) {
      html += '<h4>Their bookings</h4>';
      ctx.bookings.forEach(function (b) {
        var total = Number(b.total || 0), paid = Number(b.amount_paid || 0);
        var due = Math.max(0, total - paid);
        html += '<div class="cx">'
          + '<div class="cx-t">' + esc(b.listing_title || 'Stay') + '</div>'
          + row('Ref', b.reference || '—')
          + row('Status', b.status || '—')
          + (b.check_in ? row('Dates', b.check_in + ' → ' + b.check_out) : '')
          + row('Paid', money(paid) + ' of ' + money(total))
          + (due > 0 ? row('Outstanding', money(due)) : row('Code', 'released'))
          + '</div>';
      });
    } else if (thread.user_id) {
      html += '<h4>Their bookings</h4><div class="cx"><div class="cx-r">No bookings on this account.</div></div>';
    }

    if (events && events.length) {
      html += '<h4>Trail</h4><div class="cx">'
        + events.slice(0, 8).map(function (e) {
            var note = e.detail && (e.detail.note || e.detail.reason);
            return '<div class="cx-r" style="margin-bottom:5px"><span>' + esc(e.kind)
              + (note ? ' · ' + esc(String(note).slice(0, 60)) : '') + '</span><b>' + esc(ago(e.created_at)) + '</b></div>';
          }).join('')
        + '</div>';
    }

    el.ctx.innerHTML = html;

    var sel = doc.getElementById('sel-priority');
    if (sel) sel.addEventListener('change', function () {
      support('agent.update', { threadId: thread.id, priority: sel.value }).then(loadQueue).catch(function () {});
    });
  }

  function row(k, v) {
    return '<div class="cx-r"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     ACTIONS
  ══════════════════════════════════════════════════════════════════ */
  function sendReply() {
    var text = (el.reply.value || '').trim();
    if (!text || !state.active) return;
    el.reply.value = '';
    el.reply.style.height = 'auto';
    el.send.disabled = true;

    /* Optimistic, because an agent typing fast should not be waiting on
       a round trip to see what they just wrote. The poll reconciles. */
    state.messages.push({ role: 'agent', name: 'You', body: text, at: new Date().toISOString() });
    paintThread();

    support('agent.reply', { threadId: state.active.id, text: text })
      .then(function () { loadQueue(); })
      .catch(function () {
        state.messages.push({
          role: 'system',
          body: 'That reply did not send. Check your connection and send it again.',
          at: new Date().toISOString(),
        });
        paintThread();
      });
  }

  /* ══════════════════════════════════════════════════════════════════
     CALLS
  ══════════════════════════════════════════════════════════════════ */
  function watchRinging() {
    call('incoming', {})
      .then(function (d) {
        var ringing = (d.calls || []).filter(function (c) { return c.status === 'ringing' && c.direction === 'outbound'; })[0];
        if (ringing && (!state.ringing || state.ringing.id !== ringing.id) && !isOnCall()) {
          state.ringing = ringing;
          el.ringWho.textContent = (ringing.caller_name || 'A visitor') + ' is calling from the app';
          el.ring.setAttribute('data-on', '1');
          chime();
        } else if (!ringing && state.ringing) {
          state.ringing = null;
          el.ring.removeAttribute('data-on');
        }
        schedule('ring', watchRinging, RING_POLL_MS);
      })
      .catch(function () { schedule('ring', watchRinging, RING_POLL_MS * 2); });
  }

  function isOnCall() {
    return global.CabanaCall && ['requesting_mic', 'dialling', 'ringing', 'connecting', 'active', 'reconnecting']
      .indexOf(global.CabanaCall.state) >= 0;
  }

  /* A short synthesised tone rather than an audio file: no asset to
     fetch, no autoplay policy to lose to, and it stops the instant the
     call is answered. */
  function chime() {
    try {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [0, 0.22].forEach(function (offset) {
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.2);
      });
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 900);
    } catch (e) { /* a chime is a nicety */ }
  }

  function bindCall() {
    if (!global.CabanaCall) return;
    var C = global.CabanaCall;

    C.on('state', function (s) {
      var live = ['requesting_mic', 'dialling', 'ringing', 'connecting', 'active', 'reconnecting'].indexOf(s.state) >= 0;
      el.callui.setAttribute('data-on', live ? '1' : '0');
      el.callui.setAttribute('data-phase', s.state);
      if (live) el.ring.removeAttribute('data-on');

      var copy = {
        requesting_mic: 'Asking for your microphone…',
        dialling: 'Connecting…',
        ringing: 'Ringing the guest…',
        connecting: 'Connecting the audio…',
        active: 'Connected',
        reconnecting: 'Connection wobbled — holding on…',
      };
      el.callSub.textContent = copy[s.state] || '';
      if (s.call) el.callName.textContent = s.call.caller_name || s.call.callee_name || 'Cabana call';

      if (s.state === 'ended') {
        el.callTime.textContent = '';
        var reason = s.detail && s.detail.reason;
        if (reason && reason !== 'local_hangup' && reason !== 'remote_hangup') {
          el.callSub.textContent = C.message(reason);
        }
        state.ringing = null;
        loadQueue();
        if (state.active) pollThread();
      }
    });

    C.on('tick', function (secs) {
      var m = Math.floor(secs / 60), r = secs % 60;
      el.callTime.textContent = m + ':' + (r < 10 ? '0' : '') + r;
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     SCHEDULING
  ══════════════════════════════════════════════════════════════════ */
  function schedule(key, fn, ms) {
    clearTimeout(timers[key]);
    /* A hidden tab is an agent who has walked away. Back off rather than
       hammering the API from ten forgotten windows. */
    timers[key] = setTimeout(fn, doc.hidden ? ms * 3 : ms);
  }

  /* ══════════════════════════════════════════════════════════════════
     GATE
  ══════════════════════════════════════════════════════════════════ */
  function gate(status) {
    Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
    doc.getElementById('app').style.display = 'none';
    doc.getElementById('gate').style.display = 'grid';
    doc.getElementById('gate-msg').textContent = status === 403
      ? 'This account is signed in but is not on the Cabana support roster. Ask an admin to add it.'
      : 'Sign in with a Cabana team account to open the desk.';
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════════ */
  function wire() {
    el.stats = doc.getElementById('stats');
    el.qlist = doc.getElementById('qlist');
    el.body = doc.getElementById('th-body');
    el.name = doc.getElementById('th-name');
    el.meta = doc.getElementById('th-meta');
    el.reply = doc.getElementById('reply');
    el.send = doc.getElementById('send');
    el.claim = doc.getElementById('btn-claim');
    el.resolve = doc.getElementById('btn-resolve');
    el.callBtn = doc.getElementById('btn-call');
    el.ctx = doc.getElementById('ctx');
    el.ring = doc.getElementById('ring');
    el.ringWho = doc.getElementById('ring-who');
    el.callui = doc.getElementById('callui');
    el.callName = doc.getElementById('call-name');
    el.callSub = doc.getElementById('call-sub');
    el.callTime = doc.getElementById('call-time');

    doc.getElementById('canned').innerHTML = CANNED.map(function (c, i) {
      return '<button class="cn" type="button" data-i="' + i + '">' + esc(c[0]) + '</button>';
    }).join('');
    doc.getElementById('canned').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.cn');
      if (!b) return;
      var text = CANNED[Number(b.getAttribute('data-i'))][1];
      /* Inserted, not sent. A canned line is a starting point; sending it
         blind is how a support desk starts sounding like a machine. */
      el.reply.value = el.reply.value ? el.reply.value + ' ' + text : text;
      el.reply.dispatchEvent(new Event('input'));
      el.reply.focus();
    });

    Array.prototype.forEach.call(doc.querySelectorAll('.qtab'), function (tab) {
      tab.addEventListener('click', function () {
        Array.prototype.forEach.call(doc.querySelectorAll('.qtab'), function (t) {
          t.setAttribute('aria-selected', String(t === tab));
        });
        var f = tab.getAttribute('data-filter');
        state.filter = f;
        if (f === 'platform') state.chatFilter = 'all';
        loadQueue();
      });
    });

    el.qlist.addEventListener('click', function (e) {
      var q = e.target.closest && e.target.closest('.q');
      if (!q) return;
      var cid = q.getAttribute('data-cid');
      if (cid) {
        /* Platform chat row */
        openPlatformChat(cid);
      } else {
        openThread(q.getAttribute('data-id'));
      }
    });

    doc.getElementById('back').addEventListener('click', function () {
      doc.body.setAttribute('data-view', 'queue');
    });

    doc.getElementById('rform').addEventListener('submit', function (e) {
      e.preventDefault(); sendReply();
    });
    el.reply.addEventListener('input', function () {
      el.send.disabled = !el.reply.value.trim();
      el.reply.style.height = 'auto';
      el.reply.style.height = Math.min(132, el.reply.scrollHeight) + 'px';
    });
    el.reply.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
    });

    el.claim.addEventListener('click', function () {
      if (!state.active) return;
      var release = !!state.active.assigned_to;
      support('agent.assign', { threadId: state.active.id, unassign: release })
        .then(function () { return openThread(state.active.id); })
        .then(loadQueue).catch(function () {});
    });

    el.resolve.addEventListener('click', function () {
      if (!state.active) return;
      var note = global.prompt('Resolution note (the guest sees a short version of this):', 'Sorted.');
      if (note === null) return;
      support('agent.resolve', { threadId: state.active.id, resolution: note })
        .then(function () { return openThread(state.active.id); })
        .then(loadQueue).catch(function () {});
    });

    el.callBtn.addEventListener('click', function () {
      if (!state.active || !global.CabanaCall) return;
      if (isOnCall()) { global.CabanaCall.hangup('hung_up'); return; }
      global.CabanaCall.deskCall(state.active.id).catch(function () { /* state events report why */ });
    });

    doc.getElementById('ring-accept').addEventListener('click', function () {
      if (!state.ringing || !global.CabanaCall) return;
      var id = state.ringing.id, threadId = state.ringing.thread_id;
      el.ring.removeAttribute('data-on');
      global.CabanaCall.answer(id)
        .then(function () { if (threadId) openThread(threadId); })
        .catch(function () {});
    });
    doc.getElementById('ring-decline').addEventListener('click', function () {
      if (!state.ringing || !global.CabanaCall) return;
      global.CabanaCall.decline(state.ringing.id);
      state.ringing = null;
      el.ring.removeAttribute('data-on');
    });

    doc.getElementById('call-end').addEventListener('click', function () {
      if (global.CabanaCall) global.CabanaCall.hangup('hung_up');
    });
    doc.getElementById('call-mute').addEventListener('click', function () {
      if (!global.CabanaCall) return;
      var m = global.CabanaCall.toggleMute();
      doc.getElementById('call-mute').setAttribute('data-on', m ? '1' : '0');
    });

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) return;
      loadQueue();
      if (state.active) pollThread();
    });
  }

  function boot() {
    wire();
    bindCall();

    /* Confirm the roster server-side before painting anything. The
       client-side admin list is a convenience for redirects; it is not
       what decides who reads a guest's conversation. */
    support('agent.queue', { filter: 'open' })
      .then(function (d) {
        doc.getElementById('app').style.display = '';
        state.threads = d.threads || [];
        paintQueue();
        paintStats(d.stats || {});
        schedule('queue', function tick() { loadQueue().then(function () { schedule('queue', tick, QUEUE_POLL_MS); }); }, QUEUE_POLL_MS);
        watchRinging();

        var want = new URLSearchParams(location.search).get('thread');
        if (want) openThread(want);
        else if (global.innerWidth > 820 && state.threads[0]) openThread(state.threads[0].id);
      })
      .catch(function (e) { gate(e.status || 401); });
  }

  function waitForSession(tries) {
    if (token()) return boot();
    if ((tries || 0) > 60) return gate(401);
    setTimeout(function () { waitForSession((tries || 0) + 1); }, 250);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { waitForSession(0); });
  else waitForSession(0);
})(window);
