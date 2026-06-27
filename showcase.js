/* ════════════════════════════════════════════════════════════════
   APATMENTO SHOWCASE v3 — Premium Ad Engine
   Loads LIVE from Supabase. Falls back to demos only if DB empty.
   Page-targeted. GA4 tracked. Impression + click counters in DB.
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

/* Current page slug */
const PAGE = location.pathname.split('/').pop().replace('.html','') || 'index';

/* Never run on funnel pages */
if(['booking-confirm','auth','add-listing'].includes(PAGE)) return;

/* ── GA4 ── */
function ga(event, params){
  window.gtag?.('event', event, params);
}

/* ── Supabase tracking (fire-and-forget) ── */
function dbTrack(fn, id){
  fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY},
    body: JSON.stringify({p_campaign_id: id})
  }).catch(()=>{});
}

function trackImpression(id, format, advertiser){
  ga('ad_impression',{campaign_id:id,ad_format:format,advertiser,page:PAGE});
  dbTrack('increment_ad_impression', id);
}
function trackClick(id, format, advertiser){
  ga('ad_click',{campaign_id:id,ad_format:format,advertiser,page:PAGE});
  dbTrack('increment_ad_click', id);
}

/* ════════════════════════════════════════════════════════════════
   LOAD CAMPAIGNS FROM SUPABASE
   Filters by page_targets (all | specific page name)
════════════════════════════════════════════════════════════════ */
let CAMPS = {video:[], carousel:[], native:[], split:[], ticker:[], sticky:[]};

async function loadFromDB(){
  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/ad_campaigns?active=eq.true&order=priority.desc&limit=50`,
      {headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}}
    );
    if(!r.ok) return false;
    const all = await r.json();
    if(!all?.length) return false;

    /* Filter by page target */
    const paged = all.filter(c => {
      const t = c.page_targets || ['all'];
      return t.includes('all') || t.includes(PAGE);
    });
    if(!paged.length) return false;

    /* Reset */
    CAMPS = {video:[], carousel:[], native:[], split:[], ticker:[], sticky:[]};
    paged.forEach(c => {
      const fmt = c.format;
      if(CAMPS[fmt]) CAMPS[fmt].push(mapCamp(c));
    });
    console.log('[Showcase v3] Loaded from DB:', paged.length, 'campaigns for page:', PAGE);
    return true;
  } catch(e){ return false; }
}

function mapCamp(c){
  return {
    id: c.campaign_id,
    advertiser: c.advertiser,
    tag: c.tag || 'Sponsored',
    headline: c.headline,
    sub: c.sub || '',
    cta: c.cta_text || 'Learn more',
    url: c.cta_url || '#',
    media: c.media_url || '',
    poster: c.poster_url || '',
    grad: c.theme_gradient || 'linear-gradient(135deg,#7B2FF7,#4361FF)',
    accent: c.accent_color || '#B8A4F4',
    price: c.price_display || '',
    icon: c.icon_svg || '<circle cx="12" cy="12" r="10"/>',
  };
}

/* ════════════════════════════════════════════════════════════════
   DEMO CAMPAIGNS (shown only if DB returns nothing)
════════════════════════════════════════════════════════════════ */
const DEMO = {
  video:[
    {id:'d_v1',advertiser:'Apatmento Stays',tag:'Featured',headline:'Find your perfect space in Kenya',sub:'Hand-picked apartments from KES 3,200/night · Hosts keep 100%',cta:'Browse stays',url:'apartments.html',media:'',poster:'',grad:'linear-gradient(135deg,#B8A4F4,#7B2FF7)',accent:'#B8A4F4',price:'',icon:'<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-5a3 3 0 0 1 6 0v5"/>'},
    {id:'d_v2',advertiser:'Apatmento Tours',tag:'Featured',headline:"Days you\'ll never forget",sub:'Maasai Mara · Mt Kenya · Diani Beach · Guides keep 100%',cta:'Explore tours',url:'tours.html',media:'',poster:'',grad:'linear-gradient(135deg,#2DD4BF,#4361FF)',accent:'#5EEAD4',price:'',icon:'<path d="m15 5.5-6-2-6 2.5v13l6-2.5 6 2 6-2.5v-13zM9 3.5v13M15 7.5v13"/>'},
  ],
  carousel:[
    {id:'d_c1',advertiser:'M-Pesa',tag:'Sponsored',headline:'Pay the smart way',sub:'Instant M-Pesa payments on every Apatmento booking',cta:'Learn more',url:'#',media:'',poster:'',grad:'linear-gradient(135deg,#2DD4BF,#5EEAD4)',accent:'#5EEAD4',price:'',icon:'<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>'},
    {id:'d_c2',advertiser:'Jambojet',tag:'Sponsored',headline:'Fly Kenya for less',sub:'Domestic flights from KES 2,800 — no added fees',cta:'Book flights',url:'flights.html',media:'',poster:'',grad:'linear-gradient(135deg,#4361FF,#B8A4F4)',accent:'#4361FF',price:'',icon:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 6.2l-1.9 1.9 7.1 3.4L9.6 14H6l-1 1 3 1 1 3 1-1v-3.6l3.5-1.4 3.4 7.1z"/>'},
    {id:'d_c3',advertiser:'Safaricom',tag:'Sponsored',headline:'Stay connected everywhere',sub:'Kenya\'s best network — fibre-verified Apatmento properties',cta:'See stays',url:'apartments.html',media:'',poster:'',grad:'linear-gradient(135deg,#7B2FF7,#B8A4F4)',accent:'#B8A4F4',price:'',icon:'<path d="M5 13a10 10 0 0 1 14 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>'},
  ],
  native:[
    {id:'d_n1',advertiser:'Sankara Nairobi',tag:'Promoted',headline:'Sankara Nairobi — Westlands',sub:'5-star · Rooftop pool · Sky bar',cta:'View hotel',url:'#',media:'',poster:'',grad:'linear-gradient(135deg,#B8A4F4,#7B2FF7)',accent:'#B8A4F4',price:'From KES 18,000',icon:'<path d="M3 21h18M5 21V7l7-4 7 4v14"/>'},
  ],
  split:[
    {id:'d_s1',advertiser:'Apatmento',tag:'Partner with us',headline:'List your property.\nKeep everything.',sub:'Zero commission. Zero percentage cuts. Guests pay face value plus a small fixed fee — you keep 100% of your rate. Always.',cta:'Start listing free',url:'add-listing.html',media:'',poster:'',grad:'linear-gradient(135deg,#2DD4BF,#4361FF)',accent:'#5EEAD4',price:'',icon:'<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'},
  ],
  ticker:[
    {id:'d_t1',advertiser:'Apatmento',tag:'Live',headline:'🔥 20 stays available in Nairobi tonight · Diani White Sands — 3 rooms left · Maasai Mara Safari — booking now · Karen Ridgeline Villa — new listing · Westlands Skybox — instant book · Kilimani Penthouse — KES 12,500/night',sub:'',cta:'',url:'apartments.html',media:'',poster:'',grad:'linear-gradient(135deg,#0A0A14,#1A1A35)',accent:'#B8A4F4',price:'',icon:''},
  ],
  sticky:[
    {id:'d_st1',advertiser:'Apatmento',tag:'Earn',headline:'Your property could be earning',sub:'Zero commission · Keep 100%',cta:'List for free →',url:'add-listing.html',media:'',poster:'',grad:'linear-gradient(135deg,#2DD4BF,#4361FF)',accent:'#5EEAD4',price:'',icon:'<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'},
  ],
};


/* ════════════════════════════════════════════════════════════════
   BRANDED FALLBACK — shown when a slot has no matching campaign
   "APATMENTO FOR LIFE · TRAVEL IN STYLE"
════════════════════════════════════════════════════════════════ */
const BRAND_FALLBACK = {
  video: {
    id:'brand_video', advertiser:'Apatmento', tag:'✦ Apatmento',
    headline:'Travel in style.\nLive without limits.',
    sub:'Kenya\'s first zero-commission travel super-app. Stays, flights, tours, events, rides, food and more — all in one place.',
    cta:'Explore Apatmento', url:'index.html',
    media:'', poster:'',
    grad:'linear-gradient(135deg,#0A0A14 0%,#1A0A3E 40%,#0E1A4E 100%)',
    accent:'#B8A4F4',
    price:'', icon:'<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-5a3 3 0 0 1 6 0v5"/>',
  },
  carousel: [
    {id:'brand_c1', advertiser:'Apatmento Stays', tag:'✦ Featured', headline:'Find your perfect space', sub:'Apartments from KES 3,200 · Hosts keep 100%', cta:'Browse stays', url:'apartments.html', media:'', poster:'', grad:'linear-gradient(135deg,#B8A4F4,#7B2FF7)', accent:'#B8A4F4', price:'', icon:'<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"/>'},
    {id:'brand_c2', advertiser:'Apatmento Tours', tag:'✦ Featured', headline:"Days you\'ll never forget", sub:'Safaris, treks & experiences across Kenya', cta:'See tours', url:'tours.html', media:'', poster:'', grad:'linear-gradient(135deg,#2DD4BF,#4361FF)', accent:'#5EEAD4', price:'', icon:'<path d="m15 5.5-6-2-6 2.5v13l6-2.5 6 2 6-2.5v-13z"/>'},
    {id:'brand_c3', advertiser:'Apatmento Events', tag:'✦ Featured', headline:'Face-value tickets. Nothing added.', sub:'Concerts, festivals, sports — you pay exactly what the organiser charges', cta:'Get tickets', url:'events.html', media:'', poster:'', grad:'linear-gradient(135deg,#7B2FF7,#B8A4F4)', accent:'#B8A4F4', price:'', icon:'<path d="M3 9a2 2 0 0 0 0 6v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 0 0-6V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/>'},
  ],
  native: {
    id:'brand_n1', advertiser:'Apatmento', tag:'✦ Apatmento',
    headline:'Apatmento — Travel in style', sub:'Zero commission · Hosts keep 100%', cta:'Explore', url:'index.html',
    media:'', poster:'', grad:'linear-gradient(135deg,#B8A4F4,#7B2FF7)', accent:'#B8A4F4', price:'From KES 3,200/night',
    icon:'<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"/>',
  },
  split: {
    id:'brand_s1', advertiser:'Apatmento', tag:'Apatmento for Life',
    headline:'Travel in style.\nLive without limits.',
    sub:'Kenya\'s only zero-commission travel super-app. Stays, flights, safaris, events, rides, food and shopping — all in one place. Hosts keep 100% of every booking.',
    cta:'Discover Apatmento', url:'index.html',
    media:'', poster:'', grad:'linear-gradient(135deg,#0A0A14,#1A0A3E,#0E1A4E)', accent:'#B8A4F4', price:'',
    icon:'<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  },
  ticker: {
    id:'brand_t1', advertiser:'Apatmento', tag:'Live',
    headline:'✦ Apatmento for Life — Travel in Style · Stays from KES 3,200/night · Zero Commission · Hosts keep 100% · Book flights, safaris, events & more · Kenya\'s premium travel super-app · Apatmento for Life — Travel in Style ·',
    sub:'', cta:'', url:'index.html', media:'', poster:'',
    grad:'linear-gradient(135deg,#0A0A14,#1A1A35)', accent:'#B8A4F4', price:'',
    icon:'',
  },
};

/* ════════════════════════════════════════════════════════════════
   CSS — premium, cinematic
════════════════════════════════════════════════════════════════ */
const CSS = `
/* ─ base ─ */
.sc{position:relative;margin:40px 0;}
.sc-label{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#8E90AD;margin-bottom:10px;display:flex;align-items:center;gap:7px;}
.sc-label::before{content:'';width:5px;height:5px;border-radius:50%;background:#8E90AD;opacity:.5;}

/* ─ animate in ─ */
.sc-el{opacity:0;transform:translateY(20px);transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1),box-shadow .4s;}
.sc-el.in{opacity:1;transform:none;} .scv.in{opacity:1;transform:none;}

/* ══ VIDEO HERO (cinematic 21:9) ══ */
.scv{position:relative;border-radius:26px;overflow:hidden;cursor:pointer;aspect-ratio:21/9;box-shadow:0 20px 60px rgba(10,10,20,.15);}
.scv:hover{box-shadow:0 32px 80px rgba(123,47,247,.25);}
.scv-bg{position:absolute;inset:0;}
.scv-bg video{width:100%;height:100%;object-fit:cover;}
.scv-grad{position:absolute;inset:0;opacity:0;transition:opacity .5s;}
.scv:hover .scv-grad{opacity:0;}
.scv-orb1,.scv-orb2{position:absolute;border-radius:50%;filter:blur(60px);opacity:0;}
.scv-orb2{animation-delay:-4.5s;opacity:.3;}
@keyframes scOrb{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(45px,-28px) scale(1.18);}}
.scv-shimmer{position:absolute;inset:0;background:linear-gradient(110deg,transparent 28%,rgba(255,255,255,.08) 48%,transparent 68%);background-size:200% 100%;animation:scShim 6s ease-in-out infinite;}
@keyframes scShim{0%{background-position:200% 0;}100%{background-position:-100% 0;}}
.scv-tag{position:absolute;top:18px;left:20px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.95);background:rgba(0,0,0,.28);backdrop-filter:blur(12px);padding:5px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.18);z-index:3;}
.scv-content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(18px,3vw,44px);z-index:2;background:linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.2) 50%,transparent 75%);}
.scv-adv{font-size:12px;font-weight:600;color:rgba(255,255,255,.75);margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.scv-adv svg{width:15px;height:15px;}
.scv-h{font-family:'Fraunces',serif;font-weight:400;font-size:clamp(22px,3.5vw,42px);color:#fff;line-height:1.05;margin-bottom:8px;max-width:68%;text-shadow:0 2px 24px rgba(0,0,0,.3);}
.scv-sub{font-size:13px;color:rgba(255,255,255,.82);margin-bottom:20px;max-width:58%;}
.scv-cta{display:inline-flex;align-items:center;gap:9px;padding:13px 24px;border-radius:100px;background:#fff;color:#0A0A14;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:all .35s;align-self:flex-start;box-shadow:0 6px 24px rgba(0,0,0,.25);}
.scv:hover .scv-cta{box-shadow:0 10px 32px rgba(0,0,0,.35);transform:translateY(-2px);}
.scv-cta svg{width:15px;height:15px;transition:transform .3s;}
.scv-cta:hover svg{transform:translateX(4px);}
.scv-ctrl{position:absolute;bottom:18px;right:18px;display:flex;gap:8px;z-index:3;}
.scv-btn{width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.32);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;transition:background .2s;}
.scv-btn:hover{background:rgba(0,0,0,.55);}
.scv-btn svg{width:15px;height:15px;}
.scv-bar{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.18);z-index:3;}
.scv-bar-fill{height:100%;background:rgba(255,255,255,.82);width:0%;transition:width .1s linear;}
@media(max-width:600px){.scv{aspect-ratio:4/3;}.scv-h{max-width:94%;font-size:20px;}.scv-sub{max-width:94%;}}

/* ══ CAROUSEL ══ */
.scc{position:relative;border-radius:22px;overflow:hidden;height:168px;box-shadow:0 12px 44px rgba(10,10,20,.12);}
.sc-slide{position:absolute;inset:0;display:flex;align-items:center;padding:0 clamp(18px,4vw,48px);opacity:0;transform:translateX(36px);transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1);pointer-events:none;}
.sc-slide.active{opacity:1;transform:none;pointer-events:all;}
.sc-slide-ico{width:58px;height:58px;border-radius:17px;background:rgba(255,255,255,.18);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;margin-right:22px;}
.sc-slide-ico svg{width:28px;height:28px;}
.sc-slide-body{flex:1;min-width:0;}
.sc-slide-who{font-size:11px;font-weight:600;color:rgba(255,255,255,.7);margin-bottom:3px;letter-spacing:.04em;}
.sc-slide-h{font-family:'Fraunces',serif;font-weight:400;font-size:clamp(16px,2.4vw,23px);color:#fff;line-height:1.1;margin-bottom:3px;}
.sc-slide-sub{font-size:12px;color:rgba(255,255,255,.8);}
.sc-slide-cta{flex-shrink:0;margin-left:20px;padding:12px 22px;border-radius:100px;background:#fff;color:#0A0A14;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:all .25s;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.18);}
.sc-slide-cta:hover{transform:scale(1.05);}
.scc-nav{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.16);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;z-index:3;transition:background .2s;}
.scc-nav:hover{background:rgba(255,255,255,.3);}
.scc-nav svg{width:15px;height:15px;}
.scc-prev{left:12px;}.scc-next{right:12px;}
.scc-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:3;}
.scc-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.35);cursor:pointer;transition:all .35s;}
.scc-dot.active{width:22px;border-radius:3px;background:#fff;}
.scc-prog{position:absolute;bottom:0;left:0;height:3px;background:rgba(255,255,255,.85);width:0%;z-index:3;transition:width .08s linear;}
@media(max-width:600px){.scc{height:auto;min-height:170px;}.sc-slide{flex-direction:column;align-items:flex-start;padding:20px;gap:10px;}.sc-slide-ico{margin-right:0;}.sc-slide-cta{margin-left:0;width:100%;text-align:center;}.scc-nav{display:none;}}

/* ══ NATIVE CARD ══ */
.scn{border-radius:22px;overflow:hidden;background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border:1px solid rgba(10,10,20,.07);cursor:pointer;transition:all .4s cubic-bezier(.22,1,.36,1);}
.scn:hover{transform:translateY(-8px);box-shadow:0 28px 70px rgba(123,47,247,.18);border-color:transparent;}
.scn-img{height:186px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.scn-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;}
.scn-img svg{width:50px;height:50px;color:rgba(255,255,255,.88);position:relative;z-index:1;}
.scn-shine{position:absolute;inset:0;background:linear-gradient(110deg,transparent 32%,rgba(255,255,255,.13) 50%,transparent 68%);background-size:200% 100%;animation:scShim 7s ease-in-out infinite;}
.scn-tag{position:absolute;top:12px;left:12px;padding:5px 12px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(252,252,253,.94);backdrop-filter:blur(8px);color:#4A4C66;z-index:2;}
.scn-body{padding:16px 18px 18px;}
.scn-who{font-size:11px;color:#8E90AD;margin-bottom:4px;}
.scn-h{font-family:'Fraunces',serif;font-weight:500;font-size:17px;color:#0A0A14;margin-bottom:5px;line-height:1.2;}
.scn-sub{font-size:12px;color:#4A4C66;margin-bottom:14px;line-height:1.5;}
.scn-foot{display:flex;align-items:center;justify-content:space-between;}
.scn-price{font-family:'Fraunces',serif;font-weight:500;font-size:16px;color:#0A0A14;}
.scn-cta{padding:9px 18px;border-radius:100px;color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all .22s;}
.scn-cta:hover{filter:brightness(1.1);transform:scale(1.04);}

/* ══ SPLIT BANNER (new premium format) ══ */
.scs{border-radius:26px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;min-height:260px;box-shadow:0 20px 60px rgba(10,10,20,.12);cursor:pointer;transition:box-shadow .4s;}
.scs:hover{box-shadow:0 32px 80px rgba(123,47,247,.22);}
.scs-left{padding:clamp(28px,4vw,52px);display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;}
.scs-left::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 120% 50%,rgba(255,255,255,.12) 0%,transparent 60%);}
.scs-tag{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.8);background:rgba(255,255,255,.15);backdrop-filter:blur(8px);padding:5px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.2);margin-bottom:16px;align-self:flex-start;}
.scs-tag::before{content:'';width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.9);}
.scs-h{font-family:'Fraunces',serif;font-weight:400;font-size:clamp(22px,3vw,36px);color:#fff;line-height:1.1;margin-bottom:12px;white-space:pre-line;}
.scs-sub{font-size:13px;color:rgba(255,255,255,.8);line-height:1.65;margin-bottom:24px;max-width:340px;}
.scs-cta{display:inline-flex;align-items:center;gap:9px;padding:13px 24px;border-radius:100px;background:#fff;color:#0A0A14;font-size:14px;font-weight:700;border:none;cursor:pointer;align-self:flex-start;transition:all .3s;box-shadow:0 6px 20px rgba(0,0,0,.2);}
.scs-cta:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.3);}
.scs-cta svg{width:15px;height:15px;transition:transform .3s;}
.scs:hover .scs-cta svg{transform:translateX(4px);}
.scs-right{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.scs-right-bg{position:absolute;inset:0;opacity:.18;}
.scs-right-bg::before,.scs-right-bg::after{content:'';position:absolute;border-radius:50%;}
.scs-right-bg::before{width:300px;height:300px;background:rgba(255,255,255,.25);top:-20%;right:-15%;filter:blur(30px);}
.scs-right-bg::after{width:200px;height:200px;background:rgba(255,255,255,.15);bottom:-10%;left:10%;filter:blur(25px);}
.scs-stat-grid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:32px;}
.scs-stat{background:rgba(255,255,255,.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:18px;text-align:center;}
.scs-stat-val{font-family:'Fraunces',serif;font-weight:600;font-size:26px;color:#fff;margin-bottom:4px;}
.scs-stat-label{font-size:11px;color:rgba(255,255,255,.7);font-weight:500;}
.scs-adv{position:absolute;bottom:16px;right:16px;font-size:10px;color:rgba(255,255,255,.45);font-weight:600;letter-spacing:.06em;text-transform:uppercase;}
@media(max-width:700px){.scs{grid-template-columns:1fr;}.scs-right{min-height:180px;}.scs-stat-grid{grid-template-columns:repeat(4,1fr);padding:20px;gap:10px;}.scs-stat-val{font-size:18px;}}

/* ══ LIVE TICKER (scrolling marquee) ══ */
.sct{border-radius:14px;overflow:hidden;background:#0A0A14;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;height:48px;}
.sct-badge{flex-shrink:0;padding:0 16px;height:100%;display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#2DD4BF,#4361FF);font-size:11px;font-weight:700;color:#fff;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;}
.sct-badge-dot{width:7px;height:7px;border-radius:50%;background:#fff;opacity:.9;animation:scBlink 1.4s ease-in-out infinite;}
@keyframes scBlink{0%,100%{opacity:.9;}50%{opacity:.2;}}
.sct-track{flex:1;overflow:hidden;position:relative;}
.sct-inner{display:flex;white-space:nowrap;animation:scTick 38s linear infinite;}
.sct-inner:hover{animation-play-state:paused;}
@keyframes scTick{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
.sct-item{display:inline-flex;align-items:center;gap:8px;padding:0 28px;font-size:13px;color:rgba(255,255,255,.8);cursor:pointer;}
.sct-item:hover{color:#fff;}
.sct-item .sct-sep{color:rgba(255,255,255,.2);}

/* ══ STICKY ══ */
.sc-sticky{position:fixed;bottom:24px;right:24px;z-index:9990;width:300px;max-width:calc(100vw - 32px);border-radius:22px;overflow:hidden;box-shadow:0 28px 70px rgba(10,10,20,.25);transform:translateY(160%);transition:transform .65s cubic-bezier(.34,1.56,.64,1);}
.sc-sticky.show{transform:none;}
.sc-sticky-inner{padding:18px;display:flex;align-items:flex-start;gap:12px;position:relative;}
.sc-sticky-ico{width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.2);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;border:1px solid rgba(255,255,255,.2);}
.sc-sticky-ico svg{width:20px;height:20px;}
.sc-sticky-body{flex:1;min-width:0;}
.sc-sticky-who{font-size:10px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:2px;letter-spacing:.05em;text-transform:uppercase;}
.sc-sticky-h{font-family:'Fraunces',serif;font-weight:500;font-size:14px;color:#fff;line-height:1.2;margin-bottom:3px;}
.sc-sticky-sub{font-size:12px;color:rgba(255,255,255,.78);}
.sc-sticky-cta{display:block;margin-top:10px;padding:9px 16px;border-radius:100px;background:#fff;color:#0A0A14;font-size:12px;font-weight:700;text-decoration:none;text-align:center;transition:transform .2s;}
.sc-sticky-cta:hover{transform:scale(1.04);}
.sc-sticky-x{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.18);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;}
.sc-sticky-x svg{width:10px;height:10px;}

/* ── misc ── */
@media(max-width:600px){.sc-sticky{right:10px;bottom:80px;width:calc(100vw - 20px);}}
`;

function injectCSS(){
  if(document.getElementById('sc3-css')) return;
  const s=document.createElement('style');s.id='sc3-css';s.textContent=CSS;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════════
   RENDERERS
════════════════════════════════════════════════════════════════ */

/* ── VIDEO HERO ── */
function renderVideo(slot, c){
  if(!c)return;
  const hasVid = !!c.media;
  slot.innerHTML = `
    <div class="sc-label">Sponsored content</div>
    <div class="scv sc-el" id="scv-${c.id}">
      <div class="scv-bg">
        ${hasVid?`<video muted loop playsinline preload="metadata" poster="${c.poster}"><source src="${c.media}" type="video/mp4"/></video>`:''}
      </div>
      <div class="scv-grad" style="background:${c.grad}"></div>
      <div class="scv-orb1" style="width:240px;height:240px;background:${c.accent};top:-15%;left:5%;"></div>
      <div class="scv-orb2" style="width:190px;height:190px;background:${c.grad.match(/#[0-9A-Fa-f]{6}/g)?.[1]||'#4361FF'};bottom:-8%;right:10%;"></div>
      <div class="scv-shimmer"></div>
      <div class="scv-tag">${c.tag}</div>
      <div class="scv-content">
        <div class="scv-adv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>${c.advertiser}</div>
        <div class="scv-h">${c.headline}</div>
        <div class="scv-sub">${c.sub}</div>
        <button class="scv-cta">${c.cta}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </div>
      ${hasVid?`<div class="scv-ctrl"><button class="scv-btn sc-sound" title="Sound"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg></button></div><div class="scv-bar"><div class="scv-bar-fill"></div></div>`:''}
    </div>`;

  const el = slot.querySelector('.scv');
  const vid = el.querySelector('video');
  const snd = el.querySelector('.sc-sound');
  const bar = el.querySelector('.scv-bar-fill');
  let muted=true;

  el.addEventListener('click', e=>{
    if(e.target.closest('.sc-sound')) return;
    trackClick(c.id,'video',c.advertiser);
    if(c.url&&c.url!=='#') window.location.href=c.url;
  });
  snd?.addEventListener('click', e=>{
    e.stopPropagation(); muted=!muted;
    if(vid) vid.muted=muted;
    snd.innerHTML=muted
      ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
      :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
  });
  if(vid&&bar) vid.addEventListener('timeupdate',()=>{ if(vid.duration) bar.style.width=(vid.currentTime/vid.duration*100)+'%'; });

  observe(el,()=>{
    el.classList.add('in');
    trackImpression(c.id,'video',c.advertiser);
    vid?.play().catch(()=>{});
  },()=>vid?.pause());
}

/* ── CAROUSEL ── */
function renderCarousel(slot, cs){
  if(!cs?.length)return;
  slot.innerHTML=`
    <div class="sc-label">Sponsored content</div>
    <div class="scc sc-el">
      ${cs.map((c,i)=>`
      <div class="sc-slide ${i===0?'active':''}" style="background:${c.grad}" data-id="${c.id}" data-adv="${c.advertiser}">
        <div class="sc-slide-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></div>
        <div class="sc-slide-body">
          <div class="sc-slide-who">${c.advertiser} · Sponsored</div>
          <div class="sc-slide-h">${c.headline}</div>
          <div class="sc-slide-sub">${c.sub}</div>
        </div>
        <button class="sc-slide-cta" data-url="${c.url}">${c.cta}</button>
      </div>`).join('')}
      <button class="scc-nav scc-prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button class="scc-nav scc-next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
      <div class="scc-dots">${cs.map((_,i)=>`<div class="scc-dot ${i===0?'active':''}" data-i="${i}"></div>`).join('')}</div>
      <div class="scc-prog"></div>
    </div>`;

  const wrap=slot.querySelector('.scc');
  const slides=[...wrap.querySelectorAll('.sc-slide')];
  const dots=[...wrap.querySelectorAll('.scc-dot')];
  const prog=wrap.querySelector('.scc-prog');
  let cur=0,paused=false,elapsed=0,last=0,raf;
  const DUR=5500;

  function go(i){
    slides[cur].classList.remove('active');dots[cur].classList.remove('active');
    cur=(i+slides.length)%slides.length;
    slides[cur].classList.add('active');dots[cur].classList.add('active');
    elapsed=0;prog.style.width='0%';
    trackImpression(cs[cur].id,'carousel',cs[cur].advertiser);
  }
  function tick(ts){
    if(!paused){elapsed+=ts-last;prog.style.width=Math.min(elapsed/DUR*100,100)+'%';if(elapsed>=DUR)go(cur+1);}
    last=ts;raf=requestAnimationFrame(tick);
  }

  wrap.querySelectorAll('.sc-slide-cta').forEach((b,i)=>b.addEventListener('click',e=>{e.stopPropagation();trackClick(cs[i].id,'carousel',cs[i].advertiser);const u=b.dataset.url;if(u&&u!=='#')window.location.href=u;}));
  dots.forEach(d=>d.addEventListener('click',()=>go(+d.dataset.i)));
  wrap.querySelector('.scc-prev').addEventListener('click',()=>go(cur-1));
  wrap.querySelector('.scc-next').addEventListener('click',()=>go(cur+1));
  wrap.addEventListener('mouseenter',()=>paused=true);
  wrap.addEventListener('mouseleave',()=>{paused=false;last=performance.now();});
  let sx=0;
  wrap.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});
  wrap.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50)go(cur+(d<0?1:-1));},{passive:true});

  observe(wrap,()=>{
    wrap.classList.add('in');last=performance.now();raf=requestAnimationFrame(tick);
    trackImpression(cs[0].id,'carousel',cs[0].advertiser);
  },()=>cancelAnimationFrame(raf));
}

/* ── NATIVE CARD ── */
function renderNative(slot, c){
  if(!c)return;
  slot.innerHTML=`
    <div class="scn sc-el">
      <div class="scn-img" style="background:${c.grad}">
        ${c.media?`<img src="${c.media}" alt="${c.advertiser}" loading="lazy"/>`:''}
        <div class="scn-shine"></div>
        <div class="scn-tag">${c.tag}</div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
      </div>
      <div class="scn-body">
        <div class="scn-who">${c.advertiser}</div>
        <div class="scn-h">${c.headline}</div>
        <div class="scn-sub">${c.sub}</div>
        <div class="scn-foot">
          <div class="scn-price">${c.price}</div>
          <button class="scn-cta" style="background:${c.grad}">${c.cta}</button>
        </div>
      </div>
    </div>`;
  const el=slot.querySelector('.scn');
  el.addEventListener('click',()=>{trackClick(c.id,'native',c.advertiser);if(c.url&&c.url!=='#')window.location.href=c.url;});
  observe(el,()=>{el.classList.add('in');trackImpression(c.id,'native',c.advertiser);});
}

/* ── SPLIT BANNER ── */
function renderSplit(slot, c){
  if(!c)return;
  slot.innerHTML=`
    <div class="sc-label">Sponsored content</div>
    <div class="scs sc-el" style="background:${c.grad}">
      <div class="scs-left">
        <div class="scs-tag">${c.tag}</div>
        <div class="scs-h">${c.headline}</div>
        <div class="scs-sub">${c.sub}</div>
        <button class="scs-cta">
          ${c.cta}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>
      <div class="scs-right">
        <div class="scs-right-bg"></div>
        <div class="scs-stat-grid">
          <div class="scs-stat"><div class="scs-stat-val">0%</div><div class="scs-stat-label">Commission taken</div></div>
          <div class="scs-stat"><div class="scs-stat-val">100%</div><div class="scs-stat-label">Earnings kept</div></div>
          <div class="scs-stat"><div class="scs-stat-val">Free</div><div class="scs-stat-label">To list</div></div>
          <div class="scs-stat"><div class="scs-stat-val">24/7</div><div class="scs-stat-label">Support</div></div>
        </div>
        <div class="scs-adv">${c.advertiser}</div>
      </div>
    </div>`;
  const el=slot.querySelector('.scs');
  el.querySelector('.scs-cta').addEventListener('click',e=>{e.stopPropagation();trackClick(c.id,'split',c.advertiser);if(c.url&&c.url!=='#')window.location.href=c.url;});
  el.addEventListener('click',()=>{trackClick(c.id,'split',c.advertiser);if(c.url&&c.url!=='#')window.location.href=c.url;});
  observe(el,()=>{el.classList.add('in');trackImpression(c.id,'split',c.advertiser);});
}

/* ── LIVE TICKER ── */
function renderTicker(slot, c){
  if(!c)return;
  const items=c.headline.split('·').filter(Boolean).map(t=>t.trim());
  const html=items.map(t=>`<span class="sct-item">${t}<span class="sct-sep">·</span></span>`).join('');
  slot.innerHTML=`
    <div class="sct sc-el">
      <div class="sct-badge">
        <div class="sct-badge-dot"></div>
        Live
      </div>
      <div class="sct-track">
        <div class="sct-inner">${html}${html}</div>
      </div>
    </div>`;
  const el=slot.querySelector('.sct');
  el.addEventListener('click',()=>{if(c.url&&c.url!=='#')window.location.href=c.url;});
  observe(el,()=>{el.classList.add('in');trackImpression(c.id,'ticker',c.advertiser);});
}

/* ── STICKY ── */
function renderSticky(c){
  if(!c||sessionStorage.getItem('sc_sx'))return;
  const el=document.createElement('div');
  el.className='sc-sticky';el.style.background=c.grad;
  el.innerHTML=`<div class="sc-sticky-inner">
    <div class="sc-sticky-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></div>
    <div class="sc-sticky-body">
      <div class="sc-sticky-who">${c.advertiser}</div>
      <div class="sc-sticky-h">${c.headline}</div>
      <div class="sc-sticky-sub">${c.sub}</div>
      <a class="sc-sticky-cta" href="${c.url}">${c.cta}</a>
    </div>
    <button class="sc-sticky-x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>`;
  document.body.appendChild(el);
  setTimeout(()=>{el.classList.add('show');trackImpression(c.id,'sticky',c.advertiser);},16000);
  el.querySelector('.sc-sticky-x').addEventListener('click',()=>{el.classList.remove('show');sessionStorage.setItem('sc_sx','1');setTimeout(()=>el.remove(),700);});
  el.querySelector('.sc-sticky-cta').addEventListener('click',()=>trackClick(c.id,'sticky',c.advertiser));
}

/* ── Intersection observer ── */
function observe(el,onIn,onOut){
  new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)onIn?.();else onOut?.();}),{threshold:.1,rootMargin:"0px 0px -50px 0px"}).observe(el);
}

/* ── round-robin picker ── */
let _idx={};
function pick(fmt,pool){
  if(!pool?.length){
    // Return branded fallback instead of null
    if(fmt==='video')    return BRAND_FALLBACK.video;
    if(fmt==='native')   return BRAND_FALLBACK.native;
    if(fmt==='split')    return BRAND_FALLBACK.split;
    if(fmt==='ticker')   return BRAND_FALLBACK.ticker;
    return null;
  }
  _idx[fmt]=((_idx[fmt]||0)+1)%pool.length;
  return pool[_idx[fmt]];
}

/* ════════════════════════════════════════════════════════════════
   INIT — scan slots, load DB, render
════════════════════════════════════════════════════════════════ */
async function init(){
  injectCSS();
  const dbLoaded = await loadFromDB();
  const pools = dbLoaded ? CAMPS : DEMO;

  document.querySelectorAll('[data-showcase]').forEach(slot=>{
    slot.style.position='relative';
    const fmt=slot.getAttribute('data-showcase');
    if(fmt==='video')    renderVideo(slot, pick('video', pools.video));
    if(fmt==='carousel') renderCarousel(slot, pools.carousel?.length ? pools.carousel : BRAND_FALLBACK.carousel);
    if(fmt==='native')   renderNative(slot, pick('native', pools.native));
    if(fmt==='split')    renderSplit(slot, pick('split', pools.split));
    if(fmt==='ticker')   renderTicker(slot, pick('ticker', pools.ticker));
  });

  /* Sticky on content pages */
  const stickyOn=['','index','apartments','my-bookings','dashboard','tours','events'];
  if(stickyOn.includes(PAGE)){
    const sc=pick('sticky',pools.sticky);
    if(sc) renderSticky(sc);
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

window.ApatmentoShowcase={reload:init};
})();
