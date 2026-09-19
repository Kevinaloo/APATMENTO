-- ══════════════════════════════════════════════════════════════════════
-- CABANA · Make the stay calendar actually hold dates
--
-- 20260819090000 built listing_holds (with an exclusion constraint) and
-- cabana_settle_booking() to claim a hold when a deposit clears. Nothing
-- ever called it: no API path, no trigger. listing_holds has never held
-- a row, so cabana_dates_available() only ever saw iCal blocks, and no
-- booking insert asked it anyway. Two guests could pay deposits for the
-- same nights at the same place.
--
--   1. A new booking is refused if its nights are already held or
--      blocked by an imported calendar.
--   2. When the ledger crosses the deposit, the hold is claimed by the
--      existing settlement function. The loser of a same-night race is
--      converted to non-expiring credit there, as designed.
--
-- Idempotent.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.cabana_booking_dates_must_be_free()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.listing_id is not null and new.checkin_date is not null
     and new.checkout_date is not null
     and not public.cabana_dates_available(new.listing_id, new.checkin_date,
                                           new.checkout_date, new.payment_reference) then
    raise exception 'Those dates were just booked. Please choose different dates.'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;
revoke all on function public.cabana_booking_dates_must_be_free() from public, anon, authenticated;

-- Runs after cabana_secure_apartment_booking_trigger (alphabetical), so
-- listing_id and the dates are the trusted, normalised values.
drop trigger if exists cabana_zz_booking_dates_must_be_free on public.apartment_bookings;
create trigger cabana_zz_booking_dates_must_be_free
  before insert on public.apartment_bookings
  for each row execute function public.cabana_booking_dates_must_be_free();


create or replace function public.cabana_claim_hold_on_deposit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_ledger numeric;
begin
  -- The settlement below updates this same row; do not re-enter.
  if pg_trigger_depth() > 1 then return null; end if;
  if new.cancelled_at is not null or coalesce(new.grand_total, 0) <= 0
     or new.status in ('dates_unavailable', 'rehomed', 'checked_in', 'completed') then
    return null;
  end if;
  if exists (select 1 from public.listing_holds
              where booking_ref = new.payment_reference and released_at is null) then
    return null;
  end if;
  -- Settlement trusts only the ledger. Never let it run on a payment the
  -- ledger has not seen, or it would read that booking back as unpaid.
  select coalesce(sum(amount), 0) into v_ledger
    from public.booking_payments
   where booking_ref = new.payment_reference and status = 'paid';
  if v_ledger >= round(new.grand_total * 0.25) then
    perform public.cabana_settle_booking(new.payment_reference);
  end if;
  return null;
end;
$$;
revoke all on function public.cabana_claim_hold_on_deposit() from public, anon, authenticated;

drop trigger if exists cabana_claim_hold_on_deposit_t on public.apartment_bookings;
create trigger cabana_claim_hold_on_deposit_t
  after update of amount_paid on public.apartment_bookings
  for each row execute function public.cabana_claim_hold_on_deposit();

-- Any live booking already past its deposit gets its hold now.
do $$
declare r record;
begin
  for r in
    select b.payment_reference
      from public.apartment_bookings b
     where b.cancelled_at is null
       and b.status in ('confirmed_balance_due', 'paid_pending_checkin', 'deposit_paid')
       and b.checkout_date > (now() at time zone 'Africa/Nairobi')::date
       and not exists (select 1 from public.listing_holds h
                        where h.booking_ref = b.payment_reference and h.released_at is null)
       and (select coalesce(sum(p.amount), 0) from public.booking_payments p
             where p.booking_ref = b.payment_reference and p.status = 'paid')
           >= round(b.grand_total * 0.25)
  loop
    perform public.cabana_settle_booking(r.payment_reference);
  end loop;
end $$;
