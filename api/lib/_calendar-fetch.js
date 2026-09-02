/* ══════════════════════════════════════════════════════════════════════
   CABANA · Guarded calendar fetch  (api/lib/_calendar-fetch.js)
   ──────────────────────────────────────────────────────────────────────
   A host pastes a URL and we make our server request it. That is a
   server-side request forgery primitive handed to anyone with a host
   account, and it is the only genuinely dangerous part of calendar sync.

   The previous defence was a six-domain allowlist. It blocked thirty
   legitimate platforms and, more to the point, it was not where the
   danger lives: the danger is our server reaching an address only our
   server can reach — the cloud metadata endpoint at 169.254.169.254,
   a Supabase instance on a private subnet, localhost.

   So the control moved to the layer that can actually enforce it:

     · WE RESOLVE THE NAME OURSELVES and refuse the connection inside the
       socket's lookup callback. This closes the DNS-rebinding window
       that a resolve-then-fetch check leaves wide open: a name that
       answers with a public IP for our check and a private one for the
       real connection never gets a second chance, because there is only
       one lookup and we are standing in it.
     · EVERY REDIRECT HOP IS RE-CHECKED. A public URL that 302s to
       http://169.254.169.254/ is the textbook bypass.
     · SIZE AND TIME ARE CAPPED while streaming, so a feed that never
       ends cannot hold a serverless function open or exhaust its memory.
     · HTTPS ONLY, and credentials in the URL are refused.

   With that in place, any calendar on the public internet is safe to
   fetch, which is exactly what "works with every platform" requires.
══════════════════════════════════════════════════════════════════════ */

import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';
import { normaliseFeedUrl } from './_calendar-platforms.js';

export const FETCH_LIMITS = {
  maxBytes:     6 * 1024 * 1024,
  timeoutMs:    20000,
  maxRedirects: 5,
};

/* Address space our server can reach and the public internet cannot.
   Everything here is a way to make us fetch something on our own side of
   the firewall and hand it back. */
export function isBlockedAddress(ip) {
  if (!ip) return true;

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0)   return true;                    // "this network"
    if (a === 10)  return true;                    // RFC 1918
    if (a === 127) return true;                    // loopback
    if (a === 169 && b === 254) return true;        // link-local + AWS/GCP metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0)   return true;        // IETF protocol assignments
    if (a === 198 && (b === 18 || b === 19)) return true;  // benchmarking
    if (a === 100 && b >= 64 && b <= 127) return true;     // CGNAT
    if (a >= 224) return true;                      // multicast + reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const v6 = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (v6 === '::' || v6 === '::1') return true;
    /* ::ffff:10.0.0.1 is a v4 address wearing a v6 hat, and it routes to
       exactly the private host it names. */
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
    if (mapped) return isBlockedAddress(mapped[1]);
    if (/^f[cd]/.test(v6)) return true;             // unique local fc00::/7
    if (/^fe[89ab]/.test(v6)) return true;          // link-local fe80::/10
    if (/^ff/.test(v6)) return true;                // multicast
    if (/^2002:/.test(v6)) return true;             // 6to4, wraps v4
    if (/^64:ff9b:/.test(v6)) return true;          // NAT64
    return false;
  }

  return true;                                      // unparseable → refuse
}

/* The lookup the socket itself uses. Refusing here rather than earlier is
   the whole point: there is no gap between the check and the connect. */
function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    const safe = list.filter(a => !isBlockedAddress(a.address));

    if (!safe.length) {
      const blocked = list.map(a => a.address).join(', ') || 'none';
      return callback(Object.assign(
        new Error(`Refusing to connect to a private or reserved address (${blocked})`),
        { code: 'EBLOCKED' }
      ));
    }
    /* Honour the caller's shape: `all` wants the array back. */
    if (options && options.all) return callback(null, safe);
    return callback(null, safe[0].address, safe[0].family);
  });
}

function decompress(buffer, encoding) {
  try {
    if (/\bgzip\b/i.test(encoding))    return zlib.gunzipSync(buffer);
    if (/\bdeflate\b/i.test(encoding)) return zlib.inflateSync(buffer);
    if (/\bbr\b/i.test(encoding))      return zlib.brotliDecompressSync(buffer);
  } catch {
    /* A body that claims an encoding it does not have is still usually
       readable as text. Try the raw bytes rather than failing the sync. */
  }
  return buffer;
}

function requestOnce(url, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);

    /* Credentials in a feed URL would be sent to whatever the redirect
       chain ends at. No legitimate platform needs them. */
    if (target.username || target.password) {
      return reject(Object.assign(new Error('Calendar URLs must not contain credentials'),
                                  { status: 400 }));
    }
    if (target.protocol !== 'https:') {
      return reject(Object.assign(new Error('Calendar feeds must be https'), { status: 400 }));
    }

    const req = https.request({
      protocol: 'https:',
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: 'GET',
      headers,
      lookup: guardedLookup,
      servername: target.hostname,
      timeout: timeoutMs,
    }, res => {
      const chunks = [];
      let bytes = 0;

      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > FETCH_LIMITS.maxBytes) {
          req.destroy();
          reject(Object.assign(
            new Error(`Calendar is larger than ${Math.round(FETCH_LIMITS.maxBytes / 1048576)} MB`),
            { status: 413 }));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          bytes,
          body: decompress(raw, res.headers['content-encoding'] || '').toString('utf8'),
        });
      });

      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(Object.assign(new Error(`Calendar did not respond within ${timeoutMs / 1000}s`),
                           { status: 504 }));
    });
    req.on('error', err => {
      if (err.code === 'EBLOCKED') return reject(Object.assign(err, { status: 400 }));
      reject(Object.assign(new Error(`Could not reach the calendar: ${err.code || err.message}`),
                           { status: 502 }));
    });
    req.end();
  });
}

/**
 * Fetch a calendar with conditional-GET support.
 *
 * @param {string} rawUrl
 * @param {object} [o]  { etag, lastModified, timeoutMs }
 * @returns {Promise<{status:number, notModified:boolean, body:string,
 *                    etag:?string, lastModified:?string, bytes:number,
 *                    finalUrl:string, contentType:?string}>}
 */
export async function fetchCalendar(rawUrl, o = {}) {
  const start = normaliseFeedUrl(rawUrl);
  if (!start) {
    throw Object.assign(new Error('That is not a valid https calendar link'), { status: 400 });
  }

  const headers = {
    /* Naming ourselves honestly. Several platforms rate-limit or block
       clients that pretend to be browsers, and a real contact address in
       the agent string is what gets us unblocked when one of them
       decides we are too chatty. */
    'User-Agent': 'Cabana-Calendar/2.0 (+https://cabana.africa/calendar-sync)',
    'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
  };
  /* The two headers that turn an hourly poll into a 304 and no body.
     Airbnb, Google and most channel managers honour at least one. */
  if (o.etag)         headers['If-None-Match']     = o.etag;
  if (o.lastModified) headers['If-Modified-Since'] = o.lastModified;

  let url = start;
  for (let hop = 0; hop <= FETCH_LIMITS.maxRedirects; hop++) {
    const res = await requestOnce(url, headers, o.timeoutMs || FETCH_LIMITS.timeoutMs);

    if (res.status === 304) {
      return { status: 304, notModified: true, body: '', bytes: 0,
               etag: o.etag || null, lastModified: o.lastModified || null,
               finalUrl: url, contentType: null };
    }

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      /* Re-normalised and re-guarded. The next requestOnce runs the same
         private-address lookup, so a redirect into RFC 1918 dies here. */
      const next = normaliseFeedUrl(new URL(res.headers.location, url).href);
      if (!next) {
        throw Object.assign(new Error('Calendar redirected somewhere we cannot follow'),
                            { status: 400 });
      }
      url = next;
      continue;
    }

    if (res.status !== 200) {
      const hint = res.status === 401 || res.status === 403
        ? 'The link needs a login. Use the platform’s public or secret .ics export link, not the page URL.'
        : res.status === 404
        ? 'The link is gone. Re-copy it from the platform — most export links change when a listing is recreated.'
        : `The calendar answered ${res.status}.`;
      throw Object.assign(new Error(hint), { status: res.status });
    }

    return {
      status: 200,
      notModified: false,
      body: res.body,
      bytes: res.bytes,
      etag:         res.headers.etag || null,
      lastModified: res.headers['last-modified'] || null,
      contentType:  res.headers['content-type'] || null,
      finalUrl: url,
    };
  }

  throw Object.assign(new Error('Calendar redirected too many times'), { status: 400 });
}

export default { fetchCalendar, isBlockedAddress, FETCH_LIMITS };
