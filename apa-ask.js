/* ══════════════════════════════════════════════════════════════════════
   CABANA · apa-ask.js  →  RETIRED

   This file used to be a second assistant.

   Cabana ran two of them: Ask APA (this one — the concierge, with the
   voice, the personality and the navigation) and the support console
   (the desk, with the real bookings and a human behind it). They each
   painted their own launcher, kept their own transcript, and answered
   from their own prompt. A guest on the dashboard could see both at
   once and get two different Cabanas — one charming and unable to look
   anything up, one grounded and unable to hold a conversation.

   There is now one APA, in cabana-support.js, and everything that made
   this file worth loading lives there: dictation, spoken replies, the
   personality, page-aware greetings, and navigation that carries the
   conversation with it instead of restarting.

   The file itself stays because HTML cached at the CDN may still ask
   for it. All it does is make sure the surviving console is present,
   then get out of the way. It renders nothing and answers nothing.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;

  /* Already loaded, or already on its way in from this page's own tags. */
  if (global.CabanaSupport) return;
  if (doc.querySelector('script[src*="cabana-support.js"]')) return;

  var s = doc.createElement('script');
  s.src = '/cabana-support.js';
  s.defer = true;
  (doc.body || doc.head || doc.documentElement).appendChild(s);
})(window);
