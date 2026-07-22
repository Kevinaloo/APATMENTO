/* ════════════════════════════════════════════════════════════════════════════
   CABANA MESSENGER v5 — Chat Lifecycle + Contact Release Schema
   schema-chat-v2.sql
   Run in Supabase SQL Editor after schema-chat.sql
   ════════════════════════════════════════════════════════════════════════════

   NEW COLUMNS on chat_conversations:
     status          — open | locked | expired | closed
     locked_at       — when it was locked
     locked_reason   — '24h_no_booking' | 'stay_ended' | 'manual'
     booking_id      — linked booking (if any)
     contact_released — whether contact details were shared
     contact_released_at

   NEW COLUMNS on apartment_bookings (if not exists):
     exact_address   — revealed only after payment
     checkin_code    — door/gate code, revealed only at checkin

   AUTOMATION:
     fn_lock_expired_chats()     — cron: lock chats with no booking after 24h
     fn_lock_ended_stay_chats()  — cron: lock chats after stay checkout
     fn_release_contact_on_pay() — trigger: fires when booking status → paid_*
     fn_insert_chat_system_msgs()— helper: inserts system messages

   CRON (pg_cron — enable in Supabase Dashboard > Extensions):
     SELECT cron.schedule('lock-expired-chats',   '0 * * * *',  'SELECT public.fn_lock_expired_chats()');
     SELECT cron.schedule('lock-ended-stay-chats','0 1 * * *',  'SELECT public.fn_lock_ended_stay_chats()');
   ════════════════════════════════════════════════════════════════════════════ */

-- ── 1. Add lifecycle columns to chat_conversations ────────────────────────
alter table public.chat_conversations
  add column if not exists locked_at          timestamptz,
  add column if not exists locked_reason      text,       -- '24h_no_booking' | 'stay_ended' | 'manual'
  add column if not exists booking_id         uuid,       -- references apartment_bookings(id)
  add column if not exists contact_released   boolean     not null default false,
  add column if not exists contact_released_at timestamptz,
  add column if not exists checkin_notified   boolean     not null default false;

-- status column already exists as 'open', we re-use it:
-- open | locked | expired | closed

-- ── 2. Add contact/address columns to apartment_bookings ─────────────────
alter table public.apartment_bookings
  add column if not exists exact_address      text,       -- revealed post-payment
  add column if not exists checkin_code       text,       -- revealed at check-in only
  add column if not exists contact_released   boolean     not null default false,
  add column if not exists contact_released_at timestamptz;

-- ── 3. Add contact columns to profiles (if not present) ──────────────────
alter table public.profiles
  add column if not exists phone              text,
  add column if not exists display_name       text,
  add column if not exists phone_verified     boolean not null default false;

-- ── 4. Add exact_address to listings (hidden until booking paid) ──────────
alter table public.listings
  add column if not exists exact_address text,
  add column if not exists access_notes  text;  -- revealed at checkin

-- ── 5. SYSTEM MESSAGE HELPER ─────────────────────────────────────────────
create or replace function public.fn_insert_system_msg(
  p_conv_id uuid,
  p_content  text
) returns void language plpgsql security definer as $$
begin
  insert into public.chat_messages
    (conversation_id, sender_id, content, is_system)
  select p_conv_id, guest_id, p_content, true
  from   public.chat_conversations
  where  id = p_conv_id;
end;
$$;

-- ── 6. CONTACT RELEASE ON PAYMENT ────────────────────────────────────────
-- Fires when apartment_bookings.status changes to paid_pending_checkin or checked_in
create or replace function public.fn_release_contact_on_pay()
returns trigger language plpgsql security definer as $$
declare
  v_conv       public.chat_conversations%rowtype;
  v_host       public.profiles%rowtype;
  v_guest      public.profiles%rowtype;
  v_listing    record;
  v_msg_guest  text;
  v_msg_host   text;
  v_addr       text;
begin
  -- Only fire on transition TO paid status
  if new.status not in ('paid_pending_checkin','deposit_paid') then return new; end if;
  if old.status = new.status then return new; end if;
  if coalesce(new.contact_released, false) = true then return new; end if;

  -- Find the chat conversation for this booking
  select * into v_conv
  from   public.chat_conversations
  where  (listing_id = new.apartment_id::text or booking_id = new.id)
    and  guest_id   = new.user_id
  limit 1;

  if not found then return new; end if;
  if coalesce(v_conv.contact_released, false) = true then return new; end if;

  -- Load profiles
  select * into v_host  from public.profiles where id = new.host_id;
  select * into v_guest from public.profiles where id = new.user_id;

  -- Load listing address
  select coalesce(exact_address, location, title) as addr,
         title, location
  into   v_listing
  from   public.listings
  where  id = new.apartment_id
  limit 1;

  v_addr := coalesce(new.exact_address, v_listing.addr, 'See details in your booking confirmation');

  -- ── Message to GUEST ────────────────────────────────────────────────────
  v_msg_guest :=
    '✅ Booking confirmed! Your host's contact details have been released.'
    || E'\n\n'
    || '📍 Property address: ' || v_addr
    || E'\n'
    || '📞 Host contact: ' || coalesce(v_host.phone, v_host.email, 'Available in your booking')
    || E'\n\n'
    || '🔑 Check-in code: This will be shared by your host upon your arrival. '
    || 'Do not share the code over this chat — exchange it in person at check-in.';

  -- ── Message to HOST ─────────────────────────────────────────────────────
  v_msg_host :=
    '✅ Payment received for your listing. Your guest's contact details have been released.'
    || E'\n\n'
    || '📞 Guest contact: ' || coalesce(v_guest.phone, v_guest.email, 'Visible in your Partner Dashboard')
    || E'\n\n'
    || '🔑 Check-in code: Share this with your guest ONLY upon their arrival in person. '
    || 'Do not send the door or gate code over this chat — exchange it face-to-face at check-in.'
    || E'\n\n'
    || '📅 Check-in: ' || coalesce(new.checkin_date::text, 'See booking')
    || ' | Check-out: ' || coalesce(new.checkout_date::text, 'See booking');

  -- Insert both system messages
  perform public.fn_insert_system_msg(v_conv.id, v_msg_guest);

  -- Second message from host perspective (also inserted as system msg for full thread)
  insert into public.chat_messages
    (conversation_id, sender_id, content, is_system)
  values
    (v_conv.id, new.host_id, v_msg_host, true);

  -- Mark conversation as linked and contact released
  update public.chat_conversations
  set    booking_id          = new.id,
         contact_released    = true,
         contact_released_at = now(),
         status              = 'open'
  where  id = v_conv.id;

  -- Mark booking as contact released
  update public.apartment_bookings
  set    contact_released    = true,
         contact_released_at = now()
  where  id = new.id;

  -- Insert notification for guest
  insert into public.notifications (user_id, title, body, url, kind)
  values (
    new.user_id,
    '✅ Booking Confirmed — Host Contact Released',
    'Your host contact and property address are now available in your chat.',
    '/dashboard.html',
    'payment'
  );

  -- Insert notification for host
  insert into public.notifications (user_id, title, body, url, kind)
  values (
    new.host_id,
    '💰 Payment Received — Guest Contact Released',
    'Your guest contact details are now visible. Check your messenger.',
    '/dashboard.html?role=partner',
    'payment'
  );

  return new;
end;
$$;

drop trigger if exists trg_release_contact on public.apartment_bookings;
create trigger trg_release_contact
  after update of status on public.apartment_bookings
  for each row execute function public.fn_release_contact_on_pay();

-- ── 7. LOCK CHATS WITH NO BOOKING AFTER 24 HOURS ─────────────────────────
create or replace function public.fn_lock_expired_chats()
returns void language plpgsql security definer as $$
declare
  r record;
begin
  for r in
    select c.id, c.guest_id, c.host_id, c.listing_title
    from   public.chat_conversations c
    where  c.status = 'open'
      and  c.contact_released = false
      and  c.booking_id is null
      and  c.created_at < now() - interval '24 hours'
      and  coalesce(c.locked_at, 'epoch'::timestamptz) = 'epoch'::timestamptz
  loop
    -- Insert lock system message
    perform public.fn_insert_system_msg(r.id,
      '🔒 This conversation has been automatically closed. '
      || 'No booking was made within 24 hours of the first message. '
      || 'To restart, please enquire about the listing again.');

    update public.chat_conversations
    set    status        = 'locked',
           locked_at     = now(),
           locked_reason = '24h_no_booking'
    where  id = r.id;

    -- Notify guest
    insert into public.notifications (user_id, title, body, url, kind)
    values (
      r.guest_id,
      '🔒 Chat Closed — ' || coalesce(r.listing_title, 'Listing'),
      'No booking was made within 24 hours. Chat has been locked.',
      '/apartments.html',
      'general'
    );
  end loop;
end;
$$;

-- ── 8. LOCK CHATS AFTER STAY ENDS ────────────────────────────────────────
create or replace function public.fn_lock_ended_stay_chats()
returns void language plpgsql security definer as $$
declare
  r record;
begin
  for r in
    select c.id, c.guest_id, c.host_id, c.listing_title, b.checkout_date
    from   public.chat_conversations c
    join   public.apartment_bookings b on b.id = c.booking_id
    where  c.status in ('open','locked')
      and  b.status in ('paid_pending_checkin','checked_in','deposit_paid')
      and  b.checkout_date::date < current_date
      and  c.locked_reason is distinct from 'stay_ended'
  loop
    -- Insert checkout system message
    perform public.fn_insert_system_msg(r.id,
      '🏁 Your stay has ended. This conversation has been automatically closed. '
      || 'Thank you for using Cabana! '
      || 'You can leave a review from your bookings page.');

    update public.chat_conversations
    set    status        = 'locked',
           locked_at     = now(),
           locked_reason = 'stay_ended'
    where  id = r.id;

    -- Notify both parties
    insert into public.notifications (user_id, title, body, url, kind)
    values
      (r.guest_id, '🏁 Stay Complete — Chat Closed', 'Your stay has ended. Leave a review!', '/my-bookings.html', 'booking'),
      (r.host_id,  '🏁 Guest Checked Out', 'Your guest''s stay is complete. Chat has been closed.', '/dashboard.html?role=partner', 'booking');
  end loop;
end;
$$;

-- ── 9. CRON SCHEDULES (pg_cron) ──────────────────────────────────────────
-- Enable pg_cron in Supabase Dashboard > Database > Extensions first, then run:
-- select cron.schedule('cbm-lock-expired',   '0 * * * *', 'select public.fn_lock_expired_chats()');
-- select cron.schedule('cbm-lock-ended',     '0 1 * * *', 'select public.fn_lock_ended_stay_chats()');

-- ── 10. RLS: allow service role to insert notifications ───────────────────
drop policy if exists "service_insert_notif" on public.notifications;
create policy "service_insert_notif" on public.notifications
  for insert with check (true);

drop policy if exists "own_read_notif" on public.notifications;
create policy "own_read_notif" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "own_update_notif" on public.notifications;
create policy "own_update_notif" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
