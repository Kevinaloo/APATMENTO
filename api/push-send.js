/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · PUSH SEND + CRON
   POST /api/push-send          → send push to user_id or endpoint
   POST /api/push-send?action=cron → fire due scheduled campaigns

   Implements Web Push end-to-end with zero dependencies:
     · VAPID  (RFC 8292). ES256 JWT, ieee-p1363 signature
     · aes128gcm payload encryption (RFC 8291 + RFC 8188)

   Body:
     { user_id }            → push every subscription for that user
     { endpoint }           → push one specific subscription
     { title, body, url, kind, persist }

   `persist: true` also inserts a row into `notifications`, which the
   client picks up over Supabase Realtime for the in-app feed. Push is
   the out-of-tab channel; Realtime is the in-tab one. Both fire.

   Auth: requires x-admin-secret header matching PUSH_ADMIN_SECRET, OR
   a valid Supabase service role. Never expose this to the browser.
   ═══════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';
import { authenticatedUser, consumeRateLimit, hasInternalSecret, isCronAuthorized, setCors } from './lib/_security.js';
import { sendTemplateAsync } from './lib/_mail.js';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:apatmento@gmail.com';

const SUPA_URL      = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET  = process.env.PUSH_ADMIN_SECRET;

/* ── base64url helpers ───────────────────────────────────────────── */
const b64u = buf => Buffer.from(buf).toString('base64url');
const unb64u = str => Buffer.from(str, 'base64url');

/* ── VAPID: build the signed Authorization header ─────────────────
   The JWT audience is the push service origin, not our own domain.  */
function vapidHeader(endpoint) {
  const aud = new URL(endpoint).origin;
  const header  = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64u(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  }));
  const signingInput = `${header}.${payload}`;

  // Reconstruct the EC key from the raw scalar + public point.
  const raw = unb64u(VAPID_PUBLIC);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64u(raw.subarray(1, 33)),
    y: b64u(raw.subarray(33, 65)),
    d: VAPID_PRIVATE,
  };
  const key = crypto.createPrivateKey({ key: jwk, format: 'jwk' });

  // JOSE requires the fixed-width r||s form, not DER.
  const sig = crypto.sign('sha256', Buffer.from(signingInput), {
    key, dsaEncoding: 'ieee-p1363',
  });

  return `vapid t=${signingInput}.${b64u(sig)}, k=${VAPID_PUBLIC}`;
}

/* ── HKDF per RFC 5869 ───────────────────────────────────────────── */
function hkdf(salt, ikm, info, length) {
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  const out = crypto.createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest();
  return out.subarray(0, length);
}

/* ── RFC 8291 payload encryption (aes128gcm) ─────────────────────── */
function encryptPayload(plaintext, clientPubB64, authSecretB64) {
  const clientPub = unb64u(clientPubB64);     // 65 bytes, uncompressed
  const authSecret = unb64u(authSecretB64);   // 16 bytes

  // Ephemeral server keypair for this single message.
  const eph = crypto.createECDH('prime256v1');
  eph.generateKeys();
  const serverPub = eph.getPublicKey();       // 65 bytes
  const shared = eph.computeSecret(clientPub);

  const salt = crypto.randomBytes(16);

  // Step 1: derive the pseudo-random key from the ECDH secret.
  // info is fixed per spec and binds both public keys.
  const prkInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'),
    clientPub,
    serverPub,
  ]);
  const ikm = hkdf(authSecret, shared, prkInfo, 32);

  // Step 2: split into content-encryption key and nonce.
  const cek   = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);

  // Pad delimiter 0x02 marks the final record.
  const padded = Buffer.concat([Buffer.from(plaintext), Buffer.from([2])]);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  // aes128gcm header: salt(16) | rs(4) | idlen(1) | serverPub(65)
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(serverPub.length, 20);

  return Buffer.concat([header, serverPub, body]);
}

/* ── deliver one notification to one endpoint ────────────────────── */
async function sendOne(sub, payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const body = encryptPayload(payload, sub.p256dh, sub.auth);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader(sub.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'normal',
    },
    body,
  });

  // 404/410 mean the subscription is dead. The browser revoked it.
  // Prune it so we stop paying for the round trip on every send.
  if (res.status === 404 || res.status === 410) {
    await supa(`push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
      method: 'DELETE',
    });
    return { endpoint: sub.endpoint, status: res.status, pruned: true };
  }

  return { endpoint: sub.endpoint, status: res.status, ok: res.ok };
}

/* ── thin Supabase REST helper (service role) ────────────────────── */
/* ── Email mirror ────────────────────────────────────────────────────
   Kinds that are genuinely worth an inbox. A "someone viewed your
   listing" nudge is not; a booking, a payment, a support reply or an
   incoming call is. Consent and deduplication are handled inside
   sendTemplate, so this only has to decide relevance. */
const EMAIL_WORTHY = new Set(['booking', 'payment', 'support', 'message', 'call', 'security', 'payout', 'urgent', 'order']);

async function mirrorToEmail({ user_id, title, body, url, kind, email, force }) {
  if (!force && !EMAIL_WORTHY.has(kind)) return false;
  let to = email;
  let firstName = null;
  if (!to && user_id) {
    try {
      const rows = await supa(`profiles?id=eq.${user_id}&select=email,first_name`);
      to = rows && rows[0] && rows[0].email;
      firstName = (rows && rows[0] && rows[0].first_name) || null;
    } catch (e) { return false; }
  }
  if (!to) return false;

  const res = await sendTemplateAsync({
    template: 'notification',
    to,
    userId: user_id || null,
    /* One email per notification, even if the caller retries. The
       minute-level stamp lets a genuinely repeated alert through while
       stopping a retry storm. */
    dedupeKey: `notify:${user_id || to}:${kind}:${title}`.slice(0, 200) + ':' + new Date().toISOString().slice(0, 16),
    data: {
      name: firstName,
      email: to, title, body, url,
      label: kind === 'call' ? 'Open the call' : kind === 'support' ? 'Open the conversation'
           : kind === 'order' ? 'Open the order' : 'Open Cabana',
      emoji: kind === 'booking' ? '🗓️' : kind === 'payment' ? '💳'
           : kind === 'support' ? '💬' : kind === 'call' ? '📞'
           : kind === 'payout' ? '💸' : kind === 'order' ? '🍽️' : '🔔',
    },
  });
  return !!(res && res.ok && !res.skipped);
}

async function supa(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`supabase ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

/* ── cron: check and fire due campaigns ─────────────────────────── */
function isDue(c) {
  const now = new Date();
  const sendAt = new Date(c.send_at);
  if (!c.last_sent_at) return sendAt <= now;
  const last = new Date(c.last_sent_at);
  switch (c.repeat) {
    case 'daily':   return (now - last) >= 23*3600*1000 && sendAt.getHours() === now.getHours();
    case 'weekly':  return (now - last) >= 6.5*86400*1000 && sendAt.getDay() === now.getDay();
    case 'monthly': return (now - last) >= 27*86400*1000 && sendAt.getDate() === now.getDate();
    default:        return false;
  }
}

async function handleCron(req, res) {
  const campaigns = await supa('push_campaigns?active=eq.true&select=*').catch(() => []) || [];
  const due = campaigns.filter(isDue);
  if (!due.length) return res.status(200).json({ fired: 0, checked: campaigns.length });

  const SELF = process.env.PUSH_SEND_URL || 'https://cabana.africa/api/push-send';
  const fired = [];
  for (const camp of due) {
    try {
      const subs = await supa('push_subscriptions?select=user_id') || [];
      let userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))];
      if (camp.audience === 'partners') {
        const partners = await supa('listings?select=user_id') || [];
        const pids = new Set(partners.map(p => p.user_id));
        userIds = userIds.filter(id => pids.has(id));
      }
      let sent = 0;
      const BATCH = 20;
      for (let i = 0; i < userIds.length; i += BATCH) {
        await Promise.allSettled(userIds.slice(i, i+BATCH).map(uid =>
          fetch(SELF, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
            body: JSON.stringify({ user_id: uid, title: camp.title, body: camp.body,
              url: camp.url || '/', kind: camp.kind || 'general', persist: true }),
          }).then(r => r.json()).then(d => { if (d.sent > 0) sent++; })
        ));
      }
      const upd = { last_sent_at: new Date().toISOString() };
      if (camp.repeat === 'none') upd.active = false;
      await supa(`push_campaigns?id=eq.${camp.id}`, { method: 'PATCH', body: JSON.stringify(upd) });
      fired.push({ id: camp.id, title: camp.title, sent });
    } catch (e) { console.error('[push-cron]', camp.id, e.message); }
  }
  return res.status(200).json({ fired: fired.length, campaigns: fired });
}

/* Shared by this route and other server functions. Calling the delivery
   code directly avoids sending a server-to-server request back through
   the public domain, where deployment protection can reject it. */
export async function deliverNotification(b) {
  const { user_id, endpoint, title, body, url, kind = 'general', persist = true, meta } = b;
  if (!title || (!user_id && !endpoint)) throw new Error('title and recipient required');
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !SERVICE_KEY) throw new Error('Push not configured');

  let subs = endpoint
    ? await supa(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&select=*`)
    : await supa(`push_subscriptions?user_id=eq.${user_id}&select=*`);
  subs = subs || [];

  if (persist && user_id) {
    await supa('notifications', {
      method: 'POST',
      body: JSON.stringify({ user_id, title, body, url, kind, meta: meta || {} }),
    }).catch(e => console.warn('[push] persist failed:', e.message));
  }

  if (!subs.length) {
    const mailed = await mirrorToEmail({ user_id, title, body, url, kind, email: b.email, force: b.email_always });
    return { sent: 0, persisted: !!(persist && user_id), emailed: mailed };
  }

  /* One tag per conversation or per food order, so a newer update
     replaces the older banner instead of stacking five of them. */
  const payload = { title, body, url, kind: kind === 'order-update' ? 'order' : kind, icon: '/logo-mark.png',
    tag: kind === 'message' && meta?.conversation_id ? `message-${meta.conversation_id}`
       : meta?.order_ref ? `order-${meta.order_ref}` : kind };
  const results = await Promise.all(subs.map(s => sendOne(s, payload).catch(e => ({
    endpoint: s.endpoint, error: e.message,
  }))));
  const delivered = results.filter(r => r.ok).length;
  const mailed = (delivered === 0 || b.email_always)
    ? await mirrorToEmail({ user_id, title, body, url, kind, email: b.email, force: b.email_always })
    : false;
  return {
    sent: delivered,
    pruned: results.filter(r => r.pruned).length,
    total: results.length,
    persisted: !!(persist && user_id),
    emailed: mailed,
    results,
  };
}

/* ── handler ─────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let requestBody;
  try { requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  const action = req.query?.action || requestBody.action;
  // Authenticate before reporting configuration state. Otherwise an
  // anonymous caller can probe secrets and, when the shared secret is
  // missing, the old condition silently opened a bulk-notification API.
  const internal = hasInternalSecret(req, 'PUSH_ADMIN_SECRET')
    || (action === 'cron' && isCronAuthorized(req));
  const chatCaller = !internal && action === 'chat-message'
    ? await authenticatedUser(req)
    : null;
  const databaseMessage = (action === 'database-message' || action === 'database-notification')
    && isCronAuthorized(req);
  const authorized = internal || !!chatCaller || databaseMessage;
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !SERVICE_KEY) {
    return res.status(500).json({
      error: 'Push not configured',
      missing: {
        VAPID_PUBLIC_KEY: !VAPID_PUBLIC,
        VAPID_PRIVATE_KEY: !VAPID_PRIVATE,
        SUPABASE_SERVICE_ROLE_KEY: !SERVICE_KEY,
      },
    });
  }

  // action=cron → fire scheduled campaigns
  if (action === 'cron') return handleCron(req, res);

  try {
    let b = requestBody;

    /* A browser may request delivery only for a message it just authored.
       The server derives the recipient and copy from trusted rows. */
    if (action === 'chat-message' || action === 'database-message') {
      if (chatCaller && !consumeRateLimit(req, res, 'chat-message-push', 40, 60_000, chatCaller.id)) return;
      const messageId = String(b.message_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(messageId)) return res.status(400).json({ error: 'message_id_required' });

      const senderFilter = chatCaller ? `&sender_id=eq.${chatCaller.id}` : '';
      const messages = await supa(`chat_messages?id=eq.${messageId}${senderFilter}&select=id,conversation_id,sender_id,content&limit=1`);
      const message = messages?.[0];
      if (!message) return res.status(404).json({ error: 'message_not_found' });
      const conversations = await supa(`chat_conversations?id=eq.${message.conversation_id}&select=id,host_id,guest_id,listing_title&limit=1`);
      const conversation = conversations?.[0];
      if (!conversation || ![conversation.host_id, conversation.guest_id].includes(message.sender_id)
          || (chatCaller && message.sender_id !== chatCaller.id)) {
        return res.status(403).json({ error: 'conversation_forbidden' });
      }
      const recipient = message.sender_id === conversation.host_id ? conversation.guest_id : conversation.host_id;
      if (!recipient || recipient === message.sender_id) return res.status(400).json({ error: 'recipient_unavailable' });

      const marker = encodeURIComponent(JSON.stringify({ message_id: message.id }));
      const existing = await supa(`notifications?user_id=eq.${recipient}&meta=cs.${marker}&select=id,meta&limit=1`).catch(() => []);
      if (existing?.[0]?.meta?.delivery_attempted_at) {
        return res.status(200).json({ sent: 0, persisted: true, duplicate: true });
      }
      const deliveryMeta = { message_id: message.id, conversation_id: conversation.id,
        delivery_attempted_at: new Date().toISOString() };
      if (existing?.[0]) {
        await supa(`notifications?id=eq.${existing[0].id}`, {
          method: 'PATCH', body: JSON.stringify({ meta: { ...(existing[0].meta || {}), ...deliveryMeta } }),
        });
      }

      const preview = String(message.content || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      b = {
        user_id: recipient,
        title: `New message${conversation.listing_title ? ` about ${String(conversation.listing_title).slice(0, 80)}` : ''}`,
        body: preview || 'Open Cabana to read the message.',
        url: '/dashboard.html?inbox=1',
        kind: 'message',
        persist: !existing?.[0],
        meta: deliveryMeta,
      };
    }

    /* The database already wrote the in-app row (food orders do this in
       the same transaction as the status change). Deliver that exact
       row out of the tab, once. */
    if (action === 'database-notification') {
      const notificationId = String(b.notification_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(notificationId)) return res.status(400).json({ error: 'notification_id_required' });
      const rows = await supa(`notifications?id=eq.${notificationId}&select=id,user_id,title,body,url,kind,meta&limit=1`);
      const note = rows?.[0];
      if (!note) return res.status(404).json({ error: 'notification_not_found' });
      if (note.meta?.delivery_attempted_at) return res.status(200).json({ sent: 0, persisted: true, duplicate: true });
      const deliveryMeta = { ...(note.meta || {}), delivery_attempted_at: new Date().toISOString() };
      await supa(`notifications?id=eq.${note.id}`, { method: 'PATCH', body: JSON.stringify({ meta: deliveryMeta }) });
      /* Only the moments a person must act on are worth an email when
         push is unavailable: a new order for a kitchen, and a yes, a
         no, or a lapse for a diner. Progress updates stay in-app. */
      const important = note.kind !== 'order'
        || ['requested', 'accepted', 'declined', 'expired', 'cancelled'].includes(note.meta?.status);
      b = {
        user_id: note.user_id, title: note.title, body: note.body, url: note.url,
        kind: note.kind === 'order' && !important ? 'order-update' : note.kind,
        persist: false, meta: deliveryMeta,
      };
    }

    const { user_id, endpoint, title, body, url, kind = 'general', persist = true, meta } = b;

    if (!title) return res.status(400).json({ error: 'title required' });
    if (!user_id && !endpoint) {
      return res.status(400).json({ error: 'user_id or endpoint required' });
    }

    return res.status(200).json(await deliverNotification(b));
  } catch (err) {
    console.error('[push-send]', err);
    return res.status(500).json({ error: err.message });
  }
}
