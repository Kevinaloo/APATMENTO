/* ══════════════════════════════════════════════════════════════════════
   CABANA · VOICE
   cabana-call.js

   In-app voice between a guest and the Cabana desk. No phone number is
   dialled, shown, or stored, on either side. The audio is a direct peer
   connection; Cabana's servers only introduce the two browsers.

   TWO TRANSPORTS, ON PURPOSE
   ──────────────────────────
   Signalling goes out over Supabase Realtime broadcast AND over an HTTPS
   relay, simultaneously, every time. Realtime is faster and carries the
   ordinary call. The relay is what still works on the hotel wifi, the
   corporate proxy and the throttled mobile connection that a stranded
   guest is very often the one using. Every signal carries an id and the
   receiving side applies the first copy it sees, so running both costs a
   few duplicate packets and buys a call that connects.

   FAILURE IS A STATE, NOT A CRASH
   ───────────────────────────────
   Every way this can go wrong has a name the caller can read: microphone
   refused, nobody free, network gave out, reconnecting. The one thing it
   never does is sit on "Connecting…" forever — there is a deadline on
   every phase and a real sentence at the end of it.

     CabanaCall.start({ threadId })   ring the desk
     CabanaCall.answer(callId)        pick up (desk, or a rung guest)
     CabanaCall.hangup()              end
     CabanaCall.on(event, fn)         state | error | level | remote
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaCall) return;

  var API = '/api/call';

  /* Phase deadlines. Past these, we say something true rather than spin. */
  var RING_TIMEOUT_MS    = 45000;  // nobody picked up
  var CONNECT_TIMEOUT_MS = 20000;  // answered, but ICE never completed
  var POLL_FAST_MS       = 700;    // while negotiating
  var POLL_SLOW_MS       = 2500;   // once media is flowing
  var RECONNECT_GRACE_MS = 12000;  // ICE dropped; how long before we call it

  /* ── State ──────────────────────────────────────────────────────── */
  var call = null;         // the server's row
  var side = null;         // 'caller' | 'callee'
  var pc = null;           // RTCPeerConnection
  var localStream = null;
  var remoteAudio = null;
  var pollTimer = null;
  var ringTimer = null;
  var connectTimer = null;
  var reconnectTimer = null;
  var durationTimer = null;
  var rtChannel = null;    // Supabase realtime broadcast
  var cursor = 0;          // relay read position
  var seen = Object.create(null);
  var pendingIce = [];     // candidates that arrived before the answer
  var haveRemote = false;
  var state = 'idle';
  var startedAt = 0;
  var muted = false;
  var listeners = {};
  var levelRaf = null;
  var audioCtx = null;
  var guestKeyFn = null;

  /* ══════════════════════════════════════════════════════════════════
     EVENTS
  ══════════════════════════════════════════════════════════════════ */
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(evt, data) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.warn('[call:listener]', e); }
    });
  }
  function setState(next, detail) {
    if (state === next) return;
    state = next;
    emit('state', { state: next, detail: detail || null, call: call, side: side });
  }

  /* ══════════════════════════════════════════════════════════════════
     TRANSPORT
  ══════════════════════════════════════════════════════════════════ */
  function guestKey() {
    if (guestKeyFn) { try { return guestKeyFn(); } catch (e) { /* fall through */ } }
    if (global.CabanaSupport && global.CabanaSupport.guestKey) {
      try { return global.CabanaSupport.guestKey(); } catch (e) { /* fall through */ } }
    return null;
  }

  function supa() {
    try {
      return (global.ApaSession && global.ApaSession.client && global.ApaSession.client())
        || global.__APA_SB__ || global.sb || null;
    } catch (e) { return global.sb || null; }
  }

  function authHeader() {
    try {
      if (global.ApaSession && global.ApaSession.token) {
        return Promise.resolve(global.ApaSession.token()).then(function (t) {
          return t ? { Authorization: 'Bearer ' + t } : {};
        }, function () { return {}; });
      }
      var sb = supa();
      if (sb && sb.auth && sb.auth.getSession) {
        return sb.auth.getSession().then(function (r) {
          var t = r && r.data && r.data.session && r.data.session.access_token;
          return t ? { Authorization: 'Bearer ' + t } : {};
        }, function () { return {}; });
      }
    } catch (e) { /* not signed in; the guest key carries identity */ }
    return Promise.resolve({});
  }

  function api(op, payload) {
    var body = Object.assign({ op: op }, payload || {});
    var gk = guestKey();
    if (gk) body.guestKey = gk;
    return authHeader().then(function (auth) {
      return fetch(API, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
        body: JSON.stringify(body),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) { var e = new Error(d.error || ('http_' + r.status)); e.data = d; e.status = r.status; throw e; }
          return d;
        });
      });
    });
  }

  /* ── Realtime. Best effort: its absence changes latency, not
     capability, because the relay carries the same signals. ── */
  function openRealtime() {
    try {
      var sb = supa();
      if (!sb || !sb.channel || !call) return;
      rtChannel = sb.channel('cbn-call-' + call.channel, {
        config: { broadcast: { self: false, ack: false } },
      });
      rtChannel.on('broadcast', { event: 'sig' }, function (msg) {
        var p = msg && msg.payload;
        if (p && p.from !== side) handleSignal(p);
      }).subscribe();
    } catch (e) {
      console.warn('[call:realtime]', e && e.message);
      rtChannel = null;
    }
  }

  function closeRealtime() {
    try { if (rtChannel) rtChannel.unsubscribe(); } catch (e) { /* already gone */ }
    rtChannel = null;
  }

  /* Out over both paths. The relay call is the one that must not be
     skipped: it is the path that survives everything. */
  function sendSignal(kind, payload) {
    var id = (global.crypto && global.crypto.randomUUID)
      ? global.crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2);
    seen[id] = true;

    if (rtChannel) {
      try { rtChannel.send({ type: 'broadcast', event: 'sig', payload: { from: side, kind: kind, signal_id: id, payload: payload } }); }
      catch (e) { /* the relay below is the guarantee */ }
    }
    return api('signal', { callId: call.id, side: side, kind: kind, signalId: id, payload: payload })
      .catch(function (e) { console.warn('[call:signal]', e.message); });
  }

  /* ══════════════════════════════════════════════════════════════════
     SIGNAL HANDLING
  ══════════════════════════════════════════════════════════════════ */
  function handleSignal(sig) {
    var id = sig.signal_id || sig.signalId;
    if (id) { if (seen[id]) return; seen[id] = true; }
    var payload = sig.payload;

    if (sig.kind === 'bye') { finish(sig.payload && sig.payload.reason === 'declined' ? 'declined' : 'remote_hangup'); return; }
    if (!pc) return;

    if (sig.kind === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(payload))
        .then(function () { haveRemote = true; return drainIce(); })
        .then(function () { return pc.createAnswer(); })
        .then(function (answer) { return pc.setLocalDescription(answer).then(function () { return answer; }); })
        .then(function (answer) { sendSignal('answer', { type: answer.type, sdp: answer.sdp }); })
        .catch(function (e) { fail('negotiation_failed', e.message); });
      return;
    }

    if (sig.kind === 'answer') {
      /* An answer that arrives when we are not expecting one is a
         duplicate down the second transport, not an error. */
      if (pc.signalingState !== 'have-local-offer') return;
      pc.setRemoteDescription(new RTCSessionDescription(payload))
        .then(function () { haveRemote = true; return drainIce(); })
        .catch(function (e) { fail('negotiation_failed', e.message); });
      return;
    }

    if (sig.kind === 'ice' && payload) {
      /* A candidate before the remote description is normal in trickle
         ICE. Hold it rather than throwing it away. */
      if (!haveRemote) { pendingIce.push(payload); return; }
      pc.addIceCandidate(new RTCIceCandidate(payload)).catch(function (e) {
        console.warn('[call:ice]', e && e.message);
      });
    }
  }

  function drainIce() {
    var queued = pendingIce.splice(0);
    return Promise.all(queued.map(function (c) {
      return pc.addIceCandidate(new RTCIceCandidate(c)).catch(function () { /* stale candidate */ });
    }));
  }

  /* ── Relay polling. Fast while negotiating, slow once audio flows,
     because trickle ICE keeps arriving for a few seconds after. ── */
  function poll() {
    if (!call) return;
    api('poll', { callId: call.id, side: side, after: cursor })
      .then(function (d) {
        if (!call) return;
        if (d.cursor) cursor = d.cursor;
        (d.signals || []).forEach(function (s) {
          handleSignal({ kind: s.kind, signal_id: s.signal_id, payload: s.payload });
        });

        var status = d.call && d.call.status;
        if (call) call.status = status;
        if (d.call && d.call.callee_name && !call.callee_name) call.callee_name = d.call.callee_name;

        if (status === 'declined') { finish('declined'); return; }
        if (status === 'missed')   { finish('missed'); return; }
        if (status === 'ended')    { finish('remote_hangup'); return; }

        /* The desk picked up. From here the caller makes the offer. */
        if (status === 'connecting' && state === 'ringing') {
          clearTimeout(ringTimer);
          setState('connecting', { answeredBy: d.call && d.call.callee_name });
          if (side === 'caller') makeOffer();
          armConnectTimeout();
        }
      })
      .catch(function (e) {
        if (e.status === 404) { finish('gone'); return; }
        /* A dropped poll is a dropped poll. Keep going. */
      })
      .then(schedulePoll);
  }

  function schedulePoll() {
    clearTimeout(pollTimer);
    if (!call || state === 'ended' || state === 'idle') return;
    pollTimer = setTimeout(poll, state === 'active' ? POLL_SLOW_MS : POLL_FAST_MS);
  }

  /* ══════════════════════════════════════════════════════════════════
     MEDIA
  ══════════════════════════════════════════════════════════════════ */
  function getMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('unsupported'));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
  }

  /* A live meter, so a silent call is visibly silent rather than
     ambiguous. Cheap: one analyser, one rAF, torn down with the call. */
  function meter(stream) {
    try {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      var src = audioCtx.createMediaStreamSource(stream);
      var analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      var buf = new Uint8Array(analyser.frequencyBinCount);
      (function tick() {
        if (!audioCtx) return;
        analyser.getByteFrequencyData(buf);
        var sum = 0;
        for (var i = 0; i < buf.length; i++) sum += buf[i];
        emit('level', Math.min(1, (sum / buf.length) / 90));
        levelRaf = requestAnimationFrame(tick);
      })();
    } catch (e) { /* a meter is a nicety, never a blocker */ }
  }

  function buildPeer(config) {
    pc = new RTCPeerConnection({
      iceServers: config.iceServers || [],
      iceTransportPolicy: config.iceTransportPolicy || 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    localStream.getTracks().forEach(function (t) { pc.addTrack(t, localStream); });

    pc.onicecandidate = function (e) {
      if (e.candidate) sendSignal('ice', e.candidate.toJSON ? e.candidate.toJSON() : e.candidate);
    };

    pc.ontrack = function (e) {
      var stream = e.streams && e.streams[0];
      if (!stream) return;
      if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.autoplay = true;
        remoteAudio.setAttribute('playsinline', '');
        remoteAudio.style.display = 'none';
        document.body.appendChild(remoteAudio);
      }
      remoteAudio.srcObject = stream;
      /* Autoplay can be refused. Say so instead of playing nothing. */
      var p = remoteAudio.play();
      if (p && p.catch) p.catch(function () { emit('error', { code: 'autoplay_blocked' }); });
      emit('remote', stream);
    };

    pc.onconnectionstatechange = function () {
      var s = pc.connectionState;
      if (s === 'connected') {
        clearTimeout(connectTimer);
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        if (state !== 'active') {
          startedAt = Date.now();
          setState('active');
          tickDuration();
          schedulePoll();
        } else {
          setState('active');
        }
      } else if (s === 'disconnected') {
        /* Mobile networks flap. Give it a real chance to come back
           before declaring the call dead. */
        setState('reconnecting');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(function () {
          if (pc && pc.connectionState !== 'connected') fail('network_lost', 'ICE did not recover');
        }, RECONNECT_GRACE_MS);
      } else if (s === 'failed') {
        fail('network_lost', 'ICE failed');
      }
    };
  }

  function makeOffer() {
    if (!pc) return;
    pc.createOffer({ offerToReceiveAudio: true })
      .then(function (offer) { return pc.setLocalDescription(offer).then(function () { return offer; }); })
      .then(function (offer) { sendSignal('offer', { type: offer.type, sdp: offer.sdp }); })
      .catch(function (e) { fail('negotiation_failed', e.message); });
  }

  function tickDuration() {
    clearInterval(durationTimer);
    durationTimer = setInterval(function () {
      if (state !== 'active' && state !== 'reconnecting') return;
      emit('tick', Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }

  /* ══════════════════════════════════════════════════════════════════
     TIMEOUTS
  ══════════════════════════════════════════════════════════════════ */
  function armRingTimeout() {
    clearTimeout(ringTimer);
    ringTimer = setTimeout(function () {
      if (state === 'ringing') fail('no_answer');
    }, RING_TIMEOUT_MS);
  }
  function armConnectTimeout() {
    clearTimeout(connectTimer);
    connectTimer = setTimeout(function () {
      if (state === 'connecting') fail('connect_timeout');
    }, CONNECT_TIMEOUT_MS);
  }

  /* ══════════════════════════════════════════════════════════════════
     LIFECYCLE
  ══════════════════════════════════════════════════════════════════ */
  function start(opts) {
    opts = opts || {};
    if (call) return Promise.resolve({ already: true });

    setState('requesting_mic');
    return getMic()
      .catch(function (e) {
        var code = (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) ? 'mic_denied'
                 : (e && e.name === 'NotFoundError') ? 'mic_missing'
                 : 'mic_unavailable';
        fail(code, e && e.message);
        throw e;
      })
      .then(function (stream) {
        localStream = stream;
        meter(stream);
        setState('dialling');
        return api('start', { threadId: opts.threadId || null, page: opts.page || null });
      })
      .then(function (d) {
        call = d.call; side = d.side || 'caller'; cursor = 0;
        if (!d.hasTurn) console.info('[call] STUN only — TURN is not configured for this deployment.');
        buildPeer(d);
        openRealtime();
        setState(call.status === 'connecting' ? 'connecting' : 'ringing');
        armRingTimeout();
        schedulePoll();
        /* A resumed session may already have been answered while the tab
           was reloading, in which case there is nobody left to wait for. */
        if (call.status === 'connecting' && side === 'caller') { makeOffer(); armConnectTimeout(); }
        return { call: call };
      })
      .catch(function (e) {
        if (state !== 'ended') fail('start_failed', e && e.message);
        throw e;
      });
  }

  function answer(callId) {
    if (call) return Promise.resolve({ already: true });
    setState('requesting_mic');
    return getMic()
      .catch(function (e) {
        fail(e && e.name === 'NotAllowedError' ? 'mic_denied' : 'mic_unavailable', e && e.message);
        throw e;
      })
      .then(function (stream) {
        localStream = stream;
        meter(stream);
        return api('answer', { callId: callId });
      })
      .then(function (d) {
        call = d.call; side = d.side || 'callee'; cursor = 0;
        buildPeer(d);
        openRealtime();
        setState('connecting');
        armConnectTimeout();
        schedulePoll();
        return { call: call };
      })
      .catch(function (e) {
        if (e && e.data && e.data.error === 'already_answered') {
          fail('already_answered', e.data.by || null);
        } else if (state !== 'ended') {
          fail('answer_failed', e && e.message);
        }
        throw e;
      });
  }

  function deskCall(threadId) {
    setState('requesting_mic');
    return getMic()
      .catch(function (e) { fail(e && e.name === 'NotAllowedError' ? 'mic_denied' : 'mic_unavailable', e && e.message); throw e; })
      .then(function (stream) {
        localStream = stream; meter(stream);
        return api('agent.call', { threadId: threadId });
      })
      .then(function (d) {
        call = d.call; side = 'caller'; cursor = 0;
        buildPeer(d); openRealtime();
        setState('ringing'); armRingTimeout(); schedulePoll();
        return { call: call };
      });
  }

  function decline(callId) {
    return api('decline', { callId: callId }).catch(function () { /* the row expires regardless */ });
  }

  function hangup(reason) {
    if (!call) { cleanup(); setState('idle'); return Promise.resolve(); }
    var id = call.id;
    var stats = collectStats();
    return stats.then(function (quality) {
      return api('end', { callId: id, side: side, reason: reason || 'hung_up', quality: quality });
    }).catch(function () { /* the sweeper closes it if this never lands */ })
      .then(function () { finish('local_hangup'); });
  }

  /* One honest quality sample at the end, for the desk to look at later
     when someone says "the call was terrible". */
  function collectStats() {
    if (!pc || !pc.getStats) return Promise.resolve(null);
    return pc.getStats().then(function (report) {
      var out = null;
      report.forEach(function (s) {
        if (s.type === 'inbound-rtp' && s.kind === 'audio') {
          out = out || {};
          out.packets_lost = s.packetsLost;
          out.jitter = s.jitter;
          out.packets_received = s.packetsReceived;
        }
        if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) {
          out = out || {};
          out.rtt = s.currentRoundTripTime;
        }
      });
      return out;
    }).catch(function () { return null; });
  }

  function toggleMute() {
    muted = !muted;
    if (localStream) localStream.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    emit('mute', muted);
    return muted;
  }

  function fail(code, detail) {
    emit('error', { code: code, detail: detail || null });
    finish(code);
  }

  function finish(reason) {
    if (state === 'ended') return;
    var seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    cleanup();
    state = 'ended';
    emit('state', { state: 'ended', detail: { reason: reason, seconds: seconds } });
    emit('ended', { reason: reason, seconds: seconds });
    /* Settle back to idle so the next call starts from a clean slate. */
    setTimeout(function () { if (state === 'ended') { state = 'idle'; emit('state', { state: 'idle' }); } }, 60);
  }

  function cleanup() {
    clearTimeout(pollTimer); clearTimeout(ringTimer);
    clearTimeout(connectTimer); clearTimeout(reconnectTimer);
    clearInterval(durationTimer);
    pollTimer = ringTimer = connectTimer = reconnectTimer = durationTimer = null;

    if (levelRaf) { cancelAnimationFrame(levelRaf); levelRaf = null; }
    if (audioCtx) { try { audioCtx.close(); } catch (e) { /* already closed */ } audioCtx = null; }

    closeRealtime();

    if (pc) {
      try { pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null; pc.close(); }
      catch (e) { /* already closed */ }
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      localStream = null;
    }
    if (remoteAudio) {
      try { remoteAudio.srcObject = null; remoteAudio.remove(); } catch (e) {}
      remoteAudio = null;
    }
    call = null; side = null; cursor = 0; haveRemote = false;
    pendingIce = []; seen = Object.create(null);
    startedAt = 0; muted = false;
  }

  /* A tab closing mid-call should not leave the desk holding a line. */
  global.addEventListener('pagehide', function () {
    if (call && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(API, new Blob([JSON.stringify({
          op: 'end', callId: call.id, side: side, reason: 'tab_closed', guestKey: guestKey(),
        })], { type: 'application/json' }));
      } catch (e) { /* best effort by definition */ }
    }
  });

  /* ── Human-readable reasons. The UI should never invent its own. ── */
  var MESSAGES = {
    mic_denied:      'Microphone access is blocked. Allow it in your browser settings and try again.',
    mic_missing:     'No microphone found on this device.',
    mic_unavailable: 'Could not open your microphone. Another app may be using it.',
    unsupported:     'This browser cannot make calls. Chrome, Safari or Firefox will work.',
    no_answer:       'Nobody was free to pick up. Message us instead and we will come straight back to you.',
    declined:        'The call was declined.',
    missed:          'The call was not answered.',
    connect_timeout: 'Could not connect the audio. Your network may be blocking calls.',
    network_lost:    'The connection dropped.',
    negotiation_failed: 'Something went wrong setting up the call.',
    already_answered: 'Another teammate picked this up.',
    autoplay_blocked: 'Tap anywhere to let audio play.',
    remote_hangup:   'Call ended.',
    local_hangup:    'Call ended.',
    gone:            'That call is no longer available.',
    start_failed:    'Could not start the call. Check your connection and try again.',
    answer_failed:   'Could not join the call.',
  };

  global.CabanaCall = {
    start: start,
    answer: answer,
    deskCall: deskCall,
    decline: decline,
    hangup: hangup,
    toggleMute: toggleMute,
    on: on,
    message: function (code) { return MESSAGES[code] || 'Call ended.'; },
    get state() { return state; },
    get call() { return call; },
    get muted() { return muted; },
    get supported() {
      return !!(global.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia
                && (global.isSecureContext !== false));
    },
    setGuestKeyProvider: function (fn) { guestKeyFn = fn; },
  };
})(window);
