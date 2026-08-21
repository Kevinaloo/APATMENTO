/* ════════════════════════════════════════════════════════════════════
   CABANA · SUPPORT, CALLS & LIFECYCLE EMAIL
   ────────────────────────────────────────────────────────────────────
   Cabana no longer publishes a phone number or a WhatsApp link. Every
   inbound conversation now lands inside the product, which means the
   product has to be able to hold one.

   A conversation is a THREAD. It starts with APA, who answers what she
   can from live platform data. When she cannot, or when the guest asks
   for a person, the thread ESCALATES: it joins a queue, the on-duty
   team is notified, and a human replies into the same thread the guest
   is already looking at. Nobody starts over.

   A CALL is a peer connection negotiated over a one-time channel. The
   row here is the ledger (who rang whom, when, for how long, how it
   ended); the audio never touches this database and no phone number is
   ever involved on either side.

   Email is logged, not fired blind. email_log is the idempotency key
   for lifecycle mail: a welcome sends once, a nudge sends once, and a
   retry after a timeout does not double-send. email_preferences is the
   consent record that keeps promotional mail lawful and quiet.

   RLS shape:
     · A signed-in guest reads and writes their own threads and messages.
     · An anonymous visitor has no direct table access at all. Their
       traffic is proxied by /api/support under the service role, keyed
       by an opaque guest token, so an anon key can never enumerate
       somebody else's conversation.
     · Admins (admin_users) read and write everything.
════════════════════════════════════════════════════════════════════ */

/* ── who is on the support desk ─────────────────────────────────────
   Same roster as admin_users. Named apart so a future "support agent
   who is not a full admin" is a row change, not a schema change. */
create or replace function public.is_support_agent()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

comment on function public.is_support_agent() is
  'True when the caller sits on the Cabana support desk. Currently the admin_users roster.';


/* ════════════════════════════════════════════════════════════════════
   1 · THREADS
════════════════════════════════════════════════════════════════════ */
create table if not exists public.support_threads (
  id               uuid primary key default gen_random_uuid(),

  -- Exactly one of these identifies the guest. user_id when signed in,
  -- guest_key (an opaque random token minted by the client and stored
  -- in localStorage) when not. A thread opened anonymously is adopted
  -- by the account when the same browser later signs in.
  user_id          uuid references auth.users(id) on delete set null,
  guest_key        text,

  -- Denormalised so the queue renders without a join to auth.
  display_name     text,
  email            text,

  subject          text,
  category         text not null default 'general',
  status           text not null default 'apa'
                   check (status in ('apa','queued','assigned','waiting','resolved','closed')),
  priority         text not null default 'normal'
                   check (priority in ('low','normal','high','urgent')),
  sentiment        text check (sentiment in ('happy','neutral','frustrated','angry')),

  assigned_to      uuid references auth.users(id) on delete set null,
  assigned_at      timestamptz,

  -- Escalation ledger. escalated_at is set once, the first time a human
  -- is genuinely needed; escalation_reason says why APA stepped back.
  escalated_at     timestamptz,
  escalation_reason text,
  apa_turns        integer not null default 0,
  apa_resolved     boolean not null default false,

  first_response_at timestamptz,
  resolved_at      timestamptz,
  resolution       text,
  csat             smallint check (csat between 1 and 5),
  csat_comment     text,

  last_message     text,
  last_message_at  timestamptz not null default now(),
  last_sender_role text,
  unread_user      integer not null default 0,
  unread_agent     integer not null default 0,

  -- Where the guest was standing when they opened the thread, and what
  -- APA already knows. Context survives navigation; see apa_sessions.
  origin_page      text,
  locale           text,
  meta             jsonb not null default '{}'::jsonb,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint support_threads_has_owner
    check (user_id is not null or guest_key is not null)
);

create index if not exists support_threads_user_idx
  on public.support_threads (user_id, last_message_at desc)
  where user_id is not null;
create index if not exists support_threads_guest_idx
  on public.support_threads (guest_key, last_message_at desc)
  where guest_key is not null;
-- The queue: everything a human still owes an answer on, newest first.
create index if not exists support_threads_queue_idx
  on public.support_threads (status, priority, last_message_at desc)
  where status in ('queued','assigned','waiting');
create index if not exists support_threads_assigned_idx
  on public.support_threads (assigned_to, last_message_at desc)
  where assigned_to is not null;

drop trigger if exists trg_support_threads_touch on public.support_threads;
create trigger trg_support_threads_touch
  before update on public.support_threads
  for each row execute function public.touch_updated_at();


/* ════════════════════════════════════════════════════════════════════
   2 · MESSAGES
════════════════════════════════════════════════════════════════════ */
create table if not exists public.support_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.support_threads(id) on delete cascade,

  -- 'user'   the guest
  -- 'apa'    the assistant
  -- 'agent'  a human on the desk
  -- 'system' state changes rendered inline (escalated, call started…)
  sender_role   text not null check (sender_role in ('user','apa','agent','system')),
  sender_id     uuid references auth.users(id) on delete set null,
  sender_name   text,

  body          text not null,

  -- What APA leaned on for this answer, so a wrong reply can be traced
  -- to the fact that produced it rather than guessed at afterwards.
  grounding     jsonb,
  confidence    numeric(4,3),
  intent        text,

  attachments   jsonb,
  meta          jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists support_messages_thread_idx
  on public.support_messages (thread_id, created_at);

/* Keep the thread header honest without a second round-trip from the
   client. Every insert updates the summary the queue reads. */
create or replace function public.support_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.support_threads t
     set last_message     = left(new.body, 280),
         last_message_at  = new.created_at,
         last_sender_role = new.sender_role,
         unread_user      = case when new.sender_role in ('agent','apa','system')
                                 then t.unread_user + 1 else t.unread_user end,
         unread_agent     = case when new.sender_role = 'user'
                                 then t.unread_agent + 1 else t.unread_agent end,
         apa_turns        = case when new.sender_role = 'apa'
                                 then t.apa_turns + 1 else t.apa_turns end,
         first_response_at = case
                               when t.first_response_at is null and new.sender_role = 'agent'
                               then new.created_at else t.first_response_at end,
         -- A human replying to a queued thread has, by replying, taken it.
         status = case
                    when new.sender_role = 'user' and t.status = 'waiting' then 'assigned'
                    when new.sender_role = 'agent' and t.status = 'queued' then 'assigned'
                    else t.status
                  end
   where t.id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_support_message_after_insert on public.support_messages;
create trigger trg_support_message_after_insert
  after insert on public.support_messages
  for each row execute function public.support_message_after_insert();


/* ════════════════════════════════════════════════════════════════════
   3 · EVENTS.  The audit trail behind the conversation.
════════════════════════════════════════════════════════════════════ */
create table if not exists public.support_events (
  id         bigserial primary key,
  thread_id  uuid references public.support_threads(id) on delete cascade,
  kind       text not null,
  actor_id   uuid references auth.users(id) on delete set null,
  actor_role text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_events_thread_idx
  on public.support_events (thread_id, created_at desc);
create index if not exists support_events_kind_idx
  on public.support_events (kind, created_at desc);


/* ════════════════════════════════════════════════════════════════════
   4 · KNOWLEDGE BASE.  What APA is allowed to state as fact.
   ────────────────────────────────────────────────────────────────────
   APA's other context is live inventory. This table is the settled
   policy half: fees, refunds, payouts, verification. Editing a row
   here changes what she says, immediately, with no deploy.
════════════════════════════════════════════════════════════════════ */
create table if not exists public.support_kb (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  topic       text not null,
  audience    text not null default 'guest'
              check (audience in ('guest','host','partner','all')),
  question    text not null,
  answer      text not null,
  keywords    text[] not null default '{}',
  route       text,
  priority    integer not null default 0,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists support_kb_active_idx
  on public.support_kb (active, priority desc) where active;
create index if not exists support_kb_keywords_idx
  on public.support_kb using gin (keywords);

drop trigger if exists trg_support_kb_touch on public.support_kb;
create trigger trg_support_kb_touch
  before update on public.support_kb
  for each row execute function public.touch_updated_at();


/* ════════════════════════════════════════════════════════════════════
   5 · CALLS.  The ledger. Audio is peer-to-peer and never lands here.
════════════════════════════════════════════════════════════════════ */
create table if not exists public.call_sessions (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid references public.support_threads(id) on delete set null,

  -- 'support'  guest ↔ Cabana desk
  -- 'host'     guest ↔ host on a booking
  kind           text not null default 'support'
                 check (kind in ('support','host','partner')),

  caller_id      uuid references auth.users(id) on delete set null,
  caller_key     text,
  caller_name    text,
  callee_id      uuid references auth.users(id) on delete set null,
  callee_name    text,

  -- The one-time realtime channel the two peers negotiate over. Random,
  -- unguessable, and useless once the call ends.
  channel        text not null unique,

  status         text not null default 'ringing'
                 check (status in ('ringing','connecting','active','ended','missed','declined','failed')),
  direction      text not null default 'outbound'
                 check (direction in ('outbound','inbound')),

  started_at     timestamptz not null default now(),
  answered_at    timestamptz,
  ended_at       timestamptz,
  duration_s     integer,
  end_reason     text,
  quality        jsonb,
  meta           jsonb not null default '{}'::jsonb
);

create index if not exists call_sessions_thread_idx
  on public.call_sessions (thread_id, started_at desc);
-- The ringing set. Small, hot, polled by the desk.
create index if not exists call_sessions_live_idx
  on public.call_sessions (status, started_at desc)
  where status in ('ringing','connecting','active');
create index if not exists call_sessions_caller_idx
  on public.call_sessions (caller_id, started_at desc)
  where caller_id is not null;


/* ════════════════════════════════════════════════════════════════════
   6 · EMAIL.  Log for idempotency, preferences for consent.
════════════════════════════════════════════════════════════════════ */
create table if not exists public.email_log (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete set null,
  recipient    text not null,
  template     text not null,
  sender       text not null,
  subject      text,

  -- The reason this send is unique. 'welcome:<uid>' sends once, ever;
  -- 'booking-receipt:<ref>' sends once per booking. Null means the send
  -- is deliberately repeatable (a broadcast, a re-sent receipt).
  dedupe_key   text unique,

  provider_id  text,
  status       text not null default 'sent'
               check (status in ('sent','failed','skipped','suppressed')),
  error        text,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists email_log_recipient_idx
  on public.email_log (lower(recipient), created_at desc);
create index if not exists email_log_template_idx
  on public.email_log (template, created_at desc);

create table if not exists public.email_preferences (
  -- Keyed by address, not user id: a partner we mail may not have an
  -- account yet, and an unsubscribe has to work either way.
  email            text primary key,
  user_id          uuid references auth.users(id) on delete set null,
  transactional    boolean not null default true,   -- receipts. Cannot be turned off.
  product          boolean not null default true,   -- product news, feature notes
  promotions       boolean not null default true,   -- offers, discounts
  partner_updates  boolean not null default true,   -- host & provider comms
  unsubscribe_token text not null default encode(gen_random_bytes(18), 'hex'),
  unsubscribed_at  timestamptz,
  updated_at       timestamptz not null default now()
);

create unique index if not exists email_preferences_token_idx
  on public.email_preferences (unsubscribe_token);

drop trigger if exists trg_email_prefs_touch on public.email_preferences;
create trigger trg_email_prefs_touch
  before update on public.email_preferences
  for each row execute function public.touch_updated_at();


/* ════════════════════════════════════════════════════════════════════
   7 · APA CONTINUITY
   ────────────────────────────────────────────────────────────────────
   apa_sessions already existed but had no way to find a session again
   after a page load, which is exactly the moment a conversation was
   being lost. A stable client-side key plus a thread link fixes that:
   APA reads the same row back on the next page and carries on.
════════════════════════════════════════════════════════════════════ */
alter table public.apa_sessions
  add column if not exists session_key text,
  add column if not exists thread_id   uuid references public.support_threads(id) on delete set null,
  add column if not exists context     jsonb not null default '{}'::jsonb,
  add column if not exists summary     text,
  add column if not exists last_route  text,
  add column if not exists turn_count  integer not null default 0,
  add column if not exists expires_at  timestamptz not null default (now() + interval '30 days');

create unique index if not exists apa_sessions_key_idx
  on public.apa_sessions (session_key) where session_key is not null;
create index if not exists apa_sessions_user_idx
  on public.apa_sessions (user_id, updated_at desc) where user_id is not null;
create index if not exists apa_sessions_expiry_idx
  on public.apa_sessions (expires_at);


/* ════════════════════════════════════════════════════════════════════
   8 · ROW LEVEL SECURITY
════════════════════════════════════════════════════════════════════ */
alter table public.support_threads    enable row level security;
alter table public.support_messages   enable row level security;
alter table public.support_events     enable row level security;
alter table public.support_kb         enable row level security;
alter table public.call_sessions      enable row level security;
alter table public.email_log          enable row level security;
alter table public.email_preferences  enable row level security;

/* ── threads ── */
drop policy if exists support_threads_owner_read on public.support_threads;
create policy support_threads_owner_read on public.support_threads
  for select to authenticated
  using (user_id = auth.uid() or public.is_support_agent());

drop policy if exists support_threads_owner_insert on public.support_threads;
create policy support_threads_owner_insert on public.support_threads
  for insert to authenticated
  with check (user_id = auth.uid());

/* A guest may close their own thread and leave a CSAT score. Everything
   else about a thread (status, assignment, priority) is the desk's. */
drop policy if exists support_threads_owner_update on public.support_threads;
create policy support_threads_owner_update on public.support_threads
  for update to authenticated
  using (user_id = auth.uid() or public.is_support_agent())
  with check (user_id = auth.uid() or public.is_support_agent());

/* ── messages ── */
drop policy if exists support_messages_read on public.support_messages;
create policy support_messages_read on public.support_messages
  for select to authenticated
  using (
    public.is_support_agent()
    or exists (
      select 1 from public.support_threads t
      where t.id = support_messages.thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists support_messages_write on public.support_messages;
create policy support_messages_write on public.support_messages
  for insert to authenticated
  with check (
    (public.is_support_agent() and sender_role in ('agent','system'))
    or (
      sender_role = 'user'
      and sender_id = auth.uid()
      and exists (
        select 1 from public.support_threads t
        where t.id = support_messages.thread_id and t.user_id = auth.uid()
      )
    )
  );

/* ── events: desk-only reading. A guest sees the conversation, not the
   machinery behind it. ── */
drop policy if exists support_events_admin on public.support_events;
create policy support_events_admin on public.support_events
  for select to authenticated using (public.is_support_agent());

/* ── knowledge base: public reading. It is the help centre. ── */
drop policy if exists support_kb_public_read on public.support_kb;
create policy support_kb_public_read on public.support_kb
  for select to anon, authenticated using (active);

drop policy if exists support_kb_admin_write on public.support_kb;
create policy support_kb_admin_write on public.support_kb
  for all to authenticated
  using (public.is_support_agent()) with check (public.is_support_agent());

/* ── calls ── */
drop policy if exists call_sessions_party_read on public.call_sessions;
create policy call_sessions_party_read on public.call_sessions
  for select to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid() or public.is_support_agent());

drop policy if exists call_sessions_agent_write on public.call_sessions;
create policy call_sessions_agent_write on public.call_sessions
  for update to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid() or public.is_support_agent())
  with check (caller_id = auth.uid() or callee_id = auth.uid() or public.is_support_agent());

/* ── email: the log is operational, never client-readable. Preferences
   are readable and editable by the account that owns the address. ── */
drop policy if exists email_log_admin on public.email_log;
create policy email_log_admin on public.email_log
  for select to authenticated using (public.is_support_agent());

drop policy if exists email_prefs_owner on public.email_preferences;
create policy email_prefs_owner on public.email_preferences
  for select to authenticated
  using (user_id = auth.uid()
         or lower(email) = lower(auth.jwt() ->> 'email')
         or public.is_support_agent());

drop policy if exists email_prefs_owner_update on public.email_preferences;
create policy email_prefs_owner_update on public.email_preferences
  for update to authenticated
  using (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'))
  with check (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email'));

/* apa_sessions already has RLS enabled upstream; make sure the owner
   can read their own row back after a navigation. */
alter table public.apa_sessions enable row level security;
drop policy if exists apa_sessions_owner on public.apa_sessions;
create policy apa_sessions_owner on public.apa_sessions
  for select to authenticated
  using (user_id = auth.uid() or public.is_support_agent());


/* ════════════════════════════════════════════════════════════════════
   9 · REALTIME
   A live thread should not need polling for a signed-in guest.
════════════════════════════════════════════════════════════════════ */
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.support_messages';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.support_threads';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.call_sessions';
    exception when duplicate_object then null; end;
  end if;
end $$;

alter table public.support_messages replica identity full;
alter table public.support_threads  replica identity full;
alter table public.call_sessions    replica identity full;


/* ════════════════════════════════════════════════════════════════════
   10 · DESK METRICS.  One call, the numbers the console shows.
════════════════════════════════════════════════════════════════════ */
create or replace function public.support_desk_stats()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when public.is_support_agent() then jsonb_build_object(
    'queued',      (select count(*) from public.support_threads where status = 'queued'),
    'assigned',    (select count(*) from public.support_threads where status = 'assigned'),
    'waiting',     (select count(*) from public.support_threads where status = 'waiting'),
    'live_calls',  (select count(*) from public.call_sessions
                     where status in ('ringing','connecting','active')),
    'today_new',   (select count(*) from public.support_threads
                     where created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi')),
    'today_apa_resolved', (select count(*) from public.support_threads
                     where apa_resolved
                       and created_at >= date_trunc('day', now() at time zone 'Africa/Nairobi')),
    'median_first_response_s', (
       select coalesce(round(percentile_cont(0.5) within group (
                order by extract(epoch from (first_response_at - created_at)))), 0)
       from public.support_threads
       where first_response_at is not null and created_at >= now() - interval '7 days'),
    'csat_7d', (
       select coalesce(round(avg(csat)::numeric, 2), 0)
       from public.support_threads
       where csat is not null and created_at >= now() - interval '7 days')
  ) else jsonb_build_object('error','forbidden') end;
$$;

revoke all on function public.support_desk_stats() from public, anon;
grant execute on function public.support_desk_stats() to authenticated;
revoke all on function public.is_support_agent() from public, anon;
grant execute on function public.is_support_agent() to authenticated;
