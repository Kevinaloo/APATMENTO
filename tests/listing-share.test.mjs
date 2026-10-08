/* Listing share links: the /s/<id> preview route, the QR encoder behind
   the share sheet, the button markup every listing surface uses, and the
   3D tour's exact-view token on its way into the viewer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import shareHandler from '../api/lib/_listing-share.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SHARE_JS = read('cabana-share.js');
const TOUR_JS = read('cabana-property-tour.js');
const JETS = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
const TOKEN = 'living~1.25~3.4~-26~-4~w~17.5~20261012';
const PHOTO = 'https://ref.supabase.co/storage/v1/object/public/listings/a/1.jpg';

function browser(script, html = '') {
  /* jsdom has no canvas; the encoder must still work without one. */
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM('<!doctype html><body>' + html + '</body>', { url: 'https://cabana.africa/apartments', runScripts: 'outside-only', virtualConsole });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  dom.window.eval(script);
  return dom;
}

/* ── the /s/<id> route ─────────────────────────────────────────── */

function fakeRes() {
  const res = { statusCode: 0, headers: {}, body: '' };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = code => { res.statusCode = code; return res; };
  res.send = body => { res.body = String(body); return res; };
  return res;
}
async function route(query, rows) {
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, srv: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://db.example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async u => {
    if (rows instanceof Error) throw rows;
    if (String(u).includes('/rpc/')) return new Response('[]', { status: 200 });
    return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const res = fakeRes();
    await shareHandler({ method: 'GET', query }, res);
    return res;
  } finally {
    globalThis.fetch = saved.fetch;
    for (const [k, v] of [['SUPABASE_URL', saved.url], ['SUPABASE_ANON_KEY', saved.key], ['SUPABASE_SERVICE_ROLE_KEY', saved.srv]]) {
      if (v == null) delete process.env[k]; else process.env[k] = v;
    }
  }
}
const meta = (html, prop) => {
  const m = html.match(new RegExp('<meta property="' + prop.replace(/[:]/g, '\\$&') + '" content="([^"]*)"'));
  return m && m[1];
};
const stay = extra => ({
  id: JETS, title: 'The Jets Nest', service: 'stays', area: 'Obama estate', city: 'Nairobi',
  price_night: 1500, currency: 'KES', photos: [PHOTO], ...extra,
});

test('a shared link previews with the listing\'s own landscape photo, then opens the listing', async () => {
  const res = await route({ id: JETS }, [stay()]);
  assert.equal(res.statusCode, 200);
  assert.equal(meta(res.body, 'og:title'), 'The Jets Nest · Obama estate, Nairobi');
  assert.equal(meta(res.body, 'og:image'),
    'https://ref.supabase.co/storage/v1/render/image/public/listings/a/1.jpg?width=1200&amp;height=630&amp;resize=cover&amp;quality=80');
  assert.ok(res.body.includes('location.replace("https://cabana.africa/apartments?open=' + JETS + '&utm_source=share&utm_medium=link")'));
});

test('a shared 3D view carries its token to the stays page and says so in the preview', async () => {
  const res = await route({ id: JETS, tour: TOKEN }, [stay()]);
  assert.equal(meta(res.body, 'og:title'), 'Step inside The Jets Nest in 3D');
  assert.match(meta(res.body, 'og:description'), /^Cabana 3D tour · /);
  assert.ok(res.body.includes('apartments?open=' + JETS + '&tour=' + TOKEN));
  const bad = await route({ id: JETS, tour: '"><script>alert(1)</script>' }, [stay()]);
  assert.doesNotMatch(bad.body, /tour=/);
  assert.doesNotMatch(bad.body, /<script>alert/);
  const room = await route({ id: JETS, tour: TOKEN }, [stay({ service: 'roommates' })]);
  assert.doesNotMatch(room.body, /tour=/, 'only a stay has a 3D tour');
});

test('unknown ids and database failures still land the guest on Cabana, with host text escaped', async () => {
  for (const rows of [[], new Error('offline')]) {
    const res = await route({ id: JETS }, rows);
    assert.equal(res.statusCode, 200);
    assert.equal(meta(res.body, 'og:title'), 'Cabana');
  }
  const evil = await route({ id: JETS }, [stay({ title: '"><script>alert(1)</script>', photos: ['javascript:alert(1)'] })]);
  assert.doesNotMatch(evil.body, /<script>alert/);
  assert.equal(evil.body.match(/<script/g).length, 1, 'exactly one script element: ours');
});

test('the route is reachable: /s/:id rewrites onto utilities', () => {
  const config = JSON.parse(read('vercel.json'));
  const hit = config.rewrites.filter(r => r.source.startsWith('/s/:id'));
  assert.equal(hit.length, 1, 'one rewrite owns /s/<id>');
  assert.equal(hit[0].destination, '/api/utilities?action=listing-share&id=:id');
});

/* ── the QR encoder ────────────────────────────────────────────── */

/* Reference symbols from segno 1.6.6, an independent encoder, at ECC
   level M with the mask fixed. Modules row by row, packed MSB first,
   base64. segno appends a whole zero byte when the bit stream is already
   byte-aligned (ISO/IEC 18004 7.4.10 pads only to the boundary), so the
   vectors were made with that one function set to the standard rule.
   [text, version, mask, modules] */
const VECTORS = [
["Cabana", 1, 3, "/uP8FlBuhrt1xdumLsERB/qv4BAAt2JbLkloi+e5WJ7lSABSJ/uakFvNuhJ91SCurRkENR/pkgA="],
["Nyumba ya Jets, Nairobi", 2, 4, "/oe/wRcQboyLt1bV26sq7BcxB/qq/gG3AIvIfMJWjpWjdIimKEEvlyVkGXg/HcgYFdfj8PsAZ8R/rysQRhFbqI+90xMO6YPNBFQO/t97gA=="],
["https://cabana.africa/s/65ef1d11-a4e3-4250-bbac-f826c0cd10d2", 4, 5, "/kpuP8F7dlBuq0FLt1UdtdujFdLsEBIFB/qqqv4B4jcAgv3A5wjYyYcZ4ksSyqd2U+cm8R4FidmrH7h1iZ1SDDSl349j3KTT3JNMgkz97SNQdeHy1YnGySvecm+1Ei0bGAXMz6ep/ABEzkX/ieHqkEgHMfui3q/F05iO/umUZ28EHHK0/pPq1QA="],
["https://cabana.africa/s/7dc4e517-9a16-4e77-badd-689bce486882?tour=bedroom~2.1~-0.6~140~-2~w~7~20261225", 6, 0, "/jkTcz/BUO7YkG6KQk6Lt0dLA3Xbr5XRmuwSPa7NB/qqqqr+ADju/gCqAnzsiRyfUmZbXOeoMpqgA1yN2zQj5MdzUePww1GFj8diEOoIop3fYPo3dM0x+D0DZVBJs1OZGqqGYZuWkvFxf9tMTC41d438VzsoZuA63L6jB5RETbWmOiZmGMOcmDEItQMJnpgntPXmf0vs3IIhjhs8EiJ+qTb4ncmXxu7V/IBy83NH/4DLq2rwQmyI8aup2m5P3dFLNz5e6kkImmcEuL/5av6z39z9gA=="],
["Karibu Cabana! Karibu Cabana! Karibu Cabana! Karibu Cabana! Karibu Cabana! Karibu Cabana! Karibu Cabana! Karibu Cabana! ", 7, 6, "/vjfbsv8FdVejpButUzw9Lt028F3tdurpv+zrsEphEdBB/qqqqqv4AgBHTEAn4Rf7CS/ZgFT9/ECxdo3PU/6/U2NeXdwr9u9KTwIzztvGVw697V+Ewr1xkVMomM/ppNO6lsaG272zDU/8asg/rvT39z9BvrE+SxdBH98UWvXqnOq6RYlGNcXr4B/q9+XJP8Xdsn3hA2fUkFSNe9kYdO6VYJJfF7/aOG+75hqRfd6p4RnfS6dk05yLEUSrJPH89UC0olHX5bzNQ0NY3msRfq7+QBi3FdEX/sYK/UqEFyXFkUdusWPpJ/N15ZW24rujcF/cisEumDS9f/rzjrk+AA="],
["Asante sana. Ünïcødé ✓ Asante sana. Ünïcødé ✓ Asante sana. Ünïcødé ✓ Asante sana. Ünïcødé ✓ Asante sana. Ünïcødé ✓ Asante sana. Ünïcødé ✓ Asante sana. Ünïcødé ✓ end", 10, 2, "/hhHr9q/P8EpwzgxgJBuqWhXMG3Lt15tggPFpduqJ3P4JZLsFOcnE7kxB/qqqqqqqv4BtXHGi5sAvh6EPrAgPnR8mEL2SNWcpA74mrmtP5rR3kkag3+/oyl3YLYFiWRrs31+ET918JBiGs2L1Er5jpm51uXqAxqig8Tk3gcqdKaX0FjCe8eqvRNj2XjmMRGtfyY0asZhy92N+a8f1e2hriGq9Dg5h6GmR0ndW3tgLvhcJbrRQGcOQOKf97/v+ti+vRL2jEy1UcyqBwK43Xqex8otEsVEUX56wfmMf+9A+VohQ1/sC68X2l45cjZ9zHL1IvUDgut0Acm3dJqWVCa5tQjiBimvgAHiRRIZLmaCFw2JwnmqmzZxonNQk2pkb28GXXZq2C5ea9w3t21nzpVbBjHDG71BEmiZpugnCwPpgimH6JYSNrNHKpu0LJmkeIPx8PEhglrpA+niPkCw+gBxItFa+kV/kRZq+6nrkFRKFGp1sdupoS/qBF/d1TCL4qSWouoqmIetvAkEpEoci1as/r1KTc3WsQA="],
["https://cabana.africa/apartments?open=65ef1d11-a4e3-4250-bbac-f826c0cd10d2", 5, 7, "/hLJs/wS5XzQbpIQLrt0w2Zl26GsN67BYvoZB/qqqq/gBVPgAJaUVf0FCzrmelGHKyKWkgIL/4Ft7UXlpKEqV5c5YbwG4oc87hJPHj4Ce68N6z7c5mI6/nkw7DLkKjjeqXamRmes/uNomG6HOrkC4ygHcksmfIJY456AYZqLIr78PDGPePoAUBKcb/nSqGswXc+lH7pi92/N1O1yDq6dRqh3BIF/ko/pdsyFgA=="],
["Cabana stays, rooms, tours and tables across Africa. Cabana stays, rooms, tours and tables across Africa. Cabana stays, rooms, tours and tab", 8, 1, "/pDz76y/wRGpobvQbq3mPMVrt0Cqyg6l26Bf/iOC7BehsRExB/qqqqqq/gASjFEAAKNnJ/+MEpguOK6iokHSfvZ3Jq8qYJ0xMatrnc7qspvkCfwiaITfTFd/d2qwdD0BMjvCxZamyAm2PfDGbIxcsUqQAVa5CMC9/W2BPhBMibTNBfmzrupNvs3/x2fj8ZmMcRUbiolGqLqoJEvLGmZEa+fS/BF/MZHKQRM3iyyoubjXGEfKDeItEl1PpPBw69qZw0kfePqvt/6P8EZ36YaACNzyVe9zbygRq02/PLxtNTCqllgp8AlugIUeLGXgNJLgAfB5Ezjjdvfu2fyAfPsaqsR/vuavdypwR8dHkdE7oKn+3f/d0vTUbiZC6oHe5xOlBBa4ETMg/oeSqu5cgA=="],
];
function unpack(b64, n) {
  const bytes = Buffer.from(b64, 'base64');
  const rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) { const i = y * n + x; row += (bytes[i >> 3] >> (7 - (i & 7))) & 1; }
    rows.push(row);
  }
  return rows;
}

test('QR symbols match an independent encoder module for module (versions 1, 2, 4, 5, 6, 7, 8, 10)', () => {
  const qr = browser(SHARE_JS).window.CabanaShare.qr;
  for (const [text, version, mask, bits] of VECTORS) {
    const code = qr.encode(text, { mask });
    assert.equal(code.version, version, text);
    assert.equal(code.mask, mask);
    assert.deepEqual(Array.from(code.modules, r => Array.from(r).join('')), unpack(bits, version * 4 + 17), text.slice(0, 30));
  }
});

/* A decoder written here, separately from the encoder: format bits by
   nearest valid codeword, its own map of function patterns, Reed–Solomon
   syndromes over log/antilog tables, then the byte-mode payload. */
const GF_EXP = [], GF_LOG = [];
for (let i = 0, x = 1; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
const M_TABLE = { 1: [10, 1], 2: [16, 1], 3: [26, 1], 4: [18, 2], 5: [24, 2], 6: [16, 4], 7: [18, 4], 8: [22, 4], 9: [22, 5], 10: [26, 5] };
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
function formatWord(mask) {
  let rem = mask;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  return ((mask << 10) | rem) ^ 0x5412;
}
function decodeSymbol(m) {
  const n = m.length, v = (n - 17) / 4;
  const at = (x, y) => Number(m[y][x]);
  let fmt = 0;
  const read = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  read.forEach(([x, y], i) => { fmt |= at(x, y) << i; });
  const dist = w => { let d = 0, z = w ^ fmt; while (z) { d += z & 1; z >>= 1; } return d; };
  const mask = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => dist(formatWord(a)) - dist(formatWord(b)))[0];
  assert.equal(dist(formatWord(mask)), 0, 'format information is an exact level-M codeword');

  const fn = (x, y) => {
    if ((x < 9 && y < 9) || (x >= n - 8 && y < 9) || (x < 9 && y >= n - 8)) return true;
    if (x === 6 || y === 6) return true;
    if (v >= 7 && ((x >= n - 11 && x < n - 8 && y < 6) || (y >= n - 11 && y < n - 8 && x < 6))) return true;
    const a = ALIGN[v];
    for (const cx of a) for (const cy of a) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === a.at(-1)) || (cx === a.at(-1) && cy === 6)) continue;
      if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) return true;
    }
    return false;
  };
  const cond = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0][mask];
  const bits = [];
  let up = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < n; k++) {
      const y = up ? n - 1 - k : k;
      for (const x of [col, col - 1]) if (!fn(x, y)) bits.push(at(x, y) ^ (cond(x, y) ? 1 : 0));
    }
    up = !up;
  }
  const words = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  const [ecc, nb] = M_TABLE[v], total = words.length;
  const shortLen = Math.floor(total / nb), nShort = nb - total % nb;
  const lens = Array.from({ length: nb }, (_, i) => shortLen - ecc + (i < nShort ? 0 : 1));
  const blocks = lens.map(() => []);
  let k = 0;
  for (let i = 0; i < Math.max(...lens); i++) for (let b = 0; b < nb; b++) if (i < lens[b]) blocks[b].push(words[k++]);
  for (let i = 0; i < ecc; i++) for (let b = 0; b < nb; b++) blocks[b].push(words[k++]);
  for (const block of blocks) {
    for (let s = 0; s < ecc; s++) {
      let acc = 0;
      for (const c of block) acc = (acc === 0 ? 0 : GF_EXP[(GF_LOG[acc] + s) % 255]) ^ c;
      assert.equal(acc, 0, 'Reed–Solomon syndrome ' + s + ' is zero');
    }
  }
  const data = blocks.flatMap((b, i) => b.slice(0, lens[i]));
  const stream = data.map(b => b.toString(2).padStart(8, '0')).join('');
  assert.equal(stream.slice(0, 4), '0100', 'byte mode');
  const cc = v < 10 ? 8 : 16, len = parseInt(stream.slice(4, 4 + cc), 2);
  const payload = [];
  for (let i = 0; i < len; i++) payload.push(parseInt(stream.slice(4 + cc + i * 8, 12 + cc + i * 8), 2));
  return { text: new TextDecoder().decode(Uint8Array.from(payload)), version: v };
}

test('every length from 1 to 213 bytes round-trips through the decoder, across all ten versions', () => {
  const qr = browser(SHARE_JS).window.CabanaShare.qr;
  const seen = new Set();
  const base = 'https://cabana.africa/s/' + JETS + '?tour=' + TOKEN + '&Ünïcødé✓';
  for (let len = 1; len <= 213; len += 4) {
    let text = '';
    while (new TextEncoder().encode(text + base[text.length % base.length]).length <= len) text += base[text.length % base.length];
    const code = qr.encode(text);
    const out = decodeSymbol(Array.from(code.modules, r => Array.from(r)));
    assert.equal(out.text, text);
    seen.add(out.version);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(qr.encode('z'.repeat(214)), null, 'longer than version 10 holds is refused, not mangled');
});

/* ── the button and the sheet ──────────────────────────────────── */

test('CabanaShare.button writes an accessible share button with the /s/ link and the right words', () => {
  const dom = browser(SHARE_JS), { CabanaShare } = dom.window, doc = dom.window.document;
  const apt = { id: 'n_' + JETS, _dbId: JETS, name: 'The Jets Nest', neighbourhood: 'Obama estate', city: 'Nairobi', price: 1500, photos: [PHOTO] };
  doc.body.innerHTML = CabanaShare.button(apt, { variant: 'icon' });
  const b = doc.querySelector('button');
  assert.equal(b.type, 'button');
  assert.ok(b.hasAttribute('data-cabana-share'));
  assert.equal(b.getAttribute('aria-label'), 'Share The Jets Nest');
  assert.equal(b.dataset.shareUrl, 'https://cabana.africa/s/' + JETS);
  assert.equal(b.dataset.shareText, 'The Jets Nest, Obama estate, Nairobi · KES 1,500 a night. Found it on Cabana.');
  assert.match(b.dataset.shareImage, /\/render\/image\/public\/listings\/a\/1\.jpg\?width=240/);
  assert.ok(b.classList.contains('cshare-icon'));
  assert.equal(b.querySelector('svg').getAttribute('aria-hidden'), 'true');

  doc.body.innerHTML = CabanaShare.button({ id: JETS, title: 'The Jets Nest', area: 'Obama estate', city: 'Nairobi', price_night: 1500 },
    { host: true, className: 'lc-share', showLabel: true });
  const h = doc.querySelector('button');
  assert.equal(h.className, 'cshare-btn lc-share');
  assert.equal(h.textContent, 'Share your listing');
  assert.equal(h.getAttribute('aria-label'), 'Share your listing, The Jets Nest');
  assert.equal(h.dataset.shareHeading, 'Share your listing');
  assert.match(h.dataset.shareText, /^Stay at The Jets Nest in Obama estate, Nairobi\. KES 1,500 a night, booked directly on Cabana\.$/);

  doc.body.innerHTML = CabanaShare.button({ id: JETS, name: '"><img src=x onerror=alert(1)>' });
  assert.equal(doc.querySelectorAll('img').length, 0, 'a listing title cannot inject markup');
  assert.equal(doc.querySelector('button').dataset.shareTitle, '"><img src=x onerror=alert(1)>');

  assert.equal(CabanaShare.button({ id: 'bad id/../x', name: 'X' }), '', 'no button without a real listing id');
  assert.equal(CabanaShare.listingUrl({ id: JETS }, { tour: TOKEN }), 'https://cabana.africa/s/' + JETS + '?tour=' + TOKEN);
  assert.equal(CabanaShare.listingUrl({ id: JETS }, { tour: 'no spaces<>' }), 'https://cabana.africa/s/' + JETS);
});

test('a delegated click opens the sheet with every channel, a copy link and the QR, and Escape closes it', async () => {
  const dom = browser(SHARE_JS), w = dom.window, doc = w.document;
  doc.body.innerHTML = '<a href="/apartments?open=x" id="card">' + w.CabanaShare.button({ id: JETS, name: 'The Jets Nest', price: 1500 }) + '</a>';
  const click = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  doc.querySelector('[data-cabana-share]').dispatchEvent(click);
  assert.equal(click.defaultPrevented, true, 'the surrounding link does not navigate');
  const sheet = doc.querySelector('dialog.cshare');
  assert.ok(sheet && sheet.open);
  assert.deepEqual([...sheet.querySelectorAll('.cshare-t')].map(t => t.dataset.ch),
    ['whatsapp', 'telegram', 'x', 'facebook', 'linkedin', 'email', 'sms', 'copy']);
  assert.match(sheet.querySelector('[data-ch=whatsapp]').href, /^https:\/\/wa\.me\/\?text=.*cabana\.africa%2Fs%2F65ef1d11/);
  assert.equal(sheet.querySelector('.cshare-link input').value, 'https://cabana.africa/s/' + JETS);
  assert.ok(sheet.querySelector('.cshare-qr canvas'));
  doc.querySelector('[data-cabana-share]').focus();
  sheet.dispatchEvent(new w.Event('cancel', { cancelable: true }));
  assert.equal(sheet.classList.contains('on'), false, 'starts closing at once');
  await new Promise(r => setTimeout(r, 300));
  assert.equal(doc.querySelector('dialog.cshare'), null, 'and is gone once it has animated out');
  assert.equal(doc.body.style.overflow, '', 'page scroll is given back');
});

/* ── the 3D tour's exact view ──────────────────────────────────── */

test('the tour viewer receives a valid view token as ?v= and nothing else', () => {
  const kileleshwa = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  const src = (id, view) => {
    const dom = browser(TOUR_JS), api = dom.window.CabanaPropertyTour;
    api.open(id, view);
    const s = dom.window.document.querySelector('iframe')?.getAttribute('src');
    api.close(); dom.window.close();
    return s;
  };
  assert.equal(src(JETS, TOKEN), '/tours/jets-nest/index.html?v=' + TOKEN);
  assert.equal(src(kileleshwa, 'bedroom~2.1~-0.6~140~-2~d~~'), '/tours/kileleshwa-elegant/index.html?v=bedroom~2.1~-0.6~140~-2~d~~');
  for (const bad of [undefined, '', '1', 'x'.repeat(121), 'a b', '"><script>', 'a&b=c', 'living%20room', 42, { toString: () => TOKEN }]) {
    assert.equal(src(JETS, bad), '/tours/jets-nest/index.html', String(bad));
  }
  /* A third-party walkthrough never receives our token. */
  const dom = browser(TOUR_JS), api = dom.window.CabanaPropertyTour;
  api.register('remote-1', { name: 'Remote', url: 'https://my.matterport.com/show/?m=abc' });
  api.open('remote-1', TOKEN);
  assert.equal(dom.window.document.querySelector('iframe').getAttribute('src'), 'https://my.matterport.com/show/?m=abc');
});

test('the stays page shares from cards and the drawer and hands a shared view to the tour', () => {
  const html = read('apartments.html');
  assert.match(html, /<script[^>]+src="\/cabana-share\.js[^"]*"[^>]*><\/script>/, 'the share module is loaded');
  assert.match(html, /e\.target\.closest\('\[data-cbn-share\],\[data-cabana-share\]'\)\) return;/, 'a share tap never opens the card');
  assert.ok(html.includes("const wantsTour = /^[a-z0-9~.\\-]{1,120}$/i.test(tourToken);"));
  assert.match(html, /CabanaPropertyTour\.open\(tourId, tourToken === '1' \? undefined : tourToken\)/);
  assert.match(read('partner-listings.html'), /cabana-share\.js/, 'hosts can share from their board');
});

test('the compact data-cbn-share buttons other pages draw by hand open the same sheet', () => {
  const dom = browser(SHARE_JS, '<button id="b" data-cbn-share data-share-id="' + JETS + '" data-share-title="The Jets Nest">Share</button>');
  const { document, CabanaShare } = dom.window;
  assert.equal(CabanaShare.url(JETS), 'https://cabana.africa/s/' + JETS);
  document.getElementById('b').click();
  const text = document.body.textContent;
  assert.match(text, /WhatsApp/);
  assert.match(document.body.innerHTML, new RegExp('cabana\\.africa/s/' + JETS));
});
