/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero STK Push Initiator
   Vercel Serverless Function (api/stk-push.js)
   Called at: /api/stk-push

   Environment variables required (set in Vercel Dashboard):
     PAYHERO_USERNAME
     PAYHERO_PASSWORD
     PAYHERO_CHANNEL_ID
     SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY
══════════════════════════════════════════════════════════════ */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, phone, reference } = req.body;

    if (!amount || !phone || !reference) {
      return res.status(400).json({ error: 'Missing required fields: amount, phone, reference' });
    }

    // Normalise phone to 254XXXXXXXXX
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (normalizedPhone.startsWith('0'))       normalizedPhone = '254' + normalizedPhone.slice(1);
    else if (/^[71]/.test(normalizedPhone))    normalizedPhone = '254' + normalizedPhone;
    if (!/^254\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use 07XX XXX XXX.' });
    }

    const username  = process.env.PAYHERO_USERNAME;
    const password  = process.env.PAYHERO_PASSWORD;
    const channelId = process.env.PAYHERO_CHANNEL_ID;

    if (!username || !password || !channelId) {
      return res.status(500).json({ error: 'PayHero credentials not configured on server' });
    }

    const authToken   = Buffer.from(`${username}:${password}`).toString('base64');
    const callbackUrl = `https://${req.headers.host}/api/stk-callback`;

    const payload = {
      amount:             Math.round(amount),
      phone_number:       normalizedPhone,
      channel_id:         String(channelId).trim(),
      provider:           'm-pesa',
      external_reference: reference,
      callback_url:       callbackUrl,
    };

    console.log('PayHero payload:', JSON.stringify(payload));

    const response = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    console.log('PayHero status:', response.status, 'body:', rawText);

    let data;
    try { data = JSON.parse(rawText); }
    catch { return res.status(response.status || 500).json({ error: 'PayHero returned non-JSON', raw: rawText.substring(0, 300) }); }

    if (!response.ok) {
      return res.status(response.status).json({
        error:   data?.message || data?.error || data?.errors || 'PayHero request failed',
        details: data,
        status:  response.status,
      });
    }

    return res.status(200).json({ success: true, message: 'STK push sent', payhero_response: data, reference });

  } catch (err) {
    console.error('STK Push error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
