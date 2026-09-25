-- Console stress fixes (live stress test, 25 Sep 2026)
--
-- 1 · Cabana Match was unreadable for everyone. Its admin policies looked
--     the caller up in auth.users, which the authenticated role cannot
--     read. Postgres evaluates every permissive policy, so the error broke
--     guests and hosts too, not just the console. Use is_admin(), which
--     reads the JWT email and is SECURITY DEFINER.
--
-- 2 · admin_overview and admin_finance referenced the cabana_admin.bookings
--     union nine and five times. Planning that seven-way union costs ~9ms
--     each time against ~0.4ms to run it, so twenty operators refreshing
--     at once saturated the database and hit the 8s statement timeout.
--     Both now scan it once through a materialized CTE. Output is
--     byte-identical (verified by hashing before and after).

drop policy if exists admin_read_requests  on public.cabana_match_requests;
drop policy if exists admin_read_responses on public.cabana_match_responses;
drop policy if exists admin_read_interest  on public.cabana_interest;
drop policy if exists admin_read_opt_ins   on public.cabana_host_opt_ins;
drop policy if exists admin_update_opt_ins on public.cabana_host_opt_ins;
drop policy if exists admin_delete_opt_ins on public.cabana_host_opt_ins;

create policy admin_read_requests  on public.cabana_match_requests  for select to authenticated using (public.is_admin());
create policy admin_read_responses on public.cabana_match_responses for select to authenticated using (public.is_admin());
create policy admin_read_interest  on public.cabana_interest        for select to authenticated using (public.is_admin());
create policy admin_read_opt_ins   on public.cabana_host_opt_ins    for select to authenticated using (public.is_admin());
create policy admin_update_opt_ins on public.cabana_host_opt_ins    for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_delete_opt_ins on public.cabana_host_opt_ins    for delete to authenticated using (public.is_admin());

create or replace function public.admin_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 730));
  v_now  timestamptz := now();
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 730)));
  v_prev timestamptz := now() - make_interval(days => 2 * greatest(1, least(coalesce(p_days, 30), 730)));
  v_tz   text := 'Africa/Nairobi';
  out jsonb;
begin
  perform cabana_admin.guard();

  -- One scan of the bookings union, planned once. Referencing the view
  -- nine times cost ~9ms of planning each, which dominated under load.
  with bk as materialized (select * from cabana_admin.bookings),
  b as (select * from bk where created_at >= v_prev),
  cur as (select * from b where created_at >= v_from),
  prv as (select * from b where created_at <  v_from),
  k as (
    select
      (select count(*) from cur)                                                        as bookings,
      (select count(*) from prv)                                                        as bookings_prev,
      (select count(*) from cur where stage in ('secured','fulfilled'))                 as secured,
      (select count(*) from prv where stage in ('secured','fulfilled'))                 as secured_prev,
      (select coalesce(sum(total),0) from cur where stage in ('secured','fulfilled'))   as gmv,
      (select coalesce(sum(total),0) from prv where stage in ('secured','fulfilled'))   as gmv_prev,
      (select coalesce(sum(fee),0)   from cur where stage in ('secured','fulfilled'))   as revenue,
      (select coalesce(sum(fee),0)   from prv where stage in ('secured','fulfilled'))   as revenue_prev,
      (select coalesce(sum(paid),0)  from cur)                                          as collected,
      (select coalesce(sum(paid),0)  from prv)                                          as collected_prev,
      (select coalesce(sum(total),0) from cur)                                          as demand,
      (select count(*) from public.profiles where created_at >= v_from)                 as signups,
      (select count(*) from public.profiles where created_at >= v_prev and created_at < v_from) as signups_prev,
      (select count(*) from public.listings where created_at >= v_from and deleted_at is null) as listings_new,
      (select count(*) from public.listings where created_at >= v_prev and created_at < v_from and deleted_at is null) as listings_new_prev,
      (select count(distinct visitor_id) from public.site_visits where created_at >= v_from) as visitors,
      (select count(distinct visitor_id) from public.site_visits where created_at >= v_prev and created_at < v_from) as visitors_prev
  )
  select jsonb_build_object(
    'range', jsonb_build_object('days', v_days, 'from', v_from, 'to', v_now),
    'kpis', (select to_jsonb(k) from k),
    'totals', jsonb_build_object(
      'users',          (select count(*) from public.profiles),
      'hosts',          (select count(distinct partner_id) from public.listings
                          where partner_id is not null and deleted_at is null
                            and coalesce(status,'') not in ('deleted','removed')),
      'live_listings',  (select count(*) from public.listings
                          where is_active and status = 'active' and deleted_at is null),
      'all_listings',   (select count(*) from public.listings
                          where deleted_at is null and coalesce(status,'') not in ('deleted','removed')),
      'live_tours',     (select count(*) from public.tours where status = 'published'),
      'live_events',    (select count(*) from public.events where status = 'published' and (ends_at is null or ends_at > v_now)),
      'fleet',          (select count(*) from public.car_fleet where status = 'active'),
      'push_subscribers', (select count(*) from public.push_subscriptions),
      'bookings_all',   (select count(*) from bk),
      'collected_all',  (select coalesce(sum(paid),0) from bk)
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'd', d.day::date,
               'bookings',  coalesce(bs.n, 0),
               'secured',   coalesce(bs.s, 0),
               'gmv',       coalesce(bs.gmv, 0),
               'collected', coalesce(bs.paid, 0),
               'revenue',   coalesce(bs.fee, 0),
               'signups',   coalesce(su.n, 0),
               'visitors',  coalesce(vi.n, 0)
             ) order by d.day), '[]'::jsonb)
        from generate_series((v_from at time zone v_tz)::date, (v_now at time zone v_tz)::date, interval '1 day') as d(day)
        left join (
          select (created_at at time zone v_tz)::date as day,
                 count(*) as n,
                 count(*) filter (where stage in ('secured','fulfilled')) as s,
                 sum(total) filter (where stage in ('secured','fulfilled')) as gmv,
                 sum(fee)   filter (where stage in ('secured','fulfilled')) as fee,
                 sum(paid) as paid
            from bk where created_at >= v_from group by 1
        ) bs on bs.day = d.day::date
        left join (
          select (created_at at time zone v_tz)::date as day, count(*) as n
            from public.profiles where created_at >= v_from group by 1
        ) su on su.day = d.day::date
        left join (
          select (created_at at time zone v_tz)::date as day, count(distinct visitor_id) as n
            from public.site_visits where created_at >= v_from group by 1
        ) vi on vi.day = d.day::date
    ),
    'services', (
      select coalesce(jsonb_agg(x order by x->>'service'), '[]'::jsonb) from (
        select jsonb_build_object(
                 'service', service,
                 'bookings', count(*),
                 'secured', count(*) filter (where stage in ('secured','fulfilled')),
                 'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
                 'collected', coalesce(sum(paid),0),
                 'revenue', coalesce(sum(fee) filter (where stage in ('secured','fulfilled')),0)) as x
          from bk where created_at >= v_from group by service
      ) s
    ),
    -- Every step is a measured event. The session layer's listing and
    -- checkout counters are not populated in production, so the funnel is
    -- built from page visits and bookings, which are.
    'funnel', jsonb_build_array(
      jsonb_build_object('label','Visitors', 'value',
        (select count(distinct visitor_id) from public.site_visits where created_at >= v_from)),
      jsonb_build_object('label','Explored a service', 'value',
        (select count(distinct visitor_id) from public.site_visits where created_at >= v_from
            and split_part(split_part(page,'?',1),'#',1) ~* '^/(apartments|events|tours|roommates|carhire|food|shopping|rides|flights|restaurant|order|cabana|world|destinations)(\.html)?/?$')),
      jsonb_build_object('label','Signed in', 'value',
        (select count(distinct user_id) from public.site_visits where created_at >= v_from and user_id is not null)),
      jsonb_build_object('label','Booked', 'value',
        (select count(*) from bk where created_at >= v_from)),
      jsonb_build_object('label','Paid', 'value',
        (select count(*) from bk where created_at >= v_from and stage in ('secured','fulfilled')))
    ),
    'top_listings', (
      select coalesce(jsonb_agg(t order by (t->>'gmv')::numeric desc, (t->>'bookings')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('service', service, 'item_id', item_id, 'title', max(item_title),
                                  'bookings', count(*),
                                  'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
                                  'collected', coalesce(sum(paid),0)) as t
          from bk where created_at >= v_from and item_id is not null
         group by service, item_id
         order by coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0) desc, count(*) desc
         limit 6
      ) q
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', src, 'visitors', n) order by n desc), '[]'::jsonb) from (
        select coalesce(nullif(source,''), case when coalesce(referrer,'') = '' then 'direct' else 'referral' end) as src,
               count(distinct visitor_id) as n
          from public.site_visits where created_at >= v_from
         group by 1 order by 2 desc limit 8
      ) s
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', dev, 'visitors', n) order by n desc), '[]'::jsonb) from (
        select coalesce(nullif(device_type,''), 'unknown') as dev, count(distinct visitor_id) as n
          from public.site_visits where created_at >= v_from group by 1
      ) s
    ),
    'recent', (
      select coalesce(jsonb_agg(r order by (r->>'at') desc), '[]'::jsonb) from (
        (select jsonb_build_object('kind','booking','at',created_at,'service',service,'id',id,'ref',ref,
                                   'title',item_title,'who',guest_name,'amount',total,'status',status,'stage',stage) as r
           from bk order by created_at desc limit 8)
        union all
        (select jsonb_build_object('kind','signup','at',p.created_at,'id',p.id,
                                   'title',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''), split_part(p.email,'@',1), 'New member'),
                                   'who',p.email) from public.profiles p order by p.created_at desc limit 6)
        union all
        (select jsonb_build_object('kind','listing','at',l.created_at,'id',l.id,'title',l.title,'who',l.city,
                                   'service',l.service,'status',l.status) from public.listings l
          where l.deleted_at is null order by l.created_at desc limit 6)
      ) q
    )
  ) into out;

  return out;
end;
$$;

create or replace function public.admin_finance(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days,30), 730)));
  v_tz text := 'Africa/Nairobi';
begin
  perform cabana_admin.guard();
  return (with bk as materialized (select * from cabana_admin.bookings)
  select jsonb_build_object(
    'range', jsonb_build_object('days', p_days, 'from', v_from),
    'summary', (select jsonb_build_object(
        'demand',    coalesce(sum(total),0),
        'gmv',       coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
        'revenue',   coalesce(sum(fee)   filter (where stage in ('secured','fulfilled')),0),
        'collected', coalesce(sum(paid),0),
        'outstanding', coalesce(sum(greatest(total - paid,0)) filter (where stage = 'secured'),0),
        'bookings',  count(*),
        'secured',   count(*) filter (where stage in ('secured','fulfilled')),
        'lost',      count(*) filter (where stage = 'lost'))
       from bk where created_at >= v_from),
    'by_service', (select coalesce(jsonb_agg(x order by x->>'service'), '[]'::jsonb) from (
        select jsonb_build_object(
          'service', service, 'bookings', count(*),
          'gmv', coalesce(sum(total) filter (where stage in ('secured','fulfilled')),0),
          'revenue', coalesce(sum(fee) filter (where stage in ('secured','fulfilled')),0),
          'collected', coalesce(sum(paid),0)) as x
         from bk where created_at >= v_from group by service) s),
    'cash_series', (select coalesce(jsonb_agg(jsonb_build_object('d', d.day::date, 'paid', coalesce(p.amount,0), 'failed', coalesce(p.failed,0)) order by d.day), '[]'::jsonb)
       from generate_series((v_from at time zone v_tz)::date, (now() at time zone v_tz)::date, interval '1 day') d(day)
       left join (select (coalesce(paid_at, created_at) at time zone v_tz)::date as day,
                         sum(amount) filter (where status = 'paid') as amount,
                         count(*) filter (where status = 'failed') as failed
                    from public.booking_payments where coalesce(paid_at, created_at) >= v_from group by 1) p on p.day = d.day::date),
    'payments', (select jsonb_build_object(
        'paid', count(*) filter (where status = 'paid'),
        'failed', count(*) filter (where status = 'failed'),
        'expired', count(*) filter (where status = 'expired'),
        'pending', count(*) filter (where status not in ('paid','failed','expired')),
        'paid_amount', coalesce(sum(amount) filter (where status = 'paid'),0),
        'methods', (select coalesce(jsonb_object_agg(m, n), '{}'::jsonb) from
                     (select coalesce(payment_method,'unknown') m, count(*) n from public.booking_payments
                       where created_at >= v_from group by 1) mm))
       from public.booking_payments where created_at >= v_from),
    'liabilities', jsonb_build_object(
        'refunds_due',       (select coalesce(sum(refund_due),0) from bk),
        'refunds_due_count', (select count(*) from bk where refund_due > 0),
        'credit_points',     (select coalesce(sum(available_points),0) from public.user_points),
        'credit_holders',    (select count(*) from public.user_points where available_points > 0),
        'withdrawals_pending', (select coalesce(sum(amount_kes),0) from public.referral_withdrawals where status = 'pending'),
        'withdrawals_count',   (select count(*) from public.referral_withdrawals where status = 'pending'),
        'commissions_pending', (select coalesce(sum(commission_kes),0) from public.referral_earnings where status in ('pending','pending_checkin','held')),
        'commissions_available', (select coalesce(sum(commission_kes),0) from public.referral_earnings where status in ('available','cleared','approved')),
        'float_balance',     public.float_balance()),
    'withdrawals', (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'amount',w.amount_kes,'mpesa',w.mpesa_number,'status',w.status,
                                   'notes',w.notes,'created_at',w.created_at,'user_id',w.user_id,
                                   'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Member'),
                                   'email',p.email) order by (w.status = 'pending') desc, w.created_at desc), '[]'::jsonb)
                      from (select * from public.referral_withdrawals order by created_at desc limit 100) w
                      left join public.profiles p on p.id = w.user_id),
    'refunds', (select coalesce(jsonb_agg(to_jsonb(r) - 'source_table' order by r.created_at desc), '[]'::jsonb)
                  from (select * from bk where refund_due > 0 order by created_at desc limit 100) r),
    'credit_top', (select coalesce(jsonb_agg(jsonb_build_object('user_id',u.user_id,'points',u.available_points,'lifetime',u.lifetime_points,
                                   'name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.email,'Member'),'email',p.email)
                                   order by u.available_points desc), '[]'::jsonb)
                     from (select * from public.user_points where available_points > 0 order by available_points desc limit 25) u
                     left join public.profiles p on p.id = u.user_id)
  ));
end;
$$;

-- 3 · pg_cron keeps every run forever. The food-order sweep alone adds
--     1,440 rows a day, and System health counts them per job. Keep two
--     weeks, which is more than the console ever shows.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cabana-cron-history-trim') then
    perform cron.unschedule('cabana-cron-history-trim');
  end if;
  perform cron.schedule('cabana-cron-history-trim', '41 2 * * *',
    $q$delete from cron.job_run_details where coalesce(end_time, start_time) < now() - interval '14 days'$q$);
end $$;
