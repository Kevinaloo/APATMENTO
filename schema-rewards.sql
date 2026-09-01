-- ══════════════════════════════════════════════════════════════
-- APATMENTO — Rewards & Referral Schema + Security
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── 1. referral_codes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enforce unique codes and one code per user
ALTER TABLE referral_codes
  ADD CONSTRAINT IF NOT EXISTS referral_codes_code_unique    UNIQUE (code),
  ADD CONSTRAINT IF NOT EXISTS referral_codes_user_id_unique UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code    ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);

-- ── 2. referrals ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_type  text NOT NULL DEFAULT 'user' CHECK (referral_type IN ('user','host')),
  code_used      text NOT NULL,
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz DEFAULT now()
);

-- Each user can only be referred once
ALTER TABLE referrals
  ADD CONSTRAINT IF NOT EXISTS referrals_referred_id_unique UNIQUE (referred_id);

-- No self-referrals at DB level
ALTER TABLE referrals
  ADD CONSTRAINT IF NOT EXISTS referrals_no_self_referral CHECK (referrer_id <> referred_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id  ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id  ON referrals(referred_id);

-- ── 3. referral_earnings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_earnings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type    text NOT NULL,
  gross_amount    numeric(12,2) NOT NULL,
  platform_fee    numeric(12,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_kes  numeric(12,2) NOT NULL,
  status          text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','reversed')),
  booking_ref     text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- One commission record per booking — prevents duplicate awards
ALTER TABLE referral_earnings
  ADD CONSTRAINT IF NOT EXISTS referral_earnings_booking_ref_unique UNIQUE (booking_ref);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred_id ON referral_earnings(referred_id);

-- ── 4. referral_withdrawals ──────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_withdrawals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kes    numeric(12,2) NOT NULL CHECK (amount_kes >= 50),
  mpesa_number  text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  processed_at  timestamptz,
  notes         text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_user_id ON referral_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_status  ON referral_withdrawals(status);

-- ── 5. user_points ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_points (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_points integer NOT NULL DEFAULT 0 CHECK (available_points >= 0),
  lifetime_points  integer NOT NULL DEFAULT 0,
  updated_at       timestamptz DEFAULT now()
);

-- ── 6. point_transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('earn','redeem')),
  points       integer NOT NULL,
  amount_kes   numeric(12,2),
  service_type text,
  booking_ref  text,
  description  text,
  created_at   timestamptz DEFAULT now()
);

-- One earn transaction per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_booking_earn
  ON point_transactions(booking_ref, type)
  WHERE type = 'earn' AND booking_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pt_user_id ON point_transactions(user_id);

-- ══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- The anon key can read referral_codes (to look up a code at signup).
-- All write operations must go through api/rewards.js (service role).
-- Users can read their own records only.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE referral_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_withdrawals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points           ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions    ENABLE ROW LEVEL SECURITY;

-- referral_codes: anyone can look up a code (needed to show it to new signups)
DROP POLICY IF EXISTS "public can read referral_codes"  ON referral_codes;
DROP POLICY IF EXISTS "owner can read their own code"   ON referral_codes;

CREATE POLICY "anon can lookup code by value"
  ON referral_codes FOR SELECT
  USING (true);  -- read-only; inserts go via service role in api/rewards.js

-- referrals: user sees their own referrals (as referrer or referred)
DROP POLICY IF EXISTS "user sees own referrals" ON referrals;
CREATE POLICY "user sees own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- No direct inserts/updates from browser
CREATE POLICY "no direct insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (false);  -- only service role bypasses RLS

-- referral_earnings: referrer sees their own earnings
DROP POLICY IF EXISTS "referrer sees own earnings" ON referral_earnings;
CREATE POLICY "referrer sees own earnings"
  ON referral_earnings FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "no direct insert earnings"
  ON referral_earnings FOR INSERT
  WITH CHECK (false);

-- referral_withdrawals: user sees their own requests
DROP POLICY IF EXISTS "user sees own withdrawals" ON referral_withdrawals;
CREATE POLICY "user sees own withdrawals"
  ON referral_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "no direct insert withdrawals"
  ON referral_withdrawals FOR INSERT
  WITH CHECK (false);

-- user_points: user sees their own balance
DROP POLICY IF EXISTS "user sees own points" ON user_points;
CREATE POLICY "user sees own points"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "no direct update points"
  ON user_points FOR ALL
  WITH CHECK (false);

-- point_transactions: user sees their own history
DROP POLICY IF EXISTS "user sees own transactions" ON point_transactions;
CREATE POLICY "user sees own transactions"
  ON point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "no direct insert transactions"
  ON point_transactions FOR INSERT
  WITH CHECK (false);

-- ══════════════════════════════════════════════════════════════
-- ATOMIC POINTS RPC (avoids read-then-write race condition)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id     uuid,
  p_delta       integer,
  p_add_lifetime boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as owner (service role), bypasses RLS
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  INSERT INTO user_points (user_id, available_points, lifetime_points, updated_at)
  VALUES (
    p_user_id,
    GREATEST(0, p_delta),
    CASE WHEN p_add_lifetime THEN GREATEST(0, p_delta) ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET available_points = GREATEST(0, user_points.available_points + p_delta),
        lifetime_points  = user_points.lifetime_points + CASE WHEN p_add_lifetime THEN GREATEST(0, p_delta) ELSE 0 END,
        updated_at       = now();
END;
$$;

-- Revoke public execute — only service role (backend) can call it
REVOKE EXECUTE ON FUNCTION add_user_points FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION add_user_points TO service_role;
