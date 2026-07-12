-- ═══════════════════════════════════════════════════════════════
-- GOD MODE — first-party services & listings support
-- Adds a `source` column to each service table so the admin "God
-- mode" panel can distinguish Apatmento-owned listings (source =
-- 'apatmento') from third-party / scraped / affiliate entries.
--
-- Third-party rows keep source = NULL (or 'scraped'), so God mode
-- never lists or edits them. Run this once in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════

-- Main listings table (stays, rooms, tours, food, shopping)
ALTER TABLE listings        ADD COLUMN IF NOT EXISTS source text;

-- Car hire
ALTER TABLE scraped_carhire ADD COLUMN IF NOT EXISTS source text;

-- Events
ALTER TABLE scraped_events  ADD COLUMN IF NOT EXISTS source text;

-- Helpful indexes for the God-mode queries (filter by source + type)
CREATE INDEX IF NOT EXISTS idx_listings_source       ON listings (source);
CREATE INDEX IF NOT EXISTS idx_listings_source_type  ON listings (source, type);
CREATE INDEX IF NOT EXISTS idx_carhire_source        ON scraped_carhire (source);
CREATE INDEX IF NOT EXISTS idx_events_source         ON scraped_events (source);

-- OPTIONAL: tag any existing scraped rows explicitly (documentation only).
-- Existing third-party rows already have source = NULL, which God mode
-- treats as "not first-party" and leaves untouched. If you prefer an
-- explicit label, uncomment:
-- UPDATE scraped_carhire SET source = 'scraped' WHERE source IS NULL;
-- UPDATE scraped_events  SET source = 'scraped' WHERE source IS NULL;
