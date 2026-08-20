/* ══════════════════════════════════════════════════════════════
   PayHero account-level reads  ·  api/lib/_payhero-account.js

   Under lib/ so it is never routed as its own Serverless Function;
   the Hobby plan caps a deployment at 12 and this project is at the
   ceiling.

   WHY THIS EXISTS
   ───────────────
   On 2026-08-18 a guest tried to pay KES 463 and PayHero answered:

     BAD_REQUEST — "merchant has insufficient balance to allow you
                    complete this transaction. kinldy reach out to them."

   That is our service wallet, not the guest's M-Pesa. It had been
   true for ten days: every payment that ever settled in this system
   was exactly KES 10, and every real booking amount — 463, 513, 575,
   2050 — was refused or stranded. Nothing anywhere surfaced it,
   because stk-push only read `message`/`error` from PayHero's body
   while the reason sits in `error_message`.

   Collecting money on a float you cannot see is the actual defect.
   This reads the float so the failure is never silent again.
══════════════════════════════════════════════════════════════ */

const BASE = 'https://backend.payhero.co.ke/api/v2';

export function payheroAuth() {
  const user = process.env.PAYHERO_USERNAME;
  const pass = process.env.PAYHERO_PASSWORD;
  if (!user || !pass) return null;
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

async function getJson(path, auth, ms) {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), ms);
  try {
    const r   = await fetch(BASE + path, {
      headers: { Authorization: auth, Accept: 'application/json' },
      signal:  ac.signal,
    });
    const txt = await r.text();
    let body; try { body = JSON.parse(txt); } catch { body = txt; }
    return { ok: r.ok, http: r.status, body };
  } finally { clearTimeout(t); }
}

/* PayHero's wallet payload is not documented in machine-readable form
   (their docs render client-side), so rather than hard-code a guessed
   field this walks the response for the first plausible balance and
   hands back the raw body alongside it. A wrong guess must never be
   the thing that decides whether a guest may pay. */
function findBalance(body) {
  if (body == null) return null;

  const KEYS = [
    'service_wallet_balance', 'service_balance', 'payment_wallet_balance',
    'available_balance', 'balance', 'amount', 'wallet_balance',
  ];

  const walk = (node, depth) => {
    if (depth > 4 || node == null) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = walk(item, depth + 1);
        if (hit !== null) return hit;
      }
      return null;
    }
    if (typeof node !== 'object') return null;

    for (const key of KEYS) {
      if (key in node) {
        const n = Number(node[key]);
        if (Number.isFinite(n)) return n;
      }
    }
    for (const value of Object.values(node)) {
      const hit = walk(value, depth + 1);
      if (hit !== null) return hit;
    }
    return null;
  };

  return walk(body, 0);
}

/* Never throws and never rejects: this runs beside a live payment and
   must not be able to take one down. `balance: null` means "could not
   read it", which is different from "it is zero" and callers must not
   collapse the two. */
export async function walletBalance(timeoutMs = 6000) {
  const auth = payheroAuth();
  if (!auth) return { ok: false, balance: null, error: 'payhero_credentials_missing' };

  try {
    const { ok, http, body } = await getJson('/wallets', auth, timeoutMs);
    if (!ok) return { ok: false, balance: null, http, error: 'payhero_wallets_http_' + http };
    return { ok: true, balance: findBalance(body), http, raw: body };
  } catch (e) {
    return {
      ok: false, balance: null,
      error: e.name === 'AbortError' ? 'payhero_wallets_timeout' : e.message,
    };
  }
}
