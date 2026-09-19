/* ════════════════════════════════════════════════════════════════
   CABANA · FOOD ORDERS
   ────────────────────────────────────────────────────────────────
   Until now an order was a WhatsApp message the diner wrote and sent
   themselves. Nobody could see whether the kitchen had read it, said
   yes, said no, or started cooking, and a rider at the door was a
   stranger with a bag.

   This gives an order a life of its own:

     requested ─┬─ accepted ── ready ──┬─ on_the_way ── completed   (delivery)
                │                      ├─ completed                  (collect, by code)
                │                      └─ completed                  (eat in, served)
                ├─ declined   (with a reason, and the dishes it could not do)
                ├─ cancelled  (by the diner before a yes, or the kitchen after)
                └─ expired    (no answer inside the response window)

   Money still moves between the diner and the counter. Cabana prices
   nothing and takes nothing: the server recomputes every line from
   the kitchen's own menu so the ticket cannot be edited on the way.

   THE HANDOFF
   Two four digit codes. The rider carries one, the diner holds the
   other. At the door the diner asks for the rider's code and checks
   it in the app, which proves the bag came from the kitchen. The
   diner then reads their code to the rider, who enters it, which
   proves the food reached the right person and closes the order.
   For collection the counter enters the diner's code.

   ACCESS
   Nobody reads food_orders directly. A diner holds a random token
   (or is signed in), a kitchen manages the listing, a rider holds a
   separate random token handed out only when the kitchen dispatches.
   Each gets a view shaped for them by a security definer function,
   so the kitchen never sees the diner's code and the diner never
   sees the rider's.
   ════════════════════════════════════════════════════════════════ */

-- ── kitchen settings for taking orders ───────────────────────────
alter table public.restaurant_profiles
  add column if not exists accepts_orders      boolean not null default true,
  add column if not exists orders_paused_until timestamptz,
  add column if not exists respond_mins        integer not null default 12,
  add column if not exists accepts_cash        boolean not null default true,
  add column if not exists mpesa_till          text,
  add column if not exists mpesa_paybill       text,
  add column if not exists mpesa_account       text;

do $$ begin
  alter table public.restaurant_profiles
    add constraint restaurant_profiles_respond_mins_sane check (respond_mins between 3 and 60);
exception when duplicate_object then null; end $$;

-- ── the order ────────────────────────────────────────────────────
create table if not exists public.food_orders (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,
  basket          uuid,
  listing_id      uuid not null references public.listings(id) on delete restrict,
  kitchen_user    uuid,
  guest_id        uuid references auth.users(id) on delete set null,
  guest_token     text not null,
  rider_token     text unique,

  status          text not null default 'requested',
  mode            text not null,
  pay_method      text not null default 'mpesa',

  items           jsonb not null,
  item_count      integer not null,
  subtotal        numeric not null,
  delivery_fee    numeric not null default 0,
  total           numeric not null,
  currency        text not null default 'KES',

  diner_name      text not null,
  diner_phone     text not null,
  address         text,
  address_note    text,
  lat             double precision,
  lng             double precision,
  table_label     text,
  note            text,
  scheduled_for   timestamptz,

  eta_mins        integer,
  eta_ready_at    timestamptz,
  decline_code    text,
  decline_reason  text,
  decline_items   jsonb,
  cancel_reason   text,
  cancelled_by    text,

  rider_name      text,
  rider_phone     text,
  handoff_code    text not null,
  rider_code      text,
  rider_verified_at timestamptz,
  code_attempts   integer not null default 0,
  rider_attempts  integer not null default 0,

  requested_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  declined_at     timestamptz,
  ready_at        timestamptz,
  dispatched_at   timestamptz,
  arrived_at      timestamptz,
  completed_at    timestamptz,
  cancelled_at    timestamptz,

  rating          integer,
  review          text,
  rated_at        timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint food_orders_status_known check (status in
    ('requested','accepted','ready','on_the_way','completed','declined','cancelled','expired')),
  constraint food_orders_mode_known check (mode in ('delivery','pickup','dine_in')),
  constraint food_orders_pay_known check (pay_method in ('mpesa','cash','card')),
  constraint food_orders_money_sane check (subtotal >= 0 and delivery_fee >= 0 and total >= 0),
  constraint food_orders_rating_sane check (rating is null or rating between 1 and 5),
  constraint food_orders_decline_known check (decline_code is null or decline_code in
    ('unavailable','busy','closed','too_far','below_minimum','other'))
);

create index if not exists idx_food_orders_listing_status on public.food_orders (listing_id, status, requested_at desc);
create index if not exists idx_food_orders_kitchen on public.food_orders (kitchen_user, requested_at desc);
create index if not exists idx_food_orders_guest on public.food_orders (guest_id, requested_at desc) where guest_id is not null;
create index if not exists idx_food_orders_phone on public.food_orders (diner_phone, requested_at desc);
create index if not exists idx_food_orders_expiring on public.food_orders (expires_at) where status = 'requested';
create index if not exists idx_food_orders_basket on public.food_orders (basket) where basket is not null;

drop trigger if exists trg_food_orders_touch on public.food_orders;
create trigger trg_food_orders_touch before update on public.food_orders
  for each row execute function public.touch_updated_at();

-- ── what happened, in order ──────────────────────────────────────
create table if not exists public.food_order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.food_orders(id) on delete cascade,
  kind       text not null,
  actor      text not null default 'system',
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists idx_food_order_events_order on public.food_order_events (order_id, id);

alter table public.food_orders enable row level security;
alter table public.food_order_events enable row level security;
revoke all on public.food_orders, public.food_order_events from anon, authenticated;

drop policy if exists food_orders_operator_read on public.food_orders;
create policy food_orders_operator_read on public.food_orders for select using (public.is_operator());
drop policy if exists food_order_events_operator_read on public.food_order_events;
create policy food_order_events_operator_read on public.food_order_events for select using (public.is_operator());
grant select on public.food_orders, public.food_order_events to authenticated;

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_err(p_code text, p_detail text default null)
returns void language plpgsql volatile as $$
begin
  raise exception '%', p_code using errcode = 'P0001', detail = coalesce(p_detail, p_code);
end $$;

create or replace function public.food_secret(p_bytes integer default 18)
returns text language sql volatile set search_path = public, extensions as $$
  select encode(extensions.gen_random_bytes(p_bytes), 'hex');
$$;

create or replace function public.food_code()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare b bytea; c text;
begin
  /* four digits from 1000 to 9999, never a run like 1111 */
  loop
    b := extensions.gen_random_bytes(3);
    c := (((get_byte(b, 0) * 65536 + get_byte(b, 1) * 256 + get_byte(b, 2)) % 9000) + 1000)::text;
    exit when c !~ '^(\d)\1{3}$';
  end loop;
  return c;
end $$;

create or replace function public.food_new_ref()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  abc constant text := 'ACDEFGHJKLMNPQRTUVWXY34679';
  r text; b bytea; i int;
begin
  loop
    b := extensions.gen_random_bytes(6);
    r := 'CF-';
    for i in 0..5 loop
      r := r || substr(abc, (get_byte(b, i) % length(abc)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.food_orders where ref = r);
  end loop;
  return r;
end $$;

create or replace function public.food_digits(p text)
returns text language sql immutable as $$ select regexp_replace(coalesce(p, ''), '\D', '', 'g'); $$;

-- deliver an in-app notification and ask the push service to send it
create or replace function public.food_notify(p_user uuid, p_title text, p_body text, p_url text, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, cabana_ops
as $$
declare nid uuid; secret text;
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, title, body, url, kind, meta)
  values (p_user, left(p_title, 140), left(coalesce(p_body, ''), 240), p_url, 'order', coalesce(p_meta, '{}'::jsonb))
  returning id into nid;

  begin
    select value into secret from cabana_ops.cron_config where key = 'cron_secret';
    if secret is not null and secret <> '' then
      perform net.http_post(
        url := 'https://cabana.africa/api/push-send?action=database-notification',
        headers := jsonb_build_object('Authorization', 'Bearer ' || secret,
          'Content-Type', 'application/json', 'User-Agent', 'Cabana-Orders/1.0'),
        body := jsonb_build_object('action', 'database-notification', 'notification_id', nid),
        timeout_milliseconds := 15000);
    end if;
  exception when others then
    /* a push that cannot be queued must never roll back an order */
    raise warning 'food_notify push queue failed: %', sqlerrm;
  end;
end $$;

create or replace function public.food_log(p_order uuid, p_kind text, p_actor text, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.food_order_events (order_id, kind, actor, note) values (p_order, p_kind, p_actor, left(p_note, 400));
$$;

/* ── the three views of one order ────────────────────────────────── */
create or replace function public.food_order_json(o public.food_orders, p_view text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l public.listings%rowtype;
  p public.restaurant_profiles%rowtype;
  v_out jsonb;
begin
  select * into l from public.listings where id = o.listing_id;
  select * into p from public.restaurant_profiles where listing_id = o.listing_id;

  v_out := jsonb_build_object(
    'id', o.id, 'ref', o.ref, 'basket', o.basket, 'status', o.status, 'mode', o.mode,
    'pay_method', o.pay_method, 'items', o.items, 'item_count', o.item_count,
    'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'total', o.total, 'currency', o.currency,
    'diner_name', o.diner_name, 'address', o.address, 'address_note', o.address_note,
    'lat', o.lat, 'lng', o.lng, 'table_label', o.table_label, 'note', o.note,
    'scheduled_for', o.scheduled_for, 'eta_mins', o.eta_mins, 'eta_ready_at', o.eta_ready_at,
    'decline_code', o.decline_code, 'decline_reason', o.decline_reason, 'decline_items', o.decline_items,
    'cancel_reason', o.cancel_reason, 'cancelled_by', o.cancelled_by,
    'rider_name', o.rider_name, 'rider_phone', o.rider_phone,
    'rider_verified', o.rider_verified_at is not null,
    'requested_at', o.requested_at, 'expires_at', o.expires_at, 'accepted_at', o.accepted_at,
    'declined_at', o.declined_at, 'ready_at', o.ready_at, 'dispatched_at', o.dispatched_at,
    'arrived_at', o.arrived_at, 'completed_at', o.completed_at, 'cancelled_at', o.cancelled_at,
    'rating', o.rating, 'review', o.review, 'now', now(),
    'kitchen', jsonb_build_object(
      'id', l.id, 'name', l.title, 'area', l.area, 'city', l.city,
      'photo', coalesce(p.hero_photo, l.photos[1]),
      'phone', coalesce(p.order_phone, l.contact_phone),
      'whatsapp', coalesce(p.order_whatsapp, l.contact_whatsapp),
      'lat', coalesce(l.latitude, l.lat), 'lng', coalesce(l.longitude, l.lng),
      'delivery_mins', p.delivery_mins, 'prep_mins', p.prep_mins,
      'mpesa_till', p.mpesa_till, 'mpesa_paybill', p.mpesa_paybill, 'mpesa_account', p.mpesa_account,
      'accepts_cash', coalesce(p.accepts_cash, true)
    ),
    'events', coalesce((select jsonb_agg(jsonb_build_object('kind', e.kind, 'actor', e.actor,
                          'note', e.note, 'at', e.created_at) order by e.id)
                        from public.food_order_events e where e.order_id = o.id), '[]'::jsonb)
  );

  if p_view = 'guest' then
    v_out := v_out || jsonb_build_object('handoff_code', o.handoff_code);
  elsif p_view = 'kitchen' then
    v_out := v_out || jsonb_build_object('diner_phone', o.diner_phone, 'rider_code', o.rider_code,
      'rider_token', o.rider_token, 'code_attempts', o.code_attempts);
  elsif p_view = 'rider' then
    v_out := v_out || jsonb_build_object('diner_phone', o.diner_phone, 'rider_code', o.rider_code);
  end if;
  return v_out;
end $$;

/* ── lazy expiry, so a page never shows a request nobody answered ── */
create or replace function public.food_orders_expire()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0;
begin
  with gone as (
    update public.food_orders set status = 'expired'
    where status = 'requested' and expires_at < now()
    returning id
  )
  insert into public.food_order_events (order_id, kind, actor, note)
  select id, 'expired', 'system', 'The kitchen did not answer in time' from gone;
  get diagnostics n = row_count;
  return n;
end $$;

/* ════════════════════════════════════════════════════════════════
   DINER
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_order_place(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing uuid := nullif(p->>'listing_id', '')::uuid;
  v_mode    text := coalesce(nullif(p->>'mode', ''), 'delivery');
  v_pay     text := coalesce(nullif(p->>'pay_method', ''), 'mpesa');
  v_name    text := btrim(coalesce(p->>'name', ''));
  v_phone   text := btrim(coalesce(p->>'phone', ''));
  v_addr    text := nullif(btrim(coalesce(p->>'address', '')), '');
  v_when    timestamptz := nullif(p->>'scheduled_for', '')::timestamptz;
  l public.listings%rowtype;
  pr public.restaurant_profiles%rowtype;
  it jsonb; mi public.menu_items%rowtype;
  v_items jsonb := '[]'::jsonb; v_count int := 0; v_sub numeric := 0; v_fee numeric := 0;
  v_unit numeric; v_qty int; v_seen uuid[] := '{}';
  o public.food_orders%rowtype;
  v_window int;
begin
  if v_listing is null then perform public.food_err('kitchen_missing'); end if;
  select * into l from public.listings where id = v_listing;
  if not found or lower(coalesce(l.service, l.type, '')) <> 'food'
     or coalesce(l.is_active, false) = false or l.deleted_at is not null then
    perform public.food_err('kitchen_unavailable');
  end if;
  select * into pr from public.restaurant_profiles where listing_id = v_listing;

  if found and (pr.accepts_orders = false) then perform public.food_err('kitchen_not_taking_orders'); end if;
  if found and pr.orders_paused_until is not null and pr.orders_paused_until > now() then
    perform public.food_err('kitchen_paused', to_char(pr.orders_paused_until at time zone 'Africa/Nairobi', 'HH24:MI'));
  end if;

  if v_mode not in ('delivery', 'pickup', 'dine_in') then perform public.food_err('mode_invalid'); end if;
  if (v_mode = 'delivery' and coalesce(pr.serves_delivery, true) = false)
     or (v_mode = 'pickup' and coalesce(pr.serves_pickup, true) = false)
     or (v_mode = 'dine_in' and coalesce(pr.serves_dine_in, true) = false) then
    perform public.food_err('mode_not_offered');
  end if;
  if v_pay not in ('mpesa', 'cash', 'card') then v_pay := 'mpesa'; end if;
  if v_pay = 'cash' and coalesce(pr.accepts_cash, true) = false then v_pay := 'mpesa'; end if;

  if length(v_name) < 2 or length(v_name) > 80 then perform public.food_err('name_required'); end if;
  if length(public.food_digits(v_phone)) < 9 or length(public.food_digits(v_phone)) > 15 then
    perform public.food_err('phone_required');
  end if;
  if v_mode = 'delivery' and (v_addr is null or length(v_addr) < 6) then perform public.food_err('address_required'); end if;
  if v_when is not null and (v_when < now() + interval '10 minutes' or v_when > now() + interval '7 days') then
    perform public.food_err('schedule_invalid');
  end if;

  -- somebody hammering the button, or a script
  if (select count(*) from public.food_orders
      where public.food_digits(diner_phone) = public.food_digits(v_phone)
        and status = 'requested') >= 6
     or (select count(*) from public.food_orders
      where public.food_digits(diner_phone) = public.food_digits(v_phone)
        and requested_at > now() - interval '1 hour') >= 20 then
    perform public.food_err('too_many_orders');
  end if;

  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    perform public.food_err('items_required');
  end if;
  if jsonb_array_length(p->'items') > 40 then perform public.food_err('too_many_items'); end if;

  -- every price comes from the kitchen's own menu, never from the browser
  for it in select * from jsonb_array_elements(p->'items') loop
    select * into mi from public.menu_items
      where id = nullif(it->>'id', '')::uuid and listing_id = v_listing;
    if not found then perform public.food_err('item_missing', it->>'id'); end if;
    if mi.is_available = false or (mi.sold_out_until is not null and mi.sold_out_until > now()) then
      perform public.food_err('item_sold_out', mi.name);
    end if;
    if mi.id = any(v_seen) then continue; end if;
    v_seen := v_seen || mi.id;
    v_qty := greatest(1, least(50, coalesce((it->>'qty')::int, 1)));
    v_unit := case when mi.promo_price is not null and (mi.promo_until is null or mi.promo_until > now())
                   then mi.promo_price else mi.price end;
    v_items := v_items || jsonb_build_object('id', mi.id, 'name', mi.name, 'qty', v_qty,
      'unit', v_unit, 'line', v_unit * v_qty, 'photo', mi.photo,
      'note', nullif(left(btrim(coalesce(it->>'note', '')), 140), ''));
    v_count := v_count + v_qty;
    v_sub := v_sub + v_unit * v_qty;
  end loop;

  if v_mode = 'delivery' then
    v_fee := coalesce(pr.delivery_fee, 0);
    if pr.min_order is not null and v_sub < pr.min_order then
      perform public.food_err('below_minimum', pr.min_order::text);
    end if;
  end if;

  v_window := coalesce(pr.respond_mins, 12);

  insert into public.food_orders (
    ref, basket, listing_id, kitchen_user, guest_id, guest_token, status, mode, pay_method,
    items, item_count, subtotal, delivery_fee, total, currency,
    diner_name, diner_phone, address, address_note, lat, lng, table_label, note, scheduled_for,
    handoff_code, expires_at)
  values (
    public.food_new_ref(), nullif(p->>'basket', '')::uuid, v_listing, coalesce(l.partner_id, l.host_id),
    auth.uid(), public.food_secret(), 'requested', v_mode, v_pay,
    v_items, v_count, v_sub, v_fee, v_sub + v_fee, coalesce(pr.currency, l.currency, 'KES'),
    v_name, v_phone, case when v_mode = 'delivery' then v_addr end,
    nullif(left(btrim(coalesce(p->>'address_note', '')), 200), ''),
    case when v_mode = 'delivery' then nullif(p->>'lat', '')::double precision end,
    case when v_mode = 'delivery' then nullif(p->>'lng', '')::double precision end,
    case when v_mode = 'dine_in' then nullif(left(btrim(coalesce(p->>'table_label', '')), 40), '') end,
    nullif(left(btrim(coalesce(p->>'note', '')), 400), ''),
    v_when, public.food_code(),
    now() + make_interval(mins => v_window))
  returning * into o;

  perform public.food_log(o.id, 'requested', 'guest', null);

  return jsonb_build_object('id', o.id, 'ref', o.ref, 'token', o.guest_token, 'status', o.status,
    'total', o.total, 'currency', o.currency, 'kitchen', l.title, 'expires_at', o.expires_at);
end $$;

-- the guest's key to one order: their token, or being the signed in author
create or replace function public.food_guest_order(p_ref text, p_token text)
returns public.food_orders
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  select * into o from public.food_orders where ref = upper(btrim(coalesce(p_ref, '')));
  if not found then perform public.food_err('order_not_found'); end if;
  if not ((p_token is not null and p_token <> '' and o.guest_token = p_token)
          or (o.guest_id is not null and o.guest_id = auth.uid())
          or public.is_operator()) then
    perform public.food_err('order_not_found');
  end if;
  return o;
end $$;

create or replace function public.food_order_track(p_ref text, p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  perform public.food_orders_expire();
  o := public.food_guest_order(p_ref, p_token);
  return public.food_order_json(o, 'guest');
end $$;

-- everything this diner has ordered recently: their tokens, plus their account
create or replace function public.food_orders_list(p_pairs jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_out jsonb;
begin
  perform public.food_orders_expire();
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_out from (
    select o.requested_at at,
      jsonb_build_object('ref', o.ref, 'status', o.status, 'mode', o.mode, 'total', o.total,
        'currency', o.currency, 'item_count', o.item_count, 'items', o.items,
        'requested_at', o.requested_at, 'eta_ready_at', o.eta_ready_at, 'basket', o.basket,
        'listing_id', o.listing_id, 'rating', o.rating,
        'kitchen', jsonb_build_object('name', l.title, 'photo', coalesce(rp.hero_photo, l.photos[1]),
          'area', l.area, 'city', l.city)) j
    from public.food_orders o
    join public.listings l on l.id = o.listing_id
    left join public.restaurant_profiles rp on rp.listing_id = o.listing_id
    where o.requested_at > now() - interval '60 days'
      and ((o.guest_id is not null and o.guest_id = auth.uid())
        or exists (select 1 from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) e
                   where upper(e->>'ref') = o.ref and e->>'token' = o.guest_token))
    order by o.requested_at desc
    limit 60
  ) x;
  return v_out;
end $$;

create or replace function public.food_order_cancel(p_ref text, p_token text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  perform public.food_orders_expire();
  o := public.food_guest_order(p_ref, p_token);
  if o.status <> 'requested' then perform public.food_err('too_late_to_cancel'); end if;
  update public.food_orders set status = 'cancelled', cancelled_at = now(), cancelled_by = 'guest',
    cancel_reason = nullif(left(btrim(coalesce(p_reason, '')), 200), '')
  where id = o.id returning * into o;
  perform public.food_log(o.id, 'cancelled', 'guest', o.cancel_reason);
  return public.food_order_json(o, 'guest');
end $$;

-- the diner checks the rider's code at the door
create or replace function public.food_order_verify_rider(p_ref text, p_token text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  o := public.food_guest_order(p_ref, p_token);
  if o.status <> 'on_the_way' or o.rider_code is null then perform public.food_err('no_rider_yet'); end if;
  if o.rider_verified_at is not null then return public.food_order_json(o, 'guest'); end if;
  if o.rider_attempts >= 8 then perform public.food_err('too_many_attempts'); end if;
  /* A wrong code is an answer, not an exception: raising would roll
     back the attempt counter and make guessing free. */
  if public.food_digits(p_code) <> o.rider_code then
    update public.food_orders set rider_attempts = rider_attempts + 1 where id = o.id returning * into o;
    perform public.food_log(o.id, 'rider_code_wrong', 'guest', null);
    return public.food_order_json(o, 'guest')
      || jsonb_build_object('error', 'code_wrong', 'attempts_left', greatest(0, 8 - o.rider_attempts));
  end if;
  update public.food_orders set rider_verified_at = now() where id = o.id returning * into o;
  perform public.food_log(o.id, 'rider_verified', 'guest', null);
  return public.food_order_json(o, 'guest');
end $$;

create or replace function public.food_order_rate(p_ref text, p_token text, p_rating int, p_review text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  o := public.food_guest_order(p_ref, p_token);
  if o.status <> 'completed' then perform public.food_err('not_completed'); end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then perform public.food_err('rating_invalid'); end if;
  update public.food_orders set rating = p_rating, rated_at = now(),
    review = nullif(left(btrim(coalesce(p_review, '')), 600), '')
  where id = o.id returning * into o;
  perform public.food_log(o.id, 'rated', 'guest', p_rating::text || '/5');
  return public.food_order_json(o, 'guest');
end $$;

/* ════════════════════════════════════════════════════════════════
   KITCHEN
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_kitchen_order(p_order uuid)
returns public.food_orders
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  if auth.uid() is null then perform public.food_err('sign_in_required'); end if;
  select * into o from public.food_orders where id = p_order for update;
  if not found or not (public.manages_listing(o.listing_id) or public.is_operator()) then
    perform public.food_err('order_not_found');
  end if;
  return o;
end $$;

create or replace function public.food_kitchen_board(p_listing uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_day timestamptz := date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi';
  v_out jsonb;
begin
  if auth.uid() is null then perform public.food_err('sign_in_required'); end if;
  perform public.food_orders_expire();

  select coalesce(array_agg(l.id), '{}') into v_ids from public.listings l
  where lower(coalesce(l.service, l.type, '')) = 'food' and l.deleted_at is null
    and (l.partner_id = auth.uid() or l.host_id = auth.uid() or public.is_operator())
    and (p_listing is null or l.id = p_listing);

  select jsonb_build_object(
    'kitchens', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.title,
        'is_active', coalesce(l.is_active, false), 'photo', coalesce(rp.hero_photo, l.photos[1]),
        'accepts_orders', coalesce(rp.accepts_orders, true), 'orders_paused_until', rp.orders_paused_until,
        'respond_mins', coalesce(rp.respond_mins, 12), 'prep_mins', rp.prep_mins,
        'delivery_mins', rp.delivery_mins, 'mpesa_till', rp.mpesa_till, 'mpesa_paybill', rp.mpesa_paybill,
        'mpesa_account', rp.mpesa_account, 'accepts_cash', coalesce(rp.accepts_cash, true),
        'serves_delivery', coalesce(rp.serves_delivery, true), 'serves_pickup', coalesce(rp.serves_pickup, true),
        'serves_dine_in', coalesce(rp.serves_dine_in, true)) order by l.created_at)
      from public.listings l left join public.restaurant_profiles rp on rp.listing_id = l.id
      where l.id = any(v_ids)), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(public.food_order_json(o, 'kitchen') order by o.requested_at desc)
      from public.food_orders o
      where o.listing_id = any(v_ids)
        and (o.status in ('requested','accepted','ready','on_the_way') or o.requested_at > now() - interval '36 hours')),
      '[]'::jsonb),
    'stats', (select jsonb_build_object(
        'today_orders', count(*) filter (where o.requested_at >= v_day),
        'today_completed', count(*) filter (where o.requested_at >= v_day and o.status = 'completed'),
        'today_revenue', coalesce(sum(o.total) filter (where o.requested_at >= v_day and o.status = 'completed'), 0),
        'today_declined', count(*) filter (where o.requested_at >= v_day and o.status in ('declined','expired')),
        'avg_answer_secs', coalesce(round(avg(extract(epoch from (coalesce(o.accepted_at, o.declined_at) - o.requested_at)))
            filter (where o.requested_at > now() - interval '30 days' and coalesce(o.accepted_at, o.declined_at) is not null)), 0),
        'rating', round(avg(o.rating) filter (where o.rating is not null), 2),
        'ratings', count(o.rating))
      from public.food_orders o where o.listing_id = any(v_ids)),
    'now', now()
  ) into v_out;
  return v_out;
end $$;

create or replace function public.food_kitchen_respond(p_order uuid, p_accept boolean, p_eta int default null,
  p_code text default null, p_reason text default null, p_items jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype; v_eta int;
begin
  perform public.food_orders_expire();
  o := public.food_kitchen_order(p_order);
  if o.status <> 'requested' then perform public.food_err('already_answered', o.status); end if;

  if p_accept then
    v_eta := greatest(5, least(240, coalesce(p_eta, 20)));
    update public.food_orders set status = 'accepted', accepted_at = now(), eta_mins = v_eta,
      eta_ready_at = greatest(now() + make_interval(mins => v_eta), coalesce(scheduled_for, now()))
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'accepted', 'kitchen', v_eta || ' min');
  else
    if p_code is null or p_code not in ('unavailable','busy','closed','too_far','below_minimum','other') then
      perform public.food_err('reason_required');
    end if;
    if p_code = 'other' and length(btrim(coalesce(p_reason, ''))) < 3 then perform public.food_err('reason_required'); end if;
    if p_code = 'unavailable' and (p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0) then
      perform public.food_err('items_required');
    end if;
    update public.food_orders set status = 'declined', declined_at = now(), decline_code = p_code,
      decline_reason = nullif(left(btrim(coalesce(p_reason, '')), 300), ''),
      decline_items = case when p_code = 'unavailable' then p_items end
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'declined', 'kitchen', coalesce(o.decline_reason, p_code));

    -- the dishes it could not make are marked off the menu for today, so nobody else hits them
    if p_code = 'unavailable' then
      update public.menu_items set sold_out_until = (date_trunc('day', now() at time zone 'Africa/Nairobi') + interval '1 day') at time zone 'Africa/Nairobi'
      where listing_id = o.listing_id
        and id in (select (e #>> '{}')::uuid from jsonb_array_elements(p_items) e where (e #>> '{}') ~ '^[0-9a-f-]{36}$');
    end if;
  end if;
  return public.food_order_json(o, 'kitchen');
end $$;

create or replace function public.food_kitchen_update(p_order uuid, p_action text, p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype; v_mins int;
begin
  o := public.food_kitchen_order(p_order);
  p := coalesce(p, '{}'::jsonb);

  if p_action = 'ready' then
    if o.status <> 'accepted' then perform public.food_err('wrong_step', o.status); end if;
    update public.food_orders set status = 'ready', ready_at = now() where id = o.id returning * into o;
    perform public.food_log(o.id, 'ready', 'kitchen', null);

  elsif p_action = 'eta' then
    if o.status <> 'accepted' then perform public.food_err('wrong_step', o.status); end if;
    v_mins := greatest(1, least(180, coalesce((p->>'mins')::int, 10)));
    update public.food_orders set eta_ready_at = greatest(coalesce(eta_ready_at, now()), now()) + make_interval(mins => v_mins),
      eta_mins = coalesce(eta_mins, 0) + v_mins
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'delayed', 'kitchen', v_mins || ' min more');

  elsif p_action = 'dispatch' then
    if o.mode <> 'delivery' then perform public.food_err('not_delivery'); end if;
    if o.status not in ('accepted', 'ready') then perform public.food_err('wrong_step', o.status); end if;
    if length(btrim(coalesce(p->>'rider_name', ''))) < 2 then perform public.food_err('rider_required'); end if;
    update public.food_orders set status = 'on_the_way', dispatched_at = now(),
      ready_at = coalesce(ready_at, now()),
      rider_name = left(btrim(p->>'rider_name'), 60),
      rider_phone = nullif(left(btrim(coalesce(p->>'rider_phone', '')), 30), ''),
      rider_token = public.food_secret(), rider_code = public.food_code()
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'on_the_way', 'kitchen', o.rider_name);

  elsif p_action = 'arrived' then
    if o.status <> 'on_the_way' then perform public.food_err('wrong_step', o.status); end if;
    if o.arrived_at is null then
      update public.food_orders set arrived_at = now() where id = o.id returning * into o;
      perform public.food_log(o.id, 'arrived', 'kitchen', null);
    end if;

  elsif p_action = 'served' then
    if o.mode <> 'dine_in' then perform public.food_err('not_dine_in'); end if;
    if o.status not in ('accepted', 'ready') then perform public.food_err('wrong_step', o.status); end if;
    update public.food_orders set status = 'completed', ready_at = coalesce(ready_at, now()), completed_at = now()
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'completed', 'kitchen', 'Served at the table');

  elsif p_action = 'complete' then
    if o.mode = 'dine_in' then perform public.food_err('use_served'); end if;
    if o.status not in ('ready', 'on_the_way') then perform public.food_err('wrong_step', o.status); end if;
    if o.code_attempts >= 10 then perform public.food_err('too_many_attempts'); end if;
    if public.food_digits(p->>'code') <> o.handoff_code then
      update public.food_orders set code_attempts = code_attempts + 1 where id = o.id returning * into o;
      perform public.food_log(o.id, 'handoff_code_wrong', 'kitchen', null);
      return public.food_order_json(o, 'kitchen')
        || jsonb_build_object('error', 'code_wrong', 'attempts_left', greatest(0, 10 - o.code_attempts));
    end if;
    update public.food_orders set status = 'completed', completed_at = now() where id = o.id returning * into o;
    perform public.food_log(o.id, 'completed', 'kitchen', case when o.mode = 'pickup' then 'Collected' else 'Handed over' end);

  elsif p_action = 'cancel' then
    if o.status not in ('accepted', 'ready', 'on_the_way') then perform public.food_err('wrong_step', o.status); end if;
    if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.food_err('reason_required'); end if;
    update public.food_orders set status = 'cancelled', cancelled_at = now(), cancelled_by = 'kitchen',
      cancel_reason = left(btrim(p->>'reason'), 300)
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'cancelled', 'kitchen', o.cancel_reason);

  else
    perform public.food_err('unknown_action');
  end if;

  return public.food_order_json(o, 'kitchen');
end $$;

-- pause, resume and payment details, from the console
create or replace function public.food_kitchen_settings(p_listing uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare pr public.restaurant_profiles%rowtype;
begin
  if auth.uid() is null or not (public.manages_listing(p_listing) or public.is_operator()) then
    perform public.food_err('not_your_kitchen');
  end if;
  insert into public.restaurant_profiles (listing_id) values (p_listing) on conflict (listing_id) do nothing;
  update public.restaurant_profiles set
    accepts_orders = coalesce((p->>'accepts_orders')::boolean, accepts_orders),
    orders_paused_until = case
      when p ? 'pause_mins' and coalesce((p->>'pause_mins')::int, 0) > 0
        then now() + make_interval(mins => least(720, (p->>'pause_mins')::int))
      when p ? 'pause_mins' then null
      else orders_paused_until end,
    /* LEAST and GREATEST skip nulls, so an absent key must not reach them */
    respond_mins = case when p ? 'respond_mins' and (p->>'respond_mins') ~ '^\d+$'
      then greatest(3, least(60, (p->>'respond_mins')::int)) else respond_mins end,
    accepts_cash = coalesce((p->>'accepts_cash')::boolean, accepts_cash),
    mpesa_till = case when p ? 'mpesa_till' then nullif(left(btrim(p->>'mpesa_till'), 20), '') else mpesa_till end,
    mpesa_paybill = case when p ? 'mpesa_paybill' then nullif(left(btrim(p->>'mpesa_paybill'), 20), '') else mpesa_paybill end,
    mpesa_account = case when p ? 'mpesa_account' then nullif(left(btrim(p->>'mpesa_account'), 40), '') else mpesa_account end
  where listing_id = p_listing returning * into pr;
  return to_jsonb(pr);
end $$;

/* ════════════════════════════════════════════════════════════════
   RIDER. A link the kitchen hands to whoever carries the bag.
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_rider_order(p_ref text, p_token text)
returns public.food_orders
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  select * into o from public.food_orders where ref = upper(btrim(coalesce(p_ref, '')));
  if not found or o.rider_token is null or p_token is null or o.rider_token <> p_token then
    perform public.food_err('order_not_found');
  end if;
  return o;
end $$;

create or replace function public.food_rider_view(p_ref text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.food_order_json(public.food_rider_order(p_ref, p_token), 'rider');
end $$;

create or replace function public.food_rider_update(p_ref text, p_token text, p_action text, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  o := public.food_rider_order(p_ref, p_token);
  if o.status <> 'on_the_way' then
    if o.status = 'completed' then return public.food_order_json(o, 'rider'); end if;
    perform public.food_err('wrong_step', o.status);
  end if;

  if p_action = 'arrived' then
    if o.arrived_at is null then
      update public.food_orders set arrived_at = now() where id = o.id returning * into o;
      perform public.food_log(o.id, 'arrived', 'rider', null);
    end if;
  elsif p_action = 'complete' then
    if o.code_attempts >= 10 then perform public.food_err('too_many_attempts'); end if;
    if public.food_digits(p_code) <> o.handoff_code then
      update public.food_orders set code_attempts = code_attempts + 1 where id = o.id returning * into o;
      perform public.food_log(o.id, 'handoff_code_wrong', 'rider', null);
      return public.food_order_json(o, 'rider')
        || jsonb_build_object('error', 'code_wrong', 'attempts_left', greatest(0, 10 - o.code_attempts));
    end if;
    update public.food_orders set status = 'completed', completed_at = now(),
      arrived_at = coalesce(arrived_at, now()) where id = o.id returning * into o;
    perform public.food_log(o.id, 'completed', 'rider', 'Handed over');
  else
    perform public.food_err('unknown_action');
  end if;
  return public.food_order_json(o, 'rider');
end $$;

/* ════════════════════════════════════════════════════════════════
   WHO HEARS ABOUT WHAT
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_orders_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text; url_g text; url_k text; m text;
  meta jsonb;
begin
  select title into k from public.listings where id = new.listing_id;
  k := coalesce(k, 'The kitchen');
  url_g := '/order?ref=' || new.ref;
  url_k := '/partner-orders?id=' || new.listing_id || '&order=' || new.ref;
  meta := jsonb_build_object('order_ref', new.ref, 'order_id', new.id, 'status', new.status);
  m := case new.mode when 'delivery' then 'delivery' when 'pickup' then 'collection' else 'eat in' end;

  if tg_op = 'INSERT' then
    perform public.food_notify(new.kitchen_user,
      'New order ' || new.ref || ' · ' || new.currency || ' ' || to_char(new.total, 'FM999,999,990'),
      new.item_count || case when new.item_count = 1 then ' item' else ' items' end || ' for ' || m
        || ' from ' || new.diner_name || '. Answer within ' ||
        greatest(1, ceil(extract(epoch from (new.expires_at - now())) / 60))::int || ' minutes.',
      url_k, meta);
    return new;
  end if;

  if new.status is not distinct from old.status then
    if new.arrived_at is not null and old.arrived_at is null then
      perform public.food_notify(new.guest_id, 'Your rider is outside',
        coalesce(new.rider_name, 'The rider') || ' is at your door with ' || k || '. Check their code, then give yours.', url_g, meta);
    elsif new.eta_ready_at is distinct from old.eta_ready_at and new.status = 'accepted' then
      perform public.food_notify(new.guest_id, k || ' needs a little longer',
        'New time: about ' || to_char(new.eta_ready_at at time zone 'Africa/Nairobi', 'HH24:MI') || '.', url_g, meta);
    end if;
    return new;
  end if;

  if new.status = 'accepted' then
    perform public.food_notify(new.guest_id, k || ' accepted your order',
      'Cooking now. Ready around ' || to_char(new.eta_ready_at at time zone 'Africa/Nairobi', 'HH24:MI') || '. Ref ' || new.ref || '.', url_g, meta);
  elsif new.status = 'declined' then
    perform public.food_notify(new.guest_id, k || ' could not take your order',
      coalesce(new.decline_reason, case new.decline_code
        when 'unavailable' then 'Some dishes are finished for today. Resend without them in one tap.'
        when 'busy' then 'The kitchen is full right now.'
        when 'closed' then 'The kitchen is closed.'
        when 'too_far' then 'You are outside their delivery area.'
        when 'below_minimum' then 'The order is under their minimum.'
        else 'Open the order to see why.' end), url_g, meta);
  elsif new.status = 'ready' then
    perform public.food_notify(new.guest_id,
      case new.mode when 'pickup' then 'Ready to collect from ' || k
                    when 'dine_in' then 'Your food is coming to the table'
                    else 'Packed and waiting for the rider' end,
      case new.mode when 'pickup' then 'Show your collection code at the counter. Ref ' || new.ref || '.'
                    else 'Ref ' || new.ref || '.' end, url_g, meta);
  elsif new.status = 'on_the_way' then
    perform public.food_notify(new.guest_id, 'Your order is on the way',
      coalesce(new.rider_name, 'A rider') || ' left ' || k || '. Keep your handoff code ready.', url_g, meta);
  elsif new.status = 'completed' then
    perform public.food_notify(new.guest_id, 'Enjoy your meal',
      'Order ' || new.ref || ' is complete. Tell ' || k || ' how it was.', url_g, meta);
    -- what people actually order is what the food page leads with
    update public.menu_items mi set order_count = mi.order_count + (e->>'qty')::int
    from jsonb_array_elements(new.items) e
    where mi.id = (e->>'id')::uuid and mi.listing_id = new.listing_id;
  elsif new.status = 'cancelled' and new.cancelled_by = 'kitchen' then
    perform public.food_notify(new.guest_id, k || ' cancelled your order', coalesce(new.cancel_reason, ''), url_g, meta);
  elsif new.status = 'cancelled' and new.cancelled_by = 'guest' then
    perform public.food_notify(new.kitchen_user, 'Order ' || new.ref || ' was cancelled',
      new.diner_name || ' cancelled before you answered.', url_k, meta);
  elsif new.status = 'expired' then
    perform public.food_notify(new.guest_id, k || ' did not answer in time',
      'Nothing was charged. Send the same order to another kitchen in one tap.', url_g, meta);
    perform public.food_notify(new.kitchen_user, 'Missed order ' || new.ref,
      'It expired before anyone answered. Pause orders when the kitchen is too busy to reply.', url_k, meta);
  end if;
  return new;
end $$;

drop trigger if exists trg_food_orders_after on public.food_orders;
create trigger trg_food_orders_after after insert or update on public.food_orders
  for each row execute function public.food_orders_after();

/* ════════════════════════════════════════════════════════════════
   GRANTS
   ════════════════════════════════════════════════════════════════ */
revoke all on function public.food_err(text, text) from public, anon, authenticated;
revoke all on function public.food_secret(integer) from public, anon, authenticated;
revoke all on function public.food_code() from public, anon, authenticated;
revoke all on function public.food_new_ref() from public, anon, authenticated;
revoke all on function public.food_notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.food_log(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.food_order_json(public.food_orders, text) from public, anon, authenticated;
revoke all on function public.food_orders_expire() from public, anon, authenticated;
revoke all on function public.food_guest_order(text, text) from public, anon, authenticated;
revoke all on function public.food_kitchen_order(uuid) from public, anon, authenticated;
revoke all on function public.food_rider_order(text, text) from public, anon, authenticated;
revoke all on function public.food_orders_after() from public, anon, authenticated;

revoke all on function public.food_order_place(jsonb) from public;
revoke all on function public.food_order_track(text, text) from public;
revoke all on function public.food_orders_list(jsonb) from public;
revoke all on function public.food_order_cancel(text, text, text) from public;
revoke all on function public.food_order_verify_rider(text, text, text) from public;
revoke all on function public.food_order_rate(text, text, int, text) from public;
revoke all on function public.food_rider_view(text, text) from public;
revoke all on function public.food_rider_update(text, text, text, text) from public;
grant execute on function public.food_order_place(jsonb) to anon, authenticated;
grant execute on function public.food_order_track(text, text) to anon, authenticated;
grant execute on function public.food_orders_list(jsonb) to anon, authenticated;
grant execute on function public.food_order_cancel(text, text, text) to anon, authenticated;
grant execute on function public.food_order_verify_rider(text, text, text) to anon, authenticated;
grant execute on function public.food_order_rate(text, text, int, text) to anon, authenticated;
grant execute on function public.food_rider_view(text, text) to anon, authenticated;
grant execute on function public.food_rider_update(text, text, text, text) to anon, authenticated;

revoke all on function public.food_kitchen_board(uuid) from public, anon;
revoke all on function public.food_kitchen_respond(uuid, boolean, int, text, text, jsonb) from public, anon;
revoke all on function public.food_kitchen_update(uuid, text, jsonb) from public, anon;
revoke all on function public.food_kitchen_settings(uuid, jsonb) from public, anon;
grant execute on function public.food_kitchen_board(uuid) to authenticated;
grant execute on function public.food_kitchen_respond(uuid, boolean, int, text, text, jsonb) to authenticated;
grant execute on function public.food_kitchen_update(uuid, text, jsonb) to authenticated;
grant execute on function public.food_kitchen_settings(uuid, jsonb) to authenticated;

-- the clock that closes unanswered requests even when nobody has a page open
do $$
begin
  perform cron.unschedule('cabana-food-order-expiry')
  where exists (select 1 from cron.job where jobname = 'cabana-food-order-expiry');
  perform cron.schedule('cabana-food-order-expiry', '* * * * *', 'select public.food_orders_expire()');
end $$;

-- helpers keep a fixed search path, and the digit helper stays internal
alter function public.food_err(text, text) set search_path = public;
alter function public.food_digits(text) set search_path = public;
revoke all on function public.food_digits(text) from public, anon, authenticated;
