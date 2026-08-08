/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero STK Push Initiator
   Vercel Serverless Function (api/stk-push.js)
   Called at: /api/stk-push

   Environment variables required (set in Vercel Dashboard):
     PAYHERO_USERNAME        — API username from PayHero
     PAYHERO_PASSWORD        — API password from PayHero
     PAYHERO_CHANNEL_ID      — Channel ID from PayHero dashboard
     SUPABASE_URL            — (optional) for logging
     SUPABASE_SERVICE_ROLE_KEY
══════════════════════════════════════════════════════════════ */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, phone, reference, description } = req.body || {};

    // ── Validate inputs ──────────────────────────────────────────────
    if (!amount || !phone || !reference) {
      return res.status(400).json({
        error: 'Missing required fields: amount, phone, reference',
      });
    }

    const parsedAmount = Math.round(Number(amount));
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ error: 'Invalid amount — must be a positive number' });
    }

    // ── Normalise phone → 254XXXXXXXXX ──────────────────────────────
    let normalizedPhone = String(phone).replace(/[\s\-().+]/g, '');
    if (normalizedPhone.startsWith('0'))           normalizedPhone = '254' + normalizedPhone.slice(1);
    else if (/^[71]/.test(normalizedPhone))        normalizedPhone = '254' + normalizedPhone;
    else if (normalizedPhone.startsWith('+254'))   normalizedPhone = normalizedPhone.slice(1);
    // Final check: must be 254 followed by exactly 9 digits
    if (!/^254\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number. Use format: 07XX XXX XXX or 254XXXXXXXXX',
      });
    }

    // ── Credentials ──────────────────────────────────────────────────
    const username  = process.env.PAYHERO_USERNAME;
    const password  = process.env.PAYHERO_PASSWORD;
    const channelId = process.env.PAYHERO_CHANNEL_ID;

    if (!username || !password || !channelId) {
      console.error('[stk-push] Missing PayHero env vars:', {
        hasUsername:  !!username,
        hasPassword:  !!password,
        hasChannelId: !!channelId,
      });
      return res.status(500).json({ error: 'PayHero credentials not configured on server' });
    }

    // ── Build auth & callback ────────────────────────────────────────
    const authToken   = Buffer.from(`${username}:${password}`).toString('base64');
    const host        = req.headers['x-forwarded-host'] || req.headers.host;
    const proto       = req.headers['x-forwarded-proto'] || 'https';
    const callbackUrl = `${proto}://${host}/api/stk-callback`;

    // PayHero requires channel_id as integer
    const parsedChannelId = parseInt(String(channelId).trim(), 10);
    if (isNaN(parsedChannelId)) {
      return res.status(500).json({ error: 'PAYHERO_CHANNEL_ID is not a valid integer' });
    }

    const payload = {
      amount:             parsedAmount,
      phone_number:       normalizedPhone,
      channel_id:         parsedChannelId,
      provider:           'm-pesa',
      external_reference: String(reference),
      callback_url:       callbackUrl,
      description:        description || 'Apatmento Booking',
    };

    console.log('[stk-push] Initiating payment:', {
      amount:    parsedAmount,
      phone:     normalizedPhone,
      reference: String(reference),
      channel:   parsedChannelId,
      callback:  callbackUrl,
    });

    // ── Call PayHero API ─────────────────────────────────────────────
    const payheroRes = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${authToken}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await payheroRes.text();
    console.log('[stk-push] PayHero status:', payheroRes.status, 'body:', rawText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(payheroRes.status || 502).json({
        error: 'PayHero returned non-JSON response',
        raw:   rawText.substring(0, 300),
        http_status: payheroRes.status,
      });
    }

    if (!payheroRes.ok) {
      const errMsg = data?.message
        || data?.error
        || (Array.isArray(data?.errors) ? data.errors.join('; ') : null)
        || `PayHero request failed (HTTP ${payheroRes.status})`;
      console.error('[stk-push] PayHero error:', errMsg, data);
      return res.status(payheroRes.status).json({
        error:       errMsg,
        details:     data,
        http_status: payheroRes.status,
      });
    }

    // Success — STK push was sent; guest will see M-Pesa prompt
    return res.status(200).json({
      success:           true,
      message:           'STK push sent — check your phone',
      reference,
      payhero_response:  data,
    });

  } catch (err) {
    console.error('[stk-push] Unhandled error:', err);
    return res.status(500).json({
      error:   'Internal server error',
      details: err.message,
    });
  }
}
