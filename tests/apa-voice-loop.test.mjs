import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../cabana-support.js', import.meta.url), 'utf8');

/* A browser with a controllable microphone, a recording speaker and a fake
   server, so the whole listen → send → speak → listen loop runs for real. */
async function boot({ speakStatus = 200 } = {}, t) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://cabana.africa/stays', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  const log = { sent: [], speak: [], played: 0, recogs: [], cues: 0, spoken: [] };

  class FakeRecognition {
    constructor() { this.started = false; log.recogs.push(this); }
    start() { this.started = true; }
    abort() { this.started = false; this.onend && this.onend(); }
    stop() { this.abort(); }
    hear(text) {
      this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
      this.started = false; this.onend();
    }
    silence() { this.onerror && this.onerror({ error: 'no-speech' }); this.started = false; this.onend(); }
  }
  w.SpeechRecognition = FakeRecognition;
  w.speechSynthesis = { getVoices: () => [], cancel() {}, speak(u) { log.spoken.push(u.text); u.onend && u.onend(); }, addEventListener() {} };
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.HTMLMediaElement.prototype.play = function () {
    if (!String(this.src).startsWith('data:')) { log.played++; setTimeout(() => this.onended && this.onended(), 0); }
    return Promise.resolve();
  };
  w.HTMLMediaElement.prototype.pause = function () {};
  w.URL.createObjectURL = () => 'blob:fake'; w.URL.revokeObjectURL = () => {};
  w.AudioContext = function () { return { state: 'running', currentTime: 0, resume() {}, destination: {}, createOscillator() { log.cues++; return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }, createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } }; };

  const replies = [];
  w.fetch = (url, init) => {
    const body = JSON.parse(init.body);
    if (body.op === 'speak') {
      log.speak.push(body.text);
      if (speakStatus !== 200) return Promise.resolve({ ok: false, status: speakStatus, blob: async () => null });
      return Promise.resolve({ ok: true, status: 200, blob: async () => ({ size: 4000 }) });
    }
    if (body.op === 'send') {
      log.sent.push(body);
      const r = replies.shift() || { reply: 'Okay.' };
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, threadId: 't1', status: 'apa', ...r }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, threadId: 't1', status: 'apa', messages: [], suggestions: [] }) });
  };
  w.eval(source);
  await new Promise(r => (w.document.getElementById('cbn-sup-root') ? r() : w.document.addEventListener('DOMContentLoaded', () => setTimeout(r, 20))));
  if (t) t.after(() => w.close());
  return { w, log, replies, flush: (ms = 10) => new Promise(r => setTimeout(r, ms)) };
}

test('one tap starts a conversation and the microphone is handed back after the spoken reply', async (t) => {
  const { w, log, replies, flush } = await boot({}, t);
  replies.push({
    reply: 'Karen has two good options 🏡. Want me to pull them up?',
    speech: { text: 'x', sentences: ['Karen has two good options.', 'Want me to pull them up?'], lang: 'en-GB', engine: 'neural' },
  });
  w.CabanaSupport.open();
  await flush(30);
  w.CabanaSupport.talk();
  await flush();
  assert.equal(log.recogs.length, 1, 'listening begins on the first tap');
  assert.ok(log.recogs[0].started);

  log.recogs[0].hear('find me a place in Karen');
  await flush(600);

  assert.equal(log.sent.length, 1);
  assert.equal(log.sent[0].voice, true, 'the server is told this is a voice turn');
  assert.deepEqual(log.speak, ['Karen has two good options.', 'Want me to pull them up?'], 'only the server-cleaned spoken form is synthesised');
  assert.equal(log.played, 2);
  assert.equal(log.recogs.length, 2, 'the microphone reopened by itself, no second tap');
  assert.ok(log.recogs[1].started);
  assert.ok(log.cues >= 2, 'a soft cue marks each time the mic opens');
});

test('silence is handled in stages: wait, a spoken nudge, then step back', async (t) => {
  const { w, log, flush } = await boot({}, t);
  w.CabanaSupport.open();
  await flush(30);
  w.CabanaSupport.talk();
  await flush();
  log.recogs[0].silence();
  await flush(300);
  assert.equal(log.recogs.length, 2, 'first silence: quietly listen again');
  log.recogs[1].silence();
  await flush(400);
  assert.ok(log.speak.some(t => /still there/i.test(t)) || log.spoken.some(t => /still there/i.test(t)), 'second silence: a gentle spoken nudge');
  const last = log.recogs[log.recogs.length - 1];
  assert.ok(last.started, 'and the microphone opens again after the nudge');
  last.silence();
  await flush(400);
  assert.equal(w.CabanaSupport.handsFree, false, 'third silence: voice conversation ends on its own');
});

test('a reply with end-of-conversation closes voice mode after it is spoken', async (t) => {
  const { w, log, replies, flush } = await boot({}, t);
  replies.push({ reply: 'Anytime.', end: true, speech: { sentences: ['Anytime.'], lang: 'en-GB', engine: 'neural' } });
  w.CabanaSupport.open();
  await flush(30);
  w.CabanaSupport.talk();
  await flush();
  log.recogs[0].hear('thanks that is great');
  await flush(500);
  assert.equal(log.played, 1);
  assert.equal(w.CabanaSupport.handsFree, false);
});

test('"that\'s all" ends the conversation locally without a model call', async (t) => {
  const { w, log, flush } = await boot({}, t);
  w.CabanaSupport.open();
  await flush(30);
  w.CabanaSupport.talk();
  await flush();
  log.recogs[0].hear("that's all");
  await flush(40);
  assert.equal(log.sent.length, 0);
  assert.equal(w.CabanaSupport.handsFree, false);
});

test('if the neural voice is down the device voice speaks and the loop still continues', async (t) => {
  const { w, log, replies, flush } = await boot({ speakStatus: 503 }, t);
  replies.push({ reply: 'Sure thing.', speech: { sentences: ['Sure thing.'], lang: 'en-GB', engine: 'neural' } });
  w.CabanaSupport.open();
  await flush(30);
  w.CabanaSupport.talk();
  await flush();
  log.recogs[0].hear('hello there');
  await flush(600);
  assert.deepEqual(log.spoken, ['Sure thing.']);
  assert.equal(log.recogs.length, 2, 'still hands the mic back');
});

test('replies without a server spoken form are cleaned before the device voice reads them', async (t) => {
  const { w, log, replies, flush } = await boot({ speakStatus: 503 }, t);
  replies.push({ reply: '**Done** 🎉 see [your trips](/my-bookings) — https://cabana.africa/x [[go:bookings]]' });
  w.CabanaSupport.open();
  await flush(30);
  w.CabanaSupport.talk();
  await flush();
  log.recogs[0].hear('book it');
  await flush(600);
  const said = log.spoken.join(' ');
  assert.doesNotMatch(said, /🎉|\*|https|\[|\]|—/);
  assert.match(said, /Done/);
});
