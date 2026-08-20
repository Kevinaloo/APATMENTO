/* ════════════════════════════════════════════════════════════════
   PayPal REST API helpers  ·  api/lib/_paypal.js
   Live endpoint only — no Sandbox toggle needed in production.

   KES is not a PayPal-supported currency. Every charge is converted
   to USD using PAYPAL_KES_TO_USD_RATE (env var, default 130).
   A 1 % buffer is added so rounding never leaves us a cent short.
════════════════════════════════════════════════════════════════ */

const BASE = 'https://api-m.paypal.com';

/* Module-level token cache; survives warm invocations. */
let _tok = null, _tokExp = 0;

export async function getAccessToken() {
  if (_tok && Date.now() < _tokExp - 30_000) return _tok;

  const id     = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set');

  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`PayPal auth HTTP ${r.status}: ${await r.text()}`);

  const d  = await r.json();
  _tok     = d.access_token;
  _tokExp  = Date.now() + d.expires_in * 1000;
  return _tok;
}

/* KES → USD, rounded up to nearest cent, with 1 % drift buffer. */
export function kesToUsd(kes) {
  const rate = parseFloat(process.env.PAYPAL_KES_TO_USD_RATE || '130');
  return Math.ceil((kes / rate) * 1.01 * 100) / 100;
}

export async function createOrder({ amountKes, bookingRef, description }) {
  const token     = await getAccessToken();
  const amountUsd = kesToUsd(amountKes);

  const r = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization:       `Bearer ${token}`,
      'Content-Type':      'application/json',
      'PayPal-Request-Id': `${bookingRef}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: bookingRef,
        description:  description || `Cabana Africa – ${bookingRef}`,
        amount: { currency_code: 'USD', value: amountUsd.toFixed(2) },
      }],
      application_context: {
        brand_name:  'Cabana Africa',
        landing_page: 'NO_PREFERENCE',
        user_action:  'PAY_NOW',
        return_url:   'https://cabana.africa/payment-success.html',
        cancel_url:   'https://cabana.africa/payment-cancelled.html',
      },
    }),
  });
  if (!r.ok) throw new Error(`PayPal createOrder HTTP ${r.status}: ${await r.text()}`);

  const data = await r.json();
  return { orderId: data.id, amountUsd, status: data.status };
}

export async function captureOrder(orderId) {
  const token = await getAccessToken();
  const r = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    '{}',
  });
  if (!r.ok) throw new Error(`PayPal capture HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

/* Used to verify webhook events without needing the raw request body. */
export async function fetchOrder(orderId) {
  const token = await getAccessToken();
  const r = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`PayPal fetchOrder HTTP ${r.status}`);
  return r.json();
}
