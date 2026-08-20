/* ════════════════════════════════════════════════════════════════════════
   APATMENTO · AMBASSADOR PROGRAMME API   /api/ambassadors.js
   ────────────────────────────────────────────────────────────────────────
   The field team. A small, hand-picked group who bring hosts, service
   providers and travellers onto Cabana, and earn a share of Cabana's fee
   on everything those people go on to do for a year.

   Not the agent network. /api/agents.js is deliberately self-serve, because
   a host is the right judge of whether to trust an agent. An ambassador
   speaks *for Cabana*, so Cabana picks them — one email at a time, typed in
   by an admin.

   Routes (?action=):
     gate         ambassador  → may I come in, and if not, why not
     enrol        ambassador  → provision on first arrival
     me           ambassador  → profile, targets, earnings, pipeline
     claim-lead   ambassador  → stake a prospect BEFORE onboarding them
     leads        ambassador  → own pipeline
     draft-listing ambassador → build a listing on a partner's behalf
     earnings     ambassador  → the ledger, and what is still on hold
     leaderboard  ambassador  → team standings, first names only
     roster       admin       → read the allowlist
     invite       admin       → add an email to the allowlist
     revoke       admin       → remove one
     review       admin       → suspend / reinstate / resolve a fraud signal

   Security posture, and the reasoning behind it:

     · The gate is Postgres, not this file. ambassador_gate() re-derives the
       caller from auth.uid() and demands a CONFIRMED email against a live
       allowlist row. This module is a courier. If it were the guard, then
       every future caller of the same tables would need to be a guard too,
       and one of them eventually would not be.

     · Nothing trusts a body field that names who someone is. The client
       asking to be treated as an ambassador is precisely the request we
       must not honour.

     · Money is never computed here. Commission rates live in
       public.referral_rate() and are stamped onto the referral at creation
       by /api/rewards.js. This file reads them.
════════════════════════════════════════════════════════════════════════ */

import { setCors, requestIp, consumeRateLimit } from './_security.js';

export const config = { maxDuration: 30 };

const SUPA_URL    = process.env.SUPABASE_URL;
const ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY  = process.env.RESEND_API_KEY;
const FROM        = 'Cabana Ambassadors <connect@cabana.africa>';
const SITE        = 'https://cabana.africa';
const ADMINS      = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

/* ── Supabase REST as the service role. Full trust, so used sparingly and
      never with a filter the caller controls without validation. ──────── */
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
   Passing the user's JWT is what makes auth.uid() inside the function
   really them, so every check in the schema does its job. Using the service
   key here would make auth.uid() null and quietly disarm the entire model —
   ambassador_gate() would see an anonymous caller and refuse everyone, and
   the "fix" someone reaches for at 2am is to pass the uid in as an argument,
   which is how you get an API where anyone can be anyone.               */
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
    throw Object.assign(new Error(json?.message || 'Could not complete that.'),
      { status: r.status === 404 ? 400 : r.status });
  }
  return json;
}

/* ── Who is calling ──────────────────────────────────────────────────── */
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

/* Resolve the caller and confirm they are through the gate, in one step.
   Every ambassador route starts here. The verdict comes from Postgres, so
   a change to the gate's rules takes effect everywhere at once. */
async function requireAmbassador(req) {
  const s = await session(req);
  const verdict = await rpcAsUser(s.token, 'ambassador_gate', {});
  if (!verdict?.ok) {
    throw Object.assign(new Error(gateMessage(verdict)), { status: 403, verdict });
  }
  return { ...s, verdict };
}

/* A refusal with no reason generates a support ticket every single time.
   These strings are what the person actually reads, so they say what to do
   next rather than restating that something went wrong. */
function gateMessage(v) {
  switch (v?.reason) {
    case 'not_signed_in':     return 'Please sign in to continue.';
    case 'email_unconfirmed': return 'Confirm your email address first. Check your inbox for the link we sent when you signed up.';
    case 'not_authorised':    return 'This area is for Cabana ambassadors. If you have been invited, sign in with the exact email address the invitation was sent to.';
    case 'suspended':         return `Your ambassador account is paused. ${v.detail || ''}`.trim();
    default:                  return 'You do not have access to the ambassador programme.';
  }
}

/* ── Email ───────────────────────────────────────────────────────────── */
/* Returns { sent, reason }. A failed email must never fail the request that
   triggered it — the ambassador is already on the roster either way. But the
   caller has to be TOLD, because an admin who sees "Invitation sent" when no
   email left the building will wait for a reply that is never coming. Silence
   here was the whole bug: no key, no send, no error, cheerful success. */
async function mail({ to, subject, html }) {
  if (!to)         return { sent: false, reason: 'no_recipient' };
  if (!RESEND_KEY) {
    console.warn('[ambassadors] RESEND_API_KEY unset — invitation not emailed');
    return { sent: false, reason: 'email_not_configured' };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!r.ok) {
      /* Resend's own words are the useful part here — an unverified sending
         domain and a malformed address fail identically without them. */
      const detail = await r.text().catch(() => '');
      console.warn('[ambassadors] resend', r.status, detail.slice(0, 400));
      return { sent: false, reason: 'provider_rejected', detail: detail.slice(0, 300) };
    }
    return { sent: true };
  } catch (e) {
    console.warn('[ambassadors] mail', e.message);
    return { sent: false, reason: 'network', detail: e.message };
  }
}

/* ── ONE-CLICK SIGN-IN ─────────────────────────────────────────────────────
   The gate demands a CONFIRMED email (schema-ambassadors.sql §8, principle 2).
   The old invitation just linked to /ambassadors.html and told the reader to
   "confirm your email first" — but nothing on the platform had ever sent them
   a confirmation, so that instruction had no action behind it. An invited
   ambassador could click through and be refused by the very gate that invited
   them.

   Supabase can mint a link that signs them in AND stamps email_confirmed_at in
   the same click, which is exactly the two things the gate wants. Generated
   server-side with the service key so nothing is emailed by Supabase itself —
   we put the link in our own branded invitation.

   magiclink is for an address that already has an account; invite is for one
   that does not. Rather than query first, try the common case and fall back:
   one round trip when the guess is right, two when it isn't, and no window
   between the check and the use. */
async function authLinkFor(email, redirectTo) {
  if (!SUPA_URL || !SERVICE_KEY) return null;

  const mint = async (type) => {
    const r = await fetch(`${SUPA_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, email, options: { redirect_to: redirectTo } }),
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    /* GoTrue has moved this field between versions. Accept either shape. */
    return j?.properties?.action_link || j?.action_link || null;
  };

  try {
    return (await mint('magiclink')) || (await mint('invite'));
  } catch (e) {
    console.warn('[ambassadors] generate_link', e.message);
    return null;
  }
}

/* ── Audit ───────────────────────────────────────────────────────────── */
async function logEvent(req, { ambassador_id, actor_id, kind, subject, meta }) {
  try {
    await db('ambassador_events', {
      method: 'POST',
      body: {
        ambassador_id: ambassador_id || null,
        actor_id:      actor_id || null,
        kind, subject: subject || null,
        meta:          meta || {},
        ip:            requestIp(req),
        user_agent:    String(req.headers['user-agent'] || '').slice(0, 300),
      },
    });
  } catch (e) { console.warn('[ambassadors] audit', e.message); }
}

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/* ════════════════════════════════════════════════════════════════════════
   AMBASSADOR ROUTES
   ════════════════════════════════════════════════════════════════════════ */

/* gate · the dashboard asks this before painting anything.

   Deliberately returns 200 with ok:false rather than 403. This is the one
   route whose refusals are a normal, expected answer — the page needs to
   render "you are not on the list" as a designed state, not catch an error. */
async function handleGate(req, res) {
  const s = await session(req);
  const verdict = await rpcAsUser(s.token, 'ambassador_gate', {});
  return res.status(200).json({
    ...verdict,
    message: verdict?.ok ? null : gateMessage(verdict),
  });
}

/* enrol · provision on first arrival. Idempotent: the SQL function returns
   the existing row rather than erroring, so the dashboard can call this on
   every load without co-ordination. */
async function handleEnrol(req, res) {
  const s = await session(req);
  const body = req.body || {};

  const out = await rpcAsUser(s.token, 'ambassador_enrol', {
    p_full_name: clean(body.full_name, 120),
    p_phone:     clean(body.phone, 32) || null,
    p_region:    clean(body.region, 80) || null,
  });

  if (!out?.ok) {
    return res.status(403).json({ ...out, message: gateMessage(out) });
  }

  if (out.created) {
    const a = out.ambassador || {};
    await logEvent(req, { ambassador_id: a.id, actor_id: a.id, kind: 'enrolled_api', subject: s.email });
    await mail({
      to: s.email,
      subject: 'Welcome to the Cabana Ambassador programme',
      html: welcomeEmail(a),
    });
  }
  return res.status(200).json(out);
}

/* me · everything the dashboard needs about itself, in one round trip.
   Read through the security_invoker view, so RLS is still the thing
   deciding what comes back. */
async function handleMe(req, res) {
  const s = await requireAmbassador(req);

  const [meRows, leads, earnings] = await Promise.all([
    dbAsUser(s.token, 'v_ambassador_me?select=*'),
    dbAsUser(s.token, 'ambassador_leads?select=*&order=created_at.desc&limit=200'),
    dbAsUser(s.token, 'referral_earnings?select=commission_kes,service_type,status,available_at,created_at,referral_type&order=created_at.desc&limit=100'),
  ]);

  const me = meRows?.[0] || null;
  if (!me) return res.status(200).json({ ok: true, enrolled: false, gate: s.verdict });

  return res.status(200).json({
    ok: true,
    enrolled: true,
    me,
    leads: leads || [],
    earnings: earnings || [],
    link: `${SITE}/?ref=${encodeURIComponent(me.referral_code)}`,
    rates: RATE_CARD,
  });
}

/* The rate card, echoed to the client for display only. The dashboard shows
   these numbers; it never calculates with them. Kept in sync with
   public.referral_rate() and api/rewards.js by tests. */
const RATE_CARD = {
  tier: 'ambassador',
  traveller: 0.15,
  host: 0.10,
  service_provider: 0.10,
  days: 365,
  basis: 'Share of the Cabana service fee. That fee is a fixed amount banded by booking value — KES 300 on a stay under KES 5,000, KES 800 at or above it, nothing on a tour or an event — never a percentage of the booking.',
  fee_bands: [{ under: 5000, fee: 300 }, { under: null, fee: 800 }],
};

/* Read a table as the caller, so RLS applies. Used wherever the answer
   should be scoped to one person — which is nearly everywhere. */
async function dbAsUser(token, path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      apikey: ANON_KEY || SERVICE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

/* claim-lead · stake a prospect before onboarding them.

   The ordering is the whole anti-poaching mechanism. If credit could be
   claimed after a host signs up, the rational move is to claim every new
   host on the platform and argue later. Because the claim must come first,
   an ambassador has to actually find someone nobody has found yet.

   All the real checks — dedupe, velocity, already-on-platform — live in
   ambassador_claim_lead(). This handler shapes the answer for a human. */
async function handleClaimLead(req, res) {
  const s = await requireAmbassador(req);
  const b = req.body || {};

  const out = await rpcAsUser(s.token, 'ambassador_claim_lead', {
    p_full_name:    clean(b.full_name, 120),
    p_contact_raw:  clean(b.contact, 160),
    p_contact_kind: b.contact_kind === 'email' ? 'email' : 'phone',
    p_lead_type:    ['host','service_provider','traveller'].includes(b.lead_type) ? b.lead_type : 'host',
    p_category:     clean(b.category, 40) || null,
    p_city:         clean(b.city, 80) || null,
    p_country:      clean(b.country, 80) || null,
    p_notes:        clean(b.notes, 1000) || null,
  });

  if (!out?.ok) {
    const messages = {
      already_on_platform: 'This person is already on Cabana, so there is nothing to onboard. Ambassador credit is for people who are genuinely new to the platform.',
      already_claimed:     'Another ambassador has already claimed this contact. Claims are first come, first served, and they lapse after 45 days if nothing comes of them.',
      already_yours:       'You have already claimed this contact. It is in your pipeline.',
      rate_limited:        out.detail || 'You have hit the claim limit. It resets hourly.',
      incomplete:          'Please give both a name and a contact.',
      bad_contact:         'That contact does not look right. Use a full phone number or a valid email address.',
      bad_contact_kind:    'Choose whether this is a phone number or an email address.',
      not_authorised:      gateMessage(out),
    };
    return res.status(400).json({ ...out, message: messages[out.reason] || 'Could not claim that lead.' });
  }

  return res.status(200).json(out);
}

/* leads · the ambassador's own pipeline. RLS scopes it; no filter needed
   here, and adding one keyed on a body field would only create a way to
   ask for someone else's. */
async function handleLeads(req, res) {
  const s = await requireAmbassador(req);
  const rows = await dbAsUser(s.token,
    'ambassador_leads?select=*&order=created_at.desc&limit=300');
  return res.status(200).json({ ok: true, leads: rows || [] });
}

/* draft-listing · build a listing on a partner's behalf.

   The reason this route exists at all: a host who has never used Cabana
   will not finish a seven-step form on a phone in a matatu. The ambassador
   sitting next to them will. So the ambassador fills it in, and the listing
   is created against the LEAD, held as a draft, and only goes live once the
   real host has an account and accepts it.

   Two properties worth stating plainly, because both are easy to lose in a
   refactor and expensive to lose in production:

     · The listing is never attributed to the ambassador as owner. They are
       filling in a form for someone else, not acquiring property. partner_id
       stays null until the host claims it.

     · The lead must be the ambassador's own, and status must not be
       'rejected'. Otherwise this becomes a way to create listings against
       anybody's pipeline. */
async function handleDraftListing(req, res) {
  const s = await requireAmbassador(req);
  const b = req.body || {};

  const leadId = clean(b.lead_id, 40);
  if (!leadId) throw Object.assign(new Error('Which lead is this for?'), { status: 400 });

  /* Ownership is re-checked as the caller, through RLS, rather than with the
     service key and a trusted body field. */
  const leadRows = await dbAsUser(s.token,
    `ambassador_leads?id=eq.${encodeURIComponent(leadId)}&select=*`);
  const lead = leadRows?.[0];
  if (!lead) throw Object.assign(new Error('That lead is not in your pipeline.'), { status: 404 });
  if (lead.status === 'rejected') {
    throw Object.assign(new Error('That lead was rejected and cannot be listed.'), { status: 400 });
  }

  const title = clean(b.title, 140);
  if (!title) throw Object.assign(new Error('Give the listing a title.'), { status: 400 });

  const draft = {
    lead_id:        lead.id,
    ambassador_id:  s.user.id,
    service:        clean(b.service, 24) || 'stays',
    listing_type:   clean(b.listing_type, 60) || null,
    title,
    description:    clean(b.description, 6000) || null,
    country:        clean(b.country, 80)  || lead.country || null,
    city:           clean(b.city, 80)     || lead.city    || null,
    area:           clean(b.area, 120)    || null,
    currency:       clean(b.currency, 8)  || 'KES',
    price_night:    b.price_night != null ? Number(b.price_night) : null,
    price_month:    b.price_month != null ? Number(b.price_month) : null,
    bedrooms:       b.bedrooms  != null ? parseInt(b.bedrooms, 10)  : null,
    bathrooms:      b.bathrooms != null ? parseInt(b.bathrooms, 10) : null,
    max_guests:     b.max_guests != null ? parseInt(b.max_guests, 10) : null,
    amenities:      Array.isArray(b.amenities) ? b.amenities.slice(0, 60).map(x => clean(x, 40)) : [],
    photos:         Array.isArray(b.photos) ? b.photos.slice(0, 30).map(x => clean(x, 500)) : [],
    contact_name:   lead.full_name,
    contact_raw:    lead.contact_raw,
    status:         'awaiting_host',
  };

  const [row] = await db('ambassador_listing_drafts', {
    method: 'POST', body: draft, prefer: 'return=representation',
  });

  /* A claimed lead that now has a listing has moved along the funnel. Say so
     once, here, rather than recomputing the funnel from listings later. */
  if (lead.status === 'claimed' || lead.status === 'signed_up') {
    await db(`ambassador_leads?id=eq.${encodeURIComponent(lead.id)}`, {
      method: 'PATCH',
      body: { status: 'listed', first_listing_id: row.id, updated_at: new Date().toISOString() },
    });
  }

  await logEvent(req, {
    ambassador_id: s.user.id, actor_id: s.user.id,
    kind: 'draft_listing', subject: title,
    meta: { lead_id: lead.id, draft_id: row.id, service: draft.service },
  });

  return res.status(200).json({ ok: true, draft: row });
}

/* earnings · the ledger. Splits matured from held, because "why can I see
   KES 4,000 but only withdraw KES 900" is the single most common question
   any referral programme gets, and the answer belongs in the response
   rather than in a support thread. */
async function handleEarnings(req, res) {
  const s = await requireAmbassador(req);
  const rows = await dbAsUser(s.token,
    'referral_earnings?select=*&order=created_at.desc&limit=500') || [];

  const now = Date.now();
  const live = rows.filter(r => r.status !== 'reversed');
  const matured = live.filter(r => !r.available_at || new Date(r.available_at) <= now);
  const held    = live.filter(r =>  r.available_at && new Date(r.available_at) >  now);
  const sum = list => Number(list.reduce((t, r) => t + Number(r.commission_kes || 0), 0).toFixed(2));

  return res.status(200).json({
    ok: true,
    total:     sum(live),
    available: sum(matured),
    on_hold:   sum(held),
    reversed:  sum(rows.filter(r => r.status === 'reversed')),
    hold_note: 'Commission is released once the booking is past its cancellation window.',
    entries:   rows,
  });
}

/* leaderboard · standings across the team.

   First names and initials only. The whole point of a leaderboard is to
   motivate, and it does not need to leak a colleague's email, phone or
   pipeline to do that. Reading the full roster would.

   Service key here on purpose: this is the one place an ambassador is meant
   to see beyond their own row, so RLS cannot supply it and the shaping below
   is what makes it safe. */
async function handleLeaderboard(req, res) {
  await requireAmbassador(req);

  const rows = await db('ambassadors?select=id,full_name,region,status&status=eq.active&limit=300');
  const stats = await db(
    'ambassador_leads?select=ambassador_id,status&status=in.(signed_up,listed,earning)&limit=5000');

  const counts = new Map();
  for (const l of stats || []) {
    counts.set(l.ambassador_id, (counts.get(l.ambassador_id) || 0) + 1);
  }

  const board = (rows || [])
    .map(a => {
      const parts = String(a.full_name || '').trim().split(/\s+/);
      return {
        id:        a.id,
        name:      [parts[0] || 'Ambassador', parts[1] ? parts[1][0] + '.' : ''].join(' ').trim(),
        region:    a.region || null,
        onboarded: counts.get(a.id) || 0,
      };
    })
    .sort((x, y) => y.onboarded - x.onboarded)
    .slice(0, 50)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  return res.status(200).json({ ok: true, board });
}

/* ════════════════════════════════════════════════════════════════════════
   ADMIN ROUTES
   ════════════════════════════════════════════════════════════════════════ */

/* roster · the allowlist. Admin only, and RLS blocks it from every client
   session regardless, so this route is the only way to read it at all. */
async function handleRoster(req, res) {
  await requireAdmin(req);
  const rows = await db('ambassador_allowlist?select=*&order=invited_at.desc&limit=500');
  const enrolled = await db('ambassadors?select=id,email,status,risk_score,enrolled_at,last_seen_at&limit=500');
  const byEmail = new Map((enrolled || []).map(a => [a.email, a]));
  return res.status(200).json({
    ok: true,
    roster: (rows || []).map(r => ({ ...r, ambassador: byEmail.get(r.email) || null })),
  });
}

/* invite · add an email to the allowlist.

   Re-inviting a revoked address clears the revocation rather than failing on
   the primary key — bringing someone back is a normal thing to want, and
   making an admin delete a row first would lose the history of why they
   left. */
async function handleInvite(req, res) {
  const s = await requireAdmin(req);
  const b = req.body || {};
  const email = clean(b.email, 160).toLowerCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw Object.assign(new Error('That is not a valid email address.'), { status: 400 });
  }

  const row = {
    email,
    full_name:      clean(b.full_name, 120) || null,
    region:         clean(b.region, 80) || null,
    note:           clean(b.note, 500) || null,
    monthly_target: Number.isFinite(+b.monthly_target) ? Math.max(0, Math.min(1000, +b.monthly_target)) : 10,
    invited_by:     s.user.id,
    invited_at:     new Date().toISOString(),
    revoked_at:     null,
    revoked_by:     null,
    revoke_reason:  null,
  };

  await db('ambassador_allowlist', {
    method: 'POST', body: row,
    prefer: 'resolution=merge-duplicates,return=representation',
  });

  const link = await authLinkFor(email, `${SITE}/ambassadors.html`);

  const post = await mail({
    to: email,
    subject: 'You have been invited to the Cabana Ambassador programme',
    html: inviteEmail(row, link),
  });

  await logEvent(req, { actor_id: s.user.id, kind: 'roster_invite', subject: email,
                        meta: { region: row.region, target: row.monthly_target,
                                emailed: post.sent, email_reason: post.reason || null,
                                one_click: !!link } });

  /* The roster write succeeded, so this is a 200 either way — but `emailed`
     tells the console whether a human will actually hear about it, and the
     admin has to pass the link on by hand when nothing was sent. */
  return res.status(200).json({
    ok: true,
    email,
    emailed: post.sent,
    email_reason: post.reason || null,
    email_detail: post.detail || null,
  });
}

/* revoke · close the door, keep the record.

   A timestamp, never a delete, and earnings already accrued are untouched.
   You want to be able to answer "who had access on the day that booking was
   attributed" a year from now, and someone who did the work before leaving
   is still owed for it. */
async function handleRevoke(req, res) {
  const s = await requireAdmin(req);
  const email = clean((req.body || {}).email, 160).toLowerCase();
  if (!email) throw Object.assign(new Error('Which email?'), { status: 400 });

  await db(`ambassador_allowlist?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: {
      revoked_at:    new Date().toISOString(),
      revoked_by:    s.user.id,
      revoke_reason: clean((req.body || {}).reason, 300) || 'Access withdrawn',
    },
  });

  await logEvent(req, { actor_id: s.user.id, kind: 'roster_revoke', subject: email,
                        meta: { reason: clean((req.body || {}).reason, 300) } });

  return res.status(200).json({ ok: true, email });
}

/* review · suspend, reinstate, or resolve a fraud signal.

   Suspension freezes accrual and stops links attributing. It never deletes
   leads or reverses earnings — an automated threshold that can destroy
   someone's income on a heuristic will eventually do it to your best
   ambassador on a Friday night, and the damage is not recoverable by
   apologising on Monday. */
async function handleReview(req, res) {
  const s = await requireAdmin(req);
  const b = req.body || {};
  const op = b.op;

  if (op === 'suspend' || op === 'reinstate') {
    const id = clean(b.ambassador_id, 40);
    if (!id) throw Object.assign(new Error('Which ambassador?'), { status: 400 });
    const suspend = op === 'suspend';
    await db(`ambassadors?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: {
        status:         suspend ? 'suspended' : 'active',
        suspended_at:   suspend ? new Date().toISOString() : null,
        suspend_reason: suspend ? (clean(b.reason, 300) || 'Under review') : null,
        updated_at:     new Date().toISOString(),
      },
    });
    await logEvent(req, { ambassador_id: id, actor_id: s.user.id,
                          kind: op, meta: { reason: clean(b.reason, 300) } });
    return res.status(200).json({ ok: true });
  }

  if (op === 'resolve-signal') {
    const sig = clean(b.signal_id, 40);
    if (!sig) throw Object.assign(new Error('Which signal?'), { status: 400 });
    await db(`ambassador_fraud_signals?id=eq.${encodeURIComponent(sig)}`, {
      method: 'PATCH',
      body: { resolved: true, resolved_by: s.user.id, resolved_note: clean(b.note, 500) || null },
    });
    /* The trigger on the signals table recomputes risk_score for us. */
    return res.status(200).json({ ok: true });
  }

  if (op === 'signals') {
    const rows = await db('ambassador_fraud_signals?select=*&resolved=eq.false&order=created_at.desc&limit=300');
    return res.status(200).json({ ok: true, signals: rows || [] });
  }

  throw Object.assign(new Error('Unknown review operation.'), { status: 400 });
}

/* ── Email bodies ────────────────────────────────────────────────────── */
function shell(inner) {
  return `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#13142A;line-height:1.65">
${inner}
<hr style="border:none;border-top:1px solid #ECEDF8;margin:32px 0 18px"/>
<p style="font-size:12px;color:#8B8EAC;margin:0">Cabana · Africa's zero-commission travel platform<br/><a href="${SITE}" style="color:#6D28FF;text-decoration:none">cabana.africa</a></p>
</div>`;
}

function inviteEmail(row, actionLink) {
  /* actionLink signs them in and confirms the address in one click. Without it
     (no service key, or Supabase refused) fall back to the plain gateway URL,
     which still works for anyone with a confirmed account already. */
  const href = actionLink || `${SITE}/ambassadors.html`;

  return shell(`
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6D28FF;font-weight:700;margin:0 0 12px">Cabana Ambassadors</p>
<h1 style="font-size:26px;letter-spacing:-.6px;margin:0 0 16px">You have been invited${row.full_name ? ', ' + row.full_name : ''}.</h1>
<p style="margin:0 0 16px">You have been added to the Cabana Ambassador programme — a small team helping bring hosts, service providers and travellers onto Africa's zero-commission travel platform.</p>
<p style="margin:0 0 16px"><strong>What you earn.</strong> 15% of our service fee on every booking a traveller you bring makes, and 10% on every booking a host or service provider you bring takes. For 365 days from the day they join, on every booking, with no cap on how many people you bring.</p>
<p style="margin:0 0 28px"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700">Open your dashboard</a></p>
<p style="margin:0 0 16px;font-size:14px;color:#474A66">${actionLink
  ? 'That button signs you straight in — no password needed. It is tied to <strong>' + row.email + '</strong> and works once, for 24 hours. Ask for a fresh invitation if it expires.'
  : 'Sign in with <strong>' + row.email + '</strong> — access is tied to that exact address.'}</p>
<p style="font-size:13px;color:#474A66;margin:0">Your monthly target to start: <strong>${row.monthly_target} onboarded</strong>${row.region ? ` in ${row.region}` : ''}.</p>`);
}

function welcomeEmail(a) {
  return shell(`
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6D28FF;font-weight:700;margin:0 0 12px">You are in</p>
<h1 style="font-size:26px;letter-spacing:-.6px;margin:0 0 16px">Welcome, ${a.full_name || 'Ambassador'}.</h1>
<p style="margin:0 0 16px">Your ambassador link is live. Everyone who joins Cabana through it is attributed to you for a full year.</p>
<p style="margin:0 0 20px;padding:14px 18px;background:#F5F5FC;border-radius:12px;font-family:ui-monospace,monospace;font-size:14px">${SITE}/?ref=${a.referral_code}</p>
<p style="margin:0 0 16px"><strong>One habit worth building.</strong> Claim a lead in the dashboard <em>before</em> you go and talk to them. A claim is what reserves them as yours — first come, first served — and it lapses after 45 days if nothing comes of it.</p>
<p style="margin:0 0 28px"><a href="${SITE}/ambassador-dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700">Go to your dashboard</a></p>`);
}

/* ════════════════════════════════════════════════════════════════════════ */

/* Exported for use by api/rewards.js — keeps the ambassador routes within
   the 12-function limit on Vercel Hobby without any client-side URL changes.
   The public /api/ambassadors path is rewritten to /api/rewards by vercel.json. */
export async function ambassadorHandler(req, res) {
  setCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SERVICE_KEY)             return res.status(500).json({ error: 'Server not configured.' });

  const a = req.query.action;

  /* Coarse per-IP limit in front of everything. The per-ambassador claim
     velocity limit in Postgres is the one that shapes behaviour; this one
     just stops a stranger hammering the gate. consumeRateLimit writes the
     429 itself and returns false, so there is nothing to send here. */
  if (!consumeRateLimit(req, res, 'ambassadors', 120, 60_000)) return;

  try {
    if (a === 'gate'          && req.method === 'POST') return await handleGate(req, res);
    if (a === 'enrol'         && req.method === 'POST') return await handleEnrol(req, res);
    if (a === 'me'            && req.method === 'GET')  return await handleMe(req, res);
    if (a === 'claim-lead'    && req.method === 'POST') return await handleClaimLead(req, res);
    if (a === 'leads'         && req.method === 'GET')  return await handleLeads(req, res);
    if (a === 'draft-listing' && req.method === 'POST') return await handleDraftListing(req, res);
    if (a === 'earnings'      && req.method === 'GET')  return await handleEarnings(req, res);
    if (a === 'leaderboard'   && req.method === 'GET')  return await handleLeaderboard(req, res);

    if (a === 'roster'        && req.method === 'GET')  return await handleRoster(req, res);
    if (a === 'invite'        && req.method === 'POST') return await handleInvite(req, res);
    if (a === 'revoke'        && req.method === 'POST') return await handleRevoke(req, res);
    if (a === 'review'        && req.method === 'POST') return await handleReview(req, res);

    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('[ambassadors]', a, e.message, e.body || '');
    return res.status(status).json({
      error: status >= 500 ? 'Something went wrong.' : e.message,
      ...(e.verdict ? { reason: e.verdict.reason } : {}),
    });
  }
}
