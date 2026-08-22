/* ══════════════════════════════════════════════════════════════════════
   CABANA · ASK APA  →  COMPATIBILITY SHIM
   api/lib/_ask-apa.js      →  /api/ask-apa   (routed by api/trust.js)

   THIS IS NOT A SECOND APA. It used to be.

   There were two assistants on this platform: Ask APA (the concierge,
   with the personality and the navigation) and Support (the desk, with
   the grounding and the escalation). They had separate prompts, separate
   endpoints, separate transcripts and separate launchers, and a guest
   could end up talking to both of them on one page — being charming in
   one bubble and unable to see their own booking in the other.

   They are now one mind, in _support.js. Everything that made Ask APA
   worth talking to moved there: the personality, the few-shot voice, the
   time and season context, the sponsored weave, the navigation with
   parameters. It arrived alongside what Ask APA never had — the caller's
   real bookings, the live fee schedule, a knowledge base, a thread that
   survives navigation, and a human on the other end of an escalation.

   What is left here is a translator, kept because deployed pages, cached
   bundles and bookmarked clients may still POST to /api/ask-apa. It
   speaks the old request and response shape and forwards the substance
   to the one APA. Nothing is answered here.

   Old shape in:   { messages: [...], page, userContext }
   Old shape out:  { reply, route, routeParams, nextSteps }
   ══════════════════════════════════════════════════════════════════════ */

import support from './_support.js';

/* The old client sent the whole transcript on every turn. The one APA
   keeps the transcript itself, keyed to the thread, so only the newest
   line is genuinely new information — the rest is already on file. */
function latestUserLine(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user' && typeof m.content === 'string' && m.content.trim()) {
      return m.content.trim().slice(0, 4000);
    }
  }
  return '';
}

/* A guest key the old client never had to mint. Deterministic from
   nothing, so each shimmed caller simply gets a fresh anonymous thread
   rather than being wrongly merged into someone else's. */
function throwawayGuestKey() {
  let s = '';
  for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return s;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS' || req.method !== 'POST') return support(req, res);

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { body = {}; }

  const text = latestUserLine(body.messages);
  if (!text) {
    return res.status(400).json({ error: 'messages array required', reply: '' });
  }

  /* Translate the request in place. The support handler reads req.body,
     so rewriting it is the whole adaptation. */
  req.body = {
    op: 'send',
    text,
    page: typeof body.page === 'string' ? body.page.slice(0, 60) : undefined,
    threadId: body.threadId,
    guestKey: /^[a-f0-9]{24,64}$/i.test(String(body.guestKey || '')) ? body.guestKey : throwawayGuestKey(),
  };

  /* Translate the response on the way back out. The old client reads
     `reply`, `route`, `routeParams` and `nextSteps`; the new one returns
     the same substance under partly different names. */
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (!payload || typeof payload !== 'object') return sendJson(payload);
    return sendJson({
      ...payload,
      reply: payload.reply ?? payload.text ?? '',
      route: payload.route ?? null,
      routeParams: payload.routeParams ?? null,
      nextSteps: Array.isArray(payload.chips) ? payload.chips : [],
    });
  };

  return support(req, res);
}
