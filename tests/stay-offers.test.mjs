import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const booking=readFileSync(new URL('../booking-confirm.html',import.meta.url),'utf8');
const apartments=readFileSync(new URL('../apartments.html',import.meta.url),'utf8');
const quoteCode=booking.slice(booking.indexOf('let STAY_QUOTE ='),booking.indexOf("document.getElementById('checkin-date').addEventListener"));
function setup(rpc){
  const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',hidden:false,disabled:false});return nodes.get(id);};
  el('checkin-date').value='2026-12-20';el('checkout-date').value='2026-12-22';
  const ctx=vm.createContext({document:{getElementById:el},sb:{rpc},apt:{id:'stay-1',price:999999},guestCount:2,
    creditFor:()=>0,refreshPayModeAmounts:()=>{},showToast:()=>{},CREDIT_APPLIED:0,Date,console});
  vm.runInContext(quoteCode+'\nthis.getQuote=()=>STAY_QUOTE;this.setGuests=n=>guestCount=n;',ctx);
  return {ctx,el};
}
function quote(args,extra={}){return {listing_id:'stay-1',title:'Verified stay',nights:2,nightly:1800,stay_total:3600,service_fee:300,grand_total:3900,guests:args.p_guests,max_guests:4,checkin:args.p_checkin,checkout:args.p_checkout,fingerprint:'price-3900',offer:null,...extra};}
test('checkout uses server totals and ignores a forged URL nightly price',async()=>{
  const {ctx,el}=setup(async(_,a)=>({data:quote(a)}));await ctx.refreshStayQuote();
  assert.equal(el('sum-total').textContent,'KES 3,900');assert.equal(ctx.apt.price,1800);assert.equal(el('pay-btn').disabled,false);
});
test('a price change requires another explicit payment attempt',async()=>{
  let total=3900;const {ctx}=setup(async(_,a)=>({data:quote(a,{grand_total:total,fingerprint:String(total)})}));
  await ctx.refreshStayQuote();total=4500;assert.equal(await ctx.confirmStayQuote(),false);assert.equal(await ctx.confirmStayQuote(),true);
});
test('failed quote prevents payment and clears the prior total',async()=>{
  const {ctx,el}=setup(async()=>({error:{message:'Quote unavailable'}}));assert.equal(await ctx.refreshStayQuote(),null);
  assert.equal(el('sum-total').textContent,'Price unavailable');assert.equal(el('pay-btn').disabled,true);assert.equal(await ctx.confirmStayQuote(),false);
});
test('late response cannot replace a newer guest/date quote',async()=>{
  let resolveFirst;const {ctx}=setup(async(_,a)=>a.p_guests===2?await new Promise(r=>resolveFirst=()=>r({data:quote(a)})):{data:quote(a,{fingerprint:'new-guests'})});
  const first=ctx.refreshStayQuote();ctx.setGuests(3);await ctx.refreshStayQuote();resolveFirst();await first;
  assert.equal(ctx.getQuote().guests,3);assert.equal(ctx.getQuote().fingerprint,'new-guests');
});
test('an offer without historical evidence does not claim savings',async()=>{
  const {ctx,el}=setup(async(_,a)=>({data:quote(a,{offer:{title:'Holiday offer',verified:false,total_saving:400}})}));
  await ctx.refreshStayQuote();assert.doesNotMatch(el('sum-offer').textContent,/You save/);assert.match(el('sum-offer').textContent,/included above/);
});
test('double payment quote checks cannot both proceed',async()=>{
  let complete;let wait=false;const {ctx}=setup(async(_,a)=>wait?await new Promise(r=>complete=()=>r({data:quote(a)})):{data:quote(a)});
  await ctx.refreshStayQuote();wait=true;const first=ctx.confirmStayQuote();assert.equal(await ctx.confirmStayQuote(),false);complete();assert.equal(await first,true);
});
test('stay card quote cannot leak across dates or guest counts',()=>{
  const code=apartments.slice(apartments.indexOf('let _stayQuotes ='),apartments.indexOf('async function loadStaySearchQuotes'));
  const ctx=vm.createContext({_searchState:{dateIn:'2026-12-20',dateOut:'2026-12-22',adults:2,children:0},_esc:s=>String(s).replace(/</g,'&lt;')});
  vm.runInContext(code+"\nthis.setQuotes=x=>_stayQuotes=x;",ctx);
  const apt={id:'stay-1',price:2000};ctx.setQuotes({'stay-1':quote({p_guests:2,p_checkin:'2026-12-20',p_checkout:'2026-12-22'})});
  assert.equal(ctx.staySortPrice(apt),1950);assert.match(ctx.stayCardPrice(apt),/3,900/);
  ctx._searchState.adults=3;assert.equal(ctx.staySearchQuote(apt),null);assert.doesNotMatch(ctx.stayCardPrice(apt),/3,900/);
});

test('host offer controls have an executable handler that mounts the existing section',async()=>{
  const html=readFileSync(new URL('../partner-listings.html',import.meta.url),'utf8');
  const scripts=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),m=>m[1]).join('\n');
  const handler=scripts.match(/async function openStayOffers\(listingId\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(handler,'handler must be inside a script element');
  const root={scrollIntoView(){}};let mounted;
  const offers={async mount(args){mounted=args;}};const sb={};
  const ctx=vm.createContext({document:{getElementById:()=>root},window:{CabanaOffers:offers},CabanaOffers:offers,sb});
  vm.runInContext(handler,ctx);await ctx.openStayOffers('stay-1');
  assert.equal(mounted.root,root);assert.equal(mounted.client,sb);assert.equal(mounted.listingId,'stay-1');
});
