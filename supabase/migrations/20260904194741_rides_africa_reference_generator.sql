-- Correct the request reference generator for projects where pgcrypto lives outside public.

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
      new.ref := 'CM' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
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

revoke all on function public.cabana_guard_ride_request_insert() from public,anon,authenticated;
