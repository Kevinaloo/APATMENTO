-- ══════════════════════════════════════════════════════════════════════
-- CABANA GROWTH ENGINE
--
--   BEACON   One catalogue of everything that is live, and a change feed
--            that tells search engines within a minute of a host
--            publishing, pausing or deleting.
--   COMPASS  One profile per person, built from what they actually do.
--   APA      Conversations end. What was learned in them does not.
--
-- WHY THE CATALOGUE LIVES HERE
-- ────────────────────────────
-- Before this, "what is for sale" was answered five different ways: the
-- SEO build read listings with a Python script, the map read them in
-- _atlas.js, APA read the newest 200 in _support.js, the share card read
-- one, and search read them in the browser. Five readers of one table is
-- five chances to disagree about whether a paused listing is live. A page
-- that says something is bookable when APA says it is not is the kind of
-- inconsistency both guests and search engines punish.
--
-- beacon_catalogue() is the only definition of "live". Every surface
-- reads it, so they agree by construction.
--
-- SAFETY
-- ──────
-- The change-feed trigger sits on listings, which is written on every
-- booking and every view counter. It ignores columns that do not change
-- what a page says, and it can never fail a write: any error inside it is
-- downgraded to a warning. A broken feed costs a late IndexNow ping; a
-- broken trigger would cost a booking.
--
-- Additive only. Nothing existing is altered except two new columns on
-- support_threads.
-- ══════════════════════════════════════════════════════════════════════

-- ── 0 · Small helpers ────────────────────────────────────────────────

/* Several listing columns are text in the live schema (beds, baths,
   max_guests). A host typing "2-3" must not break the catalogue. */
create or replace function public.growth_num(p text)
returns numeric
language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select case when p ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then btrim(p)::numeric end
$$;

/* Photos are text[] on listings and jsonb on tours, events and cars, where
   an element may be a URL string or an object carrying one. */
create or replace function public.growth_photos(p_cover text, p_list jsonb, p_max int default 6)
returns jsonb
language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select coalesce(jsonb_agg(u order by o), '[]'::jsonb)
    from (
      select u, min(o) as o
        from (
          select p_cover as u, 0 as o where p_cover ~ '^https://'
          union all
          select case jsonb_typeof(e)
                   when 'string' then e #>> '{}'
                   when 'object' then coalesce(e ->> 'url', e ->> 'src', e ->> 'href')
                 end, ord
            from jsonb_array_elements(case when jsonb_typeof(p_list) = 'array' then p_list else '[]'::jsonb end)
                 with ordinality as x(e, ord)
        ) raw
       where u ~ '^https://'
       group by u
       order by min(o)
       limit greatest(1, least(p_max, 60))
    ) picked
$$;

/* The listings table carries several services. Each maps to the page
   family that shows it. Rides are not pages (a ride is a request, not a
   thing you browse), so they map to nothing. */
create or replace function public.beacon_listing_kind(p_service text, p_type text)
returns text
language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select case lower(coalesce(nullif(btrim(p_service), ''),
                             case when lower(coalesce(p_type, '')) = 'room' then 'roommates' else 'stays' end))
           when 'stays'     then 'stay'
           when 'roommates' then 'room'
           when 'food'      then 'food'
           when 'shopping'  then 'shop'
           when 'tours'     then 'tour'
           when 'events'    then 'event'
           when 'carhire'   then 'car'
           else null
         end
$$;

-- ── 1 · BEACON · the catalogue ───────────────────────────────────────

/* Everything a guest could book right now, one row per thing, public
   fields only. No street, no phone, no email, no exact pin: coordinates
   are rounded to two decimals (about a kilometre), which is enough for a
   map tile and a search engine's sense of place and not enough to find a
   door. */
create or replace function public.beacon_catalogue(p_limit int default 20000)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v jsonb;
begin
  with
  lst as (
    select jsonb_strip_nulls(jsonb_build_object(
      'kind', public.beacon_listing_kind(l.service, l.type),
      'id', l.id,
      'service', lower(coalesce(nullif(btrim(l.service), ''), 'stays')),
      'title', l.title,
      'type', coalesce(nullif(l.property_type, ''), nullif(l.type, '')),
      'city', nullif(btrim(l.city), ''),
      'area', nullif(btrim(l.area), ''),
      'country', nullif(btrim(l.country), ''),
      'lat', round(coalesce(l.lat, l.latitude)::numeric, 2),
      'lng', round(coalesce(l.lng, l.longitude)::numeric, 2),
      'price', coalesce(nullif(l.price_night, 0), nullif(l.price_per_night, 0), rp.avg_price),
      'currency', upper(coalesce(nullif(btrim(l.currency), ''), 'KES')),
      'photos', public.growth_photos(rp.hero_photo, to_jsonb(coalesce(l.photos, '{}'::text[])), 6),
      'photo_count', coalesce(array_length(l.photos, 1), 0),
      'amenities', coalesce(to_jsonb((coalesce(l.amenities, '{}'::text[]))[1:24]), '[]'::jsonb),
      'bedrooms', coalesce(l.bedrooms::numeric, public.growth_num(l.beds)),
      'baths', coalesce(l.bathrooms::numeric, public.growth_num(l.baths)),
      'guests', public.growth_num(l.max_guests),
      'rating', nullif(l.avg_rating, 0),
      'reviews', coalesce(l.review_count, 0),
      'updated_at', coalesce(l.updated_at, l.approved_at, l.created_at),
      'created_at', l.created_at,
      'featured', coalesce(l.featured, false),
      'score', l.internal_score,
      'desc_len', length(coalesce(l.description, '')),
      'host', (select nullif(btrim(p.first_name), '') from public.profiles p where p.id = l.host_id),
      'host_verified', coalesce(l.host_verified, false),
      'extra', jsonb_strip_nulls(jsonb_build_object(
        'min_nights', l.min_nights,
        'instant_book', l.instant_book,
        'booking_model', l.booking_model,
        'tour_3d', case when l.tour_3d_status = 'live' then true end,
        'day_pass', case when l.day_pass_enabled then l.day_pass_price end,
        'cuisines', to_jsonb(rp.cuisines),
        'opens_at', rp.opens_at,
        'closes_at', rp.closes_at
      ))
    )) as j
    from public.listings l
    left join public.restaurant_profiles rp on rp.listing_id = l.id
    where l.status = 'active' and l.is_active is true and l.deleted_at is null
      and public.beacon_listing_kind(l.service, l.type) is not null
      and coalesce(btrim(l.title), '') <> ''
  ),
  trs as (
    select jsonb_strip_nulls(jsonb_build_object(
      'kind', 'tour', 'id', t.id, 'service', 'tours',
      'title', t.title, 'type', t.category,
      'city', coalesce(nullif(btrim(t.destination), ''), nullif(btrim(t.county), '')),
      'area', nullif(btrim(t.destination), ''),
      'country', coalesce(nullif(btrim(t.country), ''), 'Kenya'),
      'lat', round(t.latitude::numeric, 2), 'lng', round(t.longitude::numeric, 2),
      'price', nullif(t.price_kes, 0), 'currency', 'KES',
      'unit', case when t.price_basis = 'per_group' then 'group' else 'person' end,
      'photos', public.growth_photos(t.cover_url, t.photos, 6),
      'photo_count', jsonb_array_length(public.growth_photos(t.cover_url, t.photos, 60)),
      'amenities', coalesce(t.highlights, '[]'::jsonb),
      'guests', t.group_max,
      'reviews', 0,
      'updated_at', coalesce(t.updated_at, t.published_at, t.created_at),
      'created_at', t.created_at,
      'featured', coalesce(t.featured, false),
      'score', t.sort_weight,
      'desc_len', length(coalesce(t.description, '')),
      'host', o.name, 'host_verified', coalesce(o.verified, false),
      'extra', jsonb_strip_nulls(jsonb_build_object(
        'days', t.days, 'duration', t.duration_label, 'next_departure', t.next_departure,
        'schedule', t.schedule_type, 'slug', t.slug))
    )) as j
    from public.tours t
    left join public.tour_operators o on o.id = t.operator_id
    where t.status = 'published' and coalesce(btrim(t.title), '') <> ''
  ),
  evs as (
    select jsonb_strip_nulls(jsonb_build_object(
      'kind', 'event', 'id', e.id, 'service', 'events',
      'title', e.title, 'type', e.category,
      'city', nullif(btrim(e.city), ''), 'area', nullif(btrim(e.venue), ''),
      'country', coalesce(nullif(btrim(e.country), ''), 'Kenya'),
      'lat', round(coalesce(e.lat, e.latitude)::numeric, 2), 'lng', round(coalesce(e.lng, e.longitude)::numeric, 2),
      'price', e.price_from, 'currency', upper(coalesce(nullif(btrim(e.currency), ''), 'KES')), 'unit', 'ticket',
      'photos', public.growth_photos(e.cover_url, e.photos, 6),
      'photo_count', jsonb_array_length(public.growth_photos(e.cover_url, e.photos, 60)),
      'amenities', coalesce(e.tags, '[]'::jsonb),
      'guests', e.capacity,
      'reviews', 0,
      'updated_at', coalesce(e.updated_at, e.published_at, e.created_at),
      'created_at', e.created_at,
      'featured', coalesce(e.featured, false),
      'score', e.sort_weight,
      'desc_len', length(coalesce(e.description, '')),
      'host', g.name, 'host_verified', coalesce(g.verified, false),
      'extra', jsonb_strip_nulls(jsonb_build_object(
        'starts_at', e.starts_at, 'ends_at', e.ends_at, 'venue', e.venue, 'slug', e.slug,
        'sold_out', case when e.capacity > 0 and e.tickets_sold >= e.capacity then true end))
    )) as j
    from public.events e
    left join public.event_organisers g on g.id = e.organiser_id
    where e.status = 'published' and coalesce(btrim(e.title), '') <> ''
      and coalesce(e.ends_at, e.starts_at + interval '6 hours', now() + interval '1 day') > now()
  ),
  cars as (
    select jsonb_strip_nulls(jsonb_build_object(
      'kind', 'car', 'id', f.id, 'service', 'carhire',
      'title', btrim(concat_ws(' ', f.make, f.model, f.variant)),
      'type', f.class,
      'city', nullif(btrim(o.city), ''),
      'country', upper(nullif(btrim(o.country_code), '')),
      'price', nullif(f.day_rate, 0), 'currency', upper(coalesce(nullif(btrim(o.currency_code), ''), 'KES')), 'unit', 'day',
      'photos', public.growth_photos(null, f.photos, 6),
      'photo_count', jsonb_array_length(public.growth_photos(null, f.photos, 60)),
      'amenities', coalesce(to_jsonb((coalesce(f.features, '{}'::text[]))[1:24]), '[]'::jsonb),
      'guests', f.seats,
      'rating', nullif(o.rating, 0),
      'reviews', 0,
      'updated_at', coalesce(f.updated_at, f.created_at),
      'created_at', f.created_at,
      'desc_len', length(coalesce(f.description, '')),
      'host', o.name, 'host_verified', coalesce(o.verified, false),
      'extra', jsonb_strip_nulls(jsonb_build_object(
        'make', f.make, 'model', f.model, 'year', f.year, 'seats', f.seats,
        'transmission', f.transmission, 'fuel', f.fuel, 'drive', f.drive, 'body', f.body,
        'instant_book', f.instant_book, 'delivery', f.delivery_ok,
        'chauffeur', coalesce(f.chauffeur_uplift_metro, 0) > 0))
    )) as j
    from public.car_fleet f
    join public.car_operators o on o.id = f.operator_id
    where f.status = 'active' and (o.paused_until is null or o.paused_until < now())
      and coalesce(btrim(concat_ws(' ', f.make, f.model)), '') <> ''
  ),
  every_row as (
    select j from lst union all select j from trs union all select j from evs union all select j from cars
  )
  select coalesce(jsonb_agg(j order by j ->> 'updated_at' desc), '[]'::jsonb)
    into v
    from (select j from every_row order by j ->> 'updated_at' desc limit greatest(1, least(p_limit, 100000))) capped;
  return v;
end;
$$;

/* One thing, in full, for its own page. `state` tells the page whether to
   render (live), say it has gone (gone: the row exists but is paused,
   deleted or past) or 404 (absent).

   The key is what a URL carries. Listings and cars are keyed by uuid, so
   their key is its first eight hex characters and the lookup is a range
   scan on the primary key. Tours and events are keyed by bigint, so their
   key is the number itself. An all-digit key is tried both ways for tours
   and events, because about one uuid in forty starts with eight digits. */
create or replace function public.beacon_entity(p_kind text, p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_key text := lower(coalesce(p_key, ''));
  v_lo uuid; v_hi uuid;
  v_num bigint;
  v jsonb;
  v_listing jsonb;
  v_live boolean;
begin
  if v_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_lo := v_key::uuid; v_hi := v_key::uuid;
  elsif v_key ~ '^[0-9a-f]{8}$' then
    v_lo := (v_key || '-0000-0000-0000-000000000000')::uuid;
    v_hi := (v_key || '-ffff-ffff-ffff-ffffffffffff')::uuid;
  end if;
  if v_key ~ '^[0-9]{1,15}$' then v_num := v_key::bigint; end if;
  if v_lo is null and v_num is null then
    return jsonb_build_object('state', 'absent');
  end if;

  if v_lo is not null and p_kind in ('stay', 'room', 'food', 'shop', 'tour', 'event', 'car') then
    select jsonb_strip_nulls(jsonb_build_object(
             'kind', public.beacon_listing_kind(l.service, l.type),
             'id', l.id,
             'service', lower(coalesce(nullif(btrim(l.service), ''), 'stays')),
             'title', l.title,
             'type', coalesce(nullif(l.property_type, ''), nullif(l.type, '')),
             'description', left(coalesce(l.description, ''), 6000),
             'city', nullif(btrim(l.city), ''), 'area', nullif(btrim(l.area), ''), 'country', nullif(btrim(l.country), ''),
             'lat', round(coalesce(l.lat, l.latitude)::numeric, 2), 'lng', round(coalesce(l.lng, l.longitude)::numeric, 2),
             'price', coalesce(nullif(l.price_night, 0), nullif(l.price_per_night, 0), rp.avg_price),
             'price_week', nullif(l.price_week, 0), 'price_month', nullif(l.price_month, 0),
             'currency', upper(coalesce(nullif(btrim(l.currency), ''), 'KES')),
             'photos', public.growth_photos(rp.hero_photo, to_jsonb(coalesce(l.photos, '{}'::text[])), 40),
             'amenities', coalesce(to_jsonb(l.amenities), '[]'::jsonb),
             'bedrooms', coalesce(l.bedrooms::numeric, public.growth_num(l.beds)),
             'baths', coalesce(l.bathrooms::numeric, public.growth_num(l.baths)),
             'guests', public.growth_num(l.max_guests),
             'size_sqm', coalesce(l.size_sqm, public.growth_num(l.sqm)),
             'checkin_time', nullif(l.checkin_time, ''), 'checkout_time', nullif(l.checkout_time, ''),
             'min_nights', l.min_nights, 'cancel_policy', nullif(l.cancel_policy, ''),
             'house_rules', left(nullif(l.house_rules, ''), 2000),
             'pets', l.pets, 'smoking', l.smoking, 'children', l.children, 'parties', l.events,
             'instant_book', l.instant_book,
             'rating', nullif(l.avg_rating, 0), 'reviews', coalesce(l.review_count, 0),
             'updated_at', coalesce(l.updated_at, l.approved_at, l.created_at), 'created_at', l.created_at,
             'host', (select nullif(btrim(p.first_name), '') from public.profiles p where p.id = l.host_id),
             'host_verified', coalesce(l.host_verified, false),
             'tour_3d', case when l.tour_3d_status = 'live' then l.tour_3d_url end,
             'restaurant', case when rp.listing_id is not null then jsonb_strip_nulls(jsonb_build_object(
                 'tagline', rp.tagline, 'cuisines', to_jsonb(rp.cuisines), 'signature', rp.signature_dish,
                 'opens_at', rp.opens_at, 'closes_at', rp.closes_at, 'open_days', to_jsonb(rp.open_days),
                 'delivery', rp.serves_delivery, 'pickup', rp.serves_pickup, 'dine_in', rp.serves_dine_in,
                 'halal', rp.halal, 'delivery_mins', rp.delivery_mins, 'min_order', rp.min_order)) end,
             'review_list', (select coalesce(jsonb_agg(r order by r ->> 'at' desc), '[]'::jsonb) from (
                 select jsonb_strip_nulls(jsonb_build_object(
                          'rating', rv.rating,
                          'text', left(rv.review_text, 600),
                          'name', split_part(btrim(coalesce(rv.guest_name, 'Guest')), ' ', 1),
                          'at', rv.created_at,
                          'reply', left(rv.host_reply, 400))) as r
                   from public.reviews rv
                  where rv.listing_id = l.id and rv.rating between 1 and 5
                  order by rv.created_at desc limit 10) recent),
             'state', case when l.status = 'active' and l.is_active is true and l.deleted_at is null then 'live' else 'gone' end
           )),
           (l.status = 'active' and l.is_active is true and l.deleted_at is null)
      into v_listing, v_live
      from public.listings l
      left join public.restaurant_profiles rp on rp.listing_id = l.id
     where l.id between v_lo and v_hi
       and public.beacon_listing_kind(l.service, l.type) = p_kind
     order by (l.status = 'active' and l.is_active is true and l.deleted_at is null) desc, l.created_at desc
     limit 1;
    if v_listing is not null and v_live then return v_listing; end if;
  end if;

  if p_kind = 'tour' and v_num is not null then
    select jsonb_strip_nulls(jsonb_build_object(
             'kind', 'tour', 'id', t.id, 'service', 'tours', 'title', t.title, 'type', t.category,
             'summary', t.summary, 'description', left(coalesce(t.description, ''), 6000),
             'city', coalesce(nullif(btrim(t.destination), ''), nullif(btrim(t.county), '')),
             'area', nullif(btrim(t.destination), ''), 'country', coalesce(nullif(btrim(t.country), ''), 'Kenya'),
             'lat', round(t.latitude::numeric, 2), 'lng', round(t.longitude::numeric, 2),
             'price', nullif(t.price_kes, 0), 'child_price', nullif(t.child_price_kes, 0), 'currency', 'KES',
             'unit', case when t.price_basis = 'per_group' then 'group' else 'person' end,
             'photos', public.growth_photos(t.cover_url, t.photos, 40),
             'amenities', coalesce(t.highlights, '[]'::jsonb),
             'includes', t.includes_list, 'excludes', t.excludes_list, 'itinerary', t.itinerary,
             'what_to_bring', t.what_to_bring, 'languages', t.languages,
             'meeting_point', t.meeting_point, 'start_point', t.start_point,
             'duration', t.duration_label, 'days', t.days, 'hours', t.duration_hours,
             'group_min', t.group_min, 'guests', t.group_max,
             'schedule', t.schedule_type, 'next_departure', t.next_departure, 'departure_days', t.departure_days,
             'departure_time', t.departure_time,
             'cancel_policy', t.cancellation, 'accessibility', t.accessibility,
             'reviews', 0,
             'updated_at', coalesce(t.updated_at, t.published_at, t.created_at), 'created_at', t.created_at,
             'host', o.name, 'host_verified', coalesce(o.verified, false), 'host_tagline', o.tagline,
             'state', case when t.status = 'published' then 'live' else 'gone' end)),
           t.status = 'published'
      into v, v_live
      from public.tours t left join public.tour_operators o on o.id = t.operator_id
     where t.id = v_num;
    if v is not null then return v; end if;
  elsif p_kind = 'event' and v_num is not null then
    select jsonb_strip_nulls(jsonb_build_object(
             'kind', 'event', 'id', e.id, 'service', 'events', 'title', e.title, 'type', e.category,
             'summary', e.tagline, 'description', left(coalesce(e.description, ''), 6000),
             'city', nullif(btrim(e.city), ''), 'area', nullif(btrim(e.venue), ''),
             'country', coalesce(nullif(btrim(e.country), ''), 'Kenya'),
             'venue', e.venue, 'address', e.address,
             'lat', round(coalesce(e.lat, e.latitude)::numeric, 2), 'lng', round(coalesce(e.lng, e.longitude)::numeric, 2),
             'price', e.price_from, 'currency', upper(coalesce(nullif(btrim(e.currency), ''), 'KES')), 'unit', 'ticket',
             'tiers', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                         'name', x ->> 'name', 'price', x -> 'price'))), '[]'::jsonb)
                         from jsonb_array_elements(case when jsonb_typeof(e.tiers) = 'array' then e.tiers else '[]'::jsonb end) x),
             'photos', public.growth_photos(e.cover_url, e.photos, 40),
             'amenities', coalesce(e.tags, '[]'::jsonb), 'lineup', e.lineup,
             'starts_at', e.starts_at, 'ends_at', e.ends_at, 'doors_at', e.doors_at, 'timezone', e.timezone,
             'age_limit', e.age_limit, 'dress_code', e.dress_code, 'refund_policy', e.refund_policy,
             'sold_out', case when e.capacity > 0 and e.tickets_sold >= e.capacity then true end,
             'reviews', 0,
             'updated_at', coalesce(e.updated_at, e.published_at, e.created_at), 'created_at', e.created_at,
             'host', g.name, 'host_verified', coalesce(g.verified, false),
             'state', case when e.status = 'published'
                             and coalesce(e.ends_at, e.starts_at + interval '6 hours', now() + interval '1 day') > now()
                           then 'live' else 'gone' end)),
           true
      into v, v_live
      from public.events e left join public.event_organisers g on g.id = e.organiser_id
     where e.id = v_num;
    if v is not null then return v; end if;
  elsif p_kind = 'car' and v_lo is not null then
    select jsonb_strip_nulls(jsonb_build_object(
             'kind', 'car', 'id', f.id, 'service', 'carhire',
             'title', btrim(concat_ws(' ', f.make, f.model, f.variant)), 'type', f.class,
             'description', left(coalesce(f.description, ''), 6000),
             'city', nullif(btrim(o.city), ''), 'country', upper(nullif(btrim(o.country_code), '')),
             'price', nullif(f.day_rate, 0), 'currency', upper(coalesce(nullif(btrim(o.currency_code), ''), 'KES')), 'unit', 'day',
             'photos', public.growth_photos(null, f.photos, 40),
             'amenities', coalesce(to_jsonb(f.features), '[]'::jsonb),
             'guests', f.seats,
             'car', jsonb_strip_nulls(jsonb_build_object(
               'make', f.make, 'model', f.model, 'variant', f.variant, 'year', f.year, 'class', f.class,
               'body', f.body, 'seats', f.seats, 'transmission', f.transmission, 'fuel', f.fuel, 'drive', f.drive,
               'aircon', f.aircon, 'clearance_mm', f.ground_clearance_mm, 'mileage_cap_km', f.mileage_cap_km,
               'min_days', f.min_hire_days, 'min_age', f.min_driver_age, 'cross_border', f.cross_border_ok,
               'fuel_policy', f.fuel_policy, 'deposit', f.deposit, 'delivery', f.delivery_ok,
               'instant_book', f.instant_book, 'weekly_discount_pct', f.weekly_discount_pct,
               'monthly_discount_pct', f.monthly_discount_pct, 'colour', f.colour,
               'chauffeur', coalesce(f.chauffeur_uplift_metro, 0) > 0)),
             'rating', nullif(o.rating, 0), 'reviews', 0,
             'updated_at', coalesce(f.updated_at, f.created_at), 'created_at', f.created_at,
             'host', o.name, 'host_verified', coalesce(o.verified, false),
             'host_stats', jsonb_strip_nulls(jsonb_build_object('hires', o.completed_hires, 'response_mins', o.response_mins)),
             'state', case when f.status = 'active' and (o.paused_until is null or o.paused_until < now()) then 'live' else 'gone' end)),
           true
      into v, v_live
      from public.car_fleet f join public.car_operators o on o.id = f.operator_id
     where f.id between v_lo and v_hi
     order by (f.status = 'active') desc, f.created_at desc limit 1;
    if v is not null then return v; end if;
  end if;

  /* A listing-backed row that is no longer live still answers "gone"
     rather than "absent", so its page can say so and hand the visitor on.
     It is kept in its own variable because each SELECT INTO above that
     finds nothing resets its target to null. */
  if v_listing is not null then return v_listing; end if;
  return jsonb_build_object('state', 'absent');
end;
$$;

-- ── 2 · BEACON · the change feed ─────────────────────────────────────

create table if not exists public.beacon_changes (
  id           bigserial primary key,
  kind         text not null,
  /* text, not uuid: listings and cars are keyed by uuid, tours and
     events by bigint. */
  entity_id    text not null,
  change       text not null check (change in ('created', 'updated', 'activated', 'deactivated', 'deleted')),
  snapshot     jsonb,
  previous     jsonb,
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz,
  processed_at timestamptz,
  attempts     int not null default 0,
  result       jsonb
);
/* One open row per thing: a host who edits a listing nine times in a
   minute is one change to announce, not nine. */
create unique index if not exists beacon_changes_open_uq
  on public.beacon_changes (kind, entity_id) where processed_at is null;
create index if not exists beacon_changes_recent on public.beacon_changes (created_at desc);

/* Columns that move without changing what a page says. A view counter is
   written on every visit; announcing each one to Bing would be spam. */
create or replace function public.beacon_noise_keys()
returns text[]
language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select array['views', 'bookings_count', 'booking_count', 'internal_score', 'days_listed', 'updated_at',
               'tickets_sold', 'spots_left', 'showcase_rank', 'pause_sig', 'photo_hashes', 'approved_at',
               'sort_weight', 'completed_hires', 'on_time_pct', 'response_mins', 'tour_3d_requested_at']
$$;

create or replace function public.beacon_capture()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_old   jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new   jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row   jsonb := coalesce(v_new, v_old);
  v_kind  text;
  v_was   boolean := false;
  v_is    boolean := false;
  v_change text;
  v_snap  jsonb;
  v_prev  jsonb;
  v_city  text;
begin
  begin
    if tg_table_name = 'listings' then
      v_kind := public.beacon_listing_kind(v_row ->> 'service', v_row ->> 'type');
      v_was := v_old is not null and v_old ->> 'status' = 'active' and (v_old ->> 'is_active')::boolean is true
               and v_old ->> 'deleted_at' is null;
      v_is  := v_new is not null and v_new ->> 'status' = 'active' and (v_new ->> 'is_active')::boolean is true
               and v_new ->> 'deleted_at' is null;
      v_snap := jsonb_strip_nulls(jsonb_build_object('title', v_row ->> 'title', 'city', v_row ->> 'city',
                  'area', v_row ->> 'area', 'country', v_row ->> 'country', 'service', v_row ->> 'service'));
    elsif tg_table_name = 'tours' then
      v_kind := 'tour';
      v_was := v_old is not null and v_old ->> 'status' = 'published';
      v_is  := v_new is not null and v_new ->> 'status' = 'published';
      v_snap := jsonb_strip_nulls(jsonb_build_object('title', v_row ->> 'title',
                  'city', coalesce(v_row ->> 'destination', v_row ->> 'county'), 'area', v_row ->> 'destination',
                  'country', v_row ->> 'country', 'service', 'tours'));
    elsif tg_table_name = 'events' then
      v_kind := 'event';
      v_was := v_old is not null and v_old ->> 'status' = 'published';
      v_is  := v_new is not null and v_new ->> 'status' = 'published';
      v_snap := jsonb_strip_nulls(jsonb_build_object('title', v_row ->> 'title', 'city', v_row ->> 'city',
                  'area', v_row ->> 'venue', 'country', v_row ->> 'country', 'service', 'events'));
    elsif tg_table_name = 'car_fleet' then
      v_kind := 'car';
      v_was := v_old is not null and v_old ->> 'status' = 'active';
      v_is  := v_new is not null and v_new ->> 'status' = 'active';
      select o.city into v_city from public.car_operators o where o.id = (v_row ->> 'operator_id')::uuid;
      v_snap := jsonb_strip_nulls(jsonb_build_object(
                  'title', btrim(concat_ws(' ', v_row ->> 'make', v_row ->> 'model', v_row ->> 'variant')),
                  'city', v_city, 'service', 'carhire'));
    else
      return null;
    end if;

    if v_kind is null then return null; end if;

    if tg_op = 'INSERT' then
      if not v_is then return null; end if;
      v_change := 'created';
    elsif tg_op = 'DELETE' then
      if not v_was then return null; end if;
      v_change := 'deleted';
    elsif v_was and not v_is then
      v_change := 'deactivated';
    elsif v_is and not v_was then
      v_change := 'activated';
    elsif v_is and v_was then
      if (v_new - public.beacon_noise_keys()) = (v_old - public.beacon_noise_keys()) then return null; end if;
      v_change := 'updated';
    else
      return null;
    end if;

    /* A renamed or moved listing changes its URL. Keep where it used to
       live, so the old address can be announced and redirected. */
    if tg_op = 'UPDATE' and (v_old ->> 'title' is distinct from v_new ->> 'title'
                          or v_old ->> 'city' is distinct from v_new ->> 'city'
                          or v_old ->> 'area' is distinct from v_new ->> 'area') then
      v_prev := jsonb_strip_nulls(jsonb_build_object('title', v_old ->> 'title', 'city', v_old ->> 'city',
                  'area', v_old ->> 'area', 'country', v_old ->> 'country'));
    end if;

    insert into public.beacon_changes as c (kind, entity_id, change, snapshot, previous)
    values (v_kind, v_row ->> 'id', v_change, v_snap, v_prev)
    on conflict (kind, entity_id) where processed_at is null do update
      set change = case
                     when excluded.change in ('deactivated', 'deleted') then excluded.change
                     when c.change = 'created' then 'created'
                     when c.change in ('deactivated', 'deleted') and excluded.change in ('activated', 'created') then 'updated'
                     else excluded.change
                   end,
          snapshot = excluded.snapshot,
          previous = coalesce(c.previous, excluded.previous),
          created_at = now(),
          claimed_at = null;
  exception when others then
    raise warning 'beacon_capture(%): %', tg_table_name, sqlerrm;
  end;
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['listings', 'tours', 'events', 'car_fleet'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_beacon_capture on public.%I', t);
      execute format('create trigger trg_beacon_capture after insert or update or delete on public.%I
                        for each row execute function public.beacon_capture()', t);
    end if;
  end loop;
end $$;

/* A monotonic number that moves whenever anything public changes. Every
   cache of the catalogue (APA, the page renderer, the map) compares it
   instead of guessing a TTL: a new listing is visible on the next request
   after it lands, and an idle minute costs one indexed max(). */
create or replace function public.beacon_version()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'v', coalesce((select max(id) from public.beacon_changes), 0),
    'pending', (select count(*) from public.beacon_changes where processed_at is null),
    'at', (select max(created_at) from public.beacon_changes))
$$;

/* The pulse claims work with skip-locked, so two overlapping runs never
   announce the same change twice. A claim older than ten minutes is
   treated as abandoned (the function died) and taken again. */
create or replace function public.beacon_claim(p_limit int default 200)
returns setof public.beacon_changes
language sql
volatile
security definer
set search_path = pg_catalog, public
as $$
  update public.beacon_changes c
     set claimed_at = now(), attempts = c.attempts + 1
   where c.id in (
     select id from public.beacon_changes
      where processed_at is null
        and (claimed_at is null or claimed_at < now() - interval '10 minutes')
        and attempts < 6
      order by id
      limit greatest(1, least(p_limit, 1000))
      for update skip locked)
  returning c.*
$$;

create or replace function public.beacon_complete(p_ids bigint[], p_result jsonb)
returns int
language sql
volatile
security definer
set search_path = pg_catalog, public
as $$
  with done as (
    update public.beacon_changes
       set processed_at = now(), result = p_result
     where id = any(coalesce(p_ids, '{}'::bigint[]))
       /* A change that landed while this batch was in flight cleared the
          claim; leave it open so the next pulse announces it. */
       and claimed_at is not null
    returning 1)
  select count(*)::int from done
$$;

create table if not exists public.beacon_pings (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  engine     text not null,
  reason     text,
  urls       int not null default 0,
  status     int,
  ok         boolean not null default false,
  sample     jsonb,
  note       text
);
create index if not exists beacon_pings_recent on public.beacon_pings (created_at desc);

/* Live supply per place, written by the pulse from the catalogue after
   place resolution (which lives in one place: api/lib/_places.js). The
   hub pages, the hourly static rebuild, the opportunity board and APA all
   read this, so "how many stays in Diani" has exactly one answer. */
create table if not exists public.beacon_places (
  place      text not null,
  service    text not null,
  name       text,
  kind       text,
  parent     text,
  country    text,
  count      int not null default 0,
  low_usd    numeric,
  high_usd   numeric,
  sample     jsonb,
  updated_at timestamptz not null default now(),
  primary key (place, service)
);

create or replace function public.beacon_places_replace(p_rows jsonb)
returns int
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare n int;
begin
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be an array'; end if;
  delete from public.beacon_places where true;
  insert into public.beacon_places (place, service, name, kind, parent, country, count, low_usd, high_usd, sample, updated_at)
  select left(r ->> 'place', 80), left(r ->> 'service', 20), left(r ->> 'name', 120), left(r ->> 'kind', 20),
         left(r ->> 'parent', 80), left(r ->> 'country', 80),
         greatest(0, coalesce((r ->> 'count')::int, 0)),
         (r ->> 'low_usd')::numeric, (r ->> 'high_usd')::numeric,
         case when jsonb_typeof(r -> 'sample') = 'array' then r -> 'sample' end, now()
    from jsonb_array_elements(p_rows) r
   where coalesce(r ->> 'place', '') <> '' and coalesce(r ->> 'service', '') <> ''
  on conflict (place, service) do update
    set count = excluded.count, low_usd = excluded.low_usd, high_usd = excluded.high_usd,
        sample = excluded.sample, name = excluded.name, updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

/* Public: it says only what is already for sale. The hourly static
   rebuild reads it with the anon key, so no secret has to live in CI. */
create or replace function public.beacon_places_public()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'generated', coalesce((select max(updated_at) from public.beacon_places), now()),
    'places', coalesce((select jsonb_agg(jsonb_build_object(
        'place', place, 'service', service, 'name', name, 'kind', kind, 'parent', parent, 'country', country,
        'count', count, 'low_usd', low_usd, 'high_usd', high_usd) order by place, service)
      from public.beacon_places where count > 0), '[]'::jsonb))
$$;

-- ── 3 · COMPASS · profiles and events ────────────────────────────────

/* One row per person. A visitor starts anonymous (visitor_id is the
   first-party id their browser holds) and becomes a member when they sign
   in; the two rows are merged then and never split again. The scoring
   itself (decayed affinities, intent, lifecycle, segments) is computed in
   api/lib/_compass.js, where it is unit-tested; this table stores it.
   `version` is an optimistic lock: two tabs folding at once retry rather
   than overwrite each other. */
create table if not exists public.compass_profiles (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  text unique,
  user_id     uuid unique,
  /* Every browser id that has been folded into this person. A phone and a
     laptop that both sign in become one profile, and either device keeps
     feeding it after signing out. */
  aliases     text[] not null default '{}',
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  sessions    int not null default 0,
  events      int not null default 0,
  country     text,
  region      text,
  city        text,
  timezone    text,
  language    text,
  device      text,
  os          text,
  browser     text,
  origin      text,
  intent      smallint not null default 0,
  lifecycle   text not null default 'new',
  segments    text[] not null default '{}',
  affinity    jsonb not null default '{}'::jsonb,
  stats       jsonb not null default '{}'::jsonb,
  recent      jsonb not null default '[]'::jsonb,
  traits      jsonb not null default '{}'::jsonb,
  consent     jsonb not null default '{"analytics": true, "personalization": true, "ads": false}'::jsonb,
  opted_out   boolean not null default false,
  version     int not null default 0,
  updated_at  timestamptz not null default now()
);
create index if not exists compass_profiles_seen on public.compass_profiles (last_seen desc);
create index if not exists compass_profiles_segments on public.compass_profiles using gin (segments);
create index if not exists compass_profiles_lifecycle on public.compass_profiles (lifecycle);
create index if not exists compass_profiles_aliases on public.compass_profiles using gin (aliases);

create table if not exists public.compass_events (
  id          bigserial primary key,
  profile_id  uuid,
  visitor_id  text,
  user_id     uuid,
  session_id  text,
  type        text not null,
  kind        text,
  entity_id   text,
  service     text,
  place       text,
  country     text,
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists compass_events_recent on public.compass_events (created_at desc);
create index if not exists compass_events_profile on public.compass_events (profile_id, created_at desc);
create index if not exists compass_events_demand on public.compass_events (place, service, created_at desc)
  where type in ('search', 'entity_view', 'hub_view');

/* Demand by place and service, for the opportunity board and for APA's
   "what people are looking for". Unique people, not raw clicks: one
   visitor refreshing a page fifty times is one person who wants Diani. */
create or replace function public.compass_demand(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(d order by (d ->> 'people')::int desc, (d ->> 'signals')::int desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'place', e.place, 'service', coalesce(e.service, 'any'),
               'people', count(distinct coalesce(e.profile_id::text, e.visitor_id)),
               'signals', count(*),
               'searches', count(*) filter (where e.type = 'search'),
               'views', count(*) filter (where e.type in ('entity_view', 'hub_view')),
               'supply', coalesce((select bp.count from public.beacon_places bp
                                    where bp.place = e.place and bp.service = coalesce(e.service, 'stays')), 0)) as d
        from public.compass_events e
       where e.created_at > now() - make_interval(days => greatest(1, least(p_days, 400)))
         and e.place is not null
         and e.type in ('search', 'entity_view', 'hub_view')
       group by e.place, e.service
       order by count(distinct coalesce(e.profile_id::text, e.visitor_id)) desc
       limit 200
    ) ranked
$$;

-- ── 4 · APA · episodes ───────────────────────────────────────────────

/* A thread is the whole relationship; an episode is one conversation in
   it. When someone comes back after a while, or says "new question", the
   current episode is closed with a summary and the next one starts clean:
   the model sees only the new conversation, plus short dated notes of the
   earlier ones it may refer to if the person brings them back. */
create table if not exists public.apa_episodes (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null,
  n           int not null,
  user_id     uuid,
  guest_key   text,
  visitor_id  text,
  started_at  timestamptz not null,
  ended_at    timestamptz not null default now(),
  turns       int not null default 0,
  topic       text,
  category    text,
  outcome     text,
  summary     text,
  facts       jsonb not null default '{}'::jsonb,
  entities    jsonb not null default '[]'::jsonb,
  ended_by    text,
  created_at  timestamptz not null default now(),
  unique (thread_id, n)
);
create index if not exists apa_episodes_user on public.apa_episodes (user_id, ended_at desc) where user_id is not null;
create index if not exists apa_episodes_guest on public.apa_episodes (guest_key, ended_at desc) where guest_key is not null;
create index if not exists apa_episodes_recent on public.apa_episodes (ended_at desc);

do $$
begin
  if to_regclass('public.support_threads') is not null then
    alter table public.support_threads add column if not exists episode_n int not null default 1;
    alter table public.support_threads add column if not exists episode_started_at timestamptz;
  end if;
end $$;

-- ── 5 · Admin read models (operator-gated) ───────────────────────────

create or replace function public.admin_beacon_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cat jsonb := public.beacon_catalogue(100000);
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'at', now(),
    'version', public.beacon_version(),
    'live', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
               from (select x ->> 'kind' as k, count(*) as n from jsonb_array_elements(v_cat) x group by 1) s),
    'thin', (select coalesce(jsonb_agg(jsonb_build_object(
                'kind', x ->> 'kind', 'id', x ->> 'id', 'title', x ->> 'title', 'city', x ->> 'city',
                'photos', (x ->> 'photo_count')::int, 'desc_len', (x ->> 'desc_len')::int,
                'priced', (x ? 'price'), 'located', (x ? 'lat'),
                'issues', to_jsonb(array_remove(array[
                   case when coalesce((x ->> 'photo_count')::int, 0) < 3 then 'fewer than 3 photos' end,
                   case when coalesce((x ->> 'desc_len')::int, 0) < 120 then 'description under 120 characters' end,
                   case when not (x ? 'price') then 'no price' end,
                   case when not (x ? 'lat') then 'no map pin' end,
                   case when not (x ? 'city') then 'no city' end], null)))), '[]'::jsonb)
               from jsonb_array_elements(v_cat) x
              where coalesce((x ->> 'photo_count')::int, 0) < 3 or coalesce((x ->> 'desc_len')::int, 0) < 120
                 or not (x ? 'price') or not (x ? 'lat') or not (x ? 'city')),
    'changes', (select coalesce(jsonb_agg(to_jsonb(c) - 'previous' order by c.id desc), '[]'::jsonb)
                  from (select * from public.beacon_changes order by id desc limit 60) c),
    'pings', (select coalesce(jsonb_agg(to_jsonb(p) order by p.id desc), '[]'::jsonb)
                from (select * from public.beacon_pings order by id desc limit 40) p),
    'pings_7d', (select jsonb_build_object('runs', count(*), 'ok', count(*) filter (where ok), 'urls', coalesce(sum(urls), 0))
                   from public.beacon_pings where created_at > now() - interval '7 days'),
    'places', (select coalesce(jsonb_agg(to_jsonb(b) order by b.count desc, b.place), '[]'::jsonb)
                 from (select place, service, name, kind, parent, country, count, low_usd, high_usd, updated_at
                         from public.beacon_places order by count desc limit 300) b),
    'settings', (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
                   from public.site_settings where key like 'growth.%'));
end;
$$;

create or replace function public.admin_compass_overview(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 400)));
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'at', now(), 'days', p_days,
    'totals', (select jsonb_build_object(
        'profiles', count(*),
        'active', count(*) filter (where last_seen > v_since),
        'active_7d', count(*) filter (where last_seen > now() - interval '7 days'),
        'members', count(*) filter (where user_id is not null),
        'opted_out', count(*) filter (where opted_out),
        'ads_consent', count(*) filter (where (consent ->> 'ads')::boolean is true),
        'high_intent', count(*) filter (where intent >= 70 and last_seen > now() - interval '7 days'),
        'events_window', (select count(*) from public.compass_events where created_at > v_since))
      from public.compass_profiles),
    'lifecycle', (select coalesce(jsonb_object_agg(lifecycle, n), '{}'::jsonb)
                    from (select lifecycle, count(*) n from public.compass_profiles where last_seen > v_since group by 1) s),
    'origin', (select coalesce(jsonb_object_agg(coalesce(origin, 'unknown'), n), '{}'::jsonb)
                 from (select origin, count(*) n from public.compass_profiles where last_seen > v_since group by 1) s),
    'countries', (select coalesce(jsonb_agg(jsonb_build_object('key', country, 'count', n) order by n desc), '[]'::jsonb)
                    from (select country, count(*) n from public.compass_profiles
                           where last_seen > v_since and country is not null group by 1 order by 2 desc limit 15) s),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('key', device, 'count', n) order by n desc), '[]'::jsonb)
                  from (select coalesce(device, 'unknown') device, count(*) n from public.compass_profiles
                         where last_seen > v_since group by 1) s),
    'segments', (select coalesce(jsonb_agg(jsonb_build_object('id', seg, 'people', n,
                    'ads_ready', ads) order by n desc), '[]'::jsonb)
                   from (select unnest(segments) seg, count(*) n,
                                count(*) filter (where (consent ->> 'ads')::boolean is true and not opted_out) ads
                           from public.compass_profiles where last_seen > v_since group by 1) s),
    'services', (select coalesce(jsonb_agg(jsonb_build_object('key', svc, 'count', n) order by n desc), '[]'::jsonb)
                   from (select traits ->> 'top_service' svc, count(*) n from public.compass_profiles
                          where last_seen > v_since and traits ? 'top_service' group by 1) s),
    'budget', (select coalesce(jsonb_agg(jsonb_build_object('key', b, 'count', n) order by n desc), '[]'::jsonb)
                 from (select traits ->> 'budget_band' b, count(*) n from public.compass_profiles
                        where last_seen > v_since and traits ? 'budget_band' group by 1) s),
    'purpose', (select coalesce(jsonb_agg(jsonb_build_object('key', b, 'count', n) order by n desc), '[]'::jsonb)
                  from (select traits ->> 'purpose' b, count(*) n from public.compass_profiles
                         where last_seen > v_since and traits ? 'purpose' group by 1) s),
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'count', n) order by h), '[]'::jsonb)
                from (select extract(hour from created_at at time zone 'Africa/Nairobi')::int h, count(*) n
                        from public.compass_events where created_at > v_since group by 1) s),
    'demand', public.compass_demand(p_days),
    /* What people type into Cabana's own search boxes: the vocabulary to
       write pages in, and the gaps to onboard for. Anything that looks
       like a phone number or an email address is left out. */
    'queries', (select coalesce(jsonb_agg(jsonb_build_object('q', q, 'service', svc, 'people', people, 'searches', n)
                                          order by people desc, n desc), '[]'::jsonb)
                  from (select lower(btrim(props ->> 'q')) q, mode() within group (order by service) svc,
                               count(distinct coalesce(profile_id::text, visitor_id)) people, count(*) n
                          from public.compass_events
                         where created_at > v_since and type = 'search'
                           and length(btrim(coalesce(props ->> 'q', ''))) between 2 and 60
                           and props ->> 'q' !~ '[0-9]{7,}|@'
                         group by 1 order by 3 desc, 4 desc limit 40) s),
    'hot', (select coalesce(jsonb_agg(jsonb_build_object(
               'id', id, 'member', user_id is not null, 'country', country, 'city', city, 'device', device,
               'intent', intent, 'lifecycle', lifecycle, 'segments', segments,
               'top_place', traits ->> 'top_place', 'top_service', traits ->> 'top_service',
               'budget', traits ->> 'budget_band', 'last_seen', last_seen) order by intent desc, last_seen desc), '[]'::jsonb)
              from (select * from public.compass_profiles
                     where last_seen > now() - interval '7 days' and intent >= 40 and not opted_out
                     order by intent desc, last_seen desc limit 40) h));
end;
$$;

create or replace function public.admin_compass_profile(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  return (select jsonb_build_object(
            'profile', to_jsonb(p),
            'events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.id desc), '[]'::jsonb)
                         from (select id, type, kind, entity_id, service, place, props, created_at
                                 from public.compass_events where profile_id = p.id order by id desc limit 80) e),
            'episodes', (select coalesce(jsonb_agg(to_jsonb(a) order by a.ended_at desc), '[]'::jsonb)
                           from (select n, started_at, ended_at, turns, topic, outcome, summary
                                   from public.apa_episodes
                                  where (p.user_id is not null and user_id = p.user_id)
                                     or (p.visitor_id is not null and visitor_id = p.visitor_id)
                                  order by ended_at desc limit 20) a))
            from public.compass_profiles p where p.id = p_id);
end;
$$;

create or replace function public.admin_apa_overview(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 400)));
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'at', now(),
    'episodes', (select count(*) from public.apa_episodes where ended_at > v_since),
    'outcomes', (select coalesce(jsonb_object_agg(coalesce(outcome, 'open'), n), '{}'::jsonb)
                   from (select outcome, count(*) n from public.apa_episodes where ended_at > v_since group by 1) s),
    'topics', (select coalesce(jsonb_agg(jsonb_build_object('key', topic, 'count', n) order by n desc), '[]'::jsonb)
                 from (select coalesce(category, topic, 'general') topic, count(*) n from public.apa_episodes
                        where ended_at > v_since group by 1 order by 2 desc limit 12) s),
    'threads', (select jsonb_build_object(
                   'total', count(*),
                   'escalated', count(*) filter (where escalated_at is not null),
                   'apa_resolved', count(*) filter (where apa_resolved),
                   'csat_avg', round(avg(csat)::numeric, 2))
                  from public.support_threads where created_at > v_since),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('n', n, 'ended_at', ended_at, 'turns', turns,
                  'topic', coalesce(topic, category), 'outcome', outcome, 'summary', summary,
                  'member', user_id is not null) order by ended_at desc), '[]'::jsonb)
                 from (select * from public.apa_episodes order by ended_at desc limit 30) r));
end;
$$;

/* Operator-set growth flags (brand checklist ticks, notes). Keys are
   namespaced so this can never touch another feature's settings. */
create or replace function public.admin_growth_setting(p_key text, p_value text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  if p_key !~ '^growth\.[a-z0-9_.-]{1,60}$' then raise exception 'bad_key'; end if;
  insert into public.site_settings (key, value, label, type, category, updated_at)
  values (p_key, left(coalesce(p_value, ''), 2000), p_key, 'text', 'growth', now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true, 'key', p_key);
end;
$$;

-- ── 6 · Access ───────────────────────────────────────────────────────

alter table public.beacon_changes   enable row level security;
alter table public.beacon_pings     enable row level security;
alter table public.beacon_places    enable row level security;
alter table public.compass_profiles enable row level security;
alter table public.compass_events   enable row level security;
alter table public.apa_episodes     enable row level security;

revoke all on public.beacon_changes, public.beacon_pings, public.beacon_places,
              public.compass_profiles, public.compass_events, public.apa_episodes
  from public, anon, authenticated;

do $$
declare f text;
begin
  /* Service-only machinery. */
  foreach f in array array[
    'public.beacon_catalogue(int)', 'public.beacon_entity(text, text)', 'public.beacon_version()',
    'public.beacon_claim(int)', 'public.beacon_complete(bigint[], jsonb)',
    'public.beacon_places_replace(jsonb)', 'public.compass_demand(int)', 'public.beacon_capture()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;

  /* Operator read models: callable by signed-in users, refused inside by
     cabana_admin.guard() unless they are on the operator roster. */
  foreach f in array array[
    'public.admin_beacon_overview()', 'public.admin_compass_overview(int)', 'public.admin_compass_profile(uuid)',
    'public.admin_apa_overview(int)', 'public.admin_growth_setting(text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;

  /* Public: counts of what is already for sale. */
  execute 'revoke all on function public.beacon_places_public() from public';
  execute 'grant execute on function public.beacon_places_public() to anon, authenticated';
end $$;

-- ── 7 · Schedules ────────────────────────────────────────────────────

/* The pulse is called only when there is something to announce, so an
   idle minute costs one index probe and no HTTP. Once an hour it runs
   regardless, to refresh place supply and expire past events. */
create schema if not exists cabana_ops;

create or replace function cabana_ops.trigger_beacon_pulse(p_force boolean default false)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_url text;
  v_secret text;
begin
  if not p_force and not exists (
    select 1 from public.beacon_changes
     where processed_at is null and attempts < 6
       and (claimed_at is null or claimed_at < now() - interval '10 minutes')) then
    return;
  end if;
  if to_regclass('cabana_ops.cron_config') is null then return; end if;
  execute 'select value from cabana_ops.cron_config where key = $1' into v_url using 'beacon_pulse_url';
  execute 'select value from cabana_ops.cron_config where key = $1' into v_secret using 'cron_secret';
  if v_url is null or coalesce(v_secret, '') = '' then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json',
                                  'User-Agent', 'Cabana-Scheduler/1.0'),
    body := jsonb_build_object('op', 'pulse', 'force', p_force),
    timeout_milliseconds := 55000);
end;
$$;
revoke all on function cabana_ops.trigger_beacon_pulse(boolean) from public;

do $$
begin
  if to_regclass('cabana_ops.cron_config') is not null then
    execute $q$insert into cabana_ops.cron_config (key, value)
               values ('beacon_pulse_url', 'https://cabana.africa/api/growth?op=pulse')
               on conflict (key) do nothing$q$;
  end if;

  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('cabana-beacon-pulse', '* * * * *', 'select cabana_ops.trigger_beacon_pulse(false)');
    perform cron.schedule('cabana-beacon-refresh', '23 * * * *', 'select cabana_ops.trigger_beacon_pulse(true)');
    perform cron.schedule('cabana-growth-prune', '37 3 * * *', $c$
      delete from public.compass_events where created_at < now() - interval '400 days';
      delete from public.beacon_changes where processed_at < now() - interval '120 days';
      delete from public.beacon_pings where created_at < now() - interval '120 days';
      delete from public.compass_profiles where user_id is null and last_seen < now() - interval '400 days';
    $c$);
  end if;
end $$;
