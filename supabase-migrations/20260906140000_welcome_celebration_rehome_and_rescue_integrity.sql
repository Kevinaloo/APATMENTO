-- ══════════════════════════════════════════════════════════════════════
-- CABANA · WELCOME CELEBRATION, GUEST REHOMING, RESCUE-RIDE INTEGRITY
-- ══════════════════════════════════════════════════════════════════════
-- Three promises this migration makes enforceable in the database rather
-- than in a browser:
--
--   1. The 200-credit congratulations is shown ONCE per account, ever.
--      Not once per device, not once per browser profile — once. The flag
--      lives on the row, and the flip is a single atomic UPDATE, so two
--      tabs racing each other produce one celebration and one no-op.
--
--   2. A rehome offer is written by the server or not at all, and a guest
--      may ask for one themselves. The old RLS let any host INSERT a
--      match_offers row straight from the browser with whatever
--      `service_fee` and `candidates` they liked — and the accept path
--      paid 30% commission on that number and absorbed the price gap to
--      those listings. That is a money printer, and it is closed here.
--
--   3. The rescue ride (the taxi we pay for when a guest is turned away)
--      is for guests who paid their stay in full, once each, for life.
--      Both halves are enforced inside dispatch_rescue_ride, so no caller
--      — API, console, or psql — can hand out a second one by accident.
-- ══════════════════════════════════════════════════════════════════════

-- ═══ 1 · OPS ALERTS ═══════════════════════════════════════════════════
-- notifications.user_id is NOT NULL, so every notify(null,'ops_alert',…)
-- in the trust paths has been a silent no-op: the alerts that were meant
-- to say "a guest may be stranded, look now" went nowhere. Ops alerts get
-- their own table, addressed to nobody in particular, which is the point.
create table if not exists public.ops_alerts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,
  severity     text not null default 'warn' check (severity in ('info','warn','critical')),
  title        text not null,
  body         text,
  meta         jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ops_alerts_open
  on public.ops_alerts (created_at desc) where acknowledged_at is null;

alter table public.ops_alerts enable row level security;
drop policy if exists ops_alerts_ops on public.ops_alerts;
create policy ops_alerts_ops on public.ops_alerts for all to authenticated
  using (public.is_operator()) with check (public.is_operator());


-- ═══ 2 · THE WELCOME CELEBRATION, ONCE PER ACCOUNT ════════════════════
alter table public.user_points
  add column if not exists welcome_celebrated_at timestamptz;

-- Atomic and idempotent. Returns true exactly once in the life of an
-- account: the first caller wins the UPDATE, everyone after it matches
-- zero rows and gets false. There is no read-then-write window to lose.
create or replace function public.claim_welcome_celebration(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare hit uuid;
begin
  if p_user is null then return false; end if;

  update public.user_points
     set welcome_celebrated_at = now()
   where user_id = p_user
     and welcome_celebrated_at is null
     -- Never celebrate an empty gift. If the grant has not landed yet the
     -- client asks again on the next page, and the answer is true then.
     and coalesce(lifetime_points, 0) > 0
  returning user_id into hit;

  return hit is not null;
end; $$;

revoke all on function public.claim_welcome_celebration(uuid) from public, anon, authenticated;
grant execute on function public.claim_welcome_celebration(uuid) to service_role;

-- Existing accounts have already seen (or missed) their moment. Stamping
-- them now means shipping this does not fire a congratulations popup at
-- every user who has been with us for months.
update public.user_points
   set welcome_celebrated_at = coalesce(welcome_celebrated_at, updated_at, now())
 where welcome_celebrated_at is null;


-- ═══ 3 · REHOMING: WHO ASKED, WHO IS AT FAULT, WHO PAYS ═══════════════
alter table public.match_offers
  add column if not exists initiated_by     text not null default 'host',
  add column if not exists request_reason   text,
  add column if not exists fault            text,
  add column if not exists guest_pays_delta numeric not null default 0,
  add column if not exists platform_absorbs numeric not null default 0,
  add column if not exists broadcast_count  int     not null default 0,
  add column if not exists broadcast_at     timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'match_offers_initiated_by_ck'
  ) then
    alter table public.match_offers
      add constraint match_offers_initiated_by_ck
      check (initiated_by in ('host','guest','platform'));
  end if;
end $$;

create index if not exists idx_match_offers_open
  on public.match_offers (guest_id, status, created_at desc);

-- ── RLS, corrected ────────────────────────────────────────────────────
-- Reading your own offer: yes. Writing one: never from a browser.
--
-- What the old policies allowed, concretely: a host could INSERT a
-- match_offers row naming any `service_fee` (commission is 30% of it) and
-- any `candidates` (the platform absorbs the price gap up to whatever is
-- in that list), then wait for the guest to accept. It also skipped the
-- 24-hour gate entirely, since RLS cannot call match_allowed. And the
-- UPDATE policy let a guest reset an offer's status back to 'offered' and
-- accept it a second time — a second replacement booking, a second refund.
--
-- Every one of those paths now runs through the service role, which does
-- the arithmetic itself and never reads money off a client row.
drop policy if exists match_write  on public.match_offers;
drop policy if exists match_update on public.match_offers;

drop policy if exists match_read on public.match_offers;
create policy match_read on public.match_offers for select to authenticated
  using (guest_id = auth.uid() or origin_host_id = auth.uid() or public.is_operator());

create policy match_ops_write on public.match_offers for insert to authenticated
  with check (public.is_operator());
create policy match_ops_update on public.match_offers for update to authenticated
  using (public.is_operator()) with check (public.is_operator());

-- ── The sweep ─────────────────────────────────────────────────────────
-- find_match_candidates, with the price band and the distance ceiling
-- made arguments, so a guest-initiated sweep can be held to a tighter
-- window than a host-fault one without a second copy of the ranking
-- living somewhere else and drifting.
--
-- The column types below are the real ones, learned the hard way:
-- listings.id is uuid while apartment_bookings.apartment_id is text,
-- listings.photos is text[] not jsonb, and listings.beds/max_guests are
-- text because of the scraped-import era. Every one of those mismatches
-- used to throw at runtime and send this whole feature down its fallback
-- path. Casts and defensive parsing here, exactly as in
-- find_match_candidates, which this function generalises.
create or replace function public.find_rehome_candidates(
  p_booking uuid,
  p_limit   int     default 6,
  p_band    numeric default 0.25,   -- ± fraction of the original nightly rate
  p_max_km  numeric default null    -- null = no distance ceiling
) returns table (
  listing_id text, title text, location text, city text, price_night numeric,
  beds text, max_guests text, property_type text, photos jsonb,
  internal_score numeric, distance_km numeric, price_delta numeric, score numeric,
  host_id uuid, lat numeric, lng numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  b        public.apartment_bookings%rowtype;
  src      public.listings%rowtype;
  src_beds numeric;
  band     numeric := greatest(0.02, least(1.0, coalesce(p_band, 0.25)));
begin
  select * into b from public.apartment_bookings where id = p_booking;
  if not found then return; end if;
  select * into src from public.listings where id::text = b.apartment_id;
  if not found then return; end if;
  src_beds := case when src.beds ~ '^\d+(\.\d+)?$' then src.beds::numeric end;

  return query
  with pool as (
    select l.*,
           case when l.max_guests ~ '^\d+(\.\d+)?$' then l.max_guests::numeric end as max_guests_n,
           case when l.beds       ~ '^\d+(\.\d+)?$' then l.beds::numeric       end as beds_n,
           case when src.lat is null or l.lat is null then null
                else round((6371 * acos(least(1, greatest(-1,
                       cos(radians(src.lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(src.lng))
                     + sin(radians(src.lat))*sin(radians(l.lat)))))) ::numeric, 2) end as km
      from public.listings l
     where l.id::text <> b.apartment_id
       and l.status = 'active'
       -- Never route a guest back to the host they are being moved away
       -- from. Whatever went wrong is a fact about the host, not only the
       -- unit, and it would let that host earn the rehoming fee by
       -- shuffling their own inventory.
       and l.host_id is distinct from b.host_id
       and l.price_night between src.price_night * (1 - band)
                             and src.price_night * (1 + band)
  ),
  ranked as (
    select p.*,
           round(p.price_night - src.price_night, 2) as delta,
           round((
               35 * greatest(0, 1 - abs(p.price_night - src.price_night) / nullif(src.price_night,0))
             + 25 * (case when p.city is not distinct from src.city then 1 else 0.35 end)
             + 15 * greatest(0, 1 - (p.max_guests_n - coalesce(b.num_guests,1)) / 6)
             + 13 * (case when p.property_type is not distinct from src.property_type then 1 else 0 end)
             + 7  * (case when src_beds is null or p.beds_n is null then 0.5
                          else greatest(0, 1 - abs(p.beds_n - src_beds) / 4) end)
             + 5  * (coalesce(p.internal_score,50) / 100)
           )::numeric, 2) as fit
      from pool p
     where p.max_guests_n is not null
       and p.max_guests_n >= coalesce(b.num_guests, 1)
       and (p_max_km is null or p.km is null or p.km <= p_max_km)
       and not exists (
         select 1 from public.apartment_bookings ob
          where ob.apartment_id = p.id::text
            and ob.cancelled_at is null
            and ob.status in ('paid_pending_checkin','deposit_paid','part_paid','checked_in')
            and daterange(ob.checkin_date, ob.checkout_date, '[)')
                && daterange(b.checkin_date, b.checkout_date, '[)')
       )
       and coalesce((select pr.host_status from public.profiles pr where pr.id = p.host_id),'active') = 'active'
       and coalesce((select pr.banned      from public.profiles pr where pr.id = p.host_id), false) = false
  )
  select r.id::text, r.title, r.location, r.city,
         r.price_night, r.beds, r.max_guests,
         r.property_type, coalesce(to_jsonb(r.photos), '[]'::jsonb),
         r.internal_score, r.km, r.delta, r.fit,
         r.host_id, r.lat, r.lng
    from ranked r
   order by r.fit desc, coalesce(r.internal_score,50) desc
   limit greatest(1, least(24, coalesce(p_limit, 6)));
end; $$;

revoke all on function public.find_rehome_candidates(uuid,int,numeric,numeric) from public, anon, authenticated;
grant execute on function public.find_rehome_candidates(uuid,int,numeric,numeric) to service_role;

-- How many self-service rehome requests a guest has already spent on one
-- booking. Guests get a bounded number; the bound is what stops "request
-- a move" becoming a way to browse the whole inventory from inside a
-- booking they have already paid for.
create or replace function public.guest_rehome_requests_used(p_booking uuid)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.match_offers
   where booking_id = p_booking and initiated_by = 'guest';
$$;

revoke all on function public.guest_rehome_requests_used(uuid) from public, anon, authenticated;
grant execute on function public.guest_rehome_requests_used(uuid) to service_role;


-- ═══ 4 · WAS THIS STAY PAID IN FULL? ══════════════════════════════════
-- One definition, used by the rescue ride and by anything else that has
-- to know. A deposit is not a full payment, and a booking whose balance
-- flag was set without money arriving is not either — so this reads the
-- amounts, not just the flag.
create or replace function public.booking_fully_paid(p_booking uuid)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  b    public.apartment_bookings%rowtype;
  owed numeric;
  paid numeric;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  if not found then return false; end if;

  owed := coalesce(b.grand_total, 0);
  if owed <= 0 then return false; end if;

  -- amount_paid is the ledger's own tally of cleared instalments and is
  -- NOT NULL, backfilled for every booking that predates it. It is the
  -- authority here on purpose: balance_paid is a flag someone can set,
  -- while amount_paid only moves when money actually cleared.
  paid := coalesce(b.amount_paid, 0);

  -- One shilling of tolerance, for rounding between M-Pesa and our totals.
  return paid >= owed - 1;
end; $$;

/* Least privilege. Only the API calls this, and the API holds the
   service key. Left open to `authenticated`, any signed-in user could
   ask about any booking id they could guess or scrape and learn whether
   it is paid off — small, but it is somebody else's business. */
revoke all on function public.booking_fully_paid(uuid) from public, anon, authenticated;
grant execute on function public.booking_fully_paid(uuid) to service_role;


-- ═══ 5 · THE RESCUE RIDE: PAID IN FULL, ONCE IN A LIFETIME ════════════
alter table public.rescue_rides
  add column if not exists eligibility      text,
  add column if not exists booking_paid_full boolean,
  add column if not exists declined_reason  text;

-- The hard stop. One platform-funded rescue ride per guest, ever —
-- enforced by the index, not by remembering to check. Rides that we did
-- not pay for (declined, or covered by a host) are not counted, so a
-- guest who was refused one is not barred from a later valid one.
create unique index if not exists uq_rescue_ride_one_per_guest
  on public.rescue_rides (guest_id)
  where covered_by = 'platform_float' and guest_id is not null;

create or replace function public.dispatch_rescue_ride(
  p_issue uuid, p_booking uuid, p_guest uuid,
  p_from text, p_from_lat numeric, p_from_lng numeric,
  p_to   text, p_to_lat   numeric, p_to_lng   numeric,
  p_distance_km numeric, p_fare numeric, p_charge_host boolean default true
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  bal        numeric;
  rid        uuid;
  paid_full  boolean;
  prior      int;
  reason     text;
begin
  -- ── Gate 1 · the stay was paid in full ─────────────────────────────
  -- The ride is compensation on a completed transaction, not a service
  -- extended on a part-payment. A guest holding a deposit-only booking
  -- has not yet bought the thing we are compensating them for.
  paid_full := public.booking_fully_paid(p_booking);

  -- ── Gate 2 · once, ever ────────────────────────────────────────────
  select count(*)::int into prior
    from public.rescue_rides
   where guest_id = p_guest and covered_by = 'platform_float';

  if not paid_full then
    reason := 'not_paid_in_full';
  elsif prior > 0 then
    reason := 'already_used_lifetime_ride';
  end if;

  if reason is not null then
    -- Still record it. A guest we could not carry is a guest ops must
    -- look at by hand, and the row is the evidence that we saw them.
    insert into public.rescue_rides (issue_id,booking_id,guest_id,from_label,from_lat,from_lng,
                                     to_label,to_lat,to_lng,distance_km,estimated_fare,
                                     charged_to_host,status,covered_by,eligibility,
                                     booking_paid_full,declined_reason,ride_reference)
    values (p_issue,p_booking,p_guest,p_from,p_from_lat,p_from_lng,
            p_to,p_to_lat,p_to_lng,p_distance_km,p_fare,
            false,'needs_review','none',reason,paid_full,reason,
            'RESCUE-' || substr(replace(gen_random_uuid()::text,'-',''),1,10))
    returning id into rid;

    insert into public.ops_alerts (kind, severity, title, body, meta)
    values ('rescue_ride_declined','warn',
            'Rescue ride not auto-covered',
            case reason
              when 'not_paid_in_full' then
                'The guest had not paid this stay in full, so the ride is outside the offer. Decide by hand whether to carry them anyway.'
              else
                'This guest has already used their one covered rescue ride. Decide by hand whether to carry them again.'
            end,
            jsonb_build_object('ride_id', rid, 'issue_id', p_issue,
                               'booking_id', p_booking, 'guest_id', p_guest,
                               'fare', p_fare, 'reason', reason));

    return jsonb_build_object(
      'ride_id', rid, 'covered', false, 'eligible', false,
      'reason', reason, 'fare', p_fare, 'status', 'needs_review');
  end if;

  -- ── Eligible. Book it and debit the float. ─────────────────────────
  select public.float_balance() into bal;

  insert into public.rescue_rides (issue_id,booking_id,guest_id,from_label,from_lat,from_lng,
                                   to_label,to_lat,to_lng,distance_km,estimated_fare,
                                   charged_to_host,status,covered_by,eligibility,
                                   booking_paid_full,ride_reference)
  values (p_issue,p_booking,p_guest,p_from,p_from_lat,p_from_lng,
          p_to,p_to_lat,p_to_lng,p_distance_km,p_fare,
          p_charge_host, case when bal >= p_fare then 'assigned' else 'requested' end,
          'platform_float','lifetime_offer', true,
          'RESCUE-' || substr(replace(gen_random_uuid()::text,'-',''),1,10))
  returning id into rid;

  if bal >= p_fare then
    insert into public.platform_float (direction,amount,purpose,ref_type,ref_id,balance_after)
    values ('debit', p_fare, 'rescue_ride', 'rescue_ride', rid::text, bal - p_fare);
  else
    insert into public.ops_alerts (kind, severity, title, body, meta)
    values ('rescue_ride_float_dry','critical',
            'Rescue ride booked with a dry float',
            'The guest is eligible and is being moved. The float could not cover the fare — settle it manually now.',
            jsonb_build_object('ride_id', rid, 'booking_id', p_booking,
                               'guest_id', p_guest, 'fare', p_fare, 'float', bal));
  end if;

  if p_issue is not null then
    update public.checkin_issues set rescue_ride_id = rid where id = p_issue;
  end if;

  return jsonb_build_object(
    'ride_id', rid,
    'covered', bal >= p_fare,
    'eligible', true,
    'float_before', bal,
    'fare', p_fare,
    'status', case when bal >= p_fare then 'assigned' else 'awaiting_float' end
  );
end; $$;

revoke all on function public.dispatch_rescue_ride(uuid,uuid,uuid,text,numeric,numeric,text,numeric,numeric,numeric,numeric,boolean)
  from public, anon, authenticated;
grant execute on function public.dispatch_rescue_ride(uuid,uuid,uuid,text,numeric,numeric,text,numeric,numeric,numeric,numeric,boolean)
  to service_role;


-- ═══ 6 · CHECK-IN ISSUES: THE CLIENT MAY NOT GRADE ITS OWN EVIDENCE ═══
-- geo_distance_m decides a third of the confidence score that decides
-- fault, refunds and a free ride. It arrived from the browser. It is now
-- computed on write, from the coordinates and the listing, and a claimed
-- value is overwritten rather than trusted.
create or replace function public.trg_checkin_issue_geo()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  llat numeric; llng numeric;
begin
  select l.lat, l.lng into llat, llng
    from public.listings l where l.id::text = new.listing_id;

  if llat is null or llng is null or new.geo_lat is null or new.geo_lng is null then
    new.geo_distance_m := null;   -- unknown, and scored as unknown
  else
    new.geo_distance_m := round((6371000 * acos(least(1, greatest(-1,
        cos(radians(llat))*cos(radians(new.geo_lat))*cos(radians(new.geo_lng)-radians(llng))
      + sin(radians(llat))*sin(radians(new.geo_lat))))))::numeric, 0);
  end if;

  -- Likewise the clock: the guest does not get to say how long is left
  -- before their own check-in.
  new.hours_to_checkin := public.hours_to_checkin(new.booking_id);
  return new;
end; $$;

/* A trigger body needs no EXECUTE grant of its own: triggers run as the
   table's owner regardless of who may call the function by name. Left
   as it was, `anon` could invoke it over REST. */
revoke all on function public.trg_checkin_issue_geo() from public, anon, authenticated;

drop trigger if exists checkin_issue_geo on public.checkin_issues;
create trigger checkin_issue_geo
  before insert or update of geo_lat, geo_lng, listing_id on public.checkin_issues
  for each row execute function public.trg_checkin_issue_geo();
