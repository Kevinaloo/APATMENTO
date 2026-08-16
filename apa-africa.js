/* apa-africa.js — continent coverage for partner listing flows.
 *
 * Single source of truth for: which countries a partner may list in,
 * what currency to default to, what phone prefix to show, and which
 * cities to offer before we hit the geocoder.
 *
 * Exposed as window.APA_AFRICA. No build step, no imports — the site
 * is plain script tags, so this matches.
 */
(function () {
  'use strict';

  /* All 54 UN-recognised African states.
   * iso   — ISO 3166-1 alpha-2, lowercased for Nominatim's countrycodes param
   * cur   — ISO 4217 default currency
   * dial  — E.164 calling prefix
   * cities— seed list for the typeahead; the geocoder handles everything else.
   *         Ordered by population/traveller relevance, not alphabetically.
   */
  var COUNTRIES = [
    { name: 'Algeria',       iso: 'dz', cur: 'DZD', dial: '+213', cities: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'] },
    { name: 'Angola',        iso: 'ao', cur: 'AOA', dial: '+244', cities: ['Luanda', 'Huambo', 'Lobito', 'Benguela', 'Lubango'] },
    { name: 'Benin',         iso: 'bj', cur: 'XOF', dial: '+229', cities: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi'] },
    { name: 'Botswana',      iso: 'bw', cur: 'BWP', dial: '+267', cities: ['Gaborone', 'Francistown', 'Maun', 'Kasane'] },
    { name: 'Burkina Faso',  iso: 'bf', cur: 'XOF', dial: '+226', cities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou'] },
    { name: 'Burundi',       iso: 'bi', cur: 'BIF', dial: '+257', cities: ['Bujumbura', 'Gitega', 'Ngozi'] },
    { name: 'Cabo Verde',    iso: 'cv', cur: 'CVE', dial: '+238', cities: ['Praia', 'Mindelo', 'Santa Maria', 'Espargos'] },
    { name: 'Cameroon',      iso: 'cm', cur: 'XAF', dial: '+237', cities: ['Douala', 'Yaoundé', 'Bamenda', 'Kribi', 'Buea'] },
    { name: 'Central African Republic', iso: 'cf', cur: 'XAF', dial: '+236', cities: ['Bangui', 'Bimbo', 'Berbérati'] },
    { name: 'Chad',          iso: 'td', cur: 'XAF', dial: '+235', cities: ['N\u2019Djamena', 'Moundou', 'Sarh'] },
    { name: 'Comoros',       iso: 'km', cur: 'KMF', dial: '+269', cities: ['Moroni', 'Mutsamudu', 'Fomboni'] },
    { name: 'Congo (Brazzaville)', iso: 'cg', cur: 'XAF', dial: '+242', cities: ['Brazzaville', 'Pointe-Noire', 'Dolisie'] },
    { name: 'Congo (Kinshasa)',    iso: 'cd', cur: 'CDF', dial: '+243', cities: ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Kisangani'] },
    { name: 'Côte d\u2019Ivoire',  iso: 'ci', cur: 'XOF', dial: '+225', cities: ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Grand-Bassam'] },
    { name: 'Djibouti',      iso: 'dj', cur: 'DJF', dial: '+253', cities: ['Djibouti City', 'Ali Sabieh', 'Tadjoura'] },
    { name: 'Egypt',         iso: 'eg', cur: 'EGP', dial: '+20',  cities: ['Cairo', 'Alexandria', 'Giza', 'Hurghada', 'Sharm El Sheikh', 'Luxor', 'Aswan'] },
    { name: 'Equatorial Guinea', iso: 'gq', cur: 'XAF', dial: '+240', cities: ['Malabo', 'Bata', 'Ebebiyin'] },
    { name: 'Eritrea',       iso: 'er', cur: 'ERN', dial: '+291', cities: ['Asmara', 'Massawa', 'Keren'] },
    { name: 'Eswatini',      iso: 'sz', cur: 'SZL', dial: '+268', cities: ['Mbabane', 'Manzini', 'Ezulwini'] },
    { name: 'Ethiopia',      iso: 'et', cur: 'ETB', dial: '+251', cities: ['Addis Ababa', 'Bahir Dar', 'Gondar', 'Lalibela', 'Hawassa', 'Dire Dawa'] },
    { name: 'Gabon',         iso: 'ga', cur: 'XAF', dial: '+241', cities: ['Libreville', 'Port-Gentil', 'Franceville'] },
    { name: 'Gambia',        iso: 'gm', cur: 'GMD', dial: '+220', cities: ['Banjul', 'Serrekunda', 'Bakau', 'Kololi'] },
    { name: 'Ghana',         iso: 'gh', cur: 'GHS', dial: '+233', cities: ['Accra', 'Kumasi', 'Takoradi', 'Cape Coast', 'Tamale', 'Ho'] },
    { name: 'Guinea',        iso: 'gn', cur: 'GNF', dial: '+224', cities: ['Conakry', 'Kankan', 'Labé'] },
    { name: 'Guinea-Bissau', iso: 'gw', cur: 'XOF', dial: '+245', cities: ['Bissau', 'Bafatá', 'Gabú'] },
    { name: 'Kenya',         iso: 'ke', cur: 'KES', dial: '+254', cities: ['Nairobi', 'Mombasa', 'Diani', 'Nakuru', 'Kisumu', 'Naivasha', 'Nanyuki', 'Malindi', 'Watamu', 'Lamu', 'Eldoret', 'Thika'] },
    { name: 'Lesotho',       iso: 'ls', cur: 'LSL', dial: '+266', cities: ['Maseru', 'Teyateyaneng', 'Leribe'] },
    { name: 'Liberia',       iso: 'lr', cur: 'LRD', dial: '+231', cities: ['Monrovia', 'Gbarnga', 'Buchanan'] },
    { name: 'Libya',         iso: 'ly', cur: 'LYD', dial: '+218', cities: ['Tripoli', 'Benghazi', 'Misrata'] },
    { name: 'Madagascar',    iso: 'mg', cur: 'MGA', dial: '+261', cities: ['Antananarivo', 'Toamasina', 'Nosy Be', 'Mahajanga', 'Toliara'] },
    { name: 'Malawi',        iso: 'mw', cur: 'MWK', dial: '+265', cities: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Cape Maclear'] },
    { name: 'Mali',          iso: 'ml', cur: 'XOF', dial: '+223', cities: ['Bamako', 'Sikasso', 'Mopti', 'Ségou'] },
    { name: 'Mauritania',    iso: 'mr', cur: 'MRU', dial: '+222', cities: ['Nouakchott', 'Nouadhibou', 'Rosso'] },
    { name: 'Mauritius',     iso: 'mu', cur: 'MUR', dial: '+230', cities: ['Port Louis', 'Grand Baie', 'Flic en Flac', 'Curepipe'] },
    { name: 'Morocco',       iso: 'ma', cur: 'MAD', dial: '+212', cities: ['Marrakech', 'Casablanca', 'Rabat', 'Fes', 'Tangier', 'Agadir', 'Essaouira', 'Chefchaouen'] },
    { name: 'Mozambique',    iso: 'mz', cur: 'MZN', dial: '+258', cities: ['Maputo', 'Beira', 'Nampula', 'Pemba', 'Vilankulo'] },
    { name: 'Namibia',       iso: 'na', cur: 'NAD', dial: '+264', cities: ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Etosha'] },
    { name: 'Niger',         iso: 'ne', cur: 'XOF', dial: '+227', cities: ['Niamey', 'Zinder', 'Maradi', 'Agadez'] },
    { name: 'Nigeria',       iso: 'ng', cur: 'NGN', dial: '+234', cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Benin City', 'Calabar', 'Enugu'] },
    { name: 'Rwanda',        iso: 'rw', cur: 'RWF', dial: '+250', cities: ['Kigali', 'Musanze', 'Gisenyi', 'Huye', 'Nyungwe'] },
    { name: 'São Tomé and Príncipe', iso: 'st', cur: 'STN', dial: '+239', cities: ['São Tomé', 'Santo António'] },
    { name: 'Senegal',       iso: 'sn', cur: 'XOF', dial: '+221', cities: ['Dakar', 'Saly', 'Saint-Louis', 'Thiès', 'Ziguinchor'] },
    { name: 'Seychelles',    iso: 'sc', cur: 'SCR', dial: '+248', cities: ['Victoria', 'Beau Vallon', 'Praslin', 'La Digue'] },
    { name: 'Sierra Leone',  iso: 'sl', cur: 'SLE', dial: '+232', cities: ['Freetown', 'Bo', 'Kenema'] },
    { name: 'Somalia',       iso: 'so', cur: 'SOS', dial: '+252', cities: ['Mogadishu', 'Hargeisa', 'Bosaso', 'Berbera'] },
    { name: 'South Africa',  iso: 'za', cur: 'ZAR', dial: '+27',  cities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Stellenbosch', 'Knysna'] },
    { name: 'South Sudan',   iso: 'ss', cur: 'SSP', dial: '+211', cities: ['Juba', 'Wau', 'Malakal'] },
    { name: 'Sudan',         iso: 'sd', cur: 'SDG', dial: '+249', cities: ['Khartoum', 'Omdurman', 'Port Sudan'] },
    { name: 'Tanzania',      iso: 'tz', cur: 'TZS', dial: '+255', cities: ['Dar es Salaam', 'Zanzibar City', 'Arusha', 'Moshi', 'Dodoma', 'Mwanza', 'Serengeti', 'Ngorongoro'] },
    { name: 'Togo',          iso: 'tg', cur: 'XOF', dial: '+228', cities: ['Lomé', 'Sokodé', 'Kara'] },
    { name: 'Tunisia',       iso: 'tn', cur: 'TND', dial: '+216', cities: ['Tunis', 'Sousse', 'Hammamet', 'Djerba', 'Sfax'] },
    { name: 'Uganda',        iso: 'ug', cur: 'UGX', dial: '+256', cities: ['Kampala', 'Entebbe', 'Jinja', 'Fort Portal', 'Bwindi', 'Gulu'] },
    { name: 'Zambia',        iso: 'zm', cur: 'ZMW', dial: '+260', cities: ['Lusaka', 'Livingstone', 'Ndola', 'Kitwe'] },
    { name: 'Zimbabwe',      iso: 'zw', cur: 'ZWG', dial: '+263', cities: ['Harare', 'Victoria Falls', 'Bulawayo', 'Mutare', 'Hwange'] }
  ];

  /* Historic and alternate names travellers and hosts still type.
   * Maps a typed alias -> canonical city name, so search does not
   * dead-end on a name the host grew up using.
   */
  var CITY_ALIASES = {
    'leopoldville': 'Kinshasa', 'léopoldville': 'Kinshasa',
    'salisbury': 'Harare',
    'lourenco marques': 'Maputo', 'lourenço marques': 'Maputo',
    'fort lamy': 'N\u2019Djamena',
    'elisabethville': 'Lubumbashi', 'élisabethville': 'Lubumbashi',
    'stanleyville': 'Kisangani',
    'bathurst': 'Banjul',
    'zaire': 'Congo (Kinshasa)',
    'swaziland': 'Eswatini',
    'cape verde': 'Cabo Verde',
    'ivory coast': 'Côte d\u2019Ivoire',
    'drc': 'Congo (Kinshasa)', 'dr congo': 'Congo (Kinshasa)',
    'constantinople': 'Cairo'
  };

  var byName = {};
  var byIso = {};
  COUNTRIES.forEach(function (c) { byName[c.name] = c; byIso[c.iso] = c; });

  /* Every ISO code, for the geocoder. Replaces the hardcoded 'ke,tz,ug,rw,et'. */
  var ALL_ISO = COUNTRIES.map(function (c) { return c.iso; }).join(',');

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // strip accents so "Sao Tome" finds "São Tomé"
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* Suggest cities across the whole continent, or within one country.
   * Prefix matches rank above substring matches — typing "acc" should
   * put Accra first, not some city that merely contains "acc".
   */
  function suggestCities(query, countryName, limit) {
    var q = norm(query);
    if (!q) return [];
    limit = limit || 8;

    var alias = CITY_ALIASES[q];
    var pool = countryName && byName[countryName] ? [byName[countryName]] : COUNTRIES;
    var starts = [], contains = [];

    pool.forEach(function (c) {
      c.cities.forEach(function (city) {
        var n = norm(city);
        var hit = { city: city, country: c.name, iso: c.iso, cur: c.cur };
        if (alias && city === alias) { starts.unshift(hit); return; }
        if (n.indexOf(q) === 0) starts.push(hit);
        else if (n.indexOf(q) > -1) contains.push(hit);
      });
    });

    return starts.concat(contains).slice(0, limit);
  }

  function countryOptionsHTML(selected) {
    return COUNTRIES.map(function (c) {
      var sel = c.name === selected ? ' selected' : '';
      return '<option value="' + c.name + '"' + sel + '>' + c.name + '</option>';
    }).join('');
  }

  function currencyFor(countryName) {
    return (byName[countryName] || {}).cur || 'USD';
  }

  function dialFor(countryName) {
    return (byName[countryName] || {}).dial || '';
  }

  function isoFor(countryName) {
    return (byName[countryName] || {}).iso || '';
  }

  window.APA_AFRICA = {
    countries: COUNTRIES,
    allIso: ALL_ISO,
    aliases: CITY_ALIASES,
    suggestCities: suggestCities,
    countryOptionsHTML: countryOptionsHTML,
    currencyFor: currencyFor,
    dialFor: dialFor,
    isoFor: isoFor,
    normalise: norm
  };
})();
