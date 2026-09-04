/* Cabana Move Africa: continent-wide movement requests with approved pricing only. */
(function (global) {
  'use strict';

  const AFRICA_COUNTRIES = [
    ['DZ','Algeria','DZD','North'],['AO','Angola','AOA','Central'],['BJ','Benin','XOF','West'],
    ['BW','Botswana','BWP','Southern'],['BF','Burkina Faso','XOF','West'],['BI','Burundi','BIF','East'],
    ['CV','Cabo Verde','CVE','West'],['CM','Cameroon','XAF','Central'],['CF','Central African Republic','XAF','Central'],
    ['TD','Chad','XAF','Central'],['KM','Comoros','KMF','East'],['CD','DR Congo','CDF','Central'],
    ['CG','Republic of the Congo','XAF','Central'],['CI','Côte d’Ivoire','XOF','West'],['DJ','Djibouti','DJF','East'],
    ['EG','Egypt','EGP','North'],['GQ','Equatorial Guinea','XAF','Central'],['ER','Eritrea','ERN','East'],
    ['SZ','Eswatini','SZL','Southern'],['ET','Ethiopia','ETB','East'],['GA','Gabon','XAF','Central'],
    ['GM','The Gambia','GMD','West'],['GH','Ghana','GHS','West'],['GN','Guinea','GNF','West'],
    ['GW','Guinea-Bissau','XOF','West'],['KE','Kenya','KES','East'],['LS','Lesotho','LSL','Southern'],
    ['LR','Liberia','LRD','West'],['LY','Libya','LYD','North'],['MG','Madagascar','MGA','East'],
    ['MW','Malawi','MWK','East'],['ML','Mali','XOF','West'],['MR','Mauritania','MRU','West'],
    ['MU','Mauritius','MUR','East'],['MA','Morocco','MAD','North'],['MZ','Mozambique','MZN','East'],
    ['NA','Namibia','NAD','Southern'],['NE','Niger','XOF','West'],['NG','Nigeria','NGN','West'],
    ['RW','Rwanda','RWF','East'],['ST','São Tomé and Príncipe','STN','Central'],['SN','Senegal','XOF','West'],
    ['SC','Seychelles','SCR','East'],['SL','Sierra Leone','SLE','West'],['SO','Somalia','SOS','East'],
    ['ZA','South Africa','ZAR','Southern'],['SS','South Sudan','SSP','East'],['SD','Sudan','SDG','North'],
    ['TZ','Tanzania','TZS','East'],['TG','Togo','XOF','West'],['TN','Tunisia','TND','North'],
    ['UG','Uganda','UGX','East'],['ZM','Zambia','ZMW','East'],['ZW','Zimbabwe','USD','Southern']
  ].map(row => ({ code:row[0], name:row[1], currency:row[2], region:row[3] }))
    .sort((a,b) => a.name.localeCompare(b.name));

  const COUNTRY = Object.fromEntries(AFRICA_COUNTRIES.map(c => [c.code,c]));
  const AFRICA_CODES = new Set(AFRICA_COUNTRIES.map(c => c.code));
  const MODE_ICONS = {
    car:'<path d="M4 15.5 5.8 10c.4-1.3 1.5-2.1 2.8-2.1h6.8c1.3 0 2.4.8 2.8 2.1l1.8 5.5"/><path d="M3 15.5h18v3H3zM7 18.5v2M17 18.5v2M6.5 13h.01M17.5 13h.01"/>',
    electric:'<path d="M4 15.5 5.8 10c.4-1.3 1.5-2.1 2.8-2.1h6.8c1.3 0 2.4.8 2.8 2.1l1.8 5.5M3 15.5h18v3H3z"/><path d="m13 3-3 5h3l-2 5 5-7h-3z"/>',
    minibus:'<rect x="3" y="4" width="18" height="15" rx="2"/><path d="M3 9h18M8 4v5M14 4v5M7 19v2M17 19v2M7 14h.01M17 14h.01"/>',
    tuk_tuk:'<path d="M4 17V9l5-5h6l4 6v7M4 10h15M9 4v13"/><circle cx="6" cy="18" r="2.2"/><circle cx="17" cy="18" r="2.2"/>',
    motorcycle:'<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h6l3-7h-6l-2 4M13 6h3M12 10 9 6H7"/>',
    bicycle:'<circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="m5 17 4-8 4 8 3-8M9 9h7M13 17h-3.5M15 6h3"/>',
    e_bike:'<circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="m5 17 4-8 4 8 3-8M9 9h7M15 6h3m-6-3-2 4h2l-1 3 4-5h-2l1-2z"/>',
    accessible:'<circle cx="10" cy="4.5" r="2"/><path d="M9 8v5h5l3 5M9 10H6M9 13a5 5 0 1 0 5 5"/>',
    boat:'<path d="M3 14h18l-3 5H7l-4-5zM7 14V8h9l3 6M11 8V4l5 4"/><path d="M4 22c2-1 3-1 5 0s3 1 5 0 3-1 5 0"/>',
    horse:'<path d="M7 21v-7l3-4-1-5 5 2 3-2 2 5-3 4v7M7 15h9M10 21v-4M16 21v-4"/><path d="M15 9h.01"/>',
    helicopter:'<path d="M3 12h13c3 0 5 2 5 5H9c-3 0-5-2-6-5zM12 12V6M6 6h12M15 17l2 3M12 20h8M3 12 1 8"/>',
    shuttle:'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 11h20M7 6v5M15 6v5M6 19v2M18 19v2M6 15h.01M18 15h.01"/>'
  };
  const FALLBACK_MODES = [
    {key:'car',label:'Car and taxi',short_label:'Car',family:'Road',description:'City rides, transfers and point to point travel.',request_prompt:'Car or taxi',media_focus:'14%',sort:10,active:true,requestable:true},
    {key:'electric',label:'Electric car',short_label:'Electric',family:'Road',description:'Electric operators where charging coverage permits.',request_prompt:'Electric car',media_focus:'25%',sort:20,active:true,requestable:true},
    {key:'minibus',label:'Shuttle and minibus',short_label:'Minibus',family:'Road',description:'Group transfers, shared routes and private shuttles.',request_prompt:'Shuttle or minibus',media_focus:'38%',sort:30,active:true,requestable:true},
    {key:'tuk_tuk',label:'Tuk-tuk',short_label:'Tuk-tuk',family:'Road',description:'Compact local transport built for shorter routes.',request_prompt:'Tuk-tuk',media_focus:'48%',sort:40,active:true,requestable:true},
    {key:'motorcycle',label:'Motorcycle and boda',short_label:'Motorbike',family:'Road',description:'Two wheel passenger movement with local operators.',request_prompt:'Motorcycle or boda',media_focus:'57%',sort:50,active:true,requestable:true},
    {key:'bicycle',label:'Bicycle',short_label:'Bicycle',family:'Micromobility',description:'Human powered hire, guided rides and point to point use.',request_prompt:'Bicycle',media_focus:'65%',sort:60,active:true,requestable:true},
    {key:'e_bike',label:'E-bike',short_label:'E-bike',family:'Micromobility',description:'Electric assisted city, coast and trail movement.',request_prompt:'E-bike',media_focus:'72%',sort:70,active:true,requestable:true},
    {key:'accessible',label:'Accessible vehicle',short_label:'Accessible',family:'Assisted',description:'Mobility-aware transport matched to stated access needs.',request_prompt:'Accessible transport',media_focus:'78%',sort:80,active:true,requestable:true},
    {key:'boat',label:'Boat and dhow',short_label:'Boat',family:'Water',description:'Ferries, launches, dhows and private water transfers.',request_prompt:'Boat or dhow',media_focus:'84%',sort:90,active:true,requestable:true},
    {key:'horse',label:'Horse and trail',short_label:'Horse',family:'Trail',description:'Riding, pack support and specialist trail movement.',request_prompt:'Horse or trail movement',media_focus:'91%',sort:100,active:true,requestable:true},
    {key:'helicopter',label:'Helicopter and air',short_label:'Air',family:'Air',description:'Specialist charter and time-critical air transfers.',request_prompt:'Air transfer',media_focus:'5%',sort:110,active:true,requestable:true},
    {key:'shuttle',label:'Coach and bus',short_label:'Coach',family:'Road',description:'High-capacity scheduled or private group movement.',request_prompt:'Coach or bus',media_focus:'43%',sort:120,active:true,requestable:true}
  ];

  const $ = id => document.getElementById(id);
  const sb = global.__rdSb;
  const state = {
    countryCode:'KE', modeKey:'car', when:'now', pickup:null, destination:null,
    modes:FALLBACK_MODES.slice(), markets:[], marketModes:[], prices:[], listings:[],
    selectedPrice:null, pickupGeo:null, destinationGeo:null, loading:true
  };
  let pickupHandle = null, destinationHandle = null, toastTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function modeIcon(key) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${MODE_ICONS[key] || MODE_ICONS.shuttle}</svg>`;
  }
  function normal(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function currencyDigits(code) {
    try { return new Intl.NumberFormat('en',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits; }
    catch (_) { return 2; }
  }
  function moneyMinor(minor, currency) {
    const code = String(currency || 'USD').toUpperCase();
    const value = Number(minor) / Math.pow(10,currencyDigits(code));
    if (!Number.isFinite(value)) return '';
    try { return new Intl.NumberFormat('en',{style:'currency',currency:code,currencyDisplay:'code'}).format(value).replace(/\u00a0/g,' '); }
    catch (_) { return `${code} ${value.toLocaleString('en')}`; }
  }
  function toast(message) {
    const el = $('rd-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 3400);
  }
  function countryOf(code) { return COUNTRY[String(code || '').toUpperCase()] || null; }
  function selectedMode() { return state.modes.find(m => m.key === state.modeKey) || state.modes[0]; }
  function scheduledFor() {
    if (state.when !== 'later') return null;
    const date = $('rd-date').value, time = $('rd-time').value;
    if (!date || !time) return null;
    const value = new Date(`${date}T${time}`);
    return Number.isNaN(value.getTime()) ? null : value;
  }
  function reference() {
    const bytes = new Uint8Array(6);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(bytes);
    else for (let i=0;i<bytes.length;i++) bytes[i] = Math.floor(Math.random()*256);
    return 'CM' + Array.from(bytes,n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  function fillCountries() {
    const select = $('rd-country');
    const regions = ['North','West','Central','East','Southern'];
    select.innerHTML = '<option value="">Select an African country</option>' + regions.map(region => {
      const options = AFRICA_COUNTRIES.filter(c => c.region === region).map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join('');
      return `<optgroup label="${region} Africa">${options}</optgroup>`;
    }).join('');
    select.value = state.countryCode;
  }

  function citiesForCountry(code) {
    if (!global.ApaGeo || !Array.isArray(global.ApaGeo.GAZETTEER)) return [];
    const seen = new Set();
    return global.ApaGeo.GAZETTEER.filter(row => String(row[3] || '').toUpperCase() === code && ['city','town','island'].includes(row[6]))
      .filter(row => { const key=normal(row[0]); if(seen.has(key)) return false; seen.add(key); return true; })
      .slice(0,5).map(row => ({name:row[0],country:row[2],country_code:code,lat:row[4],lng:row[5],kind:row[6],label:[row[0],row[2]].filter(Boolean).join(', '),short:row[0]}));
  }
  function renderCityPicks() {
    const cities = citiesForCountry(state.countryCode);
    $('rd-city-picks').innerHTML = cities.length
      ? cities.map(c => `<button type="button" data-city="${esc(c.name)}" data-lat="${c.lat}" data-lng="${c.lng}">${esc(c.name)}</button>`).join('')
      : '<span style="color:var(--rd-dim);font-size:9px">Type a city, port, trail, landmark or address</span>';
    $('rd-city-picks').querySelectorAll('button').forEach(button => button.addEventListener('click',() => {
      const place = {name:button.dataset.city,short:button.dataset.city,label:`${button.dataset.city}, ${countryOf(state.countryCode).name}`,country_code:state.countryCode,lat:Number(button.dataset.lat),lng:Number(button.dataset.lng),kind:'city'};
      pickupHandle && pickupHandle.set(place,{text:place.label});
      state.pickupGeo = place;
      state.pickup = place.label;
      updateAll();
      $('rd-destination').focus();
    }));
  }

  function wireGeo() {
    if (!global.ApaGeo) return;
    if (pickupHandle) pickupHandle.destroy();
    if (destinationHandle) destinationHandle.destroy();
    pickupHandle = global.ApaGeo.attach('rd-pickup',{
      country:state.countryCode.toLowerCase(), limit:7, myLocation:false,
      onPick:place => {
        const code = String(place.country_code || place.iso2 || '').toUpperCase();
        if (code && !AFRICA_CODES.has(code)) { pickupHandle.clear(); toast('Pickup must be within an African country.'); return; }
        state.pickupGeo = place; state.pickup = place.label || place.short || place.name; updateAll();
      },
      onClear:() => { state.pickupGeo=null; state.pickup=''; updateAll(); }
    });
    destinationHandle = global.ApaGeo.attach('rd-destination',{
      limit:7, myLocation:false,
      onPick:place => {
        const code = String(place.country_code || place.iso2 || '').toUpperCase();
        if (code && !AFRICA_CODES.has(code)) { destinationHandle.clear(); toast('Cabana Move currently accepts destinations within Africa.'); return; }
        state.destinationGeo = place; state.destination = place.label || place.short || place.name; updateAll();
      },
      onClear:() => { state.destinationGeo=null; state.destination=''; updateAll(); }
    });
  }

  function setCountry(code, keepRoute) {
    if (!COUNTRY[code]) return;
    state.countryCode = code;
    $('rd-country').value = code;
    const country = COUNTRY[code];
    $('rd-market-label').textContent = code === 'KE' ? 'KENYA FIRST, AFRICA OPEN' : `${country.name.toUpperCase()} / REQUESTS OPEN`;
    $('rd-pickup').disabled = false;
    $('rd-destination').disabled = false;
    $('rd-pickup').placeholder = `City, airport, jetty or address in ${country.name}`;
    if (!keepRoute) {
      state.pickup = ''; state.destination = ''; state.pickupGeo = null; state.destinationGeo = null;
      $('rd-pickup').value = ''; $('rd-destination').value = '';
    }
    state.selectedPrice = null;
    renderCityPicks();
    wireGeo();
    updateAll();
  }

  function renderModes() {
    const requestable = state.modes.filter(m => m.active !== false).sort((a,b) => Number(a.sort||0)-Number(b.sort||0));
    if (!requestable.some(m => m.key === state.modeKey && m.requestable !== false)) state.modeKey = requestable.find(m => m.requestable !== false)?.key || '';
    $('rd-mode-count').textContent = String(requestable.length);
    $('rd-mode-picks').innerHTML = requestable.map(mode => `<button type="button" class="rd-mode-pick${mode.key===state.modeKey?' is-selected':''}" data-mode="${esc(mode.key)}" aria-pressed="${mode.key===state.modeKey}" ${mode.requestable===false?'disabled':''} title="${esc(mode.label)}">${modeIcon(mode.key)}<span>${esc(mode.short_label || mode.label)}</span></button>`).join('');
    $('rd-mode-picks').querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',() => chooseMode(button.dataset.mode,true)));

    const cards = requestable.map((mode,index) => `<button type="button" class="rd-mode-card" data-mode="${esc(mode.key)}" style="--focus:${esc(mode.media_focus || '50%')}" aria-label="Use ${esc(mode.label)} for my request"><span class="rd-card-num">${String(index+1).padStart(2,'0')} / ${String(requestable.length).padStart(2,'0')}</span><span class="rd-card-state">${mode.requestable===false?'Paused':'Requestable'}</span><span class="rd-card-copy"><span>${esc(mode.family || 'Movement')}</span><h3>${esc(mode.label)}</h3><p>${esc(mode.description || '')}</p></span></button>`).join('');
    $('rd-marquee-track').innerHTML = cards + cards.replaceAll('data-mode=', 'data-copy="true" data-mode=');
    $('rd-marquee-track').querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',() => chooseMode(button.dataset.mode,true)));
  }

  function chooseMode(key, scrollToForm) {
    const mode = state.modes.find(m => m.key === key && m.active !== false && m.requestable !== false);
    if (!mode) return;
    state.modeKey = key;
    state.selectedPrice = null;
    renderModes();
    updateAll();
    if (scrollToForm) {
      $('rd-console').scrollIntoView({behavior:global.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    }
  }

  function marketForRoute() {
    const rows = state.markets.filter(m => m.country_code === state.countryCode && m.active !== false);
    if (!rows.length) return null;
    const pickup = normal($('rd-pickup').value);
    return rows.find(m => m.city && pickup.includes(normal(m.city))) || rows.find(m => !m.city) || rows[0];
  }
  function marketStatus() {
    const market = marketForRoute();
    if (!market) return {market:null,label:'Movement desk matching',className:''};
    if (market.status === 'live' && market.instant_requests) return {market,label:`${market.city || countryOf(state.countryCode).name}: live requests`,className:'is-live'};
    if (market.status === 'paused') return {market,label:`${market.city || countryOf(state.countryCode).name}: matching paused`,className:''};
    return {market,label:`${market.city || countryOf(state.countryCode).name}: operator matching`,className:''};
  }

  function listingMode(listing) {
    const text = normal([listing.listing_type,listing.type,listing.title].join(' '));
    if (/electric|ev\b/.test(text)) return 'electric';
    if (/tuk/.test(text)) return 'tuk_tuk';
    if (/boda|motorcycle|motorbike/.test(text)) return 'motorcycle';
    if (/e bike|ebike/.test(text)) return 'e_bike';
    if (/bicycle|bike|cycling/.test(text)) return 'bicycle';
    if (/wheelchair|accessible/.test(text)) return 'accessible';
    if (/boat|dhow|ferry|water taxi|launch/.test(text)) return 'boat';
    if (/horse|equestrian|trail/.test(text)) return 'horse';
    if (/helicopter|charter|air transfer/.test(text)) return 'helicopter';
    if (/coach|bus/.test(text)) return 'shuttle';
    if (/shuttle|minibus|van/.test(text)) return 'minibus';
    return 'car';
  }
  function listingCountry(listing) {
    const exact = AFRICA_COUNTRIES.find(c => normal(c.name) === normal(listing.country));
    return exact ? exact.code : String(listing.country_code || '').toUpperCase();
  }
  function renderListings() {
    const country = countryOf(state.countryCode);
    const mode = selectedMode();
    const matching = state.listings.filter(l => listingCountry(l) === state.countryCode && listingMode(l) === state.modeKey);
    const network = marketStatus();
    const chip = $('rd-network-chip');
    chip.className = `rd-network-chip ${network.className}`;
    chip.innerHTML = `<i></i><span>${esc(network.label)}</span>`;
    $('rd-inventory-sub').textContent = `${mode?.label || 'Movement'} supply in ${country?.name || 'Africa'}. Only published operator listings appear.`;
    if (!matching.length) {
      $('rd-listing-grid').innerHTML = `<div class="rd-empty"><span class="rd-empty-index">SUPPLY / 00</span><div><h3>No published ${esc((mode?.short_label || 'transport').toLowerCase())} operator here yet.</h3><p>Your request can still reach the Cabana movement desk. We keep an empty market honest instead of inventing vehicles, availability or wait times.</p></div><a href="/add-listing?service=rides">List this service →</a></div>`;
    } else {
      $('rd-listing-grid').innerHTML = matching.map(l => {
        const photos = Array.isArray(l.photos) ? l.photos : [];
        const photo = photos.find(Boolean);
        return `<article class="rd-listing-card">${photo?`<div class="rd-listing-photo"><img src="${esc(photo)}" loading="lazy" decoding="async" alt="${esc(l.title || 'Movement operator')}"></div>`:''}<div class="rd-listing-copy"><div class="rd-listing-meta"><span>${esc(l.listing_type || mode.label)}</span><span>${esc([l.city,l.country].filter(Boolean).join(', '))}</span></div><h3>${esc(l.title || 'Cabana movement operator')}</h3><p>${esc(String(l.description || 'Published transport service.').slice(0,160))}</p><a href="#rd-console" data-provider="${esc(l.title || '')}">Use in my request</a></div></article>`;
      }).join('');
      $('rd-listing-grid').querySelectorAll('[data-provider]').forEach(link => link.addEventListener('click',() => {
        const note = $('rd-notes');
        note.value = `Preferred operator: ${link.dataset.provider}`;
      }));
    }
  }

  function priceApplies(card) {
    if (card.mode_key !== state.modeKey) return false;
    const market = state.markets.find(m => m.id === card.market_id);
    if (!market || market.country_code !== state.countryCode) return false;
    if (market.city && !normal($('rd-pickup').value).includes(normal(market.city))) return false;
    if (card.route_from && card.route_to) {
      const a = normal($('rd-pickup').value), b = normal($('rd-destination').value);
      const forward = a.includes(normal(card.route_from)) && b.includes(normal(card.route_to));
      const reverse = card.bidirectional && a.includes(normal(card.route_to)) && b.includes(normal(card.route_from));
      return forward || reverse;
    }
    return card.unit !== 'trip';
  }
  function applicablePrices() {
    if (!$('rd-pickup').value.trim() || !$('rd-destination').value.trim()) return [];
    return state.prices.filter(priceApplies);
  }
  function unitLabel(unit) {
    return ({trip:'trip',hour:'hour',day:'day',seat:'seat',crossing:'crossing'}[unit] || unit || 'unit');
  }
  function renderPrices() {
    const cards = applicablePrices();
    if (state.selectedPrice && !cards.some(c => c.id === state.selectedPrice.id)) state.selectedPrice = null;
    const section = $('rd-pricing');
    section.hidden = !cards.length;
    if (!cards.length) {
      $('rd-price-grid').innerHTML = '';
    } else {
      $('rd-price-grid').innerHTML = cards.map((card,index) => {
        const market = state.markets.find(m => m.id === card.market_id);
        const route = card.route_from && card.route_to ? `${card.route_from} → ${card.route_to}` : `${market?.city || countryOf(state.countryCode).name} ${unitLabel(card.unit)} rate`;
        return `<button type="button" class="rd-price-card${state.selectedPrice?.id===card.id?' is-selected':''}" data-price="${esc(card.id)}"><span class="rd-price-card-top"><span>APPROVED / ${String(index+1).padStart(2,'0')}</span><b>${esc(card.currency)}</b></span><h3>${esc(card.label)}</h3><span><b class="rd-price-amount">${esc(moneyMinor(card.amount_minor,card.currency))}</b> <span class="rd-price-unit">per ${esc(unitLabel(card.unit))}</span></span><span class="rd-price-route">${esc(route)}${card.terms?` · ${esc(card.terms)}`:''}</span></button>`;
      }).join('');
      $('rd-price-grid').querySelectorAll('[data-price]').forEach(button => button.addEventListener('click',() => {
        state.selectedPrice = cards.find(c => c.id === button.dataset.price) || null;
        renderPrices(); updatePriceTruth(); updateFormState();
      }));
    }
    updatePriceTruth();
  }
  function updatePriceTruth() {
    const box = $('rd-price-truth');
    const card = state.selectedPrice;
    if (card) {
      box.classList.add('is-priced');
      box.innerHTML = `<span class="rd-price-lock">VERIFIED</span><div><b>${esc(moneyMinor(card.amount_minor,card.currency))} per ${esc(unitLabel(card.unit))}</b><p>${esc(card.label)}. This exact published price card will travel with your request. Any scope outside its stated unit must be confirmed.</p></div>`;
    } else {
      box.classList.remove('is-priced');
      box.innerHTML = '<span class="rd-price-lock">PRICE</span><div><b>No fare calculated</b><p>Cabana will not derive a price from distance or time. Select an applicable published card if one appears, or wait for a confirmed operator quote.</p></div>';
    }
  }

  function updateFormState() {
    state.pickup = $('rd-pickup').value.trim();
    state.destination = $('rd-destination').value.trim();
    const scheduled = state.when !== 'later' || (scheduledFor() && scheduledFor() > new Date());
    const ready = Boolean(state.countryCode && state.modeKey && state.pickup.length >= 2 && state.destination.length >= 2 && scheduled);
    $('rd-submit').disabled = !ready;
    $('rd-form-status').textContent = !state.countryCode ? 'Choose a pickup country.'
      : state.pickup.length < 2 ? 'Add the pickup point.'
      : state.destination.length < 2 ? 'Add the destination.'
      : !state.modeKey ? 'Choose a movement mode.'
      : !scheduled ? 'Choose a future pickup date and time.'
      : 'Ready to send. This is a request, not a confirmed booking.';
  }
  function updateAll() { renderListings(); renderPrices(); updateFormState(); }

  function briefRows() {
    const mode = selectedMode();
    const when = state.when === 'later' && scheduledFor() ? scheduledFor().toLocaleString([], {dateStyle:'medium',timeStyle:'short'}) : 'As soon as a verified operator confirms';
    const price = state.selectedPrice ? `${moneyMinor(state.selectedPrice.amount_minor,state.selectedPrice.currency)} per ${unitLabel(state.selectedPrice.unit)}` : 'Awaiting a confirmed quote';
    return [['Country',countryOf(state.countryCode)?.name],['Route',`${state.pickup} → ${state.destination}`],['Mode',mode?.label],['Pickup',when],['Travellers',$('rd-passengers').value],['Price',price]];
  }
  function openSheet() {
    updateFormState();
    if ($('rd-submit').disabled) return;
    $('rd-brief').innerHTML = briefRows().map(row => `<div class="rd-brief-row"><span>${esc(row[0])}</span><b>${esc(row[1])}</b></div>`).join('');
    const session = global.ApaSession?.get?.();
    if (session?.status === 'user') {
      if (!$('rd-name').value) $('rd-name').value = session.name || session.profile?.full_name || '';
      if (!$('rd-email').value) $('rd-email').value = session.user?.email || session.profile?.email || '';
      if (!$('rd-phone').value) $('rd-phone').value = session.profile?.phone || '';
    }
    $('rd-sheet-error').textContent = '';
    $('rd-sheet').classList.add('is-open'); $('rd-sheet').setAttribute('aria-hidden','false');
    $('rd-scrim').classList.add('is-open'); document.body.classList.add('rd-lock');
    setTimeout(() => $('rd-name').focus(),120);
  }
  function closeSheet() {
    $('rd-sheet').classList.remove('is-open'); $('rd-sheet').setAttribute('aria-hidden','true');
    $('rd-scrim').classList.remove('is-open'); document.body.classList.remove('rd-lock');
    $('rd-submit').focus();
  }
  function validateContact() {
    const name = $('rd-name').value.trim(), phone = $('rd-phone').value.trim(), email = $('rd-email').value.trim();
    if (name.length < 2) return 'Add the name an operator should use.';
    const digits = phone.replace(/\D/g,'');
    if (digits.length < 7 || digits.length > 18) return 'Add a working phone number with the country code.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Check the email address or leave it blank.';
    return '';
  }
  async function sendRequest() {
    const errorText = validateContact();
    if (errorText) { $('rd-sheet-error').textContent = errorText; return; }
    if (!sb) { $('rd-sheet-error').textContent = 'The movement desk cannot connect right now. Please try again.'; return; }
    const send = $('rd-send');
    send.disabled = true; send.firstChild.textContent = 'Sending request ';
    const ref = reference();
    const schedule = scheduledFor();
    const needs = Array.from(document.querySelectorAll('.rd-needs-grid input:checked')).map(input => input.value);
    const pickup = pickupHandle?.get?.() || state.pickupGeo;
    const destination = destinationHandle?.get?.() || state.destinationGeo;
    const payload = {
      ref,
      rider_name:$('rd-name').value.trim(),
      rider_phone:$('rd-phone').value.trim(),
      rider_email:$('rd-email').value.trim() || null,
      service:'ride',
      class:state.modeKey,
      mode_key:state.modeKey,
      country_code:state.countryCode,
      city:pickup?.city || pickup?.name || null,
      pickup_label:state.pickup,
      pickup_lat:Number.isFinite(Number(pickup?.lat)) ? Number(pickup.lat) : null,
      pickup_lng:Number.isFinite(Number(pickup?.lng)) ? Number(pickup.lng) : null,
      dropoff_label:state.destination,
      dropoff_lat:Number.isFinite(Number(destination?.lat)) ? Number(destination.lat) : null,
      dropoff_lng:Number.isFinite(Number(destination?.lng)) ? Number(destination.lng) : null,
      scheduled_for:schedule ? schedule.toISOString() : null,
      passengers:Math.max(1,Math.min(60,Number($('rd-passengers').value)||1)),
      request_kind:state.when === 'later' ? 'scheduled' : 'on_demand',
      ride_needs:needs,
      notes:$('rd-notes').value.trim() || null,
      approved_price_card_id:state.selectedPrice?.id || null,
      quote_total:null
    };
    try {
      const { error } = await sb.from('ride_requests').insert(payload);
      if (error) throw error;
      closeSheet();
      $('rd-success-copy').textContent = state.selectedPrice
        ? 'Your route, needs and selected published price card are recorded. Cabana or the operator will confirm availability before anything is booked.'
        : 'Your route and needs are recorded. Cabana or the operator will confirm both availability and an exact price before anything is booked.';
      $('rd-success-ref').textContent = ref;
      $('rd-success').classList.add('is-open'); $('rd-success').setAttribute('aria-hidden','false');
      global.CabanaLifecycle?.listingSubmitted?.('rides_request',{ref,country:state.countryCode,mode:state.modeKey});
    } catch (error) {
      console.warn('[Cabana Move] request failed',error);
      $('rd-sheet-error').textContent = 'The request was not sent. Nothing was booked or charged. Please try again.';
    } finally {
      send.disabled = false; send.firstChild.textContent = 'Send request ';
    }
  }

  async function detectLocation() {
    const button = $('rd-detect');
    if (!global.ApaGeo?.locate) { toast('Location detection is unavailable. Choose a country and type your pickup.'); return; }
    button.disabled = true; button.querySelector('span').textContent = 'Locating';
    try {
      const place = await global.ApaGeo.locate({highAccuracy:true,timeout:15000,maximumAge:0});
      const code = String(place?.country_code || place?.iso2 || '').toUpperCase();
      if (!code || !AFRICA_CODES.has(code)) throw new Error('Cabana Move currently accepts pickup locations within Africa.');
      setCountry(code,false);
      pickupHandle?.set(place,{text:place.label || place.short || place.name});
      state.pickupGeo = place; state.pickup = $('rd-pickup').value; updateAll();
      toast(`Pickup detected in ${countryOf(code).name}. Check the exact point before sending.`);
    } catch (error) {
      toast(error?.message || 'Location could not be detected. Type the pickup instead.');
    } finally {
      button.disabled = false; button.querySelector('span').textContent = 'Detect me';
    }
  }

  function swapRoute() {
    const pickupText = $('rd-pickup').value, destinationText = $('rd-destination').value;
    const pickupPlace = pickupHandle?.get?.() || state.pickupGeo;
    const destinationPlace = destinationHandle?.get?.() || state.destinationGeo;
    pickupHandle?.clear(); destinationHandle?.clear();
    $('rd-pickup').value = destinationText; $('rd-destination').value = pickupText;
    if (destinationPlace) pickupHandle?.set(destinationPlace,{text:destinationText});
    if (pickupPlace) destinationHandle?.set(pickupPlace,{text:pickupText});
    state.pickupGeo = destinationPlace; state.destinationGeo = pickupPlace;
    state.selectedPrice = null; updateAll();
  }

  async function fetchRows(table, query) {
    try {
      let req = sb.from(table).select(query.select || '*');
      if (query.order) req = req.order(query.order,{ascending:true});
      if (query.eq) for (const [key,value] of Object.entries(query.eq)) req = req.eq(key,value);
      if (query.in) for (const [key,value] of Object.entries(query.in)) req = req.in(key,value);
      if (query.limit) req = req.limit(query.limit);
      const { data, error } = await req;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.info(`[Cabana Move] ${table} unavailable`,error?.message || error);
      return [];
    }
  }
  async function loadData() {
    if (!sb) { state.loading=false; renderListings(); return; }
    const [modes,markets,marketModes,prices,listings] = await Promise.all([
      fetchRows('ride_modes',{order:'sort'}),
      fetchRows('ride_markets',{order:'country_name'}),
      fetchRows('ride_market_modes',{select:'*'}),
      fetchRows('ride_price_cards',{order:'sort'}),
      fetchRows('listings',{select:'id,title,description,country,city,listing_type,type,photos,status,is_active,service,extras',in:{service:['rides','ride']},eq:{status:'active',is_active:true},limit:180})
    ]);
    if (modes.length) state.modes = modes;
    state.markets = markets; state.marketModes = marketModes; state.prices = prices; state.listings = listings;
    state.loading = false;
    renderModes();
    $('rd-stat-markets').textContent = String(new Set(markets.map(m => m.id)).size);
    $('rd-stat-live').textContent = String(markets.filter(m => m.status === 'live').length);
    $('rd-stat-services').textContent = String(listings.length);
    updateAll();
  }

  function bind() {
    $('rd-country').addEventListener('change',event => event.target.value && setCountry(event.target.value,false));
    $('rd-pickup').addEventListener('input',() => { state.pickupGeo=null; state.selectedPrice=null; updateAll(); });
    $('rd-destination').addEventListener('input',() => { state.destinationGeo=null; state.selectedPrice=null; updateAll(); });
    $('rd-passengers').addEventListener('input',updateFormState);
    $('rd-date').addEventListener('change',updateFormState);
    $('rd-time').addEventListener('change',updateFormState);
    document.querySelectorAll('[data-when]').forEach(button => button.addEventListener('click',() => {
      state.when = button.dataset.when;
      document.querySelectorAll('[data-when]').forEach(item => item.setAttribute('aria-pressed',String(item===button)));
      $('rd-schedule').hidden = state.when !== 'later';
      if (state.when === 'later' && !$('rd-date').value) {
        const tomorrow = new Date(Date.now()+86400000);
        $('rd-date').value = tomorrow.toISOString().slice(0,10); $('rd-time').value = '09:00';
      }
      updateFormState();
    }));
    $('rd-detect').addEventListener('click',detectLocation);
    $('rd-swap').addEventListener('click',swapRoute);
    $('rd-request-form').addEventListener('submit',event => { event.preventDefault(); openSheet(); });
    $('rd-sheet-close').addEventListener('click',closeSheet);
    $('rd-scrim').addEventListener('click',closeSheet);
    $('rd-send').addEventListener('click',sendRequest);
    $('rd-success-close').addEventListener('click',() => { $('rd-success').classList.remove('is-open'); $('rd-success').setAttribute('aria-hidden','true'); });
    document.addEventListener('keydown',event => {
      if (event.key !== 'Escape') return;
      if ($('rd-success').classList.contains('is-open')) $('rd-success-close').click();
      else if ($('rd-sheet').classList.contains('is-open')) closeSheet();
    });
  }

  function boot() {
    fillCountries();
    renderModes();
    bind();
    setCountry('KE',true);
    loadData();
  }

  global.CabanaRides = { AFRICA_COUNTRIES, FALLBACK_MODES, state, moneyMinor, priceApplies };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window);
