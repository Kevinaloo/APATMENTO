# Cabana organic search plan

Research date: 2026-08-19
Market: Kenya, Google organic, desktop and mobile

## What the data says

Cabana had no measurable organic keyword footprint or backlink history in Serpstat at the time of research, and a Google `site:cabana.africa` check returned no indexed results. The first priority is therefore trustworthy indexation, not publishing more templated URLs.

The strongest relevant Kenya queries found were:

| Search intent | Monthly volume | Cabana page |
|---|---:|---|
| car hire nairobi | 8,100 | `/carhire` |
| car rental nairobi | 8,100 | `/carhire` |
| airbnb nairobi | 8,100 | `/apartments` and `/nairobi-apartments` |
| things to do in nairobi | 2,400 | `/nairobi-travel-guide` |
| kenya safari | 1,900 | `/kenya-safari-guide` and `/tours` |
| events in nairobi | 1,600 | `/events` |
| masai mara safari | 1,600 | `/kenya-safari-guide` |
| safari packages kenya | 1,300 | `/kenya-safari-guide` |
| accommodation nairobi | 1,000 | `/nairobi-apartments` |
| apartments in nairobi | 720 | `/nairobi-apartments` |
| airbnb kenya | 590 | `/apartments` |
| amboseli safari | 480 | `/kenya-safari-guide` |
| serviced apartments nairobi | 260 | `/nairobi-apartments` |

Volumes are Serpstat estimates, not guaranteed traffic. The page mapping avoids creating a separate thin page for every wording variation.

## Changes implemented

- Gate commercial city/service pages on real Supabase inventory and exclude empty pages from sitemaps.
- Keep useful editorial travel guides indexable even when Cabana has no local supply.
- Emit offers and `AggregateOffer` schema only for the matching service when real inventory exists.
- Remove duplicate titles, descriptions and stale structured-data blocks during every build.
- Align the five priority pages with the search language above while keeping the copy useful and factual.
- Protect the API endpoints used by payments, email, push and calendar sync so SEO growth does not amplify an open abuse surface.

## Measurement

Serpstat rank-tracking project `Cabana Kenya SEO` (project ID `1322083`) monitors the priority cluster weekly on Mondays for Kenya, Google organic, desktop and mobile. Initial competitors include Airbnb, Booking.com, TicketSasa, KenyaBuzz, SafariBookings and Europcar.

Review impressions and indexed-page counts in Google Search Console alongside Serpstat positions. Do not re-index empty commercial pages until their matching inventory is live.
