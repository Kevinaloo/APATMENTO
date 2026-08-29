import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { existsSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Vercel rewrites map
const REWRITES = [
  { match: /^\/api\/match-guest\/?$/, target: 'trust', query: { action: 'match-guest' } },
  { match: /^\/api\/checkin-issue\/?$/, target: 'trust', query: { action: 'checkin-issue' } },
  { match: /^\/api\/deposit-balance\/?$/, target: 'trust', query: { action: 'deposit-balance' } },
  { match: /^\/api\/verify-checkin\/?$/, target: 'trust', query: { action: 'verify-checkin' } },
  { match: /^\/api\/check-payment-status\/?$/, target: 'trust', query: { action: 'check-payment-status' } },
  { match: /^\/api\/ask-apa\/?$/, target: 'trust', query: { action: 'ask-apa' } },
  { match: /^\/api\/support\/?$/, target: 'trust', query: { action: 'support' } },
  { match: /^\/api\/call\/?$/, target: 'trust', query: { action: 'call' } },
  { match: /^\/api\/geocode\/?$/, target: 'utilities', query: { action: 'geocode' } },
  { match: /^\/api\/atlas\/?$/, target: 'utilities', query: { action: 'atlas' } },
  { match: /^\/api\/indexnow\/?$/, target: 'utilities', query: { action: 'indexnow' } },
  { match: /^\/api\/push-cron\/?$/, target: 'push-send', query: { action: 'cron' } },
  { match: /^\/api\/send-receipt\/?$/, target: 'email', query: { action: 'booking' } },
  { match: /^\/api\/poll-payment\/?$/, target: 'stk-push', query: { action: 'poll' } },
  { match: /^\/api\/reconcile-payments\/?$/, target: 'utilities', query: { action: 'reconcile-payments' } },
  { match: /^\/api\/paypal-create-order\/?$/, target: 'utilities', query: { action: 'paypal-create-order' } },
  { match: /^\/api\/paypal-capture\/?$/, target: 'utilities', query: { action: 'paypal-capture' } },
  { match: /^\/api\/paypal-webhook\/?$/, target: 'utilities', query: { action: 'paypal-webhook' } }
];

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
    if (r.match.test(urlPath)) {
      req.query = { ...r.query, ...req.query };
      return handleApi(r.target, req, res);
    }
  }

  // Direct route match: e.g. /api/agents or /api/stk-push
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length > 0) {
    const apiName = segments[0];
    const filePath = join(__dirname, 'api', `${apiName}.js`);
    if (existsSync(filePath)) {
      return handleApi(apiName, req, res);
    }
  }

  return res.status(404).json({ error: 'API route not found' });
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

// Fallback to index.html for SPA/root routes
app.use((req, res) => {
  const indexPath = join(__dirname, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cabana development server running on http://0.0.0.0:${PORT}`);
});
