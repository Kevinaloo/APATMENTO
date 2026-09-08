/* Existing Partner Hub / admin surfaces share one offer editor. All writes
   use the signed-in Supabase client; ownership and pricing are enforced in SQL. */
(function(W){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'KES '+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
  const day=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
  const utcInput=s=>new Date(s).toISOString().slice(0,16);
  const field=(label,name,value,type='text',attrs='')=>`<label class="co-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const state=o=>o.status==='active'?(Date.now()<Date.parse(o.booking_start)?'Scheduled':Date.now()>=Date.parse(o.booking_end)?'Expired':'Live'):o.status==='published'?(Date.now()>=Date.parse(o.booking_end)?'Expired':'Open to hosts'):o.status;
  const when=s=>new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC';
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
    function shell(){root.innerHTML=`<div class="co-head"><div><h2>${admin?'Offers & campaigns':'Make a good stay even better'}</h2><p>${admin?'Invite hosts into seasonal campaigns. Every host chooses their own discount.':'Thoughtful offers, your minimum rate, and a clear price for every guest.'}</p></div><button type="button" data-new>${admin?'Create campaign':'Create offer'}</button></div>
      <div class="co-note">The best eligible offer applies automatically. No stacking, inflated comparison prices or paid ranking boosts. Hosts fund their own discounts; Cabana credits are shown separately.</div>
      <div class="co-tabs"><button type="button" data-tab="offers" aria-pressed="${tab==='offers'}">${admin?'Host offers':'Your offers'}</button><button type="button" data-tab="campaigns" aria-pressed="${tab==='campaigns'}">${admin?'Campaigns':'Seasonal campaigns'}</button></div>
      <div data-error class="co-error" role="alert" tabindex="-1"></div><div data-form></div><div data-list></div>`;
      root.querySelector('[data-new]').onclick=()=>admin?editCampaign():edit();
      root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;shell();render();});
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
        const l=listings.find(l=>l.id===o.listing_id);
        return `<article class="co-card"><div class="co-head"><h3>${esc(o.title)}</h3><span class="co-status">${esc(state(o))}</span></div>
          <p>${tab==='offers'?esc(l?.title||'Stay listing')+' · '+esc(o.discount_pct)+'% requested · minimum '+money(o.floor_nightly)+'/night':esc(o.description)}</p>
          <div class="co-help">Book: ${esc(when(o.booking_start))} to ${esc(when(o.booking_end))}<br>Stay: ${esc(o.stay_start)} to ${esc(o.stay_end)} (latest checkout)</div>
          ${tab==='offers'?`<p>Protected reference: ${money(o.reference_nightly)}/night. Lower recorded prices can reduce it further. The actual saving respects your minimum rate.</p>`:`<p>Hosts choose ${o.min_discount}–${o.max_discount}% · ${o.countries.length?esc(o.countries.join(', ')):'All countries'} · ${esc(o.timezone)}</p>`}
          <div class="co-actions">${tab==='offers'?(!admin?`<button type="button" data-edit="${o.id}">Edit / preview</button>`:''):
            (admin?`<button type="button" data-campaign="${o.id}">Manage campaign</button>`:
            (o.status==='published'&&Date.parse(o.booking_end)>Date.now()?`<button type="button" data-join="${o.id}" class="co-primary">Join with my discount</button>`:''))}
            ${tab==='offers'&&o.status!=='ended'?`<button type="button" data-status="${o.id}" data-next="${o.status==='active'?'paused':admin?'ended':'active'}">${o.status==='active'?'Pause':admin?'End':'Activate'}</button><button type="button" data-status="${o.id}" data-next="ended">End offer</button>`:''}
          </div></article>`;
      }).join(''):`<div class="co-card"><h3>${tab==='offers'?'Room for something thoughtful':'No seasonal campaigns open yet'}</h3><p>${tab==='offers'?'Fill quieter nights, reward longer stays, or welcome guests who plan ahead. Start with a rate you are comfortable receiving.':'Campaigns created by Cabana will appear here. Joining is always your choice.'}</p></div>`;
      dest.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(offers.find(o=>o.id===b.dataset.edit)));
      dest.querySelectorAll('[data-campaign]').forEach(b=>b.onclick=()=>editCampaign(campaigns.find(o=>o.id===b.dataset.campaign)));
      dest.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>edit(null,null,campaigns.find(o=>o.id===b.dataset.join)));
      dest.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await checked(client.from('stay_offers').update({status:b.dataset.next}).eq('id',b.dataset.status).select('id').single());await load();render();}catch(e){error(e);}finally{b.disabled=false;}});
    }
    function edit(existing=null,chosenListing=null,campaign=null){
      if(admin)return;
      const eligible=listings.filter(l=>l.partner_id===uid&&(l.currency||'KES')==='KES'&&l.ownership_type!=='held'&&Number(l.price_night||l.price_per_night)>0);
      if(!eligible.length){error(Error('Add a claimed stay with a KES nightly price to create an offer.'));return;}
      const o=existing||{};campaign=campaign||campaigns.find(c=>c.id===o.campaign_id);
      const defaults={booking_start:campaign?.booking_start||new Date().toISOString(),booking_end:campaign?.booking_end||day(30)+'T23:59:00Z',stay_start:campaign?.stay_start||day(0),stay_end:campaign?.stay_end||day(90)};
      const wrap=root.querySelector('[data-form]');const seq=++formSeq;
      wrap.innerHTML=`<form class="co-form"><div class="co-head"><h3>${existing?'Edit offer':campaign?'Join '+esc(campaign.title):'Create an offer'}</h3><button type="button" data-close>Close</button></div>
        <p>Start simple. Add conditions only when they help you host comfortably.</p>
        ${!existing&&!campaign?'<div class="co-actions"><button type="button" data-preset="quiet">Quieter weekdays</button><button type="button" data-preset="long">Longer stays</button><button type="button" data-preset="early">Plan ahead</button><button type="button" data-preset="late">Last minute</button></div>':''}
        <div class="co-grid" style="margin-top:18px"><label class="co-field">Your stay<select name="listing_id" ${existing?'disabled':''}>${eligible.map(l=>`<option value="${l.id}" ${l.id===(o.listing_id||chosenListing)?'selected':''}>${esc(l.title)}</option>`).join('')}</select></label>
          ${field('Offer name','title',o.title||campaign?.title||'','text','required minlength="3" maxlength="80"')}
          ${field('Discount you would like to give (%)','discount_pct',o.discount_pct??Math.max(campaign?.min_discount||1,Math.min(10,campaign?.max_discount||80)),'number',`required min="${campaign?.min_discount||1}" max="${campaign?.max_discount||80}" step="0.1"`)}
          ${field('Minimum you receive per night (KES)','floor_nightly',o.floor_nightly??1,'number','required min="1" max="99999999" step="0.01"')}
          ${field('Booking opens (UTC)','booking_start',utcInput(o.booking_start||defaults.booking_start),'datetime-local','required')}
          ${field('Booking closes (UTC)','booking_end',utcInput(o.booking_end||defaults.booking_end),'datetime-local','required')}
          ${field('First eligible check-in','stay_start',o.stay_start||defaults.stay_start,'date','required')}
          ${field('Latest eligible checkout','stay_end',o.stay_end||defaults.stay_end,'date','required')}
          ${field('Time zone for advance-booking days','timezone',o.timezone||campaign?.timezone||'Africa/Nairobi','text','required maxlength="80"')}
          <label class="co-field">Status<select name="status">${['draft','active','paused','ended'].map(s=>`<option ${s===(o.status||'draft')?'selected':''}>${s}</option>`).join('')}</select></label>
        </div>
        <details><summary>Stay length, advance booking & excluded nights</summary><div class="co-grid">
          ${field('Minimum nights','min_nights',o.min_nights??1,'number','required min="1" max="365"')}
          ${field('Maximum nights','max_nights',o.max_nights??365,'number','required min="1" max="365"')}
          ${field('Book at least this many days ahead','min_lead_days',o.min_lead_days??0,'number','required min="0" max="730"')}
          ${field('Book at most this many days ahead','max_lead_days',o.max_lead_days??730,'number','required min="0" max="730"')}
          <div class="co-field co-full">Eligible nights<div class="co-checks">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>`<label><input type="checkbox" name="weekday" value="${i}" ${(o.weekdays||[0,1,2,3,4,5,6]).includes(i)?'checked':''}>${d}</label>`).join('')}</div><span class="co-help">Every night must qualify. Checkout day is not a night.</span></div>
          <label class="co-field co-full">Excluded nights<textarea name="excluded_dates" placeholder="2026-12-24, 2026-12-25">${esc((o.excluded_dates||[]).join(', '))}</textarea><span class="co-help">Separate dates with commas. These nights keep their normal rate and make a stay ineligible for this offer.</span></label>
        </div></details>
        <div class="co-preview" data-preview role="status">Checking your protected reference price…</div>
        <div class="co-help">Your preview shows one eligible night before guest credits. A booking must satisfy all conditions. Another eligible offer may give the guest a better price. No offer changes your cancellation policy or guarantees bookings.</div>
        <div class="co-actions"><button type="submit" class="co-primary">${campaign?'Save my participation':'Save offer'}</button></div>
      </form>`;
      const form=wrap.querySelector('form');const el=name=>form.elements.namedItem(name);let basis=null;
      function preview(){const dest=form.querySelector('[data-preview]');if(!basis)return;
        const ref=Math.min(Number(basis.reference_nightly),existing?Number(existing.reference_nightly):Infinity);
        const pct=Number(el('discount_pct').value),floor=Number(el('floor_nightly').value);
        const nightly=Math.max(floor,Math.round(ref*(1-pct/100)*100)/100);
        const valid=Number.isFinite(nightly)&&nightly>0&&nightly<ref;
        dest.innerHTML=valid?`<div class="co-price">${money(nightly)} / night to you</div><div>Guest total for one eligible night: <b>${money(nightly+(nightly<5000?300:800))}</b>, including the existing Cabana fee.</div><div>Protected reference: ${money(ref)}. Effective reduction: ${((1-nightly/ref)*100).toFixed(1)}%.</div><div>${basis.verified?'30-day base price history is available. Savings claims also depend on offer history and duration.':'Price history is building. Guests see the offer price without a verified savings claim.'}</div>`:'Your minimum rate leaves no saving. Lower it or choose another offer.';
        if(existing&&existing.terms_key!==basis.terms_key)dest.innerHTML+='<div class="co-error">This listing’s terms changed. End this offer and create a new one for the current terms.</div>';
      }
      async function refreshBasis(){basis=null;form.querySelector('[data-preview]').textContent='Checking your protected reference price…';try{
        const id=el('listing_id').value;const b=await checked(client.rpc('cabana_stay_offer_basis',{p_listing_id:id}));
        if(seq!==formSeq||id!==el('listing_id').value)return;basis=b;preview();
      }catch(e){if(seq===formSeq)form.querySelector('[data-preview]').textContent='Could not load the preview. '+e.message;}}
      el('listing_id').onchange=refreshBasis;el('discount_pct').oninput=preview;el('floor_nightly').oninput=preview;
      form.querySelector('[data-close]').onclick=()=>{formSeq++;wrap.innerHTML='';};
      form.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const p=b.dataset.preset;el('title').value=({quiet:'Quieter weekdays',long:'Stay a little longer',early:'Plan ahead',late:'A last-minute getaway'})[p];el('min_nights').value=p==='long'?7:1;el('min_lead_days').value=p==='early'?30:0;el('max_lead_days').value=p==='late'?3:730;form.querySelectorAll('[name=weekday]').forEach(c=>c.checked=p==='quiet'?[0,1,2,3,4].includes(Number(c.value)):true);});
      form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
        try{if(!basis)throw Error('Wait for the price preview before saving.');
          const get=n=>el(n).value;const row={listing_id:get('listing_id'),host_id:uid,title:get('title').trim(),status:get('status'),
            discount_pct:Number(get('discount_pct')),floor_nightly:Number(get('floor_nightly')),
            booking_start:new Date(get('booking_start')+'Z').toISOString(),booking_end:new Date(get('booking_end')+'Z').toISOString(),
            stay_start:get('stay_start'),stay_end:get('stay_end'),timezone:get('timezone').trim(),
            min_nights:Number(get('min_nights')),max_nights:Number(get('max_nights')),min_lead_days:Number(get('min_lead_days')),max_lead_days:Number(get('max_lead_days')),
            weekdays:Array.from(form.querySelectorAll('[name=weekday]:checked')).map(c=>Number(c.value)),
            excluded_dates:get('excluded_dates').split(/[\s,]+/).filter(Boolean),campaign_id:campaign?.id||o.campaign_id||null};
          if(!row.weekdays.length)throw Error('Choose at least one eligible night.');
          if(row.excluded_dates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))throw Error('Use YYYY-MM-DD for excluded dates.');
          await checked(existing?client.from('stay_offers').update(row).eq('id',existing.id).select('id').single():client.from('stay_offers').insert(row).select('id').single());
          formSeq++;await load();tab='offers';shell();render();
        }catch(err){error(err);}finally{button.disabled=false;}
      };
      refreshBasis();wrap.scrollIntoView({block:'start',behavior:'auto'});
    }
    function editCampaign(existing=null){
      const o=existing||{};const joined=offers.some(s=>s.campaign_id===o.id);const wrap=root.querySelector('[data-form]');
      wrap.innerHTML=`<form class="co-form"><div class="co-head"><h3>${existing?'Manage campaign':'Invite hosts to a special occasion'}</h3><button type="button" data-close>Close</button></div><p>${joined?'Hosts have joined. Dates and discount limits are locked to preserve their consent. You can pause or end the campaign.':'Create Christmas specials, cultural celebrations or quieter-season campaigns. Nothing discounts a host’s listing until they choose to join.'}</p><div class="co-grid">
        ${field('Campaign name','title',o.title||'','text','required minlength="3" maxlength="80"')}
        <label class="co-field">Status<select name="status">${['draft','published','paused','ended'].map(s=>`<option ${s===(o.status||'draft')?'selected':''}>${s}</option>`).join('')}</select></label>
        <label class="co-field co-full">Invitation to hosts<textarea name="description" maxlength="600">${esc(o.description||'')}</textarea></label>
        ${field('Booking opens (UTC)','booking_start',utcInput(o.booking_start||new Date().toISOString()),'datetime-local','required')}
        ${field('Booking closes (UTC)','booking_end',utcInput(o.booking_end||day(30)+'T23:59Z'),'datetime-local','required')}
        ${field('First eligible check-in','stay_start',o.stay_start||day(1),'date','required')}
        ${field('Latest eligible checkout','stay_end',o.stay_end||day(90),'date','required')}
        ${field('Minimum host discount (%)','min_discount',o.min_discount??1,'number','required min="1" max="80" step="0.1"')}
        ${field('Maximum host discount (%)','max_discount',o.max_discount??80,'number','required min="1" max="80" step="0.1"')}
        ${field('Campaign time zone','timezone',o.timezone||'Africa/Nairobi','text','required')}
        ${field('Countries (empty means all)','countries',(o.countries||[]).join(', '),'text','placeholder="Kenya, Tanzania"')}
        </div><p>Country names must match listing countries. Booking windows are entered in UTC; stay dates are calendar dates. Hosts may add stricter eligibility and a minimum rate.</p><div class="co-actions"><button type="submit" class="co-primary">Save campaign</button></div></form>`;
      const form=wrap.querySelector('form');if(joined)Array.from(form.elements).forEach(e=>{if(e.name&&!['status','description'].includes(e.name))e.disabled=true;});
      form.querySelector('[data-close]').onclick=()=>wrap.innerHTML='';
      form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;try{
        const get=n=>form.elements.namedItem(n).value;let row={status:get('status'),description:get('description').trim()};
        if(!joined)row={...row,title:get('title').trim(),timezone:get('timezone').trim(),booking_start:new Date(get('booking_start')+'Z').toISOString(),booking_end:new Date(get('booking_end')+'Z').toISOString(),stay_start:get('stay_start'),stay_end:get('stay_end'),min_discount:Number(get('min_discount')),max_discount:Number(get('max_discount')),countries:get('countries').split(',').map(s=>s.trim()).filter(Boolean)};
        await checked(existing?client.from('stay_offer_campaigns').update(row).eq('id',o.id).select('id').single():client.from('stay_offer_campaigns').insert(row).select('id').single());await load();tab='campaigns';shell();render();
      }catch(err){error(err);}finally{b.disabled=false;}};
      wrap.scrollIntoView({block:'start',behavior:'auto'});
    }
    try{await load();shell();render();root._offers={edit,reload:async()=>{await load();shell();render();}};if(listingId)edit(null,listingId);}catch(e){root.innerHTML=`<div class="co-error" role="alert">Could not load offers: ${esc(e.message)}</div><button type="button">Try again</button>`;root.querySelector('button').onclick=()=>mount({client,root,admin,listingId});}
  }
  W.CabanaOffers={mount};
})(window);
