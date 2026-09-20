-- ════════════════════════════════════════════════════════════════════════════
-- CABANA MESSENGER v6 · THE GUARD (authoritative copy)
-- ────────────────────────────────────────────────────────────────────────────
-- The readable specification is cabana-chat-guard.js. This is the same
-- algorithm in Postgres, so it runs on every insert no matter which client
-- sent it. Both copies are pinned to tests/chat-guard.vectors.json
-- (tests/chat-guard.test.mjs for the browser copy, tests/chat-guard.sql here).
--
-- Production had NO server-side scrubbing at all before this migration:
-- schema-chat.sql described one, but it was never installed, so anything
-- posted straight to the REST API skipped every rule the browser enforced.
-- ════════════════════════════════════════════════════════════════════════════

create schema if not exists cabana_private;

-- Apply f(match) to every non-overlapping match of re, left to right — the
-- Postgres equivalent of JavaScript's String.replace(re, fn).
create or replace function cabana_private.guard_map(p_text text, p_re text, p_mode text)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare
  parts text[] := regexp_split_to_array(p_text, p_re);
  hits  text[] := array(select (regexp_matches(p_text, p_re, 'g'))[1]);
  out   text := parts[1];
  tok   text; rep text; bits text[]; y int; a int; b int; i int;
begin
  if coalesce(array_length(hits, 1), 0) = 0 then return p_text; end if;
  for i in 1 .. array_length(hits, 1) loop
    tok := hits[i]; rep := tok;
    if p_mode = 'leet' then
      if length(regexp_replace(tok, '\D', '', 'g')) >= 2 then
        rep := translate(tok, 'oli|!', '01111');
      end if;
    elsif p_mode = 'date' then
      rep := ' ◷ ';
      for bits in select regexp_matches(tok, '(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})', 'g') loop
        if length(bits[1]) = 4 then
          y := bits[1]::int; a := bits[2]::int; b := bits[3]::int;
          if not (y between 2024 and 2032 and a between 1 and 12 and b between 1 and 31) then rep := tok; end if;
        else
          y := bits[3]::int; if y < 100 then y := 2000 + y; end if;
          a := bits[1]::int; b := bits[2]::int;
          if not (y between 2024 and 2032 and ((a between 1 and 31 and b between 1 and 12) or (b between 1 and 31 and a between 1 and 12))) then rep := tok; end if;
        end if;
      end loop;
    elsif p_mode = 'time' then
      bits := regexp_match(tok, '^(\d{1,2}):(\d{2})');
      if bits is not null and bits[1]::int <= 23 and bits[2]::int <= 59 then rep := ' ◷ '; end if;
    elsif p_mode = 'price' then
      rep := ' ¤ ';
    end if;
    out := out || rep || coalesce(parts[i + 1], '');
  end loop;
  return out;
end $$;

create or replace function cabana_private.guard_normalise(p_text text)
returns text language sql immutable set search_path = pg_catalog as $$
  select lower(regexp_replace(normalize(coalesce(p_text, ''), NFKC),
    '[\u200B-\u200D\u2060\uFEFF\u00AD\uFE0F\u20E3]', '', 'g'))
$$;

create or replace function cabana_private.guard_view(p_norm text)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare
  v text := p_norm; prev text;
  date_re text := '(?:\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})|\d{4}-\d{2}-\d{2})';
  w text[] := array['zero','0','one','1','two','2','three','3','four','4','five','5','six','6','seven','7','eight','8','nine','9',
                    'sifuri','0','moja','1','mbili','2','tatu','3','nne','4','tano','5','sita','6','saba','7','nane','8','tisa','9'];
  i int;
begin
  for i in 1 .. array_length(w, 1) by 2 loop
    v := regexp_replace(v, '\y' || w[i] || '\y', w[i + 1], 'g');
  end loop;
  v := regexp_replace(v, '\ydouble\s*(\d)', '\1\1', 'g');
  v := regexp_replace(v, '\ytriple\s*(\d)', '\1\1\1', 'g');
  v := cabana_private.guard_map(v, '[0-9oli|!]{3,}', 'leet');
  v := cabana_private.guard_map(v,
    '(?<![\d.,/:-]|\d\s)' || date_re || '(?:\s*(?:-|–|to|until|till|hadi)\s*' || date_re || ')?(?![\s.,/:-]*\d)', 'date');
  v := cabana_private.guard_map(v, '(?<![\d.,/:-]|\d\s)\d{1,2}:\d{2}(?:\s?(?:am|pm|hrs|h))?(?![\s.,/:-]*\d)', 'time');
  v := cabana_private.guard_map(v,
    '(?<![\d.,/:-]|\d\s)(?:(?:kes|ksh|kshs|sh|shs|usd|\$|€|£)\.?\s?[1-9][\d,]{0,8}(?:\.\d{1,2})?k?|[1-9][\d,]{0,8}(?:\.\d{1,2})?\s?(?:k\y|kes\y|ksh\y|kshs\y|bob\y|/=|shillings\y|dollars\y|usd\y))(?![\s.,/:-]*\d)',
    'price');
  loop
    prev := v;
    v := regexp_replace(v, '(\d)\s*(?:then|and|na|kisha|halafu|next|plus|followed by|dash|space|comma|dot|&|\+)\s*(?=\d)', '\1', 'g');
    exit when v = prev;
  end loop;
  loop
    prev := v;
    v := regexp_replace(v, $re$(\d)[\s.\-_/\\|()*#:,~=']{1,3}(?=\d)$re$, '\1', 'g');
    exit when v = prev;
  end loop;
  return v;
end $$;

create or replace function cabana_private.guard_phone(p_view text)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare m text[]; run text; n int; plus boolean;
begin
  for m in select regexp_matches(p_view, '(\+?)(\d+)', 'g') loop
    run := m[2]; n := length(run); plus := m[1] = '+';
    if (plus and n between 9 and 15) or n >= 14
       or (left(run, 2) = '00' and n >= 10)
       or (left(run, 1) = '0' and n between 10 and 13)
       or (left(run, 1) = '2' and n between 11 and 13)
       or (n = 9 and left(run, 1) in ('1', '7')) then
      return run;
    end if;
  end loop;
  return null;
end $$;

-- { hard: [...], soft: [...], phone: text|null }
create or replace function cabana_private.chat_guard(p_text text, p_contact_allowed boolean default false)
returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
declare
  norm text := cabana_private.guard_normalise(p_text);
  phone text := cabana_private.guard_phone(cabana_private.guard_view(norm));
  hard text[] := '{}'; soft text[] := '{}';
  r text[];
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
    'social', '(?:^|[\s(])@[a-z0-9_.]{3,30}\y',
    'payment', '\y(?:till|paybill|pay\s*bill|buy\s*goods|lipa\s*na\s*m-?pesa|account\s*(?:no|number|#))\y[^a-z]{0,6}(?:no\.?|number|#|is|:)?[^a-z]{0,4}\d{4,}',
    'payment', '\y(?:till|paybill|pay\s*bill|buy\s*goods)\s*(?:no\.?|number|#)',
    'off_platform', '\y(?:pay|send|tuma)\s+(?:me\s+|the\s+|money\s+|pesa\s+)*(?:directly|direct|cash|outside|off\s+(?:the\s+)?(?:app|platform|cabana|site)|via\s+m-?pesa|through\s+m-?pesa|on\s+m-?pesa|to\s+my\s+m-?pesa|kwa\s+m-?pesa)\y',
    'off_platform', '\y(?:avoid|skip|save\s+on|without)\s+(?:the\s+)?(?:cabana\s+)?(?:fee|fees|commission|charges|service\s+fee)\y',
    'off_platform', '\y(?:book|deal|pay|transact|talk|chat|connect)\s+(?:with\s+me\s+)?(?:directly|outside|off\s*(?:line|the\s+app|the\s+platform))\y',
    'off_platform', '\y(?:outside|off)\s+(?:of\s+)?(?:the\s+)?(?:app|platform|cabana)\y',
    'off_platform', '\ycash\s+(?:on|at|upon)\s+(?:arrival|check-?in)\y',
    'off_platform', '\y(?:cheaper|less|discount)\s+(?:if\s+(?:you|we)\s+)?(?:pay\s+|book\s+|deal\s+)?(?:directly|outside|off\s+the\s+app|in\s+cash)\y'
  ];
  i int;
begin
  if phone is not null and not coalesce(p_contact_allowed, false) then hard := hard || 'phone'::text; end if;
  for i in 1 .. array_length(rules, 1) by 2 loop
    if norm ~ rules[i + 1] and not rules[i] = any(hard) then hard := hard || rules[i]; end if;
  end loop;
  if norm ~ '\y(?:call|text|sms|ring|dm|inbox|ping|beep|flash)\s+me\y|\y(?:my|your)\s+(?:number|digits|contacts?|phone\s+number)\y|\ynambari\s+(?:yangu|yako)\y|\ynamba\s+(?:yangu|yako)\y|\ynipigie\y|\ynipe\s+namba\y' then
    soft := soft || 'contact_request'::text;
  end if;
  return jsonb_build_object('hard', to_jsonb(hard), 'soft', to_jsonb(soft), 'phone', phone);
end $$;

create or replace function cabana_private.chat_guard_fragment(p_text text)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare norm text := cabana_private.guard_normalise(p_text); v text; d text;
begin
  v := cabana_private.guard_view(norm);
  d := regexp_replace(v, '\D', '', 'g');
  if d = '' or length(d) > 13 or length(norm) > 48 or length(regexp_replace(v, '[^a-z]', '', 'g')) > 18 then return ''; end if;
  return d;
end $$;

-- Would these fragments (oldest first) plus this message spell a dialable number?
create or replace function cabana_private.chat_guard_spans(p_previous text[], p_text text, p_contact_allowed boolean default false)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare joined text; d text; i int;
begin
  if coalesce(p_contact_allowed, false) then return false; end if;
  joined := cabana_private.chat_guard_fragment(p_text);
  if joined = '' then return false; end if;
  if p_previous is null then return false; end if;
  for i in reverse coalesce(array_length(p_previous, 1), 0) .. 1 loop
    exit when length(joined) >= 16;
    d := cabana_private.chat_guard_fragment(p_previous[i]);
    exit when d = '';
    joined := d || joined;
    if cabana_private.guard_phone(joined) is not null then return true; end if;
  end loop;
  return false;
end $$;

revoke all on function cabana_private.guard_map(text, text, text) from public, anon, authenticated;
revoke all on function cabana_private.guard_normalise(text) from public, anon, authenticated;
revoke all on function cabana_private.guard_view(text) from public, anon, authenticated;
revoke all on function cabana_private.guard_phone(text) from public, anon, authenticated;
revoke all on function cabana_private.chat_guard(text, boolean) from public, anon, authenticated;
revoke all on function cabana_private.chat_guard_fragment(text) from public, anon, authenticated;
revoke all on function cabana_private.chat_guard_spans(text[], text, boolean) from public, anon, authenticated;
