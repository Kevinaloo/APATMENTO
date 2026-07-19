/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Utilities  /api/utilities.js
   Routes: ?action=verify-checkin | ...
   Consolidates small utility handlers into 1 function
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

import { WebSocket } from 'ws';

/* ══════════════════════════════════════
   EDGE TTS  (merged from api/tts.js)
   Microsoft Edge neural TTS — no API key needed, always free.
   Voice: en-US-AriaNeural — warm, human-sounding female voice.
══════════════════════════════════════ */
const TTS_PRIMARY_VOICE = 'en-US-AriaNeural';
const TTS_RATE    = '+8%';
const TTS_PITCH   = '+2Hz';
const TTS_MAX_CHARS = 600;
const EDGE_WS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=';

function ttsUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, c => { const r=Math.random()*16|0; return(c==='x'?r:(r&0x3|0x8)).toString(16); })
    .replace(/-/g,'');
}
function ttsSSML(text, voice) {
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='${TTS_RATE}' pitch='${TTS_PITCH}'>${safe}</prosody></voice></speak>`;
}
function edgeTTS(text, voice) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(EDGE_WS + ttsUUID(), {
      headers: {
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
    });
    const chunks=[]; const reqId=ttsUUID(); let settled=false;
    const done=(err,buf)=>{ if(settled)return; settled=true; try{if(ws.readyState===1)ws.close();}catch(_){} err?reject(err):resolve(buf); };
    const timer=setTimeout(()=>done(new Error('Edge TTS timeout')),12000);
    ws.on('open',()=>{
      ws.send(`X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`+JSON.stringify({context:{synthesis:{audio:{metadataoptions:{sentenceBoundaryEnabled:false,wordBoundaryEnabled:false},outputFormat:'audio-24khz-96kbitrate-mono-mp3'}}}}));
      ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n`+ttsSSML(text,voice));
    });
    ws.on('message',(data,isBinary)=>{
      if(isBinary){const M=Buffer.from('Path:audio\r\n');const i=data.indexOf(M);if(i!==-1)chunks.push(data.slice(i+M.length));return;}
      if(data.toString().includes('Path:turn.end')){clearTimeout(timer);chunks.length?done(null,Buffer.concat(chunks)):done(new Error('No audio'));}
    });
    ws.on('error',err=>{clearTimeout(timer);done(err);});
  });
}

async function handleTTS(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  const raw=(req.query.text||'').trim();
  const voice=(req.query.voice||TTS_PRIMARY_VOICE).trim();
  if(!raw) return res.status(400).json({error:'text required'});
  const text=raw.replace(/\[\[.*?\]\]/g,'').replace(/https?:\/\/\S+/g,'').replace(/\/[-a-z.]+\.html/g,'').replace(/[*_#`>~|]/g,'').replace(/\s{2,}/g,' ').trim().slice(0,TTS_MAX_CHARS);
  if(!text) return res.status(400).json({error:'text empty after cleaning'});
  try {
    const mp3=await edgeTTS(text,voice);
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Length',mp3.length);
    res.setHeader('Cache-Control','private, max-age=60');
    return res.status(200).end(mp3);
  } catch(err) {
    console.error('[tts]',err.message);
    return res.status(503).json({error:'TTS unavailable'});
  }
}

/* ══════════════════════════════════════
   VERIFY CHECKIN
══════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   APATMENTO — Dual Check-In Code Verifier & Payout Release
   Vercel Serverless Function (api/verify-checkin.js)
   Called at: /api/verify-checkin

   POST body: { table, reference, role, code }
   role: 'guest' (submitting host's code) | 'host' (submitting guest's code)
   Once BOTH codes verified → status 'checked_in' → payout to host.
══════════════════════════════════════════════════════════════ */

async function handleVerifyCheckin(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { table, reference, role, code } = req.body;

    const allowedTables = ['apartment_bookings', 'tour_bookings', 'event_tickets'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Fetch the booking
    const fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${encodeURIComponent(reference)}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await fetchRes.json();
    const booking = rows?.[0];

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status === 'checked_in') {
      return res.status(200).json({ success: true, status: 'already_checked_in' });
    }
    if (booking.status !== 'paid_pending_checkin') {
      return res.status(400).json({ error: 'Booking not in pending check-in state', status: booking.status });
    }

    // ── VERIFY CODE ──
    let updatePayload = {};
    let errorMsg = null;

    if (role === 'guest') {
      if (code.trim().toUpperCase() !== (booking.host_code || '').trim().toUpperCase()) {
        errorMsg = 'Incorrect host code. Please ask your host for their HOST-XXXXXX code.';
      } else {
        updatePayload.guest_verified = true;
      }
    } else if (role === 'host') {
      if (code.trim().toUpperCase() !== (booking.guest_code || '').trim().toUpperCase()) {
        errorMsg = 'Incorrect guest code. Please ask your guest for their GUEST-XXXXXX code.';
      } else {
        updatePayload.host_verified = true;
      }
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (errorMsg) return res.status(400).json({ error: errorMsg });

    // ── CHECK IF BOTH NOW VERIFIED ──
    const guestNowVerified = role === 'guest' ? true : booking.guest_verified;
    const hostNowVerified  = role === 'host'  ? true : booking.host_verified;
    const bothVerified = guestNowVerified && hostNowVerified;

    if (bothVerified) {
      updatePayload.status        = 'checked_in';
      updatePayload.checked_in_at = new Date().toISOString();
    }

    // ── UPDATE SUPABASE ──
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${encodeURIComponent(reference)}`,
      {
        method:  'PATCH',
        headers: {
          apikey:         serviceKey,
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer:         'return=minimal',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error('Supabase update error:', err);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    // ── IF BOTH VERIFIED — TRIGGER PAYOUT VIA PAYHERO ──
    if (bothVerified) {
      const netAmount = Number(booking.grand_total || 0) - Number(booking.service_fee || 0);
      const payoutPhone = booking.host_mpesa || booking.contact_phone;

      if (payoutPhone && netAmount > 0 && process.env.PAYHERO_USERNAME) {
        const authToken = Buffer.from(
          `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`
        ).toString('base64');

        try {
          const payoutRes = await fetch(
            'https://backend.payhero.co.ke/api/v2/payments',
            {
              method:  'POST',
              headers: { Authorization: `Basic ${authToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount:             Math.round(netAmount),
                phone_number:       payoutPhone.replace(/^\+/, '').replace(/^0/, '254'),
                channel_id:         String(process.env.PAYHERO_CHANNEL_ID).trim(),
                provider:           'm-pesa',
                external_reference: `PAYOUT-${reference}`,
                callback_url:       `https://${req.headers.host}/api/stk-callback`,
              }),
            }
          );
          const payoutData = await payoutRes.json();
          console.log('Payout initiated:', JSON.stringify(payoutData));
        } catch (payoutErr) {
          console.error('Payout error (booking still checked in):', payoutErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        status: 'checked_in',
        message: 'Both codes verified. Check-in confirmed. Payout released to host.',
        net_payout: netAmount,
      });
    }

    return res.status(200).json({
      success: true,
      status: role === 'guest' ? 'guest_verified' : 'host_verified',
      message: role === 'guest'
        ? 'Your code accepted. Waiting for host to enter your guest code.'
        : 'Guest code accepted. Waiting for guest to enter your host code.',
      waiting_for: role === 'guest' ? 'host_to_verify' : 'guest_to_verify',
    });

  } catch (err) {
    console.error('verify-checkin error:', err);
    return res.status(500).json({ error: err.message });
  }
}



/* ══════════════════════════════════════
   WELCOME EMAIL (on registration)
══════════════════════════════════════ */
async function handleWelcomeEmail(req, res) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { email, name = '' } = body || {};
  if (!email || !RESEND_KEY) return res.status(400).json({ error: 'Missing email or key' });

  const firstName = (name || '').split(' ')[0] || 'there';
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FC;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#4361FF,#7B2FF7);border-radius:20px;padding:40px 32px;text-align:center;margin-bottom:20px;">
      <div style="font-size:44px;margin-bottom:10px;">🎉</div>
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Karibu, ${firstName}!</h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;line-height:1.6;">Welcome to Apatmento — Kenya's zero-commission travel super-app</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;">
      <h2 style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0A0A14;">Here's what you can do right now:</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">🏠</div>
          <div><strong style="font-size:14px;color:#0A0A14;">Book stays</strong><br><span style="font-size:13px;color:#636480;">Short-stay apartments across Nairobi &amp; Kenya — pay only face value</span></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">🦁</div>
          <div><strong style="font-size:14px;color:#0A0A14;">Discover tours &amp; safaris</strong><br><span style="font-size:13px;color:#636480;">From Nairobi National Park to the Mara</span></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">💰</div>
          <div><strong style="font-size:14px;color:#0A0A14;">List &amp; earn 100%</strong><br><span style="font-size:13px;color:#636480;">Hosts keep everything. Zero commission, forever.</span></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">✦</div>
          <div><strong style="font-size:14px;color:#0A0A14;">Meet APA</strong><br><span style="font-size:13px;color:#636480;">Your AI concierge — books anything in seconds, and cracks jokes while doing it</span></div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://www.apatmento.space/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;text-decoration:none;padding:14px 36px;border-radius:100px;font-weight:700;font-size:15px;">Start Exploring →</a>
    </div>
    <div style="text-align:center;padding-top:16px;border-top:1px solid #E8E9F0;">
      <p style="font-size:12px;color:#8E90AD;margin:0;"><strong>Apatmento</strong> — Your World, One App</p>
    </div>
  </div>
</body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Apatmento <welcome@apatmento.space>',
        to: [email],
        subject: `🎉 Karibu ${firstName}! Welcome to Apatmento`,
        html,
      }),
    });
    const ok = r.ok;
    if (!ok) console.error('Welcome email failed:', r.status, await r.text().catch(()=>''));
    return res.status(200).json({ ok });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/* ══════════════════════════════════════
   ROUTER
══════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   INDEX NOW  (merged from api/indexnow.js to stay under
   Vercel Hobby plan's 12-function limit)
══════════════════════════════════════════════════════════════ */
const INDEXNOW_HOST = 'www.apatmento.space';
const INDEXNOW_KEY  = 'cc18b1bc5dc43435c44f29f125a500f5';

async function handleIndexNow(req, res) {
  try {
    let urls;
    const single = req.query?.url ? String(req.query.url) : null;

    if (single) {
      const path = single.startsWith('http') ? new URL(single).pathname : single;
      urls = ['https://' + INDEXNOW_HOST + (path.startsWith('/') ? path : '/' + path)];
    } else {
      const sm = await fetch('https://' + INDEXNOW_HOST + '/sitemap.xml');
      if (!sm.ok) throw new Error('sitemap fetch failed: ' + sm.status);
      const xml = await sm.text();
      urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
      if (!urls.length) throw new Error('no <loc> entries in sitemap');
    }

    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: 'https://' + INDEXNOW_HOST + '/' + INDEXNOW_KEY + '.txt',
        urlList: urls,
      }),
    });

    res.status(200).json({
      ok: r.status === 200 || r.status === 202,
      indexnow_status: r.status,
      submitted: urls.length,
      urls,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}

export default async function handler(req, res) {
  const action = req.query?.action 
    || (typeof req.body === 'object' ? req.body?.action : null)
    || new URL(req.url || '/', 'http://x').searchParams.get('action')
    || '';

  if (action === 'verify-checkin') {
    return handleVerifyCheckin(req, res);
  }

  if (action === 'welcome-email') {
    return handleWelcomeEmail(req, res);
  }

  if (action === 'indexnow') {
    return handleIndexNow(req, res);
  }

  if (action === 'tts') {
    return handleTTS(req, res);
  }

  return res.status(400).json({ error: 'Unknown action. Available: verify-checkin, welcome-email, indexnow, tts' });
}
