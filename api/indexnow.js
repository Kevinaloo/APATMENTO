/* ══════════════════════════════════════════════════════════════
   APATMENTO — IndexNow submitter        (api/indexnow.js)
   ──────────────────────────────────────────────────────────────
   Instantly notifies IndexNow-participating search engines
   (Bing, Yandex, Seznam, Naver — and whoever they share with)
   that our pages exist or changed. Google does not use IndexNow;
   Google discovery runs through Search Console + sitemap.

   How it works:
     GET /api/indexnow            → submits every URL in sitemap.xml
     GET /api/indexnow?url=/x.html→ submits just that one page

   The key below is intentionally public — the protocol verifies
   ownership by fetching https://www.apatmento.space/{key}.txt,
   which this repo hosts at the site root. Re-submitting the same
   URLs is harmless per the IndexNow spec, so this endpoint needs
   no auth. Visit it once after any content deploy.
══════════════════════════════════════════════════════════════ */

const HOST = 'www.apatmento.space';
const KEY  = 'cc18b1bc5dc43435c44f29f125a500f5';

export default async function handler(req, res) {
  try {
    let urls;
    const single = (req.query && req.query.url) ? String(req.query.url) : null;

    if (single) {
      const path = single.startsWith('http') ? new URL(single).pathname : single;
      urls = ['https://' + HOST + (path.startsWith('/') ? path : '/' + path)];
    } else {
      const sm = await fetch('https://' + HOST + '/sitemap.xml');
      if (!sm.ok) throw new Error('sitemap fetch failed: ' + sm.status);
      const xml = await sm.text();
      urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
      if (!urls.length) throw new Error('no <loc> entries found in sitemap');
    }

    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: 'https://' + HOST + '/' + KEY + '.txt',
        urlList: urls,
      }),
    });

    // IndexNow returns 200 or 202 on acceptance
    res.status(200).json({
      ok: r.status === 200 || r.status === 202,
      indexnow_status: r.status,
      submitted: urls.length,
      urls,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
