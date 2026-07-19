-- ═══════════════════════════════════════════════════════════════
-- LAZY REQUESTS — partners who want us to set up their listing
-- Run once in Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lazy_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  phone         text NOT NULL,
  listing_type  text,
  notes         text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','contacted','listed','cancelled')),
  source        text DEFAULT 'become-partner',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS idx_lazy_requests_status ON lazy_requests (status, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lazy_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_lazy_updated_at ON lazy_requests;
CREATE TRIGGER trg_lazy_updated_at
  BEFORE UPDATE ON lazy_requests
  FOR EACH ROW EXECUTE FUNCTION update_lazy_updated_at();

-- RLS: anon can INSERT only; admin reads/updates via service role or admin bypass
ALTER TABLE lazy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lazy request"
  ON lazy_requests FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated admin reads all"
  ON lazy_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated admin updates all"
  ON lazy_requests FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated admin deletes"
  ON lazy_requests FOR DELETE TO authenticated
  USING (true);
