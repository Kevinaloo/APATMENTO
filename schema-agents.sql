-- ═══════════════════════════════════════════════════════════════════════════
-- APATMENTO · AGENT NETWORK SCHEMA  v2
-- ─────────────────────────────────────────────────────────────────────────
-- Replaces the admin-gated "programme" model with a host-governed one.
--
-- The old model made Apatmento the gatekeeper. That was wrong. Apatmento
-- does not know which agents a host trusts. The host does.
--
-- Three principles:
--
--   1. AGENTS SELF-SERVE. Signing up as an agent is instant. No queue, no
--      admin. What an agent CANNOT do without a host's blessing is earn.
--      Access is free; trust is earned, and it is earned from the host.
--
--   2. THE HOST SETS THE PRICE. Commission is negotiated per listing,
--      between the two people who actually have a stake in it. Apatmento
--      records the agreement and enforces it. It does not set it.
--
--   3. IDENTITY IS A DEADLINE, NOT A GATE. A new agent has 30 days of full
--      access to upload an ID. Miss it, and the account soft-locks —
--      partnerships freeze, links stop attributing. Nothing is deleted.
--      Verify late and everything resumes.
--
-- Fake listings exist because agents cannot see real availability, so they
-- promise a unit, lose it, and substitute another. Give the agent a live
-- calendar for every listing they represent and the incentive evaporates.
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0 · DECOMMISSION THE OLD ADMIN-GATED PROGRAMME ────────────────────────
-- We keep the tables (audit trail, historical earnings) but strip them of
-- authority. Nothing new writes here. The API routes are gone.
--
-- If you want them truly gone after you've migrated, uncomment:
--   drop view  if exists public.v_programme_queue cascade;
--   drop table if exists public.programme_applications cascade;
--   drop table if exists public.programme_commission_defaults cascade;
--
-- Until then, mark them so nobody wires them back in by accident.

do $$
begin
  if to_regclass('public.programme_applications') is not null then
    execute $x$ comment on table public.programme_applications is
      'DEPRECATED v2 · admin approval no longer exists. Read-only history.' $x$;
    -- Revoke insert so a stale client cannot queue an application.
    execute 'revoke insert on public.programme_applications from anon, authenticated';
  end if;

  if to_regclass('public.programme_commission_defaults') is not null then
    execute $x$ comment on table public.programme_commission_defaults is
      'DEPRECATED v2 · commission is set by the host, per listing.' $x$;
  end if;
end $$;


-- ── 1 · AGENTS ────────────────────────────────────────────────────────────
-- One row per agent, created the moment they sign up. The auth account
-- already exists — this is the professional profile hanging off it.
--
-- kyc_deadline is computed on insert, never touched again. Extending it is
-- an explicit admin act, logged. The countdown is honest.

create table if not exists public.agents (
  id                  uuid primary key references auth.users (id) on delete cascade,

  -- identity as claimed
  full_name           text        not null,
  email               text        not null unique,
  phone               text,
  contact_method      text        not null default 'whatsapp'
                      check (contact_method in ('whatsapp','call','sms','email')),
  contact_value       text        not null,
  bio                 text,
  avatar_url          text,

  -- the public handle. Appears to hosts and, when a guest lands on a
  -- referral link, to the guest: "Referred by Agent Kevin".
  slug                text        not null unique,
  referral_code       text        not null unique,

  -- optional creator surface — an influencer is an agent with an audience
  is_creator          boolean     not null default false,
  social_handle       text,
  social_platform     text,
  audience_size       integer,

  -- ── verification lifecycle ──────────────────────────────────────────
  -- unverified → submitted → verified
  --                     └───→ rejected (resubmit allowed)
  -- unverified + past deadline = restricted (derived, see agent_status())
  kyc_status          text        not null default 'unverified'
                      check (kyc_status in ('unverified','submitted','verified','rejected')),
  kyc_deadline        timestamptz not null default (now() + interval '30 days'),
  kyc_submitted_at    timestamptz,
  kyc_verified_at     timestamptz,
  kyc_reviewed_by     uuid        references auth.users (id) on delete set null,
  kyc_reject_reason   text,

  -- ── moderation ───────────────────────────────────────────────────────
  -- Hosts report. Reports accumulate. Three strikes and a human looks.
  report_count        integer     not null default 0,
  suspended           boolean     not null default false,
  suspended_at        timestamptz,
  suspension_reason   text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_agents_slug     on public.agents (slug);
create index if not exists idx_agents_code     on public.agents (referral_code);
create index if not exists idx_agents_kyc      on public.agents (kyc_status);
create index if not exists idx_agents_deadline on public.agents (kyc_deadline)
  where kyc_status in ('unverified','rejected');


-- ── 2 · IDENTITY DOCUMENTS ────────────────────────────────────────────────
-- Stored in a private bucket. The `path` is the truth; `url` is a signed
-- convenience that expires. Never make this bucket public.

create table if not exists public.agent_documents (
  id            bigserial primary key,
  agent_id      uuid not null references public.agents (id) on delete cascade,
  doc_type      text not null check (doc_type in ('national_id','passport','selfie')),
  storage_path  text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_at   timestamptz not null default now()
);

create index if not exists idx_agentdoc_agent on public.agent_documents (agent_id);


-- ── 3 · PARTNERSHIPS · the heart of the model ─────────────────────────────
-- An agent asks a host for permission to represent ONE listing, and proposes
-- a rate. The host counters, accepts, or refuses. Nothing is implied and
-- nothing is global: an agent approved on a host's Kilimani flat has no
-- standing on that same host's Westlands flat.
--
-- commission_pct and commission_flat are mutually exclusive — enforced.
-- A host who wants "KES 1,500 a booking" should not be forced into a
-- percentage that drifts with the nightly rate.

create table if not exists public.agent_partnerships (
  id                  bigserial primary key,
  agent_id            uuid not null references public.agents (id)   on delete cascade,
  listing_id          text not null,
  host_id             uuid not null references auth.users (id)      on delete cascade,

  status              text not null default 'pending'
                      check (status in ('pending','approved','declined','revoked','paused')),

  -- what the agent asked for
  requested_pct       numeric(5,2) check (requested_pct  >= 0 and requested_pct  <= 100),
  agent_message       text,

  -- what the host actually granted. Exactly one of these is non-null
  -- once approved. This is the number that gets deducted.
  commission_pct      numeric(5,2) check (commission_pct >= 0 and commission_pct <= 100),
  commission_flat     numeric(12,2) check (commission_flat >= 0),

  host_message        text,
  decline_reason      text,

  requested_at        timestamptz not null default now(),
  responded_at        timestamptz,
  revoked_at          timestamptz,

  -- one live request per agent per listing
  constraint uq_partnership unique (agent_id, listing_id),

  -- an approved partnership must carry exactly one commission shape
  constraint ck_commission_shape check (
    status <> 'approved'
    or (commission_pct is not null) <> (commission_flat is not null)
  )
);

create index if not exists idx_part_agent   on public.agent_partnerships (agent_id, status);
create index if not exists idx_part_host    on public.agent_partnerships (host_id, status);
create index if not exists idx_part_listing on public.agent_partnerships (listing_id);
create index if not exists idx_part_pending on public.agent_partnerships (host_id)
  where status = 'pending';


-- ── 4 · REPORTS ───────────────────────────────────────────────────────────
-- A host's defence against the agent who applies to forty listings a day.
-- Reporting auto-declines the request; it does not need a separate click.

create table if not exists public.agent_reports (
  id             bigserial primary key,
  agent_id       uuid not null references public.agents (id) on delete cascade,
  reported_by    uuid not null references auth.users (id)    on delete cascade,
  partnership_id bigint       references public.agent_partnerships (id) on delete set null,
  listing_id     text,
  reason         text not null
                 check (reason in ('spam','impersonation','misleading','abusive','other')),
  detail         text,
  status         text not null default 'open'
                 check (status in ('open','upheld','dismissed')),
  reviewed_by    uuid         references auth.users (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),

  -- a host reports a given agent once. Repeat grievances go in `detail`.
  constraint uq_report unique (agent_id, reported_by)
);

create index if not exists idx_rep_agent  on public.agent_reports (agent_id);
create index if not exists idx_rep_status on public.agent_reports (status);


-- ── 5 · REFERRALS · the pending-guest ledger ──────────────────────────────
-- Created when a guest lands on /?ref=CODE&listing=ID. Lives 30 days.
-- Converts to `converted` when that guest books THAT listing.
--
-- Attribution is listing-scoped on purpose. An agent who sends a guest to
-- listing A and gets a booking on listing B earns nothing on B — because
-- the host of B never agreed to pay them.

create table if not exists public.agent_referrals (
  id             bigserial primary key,
  agent_id       uuid not null references public.agents (id) on delete cascade,
  partnership_id bigint       references public.agent_partnerships (id) on delete set null,
  listing_id     text not null,
  host_id        uuid         references auth.users (id) on delete set null,

  -- who arrived. Anonymous until they sign in.
  visitor_id     text,
  guest_id       uuid         references auth.users (id) on delete set null,
  guest_name     text,

  status         text not null default 'clicked'
                 check (status in ('clicked','booked','converted','expired','void')),

  -- snapshot at click time. Terms cannot change under a guest mid-journey.
  snap_pct       numeric(5,2),
  snap_flat      numeric(12,2),

  booking_ref    text,
  gross          numeric(12,2),
  commission     numeric(12,2),

  clicked_at     timestamptz not null default now(),
  booked_at      timestamptz,
  expires_at     timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_ref_agent   on public.agent_referrals (agent_id, status);
create index if not exists idx_ref_host    on public.agent_referrals (host_id, status);
create index if not exists idx_ref_listing on public.agent_referrals (listing_id);
create index if not exists idx_ref_guest   on public.agent_referrals (guest_id)
  where guest_id is not null;
create index if not exists idx_ref_booking on public.agent_referrals (booking_ref)
  where booking_ref is not null;
create unique index if not exists uq_ref_live
  on public.agent_referrals (agent_id, listing_id, coalesce(guest_id::text, visitor_id))
  where status in ('clicked','booked');


-- ── 6 · DERIVED STATUS ────────────────────────────────────────────────────
-- The single function every surface asks: can this agent earn right now?
--
--   active     · verified, or inside the 30-day window. Full powers.
--   restricted · window closed, still unverified. Reads work. Earning stops.
--   suspended  · a human pulled the lever.
--
-- Deliberately not a stored column. A stored column would need a cron job
-- to flip at midnight, and a missed cron is a silent security hole.

create or replace function public.agent_status(a public.agents)
returns text
language sql
immutable
set search_path = pg_catalog, public, extensions
as $$
  select case
    when a.suspended                                        then 'suspended'
    when a.kyc_status = 'verified'                          then 'active'
    when a.kyc_status = 'submitted'                         then 'active'
    when now() <= a.kyc_deadline                            then 'active'
    else 'restricted'
  end;
$$;

create or replace function public.agent_can_earn(p_agent uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select public.agent_status(a) = 'active' from public.agents a where a.id = p_agent),
    false
  );
$$;

-- Days remaining on the clock. Negative once it has run out.
create or replace function public.agent_days_left(a public.agents)
returns integer
language sql
immutable
set search_path = pg_catalog, public, extensions
as $$
  select case
    when a.kyc_status = 'verified' then null
    else greatest(-999, floor(extract(epoch from (a.kyc_deadline - now())) / 86400)::int)
  end;
$$;


-- ── 7 · IS THIS PERSON THE HOST OF THIS LISTING? ──────────────────────────
-- Used by every RLS policy below. security definer so it can read `listings`
-- even when the caller's own policy on `listings` would not permit it.

create or replace function public.owns_listing(p_listing text, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id::text = p_listing and l.owner_id = p_user
  );
$$;


-- ── 8 · SIGN UP AS AN AGENT ───────────────────────────────────────────────
-- Instant. Called by the client immediately after auth.signUp() succeeds.
-- Generates a collision-free slug and referral code, starts the clock.

create or replace function public.agent_signup(
  p_full_name      text,
  p_contact_method text,
  p_contact_value  text,
  p_phone          text default null,
  p_is_creator     boolean default false,
  p_social_handle  text default null,
  p_social_platform text default null,
  p_audience_size  integer default null
)
returns public.agents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_base  text;
  v_slug  text;
  v_code  text;
  v_n     int := 0;
  v_row   public.agents;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if exists (select 1 from public.agents where id = v_uid) then
    raise exception 'You already have an agent account' using errcode = '23505';
  end if;

  select email into v_email from auth.users where id = v_uid;

  -- slug: amara-otieno, amara-otieno-2, …
  v_base := regexp_replace(lower(trim(p_full_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'agent'; end if;
  v_slug := v_base;
  while exists (select 1 from public.agents where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  -- referral code: AMARAG4K7X
  loop
    v_code := upper(
      coalesce(nullif(regexp_replace(p_full_name, '[^a-zA-Z]', '', 'g'), ''), 'APA')
    );
    v_code := rpad(left(v_code, 5), 5, 'X')
           || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    exit when not exists (select 1 from public.agents where referral_code = v_code);
  end loop;

  insert into public.agents (
    id, full_name, email, phone, contact_method, contact_value,
    slug, referral_code, is_creator, social_handle, social_platform, audience_size
  ) values (
    v_uid, trim(p_full_name), v_email, p_phone,
    coalesce(p_contact_method, 'whatsapp'), trim(p_contact_value),
    v_slug, v_code, coalesce(p_is_creator, false),
    p_social_handle, p_social_platform, p_audience_size
  )
  returning * into v_row;

  return v_row;
end;
$$;


-- ── 9 · REQUEST A PARTNERSHIP ─────────────────────────────────────────────
-- Rate-limited at the database, not the browser. A restricted or suspended
-- agent is refused. Ten pending requests is the ceiling — the spammer's
-- economics collapse and the honest agent never notices the wall.

create or replace function public.agent_request_partnership(
  p_listing_id    text,
  p_requested_pct numeric,
  p_message       text default null
)
returns public.agent_partnerships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_host    uuid;
  v_pending int;
  v_row     public.agent_partnerships;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.agents where id = v_uid) then
    raise exception 'You are not registered as an agent' using errcode = '42501';
  end if;

  if not public.agent_can_earn(v_uid) then
    raise exception 'Verify your identity to request new partnerships'
      using errcode = '42501';
  end if;

  if p_requested_pct is null or p_requested_pct < 0 or p_requested_pct > 100 then
    raise exception 'Proposed commission must be between 0 and 100';
  end if;

  select owner_id into v_host from public.listings where id::text = p_listing_id;
  if v_host is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if v_host = v_uid then
    raise exception 'You cannot represent your own listing';
  end if;

  select count(*) into v_pending
    from public.agent_partnerships
   where agent_id = v_uid and status = 'pending';
  if v_pending >= 10 then
    raise exception 'You have 10 requests awaiting a reply. Wait for those first.';
  end if;

  insert into public.agent_partnerships (
    agent_id, listing_id, host_id, requested_pct, agent_message
  ) values (
    v_uid, p_listing_id, v_host, p_requested_pct, nullif(trim(p_message), '')
  )
  on conflict (agent_id, listing_id) do update
    set status        = 'pending',
        requested_pct = excluded.requested_pct,
        agent_message = excluded.agent_message,
        requested_at  = now(),
        responded_at  = null,
        decline_reason= null
    where public.agent_partnerships.status in ('declined','revoked')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'You already have a live request on this listing';
  end if;

  return v_row;
end;
$$;


-- ── 10 · HOST RESPONDS ────────────────────────────────────────────────────
-- The host names the number. Percentage or flat fee — never both.

create or replace function public.host_respond_partnership(
  p_partnership_id bigint,
  p_decision       text,                    -- 'approve' | 'decline'
  p_pct            numeric default null,
  p_flat           numeric default null,
  p_message        text    default null
)
returns public.agent_partnerships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agent_partnerships;
begin
  select * into v_row from public.agent_partnerships where id = p_partnership_id;
  if not found                then raise exception 'Request not found'; end if;
  if v_row.host_id <> v_uid   then raise exception 'Not your listing' using errcode = '42501'; end if;
  if v_row.status <> 'pending' then raise exception 'Already %', v_row.status; end if;

  if p_decision = 'approve' then
    if (p_pct is null) = (p_flat is null) then
      raise exception 'Set either a percentage or a flat fee — not both, not neither';
    end if;
    if p_pct is not null and (p_pct < 0 or p_pct > 100) then
      raise exception 'Commission must be between 0 and 100 percent';
    end if;
    if p_flat is not null and p_flat < 0 then
      raise exception 'A flat fee cannot be negative';
    end if;

    update public.agent_partnerships set
      status          = 'approved',
      commission_pct  = p_pct,
      commission_flat = p_flat,
      host_message    = nullif(trim(p_message), ''),
      responded_at    = now()
    where id = p_partnership_id
    returning * into v_row;

  elsif p_decision = 'decline' then
    update public.agent_partnerships set
      status         = 'declined',
      decline_reason = nullif(trim(p_message), ''),
      responded_at   = now()
    where id = p_partnership_id
    returning * into v_row;

  else
    raise exception 'Decision must be approve or decline';
  end if;

  return v_row;
end;
$$;


-- ── 11 · HOST REVOKES / PAUSES ────────────────────────────────────────────
-- Revoking stops future attribution. It does NOT void a referral already
-- clicked — that guest was sent in good faith under the old terms, and
-- their snapshot still holds. Honouring that is what makes the agreement
-- worth anything.

create or replace function public.host_set_partnership_state(
  p_partnership_id bigint,
  p_state          text     -- 'approved' | 'paused' | 'revoked'
)
returns public.agent_partnerships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agent_partnerships;
begin
  if p_state not in ('approved','paused','revoked') then
    raise exception 'Bad state';
  end if;

  select * into v_row from public.agent_partnerships where id = p_partnership_id;
  if not found              then raise exception 'Not found'; end if;
  if v_row.host_id <> v_uid then raise exception 'Not your listing' using errcode = '42501'; end if;
  if v_row.status not in ('approved','paused','revoked') then
    raise exception 'Respond to the request first';
  end if;

  update public.agent_partnerships set
    status     = p_state,
    revoked_at = case when p_state = 'revoked' then now() else null end
  where id = p_partnership_id
  returning * into v_row;

  return v_row;
end;
$$;


-- ── 12 · HOST REPORTS AN AGENT ────────────────────────────────────────────
-- Auto-declines the open request. Three upheld-or-open reports and the
-- agent is suspended pending human review — the spammer is stopped by the
-- crowd, not by a moderator who is asleep.

create or replace function public.host_report_agent(
  p_agent_id       uuid,
  p_reason         text,
  p_detail         text   default null,
  p_partnership_id bigint default null
)
returns public.agent_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_lid  text;
  v_row  public.agent_reports;
  v_open int;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_agent_id = v_uid then raise exception 'You cannot report yourself'; end if;

  -- A host may only report an agent who has actually approached them.
  if not exists (
    select 1 from public.agent_partnerships
    where agent_id = p_agent_id and host_id = v_uid
  ) then
    raise exception 'This agent has never contacted you' using errcode = '42501';
  end if;

  if p_partnership_id is not null then
    select listing_id into v_lid
      from public.agent_partnerships
     where id = p_partnership_id and host_id = v_uid;
  end if;

  -- Reporting is a refusal. Whether or not the host named a specific
  -- partnership, none of this agent's requests to THIS host should be left
  -- sitting in the inbox waiting for an answer they have already given.
  -- Scoped to v_uid: one host's report never touches another host's roster.
  update public.agent_partnerships
     set status         = 'declined',
         decline_reason = 'Reported by host',
         responded_at   = now()
   where agent_id = p_agent_id
     and host_id  = v_uid
     and status   = 'pending';

  -- If no partnership was named, attribute the report to the listing the
  -- agent most recently approached this host about, so the record is not
  -- orphaned from the thing it was about.
  if v_lid is null then
    select listing_id into v_lid
      from public.agent_partnerships
     where agent_id = p_agent_id and host_id = v_uid
     order by requested_at desc
     limit 1;
  end if;

  insert into public.agent_reports (agent_id, reported_by, partnership_id, listing_id, reason, detail)
  values (p_agent_id, v_uid, p_partnership_id, v_lid, p_reason, nullif(trim(p_detail), ''))
  on conflict (agent_id, reported_by) do update
    set reason = excluded.reason,
        detail = excluded.detail,
        status = 'open',
        created_at = now()
  returning * into v_row;

  select count(*) into v_open
    from public.agent_reports
   where agent_id = p_agent_id and status in ('open','upheld');

  update public.agents
     set report_count = v_open,
         suspended    = (v_open >= 3),
         suspended_at = case when v_open >= 3 then now() else suspended_at end,
         suspension_reason = case when v_open >= 3
                                  then 'Auto-suspended: 3 host reports'
                                  else suspension_reason end
   where id = p_agent_id;

  return v_row;
end;
$$;


-- ── 13 · RECORD A CLICK ───────────────────────────────────────────────────
-- Public. Fired when a guest lands on an agent link. Snapshots the terms.
-- Returns null silently for a dead code — the guest must never see a broken
-- page because an agent's partnership lapsed.

create or replace function public.agent_track_click(
  p_ref_code   text,
  p_listing_id text,
  p_visitor_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agents;
  v_part  public.agent_partnerships;
  v_guest uuid := auth.uid();
begin
  select * into v_agent from public.agents where referral_code = upper(trim(p_ref_code));
  if not found then return null; end if;
  if public.agent_status(v_agent) <> 'active' then return null; end if;

  select * into v_part
    from public.agent_partnerships
   where agent_id = v_agent.id and listing_id = p_listing_id and status = 'approved';
  if not found then return null; end if;

  insert into public.agent_referrals (
    agent_id, partnership_id, listing_id, host_id,
    visitor_id, guest_id, snap_pct, snap_flat
  ) values (
    v_agent.id, v_part.id, p_listing_id, v_part.host_id,
    p_visitor_id, v_guest, v_part.commission_pct, v_part.commission_flat
  )
  on conflict do nothing;

  return jsonb_build_object(
    'agent_name',  v_agent.full_name,
    'agent_slug',  v_agent.slug,
    'listing_id',  p_listing_id,
    'pct',         v_part.commission_pct,
    'flat',        v_part.commission_flat
  );
end;
$$;


-- ── 14 · ATTRIBUTE A BOOKING ──────────────────────────────────────────────
-- Called once, at booking creation, from the server. Finds the live referral
-- for (guest, listing), computes commission from the SNAPSHOT, and closes it.
--
-- Commission is deducted from the host's payout. Apatmento never touches it.
-- The full booking amount goes to the host, who settles with their agent.

create or replace function public.agent_attribute_booking(
  p_listing_id  text,
  p_booking_ref text,
  p_gross       numeric,
  p_guest_id    uuid default null,
  p_visitor_id  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref  public.agent_referrals;
  v_com  numeric(12,2);
  v_name text;
begin
  if p_gross is null or p_gross <= 0 then return null; end if;

  select r.* into v_ref
    from public.agent_referrals r
   where r.listing_id = p_listing_id
     and r.status     = 'clicked'
     and r.expires_at > now()
     and (
       (p_guest_id   is not null and r.guest_id   = p_guest_id) or
       (p_visitor_id is not null and r.visitor_id = p_visitor_id)
     )
   order by r.clicked_at desc
   limit 1;

  if not found then return null; end if;

  -- last-touch wins, but only within a partnership that is still live
  if not exists (
    select 1 from public.agent_partnerships
    where id = v_ref.partnership_id and status in ('approved','paused')
  ) then
    update public.agent_referrals set status = 'void' where id = v_ref.id;
    return null;
  end if;

  v_com := round(
    coalesce(v_ref.snap_flat, p_gross * coalesce(v_ref.snap_pct, 0) / 100.0),
    2
  );

  update public.agent_referrals set
    status      = 'converted',
    booking_ref = p_booking_ref,
    gross       = p_gross,
    commission  = v_com,
    guest_id    = coalesce(p_guest_id, guest_id),
    booked_at   = now()
  where id = v_ref.id;

  select full_name into v_name from public.agents where id = v_ref.agent_id;

  return jsonb_build_object(
    'agent_id',   v_ref.agent_id,
    'agent_name', v_name,
    'commission', v_com,
    'pct',        v_ref.snap_pct,
    'flat',       v_ref.snap_flat,
    'host_id',    v_ref.host_id
  );
end;
$$;


-- ── 15 · LIVE AVAILABILITY FOR AN APPROVED LISTING ────────────────────────
-- The whole point. An agent seeing a real calendar has no reason to promise
-- a unit that is gone, and no reason to substitute a different one on arrival.
--
-- Returns booked date ranges only for listings the caller is approved on.
-- An agent who is not approved gets an empty set — not an error, not a leak.

create or replace function public.agent_listing_availability(
  p_listing_id text,
  p_from       date default current_date,
  p_to         date default (current_date + interval '120 days')::date
)
returns table (checkin date, checkout date, status text)
language sql
security definer
set search_path = public
as $$
  select b.checkin_date, b.checkout_date,
         case when b.status = 'pending_payment' then 'held' else 'booked' end
    from public.apartment_bookings b
   where b.apartment_id = p_listing_id
     -- 'paid_pending_checkin' is what the M-Pesa callback actually writes.
     -- Omitting it would show sold nights as free, which is the precise
     -- failure this whole feature exists to prevent.
     and b.status in ('confirmed','paid','paid_pending_checkin','pending_payment')
     and b.checkout_date >= p_from
     and b.checkin_date  <= p_to
     and exists (
       select 1 from public.agent_partnerships p
        where p.agent_id   = auth.uid()
          and p.listing_id = p_listing_id
          and p.status in ('approved','paused')
     )
   order by b.checkin_date;
$$;


-- ── 16 · ROW LEVEL SECURITY ───────────────────────────────────────────────

alter table public.agents             enable row level security;
alter table public.agent_documents    enable row level security;
alter table public.agent_partnerships enable row level security;
alter table public.agent_reports      enable row level security;
alter table public.agent_referrals    enable row level security;

-- agents ────────────────────────────────────────────────────────────────
-- Readable by: the agent, any host they've approached, and operators.
-- A host must be able to see who is knocking before deciding.
drop policy if exists ag_select on public.agents;
create policy ag_select on public.agents
  for select to authenticated using (
    id = auth.uid()
    or public.is_operator()
    or exists (
      select 1 from public.agent_partnerships p
      where p.agent_id = agents.id and p.host_id = auth.uid()
    )
  );

drop policy if exists ag_update on public.agents;
create policy ag_update on public.agents
  for update to authenticated
  using  (id = auth.uid() or public.is_operator())
  with check (id = auth.uid() or public.is_operator());

-- Inserts happen only through agent_signup(). No direct path.
drop policy if exists ag_insert on public.agents;

-- agent_documents ───────────────────────────────────────────────────────
-- A host never sees an agent's passport. Only the agent and an operator.
drop policy if exists agd_select on public.agent_documents;
create policy agd_select on public.agent_documents
  for select to authenticated
  using (agent_id = auth.uid() or public.is_operator());

drop policy if exists agd_insert on public.agent_documents;
create policy agd_insert on public.agent_documents
  for insert to authenticated with check (agent_id = auth.uid());

drop policy if exists agd_delete on public.agent_documents;
create policy agd_delete on public.agent_documents
  for delete to authenticated
  using (agent_id = auth.uid() or public.is_operator());

-- agent_partnerships ────────────────────────────────────────────────────
-- Both parties see the deal. Nobody else does — not even another agent
-- representing the same listing.
drop policy if exists ap_select on public.agent_partnerships;
create policy ap_select on public.agent_partnerships
  for select to authenticated
  using (agent_id = auth.uid() or host_id = auth.uid() or public.is_operator());

-- Writes go through the functions above. They enforce the rules; a raw
-- UPDATE would let a host set a rate on someone else's listing.
drop policy if exists ap_insert on public.agent_partnerships;
drop policy if exists ap_update on public.agent_partnerships;

-- agent_reports ─────────────────────────────────────────────────────────
drop policy if exists ar_select on public.agent_reports;
create policy ar_select on public.agent_reports
  for select to authenticated
  using (reported_by = auth.uid() or public.is_operator());

drop policy if exists ar_update on public.agent_reports;
create policy ar_update on public.agent_reports
  for update to authenticated using (public.is_operator());

-- agent_referrals ───────────────────────────────────────────────────────
-- The agent sees their own pipeline. The host sees who was referred to
-- their listing. Neither sees the other's wider book of business.
drop policy if exists arf_select on public.agent_referrals;
create policy arf_select on public.agent_referrals
  for select to authenticated
  using (agent_id = auth.uid() or host_id = auth.uid() or public.is_operator());


-- ── 17 · VIEWS ────────────────────────────────────────────────────────────

-- An agent's book: every listing they may sell, with live terms and earnings.
create or replace view public.v_agent_portfolio
with (security_invoker = true) as
select
  p.id                                     as partnership_id,
  p.agent_id,
  p.listing_id,
  p.status,
  p.commission_pct,
  p.commission_flat,
  p.responded_at,
  l.title,
  l.city,
  l.location,
  l.price_night,
  l.photos,
  l.status                                 as listing_status,
  h.id                                     as host_id,
  coalesce(h.full_name, h.email)           as host_name,
  count(r.id) filter (where r.status = 'clicked')   as live_leads,
  count(r.id) filter (where r.status = 'converted') as bookings,
  coalesce(sum(r.commission) filter (where r.status = 'converted'), 0) as earned
from public.agent_partnerships p
join public.listings l  on l.id::text = p.listing_id
left join public.profiles h on h.id = p.host_id
left join public.agent_referrals r
       on r.partnership_id = p.id
group by p.id, l.id, l.title, l.city, l.location, l.price_night,
         l.photos, l.status, h.id, h.full_name, h.email;

-- A host's roster: who represents me, on what, for how much.
create or replace view public.v_host_agents
with (security_invoker = true) as
select
  p.id                    as partnership_id,
  p.host_id,
  p.listing_id,
  p.status,
  p.requested_pct,
  p.commission_pct,
  p.commission_flat,
  p.agent_message,
  p.requested_at,
  p.responded_at,
  a.id                    as agent_id,
  a.full_name             as agent_name,
  a.slug                  as agent_slug,
  a.email                 as agent_email,
  a.contact_method,
  a.contact_value,
  a.avatar_url,
  a.is_creator,
  a.social_handle,
  a.audience_size,
  a.kyc_status,
  public.agent_status(a)  as agent_state,
  a.report_count,
  l.title                 as listing_title,
  l.photos                as listing_photos,
  count(r.id) filter (where r.status = 'converted') as bookings_driven,
  coalesce(sum(r.commission) filter (where r.status = 'converted'), 0) as commission_owed
from public.agent_partnerships p
join public.agents   a on a.id = p.agent_id
join public.listings l on l.id::text = p.listing_id
left join public.agent_referrals r on r.partnership_id = p.id
group by p.id, a.id, l.id, l.title, l.photos;

grant select on public.v_agent_portfolio to authenticated;
grant select on public.v_host_agents     to authenticated;


-- ── 18 · EXPIRY SWEEP ─────────────────────────────────────────────────────
-- Referrals that were never converted die at 30 days. Run nightly.

create or replace function public.expire_agent_referrals()
returns void language sql security definer
set search_path = pg_catalog, public, extensions as $$
  update public.agent_referrals
     set status = 'expired'
   where status = 'clicked' and expires_at < now();
$$;

-- select cron.schedule('expire-referrals', '0 2 * * *', 'select public.expire_agent_referrals()');


-- ── 19 · GRANTS ───────────────────────────────────────────────────────────
grant execute on function public.agent_signup(text,text,text,text,boolean,text,text,integer) to authenticated;
grant execute on function public.agent_request_partnership(text,numeric,text)               to authenticated;
grant execute on function public.host_respond_partnership(bigint,text,numeric,numeric,text) to authenticated;
grant execute on function public.host_set_partnership_state(bigint,text)                    to authenticated;
grant execute on function public.host_report_agent(uuid,text,text,bigint)                   to authenticated;
grant execute on function public.agent_listing_availability(text,date,date)                 to authenticated;
grant execute on function public.agent_track_click(text,text,text)              to anon, authenticated;
grant execute on function public.agent_can_earn(uuid)                           to anon, authenticated;

-- attribute_booking is service-role only. A client must never mint commission.
--
-- Postgres grants EXECUTE to PUBLIC on every new function by default, and both
-- `anon` and `authenticated` inherit through PUBLIC. Revoking from those two
-- roles alone leaves the PUBLIC grant standing and the function wide open —
-- so revoke from PUBLIC first, then grant back only to service_role.
revoke execute on function public.agent_attribute_booking(text,text,numeric,uuid,text) from public;
revoke execute on function public.agent_attribute_booking(text,text,numeric,uuid,text) from anon, authenticated;
grant  execute on function public.agent_attribute_booking(text,text,numeric,uuid,text) to service_role;

-- Same reasoning: the expiry sweep is a cron/service job, never a client call.
revoke execute on function public.expire_agent_referrals() from public;
grant  execute on function public.expire_agent_referrals() to service_role;


-- ── 20 · updated_at ───────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public, extensions as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_agents_touch on public.agents;
create trigger trg_agents_touch before update on public.agents
  for each row execute function public.touch_updated_at();

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
