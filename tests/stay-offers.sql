-- Run using Supabase execute_sql. Every fixture and mutation rolls back.
begin;
do $$
declare host uuid; guest uuid; lid uuid:=gen_random_uuid(); oid uuid; oid2 uuid; cid uuid;
  ci date:=(now() at time zone 'Africa/Nairobi')::date+10; q jsonb; b uuid; affected integer; failed boolean;
begin
  select partner_id into host from public.listings where partner_id is not null and service='stays' limit 1;
  select id into guest from auth.users where id<>host limit 1;
  if host is null or guest is null then raise exception 'Two existing test identities are required'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'email','offer-test@example.invalid','role','authenticated')::text,true);
  insert into public.listings(id,partner_id,host_id,title,type,service,currency,price_night,min_nights,max_guests,is_active,status,ownership_type)
  values(lid,host,host,'Rollback offer test','apartment','stays','KES',2000,1,'4',true,'active','sole');
  -- Actual owner permissions, not service-role bypass.
  execute 'set local role authenticated';
  insert into public.stay_offers(listing_id,host_id,title,status,discount_pct,floor_nightly,booking_start,booking_end,stay_start,stay_end,reference_nightly)
  values(lid,host,'Test offer','active',10,100,now()-interval '1 day',now()+interval '30 days',ci,ci+30,999999) returning id into oid;
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->>'stay_total')::numeric<>1800 or (q->>'grand_total')::numeric<>2100 or (q->'offer'->>'verified')::boolean then raise exception 'New history or 10 percent quote failed: %',q; end if;
  if (select reference_nightly from public.stay_offers where id=oid)<>2000 then raise exception 'Host forged reference'; end if;
  update public.listings set price_night=4000 where id=lid;
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->>'stay_total')::numeric<>1800 then raise exception 'Price inflation was not prevented'; end if;
  insert into public.stay_offers(listing_id,host_id,title,status,discount_pct,floor_nightly,booking_start,booking_end,stay_start,stay_end)
  values(lid,host,'Better offer','active',25,100,now()-interval '1 day',now()+interval '30 days',ci,ci+30) returning id into oid2;
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->>'stay_total')::numeric<>1500 then raise exception 'Best offer or non-stacking failed'; end if;
  update public.stay_offers set status='paused' where id=oid2;
  update public.stay_offers set floor_nightly=1900 where id=oid;
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->>'stay_total')::numeric<>1900 or (q->'offer'->>'effective_pct')::numeric<>5 then raise exception 'Floor or effective percentage failed'; end if;
  update public.stay_offers set floor_nightly=100,excluded_dates=array[ci+1] where id=oid;
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->>'stay_total')::numeric<>1800 then raise exception 'Checkout was counted as occupied night'; end if;
  update public.stay_offers set excluded_dates=array[ci] where id=oid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Excluded night qualified'; end if;
  update public.stay_offers set excluded_dates='{}',weekdays=array[((extract(dow from ci)::integer+1)%7)] where id=oid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Weekday rules failed'; end if;
  update public.stay_offers set weekdays='{0,1,2,3,4,5,6}',min_nights=3 where id=oid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Minimum nights failed'; end if;
  update public.stay_offers set min_nights=1,min_lead_days=30 where id=oid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Advance booking failed'; end if;
  update public.stay_offers set min_lead_days=0,booking_start=now()+interval '1 day' where id=oid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Scheduled start failed'; end if;
  update public.stay_offers set booking_start=now()-interval '1 day',booking_end=now() where id=oid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Exclusive booking end failed'; end if;
  update public.stay_offers set booking_end=now()+interval '30 days' where id=oid;
  -- Editing terms must not reuse the old comparison or discount.
  update public.listings set cancel_policy='Changed terms for test' where id=lid;
  if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Changed terms reused old offer'; end if;
  update public.listings set cancel_policy=null where id=lid;
  -- A second host cannot see or mutate this host's offers, or create campaigns.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',guest,'email','other-test@example.invalid','role','authenticated')::text,true);
  if exists(select 1 from public.stay_offers where id=oid) then raise exception 'Cross-owner read succeeded'; end if;
  update public.stay_offers set discount_pct=80 where id=oid;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Cross-owner write succeeded'; end if;
  failed:=false;
  begin perform public.cabana_stay_offer_basis(lid); exception when insufficient_privilege then failed:=true; end;
  if not failed then raise exception 'Private preview leaked'; end if;
  failed:=false;
  begin insert into public.stay_offer_campaigns(title,booking_start,booking_end,stay_start,stay_end)
    values('Unauthorized campaign',now(),now()+interval '1 day',ci,ci+2);
  exception when insufficient_privilege then failed:=true; end;
  if not failed then raise exception 'Host created admin campaign'; end if;
  -- Booking saves exact offer receipt and guards a stale total before any payment.
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  insert into public.apartment_bookings(guest_id,listing_id,apartment_id,checkin_date,checkout_date,num_guests,stay_total,payment_reference,quote_fingerprint)
  values(guest,lid,lid::text,ci,ci+1,1,(q->>'stay_total')::numeric,'APT-'||lid||'-1234567890123',q->>'fingerprint') returning id into b;
  if (select stay_total from public.apartment_bookings where id=b)<>1800 then raise exception 'Booking quote not applied'; end if;
  update public.apartment_bookings set offer_id=null,offer_snapshot='{}',quote_fingerprint='forged' where id=b;
  if (select offer_id from public.apartment_bookings where id=b) is null then raise exception 'Offer receipt was mutable'; end if;
  failed:=false;
  begin insert into public.apartment_bookings(guest_id,listing_id,apartment_id,checkin_date,checkout_date,num_guests,stay_total,payment_reference,quote_fingerprint)
  values(guest,lid,lid::text,ci,ci+1,1,1,'APT-'||lid||'-1234567890124','stale'); exception when invalid_parameter_value then failed:=true; end;
  if not failed then raise exception 'Stale quote accepted'; end if;
  execute 'reset role';
  -- Simulate elapsed observation time only on this disposable fixture.
  delete from public.stay_price_history where listing_id=lid;
  insert into public.stay_price_history(listing_id,nightly,currency,terms_key,observed_at)
  select lid,2000,'KES',cabana_private.stay_terms(l),now()-interval '31 days' from public.listings l where id=lid;
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->'offer'->>'verified')::boolean then raise exception 'Repeated promotions reused a normal-price savings claim'; end if;
  if not (cabana_private.stay_reference(lid,q->>'terms_key','KES')->>'verified')::boolean then raise exception 'Continuous base history not recognised'; end if;
  execute 'set local role anon';
  q:=public.cabana_stay_quote(lid,ci,ci+1,1);
  if (q->>'stay_total')::numeric<>1800 then raise exception 'Anonymous public quote failed'; end if;
  failed:=false;
  begin perform count(*) from public.stay_price_history; exception when insufficient_privilege then failed:=true; end;
  if not failed then raise exception 'Anonymous history access succeeded'; end if;
  execute 'reset role';
end $$;
select 'PASS: quotes, inflation, best deal, floors, eligibility, schedules, ownership, RLS, immutable receipts, stale quotes and price history' as result;
rollback;
