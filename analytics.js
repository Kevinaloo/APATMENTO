/* ═══════════════════════════════════════════════════════════════════
   APATMENTO INTELLIGENCE ENGINE v1.0
   First-party behavioral analytics + real-time ad personalization
   Privacy-first: no PII beyond what user voluntarily provides,
   no third-party tracking, all data on our own Supabase instance.
═══════════════════════════════════════════════════════════════════ */

(function(){
'use strict';

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

/* ─── Session & Identity ─────────────────────────────────────────── */
function getSessionId(){
  let s = sessionStorage.getItem('apt_sid');
  if(!s){ s = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('apt_sid',s); }
  return s;
}
function getAnonId(){
  let a = localStorage.getItem('apt_aid');
  if(!a){ a = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('apt_aid',a); }
  return a;
}
function getDeviceType(){
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop';
}
function getPage(){
  return location.pathname.split('/').pop().replace('.html','') || 'index';
}

const SESSION_ID = getSessionId();
const ANON_ID    = getAnonId();
let   USER_ID    = null;

// Try to get authenticated user ID
if(typeof supabase !== 'undefined' && supabase.createClient){
  try{
    const sb = supabase.createClient(SUPA_URL, SUPA_KEY);
    sb.auth.getSession().then(({data:{session}})=>{
      if(session?.user?.id) USER_ID = session.user.id;
    }).catch(()=>{});
  }catch(e){}
}

/* ─── Event Queue (batch sends to reduce network calls) ─────────── */
const QUEUE = [];
let   FLUSH_TIMER = null;

function track(eventType, properties={}, city=null){
  const event = {
    session_id:  SESSION_ID,
    anon_id:     ANON_ID,
    user_id:     USER_ID || null,
    event_type:  eventType,
    page:        getPage(),
    properties:  {
      ...properties,
      url: location.pathname + location.search,
      ts:  Date.now(),
    },
    device_type: getDeviceType(),
    referrer:    document.referrer ? new URL(document.referrer).hostname : null,
    city:        city || window.__apt_city || null,
  };
  QUEUE.push(event);
  clearTimeout(FLUSH_TIMER);
  FLUSH_TIMER = setTimeout(flush, 2000); // batch every 2s
}

async function flush(){
  if(!QUEUE.length) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  try {
    await fetch(`${SUPA_URL}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(batch),
    });
    // After sending events, recompute segments
    setTimeout(computeSegments, 1000);
  } catch(e){}
}

// Flush before page unload
window.addEventListener('beforeunload', flush);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) flush(); });

/* ─── Auto Tracking ─────────────────────────────────────────────── */

// Page view
track('page_view', { title: document.title, path: location.pathname });

// Service clicks (on dashboard)
document.addEventListener('click', e => {
  const svc = e.target.closest('[data-svc],[onclick*="navigateToService"]');
  if(svc){
    const name = svc.dataset.svc || (svc.getAttribute('onclick')||'').match(/navigateToService\('(\w+)'\)/)?.[1];
    if(name) track('service_click', { service: name });
  }

  // Card views in any listing grid
  const card = e.target.closest('.card,.flight-card,.tour-card,.event-card');
  if(card){
    track('card_view', {
      title:    card.querySelector('.card-title,.card-h')?.textContent?.trim(),
      price:    card.querySelector('.price-val,.card-price,.price-big')?.textContent?.trim(),
      location: card.querySelector('.card-location,.card-loc')?.textContent?.trim(),
    });
  }

  // Filter chip usage
  const chip = e.target.closest('.fchip,.chip[data-f]');
  if(chip) track('filter_used', { filter: chip.textContent?.trim() || chip.dataset.f });

  // Drawer opens (detail view)
  if(e.target.closest('[onclick*="openDrawer"],[onclick*="openDetail"]'))
    track('drawer_open', {});

  // Booking starts
  if(e.target.closest('[onclick*="bookStay"],[onclick*="book"],[href*="booking"]'))
    track('booking_start', {});

  // Search actions
  if(e.target.closest('.sb-btn,[onclick*="applySearch"],[onclick*="filterFlights"]'))
    track('search', { context: getPage() });
});

// Scroll depth tracking
let maxScroll = 0;
window.addEventListener('scroll', ()=>{
  const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  if(pct > maxScroll + 20){ maxScroll = pct; track('scroll_depth', { pct }); }
}, { passive: true });

// Time on page
const PAGE_START = Date.now();
window.addEventListener('beforeunload', ()=>{
  const secs = Math.round((Date.now() - PAGE_START) / 1000);
  if(secs > 3) track('time_on_page', { seconds: secs });
  flush();
});

/* ─── Segment Computation ───────────────────────────────────────── */
// The intelligence engine. Turns behavioral signals into ad-relevant segments.
// Runs client-side first for instant ad personalization, 
// then writes to Supabase for cross-session persistence.

const SEGMENT_RULES = {
  young_adult: {
    description: 'Young professional, 18-30, social lifestyle',
    signals: ['events_click','rides_click','food_click','nightlife_search','roommates_click','shopping_click'],
    adCategories: ['nightclub','alcohol','energy_drink','dating_app','gaming','streetwear','ride_sharing','concerts'],
    weight: 0
  },
  family: {
    description: 'Family traveler, 3+ guests, child-friendly priorities',
    signals: ['guests_3plus','pool_filter','kitchen_filter','cottage_view','large_apartment_view'],
    adCategories: ['family_mall','kids_activities','family_restaurant','school_supplies','family_insurance','minivan_hire'],
    weight: 0
  },
  couple: {
    description: 'Couple travel, 2 guests, romantic/leisure',
    signals: ['guests_2','diani_search','mombasa_search','beach_view','spa_search','romantic_listing_view'],
    adCategories: ['movie_streaming','restaurant','spa','jewelry','travel_insurance','wine','couples_retreat'],
    weight: 0
  },
  business: {
    description: 'Business traveler, weekday, CBD locations',
    signals: ['cbd_search','westlands_search','midweek_booking','flights_click','carhire_click','airport_transfer_view'],
    adCategories: ['co_working','business_bank','airport_transfer','corporate_hotel','courier','b2b_saas'],
    weight: 0
  },
  student: {
    description: 'Student, budget-conscious, student areas',
    signals: ['student_filter','budget_room_view','parklands_search','thika_rd_search','low_price_filter'],
    adCategories: ['student_bank','pizza','streaming_student','textbook_app','laptop_deals','student_insurance'],
    weight: 0
  },
  premium: {
    description: 'High-budget traveler, luxury properties',
    signals: ['karen_search','lavington_search','high_price_view','penthouse_view','premium_filter','international_flights'],
    adCategories: ['luxury_car','premium_bank','investment_platform','fine_dining','boutique_hotel','watches'],
    weight: 0
  },
  adventurer: {
    description: 'Experience seeker, tours & outdoor activities',
    signals: ['tours_click','events_click','safari_view','hiking_filter','maasai_mara_search','naivasha_search'],
    adCategories: ['safari_company','outdoor_gear','adventure_insurance','wildlife_app','4x4_rental','national_parks'],
    weight: 0
  },
  foodie: {
    description: 'Food enthusiast, restaurant & dining focused',
    signals: ['food_click','restaurant_view','delivery_search','food_filter','catering_view'],
    adCategories: ['restaurant','food_delivery','cooking_class','grocery_delivery','kitchen_supplies','food_magazine'],
    weight: 0
  }
};

function getBehaviorHistory(){
  try {
    const raw = localStorage.getItem('apt_bhx');
    return raw ? JSON.parse(raw) : { signals:[], events:[], searches:[], lastUpdated:0 };
  } catch(e){ return { signals:[], events:[], searches:[], lastUpdated:0 }; }
}
function saveBehaviorHistory(bh){
  try { localStorage.setItem('apt_bhx', JSON.stringify(bh)); } catch(e){}
}

function addBehaviorSignal(signal){
  const bh = getBehaviorHistory();
  bh.signals.push({ s: signal, t: Date.now() });
  // Keep last 200 signals
  if(bh.signals.length > 200) bh.signals = bh.signals.slice(-200);
  bh.lastUpdated = Date.now();
  saveBehaviorHistory(bh);
}

// Map DOM events to behavioral signals
document.addEventListener('click', e => {
  // Service clicks → signals
  const svc = e.target.closest('[data-svc]');
  if(svc){
    const s = svc.dataset.svc;
    if(s) addBehaviorSignal(s + '_click');
  }
  // Location searches
  const cityEl = document.getElementById('f-city') || document.getElementById('field-city');
  if(cityEl){
    const city = cityEl.textContent?.toLowerCase() || '';
    if(city) window.__apt_city = city;
    if(city.includes('karen') || city.includes('lavington')) addBehaviorSignal('karen_search');
    if(city.includes('diani') || city.includes('mombasa')) addBehaviorSignal('diani_search');
    if(city.includes('westlands') || city.includes('cbd')) addBehaviorSignal('westlands_search');
    if(city.includes('parklands')) addBehaviorSignal('parklands_search');
    if(city.includes('maasai') || city.includes('naivasha')) addBehaviorSignal('naivasha_search');
  }
});

function computeSegments(){
  const bh = getBehaviorHistory();
  const signalCounts = {};
  bh.signals.forEach(({s,t}) => {
    // Recency weighting: signals in last 7 days count double
    const recencyMultiplier = (Date.now() - t) < 7 * 86400 * 1000 ? 2 : 1;
    signalCounts[s] = (signalCounts[s] || 0) + recencyMultiplier;
  });

  const scores = {};
  Object.entries(SEGMENT_RULES).forEach(([seg, rule]) => {
    let score = 0;
    rule.signals.forEach(signal => { score += signalCounts[signal] || 0; });
    scores[seg] = Math.min(100, score * 10); // normalize to 0–100
  });

  // Get top segments (confidence > 20)
  const activeSegments = Object.entries(scores)
    .filter(([,s]) => s > 20)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 3)
    .map(([name, confidence]) => ({
      segment: name,
      confidence,
      adCategories: SEGMENT_RULES[name].adCategories
    }));

  // Default segment if nothing inferred yet
  if(!activeSegments.length) activeSegments.push({ segment:'general', confidence:50, adCategories:['travel','lifestyle','banking'] });

  // Store segments for showcase.js to use
  try {
    localStorage.setItem('apt_segments', JSON.stringify(activeSegments));
    localStorage.setItem('apt_segments_ts', Date.now());
  } catch(e){}

  // Persist to Supabase (async, non-blocking)
  persistSegments(activeSegments);

  return activeSegments;
}

async function persistSegments(segments){
  if(!segments.length) return;
  const payload = segments.map(s => ({
    anon_id:       ANON_ID,
    user_id:       USER_ID || null,
    segment:       s.segment,
    confidence:    s.confidence,
    ad_categories: s.adCategories,
    last_computed: new Date().toISOString(),
  }));
  try {
    await fetch(`${SUPA_URL}/rest/v1/user_segments`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch(e){}
}

/* ─── Public API ─────────────────────────────────────────────────── */
window.AptAnalytics = {
  track,
  addSignal: addBehaviorSignal,
  getSegments: () => {
    try {
      const raw = localStorage.getItem('apt_segments');
      return raw ? JSON.parse(raw) : [{ segment:'general', confidence:50, adCategories:['travel','lifestyle'] }];
    } catch(e){ return [{ segment:'general', confidence:50, adCategories:['travel','lifestyle'] }]; }
  },
  getTopSegment: () => {
    const segs = window.AptAnalytics.getSegments();
    return segs[0] || { segment:'general', confidence:50, adCategories:['travel','lifestyle'] };
  },
  getAdCategories: () => {
    return window.AptAnalytics.getSegments().flatMap(s => s.adCategories);
  },
  refresh: computeSegments,
};

// Initial segment computation
setTimeout(computeSegments, 1500);

})();
