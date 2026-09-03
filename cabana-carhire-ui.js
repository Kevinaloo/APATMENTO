/* Cabana Drive Africa · country, geolocation, route and fleet interface. */
(function () {
  'use strict';
  const E = window.CabanaCarHire;
  if (!E) return;

  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const S = {
    countryCode:null, pickup:null, destination:null, crossBorder:false,
    start:null, end:null, mode:'self', route:null, cls:'all', sort:'fit',
    searched:false, loading:false, fleet:[], operators:[], source:null,
    vehicle:null, chauffeur:false, insurance:'basic', customer:{ name:'', phone:'', email:'' }
  };
  let pickupGeo = null, destinationGeo = null, routeSequence = 0, lastFocus = null;

  const opById = id => S.operators.find(operator => String(operator.id) === String(id));
  const country = () => E.COUNTRY_BY_CODE[S.countryCode] || null;
  const currencyForVehicle = vehicle => {
    const operator = opById(vehicle.operator_id);
    return operator && operator.currency_code || E.currencyFor(operator && operator.country_code || S.countryCode);
  };
  const money = (amount, vehicle) => E.formatMoney(amount, currencyForVehicle(vehicle));
  const days = () => {
    if (!S.start || !S.end) return 0;
    const value = (new Date(S.end + 'T12:00:00Z') - new Date(S.start + 'T12:00:00Z')) / 86400000;
    return value > 0 ? Math.round(value) : 0;
  };
  const startDate = () => S.start ? new Date(S.start + 'T12:00:00Z') : new Date();

  /* The light theme was removed: lime on off-white is about 1.4:1, so
     the headline and every figure on the page all but disappeared. The
     stored preference is deliberately not read either — an old
     localStorage value must not be able to resurrect a theme the
     stylesheet no longer defines. */

  function buildCountries() {
    const regions = ['North','West','Central','East','Southern'];
    $('ch-country').innerHTML = '<option value="">Select an African country</option>' + regions.map(region => {
      const options = E.AFRICA_COUNTRIES.filter(item => item.region === region)
        .map(item => `<option value="${item.code}">${esc(item.name)} · ${item.currency}</option>`).join('');
      return `<optgroup label="${region} Africa">${options}</optgroup>`;
    }).join('');
    $('ch-country').addEventListener('change', event => selectCountry(event.target.value, null));
  }

  function placeFromSeed(row) {
    return window.ApaGeo.place({
      id:'seed-city:' + row[3] + ':' + row[0], name:row[0], label:[row[0],row[1],row[2]].filter(Boolean).join(', '),
      lat:row[4], lng:row[5], kind:'city', city:row[0], state:row[1], country:row[2], countryCode:row[3]
    });
  }

  function renderCityPicks() {
    const holder = $('ch-city-picks');
    holder.innerHTML = '';
    if (!S.countryCode || !window.ApaGeo || !Array.isArray(ApaGeo.GAZETTEER)) return;
    const code = S.countryCode.toLowerCase();
    const cities = ApaGeo.GAZETTEER.filter(row => row[3] === code && row[6] === 'city').slice(0, 7);
    holder.innerHTML = cities.map((row, index) => `<button type="button" data-city-index="${index}">${esc(row[0])}</button>`).join('');
    holder.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const selected = placeFromSeed(cities[Number(button.dataset.cityIndex)]);
      S.pickup = selected;
      pickupGeo.set(selected);
      syncPlanner();
      maybeAnalyseRoute();
    }));
  }

  function destroyGeo() {
    if (pickupGeo) pickupGeo.destroy();
    if (destinationGeo) destinationGeo.destroy();
    pickupGeo = destinationGeo = null;
  }

  function attachGeo() {
    destroyGeo();
    const pickupInput = $('ch-pickup'), destinationInput = $('ch-destination');
    const enabled = !!S.countryCode;
    pickupInput.disabled = !enabled;
    destinationInput.disabled = !enabled;
    pickupInput.placeholder = enabled ? 'City, airport, hotel or exact address' : 'Choose a country first';
    if (!enabled || !window.ApaGeo) return;
    pickupGeo = ApaGeo.attach(pickupInput, {
      country:S.countryCode.toLowerCase(), limit:8, myLocation:false, recents:true,
      onPick:place => {
        const code = String(place.countryCode || '').toUpperCase();
        if (code && code !== S.countryCode) { toast(`Choose a pickup point in ${country().name}.`); pickupGeo.clear(); return; }
        S.pickup = place; syncPlanner(); maybeAnalyseRoute();
      },
      onClear:() => { S.pickup = null; S.route = null; syncPlanner(); renderRouteLab(); }
    });
    destinationGeo = ApaGeo.attach(destinationInput, {
      country:S.crossBorder ? undefined : S.countryCode.toLowerCase(), limit:8, myLocation:false, recents:true,
      onPick:place => {
        const code = String(place.countryCode || '').toUpperCase();
        if (code && !E.COUNTRY_BY_CODE[code]) {
          toast('Choose a destination within Africa.'); destinationGeo.clear(); return;
        }
        if (!S.crossBorder && code && code !== S.countryCode) {
          toast('Turn on cross-border route to choose another country.'); destinationGeo.clear(); return;
        }
        S.destination = place; syncPlanner(); maybeAnalyseRoute();
      },
      onClear:() => { S.destination = null; S.route = null; syncPlanner(); renderRouteLab(); }
    });
    if (S.pickup) pickupGeo.set(S.pickup);
    if (S.destination) destinationGeo.set(S.destination);
  }

  function selectCountry(code, detectedPlace) {
    const next = String(code || '').toUpperCase();
    const changed = next !== S.countryCode;
    S.countryCode = E.COUNTRY_BY_CODE[next] ? next : null;
    $('ch-country').value = S.countryCode || '';
    if (changed) {
      S.pickup = null; S.destination = null; S.route = null;
      $('ch-pickup').value = ''; $('ch-destination').value = '';
    }
    attachGeo();
    renderCityPicks();
    if (detectedPlace && pickupGeo) { S.pickup = detectedPlace; pickupGeo.set(detectedPlace); }
    syncPlanner(); renderRouteLab();
  }

  async function locateMe() {
    const button = $('ch-locate');
    if (!window.ApaGeo || !ApaGeo.locate) { toast('Location detection is unavailable in this browser.'); return; }
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    try {
      const place = await ApaGeo.locate({ timeout:12000, maximumAge:120000 });
      const code = String(place.countryCode || '').toUpperCase();
      if (!E.COUNTRY_BY_CODE[code]) throw new Error('Your current location is outside Cabana Drive Africa. Choose an African pickup country.');
      selectCountry(code, place);
      toast(`Pickup set near ${place.short || place.name}.`);
    } catch (error) {
      toast(error && error.message || 'We could not detect your location. Choose a country and search manually.');
    } finally {
      button.disabled = false; button.removeAttribute('aria-busy');
    }
  }

  function buildDates() {
    const today = new Date(); today.setHours(0,0,0,0);
    const iso = date => date.toISOString().slice(0,10);
    $('ch-from').min = iso(today); $('ch-to').min = iso(today);
    $('ch-from').addEventListener('change', event => {
      S.start = event.target.value || null;
      if (S.start) {
        $('ch-to').min = S.start;
        if (S.end && new Date(S.end) <= new Date(S.start)) { S.end = null; $('ch-to').value = ''; }
      }
      syncPlanner(); maybeAnalyseRoute();
    });
    $('ch-to').addEventListener('change', event => { S.end = event.target.value || null; syncPlanner(); });
  }

  function buildMode() {
    document.querySelectorAll('.ch-drive-mode button').forEach(button => button.addEventListener('click', () => {
      S.mode = button.dataset.mode;
      document.querySelectorAll('.ch-drive-mode button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }));
  }

  function setProgress() {
    const complete = [!!S.countryCode, !!S.pickup, !!S.destination, S.searched];
    document.querySelectorAll('.ch-stepbar span').forEach((node, index) => node.classList.toggle('on', complete[index] || index === 0));
  }

  function syncPlanner() {
    const validDays = days() > 0;
    const ready = !!(S.countryCode && S.pickup && S.start && S.end && validDays);
    $('ch-go').disabled = !ready;
    let text = 'Choose a country, pickup point and dates to begin.';
    if (S.countryCode && !S.pickup) text = `Search any city, airport or address in ${country().name}.`;
    else if (S.pickup && !S.start) text = 'Now choose your collection and return dates.';
    else if (S.start && S.end && !validDays) text = 'Return must be after collection.';
    else if (ready) text = `${days()} ${days() === 1 ? 'day' : 'days'} · ${E.currencyFor(S.countryCode)} local pricing${S.destination ? ' · route ready to analyse' : ' · local hire search'}`;
    $('ch-meta').textContent = text;
    $('ch-meta').classList.toggle('error', !!(S.start && S.end && !validDays));
    setProgress();
  }

  function routeUrl() {
    const p = new URLSearchParams({
      fromLat:S.pickup.lat, fromLng:S.pickup.lng, toLat:S.destination.lat, toLng:S.destination.lng,
      fromLabel:S.pickup.short || S.pickup.label || S.pickup.name,
      toLabel:S.destination.short || S.destination.label || S.destination.name,
      fromCountry:S.countryCode,
      toCountry:String(S.destination.countryCode || S.countryCode).toUpperCase()
    });
    if (S.start) p.set('date', S.start);
    return '/api/carhire-terrain?' + p.toString();
  }

  async function analyseRoute() {
    if (!S.pickup || !S.destination) { S.route = null; renderRouteLab(); return null; }
    const sequence = ++routeSequence;
    renderRouteLab(true);
    try {
      const response = await fetch(routeUrl(), { headers:{ Accept:'application/json' } });
      const profile = await response.json();
      if (sequence !== routeSequence) return null;
      if (!response.ok || !profile || profile.error) throw new Error(profile && profile.error || 'Route analysis unavailable');
      S.route = profile;
      renderRouteLab();
      if (S.searched) renderGrid();
      return profile;
    } catch (error) {
      if (sequence !== routeSequence) return null;
      S.route = null;
      renderRouteError(error && error.message);
      return null;
    }
  }

  let analyseTimer;
  function maybeAnalyseRoute() {
    clearTimeout(analyseTimer);
    if (!S.pickup || !S.destination) { S.route = null; renderRouteLab(); return; }
    analyseTimer = setTimeout(analyseRoute, 260);
  }

  function routeCanvas() {
    return `<div class="ch-route-canvas" aria-hidden="true"><div class="ch-contours"></div><span class="ch-map-pin a">A</span><span class="ch-map-pin b">B</span><svg viewBox="0 0 420 180" preserveAspectRatio="none"><path class="route-shadow" d="M62 130 C118 26 220 166 358 54"/><path class="route-pulse" d="M62 130 C118 26 220 166 358 54"/></svg></div>`;
  }

  function renderRouteLab(loading) {
    const lab = $('ch-route-lab');
    if (loading) {
      lab.className = 'ch-route-lab is-loading';
      lab.innerHTML = `<div class="ch-lab-head"><span>ROUTE LAB</span><em>Analysing A → B</em></div>${routeCanvas()}<div class="ch-lab-empty"><span class="ch-scan"></span><h3>Reading the road…</h3><p>Estimating distance, drive time, terrain, weather sensitivity, fuel range and vehicle capability.</p></div><div class="ch-lab-foot"><span><i></i>Route engine active</span><span>Planning estimate</span></div>`;
      return;
    }
    lab.className = 'ch-route-lab';
    if (!S.route) {
      lab.innerHTML = `<div class="ch-lab-head"><span>ROUTE LAB</span><em>Waiting for A → B</em></div>${routeCanvas()}<div class="ch-lab-empty"><span class="ch-scan"></span><h3>Your road, decoded.</h3><p>Add a destination and Cabana will estimate distance, drive time, surfaces, weather sensitivity, clearance, fuel gaps and border needs.</p></div><div class="ch-lab-foot"><span><i></i>Vehicle-fit engine</span><span>Not live navigation</span></div>`;
      return;
    }
    const route = S.route, mix = route.surface_mix || { paved:70,gravel:20,unsealed:10 };
    const recommendation = E.recommendVehicle(route);
    const source = route.basis === 'cabana_reference' ? 'Cabana corridor reference'
      : route.basis === 'ai_reasoning' ? 'Model-assisted planning estimate' : 'Geometry-based planning estimate';
    const confidence = route.confidence === 'high' ? 'high' : '';
    const risk = (route.hazards && route.hazards[0]) || route.note;
    lab.innerHTML = `<div class="ch-lab-head"><span>ROUTE LAB / COMPLETE</span><em>${esc(route.confidence || 'low')} confidence</em></div>${routeCanvas()}
      <div class="ch-lab-profile"><div class="ch-route-name"><span>One-way route</span><h3>${esc(route.label)}</h3></div>
        <div class="ch-route-metrics"><div><b>≈ ${Number(route.km).toLocaleString()} km</b><span>estimated road distance</span></div><div><b>≈ ${esc(E.formatDuration(route.duration_minutes))}</b><span>driving time before long stops</span></div><div><b>${route.clearance_mm} mm</b><span>minimum clearance target</span></div><div><b>${esc(E.DRIVE_LABEL[route.drive] || route.drive)}</b><span>minimum drivetrain</span></div><div><b>≈ ${route.range_km} km</b><span>possible reliable-fuel gap</span></div><div><b>${['Low','Moderate','High','Severe'][Number(route.wet_penalty || 0)]}</b><span>rain sensitivity</span></div></div>
        <div class="ch-surface"><div class="ch-surface-head"><span>Likely surface mix</span><span>${mix.paved}% paved</span></div><div class="ch-surface-bar"><i style="width:${mix.paved}%"></i><i style="width:${mix.gravel}%"></i><i style="width:${mix.unsealed}%"></i></div><div class="ch-surface-key"><span>Paved</span><span>Gravel</span><span>Unsealed</span></div></div>
        <div class="ch-recommend"><strong>FIT</strong><div><b>${esc(recommendation.label)}</b>${esc(recommendation.why)}</div></div>
        <p class="ch-route-note"><b>Road note:</b> ${esc(risk)}</p><span class="ch-source ${confidence}"><i></i>${esc(source)} · confirm current conditions locally</span>
      </div><div class="ch-lab-foot"><span><i></i>Vehicle-fit engine</span><span>${route.border_crossings && route.border_crossings.length ? 'Border documents required' : 'Domestic route'}</span></div>`;
  }

  function renderRouteError(message) {
    const lab = $('ch-route-lab');
    lab.className = 'ch-route-lab';
    lab.innerHTML = `<div class="ch-lab-head"><span>ROUTE LAB</span><em>Analysis interrupted</em></div>${routeCanvas()}<div class="ch-lab-empty"><h3>Route data is temporarily unavailable.</h3><p>${esc(message || 'You can still search verified local vehicles. Ask the operator to confirm the exact road before booking.')}</p></div><div class="ch-lab-foot"><span><i></i>Fleet search still available</span><span>Try again later</span></div>`;
  }

  async function resolvePlaces() {
    if (!S.pickup && pickupGeo) S.pickup = await pickupGeo.resolve();
    if (!S.destination && $('ch-destination').value.trim() && destinationGeo) S.destination = await destinationGeo.resolve();
    const pickupCode = String(S.pickup && S.pickup.countryCode || S.countryCode).toUpperCase();
    if (!S.pickup || (pickupCode && pickupCode !== S.countryCode)) throw new Error(`Choose a pickup point in ${country().name}.`);
    const destinationCode = String(S.destination && S.destination.countryCode || S.countryCode).toUpperCase();
    if (S.destination && !E.COUNTRY_BY_CODE[destinationCode]) throw new Error('Choose a destination within Africa.');
    if (S.destination && !S.crossBorder && destinationCode && destinationCode !== S.countryCode) throw new Error('Turn on cross-border route for a destination in another country.');
  }

  async function search(event) {
    if (event) event.preventDefault();
    try { await resolvePlaces(); } catch (error) { toast(error.message); return; }
    if (!S.start || !S.end || days() <= 0) { toast('Choose valid collection and return dates.'); return; }
    S.searched = true; S.loading = true; setProgress();
    $('ch-go').setAttribute('aria-busy','true'); $('ch-go').querySelector('span').textContent = 'Building your shortlist…';
    $('ch-results').hidden = false; renderGrid();
    $('ch-results-sub').textContent = `Searching verified operators around ${S.pickup.short || S.pickup.name}, ${country().name}.`;
    const routePromise = S.destination ? analyseRoute() : Promise.resolve(null);
    const fleetPromise = E.loadFleet(window.__chSb || null, {
      start:S.start, end:S.end, countryCode:S.countryCode,
      city:S.pickup.city || S.pickup.name, lat:S.pickup.lat, lng:S.pickup.lng, radiusKm:300
    });
    const result = await fleetPromise;
    await routePromise;
    S.fleet = result.fleet; S.operators = result.operators; S.source = result.source; S.loading = false;
    $('ch-go').removeAttribute('aria-busy'); $('ch-go').querySelector('span').textContent = 'Analyse route & find cars';
    $('ch-results-sub').textContent = `${S.pickup.short || S.pickup.name} · ${days()} ${days() === 1 ? 'day' : 'days'} · prices in each operator's local currency${S.route ? ' · ranked by route fit' : ''}.`;
    renderGrid();
    $('ch-results').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function buildFilters() {
    $('ch-classes').innerHTML = E.CLASSES.map(item => `<button type="button" class="ch-chip" data-class="${item.key}" aria-pressed="${item.key === 'all'}">${esc(item.label)}</button>`).join('');
    $('ch-classes').addEventListener('click', event => {
      const button = event.target.closest('[data-class]'); if (!button) return;
      S.cls = button.dataset.class;
      $('ch-classes').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      renderGrid();
    });
    $('ch-sort').addEventListener('change', event => { S.sort = event.target.value; renderGrid(); });
  }

  function visibleVehicles() {
    let list = S.fleet.filter(vehicle => {
      const operator = opById(vehicle.operator_id);
      if (!operator) return false;
      if (String(operator.country_code || '').trim().toUpperCase() !== S.countryCode) return false;
      return S.cls === 'all' || vehicle.class === S.cls;
    });
    const recommendation = E.recommendVehicle(S.route);
    list.forEach(vehicle => {
      vehicle.__grade = S.route ? E.grade(vehicle, S.route, startDate()) : null;
      vehicle.__efficiency = E.efficiency(vehicle, S.route);
      vehicle.__recommended = !!(S.route && recommendation.classes.includes(vehicle.class) && vehicle.__grade && vehicle.__grade.verdict !== 'blocked');
      vehicle.__quote = E.quote({ vehicle, days:days() || 1, chauffeur:S.mode === 'driver', insurance:'basic', route:S.route, currency:currencyForVehicle(vehicle) });
      vehicle.__total = vehicle.__quote.total;
    });
    if (S.sort === 'fit' && S.route) list.sort((a,b) => (Number(b.__recommended)-Number(a.__recommended)) || ((b.__grade && b.__grade.score || 0)-(a.__grade && a.__grade.score || 0)) || a.__total-b.__total);
    else if (S.sort === 'price') list.sort((a,b) => a.__total-b.__total);
    else if (S.sort === 'price_desc') list.sort((a,b) => b.__total-a.__total);
    else if (S.sort === 'efficiency') list.sort((a,b) => (b.__efficiency && b.__efficiency.kmpl || 0)-(a.__efficiency && a.__efficiency.kmpl || 0));
    else if (S.sort === 'seats') list.sort((a,b) => Number(b.seats || 0)-Number(a.seats || 0));
    return list;
  }

  function renderGrid() {
    const grid = $('ch-grid'), bar = $('ch-bar');
    if (S.loading) { bar.hidden = true; grid.innerHTML = Array.from({length:6}, () => '<div class="ch-skel"></div>').join(''); return; }
    if (S.source === 'error') { bar.hidden = true; grid.innerHTML = errorState(); wireStateButtons(); return; }
    const list = visibleVehicles();
    if (!list.length) { bar.hidden = true; grid.innerHTML = emptyState(); wireStateButtons(); return; }
    bar.hidden = false;
    $('ch-count').innerHTML = `<b>${list.length}</b> ${list.length === 1 ? 'vehicle' : 'vehicles'}`;
    if (!S.route && S.sort === 'fit') { S.sort = 'price'; $('ch-sort').value = 'price'; }
    grid.innerHTML = list.map(vehicleCard).join('');
    grid.querySelectorAll('.ch-card').forEach(card => card.addEventListener('click', () => openSheet(card.dataset.id)));
  }

  function vehicleCard(vehicle, index) {
    const operator = opById(vehicle.operator_id), grade = vehicle.__grade, fuel = vehicle.__efficiency;
    const photo = Array.isArray(vehicle.photos) && vehicle.photos[0];
    const distance = vehicle.operator_distance_km == null ? operator.city : `${Math.round(vehicle.operator_distance_km)} km from pickup`;
    return `<button type="button" class="ch-card" data-id="${esc(vehicle.id)}" style="--d:${Math.min(index * 55, 420)}ms">
      <div class="ch-card-top"><div class="ch-badges">${grade ? `<span class="ch-verdict ${grade.verdict}">${esc(grade.verdict)} · ${grade.score}/100</span>` : '<span class="ch-verdict">local inventory</span>'}<span class="ch-op">verified operator</span></div>
        ${photo ? `<img src="${esc(photo)}" alt="${esc(vehicle.make + ' ' + vehicle.model)}" loading="lazy">` : E.silhouette(vehicle.body)}
        ${vehicle.__recommended ? '<span class="ch-reco">recommended for this route</span>' : ''}
      </div>
      <div class="ch-card-body"><h3 class="ch-name">${esc(vehicle.make)} ${esc(vehicle.model)}<span class="ch-year">${esc(vehicle.year)}</span></h3><p class="ch-operator-line"><b>${esc(operator.name)}</b> · ${esc(distance || country().name)}</p>
        <div class="ch-specs"><span class="ch-spec">Drivetrain<b>${esc(E.DRIVE_LABEL[vehicle.drive] || vehicle.drive)}</b></span><span class="ch-spec">Clearance<b>${vehicle.clearance_mm || '—'} mm</b></span><span class="ch-spec">Seats<b>${vehicle.seats || '—'}</b></span><span class="ch-spec">Transmission<b>${esc(vehicle.transmission || '—')}</b></span></div>
        <div class="ch-fuel-strip">${fuel ? `<span>Declared fuel economy</span><b>${fuel.kmpl} km/L · ${fuel.litresPer100Km} L/100km</b>` : '<span>Fuel economy awaiting operator verification</span>'}</div>
        <div class="ch-price-row"><div class="ch-price">${money(vehicle.day_rate, vehicle)}<small>operator rate / day</small></div><div class="ch-total">${days()}-day estimate<b>${money(vehicle.__total, vehicle)}</b></div></div>
      </div></button>`;
  }

  function emptyState() {
    const where = S.pickup ? S.pickup.city || S.pickup.name : country() && country().name || 'this area';
    const hasFleet = S.fleet.length > 0;
    return `<div class="ch-state"><div class="ch-state-icon"><svg viewBox="0 0 24 24"><path d="M5 17h14M6.5 17V9.5l1.8-3.2A2 2 0 0 1 10 5.2h4a2 2 0 0 1 1.7 1.1L17.5 9.5V17"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg></div><h3>${hasFleet ? 'No vehicles match this filter' : `No verified cars around ${esc(where)} yet`}</h3><p>${hasFleet ? 'Try all vehicle types. Route safety filters remain in place.' : `Cabana will not invent supply or prices. We only show vehicles approved from real operators serving this pickup area.`}</p><div class="ch-state-acts">${hasFleet ? '<button type="button" class="ch-btn-quiet" id="ch-clear">Show all vehicle types</button>' : '<a class="ch-btn-primary" href="/list-your-fleet">Bring a local fleet to Cabana</a><a class="ch-btn-quiet" href="/rides.html">Book a ride instead</a>'}</div></div>`;
  }

  function errorState() {
    return '<div class="ch-state"><h3>Availability could not load</h3><p>The operator connection was interrupted. Your route inputs are safe; retry the inventory search.</p><div class="ch-state-acts"><button type="button" class="ch-btn-primary" id="ch-retry">Retry search</button></div></div>';
  }
  function wireStateButtons() {
    const retry = $('ch-retry'); if (retry) retry.addEventListener('click', search);
    const clear = $('ch-clear'); if (clear) clear.addEventListener('click', () => { S.cls='all'; $('ch-classes').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.class === 'all'))); renderGrid(); });
  }

  function captureCustomer() {
    if ($('ch-name')) S.customer.name = $('ch-name').value;
    if ($('ch-phone')) S.customer.phone = $('ch-phone').value;
    if ($('ch-email')) S.customer.email = $('ch-email').value;
  }

  function openSheet(id) {
    const vehicle = S.fleet.find(item => String(item.id) === String(id));
    if (!vehicle) return;
    lastFocus = document.activeElement; S.vehicle = vehicle; S.chauffeur = S.mode === 'driver'; S.insurance = 'basic';
    renderSheet();
    $('ch-scrim').classList.add('on'); $('ch-sheet').classList.add('on'); $('ch-sheet').setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden'; $('ch-sheet').querySelector('.ch-x').focus();
  }
  function closeSheet() {
    $('ch-scrim').classList.remove('on'); $('ch-sheet').classList.remove('on'); $('ch-sheet').setAttribute('aria-hidden','true');
    document.body.style.overflow = ''; if (lastFocus) lastFocus.focus();
  }

  function renderSheet() {
    const vehicle = S.vehicle, operator = opById(vehicle.operator_id), currency = currencyForVehicle(vehicle);
    const grade = S.route ? E.grade(vehicle, S.route, startDate()) : null;
    const fuel = E.efficiency(vehicle, S.route);
    const quote = E.quote({ vehicle, days:days() || 1, chauffeur:S.chauffeur, insurance:S.insurance, route:S.route, currency });
    $('ch-sheet-title').textContent = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
    const photo = Array.isArray(vehicle.photos) && vehicle.photos[0];
    let html = `<div class="ch-brief-hero">${photo ? `<img src="${esc(photo)}" alt="${esc(vehicle.make + ' ' + vehicle.model)}">` : E.silhouette(vehicle.body)}</div>`;
    if (grade) {
      const tone = grade.verdict === 'cleared' ? 'ok' : grade.verdict === 'caution' ? 'warn' : 'stop';
      const title = grade.verdict === 'cleared' ? 'Strong fit for this route' : grade.verdict === 'caution' ? 'Fit with a named compromise' : 'Not recommended for this route';
      const notes = grade.blockers.concat(grade.reasons).slice(0,4);
      html += `<div class="ch-note ${tone}"><b>${title} · ${grade.score}/100</b>${notes.map(esc).join('<br>')}</div>`;
    }
    html += `<span class="ch-lab">Verified vehicle specification</span><div class="ch-data-grid"><div><span>Drive</span><b>${esc(E.DRIVE_LABEL[vehicle.drive] || vehicle.drive)}</b></div><div><span>Clearance</span><b>${vehicle.clearance_mm || '—'} mm</b></div><div><span>Fuel</span><b>${esc(vehicle.fuel || '—')}</b></div><div><span>Tank</span><b>${vehicle.tank_litres ? vehicle.tank_litres + ' L' : '—'}</b></div><div><span>Seats</span><b>${vehicle.seats || '—'}</b></div><div><span>Gearbox</span><b>${esc(vehicle.transmission || '—')}</b></div></div>`;
    html += '<span class="ch-lab">Fuel economy · declared by operator</span>';
    if (fuel) {
      html += `<div class="ch-data-grid five"><div><span>Metric</span><b>${fuel.kmpl} km/L</b></div><div><span>Metric</span><b>${fuel.litresPer100Km} L/100km</b></div><div><span>Per km</span><b>${fuel.litresPerKm} L/km</b></div><div><span>US gallon</span><b>${fuel.mpgUS} mpg</b></div><div><span>UK gallon</span><b>${fuel.mpgUK} mpg</b></div></div>`;
      if (S.route) html += `<div class="ch-trip-fuel"><div class="ch-trip-fuel-head"><h4>Fuel plan for this route</h4><span>×${fuel.fuelMultiplier} terrain factor</span></div><p>Planning estimate from the operator's declared economy—not a fuel-price quote.</p><div class="ch-trip-fuel-grid"><div><b>≈ ${fuel.litresOneWay} L</b><span>one way</span></div><div><b>≈ ${fuel.litresReturn} L</b><span>out and back</span></div><div><b>≈ ${fuel.usableRangeKm} km</b><span>usable tank range</span></div></div></div>`;
    } else html += '<div class="ch-note warn"><b>Fuel data is incomplete</b>Ask the operator for the official combined-consumption figure and tank size before comparing trip cost.</div>';

    if (S.route) {
      const alerts = (S.route.hazards || []).concat(S.route.recommendations || []).slice(0,5);
      html += `<span class="ch-lab">Route handover brief</span><div class="ch-note"><b>${esc(S.route.label)}</b>${esc(S.route.note || '')}${alerts.length ? `<ul class="ch-confirm-list">${alerts.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}</div>`;
    }

    const driverRaw = S.route && !['metro','highway','coast'].includes(S.route.key) ? vehicle.chauffeur_upcountry : vehicle.chauffeur_metro;
    const driverLabel = Number(driverRaw) > 0 ? '+' + E.formatMoney(Number(driverRaw) * (days() || 1), currency) : 'Operator to quote';
    html += `<span class="ch-lab">Driver</span><div class="ch-opts"><button type="button" class="ch-opt" data-driver="0" aria-pressed="${!S.chauffeur}"><span class="ch-opt-l"><b>Self-drive</b><span>Subject to licence, age and permitted-road checks.</span></span><span class="cost">Included</span></button><button type="button" class="ch-opt" data-driver="1" aria-pressed="${S.chauffeur}"><span class="ch-opt-l"><b>With a professional driver</b><span>Hours, meals and overnight terms confirmed by operator.</span></span><span class="cost">${esc(driverLabel)}</span></button></div>`;
    html += `<span class="ch-lab">Insurance request</span><div class="ch-opts">${Object.entries(E.INSURANCE).map(([key,item]) => `<button type="button" class="ch-opt" data-insurance="${key}" aria-pressed="${S.insurance === key}"><span class="ch-opt-l"><b>${esc(item.label)}</b><span>${esc(item.blurb)}</span></span><span class="cost">Confirm</span></button>`).join('')}</div>`;
    html += `<span class="ch-lab">Transparent estimate</span>${quote.lines.map(line => `<div class="ch-line"><div class="ch-line-l"><b>${esc(line.label)}</b><span>${esc(line.detail || '')}</span></div><div class="ch-line-a${line.good ? ' good' : ''}">${line.amount ? E.formatMoney(line.amount, currency) : 'Included / confirm'}</div></div>`).join('')}<div class="ch-line total"><div class="ch-line-l"><b>${days() || 1}-day estimate</b><span>Refundable deposit ${quote.deposit ? E.formatMoney(quote.deposit, currency) : 'to be confirmed'} · final terms require operator approval</span></div><div class="ch-line-a">${E.formatMoney(quote.total, currency)}</div></div>`;
    html += `<span class="ch-lab">Your details</span><input class="ch-in" id="ch-name" placeholder="Full name" autocomplete="name" value="${esc(S.customer.name)}"><div class="ch-form-gap"></div><input class="ch-in" id="ch-phone" placeholder="Phone / WhatsApp" inputmode="tel" autocomplete="tel" value="${esc(S.customer.phone)}"><div class="ch-form-gap"></div><input class="ch-in" id="ch-email" placeholder="Email (optional)" inputmode="email" autocomplete="email" value="${esc(S.customer.email)}">`;
    $('ch-sheet-body').innerHTML = html;
    $('ch-sheet-foot').innerHTML = grade && grade.verdict === 'blocked' ? '<button class="ch-book-btn" type="button" disabled>Choose a route-fit vehicle</button>' : '<button class="ch-book-btn" id="ch-book" type="button">Request operator confirmation</button>';
    $('ch-sheet-body').querySelectorAll('[data-driver]').forEach(button => button.addEventListener('click', () => { captureCustomer(); S.chauffeur = button.dataset.driver === '1'; renderSheet(); }));
    $('ch-sheet-body').querySelectorAll('[data-insurance]').forEach(button => button.addEventListener('click', () => { captureCustomer(); S.insurance = button.dataset.insurance; renderSheet(); }));
    if ($('ch-book')) $('ch-book').addEventListener('click', submitBooking);
  }

  async function submitBooking() {
    captureCustomer();
    const name = S.customer.name.trim(), phone = S.customer.phone.trim();
    if (!name || !phone) { toast('Add your name and phone or WhatsApp number.'); return; }
    const vehicle = S.vehicle, operator = opById(vehicle.operator_id), currency = currencyForVehicle(vehicle);
    const quote = E.quote({ vehicle, days:days() || 1, chauffeur:S.chauffeur, insurance:S.insurance, route:S.route, currency });
    const grade = S.route ? E.grade(vehicle, S.route, startDate()) : null;
    const fuel = E.efficiency(vehicle, S.route);
    const ref = 'CD' + Math.random().toString(36).slice(2,7).toUpperCase();
    const button = $('ch-book'); button.disabled = true; button.textContent = 'Sending securely…';
    let saved = false;
    try {
      if (window.__chSb) {
        const booking = {
          ref, vehicle_id:vehicle.id, operator_id:vehicle.operator_id, starts_on:S.start, ends_on:S.end, days:days() || 1,
          with_chauffeur:S.chauffeur, route_key:S.route && S.route.key || null, route_verdict:grade && grade.verdict || null,
          pickup_mode:'custom', pickup_detail:S.pickup && (S.pickup.label || S.pickup.short) || null,
          insurance_tier:S.insurance, extras:[],
          price_breakdown:{ lines:quote.lines, currency, pickup:S.pickup, destination:S.destination, route:S.route, fuel },
          total:E.toMinor(quote.total), deposit_held:E.toMinor(quote.deposit), pay_at_counter:0,
          customer_name:name, phone, email:S.customer.email.trim() || null,
          notes:S.destination ? `Destination: ${S.destination.label || S.destination.short}` : 'Local hire; destination not specified', status:'pending'
        };
        const response = await window.__chSb.from('car_bookings').insert(booking);
        if (response.error) throw response.error;
        saved = true;
      }
    } catch (_) {}
    $('ch-sheet-body').innerHTML = `<div class="ch-state"><div class="ch-state-icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div><h3>Request sent</h3><p>Reference <b>${esc(ref)}</b>. ${saved ? `${esc(operator.name)} can now review the dates, route and requested terms.` : 'Send this reference to Cabana support so we can complete the handover.'}</p></div>`;
    $('ch-sheet-foot').innerHTML = `<a class="ch-book-btn" href="/help.html" data-cbn-support data-cbn-prefill="${esc('Cabana Drive reference ' + ref + '. Please help confirm this vehicle request.')}">Open confirmation support</a>`;
  }

  let toastTimer;
  function toast(message) {
    const node = $('ch-toast'); node.textContent = message; node.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('on'), 4200);
  }

  async function openFromQuery() {
    let id;
    try { id = new URLSearchParams(location.search).get('open'); } catch (_) {}
    if (!id) return;
    S.loading = true; S.searched = true; $('ch-results').hidden = false; renderGrid();
    const result = await E.loadFleet(window.__chSb || null, {});
    S.fleet = result.fleet; S.operators = result.operators; S.source = result.source; S.loading = false; renderGrid(); openSheet(id);
  }

  function init() {
    buildCountries(); buildDates(); buildMode(); buildFilters(); renderRouteLab(); syncPlanner();
    $('ch-locate').addEventListener('click', locateMe);
    $('ch-crossborder').addEventListener('change', event => {
      S.crossBorder = event.target.checked;
      S.destination = null; S.route = null; $('ch-destination').value = '';
      attachGeo(); syncPlanner(); renderRouteLab();
    });
    $('ch-form').addEventListener('submit', search);
    $('ch-scrim').addEventListener('click', closeSheet); $('ch-sheet').querySelector('.ch-x').addEventListener('click', closeSheet);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('ch-sheet').classList.contains('on')) closeSheet(); });
    openFromQuery();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
