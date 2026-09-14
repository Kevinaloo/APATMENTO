import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { existsSync, statSync, readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.disable('x-powered-by');

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Vercel rewrites map
const vercelConfig = JSON.parse(readFileSync(join(__dirname, 'vercel.json'), 'utf8'));
const REWRITES = vercelConfig.rewrites
  .filter(r => /^\/api\/[a-z0-9-]+$/.test(r.source))
  .map(r => {
    const destination = new URL(r.destination, 'http://cabana.local');
    return { source: r.source, target: destination.pathname.slice('/api/'.length),
      query: Object.fromEntries(destination.searchParams) };
  });

// Only application assets are public. Never serve source tooling, SQL or secrets.
app.use((req, res, next) => {
  let path;
  try { path = decodeURIComponent(req.path); }
  catch { return res.status(400).send('Invalid path'); }
  const segments = path.split('/').filter(Boolean);
  const privateRoots = new Set(['artifacts', 'tests', 'tools', 'scripts', 'seo',
    'supabase', 'supabase-migrations', 'node_modules']);
  if (segments.some(part => part.startsWith('.') && part !== '.well-known')
      || privateRoots.has(segments[0]) || path === '/server.js'
      || /\.(?:sql|md|toml|ya?ml|lock|bak)$/i.test(path)
      || /^\/(?:package(?:-lock)?|vercel)\.json$/i.test(path)) {
    return res.status(404).send('Not Found');
  }
  next();
});

// Helper to handle API requests
async function handleApi(apiName, req, res) {
  try {
    const modulePath = `./api/${apiName}.js`;
    const mod = await import(modulePath);
    const handler = mod.default || mod;
    if (typeof handler === 'function') {
      return await handler(req, res);
    }
    return res.status(500).json({ error: `API route /api/${apiName} does not export a handler function.` });
  } catch (err) {
    console.error(`[API ERROR /api/${apiName}]`, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
}

// API router middleware
app.use('/api', async (req, res, next) => {
  const urlPath = `/api${req.path}`;
  
  // Check rewrites first
  for (const r of REWRITES) {
    if (urlPath.replace(/\/$/, '') === r.source) {
      /* Express 5 exposes req.query as a getter. Rewrite the request URL so
         handlers receive the same destination query Vercel provides. Route
         parameters win over caller input; /api/subscribe?action=paypal-
         webhook must remain a newsletter request. */
      const rewritten = new URL(req.url, 'http://cabana.local');
      for (const [key, value] of Object.entries(r.query)) {
        rewritten.searchParams.set(key, value);
      }
      req.url = `${rewritten.pathname}${rewritten.search}`;
      return handleApi(r.target, req, res);
    }
  }

  // Direct route match: e.g. /api/agents or /api/stk-push
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length === 1) {
    const apiName = segments[0];
    const filePath = join(__dirname, 'api', `${apiName}.js`);
    if (existsSync(filePath)) {
      return handleApi(apiName, req, res);
    }
  }

  return res.status(404).json({ error: 'API route not found' });
});

/* The public calendar feed. Mirrors the vercel.json rewrite
   `/calendar/:token.ics` so a local run and production agree about the
   one URL hosts paste into Airbnb. */
app.get(/^\/calendar\/([A-Za-z0-9_-]+)\.ics$/, (req, res) => {
  req.url = `/api/calendar-sync?action=feed&token=${req.params[0]}`;
  return handleApi('calendar-sync', req, res);
});

// Clean URLs and Static files
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  let requestPath = req.path;
  if (requestPath === '/') {
    requestPath = '/index.html';
  }

  const directFile = join(__dirname, requestPath);
  
  // If requesting a file directly (e.g. brand.css, logo.png)
  if (existsSync(directFile) && statSync(directFile).isFile()) {
    return res.sendFile(directFile);
  }

  // If requesting clean url without .html (e.g. /apartments -> /apartments.html)
  if (!extname(requestPath)) {
    const htmlFile = join(__dirname, `${requestPath}.html`);
    if (existsSync(htmlFile) && statSync(htmlFile).isFile()) {
      return res.sendFile(htmlFile);
    }
  }

  next();
});

// Serve static assets directory
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html'
}));

// Cabana uses real pages. Unknown URLs must not masquerade as the homepage.
app.use((req, res) => {
  res.status(404).sendFile(join(__dirname, '404.html'));
});

export default app;
if (process.argv[1] && __filename === resolve(process.argv[1])) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Cabana development server running on http://127.0.0.1:${PORT}`);
  });
}
