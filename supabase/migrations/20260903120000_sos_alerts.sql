/* ════════════════════════════════════════════════════════════════════
   CABANA · SOS ALERTS
   ────────────────────────────────────────────────────────────────────
   Someone pressing SOS is, by assumption, in trouble. Until now that
   button rendered a list of public emergency numbers and — for the two
   rows that say "Cabana" — linked to /help.html. Nothing was recorded,
   nobody was paged, and no ticket existed. If a guest pressed it at
   02:00 we would learn about it whenever somebody next opened the
   console.

   This table is the ledger. One row per press, written before any
   notification is attempted, so an alert survives a mail outage, a push
   outage, or a lambda dying halfway through the fan-out. The console
   reads this table; the notifications are best-effort on top of it.

   Deliberately NOT nullable-everything: an alert with no category and
   no location is still an alert and must still page the desk.
════════════════════════════════════════════════════════════════════ */

create table if not exists public.sos_alerts (
  id             uuid primary key default gen_random_uuid(),

  -- Who. Same dual-identity rule as support_threads: user_id when signed
  -- in, guest_key when not. An SOS from a signed-out browser is still an
  -- SOS and must not be dropped for want of an account.
  user_id        uuid references auth.users(id) on delete set null,
  guest_key      text,
  display_name   text,
  email          text,
  phone          text,

  -- What kind of emergency the person selected.
  category       text not null default 'support'
                 check (category in ('medical','police','fire','security','roadside','support')),

  -- Where. Captured at the highest accuracy the device would give us.
  -- accuracy_m is the radius the browser reports; a 2000m accuracy is a
  -- cell-tower fix and the console must show it as such rather than
  -- drawing a confident pin on the wrong street.
  latitude       double precision,
  longitude      double precision,
  accuracy_m     double precision,
  altitude_m     double precision,
  heading_deg    double precision,
  speed_ms       double precision,
  fixed_at       timestamptz,
  location_source text check (location_source in ('gps','cache','ip','manual','none')),
  place_label    text,

  -- Context that makes the alert actionable without a conversation.
  note           text,
  origin_page    text,
  user_agent     text,

  -- The support thread this alert opened, so the desk answers in the
  -- same place the guest is already looking.
  thread_id      uuid references public.support_threads(id) on delete set null,

  -- Lifecycle. acknowledged_at is the number that matters: it is our
  -- time-to-human, and it is the thing to alarm on.
  status         text not null default 'open'
                 check (status in ('open','acknowledged','resolved','false_alarm')),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at    timestamptz,
  resolution     text,

  -- Which fan-out legs actually succeeded. Written after the attempt so
  -- a silent delivery failure is visible instead of assumed.
  notified       jsonb not null default '{}'::jsonb,
  meta           jsonb not null default '{}'::jsonb,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint sos_alerts_has_owner
    check (user_id is not null or guest_key is not null)
);

comment on table public.sos_alerts is
  'One row per SOS press. Written before notification fan-out so an alert survives a mail or push outage.';
comment on column public.sos_alerts.accuracy_m is
  'Reported radius in metres. Large values mean a tower or IP fix, not a GPS lock. Show it, do not hide it.';
comment on column public.sos_alerts.acknowledged_at is
  'Time-to-human. This is the operational metric for the safety desk.';

/* The queue: everything nobody has picked up yet, oldest first. Oldest
   first is deliberate — an unacknowledged alert gets more urgent with
   age, not less, which is the opposite of the support queue. */
create index if not exists sos_alerts_open_idx
  on public.sos_alerts (created_at)
  where status = 'open';

create index if not exists sos_alerts_user_idx
  on public.sos_alerts (user_id, created_at desc)
  where user_id is not null;

create index if not exists sos_alerts_guest_idx
  on public.sos_alerts (guest_key, created_at desc)
  where guest_key is not null;

create index if not exists sos_alerts_thread_idx
  on public.sos_alerts (thread_id)
  where thread_id is not null;

drop trigger if exists trg_sos_alerts_touch on public.sos_alerts;
create trigger trg_sos_alerts_touch
  before update on public.sos_alerts
  for each row execute function public.touch_updated_at();

/* Stamp the lifecycle timestamps rather than trusting a client to. */
create or replace function public.sos_alert_stamp()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'acknowledged' and old.status = 'open' and new.acknowledged_at is null then
    new.acknowledged_at := now();
  end if;
  if new.status in ('resolved','false_alarm') and new.resolved_at is null then
    new.resolved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sos_alert_stamp on public.sos_alerts;
create trigger trg_sos_alert_stamp
  before update on public.sos_alerts
  for each row execute function public.sos_alert_stamp();


/* ════════════════════════════════════════════════════════════════════
   RLS
   A person may read their own alerts. Only the support desk may read
   the queue or change status. Inserts arrive through the service role
   from /api/sos-alert, never straight from the browser, so that an
   alert cannot be forged against another account.
════════════════════════════════════════════════════════════════════ */
alter table public.sos_alerts enable row level security;

drop policy if exists sos_alerts_own_read on public.sos_alerts;
create policy sos_alerts_own_read on public.sos_alerts
  for select using (user_id = auth.uid());

drop policy if exists sos_alerts_desk_read on public.sos_alerts;
create policy sos_alerts_desk_read on public.sos_alerts
  for select using (public.is_support_agent());

drop policy if exists sos_alerts_desk_write on public.sos_alerts;
create policy sos_alerts_desk_write on public.sos_alerts
  for update using (public.is_support_agent())
  with check (public.is_support_agent());


/* ════════════════════════════════════════════════════════════════════
   The support thread an SOS opens is categorised 'sos'. The category
   column is free text, so nothing to alter — this comment exists so the
   next person greping for 'sos' finds the contract.

   Threads opened this way are always priority 'urgent' and status
   'queued': APA does not triage an emergency.
════════════════════════════════════════════════════════════════════ */
