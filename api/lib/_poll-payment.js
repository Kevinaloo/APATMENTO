/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero Transaction Status Poller (self-discovering)

   Imported by api/stk-push.js, which dispatches GET (or ?action=poll)
   here. Lives under api/lib/ so it is not routed as its own serverless
   function — the Hobby plan caps deployments at 12.

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

const BASE = 'https://backend.payhero.co.ke/api/v2';

/* {CK} = CheckoutRequestID, {REF} = our external_reference. */
/* Ordered by likelihood. {REF} is the external_reference we sent with
   the STK push, which is what PayHero indexes the transaction by, so
   those come first. */
const CANDIDATES = [
  '/transaction-status?reference={REF}',
  '/transaction-status?reference={CK}',
  '/transaction-status?checkout_request_id={CK}',
  '/payments/{CK}',
  '/payments?reference={REF}',
  '/payment-status?reference={REF}',
];

let LEARNED = null;   /* cached across warm invocations */

const TERMINAL_OK   = ['SUCCESS', 'COMPLETED', 'COMPLETE', 'PAID'];
/* Deliberately narrow. 'ERROR' and free-text matching were removed:
   a not-found lookup or a transport hiccup must never be reported to a
   guest as a failed payment when their money has actually left. When in
   doubt we stay 'pending' — a slow success is recoverable, a false
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

    if (ledger.status === 'paid')   return res.json({ status: 'paid',   settled: true });
    if (ledger.status === 'failed') return res.json({ status: 'failed', settled: true });

    const CK = ledger.checkout_request_id;
    if (!CK) return res.json({ status: 'pending', reason: 'awaiting_checkout_id' });

    // ── Probe PayHero ─────────────────────────────────────────────
    const probes = [];
    const order  = LEARNED ? [LEARNED, ...CANDIDATES.filter(c => c !== LEARNED)] : CANDIDATES;

    let found = null;
    for (const tpl of order) {
      const path = tpl.replace('{CK}', encodeURIComponent(CK))
                      /* external_reference we sent to PayHero is the
                         instalment ref (…-P1), NOT the booking ref.
                         Querying the booking ref found no transaction,
                         and a not-found was being read as a failure —
                         which is why a paid KES 10 showed the facepalm. */
                      .replace('{REF}', encodeURIComponent(ref));
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

    if (!found || found.verdict === 'pending')
      return res.json({ status: 'pending', payhero_raw: found?.raw || null });

    // ── Terminal — record it ourselves ────────────────────────────
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

    const sr = await fetch(
      `${supaUrl}/rest/v1/booking_payments`
        + `?booking_ref=eq.${encodeURIComponent(ledger.booking_ref)}&status=eq.paid&select=amount`,
      { headers: H() });
    const amountPaid = (sr.ok ? await sr.json() : [])
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const br = await fetch(
      `${supaUrl}/rest/v1/apartment_bookings`
        + `?payment_reference=eq.${encodeURIComponent(ledger.booking_ref)}&select=*&limit=1`,
      { headers: H() });
    const booking = br.ok ? (await br.json())[0] : null;
    const total   = Number(booking?.grand_total || 0);
    const deposit = Math.round(total * 0.25);
    const nowFull = total > 0 && amountPaid >= total;

    const newStatus = amountPaid <= 0       ? 'pending_payment'
                    : nowFull               ? 'paid_pending_checkin'
                    : amountPaid >= deposit ? 'confirmed_balance_due'
                    : 'part_paid';

    await fetch(
      `${supaUrl}/rest/v1/apartment_bookings`
        + `?payment_reference=eq.${encodeURIComponent(ledger.booking_ref)}`,
      {
        method: 'PATCH',
        headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({
          amount_paid:      amountPaid,
          deposit_required: deposit,
          status:           newStatus,
          balance_amount:   Math.max(0, total - amountPaid),
          balance_paid:     nowFull,
          ...(nowFull ? { fully_paid_at: new Date().toISOString() } : {}),
        }),
      });

    return res.json({
      status:           newStatus,
      amount_paid:      amountPaid,
      grand_total:      total,
      deposit_required: deposit,
      mpesa_receipt:    found.receipt,
      confirmed:        amountPaid >= deposit,
      fully_paid:       nowFull,
    });

  } catch (err) {
    console.error('[poll-payment]', err);
    return res.status(500).json({ status: 'pending', error: err.message });
  }
}
