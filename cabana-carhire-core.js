/* Cabana Drive Africa · vehicle, route, fuel and pricing engine. */
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
  ].map(function (row) {
    return { code: row[0], name: row[1], currency: row[2], region: row[3] };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });

  const COUNTRY_BY_CODE = Object.fromEntries(AFRICA_COUNTRIES.map(function (c) { return [c.code, c]; }));

  function currencyFor(countryCode) {
    const country = COUNTRY_BY_CODE[String(countryCode || '').toUpperCase()];
    return country ? country.currency : 'USD';
  }

  function formatMoney(amount, currency, locale) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '—';
    const code = String(currency || 'KES').toUpperCase();
    try {
      return new Intl.NumberFormat(locale || 'en', {
        style: 'currency', currency: code, currencyDisplay: 'code',
        maximumFractionDigits: value % 1 ? 2 : 0
      }).format(value).replace(/\u00a0/g, ' ');
    } catch (_) {
      return code + ' ' + Math.round(value).toLocaleString('en');
    }
  }

  const KES = function (n) { return formatMoney(n, 'KES', 'en-KE'); };
  const toMinor = function (n) { return Math.round(Number(n || 0) * 100); };
  const fromMinor = function (n) { return Number(n || 0) / 100; };

  const SIL = {
    hatchback: 'M14 62 L18 47 Q20 41 27 40 L62 36 Q74 26 90 25 L118 25 Q131 26 140 34 L166 40 Q178 43 180 51 L182 62',
    sedan: 'M10 62 L14 48 Q16 42 24 41 L58 36 Q70 25 88 24 L124 24 Q140 25 150 34 L172 41 Q184 44 186 52 L188 62',
    wagon: 'M10 62 L14 47 Q16 41 24 40 L56 35 Q68 24 86 23 L136 23 Q150 24 158 32 L176 40 Q186 44 188 52 L190 62',
    suv: 'M8 60 L11 42 Q13 34 22 33 L52 29 Q64 16 84 15 L128 15 Q146 16 156 27 L176 33 Q186 36 188 45 L190 60',
    safari: 'M8 60 L11 40 Q13 32 22 31 L50 27 Q62 14 82 13 L132 13 Q150 14 158 25 L178 31 Q188 34 190 43 L192 60',
    minivan: 'M8 62 L10 34 Q11 24 22 23 L60 19 Q70 14 84 14 L146 14 Q158 15 164 24 L180 33 Q188 37 189 46 L190 62',
    pickup: 'M8 60 L11 42 Q13 34 22 33 L52 29 Q64 16 84 15 L112 15 Q124 16 128 27 L128 33 L188 33 Q192 34 192 40 L192 60'
  };

  function silhouette(body, opts) {
    opts = opts || {};
    const kind = SIL[body] ? body : 'sedan';
    const wheelY = kind === 'minivan' ? 62 : ['suv','safari','pickup'].includes(kind) ? 60 : 62;
    const radius = ['suv','safari','pickup'].includes(kind) ? 15 : 13;
    const wheels = kind === 'minivan' ? [46,152] : kind === 'pickup' ? [46,158] : [48,150];
    const extra = kind === 'safari' ? '<path d="M84 13 L84 6 L134 6 L134 13" opacity=".55"/>'
      : kind === 'pickup' ? '<path d="M128 33 L188 33" opacity=".4"/>' : '';
    return `<svg class="veh-sil" viewBox="0 0 200 84" fill="none" stroke="${opts.stroke || 'currentColor'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="${SIL[kind]}"/>${extra}
      <circle cx="${wheels[0]}" cy="${wheelY}" r="${radius}"/><circle cx="${wheels[1]}" cy="${wheelY}" r="${radius}"/>
      <circle cx="${wheels[0]}" cy="${wheelY}" r="${radius - 6}" opacity=".45"/><circle cx="${wheels[1]}" cy="${wheelY}" r="${radius - 6}" opacity=".45"/>
      <path d="M0 ${wheelY + radius} L200 ${wheelY + radius}" opacity=".28"/>
    </svg>`;
  }

  /* Reference corridors are used only when both route endpoints match.
     Everywhere else gets an explicitly estimated, Africa-wide profile. */
  const ROUTES = [
    { key:'metro', label:'Nairobi & suburbs', km:60, clearance_mm:115, drive:'2wd', range_km:120, surface:'Tarmac throughout', wet_penalty:0, note:'City tarmac with speed bumps and occasional flooded underpasses.' },
    { key:'highway', label:'Nairobi → Mombasa', km:485, clearance_mm:120, drive:'2wd', range_km:190, surface:'A109 tarmac with heavy truck traffic', wet_penalty:0, note:'A long paved run where comfort and cruising range matter most.' },
    { key:'riftvalley', label:'Naivasha, Nakuru & the Rift', km:210, clearance_mm:140, drive:'2wd', range_km:150, surface:'Paved highway with rough park approaches', wet_penalty:1, note:'The main road is paved; some lake and park approaches are broken gravel.' },
    { key:'coast', label:'Diani & the South Coast', km:520, clearance_mm:125, drive:'2wd', range_km:190, surface:'Paved road plus ferry and beach approaches', wet_penalty:0, note:'Allow for ferry queues and soft sand away from the main road.' },
    { key:'amboseli', label:'Amboseli & Kilimanjaro side', km:240, clearance_mm:165, drive:'2wd', range_km:220, surface:'Paved road then corrugated volcanic dust', wet_penalty:2, note:'Washboard park roads punish low-clearance cars.' },
    { key:'mara', label:'Masai Mara', km:285, clearance_mm:180, drive:'awd', range_km:260, surface:'Murram followed by black-cotton-soil tracks', wet_penalty:3, note:'Black cotton soil can become impassable to two-wheel drive in heavy rain.' },
    { key:'tsavo', label:'Tsavo East & West', km:330, clearance_mm:180, drive:'awd', range_km:280, surface:'Laterite, rock shelves and sandy river beds', wet_penalty:2, note:'Sharp rock and remote park tracks make tyre condition and a second spare important.' },
    { key:'mtkenya', label:'Nanyuki & Mount Kenya', km:200, clearance_mm:160, drive:'awd', range_km:180, surface:'Paved road to town then steep forest tracks', wet_penalty:2, note:'The final approach to some gates is the demanding part.' },
    { key:'samburu', label:'Samburu & northern Kenya', km:350, clearance_mm:195, drive:'4wd', range_km:320, surface:'Rough gravel with long remote sections', wet_penalty:3, note:'Travel in daylight and fill at every reliable fuel stop.' },
    { key:'turkana', label:'Turkana & Marsabit expedition', km:780, clearance_mm:205, drive:'4wd_low', range_km:420, surface:'Lava, sand and severe corrugation', wet_penalty:3, note:'Expedition preparation, low range and recovery equipment are essential.' }
  ];
  const ROUTE_BY_KEY = Object.fromEntries(ROUTES.map(function (r) { return [r.key, r]; }));
  const DRIVE_RANK = { '2wd':0, awd:1, '4wd':2, '4wd_low':3 };
  const DRIVE_LABEL = { '2wd':'two-wheel drive', awd:'all-wheel drive', '4wd':'four-wheel drive', '4wd_low':'low-range 4×4' };

  const SOUTHERN = new Set(['AO','BW','LS','MW','MZ','NA','SZ','ZA','ZM','ZW','MG','MU']);
  const NORTH = new Set(['DZ','EG','LY','MA','SD','TN']);
  const WEST = new Set(['BJ','BF','CV','CI','GM','GH','GN','GW','LR','ML','MR','NE','NG','SN','SL','TG']);

  function seasonFor(date, countryCode, lat) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const month = Number.isFinite(d.getTime()) ? d.getMonth() + 1 : new Date().getMonth() + 1;
    const code = String(countryCode || 'KE').toUpperCase();
    if (NORTH.has(code)) {
      const wet = month >= 11 || month <= 3;
      return { key:wet ? 'cool_wet' : 'hot_dry', label:wet ? 'Cooler / wetter window' : 'Hot, dry window', wet:wet ? 1 : 0, peak:false, note:'A regional climate indication; recent weather and mountain conditions can differ.' };
    }
    if (SOUTHERN.has(code) || Number(lat) < -12) {
      const wet = month >= 11 || month <= 3;
      return { key:wet ? 'southern_wet' : 'southern_dry', label:wet ? 'Southern wet season' : 'Southern dry season', wet:wet ? 2 : 0, peak:false, note:'A broad regional season, not a live road report.' };
    }
    if (WEST.has(code)) {
      const wet = month >= 5 && month <= 10;
      return { key:wet ? 'west_wet' : 'west_dry', label:wet ? 'West African wet season' : 'West African dry season', wet:wet ? 2 : 0, peak:false, note:'Timing varies between coast and Sahel; verify current local conditions.' };
    }
    if (month >= 3 && month <= 5) return { key:'long_rains', label:'Long-rains window', wet:3, peak:false, note:'Unsealed roads can deteriorate quickly after sustained rain.' };
    if (month >= 10 && month <= 12) return { key:'short_rains', label:'Short-rains window', wet:2, peak:false, note:'Storms are variable; local conditions can change quickly.' };
    return { key:'dry', label:'Drier travel window', wet:0, peak:false, note:'A regional climate indication, not a live road report.' };
  }

  function grade(vehicle, routeArg, date) {
    const route = routeArg && typeof routeArg === 'object' ? routeArg : ROUTE_BY_KEY[routeArg];
    const season = seasonFor(date || new Date(), route && (route.to_country_code || route.country_code), route && route.to_lat);
    if (!route) return { verdict:'blocked', score:0, route:null, range:null, season, reasons:[], blockers:['Add a destination so this vehicle can be checked against the route.'] };

    const clearance = Number(vehicle.clearance_mm);
    if (!Number.isFinite(clearance)) return { verdict:'blocked', score:0, route, range:null, season, reasons:[], blockers:['This vehicle has no verified ground-clearance figure, so Cabana cannot mark it safe for this route.'] };

    const reasons = [], blockers = [];
    const routeWet = Number.isFinite(Number(route.season_wet)) ? Number(route.season_wet) : season.wet;
    const wet = Math.min(routeWet, Number(route.wet_penalty || 0));
    const needClearance = Math.round(Number(route.clearance_mm || 120) + wet * 10);
    const baseDrive = DRIVE_RANK[route.drive] == null ? 0 : DRIVE_RANK[route.drive];
    const needDrive = wet >= 2 && Number(route.wet_penalty || 0) >= 2 ? Math.max(baseDrive, DRIVE_RANK['4wd']) : baseDrive;
    let score = 100;

    const gap = clearance - needClearance;
    if (gap < -40) { blockers.push(`${clearance}mm clearance is too low; this route needs about ${needClearance}mm in the expected conditions.`); score -= 60; }
    else if (gap < 0) { reasons.push(`${clearance}mm is ${Math.abs(gap)}mm below the cautious route target. Confirm the final road section locally.`); score -= 22; }
    else if (gap >= 35) reasons.push(`${clearance}mm clearance leaves a useful ${gap}mm margin.`);

    const vehicleDrive = DRIVE_RANK[vehicle.drive] == null ? 0 : DRIVE_RANK[vehicle.drive];
    if (vehicleDrive < needDrive) {
      const wanted = Object.keys(DRIVE_RANK).find(function (k) { return DRIVE_RANK[k] === needDrive; });
      blockers.push(`Expected conditions call for ${DRIVE_LABEL[wanted]}; this vehicle is ${DRIVE_LABEL[vehicle.drive] || vehicle.drive || 'not verified'}.`);
      score -= needDrive - vehicleDrive >= 2 ? 60 : 45;
    } else if (vehicleDrive > needDrive) reasons.push('Its drivetrain adds useful margin if the surface or weather worsens.');

    const fuel = efficiency(vehicle, route);
    if (fuel && Number(route.range_km) > 0) {
      if (fuel.usableRangeKm < Number(route.range_km)) { blockers.push(`Estimated usable range is ${fuel.usableRangeKm}km against a possible ${route.range_km}km fuel gap.`); score -= 35; }
      else if (fuel.usableRangeKm < Number(route.range_km) * 1.25) { reasons.push(`Range margin is narrow: ${fuel.usableRangeKm}km usable against a possible ${route.range_km}km fuel gap.`); score -= 8; }
      else reasons.push(`Estimated usable range of ${fuel.usableRangeKm}km covers the route's ${route.range_km}km fuel-gap estimate.`);
    }

    (Array.isArray(route.hazards) ? route.hazards : []).slice(0, 2).forEach(function (hazard) {
      if (hazard) reasons.push(String(hazard));
    });
    const verdict = blockers.length ? (score < 45 ? 'blocked' : 'caution') : (score >= 92 ? 'cleared' : 'caution');
    return { verdict, score:Math.max(0, Math.min(100, score)), reasons, blockers, route, season, range:fuel ? fuel.usableRangeKm : null };
  }

  function round(value, places) {
    const pow = Math.pow(10, places == null ? 1 : places);
    return Math.round(value * pow) / pow;
  }

  function efficiency(vehicle, route) {
    const kmpl = Number(vehicle && vehicle.consumption_kmpl);
    if (!Number.isFinite(kmpl) || kmpl <= 0) return null;
    const tank = Number(vehicle.tank_litres);
    const surfaceMix = route && route.surface_mix || {};
    const derivedFactor = 1 + Number(surfaceMix.gravel || 0) / 100 * 0.08 + Number(surfaceMix.unsealed || 0) / 100 * 0.18;
    const multiplier = route && Number.isFinite(Number(route.fuel_multiplier))
      ? Math.max(1, Math.min(1.8, Number(route.fuel_multiplier))) : Math.max(1, derivedFactor);
    const oneWayKm = route && Number(route.km) > 0 ? Number(route.km) : null;
    const litresOneWay = oneWayKm == null ? null : oneWayKm / kmpl * multiplier;
    return {
      kmpl:round(kmpl, 1), litresPer100Km:round(100 / kmpl, 1), litresPerKm:round(1 / kmpl, 3),
      mpgUS:round(kmpl * 2.35214583, 1), mpgUK:round(kmpl * 2.82480936, 1),
      fuelMultiplier:round(multiplier, 2), litresOneWay:litresOneWay == null ? null : round(litresOneWay, 1),
      litresReturn:litresOneWay == null ? null : round(litresOneWay * 2, 1),
      usableRangeKm:Number.isFinite(tank) && tank > 0 ? Math.round(tank * kmpl * 0.85 / multiplier) : null
    };
  }

  function recommendVehicle(route) {
    if (!route) return { key:'open', label:'Route not graded yet', classes:['economy','compact','crossover','suv4x4','safari','van','pickup','luxury'], why:'Add a destination to rank vehicles by real route fit.' };
    const clearance = Number(route.clearance_mm || 120);
    const drive = DRIVE_RANK[route.drive] == null ? 0 : DRIVE_RANK[route.drive];
    if (drive >= 3 || clearance >= 205) return { key:'expedition', label:'Expedition 4×4', classes:['safari','suv4x4','pickup'], why:'Low range, recovery margin and high clearance are the priority.' };
    if (drive >= 2 || clearance >= 180) return { key:'fourbyfour', label:'High-clearance 4×4', classes:['suv4x4','safari','pickup'], why:'The route needs genuine four-wheel-drive capability and clearance.' };
    if (drive >= 1 || clearance >= 150) return { key:'crossover', label:'AWD crossover or 4×4', classes:['crossover','suv4x4'], why:'Extra traction and clearance reduce risk on mixed surfaces.' };
    return { key:'road', label:'Efficient road car', classes:['economy','compact','crossover','luxury','van'], why:'A verified two-wheel-drive vehicle is suitable; comfort and economy can lead.' };
  }

  function formatDuration(minutes) {
    const value = Math.max(0, Math.round(Number(minutes || 0)));
    if (!value) return '—';
    const h = Math.floor(value / 60), m = value % 60;
    return h ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
  }

  const INSURANCE = {
    basic:{ label:'Operator standard cover', perDay:0, deposit:1, blurb:'Ask the operator to confirm the excess, exclusions, roadside assistance and permitted roads in writing.' },
    reduced:{ label:'Request reduced excess', perDay:0, deposit:1, blurb:'The operator will confirm whether a reduced-excess option is available and quote it before approval.' }
  };
  const EXTRAS = [];
  const DELIVERY = { depot:{ label:'Operator pickup point', fee:0 } };

  function durationDiscount(days, vehicle) {
    const declared = vehicle && Number(vehicle.weekly_discount_pct);
    if (days >= 7 && Number.isFinite(declared) && declared > 0) return { pct:Math.min(declared / 100, .6), label:'Operator weekly rate' };
    return { pct:0, label:null };
  }

  function quote(opts) {
    opts = opts || {};
    const v = opts.vehicle || {};
    const days = Math.max(1, Number(opts.days || 1));
    const currency = opts.currency || v.currency_code || 'KES';
    const routeArg = opts.route != null ? opts.route : opts.routeKey;
    const route = routeArg && typeof routeArg === 'object' ? routeArg : (ROUTE_BY_KEY[routeArg] || ROUTE_BY_KEY.metro);
    const insurance = INSURANCE[opts.insurance || 'basic'] || INSURANCE.basic;
    const lines = [];
    const rate = Number(v.day_rate || 0);
    const gross = rate * days;
    lines.push({ key:'base', label:`${v.make || 'Vehicle'} ${v.model || ''}`.trim(), detail:`${formatMoney(rate, currency)} × ${days} ${days === 1 ? 'day' : 'days'}`, amount:gross });
    let total = gross;
    const discount = durationDiscount(days, v);
    if (discount.pct) {
      const cut = Math.round(gross * discount.pct);
      lines.push({ key:'duration', label:discount.label, detail:`${Math.round(discount.pct * 100)}% operator-declared discount`, amount:-cut, good:true });
      total -= cut;
    }
    if (opts.chauffeur) {
      const upcountry = !['metro','highway','coast'].includes(route.key);
      const declaredDriverRate = upcountry ? v.chauffeur_upcountry : v.chauffeur_metro;
      const driverRate = Number(declaredDriverRate == null ? 0 : declaredDriverRate);
      const amount = driverRate * days;
      lines.push({ key:'chauffeur', label:'Professional driver', detail:driverRate > 0
        ? (upcountry ? `${formatMoney(driverRate, currency)}/day upcountry` : `${formatMoney(driverRate, currency)}/day`)
        : 'Operator to confirm the driver rate and working hours', amount });
      total += amount;
    }
    lines.push({ key:'insurance', label:insurance.label, detail:insurance.blurb, amount:0, included:true });
    lines.push({ key:'commission', label:'Cabana commission', detail:'The operator keeps the full hire rate', amount:0, good:true });
    return { lines, total:Math.round(total), deposit:Number(v.deposit || 0), days, route, currency, insurance, payAtCounter:0, fuelPolicy:v.fuel_policy || 'full_to_full', perDayEffective:Math.round(total / days) };
  }

  const CITIES = [
    { key:'nairobi', label:'Nairobi' },{ key:'mombasa', label:'Mombasa' },{ key:'lagos', label:'Lagos' },
    { key:'accra', label:'Accra' },{ key:'kigali', label:'Kigali' },{ key:'cape-town', label:'Cape Town' }
  ];
  const CLASSES = [
    { key:'all', label:'All vehicles' },{ key:'economy', label:'Economy' },{ key:'compact', label:'Saloon' },
    { key:'crossover', label:'Crossover' },{ key:'suv4x4', label:'4×4' },{ key:'safari', label:'Safari-built' },
    { key:'van', label:'Group & van' },{ key:'pickup', label:'Pickup' },{ key:'luxury', label:'Executive' }
  ];

  async function loadFleet(sb, filters) {
    filters = filters || {};
    if (!sb) return { source:'empty', fleet:[], operators:[], error:'offline' };
    try {
      let vehicleIds = null;
      const distances = {};
      if (filters.start && filters.end && filters.countryCode) {
        const nearby = await sb.rpc('cars_available_nearby', {
          p_start:filters.start, p_end:filters.end, p_country_code:String(filters.countryCode).toUpperCase(),
          p_city:filters.city || null, p_lat:filters.lat == null ? null : Number(filters.lat),
          p_lng:filters.lng == null ? null : Number(filters.lng),
          p_radius_km:Math.max(25, Math.min(800, Number(filters.radiusKm || 300)))
        });
        if (!nearby.error && Array.isArray(nearby.data)) {
          vehicleIds = nearby.data.map(function (row) {
            distances[row.vehicle_id] = row.distance_km == null ? null : Number(row.distance_km);
            return row.vehicle_id;
          });
        }
      }
      if (vehicleIds && !vehicleIds.length) return { source:'empty', fleet:[], operators:[] };
      let fleetQuery = sb.from('car_fleet').select('*').eq('status', 'active').limit(300);
      if (vehicleIds) fleetQuery = fleetQuery.in('id', vehicleIds);
      const fleetResult = await fleetQuery;
      if (fleetResult.error) throw fleetResult.error;
      const rows = fleetResult.data || [];
      const operatorIds = Array.from(new Set(rows.map(function (row) { return row.operator_id; }).filter(Boolean)));
      if (!operatorIds.length) return { source:'empty', fleet:[], operators:[] };

      const publicFields = 'id,name,slug,city,country_code,verified,fleet_size,response_mins,on_time_pct,completed_hires,rating,currency_code,service_radius_km';
      let operatorResult = await sb.from('car_operators_public').select(publicFields).in('id', operatorIds);
      if (operatorResult.error) operatorResult = await sb.from('car_operators').select(publicFields).eq('verified', true).in('id', operatorIds);
      if (operatorResult.error) throw operatorResult.error;
      const operators = operatorResult.data || [];
      const verified = new Set(operators.map(function (o) { return o.id; }));
      const fleet = rows.filter(function (row) { return verified.has(row.operator_id); }).map(function (row) {
        return Object.assign({}, row, {
          clearance_mm:row.ground_clearance_mm, day_rate:fromMinor(row.day_rate), deposit:fromMinor(row.deposit),
          peak_uplift:fromMinor(row.peak_uplift), chauffeur_metro:fromMinor(row.chauffeur_uplift_metro),
          chauffeur_upcountry:fromMinor(row.chauffeur_uplift_upcountry),
          operator_distance_km:Object.prototype.hasOwnProperty.call(distances, row.id) ? distances[row.id] : null
        });
      });
      return { source:fleet.length ? 'live' : 'empty', fleet, operators };
    } catch (err) {
      return { source:'error', fleet:[], operators:[], error:String(err && err.message || err) };
    }
  }

  global.CabanaCarHire = {
    AFRICA_COUNTRIES, COUNTRY_BY_CODE, currencyFor, formatMoney, KES, toMinor, fromMinor,
    ROUTES, ROUTE_BY_KEY, DRIVE_LABEL, CLASSES, CITIES, INSURANCE, EXTRAS, DELIVERY,
    FLEET:[], OPERATORS:[], seasonFor, grade, efficiency, recommendVehicle, formatDuration,
    quote, durationDiscount, silhouette, loadFleet
  };
})(window);
