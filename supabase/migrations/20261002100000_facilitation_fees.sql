-- ═══════════════════════════════════════════════════════════════════════
-- CABANA · FACILITATION FEES, ONE INTERNAL SCHEDULE
-- ───────────────────────────────────────────────────────────────────────
-- What changes, and why:
--
--   1. One schedule, kept inside the database. The fee ladder used to be
--      typed into SQL in five places, mirrored into a public JS file and
--      printed on help, terms and rewards pages. The amounts are now rows
--      in cabana_private.fee_bands (never exposed to the API) and every
--      quote, trigger and offer reads cabana_private.facilitation_fee().
--      The browser learns only the fee on the booking in front of it.
--
--   2. Cabana Match carries no 5% referral any more. A Match booking is a
--      stays booking and pays the standard stays facilitation fee, the
--      same as any other stay. referral_fee_pct is retired at zero.
--
--   3. Who pays what (the amounts live in the table, not here):
--        stays, hotels, day passes, tours, events, car hire  facilitation fee
--        food, shopping                                      nothing, for now
--        roommates                                           monthly access pass
--        flights                                             set per request by the desk
--        rides                                               nothing to the rider;
--                                                            the driver remits a share
--
--   4. Tours and events now actually hold the seats they sell. The three
--      payment paths (poll, Vercel callback, edge callback) only wrote a
--      generic status, so cabana_settle_tour / cabana_settle_event never
--      ran and paid seats were never taken off sale. A trigger on the
--      ledger row now settles them the moment money lands, a guard stops
--      the generic writers from un-doing a 'seats_unavailable' verdict,
--      and the payment-deadline sweeper finally has a schedule.
--
--   5. Event tickets are paid in full. Partial payment on a ticket meant
--      a door list holding people who had paid a quarter.
--
--   6. Car hire: the guest still pays the operator for the car; Cabana's
--      facilitation is paid online to secure the hire, and the handover
--      code and the operator's contact are released only once it clears.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · the schedule ──────────────────────────────────────────────────
create table if not exists cabana_private.fee_bands (
  service    text    not null,
  sort       smallint not null default 0,
  under      numeric,                       -- null = no ceiling
  fee        numeric not null check (fee >= 0),
  note       text,
  updated_at timestamptz not null default now(),
  primary key (service, sort)
);
revoke all on cabana_private.fee_bands from public, anon, authenticated;

insert into cabana_private.fee_bands (service, sort, under, fee, note) values
  ('stays',   1, 5000, 300, 'Stays, hotels and day passes'),
  ('stays',   2, null, 800, null),
  ('tours',   1, 5000, 300, 'Facilitation on the full tour value'),
  ('tours',   2, null, 800, null),
  ('events',  1, 5000, 300, 'Facilitation on the ticket order'),
  ('events',  2, null, 800, null),
  ('carhire', 1, 5000, 300, 'Facilitation on the hire value, KES operators'),
  ('carhire', 2, null, 800, null),
  ('food',     1, null, 0, 'Not charged for now'),
  ('shopping', 1, null, 0, 'Not charged for now'),
  ('rides',    1, null, 0, 'Riders pay nothing; drivers remit a share'),
  ('flights',  1, null, 0, 'Set per request by the flight desk'),
  ('roommates',1, null, 0, 'Access is a monthly pass, not a booking fee')
on conflict (service, sort) do nothing;

create or replace function cabana_private.facilitation_fee(p_service text, p_subtotal numeric)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, cabana_private
as $$
  select case
    when p_subtotal is null or p_subtotal <= 0 then 0::numeric
    else coalesce((
      select b.fee from cabana_private.fee_bands b
       where b.service = lower(coalesce(p_service, ''))
         and (b.under is null or p_subtotal < b.under)
       order by b.sort
       limit 1), 0::numeric)
  end
$$;
revoke all on function cabana_private.facilitation_fee(text, numeric) from public, anon, authenticated;

-- The one thing a browser may ask: what is the fee on THIS amount. It
-- answers with a number and nothing else; there is no schedule to read.
create or replace function public.cabana_fee_quote(p_service text, p_subtotal numeric)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select cabana_private.facilitation_fee(
    case lower(coalesce(p_service, ''))
      when 'hotel' then 'stays' when 'day_pass' then 'stays' when 'daypass' then 'stays'
      else lower(coalesce(p_service, '')) end,
    least(greatest(coalesce(p_subtotal, 0), 0), 100000000))
$$;
revoke all on function public.cabana_fee_quote(text, numeric) from public;
grant execute on function public.cabana_fee_quote(text, numeric) to anon, authenticated;

-- ── 2 · every hand-typed ladder now reads the schedule ────────────────
do $$
declare
  r record; d text; p text; n integer := 0;
  swaps text[][] := array[
    array['case when best<5000 then 300 else 800 end',
          'cabana_private.facilitation_fee(''stays'',best)'],
    array['case when (chosen->>''reference_total'')::numeric<5000 then 300 else 800 end',
          'cabana_private.facilitation_fee(''stays'',(chosen->>''reference_total'')::numeric)'],
    array['case when coalesce(x.stay_total, 0) < 5000 then 300 else 800 end',
          'cabana_private.facilitation_fee(''stays'', coalesce(x.stay_total, 0))'],
    array['case when total < 5000 then 300 else 800 end',
          'cabana_private.facilitation_fee(''stays'', total)']
  ];
  i integer;
begin
  for r in
    select p2.oid from pg_proc p2 join pg_namespace n2 on n2.oid = p2.pronamespace
     where n2.nspname in ('public', 'cabana_private')
       and p2.proname in ('stay_quote', 'cabana_match_state', 'cabana_match_respond', 'cabana_chat_send_offer')
  loop
    d := pg_get_functiondef(r.oid);
    p := d;
    for i in 1 .. array_length(swaps, 1) loop
      p := replace(p, swaps[i][1], swaps[i][2]);
    end loop;
    if p <> d then execute p; n := n + 1; end if;
  end loop;
  raise notice 'facilitation fee: % function(s) now read the schedule', n;
end $$;

-- ── 3 · Cabana Match: no 5% ───────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'cabana_match_requests'
                and column_name = 'referral_fee_pct') then
    alter table public.cabana_match_requests alter column referral_fee_pct set default 0;
    update public.cabana_match_requests set referral_fee_pct = 0 where referral_fee_pct is distinct from 0;
    comment on column public.cabana_match_requests.referral_fee_pct is
      'Retired 2026-10-02. Cabana Match takes no referral percentage: a Match booking is a stays booking and pays the standard stays facilitation fee only.';
  end if;
end $$;

-- ── 4 · tours: facilitation on top of the online share ────────────────
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cabana_secure_tour_booking()'::regprocedure);
  if position('facilitation_fee' in d) > 0 then return; end if;
  p := replace(d,
    'new.tour_total := v_total; new.service_fee := 0;' || chr(10) || '  new.grand_total := v_due;',
    'new.tour_total := v_total;' || chr(10) ||
    '  new.service_fee := case when v_due > 0 then cabana_private.facilitation_fee(''tours'', v_total) else 0 end;' || chr(10) ||
    '  new.grand_total := v_due + new.service_fee;');
  if p = d then raise exception 'cabana_secure_tour_booking changed shape; patch the fee by hand'; end if;
  execute p;
end $$;

-- ── 5 · events: facilitation, and tickets are paid in full ────────────
alter table public.event_tickets add column if not exists payment_mode text not null default 'full';
do $$ begin
  alter table public.event_tickets add constraint event_tickets_payment_mode_full check (payment_mode = 'full');
exception when duplicate_object then null; end $$;

do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cabana_secure_event_booking()'::regprocedure);
  if position('facilitation_fee' in d) > 0 then return; end if;
  p := replace(d,
    'new.ticket_total := v_price * new.quantity; new.service_fee := 0;' || chr(10) || '  new.grand_total := new.ticket_total;',
    'new.ticket_total := v_price * new.quantity;' || chr(10) ||
    '  new.service_fee := cabana_private.facilitation_fee(''events'', new.ticket_total);' || chr(10) ||
    '  new.grand_total := new.ticket_total + new.service_fee; new.payment_mode := ''full'';');
  if p = d then raise exception 'cabana_secure_event_booking changed shape; patch the fee by hand'; end if;
  execute p;
end $$;

-- ── 6 · tours and events hold the seats they sell ─────────────────────
create or replace function cabana_private.booking_payment_settle_experience()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    if new.booking_table = 'tour_bookings' then
      perform public.cabana_settle_tour(new.booking_ref);
    elsif new.booking_table = 'event_tickets' then
      perform public.cabana_settle_event(new.booking_ref);
    end if;
  end if;
  return new;
exception when others then
  raise warning 'booking_payment_settle_experience: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.booking_payment_settle_experience() from public, anon, authenticated;
create or replace trigger booking_payment_settle_experience
  after insert or update of status on public.booking_payments
  for each row execute function cabana_private.booking_payment_settle_experience();

-- The generic writers (poll, callbacks) derive a status from money alone.
-- Once the database has decided the seats are gone, or the deadline has
-- passed, money arriving late must not paint the booking 'confirmed'.
create or replace function cabana_private.experience_status_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status
     and old.status in ('seats_unavailable', 'payment_expired', 'cancelled', 'checked_in', 'completed', 'refunded')
     and new.status in ('pending_payment', 'part_paid', 'confirmed_balance_due', 'paid_pending_checkin', 'paid', 'confirmed')
     and not coalesce(public.is_operator(), false) then
    new.status := old.status;
  end if;
  return new;
end $$;
revoke all on function cabana_private.experience_status_guard() from public, anon, authenticated;
create or replace trigger cabana_aa_experience_status_guard before update of status on public.tour_bookings
  for each row execute function cabana_private.experience_status_guard();
create or replace trigger cabana_aa_experience_status_guard before update of status on public.event_tickets
  for each row execute function cabana_private.experience_status_guard();

select cron.schedule('cabana-experience-deadlines', '*/10 * * * *',
  $$select public.cabana_enforce_payment_deadlines()$$);

-- ── 7 · car hire: facilitation secures the hire ───────────────────────
alter table public.car_bookings
  add column if not exists service_fee       numeric not null default 0,
  add column if not exists grand_total       numeric not null default 0,
  add column if not exists amount_paid       numeric not null default 0,
  add column if not exists payment_mode      text    not null default 'full',
  add column if not exists payment_reference text,
  add column if not exists fee_due_at        timestamptz,
  add column if not exists fee_paid_at       timestamptz;
create unique index if not exists car_bookings_payment_reference_uidx
  on public.car_bookings (payment_reference) where payment_reference is not null;

create or replace function cabana_private.car_booking_fee()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_kes numeric;
begin
  if tg_op = 'UPDATE' then
    -- Money fields move only through the ledger.
    if current_user in ('authenticated', 'anon') and not coalesce(public.is_admin(), false) then
      new.service_fee := old.service_fee; new.grand_total := old.grand_total;
      new.amount_paid := old.amount_paid; new.payment_reference := old.payment_reference;
      new.fee_paid_at := old.fee_paid_at; new.payment_mode := old.payment_mode;
    end if;
    if new.status = 'confirmed' and old.status is distinct from 'confirmed'
       and new.service_fee > 0 and new.fee_paid_at is null then
      new.fee_due_at := least(now() + interval '24 hours',
                              greatest(now() + interval '30 minutes', new.pickup_at - interval '1 hour'));
    end if;
    return new;
  end if;

  v_kes := case when upper(coalesce(new.currency, 'KES')) = 'KES'
                then coalesce(new.total_minor, new.total::bigint * 100, 0) / 100.0 else 0 end;
  new.service_fee := cabana_private.facilitation_fee('carhire', v_kes);
  new.grand_total := new.service_fee;
  new.amount_paid := 0;
  new.payment_mode := 'full';
  new.fee_paid_at := null;
  new.payment_reference := case when new.service_fee > 0 then 'CARFEE-' || coalesce(new.ref, gen_random_uuid()::text) end;
  new.fee_due_at := case when new.service_fee > 0 and new.status = 'confirmed'
                         then least(now() + interval '24 hours',
                                    greatest(now() + interval '30 minutes', new.pickup_at - interval '1 hour')) end;
  return new;
end $$;
revoke all on function cabana_private.car_booking_fee() from public, anon, authenticated;
create or replace trigger cabana_car_booking_fee before insert or update on public.car_bookings
  for each row execute function cabana_private.car_booking_fee();

create or replace function cabana_private.settle_car_fee(p_ref text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare b public.car_bookings%rowtype; v_paid numeric;
begin
  select * into b from public.car_bookings where payment_reference = p_ref for update;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into v_paid from public.booking_payments
   where booking_ref = p_ref and status = 'paid';
  update public.car_bookings
     set amount_paid = v_paid,
         fee_paid_at = case when v_paid >= grand_total and grand_total > 0 then coalesce(fee_paid_at, now()) else fee_paid_at end
   where id = b.id;
  if v_paid >= b.grand_total and b.grand_total > 0 and b.fee_paid_at is null then
    perform public.car_log(b.id, 'facilitation_paid', 'guest', null);
    if b.user_id is not null then
      insert into public.notifications (user_id, title, body, url, kind, meta)
      values (b.user_id, 'Your car is secured',
              'Payment received. Your handover code and the operator''s details are now in your booking.',
              '/carhire?booking=' || b.ref, 'booking', jsonb_build_object('car_ref', b.ref));
    end if;
    -- Paid after the car was let go: put it back if it is still free.
    if b.status in ('expired', 'cancelled') and b.cancel_reason = 'reservation_fee_unpaid' then
      if b.pickup_at > now() and public.car_vehicle_available(b.vehicle_id, b.pickup_at, b.return_at, b.id) then
        update public.car_bookings set status = 'confirmed', cancelled_at = null, cancelled_by = null, cancel_reason = null
         where id = b.id;
      else
        insert into public.ops_alerts (kind, severity, title, body, meta)
        values ('payments', 'warn', 'Car hire paid after release',
                'A guest paid the facilitation on a hire that had already been released and the car is no longer free. Refund or rebook.',
                jsonb_build_object('car_ref', b.ref, 'payment_reference', p_ref));
      end if;
    end if;
  end if;
end $$;
revoke all on function cabana_private.settle_car_fee(text) from public, anon, authenticated;

create or replace function cabana_private.booking_payment_settle_car()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.booking_table = 'car_bookings' and new.status = 'paid'
     and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform cabana_private.settle_car_fee(new.booking_ref);
  end if;
  return new;
exception when others then
  raise warning 'booking_payment_settle_car: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.booking_payment_settle_car() from public, anon, authenticated;
create or replace trigger booking_payment_settle_car after insert or update of status on public.booking_payments
  for each row execute function cabana_private.booking_payment_settle_car();

-- A guest who booked signed out claims the hire to pay for it.
create or replace function public.car_booking_claim(p_ref text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b public.car_bookings%rowtype;
begin
  if auth.uid() is null then perform public.car_err('sign_in_required'); end if;
  b := public.car_guest_booking(p_ref, p_token);
  if b.user_id is not null and b.user_id <> auth.uid() then perform public.car_err('booking_not_found'); end if;
  update public.car_bookings set user_id = auth.uid() where id = b.id and user_id is null;
  select * into b from public.car_bookings where id = b.id;
  return public.car_booking_json(b, 'guest');
end $$;
revoke all on function public.car_booking_claim(text, text) from public, anon;
grant execute on function public.car_booking_claim(text, text) to authenticated;

-- Quote: the operator's lines stay the operator's; facilitation travels
-- beside them, never inside the operator total.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.car_price(public.car_fleet, public.car_operators, timestamptz, timestamptz, jsonb)'::regprocedure);
  if position('facilitation_fee' in d) > 0 then return; end if;
  p := replace(d,
    $x$  v_lines := v_lines || jsonb_build_object('key', 'commission', 'label', 'Cabana fee',
    'detail', 'The operator keeps every shilling', 'amount', 0, 'good', true);
$x$, '');
  p := replace(p, $x$'lines', v_lines, 'extras_selected'$x$,
    $x$'facilitation', case when upper(coalesce(o.currency_code, 'KES')) = 'KES'
      then round(cabana_private.facilitation_fee('carhire', (v_base - v_disc + v_chauf + v_deliv + v_extras) / 100.0) * 100)
      else 0 end,
    'lines', v_lines, 'extras_selected'$x$);
  if p = d then raise exception 'car_price changed shape; patch facilitation by hand'; end if;
  execute p;
end $$;

-- What the guest may see before the hire is secured.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.car_booking_json(public.car_bookings, text)'::regprocedure);
  if position('facilitation' in d) > 0 then return; end if;
  p := replace(d,
    $x$v_live boolean := b.status in ('confirmed','active','completed');$x$,
    $x$v_live boolean := b.status in ('confirmed','active','completed')
                     and (coalesce(b.service_fee, 0) <= 0 or b.fee_paid_at is not null);$x$);
  p := replace(p,
    $x$v_out := v_out || jsonb_build_object('handover_code', b.handover_code, 'customer_name'$x$,
    $x$v_out := v_out || jsonb_build_object('handover_code',
      case when coalesce(b.service_fee, 0) <= 0 or b.fee_paid_at is not null then b.handover_code end, 'customer_name'$x$);
  p := replace(p,
    $x$  return v_out;
end$x$,
    $x$  v_out := v_out || jsonb_build_object('facilitation', jsonb_strip_nulls(jsonb_build_object(
    'due', coalesce(b.service_fee, 0) > 0 and b.fee_paid_at is null,
    'paid', b.fee_paid_at is not null,
    'amount', case when p_view = 'guest' then coalesce(b.service_fee, 0) end,
    'currency', case when p_view = 'guest' then 'KES' end,
    'reference', case when p_view = 'guest' then b.payment_reference end,
    'due_at', b.fee_due_at)));
  return v_out;
end$x$);
  if p = d then raise exception 'car_booking_json changed shape; patch facilitation by hand'; end if;
  execute p;
end $$;

-- Keys only change hands on a secured hire.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.car_operator_booking_update(uuid, text, jsonb)'::regprocedure);
  if position('reservation_unpaid' in d) > 0 then return; end if;
  p := replace(d,
    $x$if b.code_attempts >= 8 then perform public.car_err('code_locked'); end if;$x$,
    $x$if coalesce(b.service_fee, 0) > 0 and b.fee_paid_at is null then perform public.car_err('reservation_unpaid'); end if;
    if b.code_attempts >= 8 then perform public.car_err('code_locked'); end if;$x$);
  if p = d then raise exception 'car_operator_booking_update changed shape; patch by hand'; end if;
  execute p;
end $$;

-- An unsecured hire lets the car go when its window closes.
create or replace function public.car_fee_tick()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in select id, user_id, ref from public.car_bookings
            where status = 'confirmed' and service_fee > 0 and fee_paid_at is null
              and fee_due_at is not null and fee_due_at < now()
            for update skip locked
  loop
    update public.car_bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'system',
           cancel_reason = 'reservation_fee_unpaid' where id = r.id;
    perform public.car_log(r.id, 'cancelled', 'system', 'reservation_fee_unpaid');
    if r.user_id is not null then
      insert into public.notifications (user_id, title, body, url, kind, meta)
      values (r.user_id, 'Your car was released',
              'The hire was not secured in time, so the car went back on sale. Nothing was charged.',
              '/carhire?booking=' || r.ref, 'booking', jsonb_build_object('car_ref', r.ref));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.car_fee_tick() from public, anon, authenticated;
select cron.schedule('cabana-car-fee-tick', '*/5 * * * *', $$select public.car_fee_tick()$$);
