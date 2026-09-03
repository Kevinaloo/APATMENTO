-- Cabana Drive Africa: precise operator coverage, local currency and safe nearby availability.
begin;

create extension if not exists postgis with schema extensions;

alter table public.car_operators
  add column if not exists currency_code text not null default 'KES',
  add column if not exists location extensions.geography(point, 4326),
  add column if not exists service_radius_km integer not null default 150;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'car_operators_currency_code_format'
      and conrelid = 'public.car_operators'::regclass
  ) then
    alter table public.car_operators
      add constraint car_operators_currency_code_format
      check (currency_code ~ '^[A-Z]{3}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'car_operators_service_radius_range'
      and conrelid = 'public.car_operators'::regclass
  ) then
    alter table public.car_operators
      add constraint car_operators_service_radius_range
      check (service_radius_km between 10 and 2000);
  end if;
end $$;

create index if not exists car_operators_verified_country_city_idx
  on public.car_operators (country_code, lower(city))
  where verified = true;

create index if not exists car_operators_verified_location_gix
  on public.car_operators using gist (location)
  where verified = true and location is not null;

create or replace view public.car_operators_public
with (security_invoker = true)
as
select
  id, name, slug, city, country_code, verified, fleet_size,
  response_mins, on_time_pct, completed_hires, rating,
  currency_code, service_radius_km
from public.car_operators
where verified = true;

revoke all on public.car_operators_public from public;
grant select on public.car_operators_public to anon, authenticated;

create or replace function public.cars_available_nearby(
  p_start date,
  p_end date,
  p_country_code text,
  p_city text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km integer default 300
)
returns table (vehicle_id uuid, distance_km numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with search_point as (
    select case
      when p_lat between -90 and 90 and p_lng between -180 and 180
      then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      else null::extensions.geography
    end as point
  )
  select
    f.id,
    case when o.location is not null and s.point is not null
      then round((extensions.st_distance(o.location, s.point) / 1000)::numeric, 1)
      else null::numeric
    end as distance_km
  from public.car_fleet f
  join public.car_operators o on o.id = f.operator_id
  cross join search_point s
  where p_start is not null
    and p_end is not null
    and p_end > p_start
    and f.status = 'active'
    and o.verified = true
    and upper(btrim(o.country_code::text)) = upper(btrim(p_country_code))
    and (
      s.point is null
      or (
        o.location is not null
        and extensions.st_dwithin(
          o.location,
          s.point,
          least(o.service_radius_km, greatest(25, least(coalesce(p_radius_km, 300), 800))) * 1000
        )
      )
      or (
        p_city is not null
        and btrim(p_city) <> ''
        and (
          lower(o.city) = lower(btrim(p_city))
          or lower(o.city) like '%' || lower(btrim(p_city)) || '%'
          or lower(btrim(p_city)) like '%' || lower(o.city) || '%'
        )
      )
    )
    and not exists (
      select 1
      from public.car_blackouts b
      where b.vehicle_id = f.id
        and b.starts_on < p_end
        and b.ends_on > p_start
    )
  order by distance_km nulls last, f.day_rate, f.id;
$$;

revoke all on function public.cars_available_nearby(date,date,text,text,double precision,double precision,integer) from public;
grant execute on function public.cars_available_nearby(date,date,text,text,double precision,double precision,integer) to anon, authenticated;

create or replace function public.car_operator_apply(
  p_operator jsonb,
  p_vehicles jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_operator uuid;
  v_vehicle jsonb;
  v_count integer := 0;
  v_slug text;
  v_country text;
  v_currency text;
  v_lat double precision;
  v_lng double precision;
  v_location extensions.geography(point, 4326);
  v_radius integer;
begin
  if v_uid is null then
    raise exception 'Sign in before applying' using errcode = '42501';
  end if;
  if coalesce(btrim(p_operator->>'name'), '') = ''
     or coalesce(btrim(p_operator->>'city'), '') = ''
     or coalesce(btrim(p_operator->>'phone'), '') = '' then
    raise exception 'The operator details are incomplete' using errcode = '22023';
  end if;
  if jsonb_typeof(p_vehicles) <> 'array' or jsonb_array_length(p_vehicles) < 1 then
    raise exception 'Add at least one vehicle' using errcode = '22023';
  end if;
  if exists (select 1 from public.car_operators where owner_id = v_uid) then
    raise exception 'You already have a fleet application' using errcode = '23505';
  end if;

  v_country := upper(coalesce(nullif(btrim(p_operator->>'country_code'), ''), ''));
  if not (v_country = any (array[
    'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
    'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
    'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW'
  ])) then
    raise exception 'Choose one of the 54 African countries' using errcode = '22023';
  end if;

  v_currency := case v_country
    when 'DZ' then 'DZD' when 'AO' then 'AOA' when 'BJ' then 'XOF' when 'BW' then 'BWP'
    when 'BF' then 'XOF' when 'BI' then 'BIF' when 'CV' then 'CVE' when 'CM' then 'XAF'
    when 'CF' then 'XAF' when 'TD' then 'XAF' when 'KM' then 'KMF' when 'CD' then 'CDF'
    when 'CG' then 'XAF' when 'CI' then 'XOF' when 'DJ' then 'DJF' when 'EG' then 'EGP'
    when 'GQ' then 'XAF' when 'ER' then 'ERN' when 'SZ' then 'SZL' when 'ET' then 'ETB'
    when 'GA' then 'XAF' when 'GM' then 'GMD' when 'GH' then 'GHS' when 'GN' then 'GNF'
    when 'GW' then 'XOF' when 'KE' then 'KES' when 'LS' then 'LSL' when 'LR' then 'LRD'
    when 'LY' then 'LYD' when 'MG' then 'MGA' when 'MW' then 'MWK' when 'ML' then 'XOF'
    when 'MR' then 'MRU' when 'MU' then 'MUR' when 'MA' then 'MAD' when 'MZ' then 'MZN'
    when 'NA' then 'NAD' when 'NE' then 'XOF' when 'NG' then 'NGN' when 'RW' then 'RWF'
    when 'ST' then 'STN' when 'SN' then 'XOF' when 'SC' then 'SCR' when 'SL' then 'SLE'
    when 'SO' then 'SOS' when 'ZA' then 'ZAR' when 'SS' then 'SSP' when 'SD' then 'SDG'
    when 'TZ' then 'TZS' when 'TG' then 'XOF' when 'TN' then 'TND' when 'UG' then 'UGX'
    when 'ZM' then 'ZMW' when 'ZW' then 'USD'
  end;

  begin
    v_lat := nullif(p_operator->>'latitude', '')::double precision;
    v_lng := nullif(p_operator->>'longitude', '')::double precision;
    v_radius := greatest(10, least(coalesce(nullif(p_operator->>'service_radius_km', '')::integer, 150), 2000));
  exception when invalid_text_representation then
    raise exception 'The depot coordinates or service radius are invalid' using errcode = '22023';
  end;
  if (v_lat is null) <> (v_lng is null) or v_lat not between -90 and 90 or v_lng not between -180 and 180 then
    raise exception 'Choose a valid operating city or depot from the map search' using errcode = '22023';
  end if;
  if v_lat is not null then
    v_location := extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography;
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(p_operator->>'name'), '[^a-z0-9]+', '-', 'g'))
            || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.car_operators (
    owner_id, name, slug, city, country_code, currency_code, location, service_radius_km,
    verified, phone, whatsapp, email, payout_method
  ) values (
    v_uid, btrim(p_operator->>'name'), v_slug, btrim(p_operator->>'city'), v_country,
    v_currency, v_location, v_radius, false, btrim(p_operator->>'phone'),
    nullif(btrim(p_operator->>'whatsapp'), ''), nullif(btrim(p_operator->>'email'), ''), null
  ) returning id into v_operator;

  for v_vehicle in select value from jsonb_array_elements(p_vehicles) loop
    if coalesce(btrim(v_vehicle->>'make'), '') = ''
       or coalesce(btrim(v_vehicle->>'model'), '') = ''
       or nullif(v_vehicle->>'year', '') is null
       or nullif(v_vehicle->>'day_rate', '') is null then
      raise exception 'A vehicle is missing make, model, year or daily rate' using errcode = '22023';
    end if;
    insert into public.car_fleet (
      operator_id, make, model, variant, year, plate, class, body, seats,
      ground_clearance_mm, drive, transmission, fuel, tank_litres, consumption_kmpl,
      aircon, day_rate, chauffeur_uplift_metro, chauffeur_uplift_upcountry,
      deposit, min_hire_days, min_driver_age, min_licence_years,
      cross_border_ok, photos, status
    ) values (
      v_operator, btrim(v_vehicle->>'make'), btrim(v_vehicle->>'model'), nullif(btrim(v_vehicle->>'variant'), ''),
      greatest(2000, least((v_vehicle->>'year')::integer, extract(year from current_date)::integer + 1)),
      nullif(upper(btrim(v_vehicle->>'plate')), ''),
      coalesce(nullif(v_vehicle->>'class', ''), 'economy'), coalesce(nullif(v_vehicle->>'body', ''), 'sedan'),
      greatest(1, least(coalesce(nullif(v_vehicle->>'seats', '')::integer, 5), 60)),
      greatest(80, least(coalesce(nullif(v_vehicle->>'ground_clearance_mm', '')::integer, 160), 600)),
      coalesce(nullif(v_vehicle->>'drive', ''), '2wd'), coalesce(nullif(v_vehicle->>'transmission', ''), 'automatic'),
      coalesce(nullif(v_vehicle->>'fuel', ''), 'petrol'),
      greatest(1, least(nullif(v_vehicle->>'tank_litres', '')::integer, 500)),
      greatest(1, least(nullif(v_vehicle->>'consumption_kmpl', '')::numeric, 80)),
      coalesce((v_vehicle->>'aircon')::boolean, true),
      least(2147483647, greatest(0, round((v_vehicle->>'day_rate')::numeric * 100)))::integer,
      least(2147483647, greatest(0, round(coalesce(nullif(v_vehicle->>'chauffeur_uplift_metro', '')::numeric, 0) * 100)))::integer,
      least(2147483647, greatest(0, round(coalesce(nullif(v_vehicle->>'chauffeur_uplift_upcountry', '')::numeric, 0) * 100)))::integer,
      least(2147483647, greatest(0, round(coalesce(nullif(v_vehicle->>'deposit', '')::numeric, 0) * 100)))::integer,
      greatest(1, coalesce(nullif(v_vehicle->>'min_hire_days', '')::integer, 1)),
      greatest(18, coalesce(nullif(v_vehicle->>'min_driver_age', '')::integer, 23)),
      greatest(0, coalesce(nullif(v_vehicle->>'min_licence_years', '')::integer, 2)),
      coalesce((v_vehicle->>'cross_border_ok')::boolean, false),
      coalesce(v_vehicle->'photos', '[]'::jsonb), 'review'
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true, 'operator_id', v_operator, 'vehicles', v_count,
    'status', 'review', 'country_code', v_country, 'currency_code', v_currency
  );
end;
$$;

revoke all on function public.car_operator_apply(jsonb, jsonb) from public, anon;
grant execute on function public.car_operator_apply(jsonb, jsonb) to authenticated;

comment on function public.cars_available_nearby(date,date,text,text,double precision,double precision,integer)
  is 'Returns verified, date-available fleet IDs serving an exact African pickup point, ordered by operator distance.';

notify pgrst, 'reload schema';
commit;
