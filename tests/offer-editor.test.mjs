import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const code=readFileSync(new URL('../cabana-offers.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const listing={id:'stay-1',title:'The Jets Nest',partner_id:'host-1',currency:'KES',price_night:1500,service:'stays'};
const existing={id:'offer-1',host_id:'host-1',listing_id:'stay-1',title:'My current offer',status:'paused',discount_pct:15,floor_nightly:1300,reference_nightly:1500,terms_key:'same',booking_start:'2026-12-01T08:15:37.000Z',booking_end:'2026-12-20T19:25:42.000Z',stay_start:'2026-12-02',stay_end:'2026-12-28',min_nights:3,max_nights:10,min_lead_days:2,max_lead_days:40,timezone:'Africa/Nairobi',weekdays:[1,2,3,4],excluded_dates:['2026-12-12'],created_at:'2026-09-10'};
async function setup({offers=[],campaigns=[],rpc,admin=false}={}){
 const dom=new JSDOM('<div id="offers"></div>',{runScripts:'outside-only',url:'https://cabana.africa/partner-listings'});
 const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
 const NativeDate=w.Date;w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-09-10T12:00:00Z']));}static now(){return Date.parse('2026-09-10T12:00:00Z');}};
 const rows={listings:[listing],stay_offers:offers,stay_offer_campaigns:campaigns},writes=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'host-1'}}}})},rpc:rpc||(async()=>({data:{reference_nightly:1500,verified:false,terms_key:'same'}})),from(table){let data=null;const q={};
  for(const method of ['select','is','eq','in','order','limit','single'])q[method]=()=>q;
  q.insert=row=>{data={...row};return q;};q.update=row=>{data={...row};return q;};
  q.then=(resolve,reject)=>Promise.resolve().then(()=>{if(data){writes.push({table,row:data});return {data:{id:'saved'}};}return {data:rows[table]};}).then(resolve,reject);return q;
 }};
 w.eval(code);const root=w.document.getElementById('offers');await w.CabanaOffers.mount({client,root,admin});
 return {w,root,writes,click:s=>{const b=root.querySelector(s);assert.ok(b,s);b.click();},value:(name,value)=>{const f=root.querySelector('[name="'+name+'"]');f.value=value;f.dispatchEvent(new w.Event('input',{bubbles:true}));}};
}
test('new offer uses three steps, keeps price visible, and writes only after publication',async()=>{
 const a=await setup();a.click('[data-new]');await flush();
 assert.equal(a.root.querySelector('[data-step="0"]').hidden,false);
 assert.equal(a.root.querySelector('[data-step="1"]').hidden,true);
 assert.match(a.root.querySelector('[data-preview]').textContent,/1,350/);
 assert.match(a.root.querySelector('[data-preview]').textContent,/1,650/);
 a.click('[data-next]');a.click('[data-discount="20"]');a.click('[data-next]');
 assert.equal(a.root.querySelector('[data-step="2"]').hidden,false);assert.equal(a.writes.length,0);
 a.click('[data-publish]');await flush();await flush();
 assert.equal(a.writes.length,1);assert.equal(a.writes[0].row.status,'active');assert.equal(a.writes[0].row.discount_pct,20);
 assert.match(a.root.querySelector('[data-notice]').textContent,/live/);
});
test('existing offer edits preserve hidden eligibility, exact timestamps and paused status',async()=>{
 const a=await setup({offers:[existing]});a.click('[data-edit]');await flush();a.click('[data-next]');a.click('[data-next]');
 a.value('title','Updated name');a.click('[data-publish]');await flush();await flush();
 const r=a.writes[0].row;
 for(const key of ['floor_nightly','booking_start','booking_end','timezone','min_nights','max_nights','min_lead_days','max_lead_days','status'])assert.equal(r[key],existing[key],key);
 assert.deepEqual(Array.from(r.weekdays),existing.weekdays);assert.deepEqual(Array.from(r.excluded_dates),existing.excluded_dates);
});
test('draft is saved without activating the offer',async()=>{
 const a=await setup();a.click('[data-new]');await flush();a.click('[data-next]');a.click('[data-next]');a.click('[data-draft]');await flush();
 assert.equal(a.writes[0].row.status,'draft');
});
test('invalid dates keep the host on the dates step and prevent saving',async()=>{
 const a=await setup();a.click('[data-new]');await flush();a.click('[data-next]');a.value('stay_end','2020-01-01');a.click('[data-next]');
 assert.equal(a.root.querySelector('[data-step="1"]').hidden,false);assert.match(a.root.querySelector('[data-form-error]').textContent,/after/);assert.equal(a.writes.length,0);
});
test('unavailable price cannot be published and offers a retry',async()=>{
 const a=await setup({rpc:async()=>({error:{message:'Network error'}})});a.click('[data-new]');await flush();
 assert.ok(a.root.querySelector('[data-retry]'));a.click('[data-next]');a.click('[data-next]');assert.equal(a.writes.length,0);assert.equal(a.root.querySelector('[data-step="1"]').hidden,false);
});
test('campaign participation keeps exact invitation timestamps and chosen discount',async()=>{
 const campaign={id:'campaign-1',title:'Christmas',description:'A festive stay',status:'published',booking_start:'2026-12-01T01:22:33.000Z',booking_end:'2026-12-24T20:30:40.000Z',stay_start:'2026-12-02',stay_end:'2026-12-30',min_discount:5,max_discount:20,timezone:'Africa/Nairobi',countries:['Kenya']};
 const a=await setup({campaigns:[campaign]});a.click('[data-tab="campaigns"]');a.click('[data-join]');await flush();a.click('[data-next]');a.click('[data-discount="15"]');a.click('[data-next]');a.click('[data-publish]');await flush();
 assert.equal(a.writes[0].row.campaign_id,campaign.id);assert.equal(a.writes[0].row.booking_start,campaign.booking_start);assert.equal(a.writes[0].row.booking_end,campaign.booking_end);assert.equal(a.writes[0].row.discount_pct,15);
});
test('choosing plan ahead provides stay dates with room for an eligible night',async()=>{
 const a=await setup();a.click('[data-new]');await flush();a.click('[data-preset="early"]');
 const first=new Date(a.root.querySelector('[name="stay_start"]').value);const last=new Date(a.root.querySelector('[name="stay_end"]').value);assert.ok(last-first>=86400000);assert.equal(a.root.querySelector('[name="min_lead_days"]').value,'30');
});
test('leaving changed editor asks to discard and does not write',async()=>{
 const a=await setup();a.click('[data-new]');await flush();a.click('[data-preset="long"]');a.click('[data-close]');
 assert.ok(a.root.querySelector('form'));assert.match(a.root.querySelector('[data-close]').textContent,/Discard/);a.click('[data-close]');assert.equal(a.root.querySelector('form'),null);assert.equal(a.writes.length,0);
});
test('admin can publish an invitation without enrolling a host',async()=>{
 const a=await setup({admin:true});a.click('[data-new]');a.value('title','December getaways');a.click('[data-save-status="published"]');await flush();await flush();
 assert.equal(a.writes.length,1);assert.equal(a.writes[0].table,'stay_offer_campaigns');assert.equal(a.writes[0].row.status,'published');assert.equal(a.writes[0].row.title,'December getaways');
});
test('joined campaign editor keeps economic terms locked',async()=>{
 const campaign={id:'campaign-1',title:'December',status:'published',description:'Welcome',booking_start:existing.booking_start,booking_end:existing.booking_end,stay_start:existing.stay_start,stay_end:existing.stay_end,min_discount:5,max_discount:30,timezone:'Africa/Nairobi',countries:[]};
 const a=await setup({admin:true,campaigns:[campaign],offers:[{...existing,campaign_id:campaign.id}]});a.click('[data-tab="campaigns"]');a.click('[data-campaign]');
 assert.equal(a.root.querySelector('[name="min_discount"]').disabled,true);a.value('description','Updated invitation');a.click('[data-save-status]');await flush();
 assert.deepEqual(Object.keys(a.writes[0].row).sort(),['description','status']);
});
test('local date display round-trips without shifting an edited booking window',async()=>{
 const a=await setup({offers:[existing]});a.click('[data-edit]');await flush();a.click('[data-next]');a.value('booking_end','2026-12-22T10:45');a.click('[data-next]');a.click('[data-publish]');await flush();
 assert.equal(a.writes[0].row.booking_end,new Date('2026-12-22T10:45').toISOString());
});
