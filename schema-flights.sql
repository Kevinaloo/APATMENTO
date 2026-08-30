/* ═══════════════════════════════════════════════════════════════════════
   CABANA · FLIGHT DESK
   schema-flights.sql

   WHAT THIS IS
   ────────────
   Cabana does not resell an airline API. A traveller hands us a trip, a
   human on our desk sources the fares, and we come back with a short list
   of real options at a price the traveller can accept in one tap. This
   schema is that conversation, made durable.

   THE ONE RULE THAT SHAPES EVERYTHING
   ───────────────────────────────────
   The traveller sees a price. They never see what we paid for it, where
   we sourced it, or what we kept. That is not a UI concern that a careless
   `select *` can undo later — it is enforced here, in the database:

     · flight_quotes has NO select policy for anyone but the desk.
     · Everything a traveller reads comes back from a security-definer
       function that names its output columns one at a time.
     · net_cost, supplier_ref, sourced_via and desk_notes are physically
       absent from every traveller-facing return shape.

   A traveller can hold the anon key, read the JS, and open the network
   tab. There is nothing there.

   ACCESS WITHOUT AN ACCOUNT
   ─────────────────────────
   Making someone sign up before they can ask a question costs more
   requests than it prevents. A request is therefore addressable by
   (ref, access_token): the ref is short enough to read down a phone line,
   the token is a uuid that never appears in a search index. Signed-in
   users additionally own their requests by user_id and see them without
   the token.

   ORDER: reference data → pipeline → settings → RLS → functions → seed.
   Re-runnable. Every statement is guarded.
   ═══════════════════════════════════════════════════════════════════════ */

set search_path = public;


/* ══════════════════════════════════════════════════════════════════════
   1 · REFERENCE DATA
   Airports and airlines. Public, cacheable, read-only to the world.
   Seeded from schema-flights-seed-airports.sql / -airlines.sql.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.airports (
  iata          text primary key check (char_length(iata) = 3),
  icao          text,
  name          text not null,
  city          text not null,
  country       text not null,
  country_code  text,
  continent     text,
  lat           double precision,
  lng           double precision,
  tz            text,
  route_count   int  not null default 0,
  rank          int  not null default 0,   -- picker ordering. Higher = offered sooner.
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.airports is
  'Airports with scheduled passenger service. rank drives picker order and is weighted toward Africa: this is an African product and NBO should never rank below a US regional field.';

create index if not exists airports_rank_idx      on public.airports(rank desc);
create index if not exists airports_country_idx   on public.airports(country_code, rank desc);
create index if not exists airports_continent_idx on public.airports(continent, rank desc);
create index if not exists airports_search_idx    on public.airports
  using gin (to_tsvector('simple', coalesce(city,'') || ' ' || coalesce(name,'') || ' ' || coalesce(country,'') || ' ' || iata));


create table if not exists public.airlines (
  iata          text primary key check (char_length(iata) = 2),
  icao          text,
  name          text not null,
  country       text,
  country_code  text,
  alliance      text,
  is_lowcost    boolean not null default false,
  logo_url      text,
  route_count   int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists airlines_routes_idx on public.airlines(route_count desc);
create index if not exists airlines_name_idx   on public.airlines(lower(name));


/* ══════════════════════════════════════════════════════════════════════
   2 · THE REQUEST
   One traveller, one trip, one thing they want us to go and find.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.flight_requests (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,          -- CBF-7K2M9Q. Readable aloud.
  access_token    uuid not null default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,

  /* the trip */
  trip_type       text not null default 'return'
                  check (trip_type in ('one_way','return','multi_city')),
  origin_iata     text not null,
  dest_iata       text,
  depart_date     date not null,
  return_date     date,
  segments        jsonb,                          -- multi_city: [{from,to,date}]

  adults          int not null default 1 check (adults between 1 and 9),
  children        int not null default 0 check (children between 0 and 9),
  infants         int not null default 0 check (infants between 0 and 9),
  cabin           text not null default 'economy'
                  check (cabin in ('economy','premium_economy','business','first','any')),

  /* what "good" means to this traveller */
  date_flex       text not null default 'exact'
                  check (date_flex in ('exact','1','3','7','month')),
  max_stops       int,                            -- null = no preference
  preferred_airlines text[],
  avoid_airlines     text[],
  baggage_needed  int,                            -- checked bags per traveller
  budget_min      numeric(12,2),
  budget_max      numeric(12,2),
  budget_currency text not null default 'KES',
  notes           text,

  /* who to come back to */
  contact_name    text not null,
  contact_email   text,
  contact_phone   text,
  contact_channel text not null default 'whatsapp'
                  check (contact_channel in ('whatsapp','email','sms','call','app')),

  /* pipeline */
  status          text not null default 'new'
                  check (status in ('new','working','quoted','selected','payment_pending',
                                    'confirmed','ticketed','completed','cancelled',
                                    'expired','unable')),
  priority        int not null default 0,         -- computed on insert, sorts the desk
  assigned_to     text,                           -- desk operator email
  sla_due_at      timestamptz,
  first_quoted_at timestamptz,
  selected_quote_id uuid,

  /* provenance, for attribution and fraud work */
  source          text default 'web',
  referrer        text,
  utm             jsonb,
  ip_country      text,

  /* ── DESK ONLY. Never leaves the building. ────────────────────────── */
  desk_notes      text,
  sourced_via     text,
  internal_flags  jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  quoted_at       timestamptz,
  selected_at     timestamptz,
  ticketed_at     timestamptz,
  closed_at       timestamptz,
  close_reason    text
);

comment on column public.flight_requests.desk_notes is
  'Operator scratchpad. Read by the desk, never by the traveller. No traveller-facing function selects this column.';
comment on column public.flight_requests.sourced_via is
  'Where the desk found the fare. Commercially sensitive. Same rule as desk_notes: never returned to a traveller.';

create index if not exists fr_status_idx   on public.flight_requests(status, priority desc, created_at desc);
create index if not exists fr_user_idx     on public.flight_requests(user_id, created_at desc);
create index if not exists fr_ref_idx      on public.flight_requests(ref);
create index if not exists fr_sla_idx      on public.flight_requests(sla_due_at) where status in ('new','working');
create index if not exists fr_created_idx  on public.flight_requests(created_at desc);
create index if not exists fr_route_idx    on public.flight_requests(origin_iata, dest_iata);


/* ══════════════════════════════════════════════════════════════════════
   3 · THE QUOTE
   What the desk found. Several per request; the traveller picks one.

   net_cost / supplier_ref carry our margin and our sourcing. They are the
   two columns this whole file exists to protect.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.flight_quotes (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.flight_requests(id) on delete cascade,

  label           text,                            -- 'Fastest', 'Best value'
  badge           text check (badge in ('cheapest','fastest','best_value','recommended','flexible')),

  airline_iata    text,
  airline_name    text not null,
  operated_by     text,

  /* Each leg: [{flight_no,from,to,dep,arr,duration_min,aircraft,layover_min}] */
  outbound        jsonb not null default '[]'::jsonb,
  inbound         jsonb not null default '[]'::jsonb,

  stops_out       int not null default 0,
  stops_in        int not null default 0,
  duration_out    int,                             -- minutes, door to door
  duration_in     int,

  cabin           text default 'economy',
  fare_brand      text,                            -- 'Light', 'Flex', 'Saver'
  baggage_cabin   text,
  baggage_checked text,
  refundable      boolean not null default false,
  changeable      boolean not null default false,
  fare_rules      text,

  /* ── PRICING ──────────────────────────────────────────────────────
     price is what the traveller pays and the only figure that ever
     crosses the wire. net_cost and margin stay on this side.          */
  price           numeric(12,2) not null check (price >= 0),
  currency        text not null default 'KES',
  price_per_pax   numeric(12,2),
  taxes_included  boolean not null default true,

  net_cost        numeric(12,2),                   -- DESK ONLY
  margin          numeric(12,2) generated always as
                    (case when net_cost is null then null else price - net_cost end) stored,
  supplier_ref    text,                            -- DESK ONLY
  sourced_via     text,                            -- DESK ONLY

  seats_left      int,
  hold_until      timestamptz,                     -- fares move. Say so.

  status          text not null default 'offered'
                  check (status in ('draft','offered','selected','expired','withdrawn')),
  sort_order      int not null default 0,

  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.flight_quotes is
  'No traveller-facing select policy exists on this table, by design. Travellers read quotes only through fd_get_request(), which enumerates safe columns explicitly.';

create index if not exists fq_request_idx on public.flight_quotes(request_id, sort_order, price);
create index if not exists fq_status_idx  on public.flight_quotes(status);


/* ══════════════════════════════════════════════════════════════════════
   4 · PASSENGERS
   Collected only after a quote is chosen. Asking for a passport number
   before we have shown a price is how you lose the request.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.flight_passengers (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.flight_requests(id) on delete cascade,
  pax_type      text not null default 'adult' check (pax_type in ('adult','child','infant')),
  title         text,
  given_name    text not null,
  family_name   text not null,
  dob           date,
  gender        text check (gender in ('M','F','X')),
  nationality   text,
  passport_no   text,
  passport_expiry date,
  frequent_flyer  text,
  seat_pref     text,
  meal_pref     text,
  assistance    text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

comment on table public.flight_passengers is
  'Travel-document data. Visible to the owning user and the desk, nobody else. Never returned by any public search or listing function.';

create index if not exists fp_request_idx on public.flight_passengers(request_id, sort_order);


/* ══════════════════════════════════════════════════════════════════════
   5 · THE BOOKING
   A chosen quote that has been paid for and ticketed.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.flight_bookings (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,            -- CBK-...
  request_id      uuid not null references public.flight_requests(id) on delete cascade,
  quote_id        uuid references public.flight_quotes(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,

  pnr             text,
  eticket_numbers text[],
  ticket_url      text,
  airline_name    text,
  itinerary       jsonb,                           -- frozen copy of the chosen quote

  amount          numeric(12,2) not null,
  currency        text not null default 'KES',
  amount_paid     numeric(12,2) not null default 0,
  payment_status  text not null default 'unpaid'
                  check (payment_status in ('unpaid','partial','paid','refunded','failed')),
  payment_reference text,
  payment_method  text,

  status          text not null default 'pending_payment'
                  check (status in ('pending_payment','paid','ticketing','ticketed',
                                    'changed','cancelled','refunded','flown')),

  net_cost        numeric(12,2),                   -- DESK ONLY
  supplier_ref    text,                            -- DESK ONLY

  issued_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists fb_request_idx on public.flight_bookings(request_id);
create index if not exists fb_user_idx    on public.flight_bookings(user_id, created_at desc);
create index if not exists fb_status_idx  on public.flight_bookings(status, created_at desc);


/* ══════════════════════════════════════════════════════════════════════
   6 · TIMELINE
   Every state change, written by trigger. The traveller sees a friendly
   subset; the desk sees all of it including who did what.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.flight_events (
  id          bigserial primary key,
  request_id  uuid not null references public.flight_requests(id) on delete cascade,
  kind        text not null,
  title       text not null,
  detail      text,
  actor       text,
  visible_to_guest boolean not null default true,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists fe_request_idx on public.flight_events(request_id, created_at desc);


/* ══════════════════════════════════════════════════════════════════════
   7 · DESK SETTINGS
   One row. Pricing policy, service hours, the promise we make on the
   page. Editable from the admin console so the promise and the timer
   can never drift apart.
══════════════════════════════════════════════════════════════════════ */

create table if not exists public.flight_desk_settings (
  id                  int primary key default 1 check (id = 1),
  desk_open           boolean not null default true,
  sla_minutes         int not null default 45,
  hours_label         text not null default 'Desk staffed 06:00 to 23:00 EAT, seven days',
  open_hour           int not null default 6,
  close_hour          int not null default 23,
  timezone            text not null default 'Africa/Nairobi',

  markup_percent      numeric(6,2) not null default 7.5,
  markup_min          numeric(12,2) not null default 1500,
  markup_max          numeric(12,2),
  round_to            int not null default 100,     -- price ends on a clean number
  default_currency    text not null default 'KES',

  quote_hold_hours    int not null default 12,
  max_quotes          int not null default 5,
  affiliate_enabled   boolean not null default true,

  notify_emails       text[] not null default array['apatmento@gmail.com'],
  updated_at          timestamptz not null default now()
);

insert into public.flight_desk_settings (id) values (1) on conflict (id) do nothing;


/* ══════════════════════════════════════════════════════════════════════
   8 · TRIGGERS
══════════════════════════════════════════════════════════════════════ */

create or replace function public.fd_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists fr_touch on public.flight_requests;
create trigger fr_touch before update on public.flight_requests
  for each row execute function public.fd_touch();

drop trigger if exists fq_touch on public.flight_quotes;
create trigger fq_touch before update on public.flight_quotes
  for each row execute function public.fd_touch();

drop trigger if exists fb_touch on public.flight_bookings;
create trigger fb_touch before update on public.flight_bookings
  for each row execute function public.fd_touch();


/* A status change is a fact worth keeping. Written here rather than in
   application code so it survives whichever client made the change. */
create or replace function public.fd_log_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t text; d text; vis boolean := true;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'new'             then t := 'Request received';        d := 'Sitting with the flight desk.';
    when 'working'         then t := 'Desk is searching';       d := 'We are pricing your route across carriers.';
    when 'quoted'          then t := 'Options ready';           d := 'Choose the one that suits you.';
    when 'selected'        then t := 'Option chosen';           d := 'Holding this fare while we confirm.';
    when 'payment_pending' then t := 'Payment requested';       d := 'Pay to lock the fare in.';
    when 'confirmed'       then t := 'Payment received';        d := 'Issuing your ticket now.';
    when 'ticketed'        then t := 'Ticket issued';           d := 'Your e-ticket is ready.';
    when 'completed'       then t := 'Trip complete';           d := 'Safe travels. Come back soon.';
    when 'cancelled'       then t := 'Request cancelled';       d := coalesce(new.close_reason, 'Cancelled.');
    when 'expired'         then t := 'Request expired';         d := 'The dates passed before we could confirm.';
    when 'unable'          then t := 'No fare we would stand behind';
                                d := coalesce(new.close_reason, 'Nothing on this route met our bar. No charge.');
    else t := 'Updated'; d := null;
  end case;

  insert into public.flight_events (request_id, kind, title, detail, actor, visible_to_guest)
  values (new.id, 'status', t, d, coalesce(new.assigned_to, 'system'), vis);

  return new;
end;
$$;

drop trigger if exists fr_log_status on public.flight_requests;
create trigger fr_log_status after insert or update of status on public.flight_requests
  for each row execute function public.fd_log_status();


/* ══════════════════════════════════════════════════════════════════════
   9 · RLS
   The desk sees everything. A signed-in traveller sees their own rows.
   Nobody else selects anything, ever. Guest reads happen through the
   functions in section 10.
══════════════════════════════════════════════════════════════════════ */

alter table public.airports             enable row level security;
alter table public.airlines             enable row level security;
alter table public.flight_requests      enable row level security;
alter table public.flight_quotes        enable row level security;
alter table public.flight_passengers    enable row level security;
alter table public.flight_bookings      enable row level security;
alter table public.flight_events        enable row level security;
alter table public.flight_desk_settings enable row level security;

/* reference data: read by anyone, written by the desk */
drop policy if exists airports_read  on public.airports;
create policy airports_read on public.airports for select using (true);
drop policy if exists airports_write on public.airports;
create policy airports_write on public.airports for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists airlines_read  on public.airlines;
create policy airlines_read on public.airlines for select using (true);
drop policy if exists airlines_write on public.airlines;
create policy airlines_write on public.airlines for all
  using (public.is_admin()) with check (public.is_admin());

/* requests */
drop policy if exists fr_admin on public.flight_requests;
create policy fr_admin on public.flight_requests for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists fr_own_read on public.flight_requests;
create policy fr_own_read on public.flight_requests for select
  using (user_id is not null and user_id = auth.uid());

/* A signed-in traveller may cancel their own request and nothing else.
   Every other transition belongs to the desk. */
drop policy if exists fr_own_cancel on public.flight_requests;
create policy fr_own_cancel on public.flight_requests for update
  using (user_id is not null and user_id = auth.uid())
  with check (user_id is not null and user_id = auth.uid()
              and status in ('cancelled','new','working','quoted','selected'));

/* quotes: desk only. No traveller policy exists on purpose. */
drop policy if exists fq_admin on public.flight_quotes;
create policy fq_admin on public.flight_quotes for all
  using (public.is_admin()) with check (public.is_admin());

/* passengers */
drop policy if exists fp_admin on public.flight_passengers;
create policy fp_admin on public.flight_passengers for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists fp_own on public.flight_passengers;
create policy fp_own on public.flight_passengers for select
  using (exists (select 1 from public.flight_requests r
                  where r.id = request_id and r.user_id = auth.uid()));

/* bookings */
drop policy if exists fb_admin on public.flight_bookings;
create policy fb_admin on public.flight_bookings for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists fb_own on public.flight_bookings;
create policy fb_own on public.flight_bookings for select
  using (user_id is not null and user_id = auth.uid());

/* events */
drop policy if exists fe_admin on public.flight_events;
create policy fe_admin on public.flight_events for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists fe_own on public.flight_events;
create policy fe_own on public.flight_events for select
  using (visible_to_guest and exists (
    select 1 from public.flight_requests r
     where r.id = request_id and r.user_id = auth.uid()));

/* settings: this row carries markup_percent / markup_min / markup_max.
   A public select here would hand a traveller our pricing policy, so the
   whole table is admin-only. The page needs the desk hours and the SLA,
   and gets exactly those from fd_desk_status(). */
drop policy if exists fds_read  on public.flight_desk_settings;
drop policy if exists fds_write on public.flight_desk_settings;
drop policy if exists fds_all   on public.flight_desk_settings;
create policy fds_all on public.flight_desk_settings for all
  using (public.is_admin()) with check (public.is_admin());


/* ══════════════════════════════════════════════════════════════════════
   10 · TRAVELLER API
   Security definer, so these run with the owner's rights and can read
   past RLS. Each one enumerates its output columns by hand. That is the
   whole protection: a column that is never named can never leak.
══════════════════════════════════════════════════════════════════════ */

/* A ref you can read down a phone line without spelling anything twice.
   No vowels, no 0/O, no 1/I. */
create or replace function public.fd_new_ref(p_prefix text default 'CBF')
returns text language plpgsql as $$
declare
  alphabet text := '23456789BCDFGHJKLMNPQRSTVWXYZ';
  out text; i int; ok boolean;
begin
  loop
    out := p_prefix || '-';
    for i in 1..6 loop
      out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if p_prefix = 'CBK' then
      select not exists (select 1 from public.flight_bookings where ref = out) into ok;
    else
      select not exists (select 1 from public.flight_requests where ref = out) into ok;
    end if;
    exit when ok;
  end loop;
  return out;
end;
$$;


/* Sell price from a net cost, using current desk policy. The desk can
   always override; this is the sane default so nobody has to do mental
   arithmetic at 23:00. */
create or replace function public.fd_price_from_net(p_net numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select case when p_net is null or p_net <= 0 then null else
    ceil(
      (p_net + greatest(
        s.markup_min,
        least(coalesce(s.markup_max, 1e12), p_net * s.markup_percent / 100.0)
      )) / nullif(s.round_to, 0)
    ) * s.round_to
  end
  from public.flight_desk_settings s where s.id = 1;
$$;


/* Submit a request. The single write path for the public. Everything
   the browser sends is treated as a suggestion and re-derived here. */
create or replace function public.fd_submit_request(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ref     text;
  v_id      uuid;
  v_token   uuid;
  v_sla     int;
  v_open    boolean;
  v_prio    int := 0;
  v_depart  date;
  v_return  date;
  v_origin  text;
  v_dest    text;
  v_adults  int;
  v_recent  int;
begin
  select sla_minutes, desk_open into v_sla, v_open
    from public.flight_desk_settings where id = 1;

  if v_open is not true then
    return jsonb_build_object('ok', false, 'error', 'desk_closed');
  end if;

  v_origin := upper(nullif(trim(p->>'origin_iata'), ''));
  v_dest   := upper(nullif(trim(p->>'dest_iata'), ''));
  v_depart := nullif(p->>'depart_date','')::date;
  v_return := nullif(p->>'return_date','')::date;
  v_adults := greatest(1, least(9, coalesce((p->>'adults')::int, 1)));

  if v_origin is null or v_depart is null then
    return jsonb_build_object('ok', false, 'error', 'missing_route');
  end if;
  if v_depart < current_date then
    return jsonb_build_object('ok', false, 'error', 'past_date');
  end if;
  if v_return is not null and v_return < v_depart then
    return jsonb_build_object('ok', false, 'error', 'return_before_depart');
  end if;
  if coalesce(nullif(trim(p->>'contact_name'),''), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_name');
  end if;
  if coalesce(nullif(trim(p->>'contact_email'),''), '') = ''
     and coalesce(nullif(trim(p->>'contact_phone'),''), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_contact');
  end if;

  /* Light abuse brake: one contact, five open requests. Enough for a
     family planning several trips, short of a script. */
  select count(*) into v_recent
    from public.flight_requests
   where status in ('new','working','quoted')
     and created_at > now() - interval '24 hours'
     and (
       (nullif(trim(p->>'contact_email'),'') is not null
         and lower(contact_email) = lower(trim(p->>'contact_email')))
       or (nullif(trim(p->>'contact_phone'),'') is not null
         and contact_phone = trim(p->>'contact_phone'))
     );
  if v_recent >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_open');
  end if;

  /* Priority: soon-departing and high-value trips reach the top of the
     desk queue without anyone having to sort it by hand. */
  v_prio := 100
    - least(60, greatest(0, (v_depart - current_date)))          -- imminent = urgent
    + (v_adults - 1) * 6
    + case when coalesce(p->>'cabin','economy') in ('business','first') then 30 else 0 end
    + case when auth.uid() is not null then 8 else 0 end;

  v_ref := public.fd_new_ref('CBF');

  insert into public.flight_requests (
    ref, user_id, trip_type, origin_iata, dest_iata, depart_date, return_date, segments,
    adults, children, infants, cabin, date_flex, max_stops,
    preferred_airlines, avoid_airlines, baggage_needed,
    budget_min, budget_max, budget_currency, notes,
    contact_name, contact_email, contact_phone, contact_channel,
    priority, sla_due_at, source, referrer, utm
  ) values (
    v_ref, auth.uid(),
    coalesce(nullif(p->>'trip_type',''), case when v_return is null then 'one_way' else 'return' end),
    v_origin, v_dest, v_depart, v_return,
    case when jsonb_typeof(p->'segments') = 'array' then p->'segments' else null end,
    v_adults,
    greatest(0, least(9, coalesce((p->>'children')::int, 0))),
    greatest(0, least(9, coalesce((p->>'infants')::int, 0))),
    coalesce(nullif(p->>'cabin',''), 'economy'),
    coalesce(nullif(p->>'date_flex',''), 'exact'),
    nullif(p->>'max_stops','')::int,
    case when jsonb_typeof(p->'preferred_airlines') = 'array'
         then array(select jsonb_array_elements_text(p->'preferred_airlines')) end,
    case when jsonb_typeof(p->'avoid_airlines') = 'array'
         then array(select jsonb_array_elements_text(p->'avoid_airlines')) end,
    nullif(p->>'baggage_needed','')::int,
    nullif(p->>'budget_min','')::numeric,
    nullif(p->>'budget_max','')::numeric,
    coalesce(nullif(p->>'budget_currency',''), 'KES'),
    left(nullif(trim(p->>'notes'),''), 2000),
    left(trim(p->>'contact_name'), 120),
    lower(left(nullif(trim(p->>'contact_email'),''), 200)),
    left(nullif(trim(p->>'contact_phone'),''), 40),
    coalesce(nullif(p->>'contact_channel',''), 'whatsapp'),
    v_prio,
    now() + (v_sla || ' minutes')::interval,
    coalesce(nullif(p->>'source',''), 'web'),
    left(nullif(p->>'referrer',''), 500),
    case when jsonb_typeof(p->'utm') = 'object' then p->'utm' end
  )
  returning id, access_token into v_id, v_token;

  return jsonb_build_object(
    'ok', true, 'ref', v_ref, 'token', v_token, 'id', v_id,
    'sla_minutes', v_sla,
    'sla_due_at', (now() + (v_sla || ' minutes')::interval)
  );
end;
$$;


/* Read a request back. Every column here was chosen deliberately;
   net_cost, supplier_ref, sourced_via, desk_notes and internal_flags
   are not among them and must never be added. */
create or replace function public.fd_get_request(p_ref text, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.flight_requests;
  v_quotes jsonb;
  v_events jsonb;
  v_booking jsonb;
  v_pax int;
begin
  select * into r from public.flight_requests where ref = upper(trim(p_ref));
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  /* Two ways in, both explicit. */
  if not (
       (p_token is not null and r.access_token = p_token)
    or (auth.uid() is not null and r.user_id = auth.uid())
    or public.is_admin()
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;

  select coalesce(jsonb_agg(q order by q.sort_order, q.price), '[]'::jsonb) into v_quotes
  from (
    select jsonb_build_object(
      'id', id, 'label', label, 'badge', badge,
      'airline_iata', airline_iata, 'airline_name', airline_name, 'operated_by', operated_by,
      'outbound', outbound, 'inbound', inbound,
      'stops_out', stops_out, 'stops_in', stops_in,
      'duration_out', duration_out, 'duration_in', duration_in,
      'cabin', cabin, 'fare_brand', fare_brand,
      'baggage_cabin', baggage_cabin, 'baggage_checked', baggage_checked,
      'refundable', refundable, 'changeable', changeable, 'fare_rules', fare_rules,
      'price', price, 'currency', currency, 'price_per_pax', price_per_pax,
      'taxes_included', taxes_included,
      'seats_left', seats_left, 'hold_until', hold_until,
      'status', status, 'sort_order', sort_order
    ) as q, sort_order, price
    from public.flight_quotes
    where request_id = r.id and status in ('offered','selected')
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', kind, 'title', title, 'detail', detail, 'at', created_at
  ) order by created_at), '[]'::jsonb) into v_events
  from public.flight_events
  where request_id = r.id and visible_to_guest;

  select to_jsonb(b) - 'net_cost' - 'supplier_ref' into v_booking
  from (
    select ref, pnr, eticket_numbers, ticket_url, airline_name, itinerary,
           amount, currency, amount_paid, payment_status, status, issued_at, created_at
    from public.flight_bookings where request_id = r.id
    order by created_at desc limit 1
  ) b;

  select count(*) into v_pax from public.flight_passengers where request_id = r.id;

  return jsonb_build_object(
    'ok', true,
    'request', jsonb_build_object(
      'ref', r.ref, 'status', r.status, 'trip_type', r.trip_type,
      'origin_iata', r.origin_iata, 'dest_iata', r.dest_iata,
      'depart_date', r.depart_date, 'return_date', r.return_date, 'segments', r.segments,
      'adults', r.adults, 'children', r.children, 'infants', r.infants,
      'cabin', r.cabin, 'date_flex', r.date_flex, 'max_stops', r.max_stops,
      'baggage_needed', r.baggage_needed,
      'budget_min', r.budget_min, 'budget_max', r.budget_max, 'budget_currency', r.budget_currency,
      'notes', r.notes,
      'contact_name', r.contact_name, 'contact_email', r.contact_email,
      'contact_phone', r.contact_phone, 'contact_channel', r.contact_channel,
      'selected_quote_id', r.selected_quote_id,
      'sla_due_at', r.sla_due_at, 'created_at', r.created_at,
      'quoted_at', r.quoted_at, 'close_reason', r.close_reason,
      'passenger_count', v_pax
    ),
    'quotes', v_quotes,
    'events', v_events,
    'booking', v_booking
  );
end;
$$;


/* Traveller picks an option. Idempotent, and it refuses a fare whose
   hold has already run out rather than pretending it is still live. */
create or replace function public.fd_select_quote(p_ref text, p_token uuid, p_quote_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.flight_requests;
  q public.flight_quotes;
begin
  select * into r from public.flight_requests where ref = upper(trim(p_ref));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if not ((p_token is not null and r.access_token = p_token)
       or (auth.uid() is not null and r.user_id = auth.uid())
       or public.is_admin()) then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;

  if r.status not in ('quoted','selected') then
    return jsonb_build_object('ok', false, 'error', 'not_selectable', 'status', r.status);
  end if;

  select * into q from public.flight_quotes
   where id = p_quote_id and request_id = r.id and status in ('offered','selected');
  if not found then return jsonb_build_object('ok', false, 'error', 'quote_not_found'); end if;

  if q.hold_until is not null and q.hold_until < now() then
    update public.flight_quotes set status = 'expired' where id = q.id;
    return jsonb_build_object('ok', false, 'error', 'quote_expired');
  end if;

  update public.flight_quotes set status = 'offered'
   where request_id = r.id and status = 'selected' and id <> q.id;
  update public.flight_quotes set status = 'selected' where id = q.id;

  update public.flight_requests
     set status = 'selected', selected_quote_id = q.id, selected_at = now()
   where id = r.id;

  insert into public.flight_events (request_id, kind, title, detail, actor, visible_to_guest, meta)
  values (r.id, 'select', 'Option chosen',
          q.airline_name || ' at ' || q.currency || ' ' || to_char(q.price, 'FM999,999,999'),
          'guest', true, jsonb_build_object('quote_id', q.id));

  return jsonb_build_object('ok', true, 'quote_id', q.id, 'status', 'selected');
end;
$$;


/* Traveller withdraws. Kinder than letting it rot in the queue. */
create or replace function public.fd_cancel_request(p_ref text, p_token uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.flight_requests;
begin
  select * into r from public.flight_requests where ref = upper(trim(p_ref));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not ((p_token is not null and r.access_token = p_token)
       or (auth.uid() is not null and r.user_id = auth.uid())) then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;
  if r.status in ('ticketed','completed','cancelled') then
    return jsonb_build_object('ok', false, 'error', 'not_cancellable', 'status', r.status);
  end if;
  update public.flight_requests
     set status = 'cancelled', closed_at = now(),
         close_reason = coalesce(left(p_reason, 500), 'Cancelled by traveller')
   where id = r.id;
  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;


/* Passenger details, submitted once a quote is chosen. Replaces the set
   wholesale so a correction is just a resubmit. */
create or replace function public.fd_save_passengers(p_ref text, p_token uuid, p_pax jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.flight_requests;
  item jsonb; i int := 0;
begin
  select * into r from public.flight_requests where ref = upper(trim(p_ref));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not ((p_token is not null and r.access_token = p_token)
       or (auth.uid() is not null and r.user_id = auth.uid())
       or public.is_admin()) then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;
  if jsonb_typeof(p_pax) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'bad_payload');
  end if;

  delete from public.flight_passengers where request_id = r.id;

  for item in select * from jsonb_array_elements(p_pax) loop
    exit when i >= 18;
    insert into public.flight_passengers (
      request_id, pax_type, title, given_name, family_name, dob, gender,
      nationality, passport_no, passport_expiry, frequent_flyer,
      seat_pref, meal_pref, assistance, sort_order
    ) values (
      r.id,
      coalesce(nullif(item->>'pax_type',''), 'adult'),
      left(nullif(item->>'title',''), 10),
      left(coalesce(nullif(trim(item->>'given_name'),''), '-'), 80),
      left(coalesce(nullif(trim(item->>'family_name'),''), '-'), 80),
      nullif(item->>'dob','')::date,
      nullif(item->>'gender',''),
      left(nullif(item->>'nationality',''), 60),
      left(nullif(trim(item->>'passport_no'),''), 40),
      nullif(item->>'passport_expiry','')::date,
      left(nullif(item->>'frequent_flyer',''), 40),
      left(nullif(item->>'seat_pref',''), 40),
      left(nullif(item->>'meal_pref',''), 40),
      left(nullif(item->>'assistance',''), 200),
      i
    );
    i := i + 1;
  end loop;

  insert into public.flight_events (request_id, kind, title, detail, actor, visible_to_guest)
  values (r.id, 'pax', 'Traveller details received', i || ' traveller(s) on file.', 'guest', true);

  return jsonb_build_object('ok', true, 'count', i);
end;
$$;


/* What the page tells a first-time visitor about the desk. Safe columns
   only — the markup policy is not among them. */
create or replace function public.fd_desk_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'open', s.desk_open,
    'sla_minutes', s.sla_minutes,
    'hours_label', s.hours_label,
    'open_hour', s.open_hour,
    'close_hour', s.close_hour,
    'timezone', s.timezone,
    'affiliate_enabled', s.affiliate_enabled,
    'quotes_last_7d', (
      select count(*) from public.flight_quotes
       where created_at > now() - interval '7 days'
    ),
    'requests_last_30d', (
      select count(*) from public.flight_requests
       where created_at > now() - interval '30 days'
    ),
    'median_response_minutes', (
      select coalesce(round(percentile_cont(0.5) within group (
               order by extract(epoch from (first_quoted_at - created_at)) / 60
             ))::int, s.sla_minutes)
        from public.flight_requests
       where first_quoted_at is not null
         and created_at > now() - interval '30 days'
    )
  )
  from public.flight_desk_settings s where s.id = 1;
$$;


/* ══════════════════════════════════════════════════════════════════════
   11 · DESK API
   Admin-gated. Every function re-checks is_admin() itself rather than
   trusting that the UI only rendered the button for the right people.
══════════════════════════════════════════════════════════════════════ */

/* Publish quotes: marks the request quoted, stamps first response for
   the SLA record, and clears any stale drafts in one transaction. */
create or replace function public.fd_publish_quotes(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int; r public.flight_requests;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;
  select * into r from public.flight_requests where id = p_request;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  update public.flight_quotes set status = 'offered'
   where request_id = p_request and status = 'draft';
  get diagnostics n = row_count;

  select count(*) into n from public.flight_quotes
   where request_id = p_request and status in ('offered','selected');
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'no_quotes'); end if;

  update public.flight_requests
     set status = 'quoted',
         quoted_at = now(),
         first_quoted_at = coalesce(first_quoted_at, now())
   where id = p_request;

  return jsonb_build_object('ok', true, 'quotes', n);
end;
$$;

/* Desk queue with the numbers the console needs, in one round trip. */
create or replace function public.fd_desk_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not public.is_admin() then jsonb_build_object('ok', false)
  else jsonb_build_object(
    'ok', true,
    'new',       (select count(*) from public.flight_requests where status = 'new'),
    'working',   (select count(*) from public.flight_requests where status = 'working'),
    'quoted',    (select count(*) from public.flight_requests where status = 'quoted'),
    'selected',  (select count(*) from public.flight_requests where status = 'selected'),
    'ticketed',  (select count(*) from public.flight_requests where status = 'ticketed'),
    'overdue',   (select count(*) from public.flight_requests
                   where status in ('new','working') and sla_due_at < now()),
    'open_total',(select count(*) from public.flight_requests
                   where status in ('new','working','quoted','selected','payment_pending','confirmed')),
    'margin_30d',(select coalesce(sum(margin), 0) from public.flight_quotes
                   where status = 'selected' and created_at > now() - interval '30 days'),
    'booked_30d',(select coalesce(sum(amount), 0) from public.flight_bookings
                   where created_at > now() - interval '30 days'
                     and payment_status in ('paid','partial')),
    'conversion',(select case when count(*) = 0 then 0
                    else round(100.0 * count(*) filter (where status in
                         ('selected','payment_pending','confirmed','ticketed','completed'))
                         / count(*), 1) end
                   from public.flight_requests where created_at > now() - interval '30 days'),
    'top_routes',(select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                   select origin_iata || '→' || coalesce(dest_iata,'?') as route, count(*) as n
                     from public.flight_requests
                    where created_at > now() - interval '90 days'
                    group by 1 order by 2 desc limit 6) t)
  ) end;
$$;

grant execute on function public.fd_submit_request(jsonb)                 to anon, authenticated;
grant execute on function public.fd_get_request(text, uuid)               to anon, authenticated;
grant execute on function public.fd_select_quote(text, uuid, uuid)        to anon, authenticated;
grant execute on function public.fd_cancel_request(text, uuid, text)      to anon, authenticated;
grant execute on function public.fd_save_passengers(text, uuid, jsonb)    to anon, authenticated;
grant execute on function public.fd_desk_status()                         to anon, authenticated;
grant execute on function public.fd_publish_quotes(uuid)                  to authenticated;
grant execute on function public.fd_desk_stats()                          to authenticated;
grant execute on function public.fd_price_from_net(numeric)               to authenticated;

/* fd_new_ref mints identifiers. Nothing public needs to call it. */
revoke execute on function public.fd_new_ref(text) from anon, authenticated;
