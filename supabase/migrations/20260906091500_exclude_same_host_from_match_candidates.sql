-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · find_match_candidates(): four bugs, one function
-- ───────────────────────────────────────────────────────────────────
-- Both api/lib/_match-guest.js (Match Guest / rehoming) and
-- api/lib/_checkin-issue.js (check-in issue auto-redirect) call this
-- RPC first and only fall back to an equivalent, weaker client-side
-- ranking if it errors. It has been erroring on every call:
--
-- 1. apartment_bookings.apartment_id is text; listings.id is uuid.
--    Every raw `=` between them threw "operator does not exist:
--    uuid = text" — the function has never once returned a result in
--    production. Fixed with explicit ::text casts.
--
-- 2. listings.photos is text[] (legacy from scraped-listing imports),
--    not jsonb. coalesce(l.photos, '[]'::jsonb) failed to typecheck.
--    Fixed with to_jsonb(l.photos).
--
-- 3. listings.max_guests and listings.beds are also text, not
--    integer, for the same legacy reason. `l.max_guests >= b.num_guests`
--    threw "operator does not exist: text >= integer". Fixed by
--    parsing each defensively (a value that isn't a clean number is
--    excluded from candidates rather than crashing the search or
--    silently coercing garbage into a number) and changing the
--    function's declared return columns for beds/max_guests from int
--    to text to match the real column type exactly, removing any
--    remaining implicit-cast risk on rows with irregular data.
--
-- 4. No exclusion for the origin host's OTHER listings. A guest whose
--    host said "I can't host you" (Match Guest) — or who is fleeing a
--    host-fault issue at check-in (fake listing, unsafe, unreachable
--    host, wrong address, already occupied) — could be handed straight
--    back to that same host's next-nearest property. For Match Guest
--    that's a commission-gaming vector (the host earns 30% by
--    shuffling their own inventory); for a check-in issue it can be
--    a safety problem, since the issue is a fact about the host, not
--    just the unit. Fixed by excluding `l.host_id = b.host_id`.
--
-- The function's return signature changed (beds/max_guests: int -> text),
-- so it must be dropped and recreated rather than replaced in place.
-- Additive, safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

drop function if exists public.find_match_candidates(uuid, integer);

create function public.find_match_candidates(
  p_booking uuid, p_limit int default 6
) returns table (
  listing_id text, title text, location text, city text, price_night numeric,
  beds text, max_guests text, property_type text, photos jsonb,
  internal_score numeric, distance_km numeric, price_delta numeric, score numeric,
  host_id uuid, lat numeric, lng numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  b public.apartment_bookings%rowtype;
  src public.listings%rowtype;
  src_beds numeric;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  select * into src from public.listings where id::text = b.apartment_id;
  src_beds := case when src.beds ~ '^\d+(\.\d+)?$' then src.beds::numeric end;

  return query
  with pool as (
    select l.*,
           case when l.max_guests ~ '^\d+(\.\d+)?$' then l.max_guests::numeric end as max_guests_n,
           case when l.beds ~ '^\d+(\.\d+)?$' then l.beds::numeric end as beds_n
      from public.listings l
     where l.id::text <> b.apartment_id
       and l.status = 'active'
       and l.host_id is distinct from b.host_id
       and l.price_night between src.price_night * 0.75 and src.price_night * 1.25
  )
  select p.id::text, p.title, p.location, p.city,
         p.price_night, p.beds, p.max_guests,
         p.property_type, coalesce(to_jsonb(p.photos), '[]'::jsonb),
         p.internal_score,
         case when src.lat is null or p.lat is null then null
              else round((6371 * acos(least(1, greatest(-1,
                     cos(radians(src.lat))*cos(radians(p.lat))*cos(radians(p.lng)-radians(src.lng))
                   + sin(radians(src.lat))*sin(radians(p.lat)))))) ::numeric, 2) end,
         round(p.price_night - src.price_night, 2),
         round((
             35 * greatest(0, 1 - abs(p.price_night - src.price_night) / nullif(src.price_night,0))
           + 25 * (case when p.city is not distinct from src.city then 1 else 0.35 end)
           + 15 * greatest(0, 1 - (p.max_guests_n - b.num_guests) / 6)
           + 13 * (case when p.property_type is not distinct from src.property_type then 1 else 0 end)
           + 7  * (case when src_beds is null or p.beds_n is null then 0.5
                        else greatest(0, 1 - abs(p.beds_n - src_beds) / 4) end)
           + 5  * (coalesce(p.internal_score,50) / 100)
         )::numeric, 2),
         p.host_id, p.lat, p.lng
    from pool p
   where p.max_guests_n is not null
     and p.max_guests_n >= b.num_guests
     and not exists (
       select 1 from public.apartment_bookings ob
        where ob.apartment_id = p.id::text
          and ob.cancelled_at is null
          and ob.status in ('paid_pending_checkin','deposit_paid','checked_in')
          and daterange(ob.checkin_date, ob.checkout_date, '[)')
              && daterange(b.checkin_date, b.checkout_date, '[)')
     )
     and coalesce((select pr.host_status from public.profiles pr where pr.id = p.host_id),'active') = 'active'
   order by score desc, coalesce(p.internal_score,50) desc
   limit p_limit;
end; $$;
