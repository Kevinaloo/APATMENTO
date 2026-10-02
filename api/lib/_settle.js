/* ══════════════════════════════════════════════════════════════════════
   CABANA · ONE SETTLEMENT VERDICT
   api/lib/_settle.js

   Three paths learn that money landed: the browser's poll, the Vercel
   callback and the Supabase edge callback. Each used to derive a booking
   status from the money alone and PATCH it onto the row, which is how a
   tour or event could be painted 'paid' while its seats were never taken
   off sale, and how a car hire or a Rooms pass would have been given a
   stay's status.

   Now the database decides. A paid ledger row fires the settlement
   trigger for its table; these helpers only ask the database what it
   decided and report it, so every path tells the guest the same thing.

     self-settling   car hire facilitation, Rooms pass, driver remittance,
                     tours Spotlight: the trigger settles, we read the row
     settled by RPC  stays (incl. hotels and day passes), tours, events:
                     the settle function is idempotent and returns the
                     authoritative view (dates or seats held, lost, credit)
   ══════════════════════════════════════════════════════════════════════ */

export const SELF_SETTLING = new Set(['tour_spotlights', 'car_bookings', 'roommate_passes', 'ride_remittances']);

export const SETTLE_RPC = {
  apartment_bookings: 'cabana_settle_booking',
  tour_bookings:      'cabana_settle_tour',
  event_tickets:      'cabana_settle_event',
};

/* Every payable table, and the column its reference lives in. */
export const PAYABLE_TABLES = new Set([
  'apartment_bookings', 'tour_bookings', 'event_tickets',
  'tour_spotlights', 'car_bookings', 'roommate_passes', 'ride_remittances',
]);

async function readRow(supaUrl, H, table, bookingRef) {
  const r = await fetch(
    `${supaUrl}/rest/v1/${table}?payment_reference=eq.${encodeURIComponent(bookingRef)}&select=*&limit=1`,
    { headers: H() });
  return r.ok ? (await r.json())[0] || null : null;
}

async function paidSum(supaUrl, H, bookingRef) {
  const r = await fetch(
    `${supaUrl}/rest/v1/booking_payments?booking_ref=eq.${encodeURIComponent(bookingRef)}&status=eq.paid&select=amount`,
    { headers: H() });
  return (r.ok ? await r.json() : []).reduce((s, p) => s + Number(p.amount || 0), 0);
}

/* The state of a self-settling purchase, in the shape the payment sheet
   already understands. `fully_paid` is the only thing it acts on. */
export async function selfSettledView(supaUrl, H, table, bookingRef, extra = {}) {
  const [row, paid] = await Promise.all([readRow(supaUrl, H, table, bookingRef), paidSum(supaUrl, H, bookingRef)]);
  const total = Number(row?.grand_total || 0);
  const settled = total > 0 && paid >= total;
  const status = table === 'car_bookings'
    ? (row?.fee_paid_at || settled ? 'secured' : 'pending_payment')
    : (row?.status || (settled ? 'paid' : 'pending_payment'));
  return {
    kind: table,
    status,
    amount_paid: paid,
    grand_total: total,
    outstanding: Math.max(0, Math.round(total - paid)),
    deposit_required: total,
    percent_paid: total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0,
    confirmed: settled,
    fully_paid: settled,
    ...(table === 'tour_spotlights' ? { spotlight: true } : {}),
    ...(table === 'roommate_passes' ? { ends_at: row?.ends_at || null } : {}),
    ...(table === 'car_bookings' ? { car_ref: row?.ref || null } : {}),
    ...extra,
  };
}

/* Ask the database to settle (idempotent) and return its verdict.
   Returns null when the RPC is unavailable so callers can fall back. */
export async function settleByRpc(supaUrl, H, table, bookingRef) {
  const fn = SETTLE_RPC[table];
  if (!fn) return null;
  try {
    const r = await fetch(`${supaUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: H({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_booking_ref: bookingRef }),
    });
    if (!r.ok) return null;
    const v = await r.json();
    return v && v.ok !== false ? v : null;
  } catch {
    return null;
  }
}

/* The guest-facing summary of a settled booking: what the money bought. */
export function describeSettlement(v) {
  if (!v) return null;
  const lost = v.dates_lost === true || v.seats_lost === true;
  return {
    ...v,
    holds: v.holds_dates === true || v.holds_seats === true,
    lost,
  };
}
