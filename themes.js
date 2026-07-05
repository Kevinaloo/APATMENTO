/* ════════════════════════════════════════════════════════════════
   APATMENTO OCCASIONS — themes.js
   Premium themed layer that dresses the site for holidays & seasons.
   Kenya-first, worldwide-aware. Auto-activates, auto-expires.

   Design principles:
   - A refined accent layer, never a costume: subtle ribbon, tuned
     accent colours, gentle ambient particles, themed greeting
   - Zero layout shift; zero interference with booking flows
   - <2KB of DOM; particles capped + disabled for reduced-motion
════════════════════════════════════════════════════════════════ */
const ApatmentoOccasions = (() => {

  /* ── Occasion calendar ────────────────────────────────────────
     window: [startMonth, startDay, endMonth, endDay] inclusive.
     priority: higher wins when windows overlap.               */
  const OCCASIONS = [
    // ── Kenya national days (highest priority) ──
    { id:'jamhuri',   name:'Jamhuri Day',    window:[12,10,12,13], priority:100,
      ribbon:'🇰🇪 Happy Jamhuri Day — celebrating Kenya\'s independence',
      accent:'#006600', accent2:'#BB0000', particles:['🇰🇪','✨'],
      greeting:'Happy Jamhuri Day' },
    { id:'madaraka',  name:'Madaraka Day',   window:[6,1,6,2], priority:100,
      ribbon:'🇰🇪 Madaraka Day — honouring self-rule',
      accent:'#006600', accent2:'#BB0000', particles:['🇰🇪','✨'],
      greeting:'Happy Madaraka Day' },
    { id:'mashujaa',  name:'Mashujaa Day',   window:[10,20,10,21], priority:100,
      ribbon:'🦸 Mashujaa Day — celebrating our heroes',
      accent:'#006600', accent2:'#BB0000', particles:['🦸','⭐'],
      greeting:'Happy Mashujaa Day' },
    { id:'labour_ke', name:'Labour Day',     window:[5,1,5,1], priority:90,
      ribbon:'🛠 Happy Labour Day Kenya',
      accent:'#4361FF', accent2:'#2DD4BF', particles:['🛠','✨'],
      greeting:'Happy Labour Day' },

    // ── Global moments ──
    { id:'christmas', name:'Christmas',      window:[12,18,12,26], priority:95,
      ribbon:'🎄 Krismasi Njema! Book your holiday getaway',
      accent:'#C41E3A', accent2:'#165B33', particles:['❄','🎄','✨'],
      greeting:'Merry Christmas' },
    { id:'newyear',   name:'New Year',       window:[12,29,1,2], priority:96,
      ribbon:'🎆 Happy New Year — new adventures await',
      accent:'#FFD700', accent2:'#7B2FF7', particles:['🎆','✨','🥂'],
      greeting:'Happy New Year' },
    { id:'valentines',name:'Valentine\'s',   window:[2,10,2,15], priority:85,
      ribbon:'💝 Valentine\'s — book a romantic escape for two',
      accent:'#FF4D6D', accent2:'#FF8FA3', particles:['💝','💕'],
      greeting:'Happy Valentine\'s' },
    { id:'easter',    name:'Easter',         window:[4,3,4,7], priority:85, // approx window
      ribbon:'🐣 Easter weekend — family getaways from KES 1,500/night',
      accent:'#9B5DE5', accent2:'#F5D547', particles:['🐣','🌸'],
      greeting:'Happy Easter' },
    { id:'halloween', name:'Halloween',      window:[10,28,10,31], priority:70,
      ribbon:'🎃 Spooky season — haunted good deals inside',
      accent:'#FF7518', accent2:'#1A0A2E', particles:['🎃','👻','🦇'],
      greeting:'Happy Halloween' },
    { id:'diwali',    name:'Diwali',         window:[11,9,11,13], priority:80, // approx
      ribbon:'🪔 Happy Diwali — festival of lights',
      accent:'#FF9933', accent2:'#FFD700', particles:['🪔','✨'],
      greeting:'Happy Diwali' },

    // ── Seasons (lowest priority, ambient) ──
    { id:'beach_season', name:'Beach Season', window:[12,1,2,28], priority:20,
      ribbon:'🏖 Peak beach season — Diani & Mombasa stays are hot right now',
      accent:'#00B4D8', accent2:'#FFB703', particles:[],
      greeting:null },
    { id:'safari_season', name:'Safari Season', window:[7,1,9,30], priority:20,
      ribbon:'🦁 Prime safari season — the Great Migration is on',
      accent:'#BC6C25', accent2:'#606C38', particles:[],
      greeting:null },
  ];

  /* ── Date helpers (Nairobi UTC+3) ─────────────────────────── */
  function nairobiNow() {
    return new Date(Date.now() + 3 * 3600 * 1000);
  }

  function inWindow(occ, m, d) {
    const [sm, sd, em, ed] = occ.window;
    const val = m * 100 + d, start = sm * 100 + sd, end = em * 100 + ed;
    if (start <= end) return val >= start && val <= end;
    // wraps year end (e.g. Dec 29 → Jan 2)
    return val >= start || val <= end;
  }

  function activeOccasion() {
    const now = nairobiNow();
    const m = now.getUTCMonth() + 1, d = now.getUTCDate();
    const dismissed = sessionStorage.getItem('apt_occ_dismissed') || '';
    return OCCASIONS
      .filter(o => inWindow(o, m, d) && dismissed !== o.id)
      .sort((a, b) => b.priority - a.priority)[0] || null;
  }

  /* ── Renderers ─────────────────────────────────────────────── */
  function injectCSS(occ) {
    if (document.getElementById('apt-occ-css')) return;
    const s = document.createElement('style');
    s.id = 'apt-occ-css';
    s.textContent = `
#apt-occ-ribbon{
  position:relative;z-index:60;
  background:linear-gradient(90deg,${occ.accent},${occ.accent2});
  color:#fff;font-size:12.5px;font-weight:700;letter-spacing:.01em;
  padding:8px 40px 8px 16px;text-align:center;line-height:1.4;
  animation:apt-occ-slide .5s cubic-bezier(.22,1,.36,1);
}
@keyframes apt-occ-slide{from{transform:translateY(-100%);}to{transform:none;}}
#apt-occ-ribbon a{color:#fff;text-decoration:underline;}
#apt-occ-close{
  position:absolute;right:8px;top:50%;transform:translateY(-50%);
  width:24px;height:24px;border-radius:50%;border:none;cursor:pointer;
  background:rgba(255,255,255,.2);color:#fff;font-size:11px;
  display:flex;align-items:center;justify-content:center;
}
#apt-occ-close:hover{background:rgba(255,255,255,.35);}
.apt-occ-particle{
  position:fixed;top:-30px;z-index:55;pointer-events:none;
  font-size:16px;opacity:.85;will-change:transform;
  animation:apt-occ-fall linear forwards;
}
@keyframes apt-occ-fall{
  to{transform:translateY(110vh) rotate(360deg);opacity:.2;}
}
@media(prefers-reduced-motion:reduce){.apt-occ-particle{display:none!important;}}
`;
    document.head.appendChild(s);
  }

  function renderRibbon(occ) {
    if (document.getElementById('apt-occ-ribbon')) return;
    const bar = document.createElement('div');
    bar.id = 'apt-occ-ribbon';
    bar.setAttribute('role', 'status');
    bar.innerHTML = `${occ.ribbon}
      <button id="apt-occ-close" aria-label="Dismiss">✕</button>`;
    document.body.insertBefore(bar, document.body.firstChild);
    document.getElementById('apt-occ-close').onclick = () => {
      sessionStorage.setItem('apt_occ_dismissed', occ.id);
      bar.remove();
      stopParticles();
    };
  }

  /* Gentle ambient particles — capped, staggered, GPU-friendly */
  let _particleTimer = null;
  function startParticles(occ) {
    if (!occ.particles.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let count = 0;
    const MAX_ALIVE = 14;
    const spawn = () => {
      if (document.querySelectorAll('.apt-occ-particle').length >= MAX_ALIVE) return;
      const p = document.createElement('div');
      p.className = 'apt-occ-particle';
      p.textContent = occ.particles[Math.floor(Math.random() * occ.particles.length)];
      p.style.left = Math.random() * 100 + 'vw';
      p.style.fontSize = (12 + Math.random() * 10) + 'px';
      p.style.animationDuration = (7 + Math.random() * 8) + 's';
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
      count++;
      // After 40 particles, slow to ambient drip
      if (count === 40) { clearInterval(_particleTimer); _particleTimer = setInterval(spawn, 6000); }
    };
    _particleTimer = setInterval(spawn, 900);
    // Hard stop after 90s — theme stays, motion rests
    setTimeout(stopParticles, 90000);
  }
  function stopParticles() {
    clearInterval(_particleTimer);
    document.querySelectorAll('.apt-occ-particle').forEach(p => p.remove());
  }

  /* Themed greeting swap (dashboard "Good morning" etc.) */
  function themeGreeting(occ) {
    if (!occ.greeting) return;
    // Wait for greeting element to exist (dashboard renders it async)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const g = document.querySelector('.psc-title, .greeting-title, [data-greeting], h1.hero-greeting');
      if (g && /good (morning|afternoon|evening)/i.test(g.textContent)) {
        g.textContent = occ.greeting + '!';
        clearInterval(t);
      }
      if (tries > 20) clearInterval(t);
    }, 400);
  }

  /* Accent CSS variables — subtle tint on brand elements */
  function themeAccents(occ) {
    const root = document.documentElement;
    root.style.setProperty('--occ-accent', occ.accent);
    root.style.setProperty('--occ-accent2', occ.accent2);
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    const occ = activeOccasion();
    if (!occ) return;
    injectCSS(occ);
    renderRibbon(occ);
    themeAccents(occ);
    themeGreeting(occ);
    startParticles(occ);
    // Expose for APA to reference
    window._apatmentoOccasion = { id: occ.id, name: occ.name };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { activeOccasion, init };
})();
