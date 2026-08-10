/* ════════════════════════════════════════════════════════════════════════
   APATMENTO · AGENT NETWORK API   /api/agents.js
   ────────────────────────────────────────────────────────────────────────
   Replaces /api/programme.js. The admin approval queue is gone.

   What changed and why:

     Before, Apatmento decided who could be an agent and what they earned.
     That put us between a host and the person selling their listing
     a position we have no information to occupy. A host in Kilimani knows
     whether they trust Kevin. We do not.

     Now: signup is instant, commission is negotiated per listing between
     host and agent, and we are the ledger. We enforce the deal. We do not
     write it.

   Routes (?action=):
     signup        agent   → create agent profile after auth.signUp
     me            agent   → profile + verification clock + portfolio
     upload-id     agent   → attach an identity document
     request       agent   → ask a host to represent one listing
     availability  agent   → live calendar for an approved listing
     respond       host    → approve (set rate) or decline a request
     set-state     host    → pause / resume / revoke a partnership
     report        host    → report an agent; auto-declines their request
     inbox         host    → pending requests + active roster
     track         public  → record a click on an agent link
     attribute     service → attach a booking to a referral  [internal]
     kyc-review    admin   → verify or reject an identity document

   Security posture:
     · Every route resolves the caller's real Supabase session. No trust
       is placed in a body field naming who someone is.
     · Ownership is re-checked in Postgres, inside SECURITY DEFINER
       functions, using auth.uid(). This API is a courier, not a guard.
     · `attribute` demands a shared secret. A browser that could mint
       commission would be an open till.
════════════════════════════════════════════════════════════════════════ */

export const config = { maxDuration: 30 };

const SUPA_URL    = process.env.SUPABASE_URL;
const ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY  = process.env.RESEND_API_KEY;
const INTERNAL    = process.env.INTERNAL_API_SECRET;
const FROM        = 'Apatmento <connect@apatmento.space>';
const SITE        = 'https://www.apatmento.space';
const ADMINS      = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

/* ── Supabase REST, as the service role ───────────────────────────────── */
async function db(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!r.ok) {
    throw Object.assign(new Error(json?.message || json?.error || text || 'db error'),
      { status: r.status, body: json });
  }
  return json;
}

/* ── Call a Postgres function AS THE CALLER ───────────────────────────────
   This is the load-bearing detail. Passing the user's JWT means auth.uid()
   inside the function is really them, so every ownership check in the
   schema does its job. Using the service key here instead would make
   auth.uid() null and quietly disarm the whole model.                    */
async function rpcAsUser(token, fn, args) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY || SERVICE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args || {}),
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!r.ok) {
    // Postgres RAISE EXCEPTION arrives as `message`. It is written for humans.
    throw Object.assign(new Error(json?.message || 'Could not complete that.'),
      { status: r.status === 404 ? 400 : r.status });
  }
  return json;
}

/* ── Who is calling? ──────────────────────────────────────────────────── */
async function session(req) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) throw Object.assign(new Error('Please sign in.'), { status: 401 });

  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY || SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw Object.assign(new Error('Your session expired.'), { status: 401 });

  const user  = await r.json();
  const email = (user?.email || '').toLowerCase().trim();
  return { user, token, email, isAdmin: ADMINS.includes(email) };
}

async function requireAdmin(req) {
  const s = await session(req);
  if (!s.isAdmin) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return s;
}

/* ── Email ────────────────────────────────────────────────────────────── */
async function mail({ to, subject, html }) {
  if (!RESEND_KEY || !to) return;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!r.ok) console.error('[resend]', r.status, await r.text());
  } catch (e) { console.error('[resend]', e.message); }
}

function shell({ emoji, title, sub, body, cta, ctaUrl, accent = '#7B2FF7,#4361FF' }) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#F4F5FB;">
<div style="max-width:600px;margin:0 auto;padding:28px 16px;">
  <div style="background:linear-gradient(135deg,${accent});border-radius:22px;padding:42px 32px;text-align:center;margin-bottom:18px;">
    <div style="font-size:46px;line-height:1;margin-bottom:12px;">${emoji}</div>
    <h1 style="color:#fff;margin:0 0 8px;font-size:28px;font-weight:800;letter-spacing:-0.6px;line-height:1.2;">${title}</h1>
    ${sub ? `<p style="color:rgba(255,255,255,0.86);margin:0;font-size:15px;line-height:1.6;">${sub}</p>` : ''}
  </div>
  <div style="background:#ffffff;border-radius:18px;padding:30px 28px;margin-bottom:16px;box-shadow:0 4px 24px rgba(10,10,20,0.06);">
    ${body}
    ${cta ? `<div style="text-align:center;margin-top:28px;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${accent});color:#fff;text-decoration:none;padding:15px 34px;border-radius:13px;font-weight:700;font-size:15px;">${cta} &rarr;</a>
    </div>` : ''}
  </div>
  <p style="text-align:center;color:#9396B0;font-size:12px;line-height:1.7;margin:0;">
    Apatmento &middot; Kenya's travel super-app<br>
    <a href="${SITE}" style="color:#9396B0;text-decoration:none;">${SITE.replace('https://','')}</a>
  </p>
</div></body></html>`;
}

const money = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });
const rateLabel = (pct, flat) =>
  flat != null ? `${money(flat)} per booking` : `${pct}% of each booking`;

/* ── Templates ────────────────────────────────────────────────────────── */
const T = {
  welcome: (name, code, days) => ({
    subject: `You're an Apatmento agent, ${name.split(' ')[0]}. Start now 🤝`,
    html: shell({
      emoji: '🤝', title: "You're in",
      sub: 'No queue, no waiting. Your agent account is live.',
      accent: '#2DD4BF,#0EA5E9',
      body: `<p style="margin:0 0 18px;color:#1A1B2E;font-size:15px;">Hey <strong>${name.split(' ')[0]}</strong>,</p>
<p style="margin:0 0 20px;color:#4A4C66;font-size:14px;line-height:1.7;">Your agent account is active. You can browse listings, request partnerships with hosts, and see live availability before you promise anything to a client.</p>

<div style="background:#F4F5FB;border-radius:14px;padding:18px 20px;margin:0 0 20px;">
  <div style="font-size:11px;color:#8E90AD;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;">Your agent code</div>
  <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:800;color:#7B2FF7;letter-spacing:3px;">${code}</div>
</div>

<div style="background:linear-gradient(135deg,rgba(255,107,44,.07),rgba(255,181,158,.05));border:1.5px solid rgba(255,107,44,.28);border-radius:16px;padding:20px 22px;margin:0 0 20px;">
  <div style="font-size:13px;font-weight:800;color:#C2410C;margin-bottom:7px;">⏳ ${days} days to verify your identity</div>
  <div style="font-size:13px;color:#7C2D12;line-height:1.65;">Everything works right now. Upload a national ID or passport before the clock runs out and it keeps working. Miss it and your links stop earning until you do. Nothing is lost, just paused.</div>
</div>

<p style="margin:0 0 10px;color:#1A1B2E;font-size:14px;font-weight:700;">How earning works</p>
<div style="font-size:13.5px;color:#4A4C66;line-height:2;">
  <div><strong style="color:#0A0A14;">1.</strong> Find a listing. Ask its host to represent it, and propose your rate.</div>
  <div><strong style="color:#0A0A14;">2.</strong> The host approves and sets the commission you both agree on.</div>
  <div><strong style="color:#0A0A14;">3.</strong> Share your link for that listing. See its calendar before you call anyone.</div>
  <div><strong style="color:#0A0A14;">4.</strong> Guest books, host pays you. Every booking runs through the host.</div>
</div>`,
      cta: 'Open your dashboard', ctaUrl: `${SITE}/agent-dashboard.html`,
    }),
  }),

  requestToHost: (host, agent, listing, pct, msg) => ({
    subject: `${agent.full_name} wants to bring you bookings on ${listing}`,
    html: shell({
      emoji: '📩', title: 'An agent wants to represent your listing',
      sub: `${agent.full_name} is proposing ${pct}% per booking.`,
      body: `<p style="margin:0 0 18px;color:#4A4C66;font-size:14px;line-height:1.7;">
<strong style="color:#1A1B2E;">${agent.full_name}</strong> asked to represent <strong style="color:#1A1B2E;">${listing}</strong>. If you approve, they get a referral link for this listing and can see its live availability, so they never send you a guest for dates you've already sold.</p>

<div style="background:#F4F5FB;border-radius:14px;padding:18px 20px;margin:0 0 18px;">
  <div style="font-size:11px;color:#8E90AD;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;">They proposed</div>
  <div style="font-size:32px;font-weight:800;color:#7B2FF7;letter-spacing:-1px;">${pct}%</div>
  <div style="font-size:12.5px;color:#6B7280;margin-top:6px;">You decide the final number. Percentage or a flat fee. Or decline.</div>
</div>

${msg ? `<div style="background:#fff;border-left:3px solid #B8A4F4;padding:14px 16px;margin:0 0 18px;border-radius:0 12px 12px 0;">
  <div style="font-size:11px;color:#8E90AD;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;">Their message</div>
  <div style="font-size:13.5px;color:#4A4C66;line-height:1.6;">${esc(msg)}</div>
</div>` : ''}

<p style="margin:0;color:#8E90AD;font-size:12.5px;line-height:1.6;">Don't recognise them? Decline, or report them. Reported agents are blocked from contacting you again.</p>`,
      cta: 'Review the request', ctaUrl: `${SITE}/partner-agents.html`,
    }),
  }),

  approvedToAgent: (agent, listing, pct, flat, code) => ({
    subject: `Approved. You now represent ${listing} 🎉`,
    html: shell({
      emoji: '🎉', title: 'A host approved you',
      sub: `You're earning ${rateLabel(pct, flat)} on ${listing}.`,
      accent: '#2DD4BF,#0EA5E9',
      body: `<p style="margin:0 0 20px;color:#4A4C66;font-size:14px;line-height:1.7;">The host of <strong style="color:#1A1B2E;">${listing}</strong> approved your request.</p>

<div style="background:linear-gradient(135deg,rgba(45,212,191,0.08),rgba(14,165,233,0.06));border:1.5px solid rgba(45,212,191,0.3);border-radius:16px;padding:24px;margin:0 0 20px;text-align:center;">
  <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:8px;">Your agreed commission</div>
  <div style="font-size:46px;font-weight:800;color:#0E9384;letter-spacing:-2px;line-height:1;">${flat != null ? money(flat) : pct + '%'}</div>
  <div style="font-size:13px;color:#6B7280;margin-top:8px;">${flat != null ? 'per booking' : 'of each booking you drive'}</div>
</div>

<p style="margin:0 0 14px;color:#4A4C66;font-size:14px;line-height:1.7;">Open your dashboard for this listing's <strong>live calendar</strong> and your referral link. Check the dates before you call a client, that is the whole point.</p>
<p style="margin:0;color:#8E90AD;font-size:12.5px;line-height:1.6;">The host handles the booking and pays your commission directly. Apatmento records the agreement.</p>`,
      cta: 'See the calendar', ctaUrl: `${SITE}/agent-dashboard.html`,
    }),
  }),

  declinedToAgent: (listing, reason) => ({
    subject: `About your request on ${listing}`,
    html: shell({
      emoji: '🌱', title: 'Not this one',
      sub: 'The host passed. There are plenty of other listings.',
      accent: '#6B7280,#4A4C66',
      body: `<p style="margin:0 0 18px;color:#4A4C66;font-size:14px;line-height:1.7;">The host of <strong style="color:#1A1B2E;">${listing}</strong> declined your request to represent it.</p>
${reason ? `<div style="background:#F4F5FB;border-left:3px solid #CBD5E1;border-radius:0 12px 12px 0;padding:16px 18px;margin:0 0 18px;">
  <div style="font-size:12px;color:#8E90AD;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">What they said</div>
  <div style="font-size:14px;color:#4A4C66;line-height:1.6;">${esc(reason)}</div>
</div>` : ''}
<p style="margin:0;color:#4A4C66;font-size:14px;line-height:1.7;">Your account is untouched. Hosts choose their own agents, and one no changes nothing about the rest.</p>`,
      cta: 'Find other listings', ctaUrl: `${SITE}/agent-dashboard.html?tab=discover`,
    }),
  }),

  bookingToHost: (listing, agentName, gross, commission, ref) => ({
    subject: `Booking on ${listing}. Referred by ${agentName}`,
    html: shell({
      emoji: '📅', title: 'New booking, via your agent',
      sub: `${agentName} sent this guest.`,
      accent: '#4361FF,#7B2FF7',
      body: `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
  <tr><td style="padding:9px 0;color:#8E90AD;border-bottom:1px solid #F0F1F9;">Listing</td><td style="padding:9px 0;color:#1A1B2E;font-weight:600;border-bottom:1px solid #F0F1F9;">${listing}</td></tr>
  <tr><td style="padding:9px 0;color:#8E90AD;border-bottom:1px solid #F0F1F9;">Reference</td><td style="padding:9px 0;color:#1A1B2E;font-weight:600;border-bottom:1px solid #F0F1F9;">${ref}</td></tr>
  <tr><td style="padding:9px 0;color:#8E90AD;border-bottom:1px solid #F0F1F9;">Booking value</td><td style="padding:9px 0;color:#1A1B2E;font-weight:600;border-bottom:1px solid #F0F1F9;">${money(gross)}</td></tr>
  <tr><td style="padding:9px 0;color:#8E90AD;border-bottom:1px solid #F0F1F9;">Referred by</td><td style="padding:9px 0;color:#1A1B2E;font-weight:600;border-bottom:1px solid #F0F1F9;">Agent ${agentName}</td></tr>
  <tr><td style="padding:12px 0;color:#8E90AD;">Agent commission</td><td style="padding:12px 0;color:#0E9384;font-weight:800;font-size:17px;">${money(commission)}</td></tr>
</table>
<p style="margin:18px 0 0;color:#8E90AD;font-size:12.5px;line-height:1.65;">You handle this booking as you always do. The commission above is what you agreed with this agent for this listing. Settle it with them directly.</p>`,
      cta: 'Open bookings', ctaUrl: `${SITE}/partner-bookings.html`,
    }),
  }),

  bookingToAgent: (listing, gross, commission) => ({
    subject: `Your referral booked ${listing} 💰`,
    html: shell({
      emoji: '💰', title: 'Your guest booked',
      sub: `${money(commission)} earned on this one.`,
      accent: '#2DD4BF,#0EA5E9',
      body: `<p style="margin:0 0 20px;color:#4A4C66;font-size:14px;line-height:1.7;">Someone you referred just booked <strong style="color:#1A1B2E;">${listing}</strong>.</p>
<div style="background:linear-gradient(135deg,rgba(45,212,191,0.08),rgba(14,165,233,0.06));border:1.5px solid rgba(45,212,191,0.3);border-radius:16px;padding:24px;text-align:center;margin:0 0 18px;">
  <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:8px;">Your commission</div>
  <div style="font-size:44px;font-weight:800;color:#0E9384;letter-spacing:-2px;line-height:1;">${money(commission)}</div>
  <div style="font-size:12.5px;color:#6B7280;margin-top:8px;">on a ${money(gross)} booking</div>
</div>
<p style="margin:0;color:#8E90AD;font-size:12.5px;line-height:1.65;">The host runs the booking and pays you directly. It's recorded on your dashboard either way.</p>`,
      cta: 'View earnings', ctaUrl: `${SITE}/agent-dashboard.html?tab=earnings`,
    }),
  }),

  kycVerified: (name) => ({
    subject: 'Identity verified. Your badge is live ✅',
    html: shell({
      emoji: '✅', title: 'Verified',
      sub: 'Hosts can see you are who you say you are.',
      accent: '#2DD4BF,#0EA5E9',
      body: `<p style="margin:0 0 18px;color:#4A4C66;font-size:14px;line-height:1.7;">Hi <strong>${name.split(' ')[0]}</strong>: we checked your document and your identity is confirmed. The countdown is gone for good.</p>
<p style="margin:0;color:#4A4C66;font-size:14px;line-height:1.7;">A verified badge now sits next to your name on every partnership request. Hosts approve verified agents far more readily, for the obvious reason.</p>`,
      cta: 'Back to dashboard', ctaUrl: `${SITE}/agent-dashboard.html`,
    }),
  }),

  kycRejected: (name, reason, days) => ({
    subject: 'We could not verify that document',
    html: shell({
      emoji: '🔍', title: 'Try that again',
      sub: 'Something was off with the document you sent.',
      accent: '#FF6B2C,#FFB59E',
      body: `<p style="margin:0 0 18px;color:#4A4C66;font-size:14px;line-height:1.7;">Hi <strong>${name.split(' ')[0]}</strong>, we could not verify the document you uploaded.</p>
<div style="background:#FFF7ED;border-left:3px solid #FF6B2C;border-radius:0 12px 12px 0;padding:16px 18px;margin:0 0 18px;">
  <div style="font-size:12px;color:#C2410C;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Why</div>
  <div style="font-size:14px;color:#7C2D12;line-height:1.6;">${esc(reason || 'The image was unclear or the details did not match your account.')}</div>
</div>
<p style="margin:0;color:#4A4C66;font-size:14px;line-height:1.7;">Upload a clearer photo whenever you're ready. ${days > 0 ? `You have <strong>${days} days</strong> left on the clock.` : 'Your account is paused until you do. Nothing has been deleted.'}</p>`,
      cta: 'Upload again', ctaUrl: `${SITE}/agent-dashboard.html?tab=verify`,
    }),
  }),
};

/* ── Utilities ────────────────────────────────────────────────────────── */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const ok  = (v) => typeof v === 'string' && v.trim().length > 0;
const body = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Internal-Secret');
}

async function listingTitle(id) {
  const [l] = await db(`listings?id=eq.${encodeURIComponent(id)}&select=title`);
  return l?.title || 'your listing';
}

/* ══════════════════════════════════════════════════════════════════════
   SIGNUP. Instant. The auth user already exists.
   ══════════════════════════════════════════════════════════════════════ */
async function handleSignup(req, res) {
  const s = await session(req);
  const b = body(req);

  if (!ok(b.full_name))     return res.status(400).json({ error: 'Your name, please.' });
  if (!ok(b.contact_value)) return res.status(400).json({ error: 'Add a number we can reach you on.' });

  const agent = await rpcAsUser(s.token, 'agent_signup', {
    p_full_name:       b.full_name.trim(),
    p_contact_method:  ['whatsapp','call','sms','email'].includes(b.contact_method) ? b.contact_method : 'whatsapp',
    p_contact_value:   b.contact_value.trim(),
    p_phone:           b.phone?.trim() || null,
    p_is_creator:      !!b.is_creator,
    p_social_handle:   b.is_creator ? (b.social_handle?.trim() || null) : null,
    p_social_platform: b.is_creator ? (b.social_platform || null) : null,
    p_audience_size:   b.is_creator ? (parseInt(b.audience_size, 10) || null) : null,
  });

  const days = Math.max(0, Math.ceil((new Date(agent.kyc_deadline) - Date.now()) / 864e5));
  const t = T.welcome(agent.full_name, agent.referral_code, days);
  mail({ to: agent.email, subject: t.subject, html: t.html });

  return res.status(200).json({ ok: true, agent });
}

/* ══════════════════════════════════════════════════════════════════════
   ME. Profile, clock, portfolio
   ══════════════════════════════════════════════════════════════════════ */
async function handleMe(req, res) {
  const s = await session(req);
  const [agent] = await db(`agents?id=eq.${s.user.id}&select=*`);
  if (!agent) return res.status(404).json({ error: 'No agent account.', code: 'NOT_AGENT' });

  const [portfolio, referrals, docs] = await Promise.all([
    db(`v_agent_portfolio?agent_id=eq.${s.user.id}&select=*&order=responded_at.desc.nullslast`),
    db(`agent_referrals?agent_id=eq.${s.user.id}&select=*&order=clicked_at.desc&limit=60`),
    db(`agent_documents?agent_id=eq.${s.user.id}&select=id,doc_type,uploaded_at`),
  ]);

  const deadline = new Date(agent.kyc_deadline);
  const daysLeft = Math.ceil((deadline - Date.now()) / 864e5);
  const state =
    agent.suspended                              ? 'suspended' :
    agent.kyc_status === 'verified'              ? 'active'    :
    agent.kyc_status === 'submitted'             ? 'active'    :
    Date.now() <= deadline.getTime()             ? 'active'    : 'restricted';

  const converted = referrals.filter((r) => r.status === 'converted');

  return res.status(200).json({
    ok: true,
    agent: { ...agent, state, days_left: agent.kyc_status === 'verified' ? null : daysLeft },
    documents: docs,
    portfolio,
    referrals,
    totals: {
      approved:  portfolio.filter((p) => p.status === 'approved').length,
      pending:   portfolio.filter((p) => p.status === 'pending').length,
      live_leads: referrals.filter((r) => r.status === 'clicked').length,
      bookings:  converted.length,
      earned:    converted.reduce((a, r) => a + Number(r.commission || 0), 0),
    },
  });
}

/* ══════════════════════════════════════════════════════════════════════
   UPLOAD-ID. The file is already in private storage. Record it.
   ══════════════════════════════════════════════════════════════════════ */
async function handleUploadId(req, res) {
  const s = await session(req);
  const b = body(req);

  if (!['national_id','passport','selfie'].includes(b.doc_type))
    return res.status(400).json({ error: 'Choose a document type.' });
  if (!ok(b.storage_path)) return res.status(400).json({ error: 'Upload failed. Try again.' });

  const [agent] = await db(`agents?id=eq.${s.user.id}&select=id,kyc_status`);
  if (!agent) return res.status(404).json({ error: 'No agent account.' });

  await db('agent_documents', {
    method: 'POST',
    body: {
      agent_id:     s.user.id,
      doc_type:     b.doc_type,
      storage_path: b.storage_path,
      mime_type:    b.mime_type || null,
      size_bytes:   b.size_bytes || null,
    },
  });

  await db(`agents?id=eq.${s.user.id}`, {
    method: 'PATCH',
    body: { kyc_status: 'submitted', kyc_submitted_at: new Date().toISOString(), kyc_reject_reason: null },
  });

  ADMINS.forEach((a) => mail({
    to: a,
    subject: `Agent ID to review, ${s.email}`,
    html: shell({
      emoji: '🪪', title: 'Identity document uploaded',
      sub: `${s.email} submitted a ${b.doc_type.replace('_', ' ')}.`,
      body: '<p style="color:#4A4C66;font-size:14px;">Review it in the operator console.</p>',
      cta: 'Review', ctaUrl: `${SITE}/admin.html#agents`,
    }),
  }));

  return res.status(200).json({ ok: true, kyc_status: 'submitted' });
}

/* ══════════════════════════════════════════════════════════════════════
   REQUEST. Agent asks a host
   ══════════════════════════════════════════════════════════════════════ */
async function handleRequest(req, res) {
  const s = await session(req);
  const b = body(req);

  if (!ok(b.listing_id)) return res.status(400).json({ error: 'Which listing?' });
  const pct = Number(b.requested_pct);
  if (!(pct >= 0 && pct <= 100)) return res.status(400).json({ error: 'Propose a rate between 0 and 100%.' });

  const part = await rpcAsUser(s.token, 'agent_request_partnership', {
    p_listing_id:    b.listing_id,
    p_requested_pct: pct,
    p_message:       b.message || null,
  });

  // Tell the host. Fire and forget. The request is already recorded.
  (async () => {
    try {
      const [agent] = await db(`agents?id=eq.${s.user.id}&select=full_name,email`);
      const [host]  = await db(`profiles?id=eq.${part.host_id}&select=email,first_name,last_name`);
      const title   = await listingTitle(b.listing_id);
      if (host?.email) {
        const t = T.requestToHost(host, agent, title, pct, b.message);
        mail({ to: host.email, subject: t.subject, html: t.html });
      }
    } catch (e) { console.error('[notify:request]', e.message); }
  })();

  return res.status(200).json({ ok: true, partnership: part });
}

/* ══════════════════════════════════════════════════════════════════════
   AVAILABILITY. Live calendar, approved listings only
   ══════════════════════════════════════════════════════════════════════ */
async function handleAvailability(req, res) {
  const s  = await session(req);
  const id = req.query.listing_id;
  if (!ok(id)) return res.status(400).json({ error: 'listing_id required' });

  const rows = await rpcAsUser(s.token, 'agent_listing_availability', {
    p_listing_id: id,
    p_from: req.query.from || undefined,
    p_to:   req.query.to   || undefined,
  });

  return res.status(200).json({ ok: true, blocked: rows || [] });
}

/* ══════════════════════════════════════════════════════════════════════
   RESPOND. Host approves (naming the rate) or declines
   ══════════════════════════════════════════════════════════════════════ */
async function handleRespond(req, res) {
  const s = await session(req);
  const b = body(req);

  if (!b.partnership_id) return res.status(400).json({ error: 'partnership_id required' });
  if (!['approve','decline'].includes(b.decision))
    return res.status(400).json({ error: 'approve or decline' });

  const pct  = b.commission_pct  != null && b.commission_pct  !== '' ? Number(b.commission_pct)  : null;
  const flat = b.commission_flat != null && b.commission_flat !== '' ? Number(b.commission_flat) : null;

  if (b.decision === 'approve' && (pct == null) === (flat == null))
    return res.status(400).json({ error: 'Set a percentage or a flat fee. One, not both.' });

  const part = await rpcAsUser(s.token, 'host_respond_partnership', {
    p_partnership_id: Number(b.partnership_id),
    p_decision:       b.decision,
    p_pct:            pct,
    p_flat:           flat,
    p_message:        b.message || null,
  });

  (async () => {
    try {
      const [agent] = await db(`agents?id=eq.${part.agent_id}&select=full_name,email,referral_code`);
      const title   = await listingTitle(part.listing_id);
      if (!agent?.email) return;
      const t = b.decision === 'approve'
        ? T.approvedToAgent(agent, title, part.commission_pct, part.commission_flat, agent.referral_code)
        : T.declinedToAgent(title, b.message);
      mail({ to: agent.email, subject: t.subject, html: t.html });
    } catch (e) { console.error('[notify:respond]', e.message); }
  })();

  return res.status(200).json({ ok: true, partnership: part });
}

/* ══════════════════════════════════════════════════════════════════════
   SET-STATE. Pause / resume / revoke
   ══════════════════════════════════════════════════════════════════════ */
async function handleSetState(req, res) {
  const s = await session(req);
  const b = body(req);
  if (!b.partnership_id) return res.status(400).json({ error: 'partnership_id required' });

  const part = await rpcAsUser(s.token, 'host_set_partnership_state', {
    p_partnership_id: Number(b.partnership_id),
    p_state:          b.state,
  });
  return res.status(200).json({ ok: true, partnership: part });
}

/* ══════════════════════════════════════════════════════════════════════
   REPORT. Host's defence against spam
   ══════════════════════════════════════════════════════════════════════ */
async function handleReport(req, res) {
  const s = await session(req);
  const b = body(req);

  if (!ok(b.agent_id)) return res.status(400).json({ error: 'agent_id required' });
  if (!['spam','impersonation','misleading','abusive','other'].includes(b.reason))
    return res.status(400).json({ error: 'Pick a reason.' });

  const rep = await rpcAsUser(s.token, 'host_report_agent', {
    p_agent_id:       b.agent_id,
    p_reason:         b.reason,
    p_detail:         b.detail || null,
    p_partnership_id: b.partnership_id ? Number(b.partnership_id) : null,
  });

  const [agent] = await db(`agents?id=eq.${b.agent_id}&select=full_name,email,report_count,suspended`);
  if (agent?.suspended) {
    ADMINS.forEach((a) => mail({
      to: a,
      subject: `Agent auto-suspended, ${agent.full_name}`,
      html: shell({
        emoji: '🚫', title: 'Agent suspended',
        sub: `${agent.full_name} hit 3 host reports.`, accent: '#FF4D6D,#FF6B2C',
        body: `<p style="color:#4A4C66;font-size:14px;line-height:1.7;">Three separate hosts have now reported this agent. They have been suspended automatically pending your review. Reinstate or confirm in the console.</p>`,
        cta: 'Review', ctaUrl: `${SITE}/admin.html#agents`,
      }),
    }));
  }

  return res.status(200).json({ ok: true, report: rep, agent_suspended: !!agent?.suspended });
}

/* ══════════════════════════════════════════════════════════════════════
   INBOX. Host's pending requests + roster
   ══════════════════════════════════════════════════════════════════════ */
async function handleInbox(req, res) {
  const s = await session(req);
  const rows = await db(`v_host_agents?host_id=eq.${s.user.id}&select=*&order=requested_at.desc`);
  return res.status(200).json({
    ok: true,
    pending:  rows.filter((r) => r.status === 'pending'),
    active:   rows.filter((r) => ['approved','paused'].includes(r.status)),
    archived: rows.filter((r) => ['declined','revoked'].includes(r.status)),
  });
}

/* ══════════════════════════════════════════════════════════════════════
   TRACK. Public. A guest landed on an agent link.
   ══════════════════════════════════════════════════════════════════════ */
async function handleTrack(req, res) {
  const b = body(req);
  if (!ok(b.ref_code) || !ok(b.listing_id)) return res.status(200).json({ ok: false });

  // Pass the guest's token if they happen to be signed in, so guest_id sticks.
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (ANON_KEY || SERVICE_KEY);

  try {
    const info = await rpcAsUser(token, 'agent_track_click', {
      p_ref_code:   b.ref_code,
      p_listing_id: b.listing_id,
      p_visitor_id: b.visitor_id || null,
    });
    return res.status(200).json({ ok: !!info, referral: info || null });
  } catch {
    // Never let a dead link break a guest's page.
    return res.status(200).json({ ok: false });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ATTRIBUTE. Internal only. Called at booking creation.
   ══════════════════════════════════════════════════════════════════════ */
async function handleAttribute(req, res) {
  if (!INTERNAL || req.headers['x-internal-secret'] !== INTERNAL)
    return res.status(403).json({ error: 'Forbidden' });

  const b = body(req);
  if (!ok(b.listing_id) || !ok(b.booking_ref) || !(Number(b.gross) > 0))
    return res.status(400).json({ error: 'listing_id, booking_ref, gross required' });

  const info = await db('rpc/agent_attribute_booking', {
    method: 'POST',
    body: {
      p_listing_id:  b.listing_id,
      p_booking_ref: b.booking_ref,
      p_gross:       Number(b.gross),
      p_guest_id:    b.guest_id   || null,
      p_visitor_id:  b.visitor_id || null,
    },
  });

  if (!info) return res.status(200).json({ ok: true, attributed: false });

  (async () => {
    try {
      const title   = await listingTitle(b.listing_id);
      const [host]  = await db(`profiles?id=eq.${info.host_id}&select=email`);
      const [agent] = await db(`agents?id=eq.${info.agent_id}&select=email`);
      if (host?.email) {
        const t = T.bookingToHost(title, info.agent_name, b.gross, info.commission, b.booking_ref);
        mail({ to: host.email, subject: t.subject, html: t.html });
      }
      if (agent?.email) {
        const t = T.bookingToAgent(title, b.gross, info.commission);
        mail({ to: agent.email, subject: t.subject, html: t.html });
      }
    } catch (e) { console.error('[notify:attribute]', e.message); }
  })();

  return res.status(200).json({ ok: true, attributed: true, ...info });
}

/* ══════════════════════════════════════════════════════════════════════
   KYC-REVIEW. Admin. The one thing admin still decides.
   ══════════════════════════════════════════════════════════════════════ */
async function handleKycReview(req, res) {
  const s = await requireAdmin(req);

  if (req.method === 'GET') {
    const q = req.query.status || 'submitted';
    const agents = await db(
      `agents?kyc_status=eq.${q}&select=id,full_name,email,slug,kyc_status,kyc_submitted_at,kyc_deadline,report_count,suspended&order=kyc_submitted_at.asc`
    );
    return res.status(200).json({ ok: true, agents });
  }

  const b = body(req);
  if (!ok(b.agent_id)) return res.status(400).json({ error: 'agent_id required' });

  const [agent] = await db(`agents?id=eq.${b.agent_id}&select=*`);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  if (b.decision === 'verify') {
    await db(`agents?id=eq.${b.agent_id}`, {
      method: 'PATCH',
      body: {
        kyc_status: 'verified',
        kyc_verified_at: new Date().toISOString(),
        kyc_reviewed_by: s.user.id,
        kyc_reject_reason: null,
      },
    });
    const t = T.kycVerified(agent.full_name);
    mail({ to: agent.email, subject: t.subject, html: t.html });
    return res.status(200).json({ ok: true, kyc_status: 'verified' });
  }

  if (b.decision === 'reject') {
    await db(`agents?id=eq.${b.agent_id}`, {
      method: 'PATCH',
      body: {
        kyc_status: 'rejected',
        kyc_reviewed_by: s.user.id,
        kyc_reject_reason: b.reason || null,
      },
    });
    const days = Math.max(0, Math.ceil((new Date(agent.kyc_deadline) - Date.now()) / 864e5));
    const t = T.kycRejected(agent.full_name, b.reason, days);
    mail({ to: agent.email, subject: t.subject, html: t.html });
    return res.status(200).json({ ok: true, kyc_status: 'rejected' });
  }

  if (b.decision === 'suspend' || b.decision === 'reinstate') {
    const on = b.decision === 'suspend';
    await db(`agents?id=eq.${b.agent_id}`, {
      method: 'PATCH',
      body: {
        suspended: on,
        suspended_at: on ? new Date().toISOString() : null,
        suspension_reason: on ? (b.reason || 'Suspended by operator') : null,
      },
    });
    if (!on) await db(`agent_reports?agent_id=eq.${b.agent_id}&status=eq.open`, {
      method: 'PATCH',
      body: { status: 'dismissed', reviewed_by: s.user.id, reviewed_at: new Date().toISOString() },
    });
    return res.status(200).json({ ok: true, suspended: on });
  }

  // Grace: extend the clock. Explicit, logged, never automatic.
  if (b.decision === 'extend') {
    const days = Math.min(90, Math.max(1, parseInt(b.days, 10) || 30));
    await db(`agents?id=eq.${b.agent_id}`, {
      method: 'PATCH',
      body: { kyc_deadline: new Date(Date.now() + days * 864e5).toISOString() },
    });
    return res.status(200).json({ ok: true, extended_days: days });
  }

  return res.status(400).json({ error: 'Unknown decision' });
}

/* ══════════════════════════════════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SERVICE_KEY)             return res.status(500).json({ error: 'Server not configured.' });

  const a = req.query.action;
  try {
    if (a === 'signup'       && req.method === 'POST') return await handleSignup(req, res);
    if (a === 'me'           && req.method === 'GET')  return await handleMe(req, res);
    if (a === 'upload-id'    && req.method === 'POST') return await handleUploadId(req, res);
    if (a === 'request'      && req.method === 'POST') return await handleRequest(req, res);
    if (a === 'availability' && req.method === 'GET')  return await handleAvailability(req, res);
    if (a === 'respond'      && req.method === 'POST') return await handleRespond(req, res);
    if (a === 'set-state'    && req.method === 'POST') return await handleSetState(req, res);
    if (a === 'report'       && req.method === 'POST') return await handleReport(req, res);
    if (a === 'inbox'        && req.method === 'GET')  return await handleInbox(req, res);
    if (a === 'track'        && req.method === 'POST') return await handleTrack(req, res);
    if (a === 'attribute'    && req.method === 'POST') return await handleAttribute(req, res);
    if (a === 'kyc-review')                            return await handleKycReview(req, res);
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('[agents]', a, e.message, e.body || '');
    return res.status(status).json({ error: status >= 500 ? 'Something went wrong.' : e.message });
  }
}
