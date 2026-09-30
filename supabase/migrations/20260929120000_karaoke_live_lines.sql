-- ═══════════════════════════════════════════════════════════════════
--  CABANA KARAOKE · live lines and the lyric studio
--  ─────────────────────────────────────────────────────────────────
--  1. Rooms talk over private Realtime channels. Who may listen and
--     who may speak is decided here, per topic, when a device joins:
--
--       kr:<room id>   the stage: the conductor's clock, the singer's
--                      voice, the live lyric position. Anyone who can
--                      see the room listens; only its host and its
--                      singers can send.
--       kc:<room id>   the crowd: who is watching (presence) and the
--                      reactions. Anyone who can see the room is
--                      counted; only signed-in members can react.
--
--     Nothing else in the project uses private channels, and every
--     other topic is refused, so these policies open nothing but the
--     karaoke rooms.
--
--  2. The lyric studio. Most Kenyan and East African songs have no
--     timed lyrics anywhere. A member can paste the words and tap them
--     in time while the video plays; the draft waits for the team, and
--     once approved every singer of that video gets it, credited.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · REALTIME ───────────────────────────────────────────────────
create or replace function public.karaoke_topic_room(p_topic text)
returns uuid
language sql
immutable
set search_path = pg_catalog
as $$
  select case when p_topic ~ '^k[rc]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then substr(p_topic, 4)::uuid end;
$$;

create or replace function public.karaoke_rt_listen(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.karaoke_topic_room(p_topic) is not null
     and public.karaoke_room_visible(public.karaoke_topic_room(p_topic));
$$;

create or replace function public.karaoke_rt_send(p_topic text, p_extension text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p_topic like 'kr:%' then
      p_extension = 'broadcast' and auth.uid() is not null and exists (
        select 1 from public.karaoke_rooms r
         where r.id = public.karaoke_topic_room(p_topic) and r.status <> 'ended'
           and (r.host_id = auth.uid()
                or exists (select 1 from public.karaoke_members m
                            where m.room_id = r.id and m.user_id = auth.uid() and m.role in ('host', 'singer'))))
    when p_topic like 'kc:%' then
      public.karaoke_rt_listen(p_topic)
      and (p_extension = 'presence' or (p_extension = 'broadcast' and auth.uid() is not null))
    else false
  end;
$$;

revoke all on function public.karaoke_topic_room(text) from public;
revoke all on function public.karaoke_rt_listen(text) from public;
revoke all on function public.karaoke_rt_send(text, text) from public;
grant execute on function public.karaoke_topic_room(text) to anon, authenticated;
grant execute on function public.karaoke_rt_listen(text) to anon, authenticated;
grant execute on function public.karaoke_rt_send(text, text) to anon, authenticated;

drop policy if exists "karaoke rooms listen" on realtime.messages;
create policy "karaoke rooms listen" on realtime.messages
  for select to anon, authenticated
  using (public.karaoke_rt_listen((select realtime.topic())));

drop policy if exists "karaoke rooms speak" on realtime.messages;
create policy "karaoke rooms speak" on realtime.messages
  for insert to anon, authenticated
  with check (public.karaoke_rt_send((select realtime.topic()), extension));

-- ── 2 · THE LYRIC STUDIO ───────────────────────────────────────────
create table if not exists public.karaoke_lyric_drafts (
  id          uuid primary key default gen_random_uuid(),
  video_id    text not null references public.karaoke_songs(video_id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  doc         jsonb not null check (jsonb_typeof(doc) = 'object' and pg_column_size(doc) < 200000),
  lines       integer not null check (lines between 4 and 400),
  synced      boolean not null default true,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  note        text check (note is null or length(note) <= 280),
  reviewer    text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists karaoke_lyric_drafts_one_pending
  on public.karaoke_lyric_drafts (video_id, user_id) where status = 'pending';
create index if not exists karaoke_lyric_drafts_queue on public.karaoke_lyric_drafts (status, created_at desc);
create index if not exists karaoke_lyric_drafts_user on public.karaoke_lyric_drafts (user_id, created_at desc);

alter table public.karaoke_lyric_drafts enable row level security;
drop policy if exists karaoke_lyric_drafts_own on public.karaoke_lyric_drafts;
create policy karaoke_lyric_drafts_own on public.karaoke_lyric_drafts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke all on public.karaoke_lyric_drafts from anon, authenticated;
grant select on public.karaoke_lyric_drafts to authenticated;

-- A draft is rebuilt from what was sent, field by field: nothing the
-- page adds survives except the words and their times.
create or replace function public.karaoke_lyrics_clean(p_doc jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_el jsonb;
  v_t numeric;
  v_prev numeric := -1;
  v_x text;
  v_lines jsonb := '[]'::jsonb;
  v_timed int := 0;
  v_n int := 0;
begin
  if jsonb_typeof(p_doc) <> 'object' or jsonb_typeof(p_doc -> 'lines') <> 'array' then return null; end if;
  if jsonb_array_length(p_doc -> 'lines') > 400 then return null; end if;
  for v_el in select value from jsonb_array_elements(p_doc -> 'lines') loop
    if jsonb_typeof(v_el) <> 'object' then return null; end if;
    v_x := btrim(regexp_replace(left(coalesce(v_el ->> 'x', ''), 200), '[[:cntrl:]]+', ' ', 'g'));
    if v_x = '' then continue; end if;
    v_t := null;
    if jsonb_typeof(v_el -> 't') = 'number' then
      v_t := round((v_el ->> 't')::numeric, 2);
      if v_t < 0 or v_t > 7200 or v_t < v_prev then return null; end if;
      v_prev := v_t;
      v_timed := v_timed + 1;
    end if;
    v_n := v_n + 1;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('t', v_t, 'x', v_x));
  end loop;
  if v_n < 4 then return null; end if;
  -- All timed or none: a half-timed lyric would jump.
  if v_timed <> 0 and v_timed <> v_n then return null; end if;
  return jsonb_build_object('v', 1, 'synced', v_timed = v_n, 'words', false, 'source', 'studio', 'lines', v_lines);
end;
$$;

create or replace function public.karaoke_lyrics_apply(p_draft uuid, p_reviewer text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  d public.karaoke_lyric_drafts%rowtype;
  v_doc jsonb;
  v_song text;
begin
  select * into d from public.karaoke_lyric_drafts where id = p_draft for update;
  if not found then return; end if;
  v_doc := d.doc || jsonb_build_object('credit', public.karaoke_stage(d.user_id), 'draft', d.id);
  update public.karaoke_songs set
    lyrics = v_doc,
    lyrics_status = case when d.synced then 'synced' else 'plain' end,
    lyrics_source = 'manual',
    lyrics_ref = 'studio:' || left(d.id::text, 8),
    lyrics_checked_at = now(),
    -- New words, new clock: what singers taught about the old one no
    -- longer applies.
    offset_s = 0,
    offset_n = 0
  where video_id = d.video_id;
  update public.karaoke_lyric_drafts set status = 'approved', reviewer = left(p_reviewer, 120), reviewed_at = now() where id = d.id;
  update public.karaoke_lyric_drafts set status = 'withdrawn'
   where video_id = d.video_id and status = 'pending' and id <> d.id and user_id = d.user_id;
  select coalesce(nullif(track, ''), title) into v_song from public.karaoke_songs where video_id = d.video_id;
  perform public.cabana_notify(
    d.user_id, 'karaoke',
    'Your lyrics are live',
    left('Everyone singing “' || coalesce(v_song, 'your song') || '” now sings with your timing. Thank you.', 240),
    '/events/karaoke/sing/' || d.video_id,
    jsonb_build_object('video', d.video_id, 'draft', d.id));
end;
$$;
revoke all on function public.karaoke_lyrics_apply(uuid, text) from public, anon, authenticated;

create or replace function public.karaoke_lyrics_submit(p_video text, p_doc jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_doc jsonb;
  v_id uuid;
  v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  if not exists (select 1 from public.karaoke_songs s where s.video_id = p_video and not s.hidden) then
    return jsonb_build_object('ok', false, 'reason', 'song');
  end if;
  if (select count(*) from public.karaoke_lyric_drafts d where d.user_id = v_uid and d.created_at > now() - interval '1 day') >= 12 then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;
  v_doc := public.karaoke_lyrics_clean(p_doc);
  if v_doc is null then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  update public.karaoke_lyric_drafts set status = 'withdrawn'
   where video_id = p_video and user_id = v_uid and status = 'pending';
  insert into public.karaoke_lyric_drafts (video_id, user_id, doc, lines, synced)
  values (p_video, v_uid, v_doc, jsonb_array_length(v_doc -> 'lines'), (v_doc ->> 'synced')::boolean)
  returning id into v_id;
  v_status := 'pending';
  -- The team's own drafts go straight in.
  if public.is_admin() then
    perform public.karaoke_lyrics_apply(v_id, coalesce(auth.jwt() ->> 'email', 'team'));
    v_status := 'approved';
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', v_status, 'lines', jsonb_array_length(v_doc -> 'lines'), 'synced', (v_doc ->> 'synced')::boolean);
end;
$$;

-- What this member has waiting for one video: they can sing with it
-- (unranked) before it is approved.
create or replace function public.karaoke_lyrics_mine(p_video text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select jsonb_build_object('id', d.id, 'status', d.status, 'doc', d.doc, 'note', d.note, 'created_at', d.created_at, 'reviewed_at', d.reviewed_at)
      from public.karaoke_lyric_drafts d
     where d.user_id = auth.uid() and d.video_id = p_video and d.status in ('pending', 'rejected', 'approved')
     order by d.created_at desc limit 1), 'null'::jsonb);
$$;

create or replace function public.admin_karaoke_lyric_drafts()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', d.id, 'video_id', d.video_id, 'status', d.status, 'lines', d.lines, 'synced', d.synced,
             'doc', d.doc, 'note', d.note, 'created_at', d.created_at, 'reviewed_at', d.reviewed_at, 'reviewer', d.reviewer,
             'email', u.email, 'by', public.karaoke_stage(d.user_id),
             'song', jsonb_build_object('title', s.title, 'artist', s.artist, 'track', s.track, 'track_artist', s.track_artist,
                                        'lyrics_status', s.lyrics_status, 'lyrics_source', s.lyrics_source, 'kind', s.kind))
           order by (d.status = 'pending') desc, d.created_at desc)
      from (select * from public.karaoke_lyric_drafts order by (status = 'pending') desc, created_at desc limit 120) d
      join public.karaoke_songs s on s.video_id = d.video_id
      left join auth.users u on u.id = d.user_id), '[]'::jsonb);
end;
$$;

create or replace function public.admin_karaoke_lyric_review(p_draft uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  d public.karaoke_lyric_drafts%rowtype;
  v_song text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into d from public.karaoke_lyric_drafts where id = p_draft;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if p_action = 'approve' then
    perform public.karaoke_lyrics_apply(p_draft, coalesce(auth.jwt() ->> 'email', 'team'));
  elsif p_action = 'reject' then
    update public.karaoke_lyric_drafts set status = 'rejected', note = left(p_note, 280),
           reviewer = left(coalesce(auth.jwt() ->> 'email', 'team'), 120), reviewed_at = now()
     where id = p_draft and status = 'pending';
    select coalesce(nullif(track, ''), title) into v_song from public.karaoke_songs where video_id = d.video_id;
    perform public.cabana_notify(
      d.user_id, 'karaoke',
      'Your lyrics need another look',
      left('“' || coalesce(v_song, 'Your song') || '”' || coalesce(': ' || nullif(btrim(p_note), ''), ' was not approved this time.'), 240),
      '/events/karaoke/studio/' || d.video_id,
      jsonb_build_object('video', d.video_id, 'draft', d.id));
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform cabana_admin.log('karaoke_lyrics_' || p_action, 'karaoke_lyric_draft', p_draft::text, jsonb_build_object('video', d.video_id, 'note', p_note));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.karaoke_lyrics_clean(jsonb) from public, anon, authenticated;
revoke all on function public.karaoke_lyrics_submit(text, jsonb) from public, anon;
revoke all on function public.karaoke_lyrics_mine(text) from public, anon;
revoke all on function public.admin_karaoke_lyric_drafts() from public, anon;
revoke all on function public.admin_karaoke_lyric_review(uuid, text, text) from public, anon;
grant execute on function public.karaoke_lyrics_submit(text, jsonb) to authenticated;
grant execute on function public.karaoke_lyrics_mine(text) to authenticated;
grant execute on function public.admin_karaoke_lyric_drafts() to authenticated;
grant execute on function public.admin_karaoke_lyric_review(uuid, text, text) to authenticated;
