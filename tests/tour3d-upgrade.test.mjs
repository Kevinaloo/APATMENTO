import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { TEMPLATES } from '../api/lib/_mail.js';

const upgrade = readFileSync(new URL('../cabana-3d-upgrade.js', import.meta.url), 'utf8');
const tour = readFileSync(new URL('../cabana-property-tour.js', import.meta.url), 'utf8');
const addListing = readFileSync(new URL('../add-listing.html', import.meta.url), 'utf8');
const emailApi = readFileSync(new URL('../api/email.js', import.meta.url), 'utf8');

function dom(script) {
  const d = new JSDOM('<div id="slot"></div>', { url: 'https://cabana.africa/add-listing', runScripts: 'outside-only' });
  d.window.eval(script);
  return d;
}

test('the upgrade is offered as a paid, optional extra with its advantages', () => {
  const d = dom(upgrade), w = d.window;
  const ctl = w.Cabana3DUpgrade.mount(w.document.getElementById('slot'), { prefill: { phone: '0712345678' } });
  const text = w.document.getElementById('slot').textContent;
  assert.match(text, /Premium · Paid/);
  assert.match(text, /Featured at the top of Stays/);
  assert.match(text, /3D TOUR badge/);
  assert.match(text, /Nothing is charged now/);
  assert.equal(ctl.value().wanted, false, 'never pre-ticked');
  assert.equal(ctl.validate(), null, 'an unticked box never blocks publishing');
  d.window.close();
});

test('ticking it asks for a way to reach the host and validates it', () => {
  const d = dom(upgrade), w = d.window;
  const ctl = w.Cabana3DUpgrade.mount(w.document.getElementById('slot'), {});
  const box = w.document.querySelector('.c3d-opt input');
  box.checked = true; box.dispatchEvent(new w.Event('change'));
  assert.ok(w.document.querySelector('.c3d').classList.contains('on'));
  assert.match(ctl.validate(), /phone number/);
  ctl.set({ wanted: true, phone: '+254 712 345 678', name: 'Wanjiru', notes: 'Two floors' });
  assert.equal(ctl.validate(), null);
  const v = ctl.value();
  assert.equal(v.pref, 'call');
  assert.equal(v.notes, 'Two floors');
  d.window.close();
});

test('host-typed values are escaped in the offer', () => {
  const d = dom(upgrade), w = d.window;
  w.Cabana3DUpgrade.mount(w.document.getElementById('slot'), { prefill: { name: '"><img src=x onerror=alert(1)>' } });
  assert.equal(w.document.querySelectorAll('img').length, 0);
  assert.equal(w.document.querySelector('.c3d-field input').value, '"><img src=x onerror=alert(1)>');
  d.window.close();
});

test('status replaces the offer once a request exists', () => {
  const d = dom(upgrade), w = d.window;
  assert.match(w.Cabana3DUpgrade.statusHtml('requested'), /3D Tour requested/);
  assert.match(w.Cabana3DUpgrade.statusHtml('live'), /featured at the top of Stays/);
  assert.equal(w.Cabana3DUpgrade.statusHtml('none'), '');
  d.window.close();
});

test('a live tour on the listing row shows the badge; unknown hosts never reach an iframe', () => {
  const d = new JSDOM('<main></main>', { url: 'https://cabana.africa/apartments', runScripts: 'outside-only' });
  d.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  d.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  d.window.eval(tour);
  const api = d.window.CabanaPropertyTour;
  const live = { _dbId: '11111111-2222-4333-8444-555555555555', name: 'Kilimani Loft', tour3dStatus: 'live', tour3dUrl: '/tours/kilimani-loft/index.html' };
  assert.match(api.badge(live), /3D TOUR/);
  assert.match(api.section(live), /Kilimani Loft/);
  assert.equal(api.badge({ ...live, _dbId: 'a1', tour3dStatus: 'requested' }), '', 'requested is not live');
  assert.equal(api.badge({ _dbId: 'b2', tour3dStatus: 'live', tour3dUrl: 'javascript:alert(1)' }), '');
  assert.equal(api.badge({ _dbId: 'c3', tour3dStatus: 'live', tour3dUrl: 'https://evil.example/tour' }), '');
  api.open(live._dbId);
  assert.match(d.window.document.querySelector('iframe').src, /\/tours\/kilimani-loft\/index\.html$/);
  api.close(); d.window.close();
});

test('the listing form offers it on the photos step, for stays, and sends it after saving', () => {
  assert.match(addListing, /<div id="s6-tour3d" hidden><\/div>/);
  assert.match(addListing, /<script src="\/cabana-3d-upgrade\.js"><\/script>/);
  assert.match(addListing, /if\(F\.svc!=='stays'\)\{el\.hidden=true/);
  const publish = addListing.slice(addListing.indexOf('async function publish(){'), addListing.indexOf('function loadEdit('));
  assert.ok(publish.indexOf('Cabana3DUpgrade.submit') > publish.indexOf("from('listings').insert"),
    'the request is made only once the listing exists');
});

test('the team email is server-addressed and carries the host contact details', () => {
  assert.match(emailApi, /action === 'tour3d-request'/);
  assert.match(emailApi, /process\.env\.TOUR3D_TEAM_EMAIL/);
  assert.match(emailApi, /request\.host_id !== caller\.id/);
  const out = TEMPLATES.tour3dRequestTeam({
    request: { id: 'abc12345', contactName: 'Wanjiru', contactPhone: '+254 712 345 678', contactEmail: 'w@example.com', contactPref: 'call', notes: 'Gate code at reception' },
    listing: { title: 'Kilimani Loft', city: 'Nairobi', price: 4500, currency: 'KES', live: true },
    host: { email: 'w@example.com', name: 'Wanjiru' },
  });
  assert.match(out.subject, /3D Tour request · Kilimani Loft · Nairobi/);
  for (const s of ['Wanjiru', '+254 712 345 678', 'w@example.com', 'Phone call', 'Gate code at reception', 'KES 4,500']) {
    assert.ok(out.html.includes(s), `team email includes ${s}`);
  }
  const host = TEMPLATES.tour3dRequestHost({ host: { email: 'w@example.com', name: 'Wanjiru' }, listing: { title: 'Kilimani Loft' }, request: { contactPref: 'call' } });
  assert.match(host.html, /Nothing has been charged/);
});
