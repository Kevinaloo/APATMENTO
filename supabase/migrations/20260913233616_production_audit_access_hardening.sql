-- Production audit: restore tenant isolation without changing inventory or prices.
-- Keep the existing ownership view's column order and shape for deployed clients.
do $migration$
declare definition text;
begin
  select pg_get_viewdef('public.v_listing_ownership'::regclass, true) into definition;
  if definition !~ 'FROM listings l;\s*$' then
    raise exception 'Unexpected ownership view definition; review before migrating';
  end if;
  execute 'create or replace view public.v_listing_ownership with (security_invoker=true, security_barrier=true) as '
    || regexp_replace(definition, ';\s*$', '')
    || ' where (select public.is_admin()) or (select public.is_operator())'
    || ' or l.partner_id = (select auth.uid()) or l.host_id = (select auth.uid())'
    || ' or exists (select 1 from public.listing_partners member'
    || ' where member.listing_id=l.id and member.user_id=(select auth.uid())'
    || ' and member.status=''active'')';
end $migration$;
revoke all on public.v_listing_ownership from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.v_listing_ownership from authenticated;
grant select on public.v_listing_ownership to authenticated;

notify pgrst, 'reload schema';
