/* ══════════════════════════════════════════════════════════════════════
   CABANA · APA AGENT
   api/lib/_apa-agent.js

   The half of APA that does things rather than says things.

   WHAT THIS IS FOR
   ────────────────
   A guest should be able to say "book me the Kilimani two-bed for the
   weekend, two of us" and end at an M-Pesa prompt without touching a
   form. A host should be able to say "list my place in Nyali" and be
   walked through it, being asked for photos and a pin when those are
   the only things a conversation cannot supply.

   That is a long way from answering questions, and it is where an
   assistant becomes dangerous. So the rules below are not stylistic.

   THE MODEL NEVER DECIDES ANYTHING THAT COSTS MONEY
   ─────────────────────────────────────────────────
   APA proposes; this module disposes. She may say which listing and
   which dates. She may not say what it costs, whether it is available,
   or what gets charged. Every price is recomputed here from the listing
   row and the fee schedule at the moment of writing, and the payment
   endpoint validates the amount a third time against its own reading of
   the booking. There is no path by which a persuasive sentence becomes
   a discount: the number is never taken from the conversation.

   NOTHING IRREVERSIBLE HAPPENS WITHOUT AN EXPLICIT YES
   ────────────────────────────────────────────────────
   Creating a booking and publishing a listing are gated on a
   confirmation that this module recorded itself, against a quoted total
   this module computed. "Sounds good" earlier in the chat is not it.
   The quote carries a hash of what was quoted, so a slot that changed
   after the guest agreed invalidates the agreement rather than silently
   repricing it.

   A CALLER ONLY EVER TOUCHES THEIR OWN ROWS
   ─────────────────────────────────────────
   Every read and every write is scoped by the resolved caller's id at
   the query level, never by an id the model produced. A tool argument
   naming someone else's booking does not fail a permission check — it
   simply finds nothing, because it was never in the query.

   ANONYMOUS CALLERS CANNOT TRANSACT
   ─────────────────────────────────
   Assembling a booking without signing in is allowed and useful: the
   draft survives the sign-in and is adopted. Creating one is not.
   Money and listings require an account, always.
   ══════════════════════════════════════════════════════════════════════ */

import { select, one, insert, update as dbUpdate, rpc } from './_db.js';
import { serviceFee } from './_fees.js';
import { DEPOSIT_PCT, depositRequired, MIN_TXN } from './_payment-rules.js';
import { money } from './_brand.js';

const clamp = (s, n) => String(s == null ? '' : s).slice(0, n);
const nowIso = () => new Date().toISOString();

/* A task older than this is stale enough that resuming it silently
   would be surprising rather than helpful. APA still offers it, but as
   a question, not an assumption. */
const RESUME_FRESH_MS = 1000 * 60 * 60 * 24 * 14;   // 14 days

/* ══════════════════════════════════════════════════════════════════════
   VALIDATION
   Every value that reaches a row passes through here first. The model
   is a text generator: it will happily produce "tomorrow", "3-ish", or
   a 40,000-character description, and none of those are a database row.
══════════════════════════════════════════════════════════════════════ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(v) {
  const s = clamp(v, 24).trim();
  if (!ISO_DATE.test(s)) return null;
  const d = new Date(s + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  /* A date that round-trips differently was not a real calendar date —
     2025-02-31 parses, then silently becomes March. */
  if (d.toISOString().slice(0, 10) !== s) return null;
  return s;
}

function parseInt_(v, { min, max }) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/* Kenyan mobile, normalised to the form PayHero expects. Rejecting here
   rather than at the payment step means the guest is told while the
   conversation is still about their phone number. */
function parsePhone(v) {
  let s = clamp(v, 24).replace(/[\s\-().+]/g, '');
  if (s.startsWith('254')) { /* canonical */ }
  else if (s.startsWith('0')) s = '254' + s.slice(1);
  else if (/^[71]/.test(s)) s = '254' + s;
  return /^254[71]\d{8}$/.test(s) ? s : null;
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}

function todayIso() {
  /* Nairobi, so "tonight" does not roll over at UTC midnight. */
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/* ══════════════════════════════════════════════════════════════════════
   TASK STORE
══════════════════════════════════════════════════════════════════════ */

function ownerFilter(caller) {
  return caller.kind === 'user'
    ? `user_id=eq.${caller.userId}`
    : `guest_key=eq.${encodeURIComponent(caller.guestKey)}&user_id=is.null`;
}

export async function activeTask(caller, kind) {
  if (!caller) return null;
  const rows = await select('apa_tasks',
    `${ownerFilter(caller)}&kind=eq.${kind}&status=in.(active,awaiting_payment)&order=updated_at.desc&limit=1`
  ).catch(() => []);
  return rows?.[0] || null;
}

export async function anyResumable(caller) {
  if (!caller) return [];
  const rows = await select('apa_tasks',
    `${ownerFilter(caller)}&status=in.(active,awaiting_payment)&order=updated_at.desc&limit=3`
  ).catch(() => []);
  return (rows || []).filter(t => Date.now() - new Date(t.updated_at).getTime() < RESUME_FRESH_MS);
}

async function openTask(caller, kind, threadId) {
  const existing = await activeTask(caller, kind);
  if (existing) return existing;
  const row = {
    kind,
    status: 'active',
    step: 'collecting',
    slots: {},
    thread_id: threadId || null,
    ...(caller.kind === 'user' ? { user_id: caller.userId } : { guest_key: caller.guestKey }),
  };
  const made = await insert('apa_tasks', row).catch(async (e) => {
    /* The one-active-per-owner index is doing its job: somebody opened
       a second task in a parallel request. Theirs won; use it. */
    const again = await activeTask(caller, kind);
    if (again) return again;
    throw e;
  });
  return Array.isArray(made) ? made[0] : made;
}

async function saveSlots(task, slots, patch = {}) {
  const next = { slots, ...patch };
  await dbUpdate('apa_tasks', `id=eq.${task.id}`, next).catch(() => {});
  return { ...task, ...next };
}

/* When an anonymous draft's owner signs in, the draft is theirs. Called
   from the same place that adopts anonymous threads, so a guest who
   assembles a booking then signs in to pay does not start over. */
export async function adoptTasks(caller, guestKey) {
  if (caller.kind !== 'user' || !guestKey) return;
  const mine = await select('apa_tasks',
    `guest_key=eq.${encodeURIComponent(guestKey)}&user_id=is.null&status=in.(active,awaiting_payment)&select=id,kind`
  ).catch(() => []);
  for (const t of mine || []) {
    /* If they already have a live task of this kind on the account, the
       account's own is the one that stands — dropping it in favour of an
       anonymous draft would lose work they did while signed in. */
    const clash = await activeTask(caller, t.kind);
    if (clash) {
      await dbUpdate('apa_tasks', `id=eq.${t.id}`, { status: 'abandoned' }).catch(() => {});
      continue;
    }
    await dbUpdate('apa_tasks', `id=eq.${t.id}`, { user_id: caller.userId, guest_key: null }).catch(() => {});
  }
}

/* ══════════════════════════════════════════════════════════════════════
   MEMORY
   Deliberately small. A preference worth carrying between conversations
   is a short scalar — an area, a party size, a budget band. Anything
   longer is a transcript, and transcripts already live in the thread.
══════════════════════════════════════════════════════════════════════ */

const MEMORY_KEYS = new Set([
  'home_area', 'preferred_area', 'budget_band', 'party_size',
  'travels_with', 'stay_style', 'dietary', 'preferred_name', 'host_of',
]);

export async function recall(caller) {
  if (caller.kind !== 'user') return {};
  const row = await one('apa_memory', `user_id=eq.${caller.userId}&select=facts`).catch(() => null);
  return row?.facts || {};
}

export async function remember(caller, key, value) {
  if (caller.kind !== 'user') return { ok: false, reason: 'not_signed_in' };
  const k = clamp(key, 40);
  if (!MEMORY_KEYS.has(k)) return { ok: false, reason: 'not_a_remembered_key', allowed: [...MEMORY_KEYS] };
  const v = clamp(value, 80);
  const facts = await recall(caller);
  facts[k] = v;
  /* Upsert by hand: the row may not exist, and a failed insert on a
     concurrent request should fall through to an update, not error. */
  const existing = await one('apa_memory', `user_id=eq.${caller.userId}&select=user_id`).catch(() => null);
  if (existing) await dbUpdate('apa_memory', `user_id=eq.${caller.userId}`, { facts }).catch(() => {});
  else await insert('apa_memory', { user_id: caller.userId, facts }).catch(async () => {
    await dbUpdate('apa_memory', `user_id=eq.${caller.userId}`, { facts }).catch(() => {});
  });
  return { ok: true, remembered: { [k]: v } };
}

export function memoryText(facts) {
  const entries = Object.entries(facts || {});
  if (!entries.length) return '';
  return 'WHAT YOU ALREADY KNOW ABOUT THEM (from past conversations — use it, do not recite it back):\n' +
    entries.map(([k, v]) => `  · ${k.replace(/_/g, ' ')}: ${v}`).join('\n');
}

/* ══════════════════════════════════════════════════════════════════════
   PRICING
   One function, called everywhere a number is needed, reading the
   listing row every time. Nothing else in this file may compute a price.
══════════════════════════════════════════════════════════════════════ */

async function priceStay(listing, checkin, checkout, guests) {
  const nights = daysBetween(checkin, checkout);
  if (nights < 1) return { error: 'checkout_before_checkin' };

  const minNights = Number(listing.min_nights || 1);
  if (nights < minNights) {
    return { error: 'below_min_nights', min_nights: minNights, nights };
  }

  const perNight = Number(listing.price_night ?? listing.price_per_night ?? 0);
  if (!(perNight > 0)) return { error: 'listing_has_no_price' };

  const maxGuests = Number(listing.max_guests || 0);
  if (maxGuests > 0 && guests > maxGuests) {
    return { error: 'too_many_guests', max_guests: maxGuests };
  }

  const stayTotal = Math.round(perNight * nights);
  const service   = String(listing.service || listing.type || 'stays').toLowerCase();
  const fee       = serviceFee(service === 'roommates' ? 'roommates' : 'stays', stayTotal);
  const grand     = stayTotal + fee;

  return {
    nights, per_night: perNight,
    stay_total: stayTotal,
    service_fee: fee,
    grand_total: grand,
    deposit_required: depositRequired(grand),
    deposit_pct: Math.round(DEPOSIT_PCT * 100),
  };
}

/* What the guest agreed to, reduced to a short string. If any of it
   moves after they said yes, the agreement no longer matches and the
   confirmation is refused rather than applied to different numbers. */
function quoteKey(q) {
  return [q.listing_id, q.checkin, q.checkout, q.guests, q.grand_total].join('|');
}

/* ══════════════════════════════════════════════════════════════════════
   AVAILABILITY
   Read from the same holds table the booking path writes, so APA cannot
   promise dates the calendar has already given away.
══════════════════════════════════════════════════════════════════════ */

async function datesAreFree(listingId, checkin, checkout) {
  try {
    /* The claim lives in listing_holds as a daterange behind an
       exclusion constraint, so the overlap question is asked in the
       database rather than reassembled here out of two date columns —
       which, in an earlier revision of this file, did not exist. */
    const free = await rpc('apa_dates_free', {
      p_listing: listingId, p_checkin: checkin, p_checkout: checkout,
    });
    return { free: free === true };
  } catch (e) {
    /* Not knowing is not the same as free. Say so, and let the booking
       path's exclusion constraint be the real arbiter. */
    console.warn('[apa:availability]', e.message);
    return { free: null, reason: 'calendar_unreadable' };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   BOOKING FLOW
══════════════════════════════════════════════════════════════════════ */

const BOOKING_SLOTS = ['listing_id', 'checkin', 'checkout', 'guests', 'phone'];

function missingBookingSlots(slots) {
  return BOOKING_SLOTS.filter(k => slots[k] == null || slots[k] === '');
}

export async function bookingStart(caller, { listing_id, threadId }) {
  const task = await openTask(caller, 'booking', threadId);
  const slots = { ...(task.slots || {}) };

  if (listing_id) {
    const listing = await one('listings',
      `id=eq.${clamp(listing_id, 40)}&is_active=eq.true&select=id,title,area,city,price_night,price_per_night,min_nights,max_guests,service,type,cancel_policy,host_id`
    ).catch(() => null);
    if (!listing) return { error: 'listing_not_found', message: 'That listing is not live. Do not claim it exists.' };
    slots.listing_id = listing.id;
    slots.listing_title = listing.title;
    slots.listing_area = listing.area || listing.city || '';
  }

  const saved = await saveSlots(task, slots);
  return {
    ok: true,
    task_id: saved.id,
    have: slots,
    still_needed: missingBookingSlots(slots),
    note: 'Ask for what is still needed, one or two at a time, conversationally. Never invent a value.',
  };
}

export async function bookingSet(caller, args) {
  const task = await activeTask(caller, 'booking');
  if (!task) return { error: 'no_booking_in_progress', message: 'Start one first with start_booking.' };

  const slots = { ...(task.slots || {}) };
  const rejected = {};

  if (args.listing_id != null) {
    const listing = await one('listings',
      `id=eq.${clamp(args.listing_id, 40)}&is_active=eq.true&select=id,title,area,city`).catch(() => null);
    if (!listing) rejected.listing_id = 'not a live listing';
    else {
      slots.listing_id = listing.id;
      slots.listing_title = listing.title;
      slots.listing_area = listing.area || listing.city || '';
    }
  }

  if (args.checkin != null) {
    const d = parseDate(args.checkin);
    if (!d) rejected.checkin = 'need a real date as YYYY-MM-DD';
    else if (d < todayIso()) rejected.checkin = 'that date is in the past';
    else slots.checkin = d;
  }

  if (args.checkout != null) {
    const d = parseDate(args.checkout);
    if (!d) rejected.checkout = 'need a real date as YYYY-MM-DD';
    else slots.checkout = d;
  }

  if (slots.checkin && slots.checkout && daysBetween(slots.checkin, slots.checkout) < 1) {
    rejected.checkout = 'checkout must be after checkin';
    delete slots.checkout;
  }

  if (args.guests != null) {
    const n = parseInt_(args.guests, { min: 1, max: 30 });
    if (n == null) rejected.guests = 'between 1 and 30';
    else slots.guests = n;
  }

  if (args.phone != null) {
    const p = parsePhone(args.phone);
    if (!p) rejected.phone = 'need a Kenyan mobile like 07XX XXX XXX';
    else slots.phone = p;
  }

  /* Any change invalidates a confirmation given against the old numbers. */
  delete slots.confirmed_quote;

  const saved = await saveSlots(task, slots);
  const still = missingBookingSlots(slots);

  const out = { ok: true, have: slots, still_needed: still };
  if (Object.keys(rejected).length) {
    out.rejected = rejected;
    out.note = 'Ask again for the rejected values in plain language. Do not guess them.';
  }
  if (!still.length) out.next = 'Everything is in. Call review_booking to get the real total, then read it out and ask them to confirm.';
  return out;
}

/* The quote. This is the only place a guest-facing total is produced,
   and it always reads the listing fresh. */
export async function bookingReview(caller) {
  const task = await activeTask(caller, 'booking');
  if (!task) return { error: 'no_booking_in_progress' };

  const slots = task.slots || {};
  const still = missingBookingSlots(slots);
  if (still.length) return { error: 'incomplete', still_needed: still };

  const listing = await one('listings',
    `id=eq.${slots.listing_id}&is_active=eq.true&select=id,title,area,city,price_night,price_per_night,min_nights,max_guests,service,type,cancel_policy,host_id`
  ).catch(() => null);
  if (!listing) return { error: 'listing_gone', message: 'That listing is no longer live. Tell them plainly and offer alternatives.' };

  const priced = await priceStay(listing, slots.checkin, slots.checkout, slots.guests);
  if (priced.error) return { error: priced.error, ...priced };

  const avail = await datesAreFree(listing.id, slots.checkin, slots.checkout);
  if (avail.free === false) {
    return { error: 'dates_taken', message: 'Those dates are already held. Offer other dates or another place — do not suggest paying anyway.' };
  }

  const quote = {
    listing_id: listing.id,
    listing_title: listing.title,
    area: listing.area || listing.city || '',
    checkin: slots.checkin,
    checkout: slots.checkout,
    guests: slots.guests,
    ...priced,
    cancel_policy: listing.cancel_policy || 'set by the host on this listing',
    availability_checked: avail.free === true,
  };

  await saveSlots(task, { ...slots, quote, quote_key: quoteKey(quote) }, { step: 'quoted' });

  return {
    ok: true,
    quote,
    say: `${priced.nights} night(s), ${money(priced.per_night)} a night — ${money(priced.stay_total)} plus ${money(priced.service_fee)} platform fee. Total ${money(priced.grand_total)}. ${money(priced.deposit_required)} confirms the dates.`,
    then: 'Read that back and ask them to confirm in words. Only after they clearly agree, call confirm_booking.',
  };
}

/* The gate. Nothing before this writes a booking; nothing after it
   re-opens the numbers. */
export async function bookingConfirm(caller, { agreed }) {
  if (caller.kind !== 'user') {
    return {
      error: 'sign_in_required',
      message: 'They must be signed in before anything is booked. Send them to signin — the draft is kept and picked up after.',
      route: 'signin',
    };
  }

  const task = await activeTask(caller, 'booking');
  if (!task) return { error: 'no_booking_in_progress' };

  const slots = task.slots || {};
  if (!slots.quote) return { error: 'not_quoted', message: 'Call review_booking first.' };
  if (agreed !== true) {
    return { error: 'not_agreed', message: 'Do not call this until they have actually said yes.' };
  }

  /* Reprice from scratch. If anything moved between the quote and the
     yes — the host changed the nightly rate, the dates got taken — the
     guest agreed to a number that is no longer real. */
  const listing = await one('listings',
    `id=eq.${slots.listing_id}&is_active=eq.true&select=id,title,area,city,price_night,price_per_night,min_nights,max_guests,service,type,host_id`
  ).catch(() => null);
  if (!listing) return { error: 'listing_gone' };

  const fresh = await priceStay(listing, slots.checkin, slots.checkout, slots.guests);
  if (fresh.error) return { error: fresh.error, ...fresh };

  const freshKey = quoteKey({
    listing_id: listing.id, checkin: slots.checkin, checkout: slots.checkout,
    guests: slots.guests, grand_total: fresh.grand_total,
  });
  if (freshKey !== slots.quote_key) {
    await saveSlots(task, { ...slots, quote: null, quote_key: null }, { step: 'collecting' });
    return {
      error: 'price_changed',
      message: 'The price or availability moved since you quoted. Re-quote with review_booking and tell them what changed before anything is charged.',
      old_total: slots.quote.grand_total,
      new_total: fresh.grand_total,
    };
  }

  const avail = await datesAreFree(listing.id, slots.checkin, slots.checkout);
  if (avail.free === false) return { error: 'dates_taken' };

  /* The database enforces this shape exactly:
       ^APT-<listing uuid>-<10 to 16 digits>$
     cabana_secure_apartment_booking() rejects anything else, and it is
     right to: a reference that does not name its own listing cannot be
     checked against one. Milliseconds since epoch is 13 digits. */
  const reference = `APT-${listing.id}-${Date.now()}`;

  const booking = await insert('apartment_bookings', {
    guest_id: caller.userId,
    listing_id: listing.id,
    host_id: listing.host_id || null,
    apartment_id: String(listing.id),
    apartment_name: listing.title,
    listing_name: listing.title,
    location: listing.area || listing.city || null,
    checkin_date: slots.checkin,
    checkout_date: slots.checkout,
    nights: fresh.nights,
    num_guests: slots.guests,
    guest_name: caller.name || null,
    guest_phone: slots.phone,
    contact_phone: slots.phone,
    contact_email: caller.email || null,
    stay_total: fresh.stay_total,
    service_fee: fresh.service_fee,
    grand_total: fresh.grand_total,
    deposit_required: fresh.deposit_required,
    amount_paid: 0,
    payment_reference: reference,
    status: 'pending_payment',
    created_at: nowIso(),
  }).catch((e) => ({ __error: e.message }));

  if (!booking || booking.__error) {
    console.warn('[apa:booking]', booking?.__error);
    return {
      error: 'could_not_create',
      message: 'Say plainly that it did not go through, do not guess why, and offer a person.',
    };
  }

  const row = Array.isArray(booking) ? booking[0] : booking;

  /* The row that came back is the truth, not the quote. A database
     trigger recomputes the stay total, the fee, the grand total and the
     deposit from the listing on the way in — deliberately, so no caller
     can name its own price. Reporting our own arithmetic here would be
     reporting a number nobody was charged. */
  const charged = {
    grand_total: Number(row.grand_total ?? fresh.grand_total),
    deposit_required: Number(row.deposit_required ?? fresh.deposit_required),
    stay_total: Number(row.stay_total ?? fresh.stay_total),
    service_fee: Number(row.service_fee ?? fresh.service_fee),
    nights: Number(row.nights ?? fresh.nights),
  };

  await saveSlots(task, { ...slots, reference, charged }, {
    status: 'awaiting_payment',
    step: 'payment',
    booking_id: row.id,
    reference,
  });

  const drifted = charged.grand_total !== fresh.grand_total;

  /* The action the browser performs. APA cannot charge anyone; she can
     only ask the page to raise the prompt, which the guest then approves
     on their own handset. */
  return {
    ok: true,
    booking_id: row.id,
    reference,
    charged,
    ...(drifted ? {
      note: `The final total is ${money(charged.grand_total)}, not the ${money(fresh.grand_total)} you quoted. Say the real number and why it differs if you can tell; never read out the old one.`,
    } : {}),
    action: {
      type: 'payment_prompt',
      reference,
      phone: slots.phone,
      amount: charged.deposit_required,
      max_amount: charged.grand_total,
      label: `${money(charged.deposit_required)} deposit for ${listing.title}`,
    },
    say: `Booking ${reference} is created. Sending an M-Pesa prompt to ${slots.phone.replace(/^254/, '0')} for ${money(charged.deposit_required)} — approve it and the dates are yours.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   LISTING FLOW
   Photos and a location cannot come out of a conversation, so the flow
   asks the browser for them and waits. Everything else is dictated.
══════════════════════════════════════════════════════════════════════ */

const LISTING_REQUIRED = ['title', 'service', 'city', 'area', 'price_night', 'photos', 'description'];

const LISTING_SERVICES = new Set(['stays', 'roommates', 'tours', 'events', 'carhire', 'food', 'shopping']);

function missingListingSlots(slots) {
  return LISTING_REQUIRED.filter(k => {
    if (k === 'photos') return !(Array.isArray(slots.photos) && slots.photos.length >= 1);
    return slots[k] == null || slots[k] === '';
  });
}

export async function listingStart(caller, { service, threadId }) {
  if (caller.kind !== 'user') {
    return {
      error: 'sign_in_required',
      message: 'Listing needs an account. Send them to signin; the draft is kept.',
      route: 'signin',
    };
  }
  const task = await openTask(caller, 'listing', threadId);
  const slots = { ...(task.slots || {}) };
  if (service && LISTING_SERVICES.has(String(service).toLowerCase())) {
    slots.service = String(service).toLowerCase();
  }
  const saved = await saveSlots(task, slots);
  return {
    ok: true,
    task_id: saved.id,
    have: slots,
    still_needed: missingListingSlots(slots),
    note: 'Walk them through it one question at a time. Photos and location are collected by the page, not by you — call request_upload when you need them.',
  };
}

export async function listingSet(caller, args) {
  if (caller.kind !== 'user') return { error: 'sign_in_required', route: 'signin' };
  const task = await activeTask(caller, 'listing');
  if (!task) return { error: 'no_listing_in_progress' };

  const slots = { ...(task.slots || {}) };
  const rejected = {};

  if (args.service != null) {
    const s = String(args.service).toLowerCase();
    if (!LISTING_SERVICES.has(s)) rejected.service = `one of: ${[...LISTING_SERVICES].join(', ')}`;
    else slots.service = s;
  }
  if (args.title != null) {
    const t = clamp(args.title, 90).trim();
    if (t.length < 6) rejected.title = 'needs to be at least a few words';
    else slots.title = t;
  }
  if (args.description != null) {
    const d = clamp(args.description, 2000).trim();
    if (d.length < 30) rejected.description = 'needs a real description, at least a sentence or two';
    else slots.description = d;
  }
  if (args.city != null)  slots.city  = clamp(args.city, 60).trim();
  if (args.area != null)  slots.area  = clamp(args.area, 60).trim();
  if (args.street != null) slots.street = clamp(args.street, 120).trim();

  if (args.price_night != null) {
    const n = Number(args.price_night);
    /* An upper bound is not pedantry: a mistyped price is the most
       common way a host lists their flat at 350,000 a night. */
    if (!Number.isFinite(n) || n < 100 || n > 2_000_000) rejected.price_night = 'a nightly price in KES between 100 and 2,000,000';
    else slots.price_night = Math.round(n);
  }
  if (args.beds != null) {
    const n = parseInt_(args.beds, { min: 0, max: 30 });
    if (n == null) rejected.beds = 'a number of bedrooms'; else slots.beds = n;
  }
  if (args.baths != null) {
    const n = parseInt_(args.baths, { min: 0, max: 30 });
    if (n == null) rejected.baths = 'a number of bathrooms'; else slots.baths = n;
  }
  if (args.max_guests != null) {
    const n = parseInt_(args.max_guests, { min: 1, max: 50 });
    if (n == null) rejected.max_guests = 'how many people it sleeps'; else slots.max_guests = n;
  }
  if (args.min_nights != null) {
    const n = parseInt_(args.min_nights, { min: 1, max: 365 });
    if (n == null) rejected.min_nights = 'a minimum number of nights'; else slots.min_nights = n;
  }
  if (Array.isArray(args.amenities)) {
    slots.amenities = args.amenities.slice(0, 40).map(a => clamp(a, 40)).filter(Boolean);
  }
  if (args.cancel_policy != null) {
    const p = String(args.cancel_policy).toLowerCase();
    if (!['flexible', 'moderate', 'strict', 'non-refundable'].includes(p)) {
      rejected.cancel_policy = 'flexible, moderate, strict or non-refundable';
    } else slots.cancel_policy = p;
  }

  delete slots.confirmed_publish;

  await saveSlots(task, slots);
  const still = missingListingSlots(slots);
  const out = { ok: true, have: redactListing(slots), still_needed: still };
  if (Object.keys(rejected).length) {
    out.rejected = rejected;
    out.note = 'Ask again for the rejected values conversationally.';
  }
  if (!still.length) out.next = 'Everything required is in. Read the listing back to them and call publish_listing once they confirm.';
  return out;
}

/* Photo URLs are long and add nothing to the model's reasoning. It only
   needs to know how many there are. */
function redactListing(slots) {
  const out = { ...slots };
  if (Array.isArray(out.photos)) out.photos = `${out.photos.length} photo(s) uploaded`;
  return out;
}

/* APA cannot open a file picker or read a GPS chip. She asks the page
   to, and the page reports back on the next turn. */
export async function requestUpload(caller, { what }) {
  const kind = String(what || '').toLowerCase();
  if (!['photos', 'location'].includes(kind)) {
    return { error: 'unknown_request', message: 'Only photos or location can be collected this way.' };
  }
  const task = await activeTask(caller, 'listing');
  if (!task) return { error: 'no_listing_in_progress' };

  return {
    ok: true,
    action: kind === 'photos'
      ? { type: 'collect_photos', min: 1, max: 12, label: 'Add photos of your place' }
      : { type: 'collect_location', label: 'Drop a pin on your place' },
    say: kind === 'photos'
      ? 'I have opened the picker — choose the photos and I will carry on from there.'
      : 'I have asked for your location — allow it and I will fill the address in.',
  };
}

export async function listingPublish(caller, { agreed }) {
  if (caller.kind !== 'user') return { error: 'sign_in_required', route: 'signin' };
  if (agreed !== true) return { error: 'not_agreed', message: 'Read the listing back and get a clear yes first.' };

  const task = await activeTask(caller, 'listing');
  if (!task) return { error: 'no_listing_in_progress' };

  const slots = task.slots || {};
  const still = missingListingSlots(slots);
  if (still.length) return { error: 'incomplete', still_needed: still };

  const row = {
    host_id: caller.userId,
    partner_id: caller.userId,
    created_by: caller.userId,
    created_by_role: 'host',
    source: 'apa',
    service: slots.service,
    type: slots.service,
    listing_type: slots.service === 'stays' ? 'apartment' : slots.service,
    title: slots.title,
    description: slots.description,
    country: slots.country || 'Kenya',
    city: slots.city,
    area: slots.area,
    street: slots.street || null,
    lat: slots.lat ?? null,
    lng: slots.lng ?? null,
    latitude: slots.lat ?? null,
    longitude: slots.lng ?? null,
    photos: slots.photos,
    currency: 'KES',
    price_night: slots.price_night,
    price_per_night: slots.price_night,
    beds: slots.beds != null ? String(slots.beds) : null,
    bedrooms: slots.beds ?? null,
    baths: slots.baths != null ? String(slots.baths) : null,
    bathrooms: slots.baths ?? null,
    max_guests: slots.max_guests != null ? String(slots.max_guests) : null,
    min_nights: slots.min_nights ?? 1,
    amenities: slots.amenities || [],
    cancel_policy: slots.cancel_policy || 'moderate',
    /* Never live on creation. Every listing is reviewed, and an
       assistant-assembled one is not an exception to that. */
    status: 'pending_review',
    is_active: false,
    created_at: nowIso(),
  };

  const made = await insert('listings', row).catch((e) => ({ __error: e.message }));
  if (!made || made.__error) {
    return { error: 'could_not_create', message: 'Say plainly that it did not save and offer a person.' };
  }
  const created = Array.isArray(made) ? made[0] : made;

  await saveSlots(task, slots, { status: 'done', step: 'published', listing_id: created.id });

  return {
    ok: true,
    listing_id: created.id,
    say: `Saved. "${slots.title}" is in for review — the team checks every listing before it goes live, usually within a day. You will get an email at ${caller.email || 'your account address'} the moment it is up.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   WHAT THE BROWSER SENDS BACK
   Photos and coordinates arrive on the next turn as a client payload,
   never as model output. Validated here before touching a slot.
══════════════════════════════════════════════════════════════════════ */

const PHOTO_URL = /^https:\/\/[A-Za-z0-9._-]+\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]{1,400}$/;

export async function ingestClientData(caller, payload) {
  if (!payload || typeof payload !== 'object') return null;
  const task = await activeTask(caller, 'listing');
  if (!task) return null;

  const slots = { ...(task.slots || {}) };
  let touched = false;

  if (Array.isArray(payload.photos) && payload.photos.length) {
    const clean = payload.photos
      .map(u => clamp(u, 500))
      .filter(u => PHOTO_URL.test(u))
      .slice(0, 12);
    if (clean.length) {
      slots.photos = [...new Set([...(slots.photos || []), ...clean])].slice(0, 12);
      touched = true;
    }
  }

  if (payload.location && typeof payload.location === 'object') {
    const lat = Number(payload.location.lat), lng = Number(payload.location.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      slots.lat = lat; slots.lng = lng;
      if (payload.location.area)  slots.area  = clamp(payload.location.area, 60);
      if (payload.location.city)  slots.city  = clamp(payload.location.city, 60);
      if (payload.location.street) slots.street = clamp(payload.location.street, 120);
      touched = true;
    }
  }

  if (!touched) return null;
  await saveSlots(task, slots);
  return {
    photos: Array.isArray(slots.photos) ? slots.photos.length : 0,
    located: slots.lat != null,
    still_needed: missingListingSlots(slots),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   GROUNDING
   What the model is told about work in flight, on every turn.
══════════════════════════════════════════════════════════════════════ */

export async function agentGrounding(caller) {
  if (!caller) return '';
  const [tasks, facts] = await Promise.all([
    anyResumable(caller).catch(() => []),
    recall(caller).catch(() => ({})),
  ]);

  const parts = [];
  const mem = memoryText(facts);
  if (mem) parts.push(mem);

  if (tasks.length) {
    const lines = tasks.map(t => {
      const s = t.slots || {};
      const age = Math.round((Date.now() - new Date(t.updated_at).getTime()) / 60000);
      const when = age < 60 ? `${age} min ago` : age < 1440 ? `${Math.round(age / 60)}h ago` : `${Math.round(age / 1440)}d ago`;
      if (t.kind === 'booking') {
        const missing = missingBookingSlots(s);
        return `  · A BOOKING in progress (last touched ${when}): ${s.listing_title || 'listing not chosen'}` +
          `${s.checkin ? `, ${s.checkin} → ${s.checkout || '?'}` : ''}` +
          `${s.guests ? `, ${s.guests} guest(s)` : ''}.` +
          (t.status === 'awaiting_payment'
            ? ` It is CREATED as ${t.reference} and waiting on payment.`
            : missing.length ? ` Still needs: ${missing.join(', ')}.` : ' Complete — quote it.');
      }
      const missing = missingListingSlots(s);
      return `  · A LISTING in progress (last touched ${when}): ${s.title || 'untitled'}` +
        `${s.area ? ` in ${s.area}` : ''}.` +
        (missing.length ? ` Still needs: ${missing.join(', ')}.` : ' Complete — read it back and publish.');
    });
    parts.push(
      'WORK ALREADY IN FLIGHT FOR THIS PERSON:\n' + lines.join('\n') +
      '\n  Offer to carry on from here rather than starting again. Do not re-ask for anything already listed above.'
    );
  }

  return parts.join('\n\n');
}
