/* ═══════════════════════════════════════════════════════════════════
   CABANA · LIVING AVATARS  v2 · The character collection
   ───────────────────────────────────────────────────────────────────
   Every Cabana member gets a character that is theirs: a person, an
   animal spirit, or (for organisations) an emblem. Characters are
   drawn here as SVG from a tiny spec, so an avatar costs ~120 bytes in
   the database and nothing on a CDN, renders crisp at 20px or 400px,
   and can never contain a photo someone did not choose.

   Motion is part of a character's personality: curious head tilts,
   soft breathing, little dances, waving hands and twitching ears.
   Every instance has its own phase, including the tiny profile icon.
   Off-screen and background tabs pause; reduced motion and Still are
   respected. One shared observer and delegated events serve the page.

   Defaults matter: a member who has not chosen gets an animal spirit
   (or an emblem for organisations), never a generated human face. We
   do not guess anybody's skin tone, hair or gender.

   Public API (window.CabanaAvatars):
     render(spec, {size, name, label}) → SVG string
     mount(el, spec, opts)             → renders + manages motion
     defaultFor(id, accountType)       → deterministic starter spec
     surprise(kind, seed)              → random valid spec
     validate(spec)                    → clean spec or null
     catalogue()                       → curated personas
     OPTIONS                           → labelled choices for editors
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaAvatars) return;

  /* ── palettes ─────────────────────────────────────────────────────── */
  const SKIN = ['#4A2C1A', '#5E3822', '#744528', '#8C5530', '#A4663A', '#B97B4B', '#CC9163', '#DDA87E', '#EDC5A0', '#F6DCC4'];
  const HAIR = ['#17110E', '#3A2417', '#6A3F22', '#8F3A1E', '#C9953F', '#BDB8B0', '#6D1F3B', '#2F4DA0', '#D8739E'];
  const HAIR_NAMES = ['Black', 'Espresso', 'Chestnut', 'Copper', 'Honey', 'Silver', 'Plum', 'Indigo', 'Rose'];
  const FABRIC = ['#E0457B', '#F5B12E', '#14B8A6', '#6D28FF', '#FF6A3C', '#1F2937', '#4F6DFF', '#2F855A', '#F4EFE6'];
  const OUTFIT = ['#6D28FF', '#4F6DFF', '#14B8A6', '#F5B12E', '#FF6A3C', '#E0457B', '#1F2937', '#F4F1EA', '#2F855A', '#8B5E34'];
  const OUTFIT_NAMES = ['Jacaranda', 'Lake', 'Reef', 'Savanna', 'Sunset', 'Hibiscus', 'Onyx', 'Linen', 'Forest', 'Clay'];

  const BACKDROPS = [
    { id: 'equator', name: 'Equator', a: '#7C4DFF', b: '#4EE0C8', motif: 'orbs' },
    { id: 'sunrise', name: 'Sunrise', a: '#FF9E6B', b: '#FFE0A3', motif: 'sun' },
    { id: 'ocean', name: 'Diani', a: '#2E9BD6', b: '#9BE7F0', motif: 'waves' },
    { id: 'savanna', name: 'Savanna', a: '#E9A23B', b: '#FBE2A0', motif: 'acacia' },
    { id: 'night', name: 'Night sky', a: '#1C1A4A', b: '#43358F', motif: 'stars' },
    { id: 'jacaranda', name: 'Jacaranda', a: '#7C3AED', b: '#D6C8FF', motif: 'petals' },
    { id: 'reef', name: 'Reef', a: '#0FA595', b: '#B4F5DD', motif: 'bubbles' },
    { id: 'city', name: 'City dusk', a: '#FF7A59', b: '#6D3DF5', motif: 'skyline' },
    { id: 'kili', name: 'Kilimanjaro', a: '#7DB7F5', b: '#E3F1FF', motif: 'mountain' },
    { id: 'dunes', name: 'Dunes', a: '#F08A24', b: '#FFE39A', motif: 'dunes' },
    { id: 'forest', name: 'Forest', a: '#17693A', b: '#8EE3A8', motif: 'leaves' },
    { id: 'kente', name: 'Kente', a: '#F5B12E', b: '#FF6A3C', motif: 'kente' }
  ];

  /* ── option tables (indices are the stored values; never reorder) ── */
  const OPTIONS = {
    kinds: [['p', 'Person'], ['a', 'Animal spirit'], ['e', 'Emblem']],
    skin: SKIN.map((c, i) => ({ v: i, color: c, name: 'Tone ' + (i + 1) })),
    hair: ['Clean shave', 'Short fade', 'Afro', 'Afro puff', 'Twists', 'Locs', 'Box braids', 'Bantu knots',
      'Long & straight', 'Bob', 'Top bun', 'Headwrap', 'Hijab', 'Kofia', 'Curls', 'Cornrows'].map((n, i) => ({ v: i, name: n })),
    hairColor: HAIR.map((c, i) => ({ v: i, color: c, name: HAIR_NAMES[i] })),
    fabric: FABRIC.map((c, i) => ({ v: i, color: c })),
    eyes: ['Bright', 'Happy', 'Lashes', 'Wink', 'Relaxed'].map((n, i) => ({ v: i, name: n })),
    mouth: ['Smile', 'Grin', 'Gentle', 'Wow', 'Smirk', 'Laugh'].map((n, i) => ({ v: i, name: n })),
    facial: ['None', 'Stubble', 'Beard', 'Moustache'].map((n, i) => ({ v: i, name: n })),
    accessory: ['None', 'Glasses', 'Sunglasses', 'Hoops', 'Headphones', 'Safari hat', 'Frangipani', 'Beaded collar', 'Beanie'].map((n, i) => ({ v: i, name: n })),
    outfit: ['Tee', 'Collared', 'Kitenge', 'Hoodie'].map((n, i) => ({ v: i, name: n })),
    outfitColor: OUTFIT.map((c, i) => ({ v: i, color: c, name: OUTFIT_NAMES[i] })),
    backdrop: BACKDROPS.map((b, i) => ({ v: i, name: b.name, a: b.a, b: b.b })),
    motion: [['Still', 0], ['Calm', 1], ['Lively', 2]].map(([n, v]) => ({ v, name: n })),
    animal: [],            // filled below
    tint: ['Natural', 'Golden', 'Pastel', 'Midnight'].map((n, i) => ({ v: i, name: n })),
    animalAccessory: ['None', 'Sunglasses', 'Safari hat', 'Frangipani', 'Headphones', 'Bow tie'].map((n, i) => ({ v: i, name: n })),
    shape: ['Circle', 'Tile', 'Hexagon', 'Shield', 'Arch', 'Diamond'].map((n, i) => ({ v: i, name: n })),
    pattern: ['Solid', 'Kente', 'Kitenge', 'Mudcloth', 'Waves', 'Sunburst'].map((n, i) => ({ v: i, name: n })),
    palette: [],           // filled below
    glyph: ['Initials', 'Building', 'Compass', 'Palm', 'Mountain', 'Waves', 'Sun', 'Leaf', 'Key', 'Dining', 'Car', 'Ticket', 'Bed'].map((n, i) => ({ v: i, name: n }))
  };

  /* Server-side validation mirrors these ranges (api/lib/_avatar-spec.js). */
  const RANGES = {
    p: { s: 10, h: 16, hc: 9, fc: 9, e: 5, m: 6, f: 4, x: 9, w: 4, o: 10, b: 12, mo: 3 },
    a: { a: 20, t: 4, x: 6, b: 12, mo: 3 },
    e: { sh: 6, pt: 6, c: 8, g: 13, mo: 3 }
  };

  /* ── colour maths ─────────────────────────────────────────────────── */
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
  function shade(h, t) { return t < 0 ? mix(h, '#000000', -t) : mix(h, '#ffffff', t); }
  function toHsl(h) {
    let [r, g, b] = rgb(h).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [hue * 60, s, l];
  }
  function fromHsl(hh, s, l) {
    hh = ((hh % 360) + 360) % 360 / 360;
    if (!s) return hex(l * 255, l * 255, l * 255);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return hex(f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255);
  }
  function tint(h, t) {
    if (!t) return h;
    if (t === 1) return mix(h, '#E3A33A', .5);
    if (t === 2) return mix(mix(h, '#FFFFFF', .42), '#E9DDFB', .15);
    return mix(h, '#29275C', .55);
  }

  /* ── seeded randomness ────────────────────────────────────────────── */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = typeof seed === 'number' ? seed : hash(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, n) => Math.floor(r() * n);

  let seq = 0;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = n => Math.round(n * 10) / 10;

  // Soft directional light gives every colour real volume without filters,
  // images, network requests, or a canvas redraw on each animation frame.
  function sculpt(markup, P) {
    const colors = new Map();
    const painted = markup.replace(/fill="(#[0-9a-f]{6})"/gi, (all, color) => {
      if (/^#(?:ffffff|1b1412)$/i.test(color)) return all;
      if (!colors.has(color)) colors.set(color, P + 'lit' + colors.size);
      return `fill="url(#${colors.get(color)})"`;
    });
    const defs = Array.from(colors, ([c, id]) => `<radialGradient id="${id}" cx="32%" cy="22%" r="86%"><stop stop-color="${shade(c, .23)}"/><stop offset=".48" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -.22)}"/></radialGradient>`).join('');
    return `<defs>${defs}</defs>${painted}`;
  }
  const joint = (cls, x, y, svg) => `<g class="${cls}" style="transform-origin:${x}px ${y}px">${svg}</g>`;
  function delight(P) {
    return `<g class="cav-delight" aria-hidden="true"><path class="cav-spark cav-spark-a" d="M23 31l1.8 4.6L30 37l-5.2 1.8L23 44l-1.8-5.2L16 37l5.2-1.4z" fill="#FFF2AF"/><path class="cav-spark cav-spark-b" d="M96 52l1.2 3.2L101 57l-3.8 1.2L96 62l-1.2-3.8L91 57l3.8-1.8z" fill="#FFFFFF"/><path class="cav-heart" d="M94 30c-7-7-14 3 0 11c14-8 7-18 0-11z" fill="#FF7298"/><circle class="cav-spark cav-spark-c" cx="28" cy="76" r="2" fill="#B1FFEE"/></g>`;
  }

  /* ════════════════════════════════════════════════════════════════
     BACKDROPS
     ════════════════════════════════════════════════════════════════ */
  function backdrop(b, P, r) {
    const d = BACKDROPS[b] || BACKDROPS[0];
    let m = '';
    const W = 'rgba(255,255,255,', K = 'rgba(0,0,0,';
    switch (d.motif) {
      case 'orbs': m = `<circle cx="22" cy="24" r="16" fill="${W}.18)"/><circle cx="100" cy="36" r="10" fill="${W}.14)"/><circle cx="96" cy="96" r="22" fill="${W}.10)"/>`; break;
      case 'sun': m = `<circle cx="92" cy="30" r="15" fill="${W}.55)"/><circle cx="92" cy="30" r="22" fill="${W}.18)"/>`; break;
      case 'waves': m = `<path d="M-4 86q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0v40H-4z" fill="${W}.22)"/><path d="M-4 98q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0v30H-4z" fill="${W}.2)"/><circle cx="24" cy="26" r="9" fill="${W}.45)"/>`; break;
      case 'acacia': m = `<circle cx="96" cy="28" r="12" fill="${W}.5)"/><path d="M8 84h34M25 84v-10" stroke="${K}.14)" stroke-width="2.4" stroke-linecap="round"/><path d="M6 73q19-12 38 0q-19 5-38 0z" fill="${K}.14)"/><path d="M-4 104q34-12 64 0t64 0v24H-4z" fill="${K}.08)"/>`; break;
      case 'stars': {
        const stars = [[16, 20, 1.4], [34, 12, 1], [98, 18, 1.2], [108, 44, .9], [14, 52, .9], [88, 8, .8], [60, 10, .9], [104, 70, 1]];
        m = stars.map((s, i) => `<circle class="cav-tw" style="animation-delay:${f1(-r() * 4 - i * .37)}s" cx="${s[0]}" cy="${s[1]}" r="${s[2]}" fill="#FFF7D6"/>`).join('') +
          `<path d="M100 26a10 10 0 1 1-9-14a8 8 0 0 0 9 14z" fill="#FFF3C4" opacity=".9"/>`;
        break;
      }
      case 'petals': m = [[18, 22, 20], [98, 30, -30], [30, 96, 45], [104, 92, 10], [70, 12, 70]].map(p => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="4.5" ry="2.6" transform="rotate(${p[2]} ${p[0]} ${p[1]})" fill="${W}.5)"/>`).join(''); break;
      case 'bubbles': m = [[16, 30, 5], [26, 16, 3], [100, 24, 6], [92, 44, 3], [104, 90, 4], [14, 88, 3.5]].map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="none" stroke="${W}.5)" stroke-width="1.4"/>`).join(''); break;
      case 'skyline': m = `<circle cx="28" cy="30" r="10" fill="${W}.35)"/><path d="M-2 120V92h10v-8h8v12h8V78h10v18h6V88h9v32zM74 120V84h8v-8h10v14h8v-6h10v36z" fill="${K}.18)"/><path d="M-2 120v-10h124v10z" fill="${K}.1)"/>`; break;
      case 'mountain': m = `<path d="M-4 112l40-44 18 18 20-30 50 56z" fill="${W}.55)"/><path d="M58 70l16-14 12 14-7-3-6 5-5-4z" fill="#fff" opacity=".9"/><circle cx="24" cy="26" r="8" fill="${W}.7)"/>`; break;
      case 'dunes': m = `<circle cx="90" cy="26" r="11" fill="${W}.6)"/><path d="M-4 92q30-16 64 2t64-4v40H-4z" fill="${K}.08)"/><path d="M-4 106q40-12 70 0t58-2v30H-4z" fill="${K}.1)"/>`; break;
      case 'leaves': m = [[14, 24, 30], [104, 20, -40], [12, 96, -20], [108, 98, 35]].map(l => `<path transform="translate(${l[0]} ${l[1]}) rotate(${l[2]})" d="M0-12C8-6 8 6 0 12C-8 6-8-6 0-12zM0-12V12" fill="${W}.22)" stroke="${W}.3)" stroke-width="1"/>`).join(''); break;
      case 'kente': m = `<g opacity=".16">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${i * 22 - 4}" y="0" width="8" height="120" fill="${i % 2 ? '#1F2937' : '#2F855A'}"/>`).join('')}${[0, 1, 2, 3, 4].map(i => `<rect x="0" y="${i * 26 + 6}" width="120" height="5" fill="${i % 2 ? '#fff' : '#1F2937'}"/>`).join('')}</g>`; break;
    }
    return `<defs><linearGradient id="${P}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${d.a}"/><stop offset="1" stop-color="${d.b}"/></linearGradient></defs>` +
      `<rect width="120" height="120" fill="url(#${P}bg)"/><g class="cav-drift">${m}</g>`;
  }

  /* ════════════════════════════════════════════════════════════════
     PEOPLE
     ════════════════════════════════════════════════════════════════ */
  const EYE = '#1B1412';

  function eyes(e, y, lx, rx, skinDark) {
    const hi = (x) => `<circle cx="${x + 0.9}" cy="${y - 0.9}" r=".8" fill="#fff" opacity=".9"/>`;
    const dot = x => `<ellipse cx="${x}" cy="${y + .2}" rx="3.6" ry="4" fill="#FFF9EF"/><ellipse cx="${x + .3}" cy="${y}" rx="2.7" ry="3.1" fill="#71482F"/><ellipse cx="${x + .5}" cy="${y}" rx="1.9" ry="2.5" fill="${EYE}"/>${hi(x)}<circle cx="${x - .7}" cy="${y + 1.1}" r=".4" fill="#fff"/>`;
    const arc = x => `<path d="M${x - 3.6} ${y + 1}Q${x} ${y - 3.2} ${x + 3.6} ${y + 1}" fill="none" stroke="${EYE}" stroke-width="1.9" stroke-linecap="round"/>`;
    switch (e) {
      case 1: return { open: false, s: arc(lx) + arc(rx) };
      case 2: {
        const al = x => `<ellipse cx="${x}" cy="${y}" rx="3" ry="2.6" fill="${EYE}"/>${hi(x)}<path d="M${x - 3.8} ${y - 1.6}Q${x} ${y - 4.6} ${x + 3.8} ${y - 1.6}" fill="none" stroke="${EYE}" stroke-width="1.3" stroke-linecap="round"/><path d="M${x + 3.4} ${y - 2}l1.6-1.4" stroke="${EYE}" stroke-width="1.1" stroke-linecap="round"/>`;
        return { open: true, s: al(lx) + al(rx) };
      }
      case 3: return { open: false, s: dot(lx) + `<path d="M${rx - 3.6} ${y}Q${rx} ${y + 2.6} ${rx + 3.6} ${y}" fill="none" stroke="${EYE}" stroke-width="1.9" stroke-linecap="round"/>` };
      case 4: {
        const sl = x => `<path d="M${x - 3} ${y}a3 3 0 0 0 6 0z" fill="${EYE}"/><path d="M${x - 3.8} ${y - .2}h7.6" stroke="${skinDark}" stroke-width="1.6" stroke-linecap="round"/>`;
        return { open: true, s: sl(lx) + sl(rx) };
      }
      default: return { open: true, s: dot(lx) + dot(rx) };
    }
  }

  function mouth(m, y, lip) {
    switch (m) {
      case 1: return `<path d="M52.5 ${y - 1.5}Q60 ${y + 8.5} 67.5 ${y - 1.5}Z" fill="#5A1A22"/><path d="M54 ${y - .9}Q60 ${y + 1.4} 66 ${y - .9}L65.3 ${y + 1}Q60 ${y + 2.6} 54.7 ${y + 1}Z" fill="#fff"/>`;
      case 2: return `<path d="M55.5 ${y}Q60 ${y + 3.6} 64.5 ${y}" fill="none" stroke="${lip}" stroke-width="1.9" stroke-linecap="round"/>`;
      case 3: return `<ellipse cx="60" cy="${y + 1.5}" rx="3.2" ry="3.8" fill="#5A1A22"/>`;
      case 4: return `<path d="M54.5 ${y + 1.5}Q61 ${y + 3.8} 66 ${y - 1.4}" fill="none" stroke="${lip}" stroke-width="1.9" stroke-linecap="round"/>`;
      case 5: return `<path d="M51.5 ${y - 2}Q60 ${y + 11} 68.5 ${y - 2}Z" fill="#5A1A22"/><path d="M53 ${y - 1.3}Q60 ${y + 1} 67 ${y - 1.3}L66.2 ${y + .8}Q60 ${y + 2.4} 53.8 ${y + .8}Z" fill="#fff"/><ellipse cx="60" cy="${y + 5.6}" rx="4" ry="2.1" fill="#E4606F"/>`;
      default: return `<path d="M53 ${y - .6}Q60 ${y + 6} 67 ${y - .6}" fill="none" stroke="${lip}" stroke-width="2" stroke-linecap="round"/>`;
    }
  }

  /* Hair: back layer (behind torso) and front layer (over the head). */
  function hairLayers(h, c, fab, P) {
    const hl = shade(c, c === HAIR[5] ? -.18 : .22), dk = shade(c, -.25);
    const ring = (cx, cy, R, n, r, fill) => { let s = ''; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; s += `<circle cx="${f1(cx + Math.cos(t) * R)}" cy="${f1(cy + Math.sin(t) * R)}" r="${r}" fill="${fill}"/>`; } return s; };
    const cap = `<path d="M38.6 56C37.4 40 46.5 30.4 60 30.4S82.6 40 81.4 56C80 48.6 75.6 43.6 69.6 42C63.6 40.8 56.4 40.8 50.4 42C44.4 43.6 40 48.6 38.6 56Z" fill="${c}"/>`;
    const sleek = `<path d="M39 55C39 39.5 48 32 60 32S81 39.5 81 55C79 45 71 38.8 60 38.8S41 45 39 55Z" fill="${c}"/><path d="M48 35.5Q60 31.5 72 35.5" fill="none" stroke="${hl}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`;
    const strand = (x, y1, y2, w, tex) => `<rect x="${x - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" rx="${w / 2}" fill="${c}"/>` + (tex ? `<path d="M${x} ${y1 + 3}V${y2 - 3}" stroke="${hl}" stroke-width="${w * .45}" stroke-dasharray="${tex}" stroke-linecap="round" opacity=".55"/>` : '');
    switch (h) {
      case 1: return { back: '', front: `<path d="M39.5 53C39 38.4 48 31.6 60 31.6S81 38.4 80.5 53C79 46 75 41.6 69 40.2H51C45 41.6 41 46 39.5 53Z" fill="${c}"/><path d="M40 52c.5-2 1.3-4 2.4-5.8M80 52c-.5-2-1.3-4-2.4-5.8" stroke="${dk}" stroke-width="1.4" opacity=".5"/>` };
      case 2: return { back: `<circle cx="60" cy="45" r="27" fill="${c}"/>${ring(60, 45, 25.5, 16, 7.4, c)}${ring(60, 45, 24, 9, 1.6, hl)}`, front: `<path d="M37 58C35 41 45 30 60 30S85 41 83 58C81 50 77 45 71 43.5C66 46.5 54 46.5 49 43.5C43 45 39 50 37 58Z" fill="${c}"/>` };
      case 3: return { back: `<circle cx="60" cy="21" r="12.5" fill="${c}"/>${ring(60, 21, 11.5, 11, 4.4, c)}${ring(60, 21, 9, 6, 1.3, hl)}`, front: sleek + `<rect x="52.5" y="30.6" width="15" height="4.2" rx="2.1" fill="${fab}"/>` };
      case 4: {
        let s = cap; for (let i = 0; i <= 8; i++) { const t = Math.PI * (1.06 + i * .11); s += `<circle cx="${f1(60 + Math.cos(t) * 21)}" cy="${f1(50 + Math.sin(t) * 19)}" r="5.6" fill="${c}"/><path d="M${f1(60 + Math.cos(t) * 21) - 1.8} ${f1(50 + Math.sin(t) * 19)}q1.8-2.4 3.6 0" fill="none" stroke="${hl}" stroke-width="1" opacity=".7"/>`; }
        return { back: '', front: s };
      }
      case 5: return {
        back: [[33, 44, 98, 6.4], [38.6, 42, 104, 6.4], [81.4, 42, 104, 6.4], [87, 44, 98, 6.4], [44, 40, 100, 6], [76, 40, 100, 6]].map(a => strand(a[0], a[1], a[2], a[3], '1.6 3.2')).join(''),
        front: cap + strand(40.4, 44, 80, 5.8, '1.6 3.2') + strand(79.6, 44, 80, 5.8, '1.6 3.2') + strand(47, 40, 52, 5.4, '') + strand(73, 40, 52, 5.4, '')
      };
      case 6: {
        const bead = (x, y) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${fab}"/>`;
        const b = [[34, 46, 108], [38.5, 44, 112], [43, 42, 110], [77, 42, 110], [81.5, 44, 112], [86, 46, 108]];
        return {
          back: b.map(a => strand(a[0], a[1], a[2], 4.4, '2 2.2') + bead(a[0], a[2] - 1)).join(''),
          front: `<path d="M39 55C39 38 49 31 60 31S81 38 81 55C79 45 72 38.2 61 37.6L60 33.8L59 37.6C48 38.2 41 45 39 55Z" fill="${c}"/>` + strand(40.2, 46, 88, 4.2, '2 2.2') + strand(79.8, 46, 88, 4.2, '2 2.2') + bead(40.2, 87) + bead(79.8, 87)
        };
      }
      case 7: {
        const k = (x, y) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${c}"/><path d="M${x - 2.6} ${y + .6}a2.6 2.6 0 1 1 3 2.2" fill="none" stroke="${hl}" stroke-width="1.1" stroke-linecap="round"/>`;
        return { back: '', front: sleek + k(43.5, 40) + k(51.5, 32.4) + k(60, 29.6) + k(68.5, 32.4) + k(76.5, 40) };
      }
      case 8: return {
        back: `<path d="M36 56C35 34 46 26 60 26S85 34 84 56L86.5 101C80 105 72 103 70.5 97H49.5C48 103 40 105 33.5 101Z" fill="${c}"/>`,
        front: `<path d="M38 58C36 36 50 28 62 29S84 38 82 58C80 48 74 40.5 64 38.6C56 44.5 46 48.5 38 58Z" fill="${c}"/><path d="M63 31.5Q74 34 79 44" fill="none" stroke="${hl}" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>`
      };
      case 9: return {
        back: `<path d="M35 58C34 36 46 27 60 27S86 36 85 58V75C80 79 74 78 72 75H48C46 78 40 79 35 75Z" fill="${c}"/>`,
        front: `<path d="M38 52C38 36 48 30 60 30S82 36 82 52C74 47.6 69 46.4 60 46.4S46 47.6 38 52Z" fill="${c}"/><path d="M47 34.6Q60 31 73 34.6" fill="none" stroke="${hl}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`
      };
      case 10: return { back: `<circle cx="60" cy="24.6" r="9.4" fill="${c}"/><path d="M54 24a6 6 0 0 1 11-2.6" fill="none" stroke="${hl}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`, front: sleek };
      case 11: {
        const d = shade(fab, -.22), l = shade(fab, .28);
        return {
          back: '', front: `<path d="M35.6 52C32 30 44 15.5 60 15.5S88 30 84.4 52C80 44.6 71 40.6 60 40.6S40 44.6 35.6 52Z" fill="${fab}"/>` +
            `<path d="M39 44Q60 32 81 44M37.5 35Q60 23 82.5 35M44 24.6Q60 17 76 24.6" fill="none" stroke="${l}" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>` +
            `<ellipse cx="51" cy="16" rx="8.6" ry="5.6" transform="rotate(-24 51 16)" fill="${fab}"/><ellipse cx="69" cy="16" rx="8.6" ry="5.6" transform="rotate(24 69 16)" fill="${fab}"/><circle cx="60" cy="18.6" r="4.4" fill="${d}"/>`
        };
      }
      case 12: {
        const d = shade(fab, -.2);
        return {
          drape: `<path d="M60 23C37 23 29.5 42 30.5 62C31.5 82 36 97 24 121H96C84 97 88.5 82 89.5 62C90.5 42 83 23 60 23Z" fill="${fab}"/><path d="M36 92Q50 104 60 104T84 92" fill="none" stroke="${d}" stroke-width="1.6" opacity=".55"/><circle cx="80.5" cy="77" r="1.7" fill="#F5D37A"/>`,
          back: '', front: `<path d="M38.8 59C37.8 40 48 30.6 60 30.6S82.2 40 81.2 59C79.4 46.4 71 38.4 60 38.4S40.6 46.4 38.8 59Z" fill="${d}"/>`, noEars: true
        };
      }
      case 13: {
        const d = shade(fab, -.18);
        return { back: '', front: `<path d="M39.5 53C39 42 44 38 50 37.6H70C76 38 81 42 80.5 53C79 48 76 45 72 44H48C44 45 41 48 39.5 53Z" fill="${c}"/><path d="M40.4 45.6L41.6 32.4C47 26.6 73 26.6 78.4 32.4L79.6 45.6C70 42.6 50 42.6 40.4 45.6Z" fill="${fab}"/><path d="M43 41.4Q60 38.2 77 41.4M43.6 35.6Q60 32 76.4 35.6" fill="none" stroke="${d}" stroke-width="1.3" stroke-dasharray="1.4 2.2" stroke-linecap="round"/>` };
      }
      case 14: return {
        back: `<circle cx="60" cy="48" r="23" fill="${c}"/>${ring(60, 48, 22, 13, 6.6, c)}`,
        front: `<path d="M38 55C37 40 46 31.5 60 31.5S83 40 82 55C80 48 76 44 70 42.5H50C44 44 40 48 38 55Z" fill="${c}"/>${[43, 49.5, 56, 63, 70, 76.5].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 39.5 : 41.5}" r="4.8" fill="${c}"/><path d="M${x - 2} ${i % 2 ? 40 : 42}q2-2.4 4 0" fill="none" stroke="${hl}" stroke-width="1" opacity=".7"/>`).join('')}`
      };
      case 15: return { back: '', front: cap + [48, 54, 60, 66, 72].map((x, i) => `<path d="M${x + (x - 60) * .06} 42Q${x + (x - 60) * .2} 36 ${x + (x - 60) * .16} 31.5" fill="none" stroke="${hl}" stroke-width="1.3" stroke-dasharray="2 1.6" stroke-linecap="round" opacity=".75"/>`).join('') };
      default: return { back: '', front: `<ellipse cx="53" cy="37.6" rx="7" ry="3.2" fill="#fff" opacity=".12"/>` };
    }
  }

  function outfit(w, oc, skinDark, P) {
    const d = shade(oc, -.2), l = shade(oc, .3);
    const light = toHsl(oc)[2] > 0.75;
    const torso = `<path d="M15 121C16 101.5 31 90.5 50 88.2H70C89 90.5 104 101.5 105 121Z" fill="${oc}"/>`;
    const crew = `<path d="M51 88.2Q60 97.4 69 88.2Z" fill="${skinDark}"/><path d="M50.2 88.4Q60 98.6 69.8 88.4" fill="none" stroke="${d}" stroke-width="2.4" stroke-linecap="round"/>`;
    switch (w) {
      case 1: return torso + `<path d="M52 88.2L60 101L68 88.2Z" fill="${skinDark}"/><path d="M49.4 87.4L60 101L54.2 105.4L45.4 92Z" fill="${light ? d : l}"/><path d="M70.6 87.4L60 101L65.8 105.4L74.6 92Z" fill="${light ? d : l}"/><circle cx="60" cy="110" r="1.3" fill="${d}"/><circle cx="60" cy="116" r="1.3" fill="${d}"/>`;
      case 2: {
        const alt = light ? '#E07A2F' : '#FFD37A', alt2 = light ? '#2F855A' : '#fff';
        return `<defs><clipPath id="${P}tc"><path d="M15 121C16 101.5 31 90.5 50 88.2H70C89 90.5 104 101.5 105 121Z"/></clipPath></defs>` + torso +
          `<g clip-path="url(#${P}tc)" opacity=".85">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => [0, 1, 2].map(j => {
            const x = 18 + i * 12 + (j % 2) * 6, y = 96 + j * 10;
            return `<path d="M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z" fill="${(i + j) % 2 ? alt : alt2}" opacity=".9"/><circle cx="${x}" cy="${y}" r="1.2" fill="${d}"/>`;
          }).join('')).join('')}</g>` + crew;
      }
      case 3: return torso + `<path d="M38 96C40 84 80 84 82 96C76 91 68 89.6 60 89.6S44 91 38 96Z" fill="${d}"/>` + crew +
        `<path d="M55 97V108M65 97V108" stroke="${light ? d : l}" stroke-width="1.6" stroke-linecap="round"/><circle cx="55" cy="109" r="1.4" fill="${light ? d : l}"/><circle cx="65" cy="109" r="1.4" fill="${light ? d : l}"/>`;
      default: return torso + crew;
    }
  }

  function accessory(x, hidden, P, fab) {
    switch (x) {
      case 1: return `<g fill="none" stroke="#1D1B26" stroke-width="1.7"><circle cx="51" cy="58" r="6.4" fill="rgba(255,255,255,.14)"/><circle cx="69" cy="58" r="6.4" fill="rgba(255,255,255,.14)"/><path d="M57.4 57.4Q60 55.6 62.6 57.4M44.6 57L40 55.4M75.4 57L80 55.4"/></g>`;
      case 2: return `<defs><linearGradient id="${P}sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2540"/><stop offset="1" stop-color="#0E0C16"/></linearGradient><clipPath id="${P}sc"><path d="M43.6 54h14.2c.6 0 1 .4 1 1v2.6c0 3.6-2.8 6.4-6.4 6.4h-2.4c-3.6 0-6.4-2.8-6.4-6.4V55c0-.6.4-1 1-1zM62.2 54h14.2c.6 0 1 .4 1 1v2.6c0 3.6-2.8 6.4-6.4 6.4h-2.4c-3.6 0-6.4-2.8-6.4-6.4V55c0-.6.4-1 1-1z"/></clipPath></defs>` +
        `<path d="M43.6 54h14.2c.6 0 1 .4 1 1v2.6c0 3.6-2.8 6.4-6.4 6.4h-2.4c-3.6 0-6.4-2.8-6.4-6.4V55c0-.6.4-1 1-1zM62.2 54h14.2c.6 0 1 .4 1 1v2.6c0 3.6-2.8 6.4-6.4 6.4h-2.4c-3.6 0-6.4-2.8-6.4-6.4V55c0-.6.4-1 1-1z" fill="url(#${P}sg)"/>` +
        `<path d="M58.8 56.4Q60 55.4 61.2 56.4M42.6 55L39.6 54M77.4 55L80.4 54" stroke="#0E0C16" stroke-width="1.6" fill="none"/>` +
        `<g clip-path="url(#${P}sc)"><path class="cav-glint" d="M36 70L48 46h4L40 70z" fill="#fff" opacity=".45"/></g>`;
      case 3: return hidden ? '' : `<circle cx="39.6" cy="66.6" r="3.4" fill="none" stroke="#E9B949" stroke-width="1.5"/><circle cx="80.4" cy="66.6" r="3.4" fill="none" stroke="#E9B949" stroke-width="1.5"/>`;
      case 4: return `<path d="M36.6 58C35.4 34 47 25.4 60 25.4S84.6 34 83.4 58" fill="none" stroke="#1F1D2B" stroke-width="3.6" stroke-linecap="round"/><rect x="32.4" y="52" width="9" height="14" rx="4.4" fill="#1F1D2B"/><rect x="78.6" y="52" width="9" height="14" rx="4.4" fill="#1F1D2B"/><rect x="34.2" y="54.4" width="3" height="9" rx="1.5" fill="${fab}"/><rect x="82.8" y="54.4" width="3" height="9" rx="1.5" fill="${fab}"/>`;
      case 5: return `<ellipse cx="60" cy="38" rx="34" ry="7.6" fill="#B08B57"/><path d="M42 38C42 24 50 18.6 60 18.6S78 24 78 38Z" fill="#C8A36B"/><path d="M42.4 33.4Q60 38 77.6 33.4L78 38Q60 42 42 38Z" fill="#6E4B24"/><path d="M47 25Q60 21 73 25" fill="none" stroke="#DDBE8A" stroke-width="1.2" stroke-linecap="round"/>`;
      case 6: return `<g transform="translate(78 37)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-4.6" rx="3.3" ry="5" transform="rotate(${a})" fill="#FFF6E8"/>`).join('')}<circle r="2.6" fill="#F5B12E"/></g>`;
      case 7: {
        const cols = ['#E0453A', '#2F6FE0', '#fff', '#F5B12E', '#1E9E6A'];
        return [0, 1, 2].map(i => `<path d="M${44 - i * 4} ${89 + i * 3.4}Q60 ${101 + i * 4.4} ${76 + i * 4} ${89 + i * 3.4}" fill="none" stroke="${cols[i]}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="3.6 1.4"/>`).join('') +
          `<path d="M42 90.8Q60 103.6 78 90.8" fill="none" stroke="${cols[3]}" stroke-width="1.4" stroke-dasharray="1 3" stroke-linecap="round"/>`;
      }
      case 8: return `<path d="M37 50C36 30 46 21.6 60 21.6S84 30 83 50Z" fill="${fab}"/><rect x="35.4" y="45" width="49.2" height="9" rx="4.5" fill="${shade(fab, -.18)}"/><path d="M41 49.4H79" stroke="${shade(fab, .25)}" stroke-width="1.2" stroke-dasharray="1.6 2" stroke-linecap="round"/><circle cx="60" cy="19.4" r="4.2" fill="${shade(fab, .2)}"/>`;
      default: return '';
    }
  }

  function person(sp, P, r) {
    const skin = SKIN[sp.s] || SKIN[4];
    const skinDark = shade(skin, -.16), skinDeep = shade(skin, -.3);
    const hc = HAIR[sp.hc] || HAIR[0];
    const fab = FABRIC[sp.fc] || FABRIC[0];
    const oc = OUTFIT[sp.o] || OUTFIT[0];
    const hair = hairLayers(sp.h, hc, fab, P);
    const covered = sp.h === 11 || sp.h === 12;
    const x = covered && (sp.x === 5 || sp.x === 8) ? 0 : sp.x;
    const lip = shade(skin, -.45);
    const ey = eyes(sp.e, 58, 51, 69, skinDark);
    const brow = shade(hc === HAIR[5] ? '#6B6763' : hc, -.1);
    const fh = sp.f === 1 ? `<path d="M39.5 58C40 78 49 86 60 86S80 78 80.5 58C79 66 76 70 71 72C67 69 53 69 49 72C44 70 41 66 39.5 58Z" fill="${hc}" opacity=".26"/>`
      : sp.f === 2 ? `<path d="M39.5 58C40 79 49 87.4 60 87.4S80 79 80.5 58C79 66 76 70.4 71 72.4C67 69 53 69 49 72.4C44 70.4 41 66 39.5 58Z" fill="${hc}"/><path d="M52.6 70.2C55.4 67.4 58.6 68.2 60 69C61.4 68.2 64.6 67.4 67.4 70.2" fill="none" stroke="${hc}" stroke-width="2.6" stroke-linecap="round"/>`
      : sp.f === 3 ? `<path d="M52 69.6C55 66.4 58.6 67.4 60 68.4C61.4 67.4 65 66.4 68 69.6C64 69.6 62 70 60 70.6C58 70 56 69.6 52 69.6Z" fill="${hc}"/>` : '';
    const head = `<g class="cav-head">` +
      (hair.noEars ? '' : `<ellipse cx="39.4" cy="58.4" rx="4.3" ry="6" fill="${skinDark}"/><ellipse cx="80.6" cy="58.4" rx="4.3" ry="6" fill="${skinDark}"/><path d="M38.6 56q1.6 2.4 0 4.8M81.4 56q-1.6 2.4 0 4.8" fill="none" stroke="${skinDeep}" stroke-width="1" opacity=".6"/>`) +
      `<ellipse cx="60" cy="56" rx="21" ry="24" fill="${skin}"/>` +
      `<ellipse cx="51.6" cy="45.6" rx="8" ry="4.4" fill="#fff" opacity=".07"/>` +
      `<circle cx="46.2" cy="66" r="3.8" fill="#FF6E6E" opacity=".2"/><circle cx="73.8" cy="66" r="3.8" fill="#FF6E6E" opacity=".2"/>` +
      fh +
      `<path d="M42 55C41 43 48 36 57 35" fill="none" stroke="${shade(skin, .45)}" stroke-width="1.1" stroke-linecap="round" opacity=".35"/>` +
      `<g class="cav-eyes${ey.open ? '' : ' cav-noblink'}" style="transform-origin:60px 58px"><g class="cav-gaze">${ey.s}</g></g>` +
      `<path class="cav-brows" d="M46.6 50.6Q51 48 55.4 50M64.6 50Q69 48 73.4 50.6" fill="none" stroke="${brow}" stroke-width="1.9" stroke-linecap="round"/>` +
      `<path d="M58.2 64.6Q60 66.2 61.8 64.6" fill="none" stroke="${skinDeep}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<g class="cav-mouth">${mouth(sp.m, 71, lip)}</g>` +
      hair.front + (x === 7 ? '' : accessory(x, hair.noEars, P, fab)) + `</g>`;
    // The beaded collar sits on the chest, so it belongs to the torso layer.
    return `<g class="cav-body">` +
      `<g class="cav-head">${hair.back}</g>` +
      `<path d="M51 73.6H69V88C63 93.4 57 93.4 51 88Z" fill="${skinDark}"/>` +
      outfit(sp.w, oc, skinDark, P) +
      (hair.drape || '') + (x === 7 ? accessory(7, false, P, fab) : '') +
      `<path d="M24 110Q30 99 40 96M80 101l7 4" fill="none" stroke="${shade(oc, .45)}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>` +
      head + joint('cav-hand', 88, 102, `<path d="M84 110L83 91Q81 86 82 79L79 71Q78 68 80 67Q82 66 84 71L86 76L85 64Q85 61 87 61Q90 61 90 65L91 73L93 63Q94 60 96 62Q98 63 97 66L96 75L100 68Q102 66 104 68Q105 70 103 73L99 82Q101 86 98 91L95 111Z" fill="${skin}"/><path d="M87 81Q93 79 96 84M87 88l5 1" fill="none" stroke="${skinDark}" stroke-width="1.2" stroke-linecap="round"/><path d="M82 103L97 102L99 116L82 118Z" fill="${oc}"/><path d="M83 104l12-.8" stroke="${shade(oc, .45)}" stroke-width="1.2"/>`) + `</g>`;
  }

  /* ════════════════════════════════════════════════════════════════
     ANIMAL SPIRITS
     ════════════════════════════════════════════════════════════════ */
  const ANIMALS = [
    { id: 'simba', name: 'Simba', trait: 'Brave heart', what: 'Lion' },
    { id: 'tembo', name: 'Tembo', trait: 'Gentle giant', what: 'Elephant' },
    { id: 'twiga', name: 'Twiga', trait: 'Sees far ahead', what: 'Giraffe' },
    { id: 'milia', name: 'Milia', trait: 'One of a kind', what: 'Zebra' },
    { id: 'duma', name: 'Duma', trait: 'Always on the move', what: 'Cheetah' },
    { id: 'heroe', name: 'Heroe', trait: 'Stands out, beautifully', what: 'Flamingo' },
    { id: 'kasa', name: 'Kasa', trait: 'Slow travel, deep stories', what: 'Sea turtle' },
    { id: 'bundi', name: 'Bundi', trait: 'Night owl', what: 'Owl' },
    { id: 'kiboko', name: 'Kiboko', trait: 'Chills by the water', what: 'Hippo' },
    { id: 'faru', name: 'Faru', trait: 'Steady and strong', what: 'Rhino' },
    { id: 'kinyonga', name: 'Kinyonga', trait: 'At home anywhere', what: 'Chameleon' },
    { id: 'mbega', name: 'Mbega', trait: 'Treetop explorer', what: 'Colobus monkey' },
    { id: 'fenna', name: 'Fenna', trait: 'Little ears, big adventures', what: 'Fennec fox' },
    { id: 'maple', name: 'Maple', trait: 'Cosy troublemaker', what: 'Red panda' },
    { id: 'kito', name: 'Kito', trait: 'Finds joy in the little things', what: 'Otter' },
    { id: 'pico', name: 'Pico', trait: 'Dressed for every adventure', what: 'Penguin' },
    { id: 'lumi', name: 'Lumi', trait: 'Wide-eyed night explorer', what: 'Bushbaby' },
    { id: 'zuri', name: 'Zuri', trait: 'Better with the whole pack', what: 'African wild dog' },
    { id: 'taj', name: 'Taj', trait: 'A little extra, always', what: 'Peacock' },
    { id: 'tide', name: 'Tide', trait: 'Good vibes come in waves', what: 'Dolphin' }
  ];
  OPTIONS.animal = ANIMALS.map((a, i) => ({ v: i, name: a.name, trait: a.trait, what: a.what }));

  function dotEyes(lx, rx, y, r, fill, glint) {
    const one = x => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill || EYE}"/>` + (glint === false ? '' : `<circle cx="${f1(x + r * .35)}" cy="${f1(y - r * .35)}" r="${f1(r * .32)}" fill="#fff" opacity=".9"/>`);
    return `<g class="cav-eyes" style="transform-origin:60px ${y}px"><g class="cav-gaze">${one(lx)}${rx != null ? one(rx) : ''}</g></g>`;
  }
  function critterAccessory(x, P, geo) {
    const g = geo || { ey: 55, lx: 52, rx: 68, top: 34, neck: 92 };
    switch (x) {
      case 1: {
        const w = 12, h = 7.4, y = g.ey - 3.4;
        const lens = cx => `M${cx - w / 2} ${y}h${w}v2.4c0 2.8-2.2 5-5 5h-2c-2.8 0-5-2.2-5-5z`;
        return `<defs><clipPath id="${P}ac">${`<path d="${lens(g.lx)}${g.rx != null ? lens(g.rx) : ''}"/>`}</clipPath></defs><path d="${lens(g.lx)}${g.rx != null ? lens(g.rx) : ''}" fill="#16131F"/>` +
          (g.rx != null ? `<path d="M${g.lx + w / 2} ${y + 1}Q60 ${y - 1} ${g.rx - w / 2} ${y + 1}" stroke="#16131F" stroke-width="1.6" fill="none"/>` : '') +
          `<g clip-path="url(#${P}ac)"><path class="cav-glint" d="M${g.lx - 14} ${y + 12}L${g.lx - 4} ${y - 6}h3.4L${g.lx - 10.6} ${y + 12}z" fill="#fff" opacity=".45"/></g>` + (h ? '' : '');
      }
      case 2: return `<g transform="translate(0 ${g.top - 36})"><ellipse cx="60" cy="36" rx="28" ry="6.4" fill="#B08B57"/><path d="M45 36C45 24 51.6 19.4 60 19.4S75 24 75 36Z" fill="#C8A36B"/><path d="M45.3 32Q60 36 74.7 32L75 36Q60 39.6 45 36Z" fill="#6E4B24"/></g>`;
      case 3: return `<g transform="translate(${g.flx || 76} ${g.fly || g.top + 2})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-4.2" rx="3" ry="4.6" transform="rotate(${a})" fill="#FFF6E8"/>`).join('')}<circle r="2.4" fill="#F5B12E"/></g>`;
      case 4: return `<path d="M${g.hl || 34} ${g.ey + 4}C${(g.hl || 34) - 1} ${g.top - 8} ${(g.hr || 86) + 1} ${g.top - 8} ${g.hr || 86} ${g.ey + 4}" fill="none" stroke="#1F1D2B" stroke-width="3.6" stroke-linecap="round"/><rect x="${(g.hl || 34) - 5}" y="${g.ey - 3}" width="9.4" height="14" rx="4.6" fill="#1F1D2B"/><rect x="${(g.hr || 86) - 4.4}" y="${g.ey - 3}" width="9.4" height="14" rx="4.6" fill="#1F1D2B"/>`;
      case 5: return `<g transform="translate(60 ${g.neck})"><path d="M-2 0L-11 -5.6V5.6ZM2 0L11 -5.6V5.6Z" fill="#E0457B"/><circle r="2.6" fill="#B8325E"/></g>`;
      default: return '';
    }
  }

  function animal(sp, P, r) {
    const T = c => tint(c, sp.t);
    const blush = (x, y) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#FF6E8A" opacity=".22"/>`;
    const ringCircles = (cx, cy, R, n, rad, fill) => { let s = ''; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; s += `<circle cx="${f1(cx + Math.cos(t) * R)}" cy="${f1(cy + Math.sin(t) * R)}" r="${rad}" fill="${fill}"/>`; } return s; };
    let body = '', head = '', geo = { ey: 55, lx: 52, rx: 68, top: 34, neck: 92 };
    switch (sp.a) {
      case 0: { // lion
        const mane = T('#C8702A'), face = T('#F2B45C'), muz = '#FBE8CB';
        body = `<path d="M22 121C24 101 40 91 60 91S96 101 98 121Z" fill="${T('#E9A84E')}"/>`;
        head = `<circle cx="60" cy="56" r="27" fill="${mane}"/>${ringCircles(60, 56, 26, 14, 9.6, mane)}${ringCircles(60, 56, 23, 7, 2, shade(mane, .25))}` +
          joint('cav-ear-l', 44, 42, `<circle cx="42" cy="37" r="7" fill="${face}"/><circle cx="42" cy="37" r="3.4" fill="${shade(face, -.2)}"/>`) + joint('cav-ear-r', 76, 42, `<circle cx="78" cy="37" r="7" fill="${face}"/><circle cx="78" cy="37" r="3.4" fill="${shade(face, -.2)}"/>`) +
          `<circle cx="60" cy="58" r="21" fill="${face}"/>` + dotEyes(52, 68, 54, 2.7) + blush(47, 63) + blush(73, 63) +
          `<ellipse cx="54.2" cy="67.6" rx="7" ry="5.4" fill="${muz}"/><ellipse cx="65.8" cy="67.6" rx="7" ry="5.4" fill="${muz}"/><ellipse cx="60" cy="73.6" rx="4.6" ry="2.8" fill="${muz}"/>` +
          `<path d="M55 61.8Q60 60 65 61.8Q62.6 66.2 60 66.8Q57.4 66.2 55 61.8Z" fill="#5A2E1E"/><path d="M60 66.8V69.4M60 69.4Q57 72 54.6 70M60 69.4Q63 72 65.4 70" fill="none" stroke="#5A2E1E" stroke-width="1.4" stroke-linecap="round"/>` +
          `<g fill="${shade(face, -.3)}"><circle cx="51" cy="67" r=".7"/><circle cx="53" cy="69.4" r=".7"/><circle cx="69" cy="67" r=".7"/><circle cx="67" cy="69.4" r=".7"/></g>`;
        geo = { ey: 54, lx: 52, rx: 68, top: 30, neck: 91, flx: 80, fly: 36, hl: 33, hr: 87 };
        break;
      }
      case 1: { // elephant
        const g = T('#9AA3AE'), gd = shade(g, -.14), ear = '#EDB7C0';
        body = `<path d="M22 121C24 101 40 92 60 92S96 101 98 121Z" fill="${gd}"/>`;
        head = joint('cav-ear-l', 43, 51, `<path d="M44 42C22 32 11 52 17 70C22 84 37 83 44 70Z" fill="${g}"/><path d="M41 47C27 42 21 55 25 67C28 76 37 75 41 67Z" fill="${ear}" opacity=".8"/>`) +
          joint('cav-ear-r', 77, 51, `<path d="M76 42C98 32 109 52 103 70C98 84 83 83 76 70Z" fill="${g}"/><path d="M79 47C93 42 99 55 95 67C92 76 83 75 79 67Z" fill="${ear}" opacity=".8"/>`) +
          `<ellipse cx="60" cy="53" rx="21" ry="22" fill="${g}"/>` +
          joint('cav-trunk', 60, 62, `<path d="M53.6 62C53 78 50.6 92 57 101C60.4 105.6 66.4 102.6 64.2 97.6C60.6 90 64.6 79 66.4 62Z" fill="${g}"/><path d="M55 78h9M54.6 84h8.4M55.6 90h7.4" stroke="${gd}" stroke-width="1.2" stroke-linecap="round"/>`) +
          `<path d="M49.6 69C46.4 75.4 47.4 80 50.6 80C51.6 76 52.4 73 53.6 70Z" fill="#FFF8EC"/><path d="M70.4 69C73.6 75.4 72.6 80 69.4 80C68.4 76 67.6 73 66.4 70Z" fill="#FFF8EC"/>` +
          dotEyes(51, 69, 51, 2.6) + blush(46, 60) + blush(74, 60) +
          `<path d="M46.8 45.4Q51 43 55 45M65 45Q69 43 73.2 45.4" fill="none" stroke="${gd}" stroke-width="1.5" stroke-linecap="round"/>`;
        geo = { ey: 51, lx: 51, rx: 69, top: 32, neck: 93, flx: 76, fly: 38, hl: 38, hr: 82 };
        break;
      }
      case 2: { // giraffe
        const coat = T('#F2B54A'), spot = T('#B8692A'), muz = '#F8DCAC', horn = T('#8A5A2B');
        const spots = (pts) => pts.map(p => `<path d="M${p[0]} ${p[1] - 3}q${p[2]} -1 ${p[2] + 1} ${p[2] * .6}q-1 ${p[2] * .8} -${p[2] + .6} ${p[2] * .5}q-${p[2] * .6} -1 -1 -${p[2] * 1.1}z" fill="${spot}"/>`).join('');
        body = `<path d="M47 121L51 74H69L73 121Z" fill="${coat}"/>` + spots([[53, 88, 4], [63, 84, 3.6], [57, 100, 4.4], [66, 106, 4], [52, 114, 3.6], [64, 96, 3]]);
        head = `<path d="M53 33L51 22M67 33L69 22" stroke="${horn}" stroke-width="3.4" stroke-linecap="round"/><circle cx="51" cy="21.4" r="3.2" fill="${shade(horn, -.2)}"/><circle cx="69" cy="21.4" r="3.2" fill="${shade(horn, -.2)}"/>` +
          joint('cav-ear-l', 49, 44, `<ellipse cx="41.6" cy="41" rx="8.4" ry="3.6" transform="rotate(-24 41.6 41)" fill="${coat}"/><ellipse cx="42.4" cy="41" rx="5" ry="1.8" transform="rotate(-24 42.4 41)" fill="#F7C8B7"/>`) + joint('cav-ear-r', 71, 44, `<ellipse cx="78.4" cy="41" rx="8.4" ry="3.6" transform="rotate(24 78.4 41)" fill="${coat}"/><ellipse cx="77.6" cy="41" rx="5" ry="1.8" transform="rotate(24 77.6 41)" fill="#F7C8B7"/>`) +
          `<ellipse cx="60" cy="52" rx="16.4" ry="20" fill="${coat}"/>` + spots([[52, 38, 3], [68, 40, 2.6], [60, 34, 2.2]]) +
          `<ellipse cx="60" cy="66" rx="12.6" ry="9.6" fill="${muz}"/><ellipse cx="55.6" cy="64.6" rx="1.4" ry="2" fill="${shade(spot, -.2)}"/><ellipse cx="64.4" cy="64.6" rx="1.4" ry="2" fill="${shade(spot, -.2)}"/><path d="M55 70.4Q60 73.6 65 70.4" fill="none" stroke="${shade(spot, -.2)}" stroke-width="1.5" stroke-linecap="round"/>` +
          `<g class="cav-eyes" style="transform-origin:60px 50px"><circle cx="53" cy="50" r="2.6" fill="${EYE}"/><circle cx="67" cy="50" r="2.6" fill="${EYE}"/><circle cx="53.9" cy="49.1" r=".8" fill="#fff"/><circle cx="67.9" cy="49.1" r=".8" fill="#fff"/><path d="M49.6 48.2l-1.6-1.2M50.6 47l-.8-1.6M70.4 48.2l1.6-1.2M69.4 47l.8-1.6" stroke="${EYE}" stroke-width="1" stroke-linecap="round"/></g>` + blush(49, 58) + blush(71, 58);
        geo = { ey: 50, lx: 53, rx: 67, top: 30, neck: 80, flx: 73, fly: 33, hl: 40, hr: 80 };
        break;
      }
      case 3: { // zebra
        const w = T('#F7F6F2'), k = '#1E1E26', muz = '#3A3A44';
        body = `<defs><clipPath id="${P}zb"><path d="M24 121C26 101 42 92 60 92S94 101 96 121Z"/></clipPath><clipPath id="${P}zh"><ellipse cx="60" cy="54" rx="17" ry="22"/></clipPath></defs>` +
          `<path d="M24 121C26 101 42 92 60 92S94 101 96 121Z" fill="${w}"/><g clip-path="url(#${P}zb)" fill="${k}">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${14 + i * 16} 92q6 14 -2 30h6q8-16 2-30z"/>`).join('')}</g>`;
        head = `<path d="M60 26L54 38H66Z" fill="${k}"/><path d="M52 34L60 22L68 34L64 44H56Z" fill="${k}"/><path d="M56 30l4-6 4 6" fill="none" stroke="${w}" stroke-width="1.4"/>` +
          joint('cav-ear-l', 47, 43, `<ellipse cx="44.6" cy="36" rx="4" ry="8.4" transform="rotate(-28 44.6 36)" fill="${w}" stroke="${k}" stroke-width="1.4"/>`) + joint('cav-ear-r', 73, 43, `<ellipse cx="75.4" cy="36" rx="4" ry="8.4" transform="rotate(28 75.4 36)" fill="${w}" stroke="${k}" stroke-width="1.4"/>`) +
          `<ellipse cx="60" cy="54" rx="17" ry="22" fill="${w}"/><g clip-path="url(#${P}zh)" fill="${k}"><path d="M40 38q20 8 40 0v4q-20 8-40 0z"/><path d="M40 46q8 2 11 1q-3 3-11 3z"/><path d="M80 46q-8 2-11 1q3 3 11 3z"/><path d="M40 57q7 1 9 -1q-2 4-9 5z"/><path d="M80 57q-7 1-9-1q2 4 9 5z"/><path d="M54 30q6 4 12 0v3q-6 4-12 0z"/></g>` +
          `<ellipse cx="60" cy="69" rx="12.4" ry="9" fill="${muz}"/><ellipse cx="55.4" cy="67.4" rx="1.8" ry="2.2" fill="#15151B"/><ellipse cx="64.6" cy="67.4" rx="1.8" ry="2.2" fill="#15151B"/><path d="M55.6 73Q60 75.6 64.4 73" fill="none" stroke="#9A9AA6" stroke-width="1.3" stroke-linecap="round"/>` +
          dotEyes(52.6, 67.4, 52, 2.5) + blush(48, 60) + blush(72, 60);
        geo = { ey: 52, lx: 52.6, rx: 67.4, top: 30, neck: 92, flx: 72, fly: 32, hl: 40, hr: 80 };
        break;
      }
      case 4: { // cheetah
        const coat = T('#E8B04A'), white = '#FCF1DA', spot = '#3B2A1E';
        body = `<path d="M22 121C24 101 40 91 60 91S96 101 98 121Z" fill="${coat}"/>` + [[38, 104], [50, 110], [70, 108], [84, 104], [60, 99], [44, 116], [76, 116]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2" fill="${spot}"/>`).join('');
        head = `<path d="M40 44A9 9 0 0 1 48 32Z" fill="${spot}"/><path d="M80 44A9 9 0 0 0 72 32Z" fill="${spot}"/><circle cx="44.6" cy="38.6" r="6.4" fill="${coat}"/><circle cx="75.4" cy="38.6" r="6.4" fill="${coat}"/><circle cx="44.6" cy="38.6" r="3" fill="${white}"/><circle cx="75.4" cy="38.6" r="3" fill="${white}"/>` +
          `<circle cx="60" cy="56" r="22" fill="${coat}"/><path d="M42 62C44 76 52 80 60 80S76 76 78 62C72 68 66 66 60 66S48 68 42 62Z" fill="${white}"/>` +
          [[54, 40], [60, 37], [66, 40], [49, 45], [71, 45], [57, 44], [63, 44], [44, 53], [76, 53]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.3" fill="${spot}"/>`).join('') +
          `<path d="M50.4 57.4C49.6 63 50.6 67 53.4 70.4M69.6 57.4C70.4 63 69.4 67 66.6 70.4" fill="none" stroke="${spot}" stroke-width="2" stroke-linecap="round"/>` +
          `<g class="cav-eyes" style="transform-origin:60px 54px"><circle cx="52.4" cy="54" r="3.2" fill="#C98A1A"/><circle cx="67.6" cy="54" r="3.2" fill="#C98A1A"/><circle cx="52.4" cy="54" r="1.6" fill="${EYE}"/><circle cx="67.6" cy="54" r="1.6" fill="${EYE}"/><circle cx="53.4" cy="53" r=".7" fill="#fff"/><circle cx="68.6" cy="53" r=".7" fill="#fff"/></g>` +
          `<path d="M56 64Q60 62.4 64 64Q62 67.6 60 68Q58 67.6 56 64Z" fill="#2E1E16"/><path d="M60 68V70.4M60 70.4Q57.4 72.6 55.4 71M60 70.4Q62.6 72.6 64.6 71" fill="none" stroke="#2E1E16" stroke-width="1.3" stroke-linecap="round"/>`;
        geo = { ey: 54, lx: 52.4, rx: 67.6, top: 33, neck: 91, flx: 77, fly: 36, hl: 36, hr: 84 };
        break;
      }
      case 5: { // flamingo
        const pink = T('#F48AAE'), deep = shade(pink, -.14), beak = '#FFE9EF';
        body = `<ellipse cx="78" cy="116" rx="32" ry="17" fill="${pink}"/><path d="M60 108Q76 102 98 110M64 115Q80 110 100 117" fill="none" stroke="${deep}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>` +
          `<path d="M72 118C74 100 50 92 50 76C50 62 58 56 58 50" fill="none" stroke="${pink}" stroke-width="12" stroke-linecap="round"/>`;
        head = `<circle cx="56" cy="46" r="13.6" fill="${pink}"/>` +
          `<path d="M63 45C73 45 80 49.6 80 57C80 64 74 67 70.6 64.4C73 60.6 71.6 55.4 64 53.4Z" fill="${beak}"/><path d="M80 57C80 64 74 67 70.6 64.4C73 62.8 74.6 60 75 57.4Z" fill="#26232E"/>` +
          `<g class="cav-eyes" style="transform-origin:54px 43px"><circle cx="54" cy="43" r="2.7" fill="${EYE}"/><circle cx="54.9" cy="42.1" r=".8" fill="#fff"/></g><circle cx="50" cy="50" r="3.4" fill="#FF6E8A" opacity=".25"/>`;
        geo = { ey: 43, lx: 54, rx: null, top: 30, neck: 88, flx: 50, fly: 33, hl: 42, hr: 70 };
        break;
      }
      case 6: { // sea turtle
        const shell = T('#2F855A'), plate = T('#3C9C6B'), skin = T('#93CFA1'), sd = shade(skin, -.18);
        body = `<ellipse cx="22" cy="104" rx="14" ry="6" transform="rotate(-30 22 104)" fill="${skin}"/><ellipse cx="98" cy="104" rx="14" ry="6" transform="rotate(30 98 104)" fill="${skin}"/>` +
          `<path d="M18 121C18 96 38 82 60 82S102 96 102 121Z" fill="${shell}"/>` +
          `<path d="M60 86l10 6v11l-10 6-10-6V92z" fill="${plate}"/><path d="M40 94l8 5v9l-8 5-8-5v-9zM80 94l8 5v9l-8 5-8-5v-9z" fill="${plate}"/><path d="M60 112l8 5v6H52v-6z" fill="${plate}"/>`;
        head = `<ellipse cx="60" cy="58" rx="19" ry="21" fill="${skin}"/>` + [[50, 44, 2.4], [70, 45, 2], [60, 40, 2.6], [45, 60, 1.8], [75, 60, 1.8]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${sd}" opacity=".7"/>`).join('') +
          dotEyes(51.6, 68.4, 56, 3.2) + blush(47, 65) + blush(73, 65) +
          `<path d="M53 69Q60 74.6 67 69" fill="none" stroke="${shade(skin, -.45)}" stroke-width="1.8" stroke-linecap="round"/>`;
        geo = { ey: 56, lx: 51.6, rx: 68.4, top: 38, neck: 82, flx: 74, fly: 42, hl: 40, hr: 80 };
        break;
      }
      case 7: { // owl
        const b = T('#8B5E3C'), bd = shade(b, -.18), disc = '#F3E3C6', belly = T('#D9B98D');
        body = `<ellipse cx="60" cy="96" rx="34" ry="30" fill="${b}"/><ellipse cx="60" cy="104" rx="20" ry="18" fill="${belly}"/>` +
          [[52, 98], [60, 96], [68, 98], [56, 106], [64, 106], [60, 113]].map(p => `<path d="M${p[0] - 3} ${p[1]}q3 3 6 0" fill="none" stroke="${bd}" stroke-width="1.4" stroke-linecap="round"/>`).join('') +
          joint('cav-flipper-l', 30, 82, `<ellipse cx="28" cy="100" rx="9" ry="20" transform="rotate(12 28 100)" fill="${bd}"/>`) + joint('cav-flipper-r', 90, 82, `<ellipse cx="92" cy="100" rx="9" ry="20" transform="rotate(-12 92 100)" fill="${bd}"/>`);
        head = `<path d="M34 42L38 24L50 36Z" fill="${bd}"/><path d="M86 42L82 24L70 36Z" fill="${bd}"/><ellipse cx="60" cy="58" rx="28" ry="25" fill="${b}"/>` +
          `<circle cx="48.6" cy="58" r="12" fill="${disc}"/><circle cx="71.4" cy="58" r="12" fill="${disc}"/>` +
          `<g class="cav-eyes" style="transform-origin:60px 58px"><circle cx="48.6" cy="58" r="7.4" fill="#F5B12E"/><circle cx="71.4" cy="58" r="7.4" fill="#F5B12E"/><circle cx="48.6" cy="58" r="4.2" fill="${EYE}"/><circle cx="71.4" cy="58" r="4.2" fill="${EYE}"/><circle cx="50" cy="56.4" r="1.3" fill="#fff"/><circle cx="72.8" cy="56.4" r="1.3" fill="#fff"/></g>` +
          `<path d="M57 66L60 72.6L63 66Q60 64.6 57 66Z" fill="#E6A23C"/>`;
        geo = { ey: 58, lx: 48.6, rx: 71.4, top: 30, neck: 84, flx: 80, fly: 36, hl: 30, hr: 90 };
        break;
      }
      case 8: { // hippo
        const g = T('#A394B3'), gd = shade(g, -.16), muz = T('#E3BFCB');
        body = `<path d="M18 121C20 100 38 90 60 90S100 100 102 121Z" fill="${gd}"/>`;
        head = `<ellipse cx="42" cy="37" rx="5" ry="6" fill="${g}"/><ellipse cx="78" cy="37" rx="5" ry="6" fill="${g}"/><ellipse cx="42" cy="37.6" rx="2.4" ry="3.2" fill="${muz}"/><ellipse cx="78" cy="37.6" rx="2.4" ry="3.2" fill="${muz}"/>` +
          `<ellipse cx="60" cy="52" rx="23" ry="19" fill="${g}"/><circle cx="50" cy="44" r="6" fill="${g}"/><circle cx="70" cy="44" r="6" fill="${g}"/>` +
          dotEyes(50, 70, 44.4, 2.6) +
          `<ellipse cx="60" cy="70" rx="27" ry="16" fill="${muz}"/><ellipse cx="51" cy="64" rx="2.4" ry="3" fill="${shade(muz, -.35)}"/><ellipse cx="69" cy="64" rx="2.4" ry="3" fill="${shade(muz, -.35)}"/>` +
          `<path d="M44 74Q60 84 76 74" fill="none" stroke="${shade(muz, -.35)}" stroke-width="1.7" stroke-linecap="round"/><rect x="47" y="75" width="3.4" height="4.4" rx="1" fill="#fff"/><rect x="69.6" y="75" width="3.4" height="4.4" rx="1" fill="#fff"/>` + blush(40, 70) + blush(80, 70);
        geo = { ey: 44.4, lx: 50, rx: 70, top: 32, neck: 90, flx: 76, fly: 33, hl: 34, hr: 86 };
        break;
      }
      case 9: { // rhino
        const g = T('#8E9AA6'), gd = shade(g, -.16), horn = '#EFE5D2';
        body = `<path d="M18 121C20 100 38 90 60 90S100 100 102 121Z" fill="${gd}"/>`;
        head = `<ellipse cx="42.4" cy="36" rx="4.6" ry="8" transform="rotate(-20 42.4 36)" fill="${g}"/><ellipse cx="77.6" cy="36" rx="4.6" ry="8" transform="rotate(20 77.6 36)" fill="${g}"/>` +
          `<ellipse cx="60" cy="58" rx="23" ry="22" fill="${g}"/><ellipse cx="60" cy="70" rx="18" ry="11" fill="${shade(g, .12)}"/>` +
          `<path d="M52.6 64C54.6 52 57.6 40 61.6 30.6C63 41 65.4 53 67.4 64Z" fill="${horn}"/><path d="M57 45.6C58 41.6 59.4 38.4 61 36C61.8 39.6 62.6 42.6 63.2 45.6Z" fill="${shade(horn, -.08)}"/>` +
          dotEyes(47.6, 72.4, 57, 2.4) + `<path d="M44 53.6Q47.6 52 51 53.6M69 53.6Q72.4 52 76 53.6" fill="none" stroke="${gd}" stroke-width="1.4" stroke-linecap="round"/>` +
          `<ellipse cx="54" cy="72" rx="1.6" ry="2.2" fill="${shade(g, -.45)}"/><ellipse cx="66" cy="72" rx="1.6" ry="2.2" fill="${shade(g, -.45)}"/><path d="M54 77.6Q60 80.4 66 77.6" fill="none" stroke="${shade(g, -.45)}" stroke-width="1.5" stroke-linecap="round"/>` + blush(44, 66) + blush(76, 66);
        geo = { ey: 57, lx: 47.6, rx: 72.4, top: 34, neck: 92, flx: 76, fly: 34, hl: 36, hr: 84 };
        break;
      }
      case 10: { // chameleon
        const g = T('#48BB78'), gd = shade(g, -.2), stripe = shade(g, .3);
        body = `<g class="cav-chroma"><path d="M30 121C32 104 44 94 62 94S96 104 98 121Z" fill="${g}"/><path d="M40 106h40M44 114h36" stroke="${stripe}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>` +
          joint('cav-tail', 95, 116, `<path d="M96 116C108 112 110 98 101 94C94 91 90 98 95 101C99 103 101 99 99 97" fill="none" stroke="${gd}" stroke-width="5" stroke-linecap="round"/>`) + `</g>`;
        head = `<g class="cav-chroma"><path d="M30 68C30 48 44 32 66 30C74 29.4 80 34 84 40C92 46 94 58 92 66C90 78 78 84 62 84C44 84 30 80 30 68Z" fill="${g}"/>` +
          `<path d="M60 30.6C68 22 80 24 84 40C77 36 70 34 60 30.6Z" fill="${gd}"/><path d="M36 60Q52 58 62 64" fill="none" stroke="${stripe}" stroke-width="2" stroke-linecap="round" opacity=".6"/>` +
          `<circle cx="71" cy="55" r="10.4" fill="${shade(g, .08)}"/><circle cx="71" cy="55" r="7" fill="none" stroke="${gd}" stroke-width="1.4"/><circle cx="71" cy="55" r="3.8" fill="none" stroke="${gd}" stroke-width="1.2"/></g>` +
          `<g class="cav-eyes" style="transform-origin:72.6px 55px"><circle cx="72.6" cy="55" r="2.8" fill="${EYE}"/><circle cx="73.4" cy="54.2" r=".8" fill="#fff"/></g>` +
          `<path d="M36 71Q50 78.4 70 73" fill="none" stroke="${shade(g, -.45)}" stroke-width="1.8" stroke-linecap="round"/>` + blush(58, 70);
        geo = { ey: 55, lx: 72.6, rx: null, top: 32, neck: 94, flx: 58, fly: 34, hl: 44, hr: 90 };
        break;
      }
      case 11: { // colobus
        const fur = T('#1F1F26'), white = '#F4F3EF', face = T('#A89C96');
        body = joint('cav-tail', 89, 109, `<path d="M88 115Q111 101 107 80Q104 68 97 72" fill="none" stroke="${white}" stroke-width="7" stroke-linecap="round"/>`) + `<path d="M20 121C22 100 40 90 60 90S98 100 100 121Z" fill="${fur}"/><path d="M26 121C28 104 36 96 44 94C40 104 40 112 42 121ZM94 121C92 104 84 96 76 94C80 104 80 112 78 121Z" fill="${white}"/>`;
        head = `<ellipse cx="60" cy="58" rx="28" ry="30" fill="${white}"/>${ringCircles(60, 60, 27, 16, 5.6, white)}` +
          `<path d="M36 50C36 34 46 26 60 26S84 34 84 50C78 44 70 42 60 42S42 44 36 50Z" fill="${fur}"/>` +
          `<ellipse cx="60" cy="60" rx="15.6" ry="17.4" fill="${face}"/>` + dotEyes(54, 66, 56, 2.6) +
          `<path d="M50.6 52Q54 50 57.4 51.6M62.6 51.6Q66 50 69.4 52" fill="none" stroke="${shade(face, -.4)}" stroke-width="1.6" stroke-linecap="round"/>` +
          `<ellipse cx="60" cy="64" rx="2.6" ry="1.8" fill="${shade(face, -.4)}"/><path d="M55 69.6Q60 73.4 65 69.6" fill="none" stroke="${shade(face, -.45)}" stroke-width="1.6" stroke-linecap="round"/>` + blush(50, 64) + blush(70, 64);
        geo = { ey: 56, lx: 54, rx: 66, top: 28, neck: 90, flx: 78, fly: 34, hl: 32, hr: 88 };
        break;
      }
      case 12: { // fennec: silk-lined ears and a sweeping cream-tipped tail
        const coat = T('#E9AF73'), cream = T('#FFF0D2'), pink = T('#E8A5A1');
        body = joint('cav-tail', 81, 102, `<path d="M78 114C107 117 112 94 100 80C105 100 85 89 80 99Z" fill="${coat}"/><path d="M100 80C108 87 110 98 105 105Q95 101 95 95Q103 94 100 80Z" fill="${cream}"/>`) + `<path d="M29 122Q31 87 60 88Q89 87 91 122Z" fill="${coat}"/><path d="M48 91Q60 84 72 91L77 121H43Z" fill="${cream}"/>`;
        head = joint('cav-ear-l', 45, 47, `<path d="M40 53C26 43 23 23 28 14Q45 19 51 43Z" fill="${coat}"/><path d="M39 44Q28 32 30 20Q41 24 45 42Z" fill="${pink}"/><path d="M34 27l4 11" stroke="${cream}" stroke-width="2" stroke-linecap="round"/>`) + joint('cav-ear-r', 75, 47, `<path d="M80 53C94 43 97 23 92 14Q75 19 69 43Z" fill="${coat}"/><path d="M81 44Q92 32 90 20Q79 24 75 42Z" fill="${pink}"/>`) +
          `<path d="M34 50Q37 34 60 35Q83 34 86 50L91 65L82 64Q77 82 60 83Q43 82 38 64L29 65Z" fill="${coat}"/><path d="M37 57Q49 59 60 70Q71 59 83 57Q83 77 60 83Q37 77 37 57Z" fill="${cream}"/><path d="M48 45l8-2M65 43l8 2" stroke="${cream}" stroke-width="3.3" stroke-linecap="round"/>` + dotEyes(49, 71, 54, 3.6) + blush(43, 62) + blush(77, 62) + `<path d="M55 67Q60 64 65 67Q64 72 60 73Q56 72 55 67Z" fill="#4B302C"/><path d="M60 73v2m-6 0q6 5 12 0" fill="none" stroke="#6C4336" stroke-width="1.5" stroke-linecap="round"/>`;
        geo = { ey: 54, lx: 49, rx: 71, top: 33, neck: 91, hl: 33, hr: 87 };
        break;
      }
      case 13: { // red panda: eye masks, little mittens and a striped tail
        const red = T('#CA6540'), cream = T('#FFF0D9'), dark = T('#503F3E');
        body = joint('cav-tail', 84, 103, `<path d="M78 115Q115 118 109 86Q105 69 96 73Q88 78 96 91Q101 104 78 103Z" fill="${red}"/><path d="M94 82l14-5M96 94l15-2M91 105l12 9" stroke="${cream}" stroke-width="6"/>`) + `<path d="M28 122Q30 84 60 84Q90 84 92 122Z" fill="${dark}"/><path d="M39 88Q60 95 81 88L76 108Q60 113 44 108Z" fill="${red}"/>`;
        head = joint('cav-ear-l', 42, 42, `<path d="M31 46Q24 18 44 24L52 40Z" fill="${cream}"/><path d="M36 39Q30 25 42 30L47 40Z" fill="${dark}"/>`) + joint('cav-ear-r', 78, 42, `<path d="M89 46Q96 18 76 24L68 40Z" fill="${cream}"/><path d="M84 39Q90 25 78 30L73 40Z" fill="${dark}"/>`) +
          `<path d="M32 46Q40 31 60 33Q80 31 88 46L94 65L87 64L90 71L81 70Q75 84 60 85Q45 84 39 70L30 71L33 64L26 65Z" fill="${red}"/><path d="M32 56Q48 57 55 71L60 68L65 71Q72 57 88 56Q88 79 60 85Q32 79 32 56Z" fill="${cream}"/><path d="M42 49l9-2M69 47l9 2" stroke="${cream}" stroke-width="4" stroke-linecap="round"/><path d="M47 60l4 10M73 60l-4 10" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>` + dotEyes(48, 72, 55, 3.3) + `<ellipse cx="60" cy="68" rx="5" ry="3.7" fill="${dark}"/><path d="M60 71v3m-6 0q6 5 12 0" fill="none" stroke="${dark}" stroke-width="1.4" stroke-linecap="round"/>` + blush(40, 64) + blush(80, 64);
        body += joint('cav-paw', 85, 105, `<path d="M84 116Q92 101 89 92Q83 88 80 94L76 113Z" fill="${dark}"/><path d="M83 95l2 5M87 94l1 5" stroke="${cream}" stroke-width="1" opacity=".5"/>`);
        geo = { ey: 55, lx: 48, rx: 72, top: 33, neck: 89, hl: 31, hr: 89 };
        break;
      }
      case 14: { // otter: soft whiskers and a treasured sea-glass shell
        const fur = T('#95735B'), light = T('#E8CBA5'), dark = T('#5A4134');
        body = `<path d="M27 122Q27 83 60 83Q93 83 93 122Z" fill="${fur}"/><ellipse cx="60" cy="109" rx="22" ry="23" fill="${light}"/>` + joint('cav-treasure', 60, 106, `<path d="M46 111Q39 98 48 95Q51 86 58 92Q63 85 68 94Q78 92 77 102L70 112Z" fill="${T('#70D7C7')}"/><path d="M59 111l-8-14m10 14l1-17m1 17l8-13" stroke="#E4FFF3" stroke-width="1.3" stroke-linecap="round"/><path d="M30 103Q44 102 48 113M90 103Q76 102 72 113" fill="none" stroke="${fur}" stroke-width="12" stroke-linecap="round"/>`);
        head = joint('cav-ear-l', 36, 46, `<circle cx="35" cy="44" r="9" fill="${fur}"/><circle cx="35" cy="44" r="4.8" fill="${dark}"/>`) + joint('cav-ear-r', 84, 46, `<circle cx="85" cy="44" r="9" fill="${fur}"/><circle cx="85" cy="44" r="4.8" fill="${dark}"/>`) +
          `<ellipse cx="60" cy="58" rx="29" ry="27" fill="${fur}"/><path d="M39 61Q47 52 60 62Q73 52 81 61Q85 80 60 83Q35 80 39 61Z" fill="${light}"/><path d="M49 40q7-4 13-2" fill="none" stroke="${light}" stroke-width="2" opacity=".55" stroke-linecap="round"/>` + dotEyes(47, 73, 55, 3.3) +
          `<ellipse cx="60" cy="64" rx="5.6" ry="4" fill="${dark}"/><ellipse cx="58.4" cy="62.7" rx="1.7" ry=".9" fill="#fff" opacity=".65"/><path d="M60 68v3m-7 1q7 6 14 0M44 67l-12-1m12 5l-11 2m43-6l12-1m-12 5l11 2" fill="none" stroke="${dark}" stroke-width="1.3" stroke-linecap="round"/>` + blush(41, 62) + blush(79, 62);
        geo = { ey: 55, lx: 47, rx: 73, top: 32, neck: 88, hl: 30, hr: 90 };
        break;
      }
      case 15: { // penguin: a tiny tuxedo, bright beak and dancing flippers
        const ink = T('#28384D'), snow = T('#FFF4DF'), gold = T('#FFBD4C');
        body = joint('cav-flipper-l', 40, 90, `<path d="M38 87Q18 88 18 112Q29 111 44 96Z" fill="${ink}"/>`) + joint('cav-flipper-r', 80, 90, `<path d="M82 87Q102 88 102 112Q91 111 76 96Z" fill="${ink}"/>`) + `<ellipse cx="60" cy="105" rx="29" ry="31" fill="${ink}"/><ellipse cx="60" cy="108" rx="20" ry="26" fill="${snow}"/><path d="M39 118q8-5 16 0v4H37Zm26 0q8-5 16 0l2 4H65Z" fill="${gold}"/>`;
        head = `<path d="M32 59Q31 29 60 28Q89 29 88 59Q88 85 60 87Q32 85 32 59Z" fill="${ink}"/><path d="M60 49Q47 29 38 47Q30 75 60 83Q90 75 82 47Q73 29 60 49Z" fill="${snow}"/><path d="M51 31Q57 24 65 28l-3-6q11 2 12 10" fill="${ink}"/>` + dotEyes(47, 73, 57, 3.7) + blush(42, 66) + blush(78, 66) + `<path d="M51 67Q60 61 69 67Q65 75 60 76Q55 75 51 67Z" fill="${gold}"/><path d="M53 68Q60 70 67 68" fill="none" stroke="#CD792C" stroke-width="1.2"/>`;
        geo = { ey: 57, lx: 47, rx: 73, top: 29, neck: 88, hl: 31, hr: 89 };
        break;
      }
      case 16: { // bushbaby: luminous eyes, huge ears and a curled tail
        const fur = T('#AF92B3'), light = T('#F4D9D6'), dark = T('#705775');
        body = joint('cav-tail', 82, 103, `<path d="M77 116Q108 116 105 93Q102 80 93 87" fill="none" stroke="${fur}" stroke-width="12" stroke-linecap="round"/>`) + `<path d="M32 123Q31 85 60 85Q89 85 88 123Z" fill="${fur}"/><ellipse cx="60" cy="108" rx="17" ry="24" fill="${light}"/>`;
        head = joint('cav-ear-l', 38, 51, `<ellipse cx="30" cy="42" rx="15" ry="21" fill="${fur}"/><ellipse cx="29" cy="42" rx="10" ry="15" fill="${light}"/><path d="M25 34q8 4 7 13" fill="none" stroke="${dark}" stroke-width="1.4" opacity=".5"/>`) + joint('cav-ear-r', 82, 51, `<ellipse cx="90" cy="42" rx="15" ry="21" fill="${fur}"/><ellipse cx="91" cy="42" rx="10" ry="15" fill="${light}"/>`) +
          `<ellipse cx="60" cy="59" rx="28" ry="26" fill="${fur}"/><path d="M52 36l8-10 8 10" fill="${fur}"/><ellipse cx="47" cy="57" rx="13" ry="15" fill="${light}"/><ellipse cx="73" cy="57" rx="13" ry="15" fill="${light}"/><ellipse cx="60" cy="74" rx="12" ry="8" fill="${light}"/><g class="cav-eyes" style="transform-origin:60px 57px"><g class="cav-gaze">${[47, 73].map(x => `<circle cx="${x}" cy="57" r="9.4" fill="#9E622C"/><circle cx="${x}" cy="57" r="7.1" fill="${EYE}"/><circle cx="${x - 2.4}" cy="53.8" r="2.6" fill="#fff"/><circle cx="${x + 2.8}" cy="60.6" r="1" fill="#F8D694"/>`).join('')}</g></g><path d="M56 70q4-3 8 0q0 4-4 4q-4 0-4-4Z" fill="${dark}"/><path d="M56 78q4 3 8 0" fill="none" stroke="${dark}" stroke-width="1.3" stroke-linecap="round"/>` + blush(36, 70) + blush(84, 70);
        geo = { ey: 57, lx: 47, rx: 73, top: 31, neck: 90, hl: 28, hr: 92 };
        break;
      }
      case 17: { // painted dog: every patch belongs to this character
        const gold = T('#D39A54'), dark = T('#3C3337'), cream = T('#FFEDD0');
        body = joint('cav-tail', 85, 106, `<path d="M82 115Q108 108 100 87" fill="none" stroke="${dark}" stroke-width="9" stroke-linecap="round"/><path d="M102 98l-2-11" stroke="${cream}" stroke-width="9" stroke-linecap="round"/>`) + `<path d="M27 123Q29 85 60 86Q91 85 93 123Z" fill="${gold}"/><path d="M35 98Q45 87 51 91L60 123H34Z" fill="${dark}"/><path d="M58 86L74 90L72 109L60 121L54 104Z" fill="${cream}"/>`;
        head = joint('cav-ear-l', 41, 45, `<ellipse cx="33" cy="32" rx="13" ry="18" transform="rotate(-20 33 32)" fill="${dark}"/><ellipse cx="33" cy="32" rx="8" ry="12" transform="rotate(-20 33 32)" fill="#B5797C"/>`) + joint('cav-ear-r', 79, 45, `<ellipse cx="87" cy="32" rx="13" ry="18" transform="rotate(20 87 32)" fill="${gold}"/><ellipse cx="87" cy="32" rx="8" ry="12" transform="rotate(20 87 32)" fill="${dark}"/>`) +
          `<path d="M32 49Q39 33 60 35Q81 33 88 49L84 71Q77 83 60 85Q43 83 36 71Z" fill="${gold}"/><path d="M33 48Q42 37 55 40L56 66L39 72Z" fill="${dark}"/><path d="M59 36L68 38L65 62L60 68L56 58Z" fill="${cream}"/><ellipse cx="60" cy="72" rx="16" ry="12" fill="${cream}"/>` + dotEyes(47, 73, 54, 3.2) + `<ellipse cx="60" cy="67" rx="6" ry="4.5" fill="${dark}"/><path d="M53 74Q60 86 67 74Z" fill="${dark}"/><path class="cav-tongue" d="M57 78v6q3 5 6 0v-6Z" fill="#ED91A0"/><path d="M60 80v3" stroke="#C5677E" stroke-width=".8"/>`;
        geo = { ey: 54, lx: 47, rx: 73, top: 34, neck: 91, hl: 32, hr: 88 };
        break;
      }
      case 18: { // peacock: a jewelled, gently fanning train
        const blue = T('#3286C1'), dark = T('#2851A0'), green = T('#239D85');
        const fan = [-57, -38, -19, 0, 19, 38, 57].map((a, i) => `<g transform="rotate(${a} 60 105)"><path d="M60 108Q31 73 46 42Q60 25 74 42Q89 73 60 108Z" fill="${i % 2 ? green : shade(green, -.12)}" stroke="${shade(green, .3)}" stroke-width=".7"/><ellipse cx="60" cy="53" rx="9" ry="12" fill="#E8BD5E"/><ellipse cx="60" cy="52" rx="6.6" ry="8.4" fill="${blue}"/><ellipse cx="60" cy="51" rx="3.6" ry="5.6" fill="${dark}"/><circle cx="58.8" cy="49" r="1.3" fill="#BFFBE1"/><path d="M60 67v33" stroke="${shade(green, .45)}" stroke-width=".8" opacity=".5"/></g>`).join('');
        body = joint('cav-fan', 60, 108, fan) + `<path d="M35 123Q34 87 53 81L55 69H68L70 82Q86 91 87 123Z" fill="${blue}"/><path d="M39 99Q54 95 52 118M81 99Q66 95 68 118" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`;
        head = `<path d="M56 37L51 25M61 35V20M66 37L71 25" stroke="${dark}" stroke-width="2" stroke-linecap="round"/><circle cx="51" cy="24" r="3.6" fill="${green}"/><circle cx="61" cy="20" r="3.8" fill="${blue}"/><circle cx="71" cy="24" r="3.6" fill="${green}"/><ellipse cx="61" cy="56" rx="19" ry="22" fill="${blue}"/><path d="M43 51Q49 45 55 51M66 51Q72 45 78 51" fill="none" stroke="#DAF8EE" stroke-width="4" stroke-linecap="round"/>` + dotEyes(51, 71, 54, 3) + `<path d="M55 65L61 72L67 65Q61 61 55 65Z" fill="#F3C260"/><path d="M48 69Q52 75 57 76" fill="none" stroke="#75CAE7" stroke-width="1.5" stroke-linecap="round"/>`;
        geo = { ey: 54, lx: 51, rx: 71, top: 34, neck: 86, hl: 40, hr: 82 };
        break;
      }
      case 19: { // dolphin: a curved smile and buoyant ocean fins
        const blue = T('#62BED7'), light = T('#D5F3ED'), deep = T('#428EB8');
        body = joint('cav-flipper-l', 43, 96, `<path d="M48 88Q21 90 20 110Q38 109 51 99Z" fill="${deep}"/>`) + joint('cav-flipper-r', 82, 97, `<path d="M77 87Q99 88 105 106Q91 110 78 100Z" fill="${deep}"/>`) + `<path d="M30 123Q37 107 42 88Q47 75 65 77Q84 83 87 105L97 123Z" fill="${blue}"/><path d="M48 92Q53 86 65 89Q76 101 77 123H39Z" fill="${light}"/>`;
        head = `<path d="M41 41Q44 26 52 23Q48 36 59 35Q78 32 89 47Q95 56 91 62Q110 61 105 70Q101 78 81 77Q65 91 46 79Q29 69 32 55Q33 45 41 41Z" fill="${blue}"/><path d="M43 68Q62 80 80 67Q91 65 103 67Q106 76 82 77Q62 92 43 76Z" fill="${light}"/><path d="M41 47Q46 39 58 40" fill="none" stroke="#D0F6F6" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>` + dotEyes(72, null, 54, 4) + `<path d="M67 68Q81 75 96 70" fill="none" stroke="${deep}" stroke-width="1.7" stroke-linecap="round"/><path d="M67 47q5-3 9 0" fill="none" stroke="${deep}" stroke-width="1.5" stroke-linecap="round"/>` + blush(63, 63);
        geo = { ey: 54, lx: 72, rx: null, top: 34, neck: 91, flx: 47, fly: 39, hl: 34, hr: 90 };
        break;
      }
    }
    // A separate reaction rig keeps an animal's idle motion and playful
    // gestures independent, so a wave never causes a snapping head reset.
    return `<g class="cav-body">${body}<g class="cav-head"><g class="cav-face">${head}${critterAccessory(sp.x, P, geo)}</g></g></g>`;
  }

  /* ════════════════════════════════════════════════════════════════
     ORGANISATION EMBLEMS
     ════════════════════════════════════════════════════════════════ */
  const PALETTES = [
    ['Jacaranda', '#6D28FF', '#C4B5FD', '#FFFFFF'],
    ['Reef', '#0F766E', '#5EEAD4', '#FFFFFF'],
    ['Savanna gold', '#B45309', '#FCD34D', '#FFFFFF'],
    ['Onyx & gold', '#15131F', '#F5B12E', '#F5B12E'],
    ['Hibiscus', '#BE123C', '#FDA4AF', '#FFFFFF'],
    ['Lake indigo', '#1D4ED8', '#93C5FD', '#FFFFFF'],
    ['Forest', '#166534', '#86EFAC', '#FFFFFF'],
    ['Sand & clay', '#F2ECE1', '#E07A2F', '#2A2320']
  ];
  OPTIONS.palette = PALETTES.map((p, i) => ({ v: i, name: p[0], a: p[1], b: p[2] }));

  const SHAPES = [
    'M60 20a40 40 0 1 1 0 80a40 40 0 1 1 0-80Z',
    'M40 21h40c10.5 0 19 8.5 19 19v40c0 10.5-8.5 19-19 19H40c-10.5 0-19-8.5-19-19V40c0-10.5 8.5-19 19-19Z',
    'M60 18l36.4 21v42L60 102 23.6 81V39Z',
    'M60 19l35 12.4V58c0 22.6-15.2 37.4-35 44-19.8-6.6-35-21.4-35-44V31.4Z',
    'M26 101V58c0-20 15.2-37 34-37s34 17 34 37v43Z',
    'M60 15.6l44.4 44.4L60 104.4 15.6 60Z'
  ];
  const ICONS = [
    '',
    'M5 21V6l7-3 7 3v15M3 21h18M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4',
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    'M12.6 21.6c0-5.6.8-9 2-12.2M14.6 9.4C12 5.6 7 5.4 3.4 7.6M14.6 9.4c.8-4 5-6 8.6-4.8M14.6 9.4c-4-1-7.6 1.2-8.6 5M14.6 9.4c4-.8 6.6 2 6.8 6.2',
    'M2 20L9 8l4 6 3-4 6 10zM7.6 11.2L9 12.6l1.4-1.4',
    'M2 8c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1.5M2 13c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1.5M2 18c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1.5',
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    'M5 19C5 10 11 4 20 4c0 9-6 15-15 15zM5 19l7.4-7.4',
    'M8 11.6a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2zM10.6 12.6L20 3.2M17 6.2l3 3M14.6 8.6l2 2',
    'M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 3c-2 2-2.4 6 0 8.4V21',
    'M4 15.6v-3.6l2-5h12l2 5v3.6zM4 15.6h16M7.4 18.6a1.6 1.6 0 1 0 0-.01M16.6 18.6a1.6 1.6 0 1 0 0-.01',
    'M3 8a2 2 0 0 1 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3zM14 6v12',
    'M3 18V7.6M3 13.4h18V18M21 13.4a3 3 0 0 0-3-3h-7v3M7.4 11.6a1.6 1.6 0 1 0 0-.01'
  ];

  function initials(name) {
    const words = String(name || '').replace(/[^\p{L}\p{N}\s&-]/gu, ' ').split(/[\s-]+/).filter(w => w && !/^(the|and|of|&|ltd|limited|inc|co|llc|plc)$/i.test(w));
    if (!words.length) return 'C';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function emblem(sp, P, r, name) {
    const [, base, accent, ink] = PALETTES[sp.c] || PALETTES[0];
    const shape = SHAPES[sp.sh] || SHAPES[0];
    const dark = toHsl(base)[2] < 0.5;
    const bgA = dark ? mix(base, '#ffffff', .86) : mix(accent, '#ffffff', .72);
    const bgB = dark ? mix(accent, '#ffffff', .74) : mix(base, '#ffffff', .4);
    let pat = '';
    const pc = dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.08)';
    switch (sp.pt) {
      case 1: pat = [0, 1, 2, 3, 4, 5].map(i => `<rect x="${14 + i * 16}" y="10" width="7" height="100" fill="${i % 2 ? accent : pc}" opacity="${i % 2 ? .35 : 1}"/>`).join('') + [0, 1, 2, 3].map(i => `<rect x="10" y="${26 + i * 20}" width="100" height="4" fill="${pc}"/>`).join(''); break;
      case 2: for (let y = 22; y < 104; y += 10) for (let x = 22 + (y % 20 ? 5 : 0); x < 104; x += 10) pat += `<circle cx="${x}" cy="${y}" r="1.8" fill="${pc}"/>`; break;
      case 3: for (let y = 26; y < 100; y += 12) for (let x = 24; x < 100; x += 12) pat += (x + y) % 24 ? `<path d="M${x - 3} ${y}h6" stroke="${pc}" stroke-width="1.8" stroke-linecap="round"/>` : `<path d="M${x - 2.4} ${y - 2.4}l4.8 4.8M${x + 2.4} ${y - 2.4}l-4.8 4.8" stroke="${pc}" stroke-width="1.6" stroke-linecap="round"/>`; break;
      case 4: for (let y = 28; y < 104; y += 11) pat += `<path d="M14 ${y}q8-6 16 0t16 0 16 0 16 0 16 0 16 0" fill="none" stroke="${pc}" stroke-width="2"/>`; break;
      case 5: for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pat += `<path d="M60 60L${f1(60 + Math.cos(a) * 60)} ${f1(60 + Math.sin(a) * 60)}" stroke="${pc}" stroke-width="${i % 2 ? 2.4 : 5}"/>`; } break;
    }
    let glyph;
    if (!sp.g) {
      const t = initials(name);
      glyph = `<text x="60" y="61.5" text-anchor="middle" dominant-baseline="central" font-family="Geist,Inter,system-ui,sans-serif" font-weight="700" font-size="${t.length > 1 ? 31 : 38}" letter-spacing="-1" fill="${ink}">${esc(t)}</text>`;
    } else {
      glyph = `<g transform="translate(35.6 35.6) scale(2.03)"><path d="${ICONS[sp.g] || ICONS[1]}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    return `<defs><linearGradient id="${P}eg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(base, .12)}"/><stop offset="1" stop-color="${shade(base, -.14)}"/></linearGradient>` +
      `<linearGradient id="${P}eb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient>` +
      `<linearGradient id="${P}es" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<clipPath id="${P}ec"><path d="${shape}"/></clipPath></defs>` +
      `<rect width="120" height="120" fill="url(#${P}eb)"/>` +
      `<g class="cav-performance"><g class="cav-body"><path d="${shape}" fill="${shade(base, -.3)}" opacity=".18" transform="translate(0 3)"/><path d="${shape}" fill="url(#${P}eg)"/>` +
      `<g clip-path="url(#${P}ec)"><g class="cav-drift">${pat}</g><rect class="cav-sheen" x="-60" y="0" width="40" height="120" fill="url(#${P}es)" transform="skewX(-18)"/></g>` +
      `<path d="${shape}" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".55" transform="translate(60 60) scale(.9) translate(-60 -60)"/>` +
      glyph + `</g></g>`;
  }

  /* ════════════════════════════════════════════════════════════════
     CATALOGUE: named personas. Each is a starting point, not a box.
     ════════════════════════════════════════════════════════════════ */
  const P_ = (id, name, trait, s, h, hc, e, m, f, x, w, o, b, mo, fc) => ({ id, name, trait, spec: { v: 1, k: 'p', s, h, hc, fc: fc == null ? [0, 1, 2, 3, 4, 5, 6, 7, 8][(h + o) % 9] : fc, e, m, f, x, w, o, b, mo: mo == null ? 1 : mo, n: id } });
  const PERSONAS = [
    P_('amani', 'Amani', 'Calm navigator', 2, 5, 0, 0, 2, 0, 2, 0, 1, 2),
    P_('zawadi', 'Zawadi', 'Sunset chaser', 3, 3, 0, 2, 0, 0, 3, 0, 4, 1, 2),
    P_('baraka', 'Baraka', 'Street-food scout', 1, 1, 0, 1, 1, 2, 0, 1, 3, 7, 2),
    P_('nuru', 'Nuru', 'Early riser', 5, 11, 1, 0, 0, 0, 3, 2, 7, 1, 1, 1),
    P_('jabari', 'Jabari', 'Trail blazer', 0, 1, 0, 0, 4, 1, 5, 0, 8, 8),
    P_('imani', 'Imani', 'Culture seeker', 1, 11, 0, 2, 2, 0, 7, 2, 7, 11, 1, 4),
    P_('tumaini', 'Tumaini', 'Big dreamer', 4, 2, 1, 4, 2, 0, 0, 3, 0, 4),
    P_('neema', 'Neema', 'Soft-life curator', 6, 14, 2, 2, 0, 0, 6, 0, 5, 5),
    P_('juma', 'Juma', 'Beach soul', 3, 4, 0, 1, 1, 0, 2, 0, 2, 2, 2),
    P_('ayo', 'Ayo', 'Party starter', 2, 3, 0, 1, 5, 0, 4, 3, 5, 7, 2),
    P_('thandi', 'Thandi', 'Plant whisperer', 4, 6, 1, 0, 0, 0, 3, 2, 8, 10),
    P_('kofi', 'Kofi', 'Coffee connoisseur', 1, 1, 0, 0, 2, 2, 1, 1, 9, 3),
    P_('adaeze', 'Adaeze', 'Bookworm', 3, 9, 0, 2, 2, 0, 1, 0, 7, 5),
    P_('sipho', 'Sipho', 'Road tripper', 2, 15, 0, 0, 0, 2, 2, 0, 6, 9),
    P_('zola', 'Zola', 'Wellness wanderer', 5, 10, 1, 4, 2, 0, 6, 0, 2, 6),
    P_('kwame', 'Kwame', 'Golden-hour photographer', 0, 2, 0, 0, 1, 0, 2, 1, 3, 1, 2),
    P_('halima', 'Halima', 'Quiet explorer', 5, 12, 3, 2, 0, 0, 0, 0, 7, 8, 1, 3),
    P_('omar', 'Omar', 'Old-town wanderer', 6, 13, 1, 0, 2, 2, 0, 1, 7, 9, 1, 8),
    P_('wanjiru', 'Wanjiru', 'Mountain soul', 3, 6, 0, 0, 1, 0, 3, 3, 8, 8),
    P_('kamau', 'Kamau', 'Night owl', 1, 1, 0, 4, 4, 1, 4, 3, 6, 4, 1, 2),
    P_('achieng', 'Achieng', 'Lakeside dreamer', 0, 4, 0, 2, 0, 0, 3, 0, 1, 2),
    P_('otieno', 'Otieno', 'Tide watcher', 1, 0, 0, 0, 1, 2, 2, 0, 2, 2),
    P_('nia', 'Nia', 'Purpose-driven', 2, 3, 3, 2, 2, 0, 1, 1, 0, 0),
    P_('malaika', 'Malaika', 'Star gazer', 4, 8, 0, 4, 2, 0, 6, 0, 0, 4),
    P_('rafiki', 'Rafiki', 'Everyone’s favourite host', 3, 1, 1, 1, 1, 0, 0, 1, 4, 3, 2),
    P_('shujaa', 'Shujaa', 'Adventurer', 2, 5, 1, 0, 4, 2, 5, 0, 9, 3),
    P_('pendo', 'Pendo', 'Romantic getaways', 4, 14, 6, 2, 0, 0, 3, 0, 5, 5),
    P_('chidi', 'Chidi', 'Remote-work nomad', 1, 2, 0, 0, 2, 1, 1, 3, 1, 7),
    P_('lindiwe', 'Lindiwe', 'Festival spirit', 2, 7, 0, 1, 5, 0, 7, 2, 4, 11, 2),
    P_('tariq', 'Tariq', 'Desert wanderer', 7, 1, 1, 0, 4, 2, 2, 1, 7, 9),
    P_('aisha', 'Aisha', 'Market maven', 3, 12, 0, 2, 0, 0, 0, 2, 3, 11, 1, 0),
    P_('sanaa', 'Sanaa', 'Artist at heart', 5, 9, 7, 2, 4, 0, 1, 0, 0, 5, 2),
    P_('eshe', 'Eshe', 'Life of the party', 0, 2, 8, 1, 5, 0, 3, 0, 5, 7, 2),
    P_('lars', 'Lars', 'First time in Africa', 9, 8, 4, 0, 1, 1, 0, 3, 1, 8),
    P_('mei', 'Mei', 'Safari sketchbook', 8, 9, 0, 0, 2, 0, 5, 0, 3, 3),
    P_('priya', 'Priya', 'Coastal foodie', 7, 8, 1, 2, 0, 0, 3, 2, 5, 2),
    P_('hekima', 'Mzee Hekima', 'Wise traveller', 2, 0, 5, 4, 2, 2, 1, 1, 9, 3),
    P_('furaha', 'Bibi Furaha', 'Joyful grandma', 4, 10, 5, 1, 0, 0, 1, 2, 5, 1),
    P_('sol', 'Sol', 'Chasing the golden hour', 5, 14, 3, 3, 1, 0, 6, 0, 3, 1, 2),
    P_('indigo', 'Indigo', 'Finds a beat everywhere', 2, 5, 7, 0, 4, 0, 4, 3, 6, 4, 2),
    P_('tala', 'Tala', 'Always takes the scenic route', 4, 6, 0, 2, 1, 0, 5, 1, 8, 8, 2),
    P_('rio', 'Rio', 'Saltwater and sunshine', 6, 4, 3, 3, 1, 1, 2, 0, 2, 2, 2),
    P_('clem', 'Clem', 'A pocket full of good stories', 8, 9, 3, 0, 0, 0, 1, 3, 4, 10, 2),
    P_('ada', 'Ada', 'Makes ordinary days colourful', 0, 7, 0, 2, 1, 0, 7, 2, 5, 11, 2),
    P_('malik', 'Malik', 'Your next favourite DJ', 1, 15, 0, 3, 4, 1, 4, 3, 0, 7, 2),
    P_('yara', 'Yara', 'The moonlight muse', 5, 12, 0, 2, 0, 0, 0, 1, 0, 4, 2, 3),
    P_('elio', 'Elio', 'Curiosity with a camera', 7, 2, 2, 0, 1, 1, 1, 1, 9, 9, 2),
    P_('alma', 'Alma', 'A warm welcome, anywhere', 3, 11, 0, 1, 5, 0, 3, 2, 2, 6, 2, 2)
  ];
  const SPIRITS = ANIMALS.map((a, i) => ({ id: a.id, name: a.name, trait: a.trait, what: a.what, spec: { v: 1, k: 'a', a: i, t: 0, x: 0, b: [3, 0, 3, 1, 9, 5, 2, 4, 6, 8, 10, 10, 9, 10, 6, 8, 4, 3, 0, 2][i], mo: 2, n: a.id } }));
  const EMBLEMS = [
    ['kente', 'Kente', 3, 1, 3, 0], ['coast', 'Coastline', 0, 4, 1, 5], ['savanna', 'Savanna', 2, 5, 2, 6], ['summit', 'Summit', 1, 0, 5, 4],
    ['hibiscus', 'Hibiscus', 5, 2, 4, 0], ['forest', 'Canopy', 3, 3, 6, 7], ['clay', 'Clay & sand', 4, 3, 7, 0], ['jacaranda', 'Jacaranda', 0, 2, 0, 0]
  ].map(([id, name, sh, pt, c, g]) => ({ id: 'e-' + id, name, trait: 'Organisation emblem', spec: { v: 1, k: 'e', sh, pt, c, g, mo: 1, n: 'e-' + id } }));

  /* ════════════════════════════════════════════════════════════════
     VALIDATION, DEFAULTS, RENDER
     ════════════════════════════════════════════════════════════════ */
  function validate(spec) {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec) || !Object.prototype.hasOwnProperty.call(RANGES, spec.k)) return null;
    const R = RANGES[spec.k], out = { v: 1, k: spec.k };
    for (const key of Object.keys(R)) {
      const n = Number(spec[key]);
      if (!Number.isInteger(n) || n < 0 || n >= R[key]) return null;
      out[key] = n;
    }
    if (typeof spec.n === 'string' && /^[a-z0-9-]{1,24}$/.test(spec.n)) out.n = spec.n;
    return out;
  }

  function surprise(kind, seed) {
    const r = rng(seed == null ? Math.random() * 1e9 : seed);
    const k = Object.prototype.hasOwnProperty.call(RANGES, kind) ? kind : 'a';
    const R = RANGES[k], out = { v: 1, k };
    for (const key of Object.keys(R)) out[key] = pick(r, R[key]);
    out.mo = 2;
    if (out.k === 'p') {
      if (out.f && [8, 9, 11, 12].includes(out.h) && r() < .8) out.f = 0;
      if (out.x === 8 && r() < .7) out.x = 0;
    }
    if (out.k === 'a' && r() < .55) out.x = 0;
    return out;
  }

  function defaultFor(id, accountType) {
    const r = rng('cabana:' + (id || 'guest'));
    if (accountType === 'organization') return { v: 1, k: 'e', sh: pick(r, 6), pt: pick(r, 6), c: pick(r, 8), g: 0, mo: 2 };
    // Keep established deterministic starter identities when the collection
    // grows; new characters are available in the studio and Surprise me.
    const a = pick(r, 12);
    return { v: 1, k: 'a', a, t: 0, x: 0, b: SPIRITS[a].spec.b, mo: 2 };
  }

  function describe(spec) {
    if (!spec) return null;
    const all = PERSONAS.concat(SPIRITS, EMBLEMS);
    const hit = spec.n && all.find(p => p.id === spec.n);
    if (hit) return { name: hit.name, trait: hit.trait };
    if (spec.k === 'a' && ANIMALS[spec.a]) return { name: ANIMALS[spec.a].name, trait: ANIMALS[spec.a].trait };
    return null;
  }

  function render(spec, opts) {
    opts = opts || {};
    const sp = validate(spec) || defaultFor(opts.seed || opts.name || 'guest', opts.accountType);
    const P = 'cav' + (++seq).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const r = rng((opts.seed || '') + ':' + JSON.stringify(sp));
    const phase = rng(P + ':' + JSON.stringify(sp));
    const size = Number(opts.size) || 64;
    const requestedMotion = Number(opts.motion);
    const motion = opts.motion != null && Number.isInteger(requestedMotion) && requestedMotion >= 0 && requestedMotion <= 2 ? requestedMotion : sp.mo;
    const small = size < 40;
    const body = sp.k === 'e' ? `${emblem(sp, P, r, opts.name)}${delight(P)}`
      : backdrop(sp.b, P, r) + `<ellipse class="cav-ground" cx="60" cy="114" rx="36" ry="5" fill="#1C2545" opacity=".12"/>` +
        `<g class="cav-performance">${sculpt(sp.k === 'p' ? person(sp, P, r) : animal(sp, P, r), P)}</g>${delight(P)}`;
    const d = describe(sp);
    const label = opts.label || (d ? `${d.name} avatar` : 'Avatar');
    const style = `--cav-d:${f1(-phase() * 17)}s;--cav-bl:${f1(3.6 + phase() * 3)}s;--cav-br:${f1(3.8 + phase() * 2)}s;--cav-idle:${f1(7.8 + phase() * 4)}s;--cav-play:${f1(10 + phase() * 8)}s`;
    const vb = sp.k === 'e' ? (size <= 48 ? '9 9 102 102' : '0 0 120 120') : sp.k === 'p' && size <= 48 ? '16 12 88 94' : '0 0 120 120';
    return `<svg class="cav cav-m${motion} cav-${sp.k}${small ? ' cav-sm' : ''}" data-cav-character="${sp.k === 'a' ? ANIMALS[sp.a].id : sp.n || sp.k}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" style="${style}" focusable="false">${body}</svg>`;
  }

  /* ── motion management ────────────────────────────────────────────── */
  const CSS = `
.cav{display:block;width:100%;height:100%;overflow:hidden;--cav-bob:2.4px;--cav-tilt:3.2deg;--cav-hop:6px}
.cav *{transform-box:view-box}
.cav .cav-body,.cav .cav-performance{transform-origin:60px 112px}
.cav .cav-head,.cav .cav-face{transform-origin:60px 78px}
.cav .cav-mouth{transform-origin:60px 72px}
.cav .cav-hand{opacity:0;transform:translateY(30px) rotate(14deg)}
.cav .cav-spark,.cav .cav-heart{opacity:0;transform-origin:60px 65px}
.cav .cav-delight{pointer-events:none}
.cav-m1 .cav-body{animation:cav-breathe var(--cav-br) ease-in-out var(--cav-d) infinite}
.cav-m1 .cav-head{animation:cav-calm var(--cav-idle) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-body{animation:cav-bounce var(--cav-br) ease-in-out var(--cav-d) infinite}
.cav-m1 .cav-eyes,.cav-m2 .cav-eyes{animation:cav-blink var(--cav-bl) linear var(--cav-d) infinite}
.cav-m2 .cav-head{animation:cav-curious var(--cav-idle) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-gaze{animation:cav-look var(--cav-idle) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-brows{animation:cav-brows var(--cav-play) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-mouth{animation:cav-smile var(--cav-play) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-hand{animation:cav-hello var(--cav-play) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-paw{animation:cav-paw var(--cav-play) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-ear-l{animation:cav-ear var(--cav-idle) ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-ear-r{animation:cav-ear var(--cav-idle) ease-in-out var(--cav-d) infinite reverse}
.cav-m2 .cav-tail{animation:cav-tail 3.8s ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-trunk{animation:cav-trunk 5.4s ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-fan{animation:cav-fan 6.6s ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-treasure{animation:cav-treasure 5s ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-flipper-l{animation:cav-flipper 4.2s ease-in-out var(--cav-d) infinite}
.cav-m2 .cav-flipper-r{animation:cav-flipper 4.2s ease-in-out var(--cav-d) infinite reverse}
.cav-m2 .cav-tongue{animation:cav-tongue 3s ease-in-out var(--cav-d) infinite}
.cav-m1 .cav-drift,.cav-m2 .cav-drift{animation:cav-drift 16s ease-in-out var(--cav-d) infinite}
.cav-m1 .cav-tw,.cav-m2 .cav-tw{animation:cav-tw 4.2s ease-in-out infinite}
.cav-m1 .cav-glint,.cav-m2 .cav-glint{animation:cav-glint 7.5s ease-in-out var(--cav-d) infinite}
.cav-m1 .cav-sheen,.cav-m2 .cav-sheen{animation:cav-sheen 9s ease-in-out var(--cav-d) infinite}
.cav-m1 .cav-chroma,.cav-m2 .cav-chroma{animation:cav-chroma 22s ease-in-out var(--cav-d) infinite}
.cav-e.cav-m2 .cav-body{animation:cav-badge 7s ease-in-out var(--cav-d) infinite}
.cav[data-cav-character="bundi"].cav-m2 .cav-head{animation:cav-owl 10s ease-in-out var(--cav-d) infinite}
.cav[data-cav-character="kasa"].cav-m2 .cav-body,.cav[data-cav-character="tide"].cav-m2 .cav-body{animation:cav-swim 5.4s ease-in-out var(--cav-d) infinite}
.cav[data-cav-character="mbega"].cav-m2 .cav-body,.cav[data-cav-character="lumi"].cav-m2 .cav-body{animation:cav-scamper var(--cav-idle) ease-in-out var(--cav-d) infinite}
.cav-sm{--cav-bob:1.7px;--cav-tilt:2.6deg;--cav-hop:4px}
.cav[data-cav-reaction="wave"] .cav-performance{animation:cav-react-wave 1.8s ease-in-out both}
.cav[data-cav-reaction="dance"] .cav-performance{animation:cav-react-dance 2s ease-in-out both}
.cav[data-cav-reaction="hop"] .cav-performance{animation:cav-react-hop 1.6s ease-in-out both}
.cav[data-cav-reaction="love"] .cav-performance{animation:cav-react-love 1.8s ease-in-out both}
.cav[data-cav-reaction="wave"] .cav-hand{animation:cav-hand-hi 1.8s ease-in-out both}
.cav[data-cav-reaction="wave"] .cav-paw{animation:cav-hand-hi 1.8s ease-in-out both}
.cav[data-cav-reaction="wave"] .cav-ear-l,.cav[data-cav-reaction="wave"] .cav-flipper-r{animation:cav-ear-hi 1.8s ease-in-out both}
.cav[data-cav-reaction="dance"] .cav-tail{animation:cav-tail .35s ease-in-out 6}
.cav[data-cav-reaction] .cav-spark{animation:cav-spark 1.7s ease-out both}
.cav[data-cav-reaction] .cav-spark-b{animation-delay:.18s}
.cav[data-cav-reaction] .cav-spark-c{animation-delay:.3s}
.cav[data-cav-reaction="love"] .cav-heart{animation:cav-heart 1.8s ease-out both}
.cav-noblink{animation:none!important}
.cav-paused *,.cav-paused,html.cav-hidden .cav *{animation-play-state:paused!important}
.cav-m0 *{animation:none!important}
@keyframes cav-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-.8px) scale(1.014)}}
@keyframes cav-calm{0%,100%{transform:rotate(-.8deg)}50%{transform:rotate(.8deg)}}
@keyframes cav-bounce{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(calc(-1 * var(--cav-bob))) scale(1.018,.992)}68%{transform:translateY(.7px) scale(.995,1.006)}}
@keyframes cav-blink{0%,88%,100%{transform:scaleY(1)}90%{transform:scaleY(.08)}92%,96%{transform:scaleY(1)}97%{transform:scaleY(.12)}98.5%{transform:scaleY(1)}}
@keyframes cav-curious{0%,100%{transform:rotate(calc(-1 * var(--cav-tilt)))}25%,38%{transform:rotate(var(--cav-tilt)) translateY(-.6px)}53%,62%{transform:rotate(0deg)}76%,86%{transform:rotate(calc(-1.2 * var(--cav-tilt))) translateY(-1px)}}
@keyframes cav-look{0%,45%,65%,100%{transform:translateX(0)}20%,35%{transform:translateX(1px)}78%,88%{transform:translateX(-1px)}}
@keyframes cav-brows{0%,65%,100%{transform:translateY(0)}73%,80%{transform:translateY(-1.5px)}}
@keyframes cav-smile{0%,66%,100%{transform:scale(1)}73%,83%{transform:scale(1.12,1.12)}}
@keyframes cav-hello{0%,64%,92%,100%{opacity:0;transform:translateY(30px) rotate(14deg)}69%,86%{opacity:1;transform:translateY(0) rotate(-6deg)}73%,81%{opacity:1;transform:translateY(0) rotate(9deg)}77%,85%{opacity:1;transform:translateY(0) rotate(-12deg)}}
@keyframes cav-paw{0%,64%,95%,100%{transform:rotate(0)}70%,83%{transform:rotate(-22deg)}76%,89%{transform:rotate(12deg)}}
@keyframes cav-ear{0%,35%,60%,100%{transform:rotate(0)}41%,51%{transform:rotate(-9deg)}46%,56%{transform:rotate(5deg)}}
@keyframes cav-tail{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(9deg)}}
@keyframes cav-trunk{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(11deg) scaleY(.96)}}
@keyframes cav-fan{0%,100%{transform:scaleX(.94) rotate(-1deg)}50%{transform:scaleX(1.025) rotate(1deg)}}
@keyframes cav-treasure{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-2px) rotate(2deg)}}
@keyframes cav-flipper{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(15deg)}}
@keyframes cav-tongue{0%,100%{transform:translateY(0)}50%{transform:translateY(1.2px)}}
@keyframes cav-badge{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-2px) rotate(2deg)}}
@keyframes cav-owl{0%,100%{transform:rotate(-4deg)}20%,34%{transform:rotate(8deg)}48%,60%{transform:rotate(0deg)}76%,88%{transform:rotate(-8deg)}}
@keyframes cav-swim{0%,100%{transform:translate(-1px,1px) rotate(-2deg)}50%{transform:translate(1.5px,-2.5px) rotate(2deg)}}
@keyframes cav-scamper{0%,48%,100%{transform:translateY(0) rotate(0)}57%{transform:scale(1.025,.98)}64%{transform:translateY(-4px) rotate(-3deg)}72%{transform:translateY(0)}81%{transform:translateY(-3px) rotate(3deg)}90%{transform:translateY(0)}}
@keyframes cav-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(2px,-1.5px)}}
@keyframes cav-tw{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes cav-glint{0%,70%{transform:translateX(0);opacity:0}78%{opacity:.5}92%,100%{transform:translateX(34px);opacity:0}}
@keyframes cav-sheen{0%,62%{transform:skewX(-18deg) translateX(0)}100%{transform:skewX(-18deg) translateX(220px)}}
@keyframes cav-chroma{0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(45deg)}}
@keyframes cav-react-wave{0%,100%{transform:rotate(0)}20%{transform:translateY(-2px) rotate(-4deg)}45%{transform:rotate(4deg)}70%{transform:rotate(-2deg)}}
@keyframes cav-react-dance{0%,100%{transform:translateX(0) rotate(0)}15%,55%{transform:translate(-3px,-2px) rotate(-7deg)}35%,75%{transform:translate(3px,-2px) rotate(7deg)}90%{transform:translateY(-3px)}}
@keyframes cav-react-hop{0%,100%{transform:translateY(0) scale(1)}15%,57%{transform:scale(1.06,.95)}32%,73%{transform:translateY(calc(-1 * var(--cav-hop))) scale(.97,1.03)}45%,85%{transform:translateY(0) scale(1.03,.98)}}
@keyframes cav-react-love{0%,100%{transform:rotate(0) scale(1)}30%,65%{transform:rotate(-5deg) scale(1.035)}48%{transform:rotate(3deg) scale(1.035)}}
@keyframes cav-hand-hi{0%,100%{opacity:0;transform:translateY(30px) rotate(14deg)}18%,77%{opacity:1;transform:translateY(0) rotate(-10deg)}32%,60%{opacity:1;transform:translateY(0) rotate(12deg)}46%,72%{opacity:1;transform:translateY(0) rotate(-15deg)}}
@keyframes cav-ear-hi{0%,100%{transform:rotate(0)}22%,62%{transform:rotate(-16deg)}42%,82%{transform:rotate(9deg)}}
@keyframes cav-spark{0%{opacity:0;transform:scale(.6)}25%,58%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:translateY(-8px) scale(.8)}}
@keyframes cav-heart{0%{opacity:0;transform:translateY(8px) scale(.4)}25%,50%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-12px) scale(1.15)}}
@media (prefers-reduced-motion:reduce){.cav *{animation:none!important}.cav .cav-hand,.cav .cav-heart,.cav .cav-spark{opacity:0!important}}`;

  let io = null, mutationObserver = null, styled = false;
  const instances = new WeakMap();
  const reactions = new Set(['wave', 'dance', 'love', 'hop']);
  function avatarsIn(root, fn) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('svg.cav')) fn(root);
    root.querySelectorAll('svg.cav').forEach(fn);
  }
  function release(svg) {
    const state = instances.get(svg);
    if (!state) return;
    if (io) io.unobserve(svg);
    if (state.timer) global.clearTimeout(state.timer);
    svg.removeAttribute('data-cav-reaction');
    instances.delete(svg);
  }
  function hydrate(svg) {
    if (instances.has(svg)) return;
    instances.set(svg, { timer: null });
    if (io) {
      svg.classList.add('cav-paused');
      io.observe(svg);
    }
  }
  function findAvatar(el) {
    if (!el || !el.querySelector) return null;
    if (el.matches && el.matches('svg.cav')) return el;
    return (el.closest && el.closest('svg.cav')) || el.querySelector('svg.cav');
  }
  function eventAvatar(target) {
    const owner = target && target.closest && target.closest('svg.cav,a,button,[role="button"],[data-cav-interactive]');
    return findAvatar(owner);
  }
  function react(el, action) {
    const svg = findAvatar(el);
    action = action || 'wave';
    if (!svg || !reactions.has(action) || svg.classList.contains('cav-m0') || svg.classList.contains('cav-paused') ||
      (typeof document !== 'undefined' && document.hidden) ||
      (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)) return false;
    hydrate(svg);
    const state = instances.get(svg);
    if (svg.hasAttribute('data-cav-reaction')) return false;
    svg.setAttribute('data-cav-reaction', action);
    // A bounded fallback also cleans up in environments without animationend.
    state.timer = global.setTimeout(() => {
      svg.removeAttribute('data-cav-reaction');
      state.timer = null;
    }, 2300);
    return true;
  }
  function ensureStyles() {
    if (styled || typeof document === 'undefined') return;
    styled = true;
    if (!document.getElementById('cabana-avatars-css')) {
      const s = document.createElement('style');
      s.id = 'cabana-avatars-css';
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    }
    const visibility = () => document.documentElement.classList.toggle('cav-hidden', document.hidden);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    if ('IntersectionObserver' in global) {
      io = new global.IntersectionObserver(entries => entries.forEach(e => {
        if (instances.has(e.target)) e.target.classList.toggle('cav-paused', !e.isIntersecting);
      }), { rootMargin: '0px' });
    }
    if ('MutationObserver' in global) {
      mutationObserver = new global.MutationObserver(records => {
        const changed = new Set();
        records.forEach(record => {
          record.addedNodes.forEach(n => avatarsIn(n, svg => changed.add(svg)));
          record.removedNodes.forEach(n => avatarsIn(n, svg => changed.add(svg)));
        });
        changed.forEach(svg => svg.isConnected ? hydrate(svg) : release(svg));
      });
      mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    // Images keep their existing semantic role. Reactions are a bonus on
    // pointer or keyboard focus; links and buttons retain normal activation.
    document.addEventListener('pointerover', event => {
      const svg = eventAvatar(event.target);
      if (svg && (!event.relatedTarget || !svg.contains(event.relatedTarget))) react(svg, 'wave');
    }, { passive: true });
    document.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') react(eventAvatar(event.target), 'love');
    }, { passive: true });
    document.addEventListener('focusin', event => react(eventAvatar(event.target), 'wave'));
    avatarsIn(document, hydrate);
  }
  function unmount(el) {
    if (!el) return;
    avatarsIn(el, release);
    if (el.matches && el.matches('svg.cav')) el.remove();
    else el.innerHTML = '';
  }
  function mount(el, spec, opts) {
    if (!el) return null;
    ensureStyles();
    avatarsIn(el, release);
    const size = (opts && opts.size) || el.clientWidth || 64;
    el.innerHTML = render(spec, Object.assign({}, opts, { size }));
    const svg = el.firstElementChild;
    if (svg) hydrate(svg);
    return svg;
  }
  function observeAll(root) {
    ensureStyles();
    if (typeof document !== 'undefined') avatarsIn(root || document, hydrate);
  }

  const api = {
    version: 2, render, mount, observeAll, unmount, react, validate, surprise, defaultFor, describe, initials,
    catalogue: () => ({ people: PERSONAS.slice(), spirits: SPIRITS.slice(), emblems: EMBLEMS.slice() }),
    OPTIONS, RANGES, BACKDROPS, css: CSS, ensureStyles
  };
  global.CabanaAvatars = api;
  if (typeof document !== 'undefined') ensureStyles();
})(typeof window !== 'undefined' ? window : globalThis);
