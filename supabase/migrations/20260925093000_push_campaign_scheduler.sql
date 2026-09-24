-- Cabana · scheduled push campaigns actually fire
--
-- push_campaigns could be created from the console but nothing ever
-- called /api/push-send?action=cron, so a "scheduled" message waited
-- forever. The existing scheduler pattern (pg_cron → pg_net → API with
-- the shared cron secret) now covers it too. The job only reaches the
-- network when an active campaign is due, so an idle schedule costs a
-- single indexed query every ten minutes.

insert into cabana_ops.cron_config (key, value)
values ('push_campaigns_url', 'https://cabana.africa/api/push-send?action=cron')
on conflict (key) do update set value = excluded.value;

create index if not exists push_campaigns_active_due_idx
  on public.push_campaigns (send_at) where active;

create or replace function cabana_ops.trigger_push_campaigns()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.push_campaigns where active and send_at <= now()) then
    return;
  end if;
  select value into v_url from cabana_ops.cron_config where key = 'push_campaigns_url';
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

revoke all on function cabana_ops.trigger_push_campaigns() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'cabana-push-campaigns';
select cron.schedule('cabana-push-campaigns', '*/10 * * * *', 'select cabana_ops.trigger_push_campaigns()');
