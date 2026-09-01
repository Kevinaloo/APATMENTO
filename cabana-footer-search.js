/* ═══════════════════════════════════════════════════════════════════
   CABANA · FOOTER SEARCH ENGINE
   Filters stays, flights, and tours by destination using live
   Supabase listings data, Atlas flight routing, and tour catalogues.
   ═══════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  if (global.__CABANA_FOOTER_SEARCH__) return;
  global.__CABANA_FOOTER_SEARCH__ = 1;

  var doc = global.document;
  if (!doc) return;

  var SUPABASE_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
  };

  /* Fallback curated tour inventory */
  var DEFAULT_TOURS = [
    { id: 'mara-safari', title: 'Masai Mara Great Migration Safari', destination: 'Masai Mara, Narok', price_kes: 45000, cover_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=80', operator: 'Cabana Safaris' },
    { id: 'amboseli-safari', title: 'Amboseli Safari & Kilimanjaro View', destination: 'Amboseli, Kajiado', price_kes: 38000, cover_url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80', operator: 'Kilimanjaro Treks' },
    { id: 'nairobi-walk', title: 'Best Nairobi City Walking Tour', destination: 'Nairobi CBD', price_kes: 0, cover_url: 'https://media.guruwalk.com/3p64tm7efhc98oeaqleezw34q4uh', operator: 'GuruWalk Kenya' },
    { id: 'diani-excursion', title: 'Diani Beach & Wasini Island Dhow Cruise', destination: 'Diani Beach, Kwale', price_kes: 8500, cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80', operator: 'Coast Dhow Adventures' },
    { id: 'naivasha-hellsgate', title: "Naivasha Day Trip & Hell's Gate National Park", destination: 'Lake Naivasha, Nakuru', price_kes: 6500, cover_url: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?w=800&auto=format&fit=crop&q=80', operator: 'Rift Valley Expeditions' },
    { id: 'zanzibar-tour', title: 'Zanzibar Stone Town & Spice Island Excursion', destination: 'Stone Town, Zanzibar', price_kes: 12000, cover_url: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&auto=format&fit=crop&q=80', operator: 'Spice Coast Tours' },
    { id: 'rwanda-gorilla', title: 'Volcanoes National Park Gorilla Trek', destination: 'Musanze, Rwanda', price_kes: 180000, cover_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop&q=80', operator: 'Rwanda Eco Tours' }
  ];

  /* Fallback major African & international flight hubs */
  var DEFAULT_AIRPORTS = [
    { iata: 'NBO', city: 'Nairobi', name: 'Jomo Kenyatta International', country: 'Kenya' },
    { iata: 'WIL', city: 'Nairobi', name: 'Wilson Airport', country: 'Kenya' },
    { iata: 'MBA', city: 'Mombasa', name: 'Moi International Airport', country: 'Kenya' },
    { iata: 'KIS', city: 'Kisumu', name: 'Kisumu International Airport', country: 'Kenya' },
    { iata: 'EDL', city: 'Eldoret', name: 'Eldoret International Airport', country: 'Kenya' },
    { iata: 'MYD', city: 'Malindi', name: 'Malindi Airport', country: 'Kenya' },
    { iata: 'UKA', city: 'Ukunda / Diani', name: 'Ukunda Airstrip', country: 'Kenya' },
    { iata: 'LAU', city: 'Lamu', name: 'Manda Airstrip', country: 'Kenya' },
    { iata: 'ZNZ', city: 'Zanzibar', name: 'Abeid Amani Karume Intl', country: 'Tanzania' },
    { iata: 'DAR', city: 'Dar es Salaam', name: 'Julius Nyerere Intl', country: 'Tanzania' },
    { iata: 'JRO', city: 'Kilimanjaro', name: 'Kilimanjaro International', country: 'Tanzania' },
    { iata: 'EBB', city: 'Entebbe / Kampala', name: 'Entebbe International', country: 'Uganda' },
    { iata: 'KGL', city: 'Kigali', name: 'Kigali International', country: 'Rwanda' },
    { iata: 'ADD', city: 'Addis Ababa', name: 'Bole International', country: 'Ethiopia' },
    { iata: 'JNB', city: 'Johannesburg', name: 'O.R. Tambo International', country: 'South Africa' },
    { iata: 'CPT', city: 'Cape Town', name: 'Cape Town International', country: 'South Africa' },
    { iata: 'LOS', city: 'Lagos', name: 'Murtala Muhammed Intl', country: 'Nigeria' },
    { iata: 'ACC', city: 'Accra', name: 'Kotoka International', country: 'Ghana' },
    { iata: 'DXB', city: 'Dubai', name: 'Dubai International', country: 'United Arab Emirates' },
    { iata: 'LHR', city: 'London', name: 'Heathrow Airport', country: 'United Kingdom' }
  ];

  var Store = {
    stays: [],
    tours: [],
    loaded: false,
    loading: false
  };

  function fetchSupabaseData() {
    if (Store.loaded || Store.loading) return Promise.resolve();
    Store.loading = true;

    var pStays = fetch(
      SUPABASE_URL + '/rest/v1/listings?is_active=is.true&select=id,title,city,area,location,country,service,type,price_night,photos,property_type&order=created_at.desc&limit=40',
      { headers: HEADERS }
    ).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });

    var pTours = fetch(
      SUPABASE_URL + '/rest/v1/tours_public?select=id,title,destination,county,price_kes,cover_url,photos,operator_name&limit=40',
      { headers: HEADERS }
    ).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });

    return Promise.all([pStays, pTours]).then(function (res) {
      Store.stays = res[0] || [];
      var dbTours = res[1] || [];
      Store.tours = dbTours.length ? dbTours : DEFAULT_TOURS;
      Store.loaded = true;
      Store.loading = false;
    }).catch(function () {
      Store.tours = DEFAULT_TOURS;
      Store.loaded = true;
      Store.loading = false;
    });
  }

  /* HTML Template Generator */
  function renderFooterSearchHtml() {
    return [
      '<div class="sf-search-inner">',
      '  <div class="sf-search-header">',
      '    <div class="sf-search-badge">',
      '      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      '      Live Search',
      '    </div>',
      '    <h3 class="sf-search-title">Explore stays, flights &amp; safaris across Africa</h3>',
      '    <p class="sf-search-sub">Filter verified listings, zero-commission tour bookings, and direct airline routes by destination.</p>',
      '  </div>',
      '  <div class="sf-search-tabs" role="tablist" aria-label="Service category selection">',
      '    <button type="button" class="sf-search-tab is-active" data-service="stays" role="tab" aria-selected="true">',
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      '      <span>Stays</span>',
      '    </button>',
      '    <button type="button" class="sf-search-tab" data-service="flights" role="tab" aria-selected="false">',
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
      '      <span>Flights</span>',
      '    </button>',
      '    <button type="button" class="sf-search-tab" data-service="tours" role="tab" aria-selected="false">',
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
      '      <span>Tours &amp; Safaris</span>',
      '    </button>',
      '  </div>',
      '  <div class="sf-search-bar-wrap">',
      '    <form class="sf-search-form" id="sf-search-form" action="#" novalidate>',
      '      <div class="sf-search-input-group">',
      '        <div class="sf-search-icon" aria-hidden="true">',
      '          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      '        </div>',
      '        <input',
      '          type="text"',
      '          id="sf-destination-input"',
      '          class="sf-search-input"',
      '          placeholder="Search by city or destination (e.g. Nairobi, Mombasa, Diani, Masai Mara)..."',
      '          autocomplete="off"',
      '          spellcheck="false"',
      '          aria-label="Search destination or property name"',
      '          aria-autocomplete="list"',
      '          aria-expanded="false"',
      '          aria-controls="sf-search-dropdown"',
      '        />',
      '        <button type="button" class="sf-search-clear" id="sf-search-clear" aria-label="Clear destination text">',
      '          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '        </button>',
      '        <button type="submit" class="sf-search-submit" id="sf-search-submit" aria-label="Search listings">',
      '          <span>Search</span>',
      '          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
      '        </button>',
      '      </div>',
      '      <div class="sf-search-chips-wrap">',
      '        <span class="sf-search-chips-label">Popular:</span>',
      '        <button type="button" class="sf-search-chip" data-dest="Nairobi">Nairobi</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Mombasa">Mombasa</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Diani Beach">Diani Beach</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Masai Mara">Masai Mara</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Zanzibar">Zanzibar</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Cape Town">Cape Town</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Kigali">Kigali</button>',
      '        <button type="button" class="sf-search-chip" data-dest="Serengeti">Serengeti</button>',
      '      </div>',
      '      <div class="sf-search-dropdown" id="sf-search-dropdown" role="region" aria-live="polite">',
      '        <div class="sf-search-results-list" id="sf-search-results-list"></div>',
      '        <div class="sf-search-dropdown-footer">',
      '          <span>Press <kbd style="background:rgba(255,255,255,.1);padding:1px 5px;border-radius:4px;font-family:inherit">Enter</kbd> to search or pick a destination</span>',
      '          <a href="/apartments" id="sf-search-view-all">Browse all stays &rarr;</a>',
      '        </div>',
      '      </div>',
      '    </form>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function bindSearchComponent(section) {
    if (!section || section.dataset.bound === 'true') return;
    section.dataset.bound = 'true';

    var currentService = 'stays';
    var input = section.querySelector('#sf-destination-input');
    var form = section.querySelector('#sf-search-form');
    var clearBtn = section.querySelector('#sf-search-clear');
    var dropdown = section.querySelector('#sf-search-dropdown');
    var resultsList = section.querySelector('#sf-search-results-list');
    var viewAllLink = section.querySelector('#sf-search-view-all');
    var tabs = section.querySelectorAll('.sf-search-tab');
    var chips = section.querySelectorAll('.sf-search-chip');
    var debounceTimer = null;
    var selectedItemIndex = -1;

    // Load Supabase records early in background
    fetchSupabaseData();

    function updateService(service) {
      currentService = service;
      tabs.forEach(function (tab) {
        var isMatch = tab.dataset.service === service;
        tab.classList.toggle('is-active', isMatch);
        tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      if (service === 'stays') {
        input.placeholder = 'Search stays by city or area (e.g. Nairobi, Mombasa, Diani, Westlands)...';
        if (viewAllLink) {
          viewAllLink.href = '/apartments';
          viewAllLink.textContent = 'Browse all stays \u2192';
        }
      } else if (service === 'flights') {
        input.placeholder = 'Search flight destinations (e.g. Mombasa MBA, Zanzibar ZNZ, Dubai DXB)...';
        if (viewAllLink) {
          viewAllLink.href = '/flights';
          viewAllLink.textContent = 'Open flight desk \u2192';
        }
      } else if (service === 'tours') {
        input.placeholder = 'Search safaris & tours (e.g. Masai Mara, Amboseli, Nairobi walk, Diani)...';
        if (viewAllLink) {
          viewAllLink.href = '/tours';
          viewAllLink.textContent = 'Explore all safaris & tours \u2192';
        }
      }

      runSearch(input.value.trim());
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        updateService(tab.dataset.service);
        input.focus();
      });
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var dest = chip.dataset.dest || chip.textContent.trim();
        input.value = dest;
        clearBtn.classList.add('is-visible');
        runSearch(dest);
        input.focus();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        clearBtn.classList.remove('is-visible');
        closeDropdown();
        input.focus();
      });
    }

    function openDropdown() {
      if (dropdown) {
        dropdown.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
      }
    }

    function closeDropdown() {
      if (dropdown) {
        dropdown.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
        selectedItemIndex = -1;
      }
    }

    function executeNavigation(destination) {
      var dest = (destination || input.value || '').trim();
      var targetUrl = '/apartments';
      if (currentService === 'stays') {
        targetUrl = dest ? ('/apartments?q=' + encodeURIComponent(dest)) : '/apartments';
      } else if (currentService === 'flights') {
        targetUrl = dest ? ('/flights?to=' + encodeURIComponent(dest)) : '/flights';
      } else if (currentService === 'tours') {
        targetUrl = dest ? ('/tours?q=' + encodeURIComponent(dest)) : '/tours';
      }
      global.location.href = targetUrl;
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var selectedItem = resultsList.querySelector('.sf-search-item.is-selected');
        if (selectedItem && selectedItem.href) {
          global.location.href = selectedItem.href;
        } else {
          executeNavigation(input.value);
        }
      });
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }

    function highlightMatch(text, q) {
      if (!text) return '';
      if (!q) return escapeHtml(text);
      var safeText = escapeHtml(text);
      var safeQ = escapeHtml(q);
      var idx = safeText.toLowerCase().indexOf(safeQ.toLowerCase());
      if (idx === -1) return safeText;
      return safeText.substring(0, idx) +
        '<mark style="background:rgba(123,47,247,.45);color:#fff;border-radius:2px;padding:0 2px">' +
        safeText.substring(idx, idx + safeQ.length) +
        '</mark>' +
        safeText.substring(idx + safeQ.length);
    }

    function getMatchingStays(q) {
      var query = q.toLowerCase();
      var stays = Store.stays.length ? Store.stays : [];
      if (!query) return stays.slice(0, 4);

      return stays.filter(function (s) {
        var hay = [s.title, s.city, s.area, s.location, s.country, s.type, s.property_type].join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      }).slice(0, 6);
    }

    function getMatchingTours(q) {
      var query = q.toLowerCase();
      var tours = Store.tours.length ? Store.tours : DEFAULT_TOURS;
      if (!query) return tours.slice(0, 4);

      return tours.filter(function (t) {
        var hay = [t.title, t.destination, t.county, t.operator_name, t.operator].join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      }).slice(0, 6);
    }

    function getMatchingAirports(q) {
      var query = q.toLowerCase();
      var atlas = global.FDAtlas;
      if (atlas && typeof atlas.search === 'function' && query) {
        var res = atlas.search(query, 6);
        if (res && res.length) {
          return res.map(function (a) {
            return { iata: a.iata, city: a.city, name: a.name, country: a.country };
          });
        }
      }
      var airports = DEFAULT_AIRPORTS;
      if (!query) return airports.slice(0, 4);
      return airports.filter(function (a) {
        var hay = [a.iata, a.city, a.name, a.country].join(' ').toLowerCase();
        return hay.indexOf(query) !== -1;
      }).slice(0, 6);
    }

    function renderResults(q) {
      var query = q.trim();
      var staysMatches = (currentService === 'stays' || !query) ? getMatchingStays(query) : [];
      var toursMatches = (currentService === 'tours' || !query) ? getMatchingTours(query) : [];
      var flightMatches = (currentService === 'flights' || !query) ? getMatchingAirports(query) : [];

      var hasResults = staysMatches.length > 0 || toursMatches.length > 0 || flightMatches.length > 0;
      var html = [];

      if (!hasResults && query) {
        html.push(
          '<div class="sf-search-empty">',
          '  <div class="sf-search-empty-icon">',
          '    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
          '  </div>',
          '  <div class="sf-search-empty-title">No listings found for "' + escapeHtml(query) + '"</div>',
          '  <div class="sf-search-empty-text">Try searching Nairobi, Mombasa, Diani, or Masai Mara.</div>',
          '  <button type="button" class="sf-search-submit" style="margin:0 auto;display:inline-flex;padding:8px 18px;font-size:12.5px" id="sf-search-fallback-btn">',
          '    Search all ' + (currentService === 'stays' ? 'stays' : currentService === 'flights' ? 'flights' : 'tours') + ' for "' + escapeHtml(query) + '"',
          '  </button>',
          '</div>'
        );
      } else {
        // Render Stays Group
        if (staysMatches.length > 0 && (currentService === 'stays' || currentService === 'all')) {
          html.push(
            '<div class="sf-search-group-header">',
            '  <span>Supabase Verified Stays</span>',
            '  <span class="sf-search-group-count">' + staysMatches.length + '</span>',
            '</div>'
          );
          staysMatches.forEach(function (stay) {
            var thumb = (stay.photos && stay.photos.length) ? stay.photos[0] : '';
            var priceStr = stay.price_night ? ('KES ' + Number(stay.price_night).toLocaleString() + '/night') : 'From KES 1,500';
            var locStr = [stay.area, stay.city || 'Kenya'].filter(Boolean).join(', ');
            var href = '/apartments?q=' + encodeURIComponent(stay.city || stay.area || stay.title);

            html.push(
              '<a class="sf-search-item" href="' + href + '" data-type="stay" data-dest="' + escapeHtml(stay.city || stay.location || '') + '">',
              '  <div class="sf-search-item-thumb">',
              thumb ? ('<img src="' + escapeHtml(thumb) + '" alt="" loading="lazy"/>') : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
              '  </div>',
              '  <div class="sf-search-item-body">',
              '    <div class="sf-search-item-title">' + highlightMatch(stay.title, query) + '</div>',
              '    <div class="sf-search-item-meta">',
              '      <span class="sf-search-item-tag stays">Stay</span>',
              '      <span>' + highlightMatch(locStr, query) + '</span>',
              '    </div>',
              '  </div>',
              '  <div class="sf-search-item-price">' + escapeHtml(priceStr) + '</div>',
              '</a>'
            );
          });
        }

        // Render Tours Group
        if (toursMatches.length > 0 && (currentService === 'tours' || currentService === 'all')) {
          html.push(
            '<div class="sf-search-group-header">',
            '  <span>Safaris &amp; Guided Tours</span>',
            '  <span class="sf-search-group-count">' + toursMatches.length + '</span>',
            '</div>'
          );
          toursMatches.forEach(function (tour) {
            var thumb = tour.cover_url || (tour.photos && tour.photos.length ? tour.photos[0] : '');
            var priceStr = tour.price_kes === 0 ? 'Free tour' : (tour.price_kes ? ('KES ' + Number(tour.price_kes).toLocaleString()) : 'Direct rate');
            var href = '/tours?q=' + encodeURIComponent(tour.destination || tour.title);

            html.push(
              '<a class="sf-search-item" href="' + href + '" data-type="tour" data-dest="' + escapeHtml(tour.destination || '') + '">',
              '  <div class="sf-search-item-thumb">',
              thumb ? ('<img src="' + escapeHtml(thumb) + '" alt="" loading="lazy"/>') : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
              '  </div>',
              '  <div class="sf-search-item-body">',
              '    <div class="sf-search-item-title">' + highlightMatch(tour.title, query) + '</div>',
              '    <div class="sf-search-item-meta">',
              '      <span class="sf-search-item-tag tours">Safari / Tour</span>',
              '      <span>' + highlightMatch(tour.destination || tour.operator_name || 'Kenya', query) + '</span>',
              '    </div>',
              '  </div>',
              '  <div class="sf-search-item-price">' + escapeHtml(priceStr) + '</div>',
              '</a>'
            );
          });
        }

        // Render Flights Group
        if (flightMatches.length > 0 && (currentService === 'flights' || currentService === 'all')) {
          html.push(
            '<div class="sf-search-group-header">',
            '  <span>Flight Routes &amp; Airports</span>',
            '  <span class="sf-search-group-count">' + flightMatches.length + '</span>',
            '</div>'
          );
          flightMatches.forEach(function (apt) {
            var href = '/flights?to=' + encodeURIComponent(apt.iata);
            html.push(
              '<a class="sf-search-item" href="' + href + '" data-type="flight" data-dest="' + escapeHtml(apt.city || apt.iata) + '">',
              '  <div class="sf-search-item-thumb" style="font-weight:700;font-size:13px;color:#9BB1FF;background:rgba(79,109,255,.15)">',
              escapeHtml(apt.iata),
              '  </div>',
              '  <div class="sf-search-item-body">',
              '    <div class="sf-search-item-title">' + highlightMatch(apt.city + ' (' + apt.iata + ')', query) + '</div>',
              '    <div class="sf-search-item-meta">',
              '      <span class="sf-search-item-tag flights">Airport</span>',
              '      <span>' + highlightMatch(apt.name + ', ' + apt.country, query) + '</span>',
              '    </div>',
              '  </div>',
              '  <div class="sf-search-item-price" style="color:#9BB1FF;font-size:11.5px">Direct Desk</div>',
              '</a>'
            );
          });
        }
      }

      resultsList.innerHTML = html.join('\n');
      selectedItemIndex = -1;

      var fallbackBtn = section.querySelector('#sf-search-fallback-btn');
      if (fallbackBtn) {
        fallbackBtn.addEventListener('click', function () {
          executeNavigation(input.value);
        });
      }

      openDropdown();
    }

    function runSearch(q) {
      if (clearBtn) clearBtn.classList.toggle('is-visible', !!q);
      renderResults(q);
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var val = input.value;
      debounceTimer = setTimeout(function () {
        runSearch(val);
      }, 120);
    });

    input.addEventListener('focus', function () {
      runSearch(input.value);
    });

    // Keyboard navigation inside suggestions list
    input.addEventListener('keydown', function (e) {
      var items = resultsList.querySelectorAll('.sf-search-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedItemIndex = (selectedItemIndex + 1) % items.length;
        updateSelectedResult(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedItemIndex = (selectedItemIndex - 1 + items.length) % items.length;
        updateSelectedResult(items);
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    function updateSelectedResult(items) {
      items.forEach(function (el, idx) {
        var isSel = idx === selectedItemIndex;
        el.classList.toggle('is-selected', isSel);
        if (isSel) {
          el.scrollIntoView({ block: 'nearest' });
          input.setAttribute('aria-activedescendant', el.id || '');
        }
      });
    }

    // Dismiss on outside click
    doc.addEventListener('click', function (e) {
      if (!section.contains(e.target)) {
        closeDropdown();
      }
    });
  }

  function mountSearchSection() {
    // 1. Check if section already exists in DOM
    var existingSections = doc.querySelectorAll('#footer-search-section, .sf-search-section');
    if (existingSections.length > 0) {
      existingSections.forEach(function (sec) {
        if (!sec.querySelector('.sf-search-inner')) {
          sec.innerHTML = renderFooterSearchHtml();
        }
        bindSearchComponent(sec);
      });
      return;
    }

    // 2. Otherwise auto-inject into site-footer
    var footers = doc.querySelectorAll('.site-footer, footer.site-footer');
    if (!footers.length) return;

    footers.forEach(function (footer) {
      var sec = doc.createElement('div');
      sec.className = 'sf-search-section';
      sec.id = 'footer-search-section';
      sec.innerHTML = renderFooterSearchHtml();

      // Insert at the very top of the footer before newsletter or inner grid
      var firstChild = footer.firstElementChild;
      if (firstChild) {
        footer.insertBefore(sec, firstChild);
      } else {
        footer.appendChild(sec);
      }

      bindSearchComponent(sec);
    });
  }

  // Auto-boot on load
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', mountSearchSection);
  } else {
    mountSearchSection();
  }

  // Export module API
  global.CabanaFooterSearch = {
    mount: mountSearchSection,
    fetchData: fetchSupabaseData,
    store: Store
  };

})(typeof window !== 'undefined' ? window : this);
