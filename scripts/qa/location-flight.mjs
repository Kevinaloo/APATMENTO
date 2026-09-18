// Real Chromium, actual listing click path and map renderer. Backend data is
// fixture-only; no production writes, bookings or host metrics are submitted.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import app from '../../server.js';

const server=await new Promise(done=>{const s=app.listen(0,'127.0.0.1',()=>done(s));});
const origin=`http://127.0.0.1:${server.address().port}`,out=resolve('artifacts/location-flight');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
const listings=[
  {id:'qa-westlands',title:'A quiet corner in Westlands',city:'Nairobi',country:'Kenya',area:'Westlands',location:'Westlands, Nairobi',latitude:-1.267,longitude:36.806},
  {id:'qa-diani',title:'A stay by the Indian Ocean',city:'Diani',country:'Kenya',area:'Diani Beach',location:'Diani, Kenya',latitude:-4.28,longitude:39.58},
  {id:'qa-london',title:'A weekend in London',city:'London',country:'United Kingdom',area:'London',location:'London, United Kingdom',latitude:51.5074,longitude:-.1278},
  {id:'qa-unknown',title:'Location pending',city:'',country:'',area:'',location:'',latitude:null,longitude:null}
].map(l=>({...l,service:'stays',is_active:true,price_night:5500,beds:2,baths:1,max_guests:4,photos:['/cabana-poster-bedroom.jpg']}));
async function visit({width=1440,height=1000,reduced=false,blocked=false,query='',realTime=false}={}){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});
  await ctx.addInitScript(()=>{sessionStorage.setItem('cbn-stay-gate-seen','1');delete Object.getPrototypeOf(navigator).serviceWorker;});
  await ctx.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
    if(url.hostname.endsWith('supabase.co'))return route.fulfill({contentType:'application/json',body:JSON.stringify(url.pathname.includes('/rest/v1/listings')?listings:[])});
    if(url.origin===origin&&url.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data:[],results:[],offers:[]})});
    if(/googletagmanager|google-analytics|facebook|clarity/.test(url.hostname))return route.abort();
    if(blocked&&(/leaflet|tile.openstreetmap|arcgisonline/.test(req.url())||url.pathname.includes('/assets/location-flight/')))return route.abort();
    // Unrelated analytics/fonts must not add network timing to this UI test.
    if(url.origin!==origin&&!/tile\.openstreetmap\.org|server\.arcgisonline\.com/.test(url.hostname))return route.fulfill({contentType:req.resourceType()==='stylesheet'?'text/css':'text/plain',body:''});
    return route.continue();
  });
  const page=await ctx.newPage(),errors=[];page.setDefaultTimeout(60000);
  if(!query&&!realTime)await page.clock.install({time:new Date('2026-09-18T12:00:00Z')});
  page.__flightErrors=errors;
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto(origin+'/apartments'+query,{waitUntil:'domcontentloaded'});
  await page.locator('[data-card-id="n_qa-westlands"]').waitFor();
  if(!query&&!realTime)await page.clock.pauseAt(new Date('2026-09-18T13:00:00Z'));
  return {ctx,page,errors};
}
async function clickListing(page,id='qa-westlands'){
  await page.locator(`[data-card-id="n_${id}"] .card-link`).dispatchEvent('click',{button:0});
  if(!await page.locator('.cabana-location-flight[open]').count())console.log('CLICK DIAGNOSTICS',JSON.stringify({errors:page.__flightErrors,state:await page.evaluate(()=>({api:typeof CabanaLocationFlight,map:typeof ApaMap,drawer:document.querySelector('#drawer')?.className,seen:document.querySelector('.card-rail')?.dataset.movedAt,now:Date.now(),dialog:document.querySelector('dialog')?.outerHTML.slice(0,200)}))}));
  assert.equal(await page.locator('.cabana-location-flight[open]').count(),1,'Listing click did not immediately open flight');
  assert.ok(await page.locator('#drawer').evaluate(el=>el.classList.contains('open')),'Listing must already be open underneath');
}
async function layout(page){
  const geometry=await page.locator('.cabana-location-flight').evaluate(d=>{
    const b=d.getBoundingClientRect(),c=d.querySelector('.clf-scene').getBoundingClientRect();
    return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:innerWidth,height:innerHeight,scene:c.height,scroll:d.scrollWidth,client:d.clientWidth};
  });
  assert.ok(geometry.x>=0&&geometry.y>=0&&geometry.right<=geometry.width+1&&geometry.bottom<=geometry.height+1,JSON.stringify(geometry));
  assert.ok(geometry.scene>100&&geometry.scroll<=geometry.client+1,JSON.stringify(geometry));
  for(const selector of ['[aria-label="Close location preview"]','.clf-continue','#cabana-flight-privacy'])assert.ok(await page.locator(selector).isVisible());
}
async function check(name,fn){if(process.env.FLIGHT_QA_FILTER&&!name.includes(process.env.FLIGHT_QA_FILTER))return;try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.stack});console.log('FAIL '+name+': '+e.message);}}
try{
  await check('desktop: real card click, globe, all zoom stages, exact map agreement and 10-second timeout',async()=>{
    const {ctx,page,errors}=await visit();
    try{
      await page.evaluate(async()=>{
        await Promise.all([CabanaLocationGlobe.preload(),ApaMap.load()]);
        window.__qaMaps=[];window.__qaFinal=null;
        const make=L.map;L.map=function(...args){const m=make(...args);window.__qaMaps.push(m);
          m.on('moveend',()=>{if(m.getContainer().classList.contains('clf-map')&&m.getZoom()===14){
            const detail=window.__qaMaps.find(other=>other!==m);
            const circle=map=>{let found;map?.eachLayer(layer=>{if(layer instanceof L.Circle)found={center:layer.getLatLng(),radius:layer.getRadius()};});return found;};
            window.__qaFinal={flight:m.getCenter(),detail:detail?.getCenter(),flightArea:circle(m),detailArea:circle(detail),zoom:m.getZoom(),visible:document.querySelector('.cabana-location-flight')?.classList.contains('clf-map-visible')};
          }});return m;};
        window.__qaStages=[];window.__qaClosed=null;
        const observer=new MutationObserver(()=>{
          const d=document.querySelector('.cabana-location-flight');
          if(d){if(d.dataset.stage&&!window.__qaStages.includes(d.dataset.stage))window.__qaStages.push(d.dataset.stage);}
          else if(window.__qaClick&&window.__qaClosed===null)window.__qaClosed=performance.now()-window.__qaClick;
        });observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-stage']});
        document.addEventListener('click',e=>{if(e.target.closest('.card-link'))window.__qaClick=performance.now();},true);
      });
      await clickListing(page);await layout(page);
      await page.clock.runFor(400);
      await page.screenshot({path:out+'/desktop-globe.png',animations:'disabled'});
      await page.clock.fastForward(1500);await page.clock.runFor(32);
      await page.clock.fastForward(1700);await page.clock.runFor(32);
      await page.screenshot({path:out+'/desktop-country.png',animations:'disabled'});
      await page.clock.fastForward(1700);await page.clock.runFor(32);
      await page.clock.fastForward(1700);await page.clock.runFor(32);
      await page.clock.fastForward(1400);await page.clock.runFor(32);
      const mapState=await page.evaluate(()=>window.__qaFinal);
      assert.ok(mapState,'Final map camera never arrived');
      assert.ok(mapState.visible,'Live tiles never became visible');
      // Different viewport sizes round the camera by a pixel. The actual
      // geographic circles must match exactly, independently of screen pixels.
      assert.deepEqual(mapState.flightArea,mapState.detailArea);
      assert.equal(mapState.flightArea.radius,500);
      assert.equal(mapState.zoom,14);
      await page.screenshot({path:out+'/desktop-area.png',animations:'disabled'});
      await page.clock.fastForward(3000);
      await page.waitForFunction(()=>!document.querySelector('.cabana-location-flight'));
      const timing=await page.evaluate(()=>({stages:window.__qaStages,duration:window.__qaClosed}));
      assert.deepEqual(timing.stages,['0','1','2','3','4']);assert.ok(timing.duration>=10000,JSON.stringify(timing));
      assert.ok(await page.locator('#drawer .dl-book-btn').isVisible());
      assert.deepEqual(errors,[]);results.push({name:'measured flight',pass:true,...timing,mapState});
    }finally{await ctx.close();}
  });
  for(const [width,height] of [[390,844],[320,700],[844,390]])await check(`responsive ${width}x${height}: click, focus trap, Escape, repeated opening`,async()=>{
    const {ctx,page,errors}=await visit({width,height});
    try{
      await clickListing(page);await page.clock.runFor(400);await layout(page);
      await page.screenshot({path:out+`/mobile-${width}.png`,animations:'disabled'});
      for(let i=0;i<6;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('.cabana-location-flight')!==null));}
      await page.keyboard.press('Escape');assert.equal(await page.locator('.cabana-location-flight').count(),0);
      assert.ok(await page.locator('#drawer').evaluate(el=>el.classList.contains('open')));
      await page.evaluate(()=>closeDrawer());await clickListing(page,'qa-diani');
      assert.equal(await page.locator('#cabana-flight-title').textContent(),'A stay by the Indian Ocean');
      await page.locator('.clf-continue').dispatchEvent('click');assert.equal(await page.locator('.cabana-location-flight').count(),0);assert.deepEqual(errors,[]);
    }finally{await ctx.close();}
  });
  await check('reduced motion: static final map and skip button',async()=>{
    const {ctx,page,errors}=await visit({width:390,height:844,reduced:true});
    try{await clickListing(page);await page.clock.runFor(400);assert.equal(await page.locator('.cabana-location-flight').getAttribute('data-stage'),'4');await layout(page);
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest('.cabana-location-flight')&&a.playState==='running').length),0);
      await page.locator('[aria-label="Close location preview"]').dispatchEvent('click');assert.equal(await page.locator('.cabana-location-flight').count(),0);assert.deepEqual(errors,[]);
    }finally{await ctx.close();}
  });
  await check('blocked globe/Leaflet/tiles: opens immediately, still exits after ten seconds',async()=>{
    const {ctx,page}=await visit({blocked:true});
    try{await clickListing(page);await layout(page);await page.clock.fastForward(10000);assert.equal(await page.locator('.cabana-location-flight').count(),0);assert.ok(await page.locator('#drawer .dl-book-btn').isVisible());}finally{await ctx.close();}
  });
  await check('listing deep link from other pages opens the same immediate overlay',async()=>{
    const {ctx,page}=await visit({query:'?open=qa-london'});
    try{await page.locator('.cabana-location-flight[open]').waitFor();assert.equal(await page.locator('#cabana-flight-title').textContent(),'A weekend in London');await page.locator('.clf-continue').dispatchEvent('click');}finally{await ctx.close();}
  });
  await check('real wall clock: a user click opens synchronously and dismisses at ten seconds',async()=>{
    const {ctx,page}=await visit({realTime:true});
    try{
      const result=await page.evaluate(async()=>{
        let finished;const start=performance.now();
        const observer=new MutationObserver(()=>{if(finished===undefined&&!document.querySelector('.cabana-location-flight'))finished=performance.now()-start;});
        observer.observe(document.body,{childList:true});
        document.querySelector('[data-card-id="n_qa-westlands"] .card-link').click();
        const immediate=!!document.querySelector('.cabana-location-flight[open]');
        await new Promise(resolve=>setTimeout(resolve,11000));observer.disconnect();
        return {immediate,finished,drawer:document.querySelector('#drawer').classList.contains('open')};
      });
      assert.ok(result.immediate&&result.drawer);assert.ok(result.finished>=9950&&result.finished<11000,JSON.stringify(result));
      results.push({name:'wall-clock measurement',pass:true,...result});
    }finally{await ctx.close();}
  });
}finally{
  await browser.close();await new Promise(done=>server.close(done));
  await writeFile(out+'/report.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
}
console.log(`${results.filter(r=>r.pass).length}/${results.length} browser checks passed. ${out}`);
process.exitCode=results.some(r=>!r.pass)?1:0;
