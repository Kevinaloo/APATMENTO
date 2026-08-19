-- ═══════════════════════════════════════════════════════════════════════════
-- AMBASSADOR PROGRAMME · BEHAVIOURAL TESTS
-- ─────────────────────────────────────────────────────────────────────────
-- Run against a throwaway Postgres seeded with tests/fixture-auth.sql:
--
--   psql -f tests/fixture-auth.sql -f schema-ambassadors.sql \
--        -f tests/ambassadors.test.sql
--
-- These are not unit tests of SQL syntax. Each one pins a security or money
-- property that someone will eventually be tempted to "simplify" away.
-- Impersonation is via the test.uid GUC, which the fixture's auth.uid()
-- stub reads in place of the JWT.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\pset pager off

create or replace function ok(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond then raise notice '  PASS  %', label;
  else raise exception 'FAIL  %', label;
  end if;
end $$;

create or replace function as_user(u uuid) returns void
language sql as $$ select set_config('test.uid', coalesce(u::text,''), false); $$;

-- Re-runnable: wipe anything a previous run left behind. Tests that only
-- pass on a virgin database are tests nobody runs twice.
truncate public.ambassador_fraud_signals, public.ambassador_events,
         public.ambassador_leads, public.ambassadors,
         public.ambassador_allowlist, public.referral_codes,
         public.referral_earnings, public.referrals, public.listings
  restart identity cascade;
delete from auth.users;

do $$ begin raise notice ''; raise notice '── 1 · THE RATE CARD ──'; end $$;

-- The four numbers the business runs on. If a refactor moves them, this is
-- the test that shouts.
select ok(public.referral_rate('ambassador','user')             = 0.15, 'ambassador · traveller = 15%');
select ok(public.referral_rate('ambassador','host')             = 0.10, 'ambassador · host = 10%');
select ok(public.referral_rate('ambassador','service_provider') = 0.10, 'ambassador · service provider = 10%');
select ok(public.referral_rate('user','user')                   = 0.10, 'ordinary user · traveller = 10%');
select ok(public.referral_rate('user','host')                   = 0.05, 'ordinary user · host = 5%');
select ok(public.referral_rate('user','service_provider')       = 0.05, 'ordinary user · service provider = 5%');
-- Unknown tiers must fall to the cheaper card, never the richer one. A typo
-- in a tier string should cost the ambassador a complaint, not cost Cabana
-- money on every booking until somebody notices.
select ok(public.referral_rate('platinum','user') = 0.10, 'unknown tier falls back to ordinary rate');
select ok(public.referral_rate(null, null)        = 0.10, 'null tier falls back to ordinary rate');

-- The retired default. referral_earnings.commission_rate used to default to
-- 0.20 — the old top rate — so any insert omitting the column silently paid
-- it. The migration drops the default; this proves it stayed dropped.
select ok((select column_default from information_schema.columns
            where table_schema='public' and table_name='referral_earnings'
              and column_name='commission_rate') is null,
          'no stale 0.20 default lurking on referral_earnings.commission_rate');


do $$ begin raise notice ''; raise notice '── 2 · THE GATE ──'; end $$;

insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'amb.one@example.com',   now()),
  ('22222222-2222-2222-2222-222222222222', 'amb.two@example.com',   now()),
  ('33333333-3333-3333-3333-333333333333', 'outsider@example.com',  now()),
  ('44444444-4444-4444-4444-444444444444', 'unconfirmed@example.com', null),
  ('55555555-5555-5555-5555-555555555555', 'revoked@example.com',   now());

insert into public.ambassador_allowlist (email, full_name, region) values
  ('amb.one@example.com', 'Amara One', 'Nairobi'),
  ('amb.two@example.com', 'Bem Two',   'Lagos'),
  ('unconfirmed@example.com', 'Ghost',  'Accra'),
  ('revoked@example.com', 'Former',    'Accra');

update public.ambassador_allowlist
   set revoked_at = now(), revoke_reason = 'left the programme'
 where email = 'revoked@example.com';

select as_user(null);
select ok(public.ambassador_gate()->>'reason' = 'not_signed_in', 'anonymous caller is refused');

select as_user('33333333-3333-3333-3333-333333333333');
select ok(public.ambassador_gate()->>'reason' = 'not_authorised',
          'confirmed email absent from the roster is refused');

-- THE one that matters. Supabase will hold an unconfirmed address on a fresh
-- account, so without this check, knowing an ambassador's email is the same
-- as being one: sign up as them, never confirm, walk in.
select as_user('44444444-4444-4444-4444-444444444444');
select ok(public.ambassador_gate()->>'reason' = 'email_unconfirmed',
          'ON the roster but email unconfirmed is refused  ← impersonation blocked');

select as_user('55555555-5555-5555-5555-555555555555');
select ok(public.ambassador_gate()->>'reason' = 'not_authorised',
          'revoked roster entry is refused');

select as_user('11111111-1111-1111-1111-111111111111');
select ok((public.ambassador_gate()->>'ok')::boolean, 'roster + confirmed email is admitted');
select ok((public.ambassador_gate()->>'enrolled')::boolean = false, 'admitted but not yet enrolled');

-- Case folding: an admin who types a capital must not lock the person out.
update auth.users set email = 'Amb.One@Example.com'
 where id = '11111111-1111-1111-1111-111111111111';
select ok((public.ambassador_gate()->>'ok')::boolean, 'roster match is case-insensitive');
update auth.users set email = 'amb.one@example.com'
 where id = '11111111-1111-1111-1111-111111111111';


do $$ begin raise notice ''; raise notice '── 3 · ENROLMENT ──'; end $$;

select as_user('11111111-1111-1111-1111-111111111111');
select ok((public.ambassador_enrol('Amara One','+254712345678','Nairobi')->>'created')::boolean,
          'first call enrols');
select ok((public.ambassador_enrol('Amara One',null,null)->>'created')::boolean = false,
          'second call is idempotent, not a duplicate');
select ok(public.is_ambassador('11111111-1111-1111-1111-111111111111'), 'is_ambassador() agrees');

-- The code must be visible to the public ?ref= capture path, which reads
-- referral_codes. One code, one meaning, wherever it is seen.
select ok(exists (select 1 from public.referral_codes c
                    join public.ambassadors a on a.id = c.user_id
                   where a.id = '11111111-1111-1111-1111-111111111111'
                     and c.code = a.referral_code),
          'referral code is mirrored into referral_codes');
select ok((select referral_code from public.ambassadors
            where id='11111111-1111-1111-1111-111111111111') like 'AMB-%',
          'ambassador codes are legibly prefixed');

select as_user('22222222-2222-2222-2222-222222222222');
select ok((public.ambassador_enrol('Bem Two', null, 'Lagos')->>'ok')::boolean,
          'a second ambassador enrols');
select as_user('33333333-3333-3333-3333-333333333333');
select ok((public.ambassador_enrol('Intruder',null,null)->>'ok')::boolean = false,
          'a non-roster caller cannot enrol themselves');
select ok(public.is_ambassador('33333333-3333-3333-3333-333333333333') = false,
          'and is_ambassador() still says no');


do $$ begin raise notice ''; raise notice '── 4 · LEAD CLAIMS ──'; end $$;

select as_user('11111111-1111-1111-1111-111111111111');
select ok((public.ambassador_claim_lead('Wanjiru Host','0712000001','phone','host','stays','Nairobi','Kenya',null)->>'ok')::boolean,
          'a clean lead is claimed');

-- Phone normalisation is what makes the dedupe real. These three strings are
-- one person; if the key disagrees, the anti-poaching design is decorative.
select ok(public.normalise_contact('+254712000001','phone')
        = public.normalise_contact('0712000001','phone'),
          '+254 and 0-prefix normalise identically');
select ok(public.normalise_contact('254 712 000 001','phone')
        = public.normalise_contact('0712000001','phone'),
          'spacing and country code normalise identically');

select ok(public.ambassador_claim_lead('Same Person','+254712000001','phone','host',null,null,null,null)->>'reason'
        = 'already_yours',
          'the same ambassador re-claiming is told it is already theirs');

select as_user('22222222-2222-2222-2222-222222222222');
select ok(public.ambassador_claim_lead('Poach Attempt','254712000001','phone','host',null,null,null,null)->>'reason'
        = 'already_claimed',
          'a teammate cannot claim a number already staked  ← poaching blocked');

-- Claiming someone already on Cabana is the oldest trick in the programme:
-- there is nothing to onboard, so there is nothing to pay for.
insert into public.listings (partner_id, title, contact_phone)
values (null, 'Existing host flat', '+254799888777');
select ok(public.ambassador_claim_lead('Already Here','0799888777','phone','host',null,null,null,null)->>'reason'
        = 'already_on_platform',
          'an existing host cannot be claimed as new');

insert into auth.users (id, email, email_confirmed_at)
values ('66666666-6666-6666-6666-666666666666','known.user@example.com', now());
select ok(public.ambassador_claim_lead('Known','KNOWN.USER@example.com','email','traveller',null,null,null,null)->>'reason'
        = 'already_on_platform',
          'an existing account cannot be claimed, case-insensitively');

select ok(public.ambassador_claim_lead('No Contact','','phone','host',null,null,null,null)->>'reason'
        = 'incomplete', 'an empty contact is refused');
select ok(public.ambassador_claim_lead('Short','12','phone','host',null,null,null,null)->>'reason'
        = 'bad_contact', 'a too-short phone is refused');

select as_user('33333333-3333-3333-3333-333333333333');
select ok(public.ambassador_claim_lead('X','0700111222','phone','host',null,null,null,null)->>'reason'
        = 'not_authorised', 'a non-ambassador cannot claim at all');


do $$ begin raise notice ''; raise notice '── 5 · VELOCITY ──'; end $$;

-- Without a cap, the dominant strategy is to claim every number you have
-- ever seen and wait for coincidence. That is a lottery ticket bought with
-- Cabana's money, not recruitment.
select as_user('22222222-2222-2222-2222-222222222222');
do $$
declare i int; r jsonb; hit boolean := false;
begin
  for i in 1..12 loop
    r := public.ambassador_claim_lead('Bulk '||i, '07331000'||lpad(i::text,2,'0'),
                                      'phone','host',null,null,null,null);
    if r->>'reason' = 'rate_limited' then hit := true; exit; end if;
  end loop;
  perform ok(hit, 'hourly claim cap engages before 12 claims');
  perform ok(exists (select 1 from public.ambassador_fraud_signals
                      where ambassador_id='22222222-2222-2222-2222-222222222222'
                        and signal='claim_velocity'),
             'hitting the cap raises a fraud signal');
  perform ok((select risk_score from public.ambassadors
               where id='22222222-2222-2222-2222-222222222222') > 0,
             'the signal moves the risk score');
end $$;


do $$ begin raise notice ''; raise notice '── 6 · SUSPENSION ──'; end $$;

update public.ambassadors
   set status='suspended', suspend_reason='under review'
 where id='22222222-2222-2222-2222-222222222222';

select as_user('22222222-2222-2222-2222-222222222222');
select ok(public.ambassador_gate()->>'reason' = 'suspended', 'a suspended ambassador is stopped at the gate');
select ok(public.is_ambassador('22222222-2222-2222-2222-222222222222') = false, 'and fails is_ambassador()');
select ok(public.ambassador_claim_lead('Nope','0788999000','phone','host',null,null,null,null)->>'reason'
        = 'not_authorised', 'and cannot claim while suspended');

-- Suspension freezes accrual; it must never erase what was already earned.
-- An automated system that can destroy earnings on a heuristic will
-- eventually do it to your best ambassador on a Friday night.
select ok((select count(*) from public.ambassador_leads
            where ambassador_id='22222222-2222-2222-2222-222222222222') > 0,
          'suspension preserves existing leads rather than deleting them');


do $$ begin raise notice ''; raise notice '── 7 · RLS SURFACE ──'; end $$;

-- The roster holds every ambassador's email. An ambassador has no reason to
-- read it and every reason to want to.
select ok((select count(*) from pg_policies
            where schemaname='public' and tablename='ambassador_allowlist'
              and qual = 'false') = 1,
          'the roster is unreadable from any client session');

-- No UPDATE policy on ambassadors is the point: grant one and a suspended
-- ambassador can set their own status back to active.
select ok(not exists (select 1 from pg_policies
                       where schemaname='public' and tablename='ambassadors'
                         and cmd in ('UPDATE','INSERT','ALL')),
          'ambassadors is read-only to clients — status and risk are unreachable');

select ok(not exists (select 1 from pg_policies
                       where schemaname='public' and tablename='ambassador_leads'
                         and cmd in ('INSERT','ALL')),
          'leads cannot be inserted directly, only via the checked function');

select ok((select count(*) from pg_tables t
            where t.schemaname='public' and t.tablename like 'ambassador%'
              and not t.rowsecurity) = 0,
          'every ambassador table has RLS enabled');

do $$ begin raise notice ''; raise notice '════ ALL TESTS PASSED ════'; raise notice ''; end $$;
