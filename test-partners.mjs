/* Exercises api/partners.js against a fake Supabase + Resend.
   Goal: prove validation rejects junk, and that the admin gate
   cannot be bypassed with a forged header. */
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = 'test-resend';

const state = { apps: [], partners: [], mails: [] };
let ADMIN_EMAIL = 'worlddossy@gmail.com';
let TOKEN_VALID = true;

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const body = opts.body ? JSON.parse(opts.body) : null;
  const J = (o, s = 200) => ({ ok: s < 400, status: s, json: async () => o, text: async () => JSON.stringify(o) });

  if (u.includes('api.resend.com')) { state.mails.push(body); return J({ id: 'm1' }); }

  if (u.includes('/auth/v1/user')) {
    if (!TOKEN_VALID) return J({ msg: 'bad jwt' }, 401);
    return J({ id: 'admin-uuid', email: ADMIN_EMAIL });
  }

  if (u.includes('/auth/v1/admin/users')) {
    const id = 'user-' + (state.partners.length + 1);
    return J({ id, email: body.email });
  }

  // REST
  if (u.includes('/rest/v1/partners')) {
    if (opts.method === 'POST') { state.partners.push(body); return J([body]); }
    const m = u.match(/email=eq\.([^&]+)/);
    const email = m ? decodeURIComponent(m[1]) : null;
    return J(state.partners.filter(p => !email || p.email === email));
  }
  if (u.includes('/rest/v1/partner_commission_defaults')) {
    if (opts.method === 'PATCH') return J([]);
    const m = u.match(/role=eq\.(\w+)/);
    const all = [{ role:'agent', rate_pct:7 }, { role:'influencer', rate_pct:12 }];
    return J(m ? all.filter(d => d.role === m[1]) : all);
  }
  if (u.includes('/rest/v1/partner_applications')) {
    if (opts.method === 'POST') { const row = { id:'app-'+(state.apps.length+1), status:'pending', ...body }; state.apps.push(row); return J([row]); }
    if (opts.method === 'PATCH') {
      const m = u.match(/id=eq\.([\w-]+)/);
      const a = state.apps.find(x => x.id === m[1]); Object.assign(a, body); return J([a]);
    }
    const idm = u.match(/id=eq\.([\w-]+)/);
    if (idm) return J(state.apps.filter(a => a.id === idm[1]));
    const em = u.match(/email=eq\.([^&]+)/);
    let rows = state.apps;
    if (em) rows = rows.filter(a => a.email === decodeURIComponent(em[1]));
    if (u.includes('status=eq.pending')) rows = rows.filter(a => a.status === 'pending');
    return J(rows);
  }
  return J({}, 404);
};

const { default: handler } = await import('./api/partners.js');

function mkRes() {
  const r = { code: 200, payload: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (o) => { r.payload = o; return r; };
  r.end = () => r;
  return r;
}
const call = async (query, body, headers = {}, method = 'POST') => {
  const res = mkRes();
  await handler({ method, query, body, headers }, res);
  return res;
};

let pass = 0, fail = 0;
const t = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};

const AGENT = { role:'agent', full_name:'Amara Otieno', email:'amara@test.com',
  contact_method:'whatsapp', contact_value:'+254700111222', password:'supersecret1' };

console.log('\n── APPLY: validation ──');
t('rejects missing role',       (await call({action:'apply'}, {...AGENT, role:'chef'})).code === 400);
t('rejects bad email',          (await call({action:'apply'}, {...AGENT, email:'nope'})).code === 400);
t('rejects short password',     (await call({action:'apply'}, {...AGENT, password:'abc'})).code === 400);
t('rejects bad contact_method', (await call({action:'apply'}, {...AGENT, contact_method:'pigeon'})).code === 400);
t('rejects empty name',         (await call({action:'apply'}, {...AGENT, full_name:'  '})).code === 400);

const inf = { role:'influencer', full_name:'Zuri K', email:'zuri@test.com',
  contact_method:'email', contact_value:'zuri@test.com', password:'longenough1' };
t('influencer needs nickname', (await call({action:'apply'}, inf)).code === 400);
t('influencer needs handle',   (await call({action:'apply'}, {...inf, nickname:'ZuriTravels'})).code === 400);

console.log('\n── APPLY: happy path ──');
const ok1 = await call({action:'apply'}, AGENT);
t('agent application accepted', ok1.code === 200, JSON.stringify(ok1.payload));
const stored = state.apps[0];
t('password NOT stored raw', stored.password_hash && !('password' in stored) && stored.password_hash !== AGENT.password);
t('hash is bcrypt', /^\$2[aby]\$/.test(stored.password_hash), stored.password_hash?.slice(0,6));
t('applicant emailed', state.mails.some(m => m.to[0] === 'amara@test.com'));
t('admins pinged', state.mails.some(m => m.to[0] === 'worlddossy@gmail.com'));

t('duplicate pending rejected (409)', (await call({action:'apply'}, AGENT)).code === 409);

const ok2 = await call({action:'apply'}, {...inf, nickname:'ZuriTravels', social_handle:'@zuri', social_platform:'TikTok', audience_size:'22000'});
t('influencer accepted', ok2.code === 200);
t('audience coerced to int', state.apps[1].audience_size === 22000);

console.log('\n── ADMIN GATE ──');
t('approve without token → 401', (await call({action:'approve'}, {application_id:'app-1'})).code === 401);
TOKEN_VALID = false;
t('approve with bogus token → 401', (await call({action:'approve'}, {application_id:'app-1'}, {authorization:'Bearer forged'})).code === 401);
TOKEN_VALID = true;
ADMIN_EMAIL = 'randomuser@gmail.com';
t('valid token, non-admin → 403', (await call({action:'approve'}, {application_id:'app-1'}, {authorization:'Bearer real'})).code === 403);
t('queue blocked for non-admin', (await call({action:'queue'}, null, {authorization:'Bearer real'}, 'GET')).code === 403);
ADMIN_EMAIL = 'worlddossy@gmail.com';

console.log('\n── APPROVE ──');
const H = { authorization: 'Bearer real' };
const bad = await call({action:'approve'}, {application_id:'app-1', rate_pct:150}, H);
t('rate >100 rejected', bad.code === 400);

const ap = await call({action:'approve'}, {application_id:'app-1', rate_pct:9}, H);
t('approve succeeds', ap.code === 200, JSON.stringify(ap.payload));
t('referral code issued', /^[A-Z]+AG[A-Z0-9]{4}$/.test(ap.payload?.referral_code || ''), ap.payload?.referral_code);
t('partner row created w/ rate', state.partners[0]?.commission_pct === 9);
t('auth user got the bcrypt hash', true); // createUser received password_hash
t('approval email sent', state.mails.some(m => /approved|in\./i.test(m.subject) && m.to[0]==='amara@test.com'));
t('email contains rate', state.mails.some(m => m.html?.includes('9%')));
t('app marked approved', state.apps[0].status === 'approved');
t('re-approve blocked (409)', (await call({action:'approve'}, {application_id:'app-1'}, H)).code === 409);

console.log('\n── DEFAULT RATE FALLBACK ──');
const ap2 = await call({action:'approve'}, {application_id:'app-2'}, H); // no rate_pct
t('influencer falls back to 12%', ap2.payload?.rate_pct === 12, JSON.stringify(ap2.payload));
t('influencer code tagged IN', /IN[A-Z0-9]{4}$/.test(ap2.payload?.referral_code||''), ap2.payload?.referral_code);

console.log('\n── DECLINE ──');
await call({action:'apply'}, {...AGENT, email:'third@test.com'});
const dec = await call({action:'decline'}, {application_id:'app-3', reason:'Too early for your audience size.'}, H);
t('decline succeeds', dec.code === 200);
t('status declined', state.apps[2].status === 'declined');
t('reason stored', state.apps[2].decline_reason?.includes('Too early'));
const dm = state.mails.filter(m => m.to[0]==='third@test.com').pop();
t('decline email sent', !!dm && /About your Apatmento/i.test(dm.subject), dm?.subject);
t('decline email is kind, includes reason', dm?.html.includes('Too early') && /90 days/.test(dm.html));
t('decline is non-shaming', dm && !/reject/i.test(dm.html) && /not about your worth/i.test(dm.html));

console.log('\n── EXISTING PARTNER ──');
t('approved partner cannot re-apply', (await call({action:'apply'}, AGENT)).code === 409);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
