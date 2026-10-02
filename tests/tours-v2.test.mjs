/* Cabana Tours v2 · static contract tests.
   The browser suite (tests/ui/tours-v2.test.js) drives the pages; these
   hold the wiring in place without a browser: the four pages and their
   scripts, the brand opt-out, the payment references, the RPCs every
   client calls actually existing in a migration, and the operator's
   private columns staying private. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const exists = f => existsSync(new URL(`../${f}`, import.meta.url));
const PAGES = ['tours.html', 'tours-catalogue.html', 'tour-guides.html', 'tours-studio.html'];
const CLIENT = ['cabana-tours.js', 'cabana-tours-spotlight.js', 'cabana-tours-home.js', 'cabana-tour-book.js',
  'cabana-tours-catalogue.js', 'cabana-tours-guides.js', 'cabana-tours-studio.js', 'cabana-tours-admin.js',
  'cabana-list-tour.js', 'chat.js'];
const MIGRATIONS = readdirSync(new URL('../supabase/migrations/', import.meta.url))
  .filter(f => f.endsWith('.sql')).map(f => read('supabase/migrations/' + f)).join('\n');
const srcs = html => [...html.matchAll(/<script[^>]+src="\/([^"?#]+)[^"]*"/g)].map(m => m[1]);

test('the four tours pages exist and every local script they load is on disk', () => {
  for (const p of PAGES) {
    assert.ok(exists(p), p);
    for (const s of srcs(read(p))) assert.ok(exists(s), `${p} loads /${s}, which does not exist`);
  }
});

test('tours pages draw their own brand: opt-out set before pwa.js, site theme files not loaded', () => {
  for (const p of PAGES) {
    const h = read(p);
    assert.match(h, /<html lang="en" data-brand="own">/, p);
    const flag = h.indexOf("window.__APA_BRAND__ = 'cabana-tours'");
    assert.ok(flag > -1, `${p}: brand flag missing`);
    const pwa = h.indexOf('src="/pwa.js');
    assert.ok(pwa === -1 || flag < pwa, `${p}: the brand flag must come before pwa.js`);
    for (const f of ['/brand.css', '/brand.js', '/cabana-rebrand.js', '/cabana-ds.css'])
      assert.ok(!h.includes(`"${f}`), `${p} must not load ${f}`);
    assert.match(h, /cabana-tours-kit\.css/, `${p}: kit stylesheet`);
  }
});

test('home page: the kit loads before everything that uses it, sections in order', () => {
  const h = read('tours.html'), s = srcs(h);
  const at = f => s.indexOf(f);
  assert.ok(at('cabana-tours.js') > -1);
  for (const f of ['cabana-tour-book.js', 'cabana-tours-spotlight.js', 'cabana-tours-home.js'])
    assert.ok(at(f) > at('cabana-tours.js'), `${f} must load after the kit`);
  assert.ok(at('cabana-pay.js') > -1 && at('cabana-pay.js') < at('cabana-tour-book.js'), 'payments before booking');
  assert.ok(at('chat.js') > -1, 'the messenger is on the page');
  const pos = id => h.indexOf(`id="${id}"`);
  for (const id of ['ct-spotlight', 'find', 'departures', 'kinds', 'immersive', 'places', 'guides', 'ct-grid', 'featured']) assert.ok(pos(id) > -1, id);
  assert.ok(pos('ct-spotlight') < pos('find') && pos('find') < pos('departures') && pos('departures') < pos('ct-grid'));
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'one h1');
});

test('header: categories plus saved and messages on every tours page', () => {
  for (const p of PAGES) {
    const h = read(p);
    for (const href of ['/tours', '/tours-catalogue', '/tour-guides']) assert.ok(h.includes(`href="${href}"`), `${p} → ${href}`);
    assert.match(h, /data-ct-saved-n/, `${p}: saved counter`);
    assert.match(h, /data-ct-inbox|data-ct-msgs|aria-label="Messages"/, `${p}: messages`);
  }
});

test('studio is private: noindex, no ad engine, on the never list', async () => {
  const h = read('tours-studio.html');
  assert.match(h, /<meta name="robots" content="noindex/);
  assert.doesNotMatch(h, /showcase\.js|apa-ad-registry/);
  const vm = await import('node:vm');
  const sandbox = { window: {} };
  vm.runInNewContext(read('apa-ad-registry.js'), sandbox);
  const REG = sandbox.window.CabanaAdRegistry;
  assert.ok(REG.never('tours-studio'));
  assert.ok(REG.surface('tours-catalogue') && REG.surface('tour-guides'), 'catalogue and guides are ad surfaces');
});

test('payments: tours and Spotlights have their own references end to end', () => {
  assert.match(read('cabana-tour-book.js'), /'TOUR-' \+ t\.id \+ '-' \+ Date\.now\(\)/);
  assert.match(read('cabana-tours-studio.js'), /tour_spotlight_create/);
  assert.match(read('api/stk-push.js'), /'SPOT-':\s*\{ table: 'tour_spotlights'/);
  const cb = read('supabase/functions/payhero-callback/index.ts');
  assert.match(cb, /\(APT\|TOUR\|EVENT\|SPOT\|CARFEE\|RPASS\|REMIT\)/);
  assert.match(cb, /'tour_spotlights'/);
  assert.match(read('api/lib/_settle.js'), /tour_spotlights/);
  assert.match(read('api/lib/_poll-payment.js'), /SELF_SETTLING/);
  assert.match(MIGRATIONS, /'SPOT-'/, 'spotlight references are minted in the database');
});

test('every RPC the tours clients call is defined by a migration', () => {
  const names = new Set();
  for (const f of CLIENT) for (const m of read(f).matchAll(/\.rpc\('([a-z_]+)'|(?:callRpc|rpc)\(\s*'([a-z_]+)'/g)) names.add(m[1] || m[2]);
  for (const m of read('chat.js').matchAll(/'(cabana_chat_[a-z_]*tour[a-z_]*)'/g)) names.add(m[1]);
  const tourish = [...names].filter(n => /tour|spotlight/.test(n));
  assert.ok(tourish.length >= 15, 'found the tours RPCs: ' + tourish.join(','));
  for (const n of tourish)
    assert.match(MIGRATIONS, new RegExp(`function public\\.${n}\\s*\\(`), `${n} is called but no migration defines it`);
});

test('the messenger knows tours: start, trip, offers and booking threads', () => {
  const c = read('chat.js');
  for (const n of ['cabana_chat_start_tour', 'cabana_chat_set_tour_trip', 'cabana_chat_send_tour_offer',
                   'cabana_chat_tour_offer_respond', 'cabana_chat_for_tour_booking'])
    assert.ok(c.includes(n), n);
  assert.match(c, /openForBooking, openTour, openForTourBooking,/, 'exported on window.CabanaChat');
});

test('operator contact details never read from the browser', () => {
  const lt = read('cabana-list-tour.js');
  assert.doesNotMatch(lt, /from\('tour_operators'\)\.select\('\*'\)/);
  assert.doesNotMatch(lt, /\.select\(\)\.then/);
  assert.match(lt, /rpc\('tour_operator_me'\)/);
  for (const f of CLIENT) assert.doesNotMatch(read(f), /tour_operators'\)\s*\.select\('\*'\)/, f);
  assert.match(read('cabana-tours-admin.js'), /rpc\('admin_tour_operators'\)/);
});

test('listing form offers weekly schedules and a departure time', () => {
  const h = read('list-your-tour.html'), js = read('cabana-list-tour.js');
  assert.match(h, /<option value="weekly">/);
  assert.equal((h.match(/name="departure_days" value="(mon|tue|wed|thu|fri|sat|sun)"/g) || []).length, 7);
  assert.match(h, /id="t-time"[^>]*type="time"/);
  assert.match(h, /id="o-persona"/);
  assert.match(js, /departure_time:/);
  assert.match(js, /departure_days:/);
  assert.match(js, /persona:/);
  assert.match(MIGRATIONS, /'fixed', 'on_request', 'daily', 'weekly'/);
});

test('sitemap lists the catalogue and guides; the studio stays out', () => {
  const s = read('sitemap-core.xml');
  assert.match(s, /<loc>https:\/\/cabana\.africa\/tours-catalogue<\/loc>/);
  assert.match(s, /<loc>https:\/\/cabana\.africa\/tour-guides<\/loc>/);
  assert.doesNotMatch(s, /tours-studio/);
});

test('Vercel Hobby cap: still twelve serverless functions or fewer', () => {
  const fns = readdirSync(new URL('../api/', import.meta.url)).filter(f => f.endsWith('.js'));
  assert.ok(fns.length <= 12, fns.join(', '));
});

/* ── the page the team edits (tour_page_blocks) ─────────────────────── */
const PAGE_SQL = read('supabase/migrations/20260929090000_tours_page_content.sql');
// The v3 world re-seeds the launch copy (blocks nobody has edited yet).
const V3_SQL = read('supabase/migrations/20260930210000_tours_v3_world.sql');
const GUARD_SQL = read('supabase/migrations/20260930220000_tours_v3_pause_guard.sql');
function pageDefaults() {
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  new Function('window', read('cabana-tours-page.js'))(sandbox.window);
  return sandbox.window.CabanaToursPageDefaults;
}

test('launch copy in the page and in the migration seed say the same thing', () => {
  const blocks = pageDefaults();
  assert.ok(Array.isArray(blocks) && blocks.length >= 9);
  for (const b of blocks) {
    assert.match(V3_SQL, new RegExp(`\\('${b.id}', '${b.kind}', ${b.position}, ${b.enabled}`), `${b.id} is seeded with the same position and switch`);
    for (const k of ['title', 'lede', 'eyebrow', 'cta_label', 'film_title', 'film_text', 'film_cta', 'empty_title', 'empty_text', 'search_placeholder']) {
      if (!b.content[k]) continue;
      const v = String(b.content[k]).replace(/'/g, "''");
      assert.ok(V3_SQL.includes(`'${v}'`), `${b.id}.${k} differs between cabana-tours-page.js and the seed`);
    }
  }
  // The 360° room is on (a world is live); the page hides it whenever no world is.
  assert.equal(blocks.find(b => b.id === 'immersive').enabled, true);
  const places = blocks.find(b => b.id === 'places');
  assert.ok(places && places.enabled && places.content.show_map === true, 'the atlas ships switched on');
  assert.match(V3_SQL, /'hero', 'departures', 'kinds', 'collection', 'immersive', 'places', 'guides', 'catalogue', 'pitch', 'invite'/, 'places is a block kind');
  assert.match(V3_SQL, /where public\.tour_page_blocks\.updated_by is null/, 'a block the team edited keeps their words');
});

test('the page table is public to read and admin-only to write', () => {
  assert.match(PAGE_SQL, /create policy tour_page_blocks_read on public\.tour_page_blocks for select to anon, authenticated using \(true\)/);
  assert.match(PAGE_SQL, /create policy tour_page_blocks_admin on public\.tour_page_blocks for all to authenticated\s+using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/);
  assert.match(PAGE_SQL, /grant select on public\.tour_page_blocks to anon, authenticated;/);
  assert.match(PAGE_SQL, /constraint tour_page_blocks_single check \(kind = 'collection' or id = kind\)/);
  assert.match(PAGE_SQL, /update public\.tour_spotlights\s+set status = 'ended'[\s\S]*where kind = 'house' and media_kind in \('art', 'world'\)/, 'the illustrated stand-ins are retired');
});

test('no stand-in content ships: no built-in slides, drawn scenes or invented listings', () => {
  const sl = read('cabana-tours-spotlight.js'), kit = read('cabana-tours.js'), home = read('cabana-tours-home.js'), page = read('tours.html');
  assert.doesNotMatch(sl, /var HOUSE\s*=|sceneGuides|sceneFeatured|sceneWorld|acacia\(/);
  assert.doesNotMatch(kit, /function acacia|function birds|Masai Mara', 'Nairobi', 'Naivasha'/);
  assert.doesNotMatch(home, /Dawn with the \*lions\*|ct-board-empty|GLYPH/);
  assert.doesNotMatch(page, /TouristTrip|Wildbosses/, 'no structured data for tours that do not exist');
  assert.match(sl, /function coverHTML/, 'with nothing running, the top is the cover');
});

test('the FAQ schema matches the questions on the page', () => {
  const page = read('tours.html');
  const visible = [...page.matchAll(/<summary>([^<]+)<\/summary>/g)].map(m => m[1].replace(/&rsquo;/g, '’'));
  const graph = JSON.parse(page.match(/<!-- CABANA-SEO-GRAPH -->\s*<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const faq = graph['@graph'].find(n => n['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map(q => q.name), visible);
});

test('the console carries the page editor, loaded with the tours desk', () => {
  const core = read('admin-console.js'), ed = read('cabana-tours-page-admin.js'), adm = read('cabana-tours-admin.js');
  // The Marquee script is loaded too: the console previews slots and the cover with the page's own stage.
  assert.match(core, /tours: \['\/cabana-tours-page\.js', '\/cabana-tours-spotlight\.js', '\/cabana-tours-admin\.js', '\/cabana-tours-page-admin\.js'\]/);
  assert.match(adm, /state\.tab === 'page'/);
  assert.match(ed, /from\('tour_page_blocks'\)\.upsert/);
  assert.match(ed, /kind: 'house'/);
  assert.match(ed, /internal\(f\.cta_url\)/, 'slide buttons stay on Cabana');
});

test('tours pages use Cabana’s own faces: Cabana Display, Geist and Geist Mono', () => {
  const css = read('cabana-tours-kit.css');
  assert.match(css, /font-family: 'Cabana Display';\s*src: url\('\/fonts\/cabana-display-soft\.woff2'\)/);
  assert.match(css, /src: url\('\/fonts\/cabana-display-soft-italic\.woff2'\)/);
  assert.match(css, /--ct-f: 'Geist'/);
  assert.match(css, /--ct-flap: 'Geist Mono'/);
  assert.doesNotMatch(css, /Mona Sans|Instrument Serif|Big Shoulders|font-stretch/);
  for (const f of ['fonts/cabana-display-soft-italic.woff2', 'assets/fonts/geist-latin.woff2', 'assets/fonts/geist-mono-latin.woff2', 'assets/fonts/geist-OFL.txt']) assert.ok(exists(f), f);
});

/* ── v3: the tours world ──────────────────────────────────────────────── */
test('the world: one stylesheet over the kit on every tours page, its own faces on disk, solid colour only', () => {
  for (const p of PAGES) {
    const h = read(p);
    const kit = h.indexOf('/cabana-tours-kit.css'), world = h.indexOf('/cabana-tours-world.css');
    assert.ok(world > kit && kit > -1, `${p}: the world stylesheet loads after the kit`);
    assert.match(h, /<body class="ct-x [^"]*ct-w/, `${p}: body opts into the world`);
  }
  const css = read('cabana-tours-world.css');
  assert.match(css, /font-family: 'Cabana Wide';\s*src: url\('\/assets\/fonts\/archivo-wide-latin\.woff2'\)/);
  assert.match(css, /font-family: 'Hanken Grotesk';/);
  for (const f of ['assets/fonts/archivo-wide-latin.woff2', 'assets/fonts/hanken-grotesk-latin.woff2', 'assets/fonts/geist-mono-latin.woff2']) assert.ok(exists(f), f);
  assert.doesNotMatch(css, /background-clip:\s*text/, 'no gradient poured into text');
  for (const p of ['tours.html', 'tours-catalogue.html', 'tour-guides.html']) assert.match(read(p), /rel="preload" href="\/assets\/fonts\/archivo-wide-latin\.woff2"/, `${p}: headline face preloaded`);
});

test('the Marquee: paid first, then ads booked on tours.marquee, featured, automatic, then Cabana; ads are counted', () => {
  const sl = read('cabana-tours-spotlight.js');
  assert.match(sl, /var live = \[\];/);
  assert.match(sl, /live = paid\.concat\(rest\.slice\(0, Math\.max\(0, max - paid\.length\)\)\)/, 'paid slots always fit');
  assert.match(sl, /adl\.concat\(feat, auto, world \? \[world\] : \[\], house\)/, 'the order after paid slots');
  assert.match(sl, /c\.slots\.indexOf\('tours\.marquee'\) !== -1/, 'only campaigns booked on the Marquee');
  assert.match(sl, /rpc\('ad_track', \{ p_campaign: String\(cmp\.id\), p_event: ev, p_page: 'tours', p_slot: 'tours\.marquee'/);
  assert.match(sl, /rel="noopener sponsored"/, 'an ad that leaves Cabana says so');
  assert.match(sl, /function safeHref/, 'Cabana slots never leave Cabana');
  assert.match(sl, /CabanaMarquee = global\.CabanaSpotlight = \{ create: create, cover: coverHTML/);
  const sandbox = { window: {} };
  new Function('window', read('apa-ad-registry.js'))(sandbox.window);
  const slot = sandbox.window.CabanaAdRegistry.slot('tours.marquee');
  assert.ok(slot && slot.kind === 'managed' && slot.probe === '#ct-spotlight', 'the console can book the Marquee');
  assert.match(V3_SQL, /'world_slug', sp\.world_slug/, 'the feed carries the 360° world a slot opens');
  assert.match(V3_SQL, /where x\.kind = 'sponsored' or x\.ord <= coalesce\(\(select mx from s\), 10\)/);
});

test('places, alerts, filming and changes: every client call has its function, and the console reads them', () => {
  for (const n of ['tour_alert_set', 'tour_alerts_mine', 'tour_demand', 'admin_tour_demand', 'tour_immersive_request',
                   'tour_immersive_requests_mine', 'admin_tour_immersive_requests', 'admin_tour_immersive_request_set',
                   'tour_change_propose', 'tour_changes_mine', 'admin_tour_changes', 'admin_tour_change_decide',
                   'tour_operator_pause', 'admin_tour_places_rematch'])
    assert.match(MIGRATIONS, new RegExp(`function public\\.${n}\\s*\\(`), n);
  const adm = read('cabana-tours-admin.js'), st = read('cabana-tours-studio.js'), kit = read('cabana-tours.js');
  for (const n of ['admin_tour_demand', 'admin_tour_changes', 'admin_tour_change_decide', 'admin_tour_immersive_requests', 'admin_tour_immersive_request_set', 'admin_tour_places_rematch'])
    assert.ok(adm.includes(`'${n}'`), `console calls ${n}`);
  assert.match(adm, /from\('tour_places'\)\.upsert/, 'the console keeps the places');
  for (const n of ['tour_operator_pause', 'tour_change_propose', 'tour_changes_mine', 'tour_demand', 'tour_immersive_request', 'tour_immersive_requests_mine'])
    assert.ok(st.includes(`'${n}'`), `studio calls ${n}`);
  assert.match(kit, /rpc\('tour_alert_set', \{ p_place: place, p_category: cat, p_on: want \}\)/);
  assert.match(read('admin-console.js'), /'tour_changes', 'tour_film'/, 'changes and filming reach the console inbox');
  const atlas = JSON.parse(read('assets/tours/atlas-east-africa.json'));
  for (const k of ['w', 'h', 'lon0', 'lat0', 'kx', 'ky', 'land', 'lakes', 'labels']) assert.ok(atlas[k] != null, `atlas.${k}`);
});

test('a guide cannot resume a tour past review: the pause fingerprint belongs to the database', () => {
  assert.match(GUARD_SQL, /create trigger tour_pause_sig_guard before insert or update on public\.tours/);
  assert.match(GUARD_SQL, /elsif new\.pause_sig is distinct from old\.pause_sig then\s+new\.pause_sig := old\.pause_sig;/);
  assert.match(GUARD_SQL, /perform set_config\('cabana\.tour_pause', '1', true\);/);
  assert.match(GUARD_SQL, /raise exception 'Cabana paused this tour/);
  // Anything the console does clears the guide's fingerprint.
  assert.match(read('cabana-tours-admin.js'), /var patch = \{ status: status, reviewed_at: new Date\(\)\.toISOString\(\), pause_sig: null \};/);
});

test('the console writes every slot the page has: places block, 360° room, filming line, Cabana slots with badge, device and world', () => {
  const ed = read('cabana-tours-page-admin.js');
  assert.match(ed, /places: COPY\.concat\(\[/);
  assert.match(ed, /immersive: COPY\.slice\(\)/);
  for (const k of ['film_title', 'film_text', 'film_cta', 'show_map', 'search_placeholder']) assert.ok(ed.includes(`['${k}'`), k);
  assert.match(ed, /label: f\.label\.trim\(\) \|\| null, device: f\.device \|\| 'all', world_slug: f\.world_slug \|\| null/);
  assert.match(ed, /window\.CabanaMarquee/, 'previews are drawn by the Marquee itself');
  assert.match(ed, /\/cabana-tours-world\.css/, 'with the page stylesheet');
});

test('the catalogue reads a place and a group size from the link', () => {
  const cat = read('cabana-tours-catalogue.js');
  assert.match(cat, /get\('place'\)/);
  assert.match(cat, /get\('people'\)/);
});
