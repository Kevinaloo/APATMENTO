/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD SERVICE RAILS · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives dashboard.html and every service page a rail can open, in real
   Chromium, against tests/ui/stub-server.js for the static files and
   Playwright route interception for Supabase.

   What this suite exists to hold in place:

     PRODUCT   "Book a Space" shows stays and nothing else. A restaurant,
               a car and a shopping item all carry a `type` that is not
               "room", so the old `type=neq.room` filter put a samosa
               counter on the stays rail at KES 0 a night. That is the
               regression this file was written for.

     SOURCE    Each rail reads the table its own service page reads, so
               the dashboard can never advertise stock the destination
               cannot show.

     DESTINATION  A card opens ITS listing. Every card carries a deep link
               and every service page answers one.

     EMPTY     A service with no inventory drops its rail rather than
               faking one, and gets it back the moment a listing exists.

     LAYOUT    Rail cards stay slide-width. `.pc { width:100% }` and
               `[data-rail-track] > *` weigh the same, so whichever
               stylesheet was injected last won and one card filled the
               whole rail.

     node tests/ui/dashboard-rails.test.js   (see run-dashboard-rails.sh)
   ═══════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.UI_TEST_PORT || 8899);
const BASE = 'http://localhost:' + PORT;

/* Playwright lives in a scratch dir, not the repo. Same reasoning, and the
   same file: URL specifier dance, as the ambassador suite next door. */
let chromium;
try {
  const spec = process.env.PW_PATH
    ? pathToFileURL(path.join(process.env.PW_PATH, 'index.mjs')).href
    : 'playwright';
  ({ chromium } = await import(spec));
} catch (e) {
  console.error('playwright not available:', e.message);
  console.error('Run tests/ui/run-dashboard-rails.sh, which installs it.');
  process.exit(2);
}

const b = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });

/* Every non-local request is answered here, so the tests are about our
   code and not about whether a sandbox can reach Supabase. */
const STAYS=[
 {id:'a1',title:'Luxore Apartment',type:'Apartment',service:'stays',area:'Syokimau',price_night:3000,photos:[],beds:1,max_guests:2,status:'active',is_active:true},
 {id:'a2',title:'Shikaz Homes 1 Bedroom',type:'Apartment',service:'stays',area:'Syokimau',price_night:3000,photos:[],beds:1,max_guests:2,status:'active',is_active:true},
 {id:'a3',title:'The Jets Nest',type:'Apartment',service:'stays',area:'Obama estate',price_night:2000,photos:[],beds:1,max_guests:2,status:'active',is_active:true},
 {id:'f1',title:'MJK Samosa Hub',type:'food',service:'food',area:'Obama estate',price_night:0,photos:[],status:'active',is_active:true},
 {id:'r1',title:'Room in Kilimani',type:'room',service:'roommates',area:'Kilimani',price_month:28000,photos:[],status:'active',is_active:true},
 {id:'c1',title:'Toyota RAV4',type:'carhire',service:'carhire',area:'Nairobi',price_night:9500,photos:[],status:'active',is_active:true},
 {id:'s1',title:'Kitenge Print Dress',type:'shopping',service:'shopping',area:'Nairobi',price_night:3500,photos:[],status:'active',is_active:true}
];
const SHOP=[{id:'x1',name:'Kenyan AA Coffee',seller:'Dormans',market:'Outlets',city:'Nairobi',price:1200,category:'food',image_url:null,active:true,in_stock:true,hot:true}];

async function stub(page){
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rest/v1/listings')) {
      const type = /type=eq\.(\w+)/.exec(u);
      let rows = STAYS;
      if (type) rows = STAYS.filter(r=>r.type===type[1]);
      else if (u.includes('service=eq.food')) rows = STAYS.filter(r=>r.service==='food');
      else if (u.includes('type.eq.room')) rows = STAYS.filter(r=>r.type==='room');
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)});
    }
    if (u.includes('/rest/v1/scraped_shopping'))
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(SHOP)});
    if (u.includes('/rest/v1/'))
      return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    return route.fulfill({status:200,contentType:'text/plain',body:''});
  });
}

let fails=0;
const ok=(n,c,extra='')=>{ console.log((c?'  PASS':'  FAIL')+' · '+n+(extra?'  '+extra:'')); if(!c)fails++; };

/* ── 1. Dashboard ───────────────────────────────────────────────── */
console.log('\nDASHBOARD');
{
  const p=await ctx.newPage(); await stub(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE + '/dashboard.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(7000);
  /* The once-a-day intro splash covers the page for a first-time visitor.
     Dismiss it, as a returning guest's browser would have. */
  await p.evaluate(()=>{ const s=document.getElementById('cbp-splash'); if(s) s.remove(); });

  const stays=await p.$$eval('#stay-grid .prop-name',n=>n.map(x=>x.textContent.trim()));
  ok('Book a Space shows only stays', stays.length===3 && !stays.includes('MJK Samosa Hub'), JSON.stringify(stays));

  const rails=await p.$$eval('#cat-rails .cat-sec',s=>s.map(x=>x.dataset.cat));
  ok('empty rails removed themselves', !rails.includes('events')&&!rails.includes('tours')&&!rails.includes('carhire'), JSON.stringify(rails));
  ok('food rail present (kitchen with no menu)', rails.includes('food'));
  ok('shopping rail present', rails.includes('shopping'));
  ok('roommates rail present', rails.includes('roommates'));

  const w=await p.$$eval('#cat-rails .pc',c=>c.map(x=>Math.round(x.getBoundingClientRect().width)));
  ok('rail cards are slides, not full-width', w.length>0 && w.every(x=>x>200&&x<340), JSON.stringify(w.slice(0,6)));

  const links=await p.$$eval('#cat-rails .pc',c=>c.map(x=>({svc:x.dataset.svc,q:x.dataset.q||'',to:x.dataset.to||''})));
  ok('every rail card carries a listing deep link', links.length>0 && links.every(l=>l.q||l.to), JSON.stringify(links.slice(0,3)));

  const shopCard=links.find(l=>l.svc==='shopping');
  ok('shopping card id is prefixed like shopping.html expects', !!shopCard && /^open=[sl]/.test(shopCard.q), shopCard&&shopCard.q);

  // Nothing may sit on top of a card and swallow the tap.
  await p.evaluate(()=>document.querySelector('#cat-rails .cat-sec[data-cat="shopping"]')
    .scrollIntoView({block:'center',behavior:'instant'}));
  await p.waitForTimeout(600);
  /* Hit-test whichever card the rail currently has under its own centre,
     measured and probed in one go so autoplay cannot slide a different
     card under the probe between the two reads. */
  const top=await p.evaluate(()=>{
    const track=document.querySelector('#cat-rails .cat-sec[data-cat="shopping"] [data-rail-track]');
    const tr=track.getBoundingClientRect();
    const x=tr.left+tr.width/2, y=tr.top+tr.height/2;
    const t=document.elementFromPoint(x,y);
    if(!t) return 'none';
    const card=t.closest('.pc');
    return card ? 'card' : t.tagName+'.'+String(t.className);
  });
  ok('nothing overlays the card', top==='card', top);

  // A tap on the artwork inside a card must still route to that listing.
  await p.evaluate(()=>{ window.__nav=null; window.navigateToService=(k,q)=>{window.__nav=[k,q];}; });
  await p.evaluate(()=>{
    const img=document.querySelector('#cat-rails .cat-sec[data-cat="shopping"] .pc .pc-img');
    img.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(200);
  const nav=await p.evaluate(()=>window.__nav);
  ok('clicking a card routes to its listing', !!nav && nav[0]==='shopping' && /^open=/.test(nav[1]), JSON.stringify(nav));

  // "View all" must still reach the index, with no listing attached.
  await p.evaluate(()=>{ window.__nav=null;
    document.querySelector('#cat-rails .cat-sec[data-cat="shopping"] .cat-link')
      .dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); });
  await p.waitForTimeout(200);
  const nav2=await p.evaluate(()=>window.__nav);
  ok('View all reaches the service index', !!nav2 && nav2[0]==='shopping' && !nav2[1], JSON.stringify(nav2));

  ok('no uncaught page errors', errs.length===0, errs.join(' | '));
  await p.close();
}

/* ── 2. Shopping deep link ──────────────────────────────────────── */
console.log('\nSHOPPING ?open=');
{
  const p=await ctx.newPage(); await stub(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE + '/shopping.html?back=1&open=sx1',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1500);
  const found=await p.$$eval('.p-card.p-card-found',c=>c.map(x=>x.dataset.pid));
  ok('deep-linked product is ringed', found.length===1&&found[0]==='sx1', JSON.stringify(found));
  await p.waitForTimeout(3500);
  const cleared=await p.$$eval('.p-card.p-card-found',c=>c.length);
  ok('ring clears itself', cleared===0);
  ok('no uncaught page errors', errs.length===0, errs.join(' | '));
  await p.close();
}

/* ── 3. Deep links on pages with an empty catalogue must not throw ─ */
console.log('\nSERVICE PAGES · ?open= with nothing to open');
for (const pg of ['tours.html','events.html','carhire.html']) {
  const p=await ctx.newPage(); await stub(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`${BASE}/${pg}?back=1&open=nope`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);
  ok(`${pg} survives a stale id`, errs.length===0, errs.join(' | '));
  await p.close();
}

/* ── 4. With inventory present, a deep link must open THAT listing ── */
console.log('\nSERVICE PAGES · ?open= lands on the listing');
const TOUR={id:'t1',title:'Mara Migration Crossing',price_kes:48000,destination:'Masai Mara',
  duration_label:'3 days',cover_url:null,photos:[],days:3,featured:true,sort_weight:9,
  operator_name:'Cabana',country:'Kenya'};
const EVENT={id:'e1',title:'Blankets & Wine',price_from:3500,venue:'Lorem Grounds',city:'Nairobi',
  starts_at:new Date(Date.now()+7*864e5).toISOString(),ends_at:new Date(Date.now()+7*864e5+6*36e5).toISOString(),
  cover_url:null,photos:[],category:'music',organiser_name:'B&W'};
const CAR={id:'v1',operator_id:'o1',make:'Toyota',model:'RAV4',year:2021,class:'suv4x4',body:'suv',
  seats:5,ground_clearance_mm:195,drive:'awd',transmission:'automatic',fuel:'petrol',
  day_rate:950000,deposit:2000000,peak_uplift:200000,chauffeur_uplift_metro:250000,
  chauffeur_uplift_upcountry:500000,min_hire_days:1,min_driver_age:23,min_licence_years:2,
  fuel_policy:'full_to_full',extras:[],photos:[],status:'active'};
const OP={id:'o1',name:'Nairobi Fleet',city:'Nairobi',verified:true};

async function stubFull(page){
  await page.route('**/*', route => {
    const u=route.request().url();
    if(u.startsWith(BASE)) return route.continue();
    const j=v=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(v)});
    if(u.includes('/rest/v1/tours_public'))   return j([TOUR]);
    if(u.includes('/rest/v1/events_public'))  return j([EVENT]);
    if(u.includes('/rest/v1/car_fleet'))      return j([CAR]);
    if(u.includes('/rest/v1/car_operators'))  return j([OP]);
    if(u.includes('/rest/v1/'))               return j([]);
    return route.fulfill({status:200,contentType:'text/plain',body:''});
  });
}

const SHEETS=[
  ['tours.html',   't1', '#ct-sheet', 'Mara Migration Crossing'],
  ['events.html',  'e1', '#ev-sheet', 'Blankets & Wine'],
  ['carhire.html', 'v1', '#ch-sheet', 'RAV4']
];
for (const [pg,id,sel,needle] of SHEETS) {
  const p=await ctx.newPage(); await stubFull(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`${BASE}/${pg}?back=1&open=${id}`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(6000);
  const open=await p.evaluate(s=>{
    const el=document.querySelector(s);
    if(!el) return {shown:false,text:''};
    const cs=getComputedStyle(el);
    return {shown: cs.display!=='none' && cs.visibility!=='hidden' && el.getBoundingClientRect().height>0,
            text: (el.textContent||'').slice(0,4000)};
  }, sel);
  ok(`${pg} opens the listing that was tapped`, open.shown && open.text.includes(needle),
     `shown=${open.shown} match=${open.text.includes(needle)}`);
  ok(`${pg} no uncaught page errors`, errs.length===0, errs.join(' | '));
  await p.close();
}

/* ── 5. Rails appear again as soon as a service has inventory ────── */
console.log('\nDASHBOARD · rails return with inventory');
{
  const p=await ctx.newPage(); await stubFull(p);
  await p.goto(BASE + '/dashboard.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(7000);
  const rails=await p.$$eval('#cat-rails .cat-sec',s=>s.map(x=>x.dataset.cat));
  ok('tours, events and car hire rails reappear',
     ['tours','events','carhire'].every(k=>rails.includes(k)), JSON.stringify(rails));
  const cards=await p.$$eval('#cat-rails .cat-sec',ss=>ss.map(s=>({
    cat:s.dataset.cat,
    c:Array.from(s.querySelectorAll('.pc')).map(x=>({t:x.querySelector('.pc-t').textContent,
      p:x.querySelector('.pc-p').textContent, q:x.dataset.q}))})));
  console.log('   ', JSON.stringify(cards));
  const car=cards.find(x=>x.cat==='carhire').c[0];
  ok('car rate is shown in shillings, not cents', car.p==='KES 9,500/day', car.p);
  ok('car card deep-links to that vehicle', car.q==='open=v1', car.q);
  await p.close();
}

/* ── 6. The two pages that already answered a deep link still do ─── */
console.log('\nSTAYS + ROOMS · deep links');
{
  const p=await ctx.newPage(); await stub(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE + '/apartments.html?back=1&open=a2',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(7000);
  const txt=await p.evaluate(()=>{const d=document.getElementById('drawer')||document.querySelector('.drawer,[id*="drawer"]');
    return d? {on:d.className+'|'+getComputedStyle(d).display, t:(d.textContent||'').slice(0,600)} : null;});
  ok('apartments opens the stay that was tapped', !!txt && txt.t.includes('Shikaz Homes'), JSON.stringify(txt&&txt.on));
  ok('apartments no uncaught page errors', errs.length===0, errs.join(' | '));
  await p.close();
}
{
  const p=await ctx.newPage(); await stub(p);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE + '/roommates.html?back=1&room=r1',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(7000);
  const on=await p.evaluate(()=>{const d=document.getElementById('drawer');
    return d? {cls:d.className, t:(d.textContent||'').slice(0,600)} : null;});
  ok('roommates opens the room that was tapped', !!on && on.cls.includes('on') && on.t.includes('Room in Kilimani'),
     JSON.stringify(on&&on.cls));
  ok('roommates no uncaught page errors', errs.length===0, errs.join(' | '));
  await p.close();
}

console.log(fails? `\n${fails} FAILURE(S)` : '\nALL GREEN');
await b.close();
process.exit(fails ? 1 : 0);
