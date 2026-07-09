/* ═══════════════════════════════════════════════════════════════════════
   APATMENTO · PARTNER PROGRAM SCHEMA
   Agents & Influencers — application-first, approval-gated.
   ───────────────────────────────────────────────────────────────────────
   Run in Supabase SQL editor. Idempotent — safe to re-run.

   Model:
     partner_applications  → the queue. No auth account exists yet.
     partners              → approved partners, 1:1 with auth.users.
     partner_commission_defaults → fixed default per role, admin overrides
                                   per-partner on approval.

   Privacy rule (hard requirement):
     Earnings and commission rates are NEVER public. A partner may read
     exactly one row — their own. Admins read all. Anon reads nothing.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── enums ─────────────────────────────────────────────────────────── */
do $$ begin
  create type partner_role   as enum ('agent','influencer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('pending','approved','declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_method as enum ('call','sms','whatsapp','email');
exception when duplicate_object then null; end $$;


/* ═══════════════════════════════════════════════════════════════════════
   1. COMMISSION DEFAULTS  — fixed per role, admin-editable
   ═══════════════════════════════════════════════════════════════════════ */
create table if not exists public.partner_commission_defaults (
  role            partner_role primary key,
  rate_pct        numeric(5,2) not null check (rate_pct >= 0 and rate_pct <= 100),
  updated_at      timestamptz  not null default now(),
  updated_by      uuid references auth.users(id)
);

insert into public.partner_commission_defaults (role, rate_pct) values
  ('agent',      7.00),
  ('influencer', 12.00)
on conflict (role) do nothing;


/* ═══════════════════════════════════════════════════════════════════════
   2. APPLICATIONS  — the review queue. No auth.users row yet.

   password_hash: bcrypt, hashed server-side at apply time. We never
   store plaintext. On approval the API creates the auth account using
   a fresh password reset invite, OR re-uses this hash via admin API.
   ═══════════════════════════════════════════════════════════════════════ */
create table if not exists public.partner_applications (
  id                uuid primary key default gen_random_uuid(),
  role              partner_role not null,

  -- shared fields
  full_name         text not null,
  email             citext not null,
  contact_method    contact_method not null,
  contact_value     text not null,
  password_hash     text not null,

  -- influencer-only (null for agents)
  nickname          text,
  social_handle     text,
  social_platform   text,
  audience_size     integer,

  -- review
  status            application_status not null default 'pending',
  reviewed_by       uuid references auth.users(id),
  reviewed_at       timestamptz,
  decline_reason    text,
  admin_notes       text,

  -- the rate granted on approval (defaults pulled from table above)
  granted_rate_pct  numeric(5,2) check (granted_rate_pct >= 0 and granted_rate_pct <= 100),

  created_at        timestamptz not null default now(),
  ip_address        inet,
  user_agent        text
);

-- one pending application per email. Declined/approved may re-apply.
create unique index if not exists partner_app_pending_email_uniq
  on public.partner_applications (email)
  where status = 'pending';

create index if not exists partner_app_status_idx  on public.partner_applications (status, created_at desc);
create index if not exists partner_app_role_idx    on public.partner_applications (role, status);


/* ═══════════════════════════════════════════════════════════════════════
   3. PARTNERS  — approved only. 1:1 with auth.users.
   ═══════════════════════════════════════════════════════════════════════ */
create table if not exists public.partners (
  id                uuid primary key references auth.users(id) on delete cascade,
  application_id    uuid references public.partner_applications(id),
  role              partner_role not null,

  full_name         text not null,
  email             citext not null unique,
  nickname          text,
  social_handle     text,
  social_platform   text,
  contact_method    contact_method not null,
  contact_value     text not null,

  -- money. private, always.
  commission_pct    numeric(5,2) not null check (commission_pct >= 0 and commission_pct <= 100),
  total_earned      numeric(14,2) not null default 0,
  total_paid_out    numeric(14,2) not null default 0,
  pending_payout    numeric(14,2) not null default 0,

  -- performance
  referral_code     text unique not null,
  clicks            integer not null default 0,
  signups           integer not null default 0,
  conversions       integer not null default 0,
  gmv               numeric(14,2) not null default 0,

  is_active         boolean not null default true,
  approved_at       timestamptz not null default now(),
  approved_by       uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists partners_role_idx on public.partners (role, is_active);
create index if not exists partners_ref_idx  on public.partners (referral_code);


/* ═══════════════════════════════════════════════════════════════════════
   4. ATTRIBUTED EVENTS — how a partner earns. Feeds their dashboard.
   ═══════════════════════════════════════════════════════════════════════ */
create table if not exists public.partner_events (
  id            bigserial primary key,
  partner_id    uuid not null references public.partners(id) on delete cascade,
  event_type    text not null check (event_type in ('click','signup','booking','payout')),
  reference     text,
  gross_amount  numeric(14,2) default 0,
  commission    numeric(14,2) default 0,
  meta          jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists partner_events_pid_idx on public.partner_events (partner_id, created_at desc);


/* ═══════════════════════════════════════════════════════════════════════
   5. HELPER — is the caller an admin?
   Mirrors the ADMINS list in apa-session.js.
   ═══════════════════════════════════════════════════════════════════════ */
create or replace function public.is_apa_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select (auth.jwt() ->> 'email') in ('apatmento@gmail.com','worlddossy@gmail.com')),
    false
  );
$$;


/* ═══════════════════════════════════════════════════════════════════════
   6. ROW LEVEL SECURITY

   The whole point: earnings stay private.
   - anon           → nothing, ever.
   - partner        → their own partners row + own events. Read only.
   - admin          → everything.
   - applications   → nobody reads via client. Inserts go through the
                      service-role API (needs password hashing anyway).
   ═══════════════════════════════════════════════════════════════════════ */
alter table public.partner_applications        enable row level security;
alter table public.partners                    enable row level security;
alter table public.partner_events              enable row level security;
alter table public.partner_commission_defaults enable row level security;

-- applications: admin only. Client never touches this directly.
drop policy if exists app_admin_all on public.partner_applications;
create policy app_admin_all on public.partner_applications
  for all using (public.is_apa_admin()) with check (public.is_apa_admin());

-- partners: read own row, or admin reads all.
drop policy if exists partners_read_own on public.partners;
create policy partners_read_own on public.partners
  for select using (id = auth.uid() or public.is_apa_admin());

-- partners: only admin writes. Partner cannot edit their own commission.
drop policy if exists partners_admin_write on public.partners;
create policy partners_admin_write on public.partners
  for all using (public.is_apa_admin()) with check (public.is_apa_admin());

-- events: read own, admin all.
drop policy if exists events_read_own on public.partner_events;
create policy events_read_own on public.partner_events
  for select using (
    public.is_apa_admin()
    or partner_id = auth.uid()
  );

drop policy if exists events_admin_write on public.partner_events;
create policy events_admin_write on public.partner_events
  for all using (public.is_apa_admin()) with check (public.is_apa_admin());

-- commission defaults: admin only. Partners see their own rate on their
-- partners row, not the global table.
drop policy if exists defaults_admin on public.partner_commission_defaults;
create policy defaults_admin on public.partner_commission_defaults
  for all using (public.is_apa_admin()) with check (public.is_apa_admin());


/* ═══════════════════════════════════════════════════════════════════════
   7. TRIGGERS — keep aggregates honest, stamp updated_at
   ═══════════════════════════════════════════════════════════════════════ */
create or replace function public.touch_partner_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists partners_touch on public.partners;
create trigger partners_touch before update on public.partners
  for each row execute function public.touch_partner_updated();


-- roll partner_events into the partners aggregate columns
create or replace function public.roll_partner_event()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.event_type = 'click' then
    update public.partners set clicks = clicks + 1 where id = new.partner_id;
  elsif new.event_type = 'signup' then
    update public.partners set signups = signups + 1 where id = new.partner_id;
  elsif new.event_type = 'booking' then
    update public.partners set
      conversions   = conversions + 1,
      gmv           = gmv + coalesce(new.gross_amount,0),
      total_earned  = total_earned + coalesce(new.commission,0),
      pending_payout= pending_payout + coalesce(new.commission,0)
    where id = new.partner_id;
  elsif new.event_type = 'payout' then
    update public.partners set
      total_paid_out = total_paid_out + coalesce(new.gross_amount,0),
      pending_payout = greatest(pending_payout - coalesce(new.gross_amount,0), 0)
    where id = new.partner_id;
  end if;
  return new;
end $$;

drop trigger if exists partner_events_roll on public.partner_events;
create trigger partner_events_roll after insert on public.partner_events
  for each row execute function public.roll_partner_event();


/* ═══════════════════════════════════════════════════════════════════════
   8. ADMIN VIEW — the review queue, newest first
   ═══════════════════════════════════════════════════════════════════════ */
create or replace view public.v_partner_queue
with (security_invoker = true) as
select
  a.id, a.role, a.full_name, a.email, a.nickname, a.social_handle,
  a.social_platform, a.audience_size, a.contact_method, a.contact_value,
  a.status, a.created_at, a.reviewed_at, a.decline_reason,
  a.granted_rate_pct,
  d.rate_pct as default_rate_pct
from public.partner_applications a
left join public.partner_commission_defaults d on d.role = a.role
order by
  case a.status when 'pending' then 0 else 1 end,
  a.created_at desc;

/* done. */
