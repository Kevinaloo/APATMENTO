import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const flight = readFileSync(new URL('../cabana-location-flight.js', import.meta.url), 'utf8');
const mapSource = readFileSync(new URL('../apa-map.js', import.meta.url), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
function setup({reduced=false, area, globePromise, loadPromise}={}) {
  const dom=new JSDOM('<button id="listing">Listing</button>',{url:'https://cabana.africa/apartments',runScripts:'outside-only'});
  const w=dom.window; let now=0,next=0;const timers=new Map(),frames=new Map(),maps=[],globes=[];
  w.setTimeout=(fn,delay=0)=>{const id=++next;timers.set(id,{fn,at:now+delay});return id;};
  w.clearTimeout=id=>timers.delete(id);
  w.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};
  w.cancelAnimationFrame=id=>frames.delete(id);
  w.Date.now=()=>now;Object.defineProperty(w.performance,'now',{value:()=>now});
  w.requestIdleCallback=()=>0;
  w.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.fetch=async()=>({ok:true,json:async()=>({places:[{country:'Kenya',name:'Nairobi',continent:'africa'}]})});
  w.CabanaLocationGlobe={create:()=>{
    if(globePromise)return globePromise;
    const g={draws:[],destroyed:false,draw(frame){this.draws.push(frame);},destroy(){this.destroyed=true;}};globes.push(g);return Promise.resolve(g);
  }};
  const L={map:(el,o)=>{
    const m={el,options:o,views:[],removed:false,attributionControl:{setPrefix(){}},on(){},invalidateSize(){},stop(){},
      flyTo(center,zoom){this.views.push({center,zoom,animated:true});},setView(center,zoom){this.views.push({center,zoom,animated:false});},remove(){this.removed=true;}};
    maps.push(m);return m;
  },circle:()=>({addTo(){}})};
  w.ApaMap={load:()=>loadPromise||Promise.resolve(L),paintBase:()=>({base:{on:(name,fn)=>fn()},destroy(){}})};
  w.eval(flight);
  const button=w.document.querySelector('button');button.focus();
  const opts={name:'Forest House',city:'Nairobi',country:'Kenya',area:'Westlands',areaPromise:area||Promise.resolve({center:[-1.26,36.8],radius:500}),returnFocus:button};
  return {w,dom,maps,globes,opts,timers,frames,dialog:()=>w.document.querySelector('dialog'),
    async tick(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}for(const [id,fn] of [...frames]){frames.delete(id);fn(now);}await flush();},
    finish(){w.CabanaLocationFlight.close();dom.window.close();}};
}

test('opens synchronously on click even when every location resource is still pending',()=>{
  const s=setup({area:new Promise(()=>{}),globePromise:new Promise(()=>{})});
  s.w.CabanaLocationFlight.open(s.opts);
  assert.equal(s.dialog().open,true);assert.match(s.dialog().textContent,/Exact location available after booking/);
  assert.equal(s.w.document.body.style.overflow,'hidden');s.finish();
});
test('hard deadline closes at 10 seconds even when geocoding and maps never answer',async()=>{
  const s=setup({area:new Promise(()=>{})});s.w.CabanaLocationFlight.open(s.opts);
  await s.tick(9999);assert.ok(s.dialog());await s.tick(1);assert.equal(s.dialog(),null);assert.equal(s.frames.size,0);s.finish();
});
test('click dismiss, Escape and native cancel release resources and restore listing focus',async()=>{
  for(const kind of ['click','escape','cancel']){
    const s=setup();s.w.document.body.style.overflow='hidden';s.w.CabanaLocationFlight.open(s.opts);await flush();
    if(kind==='click')s.dialog().querySelector('[data-flight-close]').click();
    else if(kind==='escape')s.dialog().dispatchEvent(new s.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    else s.dialog().dispatchEvent(new s.w.Event('cancel',{cancelable:true}));
    assert.equal(s.dialog(),null);assert.equal(s.w.document.activeElement.id,'listing');assert.equal(s.w.document.body.style.overflow,'hidden');
    assert.ok(s.maps.every(m=>m.removed));assert.ok(s.globes.every(g=>g.destroyed));assert.equal(s.frames.size,0);s.finish();
  }
});
test('reopening replaces the old listing and old async work cannot replace the new destination',async()=>{
  const area=deferred(),s=setup({area:area.promise});s.w.CabanaLocationFlight.open(s.opts);
  s.w.CabanaLocationFlight.open({...s.opts,name:'Coastal House',areaPromise:Promise.resolve({center:[-4.28,39.58],radius:500})});
  await flush();area.resolve({center:[1,2],radius:500});await flush();
  assert.equal(s.w.document.querySelectorAll('dialog').length,1);assert.equal(s.maps.length,1);
  assert.deepEqual([...s.maps[0].options.center],[-4.28,39.58]);assert.equal(s.dialog().querySelector('h2').textContent,'Coastal House');s.finish();
});
test('a globe that arrives after dismissal is destroyed and never reopens the preview',async()=>{
  const d=deferred(),s=setup({globePromise:d.promise});s.w.CabanaLocationFlight.open(s.opts);s.w.CabanaLocationFlight.close();
  let destroyed=false;d.resolve({destroy(){destroyed=true;}});await flush();assert.ok(destroyed);assert.equal(s.dialog(),null);s.finish();
});
test('listing data is text, not HTML or raw coordinates',async()=>{
  const s=setup();s.w.CabanaLocationFlight.open({...s.opts,name:'<img src=x onerror=alert(1)>',area:'<svg onload=alert(1)>',latitude:12.345678,longitude:98.765432});
  await flush();await s.tick(8000);assert.equal(s.dialog().querySelector('h2 img'),null);assert.match(s.dialog().querySelector('h2').textContent,/<img/);
  assert.doesNotMatch(s.dialog().textContent,/12\.345678|98\.765432/);assert.deepEqual([...s.maps[0].options.center],[-1.26,36.8]);s.finish();
});
test('reduced motion shows the final area without a flying camera or rotating globe',async()=>{
  const s=setup({reduced:true});s.w.CabanaLocationFlight.open(s.opts);await flush();await s.tick(16);await s.tick(1000);
  assert.equal(s.dialog().dataset.stage,'4');assert.ok(s.maps[0].views.every(v=>!v.animated&&v.zoom===14));
  assert.ok(s.globes[0].draws.every(f=>f.lat===-1.26&&f.lng===36.8&&f.scale===1));s.finish();
});
test('all five geographic stages occur before automatic dismissal',async()=>{
  const s=setup();s.w.CabanaLocationFlight.open(s.opts);await flush();const stages=[];
  for(const delta of [16,1800,1700,1700,1700]){await s.tick(delta);stages.push(s.dialog().dataset.stage);}
  assert.deepEqual(stages,['0','1','2','3','4']);assert.equal(s.maps[0].views.at(-1).zoom,14);s.finish();
});
test('missing or invalid areas do not animate to an invented point',async()=>{
  for(const center of [null,[null,0],[NaN,0],[91,30],[0,181]]){
    const s=setup({area:Promise.resolve(center?{center,radius:500}:null)});s.w.CabanaLocationFlight.open(s.opts);await flush();await s.tick(7000);
    assert.equal(s.maps.length,0);assert.match(s.dialog().textContent,/not available/);await s.tick(3000);assert.equal(s.dialog(),null);s.finish();
  }
});
test('map failure still allows dismissal and automatic continuation',async()=>{
  const s=setup({loadPromise:Promise.reject(new Error('offline'))});s.w.CabanaLocationFlight.open(s.opts);await flush();
  assert.match(s.dialog().textContent,/temporarily unavailable/);await s.tick(10000);assert.equal(s.dialog(),null);s.finish();
});
test('page navigation tears down a running preview',async()=>{
  const s=setup();s.w.CabanaLocationFlight.open(s.opts);await flush();s.w.dispatchEvent(new s.w.Event('pagehide'));
  assert.equal(s.dialog(),null);assert.ok(s.maps[0].removed);s.finish();
});

function mapSetup(rows=[]) {
  const dom=new JSDOM('',{url:'https://cabana.africa',runScripts:'outside-only'});const queries=[];
  dom.window.ApaGeo={search:async(q,o)=>{queries.push({q,o});return rows;}};
  dom.window.eval(mapSource);return {dom,api:dom.window.ApaMap,queries};
}
test('public area is deterministic, displaced, within 500m, and supports numeric coordinate strings',async()=>{
  const s=mapSetup(),o={id:'listing-1',lat:'-1.267',lng:'36.806',radius:500};
  const a=await s.api.approxLocation(o),b=await s.api.approxLocation(o);
  assert.deepEqual(a,b);const distance=s.api.distance(-1.267,36.806,...a.center);assert.ok(distance>=225&&distance<=450);
  assert.equal(s.queries.length,0);s.dom.window.close();
});
test('null, blank, boolean, non-finite and out-of-range coordinates geocode the supplied area rather than (0,0)',async()=>{
  const s=mapSetup([{lat:-4.28,lng:39.58}]);
  for(const invalid of [null,undefined,'',false,[],NaN,Infinity,91,'not a number']){
    const a=await s.api.approxLocation({lat:invalid,lng:0,id:'coast',query:'Diani, Kenya',country:'KE'});
    assert.ok(s.api.distance(-4.28,39.58,...a.center)<500);
  }
  assert.equal(s.queries.length,9);assert.equal(s.queries[0].q,'Diani, Kenya');assert.equal(s.queries[0].o.country,'KE');s.dom.window.close();
});
test('real equator/prime-meridian zero is valid; unknown locations return null',async()=>{
  const s=mapSetup();assert.ok(await s.api.approxLocation({lat:0,lng:0,id:'gulf'}));assert.equal(s.queries.length,0);
  assert.equal(await s.api.approxLocation({lat:null,lng:null,query:'Unknown place'}),null);s.dom.window.close();
});
test('approximate points remain valid and near the listing at the poles and date line',async()=>{
  const s=mapSetup();
  for(const pt of [[89.999,179.999],[-89.999,-179.999],[0,180],[0,-180]]){
    const a=await s.api.approxLocation({lat:pt[0],lng:pt[1],id:'edge'});
    assert.ok(Math.abs(a.center[0])<=90&&Math.abs(a.center[1])<=180);assert.ok(s.api.distance(...pt,...a.center)<501);
  }
  s.dom.window.close();
});
