/* ═══════════════════════════════════════════════════════════════════
   CABANA · PEOPLE  v2
   ───────────────────────────────────────────────────────────────────
   One layer for every face on Cabana: listing hosts, messenger
   threads, agents, organisations. Drop an attribute, get a person.

     <span data-cp-avatar="UUID" data-cp-size="44"></span>  living avatar or photo
     <span data-cp-tick="UUID"></span>                      the right tick, if earned
     <button data-cp-follow="UUID"></button>                follow / following
     <button data-cabana-person="UUID">Name</button>        opens the profile sheet

   The three ticks. Colour AND shape differ, so they stay distinct for
   colour-blind members and in greyscale:
     person        purple  scalloped seal   identity verified
     organization  gold    scalloped seal   verified organisation
     provider      reef    cabana roof      verified and offers services
                                            on Cabana. Exclusive to Cabana.

   Public API (window.CabanaPeople):
     open(id) close() request(id, body) badges(roles)       (v1, kept)
     cards(ids) → Promise<{id: card}>   card(id) → Promise<card>
     tick(badge, {size}) avatarHTML(card, size) hydrate(root)
     follow(id, on) TICKS LANG INTERESTS
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.CabanaPeople) return;

  const ROLES = {
    traveller: ['Traveller', 'Explores and books with Cabana.'],
    host: ['Host', 'Publishes and manages their own stays or services.'],
    agent: ['Agent', 'Represents listings with the host’s approval and agreed commission.'],
    influencer: ['Influencer', 'Promotes approved listings to an audience through tracked links.'],
    ambassador: ['Ambassador', 'An invited Cabana field representative who helps new members and providers join.']
  };
  const TICKS = {
    person: { label: 'Verified identity', short: 'Verified', color: '#7C3AED',
      why: 'Cabana checked this person’s government ID against a live selfie. Their document is never shown to anyone.' },
    organization: { label: 'Verified organisation', short: 'Verified organisation', color: '#D98E0B',
      why: 'Cabana reviewed this organisation’s registration, and the person who runs its account verified their own ID.' },
    provider: { label: 'Verified Cabana provider', short: 'Cabana provider', color: '#0FA595',
      why: 'Verified by Cabana and actively offering services here: stays, tours, events, rides or more. Only Cabana issues this mark.' }
  };
  const LANG = { en: 'English', sw: 'Kiswahili', fr: 'Français', ar: 'العربية', pt: 'Português', am: 'አማርኛ', so: 'Soomaali', yo: 'Yorùbá', ha: 'Hausa', ig: 'Igbo',
    zu: 'isiZulu', xh: 'isiXhosa', af: 'Afrikaans', rw: 'Kinyarwanda', lg: 'Luganda', es: 'Español', de: 'Deutsch', it: 'Italiano', zh: '中文', hi: 'हिन्दी' };
  const INTERESTS = { beaches: 'Beaches', safari: 'Safari', 'city-breaks': 'City breaks', food: 'Food', nightlife: 'Nightlife', culture: 'Culture', hiking: 'Hiking',
    wellness: 'Wellness', 'road-trips': 'Road trips', diving: 'Diving', photography: 'Photography', music: 'Music', art: 'Art', family: 'Family travel',
    'remote-work': 'Remote work', budget: 'Budget travel', luxury: 'Luxury', festivals: 'Festivals', wildlife: 'Wildlife', history: 'History' };
  const ORG_KIND = { company: 'Company', hotel: 'Hotel', property_manager: 'Property manager', tour_operator: 'Tour operator', travel_agency: 'Travel agency',
    car_hire: 'Car hire', restaurant: 'Restaurant', event_organiser: 'Event organiser', ngo: 'Non-profit', government: 'Government', school: 'School', other: 'Organisation' };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let uid = 0;

  /* ── avatar engine, loaded on demand ─────────────────────────────── */
  let avatarsReady = window.CabanaAvatars ? Promise.resolve() : null;
  function needAvatars() {
    if (window.CabanaAvatars) return Promise.resolve();
    if (avatarsReady) return avatarsReady;
    avatarsReady = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = '/cabana-avatars.js?v=1'; s.async = true;
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
    return avatarsReady;
  }

  /* ── session-aware fetch ─────────────────────────────────────────── */
  async function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const client = window.ApaSession?.client?.() || window.sb;
      const session = client ? (await client.auth.getSession()).data?.session : null;
      if (session?.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    } catch (_) { /* signed out */ }
    return headers;
  }
  async function api(op, params, body) {
    const q = new URLSearchParams(Object.assign({ op }, params || {}));
    const r = await fetch('/api/people?' + q, { method: body ? 'POST' : 'GET', headers: await authHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: r.status, data });
    return data;
  }
  async function request(id, body) { // v1 compatibility
    const headers = await authHeaders();
    const r = await fetch('/api/agents?action=public-profile' + (id ? '&id=' + encodeURIComponent(id) : ''), { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Profile could not load.');
    return data;
  }

  /* ── batched card cache ──────────────────────────────────────────── */
  const cache = new Map(); // id → {card, at}
  let queue = new Map(), timer = null;
  function flush() {
    const batch = queue; queue = new Map(); timer = null;
    const ids = [...batch.keys()];
    for (let i = 0; i < ids.length; i += 60) {
      const chunk = ids.slice(i, i + 60);
      api('cards', { ids: chunk.join(',') }).then(d => {
        chunk.forEach(id => { const c = d.cards?.[id] || null; cache.set(id, { card: c, at: Date.now() }); batch.get(id).forEach(f => f.resolve(c)); });
      }).catch(() => chunk.forEach(id => batch.get(id).forEach(f => f.resolve(null))));
    }
  }
  function card(id) {
    if (!UUID.test(String(id || ''))) return Promise.resolve(null);
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < 60000) return Promise.resolve(hit.card);
    return new Promise(resolve => {
      if (!queue.has(id)) queue.set(id, []);
      queue.get(id).push({ resolve });
      if (!timer) timer = setTimeout(flush, 24);
    });
  }
  async function cards(ids) {
    const list = [...new Set(ids)];
    const out = await Promise.all(list.map(card));
    return Object.fromEntries(list.map((id, i) => [id, out[i]]));
  }
  function forget(id) { cache.delete(id); }

  /* ── ticks ───────────────────────────────────────────────────────── */
  function seal(n, r1, r2) { // scalloped rosette path
    let d = '';
    for (let i = 0; i <= n * 2; i++) {
      const a = Math.PI * i / n - Math.PI / 2, r = i % 2 ? r2 : r1;
      d += (i ? 'L' : 'M') + (12 + Math.cos(a) * r).toFixed(2) + ' ' + (12 + Math.sin(a) * r).toFixed(2);
    }
    return d + 'Z';
  }
  const SEAL = seal(12, 11, 9.4);
  const ROOF = 'M12 1.6c.5 0 1 .2 1.4.5l8.1 7.1c.4.4.7.9.7 1.5v9.1c0 1.7-1.3 3-3 3H4.8c-1.7 0-3-1.3-3-3v-9.1c0-.6.3-1.1.7-1.5l8.1-7.1c.4-.3.9-.5 1.4-.5Z';
  function tick(badge, opts) {
    const t = TICKS[badge];
    if (!t) return '';
    const size = (opts && opts.size) || 16, id = 'cpt' + (++uid);
    const title = esc((opts && opts.title) || t.label);
    let defs, shape, check, extra = '';
    if (badge === 'person') {
      defs = `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A78BFA"/><stop offset=".55" stop-color="#7C3AED"/><stop offset="1" stop-color="#5B21B6"/></linearGradient>`;
      shape = `<path d="${SEAL}" fill="url(#${id}g)"/>`;
      check = '<path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (badge === 'organization') {
      defs = `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDE68A"/><stop offset=".45" stop-color="#F5B12E"/><stop offset="1" stop-color="#B45309"/></linearGradient>`;
      shape = `<path d="${SEAL}" fill="url(#${id}g)"/><circle cx="12" cy="12" r="7.2" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8"/>`;
      check = '<path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';
    } else {
      defs = `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4F6DFF"/><stop offset=".5" stop-color="#14B8A6"/><stop offset="1" stop-color="#4EE0C8"/></linearGradient>` +
        `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
        `<clipPath id="${id}c"><path d="${ROOF}"/></clipPath>`;
      shape = `<path d="${ROOF}" fill="url(#${id}g)"/>`;
      extra = `<g clip-path="url(#${id}c)"><rect class="cpt-sheen" x="-14" y="-2" width="9" height="28" fill="url(#${id}s)" transform="skewX(-16)"/></g>` +
        '<path d="M5.2 9.6L12 3.7l6.8 5.9" fill="none" stroke="#F5B12E" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>';
      check = '<path d="M7.8 14.2l2.8 2.8 5.6-6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return `<svg class="cpt cpt-${badge}" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="${title}" focusable="false"><title>${title}</title><defs>${defs}</defs>${shape}${extra}${check}</svg>`;
  }

  /* ── avatars ─────────────────────────────────────────────────────── */
  function avatarHTML(c, size) {
    size = size || 44;
    if (!c) return `<span class="cpa cpa-empty" style="width:${size}px;height:${size}px"></span>`;
    const org = c.type === 'organization';
    const shape = org ? 'cpa-org' : '';
    if (c.photo) return `<span class="cpa ${shape}" style="width:${size}px;height:${size}px"><img src="${esc(c.photo)}" alt="" loading="lazy" decoding="async" width="${size}" height="${size}"></span>`;
    if (!window.CabanaAvatars) return `<span class="cpa ${shape} cpa-wait" style="width:${size}px;height:${size}px" data-cp-pending="${esc(c.id)}"></span>`;
    const spec = c.avatar || window.CabanaAvatars.defaultFor(c.id, c.type);
    return `<span class="cpa ${shape}" style="width:${size}px;height:${size}px">${window.CabanaAvatars.render(spec, { size, name: c.name, seed: c.id, label: c.name + ' avatar' })}</span>`;
  }
  function badges(roles) {
    return (roles || []).filter(r => ROLES[r]).map(r => '<span class="cbp-badge" title="' + esc(ROLES[r][1]) + '">' + ROLES[r][0] + '</span>').join('');
  }

  /* ── hydration ───────────────────────────────────────────────────── */
  async function hydrate(root) {
    root = root || document;
    const nodes = [...root.querySelectorAll('[data-cp-avatar],[data-cp-tick],[data-cp-follow]')].filter(n => !n.__cp);
    if (!nodes.length) return;
    nodes.forEach(n => { n.__cp = true; });
    const ids = nodes.map(n => n.dataset.cpAvatar || n.dataset.cpTick || n.dataset.cpFollow).filter(i => UUID.test(i));
    if (!ids.length) return;
    const [map] = await Promise.all([cards(ids), needAvatars()]);
    nodes.forEach(n => {
      if (n.dataset.cpAvatar) {
        const c = map[n.dataset.cpAvatar];
        if (c) { n.innerHTML = avatarHTML(c, Number(n.dataset.cpSize) || n.clientWidth || 44); n.classList.add('cp-live'); window.CabanaAvatars?.observeAll(n); }
      }
      if (n.dataset.cpTick) {
        const c = map[n.dataset.cpTick];
        if (c && c.badge) { n.innerHTML = tick(c.badge, { size: Number(n.dataset.cpSize) || 16 }); n.title = TICKS[c.badge].label; n.hidden = false; }
      }
      if (n.dataset.cpFollow) {
        const c = map[n.dataset.cpFollow];
        if (c && c.can_follow) wireFollow(n, c);
        else n.hidden = true;
      }
    });
  }
  let mo = null;
  function watch() {
    if (mo || !('MutationObserver' in window)) return;
    let pending = false;
    mo = new MutationObserver(() => {
      if (pending) return; pending = true;
      requestAnimationFrame(() => { pending = false; hydrate(document); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ── follow ──────────────────────────────────────────────────────── */
  const followState = new Map();
  async function follow(id, on) {
    const d = await api('follow', null, { id, on });
    followState.set(id, d.following);
    forget(id);
    document.querySelectorAll(`[data-cp-follow="${id}"]`).forEach(b => paintFollow(b, d.following));
    document.dispatchEvent(new CustomEvent('cabana:follow', { detail: { id, following: d.following, followers: d.followers } }));
    return d;
  }
  function paintFollow(btn, on) {
    btn.classList.toggle('is-on', !!on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.innerHTML = on ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>Following</span>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>Follow</span>';
  }
  async function signedIn() { const h = await authHeaders(); return !!h.Authorization; }
  function goSignIn() { location.href = '/auth.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash); }
  function wireFollow(btn, c) {
    btn.hidden = false;
    btn.classList.add('cp-follow');
    btn.type = 'button';
    paintFollow(btn, followState.get(c.id) || btn.dataset.following === 'true');
    if (btn.__cpWired) return; btn.__cpWired = true;
    btn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      if (!(await signedIn())) return goSignIn();
      const on = btn.getAttribute('aria-pressed') !== 'true';
      paintFollow(btn, on); btn.disabled = true;
      try { await follow(c.id, on); } catch (err) { paintFollow(btn, !on); toast(err.message); } finally { btn.disabled = false; }
    });
  }

  /* ── tiny toast ──────────────────────────────────────────────────── */
  function toast(msg) {
    let t = document.getElementById('cp-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cp-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ── profile sheet ───────────────────────────────────────────────── */
  let dialog, returnFocus;
  function close() {
    if (!dialog) return;
    const d = dialog; dialog = null;
    d.classList.add('cbp-out');
    setTimeout(() => { try { d.close(); } catch (_) {} d.remove(); }, 180);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  const fmtMonth = ym => { if (!ym) return ''; const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
  const num = n => n == null ? '—' : n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : n.toLocaleString('en-GB');
  function themeBg(theme) {
    const b = (window.CabanaAvatars?.BACKDROPS || []).find(x => x.id === theme) || { a: '#7C4DFF', b: '#4EE0C8' };
    return `linear-gradient(135deg,${b.a},${b.b})`;
  }
  function tickLine(p) {
    if (!p.badge) return '';
    const t = TICKS[p.badge];
    const who = p.badge === 'provider' ? (p.verified_as === 'organization' ? ' · verified organisation' : ' · verified identity') : '';
    const since = p.badge === 'organization' || (p.badge === 'provider' && p.verified_as === 'organization') ? p.org_since : p.identity_since;
    return `<button type="button" class="cbp-tickline cbp-t-${p.badge}" aria-expanded="false">${tick(p.badge, { size: 18 })}<span>${esc(t.label)}${who}${since ? ' · since ' + esc(fmtMonth(since)) : ''}</span></button><p class="cbp-why" hidden>${esc(t.why)}</p>`;
  }
  function profileHTML(p, compact) {
    const org = p.type === 'organization';
    const facts = [];
    if (org && p.org_kind) facts.push(esc(ORG_KIND[p.org_kind] || 'Organisation'));
    if (p.city) facts.push(esc(p.city) + (p.country_code ? ', ' + esc(p.country_code) : ''));
    if (p.member_since) facts.push('On Cabana since ' + esc(fmtMonth(p.member_since)));
    const stats = [];
    if (p.stats.followers != null) stats.push(`<div><b>${num(p.stats.followers)}</b><span>Follower${p.stats.followers === 1 ? '' : 's'}</span></div>`);
    if (p.stats.listings) stats.push(`<div><b>${num(p.stats.listings)}</b><span>Listing${p.stats.listings === 1 ? '' : 's'}</span></div>`);
    if (p.stats.rating) stats.push(`<div><b>★ ${p.stats.rating.toFixed(1)}</b><span>${num(p.stats.reviews)} review${p.stats.reviews === 1 ? '' : 's'}</span></div>`);
    else if (p.stats.following != null && !org) stats.push(`<div><b>${num(p.stats.following)}</b><span>Following</span></div>`);
    const chips = (p.languages || []).map(l => `<span class="cbp-chip">${esc(LANG[l] || l)}</span>`).join('') + (p.interests || []).map(i => `<span class="cbp-chip cbp-chip-i">${esc(INTERESTS[i] || i)}</span>`).join('');
    const ops = (p.operators || []).map(o => `<span class="cbp-chip cbp-chip-o">${esc(o.name)}</span>`).join('');
    const listings = (p.listings || []).slice(0, compact ? 4 : 6).map(l => `<a class="cbp-l" href="${esc(l.url)}"><span class="cbp-l-img"${l.photo ? ` style="background-image:url('${esc(l.photo)}')"` : ''}></span><span class="cbp-l-t">${esc(l.title)}</span><span class="cbp-l-s">${esc(l.place)}${l.price ? ' · ' + esc(l.currency) + ' ' + Number(l.price).toLocaleString('en-GB') : ''}</span></a>`).join('');
    const actions = p.viewer?.self
      ? `<a class="cbp-btn cbp-btn-ghost" href="/profile">Edit profile</a>`
      : p.can_follow ? `<button class="cbp-btn cp-follow" data-cp-follow-sheet="${esc(p.id)}" aria-pressed="${p.viewer?.following ? 'true' : 'false'}"></button>` : '';
    const link = p.handle && compact ? `<a class="cbp-btn cbp-btn-ghost" href="/u/${esc(p.handle)}">Full profile</a>` : '';
    return `<div class="cbp-cover" style="background:${themeBg(p.theme)}"></div>
      <div class="cbp-head">
        <div class="cbp-ava">${avatarHTML(p, compact ? 92 : 112)}</div>
        <div class="cbp-actions">${actions}${link}</div>
      </div>
      <h2 class="cbp-name">${esc(p.name)}${p.badge ? `<span class="cbp-tick">${tick(p.badge, { size: 22 })}</span>` : ''}</h2>
      ${p.handle ? `<div class="cbp-handle">@${esc(p.handle)}</div>` : ''}
      ${p.headline ? `<p class="cbp-headline">${esc(p.headline)}</p>` : ''}
      ${tickLine(p)}
      ${stats.length ? `<div class="cbp-stats">${stats.join('')}</div>` : ''}
      ${p.bio ? `<p class="cbp-bio">${esc(p.bio)}</p>` : ''}
      ${facts.length ? `<p class="cbp-facts">${facts.join(' · ')}</p>` : ''}
      <div class="cbp-badges">${badges(p.roles.filter(r => r !== 'traveller' || p.roles.length === 1))}</div>
      ${ops ? `<div class="cbp-sec"><h3>Also on Cabana as</h3><div class="cbp-chips">${ops}</div></div>` : ''}
      ${chips ? `<div class="cbp-chips">${chips}</div>` : ''}
      ${listings ? `<div class="cbp-sec"><h3>${org ? 'Listings' : 'Hosting'}</h3><div class="cbp-ls">${listings}</div></div>` : ''}
      ${p.level === 'peer' ? '<p class="cbp-muted">You can see this member because you are messaging each other. Their full profile is private.</p>' : ''}
      ${!p.viewer?.self && p.viewer?.signed_in ? `<button type="button" class="cbp-report" data-cbp-report>Report profile</button>` : ''}`;
  }
  function reportForm(id) {
    const reasons = [['impersonation', 'Pretending to be someone else'], ['inappropriate_photo', 'Inappropriate photo'], ['offensive_content', 'Offensive name or text'], ['scam', 'Scam or fraud'], ['spam', 'Spam'], ['other', 'Something else']];
    return `<form class="cbp-rform" data-id="${esc(id)}"><h3>What is wrong?</h3>${reasons.map((r, i) => `<label><input type="radio" name="reason" value="${r[0]}"${i ? '' : ' required'}> ${r[1]}</label>`).join('')}
      <textarea name="detail" maxlength="500" rows="2" placeholder="Anything that helps our team (optional)"></textarea>
      <div class="cbp-actions"><button class="cbp-btn" type="submit">Send report</button><button class="cbp-btn cbp-btn-ghost" type="button" data-cbp-cancel>Cancel</button></div>
      <p class="cbp-muted">Reports are private. The member is not told who reported them.</p></form>`;
  }
  function wireSheet(root, p) {
    root.querySelectorAll('[data-cp-follow-sheet]').forEach(btn => { btn.dataset.cpFollow = p.id; btn.dataset.following = btn.getAttribute('aria-pressed'); btn.__cp = true; wireFollow(btn, p); });
    const tl = root.querySelector('.cbp-tickline');
    if (tl) tl.addEventListener('click', () => { const w = root.querySelector('.cbp-why'); w.hidden = !w.hidden; tl.setAttribute('aria-expanded', String(!w.hidden)); });
    const rep = root.querySelector('[data-cbp-report]');
    if (rep) rep.addEventListener('click', () => {
      rep.insertAdjacentHTML('afterend', reportForm(p.id)); rep.remove();
      const f = root.querySelector('.cbp-rform');
      f.querySelector('[data-cbp-cancel]').addEventListener('click', () => f.remove());
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(f), b = f.querySelector('[type=submit]'); b.disabled = true;
        try { await api('report', null, { id: p.id, reason: fd.get('reason'), detail: fd.get('detail') || '' }); f.innerHTML = '<p class="cbp-muted">Thank you. Our trust team will review this profile.</p>'; }
        catch (err) { toast(err.message); b.disabled = false; }
      });
    });
    document.addEventListener('cabana:follow', ev => {
      if (ev.detail.id !== p.id) return;
      const s = root.querySelector('.cbp-stats b'); if (s && p.stats.followers != null) s.textContent = num(ev.detail.followers);
    });
    window.CabanaAvatars?.observeAll(root);
  }
  async function profile(idOrHandle) {
    const params = UUID.test(idOrHandle) ? { id: idOrHandle } : { handle: String(idOrHandle).replace(/^@/, '') };
    const [d] = await Promise.all([api('profile', params), needAvatars()]);
    return d.profile;
  }
  async function open(id) {
    close(); returnFocus = document.activeElement;
    const current = document.createElement('dialog'); dialog = current;
    current.className = 'cbp-dialog'; current.setAttribute('aria-label', 'Cabana profile');
    current.innerHTML = '<button class="cbp-close" aria-label="Close profile" type="button">×</button><div class="cbp-content" role="status"><div class="cbp-skel"><span></span><i></i><i></i></div></div>';
    current.querySelector('.cbp-close').addEventListener('click', close);
    current.addEventListener('cancel', e => { e.preventDefault(); close(); });
    current.addEventListener('click', e => { if (e.target === current) close(); });
    document.body.appendChild(current); current.showModal();
    try {
      const p = await profile(id);
      if (dialog !== current) return;
      const body = current.querySelector('.cbp-content');
      body.removeAttribute('role');
      body.innerHTML = profileHTML(p, true);
      wireSheet(body, p);
    } catch (e) { if (dialog === current) current.querySelector('.cbp-content').innerHTML = `<p class="cbp-err">${esc(e.message)}</p>`; }
  }

  /* ── styles ──────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.id = 'cabana-people-css';
  style.textContent = `
.cpt{display:inline-block;vertical-align:-0.15em;flex-shrink:0;filter:drop-shadow(0 1px 1.5px rgba(20,10,40,.22))}
.cpt-provider .cpt-sheen{animation:cpt-sheen 5.5s ease-in-out infinite}
@keyframes cpt-sheen{0%,60%{transform:skewX(-16deg) translateX(0)}100%{transform:skewX(-16deg) translateX(46px)}}
@media (prefers-reduced-motion:reduce){.cpt-sheen{animation:none!important}}
[data-cp-tick]{display:inline-flex;align-items:center;margin-left:4px;vertical-align:middle}
[data-cp-tick]:empty{display:none}
.cpa{display:inline-block;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#ede7fb,#e0f7f3);position:relative;isolation:isolate}
.cpa.cpa-org{border-radius:28%}
.cpa img{width:100%;height:100%;object-fit:cover;display:block}
.cpa-wait{animation:cpa-pulse 1.4s ease-in-out infinite}
@keyframes cpa-pulse{50%{opacity:.55}}
.cp-follow{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:999px;padding:8px 16px;font:600 13px/1 Inter,system-ui,sans-serif;cursor:pointer;background:#15131F;color:#fff;transition:background .2s,color .2s,transform .15s}
.cp-follow:hover{transform:translateY(-1px)}
.cp-follow.is-on{background:rgba(124,58,237,.1);color:#6D28D9;box-shadow:inset 0 0 0 1px rgba(124,58,237,.3)}
.cp-follow:disabled{opacity:.6;cursor:wait}
#cp-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);background:#15131F;color:#fff;padding:11px 18px;border-radius:12px;font:500 13px Inter,system-ui,sans-serif;opacity:0;pointer-events:none;transition:.25s;z-index:2147483000;max-width:calc(100vw - 32px)}
#cp-toast.show{opacity:1;transform:translate(-50%,0)}
.cbp-dialog{box-sizing:border-box;margin:auto;inset:0;width:min(460px,calc(100vw - 24px));max-height:88dvh;border:0;border-radius:28px;padding:0;background:#fff;color:#1D1830;box-shadow:0 30px 90px rgba(32,18,46,.28);font:14px/1.55 Inter,system-ui,sans-serif;overflow:auto;animation:cbp-in .26s cubic-bezier(.22,1,.36,1)}
.cbp-dialog.cbp-out{animation:cbp-in .18s reverse ease-in forwards}
@keyframes cbp-in{from{opacity:0;transform:translateY(18px) scale(.98)}}
@media (max-width:560px){.cbp-dialog{margin:auto auto 0;width:100vw;max-width:100vw;border-radius:26px 26px 0 0;max-height:92dvh}}
.cbp-dialog::backdrop{background:rgba(23,17,37,.45);backdrop-filter:blur(6px)}
.cbp-close{position:absolute;top:12px;right:12px;z-index:3;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.85);color:#1D1830;font-size:22px;line-height:1;cursor:pointer;backdrop-filter:blur(8px)}
.cbp-content{padding:0 22px 22px;position:relative}
.cbp-cover{height:108px;margin:0 -22px;position:relative}
.cbp-cover::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 20% 0%,rgba(255,255,255,.35),transparent 60%)}
.cbp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:-54px;position:relative;z-index:2}
.cbp-ava .cpa{box-shadow:0 0 0 4px #fff,0 10px 30px rgba(32,18,46,.18)}
.cbp-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding-bottom:6px}
.cbp-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:9px 16px;font:600 13px/1 Inter,system-ui,sans-serif;cursor:pointer;background:#15131F;color:#fff;text-decoration:none}
.cbp-btn-ghost{background:#F3F1F8;color:#1D1830}
.cbp-name{display:flex;align-items:center;gap:6px;margin:14px 0 0;font:700 23px/1.2 Geist,Inter,system-ui,sans-serif;letter-spacing:-.02em}
.cbp-tick{display:inline-flex}
.cbp-handle{color:#6E6880;font-size:13px;margin-top:2px}
.cbp-headline{margin:8px 0 0;font-weight:500;color:#3A3450}
.cbp-tickline{display:inline-flex;align-items:center;gap:7px;text-align:left;line-height:1.35;margin-top:10px;border:0;border-radius:999px;padding:6px 12px 6px 7px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}
.cbp-t-person{background:rgba(124,58,237,.09);color:#5B21B6}
.cbp-t-organization{background:rgba(245,177,46,.14);color:#92400E}
.cbp-t-provider{background:linear-gradient(90deg,rgba(79,109,255,.1),rgba(20,184,166,.13));color:#0F766E}
.cbp-why{margin:8px 0 0;font-size:12.5px;color:#5C566E;background:#F7F6FA;border-radius:12px;padding:10px 12px}
.cbp-stats{display:flex;gap:22px;margin:16px 0 4px}
.cbp-stats b{display:block;font:700 17px Geist,Inter,system-ui,sans-serif}
.cbp-stats span{font-size:12px;color:#6E6880}
.cbp-bio{margin:12px 0 0;white-space:pre-line}
.cbp-facts{margin:10px 0 0;color:#6E6880;font-size:12.5px}
.cbp-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.cbp-badges:empty{display:none}
.cbp-badge{display:inline-block;border-radius:100px;background:#eee6fb;color:#6135a0;padding:4px 10px;font-size:11px;font-weight:700}
.cbp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.cbp-chip{border-radius:100px;background:#F3F1F8;padding:5px 11px;font-size:12px;font-weight:500}
.cbp-chip-i{background:rgba(20,184,166,.1);color:#0F766E}
.cbp-chip-o{background:rgba(245,177,46,.14);color:#92400E}
.cbp-sec h3{margin:18px 0 8px;font:600 12px Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6E6880}
.cbp-ls{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.cbp-l{display:block;text-decoration:none;color:inherit}
.cbp-l-img{display:block;aspect-ratio:4/3;border-radius:14px;background:#EEE center/cover}
.cbp-l-t{display:block;margin-top:6px;font-weight:600;font-size:13px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.cbp-l-s{display:block;font-size:12px;color:#6E6880}
.cbp-muted{color:#797181;font-size:12px}
.cbp-report{margin-top:18px;border:0;background:none;color:#8B8499;font-size:12px;text-decoration:underline;cursor:pointer;padding:0}
.cbp-rform{margin-top:16px;border-top:1px solid #EEE;padding-top:12px;display:grid;gap:6px}
.cbp-rform h3{margin:0 0 4px;font-size:14px}
.cbp-rform label{font-size:13px;display:flex;gap:8px;align-items:center}
.cbp-rform textarea{font:inherit;border:1px solid #DDD;border-radius:10px;padding:8px}
.cbp-err{padding:40px 0 10px;text-align:center;color:#5C566E}
.cbp-skel{padding-top:60px}.cbp-skel span{display:block;width:92px;height:92px;border-radius:50%;background:#EEE}.cbp-skel i{display:block;height:12px;border-radius:6px;background:#EEE;margin-top:12px;width:60%}.cbp-skel i+i{width:40%}
.cbp-skel *{animation:cpa-pulse 1.2s infinite}
button[data-cabana-person]{font:inherit;color:inherit;cursor:pointer}
button.dl-host-ava{border:0}
button.dl-host-name{border:0;background:none;padding:0;text-align:left}
@media (prefers-color-scheme:dark){
 .cbp-dialog{background:#1E1A28;color:#EEE8F5}.cbp-ava .cpa{box-shadow:0 0 0 4px #1E1A28,0 10px 30px rgba(0,0,0,.4)}
 .cbp-btn-ghost,.cbp-chip{background:#2C2638;color:#EEE8F5}.cbp-handle,.cbp-stats span,.cbp-facts,.cbp-sec h3{color:#B7ACBF}
 .cbp-headline{color:#DCD4E6}.cbp-why{background:#2C2638;color:#CFC6D9}.cbp-badge{background:#413254;color:#e1cffc}
 .cbp-t-person{color:#C4B5FD}.cbp-t-organization{color:#FCD34D}.cbp-t-provider{color:#5EEAD4}
 .cbp-close{background:rgba(30,26,40,.8);color:#fff}.cp-follow{background:#fff;color:#15131F}
 .cp-follow.is-on{background:rgba(167,139,250,.15);color:#C4B5FD}.cbp-btn{background:#fff;color:#15131F}
}`;
  document.head.appendChild(style);

  document.addEventListener('click', e => {
    const target = e.target.closest('[data-cabana-person]');
    if (!target || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const id = target.dataset.cabanaPerson;
    if (!id) return;
    e.preventDefault(); e.stopPropagation(); open(id);
  });

  window.CabanaPeople = { open, close, request, badges, api, card, cards, forget, tick, avatarHTML, hydrate, follow, profile, profileHTML, wireSheet, needAvatars, toast, TICKS, LANG, INTERESTS, ORG_KIND, ROLES };
  const boot = () => { hydrate(document); watch(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
