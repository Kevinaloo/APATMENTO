import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = file => readFileSync(join(ROOT,file),'utf8');
const HTML = read('rides.html');
const SCRIPT = read('cabana-rides.js');
const CONTROL_PLANE = read('supabase/migrations/20260904194457_rides_africa_control_plane.sql');
const REFERENCE_FIX = read('supabase/migrations/20260904194741_rides_africa_reference_generator.sql');
const RIDES_HARDENING = read('supabase/migrations/20260904195141_rides_africa_indexes_and_driver_privacy.sql');

function boot() {
  let inserted = null;
  const dom = new JSDOM(HTML,{url:'https://cabana.africa/rides',runScripts:'outside-only'});
  const emptyBuilder = {
    select(){return this;}, order(){return this;}, eq(){return this;}, in(){return this;}, limit(){return this;},
    then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}
  };
  dom.window.__rdSb = {
    from(){
      return Object.assign(Object.create(emptyBuilder),{
        insert(payload){inserted=payload;return Promise.resolve({data:null,error:null});}
      });
    }
  };
  dom.window.eval(SCRIPT);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return {dom,getInserted:()=>inserted};
}

test('Rides exposes all 54 African countries and the complete mode catalogue',async()=>{
  const {dom}=boot();
  await new Promise(resolve=>setTimeout(resolve,0));
  const api=dom.window.CabanaRides;
  assert.equal(api.AFRICA_COUNTRIES.length,54);
  assert.equal(new Set(api.AFRICA_COUNTRIES.map(c=>c.code)).size,54);
  assert.equal(Array.from(dom.window.document.querySelectorAll('#rd-country option')).filter(option=>option.value).length,54);
  assert.equal(api.FALLBACK_MODES.length,12);
  for(const key of ['car','electric','minibus','tuk_tuk','motorcycle','bicycle','e_bike','accessible','boat','horse','helicopter','shuttle']) {
    assert.ok(api.FALLBACK_MODES.some(mode=>mode.key===key),`missing ${key}`);
  }
});

test('money formatting honours each currency exponent instead of assuming cents',()=>{
  const {dom}=boot();
  const format=dom.window.CabanaRides.moneyMinor;
  assert.match(format(1250,'USD'),/12\.50/);
  assert.match(format(5000,'XOF'),/5,000/);
});

test('a trip price card applies only to its approved market and named route',()=>{
  const {dom}=boot();
  const api=dom.window.CabanaRides,doc=dom.window.document;
  api.state.markets=[{id:'market-ke',country_code:'KE',city:null,active:true}];
  api.state.countryCode='KE'; api.state.modeKey='boat';
  doc.getElementById('rd-pickup').value='Lamu Old Town';
  doc.getElementById('rd-destination').value='Manda Airport Jetty';
  const card={id:'price-1',market_id:'market-ke',mode_key:'boat',unit:'trip',route_from:'Lamu',route_to:'Manda Airport',bidirectional:false};
  assert.equal(api.priceApplies(card),true);
  doc.getElementById('rd-destination').value='Malindi';
  assert.equal(api.priceApplies(card),false);
  api.state.countryCode='TZ';
  assert.equal(api.priceApplies(card),false);
});

test('request submission sends no calculated or client-approved fare',async()=>{
  const {dom,getInserted}=boot();
  const doc=dom.window.document;
  await new Promise(resolve=>setTimeout(resolve,0));
  doc.getElementById('rd-pickup').value='Nairobi CBD';
  doc.getElementById('rd-pickup').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  doc.getElementById('rd-destination').value='Kilimani';
  doc.getElementById('rd-destination').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(doc.getElementById('rd-submit').disabled,false);
  doc.getElementById('rd-request-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  doc.getElementById('rd-name').value='Test Rider';
  doc.getElementById('rd-phone').value='+254700000000';
  doc.getElementById('rd-send').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  const payload=getInserted();
  assert.ok(payload);
  assert.equal(payload.country_code,'KE');
  assert.equal(payload.mode_key,'car');
  assert.equal(payload.quote_total,null);
  assert.equal(payload.approved_price_card_id,null);
  assert.ok(!Object.hasOwn(payload,'status'));
  assert.ok(!Object.hasOwn(payload,'distance_km'));
  assert.ok(!Object.hasOwn(payload,'duration_min'));
});

test('the public and admin surfaces contain no legacy client fare engine',()=>{
  assert.doesNotMatch(HTML,/cabana-fare\.js/);
  assert.doesNotMatch(SCRIPT,/base_fare|per_km|per_min|estimateFare|estimated fare/i);
  const admin=read('cabana-rides-admin.js');
  assert.match(admin,/ride_price_cards/);
  assert.match(admin,/approved_quote_minor/);
  assert.match(admin,/Publishing a price is an explicit approval action/);
});

test('the database cutover defaults to no prices and uses a portable protected reference generator',()=>{
  assert.match(CONTROL_PLANE,/update public\.ride_tariffs set active=false where active/);
  assert.match(CONTROL_PLANE,/update public\.ride_fixed_routes set active=false where active/);
  assert.doesNotMatch(CONTROL_PLANE,/insert into public\.ride_price_cards/i);
  assert.doesNotMatch(REFERENCE_FIX,/gen_random_bytes/);
  assert.match(REFERENCE_FIX,/gen_random_uuid\(\)/);
  assert.match(REFERENCE_FIX,/revoke all on function public\.cabana_guard_ride_request_insert\(\) from public,anon,authenticated/);
  assert.match(RIDES_HARDENING,/ride_requests_approved_price_card_idx/);
  assert.match(RIDES_HARDENING,/revoke all on function public\.cab_nearby_drivers/);
});
