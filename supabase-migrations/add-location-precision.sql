-- ════════════════════════════════════════════════════════════════════
-- Cabana · location precision
-- ────────────────────────────────────────────────────────────────────
-- OPTIONAL. Nothing in the app requires this migration to have run.
--
-- cabana-pinpoint.js gives hosts and operators satellite imagery, a
-- crosshair and a Plus Code, so the pins coming in now are accurate to
-- a few metres rather than a few hundred. Two of those facts already
-- have somewhere to live:
--
--   listings   → latitude / longitude, plus extras.plus / extras.pinq
--                (extras is jsonb, so it took the new fields as-is)
--   events     → latitude / longitude, Plus Code appended to address
--   tours      → Plus Code appended to meeting_point
--
-- The text-appended cases work today and are genuinely useful — a Plus
-- Code in an address line is what a guest pastes into a navigation app.
-- This migration is for when you want them structured instead: sortable,
-- indexable, and available to radius search.
--
-- Run it, then the columns are there. The client keeps writing the text
-- form either way; migrate the reads at your own pace.
-- ════════════════════════════════════════════════════════════════════

-- ── Tours: the meeting point is a doorway, not the destination ───────
-- A Mara trip departs from a Nairobi hotel 250km from the reserve, so
-- the meeting point needs coordinates of its own rather than borrowing
-- the destination's.
alter table if exists tours
  add column if not exists meeting_lat   double precision,
  add column if not exists meeting_lng   double precision,
  add column if not exists meeting_plus  text;

comment on column tours.meeting_plus is
  'Open Location Code (Plus Code) for the meeting point, 11 digits (~3m).';

-- ── Events: the entrance guests should walk through ──────────────────
alter table if exists events
  add column if not exists venue_plus text;

comment on column events.venue_plus is
  'Open Location Code (Plus Code) for the venue entrance, 11 digits (~3m).';

-- ── Listings: how good the pin actually is ───────────────────────────
-- Already carried in extras (plus / pinq / pinm). Promote them here if
-- you want to query on precision — for example, to chase up the hosts
-- whose pins are still only district-accurate.
alter table if exists listings
  add column if not exists plus_code      text,
  add column if not exists pin_precision  text,
  add column if not exists pin_metres     integer;

comment on column listings.pin_precision is
  'rooftop | parcel | street | district | city — see precisionOf() in '
  'cabana-pinpoint.js. Never inferred; recorded from how the pin was placed.';

-- Backfill from extras for rows that already have it.
update listings
   set plus_code     = coalesce(plus_code, extras->>'plus'),
       pin_precision = coalesce(pin_precision, extras->>'pinq'),
       pin_metres    = coalesce(pin_metres, nullif(extras->>'pinm', '')::integer)
 where extras ? 'plus'
   and plus_code is null;

-- Finding everything near a point is the query this all exists to serve.
create index if not exists listings_latlng_idx  on listings (latitude, longitude);
create index if not exists tours_meeting_idx    on tours (meeting_lat, meeting_lng);
