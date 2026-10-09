-- ═══════════════════════════════════════════════════════════════════════════
-- GROWTH ENGINE · BEHAVIOURAL TESTS
-- ─────────────────────────────────────────────────────────────────────────
--   ./tests/run-growth-sql-tests.sh
--
-- Each test pins a property a later edit will be tempted to break: that the
-- catalogue never leaks a phone number, that a view counter never pings
-- Bing, that a broken feed never blocks a booking.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\pset pager off

create or replace function ok(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond then raise notice '  PASS  %', label;
  else raise exception 'FAIL  %', label;
  end if;
end $$;

truncate public.listings, public.tours, public.events, public.car_fleet, public.car_operators,
         public.tour_operators, public.event_organisers, public.reviews, public.restaurant_profiles,
         public.beacon_changes, public.beacon_places, public.beacon_pings, public.profiles;
truncate net.calls;

insert into public.profiles (id, first_name, last_name) values
  ('11111111-1111-1111-1111-111111111111', 'Wanjiru', 'Kamau');

-- A live stay, with private fields that must never surface.
insert into public.listings (id, host_id, type, title, country, city, area, street, beds, baths, max_guests,
                             description, amenities, photos, currency, price_night, status, is_active,
                             lat, lng, contact_phone, contact_email, service, property_type, bedrooms, min_nights)
values ('2d488e1a-3582-409f-ac3c-5f67adc90c74', '11111111-1111-1111-1111-111111111111', 'apartment',
        'Elegant 1 Bedroom in Kileleshwa', 'Kenya', 'Nairobi', 'Kilimani division', '14 Secret Lane',
        '1', '1', '2', 'A calm flat.', array['WiFi','Parking'],
        array['https://x.supabase.co/storage/v1/object/public/listings/a.jpg','http://insecure/b.jpg','https://x/c.jpg'],
        'KES', 6000, 'active', true, -1.28637, 36.78912, '+254700000000', 'host@example.com', 'stays', 'Apartment', 1, 2);

-- A paused stay and a deleted stay.
insert into public.listings (id, type, title, city, price_night, status, is_active, service)
values ('65ef1d11-a4e3-4250-bbac-f826c0cd10d2', 'apartment', 'Paused flat', 'Nairobi', 1500, 'active', false, 'stays');
insert into public.listings (id, type, title, city, price_night, status, is_active, service, deleted_at)
values ('20b22953-2c13-4e6c-a5c4-3cbefcc20cae', 'apartment', 'Deleted flat', 'Nairobi', 2500, 'active', true, 'stays', now());

-- A ride listing is a request flow, not a page.
insert into public.listings (type, title, city, price_night, status, is_active, service)
values ('ride', 'Airport ride', 'Nairobi', 1500, 'active', true, 'rides');

insert into public.tour_operators (id, name, verified) values (33, 'Mara Trails', true);
insert into public.tours (id, operator_id, title, destination, country, price_kes, status, photos, cover_url, highlights, days)
values (44, 33, 'Three days in the Mara',
        'Maasai Mara', 'Kenya', 45000, 'published', '[{"url":"https://x/t1.jpg"},"https://x/t2.jpg"]',
        'https://x/cover.jpg', '["Big five","Balloon"]', 3);
insert into public.tours (title, destination, price_kes, status) values ('Draft tour', 'Diani', 1000, 'draft');

insert into public.events (id, title, city, venue, starts_at, ends_at, price_from, status, photos)
values (55, 'Sauti Sol live', 'Nairobi', 'KICC', now() + interval '3 days',
        now() + interval '3 days 4 hours', 2500, 'published', '[]');
insert into public.events (title, city, starts_at, ends_at, price_from, status)
values ('Last week', 'Nairobi', now() - interval '8 days', now() - interval '7 days', 1000, 'published');

insert into public.car_operators (id, name, city, country_code, verified) values
  ('66666666-6666-6666-6666-666666666666', 'Drive KE', 'Nairobi', 'KE', true),
  ('77777777-7777-7777-7777-777777777777', 'Paused Co', 'Mombasa', 'KE', true);
update public.car_operators set paused_until = now() + interval '2 days' where id = '77777777-7777-7777-7777-777777777777';
insert into public.car_fleet (id, operator_id, make, model, day_rate, status, photos, seats, features)
values ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 'Toyota', 'Prado', 9000,
        'active', '["https://x/car.jpg"]', 7, array['4x4']),
       ('99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777', 'Nissan', 'Note', 3000,
        'active', '[]', 5, null);

-- ── Catalogue ─────────────────────────────────────────────────────────
do $$
declare c jsonb := public.beacon_catalogue();
        s jsonb;
begin
  perform ok(jsonb_array_length(c) = 4, 'catalogue holds exactly the live stay, tour, upcoming event and unpaused car');
  perform ok(not exists (select 1 from jsonb_array_elements(c) x where x ->> 'kind' is null), 'every row has a page family; rides are excluded');
  select x into s from jsonb_array_elements(c) x where x ->> 'kind' = 'stay';
  perform ok(s ->> 'title' = 'Elegant 1 Bedroom in Kileleshwa', 'the stay is present');
  perform ok(c::text !~ '(Secret Lane|254700000000|host@example)', 'no street, phone or email ever leaves the catalogue');
  perform ok((s ->> 'lat')::numeric = -1.29 and (s ->> 'lng')::numeric = 36.79, 'coordinates are rounded to about a kilometre');
  perform ok(jsonb_array_length(s -> 'photos') = 2, 'only https photos are published');
  perform ok(s ->> 'host' = 'Wanjiru' and c::text !~ 'Kamau', 'hosts appear by first name only');
  perform ok((s ->> 'guests')::int = 2 and (s ->> 'bedrooms')::int = 1, 'text columns are read as numbers');
end $$;

-- ── Entity lookup ─────────────────────────────────────────────────────
do $$
begin
  perform ok(public.beacon_entity('stay', '2d488e1a') ->> 'state' = 'live', 'an eight-character key finds a live stay');
  perform ok(public.beacon_entity('stay', '2d488e1a') ->> 'description' = 'A calm flat.', 'the page gets the full description');
  perform ok(public.beacon_entity('stay', '65ef1d11') ->> 'state' = 'gone', 'a paused stay is gone, not absent');
  perform ok(public.beacon_entity('stay', '20b22953') ->> 'state' = 'gone', 'a deleted stay is gone');
  perform ok(public.beacon_entity('stay', 'deadbeef') ->> 'state' = 'absent', 'an unknown key is absent');
  perform ok(public.beacon_entity('tour', '2d488e1a') ->> 'state' = 'absent', 'a key only matches its own page family');
  perform ok(public.beacon_entity('stay', 'x''; drop') ->> 'state' = 'absent', 'a malformed key is refused before any query');
  perform ok(public.beacon_entity('tour', '44') ->> 'state' = 'live', 'tours resolve from the tours table by their numeric id');
  perform ok(public.beacon_entity('event', '55') ->> 'state' = 'live', 'events resolve by their numeric id');
  perform ok(public.beacon_entity('stay', '44') ->> 'state' = 'absent', 'a numeric key never matches a stay');
  perform ok(public.beacon_entity('car', '99999999') ->> 'state' = 'gone', 'a car whose operator is paused is gone');
  perform ok(public.beacon_entity('stay', '2d488e1a') ::text !~ 'Secret Lane', 'the page payload carries no street');
end $$;

-- ── Change feed ───────────────────────────────────────────────────────
do $$
declare n0 bigint; n1 bigint; r public.beacon_changes;
begin
  select count(*) into n0 from public.beacon_changes;
  perform ok(n0 >= 3, 'creating live things was recorded');

  update public.beacon_changes set processed_at = now(), claimed_at = now();
  select count(*) into n0 from public.beacon_changes where processed_at is null;

  update public.listings set views = views + 1, updated_at = now() where id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  select count(*) into n1 from public.beacon_changes where processed_at is null;
  perform ok(n1 = n0, 'a view counter does not announce anything');

  update public.listings set title = 'Elegant 1BR, Kileleshwa' where id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  select * into r from public.beacon_changes where processed_at is null and entity_id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  perform ok(r.change = 'updated' and r.previous ->> 'title' = 'Elegant 1 Bedroom in Kileleshwa',
             'a rename is recorded with the old title, so the old URL can be announced');

  update public.listings set price_night = 6500 where id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  update public.listings set is_active = false where id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  select count(*) into n1 from public.beacon_changes where processed_at is null and entity_id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  select * into r from public.beacon_changes where processed_at is null and entity_id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  perform ok(n1 = 1 and r.change = 'deactivated', 'a burst of edits is one open change, and the latest state wins');
  perform ok(r.previous ->> 'title' = 'Elegant 1 Bedroom in Kileleshwa', 'the first old title survives the burst');

  update public.listings set is_active = true where id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  select * into r from public.beacon_changes where processed_at is null and entity_id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  perform ok(r.change = 'updated', 'paused then live again within one window is an update');

  update public.listings set title = 'Still paused' where id = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
  perform ok(not exists (select 1 from public.beacon_changes where entity_id = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2' and processed_at is null),
             'edits to something nobody can see are not announced');

  update public.car_fleet set status = 'retired' where id = '88888888-8888-8888-8888-888888888888';
  perform ok(exists (select 1 from public.beacon_changes where kind = 'car' and change = 'deactivated' and processed_at is null),
             'retiring a car is announced');

  delete from public.tours where id = 44;
  perform ok(exists (select 1 from public.beacon_changes where kind = 'tour' and entity_id = '44' and change = 'deleted' and processed_at is null),
             'deleting a published tour is announced, keyed by its numeric id');
end $$;

-- ── Claim and complete ────────────────────────────────────────────────
do $$
declare ids bigint[]; n int; again int;
begin
  select array_agg(id) into ids from public.beacon_claim(100);
  perform ok(array_length(ids, 1) >= 3, 'the pulse claims the open changes');
  select count(*) into again from public.beacon_claim(100);
  perform ok(again = 0, 'a second pulse running at the same time gets nothing');

  -- A new edit lands while the batch is in flight.
  update public.listings set price_night = 7000 where id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  n := public.beacon_complete(ids, '{"ok":true}');
  perform ok(exists (select 1 from public.beacon_changes where entity_id = '2d488e1a-3582-409f-ac3c-5f67adc90c74' and processed_at is null),
             'an edit that landed mid-flight stays open for the next pulse');
  perform ok(n = array_length(ids, 1) - 1, 'everything else in the batch is closed');
  perform ok((public.beacon_version() ->> 'v')::bigint > 0, 'the version moves');
end $$;

-- ── A broken feed never blocks a write ────────────────────────────────
alter table public.beacon_changes rename to beacon_changes_away;
do $$
begin
  insert into public.listings (title, type, city, price_night, status, is_active, service)
  values ('Booked anyway', 'apartment', 'Nairobi', 4000, 'active', true, 'stays');
  perform ok(true, 'a listing write succeeds even when the change feed is missing');
end $$;
alter table public.beacon_changes_away rename to beacon_changes;

-- ── Places and demand ─────────────────────────────────────────────────
do $$
declare p jsonb;
begin
  perform public.beacon_places_replace('[{"place":"kilimani","service":"stays","name":"Kilimani","count":2,"low_usd":40,"high_usd":55},
                                         {"place":"diani","service":"stays","count":0}]');
  p := public.beacon_places_public();
  perform ok(jsonb_array_length(p -> 'places') = 1, 'public supply lists only places with something for sale');
  perform public.beacon_places_replace('[{"place":"kilimani","service":"stays","count":3}]');
  perform ok((select count from public.beacon_places where place = 'kilimani') = 3, 'a refresh replaces the snapshot');

  insert into public.compass_events (visitor_id, type, place, service) values
    ('v1', 'search', 'diani', 'stays'), ('v1', 'search', 'diani', 'stays'), ('v2', 'entity_view', 'diani', 'stays'),
    ('v3', 'search', 'kilimani', 'stays');
  p := public.compass_demand(30);
  perform ok((p -> 0 ->> 'place') = 'diani' and (p -> 0 ->> 'people')::int = 2 and (p -> 0 ->> 'supply')::int = 0,
             'demand counts people, not clicks, and shows the supply gap');
end $$;

-- ── Operators only ────────────────────────────────────────────────────
do $$
begin
  begin
    perform public.admin_beacon_overview();
    perform ok(false, 'a non-operator is refused the search console');
  exception when insufficient_privilege then
    perform ok(true, 'a non-operator is refused the search console');
  end;
  perform set_config('test.admin', 'yes', false);
  perform ok(public.admin_beacon_overview() ? 'live', 'an operator gets the search console');
  perform ok(public.admin_compass_overview(30) ? 'demand', 'an operator gets the intelligence console');
  perform ok(public.admin_apa_overview(30) ? 'threads', 'an operator gets the APA console');
  perform ok((public.admin_growth_setting('growth.brand.gbp', 'done') ->> 'ok')::boolean, 'growth settings are writable');
  begin
    perform public.admin_growth_setting('payments.secret', 'x');
    perform ok(false, 'settings outside growth.* are refused');
  exception when others then
    perform ok(true, 'settings outside growth.* are refused');
  end;
  perform set_config('test.admin', '', false);
end $$;

-- ── The scheduler only calls out when there is work ───────────────────
do $$
declare n0 int; n1 int;
begin
  insert into cabana_ops.cron_config values ('beacon_pulse_url', 'https://cabana.africa/api/growth?op=pulse')
    on conflict (key) do nothing;
  update public.beacon_changes set processed_at = now() where processed_at is null;
  select count(*) into n0 from net.calls;
  perform cabana_ops.trigger_beacon_pulse(false);
  select count(*) into n1 from net.calls;
  perform ok(n1 = n0, 'an idle minute makes no HTTP call');
  perform cabana_ops.trigger_beacon_pulse(true);
  select count(*) into n1 from net.calls;
  perform ok(n1 = n0 + 1 and (select headers ->> 'Authorization' from net.calls order by id desc limit 1) = 'Bearer test-secret',
             'the hourly refresh calls out, authenticated with the cron secret');
end $$;

\echo '  growth engine SQL: all assertions passed'
