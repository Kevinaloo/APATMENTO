import { readdir } from 'node:fs/promises';
import { criticalPaths } from './catalog.mjs';
import { compareMigrations } from './core.mjs';

export async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(20_000), redirect: 'manual' });
}

export async function probeRoutes(origin, record, headers = {}, paths = criticalPaths) {
  for (let index = 0; index < paths.length; index += 5) {
    await Promise.all(paths.slice(index, index + 5).map(async path => {
      let status = 'passed', detail;
      try {
        let url = new URL(path, origin), response;
        for (let hops = 0; hops < 6; hops++) {
          response = await request(url, { headers });
          if (![301, 302, 303, 307, 308].includes(response.status)) break;
          const location = response.headers.get('location');
          if (!location) throw Error('Redirect has no Location');
          url = new URL(location, url);
          // Never forward bypass credentials to another host.
          if (url.origin !== origin) throw Error('Unexpected cross-origin redirect');
        }
        const text = await response.text();
        if (response.status !== 200 || !/text\/html/i.test(response.headers.get('content-type') || '')
            || !/<(?:html|!doctype)/i.test(text) || !/<title>[^<]+<\/title>/i.test(text)) {
          throw Error(`Expected an HTML page; HTTP ${response.status}`);
        }
        detail = `HTTP 200: ${url.pathname}`;
      } catch (error) { status = 'failed'; detail = error.message; }
      record({ id: `route:${path}`, kind: 'route', status, detail });
    }));
  }
  // An SPA-style 200 fallback must not hide missing pages.
  try {
    const response = await request(new URL('/__cabana_qa_missing_route__', origin), { headers });
    record({ id: 'route:404', kind: 'route', status: response.status === 404 ? 'passed' : 'failed', detail: `Unknown route returned ${response.status}; expected 404` });
  } catch (error) { record({ id: 'route:404', kind: 'route', status: 'failed', detail: error.message }); }
  record({ id: 'routes', kind: 'check', status: 'passed', detail: `${paths.length} declared routes and the 404 behavior were probed; individual failures block release.` });
}

export async function checkDeployment(origin, record, env = process.env) {
  if (['failure', 'error'].includes(env.QA_DEPLOYMENT_STATE)) {
    return record({ id: 'deployment', kind: 'check', status: 'failed', detail: `Deployment event: ${env.QA_DEPLOYMENT_STATE}` });
  }
  if (!env.QA_VERCEL_TOKEN || !env.QA_VERCEL_PROJECT_ID) {
    return record({ id: 'deployment', kind: 'check', status: 'blocked', detail: 'Set QA_VERCEL_TOKEN and QA_VERCEL_PROJECT_ID to verify deployment state and commit.' });
  }
  try {
    const url = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(new URL(origin).hostname)}`);
    if (env.QA_VERCEL_TEAM_ID) url.searchParams.set('teamId', env.QA_VERCEL_TEAM_ID);
    const response = await request(url, { headers: { Authorization: `Bearer ${env.QA_VERCEL_TOKEN}` } });
    if (!response.ok) throw Error(`Vercel inspection returned ${response.status}`);
    const data = await response.json();
    if (data.projectId !== env.QA_VERCEL_PROJECT_ID) throw Error('Deployment belongs to a different Vercel project');
    if (data.readyState !== 'READY') throw Error(`Deployment state: ${data.readyState}`);
    const sha = data.meta?.githubCommitSha;
    if (!env.QA_SHA || sha !== env.QA_SHA) throw Error('Deployment commit does not match the tested checkout');
    record({ id: 'deployment', kind: 'check', status: 'passed', detail: `READY; deployment commit ${sha} matches checkout` });
  } catch (error) { record({ id: 'deployment', kind: 'check', status: 'failed', detail: error.message }); }
}

export async function checkDatabase(config, record, env = process.env) {
  if (!env.QA_SUPABASE_ACCESS_TOKEN || !env.QA_SUPABASE_PROJECT_REF) {
    record({ id: 'migrations', kind: 'check', status: 'blocked', detail: 'Supabase read-only management access is not configured.' });
    record({ id: 'rls-catalog', kind: 'check', status: 'blocked', detail: 'Cannot inspect deployed RLS configuration.' });
    return;
  }
  const query = async sql => {
    if (!/^[a-z0-9]+$/.test(env.QA_SUPABASE_PROJECT_REF)) throw Error('Invalid Supabase project reference');
    const response = await request(`https://api.supabase.com/v1/projects/${env.QA_SUPABASE_PROJECT_REF}/database/query/read-only`, {
      method: 'POST', headers: { Authorization: `Bearer ${env.QA_SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }),
    });
    if (!response.ok) throw Error(`Read-only database inspection returned ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw Error('Unexpected database inspection response');
    return rows;
  };
  try {
    const files = (await readdir(new URL('../../supabase/migrations/', import.meta.url))).filter(f => f.endsWith('.sql'));
    const local = files.map(f => f.match(/^(\d+)_/)?.[1]);
    if (local.some(v => !v) || !local.length) throw Error('Invalid or empty local migration history');
    const remote = (await query('select version from supabase_migrations.schema_migrations order by version')).map(r => r.version);
    const drift = compareMigrations(local, remote);
    const failed = drift.missing.length || drift.unexpected.length || drift.duplicateLocal || drift.duplicateRemote;
    record({ id: 'migrations', kind: 'check', status: failed ? 'failed' : 'passed', detail: failed ? JSON.stringify(drift) : `${local.length} migration versions match exactly; schema contents are not checksummed.` });
  } catch (error) { record({ id: 'migrations', kind: 'check', status: 'failed', detail: error.message }); }
  try {
    const rows = await query(`select n.nspname as schema, c.relname as name, c.relrowsecurity as rls
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','storage') and c.relkind in ('r','p')
      and (has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
        or has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'))`);
    if (!rows.length) throw Error('RLS catalog query returned no exposed tables');
    const unsafe = rows.filter(r => !r.rls);
    record({ id: 'rls-catalog', kind: 'check', status: unsafe.length ? 'failed' : 'passed', detail: unsafe.length ? `RLS disabled: ${unsafe.map(r => `${r.schema}.${r.name}`).join(', ')}` : `${rows.length} accessible tables have RLS enabled; behavioral isolation is checked separately.` });
  } catch (error) { record({ id: 'rls-catalog', kind: 'check', status: 'failed', detail: error.message }); }
}

// Positive owner access is mandatory: an empty table or expired JWT cannot make
// a cross-account denial look like a successful security test.
export async function checkRLS(config, record, env = process.env) {
  const probes = config.rls || [];
  if (!probes.length || !env.QA_SUPABASE_ANON_KEY || !env.QA_SUPABASE_PROJECT_REF) {
    return record({ id: 'rls', kind: 'check', status: 'blocked', detail: 'Configure RLS fixture probes, anonymous key, owner and outsider JWTs.' });
  }
  const origin = `https://${env.QA_SUPABASE_PROJECT_REF}.supabase.co`;
  const sessions = new Map();
  async function tokenFor(probe, role) {
    const supplied = env[probe[`${role}TokenEnv`]];
    if (supplied) return supplied;
    const accountName = probe[`${role}Account`] || role;
    const account = config.accounts?.[accountName];
    if (!account || !env[account.emailEnv] || !env[account.passwordEnv]) return null;
    if (sessions.has(accountName)) return sessions.get(accountName);
    const response = await request(`${origin}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: env.QA_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env[account.emailEnv], password: env[account.passwordEnv] }),
    });
    if (!response.ok) throw Error(`Synthetic RLS account login returned ${response.status}`);
    const session = await response.json();
    if (!session.access_token) throw Error('Synthetic RLS account login returned no access token');
    sessions.set(accountName, session.access_token);
    return session.access_token;
  }
  let failed = false, blocked = false;
  for (const probe of probes) {
    let status = 'passed', detail = 'Owner can read seeded row; anonymous and unrelated user cannot.';
    try {
      if (!/^[a-z_][a-z0-9_]*$/.test(probe.table) || !/^[a-z_][a-z0-9_]*$/.test(probe.column || 'id')) throw Error('Invalid RLS probe identifier');
      const owner = await tokenFor(probe, 'owner'), outsider = await tokenFor(probe, 'outsider');
      if (!owner || !outsider) { blocked = true; status = 'blocked'; detail = 'Missing RLS test account tokens'; }
      else {
        if (owner === outsider) throw Error('RLS owner and outsider must be different users');
        const identities = [];
        for (const token of [owner, outsider]) {
          const response = await request(`${origin}/auth/v1/user`, { headers: { apikey: env.QA_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
          if (!response.ok) throw Error('RLS test account token is expired or invalid');
          identities.push((await response.json()).id);
        }
        if (!identities[0] || !identities[1] || identities[0] === identities[1]) throw Error('RLS requires two distinct authenticated accounts');
        for (const [role, token] of [['owner', owner], ['outsider', outsider], ['anonymous', null]]) {
          const url = new URL(`/rest/v1/${probe.table}`, origin);
          url.searchParams.set('select', probe.column || 'id');
          url.searchParams.set(probe.column || 'id', `eq.${probe.rowId}`);
          const headers = { apikey: env.QA_SUPABASE_ANON_KEY };
          if (token) headers.Authorization = `Bearer ${token}`;
          const response = await request(url, { headers });
          if (role !== 'owner' && [401, 403].includes(response.status)) continue;
          if (!response.ok) throw Error(`${role} RLS query returned ${response.status}`);
          const rows = await response.json();
          if (!Array.isArray(rows) || (role === 'owner' ? rows.length !== 1 : rows.length !== 0)) throw Error(`${role} read isolation failed on ${probe.table}`);
        }
      }
    } catch (error) { status = 'failed'; detail = error.message; failed = true; }
    record({ id: `rls:${probe.table}:${probe.name || probe.column || 'id'}`, kind: 'security', status, detail });
  }
  for (const [account, token] of sessions) {
    try {
      const response = await request(`${origin}/auth/v1/logout?scope=local`, {
        method: 'POST', headers: { apikey: env.QA_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw Error(`Synthetic session cleanup returned ${response.status}`);
    } catch (error) {
      failed = true;
      record({ id: `rls-session-cleanup:${account}`, kind: 'security', status: 'failed', detail: error.message });
    }
  }
  record({ id: 'rls', kind: 'check', status: failed ? 'failed' : blocked ? 'blocked' : 'passed', detail: `${probes.length} read-isolation fixtures checked. Write-policy journeys require staging.` });
}
