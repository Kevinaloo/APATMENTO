/* Shared request-security primitives for Cabana serverless routes.
   Keep this module dependency-free: every API function can import it
   without increasing the serverless bundle or exposing service keys. */

import crypto from 'node:crypto';

const ALLOWED_ORIGINS = new Set([
  'https://cabana.africa',
  'https://www.cabana.africa',
  'https://apatmento.space',
  'https://www.apatmento.space',
  'https://apatmento.vercel.app',
]);

const rateBuckets = new Map();

function firstHeader(value) {
  return Array.isArray(value) ? value[0] : (value || '');
}

export function requestIp(req) {
  return firstHeader(req.headers?.['x-forwarded-for']).split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
      || (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app'));
  } catch {
    return false;
  }
}

export function setCors(req, res, methods = 'POST, OPTIONS') {
  const origin = firstHeader(req.headers?.origin);
  if (isAllowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-admin-secret, x-internal-secret'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function constantTimeEqual(supplied, expected) {
  if (!supplied || !expected) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function bearerToken(req) {
  const auth = firstHeader(req.headers?.authorization);
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

export function hasInternalSecret(req, envName = 'INTERNAL_API_SECRET') {
  const expected = process.env[envName];
  const supplied = firstHeader(req.headers?.['x-internal-secret'])
    || firstHeader(req.headers?.['x-admin-secret']);
  return constantTimeEqual(supplied, expected);
}

export function isCronAuthorized(req) {
  return constantTimeEqual(bearerToken(req), process.env.CRON_SECRET);
}

export async function authenticatedUser(req) {
  const token = bearerToken(req);
  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !apiKey) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export async function isAdminUser(user) {
  if (!user?.email) return false;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const response = await fetch(
      `${url}/rest/v1/admin_users?email=eq.${encodeURIComponent(user.email.toLowerCase())}&select=email&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = response.ok ? await response.json() : [];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function requireUser(req, res) {
  const user = await authenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'authentication_required' });
    return null;
  }
  return user;
}

export async function requireAdmin(req, res) {
  const user = await authenticatedUser(req);
  if (!user || !(await isAdminUser(user))) {
    res.status(user ? 403 : 401).json({
      error: user ? 'admin_required' : 'authentication_required',
    });
    return null;
  }
  return user;
}

export function consumeRateLimit(req, res, scope, limit = 10, windowMs = 60_000, identity = '') {
  const now = Date.now();
  const key = `${scope}:${identity || requestIp(req)}`;
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'rate_limit_exceeded', retry_after: retryAfter });
    return false;
  }
  return true;
}

export function safeErrorMessage(error, fallback = 'Request failed') {
  if (process.env.NODE_ENV === 'development') return error?.message || fallback;
  return fallback;
}
