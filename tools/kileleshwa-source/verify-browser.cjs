const {chromium}=require('../../node_modules/@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.CABANA_PREVIEW_URL||'http://127.0.0.1:3000';
const output=path.resolve(__dirname,'../../artifacts/kileleshwa');
const url=base+'/tours/kileleshwa-elegant/index.html';
const state=page=>page.locator('.scene').evaluate(el=>el.tourSnapshot());
const snap=async(page,name)=>page.screenshot({path:path.join(output,name+'.png')});
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 const results=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(url);await page.getByRole('button',{name:'Enter the apartment',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.enter-button')?.disabled,{},{timeout:60000});
  await snap(page,'01-welcome');await page.getByRole('button',{name:'Enter the apartment',exact:true}).click();
  assert.equal((await state(page)).blocked,false);await snap(page,'02-living');results.push('Desktop initializes, renders, and enters the living room');
  await page.locator('.room-dock').getByRole('button',{name:'03 Kitchen'}).click();
  await page.waitForFunction(()=>!!document.querySelector('.scene').tourSnapshot().journey);const moving=await state(page);assert.equal(moving.journey,'kitchen');
  await page.waitForFunction(()=>{const s=document.querySelector('.scene').tourSnapshot();return s.room==='kitchen'&&!s.journey;},{},{timeout:60000});
  assert.equal((await state(page)).blocked,false);await snap(page,'03-kitchen');results.push('Smooth room navigation reaches the kitchen without intersecting furniture');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [name,id] of [['04 Bedroom','bedroom'],['05 Bathroom','bathroom'],['06 Laundry','utility'],['02 Dining & work','dining']]){
   await page.locator('.room-dock').getByRole('button',{name,exact:true}).click();await page.waitForFunction(id=>{const s=document.querySelector('.scene').tourSnapshot();return s.room===id&&!s.journey;},id);assert.equal((await state(page)).blocked,false);await snap(page,'room-'+id);
  }
  results.push('Reduced-motion navigation reaches all other spaces immediately and safely');
  await page.getByRole('button',{name:'Dollhouse',exact:true}).click();assert.equal((await state(page)).mode,'overview');await snap(page,'04-dollhouse');
  await page.getByRole('button',{name:'Floor plan',exact:true}).click();assert.equal((await state(page)).orthographic,true);await snap(page,'05-floor-plan');
  await page.getByRole('button',{name:'Go to Living room',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.apartment-app').dataset.mode==='walk');results.push('Dollhouse, orthographic plan and minimap room navigation work');
  for(const name of ['Golden hour','Evening','Daylight']){await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');if(name==='Evening')await snap(page,'06-evening');}
  await page.getByRole('button',{name:'Guided tour',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.scene').tourSnapshot().touring);
  await page.getByRole('button',{name:'Pause tour',exact:true}).click();assert.equal((await state(page)).touring,false);results.push('All three lighting moods and guided-tour start/pause work');
  await page.locator('.photo-button').click();await page.locator('.photo-dialog').waitFor({state:'visible'});assert.equal((await state(page)).paused,true);
  const photoIds=new Set();
  for(const name of ['Living room','Dining & work','Kitchen','Bedroom','Bathroom','Laundry','Shared amenities']){
   await page.locator('.gallery-room-tabs').getByRole('button',{name,exact:true}).click();const buttons=page.locator('.photo-thumbs button');
   for(let i=0;i<await buttons.count();i++){await buttons.nth(i).click();await page.waitForFunction(()=>{const img=document.querySelector('.photo-stage img');return img?.complete&&img.naturalWidth>0;});photoIds.add(await page.locator('.photo-stage img').getAttribute('src'));}
  }
  assert.equal(photoIds.size,18);await snap(page,'07-original-photos');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal((await state(page)).paused,false);results.push('All 18 original photos load; shared amenities are separate; Escape restores the scene');
  const snapshot=await state(page);assert.ok(snapshot.drawCalls<300,'batching should keep draw calls modest');assert.equal(errors.length,0,errors.join('\n'));
  await context.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await phone.waitForFunction(()=>!document.querySelector('.enter-button')?.disabled,{},{timeout:60000});await snap(phone,'08-mobile-welcome');await phone.getByRole('button',{name:'Enter the apartment',exact:true}).click();
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await phone.getByRole('button',{name:'Walk forward',exact:true}).waitFor({state:'visible'});
  const before=await state(phone),bounds=await phone.getByRole('button',{name:'Walk forward',exact:true}).boundingBox();await phone.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await phone.mouse.down();await phone.waitForTimeout(500);await phone.mouse.up();const after=await state(phone);assert.ok(Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z)>.05);assert.equal(after.blocked,false);await snap(phone,'09-mobile-walk');
  await phone.locator('.room-dock').getByRole('button',{name:'04 Bedroom',exact:true}).click();await phone.waitForFunction(()=>document.querySelector('.scene').tourSnapshot().room==='bedroom');await snap(phone,'10-mobile-bedroom');
  await phone.locator('.photo-button').click();await phone.locator('.photo-dialog').waitFor({state:'visible'});await snap(phone,'11-mobile-photos');await phone.getByRole('button',{name:'Close dialog',exact:true}).click();results.push('390px mobile layout has no page overflow; touch movement, room dock and gallery work');await mobile.close();
  const fallback=await browser.newContext({viewport:{width:1000,height:760}});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args);};});
  const noGL=await fallback.newPage();await noGL.goto(url);await noGL.getByRole('button',{name:'Explore the photographs',exact:true}).waitFor({state:'visible'});await noGL.getByRole('button',{name:'Explore the photographs',exact:true}).click();await noGL.waitForFunction(()=>{const img=document.querySelector('.photo-stage img');return img?.complete&&img.naturalWidth>0;});await snap(noGL,'12-no-webgl-fallback');results.push('Devices without WebGL retain a working original-photo experience');await fallback.close();
  assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({passed:results.length,results,errors,renderStats:snapshot},null,2));console.log(JSON.stringify({passed:results.length,results,errors,renderStats:snapshot},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
