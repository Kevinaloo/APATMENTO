import test from 'node:test';
import assert from 'node:assert/strict';
import { toSpokenText, splitSentences, detectSpeechLang, speechPayload } from '../api/lib/_apa-voice.js';

test('emoji, flags and pictographs are never spoken', () => {
  const out = toSpokenText('Hey 👋 Karen has two good options 🏡✨ 🇰🇪 👨‍👩‍👧 1️⃣ done ✅');
  assert.equal(out, 'Hey Karen has two good options 1 done');
  assert.doesNotMatch(out, /\p{Extended_Pictographic}/u);
});

test('markdown, links and routing directives disappear but link text stays', () => {
  const out = toSpokenText('**Great pick.** See [this stay](/apartments.html?area=Karen) or https://cabana.africa/x now.\n- one\n- two\n[[go:stays?area=Karen]] [[chips:A|B]]');
  assert.equal(out, 'Great pick. See this stay or now. one two');
});

test('punctuation noise is flattened rather than read out', () => {
  assert.equal(toSpokenText('Wait... really?!! Yes — it is (almost) free; honestly -> great!!!'), 'Wait. really? Yes, it is, almost, free, honestly, great!');
  assert.doesNotMatch(toSpokenText('a • b · c … d # e @ f'), /[•·…#@]/);
});

test('money and shorthand are said the way people say them', () => {
  assert.equal(toSpokenText('KES 12,000 per night, about 5% off'), '12,000 Kenyan shillings per night, about 5 percent off');
  assert.match(toSpokenText('From $50 or USD 80'), /50 US dollars or 80 US dollars/);
  assert.match(toSpokenText('Support is 24/7, e.g. via chat'), /twenty four seven, for example, via chat/);
  assert.match(toSpokenText('Check-in 2pm, 3-5 guests'), /2 P M, 3 to 5 guests/);
  assert.equal(toSpokenText('Pay by M-Pesa & card'), 'Pay by M-Pesa and card');
});

test('chain of thought never reaches a speaker', () => {
  assert.equal(toSpokenText('<think>secret plan</think>Hello there.'), 'Hello there.');
});

test('a long reply is cut at a sentence boundary under the cap', () => {
  const long = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
  const out = toSpokenText(long, { max: 300 });
  assert.ok(out.length <= 300);
  assert.match(out, /\.$/);
});

test('sentences are short, ordered, and the first one is small enough to start quickly', () => {
  const parts = splitSentences('Karen is quiet and leafy. It has great coffee, good schools, a lively market on weekends, and plenty of furnished places with fast wifi and secure parking for guests. Want me to pull up what is live? Ok.');
  assert.ok(parts.length >= 2);
  assert.ok(parts[0].length <= 150);
  assert.ok(parts.every(p => p.length <= 240));
  assert.ok(!parts.includes('Ok.'));
  assert.equal(parts.join(' ').replace(/\s+/g, ' ').includes('Want me to pull up'), true);
  assert.deepEqual(splitSentences(''), []);
});

test('language is detected so non English never goes to an English voice', () => {
  assert.equal(detectSpeechLang('Karen has two good options for you this weekend'), 'en');
  assert.equal(detectSpeechLang('Habari, karibu sana. Unataka nyumba ya vyumba viwili na bei gani?'), 'sw');
  assert.equal(detectSpeechLang('Bonjour, je voudrais un appartement pour deux nuits avec vous'), 'fr');
  assert.equal(speechPayload('Habari, karibu sana. Unataka nyumba ya vyumba viwili?').engine, 'device');
  assert.equal(speechPayload('Hello! Welcome 👋').engine, 'neural');
  assert.equal(speechPayload('👋✨'), null);
});
