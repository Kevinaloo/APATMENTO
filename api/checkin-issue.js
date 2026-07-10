/* ══════════════════════════════════════════════════════════════
   APATMENTO — Check-in Issue Adjudicator  (api/checkin-issue.js)
   ──────────────────────────────────────────────────────────────
   A guest is standing at a door and something is wrong. This
   function decides, in one pass, who pays and what happens next.

   Policy, in full:
     ≥24h before check-in ......... guest refunded in full, nobody carded
     <24h, guest at fault ......... host keeps half of one night
     <24h, host at fault .......... guest refunded in full
                                    guest re-homed immediately
                                    ride paid from platform float
                                    host issued a yellow card
                                    3 yellows → red → under review
     unclear ...................... funds held, operator reviews within the hour

   The guest never waits on us. Redirection fires before the ledger
   settles; money is slower than a person with luggage.
══════════════════════════════════════════════════════════════ */

import { select, one, insert, update, rpc, whoami, notify, cors } from './_db.js';

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();
const RESCUE_BASE = 150, RESCUE_PER_KM = 60;

function haversineKm(a, b, c, d) {
  if ([a, b, c, d].some(v => v == null)) return null;
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLng = (d - b) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(s))).toFixed(2));
}

function hoursToCheckin(dateStr) {
  if (!dateStr) return null;
  return (new Date(`${dateStr}T14:00:00Z`).getTime() - Date.now()) / 3600000;
}

/* Corroboration. A guest's word plus a photo taken 40km from the
   listing is not the same as one taken at the doorstep. We do not
   punish a host on a story alone. */
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
   matter more than price here — a stranded guest needs a bed, and we
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

  const free = pool.filter(l => !busy.has(l.id));
  if (!free.length) return null;

  // Nearest first — every kilometre is one we pay for and they endure.
  free.forEach(l => { l.distance_km = haversineKm(src.lat, src.lng, l.lat, l.lng) ?? 99; });
  free.sort((a, b) => (a.distance_km - b.distance_km) || (b.internal_score - a.internal_score));
  return { ...free[0], listing_id: free[0].id };
}

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
    const hours = hoursToCheckin(bk.checkin_date);
    const phase = hours >= 24 ? 'pre_24h' : hours >= 2 ? 'within_24h' : hours >= -6 ? 'at_checkin' : 'post_checkin';

    /* ── Fault ────────────────────────────────────────────────────
       The taxonomy proposes. Evidence disposes. A serious accusation
       with weak evidence becomes 'unclear' and reaches a human — it
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
      await update('checkin_issues', `id=eq.${issue_id}`, {
        fault, confidence, resolution: 'half_night_to_host', status: 'resolved',
        refund_amount: settle.refund_amount, host_payout: settle.host_payout,
        window_phase: phase, resolved_at: new Date().toISOString(),
      });
      await notify(bk.guest_id, 'refund_partial', 'Cancelled — partial refund',
        `${money(settle.refund_amount)} returns to you. ${money(settle.host_payout)} goes to your ` +
        `host, as half of one night. That's our policy inside 24 hours.`, { booking_id });
      await notify(bk.host_id, 'guest_cancelled', 'Guest cancelled late',
        `You keep ${money(settle.host_payout)}. No card — this wasn't on you.`, { booking_id });

      result.refunded = true;
      return res.status(200).json(result);
    }

    /* ── Clean cancellation, well before check-in ────────────────── */
    if (hours >= 24) {
      await update('apartment_bookings', `id=eq.${booking_id}`, {
        status: 'cancelled', cancelled_at: new Date().toISOString(),
        cancel_reason: `${fault}:${issue.issue_code}`, refund_amount: settle.refund_amount,
      });
      await update('checkin_issues', `id=eq.${issue_id}`, {
        fault, confidence, resolution: 'full_refund', status: 'resolved',
        refund_amount: settle.refund_amount, window_phase: phase,
        resolved_at: new Date().toISOString(),
      });
      await notify(bk.guest_id, 'refund_issued', 'Refunded in full',
        `${money(settle.refund_amount)} is on its way back. You cancelled more than 24 hours out — ` +
        `nothing withheld.`, { booking_id });
      result.refunded = true;
      return res.status(200).json(result);
    }

    /* ══ Host at fault, inside 24 hours ════════════════════════════
       This is the case the whole system exists for. The guest is
       moved first. Everything else follows behind them.            */

    // 1 · Refuge. Book it before we do anything slower.
    const refuge = await findRefuge(bk);
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
        contact_phone: bk.contact_phone,
        stay_total: bk.stay_total,          // they pay what they agreed to pay
        service_fee: bk.service_fee,
        grand_total: bk.grand_total,
        payment_mode: bk.payment_mode,
        deposit_amount: bk.deposit_amount,
        balance_amount: bk.balance_amount,
        balance_paid: bk.balance_paid,
        payment_reference: `RESCUE-${bk.payment_reference}`,
        guest_code: bk.guest_code,
        host_code: 'HOST-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: bk.status,
        rehomed_from: bk.id,
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

    // 2 · The ride. We pay it from the float, then charge it to the host.
    if (refuge) {
      const km = refuge.distance_km ?? haversineKm(issue.geo_lat, issue.geo_lng, refuge.lat, refuge.lng) ?? 5;
      const fare = Math.round(RESCUE_BASE + RESCUE_PER_KM * km);
      try {
        const ride = await rpc('dispatch_rescue_ride', {
          p_issue: issue_id, p_booking: booking_id, p_guest: bk.guest_id,
          p_from: bk.location || 'Original listing',
          p_from_lat: issue.geo_lat, p_from_lng: issue.geo_lng,
          p_to: refuge.location || refuge.title,
          p_to_lat: refuge.lat, p_to_lng: refuge.lng,
          p_distance_km: km, p_fare: fare, p_charge_host: true,
        });
        result.rescue_ride = ride;
      } catch (e) {
        console.warn('[issue] rescue ride:', e.message);
        // A dry float must never strand a guest. Flag it loudly, move them anyway.
        result.rescue_ride = { covered: false, fare, status: 'manual_dispatch' };
        await notify(null, 'ops_alert', 'Rescue ride not auto-covered',
          `Issue ${issue_id}: float could not cover ${money(fare)}. Dispatch manually.`, { issue_id });
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
      cancel_reason: `host:${issue.issue_code}`,
      refund_amount: settle.refund_amount,
      host_penalty: settle.host_penalty,
      rehomed_to: replacement?.id || null,
    });

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
    await notify(bk.guest_id, 'redirected',
      replacement ? 'You\'re being moved' : 'Refunded in full',
      replacement
        ? `${refuge.title} is ready for you, same dates, same price. A ride is on its way — we're paying for it.`
        : `${money(settle.refund_amount)} is on its way back to you, and we're sorry.`,
      { booking_id: replacement?.id || booking_id });

    await notify(issue.host_id, 'yellow_card',
      card?.card === 'red' ? 'Your account is under review' : 'You\'ve received a yellow card',
      card?.card === 'red'
        ? 'Three yellow cards. Your listings are hidden pending review. Reply to appeal.'
        : `${tax?.label || 'A check-in issue'} was verified. This is yellow card ${card?.yellow_count || 1} of 3. ` +
          `Your guest was refunded ${money(settle.refund_amount)} and re-homed at your cost.`,
      { booking_id, issue_id, card: card?.card });

    result.redirect = !!replacement;
    result.refunded = true;
    return res.status(200).json(result);

  } catch (e) {
    console.error('[checkin-issue]', e);
    return res.status(500).json({ error: e.message });
  }
}
