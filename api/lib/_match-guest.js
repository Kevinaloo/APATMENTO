/* ══════════════════════════════════════════════════════════════
   APATMENTO. Match Guest  (api/match-guest.js)
   ──────────────────────────────────────────────────────────────
   A host who cannot honour a booking may offer the guest a
   comparable stay. If the guest accepts, the original host keeps
   30% of our service fee. Payment for solving the problem they
   created, and cheaper for us than a refund and a lost guest.

   The one law: a host inside 24 hours of check-in may not use
   this. At that point it is not a rescheduling, it is a stranding.
   They cancel, the guest is made whole, and they take a card.

   Actions: offer | accept | decline
══════════════════════════════════════════════════════════════ */

import { select, one, insert, update, rpc, whoami, notify, cors } from './_db.js';

const COMMISSION_RATE = 0.30;
const OFFER_TTL_HOURS = 6;

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();

/* Nairobi is UTC+3 year-round (no DST). Listing check-in times are
   entered and shown as Nairobi wall-clock, so the offset must be
   pinned explicitly — this used to hardcode T14:00:00Z (UTC noon+2,
   i.e. 17:00 Nairobi) and ignore the listing's actual checkin_time
   entirely, keeping the Match gate open three hours longer than the
   stated 24-hour policy and misjudging every listing with a check-in
   time other than 14:00. */
function hoursToCheckin(dateStr, checkinTime) {
  if (!dateStr) return null;
  const time = checkinTime || '14:00';
  const iso = dateStr.length <= 10 ? `${dateStr}T${time}:00+03:00` : dateStr;
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

/* Ranked comparables. Prefer the database. It can see availability
   and host standing. Fall back to a client-equivalent ranking so a
   missing migration degrades the feature rather than breaking it. */
async function candidates(booking, limit = 6) {
  try {
    const rows = await rpc('find_match_candidates', { p_booking: booking.id, p_limit: limit });
    if (Array.isArray(rows) && rows.length) return rows;
  } catch (e) { console.warn('[match] rpc:', e.message); }

  const src = await one('listings', `id=eq.${booking.apartment_id}&select=*`);
  if (!src) return [];

  const lo = src.price_night * 0.75, hi = src.price_night * 1.25;
  const pool = await select('listings',
    `status=eq.active&id=neq.${src.id}&price_night=gte.${lo}&price_night=lte.${hi}` +
    `&max_guests=gte.${booking.num_guests || 1}&select=*&limit=80`);

  const busy = new Set(
    (await select('apartment_bookings',
      `cancelled_at=is.null&status=in.(paid_pending_checkin,deposit_paid,checked_in)` +
      `&checkin_date=lt.${booking.checkout_date}&checkout_date=gt.${booking.checkin_date}` +
      `&select=apartment_id`)).map(b => b.apartment_id)
  );

  return pool
    // Never re-home a guest into the SAME host's other listing. That host
    // just told us they can't honour this stay; routing the guest back to
    // them lets them collect the rehoming commission by shuffling their
    // own inventory, and defeats the point when the host is at fault.
    .filter(l => !busy.has(l.id) && l.host_id !== booking.host_id)
    .map(l => {
      const price = 35 * Math.max(0, 1 - Math.abs(l.price_night - src.price_night) / (src.price_night || 1));
      const loc   = 25 * (l.city === src.city ? 1 : 0.35);
      const cap   = 15 * (l.max_guests >= (booking.num_guests || 1)
                          ? Math.max(0, 1 - (l.max_guests - (booking.num_guests || 1)) / 6) : 0);
      const type  = 13 * (l.property_type === src.property_type ? 1 : 0);
      const beds  = 7  * (src.beds == null || l.beds == null ? 0.5
                          : Math.max(0, 1 - Math.abs(l.beds - src.beds) / 4));
      const qual  = 5  * ((l.internal_score ?? 50) / 100);
      return {
        listing_id: l.id, title: l.title, location: l.location, city: l.city,
        price_night: l.price_night, beds: l.beds, max_guests: l.max_guests,
        property_type: l.property_type, photos: l.photos, internal_score: l.internal_score,
        host_id: l.host_id,
        price_delta: Number((l.price_night - src.price_night).toFixed(2)),
        score: Number((price + loc + cap + type + beds + qual).toFixed(2)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await whoami(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { action, booking_id, offer_id, listing_id } = req.body || {};

  try {
    /* ── OFFER ─────────────────────────────────────────────────── */
    if (action === 'offer') {
      const bk = await one('apartment_bookings', `id=eq.${booking_id}&select=*`);
      if (!bk) return res.status(404).json({ error: 'booking_not_found' });
      if (bk.host_id !== user.id) return res.status(403).json({ error: 'not_your_booking' });
      if (bk.cancelled_at)        return res.status(409).json({ error: 'already_cancelled' });
      if (bk.status === 'checked_in') return res.status(409).json({ error: 'already_checked_in' });

      const listingMeta = await one('listings', `id=eq.${bk.apartment_id}&select=checkin_time`).catch(()=>null);
      const h = hoursToCheckin(bk.checkin_date, listingMeta?.checkin_time || null);

      // The gate. Recomputed here, on our clock, not theirs.
      if (h == null || h < 24) {
        await insert('match_offers', {
          booking_id, origin_host_id: bk.host_id, origin_listing_id: bk.apartment_id,
          guest_id: bk.guest_id, status: 'blocked', block_reason: 'within_24h',
          hours_to_checkin: h, candidates: [],
        }, false);
        return res.status(403).json({
          blocked: true, reason: 'within_24h', hours: h,
          message: 'Check-in is under 24 hours away. Matching is closed. ' +
                   'Cancelling now refunds your guest in full. Our team will review the situation.',
        });
      }

      const cands = await candidates(bk, 6);
      if (!cands.length) {
        return res.status(200).json({ blocked: true, reason: 'no_comparable_listing', hours: h });
      }

      const fee = Number(bk.service_fee || 0);
      const commission = Math.round(fee * COMMISSION_RATE);

      const offer = await insert('match_offers', {
        booking_id,
        origin_host_id: bk.host_id,
        origin_listing_id: bk.apartment_id,
        guest_id: bk.guest_id,
        candidates: cands,
        hours_to_checkin: Number(h.toFixed(2)),
        service_fee: fee,
        host_commission: commission,
        status: 'offered',
        expires_at: new Date(Date.now() + OFFER_TTL_HOURS * 3600000).toISOString(),
      });

      await notify(bk.guest_id, 'match_offer',
        'Your host has proposed an alternative',
        `We found ${cands.length} comparable ${cands.length === 1 ? 'stay' : 'stays'} for your dates. ` +
        `Choose one, or take a full refund, either way you decide.`,
        { booking_id, offer_id: offer.id });

      return res.status(200).json({ blocked: false, offer, candidates: cands, commission });
    }

    /* ── ACCEPT ────────────────────────────────────────────────── */
    if (action === 'accept') {
      const offer = await one('match_offers', `id=eq.${offer_id}&select=*`);
      if (!offer)                       return res.status(404).json({ error: 'offer_not_found' });
      if (offer.guest_id !== user.id)   return res.status(403).json({ error: 'not_your_offer' });
      if (offer.status !== 'offered')   return res.status(409).json({ error: `offer_${offer.status}` });
      if (new Date(offer.expires_at) < new Date()) {
        await update('match_offers', `id=eq.${offer_id}`, { status: 'expired', resolved_at: new Date().toISOString() });
        return res.status(409).json({ error: 'offer_expired' });
      }

      const chosen = (offer.candidates || []).find(c => String(c.listing_id) === String(listing_id));
      if (!chosen) return res.status(400).json({ error: 'listing_not_in_offer' });

      const bk = await one('apartment_bookings', `id=eq.${offer.booking_id}&select=*`);
      const listing = await one('listings', `id=eq.${listing_id}&select=*`);
      if (!listing || listing.status !== 'active') return res.status(409).json({ error: 'listing_unavailable' });

      /* Candidates were ranked up to OFFER_TTL_HOURS ago. Someone else
         may have booked this exact listing for these exact dates in
         the meantime — re-check right before we commit, or two guests
         land on the same bed. */
      const clash = await select('apartment_bookings',
        `apartment_id=eq.${listing_id}&cancelled_at=is.null` +
        `&status=in.(paid_pending_checkin,deposit_paid,checked_in)` +
        `&checkin_date=lt.${bk.checkout_date}&checkout_date=gt.${bk.checkin_date}` +
        `&select=id&limit=1`);
      if (clash.length) return res.status(409).json({ error: 'listing_no_longer_available' });

      // Guest never pays more than they agreed to. Price rises are ours to absorb;
      // price falls are theirs to keep.
      const nights   = Number(bk.nights || 1);
      const newStay  = Number(listing.price_night) * nights;
      const oldStay  = Number(bk.stay_total || 0);
      const delta    = newStay - oldStay;
      const refundDue = delta < 0 ? Math.abs(delta) : 0;
      const absorbed  = delta > 0 ? delta : 0;

      const paid = bk.payment_mode === 'deposit' && !bk.balance_paid
        ? Number(bk.deposit_amount || 0) : Number(bk.grand_total || 0);

      const replacement = await insert('apartment_bookings', {
        guest_id: bk.guest_id,
        host_id: listing.host_id,
        apartment_id: listing.id,
        apartment_name: listing.title,
        location: listing.location,
        checkin_date: bk.checkin_date,
        checkout_date: bk.checkout_date,
        nights,
        num_guests: bk.num_guests,
        guest_name: bk.guest_name,
        contact_phone: bk.contact_phone,
        stay_total: oldStay,                     // honour the original price
        service_fee: bk.service_fee,
        grand_total: bk.grand_total,
        payment_mode: bk.payment_mode,
        deposit_amount: bk.deposit_amount,
        balance_amount: bk.balance_amount,
        balance_paid: bk.balance_paid,
        payment_reference: `REHOME-${bk.payment_reference}`,
        guest_code: bk.guest_code,
        host_code: 'HOST-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: bk.status,
        rehomed_from: bk.id,
      });

      await update('apartment_bookings', `id=eq.${bk.id}`, {
        status: 'rehomed',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'host_could_not_host_matched',
        rehomed_to: replacement.id,
      });

      const commission = Math.round(Number(offer.service_fee || 0) * COMMISSION_RATE);

      await update('match_offers', `id=eq.${offer_id}`, {
        status: 'accepted',
        chosen_listing_id: listing_id,
        replacement_booking_id: replacement.id,
        price_delta: delta,
        host_commission: commission,
        commission_paid: true,
        resolved_at: new Date().toISOString(),
      });

      // Ledger: our fee funds the commission, and any price gap we absorbed.
      await insert('platform_float', {
        direction: 'debit', amount: commission, purpose: 'commission',
        ref_type: 'match_offer', ref_id: offer_id,
      }, false).catch(() => {});
      if (absorbed > 0) {
        await insert('platform_float', {
          direction: 'debit', amount: absorbed, purpose: 'match_price_gap',
          ref_type: 'match_offer', ref_id: offer_id,
        }, false).catch(() => {});
      }

      await notify(offer.origin_host_id, 'match_accepted',
        'Your guest accepted the alternative',
        `You earn ${money(commission)}, 30% of our service fee, for finding them a home. ` +
        `No card, no penalty.`,
        { offer_id, commission });

      await notify(listing.host_id, 'match_incoming',
        'New booking via Match',
        `${bk.guest_name || 'A guest'} was matched to ${listing.title} for ${bk.checkin_date}.`,
        { booking_id: replacement.id });

      await notify(bk.guest_id, 'match_confirmed',
        'You\'re moved',
        `${listing.title} is yours for the same dates at the same price` +
        (refundDue ? `, and ${money(refundDue)} is coming back to you.` : '.'),
        { booking_id: replacement.id });

      return res.status(200).json({
        ok: true,
        replacement_booking: replacement,
        refund_due: refundDue,
        absorbed_by_platform: absorbed,
        host_commission: commission,
        guest_paid_extra: 0,
      });
    }

    /* ── DECLINE ───────────────────────────────────────────────── */
    if (action === 'decline') {
      const offer = await one('match_offers', `id=eq.${offer_id}&select=*`);
      if (!offer)                     return res.status(404).json({ error: 'offer_not_found' });
      if (offer.guest_id !== user.id) return res.status(403).json({ error: 'not_your_offer' });

      const bk = await one('apartment_bookings', `id=eq.${offer.booking_id}&select=*`);
      const settle = await rpc('compute_settlement', { p_booking: bk.id, p_fault: 'host' })
        .catch(() => ({ refund_amount: bk.grand_total }));

      await update('apartment_bookings', `id=eq.${bk.id}`, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'guest_declined_match',
        refund_amount: settle.refund_amount,
      });

      await update('match_offers', `id=eq.${offer_id}`, {
        status: 'declined', commission_paid: false, resolved_at: new Date().toISOString(),
      });

      await notify(bk.guest_id, 'refund_issued', 'Refunded in full',
        `${money(settle.refund_amount)} is on its way back to you. Nothing withheld.`,
        { booking_id: bk.id });

      await notify(offer.origin_host_id, 'booking_update', 'Booking update',
        'The guest has chosen an alternative arrangement. Our team will follow up within 24 hours.', { offer_id });

      return res.status(200).json({ ok: true, refunded: true, refund_amount: settle.refund_amount });
    }

    return res.status(400).json({ error: 'unknown_action' });

  } catch (e) {
    console.error('[match-guest]', e);
    return res.status(500).json({ error: e.message });
  }
}

/* ══════════════════════════════════════════════════════════════
   EXPIRE STALE OFFERS  (called by the nightly sweeper)
   ──────────────────────────────────────────────────────────────
   A host makes an offer; the guest never opens the app again. Left
   alone, the offer just sits at 'offered' forever — the original
   booking is neither honoured nor refunded, and nobody is told
   anything, right up until the guest arrives at a door their host
   already said they could not open. Silence is not a decision this
   system is allowed to make for a guest. Once the offer's TTL has
   passed, an unanswered offer is treated exactly like a decline: the
   guest is made whole, in full, without needing to ask.
══════════════════════════════════════════════════════════════ */
export async function expireStaleMatchOffers() {
  const stale = await select('match_offers',
    `status=eq.offered&expires_at=lt.${new Date().toISOString()}&select=*&limit=200`);

  const results = [];
  for (const offer of stale) {
    try {
      const bk = await one('apartment_bookings', `id=eq.${offer.booking_id}&select=*`);
      if (!bk || bk.cancelled_at || bk.status === 'checked_in' || bk.status === 'rehomed') {
        // Already resolved some other way (e.g. checked in, or matched via
        // a later offer). Just close out this stale row.
        await update('match_offers', `id=eq.${offer.id}`,
          { status: 'expired', resolved_at: new Date().toISOString() });
        results.push({ offer_id: offer.id, outcome: 'closed_no_op' });
        continue;
      }

      const settle = await rpc('compute_settlement', { p_booking: bk.id, p_fault: 'host' })
        .catch(() => ({ refund_amount: bk.grand_total }));

      await update('apartment_bookings', `id=eq.${bk.id}`, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'match_offer_unanswered',
        refund_amount: settle.refund_amount,
      });

      await update('match_offers', `id=eq.${offer.id}`,
        { status: 'expired', commission_paid: false, resolved_at: new Date().toISOString() });

      await notify(bk.guest_id, 'refund_issued', 'Refunded in full',
        `Your host couldn't host you and we didn't hear back from you in time to pick an ` +
        `alternative, so ${money(settle.refund_amount)} is on its way back. Nothing withheld.`,
        { booking_id: bk.id });

      await notify(offer.origin_host_id, 'booking_update', 'Booking update',
        'The guest did not respond to the alternative in time. They have been refunded in full.',
        { offer_id: offer.id });

      // A guest who was this close to check-in with an unresolved offer is
      // an incident, not a routine expiry. Ops needs eyes on it now.
      const h = Number(offer.hours_to_checkin);
      if (Number.isFinite(h) && h < 30) {
        await notify(null, 'ops_alert', 'Match offer expired unresolved near check-in',
          `Offer ${offer.id} on booking ${bk.id} expired with the guest unresponsive and check-in ` +
          `close by. Refunded automatically — confirm the guest is actually taken care of.`,
          { offer_id: offer.id, booking_id: bk.id });
      }

      results.push({ offer_id: offer.id, outcome: 'auto_refunded', refund_amount: settle.refund_amount });
    } catch (e) {
      console.error('[expire-match-offers]', offer.id, e);
      results.push({ offer_id: offer.id, outcome: 'error', error: e.message });
    }
  }

  return { scanned: stale.length, results };
}
