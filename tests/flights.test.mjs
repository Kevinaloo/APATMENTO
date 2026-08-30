/* ═══════════════════════════════════════════════════════════════════════
   CABANA · FLIGHT DESK — page tests
   tests/flights.test.mjs

   Boots flights.html in jsdom with a stubbed Supabase client and drives
   the page the way a traveller would: pick two airports, set dates, add
   passengers, submit, then read the status view back.

   The stub is deliberately strict about shape. It returns exactly what
   the real RPCs return, including the fact that a quote payload has no
   net_cost, so a regression that starts rendering a margin would fail
   here rather than in production.

   Run: npm test
   ═══════════════════════════════════════════════════════════════════════ */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(ROOT + f, 'utf8');

/* ── a Supabase stand-in ───────────────────────────────────────────── */
function makeStub() {
  const calls = [];
  const state = {
    ref: 'CBF-K7M2QX',
    token: '11111111-2222-3333-4444-555555555555',
    status: 'new',
    quotes: []
  };

  const stub = {
    calls,
    state,
    rpc(name, args) {
      calls.push({ name, args });
      if (name === 'fd_desk_status') {
        return Promise.resolve({ data: {
          open: true, sla_minutes: 45, hours_label: 'Desk staffed 06:00 to 23:00 EAT',
          affiliate_enabled: true, median_response_minutes: 31
        }});
      }
      if (name === 'fd_submit_request') {
        state.submitted = args.p;
        return Promise.resolve({ data: {
          ok: true, ref: state.ref, token: state.token,
          sla_minutes: 45, sla_due_at: new Date(Date.now() + 45 * 60000).toISOString()
        }});
      }
      if (name === 'fd_get_request') {
        return Promise.resolve({ data: {
          ok: true,
          request: {
            ref: state.ref, status: state.status, trip_type: 'return',
            origin_iata: 'NBO', dest_iata: 'DXB',
            depart_date: '2026-09-20', return_date: '2026-09-27',
            adults: 2, children: 1, infants: 0, cabin: 'economy',
            date_flex: '3', contact_name: 'Test Traveller',
            contact_email: 'test@example.com', contact_phone: '+254700000000',
            selected_quote_id: state.selected || null,
            sla_due_at: new Date(Date.now() + 20 * 60000).toISOString(),
            created_at: new Date(Date.now() - 5 * 60000).toISOString(),
            passenger_count: 0
          },
          quotes: state.quotes,
          events: [
            { kind: 'status', title: 'Request received', detail: 'Sitting with the flight desk.',
              at: new Date(Date.now() - 5 * 60000).toISOString() }
          ],
          booking: null
        }});
      }
      if (name === 'fd_select_quote') {
        state.selected = args.p_quote_id;
        state.status = 'selected';
        return Promise.resolve({ data: { ok: true, quote_id: args.p_quote_id, status: 'selected' } });
      }
      return Promise.resolve({ data: null });
    },
    from() {
      const q = {
        select: () => q, or: () => q, order: () => q,
        limit: () => Promise.resolve({ data: [], error: null }),
        then: (r) => Promise.resolve({ data: [], error: null }).then(r)
      };
      return q;
    }
  };
  return stub;
}

/* Exactly the shape fd_get_request returns: no net_cost, no supplier_ref. */
const SAMPLE_QUOTES = [
  {
    id: 'q-1', label: 'Direct, best timing', badge: 'recommended',
    airline_iata: 'KQ', airline_name: 'Kenya Airways', operated_by: null,
    outbound: [{ flight_no: 'KQ310', from: 'NBO', to: 'DXB',
                 dep: '2026-09-20T09:45', arr: '2026-09-20T15:30', duration_min: 285 }],
    inbound:  [{ flight_no: 'KQ311', from: 'DXB', to: 'NBO',
                 dep: '2026-09-27T17:00', arr: '2026-09-27T21:05', duration_min: 305 }],
    stops_out: 0, stops_in: 0, duration_out: 285, duration_in: 305,
    cabin: 'economy', fare_brand: 'Basic', baggage_cabin: '7kg', baggage_checked: '23kg',
    refundable: false, changeable: true, fare_rules: null,
    price: 268400, currency: 'KES', price_per_pax: 89466, taxes_included: true,
    seats_left: 4, hold_until: new Date(Date.now() + 8 * 3600000).toISOString(),
    status: 'offered', sort_order: 1
  },
  {
    id: 'q-2', label: 'One stop, lower fare', badge: 'cheapest',
    airline_iata: 'ET', airline_name: 'Ethiopian Airlines', operated_by: null,
    outbound: [
      { flight_no: 'ET309', from: 'NBO', to: 'ADD', dep: '2026-09-20T07:10', arr: '2026-09-20T09:05', duration_min: 115 },
      { flight_no: 'ET612', from: 'ADD', to: 'DXB', dep: '2026-09-20T10:40', arr: '2026-09-20T15:10', duration_min: 210 }
    ],
    inbound: [],
    stops_out: 1, stops_in: 0, duration_out: 445, duration_in: null,
    cabin: 'economy', fare_brand: null, baggage_cabin: '7kg', baggage_checked: '30kg',
    refundable: false, changeable: false, fare_rules: null,
    price: 214900, currency: 'KES', price_per_pax: 71633, taxes_included: true,
    seats_left: 9, hold_until: new Date(Date.now() + 8 * 3600000).toISOString(),
    status: 'offered', sort_order: 2
  }
];

// jsdom windows keep their timers alive; without this the suite hangs on
// the status-view poll rather than exiting cleanly.
const OPEN = [];
function closeAll() {
  while (OPEN.length) { try { OPEN.pop().close(); } catch (e) { /* already gone */ } }
}

async function boot(search = '') {
  const html = read('flights.html');
  const dom = new JSDOM(html, {
    url: 'https://cabana.africa/flights' + search,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;

  // jsdom has no layout engine; these are noise, not signal.
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
  window.IntersectionObserver = class { observe() {} disconnect() {} };
  window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  window.confirm = () => true;
  window.gtag = () => {};

  const stub = makeStub();
  window.sb = stub;

  window.eval(read('fd-atlas.js'));
  window.eval(read('fd-dialcodes.js'));
  window.eval(read('cabana-flights.js'));

  // let the deferred boot and the desk-status promise settle
  await new Promise((r) => setTimeout(r, 30));
  OPEN.push(window);
  return { window, doc: window.document, stub };
}

/* ══════════════════════════════════════════════════════════════════ */

test('page boots and mounts the request form', async () => {
  const { doc } = await boot();
  assert.ok(doc.getElementById('fd-pass'), 'boarding pass rendered');
  assert.ok(doc.getElementById('fd-submit'), 'submit button present');
  assert.equal(doc.getElementById('fd-submit').disabled, true,
    'submit starts disabled: nothing has been filled in yet');
});

test('atlas seeds Nairobi as the default origin', async () => {
  const { doc } = await boot();
  assert.equal(doc.getElementById('fd-o-code').textContent, 'NBO');
  assert.match(doc.getElementById('fd-o-city').textContent, /Nairobi/);
});

test('desk status pill reflects the live median, not the SLA ceiling', async () => {
  const { doc } = await boot();
  assert.match(doc.getElementById('fd-desk-text').textContent, /31 min/);
});

test('airport picker filters on the first keystroke without a network call', async () => {
  const { window, doc, stub } = await boot();
  doc.getElementById('fd-d-btn').dispatchEvent(new window.Event('click'));
  const input = doc.getElementById('fd-sheet-in');
  input.value = 'dub';
  input.dispatchEvent(new window.Event('input'));

  const opts = [...doc.querySelectorAll('#fd-sheet-list .fd-opt')];
  assert.ok(opts.length > 0, 'results rendered');
  const codes = opts.map((o) => o.dataset.iata);
  assert.ok(codes.includes('DXB'), 'Dubai reachable from "dub"');
  assert.equal(stub.calls.filter((c) => c.name === 'airports').length, 0,
    'inline atlas answered without hitting the database');
});

test('choosing airports draws the arc and reports the distance', async () => {
  const { window, doc } = await boot();
  doc.getElementById('fd-d-btn').dispatchEvent(new window.Event('click'));
  const input = doc.getElementById('fd-sheet-in');
  input.value = 'DXB';
  input.dispatchEvent(new window.Event('input'));
  doc.querySelector('#fd-sheet-list .fd-opt[data-iata="DXB"]').dispatchEvent(
    new window.Event('click', { bubbles: true }));

  assert.equal(doc.getElementById('fd-d-code').textContent, 'DXB');
  assert.ok(doc.getElementById('fd-arc').classList.contains('is-drawn'), 'arc drawn');
  assert.match(doc.getElementById('fd-legline').textContent, /3,559 km/);
});

test('passenger stepper never allows more infants than laps', async () => {
  const { window, doc } = await boot();
  const click = (id) => doc.getElementById(id).dispatchEvent(new window.Event('click'));
  click('fd-inc-infants');
  assert.equal(doc.getElementById('fd-n-infants').textContent, '1');
  // one adult, one infant: the second increment must be refused
  assert.equal(doc.getElementById('fd-inc-infants').disabled, true);
  click('fd-inc-adults');
  assert.equal(doc.getElementById('fd-inc-infants').disabled, false,
    'a second adult frees a second lap');
});

test('one-way hides the return date and clears it', async () => {
  const { window, doc } = await boot();
  const ret = doc.getElementById('fd-return');
  ret.value = '2026-09-27';
  ret.dispatchEvent(new window.Event('change'));

  doc.querySelector('#fd-trip button[data-trip="one_way"]')
     .dispatchEvent(new window.Event('click'));
  assert.equal(doc.getElementById('fd-f-return').style.display, 'none');
  assert.equal(doc.getElementById('fd-return').value, '', 'stale return date cleared');
});

test('a return date before departure is discarded', async () => {
  const { window, doc } = await boot();
  const dep = doc.getElementById('fd-depart'), ret = doc.getElementById('fd-return');
  ret.value = '2026-09-10'; ret.dispatchEvent(new window.Event('change'));
  dep.value = '2026-09-20'; dep.dispatchEvent(new window.Event('change'));
  assert.equal(ret.value, '', 'impossible return removed rather than submitted');
});

test('submit is gated until the request is actually answerable', async () => {
  const { window, doc } = await boot();
  const submit = doc.getElementById('fd-submit');

  // destination
  doc.getElementById('fd-d-btn').dispatchEvent(new window.Event('click'));
  const input = doc.getElementById('fd-sheet-in');
  input.value = 'DXB'; input.dispatchEvent(new window.Event('input'));
  doc.querySelector('#fd-sheet-list .fd-opt[data-iata="DXB"]')
     .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.equal(submit.disabled, true, 'still no dates');

  const dep = doc.getElementById('fd-depart');
  dep.value = '2026-09-20'; dep.dispatchEvent(new window.Event('change'));
  const ret = doc.getElementById('fd-return');
  ret.value = '2026-09-27'; ret.dispatchEvent(new window.Event('change'));
  assert.equal(submit.disabled, true, 'still no way to reach the traveller');

  const name = doc.getElementById('fd-name');
  name.value = 'Test Traveller'; name.dispatchEvent(new window.Event('input'));
  assert.equal(submit.disabled, true, 'a name alone is not a contact');

  const email = doc.getElementById('fd-email');
  email.value = 'test@example.com'; email.dispatchEvent(new window.Event('input'));
  assert.equal(submit.disabled, false, 'now answerable');
});

test('submitting sends a well-formed payload and switches to the status view', async () => {
  const { window, doc, stub } = await boot();

  doc.getElementById('fd-d-btn').dispatchEvent(new window.Event('click'));
  const input = doc.getElementById('fd-sheet-in');
  input.value = 'DXB'; input.dispatchEvent(new window.Event('input'));
  doc.querySelector('#fd-sheet-list .fd-opt[data-iata="DXB"]')
     .dispatchEvent(new window.Event('click', { bubbles: true }));

  const dep = doc.getElementById('fd-depart');
  dep.value = '2026-09-20'; dep.dispatchEvent(new window.Event('change'));
  const ret = doc.getElementById('fd-return');
  ret.value = '2026-09-27'; ret.dispatchEvent(new window.Event('change'));
  doc.getElementById('fd-name').value = 'Test Traveller';
  doc.getElementById('fd-name').dispatchEvent(new window.Event('input'));
  doc.getElementById('fd-email').value = 'test@example.com';
  doc.getElementById('fd-email').dispatchEvent(new window.Event('input'));
  doc.getElementById('fd-inc-adults').dispatchEvent(new window.Event('click'));

  doc.getElementById('fd-submit').dispatchEvent(new window.Event('click'));
  await new Promise((r) => setTimeout(r, 40));

  const call = stub.calls.find((c) => c.name === 'fd_submit_request');
  assert.ok(call, 'fd_submit_request was called');
  const p = call.args.p;
  assert.equal(p.origin_iata, 'NBO');
  assert.equal(p.dest_iata, 'DXB');
  assert.equal(p.depart_date, '2026-09-20');
  assert.equal(p.return_date, '2026-09-27');
  assert.equal(p.adults, 2);
  assert.equal(p.trip_type, 'return');
  assert.equal(p.contact_email, 'test@example.com');

  assert.ok(doc.getElementById('fd-status').classList.contains('is-on'), 'status view shown');
  assert.ok(doc.getElementById('fd-form-wrap').classList.contains('is-off'), 'form hidden');
  assert.match(window.location.search, /ref=CBF-K7M2QX/, 'ref written to the URL');
});

test('status view renders the reference, timeline and waiting state', async () => {
  const { doc } = await boot('?ref=CBF-K7M2QX&t=11111111-2222-3333-4444-555555555555');
  await new Promise((r) => setTimeout(r, 40));
  const text = doc.getElementById('fd-status').textContent;
  assert.match(text, /CBF-K7M2QX/);
  assert.match(text, /Request received/);
  assert.match(text, /The desk is on it/);
});

test('quotes render with route, baggage and an all-in price', async () => {
  const { window, doc, stub } = await boot('?ref=CBF-K7M2QX&t=11111111-2222-3333-4444-555555555555');
  stub.state.status = 'quoted';
  stub.state.quotes = SAMPLE_QUOTES;
  window.CabanaFlights.showStatus('CBF-K7M2QX', stub.state.token);
  await new Promise((r) => setTimeout(r, 40));

  const status = doc.getElementById('fd-status');
  const cards = status.querySelectorAll('.fd-quote');
  assert.equal(cards.length, 2, 'both options rendered');

  const text = status.textContent;
  assert.match(text, /Kenya Airways/);
  assert.match(text, /Ethiopian Airlines/);
  assert.match(text, /268,400/, 'price formatted for the market');
  assert.match(text, /Non-stop/);
  assert.match(text, /1 stop via ADD/, 'connection named');
  assert.match(text, /23kg checked/);
  assert.match(text, /total for 3 travellers/);
  assert.match(text, /09:45/, 'departure time shown');
});

test('a traveller never receives commercial fields', async () => {
  const { window, doc, stub } = await boot('?ref=CBF-K7M2QX&t=11111111-2222-3333-4444-555555555555');
  stub.state.status = 'quoted';
  stub.state.quotes = SAMPLE_QUOTES;
  window.CabanaFlights.showStatus('CBF-K7M2QX', stub.state.token);
  await new Promise((r) => setTimeout(r, 40));

  // Strip inline CSS first: "margin-top" is not a margin leak, and a test
  // that cannot tell the difference will cry wolf until someone disables it.
  const rendered = doc.getElementById('fd-status').innerHTML
    .replace(/style="[^"]*"/g, '').toLowerCase();
  for (const forbidden of ['net_cost', 'net cost', 'supplier', 'sourced_via', 'desk_notes', 'internal_flags']) {
    assert.ok(!rendered.includes(forbidden), `"${forbidden}" must never reach the page`);
  }
  assert.ok(!/\bmargin\b(?!-)/.test(rendered), 'the word margin must not appear as data');

  // Numbers matter more than words: the net cost of q-2 is 192500 and its
  // margin 22400. Neither figure may appear anywhere in the document.
  const whole = doc.documentElement.innerHTML;
  for (const n of ['192500', '192,500', '241000', '241,000', '22400', '22,400', '27400', '27,400']) {
    assert.ok(!whole.includes(n), `commercial figure ${n} must never be rendered`);
  }
  for (const src of ['skyscanner', 'kiwi.com', 'travelpayouts', 'aviasales', 'expedia']) {
    assert.ok(!whole.toLowerCase().includes(src), `no third-party source is ever named (${src})`);
  }
});

test('choosing an option calls the RPC and locks the card', async () => {
  const { window, doc, stub } = await boot('?ref=CBF-K7M2QX&t=11111111-2222-3333-4444-555555555555');
  stub.state.status = 'quoted';
  stub.state.quotes = SAMPLE_QUOTES;
  window.CabanaFlights.showStatus('CBF-K7M2QX', stub.state.token);
  await new Promise((r) => setTimeout(r, 40));

  doc.querySelector('#fd-status [data-pick="q-2"]')
     .dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 60));

  const call = stub.calls.find((c) => c.name === 'fd_select_quote');
  assert.ok(call, 'fd_select_quote called');
  assert.equal(call.args.p_quote_id, 'q-2');
  assert.equal(call.args.p_ref, 'CBF-K7M2QX');
  assert.match(doc.getElementById('fd-status').textContent, /Your chosen flight/);
});

test('popular routes prefill the form', async () => {
  const { window, doc } = await boot();
  const card = doc.querySelector('#fd-popular .fd-routecard[data-d="ZNZ"]');
  assert.ok(card, 'Zanzibar route offered');
  card.dispatchEvent(new window.Event('click'));
  assert.equal(doc.getElementById('fd-d-code').textContent, 'ZNZ');
  assert.match(doc.getElementById('fd-d-city').textContent, /Zanzibar/);
});

test('markup carries the accessibility floor', async () => {
  const { doc } = await boot();
  assert.ok(doc.querySelector('#fd-sheet[role="dialog"][aria-modal="true"]'), 'picker is a modal dialog');
  assert.ok(doc.querySelector('#fd-trip[role="group"]'), 'trip type is a labelled group');
  assert.ok(doc.querySelector('#fd-status[aria-live="polite"]'), 'status updates are announced');
  assert.equal(doc.querySelector('label[for="fd-depart"]') !== null, true, 'date input is labelled');
  for (const b of doc.querySelectorAll('.fd-step-b')) {
    assert.ok(b.getAttribute('aria-label'), 'every stepper button names itself');
  }
});


/* ══════════════════════════════════════════════════════════════════
   PASTE-A-FLIGHT PARSER
   The most operator-facing surface: everything the desk types in a
   workspace goes through parseLegs before it becomes a structured leg.
   Regressions here are invisible in tests and painful in production.
══════════════════════════════════════════════════════════════════════ */

/* ── parser helpers extracted for isolation ───────────────────── */
// Slice parseLegs and legsToText out of the admin source and eval them in
// a plain scope — no jsdom, no Supabase stub needed.
function makeParserPair() {
  const src = read('cabana-flights-admin.js');
  const pi  = src.indexOf('  function parseLegs(');
  const li  = src.indexOf('  function legsToText(');
  const end = src.indexOf('\n  /* \u2550\u2550', li);

  const parseFn = src.slice(pi, li).trim();
  const legsFn  = src.slice(li, end).trim();

  // pad() is used inside parseLegs; inline it to avoid a reference error.
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    ['"use strict";',
     'var pad = function(n){ return (n < 10 ? "0" : "") + n; };',
     parseFn, legsFn,
     'return { parseLegs: parseLegs, legsToText: legsToText };'
    ].join('\n')
  );
  const fns = factory();
  return { parse: fns.parseLegs, toText: fns.legsToText };
}
test('parseLegs: standard single-leg outbound', async () => {
  const { parse } = makeParserPair();
  assert.ok(typeof parse === 'function', 'parseLegs is a function');

  const legs = parse('KQ310 NBO 0945 DXB 1530', '2026-09-20');
  assert.equal(legs.length, 1);
  const l = legs[0];
  assert.equal(l.flight_no, 'KQ310');
  assert.equal(l.from, 'NBO');
  assert.equal(l.to, 'DXB');
  assert.equal(l.dep, '2026-09-20T09:45');
  assert.equal(l.arr, '2026-09-20T15:30');
  assert.equal(l.duration_min, 345);
});

test('parseLegs: overnight flight with +1', async () => {
  const { parse } = makeParserPair();

  const legs = parse('EK722 NBO 2330 DXB 0415 +1', '2026-09-20');
  assert.equal(legs.length, 1);
  const l = legs[0];
  assert.equal(l.dep, '2026-09-20T23:30');
  assert.equal(l.arr, '2026-09-21T04:15');
  assert.ok(l.duration_min > 0, 'duration positive across midnight');
});

test('parseLegs: multi-leg with connection', async () => {
  const { parse } = makeParserPair();

  const text = 'ET309 NBO 0710 ADD 0905\nET612 ADD 1040 DXB 1510';
  const legs = parse(text, '2026-09-20');
  assert.equal(legs.length, 2);
  assert.equal(legs[0].flight_no, 'ET309');
  assert.equal(legs[0].from, 'NBO');
  assert.equal(legs[0].to, 'ADD');
  assert.equal(legs[1].flight_no, 'ET612');
  assert.equal(legs[1].from, 'ADD');
  assert.equal(legs[1].to, 'DXB');
});

test('parseLegs: tolerates colon in time and lowercase', async () => {
  const { parse } = makeParserPair();

  const legs = parse('kq100 nbo 09:45 lhr 15:30', '2026-09-20');
  assert.equal(legs.length, 1);
  assert.equal(legs[0].flight_no, 'KQ100');
  assert.equal(legs[0].dep, '2026-09-20T09:45');
  assert.equal(legs[0].arr, '2026-09-20T15:30');
});

test('parseLegs: blank lines and trailing whitespace ignored', async () => {
  const { parse } = makeParserPair();

  const text = '\n  KQ310 NBO 0945 DXB 1530  \n\n';
  const legs = parse(text, '2026-09-20');
  assert.equal(legs.length, 1);
});

test('legsToText: round-trips a single leg', async () => {
  const { parse, toText } = makeParserPair();

  const src = 'KQ310 NBO 0945 DXB 1530';
  const legs = parse(src, '2026-09-20');
  const back = toText(legs);
  // The round-trip need not be byte-identical but must re-parse identically
  const legs2 = parse(back, '2026-09-20');
  assert.equal(legs2.length, 1);
  assert.equal(legs2[0].flight_no, legs[0].flight_no);
  assert.equal(legs2[0].from, legs[0].from);
  assert.equal(legs2[0].to, legs[0].to);
});

test('legsToText: marks overnight legs with +1', async () => {
  const { parse, toText } = makeParserPair();

  const legs = parse('EK722 NBO 2330 DXB 0415 +1', '2026-09-20');
  const text = toText(legs);
  assert.ok(text.includes('+1'), 'overnight marker preserved in round-trip');
});


/* ══════════════════════════════════════════════════════════════════
   INTERNATIONAL PHONE
   A hardcoded +254 excludes every traveller who is not Kenyan. The
   dial code must be selectable, searchable, and the stored number must
   be E.164 regardless of how it was typed.
══════════════════════════════════════════════════════════════════════ */

test('phone field offers a country selector, not a baked-in code', async () => {
  const { doc } = await boot();
  const btn = doc.getElementById('fd-cc-btn');
  assert.ok(btn, 'country code control exists');
  assert.ok(doc.getElementById('fd-cc-sheet'), 'country picker sheet exists');
  // The old build hardcoded "+254 7…" as the placeholder.
  const num = doc.getElementById('fd-phone');
  assert.ok(!/\+254/.test(num.getAttribute('placeholder') || ''),
    'placeholder is a national number shape, not a fixed country code');
});

test('country picker searches by name, ISO and dial code', async () => {
  const { window, doc } = await boot();
  doc.getElementById('fd-cc-btn').dispatchEvent(new window.Event('click'));
  const input = doc.getElementById('fd-cc-in');

  input.value = 'nigeria';
  input.dispatchEvent(new window.Event('input'));
  let isos = [...doc.querySelectorAll('#fd-cc-list .fd-opt')].map((o) => o.dataset.iso);
  assert.ok(isos.includes('NG'), 'found by country name');

  input.value = '971';
  input.dispatchEvent(new window.Event('input'));
  isos = [...doc.querySelectorAll('#fd-cc-list .fd-opt')].map((o) => o.dataset.iso);
  assert.ok(isos.includes('AE'), 'found by dial code');

  input.value = 'gb';
  input.dispatchEvent(new window.Event('input'));
  isos = [...doc.querySelectorAll('#fd-cc-list .fd-opt')].map((o) => o.dataset.iso);
  assert.ok(isos.includes('GB'), 'found by ISO code');
});

test('choosing a country updates the code and the example format', async () => {
  const { window, doc } = await boot();
  doc.getElementById('fd-cc-btn').dispatchEvent(new window.Event('click'));
  const input = doc.getElementById('fd-cc-in');
  input.value = 'nigeria';
  input.dispatchEvent(new window.Event('input'));
  doc.querySelector('#fd-cc-list .fd-opt[data-iso="NG"]')
     .dispatchEvent(new window.Event('click', { bubbles: true }));

  assert.equal(doc.getElementById('fd-cc-dial').textContent, '+234');
  assert.match(doc.getElementById('fd-phone').getAttribute('placeholder'), /802/,
    'placeholder now shows a Nigerian number shape');
});

test('phone is stored as E.164 whatever the traveller types', async () => {
  const { window, doc } = await boot();
  const num = doc.getElementById('fd-phone');
  const full = () => window.CabanaFlights.fullPhone();

  // default country (Kenya in the test locale chain)
  num.value = '712345678';
  assert.match(full(), /^\+\d{6,}$/, 'assembled into E.164');

  // a leading trunk zero must not survive
  num.value = '0712 345678';
  assert.ok(!/\+\d+0712/.test(full()), 'trunk zero stripped, not doubled');

  // someone pasting a full international number keeps their own code
  num.value = '+44 7400 123456';
  assert.equal(full(), '+447400123456', 'existing country code respected');

  // punctuation and spaces are noise
  num.value = '(071) 234-5678';
  assert.ok(/^\+\d+$/.test(full()), 'only digits and one leading plus');
});

test('a phone number alone is enough to submit', async () => {
  const { window, doc } = await boot();
  doc.getElementById('fd-d-btn').dispatchEvent(new window.Event('click'));
  const ai = doc.getElementById('fd-sheet-in');
  ai.value = 'DXB'; ai.dispatchEvent(new window.Event('input'));
  doc.querySelector('#fd-sheet-list .fd-opt[data-iata="DXB"]')
     .dispatchEvent(new window.Event('click', { bubbles: true }));

  const dep = doc.getElementById('fd-depart');
  dep.value = '2026-09-20'; dep.dispatchEvent(new window.Event('change'));
  const ret = doc.getElementById('fd-return');
  ret.value = '2026-09-27'; ret.dispatchEvent(new window.Event('change'));
  doc.getElementById('fd-name').value = 'Test Traveller';
  doc.getElementById('fd-name').dispatchEvent(new window.Event('input'));

  const num = doc.getElementById('fd-phone');
  num.value = '712345678';
  num.dispatchEvent(new window.Event('input'));

  assert.equal(doc.getElementById('fd-submit').disabled, false,
    'phone alone satisfies the contact requirement');
});

test('the page does not lecture: hero copy stays short', async () => {
  const { doc } = await boot();
  const lede = doc.querySelector('.fd-lede');
  assert.ok(lede, 'lede exists');
  const words = lede.textContent.trim().split(/\s+/).length;
  assert.ok(words <= 20, `hero lede should be a line, not a paragraph (was ${words} words)`);
});

test('the take-off is never suppressed by arriving from the dashboard', async () => {
  const html = read('flights.html');
  assert.ok(!html.includes('via-dash'),
    'the dashboard hands straight over; there is no second transition to dodge');
  const dash = read('dashboard.html');
  assert.ok(dash.includes("if (key === 'flights') { safeGo(); return; }"),
    'dashboard skips its own scene for flights');
});

test('teardown: every jsdom window is closed', () => {
  // The status view runs a poll and a countdown on intervals. Left alive,
  // they hold the event loop open and the whole file times out even though
  // every assertion passed.
  closeAll();
  assert.equal(OPEN.length, 0);
});
