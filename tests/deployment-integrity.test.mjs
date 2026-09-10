import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const file = path => new URL('../' + path, import.meta.url);
const read = path => readFileSync(file(path), 'utf8');

test('Vercel npm ci configuration keeps its committed lockfile', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.equal(vercel.installCommand, 'npm ci');
  assert.ok(existsSync(file('package-lock.json')));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.name, 'cabana');
});

test('local secret files remain excluded from git', () => {
  const ignored = new Set(read('.gitignore').split(/\r?\n/).map(line => line.trim()));
  for (const pattern of ['.env', '.env.local', '.env.*.local']) assert.ok(ignored.has(pattern));
});

test('the M-Pesa-only release cannot silently expose disabled gateways', () => {
  const checkout = read('booking-confirm.html');
  assert.match(checkout, /#pgt-paypal,#pgt-card\{display:none !important;\}/);
  assert.match(checkout, /id="hidden-gateways-wrap"[^>]*display:none !important/);
  assert.match(checkout, /Review your stay and pay with M-Pesa\./);
});

test('authoritative stay prices never claim there are no fees', () => {
  const stays = read('apartments.html');
  assert.doesNotMatch(stays, /<span class="free">No fees<\/span>/);
  assert.match(stays, /Includes Cabana fee/);
});

test('Jets Nest walkthrough source, viewer, test and room photos remain present', () => {
  for (const path of [
    'cabana-property-tour.css',
    'cabana-property-tour.js',
    'tests/property-tour.test.mjs',
    'tools/jets-nest-source/app/page.tsx',
    'tours/jets-nest/index.html',
    ...Array.from({ length: 17 }, (_, index) => `tours/jets-nest/photos/${index + 1}.jpg`),
  ]) assert.ok(existsSync(file(path)), path);
  assert.match(read('apartments.html'), /cabana-property-tour\.js/);
});

test('partner role controls stay in the side drawer, never in dashboard content', () => {
  const dashboard = read('dashboard.html');
  const chrome = read('apa-chrome.js');
  assert.match(dashboard, /data-apa-roles="menu"/);
  assert.doesNotMatch(dashboard, /partner-switch-card|data-apa="role"|apa-psc/);
  assert.doesNotMatch(chrome, /apa-psc|function switchRole|global\.switchRole/);
});
