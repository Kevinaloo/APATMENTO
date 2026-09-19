/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · THE AGENT NETWORK — ENGINE
   ───────────────────────────────────────────────────────────────────────────
     THE NETWORK    the hero backdrop: hosts on one side, clients on the
                    other, and the agent as the only path between them. Every
                    packet that crosses the canvas is the page's whole
                    argument, drawn rather than claimed.

     THE DESK       the deal desk. Three sliders drive one set of figures, a
                    twelve-month curve and a plain-English description of the
                    size of book they add up to. The arithmetic is trivial on
                    purpose: a number nobody can check is a number nobody
                    should trust.

     THE CALENDAR   an illustration of live availability, flipping a night at
                    a time so the point lands without a screenshot.

   Frame loops belong to the programme runtime, never to this file.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var Programme = global.CabanaProgramme;
  if (!Programme) return;

  /* ══ 1 · THE NETWORK ════════════════════════════════════════════════════ */
  function network() {
    var canvas = document.querySelector('[data-agent-network]');
    var context = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!context) return;

    var W = canvas.width, H = canvas.height;
    var hub = { x: W * 0.63, y: H * 0.5 };
    var hosts = [], clients = [], edges = [];
    var i;

    for (i = 0; i < 5; i++) {
      var ha = -0.62 + (i / 4) * 1.24;
      hosts.push({ x: hub.x - 300 - Math.cos(ha) * 140, y: hub.y + Math.sin(ha) * 330, r: 5 });
    }
    for (i = 0; i < 7; i++) {
      var ca = -0.78 + (i / 6) * 1.56;
      clients.push({ x: hub.x + 300 + Math.cos(ca) * 160, y: hub.y + Math.sin(ca) * 360, r: 4 });
    }
    hosts.forEach(function (node) { edges.push({ a: node, b: hub, inbound: true }); });
    clients.forEach(function (node) { edges.push({ a: hub, b: node, inbound: false }); });

    /* Each edge bows away from the straight line, so the map reads as routes
       rather than a wire diagram. */
    edges.forEach(function (edge, index) {
      var mx = (edge.a.x + edge.b.x) / 2;
      var my = (edge.a.y + edge.b.y) / 2;
      edge.cx = mx;
      edge.cy = my + (index % 2 ? -1 : 1) * (60 + (index % 3) * 46);
      edge.phase = Math.random();
      edge.speed = 0.10 + Math.random() * 0.16;
    });

    function point(edge, t) {
      var u = 1 - t;
      return {
        x: u * u * edge.a.x + 2 * u * t * edge.cx + t * t * edge.b.x,
        y: u * u * edge.a.y + 2 * u * t * edge.cy + t * t * edge.b.y,
      };
    }

    Programme.loop(canvas, function (time, dt, still) {
      context.clearRect(0, 0, W, H);

      /* Edges. */
      edges.forEach(function (edge) {
        context.beginPath();
        context.moveTo(edge.a.x, edge.a.y);
        context.quadraticCurveTo(edge.cx, edge.cy, edge.b.x, edge.b.y);
        context.strokeStyle = edge.inbound ? 'rgba(34,229,255,0.24)' : 'rgba(139,92,246,0.26)';
        context.lineWidth = 1.4;
        context.stroke();
      });

      /* Packets. */
      edges.forEach(function (edge) {
        var t = (edge.phase + (still ? 0 : time * edge.speed)) % 1;
        var p = point(edge, t);
        var colour = edge.inbound ? '198,255,74' : '34,229,255';
        var glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
        glow.addColorStop(0, 'rgba(' + colour + ',0.85)');
        glow.addColorStop(1, 'rgba(' + colour + ',0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(p.x, p.y, 26, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255,255,255,0.92)';
        context.beginPath();
        context.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        context.fill();
      });

      /* Endpoints. */
      hosts.concat(clients).forEach(function (node, index) {
        var pulse = still ? 0.5 : (Math.sin(time * 1.1 + index) * 0.5 + 0.5);
        context.fillStyle = 'rgba(234,243,255,' + (0.22 + pulse * 0.34) + ')';
        context.beginPath();
        context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(120,180,240,0.22)';
        context.lineWidth = 1;
        context.beginPath();
        context.arc(node.x, node.y, node.r + 8 + pulse * 5, 0, Math.PI * 2);
        context.stroke();
      });

      /* The hub — the agent. Two counter-rotating rings and a steady core. */
      var breathe = still ? 0 : Math.sin(time * 1.6) * 0.5 + 0.5;
      context.save();
      context.translate(hub.x, hub.y);
      var core = context.createRadialGradient(0, 0, 0, 0, 0, 96);
      core.addColorStop(0, 'rgba(34,229,255,' + (0.34 + breathe * 0.16) + ')');
      core.addColorStop(1, 'rgba(34,229,255,0)');
      context.fillStyle = core;
      context.beginPath();
      context.arc(0, 0, 96, 0, Math.PI * 2);
      context.fill();

      [[34, 1, 'rgba(198,255,74,0.6)'], [52, -0.62, 'rgba(34,229,255,0.5)']].forEach(function (ring) {
        context.save();
        context.rotate((still ? 0 : time) * ring[1] * 0.6);
        context.strokeStyle = ring[2];
        context.lineWidth = 1.6;
        context.setLineDash([16, 12]);
        context.beginPath();
        context.arc(0, 0, ring[0], 0, Math.PI * 2);
        context.stroke();
        context.restore();
      });
      context.setLineDash([]);
      context.fillStyle = 'rgba(234,243,255,0.96)';
      context.beginPath();
      context.arc(0, 0, 7, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  /* ══ 2 · THE DEAL DESK ══════════════════════════════════════════════════ */
  function desk() {
    var host = document.querySelector('[data-agent-demo]');
    if (!host) return;

    var value = host.querySelector('#demo-value');
    var rate = host.querySelector('#demo-rate');
    var volume = host.querySelector('#demo-volume');
    if (!value || !rate) return;

    var out = {
      booking: host.querySelector('[data-booking-label]'),
      rate: host.querySelector('[data-rate-label]'),
      volume: host.querySelector('[data-volume-label]'),
      commission: host.querySelector('[data-commission]'),
      monthly: host.querySelector('[data-monthly]'),
      annual: host.querySelector('[data-annual]'),
      ledgerValue: host.querySelector('[data-ledger-value]'),
      ledgerRate: host.querySelector('[data-ledger-rate]'),
      ledgerVolume: host.querySelector('[data-ledger-volume]'),
      band: host.querySelector('[data-agent-band]'),
      bandFill: host.querySelector('[data-agent-band-fill]'),
    };
    var money = Programme.money;

    /* Plain-language descriptions of the figures on screen. They describe the
       size of the illustration, and the page says so directly underneath —
       they are not levels, ranks or anything Cabana confers. */
    var BANDS = [
      [0, 'pocket money on the side'],
      [60000, 'a useful side income'],
      [240000, 'a steady second income'],
      [900000, 'a full-time desk'],
      [3000000, 'a small agency'],
    ];

    var chart = { canvas: host.querySelector('[data-agent-chart]'), shown: 0, target: 0 };
    chart.context = chart.canvas && chart.canvas.getContext ? chart.canvas.getContext('2d') : null;

    function compute() {
      var booking = Number(value.value);
      var pct = Number(rate.value);
      var runs = volume ? Number(volume.value) : 1;

      var perBooking = booking * pct / 100;
      var monthly = perBooking * runs;
      var annual = monthly * 12;

      /* Values that mirror a control are written straight out: a number that
         animates while the visitor is still dragging the slider that feeds it
         reads as lag, not polish. */
      if (out.booking) out.booking.textContent = money(booking);
      if (out.rate) out.rate.textContent = pct + '%';
      if (out.volume) out.volume.textContent = String(runs);
      if (out.commission) out.commission.textContent = money(perBooking);
      if (out.ledgerValue) out.ledgerValue.textContent = money(booking);
      if (out.ledgerRate) out.ledgerRate.textContent = pct + '%';
      if (out.ledgerVolume) out.ledgerVolume.textContent = String(runs);

      Programme.countUp(out.monthly, monthly, { format: money, duration: 600 });
      Programme.countUp(out.annual, annual, { format: money, duration: 700 });

      var label = BANDS[0][1];
      for (var i = 0; i < BANDS.length; i++) if (annual >= BANDS[i][0]) label = BANDS[i][1];
      if (out.band && out.band.textContent !== label) out.band.textContent = label;
      if (out.bandFill) {
        var fill = Math.max(0.06, Math.min(1, Math.log10(1 + annual) / 7));
        out.bandFill.style.width = (fill * 100).toFixed(1) + '%';
      }

      chart.target = annual;
      host.querySelectorAll('[data-agent-preset]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(Number(button.dataset.agentPreset) === booking));
      });
    }

    /* The twelve-month curve. It eases toward the new total rather than
       snapping, so dragging a slider looks like a market moving. */
    if (chart.context) {
      var C = chart.context;
      var W = chart.canvas.width, H = chart.canvas.height;
      var PAD = { l: 18, r: 18, t: 22, b: 34 };

      Programme.loop(chart.canvas, function (time, dt, still) {
        if (still) chart.shown = chart.target;
        else chart.shown += (chart.target - chart.shown) * Math.min(1, dt * 4.2);

        C.clearRect(0, 0, W, H);
        var plotW = W - PAD.l - PAD.r;
        var plotH = H - PAD.t - PAD.b;
        var peak = Math.max(1, chart.shown);

        /* Gridlines and month ticks. */
        C.strokeStyle = 'rgba(120,180,240,0.13)';
        C.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
          var gy = PAD.t + (plotH / 4) * g;
          C.beginPath(); C.moveTo(PAD.l, gy); C.lineTo(W - PAD.r, gy); C.stroke();
        }
        C.fillStyle = 'rgba(234,243,255,0.34)';
        C.font = '500 15px "JetBrains Mono Variable", ui-monospace, monospace';
        C.textAlign = 'center';
        ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].forEach(function (m, index) {
          C.fillText(m, PAD.l + (plotW / 11) * index, H - 11);
        });

        /* Cumulative earnings, month by month. */
        var points = [];
        for (var month = 0; month <= 11; month++) {
          var v = (chart.shown / 12) * (month + 1);
          points.push({
            x: PAD.l + (plotW / 11) * month,
            y: PAD.t + plotH - (v / peak) * plotH * 0.92,
          });
        }

        /* Straight segments. Every month contributes the same amount, so the
           honest shape of this projection is a ramp — smoothing it into a
           curve would imply a seasonality the model does not have. */
        C.beginPath();
        C.moveTo(points[0].x, points[0].y);
        for (var k = 1; k < points.length; k++) C.lineTo(points[k].x, points[k].y);

        var stroke = C.createLinearGradient(PAD.l, 0, W - PAD.r, 0);
        stroke.addColorStop(0, '#8b5cf6');
        stroke.addColorStop(.5, '#22e5ff');
        stroke.addColorStop(1, '#c6ff4a');
        C.strokeStyle = stroke;
        C.lineWidth = 3;
        C.lineJoin = 'round';
        C.shadowColor = 'rgba(34,229,255,0.55)';
        C.shadowBlur = 18;
        C.stroke();
        C.shadowBlur = 0;

        /* Fill under the curve. */
        C.lineTo(points[points.length - 1].x, PAD.t + plotH);
        C.lineTo(points[0].x, PAD.t + plotH);
        C.closePath();
        var fill = C.createLinearGradient(0, PAD.t, 0, PAD.t + plotH);
        fill.addColorStop(0, 'rgba(34,229,255,0.30)');
        fill.addColorStop(1, 'rgba(34,229,255,0)');
        C.fillStyle = fill;
        C.fill();

        /* The final marker, with the year-end figure beside it. */
        var last = points[points.length - 1];
        C.fillStyle = '#c6ff4a';
        C.beginPath();
        C.arc(last.x, last.y, 5.5, 0, Math.PI * 2);
        C.fill();
        C.strokeStyle = 'rgba(198,255,74,0.42)';
        C.lineWidth = 1.5;
        C.beginPath();
        C.arc(last.x, last.y, 12 + (still ? 0 : (Math.sin(time * 2.4) * 0.5 + 0.5) * 6), 0, Math.PI * 2);
        C.stroke();

        C.textAlign = 'right';
        C.font = '700 20px "JetBrains Mono Variable", ui-monospace, monospace';
        C.fillStyle = 'rgba(234,243,255,0.94)';
        C.fillText(Programme.money(chart.shown), last.x - 14, Math.max(PAD.t + 18, last.y - 16));
      });
    }

    [value, rate, volume].forEach(function (input) {
      if (input) input.addEventListener('input', compute);
    });
    host.querySelectorAll('[data-agent-preset]').forEach(function (button) {
      button.addEventListener('click', function () {
        value.value = button.dataset.agentPreset;
        value.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    compute();
  }

  /* ══ 3 · LIVE AVAILABILITY ══════════════════════════════════════════════ */
  function calendar() {
    var host = document.querySelector('[data-agent-calendar]');
    if (!host) return;
    var grid = host.querySelector('[data-calendar-grid]');
    if (!grid) return;

    var STATES = ['is-open', 'is-open', 'is-open', 'is-held', 'is-booked'];
    var cells = [];
    for (var i = 0; i < 35; i++) {
      var cell = document.createElement('i');
      cell.className = STATES[(i * 7 + (i % 5)) % STATES.length];
      cell.dataset.night = String(i + 1);
      grid.appendChild(cell);
      cells.push(cell);
    }

    /* One night changes hands every second or so. Slow enough to notice,
       slow enough to ignore. */
    var elapsed = 0;
    Programme.loop(host, function (time, dt, still) {
      if (still) return;
      elapsed += dt;
      if (elapsed < 1.1) return;
      elapsed = 0;
      var cell = cells[Math.floor(Math.random() * cells.length)];
      var next = STATES[Math.floor(Math.random() * STATES.length)];
      if (cell.classList.contains(next)) return;
      cell.className = next + ' is-flip';
      global.setTimeout(function () { cell.classList.remove('is-flip'); }, 420);
    });
  }

  Programme.onReady(function () {
    network();
    desk();
    calendar();
  });
})(window);
