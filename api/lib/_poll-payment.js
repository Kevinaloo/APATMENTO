/* ══════════════════════════════════════════════════════════════
   APATMENTO. PayHero Transaction Status Poller (self-discovering)

   Imported by api/stk-push.js, which dispatches GET (or ?action=poll)
   here. Lives under api/lib/ so it is not routed as its own serverless
   function. The Hobby plan caps deployments at 12.

   Reached from the browser as:
     GET /api/poll-payment?ref=APT-xxx-P1
     GET /api/poll-payment?ref=APT-xxx-P1&debug=1   ← shows every probe

   WHY THIS EXISTS
   ───────────────
   PayHero never calls our callback URL. Eight payments, zero callbacks,
   zero edge-function logs. So we stopped waiting and ask PayHero
   directly, using the CheckoutRequestID stored at push time.

   PayHero's status endpoint is not documented in machine-readable form
   (their docs render client-side), so rather than hard-code a guessed
   URL this probes the known candidate shapes, keeps whichever answers,
   and caches it for the life of the warm lambda. ?debug=1 returns every
   probe verbatim so the real contract can be confirmed from a browser
   in a single request instead of another blind test cycle.
══════════════════════════════════════════════════════════════ */

import { deriveStatus, depositRequired, settlementOf } from './_payment-rules.js';

const BASE = 'https://backend.payhero.co.ke/api/v2';

/* {CK} = CheckoutRequestID, {REF} = our external_reference. */
/* MEASURED, not guessed. Probed live from the database with pg_net:

     /api/v2/transaction-status?reference=  -> 401 (exists, needs auth)
     /api/v2/transaction_status?reference=  -> 404 Endpoint not found
     /api/v2/payments/{id}                  -> 404 Endpoint not found
     /api/v2/payment-status?reference=      -> 404 Endpoint not found
     /api/v2/payments?reference=            -> 404 Endpoint not found

   There is exactly ONE status endpoint. Every other URL used here
   previously was invented by me and returned 404, which the classifier
   then read as a failed payment. That is why paid bookings showed the
   facepalm video.

   PayHero authenticates before it validates parameters, so the exact
   query-param name cannot be probed without credentials. We therefore
   send every plausible spelling at once. Unknown params are ignored,
   and both the instalment reference and the CheckoutRequestID are
   included so whichever PayHero indexes by is present. */
/* {PH} = PayHero's own reference from the STK response. The only key
   /api/v2/transaction-status accepts. Confirmed by live probe: querying
   with our external_reference or the CheckoutRequestID both returned
   NOT_FOUND while authenticating successfully. */
const CANDIDATES = [
  '/transaction-status?reference={PH}',
  '/transaction-status?reference={REF}',
  '/transaction-status?reference={CK}',
];

let LEARNED = null;   /* cached across warm invocations */

const TERMINAL_OK   = ['SUCCESS', 'COMPLETED', 'COMPLETE', 'PAID'];
/* Deliberately narrow. 'ERROR' and free-text matching were removed:
   a not-found lookup or a transport hiccup must never be reported to a
   guest as a failed payment when their money has actually left. When in
   doubt we stay 'pending'. A slow success is recoverable, a false
   failure tells someone their paid booking did not happen. */
const TERMINAL_FAIL = ['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED'];
const PENDING_WORDS = ['QUEUED', 'PENDING', 'PROCESSING', 'INITIATED', 'SENT'];

/* Pull a status + reason out of whatever shape PayHero returns. */
function readStatus(body) {
  if (!body || typeof body !== 'object') return null;
  const r = body.response || body.data || body.transaction || body;

  const raw = String(
    r.status ?? r.Status ?? r.transaction_status ?? r.state ??
    body.status ?? body.Status ?? ''
  ).toUpperCase().trim();

  const desc = r.ResultDesc || r.result_desc || r.description || r.message
            || r.failure_reason || body.message || '';
  const receipt = r.MpesaReceiptNumber || r.mpesa_receipt_number
               || r.receipt || r.provider_reference || null;
  const code = r.ResultCode ?? r.result_code ?? r.ResponseCode ?? null;

  if (!raw && code == null) return null;

  let verdict = 'pending';
  if (PENDING_WORDS.some(w => raw.includes(w)))                       verdict = 'pending';
  else if (TERMINAL_OK.some(w => raw.includes(w)) || String(code) === '0') verdict = 'paid';
  else if (TERMINAL_FAIL.some(w => raw.includes(w)))                  verdict = 'failed';

  /* An M-Pesa receipt only exists once money has actually moved, so it
     overrides any confusing status wording. */
  if (receipt && verdict !== 'failed') verdict = 'paid';

  return { verdict, raw, desc: String(desc), receipt, code };
}

/* PayHero wording → something a guest actually understands. */
function friendlyReason(desc, raw) {
  const d = String(desc || raw || '').toUpperCase();
  if (d.includes('INSUFFICIENT') || d.includes('BALANCE'))
    return 'Not enough M-Pesa balance. Top up and try again.';
  if (d.includes('CANCEL') || d.includes('ABORT'))
    return 'You cancelled the payment request.';
  if (d.includes('WRONG') || d.includes('INVALID') || d.includes('PIN'))
    return 'Incorrect M-Pesa PIN.';
  if (d.includes('TIMEOUT') || d.includes('TIMED'))
    return 'The request timed out before your PIN was entered.';
  if (d.includes('LOCK') || d.includes('BLOCK'))
    return 'This M-Pesa number is temporarily blocked. Try another number.';
  return desc || 'The payment did not go through.';
}

export async function pollPayment(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ref, debug } = req.query || {};
  if (!ref) return res.status(400).json({ error: 'ref required' });

  const username   = process.env.PAYHERO_USERNAME;
  const password   = process.env.PAYHERO_PASSWORD;
  const supaUrl    = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!username || !password)
    return res.status(500).json({ status: 'pending', error: 'PAYHERO_* missing in Vercel env' });
  if (!supaUrl || !serviceKey)
    return res.status(500).json({ status: 'pending', error: 'SUPABASE_* missing in Vercel env' });

  const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const H = extra => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...extra });

  try {
    const lr = await fetch(
      `${supaUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(ref)}&select=*&limit=1`,
      { headers: H() });
    const ledger = lr.ok ? (await lr.json())[0] : null;
    if (!ledger) return res.status(404).json({ status: 'pending', error: 'unknown reference' });

    /* An instalment that has already cleared still has to answer the
       real question, which is not "did these ten shillings arrive" but
       "is this booking paid for". Returning a bare status:'paid' here
       is what let a KES 10 payment on a KES 2,300 stay show the guest a
       check-in code: the browser had no way to tell the instalment
       apart from the booking. */
    if (ledger.status === 'paid') {
      return res.json(await settleView(supaUrl, H, ledger, { instalment: 'paid' }));
    }
    if (ledger.status === 'failed') return res.json({ status: 'failed', settled: true });

    const CK = ledger.checkout_request_id;
    if (!CK) return res.json({ status: 'pending', reason: 'awaiting_checkout_id' });

    // ── Probe PayHero ─────────────────────────────────────────────
    const probes = [];
    const order  = LEARNED ? [LEARNED, ...CANDIDATES.filter(c => c !== LEARNED)] : CANDIDATES;

    let found = null;
    for (const tpl of order) {
      const PH = ledger.payhero_reference || '';
      if (tpl.includes('{PH}') && !PH) continue;   // nothing to query with yet
      const path = tpl.split('{PH}').join(encodeURIComponent(PH))
                      .split('{CK}').join(encodeURIComponent(CK))
                      /* external_reference we sent to PayHero is the
                         instalment ref (…-P1), NOT the booking ref.
                         Querying the booking ref found no transaction,
                         and a not-found was being read as a failure
                         which is why a paid KES 10 showed the facepalm. */
                      .split('{REF}').join(encodeURIComponent(ref));
      try {
        const r   = await fetch(BASE + path, {
          headers: { Authorization: auth, Accept: 'application/json' },
        });
        const txt = await r.text();
        let body; try { body = JSON.parse(txt); } catch { body = txt; }

        if (debug) probes.push({ path, http: r.status,
          body: typeof body === 'string' ? body.slice(0, 400) : body });

        if (!r.ok) continue;

        /* Guard against a generic/empty 200 that is not about this
           transaction. Require the payload to echo one of our
           identifiers, or to carry a receipt. */
        const blob = JSON.stringify(body || '');
        const mentionsUs = blob.includes(CK) || blob.includes(ref)
                        || /MpesaReceipt|mpesa_receipt|ResultCode|provider_reference/i.test(blob);
        if (!mentionsUs) {
          if (debug) probes.push({ path, http: r.status, skipped: 'no identifier match' });
          continue;
        }

        const parsed = readStatus(body);
        if (parsed) { found = parsed; LEARNED = tpl; if (!debug) break; }
      } catch (e) {
        if (debug) probes.push({ path, error: e.message });
      }
    }

    if (debug) return res.json({ ref, checkout_request_id: CK, learned: LEARNED, found, probes });

    /* If no probe produced a readable verdict we stay pending and keep
       polling. Previously an unreadable/404 answer fell through into the
       failure path and told guests their completed payment had failed. */
    if (!found || found.verdict === 'pending')
      return res.json({ status: 'pending', payhero_raw: found?.raw || null });

    // ── Terminal. Record it ourselves ────────────────────────────
    const isPaid = found.verdict === 'paid';

    await fetch(`${supaUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({
        status:        isPaid ? 'paid' : 'failed',
        paid_at:       isPaid ? new Date().toISOString() : null,
        mpesa_receipt: found.receipt,
      }),
    });

    if (!isPaid) {
      return res.json({
        status: 'failed',
        reason: friendlyReason(found.desc, found.raw),
        payhero_raw: found.raw,
      });
    }

    return res.json(await settleView(supaUrl, H, ledger, {
      instalment:    'paid',
      mpesa_receipt: found.receipt,
    }));

  } catch (err) {
    console.error('[poll-payment]', err);
    return res.status(500).json({ status: 'pending', error: err.message });
  }
}

/* ══════════════════════════════════════════════════════════════
   Re-sum the ledger, write the derived state back to the booking,
   and answer with the BOOKING's position, never the instalment's.

   `fully_paid` is the only field a client should use to decide
   whether a check-in code may be shown. Everything else here is for
   display.
══════════════════════════════════════════════════════════════ */
async function settleView(supaUrl, H, ledger, extra = {}) {
  /* The ledger row knows which table it belongs to. This used to be
     hard-coded to apartment_bookings, so a paid tour or event
     instalment updated nothing at all and the booking stayed
     'pending_payment' however much the guest paid. */
  const table = ledger.booking_table || 'apartment_bookings';
  const ref   = encodeURIComponent(ledger.booking_ref);

  /* ── STAYS: settle inside the database ────────────────────────────
     Re-summing the ledger over PostgREST and then PATCHing the booking
     is a read-modify-write across two round trips, which is exactly the
     shape that loses a race. Two M-Pesa payments clearing at the same
     moment for the same nights both read "no hold yet" and both wrote a
     confirmation, and nothing anywhere refused the second one.

     cabana_settle_booking does the whole thing under a row lock, and the
     claim itself is an INSERT against an exclusion constraint, so the
     database decides the winner rather than whichever lambda was
     scheduled first. It returns the booking's position, not the
     instalment's. */
  if (table === 'apartment_bookings') {
    try {
      const rr = await fetch(`${supaUrl}/rest/v1/rpc/cabana_settle_booking`, {
        method: 'POST',
        headers: H({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ p_booking_ref: ledger.booking_ref }),
      });
      if (rr.ok) {
        const s = await rr.json();
        if (s && s.ok) return { ...s, ...extra };
        console.warn('[poll-payment] settle rejected:', s && s.error);
      } else {
        console.warn('[poll-payment] settle http', rr.status, await rr.text());
      }
    } catch (e) {
      console.warn('[poll-payment] settle rpc:', e.message);
    }
    /* Fall through to the legacy path below only if the RPC is missing
       or unreachable, so a stale deploy still settles money correctly —
       it just cannot claim dates. */
  }

  const sr = await fetch(
    `${supaUrl}/rest/v1/booking_payments`
      + `?booking_ref=eq.${ref}&status=eq.paid&select=amount`,
    { headers: H() });
  const amountPaid = (sr.ok ? await sr.json() : [])
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const br = await fetch(
    `${supaUrl}/rest/v1/${table}?payment_reference=eq.${ref}&select=*&limit=1`,
    { headers: H() });
  const booking = br.ok ? (await br.json())[0] : null;

  const s         = settlementOf({ ...booking, amount_paid: amountPaid });
  const newStatus = deriveStatus(amountPaid, s.total);

  /* Only apartment_bookings carries the ledger mirror columns. */
  const patch = { status: newStatus };
  if (table === 'apartment_bookings') {
    Object.assign(patch, {
      amount_paid:      amountPaid,
      deposit_required: depositRequired(s.total),
      balance_amount:   s.outstanding,
      balance_paid:     s.settled,
      ...(s.settled && !booking?.fully_paid_at
          ? { fully_paid_at: new Date().toISOString() } : {}),
    });
  }

  await fetch(`${supaUrl}/rest/v1/${table}?payment_reference=eq.${ref}`, {
    method: 'PATCH',
    headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(patch),
  }).catch(e => console.warn('[poll-payment] status write:', e.message));

  return {
    status:           newStatus,
    amount_paid:      amountPaid,
    grand_total:      s.total,
    outstanding:      s.outstanding,
    deposit_required: s.deposit,
    percent_paid:     s.pct,
    confirmed:        s.confirmed,
    fully_paid:       s.settled,   /* the only gate for a check-in code */
    ...extra,
  };
}
