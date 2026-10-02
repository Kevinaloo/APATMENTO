-- ═══════════════════════════════════════════════════════════════════════
-- CABANA MOVE · THE DRIVER'S SHARE, AND TRIPS THAT "NEVER HAPPENED"
-- ───────────────────────────────────────────────────────────────────────
-- The rider pays the driver directly (cash, M-Pesa, card). Cabana's share
-- of every completed trip is remitted by the driver within 24 hours. A
-- driver with a share past due is delisted automatically: they cannot go
-- online, receive invitations, make offers or be assigned, and they are
-- reinstated by themselves the moment the balance clears.
--
-- The obvious way around a share is to meet in the app and finish off it:
-- accept, cancel, drive anyway. So a cancelled trip is not the end of the
-- story here. For three hours after any cancellation involving an assigned
-- driver, both phones keep a sparse breadcrumb (the driver's every ping,
-- the rider's page if it is open), and a scanner looks for the shapes a
-- real trip leaves behind:
--
--   co_travel            the two phones moving together after the cancel
--   pickup_then_dropoff  the driver at the pickup, then at the destination
--   reappeared_at_drop   the driver went dark near the pickup and came
--                        back online near the destination
--   went_dark            the driver went offline right at the pickup
--   repeat_pair          the same rider and driver keep "cancelling"
--
-- Strong evidence raises the share as if the trip had completed (the
-- driver is told, with the reason, and can dispute it with support).
-- Weaker evidence opens a case for a person to look at. Trips that are
-- started but never ended are closed automatically, and trips that sit
-- "assigned" for hours are scanned the same way.
--
-- The rate and the window live in cabana_private.policy, not in pages.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 0 · internal policy ───────────────────────────────────────────────
create table if not exists cabana_private.policy (
  key        text primary key,
  num        numeric,
  note       text,
  updated_at timestamptz not null default now()
);
revoke all on cabana_private.policy from public, anon, authenticated;
insert into cabana_private.policy (key, num, note) values
  ('ride_commission_rate', 0.10, 'Share of the agreed fare a driver remits on each completed trip'),
  ('ride_remit_hours',     24,   'Hours a driver has to remit before delisting'),
  ('ride_watch_hours',     3,    'Hours a cancelled trip stays under watch')
on conflict (key) do nothing;

create or replace function cabana_private.policy_num(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = pg_catalog, cabana_private as $$
  select coalesce((select num from cabana_private.policy where key = p_key), p_default)
$$;
revoke all on function cabana_private.policy_num(text, numeric) from public, anon, authenticated;

create or replace function cabana_private.geo_m(a_lat float8, a_lng float8, b_lat float8, b_lng float8)
returns float8 language sql immutable set search_path = pg_catalog as $$
  select case when a_lat is null or a_lng is null or b_lat is null or b_lng is null then null
    else 12742000 * asin(least(1, sqrt(
      power(sin(radians(b_lat - a_lat) / 2), 2) +
      cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)))) end
$$;

-- ── 1 · ledger tables ─────────────────────────────────────────────────
create table if not exists public.ride_commissions (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.ride_requests(id) on delete cascade,
  driver_id     uuid not null references public.drivers(id) on delete cascade,
  source        text not null default 'completed' check (source in ('completed', 'detected', 'desk')),
  currency      text not null,
  fare_minor    bigint not null check (fare_minor >= 0),
  rate          numeric not null,
  amount_minor  bigint not null check (amount_minor >= 0),
  status        text not null default 'due' check (status in ('due', 'paid', 'waived', 'disputed')),
  due_at        timestamptz not null,
  reminded_at   timestamptz,
  paid_at       timestamptz,
  remittance_id uuid,
  evidence      jsonb,
  note          text,
  created_at    timestamptz not null default now(),
  unique (request_id)
);
create index if not exists ride_commissions_driver_idx on public.ride_commissions (driver_id, status, due_at);

create table if not exists public.ride_remittances (
  id                uuid primary key default gen_random_uuid(),
  driver_id         uuid not null references public.drivers(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  payment_reference text not null unique,
  grand_total       numeric not null check (grand_total > 0),
  amount_paid       numeric not null default 0,
  payment_mode      text not null default 'full',
  status            text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'cancelled')),
  covers            uuid[] not null,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);
create index if not exists ride_remittances_driver_idx on public.ride_remittances (driver_id, created_at desc);

create table if not exists public.ride_cancellations (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.ride_requests(id) on delete cascade,
  driver_id    uuid not null references public.drivers(id) on delete cascade,
  rider_id     uuid,
  phase        text not null check (phase in ('assigned', 'arriving', 'stale')),
  cancelled_by text,
  agreed_minor bigint,
  currency     text,
  pickup_lat   float8, pickup_lng float8, dropoff_lat float8, dropoff_lng float8,
  duration_min integer,
  at           timestamptz not null default now(),
  scanned_at   timestamptz
);
create index if not exists ride_cancellations_watch_idx on public.ride_cancellations (driver_id, at desc);
create index if not exists ride_cancellations_scan_idx on public.ride_cancellations (at) where scanned_at is null;

create table if not exists public.ride_track_points (
  id         bigserial primary key,
  request_id uuid not null references public.ride_requests(id) on delete cascade,
  actor      text not null check (actor in ('driver', 'rider')),
  lat        float8 not null,
  lng        float8 not null,
  at         timestamptz not null default now()
);
create index if not exists ride_track_points_idx on public.ride_track_points (request_id, actor, at);

create table if not exists public.ride_leak_cases (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.ride_requests(id) on delete cascade,
  cancellation_id uuid references public.ride_cancellations(id) on delete set null,
  driver_id     uuid references public.drivers(id) on delete cascade,
  rider_id      uuid,
  strength      text not null check (strength in ('strong', 'medium', 'weak')),
  signals       jsonb not null,
  status        text not null default 'open' check (status in ('open', 'charged', 'confirmed', 'dismissed')),
  commission_id uuid,
  note          text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid,
  unique (request_id, driver_id)
);

do $$ declare t text; begin
  foreach t in array array['ride_commissions', 'ride_remittances', 'ride_cancellations', 'ride_track_points', 'ride_leak_cases'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant select on public.ride_commissions, public.ride_remittances to authenticated;
do $$ begin
  create policy ride_commissions_own on public.ride_commissions for select to authenticated
    using (driver_id in (select d.id from public.drivers d where d.user_id = (select auth.uid())) or (select public.is_admin()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy ride_remittances_own on public.ride_remittances for select to authenticated
    using (user_id = (select auth.uid()) or (select public.is_admin()));
exception when duplicate_object then null; end $$;

-- ── 2 · the share is raised the moment a trip completes ───────────────
create or replace function cabana_private.ride_raise_commission(p_request uuid, p_driver uuid, p_fare bigint,
  p_currency text, p_source text, p_evidence jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_rate numeric := cabana_private.policy_num('ride_commission_rate', 0.10);
  v_hours numeric := cabana_private.policy_num('ride_remit_hours', 24);
  v_id uuid; v_amount bigint; v_user uuid; v_ref text;
begin
  if p_driver is null or coalesce(p_fare, 0) <= 0 then return null; end if;
  v_amount := round(p_fare * v_rate);
  insert into public.ride_commissions (request_id, driver_id, source, currency, fare_minor, rate, amount_minor, due_at, evidence)
  values (p_request, p_driver, p_source, coalesce(p_currency, 'KES'), p_fare, v_rate, v_amount,
          now() + make_interval(hours => v_hours::integer), p_evidence)
  on conflict (request_id) do nothing
  returning id into v_id;
  if v_id is null then return null; end if;
  select user_id into v_user from public.drivers where id = p_driver;
  select ref into v_ref from public.ride_requests where id = p_request;
  perform public.cabana_notify(v_user, 'driver',
    case when p_source = 'detected' then 'Trip ' || v_ref || ' happened after it was cancelled'
         else 'Remit ' || public.ride_money(v_amount, p_currency) || ' for trip ' || v_ref end,
    case when p_source = 'detected'
         then 'Location records show this trip went ahead off the app. Cabana''s share of '
              || public.ride_money(v_amount, p_currency) || ' is due within ' || v_hours || ' hours. If this is wrong, tell support from your dashboard.'
         else 'Cabana''s share is due within ' || v_hours || ' hours. Pay it from your driver dashboard to stay online.' end,
    '/driver#remit', jsonb_build_object('event', 'commission_due', 'request_id', p_request, 'commission_id', v_id));
  return v_id;
end $$;
revoke all on function cabana_private.ride_raise_commission(uuid, uuid, bigint, text, text, jsonb) from public, anon, authenticated;

-- Who was in the car, before anyone could erase it.
create or replace function cabana_private.ride_requests_track_driver()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_phase text;
begin
  if old.driver_id is not null
     and old.status in ('assigned', 'arriving')
     and (new.driver_id is distinct from old.driver_id or new.status in ('cancelled', 'searching', 'expired', 'unfulfilled')) then
    v_phase := old.status;
    insert into public.ride_cancellations (request_id, driver_id, rider_id, phase, cancelled_by, agreed_minor, currency,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, duration_min)
    values (old.id, old.driver_id, old.rider_id, v_phase,
            coalesce(new.cancelled_by, case when new.status = 'searching' then 'driver' else 'system' end),
            old.agreed_minor, old.currency, old.pickup_lat, old.pickup_lng, old.dropoff_lat, old.dropoff_lng, old.duration_min);
  end if;
  return new;
exception when others then
  raise warning 'ride_requests_track_driver: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.ride_requests_track_driver() from public, anon, authenticated;
create or replace trigger trg_ride_requests_track_driver after update on public.ride_requests
  for each row execute function cabana_private.ride_requests_track_driver();

create or replace function cabana_private.ride_requests_commission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and new.driver_id is not null and coalesce(new.assigned_snapshot->>'source', 'driver') <> 'desk' then
    perform cabana_private.ride_raise_commission(new.id, new.driver_id, coalesce(new.agreed_minor, 0), new.currency, 'completed', null);
  end if;
  return new;
exception when others then
  raise warning 'ride_requests_commission: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.ride_requests_commission() from public, anon, authenticated;
create or replace trigger trg_ride_requests_commission after update of status on public.ride_requests
  for each row execute function cabana_private.ride_requests_commission();

-- ── 3 · breadcrumbs ───────────────────────────────────────────────────
create or replace function cabana_private.ride_watch_point(p_request uuid, p_actor text, p_lat float8, p_lng float8)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_lat is null or p_lng is null or abs(p_lat) > 90 or abs(p_lng) > 180 then return; end if;
  if exists (select 1 from public.ride_track_points t where t.request_id = p_request and t.actor = p_actor
               and t.at > now() - interval '15 seconds') then return; end if;
  insert into public.ride_track_points (request_id, actor, lat, lng) values (p_request, p_actor, p_lat, p_lng);
end $$;
revoke all on function cabana_private.ride_watch_point(uuid, text, float8, float8) from public, anon, authenticated;

create or replace function cabana_private.driver_locations_breadcrumb()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r record; v_watch interval := make_interval(hours => cabana_private.policy_num('ride_watch_hours', 3)::integer);
begin
  for r in
    select q.id from public.ride_requests q
     where q.driver_id = new.driver_id and q.status in ('assigned', 'arriving', 'in_progress')
    union
    select c.request_id from public.ride_cancellations c
     where c.driver_id = new.driver_id and c.at > now() - v_watch
  loop
    perform cabana_private.ride_watch_point(r.id, 'driver', new.lat, new.lng);
  end loop;
  return new;
exception when others then
  raise warning 'driver_locations_breadcrumb: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.driver_locations_breadcrumb() from public, anon, authenticated;
create or replace trigger trg_driver_locations_breadcrumb after insert or update of lat, lng, updated_at on public.driver_locations
  for each row execute function cabana_private.driver_locations_breadcrumb();

-- The rider's page reports where they are while a trip is live, and for a
-- short while after a pickup was cancelled. Nothing else reads it.
create or replace function public.ride_rider_ping(p_ref text, p_token text, p_lat float8, p_lng float8)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r public.ride_requests%rowtype;
  v_watch interval := make_interval(hours => cabana_private.policy_num('ride_watch_hours', 3)::integer);
begin
  r := public.ride_guest_request(p_ref, p_token);
  if r.status in ('assigned', 'arriving', 'in_progress')
     or exists (select 1 from public.ride_cancellations c where c.request_id = r.id and c.at > now() - v_watch) then
    perform cabana_private.ride_watch_point(r.id, 'rider', p_lat, p_lng);
    return true;
  end if;
  return false;
end $$;
revoke all on function public.ride_rider_ping(text, text, float8, float8) from public;
grant execute on function public.ride_rider_ping(text, text, float8, float8) to anon, authenticated;

-- ── 4 · the scanner ───────────────────────────────────────────────────
create or replace function cabana_private.ride_leak_signals(c public.ride_cancellations)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_trip interval := make_interval(mins => greatest(40, coalesce(c.duration_min, 25) * 3));
  at_pickup boolean; at_drop boolean; co_pairs integer := 0; co_span float8 := 0;
  went_dark boolean := false; reappear boolean := false; repeat_n integer;
  v_near_at timestamptz; v_back_at timestamptz; v_back_lat float8; v_back_lng float8;
begin
  select exists (select 1 from public.ride_track_points t where t.request_id = c.request_id and t.actor = 'driver'
                   and t.at between c.at - interval '5 minutes' and c.at + interval '25 minutes'
                   and cabana_private.geo_m(t.lat, t.lng, c.pickup_lat, c.pickup_lng) < 200)
    into at_pickup;
  select exists (select 1 from public.ride_track_points t where t.request_id = c.request_id and t.actor = 'driver'
                   and t.at between c.at and c.at + v_trip and c.dropoff_lat is not null
                   and cabana_private.geo_m(t.lat, t.lng, c.dropoff_lat, c.dropoff_lng) < 400)
    into at_drop;

  select count(*), coalesce(max(cabana_private.geo_m(d.lat, d.lng, c.pickup_lat, c.pickup_lng)), 0)
    into co_pairs, co_span
    from public.ride_track_points d
    join public.ride_track_points r on r.request_id = d.request_id and r.actor = 'rider'
     and abs(extract(epoch from (r.at - d.at))) <= 60
     and cabana_private.geo_m(d.lat, d.lng, r.lat, r.lng) < 120
   where d.request_id = c.request_id and d.actor = 'driver' and d.at > c.at;

  -- The driver's last breadcrumb near the pickup, then silence.
  select t.at into v_near_at from public.ride_track_points t
   where t.request_id = c.request_id and t.actor = 'driver' and t.at between c.at - interval '5 minutes' and c.at + interval '25 minutes'
     and cabana_private.geo_m(t.lat, t.lng, c.pickup_lat, c.pickup_lng) < 300
   order by t.at desc limit 1;
  if v_near_at is not null then
    select t.at, t.lat, t.lng into v_back_at, v_back_lat, v_back_lng from public.ride_track_points t
     where t.request_id = c.request_id and t.actor = 'driver' and t.at > v_near_at
     order by t.at limit 1;
    went_dark := v_back_at is null or v_back_at - v_near_at > interval '12 minutes';
    reappear := v_back_at is not null and v_back_at - v_near_at > interval '8 minutes'
                and c.dropoff_lat is not null
                and cabana_private.geo_m(v_back_lat, v_back_lng, c.dropoff_lat, c.dropoff_lng) < 700;
  end if;

  select count(*) into repeat_n from public.ride_cancellations x
   where x.driver_id = c.driver_id and x.rider_id is not distinct from c.rider_id and c.rider_id is not null
     and x.at > now() - interval '30 days';

  return jsonb_build_object(
    'co_travel', co_pairs >= 3 and co_span > 800, 'co_pairs', co_pairs,
    'pickup_then_dropoff', at_pickup and at_drop,
    'reappeared_at_drop', at_pickup and reappear,
    'went_dark', at_pickup and went_dark,
    'repeat_pair', repeat_n >= 2, 'repeat_count', repeat_n,
    'at_pickup', at_pickup, 'at_dropoff', at_drop);
end $$;
revoke all on function cabana_private.ride_leak_signals(public.ride_cancellations) from public, anon, authenticated;

create or replace function public.ride_leak_scan()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare c public.ride_cancellations%rowtype; s jsonb; v_strength text; v_case uuid; v_comm uuid;
  n_strong integer := 0; n_medium integer := 0; n_scanned integer := 0; q record; v_fare bigint; v_cur text;
begin
  -- Trips that sit assigned for hours are treated as cancelled for scanning.
  for q in select * from public.ride_requests r
            where r.status in ('assigned', 'arriving') and r.driver_id is not null
              and coalesce(r.scheduled_for, r.assigned_at) < now() - interval '3 hours'
              and not exists (select 1 from public.ride_cancellations x where x.request_id = r.id and x.phase = 'stale')
  loop
    insert into public.ride_cancellations (request_id, driver_id, rider_id, phase, cancelled_by, agreed_minor, currency,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, duration_min, at)
    values (q.id, q.driver_id, q.rider_id, 'stale', 'system', q.agreed_minor, q.currency,
            q.pickup_lat, q.pickup_lng, q.dropoff_lat, q.dropoff_lng, q.duration_min, coalesce(q.arrived_at, q.assigned_at));
  end loop;

  for c in select * from public.ride_cancellations
            where scanned_at is null
              and at < now() - make_interval(mins => greatest(45, coalesce(duration_min, 25) * 3))
            order by at limit 200
            for update skip locked
  loop
    n_scanned := n_scanned + 1;
    s := cabana_private.ride_leak_signals(c);
    v_strength := case
      when (s->>'co_travel')::boolean or (s->>'pickup_then_dropoff')::boolean or (s->>'reappeared_at_drop')::boolean then 'strong'
      when (s->>'repeat_pair')::boolean or (s->>'went_dark')::boolean then 'medium'
      when (s->>'at_pickup')::boolean or (s->>'at_dropoff')::boolean then 'weak'
    end;
    update public.ride_cancellations set scanned_at = now() where id = c.id;
    continue when v_strength is null;

    insert into public.ride_leak_cases (request_id, cancellation_id, driver_id, rider_id, strength, signals)
    values (c.request_id, c.id, c.driver_id, c.rider_id, v_strength, s)
    on conflict (request_id, driver_id) do update
      set signals = excluded.signals,
          strength = case when excluded.strength = 'strong' or ride_leak_cases.strength = 'strong' then 'strong'
                          when excluded.strength = 'medium' or ride_leak_cases.strength = 'medium' then 'medium' else 'weak' end
    returning id into v_case;

    if v_strength = 'strong' then
      select coalesce(c.agreed_minor, r.agreed_minor, r.rider_offer_minor, r.fare_hint_minor), coalesce(c.currency, r.currency)
        into v_fare, v_cur from public.ride_requests r where r.id = c.request_id;
      v_comm := cabana_private.ride_raise_commission(c.request_id, c.driver_id, v_fare, v_cur, 'detected', s);
      if v_comm is not null then
        update public.ride_leak_cases set status = 'charged', commission_id = v_comm where id = v_case;
      end if;
      -- A trip that was really driven is a completed trip, not an open one.
      update public.ride_requests set status = 'completed', completed_at = coalesce(completed_at, now()),
             final_fare = round(coalesce(v_fare, 0)::numeric / public.cabana_minor_factor(coalesce(v_cur, currency)))::int,
             admin_notes = left(concat_ws(E'\n', admin_notes, 'Auto-completed: trip detected after ' || c.phase || ' cancellation'), 2000)
       where id = c.request_id and status in ('assigned', 'arriving') and c.phase = 'stale';
      n_strong := n_strong + 1;
    end if;

    if v_strength in ('strong', 'medium') then
      n_medium := n_medium + case when v_strength = 'medium' then 1 else 0 end;
      insert into public.ops_alerts (kind, severity, title, body, meta)
      values ('rides', case when v_strength = 'strong' then 'warn' else 'info' end,
              case when v_strength = 'strong' then 'Off-app trip detected and charged' else 'Possible off-app trip' end,
              'A cancelled trip left the pattern of a real one. Review it in Move → Leak watch.',
              jsonb_build_object('request_id', c.request_id, 'driver_id', c.driver_id, 'case_id', v_case, 'signals', s));
    end if;
  end loop;
  return jsonb_build_object('scanned', n_scanned, 'strong', n_strong, 'medium', n_medium);
end $$;
revoke all on function public.ride_leak_scan() from public, anon, authenticated;

-- ── 5 · remitting ─────────────────────────────────────────────────────
create or replace function public.ride_remit_summary(p_driver uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'rate', cabana_private.policy_num('ride_commission_rate', 0.10),
    'window_hours', cabana_private.policy_num('ride_remit_hours', 24),
    'due_minor', coalesce(sum(c.amount_minor) filter (where c.status = 'due'), 0),
    'overdue_minor', coalesce(sum(c.amount_minor) filter (where c.status = 'due' and c.due_at < now()), 0),
    'currency', coalesce(max(c.currency) filter (where c.status = 'due'), 'KES'),
    'next_due_at', min(c.due_at) filter (where c.status = 'due'),
    'overdue', coalesce(bool_or(c.status = 'due' and c.due_at < now()), false),
    'items', coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'ref', r.ref, 'fare', c.fare_minor, 'amount', c.amount_minor,
               'currency', c.currency, 'due_at', c.due_at, 'source', c.source, 'status', c.status,
               'route', concat_ws(' → ', r.pickup_label, r.dropoff_label)) order by c.due_at)
               filter (where c.status in ('due', 'disputed')), '[]'::jsonb))
    from public.ride_commissions c join public.ride_requests r on r.id = c.request_id
   where c.driver_id = p_driver;
$$;
revoke all on function public.ride_remit_summary(uuid) from public, anon, authenticated;

create or replace function public.ride_remit_start()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare d public.drivers%rowtype; v_ids uuid[]; v_total bigint; rm public.ride_remittances%rowtype;
begin
  select * into d from public.drivers where user_id = auth.uid();
  if not found then raise exception 'Only drivers remit' using errcode = '42501'; end if;
  select array_agg(id order by due_at), sum(amount_minor) into v_ids, v_total
    from public.ride_commissions where driver_id = d.id and status = 'due' and currency = 'KES';
  if v_total is null or v_total <= 0 then raise exception 'Nothing to remit right now' using errcode = '22023'; end if;
  select * into rm from public.ride_remittances
   where driver_id = d.id and status = 'pending_payment' and covers = v_ids and created_at > now() - interval '30 minutes'
   order by created_at desc limit 1;
  if not found then
    insert into public.ride_remittances (driver_id, user_id, payment_reference, grand_total, covers)
    values (d.id, d.user_id, 'REMIT-' || replace(d.id::text, '-', '') || '-' || (extract(epoch from clock_timestamp()) * 1000)::bigint,
            ceil(v_total / 100.0), v_ids)
    returning * into rm;
  end if;
  return jsonb_build_object('reference', rm.payment_reference, 'amount', rm.grand_total, 'currency', 'KES',
    'covers', cardinality(rm.covers), 'phone', coalesce(d.payout_number, d.phone));
end $$;
revoke all on function public.ride_remit_start() from public, anon;
grant execute on function public.ride_remit_start() to authenticated;

create or replace function cabana_private.ride_reinstate_if_clear(p_driver uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare d public.drivers%rowtype;
begin
  select * into d from public.drivers where id = p_driver for update;
  if not found or d.status <> 'suspended' or coalesce(d.status_note, '') <> 'commission_overdue' then return; end if;
  if exists (select 1 from public.ride_commissions c where c.driver_id = p_driver and c.status = 'due' and c.due_at < now()) then return; end if;
  update public.drivers set status = 'approved', status_note = null, updated_at = now() where id = p_driver;
  perform public.cabana_notify(d.user_id, 'driver', 'You are back online',
    'Thank you. Your balance is clear and trips can reach you again.', '/driver', jsonb_build_object('event', 'reinstated'));
end $$;
revoke all on function cabana_private.ride_reinstate_if_clear(uuid) from public, anon, authenticated;

create or replace function cabana_private.settle_ride_remittance(p_ref text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare rm public.ride_remittances%rowtype; v_paid numeric;
begin
  select * into rm from public.ride_remittances where payment_reference = p_ref for update;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into v_paid from public.booking_payments where booking_ref = p_ref and status = 'paid';
  update public.ride_remittances set amount_paid = v_paid,
         status = case when v_paid >= grand_total then 'paid' else status end,
         paid_at = case when v_paid >= grand_total then coalesce(paid_at, now()) else paid_at end
   where id = rm.id;
  if v_paid >= rm.grand_total then
    update public.ride_commissions set status = 'paid', paid_at = now(), remittance_id = rm.id
     where id = any (rm.covers) and status in ('due', 'disputed');
    perform cabana_private.ride_reinstate_if_clear(rm.driver_id);
  end if;
end $$;
revoke all on function cabana_private.settle_ride_remittance(text) from public, anon, authenticated;

create or replace function cabana_private.booking_payment_settle_remit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.booking_table = 'ride_remittances' and new.status = 'paid'
     and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform cabana_private.settle_ride_remittance(new.booking_ref);
  end if;
  return new;
exception when others then
  raise warning 'booking_payment_settle_remit: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.booking_payment_settle_remit() from public, anon, authenticated;
create or replace trigger booking_payment_settle_remit after insert or update of status on public.booking_payments
  for each row execute function cabana_private.booking_payment_settle_remit();

-- ── 6 · enforcement ───────────────────────────────────────────────────
create or replace function public.ride_commission_enforce()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r record; n_rem integer := 0; n_delist integer := 0; n_auto integer := 0;
begin
  -- Trips started and never ended are ended for them.
  for r in select id from public.ride_requests
            where status = 'in_progress' and started_at < now() - make_interval(mins => greatest(180, coalesce(duration_min, 30) * 4))
            for update skip locked
  loop
    update public.ride_requests set status = 'completed', completed_at = now(),
           final_fare = round(coalesce(agreed_minor, 0)::numeric / public.cabana_minor_factor(currency))::int,
           admin_notes = left(concat_ws(E'\n', admin_notes, 'Auto-completed: trip was never ended'), 2000)
     where id = r.id;
    update public.driver_locations set is_available = true
     where driver_id = (select driver_id from public.ride_requests where id = r.id);
    n_auto := n_auto + 1;
  end loop;

  -- A nudge six hours before the deadline.
  for r in select c.id, c.amount_minor, c.currency, c.due_at, d.user_id, q.ref
             from public.ride_commissions c join public.drivers d on d.id = c.driver_id
             join public.ride_requests q on q.id = c.request_id
            where c.status = 'due' and c.reminded_at is null and c.due_at between now() and now() + interval '6 hours'
  loop
    perform public.cabana_notify(r.user_id, 'driver', 'Remit before ' || to_char(r.due_at at time zone 'Africa/Nairobi', 'HH24:MI'),
      public.ride_money(r.amount_minor, r.currency) || ' for trip ' || r.ref || ' is due soon. Pay it from your dashboard to stay online.',
      '/driver#remit', jsonb_build_object('event', 'commission_reminder', 'commission_id', r.id));
    update public.ride_commissions set reminded_at = now() where id = r.id;
    n_rem := n_rem + 1;
  end loop;

  -- Past due: delisted until it clears.
  for r in select distinct d.id, d.user_id from public.ride_commissions c join public.drivers d on d.id = c.driver_id
            where c.status = 'due' and c.due_at < now() and d.status = 'approved'
  loop
    update public.drivers set status = 'suspended', status_note = 'commission_overdue', updated_at = now() where id = r.id;
    update public.driver_locations set is_online = false, is_available = false where driver_id = r.id;
    perform public.cabana_notify(r.user_id, 'driver', 'You are offline until you remit',
      'A share for a completed trip is past due, so trips have stopped reaching you. Pay it from your dashboard and you are back on at once.',
      '/driver#remit', jsonb_build_object('event', 'delisted_commission'));
    n_delist := n_delist + 1;
  end loop;

  for r in select id from public.drivers where status = 'suspended' and status_note = 'commission_overdue' loop
    perform cabana_private.ride_reinstate_if_clear(r.id);
  end loop;

  return jsonb_build_object('auto_completed', n_auto, 'reminded', n_rem, 'delisted', n_delist);
end $$;
revoke all on function public.ride_commission_enforce() from public, anon, authenticated;

select cron.schedule('cabana-ride-commissions', '*/10 * * * *', $$select public.ride_commission_enforce()$$);
select cron.schedule('cabana-ride-leak-scan', '*/10 * * * *', $$select public.ride_leak_scan()$$);

-- A driver with a share past due is not cleared, whatever the clock says.
create or replace function public.cabana_driver_cleared(p_driver uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.drivers d
     where d.id = p_driver and d.status = 'approved'
       and public.cabana_identity_verified(d.user_id)
       and exists (select 1 from public.driver_documents x
                    where x.driver_id = d.id and x.kind = 'driving_licence' and x.status = 'approved'
                      and x.file_url is not null
                      and (x.expires_on is null or x.expires_on >= current_date))
       and not exists (select 1 from public.ride_commissions c
                        where c.driver_id = d.id and c.status = 'due' and c.due_at < now())
  );
$$;

-- The driver board carries the balance; the rider is never told "Cabana takes nothing".
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.ride_driver_board()'::regprocedure);
  if position('ride_remit_summary' in d) = 0 then
    p := replace(d, $x$'clearance', public.cabana_clearance(d.user_id, 'driver'),$x$,
                    $x$'clearance', public.cabana_clearance(d.user_id, 'driver'), 'remit', public.ride_remit_summary(d.id),$x$);
    if p = d then raise exception 'ride_driver_board changed shape'; end if;
    execute p;
  end if;

  d := pg_get_functiondef('public.ride_requests_after()'::regprocedure);
  if position('Cabana takes nothing' in d) > 0 then
    p := replace(d, $x$|| '. Cabana takes nothing. Rate your ride.'$x$, $x$|| '. Then rate your ride.'$x$);
    execute p;
  end if;

  d := pg_get_functiondef('public.ride_driver_offer(uuid, bigint, integer, text)'::regprocedure);
  if position('commission_overdue' in d) = 0 then
    p := replace(d, $x$if d.status <> 'approved' then perform public.ride_err('driver_not_approved'); end if;$x$,
      $x$if d.status = 'suspended' and d.status_note = 'commission_overdue' then perform public.ride_err('commission_overdue'); end if;
  if d.status <> 'approved' then perform public.ride_err('driver_not_approved'); end if;$x$);
    if p = d then raise exception 'ride_driver_offer changed shape'; end if;
    execute p;
  end if;
end $$;

-- ── 7 · the desk ──────────────────────────────────────────────────────
create or replace function public.admin_ride_money()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'due', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'ref', r.ref, 'driver', d.full_name, 'phone', d.phone,
        'amount', c.amount_minor, 'fare', c.fare_minor, 'currency', c.currency, 'due_at', c.due_at, 'source', c.source,
        'status', c.status, 'overdue', c.due_at < now()) order by c.due_at)
      from public.ride_commissions c join public.ride_requests r on r.id = c.request_id join public.drivers d on d.id = c.driver_id
     where c.status in ('due', 'disputed')), '[]'::jsonb),
    'cases', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'ref', r.ref, 'driver', d.full_name, 'strength', k.strength,
        'status', k.status, 'signals', k.signals, 'created_at', k.created_at,
        'route', concat_ws(' → ', r.pickup_label, r.dropoff_label)) order by k.created_at desc)
      from public.ride_leak_cases k join public.ride_requests r on r.id = k.request_id left join public.drivers d on d.id = k.driver_id
     where k.created_at > now() - interval '60 days'), '[]'::jsonb),
    'collected_30d', coalesce((select sum(amount_minor) from public.ride_commissions where status = 'paid' and paid_at > now() - interval '30 days'), 0));
end $$;
revoke all on function public.admin_ride_money() from public, anon;
grant execute on function public.admin_ride_money() to authenticated;

create or replace function public.admin_ride_commission_set(p_commission uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare c public.ride_commissions%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_status not in ('due', 'paid', 'waived', 'disputed') then raise exception 'Unknown status' using errcode = '22023'; end if;
  update public.ride_commissions set status = p_status, note = nullif(left(btrim(coalesce(p_note, '')), 400), ''),
         paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end
   where id = p_commission returning * into c;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  if p_status in ('paid', 'waived') then
    update public.ride_leak_cases set status = case when p_status = 'waived' then 'dismissed' else 'confirmed' end,
           reviewed_at = now(), reviewed_by = auth.uid() where commission_id = c.id;
  end if;
  perform cabana_private.ride_reinstate_if_clear(c.driver_id);
  return to_jsonb(c);
end $$;
revoke all on function public.admin_ride_commission_set(uuid, text, text) from public, anon;
grant execute on function public.admin_ride_commission_set(uuid, text, text) to authenticated;

-- ── 8 · breadcrumbs are kept for thirty days, then gone ───────────────
create or replace function public.ride_track_prune()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare n integer;
begin
  delete from public.ride_track_points where at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ride_track_prune() from public, anon, authenticated;
select cron.schedule('cabana-ride-track-prune', '23 3 * * *', $$select public.ride_track_prune()$$);
