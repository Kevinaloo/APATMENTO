/* ══════════════════════════════════════════════════════════════
   APATMENTO. Server-side Supabase helpers (api/_db.js)
   Service-role. Never import into anything the browser can reach.
══════════════════════════════════════════════════════════════ */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function select(table, query = '') {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: headers() });
  if (!r.ok) throw new Error(`select ${table}: ${await r.text()}`);
  return r.json();
}

export async function one(table, query) {
  const rows = await select(table, query + '&limit=1');
  return rows[0] || null;
}

export async function insert(table, row, returning = true) {
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: returning ? 'return=representation' : 'return=minimal' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`insert ${table}: ${await r.text()}`);
  return returning ? (await r.json())[0] : null;
}

export async function update(table, query, patch) {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`update ${table}: ${await r.text()}`);
  return (await r.json())[0] || null;
}

/* Insert, or merge into the existing row when `conflict` already matches.
   PostgREST needs both the resolution=merge-duplicates preference and the
   on_conflict column named explicitly; without the latter it resolves
   against the primary key only, which silently inserts a duplicate on any
   table keyed by something else. */
export async function upsert(table, row, conflict) {
  const qs = conflict ? `?on_conflict=${encodeURIComponent(conflict)}` : '';
  const r = await fetch(`${URL}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`upsert ${table}: ${await r.text()}`);
  const txt = await r.text();
  return txt ? (JSON.parse(txt)[0] || null) : null;
}

export async function rpc(fn, args = {}) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${fn}: ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

/* Who is calling? We trust the bearer token, never the request body. */
export async function whoami(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const r = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

export async function notify(user_id, kind, title, body, meta = {}) {
  if (!user_id) return;
  try { await insert('notifications', { user_id, kind, title, body, meta }, false); }
  catch (e) { console.warn('notify:', e.message); }
}

export function cors(res, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
