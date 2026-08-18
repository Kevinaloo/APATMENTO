-- Rooms and stays are different products with different price units, and
-- must never be readable as each other. `service` is the boundary between
-- them, but admin-created rows were never given one, so a room satisfied
-- the stays fallback and appeared on both boards at a nightly rate it
-- never had. This fills the tag, keeps it filled, and indexes the columns
-- the boards actually filter on.
--
-- Applied to project gfwgbgdvxtocwhilrtdw on 2026-08-18.

create or replace function public.listings_derive_service()
returns trigger
language plpgsql
as $$
declare
  t text := lower(coalesce(new.type, ''));
begin
  if new.service is null or btrim(new.service) = '' then
    new.service := case
      when t = 'room'                                  then 'roommates'
      when t in ('apartment','house','villa','studio','cottage','bungalow',
                 'hotel','guesthouse','maisonette','penthouse','bnb',
                 'lodge','hostel','serviced unit','beach house','airbnb unit')
                                                       then 'stays'
      when t in ('tour','tours')                       then 'tours'
      when t in ('event','events')                     then 'events'
      when t = 'food'                                  then 'food'
      when t = 'carhire'                               then 'carhire'
      when t in ('ride','rides')                       then 'rides'
      when t = 'shopping'                              then 'shopping'
      else new.service
    end;
  end if;

  -- A roommates row is always type 'room', whichever surface wrote it.
  if lower(coalesce(new.service,'')) = 'roommates' then
    new.type := 'room';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listings_derive_service on public.listings;
create trigger trg_listings_derive_service
  before insert or update on public.listings
  for each row execute function public.listings_derive_service();

-- Backfill anything already stored without a service tag.
update public.listings set service = service where service is null or btrim(service) = '';

create index if not exists idx_listings_service_active
  on public.listings (service, is_active);

create index if not exists idx_listings_rooms_live
  on public.listings (created_at desc)
  where service = 'roommates' and is_active = true;

create index if not exists idx_listings_partner
  on public.listings (partner_id);
