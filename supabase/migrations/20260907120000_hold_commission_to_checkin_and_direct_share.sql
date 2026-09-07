-- ══════════════════════════════════════════════════════════════════════
-- CABANA · COMMISSION HELD TO CHECK-IN, DIRECT-SHARE REHOMING
-- ══════════════════════════════════════════════════════════════════════
-- Every commission this platform pays on a STAY — the rehoming finder's
-- fee AND the ordinary ambassador/referral commission — used to be
-- earned the moment money cleared. Money can clear and the stay still
-- never happen: the guest arrives to a property that doesn't exist,
-- declines to be rehomed, and takes a refund instead. Under the old
-- rule the referrer or the rehoming host still walked away with a
-- commission on a stay that was refunded in full. This migration is the
-- schema half of closing that: a STATUS a commission can sit in before
-- it is real, and a place to record that it never became real.
--
--   pending_checkin   the money has moved, the stay has not happened yet
--   confirmed         the guest checked in — this is now real, and
--                      withdrawable after the usual hold
--   reversed          the stay never happened; this will never be paid
--
-- Nothing here changes commission on tours, events, food, shopping, car
-- hire or roommates-as-a-standalone-listing — none of those has a
-- check-in to hold against, and holding money hostage to an event that
-- structurally cannot happen would just be a worse bug than the one
-- being fixed. Only 'stays' bookings (apartment_bookings) gain the hold.
-- ══════════════════════════════════════════════════════════════════════

-- ═══ 1 · REFERRAL EARNINGS: A STATE BEFORE "REAL" ════════════════════
alter table public.referral_earnings
  add column if not exists reversed_reason text;

-- Nothing to widen: the table carries no CHECK constraint on `status`
-- (verified against the live schema before writing this), so
-- 'pending_checkin' needs no migration of its own — application code is
-- now the only thing that decides which values are valid, same as
-- 'confirmed' and 'reversed' always were.

create index if not exists idx_referral_earnings_pending
  on public.referral_earnings (booking_ref) where status = 'pending_checkin';

-- ═══ 2 · THE REFERRAL CHAIN SURVIVES A REHOME ════════════════════════
-- A guest who is rehomed keeps the SAME referral relationship — they
-- were referred once, at signup, not per-booking. But a replacement
-- booking is written under its own payment_reference (REHOME-... /
-- RESCUE-...), which does not match the referral_earnings row created
-- against the ORIGINAL booking's reference. Without a pointer back,
-- releasing that commission at check-in has nothing to look up.
alter table public.apartment_bookings
  add column if not exists referral_root_ref text;

comment on column public.apartment_bookings.referral_root_ref is
  'The payment_reference of the FIRST booking in this guest''s rehoming '
  'chain — the one a referral_earnings row (if any) is actually keyed '
  'to. Carried forward by every replacement booking so a referral '
  'commission survives being moved without needing to walk a chain of '
  'rehomed_from pointers at release time. Null on a booking that has '
  'never been rehomed; read bk.referral_root_ref || bk.payment_reference '
  'wherever this matters.';

create index if not exists idx_apartment_bookings_referral_root
  on public.apartment_bookings (referral_root_ref) where referral_root_ref is not null;

-- ═══ 3 · THE GUEST GETS TO CHOOSE, BEFORE WE KNOW WHO IS AT FAULT ═════
-- Today, a host-fault check-in issue auto-redirects the guest with no
-- way to say "no, just refund me — I'll find my own way." A guest whose
-- listing does not exist, or is unsafe, may not want another Cabana
-- booking pushed at them at all. They state the preference when they
-- file the report, before adjudication happens — the adjudicator honours
-- it only in the branch where it would otherwise have redirected them.
alter table public.checkin_issues
  add column if not exists prefer_refund boolean not null default false;

comment on column public.checkin_issues.prefer_refund is
  'Guest''s stated preference, given when they file the report and '
  'honoured only if the issue is later found host-at-fault: skip '
  'automatic rehoming and refund them in full instead. Never changes '
  'who is at fault or what a guest at fault owes.';

-- ═══ 4 · DIRECT-SHARE: A HOST POINTING AT A SPECIFIC LISTING ══════════
-- Alongside the automatic sweep, a host who cannot accommodate a guest
-- may point directly at one listing they already know is available —
-- their own other property, a friend's, anyone's. share_mode records
-- which door produced the offer, for the UI and for support; it decides
-- nothing about money on its own.
alter table public.match_offers
  add column if not exists share_mode text not null default 'sweep';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'match_offers_share_mode_ck') then
    alter table public.match_offers
      add constraint match_offers_share_mode_ck
      check (share_mode in ('sweep', 'direct'));
  end if;
end $$;

-- ═══ 5 · BACKFILL ═════════════════════════════════════════════════════
-- Every match_offers row written before this migration came from the
-- sweep; there was no other door.
update public.match_offers set share_mode = 'sweep' where share_mode is null;


-- ═══ 6 · THE AMBASSADOR CONSOLE HAD THE SAME BUG ═════════════════════
-- v_ambassador_me computed earned_total / earned_available from
-- `status <> 'reversed'`, and treated a null available_at as ALREADY
-- MATURED (`coalesce(available_at, created_at) <= now()`). A
-- 'pending_checkin' row has exactly that shape — no available_at yet,
-- created moments ago — so a stay's commission would have shown as
-- earned AND available on an ambassador's own dashboard the instant the
-- booking was paid for, before the guest had even arrived. The actual
-- withdrawal path (api/rewards.js actionWithdraw) already required
-- status = 'confirmed' and was never at risk; this was a display bug,
-- but "why does my dashboard say I can withdraw this" is exactly the
-- kind of question a support queue does not need.
create or replace view public.v_ambassador_me
with (security_invoker = true) as
select
  a.id, a.full_name, a.email, a.phone, a.region, a.slug, a.referral_code,
  a.status, a.risk_score, a.monthly_target, a.enrolled_at,

  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status = 'claimed')                       as leads_open,
  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status in ('signed_up','listed','earning')) as leads_converted,
  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status = 'earning')                        as leads_earning,
  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status in ('signed_up','listed','earning')
      and l.converted_at > date_trunc('month', now()))                            as converted_this_month,

  -- Confirmed only. A stay that has not yet had its guest check in is
  -- neither earned nor available, whatever its available_at reads.
  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status = 'confirmed'), 0)           as earned_total,
  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status = 'confirmed'
               and coalesce(e.available_at, e.created_at) <= now()), 0)           as earned_available,
  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status = 'confirmed'
               and coalesce(e.available_at, e.created_at) > now()), 0)            as earned_pending,
  -- Real money, not yet real: a stay someone booked through this
  -- ambassador, held until the guest actually checks in.
  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status = 'pending_checkin'), 0)     as earned_pending_checkin
from public.ambassadors a
where a.id = auth.uid();

grant select on public.v_ambassador_me to authenticated;
