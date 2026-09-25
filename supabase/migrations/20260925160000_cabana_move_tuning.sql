/* Cabana Move · small follow-ups found while testing the drive and ride
   marketplaces end to end.

   1. A car handed back early is free again: the hire's own blackout goes
      when it completes, not only when it is cancelled. The search index
      (cars_available_nearby) reads blackouts, so a completed hire must not
      keep blocking the days after the keys came back.
   2. Covering indexes for the new foreign keys, and one duplicate index
      on ride_offers dropped. */

create or replace function public.car_booking_blackout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vehicle_id is null then return new; end if;
  if new.status in ('confirmed','active') then
    insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason, booking_id)
    values (new.vehicle_id, new.starts_on, greatest(new.ends_on, new.starts_on), 'booked', new.id)
    on conflict (vehicle_id, starts_on, ends_on, reason) do update set booking_id = excluded.booking_id;
  elsif new.status in ('completed','cancelled','declined','expired','no_show') then
    delete from public.car_blackouts where booking_id = new.id;
  end if;
  return new;
end $$;
revoke all on function public.car_booking_blackout() from public, anon, authenticated;

create index if not exists car_request_offers_operator_idx on public.car_request_offers (operator_id) where operator_id is not null;
create index if not exists car_request_offers_vehicle_idx on public.car_request_offers (vehicle_id) where vehicle_id is not null;
create index if not exists car_requests_user_idx on public.car_requests (user_id, created_at desc) where user_id is not null;
create index if not exists ride_fare_guides_mode_key_idx on public.ride_fare_guides (mode_key);
drop index if exists public.ride_offers_request_status_idx;
