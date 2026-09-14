-- These tables are server-only. Explicit service-role policies document that
-- boundary and keep the database advisor from treating RLS-without-policies as
-- an accidental lockout. The service role also has its normal BYPASSRLS flag.
create policy host_listing_events_service_only on public.host_listing_events
  for all to service_role using (true) with check (true);
create policy host_photo_reviews_service_only on public.host_photo_reviews
  for all to service_role using (true) with check (true);
