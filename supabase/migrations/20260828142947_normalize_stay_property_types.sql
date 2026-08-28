-- The former stay form mixed property families with layouts (Studio,
-- Penthouse), service models (Serviced unit), locations (Beach house) and
-- another marketplace's brand (Airbnb unit). Keep existing inventory aligned
-- with the smaller taxonomy now used by the host form. This is data-only and
-- deliberately leaves unrecognised values untouched.

with canonical as (
  select
    id,
    case lower(btrim(coalesce(listing_type, property_type, '')))
      when 'apartment' then 'Apartment'
      when 'flat' then 'Apartment'
      when 'studio' then 'Apartment'
      when 'penthouse' then 'Apartment'
      when 'serviced' then 'Apartment'
      when 'serviced unit' then 'Apartment'
      when 'serviced apartment' then 'Apartment'
      when 'airbnb unit' then 'Apartment'
      when 'entire flat' then 'Apartment'
      when '1-bed flat' then 'Apartment'
      when 'studio unit' then 'Apartment'
      when 'bedsitter' then 'Apartment'
      when 'house' then 'House'
      when 'townhouse' then 'House'
      when 'maisonette' then 'House'
      when 'beach house' then 'House'
      when 'villa' then 'Villa'
      when 'cottage' then 'Cottage or Cabin'
      when 'cottage or cabin' then 'Cottage or Cabin'
      when 'cabin' then 'Cottage or Cabin'
      when 'chalet' then 'Cottage or Cabin'
      when 'bungalow' then 'Cottage or Cabin'
      when 'guesthouse' then 'Guesthouse or B&B'
      when 'guest house' then 'Guesthouse or B&B'
      when 'b&b' then 'Guesthouse or B&B'
      when 'bnb' then 'Guesthouse or B&B'
      when 'bed and breakfast' then 'Guesthouse or B&B'
      when 'hotel' then 'Hotel or Resort'
      when 'resort' then 'Hotel or Resort'
      when 'hotel or resort' then 'Hotel or Resort'
      when 'lodge' then 'Lodge or Safari Camp'
      when 'safari camp' then 'Lodge or Safari Camp'
      when 'lodge or safari camp' then 'Lodge or Safari Camp'
      when 'eco-lodge' then 'Lodge or Safari Camp'
      when 'hostel' then 'Hostel'
      when 'unique stay' then 'Unique Stay'
      when 'treehouse' then 'Unique Stay'
      when 'boat' then 'Unique Stay'
      when 'farm stay' then 'Unique Stay'
      else null
    end as property_family
  from public.listings
  where lower(coalesce(service, '')) = 'stays'
)
update public.listings as l
set
  listing_type = c.property_family,
  property_type = c.property_family
from canonical as c
where l.id = c.id
  and c.property_family is not null
  and (l.listing_type is distinct from c.property_family
       or l.property_type is distinct from c.property_family);
