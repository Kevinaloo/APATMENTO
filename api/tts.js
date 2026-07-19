/* ═══════════════════════════════════════════════════════════════════
   /api/tts  — Edge TTS proxy for Apa
   Uses Microsoft Edge's neural TTS service (no API key, always free).
   Returns audio/mpeg stream directly to the client.
   ═══════════════════════════════════════════════════════════════════ */

import { WebSocket } from 'ws';

// Best free female neural voice — warm, expressive, universally clear
const PRIMARY_VOICE = 'en-US-AriaNeural';
const VOICE_RATE    = '+8%';   // slightly faster → sounds more natural, less robotic
const VOICE_PITCH   = '+2Hz';  // tiny lift → warmer tone

// Edge's internal TTS WebSocket endpoint (same one the Edge browser uses)
const EDGE_WS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=';

const MAX_CHARS = 600;

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    }).replace(/-/g, '');
}

function buildSSML(text, voice) {
  const safe = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'><prosody rate='${VOICE_RATE}' pitch='${VOICE_PITCH}'>` +
    safe + `</prosody></voice></speak>`;
}

function synthesise(text, voice) {
  return new Promise((resolve, reject) => {
    const connId = uuid();
    const ws = new WebSocket(EDGE_WS + connId, {
      headers: {
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
    });

    const chunks  = [];
    const reqId   = uuid();
    let   settled = false;

    const done = (err, buf) => {
      if (settled) return;
      settled = true;
      try { if (ws.readyState === WebSocket.OPEN) ws.close(); } catch (_) {}
      err ? reject(err) : resolve(buf);
    };

    const timer = setTimeout(() => done(new Error('Edge TTS: timeout')), 12000);

    ws.on('open', () => {
      // 1. Config frame
      ws.send(
        `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
              },
            },
          },
        })
      );
      // 2. SSML request
      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n` +
        buildSSML(text, voice)
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // Audio payload follows the header separated by 'Path:audio\r\n'
        const MARKER = Buffer.from('Path:audio\r\n');
        const idx = data.indexOf(MARKER);
        if (idx !== -1) chunks.push(data.slice(idx + MARKER.length));
        return;
      }
      const msg = data.toString();
      if (msg.includes('Path:turn.end')) {
        clearTimeout(timer);
        if (chunks.length) {
          done(null, Buffer.concat(chunks));
        } else {
          done(new Error('Edge TTS: no audio received'));
        }
      }
    });

    ws.on('error', err => { clearTimeout(timer); done(err); });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const raw   = (req.query.text || '').trim();
  const voice = (req.query.voice || PRIMARY_VOICE).trim();

  if (!raw) return res.status(400).json({ error: 'text param required' });

  // Strip markdown noise, route tokens, URLs — same logic as client speak()
  const text = raw
    .replace(/\[\[.*?\]\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\/[-a-z.]+\.html/g, '')
    .replace(/[*_#`>~|]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);

  if (!text) return res.status(400).json({ error: 'text empty after cleaning' });

  try {
    const mp3 = await synthesise(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', mp3.length);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).end(mp3);
  } catch (err) {
    console.error('[tts] Edge TTS error:', err.message);
    // 503 → client falls back to SpeechSynthesis silently
    return res.status(503).json({ error: 'TTS unavailable', detail: err.message });
  }
}
