import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';

const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function page(name='add-listing.html'){
  const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>{if(!/navigation|Not implemented/.test(e.message))errors.push(e);});
  const dom=new JSDOM(source(name),{url:'https://cabana.test/'+name+'?from=partner',runScripts:'dangerously',virtualConsole:console,beforeParse(w){
    w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.reportValidity=()=>true;
  }});
  for(const name of ['cabana-listing-cards.js','cabana-listing-journeys.js']){const script=dom.window.document.createElement('script');script.textContent=source(name);dom.window.document.body.append(script);}
  return {dom,w:dom.window,d:dom.window.document,errors};
}
const tick=()=>new Promise(r=>setTimeout(r,5));
test('service choices choose and type swipe reaches real validated fields',async()=>{
  const {dom,w,d,errors}=page();
  d.querySelector('#step-0 .cc-yes').click();await tick();
  assert.equal(w.eval('F.svc'),'stays');assert.equal(w.eval('cur'),1);
  d.querySelector('#step-1 .cc-yes').click();await tick();
  assert.equal(w.eval('cur'),2);assert.ok(w.eval('F.type'));
  assert.ok(d.querySelector('#step-2').classList.contains('cc-form'));
  assert.ok(d.getElementById('f-title').isConnected);assert.deepEqual(errors,[]);dom.window.close();
});
test('features support yes, no, undo and exact previous answer restoration',async()=>{
  const {dom,w,d}=page();w.eval("F.svc='stays';F.feats=[];go(4)");
  const first=w.eval('SVCS.stays.feats[0]'),second=w.eval('SVCS.stays.feats[1]');
  d.querySelector('#step-4 .cc-yes').click();await tick();assert.ok(w.eval('F.feats').includes(first));
  d.querySelector('#step-4 .cc-no').click();await tick();assert.ok(!w.eval('F.feats').includes(second));
  d.querySelector('#step-4 .cc-undo').click();assert.equal(d.querySelector('#step-4 .cc-choice-title').textContent,second);
  d.querySelector('#step-4 .cc-undo').click();assert.equal(w.eval('F.feats.length'),0);dom.window.close();
});
test('back retains unsubmitted dynamic details and switching service isolates answers',()=>{
  const {dom,w,d}=page();w.eval("F.svc='shopping';go(3)");d.getElementById('f-brand').value='My original brand';w.go(2);w.go(3);assert.equal(d.getElementById('f-brand').value,'My original brand');
  w.go(0);w.selSvc(d.querySelector('[data-svc=food]'));w.go(3);assert.equal(w.eval('F.brand'),'');
  w.go(0);w.selSvc(d.querySelector('[data-svc=shopping]'));w.go(3);assert.equal(d.getElementById('f-brand').value,'My original brand');dom.window.close();
});
test('roommates can reach photos and cannot leave photos empty',()=>{
  const {dom,w}=page();w.eval("F.svc='roommates';F.photos=[]");assert.equal(w.valid(4),true);assert.equal(w.valid(6),false);dom.window.close();
});
test('all dedicated journeys mount without losing or duplicating field IDs',()=>{
  for(const file of ['list-your-tour.html','list-your-event.html','list-your-fleet.html','become-driver.html']){
    const before=new JSDOM(source(file));const ids=Array.from(before.window.document.querySelectorAll('input[id],select[id],textarea[id]')).map(el=>el.id);
    const {dom,d,errors}=page(file);
    for(const id of ids)assert.equal(d.querySelectorAll('[id="'+id+'"]').length,1,`${file}: ${id}`);
    assert.ok(d.querySelector('.cc-form'),file);assert.ok(d.querySelector('.cc-assist'),file);
    assert.equal(errors.filter(e=>/cabana-listing/.test(e.stack||'')).length,0);dom.window.close();before.window.close();
  }
});
test('form Enter advances cards, never invokes submit before review',()=>{
  const {dom,w,d}=page('list-your-tour.html');const form=d.getElementById('f-tour');
  d.getElementById('t-title').value='A real tour';let submissions=0;form.addEventListener('submit',()=>submissions++);
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(submissions,0);assert.match(form.querySelector('.cc-form-top').textContent,/Card 2/);
  form.querySelector('.cc-form-top .cc-text').click();form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(submissions,1);dom.window.close();
});
test('assisted request retries reuse ID, retain details and prevent duplicate sends',async()=>{
  const {dom,w,d}=page('list-your-tour.html');let attempts=[];w.ApaSession={client:()=>({from:table=>({insert:async payload=>{attempts.push({table,payload});return attempts.length===1?{error:{code:'network'}}:{error:null};}})})};
  const form=d.querySelector('.cc-assist-dialog form');d.getElementById('cc-assist-name').value='Test Person';d.getElementById('cc-assist-phone').value='+44 7911 123456';
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(d.getElementById('cc-assist-name').value,'Test Person');
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(attempts[0].payload.id,attempts[1].payload.id);assert.equal(attempts[1].payload.phone,'+447911123456');assert.equal(attempts[1].payload.listing_type,'tours');
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(attempts.length,2);assert.match(form.textContent,/Request received/);dom.window.close();
});
