-- ══════════════════════════════════════════════════════════════════
-- Cabana · Close the coordinates gap for tours and events
-- ──────────────────────────────────────────────────────────────────
-- The location system (apa-geo.js / api/geocode.js) resolves every
-- typed place to a lat/lng point and carries those coordinates to the
-- database. Apartments already have latitude/longitude columns, so
-- stays are already searchable by radius.
--
-- Tours and events had no such columns, so operators got autocomplete
-- and consistent city spelling from the new system, but the coordinates
-- were silently discarded on insert. A Mara safari and a Diani beach
-- tour both lived in the same substring-match world as before.
--
-- This migration adds the two columns to both tables. The insert paths
-- in cabana-list-tour.js and cabana-list-event.js already write them
-- (the JS was updated alongside this migration). Existing rows keep
-- NULL until re-submitted or backfilled via geocode.
--
-- Nothing else is blocking radius search for tours and events once
-- these columns exist; ApaGeo.nearby() and ApaGeo.match() handle the
-- rest the same way they do for stays.
-- ══════════════════════════════════════════════════════════════════

-- Tours: destination coordinates
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for bounding-box pre-filtering before precise distance maths.
-- A plain B-tree on (latitude, longitude) is cheaper than PostGIS for
-- the simple radius queries this platform runs and needs no extension.
CREATE INDEX IF NOT EXISTS tours_geo_idx
  ON public.tours (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.tours.latitude  IS
  'WGS-84 latitude of the tour destination, resolved at listing time by apa-geo.js.';
COMMENT ON COLUMN public.tours.longitude IS
  'WGS-84 longitude of the tour destination, resolved at listing time by apa-geo.js.';


-- Events: venue coordinates
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS events_geo_idx
  ON public.events (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.events.latitude  IS
  'WGS-84 latitude of the event venue, resolved at listing time by apa-geo.js.';
COMMENT ON COLUMN public.events.longitude IS
  'WGS-84 longitude of the event venue, resolved at listing time by apa-geo.js.';
