/*
 * CLOUDFLARE R2 MEDIA  (api/lib/_r2.js)
 *
 * Supabase's free storage is small; photos are big. Public media goes to
 * the `cabana-media` R2 bucket instead, and the browser uploads straight
 * to it with a short-lived presigned URL, so image bytes never pass
 * through a serverless function.
 *
 * WHAT MAY GO IN R2: public marketing media only. Listing, tour, event,
 * food, shop and car photos, and public avatars. NEVER identity documents,
 * selfies, receipts, payment screenshots, contracts or anything a person
 * would not want on a billboard. Those stay in private Supabase storage
 * behind row-level security. The allow-list below is the enforcement: a
 * kind that is not on it cannot be signed for, whatever the caller asks.
 *
 * Signing is AWS Signature V4 with Node's crypto, so there is no SDK
 * dependency. Environment (all server-side only):
 *   R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */
import { createHash, createHmac, randomUUID } from 'node:crypto';

/* kind → key prefix. Adding a kind here is a privacy decision. */
export const PUBLIC_MEDIA_KINDS = Object.freeze({
  listing: 'listings',
  tour: 'tours',
  event: 'events',
  food: 'food',
  shop: 'shop',
  car: 'cars',
  avatar: 'avatars',
  place: 'places',
});

export const MEDIA_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
});

export const MAX_MEDIA_BYTES = 6 * 1024 * 1024;
const URL_TTL_SECONDS = 300;

function env(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : '';
}

/* R2_ACCOUNT_ID wins; the Workers AI variable is the same Cloudflare
   account, so it is an acceptable fallback. */
function accountId() {
  return env('R2_ACCOUNT_ID') || env('CLOUDFLARE_ACCOUNT_ID');
}

/* A template value that was never replaced must not count as a credential. */
const real = (v) => Boolean(v) && !/^(?:PASTE|YOUR|CHANGE|REPLACE|TODO|XXX)/i.test(v);

export function r2Configured() {
  return Boolean(
    /^[a-f0-9]{32}$/i.test(accountId()) &&
    real(env('R2_ACCESS_KEY_ID')) && real(env('R2_SECRET_ACCESS_KEY')) &&
    env('R2_BUCKET_NAME') && publicBase()
  );
}

function publicBase() {
  const raw = env('R2_PUBLIC_URL').replace(/\/+$/, '');
  return /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~/-]*)?$/i.test(raw) ? raw : '';
}

const sha256hex = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const rfc3986 = (s) => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/* Object keys are generated here, never taken from the caller: a random
   id under a prefix and a per-owner folder. A caller cannot name a path,
   overwrite someone else's file, or climb out of the prefix. */
export function newMediaKey({ kind, ownerId, id = randomUUID() }) {
  const prefix = PUBLIC_MEDIA_KINDS[kind];
  if (!prefix) throw Object.assign(new Error('unsupported_kind'), { status: 400 });
  const owner = String(ownerId || '').toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(owner)) {
    throw Object.assign(new Error('owner_required'), { status: 401 });
  }
  return { prefix, owner, id };
}

/* Presigned PUT. content-type and content-length are SIGNED: R2 rejects an
   upload whose type or size differs from what was approved here. */
export function presignPut({ kind, ownerId, contentType, size, now = new Date(), id }) {
  if (!r2Configured()) throw Object.assign(new Error('r2_not_configured'), { status: 503 });
  const ext = MEDIA_TYPES[contentType];
  if (!ext) throw Object.assign(new Error('unsupported_type'), { status: 415 });
  const bytes = Math.floor(Number(size));
  if (!Number.isFinite(bytes) || bytes < 200 || bytes > MAX_MEDIA_BYTES) {
    throw Object.assign(new Error('bad_size'), { status: 413 });
  }

  const media = newMediaKey({ kind, ownerId, id });
  const { prefix, owner } = media;
  const key = `${prefix}/${owner}/${media.id}.${ext}`;

  const account = accountId();
  const bucket = env('R2_BUCKET_NAME');
  const host = `${account}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${key.split('/').map(rfc3986).join('/')}`;

  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const signedHeaders = 'content-length;content-type;host';

  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env('R2_ACCESS_KEY_ID')}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(URL_TTL_SECONDS),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query).sort()
    .map(k => `${rfc3986(k)}=${rfc3986(query[k])}`).join('&');
  const canonicalHeaders = `content-length:${bytes}\ncontent-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = ['PUT', path, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');

  const kDate = hmac('AWS4' + env('R2_SECRET_ACCESS_KEY'), day);
  const signingKey = hmac(hmac(hmac(kDate, 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    uploadUrl: `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`,
    publicUrl: `${publicBase()}/${key}`,
    key,
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    expiresIn: URL_TTL_SECONDS,
    maxBytes: MAX_MEDIA_BYTES,
  };
}

/* Only URLs under our own public base are treated as R2 media. */
export function isR2PublicUrl(url) {
  const base = publicBase();
  return Boolean(base && typeof url === 'string' && url.startsWith(base + '/'));
}
