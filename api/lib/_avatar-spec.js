/* Server copy of the avatar spec contract in /cabana-avatars.js.
   tests/people-profiles.test.mjs asserts both files agree, so a new
   hair style or animal cannot reach the database unvalidated. */
export const AVATAR_RANGES = Object.freeze({
  p: Object.freeze({ s: 10, h: 16, hc: 9, fc: 9, e: 5, m: 6, f: 4, x: 9, w: 4, o: 10, b: 12, mo: 3 }),
  a: Object.freeze({ a: 12, t: 4, x: 6, b: 12, mo: 3 }),
  e: Object.freeze({ sh: 6, pt: 6, c: 8, g: 13, mo: 3 }),
});

export function cleanAvatar(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return null;
  const R = AVATAR_RANGES[spec.k];
  if (!R) return null;
  const out = { v: 1, k: spec.k };
  for (const key of Object.keys(R)) {
    const n = Number(spec[key]);
    if (!Number.isInteger(n) || n < 0 || n >= R[key]) return null;
    out[key] = n;
  }
  if (typeof spec.n === 'string' && /^[a-z0-9-]{1,24}$/.test(spec.n)) out.n = spec.n;
  return out;
}
