// Read-only inventory of the complete static application. No requests or writes.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const pages = readdirSync('.').filter(f => f.endsWith('.html')).sort();
const report = { pages: pages.length, inlineScripts: 0, syntaxErrors: [], missingAssets: [], missingLinks: [], duplicateIds: [], missingLabels: [], largePages: [] };
for (const file of pages) {
  const source = readFileSync(file, 'utf8');
  const dom = new JSDOM(source);
  const doc = dom.window.document;
  if (Buffer.byteLength(source) > 200_000) report.largePages.push({ file, bytes: Buffer.byteLength(source) });
  const ids = new Set();
  for (const el of doc.querySelectorAll('[id]')) {
    if (ids.has(el.id)) report.duplicateIds.push({ file, id: el.id });
    ids.add(el.id);
  }
  for (const el of doc.querySelectorAll('script:not([src])')) {
    if (el.type && !['text/javascript', 'application/javascript'].includes(el.type)) continue;
    if (!el.textContent.trim()) continue;
    report.inlineScripts++;
    try { new vm.Script(el.textContent, { filename: file }); }
    catch (error) { report.syntaxErrors.push({ file, error: error.message }); }
  }
  for (const el of doc.querySelectorAll('script[src],link[href],img[src],a[href]')) {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    const value = el.getAttribute(attr);
    if (!value || /^(?:[a-z]+:|\/\/|#)/i.test(value) || /[${}<>]/.test(value)) continue;
    const path = decodeURIComponent(value.split(/[?#]/)[0]);
    if (!path || path.startsWith('/api/') || path.startsWith('/calendar/')) continue;
    const target = resolve(dirname(file), path.replace(/^\//, '') || 'index.html');
    if ([target, target + '.html'].some(p => existsSync(p)) || path === '/') continue;
    const item = { file, target: value };
    (el.tagName === 'A' ? report.missingLinks : report.missingAssets).push(item);
  }
  for (const el of doc.querySelectorAll('input:not([type=hidden]):not([type=submit]),select,textarea')) {
    if (!el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')) {
      report.missingLabels.push({ file, id: el.id || el.name || el.type });
    }
  }
  dom.window.close();
}
const rootJs = readdirSync('.').filter(f => f.endsWith('.js') && !f.startsWith('vendor-'));
const sources = [...pages, ...rootJs].map(f => readFileSync(f, 'utf8')).join('\n');
report.unreferencedRootScripts = rootJs.filter(f => !['server.js', 'sw.js'].includes(f) && !sources.includes(f));
report.largePages.sort((a,b) => b.bytes-a.bytes);
console.log(JSON.stringify(report, null, 2));
