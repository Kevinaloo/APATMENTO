-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v3 · the pause fingerprint belongs to the database
-- ───────────────────────────────────────────────────────────────────
-- tour_operator_pause() stores a fingerprint of the tour when a guide
-- pauses it, and only a tour that comes back unchanged goes straight
-- back live. Guides may edit their own paused tours directly (that is
-- how they fix things), so the fingerprint itself must be out of their
-- reach: otherwise a guide could write a matching fingerprint onto any
-- tour of theirs and resume it past review.
--
-- From here on pause_sig changes only inside tour_operator_pause(), or
-- by an admin. Anything else writing it is quietly ignored.
-- ═══════════════════════════════════════════════════════════════════

create or replace function cabana_private.tour_pause_sig_guard()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if coalesce(current_setting('cabana.tour_pause', true), '') = '1' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.pause_sig := null;
  elsif new.pause_sig is distinct from old.pause_sig then
    new.pause_sig := old.pause_sig;
  end if;
  return new;
end $$;
drop trigger if exists tour_pause_sig_guard on public.tours;
create trigger tour_pause_sig_guard before insert or update on public.tours
  for each row execute function cabana_private.tour_pause_sig_guard();

create or replace function public.tour_operator_pause(p_tour bigint, p_pause boolean default true)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare me uuid := auth.uid(); t public.tours%rowtype; v_to text;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into t from public.tours where id = p_tour and owner_id = me for update;
  if not found then raise exception 'That tour is not one of yours.' using errcode = '42501'; end if;
  perform set_config('cabana.tour_pause', '1', true);
  if coalesce(p_pause, true) then
    if t.status <> 'published' then raise exception 'Only a live tour can be paused.' using errcode = '22023'; end if;
    update public.tours set status = 'paused', pause_sig = cabana_private.tour_sig(t) where id = t.id;
    v_to := 'paused';
  else
    if t.status <> 'paused' then raise exception 'Only a paused tour can be resumed.' using errcode = '22023'; end if;
    if t.pause_sig is null then
      perform set_config('cabana.tour_pause', '', true);
      raise exception 'Cabana paused this tour. Message support to have it looked at.' using errcode = '42501', hint = 'paused_by_cabana';
    end if;
    v_to := case when t.pause_sig = cabana_private.tour_sig(t) then 'published' else 'pending' end;
    update public.tours set status = v_to, pause_sig = null where id = t.id;
  end if;
  perform set_config('cabana.tour_pause', '', true);
  return jsonb_build_object('status', v_to);
end $$;
revoke all on function public.tour_operator_pause(bigint, boolean) from public, anon;
grant execute on function public.tour_operator_pause(bigint, boolean) to authenticated;

-- A change the console applies to a tour that is paused at the time
-- was approved by a person, so the fingerprint follows it: resuming
-- then goes straight back live instead of into review again.
create or replace function public.admin_tour_change_decide(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare cr public.tour_change_requests%rowtype; r public.tours%rowtype; sets text; v_title text; after public.tours%rowtype;
begin
  perform cabana_admin.guard();
  select * into cr from public.tour_change_requests where id = p_id for update;
  if not found then raise exception 'Change not found' using errcode = '22023'; end if;
  if cr.status <> 'pending' then raise exception 'This change is already %.', cr.status using errcode = '22023'; end if;
  select title into v_title from public.tours where id = cr.tour_id;
  if p_action = 'apply' then
    r := jsonb_populate_record(null::public.tours, cr.patch);
    select string_agg(format('%I = ($1).%I', k, k), ', ') into sets
      from jsonb_object_keys(cr.patch) k where k = any(cabana_private.tour_editable_fields());
    if sets is not null then
      execute format('update public.tours set %s, updated_at = now() where id = $2', sets) using r, cr.tour_id;
    end if;
    select * into after from public.tours where id = cr.tour_id;
    if after.status = 'paused' and after.pause_sig is not null then
      perform set_config('cabana.tour_pause', '1', true);
      update public.tours set pause_sig = cabana_private.tour_sig(after) where id = cr.tour_id;
      perform set_config('cabana.tour_pause', '', true);
    end if;
    update public.tour_change_requests set status = 'applied', reviewed_at = now(),
           reviewed_by = lower(coalesce(auth.jwt()->>'email', 'console')), review_note = nullif(btrim(coalesce(p_note, '')), '')
     where id = cr.id;
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (cr.user_id, 'Your changes are live', coalesce(v_title, 'Your tour') || ' now shows your changes.',
            '/tours?open=' || cr.tour_id, 'general', jsonb_build_object('tour_change', cr.id));
  elsif p_action = 'decline' then
    update public.tour_change_requests set status = 'declined', reviewed_at = now(),
           reviewed_by = lower(coalesce(auth.jwt()->>'email', 'console')), review_note = nullif(btrim(coalesce(p_note, '')), '')
     where id = cr.id;
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (cr.user_id, 'About your changes to ' || coalesce(v_title, 'your tour'),
            coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'They were not applied. Open your studio for the details.'),
            '/tours-studio?tab=tours', 'general', jsonb_build_object('tour_change', cr.id));
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform cabana_admin.log('tour_change_' || p_action, 'tour', cr.tour_id::text, jsonb_build_object('change', cr.id, 'note', p_note));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_tour_change_decide(uuid, text, text) from public, anon;
grant execute on function public.admin_tour_change_decide(uuid, text, text) to authenticated;

-- Anything already carrying a fingerprint that is not a paused tour
-- loses it.
do $$ begin
  perform set_config('cabana.tour_pause', '1', true);
  update public.tours set pause_sig = null where pause_sig is not null and status <> 'paused';
  perform set_config('cabana.tour_pause', '', true);
end $$;

notify pgrst, 'reload schema';
