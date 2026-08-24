-- Cabana · regulated supply enters through atomic, private applications.

create or replace function public.driver_application_submit(
  p_driver jsonb,
  p_vehicle jsonb,
  p_documents text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_driver uuid;
  v_vehicle uuid;
  v_kind text;
begin
  if v_uid is null then raise exception 'Sign in before applying' using errcode = '42501'; end if;
  if coalesce(btrim(p_driver->>'full_name'),'') = ''
     or coalesce(btrim(p_driver->>'phone'),'') = ''
     or coalesce(btrim(p_vehicle->>'make'),'') = ''
     or coalesce(btrim(p_vehicle->>'model'),'') = ''
     or coalesce(btrim(p_vehicle->>'plate'),'') = '' then
    raise exception 'The driver and vehicle details are incomplete' using errcode = '22023';
  end if;
  if exists (select 1 from public.drivers where user_id = v_uid and status not in ('rejected')) then
    raise exception 'You already have a driver application' using errcode = '23505';
  end if;

  insert into public.drivers (
    user_id, full_name, phone, email, national_id, licence_no, psv_badge,
    years_driving, city, payout_method, payout_number, referred_by,
    status, status_note
  ) values (
    v_uid, btrim(p_driver->>'full_name'), btrim(p_driver->>'phone'), nullif(btrim(p_driver->>'email'),''),
    nullif(btrim(p_driver->>'national_id'),''), nullif(btrim(p_driver->>'licence_no'),''),
    coalesce((p_driver->>'psv_badge')::boolean,false), nullif(p_driver->>'years_driving','')::int,
    coalesce(nullif(btrim(p_driver->>'city'),''),'Nairobi'), 'mpesa',
    coalesce(nullif(btrim(p_driver->>'payout_number'),''),btrim(p_driver->>'phone')),
    nullif(btrim(p_driver->>'referred_by'),''), 'applied', nullif(btrim(p_driver->>'status_note'),'')
  ) returning id into v_driver;

  insert into public.driver_vehicles (
    driver_id, make, model, year, plate, colour, seats, class, is_primary, verified
  ) values (
    v_driver, btrim(p_vehicle->>'make'), btrim(p_vehicle->>'model'), (p_vehicle->>'year')::int,
    upper(btrim(p_vehicle->>'plate')), nullif(btrim(p_vehicle->>'colour'),''),
    greatest(1,coalesce(nullif(p_vehicle->>'seats','')::int,4)),
    coalesce(nullif(p_vehicle->>'class',''),'economy'), true, false
  ) returning id into v_vehicle;

  foreach v_kind in array coalesce(p_documents,'{}') loop
    if v_kind in ('national_id','driving_licence','psv_badge','good_conduct',
                  'logbook','insurance','inspection','vehicle_photo','portrait') then
      insert into public.driver_documents (driver_id, kind, status)
      values (v_driver, v_kind, 'pending');
    end if;
  end loop;

  return jsonb_build_object('ok',true,'driver_id',v_driver,'vehicle_id',v_vehicle);
end;
$$;

revoke all on function public.driver_application_submit(jsonb,jsonb,text[]) from public, anon;
grant execute on function public.driver_application_submit(jsonb,jsonb,text[]) to authenticated;

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
  v_count int := 0;
  v_slug text;
begin
  if v_uid is null then raise exception 'Sign in before applying' using errcode = '42501'; end if;
  if coalesce(btrim(p_operator->>'name'),'') = ''
     or coalesce(btrim(p_operator->>'city'),'') = ''
     or coalesce(btrim(p_operator->>'phone'),'') = '' then
    raise exception 'The operator details are incomplete' using errcode = '22023';
  end if;
  if jsonb_typeof(p_vehicles) <> 'array' or jsonb_array_length(p_vehicles) < 1 then
    raise exception 'Add at least one vehicle' using errcode = '22023';
  end if;
  if exists (select 1 from public.car_operators where owner_id = v_uid) then
    raise exception 'You already have a fleet application' using errcode = '23505';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(p_operator->>'name'),'[^a-z0-9]+','-','g'))
            || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  insert into public.car_operators (
    owner_id, name, slug, city, country_code, verified, phone, whatsapp, email, payout_method
  ) values (
    v_uid, btrim(p_operator->>'name'), v_slug, btrim(p_operator->>'city'),
    upper(coalesce(nullif(p_operator->>'country_code',''),'KE')),
    false, btrim(p_operator->>'phone'), nullif(btrim(p_operator->>'whatsapp'),''),
    nullif(btrim(p_operator->>'email'),''), 'mpesa'
  ) returning id into v_operator;

  for v_vehicle in select value from jsonb_array_elements(p_vehicles) loop
    if coalesce(btrim(v_vehicle->>'make'),'') = ''
       or coalesce(btrim(v_vehicle->>'model'),'') = ''
       or nullif(v_vehicle->>'year','') is null
       or nullif(v_vehicle->>'day_rate','') is null then
      raise exception 'A vehicle is missing make, model, year or daily rate' using errcode = '22023';
    end if;
    insert into public.car_fleet (
      operator_id, make, model, variant, year, plate, class, body, seats,
      ground_clearance_mm, drive, transmission, fuel, aircon, day_rate,
      deposit, min_hire_days, min_driver_age, min_licence_years,
      cross_border_ok, photos, status
    ) values (
      v_operator, btrim(v_vehicle->>'make'), btrim(v_vehicle->>'model'), nullif(btrim(v_vehicle->>'variant'),''),
      (v_vehicle->>'year')::int, nullif(upper(btrim(v_vehicle->>'plate')),''),
      coalesce(nullif(v_vehicle->>'class',''),'economy'), coalesce(nullif(v_vehicle->>'body',''),'sedan'),
      greatest(1,coalesce(nullif(v_vehicle->>'seats','')::int,5)),
      greatest(80,coalesce(nullif(v_vehicle->>'ground_clearance_mm','')::int,160)),
      coalesce(nullif(v_vehicle->>'drive',''),'2wd'), coalesce(nullif(v_vehicle->>'transmission',''),'automatic'),
      coalesce(nullif(v_vehicle->>'fuel',''),'petrol'), coalesce((v_vehicle->>'aircon')::boolean,true),
      greatest(0,round((v_vehicle->>'day_rate')::numeric * 100)::int),
      greatest(0,round(coalesce(nullif(v_vehicle->>'deposit','')::numeric,0) * 100)::int),
      greatest(1,coalesce(nullif(v_vehicle->>'min_hire_days','')::int,1)),
      greatest(18,coalesce(nullif(v_vehicle->>'min_driver_age','')::int,23)),
      greatest(0,coalesce(nullif(v_vehicle->>'min_licence_years','')::int,2)),
      coalesce((v_vehicle->>'cross_border_ok')::boolean,false),
      coalesce(v_vehicle->'photos','[]'::jsonb), 'review'
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok',true,'operator_id',v_operator,'vehicles',v_count,'status','review');
end;
$$;

revoke all on function public.car_operator_apply(jsonb,jsonb) from public, anon;
grant execute on function public.car_operator_apply(jsonb,jsonb) to authenticated;
