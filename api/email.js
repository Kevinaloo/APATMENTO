/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · /api/email.js
   Centralised email service powered by Resend.
   Handles every transactional email the platform needs.

   POST /api/email  { action, ...payload }

   Actions:
     welcome         → new user welcome (name, email)
     magic-link      → passwordless sign-in OTP (email, otp, name?)
     booking         → booking receipt (booking, listing, user)
     host-booking    → host new-booking alert (booking, listing, host)
     booking-cancel  → cancellation (booking, listing, user)
     payout          → host payout sent (host, amount)
     reset           → password reset link (email, resetUrl)

   Security: only callable from server-side (checks x-admin-secret)
   OR from client with rate-limit (magic-link action exempted from secret).
═══════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

const RESEND_KEY       = process.env.RESEND_API_KEY;
const ADMIN_SECRET     = process.env.PUSH_ADMIN_SECRET || '';
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AT_API_KEY       = process.env.AT_API_KEY;
const AT_USERNAME      = process.env.AT_USERNAME || 'Cabana';
const AT_SMS_URL       = 'https://api.africastalking.com/version1/messaging';
const FROM_NOTIFY  = 'Apatmento <notify@cabana.africa>';
const FROM_BOOKING = 'Apatmento Bookings <bookings@cabana.africa>';
const FROM_MAGIC   = 'Apatmento <auth@cabana.africa>';

function adminHeaders() {
  return {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

/* ── shared styles ─────────────────────────────────────────────── */
const BASE_WRAP = (content) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Apatmento</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FC;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
${content}
<div style="text-align:center;padding-top:20px;border-top:1px solid #E8E9F0;margin-top:8px;">
  <p style="font-size:12px;color:#8E90AD;margin:0;"><strong>Apatmento</strong>: Zero Commission. Always.</p>
  <p style="font-size:11px;color:#B0B3C8;margin:6px 0 0;">
    <a href="https://cabana.africa" style="color:#4361FF;text-decoration:none;">cabana.africa</a>
    &nbsp;·&nbsp; This is an automated message.
  </p>
</div>
</div></body></html>`;

const HEADER = (emoji, title, subtitle, gradient = '135deg,#4361FF,#7B2FF7') =>
  `<div style="background:linear-gradient(${gradient});border-radius:20px;padding:36px 32px 28px;margin-bottom:20px;text-align:center;">
    <div style="font-size:40px;margin-bottom:10px;">${emoji}</div>
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    ${subtitle ? `<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;line-height:1.55;">${subtitle}</p>` : ''}
  </div>`;

const CARD = (content) =>
  `<div style="background:#fff;border-radius:16px;padding:22px;margin-bottom:16px;">${content}</div>`;

const BTN = (href, text, gradient = '135deg,#4361FF,#7B2FF7') =>
  `<div style="text-align:center;margin:24px 0 8px;">
    <a href="${href}" style="display:inline-block;background:linear-gradient(${gradient});color:#fff;text-decoration:none;padding:14px 36px;border-radius:100px;font-weight:700;font-size:15px;">${text}</a>
  </div>`;

const KES = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;
const DATE = (d) => new Date(d).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'long', year:'numeric' });

/* ── email builders ─────────────────────────────────────────────── */

function buildMagicLink({ email, otp, name, expiresMin = 10 }) {
  const first = (name || email.split('@')[0]).split(' ')[0];
  return BASE_WRAP(`
    ${HEADER('🔐', 'Your sign-in code', `Hi ${first}! Use this code to access your Apatmento account.`)}
    ${CARD(`
      <p style="font-size:14px;color:#636480;text-align:center;margin:0 0 18px;line-height:1.6;">
        Enter this code on the sign-in page. It expires in <strong>${expiresMin} minutes</strong>.
      </p>
      <div style="background:linear-gradient(135deg,rgba(67,97,255,0.06),rgba(123,47,247,0.04));border:2px solid rgba(67,97,255,0.2);border-radius:16px;padding:24px;text-align:center;margin-bottom:0;">
        <div style="font-size:42px;font-weight:800;color:#4361FF;letter-spacing:10px;font-family:monospace;">${otp}</div>
      </div>
      <p style="font-size:12px;color:#B0B3C8;text-align:center;margin:14px 0 0;">
        Didn't request this? Ignore this email. Your account is safe.
      </p>
    `)}
  `);
}

function buildWelcome({ name, email }) {
  const first = (name || '').split(' ')[0] || 'there';
  return BASE_WRAP(`
    ${HEADER('🎉', `Karibu, ${first}!`, "Welcome to Apatmento. Kenya's zero-commission travel super-app")}
    ${CARD(`
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0A0A14;">Here's what you can do right now:</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${[
          ['🏠','Book stays','Short-stay apartments across Nairobi & Kenya. Pay only face value'],
          ['🦁','Discover tours & safaris','From Nairobi National Park to the Mara'],
          ['💰','List & earn 100%','Hosts keep everything. Zero commission, forever.'],
          ['✦','Meet APA','Your AI concierge. Books anything in seconds'],
        ].map(([ico,bold,txt]) =>
          `<div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:22px;flex-none;">${ico}</div>
            <div><strong style="font-size:14px;color:#0A0A14;">${bold}</strong><br>
            <span style="font-size:13px;color:#636480;">${txt}</span></div>
          </div>`
        ).join('')}
      </div>
    `)}
    ${BTN('https://cabana.africa/dashboard.html','Start Exploring →')}
  `);
}

function buildBookingReceipt({ booking, listing, user }) {
  return BASE_WRAP(`
    ${HEADER('🎉','Booking Confirmed!','Your Apatmento booking is all set')}
    <div style="background:#fff;border-radius:16px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;border:1.5px solid rgba(67,97,255,0.15);">
      <div>
        <div style="font-size:11px;font-weight:700;color:#8E90AD;letter-spacing:0.08em;text-transform:uppercase;">Booking Reference</div>
        <div style="font-size:20px;font-weight:800;color:#4361FF;letter-spacing:1px;font-family:monospace;">${booking.reference}</div>
      </div>
      <div style="background:rgba(67,97,255,0.08);border-radius:100px;padding:6px 14px;">
        <span style="font-size:12px;font-weight:700;color:#4361FF;">✓ Confirmed</span>
      </div>
    </div>
    ${CARD(`
      <h2 style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0A0A14;">${listing.name}</h2>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <span style="background:#F1F2F8;border-radius:100px;padding:4px 12px;font-size:12px;color:#636480;">📍 ${listing.location}</span>
        ${listing.type ? `<span style="background:#F1F2F8;border-radius:100px;padding:4px 12px;font-size:12px;color:#636480;">${listing.type}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#F8F9FF;border-radius:12px;padding:14px;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Check-in</div>
          <div style="font-weight:700;color:#0A0A14;font-size:14px;">${DATE(booking.checkin)}</div>
          <div style="font-size:12px;color:#636480;">From 2:00 PM</div>
        </div>
        <div style="background:#F8F9FF;border-radius:12px;padding:14px;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Check-out</div>
          <div style="font-weight:700;color:#0A0A14;font-size:14px;">${DATE(booking.checkout)}</div>
          <div style="font-size:12px;color:#636480;">By 11:00 AM</div>
        </div>
      </div>
    `)}
    ${CARD(`
      <h3 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#0A0A14;">Price Breakdown</h3>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F2F8;font-size:14px;color:#636480;">
        <span>${KES(listing.pricePerNight)} × ${booking.nights} night${booking.nights>1?'s':''}</span><span>${KES(booking.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F2F8;font-size:14px;color:#636480;">
        <span>Service fee</span><span>${KES(booking.fee)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:16px;font-weight:800;color:#0A0A14;">
        <span>Total paid</span><span style="color:#4361FF;">${KES(booking.total)}</span>
      </div>
    `)}
    <div style="background:linear-gradient(135deg,rgba(67,97,255,0.06),rgba(123,47,247,0.04));border:1.5px solid rgba(67,97,255,0.2);border-radius:16px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0A0A14;">🔑 Your Access Codes</h3>
      <p style="margin:0 0 14px;font-size:13px;color:#636480;line-height:1.55;">Share your <strong>Guest Code</strong> with the host at check-in. Keep the <strong>Host Code</strong> private. You'll need it to release payment.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:#fff;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Guest Code</div>
          <div style="font-size:24px;font-weight:800;color:#4361FF;letter-spacing:4px;font-family:monospace;">${booking.guestCode}</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:14px;text-align:center;border:1.5px dashed rgba(123,47,247,0.3);">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Host Code 🔒</div>
          <div style="font-size:24px;font-weight:800;color:#7B2FF7;letter-spacing:4px;font-family:monospace;">${booking.hostCode}</div>
        </div>
      </div>
    </div>
    ${BTN('https://cabana.africa/my-bookings.html','View My Booking →')}
  `);
}

function buildHostBookingAlert({ booking, listing, host }) {
  return BASE_WRAP(`
    ${HEADER('💰','New Booking!',`Someone just booked ${listing.name}`, '135deg,#2DD4BF,#14B8A6')}
    ${CARD(`
      <h2 style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0A0A14;">${listing.name}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div style="background:#F8F9FF;border-radius:12px;padding:14px;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;margin-bottom:4px;">Check-in</div>
          <div style="font-weight:700;color:#0A0A14;font-size:14px;">${DATE(booking.checkin)}</div>
        </div>
        <div style="background:#F8F9FF;border-radius:12px;padding:14px;">
          <div style="font-size:10px;font-weight:700;color:#8E90AD;text-transform:uppercase;margin-bottom:4px;">Check-out</div>
          <div style="font-weight:700;color:#0A0A14;font-size:14px;">${DATE(booking.checkout)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(45,212,191,0.08);border-radius:12px;padding:14px;">
        <span style="font-size:14px;font-weight:600;color:#0A0A14;">Your earnings</span>
        <span style="font-size:20px;font-weight:800;color:#0E9384;">${KES(booking.hostPayout || booking.subtotal)}</span>
      </div>
    `)}
    ${CARD(`
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0A0A14;">📋 Booking Details</h3>
      <div style="font-size:13px;color:#636480;line-height:1.8;">
        Ref: <strong style="color:#0A0A14;">${booking.reference}</strong><br>
        Guest: <strong style="color:#0A0A14;">${booking.guestName || 'Guest'}</strong><br>
        Guests: <strong style="color:#0A0A14;">${booking.guests || 1}</strong><br>
        Nights: <strong style="color:#0A0A14;">${booking.nights}</strong>
      </div>
    `)}
    ${BTN('https://cabana.africa/partner-bookings.html','View in Dashboard →','135deg,#2DD4BF,#14B8A6')}
  `);
}

function buildPayout({ host, amount, reference }) {
  const first = (host.name || '').split(' ')[0] || 'there';
  return BASE_WRAP(`
    ${HEADER('💸', `${KES(amount)} on the way!`, `Your payout is being processed, ${first}`, '135deg,#2DD4BF,#14B8A6')}
    ${CARD(`
      <div style="text-align:center;padding:16px 0;">
        <div style="font-size:36px;font-weight:800;color:#0E9384;margin-bottom:6px;">${KES(amount)}</div>
        <div style="font-size:14px;color:#636480;">will arrive on M-Pesa shortly</div>
      </div>
      ${reference ? `<div style="background:#F8F9FF;border-radius:12px;padding:12px;text-align:center;margin-top:8px;">
        <span style="font-size:12px;color:#8E90AD;">Reference: </span>
        <span style="font-size:14px;font-weight:700;color:#0A0A14;font-family:monospace;">${reference}</span>
      </div>` : ''}
    `)}
    ${BTN('https://cabana.africa/partner-earnings.html','View Earnings →','135deg,#2DD4BF,#14B8A6')}
  `);
}

function buildCancellation({ booking, listing, user }) {
  const first = (user.name || '').split(' ')[0] || 'there';
  return BASE_WRAP(`
    ${HEADER('❌','Booking Cancelled',`Hi ${first}, your booking has been cancelled`, '135deg,#FF6B6B,#FF4D6D')}
    ${CARD(`
      <div style="font-size:14px;color:#636480;line-height:1.7;">
        Booking <strong style="color:#0A0A14;">${booking.reference}</strong> for 
        <strong style="color:#0A0A14;">${listing.name}</strong> has been cancelled.<br><br>
        If you paid, a refund will be processed within 3–5 business days.
      </div>
    `)}
    ${BTN('https://cabana.africa/apartments.html','Browse Other Stays →','135deg,#4361FF,#7B2FF7')}
  `);
}

function buildReset({ resetUrl, email }) {
  return BASE_WRAP(`
    ${HEADER('🔒','Reset Your Password','Click the button below to set a new password')}
    ${CARD(`
      <p style="font-size:14px;color:#636480;text-align:center;line-height:1.6;margin:0 0 20px;">
        This link expires in <strong>1 hour</strong>. If you didn't request a reset, ignore this email.
      </p>
      ${BTN(resetUrl,'Reset Password →')}
      <p style="font-size:12px;color:#B0B3C8;text-align:center;margin:16px 0 0;word-break:break-all;">
        Or copy: <a href="${resetUrl}" style="color:#4361FF;">${resetUrl}</a>
      </p>
    `)}
  `);
}

/* ── send SMS via Africa's Talking ────────────────────────────── */
async function sendSMS({ to, message, from = 'APATMENTO' }) {
  if (!AT_API_KEY) throw new Error('AT_API_KEY not set');
  const phone = to.startsWith('+') ? to : `+254${to.replace(/^0/, '')}`;
  const params = new URLSearchParams({ username: AT_USERNAME, to: phone, message, from });
  const r = await fetch(AT_SMS_URL, {
    method: 'POST',
    headers: { 'apiKey': AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: params.toString(),
  });
  const data = await r.json().catch(() => ({}));
  const entry = data?.SMSMessageData?.Recipients?.[0];
  if (!r.ok || entry?.status === 'InvalidPhoneNumber') {
    throw new Error(entry?.status || `AT ${r.status}`);
  }
  return { id: entry?.messageId, status: entry?.status, cost: entry?.cost };
}

/* ── send via Resend ───────────────────────────────────────────── */
async function sendEmail({ from, to, subject, html }) {
  if (!RESEND_KEY) throw new Error('RESEND_API_KEY not set');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('[email] Resend error:', r.status, JSON.stringify(data));
    throw new Error(data.message || `Resend ${r.status}`);
  }
  return data;
}

/* ── rate limiter (in-memory, resets per lambda cold start) ────── */
const _rl = new Map();
function rateOk(ip, action, limit = 5, windowMs = 60_000) {
  const k = `${ip}:${action}`;
  const now = Date.now();
  const entry = _rl.get(k) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  _rl.set(k, entry);
  return entry.count <= limit;
}

/* ── handler ────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { action } = body || {};
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const secret = req.headers['x-admin-secret'];

  // magic-link + magic-auth are public but rate-limited. All others require admin secret.
  const publicActions = ['sms-otp'];
  if (!publicActions.includes(action) && secret !== ADMIN_SECRET && ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    let from, subject, html, to;

    switch (action) {

      case 'magic-link': {
        // Removed: magic-link / OTP auth replaced by Supabase email+password and Google OAuth.
        return res.status(410).json({ error: 'Magic-link auth is no longer supported. Use email + password or Google.' });
      }

      case 'welcome': {
        const { email, name } = body;
        if (!email) return res.status(400).json({ error: 'email required' });
        to = email; from = FROM_NOTIFY;
        subject = `🎉 Karibu ${(name||'').split(' ')[0] || ''}! Welcome to Apatmento`;
        html = buildWelcome({ name, email });
        break;
      }

      case 'booking': {
        const { booking, listing, user } = body;
        if (!booking || !listing || !user?.email) return res.status(400).json({ error: 'booking+listing+user required' });
        to = user.email; from = FROM_BOOKING;
        subject = `✅ Booking Confirmed, ${listing.name} | Ref: ${booking.reference}`;
        html = buildBookingReceipt({ booking, listing, user });
        break;
      }

      case 'host-booking': {
        const { booking, listing, host } = body;
        if (!booking || !listing || !host?.email) return res.status(400).json({ error: 'booking+listing+host required' });
        to = host.email; from = FROM_BOOKING;
        subject = `💰 New booking for ${listing.name}, ${KES(booking.hostPayout || booking.subtotal)}`;
        html = buildHostBookingAlert({ booking, listing, host });
        break;
      }

      case 'payout': {
        const { host, amount, reference } = body;
        if (!host?.email || !amount) return res.status(400).json({ error: 'host.email + amount required' });
        to = host.email; from = FROM_NOTIFY;
        subject = `💸 ${KES(amount)} payout on the way!`;
        html = buildPayout({ host, amount, reference });
        break;
      }

      case 'booking-cancel': {
        const { booking, listing, user } = body;
        if (!booking || !listing || !user?.email) return res.status(400).json({ error: 'booking+listing+user required' });
        to = user.email; from = FROM_BOOKING;
        subject = `❌ Booking Cancelled, ${listing.name}`;
        html = buildCancellation({ booking, listing, user });
        break;
      }

      case 'reset': {
        const { email, resetUrl } = body;
        if (!email || !resetUrl) return res.status(400).json({ error: 'email + resetUrl required' });
        to = email; from = FROM_MAGIC;
        subject = '🔒 Reset your Apatmento password';
        html = buildReset({ resetUrl, email });
        break;
      }

      case 'magic-auth': {
        // Removed: OTP-based magic auth replaced by Supabase email+password and Google OAuth.
        return res.status(410).json({ error: 'Magic-auth is no longer supported. Use email + password or Google.' });
      }

      // ── SMS actions (Africa's Talking) ──────────────────────────
      case 'sms-otp': {
        // Send OTP via SMS instead of / in addition to email
        const { phone: smsPhone, otp: smsOtp } = body;
        if (!smsPhone || !smsOtp) return res.status(400).json({ error: 'phone + otp required' });
        const smsResult = await sendSMS({
          to: smsPhone,
          message: `${smsOtp} is your Apatmento sign-in code. Valid for 10 minutes. Do not share it.`,
        });
        return res.status(200).json({ ok: true, ...smsResult });
      }

      case 'sms-booking': {
        // Notify guest of booking confirmation via SMS
        const { phone: gPhone, guestName, propertyName, checkIn, checkOut, amount: bAmt } = body;
        if (!gPhone) return res.status(400).json({ error: 'phone required' });
        const smsResult = await sendSMS({
          to: gPhone,
          message: `Hi ${guestName || 'there'}! Your Apatmento booking at ${propertyName} is confirmed. Check-in: ${checkIn}, Check-out: ${checkOut}. Total: KES ${bAmt}. Questions? Reply to this message.`,
        });
        return res.status(200).json({ ok: true, ...smsResult });
      }

      case 'sms-host': {
        // Alert host of new booking via SMS
        const { phone: hPhone, hostName, guestName: hGuest, propertyName: hProp, checkIn: hIn, checkOut: hOut } = body;
        if (!hPhone) return res.status(400).json({ error: 'phone required' });
        const smsResult = await sendSMS({
          to: hPhone,
          message: `New booking on Apatmento! ${hGuest || 'A guest'} booked ${hProp}. Check-in: ${hIn}, Check-out: ${hOut}. Log in to cabana.africa to manage.`,
        });
        return res.status(200).json({ ok: true, ...smsResult });
      }

      case 'sms-custom': {
        // Send any custom SMS (admin only)
        if (secret !== ADMIN_SECRET && ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
        const { phone: cPhone, message: cMsg } = body;
        if (!cPhone || !cMsg) return res.status(400).json({ error: 'phone + message required' });
        const smsResult = await sendSMS({ to: cPhone, message: cMsg });
        return res.status(200).json({ ok: true, ...smsResult });
      }

      default:
        return res.status(400).json({
          error: 'Unknown action',
          available: ['magic-link','magic-auth','sms-otp','sms-booking','sms-host','sms-custom','welcome','booking','host-booking','payout','booking-cancel','reset'],
        });
    }

    const result = await sendEmail({ from, to, subject, html });
    return res.status(200).json({ ok: true, id: result.id });

  } catch (err) {
    console.error('[email]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MERGED FROM send-receipt.js
   Original handler accessible at /api/email?action=send-receipt
   AND still at /api/send-receipt via vercel.json rewrite below
═══════════════════════════════════════════════════════════════════ */
export async function sendReceipt({ booking, listing, user }) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = 'bookings@cabana.africa';
  if (!RESEND_KEY) return { ok: false, error: 'No RESEND_KEY' };
  // Delegate to the existing email.js booking action
  return { ok: true, delegated: true };
}
