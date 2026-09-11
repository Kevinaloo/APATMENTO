import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const script=readFileSync(new URL('../cabana-property-tour.js',import.meta.url),'utf8');
const id='65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
const shikaz='20b22953-2c13-4e6c-a5c4-3cbefcc20cae';
function setup(){
 const dom=new JSDOM('<button id="launch">Explore</button>',{url:'https://cabana.africa/apartments',runScripts:'outside-only'});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
 dom.window.eval(script);return dom;
}
test('tour matches the exact property id, never a name or another property',()=>{
 const d=setup(),api=d.window.CabanaPropertyTour;
 assert.match(api.section({id}),/Explore in 3D/);
 assert.match(api.section({_dbId:id,id:'native-1'}),/Explore in 3D/);
 assert.equal(api.section({id:'other',name:'The Jets Nest'}),'');d.window.close();
});
test('both tour properties have badges while similarly named Shikaz listings do not',()=>{
 const d=setup(),api=d.window.CabanaPropertyTour;
 for(const property of [id,shikaz]){assert.match(api.badge({_dbId:property}),/3D TOUR/);assert.match(api.section({id:property}),/Explore in 3D/);}
 assert.equal(api.badge({id:'82132f0e-3987-46be-9bf0-7c98160d1944',name:'Shikaz Homes 2 Br @JKIA Syokimau'}),'');
 assert.equal(api.section({id:'other',name:'Shikaz Homes'}),'');
 assert.equal(d.window.document.querySelectorAll('iframe').length,0);d.window.close();
});
test('opening Shikaz selects its own tour and unknown ids cannot launch a tour',()=>{
 const d=setup(),api=d.window.CabanaPropertyTour;
 api.open('unknown');assert.equal(d.window.document.querySelectorAll('iframe').length,0);
 api.open(shikaz);assert.match(d.window.document.querySelector('iframe').src,/\/tours\/shikaz-homes\/index.html$/);
 assert.equal(d.window.document.querySelector('#cabana-tour-title').textContent,'Shikaz Homes');api.close();
 api.open(id);assert.match(d.window.document.querySelector('iframe').src,/\/jets-nest\//);api.close();d.window.close();
});
test('gallery entry is inert until opened and closing releases its iframe and focus',()=>{
 const d=setup(),w=d.window,api=w.CabanaPropertyTour;
 w.document.body.insertAdjacentHTML('beforeend',api.section({id}));
 assert.equal(w.document.querySelectorAll('iframe').length,0);
 w.document.body.style.overflow='hidden';w.document.getElementById('launch').focus();
 api.open();api.open();assert.equal(w.document.querySelectorAll('iframe').length,1);
 assert.match(w.document.querySelector('iframe').src,/\/tours\/jets-nest\/index.html$/);
 api.close();assert.equal(w.document.querySelectorAll('iframe,dialog').length,0);
 assert.equal(w.document.body.style.overflow,'hidden');assert.equal(w.document.activeElement.id,'launch');
 api.open();w.document.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));
 assert.equal(w.document.querySelectorAll('iframe').length,0);d.window.close();
});
test('foreign messages cannot close the view',()=>{
 const d=setup(),w=d.window;w.CabanaPropertyTour.open();
 w.dispatchEvent(new w.MessageEvent('message',{origin:'https://untrusted.example',data:{type:'cabana-tour-close'}}));
 assert.ok(w.document.querySelector('iframe'));w.CabanaPropertyTour.close();d.window.close();
});
test('both viewers use absolute asset URLs that survive cleanUrls redirects',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const [slug,count] of [['jets-nest',17],['shikaz-homes',18]]){
  for(const suffix of ['', '/'])assert.ok(config.rewrites.some(r=>r.source==='/tours/'+slug+suffix&&r.destination==='/tours/'+slug+'/index.html'));
  const html=readFileSync(new URL('../tours/'+slug+'/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/(?:href|src)="\.\//);
  const refs=[...html.matchAll(/(?:href="|import\(")([^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]);
  assert.ok(refs.length>=2);
  for(const ref of refs){assert.ok(ref.startsWith('/tours/'+slug+'/'));assert.ok(existsSync(new URL('..'+ref,import.meta.url)));}
  for(let i=1;i<=count;i++)assert.ok(existsSync(new URL('../tours/'+slug+'/photos/'+i+'.jpg',import.meta.url)));
 }
});
