// Isolated browser QA: authentication and external services are mocked.
// No production records or support requests are sent.
const { chromium } = require(process.env.CABANA_PLAYWRIGHT || 'playwright');
const {createServer}=require('node:http');
const {readFileSync,mkdirSync}=require('node:fs');
const {resolve,extname}=require('node:path');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'../..'),out=resolve(root,'artifacts/listing-ui');
const mock=`const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.test',user_metadata:{}};
const query=()=>{const q={then:r=>Promise.resolve(r({data:[],error:null})),single:()=>Promise.resolve({data:{id:'qa-operator',name:'QA Tours'},error:null}),maybeSingle:()=>Promise.resolve({data:null,error:null})};for(const k of ['select','eq','limit','order','insert','update','upsert'])q[k]=()=>q;return q;};
const client={auth:{getSession:async()=>({data:{session:{user,access_token:'test-only'}}}),getUser:async()=>({data:{user}})},from:()=>query(),rpc:async()=>({data:[],error:null})};
window.supabase={createClient:()=>client};window.ApaSession={client:()=>client,get:()=>({user,name:'QA Person'}),ready:f=>f({user}),subscribe:f=>f({user}),token:async()=>null};`;
(async()=>{
  mkdirSync(out,{recursive:true});
  const server=createServer((req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root))throw Error();const data=readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.CABANA_BROWSER_CHANNEL||'chrome'});
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base)return route.abort();
      if(url.pathname==='/vendor-supabase-2.112.3.js')return route.fulfill({contentType:'application/javascript',body:mock});
      if(['/apa-session.js','/apa-location.js','/cabana-lifecycle.js','/cabana-support.js','/cabana-sos.js','/cabana-call.js','/analytics.js','/pwa.js'].includes(url.pathname))return route.fulfill({contentType:'application/javascript',body:''});
      return route.continue();
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/add-listing.html?from=partner');
    await page.locator('#step-0 .cc-choice').waitFor();
    await page.screenshot({path:out+'/desktop-service.png',fullPage:true});
    await page.locator('#step-0 .cc-yes').click();
    await page.locator('#step-1.active .cc-choice').waitFor();
    await page.locator('#step-1 .cc-yes').click();
    await page.locator('#f-title').fill('A beautiful apartment');
    await page.locator('#step-2 .cc-form-nav .cc-proceed').click();
    await page.locator('#step-2 .cc-form-nav .cc-undo').click();
    assert.equal(await page.locator('#f-title').inputValue(),'A beautiful apartment');
    await page.getByRole('button',{name:'Set it up for me'}).click();
    await page.locator('#cc-assist-name').fill('QA Person');
    await page.locator('#cc-assist-phone').fill('+254 712 345 678');
    await page.screenshot({path:out+'/setup-help.png'});
    await page.getByRole('button',{name:'Close ×'}).click();
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+'/add-listing.html?from=partner');
    await page.locator('#step-0 .cc-choice').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile overflow');
    await page.screenshot({path:out+'/mobile-service.png',fullPage:true});
    // Horizontal swipe selects; vertical scroll cannot select a service.
    const card=page.locator('#step-0 .cc-decision');await card.scrollIntoViewIfNeeded();
    let box=await card.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+5,box.y+box.height/2+60,{steps:6});await page.mouse.up();
    assert.ok(await page.locator('#step-0').evaluate(el=>el.classList.contains('active')));
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+100,box.y+box.height/2+2,{steps:8});await page.mouse.up();
    await page.locator('#step-1.active').waitFor();
    await page.goto(base+'/list-your-tour.html');
    await page.locator('#p-op.on').waitFor();
    await page.locator('#o-name').fill('QA Safari Company');
    await page.locator('#f-op .cc-form-top .cc-text').click();
    await page.locator('#o-phone').fill('+254712345678');
    await page.locator('#o-email').fill('qa@example.test');
    await page.locator('#f-op button[type=submit]').click();
    await page.locator('#p-tour.on').waitFor();
    await page.locator('#t-title').fill('Three days in the Mara');
    await page.screenshot({path:out+'/mobile-tour.png',fullPage:true});
    for(const file of ['list-your-event.html','list-your-fleet.html','become-driver.html']){
      await page.goto(base+'/'+file);await page.locator('.cc-assist').waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),file+' overflow');
      assert.ok(await page.locator('.cc-form').count(),file+' missing cards');
    }
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: desktop/mobile, pointer directions, retained inputs, assisted dialog, tour transition, and all dedicated journeys.');
  }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
