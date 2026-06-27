/* ════════════════════════════════════════════════════════════════
   APATMENTO SHOWCASE v2 — Premium Ad System
   - Google Analytics 4 tracking (impressions + clicks)
   - Loads live campaigns from Supabase (manage via dashboard)
   - Real video autoplay with sound toggle
   - Supabase Storage for all media (videos, banners, images)
   - Self-disables on booking funnel pages

   DROP ON ANY PAGE: <script src="/showcase.js" defer></script>
   PLACE SLOTS:      <div data-showcase="video|carousel|native"></div>

   UPLOAD MEDIA TO:
   ┌─────────────────────────────────────────────────────────┐
   │  Supabase → Storage → ads bucket                       │
   │  Folder structure:                                      │
   │    ads/videos/your-campaign.mp4                         │
   │    ads/banners/your-campaign.jpg                        │
   │    ads/logos/advertiser-logo.png                        │
   │  Then copy the public URL into your campaign record     │
   │  in the ad_campaigns table (or via the admin UI)       │
   └─────────────────────────────────────────────────────────│
════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

const SUPABASE_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
// Replace with your real GA4 Measurement ID when you set up Google Analytics
const GA4_ID = 'G-XXXXXXXXXX';

/* ── Don't run on booking funnel ── */
const FUNNEL = ['booking-confirm.html','auth.html','add-listing.html'];
const currentPage = location.pathname.split('/').pop() || 'index.html';
if (FUNNEL.includes(currentPage)) return;

/* ════════════════════════════════════════════════════════════════
   FALLBACK CAMPAIGNS (used when Supabase is unavailable)
   These are your demo/default ads — real ones load from DB
════════════════════════════════════════════════════════════════ */
const FALLBACK = {
  video: [
    { id:'cam_safari_co', advertiser:'Savannah Safaris', tag:'Sponsored',
      headline:'Witness the Great Migration',
      sub:'Maasai Mara · Premium tented camps · 30% off June bookings',
      cta_text:'Explore packages', cta_url:'#',
      media_url:'', poster_url:'',
      theme_gradient:'linear-gradient(135deg,#2DD4BF,#4361FF)',
      accent_color:'#5EEAD4',
      icon_svg:'<path d="m15 5.5-6-2-6 2.5v13l6-2.5 6 2 6-2.5v-13zM9 3.5v13M15 7.5v13"/>',
    },
    { id:'cam_coast_resort', advertiser:'Diani White Sands', tag:'Sponsored',
      headline:'The Indian Ocean is calling',
      sub:'Beachfront suites from KES 8,500/night · Kids stay free',
      cta_text:'Book your escape', cta_url:'#',
      media_url:'', poster_url:'',
      theme_gradient:'linear-gradient(135deg,#FFB59E,#FF6B2C)',
      accent_color:'#FFB59E',
      icon_svg:'<path d="M4 16h16a8 8 0 0 0-16 0z"/><path d="M2 19h20"/><path d="M12 8V5M10 5h4"/>',
    },
  ],
  carousel: [
    { id:'cam_mpesa', advertiser:'M-Pesa', headline:'Pay the smart way',
      sub:'Instant, secure payments on every Apatmento booking',
      cta_text:'Learn more', cta_url:'#',
      theme_gradient:'linear-gradient(135deg,#2DD4BF,#5EEAD4)',
      icon_svg:'<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    },
    { id:'cam_airline', advertiser:'Jambojet', headline:'Fly across Kenya for less',
      sub:'Domestic flights from KES 2,800 · Book in seconds',
      cta_text:'Find flights', cta_url:'flights.html',
      theme_gradient:'linear-gradient(135deg,#4361FF,#B8A4F4)',
      icon_svg:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 6.2l-1.9 1.9 7.1 3.4L9.6 14H6l-1 1 3 1 1 3 1-1v-3.6l3.5-1.4 3.4 7.1z"/>',
    },
    { id:'cam_telco', advertiser:'Safaricom Home', headline:'Work-from-stay ready',
      sub:'Fibre-verified properties across Kenya',
      cta_text:'See connected stays', cta_url:'apartments.html',
      theme_gradient:'linear-gradient(135deg,#7B2FF7,#B8A4F4)',
      icon_svg:'<path d="M5 13a10 10 0 0 1 14 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
    },
  ],
  native: [
    { id:'cam_native_hotel', advertiser:'Sankara Nairobi', tag:'Promoted',
      headline:'Sankara Nairobi — Westlands',
      sub:'5-star luxury · Rooftop pool · Spa',
      cta_text:'View hotel', cta_url:'#', price_display:'From KES 18,000',
      theme_gradient:'linear-gradient(135deg,#B8A4F4,#7B2FF7)',
      icon_svg:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/>',
    },
  ],
  sticky: [
    { id:'cam_sticky_promo', advertiser:'Apatmento', headline:'List your property free',
      sub:'Keep 100% of every booking',
      cta_text:'Start earning', cta_url:'add-listing.html',
      theme_gradient:'linear-gradient(135deg,#2DD4BF,#4361FF)',
      icon_svg:'<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    },
  ],
};

let CAMPAIGNS = JSON.parse(JSON.stringify(FALLBACK));

/* ════════════════════════════════════════════════════════════════
   GOOGLE ANALYTICS 4 — impression & click tracking
════════════════════════════════════════════════════════════════ */
function initGA4() {
  if (document.getElementById('ga4-script') || window.gtag) return;
  if (GA4_ID === 'G-XXXXXXXXXX') return; // skip if not configured
  const s = document.createElement('script');
  s.id = 'ga4-script';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { page_path: location.pathname });
}

function trackImpression(campaignId, format, advertiser) {
  // GA4 event
  window.gtag?.('event', 'ad_impression', {
    campaign_id: campaignId,
    ad_format: format,
    advertiser: advertiser || '',
    page_location: location.pathname,
  });
  // Supabase counter (fire-and-forget, don't await)
  fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_ad_impression`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_campaign_id: campaignId }),
  }).catch(() => {});
  console.log(`[Showcase] impression • ${campaignId} • ${format}`);
}

function trackClick(campaignId, format, advertiser) {
  // GA4 event
  window.gtag?.('event', 'ad_click', {
    campaign_id: campaignId,
    ad_format: format,
    advertiser: advertiser || '',
    page_location: location.pathname,
  });
  // Supabase counter
  fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_ad_click`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_campaign_id: campaignId }),
  }).catch(() => {});
  console.log(`[Showcase] click • ${campaignId} • ${format}`);
}

/* ════════════════════════════════════════════════════════════════
   SUPABASE CAMPAIGN LOADER
   Loads live campaigns from your ad_campaigns table
   Falls back to FALLBACK if unavailable
════════════════════════════════════════════════════════════════ */
async function loadCampaigns() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ad_campaigns?active=eq.true&order=priority.desc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.length) return;
    // Rebuild CAMPAIGNS from DB
    const built = { video:[], carousel:[], native:[], sticky:[] };
    data.forEach(c => {
      const fmt = c.format;
      if (!built[fmt]) return;
      built[fmt].push({
        id: c.campaign_id,
        advertiser: c.advertiser,
        tag: c.tag || 'Sponsored',
        headline: c.headline,
        sub: c.sub,
        cta_text: c.cta_text || 'Learn more',
        cta_url: c.cta_url || '#',
        price_display: c.price_display,
        media_url: c.media_url || '',   // video .mp4 or banner .jpg
        poster_url: c.poster_url || '', // video thumbnail
        theme_gradient: c.theme_gradient || 'linear-gradient(135deg,#B8A4F4,#7B2FF7)',
        accent_color: c.accent_color || '#B8A4F4',
        icon_svg: c.icon_svg || '<circle cx="12" cy="12" r="10"/>',
      });
    });
    // Only override formats that have DB campaigns
    Object.keys(built).forEach(fmt => { if (built[fmt].length) CAMPAIGNS[fmt] = built[fmt]; });
    console.log('[Showcase] campaigns loaded from Supabase:', data.length);
  } catch(e) {
    console.log('[Showcase] using fallback campaigns');
  }
}

/* ════════════════════════════════════════════════════════════════
   CSS — injected once
════════════════════════════════════════════════════════════════ */
const CSS = `
.sc-wrap{position:relative;margin:32px 0;font-family:var(--font-body,'General Sans',system-ui,sans-serif);}
.sc-label{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint,#8E90AD);margin-bottom:10px;}
.sc-label::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--ink-faint,#8E90AD);opacity:.5;}

/* VIDEO HERO */
.sc-video{position:relative;border-radius:24px;overflow:hidden;cursor:pointer;aspect-ratio:21/9;box-shadow:0 16px 48px rgba(10,10,20,.12);opacity:0;transform:translateY(30px) scale(.98);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1),box-shadow .4s;}
.sc-video.in{opacity:1;transform:none;}
.sc-video:hover{box-shadow:0 28px 70px rgba(123,47,247,.22);}
.sc-video-bg{position:absolute;inset:0;background:#000;}
.sc-video-bg video{width:100%;height:100%;object-fit:cover;}
.sc-video-grad{position:absolute;inset:0;transition:opacity .5s;}
.sc-video:hover .sc-video-grad{opacity:.85;}
.sc-video-shimmer{position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.1) 50%,transparent 70%);background-size:200% 100%;animation:scShimmer 5s ease-in-out infinite;}
@keyframes scShimmer{0%{background-position:200% 0;}100%{background-position:-100% 0;}}
.sc-orb{position:absolute;border-radius:50%;filter:blur(50px);opacity:.45;animation:scFloat 9s ease-in-out infinite;}
@keyframes scFloat{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(40px,-25px) scale(1.15);}}
.sc-video-tag{position:absolute;top:16px;left:18px;display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.9);background:rgba(0,0,0,.25);backdrop-filter:blur(10px);padding:5px 11px;border-radius:100px;z-index:3;border:1px solid rgba(255,255,255,.15);}
.sc-video-content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(20px,3vw,40px);z-index:2;background:linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 55%);}
.sc-video-advertiser{font-size:12px;font-weight:600;color:rgba(255,255,255,.8);margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.sc-video-advertiser svg{width:16px;height:16px;}
.sc-video-headline{font-family:var(--font-display,'Fraunces',serif);font-weight:500;font-size:clamp(20px,3.2vw,38px);color:#fff;line-height:1.05;margin-bottom:8px;max-width:65%;text-shadow:0 2px 20px rgba(0,0,0,.3);}
.sc-video-sub{font-size:13px;color:rgba(255,255,255,.85);margin-bottom:18px;max-width:60%;}
.sc-video-cta{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:12px 22px;border-radius:100px;background:#fff;color:#0A0A14;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:all .35s;box-shadow:0 4px 20px rgba(0,0,0,.2);transform:translateY(6px);opacity:.9;}
.sc-video:hover .sc-video-cta{transform:translateY(0);opacity:1;box-shadow:0 8px 28px rgba(0,0,0,.3);}
.sc-video-cta svg{width:15px;height:15px;transition:transform .3s;}
.sc-video:hover .sc-video-cta svg{transform:translateX(4px);}
.sc-video-controls{position:absolute;bottom:16px;right:18px;display:flex;gap:8px;z-index:3;}
.sc-video-btn{width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.3);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;transition:background .2s;}
.sc-video-btn:hover{background:rgba(0,0,0,.5);}
.sc-video-btn svg{width:16px;height:16px;}
.sc-video-progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.2);z-index:3;}
.sc-video-progress-bar{height:100%;background:rgba(255,255,255,.8);width:0%;transition:width .1s linear;}

/* CAROUSEL */
.sc-carousel{position:relative;border-radius:22px;overflow:hidden;height:160px;box-shadow:0 12px 40px rgba(10,10,20,.1);opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s;}
.sc-carousel.in{opacity:1;transform:none;}
.sc-slide{position:absolute;inset:0;display:flex;align-items:center;padding:0 clamp(20px,4vw,44px);opacity:0;transform:translateX(40px);transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1);pointer-events:none;}
.sc-slide.active{opacity:1;transform:none;pointer-events:all;}
.sc-slide.exit{opacity:0;transform:translateX(-40px);}
.sc-slide-ico{width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,.18);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;margin-right:22px;border:1px solid rgba(255,255,255,.2);}
.sc-slide-ico svg{width:28px;height:28px;}
.sc-slide-body{flex:1;min-width:0;}
.sc-slide-who{font-size:11px;font-weight:600;color:rgba(255,255,255,.7);margin-bottom:3px;letter-spacing:.04em;}
.sc-slide-headline{font-family:var(--font-display,'Fraunces',serif);font-weight:500;font-size:clamp(16px,2.2vw,22px);color:#fff;line-height:1.1;margin-bottom:3px;}
.sc-slide-sub{font-size:12px;color:rgba(255,255,255,.82);}
.sc-slide-cta{flex-shrink:0;margin-left:20px;padding:11px 22px;border-radius:100px;background:#fff;color:#0A0A14;font-size:13px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;transition:all .25s;box-shadow:0 4px 16px rgba(0,0,0,.15);}
.sc-slide-cta:hover{transform:scale(1.04);box-shadow:0 6px 20px rgba(0,0,0,.2);}
.sc-nav{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;z-index:3;transition:background .2s;}
.sc-nav:hover{background:rgba(255,255,255,.28);}
.sc-nav svg{width:16px;height:16px;}
.sc-prev{left:12px;}
.sc-next{right:12px;}
.sc-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:3;}
.sc-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.35);cursor:pointer;transition:all .35s;}
.sc-dot.active{width:22px;border-radius:3px;background:#fff;}
.sc-progress{position:absolute;bottom:0;left:0;height:3px;background:rgba(255,255,255,.85);width:0;z-index:3;transition:width .08s linear;}

/* NATIVE CARD */
.sc-native{border-radius:20px;overflow:hidden;background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border:1px solid var(--line,rgba(10,10,20,.07));cursor:pointer;transition:all .4s cubic-bezier(.22,1,.36,1);position:relative;opacity:0;transform:translateY(20px);}
.sc-native.in{opacity:1;transform:none;}
.sc-native:hover{transform:translateY(-7px);box-shadow:0 24px 60px rgba(123,47,247,.16);border-color:transparent;}
.sc-native-img{height:180px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.sc-native-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;}
.sc-native-img svg{width:48px;height:48px;color:rgba(255,255,255,.9);position:relative;z-index:1;}
.sc-native-tag{position:absolute;top:12px;left:12px;padding:5px 11px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(252,252,253,.94);backdrop-filter:blur(8px);color:var(--ink-soft,#4A4C66);z-index:2;}
.sc-native-shine{position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.12) 50%,transparent 65%);background-size:200% 100%;animation:scShimmer 6s ease-in-out infinite;}
.sc-native-body{padding:16px 18px 18px;}
.sc-native-who{font-size:11px;color:var(--ink-faint,#8E90AD);margin-bottom:4px;}
.sc-native-headline{font-family:var(--font-display,'Fraunces',serif);font-weight:500;font-size:17px;color:var(--ink,#0A0A14);margin-bottom:5px;line-height:1.2;}
.sc-native-sub{font-size:12px;color:var(--ink-soft,#4A4C66);margin-bottom:14px;line-height:1.5;}
.sc-native-foot{display:flex;align-items:center;justify-content:space-between;}
.sc-native-price{font-family:var(--font-display,'Fraunces',serif);font-weight:500;font-size:15px;color:var(--ink,#0A0A14);}
.sc-native-cta{padding:9px 17px;border-radius:100px;color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:filter .2s,transform .2s;}
.sc-native-cta:hover{filter:brightness(1.08);transform:scale(1.04);}

/* STICKY */
.sc-sticky{position:fixed;bottom:24px;right:24px;z-index:9990;width:310px;max-width:calc(100vw - 32px);border-radius:22px;overflow:hidden;box-shadow:0 24px 64px rgba(10,10,20,.22);transform:translateY(160%);transition:transform .65s cubic-bezier(.34,1.56,.64,1);backdrop-filter:blur(12px);}
.sc-sticky.show{transform:none;}
.sc-sticky-inner{padding:18px 16px;display:flex;align-items:flex-start;gap:12px;position:relative;}
.sc-sticky-ico{width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.2);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;border:1px solid rgba(255,255,255,.2);}
.sc-sticky-ico svg{width:20px;height:20px;}
.sc-sticky-body{flex:1;min-width:0;}
.sc-sticky-who{font-size:10px;font-weight:600;color:rgba(255,255,255,.65);margin-bottom:2px;letter-spacing:.04em;text-transform:uppercase;}
.sc-sticky-headline{font-family:var(--font-display,'Fraunces',serif);font-weight:500;font-size:14px;color:#fff;line-height:1.2;margin-bottom:3px;}
.sc-sticky-sub{font-size:12px;color:rgba(255,255,255,.8);}
.sc-sticky-cta{display:block;margin-top:10px;padding:9px 16px;border-radius:100px;background:#fff;color:#0A0A14;font-size:12px;font-weight:700;text-decoration:none;text-align:center;transition:transform .2s;}
.sc-sticky-cta:hover{transform:scale(1.03);}
.sc-sticky-x{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.18);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;}
.sc-sticky-x svg{width:10px;height:10px;}

@media(max-width:600px){
  .sc-video{aspect-ratio:4/3;}
  .sc-video-headline{max-width:90%!important;font-size:20px!important;}
  .sc-video-sub,.sc-carousel-sub{max-width:90%!important;}
  .sc-carousel{height:auto;min-height:160px;}
  .sc-slide{flex-direction:column;align-items:flex-start;padding:20px;gap:10px;}
  .sc-slide-ico{margin-right:0;}
  .sc-slide-cta{margin-left:0;}
  .sc-nav{display:none;}
  .sc-sticky{right:12px;bottom:80px;width:calc(100vw - 24px);}
}
`;

function injectCSS() {
  if (document.getElementById('sc-css')) return;
  const s = document.createElement('style');
  s.id = 'sc-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════════
   RENDERERS
════════════════════════════════════════════════════════════════ */

/* ── VIDEO ── */
function renderVideo(slot, c) {
  if (!c) return;
  const hasVideo = !!c.media_url;
  slot.innerHTML = `
    <div class="sc-label">Sponsored content</div>
    <div class="sc-video" id="scv-${c.id}">
      <div class="sc-video-bg">
        ${hasVideo
          ? `<video muted loop playsinline preload="metadata" poster="${c.poster_url||''}"><source src="${c.media_url}" type="video/mp4"/><source src="${c.media_url.replace('.mp4','.webm')}" type="video/webm"/></video>`
          : ''}
      </div>
      <div class="sc-video-grad" style="background:${c.theme_gradient}"></div>
      <div style="position:absolute;inset:0;overflow:hidden;">
        <div class="sc-orb" style="width:220px;height:220px;background:${c.accent_color||'#5EEAD4'};top:-15%;left:8%;"></div>
        <div class="sc-orb" style="width:180px;height:180px;background:${c.theme_gradient.match(/#[0-9A-Fa-f]{6}/)?.[0]||'#4361FF'};bottom:-8%;right:12%;animation-delay:-5s;opacity:.3;"></div>
      </div>
      <div class="sc-video-shimmer"></div>
      <div class="sc-video-tag">${c.tag||'Sponsored'}</div>
      <div class="sc-video-content">
        <div class="sc-video-advertiser">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon_svg||'<circle cx="12" cy="12" r="10"/>'}</svg>
          ${c.advertiser}
        </div>
        <div class="sc-video-headline">${c.headline}</div>
        <div class="sc-video-sub">${c.sub||''}</div>
        <button class="sc-video-cta">
          ${c.cta_text||'Learn more'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>
      ${hasVideo ? `
      <div class="sc-video-controls">
        <button class="sc-video-btn sc-sound-btn" title="Toggle sound">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        </button>
        <button class="sc-video-btn sc-pause-btn" title="Pause/play">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
      </div>
      <div class="sc-video-progress"><div class="sc-video-progress-bar"></div></div>` : ''}
    </div>`;

  const el = slot.querySelector('.sc-video');
  const video = el.querySelector('video');
  const soundBtn = el.querySelector('.sc-sound-btn');
  const pauseBtn = el.querySelector('.sc-pause-btn');
  const bar = el.querySelector('.sc-video-progress-bar');
  let muted = true, playing = false;

  // Click to navigate
  el.addEventListener('click', e => {
    if (e.target.closest('.sc-sound-btn') || e.target.closest('.sc-pause-btn')) return;
    trackClick(c.id, 'video', c.advertiser);
    if (c.cta_url && c.cta_url !== '#') window.location.href = c.cta_url;
  });

  // Sound toggle
  soundBtn?.addEventListener('click', e => {
    e.stopPropagation();
    muted = !muted;
    if (video) video.muted = muted;
    soundBtn.innerHTML = muted
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>`;
  });

  // Pause/play toggle
  pauseBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (!video) return;
    if (video.paused) { video.play(); playing = true;
      pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    } else { video.pause(); playing = false;
      pauseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
  });

  // Progress bar
  if (video && bar) {
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      bar.style.width = (video.currentTime / video.duration * 100) + '%';
    });
  }

  // Intersection observer — play when visible
  observeIn(el, () => {
    el.classList.add('in');
    trackImpression(c.id, 'video', c.advertiser);
    if (video) { video.muted = true; video.play().catch(() => {}); playing = true; }
  }, () => {
    if (video) { video.pause(); playing = false; }
  });
}

/* ── CAROUSEL ── */
function renderCarousel(slot, cs) {
  if (!cs?.length) return;
  const slides = cs.map((c, i) => `
    <div class="sc-slide ${i===0?'active':''}" data-idx="${i}" style="background:${c.theme_gradient}">
      <div class="sc-slide-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon_svg||'<circle cx="12" cy="12" r="10"/>'}</svg>
      </div>
      <div class="sc-slide-body">
        <div class="sc-slide-who">${c.advertiser} · Sponsored</div>
        <div class="sc-slide-headline">${c.headline}</div>
        <div class="sc-slide-sub">${c.sub||''}</div>
      </div>
      <button class="sc-slide-cta" data-url="${c.cta_url||'#'}" data-id="${c.id}" data-adv="${c.advertiser}">${c.cta_text||'Learn more'}</button>
    </div>`).join('');

  const dots = cs.map((_,i) => `<div class="sc-dot ${i===0?'active':''}" data-i="${i}"></div>`).join('');

  slot.innerHTML = `
    <div class="sc-label">Sponsored content</div>
    <div class="sc-carousel">
      ${slides}
      <button class="sc-nav sc-prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button class="sc-nav sc-next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
      <div class="sc-dots">${dots}</div>
      <div class="sc-progress"></div>
    </div>`;

  const wrap = slot.querySelector('.sc-carousel');
  const slideEls = [...wrap.querySelectorAll('.sc-slide')];
  const dotEls = [...wrap.querySelectorAll('.sc-dot')];
  const prog = wrap.querySelector('.sc-progress');
  let cur = 0, paused = false, elapsed = 0;
  const DUR = 5200;

  function goTo(i, dir='next') {
    slideEls[cur].classList.remove('active');
    if (dir==='prev') slideEls[cur].style.transform = 'translateX(40px)';
    setTimeout(() => { slideEls[cur].style.transform = ''; }, 600);
    dotEls[cur].classList.remove('active');
    cur = (i + slideEls.length) % slideEls.length;
    slideEls[cur].classList.add('active');
    dotEls[cur].classList.add('active');
    elapsed = 0; prog.style.width = '0%';
    trackImpression(cs[cur].id, 'carousel', cs[cur].advertiser);
  }

  let rafId;
  let last = performance.now();
  function tick(ts) {
    if (!paused) {
      elapsed += ts - last;
      prog.style.width = Math.min(elapsed / DUR * 100, 100) + '%';
      if (elapsed >= DUR) goTo(cur + 1);
    }
    last = ts;
    rafId = requestAnimationFrame(tick);
  }

  wrap.querySelectorAll('.sc-slide-cta').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      trackClick(btn.dataset.id, 'carousel', btn.dataset.adv);
      const url = btn.dataset.url;
      if (url && url !== '#') window.location.href = url;
    });
  });
  dotEls.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));
  wrap.querySelector('.sc-prev').addEventListener('click', () => goTo(cur - 1, 'prev'));
  wrap.querySelector('.sc-next').addEventListener('click', () => goTo(cur + 1));
  wrap.addEventListener('mouseenter', () => paused = true);
  wrap.addEventListener('mouseleave', () => { paused = false; last = performance.now(); });

  // Swipe
  let sx = 0;
  wrap.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive:true});
  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) goTo(cur + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
  }, {passive:true});

  observeIn(wrap, () => {
    wrap.classList.add('in');
    last = performance.now();
    rafId = requestAnimationFrame(tick);
    trackImpression(cs[0].id, 'carousel', cs[0].advertiser);
  }, () => { cancelAnimationFrame(rafId); });
}

/* ── NATIVE ── */
function renderNative(slot, c) {
  if (!c) return;
  slot.innerHTML = `
    <div class="sc-native" data-id="${c.id}">
      <div class="sc-native-img" style="background:${c.theme_gradient}">
        ${c.media_url ? `<img src="${c.media_url}" alt="${c.advertiser}" loading="lazy"/>` : ''}
        <div class="sc-native-tag">${c.tag||'Promoted'}</div>
        <div class="sc-native-shine"></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${c.icon_svg||'<circle cx="12" cy="12" r="10"/>'}</svg>
      </div>
      <div class="sc-native-body">
        <div class="sc-native-who">${c.advertiser}</div>
        <div class="sc-native-headline">${c.headline}</div>
        <div class="sc-native-sub">${c.sub||''}</div>
        <div class="sc-native-foot">
          <div class="sc-native-price">${c.price_display||''}</div>
          <button class="sc-native-cta" style="background:${c.theme_gradient}">${c.cta_text||'View'}</button>
        </div>
      </div>
    </div>`;

  const el = slot.querySelector('.sc-native');
  el.addEventListener('click', () => {
    trackClick(c.id, 'native', c.advertiser);
    if (c.cta_url && c.cta_url !== '#') window.location.href = c.cta_url;
  });
  observeIn(el, () => { el.classList.add('in'); trackImpression(c.id, 'native', c.advertiser); });
}

/* ── STICKY ── */
function renderSticky(c) {
  if (!c || sessionStorage.getItem('sc_sticky_x')) return;
  const el = document.createElement('div');
  el.className = 'sc-sticky';
  el.style.background = c.theme_gradient;
  el.innerHTML = `
    <div class="sc-sticky-inner">
      <div class="sc-sticky-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${c.icon_svg||'<circle cx="12" cy="12" r="10"/>'}</svg></div>
      <div class="sc-sticky-body">
        <div class="sc-sticky-who">${c.advertiser}</div>
        <div class="sc-sticky-headline">${c.headline}</div>
        <div class="sc-sticky-sub">${c.sub||''}</div>
        <a class="sc-sticky-cta" href="${c.cta_url||'#'}">${c.cta_text||'Learn more'}</a>
      </div>
      <button class="sc-sticky-x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('show'); trackImpression(c.id,'sticky',c.advertiser); }, 14000);
  el.querySelector('.sc-sticky-x').addEventListener('click', () => {
    el.classList.remove('show'); sessionStorage.setItem('sc_sticky_x','1');
    setTimeout(() => el.remove(), 700);
  });
  el.querySelector('.sc-sticky-cta').addEventListener('click', () => trackClick(c.id,'sticky',c.advertiser));
}

/* ── Intersection observer ── */
function observeIn(el, onIn, onOut) {
  new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) onIn?.(); else onOut?.(); });
  }, { threshold: 0.3 }).observe(el);
}

/* ── Picker ── */
let idx = {};
function pick(fmt) {
  const pool = CAMPAIGNS[fmt]||[];
  if (!pool.length) return null;
  idx[fmt] = ((idx[fmt]||0) + 1) % pool.length;
  return pool[idx[fmt]];
}

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
async function init() {
  injectCSS();
  initGA4();
  // Load live campaigns from Supabase (non-blocking)
  await loadCampaigns();

  document.querySelectorAll('[data-showcase]').forEach(slot => {
    slot.classList.add('sc-wrap');
    const fmt = slot.getAttribute('data-showcase');
    if (fmt === 'video')    renderVideo(slot, pick('video'));
    if (fmt === 'carousel') renderCarousel(slot, CAMPAIGNS.carousel);
    if (fmt === 'native')   renderNative(slot, pick('native'));
  });

  // Sticky on non-funnel content pages
  const stickyOn = ['','index.html','apartments.html','my-bookings.html','dashboard.html'];
  if (stickyOn.includes(currentPage) && CAMPAIGNS.sticky?.[0]) {
    renderSticky(CAMPAIGNS.sticky[0]);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }

/* Public API */
window.ApatmentoShowcase = {
  reload: init,
  campaigns: () => CAMPAIGNS,
  track: { impression: trackImpression, click: trackClick },
};

})();
