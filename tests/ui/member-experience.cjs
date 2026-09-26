// Isolated browser regression: no real messages, signups or support requests.
const {chromium}=require(process.env.CABANA_PLAYWRIGHT || 'playwright');
const {createServer}=require('node:http');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve,extname}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../..'),out=resolve(root,'artifacts/member-ui');
const id='65ef1d11-a4e3-4250-bbac-f826c0cd10d2',guest='11111111-1111-4111-8111-111111111111',host='22222222-2222-4222-8222-222222222222';
const listing={id,title:'The Jets Nest',partner_id:host,is_active:true,status:'active',deleted_at:null,type:'apartment',service:'stays',city:'Nairobi',area:'Kilimani',location:'Kilimani, Nairobi',price_night:4500,beds:1,max_guests:2,photos:[1,2,3].map(n=>'/tours/jets-nest/photos/'+n+'.jpg')};
const mock=`(()=>{
  const user={id:${JSON.stringify(guest)},email:'qa@example.test',created_at:'2026-01-01',user_metadata:{first_name:'Mina'}};
  const state={status:'user',user,name:'Mina',initial:'M',role:'guest',isAdmin:false};
  const tables={listings:[${JSON.stringify(listing)}],profiles:[{id:user.id,first_name:'Mina'}],chat_conversations:[],chat_messages:[]};
  window.__testTables=tables;
  const query=table=>{let filters=[],op,row,single=false;const q={then:(resolve,reject)=>Promise.resolve().then(()=>{
    let data=(tables[table]||[]).filter(r=>filters.every(([k,v])=>r[k]===v));
    if(op==='insert'){if(window.__failSend&&table==='chat_messages')return {data:null,error:{message:'Offline'}};row={id:'row-'+(tables[table]||[]).length,status:'active',created_at:new Date().toISOString(),...row};(tables[table]||=[]).push(row);data=[row]}
    if(op==='update')data.forEach(r=>Object.assign(r,row));return {data:single?data[0]||null:data,error:null,count:0};}).then(resolve,reject)};
    for(const k of ['select','limit','order','or','in','gte','lte','gt','lt','neq','is','not','filter'])q[k]=()=>q;
    q.eq=(k,v)=>(filters.push([k,v]),q);q.insert=r=>(op='insert',row=r,q);q.update=r=>(op='update',row=r,q);q.upsert=q.update;
    q.single=q.maybeSingle=()=>(single=true,q);return q;};
  const channel={on(){return this},subscribe(){return this},unsubscribe(){}};
  const client={from:query,rpc:async()=>({data:[],error:null}),channel:()=>Object.create(channel),removeChannel(){},auth:{getSession:async()=>({data:{session:{user,access_token:'qa-only'}}}),getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
  window.sb=client;window.supabase={createClient:()=>client};window.ApaSession={client:()=>client,get:()=>state,ready:f=>{f(state)},subscribe:f=>{f(state);return ()=>{}},token:async()=>'qa-only'};
})();`;
(async()=>{
  mkdirSync(out,{recursive:true});
  const server=createServer((req,res)=>{try{let pathname=new URL(req.url,'http://local').pathname;if(pathname==='/')pathname='/index.html';if(!extname(pathname))pathname+='.html';const file=resolve(root,'.'+pathname);if(!file.startsWith(root+require('node:path').sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.statusCode=404;res.end()}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  let browser,page;
  try{
    browser=await chromium.launch(process.env.CABANA_BROWSER_PATH?{headless:true,executablePath:process.env.CABANA_BROWSER_PATH}:{headless:true,channel:process.env.CABANA_BROWSER_CHANNEL||'chrome'});
    const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['notifications']});
    // Service-worker registration/push is outside this isolated UI fixture.
    await context.addInitScript(()=>Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>({}),getRegistrations:async()=>[],ready:new Promise(()=>{}),addEventListener(){}}}));
    const errors=[];context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
    await context.route('**/*',route=>{
      const u=new URL(route.request().url());
      if(u.pathname==='/vendor-supabase-2.112.3.js')return route.fulfill({contentType:'application/javascript',body:mock});
      if(u.pathname==='/apa-session.js')return route.fulfill({contentType:'application/javascript',body:''});
      if(u.pathname.startsWith('/rest/v1/'))return route.fulfill({json:u.pathname.endsWith('/listings')?[listing]:[]});
      if(u.pathname.startsWith('/api/')){
        if(u.pathname==='/api/agents'&&u.searchParams.get('action')==='public-profile')return route.fulfill({json:{profile:{id:host,display_name:'Mina',bio:'Enjoys travel along the coast.',roles:['traveller','host'],member_since:'2026',can_edit:false}}});
        if(u.pathname==='/api/people'&&u.searchParams.get('op')==='profile')return route.fulfill({json:{profile:{id:host,name:'Mina',level:'full',handle:'mina',type:'individual',avatar:null,photo:null,badge:'provider',verified_as:'individual',headline:'',bio:'Enjoys travel along the coast.',roles:['traveller','host'],member_since:'2026-01',operators:[],languages:[],interests:[],theme:'ocean',can_follow:true,stats:{followers:3,following:1,listings:1,reviews:0,rating:null},viewer:{signed_in:true,self:false,following:false},listings:[]}}});
        if(u.pathname==='/api/people'&&u.searchParams.get('op')==='cards')return route.fulfill({json:{cards:Object.fromEntries(u.searchParams.get('ids').split(',').map(i=>[i,{id:i,name:'Mina',level:'full',type:'individual',avatar:null,photo:null,badge:i===host?'provider':null,can_follow:i===host}]))}});
        return route.fulfill({json:{ok:true,items:[],messages:[],suggestions:[],thread:null}});
      }
      if(u.origin!==base)return route.abort();
      return route.continue();
    });
    page=await context.newPage();
    await page.goto(base+'/dashboard.html');
    await page.waitForSelector('#cbp-splash',{state:'detached',timeout:20000});
    await page.waitForSelector('.prop-card[data-listing-id] .cabana-3d-badge');
    await page.waitForSelector('#cbn-apa-welcome',{state:'visible',timeout:15000});
    await page.screenshot({path:resolve(out,'dashboard-welcome.png')});
    await page.getByRole('button',{name:'Dismiss APA welcome'}).click();
    await page.reload();await page.waitForTimeout(3000);assert.equal(await page.locator('#cbn-apa-welcome').count(),0);
    await page.goto(base+'/apartments.html?open='+id);
    await page.waitForSelector('.drawer.open .dl-gal-play',{timeout:20000});
    await page.mouse.move(5,5);
    const before=await page.locator('#dl-gal-count').innerText();
    await page.waitForFunction(value=>document.getElementById('dl-gal-count')?.textContent!==value,before,{timeout:9000});
    await page.getByRole('button',{name:'Pause photo slideshow',exact:true}).click();
    const paused=await page.locator('#dl-gal-count').innerText();await page.mouse.move(5,5);await page.waitForTimeout(5200);assert.equal(await page.locator('#dl-gal-count').innerText(),paused);
    await page.screenshot({path:resolve(out,'stay-detail.png')});
    await page.locator('.dl-host-name').click();await page.waitForSelector('.cbp-dialog h2');
    assert.match(await page.locator('.cbp-dialog').innerText(),/Host/);
    assert.doesNotMatch(await page.locator('.cbp-dialog').innerText(),/qa@example|private|phone/i);
    await page.screenshot({path:resolve(out,'member-profile.png')});
    await page.getByRole('button',{name:'Close profile',exact:true}).click();
    await page.evaluate(id=>messageHost('n_'+id),id);await page.waitForSelector('#cbm-panel-wrap.open');
    await page.locator('#cbm-panel-input').fill('Is the kitchen available?');
    await page.evaluate(()=>{window.__failSend=true});await page.locator('#cbm-panel-send').click();
    await page.waitForFunction(()=>!document.getElementById('cbm-panel-send').disabled);
    assert.equal(await page.locator('#cbm-panel-input').inputValue(),'Is the kitchen available?');
    await page.evaluate(()=>{window.__failSend=false});await page.locator('#cbm-panel-send').click();
    await page.waitForFunction(()=>document.getElementById('cbm-panel-input').value==='');
    assert.equal(await page.evaluate(()=>window.__testTables.chat_messages.length),1);
    await page.screenshot({path:resolve(out,'messaging.png')});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'messaging-mobile.png')});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No mobile overflow');
    assert.deepEqual(errors,[]);console.log('PASS dashboard badge, first-visit APA, repeat visit, autoplay, pause, profile privacy, failed-send recovery, messaging, mobile layout; screenshots: '+out);
    await context.close();
  }catch(e){if(page){await page.screenshot({path:resolve(out,'failure.png')});console.error(await page.evaluate(()=>({url:location.href,body:document.body.innerText.slice(-1500),gallery:!!window.CabanaGallery,drawer:document.getElementById('drawer')?.className,listings:window.__testTables?.listings})));}throw e}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
