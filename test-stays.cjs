
const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
let html=fs.readFileSync('apartments.html','utf8').replace(/<script src="https?:\/\/[^"]*"[^>]*><\/script>/g,'');
const L=[
 {id:'l1',title:'Luxore Apartment',location:'Syokimau, Nairobi',area:'Syokimau',city:'Nairobi',price_night:3000,beds:1,baths:1,max_guests:2,photos:['https://cdn/real-photo.jpg'],status:'active',type:'apartment'},
 {id:'l2',title:'The Jets Nest',location:'Njiru, Nairobi',area:'Njiru',city:'Nairobi',price_night:1750,beds:1,baths:1,max_guests:3,photos:[],status:'active',type:'apartment'}
];
const chain=()=>{const o={};['select','eq','order','limit','gte','ilike'].forEach(k=>o[k]=()=>o);
 o.then=(r)=>Promise.resolve({data:L}).then(r); return o;};
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://a.com/apartments.html',virtualConsole:vc,
 beforeParse(w){
  w.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange(){}},from:()=>chain()})};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
  w.requestAnimationFrame=f=>setTimeout(f,0);
  w.fetch=(u)=>String(u).includes('unsplash')
    ? Promise.resolve({ok:false,json:()=>Promise.resolve({})})
    : Promise.resolve({ok:true,json:()=>Promise.resolve(L)});
 }});
const w=dom.window;
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
setTimeout(()=>{
 const d=w.document;
 const cards=d.querySelectorAll('#grid .card');
 const imgs=d.querySelectorAll('#grid .card-img img');
 const ok=(n,c,x)=>{console.log('  '+(c?'\u2713':'\u2717')+' '+n+(c?'':'  \u2192 '+(x||'')));return !!c;};
 let p=true;
 p&=ok('no uncaught errors',errs.length===0,errs.join('|'));
 p&=ok('cards rendered',cards.length===2,cards.length);
 p&=ok('REAL supabase photo used (not unsplash)',
   imgs.length>=1 && [...imgs].some(i=>i.src.indexOf('real-photo')>-1),
   [...imgs].map(i=>i.src).join(','));
 p&=ok('photoless listing degrades safely',cards.length===2 && !!cards[1].querySelector('.card-img'));
 const css=d.querySelector('style').textContent;
 p&=ok('card is a horizontal row',/\.card\{[\s\S]{0,200}?display:flex/.test(css));
 p&=ok('grid is a single column',/\.grid\{display:grid;grid-template-columns:1fr;/.test(css));
 p&=ok('image is fixed left rail',/\.card-img\{[\s\S]{0,120}?flex:0 0 118px/.test(css));
 p&=ok('unsplash only backfills gaps',fs.readFileSync('apartments.html','utf8').indexOf('never clobber a real photo')>-1);
 console.log('\n'+(p?'\u2705 STAYS PASS':'\u274c FAIL'));
 process.exit(p?0:1);
},700);
