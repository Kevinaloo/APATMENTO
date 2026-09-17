import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
const source=readFileSync(new URL('../ambassador-dashboard.js',import.meta.url),'utf8');
const render=source.slice(source.indexOf('async function paintBuilt()'),source.indexOf('/* ── The fee ladder'));
async function history(transfers, drafts=[], error=null) {
 const dom=new JSDOM('<section id="built-sec" hidden><div id="built"></div></section>');
 const filters=[];
 const q={select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return Promise.resolve({data:drafts,error})}};
 const c={document:dom.window.document,window:{ApaSession:{client:()=>({from:()=>q})}},STATE:{me:{id:'sender'},transfers},$:id=>dom.window.document.getElementById(id),esc:s=>String(s).replaceAll('<','&lt;'),ago:s=>s};
 vm.createContext(c);vm.runInContext(render,c);await c.paintBuilt();
 return {text:c.document.body.textContent,html:c.document.body.innerHTML,filters,dom};
}
test('accepted handovers and pending drafts appear together, deduplicated by listing',async()=>{
 const h=await history([{listing_id:'accepted',status:'accepted',to_name:'Owner',accepted_at:'2026-09-01'},{listing_id:'accepted',status:'cancelled'},{listing_id:'draft',status:'pending'}],[{id:'draft',title:'Coastal studio'}]);
 assert.match(h.text,/1 owner accepted · 1 awaiting owner · 2 listings recorded/);
 assert.match(h.text,/Owner accepted/);assert.match(h.text,/Coastal studio/);
 assert.ok(!h.html.includes(' hidden'));
 assert.deepEqual(h.filters,[['partner_id','sender'],['ownership_type','on_behalf']]);
});
test('closed invitations are not presented as awaiting an owner',async()=>{
 const h=await history([{listing_id:'a',status:'pending',expires_at:'2020-01-01'},{listing_id:'b',status:'declined'},{listing_id:'c',status:'cancelled'}]);
 assert.match(h.text,/0 awaiting owner/);for(const word of ['expired','declined','cancelled'])assert.ok(h.text.includes(word));
});
test('failed draft fetch preserves accepted history and offers retry',async()=>{
 const h=await history([{listing_id:'a',status:'accepted'}],[],{message:'offline'});
 assert.match(h.text,/1 owner accepted/);assert.ok(h.dom.window.document.getElementById('retry-built'));
});
test('role discovery points newcomers to public pages, while members retain dashboard routes',()=>{
 const dom=new JSDOM('',{url:'https://cabana.africa/',runScripts:'outside-only'});
 dom.window.eval(readFileSync(new URL('../apa-roles.js',import.meta.url),'utf8'));
 const roles=dom.window.ApaRoles;
 assert.equal(roles.roleFor('influencer').join,'influencers.html');
 assert.equal(roles.roleFor('agent').join,'agents.html');
 assert.equal(roles.roleFor('influencer').href,'agent-dashboard.html?mode=influencer');
 dom.window.close();
});

test('legacy partner entry routes reach the public experiences',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(config.redirects.some(route=>route.source==='/become-agent'&&route.destination==='/agents'&&route.permanent===true));
 const auth=readFileSync(new URL('../auth.html',import.meta.url),'utf8');
 const creators=readFileSync(new URL('../influencers.html',import.meta.url),'utf8');
 assert.match(auth,/location\.replace\('\/influencers'\)/);
 assert.match(creators,/panel=influencer&amp;intent=login/);
});

test('partner assets are versioned so existing browsers receive the redesign',()=>{
 const root=new URL('../',import.meta.url);
 const html=readdirSync(root).filter(file=>file.endsWith('.html')).map(file=>readFileSync(new URL(file,root),'utf8')).join('\n');
 for(const asset of ['pwa','apa-roles']) assert.doesNotMatch(html,new RegExp(`src="/${asset}\\.js"`));
 for(const asset of ['ambassador-dashboard','cabana-spotlight','cabana-programmes','ambassadors-page']) {
  assert.doesNotMatch(html,new RegExp(`src="/${asset}\\.js"`));
 }
 for(const asset of ['cabana-spotlight','cabana-programmes','ambassador-experience']) {
  assert.doesNotMatch(html,new RegExp(`href="/${asset}\\.css"`));
 }
 const pwa=readFileSync(new URL('../pwa.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(pwa,/register\('\/sw\.js\?v=35-programmes',[\s\S]*updateViaCache: 'none'/);
 assert.match(worker,/cabana-v35-programmes/);
});
