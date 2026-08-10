# Apatmento by Cabana. Full Site Audit
**Date:** 2026-07-19  
**Goal:** Launch-readiness for partner and agent recruitment

---

## SUMMARY VERDICT

The platform is **substantially built and production-ready** in its core flows. The architecture is genuinely impressive. A full super-app with M-Pesa payments, escrow, agent networks, push notifications, AI chat, KYC, referrals, analytics and more. What follows is an honest list of what needs attention before a serious partner/agent push.

---

## 🔴 CRITICAL. Fix before inviting partners

### 1. No public partner/agent landing page
There is no dedicated page that sells the value of becoming a Cabana partner or agent. `add-listing.html` is a functional form, not a sales page. Partners decide whether to list based on the first page they see. This needs to be a full page that answers: Why Cabana? What do I earn? How does it work? Who else is doing it?

**Fix:** Create `become-partner.html` and `become-agent.html`. Dedicated conversion pages with clear benefits, social proof hooks, and a single CTA.

### 2. No way to reach you. Zero contact info on the site
There is no phone number, WhatsApp link, email address, or support contact anywhere on the public-facing pages (checked index.html, terms.html, privacy.html, cabana.html). For partners and agents evaluating Apatmento as their primary income source, this is a dealbreaker. If they have a question before listing, they leave.

**Fix:** Add a WhatsApp link and email to the footer/navbar and especially to add-listing.html, become-partner.html, and become-agent.html.

### 3. partner-settings.html, no phone number field for partner contact
Partners need to be reachable by guests and agents. The profile page doesn't capture a business phone number or WhatsApp. When a guest books, they can't reach the host directly if the check-in code fails.

### 4. The "List Your Property" CTA on the homepage is too weak
The homepage focuses entirely on the traveller/guest experience. The "hosts keep 100%" message is there but buried. There is no prominent, dedicated partner CTA section, just one small line and a ghost button. Anyone who comes to the site looking to list leaves without seeing a compelling reason.

---

## 🟡 IMPORTANT. Fix soon for credibility

### 5. No social proof / testimonials
Every listing page, the homepage, and add-listing.html has zero partner testimonials, guest reviews, booking counts, or "X hosts already earning" numbers. Social proof is the #1 driver of partner sign-ups. Even placeholder-ready slots would help.

### 6. terms.html and privacy.html look generic
The legal pages don't mention: the M-Pesa escrow model, the agent commission structure, the KYC requirement for agents, data retention for bookings, or what happens to a host's earnings if a guest disputes. These are the exact questions a serious partner's lawyer will ask.

### 7. add-listing.html has no phone/WhatsApp field for partners
Partners submit a listing but there's no field for their WhatsApp number. Guests who book have no way to reach the host outside the app if something goes wrong at check-in.

### 8. partner-earnings.html. Need to verify payout mechanism is explained
Partners need to know: When do I get paid? How do I receive it? (M-Pesa presumably, but this needs to be explicit.) The current earnings page shows numbers but may not explain the withdrawal process clearly.

### 9. No email confirmation after listing is published
When a partner publishes their first listing, they get a success screen but (based on the code) no confirmation email. This is a trust issue. They need written confirmation that their listing is live, with a link to share it.

### 10. The agent-dashboard.html KYC upload flow needs testing
The agent KYC flow (upload national ID / passport) triggers an admin email review. The admin panel (`admin.html`) has a KYC review section. But there's no automated status email beyond what the template system sends. Need to verify RESEND_API_KEY is configured in Vercel env.

### 11. sw.js version is hardcoded as `apatmento-v20`
Every time you push new JS/CSS, partners and guests on old cached versions may see stale UI until the service worker updates. The VERSION string needs to be bumped with each deploy, or better. Tied to a build hash.

---

## 🟢 GOOD. These are working well

- **Session management** (now fixed): role persistence, partner routing, add-listing guard
- **Agent system**: schema, API, email templates, KYC lifecycle. Very thorough
- **M-Pesa payment**: STK push, callback, polling, escrow model. Solid
- **SEO**: now comprehensive after yesterday's overhaul
- **Partner dashboard**: listings, bookings, calendar, earnings, analytics, reviews, settings, all exist
- **Referral engine**: both user referrals and host referrals. Works
- **Push notifications**: implemented and cron-scheduled
- **AI chat (Apa)**: implemented
- **vercel.json**: security headers, caching, redirects, crons. Excellent
- **Service worker**: network-first strategy prevents stale deploys
- **llms.txt**: AI crawler guidance. Smart move

---

## 🏗️ BUILD IMMEDIATELY

In priority order for the partner/agent launch:

1. `become-partner.html`. Partner acquisition landing page
2. `become-agent.html`. Agent acquisition landing page  
3. Contact/support info in the footer and on key pages
4. Partner listing confirmation email (trigger from publishListing())
5. WhatsApp field on add-listing.html
6. Homepage partner section. Dedicated "Earn with Cabana" section

