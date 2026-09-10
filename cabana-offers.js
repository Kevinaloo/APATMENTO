/* Existing Partner Hub / admin surfaces share one offer editor. All writes
   use the signed-in Supabase client; ownership and pricing are enforced in SQL. */
(function(W){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'KES '+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
  const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const utcInput=s=>new Date(s).toISOString().slice(0,16);
  const field=(label,name,value,type='text',attrs='')=>`<label class="co-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const state=o=>o.status==='active'?(Date.now()<Date.parse(o.booking_start)?'Scheduled':Date.now()>=Date.parse(o.booking_end)?'Expired':'Live'):o.status==='published'?(Date.now()>=Date.parse(o.booking_end)?'Expired':'Open to hosts'):o.status;
  const when=s=>new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});

  const localInput=s=>{const d=new Date(s);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const readLocalTime=(value,original)=>original&&localInput(original)===value?original:new Date(value).toISOString();
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const dateLabel=s=>new Date(s+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  function pricePreview(basis,row,existing){
    const reference=Math.min(Number(basis.reference_nightly),existing?Number(existing.reference_nightly):Infinity);
    const nightly=Math.max(row.floor_nightly,Math.round(reference*(1-row.discount_pct/100)*100)/100);
    if(!Number.isFinite(nightly)||nightly<=0||nightly>=reference||row.discount_pct<=0||row.discount_pct>80)return null;
    return {reference,nightly,fee:nightly<5000?300:800,effective:(1-nightly/reference)*100};
  }

  async function checked(query){const r=await query;if(r.error)throw Error(r.error.message);return r.data;}

  async function mount({client,root,admin=false,listingId=null}){
    if(!root||!client)return;
    if(root._offers){root.hidden=false;if(listingId)root._offers.edit(null,listingId);return;}
    root.classList.add('cb-offers');root.hidden=false;
    let offers=[],campaigns=[],listings=[],tab='offers',formSeq=0;
    const session=await client.auth.getSession();const uid=session.data?.session?.user?.id;
    if(!uid){root.innerHTML='<p>Sign in to manage your offers.</p>';return;}
    root.innerHTML='<p role="status">Loading offers…</p>';
    function error(e){const el=root.querySelector('[data-error]');if(el){el.textContent=e.message||String(e);el.focus();}}

    function shell(){root._editing=false;root.classList.remove('co-editing');root.innerHTML=`
      <div class="co-hero"><div class="co-hero-copy"><span class="co-eyebrow">${admin?'CABANA CAMPAIGNS':'OFFERS THAT FEEL GOOD'}</span><h2>${admin?'Bring hosts into the occasion.':'Give guests a reason to stay.'}</h2><p>${admin?'Create a seasonal invitation. Hosts decide whether to join and what discount works for them.':'A weekend away. A longer escape. A little less to pay. Create an offer that works for your stay.'}</p><button class="co-primary" type="button" data-new>${admin?'Create a campaign':'Create an offer'} <span aria-hidden="true">↗</span></button></div><div class="co-hero-art" aria-hidden="true"><div class="co-ticket"><span>CABANA</span><strong>A little<br>more reason<br>to get away.</strong><i>YOUR STAY. YOUR OFFER.</i></div></div></div>
      <div class="co-overview"><span><b>${offers.filter(o=>state(o)==='Live').length}</b> live</span><span><b>${offers.filter(o=>state(o)==='Scheduled').length}</b> scheduled</span><span><b>${offers.filter(o=>o.status==='draft').length}</b> drafts</span><p>Guests get the best eligible price automatically.</p></div>
      <div class="co-tabs" role="group" aria-label="Offer views"><button type="button" data-tab="offers" aria-pressed="${tab==='offers'}">${admin?'Host offers':'My offers'}</button><button type="button" data-tab="campaigns" aria-pressed="${tab==='campaigns'}">${admin?'Campaigns':'Join a campaign'} <span>${campaigns.filter(c=>c.status==='published'&&Date.parse(c.booking_end)>Date.now()).length}</span></button></div>
      <div data-notice class="co-notice" role="status" tabindex="-1"></div><div data-error class="co-error" role="alert" tabindex="-1"></div><div data-form></div><div data-list class="co-card-grid"></div>`;
      root.querySelector('[data-new]').onclick=()=>admin?editCampaign():edit();
      root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(root._editing&&!root._cancelEdit?.())return;formSeq++;tab=b.dataset.tab;shell();render();});
    }
    async function load(){
      const q=client.from('listings').select('id,title,partner_id,service,currency,price_night,price_per_night,is_active,status,ownership_type,deleted_at').is('deleted_at',null);
      listings=await checked(admin?q.limit(1000):q.eq('partner_id',uid));
      listings=listings.filter(l=>(l.service||'stays')==='stays');
      [offers,campaigns]=await Promise.all([
        checked(admin?client.from('stay_offers').select('*').order('created_at',{ascending:false}).limit(500):
          client.from('stay_offers').select('*').in('listing_id',listings.map(l=>l.id).length?listings.map(l=>l.id):['00000000-0000-0000-0000-000000000000']).order('created_at',{ascending:false})),
        checked(client.from('stay_offer_campaigns').select('*').order('booking_start',{ascending:false}).limit(200))
      ]);
    }
    function render(){
      const dest=root.querySelector('[data-list]');const rows=tab==='offers'?offers:campaigns;

      dest.innerHTML=rows.length?rows.map(o=>{
        const l=listings.find(l=>l.id===o.listing_id),isOffer=tab==='offers',status=state(o);
        const canJoin=!isOffer&&o.status==='published'&&Date.parse(o.booking_end)>Date.now();
        return `<article class="co-card ${isOffer?'':'co-campaign-card'}">
          <div class="co-card-top"><span class="co-eyebrow">${isOffer?esc(l?.title||'YOUR STAY'):'A CABANA INVITATION'}</span><span class="co-status" data-state="${esc(status.toLowerCase())}">${esc(status.charAt(0).toUpperCase()+status.slice(1))}</span></div>
          <h3>${esc(o.title)}</h3>
          ${isOffer?`<div class="co-card-discount">${esc(o.discount_pct)}<span>%</span><small>discount setting</small></div>`:`<p>${esc(o.description||'Be part of the occasion. Choose a discount that feels right for your stay.')}</p><div class="co-campaign-range">Choose ${o.min_discount}–${o.max_discount}% off</div>`}
          <div class="co-card-dates"><span>Stay dates</span><strong>${dateLabel(o.stay_start)} – ${dateLabel(o.stay_end)}</strong></div>
          <details class="co-card-details"><summary>${isOffer?'Dates & price details':'Campaign details'}</summary><p>Guests can book ${when(o.booking_start)} to ${when(o.booking_end)}.</p>${isOffer?`<p>Your minimum: ${money(o.floor_nightly)} / night. The final discount may be smaller if this minimum applies. Open the preview to check your price.</p>`:`<p>${o.countries.length?esc(o.countries.join(', ')):'All countries'} · Hosts choose their own discount.</p>`}</details>
          <div class="co-actions">${isOffer?(!admin?`<button type="button" data-edit="${o.id}" class="co-primary">View & edit</button>`:''):admin?`<button type="button" data-campaign="${o.id}" class="co-primary">Manage campaign</button>`:canJoin?`<button type="button" data-join="${o.id}" class="co-primary">Choose my discount <span aria-hidden="true">↗</span></button>`:''}
          ${isOffer&&o.status!=='ended'?`<button type="button" data-status="${o.id}" data-next="${o.status==='active'?'paused':admin?'ended':'active'}">${o.status==='active'?'Pause':admin?'End':'Publish'}</button>${o.status==='active'||!admin?`<button type="button" class="co-quiet" data-status="${o.id}" data-next="ended">End</button>`:''}`:''}</div></article>`;
      }).join(''):`<div class="co-empty"><span class="co-eyebrow">${tab==='offers'?'YOUR NEXT BOOKING STARTS HERE':'SOMETHING TO LOOK FORWARD TO'}</span><h3>${tab==='offers'?'Your first offer could be a guest’s next getaway.':'New occasions will appear here.'}</h3><p>${tab==='offers'?'Choose an idea, set your discount and dates, then see exactly what you receive.':'Seasonal campaigns bring hosts together around a special occasion. You always choose whether to join.'}</p>${tab==='offers'&&!admin?'<button type="button" class="co-primary" data-first>Create my first offer ↗</button>':''}</div>`;
      dest.querySelector('[data-first]')?.addEventListener('click',()=>edit());
      dest.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(offers.find(o=>o.id===b.dataset.edit)));
      dest.querySelectorAll('[data-campaign]').forEach(b=>b.onclick=()=>editCampaign(campaigns.find(o=>o.id===b.dataset.campaign)));
      dest.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>edit(null,null,campaigns.find(o=>o.id===b.dataset.join)));
      dest.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await checked(client.from('stay_offers').update({status:b.dataset.next}).eq('id',b.dataset.status).select('id').single());await load();shell();render();}catch(e){error(e);}finally{b.disabled=false;}});
    }

    function edit(existing=null,chosenListing=null,campaign=null){
      if(admin)return;
      if(root._editing)return;
      const eligible=listings.filter(l=>l.partner_id===uid&&(l.currency||'KES')==='KES'&&l.ownership_type!=='held'&&Number(l.price_night||l.price_per_night)>0);
      if(!eligible.length){error(Error('Add a stay with a nightly price in KES, then come back to create your first offer.'));return;}
      const o=existing||{};campaign=campaign||campaigns.find(c=>c.id===o.campaign_id);
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Africa/Nairobi';
      const defaults={booking_start:campaign?.booking_start||new Date().toISOString(),booking_end:campaign?.booking_end||day(30)+'T23:59:00Z',stay_start:campaign?.stay_start||day(0),stay_end:campaign?.stay_end||day(30)};
      const wrap=root.querySelector('[data-form]');const seq=++formSeq;
      let step=0,basis=null,basisRequest=0,busy=false,dirty=false,confirmClose=false;
      root._editing=true;root.classList.add('co-editing');
      const types=[
        ['simple','A little getaway','A discount for the dates you choose.','01'],
        ['quiet','Quieter weekdays','For stays on Sunday through Thursday.','02'],
        ['long','Stay a little longer','For guests booking 7 nights or more.','03'],
        ['early','Plan ahead','For arrivals at least 30 days away.','04'],
        ['late','Last-minute escape','For arrivals within the next 3 days.','05']
      ];
      const chosenType=existing?null:'simple';
      wrap.innerHTML=`<form class="co-form co-wizard" novalidate>
        <div class="co-editor-head"><div><span class="co-eyebrow">${campaign?'CABANA CAMPAIGN':existing?'YOUR OFFER':'A GOOD REASON TO BOOK'}</span><h3>${existing?'Make it yours':campaign?esc(campaign.title):'Create something worth staying for'}</h3></div><button type="button" data-close>Close</button></div>
        <ol class="co-steps" aria-label="Create offer progress">${['Choose your offer','Discount & dates','Review & finish'].map((s,i)=>`<li data-progress="${i}"><span>${i+1}</span>${s}</li>`).join('')}</ol>
        <div class="co-editor-layout"><div class="co-editor-main">
          <div data-form-error class="co-error" role="alert" tabindex="-1"></div>
          <section data-step="0" aria-label="Choose your offer"><h4 tabindex="-1">What would you like to offer?</h4><p>${existing?'Your existing rules are kept. Choose an idea only if you want to change them.':'Pick a starting point. You can fine-tune it next.'}</p>
            <label class="co-field">Choose your stay<select name="listing_id" ${existing?'disabled':''}>${eligible.map(l=>`<option value="${esc(l.id)}" ${l.id===(o.listing_id||chosenListing)?'selected':''}>${esc(l.title)}</option>`).join('')}</select></label>
            ${campaign?`<div class="co-invitation"><span class="co-eyebrow">YOU'RE INVITED</span><h4>${esc(campaign.title)}</h4><p>${esc(campaign.description||'Join this Cabana occasion with an offer that works for you.')}</p><strong>Choose ${campaign.min_discount}–${campaign.max_discount}% off</strong><p>Your listing joins only when you publish your offer.</p></div>`:
              `<div class="co-type-grid" role="group" aria-label="Offer ideas">${types.map(([key,title,desc,num])=>`<button type="button" class="co-type" data-preset="${key}" aria-pressed="${key===chosenType}"><span class="co-type-mark">${num}</span><span><strong>${title}</strong><small>${desc}</small></span><span class="co-type-check" aria-hidden="true">✓</span></button>`).join('')}</div>`}
          </section>
          <section data-step="1" hidden aria-label="Discount and dates"><h4 tabindex="-1">Your discount. Your dates.</h4><p>Choose what works for your stay. The preview updates as you go.</p>
            <label class="co-field">How much would you like to take off?<div class="co-discount-input"><input name="discount_pct" aria-label="Discount percentage" type="number" value="${o.discount_pct??Math.max(campaign?.min_discount||1,Math.min(10,campaign?.max_discount||80))}" required min="${campaign?.min_discount||1}" max="${campaign?.max_discount||80}" step="0.1"><span>%</span></div></label>
            <div class="co-chips" role="group" aria-label="Suggested discounts">${[5,10,15,20].filter(p=>p>=(campaign?.min_discount||1)&&p<=(campaign?.max_discount||80)).map(p=>`<button type="button" data-discount="${p}">${p}%</button>`).join('')}</div>
            <div class="co-section-label">Which stays get this offer?</div><div class="co-grid">
              ${field('First check-in','stay_start',o.stay_start||defaults.stay_start,'date','required')}
              ${field('Last checkout','stay_end',o.stay_end||defaults.stay_end,'date','required')}
            </div><p class="co-help">All nights in the booking must fit within these dates.</p>
            <div class="co-booking-summary" data-booking-summary></div>
            <details data-advanced><summary>More options <span>Booking period, minimum rate & stay rules</span></summary><div class="co-grid">
              <div class="co-full co-help">When can guests book this offer? Times below are in ${esc(zone.replace(/_/g,' '))}.</div>
              ${field('Guests can book from','booking_start',localInput(o.booking_start||defaults.booking_start),'datetime-local','required')}
              ${field('Stop accepting offer bookings','booking_end',localInput(o.booking_end||defaults.booking_end),'datetime-local','required')}
              ${field('Do not go below (KES / night)','floor_nightly',o.floor_nightly??1,'number','required min="1" max="99999999" step="0.01"')}
              ${field('Minimum nights','min_nights',o.min_nights??1,'number','required min="1" max="365"')}
              ${field('Maximum nights','max_nights',o.max_nights??365,'number','required min="1" max="365"')}
              ${field('Book at least this many days ahead','min_lead_days',o.min_lead_days??0,'number','required min="0" max="730"')}
              ${field('Book no more than this many days ahead','max_lead_days',o.max_lead_days??730,'number','required min="0" max="730"')}
              ${field('Stay-rule time zone','timezone',o.timezone||campaign?.timezone||zone,'text','required maxlength="80"')}
              <div class="co-field co-full">Nights included<div class="co-checks">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>`<label><input type="checkbox" name="weekday" value="${i}" ${(o.weekdays||[0,1,2,3,4,5,6]).includes(i)?'checked':''}>${d}</label>`).join('')}</div></div>
              <label class="co-field co-full">Leave out these nights<textarea name="excluded_dates" placeholder="YYYY-MM-DD, YYYY-MM-DD">${esc((o.excluded_dates||[]).join(', '))}</textarea><span class="co-help">Separate dates with commas. Bookings containing these nights do not get this offer.</span></label>
            </div></details>
          </section>
          <section data-step="2" hidden aria-label="Review your offer"><h4 tabindex="-1">Looking good. Ready when you are.</h4><p>Check the details, then publish or save it for later.</p>
            ${field('Offer name','title',o.title||campaign?.title||'A little getaway','text','required minlength="3" maxlength="80"')}
            <div data-review class="co-review"></div>
            <div class="co-trust-line">Your cancellation policy stays the same. You can pause this offer at any time.</div>
          </section>
        </div><aside class="co-preview-panel" aria-label="Your price preview"><span class="co-eyebrow">YOUR PRICE, AT A GLANCE</span><div data-preview role="status" aria-live="polite">Loading your nightly price…</div><p class="co-help">One eligible night, before guest credits. Longer bookings can have a different Cabana fee. The best eligible offer applies automatically.</p></aside></div>
        <div class="co-editor-footer"><button type="button" data-back hidden>Back</button><span data-step-note>Nothing goes live until you publish.</span><div class="co-actions"><button type="button" data-draft hidden>Save as draft</button><button type="button" data-next class="co-primary">Continue <span aria-hidden="true">→</span></button><button type="submit" data-publish class="co-primary" hidden>${existing?'Save changes':campaign?'Join & publish offer':'Publish offer'}</button></div></div>
      </form>`;
      const form=wrap.querySelector('form'),el=name=>form.elements.namedItem(name),get=name=>el(name).value;
      function formError(message){const dest=form.querySelector('[data-form-error]');dest.textContent=message;dest.focus();}
      function close(force=false){
        if(busy)return false;
        if(dirty&&!force&&!confirmClose){confirmClose=true;form.querySelector('[data-close]').textContent='Discard changes?';return false;}
        formSeq++;root._editing=false;root._cancelEdit=null;root.classList.remove('co-editing');wrap.innerHTML='';
        root.querySelector('[data-new]')?.focus();return true;
      }
      root._cancelEdit=()=>close();
      function model(){
        return {listing_id:get('listing_id'),host_id:uid,title:get('title').trim(),status:existing?.status||'draft',
          discount_pct:Number(get('discount_pct')),floor_nightly:Number(get('floor_nightly')),
          booking_start:readLocalTime(get('booking_start'),o.booking_start||defaults.booking_start),
          booking_end:readLocalTime(get('booking_end'),o.booking_end||defaults.booking_end),
          stay_start:get('stay_start'),stay_end:get('stay_end'),timezone:get('timezone').trim(),
          min_nights:Number(get('min_nights')),max_nights:Number(get('max_nights')),
          min_lead_days:Number(get('min_lead_days')),max_lead_days:Number(get('max_lead_days')),
          weekdays:Array.from(form.querySelectorAll('[name=weekday]:checked')).map(c=>Number(c.value)),
          excluded_dates:get('excluded_dates').split(/[\s,]+/).filter(Boolean),campaign_id:campaign?.id||o.campaign_id||null};
      }
      function validate(){
        for(const input of Array.from(form.elements)){if(input.willValidate&&!input.checkValidity()){
          const panel=input.closest('[data-step]');if(panel)showStep(Number(panel.dataset.step),false);
          const details=input.closest('details');if(details)details.open=true;input.reportValidity();return false;
        }}
        try{
          const r=model();
          if(r.stay_end<=r.stay_start)throw Error('Last checkout must be after the first check-in.');
          if(Date.parse(r.booking_end)<=Date.parse(r.booking_start))throw Error('The booking period must end after it starts.');
          if(r.min_nights>r.max_nights)throw Error('Maximum nights must be at least the minimum nights.');
          if(r.min_lead_days>r.max_lead_days)throw Error('The latest booking limit must be at least the earliest limit.');
          if(!r.weekdays.length)throw Error('Choose at least one night for this offer.');
          if(r.excluded_dates.some(d=>!validDate(d)))throw Error('Use real dates in YYYY-MM-DD format for excluded nights.');
          try{new Intl.DateTimeFormat('en',{timeZone:r.timezone}).format();}catch{throw Error('Use a recognised time zone, such as Africa/Nairobi.');}
          if(campaign&&(r.discount_pct<campaign.min_discount||r.discount_pct>campaign.max_discount||
            Date.parse(r.booking_start)<Date.parse(campaign.booking_start)||Date.parse(r.booking_end)>Date.parse(campaign.booking_end)||
            r.stay_start<campaign.stay_start||r.stay_end>campaign.stay_end))throw Error('Keep your discount and dates within the campaign invitation.');
          if(!basis)throw Error('Your price preview has not loaded yet. Try loading it again.');
          if(existing&&existing.terms_key!==basis.terms_key)throw Error('Your listing details changed. Please create a new offer for the updated stay.');
          if(!pricePreview(basis,r,existing))throw Error('Your minimum rate leaves no discount. Lower the minimum rate or adjust the discount.');
          return true;
        }catch(e){showStep(1,false);formError(e.message);return false;}
      }
      function preview(){
        const dest=form.querySelector('[data-preview]');
        let row;try{row=model();}catch{return;}
        const bStart=Date.parse(row.booking_start),bEnd=Date.parse(row.booking_end);
        form.querySelector('[data-booking-summary]').textContent=Number.isFinite(bEnd)?'Guests can book '+(bStart<=Date.now()?'now':'from '+when(row.booking_start))+' until '+when(row.booking_end)+'. Change this in More options.':'Set a booking period in More options.';
        form.querySelectorAll('[data-discount]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.discount)===row.discount_pct)));
        if(!basis)return;
        const p=pricePreview(basis,row,existing),l=eligible.find(l=>l.id===row.listing_id);
        if(!p){dest.innerHTML='<p>Adjust your discount or minimum rate to see a lower nightly price.</p>';return;}
        dest.innerHTML=`<div class="co-preview-stay">${esc(l?.title)}</div><span class="co-help">You receive per night</span><div class="co-price">${money(p.nightly)}</div><div class="co-price-line"><span>Cabana fee</span><b>${money(p.fee)}</b></div><div class="co-price-line co-price-total"><span>Guest pays</span><b>${money(p.nightly+p.fee)}</b></div><div class="co-preview-badge">${p.effective.toFixed(1).replace(/\.0$/,'')}% below your comparison rate</div><details><summary>How this price is worked out</summary><p class="co-help">We use your protected comparison rate of ${money(p.reference)}. If recent prices are lower, we use those. Guest savings labels appear only when enough price history supports them.</p></details>`;
        if(step===2){
          const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          form.querySelector('[data-review]').innerHTML=`<div><span>Stay</span><strong>${esc(l?.title)}</strong></div><div><span>Stay dates</span><strong>${dateLabel(row.stay_start)} – ${dateLabel(row.stay_end)}</strong></div><div><span>Guests can book</span><strong>${when(row.booking_start)} – ${when(row.booking_end)}</strong></div><div><span>Stay length</span><strong>${row.min_nights}–${row.max_nights} nights</strong></div><div><span>Nights included</span><strong>${row.weekdays.map(d=>weekdays[d]).join(', ')}</strong></div><div><span>Advance booking</span><strong>${row.min_lead_days}–${row.max_lead_days} days before arrival</strong></div>${row.excluded_dates.length?`<div><span>Excluded nights</span><strong>${esc(row.excluded_dates.join(', '))}</strong></div>`:''}${campaign?`<div><span>Campaign</span><strong>${esc(campaign.title)}</strong></div>`:''}${existing?`<div><span>Status after saving</span><strong>${esc(state(existing))}</strong></div>`:''}`;
        }
      }
      function showStep(next,focus=true){
        step=next;form.querySelector('[data-form-error]').textContent='';
        form.querySelectorAll('[data-step]').forEach(s=>s.hidden=Number(s.dataset.step)!==step);
        form.querySelectorAll('[data-progress]').forEach(s=>{s.setAttribute('aria-current',Number(s.dataset.progress)===step?'step':'false');s.classList.toggle('is-done',Number(s.dataset.progress)<step);});
        form.querySelector('[data-back]').hidden=step===0;form.querySelector('[data-next]').hidden=step===2;
        form.querySelector('[data-publish]').hidden=step!==2;form.querySelector('[data-draft]').hidden=step!==2||!!existing;
        form.querySelector('[data-step-note]').textContent=step===2?(existing?'Saving keeps the current status.':'You can pause your offer whenever you need.'):'Nothing goes live until you publish.';
        preview();
        if(focus){form.querySelector('[data-step="'+step+'"] h4').focus({preventScroll:true});wrap.scrollIntoView({block:'start',behavior:'auto'});}
      }
      async function refreshBasis(){
        const request=++basisRequest,id=get('listing_id');basis=null;
        form.querySelector('[data-preview]').textContent='Loading your nightly price…';
        try{const b=await checked(client.rpc('cabana_stay_offer_basis',{p_listing_id:id}));
          if(seq!==formSeq||request!==basisRequest||id!==get('listing_id'))return;basis=b;preview();
        }catch(e){if(seq!==formSeq||request!==basisRequest)return;const dest=form.querySelector('[data-preview]');dest.innerHTML='<p>We could not load your price.</p><button type="button" data-retry>Try again</button>';dest.querySelector('[data-retry]').onclick=refreshBasis;}
      }
      form.oninput=()=>{dirty=true;confirmClose=false;form.querySelector('[data-close]').textContent='Close';preview();};
      form.onchange=()=>{dirty=true;preview();};
      el('listing_id').onchange=refreshBasis;
      form.querySelector('[data-close]').onclick=()=>close();
      form.querySelector('[data-back]').onclick=()=>showStep(step-1);
      form.querySelector('[data-next]').onclick=()=>{if(step===0||validate())showStep(step+1);};
      form.querySelectorAll('[data-discount]').forEach(b=>b.onclick=()=>{el('discount_pct').value=b.dataset.discount;dirty=true;preview();});
      form.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
        const key=b.dataset.preset;el('title').value=types.find(t=>t[0]===key)[1];
        if(!existing&&key==='early'){el('stay_start').value=day(30);el('stay_end').value=day(90);}
        el('min_nights').value=key==='long'?7:1;el('min_lead_days').value=key==='early'?30:0;el('max_lead_days').value=key==='late'?3:730;
        form.querySelectorAll('[name=weekday]').forEach(c=>c.checked=key==='quiet'?[0,1,2,3,4].includes(Number(c.value)):true);
        form.querySelectorAll('[data-preset]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));dirty=true;preview();
      });
      async function save(status){
        if(busy||!validate())return;
        busy=true;const buttons=Array.from(form.querySelectorAll('button'));buttons.forEach(b=>b.disabled=true);
        try{
          const row=model();row.status=status;
          await checked(existing?client.from('stay_offers').update(row).eq('id',existing.id).select('id').single():client.from('stay_offers').insert(row).select('id').single());
          busy=false;close(true);tab='offers';
          try{await load();}catch{shell();root.querySelector('[data-list]').innerHTML='<div class="co-card">Your offer was saved. Reload this page to see the latest list.</div>';return;}
          shell();render();const notice=root.querySelector('[data-notice]');notice.textContent=status==='draft'?'Draft saved. Come back whenever you are ready.':existing?'Offer updated.':Date.parse(row.booking_start)>Date.now()?'Offer scheduled. It will start automatically.':'Your offer is live. Eligible guests get it automatically.';notice.focus();
        }catch(e){busy=false;formError('Could not save your offer. '+e.message);}
        finally{buttons.forEach(b=>b.disabled=false);}
      }
      form.onsubmit=e=>{e.preventDefault();if(step<2){form.querySelector('[data-next]').click();return;}save(existing?.status||'active');};
      form.querySelector('[data-draft]').onclick=()=>save('draft');
      showStep(0);refreshBasis();
    }

    function editCampaign(existing=null){
      if(root._editing)return;
      const o=existing||{},joined=offers.some(s=>s.campaign_id===o.id),wrap=root.querySelector('[data-form]');
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Africa/Nairobi';
      const initialStart=o.booking_start||new Date().toISOString(),initialEnd=o.booking_end||day(30)+'T23:59:00Z';
      let dirty=false,busy=false,closing=false;root._editing=true;root.classList.add('co-editing');
      wrap.innerHTML=`<form class="co-form"><div class="co-editor-head"><div><span class="co-eyebrow">CREATE AN OCCASION</span><h3>${existing?'Your campaign':'An invitation worth joining'}</h3></div><button type="button" data-close>Close</button></div>
        <p>${joined?'Hosts have joined. You can update the invitation or pause the campaign. Dates and discount limits are locked.':'Give hosts an occasion to join. They choose their own discount and publish their own offers.'}</p>
        <div data-form-error class="co-error" role="alert" tabindex="-1"></div>
        <div class="co-section-label">1. Set the scene</div><div class="co-grid">
          ${field('Campaign name','title',o.title||'','text','required minlength="3" maxlength="80" placeholder="For example, Christmas stays"')}
          ${existing?`<label class="co-field">Campaign visibility<select name="status">${[['draft','Draft · only admins'],['published','Open for hosts to join'],['paused','Paused'],['ended','Ended']].map(([key,label])=>`<option value="${key}" ${key===o.status?'selected':''}>${label}</option>`).join('')}</select></label>`:'<input type="hidden" name="status" value="draft">'}
          <label class="co-field co-full">Your invitation to hosts<textarea name="description" maxlength="600" placeholder="What makes this occasion special?">${esc(o.description||'')}</textarea></label>
        </div><div class="co-section-label co-spaced">2. Choose the stay dates</div><div class="co-grid">
          ${field('First check-in','stay_start',o.stay_start||day(1),'date','required')}
          ${field('Last checkout','stay_end',o.stay_end||day(90),'date','required')}
        </div><div class="co-section-label co-spaced">3. Let hosts choose within this range</div><div class="co-grid">
          ${field('Minimum discount (%)','min_discount',o.min_discount??5,'number','required min="1" max="80" step="0.1"')}
          ${field('Maximum discount (%)','max_discount',o.max_discount??30,'number','required min="1" max="80" step="0.1"')}
        </div><details><summary>Booking period & location <span>Times shown in ${esc(zone.replace(/_/g,' '))}</span></summary><div class="co-grid">
          ${field('Guests can book from','booking_start',localInput(initialStart),'datetime-local','required')}
          ${field('Stop accepting offer bookings','booking_end',localInput(initialEnd),'datetime-local','required')}
          ${field('Campaign time zone','timezone',o.timezone||zone,'text','required')}
          ${field('Countries · leave blank for all','countries',(o.countries||[]).join(', '),'text','placeholder="Kenya, Tanzania"')}
        </div></details><div class="co-trust-line">Publishing invites hosts to join. It does not discount or enrol any listing automatically.</div>
        <div class="co-editor-footer"><span data-step-note>${existing?'Review your changes before saving.':'Keep it as a draft until you are ready.'}</span><div class="co-actions">${!existing?'<button type="submit" data-save-status="draft">Save as draft</button>':''}<button type="submit" class="co-primary" data-save-status="${existing?'':'published'}">${existing?'Save changes':'Publish invitation'}</button></div></div></form>`;
      const form=wrap.querySelector('form'),get=n=>form.elements.namedItem(n).value;
      if(joined)Array.from(form.elements).forEach(e=>{if(e.name&&!['status','description'].includes(e.name))e.disabled=true;});
      function close(force=false){if(busy)return false;if(dirty&&!force&&!closing){closing=true;form.querySelector('[data-close]').textContent='Discard changes?';return false;}root._editing=false;root._cancelEdit=null;root.classList.remove('co-editing');wrap.innerHTML='';return true;}
      root._cancelEdit=close;form.oninput=()=>{dirty=true;closing=false;form.querySelector('[data-close]').textContent='Close';};
      form.querySelector('[data-close]').onclick=()=>close();
      form.onsubmit=async e=>{e.preventDefault();if(busy)return;
        try{
          let row={status:existing?get('status'):e.submitter?.dataset.saveStatus||'draft',description:get('description').trim()};
          if(!joined){
            row={...row,title:get('title').trim(),timezone:get('timezone').trim(),booking_start:readLocalTime(get('booking_start'),initialStart),booking_end:readLocalTime(get('booking_end'),initialEnd),stay_start:get('stay_start'),stay_end:get('stay_end'),min_discount:Number(get('min_discount')),max_discount:Number(get('max_discount')),countries:get('countries').split(',').map(s=>s.trim()).filter(Boolean)};
            if(row.stay_end<=row.stay_start)throw Error('Last checkout must be after the first check-in.');
            if(Date.parse(row.booking_end)<=Date.parse(row.booking_start))throw Error('The booking period must end after it starts.');
            if(row.max_discount<row.min_discount)throw Error('Maximum discount must be at least the minimum.');
            try{new Intl.DateTimeFormat('en',{timeZone:row.timezone}).format();}catch{throw Error('Enter a recognised time zone, such as Africa/Nairobi.');}
          }
          busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);
          await checked(existing?client.from('stay_offer_campaigns').update(row).eq('id',o.id).select('id').single():client.from('stay_offer_campaigns').insert(row).select('id').single());
          busy=false;close(true);tab='campaigns';
          try{await load();}catch{shell();root.querySelector('[data-list]').innerHTML='<div class="co-card">Campaign saved. Reload to see the latest list.</div>';return;}
          shell();render();root.querySelector('[data-notice]').textContent=row.status==='draft'?'Campaign draft saved.':existing?'Campaign updated.':'Your invitation is open for hosts to join.';
        }catch(err){const dest=form.querySelector('[data-form-error]');dest.textContent='Could not save the campaign. '+err.message;dest.focus();}
        finally{busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
      };
      wrap.scrollIntoView({block:'start',behavior:'auto'});form.querySelector('[name=title]')?.focus({preventScroll:true});
    }
    try{await load();shell();render();root._offers={edit,reload:async()=>{await load();shell();render();}};if(listingId)edit(null,listingId);}catch(e){root.innerHTML=`<div class="co-error" role="alert">Could not load offers: ${esc(e.message)}</div><button type="button">Try again</button>`;root.querySelector('button').onclick=()=>mount({client,root,admin,listingId});}
  }
  W.CabanaOffers={mount};
})(window);
