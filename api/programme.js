/* ════════════════════════════════════════════════════════════════════════
   APATMENTO · AGENT & INFLUENCER PROGRAMME API   /api/programme.js
   ────────────────────────────────────────────────────────────────────────
   Routes (via ?action=):
     apply     (public)  → submit application, hash pw, email applicant
     approve   (admin)   → create auth user, insert member, email w/ rate
     decline   (admin)   → reject gracefully, send polite email
     queue     (admin)   → review queue (v_programme_queue)
     member    (member)  → own profile + earnings (read)
     defaults  (admin)   → GET / POST commission defaults
     attribute (service) → record a booking attribution event

   "partner" is NOT used here — that word is reserved for service hosts
   (people who list apartments, rides, tours). This is agents & influencers.

   Security:
     · Passwords bcrypt-hashed at cost 10 (≈80ms). Free — just CPU cycles.
       Cost 10 is OWASP-recommended minimum; 12 is also fine but slower.
     · Admin routes require a real Bearer token verified against Supabase.
     · RLS in the DB backs up every check here — defence in depth.
════════════════════════════════════════════════════════════════════════ */
import bcrypt from 'bcryptjs';

export const config = { maxDuration: 30 };

const SUPA_URL    = process.env.SUPABASE_URL    || 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY  = process.env.RESEND_API_KEY;
const FROM        = 'Apatmento <hello@apatmento.space>';
const SITE        = 'https://www.apatmento.space';
const ADMINS      = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

/* ── Supabase REST helper (service role) ─────────────────────────────── */
async function db(path, { method = 'GET', body, prefer, count } = {}) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  if (count)  headers.Prefer = (headers.Prefer ? headers.Prefer + ',' : '') + `count=${count}`;

  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!r.ok) {
    throw Object.assign(
      new Error(json?.message || json?.error || text || 'db error'),
      { status: r.status, body: json }
    );
  }
  return json;
}

/* ── Verify caller is a signed-in admin ─────────────────────────────── */
async function requireAdmin(req) {
  const auth  = (req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) throw Object.assign(new Error('Not authenticated'), { status: 401 });

  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw Object.assign(new Error('Invalid session'), { status: 401 });
  const user  = await r.json();
  const email = (user?.email || '').toLowerCase().trim();
  if (!ADMINS.includes(email))
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  return user;
}

/* ── Email via Resend ─────────────────────────────────────────────────── */
async function mail({ to, subject, html }) {
  if (!RESEND_KEY) return;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!r.ok) console.error('[resend]', r.status, await r.text());
  } catch (e) { console.error('[resend]', e.message); }
}

/* ── Email shell: matches the Apatmento brand ─────────────────────────── */
function shell({ emoji, title, sub, body, cta, ctaUrl, accent = '#7B2FF7,#4361FF' }) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#F4F5FB;">
<div style="max-width:600px;margin:0 auto;padding:28px 16px;">

  <!-- header gradient -->
  <div style="background:linear-gradient(135deg,${accent});border-radius:22px;padding:42px 32px;text-align:center;margin-bottom:18px;">
    <div style="font-size:46px;line-height:1;margin-bottom:12px;">${emoji}</div>
    <h1 style="color:#fff;margin:0 0 8px;font-size:28px;font-weight:800;letter-spacing:-0.6px;line-height:1.2;">${title}</h1>
    ${sub ? `<p style="color:rgba(255,255,255,0.86);margin:0;font-size:15px;line-height:1.6;">${sub}</p>` : ''}
  </div>

  <!-- body card -->
  <div style="background:#ffffff;border-radius:18px;padding:30px 28px;margin-bottom:16px;box-shadow:0 4px 24px rgba(10,10,20,0.06);">
    ${body}
    ${cta ? `<div style="text-align:center;margin-top:28px;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${accent});color:#fff;text-decoration:none;padding:15px 34px;border-radius:13px;font-weight:700;font-size:15px;letter-spacing:-0.2px;">${cta} →</a>
    </div>` : ''}
  </div>

  <p style="text-align:center;color:#9396B0;font-size:12px;line-height:1.7;margin:0;">
    Apatmento · Kenya's travel super-app<br>
    <a href="${SITE}" style="color:#9396B0;text-decoration:none;">${SITE.replace('https://','')}</a>
  </p>
</div></body></html>`;
}

/* ── Row  ─────────────────────────────────────────────────────────────── */
const kv = (label, val) =>
  `<tr><td style="padding:9px 0;color:#8E90AD;font-size:13px;border-bottom:1px solid #F0F1F9;width:130px;vertical-align:top;">${label}</td>
   <td style="padding:9px 0;color:#1A1B2E;font-size:13px;font-weight:600;border-bottom:1px solid #F0F1F9;">${val}</td></tr>`;

/* ── Email templates ─────────────────────────────────────────────────── */
const T = {

  received: (name, role) => ({
    subject: `We got your ${role} application, ${name.split(' ')[0]} — we'll be in touch 🤝`,
    html: shell({
      emoji: role === 'influencer' ? '🎬' : '🤝',
      title: 'Application received',
      sub: 'A real person reads every one. You\'ll hear back within 48 hours.',
      body: `<p style="margin:0 0 18px;color:#1A1B2E;font-size:15px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 18px;color:#4A4C66;font-size:14px;line-height:1.7;">Your application to join the Apatmento <strong>${role}</strong> programme has landed safely. Here's what happens next:</p>
<div style="background:#F4F5FB;border-radius:14px;padding:20px 22px;margin:0 0 20px;">
  <div style="font-size:13px;color:#4A4C66;line-height:2.1;">
    <div><span style="font-weight:700;color:#0A0A14;">1.</span> We review your application and fit for the programme</div>
    <div><span style="font-weight:700;color:#0A0A14;">2.</span> You'll get a yes or a no — either way, you'll hear from us</div>
    <div><span style="font-weight:700;color:#0A0A14;">3.</span> If it's a yes, we send your commission rate and you sign straight in</div>
  </div>
</div>
<p style="margin:0;color:#8E90AD;font-size:13px;">You don't need to do anything right now. Keep an eye on this inbox.</p>`,
    }),
  }),

  approved: (name, role, rate, code) => ({
    subject: `You're in, ${name.split(' ')[0]}. Welcome to the Apatmento ${role} programme 🎉`,
    html: shell({
      emoji: '🎉',
      title: "You're approved",
      sub: `Your ${role} account is live — sign in now.`,
      accent: '#2DD4BF,#0EA5E9',
      body: `<p style="margin:0 0 18px;color:#1A1B2E;font-size:15px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 22px;color:#4A4C66;font-size:14px;line-height:1.7;">We reviewed your application and we'd love to work with you. You're officially an Apatmento <strong>${role}</strong>.</p>

<div style="background:linear-gradient(135deg,rgba(45,212,191,0.08),rgba(14,165,233,0.06));border:1.5px solid rgba(45,212,191,0.3);border-radius:16px;padding:24px;margin:0 0 22px;text-align:center;">
  <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:8px;">Your commission rate</div>
  <div style="font-size:52px;font-weight:800;color:#0E9384;letter-spacing:-2px;line-height:1;">${rate}%</div>
  <div style="font-size:13px;color:#6B7280;margin-top:8px;">of every booking you drive to Apatmento</div>
</div>

<div style="background:#F4F5FB;border-radius:14px;padding:18px 20px;margin:0 0 22px;">
  <div style="font-size:11px;color:#8E90AD;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;">Your referral code</div>
  <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:800;color:#7B2FF7;letter-spacing:3px;">${code}</div>
  <div style="margin-top:10px;font-size:13px;color:#6B7280;">Share your link: <a href="${SITE}/?ref=${code}" style="color:#4361FF;font-weight:600;">${SITE.replace('https://','www.')}/?ref=${code}</a></div>
  <div style="margin-top:5px;font-size:12px;color:#9396B0;">Every signup and booking through it is tracked to you — permanently.</div>
</div>

<table width="100%" cellpadding="0" cellspacing="0">
  ${kv('Sign in with', 'The email and password you chose when you applied')}
  ${kv('Your portal', '<a href="' + SITE + '/agent-dashboard.html" style="color:#4361FF;">Agent &amp; Influencer portal</a>')}
  ${kv('Earnings', 'Private to you — never shown publicly or to other members')}
</table>`,
      cta: 'Sign in to your dashboard',
      ctaUrl: `${SITE}/auth.html?panel=programme`,
    }),
  }),

  declined: (name, role, reason) => ({
    subject: `About your Apatmento ${role} application`,
    html: shell({
      emoji: '🌱',
      title: 'Not this time',
      sub: "We mean that literally — it's not a no forever.",
      accent: '#6B7280,#4A4C66',
      body: `<p style="margin:0 0 18px;color:#1A1B2E;font-size:15px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 18px;color:#4A4C66;font-size:14px;line-height:1.7;">Thanks for applying to the Apatmento <strong>${role}</strong> programme. We read your application properly, and this time we're not moving forward.</p>
${reason ? `<div style="background:#F4F5FB;border-left:3px solid #CBD5E1;border-radius:0 12px 12px 0;padding:16px 18px;margin:0 0 20px;">
  <div style="font-size:12px;color:#8E90AD;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Why</div>
  <div style="font-size:14px;color:#4A4C66;line-height:1.6;">${reason}</div>
</div>` : ''}
<p style="margin:0 0 16px;color:#4A4C66;font-size:14px;line-height:1.7;">This is a decision about fit right now — not about your worth or the quality of your work. Our programme evolves, and plenty of people we said "not yet" to are with us today.</p>
<p style="margin:0;color:#4A4C66;font-size:14px;line-height:1.7;">You're welcome to apply again in <strong>90 days</strong>. And whatever happens with the programme, Apatmento is yours to use as a traveller — we hope you do.</p>`,
      cta: 'Explore Apatmento',
      ctaUrl: SITE,
    }),
  }),

  adminPing: (app) => ({
    subject: `New ${app.role} application — ${app.full_name}`,
    html: shell({
      emoji: '📥',
      title: 'New application',
      sub: `${app.full_name} wants to be an Apatmento ${app.role}`,
      accent: '#4361FF,#7B2FF7',
      body: `<table width="100%" cellpadding="0" cellspacing="0">
  ${kv('Name', app.full_name)}
  ${kv('Email', app.email)}
  ${kv('Role', app.role)}
  ${kv('Contact', `${app.contact_method} — ${app.contact_value}`)}
  ${app.nickname ? kv('Nickname', app.nickname) : ''}
  ${app.social_handle ? kv('Social', `${app.social_handle}${app.social_platform ? ` (${app.social_platform})` : ''}`) : ''}
  ${app.audience_size ? kv('Audience', Number(app.audience_size).toLocaleString()) : ''}
</table>`,
      cta: 'Review in admin',
      ctaUrl: `${SITE}/admin-programme.html`,
    }),
  }),
};

/* ── Validation helpers ───────────────────────────────────────────────── */
const ok    = (v) => typeof v === 'string' && v.trim().length > 0;
const isMail= (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
const METHODS = ['call','sms','whatsapp','email'];

function refCode(name, role) {
  const base = (name || 'APA').replace(/[^a-zA-Z]/g,'').slice(0,6).toUpperCase().padEnd(3,'X');
  const tag  = role === 'influencer' ? 'IN' : 'AG';
  const rand = Math.random().toString(36).slice(2,6).toUpperCase();
  return `${base}${tag}${rand}`;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

/* ══════════════════════════════════════════════════════════════════════
   APPLY — public
   ══════════════════════════════════════════════════════════════════════ */
async function handleApply(req, res) {
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const role = ['agent','influencer'].includes(b.role) ? b.role : null;

  if (!role)                              return res.status(400).json({ error: 'Choose agent or influencer.' });
  if (!ok(b.full_name))                  return res.status(400).json({ error: 'Your name is required.' });
  if (!isMail(b.email))                  return res.status(400).json({ error: 'That email does not look right.' });
  if (!METHODS.includes(b.contact_method)) return res.status(400).json({ error: 'Choose a contact method.' });
  if (!ok(b.contact_value))              return res.status(400).json({ error: 'Add your contact details.' });
  if (!ok(b.password) || b.password.length < 8)
                                         return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (role === 'influencer') {
    if (!ok(b.nickname))     return res.status(400).json({ error: 'Add your creator nickname.' });
    if (!ok(b.social_handle)) return res.status(400).json({ error: 'Add your social handle.' });
  }

  const email = b.email.trim().toLowerCase();

  // Already an approved member?
  const existing = await db(`programme_members?email=eq.${encodeURIComponent(email)}&select=id`);
  if (existing?.length)
    return res.status(409).json({ error: 'You already have a member account. Sign in from the portal below.' });

  // Already a pending application?
  const pending = await db(
    `programme_applications?email=eq.${encodeURIComponent(email)}&status=eq.pending&select=id`
  );
  if (pending?.length)
    return res.status(409).json({ error: "You've already applied and we're reviewing it. Watch your inbox." });

  // bcrypt cost 10 ≈ 80ms. Free — just CPU. OWASP minimum.
  const password_hash = await bcrypt.hash(b.password, 10);

  const row = {
    role,
    full_name:       b.full_name.trim(),
    email,
    contact_method:  b.contact_method,
    contact_value:   b.contact_value.trim(),
    password_hash,
    nickname:        role === 'influencer' ? (b.nickname?.trim() || null) : null,
    social_handle:   role === 'influencer' ? (b.social_handle?.trim() || null) : null,
    social_platform: role === 'influencer' ? (b.social_platform || null) : null,
    audience_size:   role === 'influencer' ? (parseInt(b.audience_size, 10) || null) : null,
  };

  const [app] = await db('programme_applications', {
    method: 'POST', body: row, prefer: 'return=representation',
  });

  // fire-and-forget emails
  const rt = T.received(row.full_name, role);
  mail({ to: email, subject: rt.subject, html: rt.html });
  const at = T.adminPing(app);
  ADMINS.forEach((a) => mail({ to: a, subject: at.subject, html: at.html }));

  return res.status(200).json({
    ok: true,
    id: app.id,
    message: "Application received. You'll hear back within 48 hours.",
  });
}

/* ══════════════════════════════════════════════════════════════════════
   APPROVE — admin only
   Creates auth account with the stored hash → no reset needed.
   ══════════════════════════════════════════════════════════════════════ */
async function handleApprove(req, res) {
  const admin = await requireAdmin(req);
  const b     = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!ok(b.application_id)) return res.status(400).json({ error: 'application_id required' });

  const [app] = await db(`programme_applications?id=eq.${b.application_id}&select=*`);
  if (!app)                  return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(409).json({ error: `Already ${app.status}.` });

  // rate: explicit override > applicant-suggested > role default
  let rate = b.rate_pct != null ? Number(b.rate_pct) : null;
  if (rate == null) {
    const [d] = await db(`programme_commission_defaults?role=eq.${app.role}&select=rate_pct`);
    rate = Number(d?.rate_pct ?? (app.role === 'influencer' ? 12 : 7));
  }
  if (!(rate >= 0 && rate <= 100)) return res.status(400).json({ error: 'Rate must be 0–100.' });

  // Create auth account using the stored bcrypt hash
  const createRes = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: app.email,
      password_hash: app.password_hash,
      email_confirm: true,
      user_metadata: {
        full_name: app.full_name,
        programme_role: app.role,
        nickname: app.nickname || null,
      },
    }),
  });

  const authUser = await createRes.json();
  if (!createRes.ok) {
    if (/already|duplicate/i.test(authUser?.msg || authUser?.message || ''))
      return res.status(409).json({ error: 'An account with that email already exists.' });
    console.error('[approve] auth create failed', authUser);
    return res.status(500).json({ error: 'Could not create the auth account.' });
  }

  // generate a unique referral code
  let code = refCode(app.nickname || app.full_name, app.role);
  // ensure uniqueness (extremely rare collision, but check)
  const taken = await db(`programme_members?referral_code=eq.${code}&select=id`);
  if (taken?.length) code = refCode(app.full_name, app.role) + Math.random().toString(36).slice(2,4).toUpperCase();

  await db('programme_members', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      id:              authUser.id,
      application_id:  app.id,
      role:            app.role,
      full_name:       app.full_name,
      email:           app.email,
      nickname:        app.nickname || null,
      social_handle:   app.social_handle || null,
      social_platform: app.social_platform || null,
      contact_method:  app.contact_method,
      contact_value:   app.contact_value,
      commission_pct:  rate,
      referral_code:   code,
      approved_by:     admin.id,
    },
  });

  await db(`programme_applications?id=eq.${app.id}`, {
    method: 'PATCH',
    body: {
      status: 'approved',
      reviewed_by:      admin.id,
      reviewed_at:      new Date().toISOString(),
      granted_rate_pct: rate,
    },
  });

  const t = T.approved(app.full_name, app.role, rate, code);
  await mail({ to: app.email, subject: t.subject, html: t.html });

  return res.status(200).json({ ok: true, member_id: authUser.id, referral_code: code, rate_pct: rate });
}

/* ══════════════════════════════════════════════════════════════════════
   DECLINE — admin only
   ══════════════════════════════════════════════════════════════════════ */
async function handleDecline(req, res) {
  const admin = await requireAdmin(req);
  const b     = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!ok(b.application_id)) return res.status(400).json({ error: 'application_id required' });

  const [app] = await db(`programme_applications?id=eq.${b.application_id}&select=*`);
  if (!app)                     return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(409).json({ error: `Already ${app.status}.` });

  await db(`programme_applications?id=eq.${app.id}`, {
    method: 'PATCH',
    body: {
      status:         'declined',
      reviewed_by:    admin.id,
      reviewed_at:    new Date().toISOString(),
      decline_reason: b.reason || null,
      admin_notes:    b.notes  || null,
    },
  });

  const t = T.declined(app.full_name, app.role, b.reason);
  await mail({ to: app.email, subject: t.subject, html: t.html });

  return res.status(200).json({ ok: true });
}

/* ══════════════════════════════════════════════════════════════════════
   QUEUE — admin only
   ══════════════════════════════════════════════════════════════════════ */
async function handleQueue(req, res) {
  await requireAdmin(req);
  const status = req.query.status;
  const path   = status
    ? `v_programme_queue?status=eq.${status}&select=*`
    : 'v_programme_queue?select=*';
  return res.status(200).json({ ok: true, applications: await db(path) });
}

/* ══════════════════════════════════════════════════════════════════════
   DEFAULTS — admin GET / POST
   ══════════════════════════════════════════════════════════════════════ */
async function handleDefaults(req, res) {
  const admin = await requireAdmin(req);
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, defaults: await db('programme_commission_defaults?select=*') });
  }
  const b    = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const role = b.role;
  const rate = Number(b.rate_pct);
  if (!['agent','influencer'].includes(role)) return res.status(400).json({ error: 'Bad role' });
  if (!(rate >= 0 && rate <= 100))            return res.status(400).json({ error: 'Rate must be 0–100.' });

  await db(`programme_commission_defaults?role=eq.${role}`, {
    method: 'PATCH',
    body: { rate_pct: rate, updated_at: new Date().toISOString(), updated_by: admin.id },
  });
  return res.status(200).json({ ok: true });
}

/* ══════════════════════════════════════════════════════════════════════
   ATTRIBUTE — called from booking confirmation
   Records a booking attribution event against a referral code.
   ══════════════════════════════════════════════════════════════════════ */
async function handleAttribute(req, res) {
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!ok(b.ref_code))      return res.status(400).json({ error: 'ref_code required' });
  if (!ok(b.booking_ref))   return res.status(400).json({ error: 'booking_ref required' });
  if (!(Number(b.gross) > 0)) return res.status(400).json({ error: 'gross must be positive' });

  // Use the SQL function — atomically finds member, computes commission, inserts event
  const [result] = await db(
    `rpc/attribute_booking`,
    {
      method: 'POST',
      body: {
        p_ref_code:    b.ref_code.toUpperCase(),
        p_booking_ref: b.booking_ref,
        p_gross:       Number(b.gross),
      },
    }
  );

  if (!result?.ok) return res.status(404).json({ error: result?.reason || 'Code not found or inactive' });

  return res.status(200).json({
    ok: true,
    member_id:  result.member_id,
    commission: result.commission,
    rate_pct:   result.rate_pct,
  });
}

/* ══════════════════════════════════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SERVICE_KEY)             return res.status(500).json({ error: 'Server not configured.' });

  const action = req.query.action;
  try {
    if (action === 'apply'     && req.method === 'POST') return await handleApply(req, res);
    if (action === 'approve'   && req.method === 'POST') return await handleApprove(req, res);
    if (action === 'decline'   && req.method === 'POST') return await handleDecline(req, res);
    if (action === 'queue'     && req.method === 'GET')  return await handleQueue(req, res);
    if (action === 'defaults')                           return await handleDefaults(req, res);
    if (action === 'attribute' && req.method === 'POST') return await handleAttribute(req, res);
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('[programme]', action, e.message, e.body || '');
    return res.status(status).json({ error: status >= 500 ? 'Something went wrong.' : e.message });
  }
}
