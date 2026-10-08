-- ═══════════════════════════════════════════════════════════════════════
-- CABANA · ONE PRICE FOR GUESTS, A FAIR DAY PASS, CODES PEOPLE CAN SAY
-- ───────────────────────────────────────────────────────────────────────
-- 1. ALL-IN PRICES. Guests now see one price everywhere, with Cabana's
--    facilitation already inside it, and never a fee line. For that to be
--    true at checkout the fee has to be charged the way it is shown: per
--    unit. "KES 4,800 a night" must mean three nights cost KES 14,400.
--      stays           per night         (stay_quote, chat offers, Match)
--      hotels          per room-night    (hotel_quote)
--      day passes      per pass          (unchanged: one unit)
--      tours           per person, or per group on a group price
--      events          per ticket
--      car hire        per day
--    The schedule itself (cabana_private.fee_bands) is unchanged and still
--    internal. Each unit is banded on its own price.
--    public.cabana_all_in_prices() answers "what does a guest see for
--    these host prices" in one call, so a page of listings costs one round
--    trip. Like cabana_fee_quote() it returns numbers, never the schedule.
--
-- 2. DAY PASS. A day pass must be at least 20% cheaper than a night, so
--    the Day Pass badge always means a real saving. Passes already live
--    above that line are paused and their hosts told why.
--
-- 3. CHECK-IN CODES. Four digits, said out loud at a door, instead of
--    GUEST-1A2B3C4D. Short codes need a lock: six wrong tries freeze
--    check-in on that booking until the team looks (api/lib/_verify-checkin.js).
--    Existing bookings keep their codes; the old format still verifies.
--
-- 4. VERIFIED HOSTS RANK HIGHER. listings.host_verified mirrors the host's
--    identity check and feeds the stays ranking, so the listing form's
--    promise ("verified hosts rank higher") is true.
--
-- 5. VIDEO EVIDENCE. A guest reporting a problem can attach a short live
--    video as well as a photo.
--
-- Every function rewrite below is a guarded text patch: if a function has
-- changed shape since this was written, the migration stops rather than
-- guessing.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · per-unit facilitation ─────────────────────────────────────────
create or replace function cabana_private.facilitation_fee_units(p_service text, p_total numeric, p_units numeric)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, cabana_private
as $$
  select case
    when p_total is null or p_total <= 0 then 0::numeric
    else greatest(1, round(coalesce(p_units, 1)))::numeric
         * cabana_private.facilitation_fee(p_service, round(p_total / greatest(1, round(coalesce(p_units, 1))), 2))
  end
$$;
revoke all on function cabana_private.facilitation_fee_units(text, numeric, numeric) from public, anon, authenticated;

create or replace function public.cabana_all_in_prices(p_service text, p_amounts numeric[])
returns numeric[]
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(array_agg(t.a + cabana_private.facilitation_fee(t.svc, t.a) order by t.ord), '{}'::numeric[])
    from (
      select least(greatest(coalesce(u.x, 0), 0), 100000000) as a, u.ord,
             case lower(coalesce(p_service, ''))
               when 'hotel' then 'stays' when 'day_pass' then 'stays' when 'daypass' then 'stays'
               when 'apartment' then 'stays' when 'tour' then 'tours' when 'event' then 'events'
               when 'car' then 'carhire' when 'car_hire' then 'carhire'
               else lower(coalesce(p_service, '')) end as svc
        from unnest((coalesce(p_amounts, '{}'::numeric[]))[1:300]) with ordinality as u(x, ord)
    ) t
$$;
revoke all on function public.cabana_all_in_prices(text, numeric[]) from public;
grant execute on function public.cabana_all_in_prices(text, numeric[]) to anon, authenticated;
comment on function public.cabana_all_in_prices(text, numeric[]) is
  'Guest-facing all-in unit prices for a list of host prices: price + facilitation on that unit. Numbers only; the schedule stays private.';

do $$
declare
  r record; d text; p text; i integer;
  patches text[][] := array[
    -- stays: per night
    array['cabana_private.stay_quote(uuid,date,date,integer)',
          'fee:=cabana_private.facilitation_fee(''stays'',best);',
          'fee:=cabana_private.facilitation_fee_units(''stays'',best,n);'],
    array['cabana_private.stay_quote(uuid,date,date,integer)',
          'original_fee:=cabana_private.facilitation_fee(''stays'',(chosen->>''reference_total'')::numeric);',
          'original_fee:=cabana_private.facilitation_fee_units(''stays'',(chosen->>''reference_total'')::numeric,n);'],
    -- hotels: per room-night
    array['cabana_private.hotel_quote(uuid,date,date,jsonb,text)',
          'fee := cabana_private.facilitation_fee(''stays'', total);',
          'fee := cabana_private.facilitation_fee_units(''stays'', total, greatest(rooms_n, 1) * n);'],
    -- a host's private offer in chat: per night
    array['public.cabana_chat_send_offer(uuid,date,date,integer,numeric,text,integer)',
          'fee := cabana_private.facilitation_fee(''stays'', total);',
          'fee := cabana_private.facilitation_fee_units(''stays'', total, n);'],
    -- Cabana Match: per night
    array['public.cabana_match_respond(uuid,uuid,numeric,text)',
          'cabana_private.facilitation_fee(''stays'', total)',
          'cabana_private.facilitation_fee_units(''stays'', total, r.nights)'],
    array['public.cabana_match_state(uuid)',
          'cabana_private.facilitation_fee(''stays'', coalesce(x.stay_total, 0))',
          'cabana_private.facilitation_fee_units(''stays'', coalesce(x.stay_total, 0), coalesce(x.nights, r.nights))'],
    -- tours: per person, or per group on a group price
    array['public.cabana_secure_tour_booking()',
          'cabana_private.facilitation_fee(''tours'', v_total)',
          'cabana_private.facilitation_fee_units(''tours'', v_total, case when v_tour.price_basis = ''per_group'' then 1 else new.num_people end)'],
    -- events: per ticket
    array['public.cabana_secure_event_booking()',
          'cabana_private.facilitation_fee(''events'', new.ticket_total)',
          'cabana_private.facilitation_fee_units(''events'', new.ticket_total, new.quantity)'],
    -- car hire: per day, on the booking and on the quote
    array['cabana_private.car_booking_fee()',
          'new.service_fee := cabana_private.facilitation_fee(''carhire'', v_kes);',
          'new.service_fee := cabana_private.facilitation_fee_units(''carhire'', v_kes, greatest(1, ceil(extract(epoch from (new.return_at - new.pickup_at)) / 86400.0)));'],
    array['public.car_price(public.car_fleet,public.car_operators,timestamptz,timestamptz,jsonb)',
          'cabana_private.facilitation_fee(''carhire'', (v_base - v_disc + v_chauf + v_deliv + v_extras) / 100.0)',
          'cabana_private.facilitation_fee_units(''carhire'', (v_base - v_disc + v_chauf + v_deliv + v_extras) / 100.0, greatest(1, v_days))']
  ];
begin
  for i in 1 .. array_length(patches, 1) loop
    d := pg_get_functiondef(patches[i][1]::regprocedure);
    if position(patches[i][3] in d) > 0 then continue; end if;   -- already applied
    if position(patches[i][2] in d) = 0 then
      raise exception 'all-in fees: % changed shape; patch "%" by hand', patches[i][1], patches[i][2];
    end if;
    p := replace(d, patches[i][2], patches[i][3]);
    execute p;
  end loop;
end $$;

-- ── 2 · the day pass is a real saving ─────────────────────────────────
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('cabana_private.listing_day_pass_rules()'::regprocedure);
  if position('20% cheaper' in d) > 0 then return; end if;
  p := replace(d,
    $x$when v_night is not null and new.day_pass_price >= v_night then 'A day pass has to cost less than a night here.'$x$,
    $x$when v_night is not null and new.day_pass_price > floor(v_night * 0.8) then 'A day pass must be at least 20% cheaper than a night here.'$x$);
  if p = d then raise exception 'listing_day_pass_rules changed shape; patch the 20%% rule by hand'; end if;
  execute p;
end $$;

-- Passes already priced too close to a night are paused, and the host is
-- told, rather than left showing a badge that promises a saving.
with paused as (
  update public.listings l
     set day_pass_enabled = false
   where l.day_pass_enabled
     and coalesce(l.price_night, l.price_per_night) > 0
     and l.day_pass_price > floor(coalesce(l.price_night, l.price_per_night) * 0.8)
  returning l.id, coalesce(l.partner_id, l.host_id) as owner, l.title,
            floor(coalesce(l.price_night, l.price_per_night) * 0.8) as max_price
)
insert into public.notifications (user_id, title, body, url, kind, meta)
select owner, 'Your day pass is paused',
       'Day passes now have to be at least 20% cheaper than a night, so the Day Pass badge always means a real saving. Set "'
         || coalesce(title, 'your stay') || '" at KES ' || to_char(max_price, 'FM999,999,999') || ' or less to switch it back on.',
       '/partner-listings.html', 'listing', jsonb_build_object('listing_id', id, 'reason', 'day_pass_min_discount')
  from paused where owner is not null;

-- ── 3 · four-digit check-in codes ─────────────────────────────────────
create or replace function cabana_private.checkin_code(p_avoid text default null)
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions
as $$
declare c text;
begin
  loop
    c := lpad((((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 10000))::text, 4, '0');
    exit when p_avoid is null or c is distinct from p_avoid;
  end loop;
  return c;
end $$;
revoke all on function cabana_private.checkin_code(text) from public, anon, authenticated;

do $$
declare
  fns text[] := array['public.cabana_secure_apartment_booking()', 'public.cabana_secure_tour_booking()', 'public.cabana_secure_event_booking()'];
  f text; d text; p text;
begin
  foreach f in array fns loop
    d := pg_get_functiondef(f::regprocedure);
    if position('cabana_private.checkin_code(' in d) > 0 then continue; end if;
    p := regexp_replace(d,
      $r$'GUEST-'\s*\|\|\s*upper\(substr\(encode\(extensions\.gen_random_bytes\(8\),\s*'hex'\),\s*1,\s*8\)\)$r$,
      'cabana_private.checkin_code()', 'g');
    p := regexp_replace(p,
      $r$'HOST-'\s*\|\|\s*upper\(substr\(encode\(extensions\.gen_random_bytes\(8\),\s*'hex'\),\s*1,\s*8\)\)$r$,
      'cabana_private.checkin_code(new.guest_code)', 'g');
    if p = d or position('GUEST-''' in p) > 0 or position('''HOST-''' in p) > 0 then
      raise exception 'check-in codes: % changed shape; patch the code generator by hand', f;
    end if;
    execute p;
  end loop;
end $$;

-- A short code needs a lock on guessing it.
alter table public.apartment_bookings add column if not exists checkin_attempts integer not null default 0,
                                      add column if not exists checkin_locked_at timestamptz;
alter table public.tour_bookings      add column if not exists checkin_attempts integer not null default 0,
                                      add column if not exists checkin_locked_at timestamptz;
alter table public.event_tickets      add column if not exists checkin_attempts integer not null default 0,
                                      add column if not exists checkin_locked_at timestamptz;

create or replace function cabana_private.protect_checkin_attempts()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Only the server (service role) and operators move the counter.
  if auth.uid() is not null and not coalesce(public.is_operator(), false) then
    new.checkin_attempts := old.checkin_attempts;
    new.checkin_locked_at := old.checkin_locked_at;
  end if;
  return new;
end $$;
revoke all on function cabana_private.protect_checkin_attempts() from public, anon, authenticated;
create or replace trigger cabana_protect_checkin_attempts before update of checkin_attempts, checkin_locked_at on public.apartment_bookings
  for each row execute function cabana_private.protect_checkin_attempts();
create or replace trigger cabana_protect_checkin_attempts before update of checkin_attempts, checkin_locked_at on public.tour_bookings
  for each row execute function cabana_private.protect_checkin_attempts();
create or replace trigger cabana_protect_checkin_attempts before update of checkin_attempts, checkin_locked_at on public.event_tickets
  for each row execute function cabana_private.protect_checkin_attempts();

-- ── 4 · verified hosts rank higher ────────────────────────────────────
alter table public.listings add column if not exists host_verified boolean not null default false;
create index if not exists listings_stays_rank_idx on public.listings (featured desc, host_verified desc, internal_score desc)
  where is_active and deleted_at is null;

create or replace function cabana_private.listing_host_verified()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Server-owned: recomputed on every write, so a host cannot set it.
  new.host_verified := coalesce(public.cabana_identity_verified(coalesce(new.partner_id, new.host_id)), false);
  return new;
end $$;
revoke all on function cabana_private.listing_host_verified() from public, anon, authenticated;
create or replace trigger cabana_listing_host_verified before insert or update of partner_id, host_id, host_verified on public.listings
  for each row execute function cabana_private.listing_host_verified();

create or replace function cabana_private.sync_host_verified(p_user uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.listings l
     set host_verified = coalesce(public.cabana_identity_verified(p_user), false)
   where p_user is not null and coalesce(l.partner_id, l.host_id) = p_user
     and l.host_verified is distinct from coalesce(public.cabana_identity_verified(p_user), false);
$$;
revoke all on function cabana_private.sync_host_verified(uuid) from public, anon, authenticated;

create or replace function cabana_private.identity_changed_sync_listings()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_private.sync_host_verified(case tg_table_name when 'verification_status' then new.user_id else new.id end);
  return new;
exception when others then
  raise warning 'identity_changed_sync_listings: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.identity_changed_sync_listings() from public, anon, authenticated;

do $$ begin
  if to_regclass('public.verification_status') is not null then
    execute 'create or replace trigger cabana_sync_host_verified after insert or update on public.verification_status
             for each row execute function cabana_private.identity_changed_sync_listings()';
  end if;
  execute 'create or replace trigger cabana_sync_host_verified after update of verified, id_verification_status on public.profiles
           for each row execute function cabana_private.identity_changed_sync_listings()';
  if to_regclass('public.agents') is not null then
    execute 'create or replace trigger cabana_sync_host_verified after insert or update of kyc_status on public.agents
             for each row execute function cabana_private.identity_changed_sync_listings()';
  end if;
end $$;

-- Backfill: once, for every listing.
update public.listings l
   set host_verified = coalesce(public.cabana_identity_verified(coalesce(l.partner_id, l.host_id)), false)
 where l.host_verified is distinct from coalesce(public.cabana_identity_verified(coalesce(l.partner_id, l.host_id)), false);

-- ── 5 · video evidence on a reported problem ──────────────────────────
alter table public.checkin_issues add column if not exists video_url text,
                                  add column if not exists video_live boolean not null default false,
                                  add column if not exists video_seconds numeric,
                                  add column if not exists media jsonb not null default '[]'::jsonb;
comment on column public.checkin_issues.video_url is
  'Storage path in the private evidence bucket (<guest uid>/issues/<booking>/...). Read with a signed URL.';
