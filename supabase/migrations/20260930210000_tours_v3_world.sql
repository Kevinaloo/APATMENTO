-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v3 · the world around the tours
-- ───────────────────────────────────────────────────────────────────
-- 1. THE MARQUEE. The Spotlight becomes a rotation of premium card
--    slots at the top of /tours, filled from five sources and run from
--    Console → Tours → Marquee:
--      sponsored  guides and operators who bought a slot (flow unchanged)
--      ads        advertisers booked in Console → Advertising on the
--                 tours.marquee placement (read from ads_bundle)
--      featured   tours Cabana features for free
--      house      Cabana's own promotions, now with a badge, device
--                 targeting and a button that can open a 360° world
--      auto       departures leaving soonest and the featured world
--    Settings gain the rotation speed, the most slides at once, a
--    switch per automatic source, and a switch for the whole marquee
--    that is separate from selling slots (a paid slot keeps running
--    when sales are paused).
-- 2. PLACES. The destinations on /tours: photo, words, map position
--    and the words that tie a tour to them. Tours carry place_id,
--    guessed from their destination until someone sets it.
-- 3. ALERTS. A traveller asks to hear first when a tour opens in a
--    place or a kind of trip; publishing a matching tour tells them.
--    Guides see where travellers are waiting, as counts only.
-- 4. 360° FILMING. Guides ask Cabana to film a tour in 360°; the
--    console schedules it and links the finished world to the tour.
-- 5. CHANGES TO LIVE TOURS. A guide proposes changes to a published
--    tour; the console applies or declines them. Guides pause and
--    resume their own tours; a resumed tour that changed while paused
--    goes back through review.
-- 6. THE PAGE. A places block, the 360° room switched on, categories
--    shown before their first tour, and new launch copy for every
--    block nobody has edited yet (updated_by is null).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · THE MARQUEE ─────────────────────────────────────────────────
alter table public.tour_spotlights add column if not exists label text;
alter table public.tour_spotlights add column if not exists device text not null default 'all';
alter table public.tour_spotlights add column if not exists world_slug text;
do $$ begin
  alter table public.tour_spotlights add constraint tour_spotlights_device_check check (device in ('all', 'phone', 'desktop'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.tour_spotlights add constraint tour_spotlights_label_check check (label is null or length(label) between 1 and 24);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.tour_spotlights add constraint tour_spotlights_world_check check (world_slug is null or world_slug ~ '^[a-z0-9][a-z0-9-]{1,79}$');
exception when duplicate_object then null; end $$;

alter table public.tour_spotlight_settings
  add column if not exists marquee_on      boolean not null default true,
  add column if not exists rotate_ms       integer not null default 7000,
  add column if not exists max_slides      integer not null default 10,
  add column if not exists show_ads        boolean not null default true,
  add column if not exists auto_departures boolean not null default true,
  add column if not exists auto_world      boolean not null default true;
do $$ begin
  alter table public.tour_spotlight_settings add constraint tour_spotlight_settings_rotate_check check (rotate_ms between 4000 and 20000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.tour_spotlight_settings add constraint tour_spotlight_settings_slides_check check (max_slides between 1 and 16);
exception when duplicate_object then null; end $$;

-- Cabana's own slides only ever send people somewhere on Cabana. A paid
-- slide never has a free-form link at all (its button is its tour).
create or replace function cabana_private.tour_spotlight_links()
returns trigger language plpgsql set search_path = pg_catalog as $$
declare u text := btrim(coalesce(new.cta_url, ''));
begin
  if new.kind = 'sponsored' then
    new.world_slug := null;
  elsif u <> '' and not ((left(u, 1) in ('/', '#') and left(u, 2) <> '//') or u ~* '^https://(www\.)?cabana\.africa(/|$)') then
    raise exception 'Buttons on Cabana''s own slides can only link to pages on Cabana.' using errcode = '22023';
  end if;
  if new.label is not null then new.label := nullif(btrim(new.label), ''); end if;
  return new;
end $$;
drop trigger if exists tour_spotlight_links on public.tour_spotlights;
create trigger tour_spotlight_links before insert or update on public.tour_spotlights
  for each row execute function cabana_private.tour_spotlight_links();

-- What the page shows. Not gated by sales any more: a paid slide runs
-- for the days it was bought even while new sales are paused. Sponsored
-- slides always fit; the rest fill up to max_slides.
create or replace function public.tour_spotlight_feed()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  with s as (
    select coalesce(marquee_on, true) as on_, coalesce(max_slides, 10) as mx
      from public.tour_spotlight_settings where id = 1
  ),
  x as (
    select jsonb_build_object(
      'id', sp.id, 'kind', sp.kind, 'sponsored', sp.kind = 'sponsored',
      'media_kind', sp.media_kind, 'media_url', sp.media_url, 'media_mobile_url', sp.media_mobile_url,
      'poster_url', sp.poster_url, 'focal', sp.focal, 'label', sp.label, 'device', sp.device,
      'world_slug', sp.world_slug, 'priority', sp.priority,
      'kicker', sp.kicker, 'headline', sp.headline, 'subline', sp.subline,
      'cta_label', sp.cta_label, 'cta_url', case when sp.kind = 'sponsored' then null else sp.cta_url end,
      'accent', sp.accent, 'ends_at', sp.ends_at,
      'tour', case when t.id is null then null else jsonb_build_object(
        'id', t.id, 'title', t.title, 'destination', coalesce(nullif(t.destination, ''), t.county),
        'price', t.price_kes, 'price_basis', t.price_basis, 'deposit_pct', t.deposit_pct,
        'duration', coalesce(t.duration_label, t.days || case when t.days = 1 then ' day' else ' days' end),
        'cover', coalesce(t.cover_url, t.photos->>0),
        'next_departure', (select d.departs_at from public.tour_departures(60, t.id, 1) d limit 1)) end,
      'operator', case when o.id is null then null else jsonb_build_object(
        'id', o.id, 'name', o.name, 'verified', o.verified, 'persona', o.persona, 'logo', o.logo_url) end
    ) as obj,
    sp.kind,
    row_number() over (order by case sp.kind when 'sponsored' then 0 when 'tour' then 1 else 2 end,
                                sp.priority desc, sp.paid_at nulls last, sp.created_at) as ord
      from public.tour_spotlights sp
      left join public.tours t on t.id = sp.tour_id
      left join public.tour_operators o on o.id = coalesce(sp.operator_id, t.operator_id) and o.status = 'approved'
     where sp.status = 'approved' and now() >= sp.starts_at and now() < sp.ends_at
       and sp.media_kind in ('image', 'video', 'youtube')
       and (sp.tour_id is null or t.status = 'published')
       and coalesce((select on_ from s), true)
  )
  select coalesce(jsonb_agg(x.obj order by x.ord), '[]'::jsonb)
    from x
   where x.kind = 'sponsored' or x.ord <= coalesce((select mx from s), 10)
$$;
revoke all on function public.tour_spotlight_feed() from public;
grant execute on function public.tour_spotlight_feed() to anon, authenticated;

create or replace function public.admin_tour_spotlights()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
begin
  perform cabana_admin.guard();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', sp.id, 'kind', sp.kind, 'status', sp.status, 'user_id', sp.user_id,
      'buyer', case when sp.user_id is not null then cabana_private.member_name(sp.user_id) end,
      'operator', o.name, 'operator_id', sp.operator_id, 'tour_id', sp.tour_id, 'tour', t.title,
      'media_kind', sp.media_kind, 'media_url', sp.media_url, 'media_mobile_url', sp.media_mobile_url,
      'poster_url', sp.poster_url, 'focal', sp.focal, 'art', sp.art, 'label', sp.label, 'device', sp.device,
      'world_slug', sp.world_slug,
      'kicker', sp.kicker, 'headline', sp.headline, 'subline', sp.subline, 'cta_label', sp.cta_label, 'cta_url', sp.cta_url,
      'accent', sp.accent, 'package', sp.package, 'days', sp.days, 'starts_at', sp.starts_at, 'ends_at', sp.ends_at,
      'priority', sp.priority, 'price_kes', sp.price_kes, 'grand_total', sp.grand_total, 'amount_paid', sp.amount_paid,
      'paid_at', sp.paid_at, 'credited', sp.credited, 'payment_reference', sp.payment_reference,
      'review_note', sp.review_note, 'reviewed_at', sp.reviewed_at,
      'impressions', sp.impressions, 'clicks', sp.clicks,
      'live', sp.status = 'approved' and now() >= sp.starts_at and now() < sp.ends_at,
      'created_at', sp.created_at)
      order by case sp.status when 'in_review' then 0 when 'approved' then 1 when 'paused' then 2 when 'pending_payment' then 3 else 4 end,
               sp.created_at desc)
    from public.tour_spotlights sp
    left join public.tours t on t.id = sp.tour_id
    left join public.tour_operators o on o.id = sp.operator_id
   where sp.status <> 'cancelled' or sp.amount_paid > 0), '[]'::jsonb);
end $$;
revoke all on function public.admin_tour_spotlights() from public, anon;
grant execute on function public.admin_tour_spotlights() to authenticated;

-- ── 2 · PLACES ──────────────────────────────────────────────────────
create table if not exists public.tour_places (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name        text not null check (length(btrim(name)) between 2 and 60),
  country     text check (country is null or length(country) <= 60),
  region      text check (region is null or length(region) <= 60),
  line        text check (line is null or length(line) <= 180),
  image       text check (image is null or image ~ '^(/[A-Za-z0-9._/-]+|https://[^\s"''<>]+)$'),
  focal       text not null default '50% 50%' check (focal ~ '^\d{1,3}% \d{1,3}%$'),
  terms       text[] not null default '{}',
  lat         double precision check (lat is null or lat between -90 and 90),
  lng         double precision check (lng is null or lng between -180 and 180),
  position    integer not null default 100,
  enabled     boolean not null default true,
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
comment on table public.tour_places is
  'Destinations on /tours (Console → Tours → Places). Public read, admin write. terms tie a tour to a place.';
drop trigger if exists tour_places_touch on public.tour_places;
create trigger tour_places_touch before insert or update on public.tour_places
  for each row execute function cabana_private.tour_page_block_touch();
alter table public.tour_places enable row level security;
drop policy if exists tour_places_read on public.tour_places;
drop policy if exists tour_places_admin on public.tour_places;
create policy tour_places_read on public.tour_places for select to anon, authenticated using (enabled or public.is_admin());
create policy tour_places_admin on public.tour_places for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_places from public, anon, authenticated;
grant select on public.tour_places to anon, authenticated;
grant insert, update, delete on public.tour_places to authenticated;
grant all on public.tour_places to service_role;

insert into public.tour_places (id, name, country, region, line, image, focal, terms, lat, lng, position, featured) values
('maasai-mara', 'Maasai Mara', 'Kenya', 'Narok', 'The great migration from July to October, and big cats all year in the long grass.',
  '/assets/tours/places/maasai-mara-1400.webp', '50% 60%', array['maasai mara', 'masai mara', 'mara', 'narok', 'talek', 'sekenani'], -1.4061, 35.0081, 10, true),
('amboseli', 'Amboseli', 'Kenya', 'Kajiado', 'Elephant herds under Kilimanjaro, clearest in the first hour of light.',
  '/assets/tours/places/amboseli-1400.webp', '50% 45%', array['amboseli', 'kimana', 'loitokitok'], -2.6527, 37.2606, 20, true),
('nairobi', 'Nairobi', 'Kenya', 'Nairobi', 'A national park with a skyline, and a city of food, art and music.',
  '/assets/tours/places/nairobi-1400.webp', '62% 50%', array['nairobi', 'karura', 'kibera', 'ngong', 'karen', 'westlands', 'giraffe centre'], -1.2921, 36.8219, 30, false),
('naivasha', 'Naivasha & Hell''s Gate', 'Kenya', 'Nakuru', 'Hippos, pelicans and the cycling gorge at Hell''s Gate, two hours from Nairobi.',
  '/assets/tours/places/naivasha-1400.webp', '50% 50%', array['naivasha', 'hell''s gate', 'hells gate', 'longonot', 'crescent island'], -0.7167, 36.4333, 40, false),
('lake-nakuru', 'Lake Nakuru', 'Kenya', 'Nakuru', 'Flamingo shallows and rhino, in a park you can drive round in a day.',
  '/assets/tours/places/lake-nakuru-1400.webp', '50% 60%', array['nakuru', 'elementaita', 'bogoria'], -0.3667, 36.0833, 50, false),
('diani', 'Diani', 'Kenya', 'Kwale', 'White sand, reef snorkelling and dhow days out to Wasini and Kisite.',
  '/assets/tours/places/diani-1400.webp', '50% 50%', array['diani', 'ukunda', 'shimoni', 'wasini', 'kisite', 'tiwi', 'galu'], -4.2797, 39.5947, 60, false),
('lamu', 'Lamu', 'Kenya', 'Lamu', 'Dhows, donkeys and a stone town that still runs without cars.',
  '/assets/tours/places/lamu-1400.webp', '45% 55%', array['lamu', 'shela', 'manda', 'kiwayu'], -2.2717, 40.9020, 70, false),
('mount-kenya', 'Mount Kenya', 'Kenya', 'Laikipia', 'Africa''s second-highest mountain, with treks to Point Lenana.',
  '/assets/tours/places/mount-kenya-1400.webp', '50% 45%', array['mount kenya', 'mt kenya', 'mt. kenya', 'nanyuki', 'naro moru', 'chogoria', 'sirimon', 'ol pejeta'], -0.1521, 37.3084, 80, false),
('samburu', 'Samburu', 'Kenya', 'Samburu', 'Reticulated giraffe, Grevy''s zebra and the Ewaso Ng''iro in the dry north.',
  '/assets/tours/places/samburu-1400.webp', '50% 72%', array['samburu', 'buffalo springs', 'shaba', 'archers post'], 0.5700, 37.5300, 90, false),
('zanzibar', 'Zanzibar', 'Tanzania', 'Unguja', 'Spice farms, Stone Town alleys and dhow sunsets off Nungwi.',
  '/assets/tours/places/zanzibar-1400.webp', '50% 50%', array['zanzibar', 'stone town', 'nungwi', 'paje', 'kendwa', 'pemba'], -6.1659, 39.2026, 100, true),
('serengeti', 'Serengeti & Ngorongoro', 'Tanzania', 'Arusha', 'Endless plains, the herds that cross them, and the crater next door.',
  '/assets/tours/places/serengeti-1400.webp', '50% 60%', array['serengeti', 'ngorongoro', 'seronera', 'tarangire', 'arusha'], -2.3333, 34.8333, 110, false),
('kilimanjaro', 'Kilimanjaro', 'Tanzania', 'Moshi', 'Africa''s highest mountain, climbed on routes of six to nine days.',
  '/assets/tours/places/kilimanjaro-1400.webp', '50% 55%', array['kilimanjaro', 'kili', 'moshi', 'marangu', 'machame', 'lemosho'], -3.0674, 37.3556, 120, false),
('bwindi', 'Bwindi', 'Uganda', 'Kanungu', 'An hour with mountain gorillas in the Impenetrable Forest.',
  '/assets/tours/places/bwindi-1400.webp', '40% 40%', array['bwindi', 'gorilla', 'mgahinga', 'kisoro', 'volcanoes national park', 'musanze'], -1.0500, 29.6167, 130, false),
('victoria-falls', 'Victoria Falls', 'Zambia & Zimbabwe', 'Livingstone', 'The smoke that thunders, with rafting and sunset cruises on the Zambezi.',
  '/assets/tours/places/victoria-falls-1400.webp', '55% 50%', array['victoria falls', 'livingstone', 'mosi-oa-tunya', 'zambezi'], -17.9243, 25.8572, 140, false)
on conflict (id) do nothing;

alter table public.tours add column if not exists place_id text references public.tour_places(id) on delete set null;
alter table public.tours add column if not exists place_auto boolean not null default true;
alter table public.tours add column if not exists pause_sig text;
create index if not exists tours_place_idx on public.tours (place_id) where place_id is not null;

-- The place whose words appear first in the text, as whole words:
-- "Hell's Gate cycling from Nairobi" is Naivasha, and "Kilifi" is not
-- Kili. Ties go to the longer word, then to page order.
create or replace function cabana_private.tour_place_for(p_text text)
returns text language sql stable security definer set search_path = pg_catalog, public as $$
  with src as (select lower(coalesce(p_text, '')) as s)
  select p.id
    from public.tour_places p
    cross join src
    cross join lateral (
      select min(h.at) as at, max(h.len) as len
        from (select regexp_instr(src.s, '\m' || replace(lower(btrim(term)), '.', '\.') || '\M') as at,
                     length(btrim(term)) as len
                from unnest(p.terms) term
               where length(btrim(term)) >= 3 and lower(btrim(term)) ~ '^[a-z0-9 .''-]+$') h
       where h.at > 0) m
   where p.enabled and m.at is not null
   order by m.at, m.len desc, p.position, p.id
   limit 1
$$;

-- A tour's place is guessed from its words until someone chooses one;
-- clearing it hands it back to the guess.
create or replace function cabana_private.tour_place_guess()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare hay text := concat_ws(' ', new.destination, new.county, new.start_point, new.title);
begin
  if tg_op = 'INSERT' then
    if new.place_id is null then new.place_id := cabana_private.tour_place_for(hay); new.place_auto := true;
    else new.place_auto := false; end if;
    return new;
  end if;
  if new.place_id is distinct from old.place_id then
    if new.place_id is null then new.place_id := cabana_private.tour_place_for(hay); new.place_auto := true;
    else new.place_auto := false; end if;
  elsif old.place_auto and (new.destination, new.county, new.start_point, new.title)
                           is distinct from (old.destination, old.county, old.start_point, old.title) then
    new.place_id := cabana_private.tour_place_for(hay); new.place_auto := true;
  end if;
  return new;
end $$;
drop trigger if exists tour_place_guess on public.tours;
create trigger tour_place_guess before insert or update of destination, county, start_point, title, place_id on public.tours
  for each row execute function cabana_private.tour_place_guess();

update public.tours set place_id = cabana_private.tour_place_for(concat_ws(' ', destination, county, start_point, title))
 where place_id is null and place_auto;

-- After terms change in the console, re-guess every tour nobody pinned.
create or replace function public.admin_tour_places_rematch()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare n int;
begin
  perform cabana_admin.guard();
  with u as (
    update public.tours t set place_id = cabana_private.tour_place_for(concat_ws(' ', t.destination, t.county, t.start_point, t.title))
     where t.place_auto
       and t.place_id is distinct from cabana_private.tour_place_for(concat_ws(' ', t.destination, t.county, t.start_point, t.title))
    returning 1)
  select count(*) into n from u;
  return jsonb_build_object('updated', n);
end $$;
revoke all on function public.admin_tour_places_rematch() from public, anon;
grant execute on function public.admin_tour_places_rematch() to authenticated;

-- The public view gains the place (appended, so existing columns keep
-- their order).
create or replace view public.tours_public with (security_invoker = true, security_barrier = true) as
 select t.id, t.slug, t.title, t.summary, t.description, t.category, t.destination, t.county, t.country,
    t.start_point, t.meeting_point, t.duration_label, t.duration_hours, t.days, t.price_kes, t.child_price_kes,
    t.deposit_pct, t.price_basis, t.group_min, t.group_max, t.schedule_type, t.next_departure, t.departure_days,
    t.spots_total, t.spots_left, t.cover_url, t.photos, t.videos, t.tags, t.highlights, t.includes_list,
    t.excludes_list, t.itinerary, t.what_to_bring, t.languages, t.cancellation, t.accessibility, t.featured,
    t.sort_weight, t.published_at,
    o.id as operator_id, o.slug as operator_slug, o.name as operator_name, o.tagline as operator_tagline,
    o.logo_url as operator_logo, o.kind as operator_kind, o.verified as operator_verified, o.county as operator_county,
    t.latitude, t.longitude, t.meeting_lat, t.meeting_lng, t.showcase, t.showcase_video, t.showcase_rank,
    t.showcase_headline, t.video_poster, t.departure_time, o.persona as operator_persona, t.booking_cutoff_hours,
    t.place_id
   from public.tours t
   left join public.tour_operators o on o.id = t.operator_id
  where t.status = 'published';
grant select on public.tours_public to anon, authenticated;

-- ── 3 · ALERTS ──────────────────────────────────────────────────────
create table if not exists public.tour_alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  place_id      text references public.tour_places(id) on delete cascade,
  category      text,
  note          text,
  created_at    timestamptz not null default now(),
  notified_at   timestamptz,
  notified_tour bigint,
  constraint tour_alerts_target check (place_id is not null or category is not null),
  constraint tour_alerts_category check (category is null or category in
    ('day-safari', 'big-safari', 'day-trip', 'city-tour', 'adventure', 'culture', 'beach', 'expedition')),
  constraint tour_alerts_note check (note is null or length(note) <= 240)
);
create unique index if not exists tour_alerts_one on public.tour_alerts (user_id, coalesce(place_id, ''), coalesce(category, ''));
create index if not exists tour_alerts_place on public.tour_alerts (place_id) where place_id is not null;
create index if not exists tour_alerts_cat on public.tour_alerts (category) where category is not null;
alter table public.tour_alerts enable row level security;
drop policy if exists tour_alerts_owner on public.tour_alerts;
drop policy if exists tour_alerts_owner_delete on public.tour_alerts;
drop policy if exists tour_alerts_admin on public.tour_alerts;
create policy tour_alerts_owner on public.tour_alerts for select to authenticated using (user_id = (select auth.uid()));
create policy tour_alerts_owner_delete on public.tour_alerts for delete to authenticated using (user_id = (select auth.uid()));
create policy tour_alerts_admin on public.tour_alerts for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_alerts from public, anon, authenticated;
grant select, delete on public.tour_alerts to authenticated;
grant all on public.tour_alerts to service_role;

create or replace function public.tour_alert_set(p_place text default null, p_category text default null,
                                                 p_on boolean default true, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare me uuid := auth.uid(); v_place text := nullif(btrim(coalesce(p_place, '')), ''); v_cat text := nullif(btrim(coalesce(p_category, '')), '');
  v_note text := left(nullif(btrim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), ''), 240); n int;
begin
  if me is null then raise exception 'Sign in to hear first.' using errcode = '42501', hint = 'signin'; end if;
  if v_place is null and v_cat is null then raise exception 'Choose a place or a kind of trip.' using errcode = '22023'; end if;
  if v_place is not null and not exists (select 1 from public.tour_places where id = v_place and enabled) then
    raise exception 'That place is not on Cabana Tours.' using errcode = '22023';
  end if;
  if v_cat is not null and v_cat not in ('day-safari', 'big-safari', 'day-trip', 'city-tour', 'adventure', 'culture', 'beach', 'expedition') then
    raise exception 'That is not a kind of trip on Cabana Tours.' using errcode = '22023';
  end if;
  if coalesce(p_on, true) then
    select count(*) into n from public.tour_alerts where user_id = me;
    if n >= 40 then raise exception 'You are already following 40 places and trips. Remove one first.' using errcode = 'P0001'; end if;
    insert into public.tour_alerts (user_id, place_id, category, note)
    values (me, v_place, v_cat, v_note)
    on conflict (user_id, coalesce(place_id, ''), coalesce(category, ''))
    do update set note = coalesce(excluded.note, public.tour_alerts.note);
  else
    delete from public.tour_alerts where user_id = me
       and coalesce(place_id, '') = coalesce(v_place, '') and coalesce(category, '') = coalesce(v_cat, '');
  end if;
  return jsonb_build_object('on', coalesce(p_on, true), 'place', v_place, 'category', v_cat,
    'waiting', (select count(*) from public.tour_alerts a
                 where coalesce(a.place_id, '') = coalesce(v_place, '') and coalesce(a.category, '') = coalesce(v_cat, '')));
end $$;
revoke all on function public.tour_alert_set(text, text, boolean, text) from public, anon;
grant execute on function public.tour_alert_set(text, text, boolean, text) to authenticated;

create or replace function public.tour_alerts_mine()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('place_id', a.place_id, 'category', a.category, 'note', a.note,
           'created_at', a.created_at, 'notified_at', a.notified_at) order by a.created_at desc), '[]'::jsonb)
    from public.tour_alerts a where a.user_id = auth.uid() and auth.uid() is not null
$$;
revoke all on function public.tour_alerts_mine() from public, anon;
grant execute on function public.tour_alerts_mine() to authenticated;

-- Where travellers are waiting, as counts. Nothing that identifies anyone.
create or replace function public.tour_demand()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object(
    'places', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'country', p.country,
                 'waiting', w.n, 'week', w.wk, 'tours', (select count(*) from public.tours t where t.place_id = p.id and t.status = 'published'))
                 order by w.n desc, p.position)
               from public.tour_places p
               join (select place_id, count(*) n, count(*) filter (where created_at > now() - interval '7 days') wk
                       from public.tour_alerts where place_id is not null group by place_id) w on w.place_id = p.id
              where p.enabled), '[]'::jsonb),
    'kinds', coalesce((select jsonb_agg(jsonb_build_object('category', c.category, 'waiting', c.n, 'week', c.wk,
                 'tours', (select count(*) from public.tours t where t.category = c.category and t.status = 'published')) order by c.n desc)
               from (select category, count(*) n, count(*) filter (where created_at > now() - interval '7 days') wk
                       from public.tour_alerts where category is not null group by category) c), '[]'::jsonb),
    'total', (select count(distinct user_id) from public.tour_alerts),
    'at', now())
$$;
revoke all on function public.tour_demand() from public, anon;
grant execute on function public.tour_demand() to authenticated;

create or replace function public.admin_tour_demand()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
begin
  perform cabana_admin.guard();
  return public.tour_demand() || jsonb_build_object(
    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'who', cabana_private.member_name(a.user_id),
                 'place', p.name, 'place_id', a.place_id, 'category', a.category, 'note', a.note,
                 'created_at', a.created_at, 'notified_at', a.notified_at) order by a.created_at desc)
               from (select * from public.tour_alerts order by created_at desc limit 80) a
               left join public.tour_places p on p.id = a.place_id), '[]'::jsonb));
end $$;
revoke all on function public.admin_tour_demand() from public, anon;
grant execute on function public.admin_tour_demand() to authenticated;

-- Publishing a tour tells everyone waiting for its place or its kind,
-- once per person per tour. A failure here never blocks publishing.
create or replace function cabana_private.tour_alerts_notify()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    with hits as (
      select a.id, a.user_id from public.tour_alerts a
       where (a.place_id is not null and a.place_id = new.place_id)
          or (a.category is not null and a.category = new.category)
    ), who as (
      select distinct h.user_id from hits h
       where h.user_id is distinct from new.owner_id
         and not exists (select 1 from public.notifications n
                          where n.user_id = h.user_id and n.meta->>'alert_tour' = new.id::text)
    ), sent as (
      insert into public.notifications (user_id, title, body, url, kind, meta)
      select w.user_id, 'A tour you asked about is live',
             new.title || coalesce(' · ' || nullif(btrim(coalesce(new.destination, '')), ''), '') || '. Seats go to whoever books first.',
             '/tours?open=' || new.id, 'general', jsonb_build_object('alert_tour', new.id::text)
        from who w
      returning 1
    )
    update public.tour_alerts set notified_at = now(), notified_tour = new.id where id in (select id from hits);
  end if;
  return null;
exception when others then
  raise warning 'tour_alerts_notify: %', sqlerrm;
  return null;
end $$;
drop trigger if exists tour_alerts_notify on public.tours;
create trigger tour_alerts_notify after insert or update of status on public.tours
  for each row execute function cabana_private.tour_alerts_notify();

-- ── 4 · 360° FILMING REQUESTS ───────────────────────────────────────
create table if not exists public.tour_immersive_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  operator_id bigint references public.tour_operators(id) on delete set null,
  tour_id     bigint references public.tours(id) on delete set null,
  note        text check (note is null or length(note) <= 600),
  status      text not null default 'new' check (status in ('new', 'scheduled', 'filmed', 'declined', 'closed')),
  admin_note  text check (admin_note is null or length(admin_note) <= 600),
  world_id    uuid references public.immersive_experiences(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tour_immersive_requests_user on public.tour_immersive_requests (user_id);
alter table public.tour_immersive_requests enable row level security;
drop policy if exists tour_immersive_requests_owner on public.tour_immersive_requests;
drop policy if exists tour_immersive_requests_admin on public.tour_immersive_requests;
create policy tour_immersive_requests_owner on public.tour_immersive_requests for select to authenticated using (user_id = (select auth.uid()));
create policy tour_immersive_requests_admin on public.tour_immersive_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_immersive_requests from public, anon, authenticated;
grant select on public.tour_immersive_requests to authenticated;
grant all on public.tour_immersive_requests to service_role;

create or replace function public.tour_immersive_request(p_tour bigint default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare me uuid := auth.uid(); op public.tour_operators%rowtype; t public.tours%rowtype; r public.tour_immersive_requests%rowtype;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into op from public.tour_operators where owner_id = me and status = 'approved' order by created_at limit 1;
  if not found then raise exception 'Your guide or operator profile needs to be approved first.' using errcode = '42501', hint = 'operator_required'; end if;
  if p_tour is not null then
    select * into t from public.tours where id = p_tour and (owner_id = me or operator_id = op.id);
    if not found then raise exception 'Pick one of your tours.' using errcode = '22023'; end if;
  end if;
  if exists (select 1 from public.tour_immersive_requests where user_id = me and status in ('new', 'scheduled')
               and coalesce(tour_id, 0) = coalesce(p_tour, 0)) then
    raise exception 'You already asked about this one. We will be in touch.' using errcode = 'P0001';
  end if;
  insert into public.tour_immersive_requests (user_id, operator_id, tour_id, note)
  values (me, op.id, t.id, left(nullif(btrim(coalesce(p_note, '')), ''), 600)) returning * into r;
  return to_jsonb(r) - 'admin_note';
end $$;
revoke all on function public.tour_immersive_request(bigint, text) from public, anon;
grant execute on function public.tour_immersive_request(bigint, text) to authenticated;

create or replace function public.tour_immersive_requests_mine()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'tour_id', r.tour_id, 'tour', t.title, 'note', r.note,
           'status', r.status, 'admin_note', r.admin_note, 'world', w.slug, 'world_title', w.title,
           'created_at', r.created_at, 'updated_at', r.updated_at) order by r.created_at desc), '[]'::jsonb)
    from public.tour_immersive_requests r
    left join public.tours t on t.id = r.tour_id
    left join public.immersive_experiences w on w.id = r.world_id
   where r.user_id = auth.uid() and auth.uid() is not null
$$;
revoke all on function public.tour_immersive_requests_mine() from public, anon;
grant execute on function public.tour_immersive_requests_mine() to authenticated;

create or replace function public.admin_tour_immersive_requests()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
begin
  perform cabana_admin.guard();
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'who', cabana_private.member_name(r.user_id),
           'operator', o.name, 'operator_id', r.operator_id, 'tour_id', r.tour_id, 'tour', t.title,
           'place', coalesce(t.destination, t.county), 'note', r.note, 'status', r.status, 'admin_note', r.admin_note,
           'world_id', r.world_id, 'world', w.title, 'created_at', r.created_at, 'updated_at', r.updated_at)
           order by case r.status when 'new' then 0 when 'scheduled' then 1 else 2 end, r.created_at desc)
    from public.tour_immersive_requests r
    left join public.tour_operators o on o.id = r.operator_id
    left join public.tours t on t.id = r.tour_id
    left join public.immersive_experiences w on w.id = r.world_id), '[]'::jsonb);
end $$;
revoke all on function public.admin_tour_immersive_requests() from public, anon;
grant execute on function public.admin_tour_immersive_requests() to authenticated;

-- Moving a request on tells the guide; a filmed request with a world
-- links that world to the tour, which puts "Step inside" on its page.
create or replace function public.admin_tour_immersive_request_set(p_id uuid, p_status text, p_note text default null, p_world uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare r public.tour_immersive_requests%rowtype;
begin
  perform cabana_admin.guard();
  if p_status not in ('new', 'scheduled', 'filmed', 'declined', 'closed') then raise exception 'Unknown status' using errcode = '22023'; end if;
  select * into r from public.tour_immersive_requests where id = p_id for update;
  if not found then raise exception 'Request not found' using errcode = '22023'; end if;
  update public.tour_immersive_requests
     set status = p_status, admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note),
         world_id = coalesce(p_world, world_id), updated_at = now()
   where id = r.id;
  if p_status = 'filmed' and coalesce(p_world, r.world_id) is not null and r.tour_id is not null then
    update public.immersive_experiences set tour_id = r.tour_id
     where id = coalesce(p_world, r.world_id) and tour_id is null;
  end if;
  if p_status is distinct from r.status then
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (r.user_id,
            case p_status when 'scheduled' then 'Your 360° filming is scheduled'
                          when 'filmed' then 'Your tour is live in 360°'
                          when 'declined' then 'About your 360° filming request'
                          else 'Your 360° filming request was updated' end,
            coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Open your studio for the details.'),
            '/tours-studio?tab=immersive', 'general', jsonb_build_object('immersive_request', r.id));
  end if;
  perform cabana_admin.log('tour_immersive_request_' || p_status, 'tour_immersive_request', r.id::text,
                           jsonb_build_object('note', p_note, 'world', p_world));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_tour_immersive_request_set(uuid, text, text, uuid) from public, anon;
grant execute on function public.admin_tour_immersive_request_set(uuid, text, text, uuid) to authenticated;

-- ── 5 · CHANGES TO LIVE TOURS · PAUSE AND RESUME ────────────────────
create or replace function cabana_private.tour_editable_fields()
returns text[] language sql immutable set search_path = pg_catalog as $$
  select array['title', 'summary', 'description', 'category', 'destination', 'county', 'country', 'start_point',
    'meeting_point', 'duration_label', 'duration_hours', 'days', 'price_kes', 'child_price_kes', 'deposit_pct',
    'price_basis', 'group_min', 'group_max', 'schedule_type', 'next_departure', 'departure_days', 'departure_time',
    'spots_total', 'cover_url', 'photos', 'videos', 'tags', 'highlights', 'includes_list', 'excludes_list',
    'itinerary', 'what_to_bring', 'languages', 'cancellation', 'accessibility', 'booking_cutoff_hours',
    'latitude', 'longitude', 'meeting_lat', 'meeting_lng', 'meeting_plus']::text[]
$$;

create table if not exists public.tour_change_requests (
  id          uuid primary key default gen_random_uuid(),
  tour_id     bigint not null references public.tours(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  patch       jsonb not null check (jsonb_typeof(patch) = 'object'),
  note        text check (note is null or length(note) <= 500),
  status      text not null default 'pending' check (status in ('pending', 'applied', 'declined', 'withdrawn')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at  timestamptz not null default now()
);
create index if not exists tour_change_requests_tour on public.tour_change_requests (tour_id, status);
alter table public.tour_change_requests enable row level security;
drop policy if exists tour_change_requests_owner on public.tour_change_requests;
drop policy if exists tour_change_requests_admin on public.tour_change_requests;
create policy tour_change_requests_owner on public.tour_change_requests for select to authenticated using (user_id = (select auth.uid()));
create policy tour_change_requests_admin on public.tour_change_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_change_requests from public, anon, authenticated;
grant select on public.tour_change_requests to authenticated;
grant all on public.tour_change_requests to service_role;

create or replace function public.tour_change_propose(p_tour bigint, p_patch jsonb, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare me uuid := auth.uid(); t public.tours%rowtype; clean jsonb := '{}'::jsonb; k text;
  r public.tour_change_requests%rowtype; probe public.tours%rowtype;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into t from public.tours where id = p_tour and owner_id = me;
  if not found then raise exception 'That tour is not one of yours.' using errcode = '42501'; end if;
  if t.status <> 'published' then raise exception 'This tour is not live yet, so edit it directly.' using errcode = '22023', hint = 'direct'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'Nothing to change.' using errcode = '22023'; end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k = any(cabana_private.tour_editable_fields()) then clean := clean || jsonb_build_object(k, p_patch->k); end if;
  end loop;
  if clean = '{}'::jsonb then raise exception 'Nothing to change.' using errcode = '22023'; end if;
  begin
    probe := jsonb_populate_record(null::public.tours, clean);
  exception when others then
    raise exception 'One of the changes is not in the right format.' using errcode = '22023';
  end;
  update public.tour_change_requests set status = 'withdrawn' where tour_id = t.id and status = 'pending';
  insert into public.tour_change_requests (tour_id, user_id, patch, note)
  values (t.id, me, clean, left(nullif(btrim(coalesce(p_note, '')), ''), 500)) returning * into r;
  return jsonb_build_object('id', r.id, 'status', r.status,
    'fields', (select jsonb_agg(x order by x) from jsonb_object_keys(clean) x));
end $$;
revoke all on function public.tour_change_propose(bigint, jsonb, text) from public, anon;
grant execute on function public.tour_change_propose(bigint, jsonb, text) to authenticated;

create or replace function public.tour_changes_mine()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'tour_id', c.tour_id, 'tour', t.title, 'status', c.status,
           'fields', (select jsonb_agg(x order by x) from jsonb_object_keys(c.patch) x), 'note', c.note,
           'review_note', c.review_note, 'created_at', c.created_at, 'reviewed_at', c.reviewed_at) order by c.created_at desc), '[]'::jsonb)
    from public.tour_change_requests c join public.tours t on t.id = c.tour_id
   where c.user_id = auth.uid() and auth.uid() is not null and c.status <> 'withdrawn'
$$;
revoke all on function public.tour_changes_mine() from public, anon;
grant execute on function public.tour_changes_mine() to authenticated;

create or replace function public.admin_tour_changes()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
begin
  perform cabana_admin.guard();
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'tour_id', c.tour_id, 'tour', t.title,
           'who', cabana_private.member_name(c.user_id), 'operator', o.name, 'patch', c.patch,
           'current', (select jsonb_object_agg(k, to_jsonb(t) -> k) from jsonb_object_keys(c.patch) k),
           'note', c.note, 'status', c.status, 'review_note', c.review_note, 'created_at', c.created_at)
           order by c.created_at)
    from public.tour_change_requests c
    join public.tours t on t.id = c.tour_id
    left join public.tour_operators o on o.id = t.operator_id
   where c.status = 'pending'), '[]'::jsonb);
end $$;
revoke all on function public.admin_tour_changes() from public, anon;
grant execute on function public.admin_tour_changes() to authenticated;

create or replace function public.admin_tour_change_decide(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare cr public.tour_change_requests%rowtype; r public.tours%rowtype; sets text; v_title text;
begin
  perform cabana_admin.guard();
  select * into cr from public.tour_change_requests where id = p_id for update;
  if not found then raise exception 'Change not found' using errcode = '22023'; end if;
  if cr.status <> 'pending' then raise exception 'This change is already %.', cr.status using errcode = '22023'; end if;
  select title into v_title from public.tours where id = cr.tour_id;
  if p_action = 'apply' then
    r := jsonb_populate_record(null::public.tours, cr.patch);
    select string_agg(format('%I = ($1).%I', k, k), ', ') into sets
      from jsonb_object_keys(cr.patch) k where k = any(cabana_private.tour_editable_fields());
    if sets is not null then
      execute format('update public.tours set %s, updated_at = now() where id = $2', sets) using r, cr.tour_id;
    end if;
    update public.tour_change_requests set status = 'applied', reviewed_at = now(),
           reviewed_by = lower(coalesce(auth.jwt()->>'email', 'console')), review_note = nullif(btrim(coalesce(p_note, '')), '')
     where id = cr.id;
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (cr.user_id, 'Your changes are live', coalesce(v_title, 'Your tour') || ' now shows your changes.',
            '/tours?open=' || cr.tour_id, 'general', jsonb_build_object('tour_change', cr.id));
  elsif p_action = 'decline' then
    update public.tour_change_requests set status = 'declined', reviewed_at = now(),
           reviewed_by = lower(coalesce(auth.jwt()->>'email', 'console')), review_note = nullif(btrim(coalesce(p_note, '')), '')
     where id = cr.id;
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (cr.user_id, 'About your changes to ' || coalesce(v_title, 'your tour'),
            coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'They were not applied. Open your studio for the details.'),
            '/tours-studio?tab=tours', 'general', jsonb_build_object('tour_change', cr.id));
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform cabana_admin.log('tour_change_' || p_action, 'tour', cr.tour_id::text, jsonb_build_object('change', cr.id, 'note', p_note));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_tour_change_decide(uuid, text, text) from public, anon;
grant execute on function public.admin_tour_change_decide(uuid, text, text) to authenticated;

-- The fingerprint of what a traveller sees. A tour resumed with the same
-- fingerprint it was paused with goes straight back live.
create or replace function cabana_private.tour_sig(t public.tours)
returns text language sql immutable set search_path = pg_catalog as $$
  select md5(concat_ws('|', t.title, t.summary, t.description, t.category, t.destination, t.county, t.meeting_point,
    t.duration_label, t.days, t.price_kes, t.child_price_kes, t.deposit_pct, t.price_basis, t.group_min, t.group_max,
    t.schedule_type, t.next_departure, t.departure_days::text, t.departure_time, t.cover_url, t.photos::text,
    t.videos::text, t.itinerary::text, t.includes_list::text, t.excludes_list::text, t.highlights::text, t.cancellation))
$$;

create or replace function public.tour_operator_pause(p_tour bigint, p_pause boolean default true)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare me uuid := auth.uid(); t public.tours%rowtype; v_to text;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into t from public.tours where id = p_tour and owner_id = me for update;
  if not found then raise exception 'That tour is not one of yours.' using errcode = '42501'; end if;
  if coalesce(p_pause, true) then
    if t.status <> 'published' then raise exception 'Only a live tour can be paused.' using errcode = '22023'; end if;
    update public.tours set status = 'paused', pause_sig = cabana_private.tour_sig(t) where id = t.id;
    v_to := 'paused';
  else
    if t.status <> 'paused' then raise exception 'Only a paused tour can be resumed.' using errcode = '22023'; end if;
    if t.pause_sig is null then
      raise exception 'Cabana paused this tour. Message support to have it looked at.' using errcode = '42501', hint = 'paused_by_cabana';
    end if;
    v_to := case when t.pause_sig = cabana_private.tour_sig(t) then 'published' else 'pending' end;
    update public.tours set status = v_to, pause_sig = null where id = t.id;
  end if;
  return jsonb_build_object('status', v_to);
end $$;
revoke all on function public.tour_operator_pause(bigint, boolean) from public, anon;
grant execute on function public.tour_operator_pause(bigint, boolean) to authenticated;

-- ── 6 · THE PAGE ────────────────────────────────────────────────────
alter table public.tour_page_blocks drop constraint if exists tour_page_blocks_kind_check;
alter table public.tour_page_blocks add constraint tour_page_blocks_kind_check check (kind in
  ('hero', 'departures', 'kinds', 'collection', 'immersive', 'places', 'guides', 'catalogue', 'pitch', 'invite'));

-- The launch copy for the v3 page. A block a person has edited (its
-- updated_by is set) keeps what they wrote; the rest take the new copy.
insert into public.tour_page_blocks (id, kind, position, enabled, content) values
('hero', 'hero', 0, true, jsonb_build_object(
  'eyebrow', 'Cabana Tours',
  'title', 'Safaris, day trips and city walks, *straight from the guide.*',
  'lede', 'Real departures, real prices and the guide behind every tour. Message them first, then pay the deposit by M-Pesa.',
  'image', null, 'image_mobile', null, 'video', null, 'focal', '50% 50%', 'shade', 45,
  'search_placeholder', 'Where to? Try the Mara, Diani or Zanzibar',
  'auto_departures', true,
  'links', jsonb_build_array(
    jsonb_build_object('label', 'This weekend', 'url', '/tours-catalogue?when=weekend'),
    jsonb_build_object('label', 'Day trips', 'url', '/tours-catalogue?len=1'),
    jsonb_build_object('label', 'Multi-day safaris', 'url', '/tours-catalogue?cat=big-safari'),
    jsonb_build_object('label', 'City walks', 'url', '/tours-catalogue?cat=city-tour'),
    jsonb_build_object('label', 'Under KES 5,000', 'url', '/tours-catalogue?price=u5')))),
('departures', 'departures', 10, true, jsonb_build_object(
  'eyebrow', 'Departures',
  'title', 'Leaving *soon*',
  'lede', 'Every scheduled tour with seats in the next 30 days, counting down on Nairobi time.',
  'show_clock', true)),
('kinds', 'kinds', 20, true, jsonb_build_object(
  'eyebrow', 'Ways to travel',
  'title', 'Choose the *kind of day* you want',
  'lede', 'From a morning game drive to four days on a mountain.',
  'cta_label', 'All tours',
  'show_empty', true,
  'items', jsonb_build_object(
    'day-safari', jsonb_build_object('name', 'Day safaris', 'blurb', 'Game drives between breakfast and dinner.', 'image', null, 'hidden', false, 'position', 1),
    'big-safari', jsonb_build_object('name', 'Multi-day safaris', 'blurb', 'Nights in camp, days on the plains.', 'image', null, 'hidden', false, 'position', 2),
    'day-trip',   jsonb_build_object('name', 'Day trips', 'blurb', 'Lakes, gorges and hills within reach of the city.', 'image', null, 'hidden', false, 'position', 3),
    'city-tour',  jsonb_build_object('name', 'City walks', 'blurb', 'Food, history and nightlife, on foot with a local.', 'image', null, 'hidden', false, 'position', 4),
    'adventure',  jsonb_build_object('name', 'Adventure', 'blurb', 'Hikes, climbs, cycling and white water.', 'image', null, 'hidden', false, 'position', 5),
    'culture',    jsonb_build_object('name', 'Culture & community', 'blurb', 'Markets, music, craft and the people behind them.', 'image', null, 'hidden', false, 'position', 6),
    'beach',      jsonb_build_object('name', 'Coast & water', 'blurb', 'Dhows, reefs and islands.', 'image', null, 'hidden', false, 'position', 7),
    'expedition', jsonb_build_object('name', 'Expeditions', 'blurb', 'Four days or more, for the big mountains.', 'image', null, 'hidden', false, 'position', 8)))),
('immersive', 'immersive', 30, true, jsonb_build_object(
  'eyebrow', 'Cabana Immersive · VR & 360°',
  'title', 'Stand in it *before you book.*',
  'lede', 'Look around a place in 360° on your phone, in a VR viewer or in a headset, then book the real thing.')),
('places', 'places', 40, true, jsonb_build_object(
  'eyebrow', 'Where to',
  'title', 'Where do you *want to go?*',
  'lede', 'Pick a place to see its tours. If none are listed yet, ask to hear first and we will tell you the moment one opens.',
  'cta_label', 'Open the catalogue',
  'show_map', true)),
('guides', 'guides', 50, true, jsonb_build_object(
  'eyebrow', 'Guides',
  'title', 'Know your guide *before you go*',
  'lede', 'Message any guide before you pay. Their number is shared once your booking is confirmed.',
  'cta_label', 'Meet the guides',
  'featured_ids', '[]'::jsonb)),
('catalogue', 'catalogue', 60, true, jsonb_build_object(
  'eyebrow', 'All tours',
  'title', 'Every tour, *every departure*',
  'lede', 'Filter by date, price, length and group size in the full catalogue.',
  'cta_label', 'Open the catalogue',
  'limit', 8,
  'empty_title', 'The first tours are being checked',
  'empty_text', 'Every guide and every tour is reviewed before it goes live. Follow a place above and we will tell you the moment one opens.',
  'empty_cta_label', 'List your tours',
  'empty_cta_url', '/list-your-tour')),
('pitch', 'pitch', 80, true, jsonb_build_object(
  'eyebrow', 'For guides and operators',
  'title', 'Take a slot at *the top of Cabana Tours*',
  'lede', 'Your photo or film, your headline and a Book button, in the Marquee every traveller sees first.',
  'bullets', jsonb_build_array(
    'Pay by M-Pesa and pick your dates. We review every slot within a day.',
    'Not approved? The full amount comes back to you as Cabana credit.',
    'Views and taps for every day it runs, in your studio.'),
  'cta_label', 'Book a slot',
  'cta_url', '/tours-studio?tab=spotlight',
  'film_title', 'Film it in *360°*',
  'film_text', 'Ask us to film your tour in 360° so travellers can stand in it before they book.',
  'film_cta', 'Ask for filming')),
('invite', 'invite', 90, true, jsonb_build_object(
  'eyebrow', 'For guides and operators',
  'title', 'Run tours? *List them here.*',
  'lede', 'Set your own dates and prices and keep the full fare. We take no commission on the tour price.',
  'bullets', jsonb_build_array(
    'No commission on the tour price',
    'Your dates, departure times, group sizes and prices',
    'Travellers message you on Cabana and pay by M-Pesa',
    'Send private group prices straight from the chat'),
  'cta_label', 'List your tours',
  'cta_url', '/list-your-tour'))
on conflict (id) do update
  set position = excluded.position, enabled = excluded.enabled, content = excluded.content
  where public.tour_page_blocks.updated_by is null;

-- ── 7 · CABANA'S OWN PROMOTIONS IN THE MARQUEE ──────────────────────
-- Real things only: the 360° world that is live, following a place,
-- messaging a guide, and listing tours. Edited or ended in the console.
insert into public.tour_spotlights (kind, status, media_kind, media_url, focal, label, kicker, headline, subline,
                                    cta_label, cta_url, world_slug, accent, starts_at, ends_at, priority)
select * from (values
  ('house', 'approved', 'image', '/assets/tours/promo/jeep-elephant-1800.webp', '60% 50%', 'Cabana Immersive', 'VR · 360°',
   'Stand with the herd *before you book*',
   'Elephants 360: two and a half minutes in the long grass. Look around on your phone, in a viewer or in a headset.',
   'Step inside', '#immersive', 'elephants-360', '#7457F2', now(), now() + interval '5 years', 40),
  ('house', 'approved', 'image', '/assets/tours/promo/balloon-mara-1800.webp', '55% 40%', 'New', 'Where to',
   'Tell us where. *We will tell you when.*',
   'Follow a place or a kind of trip and hear first when a guide lists it.',
   'Choose a place', '#places', null, '#F2541B', now(), now() + interval '5 years', 30),
  ('house', 'approved', 'image', '/assets/tours/promo/guide-drive-1800.webp', '40% 50%', 'Direct', 'The guides',
   'Talk to your guide *before you pay*',
   'Every tour has a Message button. Ask about pick-up, a private date or a group price, right in the chat.',
   'Meet the guides', '/tour-guides', null, '#13925F', now(), now() + interval '5 years', 20),
  ('house', 'approved', 'image', '/assets/tours/promo/golden-giraffe-1800.webp', '50% 45%', 'Zero commission', 'For guides',
   'List your tours. *Keep the full fare.*',
   'Your dates, your prices, your guests. We take nothing from the tour price.',
   'List your tours', '/list-your-tour', null, '#FFB21E', now(), now() + interval '5 years', 10)
) v(kind, status, media_kind, media_url, focal, label, kicker, headline, subline, cta_label, cta_url, world_slug, accent, starts_at, ends_at, priority)
where not exists (select 1 from public.tour_spotlights
                   where kind = 'house' and status in ('approved', 'paused') and media_kind in ('image', 'video', 'youtube'));

-- ── 8 · THE CONSOLE INBOX ───────────────────────────────────────────
-- Changes to live tours and 360° filming requests join the inbox,
-- beside tours and Spotlights to review.
do $patch$
declare
  def text := pg_get_functiondef('public.admin_inbox()'::regprocedure);
  anchor text := $a$  return jsonb_build_object('counts', counts, 'items', items, 'at', now());$a$;
  addition text := $b$  -- tour changes and 360 filming (added by the Cabana Tours v3 migration)
  select count(*) into v_n from public.tour_change_requests where status = 'pending';
  counts := counts || jsonb_build_object('tour_changes', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue', 'tour_changes', 'severity', 'med', 'id', c.id::text,
      'title', 'Changes to a live tour · ' || coalesce(t.title, 'tour'),
      'sub', (select string_agg(k, ', ') from jsonb_object_keys(c.patch) k),
      'at', c.created_at, 'link', '#/tours') as x
      from public.tour_change_requests c join public.tours t on t.id = c.tour_id
     where c.status = 'pending' order by c.created_at limit 8) q;
  items := items || v;
  select count(*) into v_n from public.tour_immersive_requests where status = 'new';
  counts := counts || jsonb_build_object('tour_film', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue', 'tour_film', 'severity', 'low', 'id', r.id::text,
      'title', '360° filming request · ' || coalesce((select o.name from public.tour_operators o where o.id = r.operator_id), 'a guide'),
      'sub', coalesce((select t.title from public.tours t where t.id = r.tour_id), 'Company film'),
      'at', r.created_at, 'link', '#/tours') as x
      from public.tour_immersive_requests r where r.status = 'new' order by r.created_at limit 8) q;
  items := items || v;

$b$;
begin
  if position('Cabana Tours v3 migration' in def) > 0 then return; end if;
  if position(anchor in def) = 0 then
    raise notice 'admin_inbox changed shape; tour changes and 360 filming queues not added';
    return;
  end if;
  execute replace(def, anchor, addition || anchor);
end;
$patch$;

notify pgrst, 'reload schema';
