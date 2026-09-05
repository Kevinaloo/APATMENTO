-- The project grants a default write privilege to anon on new tables in the
-- public schema. RLS still refuses the write because no such policy exists,
-- but a grant that survives only because of a second mechanism is a grant
-- waiting to be exposed by a policy added later in a hurry.
--
-- The original chart migration revoked these explicitly. The artists and
-- awards tables shipped without matching it. This closes that.
revoke insert, update, delete on public.music_chart_artists from anon, authenticated;
revoke insert, update, delete on public.music_chart_awards from anon, authenticated;
revoke insert, update, delete on public.music_chart_artist_daily from anon, authenticated;
revoke insert, update, delete on public.music_search_cache from anon, authenticated;

-- Standings are derived, never asserted by a visitor.
revoke all on function public.music_refresh_standings(text) from anon, authenticated;
revoke all on function public.music_tracks_after_write() from anon, authenticated;
