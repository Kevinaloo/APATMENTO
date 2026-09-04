-- Cabana Move Africa control plane.
-- Public prices are exact admin-published records. No fare is calculated here.

create extension if not exists pgcrypto;

create table if not exists public.ride_modes (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null check (length(trim(label)) between 2 and 80),
  short_label text not null check (length(trim(short_label)) between 2 and 32),
  family text not null check (family in ('Road','Micromobility','Assisted','Water','Trail','Air')),
  description text not null default '',
  request_prompt text not null default '',
  media_focus text not null default '50%',
  active boolean not null default true,
  requestable boolean not null default true,
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ride_markets (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code = any (array[
    'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
    'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
    'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
  ])),
  country_name text not null check (length(trim(country_name)) between 2 and 80),
  city text,
  status text not null default 'onboarding' check (status in ('onboarding','matching','live','paused')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  instant_requests boolean not null default false,
  scheduled_requests boolean not null default true,
  quote_requests boolean not null default true,
  public_notice text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  service_radius_km numeric(7,2) check (service_radius_km is null or service_radius_km > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (city is null or length(trim(city)) between 2 and 100)
);
create unique index if not exists ride_markets_country_city_uidx
  on public.ride_markets (country_code, coalesce(lower(trim(city)), ''));
create index if not exists ride_markets_public_idx
  on public.ride_markets (active, status, country_code);

create table if not exists public.ride_market_modes (
  market_id uuid not null references public.ride_markets(id) on delete cascade,
  mode_key text not null references public.ride_modes(key) on update cascade on delete restrict,
  active boolean not null default true,
  quote_only boolean not null default true,
  operator_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (market_id, mode_key)
);

create table if not exists public.ride_price_cards (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.ride_markets(id) on delete cascade,
  mode_key text not null references public.ride_modes(key) on update cascade on delete restrict,
  label text not null check (length(trim(label)) between 3 and 100),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  unit text not null check (unit in ('trip','hour','day','seat','crossing')),
  route_from text,
  route_to text,
  bidirectional boolean not null default false,
  terms text not null check (length(trim(terms)) between 3 and 500),
  published boolean not null default false,
  active boolean not null default true,
  effective_from timestamptz,
  effective_to timestamptz,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((unit <> 'trip') or
         (route_from is not null and length(trim(route_from)) >= 2 and
          route_to is not null and length(trim(route_to)) >= 2)),
  check ((route_from is null and route_to is null) or
         (route_from is not null and route_to is not null)),
  check (effective_to is null or effective_from is null or effective_to > effective_from)
);
create index if not exists ride_price_cards_public_idx
  on public.ride_price_cards (market_id, mode_key, published, active, sort);

insert into public.ride_modes
  (key,label,short_label,family,description,request_prompt,media_focus,sort)
values
  ('car','Car and taxi','Car','Road','City rides, transfers and point to point travel.','Car or taxi','14%',10),
  ('electric','Electric car','Electric','Road','Electric operators where charging coverage permits.','Electric car','25%',20),
  ('minibus','Shuttle and minibus','Minibus','Road','Group transfers, shared routes and private shuttles.','Shuttle or minibus','38%',30),
  ('tuk_tuk','Tuk-tuk','Tuk-tuk','Road','Compact local transport built for shorter routes.','Tuk-tuk','48%',40),
  ('motorcycle','Motorcycle and boda','Motorbike','Road','Two wheel passenger movement with local operators.','Motorcycle or boda','57%',50),
  ('bicycle','Bicycle','Bicycle','Micromobility','Human powered hire, guided rides and point to point use.','Bicycle','65%',60),
  ('e_bike','E-bike','E-bike','Micromobility','Electric assisted city, coast and trail movement.','E-bike','72%',70),
  ('accessible','Accessible vehicle','Accessible','Assisted','Mobility-aware transport matched to stated access needs.','Accessible transport','78%',80),
  ('boat','Boat and dhow','Boat','Water','Ferries, launches, dhows and private water transfers.','Boat or dhow','84%',90),
  ('horse','Horse and trail','Horse','Trail','Riding, pack support and specialist trail movement.','Horse or trail movement','91%',100),
  ('helicopter','Helicopter and air','Air','Air','Specialist charter and time-critical air transfers.','Air transfer','5%',110),
  ('shuttle','Coach and bus','Coach','Road','High-capacity scheduled or private group movement.','Coach or bus','43%',120)
on conflict (key) do nothing;

insert into public.ride_markets
  (country_code,country_name,city,status,currency,active,instant_requests,scheduled_requests,quote_requests,public_notice)
values
  ('KE','Kenya',null,'matching','KES',true,false,true,true,
   'Kenya is Cabana Move''s first operating focus. Exact availability is confirmed request by request.')
on conflict do nothing;

insert into public.ride_market_modes (market_id,mode_key,active,quote_only)
select market.id, mode.key, true, true
from public.ride_markets market cross join public.ride_modes mode
where market.country_code='KE' and market.city is null
on conflict (market_id,mode_key) do nothing;

alter table public.ride_requests alter column quote_total drop not null;
alter table public.ride_requests add column if not exists country_code text;
alter table public.ride_requests add column if not exists city text;
alter table public.ride_requests add column if not exists mode_key text;
alter table public.ride_requests add column if not exists request_kind text not null default 'on_demand';
alter table public.ride_requests add column if not exists pricing_status text not null default 'awaiting_quote';
alter table public.ride_requests add column if not exists approved_price_card_id uuid references public.ride_price_cards(id) on delete set null;
alter table public.ride_requests add column if not exists approved_quote_minor bigint;
alter table public.ride_requests add column if not exists approved_quote_currency text;
alter table public.ride_requests add column if not exists ride_needs text[] not null default '{}'::text[];
alter table public.ride_requests add column if not exists admin_notes text;
alter table public.ride_requests add column if not exists quoted_at timestamptz;
alter table public.ride_requests add column if not exists quote_confirmed_at timestamptz;

alter table public.ride_requests drop constraint if exists ride_requests_status_check;
alter table public.ride_requests add constraint ride_requests_status_check
  check (status in ('quote_pending','quoted','confirmed','searching','assigned','arriving','in_progress',
                    'completed','cancelled','expired','unfulfilled','scheduled'));
alter table public.ride_requests drop constraint if exists ride_requests_request_kind_check;
alter table public.ride_requests add constraint ride_requests_request_kind_check
  check (request_kind in ('on_demand','scheduled'));
alter table public.ride_requests drop constraint if exists ride_requests_pricing_status_check;
alter table public.ride_requests add constraint ride_requests_pricing_status_check
  check (pricing_status in ('awaiting_quote','published_price','manual_quote','confirmed'));
alter table public.ride_requests drop constraint if exists ride_requests_country_code_check;
alter table public.ride_requests add constraint ride_requests_country_code_check
  check (country_code is null or country_code = any (array[
    'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
    'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
    'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
  ]));
alter table public.ride_requests drop constraint if exists ride_requests_approved_quote_check;
alter table public.ride_requests add constraint ride_requests_approved_quote_check
  check ((approved_quote_minor is null and approved_quote_currency is null) or
         (approved_quote_minor > 0 and approved_quote_currency ~ '^[A-Z]{3}$'));
create index if not exists ride_requests_market_mode_idx
  on public.ride_requests (country_code, mode_key, status, created_at desc);

alter table public.drivers add column if not exists country_code text not null default 'KE';
alter table public.drivers add column if not exists mode_keys text[] not null default array['car']::text[];
alter table public.drivers drop constraint if exists drivers_country_code_check;
alter table public.drivers add constraint drivers_country_code_check check (country_code = any (array[
  'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
  'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
  'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
]));

create or replace function public.cabana_rides_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ride_modes_touch_t on public.ride_modes;
create trigger ride_modes_touch_t before update on public.ride_modes
for each row execute function public.cabana_rides_touch_updated_at();
drop trigger if exists ride_markets_touch_t on public.ride_markets;
create trigger ride_markets_touch_t before update on public.ride_markets
for each row execute function public.cabana_rides_touch_updated_at();
drop trigger if exists ride_market_modes_touch_t on public.ride_market_modes;
create trigger ride_market_modes_touch_t before update on public.ride_market_modes
for each row execute function public.cabana_rides_touch_updated_at();
drop trigger if exists ride_price_cards_touch_t on public.ride_price_cards;
create trigger ride_price_cards_touch_t before update on public.ride_price_cards
for each row execute function public.cabana_rides_touch_updated_at();

create or replace function public.cabana_rides_publish_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare market_currency text;
begin
  select currency into market_currency from public.ride_markets where id=new.market_id;
  if market_currency is null then raise exception 'Movement market does not exist'; end if;
  new.currency := upper(trim(new.currency));
  if new.published then
    if tg_op='INSERT' then
      new.published_at := now();
      new.published_by := auth.uid();
    elsif not old.published or new.amount_minor is distinct from old.amount_minor
        or new.currency is distinct from old.currency or new.unit is distinct from old.unit
        or new.route_from is distinct from old.route_from or new.route_to is distinct from old.route_to
        or new.terms is distinct from old.terms then
      new.published_at := now();
      new.published_by := auth.uid();
    end if;
  else
    new.published_at := null;
    new.published_by := null;
  end if;
  return new;
end $$;
drop trigger if exists ride_price_cards_publish_t on public.ride_price_cards;
create trigger ride_price_cards_publish_t before insert or update on public.ride_price_cards
for each row execute function public.cabana_rides_publish_price();

create or replace function public.cabana_guard_ride_request_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare price public.ride_price_cards;
declare market public.ride_markets;
declare route_matches boolean;
declare sanitized_needs text[];
declare jwt_role text := coalesce(auth.jwt()->>'role', nullif(current_setting('request.jwt.claim.role',true),''));
begin
  if jwt_role in ('anon','authenticated') then
    new.rider_id := auth.uid();
    new.country_code := upper(trim(new.country_code));
    new.mode_key := lower(trim(new.mode_key));
    if new.ref is null or new.ref !~ '^CM[0-9A-F]{12}$' then
      new.ref := 'CM' || upper(encode(gen_random_bytes(6),'hex'));
    end if;
    if new.country_code is null or new.country_code !~ '^[A-Z]{2}$' then
      raise exception 'Choose a valid pickup country';
    end if;
    if new.country_code <> all (array[
      'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
      'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
      'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
    ]) then raise exception 'Pickup country must be in Africa'; end if;
    if length(trim(coalesce(new.pickup_label,''))) < 2 or length(trim(coalesce(new.dropoff_label,''))) < 2 then
      raise exception 'Pickup and destination are required';
    end if;
    if coalesce(new.passengers,0) < 1 or new.passengers > 60 then
      raise exception 'Traveller count must be between 1 and 60';
    end if;
    if new.scheduled_for is not null and new.scheduled_for <= now() then
      raise exception 'Scheduled pickup must be in the future';
    end if;
    if not exists (select 1 from public.ride_modes m where m.key=new.mode_key and m.active and m.requestable) then
      raise exception 'This movement mode is not requestable';
    end if;
    new.class := new.mode_key;
    new.service := 'ride';
    new.status := 'quote_pending';
    new.request_kind := case when new.scheduled_for is null then 'on_demand' else 'scheduled' end;
    new.driver_id := null;
    new.vehicle_id := null;
    new.notified_count := 0;
    new.assigned_at := null;
    new.started_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
    new.cancel_reason := null;
    new.final_fare := null;
    new.driver_payout := null;
    new.distance_km := null;
    new.duration_min := null;
    new.quote_total := null;
    new.quote_breakdown := null;
    new.approved_quote_minor := null;
    new.approved_quote_currency := null;
    new.pricing_status := 'awaiting_quote';
    new.admin_notes := null;
    new.quoted_at := null;
    new.quote_confirmed_at := null;
    select coalesce(array_agg(distinct need),'{}'::text[]) into sanitized_needs
    from unnest(coalesce(new.ride_needs,'{}'::text[])) need
    where need = any (array['luggage','wheelchair','child-seat','pet','bike-carry','quiet']);
    new.ride_needs := sanitized_needs;
    if new.approved_price_card_id is not null then
      select * into price from public.ride_price_cards p
      where p.id=new.approved_price_card_id and p.mode_key=new.mode_key and p.published and p.active
        and (p.effective_from is null or p.effective_from <= now())
        and (p.effective_to is null or p.effective_to > now());
      if not found then raise exception 'The selected published price is not available'; end if;
      select * into market from public.ride_markets where id=price.market_id and active;
      if not found or market.country_code <> new.country_code then
        raise exception 'The selected price does not belong to this market';
      end if;
      if market.city is not null and position(lower(market.city) in lower(new.pickup_label)) = 0 then
        raise exception 'The selected price does not belong to this city';
      end if;
      route_matches := price.unit <> 'trip' or (
        (position(lower(price.route_from) in lower(new.pickup_label)) > 0 and
         position(lower(price.route_to) in lower(new.dropoff_label)) > 0) or
        (price.bidirectional and position(lower(price.route_to) in lower(new.pickup_label)) > 0 and
         position(lower(price.route_from) in lower(new.dropoff_label)) > 0)
      );
      if route_matches is not true then raise exception 'The selected price does not match this route'; end if;
      new.approved_quote_minor := price.amount_minor;
      new.approved_quote_currency := price.currency;
      new.pricing_status := 'published_price';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists cabana_guard_ride_request_insert_t on public.ride_requests;
create trigger cabana_guard_ride_request_insert_t before insert on public.ride_requests
for each row execute function public.cabana_guard_ride_request_insert();

create or replace function public.cabana_guard_ride_request_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_status text := new.status;
declare requested_reason text := new.cancel_reason;
declare jwt_role text := coalesce(auth.jwt()->>'role', nullif(current_setting('request.jwt.claim.role',true),''));
begin
  if jwt_role='authenticated' and not public.is_admin() then
    new := old;
    if requested_status='cancelled' and old.status not in ('completed','cancelled','expired') then
      new.status := 'cancelled';
      new.cancel_reason := nullif(trim(requested_reason),'');
      new.cancelled_at := now();
      new.updated_at := now();
    else
      raise exception 'Riders may only cancel an active request';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists cabana_guard_ride_request_update_t on public.ride_requests;
create trigger cabana_guard_ride_request_update_t before update on public.ride_requests
for each row execute function public.cabana_guard_ride_request_update();

create or replace function public.cab_guard_driver_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare jwt_role text := coalesce(auth.jwt()->>'role', nullif(current_setting('request.jwt.claim.role',true),''));
begin
  if jwt_role in ('anon','authenticated') and not public.is_admin() then
    new.status := 'applied';
    new.classes := array['economy'];
    new.mode_keys := array['car'];
    new.rating := 5.00;
    new.trips_completed := 0;
    new.approved_at := null;
    new.user_id := coalesce(auth.uid(),new.user_id);
  end if;
  return new;
end $$;

create or replace function public.cab_guard_driver_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare jwt_role text := coalesce(auth.jwt()->>'role', nullif(current_setting('request.jwt.claim.role',true),''));
begin
  if jwt_role in ('anon','authenticated') and not public.is_admin() then
    new.status := old.status;
    new.classes := old.classes;
    new.mode_keys := old.mode_keys;
    new.country_code := old.country_code;
    new.rating := old.rating;
    new.trips_completed := old.trips_completed;
    new.approved_at := old.approved_at;
    new.user_id := old.user_id;
  end if;
  new.updated_at := now();
  return new;
end $$;

update public.ride_tariffs set active=false where active;
update public.ride_fixed_routes set active=false where active;

alter table public.ride_modes enable row level security;
alter table public.ride_markets enable row level security;
alter table public.ride_market_modes enable row level security;
alter table public.ride_price_cards enable row level security;

drop policy if exists ride_modes_public_read on public.ride_modes;
create policy ride_modes_public_read on public.ride_modes for select to anon,authenticated using (active);
drop policy if exists ride_modes_admin_all on public.ride_modes;
create policy ride_modes_admin_all on public.ride_modes for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists ride_markets_public_read on public.ride_markets;
create policy ride_markets_public_read on public.ride_markets for select to anon,authenticated using (active);
drop policy if exists ride_markets_admin_all on public.ride_markets;
create policy ride_markets_admin_all on public.ride_markets for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists ride_market_modes_public_read on public.ride_market_modes;
create policy ride_market_modes_public_read on public.ride_market_modes for select to anon,authenticated using (active);
drop policy if exists ride_market_modes_admin_all on public.ride_market_modes;
create policy ride_market_modes_admin_all on public.ride_market_modes for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists ride_price_cards_public_read on public.ride_price_cards;
create policy ride_price_cards_public_read on public.ride_price_cards for select to anon,authenticated
using (published and active and (effective_from is null or effective_from <= now()) and (effective_to is null or effective_to > now()));
drop policy if exists ride_price_cards_admin_all on public.ride_price_cards;
create policy ride_price_cards_admin_all on public.ride_price_cards for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists requests_admin_all on public.ride_requests;
create policy requests_admin_all on public.ride_requests for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists drivers_admin_all on public.drivers;
create policy drivers_admin_all on public.drivers for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists driver_vehicles_admin_all on public.driver_vehicles;
create policy driver_vehicles_admin_all on public.driver_vehicles for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists driver_documents_admin_all on public.driver_documents;
create policy driver_documents_admin_all on public.driver_documents for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.ride_modes,public.ride_markets,public.ride_market_modes,public.ride_price_cards from anon,authenticated;
grant select on public.ride_modes,public.ride_markets,public.ride_market_modes,public.ride_price_cards to anon;
grant select,insert,update,delete on public.ride_modes,public.ride_markets,public.ride_market_modes,public.ride_price_cards to authenticated;
grant all on public.ride_modes,public.ride_markets,public.ride_market_modes,public.ride_price_cards to service_role;

revoke delete,truncate,references,trigger on public.ride_requests from anon,authenticated;
revoke update on public.ride_requests from anon;
grant select,insert on public.ride_requests to anon;
grant select,insert,update on public.ride_requests to authenticated;

revoke all on function public.cabana_rides_touch_updated_at() from public,anon,authenticated;
revoke all on function public.cabana_rides_publish_price() from public,anon,authenticated;
revoke all on function public.cabana_guard_ride_request_insert() from public,anon,authenticated;
revoke all on function public.cabana_guard_ride_request_update() from public,anon,authenticated;
revoke all on function public.cab_guard_driver_insert() from public,anon,authenticated;
revoke all on function public.cab_guard_driver_update() from public,anon,authenticated;

comment on table public.ride_price_cards is 'Exact prices approved for public display. No estimated or calculated fare belongs in this table.';
comment on column public.ride_price_cards.amount_minor is 'Exact approved amount in the currency smallest unit, interpreted using that currency exponent.';
comment on column public.ride_requests.approved_quote_minor is 'Exact published or manually approved amount. Null means no price has been approved.';
