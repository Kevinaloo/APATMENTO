/* ═══════════════════════════════════════════════════════════════════════
   CABANA · DIAL CODES
   fd-dialcodes.js

   ITU E.164 country calling codes, with the flag emoji and an example
   national number for each.

   Ordering: Kenya first because that is where most of this traffic
   originates, then the rest of East Africa, then the corridors we
   actually sell, then everything else alphabetically. A Kenyan traveller
   should not scroll, and a Nigerian one should not feel like an
   afterthought two hundred rows down.

   The example number is the placeholder shown once a country is picked.
   It is a real national format, so someone can see the shape expected
   without us writing a paragraph about it.

   Exposes window.FDDial with .all, .byCode(), .find(), .guess().
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* [iso2, name, dial, exampleNationalNumber] */
  var D = [
    /* ── home and the region ─────────────────────────────────────── */
    ['KE', 'Kenya', '254', '712 345678'],
    ['TZ', 'Tanzania', '255', '712 345678'],
    ['UG', 'Uganda', '256', '712 345678'],
    ['RW', 'Rwanda', '250', '722 123456'],
    ['ET', 'Ethiopia', '251', '911 234567'],
    ['SO', 'Somalia', '252', '61 2345678'],
    ['SS', 'South Sudan', '211', '977 123456'],
    ['BI', 'Burundi', '257', '79 123456'],
    ['DJ', 'Djibouti', '253', '77 123456'],
    ['ER', 'Eritrea', '291', '7 123456'],

    /* ── corridors we sell most ──────────────────────────────────── */
    ['AE', 'United Arab Emirates', '971', '50 123 4567'],
    ['GB', 'United Kingdom', '44', '7400 123456'],
    ['US', 'United States', '1', '(201) 555-0123'],
    ['ZA', 'South Africa', '27', '71 123 4567'],
    ['IN', 'India', '91', '81234 56789'],
    ['QA', 'Qatar', '974', '3312 3456'],
    ['SA', 'Saudi Arabia', '966', '51 234 5678'],
    ['TR', 'Türkiye', '90', '501 234 56 78'],
    ['CN', 'China', '86', '131 2345 6789'],
    ['NG', 'Nigeria', '234', '802 123 4567'],

    /* ── the rest, alphabetical ──────────────────────────────────── */
    ['AF', 'Afghanistan', '93', '70 123 4567'],
    ['AL', 'Albania', '355', '67 212 3456'],
    ['DZ', 'Algeria', '213', '551 23 45 67'],
    ['AO', 'Angola', '244', '923 123 456'],
    ['AR', 'Argentina', '54', '11 2345-6789'],
    ['AM', 'Armenia', '374', '77 123456'],
    ['AU', 'Australia', '61', '412 345 678'],
    ['AT', 'Austria', '43', '664 123456'],
    ['AZ', 'Azerbaijan', '994', '40 123 45 67'],
    ['BH', 'Bahrain', '973', '3600 1234'],
    ['BD', 'Bangladesh', '880', '1812-345678'],
    ['BY', 'Belarus', '375', '29 491-19-11'],
    ['BE', 'Belgium', '32', '470 12 34 56'],
    ['BJ', 'Benin', '229', '90 01 12 34'],
    ['BO', 'Bolivia', '591', '71234567'],
    ['BA', 'Bosnia and Herzegovina', '387', '61 123 456'],
    ['BW', 'Botswana', '267', '71 123 456'],
    ['BR', 'Brazil', '55', '11 96123-4567'],
    ['BG', 'Bulgaria', '359', '48 123 456'],
    ['BF', 'Burkina Faso', '226', '70 12 34 56'],
    ['KH', 'Cambodia', '855', '91 234 567'],
    ['CM', 'Cameroon', '237', '6 71 23 45 67'],
    ['CA', 'Canada', '1', '(204) 234-5678'],
    ['CV', 'Cape Verde', '238', '991 12 34'],
    ['CF', 'Central African Republic', '236', '70 01 23 45'],
    ['TD', 'Chad', '235', '63 01 23 45'],
    ['CL', 'Chile', '56', '9 6123 4567'],
    ['CO', 'Colombia', '57', '321 1234567'],
    ['KM', 'Comoros', '269', '321 23 45'],
    ['CG', 'Congo', '242', '06 123 4567'],
    ['CD', 'DR Congo', '243', '991 234 567'],
    ['CR', 'Costa Rica', '506', '8312 3456'],
    ['CI', "Côte d'Ivoire", '225', '01 23 45 67'],
    ['HR', 'Croatia', '385', '91 234 5678'],
    ['CU', 'Cuba', '53', '5 1234567'],
    ['CY', 'Cyprus', '357', '96 123456'],
    ['CZ', 'Czechia', '420', '601 123 456'],
    ['DK', 'Denmark', '45', '32 12 34 56'],
    ['DO', 'Dominican Republic', '1', '(809) 234-5678'],
    ['EC', 'Ecuador', '593', '99 123 4567'],
    ['EG', 'Egypt', '20', '10 0123 4567'],
    ['SV', 'El Salvador', '503', '7012 3456'],
    ['GQ', 'Equatorial Guinea', '240', '222 123 456'],
    ['EE', 'Estonia', '372', '5123 4567'],
    ['SZ', 'Eswatini', '268', '7612 3456'],
    ['FJ', 'Fiji', '679', '701 2345'],
    ['FI', 'Finland', '358', '41 2345678'],
    ['FR', 'France', '33', '6 12 34 56 78'],
    ['GA', 'Gabon', '241', '06 03 12 34'],
    ['GM', 'Gambia', '220', '301 2345'],
    ['GE', 'Georgia', '995', '555 12 34 56'],
    ['DE', 'Germany', '49', '1512 3456789'],
    ['GH', 'Ghana', '233', '23 123 4567'],
    ['GR', 'Greece', '30', '691 234 5678'],
    ['GT', 'Guatemala', '502', '5123 4567'],
    ['GN', 'Guinea', '224', '601 12 34 56'],
    ['HK', 'Hong Kong', '852', '5123 4567'],
    ['HU', 'Hungary', '36', '20 123 4567'],
    ['IS', 'Iceland', '354', '611 1234'],
    ['ID', 'Indonesia', '62', '812-345-678'],
    ['IR', 'Iran', '98', '912 345 6789'],
    ['IQ', 'Iraq', '964', '791 234 5678'],
    ['IE', 'Ireland', '353', '85 012 3456'],
    ['IL', 'Israel', '972', '50-234-5678'],
    ['IT', 'Italy', '39', '312 345 6789'],
    ['JM', 'Jamaica', '1', '(876) 210-1234'],
    ['JP', 'Japan', '81', '90-1234-5678'],
    ['JO', 'Jordan', '962', '7 9012 3456'],
    ['KZ', 'Kazakhstan', '7', '771 000 9998'],
    ['KW', 'Kuwait', '965', '500 12345'],
    ['KG', 'Kyrgyzstan', '996', '700 123 456'],
    ['LA', 'Laos', '856', '20 23 123 456'],
    ['LV', 'Latvia', '371', '21 234 567'],
    ['LB', 'Lebanon', '961', '71 123 456'],
    ['LS', 'Lesotho', '266', '5012 3456'],
    ['LR', 'Liberia', '231', '77 012 3456'],
    ['LY', 'Libya', '218', '91-2345678'],
    ['LT', 'Lithuania', '370', '612 34567'],
    ['LU', 'Luxembourg', '352', '628 123 456'],
    ['MG', 'Madagascar', '261', '32 12 345 67'],
    ['MW', 'Malawi', '265', '991 23 45 67'],
    ['MY', 'Malaysia', '60', '12-345 6789'],
    ['MV', 'Maldives', '960', '771-2345'],
    ['ML', 'Mali', '223', '65 01 23 45'],
    ['MT', 'Malta', '356', '9696 1234'],
    ['MR', 'Mauritania', '222', '22 12 34 56'],
    ['MU', 'Mauritius', '230', '5251 2345'],
    ['MX', 'Mexico', '52', '222 123 4567'],
    ['MD', 'Moldova', '373', '621 12 345'],
    ['MN', 'Mongolia', '976', '8812 3456'],
    ['ME', 'Montenegro', '382', '67 622 901'],
    ['MA', 'Morocco', '212', '650-123456'],
    ['MZ', 'Mozambique', '258', '82 123 4567'],
    ['MM', 'Myanmar', '95', '9 212 3456'],
    ['NA', 'Namibia', '264', '81 123 4567'],
    ['NP', 'Nepal', '977', '984-1234567'],
    ['NL', 'Netherlands', '31', '6 12345678'],
    ['NZ', 'New Zealand', '64', '21 123 4567'],
    ['NI', 'Nicaragua', '505', '8123 4567'],
    ['NE', 'Niger', '227', '93 12 34 56'],
    ['KP', 'North Korea', '850', '192 123 4567'],
    ['MK', 'North Macedonia', '389', '72 345 678'],
    ['NO', 'Norway', '47', '406 12 345'],
    ['OM', 'Oman', '968', '9212 3456'],
    ['PK', 'Pakistan', '92', '301 2345678'],
    ['PS', 'Palestine', '970', '599 123 456'],
    ['PA', 'Panama', '507', '6001-2345'],
    ['PG', 'Papua New Guinea', '675', '681 2345'],
    ['PY', 'Paraguay', '595', '961 456789'],
    ['PE', 'Peru', '51', '912 345 678'],
    ['PH', 'Philippines', '63', '905 123 4567'],
    ['PL', 'Poland', '48', '512 345 678'],
    ['PT', 'Portugal', '351', '912 345 678'],
    ['PR', 'Puerto Rico', '1', '(787) 234-5678'],
    ['RE', 'Réunion', '262', '692 12 34 56'],
    ['RO', 'Romania', '40', '712 034 567'],
    ['RU', 'Russia', '7', '912 345-67-89'],
    ['SN', 'Senegal', '221', '70 123 45 67'],
    ['RS', 'Serbia', '381', '60 1234567'],
    ['SC', 'Seychelles', '248', '2 510 123'],
    ['SL', 'Sierra Leone', '232', '25 123456'],
    ['SG', 'Singapore', '65', '8123 4567'],
    ['SK', 'Slovakia', '421', '912 123 456'],
    ['SI', 'Slovenia', '386', '31 234 567'],
    ['KR', 'South Korea', '82', '10-2000-0000'],
    ['ES', 'Spain', '34', '612 34 56 78'],
    ['LK', 'Sri Lanka', '94', '71 234 5678'],
    ['SD', 'Sudan', '249', '91 123 1234'],
    ['SE', 'Sweden', '46', '70 123 45 67'],
    ['CH', 'Switzerland', '41', '78 123 45 67'],
    ['SY', 'Syria', '963', '944 567 890'],
    ['TW', 'Taiwan', '886', '912 345 678'],
    ['TJ', 'Tajikistan', '992', '917 12 3456'],
    ['TH', 'Thailand', '66', '81 234 5678'],
    ['TG', 'Togo', '228', '90 11 23 45'],
    ['TT', 'Trinidad and Tobago', '1', '(868) 291-1234'],
    ['TN', 'Tunisia', '216', '20 123 456'],
    ['TM', 'Turkmenistan', '993', '66 123456'],
    ['UA', 'Ukraine', '380', '50 123 4567'],
    ['UY', 'Uruguay', '598', '94 231 234'],
    ['UZ', 'Uzbekistan', '998', '91 234 56 78'],
    ['VE', 'Venezuela', '58', '412-1234567'],
    ['VN', 'Vietnam', '84', '91 234 56 78'],
    ['YE', 'Yemen', '967', '712 345 678'],
    ['ZM', 'Zambia', '260', '95 5123456'],
    ['ZW', 'Zimbabwe', '263', '71 234 5678']
  ];

  /* Flag emoji from the ISO code: each letter maps to a regional
     indicator symbol. Beats shipping 190 images. */
  function flag(iso) {
    if (!iso || iso.length !== 2) return '';
    return String.fromCodePoint.apply(null, iso.toUpperCase().split('').map(function (c) {
      return 0x1F1E6 + c.charCodeAt(0) - 65;
    }));
  }

  var list = D.map(function (r, i) {
    return {
      iso: r[0],
      name: r[1],
      dial: r[2],
      example: r[3],
      flag: flag(r[0]),
      order: i,
      key: (r[1] + ' ' + r[0] + ' +' + r[2]).toLowerCase()
    };
  });

  var byIso = {};
  list.forEach(function (c) { if (!byIso[c.iso]) byIso[c.iso] = c; });

  window.FDDial = {
    all: list,

    byIso: function (iso) { return byIso[String(iso || '').toUpperCase()] || null; },

    /* Search by country name, ISO code or dial code. Typing "254" or
       "kenya" or "ke" all land on the same row. */
    find: function (q, limit) {
      q = String(q || '').trim().toLowerCase().replace(/^\+/, '');
      if (!q) return list.slice(0, limit || 12);
      var starts = [], contains = [];
      list.forEach(function (c) {
        if (c.name.toLowerCase().indexOf(q) === 0 ||
            c.iso.toLowerCase() === q ||
            c.dial.indexOf(q) === 0) starts.push(c);
        else if (c.key.indexOf(q) >= 0) contains.push(c);
      });
      return starts.concat(contains).slice(0, limit || 12);
    },

    /* Best guess at the visitor's country, in order of confidence:
       an explicit locale region, then the timezone, then Kenya. */
    guess: function () {
      try {
        var loc = (navigator.language || '').split('-')[1];
        if (loc && byIso[loc.toUpperCase()]) return byIso[loc.toUpperCase()];
      } catch (e) {}
      try {
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        var TZ = {
          'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kampala': 'UG',
          'Africa/Kigali': 'RW', 'Africa/Addis_Ababa': 'ET', 'Africa/Mogadishu': 'SO',
          'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Johannesburg': 'ZA',
          'Africa/Cairo': 'EG', 'Asia/Dubai': 'AE', 'Asia/Qatar': 'QA',
          'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Asia/Kolkata': 'IN',
          'Asia/Calcutta': 'IN', 'Europe/Istanbul': 'TR'
        };
        if (TZ[tz] && byIso[TZ[tz]]) return byIso[TZ[tz]];
      } catch (e) {}
      return byIso.KE;
    }
  };
})();
