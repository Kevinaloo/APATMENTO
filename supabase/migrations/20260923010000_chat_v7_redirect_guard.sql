-- ════════════════════════════════════════════════════════════════════════════
-- CABANA MESSENGER v7 · THE REDIRECT GUARD
-- ────────────────────────────────────────────────────────────────────────────
-- v6 matched identifiers: phone, email, link, handle, till. A host then sent
-- these two lines, and every rule passed them clean:
--
--     "come to obama office"        "Ask for jets nest"
--
-- Neither contains an identifier. Together they are a complete booking
-- instruction: the estate to walk to, and the name to say at the door. The
-- guest can arrive, pay cash, and Cabana protects nobody.
--
-- A redirect is not an identifier, it is an INSTRUCTION. So this layer reads
-- mood rather than shape:
--
--     a directive to come        +  a place, or a word naming this stay
--     an instruction to ask for  +  a word naming this stay
--
-- Both halves are required, and that is what keeps it quiet. "Is parking
-- available at the gate?" has the place and no directive. "How far is it from
-- the mall?" has neither. Both stay clean, and they must: a guard that eats
-- ordinary questions is worse than no guard, because hosts stop using chat and
-- go somewhere we cannot see at all.
--
-- The naming words come from the conversation itself — this listing's title,
-- its area, the host's name — so "ask for jets nest" is a bypass in the Jets
-- Nest conversation and an ordinary sentence anywhere else. Generic words
-- ("apartment", "estate") never become anchors.
--
-- Two findings from auditing every public text column in production:
--   · @JKIA is how this market writes "at the airport". v6 read it as a social
--     handle and would have withheld five of the eight live listing titles. A
--     bare @word is now soft; @with_digits, or one next to "follow", stays hard.
--   · "find me" is not a redirect. The first draft of the rival rule withheld
--     "can you find me a taxi from the airport?" — the most ordinary sentence a
--     guest writes. Being found now needs somewhere to be found.
--
-- Pinned to tests/chat-guard.vectors.json alongside the browser copy. The
-- parity query from scripts/chat-guard-sql.mjs runs the browser copy, embeds
-- what it decided, and asks Postgres whether it agrees — 90 vectors, no
-- disagreements. That is the only bug that really matters here: a person
-- warned about one thing and blocked for another stops trusting both.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Anchors ─────────────────────────────────────────────────────────────────
-- The words that identify THIS stay. An anchor has to be worth saying out loud
-- at a gate, so short and generic words are dropped.
--   "The Jets Nest" → {jets, nest}      "Obama estate" → {obama}
create or replace function cabana_private.guard_anchor_tokens(p_parts text[])
returns text[] language sql immutable set search_path = pg_catalog as $$
  select coalesce(array_agg(distinct w), '{}')
  from (
    select regexp_split_to_table(
             lower(regexp_replace(coalesce(array_to_string(p_parts, ' '), ''), '[^a-zA-Z0-9]+', ' ', 'g')),
             '\s+') w
  ) t
  where length(w) >= 4
    and w !~ '^\d+$'
    and w not in (
      'the','and','for','with','near','from','into','your','yours','this','that','they','them',
      'room','rooms','beds','bedroom','bedrooms','bath','baths','bathroom','studio','suite','suites',
      'apartment','apartments','house','houses','home','homes','villa','villas','flat','flats',
      'place','places','stay','stays','cabana','guest','guests','host','hosts','property','properties',
      'luxury','modern','cosy','cozy','spacious','furnished','serviced','executive','deluxe','private',
      'estate','estates','court','courts','gardens','heights','towers','plaza','centre','center',
      'view','views','beach','city','town','road','street','avenue','drive','lane','close','park'
    );
$$;

-- ── The guard ───────────────────────────────────────────────────────────────
-- Dropped rather than overloaded: a two-argument call must never be able to
-- reach an older copy that cannot see anchors.
drop function if exists cabana_private.chat_guard(text, boolean);

create or replace function cabana_private.chat_guard(
  p_text text,
  p_contact_allowed boolean default false,
  p_anchors text[] default '{}'
) returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
declare
  norm text := cabana_private.guard_normalise(p_text);
  phone text := cabana_private.guard_phone(cabana_private.guard_view(norm));
  hard text[] := '{}'; soft text[] := '{}';
  handle text[]; anchor_hit boolean := false;
  visit boolean; askfor boolean; place boolean; self_question boolean;
  rules text[] := array[
    'email', '[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}',
    'email', '[a-z0-9._%+-]{2,}\s*(?:\(at\)|\[at\]|\{at\}|<at>|\sat\s)\s*[a-z0-9-]{2,}\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*(?:com|net|org|co|ke|io|me|info|biz|africa|uk|us|ng|tz|ug|rw|za)\y',
    'email', '\y(?:gmail|g-mail|yahoo|ymail|hotmail|outlook|icloud|protonmail)\y',
    'link', '\yhttps?://(?!(?:www\.)?(?:cabana\.africa|apatmento\.))\S+',
    'link', '\ywww\.(?!cabana\.africa)\S+',
    'link', '\y(?:wa\.me|t\.me|bit\.ly|linktr\.ee|tinyurl\.com|goo\.gl|maps\.app\.goo\.gl|wa\.link)\y',
    'link', '\y(?!cabana\.africa\y)[a-z0-9-]{2,}\.(?:com|net|org|io|co\.ke|me|app|ly|link|info|biz|site|online|shop|store|page|xyz)\y',
    'social', $re$\y(?:whats?\s*app?|what'?s\s*app|wh?att?s+\s*app?|wass?app?|wasap|watsap+|wtsp|w/app|whatsap+|watsapp|wapp)\y$re$,
    'social', '\y(?:telegram|tele\s+gram|instagram|insta|facebook|snapchat|tiktok|tik\s+tok|viber|wechat|imo\s+app|signal\s+app|linkedin|twitter|discord|skype|messenger)\y',
    'social', '\y(?:ig|fb|snap|tg|x)\s*[:@]\s*[a-z0-9_.]{3,}',
    'payment', '\y(?:till|paybill|pay\s*bill|buy\s*goods|lipa\s*na\s*m-?pesa|account\s*(?:no|number|#))\y[^a-z]{0,6}(?:no\.?|number|#|is|:)?[^a-z]{0,4}\d{4,}',
    'payment', '\y(?:till|paybill|pay\s*bill|buy\s*goods)\s*(?:no\.?|number|#)',
    'off_platform', '\y(?:pay|send|tuma)\s+(?:me\s+|the\s+|money\s+|pesa\s+)*(?:directly|direct|cash|outside|off\s+(?:the\s+)?(?:app|platform|cabana|site)|via\s+m-?pesa|through\s+m-?pesa|on\s+m-?pesa|to\s+my\s+m-?pesa|kwa\s+m-?pesa)\y',
    'off_platform', '\y(?:avoid|skip|save\s+on|without)\s+(?:the\s+)?(?:cabana\s+)?(?:fee|fees|commission|charges|service\s+fee)\y',
    'off_platform', '\y(?:book|deal|pay|transact|talk|chat|connect)\s+(?:with\s+me\s+)?(?:directly|outside|off\s*(?:line|the\s+app|the\s+platform))\y',
    'off_platform', '\y(?:outside|off)\s+(?:of\s+)?(?:the\s+)?(?:app|platform|cabana)\y',
    'off_platform', '\ycash\s+(?:on|at|upon)\s+(?:arrival|check-?in)\y',
    'off_platform', '\y(?:cheaper|less|discount)\s+(?:if\s+(?:you|we)\s+)?(?:pay\s+|book\s+|deal\s+)?(?:directly|outside|off\s+the\s+app|in\s+cash)\y',
    -- Sending the other person somewhere else to transact.
    'rival', '\y(?:book|pay|find|list|listed|cheaper|same|also|available|check)\y[^.!?]{0,40}\y(?:airbnb|air\s?bnb|booking\.?com|agoda|vrbo|expedia|tripadvisor)\y',
    'rival', '\y(?:airbnb|air\s?bnb|booking\.?com|agoda|vrbo|expedia|tripadvisor)\y[^.!?]{0,40}\y(?:cheaper|instead|directly|book|pay|there)\y',
    'rival', '\ygoogle\s+(?:for\s+)?(?:us|me|my|our)\y',
    'rival', '\y(?:search|find|look)\s+(?:for\s+)?(?:us|me|my|our)\s+(?:up\s+)?(?:on|online|at)\y'
  ];
  i int;
begin
  if phone is not null and not coalesce(p_contact_allowed, false) then hard := hard || 'phone'::text; end if;
  for i in 1 .. array_length(rules, 1) by 2 loop
    if norm ~ rules[i + 1] and not rules[i] = any(hard) then hard := hard || rules[i]; end if;
  end loop;

  -- A bare @word is a handle when it carries handle punctuation, when a
  -- platform is named, or when someone is told to follow it. Otherwise it is
  -- an address: "Shikaz Homes 2 Bedroom @JKIA Syokimau".
  handle := regexp_match(norm, '(?:^|[\s(])@([a-z0-9_.]{3,30})\y');
  if handle is not null then
    if handle[1] ~ '[0-9_.]' or 'social' = any(hard)
       or norm ~ '\y(?:follow|dm|add\s+me|my\s+handle|handle\s+is|username|profile|account\s+is|subscribe)\y' then
      if not 'social' = any(hard) then hard := hard || 'social'::text; end if;
    else
      soft := soft || 'handle'::text;
    end if;
  end if;

  -- ── Redirect: a directive, plus something to walk up to ───────────────────
  if not coalesce(p_contact_allowed, false) then
    visit := norm ~ '\y(?:come|head|drive)\s+(?:on\s+)?(?:over\s+|down\s+|round\s+|straight\s+)?(?:to|by|through)\y'
          or norm ~ '\y(?:pass|swing|drop|stop)\s+(?:by|in|through|around)\y'
          or norm ~ '\ywalk[\s-]*in\y' or norm ~ '\yshow\s+up\y'
          or norm ~ '\y(?:visit|find|meet|see)\s+(?:me|us)\y'
          or norm ~ '\ycome\s+(?:see|view|collect|pick|and\s+see)\y'
          or norm ~ '\y(?:njoo|kuja|fika|pitia|tukutane|nipate)\y';

    askfor := norm ~ '\yask\s+(?:for|of)\y' or norm ~ '\ytell\s+(?:them|him|her|the)\y'
           or norm ~ $re$\ysay\s+(?:you'?re|you\s+are|that\s+you)\y$re$
           or norm ~ '\y(?:uliza|ulizia|mwambie|niulize)\y';

    place := norm ~ '\y(?:office|gate|reception|premises|compound|caretaker|watchman|askari|mlinzi|lango|ofisi|entrance|lobby|front\s+desk|junction|stage|opposite|behind|next\s+to|hapa|hapo|kwetu|kwangu|nyumbani|apartment|flat|unit)\y';

    if cardinality(p_anchors) > 0 then
      anchor_hit := exists (select 1 from unnest(p_anchors) a where a <> '' and norm ~ ('\y' || a || '\y'));
    end if;

    -- Asking about one's own visit is a question, not an instruction.
    self_question := norm ~ '\y(?:can|could|may|might)\s+(?:i|we)\y'
                  or norm ~ '\y(?:is|would)\s+it\s+(?:ok|okay|fine|possible)\y' or norm ~ '\ynaweza\y';

    if (visit and (place or anchor_hit)) or (askfor and anchor_hit) then
      if self_question then soft := soft || 'meetup'::text; else hard := hard || 'meetup'::text; end if;
    elsif askfor and place then
      -- "ask for the caretaker" without naming this stay: worth recording,
      -- never worth withholding. "Ask for extra towels at reception" lives here.
      soft := soft || 'meetup'::text;
    end if;
  end if;

  if norm ~ '\y(?:call|text|sms|ring|dm|inbox|ping|beep|flash)\s+me\y|\y(?:my|your)\s+(?:number|digits|contacts?|phone\s+number)\y|\ynambari\s+(?:yangu|yako)\y|\ynamba\s+(?:yangu|yako)\y|\ynipigie\y|\ynipe\s+namba\y' then
    soft := soft || 'contact_request'::text;
  end if;
  return jsonb_build_object('hard', to_jsonb(hard), 'soft', to_jsonb(soft), 'phone', phone);
end $$;

-- ── The trigger worker ──────────────────────────────────────────────────────
-- Reads the anchors per message from the listing and the host, and names the
-- honest alternative in every block. A host told only "no" tries again
-- somewhere we cannot see; a host shown "send a private offer instead" closes
-- the deal on Cabana. The notice carries which, and the UI renders it.
create or replace function cabana_private.chat_guard_row(m public.chat_messages)
returns public.chat_messages language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations%rowtype;
  l public.listings%rowtype;
  allowed boolean; g jsonb; hard text[]; prev text[]; prev_ids uuid[]; spans boolean := false;
  anchors text[] := '{}';
  strikes int; is_host boolean; redirect boolean; withheld text; cta text;
begin
  if m.sender_id is distinct from auth.uid() then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;

  m.kind := 'text'; m.payload := null; m.visible_to := null; m.is_system := false;
  m.content_raw := null; m.was_scrubbed := false; m.flags := '{}';
  m.read_at := null; m.created_at := clock_timestamp();
  m.content := btrim(regexp_replace(coalesce(m.content, ''), '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'));
  if length(m.content) = 0 then raise exception 'Write a message first.' using errcode = '22023'; end if;
  if length(m.content) > 2000 then raise exception 'Messages can be up to 2,000 characters.' using errcode = '22023'; end if;

  select * into c from public.chat_conversations where id = m.conversation_id;
  if not found or m.sender_id not in (c.host_id, c.guest_id) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  if c.blocked_by is not null or c.status = 'blocked' then
    raise exception 'This conversation is closed.' using errcode = '42501';
  end if;

  if (select count(*) from public.chat_messages
       where sender_id = m.sender_id and created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.chat_messages
       where sender_id = m.sender_id and created_at > now() - interval '1 day') >= 500 then
    raise exception 'You are sending messages very quickly. Please wait a moment and try again.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if (select count(*) from public.chat_violations
       where user_id = m.sender_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Messaging is paused for a few hours after repeated attempts to share contact details. Our Trust team has been notified.'
      using errcode = 'P0001', hint = 'cooldown';
  end if;

  select * into l from public.listings where id = c.listing_id;
  anchors := cabana_private.guard_anchor_tokens(array[
    coalesce(l.title, c.listing_title), l.area, l.street, l.location,
    (select concat_ws(' ', first_name, last_name) from public.profiles where id = c.host_id)
  ]);

  allowed := cabana_private.chat_contact_allowed(c.host_id, c.guest_id);
  g := cabana_private.chat_guard(m.content, allowed, anchors);
  hard := array(select jsonb_array_elements_text(g->'hard'));

  select array_agg(content order by created_at), array_agg(id order by created_at)
    into prev, prev_ids
    from (select content, id, created_at from public.chat_messages
           where conversation_id = c.id and sender_id = m.sender_id and kind = 'text'
             and created_at > now() - interval '30 minutes'
           order by created_at desc limit 6) recent;
  if cardinality(hard) = 0 then
    spans := cabana_private.chat_guard_spans(prev, m.content, allowed);
    if spans then hard := array['phone']; end if;
  end if;

  if cardinality(hard) > 0 then
    is_host   := m.sender_id = c.host_id;
    redirect  := 'meetup' = any(hard) or 'rival' = any(hard);
    withheld  := case when redirect
      then 'Message withheld. It looked like it was arranging a stay outside Cabana, which leaves neither of you covered.'
      else 'Message withheld. It looked like it contained contact or payment details, which can only be shared once a booking is paid on Cabana.' end;

    m.content_raw := m.content;
    m.content := withheld;
    m.kind := 'withheld';
    m.was_scrubbed := true;
    m.flags := hard;
    if spans then
      -- The earlier fragments were only harmless until this one arrived.
      update public.chat_messages
         set content_raw = coalesce(content_raw, content), content = withheld, kind = 'withheld',
             was_scrubbed = true, flags = array['phone']
       where id = any(prev_ids) and cabana_private.chat_guard_fragment(content) <> '';
    end if;
    insert into public.chat_violations (user_id, conversation_id, message_id, categories, excerpt)
    values (m.sender_id, c.id, m.id, hard, left(m.content_raw, 500));

    select count(*) into strikes from public.chat_violations
     where user_id = m.sender_id and created_at > now() - interval '30 days';

    cta := case when strikes >= 3 then null when is_host then 'offer' else 'book' end;

    insert into public.chat_messages (conversation_id, sender_id, content, kind, visible_to, is_system, created_at, payload)
    values (c.id, m.sender_id,
      case when strikes >= 3
        then 'Your messages keep trying to move this stay off Cabana, so this conversation has been sent to our Trust team for review. Everything you need can be arranged here, and once a booking is paid you can share a phone number for arrival.'
        when redirect and is_host
        then 'We withheld that message: asking a guest to come in person or book elsewhere before a booking is paid isn''t allowed, and it leaves your payout unprotected if they never turn up. If price is the sticking point, send this guest a private offer instead — you set it, and only they can see it.'
        when redirect
        then 'We withheld that message: arranging to meet or book outside Cabana isn''t allowed. Paying outside Cabana isn''t covered if the stay goes wrong. Book here and your money is held until you check in.'
        else 'We withheld that message: ' || coalesce((select string_agg(r, ' ') from (select
            case x when 'phone' then 'phone numbers' when 'email' then 'email addresses' when 'link' then 'outside links'
                   when 'social' then 'social handles and messaging apps' when 'payment' then 'payment details'
                   when 'rival' then 'pointing somewhere else to book'
                   when 'meetup' then 'arranging to meet in person'
                   else 'arranging payment outside Cabana' end r from unnest(hard) x limit 1) s), 'contact details')
          || ' can''t be shared before a booking is paid. It keeps both of you protected: payments made outside Cabana aren''t covered.' end,
      'notice', m.sender_id, true, clock_timestamp() + interval '1 millisecond',
      jsonb_build_object('tone', case when strikes >= 3 then 'serious' else 'info' end,
                         'categories', to_jsonb(hard),
                         'action', cta));

    if strikes >= 3 then
      update public.chat_conversations
         set flagged_at = coalesce(flagged_at, now()), flag_reason = 'repeated_contact_attempts'
       where id = c.id;
      if strikes = 3 then
        insert into public.ops_alerts (kind, severity, title, body, meta)
        values ('chat_contact_attempts', 'warning',
          'Repeated off-platform attempts in chat',
          cabana_private.member_name(m.sender_id) || ' has had ' || strikes || ' messages withheld in 30 days.',
          jsonb_build_object('user_id', m.sender_id, 'conversation_id', c.id, 'categories', to_jsonb(hard)));
      end if;
    end if;
  else
    m.flags := array(select jsonb_array_elements_text(g->'soft'));
  end if;
  return m;
end $$;

revoke all on function cabana_private.chat_guard(text, boolean, text[]) from public, anon, authenticated;
revoke all on function cabana_private.guard_anchor_tokens(text[]) from public, anon, authenticated;
revoke all on function cabana_private.chat_guard_row(public.chat_messages) from public, anon;
grant execute on function cabana_private.chat_guard_row(public.chat_messages) to authenticated;

-- ── The two lines that started this ─────────────────────────────────────────
-- Delivered before the layer existed. The originals stay in content_raw for
-- the Trust desk; the guest now sees what they would have seen at the time.
-- Ran against every delivered message in production: it caught these two and
-- nothing else.
with scan as (
  select m.id, jsonb_array_length(g->'hard') > 0 as blocked,
         array(select jsonb_array_elements_text(g->'hard')) as cats
  from public.chat_messages m
  join public.chat_conversations c on c.id = m.conversation_id
  left join public.listings l on l.id = c.listing_id
  cross join lateral (
    select cabana_private.chat_guard(
      m.content, false,
      cabana_private.guard_anchor_tokens(array[
        coalesce(l.title, c.listing_title), l.area, l.street, l.location,
        (select concat_ws(' ', first_name, last_name) from public.profiles where id = c.host_id)])
    ) g
  ) x
  where m.kind = 'text'
)
update public.chat_messages m
   set content_raw  = coalesce(m.content_raw, m.content),
       content      = 'Message withheld. It looked like it was arranging a stay outside Cabana, which leaves neither of you covered.',
       kind         = 'withheld',
       was_scrubbed = true,
       flags        = s.cats
  from scan s
 where s.id = m.id and s.blocked;
