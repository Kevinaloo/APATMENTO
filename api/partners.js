/* ════════════════════════════════════════════════════════════════════════
   APATMENTO · PARTNER PROGRAM API   /api/partners.js
   Routes via ?action=
     apply     (public)  → create application, hash password, email applicant
     approve   (admin)   → create auth user, insert partner, email w/ rate
     decline   (admin)   → mark declined, send polite rejection
     queue     (admin)   → list applications
     defaults  (admin)   → get/set default commission per role

   Security posture:
     · Passwords are bcrypt-hashed the moment they arrive. Never stored raw.
     · Admin actions require a Bearer access token belonging to an ADMIN email.
       We verify it against Supabase — we do not trust a header or a flag.
     · The service-role key never leaves this file.
   ════════════════════════════════════════════════════════════════════════ */
import bcrypt from 'bcryptjs';

export const config = { maxDuration: 30 };

const SUPA_URL      = process.env.SUPABASE_URL || 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY    = process.env.RESEND_API_KEY;
const FROM          = 'Apatmento <partners@apatmento.space>';
const SITE          = 'https://apatmento.space';
const ADMINS        = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

/* ── tiny supabase REST helper (service role) ────────────────────────── */
async function db(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!r.ok) throw Object.assign(new Error(json?.message || text || 'db error'), { status: r.status, body: json });
  return json;
}

/* ── verify the caller is a real, signed-in admin ────────────────────── */
async function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw Object.assign(new Error('Not authenticated'), { status: 401 });

  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw Object.assign(new Error('Invalid session'), { status: 401 });
  const user = await r.json();
  const email = (user?.email || '').toLowerCase();
  if (!ADMINS.includes(email)) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return user;
}

/* ── email ───────────────────────────────────────────────────────────── */
async function sendMail({ to, subject, html }) {
  if (!RESEND_KEY) { console.warn('[partners] RESEND_API_KEY missing — skipping email'); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!r.ok) { console.error('[resend]', r.status, await r.text()); return false; }
    return true;
  } catch (e) { console.error('[resend]', e.message); return false; }
}

/* ── email shell — matches the brand, works in Gmail/Outlook ─────────── */
function shell({ emoji, title, sub, body, cta, ctaUrl, accent = '#7B2FF7,#4361FF' }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FC;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,${accent});border-radius:20px;padding:40px 32px;text-align:center;margin-bottom:20px;">
    <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
    <h1 style="color:#fff;margin:0;font-size:27px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    ${sub ? `<p style="color:rgba(255,255,255,0.88);margin:10px 0 0;font-size:15px;line-height:1.6;">${sub}</p>` : ''}
  </div>
  <div style="background:#fff;border-radius:16px;padding:28px 24px;margin-bottom:16px;color:#1A1B2E;font-size:14px;line-height:1.7;">
    ${body}
    ${cta ? `<div style="text-align:center;margin-top:26px;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${accent});color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">${cta}</a>
    </div>` : ''}
  </div>
  <p style="text-align:center;color:#8E90AD;font-size:12px;line-height:1.6;margin:0;">
    Apatmento · Nairobi, Kenya<br>
    <a href="${SITE}" style="color:#8E90AD;">apatmento.space</a>
  </p>
</div></body></html>`;
}

/* ── templates ───────────────────────────────────────────────────────── */
const T = {
  received: (name, role) => ({
    subject: `We've got your ${role} application, ${name.split(' ')[0]} 🎬`,
    html: shell({
      emoji: role === 'influencer' ? '🎬' : '🤝',
      title: 'Application received',
      sub: `Thanks for wanting to build Apatmento with us.`,
      body: `<p style="margin:0 0 16px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 16px;">Your application to join the Apatmento <strong>${role}</strong> programme just landed on our desk. A real human reads every one of these — usually within <strong>48 hours</strong>.</p>
<div style="background:#F4F5FB;border-radius:12px;padding:18px;margin:20px 0;">
  <strong style="font-size:13px;color:#0A0A14;">What happens next</strong>
  <div style="margin-top:12px;font-size:13px;color:#4A4C66;line-height:1.9;">
    1. We review your profile and fit<br>
    2. You get a yes or a no — either way, you'll hear from us<br>
    3. If it's a yes, we send your commission rate and you sign in
  </div>
</div>
<p style="margin:0;color:#4A4C66;">No need to do anything right now. Keep an eye on this inbox.</p>`,
    }),
  }),

  approved: (name, role, rate, code) => ({
    subject: `You're in. Welcome to Apatmento, ${name.split(' ')[0]} 🎉`,
    html: shell({
      emoji: '🎉',
      title: "You're approved",
      sub: `Your ${role} account is live.`,
      accent: '#2DD4BF,#4361FF',
      body: `<p style="margin:0 0 16px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 20px;">We reviewed your application and we'd love to have you. You're officially an Apatmento <strong>${role}</strong>.</p>

<div style="background:linear-gradient(135deg,rgba(45,212,191,.1),rgba(67,97,255,.08));border:1px solid rgba(45,212,191,.3);border-radius:14px;padding:22px;margin:0 0 20px;text-align:center;">
  <div style="font-size:12px;color:#4A4C66;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your commission rate</div>
  <div style="font-size:42px;font-weight:800;color:#0E9384;margin:6px 0;letter-spacing:-1px;">${rate}%</div>
  <div style="font-size:13px;color:#4A4C66;">on every booking you bring in</div>
</div>

<div style="background:#F4F5FB;border-radius:12px;padding:18px;margin:0 0 20px;">
  <div style="font-size:12px;color:#8E90AD;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">Your referral code</div>
  <div style="font-family:monospace;font-size:22px;font-weight:700;color:#7B2FF7;letter-spacing:2px;">${code}</div>
  <div style="font-size:12px;color:#8E90AD;margin-top:8px;">Share <span style="color:#4A4C66;">${SITE}/?ref=${code}</span> — every signup and booking through it is tracked to you.</div>
</div>

<p style="margin:0 0 8px;"><strong>Signing in:</strong> use the email and password you chose when you applied. Head to the <em>Partners</em> tab on the sign-in page.</p>
<p style="margin:0;color:#4A4C66;font-size:13px;">Your dashboard shows clicks, signups, conversions and earnings — updated live. Your numbers are private to you.</p>`,
      cta: 'Sign in to your dashboard',
      ctaUrl: `${SITE}/auth.html?panel=partner`,
    }),
  }),

  declined: (name, role, reason) => ({
    subject: `About your Apatmento ${role} application`,
    html: shell({
      emoji: '🌱',
      title: 'Not this time',
      sub: 'But that is genuinely not a no forever.',
      accent: '#8E90AD,#4A4C66',
      body: `<p style="margin:0 0 16px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 16px;">Thanks for applying to the Apatmento <strong>${role}</strong> programme. We read it properly, and this time we're not moving forward.</p>
${reason ? `<div style="background:#F4F5FB;border-left:3px solid #8E90AD;border-radius:8px;padding:16px;margin:0 0 20px;font-size:13px;color:#4A4C66;"><strong style="color:#0A0A14;">Why:</strong><br>${reason}</div>` : ''}
<p style="margin:0 0 16px;">That's a decision about fit right now — not about your worth or your work. Our bar moves as the programme grows, and plenty of people we said "not yet" to are with us today.</p>
<p style="margin:0;color:#4A4C66;">You're welcome to apply again in <strong>90 days</strong>. In the meantime, you can still use Apatmento as a traveller — and we hope you do.</p>`,
      cta: 'Explore Apatmento',
      ctaUrl: SITE,
    }),
  }),
};

/* ── util ────────────────────────────────────────────────────────────── */
const ok    = (v) => typeof v === 'string' && v.trim().length > 0;
const isMail= (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

function refCode(name, role) {
  const base = (name || 'apa').replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'APA';
  const tag  = role === 'influencer' ? 'IN' : 'AG';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${tag}${rand}`;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/* ════════════════════════════════════════════════════════════════════════
   APPLY  — public
   ════════════════════════════════════════════════════════════════════════ */
async function handleApply(req, res) {
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const role = b.role === 'influencer' ? 'influencer' : b.role === 'agent' ? 'agent' : null;

  if (!role)                       return res.status(400).json({ error: 'Pick agent or influencer.' });
  if (!ok(b.full_name))            return res.status(400).json({ error: 'Your name is required.' });
  if (!isMail(b.email))            return res.status(400).json({ error: 'That email does not look right.' });
  if (!['call','sms','whatsapp','email'].includes(b.contact_method))
                                   return res.status(400).json({ error: 'Choose how we should reach you.' });
  if (!ok(b.contact_value))        return res.status(400).json({ error: 'Add your contact details.' });
  if (!ok(b.password) || b.password.length < 8)
                                   return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (role === 'influencer') {
    if (!ok(b.nickname))           return res.status(400).json({ error: 'Nickname is required.' });
    if (!ok(b.social_handle))      return res.status(400).json({ error: 'Social handle is required.' });
  }

  const email = b.email.trim().toLowerCase();

  // Already an approved partner?
  const existing = await db(`partners?email=eq.${encodeURIComponent(email)}&select=id`);
  if (existing?.length) return res.status(409).json({ error: 'You already have a partner account. Try signing in.' });

  // Already pending?
  const pending = await db(`partner_applications?email=eq.${encodeURIComponent(email)}&status=eq.pending&select=id`);
  if (pending?.length) return res.status(409).json({ error: "You've already applied — we're reviewing it. Hang tight." });

  const password_hash = await bcrypt.hash(b.password, 12);

  const row = {
    role,
    full_name: b.full_name.trim(),
    email,
    contact_method: b.contact_method,
    contact_value: b.contact_value.trim(),
    password_hash,
    nickname:        role === 'influencer' ? b.nickname?.trim()        : null,
    social_handle:   role === 'influencer' ? b.social_handle?.trim()   : null,
    social_platform: role === 'influencer' ? (b.social_platform || null) : null,
    audience_size:   role === 'influencer' ? (parseInt(b.audience_size, 10) || null) : null,
    user_agent: (req.headers['user-agent'] || '').slice(0, 400),
  };

  const [app] = await db('partner_applications', {
    method: 'POST', body: row, prefer: 'return=representation',
  });

  const t = T.received(row.full_name, role);
  sendMail({ to: email, subject: t.subject, html: t.html }); // fire & forget

  // ping admins
  ADMINS.forEach((a) => sendMail({
    to: a,
    subject: `New ${role} application — ${row.full_name}`,
    html: shell({
      emoji: '📥', title: 'New application',
      sub: `${row.full_name} · ${role}`,
      body: `<p style="margin:0 0 12px;"><strong>Email:</strong> ${email}</p>
<p style="margin:0 0 12px;"><strong>Contact:</strong> ${row.contact_method} — ${row.contact_value}</p>
${row.nickname ? `<p style="margin:0 0 12px;"><strong>Nickname:</strong> ${row.nickname}</p>` : ''}
${row.social_handle ? `<p style="margin:0 0 12px;"><strong>Social:</strong> ${row.social_handle} ${row.social_platform ? `(${row.social_platform})` : ''}</p>` : ''}
${row.audience_size ? `<p style="margin:0 0 12px;"><strong>Audience:</strong> ${row.audience_size.toLocaleString()}</p>` : ''}`,
      cta: 'Review in admin', ctaUrl: `${SITE}/admin.html#partners`,
    }),
  }));

  return res.status(200).json({ ok: true, id: app.id, message: "Application received. We'll email you within 48 hours." });
}

/* ════════════════════════════════════════════════════════════════════════
   APPROVE — admin. Creates the auth account, then the partner row.
   ════════════════════════════════════════════════════════════════════════ */
async function handleApprove(req, res) {
  const admin = await requireAdmin(req);
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!ok(b.application_id)) return res.status(400).json({ error: 'application_id required' });

  const [app] = await db(`partner_applications?id=eq.${b.application_id}&select=*`);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(409).json({ error: `Already ${app.status}.` });

  // rate: explicit override, else role default
  let rate = b.rate_pct != null ? Number(b.rate_pct) : null;
  if (rate == null) {
    const [d] = await db(`partner_commission_defaults?role=eq.${app.role}&select=rate_pct`);
    rate = Number(d?.rate_pct ?? (app.role === 'influencer' ? 12 : 7));
  }
  if (!(rate >= 0 && rate <= 100)) return res.status(400).json({ error: 'Rate must be 0–100.' });

  /* Create the auth user with the hash we stored at apply time.
     Supabase admin API accepts a bcrypt hash via password_hash — the
     applicant's original password just works. No reset needed. */
  const createRes = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: app.email,
      password_hash: app.password_hash,
      email_confirm: true,
      user_metadata: {
        full_name: app.full_name,
        partner_role: app.role,
        nickname: app.nickname || null,
      },
    }),
  });

  const authUser = await createRes.json();
  if (!createRes.ok) {
    if (createRes.status === 422 || /already/i.test(authUser?.msg || authUser?.message || '')) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('[approve] auth create failed', authUser);
    return res.status(500).json({ error: 'Could not create the account.' });
  }

  const code = refCode(app.nickname || app.full_name, app.role);

  await db('partners', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      id: authUser.id,
      application_id: app.id,
      role: app.role,
      full_name: app.full_name,
      email: app.email,
      nickname: app.nickname,
      social_handle: app.social_handle,
      social_platform: app.social_platform,
      contact_method: app.contact_method,
      contact_value: app.contact_value,
      commission_pct: rate,
      referral_code: code,
      approved_by: admin.id,
    },
  });

  await db(`partner_applications?id=eq.${app.id}`, {
    method: 'PATCH',
    body: { status: 'approved', reviewed_by: admin.id, reviewed_at: new Date().toISOString(), granted_rate_pct: rate },
  });

  const t = T.approved(app.full_name, app.role, rate, code);
  await sendMail({ to: app.email, subject: t.subject, html: t.html });

  return res.status(200).json({ ok: true, partner_id: authUser.id, referral_code: code, rate_pct: rate });
}

/* ════════════════════════════════════════════════════════════════════════
   DECLINE — admin
   ════════════════════════════════════════════════════════════════════════ */
async function handleDecline(req, res) {
  const admin = await requireAdmin(req);
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!ok(b.application_id)) return res.status(400).json({ error: 'application_id required' });

  const [app] = await db(`partner_applications?id=eq.${b.application_id}&select=*`);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(409).json({ error: `Already ${app.status}.` });

  await db(`partner_applications?id=eq.${app.id}`, {
    method: 'PATCH',
    body: {
      status: 'declined',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      decline_reason: b.reason || null,
      admin_notes: b.notes || null,
    },
  });

  const t = T.declined(app.full_name, app.role, b.reason);
  await sendMail({ to: app.email, subject: t.subject, html: t.html });

  return res.status(200).json({ ok: true });
}

/* ════════════════════════════════════════════════════════════════════════
   QUEUE / DEFAULTS — admin
   ════════════════════════════════════════════════════════════════════════ */
async function handleQueue(req, res) {
  await requireAdmin(req);
  const status = req.query.status;
  const q = status ? `v_partner_queue?status=eq.${status}&select=*` : 'v_partner_queue?select=*';
  return res.status(200).json({ ok: true, applications: await db(q) });
}

async function handleDefaults(req, res) {
  const admin = await requireAdmin(req);
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, defaults: await db('partner_commission_defaults?select=*') });
  }
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const role = b.role, rate = Number(b.rate_pct);
  if (!['agent','influencer'].includes(role)) return res.status(400).json({ error: 'Bad role' });
  if (!(rate >= 0 && rate <= 100))            return res.status(400).json({ error: 'Rate must be 0–100.' });

  await db(`partner_commission_defaults?role=eq.${role}`, {
    method: 'PATCH',
    body: { rate_pct: rate, updated_at: new Date().toISOString(), updated_by: admin.id },
  });
  return res.status(200).json({ ok: true });
}

/* ════════════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server not configured.' });

  const action = req.query.action;
  try {
    if (action === 'apply'    && req.method === 'POST') return await handleApply(req, res);
    if (action === 'approve'  && req.method === 'POST') return await handleApprove(req, res);
    if (action === 'decline'  && req.method === 'POST') return await handleDecline(req, res);
    if (action === 'queue'    && req.method === 'GET')  return await handleQueue(req, res);
    if (action === 'defaults')                          return await handleDefaults(req, res);
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('[partners]', action, e.message, e.body || '');
    return res.status(status).json({ error: status >= 500 ? 'Something went wrong.' : e.message });
  }
}
