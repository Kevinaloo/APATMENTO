-- Complete the Rides cutover with covering indexes and keep driver discovery internal.

create index if not exists ride_market_modes_mode_key_idx
  on public.ride_market_modes (mode_key);

create index if not exists ride_price_cards_mode_key_idx
  on public.ride_price_cards (mode_key);

create index if not exists ride_price_cards_published_by_idx
  on public.ride_price_cards (published_by);

create index if not exists ride_requests_approved_price_card_idx
  on public.ride_requests (approved_price_card_id);

revoke all on function public.cab_nearby_drivers(double precision,double precision,text,double precision)
  from public,anon,authenticated;
grant execute on function public.cab_nearby_drivers(double precision,double precision,text,double precision)
  to service_role;
