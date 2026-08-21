/* ════════════════════════════════════════════════════════════════════
   CABANA · UNSUBSCRIBE BY TOKEN
   ────────────────────────────────────────────────────────────────────
   An unsubscribe that makes you sign in first is not an unsubscribe. It
   is also, in most jurisdictions, not compliant — the link in the email
   has to work, from any device, on the first tap.

   But the row is keyed by email address, and no anonymous browser may be
   allowed to read or write email_preferences generally. So neither of
   these is a table grant: they are two narrow functions that take the
   token from the link, resolve exactly one row, and touch exactly four
   boolean columns. The token is 36 hex characters of CSPRNG output, is
   per-address, and confers nothing beyond these four flags — it cannot
   read a name, a booking, or another address.
════════════════════════════════════════════════════════════════════ */

create or replace function public.email_prefs_get(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when p.email is null then null else jsonb_build_object(
    /* The address is returned so the page can say WHOSE preferences
       these are. Somebody forwarded an email is the common case where a
       silent unsubscribe would hit the wrong person. */
    'email',           p.email,
    'product',         p.product,
    'promotions',      p.promotions,
    'partner_updates', p.partner_updates,
    'unsubscribed_at', p.unsubscribed_at
  ) end
  from public.email_preferences p
  where p.unsubscribe_token = p_token
  limit 1;
$$;

create or replace function public.email_prefs_set(
  p_token           text,
  p_product         boolean,
  p_promotions      boolean,
  p_partner_updates boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare row_out public.email_preferences;
begin
  update public.email_preferences
     set product         = coalesce(p_product, product),
         promotions      = coalesce(p_promotions, promotions),
         partner_updates = coalesce(p_partner_updates, partner_updates),
         /* "Unsubscribed" is the state where nothing optional is left
            on. Transactional mail is unaffected and cannot be turned
            off here, because a receipt is part of the purchase. */
         unsubscribed_at = case
           when coalesce(p_product, product) = false
            and coalesce(p_promotions, promotions) = false
            and coalesce(p_partner_updates, partner_updates) = false
           then coalesce(unsubscribed_at, now())
           else null
         end,
         updated_at = now()
   where unsubscribe_token = p_token
   returning * into row_out;

  if row_out.email is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_token');
  end if;

  return jsonb_build_object(
    'ok', true,
    'email', row_out.email,
    'product', row_out.product,
    'promotions', row_out.promotions,
    'partner_updates', row_out.partner_updates,
    'unsubscribed_at', row_out.unsubscribed_at
  );
end;
$$;

revoke all on function public.email_prefs_get(text) from public;
revoke all on function public.email_prefs_set(text, boolean, boolean, boolean) from public;
grant execute on function public.email_prefs_get(text) to anon, authenticated;
grant execute on function public.email_prefs_set(text, boolean, boolean, boolean) to anon, authenticated;

comment on function public.email_prefs_get(text) is
  'Reads one email_preferences row by its unsubscribe token. The only anonymous read path into that table.';
comment on function public.email_prefs_set(text, boolean, boolean, boolean) is
  'Sets the three optional-mail flags for one address, by unsubscribe token. Transactional mail is out of scope by design.';
