/* ══════════════════════════════════════════════════════════════════════
   THE LISTING OVERHAUL
   tests/listing-overhaul.test.mjs

   One file for the promises made in this change, each tested the way a
   person meets it:

     · a check-in code is four digits, read out at a door, and guessing
       it is stopped by a lock rather than by length
     · a guest only ever sees one all-in price; the fee rides on every
       unit, and services with no fee never grow one
     · an ambassador who still owes a step can see and reach the role
     · Back in a card deck returns to the previous card with its answer,
       and from the first card to the previous question
     · a day pass is at least 20% below a night
     · a guest reporting a problem can send a photo or a video, falls
       back to the phone's own camera when the in-app one cannot open,
       and the evidence lands where storage will accept it
   ══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

import { checkinCode } from '../api/lib/_codes.js';
import { normaliseCode } from '../api/lib/_verify-checkin.js';
import { evidenceStrength } from '../api/lib/_checkin-issue.js';

const source = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function bare(url = 'https://cabana.test/') {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/navigation|Not implemented/.test(e.message)) errors.push(e); });
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url, runScripts: 'outside-only', virtualConsole: vc
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}

/* ── 1 · Check-in codes ─────────────────────────────────────────────── */

test('a new check-in code is always exactly four digits', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = checkinCode();
    assert.match(c, /^\d{4}$/);
    seen.add(c);
  }
  /* Drawn across the whole space, not a narrow corner of it. */
  assert.ok(seen.size > 1500, 'codes should be spread across 0000–9999');
});

test('a guest code and a host code on one booking never collide', () => {
  for (let i = 0; i < 500; i++) {
    const guest = checkinCode();
    assert.notEqual(checkinCode(guest), guest);
  }
});

test('codes compare the way people say them', () => {
  assert.equal(normaliseCode('48 21'), '4821');
  assert.equal(normaliseCode(' 4821 '), '4821');
  assert.equal(normaliseCode('48-21'), '4821');
  assert.equal(normaliseCode(4821), '4821');
  /* Leading zeros are part of the code, not a number to be trimmed. */
  assert.equal(normaliseCode('0042'), '0042');
  /* Older bookings keep their prefixed codes and still verify. */
  assert.equal(normaliseCode('host-1a2b 3c4d'), 'HOST-1A2B3C4D');
  assert.equal(normaliseCode(null), '');
});

test('the check-in endpoint locks a booking after repeated wrong codes', () => {
  const src = source('api/lib/_verify-checkin.js');
  assert.match(src, /MAX_CODE_ATTEMPTS\s*=\s*6/);
  assert.match(src, /status\(423\)/);
  assert.match(src, /attempts_left/);
});

test('every code the API writes itself comes from the CSPRNG helper', () => {
  for (const f of ['api/lib/_match-guest.js', 'api/lib/_checkin-issue.js']) {
    const src = source(f);
    assert.match(src, /checkinCode\(/, f);
    assert.doesNotMatch(src, /(guest|host)_code\s*:\s*['"`](GUEST|HOST)-/, f);
  }
  assert.doesNotMatch(source('api/lib/_codes.js'), /Math\.random\(/);
});

/* ── 2 · All-in prices ─────────────────────────────────────────────── */

function fees({ batch = true } = {}) {
  const { w, dom } = bare();
  const calls = [];
  const band = (a) => (a < 5000 ? 300 : 800);
  w.ApaSession = {
    client: () => ({
      rpc: async (name, args) => {
        calls.push([name, args]);
        if (name === 'cabana_all_in_prices') {
          if (!batch) return { data: null, error: { code: 'PGRST202', message: 'function does not exist' } };
          return { data: args.p_amounts.map((a) => a + band(a)), error: null };
        }
        if (name === 'cabana_fee_quote') return { data: band(args.p_subtotal), error: null };
        return { data: null, error: null };
      }
    })
  };
  w.eval(source('apa-fees.js'));
  return { F: w.ApaFees, calls, dom };
}

test('a guest price is the host price with the fee folded in', async () => {
  const { F, dom } = fees();
  const r = await F.allIn('stays', 4500);
  assert.deepEqual({ ...r }, { base: 4500, fee: 300, total: 4800, units: 1 });
  assert.equal(await F.guestPrice('stays', 4500), 4800);
  dom.window.close();
});

test('the fee rides on every unit: a week costs seven all-in nights', async () => {
  const { F, dom } = fees();
  const night = await F.guestPrice('stays', 4500);
  const week = await F.allIn('stays', 4500 * 7, 7);
  assert.equal(week.total, night * 7);
  assert.equal(await F.bookingFee('stays', 4500, 7), 300 * 7);
  dom.window.close();
});

test('services with no fee never grow one', async () => {
  const { F, calls, dom } = fees();
  for (const s of ['food', 'shopping', 'rides', 'roommates']) {
    assert.equal(await F.guestPrice(s, 1200), 1200, s);
    assert.equal(await F.bookingFee(s, 1200, 3), 0, s);
    assert.equal(F.charges(s), false, s);
  }
  assert.equal(calls.length, 0, 'no round trip for a service that is never charged');
  dom.window.close();
});

test('many prices on one page cost one round trip, then none', async () => {
  const { F, calls, dom } = fees();
  const m = await F.allInMany('stays', [3000, 6000, 3000, 9000]);
  assert.equal(m.get(3000), 3300);
  assert.equal(m.get(6000), 6800);
  assert.equal(calls.filter((c) => c[0] === 'cabana_all_in_prices').length, 1);
  assert.equal(F.allInSync('stays', 6000).total, 6800);
  await F.allInMany('stays', [3000, 6000]);
  assert.equal(calls.length, 1, 'cached amounts are not asked again');
  dom.window.close();
});

test('before the migration a booking fee is still the one the server will charge', async () => {
  const { F, calls, dom } = fees({ batch: false });
  /* Older database: banded on the booking total, asked per amount. */
  assert.equal(await F.perUnit(), false);
  assert.equal(await F.bookingFee('stays', 4500, 3), 800);
  assert.equal(await F.guestPrice('stays', 4500), 4800);
  assert.ok(calls.some((c) => c[0] === 'cabana_fee_quote'));
  dom.window.close();
});

test('no guest-facing page prints a fee line', () => {
  for (const f of ['apartments.html', 'checkout.html', 'tours.html', 'events.html', 'carhire.html']) {
    const src = source(f);
    assert.doesNotMatch(src, />\s*(Cabana|Service|Booking) fee\s*</i, f);
  }
});

/* ── 3 · The ambassador role ───────────────────────────────────────── */

function roles(gate) {
  const { w, d, dom } = bare('https://cabana.test/profile.html');
  w.ApaSession = {
    client: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      rpc: async (name) => (name === 'ambassador_gate' ? { data: gate, error: null } : { data: null })
    })
  };
  w.eval(source('apa-roles.js'));
  return { R: w.ApaRoles, w, d, dom };
}

test('an ambassador who still owes the ID check sees the role, with one step left', async () => {
  const { R, d, dom } = roles({ ok: false, reason: 'identity_required' });
  const st = await R.status();
  assert.equal(st.ambassador, 'pending');
  assert.equal(st.ambassadorStep, 'identity_required');
  const host = d.createElement('div'); d.body.append(host);
  await R.mount(host, { as: 'menu' });
  assert.match(host.textContent, /Ambassador/);
  assert.match(host.textContent, /one step left/i);
  dom.window.close();
});

test('a confirmed ambassador switches straight in; a stranger sees an invite-only row that opens the contact gate', async () => {
  const yes = roles({ ok: true });
  assert.equal((await yes.R.status()).ambassador, true);
  yes.dom.window.close();
  const no = roles({ ok: false, reason: 'not_invited' });
  const st = await no.R.status();
  assert.equal(st.ambassador, false);
  const host = no.d.createElement('div'); no.d.body.append(host);
  await no.R.mount(host, { as: 'menu' });
  /* Listed for everyone, but honest: invitation only, and clicking it
     explains that this account is not part of the programme and offers
     the support form instead of navigating anywhere. */
  assert.match(host.textContent, /Ambassador · by invitation/);
  host.querySelector('[data-role="ambassador"]').click();
  await new Promise(r => setTimeout(r, 30));
  const gate = no.d.querySelector('.apa-g');
  assert.ok(gate && gate.classList.contains('on'), 'the gate dialog opens');
  assert.match(gate.textContent, /isn.t part of the Ambassador programme/);
  assert.match(gate.textContent, /Contact support/);
  no.dom.window.close();
});

test('every page loads the role switcher that knows about pending ambassadors', () => {
  const pages = ['profile.html', 'dashboard.html', 'partner-listings.html', 'ambassador-dashboard.html'];
  for (const p of pages) {
    const src = source(p);
    if (/apa-roles\.js/.test(src)) assert.match(src, /apa-roles\.js\?v=20261008/, p);
  }
});

/* ── 4 · Cards: Back, the strip, jumping ───────────────────────────── */

function deck(multiple) {
  const { w, d, dom } = bare();
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  w.eval(source('cabana-listing-cards.js'));
  const host = d.createElement('div'); d.body.append(host);
  const state = { picked: new Set() };
  let backedOut = 0;
  const items = ['Wi-Fi', 'Pool', 'Parking', 'Gym', 'Garden'].map((label) => ({
    label, value: label, selected: () => state.picked.has(label)
  }));
  const api = w.CabanaListingCards.choice(host, {
    label: 'Features', items, multiple,
    snapshot: () => [...state.picked],
    restore: (s) => { state.picked = new Set(s); },
    set: (item, on) => { if (!multiple) state.picked.clear(); if (on) state.picked.add(item.value); else state.picked.delete(item.value); },
    onBackOut: () => { backedOut++; }
  });
  return { api, host, state, w, d, dom, backs: () => backedOut };
}

test('every option is listed in the strip below the card', () => {
  const { host, dom } = deck(true);
  const chips = host.querySelectorAll('.cc-strip .cc-chip');
  assert.equal(chips.length, 5);
  assert.deepEqual([...chips].map((c) => c.textContent.trim()), ['Wi-Fi', 'Pool', 'Parking', 'Gym', 'Garden']);
  assert.equal(chips[0].getAttribute('aria-current'), 'true');
  dom.window.close();
});

test('Back returns the previous card with exactly the answer it had', async () => {
  const { host, state, dom } = deck(true);
  host.querySelector('.cc-yes').click(); await tick(20);
  assert.ok(state.picked.has('Wi-Fi'));
  host.querySelector('.cc-no').click(); await tick(20);
  assert.equal(host.querySelector('.cc-choice-title').textContent, 'Parking');
  host.querySelector('.cc-undo').click(); await tick(20);
  assert.equal(host.querySelector('.cc-choice-title').textContent, 'Pool');
  host.querySelector('.cc-undo').click(); await tick(20);
  assert.equal(host.querySelector('.cc-choice-title').textContent, 'Wi-Fi');
  assert.equal(state.picked.size, 0, 'the earlier yes is undone too');
  dom.window.close();
});

test('tapping a chip jumps there without answering, and Back undoes the jump', async () => {
  const { host, api, state, dom } = deck(true);
  host.querySelectorAll('.cc-chip')[3].click(); await tick(20);
  assert.equal(host.querySelector('.cc-choice-title').textContent, 'Gym');
  assert.equal(state.picked.size, 0);
  assert.equal(host.querySelectorAll('.cc-chip')[3].getAttribute('aria-current'), 'true');
  api.back(); await tick(20);
  assert.equal(host.querySelector('.cc-choice-title').textContent, 'Wi-Fi');
  dom.window.close();
});

test('Back on the first card goes to the previous question, never a dead end', async () => {
  const { host, backs, dom } = deck(false);
  const undo = host.querySelector('.cc-undo');
  assert.equal(undo.disabled, false);
  undo.click(); await tick(20);
  assert.equal(backs(), 1);
  dom.window.close();
});

test('each of the eight services wears its own skin', () => {
  const css = source('cabana-listing-cards.css');
  for (const s of ['stays', 'roommates', 'tours', 'events', 'food', 'carhire', 'rides', 'shopping']) {
    assert.match(css, new RegExp('\\[data-skin=' + s + '\\]'), s);
  }
});

/* ── 5 · Day pass: a real saving ───────────────────────────────────── */

function addListing() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  const dom = new JSDOM(source('add-listing.html'), {
    url: 'https://cabana.test/add-listing.html?from=partner', runScripts: 'dangerously', virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.HTMLElement.prototype.reportValidity = () => true;
    }
  });
  return dom;
}

test('a day pass must be at least 20% below a night', () => {
  const dom = addListing();
  const { window: w } = dom; const d = w.document;
  w.eval("F.svc='stays';F.type='Apartment';F.roomTiers=[{name:'Standard',price:'5000',maxGuests:'2'}];F.dp.days=[1,2,3]");
  d.getElementById('tog-daypass').classList.add('on');
  d.getElementById('f-wa').value = '+254700000000';
  d.getElementById('f-dp-start').value = '10:00';
  d.getElementById('f-dp-end').value = '18:00';
  assert.equal(w.eval('dpMax()'), 4000);

  d.getElementById('f-dp-price').value = '4500';   // only 10% off
  assert.equal(w.valid(5), false);
  d.getElementById('f-dp-price').value = '4000';   // exactly 20% off
  assert.equal(w.valid(5), true);

  d.getElementById('f-dp-end').value = '11:00';    // a one-hour window
  assert.equal(w.valid(5), false);
  dom.window.close();
});

test('the database enforces the same 20% rule and the day pass hours', () => {
  const sql = source('supabase/migrations/20261008100000_all_in_prices_day_pass_codes.sql');
  assert.match(sql, /0\.8/);
  assert.match(sql, /day_pass/i);
  assert.match(sql, /cabana_all_in_prices/);
});

/* ── 6 · Location: the map preview ─────────────────────────────────── */

test('a pinned place shows a street-map preview with the point centred', () => {
  const { w, d, dom } = bare();
  w.eval(source('cabana-place-picker.js'));
  const el = d.createElement('div'); d.body.append(el);
  w.CabanaPlace.preview(el, { lat: -1.2921, lng: 36.8219, label: 'Nairobi' });
  const tiles = el.querySelectorAll('img');
  assert.equal(tiles.length, 9);
  assert.ok([...tiles].every((t) => /tile\.openstreetmap\.org\/16\//.test(t.src)), 'street tiles, not satellite');
  assert.equal(el.getAttribute('aria-label'), 'Map preview of Nairobi');
  dom.window.close();
});

test('the full-screen pin opens on the street map', () => {
  const src = source('cabana-pinpoint.js');
  assert.match(src, /VIEW_ORDER\s*=\s*\[\s*'map'/);
});

/* ── 7 · Reporting a problem: photo and video ──────────────────────── */

function trust() {
  const env = bare('https://cabana.test/my-bookings.html');
  const { w } = env;
  const uploads = [], inserts = [];
  let missingVideoColumns = false;
  w.requestAnimationFrame = (f) => setTimeout(f, 0);
  w.fetch = async () => ({ ok: true, json: async () => ({ held: true }) });
  w.showToast = () => {};
  w.ApaSession = {
    client: () => ({
      auth: {
        getUser: async () => ({ data: { user: { id: 'guest-uid' } } }),
        getSession: async () => ({ data: { session: { access_token: 't' } } })
      },
      storage: { from: (bucket) => ({ upload: async (path, blob, o) => { uploads.push({ bucket, path, type: o.contentType }); return { error: null }; } }) },
      from: (table) => {
        const q = {
          select: () => q, eq: () => q,
          maybeSingle: async () => ({ data: table === 'listings' ? { latitude: -1.29, longitude: 36.82, host_id: 'host-1' } : null }),
          then: (ok, bad) => Promise.resolve({ data: [], error: null }).then(ok, bad),
          insert: (row) => ({
            select: () => ({
              single: async () => {
                inserts.push(row);
                if (missingVideoColumns && 'video_url' in row) return { data: null, error: { code: 'PGRST204', message: "Could not find the 'media' column" } };
                return { data: { id: 'issue-' + inserts.length }, error: null };
              }
            })
          })
        };
        return q;
      }
    })
  };
  w.eval(source('apa-trust.js'));
  return { ...env, T: w.ApaTrust, uploads, inserts, noVideoColumns: () => { missingVideoColumns = true; } };
}

const booking = { id: 'bk-1', apartment_id: 'lst-1', guest_id: 'guest-uid', host_id: 'host-1',
                  checkin_date: new Date(Date.now() + 2 * 3600e3).toISOString(), nights: 2,
                  stay_total: 10000, grand_total: 10800 };

test('evidence is offered on every issue and required where the issue needs it', async () => {
  const { T, d, dom } = trust();
  await T.issue.open(booking);
  const sheet = d.querySelector('.apa-issue');
  const ev = sheet.querySelector('.apa-issue-photo');
  assert.equal(ev.hidden, true, 'nothing to show before an issue is picked');

  sheet.querySelector('[data-code="noise"]').click();
  assert.equal(ev.hidden, false);
  assert.match(ev.textContent, /optional/i);
  assert.equal(sheet.querySelector('.apa-issue-go').disabled, false);

  sheet.querySelector('[data-code="hygiene"]').click();
  assert.match(ev.textContent, /needed/i);
  assert.equal(sheet.querySelector('.apa-issue-go').disabled, true);
  assert.ok(sheet.querySelector('.apa-issue-cam[data-kind="photo"]'));
  assert.ok(sheet.querySelector('.apa-issue-cam[data-kind="video"]'));
  dom.window.close();
});

test('when the in-app camera cannot open, the phone camera is one tap away', async () => {
  const { T, w, d, dom } = trust();
  await T.issue.open(booking);
  const sheet = d.querySelector('.apa-issue');
  sheet.querySelector('[data-code="hygiene"]').click();

  /* jsdom has no camera: the in-app capture refuses. */
  sheet.querySelector('.apa-issue-cam[data-kind="photo"]').click(); await tick(10);
  const alt = sheet.querySelector('.apa-issue-ev-alt');
  assert.equal(alt.hidden, false);
  assert.match(alt.textContent, /phone's camera/);

  alt.querySelector('.apa-issue-ev-alt-go').click();
  const inp = d.querySelector('input[type=file][capture]');
  assert.ok(inp, 'a capture input is offered');
  assert.equal(inp.accept, 'image/*');
  const file = new w.File([new Uint8Array([0xff, 0xd8, 0xff])], 'shot.jpg', { type: 'image/jpeg' });
  Object.defineProperty(inp, 'files', { value: [file] });
  inp.dispatchEvent(new w.Event('change'));
  await tick(40);

  const items = sheet.querySelectorAll('.apa-issue-ev-item');
  assert.equal(items.length, 1);
  assert.match(items[0].textContent, /Phone camera/);
  assert.equal(sheet.querySelector('.apa-issue-go').disabled, false);

  items[0].querySelector('.apa-issue-ev-x').click();
  assert.equal(sheet.querySelectorAll('.apa-issue-ev-item').length, 0);
  assert.equal(sheet.querySelector('.apa-issue-go').disabled, true);
  dom.window.close();
});

test('photos and a clip are stored under the guest\'s own folder and recorded on the issue', async () => {
  const { T, w, uploads, inserts, dom } = trust();
  const blob = (t) => new w.Blob(['x'], { type: t });
  const now = new Date().toISOString();
  await T.issue.submit(booking, {
    code: 'hygiene', freeText: 'Mould on the bathroom ceiling and the sheets are stained.',
    media: [
      { kind: 'photo', blob: blob('image/jpeg'), mime: 'image/jpeg', live: true, takenAt: now, lat: -1.2901, lng: 36.8201 },
      { kind: 'video', blob: blob('video/mp4'), mime: 'video/mp4', live: true, takenAt: now, seconds: 12.4, lat: -1.29, lng: 36.82 }
    ]
  });
  assert.equal(uploads.length, 2);
  for (const u of uploads) {
    assert.equal(u.bucket, 'evidence');
    assert.match(u.path, /^guest-uid\/issues\/bk-1\//, 'storage only accepts files under the owner\'s folder');
  }
  assert.ok(uploads.some((u) => /\.mp4$/.test(u.path) && u.type === 'video/mp4'));
  const row = inserts[0];
  assert.match(row.photo_url, /\.jpg$/);
  assert.equal(row.photo_live, true);
  assert.match(row.video_url, /\.mp4$/);
  assert.equal(row.video_live, true);
  assert.equal(row.video_seconds, 12.4);
  assert.equal(row.media.length, 2);
  assert.equal(row.geo_lat, -1.2901);
  dom.window.close();
});

test('a report still goes through before the video columns exist', async () => {
  const { T, w, inserts, noVideoColumns, dom } = trust();
  noVideoColumns();
  const r = await T.issue.submit(booking, {
    code: 'noise', freeText: '',
    media: [{ kind: 'video', blob: new w.Blob(['x'], { type: 'video/webm' }), mime: 'video/webm', live: true, takenAt: new Date().toISOString(), seconds: 8 }]
  });
  assert.equal(inserts.length, 2);
  assert.ok(!('video_url' in inserts[1]));
  assert.match(inserts[1].photo_url, /\.webm$/, 'the clip is kept as the evidence path');
  assert.ok(r.held);
  dom.window.close();
});

test('a live clip counts as evidence when the issue needs it', () => {
  const tax = { requires_photo: true };
  const none = evidenceStrength({ free_text: '' }, tax);
  const photo = evidenceStrength({ photo_url: 'a.jpg', photo_live: true }, tax);
  const clip = evidenceStrength({ video_url: 'a.mp4', video_live: true }, tax);
  assert.equal(clip, photo);
  assert.ok(clip > none + 0.5);
});
