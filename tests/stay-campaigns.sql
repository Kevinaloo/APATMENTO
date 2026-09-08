begin;
do $$
declare host uuid; admin_id uuid; admin_email text; lid uuid:=gen_random_uuid(); campaign uuid; offer uuid; failed boolean;
 ci date:=(now() at time zone 'Africa/Nairobi')::date+10; q jsonb;
begin
 select partner_id into host from public.listings where partner_id is not null and service='stays' limit 1;
 select u.id,u.email into admin_id,admin_email from auth.users u join public.admin_users a on a.email=u.email limit 1;
 if host is null or admin_id is null then raise exception 'Host/admin identities required for policy test'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'email','host-test@example.invalid','role','authenticated')::text,true);
 insert into public.listings(id,partner_id,host_id,title,type,service,currency,price_night,min_nights,max_guests,is_active,status,ownership_type,country)
 values(lid,host,host,'Campaign rollback test','apartment','stays','KES',6000,1,'4',true,'active','sole','Kenya');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'email',admin_email,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.stay_offer_campaigns(title,status,booking_start,booking_end,stay_start,stay_end,min_discount,max_discount,countries)
 values('Christmas rollback test','published',now()-interval '1 day',now()+interval '30 days',ci,ci+30,5,30,array['Kenya']) returning id into campaign;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'email','host-test@example.invalid','role','authenticated')::text,true);
 failed:=false;
 begin insert into public.stay_offers(listing_id,host_id,campaign_id,title,status,discount_pct,floor_nightly,booking_start,booking_end,stay_start,stay_end)
 values(lid,host,campaign,'Invalid discount','active',50,100,now(),now()+interval '20 days',ci,ci+10);
 exception when raise_exception then failed:=true; end;
 if not failed then raise exception 'Campaign limits were not enforced'; end if;
 insert into public.stay_offers(listing_id,host_id,campaign_id,title,status,discount_pct,floor_nightly,booking_start,booking_end,stay_start,stay_end)
 values(lid,host,campaign,'Host choice','active',20,100,now(),now()+interval '20 days',ci,ci+10) returning id into offer;
 q:=public.cabana_stay_quote(lid,ci,ci+1,1);
 if (q->>'stay_total')::numeric<>4800 or (q->>'service_fee')::numeric<>300 or (q->'offer'->>'campaign_id')::uuid<>campaign then raise exception 'Campaign quote/fee threshold failed'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'email',admin_email,'role','authenticated')::text,true);
 failed:=false;
 begin update public.stay_offer_campaigns set max_discount=40 where id=campaign; exception when raise_exception then failed:=true; end;
 if not failed then raise exception 'Joined campaign terms changed without consent'; end if;
 update public.stay_offer_campaigns set status='paused' where id=campaign;
 if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Paused campaign still qualified'; end if;
 update public.stay_offer_campaigns set status='published' where id=campaign;
 if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'='null'::jsonb then raise exception 'Resumed campaign not available'; end if;
 update public.stay_offers set status='paused' where id=offer;
 if public.cabana_stay_quote(lid,ci,ci+1,1)->'offer'<>'null'::jsonb then raise exception 'Paused host offer still qualified'; end if;
 if not exists(select 1 from public.stay_offer_audit where entity_id=offer) then raise exception 'Audit is missing'; end if;
 execute 'reset role';
end $$;
select 'PASS: admin campaigns, host consent, discount bounds, fee thresholds, immutable joined terms, pause/resume and audit' as result;
rollback;
