/* ═══════════════════════════════════════════════════════════════════
   CABANA · CAR HIRE · CORE ENGINE
   ───────────────────────────────────────────────────────────────────
   Three engines and one catalogue, all pure functions so they can be
   unit-tested without a DOM:

     ROUTES   real Kenyan driving corridors with measured demands
     SEASON   which rains you are driving into, and what that costs
     GRADE    does this specific vehicle survive this specific route
     PRICE    every shilling, assembled line by line, nothing hidden

   Money is handled in whole KES here. The database stores minor units;
   conversion happens only at the persistence boundary (see toMinor()).
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── MONEY ───────────────────────────────────────────────────── */
  const KES = n => 'KES ' + Math.round(n).toLocaleString('en-KE');
  const toMinor = n => Math.round(n * 100);
  const fromMinor = n => n / 100;

  /* ═══════════════════════════════════════════════════════════════
     1 · VEHICLE SILHOUETTES
     Technical blueprint line-art, drawn to a shared 200×84 grid so
     that proportions between body types stay honest. Stock photos
     were removed: they showed cars the operators do not own.
     ═══════════════════════════════════════════════════════════════ */
  const SIL = {
    hatchback:
      'M14 62 L18 47 Q20 41 27 40 L62 36 Q74 26 90 25 L118 25 Q131 26 140 34 L166 40 Q178 43 180 51 L182 62',
    sedan:
      'M10 62 L14 48 Q16 42 24 41 L58 36 Q70 25 88 24 L124 24 Q140 25 150 34 L172 41 Q184 44 186 52 L188 62',
    wagon:
      'M10 62 L14 47 Q16 41 24 40 L56 35 Q68 24 86 23 L136 23 Q150 24 158 32 L176 40 Q186 44 188 52 L190 62',
    suv:
      'M8 60 L11 42 Q13 34 22 33 L52 29 Q64 16 84 15 L128 15 Q146 16 156 27 L176 33 Q186 36 188 45 L190 60',
    safari:
      'M8 60 L11 40 Q13 32 22 31 L50 27 Q62 14 82 13 L132 13 Q150 14 158 25 L178 31 Q188 34 190 43 L192 60',
    minivan:
      'M8 62 L10 34 Q11 24 22 23 L60 19 Q70 14 84 14 L146 14 Q158 15 164 24 L180 33 Q188 37 189 46 L190 62',
    pickup:
      'M8 60 L11 42 Q13 34 22 33 L52 29 Q64 16 84 15 L112 15 Q124 16 128 27 L128 33 L188 33 Q192 34 192 40 L192 60'
  };

  /* Roof hatch on safari conversions — the visual tell of a game
     vehicle, and the reason it costs what it costs. */
  const SIL_EXTRA = {
    safari: '<path d="M84 13 L84 6 L134 6 L134 13" fill="none" opacity=".55"/>',
    pickup: '<path d="M128 33 L188 33" fill="none" opacity=".4"/>'
  };

  function silhouette(body, opts) {
    opts = opts || {};
    const path = SIL[body] || SIL.sedan;
    const wheelY = body === 'minivan' ? 62 : (body === 'suv' || body === 'safari' || body === 'pickup') ? 60 : 62;
    const r = (body === 'suv' || body === 'safari' || body === 'pickup') ? 15 : 13;
    const wx = body === 'minivan' ? [46, 152] : (body === 'pickup') ? [46, 158] : [48, 150];
    const stroke = opts.stroke || 'currentColor';
    return `<svg class="veh-sil" viewBox="0 0 200 84" fill="none" stroke="${stroke}"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="${path}"/>
      ${SIL_EXTRA[body] || ''}
      <circle cx="${wx[0]}" cy="${wheelY}" r="${r}" stroke-width="1.6"/>
      <circle cx="${wx[1]}" cy="${wheelY}" r="${r}" stroke-width="1.6"/>
      <circle cx="${wx[0]}" cy="${wheelY}" r="${r - 6}" stroke-width="1" opacity=".45"/>
      <circle cx="${wx[1]}" cy="${wheelY}" r="${r - 6}" stroke-width="1" opacity=".45"/>
      <path d="M0 ${wheelY + r} L200 ${wheelY + r}" stroke-width="1" opacity=".28"/>
    </svg>`;
  }

  /* ═══════════════════════════════════════════════════════════════
     2 · ROUTES
     Each corridor carries the demands it actually makes on a vehicle.
     clearance_mm  minimum ground clearance to avoid grounding out
     drive         weakest drivetrain that copes
     range_km      longest stretch between reliable fuel
     surface       what you are driving on, in plain words
     ═══════════════════════════════════════════════════════════════ */
  const ROUTES = [
    { key: 'metro', label: 'Nairobi & suburbs', km: 60, clearance_mm: 115, drive: '2wd',
      range_km: 120, surface: 'Tarmac throughout', wet_penalty: 0,
      note: 'City tarmac with speed bumps and occasional flooded underpasses.' },

    { key: 'highway', label: 'Nairobi → Mombasa', km: 485, clearance_mm: 120, drive: '2wd',
      range_km: 190, surface: 'A109 tarmac, heavy truck traffic', wet_penalty: 0,
      note: 'Long tarmac run. Fuel is easy. Comfort and cruising range matter more than clearance.' },

    { key: 'riftvalley', label: 'Naivasha, Nakuru & the Rift', km: 210, clearance_mm: 140, drive: '2wd',
      range_km: 150, surface: 'A104 tarmac with rough park approaches', wet_penalty: 1,
      note: 'Tarmac to town, then broken murram into the lakes and Hell\'s Gate.' },

    { key: 'coast', label: 'Diani & the South Coast', km: 520, clearance_mm: 125, drive: '2wd',
      range_km: 190, surface: 'Tarmac plus the Likoni ferry', wet_penalty: 0,
      note: 'Ferry crossing at Likoni. Salt air and sand tracks on the beach approaches.' },

    { key: 'amboseli', label: 'Amboseli & Kilimanjaro side', km: 240, clearance_mm: 165, drive: '2wd',
      range_km: 220, surface: 'Tarmac then corrugated volcanic dust', wet_penalty: 2,
      note: 'The park roads are washboard and fine ash. Low cars shake themselves apart.' },

    { key: 'mara', label: 'Masai Mara', km: 285, clearance_mm: 180, drive: 'awd',
      range_km: 260, surface: 'Murram, then black cotton soil inside the reserve', wet_penalty: 3,
      note: 'Black cotton turns to glue in the rains. This is the single most common wrong-vehicle mistake in Kenya.' },

    { key: 'tsavo', label: 'Tsavo East & West', km: 330, clearance_mm: 180, drive: 'awd',
      range_km: 280, surface: 'Red laterite, rock shelves, sand river beds', wet_penalty: 2,
      note: 'Sharp lava rock. Two spare tyres is not paranoia here.' },

    { key: 'mtkenya', label: 'Nanyuki & Mount Kenya', km: 200, clearance_mm: 160, drive: 'awd',
      range_km: 180, surface: 'Tarmac to town, steep rutted forest tracks above', wet_penalty: 2,
      note: 'The tarmac is fine. The last climb to the gates is not.' },

    { key: 'samburu', label: 'Samburu & the north', km: 350, clearance_mm: 195, drive: '4wd',
      range_km: 320, surface: 'Rough gravel beyond Isiolo, long fuel gaps', wet_penalty: 3,
      note: 'Fuel thins out past Isiolo. Carry range, carry water, travel in daylight.' },

    { key: 'turkana', label: 'Turkana & Marsabit expedition', km: 780, clearance_mm: 205, drive: '4wd_low',
      range_km: 420, surface: 'Lava desert, sand, corrugation for hundreds of km', wet_penalty: 3,
      note: 'Expedition grade. Low-range and long-range fuel are mandatory, not preferences.' }
  ];

  const ROUTE_BY_KEY = Object.fromEntries(ROUTES.map(r => [r.key, r]));

  const DRIVE_RANK = { '2wd': 0, awd: 1, '4wd': 2, '4wd_low': 3 };
  const DRIVE_LABEL = { '2wd': 'two-wheel drive', awd: 'all-wheel drive',
                        '4wd': 'four-wheel drive', '4wd_low': 'low-range 4×4' };

  /* ═══════════════════════════════════════════════════════════════
     3 · SEASON
     Kenya runs two rainy seasons. They change what a road is, and
     they change what a vehicle costs.
       long rains   Mar – May   worst surface conditions
       short rains  Oct – Dec   variable, mostly afternoon storms
       peak safari  Jul – Oct   migration, and a real price uplift
     ═══════════════════════════════════════════════════════════════ */
  function seasonFor(date) {
    const m = date.getMonth() + 1, d = date.getDate();
    const festive = (m === 12 && d >= 20) || (m === 1 && d <= 5);
    if (m >= 3 && m <= 5)
      return { key: 'long_rains', label: 'Long rains', wet: 3, peak: false,
        note: 'March to May. Wettest months. Unsealed roads deteriorate fast.' };
    if (m >= 10 && m <= 12 && !festive)
      return { key: 'short_rains', label: 'Short rains', wet: 2, peak: m >= 10 && m <= 10,
        note: 'October to December. Afternoon storms, mostly passable.' };
    if (festive)
      return { key: 'festive', label: 'Festive peak', wet: 2, peak: true,
        note: 'Late December to early January. Demand spikes and fleets sell out.' };
    if (m >= 7 && m <= 9)
      return { key: 'peak_dry', label: 'Peak safari season', wet: 0, peak: true,
        note: 'July to September. Dry, firm roads, migration crowds, highest rates.' };
    return { key: 'dry', label: 'Dry season', wet: 0, peak: m === 6,
      note: 'Firm surfaces and the easiest driving of the year.' };
  }

  /* ═══════════════════════════════════════════════════════════════
     4 · GRADE
     The heart of the page. Given a vehicle, a route and a date,
     decide whether this is a sensible hire — and say why in words a
     traveller can act on.

     Returns { verdict, score, reasons[], blockers[] }
       cleared  nothing stands in the way
       caution  it will get there, with a named compromise
       blocked  do not sell this pairing
     ═══════════════════════════════════════════════════════════════ */
  function grade(vehicle, routeKey, date) {
    /* Fail closed. Defaulting an unknown key to metro grades the vehicle
       against the easiest corridor on the map, which is the one mistake
       this engine exists to prevent. */
    const route = ROUTE_BY_KEY[routeKey];
    if (!route) {
      return {
        verdict: 'blocked', score: 0, route: null, range: null,
        season: seasonFor(date || new Date()), reasons: [],
        blockers: ['Choose where you are driving so we can check this vehicle against that route.']
      };
    }
    const season = seasonFor(date || new Date());
    const reasons = [], blockers = [];
    let score = 100;

    /* Wet weather raises the bar on a route that has unsealed sections. */
    const wet = Math.min(season.wet, route.wet_penalty);
    const needClearance = route.clearance_mm + wet * 10;
    const needDrive = wet >= 2 && route.wet_penalty >= 2
      ? Math.max(DRIVE_RANK[route.drive], DRIVE_RANK['4wd'])
      : DRIVE_RANK[route.drive];

    /* — Ground clearance —
       Fail closed. A missing or non-numeric clearance figure means we
       cannot grade the vehicle, and an ungraded vehicle must never be
       presented as safe for the route. */
    const clearance = Number(vehicle.clearance_mm);
    if (!Number.isFinite(clearance)) {
      return {
        verdict: 'blocked', score: 0, route, season, range: null, reasons: [],
        blockers: ['We do not hold a verified ground clearance figure for this vehicle, so we cannot confirm it is safe on this route.']
      };
    }
    const gap = clearance - needClearance;
    if (gap < -40) {
      blockers.push(`Only ${vehicle.clearance_mm}mm of clearance. ${route.label} needs about ${needClearance}mm — this will ground out.`);
      score -= 60;
    } else if (gap < 0) {
      reasons.push(`${vehicle.clearance_mm}mm clearance is ${Math.abs(gap)}mm under what this route wants. Passable if you drive slowly and pick your lines.`);
      score -= 22;
    } else if (gap > 60) {
      reasons.push(`${vehicle.clearance_mm}mm clearance, comfortably above what the route demands.`);
    }

    /* — Drivetrain — */
    const dRank = DRIVE_RANK[vehicle.drive] ?? 0;
    if (dRank < needDrive) {
      const want = Object.keys(DRIVE_RANK).find(k => DRIVE_RANK[k] === needDrive);
      const need = DRIVE_LABEL[want], has = DRIVE_LABEL[vehicle.drive] || vehicle.drive;
      if (needDrive - dRank >= 2) {
        blockers.push(`This route needs ${need}. A ${has} vehicle will not get through.`);
        score -= 60;
      } else {
        blockers.push(`Needs ${need}${wet >= 2 ? ' in these conditions' : ''}. This one is ${has}.`);
        score -= 45;
      }
    } else if (dRank > needDrive) {
      reasons.push(`More drivetrain than the route strictly needs — useful margin if the weather turns.`);
    }

    /* — Fuel range — */
    const range = (vehicle.tank_litres && vehicle.consumption_kmpl)
      ? Math.round(vehicle.tank_litres * vehicle.consumption_kmpl * 0.85) : null;
    if (range !== null) {
      if (range < route.range_km) {
        blockers.push(`About ${range}km of usable range against a ${route.range_km}km fuel gap. You would need to carry jerricans.`);
        score -= 35;
      } else if (range < route.range_km * 1.25) {
        reasons.push(`Roughly ${range}km of range against a ${route.range_km}km gap. Fill up at every opportunity.`);
        score -= 8;
      } else {
        reasons.push(`Around ${range}km of range — the ${route.range_km}km fuel gap is not a concern.`);
      }
    }

    /* — Seasonal note worth surfacing even when nothing is wrong — */
    if (wet >= 2 && route.wet_penalty >= 2 && !blockers.length) {
      reasons.push(`${season.label}: ${route.note}`);
    }

    const verdict = blockers.length ? (score < 45 ? 'blocked' : 'caution')
      : (score >= 92 ? 'cleared' : 'caution');

    return { verdict, score: Math.max(0, Math.min(100, score)), reasons, blockers, route, season, range };
  }

  /* ═══════════════════════════════════════════════════════════════
     5 · PRICE
     Every line item a Kenyan hire actually carries, assembled in the
     order a guest meets them. Grounded in published 2026 operator
     rate cards: 15–30% off at seven days, KES 2,000–5,000/day peak
     uplift, KES 15,000–30,000 deposits, full-to-full fuel.
     ═══════════════════════════════════════════════════════════════ */
  const INSURANCE = {
    basic:      { label: 'Basic cover',   excess: 150000, perDay: 0,    deposit: 1.0,
                  blurb: 'Collision and theft cover with a KES 150,000 excess you carry.' },
    standard:   { label: 'Reduced excess', excess: 35000, perDay: 900,  deposit: 0.5,
                  blurb: 'Drops your excess to KES 35,000 and halves the deposit held.' },
    zero_excess:{ label: 'Zero excess',    excess: 0,     perDay: 1800, deposit: 0,
                  blurb: 'No excess and no deposit held. You walk away from any damage claim.' }
  };

  const EXTRAS = [
    { key: 'child_seat',   label: 'Child seat',            perDay: 500,  once: false },
    { key: 'extra_driver', label: 'Additional driver',     perDay: 0,    once: true, flat: 1000 },
    { key: 'wifi',         label: 'Portable WiFi',         perDay: 500,  once: false },
    { key: 'roof_tent',    label: 'Rooftop tent',          perDay: 2500, once: false, classes: ['suv4x4', 'safari', 'pickup'] },
    { key: 'fridge',       label: 'Car fridge',            perDay: 1500, once: false, classes: ['suv4x4', 'safari', 'pickup'] },
    { key: 'recovery',     label: 'Recovery kit & 2nd spare', perDay: 0, once: true, flat: 3500, classes: ['suv4x4', 'safari', 'pickup'] },
    { key: 'crossborder',  label: 'Cross-border permit (COMESA)', perDay: 0, once: true, flat: 12000 }
  ];

  const DELIVERY = {
    depot:    { label: 'Collect from depot', fee: 0 },
    metro:    { label: 'Delivered in town',  fee: 1000 },
    airport:  { label: 'Airport handover',   fee: 1500 },
    upcountry:{ label: 'Upcountry delivery', fee: 4500 }
  };

  /* Duration discount. Published operator cards cluster at 15–30%
     for seven days and up; monthly rates fall further. */
  function durationDiscount(days) {
    if (days >= 30) return { pct: 0.30, label: 'Monthly rate' };
    if (days >= 14) return { pct: 0.24, label: '2-week rate' };
    if (days >= 7)  return { pct: 0.18, label: 'Weekly rate' };
    if (days >= 3)  return { pct: 0.08, label: '3-day rate' };
    return { pct: 0, label: null };
  }

  function quote(opts) {
    const v = opts.vehicle;
    const days = Math.max(1, opts.days || 1);
    const season = seasonFor(opts.date || new Date());
    const route = ROUTE_BY_KEY[opts.routeKey] || ROUTE_BY_KEY.metro;
    const lines = [];

    /* Base */
    const gross = v.day_rate * days;
    lines.push({ key: 'base', label: `${v.make} ${v.model}`,
      detail: `${KES(v.day_rate)} × ${days} ${days === 1 ? 'day' : 'days'}`, amount: gross });

    /* Duration discount */
    const dd = durationDiscount(days);
    let subtotal = gross;
    if (dd.pct > 0) {
      const cut = Math.round(gross * dd.pct);
      lines.push({ key: 'duration', label: dd.label,
        detail: `${Math.round(dd.pct * 100)}% off for ${days} days`, amount: -cut, good: true });
      subtotal -= cut;
    }

    /* Seasonal uplift */
    if (season.peak) {
      const up = (v.peak_uplift || 2000) * days;
      lines.push({ key: 'season', label: season.label,
        detail: `${KES(v.peak_uplift || 2000)}/day in ${season.label.toLowerCase()}`, amount: up });
      subtotal += up;
    }

    /* Chauffeur */
    if (opts.chauffeur) {
      const upcountry = !['metro', 'highway', 'coast'].includes(route.key);
      const rate = upcountry ? (v.chauffeur_upcountry || 5000) : (v.chauffeur_metro || 2500);
      const amt = rate * days;
      lines.push({ key: 'chauffeur', label: 'Professional driver',
        detail: upcountry
          ? `${KES(rate)}/day upcountry, meals and lodging included`
          : `${KES(rate)}/day, 06:00–19:00`,
        amount: amt });
      subtotal += amt;
    }

    /* Insurance */
    const ins = INSURANCE[opts.insurance || 'basic'];
    if (ins.perDay > 0) {
      const amt = ins.perDay * days;
      lines.push({ key: 'insurance', label: ins.label,
        detail: `${KES(ins.perDay)}/day · ${ins.blurb}`, amount: amt });
      subtotal += amt;
    } else {
      lines.push({ key: 'insurance', label: ins.label,
        detail: ins.blurb, amount: 0, included: true });
    }

    /* Delivery */
    const del = DELIVERY[opts.delivery || 'depot'];
    if (del.fee > 0) {
      lines.push({ key: 'delivery', label: del.label, detail: 'One-off handover fee', amount: del.fee });
      subtotal += del.fee;
    }

    /* Extras */
    (opts.extras || []).forEach(k => {
      const e = EXTRAS.find(x => x.key === k);
      if (!e) return;
      const amt = e.once ? (e.flat || 0) : e.perDay * days;
      lines.push({ key: 'extra_' + k, label: e.label,
        detail: e.once ? 'One-off' : `${KES(e.perDay)}/day`, amount: amt });
      subtotal += amt;
    });

    /* Cabana takes nothing from the operator. State it as a line so
       the zero is visible rather than merely claimed. */
    lines.push({ key: 'commission', label: 'Cabana commission',
      detail: 'The operator keeps every shilling above', amount: 0, good: true });

    const total = Math.round(subtotal);
    const deposit = Math.round((v.deposit || 20000) * ins.deposit);

    return {
      lines, total, deposit, days, season, route,
      insurance: ins,
      payAtCounter: 0,
      fuelPolicy: v.fuel_policy || 'full_to_full',
      perDayEffective: Math.round(total / days)
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     6 · LAUNCH CATALOGUE
     Real vehicles at real 2026 Kenyan market rates, with measured
     specs. This is the seed the page falls back to when the
     car_fleet table is empty or unreachable — not placeholder data.
     Every clearance figure is the manufacturer's published spec.
     ═══════════════════════════════════════════════════════════════ */
  /* No seed catalogue. This marketplace shows real vehicles from real
     verified operators or it shows nothing. Inventing demo cars would
     mean quoting prices nobody agreed to honour. */
  const OPERATORS = [];
  const FLEET = [];

  /* Cities people actually collect a car in. Nothing is preselected;
     the list exists so a guest can say where they are, not so we can
     guess for them. */
  const CITIES = [
    { key: 'nairobi',   label: 'Nairobi',            hint: 'JKIA, Wilson, city depots' },
    { key: 'mombasa',   label: 'Mombasa',            hint: 'Moi International, Nyali' },
    { key: 'diani',     label: 'Diani & South Coast', hint: 'Ukunda airstrip' },
    { key: 'malindi',   label: 'Malindi & Watamu',   hint: 'Malindi airport' },
    { key: 'kisumu',    label: 'Kisumu',             hint: 'Kisumu International' },
    { key: 'nakuru',    label: 'Nakuru',             hint: 'Town depots' },
    { key: 'naivasha',  label: 'Naivasha',           hint: 'Moi South Lake Road' },
    { key: 'nanyuki',   label: 'Nanyuki',            hint: 'Gateway to Mount Kenya' },
    { key: 'eldoret',   label: 'Eldoret',            hint: 'Eldoret International' },
    { key: 'kilifi',    label: 'Kilifi',             hint: 'Town depots' }
  ];

  const CLASSES = [
    { key: 'all',       label: 'Everything' },
    { key: 'economy',   label: 'Economy' },
    { key: 'compact',   label: 'Saloon' },
    { key: 'crossover', label: 'Crossover' },
    { key: 'suv4x4',    label: '4×4' },
    { key: 'safari',    label: 'Safari-built' },
    { key: 'van',       label: 'Group & van' },
    { key: 'pickup',    label: 'Pickup' },
    { key: 'luxury',    label: 'Executive' }
  ];

  /* ═══════════════════════════════════════════════════════════════
     7 · LOADER
     Prefer live inventory. Fall back to the launch catalogue so the
     page is never empty, and say which one is on screen.
     ═══════════════════════════════════════════════════════════════ */
  async function loadFleet(sb) {
    if (!sb) return { source: 'empty', fleet: [], operators: [], error: 'offline' };
    try {
      const { data: veh, error: e1 } = await sb
        .from('car_fleet').select('*').eq('status', 'active').limit(200);
      if (e1) throw e1;
      const { data: ops } = await sb.from('car_operators').select('*').eq('verified', true);
      return {
        source: (veh && veh.length) ? 'live' : 'empty',
        fleet: (veh || []).map(r => ({
          ...r,
          /* Column is ground_clearance_mm; the route engine grades on
             clearance_mm. Unmapped, every comparison is NaN and a saloon
             grades clear for the Mara. */
          clearance_mm: r.ground_clearance_mm,
          day_rate: fromMinor(r.day_rate),
          deposit: fromMinor(r.deposit),
          peak_uplift: fromMinor(r.peak_uplift),
          chauffeur_metro: fromMinor(r.chauffeur_uplift_metro),
          chauffeur_upcountry: fromMinor(r.chauffeur_uplift_upcountry)
        })),
        operators: ops || []
      };
    } catch (err) {
      return { source: 'error', fleet: [], operators: [], error: String(err.message || err) };
    }
  }

  /* ── EXPORT ──────────────────────────────────────────────────── */
  global.CabanaCarHire = {
    KES, toMinor, fromMinor,
    ROUTES, ROUTE_BY_KEY, CLASSES, CITIES, DRIVE_LABEL, INSURANCE, EXTRAS, DELIVERY,
    FLEET, OPERATORS,
    seasonFor, grade, quote, durationDiscount, silhouette, loadFleet
  };
})(window);
