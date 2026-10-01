/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the page's launch copy
   ───────────────────────────────────────────────────────────────────
   The words /tours opens with, section by section, before the Cabana
   team edits anything in the console (Tours → Page). The same copy is
   seeded into tour_page_blocks by 20260930210000_tours_v3_world.sql;
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
      title: 'Safaris, day trips and city walks, *straight from the guide.*',
      lede: 'Real departures, real prices and the guide behind every tour. Message them first, then pay the deposit by M-Pesa.',
      image: null, image_mobile: null, video: null, focal: '50% 50%', shade: 45,
      search_placeholder: 'Where to? Try the Mara, Diani or Zanzibar',
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
      title: 'Leaving *soon*',
      lede: 'Every scheduled tour with seats in the next 30 days, counting down on Nairobi time.',
      show_clock: true } },
    { id: 'kinds', kind: 'kinds', position: 20, enabled: true, content: {
      eyebrow: 'Ways to travel',
      title: 'Choose the *kind of day* you want',
      lede: 'From a morning game drive to four days on a mountain.',
      cta_label: 'All tours',
      show_empty: true,
      items: {
        'day-safari': { name: 'Day safaris', blurb: 'Game drives between breakfast and dinner.', image: null, hidden: false, position: 1 },
        'big-safari': { name: 'Multi-day safaris', blurb: 'Nights in camp, days on the plains.', image: null, hidden: false, position: 2 },
        'day-trip': { name: 'Day trips', blurb: 'Lakes, gorges and hills within reach of the city.', image: null, hidden: false, position: 3 },
        'city-tour': { name: 'City walks', blurb: 'Food, history and nightlife, on foot with a local.', image: null, hidden: false, position: 4 },
        'adventure': { name: 'Adventure', blurb: 'Hikes, climbs, cycling and white water.', image: null, hidden: false, position: 5 },
        'culture': { name: 'Culture & community', blurb: 'Markets, music, craft and the people behind them.', image: null, hidden: false, position: 6 },
        'beach': { name: 'Coast & water', blurb: 'Dhows, reefs and islands.', image: null, hidden: false, position: 7 },
        'expedition': { name: 'Expeditions', blurb: 'Four days or more, for the big mountains.', image: null, hidden: false, position: 8 }
      } } },
    { id: 'immersive', kind: 'immersive', position: 30, enabled: true, content: {
      eyebrow: 'Cabana Immersive · VR & 360°',
      title: 'Stand in it *before you book.*',
      lede: 'Look around a place in 360° on your phone, in a VR viewer or in a headset, then book the real thing.' } },
    { id: 'places', kind: 'places', position: 40, enabled: true, content: {
      eyebrow: 'Where to',
      title: 'Where do you *want to go?*',
      lede: 'Pick a place to see its tours. If none are listed yet, ask to hear first and we will tell you the moment one opens.',
      cta_label: 'Open the catalogue',
      show_map: true } },
    { id: 'guides', kind: 'guides', position: 50, enabled: true, content: {
      eyebrow: 'Guides',
      title: 'Know your guide *before you go*',
      lede: 'Message any guide before you pay. Their number is shared once your booking is confirmed.',
      cta_label: 'Meet the guides',
      featured_ids: [] } },
    { id: 'catalogue', kind: 'catalogue', position: 60, enabled: true, content: {
      eyebrow: 'All tours',
      title: 'Every tour, *every departure*',
      lede: 'Filter by date, price, length and group size in the full catalogue.',
      cta_label: 'Open the catalogue',
      limit: 8,
      empty_title: 'The first tours are being checked',
      empty_text: 'Every guide and every tour is reviewed before it goes live. Follow a place above and we will tell you the moment one opens.',
      empty_cta_label: 'List your tours',
      empty_cta_url: '/list-your-tour' } },
    { id: 'pitch', kind: 'pitch', position: 80, enabled: true, content: {
      eyebrow: 'For guides and operators',
      title: 'Take a slot at *the top of Cabana Tours*',
      lede: 'Your photo or film, your headline and a Book button, in the Marquee every traveller sees first.',
      bullets: [
        'Pay by M-Pesa and pick your dates. We review every slot within a day.',
        'Not approved? The full amount comes back to you as Cabana credit.',
        'Views and taps for every day it runs, in your studio.'
      ],
      cta_label: 'Book a slot',
      cta_url: '/tours-studio?tab=spotlight',
      film_title: 'Film it in *360°*',
      film_text: 'Ask us to film your tour in 360° so travellers can stand in it before they book.',
      film_cta: 'Ask for filming' } },
    { id: 'invite', kind: 'invite', position: 90, enabled: true, content: {
      eyebrow: 'For guides and operators',
      title: 'Run tours? *List them here.*',
      lede: 'Set your own dates and prices and keep the full fare. We take no commission on the tour price.',
      bullets: [
        'No commission on the tour price',
        'Your dates, departure times, group sizes and prices',
        'Travellers message you on Cabana and pay by M-Pesa',
        'Send private group prices straight from the chat'
      ],
      cta_label: 'List your tours',
      cta_url: '/list-your-tour' } }
  ];
})(window);
