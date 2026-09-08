-- Conservatively suppress comparison claims for repeated/overlapping promotions.
-- A base-rate history alone is not evidence of an additional saving over a previous offer.
create or replace function cabana_private.stay_quote(p_listing_id uuid,p_checkin date,p_checkout date,p_guests integer default 1)
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
  if rate is null or rate<=0 or rate>=100000000 or rate::text='NaN' then raise exception 'This stay has no valid nightly price'; end if;
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
        'campaign_id',o.campaign_id,'reference_total',round(baseline*n,2),'verified',((r->>'verified')::boolean
          and o.created_at>=now()-interval '30 days'
          and o.booking_end-o.booking_start<=interval '30 days'
          and not exists(select 1 from public.stay_offers prior
            where prior.listing_id=l.id and prior.id<>o.id and prior.created_at<=o.created_at
              and prior.booking_start<o.booking_end and prior.booking_end>o.booking_start-interval '30 days'
              and (prior.status<>'draft' or exists(select 1 from public.stay_offer_audit a
                where a.entity_id=prior.id and a.entity='stay_offers'
                  and (a.before_value->>'status'='active' or a.after_value->>'status'='active'))))),
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

create index if not exists stay_offer_audit_entity_idx on public.stay_offer_audit(entity,entity_id);
create index if not exists apartment_bookings_offer_idx on public.apartment_bookings(offer_id) where offer_id is not null;
