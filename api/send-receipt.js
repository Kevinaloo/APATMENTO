/* ════════════════════════════════════════════════════════════════
   APATMENTO — /api/send-receipt.js
   Sends beautifully designed email receipts after confirmed bookings.
   Uses Resend (free tier: 3,000 emails/month) OR falls back to 
   Supabase Edge Functions. WhatsApp via CallMeBot free API.
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'bookings@apatmento.space';

function buildEmailHTML({ booking, listing, user }) {
  const formatKES = n => `KES ${Number(n).toLocaleString('en-KE')}`;
  const formatDate = d => new Date(d).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'long', year:'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Confirmed — Apatmento</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FC;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4361FF,#7B2FF7);border-radius:20px;padding:32px 32px 24px;margin-bottom:20px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🎉</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Booking Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px;">Your Apatmento booking is all set</p>
    </div>

    <!-- Booking ref pill -->
    <div style="background:#fff;border-radius:16px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;border:1.5px solid rgba(67,97,255,0.15);">
      <div>
        <div style="font-size:11px;font-weight:700;color:#8E90AD;letter-spacing:0.08em;text-transform:uppercase;">Booking Reference</div>
        <div style="font-size:20px;font-weight:800;color:#4361FF;letter-spacing:1px;font-family:monospace;">${booking.reference}</div>
      </div>
      <div style="background:rgba(67,97,255,0.08);border-radius:100px;padding:6px 14px;">
        <span style="font-size:12px;font-weight:700;color:#4361FF;">✓ Confirmed</span>
      </div>
    </div>

    <!-- Property -->
    <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0A0A14;">${listing.name}</h2>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <span style="background:#F1F2F8;border-radius:100px;padding:4px 12px;font-size:12px;color:#636480;">📍 ${listing.location}</span>
        ${listing.type ? `<span style="background:#F1F2F8;border-radius:100px;padding:4px 12px;font-size:12px;color:#636480;">${listing.type}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#F8F9FF;border-radius:12px;padding:14px;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Check-in</div>
          <div style="font-weight:700;color:#0A0A14;font-size:14px;">${formatDate(booking.checkin)}</div>
          <div style="font-size:12px;color:#636480;">From 2:00 PM</div>
        </div>
        <div style="background:#F8F9FF;border-radius:12px;padding:14px;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Check-out</div>
          <div style="font-weight:700;color:#0A0A14;font-size:14px;">${formatDate(booking.checkout)}</div>
          <div style="font-size:12px;color:#636480;">By 11:00 AM</div>
        </div>
      </div>
    </div>

    <!-- Price breakdown -->
    <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#0A0A14;">Price Breakdown</h3>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F2F8;font-size:14px;color:#636480;">
        <span>${formatKES(listing.pricePerNight)} × ${booking.nights} night${booking.nights>1?'s':''}</span>
        <span>${formatKES(booking.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F2F8;font-size:14px;color:#636480;">
        <span>Service fee</span>
        <span>${formatKES(booking.fee)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:16px;font-weight:800;color:#0A0A14;">
        <span>Total paid</span>
        <span style="color:#4361FF;">${formatKES(booking.total)}</span>
      </div>
    </div>

    <!-- Access codes -->
    <div style="background:linear-gradient(135deg,rgba(67,97,255,0.06),rgba(123,47,247,0.04));border:1.5px solid rgba(67,97,255,0.2);border-radius:16px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#0A0A14;">🔑 Your Access Codes</h3>
      <p style="margin:0 0 14px;font-size:13px;color:#636480;line-height:1.55;">Share your Guest Code with the host at check-in. Keep the Host Code private — you'll need it to release payment.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#fff;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Guest Code</div>
          <div style="font-size:22px;font-weight:800;color:#4361FF;letter-spacing:3px;font-family:monospace;">${booking.guestCode}</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:14px;text-align:center;border:1.5px dashed rgba(123,47,247,0.3);">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Host Code 🔒</div>
          <div style="font-size:22px;font-weight:800;color:#7B2FF7;letter-spacing:3px;font-family:monospace;">${booking.hostCode}</div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://www.apatmento.space/my-bookings.html" 
         style="display:inline-block;background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:700;font-size:15px;letter-spacing:-0.2px;">
        View My Booking →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid #E8E9F0;">
      <p style="font-size:12px;color:#8E90AD;margin:0 0 8px;"><strong>Apatmento</strong> — Zero Commission. Always.</p>
      <p style="font-size:11px;color:#B0B3C8;margin:0;">
        Questions? Chat with us at <a href="https://www.apatmento.space" style="color:#4361FF;text-decoration:none;">apatmento.space</a><br>
        This is an automated receipt. Keep it safe.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { booking, listing, user, sendWhatsApp = false } = body;

  if (!booking || !listing || !user?.email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const results = { email: false, whatsapp: false };

  // ── Send Email via Resend ──
  if (RESEND_KEY) {
    try {
      const html = buildEmailHTML({ booking, listing, user });
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Apatmento Bookings <${FROM_EMAIL}>`,
          to: [user.email],
          subject: `✅ Booking Confirmed — ${listing.name} | Ref: ${booking.reference}`,
          html,
        }),
      });
      if (!emailRes.ok) {
        const errBody = await emailRes.json().catch(() => ({}));
        console.error('Resend failed:', emailRes.status, JSON.stringify(errBody));
        // If domain not verified, log the issue
        if (errBody.name === 'validation_error' || errBody.statusCode === 422) {
          console.error('RESEND: Domain apatmento.space not verified. Visit resend.com/domains to verify.');
        }
        results.email_error = errBody.message || emailRes.status;
      }
      results.email = emailRes.ok;
    } catch (e) {
      console.error('Email send failed:', e.message);
      results.email_error = e.message;
    }
  }

  // ── WhatsApp via CallMeBot (free, no approval needed for personal use) ──
  // For production: use Twilio or Meta Cloud API  
  if (sendWhatsApp && user.phone) {
    try {
      const waKey = process.env.CALLMEBOT_KEY;
      if (waKey) {
        const msg = encodeURIComponent(
          `✅ *Apatmento Booking Confirmed!*\n\n` +
          `*${listing.name}*\n` +
          `📍 ${listing.location}\n` +
          `📅 ${new Date(booking.checkin).toDateString()} → ${new Date(booking.checkout).toDateString()}\n` +
          `💰 KES ${Number(booking.total).toLocaleString()}\n\n` +
          `🔑 Guest Code: *${booking.guestCode}*\n` +
          `🔒 Host Code: *${booking.hostCode}*\n\n` +
          `Ref: ${booking.reference}\nView booking: apatmento.space/my-bookings.html`
        );
        const phone = user.phone.replace(/\D/g,'');
        const waRes = await fetch(
          `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${msg}&apikey=${waKey}`,
          { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }
        );
        results.whatsapp = waRes.ok;
      }
    } catch (e) {
      console.error('WhatsApp send failed:', e.message);
    }
  }

  return res.status(200).json({ ok: true, results });
  // Note: to send from bookings@apatmento.space, verify domain at resend.com/domains
}
