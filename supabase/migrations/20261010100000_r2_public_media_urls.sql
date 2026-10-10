-- Public photos and clips now live on Cloudflare R2 (https://media.cabana.africa),
-- keeping Supabase storage for private files. Two validators hard-coded the
-- Supabase bucket host and would have rejected an R2 URL. Both are widened to
-- accept the R2 media host IN ADDITION to the existing Supabase one: nothing
-- that was valid before becomes invalid, and only our own media domain is added.

create or replace function cabana_private.spotlight_media_ok(p_url text, p_owner uuid)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select p_url is not null and p_owner is not null
     and (   p_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/tours/' || p_owner::text || '/[A-Za-z0-9._/-]+$')
          or p_url ~ ('^https://media\.cabana\.africa/(tours|events|places)/' || p_owner::text || '/[A-Za-z0-9._-]+$'))
$$;

create or replace function public.hotel_room_type_save(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_listing uuid; v_id uuid; t public.hotel_room_types%rowtype;
begin
  v_id := nullif(p->>'id', '')::uuid;
  if v_id is not null then
    select * into t from public.hotel_room_types where id = v_id;
    if not found then raise exception 'Room type not found' using errcode = 'P0002'; end if;
    v_listing := t.listing_id;
  else
    v_listing := nullif(p->>'listing_id', '')::uuid;
  end if;
  if v_listing is null or not cabana_private.can_manage_listing(v_listing) then
    raise exception 'You can only manage rooms on your own hotel' using errcode = '42501';
  end if;
  if (select coalesce(service, 'stays') from public.listings where id = v_listing) <> 'stays' then
    raise exception 'Rooms and rates are for stays only' using errcode = '22023';
  end if;
  if v_id is null and (select count(*) from public.hotel_room_types where listing_id = v_listing) >= 40 then
    raise exception 'Up to 40 room types per hotel' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.hotel_room_types (listing_id, name, base_rate)
    values (v_listing, coalesce(nullif(btrim(p->>'name'), ''), 'Room'), greatest(1, coalesce(nullif(p->>'base_rate', '')::numeric, 1)))
    returning * into t;
  end if;

  update public.hotel_room_types set
    name                = coalesce(nullif(left(btrim(p->>'name'), 80), ''), name),
    description         = case when p ? 'description' then nullif(left(btrim(p->>'description'), 1200), '') else description end,
    bed_setup           = case when p ? 'bed_setup' then nullif(left(btrim(p->>'bed_setup'), 80), '') else bed_setup end,
    view                = case when p ? 'view' then nullif(left(btrim(p->>'view'), 60), '') else view end,
    size_sqm            = case when p ? 'size_sqm' then nullif(p->>'size_sqm', '')::numeric else size_sqm end,
    max_adults          = coalesce(nullif(p->>'max_adults', '')::integer, max_adults),
    max_children        = coalesce(nullif(p->>'max_children', '')::integer, max_children),
    units               = coalesce(nullif(p->>'units', '')::integer, units),
    base_rate           = coalesce(nullif(p->>'base_rate', '')::numeric, base_rate),
    weekend_rate        = case when p ? 'weekend_rate' then nullif(p->>'weekend_rate', '')::numeric else weekend_rate end,
    breakfast_pp        = case when p ? 'breakfast_pp' then nullif(p->>'breakfast_pp', '')::numeric else breakfast_pp end,
    half_board_pp       = case when p ? 'half_board_pp' then nullif(p->>'half_board_pp', '')::numeric else half_board_pp end,
    full_board_pp       = case when p ? 'full_board_pp' then nullif(p->>'full_board_pp', '')::numeric else full_board_pp end,
    nonref_discount_pct = coalesce(nullif(p->>'nonref_discount_pct', '')::numeric, nonref_discount_pct),
    min_nights          = coalesce(nullif(p->>'min_nights', '')::integer, min_nights),
    amenities           = case when jsonb_typeof(p->'amenities') = 'array'
                               then (select coalesce(array_agg(left(btrim(x), 40)), '{}') from jsonb_array_elements_text(p->'amenities') x where btrim(x) <> '')
                               else amenities end,
    photos              = case when jsonb_typeof(p->'photos') = 'array'
                               then (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(p->'photos') x
                                      where x ~ '^https://[a-z0-9.-]+\.supabase\.co/storage/v1/object/public/listings/'
                                         or x ~ '^https://media\.cabana\.africa/(listings|food|shop|cars|tours|events|places)/[0-9a-f-]{36}/[A-Za-z0-9._-]+$')
                               else photos end,
    sort                = coalesce(nullif(p->>'sort', '')::integer, sort),
    active              = coalesce((p->>'active')::boolean, active),
    updated_at          = now()
  where id = t.id
  returning * into t;

  -- The listing's headline price is the cheapest room, and it books by room.
  update public.listings l set booking_model = 'hotel', day_pass_enabled = false,
         price_night = (select min(least(base_rate, coalesce(weekend_rate, base_rate))) from public.hotel_room_types
                         where listing_id = l.id and active),
         updated_at = now()
   where l.id = t.listing_id
     and exists (select 1 from public.hotel_room_types where listing_id = l.id and active);
  return to_jsonb(t);
end $$;
