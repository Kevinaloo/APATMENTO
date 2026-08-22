/* ══════════════════════════════════════════════════════════════════════
   CABANA · IN-PLATFORM VOICE
   api/lib/_call.js      →  /api/call   (routed by api/trust.js)

   A guest can talk to the Cabana team without either side learning the
   other's phone number, because there is no phone in this at all. Audio
   is a peer connection between two browsers. This module does the three
   things a browser cannot do for itself:

     1. ICE.  Hand out STUN, and TURN credentials when TURN is
        configured, so a call still connects from behind a carrier NAT —
        which in East Africa is most mobile traffic, not an edge case.
     2. THE LEDGER.  Create the session, ring the desk, record who
        answered and how it ended. Never the audio.
     3. THE RELAY.  Pass offer, answer and ICE candidates between two
        peers that cannot yet reach each other, for the few seconds
        before they can.

   WHY A RELAY WHEN REALTIME EXISTS
   ────────────────────────────────
   Realtime broadcast is faster and carries the ordinary call. But a
   WebSocket is the first thing a hotel network, a corporate proxy or a
   throttled mobile connection drops, and a support call that fails on
   exactly the connection a stranded guest is using is not a support call.
   So both paths run at once, every signal carries an id, and the peer
   applies whichever copy arrives first.

   PRIVACY
   ───────
   No number is exchanged, stored or displayed on either side. `channel`
   is a random one-time string and is worthless the moment the call ends.
   ══════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';
import { select, one, insert, update as dbUpdate, rpc } from './_db.js';
import { setCors, authenticatedUser, isAdminUser, consumeRateLimit } from './_security.js';
import { sendTemplateAsync } from './_mail.js';
import { notify } from './_notify.js';
import { SITE } from './_brand.js';

const GUEST_KEY_RE = /^[a-f0-9]{24,64}$/i;
const uuidish = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
const clamp = (s, n) => String(s == null ? '' : s).slice(0, n);
const nowIso = () => new Date().toISOString();

/* ══════════════════════════════════════════════════════════════════════
   ICE
   ────────────────────────────────────────────────────────────────────
   STUN alone connects a majority of calls and costs nothing. TURN is
   what rescues the rest, and it costs money, so it is credentialed and
   short-lived rather than a static secret sitting in client JavaScript.

   Configure whichever you have:
     Cloudflare   CF_TURN_KEY_ID + CF_TURN_API_TOKEN   (minted per call)
     Anything     TURN_URLS + TURN_USERNAME + TURN_CREDENTIAL
     Coturn       TURN_URLS + TURN_STATIC_SECRET       (HMAC, time-limited)

   With none of them a call still works on most networks, and the client
   is told plainly that it is running STUN-only so a failure to connect
   is diagnosable instead of mysterious.
══════════════════════════════════════════════════════════════════════ */
const STUN = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: ['stun:stun.cloudflare.com:3478'] },
];

let _cfCache = null, _cfCacheAt = 0;

async function cloudflareTurn(ttl = 3600) {
  const id = process.env.CF_TURN_KEY_ID;
  const token = process.env.CF_TURN_API_TOKEN;
  if (!id || !token) return null;
  /* Credentials are reusable inside their own lifetime; minting one per
     call would be a needless round trip on the critical path. */
  if (_cfCache && Date.now() - _cfCacheAt < (ttl * 1000) / 2) return _cfCache;
  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl }),
      }
    );
    if (!r.ok) { console.warn('[call:turn] cloudflare', r.status); return null; }
    const data = await r.json();
    const server = data?.iceServers;
    if (!server) return null;
    _cfCache = Array.isArray(server) ? server : [server];
    _cfCacheAt = Date.now();
    return _cfCache;
  } catch (e) {
    console.warn('[call:turn]', e.message);
    return null;
  }
}

/* Coturn's REST scheme: username is an expiry timestamp, credential is
   its HMAC under a shared secret. Nothing long-lived reaches the client. */
function staticTurn(ttl = 3600) {
  const urls = String(process.env.TURN_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!urls.length) return null;

  const secret = process.env.TURN_STATIC_SECRET;
  if (secret) {
    const username = String(Math.floor(Date.now() / 1000) + ttl);
    const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
    return [{ urls, username, credential }];
  }
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;
  if (username && credential) return [{ urls, username, credential }];
  return null;
}

async function iceServers() {
  const turn = (await cloudflareTurn()) || staticTurn();
  return {
    iceServers: turn ? [...STUN, ...turn] : STUN,
    hasTurn: !!turn,
    /* With TURN present, 'all' lets the browser prefer a direct path and
       fall back. Without it, 'all' is the only sane setting anyway. */
    iceTransportPolicy: 'all',
  };
}

/* ══════════════════════════════════════════════════════════════════════
   IDENTITY
══════════════════════════════════════════════════════════════════════ */
async function resolveCaller(req, body) {
  const user = await authenticatedUser(req).catch(() => null);
  if (user?.id) {
    const profile = await one('profiles', `id=eq.${user.id}&select=first_name,last_name,email`).catch(() => null);
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return { kind: 'user', userId: user.id, name: name || null, email: profile?.email || user.email || null, isAdmin: await isAdminUser(user) };
  }
  const key = String(body?.guestKey || '').trim().toLowerCase();
  if (GUEST_KEY_RE.test(key)) return { kind: 'guest', userId: null, guestKey: key, name: null, email: null, isAdmin: false };
  return null;
}

/* A call belongs to two people and an admin. Anyone else asking about it
   gets the same answer as someone asking about a call that never was. */
async function accessibleCall(caller, callId) {
  if (!uuidish(callId)) return null;
  const call = await one('call_sessions', `id=eq.${callId}&select=*`);
  if (!call) return null;
  if (caller.isAdmin) return { call, side: call.caller_id === caller.userId ? 'caller' : 'callee' };
  if (caller.kind === 'user') {
    if (call.caller_id === caller.userId) return { call, side: 'caller' };
    if (call.callee_id === caller.userId) return { call, side: 'callee' };
    return null;
  }
  if (caller.kind === 'guest' && call.caller_key && call.caller_key === caller.guestKey) {
    return { call, side: 'caller' };
  }
  return null;
}

const LIVE = ['ringing', 'connecting', 'active'];

/* ══════════════════════════════════════════════════════════════════════
   HANDLER
══════════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const op = String(body.op || '').trim();
  const caller = await resolveCaller(req, body);
  if (!caller) return res.status(400).json({ error: 'identify_yourself' });

  const identity = caller.userId || caller.guestKey;
  /* Signalling is chatty by nature; ringing is not. They are limited
     apart so a trickle of ICE candidates cannot exhaust the budget that
     stops someone hammering the desk with calls. */
  const limits = { ice: 30, start: 6, answer: 30, decline: 30, end: 40, poll: 400, signal: 600, incoming: 400, 'agent.call': 30 };
  if (!consumeRateLimit(req, res, `call:${op}`, limits[op] ?? 60, 60_000, identity)) return;

  try {
    switch (op) {

      /* ── ice ──────────────────────────────────────────────────── */
      case 'ice':
        return res.status(200).json({ ok: true, ...(await iceServers()) });

      /* ── start. A guest rings the desk. ───────────────────────── */
      case 'start': {
        /* One live call per person. A second tab must not double-ring
           the desk, and reusing the existing session is also what makes
           "I refreshed and it was still ringing" work. */
        const scope = caller.kind === 'user'
          ? `caller_id=eq.${caller.userId}`
          : `caller_key=eq.${caller.guestKey}`;
        const live = await select('call_sessions',
          `${scope}&status=in.(${LIVE.join(',')})&select=*&order=started_at.desc&limit=1`).catch(() => []);
        if (live?.[0]) {
          return res.status(200).json({
            ok: true, resumed: true, call: publicCall(live[0]), side: 'caller', ...(await iceServers()),
          });
        }

        const threadId = uuidish(body.threadId) ? body.threadId : null;
        const call = await insert('call_sessions', {
          thread_id: threadId,
          kind: 'support',
          caller_id: caller.userId || null,
          caller_key: caller.kind === 'guest' ? caller.guestKey : null,
          caller_name: caller.name || (caller.kind === 'guest' ? 'Visitor' : null),
          channel: crypto.randomBytes(20).toString('hex'),
          status: 'ringing',
          direction: 'outbound',
          meta: { page: clamp(body.page, 60) || null, ua: clamp(req.headers['user-agent'], 180) },
        });

        /* Ring the desk on every channel at once. Whoever is nearest a
           screen picks it up. */
        ringTheDesk(call, caller, threadId).catch(e => console.warn('[call:ring]', e.message));

        if (threadId) {
          insert('support_messages', {
            thread_id: threadId, sender_role: 'system', sender_name: 'Cabana',
            body: 'Calling the Cabana team…', meta: { call_id: call.id, event: 'call_started' },
          }, false).catch(() => {});
        }

        return res.status(200).json({ ok: true, call: publicCall(call), side: 'caller', ...(await iceServers()) });
      }

      /* ── agent.call. The desk rings a guest back. ─────────────── */
      case 'agent.call': {
        if (!caller.isAdmin) return res.status(403).json({ error: 'admin_required' });
        if (!uuidish(body.threadId)) return res.status(400).json({ error: 'bad_thread' });
        const thread = await one('support_threads', `id=eq.${body.threadId}&select=*`);
        if (!thread) return res.status(404).json({ error: 'thread_not_found' });

        const call = await insert('call_sessions', {
          thread_id: thread.id, kind: 'support',
          caller_id: caller.userId, caller_name: caller.name || 'Cabana',
          callee_id: thread.user_id || null,
          callee_name: thread.display_name || 'Guest',
          channel: crypto.randomBytes(20).toString('hex'),
          status: 'ringing', direction: 'inbound',
        });

        if (thread.user_id) {
          notify({
            user_id: thread.user_id, kind: 'call',
            title: '📞 Cabana is calling',
            body: 'Tap to answer inside the app.',
            url: `/help.html?thread=${thread.id}&call=${call.id}`,
          }).catch(() => {});
        }
        insert('support_messages', {
          thread_id: thread.id, sender_role: 'system', sender_name: 'Cabana',
          body: `${caller.name || 'The Cabana team'} is calling you…`,
          meta: { call_id: call.id, event: 'incoming_call' },
        }, false).catch(() => {});

        return res.status(200).json({ ok: true, call: publicCall(call), side: 'caller', ...(await iceServers()) });
      }

      /* ── incoming. What the desk is being rung about. ─────────── */
      case 'incoming': {
        if (!caller.isAdmin) return res.status(403).json({ error: 'admin_required' });
        const rows = await select('call_sessions',
          `status=in.(ringing,connecting,active)&select=*&order=started_at.desc&limit=12`).catch(() => []);
        return res.status(200).json({ ok: true, calls: (rows || []).map(publicCall) });
      }

      /* ── answer ───────────────────────────────────────────────── */
      case 'answer': {
        if (!uuidish(body.callId)) return res.status(400).json({ error: 'bad_call' });
        const call = await one('call_sessions', `id=eq.${body.callId}&select=*`);
        if (!call) return res.status(404).json({ error: 'call_not_found' });

        /* Two ways to be the person answering: you are on the desk and
           this is an inbound support call, or the call was rung AT you. */
        const isDeskPickup = caller.isAdmin && call.kind === 'support' && call.direction === 'outbound';
        const isNamedCallee = caller.kind === 'user' && call.callee_id === caller.userId;
        const isGuestCallee = caller.kind === 'guest' && call.caller_key === caller.guestKey && call.direction === 'inbound';
        if (!isDeskPickup && !isNamedCallee && !isGuestCallee) return res.status(403).json({ error: 'not_yours' });

        if (!LIVE.includes(call.status)) {
          return res.status(409).json({ error: 'call_over', status: call.status });
        }
        /* Whoever gets here first owns the call. A second agent tapping
           answer a moment later is told, rather than silently joining a
           conversation already in progress. */
        const claimed = await dbUpdate('call_sessions',
          `id=eq.${call.id}&status=eq.ringing`,
          {
            status: 'connecting', answered_at: nowIso(),
            ...(isDeskPickup ? { callee_id: caller.userId, callee_name: caller.name || 'Cabana' } : {}),
          });
        if (!claimed && call.status === 'ringing') {
          const fresh = await one('call_sessions', `id=eq.${call.id}&select=status,callee_name`);
          return res.status(409).json({ error: 'already_answered', by: fresh?.callee_name || null });
        }

        if (call.thread_id) {
          insert('support_messages', {
            thread_id: call.thread_id, sender_role: 'system', sender_name: 'Cabana',
            body: 'Call connected.', meta: { call_id: call.id, event: 'call_answered' },
          }, false).catch(() => {});
        }

        return res.status(200).json({
          ok: true,
          call: publicCall({ ...call, status: 'connecting' }),
          side: isDeskPickup || isNamedCallee ? 'callee' : 'caller',
          ...(await iceServers()),
        });
      }

      /* ── decline ──────────────────────────────────────────────── */
      case 'decline': {
        if (!uuidish(body.callId)) return res.status(400).json({ error: 'bad_call' });
        const access = caller.isAdmin ? { call: await one('call_sessions', `id=eq.${body.callId}&select=*`) }
                                      : await accessibleCall(caller, body.callId);
        if (!access?.call) return res.status(404).json({ error: 'call_not_found' });
        await dbUpdate('call_sessions', `id=eq.${access.call.id}`, {
          status: 'declined', ended_at: nowIso(), end_reason: clamp(body.reason, 60) || 'declined',
        });
        await pushSignal(access.call.id, 'callee', 'bye', { reason: 'declined' });
        return res.status(200).json({ ok: true });
      }

      /* ── end ──────────────────────────────────────────────────── */
      case 'end': {
        const access = caller.isAdmin
          ? { call: await one('call_sessions', `id=eq.${body.callId}&select=*`),
              side: body.side === 'callee' ? 'callee' : 'caller' }
          : await accessibleCall(caller, body.callId);
        if (!access?.call) return res.status(404).json({ error: 'call_not_found' });
        const call = access.call;
        if (!LIVE.includes(call.status)) return res.status(200).json({ ok: true, already: call.status });

        const base = call.answered_at ? new Date(call.answered_at).getTime() : null;
        const duration = base ? Math.max(0, Math.round((Date.now() - base) / 1000)) : 0;
        const never = !call.answered_at;

        await dbUpdate('call_sessions', `id=eq.${call.id}`, {
          status: never ? 'missed' : 'ended',
          ended_at: nowIso(),
          duration_s: duration,
          end_reason: clamp(body.reason, 60) || (never ? 'no_answer' : 'hung_up'),
          ...(body.quality && typeof body.quality === 'object' ? { quality: body.quality } : {}),
        });
        await pushSignal(call.id, access.side, 'bye', { reason: 'hangup' });
        rpc('purge_stale_call_signals').catch(() => {});

        if (call.thread_id) {
          insert('support_messages', {
            thread_id: call.thread_id, sender_role: 'system', sender_name: 'Cabana',
            body: never
              ? 'Call ended before it connected.'
              : `Call ended · ${Math.floor(duration / 60)}m ${duration % 60}s.`,
            meta: { call_id: call.id, event: 'call_ended', duration_s: duration },
          }, false).catch(() => {});
        }

        /* A guest we rang and missed gets told, so a missed call is not
           experienced as being ignored. */
        if (never && call.direction === 'inbound' && call.thread_id) {
          const thread = await one('support_threads', `id=eq.${call.thread_id}&select=email,display_name,user_id`).catch(() => null);
          if (thread?.email) {
            sendTemplateAsync({
              template: 'missedCall', to: thread.email, userId: thread.user_id,
              dedupeKey: `missed-call:${call.id}`,
              data: { name: thread.display_name, email: thread.email, threadId: call.thread_id, when: call.started_at },
            });
          }
        }

        return res.status(200).json({ ok: true, duration_s: duration });
      }

      /* ── poll. Status, plus anything the other end has said. ──── */
      case 'poll': {
        const access = caller.isAdmin && body.callId && uuidish(body.callId)
          ? { call: await one('call_sessions', `id=eq.${body.callId}&select=*`),
              side: body.side === 'callee' ? 'callee' : 'caller' }
          : await accessibleCall(caller, body.callId);
        if (!access?.call) return res.status(404).json({ error: 'call_not_found' });

        const after = Number(body.after) || 0;
        const otherSide = access.side === 'caller' ? 'callee' : 'caller';
        const signals = await select('call_signals',
          `call_id=eq.${access.call.id}&from_side=eq.${otherSide}&id=gt.${after}&select=id,kind,signal_id,payload&order=id.asc&limit=60`)
          .catch(() => []);

        return res.status(200).json({
          ok: true,
          call: publicCall(access.call),
          signals: signals || [],
          cursor: signals?.length ? signals[signals.length - 1].id : after,
        });
      }

      /* ── signal. Offer, answer, a candidate. ──────────────────── */
      case 'signal': {
        const access = caller.isAdmin && body.callId && uuidish(body.callId)
          ? { call: await one('call_sessions', `id=eq.${body.callId}&select=*`),
              side: body.side === 'callee' ? 'callee' : 'caller' }
          : await accessibleCall(caller, body.callId);
        if (!access?.call) return res.status(404).json({ error: 'call_not_found' });
        if (!LIVE.includes(access.call.status)) return res.status(409).json({ error: 'call_over' });

        const kind = String(body.kind || '');
        if (!['offer', 'answer', 'ice', 'bye', 'renegotiate'].includes(kind)) {
          return res.status(400).json({ error: 'bad_kind' });
        }
        /* An SDP is a few kilobytes; a candidate is a few hundred bytes.
           Anything materially larger is not signalling. */
        const raw = JSON.stringify(body.payload ?? null);
        if (!raw || raw.length > 24_000) return res.status(400).json({ error: 'bad_payload' });

        await pushSignal(access.call.id, access.side, kind, body.payload,
                         clamp(body.signalId, 64) || crypto.randomUUID());

        /* The answer is what turns a connecting call into a live one. */
        if (kind === 'answer' && access.call.status === 'connecting') {
          dbUpdate('call_sessions', `id=eq.${access.call.id}`, { status: 'active' }).catch(() => {});
        }
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({
          error: 'unknown_op',
          available: ['ice', 'start', 'answer', 'decline', 'end', 'poll', 'signal', 'incoming', 'agent.call'],
        });
    }
  } catch (e) {
    console.error('[call]', op, e);
    return res.status(500).json({ error: 'call_failed' });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════ */

/* What a browser is allowed to know about a call. Note what is absent:
   the other party's user id, email or any contact detail at all. */
function publicCall(c) {
  return {
    id: c.id,
    channel: c.channel,
    status: c.status,
    kind: c.kind,
    direction: c.direction,
    thread_id: c.thread_id || null,
    caller_name: c.caller_name || 'Visitor',
    callee_name: c.callee_name || null,
    started_at: c.started_at,
    answered_at: c.answered_at || null,
  };
}

async function pushSignal(callId, side, kind, payload, signalId = null) {
  try {
    await insert('call_signals', {
      call_id: callId, from_side: side, kind,
      signal_id: signalId || crypto.randomUUID(),
      payload: payload ?? {},
    }, false);
  } catch (e) {
    /* The unique index rejecting a duplicate is the deduplication
       working, not a failure worth reporting upward. */
    if (!String(e.message).includes('23505')) console.warn('[call:signal]', e.message);
  }
}

async function ringTheDesk(call, caller, threadId) {
  const admins = await select('admin_users', 'select=id,email,name&limit=25').catch(() => []);
  const who = caller.name || 'A visitor';
  await Promise.allSettled((admins || []).map(a => a.id ? notify({
    user_id: a.id,
    kind: 'call',
    title: '📞 Incoming Cabana call',
    body: `${who} is calling from the app.`,
    url: `/support-console.html${threadId ? `?thread=${threadId}` : ''}&call=${call.id}`.replace('.html&', '.html?'),
  }) : Promise.resolve()));
}

export { iceServers };
