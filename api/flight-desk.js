/* ══════════════════════════════════════════════════════════════════════
   CABANA · FLIGHT DESK — notifications
   api/flight-desk.js

   Four events worth interrupting someone for:

     notify-new        a request arrived     → desk (email + push)
                                             → traveller (ack)
     notify-quoted     options are ready     → traveller (email + push)
     notify-selected   the traveller chose   → desk (email)
     notify-ticketed   ticket issued         → traveller (email + push)

   Security model
   ──────────────
   The caller supplies only a ref ("CBF-XXXXXX"). Every detail is
   re-read from Supabase using the service key. Traveller emails are
   assembled from an allow-list of columns; net_cost, margin,
   supplier_ref and sourced_via are not read into scope in the
   traveller paths at all, so a careless template edit cannot print one.

   Failures are logged and swallowed. A notification that does not send
   is an annoyance; one that throws and breaks a booking is worse.
══════════════════════════════════════════════════════════════════════ */

import { sendTemplate, esc } from './lib/_mail.js';
import { notify }            from './lib/_notify.js';
import { setCors }           from './lib/_security.js';

const SUPA_URL    = process.env.SUPABASE_URL
                 || 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE        = process.env.PUBLIC_BASE_URL || 'https://cabana.africa';

/* ── internal helpers ───────────────────────────────────────────── */

function sbH() {
  return {
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbGet(path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: sbH() });
  if (!r.ok) throw new Error(`supabase ${r.status} on ${path}`);
  return r.json();
}

function validRef(ref) {
  return (
    typeof ref === 'string' &&
    /^CB[FK]-[23456789BCDFGHJKLMNPQRSTVWXYZ]{6}$/.test(ref.trim().toUpperCase())
  );
}

function money(v, ccy) {
  return `${ccy || 'KES'} ${Number(v || 0).toLocaleString('en-KE', {
    maximumFractionDigits: 0,
  })}`;
}

function prettyDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function prettyTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function trackUrl(req) {
  return `${SITE}/flights?ref=${encodeURIComponent(req.ref)}&t=${encodeURIComponent(req.access_token || '')}`;
}

function paxLabel(r) {
  const parts = [`${r.adults} adult${r.adults !== 1 ? 's' : ''}`];
  if (r.children) parts.push(`${r.children} child${r.children !== 1 ? 'ren' : ''}`);
  if (r.infants)  parts.push(`${r.infants} infant${r.infants !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

function cabinLabel(c) {
  return (
    { economy: 'Economy', premium_economy: 'Premium economy',
      business: 'Business', first: 'First class', any: 'Any cabin' }[c] || 'Economy'
  );
}

function flexLabel(f) {
  if (!f || f === 'exact') return 'Exact dates';
  if (f === 'month') return 'Anywhere that month';
  return `±${f} days`;
}

/* Send to an array of addresses, one call each (sendTemplate is
   single-recipient). Failures are swallowed individually so one bad
   address does not block the others. */
async function sendAll(addresses, template, data, dedupeKey) {
  return Promise.all(
    addresses.map((addr) =>
      sendTemplate({
        template,
        to: addr,
        data,
        dedupeKey: dedupeKey ? `${dedupeKey}::${addr}` : null,
        force: true,  // desk addresses opt in structurally; skip consent gate
      }).catch((e) => console.warn(`[flight-desk] mail to ${addr} failed:`, e.message))
    )
  );
}

/* ── desk roster ────────────────────────────────────────────────── */

async function deskEmails() {
  try {
    const rows = await sbGet(
      'flight_desk_settings?id=eq.1&select=notify_emails&limit=1'
    );
    const list = rows?.[0]?.notify_emails;
    if (Array.isArray(list) && list.length) return list;
  } catch (e) {
    console.warn('[flight-desk] could not read desk roster:', e.message);
  }
  return ['apatmento@gmail.com'];
}

/* ══════════════════════════════════════════════════════════════════════
   1 · NOTIFY-NEW   a request arrived → desk + traveller ack
══════════════════════════════════════════════════════════════════════ */
async function notifyNew(ref) {
  const rows = await sbGet(
    `flight_requests?ref=eq.${encodeURIComponent(ref)}&select=*&limit=1`
  );
  const r = rows?.[0];
  if (!r) return { ok: false, error: 'not_found' };

  const route   = `${r.origin_iata} → ${r.dest_iata || '?'}`;
  const dates   = r.return_date
    ? `${prettyDate(r.depart_date)} – ${prettyDate(r.return_date)}`
    : `${prettyDate(r.depart_date)}, one way`;
  const dueBy   = r.sla_due_at
    ? `${prettyDate(r.sla_due_at)} ${prettyTime(r.sla_due_at)}`
    : null;

  const deskTo = await deskEmails();

  // Desk alert
  await sendAll(deskTo, 'flightDeskAlert', {
    ref:          r.ref,
    route,
    dates,
    pax:          paxLabel(r),
    cabin:        cabinLabel(r.cabin),
    flex:         flexLabel(r.date_flex),
    contactName:  r.contact_name,
    contactPhone: r.contact_phone || null,
    contactEmail: r.contact_email || null,
    channel:      r.contact_channel,
    notes:        r.notes || null,
    ceiling:      r.budget_max ? money(r.budget_max, r.budget_currency) : null,
    dueBy,
    consoleUrl:   `${SITE}/admin#flights`,
  }, `fd-desk-new-${r.ref}`);

  // Traveller acknowledgement
  if (r.contact_email) {
    await sendTemplate({
      template: 'flightRequested',
      to: r.contact_email,
      data: {
        name:     r.contact_name,
        email:    r.contact_email,
        ref:      r.ref,
        route,
        dates,
        pax:      paxLabel(r),
        cabin:    cabinLabel(r.cabin),
        trackUrl: trackUrl(r),
        dueBy,
      },
      dedupeKey: `fd-ack-${r.ref}`,
    }).catch((e) => console.warn('[flight-desk] ack mail failed:', e.message));
  }

  // In-app push
  if (r.user_id) {
    await notify({
      user_id: r.user_id,
      kind:    'flight',
      title:   'Flight request received',
      body:    `${route} — someone is pricing it now.`,
      url:     `/flights?ref=${r.ref}`,
    }).catch(() => {});
  }

  return { ok: true };
}

/* ══════════════════════════════════════════════════════════════════════
   2 · NOTIFY-QUOTED   options published → traveller

   Only the columns a traveller may see are selected. net_cost, margin,
   supplier_ref and sourced_via are absent from the query entirely.
══════════════════════════════════════════════════════════════════════ */
async function notifyQuoted(ref) {
  const rows = await sbGet(
    `flight_requests?ref=eq.${encodeURIComponent(ref)}&select=*&limit=1`
  );
  const r = rows?.[0];
  if (!r) return { ok: false, error: 'not_found' };

  // Traveller-safe columns only — mirrors the fd_get_request allow-list
  const quotes = await sbGet(
    `flight_quotes?request_id=eq.${r.id}` +
    `&status=in.(offered,selected)` +
    `&select=airline_name,price,currency,stops_out,duration_out,baggage_checked,badge` +
    `&order=sort_order.asc&limit=6`
  );
  if (!quotes.length) return { ok: false, error: 'no_quotes' };

  const cheapest = quotes.reduce((a, b) =>
    Number(b.price) < Number(a.price) ? b : a
  );
  const route = `${r.origin_iata} → ${r.dest_iata || '?'}`;
  const pax   = r.adults + r.children + r.infants;

  // Build a plain-HTML table for the options — stays inside the shell
  const optionsHtml =
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px">' +
    quotes.map((q) =>
      `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2e50;vertical-align:top">
          <strong style="color:#F4F6FF">${esc(q.airline_name)}</strong><br>
          <span style="color:#A8B0CE;font-size:13px">
            ${q.stops_out === 0
              ? 'Non-stop'
              : `${q.stops_out} stop${q.stops_out > 1 ? 's' : ''}`}
            ${q.baggage_checked ? ` · ${esc(q.baggage_checked)} checked` : ''}
          </span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2e50;text-align:right;
                   white-space:nowrap;vertical-align:top">
          <strong style="color:#F5B12E">${esc(money(q.price, q.currency))}</strong><br>
          <span style="color:#6B7396;font-size:12px">${Math.round(Number(q.price) / pax).toLocaleString('en-KE')} / traveller</span>
        </td>
      </tr>`
    ).join('') +
    '</table>';

  if (r.contact_email) {
    await sendTemplate({
      template: 'flightQuoted',
      to: r.contact_email,
      data: {
        name:        r.contact_name,
        email:       r.contact_email,
        ref:         r.ref,
        route,
        optionsHtml,
        fromPrice:   money(cheapest.price, cheapest.currency),
        trackUrl:    trackUrl(r),
        count:       quotes.length,
      },
      dedupeKey: `fd-quoted-${r.ref}-${quotes.length}-${cheapest.price}`,
    }).catch((e) => console.warn('[flight-desk] quoted mail failed:', e.message));
  }

  if (r.user_id) {
    await notify({
      user_id: r.user_id,
      kind:    'flight',
      title:   'Your flight options are ready',
      body:    `${route} from ${money(cheapest.price, cheapest.currency)}. Tap to choose.`,
      url:     `/flights?ref=${r.ref}`,
    }).catch(() => {});
  }

  return { ok: true, quotes: quotes.length };
}

/* ══════════════════════════════════════════════════════════════════════
   3 · NOTIFY-SELECTED   traveller chose → desk

   This is an internal notification. Margin IS shown here because the
   recipient is the desk, not the traveller.
══════════════════════════════════════════════════════════════════════ */
async function notifySelected(ref) {
  const rows = await sbGet(
    `flight_requests?ref=eq.${encodeURIComponent(ref)}&select=*&limit=1`
  );
  const r = rows?.[0];
  if (!r) return { ok: false, error: 'not_found' };

  const qrows = await sbGet(
    `flight_quotes?request_id=eq.${r.id}&status=eq.selected` +
    `&select=airline_name,price,currency,net_cost,margin&limit=1`
  );
  const q = qrows?.[0];

  const route   = `${r.origin_iata} → ${r.dest_iata || '?'}`;
  const deskTo  = await deskEmails();

  // net line is internal; safe because this goes only to the desk roster
  const netLine = (q?.net_cost != null && q?.margin != null)
    ? `Net ${money(q.net_cost, q.currency)} · margin ${money(q.margin, q.currency)}`
    : null;

  await sendAll(deskTo, 'flightChosen', {
    ref:         r.ref,
    route,
    contactName: r.contact_name,
    airline:     q?.airline_name || '—',
    price:       q ? money(q.price, q.currency) : '—',
    netLine,
    consoleUrl:  `${SITE}/admin#flights`,
  }, `fd-chosen-${r.ref}`);

  return { ok: true };
}

/* ══════════════════════════════════════════════════════════════════════
   4 · NOTIFY-TICKETED   ticket issued → traveller
══════════════════════════════════════════════════════════════════════ */
async function notifyTicketed(ref) {
  const rows = await sbGet(
    `flight_requests?ref=eq.${encodeURIComponent(ref)}&select=*&limit=1`
  );
  const r = rows?.[0];
  if (!r) return { ok: false, error: 'not_found' };

  const brows = await sbGet(
    `flight_bookings?request_id=eq.${r.id}` +
    `&select=ref,pnr,eticket_numbers,ticket_url,airline_name,amount,currency` +
    `&order=created_at.desc&limit=1`
  );
  const b = brows?.[0];
  if (!b) return { ok: false, error: 'no_booking' };

  const route = `${r.origin_iata} → ${r.dest_iata || '?'}`;

  if (r.contact_email) {
    await sendTemplate({
      template: 'flightTicketed',
      to: r.contact_email,
      data: {
        name:        r.contact_name,
        email:       r.contact_email,
        ref:         r.ref,
        pnr:         b.pnr || '',
        airline:     b.airline_name || '',
        route,
        departDate:  prettyDate(r.depart_date),
        etickets:    Array.isArray(b.eticket_numbers) && b.eticket_numbers.length
                       ? b.eticket_numbers.join(', ')
                       : null,
        ticketUrl:   b.ticket_url || null,
        trackUrl:    trackUrl(r),
      },
      dedupeKey: `fd-ticketed-${b.ref}`,
    }).catch((e) => console.warn('[flight-desk] ticket mail failed:', e.message));
  }

  if (r.user_id) {
    await notify({
      user_id: r.user_id,
      kind:    'flight',
      title:   'Your ticket is issued',
      body:    `${route}. Booking reference ${b.pnr || '—'}.`,
      url:     `/flights?ref=${r.ref}`,
    }).catch(() => {});
  }

  return { ok: true };
}

/* ══════════════════════════════════════════════════════════════════════
   HANDLER
══════════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (!SERVICE_KEY) {
    console.warn('[flight-desk] SUPABASE_SERVICE_ROLE_KEY not set');
    return res.status(200).json({ ok: false, error: 'not_configured' });
  }

  const action = String(req.query?.action || '');
  const body   = typeof req.body === 'string'
    ? JSON.parse(req.body || '{}')
    : (req.body || {});
  const ref    = String(body.ref || '').trim().toUpperCase();

  if (!validRef(ref))
    return res.status(400).json({ ok: false, error: 'bad_ref' });

  try {
    let out;
    switch (action) {
      case 'notify-new':      out = await notifyNew(ref);      break;
      case 'notify-quoted':   out = await notifyQuoted(ref);   break;
      case 'notify-selected': out = await notifySelected(ref); break;
      case 'notify-ticketed': out = await notifyTicketed(ref); break;
      default:
        return res.status(400).json({ ok: false, error: 'unknown_action' });
    }
    return res.status(200).json(out);
  } catch (err) {
    console.error('[flight-desk]', action, err);
    return res.status(200).json({ ok: false, error: 'send_failed' });
  }
}
