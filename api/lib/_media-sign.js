/*
 * POST /api/media-sign   (routed through api/utilities.js?action=media-sign)
 *
 * Hands a signed-in user a short-lived URL to upload ONE public image
 * straight to R2. See _r2.js for what may and may not be stored there.
 *   body:  { kind, contentType, size }   or   { op: 'delete', url }
 *   reply: { uploadUrl, publicUrl, headers, expiresIn, maxBytes }
 */
import { setCors, requireUser, consumeRateLimit, isAdminUser } from './_security.js';
import { presignPut, r2Configured, keyForOwnedUrl, deleteObject, publicMediaBase, PUBLIC_MEDIA_KINDS, MEDIA_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from './_r2.js';

export default async function mediaSignHandler(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    /* Lets the client ask once whether R2 is wired, without a login. */
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ enabled: r2Configured(), base: r2Configured() ? publicMediaBase() : null, kinds: Object.keys(PUBLIC_MEDIA_KINDS), types: Object.keys(MEDIA_TYPES), maxBytes: MAX_IMAGE_BYTES, maxVideoBytes: MAX_VIDEO_BYTES });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const user = await requireUser(req, res);
  if (!user) return;
  if (!consumeRateLimit(req, res, 'media-sign', 40, 60_000, user.id)) return;
  if (!consumeRateLimit(req, res, 'media-sign-hour', 400, 3_600_000, user.id)) return;
  if (!r2Configured()) return res.status(503).json({ error: 'r2_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  /* Deleting your own media (a removed photo, an abandoned draft). */
  if (body.op === 'delete') {
    const key = keyForOwnedUrl(String(body.url || ''), user.id, { admin: await isAdminUser(user).catch(() => false) });
    if (!key) return res.status(403).json({ error: 'not_yours' });
    try { await deleteObject(key); return res.status(200).json({ ok: true }); }
    catch { return res.status(502).json({ error: 'delete_failed' }); }
  }

  try {
    const signed = presignPut({
      kind: String(body.kind || ''),
      ownerId: user.id,
      contentType: String(body.contentType || '').toLowerCase(),
      size: body.size,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, ...signed });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: status === 500 ? 'sign_failed' : e.message });
  }
}
