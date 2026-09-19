/* ═══════════════════════════════════════════════════════════════════
   CABANA · ORDERS
   ───────────────────────────────────────────────────────────────────
   The one place a page talks to the order service. The basket
   (cabana-cart.js) is what a diner is still choosing; an order is
   what they sent. Once sent, it lives on the server, and this file
   is how the checkout, the tracking page, the food page, the kitchen
   console and the rider's link all read and move it.

   A diner who is not signed in still owns their order: placing it
   returns a private token, kept here on the device, and the tracking
   link carries it. Signing in later is never required to follow an
   order through to the door.

   Usage:
     CabanaOrders.place(payload)          → { ref, token, … }
     CabanaOrders.track(ref, token)       → the full order, guest view
     CabanaOrders.mine()                  → recent orders on this device / account
     CabanaOrders.remember(ref, token, extra)
     CabanaOrders.say(status, mode)       → words for a status
     CabanaOrders.explain(error)          → a sentence a person can act on
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaOrders) return;

  var URL_ = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var KEY_ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var STORE = 'cabana-food-orders';
  var KEEP = 60 * 24 * 3600e3;

  var client = null;
  function sb() {
    if (client) return client;
    try { if (global.ApaSession && global.ApaSession.client) client = global.ApaSession.client(); } catch (e) {}
    if (!client && global.supabase && global.supabase.createClient) {
      client = global.supabase.createClient(URL_, KEY_);
    }
    return client;
  }

  /* ── storage that never throws ── */
  function read() {
    try {
      var a = JSON.parse(global.localStorage.getItem(STORE) || '[]');
      if (!Array.isArray(a)) return [];
      var now = Date.now();
      return a.filter(function (o) { return o && o.ref && o.token && now - (o.at || 0) < KEEP; });
    } catch (e) { return []; }
  }
  function write(a) {
    try { global.localStorage.setItem(STORE, JSON.stringify(a.slice(0, 80))); } catch (e) {}
  }

  function rpc(fn, args) {
    var c = sb();
    if (!c) return Promise.reject(new Error('offline'));
    return c.rpc(fn, args || {}).then(function (r) {
      if (r.error) {
        var e = new Error(r.error.message || 'error');
        e.code = (r.error.message || '').trim();
        e.detail = r.error.details || r.error.detail || '';
        throw e;
      }
      return r.data;
    });
  }

  var api = {};
  api.client = sb;
  api.rpc = rpc;

  api.remember = function (ref, token, extra) {
    if (!ref || !token) return;
    var a = read().filter(function (o) { return o.ref !== ref; });
    var row = { ref: ref, token: token, at: Date.now() };
    if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
    a.unshift(row);
    write(a);
  };
  api.local = read;
  api.tokenFor = function (ref) {
    var r = read().filter(function (o) { return o.ref === String(ref || '').toUpperCase(); })[0];
    return r ? r.token : null;
  };
  api.forget = function (ref) { write(read().filter(function (o) { return o.ref !== ref; })); };

  api.place = function (payload) {
    return rpc('food_order_place', { p: payload }).then(function (r) {
      api.remember(r.ref, r.token, { kitchen: r.kitchen, basket: payload.basket || null });
      return r;
    });
  };
  api.track = function (ref, token) {
    return rpc('food_order_track', { p_ref: ref, p_token: token || api.tokenFor(ref) || null });
  };
  api.mine = function () {
    var pairs = read().map(function (o) { return { ref: o.ref, token: o.token }; });
    return rpc('food_orders_list', { p_pairs: pairs });
  };
  api.cancel = function (ref, token, reason) {
    return rpc('food_order_cancel', { p_ref: ref, p_token: token || api.tokenFor(ref), p_reason: reason || null });
  };
  api.verifyRider = function (ref, token, code) {
    return rpc('food_order_verify_rider', { p_ref: ref, p_token: token || api.tokenFor(ref), p_code: code });
  };
  api.rate = function (ref, token, rating, review) {
    return rpc('food_order_rate', { p_ref: ref, p_token: token || api.tokenFor(ref), p_rating: rating, p_review: review || null });
  };
  api.link = function (ref, token) {
    return global.location.origin + '/order?ref=' + encodeURIComponent(ref) + (token ? '&t=' + encodeURIComponent(token) : '');
  };

  /* ═══════════════════════════════════════════════════════════════
     WORDS
     ═══════════════════════════════════════════════════════════════ */
  api.confirmPayment = function (ref, token, action) {
    return rpc('food_order_confirm_payment', {
      p_ref: ref, p_token: token || api.tokenFor(ref),
      p_action: action || 'confirm'
    });
  };

  api.LIVE = ['requested', 'awaiting_payment', 'accepted', 'ready', 'on_the_way'];
  api.isLive = function (s) { return api.LIVE.indexOf(s) > -1; };

  api.say = function (status, mode) {
    switch (status) {
      case 'requested': return 'Waiting for the kitchen';
      case 'awaiting_payment': return 'Kitchen accepted — confirm your total';
      case 'accepted': return 'Accepted · cooking';
      case 'ready': return mode === 'pickup' ? 'Ready to collect' : mode === 'dine_in' ? 'Coming to your table' : 'Packed · rider next';
      case 'on_the_way': return 'On the way';
      case 'completed': return mode === 'pickup' ? 'Collected' : mode === 'dine_in' ? 'Served' : 'Delivered';
      case 'declined': return 'Declined by the kitchen';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'No answer · not charged';
      default: return status || '';
    }
  };

  api.DECLINE = {
    unavailable: 'Some dishes are finished for today',
    busy: 'The kitchen is too busy right now',
    closed: 'The kitchen is closed',
    too_far: 'You are outside their delivery area',
    below_minimum: 'The order is under their minimum',
    other: 'Something else'
  };

  var ERR = {
    kitchen_missing: 'This kitchen could not be found.',
    kitchen_unavailable: 'This kitchen is not taking orders on Cabana right now.',
    kitchen_not_taking_orders: 'This kitchen has switched ordering off for now.',
    kitchen_paused: 'This kitchen is full and has paused new orders.',
    mode_invalid: 'Choose delivery, collection or eat in.',
    mode_not_offered: 'This kitchen does not offer that. Pick another way to get your food.',
    name_required: 'Add the name the kitchen should call out.',
    phone_required: 'Add a phone number the kitchen and rider can reach.',
    address_required: 'Add where the rider should bring it.',
    schedule_invalid: 'Pick a time at least 10 minutes from now and within the week.',
    too_many_orders: 'You have several orders waiting already. Give the kitchens a moment to answer.',
    items_required: 'Add at least one dish.',
    too_many_items: 'That is a lot of dishes for one ticket. Split it into two orders.',
    item_missing: 'A dish in your order is no longer on the menu. Remove it and send again.',
    item_sold_out: 'A dish in your order has just sold out. Remove it and send again.',
    below_minimum: 'This order is under the kitchen’s minimum for delivery.',
    order_not_found: 'We could not find that order. Check the link you opened.',
    too_late_to_cancel: 'The kitchen already answered, so it cannot be cancelled here. Call them instead.',
    no_rider_yet: 'No rider has been sent yet.',
    too_many_attempts: 'Too many wrong codes. Call the kitchen to finish the handover.',
    not_completed: 'You can rate once the order is complete.',
    rating_invalid: 'Choose between one and five stars.',
    sign_in_required: 'Sign in to run your kitchen.',
    already_answered: 'This order was already answered.',
    reason_required: 'Tell the diner why, so they can decide what to do next.',
    wrong_step: ‘That step does not apply to this order any more. Refreshing.’,
    not_delivery: ‘Only delivery orders go out with a rider.’,
    rider_required: ‘Add the rider’s name.’,
    not_dine_in: ‘Only eat-in orders are marked as served.’,
    use_served: ‘Mark eat-in orders as served.’,
    not_your_kitchen: ‘This kitchen is not on your account.’,
    unknown_action: ‘That action is not available.’,
    not_awaiting_payment: ‘This order is no longer waiting for payment confirmation.’,
    action_invalid: ‘That action is not recognised.’,
    offline: ‘You appear to be offline. Check your connection and try again.’
  };
  api.explain = function (e) {
    var c = (e && (e.code || e.message)) || '';
    if (ERR[c]) {
      if (c === 'item_sold_out' && e.detail) return '“' + e.detail + '” has just sold out. Remove it and send again.';
      if (c === 'below_minimum' && e.detail) return 'This kitchen delivers from KES ' + Number(e.detail).toLocaleString() + '. Add a little more, or collect it instead.';
      if (c === 'kitchen_paused' && e.detail) return 'This kitchen paused new orders until ' + e.detail + '. Try again then, or pick another kitchen.';
      return ERR[c];
    }
    if (/fetch|network|Failed to/i.test(c)) return ERR.offline;
    return 'Something went wrong. Try again in a moment.';
  };

  api.money = function (n, cur) {
    return (cur || 'KES') + ' ' + Math.round(Number(n) || 0).toLocaleString();
  };
  api.clock = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  };
  api.uuid = function () {
    try { if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  };

  global.CabanaOrders = api;
})(typeof window !== 'undefined' ? window : this);
