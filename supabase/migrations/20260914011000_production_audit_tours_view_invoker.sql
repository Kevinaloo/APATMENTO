-- Public tours remain readable, but the view now respects the published-tour
-- and approved-operator RLS policies of its underlying tables.
alter view public.tours_public set (security_invoker=true, security_barrier=true);
revoke insert, update, delete, truncate, references, trigger
  on public.tours_public from public, anon, authenticated;
grant select on public.tours_public to anon, authenticated;
notify pgrst, 'reload schema';
