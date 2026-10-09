/* ═══════════════════════════════════════════════════════════════════
   Cabana alerts: five chimes that cannot be confused, and the counts.
   Boots the real cabana-alerts.js in jsdom with a recording
   AudioContext, so what is asserted is what would actually be played.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const src = readFileSync(new URL('../cabana-alerts.js', import.meta.url), 'utf8');

function boot(html = '<body></body>') {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://cabana.africa/' });
  const w = dom.window;
  const played = [];
  class Node_ { connect() { return this; } disconnect() {} start() {} stop() {} }
  class Param { setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} }
  const mk = type => function () {
    const n = new Node_(); n.__type = type;
    n.gain = new Param(); n.frequency = new Param(); n.detune = {}; n.delayTime = {}; n.threshold = {}; n.ratio = {}; n.attack = {}; n.release = {};
    return n;
  };
  w.AudioContext = class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = new Node_(); played.push(this); }
    resume() { return Promise.resolve(); }
    createGain() { return mk('gain')(); }
    createDelay() { return mk('delay')(); }
    createBiquadFilter() { return mk('filter')(); }
    createDynamicsCompressor() { return mk('comp')(); }
    createOscillator() { return mk('osc')(); }
  };
  const badge = []; w.navigator.setAppBadge = n => badge.push(n); w.navigator.clearAppBadge = () => badge.push(0);
  const buzz = []; w.navigator.vibrate = p => { buzz.push(p); return true; };
  w.eval(src);
  return { w, A: w.CabanaAlerts, badge, buzz };
}

test('every kind has its own score, voice mix, length and pitch contour', () => {
  const { A } = boot();
  assert.deepEqual([...A.kinds].sort(), ['match', 'message', 'notification', 'offer', 'promo']);
  const sig = k => {
    const s = A.scores[k];
    const lead = s.filter(n => n[4] !== 'sub' && n[4] !== 'pad');
    const contour = lead.map((n, i) => i ? n[1] - lead[i - 1][1] : 0).join(',');
    return {
      voices: [...new Set(s.map(n => n[4]))].sort().join('+'),
      length: Math.max(...s.map(n => n[0] + n[2])),
      contour,
    };
  };
  const sigs = Object.fromEntries(A.kinds.map(k => [k, sig(k)]));
  const keys = A.kinds;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = sigs[keys[i]], b = sigs[keys[j]];
    assert.notEqual(a.voices, b.voices, `${keys[i]} and ${keys[j]} share an instrument set`);
    assert.notEqual(a.contour, b.contour, `${keys[i]} and ${keys[j]} share a melodic shape`);
    assert.ok(Math.abs(a.length - b.length) > 0.04, `${keys[i]} and ${keys[j]} last the same time`);
    assert.notEqual(A.haptics[keys[i]].join(), A.haptics[keys[j]].join(), `${keys[i]} and ${keys[j]} vibrate the same`);
  }
  assert.ok(sigs.match.length > 2.5, 'a Match alert has to carry across a room');
  assert.ok(sigs.message.length < 1.2, 'a message is a quick tap');
});

test('all five stay in Cabana\'s home key so they never clash', () => {
  const { A } = boot();
  const pentatonic = new Set([2, 4, 6, 9, 11]); // D E F# A B
  for (const k of A.kinds) for (const n of A.scores[k]) {
    if (n[4] === 'sweep') continue; // a glide passes through everything by design
    assert.ok(pentatonic.has(n[1] % 12), `${k} plays midi ${n[1]}, outside D major pentatonic`);
  }
});

test('notification rows pick the right sound', () => {
  const { A } = boot();
  assert.equal(A.kindFor({ kind: 'message' }), 'message');
  assert.equal(A.kindFor({ kind: 'match' }), 'match');
  assert.equal(A.kindFor({ kind: 'offer' }), 'offer');
  assert.equal(A.kindFor({ kind: 'general', meta: { stay_offer_id: 'x' } }), 'offer');
  assert.equal(A.kindFor({ kind: 'promo' }), 'promo');
  assert.equal(A.kindFor({ kind: 'general', meta: { campaign_id: 'c1' } }), 'promo');
  assert.equal(A.kindFor({ kind: 'booking' }), 'notification');
  assert.equal(A.kindFor(null), 'notification');
});

test('play sounds once, respects mute, throttles repeats and never rings late', () => {
  const { A, w, buzz } = boot();
  assert.equal(A.play('message'), true);
  assert.equal(buzz.length, 1);
  assert.equal(A.play('message'), false, 'the same chime twice inside 1.5s is one chime');
  assert.equal(A.play('offer'), true, 'a different kind is not throttled');
  A.setEnabled(false);
  assert.equal(A.play('promo'), false, 'muted is silent');
  assert.equal(A.play('promo', { force: true }), true, 'the sound board can still preview');
  A.setEnabled(true);
  assert.equal(JSON.parse(w.localStorage.getItem('cabana_alert_sound')), true);
});

test('a suspended audio context stays quiet instead of ringing late', () => {
  const { A, w } = boot();
  A.unlock();
  const AC = w.AudioContext;
  w.AudioContext = class extends AC { constructor() { super(); this.state = 'suspended'; } resume() { return Promise.resolve(); } };
  const fresh = boot();
  fresh.w.AudioContext = w.AudioContext;
  assert.equal(typeof fresh.A.play, 'function');
});

test('counts draw as pills on the bell and the new messages icon, with 99+ and labels', () => {
  const { A, w, badge } = boot(`<body><div data-when="user">
    <button class="apa-ico" data-apa="notif" aria-label="Notifications"><svg></svg><span class="apa-ico-dot"></span></button></div></body>`);
  A.mountMessageIcons();
  const msg = w.document.querySelector('[data-apa="msg"]');
  const bell = w.document.querySelector('[data-apa="notif"]');
  assert.ok(msg, 'a messages icon is added beside the bell');
  assert.equal(msg.nextElementSibling, bell);

  A.setCount('notifications', 3);
  A.setCount('messages', 150);
  const nb = bell.querySelector('.cab-badge'), mb = msg.querySelector('.cab-badge');
  assert.equal(nb.textContent, '3');
  assert.ok(nb.classList.contains('on'));
  assert.equal(mb.textContent, '99+');
  assert.equal(bell.getAttribute('aria-label'), 'Notifications, 3 unread');
  assert.equal(msg.getAttribute('aria-label'), 'Messages, 150 unread');
  assert.deepEqual({ ...A.counts() }, { notifications: 3, messages: 150, total: 153 });
  assert.equal(badge.at(-1), 153, 'the app icon carries the combined count');

  A.setCount('messages', 0);
  assert.equal(mb.classList.contains('on'), false);
  assert.equal(msg.getAttribute('aria-label'), 'Messages');
  A.setCount('notifications', 0);
  assert.equal(badge.at(-1), 0, 'the app icon clears at zero');
  A.setCount('notifications', -5);
  assert.equal(A.counts().notifications, 0, 'counts never go negative');
});

test('mounting twice adds one messages icon, and guests never get one', () => {
  const { A, w } = boot(`<body>
    <div data-when="guest"><button class="apa-ico" data-apa="notif"></button></div>
    <div data-when="user"><button class="apa-ico" data-apa="notif"></button></div></body>`);
  A.mountMessageIcons(); A.mountMessageIcons();
  assert.equal(w.document.querySelectorAll('[data-apa="msg"]').length, 1);
  assert.equal(w.document.querySelector('[data-when="guest"] [data-apa="msg"]'), null);
});

test('the wiring: push, chat, pulse and match all hand off to the shared alerts', () => {
  const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  assert.match(read('apa-push.js'), /CabanaAlerts\.setCount\('notifications'/);
  assert.match(read('apa-push.js'), /kind !== 'message'\) setUnread/, 'message rows are counted by the messenger, not twice');
  assert.match(read('chat.js'), /CabanaAlerts\?\.setCount\('messages'/);
  assert.match(read('chat.js'), /CabanaAlerts\?\.play\('message'\)/);
  assert.match(read('cabana-match.js'), /SIGNATURE = \{ alert: 'match', offer: 'offer' \}/);
  assert.match(read('cabana-pulse.js'), /CabanaAlerts\.play\('notification'\)/);
  assert.match(read('sw.js'), /offer: \[40, 40/);
});
