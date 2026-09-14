-- Host-owned measurements and reports. No guest identities or codes leave these RPCs.
create schema if not exists cabana_private;

create table public.host_listing_events (
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_day date not null default (now() at time zone 'Africa/Nairobi')::date,
  kind text not null check (kind in ('impression','view','checkout')),
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (listing_id,event_day,kind,visitor_hash)
);
alter table public.host_listing_events enable row level security;
revoke all on public.host_listing_events from anon,authenticated;
grant select,insert,delete on public.host_listing_events to service_role;
create table cabana_private.host_tracking_installation (
  singleton boolean primary key default true check(singleton),
  started_at timestamptz not null default now()
);
insert into cabana_private.host_tracking_installation(singleton) values(true);
revoke all on cabana_private.host_tracking_installation from public,anon,authenticated;

create table public.host_photo_reviews (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  photo_hash text not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.host_photo_reviews enable row level security;
revoke all on public.host_photo_reviews from anon,authenticated;
grant select,insert,update,delete on public.host_photo_reviews to service_role;

create function public.cabana_host_record_event(p_listing uuid,p_kind text,p_visitor text)
returns void language sql security invoker set search_path=pg_catalog as $$
  insert into public.host_listing_events(listing_id,kind,visitor_hash)
  select id,p_kind,p_visitor from public.listings where id=p_listing and is_active and deleted_at is null
  on conflict do nothing
$$;
revoke all on function public.cabana_host_record_event(uuid,text,text) from public,anon,authenticated;
grant execute on function public.cabana_host_record_event(uuid,text,text) to service_role;

create function public.cabana_host_cache_photos(p_listing uuid,p_hash text,p_analysis jsonb)
returns void language sql security invoker set search_path=pg_catalog as $$
  insert into public.host_photo_reviews(listing_id,photo_hash,analysis) values(p_listing,p_hash,p_analysis)
  on conflict(listing_id) do update set photo_hash=excluded.photo_hash,analysis=excluded.analysis,created_at=now()
$$;
revoke all on function public.cabana_host_cache_photos(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.cabana_host_cache_photos(uuid,text,jsonb) to service_role;

create function cabana_private.host_report(p_listing uuid,p_month date)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare
  l public.listings%rowtype; v_uid uuid := auth.uid();
  v_start timestamptz; v_end timestamptz; v_tracking timestamptz; v_measured_start timestamptz;
  v_impressions bigint; v_views bigint; v_checkout bigint; v_bookings bigint; v_open int;
  v_collected numeric; v_refunds numeric; v_earned numeric; v_pending numeric; v_penalties numeric;
  v_settlements numeric; v_split numeric; v_earned_count bigint;
begin
  select * into l from public.listings where id=p_listing;
  if not found or v_uid is null or coalesce(l.partner_id,l.host_id) is distinct from v_uid then
    raise exception 'not_your_listing' using errcode='42501';
  end if;
  if p_month is null or extract(day from p_month)<>1 then raise exception 'Use the first day of a month'; end if;
  v_start := p_month::timestamp at time zone 'Africa/Nairobi';
  v_end := (p_month+interval '1 month')::timestamp at time zone 'Africa/Nairobi';
  select started_at into v_tracking from cabana_private.host_tracking_installation where singleton;
  v_measured_start:=greatest(v_start,v_tracking);

  select count(*) filter(where kind='impression'),count(*) filter(where kind='view'),count(*) filter(where kind='checkout')
    into v_impressions,v_views,v_checkout from public.host_listing_events
    where listing_id=p_listing and created_at>=v_measured_start and created_at<v_end;
  select count(*) into v_bookings from public.apartment_bookings
    where listing_id=p_listing and fully_paid_at>=v_measured_start and fully_paid_at<v_end
    and amount_paid>=grand_total and grand_total>0 and cancelled_at is null
    and status not in ('cancelled','refunded','expired');
  select count(*) into v_open from generate_series(0,29) as days(day_offset)
    where not exists(select 1 from public.calendar_blocks b where b.listing_id=p_listing and b.is_active
      and b.start_date<=(now() at time zone 'Africa/Nairobi')::date+day_offset
      and b.end_date>(now() at time zone 'Africa/Nairobi')::date+day_offset)
    and not exists(select 1 from public.listing_holds h where h.listing_id=p_listing and h.released_at is null
      and h.stay @> ((now() at time zone 'Africa/Nairobi')::date+day_offset));

  -- Guest cash receipts are dated by paid_at, never by booking creation.
  select coalesce(sum(p.amount),0) into v_collected from public.booking_payments p
    join public.apartment_bookings b on b.payment_reference=p.booking_ref
    where p.booking_table='apartment_bookings' and p.status='paid' and p.paid_at>=v_start and p.paid_at<v_end
      and b.listing_id=p_listing and b.host_id=v_uid;
  select coalesce(sum(b.refund_amount),0) into v_refunds from public.apartment_bookings b
    where b.listing_id=p_listing and b.host_id=v_uid and b.refunded_at>=v_start and b.refunded_at<v_end;

  -- Entitlement is released at verified, fully funded check-in. Refunds and
  -- penalties restate that entitlement; unresolved disputes are not earnings.
  select coalesce(sum(greatest(0,b.stay_total-least(coalesce(b.refund_amount,0),b.stay_total)-coalesce(b.host_penalty,0))),0),count(*)
    into v_earned,v_earned_count from public.apartment_bookings b
    where b.listing_id=p_listing and b.host_id=v_uid and b.checked_in_at>=v_start and b.checked_in_at<v_end
      and b.amount_paid>=b.grand_total and b.grand_total>0 and b.cancelled_at is null
      and b.status in ('checked_in','completed')
      and not exists(select 1 from public.checkin_issues i where i.booking_id=b.id and i.status<>'resolved');
  select coalesce(sum(b.stay_total),0) into v_pending from public.apartment_bookings b
    where b.listing_id=p_listing and b.host_id=v_uid and b.checkin_date>=p_month
      and b.checkin_date<(p_month+interval '1 month')::date and b.checked_in_at is null and b.cancelled_at is null
      and b.amount_paid>0 and b.status not in ('cancelled','refunded','expired');
  select coalesce(sum(b.host_penalty),0) into v_penalties from public.apartment_bookings b
    where b.listing_id=p_listing and b.host_id=v_uid and b.cancelled_at>=v_start and b.cancelled_at<v_end;
  select coalesce(sum(i.host_payout),0) into v_settlements from public.checkin_issues i
    join public.apartment_bookings b on b.id=i.booking_id
    where b.listing_id=p_listing and b.host_id=v_uid and b.cancelled_at is not null
      and i.status='resolved' and i.resolved_at>=v_start and i.resolved_at<v_end
      and i.id=(select x.id from public.checkin_issues x where x.booking_id=b.id and x.status='resolved' order by x.resolved_at desc,x.id limit 1);
  select coalesce(sum(partner_amount),0) into v_split from public.listing_payout_splits
    where listing_id=p_listing and partner_id=v_uid and created_at>=v_start and created_at<v_end;

  return jsonb_build_object(
    'performance',jsonb_build_object('month',to_char(p_month,'YYYY-MM'),'impressions',v_impressions,'views',v_views,
      'checkout_starts',v_checkout,'paid_bookings',v_bookings,'active',l.is_active,'open_nights_next_30',v_open,
      'tracking_since',v_tracking,'tracking_active',v_end>v_tracking,'measured_from',v_measured_start,'measured_until',least(now(),v_end)),
    'earnings',jsonb_build_object('month',to_char(p_month,'YYYY-MM'),'currency',coalesce(l.currency,'KES'),
      'earned_stay_entitlement',v_earned,'verified_checkins',v_earned_count,'cancellation_settlements',v_settlements,
      'cancellation_penalties',v_penalties,'net_entitlement',v_earned+v_settlements-v_penalties,
      'guest_payments_received',v_collected,'guest_refunds_processed',v_refunds,'pending_checkin_stay_value',v_pending,
      'recorded_partner_allocations',v_split,'payout_routing',l.payout_routing,'bank_payouts',null,
      'basis','Africa/Nairobi calendar month. Earned entitlement is recognized at fully funded verified check-in and restated for recorded refunds and penalties. Cancellation settlements are dated by resolution. Guest cash receipts and refunds use payment/refund timestamps. Split allocations are not added to earnings. Cabana has no bank-transfer receipt ledger, so this report does not claim funds reached a bank or M-Pesa. Amounts exclude host operating expenses; not profit.'));
end $$;
revoke all on function cabana_private.host_report(uuid,date) from public,anon;
grant usage on schema cabana_private to authenticated;
grant execute on function cabana_private.host_report(uuid,date) to authenticated;
create function public.cabana_host_report(p_listing uuid,p_month date)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
  select cabana_private.host_report(p_listing,p_month)
$$;
revoke all on function public.cabana_host_report(uuid,date) from public,anon;
grant execute on function public.cabana_host_report(uuid,date) to authenticated;

-- Publication uses the host JWT, current comparison rate, existing RLS,
-- eligibility trigger, protected quote logic and offer audit trail.
create function public.cabana_host_save_offer(p_offer jsonb,p_reference numeric)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_id uuid:=(p_offer->>'id')::uuid; v_listing uuid:=(p_offer->>'listing_id')::uuid;
  v_basis jsonb; v_saved public.stay_offers%rowtype;
begin
  if auth.uid() is null or (p_offer->>'host_id')::uuid is distinct from auth.uid() then
    raise exception 'not_your_listing' using errcode='42501'; end if;
  perform 1 from public.listings where id=v_listing and partner_id=auth.uid() for update;
  if not found then raise exception 'not_your_listing' using errcode='42501'; end if;
  select * into v_saved from public.stay_offers where id=v_id and host_id=auth.uid() and listing_id=v_listing;
  if found then return jsonb_build_object('id',v_saved.id,'status',v_saved.status,'already',true); end if;
  v_basis:=public.cabana_stay_offer_basis(v_listing);
  if (v_basis->>'reference_nightly')::numeric is distinct from p_reference then
    raise exception 'The comparison rate changed. Ask APA for a fresh promotion preview.'; end if;
  if (p_offer->>'status') not in ('draft','active') then raise exception 'Invalid offer status'; end if;
  if (p_offer->>'booking_end')::timestamptz<=now() then raise exception 'The promotion booking window has ended'; end if;
  insert into public.stay_offers(id,listing_id,host_id,title,status,discount_pct,floor_nightly,booking_start,booking_end,stay_start,stay_end,timezone)
    values(v_id,v_listing,auth.uid(),p_offer->>'title',p_offer->>'status',(p_offer->>'discount_pct')::numeric,
      (p_offer->>'floor_nightly')::numeric,(p_offer->>'booking_start')::timestamptz,(p_offer->>'booking_end')::timestamptz,
      (p_offer->>'stay_start')::date,(p_offer->>'stay_end')::date,p_offer->>'timezone') returning * into v_saved;
  return jsonb_build_object('id',v_saved.id,'status',v_saved.status);
end $$;
revoke all on function public.cabana_host_save_offer(jsonb,numeric) from public,anon;
grant execute on function public.cabana_host_save_offer(jsonb,numeric) to authenticated;

notify pgrst,'reload schema';
