-- ══════════════════════════════════════════════════════════════════════
-- CABANA · Stay bedroom access, space mode, and per-guest pricing
--
-- THE PROBLEM
-- ──────────
-- A 3-bedroom house listed on Cabana could be priced and described as
-- though the guest gets all 3 bedrooms, even when the host intended to
-- rent only 1 and keep the others. Guests had no way to know what they
-- were actually getting.
--
-- Additionally there was no clear signal to a guest about whether they
-- would share the property with the host or other guests, or have it to
-- themselves — a material fact that affects booking decisions.
--
-- Per-guest pricing (a charge per additional guest above a base count)
-- was impossible to express; a large group booking a 2-bed always paid
-- the same as a solo traveller.
--
-- THE MODEL
-- ─────────
-- Five new fields on the listings row, all stored in the extras jsonb
-- column rather than as top-level columns, so no schema migration is
-- needed for existing data and the API endpoint does not change.
--
-- beds_access    : 'all' or an integer string ('1','2',...) — how many
--                  of the total bedrooms the guest actually accesses.
--
-- space_mode     : 'entire' | 'private_room' | 'shared_room'
--                  Tells the guest whether they have the whole place.
--
-- sharing_context: 'host_present' | 'other_guests' | 'host_and_guests'
--                  | 'caretaker' — shown when space_mode != 'entire'.
--
-- base_guests    : integer — how many guests the nightly price covers.
--                  'all' means no per-guest charge.
--
-- per_guest_fee  : numeric — charge per additional guest per night above
--                  base_guests. null if no per-guest pricing.
--
-- All five are optional additive fields that live inside the extras
-- jsonb column already on every listings row. No schema change needed.
--
-- GUEST-FACING DISPLAY
-- ───────────────────
-- The listing detail page (stay.html / apartment.html) reads these
-- fields and shows:
--   · A clear badge: "1 of 3 bedrooms" when beds_access is set
--   · A space-type pill: "Entire place" / "Private room(s)" / "Shared"
--   · A sharing note: "Host will be present" etc.
--   · A dynamic pricing table when per_guest_fee is set
--
-- This migration is a no-op DDL change (comment only) because the data
-- lives in extras jsonb. The real work is in the application layer.
-- We document the shape here so support and future engineers know what
-- these keys mean and why they exist.
-- ══════════════════════════════════════════════════════════════════════

-- Idempotent: adding a comment costs nothing and is safe to re-run.
comment on column public.listings.extras is
  'Freeform JSONB bag for service-specific fields. Known keys for stays:
   beds_access     text    "all" or "1","2",... (bedrooms guest accesses)
   space_mode      text    entire|private_room|shared_room
   sharing_context text    host_present|other_guests|host_and_guests|caretaker
   base_guests     text    integer — guests covered by base nightly rate
   per_guest_fee   numeric extra charge per additional guest per night
   plus            text    OpenLocationCode / Plus Code for the pin
   pinq            text    pin precision grade (rooftop|parcel|street|district|city)
   pinm            numeric pin precision in metres
   (other service-specific keys documented inline in their respective forms)';

-- ── Index for stay/space-mode filtering ──────────────────────────────
-- Guests can filter "Entire place only" — an index on the extracted
-- text value lets that filter scan fast even across millions of rows.
create index if not exists listings_stay_space_mode
  on public.listings ((extras->>'space_mode'))
  where service = 'stays' and is_active = true;

-- ── Index for per-guest pricing queries ──────────────────────────────
-- The pricing calculator on the search page needs to know which
-- listings have per-guest fees so it can show accurate totals.
create index if not exists listings_stay_per_guest
  on public.listings ((extras->>'per_guest_fee'))
  where service = 'stays' and is_active = true
    and extras->>'per_guest_fee' is not null;
