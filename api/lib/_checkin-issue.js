/* ══════════════════════════════════════════════════════════════
   APATMENTO. Check-in Issue Adjudicator  (api/checkin-issue.js)
   ──────────────────────────────────────────────────────────────
   A guest is standing at a door and something is wrong. This
   function decides, in one pass, who pays and what happens next.

   Policy, in full:
     ≥24h before check-in ......... guest refunded in full, nobody carded
     <24h, guest at fault ......... host keeps half of one night
     <24h, host at fault .......... guest refunded in full
                                    guest re-homed immediately
                                      UNLESS the guest said, when filing
                                      the report, that they'd rather be
                                      refunded than moved — see
                                      `prefer_refund` below
                                    ride paid from platform float
                                      IF the stay was paid in full,
                                      and once per guest, for life
                                    host issued a yellow card
                                    3 yellows → red → under review
     unclear ...................... funds held, operator reviews within the hour

   The guest never waits on us. Redirection fires before the ledger
   settles; money is slower than a person with luggage.

   `prefer_refund`, on the checkin_issues row, is set by the guest at
   the moment they file the report — before anyone knows whose fault
   this is. It changes NOTHING about fault or about what a guest who
   turns out to be at fault owes; it only removes the automatic refuge
   search from the one branch where the guest would otherwise be handed
   a replacement booking. A guest whose listing does not exist, or is
   unsafe, may not want another stranger's room offered as the fix —
   they want their money and the freedom to look themselves.

   THE RIDE, AND WHY IT IS BOUNDED
   ───────────────────────────────
   Being moved is not conditional on anything. A guest standing at a
   door that will not open gets moved — deposit or no deposit, first
   time or fifth. That has not changed and must not.

   The RIDE between the two doors is a different promise, and a bounded
   one: it is compensation on a completed transaction, offered to
   guests who paid their stay in full, once each, for life.

     · Paid in full, because a part-payment has not yet bought the
       thing we would be compensating for, and because "report a
       problem, collect a fare" against a 25% deposit is a taxi
       service with a booking form attached.
     · Once per guest, because a second one is not compensation, it is
       a pattern — and a pattern is a conversation with a human, not
       an automatic payment.

   Both halves are enforced inside dispatch_rescue_ride() in Postgres,
   under a unique index, so no caller can grant a second one by
   accident. The checks below run first only so the guest is told the
   truth instead of watching something fail silently.
══════════════════════════════════════════════════════════════ */

import { select, one, insert, update, rpc, whoami, notify, cors } from './_db.js';
import { voidOnNoShow, referralRootRef } from './_referral-lifecycle.js';

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();
const RESCUE_BASE = 150, RESCUE_PER_KM = 60;

/* What a booking has actually paid, by the same rule the check-in gate
   and the rescue-ride eligibility check both use. amount_paid is
   NOT NULL and backfilled; the status/deposit fallback is only for
   rows that predate the column. Used whenever a replacement booking is
   built here, so the money a guest already paid moves with them. */
function amountPaidOf(bk) {
  if (bk.amount_paid != null) return Number(bk.amount_paid || 0);
  const owed = Number(bk.grand_total || 0);
  if (['paid_pending_checkin', 'checked_in', 'completed'].includes(String(bk.status))) return owed;
  return Number(bk.deposit_amount || 0)
    + (bk.balance_paid ? owed - Number(bk.deposit_amount || 0) : 0);
}

function haversineKm(a, b, c, d) {
  if ([a, b, c, d].some(v => v == null)) return null;
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLng = (d - b) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(s))).toFixed(2));
}

/* Nairobi is UTC+3 year-round (no DST). Listing check-in times are
   entered and shown as Nairobi wall-clock, so the composed timestamp
   must carry that offset explicitly — Vercel's serverless runtime is
   UTC, and an unqualified "14:00" was silently read as 14:00 UTC
   (17:00 Nairobi), keeping every 24-hour gate below open three hours
   longer than the stated policy. */
function hoursToCheckin(dateStr, checkinTime) {
  if (!dateStr) return null;
  const time = checkinTime || '14:00';
  const iso = dateStr.length <= 10 ? `${dateStr}T${time}:00+03:00` : dateStr;
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

/* Corroboration. A guest's word plus a photo taken 40km from the
   listing is not the same as one taken at the doorstep. We do not
   punish a host on a story alone. */
/* `issue.geo_distance_m` used to arrive from the browser, and it moves
   0.55 of a point of confidence — enough, on its own, to turn "unclear"
   into "host at fault" and so into a full refund, a free move and a
   card. A guest could simply claim to be standing on the doorstep. It is
   now computed in a BEFORE trigger from the coordinates and the
   listing's own position (see the migration), so the number this reads
   is ours, and a claimed one is overwritten before it is ever stored. */
function evidenceStrength(issue, taxRow) {
  let s = 0.4;
  if (issue.photo_live)                       s += 0.30;
  if (issue.photo_url)                        s += 0.10;
  if (issue.geo_distance_m != null && issue.geo_distance_m < 250) s += 0.20;
  if (issue.geo_distance_m != null && issue.geo_distance_m > 2000) s -= 0.35;
  if ((issue.free_text || '').trim().length > 40) s += 0.05;
  if (taxRow && taxRow.requires_photo && !issue.photo_url) s -= 0.40;
  return Math.max(0, Math.min(1, Number(s.toFixed(2))));
}

/* Pattern is evidence too. One complaint about a listing is noise.
   The fourth in a month is a fact. */
async function historyPenalty(hostId, listingId) {
  if (!hostId) return { prior: 0, weight: 0 };
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const rows = await select('checkin_issues',
    `host_id=eq.${hostId}&fault=eq.host&status=eq.resolved&created_at=gte.${since}&select=id,listing_id`);
  const prior = rows.length;
  const sameListing = rows.filter(r => r.listing_id === listingId).length;
  return { prior, sameListing, weight: Math.min(0.25, prior * 0.05 + sameListing * 0.04) };
}

/* Find somewhere for them to go, right now. Availability and standing
   matter more than price here. A stranded guest needs a bed, and we
   are the ones paying the difference. */
async function findRefuge(bk) {
  try {
    const rows = await rpc('find_match_candidates', { p_booking: bk.id, p_limit: 3 });
    if (Array.isArray(rows) && rows.length) return rows[0];
  } catch (_) {}

  const src = await one('listings', `id=eq.${bk.apartment_id}&select=*`);
  if (!src) return null;
  const pool = await select('listings',
    `status=eq.active&id=neq.${src.id}&max_guests=gte.${bk.num_guests || 1}` +
    `&price_night=lte.${src.price_night * 1.4}&select=*&order=internal_score.desc&limit=25`);

  const busy = new Set((await select('apartment_bookings',
    `cancelled_at=is.null&status=in.(paid_pending_checkin,deposit_paid,checked_in)` +
    `&checkin_date=lt.${bk.checkout_date}&checkout_date=gt.${bk.checkin_date}&select=apartment_id`))
    .map(b => b.apartment_id));

  // Never send a guest fleeing a problem back to the SAME host's other
  // property. Whatever went wrong here (unsafe, fake listing, unreachable
  // host, occupied) is a fact about the host, not just the unit.
  const free = pool.filter(l => !busy.has(l.id) && l.host_id !== bk.host_id);
  if (!free.length) return null;

  // Nearest first, every kilometre is one we pay for and they endure.
  free.forEach(l => { l.distance_km = haversineKm(src.lat, src.lng, l.lat, l.lng) ?? 99; });
  free.sort((a, b) => (a.distance_km - b.distance_km) || (b.internal_score - a.internal_score));
  return { ...free[0], listing_id: free[0].id };
}

/* Ops alerts go to their own table. notifications.user_id is NOT NULL,
   so every notify(null, 'ops_alert', …) that used to live in this file
   was a silent no-op — the alerts meant to say "a guest may be stranded,
   look now" reached nobody at all. */
async function alertOps(kind, title, body, meta = {}, severity = 'warn') {
  try { await insert('ops_alerts', { kind, severity, title, body, meta }, false); }
  catch (e) { console.warn('[ops_alert]', kind, e.message); }
}

/* The two gates on the ride, asked politely before Postgres asks them
   with a constraint. Both read the record, never the request. */
const rideEligibility = {
  async paidInFull(bk) {
    /* Prefer the database's own definition so this can never drift from
       the one the constraint uses. */
    try {
      const v = await rpc('booking_fully_paid', { p_booking: bk.id });
      if (typeof v === 'boolean') return v;
    } catch (e) { /* fall through to the local reading */ }

    const owed = Number(bk.grand_total || 0);
    if (owed <= 0) return false;
    return amountPaidOf(bk) >= owed - 1;
  },

  async priorCoveredRide(guestId) {
    if (!guestId) return false;
    try {
      const rows = await select('rescue_rides',
        `guest_id=eq.${guestId}&covered_by=eq.platform_float&select=id&limit=1`);
      return rows.length > 0;
    } catch (e) {
      /* If we cannot tell, do not hand out a ride we may already have
         given. The database constraint would refuse it anyway, and the
         guest is moved either way. */
      console.warn('[issue] prior ride lookup:', e.message);
      return true;
    }
  },
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await whoami(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { issue_id, booking_id } = req.body || {};
  if (!issue_id || !booking_id) return res.status(400).json({ error: 'missing_ids' });

  try {
    const issue = await one('checkin_issues', `id=eq.${issue_id}&select=*`);
    if (!issue) return res.status(404).json({ error: 'issue_not_found' });
    if (issue.guest_id !== user.id) return res.status(403).json({ error: 'not_your_issue' });
    if (issue.status !== 'open')    return res.status(409).json({ error: 'already_adjudicated' });

    const bk = await one('apartment_bookings', `id=eq.${booking_id}&select=*`);
    if (!bk) return res.status(404).json({ error: 'booking_not_found' });

    const tax = await one('issue_taxonomy', `code=eq.${issue.issue_code}&select=*`);
    // Fetch host's set check-in time; fall back to 14:00 if not stored
    const listing = await one('listings', `id=eq.${bk.apartment_id}&select=checkin_time,lat,lng,host_id`).catch(()=>null);
    const checkinTime = listing?.checkin_time || '14:00';
    const hours = hoursToCheckin(bk.checkin_date, checkinTime);
    const phase = hours >= 24 ? 'pre_24h' : hours >= 2 ? 'within_24h' : hours >= -6 ? 'at_checkin' : 'post_checkin';

    /* ── Fault ────────────────────────────────────────────────────
       The taxonomy proposes. Evidence disposes. A serious accusation
       with weak evidence becomes 'unclear' and reaches a human. It
       does not become a card.                                       */
    let fault = tax?.fault || 'unclear';
    const strength = evidenceStrength(issue, tax);
    const hist = await historyPenalty(issue.host_id, issue.listing_id);
    const confidence = Math.min(0.98, strength + hist.weight);

    if (fault === 'host' && (tax?.severity ?? 3) >= 4 && confidence < 0.55) fault = 'unclear';

    /* ── Money ────────────────────────────────────────────────────
       The database is the arithmetic authority. If the RPC is absent
       we compute the same thing here rather than guess.             */
    let settle;
    try {
      settle = await rpc('compute_settlement', { p_booking: booking_id, p_fault: fault, p_hours: hours });
    } catch (_) {
      const nightly = Number(bk.stay_total || 0) / Math.max(1, Number(bk.nights || 1));
      const paid = bk.payment_mode === 'deposit' && !bk.balance_paid
        ? Number(bk.deposit_amount || 0) : Number(bk.grand_total || 0);
      settle = hours >= 24
        ? { refund_amount: paid, host_payout: 0, host_penalty: 0 }
        : fault === 'guest'
          ? { refund_amount: Math.max(0, paid - Math.round(nightly / 2)), host_payout: Math.round(nightly / 2), host_penalty: 0 }
          : fault === 'host'
            ? { refund_amount: paid, host_payout: 0, host_penalty: Math.round(nightly / 2) }
            : { refund_amount: paid, host_payout: 0, host_penalty: 0 };
      settle.paid = paid;
    }

    const result = {
      ok: true, fault, confidence, phase,
      refund_amount: settle.refund_amount,
      host_payout: settle.host_payout,
      redirect: false, refunded: false, held: false,
      card: null, rescue_ride: null, refuge: null,
    };

    /* ── Unclear: nobody is charged, nobody is carded, we look ──── */
    if (fault === 'unclear') {
      await update('checkin_issues', `id=eq.${issue_id}`, {
        fault, confidence, resolution: 'pending', status: 'escalated', window_phase: phase,
      });
      await notify(bk.guest_id, 'issue_held', 'We\'re reviewing your report',
        'Your money is held, not released to the host. We\'ll come back to you within the hour.',
        { booking_id });
      result.held = true;
      return res.status(200).json(result);
    }

    /* ── Guest at fault, inside the window ───────────────────────── */
    if (fault === 'guest' && hours < 24) {
      await update('apartment_bookings', `id=eq.${booking_id}`, {
        status: 'cancelled', cancelled_at: new Date().toISOString(),
        cancel_reason: `guest:${issue.issue_code}`,
        refund_amount: settle.refund_amount,
      });
      await voidOnNoShow(bk, `guest_fault:${issue.issue_code}`);

      await update('checkin_issues', `id=eq.${issue_id}`, {
        fault, confidence, resolution: 'half_night_to_host', status: 'resolved',
        refund_amount: settle.refund_amount, host_payout: settle.host_payout,
        window_phase: phase, resolved_at: new Date().toISOString(),
      });
      await notify(bk.guest_id, 'refund_partial', 'Cancelled. Partial refund',
        `${money(settle.refund_amount)} returns to you. ${money(settle.host_payout)} goes to your ` +
        `host, as half of one night. That's our policy inside 24 hours.`, { booking_id });
      await notify(bk.host_id, 'guest_cancelled', 'Guest cancelled late',
        `You keep ${money(settle.host_payout)}. No card. This wasn't on you.`, { booking_id });

      result.refunded = true;
      return res.status(200).json(result);
    }

    /* ── Clean cancellation, well before check-in ────────────────── */
    if (hours >= 24) {
      await update('apartment_bookings', `id=eq.${booking_id}`, {
        status: 'cancelled', cancelled_at: new Date().toISOString(),
        cancel_reason: `${fault}:${issue.issue_code}`, refund_amount: settle.refund_amount,
      });
      await voidOnNoShow(bk, `${fault}:${issue.issue_code}`);

      await update('checkin_issues', `id=eq.${issue_id}`, {
        fault, confidence, resolution: 'full_refund', status: 'resolved',
        refund_amount: settle.refund_amount, window_phase: phase,
        resolved_at: new Date().toISOString(),
      });
      await notify(bk.guest_id, 'refund_issued', 'Refunded in full',
        `${money(settle.refund_amount)} is on its way back. You cancelled more than 24 hours out, ` +
        `nothing withheld.`, { booking_id });
      result.refunded = true;
      return res.status(200).json(result);
    }

    /* ══ Host at fault, inside 24 hours ════════════════════════════
       This is the case the whole system exists for. The guest is
       moved first. Everything else follows behind them — UNLESS the
       guest already told us, when they filed the report, that they
       would rather have their money back than another Cabana booking
       pushed at them. That preference is honoured only here, only once
       the host is actually found at fault: it never changes who is at
       fault or what a guest who IS at fault owes. A guest standing at
       an address that does not exist, or one that is unsafe, may not
       want to be handed a stranger's spare room as the answer — they
       want to be able to go and look for their own. Skipping the
       refuge search is the whole of the difference; everything after
       it (the card, the ledger, the review) proceeds exactly as it
       would for a "nothing comparable was free" refund. */
    const preferRefund = issue.prefer_refund === true;

    // 1 · Refuge. Book it before we do anything slower — unless they
    //     asked us not to.
    const refuge = preferRefund ? null : await findRefuge(bk);
    let replacement = null;

    if (refuge) {
      replacement = await insert('apartment_bookings', {
        guest_id: bk.guest_id,
        host_id: refuge.host_id,
        apartment_id: refuge.listing_id,
        apartment_name: refuge.title,
        location: refuge.location,
        checkin_date: bk.checkin_date,
        checkout_date: bk.checkout_date,
        nights: bk.nights,
        num_guests: bk.num_guests,
        guest_name: bk.guest_name,
        guest_phone: bk.guest_phone,
        contact_phone: bk.contact_phone,
        contact_email: bk.contact_email,
        contact_whatsapp: bk.contact_whatsapp,
        stay_total: bk.stay_total,          // they pay what they agreed to pay
        service_fee: bk.service_fee,
        grand_total: bk.grand_total,
        payment_mode: bk.payment_mode,
        deposit_amount: bk.deposit_amount,
        balance_amount: bk.balance_amount,
        balance_paid: bk.balance_paid,
        /* The money already collected moves with the guest. Left at its
           NOT NULL DEFAULT 0, this replacement would read as unpaid —
           the same "paid in full, moved, then locked out of their own
           check-in code" bug the rehoming path (_match-guest.js
           carryOver) was built to avoid, reappearing here because this
           insert never went through that helper. */
        amount_paid:   amountPaidOf(bk),
        fully_paid_at: bk.fully_paid_at,
        credit_applied: bk.credit_applied,
        payment_reference: `RESCUE-${bk.payment_reference}`,
        guest_code: bk.guest_code,
        host_code: 'HOST-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: bk.status,
        rehomed_from: bk.id,
        // So a referral commission on this guest survives being moved —
        // see api/lib/_referral-lifecycle.js.
        referral_root_ref: referralRootRef(bk),
      });

      // Any price gap is ours. The guest did not cause this.
      const gap = (Number(refuge.price_night) * Number(bk.nights || 1)) - Number(bk.stay_total || 0);
      if (gap > 0) {
        await insert('platform_float', {
          direction: 'debit', amount: Math.round(gap), purpose: 'rescue_price_gap',
          ref_type: 'booking', ref_id: replacement.id,
        }, false).catch(() => {});
      }
      result.refuge = { listing_id: refuge.listing_id, title: refuge.title, booking_id: replacement.id };
    }

    /* 2 · The ride. Comes from platform float. We do not tell the host
       about ride logistics.

       Two gates, and they are gates on the RIDE, never on the move.
       The guest has already been re-homed above; nothing below can
       leave them standing where they are.

         · paid in full — compensation on a completed transaction
         · once per guest, for life — the second is a pattern, and a
           pattern goes to a person

       Postgres enforces both again inside dispatch_rescue_ride(), under
       a unique index. These checks exist so we can tell the guest the
       truth in the same breath as we move them, rather than promising a
       car that a constraint is about to refuse. */
    if (refuge) {
      const km = refuge.distance_km ?? haversineKm(issue.geo_lat, issue.geo_lng, refuge.lat, refuge.lng) ?? 5;
      const fare = Math.round(RESCUE_BASE + RESCUE_PER_KM * km);

      const paidInFull = await rideEligibility.paidInFull(bk);
      const priorRide  = await rideEligibility.priorCoveredRide(bk.guest_id);

      if (!paidInFull || priorRide) {
        const reason = !paidInFull ? 'not_paid_in_full' : 'already_used_lifetime_ride';
        result.rescue_ride = { covered: false, eligible: false, reason, fare, status: 'not_offered' };
        await alertOps('rescue_ride_not_offered',
          'Guest moved, ride not covered',
          reason === 'not_paid_in_full'
            ? `Issue ${issue_id}: the guest had not paid this stay in full, so the covered ride is ` +
              `outside the offer. They have been moved regardless. Fare would have been ${money(fare)} ` +
              `— decide by hand whether to carry them.`
            : `Issue ${issue_id}: this guest has already used their one covered rescue ride. They have ` +
              `been moved regardless. Fare would have been ${money(fare)} — decide by hand.`,
          { issue_id, booking_id, guest_id: bk.guest_id, fare, reason });
      } else {
        try {
          const ride = await rpc('dispatch_rescue_ride', {
            p_issue: issue_id, p_booking: booking_id, p_guest: bk.guest_id,
            p_from: bk.location || 'Original listing',
            p_from_lat: issue.geo_lat, p_from_lng: issue.geo_lng,
            p_to: refuge.location || refuge.title,
            p_to_lat: refuge.lat, p_to_lng: refuge.lng,
            p_distance_km: km, p_fare: fare, p_charge_host: false,
          });
          result.rescue_ride = ride;
          /* The RPC has the last word. If its own gates refused, say so
             here too rather than reporting a car that is not coming. */
          if (ride && ride.eligible === false) {
            await alertOps('rescue_ride_declined_by_db',
              'Ride refused at the database gate',
              `Issue ${issue_id}: dispatch_rescue_ride refused with "${ride.reason}". The guest is ` +
              `moved; the ride is not booked.`,
              { issue_id, booking_id, guest_id: bk.guest_id, reason: ride.reason });
          }
        } catch (e) {
          console.warn('[issue] rescue ride:', e.message);
          // A dry float must never strand a guest. Flag it loudly, move them anyway.
          result.rescue_ride = { covered: false, eligible: true, fare, status: 'manual_dispatch' };
          await alertOps('rescue_ride_dispatch_failed',
            'Rescue ride not auto-covered',
            `Issue ${issue_id}: the ride could not be booked automatically (${e.message}). ` +
            `The guest is eligible and has been moved. Dispatch ${money(fare)} manually, now.`,
            { issue_id, booking_id, guest_id: bk.guest_id, fare }, 'critical');
        }
      }
    }

    // 3 · The card. Only now, once the guest is safe.
    let card = null;
    try {
      card = await rpc('issue_yellow_card', {
        p_host: issue.host_id,
        p_reason: `${tax?.label || issue.issue_code} at check-in (confidence ${Math.round(confidence * 100)}%)`,
        p_booking: booking_id, p_issue: issue_id, p_listing: issue.listing_id,
      });
      result.card = card;
    } catch (e) { console.warn('[issue] card:', e.message); }

    // 4 · The ledger.
    await update('apartment_bookings', `id=eq.${booking_id}`, {
      status: replacement ? 'rehomed' : 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: preferRefund ? `host:${issue.issue_code}:guest_preferred_refund`
                                  : `host:${issue.issue_code}`,
      refund_amount: settle.refund_amount,
      host_penalty: settle.host_penalty,
      rehomed_to: replacement?.id || null,
    });

    /* No replacement means the stay is over, full stop — whether that
       is because nothing comparable existed or because the guest asked
       us not to look. Either way nobody is completing this stay, so any
       referral commission riding on it never becomes real. */
    if (!replacement) {
      await voidOnNoShow(bk, preferRefund ? 'guest_preferred_refund' : 'no_comparable_listing');
    }

    await update('checkin_issues', `id=eq.${issue_id}`, {
      fault, confidence,
      resolution: replacement ? 'redirect' : 'full_refund',
      status: 'resolved',
      refund_amount: settle.refund_amount,
      host_payout: 0,
      redirect_booking_id: replacement?.id || null,
      window_phase: phase,
      resolved_at: new Date().toISOString(),
    });

    // Ranking learns from this immediately, without waiting for a review.
    await rpc('recompute_internal_score', { p_listing: issue.listing_id }).catch(() => {});

    // 5 · Tell everyone.
    /* Say exactly what is true about the car. A guest who is told "your
       ride is booked" and then waits for one that was never dispatched
       has been failed twice. */
    const rideLine = !replacement ? ''
      : result.rescue_ride && result.rescue_ride.eligible !== false && result.rescue_ride.covered
        ? ' Your ride there is booked and paid for by us.'
        : result.rescue_ride && result.rescue_ride.eligible === false
          ? ' Getting there is on you this time, and we are sorry — the covered ride goes to guests ' +
            'who have paid a stay in full, once each. Talk to us if that is hard.'
          : ' A person is arranging your ride now and will message you.';

    await notify(bk.guest_id, 'redirected',
      replacement ? 'You\'re being moved' : 'Refunded in full',
      replacement
        ? `We've found you alternative accommodation at ${refuge.title} for the same dates.` +
          rideLine + ' Our team will be in contact.'
        : preferRefund
          ? `${money(settle.refund_amount)} is being processed back to you, as you asked. ` +
            `Nothing withheld, and you're free to book somewhere else whenever you're ready.`
          : `${money(settle.refund_amount)} is being processed back to you. We're sorry for the inconvenience.`,
      { booking_id: replacement?.id || booking_id });

    // Host notification: neutral, no card language, no ride mention.
    // Cards and rankings are internal. We review within 24h and reach out
    // with findings only if the complaint is validated.
    await notify(issue.host_id, 'guest_departed',
      'A guest departure was reported',
      'A guest has reported they could not complete their stay. Our team is reviewing the matter ' +
      'and will be in touch within 24 hours if further information is needed.',
      { booking_id, issue_id });

    result.redirect = !!replacement;
    result.refunded = true;
    return res.status(200).json(result);

  } catch (e) {
    console.error('[checkin-issue]', e);
    return res.status(500).json({ error: e.message });
  }
}
