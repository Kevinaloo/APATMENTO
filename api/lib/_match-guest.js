/* ══════════════════════════════════════════════════════════════
   APATMENTO. Rehoming  (api/match-guest.js)
   ──────────────────────────────────────────────────────────────
   ONE SYSTEM, TWO DOORS. Read this before changing anything here.

   A guest has paid for a bed on a given night. Something has gone
   wrong with that bed. Rehoming is how they end up in another one
   without losing money, losing the night, or having to argue.

   DOOR 1 · THE HOST SAYS THEY CANNOT HOST
             action: 'offer'         the automatic sweep
             action: 'offer-direct'  the host points at one listing
     The host presses "I can't host this booking". Either we sweep the
     inventory for them, or they already know where the guest should
     go — their own other property, a friend's, anyone's on the
     platform — and share it directly. Either way the guest gets a
     shortlist (one listing, for a direct share) held for six hours.

     If they take it, the original host earns 10% of our service fee
     — payment for solving the problem they created, and cheaper for
     us than a refund and a lost guest. That commission is HELD, not
     paid: it becomes real only once the guest has paid the new stay
     in full and actually checked into it. A guest who is later
     refunded instead never generated a commission to begin with, and
     a host sharing their OWN other property (offer-direct) earns
     nothing at all — a finder's fee for moving a guest between two
     rooms you already own is the exact "commission by shuffling your
     own inventory" this system exists to prevent, so the money simply
     never attaches to that case. If the guest declines, or says
     nothing at all, they are refunded in full.

     The one law: a host inside 24 hours of check-in may not use this
     door. At that point it is not a rescheduling, it is a stranding.
     They cancel, the guest is made whole, and they take a card.

   DOOR 2 · THE GUEST ASKS TO BE MOVED       action: 'guest-request'
     The guest presses "Find me another home". This exists because
     door 1 depends on a host who is willing to press a button — and
     the hosts who strand people are exactly the hosts who don't.

     The server, not the guest, decides why they are moving:

       fault = 'host'        the host cancelled, went dark, was
                             suspended, took the listing down, has a
                             blocked or expired offer on this
                             booking, or has already been found at
                             fault on a check-in issue here.
       fault = 'platform'    we removed the listing.
       fault = 'guest_choice' none of the above. They simply want to
                             move.

     The reason the guest types is recorded and shown to ops. It is
     never what decides the money. A text box that sets the refund
     policy is a text box that will be filled in accordingly.

     Terms follow fault, and only fault:

       host / platform  →  same dates, SAME PRICE to the guest. We
                           absorb an increase; a decrease comes back
                           to them. No penalty, no fee, no limit on
                           how many times we will move someone we
                           failed. A ride is considered separately
                           (see _checkin-issue.js) and is not free
                           money: paid in full, once per guest.

       guest_choice     →  we only offer them somewhere at or below
                           what they already paid, and any difference
                           comes back. Two requests per booking, and
                           the door closes 24 hours before check-in.
                           This is deliberate: an unbounded "move me"
                           button on a paid booking is a way to shop
                           the whole inventory from inside a booking,
                           and an unbounded one that can move you
                           UPWARDS is a way to buy a cheap night and
                           trade up for free. If they want somewhere
                           dearer, they cancel under the ordinary
                           policy and book it. That is not a worse
                           deal, it is the same deal, honestly named.

   THE BROADCAST
     Either door ends the same way: the shortlist is written to the
     offer, and every host on it is told a matched guest is looking
     at their place for those dates. They are not asked to approve —
     availability is already checked — they are told, so they can
     hold it and answer a message quickly. The guest then chooses
     through the ordinary flow.

   WHY THE ARITHMETIC IS ALL IN HERE
     It used to be possible to write a match_offers row from the
     browser. `service_fee` on that row decides the host's 10%
     commission and `candidates` decides which listings the platform
     will absorb a price gap to. Both were attacker-controlled. The
     migration closed the RLS hole; this file is the other half —
     every number below is read from the booking and the listing, on
     the server, and never from the offer row a client can see.

   Actions: offer | offer-direct | guest-request | accept | decline | eligibility
══════════════════════════════════════════════════════════════ */

import { select, one, insert, update, rpc, whoami, notify, cors } from './_db.js';
import { pendingCommission, voidOnNoShow, referralRootRef } from './_referral-lifecycle.js';

/* The origin host's cut when their own rehoming offer — swept or
   directly shared — is taken. A share of OUR fee, never of the
   booking, and it changed from 30% because a fee that size was never
   really "you found a room, take a slice" money; it was closer to
   splitting the whole reason we charge a fee at all. 10% is still a
   real thank-you and it is what the host now sees. */
const COMMISSION_RATE = 0.10;

/* How long a shortlist is good for. Long enough to sleep on, short
   enough that the listings on it are still free when they wake up. */
const OFFER_TTL_HOURS = 6;

/* The sweep widens until it finds something. A guest with one perfect
   match and a guest with six near-matches both need an answer; a guest
   with an empty list needs one most of all. Start tight, and only
   loosen when tight comes back empty. */
const BAND_LADDER = [0.10, 0.20, 0.35, 0.60];
const WANT_CANDIDATES = 6;
const MIN_CANDIDATES  = 3;

/* A guest-initiated move is bounded. Both numbers are policy, not
   plumbing — change them here and nowhere else. */
const GUEST_REQUEST_LIMIT   = 2;
const GUEST_REQUEST_MIN_HRS = 24;

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();
const num   = (v) => Number(v || 0) || 0;

function haversineKm(a, b, c, d) {
  if ([a, b, c, d].some(v => v == null)) return null;
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLng = (d - b) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(s))).toFixed(2));
}

/* Statuses that mean money has been taken and a bed is being held. */
const LIVE_STATUSES = ['paid_pending_checkin', 'deposit_paid', 'part_paid', 'checked_in'];

/* Nairobi is UTC+3 year-round (no DST). Listing check-in times are
   entered and shown as Nairobi wall-clock, so the offset must be
   pinned explicitly — this used to hardcode T14:00:00Z (UTC noon+2,
   i.e. 17:00 Nairobi) and ignore the listing's actual checkin_time
   entirely, keeping the Match gate open three hours longer than the
   stated 24-hour policy. */
function hoursToCheckin(dateStr, checkinTime) {
  if (!dateStr) return null;
  const time = checkinTime || '14:00';
  const iso = dateStr.length <= 10 ? `${dateStr}T${time}:00+03:00` : dateStr;
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

/* What this booking has actually paid, by the same rule the check-in
   gate uses. amount_paid is NOT NULL and backfilled; the status
   fallback is for rows that predate the column. */
function amountPaid(bk) {
  if (bk.amount_paid != null) return num(bk.amount_paid);
  if (['paid_pending_checkin', 'checked_in', 'completed'].includes(String(bk.status))) {
    return num(bk.grand_total);
  }
  return num(bk.deposit_amount)
    + (bk.balance_paid ? num(bk.grand_total) - num(bk.deposit_amount) : 0);
}

/* ══════════════════════════════════════════════════════════════
   THE SWEEP
   ──────────────────────────────────────────────────────────────
   Prefer the database: it can see availability, host standing and
   the ranking in one pass. Fall back to an equivalent ranking here
   so a missing migration degrades the feature rather than breaking
   a guest who is standing outside a locked door.

   `capAtOriginalPrice` is the guest_choice guard rail. Offering a
   dearer room to someone who is moving by choice would need a
   payment step mid-move; not offering it needs nothing, cannot be
   gamed, and costs a guest who wanted to trade up exactly one
   ordinary cancellation.
══════════════════════════════════════════════════════════════ */
async function sweep(booking, { limit = WANT_CANDIDATES, capAtOriginalPrice = false, maxKm = null } = {}) {
  const src = await one('listings', `id=eq.${booking.apartment_id}&select=*`).catch(() => null);
  const srcPrice = num(src?.price_night);

  const keep = (rows) => {
    let out = (rows || []).filter(r => r && r.listing_id != null);
    if (capAtOriginalPrice && srcPrice > 0) {
      out = out.filter(r => num(r.price_night) <= srcPrice);
    }
    return out;
  };

  /* Widen until there is enough to choose from. */
  for (const band of BAND_LADDER) {
    let rows = null;
    try {
      rows = await rpc('find_rehome_candidates', {
        p_booking: booking.id, p_limit: limit, p_band: band, p_max_km: maxKm,
      });
    } catch (e) {
      /* The generalised sweep is not deployed yet. Try the original. */
      try {
        rows = await rpc('find_match_candidates', { p_booking: booking.id, p_limit: limit });
      } catch (e2) {
        console.warn('[rehome] rpc unavailable:', e2.message);
        rows = null;
      }
      const kept = keep(rows);
      if (kept.length) return { candidates: kept.slice(0, limit), band, source: 'rpc_legacy' };
      break;
    }

    const kept = keep(rows);
    if (kept.length >= MIN_CANDIDATES || (kept.length && band === BAND_LADDER[BAND_LADDER.length - 1])) {
      return { candidates: kept.slice(0, limit), band, source: 'rpc' };
    }
    if (kept.length && band >= 0.35) {
      return { candidates: kept.slice(0, limit), band, source: 'rpc' };
    }
  }

  /* ── Fallback ranking, equivalent to the RPC ────────────────────
     Reached only when the RPC is absent or returned nothing at every
     band. Same rules, same exclusions, computed here. */
  if (!src) return { candidates: [], band: null, source: 'none' };

  const widest = BAND_LADDER[BAND_LADDER.length - 1];
  const lo = srcPrice * (1 - widest);
  const hi = capAtOriginalPrice ? srcPrice : srcPrice * (1 + widest);

  const pool = await select('listings',
    `status=eq.active&id=neq.${src.id}&price_night=gte.${lo}&price_night=lte.${hi}` +
    `&select=*&limit=120`);

  const busy = new Set(
    (await select('apartment_bookings',
      `cancelled_at=is.null&status=in.(${LIVE_STATUSES.join(',')})` +
      `&checkin_date=lt.${booking.checkout_date}&checkout_date=gt.${booking.checkin_date}` +
      `&select=apartment_id`)).map(b => String(b.apartment_id))
  );

  /* Host standing, checked here too. The RPC filters on it; this path
     did not, so on the one day the RPC is unavailable we would have
     been routing stranded guests into the listings of hosts we had
     suspended — which is precisely the day it matters most. */
  const hostIds = [...new Set(pool.map(l => l.host_id).filter(Boolean))];
  const barred = new Set();
  if (hostIds.length) {
    const profiles = await select('profiles',
      `id=in.(${hostIds.join(',')})&select=id,host_status,banned,suspended_until`).catch(() => []);
    const now = Date.now();
    for (const p of profiles) {
      if (p.banned || (p.host_status && p.host_status !== 'active')
          || (p.suspended_until && new Date(p.suspended_until).getTime() > now)) {
        barred.add(p.id);
      }
    }
  }

  const need = Number(booking.num_guests || 1);
  const asNum = (v) => (/^\d+(\.\d+)?$/.test(String(v ?? '')) ? Number(v) : null);
  const srcBeds = asNum(src.beds);

  const candidates = pool
    /* Never re-home a guest into the SAME host's other listing. That host
       just told us they can't honour this stay — or was found at fault on
       it. Routing the guest back to them lets them collect the rehoming
       commission by shuffling their own inventory, and when the problem is
       the host rather than the unit it is a safety question, not an
       accounting one. */
    .filter(l => !busy.has(String(l.id))
              && l.host_id !== booking.host_id
              && !barred.has(l.host_id))
    .map(l => ({ l, cap: asNum(l.max_guests), beds: asNum(l.beds) }))
    .filter(x => x.cap != null && x.cap >= need)
    .map(({ l, cap, beds }) => {
      const price = 35 * Math.max(0, 1 - Math.abs(num(l.price_night) - srcPrice) / (srcPrice || 1));
      const loc   = 25 * (l.city === src.city ? 1 : 0.35);
      const capS  = 15 * Math.max(0, 1 - (cap - need) / 6);
      const type  = 13 * (l.property_type === src.property_type ? 1 : 0);
      const bedS  = 7  * (srcBeds == null || beds == null ? 0.5
                          : Math.max(0, 1 - Math.abs(beds - srcBeds) / 4));
      const qual  = 5  * ((num(l.internal_score) || 50) / 100);
      return {
        listing_id: String(l.id), title: l.title, location: l.location, city: l.city,
        price_night: num(l.price_night), beds: l.beds, max_guests: l.max_guests,
        property_type: l.property_type, photos: l.photos, internal_score: l.internal_score,
        host_id: l.host_id, lat: l.lat, lng: l.lng,
        /* The guest is shown "1.4 km away" on every row the RPC
           produces; a fallback that omits it silently drops the one
           piece of information they are most likely to decide on. */
        distance_km: haversineKm(src.lat, src.lng, l.lat, l.lng),
        price_delta: Number((num(l.price_night) - srcPrice).toFixed(2)),
        score: Number((price + loc + capS + type + bedS + qual).toFixed(2)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { candidates, band: widest, source: 'fallback' };
}

/* ══════════════════════════════════════════════════════════════
   WHOSE FAULT IS THIS?
   ──────────────────────────────────────────────────────────────
   Decided from the record, never from what the guest typed. Each
   test below is something a third party did or that we can see in
   our own data — a cancellation, a suspension, an adjudicated
   issue, a listing pulled down. The guest's words are carried
   along for ops to read; they do not move a shilling.
══════════════════════════════════════════════════════════════ */
async function determineFault(bk) {
  const evidence = [];

  /* 1 · The host already said they could not host — through the front
         door, or by having the door slammed on them at the gate. */
  const priorOffers = await select('match_offers',
    `booking_id=eq.${bk.id}&initiated_by=eq.host&select=status,block_reason,created_at&limit=5`)
    .catch(() => []);
  if (priorOffers.length) {
    evidence.push('host_opened_match:' + priorOffers.map(o => o.status).join('/'));
    return { fault: 'host', evidence };
  }

  /* 2 · An adjudicated check-in issue on this booking, found against
         the host. This is the strongest signal we have, because a
         human or the adjudicator has already weighed it. */
  const issues = await select('checkin_issues',
    `booking_id=eq.${bk.id}&fault=eq.host&select=id,status,issue_code&limit=3`).catch(() => []);
  if (issues.length) {
    evidence.push('checkin_issue_host_fault:' + issues.map(i => i.issue_code).join(','));
    return { fault: 'host', evidence };
  }

  /* 3 · The booking itself carries a host-side cancellation. */
  const reason = String(bk.cancel_reason || '');
  if (bk.cancelled_at && /^host|host_/.test(reason)) {
    evidence.push('cancel_reason:' + reason);
    return { fault: 'host', evidence };
  }

  /* 4 · The host is suspended or banned. Whatever they did, they are
         not receiving this guest. */
  const host = bk.host_id
    ? await one('profiles', `id=eq.${bk.host_id}&select=host_status,banned,suspended_until`).catch(() => null)
    : null;
  if (host && (host.banned || host.host_status === 'suspended'
      || (host.suspended_until && new Date(host.suspended_until) > new Date()))) {
    evidence.push('host_standing:' + (host.banned ? 'banned' : host.host_status || 'suspended'));
    return { fault: 'host', evidence };
  }

  /* 5 · The listing is gone or has been taken down since they booked.
         If we removed it, that is ours; if the host did, that is theirs.
         We cannot always tell them apart, so we take it as ours — the
         guest is made whole either way and no host is carded on a
         guess. */
  const listing = await one('listings', `id=eq.${bk.apartment_id}&select=id,status`).catch(() => null);
  if (!listing) {
    evidence.push('listing_deleted');
    return { fault: 'platform', evidence };
  }
  if (listing.status !== 'active') {
    evidence.push('listing_status:' + listing.status);
    return { fault: 'platform', evidence };
  }

  return { fault: 'guest_choice', evidence };
}

/* Terms, derived from fault. One place, so the accept path and the
   request path can never disagree about who pays. */
function termsFor(fault) {
  const blameless = fault === 'host' || fault === 'platform';
  return {
    fault,
    blameless,
    /* Can we show them somewhere dearer? Only if we are paying for it. */
    capAtOriginalPrice: !blameless,
    /* Does the origin host earn the finder's fee? Only when they found
       it: they opened the door themselves. */
    commissionEligible: false,
    /* Who eats a price rise. */
    absorbIncrease: blameless,
    priceRule: blameless
      ? 'same_dates_same_price'
      : 'at_or_below_original_price',
  };
}

/* ══════════════════════════════════════════════════════════════
   THE BROADCAST
   ──────────────────────────────────────────────────────────────
   Every host on the shortlist hears about it. Not a request to
   approve — availability was already checked against their calendar
   — but a heads-up, so the room is not quietly given away while the
   guest is deciding, and so a message from that guest is answered
   fast. Deduplicated by host: a host with three listings on the
   shortlist gets one message, not three.
══════════════════════════════════════════════════════════════ */
async function broadcast(offer, candidates, bk, { fault }) {
  const byHost = new Map();
  for (const c of candidates) {
    if (!c.host_id) continue;
    if (!byHost.has(c.host_id)) byHost.set(c.host_id, []);
    byHost.get(c.host_id).push(c);
  }

  const nights = num(bk.nights) || 1;
  let sent = 0;

  for (const [hostId, listings] of byHost) {
    const names = listings.map(l => l.title).filter(Boolean);
    const which = names.length === 1 ? names[0]
      : `${names.length} of your listings`;
    try {
      await notify(hostId, 'match_broadcast',
        'A matched guest is looking at your place',
        `${bk.guest_name || 'A guest'} needs ${nights} night${nights === 1 ? '' : 's'} from ` +
        `${bk.checkin_date} for ${bk.num_guests || 1} guest${(bk.num_guests || 1) === 1 ? '' : 's'}, ` +
        `and ${which} came up as one of their closest matches. ` +
        `Nothing to accept — if they choose you, it books itself. Keep those dates free and ` +
        `answer quickly if they message.`,
        { offer_id: offer.id, booking_id: bk.id, fault,
          listing_ids: listings.map(l => l.listing_id) });
      sent++;
    } catch (e) { console.warn('[rehome] broadcast:', hostId, e.message); }
  }

  try {
    await update('match_offers', `id=eq.${offer.id}`,
      { broadcast_count: sent, broadcast_at: new Date().toISOString() });
  } catch (e) { /* the shortlist is what matters; the counter is bookkeeping */ }

  return sent;
}

/* Ops alerts go to a table, not to notify(). notifications.user_id is
   NOT NULL, so every notify(null, 'ops_alert', …) in this codebase has
   been a silent no-op — including the ones meant to say "a guest may be
   stranded, look now". */
async function alertOps(kind, title, body, meta = {}, severity = 'warn') {
  try { await insert('ops_alerts', { kind, severity, title, body, meta }, false); }
  catch (e) { console.warn('[ops_alert]', kind, e.message); }
}

/* Everything the replacement booking must inherit so the guest is not
   silently un-paid the moment they are moved.

   This is the bug that made rehoming quietly useless: the replacement
   row was built without amount_paid, so it defaulted to 0. The guest
   had paid in full, been moved, and then found their check-in code
   locked behind "unlocks the moment this booking is paid in full" —
   at a door, in another neighbourhood, at night. */
function carryOver(bk, { stayTotal, grandTotal, reference }) {
  return {
    guest_id:        bk.guest_id,
    checkin_date:    bk.checkin_date,
    checkout_date:   bk.checkout_date,
    nights:          num(bk.nights) || 1,
    num_guests:      bk.num_guests,
    guest_name:      bk.guest_name,
    guest_phone:     bk.guest_phone,
    contact_phone:   bk.contact_phone,
    contact_email:   bk.contact_email,
    contact_whatsapp: bk.contact_whatsapp,
    stay_total:      stayTotal,
    service_fee:     num(bk.service_fee),
    grand_total:     grandTotal,
    payment_mode:    bk.payment_mode,
    deposit_amount:  bk.deposit_amount,
    balance_amount:  bk.balance_amount,
    balance_paid:    bk.balance_paid,
    /* The money already collected moves with the guest. */
    amount_paid:     amountPaid(bk),
    fully_paid_at:   bk.fully_paid_at,
    credit_applied:  bk.credit_applied,
    payment_reference: reference,
    guest_code:      bk.guest_code,
    host_code:       'HOST-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    status:          bk.status,
    rehomed_from:    bk.id,
    /* So a referral commission survives the move. Without this, a
       replacement booking's own payment_reference (REHOME-.../
       RESCUE-...) matches no referral_earnings row, and releaseOnCheckIn
       has nothing to release when this guest finally checks in — the
       referrer who brought them to Cabana in the first place is quietly
       paid nothing for a stay that did, in the end, happen. */
    referral_root_ref: referralRootRef(bk),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await whoami(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { action, booking_id, offer_id, listing_id, reason } = req.body || {};

  try {
    /* ══ ELIGIBILITY ═══════════════════════════════════════════════
       What the guest's own screen asks before it draws the button, so
       a guest is never shown a door that will not open. It reveals
       nothing they cannot already see about their own booking.      */
    if (action === 'eligibility') {
      const bk = await one('apartment_bookings', `id=eq.${booking_id}&select=*`);
      if (!bk) return res.status(404).json({ error: 'booking_not_found' });
      if (bk.guest_id !== user.id) return res.status(403).json({ error: 'not_your_booking' });

      const listingMeta = await one('listings', `id=eq.${bk.apartment_id}&select=checkin_time`).catch(() => null);
      const hours = hoursToCheckin(bk.checkin_date, listingMeta?.checkin_time || null);
      const { fault } = await determineFault(bk);
      const terms = termsFor(fault);
      const used = (await select('match_offers',
        `booking_id=eq.${bk.id}&initiated_by=eq.guest&select=id`).catch(() => [])).length;
      const open = (await select('match_offers',
        `booking_id=eq.${bk.id}&status=eq.offered&select=id`).catch(() => [])).length;

      const paid = amountPaid(bk);
      let can = true, why = 'ok';
      if (bk.cancelled_at)               { can = false; why = 'cancelled'; }
      else if (bk.status === 'rehomed')  { can = false; why = 'already_rehomed'; }
      else if (bk.status === 'checked_in') { can = false; why = 'already_checked_in'; }
      else if (paid <= 0)                { can = false; why = 'nothing_paid'; }
      else if (open > 0)                 { can = false; why = 'offer_already_open'; }
      else if (!terms.blameless && used >= GUEST_REQUEST_LIMIT) { can = false; why = 'request_limit_reached'; }
      else if (!terms.blameless && (hours == null || hours < GUEST_REQUEST_MIN_HRS)) {
        can = false; why = 'too_close_to_checkin';
      }

      return res.status(200).json({
        can_request: can, reason: why, fault, hours,
        requests_used: used, requests_allowed: terms.blameless ? null : GUEST_REQUEST_LIMIT,
        price_rule: terms.priceRule, blameless: terms.blameless,
      });
    }

    /* ══ DOOR 1 · HOST OFFERS ══════════════════════════════════════
       Two shapes, one gate. 'offer' sweeps the inventory for them.
       'offer-direct' is a host who already knows where the guest should
       go — their own other property, a friend's, anyone's — and skips
       straight to it. Both are subject to the identical 24-hour law,
       the identical one-open-offer rule, and both write through the
       server, never the browser: see the migration note on why. */
    if (action === 'offer' || action === 'offer-direct') {
      const bk = await one('apartment_bookings', `id=eq.${booking_id}&select=*`);
      if (!bk) return res.status(404).json({ error: 'booking_not_found' });
      if (bk.host_id !== user.id) return res.status(403).json({ error: 'not_your_booking' });
      if (bk.cancelled_at)        return res.status(409).json({ error: 'already_cancelled' });
      if (bk.status === 'checked_in') return res.status(409).json({ error: 'already_checked_in' });
      if (bk.status === 'rehomed')    return res.status(409).json({ error: 'already_rehomed' });

      /* One open offer at a time. Two live shortlists on one booking is
         two guests' worth of held rooms and two ways to accept. */
      const open = await select('match_offers',
        `booking_id=eq.${bk.id}&status=eq.offered&select=id&limit=1`).catch(() => []);
      if (open.length) return res.status(409).json({ error: 'offer_already_open', offer_id: open[0].id });

      const listingMeta = await one('listings', `id=eq.${bk.apartment_id}&select=checkin_time`).catch(() => null);
      const h = hoursToCheckin(bk.checkin_date, listingMeta?.checkin_time || null);

      // The gate. Recomputed here, on our clock, not theirs.
      if (h == null || h < 24) {
        await insert('match_offers', {
          booking_id, origin_host_id: bk.host_id, origin_listing_id: bk.apartment_id,
          guest_id: bk.guest_id, status: 'blocked', block_reason: 'within_24h',
          hours_to_checkin: h, candidates: [], initiated_by: 'host', fault: 'host',
          share_mode: action === 'offer-direct' ? 'direct' : 'sweep',
        }, false);
        return res.status(403).json({
          blocked: true, reason: 'within_24h', hours: h,
          message: 'Check-in is under 24 hours away. Matching is closed. ' +
                   'Cancelling now refunds your guest in full. Our team will review the situation.',
        });
      }

      /* ── 'offer-direct': one listing, chosen by the host ────────── */
      if (action === 'offer-direct') {
        if (!listing_id) return res.status(400).json({ error: 'listing_id_required' });
        if (String(listing_id) === String(bk.apartment_id)) {
          return res.status(400).json({ error: 'same_listing' });
        }

        /* Re-read from the database. Never trust a price, a capacity or
           a host_id the request handed us — the same rule that governs
           every candidate the sweep itself produces. */
        const target = await one('listings', `id=eq.${listing_id}&select=*`);
        if (!target || target.status !== 'active') {
          return res.status(409).json({ error: 'listing_unavailable' });
        }
        const cap = Number(target.max_guests);
        if (Number.isFinite(cap) && cap < Number(bk.num_guests || 1)) {
          return res.status(409).json({ error: 'listing_too_small' });
        }
        const clash = await select('apartment_bookings',
          `apartment_id=eq.${listing_id}&cancelled_at=is.null` +
          `&status=in.(${LIVE_STATUSES.join(',')})` +
          `&checkin_date=lt.${bk.checkout_date}&checkout_date=gt.${bk.checkin_date}` +
          `&select=id&limit=1`);
        if (clash.length) return res.status(409).json({ error: 'listing_unavailable' });

        const cand = {
          listing_id: String(target.id), title: target.title, location: target.location,
          city: target.city, price_night: num(target.price_night), beds: target.beds,
          max_guests: target.max_guests, property_type: target.property_type,
          photos: target.photos, internal_score: target.internal_score,
          host_id: target.host_id, lat: target.lat, lng: target.lng,
          price_delta: Number((num(target.price_night) - num(bk.stay_total) / (num(bk.nights) || 1)).toFixed(2)),
          score: 100,
        };

        /* The one rule this door does not inherit from the sweep: a
           host MAY point at their own other property here — that is
           the whole feature. What it does not get is a fee for doing
           it. Paying a finder's fee for a host moving a guest between
           two rooms they already own is exactly the "collect commission
           by shuffling your own inventory" loophole the sweep exists to
           close, so direct-sharing your own listing is a real, useful
           convenience with no money attached; sharing someone else's —
           a friend's, anyone's — earns the same 10% as a sweep match. */
        const sameHost = String(target.host_id) === String(bk.host_id);
        const fee = num(bk.service_fee);
        const commission = sameHost ? 0 : Math.round(fee * COMMISSION_RATE * 100) / 100;

        const offer = await insert('match_offers', {
          booking_id,
          origin_host_id: bk.host_id,
          origin_listing_id: bk.apartment_id,
          guest_id: bk.guest_id,
          candidates: [cand],
          hours_to_checkin: Number(h.toFixed(2)),
          service_fee: fee,
          host_commission: commission,
          status: 'offered',
          initiated_by: 'host',
          fault: 'host',
          share_mode: 'direct',
          request_reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
          expires_at: new Date(Date.now() + OFFER_TTL_HOURS * 3600000).toISOString(),
        });

        await notify(bk.guest_id, 'match_offer',
          'Your host has proposed an alternative',
          `Your host has pointed us to a specific place for your dates. Take a look, or take a ` +
          `full refund — either way you decide.`,
          { booking_id, offer_id: offer.id });

        const reached = sameHost ? 0 : await broadcast(offer, [cand], bk, { fault: 'host' });

        return res.status(200).json({
          blocked: false, offer, candidates: [cand], commission,
          same_host: sameHost, hosts_notified: reached,
        });
      }

      /* ── 'offer': the automatic sweep ────────────────────────────── */
      const { candidates: cands, band } = await sweep(bk, { limit: WANT_CANDIDATES });
      if (!cands.length) {
        await alertOps('rehome_no_candidates',
          'A host cannot host and we have nothing to offer',
          'Match found no comparable listing at any price band. This guest needs a human.',
          { booking_id: bk.id, host_id: bk.host_id, guest_id: bk.guest_id }, 'critical');
        return res.status(200).json({ blocked: true, reason: 'no_comparable_listing', hours: h });
      }

      const fee = num(bk.service_fee);
      const commission = Math.round(fee * COMMISSION_RATE * 100) / 100;

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
        initiated_by: 'host',
        fault: 'host',
        share_mode: 'sweep',
        request_reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
        expires_at: new Date(Date.now() + OFFER_TTL_HOURS * 3600000).toISOString(),
      });

      await notify(bk.guest_id, 'match_offer',
        'Your host has proposed an alternative',
        `We found ${cands.length} comparable ${cands.length === 1 ? 'stay' : 'stays'} for your dates. ` +
        `Choose one, or take a full refund, either way you decide.`,
        { booking_id, offer_id: offer.id });

      const reached = await broadcast(offer, cands, bk, { fault: 'host' });

      return res.status(200).json({
        blocked: false, offer, candidates: cands, commission,
        band, hosts_notified: reached,
      });
    }

    /* ══ DOOR 2 · THE GUEST ASKS ═══════════════════════════════════ */
    if (action === 'guest-request') {
      const bk = await one('apartment_bookings', `id=eq.${booking_id}&select=*`);
      if (!bk) return res.status(404).json({ error: 'booking_not_found' });
      if (bk.guest_id !== user.id)    return res.status(403).json({ error: 'not_your_booking' });
      if (bk.cancelled_at)            return res.status(409).json({ error: 'already_cancelled' });
      if (bk.status === 'rehomed')    return res.status(409).json({ error: 'already_rehomed' });
      if (bk.status === 'checked_in') return res.status(409).json({ error: 'already_checked_in' });

      /* Money must have moved. Rehoming protects a paid booking; it is
         not a browsing tool attached to an unpaid one. */
      const paid = amountPaid(bk);
      if (paid <= 0) return res.status(409).json({ error: 'nothing_paid' });

      const open = await select('match_offers',
        `booking_id=eq.${bk.id}&status=eq.offered&select=id,expires_at&limit=1`).catch(() => []);
      if (open.length) {
        return res.status(409).json({ error: 'offer_already_open', offer_id: open[0].id });
      }

      const { fault, evidence } = await determineFault(bk);
      const terms = termsFor(fault);

      const usedRows = await select('match_offers',
        `booking_id=eq.${bk.id}&initiated_by=eq.guest&select=id`).catch(() => []);
      const listingMeta = await one('listings', `id=eq.${bk.apartment_id}&select=checkin_time`).catch(() => null);
      const h = hoursToCheckin(bk.checkin_date, listingMeta?.checkin_time || null);

      /* The bounds, and only for a move the guest chose. Someone we
         failed is moved as many times as it takes, at any hour. */
      if (!terms.blameless) {
        if (usedRows.length >= GUEST_REQUEST_LIMIT) {
          return res.status(429).json({
            error: 'request_limit_reached', used: usedRows.length, allowed: GUEST_REQUEST_LIMIT,
            message: `You've already asked to move this booking ${usedRows.length} times. ` +
                     `Talk to us and we'll sort it properly.`,
          });
        }
        if (h == null || h < GUEST_REQUEST_MIN_HRS) {
          return res.status(403).json({
            error: 'too_close_to_checkin', hours: h,
            message: 'Check-in is under 24 hours away, so this is no longer a change of plan — ' +
                     "it's an arrival problem. Use \"There's an issue\" and we'll deal with it now.",
          });
        }
      }

      const { candidates: cands, band } = await sweep(bk, {
        limit: WANT_CANDIDATES,
        capAtOriginalPrice: terms.capAtOriginalPrice,
      });

      if (!cands.length) {
        /* Never a dead end. A blameless guest with nowhere to go is an
           incident; a guest moving by choice is simply told no, kindly. */
        if (terms.blameless) {
          await alertOps('rehome_no_candidates',
            'A guest needs moving and we have nothing to offer',
            'The sweep found no available comparable listing at any band, and this guest is not at ' +
            'fault. They need a human and probably a refund.',
            { booking_id: bk.id, guest_id: bk.guest_id, fault, evidence }, 'critical');
          await notify(bk.guest_id, 'match_searching',
            'We\'re on it',
            'We couldn\'t find a comparable home for your dates automatically, so a person is ' +
            'looking now. You will hear from us today, and your money is untouched.',
            { booking_id: bk.id });
        }
        return res.status(200).json({
          ok: true, found: 0, fault, blameless: terms.blameless,
          reason: 'no_comparable_listing',
          message: terms.blameless
            ? 'Nothing comparable is free for those dates. A person is on it now — you will hear from us today.'
            : 'Nothing comparable is free for your dates at or below what you paid. Your booking is unchanged.',
        });
      }

      const offer = await insert('match_offers', {
        booking_id: bk.id,
        origin_host_id: bk.host_id,
        origin_listing_id: bk.apartment_id,
        guest_id: bk.guest_id,
        candidates: cands,
        hours_to_checkin: h == null ? null : Number(h.toFixed(2)),
        service_fee: num(bk.service_fee),
        /* The origin host earns nothing on a door they did not open. */
        host_commission: 0,
        status: 'offered',
        initiated_by: 'guest',
        fault,
        request_reason: typeof reason === 'string' ? reason.slice(0, 500) : null,
        expires_at: new Date(Date.now() + OFFER_TTL_HOURS * 3600000).toISOString(),
      });

      const reached = await broadcast(offer, cands, bk, { fault });

      /* The origin host is told, in neutral terms, that their guest is
         moving. No accusation — fault here is a record, not a verdict,
         and cards are issued by the adjudicator, not by this file. */
      if (bk.host_id) {
        await notify(bk.host_id, 'booking_update', 'Your guest has asked to be moved',
          'A guest on one of your bookings has asked us to find them an alternative. ' +
          'Nothing has changed yet. If they move, you will be told and our team will follow up.',
          { booking_id: bk.id });
      }

      if (terms.blameless) {
        await alertOps('rehome_guest_request',
          'Guest asked to be rehomed (not their fault)',
          `Fault read as "${fault}". ${cands.length} candidates offered, ${reached} hosts notified. ` +
          `Evidence: ${evidence.join('; ') || 'none recorded'}.`,
          { booking_id: bk.id, offer_id: offer.id, guest_id: bk.guest_id, fault, evidence }, 'warn');
      }

      return res.status(200).json({
        ok: true, found: cands.length, offer, candidates: cands, band,
        fault, blameless: terms.blameless, price_rule: terms.priceRule,
        hosts_notified: reached,
        expires_at: offer.expires_at,
      });
    }

    /* ══ ACCEPT ════════════════════════════════════════════════════ */
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
      if (!bk) return res.status(404).json({ error: 'booking_not_found' });
      if (bk.status === 'rehomed' || bk.cancelled_at) {
        return res.status(409).json({ error: 'booking_already_resolved' });
      }

      /* The listing is re-read from the database, never from the offer
         row. `chosen` tells us WHICH listing the guest picked; every
         number that follows comes from the listing itself. This is the
         line that made the old browser-written offer harmless. */
      const listing = await one('listings', `id=eq.${listing_id}&select=*`);
      if (!listing || listing.status !== 'active') {
        return res.status(409).json({ error: 'listing_unavailable' });
      }
      if (listing.host_id === bk.host_id && offer.share_mode !== 'direct') {
        /* Belt and braces: the sweep excludes the origin host, but an
           offer written before that rule existed might not. A DIRECT
           share is the one deliberate exception — a host pointing at
           their own other property is the feature, not the loophole;
           see offer-direct above for why it simply earns no commission
           rather than being blocked outright. */
        return res.status(409).json({ error: 'same_host_not_allowed' });
      }

      /* Candidates were ranked up to OFFER_TTL_HOURS ago. Someone else
         may have booked this exact listing for these exact dates in
         the meantime — re-check right before we commit, or two guests
         land on the same bed. */
      const clash = await select('apartment_bookings',
        `apartment_id=eq.${listing_id}&cancelled_at=is.null` +
        `&status=in.(${LIVE_STATUSES.join(',')})` +
        `&checkin_date=lt.${bk.checkout_date}&checkout_date=gt.${bk.checkin_date}` +
        `&select=id&limit=1`);
      if (clash.length) return res.status(409).json({ error: 'listing_no_longer_available' });

      const initiatedBy = offer.initiated_by || 'host';
      const terms = termsFor(initiatedBy === 'host' ? 'host' : (offer.fault || 'guest_choice'));

      const nights   = num(bk.nights) || 1;
      const newStay  = num(listing.price_night) * nights;
      const oldStay  = num(bk.stay_total);
      const delta    = newStay - oldStay;

      /* A guest moving by choice may only go sideways or down. The
         sweep already filtered for it; this is the second lock, on the
         path where money is actually written. */
      if (!terms.blameless && delta > 0) {
        return res.status(409).json({
          error: 'costs_more_than_original',
          message: 'That home costs more than the one you booked. We can only move you to ' +
                   'somewhere at or below what you have already paid.',
        });
      }

      /* Blameless: the guest pays exactly what they agreed. A rise is
         ours; a fall is theirs to keep.
         By choice: they carry their own price down, and the difference
         comes back to them. */
      const absorbed  = terms.absorbIncrease && delta > 0 ? delta : 0;
      const refundDue = delta < 0 ? Math.abs(delta) : 0;

      const stayTotal  = terms.blameless ? oldStay : newStay;
      const grandTotal = terms.blameless ? num(bk.grand_total) : newStay + num(bk.service_fee);

      const replacement = await insert('apartment_bookings', Object.assign(
        carryOver(bk, {
          stayTotal, grandTotal,
          reference: `REHOME-${bk.payment_reference || bk.id}`,
        }),
        {
          host_id:        listing.host_id,
          apartment_id:   String(listing.id),
          apartment_name: listing.title,
          listing_name:   listing.title,
          location:       listing.location,
          /* What we still owe them back, carried on the row so it is
             visible to the guest, to ops and to the refund sweeper —
             rather than only stated in a notification nobody can act on. */
          refund_due:     refundDue || null,
        }));

      await update('apartment_bookings', `id=eq.${bk.id}`, {
        status: 'rehomed',
        cancelled_at: new Date().toISOString(),
        cancel_reason: initiatedBy === 'guest'
          ? `guest_rehome:${offer.fault || 'guest_choice'}`
          : 'host_could_not_host_matched',
        rehomed_to: replacement.id,
      });

      /* Commission is read from the OFFER, not recomputed here — and
         that is now safe, because the offer itself was written entirely
         server-side (see offer / offer-direct above), never by a
         browser. It is 10% of the fee ON THE ORIGINAL BOOKING, and it
         is zero whenever the guest asked to be moved themselves (they
         did not solve anything) or a host directly shared one of their
         OWN other properties (see offer-direct for why that is a
         convenience, not a finder's fee).

         ── Held, not paid ──────────────────────────────────────────
         This used to debit platform_float the instant the guest
         accepted. That paid a commission on a stay that had not
         happened yet — the guest could still be turned away at THIS
         door too, or simply never show up. The commission is now
         recorded as 'pending_checkin' in the same ledger the ordinary
         referral programme uses (referral_earnings, referral_type
         'rehome'), and is only released — actually payable, actually
         counted — the moment this exact replacement booking reaches
         checked_in (api/lib/_verify-checkin.js). If it is cancelled
         first, it is void and this host is paid nothing for a stay
         nobody had. */
      const commission = initiatedBy === 'host' ? num(offer.host_commission) : 0;

      await update('match_offers', `id=eq.${offer_id}`, {
        status: 'accepted',
        chosen_listing_id: String(listing_id),
        replacement_booking_id: replacement.id,
        price_delta: delta,
        host_commission: commission,
        commission_paid: false,
        platform_absorbs: absorbed,
        guest_pays_delta: 0,
        resolved_at: new Date().toISOString(),
      });

      if (commission > 0) {
        await pendingCommission({
          referrerId: offer.origin_host_id, referredId: bk.guest_id,
          serviceType: 'stays', grossAmount: stayTotal, platformFee: num(bk.service_fee),
          commissionRate: COMMISSION_RATE, commissionKes: commission,
          referrerTier: 'host', referralType: 'rehome',
          bookingRef: replacement.payment_reference,
        });
      }

      // Ledger: any price gap we absorbed is real and immediate, unlike
      // commission — the platform's cost lands the moment we take it on,
      // whether or not the guest ever checks in.
      if (absorbed > 0) {
        await insert('platform_float', {
          direction: 'debit', amount: absorbed, purpose: 'match_price_gap',
          ref_type: 'match_offer', ref_id: offer_id,
        }, false).catch(() => {});
      }
      if (refundDue > 0) {
        /* A refund promised in a notification and written nowhere is a
           refund that does not happen. */
        await alertOps('rehome_refund_due',
          'Refund owed on a rehomed booking',
          `${money(refundDue)} back to the guest: they moved to a cheaper home. ` +
          `Carried on booking ${replacement.id} as refund_due.`,
          { booking_id: replacement.id, guest_id: bk.guest_id, amount: refundDue,
            offer_id }, 'warn');
      }

      if (commission > 0) {
        await notify(offer.origin_host_id, 'match_accepted',
          'Your guest accepted the alternative',
          `You'll earn ${money(commission)}, 10% of our service fee, once they've paid in full ` +
          `and checked in. No card either way.`,
          { offer_id, commission });
      } else if (offer.origin_host_id) {
        await notify(offer.origin_host_id, 'booking_update',
          'Your guest has moved',
          'The guest on this booking has been rehomed. Our team will follow up if anything is needed from you.',
          { offer_id, booking_id: bk.id });
      }

      await notify(listing.host_id, 'match_incoming',
        'New booking via Match',
        `${bk.guest_name || 'A guest'} was matched to ${listing.title} for ${bk.checkin_date}.`,
        { booking_id: replacement.id });

      await notify(bk.guest_id, 'match_confirmed',
        'You\'re moved',
        `${listing.title} is yours for the same dates` +
        (terms.blameless ? ' at the same price' : '') +
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

    /* ══ DECLINE ═══════════════════════════════════════════════════
       "No thanks" means different things through the two doors, and
       conflating them is how a guest who was browsing ends up with
       their paid booking cancelled.

       Host-initiated: the host cannot host. Declining is declining the
       whole stay, and it is a full refund.

       Guest-initiated: they asked to look, and they did not like what
       they saw. Their original booking is untouched — we simply close
       the shortlist and release the held rooms.                       */
    if (action === 'decline') {
      const offer = await one('match_offers', `id=eq.${offer_id}&select=*`);
      if (!offer)                     return res.status(404).json({ error: 'offer_not_found' });
      if (offer.guest_id !== user.id) return res.status(403).json({ error: 'not_your_offer' });
      if (offer.status !== 'offered') return res.status(409).json({ error: `offer_${offer.status}` });

      const bk = await one('apartment_bookings', `id=eq.${offer.booking_id}&select=*`);

      if ((offer.initiated_by || 'host') === 'guest') {
        await update('match_offers', `id=eq.${offer_id}`, {
          status: 'declined', commission_paid: false, resolved_at: new Date().toISOString(),
        });
        /* Release the hold. The hosts we alerted deserve to know the
           room is theirs again, or the broadcast becomes noise they
           learn to ignore — and the next one will not be acted on. */
        const told = new Set();
        for (const c of (offer.candidates || [])) {
          if (!c.host_id || told.has(c.host_id)) continue;
          told.add(c.host_id);
          await notify(c.host_id, 'match_broadcast_closed',
            'That matched guest has decided',
            'The guest we told you about has stayed where they were. Nothing further is needed, ' +
            'and your dates were never held against you.',
            { offer_id: offer.id });
        }

        return res.status(200).json({
          ok: true, refunded: false, booking_unchanged: true,
          message: 'Closed. Your original booking is exactly as it was.',
        });
      }

      const settle = await rpc('compute_settlement', { p_booking: bk.id, p_fault: 'host' })
        .catch(() => ({ refund_amount: amountPaid(bk) }));

      await update('apartment_bookings', `id=eq.${bk.id}`, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'guest_declined_match',
        refund_amount: settle.refund_amount,
        refund_due: settle.refund_amount,
      });

      /* The stay is over, for good — nobody is going anywhere. Whatever
         referral commission was riding on this guest's chain never
         becomes real. */
      await voidOnNoShow(bk, 'guest_declined_match');

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
   passed, an unanswered HOST offer is treated exactly like a
   decline: the guest is made whole, in full, without asking.

   A guest-initiated shortlist that lapses is not that. Nobody said
   they could not stay; the guest looked and did not choose. It
   closes quietly and their booking stands.
══════════════════════════════════════════════════════════════ */
export async function expireStaleMatchOffers() {
  const stale = await select('match_offers',
    `status=eq.offered&expires_at=lt.${new Date().toISOString()}&select=*&limit=200`);

  const results = [];
  for (const offer of stale) {
    try {
      if ((offer.initiated_by || 'host') === 'guest') {
        await update('match_offers', `id=eq.${offer.id}`,
          { status: 'expired', resolved_at: new Date().toISOString() });
        results.push({ offer_id: offer.id, outcome: 'closed_guest_request' });
        continue;
      }

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
        .catch(() => ({ refund_amount: amountPaid(bk) }));

      await update('apartment_bookings', `id=eq.${bk.id}`, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'match_offer_unanswered',
        refund_amount: settle.refund_amount,
        refund_due: settle.refund_amount,
      });

      await voidOnNoShow(bk, 'match_offer_unanswered');

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
        await alertOps('match_offer_expired_near_checkin',
          'Match offer expired unresolved near check-in',
          `Offer ${offer.id} on booking ${bk.id} expired with the guest unresponsive and check-in ` +
          `close by. Refunded automatically — confirm the guest is actually taken care of.`,
          { offer_id: offer.id, booking_id: bk.id }, 'critical');
      }

      results.push({ offer_id: offer.id, outcome: 'auto_refunded', refund_amount: settle.refund_amount });
    } catch (e) {
      console.error('[expire-match-offers]', offer.id, e);
      results.push({ offer_id: offer.id, outcome: 'error', error: e.message });
    }
  }

  return { scanned: stale.length, results };
}
