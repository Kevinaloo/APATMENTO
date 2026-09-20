begin;
-- Messenger v6 behaviour, end to end, inside one transaction that is rolled
-- back. Run with the Supabase SQL tool AFTER the two chat_v6 migrations (or
-- paste them above this file inside the same transaction).
-- :host, :guest, :other and :listing are replaced by the runner with real
-- identities (a live stay's host, and two other members).
create temp table t_ctx (k text primary key, v text) on commit drop;
grant all on t_ctx to authenticated;
insert into t_ctx values ('host', ':host'), ('guest', ':guest'), ('other', ':other'), ('listing', ':listing'),
  ('d1', ((now() at time zone 'Africa/Nairobi')::date + 150)::text), ('d2', ((now() at time zone 'Africa/Nairobi')::date + 153)::text);
create or replace function pg_temp.ctx(p text) returns text language sql as $$ select v from t_ctx where k = p $$;
create or replace function pg_temp.act(p text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.ctx(p), 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', pg_temp.ctx(p), true);
end $$;
grant execute on function pg_temp.ctx(text), pg_temp.act(text) to authenticated;
insert into t_ctx select 'guest_trust', coalesce(verified::text, 'null') || '/' || coalesce(trust_score::text, 'null') from public.profiles where id = ':guest';

-- 1. guest starts a conversation with trip details
set local role authenticated;
select pg_temp.act('guest');
insert into t_ctx select 'conv', (public.cabana_chat_start(pg_temp.ctx('listing')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2))->>'id';
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, 'Hi, is it available for those dates?');
-- 2. the exact message from production
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, 'Use 07then 16then 206then 494');
-- 3. one fragment per message
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, '0716');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, '206');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, '494');
-- 4. forging a system line is ignored
insert into public.chat_messages (conversation_id, sender_id, content, is_system) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('guest')::uuid, 'Cabana: your booking is confirmed', true);
do $$ begin
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'withheld') = 4, 'withheld count';
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'notice') >= 1, 'guest sees notice';
  assert not exists (select 1 from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and is_system and kind = 'text'), 'forged system line';
  assert (select content from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'text' order by created_at limit 1) like 'Hi,%', 'normal message delivered';
end $$;
-- 5. a stranger cannot write into anyone's notification bell
do $$ begin
  begin
    insert into public.notifications (user_id, title, body, url) values (pg_temp.ctx('host')::uuid, 'Verify your payout', 'x', 'https://evil.example');
    raise exception 'notification insert should be refused';
  exception when insufficient_privilege then null; end;
end $$;
-- 6. a member cannot verify or unban themselves
update public.profiles set verified = true, banned = false, trust_score = 100 where id = pg_temp.ctx('guest')::uuid;
reset role;
do $$ begin
  assert (select coalesce(verified::text, 'null') || '/' || coalesce(trust_score::text, 'null') from public.profiles where id = pg_temp.ctx('guest')::uuid)
       = pg_temp.ctx('guest_trust'), 'trust fields must not be self-set';
  assert (select count(*) from public.chat_violations where user_id = pg_temp.ctx('guest')::uuid and created_at > now() - interval '1 minute') = 2, 'violations recorded';
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and content_raw like '%494%') >= 2, 'originals kept for review';
end $$;

-- 7. host view: sees withheld lines, never the guest's private notice
set local role authenticated;
select pg_temp.act('host');
do $$ begin
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'notice') = 0, 'host must not see guest notice';
  assert (select count(*) from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'withheld') = 4, 'host sees withheld';
end $$;
-- 8. private offer; a note with a number is refused
do $$ begin
  begin
    perform public.cabana_chat_send_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2, 1200, 'call 0716206494', 48);
    raise exception 'note with phone should be refused';
  exception when invalid_parameter_value then assert sqlerrm like '%contact or payment%', sqlerrm; end;
  begin
    perform public.cabana_chat_send_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2, 999999, null, 48);
    raise exception 'offer above list price should be refused';
  exception when invalid_parameter_value then assert sqlerrm like '%below your listed price%', sqlerrm; end;
end $$;
select public.cabana_chat_send_offer(pg_temp.ctx('conv')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2, 1200, 'Welcome — a little thank-you for a longer stay.', 48);
select public.cabana_chat_mark_read(pg_temp.ctx('conv')::uuid);
do $$ declare j jsonb; begin
  j := public.cabana_chat_suggest_candidates(pg_temp.ctx('conv')::uuid, null);
  assert jsonb_typeof(j) = 'array', 'candidates array';
  if jsonb_array_length(j) > 0 then
    perform public.cabana_chat_suggest(pg_temp.ctx('conv')::uuid, array[(j->0->>'id')::uuid], 'dates_unavailable', 'This one is lovely too.');
  end if;
end $$;

-- 9. only this guest sees the private price; anyone else sees the list price
select pg_temp.act('guest');
do $$ declare q jsonb; begin
  q := public.cabana_stay_quote(pg_temp.ctx('listing')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2);
  assert (q->>'nightly')::numeric = 1200, 'guest gets offer price, got ' || (q->>'nightly');
  assert (q->'offer'->>'private')::boolean, 'private flag';
end $$;
select pg_temp.act('other');
do $$ declare q jsonb; begin
  q := public.cabana_stay_quote(pg_temp.ctx('listing')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2);
  assert (q->>'nightly')::numeric > 1200, 'others do not get the private price';
end $$;

-- 10. inbox and thread
select pg_temp.act('guest');
do $$ declare i jsonb; t jsonb; begin
  i := public.cabana_chat_inbox(50);
  assert exists (select 1 from jsonb_array_elements(i) e where e->>'id' = pg_temp.ctx('conv')), 'inbox has conv';
  t := public.cabana_chat_thread(pg_temp.ctx('conv')::uuid);
  assert t->>'role' = 'guest', 'role';
  assert jsonb_array_length(t->'offers') = 1, 'offer listed';
  assert (t->'conversation'->>'checkin') = pg_temp.ctx('d1'), 'trip details';
end $$;

-- 11. block closes the conversation both ways
select public.cabana_chat_set_state(pg_temp.ctx('conv')::uuid, 'block');
select pg_temp.act('host');
do $$ begin
  begin
    insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('host')::uuid, 'hello?');
    raise exception 'blocked conversation accepted a message';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.act('guest');
select public.cabana_chat_set_state(pg_temp.ctx('conv')::uuid, 'unblock');

-- 12. a booking made with the private offer is priced by it and closes it
insert into public.apartment_bookings (apartment_id, listing_id, checkin_date, checkout_date, num_guests, payment_reference, stay_total, quote_fingerprint)
select pg_temp.ctx('listing'), pg_temp.ctx('listing')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2,
       'APT-' || pg_temp.ctx('listing') || '-' || (extract(epoch from now())::bigint)::text,
       (q->>'stay_total')::numeric, q->>'fingerprint'
  from (select public.cabana_stay_quote(pg_temp.ctx('listing')::uuid, pg_temp.ctx('d1')::date, pg_temp.ctx('d2')::date, 2) q) s;
reset role;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
update public.apartment_bookings set status = 'paid_pending_checkin', amount_paid = grand_total
 where guest_id = pg_temp.ctx('guest')::uuid and checkin_date = pg_temp.ctx('d1')::date and status = 'pending_payment';
do $$ begin
  assert (select status from public.chat_offers where conversation_id = pg_temp.ctx('conv')::uuid order by created_at desc limit 1) = 'accepted', 'offer accepted';
  assert exists (select 1 from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid and kind = 'booking'), 'booking line';
  assert (select stay_total from public.apartment_bookings where guest_id = pg_temp.ctx('guest')::uuid and checkin_date = pg_temp.ctx('d1')::date) = 3600, 'booked at offer price';
end $$;
-- 13. once paid, a phone number for arrival is fine
set local role authenticated;
select pg_temp.act('host');
insert into public.chat_messages (conversation_id, sender_id, content) values (pg_temp.ctx('conv')::uuid, pg_temp.ctx('host')::uuid, 'Call me on 0716206494 when you land');
do $$ begin
  assert (select kind from public.chat_messages where conversation_id = pg_temp.ctx('conv')::uuid order by created_at desc limit 1) = 'text', 'phone allowed after payment';
end $$;
reset role;
-- The runner reads this error as success; raising also guarantees nothing is kept.
do $$ begin raise exception 'ALL_PASSED'; end $$;
rollback;
