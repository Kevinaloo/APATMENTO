-- One-time sweep with the new guard over messages already in production.
-- On 20 Sep 2026 it matched exactly three messages (a phone number written
-- as "07then 16then 206then 494", "0716 then206494" and a variant ending in
-- "final") and none of the fifteen ordinary ones. The original text is kept
-- in content_raw for the Trust team; the conversation now shows it withheld.
update public.chat_messages m
   set content_raw = coalesce(m.content_raw, m.content),
       content = 'Message withheld. It looked like it contained contact or payment details, which can only be shared once a booking is paid on Cabana.',
       kind = 'withheld', was_scrubbed = true,
       flags = array(select jsonb_array_elements_text(cabana_private.chat_guard(m.content, false)->'hard'))
  from public.chat_conversations c
 where c.id = m.conversation_id and m.kind = 'text' and not m.is_system
   and jsonb_array_length(cabana_private.chat_guard(m.content, cabana_private.chat_contact_allowed(c.host_id, c.guest_id))->'hard') > 0;
update public.chat_conversations c set last_message = 'Message withheld'
 where exists (select 1 from public.chat_messages m where m.conversation_id = c.id and m.kind = 'withheld'
                 and m.created_at = c.last_message_at);
