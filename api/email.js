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
import { one } from './lib/_db.js';

const AT_API_KEY  = process.env.AT_API_KEY;
const AT_USERNAME = process.env.AT_USERNAME || 'Cabana';
const AT_SMS_URL  = 'https://api.africastalking.com/version1/messaging';
const SUPA_URL    = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const KES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

const SUBMISSIONS = {
  listing: {
    table: 'listings', owner: r => [r.partner_id, r.host_id, r.created_by],
    select: 'id,title,city,country,area,service,status,is_active,partner_id,host_id,created_by',
    label: r => ({ stays: 'Stay', roommates: 'Roommate listing', food: 'Restaurant', shopping: 'Shop' }[r.service] || 'Listing'),
    location: r => [r.area, r.city, r.country].filter(Boolean).join(', '),
    live: r => r.status === 'active' && r.is_active === true,
    manageUrl: '/partner-listings.html',
  },
  tour: {
    table: 'tours', owner: r => [r.owner_id],
    select: 'id,title,destination,county,country,status,owner_id', label: () => 'Tour',
    location: r => [r.destination, r.county, r.country].filter(Boolean).join(', '),
    live: r => r.status === 'published', manageUrl: '/dashboard.html',
  },
  event: {
    table: 'events', owner: r => [r.owner_id],
    select: 'id,title,venue,city,country,status,owner_id', label: () => 'Event',
    location: r => [r.venue, r.city, r.country].filter(Boolean).join(', '),
    live: r => r.status === 'published', manageUrl: '/dashboard.html',
  },
  fleet: {
    table: 'car_operators', owner: r => [r.owner_id],
    select: 'id,name,city,country_code,verified,owner_id', label: () => 'Fleet application',
    title: r => r.name, location: r => [r.city, r.country_code].filter(Boolean).join(', '),
    live: r => r.verified === true, manageUrl: '/dashboard.html',
  },
  driver: {
    table: 'drivers', owner: r => [r.user_id],
    select: 'id,full_name,city,status,user_id', label: () => 'Driver application',
    title: r => `${r.full_name || 'Driver'} · Cabana Rides`, location: r => r.city || '',
    live: r => r.status === 'approved', manageUrl: '/driver.html',
  },
};

function displayName(user) {
  return user?.user_metadata?.full_name
    || [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ')
    || user?.email || '';
}

function normContact(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('@')) return text;
  return text.replace(/\D/g, '').slice(-9);
}

async function authUser(id) {
  if (!id || !SUPA_URL || !SERVICE_KEY) return null;
  const r = await fetch(`${SUPA_URL}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.ok ? r.json() : null;
}

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
  'listing-claim':    { template: 'listingClaim',     to: b => b.email,        dedupe: b => b.transferId ? `listing-claim:${b.transferId}` : null },
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

    /* ── Listing and service submission confirmation ───────────────
       The browser supplies only the source and new row id. Everything
       shown in the email is re-read server-side, and the row must belong
       to the authenticated account. This covers the generic listing form
       plus the dedicated tour, event, fleet and driver pipelines. */
    if (action === 'listing-submitted') {
      if (!caller?.email) return res.status(403).json({ error: 'verified_email_required' });
      const source = String(body.source || '').toLowerCase();
      const id = String(body.id || '');
      const spec = SUBMISSIONS[source];
      if (!spec || !UUID.test(id)) return res.status(400).json({ error: 'invalid_submission' });

      const row = await one(spec.table,
        `id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(spec.select)}`);
      if (!row || !spec.owner(row).includes(caller.id)) {
        return res.status(404).json({ error: 'submission_not_found' });
      }

      const submission = {
        id: row.id,
        title: spec.title ? spec.title(row) : row.title,
        serviceLabel: spec.label(row),
        location: spec.location(row),
        state: spec.live(row) ? 'live' : 'review',
        manageUrl: spec.manageUrl,
      };
      const result = await sendTemplate({
        template: 'partnerListingSubmitted', to: caller.email,
        data: { host: { email: caller.email, name: displayName(caller) }, submission },
        dedupeKey: `listing-submitted:${source}:${row.id}`,
        userId: caller.id,
      });
      if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
      return res.status(200).json({ ok: true, emailed: true, skipped: result.skipped || false });
    }

    /* ── Ownership claim ───────────────────────────────────────────
       The caller supplies only an opaque transfer id. Recipient, listing
       and sender are re-read server-side and the transfer must belong to
       the authenticated caller. The deep link is navigation, not auth. */
    if (action === 'listing-claim') {
      if (!caller) return res.status(403).json({ error: 'signed_in_sender_required' });
      const id = String(body.transferId || '');
      if (!UUID.test(id)) {
        return res.status(400).json({ error: 'invalid_transfer' });
      }
      const transfer = await one('listing_transfers',
        `id=eq.${encodeURIComponent(id)}&select=id,listing_id,from_user,to_name,to_contact,status,expires_at`);
      if (!transfer || transfer.from_user !== caller.id) {
        return res.status(404).json({ error: 'transfer_not_found' });
      }
      if (transfer.status !== 'pending' || new Date(transfer.expires_at).getTime() <= Date.now()) {
        return res.status(409).json({ error: 'transfer_not_pending' });
      }
      const listing = await one('listings',
        `id=eq.${encodeURIComponent(transfer.listing_id)}&select=id,title,city,status,is_active`);
      if (!listing) return res.status(404).json({ error: 'listing_not_found' });

      const claimUrl = `https://cabana.africa/dashboard.html?claim=${encodeURIComponent(transfer.id)}`;
      const email = String(transfer.to_contact || '').trim().toLowerCase();
      const recipientHasEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      const fromName = displayName(caller) || 'A Cabana partner';
      const recipientSend = recipientHasEmail
        ? sendTemplate({
            template: 'listingClaim', to: email,
            data: {
              recipientName: transfer.to_name, listingTitle: listing.title,
              city: listing.city, fromName, claimUrl, expiresAt: transfer.expires_at,
            },
            dedupeKey: `listing-claim:${transfer.id}`, userId: caller.id,
          })
        : Promise.resolve({ ok: true, skipped: true, reason: 'recipient_uses_phone' });
      const senderSend = caller.email
        ? sendTemplate({
            template: 'listingTransferSent', to: caller.email,
            data: {
              host: { email: caller.email, name: fromName }, listing,
              recipient: { name: transfer.to_name, contact: transfer.to_contact },
              claimUrl, expiresAt: transfer.expires_at,
            },
            dedupeKey: `listing-transfer-sent:${transfer.id}`, userId: caller.id,
          })
        : Promise.resolve({ ok: true, skipped: true, reason: 'sender_has_no_email' });
      const [recipientResult, senderResult] = await Promise.all([recipientSend, senderSend]);
      if (!recipientResult.ok || !senderResult.ok) {
        return res.status(502).json({ ok: false, error: recipientResult.error || senderResult.error, claim_url: claimUrl });
      }
      return res.status(200).json({
        ok: true, emailed: recipientHasEmail, sender_emailed: !!caller.email,
        claim_url: claimUrl, skipped: !!(recipientResult.skipped && senderResult.skipped),
        ...(recipientHasEmail ? {} : { reason: 'recipient_uses_phone' }),
      });
    }

    /* ── Ownership decision ─────────────────────────────────────────
       Called only after accept/decline succeeds. The resulting transfer
       row is the authority: accepted rows name the authenticated to_user;
       declined rows must still match the caller's verified Auth contact. */
    if (action === 'listing-transfer-decision') {
      if (!caller) return res.status(403).json({ error: 'signed_in_recipient_required' });
      const id = String(body.transferId || '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'invalid_transfer' });
      const transfer = await one('listing_transfers',
        `id=eq.${encodeURIComponent(id)}&select=id,listing_id,from_user,to_user,to_name,to_contact,to_contact_norm,status`);
      if (!transfer || !['accepted', 'declined'].includes(transfer.status)) {
        return res.status(409).json({ error: 'transfer_not_decided' });
      }
      const callerContacts = [caller.email, caller.phone].filter(Boolean).map(normContact);
      const isRecipient = transfer.status === 'accepted'
        ? transfer.to_user === caller.id
        : callerContacts.includes(normContact(transfer.to_contact_norm));
      if (!isRecipient) return res.status(404).json({ error: 'transfer_not_found' });

      const [listing, previousOwner] = await Promise.all([
        one('listings', `id=eq.${encodeURIComponent(transfer.listing_id)}&select=id,title,city`),
        authUser(transfer.from_user),
      ]);
      if (!listing) return res.status(404).json({ error: 'listing_not_found' });
      const recipientName = displayName(caller) || transfer.to_name;
      const previousName = displayName(previousOwner) || 'the previous owner';
      const sends = [];
      if (caller.email) sends.push(sendTemplate({
        template: 'listingTransferDecision', to: caller.email,
        data: { name: recipientName, listingTitle: listing.title, status: transfer.status,
                perspective: 'recipient', otherName: previousName },
        dedupeKey: `listing-transfer-decision:${id}:${transfer.status}:recipient`, userId: caller.id,
      }));
      if (previousOwner?.email) sends.push(sendTemplate({
        template: 'listingTransferDecision', to: previousOwner.email,
        data: { name: previousName, listingTitle: listing.title, status: transfer.status,
                perspective: 'sender', otherName: recipientName },
        dedupeKey: `listing-transfer-decision:${id}:${transfer.status}:sender`, userId: transfer.from_user,
      }));
      const results = await Promise.all(sends);
      const failed = results.find(r => !r.ok);
      if (failed) return res.status(502).json({ ok: false, error: failed.error });
      return res.status(200).json({ ok: true, emailed: results.length });
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
