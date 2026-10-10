/*
 * APA VOICE TEXT  (api/lib/_apa-voice.js)
 *
 * A written reply is not a spoken one. Chat text carries emoji, markdown,
 * links, routing directives, currency codes and typographic punctuation
 * that a speech engine either reads aloud ("smiling face with open mouth")
 * or stumbles over. This module turns a reply into something a person would
 * actually say, and cuts it into short sentences so the first one can start
 * playing while the rest are still being synthesised.
 *
 * Pure functions. The server is the single source of truth: it returns the
 * spoken form with every reply, and re-applies the same cleaning on the
 * speak endpoint so a hand-crafted request cannot make APA read out junk.
 */

/* Everything a pictograph can be made of: emoji, ZWJ sequences, skin tones,
   keycaps, flags, variation selectors, symbols and dingbats. */
const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}\u200d\u20e3\ufe0e\ufe0f\u{E0020}-\u{E007F}]/gu;

const CURRENCY = [
  [/\b(?:KES|KSh|Ksh|KSH|Kshs?)\.?\s?(\d[\d,]*(?:\.\d+)?)\b/g, '$1 Kenyan shillings'],
  [/\b(?:UGX|USh)\.?\s?(\d[\d,]*(?:\.\d+)?)\b/g, '$1 Ugandan shillings'],
  [/\b(?:TZS|TSh)\.?\s?(\d[\d,]*(?:\.\d+)?)\b/g, '$1 Tanzanian shillings'],
  [/\b(?:NGN)\.?\s?(\d[\d,]*(?:\.\d+)?)\b|₦\s?(\d[\d,]*(?:\.\d+)?)/g, (_m, a, b) => `${a || b} naira`],
  [/\b(?:GHS)\.?\s?(\d[\d,]*(?:\.\d+)?)\b|₵\s?(\d[\d,]*(?:\.\d+)?)/g, (_m, a, b) => `${a || b} cedis`],
  [/\b(?:ZAR)\.?\s?(\d[\d,]*(?:\.\d+)?)\b|\bR\s?(\d[\d,]*(?:\.\d+)?)\b(?=\s|[.,!?]|$)/g, (_m, a, b) => `${a || b} rand`],
  [/\b(?:USD|US\$)\.?\s?(\d[\d,]*(?:\.\d+)?)\b|\$\s?(\d[\d,]*(?:\.\d+)?)/g, (_m, a, b) => `${a || b} US dollars`],
  [/\b(?:EUR)\.?\s?(\d[\d,]*(?:\.\d+)?)\b|€\s?(\d[\d,]*(?:\.\d+)?)/g, (_m, a, b) => `${a || b} euros`],
  [/\b(?:GBP)\.?\s?(\d[\d,]*(?:\.\d+)?)\b|£\s?(\d[\d,]*(?:\.\d+)?)/g, (_m, a, b) => `${a || b} pounds`],
];

const ABBREVIATIONS = [
  [/\be\.g\.,?/gi, 'for example,'],
  [/\bi\.e\.,?/gi, 'that is,'],
  [/\betc\.?/gi, 'and so on'],
  [/\bvs\.?\b/gi, 'versus'],
  [/\bapprox\.?/gi, 'approximately'],
  [/\bw\/o\b/gi, 'without'],
  [/\bw\/\s/gi, 'with '],
  [/\b24\s?\/\s?7\b/g, 'twenty four seven'],
  [/\b(\d+)\s?(?:bd|br)\b/gi, '$1 bedroom'],
  [/\bm-pesa\b/gi, 'M-Pesa'],
  [/\bwi-?fi\b/gi, 'wifi'],
  [/\bA\/C\b/g, 'air conditioning'],
  [/\bB&B\b/gi, 'B and B'],
  [/\bSUV\b/g, 'S U V'],
  [/\bATM\b/g, 'A T M'],
  [/\bFAQ\b/g, 'F A Q'],
  [/\bID\b/g, 'I D'],
  [/\bKES\b/g, 'Kenyan shillings'],
];

export function toSpokenText(input, { max = 1200 } = {}) {
  let s = String(input == null ? '' : input).normalize('NFKC');

  /* chain-of-thought and routing directives never reach a speaker */
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, ' ');
  s = s.replace(/\[\[[^\]]*\]\]/g, ' ');

  /* markdown → plain */
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  s = s.replace(/\[([^\]]{1,120})\]\([^)]*\)/g, '$1');
  s = s.replace(/https?:\/\/\S+/gi, ' ');
  s = s.replace(/\bwww\.\S+/gi, ' ');
  s = s.replace(/(^|\s)\/[a-z][a-z0-9\-/_.?=&%]*/gi, '$1');
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  s = s.replace(/^\s*(?:[-*•·▪◦‣]|\d{1,2}[.)])\s+/gm, '');
  s = s.replace(/[*_~`>|]+/g, ' ');

  /* pictographs */
  s = s.replace(EMOJI, ' ');

  /* money and shorthand, before punctuation is flattened */
  for (const [re, to] of CURRENCY) s = s.replace(re, to);
  for (const [re, to] of ABBREVIATIONS) s = s.replace(re, to);
  s = s.replace(/(\d)\s?%/g, '$1 percent');
  s = s.replace(/\s&\s/g, ' and ');
  s = s.replace(/\+(\d)/g, 'plus $1');
  s = s.replace(/~\s?(\d)/g, 'about $1');
  s = s.replace(/(\d)\s?[–—-]\s?(\d)/g, '$1 to $2');
  s = s.replace(/(\d)\s?[x×]\s?(\d)/g, '$1 by $2');
  s = s.replace(/(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/gi, (_m, h, mn, ap) =>
    `${h}${mn && mn !== '00' ? ' ' + mn : ''} ${ap.toLowerCase() === 'am' ? 'A M' : 'P M'}`);

  /* typographic punctuation → plain pauses, nothing read aloud */
  s = s.replace(/[→←↑↓⇒⇐➜➔➤▶►»«]+/g, ', ');
  s = s.replace(/[–—―]+/g, ', ');
  s = s.replace(/\s-\s/g, ', ');
  s = s.replace(/[…]+|\.{2,}/g, '. ');
  s = s.replace(/[“”„‟"]/g, '');
  s = s.replace(/[‘’‚‛]/g, "'");
  s = s.replace(/[(){}\[\]<>]/g, ', ');
  s = s.replace(/[•·●○■□◆◇★☆✓✔✗✘✦✧※§¶†‡°^=\\#@]+/g, ' ');
  s = s.replace(/\//g, ' or ');
  s = s.replace(/;/g, ',');
  s = s.replace(/[!?]{2,}/g, m => m[0]);
  s = s.replace(/([!?.,:])\1+/g, '$1');
  s = s.replace(/\s*,\s*(?=[.!?])/g, '');
  s = s.replace(/(?:\s*,){2,}/g, ',');
  s = s.replace(/\s+([.,!?:])/g, '$1');
  s = s.replace(/^[\s,.:;]+/, '');
  s = s.replace(/\s+/g, ' ').trim();

  if (s.length > max) {
    const cut = s.slice(0, max);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    s = (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '.').trim();
  }
  return s;
}

/* Short enough that the first chunk is synthesised quickly, long enough
   that Aura keeps its natural phrasing across a sentence. */
export function splitSentences(text, { first = 150, rest = 230 } = {}) {
  const s = String(text || '').trim();
  if (!s) return [];
  const raw = s.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).map(x => x.trim()).filter(Boolean);
  const out = [];
  for (const piece of raw) {
    const limit = out.length === 0 ? first : rest;
    if (piece.length <= limit) { out.push(piece); continue; }
    /* a very long sentence is cut at its commas */
    let buf = '';
    for (const part of piece.split(/(?<=,)\s+/)) {
      if (buf && (buf + ' ' + part).length > limit) { out.push(buf.trim()); buf = part; }
      else buf = buf ? buf + ' ' + part : part;
    }
    if (buf) out.push(buf.trim());
  }
  /* fold a tiny trailing fragment ("Ok.") into its neighbour */
  const merged = [];
  for (const piece of out) {
    if (merged.length && piece.length < 18 && (merged[merged.length - 1] + ' ' + piece).length <= rest) {
      merged[merged.length - 1] += ' ' + piece;
    } else merged.push(piece);
  }
  if (merged.length > 1 && merged[0].length < 14) merged.splice(0, 2, merged[0] + ' ' + merged[1]);
  return merged.slice(0, 8);
}

const SW = new Set('na ya wa kwa ni la katika sana habari karibu asante pole tafadhali nafasi nyumba chumba unataka naomba sawa hakuna kuna ndio hapana nini wapi gani yako yangu wewe mimi sisi ninaweza tunaweza kutafuta safari malazi bei usiku siku mwezi pesa lipa malipo tafuta nyumbani rafiki mambo vipi poa sasa pia lakini kama ili hii huu hiki kule hapa'.split(' '));
const FR = new Set('le la les des est une un pour vous je nous avec merci bonjour appartement chambre cherche voudrais besoin oui non quel quelle où comment prix nuit réservation sont dans sur pas que qui mais très bien'.split(' '));
const ES = new Set('el los las una para usted yo nosotros con gracias hola apartamento habitación busco quiero necesito sí qué dónde cómo precio noche reserva son en por pero muy bien'.split(' '));

export function detectSpeechLang(text) {
  const words = String(text || '').toLowerCase().normalize('NFKC').split(/[^\p{L}']+/u).filter(Boolean);
  if (words.length < 3) return 'en';
  const share = (set) => words.filter(w => set.has(w)).length / words.length;
  const sw = share(SW), fr = share(FR), es = share(ES);
  const best = Math.max(sw, fr, es);
  if (best < 0.16) return 'en';
  if (best === sw) return 'sw';
  if (best === fr) return 'fr';
  return 'es';
}

const BROWSER_LANG = { sw: 'sw-KE', fr: 'fr-FR', es: 'es-ES', en: 'en-GB' };

/* What the client needs to speak a reply. */
export function speechPayload(reply) {
  const text = toSpokenText(reply);
  if (!text) return null;
  const lang = detectSpeechLang(text);
  return {
    text,
    sentences: splitSentences(text),
    lang: BROWSER_LANG[lang] || 'en-GB',
    /* Aura-2 speaks English well and nothing else on this plan; other
       languages go to the best on-device voice rather than being mangled. */
    engine: lang === 'en' ? 'neural' : 'device',
  };
}
