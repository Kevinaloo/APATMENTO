-- ══════════════════════════════════════════════════════════════════════
-- CABANA · Stay inventory + authoritative settlement
--
-- THE PROBLEM THIS FIXES
-- ─────────────────────
-- Nothing in this system ever held a date. cabana_secure_apartment_booking
-- validated the listing, the dates, the guest count, the price and the
-- reference format, and never once asked whether another guest already had
-- those nights. Two people could each book and each pay in full for the
-- same room on the same days.
--
-- Three separate code paths each had their own idea of "occupied":
--
--   agent_listing_availability : confirmed, paid, paid_pending_checkin,
--                                pending_payment
--   cabana_rematch (trust)     : paid_pending_checkin, deposit_paid,
--                                checked_in
--   the insert trigger         : nothing at all
--
-- Neither list contained 'part_paid' or 'confirmed_balance_due' — the two
-- statuses the live payment engine actually emits. So a guest who paid the
-- full 25% deposit showed as FREE to every agent, while a guest who paid
-- ZERO blocked the calendar permanently, because no TTL was ever applied.
--
-- THE MODEL
-- ─────────
-- One inventory table. A hold exists if and only if a booking has reached
-- its deposit. Below that threshold, money buys credit toward the booking,
-- never the dates — and the guest is told so plainly.
--
--   paid = 0                  →  pending_payment        no hold
--   0 < paid < 25%            →  part_paid              no hold, dates open
--   25% <= paid < 100%        →  confirmed_balance_due  HOLD, no code
--   paid >= 100%              →  paid_pending_checkin   HOLD, code released
--   deposit cleared too late  →  dates_unavailable      money → credit
--
-- The last row is the honest consequence of letting people pay small
-- amounts: a guest sitting below the deposit can lose the dates to someone
-- who reaches it first. M-Pesa money cannot be refused mid-flight, so that
-- payment converts to non-expiring wallet credit automatically.
--
-- Idempotent. Additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1 · Exclusion constraints need btree_gist for the `listing_id =` half
create extension if not exists btree_gist;


-- ── 2 · THE INVENTORY TABLE ──────────────────────────────────────────
-- One live row per sold date range per listing. The exclusion constraint
-- is the whole point: Postgres itself refuses the second overlapping
-- claim, so two simultaneous M-Pesa callbacks for the same nights have
-- exactly one winner and it is decided at the storage layer, not in JS.

create table if not exists public.listing_holds (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid        not null,
  booking_ref    text        not null,
  booking_id     uuid,
  guest_id       uuid,
  stay           daterange   not null,
  claimed_at     timestamptz not null default now(),
  released_at    timestamptz,
  release_reason text
);

-- A booking owns at most one live hold.
create unique index if not exists listing_holds_one_live_per_booking
  on public.listing_holds (booking_ref)
  where released_at is null;

-- The guarantee. Partial, so released holds stop occupying the calendar.
alter table public.listing_holds
  drop constraint if exists listing_holds_no_overlap;
alter table public.listing_holds
  add constraint listing_holds_no_overlap
  exclude using gist (listing_id with =, stay with &&)
  where (released_at is null);

create index if not exists listing_holds_listing_live
  on public.listing_holds (listing_id) where released_at is null;

alter table public.listing_holds enable row level security;

-- Guests may see their own holds. Everything else goes through the
-- security-definer functions below.
drop policy if exists lh_select_own on public.listing_holds;
create policy lh_select_own on public.listing_holds
  for select to authenticated
  using (guest_id = auth.uid() or public.is_operator());

drop policy if exists lh_no_write on public.listing_holds;
create policy lh_no_write on public.listing_holds
  for insert to authenticated with check (false);


-- ── 3 · SETTLEMENT · the single writer of booking money state ────────
-- Called by the payment poller and the PayHero callback with the service
-- key. Locks the row, re-sums the ledger, claims or loses the dates, and
-- returns the booking's position — never the instalment's.
--
-- Service role only. Under an authenticated JWT the UPDATE branch of
-- cabana_secure_apartment_booking would revert every field written here.

create or replace function public.cabana_settle_booking(p_booking_ref text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  b           public.apartment_bookings%rowtype;
  v_paid      numeric := 0;
  v_total     numeric := 0;
  v_deposit   numeric := 0;
  v_status    text;
  v_hold_id   uuid;
  v_lost      boolean := false;
  v_credited  numeric := 0;
  v_did       integer := 0;
begin
  select * into b
    from public.apartment_bookings
   where payment_reference = p_booking_ref
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_booking');
  end if;

  -- The ledger is the only honest answer to "how much arrived".
  select coalesce(sum(amount), 0) into v_paid
    from public.booking_payments
   where booking_ref = p_booking_ref
     and status = 'paid';

  v_total   := coalesce(b.grand_total, 0);
  v_deposit := round(v_total * 0.25);

  select id into v_hold_id
    from public.listing_holds
   where booking_ref = p_booking_ref
     and released_at is null;

  -- Reaching the deposit is the claim event, and the only one.
  if v_total > 0
     and v_paid >= v_deposit
     and v_hold_id is null
     and b.cancelled_at is null
     and b.listing_id is not null
     and b.checkin_date is not null
     and b.checkout_date > b.checkin_date
  then
    begin
      insert into public.listing_holds
             (listing_id, booking_ref, booking_id, guest_id, stay)
      values (b.listing_id, p_booking_ref, b.id, b.guest_id,
              daterange(b.checkin_date, b.checkout_date, '[)'))
      returning id into v_hold_id;
    exception
      when exclusion_violation then
        -- Someone else reached their deposit on these nights first.
        v_lost := true;
    end;
  end if;

  -- Status is derived, never assigned from outside.
  if v_lost then                              v_status := 'dates_unavailable';
  elsif v_total <= 0 or v_paid <= 0 then      v_status := 'pending_payment';
  elsif v_paid >= v_total then                v_status := 'paid_pending_checkin';
  elsif v_paid >= v_deposit then              v_status := 'confirmed_balance_due';
  else                                        v_status := 'part_paid';
  end if;

  -- Money that arrived for dates we can no longer give becomes credit.
  -- Never expires. The unique index on (booking_ref, type='earn') makes
  -- this idempotent, and user_points is only moved if a row was really
  -- written, so a retry cannot double-credit.
  if v_lost and v_paid > 0 and b.guest_id is not null then
    with ins as (
      insert into public.point_transactions
             (user_id, type, points, amount_kes, service_type,
              booking_ref, description)
      values (b.guest_id, 'earn', round(v_paid)::int, v_paid, 'stays',
              p_booking_ref,
              'These dates were taken before your deposit cleared. '
              || 'Your payment is now credit and does not expire.')
      on conflict do nothing
      returning 1
    )
    select count(*) into v_did from ins;

    if v_did > 0 then
      v_credited := v_paid;
      update public.user_points
         set available_points = available_points + round(v_paid)::int,
             lifetime_points  = lifetime_points  + round(v_paid)::int,
             updated_at       = now()
       where user_id = b.guest_id;
      if not found then
        insert into public.user_points
               (user_id, available_points, lifetime_points)
        values (b.guest_id, round(v_paid)::int, round(v_paid)::int);
      end if;
    end if;
  end if;

  update public.apartment_bookings
     set amount_paid      = v_paid,
         deposit_required = v_deposit,
         balance_amount   = greatest(0, round(v_total - v_paid)),
         balance_paid     = (v_total > 0 and v_paid >= v_total and not v_lost),
         status           = v_status,
         fully_paid_at    = case
                              when v_total > 0 and v_paid >= v_total and not v_lost
                              then coalesce(fully_paid_at, now())
                              else fully_paid_at end,
         refund_reason    = case
                              when v_lost then 'dates_taken_converted_to_credit'
                              else refund_reason end
   where id = b.id;

  return jsonb_build_object(
    'ok',                   true,
    'status',               v_status,
    'amount_paid',          v_paid,
    'grand_total',          v_total,
    'outstanding',          greatest(0, round(v_total - v_paid)),
    'deposit_required',     v_deposit,
    'shortfall_to_confirm', greatest(0, v_deposit - v_paid),
    'percent_paid',         case when v_total > 0
                                 then least(100, round(v_paid / v_total * 100))
                                 else 0 end,
    'confirmed',            (v_total > 0 and v_paid >= v_deposit and not v_lost),
    'fully_paid',           (v_total > 0 and v_paid >= v_total  and not v_lost),
    'holds_dates',          (v_hold_id is not null and not v_lost),
    'dates_lost',           v_lost,
    'credited',             v_credited
  );
end;
$$;


-- ── 4 · RELEASING ────────────────────────────────────────────────────
-- A hold outlives its usefulness the moment the stay ends or the booking
-- is cancelled. Called nightly by the sweeper.

create or replace function public.cabana_release_expired_holds()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  with done as (
    update public.listing_holds h
       set released_at    = now(),
           release_reason = case
             when b.cancelled_at is not null then 'booking_cancelled'
             else 'stay_ended' end
      from public.apartment_bookings b
     where b.payment_reference = h.booking_ref
       and h.released_at is null
       and (b.cancelled_at is not null
            or upper(h.stay) <= (now() at time zone 'Africa/Nairobi')::date)
    returning 1
  )
  select count(*) into v_n from done;
  return v_n;
end;
$$;

-- Cancellation frees the dates immediately, not on the next sweep.
create or replace function public.cabana_release_hold_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.cancelled_at is not null and old.cancelled_at is null then
    update public.listing_holds
       set released_at = now(), release_reason = 'booking_cancelled'
     where booking_ref = new.payment_reference
       and released_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists cabana_release_hold_on_cancel_trigger
  on public.apartment_bookings;
create trigger cabana_release_hold_on_cancel_trigger
  after update of cancelled_at on public.apartment_bookings
  for each row execute function public.cabana_release_hold_on_cancel();


-- ── 5 · AVAILABILITY · one definition, used by everyone ──────────────
-- Replaces three contradictory status lists. A date is taken when a live
-- hold covers it. Nothing else counts, so an unpaid booking can no longer
-- block a calendar and a paid deposit can no longer be invisible.

create or replace function public.cabana_dates_available(
  p_listing_id uuid,
  p_checkin    date,
  p_checkout   date,
  p_exclude_ref text default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select not exists (
    select 1 from public.listing_holds h
     where h.listing_id  = p_listing_id
       and h.released_at is null
       and h.stay && daterange(p_checkin, p_checkout, '[)')
       and (p_exclude_ref is null or h.booking_ref <> p_exclude_ref)
  );
$$;

create or replace function public.cabana_listing_calendar(
  p_listing_id uuid,
  p_from       date default current_date,
  p_to         date default (current_date + interval '180 days')::date
)
returns table (checkin date, checkout date)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select lower(h.stay), upper(h.stay)
    from public.listing_holds h
   where h.listing_id = p_listing_id
     and h.released_at is null
     and h.stay && daterange(p_from, p_to, '[)')
   order by lower(h.stay);
$$;

-- The agent calendar now reads the same inventory as everything else.
create or replace function public.agent_listing_availability(
  p_listing_id text,
  p_from       date default current_date,
  p_to         date default (current_date + interval '120 days')::date
)
returns table (checkin date, checkout date, status text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select lower(h.stay), upper(h.stay), 'booked'::text
    from public.listing_holds h
   where h.listing_id::text = p_listing_id
     and h.released_at is null
     and h.stay && daterange(p_from, p_to, '[)')
     and exists (
       select 1 from public.agent_partnerships p
        where p.agent_id   = auth.uid()
          and p.listing_id = p_listing_id
          and p.status in ('approved','paused')
     )
   order by lower(h.stay);
$$;


-- ── 6 · Lock the doors ───────────────────────────────────────────────
revoke all on function public.cabana_settle_booking(text)          from public, anon, authenticated;
revoke all on function public.cabana_release_expired_holds()       from public, anon, authenticated;
revoke all on function public.cabana_release_hold_on_cancel()      from public, anon, authenticated;
revoke all on function public.agent_listing_availability(text,date,date) from public, anon;
grant  execute on function public.agent_listing_availability(text,date,date) to authenticated, service_role;
grant  execute on function public.cabana_dates_available(uuid,date,date,text) to authenticated, service_role;
grant  execute on function public.cabana_listing_calendar(uuid,date,date)     to anon, authenticated, service_role;


-- ── 7 · Backfill ─────────────────────────────────────────────────────
-- Any live booking already at or above its deposit deserves the hold it
-- was always promised. Earliest claim wins; the constraint sorts out the
-- rest silently.
do $$
declare r record;
begin
  for r in
    select b.payment_reference, b.listing_id, b.id, b.guest_id,
           b.checkin_date, b.checkout_date
      from public.apartment_bookings b
     where b.cancelled_at is null
       and b.listing_id is not null
       and b.checkin_date is not null
       and b.checkout_date > b.checkin_date
       and b.checkout_date >= (now() at time zone 'Africa/Nairobi')::date
       and coalesce(b.grand_total,0) > 0
       and coalesce(b.amount_paid,0) >= round(coalesce(b.grand_total,0) * 0.25)
     order by b.created_at
  loop
    begin
      insert into public.listing_holds
             (listing_id, booking_ref, booking_id, guest_id, stay)
      values (r.listing_id, r.payment_reference, r.id, r.guest_id,
              daterange(r.checkin_date, r.checkout_date, '[)'));
    exception when exclusion_violation or unique_violation then
      null;
    end;
  end loop;
end $$;
