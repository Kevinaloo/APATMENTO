-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · Fix recompute_internal_score(): host ranking never updated
-- ───────────────────────────────────────────────────────────────────
-- Same uuid/text mismatch as find_match_candidates and hours_to_checkin:
-- `where id = p_listing` compares listings.id (uuid) against p_listing
-- (text), which throws "operator does not exist: uuid = text" on every
-- call. This function is invoked after every private review reveal
-- (trg_review_score trigger) and after every resolved check-in issue
-- (api/lib/_checkin-issue.js), always wrapped in .catch(() => {}) at
-- the call site — so the schema's own claim, "private reviews never
-- surface, but they move a listing up or down," has never actually
-- been true. internal_score has been frozen at its default (50) for
-- every listing since this system shipped, regardless of reviews,
-- disputes, or host discipline. Fixed with explicit ::text casts on
-- both the read and the write. Additive, safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.recompute_internal_score(p_listing text)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  avg_r      numeric;
  n_r        int;
  n_issue    int;
  n_serious  int;
  n_yellow   int;
  n_book     int;
  bayes      numeric;
  score      numeric;
  h          uuid;
begin
  select host_id into h from public.listings where id::text = p_listing;

  select coalesce(avg(rating),0), count(*) into avg_r, n_r
    from public.private_reviews
   where listing_id = p_listing and direction = 'guest_to_host';

  select count(*) filter (where true),
         count(*) filter (where fault = 'host' and coalesce((select severity from public.issue_taxonomy t where t.code = i.issue_code),0) >= 4)
    into n_issue, n_serious
    from public.checkin_issues i where i.listing_id = p_listing;

  select public.active_yellow_count(h) into n_yellow;
  select count(*) into n_book from public.apartment_bookings where apartment_id = p_listing;

  bayes := ((avg_r * n_r) + (3.9 * 6)) / (n_r + 6);

  score := 50
         + (bayes - 3.9) * 14
         + least(n_book, 40) * 0.35
         - n_issue   * 4
         - n_serious * 9
         - n_yellow  * 12;

  score := greatest(0, least(100, round(score, 2)));
  update public.listings set internal_score = score where id::text = p_listing;
  return score;
end; $$;
