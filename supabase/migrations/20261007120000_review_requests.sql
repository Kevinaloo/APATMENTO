-- ════════════════════════════════════════════════════════════════════
--  Cabana · ask both sides for their private review after a stay
--  ──────────────────────────────────────────────────────────────────
--  Private two-way reviews existed, but nothing ever asked anyone to
--  write one: the guest form vanished the night after checkout and
--  hosts had no form at all. /api/utilities?action=review-requests now
--  sends a short request to the guest and the host on checkout evening,
--  a reminder after five days and a last call before the 30-day window
--  closes, never to someone who has already written theirs.
--
--  Same scheduler pattern as push campaigns: pg_cron → pg_net → API,
--  authorised with the shared cron secret in cabana_ops.cron_config.
--  18:00 Nairobi is 15:00 UTC.
-- ════════════════════════════════════════════════════════════════════

insert into cabana_ops.cron_config (key, value)
values ('review_requests_url', 'https://cabana.africa/api/utilities?action=review-requests')
on conflict (key) do update set value = excluded.value;

-- The sender dedupes on notifications it already wrote; keep that read cheap.
create index if not exists notifications_review_recent_idx
  on public.notifications (created_at)
  where kind = 'review';

create or replace function cabana_ops.trigger_review_requests()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_url text;
  v_secret text;
begin
  -- Only reach the network when a stay ended inside the review window.
  if not exists (
    select 1 from public.apartment_bookings
     where cancelled_at is null
       and checkout_date between (now() at time zone 'Africa/Nairobi')::date - 29
                             and (now() at time zone 'Africa/Nairobi')::date
       and (status in ('checked_in', 'completed') or checked_in_at is not null)
  ) then
    return;
  end if;
  select value into v_url from cabana_ops.cron_config where key = 'review_requests_url';
  select value into v_secret from cabana_ops.cron_config where key = 'cron_secret';
  if v_url is null or v_secret is null or v_secret = '' then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json',
      'User-Agent', 'Cabana-Scheduler/1.0'),
    timeout_milliseconds := 55000
  );
end;
$$;

revoke all on function cabana_ops.trigger_review_requests() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'cabana-review-requests';
select cron.schedule('cabana-review-requests', '0 15 * * *', 'select cabana_ops.trigger_review_requests()');
