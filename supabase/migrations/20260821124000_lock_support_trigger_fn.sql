/* ════════════════════════════════════════════════════════════════════
   CABANA · LOCK THE SUPPORT TRIGGER FUNCTION
   ────────────────────────────────────────────────────────────────────
   support_message_after_insert() is a trigger function. Postgres grants
   EXECUTE on new functions to PUBLIC by default, and PostgREST exposes
   anything executable as /rest/v1/rpc/<name> — so a function that only
   ever makes sense inside a trigger was reachable by an anonymous key.

   Calling it out of context would error rather than do damage (there is
   no NEW record to read), but "it fails noisily" is not an access
   control. It runs SECURITY DEFINER and writes to support_threads; the
   only caller that should ever reach it is the trigger.

   Same reasoning for the two functions whose grants are deliberate,
   restated here so the intent is on the record next to the exception:

     is_support_agent()   authenticated only. Answers one question about
                          the CALLER and cannot be asked about anyone
                          else, which is why letting the desk console
                          call it is fine.
     support_desk_stats() authenticated only, and returns
                          {"error":"forbidden"} to anybody not on the
                          roster before it reads a single row.
════════════════════════════════════════════════════════════════════ */

revoke all on function public.support_message_after_insert() from public, anon, authenticated;

/* The trigger executes as the table owner, so no grant is needed for it
   to keep working. Confirm with:
     select tgname from pg_trigger where tgrelid = 'public.support_messages'::regclass;
*/

comment on function public.support_message_after_insert() is
  'Trigger function for support_messages. Not callable over RPC by design: EXECUTE is revoked from every client role.';
