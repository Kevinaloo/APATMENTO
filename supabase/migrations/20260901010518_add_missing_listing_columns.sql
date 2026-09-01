-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260901010518_add_missing_listing_columns
-- Author:    Cabana platform fix, 2026-09-01
-- Purpose:   The admin "Edit listing" panel sends four fields that were never
--            present in the listings table, causing:
--
--              Error: Could not find the 'external_url' column of 'listings'
--                     in the schema cache
--
--            This migration adds them correctly. It is idempotent (IF NOT EXISTS)
--            so it is safe to re-run.
--
-- Columns added:
--   external_url  text    — external booking / ordering URL
--   tags          text[]  — curated + custom filter tags
--   event_date    date    — for listings of type=event
--   event_time    text    — human-readable event start time
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS external_url  text,
  ADD COLUMN IF NOT EXISTS tags          text[],
  ADD COLUMN IF NOT EXISTS event_date    date,
  ADD COLUMN IF NOT EXISTS event_time    text;

-- Reload PostgREST schema cache immediately (no server restart required).
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN listings.external_url IS
  'Optional external booking / ordering URL. Used by food, ride, and shopping listings that handle orders off-platform.';

COMMENT ON COLUMN listings.tags IS
  'Admin-curated and partner-supplied tags. Array of text. Used for category-page filtering (e.g. Fast food, Rooftop, Vegan).';

COMMENT ON COLUMN listings.event_date IS
  'ISO date of the event. Only populated for listings of type=event.';

COMMENT ON COLUMN listings.event_time IS
  'Human-readable event start time (e.g. "7:00 PM"). Only for event-type listings.';
