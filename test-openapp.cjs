/* Exercises the native-app handoff in pwa.js across the situations a
   guest actually arrives in: Chrome with the app, Chrome without it, an
   in-app browser, inside the TWA itself, iOS, and desktop. */
const fs = require('fs'), { JSDOM, VirtualConsole } = require('jsdom');

const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  instagram: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.0 Android',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
const PKG = 'africa.cabana.app';

function boot({ ua, installed = false, standalone = false, referrer = null, url = 'https://cabana.africa/apartments?open=abc#gallery' }) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));

  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'dangerously', url, virtualConsole: vc, pretendToBeVisual: true,
    ...(referrer ? { referrer } : {}),
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'userAgent', { get: () => ua });
      w.navigator.getInstalledRelatedApps = () =>
        Promise.resolve(installed ? [{ platform: 'play', id: PKG }] : []);
      w.matchMedia = q => ({
        matches: standalone && /standalone/.test(q),
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      });
      w.navigator.serviceWorker = { register: () => Promise.reject(new Error('n/a')), addEventListener() {} };
    },
  });

  const w = dom.window;
  const src = fs.readFileSync('pwa.js', 'utf8');
  w.eval(src);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return { w, errs };
}

const results = [];
const ok = (n, c, x) => { results.push(!!c); console.log('  ' + (c ? '\u2713' : '\u2717') + ' ' + n + (c ? '' : '  \u2192 ' + (x || ''))); };

(async () => {
  console.log('\nopen-in-app handoff');

  // ── Intent URL shape ──
  {
    const { w } = boot({ ua: UA.chromeAndroid });
    const intent = w.CabanaApp.intentUrl('https://cabana.africa/apartments?open=abc#gallery');
    ok('intent targets the app package', intent.includes('package=' + PKG), intent);
    ok('intent keeps the path and query',
      intent.startsWith('intent://cabana.africa/apartments?open=abc#Intent;'), intent);
    ok('intent carries a web fallback so nobody is stranded',
      intent.includes('S.browser_fallback_url=' + encodeURIComponent('https://cabana.africa/apartments?open=abc#gallery')), intent);
    ok('exactly one Intent delimiter', (intent.match(/#Intent;/g) || []).length === 1, intent);
    ok('intent is terminated', intent.endsWith(';end'), intent.slice(-24));
  }

  const settle = () => new Promise(r => setTimeout(r, 60));

  // ── Chrome on Android, app installed → offer the handoff ──
  {
    const { w, errs } = boot({ ua: UA.chromeAndroid, installed: true });
    await settle();
    const bar = w.document.getElementById('cbn-openapp');
    ok('no errors on boot', errs.length === 0, errs.join('|'));
    ok('app installed: bar shown', !!bar);
    if (bar) {
      /* jsdom refuses to let a test redefine location.href, so the proof
         that Open reached the handoff is the marker openInApp() writes
         immediately before navigating, plus jsdom's own navigation
         complaint. The intent string itself is unit-tested above. */
      w.document.getElementById('cbn-openapp-go').click();
      ok('Open reaches the handoff', w.sessionStorage.getItem('cbn_openapp_tried') === '1');
      ok('Open triggers a navigation', errs.some(m => /navigation/i.test(m)), errs.join('|'));
    } else { ok('Open reaches the handoff', false); ok('Open triggers a navigation', false); }
  }

  // ── Chrome on Android, app absent → stay quiet ──
  {
    const { w } = boot({ ua: UA.chromeAndroid, installed: false });
    await settle();
    ok('app absent: nothing shown', !w.document.getElementById('cbn-openapp'));
  }

  // ── Instagram's in-app browser → offer an escape even if undetectable ──
  {
    const { w } = boot({ ua: UA.instagram, installed: false });
    await settle();
    ok('in-app browser: escape offered', !!w.document.getElementById('cbn-openapp'));
  }

  // ── Already inside the Android app (TWA reports its own referrer) ──
  {
    const { w } = boot({ ua: UA.chromeAndroid, installed: true, referrer: 'android-app://' + PKG + '/' });
    await settle();
    ok('inside the app: never nags', !w.document.getElementById('cbn-openapp'));
    ok('inside the app is detected', w.CabanaApp.inNativeApp() === true);
  }

  // ── Installed PWA in standalone display mode ──
  {
    const { w } = boot({ ua: UA.chromeAndroid, installed: true, standalone: true });
    await settle();
    ok('standalone PWA: never nags', !w.document.getElementById('cbn-openapp'));
  }

  // ── iOS and desktop have no Android app to open ──
  {
    const { w } = boot({ ua: UA.iphone, installed: true });
    await settle();
    ok('iOS: nothing shown', !w.document.getElementById('cbn-openapp'));
  }
  {
    const { w } = boot({ ua: UA.desktop, installed: true });
    await settle();
    ok('desktop: nothing shown', !w.document.getElementById('cbn-openapp'));
  }

  // ── Dismissal is remembered ──
  {
    const { w } = boot({ ua: UA.chromeAndroid, installed: true });
    await settle();
    w.document.getElementById('cbn-openapp-x').click();
    const snoozed = Number(w.localStorage.getItem('cbn_openapp_snooze') || 0);
    ok('dismissal snoozes for a week',
      snoozed > Date.now() + 6 * 86400000 && snoozed < Date.now() + 8 * 86400000, snoozed);
  }

  const pass = results.every(Boolean);
  console.log('\n' + (pass ? '\u2705 OPEN-IN-APP PASS' : '\u274c FAIL'));
  process.exit(pass ? 0 : 1);
})();
