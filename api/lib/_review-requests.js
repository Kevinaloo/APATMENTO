/* ═══════════════════════════════════════════════════════════════════
   CABANA · PRIVATE REVIEW REQUESTS
   ───────────────────────────────────────────────────────────────────
   Stay reviews are private: the guest and the host each rate the
   other blind, both are revealed to each other once both are written
   (or 14 days pass), and the guest's rating moves the listing's rank.
   That only works if people are asked, so after every stay both sides
   get a short, polite request:

     ask        checkout evening, or up to 3 days after
     reminder   5–9 days after checkout, if they still have not written
     last call  25–29 days after checkout; the window closes at 30

   Each stage is sent at most once per person per booking, and never to
   someone who has already reviewed. Dedupe reads the notifications this
   job already wrote, so a re-run, a retry or a missed day can never
   double-send. Runs daily from pg_cron (see the review_requests
   migration) at a civil hour in Nairobi.
   ═══════════════════════════════════════════════════════════════════ */
import { todayNumber, endDayOf } from './_payment-rules.js';

export const REVIEW_WINDOW_DAYS = 30;
export const STAGES = [
  { key: 'ask', from: 0, to: 3 },
  { key: 'reminder', from: 5, to: 9 },
  { key: 'last', from: 25, to: 29 },
];

export function stageFor(daysSinceCheckout) {
  const s = STAGES.find(x => daysSinceCheckout >= x.from && daysSinceCheckout <= x.to);
  return s ? s.key : null;
}

const iso = day => new Date(day * 864e5).toISOString().slice(0, 10);
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export function guestMessage(b, stage) {
  const place = clip(String(b.apartment_name || 'your stay'), 40);
  const title = stage === 'last' ? `Last chance to rate ${place}`
    : stage === 'reminder' ? `Still time to rate ${place}`
    : `How was ${place}?`;
  const body = stage === 'last'
    ? 'Your private review closes in a few days. It takes 30 seconds and decides which stays Cabana recommends.'
    : 'Rate it privately in 30 seconds. Only your host and Cabana see it, and it decides which stays we recommend.';
  return { title, body, url: `/my-bookings.html?review=${encodeURIComponent(b.id)}` };
}

export function hostMessage(b, stage) {
  const guest = firstName(b.guest_name);
  const who = guest ? clip(guest, 24) : 'your guest';
  const title = stage === 'last' ? `Last chance to rate ${who}`
    : stage === 'reminder' ? `Still time to rate ${who}`
    : `How was ${who}?`;
  const body = 'Rate your guest privately. You see each other\'s review only once you have both written one.';
  return { title, body, url: `/partner-bookings.html?review=${encodeURIComponent(b.id)}` };
}

/**
 * deps.db(path)          → service-role PostgREST GET, resolves to rows
 * deps.notify(payload)   → the shared notify() helper
 * deps.today             → day number in Nairobi (tests)
 */
export async function sendReviewRequests(deps) {
  const { db, notify } = deps;
  const today = deps.today ?? todayNumber();
  const oldest = iso(today - (REVIEW_WINDOW_DAYS - 1));
  const newest = iso(today);

  const bookings = await db('apartment_bookings'
    + `?cancelled_at=is.null&checkout_date=gte.${oldest}&checkout_date=lte.${newest}`
    + '&or=(status.in.(checked_in,completed),checked_in_at.not.is.null)'
    + '&select=id,guest_id,host_id,listing_id,apartment_id,apartment_name,guest_name,checkout_date&limit=1000');
  const out = { scanned: bookings.length, sent: 0, skipped_reviewed: 0, skipped_sent: 0, by_stage: {} };
  if (!bookings.length) return out;

  const ids = bookings.map(b => b.id);
  const listingIds = [...new Set(bookings.filter(b => !b.host_id)
    .map(b => b.listing_id || (/^[0-9a-f-]{36}$/i.test(b.apartment_id || '') ? b.apartment_id : null))
    .filter(Boolean))];

  const [reviews, sentRows, listings] = await Promise.all([
    db(`private_reviews?booking_id=in.(${ids.join(',')})&select=booking_id,direction`),
    db(`notifications?kind=eq.review&created_at=gte.${iso(today - REVIEW_WINDOW_DAYS - 5)}&select=user_id,meta&limit=10000`),
    listingIds.length ? db(`listings?id=in.(${listingIds.join(',')})&select=id,partner_id`) : Promise.resolve([]),
  ]);

  const written = new Set(reviews.map(r => `${r.booking_id}:${r.direction}`));
  const sent = new Set(sentRows.map(n => `${n.user_id}:${n.meta?.booking_id}:${n.meta?.stage}`));
  const owner = Object.fromEntries(listings.map(l => [l.id, l.partner_id]));

  for (const b of bookings) {
    const end = endDayOf(b);
    const stage = end == null ? null : stageFor(today - end);
    if (!stage) continue;
    const hostId = b.host_id || owner[b.listing_id] || owner[b.apartment_id] || null;
    const sides = [
      { user: b.guest_id, direction: 'guest_to_host', role: 'guest', msg: guestMessage(b, stage) },
      { user: hostId, direction: 'host_to_guest', role: 'host', msg: hostMessage(b, stage) },
    ];
    for (const s of sides) {
      if (!s.user || s.user === (s.role === 'guest' ? hostId : b.guest_id)) continue;
      if (written.has(`${b.id}:${s.direction}`)) { out.skipped_reviewed++; continue; }
      const key = `${s.user}:${b.id}:${stage}`;
      if (sent.has(key)) { out.skipped_sent++; continue; }
      sent.add(key);
      await notify({
        user_id: s.user, kind: 'review', ...s.msg,
        meta: { booking_id: b.id, stage, role: s.role },
      });
      out.sent++;
      out.by_stage[stage] = (out.by_stage[stage] || 0) + 1;
    }
  }
  return out;
}
