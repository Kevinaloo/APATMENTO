-- ══════════════════════════════════════════════════════════════════════
-- CABANA · Stay room tiers: flexible bedroom-level pricing
--
-- THE PROBLEM
-- ──────────
-- A host with a 3-bedroom property had exactly one price. A solo traveller
-- and a family of 6 paid the same rate — or the host had to create
-- multiple listings for the same property, leading to calendar conflicts,
-- duplicated management and confused search results.
--
-- When a guest saw "3 bedrooms" and booked as a couple expecting one room,
-- then arrived to find two other rooms they weren't supposed to use, that
-- was a dispute. When a group of 4 saw the same property listed at a
-- 2-person rate and assumed it included all rooms, that was also a dispute.
--
-- THE MODEL: ROOM TIERS
-- ─────────────────────
-- One listing, multiple price points. The host defines up to N tiers
-- (one per bedroom count). Each tier specifies:
--
--   beds        integer    how many bedrooms the guest gets access to
--   label       text       human name shown to guests ("1 Bedroom Suite")
--   maxGuests   integer    maximum occupants for this tier
--   price       numeric    nightly rate for this tier
--   perGuest    numeric    optional: extra charge per guest above 2
--
-- Example:
--   [
--     { beds:1, label:"1 Bedroom",       maxGuests:2, price:2500, perGuest:0   },
--     { beds:2, label:"2 Bedrooms",      maxGuests:4, price:3500, perGuest:500 },
--     { beds:3, label:"Whole house",     maxGuests:6, price:9000, perGuest:0   }
--   ]
--
-- GUEST EXPERIENCE
-- ────────────────
-- On the listing detail page, guests see a "Choose your option" section
-- before the date picker. Each tier shows as a card:
--
--   ┌─────────────────────────────────────────┐
--   │  🛏  1 Bedroom          Entire place    │
--   │  Up to 2 guests                         │
--   │  KES 2,500 /night                       │
--   └─────────────────────────────────────────┘
--
-- They select a tier, then pick dates. The calendar respects the
-- selected tier's booking (a 1-bed booking doesn't block the 3-bed tier).
--
-- SPACE ARRANGEMENT
-- ─────────────────
-- space_mode     : 'entire' | 'private_room' | 'shared_room'
-- sharing_context: 'host_present' | 'other_guests' | 'host_and_guests' | 'caretaker'
--
-- Both live in extras jsonb. No DDL needed.
--
-- Idempotent. Additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

comment on column public.listings.extras is
  'Freeform JSONB bag for service-specific fields.

   STAYS — room tier pricing (key: room_tiers):
     Array of tier objects:
       beds        integer   bedrooms the guest accesses
       label       text      display name ("1 Bedroom Suite")
       maxGuests   integer   max occupants
       price       numeric   nightly rate
       perGuest    numeric   extra charge per guest above 2 (0 = flat rate)
     The listing price_night is always set to min(tier.price) for search ranking.

   STAYS — space arrangement:
     space_mode      text   entire|private_room|shared_room
     sharing_context text   host_present|other_guests|host_and_guests|caretaker

   GENERAL PIN FIELDS:
     plus   text      OpenLocationCode / Plus Code
     pinq   text      pin precision (rooftop|parcel|street|district|city)
     pinm   numeric   pin precision in metres

   Other service-specific keys documented inline in each listing form.';

-- ── Index: space_mode filter on stays ─────────────────────────────────
create index if not exists listings_stay_space_mode
  on public.listings ((extras->>'space_mode'))
  where service = 'stays' and is_active = true;

-- ── Index: listings with room tiers ───────────────────────────────────
-- Lets the search and listing-detail pages quickly find multi-tier stays.
create index if not exists listings_stay_has_room_tiers
  on public.listings ((extras->'room_tiers' is not null))
  where service = 'stays' and is_active = true;

-- ── Index: per-tier guest max (used by availability/capacity filter) ──
-- When a guest searches for "4 guests", the search layer reads the tiers
-- to find listings that have ANY tier accommodating 4+, not just listings
-- whose overall max_guests >= 4. This index supports that filter.
create index if not exists listings_stay_room_tiers_gin
  on public.listings using gin ((extras->'room_tiers'))
  where service = 'stays' and is_active = true;
