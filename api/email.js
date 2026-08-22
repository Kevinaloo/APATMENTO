/* ══════════════════════════════════════════════════════════════════════
   CABANA · /api/email.js
   The HTTP surface for outbound mail. Every template, every sender and
   every consent rule lives in api/lib/_mail.js; this file is the door.

   TWO SENDERS
     connect@cabana.africa      guests: sign-in, receipts, support,
                                notifications, offers.
     partnership@cabana.africa  hosts, operators and service providers:
                                onboarding, bookings, payouts, results.
   The address follows the SUBJECT, not the person. A host booking a
   holiday hears from connect@; the same host hearing about their listing
   hears from partnership@.

   POST /api/email  { action, ...payload }

   AUTH
     · Server-to-server calls carry x-internal-secret / x-admin-secret.
     · A browser must carry a Supabase session, and may only send to its
       own verified address. That check is at the bottom and applies to
       every template without exception.

   SMS
     Africa's Talking is still here for the one thing email cannot do:
     reach a guest standing outside a locked door with no data. It is not
     a contact channel Cabana publishes — it is an outbound alert only.
   ══════════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

import { hasInternalSecret, requireUser, setCors, consumeRateLimit } from './lib/_security.js';
import { sendTemplate, TEMPLATES } from './lib/_mail.js';

const AT_API_KEY  = process.env.AT_API_KEY;
const AT_USERNAME = process.env.AT_USERNAME || 'Cabana';
const AT_SMS_URL  = 'https://api.africastalking.com/version1/messaging';

const KES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

/* ── SMS via Africa's Talking ───────────────────────────────────── */
async function sendSMS({ to, message, from = 'CABANA' }) {
  if (!AT_API_KEY) throw new Error('AT_API_KEY not set');
  const phone = String(to).startsWith('+') ? to : `+254${String(to).replace(/^0/, '')}`;
  const params = new URLSearchParams({ username: AT_USERNAME, to: phone, message, from });
  const r = await fetch(AT_SMS_URL, {
    method: 'POST',
    headers: { apiKey: AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  });
  const data = await r.json().catch(() => ({}));
  const entry = data?.SMSMessageData?.Recipients?.[0];
  if (!r.ok || entry?.status === 'InvalidPhoneNumber') throw new Error(entry?.status || `AT ${r.status}`);
  return { id: entry?.messageId, status: entry?.status, cost: entry?.cost };
}

/* ── action → template, and how each one is deduplicated ──────────
   A dedupe key is a promise that this exact email is sent once, ever.
   Null means the send is deliberately repeatable — a broadcast, or a
   receipt the guest asked us to send again. */
const ACTIONS = {
  /* Guest · connect@ */
  'welcome':          { template: 'welcome',          to: b => b.email,        dedupe: b => `welcome:${(b.userId || b.email || '').toLowerCase()}` },
  'signin-alert':     { template: 'signinAlert',      to: b => b.email,        dedupe: b => b.sessionId ? `signin:${b.sessionId}` : null },
  'reset':            { template: 'reset',            to: b => b.email,        dedupe: () => null },
  'booking':          { template: 'bookingReceipt',   to: b => b.user?.email,  dedupe: b => b.booking?.reference ? `receipt:${b.booking.reference}:${Number(b.booking.amountPaid ?? b.booking.amount_paid ?? 0)}` : null },
  'booking-cancel':   { template: 'bookingCancelled', to: b => b.user?.email,  dedupe: b => b.booking?.reference ? `cancel:${b.booking.reference}` : null },
  'support-opened':   { template: 'supportOpened',    to: b => b.email,        dedupe: b => b.threadId ? `support-opened:${b.threadId}` : null },
  'support-reply':    { template: 'supportReply',     to: b => b.email,        dedupe: () => null },
  'support-resolved': { template: 'supportResolved',  to: b => b.email,        dedupe: b => b.threadId ? `support-resolved:${b.threadId}` : null },
  'missed-call':      { template: 'missedCall',       to: b => b.email,        dedupe: b => b.callId ? `missed-call:${b.callId}` : null },
  'notification':     { template: 'notification',     to: b => b.email,        dedupe: b => b.key ? `notify:${b.key}` : null },
  'offer':            { template: 'offer',            to: b => b.email,        dedupe: b => b.campaign ? `offer:${b.campaign}:${String(b.email).toLowerCase()}` : null },

  /* Partner · partnership@ */
  'partner-welcome':  { template: 'partnerWelcome',   to: b => b.email,        dedupe: b => `partner-welcome:${(b.userId || b.email || '').toLowerCase()}` },
  'host-booking':     { template: 'partnerBooking',   to: b => b.host?.email,  dedupe: b => b.booking?.reference ? `host-booking:${b.booking.reference}` : null },
  'payout':           { template: 'partnerPayout',    to: b => b.host?.email,  dedupe: b => b.reference ? `payout:${b.reference}` : null },
  'listing-live':     { template: 'partnerListingLive', to: b => b.host?.email, dedupe: b => b.listing?.id ? `listing-live:${b.listing.id}` : null },
  'partner-nudge':    { template: 'partnerNudge',     to: b => b.host?.email,  dedupe: b => b.threadId ? `nudge:${b.threadId}:${new Date().toISOString().slice(0, 10)}` : null },
  'partner-digest':   { template: 'partnerDigest',    to: b => b.host?.email,  dedupe: b => b.period ? `digest:${b.period}:${String(b.host?.email).toLowerCase()}` : null },
  'partner-update':   { template: 'partnerUpdate',    to: b => b.email,        dedupe: b => b.campaign ? `pupdate:${b.campaign}:${String(b.email).toLowerCase()}` : null },

  /* Desk */
  'agent-escalation': { template: 'agentEscalation',  to: b => b.email,        dedupe: b => b.threadId && b.email ? `escalation:${b.threadId}:${String(b.email).toLowerCase()}` : null },
};

/* Actions that are safe to trigger from a signed-in browser, because
   the recipient check below pins them to the caller's own address. */
const SELF_SERVE = new Set([
  'welcome', 'signin-alert', 'partner-welcome',
  'booking', 'booking-cancel', 'support-opened', 'notification',
]);

export default async function handler(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const action = body?.action || req.query?.action;
  const isInternal = hasInternalSecret(req, 'PUSH_ADMIN_SECRET') || hasInternalSecret(req);

  /* The OTP path is the one thing a signed-out browser may trigger, and
     only through a rate limiter — it costs real money per message. */
  let caller = null;
  if (action !== 'sms-otp' && !isInternal) {
    caller = await requireUser(req, res);
    if (!caller) return;
  }
  if (!consumeRateLimit(req, res, `email:${action}`,
                        isInternal ? 300 : 8, 60_000, caller?.id || '')) return;

  try {
    /* ── SMS ─────────────────────────────────────────────────────── */
    if (action === 'sms-otp') {
      const { phone, otp } = body;
      if (!phone || !otp) return res.status(400).json({ error: 'phone + otp required' });
      if (!consumeRateLimit(req, res, 'email:sms-otp:phone', 3, 300_000, String(phone))) return;
      const out = await sendSMS({ to: phone, message: `${otp} is your Cabana sign-in code. Valid for 10 minutes. Do not share it.` });
      return res.status(200).json({ ok: true, ...out });
    }

    if (action === 'sms-booking') {
      const { phone, guestName, propertyName, checkIn, checkOut, amount } = body;
      if (!phone) return res.status(400).json({ error: 'phone required' });
      const out = await sendSMS({
        to: phone,
        message: `Hi ${guestName || 'there'}! Your Cabana booking at ${propertyName} is confirmed. Check-in ${checkIn}, check-out ${checkOut}. Total ${KES(amount)}. Everything else is in the app.`,
      });
      return res.status(200).json({ ok: true, ...out });
    }

    if (action === 'sms-host') {
      const { phone, guestName, propertyName, checkIn, checkOut } = body;
      if (!phone) return res.status(400).json({ error: 'phone required' });
      const out = await sendSMS({
        to: phone,
        message: `New Cabana booking! ${guestName || 'A guest'} booked ${propertyName}. ${checkIn} to ${checkOut}. Open cabana.africa to manage it.`,
      });
      return res.status(200).json({ ok: true, ...out });
    }

    if (action === 'sms-custom') {
      /* Admin only, and genuinely admin only: this one can text anybody. */
      if (!isInternal) return res.status(403).json({ error: 'Forbidden' });
      const { phone, message } = body;
      if (!phone || !message) return res.status(400).json({ error: 'phone + message required' });
      const out = await sendSMS({ to: phone, message });
      return res.status(200).json({ ok: true, ...out });
    }

    /* ── Retired auth paths, still answered honestly ──────────────── */
    if (action === 'magic-link' || action === 'magic-auth') {
      return res.status(410).json({ error: 'Magic-link auth is no longer supported. Use email + password or Google.' });
    }

    /* ── Templated mail ──────────────────────────────────────────── */
    const spec = ACTIONS[action];
    if (!spec) {
      return res.status(400).json({ error: 'Unknown action', available: Object.keys(ACTIONS).concat(['sms-otp', 'sms-booking', 'sms-host', 'sms-custom']) });
    }

    const to = spec.to(body);
    if (!to) return res.status(400).json({ error: 'recipient required' });

    /* A browser may only mail its own verified address, and only through
       an action meant for self-service. Everything else needs a server. */
    if (caller) {
      if (!SELF_SERVE.has(action)) return res.status(403).json({ error: 'server_only_action' });
      if (String(to).toLowerCase() !== String(caller.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'recipient_not_authorized' });
      }
    }

    const result = await sendTemplate({
      template: spec.template,
      to,
      data: body,
      dedupeKey: body.dedupeKey ?? spec.dedupe(body),
      userId: body.userId || caller?.id || null,
      force: !!body.force && isInternal,
    });

    if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
    return res.status(200).json(result);

  } catch (err) {
    console.error('[email]', action, err.message);
    return res.status(500).json({ ok: false, error: 'send_failed' });
  }
}

/* Exported for tests: the action table and the templates should never
   drift apart, and tests/email-templates.test.mjs pins that. */
export { ACTIONS, TEMPLATES };
