/* ══════════════════════════════════════════════════════════════════════
   APATMENTO. Environment Guard  (api/lib/_env.js)
   ──────────────────────────────────────────────────────────────────────
   Credentials used to carry hardcoded fallbacks. A fallback is a lie the
   code tells itself: the request proceeds, points at a baked-in project,
   and fails somewhere far away with an error that describes a symptom
   rather than the cause.

   These helpers make a missing variable announce itself, by name, at the
   moment it is needed, and never write a secret to a log.
══════════════════════════════════════════════════════════════════════ */

/* Read a required variable, or throw naming exactly what is absent. */
export function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw Object.assign(
      new Error(`Server misconfigured: ${name} is not set`),
      { status: 500, code: 'env_missing', variable: name }
    );
  }
  return String(v).trim();
}

/* Read an optional variable with an explicit, non-secret default. */
export function optional(name, fallback = null) {
  const v = process.env[name];
  return (v && String(v).trim()) ? String(v).trim() : fallback;
}

/* Report which of a set are missing, without throwing.
   Useful for a handler that wants to answer 200 with a diagnosis
   (a webhook receiver, say) rather than blow up on the caller. */
export function missing(...names) {
  return names.filter(n => !process.env[n] || !String(process.env[n]).trim());
}

/* Assert a group up front, so a handler fails at the door rather than
   halfway through a multi-step write. */
export function requireAll(...names) {
  const gaps = missing(...names);
  if (gaps.length) {
    throw Object.assign(
      new Error(`Server misconfigured: missing ${gaps.join(', ')}`),
      { status: 500, code: 'env_missing', variables: gaps }
    );
  }
  const out = {};
  for (const n of names) out[n] = String(process.env[n]).trim();
  return out;
}

/* ── Supabase, resolved once ─────────────────────────────────────────────
   SERVICE role bypasses RLS, for trusted server work only.
   ANON is the key to send when a real user's JWT rides in the
   Authorization header, so auth.uid() resolves to that user and the
   row-level policies actually apply. Falling back to the service key
   there would silently disarm them, so this is deliberately separate. */
export function supabase() {
  return {
    url:        required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey:    optional('SUPABASE_ANON_KEY'),
  };
}

/* Headers for trusted server-side reads and writes (RLS bypassed). */
export function serviceHeaders(extra = {}) {
  const key = required('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey:         key,
    Authorization:  `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/* The canonical public origin. Payment callbacks and e-mail links must
   never advertise a preview deployment, so this is pinned rather than
   derived from the incoming request's Host header. */
export function publicOrigin() {
  const origin = optional('PUBLIC_BASE_URL', 'https://cabana.africa');
  return origin.replace(/\/+$/, '');
}
