-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v2 · 2 of 5 · saved tours
-- ───────────────────────────────────────────────────────────────────
-- A heart on a tour used to write to one browser's localStorage and
-- nowhere else: saved on the phone, gone on the laptop. Saves now live
-- in Postgres for signed-in travellers. The page still keeps a local
-- copy for guests and merges it in the moment they sign in
-- (tour_saves_sync), so nothing tapped before signing in is lost.
--
-- tour_popularity() exposes counts only, never who saved what. The page
-- shows a count once it is worth showing; it never invents one.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.tour_saves (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  tour_id    bigint      not null references public.tours(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tour_id)
);
create index if not exists tour_saves_tour_idx on public.tour_saves (tour_id);
alter table public.tour_saves enable row level security;

drop policy if exists tour_saves_own_read on public.tour_saves;
drop policy if exists tour_saves_own_insert on public.tour_saves;
drop policy if exists tour_saves_own_delete on public.tour_saves;
create policy tour_saves_own_read on public.tour_saves for select to authenticated
  using (user_id = (select auth.uid()));
create policy tour_saves_own_insert on public.tour_saves for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy tour_saves_own_delete on public.tour_saves for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.tour_saves from public, anon;
grant select, insert, delete on public.tour_saves to authenticated;
grant all on public.tour_saves to service_role;

-- Add and remove in one round trip; answers with the full saved list so
-- the page can adopt the server's view without a second query.
create or replace function public.tour_saves_sync(p_add bigint[] default '{}', p_remove bigint[] default '{}')
returns bigint[] language plpgsql security definer set search_path = pg_catalog, public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in to save tours.' using errcode = '42501'; end if;
  if cardinality(coalesce(p_add, '{}')) > 200 or cardinality(coalesce(p_remove, '{}')) > 200 then
    raise exception 'Too many tours at once.' using errcode = '22023';
  end if;
  delete from public.tour_saves where user_id = me and tour_id = any(coalesce(p_remove, '{}'));
  insert into public.tour_saves (user_id, tour_id)
       select me, t.id from public.tours t
        where t.id = any(coalesce(p_add, '{}')) and t.status = 'published'
           and not (t.id = any(coalesce(p_remove, '{}')))
  on conflict do nothing;
  return array(select s.tour_id from public.tour_saves s
                 join public.tours t on t.id = s.tour_id and t.status = 'published'
                where s.user_id = me order by s.created_at desc);
end $$;
revoke all on function public.tour_saves_sync(bigint[], bigint[]) from public, anon;
grant execute on function public.tour_saves_sync(bigint[], bigint[]) to authenticated;

create or replace function public.tour_popularity()
returns table (tour_id bigint, saves integer)
language sql stable security definer set search_path = pg_catalog, public as $$
  select s.tour_id, count(*)::int
    from public.tour_saves s
    join public.tours t on t.id = s.tour_id and t.status = 'published'
   group by s.tour_id
$$;
revoke all on function public.tour_popularity() from public;
grant execute on function public.tour_popularity() to anon, authenticated;
