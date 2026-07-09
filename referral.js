/* ═══════════════════════════════════════════════════════════════════
   APATMENTO REFERRAL & REWARDS ENGINE
   — 20% commission on user referrals (1 year)
   — 10% commission on host/provider referrals (1 year)  
   — 10 points per KES 1,000 spent · 1 point = KES 1
   — Min withdrawal: KES 50
   — Excludes: flights (third-party)
═══════════════════════════════════════════════════════════════════ */

(function(){
'use strict';

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
const SITE_URL = 'https://www.apatmento.space';

/* ── Supabase helper ── */
async function db(method, table, body, params='') {
  const url = `${SUPA_URL}/rest/v1/${table}${params}`;
  const opts = {
    method,
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) return null;
  try { return await r.json(); } catch(e) { return null; }
}

/* ── Capture referral code from URL on landing ── */
function captureRefCode() {
  const code = new URLSearchParams(location.search).get('ref');
  if (code) {
    sessionStorage.setItem('apt_ref', code);
    // Store in localStorage too for persistence across auth flow
    localStorage.setItem('apt_ref_pending', code);
  }
  return localStorage.getItem('apt_ref_pending') || sessionStorage.getItem('apt_ref');
}

/* ── Generate unique referral code ── */
function genCode(name, id) {
  const clean = (name || 'APT').replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,5) || 'APT';
  const suffix = id.replace(/-/g,'').slice(0,6).toUpperCase();
  return `${clean}-${suffix}`;
}

/* ── Get or create referral code for current user ── */
async function getMyCode(userId, firstName) {
  // Check cache
  const cached = localStorage.getItem('apt_my_ref_code');
  if (cached) return cached;

  // Check DB
  const existing = await db('GET', 'referral_codes', null, `?user_id=eq.${userId}&select=code`);
  if (existing?.length) {
    localStorage.setItem('apt_my_ref_code', existing[0].code);
    return existing[0].code;
  }

  // Create new
  const code = genCode(firstName, userId);
  await db('POST', 'referral_codes', { user_id: userId, code });
  localStorage.setItem('apt_my_ref_code', code);
  return code;
}

/* ── Record a new referral when referred user signs up ── */
async function recordReferral(referredUserId) {
  const code = captureRefCode();
  if (!code) return;

  // Find referrer
  const rows = await db('GET', 'referral_codes', null, `?code=eq.${code}&select=user_id`);
  if (!rows?.length) return;
  const referrerId = rows[0].user_id;
  if (referrerId === referredUserId) return; // can't refer yourself

  // Record
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  await db('POST', 'referrals', {
    referrer_id: referrerId,
    referred_id: referredUserId,
    referral_type: 'user',
    code_used: code,
    expires_at: expires.toISOString()
  });

  // Clear pending
  localStorage.removeItem('apt_ref_pending');
  sessionStorage.removeItem('apt_ref');
}

/* ── Award commission to referrer after booking ── */
async function awardReferralCommission(referredUserId, serviceType, grossAmount, platformFee, bookingRef) {
  if (serviceType === 'flights') return; // exclude third-party

  // Find active referral
  const now = new Date().toISOString();
  const ref = await db('GET', 'referrals', null,
    `?referred_id=eq.${referredUserId}&expires_at=gte.${now}&select=referrer_id,referral_type`);
  if (!ref?.length) return;

  const rate = ref[0].referral_type === 'host' ? 0.10 : 0.20;
  const commission = parseFloat((platformFee * rate).toFixed(2));

  await db('POST', 'referral_earnings', {
    referrer_id: ref[0].referrer_id,
    referred_id: referredUserId,
    service_type: serviceType,
    gross_amount: grossAmount,
    platform_fee: platformFee,
    commission_rate: rate,
    commission_kes: commission,
    status: 'confirmed',
    booking_ref: bookingRef
  });
}

/* ── Award points after booking ── */
async function awardPoints(userId, amountKes, serviceType, bookingRef) {
  if (serviceType === 'flights') return; // exclude third-party
  const points = Math.floor(amountKes / 1000) * 10;
  if (points <= 0) return;

  // Upsert user_points
  const current = await db('GET', 'user_points', null, `?user_id=eq.${userId}&select=available_points,lifetime_points`);
  const av = (current?.[0]?.available_points || 0) + points;
  const lt = (current?.[0]?.lifetime_points || 0) + points;

  if (current?.length) {
    await db('PATCH', `user_points?user_id=eq.${userId}`, { available_points: av, lifetime_points: lt, updated_at: new Date().toISOString() });
  } else {
    await db('POST', 'user_points', { user_id: userId, available_points: av, lifetime_points: lt });
  }

  await db('POST', 'point_transactions', {
    user_id: userId, type: 'earn', points,
    amount_kes: amountKes, service_type: serviceType,
    booking_ref: bookingRef,
    description: `Earned ${points} pts from KES ${amountKes.toLocaleString()} spend`
  });

  return points;
}

/* ── Redeem points at checkout ── */
async function redeemPoints(userId, pointsToRedeem, serviceType, bookingRef) {
  if (serviceType === 'flights') return { success: false, reason: 'Points cannot be used on flights' };

  const current = await db('GET', 'user_points', null, `?user_id=eq.${userId}&select=available_points`);
  const available = current?.[0]?.available_points || 0;
  if (available < pointsToRedeem) return { success: false, reason: 'Insufficient points' };

  const newBalance = available - pointsToRedeem;
  await db('PATCH', `user_points?user_id=eq.${userId}`, { available_points: newBalance, updated_at: new Date().toISOString() });
  await db('POST', 'point_transactions', {
    user_id: userId, type: 'redeem', points: -pointsToRedeem,
    amount_kes: pointsToRedeem, service_type: serviceType,
    booking_ref: bookingRef,
    description: `Redeemed ${pointsToRedeem} pts (KES ${pointsToRedeem})`
  });

  return { success: true, valueKes: pointsToRedeem, newBalance };
}

/* ── Request withdrawal ── */
async function requestWithdrawal(userId, amountKes, mpesaNumber) {
  if (amountKes < 50) return { success: false, reason: 'Minimum withdrawal is KES 50' };
  const result = await db('POST', 'referral_withdrawals', {
    user_id: userId, amount_kes: amountKes,
    mpesa_number: mpesaNumber, status: 'pending'
  });
  return result ? { success: true } : { success: false, reason: 'Request failed. Try again.' };
}

/* ── Get dashboard stats for current user ── */
async function getMyStats(userId) {
  const [earnings, points, referralCount] = await Promise.all([
    db('GET', 'referral_earnings', null, `?referrer_id=eq.${userId}&status=eq.confirmed&select=commission_kes`),
    db('GET', 'user_points', null, `?user_id=eq.${userId}&select=available_points,lifetime_points`),
    db('GET', 'referrals', null, `?referrer_id=eq.${userId}&select=id`)
  ]);

  const totalEarned = (earnings || []).reduce((s, e) => s + parseFloat(e.commission_kes || 0), 0);
  return {
    totalEarnedKes: totalEarned,
    availablePoints: points?.[0]?.available_points || 0,
    lifetimePoints: points?.[0]?.lifetime_points || 0,
    referralCount: referralCount?.length || 0,
    pointsValueKes: points?.[0]?.available_points || 0
  };
}

/* ════════════════════════════════════════════════════════════════
   POPUP — shown for guests & first-time signups
═══════════════════════════════════════════════════════════════════ */
function shouldShowPopup() {
  // Never on these pages
  const page = location.pathname.split('/').pop().replace('.html','') || 'index';
  if (['auth','booking-confirm','add-listing'].includes(page)) return false;
  // Never show if user is already signed in (they know about referrals)
  if (_userId) return false;
  // Only if not already shown this session
  return !sessionStorage.getItem('apt_ref_popup_shown');
}

function buildPopup(myCode, myStats, isGuest) {
  const refLink = `${SITE_URL}?ref=${myCode || 'YOUR_CODE'}`;

  const popup = document.createElement('div');
  popup.id = 'apt-ref-popup';
  popup.innerHTML = `
<style>
#apt-ref-popup{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;animation:refFadeIn .5s cubic-bezier(.22,1,.36,1);}
@keyframes refFadeIn{from{opacity:0;}to{opacity:1;}}
#apt-ref-bg{position:absolute;inset:0;background:rgba(8,6,20,.88);backdrop-filter:blur(12px);}
#apt-ref-card{position:relative;z-index:1;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;border-radius:28px;background:linear-gradient(145deg,#0D0B1E 0%,#130D2E 40%,#0A1628 100%);border:1px solid rgba(255,255,255,.08);box-shadow:0 32px 80px rgba(0,0,0,.6),0 0 0 1px rgba(123,47,247,.15),inset 0 1px 0 rgba(255,255,255,.06);animation:refCardUp .55s .1s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes refCardUp{from{opacity:0;transform:translateY(40px) scale(.96);}to{opacity:1;transform:none;}}

/* Stars */
#apt-ref-stars{position:absolute;inset:0;border-radius:28px;overflow:hidden;pointer-events:none;}
.ref-star{position:absolute;border-radius:50%;background:#fff;animation:refTwinkle var(--d,3s) var(--delay,0s) ease-in-out infinite;}
@keyframes refTwinkle{0%,100%{opacity:.1;transform:scale(1);}50%{opacity:.9;transform:scale(1.4);}}

/* Header */
.ref-header{padding:32px 32px 0;text-align:center;}
.ref-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 14px;border-radius:100px;background:linear-gradient(135deg,rgba(251,191,36,.15),rgba(245,158,11,.08));border:1px solid rgba(251,191,36,.25);color:#FCD34D;margin-bottom:18px;}
.ref-badge-dot{width:6px;height:6px;border-radius:50%;background:#FCD34D;animation:refPulse 2s ease-in-out infinite;}
@keyframes refPulse{0%,100%{box-shadow:0 0 0 0 rgba(252,211,77,.4);}50%{box-shadow:0 0 0 6px rgba(252,211,77,0);}}
.ref-headline{font-family:'Fraunces',serif;font-weight:300;font-size:clamp(26px,4vw,40px);line-height:1.1;letter-spacing:-.02em;color:#fff;margin-bottom:8px;}
.ref-headline strong{font-weight:700;background:linear-gradient(120deg,#FCD34D,#F59E0B,#FBBF24);-webkit-background-clip:text;background-clip:text;color:transparent;}
.ref-sub{font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;max-width:480px;margin:0 auto 28px;}

/* Divider */
.ref-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);margin:0 32px;}

/* Two cards */
.ref-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:24px 32px;}
.ref-card{border-radius:18px;padding:20px;position:relative;overflow:hidden;}
.ref-card-a{background:linear-gradient(145deg,rgba(123,47,247,.15),rgba(67,97,255,.1));border:1px solid rgba(123,47,247,.25);}
.ref-card-b{background:linear-gradient(145deg,rgba(252,211,77,.1),rgba(245,158,11,.08));border:1px solid rgba(252,211,77,.2);}
.ref-card-icon{font-size:28px;margin-bottom:10px;}
.ref-card-title{font-family:'Fraunces',serif;font-size:15px;font-weight:600;color:#fff;margin-bottom:6px;}
.ref-card-stat{font-size:26px;font-weight:800;background:linear-gradient(120deg,#A78BFA,#7C3AED);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1;margin-bottom:4px;}
.ref-card-b .ref-card-stat{background:linear-gradient(120deg,#FCD34D,#F59E0B);-webkit-background-clip:text;background-clip:text;color:transparent;}
.ref-card-desc{font-size:11px;color:rgba(255,255,255,.5);line-height:1.5;}
.ref-card-badge{position:absolute;top:12px;right:12px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:100px;}
.ref-card-a .ref-card-badge{background:rgba(123,47,247,.2);color:#A78BFA;border:1px solid rgba(123,47,247,.3);}
.ref-card-b .ref-card-badge{background:rgba(252,211,77,.15);color:#FCD34D;border:1px solid rgba(252,211,77,.25);}

/* Share section */
.ref-share{padding:0 32px 24px;}
.ref-share-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:10px;}
.ref-link-box{display:flex;align-items:center;gap:0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;margin-bottom:14px;}
.ref-link-text{flex:1;padding:12px 16px;font-size:12px;color:rgba(255,255,255,.6);font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ref-copy-btn{padding:12px 18px;background:linear-gradient(135deg,#7B2FF7,#4361FF);color:#fff;border:none;font-family:'General Sans',sans-serif;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;white-space:nowrap;}
.ref-copy-btn:hover{filter:brightness(1.1);}
.ref-copy-btn.copied{background:linear-gradient(135deg,#059669,#10B981);}

/* Action buttons */
.ref-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.ref-btn-share{padding:12px;border-radius:12px;border:none;font-family:'General Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:8px;}
.ref-btn-wa{background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;box-shadow:0 4px 14px rgba(37,211,102,.25);}
.ref-btn-wa:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(37,211,102,.35);}
.ref-btn-tw{background:linear-gradient(135deg,#1DA1F2,#0EA5E9);color:#fff;box-shadow:0 4px 14px rgba(29,161,242,.25);}
.ref-btn-tw:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(29,161,242,.35);}

/* Guest CTA */
.ref-guest-cta{padding:0 32px 28px;text-align:center;}
.ref-signup-btn{display:block;width:100%;padding:16px;border-radius:16px;background:linear-gradient(135deg,#7B2FF7,#4361FF);color:#fff;border:none;font-family:'General Sans',sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:all .3s;box-shadow:0 8px 24px rgba(123,47,247,.35);letter-spacing:.02em;}
.ref-signup-btn:hover{transform:translateY(-3px);box-shadow:0 14px 32px rgba(123,47,247,.45);}
.ref-signin-link{margin-top:10px;font-size:12px;color:rgba(255,255,255,.4);}
.ref-signin-link a{color:rgba(255,255,255,.7);text-decoration:none;border-bottom:1px solid rgba(255,255,255,.2);}

/* Close */
.ref-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:2;}
.ref-close:hover{background:rgba(255,255,255,.12);color:#fff;}

/* Stats bar (logged in) */
.ref-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:16px 32px 0;margin-bottom:4px;}
.ref-stat{text-align:center;padding:12px 8px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);}
.ref-stat-val{font-family:'Fraunces',serif;font-size:18px;font-weight:600;color:#fff;line-height:1;}
.ref-stat-lbl{font-size:10px;color:rgba(255,255,255,.4);margin-top:3px;text-transform:uppercase;letter-spacing:.06em;}

@media(max-width:520px){
  #apt-ref-card{border-radius:22px 22px 0 0;position:fixed;bottom:0;left:0;right:0;max-height:85vh;animation:refSlideUp .45s .1s cubic-bezier(.22,1,.36,1) both;}
  @keyframes refSlideUp{from{transform:translateY(100%);}to{transform:none;}}
  .ref-cards,.ref-actions{grid-template-columns:1fr;}
  .ref-header,.ref-share,.ref-guest-cta,.ref-stats{padding-left:20px;padding-right:20px;}
  .ref-cards,.ref-share .ref-actions{padding-left:20px;padding-right:20px;}
}
</style>

<div id="apt-ref-bg" onclick="window.AptReferral.closePopup()"></div>
<div id="apt-ref-card">
  <div id="apt-ref-stars"></div>
  <button class="ref-close" onclick="window.AptReferral.closePopup()">×</button>

  <div class="ref-header">
    <div class="ref-badge"><span class="ref-badge-dot"></span>Apatmento Referral Programme</div>
    <h2 class="ref-headline">Refer &amp; earn up to<br/><strong>20% for life.</strong></h2>
    <p class="ref-sub">Bring a guest or a host to Apatmento — earn up to 20% of our fee on every booking they make for a full 365 days. Simple. Unlimited.</p>
  </div>

  ${!isGuest && myStats ? `
  <div class="ref-stats">
    <div class="ref-stat"><div class="ref-stat-val">KES ${myStats.totalEarnedKes.toLocaleString()}</div><div class="ref-stat-lbl">Total Earned</div></div>
    <div class="ref-stat"><div class="ref-stat-val">${myStats.availablePoints}</div><div class="ref-stat-lbl">Your Points</div></div>
    <div class="ref-stat"><div class="ref-stat-val">${myStats.referralCount}</div><div class="ref-stat-lbl">Referrals</div></div>
  </div>` : ''}

  <div class="ref-divider"></div>

  <div class="ref-cards" style="grid-template-columns:1fr 1fr;">
    <div class="ref-card ref-card-a">
      <span class="ref-card-badge">Guest referral</span>
      <div class="ref-card-icon">🧳</div>
      <div class="ref-card-title">Refer a traveller</div>
      <div class="ref-card-stat">20%</div>
      <div class="ref-card-desc">commission on every booking they make for a full 365 days.</div>
    </div>
    <div class="ref-card ref-card-b">
      <span class="ref-card-badge">Host referral</span>
      <div class="ref-card-icon">🏠</div>
      <div class="ref-card-title">Refer a host</div>
      <div class="ref-card-stat">10%</div>
      <div class="ref-card-desc">commission on every completed service they list for 365 days.</div>
    </div>
  </div>

  <div class="ref-share">
    <div class="ref-share-label">Your referral link</div>
    <div class="ref-link-box">
      <span class="ref-link-text" id="apt-ref-link-text">${isGuest ? 'Sign up to get your personal link' : refLink}</span>
      ${!isGuest ? `<button class="ref-copy-btn" id="apt-copy-btn" onclick="window.AptReferral.copyLink()">Copy link</button>` : ''}
    </div>
    ${!isGuest ? `
    <div class="ref-actions">
      <button class="ref-btn-share ref-btn-wa" onclick="window.AptReferral.shareWA()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </button>
      <button class="ref-btn-share ref-btn-tw" onclick="window.AptReferral.shareTwitter()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Share
      </button>
    </div>` : ''}
  </div>

  ${isGuest ? `
  <div class="ref-guest-cta">
    <button class="ref-signup-btn" onclick="location.href='auth.html?mode=signup'">
      Create free account &amp; start earning →
    </button>
    <div class="ref-signin-link">Already have an account? <a href="auth.html">Sign in</a></div>
  </div>` : `
  <div style="padding:0 32px 28px;display:flex;gap:10px;">
    <button onclick="window.AptReferral.closePopup()" style="flex:1;padding:13px;border-radius:13px;border:1.5px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.6);font-family:'General Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;">Close</button>
    <button onclick="location.href='rewards.html'" style="flex:2;padding:13px;border-radius:13px;background:linear-gradient(135deg,#7B2FF7,#4361FF);color:#fff;border:none;font-family:'General Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 16px rgba(123,47,247,.3);">View my rewards dashboard →</button>
  </div>`}
</div>`;

  // Animate stars
  const starsEl = popup.querySelector('#apt-ref-stars');
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.className = 'ref-star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--delay:${Math.random()*4}s;`;
    starsEl.appendChild(s);
  }

  return popup;
}

/* ── Floating referral trigger button ── */
function buildFloatingTrigger() {
  const el = document.createElement('div');
  el.id = 'apt-ref-trigger';
  el.innerHTML = `
<style>
#apt-ref-trigger{position:fixed;right:0;top:72px;z-index:500;cursor:pointer;}
.ref-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:14px 10px;background:linear-gradient(180deg,#7B2FF7,#4361FF);border-radius:12px 0 0 12px;box-shadow:-4px 0 20px rgba(123,47,247,.4);transition:all .3s cubic-bezier(.22,1,.36,1);writing-mode:vertical-rl;position:relative;overflow:hidden;}
.ref-tab::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.1),transparent);pointer-events:none;}
.ref-tab:hover{padding-right:16px;box-shadow:-8px 0 28px rgba(123,47,247,.5);}
.ref-tab-coin{font-size:20px;animation:refCoinSpin 3s ease-in-out infinite;}
@keyframes refCoinSpin{0%,100%{transform:rotateY(0);}50%{transform:rotateY(180deg);}}
.ref-tab-text{font-family:'General Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;white-space:nowrap;}
.ref-tab-earn{font-family:'Fraunces',serif;font-size:11px;font-style:italic;color:rgba(255,255,255,.8);white-space:nowrap;}
.ref-tab-pulse{position:absolute;top:8px;right:8px;width:7px;height:7px;border-radius:50%;background:#FCD34D;box-shadow:0 0 0 0 rgba(252,211,77,.4);animation:refDotPulse 2s ease-in-out infinite;}
@keyframes refDotPulse{0%{box-shadow:0 0 0 0 rgba(252,211,77,.5);}70%{box-shadow:0 0 0 6px rgba(252,211,77,0);}100%{box-shadow:0 0 0 0 rgba(252,211,77,0);}}
@media(max-width:700px){
  #apt-ref-trigger{top:68px;right:0;}
  .ref-tab{border-radius:10px 0 0 10px;writing-mode:horizontal-tb;flex-direction:row;padding:9px 12px 9px 10px;}
  .ref-tab-coin{animation:none;font-size:16px;}
  .ref-tab-text{font-size:9px;}
  .ref-tab-earn{display:none;}
}
</style>
<div class="ref-tab" onclick="window.AptReferral.openPopup()">
  <div class="ref-tab-pulse"></div>
  <span class="ref-tab-coin">🪙</span>
  <span class="ref-tab-text">Earn</span>
  <span class="ref-tab-earn">& Refer</span>
</div>`;
  return el;
}

/* ── Public API ── */
let _popup = null;
let _myCode = null;
let _myStats = null;
let _userId = null;

async function init() {
  // Capture ref code from URL
  captureRefCode();

  // Get current user if any
  try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      const sb = supabase.createClient(SUPA_URL, SUPA_KEY);
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        _userId = session.user.id;
        localStorage.setItem('apt_uid', _userId);
        const meta = session.user.user_metadata || {};
        const firstName = meta.first_name || meta.given_name || meta.name?.split(' ')[0] || 'User';
        _myCode = await getMyCode(_userId, firstName);
        _myStats = await getMyStats(_userId);
      }
    }
  } catch(e) {}

  const isGuest = !_userId;
  const page = location.pathname.split('/').pop().replace('.html','') || 'index';

  // Don't show on auth page or booking funnel
  if (['auth','booking-confirm','add-listing'].includes(page)) return;

  // Floating trigger on dashboard for ALL users — guests and signed-in alike
  if (page === 'dashboard' && !document.getElementById('apt-ref-trigger')) {
    document.body.appendChild(buildFloatingTrigger());
  }

  // Show popup ONLY for guests who haven't seen it this session
  // Signed-in users already know about referrals — never interrupt them
  if (isGuest && shouldShowPopup()) {
    // Only auto-show on homepage or dashboard, with a delay
    if(page === 'index' || page === '') setTimeout(() => openPopup(), 10000);
    else if(page === 'dashboard') setTimeout(() => openPopup(), 12000);
  }
}

function openPopup() {
  if (_popup) return;
  const isGuest = !_userId;
  _popup = buildPopup(_myCode, _myStats, isGuest);
  document.body.appendChild(_popup);
  document.body.style.overflow = 'hidden';
  sessionStorage.setItem('apt_ref_popup_shown', '1');
  localStorage.removeItem('apt_show_ref_popup');
  localStorage.removeItem('apt_popup_after'); // clear countdown so it doesn't repeat
}

function closePopup() {
  if (!_popup) return;
  _popup.style.opacity = '0';
  _popup.style.transition = 'opacity .3s';
  setTimeout(() => {
    _popup?.remove();
    _popup = null;
    document.body.style.overflow = '';
  }, 300);
}

function copyLink() {
  const link = `${SITE_URL}?ref=${_myCode}`;
  navigator.clipboard?.writeText(link).catch(() => {
    const el = document.createElement('textarea');
    el.value = link; document.body.appendChild(el);
    el.select(); document.execCommand('copy'); el.remove();
  });
  const btn = document.getElementById('apt-copy-btn');
  if (btn) { btn.textContent = '✓ Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copy link'; btn.classList.remove('copied'); }, 2500); }
}

function shareWA() {
  const msg = encodeURIComponent(`🚀 I'm using Apatmento — Kenya's zero-commission travel app. Book stays, safaris, rides & more at face value. Use my link and we both earn: ${SITE_URL}?ref=${_myCode}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function shareTwitter() {
  const msg = encodeURIComponent(`Discovered the best travel app in Kenya 🇰🇪 — @Apatmento. Zero commission, hosts keep 100%. Sign up with my link: ${SITE_URL}?ref=${_myCode}`);
  window.open(`https://twitter.com/intent/tweet?text=${msg}`, '_blank');
}

window.AptReferral = {
  init, openPopup, closePopup, copyLink, shareWA, shareTwitter,
  getMyCode: () => _myCode,
  getMyStats: () => _myStats,
  awardPoints, awardReferralCommission, redeemPoints, requestWithdrawal,
  recordReferral, getMyStats
};

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();

