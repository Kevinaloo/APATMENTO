-- Additive repair. Never overwrite an existing profile's roles, verification,
-- moderation flags, personal details or the newer member-profile projection.
create or replace function public.cabana_create_auth_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, new.created_at)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.cabana_create_auth_profile() from public, anon, authenticated;
drop trigger if exists cabana_auth_profile_created on auth.users;
create trigger cabana_auth_profile_created after insert on auth.users
for each row execute function public.cabana_create_auth_profile();

insert into public.profiles (id, email, created_at)
select u.id, u.email, u.created_at from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- The old API incremented the balance before inserting the unique ledger
-- entry. A duplicate request could therefore credit twice. Serialize a user's
-- claims and commit the ledger and balance together, never across HTTP calls.
create or replace function public.cabana_claim_welcome_credit(
  p_user uuid, p_points integer, p_from timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_created timestamptz;
  v_balance integer;
  v_existing integer;
  v_ref text := 'WELCOME-' || p_user::text;
begin
  if p_points is null or p_points < 1 or p_points > 10000 or p_from is null then
    raise exception 'invalid_welcome_configuration' using errcode = '22023';
  end if;
  select u.created_at into v_created from auth.users u where u.id = p_user;
  if not found then raise exception 'unknown_account' using errcode = '22023'; end if;

  perform 1 from public.profiles where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'profile_missing'); end if;
  select available_points into v_balance from public.user_points where user_id = p_user;
  select points into v_existing from public.point_transactions
    where booking_ref = v_ref and type = 'earn' and user_id = p_user limit 1;
  if found then
    return jsonb_build_object('ok', true, 'already', true, 'points', v_existing, 'balance', coalesce(v_balance, 0));
  end if;
  if v_created < p_from then
    return jsonb_build_object('ok', false, 'eligible', false, 'reason', 'account_predates_offer', 'balance', coalesce(v_balance, 0));
  end if;

  insert into public.point_transactions (user_id, type, points, amount_kes, service_type, booking_ref, description)
  values (p_user, 'earn', p_points, p_points, 'welcome', v_ref, 'Welcome credit · ' || p_points || ' credits');
  perform public.add_user_points(p_user, p_points, true);
  select available_points into v_balance from public.user_points where user_id = p_user;
  return jsonb_build_object('ok', true, 'granted', true, 'points', p_points, 'balance', v_balance);
end;
$$;
revoke all on function public.cabana_claim_welcome_credit(uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.cabana_claim_welcome_credit(uuid, integer, timestamptz) to service_role;
