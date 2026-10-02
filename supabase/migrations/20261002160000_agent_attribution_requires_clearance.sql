-- A booking that arrives through an agent link pays commission only if the
-- agent is cleared at that moment (verified identity, not suspended). The
-- click was already refused for uncleared agents; this closes conversion.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.agent_attribute_booking(text,text,numeric,uuid,text)'::regprocedure);
  if position('agent_can_earn' in d) > 0 then return; end if;
  p := replace(d,
    $x$  if not found then return null; end if;
  if not exists(select 1 from public.agent_partnerships$x$,
    $x$  if not found then return null; end if;
  -- An agent who is not cleared (unverified, suspended) earns nothing.
  if not public.agent_can_earn(v_ref.agent_id) then
    update public.agent_referrals set status='void' where id=v_ref.id; return null; end if;
  if not exists(select 1 from public.agent_partnerships$x$);
  if p = d then raise exception 'agent_attribute_booking changed shape'; end if;
  execute p;
end $$;
