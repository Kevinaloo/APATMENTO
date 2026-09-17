# Cabana autonomous release QA

`npm run qa` produces **CABANA RELEASE HEALTH** as JSON, Markdown and a searchable
HTML report under `artifacts/release-health/<unique-run-id>/`. GitHub Actions puts
the Markdown in the run summary and retains the reports and public-page failure
screenshots for 14 days.

## What is implemented

- Deployment-status and manual GitHub Actions triggers, pinned browser dependency,
  exact deployed-commit verification and Vercel project/READY-state inspection.
- The complete existing Node regression suite, with assertion-level results.
- HTTP checks for the nine service routes and core account/host/admin/checkout
  routes, first-party JS/CSS availability and a real 404 check.
- Real Chromium page checks for stays, food, shopping, roommates, car hire, rides,
  events, tours and flights; mobile homepage-to-service navigation at 390px;
  login, signup and password-reset form validation.
- Read-only Supabase migration-history comparison in both directions, exposed-table
  RLS inspection, and owner/outsider/anonymous read-isolation probes with a positive
  owner control and authenticated identity verification.
- An isolated staging journey executor: UI actions, file uploads, drag ordering,
  persistence assertions, backend response assertions, correlated test-inbox
  delivery checks and cleanup, including cleanup after a failed assertion.
- A coverage matrix for the 19 requested capabilities across nine services.
  Authentication and admin login are shared; each service has 15 journey entries.
  The 139 entries are **coverage requirements**, not a claimed number of passing tests.
- Fail-closed aggregation: absent evidence, skipped tests, missing fixture
  configuration, wrong deployment SHA, duplicate results and partial execution
  cannot produce HEALTHY. The report is checkpointed after each stage.

## Current coverage boundary

The shipped automatic end-to-end journeys are the nine mobile navigations.
Authentication validation is a browser check, not proof that signup/login/reset
completed. Existing Node tests include mocked behavior and source-contract checks;
they are reported as regression assertions, never as live journeys.

The remaining successful account, search/filter, favorites, listing, upload/order,
claim/transfer, checkout/payment, booking/cancellation, email and authenticated
dashboard journeys still need **concrete staging fixtures and journey plans**.
The runner supports those operations; an empty configuration deliberately reports
them as UNVERIFIED. A template or placeholder is not a passing test.

Do not call this full autonomous production coverage until those adapters are
implemented against the isolated deployment and their assertions have passed.
The workflow must be merged to the default branch and the configuration below
supplied before automatic deployment runs are active.

## Run locally

```sh
npm ci
npx playwright install chromium
npm run qa:test
npm run qa
```

With no URL the runner starts Cabana on an ephemeral loopback port, then closes it.
It does not label that result Production. To use installed Edge on Windows, set
`QA_BROWSER_CHANNEL=msedge`. `QA_PLAYWRIGHT_MODULE` can point to an absolute
Playwright `index.mjs` in a bundled runtime when necessary.

To check a deployed origin, set `QA_BASE_URL=https://your-deployment.vercel.app`
and `QA_SHA` to its full Git commit hash before `npm run qa`. Use the immutable
deployment URL, not a mutable alias, for reproducible reports. The URL must be an
origin, without credentials, a path, query or fragment. No writes are allowed in
the public browser checks, even on staging.

Exit codes: **0** healthy, **1** failed checks/regressions, **2** unverified coverage,
**3** warnings/degraded. No default tolerated critical failures or ignored skips.
A failure count is a count of failed checks, not a deduplicated incident count.

## GitHub and Vercel setup

Create a protected GitHub environment named `cabana-qa`. Keep secrets here, not in
the repository or frontend. Restrict its deployment branches to trusted branches.

| Setting | Location | Purpose |
|---|---|---|
| `QA_VERCEL_PROJECT_ID` | Environment variable | Project identity fence |
| `QA_VERCEL_TEAM_ID` | Environment variable, optional | Vercel team scope |
| `QA_VERCEL_TOKEN` | Environment secret | Read deployment metadata |
| `QA_VERCEL_BYPASS_SECRET` | Environment secret, if protected | Automation bypass sent only to the target origin |
| `QA_SUPABASE_PROJECT_REF` | Environment variable | Database being checked |
| `QA_SUPABASE_ACCESS_TOKEN` | Environment secret | Read-only management query endpoint |
| `QA_SUPABASE_ANON_KEY` | Environment secret | Data API RLS probes |
| `QA_CONFIG_JSON` | Environment secret | Private fixture configuration described below |
| `QA_GUEST_EMAIL`, `QA_GUEST_PASSWORD` | Environment secrets | Synthetic guest credentials for the login plan |
| `QA_OWNER_EMAIL`, `QA_OWNER_PASSWORD`, `QA_OUTSIDER_EMAIL`, `QA_OUTSIDER_PASSWORD` | Environment secrets | Synthetic RLS accounts; the runner signs in and revokes its sessions every run |
| `QA_OWNER_JWT`, `QA_OUTSIDER_JWT` | Environment secrets, optional | Alternative short-lived tokens supplied by an external fixture manager |
| `QA_INBOX_TOKEN` | Environment secret | Test mail-sink read access |
| `QA_ALLOW_MUTATIONS` | Environment variable | Explicit `true` only after staging isolation is verified |

Use separate environments/workflow configuration for different Supabase projects;
do not reuse staging database credentials to claim production database health.
The runner compares observed browser Supabase requests to the configured project
before it can certify that project's migration history or RLS. It does not infer
the server-side database configuration from the frontend.
Only commits already in the default branch's history may execute with credentials.
Untrusted feature previews and failed deployment/setup events produce a failed
setup report instead of running their code with secrets. All deployment events
are audited; credentialed feature-branch QA requires a separately isolated workflow.

Vercel's GitHub integration must publish `deployment_status` events. Manual runs
accept URL, SHA and production/staging mode. No auto-promote, rollback, email,
Slack message, or GitHub comment is sent by this workflow. GitHub's normal Actions
notifications and summary/artifact UI carry the report.

This is post-deployment detection; it does not prevent a bad version from initially
going live. A promotion gate can require the staging QA result in a deployment
pipeline, but none is silently added to the existing production release process.

## Configure isolated staging journeys

For a production audit with companion staging journeys, set `QA_STAGING_BASE_URL`,
`QA_STAGING_SUPABASE_PROJECT_REF` and, if different, `QA_STAGING_VERCEL_PROJECT_ID`
as environment variables. That deployment must be READY and have the **same SHA**
as production before any staging journey runs. Public browser/route/database checks
still target production; mutating journeys target the isolated companion. The report
records the staging origin alongside each journey. Do not also configure the nine
mobile-navigation IDs as staging plans; the production browser run owns those IDs.

Service workers are disabled and their API is unavailable in QA browser contexts
so network interception sees every request. PWA installation, offline caching and
service-worker upgrade behavior need a separate PWA suite.

Copy `qa/config.example.json` to `qa/config.local.json` (gitignored), set
`QA_CONFIG_PATH=qa/config.local.json`, and set `QA_MODE=staging` and
`QA_ALLOW_MUTATIONS=true`.

The configuration must list the exact staging origin, its separate Supabase origin,
and confirm `sandboxPayments` and `syntheticAccountsOnly`. Production Cabana domains
are rejected for mutating journeys. The browser blocks writes to any other origin,
including a hard-coded production Supabase URL. Ensure the staging server also
uses sandbox providers: browser interception cannot isolate a server's upstream
payment or email integration.

Seed synthetic guest, owner, outsider and admin accounts; disposable inventory for
each service; a sandbox payment adapter; and a mail sink. Namespace created data
with `${runId}`. Do not use customer listings, phone numbers, bookings or addresses.
The current application has hard-coded Supabase URLs in several browser modules;
an isolated staging build must override these before mutating journeys can pass.

Add journey plans to `journeys`, keyed by IDs in `scripts/qa/catalog.mjs`, such as
`stays.favorites`, `tours.booking` or `shared.login`. `qa/journey.example.json` shows
the real login selectors; adapt its final logged-in selector to the seeded role.
Each plan requires an interaction, an observable assertion and cleanup steps.
Use durable backend assertions or reload/read-back assertions, not just toast text.

Supported steps:

| Action | Fields |
|---|---|
| `goto` | `path` on the staging origin |
| `fill`, `select` | `selector`, `value` |
| `click`, `check` | `selector`; `checked` for check |
| `upload` | `selector`, `files` array of local fixture paths |
| `drag` | `selector`, `target` selector |
| `reload` | none |
| `expect-visible`, `expect-hidden` | `selector` |
| `expect-text`, `expect-count` | `selector`, `value` or `count` |
| `expect-url` | exact `path` |
| `expect-storage` | `key`, exact serialized `value` |
| `click-response` | `selector`, exact API `path`, `method`, `status`; optional exact top-level `json` fields |
| `expect-inbox` | `url`, `to`, `subject`; URL origin must be in `inboxOrigins` |

Values accept `${ENV_NAME}`, `${runId}` and explicit plan variables. Inbox polling
adds `runId` and expects `{ "messages": [{ "runId": "...", "to": "...", "subject": "..." }] }`.
It requires a matching run and recipient; a provider's send acknowledgment alone
does not count as delivered mail. Staging traces and screenshots are deliberately
not captured because they could include session credentials. Cleanup failure is a
release failure even if the journey's assertions passed.

Represent a genuinely unsupported capability as `notApplicable: { "flights.listing-creation":
"Flight inventory is supplied by airlines; travellers cannot create listings." }`
after product review. Every exclusion needs a reason and is visible in the report.
Do not mark an unimplemented test as not applicable.

## Configure behavioral RLS probes

Example private, pre-seeded row configuration:

```json
{
  "rls": [{
    "name": "guest-private-booking",
    "table": "bookings",
    "column": "id",
    "rowId": "UUID-OF-A-SYNTHETIC-BOOKING",
    "ownerTokenEnv": "QA_OWNER_JWT",
    "outsiderTokenEnv": "QA_OUTSIDER_JWT"
  }]
}
```

The owner must successfully read exactly one row. A different authenticated user
and anonymous client must see no rows or be denied. Expired JWTs fail rather than
being mistaken for an RLS denial. Add probes for every sensitive table/role pair.
This read-only test does not prove INSERT/UPDATE/DELETE policies; those require
staging journeys that attempt unauthorized mutations and verify no state changed.

Migration synchronization compares only `supabase/migrations` against the deployed
`supabase_migrations.schema_migrations` version history. The repository's legacy
`supabase-migrations` and root `schema-*.sql` are not a canonical replayable baseline.
Out-of-band schema changes and changed contents of an already-applied migration
require a separate schema diff. The runner never applies or repairs migrations.

References: [GitHub deployment-status events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#deployment_status),
[Supabase migration history](https://supabase.com/docs/guides/deployment/database-migrations),
[Supabase read-only management queries](https://supabase.com/docs/reference/api/v1-read-only-query),
[Playwright browser automation](https://playwright.dev/docs/api/class-browser).
