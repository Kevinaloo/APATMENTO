// Isolated browser regression for profiles v2: the studio, the public
// profile page, the three ticks on a listing, follow and the sheet.
// No real accounts, uploads or identity checks. Screenshots go to
// artifacts/people-ui/.  CABANA_BROWSER_PATH=/path/to/chrome to override.
const {chromium}=require(process.env.CABANA_PLAYWRIGHT || 'playwright');
const {createServer}=require('node:http');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve,extname,sep}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../..'),out=resolve(root,'artifacts/people-ui');
const listingId='65ef1d11-a4e3-4250-bbac-f826c0cd10d2',me='11111111-1111-4111-8111-111111111111',host='22222222-2222-4222-8222-222222222222',org='33333333-3333-4333-8333-333333333333';
const listing={id:listingId,title:'The Jets Nest',partner_id:host,is_active:true,status:'active',deleted_at:null,type:'apartment',service:'stays',city:'Nairobi',area:'Kilimani',location:'Kilimani, Nairobi',price_night:4500,beds:1,max_guests:2,photos:[1,2,3].map(n=>'/tours/jets-nest/photos/'+n+'.jpg')};
const mock=`(()=>{
  const user={id:${JSON.stringify(me)},email:'qa@example.test',created_at:'2026-01-01',user_metadata:{first_name:'Amani'}};
  const state={status:'user',user,name:'Amani',initial:'A',role:'guest',isAdmin:false};
  const tables={listings:[${JSON.stringify(listing)}],profiles:[{id:user.id,first_name:'Amani'}],chat_conversations:[],chat_messages:[]};
  const query=table=>{let single=false;const q={then:(res,rej)=>Promise.resolve({data:single?(tables[table]||[])[0]||null:(tables[table]||[]),error:null,count:0}).then(res,rej)};
    for(const k of ['select','limit','order','or','in','gte','lte','gt','lt','neq','is','not','filter','eq','insert','update','upsert'])q[k]=()=>q;q.single=q.maybeSingle=()=>(single=true,q);return q;};
  const channel={on(){return this},subscribe(){return this},unsubscribe(){}};
  const client={from:query,rpc:async()=>({data:[],error:null}),channel:()=>Object.create(channel),removeChannel(){},
    storage:{from:()=>({upload:async()=>({data:{},error:null})})},
    auth:{getSession:async()=>({data:{session:{user,access_token:'qa-only'}}}),getUser:async()=>({data:{user}}),updateUser:async()=>({data:{},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
  window.sb=client;window.supabase={createClient:()=>client};window.ApaSession={client:()=>client,get:()=>state,ready:f=>{f(state)},subscribe:f=>{f(state);return ()=>{}},token:async()=>'qa-only'};
})();`;

/* ── a stateful stand-in for /api/people ─────────────────────────── */
const db={
  saves:[],follows:new Set(),
  me:{display_name:'Amani O.',handle:'amani.o',headline:'',bio:'',account_type:'individual',org_kind:null,org_website:null,city:'',country_code:null,show_location:false,languages:[],interests:[],theme:'equator',avatar:null,published:false,show_followers:true,allow_follow:true,show_listings:true,photo_url:null,photo_status:'none',photo_pending:false,photo_locked:false},
};
const base={roles:['traveller'],member_since:'2026-01',operators:[],languages:[],interests:[],listings:[],identity_since:null,org_since:null};
let profileOf=function(id){
  if(id===me||id==='amani.o'){const s=db.me;return {...base,id:me,name:s.display_name,level:'self',handle:s.handle,type:s.account_type,avatar:s.avatar,photo:null,badge:null,verified_as:null,headline:s.headline,bio:s.bio,theme:s.theme,can_follow:false,
    stats:{followers:2,following:5,listings:0,reviews:0,rating:null},viewer:{signed_in:true,self:true,following:false},settings:{...s},
    verification:{identity:{state:'not_started',available:true,session:null,last_decline:null},organization:null,can_upload_photo:false,provider:false}};}
  if(id===host||id==='jets.nest')return {...base,id:host,name:'Jets Nest Homes',level:'full',handle:'jets.nest',type:'individual',avatar:{v:1,k:'p',s:2,h:5,hc:0,fc:2,e:0,m:2,f:0,x:2,w:0,o:1,b:2,mo:1,n:'amani'},photo:null,badge:'provider',verified_as:'individual',
    headline:'Design-led apartments in Kilimani',bio:'Three calm, bright apartments ten minutes from Yaya Centre. Early check-in whenever we can.',theme:'ocean',roles:['traveller','host'],identity_since:'2026-08',
    languages:['en','sw'],interests:['city-breaks','food'],can_follow:true,stats:{followers:41+(db.follows.has(host)?1:0),following:3,listings:1,reviews:12,rating:4.9},viewer:{signed_in:true,self:false,following:db.follows.has(host)},
    listings:[{id:listingId,title:'The Jets Nest',place:'Kilimani, Nairobi',photo:'/tours/jets-nest/photos/1.jpg',price:4500,currency:'KES',rating:4.9,reviews:12,url:'/apartments?open='+listingId}]};
  if(id===org)return {...base,id:org,name:'Mara Trails Ltd',level:'full',handle:'maratrails',type:'organization',avatar:{v:1,k:'e',sh:3,pt:1,c:2,g:4,mo:1},badge:'organization',verified_as:'organization',org_kind:'tour_operator',headline:'Small-group safaris',bio:'',theme:'savanna',can_follow:true,org_since:'2026-09',stats:{followers:120,following:0,listings:0,reviews:0,rating:null},viewer:{signed_in:true,self:false,following:false}};
  return null;
};
function card(id){const p=profileOf(id);return p&&{id:p.id,name:p.name,level:p.level,handle:p.handle,type:p.type,avatar:p.avatar,photo:p.photo,badge:p.badge,verified_as:p.verified_as,headline:p.headline,can_follow:p.can_follow};}
function people(u,body){
  const op=u.searchParams.get('op');
  if(op==='profile'){const p=profileOf(u.searchParams.get('id')||u.searchParams.get('handle'));return p?{json:{profile:p}}:{status:404,json:{error:'This profile is not available.'}};}
  if(op==='cards')return {json:{cards:Object.fromEntries(u.searchParams.get('ids').split(',').map(i=>[i,card(i)]))}};
  if(op==='identity')return {json:{identity:{verified:false,state:'not_started',pending:null,declined:db.dup?'duplicate_identity':null,duplicate_hint:db.dup?'u••••••••d@gmail.com':null},facts:[],roles:{},needs:{context:u.searchParams.get('for'),required:false,satisfied:false,why:'Guests see a purple tick on your listings.'}}};
  if(op==='verify-start')return {json:{state:'in_progress',url:origin+'/profile.html?didit=1'}};
  if(op==='follows')return {json:{people:[card(org),card(me)].filter(Boolean),next:null}};
  if(op==='save'){db.saves.push(body);if(/✓|✔/.test(body.display_name||''))return {status:400,json:{error:'Badges are added by Cabana after verification.',field:'display_name'}};Object.assign(db.me,body);return {json:{ok:true,handle:db.me.handle}};}
  if(op==='follow'){body.on?db.follows.add(body.id):db.follows.delete(body.id);return {json:{following:body.on,followers:41+(db.follows.has(body.id)?1:0)}};}
  return {json:{ok:true}};
}

(async()=>{
  mkdirSync(out,{recursive:true});
  const server=createServer((req,res)=>{try{let pathname=new URL(req.url,'http://local').pathname;if(pathname==='/')pathname='/index.html';if(/^\/u\/[\w.]+$/.test(pathname))pathname='/person.html';if(!extname(pathname))pathname+='.html';const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.statusCode=404;res.end()}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  let browser,page;
  try{
    browser=await chromium.launch(process.env.CABANA_BROWSER_PATH?{headless:true,executablePath:process.env.CABANA_BROWSER_PATH}:{headless:true,channel:process.env.CABANA_BROWSER_CHANNEL||'chrome'});
    const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['notifications']});
    await context.addInitScript(()=>Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>({}),getRegistrations:async()=>[],getRegistration:async()=>null,ready:new Promise(()=>{}),addEventListener(){}}}));
    const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
    await context.route('**/*',route=>{
      const u=new URL(route.request().url());
      if(u.pathname==='/vendor-supabase-2.112.3.js')return route.fulfill({contentType:'application/javascript',body:mock});
      if(u.pathname==='/apa-session.js')return route.fulfill({contentType:'application/javascript',body:''});
      if(u.pathname.startsWith('/rest/v1/'))return route.fulfill({json:u.pathname.endsWith('/listings')?[listing]:[]});
      if(u.pathname==='/api/people'){const r=people(u,JSON.parse(route.request().postData()||'{}'));return route.fulfill({status:r.status||200,json:r.json});}
      if(u.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,items:[],messages:[],suggestions:[],thread:null}});
      if(u.origin!==origin)return route.abort();
      return route.continue();
    });
    page=await context.newPage();

    /* 1 · profile studio */
    await page.goto(origin+'/profile.html');
    await page.waitForSelector('#tab-catalogue .opt');
    assert.equal(await page.locator('#hero-name').innerText(),'Amani O.');
    assert.equal(await page.locator('#tab-catalogue [data-pick]').count(),38,'38 people in the catalogue');
    assert.equal(await page.locator('.tier').count(),2,'purple and reef tiers for an individual');
    await page.screenshot({path:resolve(out,'studio.png'),fullPage:false});
    await page.locator('[data-pick="zawadi"]').click();
    await page.waitForSelector('#savebar.show');
    assert.equal(await page.locator('#stage-name').innerText(),'Zawadi');
    await page.locator('#tab-catalogue [data-sec="spirits"]').click();
    await page.locator('[data-pick="twiga"]').click();
    assert.equal(await page.locator('#stage-name').innerText(),'Twiga');
    await page.locator('[data-tab="customise"]').click();
    await page.locator('#tab-customise [data-k="a"][data-v="0"]').click();
    assert.equal(await page.locator('#stage-name').innerText(),'Simba');
    await page.locator('#look').screenshot({path:resolve(out,'look-customise.png')});
    await page.locator('[data-tab="photo"]').click();
    assert.match(await page.locator('#tab-photo').innerText(),/unlock when you verify your ID/);
    // a pasted checkmark is refused and the field is flagged
    await page.locator('#f-name').fill('Amani ✓');
    await page.locator('#save').click();
    await page.waitForSelector('#f-name.bad');
    await page.locator('#f-name').fill('Amani Otieno');
    await page.locator('[data-pref="published"]').click();
    await page.locator('#save').click();
    await page.waitForFunction(()=>!document.getElementById('savebar').classList.contains('show'));
    const saved=db.saves[db.saves.length-1];
    assert.equal(saved.display_name,'Amani Otieno');assert.equal(saved.published,true);assert.equal(saved.avatar.k,'a');
    assert.ok(!('email' in saved)&&!('phone' in saved),'studio never sends private fields');
    // organisation mode swaps to emblems and adds the gold tier
    await page.locator('[data-type="organization"]').click();
    await page.locator('[data-tab="catalogue"]').click();
    assert.equal(await page.locator('#tab-catalogue [data-pick^="e-"]').count(),8);
    assert.equal(await page.locator('.tier').count(),3);
    await page.locator('#verification').screenshot({path:resolve(out,'verification-org.png')});
    await page.locator('#discard').click();

    /* 2 · public profile page */
    await page.goto(origin+'/u/jets.nest');
    await page.waitForSelector('.cbp-name');
    assert.match(await page.locator('.cbp-name').innerText(),/Jets Nest Homes/);
    assert.equal(await page.locator('.cbp-name .cpt-provider').count(),1,'reef tick next to a verified provider');
    assert.doesNotMatch(await page.locator('.sheet').innerText(),/qa@example|phone|passport/i);
    await page.screenshot({path:resolve(out,'public-profile.png'),fullPage:true});
    await page.locator('.cbp-actions .cp-follow').click();
    await page.waitForFunction(()=>document.querySelector('.cbp-actions .cp-follow').getAttribute('aria-pressed')==='true');
    assert.equal(await page.locator('.cbp-stats b').first().innerText(),'42');
    await page.locator('.cbp-tickline').click();
    assert.match(await page.locator('.cbp-why').innerText(),/Only Cabana issues this mark/);

    /* 3 · the listing host card and sheet */
    await page.goto(origin+'/apartments.html?open='+listingId);
    await page.waitForSelector('.drawer.open .dl-host',{timeout:20000});
    await page.waitForSelector('.dl-host [data-cp-tick] .cpt-provider',{timeout:8000});
    await page.waitForSelector('.dl-host .dl-host-face svg.cav');
    assert.equal(await page.locator('.dl-host-follow').isVisible(),true);
    const skip=page.getByRole('button',{name:/^Skip/});if(await skip.count())await skip.first().click().catch(()=>{});await page.waitForTimeout(600);
    await page.evaluate(()=>document.querySelector('.drawer.open .dl-host').scrollIntoView({block:'center'}));await page.waitForTimeout(400);await page.locator('.drawer.open .dl-host').screenshot({path:resolve(out,'listing-host.png')});
    await page.locator('.dl-host-name').click();
    await page.waitForSelector('.cbp-dialog .cbp-name');
    await page.screenshot({path:resolve(out,'profile-sheet.png')});
    await page.getByRole('button',{name:'Close profile',exact:true}).click();

    /* 4 · partner nudge: one quiet line under the title, dismissible */
    await page.goto(origin+'/partner-listings.html');
    await page.waitForSelector('#cid-nudge',{timeout:15000});
    assert.equal(await page.locator('.pg-hd-left #cid-nudge').count(),1,'nudge sits inside the page header, not over content');
    assert.match(await page.locator('#cid-nudge').innerText(),/purple tick/);
    await page.locator('.pg-hd').screenshot({path:resolve(out,'partner-nudge.png')});
    await page.locator('#cid-nudge .cid-n-x').click();
    await page.waitForSelector('#cid-nudge',{state:'detached'});
    await page.reload();await page.waitForTimeout(2500);
    assert.equal(await page.locator('#cid-nudge').count(),0,'stays hidden after dismissal');
    /* 5 · duplicate identity is explained kindly */
    db.dup=true;
    const P0=profileOf;profileOf=id=>{const p=P0(id);if(p&&p.level==='self'){p.verification.identity.state='declined';p.verification.identity.last_decline='duplicate_identity';p.verification.identity.duplicate_hint='u••••••••d@gmail.com';}return p;};
    await page.goto(origin+'/profile.html');await page.waitForSelector('#verify-move');
    assert.match(await page.locator('#tiers').innerText(),/already verified on another Cabana account/);
    await page.locator('.tier.t-person').screenshot({path:resolve(out,'duplicate-identity.png')});
    profileOf=P0;db.dup=false;

    /* 6 · mobile */
    await page.setViewportSize({width:390,height:844});
    await page.goto(origin+'/profile.html');await page.waitForSelector('#tab-catalogue .opt');
    await page.screenshot({path:resolve(out,'studio-mobile.png')});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No mobile overflow on the studio');
    await page.goto(origin+'/u/jets.nest');await page.waitForSelector('.cbp-name');
    await page.screenshot({path:resolve(out,'public-profile-mobile.png'),fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No mobile overflow on the public profile');

    assert.deepEqual(errors,[]);
    console.log('PASS studio catalogue, customise, photo lock, badge-spoof guard, save, organisation mode, public profile, follow, reef tick on listing, profile sheet, mobile; screenshots: '+out);
    await context.close();
  }catch(e){if(page){await page.screenshot({path:resolve(out,'failure.png')});console.error(await page.evaluate(()=>location.href+'\n'+document.body.innerText.slice(0,1200)));}throw e}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
