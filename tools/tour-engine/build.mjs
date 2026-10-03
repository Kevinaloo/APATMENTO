/* Builds every tour under src/tours/<slug>/entry.ts into one shared,
   code-split bundle in /tours/_engine/assets, plus one stylesheet, and
   writes /tours/<slug>/index.html for each.

   three.js and the engine land in shared chunks, so a guest who opens a
   second tour downloads only that tour's scene.

     npm run build           all tours
     npm run build -- jets-nest   one tour (others are left as they are) */
import { build } from 'esbuild';
import { readdirSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const outRoot = join(repo, 'tours', '_engine');
const outAssets = join(outRoot, 'assets');
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));

const slugs = readdirSync(join(here, 'src', 'tours'))
  .filter(d => existsSync(join(here, 'src', 'tours', d, 'entry.ts')))
  .filter(d => !only.length || only.includes(d));
if (!slugs.length) { console.error('No tours to build.'); process.exit(1); }

/* A full build replaces the shared folder; a partial one adds to it. */
if (!only.length && existsSync(outAssets)) rmSync(outAssets, { recursive: true });
mkdirSync(outAssets, { recursive: true });

const js = await build({
  entryPoints: Object.fromEntries(slugs.map(s => [s, join(here, 'src', 'tours', s, 'entry.ts')])),
  outdir: outAssets,
  bundle: true, splitting: true, format: 'esm', platform: 'browser',
  target: ['es2020', 'safari14'], minify: true, legalComments: 'none', treeShaking: true,
  entryNames: '[name]-[hash]', chunkNames: 'chunk-[hash]',
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true, logLevel: 'warning',
});
const css = await build({
  entryPoints: { tour: join(here, 'src', 'ui', 'tour.css') },
  outdir: outAssets, bundle: true, minify: true, entryNames: '[name]-[hash]', metafile: true, logLevel: 'warning',
});
const cssFile = '/tours/_engine/assets/' + basename(Object.keys(css.metafile.outputs).find(f => f.endsWith('.css')));

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

for (const slug of slugs) {
  const entryOut = Object.entries(js.metafile.outputs).find(([, v]) => v.entryPoint && v.entryPoint.endsWith(join('tours', slug, 'entry.ts')))[0];
  const entryUrl = '/tours/_engine/assets/' + basename(entryOut);
  /* Preload the static imports of the entry so the first paint is not a waterfall. */
  const preloads = js.metafile.outputs[entryOut].imports
    .filter(i => i.kind === 'import-statement')
    .map(i => '/tours/_engine/assets/' + basename(i.path));
  const meta = JSON.parse(readFileSync(join(here, 'src', 'tours', slug, 'meta.json'), 'utf8'));
  const cover = `/tours/${slug}/photos/${meta.cover}.jpg`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="${esc(meta.night)}">
<title>${esc(meta.title)} · Cabana 3D tour</title>
<meta name="description" content="${esc(meta.description)}">
<link rel="stylesheet" href="${cssFile}">
<link rel="preload" as="image" href="${cover}">
${preloads.map(p => `<link rel="modulepreload" href="${p}">`).join('\n')}
<style>html,body{margin:0;height:100%;background:${esc(meta.night)}}#root{position:fixed;inset:0}.boot{position:fixed;inset:0;display:grid;place-items:end start;padding:clamp(20px,5vw,48px);color:#fff;font:600 15px/1.4 system-ui,sans-serif;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url(${cover}) center/cover}</style>
</head><body><div id="root"><div class="boot" data-boot>Opening ${esc(meta.title)}…</div></div>
<script type="module">import("${entryUrl}").catch(function(e){console.error("Tour failed",e);document.getElementById("root").innerHTML='<div class="boot"><div><strong style="display:block;font:600 26px Georgia,serif;margin-bottom:8px">The 3D view could not start</strong>Close this view, refresh the listing once, and open Explore in 3D again.</div></div>'})</script>
</body></html>
`;
  mkdirSync(join(repo, 'tours', slug), { recursive: true });
  writeFileSync(join(repo, 'tours', slug, 'index.html'), html);
  /* The per-tour bundles of the old React viewers are gone. */
  for (const old of ['assets', 'viewer.css']) {
    const p = join(repo, 'tours', slug, old);
    if (existsSync(p)) rmSync(p, { recursive: true });
  }
  console.log('Built', slug, '→', entryUrl);
}

const sizes = Object.entries(js.metafile.outputs).map(([f, v]) => [basename(f), v.bytes]);
const total = sizes.reduce((a, [, b]) => a + b, 0);
console.log('JS chunks:', sizes.map(([f, b]) => f + ' ' + (b / 1024).toFixed(0) + 'KB').join(', '));
console.log('JS total', (total / 1024).toFixed(0) + 'KB · CSS', (statSync(join(repo, cssFile)).size / 1024).toFixed(1) + 'KB');
