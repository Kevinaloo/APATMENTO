-- Internal orchestration helpers must not be callable through PostgREST.
revoke execute on function public.cab_broadcast(uuid,double precision) from public,anon,authenticated;
revoke execute on function public.cab_expire_search(uuid) from public,anon,authenticated;
revoke execute on function public.cabana_departures_at_risk() from public,anon,authenticated;
revoke execute on function public.cabana_user_contacts(uuid) from public,anon,authenticated;
revoke execute on function public.listing_transfers_expire(uuid) from public,anon,authenticated;
grant execute on function public.cab_broadcast(uuid,double precision),
  public.cab_expire_search(uuid),
  public.cabana_departures_at_risk(),
  public.cabana_user_contacts(uuid),
  public.listing_transfers_expire(uuid) to service_role;

-- This remains available to signed-in recovery flows, but never to guests.
revoke execute on function public.find_match_candidates(uuid,integer) from public,anon;
grant execute on function public.find_match_candidates(uuid,integer) to authenticated,service_role;

-- Admin and trigger functions have no anonymous browser caller.
revoke execute on function public.fd_desk_stats(),
  public.fd_load_airlines(text),
  public.fd_load_airports(text),
  public.fd_publish_quotes(uuid) from public,anon;
grant execute on function public.fd_desk_stats(),
  public.fd_load_airlines(text),
  public.fd_load_airports(text),
  public.fd_publish_quotes(uuid) to authenticated,service_role;
revoke execute on function public.fd_log_status(),
  public.music_tracks_after_write() from public,anon,authenticated;

notify pgrst, 'reload schema';
