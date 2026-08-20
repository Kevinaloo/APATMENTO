-- ═══════════════════════════════════════════════════════════════════════════
-- LISTING OWNERSHIP · SQL SUITE
-- ─────────────────────────────────────────────────────────────────────────
-- Run through tests/run-ownership-tests.sh, which spins a throwaway Postgres,
-- loads tests/fixture-ownership.sql, applies the migration twice, then runs
-- this. Every assertion below is money or liability: who owns a building,
-- what share of it, and who can take it away.
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages to notice;

create or replace function t_ok(p_label text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice '  PASS  %', p_label;
  else raise notice '  FAIL  %', p_label; end if;
end $$;

-- Assert that a statement is refused. A permission check that is never
-- exercised is a permission check that has already stopped working.
create or replace function t_refuses(p_label text, p_sql text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise notice '  FAIL  % (it was allowed)', p_label;
exception when others then
  raise notice '  PASS  % (%)', p_label, left(sqlerrm, 58);
end $$;

create or replace function be(p_uid uuid) returns void language sql as $$
  select set_config('test.uid', coalesce(p_uid::text, ''), false); select null::void;
$$;

-- ── cast ──────────────────────────────────────────────────────────────────
do $$
declare
  v_kevin uuid; v_amina uuid; v_joseph uuid; v_stranger uuid;
begin
  insert into auth.users (email, phone) values ('kevin@example.com',  '+254712345678') returning id into v_kevin;
  insert into auth.users (email, phone) values ('amina@example.com',  '+254722000111') returning id into v_amina;
  insert into auth.users (email, phone) values ('joseph@example.com', '+254733000222') returning id into v_joseph;
  insert into auth.users (email, phone) values ('nobody@example.com', '+254799999999') returning id into v_stranger;
  insert into public.profiles (id, full_name, email)
    select id, initcap(split_part(email,'@',1)), email from auth.users;
  perform set_config('test.kevin', v_kevin::text, false);
  perform set_config('test.amina', v_amina::text, false);
  perform set_config('test.joseph', v_joseph::text, false);
  perform set_config('test.stranger', v_stranger::text, false);

  insert into public.listings (id, partner_id, host_id, owner_id, title, city, photos)
  values ('11111111-1111-1111-1111-111111111111', v_kevin, v_kevin, v_kevin,
          'Kilimani two-bed', 'Nairobi', array['https://img/1.jpg']);
end $$;


-- ── 1 · CONTACT NORMALISATION ─────────────────────────────────────────────
-- The whole transfer mechanism hangs off this. If "+254 712 345 678" and
-- "0712345678" ever stop matching, a transfer becomes unclaimable and the
-- listing is stranded with nobody able to reach it.
do $$
begin
  perform t_ok('phone: international and local forms match',
    public.cabana_norm_contact('+254 712 345 678') = public.cabana_norm_contact('0712345678'));
  perform t_ok('phone: a different number does not match',
    public.cabana_norm_contact('0712345678') <> public.cabana_norm_contact('0712345679'));
  perform t_ok('email: case and whitespace are ignored',
    public.cabana_norm_contact('  Kevin@Example.COM ') = 'kevin@example.com');
  perform t_ok('nothing normalises to null',
    public.cabana_norm_contact('   ') is null);
end $$;


-- ── 2 · SOLE ──────────────────────────────────────────────────────────────
do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111';
begin
  perform be(current_setting('test.kevin')::uuid);
  perform public.listing_declare_ownership(v_l, 'sole');
  perform t_ok('sole is the declared type',
    (select ownership_type from public.listings where id = v_l) = 'sole');
  perform t_ok('sole records no co-owners',
    (select count(*) from public.listing_partners
      where listing_id = v_l and status <> 'removed') = 0);
end $$;

do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111';
begin
  perform be(current_setting('test.stranger')::uuid);
  perform t_refuses('a stranger cannot declare somebody else''s listing',
    format('select public.listing_declare_ownership(%L, ''sole'')', v_l));
end $$;


-- ── 3 · PARTNERSHIP, EQUAL SPLIT ──────────────────────────────────────────
-- Three people, equal shares. 10000 basis points does not divide by three,
-- so this is the case that proves the remainder is not silently dropped.
do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111'; v_sum integer;
begin
  perform be(current_setting('test.kevin')::uuid);
  perform public.listing_declare_ownership(v_l, 'partnership', 'equal',
    '[{"name":"Amina Njeri","contact":"amina@example.com"},
      {"name":"Joseph Otieno","contact":"0733000222"}]'::jsonb);

  select sum(equity_bps) into v_sum from public.listing_partners
    where listing_id = v_l and status <> 'removed';

  perform t_ok('an equal three-way split still sums to exactly 100%', v_sum = 10000);
  perform t_ok('the operator is in their own partnership',
    (select count(*) from public.listing_partners
      where listing_id = v_l and role = 'operator' and status = 'active') = 1);
  perform t_ok('a partner with an account is linked to it',
    (select user_id from public.listing_partners
      where listing_id = v_l and full_name = 'Amina Njeri') = current_setting('test.amina')::uuid);
  perform t_ok('a partner named by phone is matched to their account too',
    (select contact_norm from public.listing_partners
      where listing_id = v_l and full_name = 'Joseph Otieno')
      = public.cabana_norm_contact('+254733000222'));
  perform t_ok('a named partner starts as invited, not active',
    (select status from public.listing_partners
      where listing_id = v_l and full_name = 'Amina Njeri') = 'invited');
end $$;


-- ── 4 · PARTNERSHIP, CUSTOM SPLIT ─────────────────────────────────────────
do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111';
begin
  perform be(current_setting('test.kevin')::uuid);
  perform public.listing_declare_ownership(v_l, 'partnership', 'custom',
    '[{"name":"Amina Njeri","contact":"amina@example.com","equity_pct":30},
      {"name":"Joseph Otieno","contact":"0733000222","equity_pct":25}]'::jsonb);

  perform t_ok('a custom split leaves the operator the remainder',
    (select equity_bps from public.listing_partners
      where listing_id = v_l and role = 'operator' and status = 'active') = 4500);
  perform t_ok('a custom split sums to exactly 100%',
    (select sum(equity_bps) from public.listing_partners
      where listing_id = v_l and status <> 'removed') = 10000);
  perform t_ok('redeclaring retires the previous co-owner set',
    (select count(*) from public.listing_partners
      where listing_id = v_l and status = 'removed') >= 3);
end $$;

do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111';
begin
  perform be(current_setting('test.kevin')::uuid);
  -- Shares totalling 100% or more leave the operator nothing, which is not
  -- a partnership, it is a giveaway nobody meant to sign.
  perform t_refuses('shares that leave the operator nothing are refused',
    format('select public.listing_declare_ownership(%L, ''partnership'', ''custom'',
            ''[{"name":"A","contact":"a@x.com","equity_pct":60},
               {"name":"B","contact":"b@x.com","equity_pct":45}]''::jsonb)', v_l));
  perform t_refuses('a partner with no contact is refused',
    format('select public.listing_declare_ownership(%L, ''partnership'', ''equal'',
            ''[{"name":"Ghost","contact":""}]''::jsonb)', v_l));
  perform t_refuses('you cannot add yourself as your own co-partner',
    format('select public.listing_declare_ownership(%L, ''partnership'', ''equal'',
            ''[{"name":"Kevin again","contact":"kevin@example.com"}]''::jsonb)', v_l));
  perform t_refuses('a partnership of one is refused',
    format('select public.listing_declare_ownership(%L, ''partnership'', ''equal'', ''[]''::jsonb)', v_l));
end $$;


-- ── 5 · A PARTNER CONFIRMING THEIR OWN SEAT ───────────────────────────────
do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111'; v_seat uuid;
begin
  select id into v_seat from public.listing_partners
    where listing_id = v_l and full_name = 'Joseph Otieno' and status <> 'removed';

  perform be(current_setting('test.stranger')::uuid);
  perform t_refuses('somebody else cannot confirm your seat',
    format('select public.listing_partner_confirm(%L)', v_seat));

  perform be(current_setting('test.joseph')::uuid);
  perform public.listing_partner_confirm(v_seat);
  perform t_ok('a partner named by phone can confirm their own seat',
    (select status from public.listing_partners where id = v_seat) = 'active');
  perform t_ok('confirming links the seat to the account',
    (select user_id from public.listing_partners where id = v_seat)
      = current_setting('test.joseph')::uuid);
end $$;


-- ── 6 · ON BEHALF OF SOMEBODY ELSE ────────────────────────────────────────
do $$
declare v_l uuid; v_r jsonb;
begin
  perform be(current_setting('test.kevin')::uuid);
  insert into public.listings (partner_id, host_id, owner_id, title, city, created_by)
  values (current_setting('test.kevin')::uuid, current_setting('test.kevin')::uuid,
          current_setting('test.kevin')::uuid, 'Nyali beach flat', 'Mombasa',
          current_setting('test.kevin')::uuid)
  returning id into v_l;
  perform set_config('test.listing2', v_l::text, false);

  v_r := public.listing_declare_ownership(v_l, 'on_behalf', null, '[]'::jsonb,
                                          'Mama Zawadi', '+254 722 000 111');

  perform t_ok('an on-behalf listing says whose it really is',
    (select held_for_name from public.listings where id = v_l) = 'Mama Zawadi');
  perform t_ok('declaring on-behalf opens the transfer in the same breath',
    (select count(*) from public.listing_transfers
      where listing_id = v_l and status = 'pending' and kind = 'on_behalf') = 1);
  perform t_ok('the transfer is addressed to the person named',
    (select to_contact_norm from public.listing_transfers where listing_id = v_l)
      = public.cabana_norm_contact('0722000111'));

  perform t_refuses('an on-behalf listing with nobody named is refused',
    format('select public.listing_declare_ownership(%L, ''on_behalf'')', v_l));
end $$;


-- ── 7 · CLAIMING ──────────────────────────────────────────────────────────
do $$
declare v_l uuid := current_setting('test.listing2')::uuid; v_t uuid;
begin
  select id into v_t from public.listing_transfers where listing_id = v_l and status = 'pending';

  -- The load-bearing check in the whole file. Without it any signed-in
  -- account could accept any transfer by guessing an id.
  perform be(current_setting('test.stranger')::uuid);
  perform t_refuses('a transfer cannot be accepted by whoever finds its id',
    format('select public.listing_transfer_accept(%L)', v_t));

  perform t_ok('the inbox shows a stranger nothing',
    (public.listing_transfers_for_me() -> 'transfers') = '[]'::jsonb);

  perform be(current_setting('test.amina')::uuid);
  perform t_ok('the inbox finds a listing addressed to your phone number',
    jsonb_array_length(public.listing_transfers_for_me() -> 'transfers') = 1);

  perform public.listing_transfer_accept(v_t);

  perform t_ok('accepting moves the listing',
    (select partner_id from public.listings where id = v_l) = current_setting('test.amina')::uuid);
  perform t_ok('accepting moves host_id with it',
    (select host_id from public.listings where id = v_l) = current_setting('test.amina')::uuid);
  perform t_ok('accepting moves owner_id with it, where that column exists',
    (select owner_id from public.listings where id = v_l) = current_setting('test.amina')::uuid);
  perform t_ok('an accepted on-behalf listing becomes an ordinary sole listing',
    (select ownership_type from public.listings where id = v_l) = 'sole');
  perform t_ok('the hold is cleared once it is claimed',
    (select held_for_name from public.listings where id = v_l) is null);
  perform t_ok('who built it is still recorded after the handover',
    (select created_by from public.listings where id = v_l) = current_setting('test.kevin')::uuid);
  perform t_ok('the transfer is marked accepted, not deleted',
    (select status from public.listing_transfers where id = v_t) = 'accepted');

  perform be(current_setting('test.kevin')::uuid);
  perform t_refuses('the previous holder can no longer redeclare it',
    format('select public.listing_declare_ownership(%L, ''sole'')', v_l));
end $$;


-- ── 7b · A LISTING BUILT IN THE FIELD PUBLISHES ON ACCEPTANCE ─────────────
-- An ambassador does all the work of a listing while sitting with the host.
-- Publishing that before the host agrees would put somebody's property and
-- phone number on a public website because a third party filled in a form.
do $$
declare v_l uuid; v_t uuid;
begin
  perform be(current_setting('test.kevin')::uuid);
  insert into public.listings (partner_id, host_id, title, city, is_active, status,
                               activate_on_claim, created_by, created_by_role)
  values (current_setting('test.kevin')::uuid, current_setting('test.kevin')::uuid,
          'Watamu cottage', 'Watamu', false, 'pending_owner', true,
          current_setting('test.kevin')::uuid, 'ambassador')
  returning id into v_l;

  perform public.listing_declare_ownership(v_l, 'on_behalf', null, '[]'::jsonb,
                                           'Joseph Otieno', 'joseph@example.com');
  select id into v_t from public.listing_transfers where listing_id = v_l and status = 'pending';

  perform t_ok('a listing built in the field is not live before it is claimed',
    (select is_active from public.listings where id = v_l) = false);

  perform be(current_setting('test.joseph')::uuid);
  perform public.listing_transfer_accept(v_t);

  perform t_ok('accepting publishes it',
    (select is_active from public.listings where id = v_l) = true);
  perform t_ok('accepting gives it a live status',
    (select status from public.listings where id = v_l) = 'active');
  perform t_ok('and the publish-on-claim flag is spent, not left armed',
    (select activate_on_claim from public.listings where id = v_l) = false);
  perform t_ok('the ambassador who built it is still on the record',
    (select created_by_role from public.listings where id = v_l) = 'ambassador');
end $$;

do $$
declare v_l uuid; v_t uuid;
begin
  -- A paused listing that is transferred normally must NOT be switched on by
  -- the handover. Only a listing that was built pending publishes this way.
  perform be(current_setting('test.kevin')::uuid);
  insert into public.listings (partner_id, host_id, title, is_active, status)
  values (current_setting('test.kevin')::uuid, current_setting('test.kevin')::uuid,
          'Paused unit', false, 'paused')
  returning id into v_l;
  perform public.listing_transfer_start(v_l, 'Joseph Otieno', 'joseph@example.com');
  select id into v_t from public.listing_transfers where listing_id = v_l and status = 'pending';

  perform be(current_setting('test.joseph')::uuid);
  perform public.listing_transfer_accept(v_t);
  perform t_ok('an ordinary transfer does not switch a paused listing on',
    (select is_active from public.listings where id = v_l) = false);
end $$;


-- ── 8 · HANDING A LIVE LISTING ON ─────────────────────────────────────────
do $$
declare v_l uuid; v_t uuid;
begin
  perform be(current_setting('test.kevin')::uuid);
  insert into public.listings (partner_id, host_id, owner_id, title, city)
  values (current_setting('test.kevin')::uuid, current_setting('test.kevin')::uuid,
          current_setting('test.kevin')::uuid, 'Lavington studio', 'Nairobi')
  returning id into v_l;

  perform public.listing_transfer_start(v_l, 'Joseph Otieno', 'joseph@example.com',
                                        'Selling the block, this one is yours.');
  select id into v_t from public.listing_transfers where listing_id = v_l and status = 'pending';

  perform t_refuses('one listing cannot have two transfers waiting',
    format('select public.listing_transfer_start(%L, ''Someone Else'', ''else@example.com'')', v_l));
  perform t_refuses('you cannot transfer a listing to yourself',
    format('select public.listing_transfer_start(%L, ''Me'', ''kevin@example.com'')',
           current_setting('test.listing2')));
  perform t_refuses('a listing with a transfer waiting cannot be redeclared',
    format('select public.listing_declare_ownership(%L, ''partnership'', ''equal'',
            ''[{"name":"X","contact":"x@example.com"}]''::jsonb)', v_l));

  -- Declining hands it back rather than stranding it.
  perform be(current_setting('test.joseph')::uuid);
  perform public.listing_transfer_decline(v_t);
  perform t_ok('a declined transfer is recorded as declined',
    (select status from public.listing_transfers where id = v_t) = 'declined');
  perform t_ok('the listing stays with whoever built it',
    (select partner_id from public.listings where id = v_l) = current_setting('test.kevin')::uuid);

  -- And the sender can start again afterwards.
  perform be(current_setting('test.kevin')::uuid);
  perform public.listing_transfer_start(v_l, 'Joseph Otieno', '0733000222');
  perform t_ok('a new transfer can be started after a decline',
    (select count(*) from public.listing_transfers
      where listing_id = v_l and status = 'pending') = 1);

  select id into v_t from public.listing_transfers where listing_id = v_l and status = 'pending';
  perform be(current_setting('test.stranger')::uuid);
  perform t_refuses('only the sender may cancel a transfer',
    format('select public.listing_transfer_cancel(%L)', v_t));
  perform be(current_setting('test.kevin')::uuid);
  perform public.listing_transfer_cancel(v_t);
  perform t_ok('the sender may cancel a transfer',
    (select status from public.listing_transfers where id = v_t) = 'cancelled');
end $$;


-- ── 9 · EXPIRY ────────────────────────────────────────────────────────────
do $$
declare v_l uuid; v_t uuid;
begin
  perform be(current_setting('test.kevin')::uuid);
  insert into public.listings (partner_id, host_id, title)
  values (current_setting('test.kevin')::uuid, current_setting('test.kevin')::uuid, 'Old offer')
  returning id into v_l;
  perform public.listing_transfer_start(v_l, 'Joseph Otieno', 'joseph@example.com');
  select id into v_t from public.listing_transfers where listing_id = v_l and status = 'pending';
  update public.listing_transfers set expires_at = now() - interval '1 day' where id = v_t;

  perform be(current_setting('test.joseph')::uuid);
  perform t_ok('an expired transfer is not in the inbox',
    not exists (select 1
      from jsonb_array_elements(public.listing_transfers_for_me() -> 'transfers') e
     where (e ->> 'id')::uuid = v_t));
  perform t_refuses('an expired transfer cannot be accepted',
    format('select public.listing_transfer_accept(%L)', v_t));

  -- The one that would have bitten in a year's time: uq_ltransfers_one_live
  -- keys on status = 'pending', so a stale pending row blocks the listing
  -- from EVER being transferred again. Starting a new transfer must sweep it.
  perform be(current_setting('test.kevin')::uuid);
  perform public.listing_transfer_start(v_l, 'Joseph Otieno', 'joseph@example.com');
  perform t_ok('a timed-out offer does not block the listing forever',
    (select status from public.listing_transfers where id = v_t) = 'expired');
  perform t_ok('and the replacement transfer is the live one',
    (select count(*) from public.listing_transfers
      where listing_id = v_l and status = 'pending') = 1);
end $$;


-- ── 10 · WRITES ARE CLOSED ────────────────────────────────────────────────
-- The functions are the only write path. A direct INSERT policy on
-- listing_partners would let anyone write themselves a 90% share of
-- somebody else's building.
do $$
begin
  perform t_ok('listing_partners has no insert policy',
    not exists (select 1 from pg_policies
      where schemaname='public' and tablename='listing_partners' and cmd in ('INSERT','ALL')));
  perform t_ok('listing_transfers has no insert policy',
    not exists (select 1 from pg_policies
      where schemaname='public' and tablename='listing_transfers' and cmd in ('INSERT','ALL')));
  perform t_ok('row level security is on for co-owners',
    (select relrowsecurity from pg_class where oid = 'public.listing_partners'::regclass));
  perform t_ok('row level security is on for transfers',
    (select relrowsecurity from pg_class where oid = 'public.listing_transfers'::regclass));
  perform t_ok('anon cannot execute the ownership functions',
    not has_function_privilege('anon',
      'public.listing_transfer_accept(uuid)', 'execute'));
  perform t_ok('a signed-in user can',
    has_function_privilege('authenticated',
      'public.listing_transfer_accept(uuid)', 'execute'));
end $$;


-- ── 11 · THE VIEW ─────────────────────────────────────────────────────────
do $$
declare v_l uuid := '11111111-1111-1111-1111-111111111111';
begin
  perform t_ok('the ownership view reports the partnership',
    (select ownership_type from public.v_listing_ownership where listing_id = v_l) = 'partnership');
  perform t_ok('the ownership view reports every live co-owner',
    (select partner_count from public.v_listing_ownership where listing_id = v_l) = 3);
  perform t_ok('the ownership view reports equity as a percentage',
    (select (partners -> 0 ->> 'equity_pct')::numeric
       from public.v_listing_ownership where listing_id = v_l) = 45.00);
end $$;
