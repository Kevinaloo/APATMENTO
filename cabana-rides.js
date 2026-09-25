/* ═══════════════════════════════════════════════════════════════════
   CABANA MOVE · the rider's app
   ───────────────────────────────────────────────────────────────────
   Map first, one sheet, four stages:

     plan    where from, where to, when, what kind of trip
     choose  what moves you, with a fair suggested fare for each
     offer   name your fare (or ask for offers), how you pay, who you are
     live    drivers answering → your driver → the trip → the receipt

   Everything that matters happens on the server (supabase/migrations/
   20260925130000_cabana_rides_marketplace.sql). This file never sets a
   price, a status or a driver. It asks, and it shows what it is told:

     ride_fare_hint      a fair range for a route, a mode and an hour
     ride_request_place  the rider's request, with their fare or none
     ride_track          the trip as the rider may see it
     ride_choose_offer   take a driver's offer
     ride_raise_offer    sweeten the fare while drivers are thinking
     ride_cancel / ride_rider_complete / ride_rate
     ride_requests_list  this device's trips (and a signed-in rider's)
     ride_share_view     the read-only view family follows

   Road distance and time come from /api/route; the database only uses
   them inside sane bounds of the straight line.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var M = global.CabanaMotion || null;

  /* ── 0 · the continent, its money, its airports ──────────────────── */
  var COUNTRIES = {
    DZ:['Algeria','DZD'], AO:['Angola','AOA'], BJ:['Benin','XOF'], BW:['Botswana','BWP'], BF:['Burkina Faso','XOF'],
    BI:['Burundi','BIF'], CV:['Cabo Verde','CVE'], CM:['Cameroon','XAF'], CF:['Central African Republic','XAF'],
    TD:['Chad','XAF'], KM:['Comoros','KMF'], CD:['DR Congo','CDF'], CG:['Republic of the Congo','XAF'],
    CI:['Côte d’Ivoire','XOF'], DJ:['Djibouti','DJF'], EG:['Egypt','EGP'], GQ:['Equatorial Guinea','XAF'],
    ER:['Eritrea','ERN'], SZ:['Eswatini','SZL'], ET:['Ethiopia','ETB'], GA:['Gabon','XAF'], GM:['The Gambia','GMD'],
    GH:['Ghana','GHS'], GN:['Guinea','GNF'], GW:['Guinea-Bissau','XOF'], KE:['Kenya','KES'], LS:['Lesotho','LSL'],
    LR:['Liberia','LRD'], LY:['Libya','LYD'], MG:['Madagascar','MGA'], MW:['Malawi','MWK'], ML:['Mali','XOF'],
    MR:['Mauritania','MRU'], MU:['Mauritius','MUR'], MA:['Morocco','MAD'], MZ:['Mozambique','MZN'], NA:['Namibia','NAD'],
    NE:['Niger','XOF'], NG:['Nigeria','NGN'], RW:['Rwanda','RWF'], ST:['São Tomé and Príncipe','STN'], SN:['Senegal','XOF'],
    SC:['Seychelles','SCR'], SL:['Sierra Leone','SLE'], SO:['Somalia','SOS'], ZA:['South Africa','ZAR'], SS:['South Sudan','SSP'],
    SD:['Sudan','SDG'], TZ:['Tanzania','TZS'], TG:['Togo','XOF'], TN:['Tunisia','TND'], UG:['Uganda','UGX'], ZM:['Zambia','ZMW'],
    ZW:['Zimbabwe','USD']
  };
  /* Matches public.cabana_minor_factor: the page and the database must
     agree on what "1000" means in every currency. */
  var ZERO_DEC = { UGX:1, RWF:1, XOF:1, XAF:1, KMF:1, BIF:1, GNF:1, DJF:1, MGA:1, CVE:1 };

  var AIRPORTS = [
    ['NBO','JKIA, Nairobi','KE',-1.3192,36.9278], ['WIL','Wilson Airport, Nairobi','KE',-1.3218,36.8148],
    ['MBA','Moi International, Mombasa','KE',-4.0348,39.5942], ['KIS','Kisumu International','KE',-0.0861,34.7289],
    ['UKA','Ukunda Airstrip, Diani','KE',-4.2933,39.5711], ['MYD','Malindi Airport','KE',-3.2293,40.1017],
    ['LAU','Manda Airport, Lamu','KE',-2.2524,40.9131], ['EDL','Eldoret International','KE',0.4045,35.2389],
    ['EBB','Entebbe International','UG',0.0424,32.4435], ['KGL','Kigali International','RW',-1.9686,30.1395],
    ['DAR','Julius Nyerere, Dar es Salaam','TZ',-6.8781,39.2026], ['ZNZ','Abeid Amani Karume, Zanzibar','TZ',-6.2220,39.2249],
    ['JRO','Kilimanjaro International','TZ',-3.4294,37.0745], ['ADD','Bole International, Addis Ababa','ET',8.9779,38.7993],
    ['LOS','Murtala Muhammed, Lagos','NG',6.5774,3.3212], ['ABV','Nnamdi Azikiwe, Abuja','NG',9.0068,7.2632],
    ['ACC','Kotoka International, Accra','GH',5.6052,-0.1668], ['DSS','Blaise Diagne, Dakar','SN',14.6700,-17.0733],
    ['ABJ','Félix-Houphouët-Boigny, Abidjan','CI',5.2614,-3.9263], ['DLA','Douala International','CM',4.0061,9.7195],
    ['FIH','N’djili, Kinshasa','CD',-4.3858,15.4446], ['LAD','Quatro de Fevereiro, Luanda','AO',-8.8584,13.2312],
    ['JNB','O. R. Tambo, Johannesburg','ZA',-26.1392,28.2460], ['CPT','Cape Town International','ZA',-33.9715,18.6021],
    ['DUR','King Shaka, Durban','ZA',-29.6144,31.1197], ['LUN','Kenneth Kaunda, Lusaka','ZM',-15.3308,28.4526],
    ['LVI','Harry Mwanga Nkumbula, Livingstone','ZM',-17.8218,25.8227], ['HRE','Robert Mugabe, Harare','ZW',-17.9318,31.0928],
    ['VFA','Victoria Falls Airport','ZW',-18.0959,25.8390], ['MPM','Maputo International','MZ',-25.9208,32.5726],
    ['WDH','Hosea Kutako, Windhoek','NA',-22.4799,17.4709], ['GBE','Sir Seretse Khama, Gaborone','BW',-24.5552,25.9182],
    ['CAI','Cairo International','EG',30.1219,31.4056], ['CMN','Mohammed V, Casablanca','MA',33.3675,-7.5898],
    ['RAK','Marrakech Menara','MA',31.6069,-8.0363], ['TUN','Tunis–Carthage','TN',36.8510,10.2272],
    ['ALG','Houari Boumediene, Algiers','DZ',36.6910,3.2154], ['MRU','Sir Seewoosagur Ramgoolam, Mauritius','MU',-20.4302,57.6836],
    ['SEZ','Seychelles International','SC',-4.6743,55.5218], ['TNR','Ivato, Antananarivo','MG',-18.7969,47.4788],
    ['KRT','Khartoum International','SD',15.5895,32.5532], ['LLW','Kamuzu International, Lilongwe','MW',-13.7894,33.7810]
  ].map(function (a) { return { iata: a[0], label: a[1], cc: a[2], lat: a[3], lng: a[4], major: !/^(WIL|UKA|MYD|LAU|EDL|LVI)$/.test(a[0]) }; });

  /* ── 1 · what moves you ──────────────────────────────────────────── */
  function wheel(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#231029"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.46).toFixed(1) + '" fill="#efe3ea"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.16).toFixed(1) + '" fill="#231029"/>';
  }
  var SHADOW = '<ellipse cx="60" cy="58.5" rx="46" ry="3.4" fill="#231029" opacity=".13"/>';
  var GLASS = '#3b2140';
  function svg(inner) { return '<svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">' + SHADOW + inner + '</svg>'; }

  var ART = {
    economy: svg(
      '<path d="M12 46c0-5 2.8-8.2 8-9.2l12-2.2 10.6-10.4c1.9-1.9 4.3-2.9 7-2.9h26.2c3.8 0 7.1 1.8 9.3 4.9L91 35l12 2.4c3.7.8 6 3.8 6 7.6v3.3c0 1.5-1.2 2.7-2.7 2.7H14.7A2.7 2.7 0 0 1 12 48.3Z" fill="#ffb21e"/>' +
      '<path d="M37.5 34.2 46.8 25c1.3-1.3 3-2 4.9-2H63v11.2Z" fill="' + GLASS + '"/><path d="M66 23h10.6c2.6 0 4.9 1.3 6.3 3.4l5.1 7.8H66Z" fill="' + GLASS + '"/>' +
      '<path d="M19 40.5h84" stroke="#ffe08a" stroke-width="2.2" stroke-linecap="round"/><path d="M64.5 35.5v13" stroke="#e08e00" stroke-width="1.3"/>' +
      '<rect x="103.5" y="40" width="5" height="3" rx="1.5" fill="#fff6cf"/><rect x="12.5" y="41" width="4" height="3" rx="1.5" fill="#ff4f5e"/>' +
      wheel(33, 50.5, 8.5) + wheel(88, 50.5, 8.5)),
    comfort: svg(
      '<path d="M7 46.8c0-4.4 2.9-7.4 7.4-8.2l17.8-3.1 11.6-9.7c2-1.7 4.6-2.6 7.2-2.6h22.6c3.5 0 6.8 1.5 9 4.2l7.2 8.3 14.6 2.3c4 .7 6.6 3.7 6.6 7.6v3.2c0 1.5-1.2 2.7-2.7 2.7H9.7A2.7 2.7 0 0 1 7 48.4Z" fill="#ff7a1a"/>' +
      '<path d="M39.8 35.4 47.8 28.3c1.4-1.3 3.2-2 5.1-2H63.2v9.1Z" fill="' + GLASS + '"/><path d="M66.4 26.3h8.8c2.4 0 4.6 1 6.1 2.8l5.4 6.3H66.4Z" fill="' + GLASS + '"/>' +
      '<path d="M15 41.3h92" stroke="#ffb27a" stroke-width="2.2" stroke-linecap="round"/><path d="M64.8 36v12.5" stroke="#c9540a" stroke-width="1.3"/>' +
      '<rect x="106" y="41" width="5.5" height="3" rx="1.5" fill="#fff6cf"/><rect x="7.5" y="42" width="4" height="3" rx="1.5" fill="#c1122f"/>' +
      wheel(30, 50.5, 8.6) + wheel(91, 50.5, 8.6)),
    executive: svg(
      '<path d="M4 47c0-4.2 2.8-7 7-7.8l19.6-3.4 12.8-10.1c2.1-1.6 4.6-2.5 7.2-2.5h25.6c3.3 0 6.4 1.4 8.6 3.8l8.4 9 16.6 2.8c3.7.6 6.2 3.5 6.2 7.2v3.3c0 1.5-1.2 2.7-2.7 2.7H6.7A2.7 2.7 0 0 1 4 49.3Z" fill="#2b1236"/>' +
      '<path d="M40.5 36.3 49.6 28.8c1.4-1.1 3.1-1.7 4.9-1.7H65.3v9.2Z" fill="#6d4d77"/><path d="M68.3 27.1h8.5c2.3 0 4.5 1 6 2.7l5.8 6.5H68.3Z" fill="#6d4d77"/>' +
      '<path d="M12 42.4h98" stroke="#ffb21e" stroke-width="1.6" stroke-linecap="round"/><path d="M66.8 37v12" stroke="#4d2b58" stroke-width="1.3"/>' +
      '<rect x="109" y="41.5" width="6" height="3" rx="1.5" fill="#fff6cf"/><rect x="4.5" y="42.5" width="4" height="3" rx="1.5" fill="#ff4f5e"/>' +
      wheel(29, 50.8, 8.8) + wheel(94, 50.8, 8.8)),
    van: svg(
      '<path d="M10 47V29.5c0-5 3.3-8.6 8.3-9.3L32 18.4c1.2-.2 2.4-.3 3.6-.3h45.7c4.1 0 7.9 2 10.2 5.4l7.7 11.3 7.4 2.2c3.2 1 5.4 3.9 5.4 7.3v3.8c0 1.5-1.2 2.7-2.7 2.7H12.7A2.7 2.7 0 0 1 10 48.1Z" fill="#12b98f"/>' +
      '<path d="M18 23.6c0-1.2.8-2.1 2-2.3l10-1.3v12H18Z" fill="' + GLASS + '"/><rect x="33" y="20.2" width="22" height="11.7" rx="1.5" fill="' + GLASS + '"/><path d="M58 20.2h21.6c2.8 0 5.3 1.4 6.8 3.7l5.2 8H58Z" fill="' + GLASS + '"/>' +
      '<path d="M16 38h92" stroke="#7de8c9" stroke-width="2.2" stroke-linecap="round"/><path d="M56.5 33v15" stroke="#0a8667" stroke-width="1.3"/>' +
      '<rect x="108.5" y="40" width="5" height="3" rx="1.5" fill="#fff6cf"/><rect x="10.5" y="40" width="4" height="4" rx="1.5" fill="#ff4f5e"/>' +
      wheel(30, 50.5, 8.6) + wheel(94, 50.5, 8.6)),
    electric: svg(
      '<path d="M13 46c0-5 2.8-8 8-9l11.6-2.1 10.4-10.2c1.9-1.9 4.3-2.9 7-2.9h25.6c3.8 0 7.1 1.8 9.3 4.9l5.6 8.1 11.6 2.3c3.7.8 6 3.8 6 7.6v3.3c0 1.5-1.2 2.7-2.7 2.7H15.7A2.7 2.7 0 0 1 13 48.3Z" fill="#3aa0ff"/>' +
      '<path d="M38 34.2 47.1 25c1.3-1.3 3-2 4.9-2H63v11.2Z" fill="' + GLASS + '"/><path d="M66 23h10.4c2.6 0 4.9 1.3 6.3 3.4l5 7.8H66Z" fill="' + GLASS + '"/>' +
      '<path d="M20 40.5h82" stroke="#9fd2ff" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M72 37.5 66.6 44.8h4.2l-2 5.4 6.2-7.9h-4.3l2.4-4.8Z" fill="#fff"/>' +
      '<rect x="103.5" y="40" width="5" height="3" rx="1.5" fill="#e9fbff"/><rect x="13.5" y="41" width="4" height="3" rx="1.5" fill="#ff4f5e"/>' +
      wheel(34, 50.5, 8.5) + wheel(88, 50.5, 8.5)),
    accessible: svg(
      '<path d="M9 47V27.4c0-4.8 3.4-8.6 8.2-9.2l14.4-1.8c1.1-.1 2.2-.2 3.3-.2h48.2c4.2 0 8.1 2.1 10.4 5.7l7 11.2 7.2 2.3c3.1 1 5.3 3.9 5.3 7.2v4.4c0 1.5-1.2 2.7-2.7 2.7H11.7A2.7 2.7 0 0 1 9 48.1Z" fill="#7b2ff7"/>' +
      '<rect x="17" y="20.5" width="16" height="11.5" rx="1.8" fill="' + GLASS + '"/><path d="M60 19.2h23c2.9 0 5.5 1.5 7 4l4.5 8.3H60Z" fill="' + GLASS + '"/>' +
      '<rect x="36" y="20" width="20" height="27" rx="3" fill="#9a63ff"/>' +
      '<circle cx="46" cy="27.4" r="1.9" fill="#fff"/><path d="M45.6 30.6v5.2h5.2l1.8 5M45.4 33.4a5.4 5.4 0 1 0 5.8 7" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="108" y="40" width="5" height="3" rx="1.5" fill="#fff6cf"/>' +
      wheel(27, 50.5, 8.5) + wheel(95, 50.5, 8.5)),
    minibus: svg(
      '<path d="M6 47.5V24.8c0-4.4 3.6-8 8-8h78.4c3.9 0 7.4 2.3 9 5.9l6.3 13.9 3.4 1.6c2.2 1.1 3.6 3.3 3.6 5.8v3.5c0 1.5-1.2 2.7-2.7 2.7H8.7A2.7 2.7 0 0 1 6 48.3Z" fill="#ff3d8b"/>' +
      '<rect x="12" y="21" width="14" height="10" rx="1.6" fill="' + GLASS + '"/><rect x="29" y="21" width="14" height="10" rx="1.6" fill="' + GLASS + '"/><rect x="46" y="21" width="14" height="10" rx="1.6" fill="' + GLASS + '"/><rect x="63" y="21" width="14" height="10" rx="1.6" fill="' + GLASS + '"/>' +
      '<path d="M80 21h11c2.3 0 4.3 1.3 5.3 3.4l3.5 7.6H80Z" fill="' + GLASS + '"/>' +
      '<path d="M8 36h96" stroke="#ffb21e" stroke-width="3"/><path d="M8 40.5h96" stroke="#12b98f" stroke-width="2"/>' +
      '<rect x="110" y="40" width="4.5" height="3.2" rx="1.5" fill="#fff6cf"/>' +
      wheel(26, 51, 8.4) + wheel(94, 51, 8.4)),
    shuttle: svg(
      '<path d="M4 48V22.5c0-4.1 3.4-7.5 7.5-7.5h89.6c3.5 0 6.6 2.4 7.4 5.8l3.9 16.2 1.6 1.6c.9.9 1.4 2.1 1.4 3.4v6c0 1.5-1.2 2.7-2.7 2.7H6.7A2.7 2.7 0 0 1 4 48Z" fill="#3aa0ff"/>' +
      '<path d="M9 19.5h93.5c1.7 0 3.2 1.1 3.6 2.8l2.4 10.2H9Z" fill="' + GLASS + '"/>' +
      '<path d="M26 19.5v13M44 19.5v13M62 19.5v13M80 19.5v13" stroke="#3aa0ff" stroke-width="2.2"/>' +
      '<path d="M6 38.5h107" stroke="#ffb21e" stroke-width="3"/>' +
      wheel(24, 51.2, 8.2) + wheel(40, 51.2, 8.2) + wheel(96, 51.2, 8.2)),
    motorcycle: svg(
      '<circle cx="28" cy="47" r="11" fill="none" stroke="#231029" stroke-width="4.4"/><circle cx="92" cy="47" r="11" fill="none" stroke="#231029" stroke-width="4.4"/>' +
      '<circle cx="28" cy="47" r="3" fill="#231029"/><circle cx="92" cy="47" r="3" fill="#231029"/>' +
      '<path d="M28 47 44 33h26l10-10M80 23l12 24M58 33l-8 14h22" stroke="#ff4f5e" stroke-width="4.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M40 30.5h24" stroke="#231029" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M76 19h9" stroke="#231029" stroke-width="3.4" stroke-linecap="round"/>' +
      '<circle cx="56" cy="11" r="6.6" fill="#ffb21e"/><path d="M50 27.5 55 18.5l9 6.5" stroke="#7b2ff7" stroke-width="5.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
    tuk_tuk: svg(
      '<path d="M22 47V26c0-6.6 5.4-12 12-12h40c4.6 0 8.6 2.7 10.6 6.8L92 36l7.5 2.8c3 1.1 5 4 5 7.2v1.9c0 1.4-1.1 2.6-2.6 2.6H24.6a2.6 2.6 0 0 1-2.6-2.6Z" fill="#ffb21e"/>' +
      '<path d="M18 16.5c0-3 2.4-5.5 5.5-5.5h52c3 0 5.5 2.4 5.5 5.5V19H18Z" fill="#12b98f"/>' +
      '<path d="M60 21h13c2.7 0 5.1 1.6 6.1 4.1L83 35H60Z" fill="' + GLASS + '"/><path d="M28 21h28v14H28Z" fill="#fff4d0" opacity=".6"/>' +
      '<path d="M24 38h66" stroke="#e08e00" stroke-width="2"/>' +
      '<rect x="100" y="41" width="4" height="3" rx="1.5" fill="#fff6cf"/>' +
      wheel(40, 51, 8) + wheel(92, 51, 7.6)),
    boat: '<svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">' +
      '<path d="M4 56c8 0 8-3.4 16-3.4S28 56 36 56s8-3.4 16-3.4S60 56 68 56s8-3.4 16-3.4S92 56 100 56s8-3.4 16-3.4" stroke="#3aa0ff" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M12 41h96l-9.5 10.6a6 6 0 0 1-4.5 2H26.5a6 6 0 0 1-4.6-2.1Z" fill="#12b98f"/><path d="M14 44.5h92" stroke="#7de8c9" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M58 6v35" stroke="#231029" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M60 8c16 8 26 19 30 31H60Z" fill="#fff7ee" stroke="#e7cdb8" stroke-width="1.2"/><path d="M56 12c-9 7-15 16-17 27h17Z" fill="#ff7a1a"/></svg>',
    helicopter: svg(
      '<path d="M22 12h76" stroke="#231029" stroke-width="3" stroke-linecap="round"/><path d="M60 12v8" stroke="#231029" stroke-width="3"/>' +
      '<path d="M34 34c0-8.3 6.7-15 15-15h14c11 0 20 8 21.5 18.5l.5 3.5H40c-3.3 0-6-2.7-6-6Z" fill="#7b2ff7"/>' +
      '<path d="M64 21.5c7.6.5 14 5.8 16.2 13H64Z" fill="' + GLASS + '"/>' +
      '<path d="M34 30H10l-4-8" stroke="#7b2ff7" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="22" r="4.5" fill="none" stroke="#231029" stroke-width="2"/>' +
      '<path d="M44 42 40 50h52M76 42l4 8" stroke="#231029" stroke-width="2.6" fill="none" stroke-linecap="round"/>'),
    horse: svg(
      '<path d="M26 26c6-6 18-7 28-5l18 2c3-6 8-11 14-13l3 5c4 1 7 4 8 8l-4 3-6-2c-1 5-3 8-6 10l2 20h-5l-3-15H44l-3 15h-5l1-15c-4-2-7-5-8-9l-6 6-4-3c2-3 5-5 7-7Z" fill="#a0522d"/>' +
      '<path d="M86 10c-3 4-4 8-4 12" stroke="#5a2d14" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="92" cy="17" r="1.4" fill="#231029"/>' +
      '<path d="M24 29c-4 4-6 9-5 15" stroke="#5a2d14" stroke-width="3.2" fill="none" stroke-linecap="round"/>'),
    bicycle: svg(
      '<circle cx="30" cy="44" r="13" fill="none" stroke="#231029" stroke-width="3.4"/><circle cx="90" cy="44" r="13" fill="none" stroke="#231029" stroke-width="3.4"/>' +
      '<path d="M30 44 48 24h30M48 24l12 20H30M60 44 78 24l12 20M44 18h10M76 18h8l-4 6" stroke="#ff7a1a" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
    e_bike: svg(
      '<circle cx="30" cy="44" r="13" fill="none" stroke="#231029" stroke-width="3.4"/><circle cx="90" cy="44" r="13" fill="none" stroke="#231029" stroke-width="3.4"/>' +
      '<path d="M30 44 48 24h30M48 24l12 20H30M60 44 78 24l12 20M44 18h10M76 18h8l-4 6" stroke="#12b98f" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="52" y="27" width="18" height="8" rx="2.5" fill="#231029"/><path d="M62.5 28.4 59 31.6h2.6l-1.2 2.4 3.6-3.4h-2.6l1.1-2.2Z" fill="#ffb21e"/>')
  };

  var MODES = [
    { key: 'economy', mode: 'car', cls: 'economy', name: 'Economy', seats: 4, blurb: 'Everyday saloons and hatchbacks', group: 'main' },
    { key: 'comfort', mode: 'car', cls: 'comfort', name: 'Comfort', seats: 4, blurb: 'Newer, roomier, quieter', group: 'main' },
    { key: 'executive', mode: 'car', cls: 'executive', name: 'Executive', seats: 3, blurb: 'Premium saloons, top-rated drivers', group: 'main' },
    { key: 'van', mode: 'car', cls: 'van', name: 'Van', seats: 7, blurb: 'Seven seats and real luggage room', group: 'main' },
    { key: 'motorcycle', mode: 'motorcycle', cls: 'motorcycle', name: 'Boda', seats: 1, blurb: 'Beats the jam. Helmet provided', group: 'main' },
    { key: 'tuk_tuk', mode: 'tuk_tuk', cls: 'tuk_tuk', name: 'Tuk-tuk', seats: 3, blurb: 'Short hops, open air', group: 'main' },
    { key: 'electric', mode: 'electric', cls: 'electric', name: 'Electric', seats: 4, blurb: 'Quiet, zero-tailpipe rides', group: 'main' },
    { key: 'accessible', mode: 'accessible', cls: 'accessible', name: 'Accessible', seats: 4, blurb: 'Ramp or lift for wheelchairs', group: 'main' },
    { key: 'minibus', mode: 'minibus', cls: 'minibus', name: 'Minibus', seats: 14, blurb: 'Groups, teams and families', group: 'more' },
    { key: 'shuttle', mode: 'shuttle', cls: 'shuttle', name: 'Coach', seats: 30, blurb: 'Big groups, events, long runs', group: 'more' },
    { key: 'boat', mode: 'boat', cls: 'boat', name: 'Boat', seats: 8, blurb: 'Ferries, dhows and launches', group: 'more' },
    { key: 'helicopter', mode: 'helicopter', cls: 'helicopter', name: 'Air', seats: 4, blurb: 'Charter and time-critical transfers', group: 'more' },
    { key: 'horse', mode: 'horse', cls: 'horse', name: 'Horse', seats: 1, blurb: 'Trails, beaches and highlands', group: 'more' },
    { key: 'bicycle', mode: 'bicycle', cls: 'bicycle', name: 'Bicycle', seats: 1, blurb: 'Hire or guided rides', group: 'more' },
    { key: 'e_bike', mode: 'e_bike', cls: 'e_bike', name: 'E-bike', seats: 1, blurb: 'Pedal-assisted city and coast', group: 'more' }
  ];
  var MODE_BY_KEY = {};
  MODES.forEach(function (m) { MODE_BY_KEY[m.key] = m; });
  function modeFor(modeKey, cls) {
    if (modeKey === 'car') return MODE_BY_KEY[cls] || MODE_BY_KEY.economy;
    return MODE_BY_KEY[modeKey] || MODE_BY_KEY.economy;
  }

  var NEEDS = [
    ['luggage', 'Luggage'], ['child-seat', 'Child seat'], ['wheelchair', 'Wheelchair'], ['pet', 'Pet'],
    ['quiet', 'Quiet ride'], ['meet-greet', 'Meet & greet'], ['english', 'English'], ['swahili', 'Swahili'], ['french', 'French']
  ];

  var ERR = {
    country_invalid: 'Cabana Move runs across Africa. Set a pickup on the continent.',
    mode_unavailable: 'That way of moving is not available right now.',
    class_invalid: 'Choose a ride type.',
    service_invalid: 'Choose Ride, Airport or Hourly.',
    name_required: 'Add your name so the driver knows who to look for.',
    phone_required: 'Add a phone number your driver can call.',
    email_invalid: 'That email does not look right.',
    request_malformed: 'Part of the request could not be read. Please try again.',
    pickup_required: 'Set your pickup point.',
    pickup_pin_required: 'Pin your pickup on the map.',
    destination_required: 'Where are you going?',
    destination_invalid: 'Pin your destination again.',
    schedule_invalid: 'Pick a time between 15 minutes and 60 days from now.',
    hours_invalid: 'Book between 2 and 240 hours.',
    passengers_invalid: 'Riders must be between 1 and 60.',
    luggage_invalid: 'Up to 30 bags.',
    too_many_open: 'You already have three open rides. Finish or cancel one first.',
    too_many_requests: 'Too many requests from this number in the last hour. Try again shortly.',
    market_paused: 'Cabana Move is paused in this market for now.',
    price_card_unavailable: 'That fixed price is no longer available.',
    price_card_market: 'That fixed price does not cover this route.',
    price_card_route: 'That fixed price does not cover this route.',
    offer_invalid: 'Enter a fare.',
    offer_too_low: 'That fare is too far below the going rate for a driver to take it.',
    ride_not_found: 'We could not find that trip on this device.',
    ride_not_open: 'This ride is no longer open.',
    offer_gone: 'That offer was withdrawn. Pick another.',
    offer_expired: 'That offer expired. Pick another or wait for new ones.',
    driver_unavailable: 'That driver is no longer available.',
    driver_busy: 'That driver just took another trip.',
    fixed_price: 'This is a fixed-price trip.',
    raise_too_small: 'Your new fare must be higher than the current one.',
    raise_too_large: 'That is more than triple your fare. Try a smaller raise.',
    too_many_raises: 'You have raised this fare many times. Schedule it instead?',
    too_late_to_cancel: 'This trip can no longer be cancelled here.',
    cannot_complete_yet: 'You can close the trip once it is under way.',
    rate_after_trip: 'Rate the trip once it is complete.',
    already_rated: 'You already rated this trip. Thank you.',
    rating_invalid: 'Choose one to five stars.',
    share_expired: 'This shared trip has ended.'
  };

  var ACTIVE = { searching: 1, assigned: 1, arriving: 1, in_progress: 1 };

  /* ── 2 · small helpers ───────────────────────────────────────────── */
  function $(id) { return doc.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function factor(cur) { return ZERO_DEC[String(cur || '').toUpperCase()] ? 1 : 100; }
  function currencyFor(cc) { var c = COUNTRIES[String(cc || '').toUpperCase()]; return c ? c[1] : 'USD'; }
  function money(minor, cur) {
    if (minor == null || !isFinite(minor)) return '—';
    cur = String(cur || 'KES').toUpperCase();
    var v = Number(minor) / factor(cur);
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: cur, currencyDisplay: 'code',
        maximumFractionDigits: v % 1 ? 2 : 0, minimumFractionDigits: 0 }).format(v).replace(/ /g, ' ');
    } catch (e) { return cur + ' ' + Math.round(v).toLocaleString('en'); }
  }
  function moneyHTML(minor, cur) {
    var m = money(minor, cur), c = String(cur || 'KES').toUpperCase();
    if (m.indexOf(c + ' ') !== 0) return esc(m);
    return '<span class="mv-cur">' + esc(c) + '</span>' + esc(m.slice(c.length + 1));
  }
  function digits(s) { return String(s || '').replace(/\D+/g, ''); }
  function km(a, b) {
    if (!a || !b) return 0;
    var r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function fmtKm(v) { return v == null ? '' : (v < 10 ? (Math.round(v * 10) / 10) : Math.round(v)) + ' km'; }
  function fmtMin(v) {
    if (v == null) return '';
    v = Math.max(1, Math.round(v));
    if (v < 60) return v + ' min';
    var h = Math.floor(v / 60), m = v % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }
  function fmtWhen(d, withDay) {
    if (!d) return 'Now';
    var now = new Date(), t = new Date(d);
    var time = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    var same = t.toDateString() === now.toDateString();
    var tmr = new Date(now.getTime() + 864e5).toDateString() === t.toDateString();
    if (same) return (withDay ? 'Today, ' : '') + time;
    if (tmr) return 'Tomorrow, ' + time;
    return t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + time;
  }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function greet() {
    var h = new Date().getHours();
    return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }
  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(global.localStorage.getItem(k) || 'null');
      global.localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function haptic(k) { if (M) M.haptic(k); }
  function initial(name) { return (String(name || '?').trim().charAt(0) || '?').toUpperCase(); }
  function isAirportPlace(p) {
    if (!p) return false;
    if (p.airport || p.kind === 'airport') return true;
    return /\b(airport|airstrip|aerodrome|jkia|terminal \d)\b/i.test(p.label || '');
  }
  function nearestAirports(pt, n, majorOnly) {
    var list = majorOnly ? AIRPORTS.filter(function (a) { return a.major; }) : AIRPORTS;
    if (!pt) return list.slice(0, n);
    return list.map(function (a) { return { a: a, d: km(pt, a) }; })
      .sort(function (x, y) { return x.d - y.d; }).slice(0, n).map(function (x) { x.a.d = x.d; return x.a; });
  }
  function countryOf(p) {
    if (!p) return '';
    var cc = String(p.cc || p.countryCode || '').toUpperCase();
    if (COUNTRIES[cc]) return cc;
    var near = nearestAirports(p, 1)[0];
    return near && near.d < 700 ? near.cc : cc;
  }
  function icon(name) {
    var P = {
      pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
      locate: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
      plane: '<path d="M2.5 13.5 21 6.5l-2.2 7.2-7.4 1.6-3.6 4.2-.7-4-4.6-2Z"/>',
      home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      map: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5Z"/><path d="M9 4v13M15 6.5v13"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
      chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v4M12 16h.01"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      car: '<path d="M5 17h14M6 17l1.4-5.2A2 2 0 0 1 9.3 10h5.4a2 2 0 0 1 1.9 1.8L18 17"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/>',
      flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
      mpesa: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 18.5h4"/><path d="M9 7h6M9 10.5h6M9 14h3"/>',
      card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
      up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
      bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12Z"/>',
      desk: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3ZM3 19a2 2 0 0 0 2 2h1v-6H3Z"/>',
      star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
      users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
      bag: '<rect x="4" y="7" width="16" height="13" rx="2.5"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
      note: '<path d="M4 4h16v12H8l-4 4Z"/>',
      route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
      refresh: '<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/>'
    };
    return '<svg class="mv-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }

  /* ── 3 · state ───────────────────────────────────────────────────── */
  var S = {
    stage: 'plan', service: 'ride', when: null, hours: 3,
    pickup: null, dropoff: null, route: null, routeKey: '', routeBusy: false,
    hints: {}, hintKey: '', choice: 'economy', showMore: false, card: null,
    fare: null, askOffers: false, autoAccept: true, pay: 'cash', pax: 1, bags: 0, needs: [], note: '', flight: '',
    contact: { name: '', phone: '', email: '' },
    trip: null, ref: null, token: null, share: null, shareMode: false, lastStatus: null, lastOfferIds: '',
    cards: [], stays: [], user: null, pollT: 0, ringT: 0, pinField: null, rating: 0, tags: []
  };
  var TRIPS_KEY = 'cabana-move-trips';
  var CONTACT_KEY = 'cabana-move-contact';

  function trips() { var t = store(TRIPS_KEY); return Array.isArray(t) ? t : []; }
  function rememberTrip(t) {
    var list = trips().filter(function (x) { return x.ref !== t.ref; });
    list.unshift({ ref: t.ref, token: t.token, share: t.share || null, at: new Date().toISOString() });
    store(TRIPS_KEY, list.slice(0, 30));
  }
  function tokenFor(ref) {
    var hit = trips().filter(function (x) { return x.ref === ref; })[0];
    return hit ? hit.token : null;
  }

  /* ── 4 · talking to Cabana ───────────────────────────────────────── */
  var sb = null;
  function client() {
    if (sb) return sb;
    try { sb = (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || null; } catch (e) { sb = null; }
    return sb;
  }
  function rpc(name, args) {
    var c = client();
    if (!c) return Promise.reject(new Error('offline'));
    return c.rpc(name, args || {}).then(function (r) {
      if (r.error) {
        var e = new Error(r.error.message || 'error');
        e.code = r.error.message; e.detail = r.error.details; throw e;
      }
      return r.data;
    });
  }
  function friendly(e) {
    var code = e && (e.code || e.message);
    if (code && ERR[code]) return ERR[code];
    if (code === 'offline' || /fetch|network|Failed/i.test(String(e && e.message))) return 'You seem to be offline. Check your connection and try again.';
    return 'Something went wrong. Please try again.';
  }

  /* ── 5 · feedback ────────────────────────────────────────────────── */
  var toastT = 0;
  function toast(msg, kind) {
    var t = $('mv-toast');
    if (!t) return;
    t.className = 'mv-toast' + (kind ? ' is-' + kind : '');
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('is-on'); }, kind === 'bad' ? 4600 : 3200);
  }
  function confetti() {
    if (M && M.reduced()) return;
    var box = doc.createElement('div');
    box.className = 'mv-confetti';
    var colours = ['#ffb21e', '#ff7a1a', '#ff3d8b', '#12b98f', '#7b2ff7', '#3aa0ff'];
    for (var i = 0; i < 46; i++) {
      var p = doc.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colours[i % colours.length];
      p.style.animationDelay = (Math.random() * 0.35) + 's';
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      box.appendChild(p);
    }
    doc.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 2400);
  }
  function modal(html, onMount) {
    var m = $('mv-modal');
    m.innerHTML = '<div class="mv-modal-card">' + html + '</div>';
    m.hidden = false;
    function close() { m.hidden = true; m.innerHTML = ''; doc.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); }
    doc.addEventListener('keydown', key);
    m.onclick = function (e) { if (e.target === m) close(); };
    if (onMount) onMount(m, close);
    var f = m.querySelector('button, input, textarea');
    if (f) setTimeout(function () { f.focus(); }, 60);
    return close;
  }

  /* ── 6 · the map ─────────────────────────────────────────────────── */
  var L = global.L, map = null, layers = { a: null, b: null, route: [], radar: null, driver: null, driverPath: null };
  var OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  var tileErrors = 0, tiles = null;

  function initMap() {
    if (!L || map || !$('mv-map')) return;
    var bias = null;
    try { bias = global.ApaGeo && global.ApaGeo.bias && global.ApaGeo.bias(); } catch (e) {}
    var c = bias && isFinite(bias.lat) ? [bias.lat, bias.lng] : [-1.2864, 36.8172];
    map = L.map('mv-map', {
      zoomControl: false, attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5,
      wheelPxPerZoomLevel: 110, inertia: true, tap: false, worldCopyJump: false, minZoom: 3
    }).setView(c, bias ? 13.5 : 12.5);
    L.control.attribution({ position: 'topright', prefix: false }).addTo(map);
    tiles = L.tileLayer(OSM, { maxZoom: 19, maxNativeZoom: 19, detectRetina: false,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    tiles.on('tileerror', function () {
      if (++tileErrors === 6) {
        tiles.setUrl(ESRI);
        map.attributionControl.removeAttribution(tiles.getAttribution && tiles.getAttribution());
        map.attributionControl.addAttribution('Tiles &copy; Esri');
      }
    });
    map.on('movestart', function () { if (S.pinField) $('mv-pinmode').classList.add('is-lifting'); });
    map.on('moveend', function () {
      if (S.pinField) { $('mv-pinmode').classList.remove('is-lifting'); pinLookup(); }
    });
  }

  function visibleSheet() {
    if (isDesk()) return 0;
    var v = parseFloat(getComputedStyle($('mv-app')).getPropertyValue('--sheet-visible')) || 320;
    return v;
  }
  function isDesk() { return global.matchMedia && global.matchMedia('(min-width: 960px)').matches; }
  /* Frame against where the panel is going, not where it is mid-
     animation: a stage change and a camera move start in the same frame. */
  function targetSheet() {
    if (isDesk()) return 0;
    try { var sn = snapsFor(); return sn[Math.min(S.sheetIndex || 0, sn.length - 1)] || visibleSheet(); }
    catch (e) { return visibleSheet(); }
  }
  function padding() {
    var top = (parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--top')) || 12) + 74;
    if (isDesk()) return { tl: [520, top], br: [80, 70] };
    return { tl: [78, top], br: [78, targetSheet() + 30] };
  }
  function fitTo(points, maxZoom) {
    if (!map || !points.length) return;
    var p = padding();
    if (points.length === 1) {
      var z = Math.min(maxZoom || 15, 16);
      var pt = map.project(points[0], z);
      /* Centre the point in the part of the map the sheet leaves free. */
      var off = L.point((p.tl[0] - p.br[0]) / 2, (p.tl[1] - p.br[1]) / 2);
      var ctr = map.unproject(pt.subtract(off), z);
      if (M && M.reduced()) map.setView(ctr, z, { animate: false }); else map.flyTo(ctr, z, { duration: 0.8 });
      return;
    }
    var opts = { paddingTopLeft: p.tl, paddingBottomRight: p.br, maxZoom: maxZoom || 16 };
    if (M && M.reduced()) map.fitBounds(L.latLngBounds(points), opts);
    else map.flyToBounds(L.latLngBounds(points), Object.assign({ duration: 0.9 }, opts));
  }
  function divIcon(html, size, anchor, cls) {
    return L.divIcon({ className: 'mv-marker ' + (cls || ''), html: html, iconSize: size, iconAnchor: anchor });
  }
  function placeMarker(which, place) {
    if (!map) return;
    if (layers[which]) { map.removeLayer(layers[which]); layers[which] = null; }
    if (!place) return;
    var label = esc((place.short || place.label || '').split(',')[0]);
    var html = which === 'a'
      ? '<div class="mv-marker-a"></div><div class="mv-marker-label"><em>From</em>' + label + '</div>'
      : '<div class="mv-marker-b"></div><div class="mv-marker-label"><em>To</em>' + label + '</div>';
    layers[which] = L.marker([place.lat, place.lng], { icon: divIcon(html, [24, 24], [12, 12]), keyboard: false, interactive: false, zIndexOffset: which === 'a' ? 500 : 400 }).addTo(map);
  }
  function clearRoute() {
    layers.route.forEach(function (l) { map && map.removeLayer(l); });
    layers.route = [];
  }
  function drawRoute(geom) {
    if (!map) return;
    clearRoute();
    if (!geom || geom.length < 2) return;
    var casing = L.polyline(geom, { color: '#ffffff', weight: 11, opacity: .96, lineCap: 'round', lineJoin: 'round', className: 'mv-route-casing', interactive: false });
    var line = L.polyline(geom, { color: '#ff6a1f', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false });
    var flow = L.polyline(geom, { color: '#ffffff', weight: 2.6, opacity: .95, lineCap: 'round', className: 'mv-route-flow', interactive: false });
    layers.route = [casing, line, flow];
    layers.route.forEach(function (l) { l.addTo(map); });
    /* Draw the road in, once. Removed afterwards: a fixed dash length
       breaks the moment Leaflet re-projects the path on zoom. */
    if (!(M && M.reduced())) {
      [casing, line].forEach(function (l) {
        var el = l.getElement && l.getElement();
        if (!el || !el.getTotalLength) return;
        var len = el.getTotalLength();
        el.style.strokeDasharray = len + ' ' + len;
        el.style.strokeDashoffset = String(len);
        el.getBoundingClientRect();
        el.style.transition = 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)';
        el.style.strokeDashoffset = '0';
        setTimeout(function () { el.style.transition = ''; el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; }, 1100);
      });
    }
  }
  function radar(on) {
    if (!map) return;
    if (layers.radar) { map.removeLayer(layers.radar); layers.radar = null; }
    if (!on || !S.pickup) return;
    layers.radar = L.marker([S.pickup.lat, S.pickup.lng], {
      icon: divIcon('<div class="mv-radar"><b></b><i></i><i></i><i></i></div>', [260, 260], [130, 130]),
      interactive: false, keyboard: false, zIndexOffset: -200
    }).addTo(map);
  }
  var CAR_TOP = '<svg viewBox="0 0 44 44"><rect x="13" y="5" width="18" height="34" rx="7.5" fill="#231029"/><rect x="15" y="11" width="14" height="8" rx="3" fill="#9fd9ff"/><rect x="15" y="27.5" width="14" height="6" rx="2.5" fill="#9fd9ff" opacity=".7"/><rect x="14.5" y="5.6" width="4" height="2.2" rx="1" fill="#fff6cf"/><rect x="25.5" y="5.6" width="4" height="2.2" rx="1" fill="#fff6cf"/><rect x="12" y="15" width="2" height="5" rx="1" fill="#ff7a1a"/><rect x="30" y="15" width="2" height="5" rx="1" fill="#ff7a1a"/></svg>';
  var driverAnim = 0;
  function moveDriver(lat, lng, heading) {
    if (!map) return;
    if (lat == null || lng == null) {
      if (layers.driver) { map.removeLayer(layers.driver); layers.driver = null; }
      return;
    }
    if (!layers.driver) {
      layers.driver = L.marker([lat, lng], { icon: divIcon('<div class="mv-marker-car">' + CAR_TOP + '</div>', [44, 44], [22, 22]), interactive: false, keyboard: false, zIndexOffset: 800 }).addTo(map);
    } else {
      var from = layers.driver.getLatLng(), t0 = 0;
      cancelAnimationFrame(driverAnim);
      var step = function (now) {
        if (!t0) t0 = now;
        var k = Math.min(1, (now - t0) / 1600);
        var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        layers.driver.setLatLng([from.lat + (lat - from.lat) * e, from.lng + (lng - from.lng) * e]);
        if (k < 1) driverAnim = requestAnimationFrame(step);
      };
      driverAnim = requestAnimationFrame(step);
    }
    var el = layers.driver.getElement && layers.driver.getElement();
    var car = el && el.querySelector('.mv-marker-car');
    if (car && heading != null && isFinite(heading)) car.style.transform = 'rotate(' + Number(heading) + 'deg)';
  }

  /* ── 7 · the sheet and the dock ──────────────────────────────────── */
  var sheet = null;
  function snapsFor() {
    var el = $('mv-sheet'), H = el.offsetHeight, vh = global.innerHeight;
    var dock = $('mv-dock').hidden ? 0 : $('mv-dock').offsetHeight;
    var grip = 28;
    if (S.pinField) { var dh = $('mv-dock').offsetHeight || 170; return [dh, dh]; }
    if (S.stage === 'plan') {
      var q = $('mv-quick'), r = $('mv-route');
      var anchor = q && q.offsetHeight ? q : r;
      var peek = grip + anchor.offsetTop + anchor.offsetHeight + 16;
      return [Math.min(H, Math.max(240, peek)), H];
    }
    if (S.stage === 'choose') return [Math.min(H, Math.max(340, vh * 0.6)), H];
    if (S.stage === 'offer') return [Math.min(H, Math.max(420, vh * 0.74)), H];
    /* The live peek shows what matters now: the first offer while you
       choose, the driver while they come, the PIN when they are outside. */
    var live = $('st-live');
    var head = live.querySelector('[data-peek-deep]') || live.querySelector('[data-peek]');
    var peekLive = head ? grip + head.offsetTop + head.offsetHeight + 18 + dock : 300;
    var peek = Math.min(H, Math.max(220, Math.min(peekLive, vh * 0.66)));
    var mid = Math.min(H, Math.max(peek + 40, vh * 0.62));
    return mid >= H - 20 ? [peek, H] : [peek, mid, H];
  }
  function initSheet() {
    var el = $('mv-sheet');
    if (!M) { el.style.transform = 'none'; return; }
    sheet = M.sheet(el, {
      snaps: snapsFor,
      handle: [$('mv-grip')],
      scroller: $('mv-scroll'),
      disabled: isDesk,
      onMove: function (h) {
        $('mv-app').style.setProperty('--sheet-visible', Math.round(h) + 'px');
        $('mv-fabs').classList.toggle('is-hidden', h > global.innerHeight * 0.66);
      }
    });
  }
  function relayoutSheet(index) {
    S.sheetIndex = index == null ? 0 : index;
    if (!sheet) return;
    requestAnimationFrame(function () { sheet.snapTo(S.sheetIndex); });
  }
  function setDock(html, after) {
    var d = $('mv-dock');
    if (!html) {
      d.hidden = true;
      $('mv-sheet').style.setProperty('--dock-h', '0px');
      doc.documentElement.style.setProperty('--dock-h', '0px');
      return;
    }
    d.innerHTML = html;
    d.hidden = false;
    var h = d.offsetHeight;
    doc.documentElement.style.setProperty('--dock-h', h + 'px');
    if (after) after(d);
  }
  function go(stage, snap) {
    S.stage = stage;
    $('mv-app').setAttribute('data-stage', stage);
    ['plan', 'choose', 'offer', 'live'].forEach(function (s) {
      var n = $('st-' + s);
      if (n) n.classList.toggle('is-on', s === stage);
    });
    $('mv-scroll').scrollTop = 0;
    relayoutSheet(snap);
    var h = $('st-' + stage).querySelector('h1, h2');
    if (h && stage !== 'plan') { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ── 8 · plan: where, when, what kind ────────────────────────────── */
  function setField(which, place) {
    S[which] = place;
    var btn = $(which === 'pickup' ? 'mv-from' : 'mv-to');
    var lab = $(which === 'pickup' ? 'mv-from-label' : 'mv-to-label');
    if (place) {
      btn.classList.remove('is-empty');
      lab.textContent = place.title || place.short || place.label;
    } else {
      btn.classList.add('is-empty');
      lab.textContent = which === 'pickup' ? 'Set pickup point' : (S.service === 'transfer' ? 'Airport or address' : 'Where to?');
    }
    placeMarker(which === 'pickup' ? 'a' : 'b', place);
    if (place && global.ApaGeo && global.ApaGeo.remember && place.source !== 'device') {
      try { global.ApaGeo.remember(place); } catch (e) {}
    }
    renderQuick();
    maybeAdvance();
  }
  function maybeAdvance() {
    if (!S.pickup) {
      if (map) fitTo(S.dropoff ? [[S.dropoff.lat, S.dropoff.lng]] : []);
      return;
    }
    if (S.service === 'chauffeur' || S.dropoff) { computeRoute(); return; }
    fitTo([[S.pickup.lat, S.pickup.lng]], 15);
  }
  function setService(svc) {
    S.service = svc;
    var btns = doc.querySelectorAll('#mv-svc [data-svc]');
    var i = 0;
    btns.forEach(function (b, n) { var on = b.getAttribute('data-svc') === svc; b.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) i = n; });
    $('mv-svc-ink').style.transform = 'translateX(' + (i * 100) + '%)';
    var hourly = svc === 'chauffeur';
    $('mv-route').classList.toggle('is-hourly', hourly);
    $('mv-to').hidden = hourly;
    $('mv-hours').hidden = !hourly;
    $('mv-to-small').textContent = svc === 'transfer' ? 'Airport or address' : 'Destination';
    if (!S.dropoff) $('mv-to-label').textContent = svc === 'transfer' ? 'Airport or address' : 'Where to?';
    $('mv-h1-text').textContent = hourly ? 'Your driver, by the hour' : svc === 'transfer' ? 'Airport, sorted.' : 'Where to?';
    renderQuick();
    relayoutSheet(0);
    if (S.pickup && (hourly || S.dropoff)) computeRoute();
  }
  function setHours(n) {
    S.hours = Math.max(2, Math.min(12, n));
    $('mv-hours-val').textContent = S.hours;
    $('mv-hours-out').textContent = S.hours + 'h';
    $('mv-hours-dn').disabled = S.hours <= 2;
    $('mv-hours-up').disabled = S.hours >= 12;
    S.hints = {}; S.hintKey = '';
  }
  function airportPlace(a) {
    return { label: a.label, short: a.label, title: a.label, lat: a.lat, lng: a.lng, cc: a.cc, kind: 'airport', airport: true, iata: a.iata, source: 'cabana' };
  }
  function renderQuick() {
    var q = $('mv-quick');
    if (!q) return;
    var out = [];
    if (S.service === 'chauffeur') {
      [[3, 'Errands · 3h'], [5, 'Half day · 5h'], [10, 'Full day · 10h']].forEach(function (x) {
        out.push('<button class="mv-chip' + (S.hours === x[0] ? ' is-on' : '') + '" type="button" data-hours="' + x[0] + '">' + icon('clock') + esc(x[1]) + '</button>');
      });
    } else {
      if (!S.pickup) out.push('<button class="mv-chip mv-chip--sun" type="button" data-quick="locate">' + icon('locate') + 'Use my location</button>');
      nearestAirports(S.pickup || biasPoint(), S.service === 'transfer' ? 4 : 1, S.service !== 'transfer').forEach(function (a) {
        out.push('<button class="mv-chip" type="button" data-airport="' + a.iata + '">' + icon('plane') + '<b>' + a.iata + '</b><em>' + esc(a.label.split(',')[0]) + '</em></button>');
      });
      S.stays.slice(0, 3).forEach(function (st, i) {
        if (st.lat == null) return;
        out.push('<button class="mv-chip" type="button" data-stay="' + i + '">' + icon('home') + esc(String(st.title || 'My stay').slice(0, 26)) + '</button>');
      });
      if (S.service !== 'transfer') {
        var rec = [];
        try { rec = (global.ApaGeo && global.ApaGeo.recents && global.ApaGeo.recents()) || []; } catch (e) {}
        rec.slice(0, 4).forEach(function (p, i) {
          if (S.pickup && Math.abs(p.lat - S.pickup.lat) < 1e-4 && Math.abs(p.lng - S.pickup.lng) < 1e-4) return;
          out.push('<button class="mv-chip" type="button" data-recent="' + i + '">' + icon('clock') + esc(String(p.short || p.label).split(',')[0].slice(0, 26)) + '</button>');
        });
      }
    }
    q.innerHTML = out.join('');
  }
  function biasPoint() {
    try { var b = global.ApaGeo && global.ApaGeo.bias && global.ApaGeo.bias(); if (b && isFinite(b.lat)) return b; } catch (e) {}
    return { lat: -1.2864, lng: 36.8172 };
  }
  function onQuick(e) {
    var b = e.target.closest('button');
    if (!b) return;
    haptic('tick');
    if (b.hasAttribute('data-hours')) { setHours(+b.getAttribute('data-hours')); renderQuick(); if (S.pickup) computeRoute(); return; }
    if (b.getAttribute('data-quick') === 'locate') { locateMe(true); return; }
    if (b.hasAttribute('data-airport')) {
      var a = AIRPORTS.filter(function (x) { return x.iata === b.getAttribute('data-airport'); })[0];
      if (!a) return;
      /* Airport as the destination, unless you are already standing in one. */
      if (S.pickup && isAirportPlace(S.pickup) && km(S.pickup, a) < 3) { setField('dropoff', null); openSearch('dropoff'); return; }
      setField('dropoff', airportPlace(a));
      return;
    }
    if (b.hasAttribute('data-stay')) {
      var st = S.stays[+b.getAttribute('data-stay')];
      if (st) setField('dropoff', { label: [st.title, st.area, st.city].filter(Boolean).join(', '), title: st.title, lat: +st.lat, lng: +st.lng, city: st.city, stayRef: st.ref, source: 'stay' });
      return;
    }
    if (b.hasAttribute('data-recent')) {
      var rec = (global.ApaGeo && global.ApaGeo.recents && global.ApaGeo.recents()) || [];
      var p = rec[+b.getAttribute('data-recent')];
      if (p) setField('dropoff', p);
    }
  }

  function locateMe(announce) {
    if (!global.ApaGeo || !global.ApaGeo.locate) { toast('Location is not available on this device.', 'bad'); return Promise.resolve(null); }
    var btn = $('mv-locate');
    btn.classList.add('is-busy');
    return global.ApaGeo.locate({ reason: 'ride pickup', timeout: 12000 }).then(function (p) {
      btn.classList.remove('is-busy');
      p.title = 'Current location';
      p.label = p.label || 'Current location';
      setField('pickup', p);
      if (announce) toast('Pickup set to where you are.', 'good');
      return p;
    }, function (err) {
      btn.classList.remove('is-busy');
      if (announce) toast((err && err.message) || 'Could not read your location.', 'bad');
      return null;
    });
  }

  /* ── 9 · search and choose-on-map ────────────────────────────────── */
  var searchField = null, searchSeq = 0, searchT = 0, searchRows = [], hi = -1;
  function openSearch(field) {
    searchField = field;
    var ov = $('mv-search');
    ov.hidden = false;
    $('mv-search-dot').className = 'mv-dot ' + (field === 'pickup' ? 'a' : 'b');
    var input = $('mv-search-input');
    var cur = S[field];
    input.value = cur && cur.source !== 'device' ? (cur.short || cur.label || '') : '';
    input.placeholder = field === 'pickup' ? 'Where should the driver meet you?' : (S.service === 'transfer' ? 'Airport, hotel or address' : 'Where are you going?');
    renderResults([], '');
    setTimeout(function () { input.focus(); if (input.value) input.select(); }, 50);
    if (input.value) runSearch(input.value);
  }
  function closeSearch() { $('mv-search').hidden = true; searchField = null; }
  function renderResults(rows, q) {
    searchRows = rows; hi = -1;
    var out = [];
    var specials = [];
    if (!q) {
      if (searchField === 'pickup') specials.push({ special: 'locate', title: 'Use my current location', sub: 'Most accurate outdoors', ic: 'locate' });
      specials.push({ special: 'pin', title: 'Choose on the map', sub: 'Drag the map to the exact gate or corner', ic: 'map' });
      if (searchField === 'dropoff' || S.service === 'transfer') {
        nearestAirports(S.pickup || biasPoint(), 3).forEach(function (a) {
          specials.push({ airport: a, title: a.label, sub: a.iata + (a.d != null ? ' · ' + fmtKm(a.d) + ' away' : ''), ic: 'plane' });
        });
      }
      S.stays.slice(0, 3).forEach(function (st) {
        if (st.lat == null) return;
        specials.push({ stay: st, title: st.title || 'My stay', sub: 'Your Cabana stay' + (st.area ? ' · ' + st.area : ''), ic: 'home' });
      });
      var rec = [];
      try { rec = (global.ApaGeo && global.ApaGeo.recents && global.ApaGeo.recents()) || []; } catch (e) {}
      rec.slice(0, 5).forEach(function (p) { specials.push({ place: p, title: p.short || p.label, sub: 'Recent', ic: 'clock' }); });
    }
    var all = specials.concat(rows.map(function (p) { return { place: p, title: p.name || p.short || p.label, sub: p.label, ic: p.kind === 'airport' ? 'plane' : 'pin' }; }));
    searchRows = all;
    all.forEach(function (r, i) {
      var t = esc(r.title);
      if (q && r.place) {
        var ix = String(r.title).toLowerCase().indexOf(q.toLowerCase());
        if (ix > -1) t = esc(r.title.slice(0, ix)) + '<mark>' + esc(r.title.slice(ix, ix + q.length)) + '</mark>' + esc(r.title.slice(ix + q.length));
      }
      var dist = '';
      if (r.place && S.pickup && searchField === 'dropoff') dist = '<em>' + fmtKm(km(S.pickup, r.place)) + '</em>';
      out.push('<li><button class="mv-result' + (r.special ? ' is-special' : '') + '" type="button" role="option" data-i="' + i + '"><i>' + icon(r.ic) + '</i><span><b>' + t + '</b><small>' + esc(r.sub || '') + '</small></span>' + dist + '</button></li>');
    });
    if (q && !rows.length) out.push('<li class="mv-empty">' + icon('search') + '<b>Still looking…</b><span>Try an estate, a landmark or a street. Or choose on the map.</span></li>');
    $('mv-results').innerHTML = out.join('');
  }
  function runSearch(q) {
    q = String(q || '').trim();
    clearTimeout(searchT);
    if (q.length < 2) { renderResults([], ''); return; }
    var mySeq = ++searchSeq;
    searchT = setTimeout(function () {
      if (!global.ApaGeo) return;
      global.ApaGeo.search(q, { limit: 8, near: S.pickup || biasPoint() }).then(function (rows) {
        if (mySeq !== searchSeq) return;
        renderResults(rows || [], q);
      });
    }, 170);
  }
  function pickResult(i) {
    var r = searchRows[i];
    if (!r) return;
    var field = searchField;
    haptic('tick');
    if (r.special === 'locate') { closeSearch(); locateMe(true); return; }
    if (r.special === 'pin') { closeSearch(); startPin(field); return; }
    closeSearch();
    if (r.airport) { setField(field, airportPlace(r.airport)); return; }
    if (r.stay) { var st = r.stay; setField(field, { label: [st.title, st.area, st.city].filter(Boolean).join(', '), title: st.title, lat: +st.lat, lng: +st.lng, city: st.city, stayRef: st.ref, source: 'stay' }); return; }
    if (r.place) setField(field, r.place);
  }

  var pinT = 0, pinSeq = 0, pinPlace = null;
  /* Where the pin's tip actually is, measured rather than recomputed,
     so the CSS and the lookup can never disagree. */
  function pinXY() {
    var pin = $('mv-pinmode'), box = $('mv-map').getBoundingClientRect();
    var r = pin.getBoundingClientRect();
    if (!r.height) { var sz = map.getSize(); return [sz.x / 2, sz.y / 2]; }
    return [r.left + r.width / 2 - box.left, r.bottom - box.top];
  }
  function pinPoint() { return map.containerPointToLatLng(pinXY()); }
  function startPin(field) {
    if (!map) { toast('The map is still loading.', 'bad'); return; }
    S.pinField = field;
    $('mv-app').classList.add('is-pinning');
    setDock('<div class="mv-card" style="padding:12px 14px;margin-bottom:10px"><div class="mv-line" style="min-height:0;padding:0">' + icon('pin') +
      '<div class="mv-line-body"><small>' + (field === 'pickup' ? 'Pickup' : 'Destination') + '</small><b id="mv-pin-label">Move the map to the exact spot</b></div></div></div>' +
      '<div class="mv-row"><button class="mv-btn is-ghost is-sm" type="button" data-act="pin-cancel">Cancel</button><button class="mv-btn is-sm" type="button" data-act="pin-ok" id="mv-pin-ok">Confirm ' + (field === 'pickup' ? 'pickup' : 'stop') + '</button></div>');
    var dh = $('mv-dock').offsetHeight || 170;
    $('mv-app').style.setProperty('--sheet-visible', dh + 'px');
    $('mv-pinmode').hidden = false;
    if (sheet) sheet.snapTo(0);
    var cur = S[field] || (field === 'dropoff' ? S.pickup : null) || biasPoint();
    var z = Math.max(map.getZoom(), 16.5);
    /* Put the chosen point under the pin's tip, not under the centre of
       a map that is half covered by the panel. */
    map.setView([cur.lat, cur.lng], z, { animate: false });
    var p = pinXY(), sz = map.getSize();
    map.panBy([sz.x / 2 - p[0], sz.y / 2 - p[1]], { animate: false });
    pinLookup();
  }
  function pinLookup() {
    if (!S.pinField) return;
    clearTimeout(pinT);
    var ll = pinPoint(), seq = ++pinSeq;
    pinPlace = { lat: ll.lat, lng: ll.lng, label: 'Pinned spot', short: 'Pinned spot', title: 'Pinned spot', source: 'pin' };
    var lab = $('mv-pin-label');
    if (lab) lab.textContent = 'Finding the address…';
    pinT = setTimeout(function () {
      if (!global.ApaGeo) return;
      global.ApaGeo.reverse(ll.lat, ll.lng).then(function (p) {
        if (seq !== pinSeq || !S.pinField) return;
        if (p) {
          pinPlace = Object.assign({}, p, { lat: ll.lat, lng: ll.lng, source: 'pin' });
          pinPlace.title = 'Pin · ' + String(p.short || p.label).split(',').slice(0, 2).join(',');
        }
        var l2 = $('mv-pin-label');
        if (l2) l2.textContent = pinPlace.title || 'Pinned spot';
      });
    }, 380);
  }
  function endPin(ok) {
    var field = S.pinField;
    S.pinField = null;
    $('mv-app').classList.remove('is-pinning');
    $('mv-pinmode').hidden = true;
    setDock(null);
    if (ok && pinPlace && field) setField(field, pinPlace);
    else relayoutSheet(0);
  }

  /* ── 10 · the road and the fair range ────────────────────────────── */
  function whenISO() { return S.when ? new Date(S.when).toISOString() : null; }
  /* Same model as /api/route: free-flow time, lifted by the hour. */
  function trafficFactor(d) {
    var h = d.getHours(), wk = d.getDay() === 0 || d.getDay() === 6;
    if (wk) return h >= 11 && h < 19 ? 1.3 : h >= 23 || h < 7 ? 1 : 1.12;
    if (h >= 23 || h < 6) return 1;
    if (h === 6) return 1.2;
    if (h >= 7 && h < 10) return 1.85;
    if (h >= 10 && h < 16) return 1.35;
    if (h >= 16 && h < 20) return 1.95;
    return 1.2;
  }
  function routeFallback(a, b) {
    var d = km(a, b), road = d * (d > 45 ? 1.18 : 1.32);
    var city = Math.min(road, 20), free = city / 38 * 60 + (road - city) / 75 * 60;
    var f = trafficFactor(S.when ? new Date(S.when) : new Date());
    var mins = free * f;
    return { ok: true, provider: 'estimate', basis: 'estimate', distance_km: Math.round(road * 10) / 10, duration_min: Math.max(1, Math.round(mins)),
      traffic: f >= 1.8 ? 'heavy' : f >= 1.25 ? 'moderate' : 'light', geometry: [[a.lat, a.lng], [b.lat, b.lng]] };
  }
  function computeRoute() {
    var a = S.pickup, b = S.dropoff;
    if (!a) return;
    var hourly = S.service === 'chauffeur';
    S.card = null;
    if (hourly && !b) {
      S.route = null; S.routeKey = 'hourly:' + a.lat.toFixed(5) + ',' + a.lng.toFixed(5) + ':' + (S.when || '');
      S.routeBusy = false;
      clearRoute(); placeMarker('b', null);
      fitTo([[a.lat, a.lng]], 15);
      showChoose();
      loadHints();
      return;
    }
    if (!b) return;
    if (km(a, b) < 0.08) { toast('Pickup and destination are the same place.', 'bad'); return; }
    var at = S.when ? new Date(S.when) : new Date();
    at.setMinutes(Math.floor(at.getMinutes() / 15) * 15, 0, 0);
    var key = [a.lat.toFixed(5), a.lng.toFixed(5), b.lat.toFixed(5), b.lng.toFixed(5), at.toISOString()].join('|');
    if (key === S.routeKey && S.route) { showChoose(); afterRoute(); return; }
    S.routeKey = key; S.routeBusy = true; S.route = null; S.hintKey = ''; S.hints = {};
    showChoose();
    renderChoose();
    var url = '/api/route?from=' + a.lat.toFixed(6) + ',' + a.lng.toFixed(6) + '&to=' + b.lat.toFixed(6) + ',' + b.lng.toFixed(6) +
      '&at=' + encodeURIComponent(at.toISOString()) + '&cc=' + encodeURIComponent(countryOf(a));
    var ctrl = global.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 7000);
    fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (r) {
        clearTimeout(timer);
        if (key !== S.routeKey) return;
        S.route = r && r.ok && r.distance_km ? r : routeFallback(a, b);
        S.routeBusy = false;
        afterRoute();
      });
  }
  function afterRoute() {
    if (S.route && S.route.geometry) {
      drawRoute(S.route.geometry);
      fitTo(S.route.geometry.length > 1 ? S.route.geometry : [[S.pickup.lat, S.pickup.lng], [S.dropoff.lat, S.dropoff.lng]]);
    }
    loadHints();
  }
  function hintPayload(m) {
    var a = S.pickup, b = S.dropoff;
    return {
      country_code: countryOf(a), city: a.city || '', mode_key: m.mode, 'class': m.mode === 'car' ? m.cls : null,
      pickup_lat: a.lat, pickup_lng: a.lng, dropoff_lat: b ? b.lat : null, dropoff_lng: b ? b.lng : null,
      distance_km: S.route ? S.route.distance_km : null, duration_min: S.route ? S.route.duration_min : null,
      scheduled_for: whenISO(), hours: S.service === 'chauffeur' ? S.hours : null,
      airport: isAirportPlace(a) || isAirportPlace(b)
    };
  }
  function loadHints() {
    var key = S.routeKey + '|' + S.service + '|' + S.hours + '|' + (S.when || '');
    if (key === S.hintKey) { renderChoose(); return; }
    S.hintKey = key; S.hints = {};
    renderChoose();
    var list = MODES.filter(function (m) { return m.group === 'main' || S.showMore; });
    list.forEach(function (m) {
      rpc('ride_fare_hint', { p: hintPayload(m) }).then(function (h) {
        if (key !== S.hintKey) return;
        S.hints[m.key] = h || { available: false };
        paintOption(m);
      }, function () {
        if (key !== S.hintKey) return;
        S.hints[m.key] = { available: false, reason: 'offline' };
        paintOption(m);
      });
    });
    loadCards();
  }
  function loadCards() {
    var c = client();
    if (!c || S.service === 'chauffeur') return;
    c.from('ride_price_cards').select('id,market_id,mode_key,label,amount_minor,currency,unit,route_from,route_to,bidirectional,terms,sort')
      .order('sort', { ascending: true }).limit(40).then(function (r) {
        S.cards = (r && r.data) || [];
        renderChoose();
      }, function () {});
  }
  function matchingCards() {
    if (!S.pickup || !S.dropoff) return [];
    var from = (S.pickup.label || '') + ' ' + (S.pickup.title || ''), to = (S.dropoff.label || '') + ' ' + (S.dropoff.title || '');
    function has(hay, needle) { return needle && hay.toLowerCase().indexOf(String(needle).toLowerCase()) > -1; }
    return S.cards.filter(function (cd) {
      if (cd.unit !== 'trip') return false;
      return (has(from, cd.route_from) && has(to, cd.route_to)) || (cd.bidirectional && has(from, cd.route_to) && has(to, cd.route_from));
    });
  }

  /* ── 11 · choose ─────────────────────────────────────────────────── */
  function trafficPill() {
    var r = S.route;
    if (!r) return '';
    var t = r.traffic, label = t === 'heavy' ? 'Heavy traffic' : t === 'moderate' ? 'Some traffic' : t === 'live' ? 'Live traffic' : 'Clear roads';
    return '<span class="mv-pill is-' + esc(t) + '">' + icon('car') + label + '</span>';
  }
  function showChoose() {
    if (S.stage !== 'choose') go('choose', 0);
  }
  function optionHTML(m) {
    var on = S.choice === m.key;
    return '<button class="mv-opt' + (on ? ' is-on' : '') + '" type="button" data-opt="' + m.key + '" aria-pressed="' + on + '" data-press>' +
      '<span class="mv-opt-art">' + (ART[m.key] || ART.economy) + '</span>' +
      '<span class="mv-opt-body"><b>' + esc(m.name) + ' <small>' + icon('users') + m.seats + '</small></b><span>' + esc(m.blurb) + '</span></span>' +
      '<span class="mv-opt-price" id="mv-price-' + m.key + '">' + priceHTML(m) + '</span></button>';
  }
  function priceHTML(m) {
    var h = S.hints[m.key];
    if (!h) return '<span class="mv-skel"></span><small>&nbsp;</small>';
    if (h.available) {
      return '<b>' + esc(money(h.suggested, h.currency)) + '</b><small>' + (h.hourly ? 'for ' + S.hours + ' h' : 'suggested') + '</small>';
    }
    return '<b style="font-size:13px">Get offers</b><small>You name it</small>';
  }
  function paintOption(m) {
    var el = $('mv-price-' + m.key);
    if (el) el.innerHTML = priceHTML(m);
    if (m.key === S.choice) paintChooseDock();
  }
  function renderChoose() {
    var host = $('st-choose');
    if (!host) return;
    var a = S.pickup, b = S.dropoff, hourly = S.service === 'chauffeur';
    var title = hourly ? 'Choose your car' : 'Choose your ride';
    var sub = hourly ? ('From ' + esc(String((a && (a.title || a.short || a.label)) || '').split(',')[0]) + ' · ' + S.hours + ' hours')
      : esc(String((a && (a.title || a.short || a.label)) || '').split(',')[0]) + ' → ' + esc(String((b && (b.title || b.short || b.label)) || '').split(',')[0]);
    var meta = '';
    if (S.route) meta += '<span class="mv-pill">' + icon('route') + fmtKm(S.route.distance_km) + '</span><span class="mv-pill">' + icon('clock') + fmtMin(S.route.duration_min) + '</span>' + trafficPill();
    else if (S.routeBusy) meta += '<span class="mv-pill"><span class="mv-dots"><i></i><i></i><i></i></span>Measuring the road</span>';
    meta += '<span class="mv-pill is-ink">' + icon('clock') + esc(fmtWhen(S.when)) + '</span>';
    var cards = matchingCards();
    var fixed = cards.map(function (cd) {
      var on = S.card && S.card.id === cd.id;
      return '<button class="mv-opt' + (on ? ' is-on' : '') + '" type="button" data-card="' + esc(cd.id) + '"><span class="mv-opt-tag">Fixed price</span>' +
        '<span class="mv-opt-art">' + (ART[cd.mode_key === 'car' ? 'comfort' : cd.mode_key] || ART.comfort) + '</span>' +
        '<span class="mv-opt-body"><b>' + esc(cd.label) + '</b><span>' + esc(cd.terms || 'One price, agreed before you go') + '</span></span>' +
        '<span class="mv-opt-price"><b>' + esc(money(cd.amount_minor, cd.currency)) + '</b><small>no haggling</small></span></button>';
    }).join('');
    var main = MODES.filter(function (m) { return m.group === 'main'; }).map(optionHTML).join('');
    var more = MODES.filter(function (m) { return m.group === 'more'; }).map(optionHTML).join('');
    host.innerHTML =
      '<div class="mv-stage-head"><button class="mv-back" type="button" data-act="to-plan" aria-label="Change route">' + icon('back') + '</button>' +
      '<div class="mv-titles"><h2 class="mv-h2">' + title + '</h2><p>' + sub + '</p></div></div>' +
      '<div class="mv-trip-meta">' + meta + '</div>' +
      (fixed ? '<div class="mv-opts" style="margin-bottom:8px">' + fixed + '</div>' : '') +
      '<div class="mv-opts" role="group" aria-label="Ride types">' + main + '</div>' +
      '<button class="mv-more-toggle" type="button" data-act="more" aria-expanded="' + S.showMore + '">More ways to move ' +
      '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<div class="mv-more' + (S.showMore ? ' is-on' : '') + '">' + more + '</div>' +
      '<p class="mv-foot-note">Suggested fares come from local rates for this road and hour. You set the final price.</p>';
    paintChooseDock();
  }
  function paintChooseDock() {
    if (S.stage !== 'choose') return;
    var m = MODE_BY_KEY[S.choice] || MODE_BY_KEY.economy;
    var h = S.hints[m.key];
    var label = S.card ? S.card.label : m.name;
    var price = S.card ? money(S.card.amount_minor, S.card.currency) : h && h.available ? '~' + money(h.suggested, h.currency) : 'Name your fare';
    var ready = !!S.pickup && (S.service === 'chauffeur' || !!S.dropoff);
    setDock('<button class="mv-btn" type="button" data-act="to-offer" data-press' + (ready ? '' : ' disabled') + '>Continue with ' + esc(label) +
      ' <small>' + esc(price) + '</small></button>');
  }

  /* ── 12 · offer: the fare, the payment, the rider ────────────────── */
  function currentHint() { return S.card ? null : S.hints[S.choice]; }
  function currency() {
    if (S.card) return S.card.currency;
    var h = currentHint();
    return (h && h.currency) || currencyFor(countryOf(S.pickup));
  }
  function niceStep(h) {
    var cur = currency(), f = factor(cur);
    var base = h && h.available ? h.suggested : 0;
    var raw = base * 0.05;
    var steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].map(function (x) { return x * f; });
    var round = (h && h.round) || f * 10;
    for (var i = 0; i < steps.length; i++) if (steps[i] >= raw && steps[i] >= round) return steps[i];
    return Math.max(round, f * 50);
  }
  function minFare(h) { return h && h.available ? Math.round(h.low * 0.6) : 1; }
  function toOffer() {
    var h = currentHint();
    if (S.card) { S.fare = S.card.amount_minor; S.askOffers = false; }
    else if (h && h.available) { if (S.fare == null || S.fareFor !== S.choice + S.hintKey) S.fare = h.suggested; S.askOffers = false; }
    else { S.fare = null; S.askOffers = true; }
    S.fareFor = S.choice + S.hintKey;
    var cc = countryOf(S.pickup);
    if (!S.payTouched) S.pay = cc === 'KE' || cc === 'TZ' ? 'mpesa' : 'cash';
    go('offer', 0);
    renderOffer();
  }
  function verdict(h) {
    if (!h || !h.available || S.fare == null) return '';
    var f = S.fare;
    if (f < h.low) return '<span class="mv-verdict is-low">' + icon('info') + 'Below the usual range. Drivers may take longer.</span>';
    if (f < h.suggested) return '<span class="mv-verdict is-fair">' + icon('check') + 'Fair. A driver should take it.</span>';
    return '<span class="mv-verdict is-strong">' + icon('bolt') + 'Strong offer. Quick pickup likely.</span>';
  }
  function meterPos(h) {
    if (!h || !h.available || S.fare == null) return 50;
    var lo = h.low * 0.6, hiV = h.high * 1.3;
    return Math.max(2, Math.min(98, (S.fare - lo) / (hiV - lo) * 100));
  }
  function renderOffer() {
    var host = $('st-offer');
    var m = MODE_BY_KEY[S.choice] || MODE_BY_KEY.economy;
    var h = currentHint(), cur = currency();
    var fixed = !!S.card;
    var now = !S.when;
    var fareBlock;
    if (fixed) {
      fareBlock = '<div class="mv-fare"><div class="mv-fare-top">' + icon('check') + 'Fixed price</div>' +
        '<div class="mv-fare-row" style="justify-content:center"><div class="mv-fare-val"><output>' + esc(money(S.card.amount_minor, S.card.currency)) + '</output>' +
        '<small>' + esc(S.card.terms || 'Agreed before you go. No meter, no surge.') + '</small></div></div></div>';
    } else {
      var ask = S.askOffers;
      fareBlock = '<div class="mv-fare" id="mv-fare-card"><div class="mv-fare-top">' + icon('route') + (h && h.available ? 'Fair range ' + esc(money(h.low, cur)) + ' – ' + esc(money(h.high, cur)) : 'No local guide yet. Drivers will price it') + '</div>' +
        (ask ? '<div class="mv-fare-row" style="justify-content:center"><div class="mv-fare-val"><output style="font-size:24px;white-space:normal">Drivers name the price</output><small>You will see every offer and choose. Nothing is agreed until you accept.</small></div></div>'
          : h && h.available
            ? '<div class="mv-fare-row"><button class="mv-fare-btn" type="button" data-act="fare-dn" aria-label="Lower fare"><svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>' +
              '<div class="mv-fare-val"><button class="mv-fare-tap" type="button" data-act="fare-type" aria-label="Type an exact fare"><output id="mv-fare-out" aria-live="polite">' + moneyHTML(S.fare, cur) + '</output></button>' +
              '<small>Suggested ' + esc(money(h.suggested, cur)) + (h.night ? ' · night rate' : '') + '</small></div>' +
              '<button class="mv-fare-btn" type="button" data-act="fare-up" aria-label="Raise fare"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></button></div>' +
              '<div class="mv-meter" aria-hidden="true"><i id="mv-meter-dot" style="left:' + meterPos(h) + '%"></i></div><div class="mv-meter-legend"><span>Longer wait</span><span>Faster pickup</span></div>' +
              '<div id="mv-verdict">' + verdict(h) + '</div>'
            : '<label class="sr-only" for="mv-fare-input">Your fare in ' + esc(cur) + '</label>' +
              '<input class="mv-input" id="mv-fare-input" inputmode="decimal" placeholder="Your fare in ' + esc(cur) + '" style="margin-top:12px;text-align:center;font:800 26px/1 var(--display);height:64px" value="' + (S.fare ? (S.fare / factor(cur)) : '') + '">' +
              '<small style="display:block;color:var(--mute);font-weight:650;font-size:12.5px;margin-top:8px">Drivers can still counter. You choose.</small>') +
        '</div>' +
        '<div class="mv-card" style="margin-top:10px">' +
          '<label class="mv-line">' + icon('users') + '<span class="mv-line-body"><b>Let drivers make offers</b><small>Skip the fare. Drivers send prices and you pick.</small></span>' +
          '<span class="mv-switch"><input type="checkbox" id="mv-ask" ' + (ask ? 'checked' : '') + '><i></i></span></label>' +
          (now && !ask ? '<label class="mv-line">' + icon('bolt') + '<span class="mv-line-body"><b>Accept the first driver at my fare</b><small>Fastest pickup. Counter-offers still wait for you.</small></span>' +
            '<span class="mv-switch"><input type="checkbox" id="mv-auto" ' + (S.autoAccept ? 'checked' : '') + '><i></i></span></label>' : '') +
        '</div>';
    }
    var needs = NEEDS.map(function (n) {
      var on = S.needs.indexOf(n[0]) > -1;
      return '<button class="mv-chip" type="button" data-need="' + n[0] + '" aria-pressed="' + on + '">' + esc(n[1]) + '</button>';
    }).join('');
    var airport = S.service === 'transfer' || isAirportPlace(S.pickup) || isAirportPlace(S.dropoff);
    host.innerHTML =
      '<div class="mv-stage-head"><button class="mv-back" type="button" data-act="to-choose" aria-label="Back to ride types">' + icon('back') + '</button>' +
      '<div class="mv-titles"><h2 class="mv-h2">' + (fixed ? 'Confirm your transfer' : 'Name your fare') + '</h2><p>' + esc(fixed ? S.card.label : m.name) + ' · ' + esc(fmtWhen(S.when, true)) +
      (S.route ? ' · ' + esc(fmtKm(S.route.distance_km)) : S.service === 'chauffeur' ? ' · ' + S.hours + ' h' : '') + '</p></div></div>' +
      fareBlock +
      '<div class="mv-group"><div class="mv-label"><span>How you pay your driver</span><small>Cabana takes 0%</small></div>' +
      '<div class="mv-pay" role="group" aria-label="Payment">' +
        '<button type="button" data-pay="mpesa" aria-pressed="' + (S.pay === 'mpesa') + '">' + icon('mpesa') + 'M-Pesa</button>' +
        '<button type="button" data-pay="cash" aria-pressed="' + (S.pay === 'cash') + '">' + icon('cash') + 'Cash</button>' +
        '<button type="button" data-pay="card" aria-pressed="' + (S.pay === 'card') + '">' + icon('card') + 'Card</button></div>' +
      '<div class="mv-pay-note">' + icon('info') + '<span>You pay the driver directly at the end of the trip. Cabana never holds your fare and adds nothing on top.</span></div></div>' +
      '<div class="mv-group"><div class="mv-label"><span>Riders and bags</span></div><div class="mv-card">' +
        '<div class="mv-line">' + icon('users') + '<span class="mv-line-body"><b>Riders</b><small>Including you</small></span>' + stepper('pax', S.pax, 1, Math.min(60, Math.max(1, m.seats))) + '</div>' +
        '<div class="mv-line">' + icon('bag') + '<span class="mv-line-body"><b>Bags</b><small>Suitcases or large bags</small></span>' + stepper('bags', S.bags, 0, 12) + '</div></div></div>' +
      '<div class="mv-group"><div class="mv-label"><span>Anything the driver should know</span></div><div class="mv-needs">' + needs + '</div>' +
        (airport ? '<input class="mv-input" id="mv-flight" style="margin-top:10px" placeholder="Flight number (optional), e.g. KQ101" autocapitalize="characters" value="' + esc(S.flight) + '">' : '') +
        '<textarea class="mv-input" id="mv-note" style="margin-top:10px" maxlength="400" placeholder="Gate colour, building, which entrance…">' + esc(S.note) + '</textarea></div>' +
      '<div class="mv-group"><div class="mv-label"><span>Your details</span><small>Shared with your driver only</small></div><div class="mv-fields">' +
        '<input class="mv-input" id="mv-name" autocomplete="name" placeholder="Your name" value="' + esc(S.contact.name) + '">' +
        '<input class="mv-input" id="mv-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Phone, e.g. +254 712 345 678" value="' + esc(S.contact.phone) + '">' +
        '<input class="mv-input" id="mv-email" type="email" inputmode="email" autocomplete="email" placeholder="Email for your receipt (optional)" value="' + esc(S.contact.email) + '">' +
      '</div><p class="mv-err" id="mv-offer-err" role="alert"></p></div>';
    paintOfferDock();
  }
  function stepper(id, val, min, max) {
    return '<div class="mv-stepper"><button type="button" data-step="' + id + '" data-d="-1" aria-label="Fewer"' + (val <= min ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg></button>' +
      '<output id="mv-' + id + '-out">' + val + '</output><button type="button" data-step="' + id + '" data-d="1" aria-label="More"' + (val >= max ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg></button></div>';
  }
  var swipeCtl = null;
  function paintOfferDock() {
    var cur = currency();
    var sub = S.askOffers ? 'Drivers will send offers' : money(S.fare, cur) + ' · pay ' + (S.pay === 'mpesa' ? 'by M-Pesa' : S.pay === 'card' ? 'by card' : 'in cash');
    setDock('<div class="cm-swipe" id="mv-swipe"><span class="cm-swipe-label">' + (S.when ? 'Slide to book' : 'Slide to request') + '<small>' + esc(sub) + '</small></span>' +
      '<button class="cm-swipe-knob" type="button">' + '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>', function (d) {
      if (swipeCtl) swipeCtl.destroy();
      if (M) swipeCtl = M.swipe(d.querySelector('#mv-swipe'), { onConfirm: submit });
      else d.querySelector('.cm-swipe-knob').onclick = submit;
    });
  }
  function updateFare(v) {
    var h = currentHint(), cur = currency();
    var lo = minFare(h), prev = S.fare;
    S.fare = Math.max(lo, Math.round(v));
    var out = $('mv-fare-out');
    if (out) {
      var f = factor(cur), c = String(cur).toUpperCase();
      /* Roll the number, keep the small currency code still. */
      out.innerHTML = '<span class="mv-cur">' + esc(c) + '</span><span id="mv-fare-num"></span>';
      var num = $('mv-fare-num');
      num.__tick = prev != null ? prev : S.fare;
      var fmt = function (n) { var v = Math.round(n) / f; return v.toLocaleString('en', { maximumFractionDigits: v % 1 ? 2 : 0 }); };
      if (M) M.ticker(num, S.fare, fmt, 360); else num.textContent = fmt(S.fare);
    }
    var dot = $('mv-meter-dot');
    if (dot) dot.style.left = meterPos(h) + '%';
    var vd = $('mv-verdict');
    if (vd) vd.innerHTML = verdict(h);
    paintOfferDock();
  }
  function typeFare() {
    var cur = currency(), h = currentHint(), f = factor(cur);
    modal('<h2 class="mv-h2">Your fare</h2><p>Type the exact amount in ' + esc(cur) + '.' + (h && h.available ? ' The going rate here is ' + esc(money(h.low, cur)) + ' to ' + esc(money(h.high, cur)) + '.' : '') + '</p>' +
      '<input class="mv-input" id="mv-fare-exact" inputmode="decimal" style="height:64px;text-align:center;font:800 28px/1 var(--display)" value="' + (S.fare ? S.fare / f : '') + '">' +
      '<div class="mv-row" style="margin-top:14px"><button class="mv-btn is-ghost is-sm" type="button" data-x>Cancel</button><button class="mv-btn is-sm" type="button" data-ok>Set fare</button></div>',
      function (m, close) {
        var inp = m.querySelector('#mv-fare-exact');
        function ok() {
          var v = Number(String(inp.value).replace(/[^\d.]/g, ''));
          if (!(v > 0)) { inp.classList.add('is-bad'); return; }
          var minor = Math.round(v * f), lo = minFare(h);
          if (minor < lo) { toast('Drivers will not see fares below ' + money(lo, cur) + ' on this route.', 'bad'); minor = lo; }
          close(); updateFare(minor);
        }
        m.querySelector('[data-x]').onclick = close;
        m.querySelector('[data-ok]').onclick = ok;
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
        setTimeout(function () { inp.select(); }, 80);
      });
  }
  function readContact() {
    var n = $('mv-name'), p = $('mv-phone'), e = $('mv-email');
    if (n) S.contact.name = n.value.trim();
    if (p) S.contact.phone = p.value.trim();
    if (e) S.contact.email = e.value.trim();
    var f = $('mv-flight'), nt = $('mv-note');
    if (f) S.flight = f.value.trim();
    if (nt) S.note = nt.value.trim();
    var fi = $('mv-fare-input');
    if (fi && !S.askOffers) {
      var v = Number(String(fi.value).replace(/[^\d.]/g, ''));
      S.fare = v > 0 ? Math.round(v * factor(currency())) : null;
    }
  }
  function offerError(msg, field) {
    var e = $('mv-offer-err');
    if (e) e.textContent = msg;
    if (field) {
      var el = $(field);
      if (el) {
        el.classList.add('is-bad');
        el.addEventListener('input', function once() { el.classList.remove('is-bad'); el.removeEventListener('input', once); });
        if (sheet && sheet.index() !== sheet.count() - 1) sheet.snapTo(sheet.count() - 1);
        setTimeout(function () { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); }, 300);
      }
    }
    haptic('warn');
  }
  function submit() {
    readContact();
    var c = S.contact;
    if (c.name.length < 2) { offerError('Add your name so the driver knows who to look for.', 'mv-name'); return Promise.resolve(false); }
    var d = digits(c.phone);
    if (d.length < 9 || d.length > 15) { offerError('Add a phone number your driver can call.', 'mv-phone'); return Promise.resolve(false); }
    if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { offerError('That email does not look right.', 'mv-email'); return Promise.resolve(false); }
    if (!S.askOffers && !S.card && !(S.fare > 0)) { offerError('Enter a fare, or let drivers make offers.', 'mv-fare-input'); return Promise.resolve(false); }
    store(CONTACT_KEY, { name: c.name, phone: c.phone, email: c.email });
    var m = MODE_BY_KEY[S.choice] || MODE_BY_KEY.economy;
    var a = S.pickup, b = S.dropoff;
    var cc = countryOf(a);
    var payload = {
      country_code: cc, city: a.city || (b && b.city) || '', mode_key: S.card ? S.card.mode_key : m.mode,
      'class': (S.card ? S.card.mode_key : m.mode) === 'car' ? (S.card ? 'comfort' : m.cls) : null,
      service: S.service, name: c.name, phone: c.phone, email: c.email || null,
      pickup_label: a.label || a.title || 'Pinned pickup', pickup_lat: a.lat, pickup_lng: a.lng,
      dropoff_label: b ? (b.label || b.title) : null, dropoff_lat: b ? b.lat : null, dropoff_lng: b ? b.lng : null,
      scheduled_for: whenISO(), passengers: S.pax, luggage: S.bags, hours: S.service === 'chauffeur' ? S.hours : null,
      rider_offer_minor: S.card ? S.card.amount_minor : (S.askOffers ? null : S.fare), price_card_id: S.card ? S.card.id : null,
      pay_method: S.pay, auto_accept: !S.when && !S.askOffers && S.autoAccept, needs: S.needs, notes: S.note || null,
      flight_no: S.flight || null, stay_ref: (b && b.stayRef) || (a && a.stayRef) || null,
      distance_km: S.route ? S.route.distance_km : null, duration_min: S.route ? S.route.duration_min : null,
      airport: isAirportPlace(a) || isAirportPlace(b)
    };
    if (!COUNTRIES[cc]) { offerError(ERR.country_invalid); return Promise.resolve(false); }
    return rpc('ride_request_place', { p: payload }).then(function (r) {
      S.ref = r.ref; S.token = r.token; S.share = r.share;
      rememberTrip({ ref: r.ref, token: r.token, share: r.share });
      try { history.replaceState(null, '', '/rides?trip=' + encodeURIComponent(r.ref)); } catch (e) {}
      haptic('confirm');
      S.trip = { ref: r.ref, status: r.status, currency: r.currency, pin: r.pin, share: r.share, invited: r.invited, search_until: r.search_until,
        pickup: { label: payload.pickup_label, lat: a.lat, lng: a.lng }, dropoff: { label: payload.dropoff_label, lat: payload.dropoff_lat, lng: payload.dropoff_lng },
        rider_offer: payload.rider_offer_minor, offers: [], mode_key: payload.mode_key, 'class': payload['class'], service: S.service,
        scheduled_for: payload.scheduled_for, pay_method: S.pay, auto_accept: payload.auto_accept, fixed_price: !!S.card };
      S.lastStatus = null;
      enterLive();
      track();
      updateTripsBadge();
      return true;
    }, function (e) {
      var msg = friendly(e);
      if (e.code === 'offer_too_low' && e.detail) msg += ' The going rate starts near ' + money(Number(e.detail), currency()) + '.';
      offerError(msg, e.code === 'name_required' ? 'mv-name' : e.code === 'phone_required' ? 'mv-phone' : e.code === 'email_invalid' ? 'mv-email' : null);
      toast(msg, 'bad');
      return false;
    });
  }

  /* ── 13 · live: the ride as it happens ───────────────────────────── */
  function enterLive() {
    S.lastSig = ''; S.seenOffers = {};
    setDock(null);
    go('live', 0);
    renderLive();
  }
  function schedulePoll() {
    clearTimeout(S.pollT);
    var t = S.trip;
    if (!t || !S.ref) return;
    var st = t.status;
    if (!ACTIVE[st] && st !== 'completed') return;
    if (st === 'completed' && t.rating) return;
    var ms = st === 'searching' ? 3500 : st === 'completed' ? 20000 : 5000;
    if (doc.hidden) ms *= 3;
    S.pollT = setTimeout(track, ms);
  }
  function track() {
    if (!S.ref) return;
    var p = S.shareMode ? rpc('ride_share_view', { p_ref: S.ref, p_share: S.share }) : rpc('ride_track', { p_ref: S.ref, p_token: S.token });
    p.then(function (t) {
      if (!t) return;
      var prev = S.trip ? S.trip.status : null;
      S.trip = t;
      if (prev !== t.status) onStatusChange(prev, t.status);
      renderLive();
      schedulePoll();
    }, function (e) {
      if (e && (e.code === 'ride_not_found' || e.code === 'share_expired')) {
        S.trip = S.trip || { status: 'missing' };
        S.trip.status = 'missing';
        S.trip.error = friendly(e);
        renderLive();
        return;
      }
      schedulePoll();
    });
  }
  function onStatusChange(prev, now) {
    if (!prev) return;
    var t = S.trip, d = t.driver || {};
    if (now === 'assigned') { haptic('confirm'); toast((d.name || 'Your driver') + ' is on the way.', 'good'); }
    else if (now === 'arriving') { haptic('confirm'); toast((d.name || 'Your driver') + ' is outside. Share your PIN once you are in.', 'good'); }
    else if (now === 'in_progress') { haptic('tick'); toast('Trip started. Safe travels.', 'good'); }
    else if (now === 'completed') { confetti(); haptic('confirm'); }
    else if (now === 'searching' && (prev === 'assigned' || prev === 'arriving')) { haptic('warn'); toast('Your driver cancelled. Finding another now.', 'bad'); }
    else if (now === 'unfulfilled') { haptic('warn'); }
    relayoutSheet(now === 'completed' ? 1 : 0);
    updateTripsBadge();
  }
  function ringHTML(t) {
    var total = 20 * 60, left = total;
    if (t.search_until) left = Math.max(0, (new Date(t.search_until).getTime() - Date.now()) / 1000);
    if (t.scheduled_for) return '<div class="mv-status-icon is-ink">' + icon('clock') + '</div>';
    var C = 2 * Math.PI * 26, off = C * (1 - Math.min(1, left / total));
    var mm = Math.floor(left / 60), ss = Math.floor(left % 60);
    return '<div class="mv-ring" aria-hidden="true"><svg viewBox="0 0 58 58"><circle class="bg" cx="29" cy="29" r="26"/><circle class="fg" id="mv-ring-fg" cx="29" cy="29" r="26" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b id="mv-ring-t">' + mm + ':' + (ss < 10 ? '0' : '') + ss + '</b></div>';
  }
  function tickRing() {
    clearInterval(S.ringT);
    S.ringT = setInterval(function () {
      var t = S.trip;
      if (!t || t.status !== 'searching' || t.scheduled_for) { clearInterval(S.ringT); return; }
      var left = Math.max(0, (new Date(t.search_until).getTime() - Date.now()) / 1000);
      var fg = $('mv-ring-fg'), tx = $('mv-ring-t');
      if (!fg || !tx) return;
      var C = 2 * Math.PI * 26;
      fg.setAttribute('stroke-dashoffset', (C * (1 - Math.min(1, left / 1200))).toFixed(1));
      var mm = Math.floor(left / 60), ss = Math.floor(left % 60);
      tx.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
      doc.querySelectorAll('[data-expires]').forEach(function (bar) {
        var exp = new Date(bar.getAttribute('data-expires')).getTime(), start = Number(bar.getAttribute('data-start')) || exp - 100000;
        var k = Math.max(0, Math.min(1, (exp - Date.now()) / (exp - start)));
        bar.style.transform = 'scaleX(' + k.toFixed(3) + ')';
      });
    }, 1000);
  }
  function vehicleLine(v) {
    if (!v) return '';
    var colour = v.colour ? '<span class="mv-colour" style="background:' + esc(cssColour(v.colour)) + '" title="' + esc(v.colour) + '"></span>' : '';
    return colour + '<span>' + esc([v.colour, v.label].filter(Boolean).join(' ') || 'Vehicle') + '</span>' + (v.plate ? '<span class="mv-plate">' + esc(v.plate) + '</span>' : '');
  }
  function cssColour(name) {
    var n = String(name || '').toLowerCase();
    var map2 = { white: '#f7f7f7', black: '#1b1b1b', silver: '#c8c8cc', grey: '#8d8d93', gray: '#8d8d93', blue: '#2d6cdf', red: '#d7263d',
      green: '#2e9e5b', yellow: '#f5c518', orange: '#ff7a1a', brown: '#7b4a2a', beige: '#e3d4b5', gold: '#d4a017', maroon: '#7a1f2b', purple: '#6b3fa0' };
    for (var k in map2) if (n.indexOf(k) > -1) return map2[k];
    return '#c8c8cc';
  }
  function driverETA(t) {
    var d = t.driver;
    if (!d || d.lat == null || !t.pickup || t.pickup.lat == null) return null;
    var dist = km({ lat: d.lat, lng: d.lng }, t.pickup) * 1.35;
    return Math.max(1, Math.round(dist / 22 * 60));
  }
  function progressHTML(st) {
    var steps = ['assigned', 'arriving', 'in_progress', 'completed'], i = steps.indexOf(st);
    return '<div class="mv-progress">' + steps.map(function (s, n) { return '<i class="' + (n < i ? 'is-done' : n === i ? 'is-now' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="mv-progress-labels"><span>On the way</span><span>Outside</span><span>On trip</span><span>Arrived</span></div>';
  }
  /* What the rider can see changing. Driver coordinates are left out on
     purpose: they move the car on the map every poll and must not
     rebuild the panel (or wipe a half-written review) each time. */
  function liveSig(t) {
    var d = t.driver || {};
    return JSON.stringify([t.status, t.desk, t.rider_offer, t.invited, t.agreed, t.pin_verified, t.rating, t.pay_method, t.search_until,
      (t.offers || []).map(function (o) { return [o.id, o.price, o.expires_at]; }), d.name, d.phone, d.mpesa, d.vehicle && d.vehicle.plate,
      t.cancel_reason, t.error, S.shareMode]);
  }
  function renderLive() {
    var host = $('st-live'), t = S.trip;
    if (!host || !t) return;
    var st = t.status, cur = t.currency || 'KES';
    var mode = modeFor(t.mode_key, t['class']);
    var d = t.driver || null;
    var html = '';
    S.seenOffers = S.seenOffers || {};
    var fromTo = esc(String((t.pickup && t.pickup.label) || '').split(',')[0]) + (t.dropoff && t.dropoff.label ? ' → ' + esc(String(t.dropoff.label).split(',')[0]) : '');
    if (S.shareMode) html += '<div class="mv-share-banner">' + icon('share') + '<span>You are following ' + esc(t.rider_first_name || 'a rider') + '’s Cabana ride. This view updates live and ends when the trip does.</span></div>';

    /* map layers follow the trip */
    if (map && t.pickup && t.pickup.lat != null) {
      S.pickup = S.pickup || { lat: t.pickup.lat, lng: t.pickup.lng, label: t.pickup.label };
      if (!layers.a) placeMarker('a', { lat: t.pickup.lat, lng: t.pickup.lng, label: t.pickup.label });
      if (t.dropoff && t.dropoff.lat != null && !layers.b) placeMarker('b', { lat: t.dropoff.lat, lng: t.dropoff.lng, label: t.dropoff.label });
      radar(st === 'searching');
      moveDriver(d && ACTIVE[st] ? d.lat : null, d && ACTIVE[st] ? d.lng : null, d && d.heading);
    }
    var sig = liveSig(t);
    if (sig === S.lastSig && S.stage === 'live') {
      var etaEl = $('mv-eta-val'), e2 = driverETA(t);
      if (etaEl && e2) etaEl.textContent = e2;
      return;
    }
    S.lastSig = sig;

    if (st === 'searching') {
      var offers = (t.offers || []).filter(function (o) { return !o.expires_at || new Date(o.expires_at).getTime() > Date.now() - 1500; });
      var desk = t.desk;
      html += '<div class="mv-live-head" data-peek>' + ringHTML(t) + '<div><h2 class="mv-h2">' +
        (offers.length ? offers.length + (offers.length === 1 ? ' driver answered' : ' drivers answered') : t.scheduled_for ? 'Booking sent to drivers' : 'Finding your driver') + '</h2>' +
        '<p class="mv-sub">' + (offers.length ? 'Tap the one you want. Offers expire quickly.' :
          t.scheduled_for ? 'For ' + esc(fmtWhen(t.scheduled_for, true)) + '. Drivers answer ahead of time; we notify you.' :
          (t.invited ? 'Sent to ' + t.invited + ' nearby ' + (t.invited === 1 ? 'driver' : 'drivers') : 'Asking drivers near you') + ' <span class="mv-dots"><i></i><i></i><i></i></span>') + '</p></div></div>';
      if (desk && !offers.length) html += '<div class="mv-desk">' + icon('desk') + '<div><b>The Cabana desk is on it</b><span>No driver has answered yet, so our team is calling partner drivers for you.</span></div></div>';
      html += '<div class="mv-trip-meta"><span class="mv-pill is-ink">' + esc(mode.name) + '</span>' +
        (t.fixed_price ? '<span class="mv-pill">Fixed ' + esc(money(t.rider_offer, cur)) + '</span>' : t.rider_offer ? '<span class="mv-pill">Your fare ' + esc(money(t.rider_offer, cur)) + '</span>' : '<span class="mv-pill">Asking for offers</span>') +
        (t.auto_accept ? '<span class="mv-pill is-live">' + icon('bolt') + 'Auto-accept on</span>' : '') + '</div>';
      if (offers.length) {
        html += '<div class="mv-offers">' + offers.map(function (o) {
          var dr = o.driver || {}, v = o.vehicle || {};
          var diff = t.rider_offer && o.price !== t.rider_offer;
          var badge = !t.rider_offer ? '' : diff ? '<small class="is-up">Counter' + (o.price > t.rider_offer ? ' +' + esc(money(o.price - t.rider_offer, cur)) : '') + '</small>' : '<small class="is-match">Your fare</small>';
          var start = o.offered_at ? new Date(o.offered_at).getTime() : Date.now();
          var seen = S.seenOffers[o.id]; S.seenOffers[o.id] = 1;
          return '<div class="mv-offer' + (seen ? ' is-seen' : '') + '"' + (o === offers[0] ? ' data-peek-deep' : '') + '>' +
            '<div class="mv-offer-top"><div class="mv-avatar' + (o.source === 'desk' ? ' is-desk' : '') + '">' + (dr.photo ? '<img src="' + esc(dr.photo) + '" alt="">' : esc(initial(dr.name))) + '</div>' +
            '<div class="mv-offer-who"><b>' + esc(dr.name || 'Driver') + '</b><span>' + (dr.rating ? '<span class="mv-star">★ ' + Number(dr.rating).toFixed(1) + '</span>' : '<span>New driver</span>') +
            (dr.trips ? '<span>· ' + dr.trips + ' trips</span>' : '') + (o.eta_min ? '<span>· ' + o.eta_min + ' min away</span>' : '') + (o.source === 'desk' ? '<span>· Cabana partner</span>' : '') + '</span></div>' +
            '<div class="mv-offer-price"><b>' + esc(money(o.price, o.currency || cur)) + '</b>' + badge + '</div></div>' +
            (v.label || v.plate ? '<div class="mv-offer-car">' + vehicleLine(v) + '</div>' : '') +
            (o.note ? '<p class="mv-offer-note">“' + esc(o.note) + '”</p>' : '') +
            (S.shareMode ? '' : '<div class="mv-offer-act"><button class="mv-btn" type="button" data-accept="' + esc(o.id) + '" data-press>Accept ' + esc(money(o.price, o.currency || cur)) + '</button></div>') +
            (o.expires_at ? '<i class="mv-expiry" data-expires="' + esc(o.expires_at) + '" data-start="' + start + '"></i>' : '') + '</div>';
        }).join('') + '</div>';
      }
      if (!S.shareMode && !t.fixed_price) {
        var base = t.rider_offer || t.fare_hint;
        if (base) {
          var r1 = Math.round(base * 1.1 / (factor(cur) * 10)) * factor(cur) * 10, r2 = Math.round(base * 1.2 / (factor(cur) * 10)) * factor(cur) * 10;
          html += '<div class="mv-group"><div class="mv-label"><span>' + (offers.length ? 'Want more choice?' : 'Speed it up') + '</span><small>Raising reaches more drivers</small></div>' +
            '<div class="mv-raise"><button class="mv-chip" type="button" data-raise="' + r1 + '">' + icon('up') + esc(money(r1, cur)) + '</button>' +
            '<button class="mv-chip" type="button" data-raise="' + r2 + '">' + icon('up') + esc(money(r2, cur)) + '</button></div></div>';
        }
      }
      if (!S.shareMode) html += '<div class="mv-group"><button class="mv-btn is-danger is-sm" type="button" data-act="cancel">Cancel request</button></div>' +
        '<div style="text-align:center;margin-top:6px"><button class="mv-link" type="button" data-act="help">Questions? Talk to Cabana</button></div>';
    } else if (st === 'assigned' || st === 'arriving' || st === 'in_progress') {
      var eta = driverETA(t);
      var head = st === 'assigned' ? (t.scheduled_for && new Date(t.scheduled_for) > new Date(Date.now() + 30 * 60000) ? 'Booked with ' + esc((d && d.name) || 'your driver') : esc((d && d.name) || 'Your driver') + ' is on the way')
        : st === 'arriving' ? esc((d && d.name) || 'Your driver') + ' is outside' : 'On your way';
      var subl = st === 'in_progress' ? (t.dropoff && t.dropoff.label ? 'Heading to ' + esc(String(t.dropoff.label).split(',')[0]) : 'Your driver is with you') :
        st === 'arriving' ? 'Meet them at the pickup. Give your PIN once you are in.' :
        t.scheduled_for ? 'Pickup ' + esc(fmtWhen(t.scheduled_for, true)) : 'Head to ' + esc(String((t.pickup && t.pickup.label) || 'the pickup').split(',')[0]);
      html += '<div class="mv-live-head" data-peek><div class="mv-status-icon' + (st === 'in_progress' ? ' is-mint' : '') + '">' + icon(st === 'in_progress' ? 'route' : 'car') + '</div>' +
        '<div><h2 class="mv-h2" aria-live="polite">' + head + '</h2><p class="mv-sub">' + subl + '</p></div></div>';
      html += progressHTML(st);
      html += '<div class="mv-driver" style="margin-top:14px"' + (st === 'assigned' ? ' data-peek-deep' : '') + '><div class="mv-driver-top"><div class="mv-avatar' + (d && d.source === 'desk' ? ' is-desk' : '') + '">' + (d && d.photo ? '<img src="' + esc(d.photo) + '" alt="">' : esc(initial(d && d.name))) + '</div>' +
        '<div class="mv-driver-name"><b>' + esc((d && d.name) || 'Driver') + '</b><span>' + (d && d.rating ? '<span class="mv-star">★ ' + Number(d.rating).toFixed(1) + '</span>' : 'New on Cabana') + (d && d.trips ? ' · ' + d.trips + ' trips' : '') + '</span></div>' +
        (eta && st === 'assigned' && !t.scheduled_for ? '<div class="mv-eta"><b id="mv-eta-val">' + eta + '</b><small>min away</small></div>' : '') + '</div>' +
        (d && d.vehicle ? '<div class="mv-car-line"><span class="mv-opt-art">' + (ART[mode.key] || ART.economy) + '</span><div>' + esc([d.vehicle.colour, d.vehicle.label].filter(Boolean).join(' ') || 'Vehicle') +
          '<small>' + (d.vehicle.plate ? '<span class="mv-plate">' + esc(d.vehicle.plate) + '</span>' : '') + '</small></div></div>' : '') + '</div>';
      if (!S.shareMode) {
        if (t.pin) html += '<div class="mv-pin-card' + (t.pin_verified ? ' is-verified' : '') + '"' + (st === 'arriving' ? ' data-peek-deep' : '') + '><div><b>' + (t.pin_verified ? 'PIN confirmed' : 'Your trip PIN') + '</b><span>' +
          (t.pin_verified ? 'You are in the right car.' : 'Tell your driver only once you are in the car.') + '</span></div><div class="mv-pin-digits" aria-label="Trip PIN ' + esc(t.pin.split('').join(' ')) + '">' +
          t.pin.split('').map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</div></div>';
        var phone = d && d.phone ? digits(d.phone) : '';
        html += '<div class="mv-actions">' +
          '<a class="mv-action' + (phone ? '' : ' is-off') + '" href="' + (phone ? 'tel:+' + phone : '#') + '"><i>' + icon('phone') + '</i>Call</a>' +
          '<a class="mv-action' + (phone ? '' : ' is-off') + '" href="' + (phone ? 'https://wa.me/' + phone + '?text=' + encodeURIComponent('Hi, this is ' + (t.rider_name || 'your rider') + ' on Cabana (' + t.ref + ').') : '#') + '" target="_blank" rel="noopener"><i>' + icon('chat') + '</i>Message</a>' +
          '<button class="mv-action" type="button" data-act="share"><i>' + icon('share') + '</i>Share trip</button>' +
          '<button class="mv-action is-sos" type="button" data-act="sos"><i>' + icon('shield') + '</i>SOS</button></div>';
        html += '<div class="mv-card" style="margin-top:12px"><div class="mv-line">' + icon(t.pay_method === 'mpesa' ? 'mpesa' : t.pay_method === 'card' ? 'card' : 'cash') +
          '<span class="mv-line-body"><b>' + esc(money(t.agreed, cur)) + ' agreed</b><small>Pay ' + esc((d && d.name) || 'your driver') + ' directly ' +
          (t.pay_method === 'mpesa' ? 'by M-Pesa' + (d && d.mpesa ? ' to ' + esc(d.mpesa) : ' at the end') : t.pay_method === 'card' ? 'by card' : 'in cash') + '. Cabana takes nothing.</small></span></div>' +
          '<div class="mv-line">' + icon('route') + '<span class="mv-line-body"><b>' + fromTo + '</b><small>Ref ' + esc(t.ref) + '</small></span></div></div>';
        if (st !== 'in_progress') html += '<div class="mv-group"><button class="mv-btn is-danger is-sm" type="button" data-act="cancel">Cancel ride</button></div>';
        html += '<div style="text-align:center;margin-top:6px"><button class="mv-link" type="button" data-act="help">Get help with this trip</button></div>';
        if (d && d.source === 'desk' && (st === 'in_progress' || st === 'arriving' || st === 'assigned')) {
          html += '<div class="mv-group"><button class="mv-btn is-ghost is-sm" type="button" data-act="complete">' + icon('flag') + 'I have arrived</button></div>';
        } else if (st === 'in_progress') {
          html += '<div class="mv-group"><button class="mv-link" type="button" data-act="complete">Driver forgot to end the trip?</button></div>';
        }
      }
    } else if (st === 'completed') {
      html += '<div class="mv-live-head" data-peek><div class="mv-status-icon is-mint">' + icon('flag') + '</div><div><h2 class="mv-h2">You have arrived</h2><p class="mv-sub">' + fromTo + '</p></div></div>';
      if (!S.shareMode) {
        html += '<div class="mv-receipt"><div class="mv-kicker">Pay your driver</div><div class="mv-receipt-total"><b>' + moneyHTML(t.agreed, cur) + '</b><span class="mv-pill is-light">0% to Cabana</span></div>' +
          '<div class="mv-receipt-rows"><div><span>Driver</span><b>' + esc((d && d.name) || 'Driver') + '</b></div>' +
          (d && d.vehicle && d.vehicle.plate ? '<div><span>Vehicle</span><b>' + esc(d.vehicle.plate) + '</b></div>' : '') +
          (t.distance_km ? '<div><span>Distance</span><b>' + esc(fmtKm(Number(t.distance_km))) + '</b></div>' : '') +
          '<div><span>Payment</span><b>' + (t.pay_method === 'mpesa' ? 'M-Pesa' : t.pay_method === 'card' ? 'Card' : 'Cash') + ', to the driver</b></div>' +
          '<div><span>Reference</span><b>' + esc(t.ref) + '</b></div></div>' +
          (t.pay_method === 'mpesa' && d && d.mpesa ? '<div class="mv-paybox">' + icon('mpesa') + '<div><b>Send to ' + esc(d.mpesa) + '</b><span>M-Pesa · ' + esc(money(t.agreed, cur)) + '</span></div><button type="button" data-copy="' + esc(d.mpesa) + '">Copy</button></div>' : '') + '</div>';
        if (!t.rating) {
          var tags = ['Friendly', 'Safe driving', 'Clean car', 'On time', 'Great music', 'Knew the way'];
          html += '<div class="mv-group" style="text-align:center"><h3 class="mv-h3">How was ' + esc((d && d.name) || 'your driver') + '?</h3>' +
            '<div class="mv-stars" role="radiogroup" aria-label="Rating">' + [1, 2, 3, 4, 5].map(function (n) {
              return '<button type="button" role="radio" aria-checked="' + (S.rating === n) + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '" data-star="' + n + '" class="' + (S.rating >= n ? 'is-on' : '') + '"><svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9Z"/></svg></button>';
            }).join('') + '</div>' +
            '<div class="mv-tags">' + tags.map(function (x) { return '<button class="mv-chip" type="button" data-tag="' + esc(x) + '" aria-pressed="' + (S.tags.indexOf(x) > -1) + '">' + esc(x) + '</button>'; }).join('') + '</div>' +
            '<textarea class="mv-input" id="mv-review" maxlength="400" placeholder="Anything else? (optional)"></textarea>' +
            '<button class="mv-btn" type="button" data-act="rate" style="margin-top:10px"' + (S.rating ? '' : ' disabled') + '>Send rating</button></div>';
        } else {
          html += '<div class="mv-group mv-empty" style="padding:12px">' + icon('star') + '<b>Thanks for rating ' + t.rating + '★</b><span>It helps good drivers get more trips.</span></div>';
        }
        html += '<div class="mv-row" style="margin-top:12px"><button class="mv-btn is-ghost is-sm" type="button" data-act="return">Ride back</button><button class="mv-btn is-ink is-sm" type="button" data-act="new">New ride</button></div>';
      }
    } else {
      var title = st === 'cancelled' ? (t.cancelled_by === 'rider' ? 'Ride cancelled' : 'This ride was closed') : st === 'unfulfilled' ? 'No driver took it this time' : st === 'missing' ? 'Trip unavailable' : 'Ride ended';
      var msg = st === 'unfulfilled' ? 'Nothing was charged. Try a higher fare, another ride type, or schedule it for later.' :
        st === 'missing' ? (t.error || 'We could not open this trip.') : (t.cancel_reason ? esc(t.cancel_reason) : 'Nothing is owed.');
      html += '<div class="mv-live-head" data-peek><div class="mv-status-icon is-grey">' + icon(st === 'unfulfilled' ? 'refresh' : 'x') + '</div><div><h2 class="mv-h2">' + title + '</h2><p class="mv-sub">' + msg + '</p></div></div>';
      if (!S.shareMode) html += '<div class="mv-row" style="margin-top:8px">' + (st === 'unfulfilled' ? '<button class="mv-btn is-sm" type="button" data-act="retry">Try again</button>' : '') + '<button class="mv-btn is-ink is-sm" type="button" data-act="new">New ride</button></div>';
      else html += '<a class="mv-btn is-ink is-sm" href="/rides" style="text-decoration:none;margin-top:8px">Get a ride with Cabana</a>';
    }
    host.innerHTML = html;
    tickRing();
    if (S.stage !== 'live') go('live', 0);
    if (st !== S.lastStatus) { S.lastStatus = st; relayoutSheet(st === 'completed' ? 1 : 0); }
    else if (sheet) requestAnimationFrame(function () { sheet.snapTo(sheet.index()); });
    if (map && ACTIVE[st] && d && d.lat != null && st !== 'in_progress') {
      if (!S.fittedDriver) { S.fittedDriver = true; fitTo([[d.lat, d.lng], [t.pickup.lat, t.pickup.lng]], 16); }
    } else if (map && st === 'searching' && !S.fittedSearch && t.pickup && t.pickup.lat != null) {
      S.fittedSearch = true; fitTo([[t.pickup.lat, t.pickup.lng]], 14.5);
    }
  }
  function acceptOffer(id, btn) {
    btn.classList.add('is-busy');
    rpc('ride_choose_offer', { p_ref: S.ref, p_token: S.token, p_offer: id }).then(function (t) {
      haptic('confirm');
      var prev = S.trip && S.trip.status;
      S.trip = t;
      onStatusChange(prev, t.status);
      renderLive();
      schedulePoll();
    }, function (e) {
      btn.classList.remove('is-busy');
      toast(friendly(e), 'bad');
      track();
    });
  }
  function raise(amount) {
    rpc('ride_raise_offer', { p_ref: S.ref, p_token: S.token, p_amount: amount }).then(function (t) {
      S.trip = t; haptic('tick'); toast('Fare raised to ' + money(amount, t.currency) + '. More drivers can see it.', 'good');
      radar(true); renderLive(); schedulePoll();
    }, function (e) { toast(friendly(e), 'bad'); });
  }
  function cancelTrip() {
    var reasons = ['Plans changed', 'Driver too far away', 'Waited too long', 'Booked another way', 'Wrong pickup point'];
    var picked = '';
    modal('<h2 class="mv-h2">Cancel this ride?</h2><p>' + (S.trip && S.trip.driver ? 'Your driver will be told straight away.' : 'Drivers will stop seeing your request.') + '</p>' +
      '<div class="mv-needs" id="mv-reasons">' + reasons.map(function (r) { return '<button class="mv-chip" type="button" aria-pressed="false" data-r="' + esc(r) + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
      '<div class="mv-row" style="margin-top:16px"><button class="mv-btn is-ghost is-sm" type="button" data-x>Keep ride</button><button class="mv-btn is-sm" type="button" data-go style="background:var(--danger)">Cancel ride</button></div>',
      function (m, close) {
        m.querySelector('#mv-reasons').onclick = function (e) {
          var b = e.target.closest('[data-r]'); if (!b) return;
          m.querySelectorAll('[data-r]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true'); picked = b.getAttribute('data-r');
        };
        m.querySelector('[data-x]').onclick = close;
        m.querySelector('[data-go]').onclick = function () {
          var b = this; b.classList.add('is-busy');
          rpc('ride_cancel', { p_ref: S.ref, p_token: S.token, p_reason: picked || null }).then(function (t) {
            close(); S.trip = t; S.lastStatus = null; radar(false); moveDriver(null); renderLive(); updateTripsBadge();
          }, function (e) { b.classList.remove('is-busy'); toast(friendly(e), 'bad'); });
        };
      });
  }
  function openHelp(t) {
    var msg = t && t.ref ? 'I need help with my Cabana ride ' + t.ref + '. ' : '';
    if (global.CabanaSupport && global.CabanaSupport.open) global.CabanaSupport.open(msg);
    else global.location.href = '/help';
  }
  function completeTrip() {
    rpc('ride_rider_complete', { p_ref: S.ref, p_token: S.token }).then(function (t) {
      var prev = S.trip.status; S.trip = t; onStatusChange(prev, t.status); renderLive();
    }, function (e) { toast(friendly(e), 'bad'); });
  }
  function rateTrip(btn) {
    var tagTxt = S.tags.length ? S.tags.join(', ') + '. ' : '';
    var rv = $('mv-review');
    btn.classList.add('is-busy');
    rpc('ride_rate', { p_ref: S.ref, p_token: S.token, p_rating: S.rating, p_review: (tagTxt + (rv ? rv.value.trim() : '')).trim() || null }).then(function (t) {
      S.trip = t; haptic('confirm'); toast('Thank you. Your rating is in.', 'good'); renderLive();
    }, function (e) { btn.classList.remove('is-busy'); toast(friendly(e), 'bad'); });
  }
  function shareTrip() {
    var t = S.trip;
    if (!t || !t.share) { toast('This trip cannot be shared yet.', 'bad'); return; }
    var url = global.location.origin + '/rides?share=' + encodeURIComponent(t.ref) + '&s=' + encodeURIComponent(t.share);
    var text = 'Follow my Cabana ride live' + (t.driver && t.driver.vehicle && t.driver.vehicle.plate ? ' (' + t.driver.vehicle.plate + ')' : '') + '.';
    if (navigator.share) { navigator.share({ title: 'My Cabana ride', text: text, url: url }).catch(function () {}); return; }
    copy(url, 'Live trip link copied.');
  }
  function copy(text, msg) {
    var done = function () { toast(msg || 'Copied.', 'good'); haptic('tick'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = doc.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); } catch (e) {} ta.remove();
  }
  function resetToPlan(keepRoute) {
    clearTimeout(S.pollT); clearInterval(S.ringT);
    S.trip = null; S.ref = null; S.token = null; S.share = null; S.lastStatus = null; S.rating = 0; S.tags = [];
    S.fittedDriver = false; S.fittedSearch = false; S.shareMode = false; S.lastSig = ''; S.seenOffers = {};
    radar(false); moveDriver(null);
    try { history.replaceState(null, '', '/rides'); } catch (e) {}
    if (!keepRoute) { setField('dropoff', null); clearRoute(); }
    go('plan', 0); setDock(null);
    if (keepRoute && S.pickup && (S.dropoff || S.service === 'chauffeur')) computeRoute();
  }
  function rideBack() {
    var t = S.trip;
    var a = t && t.dropoff && t.dropoff.lat != null ? { label: t.dropoff.label, short: t.dropoff.label, lat: t.dropoff.lat, lng: t.dropoff.lng, cc: countryOf(t.dropoff) } : null;
    var b = t && t.pickup ? { label: t.pickup.label, short: t.pickup.label, lat: t.pickup.lat, lng: t.pickup.lng, cc: countryOf(t.pickup) } : null;
    resetToPlan(true);
    S.pickup = null; S.dropoff = null;
    if (a) setField('pickup', a);
    if (b) setField('dropoff', b);
  }

  /* ── 14 · trips ──────────────────────────────────────────────────── */
  function listTrips() {
    var pairs = trips().map(function (x) { return { ref: x.ref, token: x.token }; });
    return rpc('ride_requests_list', { p_pairs: pairs }).then(function (rows) { return rows || []; }, function () { return []; });
  }
  function statusBits(st) {
    return {
      searching: ['Finding driver', 'is-ink', 'search'], assigned: ['Driver on the way', '', 'car'], arriving: ['Driver outside', '', 'car'],
      in_progress: ['On trip', 'is-mint', 'route'], completed: ['Completed', 'is-mint', 'flag'], cancelled: ['Cancelled', 'is-grey', 'x'],
      unfulfilled: ['No driver', 'is-grey', 'refresh'], expired: ['Expired', 'is-grey', 'x']
    }[st] || [st, 'is-grey', 'car'];
  }
  function openTrips() {
    var ov = $('mv-trips'), body = $('mv-trips-body');
    ov.hidden = false;
    body.innerHTML = '<div class="mv-empty"><span class="mv-dots"><i></i><i></i><i></i></span></div>';
    listTrips().then(function (rows) {
      if (!rows.length) {
        body.innerHTML = '<div class="mv-empty">' + icon('route') + '<b>No trips yet</b><span>Your rides from this device appear here, with live status.</span></div>';
        return;
      }
      body.innerHTML = rows.map(function (r) {
        var b = statusBits(r.status), m = modeFor(r.mode_key, r['class']);
        return '<button class="mv-trip-row" type="button" data-open="' + esc(r.ref) + '" data-token="' + esc(r.token || '') + '">' +
          '<span class="mv-status-icon ' + b[1] + '">' + icon(b[2]) + '</span><div><b>' + esc(String(r.pickup || '').split(',')[0]) + (r.dropoff ? ' → ' + esc(String(r.dropoff).split(',')[0]) : '') + '</b>' +
          '<small>' + esc(b[0]) + ' · ' + esc(m.name) + ' · ' + esc(r.scheduled_for ? fmtWhen(r.scheduled_for, true) : ago(r.created_at)) + '</small></div>' +
          '<em>' + esc(r.agreed ? money(r.agreed, r.currency) : r.rider_offer ? money(r.rider_offer, r.currency) : '') + '</em></button>';
      }).join('');
    });
  }
  function openTrip(ref, token) {
    $('mv-trips').hidden = true;
    S.ref = ref; S.token = token || tokenFor(ref); S.shareMode = false; S.lastStatus = null; S.fittedDriver = false; S.fittedSearch = false;
    S.lastSig = ''; S.seenOffers = {};
    if (S.token) rememberTrip({ ref: ref, token: S.token });
    try { history.replaceState(null, '', '/rides?trip=' + encodeURIComponent(ref)); } catch (e) {}
    S.trip = { ref: ref, status: 'loading', offers: [] };
    clearRoute(); placeMarker('a', null); placeMarker('b', null);
    setDock(null);
    go('live', 0);
    $('st-live').innerHTML = '<div class="mv-live-head" data-peek><div class="mv-status-icon is-ink">' + icon('route') + '</div><div><h2 class="mv-h2">Opening your trip</h2><p class="mv-sub"><span class="mv-dots"><i></i><i></i><i></i></span></p></div></div>';
    rpc('ride_track', { p_ref: ref, p_token: S.token }).then(function (t) {
      S.trip = t; S.lastStatus = null;
      if (t.pickup && t.pickup.lat != null) S.pickup = { lat: t.pickup.lat, lng: t.pickup.lng, label: t.pickup.label, short: t.pickup.label };
      if (t.dropoff && t.dropoff.lat != null) S.dropoff = { lat: t.dropoff.lat, lng: t.dropoff.lng, label: t.dropoff.label, short: t.dropoff.label };
      renderLive();
      if (S.pickup && S.dropoff) {
        fetch('/api/route?from=' + S.pickup.lat + ',' + S.pickup.lng + '&to=' + S.dropoff.lat + ',' + S.dropoff.lng).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (r) { if (r && r.geometry) drawRoute(r.geometry); }).catch(function () {});
      }
      schedulePoll();
    }, function (e) {
      S.trip = { ref: ref, status: 'missing', error: e && e.code === 'ride_not_found' ? 'Open this trip on the device you booked it from, or sign in with the same account.' : friendly(e) };
      renderLive();
    });
  }
  function updateTripsBadge() {
    var b = $('mv-trips-badge');
    if (!b) return;
    listTrips().then(function (rows) {
      var n = rows.filter(function (r) { return ACTIVE[r.status]; }).length;
      b.hidden = !n; b.textContent = n;
    });
  }

  /* ── 15 · schedule picker ────────────────────────────────────────── */
  var whenDay = null, whenTime = null;
  function openWhen() {
    var ov = $('mv-when');
    var base = S.when ? new Date(S.when) : null;
    whenDay = base ? new Date(base.getFullYear(), base.getMonth(), base.getDate()) : null;
    whenTime = base ? base.getHours() * 60 + base.getMinutes() : null;
    var days = [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    for (var i = 0; i < 30; i++) days.push(new Date(today.getTime() + i * 864e5));
    $('mv-days').innerHTML = days.map(function (d, i) {
      var on = whenDay && d.getTime() === whenDay.getTime();
      return '<button class="mv-day" type="button" data-day="' + d.getTime() + '" aria-pressed="' + !!on + '"><small>' + (i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' })) + '</small><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString('en-GB', { month: 'short' }) + '</small></button>';
    }).join('');
    if (!whenDay) whenDay = today;
    paintTimes();
    try { $('mv-when-tz').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_', ' '); } catch (e) {}
    ov.hidden = false;
    ov.onclick = function (e) { if (e.target === ov) ov.hidden = true; };
    doc.querySelectorAll('#mv-days [data-day]').forEach(function (b) { if (+b.getAttribute('data-day') === whenDay.getTime()) b.setAttribute('aria-pressed', 'true'); });
  }
  function paintTimes() {
    var out = [], now = Date.now();
    for (var m = 0; m < 24 * 60; m += 15) {
      var t = new Date(whenDay.getTime() + m * 60000);
      var dis = t.getTime() < now + 20 * 60000;
      var on = whenTime === m && !dis;
      out.push('<button class="mv-time" type="button" data-min="' + m + '" aria-pressed="' + on + '"' + (dis ? ' disabled' : '') + '>' + t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</button>');
    }
    $('mv-times').innerHTML = out.join('');
    var first = $('mv-times').querySelector('[aria-pressed="true"]') || $('mv-times').querySelector('button:not(:disabled)');
    if (first) setTimeout(function () { first.scrollIntoView({ block: 'nearest' }); }, 40);
  }
  function setWhen(d) {
    S.when = d ? d.getTime() : null;
    $('mv-when-label').textContent = fmtWhen(S.when);
    S.hintKey = '';
    if (S.stage === 'choose' || (S.pickup && (S.dropoff || S.service === 'chauffeur'))) { S.routeKey = ''; computeRoute(); }
  }

  /* ── 16 · events ─────────────────────────────────────────────────── */
  function wire() {
    $('mv-from').onclick = function () { openSearch('pickup'); };
    $('mv-to').onclick = function () { openSearch('dropoff'); };
    $('mv-swap').onclick = function () {
      haptic('tick');
      var a = S.pickup, b = S.dropoff;
      S.pickup = null; S.dropoff = null;
      setField('pickup', b); setField('dropoff', a);
    };
    $('mv-svc').onclick = function (e) { var b = e.target.closest('[data-svc]'); if (b) { haptic('tick'); setService(b.getAttribute('data-svc')); } };
    $('mv-hours-dn').onclick = function () { setHours(S.hours - 1); renderQuick(); if (S.pickup) computeRoute(); };
    $('mv-hours-up').onclick = function () { setHours(S.hours + 1); renderQuick(); if (S.pickup) computeRoute(); };
    $('mv-quick').onclick = onQuick;
    $('mv-locate').onclick = function () { haptic('tick'); if (S.pickup && S.stage !== 'plan') fitTo([[S.pickup.lat, S.pickup.lng]], 16); else locateMe(true); };
    $('mv-trips-btn').onclick = openTrips;
    $('mv-help').onclick = function () { $('mv-trips').hidden = true; openHelp(); };
    $('mv-trips-close').onclick = function () { $('mv-trips').hidden = true; };
    $('mv-trips-body').onclick = function (e) { var b = e.target.closest('[data-open]'); if (b) openTrip(b.getAttribute('data-open'), b.getAttribute('data-token')); };
    $('mv-when-btn').onclick = openWhen;
    $('mv-days').onclick = function (e) {
      var b = e.target.closest('[data-day]'); if (!b) return;
      doc.querySelectorAll('#mv-days [data-day]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true'); whenDay = new Date(+b.getAttribute('data-day')); paintTimes(); haptic('tick');
    };
    $('mv-times').onclick = function (e) {
      var b = e.target.closest('[data-min]'); if (!b || b.disabled) return;
      doc.querySelectorAll('#mv-times [data-min]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true'); whenTime = +b.getAttribute('data-min'); haptic('tick');
    };
    $('mv-when-now').onclick = function () { $('mv-when').hidden = true; setWhen(null); };
    $('mv-when-set').onclick = function () {
      if (whenTime == null) { toast('Pick a time.', 'bad'); return; }
      var d = new Date(whenDay.getTime() + whenTime * 60000);
      if (d.getTime() < Date.now() + 15 * 60000) { toast('Pick a time at least 15 minutes from now.', 'bad'); return; }
      $('mv-when').hidden = true; setWhen(d); toast('Scheduled for ' + fmtWhen(d.getTime(), true) + '.', 'good');
    };

    var input = $('mv-search-input');
    input.addEventListener('input', function () { runSearch(input.value); });
    input.addEventListener('keydown', function (e) {
      var btns = $('mv-results').querySelectorAll('.mv-result');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        hi = Math.max(0, Math.min(btns.length - 1, hi + (e.key === 'ArrowDown' ? 1 : -1)));
        btns.forEach(function (b, i) { b.classList.toggle('is-hi', i === hi); });
        if (btns[hi]) btns[hi].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var k = hi > -1 ? hi : (btns.length ? +btns[0].getAttribute('data-i') : -1);
        if (k > -1) pickResult(hi > -1 ? +btns[hi].getAttribute('data-i') : k);
      } else if (e.key === 'Escape') closeSearch();
    });
    $('mv-search-clear').onclick = function () { input.value = ''; renderResults([], ''); input.focus(); };
    $('mv-search-close').onclick = closeSearch;
    $('mv-results').onclick = function (e) { var b = e.target.closest('[data-i]'); if (b) pickResult(+b.getAttribute('data-i')); };

    /* stage + dock delegation */
    doc.addEventListener('click', function (e) {
      var t = e.target;
      var act = t.closest && t.closest('[data-act]');
      if (act && ($('mv-app').contains(act))) {
        var a = act.getAttribute('data-act');
        if (a === 'to-plan') { go('plan', 0); setDock(null); return; }
        if (a === 'to-choose') { go('choose', 0); renderChoose(); return; }
        if (a === 'to-offer') { haptic('tick'); toOffer(); return; }
        if (a === 'more') { S.showMore = !S.showMore; renderChoose(); if (S.showMore) loadMoreHints(); return; }
        if (a === 'fare-up') { haptic('tick'); updateFare((S.fare || 0) + niceStep(currentHint())); return; }
        if (a === 'fare-dn') { haptic('tick'); updateFare((S.fare || 0) - niceStep(currentHint())); return; }
        if (a === 'fare-type') { typeFare(); return; }
        if (a === 'pin-cancel') { endPin(false); return; }
        if (a === 'pin-ok') { haptic('confirm'); endPin(true); return; }
        if (a === 'cancel') { cancelTrip(); return; }
        if (a === 'share') { shareTrip(); return; }
        if (a === 'sos') { if (global.CabanaSOS) global.CabanaSOS.open(); else global.location.href = 'tel:999'; return; }
        if (a === 'help') { openHelp(S.trip); return; }
        if (a === 'complete') { completeTrip(); return; }
        if (a === 'rate') { rateTrip(act); return; }
        if (a === 'new') { resetToPlan(false); return; }
        if (a === 'retry') { resetToPlan(true); return; }
        if (a === 'return') { rideBack(); return; }
      }
      var opt = t.closest && t.closest('[data-opt]');
      if (opt) {
        var key = opt.getAttribute('data-opt');
        S.card = null;
        if (S.choice === key && S.stage === 'choose') { toOffer(); return; }
        S.choice = key; haptic('tick');
        doc.querySelectorAll('#st-choose [data-opt], #st-choose [data-card]').forEach(function (b) {
          var on = b.getAttribute('data-opt') === key; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on);
        });
        paintChooseDock();
        return;
      }
      var cd = t.closest && t.closest('[data-card]');
      if (cd) {
        var id = cd.getAttribute('data-card');
        S.card = S.cards.filter(function (x) { return x.id === id; })[0] || null;
        doc.querySelectorAll('#st-choose [data-opt], #st-choose [data-card]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-card') === id); });
        haptic('tick'); paintChooseDock(); return;
      }
      var pay = t.closest && t.closest('[data-pay]');
      if (pay) {
        S.pay = pay.getAttribute('data-pay'); S.payTouched = true; haptic('tick');
        doc.querySelectorAll('[data-pay]').forEach(function (b) { b.setAttribute('aria-pressed', b === pay); });
        paintOfferDock(); return;
      }
      var need = t.closest && t.closest('[data-need]');
      if (need) {
        var nk = need.getAttribute('data-need'), ix = S.needs.indexOf(nk);
        if (ix > -1) S.needs.splice(ix, 1); else S.needs.push(nk);
        need.setAttribute('aria-pressed', ix === -1); haptic('tick'); return;
      }
      var step = t.closest && t.closest('[data-step]');
      if (step) {
        var which = step.getAttribute('data-step'), dlt = +step.getAttribute('data-d');
        var m2 = MODE_BY_KEY[S.choice] || MODE_BY_KEY.economy;
        if (which === 'pax') S.pax = Math.max(1, Math.min(Math.max(1, m2.seats), S.pax + dlt));
        if (which === 'bags') S.bags = Math.max(0, Math.min(12, S.bags + dlt));
        readContact(); renderOffer(); haptic('tick'); return;
      }
      var acc = t.closest && t.closest('[data-accept]');
      if (acc) { acceptOffer(acc.getAttribute('data-accept'), acc); return; }
      var rs = t.closest && t.closest('[data-raise]');
      if (rs) { raise(+rs.getAttribute('data-raise')); return; }
      var star = t.closest && t.closest('[data-star]');
      if (star) {
        S.rating = +star.getAttribute('data-star'); haptic('tick');
        doc.querySelectorAll('[data-star]').forEach(function (b) { var n = +b.getAttribute('data-star'); b.classList.toggle('is-on', n <= S.rating); b.setAttribute('aria-checked', n === S.rating); });
        var rb = doc.querySelector('[data-act="rate"]'); if (rb) rb.disabled = false; return;
      }
      var tag = t.closest && t.closest('[data-tag]');
      if (tag) {
        var tg = tag.getAttribute('data-tag'), ti = S.tags.indexOf(tg);
        if (ti > -1) S.tags.splice(ti, 1); else S.tags.push(tg);
        tag.setAttribute('aria-pressed', ti === -1); return;
      }
      var cp = t.closest && t.closest('[data-copy]');
      if (cp) { copy(cp.getAttribute('data-copy'), 'Number copied.'); }
    });
    doc.addEventListener('change', function (e) {
      if (e.target.id === 'mv-ask') { readContact(); S.askOffers = e.target.checked; if (!S.askOffers && S.fare == null) { var h = currentHint(); S.fare = h && h.available ? h.suggested : null; } renderOffer(); }
      if (e.target.id === 'mv-auto') { S.autoAccept = e.target.checked; }
    });
    doc.addEventListener('input', function (e) {
      if (e.target.id === 'mv-fare-input') { readContact(); paintOfferDock(); }
    });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && S.trip && S.ref) { clearTimeout(S.pollT); track(); } });
    global.addEventListener('resize', function () { if (sheet) sheet.refresh(false); });
  }
  function loadMoreHints() {
    MODES.filter(function (m) { return m.group === 'more' && !S.hints[m.key]; }).forEach(function (m) {
      var key = S.hintKey;
      rpc('ride_fare_hint', { p: hintPayload(m) }).then(function (h) {
        if (key !== S.hintKey) return; S.hints[m.key] = h || { available: false }; paintOption(m);
      }, function () { if (key !== S.hintKey) return; S.hints[m.key] = { available: false }; paintOption(m); });
    });
  }

  /* ── 17 · who is riding ──────────────────────────────────────────── */
  function loadRider() {
    var saved = store(CONTACT_KEY);
    if (saved) S.contact = { name: saved.name || '', phone: saved.phone || '', email: saved.email || '' };
    if (!global.ApaSession || !global.ApaSession.ready) return;
    global.ApaSession.ready(function (st) {
      if (!st || st.status !== 'user') return;
      S.user = st.user;
      var prof = st.profile || {};
      if (!S.contact.name) S.contact.name = prof.full_name || st.name || '';
      if (!S.contact.email) S.contact.email = (st.user && st.user.email) || '';
      if (!S.contact.phone) S.contact.phone = prof.phone || '';
      $('mv-greet').textContent = greet() + (st.name ? ', ' + String(st.name).split(' ')[0] : '');
      rpc('ride_my_stays', {}).then(function (rows) { S.stays = Array.isArray(rows) ? rows : []; renderQuick(); relayoutSheet(0); }, function () {});
      updateTripsBadge();
    });
  }

  /* ── 18 · boot ───────────────────────────────────────────────────── */
  function boot() {
    $('mv-greet').textContent = greet();
    initMap();
    initSheet();
    wire();
    loadRider();
    setHours(3);
    renderQuick();
    if (M) { M.reveal($('st-plan')); M.press(doc); }
    relayoutSheet(0);

    var q = new URLSearchParams(global.location.search);
    var ref = q.get('trip'), share = q.get('share'), s = q.get('s');
    var svc = q.get('service') || q.get('svc');
    if (svc === 'airport' || svc === 'transfer') setService('transfer');
    else if (svc === 'hourly' || svc === 'chauffeur') setService('chauffeur');
    if (q.get('back')) { var bk = $('mv-back'); bk.href = '/dashboard'; }

    if (share && s) {
      S.shareMode = true; S.ref = share.toUpperCase(); S.share = s;
      $('st-plan').classList.remove('is-on');
      S.trip = { ref: S.ref, status: 'loading' };
      go('live', 0);
      $('st-live').innerHTML = '<div class="mv-live-head" data-peek><div class="mv-status-icon is-ink">' + icon('share') + '</div><div><h2 class="mv-h2">Opening a shared ride</h2><p class="mv-sub"><span class="mv-dots"><i></i><i></i><i></i></span></p></div></div>';
      rpc('ride_share_view', { p_ref: S.ref, p_share: S.share }).then(function (t) { S.trip = t; renderLive(); schedulePoll(); }, function (e) {
        S.trip = { ref: S.ref, status: 'missing', error: friendly(e) }; renderLive();
      });
      return;
    }
    if (ref) { openTrip(ref.toUpperCase(), tokenFor(ref.toUpperCase())); return; }

    /* Only reach for the location silently when the rider already said
       yes to this site. Asking cold, on arrival, is how permission gets
       refused forever. */
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(function (r) { if (r.state === 'granted' && !S.pickup) locateMe(false); }, function () {});
      }
    } catch (e) {}
    updateTripsBadge();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* A small surface for tests and the console. */
  global.CabanaRides = {
    COUNTRIES: COUNTRIES, AIRPORTS: AIRPORTS, MODES: MODES, ART: ART, ERR: ERR,
    money: money, factor: factor, currencyFor: currencyFor, countryOf: countryOf, fmtKm: fmtKm, fmtMin: fmtMin,
    niceStep: niceStep, routeFallback: routeFallback, state: S, friendly: friendly, isAirportPlace: isAirportPlace,
    _setField: setField, _go: go, _renderLive: renderLive
  };
})(window);
