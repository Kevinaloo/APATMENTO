-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v2 · 3 of 5 · operators: private contacts, a public face
-- ───────────────────────────────────────────────────────────────────
-- tour_operators was readable column-for-column by anyone for every
-- approved operator, phone, WhatsApp and email included. The messenger
-- withholds a phone number typed into a chat; the same number was one
-- REST call away. Contacts are now readable only by the operator
-- themselves (tour_operator_me) and the console (admin_tour_operators).
-- Inserts and the operator's own updates are unchanged.
--
-- tour_guides_directory() is what /tour-guides renders: the public face
-- of every approved guide and company, with what they actually run.
-- tour_operator_bookings() is the operator's own view of who booked,
-- with contact details released only once a booking is paid, the same
-- rule the messenger applies.
-- ═══════════════════════════════════════════════════════════════════

revoke select on public.tour_operators from anon, authenticated;
grant select (id, owner_id, slug, name, tagline, bio, logo_url, county, kind, status,
              verified, verified_at, created_at, updated_at, persona)
  on public.tour_operators to anon, authenticated;

create or replace function public.tour_operator_me()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select to_jsonb(o) from public.tour_operators o
   where o.owner_id = auth.uid() and auth.uid() is not null
   order by o.created_at limit 1
$$;
revoke all on function public.tour_operator_me() from public, anon;
grant execute on function public.tour_operator_me() to authenticated;

create or replace function public.admin_tour_operators()
returns setof public.tour_operators language plpgsql stable security definer
set search_path = pg_catalog, public as $$
begin
  perform cabana_admin.guard();
  return query select * from public.tour_operators order by created_at desc;
end $$;
revoke all on function public.admin_tour_operators() from public, anon;
grant execute on function public.admin_tour_operators() to authenticated;

-- ── the guides directory ────────────────────────────────────────────
create or replace function public.tour_guides_directory()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  with live as (
    select t.* from public.tours t where t.status = 'published'
  ),
  nextdep as (
    select t.operator_id, min(d.departs_at) as next_at
      from public.tour_departures(90, null, 1) d
      join public.tours t on t.id = d.tour_id
     group by t.operator_id
  )
  select coalesce(jsonb_agg(row order by (row->>'tours')::int desc, (row->>'verified')::boolean desc, row->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', o.id, 'slug', o.slug, 'name', o.name, 'tagline', o.tagline, 'bio', left(coalesce(o.bio, ''), 700),
      'logo', o.logo_url, 'county', o.county, 'kind', o.kind, 'persona', o.persona, 'verified', o.verified,
      'owner', o.owner_id, 'since', to_char(o.created_at, 'YYYY'),
      'tours', (select count(*) from live l where l.operator_id = o.id),
      'from_kes', (select min(l.price_kes) from live l where l.operator_id = o.id and l.price_kes > 0),
      'free', coalesce((select bool_or(l.price_kes = 0) from live l where l.operator_id = o.id), false),
      'languages', coalesce((select jsonb_agg(distinct lang) from live l,
                               jsonb_array_elements_text(case when jsonb_typeof(l.languages) = 'array' then l.languages else '[]'::jsonb end) lang
                              where l.operator_id = o.id), '[]'::jsonb),
      'places', coalesce((select jsonb_agg(distinct p) from (
                            select coalesce(nullif(btrim(l.destination), ''), nullif(btrim(l.county), '')) p
                              from live l where l.operator_id = o.id) q where p is not null), '[]'::jsonb),
      'cover', (select coalesce(l.cover_url, l.photos->>0) from live l where l.operator_id = o.id
                 order by l.featured desc, l.published_at desc nulls last limit 1),
      'next_departure', (select n.next_at from nextdep n where n.operator_id = o.id),
      'messageable', o.owner_id is not null
    ) as row
    from public.tour_operators o
   where o.status = 'approved'
  ) x
$$;
revoke all on function public.tour_guides_directory() from public;
grant execute on function public.tour_guides_directory() to anon, authenticated;

-- ── an operator's own bookings ──────────────────────────────────────
create or replace function public.tour_operator_bookings(p_scope text default 'upcoming')
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  me uuid := auth.uid();
  paid text[] := array['confirmed_balance_due', 'paid_pending_checkin', 'checked_in', 'confirmed', 'reserved'];
  today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if me is null then raise exception 'Sign in to see your bookings.' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(row order by (row->>'tour_date') asc, row->>'created_at')
      from (
        select jsonb_build_object(
          'id', b.id, 'tour_id', b.tour_id, 'tour', coalesce(t.title, b.tour_name),
          'cover', coalesce(t.cover_url, t.photos->>0),
          'tour_date', b.tour_date, 'people', b.num_people, 'status', b.status,
          'paid', b.status = any(paid) and b.cancelled_at is null,
          'cancelled', b.cancelled_at is not null,
          'tour_total', b.tour_total, 'grand_total', b.grand_total, 'amount_paid', b.amount_paid,
          'balance_on_day', b.operator_balance, 'created_at', b.created_at,
          'guest', jsonb_build_object('id', b.guest_id, 'name', cabana_private.member_name(b.guest_id)),
          'contact', case when b.status = any(paid) and b.cancelled_at is null
                          then jsonb_build_object('phone', b.contact_phone, 'whatsapp', b.contact_whatsapp, 'email', b.contact_email)
                          end,
          'host_code', case when b.status = any(paid) and b.cancelled_at is null then b.host_code end,
          'conversation', (select c.id from public.chat_conversations c
                            where c.tour_id = b.tour_id and c.guest_id = b.guest_id limit 1)
        ) as row
          from public.tour_bookings b
          join public.tours t on t.id = b.tour_id
         where (b.host_id = me or t.owner_id = me)
           and case coalesce(p_scope, 'upcoming')
                 when 'upcoming' then b.tour_date >= today - 1 and b.cancelled_at is null
                 when 'past' then b.tour_date < today - 1 or b.cancelled_at is not null
                 else true end
         limit 400
      ) q), '[]'::jsonb);
end $$;
revoke all on function public.tour_operator_bookings(text) from public, anon;
grant execute on function public.tour_operator_bookings(text) to authenticated;

notify pgrst, 'reload schema';
