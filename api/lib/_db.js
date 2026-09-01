/* ══════════════════════════════════════════════════════════════
   CABANA. Server-side Database helpers (api/_db.js)
   Service-role Supabase client with resilient local in-memory
   storage fallback when Supabase credentials are not supplied.
══════════════════════════════════════════════════════════════ */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const _inMemoryStore = {
  support_threads: [],
  support_messages: [],
  support_grounding: [],
  notifications: [],
  profiles: [],
  listings: [],
  bookings: [],
  apa_tasks: [],
};

function parseQueryFilter(query = '') {
  const filters = [];
  const parts = query.split('&').filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('select=') || part.startsWith('order=') || part.startsWith('limit=')) continue;
    const [key, rawVal] = part.split('=');
    if (!key || !rawVal) continue;
    if (rawVal.startsWith('eq.')) filters.push({ key, op: 'eq', val: rawVal.slice(3) });
    else if (rawVal.startsWith('neq.')) filters.push({ key, op: 'neq', val: rawVal.slice(4) });
    else if (rawVal.startsWith('in.')) {
      const list = rawVal.slice(3).replace(/^\(|\)$/g, '').split(',');
      filters.push({ key, op: 'in', val: list });
    } else if (rawVal === 'is.null') filters.push({ key, op: 'null' });
  }
  return filters;
}

function matchesFilters(row, filters) {
  for (const f of filters) {
    const val = row[f.key];
    if (f.op === 'eq' && String(val ?? '') !== String(f.val)) return false;
    if (f.op === 'neq' && String(val ?? '') === String(f.val)) return false;
    if (f.op === 'in' && !f.val.includes(String(val ?? ''))) return false;
    if (f.op === 'null' && val != null) return false;
  }
  return true;
}

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function select(table, query = '') {
  if (!URL || !KEY) {
    const rows = _inMemoryStore[table] || [];
    const filters = parseQueryFilter(query);
    let matched = rows.filter(r => matchesFilters(r, filters));
    if (query.includes('order=') && query.includes('.desc')) {
      matched = [...matched].reverse();
    }
    const limitMatch = query.match(/limit=(\d+)/);
    if (limitMatch) matched = matched.slice(0, parseInt(limitMatch[1], 10));
    return matched;
  }
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: headers() });
  if (!r.ok) throw new Error(`select ${table}: ${await r.text()}`);
  return r.json();
}

export async function one(table, query) {
  const rows = await select(table, query + '&limit=1');
  return rows[0] || null;
}

export async function insert(table, row, returning = true) {
  if (!URL || !KEY) {
    if (!_inMemoryStore[table]) _inMemoryStore[table] = [];
    const newRow = {
      id: row.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      ...row,
    };
    _inMemoryStore[table].push(newRow);
    return returning ? newRow : null;
  }
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: returning ? 'return=representation' : 'return=minimal' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`insert ${table}: ${await r.text()}`);
  return returning ? (await r.json())[0] : null;
}

export async function update(table, query, patch) {
  if (!URL || !KEY) {
    const rows = _inMemoryStore[table] || [];
    const filters = parseQueryFilter(query);
    let updated = null;
    for (const r of rows) {
      if (matchesFilters(r, filters)) {
        Object.assign(r, patch, { updated_at: new Date().toISOString() });
        if (!updated) updated = r;
      }
    }
    return updated;
  }
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`update ${table}: ${await r.text()}`);
  return (await r.json())[0] || null;
}

export async function rpc(fn, args = {}) {
  if (!URL || !KEY) return null;
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${fn}: ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

/* Who is calling? We trust the bearer token, never the request body. */
export async function whoami(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  if (!URL || !KEY) return null;
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
