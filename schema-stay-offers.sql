-- Cabana stay offers: honest reference prices, voluntary campaigns and one quote.
-- Applied through Supabase apply_migration; no promotional prices are seeded.
create schema if not exists cabana_private;
revoke all on schema cabana_private from public, anon, authenticated;
grant usage on schema cabana_private to anon, authenticated, service_role;

create table public.stay_price_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  observed_at timestamptz not null default clock_timestamp(),
  nightly numeric not null,
  currency text not null,
  terms_key text not null
);
create index stay_price_history_lookup on public.stay_price_history(listing_id, observed_at desc);
alter table public.stay_price_history enable row level security;
revoke all on public.stay_price_history from anon, authenticated;
grant select on public.stay_price_history to authenticated;
create policy stay_history_owner_read on public.stay_price_history for select to authenticated using (
  (select public.is_admin()) or exists(select 1 from public.listings l where l.id=listing_id and l.partner_id=(select auth.uid()))
);

create function cabana_private.stay_terms(l public.listings) returns text
language sql immutable set search_path=pg_catalog as $$
  select md5(jsonb_build_object('currency',coalesce(nullif(l.currency,''),'KES'),
    'capacity',l.max_guests,'min_nights',l.min_nights,'cancel',l.cancel_policy,
    'deposit',l.deposit,'beds',l.beds,'bedrooms',l.bedrooms,
    'extras',coalesce(l.extras,'{}'::jsonb))::text)
$$;
revoke all on function cabana_private.stay_terms(public.listings) from public,anon,authenticated;

create function cabana_private.record_stay_price() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='INSERT' or row(new.price_night,new.price_per_night,new.currency,cabana_private.stay_terms(new))
      is distinct from row(old.price_night,old.price_per_night,old.currency,cabana_private.stay_terms(old)) then
    insert into public.stay_price_history(listing_id,nightly,currency,terms_key)
      values(new.id,coalesce(new.price_night,new.price_per_night,0),coalesce(nullif(new.currency,''),'KES'),cabana_private.stay_terms(new));
  end if;
  return new;
end $$;
revoke all on function cabana_private.record_stay_price() from public,anon,authenticated;
create trigger cabana_record_stay_price after insert or update on public.listings
for each row execute function cabana_private.record_stay_price();
-- Observation begins now. Never pretend we have 30 days of historical evidence.
insert into public.stay_price_history(listing_id,nightly,currency,terms_key)
select id,coalesce(price_night,price_per_night,0),coalesce(nullif(currency,''),'KES'),cabana_private.stay_terms(l) from public.listings l;

create table public.stay_offer_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(trim(title)) between 3 and 80),
  description text not null default '' check(char_length(description)<=600),
  status text not null default 'draft' check(status in ('draft','published','paused','ended')),
  timezone text not null default 'Africa/Nairobi',
  booking_start timestamptz not null,
  booking_end timestamptz not null,
  stay_start date not null,
  stay_end date not null,
  countries text[] not null default '{}',
  min_discount numeric not null default 1 check(min_discount between 1 and 80),
  max_discount numeric not null default 80 check(max_discount between 1 and 80),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(booking_end>booking_start and stay_end>stay_start and max_discount>=min_discount)
);
alter table public.stay_offer_campaigns enable row level security;
revoke all on public.stay_offer_campaigns from anon,authenticated;
grant select,insert,update on public.stay_offer_campaigns to authenticated;
create policy campaigns_read on public.stay_offer_campaigns for select to authenticated
 using(status='published' or (select public.is_admin()));
create policy campaigns_admin_insert on public.stay_offer_campaigns for insert to authenticated
 with check((select public.is_admin()) and created_by=(select auth.uid()));
create policy campaigns_admin_update on public.stay_offer_campaigns for update to authenticated
 using((select public.is_admin())) with check((select public.is_admin()));

create table public.stay_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid not null default auth.uid(),
  campaign_id uuid references public.stay_offer_campaigns(id),
  title text not null check(char_length(trim(title)) between 3 and 80),
  status text not null default 'draft' check(status in ('draft','active','paused','ended')),
  discount_pct numeric not null check(discount_pct between 1 and 80),
  floor_nightly numeric not null default 1 check(floor_nightly>0 and floor_nightly<100000000),
  booking_start timestamptz not null,
  booking_end timestamptz not null,
  stay_start date not null,
  stay_end date not null,
  timezone text not null default 'Africa/Nairobi',
  min_nights integer not null default 1 check(min_nights between 1 and 365),
  max_nights integer not null default 365 check(max_nights between 1 and 365),
  min_lead_days integer not null default 0 check(min_lead_days between 0 and 730),
  max_lead_days integer not null default 730 check(max_lead_days between 0 and 730),
  weekdays integer[] not null default '{0,1,2,3,4,5,6}' check(cardinality(weekdays)>0 and weekdays <@ array[0,1,2,3,4,5,6]),
  excluded_dates date[] not null default '{}' check(cardinality(excluded_dates)<=366),
  reference_nightly numeric not null default 0,
  currency text not null default 'KES',
  terms_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(booking_end>booking_start and stay_end>stay_start and max_nights>=min_nights and max_lead_days>=min_lead_days)
);
create index stay_offers_listing on public.stay_offers(listing_id,status,booking_end);
create index stay_offers_campaign on public.stay_offers(campaign_id) where campaign_id is not null;
create index stay_offers_host on public.stay_offers(host_id,created_at desc);
alter table public.stay_offers enable row level security;
revoke all on public.stay_offers from anon,authenticated;
grant select,insert,update on public.stay_offers to authenticated;
create policy offers_read on public.stay_offers for select to authenticated using(
  (select public.is_admin()) or exists(select 1 from public.listings l where l.id=listing_id and l.partner_id=(select auth.uid()))
);
create policy offers_insert on public.stay_offers for insert to authenticated with check(
  host_id=(select auth.uid()) and exists(select 1 from public.listings l where l.id=listing_id and l.partner_id=(select auth.uid()))
);
create policy offers_update on public.stay_offers for update to authenticated using(
  (select public.is_admin()) or exists(select 1 from public.listings l where l.id=listing_id and l.partner_id=(select auth.uid()))
) with check(
  (select public.is_admin()) or exists(select 1 from public.listings l where l.id=listing_id and l.partner_id=(select auth.uid()))
);

create function cabana_private.stay_reference(p_listing uuid,p_terms text,p_currency text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
  with history as (
    select * from public.stay_price_history where listing_id=p_listing
      and observed_at >= now()-interval '30 days'
    union all
    (select * from public.stay_price_history where listing_id=p_listing
      and observed_at < now()-interval '30 days' order by observed_at desc,id desc limit 1)
  ) select jsonb_build_object('nightly',min(nightly) filter(where terms_key=p_terms and currency=p_currency and nightly>0),
    'verified',coalesce(min(observed_at)<=now()-interval '30 days'
      and bool_and(terms_key=p_terms and currency=p_currency and nightly>0),false)) from history
$$;
revoke all on function cabana_private.stay_reference(uuid,text,text) from public,anon,authenticated;

create function cabana_private.validate_stay_campaign() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Choose a valid time zone'; end if;
  if tg_op='UPDATE' then
    new.created_by:=old.created_by; new.created_at:=old.created_at;
    -- Hosts consent to specific terms. Once joined, campaign economics/dates
    -- are immutable; pause/end it or create a new campaign instead.
    if exists(select 1 from public.stay_offers where campaign_id=old.id)
       and (to_jsonb(new)-array['status','description','updated_at']) is distinct from
           (to_jsonb(old)-array['status','description','updated_at']) then
      raise exception 'Hosts have joined this campaign. Create a new campaign to change its terms.';
    end if;
  end if;
  new.updated_at:=now(); return new;
end $$;
revoke all on function cabana_private.validate_stay_campaign() from public,anon,authenticated;
create trigger validate_stay_campaign before insert or update on public.stay_offer_campaigns for each row execute function cabana_private.validate_stay_campaign();

create function cabana_private.validate_stay_offer() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.listings%rowtype; c public.stay_offer_campaigns%rowtype; r jsonb;
begin
  select * into l from public.listings where id=new.listing_id for update;
  if not found then raise exception 'Listing not found'; end if;
  if auth.uid() is null or (auth.uid()<>l.partner_id and not public.is_admin()) then
    raise exception 'Only the listing owner can manage offers' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if new.listing_id<>old.listing_id or new.host_id<>old.host_id or new.campaign_id is distinct from old.campaign_id then
      raise exception 'An offer cannot be reassigned'; end if;
    new.created_at:=old.created_at;
    -- An admin may stop an offer, but cannot choose a host discount.
    if auth.uid()<>l.partner_id and (new.status not in ('paused','ended') or
       (to_jsonb(new)-array['status','updated_at']) is distinct from (to_jsonb(old)-array['status','updated_at'])) then
      raise exception 'Admins may pause or end a host offer; only the host chooses its terms'; end if;
  else
    if auth.uid()<>l.partner_id or new.host_id<>auth.uid() then raise exception 'Hosts must opt in themselves'; end if;
    if (select count(*) from public.stay_offers where listing_id=l.id and status<>'ended')>=30 then
      raise exception 'End an old offer before creating another. Each stay can have 30 open offers.'; end if;
    r:=cabana_private.stay_reference(l.id,cabana_private.stay_terms(l),coalesce(nullif(l.currency,''),'KES'));
    new.reference_nightly:=least(coalesce(l.price_night,l.price_per_night),coalesce((r->>'nightly')::numeric,coalesce(l.price_night,l.price_per_night)));
    new.currency:=coalesce(nullif(l.currency,''),'KES');
    new.terms_key:=cabana_private.stay_terms(l);
  end if;
  if tg_op='UPDATE' then
    new.reference_nightly:=old.reference_nightly; new.currency:=old.currency; new.terms_key:=old.terms_key;
  end if;
  if new.status in ('paused','ended') then new.updated_at:=now(); return new; end if;
  if coalesce(l.service,'stays')<>'stays' or l.deleted_at is not null or coalesce(l.ownership_type,'sole')='held' then
    raise exception 'Offers require a claimed stay listing'; end if;
  if coalesce(new.reference_nightly,0)<=0 then raise exception 'Set a nightly price before creating an offer'; end if;
  if new.currency<>'KES' then raise exception 'Stay checkout currently settles in KES. Offers require a KES listing.'; end if;
  if new.floor_nightly>=least(new.reference_nightly,coalesce(l.price_night,l.price_per_night)) then
    raise exception 'Your minimum rate must be below the protected reference price'; end if;
  if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Choose a valid time zone'; end if;
  if new.campaign_id is not null then
    select * into c from public.stay_offer_campaigns where id=new.campaign_id;
    if not found or c.status<>'published' or c.booking_end<=now() then raise exception 'This campaign is not open for participation'; end if;
    if new.discount_pct not between c.min_discount and c.max_discount then raise exception 'Choose a discount within this campaign range'; end if;
    if cardinality(c.countries)>0 and not (l.country=any(c.countries)) then raise exception 'This listing is outside the campaign area'; end if;
    if new.booking_start<c.booking_start or new.booking_end>c.booking_end or new.stay_start<c.stay_start or new.stay_end>c.stay_end then
      raise exception 'Offer dates must fit the campaign dates'; end if;
    new.timezone:=c.timezone;
  end if;
  new.updated_at:=now(); return new;
end $$;
revoke all on function cabana_private.validate_stay_offer() from public,anon,authenticated;
create trigger validate_stay_offer before insert or update on public.stay_offers for each row execute function cabana_private.validate_stay_offer();

create table public.stay_offer_audit (
  id bigint generated always as identity primary key,
  entity text not null, entity_id uuid not null, actor_id uuid,
  recorded_at timestamptz not null default now(), before_value jsonb, after_value jsonb
);
alter table public.stay_offer_audit enable row level security;
revoke all on public.stay_offer_audit from anon,authenticated;
grant select on public.stay_offer_audit to authenticated;
create policy offer_audit_admin on public.stay_offer_audit for select to authenticated using((select public.is_admin()));
create function cabana_private.audit_stay_offer() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  insert into public.stay_offer_audit(entity,entity_id,actor_id,before_value,after_value)
    values(tg_table_name,new.id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new)); return new;
end $$;
revoke all on function cabana_private.audit_stay_offer() from public,anon,authenticated;
create trigger audit_stay_offer after insert or update on public.stay_offers for each row execute function cabana_private.audit_stay_offer();
create trigger audit_stay_campaign after insert or update on public.stay_offer_campaigns for each row execute function cabana_private.audit_stay_offer();

create function cabana_private.stay_quote(p_listing_id uuid,p_checkin date,p_checkout date,p_guests integer default 1)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare l public.listings%rowtype; o record; n integer; rate numeric; baseline numeric; candidate numeric;
  best numeric; chosen jsonb; r jsonb; fee numeric; original_fee numeric; lead integer; terms text;
begin
  select * into l from public.listings where id=p_listing_id and is_active=true and status='active'
    and deleted_at is null and coalesce(service,'stays')='stays' and coalesce(ownership_type,'sole')<>'held';
  if not found then raise exception 'This stay is not available'; end if;
  if p_checkin is null or p_checkout is null or p_checkin<(now() at time zone 'Africa/Nairobi')::date or p_checkout<=p_checkin then raise exception 'Choose valid stay dates'; end if;
  n:=p_checkout-p_checkin;
  if n<greatest(coalesce(l.min_nights,1),1) or n>365 then raise exception 'These dates do not meet the stay length rules'; end if;
  if p_guests is null or p_guests<1 or p_guests>coalesce(nullif(l.max_guests,'')::integer,50) then raise exception 'Guest count exceeds this stay capacity'; end if;
  if coalesce(nullif(l.currency,''),'KES')<>'KES' then raise exception 'Online stay checkout currently supports KES prices only'; end if;
  rate:=coalesce(l.price_night,l.price_per_night);
  if rate is null or rate<=0 then raise exception 'This stay has no valid nightly price'; end if;
  terms:=cabana_private.stay_terms(l);
  r:=cabana_private.stay_reference(l.id,terms,'KES');
  best:=round(rate*n,2);
  for o in select s.*,c.title as campaign_title from public.stay_offers s
    left join public.stay_offer_campaigns c on c.id=s.campaign_id
    where s.listing_id=l.id and s.host_id=l.partner_id and s.status='active'
      and now()>=s.booking_start and now()<s.booking_end
      and p_checkin>=s.stay_start and p_checkout<=s.stay_end
      and n between s.min_nights and s.max_nights and s.currency='KES' and s.terms_key=terms
      and (s.campaign_id is null or (c.status='published' and now()>=c.booking_start and now()<c.booking_end
        and p_checkin>=c.stay_start and p_checkout<=c.stay_end
        and (cardinality(c.countries)=0 or l.country=any(c.countries))))
    order by s.created_at,s.id
  loop
    lead:=p_checkin-(now() at time zone o.timezone)::date;
    if lead<o.min_lead_days or lead>o.max_lead_days then continue; end if;
    if exists(select 1 from generate_series(0,n-1) d where not (extract(dow from p_checkin+d)::integer=any(o.weekdays)) or (p_checkin+d)=any(o.excluded_dates)) then continue; end if;
    baseline:=least(rate,o.reference_nightly,coalesce((r->>'nightly')::numeric,rate));
    candidate:=round(greatest(o.floor_nightly,round(baseline*(1-o.discount_pct/100),2))*n,2);
    -- A rate floor can reduce the effective discount, but never invent a saving.
    if candidate<best and candidate<round(baseline*n,2) then
      best:=candidate;
      chosen:=jsonb_build_object('id',o.id,'title',coalesce(o.campaign_title,o.title),'host_title',o.title,
        'campaign_id',o.campaign_id,'reference_total',round(baseline*n,2),'verified',(r->>'verified')::boolean,
        'stay_saving',round(baseline*n,2)-candidate,'effective_pct',round(100*(1-candidate/(baseline*n)),1),
        'booking_end',o.booking_end,'timezone',o.timezone);
    end if;
  end loop;
  fee:=case when best<5000 then 300 else 800 end;
  if chosen is not null then
    original_fee:=case when (chosen->>'reference_total')::numeric<5000 then 300 else 800 end;
    chosen:=chosen||jsonb_build_object('total_saving',(chosen->>'reference_total')::numeric+original_fee-best-fee);
  end if;
  return jsonb_build_object('listing_id',l.id,'title',l.title,'currency','KES','checkin',p_checkin,'checkout',p_checkout,
    'guests',p_guests,'nights',n,'nightly',round(best/n,2),'stay_total',best,'service_fee',fee,'grand_total',best+fee,
    'offer',chosen,'quoted_at',now(),'terms_key',terms,'max_guests',coalesce(nullif(l.max_guests,'')::integer,50),
    'fingerprint',md5(jsonb_build_array(l.id,p_checkin,p_checkout,p_guests,best,fee,terms,chosen->>'id')::text));
end $$;
revoke all on function cabana_private.stay_quote(uuid,date,date,integer) from public,anon,authenticated;
grant execute on function cabana_private.stay_quote(uuid,date,date,integer) to anon,authenticated,service_role;
create function public.cabana_stay_quote(p_listing_id uuid,p_checkin date,p_checkout date,p_guests integer default 1)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
  select cabana_private.stay_quote(p_listing_id,p_checkin,p_checkout,p_guests)
$$;
revoke all on function public.cabana_stay_quote(uuid,date,date,integer) from public;
grant execute on function public.cabana_stay_quote(uuid,date,date,integer) to anon,authenticated,service_role;

-- Bounded batch quotes avoid an HTTP request per result card. Invalid/unavailable
-- stays get no quote and never inherit another property's discount.
create function public.cabana_stay_quotes(p_listing_ids uuid[],p_checkin date,p_checkout date,p_guests integer default 1)
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog as $$
declare id uuid; q jsonb; result jsonb:='{}';
begin
  if cardinality(p_listing_ids)>100 then raise exception 'Quote at most 100 stays at a time'; end if;
  foreach id in array p_listing_ids loop
    begin q:=cabana_private.stay_quote(id,p_checkin,p_checkout,p_guests); result:=result||jsonb_build_object(id::text,q);
    exception when raise_exception or invalid_text_representation then result:=result||jsonb_build_object(id::text,null); end;
  end loop;
  return result;
end $$;
revoke all on function public.cabana_stay_quotes(uuid[],date,date,integer) from public;
grant execute on function public.cabana_stay_quotes(uuid[],date,date,integer) to anon,authenticated,service_role;

alter table public.apartment_bookings add column offer_id uuid references public.stay_offers(id) on delete set null,
  add column offer_snapshot jsonb,
  add column quote_fingerprint text;

grant all on public.stay_offers,public.stay_offer_campaigns,public.stay_price_history,public.stay_offer_audit to service_role;
grant usage,select on sequence public.stay_price_history_id_seq,public.stay_offer_audit_id_seq to service_role;
