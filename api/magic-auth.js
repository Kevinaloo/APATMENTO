/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · /api/magic-auth.js
   Server-side: after client has verified the OTP hash, this endpoint
   uses the service role key to create a real Supabase session for the
   user (existing or new). Returns { access_token, refresh_token, user }.

   POST /api/magic-auth
   Body: { email: string, otpHash: string, secret: string }

   The otpHash (SHA-256 of otp+email) is verified against otp_codes table.
   If valid + not used: mark used, sign in (or create) the user via admin API.
═══════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Shared secret so only our auth.html can call this endpoint
const MAGIC_SECRET      = process.env.MAGIC_AUTH_SECRET || 'apa-magic-2025';

function adminHeaders() {
  return {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { email, otpHash, secret } = body || {};

  if (!email || !otpHash) return res.status(400).json({ error: 'email + otpHash required' });
  if (secret !== MAGIC_SECRET) return res.status(403).json({ error: 'Forbidden' });

  try {
    // 1. Verify OTP hash in DB
    const otpRes = await fetch(
      `${SUPABASE_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email.toLowerCase())}&select=code_hash,expires_at,used`,
      { headers: adminHeaders() }
    );
    const rows = await otpRes.json();
    const row = rows?.[0];

    if (!row) return res.status(401).json({ error: 'No code found. Request a new one.' });
    if (row.used) return res.status(401).json({ error: 'Code already used. Request a new one.' });
    if (new Date(row.expires_at) < new Date()) return res.status(401).json({ error: 'Code expired. Request a new one.' });
    if (row.code_hash !== otpHash) return res.status(401).json({ error: 'Incorrect code.' });

    // 2. Mark OTP as used
    await fetch(
      `${SUPABASE_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email.toLowerCase())}`,
      {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ used: true }),
      }
    );

    // 3. Check if user already exists
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      { headers: adminHeaders() }
    );
    const listData = await listRes.json();
    const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      // Ensure email is confirmed
      if (!existingUser.email_confirmed_at) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: adminHeaders(),
          body: JSON.stringify({ email_confirm: true }),
        });
      }
    } else {
      // 4. Create new user (email confirmed instantly)
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          email,
          email_confirm: true,
          user_metadata: { auth_method: 'magic_link' },
        }),
      });
      const newUser = await createRes.json();
      if (!newUser?.id) {
        console.error('[magic-auth] create failed:', newUser);
        return res.status(500).json({ error: 'Could not create account.' });
      }
      userId = newUser.id;

      // Upsert profile for new user
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...adminHeaders(), 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: userId,
          email: email.toLowerCase(),
          first_name: '',
          last_name: '',
        }),
      });
    }

    // 5. Generate a magic link (OTP) token via admin — gives us a real session
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}/generate-link`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ type: 'magiclink', email }),
    });
    const linkData = await linkRes.json();

    if (!linkData?.properties?.hashed_token) {
      console.error('[magic-auth] generate-link failed:', linkData);
      return res.status(500).json({ error: 'Could not generate session. Try password login.' });
    }

    // 6. Exchange the token for a real access+refresh token
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'magiclink',
        token_hash: linkData.properties.hashed_token,
      }),
    });
    const session = await verifyRes.json();

    if (!session?.access_token) {
      console.error('[magic-auth] verify failed:', session);
      return res.status(500).json({ error: 'Session creation failed. Try password login.' });
    }

    return res.status(200).json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
      is_new_user: !existingUser,
    });

  } catch (err) {
    console.error('[magic-auth] error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
