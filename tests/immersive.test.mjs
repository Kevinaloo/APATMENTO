/* ═══════════════════════════════════════════════════════════════════
   Cabana Immersive · contracts that must not drift
   ─────────────────────────────────────────────────────────────────
   The maths that decides where a guest is looking, the database rules
   that decide whether they may, and the page behaviour that tells
   them so. Each of these fails quietly in production if it slips:
   a flipped sign sends a hotspot behind you, a missing grant opens
   paid media to everyone, a banner that forgets itself nags forever.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const engineSrc = read('cabana-immersive-engine.js');
const pageSrc = read('cabana-immersive.js');
const adminSrc = read('admin-views-immersive.js');
const sql = read('supabase/migrations/20260926170000_cabana_immersive.sql');
const tours = read('tours.html');
const shell = read('admin.html');

/* ── 1 · where you are looking ─────────────────────────────────────── */
function engineMath() {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {} });
  dom.window.eval(engineSrc);
  return { M: dom.window.CabanaImmersiveEngine._math, dom };
}
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('yaw and pitch survive a round trip through a direction', () => {
  const { M, dom } = engineMath();
  for (const yaw of [-179, -90, -33.3, 0, 12.5, 90, 179]) {
    for (const pitch of [-80, -10, 0, 25, 80]) {
      const yp = M.yawPitchOf(M.dirOf(yaw, pitch));
      assert.ok(close(yp.yaw, yaw, 1e-9) && close(yp.pitch, pitch, 1e-9), `${yaw},${pitch} → ${yp.yaw},${yp.pitch}`);
    }
  }
  dom.window.close();
});

test('the camera built from yaw and pitch looks exactly at that yaw and pitch', () => {
  const { M, dom } = engineMath();
  for (const [yaw, pitch] of [[0, 0], [30, 10], [-120, -35], [175, 60]]) {
    const f = M.mulM3(M.qMat3(M.viewQuat(yaw, pitch)), [0, 0, -1]);
    const yp = M.yawPitchOf(f);
    // The matrix is Float32, as the GPU sees it: a thousandth of a degree
    // is still far finer than a pixel.
    assert.ok(close(yp.yaw, yaw, 1e-3) && close(yp.pitch, pitch, 1e-3), `${yaw},${pitch} → ${yp.yaw},${yp.pitch}`);
  }
  // Positive yaw turns right, positive pitch looks up.
  const right = M.dirOf(90, 0), up = M.dirOf(0, 90);
  assert.ok(close(right[0], 1) && close(up[1], 1));
  dom.window.close();
});

test('a phone held upright looks at the horizon, flat on a table looks at the floor, turned left looks left', () => {
  const { M, dom } = engineMath();
  const fwd = (a, b, g, o = 0) => M.yawPitchOf(M.mulM3(M.qMat3(M.deviceQuat(a, b, g, o)), [0, 0, -1]));
  const upright = fwd(0, 90, 0);
  assert.ok(close(upright.pitch, 0, 1e-3), 'upright portrait phone should look level');
  assert.ok(close(fwd(0, 0, 0).pitch, -90, 1e-2), 'a phone lying screen-up looks down through its back camera');
  assert.ok(close(fwd(90, 90, 0).yaw, -90, 1e-3), 'alpha grows turning left, so the view turns left');
  assert.ok(close(fwd(0, 60, 0).pitch, -30, 1e-3), 'tilting the top away looks down');
  dom.window.close();
});

test('angles wrap into -180..180', () => {
  const { M, dom } = engineMath();
  assert.equal(M.wrap180(190), -170);
  assert.equal(M.wrap180(-190), 170);
  assert.equal(M.wrap180(540), -180);
  dom.window.close();
});

test('the shader reads each eye from its own half of stereo footage', () => {
  // top-bottom: left eye on top (v*0.5), right eye below (+0.5)
  assert.match(engineSrc, /proj<1\.5\)\{return texture2D\(t,vec2\(0\.5\+lon\/\(2\.0\*PI\),v\*0\.5\+uEye\*0\.5\)\)/);
  // side-by-side: left eye left, right eye right
  assert.match(engineSrc, /proj<2\.5\)\{return texture2D\(t,vec2\(\(0\.5\+lon\/\(2\.0\*PI\)\)\*0\.5\+uEye\*0\.5,v\)\)/);
  // XR: the right view is eye 1
  assert.match(engineSrc, /view\.eye === 'right' \? 1 : 0/);
});

/* ── 2 · who may watch ─────────────────────────────────────────────── */
test('scene media is private and only reachable through the watch rule', () => {
  assert.match(sql, /values \('immersive', 'immersive', false,/, 'the media bucket must be private');
  assert.match(sql, /values \('immersive-public', 'immersive-public', true,/);
  assert.match(sql, /create policy "immersive media watchable" on storage\.objects\s+for select to anon, authenticated\s+using \(bucket_id = 'immersive' and public\.immersive_object_readable\(name\)\)/);
  for (const op of ['insert', 'update', 'delete']) {
    assert.match(sql, new RegExp(`create policy "immersive media admin ${op === 'insert' ? 'write' : op}" on storage\\.objects\\s+for ${op} to authenticated`));
  }
  assert.doesNotMatch(sql, /bucket_id = 'immersive'\s*\)\s*;/, 'no policy may open the private bucket unconditionally');
});

test('watching is decided by status, access, the trial window and passes, with admins always through', () => {
  const body = sql.slice(sql.indexOf('function public.immersive_can_watch'), sql.indexOf('function public.immersive_object_readable'));
  assert.match(body, /if public\.is_admin\(\) then return true;/);
  assert.match(body, /v_status <> 'published' then return false/);
  assert.match(body, /v_access = 'free' then return true/);
  assert.match(body, /public\.immersive_open_now\(\)/);
  assert.match(body, /return public\.immersive_has_pass\(\)/);
  assert.match(sql, /s\.mode = 'trial' and \(s\.trial_ends_at is null or s\.trial_ends_at > now\(\)\)/);
  // Private files may only belong to the world that references them.
  assert.match(sql, /raise exception 'immersive_media_outside_folder'/);
});

test('every table has row security and guests only ever read published worlds', () => {
  for (const t of ['immersive_experiences', 'immersive_settings', 'immersive_passes', 'immersive_pass_requests', 'immersive_plays']) {
    assert.match(sql, new RegExp(`alter table public\\.${t}\\s+enable row level security`), t);
  }
  assert.match(sql, /create policy immersive_experiences_read_live on public\.immersive_experiences\s+for select to anon, authenticated using \(status = 'published'\)/);
  assert.match(sql, /revoke all on public\.immersive_experiences, public\.immersive_settings, public\.immersive_passes,\s+public\.immersive_pass_requests, public\.immersive_plays from anon;/);
});

test('privileged functions are guarded and nothing extra is callable by guests', () => {
  for (const fn of ['admin_immersive_overview', 'admin_immersive_passes', 'admin_immersive_pass_action']) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`));
    assert.match(body.slice(0, 900), /perform cabana_admin\.guard\(\);/, `${fn} must check the roster`);
    assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to anon`));
  }
  // Supabase grants anon by default; these must be explicitly taken back.
  for (const fn of ['immersive_open_now', 'immersive_has_pass', 'immersive_can_watch', 'immersive_request_pass']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated;`), fn);
    assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to anon`), fn);
  }
  assert.match(sql, /grant execute on function public\.immersive_request_pass\(text, text, uuid\) to authenticated;/);
});

test('scene data is validated in the database: https or own-folder media, real scene targets', () => {
  assert.match(sql, /scenes\s+jsonb not null default '\[\]'::jsonb check \(public\.immersive_scenes_valid\(scenes\)\)/);
  assert.match(sql, /p ~ '\^https:\/\/\[\^\\s"''<>\\\\\]\+\$'/);
  assert.match(sql, /\^sb:exp\/\[0-9a-f\]\{8\}-/);
  assert.match(sql, /h ->> 'type' = 'scene' and not \(coalesce\(h ->> 'target', ''\) = any\(ids\)\)/);
  assert.match(sql, /'equirect', 'equirect_tb', 'equirect_sbs', 'vr180', 'vr180_sbs', 'flat'/);
});

test('the console inbox learns about pass requests without forking admin_inbox', () => {
  assert.match(sql, /pg_get_functiondef\('public\.admin_inbox\(\)'::regprocedure\)/);
  assert.match(sql, /if position\('immersive_requests' in def\) > 0 then return; end if;/, 'the patch must be idempotent');
});

/* ── 3 · the page is wired ─────────────────────────────────────────── */
test('the tours page carries the section and loads the engine before the controller', () => {
  for (const id of ['immersive', 'cim-track', 'cim-seg', 'cim-hs', 'cim-go', 'cim-trial', 'cim-how']) assert.match(tours, new RegExp(`id="${id}"`), id);
  assert.equal((tours.match(/class="cim-lens [lr]"/g) || []).length, 2);
  const at = s => tours.indexOf(s);
  assert.ok(at('/vendor-supabase-2.112.3.js') < at('/cabana-immersive-engine.js'));
  assert.ok(at('/apa-session.js') < at('/cabana-immersive.js'));
  assert.ok(at('/cabana-immersive-engine.js') < at('/cabana-immersive.js'));
  assert.ok(at('/cabana-tours.js') < at('/cabana-immersive.js'), 'tours must exist before worlds badge them');
  assert.match(tours, /<link rel="stylesheet" href="\/cabana-immersive\.css\?v=\d+"\/>/);
  // The section sits between the meridian and the reel.
  assert.ok(at('id="ct-mrd"') < at('id="immersive"') && at('id="immersive"') < at('id="ct-reel"'));
});

test('the console loads the engine before the studio, and the studio uses resumable 6 MB chunks', () => {
  const at = s => shell.indexOf(s);
  assert.ok(at('/admin-console.js') < at('/cabana-immersive-engine.js'));
  assert.ok(at('/cabana-immersive-engine.js') < at('/admin-views-immersive.js'));
  assert.match(shell, /href="\/admin-immersive\.css\?v=\d+"/);
  assert.match(adminSrc, /CX\.view\('immersive'/);
  assert.match(adminSrc, /var CHUNK = 6 \* 1024 \* 1024;/);
  assert.match(adminSrc, /'Tus-Resumable', '1\.0\.0'/);
  assert.match(adminSrc, /\/storage\/v1\/upload\/resumable/);
  assert.doesNotMatch(adminSrc + pageSrc, /service_role|SERVICE_ROLE/);
});

/* ── 4 · what a guest sees ─────────────────────────────────────────── */
function tourPage({ worlds = [], state = {}, stored = {}, cards = [] } = {}) {
  const section = tours.slice(tours.indexOf('<section class="cim"'), tours.indexOf('</section>', tours.indexOf('<section class="cim"')) + 10);
  const grid = `<div id="ct-grid">${cards.map(id => `<button class="ct-card" data-id="${id}"><div class="ct-card-media"></div></button>`).join('')}</div>`;
  const dom = new JSDOM(`<!doctype html><body>${section}${grid}<aside id="ct-sheet"></aside></body>`,
    { url: 'https://cabana.africa/tours', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  Object.keys(stored).forEach(k => w.localStorage.setItem(k, stored[k]));
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.CabanaImmersiveEngine = {
    caps: () => ({ webgl: true, webgl2: true, maxTex: 8192, mobile: false, touch: false, gyro: false }),
    xrSupported: () => Promise.resolve(false),
    paintWorld: () => ({ toDataURL: () => 'data:image/jpeg;base64,AA', width: 8, height: 4 }),
    create: () => { w.__engineCreated = (w.__engineCreated || 0) + 1; throw Object.assign(new Error('no'), { code: 'no_webgl' }); },
    WHY: { no_webgl: 'flat' }
  };
  const q = { select() { return q; }, eq() { return q; }, order() { return q; }, then(ok, bad) { return Promise.resolve({ data: worlds }).then(ok, bad); } };
  const calls = [];
  const client = {
    from: () => q,
    rpc: (fn, args) => { calls.push([fn, args]); return Promise.resolve({ data: fn === 'immersive_state' ? state : { ok: true } }); },
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }) }) }
  };
  w.ApaSession = { client: () => client, get: () => ({}) };
  w.eval(pageSrc);
  return { dom, w, doc: w.document, calls };
}
const settle = ms => new Promise(r => setTimeout(r, ms));
const TRIAL = { mode: 'trial', open: true, trial: true, trial_ends_at: null, signed_in: false, has_pass: false, banner: { enabled: true, title: 'Enjoy a free trial', text: 'Free while we launch.' } };
const LOCKED = { mode: 'pass', open: false, trial: false, signed_in: false, has_pass: false, pass_price_kes: 1500, pass_days: 30, banner: { enabled: false } };
const WORLD = { id: '11111111-1111-4111-8111-111111111111', slug: 'mara-river', title: 'Mara River', destination: 'Maasai Mara', country: 'Kenya',
  access: 'pass', format: '360', media: 'video', stereo: true, interactive: true, scene_count: 2, duration_s: 540, tour_id: 7,
  poster_url: 'https://example.com/p.jpg', start_scene: 'a', scenes: [{ id: 'a', kind: 'video', projection: 'equirect_tb', src: 'sb:exp/11111111-1111-4111-8111-111111111111/a.mp4' }] };

test('with nothing filmed yet, the band still offers the illustrated world and says honestly that more is coming', async () => {
  const { dom, doc } = tourPage({ state: TRIAL });
  await settle(50);
  const cards = doc.querySelectorAll('#cim-track .cim-card[data-slug]');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].getAttribute('data-slug'), 'amboseli-at-dusk');
  assert.match(cards[0].textContent, /Illustrated/);
  assert.ok(doc.querySelector('#cim-track .cim-card.soon'));
  assert.equal(doc.getElementById('cim-trial').hidden, false, 'the trial is announced in the band');
  const modes = [...doc.querySelectorAll('#cim-seg [data-mode]')];
  assert.deepEqual(modes.map(b => b.getAttribute('data-mode')), ['window', 'full', 'visor', 'xr']);
  assert.ok(modes.find(b => b.dataset.mode === 'visor').disabled, 'a desktop cannot be a phone viewer');
  assert.ok(modes.find(b => b.dataset.mode === 'xr').disabled, 'no headset, no headset mode');
  assert.equal(modes.find(b => b.dataset.mode === 'full').disabled, false);
  dom.window.close();
});

test('a pass world shows its lock once the trial is over, and a free-trial chip while it runs', async () => {
  let pg = tourPage({ worlds: [WORLD], state: LOCKED });
  await settle(50);
  let card = pg.doc.querySelector('.cim-card[data-slug="mara-river"]');
  assert.ok(card.querySelector('.cim-card-lock'));
  assert.match(card.getAttribute('aria-label'), /^Locked/);
  pg.dom.window.close();

  pg = tourPage({ worlds: [WORLD], state: TRIAL });
  await settle(50);
  card = pg.doc.querySelector('.cim-card[data-slug="mara-river"]');
  assert.equal(card.querySelector('.cim-card-lock'), null);
  assert.match(card.textContent, /Free trial/);
  assert.match(card.textContent, /360° 3D/);
  pg.dom.window.close();
});

test('opening a locked world shows the pass screen and never starts the engine', async () => {
  const { dom, w, doc } = tourPage({ worlds: [WORLD], state: LOCKED });
  await settle(50);
  doc.querySelector('.cim-card[data-slug="mara-river"]').click();
  const modal = doc.querySelector('.cim-player #cim-modal.on');
  assert.ok(modal, 'the gate is shown');
  assert.match(modal.textContent, /Immersive Pass/);
  assert.match(modal.textContent, /KES 1,500/);
  const signIn = modal.querySelector('a[href^="/auth"]');
  assert.equal(new URL(signIn.href, 'https://cabana.africa').searchParams.get('next'), '/tours?vr=mara-river');
  assert.equal(w.__engineCreated || 0, 0);
  w.CabanaImmersive.close();
  dom.window.close();
});

test('the free-trial banner appears once, then stays quiet for twelve hours', async () => {
  let pg = tourPage({ state: TRIAL });
  await settle(1300);
  const banner = pg.doc.querySelector('.cim-banner');
  assert.ok(banner, 'the banner shows during the trial');
  assert.match(banner.textContent, /Enjoy a free trial/);
  assert.ok(Number(pg.w.localStorage.getItem('cim-banner-at')) > 0);
  pg.dom.window.close();

  pg = tourPage({ state: TRIAL, stored: { 'cim-banner-at': String(Date.now() - 3600e3) } });
  await settle(1300);
  assert.equal(pg.doc.querySelector('.cim-banner'), null, 'seen an hour ago: stay quiet');
  pg.dom.window.close();

  pg = tourPage({ state: { ...TRIAL, banner: { enabled: false } } });
  await settle(1300);
  assert.equal(pg.doc.querySelector('.cim-banner'), null, 'switched off in the console');
  pg.dom.window.close();
});

test('tours with a world get a 360° badge, and titles from the database are never HTML', async () => {
  const evil = { ...WORLD, slug: 'evil', title: '<img src=x onerror="window.__pwned=1">', tour_id: 9, access: 'free' };
  const { dom, w, doc } = tourPage({ worlds: [WORLD, evil], state: TRIAL, cards: [7, 8] });
  await settle(50);
  assert.ok(doc.querySelector('.ct-card[data-id="7"] .cim-tourbadge'));
  assert.equal(doc.querySelector('.ct-card[data-id="8"] .cim-tourbadge'), null);
  assert.equal(doc.querySelectorAll('#cim-track img[onerror]').length, 0);
  assert.match(doc.querySelector('.cim-card[data-slug="evil"] .cim-card-title').textContent, /<img/);
  assert.equal(w.__pwned, undefined);
  dom.window.close();
});

test('the banner waits its turn behind the welcome gift and takes the shared overlay flag while shown', async () => {
  const pg = tourPage({ state: TRIAL });
  pg.w.__cabanaOverlay = 'credit';
  await settle(1500);
  assert.equal(pg.doc.querySelector('.cim-banner'), null, 'another overlay has the screen');
  pg.w.__cabanaOverlay = null;
  await settle(1000);
  assert.ok(pg.doc.querySelector('.cim-banner'), 'shows once the screen is free');
  assert.equal(pg.w.__cabanaOverlay, 'immersive-banner');
  pg.doc.querySelector('.cim-banner-x').click();
  assert.equal(pg.w.__cabanaOverlay, null, 'gives the screen back when dismissed');
  pg.dom.window.close();
});
