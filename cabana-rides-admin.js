/* Cabana Move admin control room: markets, modes, exact price cards and requests. */
(function (global) {
  'use strict';

  const COUNTRIES = [
    ['DZ','Algeria','DZD'],['AO','Angola','AOA'],['BJ','Benin','XOF'],['BW','Botswana','BWP'],['BF','Burkina Faso','XOF'],['BI','Burundi','BIF'],['CV','Cabo Verde','CVE'],['CM','Cameroon','XAF'],['CF','Central African Republic','XAF'],['TD','Chad','XAF'],['KM','Comoros','KMF'],['CD','DR Congo','CDF'],['CG','Republic of the Congo','XAF'],['CI','Côte d’Ivoire','XOF'],['DJ','Djibouti','DJF'],['EG','Egypt','EGP'],['GQ','Equatorial Guinea','XAF'],['ER','Eritrea','ERN'],['SZ','Eswatini','SZL'],['ET','Ethiopia','ETB'],['GA','Gabon','XAF'],['GM','The Gambia','GMD'],['GH','Ghana','GHS'],['GN','Guinea','GNF'],['GW','Guinea-Bissau','XOF'],['KE','Kenya','KES'],['LS','Lesotho','LSL'],['LR','Liberia','LRD'],['LY','Libya','LYD'],['MG','Madagascar','MGA'],['MW','Malawi','MWK'],['ML','Mali','XOF'],['MR','Mauritania','MRU'],['MU','Mauritius','MUR'],['MA','Morocco','MAD'],['MZ','Mozambique','MZN'],['NA','Namibia','NAD'],['NE','Niger','XOF'],['NG','Nigeria','NGN'],['RW','Rwanda','RWF'],['ST','São Tomé and Príncipe','STN'],['SN','Senegal','XOF'],['SC','Seychelles','SCR'],['SL','Sierra Leone','SLE'],['SO','Somalia','SOS'],['ZA','South Africa','ZAR'],['SS','South Sudan','SSP'],['SD','Sudan','SDG'],['TZ','Tanzania','TZS'],['TG','Togo','XOF'],['TN','Tunisia','TND'],['UG','Uganda','UGX'],['ZM','Zambia','ZMW'],['ZW','Zimbabwe','USD']
  ].map(row => ({code:row[0],name:row[1],currency:row[2]})).sort((a,b) => a.name.localeCompare(b.name));
  const COUNTRY = Object.fromEntries(COUNTRIES.map(c => [c.code,c]));
  const STATUS_LABEL = {quote_pending:'Quote pending',quoted:'Quoted',confirmed:'Confirmed',searching:'Searching',assigned:'Assigned',arriving:'Arriving',in_progress:'In progress',completed:'Completed',cancelled:'Cancelled',expired:'Expired',unfulfilled:'Unfulfilled',scheduled:'Scheduled'};
  const UNIT_LABEL = {trip:'trip',hour:'hour',day:'day',seat:'seat',crossing:'crossing'};
  const state = {loaded:false,loading:false,tab:'requests',requestFilter:'pending',search:'',requests:[],markets:[],marketModes:[],modes:[],prices:[],drivers:[],vehicles:[],errors:[]};
  let root = null;

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const byId = (rows,id) => rows.find(row => row.id === id);
  function notify(message,kind) { if (typeof global.toast === 'function') global.toast(message,kind || ''); else global.alert(message); }
  function currencyDigits(code) { try { return new Intl.NumberFormat('en',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits; } catch (_) { return 2; } }
  function fromMinor(minor,currency) { const digits=currencyDigits(currency); return Number(minor)/Math.pow(10,digits); }
  function toMinor(amount,currency) { const digits=currencyDigits(currency); return Math.round(Number(amount)*Math.pow(10,digits)); }
  function money(minor,currency) {
    if (minor == null || !currency) return 'Awaiting quote';
    const value=fromMinor(minor,currency);
    try { return new Intl.NumberFormat('en',{style:'currency',currency,currencyDisplay:'code'}).format(value).replace(/\u00a0/g,' '); }
    catch (_) { return `${currency} ${value.toLocaleString('en')}`; }
  }
  function ago(value) {
    const ms=Date.now()-new Date(value).getTime();
    if (!Number.isFinite(ms)) return '';
    const min=Math.max(0,Math.round(ms/60000));
    if (min<2) return 'Now'; if(min<60)return `${min} min ago`; const h=Math.round(min/60); if(h<24)return `${h} hr ago`; return `${Math.round(h/24)} d ago`;
  }
  function statusClass(status) { return ['quote_pending','searching','scheduled','onboarding','matching'].includes(status)?'pending':['live','published','confirmed','completed','assigned'].includes(status)?'live':['paused','cancelled','expired','rejected','suspended'].includes(status)?'paused':''; }
  function pill(status,label) { return `<span class="ram-pill ${statusClass(status)}">${esc(label || STATUS_LABEL[status] || status || 'Unknown')}</span>`; }
  function countryOptions(selected) { return COUNTRIES.map(c => `<option value="${c.code}" ${c.code===selected?'selected':''}>${esc(c.name)} (${c.code})</option>`).join(''); }
  function modeOptions(selected) { return state.modes.map(m => `<option value="${esc(m.key)}" ${m.key===selected?'selected':''}>${esc(m.label)}</option>`).join(''); }
  function marketOptions(selected) { return state.markets.map(m => `<option value="${m.id}" ${m.id===selected?'selected':''}>${esc(m.country_name)}${m.city?` / ${esc(m.city)}`:' / All locations'}</option>`).join(''); }
  function priceForRequest(request) {
    if (request.approved_quote_minor != null && request.approved_quote_currency) return money(request.approved_quote_minor,request.approved_quote_currency);
    return request.quote_total != null ? 'Legacy fare hidden' : 'Awaiting quote';
  }

  async function query(table,select='*',configure) {
    try {
      let request=global.sb.from(table).select(select);
      if (configure) request=configure(request);
      const {data,error}=await request;
      if(error) throw error;
      return data || [];
    } catch(error) {
      state.errors.push({table,message:error.message || String(error)});
      return [];
    }
  }
  async function load(force) {
    root=document.getElementById('rides-admin-root');
    if(!root || !global.sb) return;
    if(state.loading) return;
    if(state.loaded && !force){ render(); return; }
    state.loading=true; state.errors=[];
    root.innerHTML='<div class="ram-loading"><span></span><div><b>Opening Cabana Move</b><p>Loading requests, markets, modes and approved prices.</p></div></div>';
    const [requests,markets,marketModes,modes,prices,drivers,vehicles]=await Promise.all([
      query('ride_requests','*',q=>q.order('created_at',{ascending:false}).limit(500)),
      query('ride_markets','*',q=>q.order('country_name').order('city')),
      query('ride_market_modes','*'),
      query('ride_modes','*',q=>q.order('sort')),
      query('ride_price_cards','*',q=>q.order('sort').order('created_at',{ascending:false})),
      query('drivers','*',q=>q.order('created_at',{ascending:false}).limit(300)),
      query('driver_vehicles','*',q=>q.limit(500))
    ]);
    Object.assign(state,{requests,markets,marketModes,modes,prices,drivers,vehicles,loaded:true,loading:false});
    render();
  }

  function header() {
    const pending=state.requests.filter(r=>['quote_pending','searching','scheduled'].includes(r.status)).length;
    const live=state.markets.filter(m=>m.active&&m.status==='live').length;
    const published=state.prices.filter(p=>p.active&&p.published).length;
    const enabled=state.modes.filter(m=>m.active&&m.requestable).length;
    return `<div class="ram-head"><div><span class="ram-kicker">CABANA MOVE / CONTROL ROOM</span><h1>Move Africa without invented numbers.</h1><p>Requests, market activation, movement modes and every public price are controlled here. Publishing a price is an explicit approval action.</p></div><div class="ram-head-actions"><button class="ram-action" data-action="export">Export requests</button><button class="ram-action primary" data-action="context-add">${state.tab==='markets'?'Add market':state.tab==='prices'?'Add exact price':'Open Rides page'}</button></div></div>
    <div class="ram-summary"><div class="ram-stat attention"><span>Needs a quote</span><b>${pending}</b><em>no automatic fares</em></div><div class="ram-stat"><span>Live markets</span><b>${live}</b><em>of ${state.markets.length} configured</em></div><div class="ram-stat truth"><span>Published prices</span><b>${published}</b><em>exact approved records</em></div><div class="ram-stat"><span>Requestable modes</span><b>${enabled}</b><em>of ${state.modes.length} configured</em></div></div>`;
  }
  function tabs() {
    return `<div class="ram-tabs">${[['requests','Requests'],['markets','Markets'],['modes','Movement modes'],['prices','Price cards'],['drivers','Drivers and operators']].map(tab=>`<button class="ram-tab ${state.tab===tab[0]?'on':''}" data-tab="${tab[0]}">${tab[1]}</button>`).join('')}</div>`;
  }
  function render() {
    if(!root) return;
    root.innerHTML=header()+tabs()+`<div id="ram-panel">${panel()}</div><div class="ram-scrim" id="ram-scrim"></div><aside class="ram-drawer" id="ram-drawer" aria-hidden="true"></aside>`;
    bind();
  }
  function panel() {
    if(state.errors.length && !state.modes.length) return `<div class="ram-error"><b>Database control plane is not available yet.</b><br>The code is ready, but the approved Cabana Move database migration must be applied before this module can operate. No public price has been fabricated as a fallback.</div>`;
    if(state.tab==='markets') return marketsPanel();
    if(state.tab==='modes') return modesPanel();
    if(state.tab==='prices') return pricesPanel();
    if(state.tab==='drivers') return driversPanel();
    return requestsPanel();
  }

  function requestsPanel() {
    const filters=[['all','All'],['pending','Needs quote'],['quoted','Quoted'],['confirmed','Confirmed'],['cancelled','Closed']];
    const term=norm(state.search);
    const rows=state.requests.filter(r=>{
      const statusMatch=state.requestFilter==='all'||(state.requestFilter==='pending'&&['quote_pending','searching','scheduled'].includes(r.status))||(state.requestFilter==='quoted'&&r.status==='quoted')||(state.requestFilter==='confirmed'&&['confirmed','assigned','arriving','in_progress','completed'].includes(r.status))||(state.requestFilter==='cancelled'&&['cancelled','expired','unfulfilled'].includes(r.status));
      const hay=norm([r.ref,r.rider_name,r.rider_phone,r.country_code,r.city,r.pickup_label,r.dropoff_label,r.mode_key,r.class].join(' '));
      return statusMatch&&(!term||hay.includes(term));
    });
    return `<div class="ram-toolbar"><div class="ram-filter">${filters.map(f=>`<button class="${state.requestFilter===f[0]?'on':''}" data-filter="${f[0]}">${f[1]}</button>`).join('')}</div><input class="ram-search" id="ram-search" value="${esc(state.search)}" placeholder="Search ref, rider, route or country"></div>${rows.length?`<div class="ram-table-wrap"><table class="ram-table"><thead><tr><th>Request</th><th>Rider</th><th>Movement</th><th>Route</th><th>Exact price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(requestRow).join('')}</tbody></table></div>`:`<div class="ram-empty"><b>No requests in this view</b><p>New movement requests will land here with an awaiting quote state unless the rider selected an applicable published price card.</p></div>`}`;
  }
  function requestRow(r) {
    const mode=state.modes.find(m=>m.key===(r.mode_key||r.class));
    const phone=String(r.rider_phone||'').replace(/\D/g,'');
    const whatsapp=phone?`<a href="https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${r.rider_name||''}, Cabana Move is reviewing request ${r.ref||r.id}.`)}" target="_blank" rel="noopener">WhatsApp</a>`:'';
    return `<tr><td><div class="ram-main ram-mono">${esc(r.ref||String(r.id).slice(0,10))}</div><div class="ram-sub">${ago(r.created_at)}</div></td><td><div class="ram-main">${esc(r.rider_name||'Rider')}</div><div class="ram-sub">${esc(r.rider_phone||'No phone')}</div></td><td><div class="ram-main">${esc(mode?.label||r.mode_key||r.class||'Movement')}</div><div class="ram-sub">${esc(COUNTRY[r.country_code]?.name||r.country_code||'Country not recorded')} · ${esc(r.passengers||1)} traveller${Number(r.passengers)===1?'':'s'}</div></td><td class="ram-route"><div><i>A</i>${esc(r.pickup_label||'Not set')}</div><div class="ram-sub"><i>B</i>${esc(r.dropoff_label||'Not set')}</div><div class="ram-sub">${r.scheduled_for?new Date(r.scheduled_for).toLocaleString():'On demand'}</div></td><td><div class="ram-main">${esc(priceForRequest(r))}</div><div class="ram-sub">${r.pricing_status==='published_price'?'Published card':r.pricing_status==='manual_quote'?'Manual admin quote':r.pricing_status==='confirmed'?'Price confirmed':'No approved amount'}</div></td><td>${pill(r.status)}</td><td><div class="ram-row-actions"><button data-action="quote" data-id="${r.id}">${r.approved_quote_minor!=null?'Edit price':'Set price'}</button>${whatsapp}${!['cancelled','completed','expired'].includes(r.status)?`<button data-action="cancel-request" data-id="${r.id}">Cancel</button>`:''}</div></td></tr>`;
  }

  function marketsPanel() {
    if(!state.markets.length) return '<div class="ram-empty"><b>No movement markets configured</b><p>Add a country-wide or city market. A market is not live until an admin explicitly activates it.</p></div>';
    return `<div class="ram-cards">${state.markets.map((m,index)=>{
      const modes=state.marketModes.filter(mm=>mm.market_id===m.id&&mm.active).map(mm=>state.modes.find(x=>x.key===mm.mode_key)?.short_label||mm.mode_key);
      return `<article class="ram-card"><div class="ram-card-top"><span class="ram-card-index">MARKET / ${String(index+1).padStart(2,'0')}</span>${pill(m.status)}</div><h3>${esc(m.city||'All locations')}, ${esc(m.country_name)}</h3><p>${esc(m.public_notice||'No public market note.')}</p><div class="ram-card-meta"><span class="ram-pill">${esc(m.currency)}</span><span class="ram-pill">${m.instant_requests?'Instant enabled':'Quote first'}</span><span class="ram-pill">${modes.length} modes</span></div><div class="ram-card-actions"><button data-action="edit-market" data-id="${m.id}">Edit controls</button><button data-action="toggle-market" data-id="${m.id}">${m.active?'Pause visibility':'Activate visibility'}</button></div></article>`;
    }).join('')}</div>`;
  }
  function modesPanel() {
    if(!state.modes.length) return '<div class="ram-empty"><b>No movement modes configured</b><p>The database migration seeds the continent-wide mode catalogue.</p></div>';
    return `<div class="ram-cards">${state.modes.map((m,index)=>`<article class="ram-card"><div class="ram-card-top"><span class="ram-card-index">MODE / ${String(index+1).padStart(2,'0')}</span>${pill(m.active&&m.requestable?'live':m.active?'paused':'cancelled',m.active&&m.requestable?'Requestable':m.active?'Not requestable':'Hidden')}</div><h3>${esc(m.label)}</h3><p>${esc(m.description)}</p><div class="ram-card-meta"><span class="ram-pill">${esc(m.family)}</span><span class="ram-pill ram-mono">${esc(m.key)}</span></div><div class="ram-card-actions"><button data-action="edit-mode" data-id="${esc(m.key)}">Edit language</button><button data-action="toggle-mode" data-id="${esc(m.key)}">${m.requestable?'Pause requests':'Allow requests'}</button></div></article>`).join('')}</div>`;
  }
  function pricesPanel() {
    if(!state.prices.length) return '<div class="ram-empty"><b>No public prices, by design</b><p>Add a price only when Cabana or an operator has approved the exact amount, unit, market, route and terms. Unpublished drafts never appear on the Rides page.</p></div>';
    return `<div class="ram-table-wrap"><table class="ram-table"><thead><tr><th>Price card</th><th>Market</th><th>Mode</th><th>Route and unit</th><th>Exact amount</th><th>Publication</th><th>Actions</th></tr></thead><tbody>${state.prices.map(p=>{
      const market=byId(state.markets,p.market_id),mode=state.modes.find(m=>m.key===p.mode_key);
      return `<tr><td><div class="ram-main">${esc(p.label)}</div><div class="ram-sub">Updated ${ago(p.updated_at)}</div></td><td><div class="ram-main">${esc(market?.city||'All locations')}</div><div class="ram-sub">${esc(market?.country_name||'Unknown market')}</div></td><td><div class="ram-main">${esc(mode?.label||p.mode_key)}</div></td><td><div class="ram-main">${p.route_from?`${esc(p.route_from)} → ${esc(p.route_to)}`:'Any applicable route'}</div><div class="ram-sub">Per ${esc(UNIT_LABEL[p.unit]||p.unit)}${p.bidirectional?' · both directions':''}</div></td><td><div class="ram-price">${esc(money(p.amount_minor,p.currency))}</div></td><td>${pill(p.published&&p.active?'published':p.active?'pending':'paused',p.published&&p.active?'Published':p.active?'Draft':'Inactive')}</td><td><div class="ram-row-actions"><button data-action="edit-price" data-id="${p.id}">Edit</button><button data-action="toggle-price" data-id="${p.id}">${p.published?'Unpublish':'Publish'}</button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function driversPanel() {
    if(!state.drivers.length) return '<div class="ram-empty"><b>No driver applications yet</b><p>Operator listings can still serve boats, horses, bicycles and specialist movement. Driver records appear here when applications begin.</p></div>';
    return `<div class="ram-table-wrap"><table class="ram-table"><thead><tr><th>Driver</th><th>Market</th><th>Modes</th><th>Vehicle</th><th>Trust</th><th>Actions</th></tr></thead><tbody>${state.drivers.map(d=>{
      const vehicle=state.vehicles.find(v=>v.driver_id===d.id&&v.is_primary)||state.vehicles.find(v=>v.driver_id===d.id);
      return `<tr><td><div class="ram-main">${esc(d.full_name)}</div><div class="ram-sub">${esc(d.phone)}${d.email?` · ${esc(d.email)}`:''}</div></td><td><div class="ram-main">${esc(COUNTRY[d.country_code]?.name||d.country_code||'Kenya')}</div><div class="ram-sub">${esc(d.city||'No city')}</div></td><td><div class="ram-main">${esc((d.mode_keys||['car']).map(k=>state.modes.find(m=>m.key===k)?.short_label||k).join(', '))}</div></td><td><div class="ram-main">${vehicle?esc(`${vehicle.make} ${vehicle.model}`):'No primary vehicle'}</div><div class="ram-sub">${vehicle?esc(vehicle.plate):''}</div></td><td>${pill(d.status)}</td><td><div class="ram-row-actions"><button data-action="edit-driver" data-id="${d.id}">Review</button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function bind() {
    root.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{state.tab=button.dataset.tab;render();}));
    root.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.requestFilter=button.dataset.filter;render();}));
    const search=root.querySelector('#ram-search');
    if(search){
      search.addEventListener('input',event=>{state.search=event.target.value;});
      search.addEventListener('change',render);
      search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();render();}});
    }
    bindPanelOnly();
    root.querySelector('[data-action="export"]')?.addEventListener('click',exportRequests);
    root.querySelector('[data-action="context-add"]')?.addEventListener('click',()=>{
      if(state.tab==='markets') openMarket(); else if(state.tab==='prices') openPrice(); else global.open('/rides','_blank','noopener');
    });
    root.querySelector('#ram-scrim')?.addEventListener('click',closeDrawer);
  }
  function bindPanelOnly() {
    root.querySelectorAll('[data-action="quote"]').forEach(b=>b.addEventListener('click',()=>openQuote(b.dataset.id)));
    root.querySelectorAll('[data-action="cancel-request"]').forEach(b=>b.addEventListener('click',()=>cancelRequest(b.dataset.id)));
    root.querySelectorAll('[data-action="edit-market"]').forEach(b=>b.addEventListener('click',()=>openMarket(b.dataset.id)));
    root.querySelectorAll('[data-action="toggle-market"]').forEach(b=>b.addEventListener('click',()=>toggleMarket(b.dataset.id)));
    root.querySelectorAll('[data-action="edit-mode"]').forEach(b=>b.addEventListener('click',()=>openMode(b.dataset.id)));
    root.querySelectorAll('[data-action="toggle-mode"]').forEach(b=>b.addEventListener('click',()=>toggleMode(b.dataset.id)));
    root.querySelectorAll('[data-action="edit-price"]').forEach(b=>b.addEventListener('click',()=>openPrice(b.dataset.id)));
    root.querySelectorAll('[data-action="toggle-price"]').forEach(b=>b.addEventListener('click',()=>togglePrice(b.dataset.id)));
    root.querySelectorAll('[data-action="edit-driver"]').forEach(b=>b.addEventListener('click',()=>openDriver(b.dataset.id)));
  }
  function drawer(title,kicker,body,saveLabel,onSave) {
    const aside=root.querySelector('#ram-drawer'),scrim=root.querySelector('#ram-scrim');
    aside.innerHTML=`<div class="ram-drawer-head"><div><span>${esc(kicker)}</span><h2>${esc(title)}</h2></div><button class="ram-close" type="button" aria-label="Close">×</button></div><div class="ram-drawer-body">${body}</div><div class="ram-drawer-foot"><button type="button" data-close>Cancel</button><button type="button" class="save" id="ram-save">${esc(saveLabel||'Save changes')}</button></div>`;
    aside.classList.add('on'); aside.setAttribute('aria-hidden','false'); scrim.classList.add('on');
    aside.querySelector('.ram-close').addEventListener('click',closeDrawer); aside.querySelector('[data-close]').addEventListener('click',closeDrawer);
    aside.querySelector('#ram-save').addEventListener('click',()=>onSave(aside));
    setTimeout(()=>aside.querySelector('input,select,textarea')?.focus(),80);
  }
  function closeDrawer() { root?.querySelector('#ram-drawer')?.classList.remove('on'); root?.querySelector('#ram-drawer')?.setAttribute('aria-hidden','true'); root?.querySelector('#ram-scrim')?.classList.remove('on'); }
  function field(label,id,value,type='text',wide=false,help='') { return `<div class="ram-field ${wide?'wide':''}"><label for="${id}">${esc(label)}</label><input class="ram-input" id="${id}" type="${type}" value="${esc(value??'')}">${help?`<span class="ram-help">${esc(help)}</span>`:''}</div>`; }
  function selectField(label,id,options,wide=false) { return `<div class="ram-field ${wide?'wide':''}"><label for="${id}">${esc(label)}</label><select class="ram-input" id="${id}">${options}</select></div>`; }
  function textareaField(label,id,value,wide=true,help='') { return `<div class="ram-field ${wide?'wide':''}"><label for="${id}">${esc(label)}</label><textarea class="ram-input" id="${id}">${esc(value||'')}</textarea>${help?`<span class="ram-help">${esc(help)}</span>`:''}</div>`; }
  function formError() { return '<div class="ram-form-error" id="ram-form-error"></div>'; }
  function value(aside,id) { return aside.querySelector(`#${id}`)?.value.trim() || ''; }
  function checked(aside,id) { return Boolean(aside.querySelector(`#${id}`)?.checked); }
  async function saveWith(button,work) { button.disabled=true; const old=button.textContent; button.textContent='Saving'; try{await work(); closeDrawer(); await load(true); notify('Cabana Move controls updated','ok');}catch(error){const slot=button.closest('.ram-drawer').querySelector('#ram-form-error'); if(slot)slot.textContent=error.message||String(error); button.disabled=false;button.textContent=old;} }

  function openQuote(id) {
    const request=byId(state.requests,id); if(!request)return;
    const cards=state.prices.filter(p=>p.active&&p.published&&p.mode_key===(request.mode_key||request.class)&&byId(state.markets,p.market_id)?.country_code===request.country_code);
    const amount=request.approved_quote_minor!=null?fromMinor(request.approved_quote_minor,request.approved_quote_currency||COUNTRY[request.country_code]?.currency||'USD'):'';
    const currency=request.approved_quote_currency||COUNTRY[request.country_code]?.currency||'USD';
    const body=`<div class="ram-form"><div class="ram-form-note"><b>${esc(request.pickup_label)} → ${esc(request.dropoff_label)}</b><br>No amount is derived from this route. Enter an exact operator-approved quote or select an already published price card.</div>${selectField('Published price card','ram-q-card',`<option value="">Manual exact quote</option>${cards.map(p=>`<option value="${p.id}" ${p.id===request.approved_price_card_id?'selected':''}>${esc(p.label)} · ${esc(money(p.amount_minor,p.currency))} / ${esc(p.unit)}</option>`).join('')}`)}${field('Exact amount','ram-q-amount',amount,'number',false,'Enter the amount in the selected currency, not cents.')}${field('Currency','ram-q-currency',currency,'text')}${selectField('Request state','ram-q-status',`<option value="quoted" ${request.status!=='confirmed'?'selected':''}>Quoted, waiting for rider</option><option value="confirmed" ${request.status==='confirmed'?'selected':''}>Price and request confirmed</option>`)}${textareaField('Internal note','ram-q-note',request.admin_notes,true,'This note is for the Cabana team and is not a public price claim.')}${formError()}</div>`;
    drawer(`Price ${request.ref||''}`,'EXACT QUOTE',body,'Save exact price',aside=>saveWith(aside.querySelector('#ram-save'),async()=>{
      const card=byId(state.prices,value(aside,'ram-q-card'));
      const currencyCode=value(aside,'ram-q-currency').toUpperCase(), amountValue=Number(value(aside,'ram-q-amount')), status=value(aside,'ram-q-status');
      if(!/^[A-Z]{3}$/.test(currencyCode)||!Number.isFinite(amountValue)||amountValue<=0)throw new Error('Enter a positive exact amount and a three-letter currency code.');
      const payload={approved_price_card_id:card?.id||null,approved_quote_minor:toMinor(amountValue,currencyCode),approved_quote_currency:currencyCode,pricing_status:status==='confirmed'?'confirmed':card?'published_price':'manual_quote',status,quoted_at:new Date().toISOString(),quote_confirmed_at:status==='confirmed'?new Date().toISOString():null,admin_notes:value(aside,'ram-q-note')||null,updated_at:new Date().toISOString()};
      const {error}=await global.sb.from('ride_requests').update(payload).eq('id',id); if(error)throw error;
    }));
    const aside=root.querySelector('#ram-drawer');
    const cardSelect=aside.querySelector('#ram-q-card');
    cardSelect.addEventListener('change',()=>{const p=byId(state.prices,cardSelect.value);if(p){aside.querySelector('#ram-q-amount').value=fromMinor(p.amount_minor,p.currency);aside.querySelector('#ram-q-currency').value=p.currency;}});
  }

  function openMarket(id) {
    const market=byId(state.markets,id)||{country_code:'KE',country_name:'Kenya',currency:'KES',status:'onboarding',active:true,instant_requests:false,scheduled_requests:true,quote_requests:true};
    const enabled=new Set(state.marketModes.filter(mm=>mm.market_id===id&&mm.active).map(mm=>mm.mode_key));
    if(!id) state.modes.forEach(m=>{if(m.active)enabled.add(m.key);});
    const body=`<div class="ram-form">${selectField('Country','ram-m-country',countryOptions(market.country_code))}${field('City, optional','ram-m-city',market.city||'','text',false,'Leave blank for a country-wide market.')}${field('Currency','ram-m-currency',market.currency)}${selectField('Activation state','ram-m-status',['onboarding','matching','live','paused'].map(s=>`<option value="${s}" ${s===market.status?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join(''))}${textareaField('Public market note','ram-m-notice',market.public_notice,true)}<div class="ram-checks"><label class="ram-check"><input id="ram-m-active" type="checkbox" ${market.active?'checked':''}><span>Visible in public market data</span></label><label class="ram-check"><input id="ram-m-instant" type="checkbox" ${market.instant_requests?'checked':''}><span>Instant requests enabled</span></label><label class="ram-check"><input id="ram-m-scheduled" type="checkbox" ${market.scheduled_requests?'checked':''}><span>Scheduled requests enabled</span></label><label class="ram-check"><input id="ram-m-quotes" type="checkbox" ${market.quote_requests?'checked':''}><span>Quote requests enabled</span></label></div><div class="ram-field wide"><span class="ram-group-label">Modes enabled for this market</span><div class="ram-checks">${state.modes.map(m=>`<label class="ram-check"><input type="checkbox" data-market-mode="${esc(m.key)}" ${enabled.has(m.key)?'checked':''}><span>${esc(m.label)}</span></label>`).join('')}</div></div>${formError()}</div>`;
    drawer(id?'Edit market':'Add movement market','MARKET CONTROL',body,id?'Save market':'Create market',aside=>saveWith(aside.querySelector('#ram-save'),async()=>{
      const code=value(aside,'ram-m-country'),country=COUNTRY[code],currency=value(aside,'ram-m-currency').toUpperCase(),city=value(aside,'ram-m-city')||null;
      if(!country||!/^[A-Z]{3}$/.test(currency))throw new Error('Choose an African country and a valid three-letter currency code.');
      const payload={country_code:code,country_name:country.name,city,status:value(aside,'ram-m-status'),currency,active:checked(aside,'ram-m-active'),instant_requests:checked(aside,'ram-m-instant'),scheduled_requests:checked(aside,'ram-m-scheduled'),quote_requests:checked(aside,'ram-m-quotes'),public_notice:value(aside,'ram-m-notice')||null};
      let result=id?await global.sb.from('ride_markets').update(payload).eq('id',id).select().single():await global.sb.from('ride_markets').insert(payload).select().single();
      if(result.error)throw result.error; const marketId=id||result.data.id;
      const chosen=new Set(Array.from(aside.querySelectorAll('[data-market-mode]:checked')).map(input=>input.dataset.marketMode));
      const rows=state.modes.map(m=>({market_id:marketId,mode_key:m.key,active:chosen.has(m.key),quote_only:!payload.instant_requests}));
      const modesResult=await global.sb.from('ride_market_modes').upsert(rows,{onConflict:'market_id,mode_key'});if(modesResult.error)throw modesResult.error;
    }));
    const aside=root.querySelector('#ram-drawer');
    aside.querySelector('#ram-m-country').addEventListener('change',event=>{aside.querySelector('#ram-m-currency').value=COUNTRY[event.target.value]?.currency||'';});
  }
  async function toggleMarket(id) { const market=byId(state.markets,id);if(!market)return;const {error}=await global.sb.from('ride_markets').update({active:!market.active}).eq('id',id);if(error)return notify(error.message,'bad');await load(true);notify(market.active?'Market visibility paused':'Market visibility activated','ok'); }

  function openMode(key) {
    const mode=state.modes.find(m=>m.key===key);if(!mode)return;
    const body=`<div class="ram-form">${field('Mode key','ram-mode-key',mode.key,'text',false,'Stable system key. It cannot be edited.')}${field('Public label','ram-mode-label',mode.label)}${field('Short label','ram-mode-short',mode.short_label)}${selectField('Family','ram-mode-family',['Road','Micromobility','Assisted','Water','Trail','Air'].map(v=>`<option ${v===mode.family?'selected':''}>${v}</option>`).join(''))}${field('Catalogue order','ram-mode-sort',mode.sort,'number')}${field('Image focus','ram-mode-focus',mode.media_focus,'text',false,'Position used by the movement ribbon, for example 48%.')}${textareaField('Public description','ram-mode-description',mode.description,true)}${textareaField('Request label','ram-mode-prompt',mode.request_prompt,true)}<div class="ram-checks"><label class="ram-check"><input id="ram-mode-active" type="checkbox" ${mode.active?'checked':''}><span>Visible in the catalogue</span></label><label class="ram-check"><input id="ram-mode-requestable" type="checkbox" ${mode.requestable?'checked':''}><span>Can receive requests</span></label></div>${formError()}</div>`;
    drawer(`Edit ${mode.label}`,'MOVEMENT MODE',body,'Save mode',aside=>saveWith(aside.querySelector('#ram-save'),async()=>{
      const payload={label:value(aside,'ram-mode-label'),short_label:value(aside,'ram-mode-short'),family:value(aside,'ram-mode-family'),sort:Number(value(aside,'ram-mode-sort'))||100,media_focus:value(aside,'ram-mode-focus')||'50%',description:value(aside,'ram-mode-description'),request_prompt:value(aside,'ram-mode-prompt'),active:checked(aside,'ram-mode-active'),requestable:checked(aside,'ram-mode-requestable')};
      if(payload.label.length<2||payload.short_label.length<2||payload.description.length<3)throw new Error('Add clear public labels and a description.');
      const {error}=await global.sb.from('ride_modes').update(payload).eq('key',key);if(error)throw error;
    }));
    root.querySelector('#ram-mode-key').disabled=true;
  }
  async function toggleMode(key) { const mode=state.modes.find(m=>m.key===key);if(!mode)return;const {error}=await global.sb.from('ride_modes').update({requestable:!mode.requestable}).eq('key',key);if(error)return notify(error.message,'bad');await load(true);notify(mode.requestable?'Mode requests paused':'Mode can now receive requests','ok'); }

  function openPrice(id) {
    const price=byId(state.prices,id)||{market_id:state.markets[0]?.id,mode_key:state.modes[0]?.key,currency:state.markets[0]?.currency||'KES',unit:'trip',active:true,published:false,bidirectional:false,sort:100};
    if(!state.markets.length||!state.modes.length){notify('Create a movement market and mode before adding a price.','bad');return;}
    const major=price.amount_minor!=null?fromMinor(price.amount_minor,price.currency):'';
    const body=`<div class="ram-form"><div class="ram-form-note">A published card is a public price promise. Enter only an operator-approved exact amount, unit, scope and terms. Cabana never fills these values automatically.</div>${selectField('Market','ram-p-market',marketOptions(price.market_id))}${selectField('Movement mode','ram-p-mode',modeOptions(price.mode_key))}${field('Public label','ram-p-label',price.label||'','text',true)}${field('Exact amount','ram-p-amount',major,'number',false,'Enter the amount in the selected currency, not cents.')}${field('Currency','ram-p-currency',price.currency)}${selectField('Charging unit','ram-p-unit',Object.keys(UNIT_LABEL).map(unit=>`<option value="${unit}" ${unit===price.unit?'selected':''}>Per ${UNIT_LABEL[unit]}</option>`).join(''))}${field('Display order','ram-p-sort',price.sort,'number')}${field('Route from','ram-p-from',price.route_from||'','text',false,'Required when the unit is per trip.')}${field('Route to','ram-p-to',price.route_to||'','text',false,'Required when the unit is per trip.')}${textareaField('Exact terms and inclusions','ram-p-terms',price.terms,true,'State what the amount includes so the card cannot be mistaken for another scope.')}<div class="ram-checks"><label class="ram-check"><input id="ram-p-both" type="checkbox" ${price.bidirectional?'checked':''}><span>Valid in both route directions</span></label><label class="ram-check"><input id="ram-p-active" type="checkbox" ${price.active?'checked':''}><span>Price card active</span></label><label class="ram-check"><input id="ram-p-published" type="checkbox" ${price.published?'checked':''}><span>Approve and publish publicly</span></label></div>${formError()}</div>`;
    drawer(id?'Edit exact price':'Add exact price','PRICE INTEGRITY',body,id?'Save price card':'Create price card',aside=>saveWith(aside.querySelector('#ram-save'),async()=>{
      const currency=value(aside,'ram-p-currency').toUpperCase(),amount=Number(value(aside,'ram-p-amount')),unit=value(aside,'ram-p-unit'),from=value(aside,'ram-p-from')||null,to=value(aside,'ram-p-to')||null,terms=value(aside,'ram-p-terms');
      if(!/^[A-Z]{3}$/.test(currency)||!Number.isFinite(amount)||amount<=0)throw new Error('Enter a positive exact amount and a three-letter currency code.');
      if(unit==='trip'&&(!from||!to))throw new Error('A per-trip price must name both route endpoints.');
      if(terms.length<3)throw new Error('Add the exact terms or inclusions for this amount.');
      const payload={market_id:value(aside,'ram-p-market'),mode_key:value(aside,'ram-p-mode'),label:value(aside,'ram-p-label'),amount_minor:toMinor(amount,currency),currency,unit,route_from:from,route_to:to,bidirectional:checked(aside,'ram-p-both'),terms,published:checked(aside,'ram-p-published'),active:checked(aside,'ram-p-active'),sort:Number(value(aside,'ram-p-sort'))||100};
      if(payload.label.length<3)throw new Error('Add a clear public price label.');
      const result=id?await global.sb.from('ride_price_cards').update(payload).eq('id',id):await global.sb.from('ride_price_cards').insert(payload);if(result.error)throw result.error;
    }));
    const aside=root.querySelector('#ram-drawer');
    aside.querySelector('#ram-p-market').addEventListener('change',event=>{const market=byId(state.markets,event.target.value);if(market)aside.querySelector('#ram-p-currency').value=market.currency;});
  }
  async function togglePrice(id) { const price=byId(state.prices,id);if(!price)return;const action=price.published?'unpublish':'publish';if(!price.published&&!global.confirm(`Publish ${price.label} as an exact public price?`))return;const {error}=await global.sb.from('ride_price_cards').update({published:!price.published}).eq('id',id);if(error)return notify(error.message,'bad');await load(true);notify(`Price card ${action}ed`,'ok'); }

  function openDriver(id) {
    const driver=byId(state.drivers,id);if(!driver)return; const selected=new Set(driver.mode_keys||['car']);
    const body=`<div class="ram-form">${field('Driver','ram-d-name',driver.full_name)}${field('Phone','ram-d-phone',driver.phone)}${selectField('Country','ram-d-country',countryOptions(driver.country_code||'KE'))}${field('Operating city','ram-d-city',driver.city)}${selectField('Review status','ram-d-status',['applied','under_review','approved','paused','suspended','rejected'].map(s=>`<option value="${s}" ${s===driver.status?'selected':''}>${s.replace('_',' ')}</option>`).join(''))}${textareaField('Review note','ram-d-note',driver.status_note,true)}<div class="ram-field wide"><span class="ram-group-label">Approved movement modes</span><div class="ram-checks">${state.modes.map(m=>`<label class="ram-check"><input type="checkbox" data-driver-mode="${esc(m.key)}" ${selected.has(m.key)?'checked':''}><span>${esc(m.label)}</span></label>`).join('')}</div></div>${formError()}</div>`;
    drawer(`Review ${driver.full_name}`,'DRIVER AND OPERATOR',body,'Save review',aside=>saveWith(aside.querySelector('#ram-save'),async()=>{
      const modes=Array.from(aside.querySelectorAll('[data-driver-mode]:checked')).map(i=>i.dataset.driverMode),status=value(aside,'ram-d-status');
      if(!modes.length&&status==='approved')throw new Error('Approve at least one movement mode before approving this driver.');
      const payload={full_name:value(aside,'ram-d-name'),phone:value(aside,'ram-d-phone'),country_code:value(aside,'ram-d-country'),city:value(aside,'ram-d-city'),status,status_note:value(aside,'ram-d-note')||null,mode_keys:modes,approved_at:status==='approved'?(driver.approved_at||new Date().toISOString()):null};
      const {error}=await global.sb.from('drivers').update(payload).eq('id',id);if(error)throw error;
    }));
  }

  async function cancelRequest(id) { if(!global.confirm('Cancel this movement request?'))return;const {error}=await global.sb.from('ride_requests').update({status:'cancelled',cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);if(error)return notify(error.message,'bad');await load(true);notify('Movement request cancelled','ok'); }
  function exportRequests() {
    const cols=['ref','created_at','rider_name','rider_phone','rider_email','country_code','city','mode_key','pickup_label','dropoff_label','scheduled_for','passengers','pricing_status','approved_quote_minor','approved_quote_currency','status'];
    const quote=value=>`"${String(value==null?'':Array.isArray(value)?value.join('|'):value).replace(/"/g,'""')}"`;
    const csv=[cols.join(','),...state.requests.map(row=>cols.map(key=>quote(row[key])).join(','))].join('\n');
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download=`cabana-move-requests-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  global.RidesAdmin={load,state};
  setTimeout(()=>{if(document.getElementById('s-transport')?.classList.contains('on'))load();},0);
})(window);
