-- ═══════════════════════════════════════════════════════════════
-- GOD MODE — first-party services & listings support
-- Adds a `source` column to listings so the admin "God mode" panel
-- can distinguish Cabana-owned listings (source = 'apatmento') from
-- partner-submitted ones.
--
-- The scraped_carhire and scraped_events clauses that used to live
-- here were dropped along with the scraper: Cabana no longer lists
-- supply it did not author. See
-- supabase/migrations/20260822150000_drop_scraped_supply.sql
--
-- Run once in the Supabase SQL editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════

-- Main listings table (stays, rooms, tours, food, shopping)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source text;

-- Helpful indexes for the God-mode queries (filter by source + type)
CREATE INDEX IF NOT EXISTS idx_listings_source      ON listings (source);
CREATE INDEX IF NOT EXISTS idx_listings_source_type ON listings (source, type);
