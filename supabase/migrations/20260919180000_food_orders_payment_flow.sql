/* ════════════════════════════════════════════════════════════════
   CABANA · FOOD ORDERS — PAYMENT-ON-ACCEPTANCE FLOW
   ────────────────────────────────────────────────────────────────
   Before this migration the order total was fixed at placement
   time and Cabana collected nothing — the diner just paid the
   kitchen on handover. That is still true, but we needed a way
   for a delivery kitchen to see the customer's address and then
   quote a delivery fee before the diner commits to paying.

   NEW FLOW
   ─────────
   1. Diner places order. Subtotal is set from menu prices.
      delivery_fee = 0 at placement (kitchen will set it).
      status → requested

   2. Kitchen sees the full address prominently.
      On acceptance the kitchen sets their delivery fee.
      For delivery → status → awaiting_payment
      For pickup / dine_in → status → accepted  (fee = 0)

   3. (delivery only) Diner sees "Kitchen accepted. Pay KES X
      food + KES Y delivery = KES Z. Confirm to begin cooking."
      Diner taps Confirm  → status → accepted
      Diner taps Change to pickup → mode = pickup, fee = 0 → accepted

   4. Kitchen cooks, dispatches, handoff codes close the order.

   STATE MACHINE (updated)
   ─────────────────────────
   requested ─┬─ awaiting_payment ── accepted ──┬─ on_the_way ── completed
              │  (delivery only)                ├─ completed   (pickup by code)
              │                                 └─ completed   (dine_in served)
              ├─ accepted   (pickup / dine_in, fee = 0)
              ├─ declined
              ├─ cancelled
              └─ expired

   PAYMENT
   ────────
   Cabana never touches money. The flow here records that the
   diner has confirmed they will pay the kitchen the quoted
   total. Payment itself happens at the kitchen (cash, M-Pesa
   till, paybill — whatever the kitchen takes).
   ════════════════════════════════════════════════════════════════ */

-- ── 1. new column: dynamic delivery fee set by kitchen on accept ──
alter table public.food_orders
  add column if not exists kitchen_delivery_fee   numeric,      -- what the kitchen quoted
  add column if not exists payment_confirmed_at   timestamptz,  -- when the diner said yes
  add column if not exists payment_declined_at    timestamptz;  -- diner switched to pickup

-- update the status constraint to include awaiting_payment
alter table public.food_orders
  drop constraint if exists food_orders_status_known;
alter table public.food_orders
  add constraint food_orders_status_known check (status in (
    'requested','awaiting_payment','accepted','ready',
    'on_the_way','completed','declined','cancelled','expired'));

-- index for the new intermediate state
create index if not exists idx_food_orders_awaiting
  on public.food_orders (listing_id, requested_at desc)
  where status = 'awaiting_payment';

/* ════════════════════════════════════════════════════════════════
   REWRITE  food_kitchen_respond
   ────────────────────────────────────────────────────────────────
   Kitchen now passes p_delivery_fee (numeric) when accepting a
   delivery order. If the fee is 0 or the order is pickup/dine_in
   the order goes straight to accepted. Otherwise it parks at
   awaiting_payment so the diner can confirm.
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_kitchen_respond(
  p_order     uuid,
  p_accept    boolean,
  p_eta       int      default null,
  p_code      text     default null,
  p_reason    text     default null,
  p_items     jsonb    default null,
  p_delivery_fee numeric default null   -- NEW: kitchen quotes the delivery fee
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o        public.food_orders%rowtype;
  v_eta    int;
  v_fee    numeric;
  v_total  numeric;
  v_next   text;
begin
  perform public.food_orders_expire();
  o := public.food_kitchen_order(p_order);
  if o.status <> 'requested' then perform public.food_err('already_answered', o.status); end if;

  if p_accept then
    v_eta := greatest(5, least(240, coalesce(p_eta, 20)));

    if o.mode = 'delivery' then
      -- kitchen may override the delivery fee; clamp to sane range
      v_fee  := greatest(0, least(5000, coalesce(p_delivery_fee, o.delivery_fee, 0)));
    else
      v_fee  := 0;   -- pickup and dine_in never charge delivery
    end if;

    v_total := o.subtotal + v_fee;

    /* Park at awaiting_payment only when the fee is non-zero and the
       order is delivery — otherwise go straight to accepted. */
    if o.mode = 'delivery' and v_fee > 0 then
      v_next := 'awaiting_payment';
    else
      v_next := 'accepted';
    end if;

    update public.food_orders set
      status              = v_next,
      accepted_at         = case when v_next = 'accepted' then now() end,
      eta_mins            = v_eta,
      eta_ready_at        = greatest(now() + make_interval(mins => v_eta),
                                     coalesce(scheduled_for, now())),
      kitchen_delivery_fee = v_fee,
      delivery_fee        = v_fee,
      total               = v_total
    where id = o.id returning * into o;

    perform public.food_log(o.id, case when v_next = 'awaiting_payment' then 'awaiting_payment' else 'accepted' end,
      'kitchen',
      case when v_next = 'awaiting_payment'
           then 'Quoted delivery KES ' || v_fee || ', ETA ' || v_eta || ' min'
           else v_eta || ' min'
      end);

    -- notify the diner
    if o.kitchen_user is not null then
      if v_next = 'awaiting_payment' then
        perform public.food_notify(o.guest_id, 'Kitchen accepted your order',
          'Delivery quote: KES ' || v_fee || '. Confirm to begin cooking.',
          '/order?ref=' || o.ref, jsonb_build_object('order_ref', o.ref, 'order_status', v_next));
      else
        perform public.food_notify(o.guest_id, 'Order accepted!',
          'Ready in about ' || v_eta || ' min.',
          '/order?ref=' || o.ref, jsonb_build_object('order_ref', o.ref, 'order_status', v_next));
      end if;
    end if;

  else
    -- decline path (unchanged)
    if p_code is null or p_code not in ('unavailable','busy','closed','too_far','below_minimum','other') then
      perform public.food_err('reason_required');
    end if;
    if p_code = 'other' and length(btrim(coalesce(p_reason, ''))) < 3 then
      perform public.food_err('reason_required');
    end if;
    if p_code = 'unavailable'
       and (p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0) then
      perform public.food_err('items_required');
    end if;
    update public.food_orders set
      status         = 'declined',
      declined_at    = now(),
      decline_code   = p_code,
      decline_reason = nullif(left(btrim(coalesce(p_reason, '')), 300), ''),
      decline_items  = case when p_code = 'unavailable' then p_items end
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'declined', 'kitchen', coalesce(o.decline_reason, p_code));

    if p_code = 'unavailable' then
      update public.menu_items
        set sold_out_until = (date_trunc('day', now() at time zone 'Africa/Nairobi')
                              + interval '1 day') at time zone 'Africa/Nairobi'
        where listing_id = o.listing_id
          and id in (select (e #>> '{}')::uuid from jsonb_array_elements(p_items) e
                     where (e #>> '{}') ~ '^[0-9a-f-]{36}$');
    end if;
  end if;

  return public.food_order_json(o, 'kitchen');
end $$;

/* ════════════════════════════════════════════════════════════════
   NEW  food_order_confirm_payment
   ────────────────────────────────────────────────────────────────
   Diner sees the quoted total and either confirms or switches
   mode (pickup instead of delivery, which drops the fee).
   ════════════════════════════════════════════════════════════════ */
create or replace function public.food_order_confirm_payment(
  p_ref    text,
  p_token  text,
  p_action text default 'confirm'   -- 'confirm' | 'switch_pickup'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.food_orders%rowtype;
begin
  perform public.food_orders_expire();
  o := public.food_guest_order(p_ref, p_token);

  if o.status <> 'awaiting_payment' then
    perform public.food_err('not_awaiting_payment');
  end if;

  if p_action = 'confirm' then
    update public.food_orders set
      status               = 'accepted',
      accepted_at          = now(),
      payment_confirmed_at = now()
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'payment_confirmed', 'guest', 'KES ' || o.total);

    -- tell kitchen cooking can start
    perform public.food_notify(o.kitchen_user,
      'Payment confirmed — start cooking',
      o.diner_name || ' confirmed the total of KES ' || o.total,
      '/partner-orders?id=' || o.listing_id,
      jsonb_build_object('order_ref', o.ref, 'order_status', 'accepted'));

  elsif p_action = 'switch_pickup' then
    -- diner declines delivery, switches to pickup (no fee)
    if o.mode <> 'delivery' then perform public.food_err('not_delivery'); end if;
    update public.food_orders set
      status               = 'accepted',
      accepted_at          = now(),
      payment_declined_at  = now(),
      mode                 = 'pickup',
      delivery_fee         = 0,
      total                = subtotal,   -- drop the delivery fee
      address              = null,       -- no longer needed for pickup
      lat                  = null,
      lng                  = null
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'switched_pickup', 'guest', 'Waived delivery, will collect');

    perform public.food_notify(o.kitchen_user,
      'Order changed to collection',
      o.diner_name || ' will collect — no delivery needed.',
      '/partner-orders?id=' || o.listing_id,
      jsonb_build_object('order_ref', o.ref, 'order_status', 'accepted'));
  else
    perform public.food_err('action_invalid');
  end if;

  return public.food_order_json(o, 'guest');
end $$;

/* ════════════════════════════════════════════════════════════════
   UPDATE  food_kitchen_update — accept awaiting_payment in ready/dispatch
   ════════════════════════════════════════════════════════════════ */
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
    if o.status not in ('accepted','awaiting_payment') then perform public.food_err('wrong_step', o.status); end if;
    v_mins := greatest(1, least(180, coalesce((p->>'mins')::int, 10)));
    update public.food_orders set
      eta_ready_at = greatest(coalesce(eta_ready_at, now()), now()) + make_interval(mins => v_mins),
      eta_mins = coalesce(eta_mins, 0) + v_mins
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'delayed', 'kitchen', v_mins || ' min more');

  elsif p_action = 'dispatch' then
    if o.mode <> 'delivery' then perform public.food_err('not_delivery'); end if;
    if o.status not in ('accepted', 'ready') then perform public.food_err('wrong_step', o.status); end if;
    if length(btrim(coalesce(p->>'rider_name', ''))) < 2 then perform public.food_err('rider_required'); end if;
    update public.food_orders set
      status        = 'on_the_way',
      dispatched_at = now(),
      ready_at      = coalesce(ready_at, now()),
      rider_name    = left(btrim(p->>'rider_name'), 60),
      rider_phone   = nullif(left(btrim(coalesce(p->>'rider_phone', '')), 30), ''),
      rider_token   = public.food_secret(),
      rider_code    = public.food_code()
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
    update public.food_orders set status = 'completed', completed_at = now()
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'completed', 'kitchen',
      case when o.mode = 'pickup' then 'Collected' else 'Handed over' end);

  elsif p_action = 'cancel' then
    if o.status not in ('awaiting_payment','accepted','ready','on_the_way') then
      perform public.food_err('wrong_step', o.status);
    end if;
    if length(btrim(coalesce(p->>'reason', ''))) < 3 then perform public.food_err('reason_required'); end if;
    update public.food_orders set
      status        = 'cancelled',
      cancelled_at  = now(),
      cancelled_by  = 'kitchen',
      cancel_reason = left(btrim(p->>'reason'), 300)
    where id = o.id returning * into o;
    perform public.food_log(o.id, 'cancelled', 'kitchen', o.cancel_reason);
  else
    perform public.food_err('action_invalid', p_action);
  end if;

  return public.food_order_json(o, 'kitchen');
end $$;

/* ── expose the new confirm function to anon/authenticated ───── */
grant execute on function public.food_order_confirm_payment(text, text, text) to anon, authenticated;

/* ── also expose via rpc alias so cabana-orders.js can call it ── */
-- cabana-orders.js uses Orders.rpc('food_order_confirm_payment', ...)
-- Nothing to add: grant above is enough.

/* ── include kitchen_delivery_fee and payment_confirmed_at in JSON ── */
create or replace function public.food_order_json(o public.food_orders, p_view text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l   public.listings%rowtype;
  p   public.restaurant_profiles%rowtype;
  v_out jsonb;
begin
  select * into l from public.listings where id = o.listing_id;
  select * into p from public.restaurant_profiles where listing_id = o.listing_id;

  v_out := jsonb_build_object(
    'id', o.id, 'ref', o.ref, 'basket', o.basket, 'status', o.status, 'mode', o.mode,
    'pay_method', o.pay_method, 'items', o.items, 'item_count', o.item_count,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'kitchen_delivery_fee', o.kitchen_delivery_fee,
    'total', o.total, 'currency', o.currency,
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
    'payment_confirmed_at', o.payment_confirmed_at,
    'rating', o.rating, 'review', o.review, 'now', now(),
    'kitchen', jsonb_build_object(
      'id', l.id, 'name', l.title, 'area', l.area, 'city', l.city,
      'photo', coalesce(p.hero_photo, l.photos[1]),
      'phone', coalesce(p.order_phone, l.contact_phone),
      'whatsapp', coalesce(p.order_whatsapp, l.contact_whatsapp),
      'lat', coalesce(l.latitude, l.lat), 'lng', coalesce(l.longitude, l.lng),
      'delivery_mins', p.delivery_mins, 'prep_mins', p.prep_mins,
      'mpesa_till', p.mpesa_till, 'mpesa_paybill', p.mpesa_paybill, 'mpesa_account', p.mpesa_account,
      'accepts_cash', coalesce(p.accepts_cash, true),
      'serves_pickup', coalesce(p.serves_pickup, true)
    ),
    'events', coalesce((select jsonb_agg(jsonb_build_object('kind', e.kind, 'actor', e.actor,
                          'note', e.note, 'at', e.created_at) order by e.id)
                        from public.food_order_events e where e.order_id = o.id), '[]'::jsonb)
  );

  if p_view = 'guest' then
    v_out := v_out || jsonb_build_object('handoff_code', o.handoff_code);
  elsif p_view = 'kitchen' then
    v_out := v_out || jsonb_build_object(
      'diner_phone', o.diner_phone,
      'rider_code', o.rider_code,
      'rider_token', o.rider_token,
      'code_attempts', o.code_attempts);
  elsif p_view = 'rider' then
    v_out := v_out || jsonb_build_object('diner_phone', o.diner_phone, 'rider_code', o.rider_code);
  end if;
  return v_out;
end $$;

/* ── also include awaiting_payment in the board's active orders ─ */
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
        and (o.status in ('requested','awaiting_payment','accepted','ready','on_the_way')
             or o.requested_at > now() - interval '36 hours')),
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
