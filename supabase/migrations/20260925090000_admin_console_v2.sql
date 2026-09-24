-- ══════════════════════════════════════════════════════════════════════
-- CABANA · ADMIN CONSOLE v2 — the operator data layer
-- ──────────────────────────────────────────────────────────────────────
-- The first console read the whole platform into the browser table by
-- table and computed everything there. That had three consequences:
--
--   · It could not see most of the business. tour_bookings, event_tickets,
--     car_bookings and booking_payments have no operator SELECT policy, so
--     the console's revenue, bookings and refunds silently excluded them.
--   · It wrote to columns that do not exist (profiles.full_name, role,
--     is_partner, is_verified), so "Save changes" on a user always failed.
--   · The audit log was write-anything: `with check (true)` for public,
--     and the console only ever displayed a localStorage mirror of it.
--
-- This migration moves the operator's view of the platform into Postgres:
-- one SECURITY DEFINER function per question the console asks, each gated
-- on the admin roster. Nothing here widens a table policy; the functions
-- are the only door, and every door checks the roster first.
--
-- Idempotent and additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1 · ONE ROSTER ────────────────────────────────────────────────────
-- Three functions answered "is this an operator?" and two of them had the
-- same two emails typed in. Adding a teammate to admin_users gave them the
-- support desk but not the console's RLS. All three now read the roster.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users a
     where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select public.is_admin(); $$;

create or replace function public.is_apa_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select public.is_admin(); $$;

create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select a.role from public.admin_users a
   where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
   limit 1;
$$;

revoke all on function public.admin_role() from public, anon;
grant execute on function public.admin_role() to authenticated;

-- ── 2 · PRIVATE SCHEMA FOR CONSOLE INTERNALS ─────────────────────────
-- Views and helpers the RPCs share. Never exposed through PostgREST.
create schema if not exists cabana_admin;
revoke all on schema cabana_admin from public, anon, authenticated;

create or replace function cabana_admin.guard()
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
end;
$$;

-- Status words differ per service. The console reasons about five stages.
create or replace function cabana_admin.stage(p_status text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_status is null then 'open'
    when p_status in ('cancelled','guest_cancelled','host_cancelled','expired','declined',
                      'refunded','dates_unavailable','unfulfilled','unable','failed',
                      'rejected','void','voided','no_show') then 'lost'
    when p_status in ('rehomed') then 'moved'
    when p_status in ('checked_in','completed','closed','ticketed','in_progress','arrived',
                      'fulfilled') then 'fulfilled'
    when p_status in ('confirmed','confirmed_balance_due','deposit_paid','paid',
                      'paid_pending_checkin','accepted','ready','on_the_way','assigned',
                      'arriving','issued') then 'secured'
    else 'open'
  end;
$$;

-- ── 3 · EVERY BOOKING, ONE SHAPE ─────────────────────────────────────
-- Stays, tours, events, car hire, food, flights and rides live in seven
-- tables with seven vocabularies. The console sees one list.
create or replace view cabana_admin.bookings as
select 'stay'::text                                           as service,
       b.id::text                                             as id,
       coalesce(nullif(b.payment_reference,''), b.id::text)   as ref,
       b.created_at,
       b.status,
       cabana_admin.stage(b.status)                           as stage,
       b.guest_id,
       coalesce(nullif(btrim(b.guest_name),''),
                nullif(btrim(concat_ws(' ', gp.first_name, gp.last_name)),''),
                'Guest')                                      as guest_name,
       coalesce(nullif(b.guest_phone,''), nullif(b.contact_phone,''), b.contact_whatsapp, gp.phone) as guest_phone,
       coalesce(nullif(b.contact_email,''), gp.email)         as guest_email,
       coalesce(b.host_id, l.partner_id)                      as host_id,
       coalesce(b.listing_id::text, b.apartment_id)           as item_id,
       coalesce(nullif(b.listing_name,''), nullif(b.apartment_name,''), l.title, 'Stay') as item_title,
       coalesce(l.city, b.location)                           as city,
       b.checkin_date                                         as starts_on,
       b.checkout_date                                        as ends_on,
       b.nights                                               as units,
       'night'::text                                          as unit_label,
       coalesce(b.grand_total, 0)::numeric                    as total,
       coalesce(b.service_fee, 0)::numeric                    as fee,
       coalesce(b.amount_paid, 0)::numeric                    as paid,
       'KES'::text                                            as currency,
       coalesce(b.refund_due, 0)::numeric                     as refund_due,
       coalesce(b.refund_amount, 0)::numeric                  as refunded,
       coalesce(b.credit_applied, 0)::numeric                 as credit,
       b.cancelled_at,
       b.checked_in_at,
       'apartment_bookings'::text                             as source_table
  from public.apartment_bookings b
  left join public.listings l  on l.id = b.listing_id
  left join public.profiles gp on gp.id = b.guest_id
union all
select 'tour', t.id::text, coalesce(nullif(t.payment_reference,''), t.id::text), t.created_at,
       t.status, cabana_admin.stage(t.status), t.guest_id,
       coalesce(nullif(btrim(concat_ws(' ', gp.first_name, gp.last_name)),''), 'Guest'),
       coalesce(nullif(t.contact_phone,''), t.contact_whatsapp, gp.phone),
       coalesce(nullif(t.contact_email,''), gp.email),
       coalesce(t.host_id, tr.owner_id),
       t.tour_id::text, coalesce(nullif(t.tour_name,''), tr.title, 'Tour'),
       coalesce(tr.destination, tr.county),
       t.tour_date, t.tour_date, t.num_people, 'person',
       coalesce(t.grand_total,0)::numeric, coalesce(t.service_fee,0)::numeric,
       coalesce(t.amount_paid,0)::numeric, 'KES',
       coalesce(t.refund_due,0)::numeric, 0::numeric, coalesce(t.credit_applied,0)::numeric,
       t.cancelled_at, t.checked_in_at, 'tour_bookings'
  from public.tour_bookings t
  left join public.tours tr    on tr.id = t.tour_id
  left join public.profiles gp on gp.id = t.guest_id
union all
select 'event', e.id::text, coalesce(nullif(e.payment_reference,''), nullif(e.confirmation_code,''), e.id::text),
       e.created_at, e.status, cabana_admin.stage(e.status), e.guest_id,
       coalesce(nullif(btrim(concat_ws(' ', gp.first_name, gp.last_name)),''), 'Guest'),
       coalesce(nullif(e.contact_phone,''), gp.phone), gp.email,
       coalesce(e.host_id, ev.owner_id),
       e.event_id::text, coalesce(nullif(e.event_name,''), ev.title, 'Event'),
       ev.city, (ev.starts_at at time zone 'Africa/Nairobi')::date, (ev.starts_at at time zone 'Africa/Nairobi')::date,
       e.quantity, 'ticket',
       coalesce(e.grand_total,0)::numeric, coalesce(e.service_fee,0)::numeric,
       coalesce(e.amount_paid,0)::numeric, coalesce(ev.currency,'KES'),
       coalesce(e.refund_due,0)::numeric, 0::numeric, coalesce(e.credit_applied,0)::numeric,
       e.cancelled_at, e.checked_in_at, 'event_tickets'
  from public.event_tickets e
  left join public.events ev   on ev.id = e.event_id
  left join public.profiles gp on gp.id = e.guest_id
union all
select 'car', c.id::text, coalesce(nullif(c.ref,''), c.id::text), c.created_at,
       c.status, cabana_admin.stage(c.status), c.user_id,
       coalesce(nullif(btrim(c.customer_name),''), 'Customer'), c.phone, c.email,
       co.owner_id, c.vehicle_id::text,
       coalesce(nullif(btrim(concat_ws(' ', f.make, f.model)),''), 'Vehicle hire'),
       co.city, c.starts_on, c.ends_on, c.days, 'day',
       coalesce(c.total,0)::numeric, 0::numeric,
       case when cabana_admin.stage(c.status) in ('secured','fulfilled') then coalesce(c.total,0)::numeric else 0::numeric end,
       coalesce(co.currency_code,'KES'), 0::numeric, 0::numeric, 0::numeric,
       null::timestamptz, null::timestamptz, 'car_bookings'
  from public.car_bookings c
  left join public.car_fleet f     on f.id = c.vehicle_id
  left join public.car_operators co on co.id = c.operator_id
union all
select 'food', o.id::text, coalesce(nullif(o.ref,''), o.id::text), o.created_at,
       o.status, cabana_admin.stage(o.status), o.guest_id,
       coalesce(nullif(btrim(o.diner_name),''), 'Diner'), o.diner_phone, gp.email,
       coalesce(o.kitchen_user, l.partner_id), o.listing_id::text, coalesce(l.title, 'Food order'),
       l.city, (o.created_at at time zone 'Africa/Nairobi')::date, null::date,
       o.item_count, 'item',
       coalesce(o.total,0)::numeric, 0::numeric,
       case when o.status = 'completed' or o.payment_confirmed_at is not null then coalesce(o.total,0)::numeric else 0::numeric end,
       coalesce(o.currency,'KES'), 0::numeric, 0::numeric, 0::numeric,
       o.cancelled_at, o.completed_at, 'food_orders'
  from public.food_orders o
  left join public.listings l  on l.id = o.listing_id
  left join public.profiles gp on gp.id = o.guest_id
union all
select 'flight', fb.id::text, coalesce(nullif(fb.ref,''), fb.id::text), fb.created_at,
       coalesce(fb.status, fb.payment_status), cabana_admin.stage(coalesce(fb.status, fb.payment_status)), fb.user_id,
       coalesce(nullif(btrim(fr.contact_name),''), nullif(btrim(concat_ws(' ', gp.first_name, gp.last_name)),''), 'Traveller'),
       fr.contact_phone, coalesce(fr.contact_email, gp.email),
       null::uuid, fb.request_id::text,
       coalesce(nullif(btrim(concat_ws(' → ', fr.origin_iata, fr.dest_iata)),''), fb.airline_name, 'Flight'),
       fr.dest_iata, fr.depart_date, fr.return_date,
       coalesce(fr.adults,0) + coalesce(fr.children,0) + coalesce(fr.infants,0), 'traveller',
       coalesce(fb.amount,0)::numeric, greatest(coalesce(fb.amount,0) - coalesce(fb.net_cost, fb.amount, 0), 0)::numeric,
       coalesce(fb.amount_paid,0)::numeric, coalesce(fb.currency,'KES'),
       0::numeric, 0::numeric, 0::numeric, null::timestamptz, fb.issued_at, 'flight_bookings'
  from public.flight_bookings fb
  left join public.flight_requests fr on fr.id = fb.request_id
  left join public.profiles gp        on gp.id = fb.user_id
union all
select 'ride', r.id::text, coalesce(nullif(r.ref,''), r.id::text), r.created_at,
       r.status, cabana_admin.stage(r.status), r.rider_id,
       coalesce(nullif(btrim(r.rider_name),''), 'Rider'), r.rider_phone, r.rider_email,
       null::uuid, r.id::text,
       coalesce(nullif(btrim(concat_ws(' → ', r.pickup_label, r.dropoff_label)),''), 'Ride'),
       r.city, (coalesce(r.scheduled_for, r.created_at) at time zone 'Africa/Nairobi')::date, null::date,
       r.passengers, 'passenger',
       coalesce(r.approved_quote_minor / 100.0, r.final_fare, r.quote_total, 0)::numeric, 0::numeric,
       case when r.status = 'completed' then coalesce(r.final_fare, r.approved_quote_minor / 100.0, 0)::numeric else 0::numeric end,
       coalesce(r.approved_quote_currency, 'KES'), 0::numeric, 0::numeric, 0::numeric,
       r.cancelled_at, r.completed_at, 'ride_requests'
  from public.ride_requests r;

revoke all on cabana_admin.bookings from public, anon, authenticated;

-- ── 4 · TAMPER-PROOF AUDIT ───────────────────────────────────────────
-- The log was insertable by anyone with any actor. Now: operators only,
-- and the actor is always read from the signed JWT, never the payload.
drop policy if exists audit_insert on public.admin_audit_log;
drop policy if exists audit_insert_admin on public.admin_audit_log;
create policy audit_insert_admin on public.admin_audit_log
  for insert to authenticated with check (public.is_admin());

-- Deliberately SECURITY INVOKER: current_user must be the caller's role,
-- not the owner's, or the check below could never see 'authenticated'.
create or replace function public.admin_audit_stamp()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.actor_email := lower(coalesce(auth.jwt() ->> 'email', 'unknown'));
    new.created_at  := now();
  end if;
  new.meta := coalesce(new.meta, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists admin_audit_stamp_t on public.admin_audit_log;
create trigger admin_audit_stamp_t
  before insert on public.admin_audit_log
  for each row execute function public.admin_audit_stamp();

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx  on public.admin_audit_log (target_type, target_id);

create or replace function cabana_admin.log(p_action text, p_type text, p_id text, p_meta jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.admin_audit_log (action, target_type, target_id, actor_email, meta, created_at)
  values (p_action, p_type, p_id, lower(coalesce(auth.jwt() ->> 'email', 'system')),
          coalesce(p_meta, '{}'::jsonb), now());
$$;

-- Public entry point for the console's own writes (catalogue, ads, …).
create or replace function public.admin_log(p_action text, p_target_type text, p_target_id text, p_meta jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  perform cabana_admin.log(left(p_action, 80), left(coalesce(p_target_type,'unknown'), 40),
                           left(p_target_id, 120), coalesce(p_meta, '{}'::jsonb));
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 5 · WHO AM I ─────────────────────────────────────────────────────
create or replace function public.admin_whoami()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  a public.admin_users%rowtype;
  p public.profiles%rowtype;
begin
  select * into a from public.admin_users where lower(email) = v_email limit 1;
  if not found then
    return jsonb_build_object('admin', false, 'email', v_email);
  end if;
  select * into p from public.profiles where id = auth.uid();
  return jsonb_build_object(
    'admin', true,
    'email', v_email,
    'role', coalesce(a.role, 'admin'),
    'name', coalesce(nullif(a.name,''), nullif(btrim(concat_ws(' ', p.first_name, p.last_name)),''), split_part(v_email, '@', 1)),
    'team', (select count(*) from public.admin_users),
    'server_time', now()
  );
end;
$$;

-- ── 6 · THE OVERVIEW ─────────────────────────────────────────────────
create or replace function public.admin_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 730));
  v_now  timestamptz := now();
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 730)));
  v_prev timestamptz := now() - make_interval(days => 2 * greatest(1, least(coalesce(p_days, 30), 730)));
  v_tz   text := 'Africa/Nairobi';
  out jsonb;
begin
  perform cabana_admin.guard();

  with b as (select * from cabana_admin.bookings where created_at >= v_prev),
  cur as (select * from b where created_at >= v_from),
  prv as (select * from b where created_at <  v_from),
  k as (
    select
      (select count(*) from cur)                                                        as bookings,
      (select count(*) from prv)                                                        as bookings_prev,
      (select count(*) from cur where stage in ('secured','fulfilled'))                 as secured,
      (select count(*) from prv where stage in ('secured','fulfilled'))                 as secured_prev,
      (select coalesce(sum(total),0) from cur where stage in ('secured','fulfilled'))   as gmv,
      (select coalesce(sum(total),0) from prv where stage in ('secured','fulfilled'))   as gmv_prev,
      (select coalesce(sum(fee),0)   from cur where stage in ('secured','fulfilled'))   as revenue,
      (select coalesce(sum(fee),0)   from prv where stage in ('secured','fulfilled'))   as revenue_prev,
      (select coalesce(sum(paid),0)  from cur)                                          as collected,
      (select coalesce(sum(paid),0)  from prv)                                          as collected_prev,
      (select coalesce(sum(total),0) from cur)                                          as demand,
      (select count(*) from public.profiles where created_at >= v_from)                 as signups,
      (select count(*) from public.profiles where created_at >= v_prev and created_at < v_from) as signups_prev,
      (select count(*) from public.listings where created_at >= v_from and deleted_at is null) as listings_new,
      (select count(*) from public.listings where created_at >= v_prev and created_at < v_from and deleted_at is null) as listings_new_prev,
      (select count(distinct visitor_id) from public.site_visits where created_at >= v_from) as visitors,
      (select count(distinct visitor_id) from public.site_visits where created_at >= v_prev and created_at < v_from) as visitors_prev
  )
  select jsonb_build_object(
    'range', jsonb_build_object('days', v_days, 'from', v_from, 'to', v_now),
    'kpis', (select to_jsonb(k) from k),
    'totals', jsonb_build_object(
      'users',          (select count(*) from public.profiles),
      'hosts',          (select count(distinct partner_id) from public.listings
                          where partner_id is not null and deleted_at is null
                            and coalesce(status,'') not in ('deleted','removed')),
      'live_listings',  (select count(*) from public.listings
                          where is_active and status = 'active' and deleted_at is null),
      'all_listings',   (select count(*) from public.listings
                          where deleted_at is null and coalesce(status,'') not in ('deleted','removed')),
      'live_tours',     (select count(*) from public.tours where status = 'published'),
      'live_events',    (select count(*) from public.events where status = 'published' and (ends_at is null or ends_at > v_now)),
      'fleet',          (select count(*) from public.car_fleet where status = 'active'),
      'push_subscribers', (select count(*) from public.push_subscriptions),
      'bookings_all',   (select count(*) from cabana_admin.bookings),
      'collected_all',  (select coalesce(sum(paid),0) from cabana_admin.bookings)
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'd', d.day::date,
               'bookings',  coalesce(bk.n, 0),
               'secured',   coalesce(bk.s, 0),
               'gmv',       coalesce(bk.gmv, 0),
               'collected', coalesce(bk.paid, 0),
               'revenue',   coalesce(bk.fee, 0),
               'signups',   coalesce(su.n, 0),
               'visitors',  coalesce(vi.n, 0)
             ) order by d.day), '[]'::jsonb)
        from generate_series((v_from at time zone v_tz)::date, (v_now at time zone v_tz)::date, interval '1 day') as d(day)
        left join (
          select (created_at at time zone v_tz)::date as day,
                 count(*) as n,
                 count(*) filter (where stage in ('secured','fulfilled')) as s,
                 sum(total) filter (where stage in ('secured','fulfilled')) as gmv,
                 sum(fee)   filter (where stage in ('secured','fulfilled')) as fee,
                 sum(paid) as paid
            from cabana_admin.bookings where created_at >= v_from group by 1
        ) bk on bk.day = d.day::date
        left join (
          select (created_at at time zone v_tz)::date as day, count(*) as n
            from public.profiles where created_at >= v_from group by 1
        ) su on su.day = d.day::date
        left join (
          select (created_at at time zone v_tz)::date as day, count(distinct visitor_id) as n
            from public.site_visits where created_at >= v_from group by 1
        ) vi on vi.day = d.day::date
    ),
    'services', (
      select coalesce(jsonb_agg(x order by x->>'service'), '[]'::jsonb) from (
        select jsonb_build_object(
                 'service', service,
                 'bookings', count(*),
                 'secured', count(*) filter (where stage in ('secured','fulfilled')),
                 'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
                 'collected', coalesce(sum(paid),0),
                 'revenue', coalesce(sum(fee) filter (where stage in ('secured','fulfilled')),0)) as x
          from cabana_admin.bookings where created_at >= v_from group by service
      ) s
    ),
    -- Every step is a measured event. The session layer's listing and
    -- checkout counters are not populated in production, so the funnel is
    -- built from page visits and bookings, which are.
    'funnel', jsonb_build_array(
      jsonb_build_object('label','Visitors', 'value',
        (select count(distinct visitor_id) from public.site_visits where created_at >= v_from)),
      jsonb_build_object('label','Explored a service', 'value',
        (select count(distinct visitor_id) from public.site_visits where created_at >= v_from
            and split_part(split_part(page,'?',1),'#',1) ~* '^/(apartments|events|tours|roommates|carhire|food|shopping|rides|flights|restaurant|order|cabana|world|destinations)(\.html)?/?$')),
      jsonb_build_object('label','Signed in', 'value',
        (select count(distinct user_id) from public.site_visits where created_at >= v_from and user_id is not null)),
      jsonb_build_object('label','Booked', 'value',
        (select count(*) from cabana_admin.bookings where created_at >= v_from)),
      jsonb_build_object('label','Paid', 'value',
        (select count(*) from cabana_admin.bookings where created_at >= v_from and stage in ('secured','fulfilled')))
    ),
    'top_listings', (
      select coalesce(jsonb_agg(t order by (t->>'gmv')::numeric desc, (t->>'bookings')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('service', service, 'item_id', item_id, 'title', max(item_title),
                                  'bookings', count(*),
                                  'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
                                  'collected', coalesce(sum(paid),0)) as t
          from cabana_admin.bookings where created_at >= v_from and item_id is not null
         group by service, item_id
         order by coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0) desc, count(*) desc
         limit 6
      ) q
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', src, 'visitors', n) order by n desc), '[]'::jsonb) from (
        select coalesce(nullif(source,''), case when coalesce(referrer,'') = '' then 'direct' else 'referral' end) as src,
               count(distinct visitor_id) as n
          from public.site_visits where created_at >= v_from
         group by 1 order by 2 desc limit 8
      ) s
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', dev, 'visitors', n) order by n desc), '[]'::jsonb) from (
        select coalesce(nullif(device_type,''), 'unknown') as dev, count(distinct visitor_id) as n
          from public.site_visits where created_at >= v_from group by 1
      ) s
    ),
    'recent', (
      select coalesce(jsonb_agg(r order by (r->>'at') desc), '[]'::jsonb) from (
        (select jsonb_build_object('kind','booking','at',created_at,'service',service,'id',id,'ref',ref,
                                   'title',item_title,'who',guest_name,'amount',total,'status',status,'stage',stage) as r
           from cabana_admin.bookings order by created_at desc limit 8)
        union all
        (select jsonb_build_object('kind','signup','at',p.created_at,'id',p.id,
                                   'title',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''), split_part(p.email,'@',1), 'New member'),
                                   'who',p.email) from public.profiles p order by p.created_at desc limit 6)
        union all
        (select jsonb_build_object('kind','listing','at',l.created_at,'id',l.id,'title',l.title,'who',l.city,
                                   'service',l.service,'status',l.status) from public.listings l
          where l.deleted_at is null order by l.created_at desc limit 6)
      ) q
    )
  ) into out;

  return out;
end;
$$;

-- ── 7 · THE INBOX: every queue a human must clear ─────────────────────
create or replace function public.admin_inbox()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  items jsonb := '[]'::jsonb;
  counts jsonb := '{}'::jsonb;
  v_n int;
  v jsonb;
begin
  perform cabana_admin.guard();

  -- SOS: a person asked for help. Always first.
  select count(*) into v_n from public.sos_alerts where status in ('open','acknowledged');
  counts := counts || jsonb_build_object('sos', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','sos','severity','critical','id',s.id,
      'title', 'SOS · ' || initcap(s.category) || ' — ' || coalesce(s.display_name, s.email, 'guest'),
      'sub', coalesce(s.place_label, case when s.latitude is not null then round(s.latitude::numeric,4) || ', ' || round(s.longitude::numeric,4) end, 'Location unknown')
             || case when s.status = 'acknowledged' then ' · acknowledged' else '' end,
      'at', s.created_at, 'link', '#/safety?tab=sos&id=' || s.id) as x
      from public.sos_alerts s where s.status in ('open','acknowledged') order by s.created_at desc limit 10) q;
  items := items || v;

  -- Check-in issues: a guest is at a door that did not open.
  select count(*) into v_n from public.checkin_issues where coalesce(status,'open') not in ('resolved','closed','refunded','redirected','dismissed');
  counts := counts || jsonb_build_object('checkin', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','checkin','severity','high','id',c.id,
      'title','Check-in issue · ' || replace(coalesce(c.issue_code,'reported'),'_',' '),
      'sub', coalesce(l.title, 'Listing ' || c.listing_id) || ' · ' || coalesce(c.status,'open') || coalesce(' · fault: ' || c.fault, ''),
      'at', c.created_at, 'link', '#/safety?tab=checkin&id=' || c.id) as x
      from public.checkin_issues c left join public.listings l on l.id::text = c.listing_id
     where coalesce(c.status,'open') not in ('resolved','closed','refunded','redirected','dismissed')
     order by c.created_at desc limit 8) q;
  items := items || v;

  -- Support threads waiting on a human.
  select count(*) into v_n from public.support_threads where status = 'queued' or (status in ('assigned','waiting') and unread_agent > 0);
  counts := counts || jsonb_build_object('support', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','support',
      'severity', case when t.priority in ('urgent','high') or t.sentiment in ('angry','frustrated') then 'high' else 'med' end,
      'id',t.id,'title', coalesce(nullif(t.subject,''), 'Support conversation') || ' — ' || coalesce(t.display_name, t.email, 'guest'),
      'sub', left(coalesce(t.last_message,''), 120), 'at', coalesce(t.last_message_at, t.created_at),
      'link','/support-console') as x
      from public.support_threads t
     where t.status = 'queued' or (t.status in ('assigned','waiting') and t.unread_agent > 0)
     order by coalesce(t.last_message_at, t.created_at) desc limit 8) q;
  items := items || v;

  -- Disputes.
  select count(*) into v_n from public.disputes where coalesce(status,'open') not in ('resolved','closed','dismissed');
  counts := counts || jsonb_build_object('disputes', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','disputes','severity','high','id',d.id,
      'title','Dispute · ' || coalesce(d.category,'general') || ' · booking ' || coalesce(d.booking_id,'—'),
      'sub', left(coalesce(d.description,''),120), 'at', d.created_at, 'link','#/safety?tab=disputes&id=' || d.id) as x
      from public.disputes d where coalesce(d.status,'open') not in ('resolved','closed','dismissed')
     order by d.created_at desc limit 6) q;
  items := items || v;

  -- Hosts on three yellow cards: listings suppressed, waiting for a decision.
  select count(*) into v_n from public.profiles where host_status = 'under_review';
  counts := counts || jsonb_build_object('host_review', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','host_review','severity','high','id',p.id,
      'title','Host under review — ' || coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''), p.email),
      'sub', public.active_yellow_count(p.id) || ' active yellow cards · listings suppressed',
      'at', p.host_suspended_at, 'link','#/people/' || p.id) as x
      from public.profiles p where p.host_status = 'under_review' order by p.host_suspended_at desc nulls last limit 6) q;
  items := items || v;

  -- Supply awaiting review. Hosts publish instantly, so review is the
  -- operator's quality pass after the fact: anything live nobody has
  -- looked at, plus anything explicitly held for review.
  select count(*) into v_n from public.listings
   where deleted_at is null
     and ((status = 'active' and approved_at is null) or status in ('pending','draft','review','under_review'));
  counts := counts || jsonb_build_object('listings', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','listings','severity', case when l.status in ('pending','review','under_review') then 'high' else 'med' end,
      'id', l.id, 'title', coalesce(l.title,'Untitled listing'),
      'sub', initcap(coalesce(l.service, l.type, 'stay')) || ' · ' || coalesce(l.city, l.area, '—') || ' · '
             || case when l.status = 'active' then 'live, not yet reviewed' else replace(l.status,'_',' ') end,
      'at', l.created_at, 'link', '#/listings/' || l.id) as x
      from public.listings l
     where l.deleted_at is null
       and ((l.status = 'active' and l.approved_at is null) or l.status in ('pending','draft','review','under_review'))
     order by l.created_at desc limit 8) q;
  items := items || v;

  -- Tours and events submitted by partners.
  select count(*) into v_n from public.tours where status = 'pending';
  counts := counts || jsonb_build_object('tours', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','tours','severity','med','id',t.id,'title','Tour · ' || t.title,
      'sub', coalesce(t.destination, t.county, '—') || ' · awaiting publication', 'at', t.created_at, 'link','#/tours') as x
      from public.tours t where t.status = 'pending' order by t.created_at desc limit 6) q;
  items := items || v;

  select count(*) into v_n from public.events where status = 'pending';
  counts := counts || jsonb_build_object('events', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','events','severity','med','id',e.id,'title','Event · ' || e.title,
      'sub', coalesce(e.venue, e.city, '—') || coalesce(' · ' || to_char(e.starts_at at time zone 'Africa/Nairobi','DD Mon'), ''),
      'at', e.created_at, 'link','#/events') as x
      from public.events e where e.status = 'pending' order by e.created_at desc limit 6) q;
  items := items || v;

  -- Businesses waiting to be let in.
  select (select count(*) from public.tour_operators where status = 'pending')
       + (select count(*) from public.event_organisers where status = 'pending')
       + (select count(*) from public.car_operators where not coalesce(verified,false))
       + (select count(*) from public.drivers where status = 'applied')
    into v_n;
  counts := counts || jsonb_build_object('operators', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select * from (
      select jsonb_build_object('queue','operators','severity','med','id',o.id::text,'title','Tour operator · ' || o.name,
        'sub', coalesce(o.email,'') || coalesce(' · ' || o.county,''), 'at', o.created_at, 'link','#/tours') as x, o.created_at as at
        from public.tour_operators o where o.status = 'pending'
      union all
      select jsonb_build_object('queue','operators','severity','med','id',o.id::text,'title','Event organiser · ' || o.name,
        'sub', coalesce(o.email,'') || coalesce(' · ' || o.city,''), 'at', o.created_at, 'link','#/events'), o.created_at
        from public.event_organisers o where o.status = 'pending'
      union all
      select jsonb_build_object('queue','operators','severity','med','id',o.id::text,'title','Car-hire operator · ' || o.name,
        'sub', coalesce(o.city,'') || ' · fleet ' || coalesce(o.fleet_size,0), 'at', o.created_at, 'link','#/move'), o.created_at
        from public.car_operators o where not coalesce(o.verified,false)
      union all
      select jsonb_build_object('queue','operators','severity','med','id',d.id::text,'title','Driver application · ' || d.full_name,
        'sub', coalesce(d.city,'') || coalesce(' · ' || d.country_code,''), 'at', d.created_at, 'link','#/move'), d.created_at
        from public.drivers d where d.status = 'applied'
    ) z order by at desc limit 8) q;
  items := items || v;

  -- Identity documents.
  select (select count(*) from public.agents where kyc_status = 'submitted')
       + (select count(*) from public.id_verifications where status in ('pending','submitted'))
    into v_n;
  counts := counts || jsonb_build_object('kyc', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','kyc','severity','med','id',a.id,'title','Agent ID check · ' || a.full_name,
      'sub', coalesce(a.email,'') || ' · submitted ' || to_char(a.kyc_submitted_at at time zone 'Africa/Nairobi','DD Mon'),
      'at', coalesce(a.kyc_submitted_at, a.created_at), 'link','#/agents') as x
      from public.agents a where a.kyc_status = 'submitted' order by a.kyc_submitted_at desc nulls last limit 6) q;
  items := items || v;

  -- Money owed out.
  select count(*) into v_n from public.referral_withdrawals where status = 'pending';
  counts := counts || jsonb_build_object('withdrawals', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','withdrawals','severity','med','id',w.id,
      'title','Withdrawal · KES ' || to_char(w.amount_kes,'FM999,999,990'),
      'sub', coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''), p.email, 'member') || ' · M-Pesa ' || coalesce(w.mpesa_number,'—'),
      'at', w.created_at, 'link','#/finance?tab=withdrawals') as x
      from public.referral_withdrawals w left join public.profiles p on p.id = w.user_id
     where w.status = 'pending' order by w.created_at limit 6) q;
  items := items || v;

  select count(*) into v_n from public.apartment_bookings where coalesce(refund_due,0) > 0;
  counts := counts || jsonb_build_object('refunds', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','refunds','severity','high','id',b.id,
      'title','Refund owed · KES ' || to_char(b.refund_due,'FM999,999,990'),
      'sub', coalesce(b.guest_name,'Guest') || ' · ' || coalesce(b.listing_name, b.apartment_name, 'stay') || ' · ' || coalesce(b.refund_reason,''),
      'at', coalesce(b.cancelled_at, b.created_at), 'link','#/bookings/stay/' || b.id) as x
      from public.apartment_bookings b where coalesce(b.refund_due,0) > 0 order by b.created_at desc limit 6) q;
  items := items || v;

  -- Travel desk.
  select count(*) into v_n from public.flight_requests where status in ('new','working');
  counts := counts || jsonb_build_object('flights', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','flights',
      'severity', case when f.sla_due_at is not null and f.sla_due_at < now() then 'high' else 'med' end,
      'id',f.id,'title','Flight request ' || f.ref || ' · ' || coalesce(f.origin_iata,'?') || ' → ' || coalesce(f.dest_iata,'?'),
      'sub', coalesce(f.contact_name,'') || ' · ' || to_char(f.depart_date,'DD Mon') || ' · ' || f.status,
      'at', f.created_at, 'link','#/flights') as x
      from public.flight_requests f where f.status in ('new','working') order by f.created_at limit 6) q;
  items := items || v;

  select count(*) into v_n from public.ride_requests where status = 'quote_pending' or pricing_status = 'awaiting_quote';
  counts := counts || jsonb_build_object('rides', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','rides','severity','med','id',r.id,
      'title','Ride quote needed · ' || coalesce(r.ref, left(r.id::text,8)),
      'sub', coalesce(r.pickup_label,'?') || ' → ' || coalesce(r.dropoff_label,'?'), 'at', r.created_at, 'link','#/move') as x
      from public.ride_requests r where r.status = 'quote_pending' or r.pricing_status = 'awaiting_quote'
     order by r.created_at limit 6) q;
  items := items || v;

  -- Paid 3D tours waiting on a shoot.
  select count(*) into v_n from public.tour3d_requests where status in ('new','contacted','scheduled');
  counts := counts || jsonb_build_object('tour3d', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','tour3d','severity', case when t.status = 'new' then 'med' else 'low' end,'id',t.id,
      'title','3D tour · ' || coalesce(l.title,'listing'),
      'sub', coalesce(t.contact_name,'') || ' · ' || t.status || coalesce(' · ' || t.best_time,''),
      'at', t.created_at, 'link','#/listings/' || t.listing_id) as x
      from public.tour3d_requests t left join public.listings l on l.id = t.listing_id
     where t.status in ('new','contacted','scheduled') order by t.created_at limit 6) q;
  items := items || v;

  -- Hosts who asked us to list for them.
  select count(*) into v_n from public.lazy_requests where status = 'pending';
  counts := counts || jsonb_build_object('leads', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','leads','severity','low','id',r.id,'title','List-for-me request · ' || coalesce(r.name,'—'),
      'sub', coalesce(r.listing_type,'listing') || ' · ' || coalesce(r.phone,''), 'at', r.created_at, 'link','#/leads') as x
      from public.lazy_requests r where r.status = 'pending' order by r.created_at limit 6) q;
  items := items || v;

  -- Calendar double-bookings.
  select count(*) into v_n from public.calendar_conflicts where status = 'open';
  counts := counts || jsonb_build_object('conflicts', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','conflicts','severity', case when c.severity = 'critical' then 'high' else 'med' end,'id',c.id,
      'title','Calendar conflict · ' || coalesce(l.title,'listing') || ' · ' || coalesce(c.platform,''),
      'sub', lower(c.overlap)::text || ' → ' || upper(c.overlap)::text || coalesce(' · booking ' || c.booking_ref,''),
      'at', c.detected_at, 'link','#/listings/' || c.listing_id) as x
      from public.calendar_conflicts c left join public.listings l on l.id = c.listing_id
     where c.status = 'open' order by c.detected_at desc limit 6) q;
  items := items || v;

  -- System alerts raised by the platform itself.
  select count(*) into v_n from public.ops_alerts where acknowledged_at is null;
  counts := counts || jsonb_build_object('ops', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue','ops','severity', case when a.severity = 'critical' then 'critical' when a.severity = 'warn' then 'high' else 'low' end,
      'id',a.id,'title',a.title,'sub',left(coalesce(a.body,''),140),'at',a.created_at,'link','#/health') as x
      from public.ops_alerts a where a.acknowledged_at is null order by a.created_at desc limit 6) q;
  items := items || v;

  -- Uploads awaiting review.
  select count(*) into v_n from public.partner_uploads where coalesce(status,'pending') = 'pending';
  counts := counts || jsonb_build_object('uploads', v_n);

  -- Signals worth a glance, not a queue.
  counts := counts || jsonb_build_object(
    'chat_violations_24h', (select count(*) from public.chat_violations where created_at > now() - interval '24 hours'),
    'payments_failed_24h', (select count(*) from public.booking_payments where status = 'failed' and created_at > now() - interval '24 hours'),
    'pending_owner',       (select count(*) from public.listings where status = 'pending_owner' and deleted_at is null),
    'transfers_pending',   (select count(*) from public.listing_transfers where status = 'pending'),
    'food_live',           (select count(*) from public.food_orders where status in ('requested','awaiting_payment','accepted','ready','on_the_way'))
  );

  return jsonb_build_object('counts', counts, 'items', items, 'at', now());
end;
$$;

-- ── 8 · PULSE: the cheap poll behind the live badges ─────────────────
create or replace function public.admin_pulse()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'at', now(),
    'sos',        (select count(*) from public.sos_alerts where status = 'open'),
    'sos_latest', (select max(created_at) from public.sos_alerts where status = 'open'),
    'support',    (select count(*) from public.support_threads where status = 'queued' or (status in ('assigned','waiting') and unread_agent > 0)),
    'checkin',    (select count(*) from public.checkin_issues where coalesce(status,'open') not in ('resolved','closed','refunded','redirected','dismissed')),
    'listings_review', (select count(*) from public.listings where deleted_at is null and ((status = 'active' and approved_at is null) or status in ('pending','draft','review','under_review'))),
    'bookings_today', (select count(*) from cabana_admin.bookings where created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi'),
    'latest_booking', (select max(created_at) from cabana_admin.bookings),
    'latest_signup',  (select max(created_at) from public.profiles),
    'food_live',  (select count(*) from public.food_orders where status in ('requested','awaiting_payment','accepted','ready','on_the_way')),
    'ops',        (select count(*) from public.ops_alerts where acknowledged_at is null)
  );
end;
$$;

-- ── 9 · GLOBAL SEARCH ────────────────────────────────────────────────
create or replace function public.admin_search(p_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  q text := btrim(coalesce(p_q, ''));
  pat text;
  digits text;
begin
  perform cabana_admin.guard();
  if length(q) < 2 then
    return jsonb_build_object('people','[]'::jsonb,'listings','[]'::jsonb,'bookings','[]'::jsonb,'experiences','[]'::jsonb);
  end if;
  pat := '%' || replace(replace(q, '%', ''), '_', '') || '%';
  digits := regexp_replace(q, '\D', '', 'g');

  return jsonb_build_object(
    'people', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('id', p.id,
             'name', coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)),''), split_part(p.email,'@',1), 'Member'),
             'email', p.email, 'phone', p.phone, 'status', p.status) as x
        from public.profiles p
       where p.email ilike pat or p.first_name ilike pat or p.last_name ilike pat
          or concat_ws(' ', p.first_name, p.last_name) ilike pat or p.id::text = q
          or (length(digits) >= 6 and regexp_replace(coalesce(p.phone,'') || coalesce(p.mpesa_number,''), '\D', '', 'g') like '%' || right(digits, 9) || '%')
       order by p.created_at desc limit 6) a),
    'listings', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('id', l.id, 'title', l.title, 'city', l.city, 'service', l.service,
             'status', l.status, 'photo', l.photos[1]) as x
        from public.listings l
       where (l.title ilike pat or l.city ilike pat or l.area ilike pat or l.id::text = q)
       order by (l.deleted_at is null) desc, l.created_at desc limit 6) b),
    'bookings', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('service', service, 'id', id, 'ref', ref, 'title', item_title,
             'who', guest_name, 'status', status, 'stage', stage, 'total', total, 'at', created_at) as x
        from cabana_admin.bookings
       where ref ilike pat or guest_name ilike pat or item_title ilike pat or coalesce(guest_email,'') ilike pat or id = q
          or (length(digits) >= 6 and regexp_replace(coalesce(guest_phone,''), '\D', '', 'g') like '%' || right(digits, 9) || '%')
       order by created_at desc limit 8) c),
    'experiences', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('kind','tour','id',t.id,'title',t.title,'sub',coalesce(t.destination,t.county),'status',t.status) as x
        from public.tours t where t.title ilike pat or t.destination ilike pat
      union all
      select jsonb_build_object('kind','event','id',e.id,'title',e.title,'sub',coalesce(e.venue,e.city),'status',e.status)
        from public.events e where e.title ilike pat or e.venue ilike pat or e.city ilike pat
      limit 6) d)
  );
end;
$$;

-- ── 10 · BOOKINGS ────────────────────────────────────────────────────
create or replace function public.admin_bookings(
  p_service text default null, p_stage text default null, p_q text default null,
  p_from timestamptz default null, p_to timestamptz default null,
  p_limit integer default 50, p_offset integer default 0, p_sort text default 'created_desc')
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  pat text := case when coalesce(btrim(p_q),'') = '' then null else '%' || btrim(p_q) || '%' end;
  lim int := greatest(1, least(coalesce(p_limit, 50), 500));
  off int := greatest(0, coalesce(p_offset, 0));
  out jsonb;
begin
  perform cabana_admin.guard();

  with f as (
    select b.* from cabana_admin.bookings b
     where (p_service is null or p_service = '' or p_service = 'all' or b.service = p_service)
       and (p_stage is null or p_stage = '' or p_stage = 'all' or b.stage = p_stage
            or (p_stage = 'refund' and b.refund_due > 0))
       and (p_from is null or b.created_at >= p_from)
       and (p_to is null or b.created_at < p_to)
       and (pat is null or b.ref ilike pat or b.guest_name ilike pat or b.item_title ilike pat
            or coalesce(b.guest_email,'') ilike pat or coalesce(b.guest_phone,'') ilike pat
            or coalesce(b.city,'') ilike pat or b.status ilike pat)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'sums', (select jsonb_build_object('total', coalesce(sum(total),0), 'paid', coalesce(sum(paid),0),
                                       'fee', coalesce(sum(fee) filter (where stage in ('secured','fulfilled')),0),
                                       'refund_due', coalesce(sum(refund_due),0)) from f),
    'stages', (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from f group by stage) s),
    'services', (select coalesce(jsonb_object_agg(service, n), '{}'::jsonb) from
                  (select service, count(*) n from cabana_admin.bookings group by service) s),
    'rows', (select coalesce(jsonb_agg(to_jsonb(r) - 'source_table' - 'rn' order by r.rn), '[]'::jsonb) from (
               select f.*, row_number() over (order by
                  case when p_sort = 'total_desc'   then f.total end desc nulls last,
                  case when p_sort = 'starts_asc'   then f.starts_on end asc nulls last,
                  case when p_sort = 'created_asc'  then f.created_at end asc,
                  f.created_at desc) as rn
                 from f
                order by rn
                limit lim offset off) r)
  ) into out;
  return out;
end;
$$;

create or replace function public.admin_booking(p_service text, p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  b record;
  raw jsonb;
  refs text[];
begin
  perform cabana_admin.guard();
  select * into b from cabana_admin.bookings where service = p_service and id = p_id limit 1;
  if not found then return jsonb_build_object('error','not_found'); end if;

  raw := case b.source_table
    when 'apartment_bookings' then (select to_jsonb(x) from public.apartment_bookings x where x.id::text = p_id)
    when 'tour_bookings'      then (select to_jsonb(x) from public.tour_bookings x where x.id::text = p_id)
    when 'event_tickets'      then (select to_jsonb(x) from public.event_tickets x where x.id::text = p_id)
    when 'car_bookings'       then (select to_jsonb(x) from public.car_bookings x where x.id::text = p_id)
    when 'food_orders'        then (select to_jsonb(x) - 'guest_token' - 'rider_token' - 'handoff_code' - 'rider_code' from public.food_orders x where x.id::text = p_id)
    when 'flight_bookings'    then (select to_jsonb(x) from public.flight_bookings x where x.id::text = p_id)
    when 'ride_requests'      then (select to_jsonb(x) from public.ride_requests x where x.id::text = p_id)
  end;
  refs := array_remove(array[b.ref, raw ->> 'payment_reference', raw ->> 'balance_reference', raw ->> 'referral_root_ref'], null);

  return jsonb_build_object(
    'booking', to_jsonb(b) - 'source_table',
    'raw', raw,
    'guest', (select jsonb_build_object('id',p.id,'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),split_part(p.email,'@',1)),
                                        'email',p.email,'phone',p.phone,'status',p.status,'verified',p.verified,'created_at',p.created_at)
                from public.profiles p where p.id = b.guest_id),
    'host', (select jsonb_build_object('id',p.id,'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),split_part(p.email,'@',1)),
                                       'email',p.email,'phone',p.phone,'status',p.status,'host_status',p.host_status,'verified',p.verified,
                                       'mpesa_number',p.mpesa_number)
                from public.profiles p where p.id = b.host_id),
    'listing', case when b.service = 'stay' or b.service = 'food' then
                 (select jsonb_build_object('id',l.id,'title',l.title,'city',l.city,'area',l.area,'photo',l.photos[1],
                                            'status',l.status,'checkin_time',l.checkin_time,'contact_phone',l.contact_phone)
                    from public.listings l where l.id::text = b.item_id) end,
    'payments', (select coalesce(jsonb_agg(to_jsonb(bp) order by bp.created_at), '[]'::jsonb)
                   from public.booking_payments bp where bp.booking_ref = any(refs)),
    'holds', (select coalesce(jsonb_agg(jsonb_build_object('stay', h.stay::text, 'claimed_at', h.claimed_at,
                                                            'released_at', h.released_at, 'reason', h.release_reason)), '[]'::jsonb)
                from public.listing_holds h where h.booking_ref = any(refs)),
    'credits', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb)
                  from public.point_transactions t where t.booking_ref = any(refs)),
    'commissions', (select coalesce(jsonb_agg(jsonb_build_object('status',e.status,'amount',e.commission_kes,'type',e.referral_type,
                                                                  'referrer',e.referrer_id,'created_at',e.created_at)), '[]'::jsonb)
                      from public.referral_earnings e where e.booking_ref = any(refs)),
    'issues', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
                 from public.checkin_issues c where c.booking_id::text = p_id),
    'disputes', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at), '[]'::jsonb)
                   from public.disputes d where d.booking_id = p_id or d.booking_id = any(refs)),
    'conversation', (select c.id from public.chat_conversations c
                      where b.guest_id is not null and c.guest_id = b.guest_id
                        and (c.listing_id::text = b.item_id or c.host_id = b.host_id)
                      order by c.updated_at desc nulls last limit 1),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('at',a.created_at,'by',a.actor_email,'action',a.action,'meta',a.meta)
                                        order by a.created_at desc), '[]'::jsonb)
                from public.admin_audit_log a where a.target_type = 'booking' and a.target_id = p_id)
  );
end;
$$;

-- Operator actions on a booking. Money moves outside this function (M-Pesa
-- refunds are sent by a person); this records what happened, releases what
-- should be released, and writes the audit row in the same transaction.
create or replace function public.admin_booking_action(p_service text, p_id text, p_action text,
                                                       p_reason text default null, p_amount numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  b record;
  v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
  v_out jsonb := '{}'::jsonb;
  v_amt numeric;
begin
  perform cabana_admin.guard();
  select * into b from cabana_admin.bookings where service = p_service and id = p_id limit 1;
  if not found then raise exception 'booking_not_found'; end if;

  if p_action = 'note' then
    if v_reason is null then raise exception 'note_required'; end if;
    perform cabana_admin.log('booking.note', 'booking', p_id, jsonb_build_object('note', v_reason, 'service', p_service, 'ref', b.ref));
    return jsonb_build_object('ok', true);
  end if;

  if p_action = 'cancel' then
    if b.stage in ('lost','moved') then raise exception 'already_closed'; end if;
    -- Any money already received must be accounted for explicitly: the
    -- operator states how much is owed back (0 when the guest forfeits).
    if b.paid > 0 and p_amount is null then
      raise exception 'paid_booking_needs_refund_amount';
    end if;
    v_amt := least(coalesce(p_amount, 0), b.paid);
    if b.source_table = 'apartment_bookings' then
      update public.apartment_bookings
         set status = 'cancelled', cancelled_at = now(),
             cancel_reason = coalesce(v_reason, 'Cancelled by Cabana'),
             refund_due = case when v_amt > 0 then v_amt else refund_due end,
             refund_reason = case when v_amt > 0 then coalesce(v_reason, 'cabana_cancelled') else refund_reason end
       where id::text = p_id;
    elsif b.source_table = 'tour_bookings' then
      update public.tour_bookings set status = 'cancelled', cancelled_at = now(),
             refund_due = case when v_amt > 0 then v_amt else refund_due end,
             refund_reason = coalesce(v_reason, 'Cancelled by Cabana') where id::text = p_id;
    elsif b.source_table = 'event_tickets' then
      update public.event_tickets set status = 'cancelled', cancelled_at = now(),
             refund_due = case when v_amt > 0 then v_amt else refund_due end,
             refund_reason = coalesce(v_reason, 'Cancelled by Cabana') where id::text = p_id;
    elsif b.source_table = 'car_bookings' then
      update public.car_bookings set status = 'cancelled' where id::text = p_id;
    elsif b.source_table = 'food_orders' then
      update public.food_orders set status = 'cancelled', cancelled_at = now(), cancelled_by = 'cabana',
             cancel_reason = coalesce(v_reason, 'Cancelled by Cabana'), updated_at = now() where id::text = p_id;
    elsif b.source_table = 'ride_requests' then
      update public.ride_requests set status = 'cancelled', cancelled_at = now(),
             cancel_reason = coalesce(v_reason, 'Cancelled by Cabana'), updated_at = now() where id::text = p_id;
    else
      raise exception 'cancel_not_supported_here';
    end if;
    v_out := jsonb_build_object('refund_due', v_amt);

  elsif p_action = 'mark_refunded' then
    v_amt := coalesce(p_amount, nullif(b.refund_due,0), b.paid);
    if v_amt is null or v_amt <= 0 then raise exception 'nothing_to_refund'; end if;
    if b.source_table = 'apartment_bookings' then
      update public.apartment_bookings
         set status = case when cabana_admin.stage(status) in ('lost','moved') then status else 'refunded' end,
             refund_amount = coalesce(refund_amount,0) + v_amt, refunded_at = now(), refund_due = null,
             refund_reason = coalesce(v_reason, refund_reason, 'Refunded by Cabana')
       where id::text = p_id;
    elsif b.source_table = 'tour_bookings' then
      update public.tour_bookings set refund_due = null,
             status = case when cabana_admin.stage(status) in ('lost','moved') then status else 'refunded' end,
             refund_reason = coalesce(v_reason, refund_reason, 'Refunded by Cabana') where id::text = p_id;
    elsif b.source_table = 'event_tickets' then
      update public.event_tickets set refund_due = null,
             status = case when cabana_admin.stage(status) in ('lost','moved') then status else 'refunded' end,
             refund_reason = coalesce(v_reason, refund_reason, 'Refunded by Cabana') where id::text = p_id;
    else
      raise exception 'refund_not_supported_here';
    end if;
    v_out := jsonb_build_object('refunded', v_amt);

  elsif p_action = 'refund_to_credit' then
    if b.source_table <> 'apartment_bookings' then raise exception 'credit_supported_for_stays_only'; end if;
    select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into v_out
      from public.cabana_convert_refunds_to_credit(false, b.ref) r;
    v_out := jsonb_build_object('result', v_out);

  else
    raise exception 'unknown_action';
  end if;

  perform cabana_admin.log('booking.' || p_action, 'booking', p_id,
    jsonb_build_object('service', p_service, 'ref', b.ref, 'reason', v_reason, 'amount', coalesce(v_amt, p_amount)) || v_out);
  return jsonb_build_object('ok', true) || v_out;
end;
$$;

-- ── 11 · PAYMENTS & FINANCE ──────────────────────────────────────────
create or replace function public.admin_payments(p_status text default null, p_method text default null,
                                                 p_q text default null, p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  pat text := case when coalesce(btrim(p_q),'') = '' then null else '%' || btrim(p_q) || '%' end;
  out jsonb;
begin
  perform cabana_admin.guard();
  with j as (
    select bp.*,
           case bp.booking_table when 'apartment_bookings' then 'stay' when 'tour_bookings' then 'tour'
                                 when 'event_tickets' then 'event' else coalesce(bp.booking_table,'other') end as service,
           coalesce(ab.id, tb.id, et.id)::text as booking_id,
           coalesce(nullif(ab.guest_name,''), nullif(btrim(concat_ws(' ', gp.first_name, gp.last_name)),''), 'Guest') as guest_name,
           coalesce(nullif(ab.listing_name,''), nullif(ab.apartment_name,''), tb.tour_name, et.event_name) as item_title
      from public.booking_payments bp
      left join public.apartment_bookings ab on bp.booking_table = 'apartment_bookings' and ab.payment_reference = bp.booking_ref
      left join public.tour_bookings tb      on bp.booking_table = 'tour_bookings' and tb.payment_reference = bp.booking_ref
      left join public.event_tickets et      on bp.booking_table = 'event_tickets' and et.payment_reference = bp.booking_ref
      left join public.profiles gp           on gp.id = coalesce(ab.guest_id, tb.guest_id, et.guest_id)
  ), f as (
    select * from j
     where (p_status is null or p_status in ('','all') or status = p_status)
       and (p_method is null or p_method in ('','all') or payment_method = p_method)
       and (pat is null or booking_ref ilike pat or reference ilike pat or coalesce(mpesa_receipt,'') ilike pat
            or coalesce(phone,'') ilike pat or coalesce(guest_name,'') ilike pat or coalesce(item_title,'') ilike pat)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'sum', (select coalesce(sum(amount),0) from f),
    'by_status', (select coalesce(jsonb_object_agg(status, jsonb_build_object('n', n, 'amount', a)), '{}'::jsonb)
                    from (select status, count(*) n, sum(amount) a from f group by status) s),
    'rows', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb) from (
               select * from f order by created_at desc
                limit greatest(1, least(coalesce(p_limit,50),500)) offset greatest(0, coalesce(p_offset,0))) r)
  ) into out;
  return out;
end;
$$;

create or replace function public.admin_finance(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days,30), 730)));
  v_tz text := 'Africa/Nairobi';
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'range', jsonb_build_object('days', p_days, 'from', v_from),
    'summary', (select jsonb_build_object(
        'demand',    coalesce(sum(total),0),
        'gmv',       coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
        'revenue',   coalesce(sum(fee)   filter (where stage in ('secured','fulfilled')),0),
        'collected', coalesce(sum(paid),0),
        'outstanding', coalesce(sum(greatest(total - paid,0)) filter (where stage = 'secured'),0),
        'bookings',  count(*),
        'secured',   count(*) filter (where stage in ('secured','fulfilled')),
        'lost',      count(*) filter (where stage = 'lost'))
       from cabana_admin.bookings where created_at >= v_from),
    'by_service', (select coalesce(jsonb_agg(x order by x->>'service'), '[]'::jsonb) from (
        select jsonb_build_object(
          'service', service, 'bookings', count(*),
          'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
          'revenue', coalesce(sum(fee) filter (where stage in ('secured','fulfilled')),0),
          'collected', coalesce(sum(paid),0)) as x
         from cabana_admin.bookings where created_at >= v_from group by service) s),
    'cash_series', (select coalesce(jsonb_agg(jsonb_build_object('d', d.day::date, 'paid', coalesce(p.amount,0), 'failed', coalesce(p.failed,0)) order by d.day), '[]'::jsonb)
       from generate_series((v_from at time zone v_tz)::date, (now() at time zone v_tz)::date, interval '1 day') d(day)
       left join (select (coalesce(paid_at, created_at) at time zone v_tz)::date as day,
                         sum(amount) filter (where status = 'paid') as amount,
                         count(*) filter (where status = 'failed') as failed
                    from public.booking_payments where coalesce(paid_at, created_at) >= v_from group by 1) p on p.day = d.day::date),
    'payments', (select jsonb_build_object(
        'paid', count(*) filter (where status = 'paid'),
        'failed', count(*) filter (where status = 'failed'),
        'expired', count(*) filter (where status = 'expired'),
        'pending', count(*) filter (where status not in ('paid','failed','expired')),
        'paid_amount', coalesce(sum(amount) filter (where status = 'paid'),0),
        'methods', (select coalesce(jsonb_object_agg(m, n), '{}'::jsonb) from
                     (select coalesce(payment_method,'unknown') m, count(*) n from public.booking_payments
                       where created_at >= v_from group by 1) mm))
       from public.booking_payments where created_at >= v_from),
    'liabilities', jsonb_build_object(
        'refunds_due',       (select coalesce(sum(refund_due),0) from cabana_admin.bookings),
        'refunds_due_count', (select count(*) from cabana_admin.bookings where refund_due > 0),
        'credit_points',     (select coalesce(sum(available_points),0) from public.user_points),
        'credit_holders',    (select count(*) from public.user_points where available_points > 0),
        'withdrawals_pending', (select coalesce(sum(amount_kes),0) from public.referral_withdrawals where status = 'pending'),
        'withdrawals_count',   (select count(*) from public.referral_withdrawals where status = 'pending'),
        'commissions_pending', (select coalesce(sum(commission_kes),0) from public.referral_earnings where status in ('pending','pending_checkin','held')),
        'commissions_available', (select coalesce(sum(commission_kes),0) from public.referral_earnings where status in ('available','cleared','approved')),
        'float_balance',     public.float_balance()),
    'withdrawals', (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'amount',w.amount_kes,'mpesa',w.mpesa_number,'status',w.status,
                                   'notes',w.notes,'created_at',w.created_at,'user_id',w.user_id,
                                   'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Member'),
                                   'email',p.email) order by (w.status = 'pending') desc, w.created_at desc), '[]'::jsonb)
                      from (select * from public.referral_withdrawals order by created_at desc limit 100) w
                      left join public.profiles p on p.id = w.user_id),
    'refunds', (select coalesce(jsonb_agg(to_jsonb(r) - 'source_table' order by r.created_at desc), '[]'::jsonb)
                  from (select * from cabana_admin.bookings where refund_due > 0 order by created_at desc limit 100) r),
    'credit_top', (select coalesce(jsonb_agg(jsonb_build_object('user_id',u.user_id,'points',u.available_points,'lifetime',u.lifetime_points,
                                   'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Member'),'email',p.email)
                                   order by u.available_points desc), '[]'::jsonb)
                     from (select * from public.user_points where available_points > 0 order by available_points desc limit 25) u
                     left join public.profiles p on p.id = u.user_id)
  );
end;
$$;

create or replace function public.admin_withdrawal_action(p_id uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare w public.referral_withdrawals%rowtype;
begin
  perform cabana_admin.guard();
  select * into w from public.referral_withdrawals where id = p_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if w.status <> 'pending' then raise exception 'withdrawal_not_pending'; end if;
  if p_action not in ('paid','rejected') then raise exception 'unknown_action'; end if;
  update public.referral_withdrawals
     set status = p_action,
         notes = btrim(concat_ws(' · ', nullif(notes,''), nullif(btrim(coalesce(p_note,'')),''),
                                 'marked ' || p_action || ' ' || to_char(now() at time zone 'Africa/Nairobi','DD Mon YYYY HH24:MI')))
   where id = p_id;
  perform cabana_admin.log('withdrawal.' || p_action, 'withdrawal', p_id::text,
                           jsonb_build_object('amount', w.amount_kes, 'mpesa', w.mpesa_number, 'user_id', w.user_id, 'note', p_note));
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 12 · PEOPLE ──────────────────────────────────────────────────────
create or replace view cabana_admin.people as
with lc as (
  select partner_id as uid,
         count(*) filter (where deleted_at is null and coalesce(status,'') not in ('deleted','removed')) as listings,
         count(*) filter (where is_active and status = 'active' and deleted_at is null) as live_listings
    from public.listings where partner_id is not null group by partner_id
), gb as (
  select guest_id as uid, count(*) as bookings,
         count(*) filter (where stage in ('secured','fulfilled')) as secured,
         coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0) as spend
    from cabana_admin.bookings where guest_id is not null group by guest_id
), hb as (
  select host_id as uid, count(*) as host_bookings,
         count(*) filter (where stage = 'lost' and status in ('cancelled','host_cancelled')) as host_cancels,
         coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0) as host_gmv
    from cabana_admin.bookings where host_id is not null group by host_id
), rv as (
  select l.partner_id as uid, count(r.*) as reviews, avg(r.rating)::numeric(3,2) as rating
    from public.reviews r join public.listings l on l.id = r.listing_id group by l.partner_id
)
select p.id, p.email, p.first_name, p.last_name,
       coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)),''), split_part(p.email,'@',1), 'Member') as name,
       coalesce(p.phone, p.contact_phone, p.mpesa_number) as phone,
       p.created_at, p.updated_at, p.status, p.host_status, p.verified, p.phone_verified,
       coalesce(p.flags,0) as flags, coalesce(p.reported,false) as reported, coalesce(p.banned,false) as banned,
       p.last_role, p.is_creator,
       u.last_sign_in_at, u.email_confirmed_at, u.banned_until,
       coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provider,
       coalesce(lc.listings,0) as listings, coalesce(lc.live_listings,0) as live_listings,
       coalesce(gb.bookings,0) as bookings, coalesce(gb.secured,0) as secured_bookings, coalesce(gb.spend,0) as spend,
       coalesce(hb.host_bookings,0) as host_bookings, coalesce(hb.host_gmv,0) as host_gmv, coalesce(hb.host_cancels,0) as host_cancels,
       coalesce(rv.reviews,0) as reviews, rv.rating,
       coalesce(up.available_points,0) as points,
       (select public.active_yellow_count(p.id)) as yellow_cards,
       array_remove(array[
         case when coalesce(lc.listings,0) > 0 or p.last_role = 'partner' then 'host' end,
         case when coalesce(gb.bookings,0) > 0 then 'guest' end,
         case when exists (select 1 from public.agents a where a.id = p.id) then 'agent' end,
         case when exists (select 1 from public.ambassadors am where am.id = p.id) then 'ambassador' end,
         case when exists (select 1 from public.drivers d where d.user_id = p.id) then 'driver' end,
         case when exists (select 1 from public.tour_operators o where o.owner_id = p.id)
                or exists (select 1 from public.event_organisers o where o.owner_id = p.id)
                or exists (select 1 from public.car_operators o where o.owner_id = p.id) then 'operator' end,
         case when p.is_creator then 'creator' end,
         case when exists (select 1 from public.admin_users au where lower(au.email) = lower(p.email)) then 'admin' end
       ], null) as roles,
       greatest(0, least(100, round(
         50
         + case when p.verified then 18 else 0 end
         + case when p.phone_verified then 6 else 0 end
         + case when u.email_confirmed_at is not null then 4 else 0 end
         + least(8, coalesce(lc.listings,0))
         + least(14, ln((coalesce(hb.host_bookings,0) + coalesce(gb.bookings,0) + 1)::numeric) / ln(2::numeric) * 4)
         - case when coalesce(hb.host_bookings,0) > 3 then 45.0 * coalesce(hb.host_cancels,0) / hb.host_bookings else 0 end
         + case when rv.rating is not null then (rv.rating - 3) * 7 else 0 end
         - coalesce(p.flags,0) * 12
         - (select public.active_yellow_count(p.id)) * 8
         - case when coalesce(p.banned,false) then 60 when p.status = 'suspended' then 25 else 0 end
       )))::int as trust
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join lc on lc.uid = p.id
  left join gb on gb.uid = p.id
  left join hb on hb.uid = p.id
  left join rv on rv.uid = p.id
  left join public.user_points up on up.user_id = p.id;

revoke all on cabana_admin.people from public, anon, authenticated;

create or replace function public.admin_people(p_filter text default 'all', p_q text default null,
                                               p_limit integer default 50, p_offset integer default 0,
                                               p_sort text default 'created_desc')
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  pat text := case when coalesce(btrim(p_q),'') = '' then null else '%' || btrim(p_q) || '%' end;
  out jsonb;
begin
  perform cabana_admin.guard();
  with base as (select * from cabana_admin.people),
  f as (
    select * from base
     where (case coalesce(p_filter,'all')
              when 'hosts'      then 'host' = any(roles)
              when 'guests'     then not ('host' = any(roles))
              when 'agents'     then 'agent' = any(roles)
              when 'ambassadors' then 'ambassador' = any(roles)
              when 'drivers'    then 'driver' = any(roles)
              when 'operators'  then 'operator' = any(roles)
              when 'creators'   then 'creator' = any(roles)
              when 'flagged'    then flags > 0 or reported or yellow_cards > 0 or host_status = 'under_review'
              when 'suspended'  then status = 'suspended' or host_status in ('suspended','under_review')
              when 'banned'     then banned or status = 'banned'
              when 'unverified' then 'host' = any(roles) and not coalesce(verified,false)
              when 'new'        then created_at > now() - interval '7 days'
              when 'risk'       then trust < 45
              else true end)
       and (pat is null or email ilike pat or name ilike pat or coalesce(phone,'') ilike pat or id::text = btrim(p_q))
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'counts', (select jsonb_build_object(
        'all', count(*),
        'hosts', count(*) filter (where 'host' = any(roles)),
        'guests', count(*) filter (where not ('host' = any(roles))),
        'agents', count(*) filter (where 'agent' = any(roles)),
        'ambassadors', count(*) filter (where 'ambassador' = any(roles)),
        'drivers', count(*) filter (where 'driver' = any(roles)),
        'operators', count(*) filter (where 'operator' = any(roles)),
        'flagged', count(*) filter (where flags > 0 or reported or yellow_cards > 0 or host_status = 'under_review'),
        'suspended', count(*) filter (where status = 'suspended' or host_status in ('suspended','under_review')),
        'banned', count(*) filter (where banned or status = 'banned'),
        'unverified', count(*) filter (where 'host' = any(roles) and not coalesce(verified,false)),
        'new', count(*) filter (where created_at > now() - interval '7 days'),
        'risk', count(*) filter (where trust < 45)) from base),
    'rows', (select coalesce(jsonb_agg(to_jsonb(r) - 'rn' order by r.rn), '[]'::jsonb) from (
      select f.*, row_number() over (order by
        case when p_sort = 'trust_asc' then trust end asc,
        case when p_sort = 'spend_desc' then spend end desc,
        case when p_sort = 'gmv_desc' then host_gmv end desc,
        case when p_sort = 'seen_desc' then last_sign_in_at end desc nulls last,
        case when p_sort = 'name_asc' then lower(name) end asc,
        created_at desc) as rn
        from f order by rn
      limit greatest(1, least(coalesce(p_limit,50),500)) offset greatest(0, coalesce(p_offset,0))) r)
  ) into out;
  return out;
end;
$$;

create or replace function public.admin_person(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text;
begin
  perform cabana_admin.guard();
  select email into v_email from public.profiles where id = p_id;
  if not found then return jsonb_build_object('error','not_found'); end if;

  return jsonb_build_object(
    'person', (select to_jsonb(x) from cabana_admin.people x where x.id = p_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = p_id),
    'auth', (select jsonb_build_object('email', u.email, 'phone', u.phone, 'created_at', u.created_at,
                                       'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at,
                                       'banned_until', u.banned_until, 'provider', u.raw_app_meta_data ->> 'provider',
                                       'providers', u.raw_app_meta_data -> 'providers')
               from auth.users u where u.id = p_id),
    'listings', (select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'title',l.title,'service',l.service,'city',l.city,
                    'status',l.status,'is_active',l.is_active,'deleted_at',l.deleted_at,'photo',l.photos[1],
                    'price',coalesce(l.price_night,l.price_month),'created_at',l.created_at) order by l.created_at desc), '[]'::jsonb)
                   from public.listings l where l.partner_id = p_id),
    'bookings', (select coalesce(jsonb_agg(to_jsonb(b) - 'source_table' order by b.created_at desc), '[]'::jsonb)
                   from (select * from cabana_admin.bookings where guest_id = p_id order by created_at desc limit 50) b),
    'host_bookings', (select coalesce(jsonb_agg(to_jsonb(b) - 'source_table' order by b.created_at desc), '[]'::jsonb)
                   from (select * from cabana_admin.bookings where host_id = p_id order by created_at desc limit 50) b),
    'points', (select jsonb_build_object('available', coalesce(up.available_points,0), 'lifetime', coalesce(up.lifetime_points,0))
                 from (select 1) one left join public.user_points up on up.user_id = p_id),
    'point_history', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
                        from (select * from public.point_transactions where user_id = p_id order by created_at desc limit 25) t),
    'earnings', (select coalesce(jsonb_agg(jsonb_build_object('amount',e.commission_kes,'status',e.status,'type',e.referral_type,
                    'service',e.service_type,'ref',e.booking_ref,'at',e.created_at) order by e.created_at desc), '[]'::jsonb)
                   from (select * from public.referral_earnings where referrer_id = p_id order by created_at desc limit 25) e),
    'withdrawals', (select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc), '[]'::jsonb)
                      from public.referral_withdrawals w where w.user_id = p_id),
    'cards', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
                from public.host_cards c where c.host_id = p_id),
    'support', (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'subject',t.subject,'status',t.status,'priority',t.priority,
                   'last_message',t.last_message,'at',coalesce(t.last_message_at,t.created_at)) order by t.created_at desc), '[]'::jsonb)
                  from public.support_threads t where t.user_id = p_id),
    'issues', (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'code',c.issue_code,'status',c.status,'fault',c.fault,
                  'as', case when c.guest_id = p_id then 'guest' else 'host' end,'at',c.created_at) order by c.created_at desc), '[]'::jsonb)
                 from public.checkin_issues c where c.guest_id = p_id or c.host_id = p_id),
    'violations', (select coalesce(jsonb_agg(jsonb_build_object('categories',v.categories,'excerpt',v.excerpt,'at',v.created_at)
                     order by v.created_at desc), '[]'::jsonb)
                     from (select * from public.chat_violations where user_id = p_id order by created_at desc limit 20) v),
    'sos', (select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'category',s.category,'status',s.status,'at',s.created_at)), '[]'::jsonb)
              from public.sos_alerts s where s.user_id = p_id),
    'agent', (select to_jsonb(a) from public.agents a where a.id = p_id),
    'ambassador', (select to_jsonb(a) from public.ambassadors a where a.id = p_id),
    'driver', (select to_jsonb(d) - 'national_id' - 'payout_number' from public.drivers d where d.user_id = p_id limit 1),
    'verification', (select to_jsonb(v) from public.verification_status v where v.user_id = p_id),
    'push_devices', (select count(*) from public.push_subscriptions where user_id = p_id),
    'emails', (select coalesce(jsonb_agg(jsonb_build_object('template',e.template,'subject',e.subject,'status',e.status,'at',e.created_at)
                  order by e.created_at desc), '[]'::jsonb)
                 from (select * from public.email_log where user_id = p_id or lower(recipient) = lower(v_email)
                        order by created_at desc limit 15) e),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('at',a.created_at,'by',a.actor_email,'action',a.action,'meta',a.meta)
                 order by a.created_at desc), '[]'::jsonb)
                from (select * from public.admin_audit_log where target_id = p_id::text order by created_at desc limit 40) a)
  );
end;
$$;

create or replace function public.admin_person_action(p_id uuid, p_action text, p_reason text default null,
                                                      p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  p public.profiles%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_n int := 0;
  v_pts int;
begin
  perform cabana_admin.guard();
  select * into p from public.profiles where id = p_id for update;
  if not found then raise exception 'person_not_found'; end if;

  if p_action = 'verify' then
    update public.profiles set verified = true, verified_at = now() where id = p_id;
  elsif p_action = 'unverify' then
    update public.profiles set verified = false, verified_at = null where id = p_id;
  elsif p_action = 'clear_flags' then
    update public.profiles set flags = 0, reported = false where id = p_id;
  elsif p_action = 'suspend' then
    if v_reason is null then raise exception 'reason_required'; end if;
    update public.profiles
       set status = 'suspended', suspended_at = now(),
           suspended_until = nullif(v_payload ->> 'until','')::timestamptz,
           suspension_reason = v_reason, host_status = 'suspended', host_suspended_at = now()
     where id = p_id;
    update public.listings set status = 'suspended', is_active = false
     where partner_id = p_id and deleted_at is null
       and coalesce(status,'') in ('active','live','paused','inactive','under_review','pending','draft');
    get diagnostics v_n = row_count;
  elsif p_action in ('reinstate','unban') then
    update public.profiles
       set status = 'active', suspended_at = null, suspended_until = null, suspension_reason = null,
           host_status = 'active', host_suspended_at = null,
           banned = false, banned_at = null, ban_reason = null
     where id = p_id;
    update public.listings set status = 'active', is_active = true
     where partner_id = p_id and deleted_at is null and status in ('suspended','under_review','removed');
    get diagnostics v_n = row_count;
    begin
      update auth.users set banned_until = null where id = p_id;
    exception when others then null;
    end;
  elsif p_action = 'ban' then
    if v_reason is null then raise exception 'reason_required'; end if;
    if exists (select 1 from public.admin_users a where lower(a.email) = lower(p.email)) then
      raise exception 'cannot_ban_an_operator';
    end if;
    update public.profiles
       set status = 'banned', banned = true, banned_at = now(), ban_reason = v_reason,
           host_status = 'suspended', host_suspended_at = now()
     where id = p_id;
    update public.listings set status = 'removed', is_active = false
     where partner_id = p_id and deleted_at is null and coalesce(status,'') not in ('deleted','removed');
    get diagnostics v_n = row_count;
    begin
      update auth.users set banned_until = now() + interval '100 years' where id = p_id;
      delete from auth.refresh_tokens where user_id::text = p_id::text;
    exception when others then null;
    end;
  elsif p_action = 'revoke_sessions' then
    begin
      delete from auth.refresh_tokens where user_id::text = p_id::text;
      delete from auth.sessions where user_id = p_id;
    exception when others then raise exception 'could_not_revoke_sessions';
    end;
  elsif p_action = 'update_profile' then
    update public.profiles
       set first_name = case when v_payload ? 'first_name' then nullif(btrim(v_payload ->> 'first_name'),'') else first_name end,
           last_name  = case when v_payload ? 'last_name'  then nullif(btrim(v_payload ->> 'last_name'),'')  else last_name end,
           phone      = case when v_payload ? 'phone'      then nullif(btrim(v_payload ->> 'phone'),'')      else phone end,
           mpesa_number = case when v_payload ? 'mpesa_number' then nullif(btrim(v_payload ->> 'mpesa_number'),'') else mpesa_number end,
           last_role  = case when v_payload ? 'last_role' and v_payload ->> 'last_role' in ('guest','partner')
                             then v_payload ->> 'last_role' else last_role end,
           is_creator = case when v_payload ? 'is_creator' then (v_payload ->> 'is_creator')::boolean else is_creator end,
           updated_at = now()
     where id = p_id;
  elsif p_action = 'grant_credit' then
    v_pts := round(coalesce((v_payload ->> 'points')::numeric, 0))::int;
    if v_pts = 0 or abs(v_pts) > 1000000 then raise exception 'invalid_points'; end if;
    if v_reason is null then raise exception 'reason_required'; end if;
    -- Same convention as the rest of the ledger: earn is positive, redeem
    -- negative, amount_kes always the absolute shilling value.
    insert into public.point_transactions (user_id, type, points, amount_kes, service_type, booking_ref, description)
    values (p_id, case when v_pts > 0 then 'earn' else 'redeem' end, v_pts, abs(v_pts), 'cabana',
            'CABANA-' || left(replace(gen_random_uuid()::text, '-', ''), 12), 'Cabana: ' || v_reason);
    update public.user_points
       set available_points = greatest(0, available_points + v_pts),
           lifetime_points = lifetime_points + greatest(v_pts, 0), updated_at = now()
     where user_id = p_id;
    if not found then
      insert into public.user_points (user_id, available_points, lifetime_points)
      values (p_id, greatest(v_pts, 0), greatest(v_pts, 0));
    end if;
  elsif p_action = 'note' then
    if v_reason is null then raise exception 'note_required'; end if;
  else
    raise exception 'unknown_action';
  end if;

  perform cabana_admin.log('person.' || p_action, 'profile', p_id::text,
    jsonb_build_object('reason', v_reason, 'email', p.email, 'listings_changed', v_n) || v_payload);
  return jsonb_build_object('ok', true, 'listings_changed', v_n);
end;
$$;

-- ── 13 · LISTINGS ────────────────────────────────────────────────────
create or replace function public.admin_listings(p_state text default 'all', p_service text default null,
                                                 p_q text default null, p_limit integer default 60, p_offset integer default 0,
                                                 p_sort text default 'created_desc')
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  pat text := case when coalesce(btrim(p_q),'') = '' then null else '%' || btrim(p_q) || '%' end;
  out jsonb;
begin
  perform cabana_admin.guard();
  with s as (
    select item_id, count(*) as bookings,
           count(*) filter (where stage in ('secured','fulfilled')) as secured,
           coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0) as gmv,
           max(created_at) as last_booking
      from cabana_admin.bookings where service in ('stay','food') group by item_id
  ), base as (
    select l.id, l.title, l.service, l.type, l.city, l.area, l.country, l.location, l.status, l.is_active, l.featured,
           l.partner_id, l.created_at, l.updated_at, l.approved_at, l.deleted_at, l.rejection_reason,
           l.views, l.booking_count, l.avg_rating, l.review_count, l.tour_3d_status, l.tour_3d_url,
           l.ownership_type, l.created_by_role, l.currency,
           coalesce(l.price_night, l.price_per_night, l.price_month) as price,
           case when l.price_month is not null and l.price_night is null then 'month' else 'night' end as price_unit,
           l.photos[1] as photo, coalesce(array_length(l.photos,1),0) as photo_count,
           (l.latitude is not null or l.lat is not null) as has_pin,
           coalesce(length(l.description),0) as desc_len,
           coalesce(array_length(l.amenities,1),0) as amenity_count,
           coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)),''), split_part(p.email,'@',1)) as owner_name,
           p.email as owner_email, p.verified as owner_verified, p.host_status as owner_status,
           coalesce(s.bookings,0) as bookings, coalesce(s.secured,0) as secured, coalesce(s.gmv,0) as gmv, s.last_booking,
           case
             when l.deleted_at is not null or l.status in ('deleted','removed') then 'deleted'
             when l.status in ('pending','draft','review','under_review') then 'review'
             when l.status = 'active' and l.is_active then 'live'
             else 'hidden'
           end as state,
           -- Live-but-never-reviewed rows are public already; they still need
           -- a human look, so they count toward the review queue too.
           (l.deleted_at is null and coalesce(l.status,'') not in ('deleted','removed')
             and (l.status in ('pending','draft','review','under_review')
                  or (l.status = 'active' and l.approved_at is null))) as needs_review,
           greatest(0, least(100,
               least(coalesce(array_length(l.photos,1),0), 8) * 5
             + case when coalesce(length(l.description),0) >= 280 then 20 when coalesce(length(l.description),0) >= 80 then 10 else 0 end
             + case when coalesce(l.price_night, l.price_per_night, l.price_month) > 0 then 15 else 0 end
             + case when l.latitude is not null or l.lat is not null then 15 else 0 end
             + least(coalesce(array_length(l.amenities,1),0), 5) * 2
             + case when coalesce(l.contact_phone, l.contact_whatsapp) is not null then 0 else 0 end
           ))::int as quality
      from public.listings l
      left join public.profiles p on p.id = l.partner_id
      left join s on s.item_id = l.id::text
  ), f as (
    select * from base
     where (coalesce(p_state,'all') = 'all' and state <> 'deleted'
            or (p_state = 'review' and needs_review)
            or (p_state not in ('review','featured','pending_owner') and state = p_state)
            or (p_state = 'featured' and featured and state <> 'deleted')
            or (p_state = 'pending_owner' and status = 'pending_owner'))
       and (p_service is null or p_service in ('','all') or service = p_service)
       and (pat is null or title ilike pat or coalesce(city,'') ilike pat or coalesce(area,'') ilike pat
            or coalesce(owner_email,'') ilike pat or coalesce(owner_name,'') ilike pat or id::text = btrim(p_q))
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'states', (select jsonb_build_object(
        'all', count(*) filter (where state <> 'deleted'),
        'review', count(*) filter (where needs_review),
        'live', count(*) filter (where state = 'live'),
        'hidden', count(*) filter (where state = 'hidden'),
        'deleted', count(*) filter (where state = 'deleted'),
        'featured', count(*) filter (where featured and state <> 'deleted'),
        'pending_owner', count(*) filter (where status = 'pending_owner')) from base),
    'services', (select coalesce(jsonb_object_agg(coalesce(service,'stays'), n), '{}'::jsonb)
                   from (select service, count(*) n from base where state <> 'deleted' group by service) z),
    'rows', (select coalesce(jsonb_agg(to_jsonb(r) - 'rn' order by r.rn), '[]'::jsonb) from (
       select f.*, row_number() over (order by
         case when p_sort = 'gmv_desc' then gmv end desc,
         case when p_sort = 'quality_asc' then quality end asc,
         case when p_sort = 'views_desc' then views end desc nulls last,
         case when p_sort = 'title_asc' then lower(title) end asc,
         created_at desc) as rn
         from f order by rn
       limit greatest(1, least(coalesce(p_limit,60),500)) offset greatest(0, coalesce(p_offset,0))) r)
  ) into out;
  return out;
end;
$$;

create or replace function public.admin_listing(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare l public.listings%rowtype;
begin
  perform cabana_admin.guard();
  select * into l from public.listings where id = p_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  return jsonb_build_object(
    'listing', to_jsonb(l),
    'owner', (select jsonb_build_object('id',p.id,'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),split_part(p.email,'@',1)),
                                        'email',p.email,'phone',p.phone,'verified',p.verified,'status',p.status,'host_status',p.host_status)
                from public.profiles p where p.id = l.partner_id),
    'stats', (select jsonb_build_object('bookings', count(*), 'secured', count(*) filter (where stage in ('secured','fulfilled')),
                                        'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
                                        'collected', coalesce(sum(paid),0), 'last', max(created_at))
                from cabana_admin.bookings where item_id = p_id::text),
    'bookings', (select coalesce(jsonb_agg(to_jsonb(b) - 'source_table' order by b.created_at desc), '[]'::jsonb)
                   from (select * from cabana_admin.bookings where item_id = p_id::text order by created_at desc limit 20) b),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'rating',r.rating,'text',r.review_text,'guest',r.guest_name,
                   'reply',r.host_reply,'at',r.created_at) order by r.created_at desc), '[]'::jsonb)
                  from public.reviews r where r.listing_id = p_id),
    'calendar', jsonb_build_object(
        'feeds', (select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'platform',f.platform,'label',f.label,'active',f.is_active,
                     'last_success_at',f.last_success_at,'failures',f.consecutive_failures,'last_status',f.last_status,
                     'last_error',f.last_error)), '[]'::jsonb) from public.calendar_feeds f where f.listing_id = p_id),
        'conflicts', (select count(*) from public.calendar_conflicts c where c.listing_id = p_id and c.status = 'open'),
        'holds', (select coalesce(jsonb_agg(jsonb_build_object('stay',h.stay::text,'ref',h.booking_ref) order by lower(h.stay)), '[]'::jsonb)
                    from public.listing_holds h where h.listing_id = p_id and h.released_at is null and upper(h.stay) >= current_date)),
    'tour3d', (select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
                 from public.tour3d_requests t where t.listing_id = p_id),
    'transfers', (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'kind',t.kind,'status',t.status,'to_name',t.to_name,
                    'to_contact',t.to_contact,'created_at',t.created_at,'expires_at',t.expires_at) order by t.created_at desc), '[]'::jsonb)
                    from public.listing_transfers t where t.listing_id = p_id),
    'restaurant', (select to_jsonb(r) from public.restaurant_profiles r where r.listing_id = p_id),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('at',a.created_at,'by',a.actor_email,'action',a.action,'meta',a.meta)
                 order by a.created_at desc), '[]'::jsonb)
                from (select * from public.admin_audit_log where target_id = p_id::text order by created_at desc limit 40) a)
  );
end;
$$;

create or replace function public.admin_listing_action(p_id uuid, p_action text, p_reason text default null,
                                                       p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  l public.listings%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_to uuid;
  v_after public.listings%rowtype;
begin
  perform cabana_admin.guard();
  select * into l from public.listings where id = p_id for update;
  if not found then raise exception 'listing_not_found'; end if;

  if p_action = 'approve' then
    update public.listings
       set approved_at = now(), rejection_reason = null,
           status = case when status in ('pending','draft','review','under_review') then 'active' else status end,
           is_active = case when status in ('pending','draft','review','under_review') then true else is_active end,
           updated_at = now()
     where id = p_id;
  elsif p_action = 'reject' then
    if v_reason is null then raise exception 'reason_required'; end if;
    update public.listings set status = 'rejected', is_active = false, rejection_reason = v_reason, updated_at = now() where id = p_id;
  elsif p_action = 'publish' then
    update public.listings set status = 'active', is_active = true, deleted_at = null,
           approved_at = coalesce(approved_at, now()), rejection_reason = null, updated_at = now() where id = p_id;
  elsif p_action = 'pause' then
    update public.listings set status = 'paused', is_active = false, updated_at = now() where id = p_id;
  elsif p_action = 'feature' then
    update public.listings set featured = true, updated_at = now() where id = p_id;
  elsif p_action = 'unfeature' then
    update public.listings set featured = false, updated_at = now() where id = p_id;
  elsif p_action = 'delete' then
    update public.listings set status = 'deleted', is_active = false, deleted_at = now(), updated_at = now() where id = p_id;
  elsif p_action = 'restore' then
    update public.listings set status = 'paused', is_active = false, deleted_at = null, updated_at = now() where id = p_id;
  elsif p_action = 'purge' then
    if l.deleted_at is null and coalesce(l.status,'') not in ('deleted','removed') then
      raise exception 'delete_before_purge';
    end if;
    perform cabana_admin.log('listing.purge', 'listing', p_id::text,
      jsonb_build_object('reason', v_reason, 'title', l.title, 'partner_id', l.partner_id, 'snapshot', to_jsonb(l) - 'description'));
    delete from public.listings where id = p_id;
    return jsonb_build_object('ok', true, 'purged', true);
  elsif p_action = 'transfer' then
    v_to := nullif(v_payload ->> 'to', '')::uuid;
    if v_to is null or not exists (select 1 from public.profiles where id = v_to) then raise exception 'new_owner_not_found'; end if;
    if v_to = l.partner_id then raise exception 'same_owner'; end if;
    update public.listings set partner_id = v_to, host_id = v_to, updated_at = now() where id = p_id;
  elsif p_action = 'set_3d' then
    update public.listings
       set tour_3d_status = coalesce(nullif(v_payload ->> 'status',''), tour_3d_status),
           tour_3d_url = case when v_payload ? 'url' then nullif(btrim(v_payload ->> 'url'),'') else tour_3d_url end,
           updated_at = now()
     where id = p_id;
    if v_payload ? 'request_id' and v_payload ? 'request_status' then
      update public.tour3d_requests set status = v_payload ->> 'request_status', updated_at = now()
       where id = (v_payload ->> 'request_id')::uuid and listing_id = p_id;
    end if;
  elsif p_action = 'note' then
    if v_reason is null then raise exception 'note_required'; end if;
  else
    raise exception 'unknown_action';
  end if;

  select * into v_after from public.listings where id = p_id;
  perform cabana_admin.log('listing.' || p_action, 'listing', p_id::text,
    jsonb_build_object('reason', v_reason, 'title', l.title, 'from_status', l.status, 'to_status', v_after.status,
                       'from_owner', l.partner_id, 'to_owner', v_after.partner_id) || (v_payload - 'url'));
  return jsonb_build_object('ok', true, 'status', v_after.status, 'is_active', v_after.is_active,
                            'featured', v_after.featured, 'held_for_owner', v_after.status = 'pending_owner');
end;
$$;

-- ── 14 · SAFETY ──────────────────────────────────────────────────────
create or replace function public.admin_safety()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'sos', (select coalesce(jsonb_agg(to_jsonb(s) - 'user_agent' order by (s.status in ('open','acknowledged')) desc, s.created_at desc), '[]'::jsonb)
              from (select * from public.sos_alerts order by created_at desc limit 100) s),
    'checkin', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id',c.id,'status',c.status,'code',c.issue_code,'text',c.free_text,'fault',c.fault,'resolution',c.resolution,
                   'refund',c.refund_amount,'host_payout',c.host_payout,'phase',c.window_phase,'hours',c.hours_to_checkin,
                   'photo',c.photo_url,'distance',c.geo_distance_m,'prefer_refund',c.prefer_refund,'at',c.created_at,'resolved_at',c.resolved_at,
                   'booking_id',c.booking_id,'listing_id',c.listing_id,'listing',l.title,
                   'guest',coalesce(nullif(btrim(concat_ws(' ',g.first_name,g.last_name)),''),g.email),'guest_id',c.guest_id,
                   'host',coalesce(nullif(btrim(concat_ws(' ',h.first_name,h.last_name)),''),h.email),'host_id',c.host_id)
                   order by c.created_at desc), '[]'::jsonb)
                  from (select * from public.checkin_issues order by created_at desc limit 100) c
                  left join public.listings l on l.id::text = c.listing_id
                  left join public.profiles g on g.id = c.guest_id
                  left join public.profiles h on h.id = c.host_id),
    'disputes', (select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'status',d.status,'category',d.category,'description',d.description,
                   'booking_id',d.booking_id,'resolution',d.resolution,'note',d.resolution_note,'at',d.created_at,'resolved_at',d.resolved_at,
                   'raised_by',d.raised_by,'raised_name',coalesce(nullif(btrim(concat_ws(' ',r.first_name,r.last_name)),''),r.email),
                   'against_id',d.against_id,'against_name',coalesce(nullif(btrim(concat_ws(' ',a.first_name,a.last_name)),''),a.email))
                   order by d.created_at desc), '[]'::jsonb)
                   from (select * from public.disputes order by created_at desc limit 100) d
                   left join public.profiles r on r.id = d.raised_by
                   left join public.profiles a on a.id = d.against_id),
    'violations', (select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'categories',v.categories,'excerpt',v.excerpt,'at',v.created_at,
                     'user_id',v.user_id,'conversation_id',v.conversation_id,
                     'user',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email)) order by v.created_at desc), '[]'::jsonb)
                     from (select * from public.chat_violations order by created_at desc limit 100) v
                     left join public.profiles p on p.id = v.user_id),
    'repeat_offenders', (select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'n',n,'last',last,
                          'user',(select coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email) from public.profiles p where p.id = z.user_id))
                          order by n desc), '[]'::jsonb)
                          from (select user_id, count(*) n, max(created_at) last from public.chat_violations
                                 where created_at > now() - interval '30 days' group by user_id having count(*) >= 2) z),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'rating',r.rating,'text',r.review_text,'guest',r.guest_name,
                  'listing',coalesce(r.listing_name,l.title),'listing_id',r.listing_id,'reply',r.host_reply,'at',r.created_at)
                  order by r.created_at desc), '[]'::jsonb)
                  from (select * from public.reviews order by created_at desc limit 100) r left join public.listings l on l.id = r.listing_id),
    'uploads', (select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc), '[]'::jsonb)
                  from (select * from public.partner_uploads order by created_at desc limit 100) u),
    'cards', (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'card',c.card,'reason',c.reason,'voided',c.voided,'at',c.created_at,
                'expires_at',c.expires_at,'host_id',c.host_id,
                'host',(select coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email) from public.profiles p where p.id = c.host_id))
                order by c.created_at desc), '[]'::jsonb)
                from (select * from public.host_cards order by created_at desc limit 60) c)
  );
end;
$$;

create or replace function public.admin_safety_action(p_kind text, p_id text, p_action text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_note text := nullif(btrim(coalesce(p_note,'')), '');
begin
  perform cabana_admin.guard();
  if p_kind = 'sos' then
    if p_action = 'acknowledge' then
      update public.sos_alerts set status = 'acknowledged', acknowledged_at = now(), acknowledged_by = auth.uid(), updated_at = now()
       where id = p_id::uuid and status = 'open';
    elsif p_action in ('resolved','false_alarm') then
      update public.sos_alerts set status = p_action, resolved_at = now(), resolution = coalesce(v_note, resolution),
             acknowledged_at = coalesce(acknowledged_at, now()), acknowledged_by = coalesce(acknowledged_by, auth.uid()), updated_at = now()
       where id = p_id::uuid;
    else raise exception 'unknown_action'; end if;
  elsif p_kind = 'dispute' then
    if p_action not in ('resolved','dismissed','open') then raise exception 'unknown_action'; end if;
    update public.disputes set status = p_action,
           resolution = case when p_action = 'open' then null else coalesce(v_note, resolution) end,
           resolution_note = coalesce(v_note, resolution_note),
           resolved_at = case when p_action = 'open' then null else now() end
     where id = p_id::bigint;
  elsif p_kind = 'checkin' then
    if p_action not in ('resolved','dismissed','escalated') then raise exception 'unknown_action'; end if;
    update public.checkin_issues set status = p_action,
           resolution = coalesce(v_note, resolution),
           resolved_at = case when p_action in ('resolved','dismissed') then now() else resolved_at end
     where id = p_id::uuid;
  elsif p_kind = 'review' then
    if p_action <> 'delete' then raise exception 'unknown_action'; end if;
    perform cabana_admin.log('review.delete', 'review', p_id,
      (select jsonb_build_object('rating', r.rating, 'text', r.review_text, 'listing_id', r.listing_id, 'guest', r.guest_name)
         from public.reviews r where r.id = p_id::uuid) || jsonb_build_object('reason', v_note));
    delete from public.reviews where id = p_id::uuid;
    return jsonb_build_object('ok', true);
  elsif p_kind = 'upload' then
    if p_action not in ('approved','rejected') then raise exception 'unknown_action'; end if;
    update public.partner_uploads
       set status = p_action, reviewed_at = now(),
           rejection_reason = case when p_action = 'rejected' then coalesce(v_note, 'Does not meet guidelines') else null end
     where id::text = p_id;
  elsif p_kind = 'card' then
    if p_action <> 'void' then raise exception 'unknown_action'; end if;
    update public.host_cards set voided = true, void_reason = coalesce(v_note, 'Voided by Cabana') where id = p_id::uuid;
  elsif p_kind = 'ops' then
    update public.ops_alerts set acknowledged_at = now(), acknowledged_by = auth.uid() where id = p_id::uuid;
  elsif p_kind = 'conflict' then
    if p_action not in ('resolved','ignored') then raise exception 'unknown_action'; end if;
    update public.calendar_conflicts set status = p_action, resolved_at = now(), resolved_by = auth.uid(),
           resolution = coalesce(v_note, resolution) where id = p_id::uuid;
  else
    raise exception 'unknown_kind';
  end if;

  perform cabana_admin.log(p_kind || '.' || p_action, p_kind, p_id, jsonb_build_object('note', v_note));
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 15 · FOOD ORDERS ─────────────────────────────────────────────────
create or replace function public.admin_food(p_status text default 'live', p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.food_orders group by status) s),
    'today', (select jsonb_build_object('orders', count(*), 'completed', count(*) filter (where status = 'completed'),
                                        'value', coalesce(sum(total) filter (where status = 'completed'),0),
                                        'declined', count(*) filter (where status in ('declined','expired')))
                from public.food_orders where created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi'),
    'speed', (select jsonb_build_object(
                'accept_mins', round(avg(extract(epoch from (accepted_at - requested_at)) / 60)::numeric, 1),
                'ready_mins', round(avg(extract(epoch from (ready_at - accepted_at)) / 60)::numeric, 1),
                'deliver_mins', round(avg(extract(epoch from (completed_at - coalesce(dispatched_at, ready_at))) / 60)::numeric, 1),
                'rating', round(avg(rating)::numeric, 2))
                from public.food_orders where created_at > now() - interval '30 days'),
    'kitchens', (select coalesce(jsonb_agg(jsonb_build_object('listing_id', l.id, 'title', l.title, 'city', l.city,
                    'accepts', r.accepts_orders, 'paused_until', r.orders_paused_until,
                    'orders', (select count(*) from public.food_orders o where o.listing_id = l.id),
                    'completed', (select count(*) from public.food_orders o where o.listing_id = l.id and o.status = 'completed'))), '[]'::jsonb)
                   from public.listings l left join public.restaurant_profiles r on r.listing_id = l.id
                  where coalesce(l.service, l.type) = 'food' and l.deleted_at is null),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id',o.id,'ref',o.ref,'status',o.status,'mode',o.mode,'pay',o.pay_method,'total',o.total,'currency',o.currency,
                  'items',o.item_count,'diner',o.diner_name,'phone',o.diner_phone,'address',o.address,'kitchen',l.title,
                  'listing_id',o.listing_id,'eta',o.eta_mins,'requested_at',o.requested_at,'accepted_at',o.accepted_at,
                  'completed_at',o.completed_at,'expires_at',o.expires_at,'decline_reason',coalesce(o.decline_reason,o.decline_code),
                  'cancel_reason',o.cancel_reason,'rating',o.rating,'created_at',o.created_at) order by o.created_at desc), '[]'::jsonb)
                 from (select * from public.food_orders
                        where (coalesce(p_status,'live') = 'all')
                           or (p_status = 'live' and status in ('requested','awaiting_payment','accepted','ready','on_the_way'))
                           or status = p_status
                        order by created_at desc limit greatest(1, least(coalesce(p_limit,100),500))) o
                 left join public.listings l on l.id = o.listing_id)
  );
end;
$$;

-- ── 16 · AUDIT ───────────────────────────────────────────────────────
create or replace function public.admin_audit(p_q text default null, p_type text default null,
                                              p_limit integer default 100, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare pat text := case when coalesce(btrim(p_q),'') = '' then null else '%' || btrim(p_q) || '%' end;
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'total', (select count(*) from public.admin_audit_log a
               where (p_type is null or p_type in ('','all') or a.target_type = p_type)
                 and (pat is null or a.action ilike pat or a.actor_email ilike pat or coalesce(a.target_id,'') ilike pat or a.meta::text ilike pat)),
    'types', (select coalesce(jsonb_object_agg(target_type, n), '{}'::jsonb)
                from (select target_type, count(*) n from public.admin_audit_log group by target_type) t),
    'rows', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) from (
       select * from public.admin_audit_log a
        where (p_type is null or p_type in ('','all') or a.target_type = p_type)
          and (pat is null or a.action ilike pat or a.actor_email ilike pat or coalesce(a.target_id,'') ilike pat or a.meta::text ilike pat)
        order by a.created_at desc
        limit greatest(1, least(coalesce(p_limit,100),500)) offset greatest(0, coalesce(p_offset,0))) a)
  );
end;
$$;

-- ── 17 · TEAM ────────────────────────────────────────────────────────
create or replace function public.admin_team()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'me', lower(coalesce(auth.jwt() ->> 'email','')),
    'my_role', public.admin_role(),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'email', a.email, 'name', a.name, 'role', a.role, 'added_at', a.added_at,
        'last_sign_in_at', u.last_sign_in_at,
        'actions_30d', (select count(*) from public.admin_audit_log l where lower(l.actor_email) = lower(a.email)
                          and l.created_at > now() - interval '30 days')) order by a.added_at), '[]'::jsonb)
      from public.admin_users a left join auth.users u on lower(u.email) = lower(a.email))
  );
end;
$$;

create or replace function public.admin_team_set(p_email text, p_role text default 'admin', p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_email text := lower(btrim(coalesce(p_email,'')));
begin
  perform cabana_admin.guard();
  if public.admin_role() <> 'super_admin' then raise exception 'super_admin_required'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if p_role not in ('super_admin','admin') then raise exception 'invalid_role'; end if;
  if v_email = lower(coalesce(auth.jwt() ->> 'email','')) and p_role <> 'super_admin' then
    raise exception 'cannot_demote_yourself';
  end if;
  insert into public.admin_users (email, name, role)
  values (v_email, nullif(btrim(coalesce(p_name,'')),''), p_role)
  on conflict (email) do update set role = excluded.role, name = coalesce(excluded.name, public.admin_users.name);
  perform cabana_admin.log('team.set', 'admin_user', v_email, jsonb_build_object('role', p_role, 'name', p_name));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_team_remove(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_email text := lower(btrim(coalesce(p_email,'')));
begin
  perform cabana_admin.guard();
  if public.admin_role() <> 'super_admin' then raise exception 'super_admin_required'; end if;
  if v_email = lower(coalesce(auth.jwt() ->> 'email','')) then raise exception 'cannot_remove_yourself'; end if;
  if (select role from public.admin_users where lower(email) = v_email) = 'super_admin'
     and (select count(*) from public.admin_users where role = 'super_admin') <= 1 then
    raise exception 'last_super_admin';
  end if;
  delete from public.admin_users where lower(email) = v_email;
  perform cabana_admin.log('team.remove', 'admin_user', v_email, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 18 · HEALTH ──────────────────────────────────────────────────────
create or replace function public.admin_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare v_cron jsonb := '[]'::jsonb;
begin
  perform cabana_admin.guard();
  begin
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
             'last_status', r.status, 'last_run', r.start_time, 'last_message', left(r.return_message, 160),
             'failures_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed'
                               and d.start_time > now() - interval '24 hours'),
             'runs_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid
                               and d.start_time > now() - interval '24 hours')) order by j.jobname), '[]'::jsonb)
      into v_cron
      from cron.job j
      left join lateral (select status, start_time, return_message from cron.job_run_details d
                          where d.jobid = j.jobid order by d.start_time desc limit 1) r on true;
  exception when others then
    v_cron := jsonb_build_array(jsonb_build_object('name','cron','error',sqlerrm));
  end;

  return jsonb_build_object(
    'at', now(),
    'database', jsonb_build_object('size_bytes', pg_database_size(current_database()), 'version', current_setting('server_version')),
    'cron', v_cron,
    'calendar', jsonb_build_object(
        'feeds', (select count(*) from public.calendar_feeds where is_active),
        'failing', (select count(*) from public.calendar_feeds where is_active and consecutive_failures > 0),
        'runs_24h', (select count(*) from public.calendar_sync_runs where started_at > now() - interval '24 hours'),
        'errors_24h', (select count(*) from public.calendar_sync_runs where started_at > now() - interval '24 hours' and outcome not in ('ok','not_modified','unchanged','success')),
        'last_run', (select max(started_at) from public.calendar_sync_runs),
        'failing_feeds', (select coalesce(jsonb_agg(jsonb_build_object('listing',l.title,'platform',f.platform,'failures',f.consecutive_failures,
                            'error',left(f.last_error,160),'last_success_at',f.last_success_at)), '[]'::jsonb)
                            from public.calendar_feeds f left join public.listings l on l.id = f.listing_id
                           where f.is_active and f.consecutive_failures > 0)),
    'email', jsonb_build_object(
        'sent_7d', (select count(*) from public.email_log where status = 'sent' and created_at > now() - interval '7 days'),
        'failed_7d', (select count(*) from public.email_log where status = 'failed' and created_at > now() - interval '7 days'),
        'skipped_7d', (select count(*) from public.email_log where status in ('skipped','suppressed') and created_at > now() - interval '7 days'),
        'last_failure', (select jsonb_build_object('at', created_at, 'template', template, 'error', left(error,200))
                           from public.email_log where status = 'failed' order by created_at desc limit 1),
        'recent', (select coalesce(jsonb_agg(jsonb_build_object('at',e.created_at,'to',e.recipient,'template',e.template,
                      'subject',e.subject,'status',e.status,'error',left(e.error,160)) order by e.created_at desc), '[]'::jsonb)
                     from (select * from public.email_log order by created_at desc limit 40) e)),
    'push', jsonb_build_object(
        'subscriptions', (select count(*) from public.push_subscriptions),
        'subscribers', (select count(distinct user_id) from public.push_subscriptions),
        'notifications_24h', (select count(*) from public.notifications where created_at > now() - interval '24 hours')),
    'payments', jsonb_build_object(
        'failed_24h', (select count(*) from public.booking_payments where status = 'failed' and created_at > now() - interval '24 hours'),
        'stuck', (select count(*) from public.booking_payments where status not in ('paid','failed','expired')
                    and created_at < now() - interval '1 hour'),
        'last_paid_at', (select max(paid_at) from public.booking_payments where status = 'paid')),
    'ops_alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
                     from (select * from public.ops_alerts order by (acknowledged_at is null) desc, created_at desc limit 30) a),
    'tables', (select coalesce(jsonb_object_agg(relname, n_live_tup), '{}'::jsonb)
                 from pg_stat_user_tables where schemaname = 'public'
                  and relname in ('profiles','listings','apartment_bookings','booking_payments','tour_bookings','event_tickets',
                                  'food_orders','car_bookings','flight_requests','ride_requests','chat_messages','support_threads',
                                  'site_visits','signal_events','session_features','analytics_events','notifications','email_log',
                                  'admin_audit_log','push_subscriptions','reviews','tours','events')),
    'storage', (select coalesce(jsonb_object_agg(bucket_id, jsonb_build_object('objects', n, 'bytes', b)), '{}'::jsonb)
                  from (select bucket_id, count(*) n, coalesce(sum((metadata ->> 'size')::bigint),0) b
                          from storage.objects group by bucket_id) s)
  );
end;
$$;

-- ── 19 · GRANTS ──────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_whoami()',
    'public.admin_log(text,text,text,jsonb)',
    'public.admin_overview(integer)',
    'public.admin_inbox()',
    'public.admin_pulse()',
    'public.admin_search(text)',
    'public.admin_bookings(text,text,text,timestamptz,timestamptz,integer,integer,text)',
    'public.admin_booking(text,text)',
    'public.admin_booking_action(text,text,text,text,numeric)',
    'public.admin_payments(text,text,text,integer,integer)',
    'public.admin_finance(integer)',
    'public.admin_withdrawal_action(uuid,text,text)',
    'public.admin_people(text,text,integer,integer,text)',
    'public.admin_person(uuid)',
    'public.admin_person_action(uuid,text,text,jsonb)',
    'public.admin_listings(text,text,text,integer,integer,text)',
    'public.admin_listing(uuid)',
    'public.admin_listing_action(uuid,text,text,jsonb)',
    'public.admin_safety()',
    'public.admin_safety_action(text,text,text,text)',
    'public.admin_food(text,integer)',
    'public.admin_audit(text,text,integer,integer)',
    'public.admin_team()',
    'public.admin_team_set(text,text,text)',
    'public.admin_team_remove(text)',
    'public.admin_health()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on function cabana_admin.guard() from public, anon, authenticated;
revoke all on function cabana_admin.log(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.admin_audit_stamp() from public, anon, authenticated;
