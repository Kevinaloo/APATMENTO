/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · FARE ENGINE  v1
   ───────────────────────────────────────────────────────────────────────────
   One file. Every price on the site comes from here: the rider quote, the
   driver earnings preview, the chauffeur day rate, the fixed airport routes.

   Why a local engine instead of a routing API:

     A metered quote needs two numbers, distance and duration. A routing API
     gives both, but it also gives a per-request cost, a key to leak, a
     rate limit, and a dependency that fails at 2am when a traveller has
     just landed at JKIA. Nairobi is a known city with a known road grid and
     famously predictable traffic. So we model it.

       distance = great-circle × road factor (1.32 for the Nairobi grid)
       duration = distance ÷ speed for the hour of day the ride starts

     The result is an estimate, and we call it an estimate. The driver's
     meter is the record. What matters is that the rider sees a number
     before they move, and that the number is close.

   Pricing is the published tariff. No hidden multipliers, no silent surge.
   A demand multiplier exists, it is capped at 1.5×, it is shown as its own
   line on the receipt, and it never touches a fixed route or a pre-booking.

   Public API:
     CabFare.TARIFFS                    tariff table, keyed by class
     CabFare.CLASSES                    ordered class list for UI
     CabFare.PLACES                     Nairobi gazetteer
     CabFare.FIXED                      fixed-price transfer routes
     CabFare.CHAUFFEUR                  hourly and day packages
     CabFare.lookup(text)               fuzzy place match, returns place or null
     CabFare.suggest(text, limit)       autocomplete list
     CabFare.nearest(lat, lng)          closest known place
     CabFare.km(a, b)                   great-circle km between two points
     CabFare.roadKm(a, b)               road-adjusted km
     CabFare.minutes(km, whenDate)      duration estimate for that departure
     CabFare.fixedRoute(from, to)       matching fixed route or null
     CabFare.quote(opts)                the receipt
     CabFare.chauffeurQuote(pkgId, cls) chauffeur receipt
     CabFare.money(n)                   'KSh 1,240'

   Idempotent, dependency free, safe to load on any page.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabFare) return;

  /* ── 1 · TARIFF ───────────────────────────────────────────────────────────
     Economy is the published reference tariff. Every other class is a
     deliberate step up from it, not a random number: more space, newer
     vehicle, a driver held to a higher standard, so a higher rate.
     All figures in KES. min_fare is what a very short trip costs. */

  var TARIFFS = {
    economy: {
      key: 'economy', label: 'Economy', seats: 4,
      base: 100, perKm: 50, perMin: 3, minFare: 250,
      blurb: 'Saloon or hatchback. The everyday way across town.',
      vehicle: 'Toyota Axio, Fielder, Vitz or similar',
      icon: 'car'
    },
    comfort: {
      key: 'comfort', label: 'Comfort', seats: 4,
      base: 150, perKm: 68, perMin: 4, minFare: 400,
      blurb: 'Newer, roomier cars. More boot space, quieter ride.',
      vehicle: 'Toyota Premio, Mark X, Harrier or similar',
      icon: 'car-comfort'
    },
    executive: {
      key: 'executive', label: 'Executive', seats: 3,
      base: 300, perKm: 110, perMin: 7, minFare: 900,
      blurb: 'Black-plate executive saloons and a driver in uniform.',
      vehicle: 'Mercedes E-Class, BMW 5 Series, Prado or similar',
      icon: 'exec'
    },
    van: {
      key: 'van', label: 'Group van', seats: 7,
      base: 250, perKm: 90, perMin: 5, minFare: 700,
      blurb: 'Seven seats and real luggage room. Teams, families, safaris.',
      vehicle: 'Toyota Noah, Voxy, Alphard or 9-seat tour van',
      icon: 'van'
    },
    shared: {
      key: 'shared', label: 'Shared', seats: 1,
      base: 60, perKm: 28, perMin: 2, minFare: 150,
      blurb: 'One seat, up to two other riders going your way. Priced per seat.',
      vehicle: 'Comfort-class car, one seat reserved for you',
      icon: 'shared',
      note: 'Runs on high-traffic corridors during the morning and evening peak.'
    }
  };

  var CLASSES = ['economy', 'comfort', 'executive', 'van', 'shared'];

  /* Surcharges. Published, capped, and shown as their own receipt lines. */
  var RULES = {
    airportPickup: 200,      // JKIA or Wilson pickup: parking, access fee, wait
    nightPct: 18,            // 22:00 to 05:00
    nightFrom: 22,
    nightTo: 5,
    demandCap: 1.5,          // hard ceiling. never exceeded, ever
    demandFloor: 1.2,        // below this we do not apply it at all
    platformFeePct: 10,      // what Cabana keeps. the driver keeps the rest
    waitFreeMin: 5,          // free waiting at pickup
    waitPerMin: 4,
    airportWaitFreeMin: 60,  // arrivals hall. flights are late, that is not your fault
    cancelFreeMin: 3,
    returnLegPct: 60,       // out-of-town: the driver drives home empty
    roadFactor: 1.32,        // great-circle to Nairobi road distance
    highwayFactor: 1.18      // long inter-town runs follow straighter roads
  };

  /* ── 2 · GAZETTEER ────────────────────────────────────────────────────────
     Real coordinates for the places Nairobi riders actually name. Tagged so
     the engine knows an airport pickup when it sees one, and so autocomplete
     can rank a mall above a suburb when both match.                          */

  var PLACES = [
    // airports and terminals
    { n: 'JKIA (Jomo Kenyatta International Airport)', a: ['jkia', 'jomo kenyatta', 'airport', 'nbo'], lat: -1.3192, lng: 36.9278, t: 'airport' },
    { n: 'Wilson Airport', a: ['wilson'], lat: -1.3218, lng: 36.8148, t: 'airport' },
    { n: 'Nairobi Terminus (SGR, Syokimau)', a: ['sgr', 'madaraka express', 'terminus'], lat: -1.3810, lng: 36.9160, t: 'transport' },
    { n: 'Nairobi Railway Station', a: ['railway'], lat: -1.2890, lng: 36.8280, t: 'transport' },
    { n: 'Green Park Terminus', a: ['green park'], lat: -1.2960, lng: 36.8250, t: 'transport' },

    // city core
    { n: 'Nairobi CBD', a: ['cbd', 'town', 'city centre', 'city center'], lat: -1.2864, lng: 36.8230, t: 'area' },
    { n: 'KICC', a: ['kicc', 'conference centre'], lat: -1.2889, lng: 36.8233, t: 'landmark' },
    { n: 'Upper Hill', a: ['upperhill', 'upper hill'], lat: -1.2990, lng: 36.8150, t: 'area' },
    { n: 'Community, Ngong Road', a: ['community'], lat: -1.2985, lng: 36.8110, t: 'area' },

    // west and north west
    { n: 'Westlands', a: ['westlands', 'westie'], lat: -1.2673, lng: 36.8065, t: 'area' },
    { n: 'Parklands', a: ['parklands'], lat: -1.2620, lng: 36.8180, t: 'area' },
    { n: 'Kilimani', a: ['kilimani'], lat: -1.2921, lng: 36.7844, t: 'area' },
    { n: 'Kileleshwa', a: ['kileleshwa'], lat: -1.2830, lng: 36.7810, t: 'area' },
    { n: 'Lavington', a: ['lavington'], lat: -1.2799, lng: 36.7686, t: 'area' },
    { n: 'Riverside Drive', a: ['riverside'], lat: -1.2740, lng: 36.7970, t: 'area' },
    { n: 'Spring Valley', a: ['spring valley'], lat: -1.2560, lng: 36.7860, t: 'area' },
    { n: 'Loresho', a: ['loresho'], lat: -1.2540, lng: 36.7600, t: 'area' },
    { n: 'Kitisuru', a: ['kitisuru'], lat: -1.2380, lng: 36.7770, t: 'area' },
    { n: 'Gigiri', a: ['gigiri', 'un', 'unon'], lat: -1.2350, lng: 36.8090, t: 'area' },
    { n: 'Runda', a: ['runda'], lat: -1.2196, lng: 36.8080, t: 'area' },
    { n: 'Muthaiga', a: ['muthaiga'], lat: -1.2530, lng: 36.8340, t: 'area' },
    { n: 'Ridgeways', a: ['ridgeways'], lat: -1.2160, lng: 36.8420, t: 'area' },
    { n: 'Ruaka', a: ['ruaka'], lat: -1.2010, lng: 36.7830, t: 'area' },
    { n: 'Nyari', a: ['nyari'], lat: -1.2300, lng: 36.7930, t: 'area' },

    // south and south west
    { n: 'Karen', a: ['karen'], lat: -1.3196, lng: 36.7076, t: 'area' },
    { n: 'Langata', a: ['langata', "lang'ata"], lat: -1.3420, lng: 36.7500, t: 'area' },
    { n: 'Ngong Road', a: ['ngong road'], lat: -1.3020, lng: 36.7690, t: 'area' },
    { n: 'Hardy, Karen', a: ['hardy'], lat: -1.3560, lng: 36.7180, t: 'area' },
    { n: 'Bomas of Kenya', a: ['bomas'], lat: -1.3480, lng: 36.7570, t: 'landmark' },
    { n: 'South B', a: ['south b'], lat: -1.3110, lng: 36.8340, t: 'area' },
    { n: 'South C', a: ['south c'], lat: -1.3220, lng: 36.8290, t: 'area' },
    { n: 'Nairobi West', a: ['nairobi west'], lat: -1.3150, lng: 36.8180, t: 'area' },
    { n: 'Madaraka', a: ['madaraka'], lat: -1.3060, lng: 36.8240, t: 'area' },

    // east
    { n: 'Embakasi', a: ['embakasi'], lat: -1.3170, lng: 36.8940, t: 'area' },
    { n: 'Syokimau', a: ['syokimau'], lat: -1.3690, lng: 36.9330, t: 'area' },
    { n: 'Donholm', a: ['donholm', 'doonholm'], lat: -1.2930, lng: 36.8880, t: 'area' },
    { n: 'Buruburu', a: ['buruburu', 'buru buru'], lat: -1.2870, lng: 36.8720, t: 'area' },
    { n: 'Eastleigh', a: ['eastleigh'], lat: -1.2740, lng: 36.8480, t: 'area' },
    { n: 'Umoja', a: ['umoja'], lat: -1.2810, lng: 36.8970, t: 'area' },
    { n: 'Utawala', a: ['utawala'], lat: -1.2790, lng: 36.9450, t: 'area' },

    // north and Thika Road
    { n: 'Kasarani', a: ['kasarani'], lat: -1.2200, lng: 36.8960, t: 'area' },
    { n: 'Roysambu', a: ['roysambu'], lat: -1.2200, lng: 36.8890, t: 'area' },
    { n: 'Kahawa Sukari', a: ['kahawa'], lat: -1.1830, lng: 36.9200, t: 'area' },
    { n: 'Zimmerman', a: ['zimmerman'], lat: -1.2140, lng: 36.8930, t: 'area' },
    { n: 'Githurai', a: ['githurai'], lat: -1.1940, lng: 36.9210, t: 'area' },

    // malls and hubs
    { n: 'Two Rivers Mall', a: ['two rivers'], lat: -1.2110, lng: 36.8020, t: 'mall' },
    { n: 'Village Market', a: ['village market'], lat: -1.2290, lng: 36.8030, t: 'mall' },
    { n: 'Sarit Centre', a: ['sarit'], lat: -1.2610, lng: 36.8030, t: 'mall' },
    { n: 'Westgate Mall', a: ['westgate'], lat: -1.2570, lng: 36.8030, t: 'mall' },
    { n: 'Yaya Centre', a: ['yaya'], lat: -1.2930, lng: 36.7830, t: 'mall' },
    { n: 'The Junction Mall', a: ['junction'], lat: -1.2990, lng: 36.7660, t: 'mall' },
    { n: 'Galleria Mall', a: ['galleria'], lat: -1.3350, lng: 36.7580, t: 'mall' },
    { n: 'The Hub Karen', a: ['the hub', 'hub karen'], lat: -1.3340, lng: 36.7100, t: 'mall' },
    { n: 'Garden City Mall', a: ['garden city'], lat: -1.2340, lng: 36.8770, t: 'mall' },
    { n: 'Thika Road Mall', a: ['trm', 'thika road mall'], lat: -1.2200, lng: 36.8880, t: 'mall' },
    { n: 'Prestige Plaza, Ngong Road', a: ['prestige'], lat: -1.2990, lng: 36.7810, t: 'mall' },

    // hotels and hospitals
    { n: 'Sarova Stanley', a: ['stanley', 'sarova'], lat: -1.2840, lng: 36.8210, t: 'hotel' },
    { n: 'Villa Rosa Kempinski', a: ['kempinski', 'villa rosa'], lat: -1.2670, lng: 36.8020, t: 'hotel' },
    { n: 'Nairobi Serena Hotel', a: ['serena'], lat: -1.2920, lng: 36.8140, t: 'hotel' },
    { n: 'Radisson Blu Upper Hill', a: ['radisson'], lat: -1.2960, lng: 36.8130, t: 'hotel' },
    { n: 'Emara Ole Sereni', a: ['ole sereni', 'emara'], lat: -1.3320, lng: 36.8480, t: 'hotel' },
    { n: 'Trademark Hotel, Gigiri', a: ['trademark'], lat: -1.2280, lng: 36.8010, t: 'hotel' },
    { n: 'Nairobi Hospital', a: ['nairobi hospital'], lat: -1.2980, lng: 36.8090, t: 'hospital' },
    { n: 'Aga Khan University Hospital', a: ['aga khan'], lat: -1.2630, lng: 36.8180, t: 'hospital' },
    { n: 'Kenyatta National Hospital', a: ['knh', 'kenyatta hospital'], lat: -1.3010, lng: 36.8060, t: 'hospital' },

    // universities
    { n: 'University of Nairobi, Main Campus', a: ['uon', 'university of nairobi'], lat: -1.2790, lng: 36.8170, t: 'campus' },
    { n: 'Strathmore University', a: ['strathmore'], lat: -1.3100, lng: 36.8130, t: 'campus' },
    { n: 'USIU Africa', a: ['usiu'], lat: -1.2200, lng: 36.8830, t: 'campus' },

    // parks and visitor sites
    { n: 'Nairobi National Park, Main Gate', a: ['national park', 'nairobi park'], lat: -1.3660, lng: 36.8320, t: 'landmark' },
    { n: 'Giraffe Centre', a: ['giraffe'], lat: -1.3750, lng: 36.7440, t: 'landmark' },
    { n: 'Karen Blixen Museum', a: ['blixen'], lat: -1.3510, lng: 36.7160, t: 'landmark' },
    { n: 'David Sheldrick Wildlife Trust', a: ['sheldrick', 'elephant orphanage'], lat: -1.3730, lng: 36.7900, t: 'landmark' },

    // satellite towns
    { n: 'Ongata Rongai', a: ['rongai'], lat: -1.3960, lng: 36.7480, t: 'town' },
    { n: 'Ngong Town', a: ['ngong town'], lat: -1.3590, lng: 36.6560, t: 'town' },
    { n: 'Kikuyu', a: ['kikuyu'], lat: -1.2460, lng: 36.6630, t: 'town' },
    { n: 'Kiambu Town', a: ['kiambu'], lat: -1.1710, lng: 36.8350, t: 'town' },
    { n: 'Limuru', a: ['limuru'], lat: -1.1110, lng: 36.6420, t: 'town' },
    { n: 'Juja', a: ['juja'], lat: -1.1030, lng: 37.0140, t: 'town' },
    { n: 'Thika Town', a: ['thika'], lat: -1.0390, lng: 37.0690, t: 'town' },
    { n: 'Kitengela', a: ['kitengela'], lat: -1.4780, lng: 36.9580, t: 'town' },
    { n: 'Athi River', a: ['athi river', 'mavoko'], lat: -1.4560, lng: 36.9780, t: 'town' },
    { n: 'Machakos', a: ['machakos'], lat: -1.5180, lng: 37.2660, t: 'town' },

    // long distance
    { n: 'Naivasha', a: ['naivasha'], lat: -0.7170, lng: 36.4310, t: 'longhaul' },
    { n: 'Nakuru', a: ['nakuru'], lat: -0.3030, lng: 36.0800, t: 'longhaul' },
    { n: 'Nanyuki', a: ['nanyuki'], lat: 0.0170, lng: 37.0730, t: 'longhaul' },
    { n: 'Nyeri', a: ['nyeri'], lat: -0.4200, lng: 36.9480, t: 'longhaul' },
    { n: 'Amboseli National Park', a: ['amboseli'], lat: -2.6527, lng: 37.2606, t: 'longhaul' },
    { n: 'Maasai Mara, Sekenani Gate', a: ['maasai mara', 'masai mara', 'mara'], lat: -1.4090, lng: 35.2200, t: 'longhaul' },
    { n: 'Namanga Border', a: ['namanga'], lat: -2.5450, lng: 36.7900, t: 'longhaul' },
    { n: 'Mombasa', a: ['mombasa'], lat: -4.0435, lng: 39.6682, t: 'longhaul' },
    { n: 'Kisumu', a: ['kisumu'], lat: -0.0917, lng: 34.7680, t: 'longhaul' },
    { n: 'Eldoret', a: ['eldoret'], lat: 0.5140, lng: 35.2700, t: 'longhaul' }
  ];

  /* ── 3 · FIXED-PRICE TRANSFERS ────────────────────────────────────────────
     One number, agreed before the flight. No meter, no traffic risk, no
     surge. The rider carries none of the uncertainty, which is the entire
     point of buying a transfer instead of hailing a car.                     */

  var FIXED = [
    { id: 'jkia-cbd', from: 'JKIA', to: 'Nairobi CBD', cls: 'comfort', price: 900, min: 45, note: 'Includes 60 minutes of arrivals waiting.' },
    { id: 'jkia-westlands', from: 'JKIA', to: 'Westlands', cls: 'comfort', price: 1500, min: 55, note: 'Includes 60 minutes of arrivals waiting.' },
    { id: 'jkia-karen', from: 'JKIA', to: 'Karen', cls: 'comfort', price: 2200, min: 70, note: 'Includes 60 minutes of arrivals waiting.' },
    { id: 'jkia-gigiri', from: 'JKIA', to: 'Gigiri or Runda', cls: 'comfort', price: 2400, min: 70, note: 'Diplomatic quarter. Gate access confirmed in advance.' },
    { id: 'jkia-kilimani', from: 'JKIA', to: 'Kilimani or Kileleshwa', cls: 'comfort', price: 1700, min: 55, note: 'Includes 60 minutes of arrivals waiting.' },
    { id: 'jkia-upperhill', from: 'JKIA', to: 'Upper Hill', cls: 'comfort', price: 1400, min: 50, note: 'Includes 60 minutes of arrivals waiting.' },
    { id: 'jkia-syokimau', from: 'JKIA', to: 'Syokimau or SGR Terminus', cls: 'economy', price: 900, min: 25, note: 'Train connection. Driver tracks your arrival.' },
    { id: 'wilson-cbd', from: 'Wilson Airport', to: 'Nairobi CBD', cls: 'comfort', price: 1100, min: 30, note: 'Safari connections and domestic charters.' },
    { id: 'jkia-exec', from: 'JKIA', to: 'Anywhere in Nairobi', cls: 'executive', price: 4500, min: 70, note: 'Executive saloon, uniformed driver, meet and greet with name board.' },
    { id: 'jkia-van', from: 'JKIA', to: 'Anywhere in Nairobi', cls: 'van', price: 3800, min: 70, note: 'Seven seats. Built for a family or a crew with luggage.' },
    { id: 'nbo-naivasha', from: 'Nairobi', to: 'Naivasha', cls: 'comfort', price: 11000, min: 150, note: 'One way. Driver waits at no extra cost for up to 30 minutes.' },
    { id: 'nbo-amboseli', from: 'Nairobi', to: 'Amboseli', cls: 'van', price: 24000, min: 260, note: 'One way, park entry not included.' },
    { id: 'nbo-mara', from: 'Nairobi', to: 'Maasai Mara', cls: 'van', price: 34000, min: 330, note: 'One way, 4x4 recommended in the wet season.' }
  ];

  /* ── 4 · PRIVATE CHAUFFEUR ────────────────────────────────────────────────
     A chauffeur is not a ride. The rider is buying a driver's whole block of
     time and the car stays with them: meetings, site visits, a wedding, a
     roadshow, a parent visiting for a week. Priced by the hour with a real
     minimum, because a driver cannot fill the gaps around a two-hour job.   */

  var CHAUFFEUR = [
    {
      id: 'half-day', label: 'Half day', hours: 5, km: 80,
      rates: { comfort: 11000, executive: 19000, van: 15000 },
      blurb: 'Five hours with the car and driver held for you.',
      best: 'Meetings across town, a shoot, a half-day of viewings.'
    },
    {
      id: 'full-day', label: 'Full day', hours: 10, km: 150,
      rates: { comfort: 19000, executive: 33000, van: 26000 },
      blurb: 'Ten hours, the standard corporate day.',
      best: 'Conferences, delegations, a full day of site visits.',
      featured: true
    },
    {
      id: 'hourly', label: 'By the hour', hours: 3, km: 45,
      rates: { comfort: 2600, executive: 4400, van: 3400 },
      perHour: true,
      blurb: 'Three-hour minimum, then billed by the hour.',
      best: 'An airport run with a stop, a short errand block.'
    },
    {
      id: 'weekly', label: 'Weekly retainer', hours: 50, km: 750,
      rates: { comfort: 82000, executive: 145000, van: 115000 },
      blurb: 'Five ten-hour days with the same driver every day.',
      best: 'Visiting executives, long assignments, family stays.'
    }
  ];

  var CHAUFFEUR_INCLUDES = [
    'Fuel, tolls and parking inside Nairobi',
    'A driver you keep for the whole booking, not a new face each trip',
    'Bottled water, phone charging and wifi in executive vehicles',
    'Driver waiting time, at no extra charge, inside your booked hours'
  ];
  var CHAUFFEUR_EXTRAS = [
    { label: 'Each hour past your package', value: 'Charged at the package hourly rate' },
    { label: 'Distance past the included kilometres', value: 'KSh 45 per km, comfort and van. KSh 90 per km, executive' },
    { label: 'Travel outside Nairobi County', value: 'Driver overnight allowance of KSh 3,500 per night' },
    { label: 'Airport meet and greet with name board', value: 'Included on executive, KSh 500 elsewhere' }
  ];

  /* ── 5 · GEOMETRY ─────────────────────────────────────────────────────── */

  function rad(d) { return d * Math.PI / 180; }

  function km(a, b) {
    if (!a || !b) return 0;
    var dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  function roadKm(a, b) {
    var d = km(a, b);
    var f = d > 45 ? RULES.highwayFactor : RULES.roadFactor;
    return Math.round(d * f * 10) / 10;
  }

  /* Nairobi average speeds by hour. These are not guesses, they are what the
     city actually does: two hard peaks, a slow midday, and a fast night. */
  function citySpeed(hour, isWeekend) {
    if (isWeekend) {
      if (hour >= 23 || hour < 7) return 45;
      if (hour >= 11 && hour < 19) return 26;
      return 34;
    }
    if (hour >= 23 || hour < 6) return 44;
    if (hour >= 6 && hour < 7) return 30;
    if (hour >= 7 && hour < 10) return 14;   // morning peak
    if (hour >= 10 && hour < 16) return 24;
    if (hour >= 16 && hour < 20) return 13;  // evening peak, the worst of it
    return 32;
  }

  function minutes(distanceKm, when) {
    var d = when instanceof Date ? when : new Date();
    var hour = d.getHours();
    var weekend = d.getDay() === 0 || d.getDay() === 6;
    if (distanceKm > 45) {
      // long haul: the first 20 km is city crawl, the rest is highway
      var cityPart = Math.min(distanceKm, 20);
      var hwyPart = distanceKm - cityPart;
      return Math.max(1, Math.round(cityPart / citySpeed(hour, weekend) * 60 + hwyPart / 78 * 60));
    }
    return Math.max(1, Math.round(distanceKm / citySpeed(hour, weekend) * 60));
  }

  /* ── 6 · PLACE LOOKUP ─────────────────────────────────────────────────── */

  var TYPE_RANK = { airport: 0, transport: 1, mall: 2, hotel: 2, area: 3, landmark: 4, hospital: 4, campus: 4, town: 5, longhaul: 6 };

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function suggest(text, limit) {
    var q = norm(text);
    if (!q) return [];
    var out = [];
    for (var i = 0; i < PLACES.length; i++) {
      var p = PLACES[i];
      var name = norm(p.n);
      var score = -1;
      if (name.indexOf(q) === 0) score = 0;
      else if (name.indexOf(q) > -1) score = 2;
      if (p.a) {
        for (var j = 0; j < p.a.length; j++) {
          var al = norm(p.a[j]);
          if (al.indexOf(q) === 0) score = score < 0 ? 1 : Math.min(score, 1);
          else if (al.indexOf(q) > -1 && score < 0) score = 3;
        }
      }
      if (score > -1) out.push({ p: p, s: score * 10 + (TYPE_RANK[p.t] || 5) });
    }
    out.sort(function (a, b) { return a.s - b.s; });
    return out.slice(0, limit || 6).map(function (o) { return o.p; });
  }

  function lookup(text) {
    var r = suggest(text, 1);
    return r.length ? r[0] : null;
  }

  function nearest(lat, lng) {
    var best = null, bestD = Infinity, ref = { lat: lat, lng: lng };
    for (var i = 0; i < PLACES.length; i++) {
      if (PLACES[i].t === 'longhaul') continue;
      var d = km(ref, PLACES[i]);
      if (d < bestD) { bestD = d; best = PLACES[i]; }
    }
    return best ? { place: best, km: Math.round(bestD * 10) / 10 } : null;
  }

  function isAirport(p) { return !!p && p.t === 'airport'; }

  /* ── 7 · FIXED ROUTE MATCHING ─────────────────────────────────────────── */

  var FIXED_MATCH = {
    'jkia-cbd': ['nairobi cbd', 'kicc', 'nairobi railway station', 'green park terminus'],
    'jkia-westlands': ['westlands', 'parklands', 'sarit centre', 'westgate mall', 'riverside drive'],
    'jkia-karen': ['karen', 'hardy, karen', 'the hub karen', 'langata', 'karen blixen museum'],
    'jkia-gigiri': ['gigiri', 'runda', 'village market', 'two rivers mall', 'muthaiga', 'nyari', 'kitisuru'],
    'jkia-kilimani': ['kilimani', 'kileleshwa', 'lavington', 'yaya centre', 'ngong road'],
    'jkia-upperhill': ['upper hill', 'nairobi hospital', 'community, ngong road', 'radisson blu upper hill'],
    'jkia-syokimau': ['syokimau', 'nairobi terminus (sgr, syokimau)', 'embakasi'],
    'wilson-cbd': ['nairobi cbd', 'kicc', 'upper hill']
  };

  /* Nairobi to out-of-town. Sold as a fixed price because the real cost is the
     round trip: the driver comes back empty whether you pay for it or not. */
  var LONGHAUL_MATCH = {
    'nbo-naivasha': ['naivasha'],
    'nbo-amboseli': ['amboseli national park'],
    'nbo-mara':     ['maasai mara sekenani gate']
  };

  function fixedRoute(from, to, cls) {
    if (!from || !to) return null;
    var f = norm(from.n), t = norm(to.n);

    // out-of-town first: either direction counts, the return leg is the same
    var far = from.t === 'longhaul' ? f : (to.t === 'longhaul' ? t : null);
    if (far) {
      for (var lid in LONGHAUL_MATCH) {
        if (LONGHAUL_MATCH[lid].indexOf(far) > -1) {
          var lr = byId(lid);
          if (lr && (!cls || cls === lr.cls)) return lr;
        }
      }
      return null;
    }

    var origin = null;
    if (f.indexOf('jkia') > -1) origin = 'jkia';
    else if (t.indexOf('jkia') > -1) { origin = 'jkia'; t = f; }
    else if (f.indexOf('wilson') > -1) origin = 'wilson';
    else if (t.indexOf('wilson') > -1) { origin = 'wilson'; t = f; }
    if (!origin) return null;

    // class-wide airport products win for executive and van
    if (origin === 'jkia' && cls === 'executive') return byId('jkia-exec');
    if (origin === 'jkia' && cls === 'van') return byId('jkia-van');

    for (var id in FIXED_MATCH) {
      if (id.indexOf(origin) !== 0) continue;
      var list = FIXED_MATCH[id];
      for (var i = 0; i < list.length; i++) {
        if (t === list[i]) {
          var r = byId(id);
          if (!r) continue;
          if (cls && cls !== r.cls && cls !== 'shared') return null;
          return r;
        }
      }
    }
    return null;
  }

  function byId(id) {
    for (var i = 0; i < FIXED.length; i++) if (FIXED[i].id === id) return FIXED[i];
    return null;
  }

  /* ── 8 · THE QUOTE ────────────────────────────────────────────────────────
     Returns a receipt: an ordered list of lines the rider can read top to
     bottom and add up themselves. If they cannot add it up, we have failed.  */

  function quote(opts) {
    opts = opts || {};
    var cls = TARIFFS[opts.cls] ? opts.cls : 'economy';
    var t = TARIFFS[cls];
    var from = opts.from, to = opts.to;
    var when = opts.when instanceof Date ? opts.when : new Date();
    var demand = Number(opts.demand) || 1;

    if (!from || !to) return null;

    var d = typeof opts.km === 'number' ? opts.km : roadKm(from, to);
    var mins = typeof opts.minutes === 'number' ? opts.minutes : minutes(d, when);

    // Fixed route short-circuits the whole meter.
    var fx = fixedRoute(from, to, cls);
    if (fx) {
      return {
        kind: 'fixed', cls: cls, className: t.label, route: fx,
        km: d, minutes: fx.min || mins,
        lines: [{ label: 'Fixed transfer, ' + fx.from + ' to ' + fx.to, amount: fx.price, kind: 'fixed' }],
        subtotal: fx.price, total: fx.price,
        driverTakes: Math.round(fx.price * (100 - RULES.platformFeePct) / 100),
        platformFee: Math.round(fx.price * RULES.platformFeePct / 100),
        notes: [fx.note, 'Traffic, waiting and the route are already in this price.']
      };
    }

    var lines = [];
    var distanceCharge = Math.round(d * t.perKm);
    var timeCharge = Math.round(mins * t.perMin);

    lines.push({ label: 'Base fare', amount: t.base, kind: 'base' });
    lines.push({ label: 'Distance, ' + d.toFixed(1) + ' km at KSh ' + t.perKm, amount: distanceCharge, kind: 'distance' });
    lines.push({ label: 'Time, ' + mins + ' min at KSh ' + t.perMin, amount: timeCharge, kind: 'time' });

    var running = t.base + distanceCharge + timeCharge;
    var meterFloorApplied = false;
    if (running < t.minFare) {
      lines.push({ label: 'Minimum fare adjustment', amount: t.minFare - running, kind: 'floor' });
      running = t.minFare;
      meterFloorApplied = true;
    }

    if (isAirport(from)) {
      lines.push({ label: from.n.indexOf('Wilson') > -1 ? 'Wilson Airport pickup' : 'Airport pickup, parking and access', amount: RULES.airportPickup, kind: 'airport' });
      running += RULES.airportPickup;
    }

    /* Leaving Nairobi County means the driver drives back empty. Charging only
       the outbound leg would look cheaper and then quietly lose the driver
       money, so we print the return leg instead of hiding it. */
    if (from.t === 'longhaul' || to.t === 'longhaul') {
      var ret = Math.round(distanceCharge * RULES.returnLegPct / 100);
      lines.push({ label: 'Return leg, ' + RULES.returnLegPct + '% of distance, the driver comes back empty',
                   amount: ret, kind: 'return' });
      running += ret;
    }

    var h = when.getHours();
    var night = h >= RULES.nightFrom || h < RULES.nightTo;
    if (night) {
      var nightAmt = Math.round(running * RULES.nightPct / 100);
      lines.push({ label: 'Night rate, ' + RULES.nightPct + '% between 22:00 and 05:00', amount: nightAmt, kind: 'night' });
      running += nightAmt;
    }

    var demandApplied = 1;
    if (demand >= RULES.demandFloor) {
      demandApplied = Math.min(demand, RULES.demandCap);
      var demandAmt = Math.round(running * (demandApplied - 1));
      lines.push({ label: 'High demand, ' + demandApplied.toFixed(1) + 'x, capped at ' + RULES.demandCap + 'x', amount: demandAmt, kind: 'demand' });
      running += demandAmt;
    }

    var total = Math.round(running / 10) * 10; // settle to the nearest ten shillings

    var notes = [];
    if (meterFloorApplied) notes.push('Short trips are charged at the KSh ' + t.minFare + ' minimum for this class.');
    notes.push('The first ' + RULES.waitFreeMin + ' minutes of waiting at pickup are free, then KSh ' + RULES.waitPerMin + ' a minute.');
    if (night) notes.push('The night rate is published, not a surge. It does not change with demand.');
    if (demandApplied > 1) notes.push('You are seeing this price before you confirm. It will not move after you book.');

    return {
      kind: 'meter', cls: cls, className: t.label,
      km: d, minutes: mins, night: night, demand: demandApplied,
      lines: lines, subtotal: running, total: total,
      driverTakes: Math.round(total * (100 - RULES.platformFeePct) / 100),
      platformFee: Math.round(total * RULES.platformFeePct / 100),
      notes: notes
    };
  }

  function chauffeurQuote(pkgId, cls) {
    var pkg = null;
    for (var i = 0; i < CHAUFFEUR.length; i++) if (CHAUFFEUR[i].id === pkgId) pkg = CHAUFFEUR[i];
    if (!pkg) return null;
    var vehicle = pkg.rates[cls] ? cls : 'comfort';
    var rate = pkg.rates[vehicle];
    var total = pkg.perHour ? rate * pkg.hours : rate;
    return {
      kind: 'chauffeur', pkg: pkg, cls: vehicle, className: TARIFFS[vehicle].label,
      hours: pkg.hours, km: pkg.km, rate: rate, total: total,
      driverTakes: Math.round(total * (100 - RULES.platformFeePct) / 100),
      platformFee: Math.round(total * RULES.platformFeePct / 100)
    };
  }

  /* ── 9 · FORMAT ───────────────────────────────────────────────────────── */

  function money(n) {
    var v = Math.round(Number(n) || 0);
    return 'KSh ' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function num(n) {
    return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  global.CabFare = {
    TARIFFS: TARIFFS, CLASSES: CLASSES, RULES: RULES,
    PLACES: PLACES, FIXED: FIXED,
    CHAUFFEUR: CHAUFFEUR, CHAUFFEUR_INCLUDES: CHAUFFEUR_INCLUDES, CHAUFFEUR_EXTRAS: CHAUFFEUR_EXTRAS,
    km: km, roadKm: roadKm, minutes: minutes, citySpeed: citySpeed,
    lookup: lookup, suggest: suggest, nearest: nearest, isAirport: isAirport,
    fixedRoute: fixedRoute, fixedById: byId,
    quote: quote, chauffeurQuote: chauffeurQuote,
    money: money, num: num
  };
})(typeof window !== 'undefined' ? window : this);
