/* ══════════════════════════════════════════════════════════════
   APATMENTO. PayHero Callback Receiver
   Vercel Serverless Function (api/stk-callback.js)
   Called at: /api/stk-callback
   PayHero POSTs here when guest completes/fails M-Pesa payment

   FIX (2025-08): supabaseUrl / serviceKey moved to top of try{}
   so BAL- handler can use them without a TDZ ReferenceError.
══════════════════════════════════════════════════════════════ */

import { deriveStatus, depositRequired } from './lib/_payment-rules.js';
import { constantTimeEqual, setCors } from './lib/_security.js';

function siteOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : 'https://cabana.africa';
}

export default async function handler(req, res) {
  setCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  /* ── Authenticate the callback ──────────────────────────────────────
     Without this, anyone who can guess a reference could POST
     {status:'SUCCESS', external_reference:'APT-…'} and mark a booking
     paid without paying. PayHero echoes back the exact callback_url we
     registered in stk-push, so a genuine callback carries this token
     and a forged one cannot.                                          */
  const expectedToken = process.env.PAYHERO_CALLBACK_TOKEN;
  if (!expectedToken) {
    console.error('[stk-callback] PAYHERO_CALLBACK_TOKEN unset. Refusing callbacks');
    return res.status(503).json({ error: 'callback_verification_unavailable' });
  }
  const supplied = (req.query && req.query.t) || req.headers['x-payhero-token'] || '';
  if (!constantTimeEqual(supplied, expectedToken)) {
    console.error('[stk-callback] REJECTED. Bad or missing token from',
                  req.headers['x-forwarded-for'] || 'unknown');
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const payload = req.body;
    console.log('PayHero callback received:', JSON.stringify(payload));

    // ── Normalise PayHero's response shape ──────────────────────────
    // PayHero sends: { status, external_reference, ... }
    // Some versions nest under response: { response: { ResultCode, ... } }
    const status            = payload.status   || payload.response?.ResultCode;
    const externalReference = payload.external_reference
                           || payload.response?.external_reference
                           || payload.CheckoutRequestID; // safety fallback
    const isSuccess         = status === 'SUCCESS' || status === 0 || status === '0';

    if (!externalReference) {
      console.warn('No external_reference in callback payload:', JSON.stringify(payload));
      return res.status(200).json({ received: true });
    }

    /* The old BAL-* path patched bookings directly and bypassed the
       server-authoritative instalment ledger. Keep acknowledging legacy
       provider retries, but never let them change booking state. */
    if (externalReference.startsWith('BAL-')) {
      return res.status(200).json({ received: true, type: 'retired_balance' });
    }

    // ── Declare Supabase creds at top of try{} ──────────────────────
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('[stk-callback] Supabase env vars missing');
      return res.status(200).json({ received: true, error: 'config_missing' });
    }

    /* ── Instalment ledger path ──────────────────────────────────────
       References ending -P<n> are individual instalments. Credit the
       ledger row, re-sum every successful payment, and let the shared
       rules module derive the booking status. Money accumulates: a
       guest may pay below the 25% deposit and the booking stays
       unconfirmed until the running total crosses it. The check-in code
       is only released at 100%.                                       */
    if (/-P\d+$/.test(externalReference)) {
      const settled = await creditInstalment({
        supabaseUrl, serviceKey, reference: externalReference,
        isSuccess, payload, origin: siteOrigin(req),
      });
      return res.status(200).json({ received: true, type: 'instalment', ...settled });
    }

    // ── Route by reference prefix (legacy / balance flows) ───────────
    let table = null;
    if (externalReference.startsWith('TOUR-'))   table = 'tour_bookings';
    if (externalReference.startsWith('EVENT-'))  table = 'event_tickets';
    if (externalReference.startsWith('APT-'))    table = 'apartment_bookings';

    // Payout callbacks, not a booking, nothing to update
    if (externalReference.startsWith('PAYOUT-')) {
      console.log('[stk-callback] Payout callback received. Ignoring');
      return res.status(200).json({ received: true, type: 'payout' });
    }

    if (!table) {
      console.warn('[stk-callback] Unrecognised reference prefix:', externalReference);
      return res.status(200).json({ received: true });
    }

    /* ── How much did this callback actually carry? ──────────────────
       This path used to set 'paid_pending_checkin' on ANY success,
       whatever the amount. A KES 10 push against a KES 2,300 stay came
       back SUCCESS and the booking was marked paid in full, which
       released the check-in code and, at check-in, the host's entire
       payout. The amount is right there in the payload; we read it and
       let the shared rules module decide the status. */
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}`
        + `?payment_reference=eq.${encodeURIComponent(externalReference)}&select=*&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const existing = bookingRes.ok ? (await bookingRes.json())[0] : null;

    const paidNow = Number(
      payload.amount ?? payload.Amount ?? payload.response?.Amount ?? 0
    ) || 0;
    const grandTotal = Number(existing?.grand_total || 0);
    /* No amount in the payload is not permission to assume the full
       total. Credit what we can prove and no more; if that leaves the
       booking short, the guest is shown a balance rather than a code. */
    const amountPaid = Math.max(Number(existing?.amount_paid || 0), paidNow);

    const newStatus = isSuccess
      ? deriveStatus(amountPaid, grandTotal)
      : 'failed';
    const fullySettled = isSuccess && newStatus === 'paid_pending_checkin';

    if (isSuccess && !paidNow) {
      console.warn('[stk-callback] no amount in payload for', externalReference,
                   '- crediting', amountPaid, 'of', grandTotal);
    }

    // ── Update booking status ────────────────────────────────────────
    /* `status=neq.<newStatus>` makes this idempotent: PayHero retries a
       callback until it gets a 200, and without this filter a second
       delivery would re-return the row and re-fire the rewards award,
       referral commission and agent attribution below. A repeat now
       updates 0 rows, so those side effects run exactly once. */
    const patch = { status: newStatus };
    if (isSuccess && table === 'apartment_bookings') {
      patch.amount_paid      = amountPaid;
      patch.deposit_required = depositRequired(grandTotal);
      patch.balance_amount   = Math.max(0, Math.round(grandTotal - amountPaid));
      patch.balance_paid     = fullySettled;
      if (fullySettled && !existing?.fully_paid_at) {
        patch.fully_paid_at = new Date().toISOString();
      }
    }

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${encodeURIComponent(externalReference)}`
        + `&status=neq.${encodeURIComponent(newStatus)}`,
      {
        method:  'PATCH',
        headers: {
          apikey:         serviceKey,
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer:         'return=representation',
        },
        body: JSON.stringify(patch),
      }
    );

    let rows = [];
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('[stk-callback] Supabase update failed:', errText);
    } else {
      try { rows = await updateRes.json(); } catch { /* empty body */ }
    }

    // ── Guest push notification ──────────────────────────────────────
    if (rows[0]?.guest_id) {
      const guestId = rows[0].guest_id;
      const origin  = siteOrigin(req);

      const serviceLabel = table === 'apartment_bookings' ? 'stay'
                         : table === 'tour_bookings'      ? 'tour'
                         : 'ticket';

      const outstanding = Math.max(0, Math.round(grandTotal - amountPaid));

      const notifPayload = isSuccess ? (fullySettled ? {
        title: 'Booking confirmed! 🎉',
        body:  `Your ${serviceLabel} is locked in. Your check-in code is ready.`,
        url:   '/my-bookings.html',
        kind:  'booking',
      } : {
        /* Promising a code we have not released is how a guest ends up
           at a door with nothing to show. Say what is still owed. */
        title: 'Payment received',
        body:  `KES ${amountPaid.toLocaleString()} received on your ${serviceLabel}. `
             + `KES ${outstanding.toLocaleString()} left to unlock your check-in code.`,
        url:   '/my-bookings.html',
        kind:  'booking',
      }) : {
        title: 'Payment failed',
        body:  'Your M-Pesa payment was not completed. Please try again.',
        url:   '/my-bookings.html',
        kind:  'general',
      };

      fetch(`${origin}/api/push-send`, {
        method:  'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ user_id: guestId, persist: true, ...notifPayload }),
      }).catch(e => console.warn('[notif] push failed (non-fatal):', e.message));
    }

    /* ── Rewards: points + referral commission ───────────────────────
       Only on a booking that is actually paid for, and against the
       amount collected rather than the amount quoted. Awarding a
       referrer 20% of a KES 2,300 stay because KES 10 arrived is real
       money leaving on a booking that may never complete. This matches
       the instalment path, which has always waited for `nowFull`. */
    if (fullySettled && rows[0]?.guest_id) {
      const b           = rows[0];
      const serviceType = table === 'apartment_bookings' ? 'stays'
                        : table === 'tour_bookings'      ? 'tours'
                        : 'events';
      const grossAmount = Number(b.grand_total || b.total_amount || b.amount || 0);

      fetch(`${siteOrigin(req)}/api/rewards`, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
        },
        body: JSON.stringify({
          action:       'award',
          booking_ref:  externalReference,
          guest_id:     b.guest_id,
          service_type: serviceType,
          gross_amount: grossAmount,
          /* The fee Postgres stamped on this booking. Referral commission is
             a share of it, and it is a fixed amount, not a percentage of the
             stay — so it has to travel with the award rather than be guessed
             at the other end. Tours and events legitimately carry 0. */
          service_fee:  b.service_fee == null ? null : Number(b.service_fee),
        }),
      }).then(r => r.json())
        .then(j => console.log('[rewards] award:', j))
        .catch(e => console.warn('[rewards] award failed (non-fatal):', e.message));
    }

    // ── Agent attribution (apartments only) ─────────────────────────
    if (fullySettled && table === 'apartment_bookings' && rows[0]) {
      const b = rows[0];
      try {
        const r = await fetch(`${siteOrigin(req)}/api/agents?action=attribute`, {
          method: 'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({
            listing_id:  String(b.apartment_id),
            booking_ref: externalReference,
            gross:       Number(b.grand_total),
            guest_id:    b.guest_id || null,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (j?.attributed) {
          console.log('[attribute]', externalReference, '→', j.agent_name, j.commission);
        }
      } catch (e) {
        console.error('[attribute] failed, booking is still valid:', e.message);
      }
    }

    // ── Host notification ────────────────────────────────────────────
    if (isSuccess && table === 'apartment_bookings' && rows[0]?.apartment_id) {
      const b      = rows[0];
      const origin = siteOrigin(req);
      try {
        const lRes = await fetch(
          `${supabaseUrl}/rest/v1/listings?id=eq.${b.listing_id || b.apartment_id}&select=partner_id,title`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );
        const listings = lRes.ok ? await lRes.json() : [];
        if (listings[0]?.partner_id) {
          fetch(`${origin}/api/push-send`, {
            method:  'POST',
            headers: {
              'Content-Type':   'application/json',
              'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '',
            },
            body: JSON.stringify({
              user_id: listings[0].partner_id,
              persist: true,
              title:   'New booking! 🏠',
              body:    `${b.guest_name || 'A guest'} just booked ${listings[0].title || 'your property'}`,
              url:     '/partner-bookings.html',
              kind:    'booking',
            }),
          }).catch(e => console.warn('[host-notif] non-fatal:', e.message));
        }
      } catch (e) {
        console.warn('[host-notif] lookup failed (non-fatal):', e.message);
      }
    }

    return res.status(200).json({ received: true, updated: updateRes.ok, status: newStatus });

  } catch (err) {
    console.error('[stk-callback] Unhandled error:', err);
    // Always 200 to PayHero, never trigger a retry on our error
    return res.status(200).json({ received: true, error: err.message });
  }
}

/* ══════════════════════════════════════════════════════════════
   Credit a single instalment and re-derive the booking's state.

   The ledger is the source of truth. amount_paid is always recomputed
   as the SUM of successful rows rather than incremented, so a duplicate
   callback delivery cannot inflate it. PayHero retries until it gets a
   200, and an increment would double-count.
══════════════════════════════════════════════════════════════ */
async function creditInstalment({ supabaseUrl, serviceKey, reference, isSuccess, payload, origin }) {
  const H = extra => ({ apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, ...extra });

  // 1. Find the ledger row.
  const lr = await fetch(
    `${supabaseUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`,
    { headers: H() });
  const ledger = lr.ok ? (await lr.json())[0] : null;
  if (!ledger) { console.warn('[stk-callback] no ledger row for', reference); return { unknown: true }; }

  // Idempotent: a row already settled is never re-processed.
  if (ledger.status === 'paid') return { alreadyProcessed: true };

  const receipt = payload.mpesa_receipt_number || payload.MpesaReceiptNumber
               || payload.response?.MpesaReceiptNumber || null;

  await fetch(`${supabaseUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(reference)}`, {
    method: 'PATCH',
    headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      status:  isSuccess ? 'paid' : 'failed',
      paid_at: isSuccess ? new Date().toISOString() : null,
      mpesa_receipt: receipt,
    }),
  });

  if (!isSuccess) return { success: false };

  // 2. Re-sum ALL successful instalments for this booking.
  const sr = await fetch(
    `${supabaseUrl}/rest/v1/booking_payments`
      + `?booking_ref=eq.${encodeURIComponent(ledger.booking_ref)}&status=eq.paid&select=amount`,
    { headers: H() });
  const amountPaid = (sr.ok ? (await sr.json()) : [])
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  // 3. Load the booking and derive its new state.
  const br = await fetch(
    `${supabaseUrl}/rest/v1/${ledger.booking_table}`
      + `?payment_reference=eq.${encodeURIComponent(ledger.booking_ref)}&select=*&limit=1`,
    { headers: H() });
  const booking = br.ok ? (await br.json())[0] : null;
  if (!booking) return { success: true, amountPaid, bookingMissing: true };

  const total    = Number(booking.grand_total || 0);
  const deposit  = Math.round(total * 0.25);
  const wasFull  = Number(booking.amount_paid || 0) >= total;
  const nowFull  = amountPaid >= total && total > 0;
  const status   = amountPaid <= 0        ? 'pending_payment'
                 : nowFull                ? 'paid_pending_checkin'
                 : amountPaid >= deposit  ? 'confirmed_balance_due'
                 : 'part_paid';

  await fetch(
    `${supabaseUrl}/rest/v1/${ledger.booking_table}`
      + `?payment_reference=eq.${encodeURIComponent(ledger.booking_ref)}`,
    {
      method: 'PATCH',
      headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({
        amount_paid:      amountPaid,
        deposit_required: deposit,
        status,
        balance_amount:   Math.max(0, total - amountPaid),
        balance_paid:     nowFull,
        ...(nowFull && !wasFull ? { fully_paid_at: new Date().toISOString() } : {}),
      }),
    });

  // 4. Tell the guest exactly where they stand.
  if (booking.guest_id) {
    const shortfall = Math.max(0, deposit - amountPaid);
    const notif = nowFull
      ? { title: 'Paid in full ✅',
          body: 'Your booking is complete. Your check-in code is now available.' }
      : status === 'confirmed_balance_due'
      ? { title: 'Booking confirmed 🎉',
          body: `Deposit received. KES ${Math.round(total - amountPaid).toLocaleString()} `
              + `remains. Your check-in code unlocks once it is paid.` }
      : { title: 'Payment received',
          body: `KES ${Math.round(amountPaid).toLocaleString()} received. Add KES `
              + `${shortfall.toLocaleString()} more to confirm this booking.` };

    fetch(`${origin}/api/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '' },
      body: JSON.stringify({ user_id: booking.guest_id, persist: true,
                             url: '/my-bookings.html', kind: 'booking', ...notif }),
    }).catch(e => console.warn('[notif] non-fatal:', e.message));
  }

  /* Rewards, referral commission and agent attribution fire ONCE, only
     when the booking becomes fully paid. */
  if (nowFull && !wasFull && booking.guest_id) {
    fetch(`${origin}/api/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'x-internal-secret': process.env.INTERNAL_API_SECRET || '' },
      body: JSON.stringify({ action: 'award', booking_ref: ledger.booking_ref,
                             guest_id: booking.guest_id, service_type: 'stays',
                             gross_amount: total,
                             /* see the note on the other award call: the fee is
                                fixed and stamped, so it travels with the award */
                             service_fee: booking.service_fee == null
                                            ? null : Number(booking.service_fee) }),
    }).catch(e => console.warn('[rewards] non-fatal:', e.message));

    fetch(`${origin}/api/agents?action=attribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'x-internal-secret': process.env.INTERNAL_API_SECRET || '' },
      body: JSON.stringify({ listing_id: String(booking.apartment_id),
                             booking_ref: ledger.booking_ref, gross: total,
                             guest_id: booking.guest_id || null }),
    }).catch(e => console.warn('[attribute] non-fatal:', e.message));
  }

  return { success: true, amountPaid, status, confirmed: amountPaid >= deposit, fullyPaid: nowFull };
}
