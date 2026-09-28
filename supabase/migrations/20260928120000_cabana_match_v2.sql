/* ════════════════════════════════════════════════════════════════════
   CABANA MATCH v2 — the reverse marketplace, rebuilt around the server
   ────────────────────────────────────────────────────────────────────
   What v1 got wrong, and what this migration changes:

   · Nobody was listening. Hosts had to opt in per listing on a page
     most of them never opened, so the broadcast reached zero hosts.
     Every live stay is now eligible by default; a host (or a single
     listing) can switch it off at any time.

   · Routing happened in the browser. Any opted-in host could read every
     live request on the continent, budget included, and the "near you"
     promise was never checked. Matching now runs here: distance, dates,
     capacity, bedrooms, budget band, minimum stay, calendar availability
     and existing bookings, all in one function.

   · Hosts were never told. There was no trigger, no push, no email.
     A broadcast now writes a delivery row per host and fires the same
     notification pipeline chat and rides use (in-app realtime + web
     push, with email and SMS as fallbacks in the API route). A minute
     clock expires requests and nudges hosts who have not looked yet.

   · Offers were decoration. A response was a row with a spoofable
     title, image and price. It is now a real, bookable private offer:
     the host's price becomes a chat_offers row that stay_quote already
     honours at checkout, inside a conversation the guest can open.

   · Anyone could write anything. Requests, responses and opt-ins were
     writable by their owners directly, so a guest could extend a
     request forever and a host could mark a booking as theirs. All
     writes now go through the functions below.
   ════════════════════════════════════════════════════════════════════ */

-- ── 0 · helpers ─────────────────────────────────────────────────────

create or replace function cabana_private.km_between(a_lat float8, a_lng float8, b_lat float8, b_lng float8)
returns float8
language sql
immutable
set search_path = pg_catalog
as $$
  select case when a_lat is null or a_lng is null or b_lat is null or b_lng is null then null
    else 12742 * asin(least(1, sqrt(
      power(sin(radians(b_lat - a_lat) / 2), 2) +
      cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)
    ))) end
$$;

create or replace function cabana_private.match_k(p integer)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case when p is null then null
    when p >= 1000 and p % 1000 = 0 then (p / 1000) || 'K'
    when p >= 1000 then trim(to_char(p / 1000.0, 'FM999990.0')) || 'K'
    else p::text end
$$;

create or replace function cabana_private.match_band(p_min integer, p_max integer)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_min is null and p_max is null then null
    when p_max is null then 'KES ' || cabana_private.match_k(p_min) || '+ a night'
    when p_min is null then 'up to KES ' || cabana_private.match_k(p_max) || ' a night'
    else 'KES ' || cabana_private.match_k(p_min) || '–' || cabana_private.match_k(p_max) || ' a night' end
$$;

-- ── 1 · tables ──────────────────────────────────────────────────────

alter table public.cabana_match_requests
  add column if not exists radius_km integer not null default 25,
  add column if not exists location_label text,
  add column if not exists hosts_notified integer not null default 0,
  add column if not exists listings_matched integer not null default 0,
  add column if not exists hosts_seen integer not null default 0,
  add column if not exists offers_count integer not null default 0,
  add column if not exists passes_count integer not null default 0,
  add column if not exists extensions_used integer not null default 0,
  add column if not exists source text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.cabana_match_responses
  add column if not exists nightly numeric,
  add column if not exists list_nightly numeric,
  add column if not exists stay_total numeric,
  add column if not exists nights integer,
  add column if not exists chat_offer_id uuid,
  add column if not exists note text,
  add column if not exists distance_km numeric,
  add column if not exists viewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cabana_match_deliveries (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.cabana_match_requests(id) on delete cascade,
  host_id         uuid not null references auth.users(id) on delete cascade,
  listing_ids     uuid[] not null default '{}',
  best_km         numeric,
  status          text not null default 'sent'
                  check (status in ('sent', 'seen', 'responded', 'passed', 'expired', 'closed')),
  notification_id uuid,
  notified_at     timestamptz not null default now(),
  seen_at         timestamptz,
  responded_at    timestamptz,
  passed_at       timestamptz,
  reminded_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (request_id, host_id)
);
create index if not exists cmd_host_live_idx on public.cabana_match_deliveries (host_id, created_at desc);
create index if not exists cmd_request_idx on public.cabana_match_deliveries (request_id);
create index if not exists cmd_reminder_idx on public.cabana_match_deliveries (status, notified_at) where status = 'sent';

create table if not exists public.cabana_match_host_prefs (
  host_id    uuid primary key references auth.users(id) on delete cascade,
  alerts     boolean not null default true,
  sound      boolean not null default true,
  sms        boolean not null default true,
  email      boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists cmr_live_expiry_idx on public.cabana_match_requests (expires_at) where status = 'live';
create index if not exists cmres_guest_listing_idx on public.cabana_match_responses (listing_id, created_at desc);

-- ── 2 · row security. Reads for owners, writes only through functions ──

alter table public.cabana_match_requests   enable row level security;
alter table public.cabana_match_responses  enable row level security;
alter table public.cabana_host_opt_ins     enable row level security;
alter table public.cabana_match_deliveries enable row level security;
alter table public.cabana_match_host_prefs enable row level security;

drop policy if exists req_guest_all on public.cabana_match_requests;
drop policy if exists req_host_read_live on public.cabana_match_requests;
drop policy if exists req_guest_read on public.cabana_match_requests;
create policy req_guest_read on public.cabana_match_requests
  for select to authenticated using ((select auth.uid()) = guest_id);

drop policy if exists res_host_all on public.cabana_match_responses;
drop policy if exists res_host_read on public.cabana_match_responses;
create policy res_host_read on public.cabana_match_responses
  for select to authenticated using ((select auth.uid()) = host_id);
-- res_guest_read (guest reads responses to their own request) and the
-- admin read policy stay as they were.

drop policy if exists opt_host_read_live on public.cabana_host_opt_ins;
drop policy if exists opt_own on public.cabana_host_opt_ins;
drop policy if exists opt_own_read on public.cabana_host_opt_ins;
create policy opt_own_read on public.cabana_host_opt_ins
  for select to authenticated using ((select auth.uid()) = host_id);

drop policy if exists cmd_host_read on public.cabana_match_deliveries;
create policy cmd_host_read on public.cabana_match_deliveries
  for select to authenticated using ((select auth.uid()) = host_id);
drop policy if exists cmd_admin_read on public.cabana_match_deliveries;
create policy cmd_admin_read on public.cabana_match_deliveries
  for select to authenticated using (public.is_admin());

drop policy if exists cmhp_own_read on public.cabana_match_host_prefs;
create policy cmhp_own_read on public.cabana_match_host_prefs
  for select to authenticated using ((select auth.uid()) = host_id);

/* No insert or update policy exists for members on these tables, so RLS
   refuses direct writes; the functions below are the only way in. The
   operator console keeps its admin policies. */
drop policy if exists admin_update_requests on public.cabana_match_requests;
create policy admin_update_requests on public.cabana_match_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.cabana_match_requests, public.cabana_match_responses, public.cabana_host_opt_ins from anon;
revoke all on public.cabana_match_deliveries from anon;
revoke insert, update, delete on public.cabana_match_deliveries from authenticated;
revoke all on public.cabana_match_host_prefs from anon;
revoke insert, update, delete on public.cabana_match_host_prefs from authenticated;
grant select on public.cabana_match_deliveries, public.cabana_match_host_prefs to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                 and schemaname = 'public' and tablename = 'cabana_match_deliveries') then
    alter publication supabase_realtime add table public.cabana_match_deliveries;
  end if;
end $$;

-- ── 3 · who can take this guest ─────────────────────────────────────
/* One function decides eligibility, so the preview a guest sees before
   sending and the hosts who are actually alerted can never disagree. */
create or replace function cabana_private.match_candidates(
  p_guest uuid, p_lat float8, p_lng float8, p_location text,
  p_checkin date, p_checkout date, p_guests integer, p_bedrooms integer,
  p_min_price numeric, p_max_price numeric, p_radius_km integer)
returns table (listing_id uuid, host_id uuid, distance_km float8, nightly numeric,
               title text, photo text, city text, area text, bedrooms integer)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with q as (
    select nullif(lower(trim(split_part(coalesce(p_location, ''), ',', 1))), '') as place,
           greatest(1, least(coalesce(p_radius_km, 25), 300)) as radius
  ),
  base as (
    select l.id, l.partner_id, l.title, l.photos, l.city, l.area, l.location,
           coalesce(l.price_night, l.price_per_night) as rate,
           coalesce(l.bedrooms, cabana_private.int_or_null(l.beds)) as rooms,
           coalesce(cabana_private.int_or_null(l.max_guests), 50) as cap,
           greatest(coalesce(l.min_nights, 1), 1) as min_n,
           coalesce(l.latitude, l.lat)::float8 as la,
           coalesce(l.longitude, l.lng)::float8 as lo
      from public.listings l
     where l.is_active and l.status = 'active' and l.deleted_at is null
       and coalesce(l.service, 'stays') = 'stays'
       and coalesce(l.type, '') <> 'room'
       and coalesce(l.ownership_type, 'sole') <> 'held'
       and l.partner_id is not null
       and (p_guest is null or l.partner_id <> p_guest)
       and coalesce(nullif(l.currency, ''), 'KES') = 'KES'
       and coalesce(l.price_night, l.price_per_night, 0) > 0
  ),
  near as (
    select b.*, cabana_private.km_between(p_lat, p_lng, b.la, b.lo) as km
      from base b, q
  )
  select n.id, n.partner_id, n.km, n.rate, n.title, n.photos[1], n.city, n.area, n.rooms
    from near n, q
   where (
          (n.km is not null and n.km <= q.radius)
       or ((p_lat is null or n.km is null) and q.place is not null and (
              lower(coalesce(n.city, '')) = q.place
           or lower(coalesce(n.area, '')) like '%' || q.place || '%'
           or lower(coalesce(n.location, '')) like '%' || q.place || '%'))
         )
     and n.cap >= greatest(coalesce(p_guests, 1), 1)
     and (p_bedrooms is null or p_bedrooms <= 0 or coalesce(n.rooms, 0) >= p_bedrooms)
     /* A host may come down to a budget, so the ceiling is soft. The
        floor keeps a guest who asked for the best from being offered
        the cheapest room in town. */
     and (p_max_price is null or p_max_price <= 0 or n.rate <= p_max_price * 1.35)
     and (p_min_price is null or p_min_price <= 0 or n.rate >= p_min_price * 0.8)
     and (p_checkout - p_checkin) >= n.min_n
     and public.cabana_dates_available(n.id, p_checkin, p_checkout)
     and not exists (
           select 1 from public.apartment_bookings b
            where (b.listing_id = n.id or b.apartment_id = n.id::text)
              and b.cancelled_at is null
              and b.status in ('paid_pending_checkin', 'deposit_paid', 'part_paid', 'checked_in', 'confirmed')
              and b.checkin_date < p_checkout and b.checkout_date > p_checkin)
     and not exists (
           select 1 from public.cabana_host_opt_ins o
            where o.listing_id = n.id::text and o.opted_in = false)
     and not exists (
           select 1 from public.cabana_match_host_prefs hp
            where hp.host_id = n.partner_id and hp.alerts = false)
     and not exists (
           select 1 from public.profiles p
            where p.id = n.partner_id and (coalesce(p.banned, false)
               or (p.suspended_until is not null and p.suspended_until > now())
               or p.host_status in ('suspended', 'banned')))
   order by n.km nulls last, n.rate
$$;

create or replace function cabana_private.match_read_criteria(p jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  checkin date; checkout date; guests integer; rooms integer; mn numeric; mx numeric;
  loc text; lat float8; lng float8; radius integer; today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  loc := nullif(left(trim(coalesce(p->>'location', '')), 140), '');
  begin checkin := (p->>'checkin')::date; exception when others then checkin := null; end;
  begin checkout := (p->>'checkout')::date; exception when others then checkout := null; end;
  begin lat := nullif(p->>'lat', '')::float8; lng := nullif(p->>'lng', '')::float8; exception when others then lat := null; lng := null; end;
  if lat is not null and (lat not between -90 and 90 or lng is null or lng not between -180 and 180) then lat := null; lng := null; end if;
  guests := greatest(1, least(coalesce(cabana_private.int_or_null(p->>'guests'), 1), 30));
  rooms  := nullif(greatest(0, least(coalesce(cabana_private.int_or_null(p->>'bedrooms'), 0), 12)), 0);
  mn := nullif(greatest(0, coalesce(cabana_private.int_or_null(p->>'min_price'), 0)), 0);
  mx := nullif(greatest(0, coalesce(cabana_private.int_or_null(p->>'max_price'), 0)), 0);
  radius := greatest(3, least(coalesce(cabana_private.int_or_null(p->>'radius_km'), 25), 150));

  if loc is null and lat is null then raise exception 'Tell us where you want to stay.' using errcode = '22023'; end if;
  if checkin is null or checkout is null then raise exception 'Pick your check-in and check-out dates.' using errcode = '22023'; end if;
  if checkin < today then raise exception 'Check-in can''t be in the past.' using errcode = '22023'; end if;
  if checkout <= checkin then raise exception 'Check-out must be after check-in.' using errcode = '22023'; end if;
  if checkout - checkin > 90 then raise exception 'Cabana Match covers stays of up to 90 nights.' using errcode = '22023'; end if;
  if checkin > today + 365 then raise exception 'Check-in must be within the next year.' using errcode = '22023'; end if;
  if mn is not null and mx is not null and mx < mn then mx := null; end if;

  return jsonb_build_object('location', loc, 'lat', lat, 'lng', lng, 'checkin', checkin, 'checkout', checkout,
    'guests', guests, 'bedrooms', rooms, 'min_price', mn, 'max_price', mx, 'radius_km', radius,
    'label', nullif(left(trim(coalesce(p->>'label', p->>'location', '')), 140), ''),
    'notes', nullif(left(trim(coalesce(p->>'notes', '')), 280), ''));
end $$;

-- ── 4 · guest: preview, broadcast, watch, close, extend, engage ──────

create or replace function public.cabana_match_preview(p jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare c jsonb; hosts integer; listings integer; nearest float8; wider integer; wr integer;
begin
  c := cabana_private.match_read_criteria(p);
  select count(distinct m.host_id), count(*), min(m.distance_km)
    into hosts, listings, nearest
    from cabana_private.match_candidates(auth.uid(), (c->>'lat')::float8, (c->>'lng')::float8, c->>'location',
           (c->>'checkin')::date, (c->>'checkout')::date, (c->>'guests')::int, (c->>'bedrooms')::int,
           (c->>'min_price')::numeric, (c->>'max_price')::numeric, (c->>'radius_km')::int) m;
  if hosts = 0 and (c->>'lat') is not null then
    wr := least((c->>'radius_km')::int * 3, 150);
    select count(distinct m.host_id) into wider
      from cabana_private.match_candidates(auth.uid(), (c->>'lat')::float8, (c->>'lng')::float8, c->>'location',
             (c->>'checkin')::date, (c->>'checkout')::date, (c->>'guests')::int, (c->>'bedrooms')::int,
             (c->>'min_price')::numeric, (c->>'max_price')::numeric, wr) m;
  end if;
  return jsonb_build_object('hosts', hosts, 'listings', listings, 'nearest_km', round(nearest::numeric, 1),
    'radius_km', (c->>'radius_km')::int, 'wider_radius_km', wr, 'wider_hosts', wider,
    'nights', (c->>'checkout')::date - (c->>'checkin')::date);
end $$;

create or replace function public.cabana_match_broadcast(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  me uuid := auth.uid();
  c jsonb; r public.cabana_match_requests%rowtype; old_id uuid;
  cand record; nid uuid; hosts integer := 0; listings integer := 0;
  band text; nights integer; place text; body text; recent integer;
begin
  if me is null then raise exception 'Sign in to send a request.' using errcode = '42501'; end if;
  c := cabana_private.match_read_criteria(p);
  perform cabana_private.chat_text_ok(c->>'notes', null, me);

  select count(*) into recent from public.cabana_match_requests
   where guest_id = me and created_at > now() - interval '24 hours';
  if recent >= 8 then
    raise exception 'You have sent a lot of requests today. Try the stays below, or send another tomorrow.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  /* One live request per guest. Sending again replaces the old one,
     so a guest who changed their dates is not holding two windows. */
  for old_id in select id from public.cabana_match_requests where guest_id = me and status = 'live' loop
    perform cabana_private.match_close(old_id, 'closed');
  end loop;

  nights := (c->>'checkout')::date - (c->>'checkin')::date;
  /* nights is a generated column: checkout minus check-in. */
  insert into public.cabana_match_requests (guest_id, guest_name, location, location_label, location_lat, location_lng,
      checkin_date, checkout_date, guests, bedrooms, min_price, max_price, notes, status, expires_at,
      radius_km, source, updated_at)
  values (me, cabana_private.member_name(me), coalesce(c->>'location', c->>'label', 'Pinned location'), c->>'label',
      (c->>'lat')::float8, (c->>'lng')::float8, (c->>'checkin')::date, (c->>'checkout')::date,
      (c->>'guests')::int, (c->>'bedrooms')::int, (c->>'min_price')::int, (c->>'max_price')::int, c->>'notes',
      'live', now() + interval '20 minutes', (c->>'radius_km')::int, left(coalesce(p->>'source', 'stays'), 24), now())
  returning * into r;

  band := cabana_private.match_band(r.min_price, r.max_price);
  place := coalesce(nullif(split_part(coalesce(r.location_label, r.location), ',', 1), ''), 'your area');

  /* Group candidate listings by host, nearest first, and alert at most
     sixty hosts. Past that a request is spam, not a broadcast. */
  for cand in
    select m.host_id, array_agg(m.listing_id order by m.distance_km nulls last, m.nightly) as ids,
           min(m.distance_km) as km, count(*) as n
      from cabana_private.match_candidates(me, r.location_lat, r.location_lng, r.location,
             r.checkin_date, r.checkout_date, r.guests, r.bedrooms, r.min_price, r.max_price, r.radius_km) m
     group by m.host_id
     order by min(m.distance_km) nulls last
     limit 60
  loop
    body := r.guests || case when r.guests = 1 then ' guest · ' else ' guests · ' end
         || nights || case when nights = 1 then ' night · ' else ' nights · ' end
         || cabana_private.fmt_range(r.checkin_date, r.checkout_date)
         || coalesce(' · ' || band, '') || '. Reply within 20 minutes.';
    insert into public.cabana_match_deliveries (request_id, host_id, listing_ids, best_km)
    values (r.id, cand.host_id, cand.ids, round(cand.km::numeric, 1));
    nid := cabana_private.match_notify(cand.host_id,
      'Guest request · ' || left(place, 60),
      body,
      '/partner-cabana.html?req=' || r.id,
      jsonb_build_object('match_request_id', r.id, 'role', 'host', 'expires_at', r.expires_at, 'urgent', true));
    update public.cabana_match_deliveries set notification_id = nid
     where request_id = r.id and host_id = cand.host_id;
    hosts := hosts + 1;
    listings := listings + cand.n;
  end loop;

  /* A broadcast that reaches nobody is a promise we cannot keep. Roll it
     back (the guest's previous request included) and let the page offer
     a wider area instead. */
  if hosts = 0 then
    raise exception 'No hosts are free near % for those dates yet.', place
      using errcode = 'P0001', hint = 'no_hosts';
  end if;

  update public.cabana_match_requests
     set hosts_notified = hosts, listings_matched = listings, updated_at = now()
   where id = r.id
  returning * into r;

  return jsonb_build_object('request_id', r.id, 'expires_at', r.expires_at, 'hosts', hosts,
    'listings', listings, 'nights', nights, 'status', r.status);
end $$;

/* One notification, one push, marked urgent so the API route delivers it
   with high priority and falls back to email and SMS. */
create or replace function cabana_private.match_notify(p_user uuid, p_title text, p_body text, p_url text, p_meta jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, cabana_ops
as $$
declare nid uuid; secret text;
begin
  if p_user is null then return null; end if;
  insert into public.notifications (user_id, title, body, url, kind, meta)
  values (p_user, left(p_title, 140), left(coalesce(p_body, ''), 240), p_url, 'match', coalesce(p_meta, '{}'::jsonb))
  returning id into nid;
  begin
    select value into secret from cabana_ops.cron_config where key = 'cron_secret';
    if secret is not null and secret <> '' then
      perform net.http_post(
        url := 'https://cabana.africa/api/push-send?action=database-notification',
        headers := jsonb_build_object('Authorization', 'Bearer ' || secret,
          'Content-Type', 'application/json', 'User-Agent', 'Cabana-Match/2.0'),
        body := jsonb_build_object('action', 'database-notification', 'notification_id', nid),
        timeout_milliseconds := 15000);
    end if;
  exception when others then
    raise warning 'match_notify push queue failed: %', sqlerrm;
  end;
  return nid;
end $$;

create or replace function cabana_private.match_close(p_request uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.cabana_match_requests
     set status = p_status, closed_at = coalesce(closed_at, now()), updated_at = now()
   where id = p_request and status = 'live';
  update public.cabana_match_deliveries
     set status = case when p_status = 'expired' then 'expired' else 'closed' end
   where request_id = p_request and status in ('sent', 'seen');
end $$;

/* Everything the guest's live panel needs, in one round trip. */
create or replace function public.cabana_match_state(p_request uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); r public.cabana_match_requests%rowtype; offers jsonb;
begin
  if me is null then return null; end if;
  if p_request is null then
    select * into r from public.cabana_match_requests
     where guest_id = me and (status = 'live' or (status in ('expired', 'closed') and offers_count > 0
            and coalesce(closed_at, expires_at) > now() - interval '48 hours'))
     order by (status = 'live') desc, created_at desc limit 1;
  else
    select * into r from public.cabana_match_requests where id = p_request and guest_id = me;
  end if;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'status', x.status, 'created_at', x.created_at, 'listing_id', x.listing_id,
      'title', l.title, 'photo', l.photos[1], 'photos', to_jsonb(l.photos[1:6]),
      'area', l.area, 'city', l.city, 'beds', coalesce(l.bedrooms, cabana_private.int_or_null(l.beds)),
      'baths', coalesce(l.bathrooms, cabana_private.int_or_null(l.baths)),
      'max_guests', cabana_private.int_or_null(l.max_guests),
      'rating', l.avg_rating, 'reviews', l.review_count, 'tour_3d', l.tour_3d_status = 'live',
      'nightly', coalesce(x.nightly, x.price_per_night), 'list_nightly', coalesce(x.list_nightly, x.price_per_night),
      'nights', coalesce(x.nights, r.nights), 'stay_total', coalesce(x.stay_total, coalesce(x.nightly, x.price_per_night) * r.nights),
      'service_fee', case when coalesce(x.stay_total, 0) < 5000 then 300 else 800 end,
      'distance_km', x.distance_km, 'note', x.note, 'conversation_id', x.conversation_id,
      'chat_offer_id', x.chat_offer_id,
      'host_name', coalesce(x.host_name, cabana_private.member_name(x.host_id)),
      'host_photo', x.host_avatar,
      'host_verified', coalesce((select pr.verified from public.profiles pr where pr.id = x.host_id), false)
    ) order by x.created_at), '[]'::jsonb)
    into offers
    from public.cabana_match_responses x
    left join public.listings l on l.id::text = x.listing_id
   where x.request_id = r.id and x.status <> 'declined';

  return jsonb_build_object(
    'request', jsonb_build_object('id', r.id, 'status', r.status, 'location', r.location,
      'label', coalesce(r.location_label, r.location), 'lat', r.location_lat, 'lng', r.location_lng,
      'checkin', r.checkin_date, 'checkout', r.checkout_date, 'nights', r.nights, 'guests', r.guests,
      'bedrooms', r.bedrooms, 'min_price', r.min_price, 'max_price', r.max_price, 'notes', r.notes,
      'radius_km', r.radius_km, 'created_at', r.created_at, 'expires_at', r.expires_at,
      'extensions_used', r.extensions_used, 'band', cabana_private.match_band(r.min_price, r.max_price)),
    'radar', jsonb_build_object('notified', r.hosts_notified, 'listings', r.listings_matched,
      'seen', r.hosts_seen, 'offers', r.offers_count, 'passed', r.passes_count),
    'offers', offers,
    'server_time', now());
end $$;

create or replace function public.cabana_match_close(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.cabana_match_requests where id = p_request and guest_id = me) then
    raise exception 'Request not found.' using errcode = '42501';
  end if;
  perform cabana_private.match_close(p_request, 'closed');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.cabana_match_extend(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); r public.cabana_match_requests%rowtype;
begin
  select * into r from public.cabana_match_requests where id = p_request and guest_id = me for update;
  if not found then raise exception 'Request not found.' using errcode = '42501'; end if;
  if r.status <> 'live' or r.expires_at <= now() then raise exception 'This request has already closed. Send a new one.' using errcode = '22023'; end if;
  if r.extensions_used >= 2 then raise exception 'You can keep a request open for up to 40 minutes.' using errcode = '22023'; end if;
  update public.cabana_match_requests
     set expires_at = expires_at + interval '10 minutes', extensions_used = extensions_used + 1, updated_at = now()
   where id = r.id returning * into r;
  return jsonb_build_object('expires_at', r.expires_at, 'extensions_used', r.extensions_used);
end $$;

create or replace function public.cabana_match_engage(p_response uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); x public.cabana_match_responses%rowtype; r public.cabana_match_requests%rowtype;
begin
  select * into x from public.cabana_match_responses where id = p_response;
  if not found then raise exception 'Offer not found.' using errcode = '42501'; end if;
  select * into r from public.cabana_match_requests where id = x.request_id and guest_id = me;
  if not found then raise exception 'Offer not found.' using errcode = '42501'; end if;
  if x.status = 'pending' then
    update public.cabana_match_responses
       set status = 'engaged', engaged_at = now(), viewed_at = coalesce(viewed_at, now()), updated_at = now()
     where id = x.id;
    perform cabana_private.match_notify(x.host_id,
      'Your offer caught their eye',
      cabana_private.member_name(me) || ' opened your offer for ' || cabana_private.fmt_range(r.checkin_date, r.checkout_date) || '. Say hello.',
      '/dashboard.html?inbox=1&c=' || x.conversation_id,
      jsonb_build_object('match_request_id', r.id, 'response_id', x.id, 'role', 'host', 'engaged', true));
  end if;
  return jsonb_build_object('conversation_id', x.conversation_id, 'listing_id', x.listing_id,
    'checkin', r.checkin_date, 'checkout', r.checkout_date, 'guests', r.guests);
end $$;

-- ── 5 · host: feed, seen, respond, pass, settings ───────────────────

create or replace function public.cabana_match_host_feed(p_request uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); out jsonb;
begin
  if me is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(item order by (item->>'live')::boolean desc, item->>'created_at' desc), '[]'::jsonb) into out
  from (
    select jsonb_build_object(
      'request_id', r.id, 'status', r.status, 'delivery_status', d.status,
      'live', r.status = 'live' and r.expires_at > now(),
      'created_at', r.created_at, 'expires_at', r.expires_at,
      'location', coalesce(r.location_label, r.location), 'checkin', r.checkin_date, 'checkout', r.checkout_date,
      'nights', r.nights, 'guests', r.guests, 'bedrooms', r.bedrooms, 'notes', r.notes,
      'band', cabana_private.match_band(r.min_price, r.max_price), 'max_price', r.max_price, 'min_price', r.min_price,
      'guest_name', split_part(coalesce(r.guest_name, 'A guest'), ' ', 1),
      'guest_verified', coalesce((select pr.verified from public.profiles pr where pr.id = r.guest_id), false),
      'hosts_notified', r.hosts_notified, 'offers_count', r.offers_count, 'best_km', d.best_km,
      'listings', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', l.id, 'title', l.title, 'photo', l.photos[1], 'area', l.area, 'city', l.city,
          'nightly', coalesce(l.price_night, l.price_per_night),
          'km', round(cabana_private.km_between(r.location_lat, r.location_lng,
                  coalesce(l.latitude, l.lat)::float8, coalesce(l.longitude, l.lng)::float8)::numeric, 1)
        ) order by array_position(d.listing_ids, l.id)), '[]'::jsonb)
        from public.listings l where l.id = any(d.listing_ids) and l.partner_id = me),
      'response', (
        select jsonb_build_object('id', x.id, 'status', x.status, 'nightly', x.nightly, 'listing_id', x.listing_id,
          'conversation_id', x.conversation_id, 'created_at', x.created_at)
          from public.cabana_match_responses x where x.request_id = r.id and x.host_id = me limit 1)
    ) as item
    from public.cabana_match_deliveries d
    join public.cabana_match_requests r on r.id = d.request_id
   where d.host_id = me
     and (p_request is null or r.id = p_request)
     and (r.created_at > now() - interval '14 days')
   order by r.created_at desc
   limit 60
  ) s;
  return out;
end $$;

create or replace function public.cabana_match_seen(p_request uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); changed integer;
begin
  update public.cabana_match_deliveries
     set status = 'seen', seen_at = now()
   where request_id = p_request and host_id = me and status = 'sent';
  get diagnostics changed = row_count;
  if changed > 0 then
    update public.cabana_match_requests
       set hosts_seen = (select count(*) from public.cabana_match_deliveries
                          where request_id = p_request and seen_at is not null),
           updated_at = now()
     where id = p_request;
  end if;
end $$;

create or replace function public.cabana_match_respond(p_request uuid, p_listing uuid, p_nightly numeric default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  me uuid := auth.uid();
  r public.cabana_match_requests%rowtype; d public.cabana_match_deliveries%rowtype;
  l public.listings%rowtype; conv public.chat_conversations%rowtype;
  rate numeric; nightly numeric; total numeric; offer_id uuid; mid uuid; resp_id uuid; km numeric;
  note text := nullif(left(trim(coalesce(p_note, '')), 400), '');
  host_photo text; exp timestamptz;
begin
  if me is null then raise exception 'Sign in to reply.' using errcode = '42501'; end if;
  select * into r from public.cabana_match_requests where id = p_request for update;
  if not found then raise exception 'Request not found.' using errcode = '42501'; end if;
  if r.status <> 'live' or r.expires_at <= now() then
    raise exception 'This guest''s request has closed.' using errcode = '22023', hint = 'closed';
  end if;
  select * into d from public.cabana_match_deliveries where request_id = r.id and host_id = me;
  if not found then raise exception 'This request was not sent to you.' using errcode = '42501'; end if;
  if exists (select 1 from public.cabana_match_responses where request_id = r.id and host_id = me) then
    raise exception 'You already sent this guest an offer.' using errcode = '22023', hint = 'duplicate';
  end if;
  if not (p_listing = any(d.listing_ids)) then
    raise exception 'Choose one of your stays that fits this request.' using errcode = '22023';
  end if;
  select * into l from public.listings
   where id = p_listing and partner_id = me and is_active and status = 'active' and deleted_at is null
     and coalesce(service, 'stays') = 'stays' and coalesce(ownership_type, 'sole') <> 'held';
  if not found then raise exception 'That stay is not live right now.' using errcode = '22023'; end if;
  if not public.cabana_dates_available(l.id, r.checkin_date, r.checkout_date)
     or exists (select 1 from public.apartment_bookings b
                 where (b.listing_id = l.id or b.apartment_id = l.id::text) and b.cancelled_at is null
                   and b.status in ('paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
                   and b.checkin_date < r.checkout_date and b.checkout_date > r.checkin_date) then
    raise exception 'Those dates were just taken on this stay.' using errcode = '22023', hint = 'unavailable';
  end if;

  rate := coalesce(l.price_night, l.price_per_night);
  nightly := round(coalesce(p_nightly, rate));
  if nightly > rate then
    raise exception 'Offer your listed price of KES % or less.', to_char(rate, 'FM999,999,990') using errcode = '22023';
  end if;
  if nightly < ceil(rate * 0.2) then
    raise exception 'The lowest you can offer on this stay is KES %.', to_char(ceil(rate * 0.2), 'FM999,999,990') using errcode = '22023';
  end if;
  perform cabana_private.chat_text_ok(note, me, r.guest_id);

  total := nightly * r.nights;
  km := round(cabana_private.km_between(r.location_lat, r.location_lng,
          coalesce(l.latitude, l.lat)::float8, coalesce(l.longitude, l.lng)::float8)::numeric, 1);
  select case when mp.published and mp.photo_status = 'approved' then mp.photo_url end into host_photo
    from public.member_public_profiles mp where mp.user_id = me;

  insert into public.chat_conversations (listing_id, listing_type, listing_title, host_id, guest_id, status, checkin, checkout, guests)
  values (l.id, 'apartment', left(coalesce(l.title, 'Stay'), 140), me, r.guest_id, 'active', r.checkin_date, r.checkout_date, r.guests)
  on conflict (listing_id, guest_id) do update
     set checkin = excluded.checkin, checkout = excluded.checkout, guests = excluded.guests,
         guest_archived_at = null, host_archived_at = null
  returning * into conv;
  if conv.blocked_by is not null then raise exception 'This guest can''t be messaged.' using errcode = '42501'; end if;

  if nightly < rate then
    exp := greatest(now() + interval '48 hours', r.expires_at);
    update public.chat_offers set status = 'superseded', resolved_at = now()
     where conversation_id = conv.id and status = 'sent';
    insert into public.chat_offers (conversation_id, listing_id, host_id, guest_id, checkin, checkout, guests,
      nightly, list_nightly, stay_total, note, expires_at)
    values (conv.id, l.id, me, r.guest_id, r.checkin_date, r.checkout_date, r.guests, nightly, rate, total, note, exp)
    returning id into offer_id;
    mid := cabana_private.chat_post(conv.id, me, 'offer',
      'Cabana Match offer: KES ' || to_char(nightly, 'FM999,999,990') || ' a night for '
        || cabana_private.fmt_range(r.checkin_date, r.checkout_date)
        || ' (' || r.nights || case when r.nights = 1 then ' night' else ' nights' end || ')',
      jsonb_build_object('offer_id', offer_id, 'listing_id', l.id, 'title', l.title, 'photo', l.photos[1],
        'checkin', r.checkin_date, 'checkout', r.checkout_date, 'guests', r.guests, 'nights', r.nights,
        'nightly', nightly, 'list_nightly', rate, 'stay_total', total,
        'service_fee', case when total < 5000 then 300 else 800 end,
        'grand_total', total + case when total < 5000 then 300 else 800 end,
        'expires_at', exp, 'note', note, 'match_request_id', r.id));
    update public.chat_offers set message_id = mid where id = offer_id;
  else
    mid := cabana_private.chat_post(conv.id, me, 'text',
      coalesce(note, 'Hi! ' || coalesce(l.title, 'My place') || ' is free for '
        || cabana_private.fmt_range(r.checkin_date, r.checkout_date) || '. I''d love to host you.'),
      jsonb_build_object('match_request_id', r.id, 'listing_id', l.id));
  end if;

  insert into public.cabana_match_responses (request_id, host_id, listing_id, listing_title, listing_image,
      price_per_night, host_name, host_avatar, status, conversation_id, nightly, list_nightly, stay_total,
      nights, chat_offer_id, note, distance_km)
  values (r.id, me, l.id::text, l.title, l.photos[1], nightly::int, cabana_private.member_name(me), host_photo,
      'pending', conv.id, nightly, rate, total, r.nights, offer_id, note, km)
  returning id into resp_id;

  update public.cabana_match_deliveries
     set status = 'responded', responded_at = now(), seen_at = coalesce(seen_at, now())
   where id = d.id;
  update public.cabana_match_requests
     set offers_count = offers_count + 1,
         hosts_seen = (select count(*) from public.cabana_match_deliveries where request_id = r.id and seen_at is not null),
         updated_at = now()
   where id = r.id;

  perform cabana_private.match_notify(r.guest_id,
    case when nightly < rate then 'Special offer · ' else 'New offer · ' end || left(coalesce(l.title, 'A stay'), 70),
    'KES ' || to_char(nightly, 'FM999,999,990') || ' a night'
      || case when nightly < rate then ' (was ' || to_char(rate, 'FM999,999,990') || ')' else '' end
      || ' · ' || cabana_private.fmt_range(r.checkin_date, r.checkout_date) || '. Tap to see it.',
    '/apartments?match=' || r.id,
    jsonb_build_object('match_request_id', r.id, 'response_id', resp_id, 'role', 'guest', 'photo', l.photos[1]));

  return jsonb_build_object('response_id', resp_id, 'conversation_id', conv.id, 'chat_offer_id', offer_id,
    'nightly', nightly, 'list_nightly', rate);
end $$;

create or replace function public.cabana_match_pass(p_request uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); changed integer;
begin
  update public.cabana_match_deliveries
     set status = 'passed', passed_at = now(), seen_at = coalesce(seen_at, now())
   where request_id = p_request and host_id = me and status in ('sent', 'seen');
  get diagnostics changed = row_count;
  if changed > 0 then
    update public.cabana_match_requests
       set passes_count = passes_count + 1,
           hosts_seen = (select count(*) from public.cabana_match_deliveries where request_id = p_request and seen_at is not null),
           updated_at = now()
     where id = p_request;
  end if;
end $$;

create or replace function public.cabana_match_host_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); prefs jsonb; listings jsonb; stats jsonb;
begin
  if me is null then return null; end if;
  select to_jsonb(p) - 'host_id' into prefs from public.cabana_match_host_prefs p where p.host_id = me;
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title, 'photo', l.photos[1],
      'area', coalesce(l.area, l.city), 'nightly', coalesce(l.price_night, l.price_per_night),
      'on', not exists (select 1 from public.cabana_host_opt_ins o where o.listing_id = l.id::text and o.opted_in = false))
      order by l.created_at desc), '[]'::jsonb)
    into listings
    from public.listings l
   where l.partner_id = me and l.deleted_at is null and l.is_active and l.status = 'active'
     and coalesce(l.service, 'stays') = 'stays' and coalesce(l.type, '') <> 'room';
  select jsonb_build_object(
      'requests', count(*),
      'offers', count(*) filter (where d.status = 'responded'),
      'booked', (select count(*) from public.cabana_match_responses x where x.host_id = me and x.status = 'booked'),
      'avg_reply_seconds', round(avg(extract(epoch from d.responded_at - d.notified_at)) filter (where d.responded_at is not null)))
    into stats
    from public.cabana_match_deliveries d where d.host_id = me;
  return jsonb_build_object('prefs', coalesce(prefs, jsonb_build_object('alerts', true, 'sound', true, 'sms', true, 'email', true)),
    'listings', listings, 'stats', stats);
end $$;

create or replace function public.cabana_match_set_prefs(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  insert into public.cabana_match_host_prefs (host_id, alerts, sound, sms, email, updated_at)
  values (me, coalesce((p->>'alerts')::boolean, true), coalesce((p->>'sound')::boolean, true),
          coalesce((p->>'sms')::boolean, true), coalesce((p->>'email')::boolean, true), now())
  on conflict (host_id) do update set
    alerts = coalesce((p->>'alerts')::boolean, cabana_match_host_prefs.alerts),
    sound  = coalesce((p->>'sound')::boolean,  cabana_match_host_prefs.sound),
    sms    = coalesce((p->>'sms')::boolean,    cabana_match_host_prefs.sms),
    email  = coalesce((p->>'email')::boolean,  cabana_match_host_prefs.email),
    updated_at = now();
  return public.cabana_match_host_settings();
end $$;

create or replace function public.cabana_match_set_listing(p_listing uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); l public.listings%rowtype;
begin
  select * into l from public.listings where id = p_listing and partner_id = me and deleted_at is null;
  if not found then raise exception 'Listing not found.' using errcode = '42501'; end if;
  insert into public.cabana_host_opt_ins (host_id, listing_id, listing_title, listing_type, opted_in,
      opted_in_at, opted_out_at, updated_at)
  values (me, l.id::text, l.title, 'stay', coalesce(p_on, true), now(),
      case when coalesce(p_on, true) then null else now() end, now())
  on conflict (host_id, listing_id) do update set
    opted_in = excluded.opted_in, listing_title = excluded.listing_title,
    opted_in_at = case when excluded.opted_in then now() else cabana_host_opt_ins.opted_in_at end,
    opted_out_at = case when excluded.opted_in then null else now() end,
    updated_at = now();
  return jsonb_build_object('listing_id', l.id, 'on', coalesce(p_on, true));
end $$;

-- ── 6 · the clock: expiry, reminders, a closing note for the guest ──

create or replace function public.cabana_match_tick()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r record; d record;
begin
  for r in
    select * from public.cabana_match_requests
     where status = 'live' and expires_at <= now()
     for update skip locked
  loop
    perform cabana_private.match_close(r.id, 'expired');
    if r.offers_count > 0 then
      perform cabana_private.match_notify(r.guest_id,
        r.offers_count || case when r.offers_count = 1 then ' offer is' else ' offers are' end || ' waiting',
        'Your Cabana Match window has closed. Offers stay bookable for 48 hours.',
        '/apartments?match=' || r.id,
        jsonb_build_object('match_request_id', r.id, 'role', 'guest', 'closed', true));
    elsif r.hosts_notified > 0 then
      perform cabana_private.match_notify(r.guest_id,
        'No offers this time',
        'Hosts near ' || coalesce(split_part(coalesce(r.location_label, r.location), ',', 1), 'you')
          || ' were busy. Try a wider area or a different budget.',
        '/apartments?match=' || r.id,
        jsonb_build_object('match_request_id', r.id, 'role', 'guest', 'closed', true));
    end if;
  end loop;

  /* One nudge per host who has not opened the request after three
     minutes, only while there is still time to answer it. */
  for d in
    select dl.id, dl.host_id, dl.request_id, rq.expires_at, rq.nights, rq.guests, rq.checkin_date, rq.checkout_date,
           coalesce(rq.location_label, rq.location) as place
      from public.cabana_match_deliveries dl
      join public.cabana_match_requests rq on rq.id = dl.request_id
     where dl.status = 'sent' and dl.reminded_at is null
       and dl.notified_at <= now() - interval '3 minutes'
       and rq.status = 'live' and rq.expires_at > now() + interval '4 minutes'
     limit 200
  loop
    update public.cabana_match_deliveries set reminded_at = now() where id = d.id;
    perform cabana_private.match_notify(d.host_id,
      'Still waiting · ' || left(coalesce(split_part(d.place, ',', 1), 'a guest'), 60),
      d.guests || case when d.guests = 1 then ' guest · ' else ' guests · ' end
        || cabana_private.fmt_range(d.checkin_date, d.checkout_date) || '. '
        || greatest(1, ceil(extract(epoch from d.expires_at - now()) / 60))::int || ' minutes left to reply.',
      '/partner-cabana.html?req=' || d.request_id,
      jsonb_build_object('match_request_id', d.request_id, 'role', 'host', 'reminder', true, 'urgent', true,
        'expires_at', d.expires_at));
  end loop;
end $$;

-- ── 7 · booking attribution ─────────────────────────────────────────
/* A booking that follows a Match offer is credited to it, once, by the
   database rather than by whichever page the guest happened to be on. */
create or replace function cabana_private.match_attribute_booking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare hit record;
begin
  if new.guest_id is null or new.listing_id is null then return new; end if;
  if new.status not in ('paid_pending_checkin', 'deposit_paid', 'part_paid', 'confirmed', 'checked_in') then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then return new; end if;
  select mr.id, mr.request_id, mr.host_id into hit
    from public.cabana_match_responses mr
    join public.cabana_match_requests rq on rq.id = mr.request_id
   where rq.guest_id = new.guest_id and mr.listing_id = new.listing_id::text
     and mr.status in ('pending', 'engaged')
     and mr.created_at > now() - interval '7 days'
   order by mr.created_at desc limit 1;
  if hit.id is null then return new; end if;
  update public.cabana_match_responses set status = 'booked', updated_at = now() where id = hit.id;
  update public.cabana_match_requests
     set status = 'booked', booked_at = now(), booked_via_response_id = hit.id, referred_host_id = hit.host_id,
         closed_at = coalesce(closed_at, now()), updated_at = now()
   where id = hit.request_id;
  return new;
exception when others then
  raise warning 'match attribution skipped: %', sqlerrm;
  return new;
end $$;

drop trigger if exists cabana_match_attribute_booking_t on public.apartment_bookings;
create trigger cabana_match_attribute_booking_t
  after insert or update of status on public.apartment_bookings
  for each row execute function cabana_private.match_attribute_booking();

-- ── 8 · chat: a Match offer notifies once, from the Match pipeline ──

create or replace function public.cabana_notify_chat_recipient()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'extensions', 'net', 'cabana_ops'
as $function$
declare
  conversation public.chat_conversations%rowtype;
  recipient uuid;
  delivery_url text := 'https://cabana.africa/api/push-send?action=database-message';
  delivery_secret text;
  title text;
begin
  if new.is_system is true or new.visible_to is not null
     or new.kind not in ('text', 'offer', 'suggestion') then return new; end if;
  /* Cabana Match sends its own, richer alert for the first message. */
  if new.payload is not null and new.payload ? 'match_request_id' then return new; end if;
  select * into conversation from public.chat_conversations where id = new.conversation_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = conversation.host_id then conversation.guest_id else conversation.host_id end;
  if recipient is null or recipient = new.sender_id then return new; end if;

  title := case new.kind
    when 'offer' then 'A special offer for ' || left(coalesce(conversation.listing_title, 'your stay'), 80)
    when 'suggestion' then 'Your host suggested other stays'
    else cabana_private.member_name(new.sender_id) || ' · ' || left(coalesce(conversation.listing_title, 'Cabana'), 70) end;

  insert into public.notifications (user_id, title, body, url, kind, meta)
  select recipient, title,
         left(regexp_replace(coalesce(new.content, ''), '\s+', ' ', 'g'), 140),
         '/dashboard.html?inbox=1&c=' || conversation.id, 'message',
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
$function$;

-- ── 9 · grants ──────────────────────────────────────────────────────

revoke all on function cabana_private.km_between(float8, float8, float8, float8) from public, anon;
revoke all on function cabana_private.match_candidates(uuid, float8, float8, text, date, date, integer, integer, numeric, numeric, integer) from public, anon, authenticated;
revoke all on function cabana_private.match_read_criteria(jsonb) from public, anon, authenticated;
revoke all on function cabana_private.match_notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function cabana_private.match_close(uuid, text) from public, anon, authenticated;
revoke all on function cabana_private.match_attribute_booking() from public, anon, authenticated;
revoke all on function cabana_private.match_band(integer, integer) from public, anon;
revoke all on function cabana_private.match_k(integer) from public, anon;
revoke all on function public.cabana_match_tick() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.cabana_match_preview(jsonb)',
    'public.cabana_match_broadcast(jsonb)',
    'public.cabana_match_state(uuid)',
    'public.cabana_match_close(uuid)',
    'public.cabana_match_extend(uuid)',
    'public.cabana_match_engage(uuid)',
    'public.cabana_match_host_feed(uuid)',
    'public.cabana_match_seen(uuid)',
    'public.cabana_match_respond(uuid, uuid, numeric, text)',
    'public.cabana_match_pass(uuid)',
    'public.cabana_match_host_settings()',
    'public.cabana_match_set_prefs(jsonb)',
    'public.cabana_match_set_listing(uuid, boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ── 10 · schedule ───────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cabana-match-tick') then
    perform cron.unschedule('cabana-match-tick');
  end if;
  perform cron.schedule('cabana-match-tick', '* * * * *', 'select public.cabana_match_tick()');
end $$;

-- ── 11 · photo uploads: no size ceiling on listing photos ───────────
/* Photos are re-encoded on the device before upload, so the bucket no
   longer needs a hard 10 MB wall that turned away full-resolution
   originals when the browser could not decode them. */
update storage.buckets
   set file_size_limit = null,
       allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/avif','image/gif','image/heic','image/heif']
 where id = 'listings';

-- ── 12 · the reach preview is public ────────────────────────────────
/* The preview only counts hosts who could take a stay; it names nobody
   and reveals nothing the public stays grid does not already show.
   Letting a signed-out visitor see "12 hosts can take you" before the
   sign-in wall is the whole pitch. */
grant execute on function public.cabana_match_preview(jsonb) to anon;
