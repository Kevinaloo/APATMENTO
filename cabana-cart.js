/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE ORDER
   ───────────────────────────────────────────────────────────────────
   One basket that survives the walk between kitchens.

   A diner does not think in restaurants. They think in food. They
   want the biryani from one counter and the cake from another, and
   they should not have to choose between them or start again when
   they leave a page. So the basket lives here, above any one
   restaurant, in localStorage, and every page reads the same one.

   What it is NOT: a payment processor. Cabana takes no commission
   and adds nothing to a price, so nothing here charges a card. The
   basket's job is to carry the order, do the arithmetic honestly,
   and hand each kitchen a complete, correctly totalled ticket the
   diner sends themselves. Money moves between the diner and the
   counter, exactly as it does when you walk in.

   Every line is stored with the name, price and photo it had when
   it was added, so the basket renders instantly on any page without
   asking the database anything. Entries expire after 12 hours,
   because a basket from yesterday is not an order, it is a memory.

   Usage:
     CabanaCart.add(restaurant, item, qty)
     CabanaCart.groups()          → one entry per kitchen
     CabanaCart.totals()          → { count, subtotal, kitchens }
     CabanaCart.onChange(fn)      → fires on every mutation, any tab
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.CabanaCart) return;

  var KEY = 'cabana-cart';
  var WHO = 'cabana-diner';
  var VERSION = 1;
  var TTL = 12 * 3600e3;          /* a basket goes cold after 12 hours */
  var MAX_QTY = 99;

  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[cart:' + (label || '?') + ']', e && e.message); }
  }

  /* ── storage that never throws ──────────────────────────────────
     Private windows, Safari's ITP, an Instagram webview with storage
     disabled: all of these make localStorage explode rather than
     return null. When that happens the basket falls back to memory
     so the page still works for the length of the visit. */
  var MEM = {};
  var CAN_PERSIST = (function () {
    try {
      var k = '__cbn' + Date.now();
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function readRaw(k) {
    if (!CAN_PERSIST) return MEM[k] == null ? null : MEM[k];
    try { return global.localStorage.getItem(k); } catch (e) { return MEM[k] == null ? null : MEM[k]; }
  }
  function writeRaw(k, v) {
    MEM[k] = v;
    if (!CAN_PERSIST) return;
    try { global.localStorage.setItem(k, v); } catch (e) { /* quota or blocked. memory holds it */ }
  }
  function dropRaw(k) {
    delete MEM[k];
    if (!CAN_PERSIST) return;
    try { global.localStorage.removeItem(k); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════════ */
  var CART = blank();
  var SUBS = [];

  function blank() { return { v: VERSION, t: Date.now(), kitchens: {} }; }

  function num(n) { var v = Number(n); return isFinite(v) ? v : 0; }
  function str(s) { return s == null ? '' : String(s); }
  function clampQty(q) { return Math.max(0, Math.min(MAX_QTY, Math.round(num(q)))); }

  /* ── load ─────────────────────────────────────────────────────── */
  function load() {
    var raw = readRaw(KEY);
    var next = blank();
    if (raw) {
      safe(function () {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object' && o.kitchens && typeof o.kitchens === 'object') {
          next.kitchens = o.kitchens;
          next.t = num(o.t) || Date.now();
        }
      }, 'parse');
    }
    CART = next;
    prune();
    adopt();                       /* pull in anything left by the old per-restaurant basket */
    return CART;
  }

  /* ── prune ── a kitchen whose basket has gone cold, or which has
        been emptied down to nothing, leaves quietly ─────────────── */
  function prune() {
    var now = Date.now(), touched = false;
    Object.keys(CART.kitchens).forEach(function (id) {
      var g = CART.kitchens[id];
      if (!g || typeof g !== 'object') { delete CART.kitchens[id]; touched = true; return; }
      if (!g.items || typeof g.items !== 'object' || !Object.keys(g.items).length) {
        delete CART.kitchens[id]; touched = true; return;
      }
      if (num(g.t) && now - num(g.t) > TTL) { delete CART.kitchens[id]; touched = true; return; }
      /* a line with no quantity is not a line */
      Object.keys(g.items).forEach(function (iid) {
        var it = g.items[iid];
        if (!it || clampQty(it.qty) <= 0) { delete g.items[iid]; touched = true; }
      });
      if (!Object.keys(g.items).length) { delete CART.kitchens[id]; touched = true; }
    });
    return touched;
  }

  /* ── adopt ── the basket used to live per restaurant, under
        'cabana-order-<id>'. Anything still sitting in one of those
        is a real order somebody started, so carry it across rather
        than making them build it again. ─────────────────────────── */
  function adopt() {
    if (!CAN_PERSIST) return;
    safe(function () {
      var stale = [];
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        if (k && k.indexOf('cabana-order-') === 0) stale.push(k);
      }
      stale.forEach(function (k) {
        var id = k.slice('cabana-order-'.length);
        safe(function () {
          var o = JSON.parse(global.localStorage.getItem(k) || 'null');
          dropRaw(k);
          if (!o || !o.items || Date.now() - num(o.t) > TTL) return;
          /* The old shape kept only id → qty. Price and name lived on the
             page. Keep the quantities and let the restaurant page refill
             the detail the next time it renders. */
          var g = CART.kitchens[id] || (CART.kitchens[id] = {
            id: id, name: '', currency: 'KES', t: num(o.t) || Date.now(), items: {}
          });
          Object.keys(o.items).forEach(function (iid) {
            var q = clampQty(o.items[iid]);
            if (!q) return;
            if (g.items[iid]) g.items[iid].qty = q;
            else g.items[iid] = { id: iid, name: '', price: 0, promo_price: null, photo: '', qty: q, thin: true };
          });
        }, 'adopt-one');
      });
    }, 'adopt');
  }

  /* ── save ─────────────────────────────────────────────────────── */
  function save(silent) {
    CART.t = Date.now();
    CART.v = VERSION;
    writeRaw(KEY, JSON.stringify(CART));
    if (!silent) fire();
  }

  /* ═══════════════════════════════════════════════════════════════
     SUBSCRIBERS
     Every badge, tray and drawer on the page listens here, so one
     mutation repaints all of them and nothing drifts out of sync.
     ═══════════════════════════════════════════════════════════════ */
  function fire() {
    var snap = api.totals();
    SUBS.slice().forEach(function (fn) { safe(function () { fn(snap, CART); }, 'sub'); });
  }

  /* another tab changed the basket. Reload and repaint, don't re-save */
  safe(function () {
    global.addEventListener('storage', function (e) {
      if (e && e.key === KEY) { load(); fire(); }
    });
  }, 'sync');

  /* ═══════════════════════════════════════════════════════════════
     THE KITCHEN RECORD
     Denormalised on purpose. The drawer must render on a page that
     never queried this restaurant, so everything it needs to show a
     line and build a ticket is written down at the moment of adding.
     ═══════════════════════════════════════════════════════════════ */
  function shapeKitchen(r) {
    r = r || {};
    return {
      id: str(r.id),
      name: str(r.name || r.title),
      currency: str(r.currency) || 'KES',
      wa: str(r.wa || r.whatsapp || r.order_whatsapp || r.contact_whatsapp),
      ph: str(r.ph || r.phone || r.order_phone || r.contact_phone),
      photo: str(r.photo || r.hero_photo || r.hero),
      where: str(r.where || [r.area, r.city].filter(Boolean).join(', ')),
      delivery_fee: r.delivery_fee == null ? null : num(r.delivery_fee),
      min_order: r.min_order == null ? null : num(r.min_order),
      delivery_mins: r.delivery_mins == null ? null : num(r.delivery_mins),
      prep_mins: r.prep_mins == null ? null : num(r.prep_mins),
      serves_delivery: r.serves_delivery !== false,
      serves_pickup: r.serves_pickup !== false,
      serves_dine_in: r.serves_dine_in !== false,
      opens_at: str(r.opens_at) || null,
      closes_at: str(r.closes_at) || null,
      open_days: Array.isArray(r.open_days) ? r.open_days.slice() : null
    };
  }

  function shapeItem(it) {
    it = it || {};
    return {
      id: str(it.id),
      name: str(it.name),
      price: num(it.price),
      promo_price: it.promo_price == null || it.promo_price === '' ? null : num(it.promo_price),
      photo: str(it.photo),
      section: str(it.section || ''),
      qty: 0
    };
  }

  function unit(it) {
    return it && it.promo_price != null ? num(it.promo_price) : num(it && it.price);
  }

  /* Merge fresh detail onto a record without losing the quantity the
     diner chose, so re-opening a restaurant repairs a thin line that
     was adopted from the old basket. */
  function refresh(g, r) {
    if (!r) return;
    var s = shapeKitchen(r);
    Object.keys(s).forEach(function (k) {
      var v = s[k];
      if (v === '' || v == null) return;
      if (k === 'serves_delivery' || k === 'serves_pickup' || k === 'serves_dine_in') { g[k] = v; return; }
      g[k] = v;
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     API
     ═══════════════════════════════════════════════════════════════ */
  var api = {};

  /* ── add ── restaurant descriptor, item descriptor, how many ──── */
  api.add = function (restaurant, item, qty) {
    var rid = str(restaurant && (restaurant.id || restaurant.listing_id));
    var iid = str(item && item.id);
    if (!rid || !iid) return api.totals();
    var q = clampQty(qty == null ? 1 : qty);
    if (q <= 0) return api.remove(rid, iid);

    var g = CART.kitchens[rid];
    if (!g) { g = CART.kitchens[rid] = shapeKitchen(restaurant); g.id = rid; g.items = {}; }
    else { refresh(g, restaurant); if (!g.items) g.items = {}; }
    g.t = Date.now();

    var line = g.items[iid];
    if (line && !line.thin) {
      line.qty = clampQty(line.qty + q);
      /* the kitchen may have re-priced since this was added */
      var fresh = shapeItem(item);
      if (fresh.name) line.name = fresh.name;
      if (fresh.price) line.price = fresh.price;
      line.promo_price = fresh.promo_price;
      if (fresh.photo) line.photo = fresh.photo;
      if (fresh.section) line.section = fresh.section;
    } else {
      var prevQty = line && line.thin ? clampQty(line.qty) : 0;
      line = g.items[iid] = shapeItem(item);
      line.id = iid;
      line.qty = clampQty(prevQty + q) || q;
    }
    save();
    return api.totals();
  };

  /* ── set an exact quantity. Zero removes the line ─────────────── */
  api.setQty = function (rid, iid, qty) {
    rid = str(rid); iid = str(iid);
    var g = CART.kitchens[rid];
    if (!g || !g.items || !g.items[iid]) return api.totals();
    var q = clampQty(qty);
    if (q <= 0) { delete g.items[iid]; if (!Object.keys(g.items).length) delete CART.kitchens[rid]; }
    else { g.items[iid].qty = q; g.t = Date.now(); }
    save();
    return api.totals();
  };

  api.bump = function (rid, iid, delta) {
    return api.setQty(rid, iid, api.qty(rid, iid) + num(delta));
  };

  api.remove = function (rid, iid) { return api.setQty(rid, iid, 0); };

  api.qty = function (rid, iid) {
    var g = CART.kitchens[str(rid)];
    var it = g && g.items && g.items[str(iid)];
    return it ? clampQty(it.qty) : 0;
  };

  api.has = function (rid, iid) { return api.qty(rid, iid) > 0; };

  /* ── how the diner wants it: delivery, collection or a table ──── */
  api.setMode = function (rid, mode) {
    var g = CART.kitchens[str(rid)];
    if (!g) return api.totals();
    if (['delivery', 'pickup', 'dine_in'].indexOf(mode) === -1) return api.totals();
    g.mode = mode; g.t = Date.now();
    save();
    return api.totals();
  };
  api.mode = function (rid) {
    var g = CART.kitchens[str(rid)];
    if (!g) return 'delivery';
    if (g.mode) return g.mode;
    /* whatever the kitchen actually does, in the order most people want it */
    if (g.serves_delivery !== false) return 'delivery';
    if (g.serves_pickup !== false) return 'pickup';
    return 'dine_in';
  };

  /* ── a word to the kitchen: no chilli, extra napkins, gate code ── */
  api.setNote = function (rid, note) {
    var g = CART.kitchens[str(rid)];
    if (!g) return api.totals();
    g.note = str(note).slice(0, 400); g.t = Date.now();
    save(true); fire();
    return api.totals();
  };
  api.note = function (rid) { var g = CART.kitchens[str(rid)]; return (g && g.note) || ''; };

  /* ── who is ordering. Kept once, reused for every kitchen ─────── */
  api.diner = function () {
    var raw = readRaw(WHO);
    var o = {};
    if (raw) safe(function () { var p = JSON.parse(raw); if (p && typeof p === 'object') o = p; }, 'diner');
    return { name: str(o.name), phone: str(o.phone), address: str(o.address), note: str(o.note) };
  };
  api.setDiner = function (d) {
    d = d || {};
    var cur = api.diner();
    var next = {
      name: str(d.name == null ? cur.name : d.name).slice(0, 120),
      phone: str(d.phone == null ? cur.phone : d.phone).slice(0, 40),
      address: str(d.address == null ? cur.address : d.address).slice(0, 400),
      note: str(d.note == null ? cur.note : d.note).slice(0, 400)
    };
    writeRaw(WHO, JSON.stringify(next));
    return next;
  };

  /* ═══════════════════════════════════════════════════════════════
     READING THE BASKET
     ═══════════════════════════════════════════════════════════════ */

  /* One kitchen, fully costed. Lines carry their own line total so
     nothing downstream has to redo the multiplication. */
  api.group = function (rid) {
    var g = CART.kitchens[str(rid)];
    if (!g || !g.items) return null;
    var items = Object.keys(g.items).map(function (iid) {
      var it = g.items[iid];
      var u = unit(it);
      return {
        id: iid,
        name: it.name || 'Dish',
        price: num(it.price),
        promo_price: it.promo_price == null ? null : num(it.promo_price),
        unit: u,
        qty: clampQty(it.qty),
        line: u * clampQty(it.qty),
        photo: it.photo || '',
        section: it.section || '',
        thin: !!it.thin
      };
    }).filter(function (i) { return i.qty > 0; });

    var subtotal = items.reduce(function (a, i) { return a + i.line; }, 0);
    var count = items.reduce(function (a, i) { return a + i.qty; }, 0);
    var mode = api.mode(rid);
    var fee = mode === 'delivery' && g.delivery_fee != null ? num(g.delivery_fee) : 0;
    var short = g.min_order != null && subtotal < num(g.min_order) ? num(g.min_order) - subtotal : 0;

    return {
      id: str(rid),
      name: g.name || 'Kitchen',
      currency: g.currency || 'KES',
      wa: g.wa || '', ph: g.ph || '',
      photo: g.photo || '', where: g.where || '',
      delivery_fee: g.delivery_fee == null ? null : num(g.delivery_fee),
      min_order: g.min_order == null ? null : num(g.min_order),
      delivery_mins: g.delivery_mins, prep_mins: g.prep_mins,
      serves_delivery: g.serves_delivery !== false,
      serves_pickup: g.serves_pickup !== false,
      serves_dine_in: g.serves_dine_in !== false,
      opens_at: g.opens_at || null, closes_at: g.closes_at || null,
      open_days: g.open_days || null,
      mode: mode, note: g.note || '',
      items: items,
      count: count,
      subtotal: subtotal,
      fee: fee,
      total: subtotal + fee,
      shortBy: short,          /* how far under the kitchen's minimum, if at all */
      t: num(g.t)
    };
  };

  /* Every kitchen in the basket, oldest first, so the order a diner
     built things in is the order they read them back in. */
  api.groups = function () {
    return Object.keys(CART.kitchens)
      .map(api.group)
      .filter(Boolean)
      .sort(function (a, b) { return a.t - b.t; });
  };

  api.totals = function () {
    var gs = api.groups();
    return {
      count: gs.reduce(function (a, g) { return a + g.count; }, 0),
      subtotal: gs.reduce(function (a, g) { return a + g.subtotal; }, 0),
      fees: gs.reduce(function (a, g) { return a + g.fee; }, 0),
      total: gs.reduce(function (a, g) { return a + g.total; }, 0),
      kitchens: gs.length,
      currency: gs.length ? gs[0].currency : 'KES',
      mixed: gs.some(function (g) { return g.currency !== (gs[0] && gs[0].currency); })
    };
  };

  api.isEmpty = function () { return !api.groups().length; };

  api.clearKitchen = function (rid) {
    delete CART.kitchens[str(rid)];
    save();
    return api.totals();
  };

  api.clear = function () {
    CART = blank();
    save();
    return api.totals();
  };

  /* ═══════════════════════════════════════════════════════════════
     THE TICKET
     What the kitchen actually receives. Written the way a person
     writes an order in a message, not the way a machine serialises
     one: quantities first, a total that adds up, and a line saying
     where it came from so the kitchen knows to trust it.
     ═══════════════════════════════════════════════════════════════ */
  api.money = function (n, cur) {
    return (cur || 'KES') + ' ' + Math.round(num(n)).toLocaleString();
  };

  var MODE_SAYS = {
    delivery: 'Delivery',
    pickup: 'I will collect',
    dine_in: 'Eating in'
  };

  api.ticket = function (rid, opts) {
    var g = api.group(rid);
    if (!g) return '';
    opts = opts || {};
    var who = api.diner();
    var m = function (n) { return api.money(n, g.currency); };
    var L = [];

    L.push('Hello ' + (g.name || 'there') + ', I would like to order:');
    L.push('');
    g.items.forEach(function (i) {
      L.push(i.qty + ' x ' + i.name + '  —  ' + m(i.line));
    });
    L.push('');
    L.push('Food total: ' + m(g.subtotal));
    if (g.fee > 0) {
      L.push('Delivery: ' + m(g.fee));
      L.push('Total: ' + m(g.total));
    }
    L.push('');
    L.push(MODE_SAYS[g.mode] || 'Delivery');
    if (who.name) L.push('Name: ' + who.name);
    if (who.phone) L.push('Phone: ' + who.phone);
    if (g.mode === 'delivery' && who.address) L.push('Address: ' + who.address);
    var note = [g.note, who.note].filter(Boolean).join(' · ');
    if (note) L.push('Note: ' + note);
    L.push('');
    L.push('Sent from Cabana' + (opts.url ? ': ' + opts.url : ''));
    return L.join('\n');
  };

  api.waLink = function (rid, opts) {
    var g = api.group(rid);
    if (!g || !g.wa) return '';
    var digits = String(g.wa).replace(/\D/g, '');
    if (!digits) return '';
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(api.ticket(rid, opts));
  };

  api.telLink = function (rid) {
    var g = api.group(rid);
    return g && g.ph ? 'tel:' + String(g.ph).replace(/\s+/g, '') : '';
  };

  /* ── is this kitchen cooking right now? ──────────────────────────
        true / false / null when the kitchen never stated its hours,
        because guessing at that is worse than saying nothing. */
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function mins(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  api.cooking = function (rid) {
    var g = CART.kitchens[str(rid)];
    if (!g) return null;
    var o = mins(g.opens_at), c = mins(g.closes_at);
    var now = new Date(), day = DAYS[now.getDay()], nm = now.getHours() * 60 + now.getMinutes();
    var days = g.open_days && g.open_days.length ? g.open_days : DAYS;
    if (days.indexOf(day) === -1) return false;
    if (o == null || c == null) return null;
    return c > o ? (nm >= o && nm < c) : (nm >= o || nm < c);
  };

  /* ═══════════════════════════════════════════════════════════════
     EVENTS
     ═══════════════════════════════════════════════════════════════ */
  api.onChange = function (fn) {
    if (typeof fn !== 'function') return function () {};
    SUBS.push(fn);
    safe(function () { fn(api.totals(), CART); }, 'sub-init');
    return function () {
      var i = SUBS.indexOf(fn);
      if (i > -1) SUBS.splice(i, 1);
    };
  };

  api.reload = function () { load(); fire(); return api.totals(); };
  api.raw = function () { return CART; };
  api.persists = function () { return CAN_PERSIST; };
  api.TTL = TTL;

  load();
  global.CabanaCart = api;

})(typeof window !== 'undefined' ? window : this);
