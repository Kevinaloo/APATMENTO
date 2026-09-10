/* ═══════════════════════════════════════════════════════════════════
   CABANA PULSE & INTELLIGENCE CENTER  v1.0
   cabana-pulse.js
   ───────────────────────────────────────────────────────────────────
   High-reliability notifications, live weather, and route maneuver
   intelligence. Preserves dashboard layout with zero vertical displacement.
   ═══════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';
  if (global.CabanaPulse) return;

  var WEATHER_CACHE_KEY = 'cbn_weather_v1';
  var NOTIF_STORAGE_KEY = 'cbn_notifs_v1';
  var DEFAULT_CITY = 'Nairobi';
  var DEFAULT_COORDS = { lat: -1.2921, lng: 36.8219 };

  var POPULAR_HUBS = [
    { key: 'nairobi',   name: 'Nairobi',       lat: -1.2921, lng: 36.8219, label: 'Capital & Suburbs' },
    { key: 'mombasa',   name: 'Mombasa',       lat: -4.0435, lng: 39.6682, label: 'Coast & Ferry' },
    { key: 'diani',     name: 'Diani Beach',   lat: -4.2796, lng: 39.5947, label: 'South Coast' },
    { key: 'naivasha',  name: 'Naivasha',      lat: -0.7172, lng: 36.4310, label: 'Rift Valley' },
    { key: 'nakuru',    name: 'Nakuru',        lat: -0.3031, lng: 36.0800, label: 'National Park' },
    { key: 'mara',      name: 'Masai Mara',    lat: -1.4931, lng: 35.1439, label: 'Game Reserve' },
    { key: 'kisumu',    name: 'Kisumu',        lat: -0.0917, lng: 34.7680, label: 'Lake Victoria' },
    { key: 'nanyuki',   name: 'Nanyuki',       lat: 0.0167,  lng: 37.0722, label: 'Mount Kenya' },
  ];

  var state = {
    activeTab: 'weather', // 'weather' | 'notifs'
    city: DEFAULT_CITY,
    coords: DEFAULT_COORDS,
    weather: null,
    loadingWeather: false,
    notifications: [],
    unreadCount: 0,
    pushGranted: ('Notification' in window) && Notification.permission === 'granted',
  };

  /* ── AUDIO SYNTHESIZER (Polite Chime for Alerts) ── */
  function playAlertChime() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.46);
    } catch (e) {}
  }

  /* ── PERSISTENCE HELPERS ── */
  function loadStoredNotifs() {
    try {
      var raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}

    // Default intelligent starting notifications
    return [
      {
        id: 'w-brief-' + new Date().toISOString().slice(0, 10),
        kind: 'weather',
        title: 'Daily Maneuver Intelligence',
        text: 'Nairobi & surrounding highway corridors: Dry conditions favorable for 2WD vehicles. Morning travel window optimal.',
        time: 'Today, 07:00 AM',
        read: false,
        actionLabel: 'View Radar',
        tab: 'weather',
      },
      {
        id: 'cbn-welcome',
        kind: 'system',
        title: 'Zero Commission Travel Live',
        text: 'Welcome to Cabana. Stays, Car Hire, Tours, and Experiences now connect directly with vetted local hosts with 0% markup.',
        time: 'Just now',
        read: false,
        actionLabel: 'Explore Stays',
        link: 'apartments.html',
      },
    ];
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function safeInternalLink(value) {
    if (!value) return '';
    try {
      var url = new URL(String(value), global.location.origin);
      if (url.origin !== global.location.origin) return '';
      return url.pathname + url.search + url.hash;
    } catch (e) { return ''; }
  }

  function saveNotifs() {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(state.notifications));
    } catch (e) {}
    recomputeUnread();
  }

  function recomputeUnread() {
    var count = state.notifications.filter(function (n) { return !n.read; }).length;
    state.unreadCount = count;
    updateBadges(count);
  }

  function updateBadges(count) {
    // Update all notification bell dots across the DOM
    var dots = document.querySelectorAll('.apa-ico-dot, .apa-bell-badge, #cbn-nav-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      if (dot.classList.contains('apa-bell-badge')) {
        dot.textContent = count > 9 ? '9+' : String(count);
        dot.classList.toggle('on', count > 0);
      } else {
        dot.style.display = count > 0 ? 'block' : 'none';
      }
    });

    var countBadge = document.getElementById('cp-notif-tab-count');
    if (countBadge) {
      countBadge.textContent = count;
      countBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  /* ── WEATHER FETCHING & CACHING ── */
  async function fetchWeather(city, coords) {
    state.loadingWeather = true;
    renderBar();

    var targetCity = city || state.city;
    var targetCoords = coords || state.coords;

    // Check memory / session cache. Keep an expired entry only as a clearly
    // labelled fallback; never replace a failed live lookup with invented data.
    var staleWeather = null;
    try {
      var cached = sessionStorage.getItem(WEATHER_CACHE_KEY + '_' + targetCity);
      if (cached) {
        var parsed = JSON.parse(cached);
        staleWeather = parsed.data || null;
        if (Date.now() - parsed.timestamp < 12 * 60 * 1000) {
          state.weather = parsed.data;
          state.loadingWeather = false;
          renderBar();
          renderDrawerWeather();
          return parsed.data;
        }
      }
    } catch (e) {}

    var url = '/api/utilities?action=weather&city=' + encodeURIComponent(targetCity)
            + '&lat=' + targetCoords.lat + '&lng=' + targetCoords.lng;

    var data = null;
    try {
      var res = await fetch(url);
      if (res.ok) data = await res.json();
    } catch (err) {
      console.warn('[pulse] weather proxy failed, falling back to direct Open-Meteo:', err);
    }

    if (!data || !data.current) {
      data = staleWeather ? Object.assign({}, staleWeather, {
        live: false,
        stale: true,
      }) : {
        ok: false,
        live: false,
        unavailable: true,
        city: targetCity,
        current: { temp: '—', feelsLike: '—', humidity: '—', windKmH: '—', label: 'Weather unavailable', icon: '—' },
        maneuver: {
          score: 'UNAVAILABLE',
          badgeColor: '#8B8EAC',
          summary: 'Check local conditions before travel',
          vehicleGuidance: 'Live vehicle guidance is temporarily unavailable',
          roadAdvisory: 'Use an official local forecast before setting out.',
          locNote: '',
          bestWindow: 'Unavailable',
          maxRainProb: '—',
        },
        hourly: [],
      };
    }

    state.weather = data;
    state.loadingWeather = false;

    try {
      sessionStorage.setItem(WEATHER_CACHE_KEY + '_' + targetCity, JSON.stringify({
        timestamp: Date.now(),
        data: data,
      }));
    } catch (e) {}

    renderBar();
    renderDrawerWeather();
    return data;
  }

  /* ── GREETING AMBIENT BAR RENDERING ── */
  function renderBar() {
    var bar = document.getElementById('cbn-pulse-bar');
    if (!bar) return;

    var w = state.weather;
    var tempEl = document.getElementById('cpb-temp');
    var cityEl = document.getElementById('cpb-city');
    var iconEl = document.getElementById('cpb-icon');
    var condEl = document.getElementById('cpb-condition');
    var dotEl  = document.getElementById('cpb-radar-dot');

    if (!w || !w.current) {
      if (tempEl) tempEl.textContent = '—°C';
      if (cityEl) cityEl.textContent = state.city;
      if (iconEl) iconEl.textContent = '🌤️';
      if (condEl) condEl.textContent = 'Checking road conditions…';
      return;
    }

    var curr = w.current;
    var m = w.maneuver || {};

    if (tempEl) tempEl.textContent = curr.temp + '°C';
    if (cityEl) cityEl.textContent = w.city || state.city;
    if (iconEl) iconEl.textContent = curr.icon || '🌤️';
    if (condEl) condEl.textContent = w.stale
      ? (curr.label || 'Weather') + ' · Cached update'
      : (curr.label || 'Weather') + ' · ' + (m.summary || 'Conditions unavailable');

    if (dotEl) {
      dotEl.style.backgroundColor = m.badgeColor || '#10B981';
      dotEl.style.boxShadow = '0 0 8px ' + (m.badgeColor || '#10B981');
    }
  }

  /* ── STYLES INJECTION ── */
  function injectStyles() {
    if (document.getElementById('cbn-pulse-css')) return;
    var style = document.createElement('style');
    style.id = 'cbn-pulse-css';
    style.textContent = `
/* ══ AMBIENT GREETING WEATHER CAPSULE (0-pixel displacement) ══ */
.cbn-pulse-bar {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 520px;
  height: 32px;
  margin-top: 8px;
  margin-bottom: 0;
  padding: 4px 12px 4px 10px;
  border-radius: 100px;
  background: linear-gradient(135deg, rgba(67,97,255,.05), rgba(16,185,129,.05));
  border: 1px solid rgba(67,97,255,.14);
  backdrop-filter: blur(8px);
  cursor: pointer;
  user-select: none;
  transition: all .22s cubic-bezier(.22,1,.36,1);
  box-sizing: border-box;
}
.cbn-pulse-bar:hover {
  background: linear-gradient(135deg, rgba(67,97,255,.1), rgba(16,185,129,.08));
  border-color: rgba(67,97,255,.3);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(67,97,255,.08);
}
.cbn-pulse-bar:active {
  transform: scale(.99);
}
.cpb-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.cpb-radar-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
  flex-shrink: 0;
  animation: cpb-pulse 2s infinite ease-in-out;
}
@keyframes cpb-pulse {
  0%, 100% { transform: scale(1); opacity: .9; }
  50% { transform: scale(1.45); opacity: .4; }
}
.cpb-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}
.cpb-temp {
  font-family: var(--font-body, system-ui);
  font-weight: 700;
  font-size: 12.5px;
  color: var(--ink, #08080F);
  flex-shrink: 0;
}
.cpb-city {
  font-weight: 600;
  font-size: 12px;
  color: var(--ink-faint, #6366F1);
  flex-shrink: 0;
}
.cpb-sep {
  color: rgba(0,0,0,.25);
  font-size: 11px;
}
.cpb-condition {
  font-size: 11.5px;
  color: var(--ink-soft, #474A66);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.cpb-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 6px;
}
.cpb-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: #4361FF;
  background: rgba(67,97,255,.09);
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
}
.cpb-arr {
  color: #4361FF;
  opacity: .7;
  transition: transform .2s;
}
.cbn-pulse-bar:hover .cpb-arr {
  transform: translateX(2px);
  opacity: 1;
}

@media(max-width: 480px) {
  .cbn-pulse-bar {
    height: 29px;
    padding: 3px 10px 3px 8px;
    margin-top: 6px;
  }
  .cpb-condition {
    max-width: 145px;
  }
  .cpb-tag {
    display: none;
  }
}

/* ══ INTELLIGENCE & NOTIFICATION DRAWER ══ */
.cp-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  background: rgba(8, 8, 15, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s ease;
}
.cp-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.cp-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 440px;
  max-width: 100vw;
  background: #FAFAFD;
  z-index: 99999;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform .35s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.cp-overlay.active .cp-drawer {
  transform: translateX(0);
}

@media(max-width: 640px) {
  .cp-drawer {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 88vh;
    height: 88vh;
    border-radius: 28px 28px 0 0;
    transform: translateY(100%);
  }
  .cp-overlay.active .cp-drawer {
    transform: translateY(0);
  }
}

/* Drawer Header */
.cp-head {
  padding: 18px 20px 14px;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(8,8,15,.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.cp-tabs {
  display: flex;
  background: rgba(8,8,15,.05);
  padding: 3px;
  border-radius: 100px;
}
.cp-tab-btn {
  padding: 7px 15px;
  border-radius: 100px;
  border: none;
  background: transparent;
  font-family: var(--font-body, system-ui);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft, #474A66);
  cursor: pointer;
  transition: all .2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cp-tab-btn.active {
  background: #FFFFFF;
  color: #4361FF;
  box-shadow: 0 2px 8px rgba(0,0,0,.07);
}
.cp-badge-pill {
  background: #FF6A3C;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 100px;
}
.cp-close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(8,8,15,.08);
  background: rgba(8,8,15,.03);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink, #08080F);
  cursor: pointer;
  transition: all .2s;
}
.cp-close-btn:hover {
  background: rgba(8,8,15,.08);
  transform: scale(1.05);
}

/* Drawer Body */
.cp-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 18px 20px 30px;
}
.cp-view {
  display: none;
  animation: cp-fadein .25s ease forwards;
}
.cp-view.active {
  display: block;
}
@keyframes cp-fadein {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Weather Hub Scroller */
.cp-hubs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 14px;
  scrollbar-width: none;
}
.cp-hubs::-webkit-scrollbar { display: none; }
.cp-hub-pill {
  padding: 6px 12px;
  border-radius: 100px;
  border: 1px solid rgba(8,8,15,.1);
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft, #474A66);
  white-space: nowrap;
  cursor: pointer;
  transition: all .18s;
  flex-shrink: 0;
}
.cp-hub-pill.active {
  background: #4361FF;
  color: #FFFFFF;
  border-color: #4361FF;
  box-shadow: 0 4px 12px rgba(67,97,255,.28);
}

/* Weather Main Stage Card */
.cp-weather-hero {
  background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  border-radius: 22px;
  padding: 22px;
  color: #FFFFFF;
  margin-bottom: 18px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(37,99,235,.22);
}
.cp-weather-hero.night {
  background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
}
.cp-weather-hero.rain {
  background: linear-gradient(135deg, #334155 0%, #1E293B 100%);
}
.cp-wh-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.cp-wh-city {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -.01em;
}
.cp-wh-cond {
  font-size: 13px;
  opacity: .88;
}
.cp-wh-icon {
  font-size: 42px;
  line-height: 1;
}
.cp-wh-middle {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 18px;
}
.cp-wh-temp {
  font-size: 52px;
  font-weight: 800;
  line-height: 1;
  font-family: var(--font-display, system-ui);
}
.cp-wh-feels {
  font-size: 13px;
  opacity: .85;
}
.cp-wh-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: rgba(255,255,255,.12);
  border-radius: 14px;
  padding: 10px 14px;
  backdrop-filter: blur(4px);
}
.cp-metric-val {
  font-weight: 700;
  font-size: 13.5px;
}
.cp-metric-lbl {
  font-size: 10.5px;
  opacity: .75;
  text-transform: uppercase;
}

/* Maneuver Intelligence Section */
.cp-section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ink-faint, #8B8EAC);
  margin: 18px 0 8px;
}
.cp-maneuver-card {
  background: #FFFFFF;
  border: 1px solid rgba(8,8,15,.08);
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 4px 16px rgba(0,0,0,.03);
  margin-bottom: 16px;
}
.cp-mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cp-mc-score {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .06em;
  padding: 4px 10px;
  border-radius: 100px;
  color: #fff;
  background: #10B981;
}
.cp-mc-veh {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink, #08080F);
  margin-bottom: 6px;
  line-height: 1.35;
}
.cp-mc-advisory {
  font-size: 13px;
  color: var(--ink-soft, #474A66);
  line-height: 1.5;
  margin-bottom: 10px;
}
.cp-mc-window {
  background: rgba(67,97,255,.06);
  border-left: 3px solid #4361FF;
  padding: 9px 12px;
  border-radius: 4px 10px 10px 4px;
  font-size: 12.5px;
  color: #2A3FC4;
  font-weight: 600;
}

/* Hourly Scroller */
.cp-hourly {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none;
  margin-bottom: 16px;
}
.cp-hourly::-webkit-scrollbar { display: none; }
.cp-hour-item {
  background: #FFFFFF;
  border: 1px solid rgba(8,8,15,.08);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 62px;
  flex-shrink: 0;
  text-align: center;
}
.cp-hour-time { font-size: 11px; color: var(--ink-faint, #8B8EAC); font-weight: 600; }
.cp-hour-icon { font-size: 18px; line-height: 1; }
.cp-hour-temp { font-size: 13px; font-weight: 700; color: var(--ink, #08080F); }
.cp-hour-rain { font-size: 10px; color: #3B82F6; font-weight: 700; }

/* Notifications Section */
.cp-notif-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.cp-mark-all {
  font-size: 12px;
  font-weight: 600;
  color: #4361FF;
  background: transparent;
  border: none;
  cursor: pointer;
}
.cp-push-banner {
  background: linear-gradient(135deg, rgba(67,97,255,.09), rgba(124,58,237,.06));
  border: 1px solid rgba(67,97,255,.2);
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
}
.cp-pb-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink, #08080F);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cp-pb-desc {
  font-size: 12.5px;
  color: var(--ink-soft, #474A66);
  line-height: 1.45;
  margin-bottom: 12px;
}
.cp-pb-btn {
  background: #4361FF;
  color: #fff;
  border: none;
  border-radius: 100px;
  padding: 9px 18px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
}
.cp-pb-btn:hover {
  background: #3451E0;
  transform: translateY(-1px);
}

.cp-notif-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cp-notif-card {
  background: #FFFFFF;
  border: 1px solid rgba(8,8,15,.08);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  transition: all .18s;
  cursor: pointer;
  position: relative;
}
.cp-notif-card.unread {
  border-color: rgba(67,97,255,.25);
  background: #FAF8FF;
}
.cp-notif-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0,0,0,.04);
}
.cp-notif-ico {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  color: #fff;
  background: #4361FF;
}
.cp-notif-ico.weather { background: linear-gradient(135deg, #0EA5E9, #2563EB); }
.cp-notif-ico.system { background: linear-gradient(135deg, #10B981, #059669); }
.cp-notif-ico.booking { background: linear-gradient(135deg, #8B5CF6, #6D28D9); }

.cp-notif-content {
  flex: 1;
  min-width: 0;
}
.cp-notif-title {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ink, #08080F);
  margin-bottom: 3px;
  line-height: 1.3;
}
.cp-notif-text {
  font-size: 12.5px;
  color: var(--ink-soft, #474A66);
  line-height: 1.45;
  margin-bottom: 6px;
}
.cp-notif-meta {
  font-size: 11px;
  color: var(--ink-faint, #8B8EAC);
  display: flex;
  align-items: center;
  gap: 8px;
}
.cp-unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4361FF;
  flex-shrink: 0;
}
`;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ── DRAWER MOUNT & RENDERING ── */
  function mountDrawer() {
    if (document.getElementById('cp-drawer-overlay')) return;
    injectStyles();

    var overlay = document.createElement('div');
    overlay.id = 'cp-drawer-overlay';
    overlay.className = 'cp-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="cp-drawer" role="dialog" aria-modal="true" aria-label="Pulse & Intelligence">
        <div class="cp-head">
          <div class="cp-tabs">
            <button class="cp-tab-btn active" id="cp-tab-weather" onclick="CabanaPulse.switchTab('weather')">
              ⛅ Weather & Terrain
            </button>
            <button class="cp-tab-btn" id="cp-tab-notifs" onclick="CabanaPulse.switchTab('notifs')">
              🔔 Notifications <span class="cp-badge-pill" id="cp-notif-tab-count" style="display:none">0</span>
            </button>
          </div>
          <button class="cp-close-btn" onclick="CabanaPulse.close()" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="cp-body">
          <!-- ── TAB 1: WEATHER & MANEUVER ── -->
          <div class="cp-view active" id="cp-view-weather">
            <div class="cp-hubs" id="cp-hubs-bar">
              ${POPULAR_HUBS.map(function(h) {
                return '<button class="cp-hub-pill ' + (h.name === state.city ? 'active' : '') + '" onclick="CabanaPulse.selectCity(\'' + h.name + '\', ' + h.lat + ', ' + h.lng + ')">' + h.name + '</button>';
              }).join('')}
              <button class="cp-hub-pill" onclick="CabanaPulse.detectLocation()" title="Use my GPS location">📍 My Location</button>
            </div>

            <div class="cp-weather-hero" id="cp-weather-hero">
              <div class="cp-wh-top">
                <div>
                  <div class="cp-wh-city" id="cp-wh-city">${state.city}</div>
                  <div class="cp-wh-cond" id="cp-wh-cond">Live conditions</div>
                </div>
                <div class="cp-wh-icon" id="cp-wh-icon">🌤️</div>
              </div>
              <div class="cp-wh-middle">
                <div class="cp-wh-temp" id="cp-wh-temp">24°</div>
                <div class="cp-wh-feels" id="cp-wh-feels">Feels like 25°C</div>
              </div>
              <div class="cp-wh-metrics">
                <div>
                  <div class="cp-metric-val" id="cp-m-humidity">55%</div>
                  <div class="cp-metric-lbl">Humidity</div>
                </div>
                <div>
                  <div class="cp-metric-val" id="cp-m-wind">12 km/h</div>
                  <div class="cp-metric-lbl">Wind</div>
                </div>
                <div>
                  <div class="cp-metric-val" id="cp-m-rain">10%</div>
                  <div class="cp-metric-lbl">Rain chance</div>
                </div>
              </div>
            </div>

            <div class="cp-section-title">Today's Maneuver & Route Intelligence</div>
            <div class="cp-maneuver-card" id="cp-maneuver-card">
              <div class="cp-mc-head">
                <span class="cp-mc-score" id="cp-mc-score">OPTIMAL MOBILITY</span>
                <span style="font-size:11px;color:#8B8EAC;font-weight:600;">Updated live</span>
              </div>
              <div class="cp-mc-veh" id="cp-mc-veh">Safe for all vehicles (2WD, hatchbacks & sedans)</div>
              <div class="cp-mc-advisory" id="cp-mc-advisory">Corridors operating with normal flow. Tarmac is dry with standard braking response.</div>
              <div class="cp-mc-window" id="cp-mc-window">Optimal Movement Window: 08:00 – 16:30</div>
            </div>

            <div class="cp-section-title">Hourly Travel Radar (Next 10 Hours)</div>
            <div class="cp-hourly" id="cp-hourly-scroll">
              <!-- Hourly pills dynamically rendered -->
            </div>
          </div>

          <!-- ── TAB 2: NOTIFICATIONS ── -->
          <div class="cp-view" id="cp-view-notifs">
            <!-- Smart Push Activation Banner if not granted -->
            <div class="cp-push-banner" id="cp-push-banner" style="${state.pushGranted ? 'display:none' : ''}">
              <div class="cp-pb-title">
                <span>🔔</span> Never Miss Key Updates
              </div>
              <div class="cp-pb-desc">
                Enable instant lockscreen notifications for check-in PIN codes, host chat alerts, and severe storm warnings.
              </div>
              <button class="cp-pb-btn" onclick="CabanaPulse.enablePush()">Turn On Instant Alerts</button>
            </div>

            <div class="cp-notif-actions">
              <span class="cp-section-title" style="margin:0;">Recent Activity</span>
              <button class="cp-mark-all" onclick="CabanaPulse.markAllAsRead()">Mark all as read</button>
            </div>

            <div class="cp-notif-list" id="cp-notif-list">
              <!-- Injected dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeDrawer();
    });

    document.body.appendChild(overlay);
    renderDrawerWeather();
    renderDrawerNotifs();
  }

  function renderDrawerWeather() {
    var w = state.weather;
    if (!w || !w.current) return;

    var cityEl = document.getElementById('cp-wh-city');
    var condEl = document.getElementById('cp-wh-cond');
    var iconEl = document.getElementById('cp-wh-icon');
    var tempEl = document.getElementById('cp-wh-temp');
    var feelsEl = document.getElementById('cp-wh-feels');
    var humEl = document.getElementById('cp-m-humidity');
    var windEl = document.getElementById('cp-m-wind');
    var rainEl = document.getElementById('cp-m-rain');
    var heroEl = document.getElementById('cp-weather-hero');

    if (cityEl) cityEl.textContent = w.city || state.city;
    if (condEl) condEl.textContent = w.current.label || 'Clear Sky';
    if (iconEl) iconEl.textContent = w.current.icon || '🌤️';
    if (tempEl) tempEl.textContent = w.current.temp + '°';
    if (feelsEl) feelsEl.textContent = 'Feels like ' + w.current.feelsLike + '°C';
    if (humEl) humEl.textContent = w.current.humidity + '%';
    if (windEl) windEl.textContent = w.current.windKmH + ' km/h';
    if (rainEl) rainEl.textContent = (w.maneuver?.maxRainProb || 10) + '%';

    if (heroEl) {
      heroEl.classList.remove('night', 'rain');
      if (w.current.condition === 'rain' || w.current.condition === 'heavy_rain') heroEl.classList.add('rain');
      else if (w.current.isDay === false) heroEl.classList.add('night');
    }

    var m = w.maneuver || {};
    var scoreEl = document.getElementById('cp-mc-score');
    var vehEl = document.getElementById('cp-mc-veh');
    var advEl = document.getElementById('cp-mc-advisory');
    var winEl = document.getElementById('cp-mc-window');

    if (scoreEl) {
      scoreEl.textContent = (m.score || 'OPTIMAL') + ' MOBILITY';
      scoreEl.style.backgroundColor = m.badgeColor || '#10B981';
    }
    if (vehEl) vehEl.textContent = m.vehicleGuidance || 'Safe for all vehicles';
    if (advEl) advEl.textContent = (m.roadAdvisory || '') + ' ' + (m.locNote || '');
    if (winEl) winEl.textContent = 'Optimal Movement Window: ' + (m.bestWindow || '08:00 – 16:30');

    // Render hourly items
    var hourContainer = document.getElementById('cp-hourly-scroll');
    if (hourContainer && Array.isArray(w.hourly) && w.hourly.length) {
      hourContainer.innerHTML = w.hourly.map(function (h) {
        return `
          <div class="cp-hour-item">
            <span class="cp-hour-time">${escapeHtml(h.time)}</span>
            <span class="cp-hour-icon">${escapeHtml(h.icon)}</span>
            <span class="cp-hour-temp">${escapeHtml(h.temp)}°</span>
            <span class="cp-hour-rain">${escapeHtml(h.rainProb)}%</span>
          </div>
        `;
      }).join('');
    }

    // Update hub pill states
    var pills = document.querySelectorAll('.cp-hub-pill');
    Array.prototype.forEach.call(pills, function (p) {
      p.classList.toggle('active', p.textContent.trim().toLowerCase() === state.city.toLowerCase());
    });
  }

  function renderDrawerNotifs() {
    var list = document.getElementById('cp-notif-list');
    if (!list) return;

    if (!state.notifications.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:34px 20px;color:var(--ink-faint,#8B8EAC);">
          <div style="font-size:32px;margin-bottom:8px;">🔔</div>
          <div style="font-weight:600;font-size:14px;color:var(--ink,#08080F);">You are all caught up</div>
          <div style="font-size:12.5px;margin-top:4px;">No unread alerts or notifications</div>
        </div>
      `;
      return;
    }

    list.textContent = '';
    state.notifications.forEach(function (n) {
      var ico = '🔔';
      if (n.kind === 'weather') ico = '⛅';
      else if (n.kind === 'booking') ico = '🏠';
      else if (n.kind === 'payment') ico = '💳';

      var kind = /^(weather|booking|payment|system)$/.test(n.kind) ? n.kind : 'system';
      var card = document.createElement('div');
      card.className = 'cp-notif-card' + (n.read ? '' : ' unread');
      card.setAttribute('role', 'button');
      card.tabIndex = 0;

      var icon = document.createElement('div');
      icon.className = 'cp-notif-ico ' + kind;
      icon.textContent = ico;

      var content = document.createElement('div');
      content.className = 'cp-notif-content';
      var title = document.createElement('div');
      title.className = 'cp-notif-title';
      title.textContent = n.title || 'Cabana';
      var body = document.createElement('div');
      body.className = 'cp-notif-text';
      body.textContent = n.text || '';
      var meta = document.createElement('div');
      meta.className = 'cp-notif-meta';
      var time = document.createElement('span');
      time.textContent = n.time || '';
      meta.appendChild(time);
      if (!n.read) {
        var unread = document.createElement('span');
        unread.className = 'cp-unread-dot';
        meta.appendChild(unread);
      }
      if (n.actionLabel) {
        var action = document.createElement('span');
        action.style.cssText = 'color:#4361FF;font-weight:600;';
        action.textContent = n.actionLabel + ' →';
        meta.appendChild(action);
      }
      content.appendChild(title);
      content.appendChild(body);
      content.appendChild(meta);
      card.appendChild(icon);
      card.appendChild(content);
      card.addEventListener('click', function () { handleNotifClick(n.id); });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleNotifClick(n.id);
        }
      });
      list.appendChild(card);
    });
  }

  /* ── DRAWER OPEN / CLOSE / TABS ── */
  function openDrawer(tab) {
    mountDrawer();
    var overlay = document.getElementById('cp-drawer-overlay');
    if (overlay) overlay.classList.add('active');
    if (tab) switchTab(tab);
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var overlay = document.getElementById('cp-drawer-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function switchTab(tab) {
    state.activeTab = tab;
    var tWeather = document.getElementById('cp-tab-weather');
    var tNotifs  = document.getElementById('cp-tab-notifs');
    var vWeather = document.getElementById('cp-view-weather');
    var vNotifs  = document.getElementById('cp-view-notifs');

    if (tWeather) tWeather.classList.toggle('active', tab === 'weather');
    if (tNotifs)  tNotifs.classList.toggle('active', tab === 'notifs');
    if (vWeather) vWeather.classList.toggle('active', tab === 'weather');
    if (vNotifs)  vNotifs.classList.toggle('active', tab === 'notifs');
  }

  function selectCity(name, lat, lng) {
    state.city = name;
    state.coords = { lat: lat, lng: lng };
    fetchWeather(name, state.coords);
  }

  function detectLocation() {
    var btn = document.querySelector('button[onclick="CabanaPulse.detectLocation()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Locating...'; }

    if (global.ApaLocation) {
      var act = global.ApaLocation.permission() === 'denied' 
        ? global.ApaLocation.prime({ reason: 'nearby' }) 
        : global.ApaLocation.ensure({ reason: 'nearby' });
        
      act.then(function(fix) {
        if (btn) { btn.disabled = false; btn.innerHTML = '📍 My Location'; }
        
        // Ensure returns the fix directly, but prime returns a boolean (whether granted or not)
        // If prime was used, we need to call current() to get the fix
        if (typeof fix === 'boolean') {
           if (!fix) return; // Still denied or dismissed
           fix = global.ApaLocation.current();
        }
        
        if (fix) {
          global.ApaLocation.label(fix).then(function(cityName) {
            state.city = cityName || 'My Location';
            state.coords = { lat: fix.latitude, lng: fix.longitude };
            fetchWeather(state.city, state.coords);
          });
        }
      });
      return;
    }

    if (!('geolocation' in navigator)) {
      if (btn) { btn.disabled = false; btn.innerHTML = '📍 My Location'; }
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (btn) { btn.disabled = false; btn.innerHTML = '📍 My Location'; }
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      state.city = 'My Location';
      state.coords = { lat: lat, lng: lng };
      fetchWeather('My Location', state.coords);
    }, function (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = '📍 My Location'; }
      console.warn('[pulse] geolocation error:', err.message);
    }, { timeout: 8000 });
  }

  function markAllAsRead() {
    state.notifications.forEach(function (n) { n.read = true; });
    saveNotifs();
    renderDrawerNotifs();
  }

  function handleNotifClick(id) {
    var n = state.notifications.find(function (item) { return item.id === id; });
    if (!n) return;
    n.read = true;
    saveNotifs();
    renderDrawerNotifs();

    if (n.tab) {
      switchTab(n.tab);
    } else if (n.link) {
      var destination = safeInternalLink(n.link);
      if (destination) {
        closeDrawer();
        window.location.href = destination;
      }
    }
  }

  async function enablePush() {
    if (!('Notification' in window)) {
      alert('Web notifications are not supported on this browser.');
      return;
    }

    // iOS Detection: Guide to Add to Home Screen if standalone is required
    var isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIos && !isStandalone) {
      alert('On iPhone / iPad: Tap the Share button (⎋) in Safari and choose "Add to Home Screen" to receive instant lockscreen alerts.');
      return;
    }

    var perm = await Notification.requestPermission();
    if (perm === 'granted') {
      state.pushGranted = true;
      var banner = document.getElementById('cp-push-banner');
      if (banner) banner.style.display = 'none';

      // Subscribe via ApaPush if loaded
      if (global.ApaPush && ApaPush.subscribe) {
        var uid = global.ApaSession && ApaSession.get && ApaSession.get().user?.id;
        ApaPush.subscribe(uid);
      }

      // Add confirmation notif
      state.notifications.unshift({
        id: 'push-active-' + Date.now(),
        kind: 'system',
        title: 'Instant Alerts Activated',
        text: 'You will now receive instant push alerts on your lockscreen for bookings, receipts, and daily weather briefings.',
        time: 'Just now',
        read: false,
      });
      saveNotifs();
      renderDrawerNotifs();
      playAlertChime();
    }
  }

  /* ── GLOBAL HOOK FOR TOPBAR NOTIFICATION BUTTONS ── */
  function bindNotificationButtons() {
    document.addEventListener('click', function (e) {
      var notifBtn = e.target && e.target.closest ? e.target.closest('[data-apa="notif"], .apa-bell, #cbn-nav-notif') : null;
      if (notifBtn) {
        e.preventDefault();
        e.stopPropagation();
        openDrawer('notifs');
      }
    }, true);
  }

  /* ── BOOTSTRAP ── */
  function init() {
    injectStyles();
    state.notifications = loadStoredNotifs();
    recomputeUnread();
    bindNotificationButtons();

    // Weather works without requesting precise location. Users can opt in
    // from the drawer's "My Location" control when it is useful to them.
    fetchWeather(DEFAULT_CITY, DEFAULT_COORDS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  global.CabanaPulse = {
    open: openDrawer,
    close: closeDrawer,
    switchTab: switchTab,
    selectCity: selectCity,
    detectLocation: detectLocation,
    fetchWeather: fetchWeather,
    markAllAsRead: markAllAsRead,
    handleNotifClick: handleNotifClick,
    enablePush: enablePush,
    playChime: playAlertChime,
    state: state,
  };

})(window);
