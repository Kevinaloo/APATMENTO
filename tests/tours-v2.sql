begin;
-- ═══════════════════════════════════════════════════════════════════
-- Cabana Tours v2, end to end, inside one transaction that is rolled
-- back (it ends by raising ALL_PASSED). Run with the Supabase SQL tool
-- after the five tours_v2 migrations. The runner replaces:
--   :host        an approved tour operator's owner (their operator id is :op)
--   :guest       another member
--   :other       a third member
--   :admin       an email in admin_users
-- ═══════════════════════════════════════════════════════════════════
create temp table t_ctx (k text primary key, v text) on commit drop;
grant all on t_ctx to authenticated;
insert into t_ctx values ('host', ':host'), ('guest', ':guest'), ('other', ':other'), ('admin', ':admin'), ('op', ':op');
create or replace function pg_temp.ctx(p text) returns text language sql as $$ select v from t_ctx where k = p $$;
create or replace function pg_temp.act(p text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.ctx(p), 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', pg_temp.ctx(p), true);
end $$;
create or replace function pg_temp.act_admin() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.ctx('host'), 'role', 'authenticated', 'email', pg_temp.ctx('admin'))::text, true);
  perform set_config('request.jwt.claim.sub', pg_temp.ctx('host'), true);
end $$;
-- the payment callback runs with no signed-in user at all
create or replace function pg_temp.act_system() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
grant execute on function pg_temp.ctx(text), pg_temp.act(text), pg_temp.act_admin(), pg_temp.act_system() to authenticated;

-- A Saturday at least a week out, the Tuesday after it, and a live tour
-- that runs on Saturdays only.
insert into t_ctx select 'sat', d::text from (
  select d::date d from generate_series((now() at time zone 'Africa/Nairobi')::date + 7,
                                        (now() at time zone 'Africa/Nairobi')::date + 14, interval '1 day') d
   where extract(isodow from d) = 6 limit 1) q;
insert into t_ctx select 'tue', (pg_temp.ctx('sat')::date + 3)::text;
insert into public.tours (operator_id, owner_id, title, summary, destination, category, days, duration_label, price_kes,
                          price_basis, deposit_pct, group_min, group_max, spots_total, schedule_type, departure_days,
                          departure_time, booking_cutoff_hours, status, cover_url)
values (pg_temp.ctx('op')::bigint, pg_temp.ctx('host')::uuid, 'Test Saturday Game Drive', 'Dawn drive', 'Nairobi National Park',
        'day-safari', 1, '6 hours', 10000, 'per_person', 30, 1, 8, 8, 'weekly', '["sat"]', '06:30', 48, 'published', null);
insert into t_ctx select 'tour', id::text from public.tours where title = 'Test Saturday Game Drive' order by id desc limit 1;

-- 1. the departure board sees Saturdays only, at 06:30 Nairobi
do $$ declare r record; n int := 0; begin
  for r in select * from public.tour_departures(30, pg_temp.ctx('tour')::bigint, 10) loop
    n := n + 1;
    assert extract(isodow from r.departs_on) = 6, 'weekly tour must only depart on Saturdays';
    assert to_char(r.departs_at at time zone 'Africa/Nairobi', 'HH24:MI') = '06:30', 'departure time';
    assert r.closes_at < r.departs_at, 'booking closes before departure';
    assert r.seats_left = 8, 'seats';
  end loop;
  assert n >= 2, 'expected several Saturdays in 30 days';
end $$;

-- 2. the traveller messages the guide about a Saturday
set local role authenticated;
select pg_temp.act('guest');
insert into t_ctx select 'conv', (public.cabana_chat_start_tour(pg_temp.ctx('tour')::bigint, pg_temp.ctx('sat')::date, 2))->>'id';
do $$ declare c public.chat_conversations; begin
  select * into c from public.chat_conversations where id = pg_temp.ctx('conv')::uuid;
  assert c.tour_id = pg_temp.ctx('tour')::bigint and c.listing_type = 'tour' and c.listing_id is null, 'tour conversation';
  assert c.host_id = pg_temp.ctx('host')::uuid and c.checkin = pg_temp.ctx('sat')::date and c.guests = 2, 'host and trip';
end $$;
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, 'Hi! Is the Saturday drive still on?');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, 'just call me on 0712 345 678');
-- starting twice returns the same conversation
do $$ begin
  assert (public.cabana_chat_start_tour(pg_temp.ctx('tour')::bigint, null, null))->>'id' = pg_temp.ctx('conv'), 'one conversation per tour and traveller';
  begin
    perform public.cabana_chat_set_tour_trip(pg_temp.ctx('conv')::uuid, pg_temp.ctx('tue')::date, 2);
    raise exception 'a Tuesday should be refused';
  exception when invalid_parameter_value then assert sqlerrm like '%does not run%', sqlerrm; end;
end $$;
select public.cabana_chat_set_tour_trip(pg_temp.ctx('conv')::uuid, pg_temp.ctx('sat')::date, 2);

-- 3. the guide: logistics pass, a redirect naming the company does not
select pg_temp.act('host');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('host')::uuid, 'Yes! Meet at the main gate at 6:30, bring a warm jacket.');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('host')::uuid, 'Or just come to our office and ask for Clave Travels');
do $$ begin
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'text'
            and content like '%Meet at the main gate%') = 1, 'meeting logistics must be delivered';
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'withheld') = 2,
         'phone and redirect withheld';
  assert exists (select 1 from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'withheld'
                   and content like '%arranging a tour outside Cabana%'), 'tour wording';
end $$;

-- 4. a private offer: refused on a day it does not run, above list, below 20%
do $$ begin
  begin perform public.cabana_chat_send_tour_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('tue')::date, 2, 8000, null, 48);
    raise exception 'tuesday offer should fail'; exception when invalid_parameter_value then null; end;
  begin perform public.cabana_chat_send_tour_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('sat')::date, 2, 12000, null, 48);
    raise exception 'above list should fail'; exception when invalid_parameter_value then assert sqlerrm like '%below your listed%', sqlerrm; end;
  begin perform public.cabana_chat_send_tour_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('sat')::date, 2, 1000, null, 48);
    raise exception '90 percent off should fail'; exception when invalid_parameter_value then assert sqlerrm like '%80%', sqlerrm; end;
  begin perform public.cabana_chat_send_tour_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('sat')::date, 2, 8000, 'call 0712345678', 48);
    raise exception 'a note with a number should fail'; exception when invalid_parameter_value then null; end;
end $$;
insert into t_ctx select 'offer', (public.cabana_chat_send_tour_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('sat')::date, 2, 8000, 'Small group price for you two.', 48))->>'offer_id';
do $$ begin
  assert exists (select 1 from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'offer'
                   and payload->>'offer_id' = pg_temp.ctx('offer')), 'offer card posted';
  assert (select total from public.tour_offers where id = pg_temp.ctx('offer')::uuid) = 16000, 'offer total';
end $$;

-- 5. booking: the old client reference is refused, a Tuesday is refused,
--    three people pay the list price, two get the offer
select pg_temp.act('guest');
do $$ begin
  begin
    insert into public.tour_bookings (tour_id, tour_date, num_people, contact_phone, payment_reference)
    values (pg_temp.ctx('tour')::int, pg_temp.ctx('sat')::date, 2, '254712345678', 'CT-ABC123-XYZ');
    raise exception 'the old CT- reference should be refused';
  exception when invalid_parameter_value then assert sqlerrm like '%payment reference%', sqlerrm; end;
  begin
    insert into public.tour_bookings (tour_id, tour_date, num_people, contact_phone, payment_reference)
    values (pg_temp.ctx('tour')::int, pg_temp.ctx('tue')::date, 2, '254712345678', 'TOUR-' || pg_temp.ctx('tour') || '-1790000000001');
    raise exception 'a Tuesday booking should be refused';
  exception when invalid_parameter_value then assert sqlerrm like '%does not run%', sqlerrm; end;
end $$;
insert into public.tour_bookings (tour_id, tour_date, num_people, contact_phone, payment_reference)
values (pg_temp.ctx('tour')::int, pg_temp.ctx('sat')::date, 3, '254712345678', 'TOUR-' || pg_temp.ctx('tour') || '-1790000000002');
insert into public.tour_bookings (tour_id, tour_date, num_people, contact_phone, payment_reference)
values (pg_temp.ctx('tour')::int, pg_temp.ctx('sat')::date, 2, '254712345678', 'TOUR-' || pg_temp.ctx('tour') || '-1790000000003');
do $$ declare a public.tour_bookings; b public.tour_bookings; begin
  select * into a from public.tour_bookings where payment_reference = 'TOUR-' || pg_temp.ctx('tour') || '-1790000000002';
  select * into b from public.tour_bookings where payment_reference = 'TOUR-' || pg_temp.ctx('tour') || '-1790000000003';
  assert a.tour_total = 30000 and a.grand_total = 9000 and a.offer_id is null, 'three people pay the list price, 30% deposit';
  assert b.tour_total = 16000 and b.grand_total = 4800 and b.offer_id = pg_temp.ctx('offer')::uuid, 'two people get the offer';
  assert b.host_id = pg_temp.ctx('host')::uuid and b.status = 'pending_payment', 'host and status set by the server';
end $$;
insert into t_ctx select 'booking', id::text from public.tour_bookings where payment_reference = 'TOUR-' || pg_temp.ctx('tour') || '-1790000000003';
-- a guest cannot mark their own booking paid
update public.tour_bookings set status = 'paid_pending_checkin', amount_paid = 16000 where id = pg_temp.ctx('booking')::uuid;
reset role;
do $$ begin
  assert (select status from public.tour_bookings where id = pg_temp.ctx('booking')::uuid) = 'pending_payment', 'status is not self-served';
  assert not cabana_private.chat_contact_allowed(pg_temp.ctx('host')::uuid, pg_temp.ctx('guest')::uuid), 'no contact before payment';
end $$;

-- 6. the deposit clears (as the payment callback does)
select pg_temp.act_system();
update public.tour_bookings set status = 'confirmed_balance_due', amount_paid = 4800 where id = pg_temp.ctx('booking')::uuid;
do $$ begin
  assert (select status from public.tour_offers where id = pg_temp.ctx('offer')::uuid) = 'accepted', 'offer accepted on payment';
  assert exists (select 1 from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'booking'
                   and content like 'Booking confirmed%'), 'booking line in the chat';
  assert cabana_private.chat_contact_allowed(pg_temp.ctx('host')::uuid, pg_temp.ctx('guest')::uuid), 'contact unlocks after a paid tour';
end $$;
set local role authenticated;
select pg_temp.act('guest');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, 'Great, my number is 0712 345 678 for the morning');
do $$ declare th jsonb; begin
  assert (select kind from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and sender_id = pg_temp.ctx('guest')::uuid
           order by created_at desc limit 1) = 'text', 'number allowed once paid';
  th := public.cabana_chat_thread(pg_temp.ctx('conv')::uuid);
  assert th->>'kind' = 'tour' and th->'tour'->>'title' = 'Test Saturday Game Drive', 'thread knows the tour';
  assert (th->'booking'->>'paid')::boolean and (th->>'contact_allowed')::boolean, 'thread booking';
  assert jsonb_array_length(th->'offers') = 1, 'thread offers';
end $$;

-- 7. the operator sees who booked; contact only on the paid one
select pg_temp.act('host');
do $$ declare j jsonb; paid jsonb; unpaid jsonb; begin
  j := public.tour_operator_bookings('upcoming');
  select e into paid from jsonb_array_elements(j) e where e->>'id' = pg_temp.ctx('booking');
  select e into unpaid from jsonb_array_elements(j) e where (e->>'people')::int = 3 and (e->>'tour_id')::bigint = pg_temp.ctx('tour')::bigint;
  assert paid->'contact'->>'phone' = '254712345678' and paid->>'host_code' like 'HOST-%', 'paid booking releases contact';
  assert unpaid->'contact' = 'null'::jsonb or unpaid->'contact' is null, 'unpaid booking hides contact';
  assert (select count(*) from jsonb_array_elements(public.cabana_chat_inbox(50)) e where e->>'tour_id' = pg_temp.ctx('tour')) = 1, 'host inbox';
end $$;
select pg_temp.act('other');
do $$ begin
  assert jsonb_array_length(public.tour_operator_bookings('all')) = 0, 'a stranger sees no bookings';
  begin perform public.cabana_chat_thread(pg_temp.ctx('conv')::uuid); raise exception 'stranger read a thread';
  exception when insufficient_privilege then null; end;
end $$;

-- 8. saves
select pg_temp.act('guest');
do $$ begin
  assert public.tour_saves_sync(array[pg_temp.ctx('tour')::bigint], '{}') = array[pg_temp.ctx('tour')::bigint], 'saved';
  assert (select saves from public.tour_popularity() where tour_id = pg_temp.ctx('tour')::bigint) = 1, 'popularity';
end $$;
select pg_temp.act('other');
do $$ begin
  assert (select count(*) from public.tour_saves where tour_id = pg_temp.ctx('tour')::bigint) = 0, 'saves are private';
end $$;

-- 9. the Spotlight: not for travellers; guarded creative; own media only
do $$ begin
  begin perform public.tour_spotlight_create('{"package":"week","media_kind":"youtube","media_url":"https://youtu.be/dQw4w9WgXcQ","headline":"Hello there"}');
    raise exception 'a traveller bought a Spotlight';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.act('host');
do $$ begin
  begin perform public.tour_spotlight_create(jsonb_build_object('package','week','media_kind','image',
      'media_url','https://example.com/a.jpg','headline','Dawn in the park'));
    raise exception 'a hotlinked image was accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.tour_spotlight_create(jsonb_build_object('package','week','media_kind','youtube',
      'media_url','https://youtu.be/dQw4w9WgXcQ','headline','Call 0712345678 to book now'));
    raise exception 'a phone number in the headline was accepted';
  exception when invalid_parameter_value then null; end;
end $$;
insert into t_ctx select 'spot', (public.tour_spotlight_create(jsonb_build_object('package','week','media_kind','youtube',
  'media_url','https://www.youtube.com/watch?v=dQw4w9WgXcQ','headline','Dawn in Nairobi National Park',
  'tour_id', pg_temp.ctx('tour'), 'accent', '#FFB020')))->>'id';
reset role;
insert into t_ctx select 'ref', payment_reference from public.tour_spotlights where id = pg_temp.ctx('spot')::uuid;
do $$ declare s public.tour_spotlights; begin
  select * into s from public.tour_spotlights where id = pg_temp.ctx('spot')::uuid;
  assert s.status = 'pending_payment' and s.grand_total = 7500 and s.payment_reference like 'SPOT-%' and s.media_url = 'dQw4w9WgXcQ', 'created';
end $$;

-- 10. the ledger row clears; the Spotlight settles itself; a payment path's
--     booking-shaped status is ignored
select pg_temp.act_system();
insert into public.booking_payments (booking_table, booking_ref, reference, amount, status, phone)
values ('tour_spotlights', pg_temp.ctx('ref'), pg_temp.ctx('ref') || '-P1', 7500, 'pending', '254712345678');
update public.booking_payments set status = 'paid', paid_at = now() where reference = pg_temp.ctx('ref') || '-P1';
update public.tour_spotlights set status = 'paid_pending_checkin' where payment_reference = pg_temp.ctx('ref');
do $$ declare s public.tour_spotlights; begin
  select * into s from public.tour_spotlights where id = pg_temp.ctx('spot')::uuid;
  assert s.status = 'in_review' and s.amount_paid = 7500 and s.paid_at is not null, 'settled into review: ' || s.status;
  assert exists (select 1 from public.notifications where user_id = pg_temp.ctx('host')::uuid and meta->>'spotlight_id' = s.id::text), 'buyer told';
end $$;

-- 11. the console approves; the slide leads the feed with its tour
set local role authenticated;
select pg_temp.act_admin();
select public.admin_tour_spotlight_decide(pg_temp.ctx('spot')::uuid, 'approve', null);
do $$ declare f jsonb; begin
  f := public.tour_spotlight_feed();
  assert f->0->>'id' = pg_temp.ctx('spot') and (f->0->>'sponsored')::boolean, 'sponsored first';
  assert f->0->'tour'->>'title' = 'Test Saturday Game Drive' and f->0->'tour'->>'next_departure' is not null, 'with its tour';
  perform public.tour_spotlight_track(pg_temp.ctx('spot')::uuid, 'view');
  perform public.tour_spotlight_track(pg_temp.ctx('spot')::uuid, 'click');
end $$;
reset role;
do $$ begin
  assert (select impressions from public.tour_spotlights where id = pg_temp.ctx('spot')::uuid) = 1, 'view counted';
end $$;

-- 12. a paid Spotlight the console refuses becomes credit, once
select pg_temp.act('host');
insert into t_ctx select 'spot2', (public.tour_spotlight_create(jsonb_build_object('package','day','media_kind','youtube',
  'media_url','dQw4w9WgXcQ','headline','Second film')))->>'id';
reset role;
insert into t_ctx select 'ref2', payment_reference from public.tour_spotlights where id = pg_temp.ctx('spot2')::uuid;
select pg_temp.act_system();
insert into public.booking_payments (booking_table, booking_ref, reference, amount, status, phone, paid_at)
values ('tour_spotlights', pg_temp.ctx('ref2'), pg_temp.ctx('ref2') || '-P1', 1500, 'paid', '254712345678', now());
set local role authenticated;
select pg_temp.act_admin();
select public.admin_tour_spotlight_decide(pg_temp.ctx('spot2')::uuid, 'reject', 'Please use a clearer film.');
reset role;
do $$ begin
  assert (select status from public.tour_spotlights where id = pg_temp.ctx('spot2')::uuid) = 'rejected', 'rejected';
  assert (select points from public.point_transactions where booking_ref = pg_temp.ctx('ref2') and type = 'earn') = 1500, 'credited';
  assert (select credited from public.tour_spotlights where id = pg_temp.ctx('spot2')::uuid) = 1500, 'credit recorded';
end $$;

do $$ begin raise exception 'ALL_PASSED'; end $$;
