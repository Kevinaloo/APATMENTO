-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · Fix check-in-time timezone bug in hours_to_checkin()
-- ───────────────────────────────────────────────────────────────────
-- Two independent bugs in one function, both silent:
--
-- 1. Timezone. The listing's check-in time (entered and displayed as
--    Nairobi wall-clock, e.g. "14:00") was composed into a timestamp
--    with no offset. Postgres cast that string using the session's
--    timezone, which on this database is UTC — so "14:00" was read as
--    14:00 UTC (17:00 Nairobi), three hours later than the real
--    check-in instant. Every policy built on this function inherited
--    the error: the 24-hour Match-Guest gate, the auto-redirect/
--    no-penalty cutoff in compute_settlement(), and match_allowed()
--    all stayed "more than 24 hours out" for three extra hours right
--    before a guest's real check-in — the exact window where getting
--    this right matters most. Fixed by pinning the offset to Nairobi's
--    fixed UTC+3 (no DST, ever), matching the corresponding fix made
--    to api/lib/_match-guest.js, api/lib/_checkin-issue.js and
--    apa-trust.js.
--
-- 2. Type mismatch. apartment_bookings.apartment_id is `text`;
--    listings.id is `uuid`. The join `l.id = b.apartment_id` doesn't
--    just misbehave, it throws "operator does not exist: uuid = text"
--    on every single call — meaning this function has never actually
--    returned a value in production. Every caller wraps its use in a
--    try/catch with a client-side fallback, so the failure was
--    invisible, but the database was never the "single source of
--    truth" the codebase's comments describe it as. Fixed by casting
--    the uuid side to text for the comparison.
--
-- Additive, safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.hours_to_checkin(p_booking uuid)
returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  b   public.apartment_bookings%rowtype;
  ct  text;
  ts  timestamptz;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  if not found then return null; end if;

  select coalesce(l.checkin_time, '14:00') into ct
    from public.listings l where l.id::text = b.apartment_id;

  ts := (b.checkin_date::text || 'T' || coalesce(ct, '14:00') || ':00+03:00')::timestamptz;
  return extract(epoch from (ts - now())) / 3600.0;
end; $$;
