import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {people} from '../api/lib/_people.js';
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const guest='11111111-1111-4111-8111-111111111111', host='22222222-2222-4222-8222-222222222222';
const listing='65ef1d11-a4e3-4250-bbac-f826c0cd10d2';

function chatSetup({notifications=[],body='<body></body>'}={}) {
  const dom=new JSDOM(body,{url:'https://cabana.africa/apartments',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, calls=[];
  const tables={listings:[{id:listing,partner_id:host}],chat_messages:[],chat_conversations:[],notifications};
  let fail=false;
  function query(table) {
    let filters=[], insert, update, single=false, ascending=true, maximum=200;
    const q={select(fields){calls.push({table,fields});return q},eq(k,v){filters.push([k,v]);return q},neq(){return q},or(){return q},
      order(k,o){ascending=o.ascending;return q},limit(n){maximum=n;return q},
      maybeSingle(){single=true;return q},single(){single=true;return q},
      insert(row){insert=row;return q},update(row){update=row;return q},
      then(resolve,reject){return Promise.resolve().then(()=>{
        let rows=(tables[table]||[]).filter(r=>filters.every(([k,v])=>r[k]===v));
        if(insert){
          if(fail && table==='chat_messages')return {data:null,error:{message:'Offline'}};
          const row={id:'row-'+(tables[table]?.length||0),status:'active',created_at:new Date().toISOString(),...insert};
          (tables[table]||=[]).push(row);rows=[row];
        }
        if(update)rows.forEach(r=>Object.assign(r,update));
        if(!ascending)rows=[...rows].reverse();
        rows=rows.slice(0,maximum);
        return {data:single?rows[0]||null:rows,error:null,count:0};
      }).then(resolve,reject)}
    };return q;
  }
  const channel={on(){return this},subscribe(){return this},unsubscribe(){},send(){}};
  /* The v6 messenger talks to a handful of RPCs; these stand-ins apply the
     same ownership rules the database does, so the tests stay honest. */
  const rpcs={
    cabana_chat_start({p_listing}){
      const l=tables.listings.find(x=>x.id===p_listing);if(!l)throw new Error('This listing does not have a host available to message yet.');
      let c=tables.chat_conversations.find(x=>x.listing_id===p_listing&&x.guest_id===guest);
      if(!c){c={id:'conv-'+tables.chat_conversations.length,listing_id:p_listing,host_id:l.partner_id,guest_id:guest,status:'active'};tables.chat_conversations.push(c)}
      return c;
    },
    cabana_chat_thread({p_conversation}){
      const c=tables.chat_conversations.find(x=>x.id===p_conversation);if(!c)throw new Error('Conversation not found');
      const blocked=c.status==='blocked'||!!c.blocked_by;
      return {conversation:c,role:c.host_id===guest?'host':'guest',counterpart:{id:host,name:'Host H.'},
        listing:{id:c.listing_id,title:'Test stay',price:1500,live:true},booking:null,offers:[],contact_allowed:false,response:null,blocked,blocked_by_me:false};
    },
    cabana_chat_inbox(){return tables.chat_conversations.map(c=>({id:c.id,listing_title:'Test stay',role:'guest',counterpart:{name:'Host H.'},unread:0}))},
    cabana_chat_mark_read(){return null},
  };
  const client={from:query,channel:()=>Object.create(channel),removeChannel(){},
    rpc:async(name,args)=>{calls.push({rpc:name,args});try{return {data:rpcs[name]?.(args)??null,error:null}}catch(e){return {data:null,error:{message:e.message}}}},
    auth:{getSession:async()=>({data:{session:{user:{id:guest}}}})}};
  w.ApaSession={client:()=>client,ready:fn=>fn({user:{id:guest}})};
  w.eval(read('chat.js'));
  return {dom,w,tables,calls,fail(value){fail=value}};
}
const settle=()=>new Promise(r=>setTimeout(r,30));
test('message-host global opens a real composer and resolves the listing owner',async()=>{
  const t=chatSetup();try{
    assert.equal(typeof t.w.CabanaChat.open,'function');
    await t.w.CabanaChat.open({listingId:listing,listingTitle:'Test stay',listingType:'apartment'});await settle();
    assert.equal(t.tables.chat_conversations[0].host_id,host,'the host comes from the listing, never from the page');
    assert.ok(t.calls.some(c=>c.rpc==='cabana_chat_start'),'conversations start through the server');
    assert.equal(t.tables.chat_messages.length,0,'opening the conversation does not send on the guest’s behalf');
    assert.ok(t.w.document.getElementById('cbx').classList.contains('open'));
    assert.ok(t.w.document.getElementById('cbx-ta'),'composer is ready');
  }finally{await new Promise(setImmediate);t.dom.window.close()}
});
test('failed sends are kept with a retry, successful sends clear the draft and duplicate clicks send once',async()=>{
  const t=chatSetup();try{
    await t.w.CabanaChat.open({listingId:listing,listingTitle:'Test stay',hostId:host});await settle();
    const d=t.w.document;
    d.getElementById('cbx-ta').value='Is the kitchen available?';
    t.fail(true);await t.w.CabanaChat._pSend();await settle();
    assert.equal(t.tables.chat_messages.length,0);
    assert.ok(d.querySelector('#cbx .m.failed'),'the failed message stays on screen');
    assert.ok(d.querySelector('#cbx [data-act="retry"]'),'with a way to retry it');
    t.fail(false);
    d.getElementById('cbx-ta').value='Is parking included?';
    await Promise.all([t.w.CabanaChat._pSend(),t.w.CabanaChat._pSend()]);await settle();
    assert.equal(t.tables.chat_messages.length,1,'two clicks, one message');
    assert.equal(d.getElementById('cbx-ta').value,'');
    assert.ok(t.tables.chat_messages[0].client_id,'every send carries an idempotency key');
    assert.ok(t.calls.filter(c=>c.table==='chat_messages'&&c.fields).every(c=>c.fields!=='*'&&!c.fields.includes('content_raw')),'withheld originals are never requested');
  }finally{await new Promise(setImmediate);t.dom.window.close()}
});
test('opening an active conversation after a blocked conversation restores its controls',async()=>{
  const t=chatSetup();try{
    t.tables.listings.push({id:'old',partner_id:host});
    t.tables.chat_conversations.push({id:'blocked',listing_id:'old',guest_id:guest,host_id:host,status:'blocked'});
    await t.w.CabanaChat.open({listingId:'old',hostId:host});await settle();
    assert.equal(t.w.document.getElementById('cbx-ta'),null,'a closed conversation has no composer');
    assert.match(t.w.document.getElementById('cbx-foot').textContent,/closed/i);
    t.w.CabanaChat.close();await t.w.CabanaChat.open({listingId:listing,hostId:host});await settle();
    assert.ok(t.w.document.getElementById('cbx-ta'),'the composer is back');
  }finally{await new Promise(setImmediate);t.dom.window.close()}
});
test('gallery advances, pauses for the lightbox and stops on close',()=>{
  const d=new JSDOM('<div id="gallery"></div><div id="lightbox" hidden></div>',{runScripts:'outside-only',pretendToBeVisual:true});
  const w=d.window;let now=0,tick,steps=0,cleared=false;
  w.Date.now=()=>now;w.matchMedia=()=>({matches:false});w.setInterval=fn=>(tick=fn,1);w.clearInterval=()=>{cleared=true};
  w.eval(read('cabana-gallery.js'));w.CabanaGallery.start(w.document.getElementById('gallery'),3,()=>steps++);
  now=5000;tick();assert.equal(steps,1);
  w.document.getElementById('lightbox').hidden=false;now=10000;tick();assert.equal(steps,1);
  w.document.getElementById('lightbox').hidden=true;now=15000;tick();assert.equal(steps,2);
  w.document.querySelector('button').click();now=20000;tick();assert.equal(steps,2);
  w.CabanaGallery.stop();assert.ok(cleared);assert.equal(w.document.querySelector('button'),null);d.window.close();
});
test('reduced motion starts with an explicit play choice',()=>{
  const d=new JSDOM('<div id="gallery"></div>',{runScripts:'outside-only'});const w=d.window;
  w.matchMedia=()=>({matches:true});w.eval(read('cabana-gallery.js'));
  w.CabanaGallery.start(w.document.getElementById('gallery'),2,()=>{});
  assert.equal(w.document.querySelector('button').getAttribute('aria-pressed'),'false');d.window.close();
});

test('dashboard notification card stays out of the layout when the feed is empty',async()=>{
  const t=chatSetup({body:'<body><div id="cbn-ring-slot"></div></body>'});
  try{
    await new Promise(r=>setTimeout(r,950));
    const card=t.w.document.getElementById('cbn-ring-card');
    assert.equal(card,null);
  }finally{t.dom.window.close()}
});

function response(){return {code:200,setHeader(){},status(n){this.code=n;return this},json(data){this.data=data;return this}}}
function peopleDb({card,roles=['traveller'],peer=false}={}){
  const writes=[];
  return {writes,db:async(path,options)=>{
    if(options?.method==='POST'&&!path.startsWith('rpc/')){writes.push(options.body);return []}
    if(path.startsWith('member_public_profiles'))return card?[card]:[];
    if(path.startsWith('profiles'))return [{first_name:'Mina',created_at:'2026-01-01',email:'secret@example.test',phone:'private',mpesa_number:'private',last_name:'Private'}];
    if(path.startsWith('rpc/'))return roles;
    if(path.startsWith('chat_conversations'))return peer?[{id:'peer'}]:[];
    throw Error(path);
  }};
}
test('public member projection never exposes account, payment, contact or private biography fields',async()=>{
  const fixture=peopleDb({roles:['traveller','host'],card:{display_name:'Mina public',bio:'I enjoy coast trips.',published:true,email:'private'}}),res=response();
  await people({method:'GET',query:{id:host},headers:{}},res,{...fixture,session:async()=>({user:null})});
  assert.equal(res.code,200);
  assert.deepEqual(Object.keys(res.data.profile).sort(),['bio','can_edit','display_name','id','member_since','roles'].sort());
  assert.ok(!JSON.stringify(res.data).includes('private'));assert.equal(res.data.profile.display_name,'Mina public');
});
test('unpublished traveller profiles are hidden from strangers but available as minimal conversation cards',async()=>{
  for(const peer of [false,true]){
    const fixture=peopleDb({peer,card:{display_name:'Hidden name',bio:'Hidden bio',published:false}}),res=response();
    await people({method:'GET',query:{id:host},headers:{authorization:'Bearer test'}},res,{...fixture,session:async()=>({user:{id:guest}})});
    assert.equal(res.code,peer?200:404);
    if(peer){assert.equal(res.data.profile.display_name,'Mina');assert.equal(res.data.profile.bio,'')}
  }
});
test('public profile writes bind to the session and cannot claim roles or leak contact information',async()=>{
  const fixture=peopleDb(),dependencies={...fixture,session:async()=>({user:{id:guest}})};
  let res=response();await people({method:'POST',headers:{},body:{id:host,display_name:'Mina',bio:'Beach enthusiast',roles:['ambassador'],published:true}},res,dependencies);
  assert.equal(res.code,200);assert.equal(fixture.writes[0].user_id,guest);assert.equal(fixture.writes[0].roles,undefined);
  res=response();await people({method:'POST',headers:{},body:{display_name:'Mina',bio:'Email me secret@example.com'}},res,dependencies);
  assert.equal(res.code,400);assert.equal(fixture.writes.length,1);
});

test('role discovery waits for both membership checks instead of returning before they finish',async()=>{
  const d=new JSDOM('<body></body>',{url:'https://cabana.africa/dashboard',runScripts:'outside-only'});const w=d.window;
  let resolveAgent,resolveGate;
  const agent=new Promise(resolve=>{resolveAgent=resolve}), gate=new Promise(resolve=>{resolveGate=resolve});
  const q={select(){return this},eq(){return this},maybeSingle(){return agent}};
  w.ApaSession={client:()=>({auth:{getUser:async()=>({data:{user:{id:guest}}})},from:()=>q,rpc:()=>gate})};
  w.eval(read('apa-roles.js'));
  let settled=false;const promise=w.ApaRoles.status().then(s=>{settled=true;return s});
  await new Promise(setImmediate);assert.equal(settled,false);
  resolveAgent({data:{id:guest,is_creator:true}});await new Promise(setImmediate);assert.equal(settled,false);
  resolveGate({data:{ok:true}});const status=await promise;
  assert.equal(status.agent,true);assert.equal(status.influencer,true);assert.equal(status.ambassador,true);d.window.close();
});

test('dashboard and saved-stay cards gain one exact-id 3D badge after rendering',async()=>{
  const d=new JSDOM('<body></body>',{url:'https://cabana.africa/dashboard',runScripts:'outside-only'});const w=d.window;
  w.eval(read('cabana-property-tour.js'));
  w.document.body.innerHTML='<article data-listing-id="'+listing+'"><div class="prop-thumb"></div></article><a href="/apartments?open='+listing+'"><div class="fav-img"></div></a><article data-listing-id="unknown"><div class="prop-thumb"></div></article>';
  await new Promise(r=>setTimeout(r,20));w.CabanaPropertyTour.scan();await new Promise(r=>setTimeout(r,20));
  assert.equal(w.document.querySelectorAll('.cabana-3d-badge').length,2);d.window.close();
});
