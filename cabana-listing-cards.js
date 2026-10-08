/* ════════════════════════════════════════════════════════════════════
   CABANA · LISTING CARDS  (cabana-listing-cards.js)

   The swipe-and-card layer every listing journey shares. The original
   form controls stay mounted and remain the source of truth: a deck
   only ever answers an explicit choice, and nothing is submitted by a
   gesture.

   What a deck gives a host
     · a stacked deck that moves on the compositor only (translate3d,
       rotate, opacity), driven by requestAnimationFrame, so a mid-range
       Android phone keeps up with a thumb
     · a flick is enough: velocity counts as well as distance
     · Back restores the exact answer that card had, one card at a time,
       and from the first card it steps back to the previous question
     · the choice strip: every option, tiny, under the card. Tap one to
       jump straight to it. Nobody has to swipe through nine cards to
       change their mind about the second
     · single choices open on what is already chosen, so coming back to
       a question shows the answer rather than starting over
     · each service has its own personality (see SKINS and the CSS)

   API (unchanged names, extra options are optional)
     CabanaListingCards.choice(host, config)        → { box, refresh, goto, back }
     CabanaListingCards.focusForm(root, units, actions, opts) → { review, refresh, last, first }
     CabanaListingCards.selectChoices(selectId)
     CabanaListingCards.checkboxChoice(input)
     CabanaListingCards.assist()
     CabanaListingCards.make(tag, cls, text) / say(text) / skin(service)
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.CabanaListingCards) return;

  const mq = q => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  const reduced = () => mq('(prefers-reduced-motion: reduce)');
  const make = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls || ''; if (text) el.textContent = text; return el; };
  const button = (text, cls, action) => { const b = make('button', cls, text); b.type = 'button'; b.addEventListener('click', action); return b; };
  const svg = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  const ICON = {
    yes: svg('<path d="M20 6 9 17l-5-5"/>'),
    no: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    next: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    back: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    cards: svg('<rect x="4" y="5" width="14" height="16" rx="2.5"/><path d="M8 3h10a2 2 0 0 1 2 2v12"/>')
  };

  const announce = make('div', 'cc-sr'); announce.setAttribute('role', 'status'); announce.setAttribute('aria-live', 'polite');
  (document.body || document.documentElement).append(announce);
  function say(text) { announce.textContent = ''; announce.textContent = text; }
  function buzz(ms) { try { if (!reduced() && navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) { /* not supported */ } }

  /* Web Animations where the browser has them (they run on the
     compositor for transform and opacity); an instant resolve where it
     does not, so no flow ever waits on an animation that cannot run. */
  function animate(el, frames, duration, easing) {
    if (reduced() || !el || !el.animate) return Promise.resolve();
    try {
      return el.animate(frames, { duration: duration || 300, easing: easing || 'cubic-bezier(.22,1,.36,1)', fill: 'none' }).finished.catch(() => {});
    } catch (e) { return Promise.resolve(); }
  }

  /* ── Personalities ───────────────────────────────────────────────
     The same mechanics, eight different voices. The look lives in the
     CSS under [data-skin]; the words live here. */
  const SKINS = {
    stays:     { yes: 'This is it', no: 'Not quite', multiYes: 'We have it', multiNo: 'We don’t', stampYes: 'HOME', stampNo: 'PASS', multiStampYes: 'YES', multiStampNo: 'NO', hint: 'Swipe right on the one that describes your place.', multiHint: 'Right if guests get it, left if they don’t.' },
    roommates: { yes: 'That’s it', no: 'Next', multiYes: 'Got it', multiNo: 'Nope', stampYes: 'MATCH', stampNo: 'NOPE', multiStampYes: 'GOT IT', multiStampNo: 'NOPE', hint: 'Swipe right when it sounds like your place. Flatmates will love the detail.', multiHint: 'Right if the flat has it, left if it doesn’t.' },
    tours:     { yes: 'That’s us', no: 'Skip', multiYes: 'Included', multiNo: 'Not included', stampYes: 'ON THE ROUTE', stampNo: 'SKIP', multiStampYes: 'PACKED', multiStampNo: 'LEFT', hint: 'Swipe right on the experience you run.', multiHint: 'Right if it’s included, left if it isn’t.' },
    events:    { yes: 'That’s it', no: 'Skip', multiYes: 'On the bill', multiNo: 'Not this time', stampYes: 'ON THE BILL', stampNo: 'SKIP', multiStampYes: 'LIVE', multiStampNo: 'OFF', hint: 'Swipe right on the kind of event you’re putting on.', multiHint: 'Right for what’s on the bill, left for what isn’t.' },
    food:      { yes: 'That’s us', no: 'Not us', multiYes: 'We do that', multiNo: 'We don’t', stampYes: 'ON THE MENU', stampNo: 'NOT US', multiStampYes: 'SERVED', multiStampNo: 'NO', hint: 'Swipe right on the one a regular would use to describe you.', multiHint: 'Right for what you do, left for what you don’t.' },
    carhire:   { yes: 'That’s us', no: 'Next', multiYes: 'Fitted', multiNo: 'Not fitted', stampYes: 'IGNITION', stampNo: 'NEXT', multiStampYes: 'FITTED', multiStampNo: 'NONE', hint: 'Swipe right on what sits in your garage.', multiHint: 'Right if it’s fitted, left if it isn’t.' },
    rides:     { yes: 'That’s us', no: 'Next', multiYes: 'We offer it', multiNo: 'We don’t', stampYes: 'ROUTE SET', stampNo: 'NEXT', multiStampYes: 'YES', multiStampNo: 'NO', hint: 'Swipe right on how you move people.', multiHint: 'Right for what you offer, left for what you don’t.' },
    shopping:  { yes: 'That’s it', no: 'Next', multiYes: 'Yes', multiNo: 'No', stampYes: 'TAGGED', stampNo: 'NEXT', multiStampYes: 'YES', multiStampNo: 'NO', hint: 'Swipe right on the shelf your product lives on.', multiHint: 'Right for yes, left for no.' },
    base:      { yes: 'This one', no: 'Next', multiYes: 'Yes', multiNo: 'No', stampYes: 'YES', stampNo: 'NEXT', multiStampYes: 'YES', multiStampNo: 'NO', hint: 'Swipe, tap the buttons or use your arrow keys. Every choice can be changed.', multiHint: 'Right for yes, left for no. Every answer can be changed.' }
  };
  function skin(service) { return SKINS[service] || SKINS.base; }
  function currentService() { return (document.body && document.body.dataset.listingService) || ''; }

  /* ════════════════════════════════════════════════════════════════
     THE DECK
     ════════════════════════════════════════════════════════════════ */
  function choice(host, config) {
    if (!host || !config || !config.items || !config.items.length) return null;
    const items = config.items;
    const multi = !!config.multiple;
    const N = items.length;
    const service = config.skin || currentService();
    const words = skin(service);

    /* A single choice opens on what is already chosen. */
    let index = 0;
    if (!multi) { const at = items.findIndex(it => safeSel(it)); if (at > 0) index = at; }
    let busy = false, expanded = false, lapped = false;
    const history = [];
    const seen = new Set([index]);
    const declined = new Set();

    const box = make('section', 'cc-choice');
    box.dataset.mode = multi ? 'multi' : 'single';
    box.dataset.skin = service || 'base';
    box.setAttribute('aria-label', config.label);

    /* header */
    const meta = make('div', 'cc-choice-meta');
    const count = make('span', 'cc-count');
    const meter = make('span', 'cc-meter'); const meterFill = make('i'); meter.append(meterFill); meter.setAttribute('aria-hidden', 'true');
    const all = button('', 'cc-text cc-toggle-all', () => { expanded = !expanded; render(); if (!expanded) focusCard(); });
    meta.append(count, meter, all);

    /* deck */
    const stage = make('div', 'cc-stage');
    const deck = make('div', 'cc-deck');
    const peek2 = make('div', 'cc-peek cc-peek-2'); peek2.setAttribute('aria-hidden', 'true');
    const peek1 = make('div', 'cc-peek cc-peek-1'); peek1.setAttribute('aria-hidden', 'true');
    const card = make('div', 'cc-decision'); card.tabIndex = 0; card.setAttribute('role', 'group');
    const tintYes = make('span', 'cc-tint cc-tint-yes'), tintNo = make('span', 'cc-tint cc-tint-no');
    const stampYes = make('span', 'cc-stamp cc-stamp-yes', multi ? words.multiStampYes : words.stampYes);
    const stampNo = make('span', 'cc-stamp cc-stamp-no', multi ? words.multiStampNo : words.stampNo);
    [tintYes, tintNo, stampYes, stampNo].forEach(el => el.setAttribute('aria-hidden', 'true'));
    /* `.cc-stamp` text is read by older tests and assistive tech alike;
       the live one mirrors whichever side the card is leaning to. */
    const stamp = make('span', 'cc-stamp cc-stamp-live'); stamp.setAttribute('aria-hidden', 'true');
    const face = make('div', 'cc-face');
    const mark = make('div', 'cc-mark'); mark.setAttribute('aria-hidden', 'true');
    const eyebrow = make('p', 'cc-kicker', config.label);
    const title = make('h3', 'cc-choice-title');
    const detail = make('p', 'cc-choice-detail');
    const selected = make('span', 'cc-selected');
    face.append(mark, eyebrow, title, detail, selected);
    card.append(tintYes, tintNo, stampYes, stampNo, stamp, face);
    deck.append(peek2, peek1, card); stage.append(deck);

    /* actions */
    const controls = make('div', 'cc-actions');
    const no = button('', 'cc-no', () => answer(false));
    const undo = button('', 'cc-undo', () => back());
    const yes = button('', 'cc-yes', () => answer(true));
    no.innerHTML = '<span class="cc-btn-ico">' + (multi ? ICON.no : ICON.next) + '</span><span class="cc-btn-t"></span>';
    yes.innerHTML = '<span class="cc-btn-ico">' + ICON.yes + '</span><span class="cc-btn-t"></span>';
    undo.innerHTML = '<span class="cc-btn-ico">' + ICON.back + '</span><span class="cc-btn-t">Back</span>';
    controls.append(no, undo, yes);
    const hint = make('p', 'cc-hint', multi ? words.multiHint : words.hint);

    /* the strip — every option, small, always in view */
    const strip = make('div', 'cc-strip'); strip.setAttribute('role', 'listbox'); strip.setAttribute('aria-label', 'All options');
    const stripRail = make('div', 'cc-strip-rail'); strip.append(stripRail);
    const chips = items.map((item, i) => {
      const c = make('button', 'cc-chip'); c.type = 'button'; c.setAttribute('role', 'option');
      c.dataset.i = String(i);
      if (item.icon) { const ic = make('span', 'cc-chip-ico'); ic.append(item.icon.cloneNode(true)); c.append(ic); }
      c.append(make('span', 'cc-chip-t', item.label));
      c.addEventListener('click', () => { if (busy) return; goto(i, true); });
      stripRail.append(c);
      return c;
    });
    if (N < 3) strip.hidden = true;

    const list = make('div', 'cc-all');
    const doneBar = make('div', 'cc-done');
    box.append(meta, stage, controls, hint, strip, list, doneBar);
    host.append(box);

    function safeSel(item) { try { return !!item.selected(); } catch (e) { return false; } }
    function focusCard() { try { card.focus({ preventScroll: true }); } catch (e) { /* jsdom */ } }

    function paintFace(el, i) {
      const item = items[i];
      el.innerHTML = '';
      if (!item) return;
      const m = make('div', 'cc-mark');
      if (item.icon) m.append(item.icon.cloneNode(true)); else m.textContent = item.symbol || String(i + 1).padStart(2, '0');
      el.append(m, make('p', 'cc-kicker', config.label), make('h3', 'cc-peek-title', item.label));
    }

    function stateOf(i) {
      if (safeSel(items[i])) return 'on';
      if (declined.has(i)) return 'off';
      if (seen.has(i)) return 'seen';
      return 'new';
    }

    function render() {
      busy = false;
      card.style.transform = ''; card.style.transition = '';
      setLean(0);
      const done = multi && index >= N;
      box.classList.toggle('cc-is-done', done);
      box.classList.toggle('cc-is-expanded', expanded);
      stage.hidden = expanded || done; controls.hidden = expanded || done; hint.hidden = expanded || done;
      list.hidden = !(expanded || done);
      doneBar.hidden = !done;
      all.innerHTML = expanded ? ICON.cards + '<span>Back to cards</span>' : ICON.grid + '<span>See all</span>';

      const chosenCount = items.filter(safeSel).length;
      count.textContent = done ? (multi ? chosenCount + ' of ' + N + ' included' : 'All options explored')
        : `${Math.min(index, N - 1) + 1} / ${N}`;
      meterFill.style.transform = 'scaleX(' + (done ? 1 : (Math.min(index, N - 1) + 1) / N) + ')';

      if (!done) {
        const item = items[index];
        title.textContent = item.label;
        detail.textContent = item.detail || (multi ? 'Does your listing have this?' : 'Does this describe what you offer?');
        mark.innerHTML = '';
        if (item.icon) mark.append(item.icon.cloneNode(true)); else mark.textContent = item.symbol || String(index + 1).padStart(2, '0');
        const isOn = safeSel(item);
        selected.textContent = isOn ? '✓ Selected' : '';
        card.classList.toggle('cc-is-on', isOn);
        paintFace(peek1, multi ? index + 1 : (index + 1) % N);
        paintFace(peek2, multi ? index + 2 : (index + 2) % N);
        peek1.hidden = multi && index + 1 >= N; peek2.hidden = multi && index + 2 >= N;
      } else {
        title.textContent = multi ? 'Your features, sorted.' : 'Find your match';
        detail.textContent = 'Review your choices below, or go back to change an answer.';
      }
      no.querySelector('.cc-btn-t').textContent = multi ? words.multiNo : words.no;
      yes.querySelector('.cc-btn-t').textContent = multi ? words.multiYes : words.yes;
      no.setAttribute('aria-label', (multi ? words.multiNo : words.no) + ' (left arrow)');
      yes.setAttribute('aria-label', (multi ? words.multiYes : words.yes) + ' (right arrow)');
      undo.setAttribute('aria-label', history.length ? 'Back to the previous card' : (config.onBackOut ? 'Back to the previous question' : 'Back'));
      no.disabled = yes.disabled = done;
      undo.disabled = !history.length && !config.onBackOut;
      hint.textContent = multi ? words.multiHint : lapped ? 'You’ve seen them all. Tap one in the strip below, or keep swiping.' : words.hint;

      chips.forEach((c, i) => {
        c.dataset.state = stateOf(i);
        c.setAttribute('aria-selected', String(safeSel(items[i])));
        c.classList.toggle('cc-chip-now', !done && i === index);
        if (!done && i === index) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
      centreChip();

      /* the grid view */
      list.replaceChildren();
      items.forEach((item, i) => {
        const b = button('', 'cc-option', () => {
          if (busy) return;
          if (multi) { record(i); config.set(item, !safeSel(item)); seen.add(i); render(); say(item.label + (safeSel(item) ? ': included.' : ': not included.')); return; }
          index = i; expanded = false; answer(true);
        });
        if (item.icon) { const ic = make('span', 'cc-option-ico'); ic.append(item.icon.cloneNode(true)); b.append(ic); }
        b.append(make('span', 'cc-option-t', item.label));
        b.setAttribute('aria-pressed', String(safeSel(item)));
        list.append(b);
      });

      if (done) {
        doneBar.replaceChildren();
        const again = button('Swipe through again', 'cc-text', () => { history.length = 0; index = 0; render(); focusCard(); });
        doneBar.append(make('span', '', chosenCount ? 'Tap any feature to change it.' : 'Nothing picked yet — tap the ones you have.'), again);
      }
      card.setAttribute('aria-label', done ? title.textContent
        : `${config.label}: ${title.textContent}. ${index + 1} of ${N}. Right arrow for ${multi ? words.multiYes : words.yes}, left arrow for ${multi ? words.multiNo : words.no}.`);
      if (config.onRender) config.onRender({ index, done });
    }

    function centreChip() {
      const c = chips[Math.min(index, N - 1)];
      if (!c || strip.hidden || !strip.scrollTo) return;
      const left = c.offsetLeft - (strip.clientWidth - c.offsetWidth) / 2;
      try { strip.scrollTo({ left: Math.max(0, left), behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { strip.scrollLeft = left; }
    }

    function record(i) { history.push({ index: i, snap: config.snapshot(), declined: declined.has(i) }); }

    async function answer(value) {
      if (busy || index >= N) return;
      busy = true; no.disabled = yes.disabled = undo.disabled = true;
      const item = items[index], at = index;
      record(at);
      buzz(value ? 10 : 6);
      setLean(value ? 1 : -1);
      card.classList.add(value ? 'cc-green' : 'cc-red');
      stamp.textContent = value ? (multi ? words.multiStampYes : words.stampYes) : (multi ? words.multiStampNo : words.stampNo);
      await fling(value ? 1 : -1);
      card.classList.remove('cc-green', 'cc-red');
      if (!box.isConnected) return;
      if (value || multi) config.set(item, value);
      /* Skipping past an option in a single choice is browsing, not a
         verdict; only a multi deck records a "no". */
      if (value) declined.delete(at); else if (multi) declined.add(at);
      say(`${item.label}: ${value ? (multi ? 'included' : 'selected') : multi ? 'not included' : 'skipped'}.`);
      if (!multi && value) {
        render();
        card.classList.add('cc-just-picked');
        if (config.advance) { config.advance(); return; }
        await animate(card, [{ transform: 'scale(.96)' }, { transform: 'scale(1.02)' }, { transform: 'none' }], 360);
        card.classList.remove('cc-just-picked');
        return;
      }
      if (multi) index = at + 1;
      else { index = (at + 1) % N; if (index === 0) lapped = true; }
      seen.add(index);
      render();
      await rise();
      if (multi && index >= N) say('All done. ' + items.filter(safeSel).length + ' of ' + N + ' included.');
    }

    /* Back: the previous card, with the answer it had before. From the
       first card, the previous question. */
    function back() {
      if (busy) return;
      if (!history.length) { if (config.onBackOut) config.onBackOut(); return; }
      const prev = history.pop();
      index = prev.index;
      config.restore(prev.snap);
      if (prev.declined) declined.add(prev.index); else declined.delete(prev.index);
      expanded = false;
      render();
      rise(-1);
      say('Back to ' + items[index].label + '. Your previous answer is restored.');
      focusCard();
    }

    /* Jump straight to a card from the strip. Nothing is answered. */
    function goto(i, fromStrip) {
      if (i < 0 || i >= N) return;
      if (i === index && !expanded && !(multi && index >= N)) { if (fromStrip) pulse(); return; }
      history.push({ index, snap: config.snapshot(), declined: declined.has(index), jump: true });
      const dir = i > index ? 1 : -1;
      index = i; expanded = false; seen.add(i);
      render(); rise(dir);
      say(items[i].label + '. ' + (i + 1) + ' of ' + N + '.');
      if (fromStrip) focusCard();
    }

    function pulse() { animate(card, [{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }], 280); }

    function fling(dir) {
      const w = Math.max(card.offsetWidth || 320, 260);
      const from = card.style.transform || 'translate3d(0,0,0) rotate(0deg)';
      const to = reduced() ? `translate3d(${dir * 40}px,0,0)` : `translate3d(${dir * w * 1.25}px,${-18}px,0) rotate(${dir * 18}deg)`;
      return animate(card, [{ transform: from, opacity: 1 }, { transform: to, opacity: 0 }], reduced() ? 120 : 280, 'cubic-bezier(.4,0,.6,1)');
    }
    function rise(dir) {
      const from = dir === -1 ? 'translate3d(-36px,0,0) rotate(-3deg)' : dir === 1 ? 'translate3d(36px,0,0) rotate(3deg)' : 'translate3d(0,16px,0) scale(.94)';
      return animate(card, [{ transform: from, opacity: .2 }, { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 }], 340, 'cubic-bezier(.2,.9,.25,1.15)');
    }

    /* the lean: tints and stamps follow the card, on opacity only */
    function setLean(v) {
      const yesO = Math.max(0, Math.min(1, v)), noO = Math.max(0, Math.min(1, -v));
      tintYes.style.opacity = yesO; tintNo.style.opacity = noO;
      stampYes.style.opacity = yesO; stampNo.style.opacity = noO;
      stampYes.style.transform = `rotate(-11deg) scale(${.8 + yesO * .2})`;
      stampNo.style.transform = `rotate(11deg) scale(${.8 + noO * .2})`;
      stamp.textContent = v > .2 ? stampYes.textContent : v < -.2 ? stampNo.textContent : '';
    }

    /* ── the gesture ────────────────────────────────────────────── */
    let drag = null, raf = 0;
    function frame() {
      raf = 0;
      if (!drag) return;
      const x = drag.dx;
      const r = reduced() ? 0 : x / 18;
      card.style.transform = reduced() ? `translate3d(${x * .35}px,0,0)` : `translate3d(${x}px,${Math.abs(x) * -.04}px,0) rotate(${r}deg)`;
      setLean(x / Math.max(90, card.offsetWidth * .32));
      peek1.style.transform = `translate3d(0,${10 - Math.min(Math.abs(x) / 30, 6)}px,0) scale(${.955 + Math.min(Math.abs(x) / 3000, .03)})`;
    }
    card.addEventListener('pointerdown', e => {
      if (busy || e.button !== 0 || index >= N || expanded) return;
      if (e.target.closest && e.target.closest('a,button,input,select,textarea')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), samples: [], locked: false };
      card.classList.add('cc-dragging');
    });
    card.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.locked) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { reset(); return; }  // a scroll, not a swipe
        if (Math.abs(dx) < 6) return;
        drag.locked = true;
        try { card.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      }
      drag.dx = dx; drag.dy = dy;
      const now = performance.now();
      drag.samples.push({ x: e.clientX, t: now }); if (drag.samples.length > 5) drag.samples.shift();
      if (!raf) raf = requestAnimationFrame(frame);
    });
    function velocity() {
      const s = drag && drag.samples; if (!s || s.length < 2) return 0;
      const a = s[0], b = s[s.length - 1]; const dt = b.t - a.t;
      return dt > 0 ? (b.x - a.x) / dt : 0;
    }
    function reset(animateBack) {
      const was = card.style.transform;
      drag = null; if (raf) { cancelAnimationFrame(raf); raf = 0; }
      card.classList.remove('cc-dragging');
      card.style.transform = ''; peek1.style.transform = '';
      setLean(0);
      if (animateBack && was) animate(card, [{ transform: was }, { transform: 'translate3d(0,0,0) rotate(0)' }], 420, 'cubic-bezier(.2,1.4,.4,1)');
    }
    card.addEventListener('pointerup', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = drag.dx, v = velocity(), locked = drag.locked;
      const far = Math.abs(dx) >= Math.min(110, (card.clientWidth || 320) * .28);
      const flick = Math.abs(v) > .55 && Math.abs(dx) > 36 && Math.sign(v) === Math.sign(dx);
      if (locked && (far || flick)) {
        const value = dx > 0;
        drag = null; if (raf) { cancelAnimationFrame(raf); raf = 0; }
        card.classList.remove('cc-dragging'); peek1.style.transform = '';
        answer(value);
      } else reset(locked);
    });
    card.addEventListener('pointercancel', () => reset(true));
    card.addEventListener('lostpointercapture', () => { if (drag && drag.locked) reset(true); });

    card.addEventListener('keydown', e => {
      if (e.target !== card) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); answer(true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); answer(false); }
      else if (e.key === 'Enter') { e.preventDefault(); answer(true); }
      else if (e.key === 'Backspace') { e.preventDefault(); back(); }
    });
    strip.addEventListener('keydown', e => {
      const i = chips.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowRight' && chips[i + 1]) { e.preventDefault(); chips[i + 1].focus(); }
      if (e.key === 'ArrowLeft' && chips[i - 1]) { e.preventDefault(); chips[i - 1].focus(); }
    });

    render();
    const api = { box, refresh: render, goto: i => goto(i), back };
    box._ccChoice = api;
    return api;
  }

  /* ════════════════════════════════════════════════════════════════
     FOCUSED FORMS
     Real inputs stay mounted (maps and uploaders included); the form
     is shown one coherent card at a time, with Back always available.
     ════════════════════════════════════════════════════════════════ */
  function focusForm(root, units, actions, opts) {
    opts = opts || {};
    if (!root || units.length < 2 || root.dataset.ccFocus) return root && root._ccForm;
    root.dataset.ccFocus = 'true';
    let at = 0, overview = false, lastAt = -1;
    /* A unit whose every child is hidden is not a card. Sections a
       service does not use must not show up as an empty card. Worked
       out on every render, because one panel can serve many services. */
    const visible = c => !c.hidden && c.style.display !== 'none' && !c.classList.contains('cc-concealed-x');
    const shown = () => units.filter(u => Array.from(u.children).some(visible));
    units.forEach(u => u.classList.add('cc-unit'));

    const top = make('div', 'cc-form-top');
    const progress = make('span', 'cc-progress');
    const toggle = button('See full form', 'cc-text', () => { overview = !overview; render(true); });
    const segs = make('div', 'cc-segs'); segs.setAttribute('aria-hidden', 'true');
    top.append(progress, toggle, segs);
    if (opts.topAfter && opts.topAfter.parentNode === root) opts.topAfter.after(top); else root.prepend(top);

    const nav = make('div', 'cc-form-nav');
    const back = button('', 'cc-undo cc-back', () => {
      if (overview) { overview = false; at = shown().length - 1; render(true, -1); return; }
      if (at > 0) { at--; render(true, -1); return; }
      if (opts.onBackOut) opts.onBackOut();
    });
    back.innerHTML = '<span class="cc-btn-ico">' + ICON.back + '</span><span class="cc-btn-t">Back</span>';
    const next = button('Proceed →', 'cc-proceed', () => {
      const live = shown();
      const invalid = Array.from((live[at] || units[0]).querySelectorAll('input,select,textarea'))
        .find(el => !el.disabled && el.checkValidity && !el.checkValidity());
      if (invalid) { invalid.reportValidity(); try { invalid.focus(); } catch (e) { /* */ } shake(live[at]); return; }
      if (opts.validate && opts.validate(at, live[at]) === false) { shake(live[at]); return; }
      if (at < live.length - 1) at++;
      else if (opts.onComplete) { opts.onComplete(); return; }
      else overview = true;
      render(true, 1);
    });
    nav.append(back, next); root.append(nav);

    function shake(el) { animate(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }], 320, 'ease-out'); }

    function render(focus, dir) {
      const live = shown().length ? shown() : units;
      if (at > live.length - 1) at = live.length - 1;
      if (at < 0) at = 0;
      units.forEach(u => u.classList.toggle('cc-concealed', !overview && u !== live[at]));
      if (actions) actions.classList.toggle('cc-concealed', !overview);
      root.classList.add('cc-form'); root.classList.toggle('cc-overview', overview);
      progress.textContent = overview ? 'Review your details' : `Card ${at + 1} of ${live.length}`;
      toggle.textContent = overview ? 'One card at a time' : 'See full form';
      segs.replaceChildren(...live.map((_, i) => { const s = make('i'); if (overview || i < at) s.className = 'done'; else if (i === at) s.className = 'now'; return s; }));
      back.disabled = !overview && at === 0 && !opts.onBackOut;
      next.hidden = overview;
      next.textContent = at === live.length - 1 ? (opts.reviewLabel || 'Review details →') : 'Proceed →';
      if (focus) {
        const target = overview ? top : live[at];
        target.tabIndex = -1;
        try { target.focus({ preventScroll: true }); } catch (e) { /* */ }
        if (target.scrollIntoView) target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
        if (!overview && lastAt !== at) {
          const d = dir || 1;
          animate(target, [{ opacity: 0, transform: `translate3d(${d * 26}px,0,0)` }, { opacity: 1, transform: 'none' }], 320);
        }
      }
      lastAt = overview ? -1 : at;
      // Leaflet observes container resizing after a card becomes visible.
      window.dispatchEvent(new Event('resize'));
      root.dispatchEvent(new CustomEvent('cc:form-view', { bubbles: true, detail: { at, overview } }));
    }
    const form = root.matches('form') ? root : root.closest('form');
    if (form) form.addEventListener('submit', e => {
      if (!overview && !root.closest('.panel:not(.on)')) { e.preventDefault(); e.stopImmediatePropagation(); next.click(); }
    }, true);
    root.addEventListener('invalid', e => {
      const n = shown().findIndex(u => u.contains(e.target));
      if (n >= 0) { at = n; overview = false; render(); }
    }, true);
    render();
    const api = {
      review: () => { overview = true; render(); },
      refresh: () => render(),
      last: () => { overview = false; at = shown().length - 1; render(true, -1); },
      first: () => { overview = false; at = 0; render(true, 1); },
      show: el => { const n = shown().findIndex(u => u.contains(el)); if (n >= 0) { overview = false; at = n; render(true); } }
    };
    root._ccForm = api;
    return api;
  }

  function selectChoices(id) {
    const select = document.getElementById(id); if (!select || select.dataset.ccChoice) return;
    select.dataset.ccChoice = 'true';
    const host = make('div'); select.insertAdjacentElement('afterend', host);
    const label = document.querySelector(`label[for="${id}"]`)?.textContent.trim() || 'Choose an option';
    const items = Array.from(select.options).filter(o => o.value).map(o => ({ label: o.textContent, value: o.value, selected: () => select.value === o.value }));
    choice(host, {
      label, items,
      snapshot: () => select.value,
      restore: v => { select.value = v; select.dispatchEvent(new Event('change', { bubbles: true })); },
      set: item => { select.value = item.value; select.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    // Keep the native selector available in full-form view and as an accessible alternative.
    select.classList.add('cc-native-select');
  }

  function checkboxChoice(input) {
    if (!input || input.dataset.ccChoice) return;
    input.dataset.ccChoice = 'true';
    const label = input.closest('label'); if (!label) return;
    const host = make('div'); label.after(host);
    const title = label.querySelector('strong,.cn')?.textContent || label.textContent.trim();
    const detail = label.querySelector('.cd')?.textContent || 'Does this apply to your service?';
    choice(host, {
      label: 'One quick detail', multiple: true,
      items: [{ label: title, detail, selected: () => input.checked }],
      snapshot: () => input.checked,
      restore: v => { input.checked = v; input.dispatchEvent(new Event('change', { bubbles: true })); },
      set: (_, value) => { input.checked = value; input.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    label.classList.add('cc-native-checkbox');
  }

  /* ════════════════════════════════════════════════════════════════
     SET IT UP FOR ME
     ════════════════════════════════════════════════════════════════ */
  function assist() {
    if (document.querySelector('.cc-assist')) return;
    const service = document.body.dataset.listingService || '';
    const host = document.querySelector('.right-panel,.lt-wrap,.le-wrap,.fs-body,main') || document.body;
    const bar = make('aside', 'cc-assist');
    const copy = make('div', 'cc-assist-copy'); copy.append(make('strong', '', 'Short on time?'), make('span', '', 'Our team can set up your listing with you.'));
    const launch = button('Set it up for me', 'cc-assist-btn', () => open()); bar.append(make('span', 'cc-assist-ico'), copy, launch); host.prepend(bar);
    const dialog = make('dialog', 'cc-assist-dialog'); dialog.setAttribute('aria-labelledby', 'cc-assist-title');
    const form = make('form');
    const close = button('Close ×', 'cc-text', () => dialog.close());
    const h = make('h2', '', 'A little help, a lot less work.'); h.id = 'cc-assist-title';
    form.append(close, h, make('p', '', 'Tell us how to reach you. The team will contact you to confirm the details and help prepare your listing.'));
    const fields = {};
    [['name', 'Your name', 'text'], ['phone', 'Phone with country code', 'tel'], ['notes', 'What are you listing?', 'textarea']].forEach(([id, label, type]) => {
      const l = make('label', '', label); const input = make(type === 'textarea' ? 'textarea' : 'input'); input.id = 'cc-assist-' + id; input.name = id; l.htmlFor = input.id; if (type !== 'textarea') input.type = type;
      input.maxLength = id === 'notes' ? 2000 : id === 'name' ? 120 : 32; input.required = id !== 'notes'; if (id === 'phone') input.placeholder = '+254 712 345 678'; fields[id] = input; form.append(l, input);
    });
    const consent = make('label', 'cc-consent'); const check = make('input'); check.type = 'checkbox'; check.required = true; consent.append(check, document.createTextNode('Cabana may contact me about setting up this listing.')); form.append(consent);
    const status = make('p', 'cc-assist-status'); status.setAttribute('role', 'status');
    const send = make('button', 'cc-proceed', 'Request setup help'); send.type = 'submit'; form.append(send, status); dialog.append(form); document.body.append(dialog);
    let pending = false, sent = false, requestId = null;
    function open() {
      if (!sent) {
        const state = window.ApaSession?.get?.();
        fields.name.value = fields.name.value || state?.name || '';
        fields.phone.value = fields.phone.value || document.querySelector('#f-wa,#o-phone,#op-phone,#a-phone')?.value || '';
        const title = document.querySelector('#f-title,#t-title,#e-title,#op-name')?.value || '';
        if (!fields.notes.value) fields.notes.value = [document.body.dataset.listingService || service, title].filter(Boolean).join(' — ');
      }
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    }
    dialog.addEventListener('close', () => launch.focus());
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (pending || sent) return;
      const phone = fields.phone.value.replace(/[\s().-]/g, '');
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) { status.textContent = 'Include your country code, for example +254 712 345 678.'; fields.phone.focus(); return; }
      if (!fields.name.value.trim()) { fields.name.focus(); return; }
      const client = window.ApaSession?.client?.();
      if (!client) { status.textContent = 'Connection unavailable. Your details are still here; please try again.'; return; }
      pending = true; send.disabled = true; send.textContent = 'Sending request…'; status.textContent = '';
      requestId = requestId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
      try {
        const { error } = await client.from('lazy_requests').insert({ id: requestId, name: fields.name.value.trim(), phone, listing_type: document.body.dataset.listingService || service || null, notes: fields.notes.value.trim() || null, status: 'pending', source: location.pathname });
        if (error && error.code !== '23505') throw error;
        sent = true; send.textContent = 'Request received ✓'; status.textContent = 'Your setup request is with Cabana. You can close this and keep working on your listing.';
        Array.from(form.elements).forEach(el => { if (el !== close) el.disabled = true; });
      } catch (error) { send.disabled = false; send.textContent = 'Try again'; status.textContent = 'We could not confirm your request. Your details are kept here. Retry to check the same request.'; }
      finally { pending = false; }
    });
  }

  window.CabanaListingCards = { choice, focusForm, selectChoices, checkboxChoice, assist, make, say, skin, animate, ICON };
})();
