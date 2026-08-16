# Handover — what's done, what's left

Branch: `feat/continent-coverage-and-listing-drafts`

---

## DONE (already live, nothing for you to do)

**Supabase — project `gfwgbgdvxtocwhilrtdw`, both migrations applied and verified**

- `listing_drafts` — resumable listings, RLS full CRUD scoped to owner, 30-day expiry
- `verification_sessions` + `verification_status` — RLS **SELECT-only**, so no browser can write its own approval
- `required_tier()` / `can_publish()` / tier-sync trigger

Verified against the live database:

| state | tier | stays | carhire | rides |
|---|---|---|---|---|
| identity pending | 0 | no | no | no |
| identity approved | 1 | **yes** | no | no |
| AML review (a hit) | 1 | yes | no | no |
| AML approved | 2 | yes | **yes** | no |
| identity revoked | 0 | no | no | no |

The two that matter: an AML hit does **not** silently clear to tier 2, and revoking identity drops everything to 0. Test rows deleted.

**Didit — all three workflows published in `My Application` (production)**

| Workflow | UUID | Features |
|---|---|---|
| Free KYC | `152d6d85-a1d1-46bd-abc2-7eca9341c0ab` | OCR + LIVENESS + FACE_MATCH + IP |
| KYC + AML | `e3e9a33f-33c6-41ef-9a00-8b0e67452a2f` | + AML |
| Biometric Auth | `5b00b16e-7669-4df1-94cc-765ea38b3e8f` | LIVENESS + FACE_MATCH + IP |

Confirmed on the published configs: `is_aml_enabled: true` on KYC+AML, liveness and face match on across all three.

---

## LEFT FOR YOU (about 10 minutes)

### 1. Vercel environment variables — REQUIRED

The Vercel connector has no env-var API, so this is the one thing I could not do. Nothing works until these are set. Project Settings → Environment Variables:

```
DIDIT_API_KEY                = <from Didit console → API keys>
DIDIT_WEBHOOK_SECRET         = <from Didit console → Webhooks>
DIDIT_WORKFLOW_IDENTITY      = 152d6d85-a1d1-46bd-abc2-7eca9341c0ab
DIDIT_WORKFLOW_IDENTITY_AML  = e3e9a33f-33c6-41ef-9a00-8b0e67452a2f
DIDIT_WORKFLOW_BIOMETRIC     = 5b00b16e-7669-4df1-94cc-765ea38b3e8f
PUBLIC_BASE_URL              = https://cabana.africa
```

For Preview, use the sandbox app's workflow IDs instead:
`5cdd5512-7cf5-4e01-b66b-cec3df560d9f` (Free KYC), `2a97e28d-3d6f-4d26-a005-54768da00ccd` (KYC+AML), `42e0e4e5-3d38-4d2f-a783-6e9446fdfcff` (Biometric).

If a variable is missing the endpoint returns a 500 naming it, per your `_env.js` convention — no silent fallback.

### 2. Didit webhook — REQUIRED

Didit console → Webhooks → add:

```
https://cabana.africa/api/didit-webhook
```

Copy the signing secret into `DIDIT_WEBHOOK_SECRET`. Without it every delivery is rejected — that's deliberate, since an unsigned webhook is just an assertion anyone could POST.

### 3. Merge the PR

https://github.com/Kevinaloo/APATMENTO/pull/new/feat/continent-coverage-and-listing-drafts

Click through `add-listing.html` once first — it's the single funnel for all eight services.

### 4. Smoke test after deploy

1. Start a listing, pick **Ghana** → currency should flip to GHS
2. Type "acc" in the city field → Accra should appear
3. Close the tab mid-listing, reopen `add-listing.html` → resume card appears
4. Finish a **stays** listing and hit Publish → verification prompt appears
5. Complete a Didit check → returns and publishes
6. `select * from verification_status;` → one row, `cleared_tier = 1`

---

## DECISIONS I DID NOT MAKE FOR YOU

**Desktop is currently blocked.** All three workflows have `is_desktop_allowed: false`. A host on a laptop gets a QR-code handoff to their phone rather than verifying in place. That's Didit's default and it is defensible — phone cameras do liveness far better — but it adds a step for desktop hosts. I left it alone because loosening it is a security-vs-conversion call that's yours. Toggle in the Didit console per workflow if you want it.

**Your 500 free verifications.** At tier 1 you pay per *person*, not per listing, and the status row means a returning host is never re-charged. 500 covers roughly 500 partners. Once that runs out, Free KYC is $0–0.33 and KYC+AML $0.42–0.65. If cost becomes a concern, move the tier-1 gate from *first publish* to *first payout* — most listings never take a booking, so you'd verify a much smaller set.

**Nobody owns the AML review queue yet.** Hits park in `review` rather than auto-approving. Legitimate partners with common names will land there and sit blocked until someone looks. Decide who watches it before launch:

```sql
select * from verification_sessions where state = 'review' order by created_at desc;
```

---

## STILL OPEN FROM EARLIER

**`listings` has duplicated, drifted columns**: `beds`/`bedrooms`, `bathrooms`/`bathroomstext`, `lat`/`latitude`, `lng`/`longitude`, `price_night`/`price_per_night`, `type`/`listing_type`/`service`, `partner_id`/`host_id`.

If one code path writes `beds` and another reads `bedrooms`, data is silently lost. This is the largest remaining risk to your "100% functionality" goal. It needs auditing every read path before changing anything, which is its own reviewed piece of work — not something to slip into this branch.

**Rotate the GitHub token.** It has been in plaintext in chat three times.
