-- Run time-sensitive match-offer expiry from Supabase pg_cron. Vercel Hobby
-- permits only daily schedules, while these offers must be resolved hourly.
-- The HTTP call reuses the protected scheduler secret already provisioned for
-- calendar sync; no credential is embedded in this migration.

insert into cabana_ops.cron_config (key, value)
values ('match_offer_expiry_url', 'https://cabana.africa/api/utilities?action=expire-match-offers')
on conflict (key) do update
set value = excluded.value, updated_at = now();

create or replace function cabana_ops.trigger_match_offer_expiry()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from cabana_ops.cron_config where key = 'match_offer_expiry_url';
  select value into v_secret from cabana_ops.cron_config where key = 'cron_secret';

  if v_url is null or v_secret is null or v_secret = '' then
    return;
  end if;

  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'User-Agent', 'Cabana-Scheduler/1.0'),
    timeout_milliseconds := 55000
  );
end;
$$;

revoke all on function cabana_ops.trigger_match_offer_expiry() from public, anon, authenticated;

select cron.unschedule('cabana-match-offer-expiry')
where exists (select 1 from cron.job where jobname = 'cabana-match-offer-expiry');

select cron.schedule(
  'cabana-match-offer-expiry',
  '7 * * * *',
  $job$select cabana_ops.trigger_match_offer_expiry()$job$
);
