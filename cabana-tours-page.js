/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the page's launch copy
   ───────────────────────────────────────────────────────────────────
   The words /tours opens with, section by section, before the Cabana
   team edits anything in the console (Tours → Page). The same copy is
   seeded into tour_page_blocks by 20260929090000_tours_page_content.sql;
   tests/tours-v2.test.mjs keeps the two in step.

   Shared by the tours pages (as the fallback when the table has not
   answered) and by the console (so an editor always starts from what
   the page is really showing). Words in *stars* are the accent.
   ═══════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';
  g.CabanaToursPageDefaults = [
    { id: 'hero', kind: 'hero', position: 0, enabled: true, content: {
      eyebrow: 'Cabana Tours',
      title: 'Safaris, day trips and city walks, *booked direct.*',
      lede: 'Pick a date, message your guide and pay the deposit by M-Pesa. Every guide on Cabana is vetted by our team, and the price you see is the price they set.',
      image: null, image_mobile: null, video: null, focal: '50% 50%', shade: 55,
      search_placeholder: 'Where to? Try Naivasha, Diani or the Mara',
      auto_departures: true,
      links: [
        { label: 'This weekend', url: '/tours-catalogue?when=weekend' },
        { label: 'Day trips', url: '/tours-catalogue?len=1' },
        { label: 'Multi-day safaris', url: '/tours-catalogue?cat=big-safari' },
        { label: 'City walks', url: '/tours-catalogue?cat=city-tour' },
        { label: 'Under KES 5,000', url: '/tours-catalogue?price=u5' }
      ] } },
    { id: 'departures', kind: 'departures', position: 10, enabled: true, content: {
      eyebrow: 'Departures',
      title: 'Leaving in the *next 30 days*',
      lede: 'Scheduled tours that still have seats. Each card counts down to the moment the tour leaves.',
      show_clock: true } },
    { id: 'kinds', kind: 'kinds', position: 20, enabled: true, content: {
      eyebrow: 'Ways to travel',
      title: 'From sunrise game drives to *Friday-night food walks*',
      lede: 'Every tour sits in one of these, so you can go straight to the kind of day you want.',
      cta_label: 'Browse all tours',
      show_empty: false,
      items: {
        'day-safari': { name: 'Day safaris', blurb: 'Game drives you can fit between breakfast and dinner.', image: null, hidden: false, position: 1 },
        'big-safari': { name: 'Multi-day safaris', blurb: 'The Mara, Amboseli and Tsavo, with nights in camp.', image: null, hidden: false, position: 2 },
        'day-trip': { name: 'Day trips', blurb: 'Lakes, gorges and hills a short drive from the city.', image: null, hidden: false, position: 3 },
        'city-tour': { name: 'City walks', blurb: 'Food, history, art and nightlife, on foot with a local.', image: null, hidden: false, position: 4 },
        'adventure': { name: 'Adventure', blurb: 'Hikes, climbs, cycling and white water.', image: null, hidden: false, position: 5 },
        'culture': { name: 'Culture & community', blurb: 'Markets, music and craft, and the people behind them.', image: null, hidden: false, position: 6 },
        'beach': { name: 'Coast & water', blurb: 'Dhows, reefs, islands and long afternoons by the sea.', image: null, hidden: false, position: 7 },
        'expedition': { name: 'Expeditions', blurb: 'Four days or more, for the big mountains and far corners.', image: null, hidden: false, position: 8 }
      } } },
    { id: 'immersive', kind: 'immersive', position: 40, enabled: false, content: {} },
    { id: 'guides', kind: 'guides', position: 50, enabled: true, content: {
      eyebrow: 'Guides',
      title: 'Know your guide *before you go*',
      lede: 'See who they are and what they run, and ask them anything before you pay. Their number is shared with you once your booking is confirmed.',
      cta_label: 'Meet all the guides',
      featured_ids: [] } },
    { id: 'catalogue', kind: 'catalogue', position: 60, enabled: true, content: {
      eyebrow: 'The catalogue',
      title: 'Browse *every tour*',
      lede: 'Filter by date, price, length and group size in the full catalogue.',
      cta_label: 'See all tours',
      limit: 8,
      empty_title: 'The first tours are on their way',
      empty_text: 'Every guide and operator is vetted by our team before their tours go live. New tours appear here as soon as they are approved.',
      empty_cta_label: 'List your tours',
      empty_cta_url: '/list-your-tour' } },
    { id: 'pitch', kind: 'pitch', position: 80, enabled: true, content: {
      eyebrow: 'For guides and operators',
      title: 'Put your tour *at the top of the page*',
      lede: 'The Spotlight is the first thing travellers see on Cabana Tours: your photos or film, your headline, and a Book button that goes straight to your tour.',
      bullets: [
        'Pay by M-Pesa and choose your start date. We review every slide within a day.',
        'If we can’t approve it, the full amount comes back to you as Cabana credit.',
        'Track views and taps for every day it runs.',
        'Only a few paid slides run at once, so yours is seen.'
      ],
      cta_label: 'Get featured',
      cta_url: '/tours-studio?tab=spotlight' } },
    { id: 'invite', kind: 'invite', position: 90, enabled: true, content: {
      eyebrow: 'For guides and operators',
      title: 'Run tours? *List them on Cabana.*',
      lede: 'Whether you guide on your own or run a fleet, list what you already offer, set your own dates and prices, and keep the full fare. We take no commission on the tour price.',
      bullets: [
        'No commission on the tour price',
        'Your own dates, departure times, group sizes and prices',
        'Travellers message you on Cabana and pay by M-Pesa',
        'Send private prices to groups straight from the chat'
      ],
      cta_label: 'List your tours',
      cta_url: '/list-your-tour' } }
  ];
})(window);
