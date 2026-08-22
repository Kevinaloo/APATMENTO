/* ════════════════════════════════════════════════════════════════════
   CABANA · SUPPORT KNOWLEDGE BASE, SEED
   ────────────────────────────────────────────────────────────────────
   Every row here is checked against the code that enforces it, not
   against the marketing copy that describes it. Where the two disagreed,
   the enforcing code won:

     · The deposit is 25%.  api/lib/_payment-rules.js DEPOSIT_PCT = 0.25.
       APA had been saying 30% and the site had been saying 30% in two
       places. Nothing charged 30%.
     · Tours and events carry NO platform fee. api/lib/_fees.js and the
       Postgres trigger both stamp 0. terms.html had a table claiming
       KES 200/500 on tours and KES 50/150 on events. Nothing charged it.
     · Cancellation terms are set per listing by the host. There is no
       single platform-wide 24-hour rule, which is what APA used to say.

   Answers are written the way a person on the desk would say them:
   short, specific, and never promising a thing the platform does not do.
   Edit a row and APA changes what she says on the next request. There is
   no deploy in that loop and no second copy of the sentence anywhere.
════════════════════════════════════════════════════════════════════ */

insert into public.support_kb (slug, topic, audience, question, answer, keywords, route, priority) values

-- ── Money ────────────────────────────────────────────────────────────
('platform-fee', 'fees', 'all',
 'What does Cabana charge?',
 'Cabana charges a fixed platform fee per booking, never a percentage. Stays and rooms: KES 300 when the booking is under KES 5,000, KES 800 at KES 5,000 and above. Tours, events, car hire, rides, food, shopping and flights: no platform fee at all. The host or operator keeps 100% of the listing price. You see the exact fee on the checkout screen before you pay anything.',
 array['fee','fees','commission','charge','cost','platform fee','service fee','how much'],
 '/terms.html', 100),

('zero-commission', 'fees', 'all',
 'Is Cabana really zero commission?',
 'Yes. Hosts and operators keep 100% of the listing price. Cabana never takes a cut of what you earn or a percentage of what a guest pays. The only money Cabana collects is the fixed platform fee on stays and rooms, and that comes from the guest at checkout, on top of the listing price, not out of the host payout.',
 array['zero commission','commission','airbnb','booking.com','cut','percentage','host earnings'],
 '/what-is-cabana.html', 95),

('deposit', 'payments', 'guest',
 'How much do I have to pay upfront?',
 'A stay is confirmed once you have paid 25% of the total. You can pay it in as many M-Pesa instalments as you like. Below 25% your money is held as credit but the dates are NOT held, so someone else can still book them. At 25% the dates are locked to you. The check-in code is released when the booking is paid in full.',
 array['deposit','upfront','instalment','installment','part payment','25%','pay later','how much upfront'],
 '/my-bookings.html', 95),

('payment-methods', 'payments', 'all',
 'How do I pay?',
 'M-Pesa via PayHero is the main method. An STK push goes to your M-Pesa number and you approve it on your phone. Card (Visa and Mastercard), PayPal, MTN MoMo and Airtel Money are also supported on checkout depending on the service. Make sure the phone number on your Cabana profile is the one your M-Pesa is registered to, or the push will not reach you.',
 array['pay','payment','mpesa','m-pesa','stk','card','visa','paypal','momo','airtel','how to pay'],
 null, 90),

('payment-failed', 'payments', 'guest',
 'My payment did not go through.',
 'Three things cause almost all of these. One: the STK push went to a different number than the one you are holding — check the phone number on your profile. Two: insufficient M-Pesa balance, including the transaction cost. Three: the push timed out because it was not approved within about 60 seconds. Open the booking in My Bookings and tap Pay again; nothing is double-charged, and if money did leave your account it lands as Cabana credit on that booking within a few minutes.',
 array['payment failed','did not go through','stk','no prompt','money deducted','not confirmed','pending payment'],
 '/my-bookings.html', 92),

('refund', 'cancellations', 'guest',
 'Can I get a refund?',
 'The cancellation policy is set by the host on each listing and is shown on the listing page before you book — flexible, moderate, strict or non-refundable. Cancel from My Bookings and the refund due under that listing''s policy goes back to your M-Pesa in 3 to 7 business days. The platform fee itself is not refundable. If the HOST cancels a confirmed booking you get everything back, including the platform fee.',
 array['refund','cancel','cancellation','money back','change dates','host cancelled'],
 '/my-bookings.html', 94),

('payout', 'payments', 'host',
 'When do I get paid?',
 'The guest''s money is held until check-in, then released to your M-Pesa. That hold is what protects the guest from paying for a stay that does not exist, and it is why guests trust a new listing. You keep 100% of the listing price — the platform fee is charged to the guest separately and never comes out of your payout.',
 array['payout','get paid','when paid','earnings','host payment','settlement'],
 '/dashboard.html', 90),

-- ── Bookings ─────────────────────────────────────────────────────────
('checkin-code', 'bookings', 'guest',
 'Where is my check-in code?',
 'The check-in code appears on the booking in My Bookings once the stay is paid in full. If you are still on a deposit, pay the balance from that same screen and the code appears immediately.',
 array['check in code','checkin','access code','door code','entry','key'],
 '/my-bookings.html', 88),

('checkin-problem', 'bookings', 'guest',
 'I got to the place and I cannot stay here.',
 'Open the booking in My Bookings and tap "Can''t stay here". That starts the re-homing flow: Cabana finds you a comparable place, covers the transport to it, and handles the money with the original host. Do it from the app rather than calling around — the record of what happened is what gets you refunded.',
 array['cannot stay','cant stay','not as described','dirty','locked out','no one there','scam','re-home','rehome'],
 '/my-bookings.html', 99),

('find-booking', 'bookings', 'guest',
 'Where are my bookings?',
 'My Bookings holds everything you have booked — stays, tours, events, car hire — with its status, what is still owed, and the check-in code once a stay is fully paid. You need to be signed in with the same account you booked on.',
 array['my booking','my bookings','reservation','where is my booking','booking reference'],
 '/my-bookings.html', 80),

-- ── Contact ──────────────────────────────────────────────────────────
('contact-cabana', 'contact', 'all',
 'How do I contact Cabana?',
 'Right here. This chat is the fastest way — I answer immediately, and if you need a person I hand the conversation to the Cabana team without you starting over. You can also start a voice call with the team from the call button in this window, which runs over the internet inside Cabana. For anything written, connect@cabana.africa reaches support and partnership@cabana.africa reaches the partnerships team. Cabana does not run a public phone line or WhatsApp — everything stays inside the platform, which is what keeps the record of your booking attached to your conversation.',
 array['contact','phone','number','whatsapp','call','email','talk to someone','support','human','agent'],
 null, 100),

('contact-host', 'contact', 'guest',
 'How do I reach the host?',
 'Message them from the listing or from the booking in My Bookings — it opens a direct thread with that host inside Cabana. Keep it in the thread: if anything goes wrong later, the conversation is the evidence, and a host who moves you off-platform to take payment directly is the single clearest fraud signal there is.',
 array['contact host','message host','reach host','talk to host','host number','landlord'],
 '/my-bookings.html', 85),

('off-platform', 'safety', 'all',
 'The host wants me to pay them directly.',
 'Do not. Money paid outside Cabana has no protection at all: no hold until check-in, no re-homing if the place is not real, no refund path. Every legitimate host on Cabana is paid through the platform and keeps 100% either way, so there is no honest reason to ask. Report it to me and I will get it in front of the team.',
 array['pay directly','off platform','outside','deposit to mpesa','send money','scam','fraud','suspicious'],
 null, 98),

-- ── Hosting ──────────────────────────────────────────────────────────
('list-property', 'hosting', 'host',
 'How do I list my place?',
 'Add Listing walks you through it — photos, price, availability, house rules. It is free to list, there is no commission on what you earn, and you can import an existing listing from another platform by pasting its URL instead of typing it all again. Listings go live once the details check out.',
 array['list','listing','add listing','host','become host','rent out','my property','publish'],
 '/add-listing.html', 88),

('host-verification', 'hosting', 'host',
 'What do I need to list?',
 'A real account with a verified email, an M-Pesa number to be paid on, and the right to let the place you are listing. Photos and an honest description do the rest — the listings that book fastest are the ones where the photos match what the guest walks into.',
 array['verify','verification','id','requirements','documents','kyc'],
 '/add-listing.html', 75),

('partner-services', 'hosting', 'partner',
 'I run tours / car hire / a restaurant. Can I join?',
 'Yes, and there is no platform fee on any of those — tours, events, car hire, rides, food and shopping all list at zero. You keep the full fare. Start from Add Listing and pick your service type, or write to partnership@cabana.africa and the partnerships team will set it up with you.',
 array['tour operator','car hire','restaurant','partner','provider','operator','vendor','join','onboard'],
 '/add-listing.html', 85),

-- ── Account ──────────────────────────────────────────────────────────
('signin-trouble', 'account', 'all',
 'I cannot sign in.',
 'Cabana uses email and password, or Google. If the password is not working use the reset link on the sign-in page — it emails you from connect@cabana.africa, so check spam if it does not land within a minute. The older SMS code sign-in was retired, so an OTP will not arrive by text any more.',
 array['sign in','login','log in','password','reset','forgot','cannot access','otp','code'],
 '/auth.html', 85),

('rewards', 'rewards', 'guest',
 'How do rewards work?',
 'You earn points on bookings and can redeem them from the Rewards page. Referrals earn on top of that: share your link, and a booking made within 30 days of a click is attributed to you.',
 array['rewards','points','cashback','referral','refer','earn','invite'],
 '/rewards.html', 70),

('data-privacy', 'account', 'all',
 'What do you do with my data?',
 'What is needed to run a booking and nothing sold on to anyone. The full detail is in the privacy policy, and you can ask me to delete your account and data at any point — I will put that in front of the team as a real request, not a form.',
 array['privacy','data','gdpr','delete account','personal information','cookies'],
 '/privacy.html', 60)

on conflict (slug) do update set
  question   = excluded.question,
  answer     = excluded.answer,
  keywords   = excluded.keywords,
  route      = excluded.route,
  priority   = excluded.priority,
  audience   = excluded.audience,
  topic      = excluded.topic,
  active     = true,
  updated_at = now();

/* The stale contact rows in site_settings pointed at a phone line and an
   apatmento.com address that no longer answer. A support answer generated
   from a dead address is worse than no answer. */
update public.site_settings set value = 'connect@cabana.africa', updated_at = now()
  where key = 'contact_email';
delete from public.site_settings where key = 'contact_phone';
