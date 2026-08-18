import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const callbackToken = Deno.env.get('PAYHERO_CALLBACK_TOKEN') || '';
const allowedTables = new Set(['apartment_bookings', 'tour_bookings', 'event_tickets']);

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function secureEqual(a: string, b: string) {
  if (!a || !b) return false;
  const data = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', data.encode(a)),
    crypto.subtle.digest('SHA-256', data.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let difference = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    difference |= (x[i] || 0) ^ (y[i] || 0);
  }
  return difference === 0;
}

function callbackStatus(payload: Record<string, any>) {
  const raw = String(payload.status ?? payload.response?.status ?? '').toUpperCase();
  const code = payload.ResultCode ?? payload.result_code ?? payload.response?.ResultCode;
  if (raw === 'SUCCESS' || code === 0 || code === '0') return 'paid';
  if (['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED'].includes(raw)) return 'failed';
  return 'pending';
}

function callbackAmount(payload: Record<string, any>) {
  const amount = Number(payload.amount ?? payload.Amount ?? payload.response?.Amount);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!url || !serviceKey || !callbackToken) {
    console.error('[payhero-callback] required server configuration is missing');
    return json(503, { error: 'callback_verification_unavailable' });
  }

  const supplied = new URL(req.url).searchParams.get('t') || '';
  if (!(await secureEqual(supplied, callbackToken))) {
    console.warn('[payhero-callback] rejected unauthenticated request');
    return json(401, { error: 'unauthorized' });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (declaredLength > 100_000) return json(413, { error: 'payload_too_large' });

  let payload: Record<string, any>;
  try {
    const raw = await req.text();
    if (raw.length > 100_000) return json(413, { error: 'payload_too_large' });
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const reference = String(
    payload.external_reference || payload.response?.external_reference || ''
  ).trim();
  if (!/^(APT|TOUR|EVENT)-[A-Za-z0-9_-]+-P\d+$/.test(reference)) {
    console.warn('[payhero-callback] ignored unsupported reference');
    return json(200, { received: true, ignored: true });
  }

  const status = callbackStatus(payload);
  if (status === 'pending') return json(200, { received: true, status: 'pending' });

  const { data: ledger, error: ledgerError } = await sb
    .from('booking_payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();
  if (ledgerError) {
    console.error('[payhero-callback] ledger lookup failed', ledgerError.code);
    return json(500, { error: 'ledger_unavailable' });
  }
  if (!ledger) return json(200, { received: true, ignored: true });
  if (ledger.status === 'paid') return json(200, { received: true, idempotent: true });

  const amount = callbackAmount(payload);
  const expectedAmount = Number(ledger.amount);
  if (status === 'paid' && (amount === null || Math.abs(amount - expectedAmount) > 0.001)) {
    console.error('[payhero-callback] amount mismatch for', reference);
    return json(200, { received: true, ignored: true, reason: 'amount_mismatch' });
  }

  const receipt = String(
    payload.mpesa_receipt_number
      || payload.MpesaReceiptNumber
      || payload.response?.MpesaReceiptNumber
      || ''
  ).trim() || null;

  if (status === 'paid' && receipt) {
    const { data: duplicate } = await sb
      .from('booking_payments')
      .select('reference')
      .eq('mpesa_receipt', receipt)
      .neq('reference', reference)
      .limit(1);
    if (duplicate?.length) {
      console.error('[payhero-callback] duplicate receipt rejected');
      return json(200, { received: true, ignored: true, reason: 'duplicate_receipt' });
    }
  }

  const { error: paymentError } = await sb
    .from('booking_payments')
    .update({
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      mpesa_receipt: receipt,
    })
    .eq('reference', reference)
    .neq('status', 'paid');
  if (paymentError) {
    console.error('[payhero-callback] ledger update failed', paymentError.code);
    return json(500, { error: 'ledger_update_failed' });
  }
  if (status !== 'paid') return json(200, { received: true, status });

  const table = ledger.booking_table || 'apartment_bookings';
  if (!allowedTables.has(table)) {
    console.error('[payhero-callback] invalid booking table');
    return json(500, { error: 'invalid_booking_table' });
  }

  const { data: paidRows, error: paidError } = await sb
    .from('booking_payments')
    .select('amount')
    .eq('booking_ref', ledger.booking_ref)
    .eq('status', 'paid');
  const { data: booking, error: bookingError } = await sb
    .from(table)
    .select('*')
    .eq('payment_reference', ledger.booking_ref)
    .maybeSingle();
  if (paidError || bookingError || !booking) {
    console.error('[payhero-callback] settlement lookup failed');
    return json(500, { error: 'settlement_lookup_failed' });
  }

  const amountPaid = (paidRows || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const total = Number(booking.grand_total || booking.total_amount || booking.total || 0);
  const deposit = Math.round(total * 0.25);
  const fullyPaid = total > 0 && amountPaid >= total;
  const bookingStatus = amountPaid <= 0 ? 'pending_payment'
    : fullyPaid ? 'paid_pending_checkin'
    : amountPaid >= deposit ? 'confirmed_balance_due'
    : 'part_paid';

  const patch: Record<string, unknown> = { status: bookingStatus };
  if (table === 'apartment_bookings') {
    Object.assign(patch, {
      amount_paid: amountPaid,
      deposit_required: deposit,
      balance_amount: Math.max(0, total - amountPaid),
      balance_paid: fullyPaid,
      ...(fullyPaid && !booking.fully_paid_at
        ? { fully_paid_at: new Date().toISOString() }
        : {}),
    });
  }

  const { error: bookingUpdateError } = await sb
    .from(table)
    .update(patch)
    .eq('payment_reference', ledger.booking_ref);
  if (bookingUpdateError) {
    console.error('[payhero-callback] booking update failed', bookingUpdateError.code);
    return json(500, { error: 'booking_update_failed' });
  }

  console.log('[payhero-callback] settled', reference, bookingStatus);
  return json(200, { received: true, status: bookingStatus });
});
