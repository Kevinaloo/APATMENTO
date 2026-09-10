import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const script=readFileSync(new URL('../cabana-property-tour.js',import.meta.url),'utf8');
const id='65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
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
test('viewer asset references resolve and all room photos are included',()=>{
 const html=readFileSync(new URL('../tours/jets-nest/index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/(?:href|src)="\.\/(.*?)"/g))assert.ok(existsSync(new URL('../tours/jets-nest/'+match[1],import.meta.url)));
 for(let i=1;i<=17;i++)assert.ok(existsSync(new URL('../tours/jets-nest/photos/'+i+'.jpg',import.meta.url)));
});
