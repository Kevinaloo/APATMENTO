/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · NOTIFY HELPER
   Server-side convenience wrapper around /api/push-send.

   Import from any other API route:

     import { notify } from './_notify.js';
     await notify({
       user_id: booking.guest_id,
       title:   'Booking confirmed',
       body:    `Your stay at ${listing.title} is confirmed`,
       url:     '/my-bookings.html',
       kind:    'booking',
     });

   Fire-and-forget by design: a failed notification must never roll back
   a successful payment or booking. Errors are logged, never thrown.
   ═══════════════════════════════════════════════════════════════════ */

const BASE = process.env.PUBLIC_BASE_URL || 'https://www.apatmento.space';
const SECRET = process.env.PUSH_ADMIN_SECRET || '';

export async function notify({ user_id, endpoint, title, body, url, kind = 'general', persist = true }) {
  if (!title || (!user_id && !endpoint)) {
    console.warn('[notify] skipped: need title + (user_id|endpoint)');
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(`${BASE}/api/push-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': SECRET,
      },
      body: JSON.stringify({ user_id, endpoint, title, body, url, kind, persist }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) console.warn('[notify]', res.status, out);
    return { ok: res.ok, ...out };
  } catch (err) {
    // Never let a notification failure break the calling flow.
    console.warn('[notify] transport error:', err.message);
    return { ok: false, error: err.message };
  }
}

/* Common presets. Keeps copy consistent across the app. */
export const Notify = {
  bookingConfirmed: (user_id, listing) => notify({
    user_id, kind: 'booking',
    title: 'Booking confirmed 🎉',
    body: `Your stay at ${listing} is locked in. Check-in code is in your bookings.`,
    url: '/my-bookings.html',
  }),

  paymentReceived: (user_id, amount) => notify({
    user_id, kind: 'payment',
    title: 'Payment received',
    body: `We've received KES ${Number(amount).toLocaleString()}. You're all set.`,
    url: '/my-bookings.html',
  }),

  payoutSent: (user_id, amount) => notify({
    user_id, kind: 'payment',
    title: 'Payout sent',
    body: `KES ${Number(amount).toLocaleString()} is on its way to your M-Pesa.`,
    url: '/partner-earnings.html',
  }),

  newBookingForHost: (user_id, listing) => notify({
    user_id, kind: 'booking',
    title: 'New booking!',
    body: `Someone just booked ${listing}. Tap to see the details.`,
    url: '/partner-bookings.html',
  }),
};
