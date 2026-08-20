/* ══════════════════════════════════════════════════════════════
   Payment reconciler  ·  api/lib/_reconcile-payments.js

   Under lib/ so it costs no Serverless Function slot. Driven from
   api/utilities.js?action=reconcile-payments, on the nightly cron.

   THE PROBLEM
   ───────────
   Nothing ever closed a payment attempt. A row went into
   booking_payments as 'pending' before the STK push, and if the guest
   never entered a PIN — or PayHero refused the charge outright — it
   stayed 'pending' forever. Twelve rows were stranded that way, some
   since 2026-08-08, still carrying live CheckoutRequestIDs. The
   bookings behind them hung in pending_payment with no way to end.

   THE QUESTION THIS ANSWERS
   ─────────────────────────
   "If the float was the problem, can those pending prompts fire once
   it's topped up?"

   No — and this makes that structural rather than a matter of trust:

     · A push PayHero refused (BAD_REQUEST, unfunded float) never
       reached Safaricom at all. No prompt was ever created, so there
       is nothing left to fire. stk-push already marks those 'failed'.
     · A prompt that did reach a handset dies at Safaricom in about
       sixty seconds if no PIN is entered. It cannot be revived, and
       topping up the float does not reopen it. Every push is a new
       transaction with a new reference.

   So the risk is not a stale charge firing. It is our ledger lying
   about it. This retires each dead row to a terminal state, and
   _poll-payment treats 'expired' as terminal, so nothing can quietly
   settle later.

   SAFETY RULE
   ───────────
   Never mark a row dead on silence. A row is only retired when we
   have positive grounds: PayHero gave a readable verdict, or the row
   never got an identifier, or it is old beyond any possibility of
   life. If PayHero is unreachable the row is left alone and retried
   on the next sweep. A false 'failed' tells someone their paid
   booking did not happen, which is far worse than a slow one.
══════════════════════════════════════════════════════════════ */

import { probeStatus, settleView } from './_poll-payment.js';
import { payheroAuth, walletBalance } from './_payhero-account.js';

/* No PayHero identifier after this long ⇒ the push never got out. */
const NEVER_DISPATCHED_MIN = 10;

/* An STK prompt is dead at Safaricom in ~60s. We wait far longer than
   that before retiring one, so a slow-but-real payment always wins. */
const PROMPT_TTL_MIN = 30;

/* Rows PayHero cannot tell us about — a prompt was sent but the push
   response never yielded the payhero_reference the status endpoint is
   indexed by, so the outcome is permanently unknowable. After a day
   an unpaid prompt is certain, but we mark it 'expired' rather than
   'failed' and report it for a human to eyeball against the M-Pesa
   statement. */
const UNVERIFIABLE_TTL_HOURS = 24;

const MAX_ROWS = 200;

export async function reconcilePayments({ supabaseUrl, serviceKey, dryRun = false } = {}) {
  const H = extra => ({ apikey: serviceKey,
                        Authorization: `Bearer ${serviceKey}`, ...extra });

  const cutoff = new Date(Date.now() - NEVER_DISPATCHED_MIN * 60_000).toISOString();
  const r = await fetch(
    `${supabaseUrl}/rest/v1/booking_payments`
      + `?status=eq.pending&created_at=lt.${encodeURIComponent(cutoff)}`
      + `&select=*&order=created_at.asc&limit=${MAX_ROWS}`,
    { headers: H() });
  if (!r.ok) return { error: 'ledger_read_failed', detail: await r.text() };

  const rows = await r.json();
  const auth = payheroAuth();

  const out = {
    scanned: rows.length, settled: [], failed: [], expired: [],
    unchanged: [], unreachable: [], dry_run: dryRun,
  };

  const retire = async (row, status, reason, receipt = null) => {
    if (dryRun) return;
    await fetch(
      `${supabaseUrl}/rest/v1/booking_payments`
        + `?reference=eq.${encodeURIComponent(row.reference)}&status=eq.pending`,
      {
        method: 'PATCH',
        headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        /* Guarded on status=eq.pending: if a callback settled this row
           between our read and this write, we must not stamp over it. */
        body: JSON.stringify({ status, ...(receipt ? { mpesa_receipt: receipt } : {}) }),
      }).catch(e => console.warn('[reconcile] retire failed:', row.reference, e.message));
    console.log('[reconcile]', row.reference, '→', status, '(' + reason + ')');
  };

  for (const row of rows) {
    const ageMin   = (Date.now() - new Date(row.created_at).getTime()) / 60_000;
    const ageHours = ageMin / 60;
    const tag      = { reference: row.reference, amount: Number(row.amount), age_min: Math.round(ageMin) };

    /* Money moved. Nothing below this line may overrule a receipt. */
    if (row.mpesa_receipt) {
      if (!dryRun) await settleRow(supabaseUrl, H, row, row.mpesa_receipt);
      out.settled.push({ ...tag, reason: 'receipt_on_row' });
      continue;
    }

    /* PayHero never accepted the push — an unfunded float answers
       BAD_REQUEST before Safaricom is ever contacted. No prompt
       exists, so there is nothing that could fire later. */
    if (!row.checkout_request_id && !row.payhero_reference) {
      await retire(row, 'failed', 'never_dispatched');
      out.failed.push({ ...tag, reason: 'never_dispatched' });
      continue;
    }

    if (!auth) { out.unreachable.push({ ...tag, reason: 'payhero_credentials_missing' }); continue; }

    const { found } = await probeStatus(auth, row.reference, row);

    if (found?.verdict === 'paid') {
      if (!dryRun) await settleRow(supabaseUrl, H, row, found.receipt);
      out.settled.push({ ...tag, reason: 'payhero_paid', receipt: found.receipt });
      continue;
    }

    if (found?.verdict === 'failed') {
      await retire(row, 'failed', 'payhero_failed');
      out.failed.push({ ...tag, reason: 'payhero_failed', payhero_raw: found.raw });
      continue;
    }

    /* PayHero says it is still pending. Believe that only for as long
       as a prompt could plausibly be alive. */
    if (found && ageMin >= PROMPT_TTL_MIN) {
      await retire(row, 'expired', 'prompt_ttl_elapsed');
      out.expired.push({ ...tag, reason: 'prompt_ttl_elapsed' });
      continue;
    }

    /* Nothing readable came back. Usually the row has a
       checkout_request_id but no payhero_reference, and the status
       endpoint is indexed only by the latter. Unknowable — so we wait
       out the long TTL rather than guess. */
    if (!found && ageHours >= UNVERIFIABLE_TTL_HOURS) {
      await retire(row, 'expired', 'unverifiable_stale');
      out.expired.push({ ...tag, reason: 'unverifiable_stale', review: true });
      continue;
    }

    out.unchanged.push({ ...tag, reason: found ? 'prompt_may_be_live' : 'awaiting_payhero' });
  }

  /* The float is the thing that actually stops payments. Report it on
     every sweep so an empty wallet is visible before guests find it. */
  const wallet = await walletBalance();
  out.wallet = wallet.ok
    ? { balance: wallet.balance, readable: wallet.balance !== null }
    : { balance: null, readable: false, error: wallet.error };

  return out;
}

/* A paid instalment must also move the booking. settleView re-sums the
   ledger and writes the derived state, so it is reused rather than
   reimplemented. */
async function settleRow(supabaseUrl, H, row, receipt) {
  await fetch(
    `${supabaseUrl}/rest/v1/booking_payments`
      + `?reference=eq.${encodeURIComponent(row.reference)}&status=neq.paid`,
    {
      method: 'PATCH',
      headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({
        status: 'paid',
        paid_at: new Date().toISOString(),
        ...(receipt ? { mpesa_receipt: receipt } : {}),
      }),
    }).catch(e => console.warn('[reconcile] settle write:', e.message));

  await settleView(supabaseUrl, H, row, { instalment: 'paid' })
    .catch(e => console.warn('[reconcile] settleView:', e.message));
}
