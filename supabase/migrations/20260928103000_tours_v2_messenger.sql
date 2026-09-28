-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v2 · 4 of 5 · the messenger learns tours
-- ───────────────────────────────────────────────────────────────────
-- Travellers can now message the guide or operator behind a tour, in
-- the same guarded messenger stays use (chat.js, Messenger v7). Nothing
-- about the guard is loosened for tours; three things are tuned:
--
--   · Anchors. The redirect layer withholds "come to <this place> and
--     ask for <this name>". For a stay the place is the product and must
--     stay private until payment. For a tour the destination is a
--     national park anyone can drive to, and a meeting point is printed
--     on the listing. So a tour's anchors are the operator's and the
--     host's own names, not the destination: "meet at the Nairobi
--     National Park gate at 6" is logistics, "come to our office and ask
--     for Clave" is a bypass.
--   · Words. Notices say "tour" where they used to say "stay".
--   · Contact. A paid (or, for a free tour, reserved) tour booking
--     releases contact details between the two people, exactly as a paid
--     stay does, so a guide can call the traveller at a gate at dawn.
--
-- And the messenger gains what makes a tour conversation close:
--   · private tour offers: a price per person (or per group) for one
--     date and group size, for one traveller only, honoured by the SAME
--     booking trigger checkout trusts (cabana_secure_tour_booking);
--   · "Tour details" (date and group) the traveller shares;
--   · booking lines posted into the chat when a tour booking is paid or
--     cancelled, and the offer marked accepted.
--
-- The booking trigger also stops taking bookings for days a tour does
-- not run: a Saturday-only tour booked for a Tuesday used to go through.
-- ═══════════════════════════════════════════════════════════════════

-- ── 4a · a conversation can be about a tour ─────────────────────────
alter table public.chat_conversations
  add column if not exists tour_id bigint references public.tours(id) on delete set null;
create unique index if not exists chat_conversations_tour_guest_key
  on public.chat_conversations (tour_id, guest_id) where tour_id is not null;

-- ── 4b · private tour offers ────────────────────────────────────────
create table if not exists public.tour_offers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  tour_id         bigint not null references public.tours(id) on delete cascade,
  host_id         uuid not null,
  guest_id        uuid not null,
  tour_date       date not null,
  people          integer not null check (people between 1 and 200),
  price           numeric not null check (price > 0),
  list_price      numeric not null,
  price_basis     text not null default 'per_person',
  total           numeric not null,
  list_total      numeric not null,
  note            text,
  status          text not null default 'sent'
                  check (status in ('sent', 'accepted', 'declined', 'withdrawn', 'expired', 'superseded')),
  expires_at      timestamptz not null,
  message_id      uuid,
  booking_id      uuid,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create index if not exists tour_offers_lookup on public.tour_offers (tour_id, guest_id, tour_date, status);
create index if not exists tour_offers_conversation on public.tour_offers (conversation_id);
alter table public.tour_offers enable row level security;
drop policy if exists tour_offers_parties_read on public.tour_offers;
create policy tour_offers_parties_read on public.tour_offers for select to authenticated
  using ((select auth.uid()) in (host_id, guest_id));
revoke all on public.tour_offers from public, anon;
grant select on public.tour_offers to authenticated;
grant all on public.tour_offers to service_role;

alter table public.tour_bookings add column if not exists offer_id uuid;

-- ── 4c · contact unlocks after a paid tour too ──────────────────────
create or replace function cabana_private.chat_contact_allowed(p_host uuid, p_guest uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.apartment_bookings b
     where b.guest_id = p_guest and b.host_id = p_host and b.cancelled_at is null
       and b.status in ('paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
       and b.checkout_date >= (now() at time zone 'Africa/Nairobi')::date - 1)
  or exists (
    select 1 from public.tour_bookings b
     where b.guest_id = p_guest and b.host_id = p_host and b.cancelled_at is null
       and b.status in ('confirmed_balance_due','paid_pending_checkin','checked_in','confirmed','reserved')
       and b.tour_date >= (now() at time zone 'Africa/Nairobi')::date - 1)
$$;

-- ── 4d · the guard row: tour anchors and tour words ─────────────────
create or replace function cabana_private.chat_guard_row(m chat_messages)
returns chat_messages language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations%rowtype;
  l public.listings%rowtype;
  allowed boolean; g jsonb; hard text[]; prev text[]; prev_ids uuid[]; spans boolean := false;
  anchors text[] := '{}';
  strikes int; is_host boolean; redirect boolean; withheld text; cta text;
  noun text := 'stay';
begin
  if m.sender_id is distinct from auth.uid() then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;

  m.kind := 'text'; m.payload := null; m.visible_to := null; m.is_system := false;
  m.content_raw := null; m.was_scrubbed := false; m.flags := '{}';
  m.read_at := null; m.created_at := clock_timestamp();
  m.content := btrim(regexp_replace(coalesce(m.content, ''), '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'));
  if length(m.content) = 0 then raise exception 'Write a message first.' using errcode = '22023'; end if;
  if length(m.content) > 2000 then raise exception 'Messages can be up to 2,000 characters.' using errcode = '22023'; end if;

  select * into c from public.chat_conversations where id = m.conversation_id;
  if not found or m.sender_id not in (c.host_id, c.guest_id) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  if c.blocked_by is not null or c.status = 'blocked' then
    raise exception 'This conversation is closed.' using errcode = '42501';
  end if;

  if (select count(*) from public.chat_messages
       where sender_id = m.sender_id and created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.chat_messages
       where sender_id = m.sender_id and created_at > now() - interval '1 day') >= 500 then
    raise exception 'You are sending messages very quickly. Please wait a moment and try again.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if (select count(*) from public.chat_violations
       where user_id = m.sender_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Messaging is paused for a few hours after repeated attempts to share contact details. Our Trust team has been notified.'
      using errcode = 'P0001', hint = 'cooldown';
  end if;

  if c.tour_id is not null then
    noun := 'tour';
    anchors := cabana_private.guard_anchor_tokens(array[
      (select concat_ws(' ', o.name, o.slug) from public.tours t
         left join public.tour_operators o on o.id = t.operator_id where t.id = c.tour_id),
      (select concat_ws(' ', first_name, last_name) from public.profiles where id = c.host_id)
    ]);
  else
    select * into l from public.listings where id = c.listing_id;
    anchors := cabana_private.guard_anchor_tokens(array[
      coalesce(l.title, c.listing_title), l.area, l.street, l.location,
      (select concat_ws(' ', first_name, last_name) from public.profiles where id = c.host_id)
    ]);
  end if;

  allowed := cabana_private.chat_contact_allowed(c.host_id, c.guest_id);
  g := cabana_private.chat_guard(m.content, allowed, anchors);
  hard := array(select jsonb_array_elements_text(g->'hard'));

  select array_agg(content order by created_at), array_agg(id order by created_at)
    into prev, prev_ids
    from (select content, id, created_at from public.chat_messages
           where conversation_id = c.id and sender_id = m.sender_id and kind = 'text'
             and created_at > now() - interval '30 minutes'
           order by created_at desc limit 6) recent;
  if cardinality(hard) = 0 then
    spans := cabana_private.chat_guard_spans(prev, m.content, allowed);
    if spans then hard := array['phone']; end if;
  end if;

  if cardinality(hard) > 0 then
    is_host   := m.sender_id = c.host_id;
    redirect  := 'meetup' = any(hard) or 'rival' = any(hard);
    withheld  := case when redirect
      then 'Message withheld. It looked like it was arranging a ' || noun || ' outside Cabana, which leaves neither of you covered.'
      else 'Message withheld. It looked like it contained contact or payment details, which can only be shared once a booking is paid on Cabana.' end;

    m.content_raw := m.content;
    m.content := withheld;
    m.kind := 'withheld';
    m.was_scrubbed := true;
    m.flags := hard;
    if spans then
      update public.chat_messages
         set content_raw = coalesce(content_raw, content), content = withheld, kind = 'withheld',
             was_scrubbed = true, flags = array['phone']
       where id = any(prev_ids) and cabana_private.chat_guard_fragment(content) <> '';
    end if;
    insert into public.chat_violations (user_id, conversation_id, message_id, categories, excerpt)
    values (m.sender_id, c.id, m.id, hard, left(m.content_raw, 500));

    select count(*) into strikes from public.chat_violations
     where user_id = m.sender_id and created_at > now() - interval '30 days';

    cta := case when strikes >= 3 then null
                when is_host and redirect then 'offer'
                when is_host then 'offer'
                else 'book' end;

    insert into public.chat_messages (conversation_id, sender_id, content, kind, visible_to, is_system, created_at, payload)
    values (c.id, m.sender_id,
      case when strikes >= 3
        then 'Your messages keep trying to move this ' || noun || ' off Cabana, so this conversation has been sent to our Trust team for review. Everything you need can be arranged here, and once a booking is paid you can share a phone number for ' || case when noun = 'tour' then 'the day.' else 'arrival.' end
        when redirect and is_host
        then 'We withheld that message: asking a guest to come in person or book elsewhere before a booking is paid isn''t allowed, and it leaves your payout unprotected if they never turn up. If price is the sticking point, send this guest a private offer instead — you set it, and only they can see it.'
        when redirect and noun = 'tour'
        then 'We withheld that message: arranging to meet or book outside Cabana isn''t allowed. Paying outside Cabana isn''t covered if the tour goes wrong. Book here and your booking is protected, with the guide''s number unlocked once it is paid.'
        when redirect
        then 'We withheld that message: arranging to meet or book outside Cabana isn''t allowed. Paying outside Cabana isn''t covered if the stay goes wrong. Book here and your money is held until you check in.'
        else 'We withheld that message: ' || coalesce((select string_agg(r, ' ') from (select
            case x when 'phone' then 'phone numbers' when 'email' then 'email addresses' when 'link' then 'outside links'
                   when 'social' then 'social handles and messaging apps' when 'payment' then 'payment details'
                   when 'rival' then 'pointing somewhere else to book'
                   when 'meetup' then 'arranging to meet in person'
                   else 'arranging payment outside Cabana' end r from unnest(hard) x limit 1) s), 'contact details')
          || ' can''t be shared before a booking is paid. It keeps both of you protected: payments made outside Cabana aren''t covered.' end,
      'notice', m.sender_id, true, clock_timestamp() + interval '1 millisecond',
      jsonb_build_object('tone', case when strikes >= 3 then 'serious' else 'info' end,
                         'categories', to_jsonb(hard),
                         'action', cta));

    if strikes >= 3 then
      update public.chat_conversations
         set flagged_at = coalesce(flagged_at, now()), flag_reason = 'repeated_contact_attempts'
       where id = c.id;
      if strikes = 3 then
        insert into public.ops_alerts (kind, severity, title, body, meta)
        values ('chat_contact_attempts', 'warning',
          'Repeated off-platform attempts in chat',
          cabana_private.member_name(m.sender_id) || ' has had ' || strikes || ' messages withheld in 30 days.',
          jsonb_build_object('user_id', m.sender_id, 'conversation_id', c.id, 'categories', to_jsonb(hard)));
      end if;
    end if;
  else
    m.flags := array(select jsonb_array_elements_text(g->'soft'));
  end if;
  return m;
end $$;

-- ── 4e · start, trip details, offers, booking link ──────────────────
create or replace function public.cabana_chat_start_tour(p_tour bigint, p_date date default null, p_people integer default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare me uuid := auth.uid(); t public.tours%rowtype; host uuid; c public.chat_conversations%rowtype;
  today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if me is null then raise exception 'Sign in to message a guide.' using errcode = '42501'; end if;
  select * into t from public.tours where id = p_tour and status = 'published';
  if not found then raise exception 'This tour is not available to message.' using errcode = '22023'; end if;
  host := coalesce(t.owner_id, (select o.owner_id from public.tour_operators o where o.id = t.operator_id));
  if host is null then
    raise exception 'This tour is run by the Cabana team. Ask us in Cabana support and we will answer straight away.'
      using errcode = '22023', hint = 'house_tour';
  end if;
  if host = me then raise exception 'This is your own tour.' using errcode = '22023'; end if;

  select * into c from public.chat_conversations where tour_id = t.id and guest_id = me;
  if not found then
    if (select count(*) from public.chat_conversations where guest_id = me and created_at > now() - interval '24 hours') >= 25 then
      raise exception 'You have started a lot of conversations today. Please continue in your existing chats or try again tomorrow.'
        using errcode = 'P0001', hint = 'rate_limited';
    end if;
    insert into public.chat_conversations (listing_id, tour_id, listing_type, listing_title, host_id, guest_id, status)
    values (null, t.id, 'tour', left(coalesce(t.title, 'Tour'), 140), host, me, 'active')
    on conflict (tour_id, guest_id) where tour_id is not null do nothing;
    select * into c from public.chat_conversations where tour_id = t.id and guest_id = me;
  end if;

  if p_date is not null and p_date >= today and p_date <= today + 400 then
    update public.chat_conversations
       set checkin = p_date, checkout = null,
           guests = least(greatest(coalesce(p_people, guests, t.group_min, 1), 1), 200),
           guest_archived_at = null
     where id = c.id returning * into c;
  end if;
  return to_jsonb(c);
end $$;

create or replace function public.cabana_chat_set_tour_trip(p_conversation uuid, p_date date, p_people integer)
returns void language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare c public.chat_conversations := cabana_private.chat_mine(p_conversation); t public.tours%rowtype;
  today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if auth.uid() <> c.guest_id then raise exception 'Only the traveller can change the tour details.' using errcode = '42501'; end if;
  if c.tour_id is null then raise exception 'This conversation is not about a tour.' using errcode = '22023'; end if;
  if p_date is null or p_date < today or p_date > today + 400 or p_people is null or p_people not between 1 and 200 then
    raise exception 'Choose a valid date and group size.' using errcode = '22023';
  end if;
  select * into t from public.tours where id = c.tour_id;
  if t.id is not null and not cabana_private.tour_runs_on(t.schedule_type, t.next_departure, t.departure_days, p_date) then
    raise exception 'This tour does not run on that date. Pick one of its departures.' using errcode = '22023';
  end if;
  if c.checkin is not distinct from p_date and c.guests is not distinct from p_people then return; end if;
  update public.chat_conversations set checkin = p_date, checkout = null, guests = p_people where id = c.id;
  perform cabana_private.chat_post(c.id, c.guest_id, 'system',
    'Tour details: ' || to_char(p_date, 'FMDy FMDD Mon') || ' · ' || p_people || case when p_people = 1 then ' person' else ' people' end,
    jsonb_build_object('event', 'trip', 'date', p_date, 'people', p_people, 'kind', 'tour'));
end $$;

create or replace function public.cabana_chat_send_tour_offer(p_conversation uuid, p_date date, p_people integer,
  p_price numeric, p_note text default null, p_valid_hours integer default 48)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare
  c public.chat_conversations := cabana_private.chat_mine(p_conversation);
  t public.tours%rowtype; o public.tour_offers%rowtype;
  me uuid := auth.uid(); today date := (now() at time zone 'Africa/Nairobi')::date;
  v_list numeric; v_total numeric; v_list_total numeric; v_hours int; v_closes timestamptz; mid uuid; v_left int;
  v_min int; v_max int;
begin
  if me <> c.host_id then raise exception 'Only the guide can send an offer.' using errcode = '42501'; end if;
  if c.tour_id is null then raise exception 'Tour offers are for tour conversations.' using errcode = '22023'; end if;
  if c.blocked_by is not null then raise exception 'This conversation is closed.' using errcode = '42501'; end if;
  select * into t from public.tours where id = c.tour_id and status = 'published';
  if not found then raise exception 'This tour is not live, so it cannot take an offer.' using errcode = '22023'; end if;
  if p_date is null or p_date < today then raise exception 'Choose a date that has not passed.' using errcode = '22023'; end if;
  if not cabana_private.tour_runs_on(t.schedule_type, t.next_departure, t.departure_days, p_date) then
    raise exception 'This tour does not run on that date.' using errcode = '22023';
  end if;
  v_closes := (p_date::timestamp at time zone 'Africa/Nairobi') - make_interval(hours => coalesce(t.booking_cutoff_hours, 48));
  if v_closes <= now() then raise exception 'Bookings for that departure have already closed.' using errcode = '22023'; end if;
  v_min := greatest(coalesce(t.group_min, 1), 1); v_max := coalesce(t.group_max, 20);
  if p_people is null or p_people < v_min or p_people > v_max then
    raise exception 'Group size must be between % and %.', v_min, v_max using errcode = '22023';
  end if;
  v_left := public.cabana_seats_left('tour', t.id, p_date, '');
  if v_left < p_people then raise exception 'Only % seat(s) are left on that departure.', v_left using errcode = '22023'; end if;
  v_list := coalesce(t.price_kes, 0);
  if v_list <= 0 then raise exception 'This tour is free, so there is nothing to discount.' using errcode = '22023'; end if;
  if p_price is null or round(p_price) >= v_list then
    raise exception 'Offer a price below your listed KES %.', to_char(v_list, 'FM999,999,990') using errcode = '22023';
  end if;
  if round(p_price) < ceil(v_list * 0.2) then
    raise exception 'That is more than 80%% off. The lowest you can offer is KES %.', to_char(ceil(v_list * 0.2), 'FM999,999,990')
      using errcode = '22023';
  end if;
  perform cabana_private.chat_text_ok(p_note, c.host_id, c.guest_id);

  v_hours := least(greatest(coalesce(p_valid_hours, 48), 1), 168);
  v_total := case when t.price_basis = 'per_group' then round(p_price) else round(p_price) * p_people end;
  v_list_total := case when t.price_basis = 'per_group' then v_list else v_list * p_people end;

  update public.tour_offers set status = 'superseded', resolved_at = now()
   where conversation_id = c.id and status = 'sent';

  insert into public.tour_offers (conversation_id, tour_id, host_id, guest_id, tour_date, people, price, list_price,
                                  price_basis, total, list_total, note, expires_at)
  values (c.id, t.id, c.host_id, c.guest_id, p_date, p_people, round(p_price), v_list, t.price_basis, v_total, v_list_total,
          nullif(btrim(left(coalesce(p_note, ''), 500)), ''), least(now() + make_interval(hours => v_hours), v_closes))
  returning * into o;

  mid := cabana_private.chat_post(c.id, me, 'offer',
    'Special offer: KES ' || to_char(o.price, 'FM999,999,990')
      || case when t.price_basis = 'per_group' then ' per group' else ' per person' end
      || ' · ' || to_char(p_date, 'FMDy FMDD Mon') || ' · ' || p_people || case when p_people = 1 then ' person' else ' people' end,
    jsonb_build_object('offer_id', o.id, 'kind', 'tour', 'tour_id', t.id, 'title', t.title, 'date', p_date,
      'people', p_people, 'price', o.price, 'list_price', v_list, 'price_basis', t.price_basis,
      'total', v_total, 'list_total', v_list_total, 'deposit_pct', t.deposit_pct,
      'expires_at', o.expires_at, 'note', o.note));
  update public.tour_offers set message_id = mid where id = o.id;
  update public.chat_conversations set checkin = p_date, checkout = null, guests = p_people where id = c.id;
  return jsonb_build_object('ok', true, 'offer_id', o.id, 'expires_at', o.expires_at, 'total', v_total);
end $$;

create or replace function public.cabana_chat_tour_offer_respond(p_offer uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare o public.tour_offers%rowtype; me uuid := auth.uid();
begin
  select * into o from public.tour_offers where id = p_offer for update;
  if not found or me is null or me not in (o.host_id, o.guest_id) then
    raise exception 'Offer not found' using errcode = '42501';
  end if;
  if o.status <> 'sent' then return jsonb_build_object('ok', true, 'status', o.status); end if;
  if p_action = 'decline' and me = o.guest_id then
    update public.tour_offers set status = 'declined', resolved_at = now() where id = o.id;
    perform cabana_private.chat_post(o.conversation_id, me, 'system', 'Offer declined',
      jsonb_build_object('event', 'offer_declined', 'offer_id', o.id, 'kind', 'tour'));
  elsif p_action = 'withdraw' and me = o.host_id then
    update public.tour_offers set status = 'withdrawn', resolved_at = now() where id = o.id;
    perform cabana_private.chat_post(o.conversation_id, me, 'system', 'Offer withdrawn',
      jsonb_build_object('event', 'offer_withdrawn', 'offer_id', o.id, 'kind', 'tour'));
  else
    raise exception 'That is not something you can do with this offer.' using errcode = '42501';
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.cabana_chat_for_tour_booking(p_booking uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare me uuid := auth.uid(); b public.tour_bookings%rowtype; t public.tours%rowtype; cid uuid; host uuid;
begin
  select * into b from public.tour_bookings where id = p_booking;
  if b.id is null then raise exception 'Booking not found' using errcode = '42501'; end if;
  select * into t from public.tours where id = b.tour_id;
  host := coalesce(b.host_id, t.owner_id, (select o.owner_id from public.tour_operators o where o.id = t.operator_id));
  if me is null or me not in (b.guest_id, host) then raise exception 'Booking not found' using errcode = '42501'; end if;
  if host is null then
    raise exception 'This tour is run by the Cabana team. Ask us in Cabana support.' using errcode = '22023', hint = 'house_tour';
  end if;
  if b.guest_id is null or b.guest_id = host then raise exception 'This booking has no one to message.' using errcode = '22023'; end if;
  select id into cid from public.chat_conversations where tour_id = b.tour_id and guest_id = b.guest_id;
  if cid is null then
    insert into public.chat_conversations (listing_id, tour_id, listing_type, listing_title, host_id, guest_id, status, checkin, guests)
    values (null, b.tour_id, 'tour', left(coalesce(t.title, b.tour_name, 'Tour'), 140), host, b.guest_id, 'active', b.tour_date, b.num_people)
    on conflict (tour_id, guest_id) where tour_id is not null do nothing
    returning id into cid;
    if cid is null then select id into cid from public.chat_conversations where tour_id = b.tour_id and guest_id = b.guest_id; end if;
  else
    update public.chat_conversations set checkin = b.tour_date, checkout = null, guests = b.num_people
     where id = cid and checkin is distinct from b.tour_date;
  end if;
  return cid;
end $$;

-- ── 4f · inbox and thread know tours ────────────────────────────────
create or replace function public.cabana_chat_inbox(p_limit integer default 150)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(row order by (row->>'sort_at') desc nulls last), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', c.id, 'listing_id', c.listing_id, 'listing_title', c.listing_title, 'listing_type', c.listing_type,
      'tour_id', c.tour_id,
      'photo', coalesce(l.photos[1], tr.cover_url, tr.photos->>0),
      'role', case when c.host_id = auth.uid() then 'host' else 'guest' end,
      'counterpart', jsonb_build_object(
        'id', case when c.host_id = auth.uid() then c.guest_id else c.host_id end,
        'name', cabana_private.member_name(case when c.host_id = auth.uid() then c.guest_id else c.host_id end),
        'verified', coalesce((select verified from public.profiles where id = case when c.host_id = auth.uid() then c.guest_id else c.host_id end), false)),
      'last_message', c.last_message, 'last_message_at', c.last_message_at,
      'last_from_me', c.last_sender_id = auth.uid(),
      'unread', case when c.host_id = auth.uid() then c.host_unread else c.guest_unread end,
      'archived', case when c.host_id = auth.uid() then c.host_archived_at else c.guest_archived_at end is not null,
      'blocked', c.blocked_by is not null,
      'checkin', c.checkin, 'checkout', c.checkout, 'guests', c.guests,
      'booked', cabana_private.chat_contact_allowed(c.host_id, c.guest_id),
      'offer', case when c.tour_id is not null
                 then (select o.status from public.tour_offers o where o.conversation_id = c.id order by o.created_at desc limit 1)
                 else (select o.status from public.chat_offers o where o.conversation_id = c.id order by o.created_at desc limit 1) end,
      'sort_at', coalesce(c.last_message_at, c.created_at)) row
    from public.chat_conversations c
    left join public.listings l on l.id = c.listing_id
    left join public.tours tr on tr.id = c.tour_id
    where auth.uid() in (c.host_id, c.guest_id)
      and (c.last_message is not null or c.guest_id = auth.uid())
    order by coalesce(c.last_message_at, c.created_at) desc
    limit least(greatest(coalesce(p_limit, 150), 1), 300)) t
$$;

create or replace function public.cabana_chat_thread(p_conversation uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations := cabana_private.chat_mine(p_conversation);
  me uuid := auth.uid(); host boolean := auth.uid() = c.host_id; other uuid;
  l public.listings%rowtype; p public.profiles%rowtype; b public.apartment_bookings%rowtype; resp jsonb;
  stays int; hours numeric;
  tt public.tours%rowtype; op public.tour_operators%rowtype; tb public.tour_bookings%rowtype;
  tours_n int; trips int; today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  other := case when host then c.guest_id else c.host_id end;
  select * into p from public.profiles where id = other;

  if c.tour_id is not null then
    select * into tt from public.tours where id = c.tour_id;
    select * into op from public.tour_operators where id = tt.operator_id;
    select * into tb from public.tour_bookings
     where guest_id = c.guest_id and tour_id = c.tour_id and cancelled_at is null
       and status in ('pending_payment','part_paid','confirmed_balance_due','paid_pending_checkin','checked_in','confirmed','reserved')
       and tour_date >= today - 1
     order by (status not in ('pending_payment','part_paid')) desc, tour_date limit 1;
    if not host then resp := cabana_private.host_response(c.host_id); end if;
    select count(*) into trips from public.tour_bookings where guest_id = other and status = 'checked_in';
    select count(*) into tours_n from public.tours where owner_id = other and status = 'published';
    return jsonb_build_object(
      'conversation', to_jsonb(c) - 'flag_reason',
      'role', case when host then 'host' else 'guest' end,
      'kind', 'tour',
      'counterpart', jsonb_build_object('id', other, 'name', cabana_private.member_name(other),
        'verified', coalesce(p.verified, false), 'member_since', to_char(coalesce(p.created_at, now()), 'YYYY'),
        'stays', 0, 'trips', trips, 'listings', 0, 'tours', tours_n,
        'operator', case when not host and op.id is not null
                         then jsonb_build_object('name', op.name, 'verified', op.verified, 'persona', op.persona) end),
      'listing', null,
      'tour', case when tt.id is null then null else jsonb_build_object(
        'id', tt.id, 'title', tt.title, 'photo', coalesce(tt.cover_url, tt.photos->>0),
        'destination', coalesce(nullif(tt.destination, ''), tt.county),
        'price', tt.price_kes, 'price_basis', tt.price_basis, 'deposit_pct', tt.deposit_pct,
        'duration', coalesce(tt.duration_label, tt.days || case when tt.days = 1 then ' day' else ' days' end),
        'group_min', tt.group_min, 'group_max', tt.group_max, 'schedule', tt.schedule_type,
        'next_departure', tt.next_departure, 'departure_days', tt.departure_days, 'departure_time', tt.departure_time,
        'cutoff_hours', tt.booking_cutoff_hours, 'meeting_point', tt.meeting_point,
        'operator', op.name, 'operator_verified', coalesce(op.verified, false),
        'live', tt.status = 'published') end,
      'booking', case when tb.id is null then null else jsonb_build_object(
        'id', tb.id, 'kind', 'tour', 'status', tb.status, 'date', tb.tour_date, 'people', tb.num_people,
        'grand_total', tb.grand_total, 'tour_total', tb.tour_total, 'amount_paid', tb.amount_paid,
        'paid', tb.status in ('confirmed_balance_due','paid_pending_checkin','checked_in','confirmed','reserved')) end,
      'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id,
          'status', case when o.status = 'sent' and o.expires_at < now() then 'expired' else o.status end,
          'expires_at', o.expires_at, 'booking_id', o.booking_id) order by o.created_at)
        from public.tour_offers o where o.conversation_id = c.id), '[]'::jsonb),
      'contact_allowed', cabana_private.chat_contact_allowed(c.host_id, c.guest_id),
      'response', resp,
      'blocked_by_me', c.blocked_by = me,
      'blocked', c.blocked_by is not null);
  end if;

  select * into l from public.listings where id = c.listing_id;
  select * into b from public.apartment_bookings
   where guest_id = c.guest_id and (host_id = c.host_id or listing_id = c.listing_id) and cancelled_at is null
     and status in ('pending_payment','paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
     and checkout_date >= (now() at time zone 'Africa/Nairobi')::date - 1
   order by (status <> 'pending_payment') desc, checkin_date limit 1;
  if b.id is not null then
    hours := extract(epoch from ((b.checkin_date + coalesce(nullif(substring(l.checkin_time from '^\d{1,2}:\d{2}'), '')::time, time '14:00'))
               - (now() at time zone 'Africa/Nairobi'))) / 3600;
  end if;
  if not host then resp := cabana_private.host_response(c.host_id); end if;
  select count(*) into stays from public.apartment_bookings where guest_id = other and status = 'checked_in';

  return jsonb_build_object(
    'conversation', to_jsonb(c) - 'flag_reason',
    'role', case when host then 'host' else 'guest' end,
    'counterpart', jsonb_build_object('id', other, 'name', cabana_private.member_name(other),
      'verified', coalesce(p.verified, false), 'member_since', to_char(coalesce(p.created_at, now()), 'YYYY'),
      'stays', stays,
      'listings', (select count(*) from public.listings where partner_id = other and is_active and deleted_at is null)),
    'listing', case when l.id is null then null else jsonb_build_object('id', l.id, 'title', l.title, 'photo', l.photos[1],
      'area', coalesce(nullif(l.area, ''), l.location), 'city', l.city, 'price', coalesce(l.price_night, l.price_per_night),
      'currency', coalesce(nullif(l.currency, ''), 'KES'), 'rating', l.avg_rating, 'reviews', l.review_count,
      'checkin_time', l.checkin_time, 'checkout_time', l.checkout_time, 'min_nights', l.min_nights,
      'max_guests', cabana_private.int_or_null(l.max_guests), 'instant_book', l.instant_book, 'live', cabana_private.listing_bookable(l.id)) end,
    'booking', case when b.id is null then null else jsonb_build_object('id', b.id, 'status', b.status,
      'checkin', b.checkin_date, 'checkout', b.checkout_date, 'guests', b.num_guests, 'grand_total', b.grand_total,
      'amount_paid', b.amount_paid, 'hours_to_checkin', round(hours, 1),
      'paid', b.status <> 'pending_payment') end,
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'status',
        case when o.status = 'sent' and o.expires_at < now() then 'expired' else o.status end,
        'expires_at', o.expires_at, 'booking_id', o.booking_id) order by o.created_at)
      from public.chat_offers o where o.conversation_id = c.id), '[]'::jsonb),
    'contact_allowed', cabana_private.chat_contact_allowed(c.host_id, c.guest_id),
    'response', resp,
    'blocked_by_me', c.blocked_by = me,
    'blocked', c.blocked_by is not null);
end $$;

-- ── 4g · the recipient lands on the tours page for a tour chat ──────
create or replace function public.cabana_notify_chat_recipient()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, extensions, net, cabana_ops as $$
declare
  conversation public.chat_conversations%rowtype;
  recipient uuid;
  delivery_url text := 'https://cabana.africa/api/push-send?action=database-message';
  delivery_secret text;
  title text;
begin
  if new.is_system is true or new.visible_to is not null
     or new.kind not in ('text', 'offer', 'suggestion') then return new; end if;
  select * into conversation from public.chat_conversations where id = new.conversation_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = conversation.host_id then conversation.guest_id else conversation.host_id end;
  if recipient is null or recipient = new.sender_id then return new; end if;

  title := case new.kind
    when 'offer' then 'A special offer for ' || left(coalesce(conversation.listing_title,
                        case when conversation.tour_id is not null then 'your tour' else 'your stay' end), 80)
    when 'suggestion' then 'Your host suggested other stays'
    else cabana_private.member_name(new.sender_id) || ' · ' || left(coalesce(conversation.listing_title, 'Cabana'), 70) end;

  insert into public.notifications (user_id, title, body, url, kind, meta)
  select recipient, title,
         left(regexp_replace(coalesce(new.content, ''), '\s+', ' ', 'g'), 140),
         case when conversation.tour_id is not null then '/tours?inbox=1&c=' else '/dashboard.html?inbox=1&c=' end || conversation.id,
         'message',
         jsonb_build_object('message_id', new.id, 'conversation_id', conversation.id)
  where not exists (
    select 1 from public.notifications n
    where n.user_id = recipient and n.meta->>'message_id' = new.id::text
  );

  select value into delivery_secret from cabana_ops.cron_config where key = 'cron_secret';
  if delivery_secret is not null and delivery_secret <> '' then
    perform net.http_post(
      url := delivery_url,
      headers := jsonb_build_object('Authorization', 'Bearer ' || delivery_secret,
        'Content-Type', 'application/json', 'User-Agent', 'Cabana-Messaging/1.0'),
      body := jsonb_build_object('action', 'database-message', 'message_id', new.id),
      timeout_milliseconds := 15000
    );
  end if;
  return new;
end;
$$;

-- ── 4h · tour bookings speak in the conversation ────────────────────
create or replace function cabana_private.chat_tour_booking_events()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare
  paid text[] := array['confirmed_balance_due','paid_pending_checkin','checked_in','confirmed','reserved'];
  cid uuid;
  was_paid boolean := tg_op = 'UPDATE' and old.status = any(paid);
  is_paid boolean := new.status = any(paid);
begin
  select id into cid from public.chat_conversations where tour_id = new.tour_id and guest_id = new.guest_id;
  if is_paid and not was_paid then
    if new.offer_id is not null then
      update public.tour_offers set status = 'accepted', booking_id = new.id, resolved_at = now()
       where id = new.offer_id and status in ('sent', 'expired');
    end if;
    if cid is not null and new.status <> 'checked_in' then
      perform cabana_private.chat_post(cid, new.guest_id, 'booking',
        case when new.status = 'reserved' then 'Place reserved · ' else 'Booking confirmed · ' end
          || to_char(new.tour_date, 'FMDy FMDD Mon') || ' · ' || coalesce(new.num_people, 1)
          || case when coalesce(new.num_people, 1) = 1 then ' person' else ' people' end,
        jsonb_build_object('event', 'confirmed', 'kind', 'tour', 'booking_id', new.id, 'date', new.tour_date,
          'people', new.num_people, 'offer_id', new.offer_id));
    end if;
  elsif tg_op = 'UPDATE' and new.cancelled_at is not null and old.cancelled_at is null and was_paid and cid is not null then
    perform cabana_private.chat_post(cid, new.guest_id, 'booking',
      'Booking cancelled · ' || to_char(new.tour_date, 'FMDy FMDD Mon'),
      jsonb_build_object('event', 'cancelled', 'kind', 'tour', 'booking_id', new.id));
  end if;
  return new;
exception when others then
  raise warning 'chat_tour_booking_events: %', sqlerrm;
  return new;
end $$;
drop trigger if exists chat_tour_booking_events on public.tour_bookings;
create trigger chat_tour_booking_events
  after insert or update of status, cancelled_at on public.tour_bookings
  for each row execute function cabana_private.chat_tour_booking_events();

-- ── 4i · the booking guard: real departures, private offers ─────────
create or replace function public.cabana_secure_tour_booking()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare
  v_tour public.tours%rowtype;
  v_offer public.tour_offers%rowtype;
  v_total numeric; v_due numeric; v_due_at timestamptz; v_cutoff timestamptz;
  v_start timestamptz; v_left integer;
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_operator() then
      new.guest_id := old.guest_id; new.host_id := old.host_id;
      new.tour_id := old.tour_id; new.tour_total := old.tour_total;
      new.service_fee := old.service_fee; new.grand_total := old.grand_total;
      new.payment_reference := old.payment_reference; new.status := old.status;
      new.amount_paid := old.amount_paid; new.guest_code := old.guest_code;
      new.host_code := old.host_code; new.guest_verified := old.guest_verified;
      new.host_verified := old.host_verified; new.checked_in_at := old.checked_in_at;
      new.payment_due_at := old.payment_due_at; new.seats_held := old.seats_held;
      new.operator_balance := old.operator_balance; new.offer_id := old.offer_id;
    end if;
    return new;
  end if;

  select * into v_tour from public.tours where id = new.tour_id
    and status in ('active','approved','published') for share;
  if not found then raise exception 'Tour is not available' using errcode = '22023'; end if;
  if auth.uid() is not null then new.guest_id := auth.uid(); end if;
  if new.guest_id is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if new.tour_date is null or new.tour_date < (now() at time zone 'Africa/Nairobi')::date then
    raise exception 'Invalid tour date' using errcode = '22023';
  end if;
  if not cabana_private.tour_runs_on(v_tour.schedule_type, v_tour.next_departure, v_tour.departure_days, new.tour_date) then
    raise exception 'This tour does not run on %. Pick one of its departure dates.',
      to_char(new.tour_date, 'FMDy FMDD Mon YYYY') using errcode = '22023';
  end if;

  v_start  := (new.tour_date::timestamp at time zone 'Africa/Nairobi');
  v_cutoff := v_start - make_interval(hours => coalesce(v_tour.booking_cutoff_hours, 48));
  v_due_at := v_start - make_interval(hours => coalesce(v_tour.payment_due_hours, 72));

  if now() > v_cutoff then
    raise exception 'Bookings for this departure closed on %',
      to_char(v_cutoff at time zone 'Africa/Nairobi', 'DD Mon at HH24:MI')
      using errcode = '22023';
  end if;

  new.num_people := greatest(coalesce(new.num_people, 1), 1);
  if new.num_people < greatest(coalesce(v_tour.group_min, 1), 1)
     or new.num_people > coalesce(v_tour.group_max, 20) then
    raise exception 'Group size is not allowed' using errcode = '22023';
  end if;

  v_left := public.cabana_seats_left('tour', v_tour.id, new.tour_date, '');
  if v_left < new.num_people then
    raise exception 'Only % seat(s) left on this departure', v_left using errcode = '22023';
  end if;

  v_total := case when v_tour.price_basis = 'per_group' then v_tour.price_kes
                  else v_tour.price_kes * new.num_people end;

  -- A private offer for exactly this traveller, date and group size.
  new.offer_id := null;
  select * into v_offer from public.tour_offers o
   where o.tour_id = v_tour.id and o.guest_id = new.guest_id and o.tour_date = new.tour_date
     and o.people = new.num_people and o.status = 'sent' and o.expires_at > now()
   order by o.created_at desc limit 1;
  if found then
    v_total := case when v_tour.price_basis = 'per_group' then v_offer.price else v_offer.price * new.num_people end;
    new.offer_id := v_offer.id;
  end if;

  v_due := case when coalesce(v_tour.deposit_pct, 0) between 1 and 99
                then round(v_total * v_tour.deposit_pct / 100.0) else v_total end;

  if coalesce(new.payment_reference, '') !~ ('^TOUR-' || v_tour.id || '-[0-9]{10,16}$') then
    raise exception 'Invalid payment reference' using errcode = '22023';
  end if;

  new.host_id := coalesce(v_tour.owner_id, (select o.owner_id from public.tour_operators o where o.id = v_tour.operator_id));
  new.tour_name := v_tour.title;
  new.operator_name := coalesce((select o.name from public.tour_operators o where o.id = v_tour.operator_id), new.operator_name);
  new.tour_total := v_total; new.service_fee := 0;
  new.grand_total := v_due;
  new.operator_balance := greatest(0, v_total - v_due);
  new.payment_due_at := greatest(v_due_at, now() + interval '30 minutes');
  new.seats_held := 0;
  new.amount_paid := 0;
  new.status := case when v_due = 0 then 'reserved' else 'pending_payment' end;
  new.guest_code := 'GUEST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.host_code  := 'HOST-'  || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.guest_verified := false; new.host_verified := false; new.checked_in_at := null;
  return new;
end;
$$;

-- ── 4j · an operator's own bookings ─────────────────────────────────
create or replace function public.tour_operator_bookings(p_scope text default 'upcoming')
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
declare
  me uuid := auth.uid();
  paid text[] := array['confirmed_balance_due', 'paid_pending_checkin', 'checked_in', 'confirmed', 'reserved'];
  today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if me is null then raise exception 'Sign in to see your bookings.' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(row order by (row->>'tour_date') asc, row->>'created_at')
      from (
        select jsonb_build_object(
          'id', b.id, 'tour_id', b.tour_id, 'tour', coalesce(t.title, b.tour_name),
          'cover', coalesce(t.cover_url, t.photos->>0),
          'tour_date', b.tour_date, 'people', b.num_people, 'status', b.status,
          'paid', b.status = any(paid) and b.cancelled_at is null,
          'cancelled', b.cancelled_at is not null,
          'tour_total', b.tour_total, 'grand_total', b.grand_total, 'amount_paid', b.amount_paid,
          'balance_on_day', b.operator_balance, 'created_at', b.created_at,
          'guest', jsonb_build_object('id', b.guest_id, 'name', cabana_private.member_name(b.guest_id)),
          'contact', case when b.status = any(paid) and b.cancelled_at is null
                          then jsonb_build_object('phone', b.contact_phone, 'whatsapp', b.contact_whatsapp, 'email', b.contact_email)
                          end,
          'host_code', case when b.status = any(paid) and b.cancelled_at is null then b.host_code end,
          'conversation', (select c.id from public.chat_conversations c
                            where c.tour_id = b.tour_id and c.guest_id = b.guest_id limit 1)
        ) as row
          from public.tour_bookings b
          join public.tours t on t.id = b.tour_id
         where (b.host_id = me or t.owner_id = me)
           and case coalesce(p_scope, 'upcoming')
                 when 'upcoming' then b.tour_date >= today - 1 and b.cancelled_at is null
                 when 'past' then b.tour_date < today - 1 or b.cancelled_at is not null
                 else true end
         limit 400
      ) q), '[]'::jsonb);
end $$;

-- ── grants ──────────────────────────────────────────────────────────
revoke all on function public.cabana_chat_start_tour(bigint, date, integer) from public, anon;
revoke all on function public.cabana_chat_set_tour_trip(uuid, date, integer) from public, anon;
revoke all on function public.cabana_chat_send_tour_offer(uuid, date, integer, numeric, text, integer) from public, anon;
revoke all on function public.cabana_chat_tour_offer_respond(uuid, text) from public, anon;
revoke all on function public.cabana_chat_for_tour_booking(uuid) from public, anon;
revoke all on function public.tour_operator_bookings(text) from public, anon;
grant execute on function public.cabana_chat_start_tour(bigint, date, integer) to authenticated;
grant execute on function public.cabana_chat_set_tour_trip(uuid, date, integer) to authenticated;
grant execute on function public.cabana_chat_send_tour_offer(uuid, date, integer, numeric, text, integer) to authenticated;
grant execute on function public.cabana_chat_tour_offer_respond(uuid, text) to authenticated;
grant execute on function public.cabana_chat_for_tour_booking(uuid) to authenticated;
grant execute on function public.tour_operator_bookings(text) to authenticated;

notify pgrst, 'reload schema';
