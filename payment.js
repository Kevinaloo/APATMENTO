/* ══════════════════════════════════════════════════════════════
   APATMENTO. Shared PayHero STK Push Payment Popup
   Include this script in any page that needs to collect payment
   (tours.html, events.html, apartment booking, etc.)

   USAGE:
   ApatmentoPay.start({
     amount: 24500,
     phone: '0712345678',
     reference: 'TOUR-1-abc123',     // must be unique per transaction
     table: 'tour_bookings',          // which Supabase table to poll
     description: 'Maasai Mara Safari, 2 people',
     onSuccess: () => { ... },
     onFailure: () => { ... },
   });
══════════════════════════════════════════════════════════════ */

(function () {

  const style = document.createElement('style');
  style.textContent = `
.apt-pay-overlay {
  position: fixed; inset: 0; z-index: 950;
  background: rgba(15,17,23,.75);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity .3s ease;
  padding: 20px;
}
.apt-pay-overlay.open { opacity: 1; pointer-events: all; }
.apt-pay-card {
  width: 100%; max-width: 380px;
  background: #fff; border-radius: 22px;
  padding: 32px 28px; text-align: center;
  transform: scale(.92); transition: transform .35s cubic-bezier(.22,1,.36,1);
  box-shadow: 0 30px 80px rgba(0,0,0,.3);
}
.apt-pay-overlay.open .apt-pay-card { transform: scale(1); }
.apt-pay-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg,#0D9467,#059652);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; margin: 0 auto 18px;
  animation: aptPulse 1.6s ease-in-out infinite;
}
@keyframes aptPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(13,148,103,.4); }
  50% { box-shadow: 0 0 0 14px rgba(13,148,103,0); }
}
.apt-pay-icon.success { background: linear-gradient(135deg,#0D9467,#059652); animation: none; }
.apt-pay-icon.failed  { background: linear-gradient(135deg,#DC2626,#B91C1C); animation: none; }
.apt-pay-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px; font-weight: 800; color: #0F1117; margin-bottom: 8px;
}
.apt-pay-sub {
  font-size: 13px; color: #5A5E70; line-height: 1.6; margin-bottom: 20px;
}
.apt-pay-amount {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px; font-weight: 800; color: #0F1117;
  margin-bottom: 4px;
}
.apt-pay-phone {
  font-size: 12px; color: #9499AD; margin-bottom: 20px;
}
.apt-pay-spinner-row {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 14px; background: #F7F6F2; border-radius: 12px; margin-bottom: 16px;
}
.apt-pay-spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid #e5e7eb; border-top-color: #0D9467;
  animation: aptSpin .8s linear infinite;
}
@keyframes aptSpin { to { transform: rotate(360deg); } }
.apt-pay-status-text { font-size: 13px; font-weight: 600; color: #2A2D38; }
.apt-pay-countdown { font-size: 11px; color: #9499AD; margin-bottom: 16px; }
.apt-pay-cancel {
  background: none; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 10px 24px; font-family: 'Space Grotesk', sans-serif;
  font-size: 13px; font-weight: 600; color: #5A5E70; cursor: pointer;
  transition: background .2s;
}
.apt-pay-cancel:hover { background: #F7F6F2; }
.apt-pay-retry {
  background: linear-gradient(135deg,#0D9467,#059652); color: white;
  border: none; border-radius: 10px; padding: 10px 24px;
  font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: filter .2s;
}
.apt-pay-retry:hover { filter: brightness(1.08); }
.apt-pay-btn-row { display: flex; gap: 10px; justify-content: center; }
`;
  document.head.appendChild(style);

  /* Included in <head> on some pages, so document.body may not exist
     yet. Appending to it threw and took the whole payment module down
     with it — on my-bookings, the page where paying a balance is the
     entire point. Mount when the body is actually there. */
  const overlay = document.createElement('div');
  overlay.className = 'apt-pay-overlay';
  overlay.id = 'apt-pay-overlay';

  function mountOverlay() {
    if (overlay.isConnected) return;
    (document.body || document.documentElement).appendChild(overlay);
  }
  if (document.body) mountOverlay();
  else document.addEventListener('DOMContentLoaded', mountOverlay);

  let pollInterval = null;
  let pollAttempts = 0;
  const MAX_POLL_ATTEMPTS = 40; // ~2 minutes at 3s intervals

  function render(state, opts) {
    let html = '';
    if (state === 'sending') {
      html = `
        <div class="apt-pay-icon">📲</div>
        <div class="apt-pay-title">Check your phone</div>
        <div class="apt-pay-sub">We're sending an M-Pesa prompt to your number now…</div>
        <div class="apt-pay-amount">KES ${opts.amount.toLocaleString()}</div>
        <div class="apt-pay-phone">${opts.phone}</div>
        <div class="apt-pay-spinner-row">
          <div class="apt-pay-spinner"></div>
          <div class="apt-pay-status-text">Sending request…</div>
        </div>
        <button class="apt-pay-cancel" onclick="ApatmentoPay.cancel()">Cancel</button>
      `;
    } else if (state === 'waiting') {
      html = `
        <div class="apt-pay-icon">📲</div>
        <div class="apt-pay-title">Enter your M-Pesa PIN</div>
        <div class="apt-pay-sub">A payment prompt has been sent to <strong>${opts.phone}</strong>. Enter your PIN on your phone to complete payment.</div>
        <div class="apt-pay-amount">KES ${opts.amount.toLocaleString()}</div>
        <div class="apt-pay-spinner-row">
          <div class="apt-pay-spinner"></div>
          <div class="apt-pay-status-text">Waiting for confirmation…</div>
        </div>
        <div class="apt-pay-countdown">This may take up to 60 seconds</div>
        <button class="apt-pay-cancel" onclick="ApatmentoPay.cancel()">Cancel</button>
      `;
    } else if (state === 'success') {
      html = `
        <div class="apt-pay-icon success">✅</div>
        <div class="apt-pay-title">Payment confirmed!</div>
        <div class="apt-pay-sub">${opts.description || 'Your booking is confirmed.'}</div>
        <div class="apt-pay-amount">KES ${opts.amount.toLocaleString()}</div>
        <div class="apt-pay-btn-row">
          <button class="apt-pay-retry" onclick="ApatmentoPay.close()">Done</button>
        </div>
      `;
    } else if (state === 'failed') {
      html = `
        <div class="apt-pay-icon failed">❌</div>
        <div class="apt-pay-title">Payment didn't go through</div>
        <div class="apt-pay-sub">${opts.errorMsg || 'The payment was cancelled or timed out. You can try again.'}</div>
        <div class="apt-pay-btn-row">
          <button class="apt-pay-cancel" onclick="ApatmentoPay.close()">Close</button>
          <button class="apt-pay-retry" onclick="ApatmentoPay.retry()">Try Again</button>
        </div>
      `;
    } else if (state === 'error') {
      html = `
        <div class="apt-pay-icon failed">⚠️</div>
        <div class="apt-pay-title">Something went wrong</div>
        <div class="apt-pay-sub">${opts.errorMsg || 'Could not start the payment. Please check your connection and try again.'}</div>
        <div class="apt-pay-btn-row">
          <button class="apt-pay-cancel" onclick="ApatmentoPay.close()">Close</button>
          <button class="apt-pay-retry" onclick="ApatmentoPay.retry()">Try Again</button>
        </div>
      `;
    }
    mountOverlay();   /* in case render lands before DOMContentLoaded */
    overlay.innerHTML = `<div class="apt-pay-card">${html}</div>`;
  }

  let lastOpts = null;

  async function accessToken() {
    const cached = window.ApaSession?.peekSession?.();
    if (cached?.access_token) return cached.access_token;
    const client = window.ApaSession?.client?.() || window.sb;
    if (!client?.auth?.getSession) return '';
    try {
      const { data } = await client.auth.getSession();
      return data?.session?.access_token || '';
    } catch (_) { return ''; }
  }

  async function start(opts) {
    lastOpts = opts;
    pollAttempts = 0;
    overlay.classList.add('open');
    render('sending', opts);

    try {
      const token = await accessToken();
      if (!token) {
        const error = { error: 'authentication_required' };
        render('error', { ...opts, errorMsg: 'Please sign in again before starting payment.' });
        if (opts.onFailure) opts.onFailure(error);
        return;
      }
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: opts.amount,
          phone: opts.phone,
          reference: opts.reference,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        render('error', { ...opts, errorMsg: data.error || 'Failed to send payment request.' });
        if (opts.onFailure) opts.onFailure(data);
        return;
      }

      // STK push sent successfully. Now poll for completion
      render('waiting', opts);
      startPolling(opts);

    } catch (err) {
      console.error('Payment start error:', err);
      render('error', { ...opts, errorMsg: 'Network error. Please check your connection.' });
      if (opts.onFailure) opts.onFailure(err);
    }
  }

  function startPolling(opts) {
    pollInterval = setInterval(async () => {
      pollAttempts++;
      if (pollAttempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollInterval);
        render('failed', { ...opts, errorMsg: 'Payment timed out. If money was deducted, contact support with your reference number.' });
        if (opts.onFailure) opts.onFailure({ reason: 'timeout' });
        return;
      }

      try {
        const res = await fetch(`/api/check-payment-status?table=${opts.table}&reference=${encodeURIComponent(opts.reference)}`);
        const data = await res.json();

        if (data.status === 'paid') {
          clearInterval(pollInterval);
          render('success', opts);
          if (opts.onSuccess) opts.onSuccess(data);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          render('failed', opts);
          if (opts.onFailure) opts.onFailure(data);
        }
        // else still pending. Keep polling
      } catch (err) {
        console.warn('Poll error:', err);
        // don't stop polling on a transient network error
      }
    }, 3000);
  }

  function cancel() {
    if (pollInterval) clearInterval(pollInterval);
    overlay.classList.remove('open');
  }

  function close() {
    if (pollInterval) clearInterval(pollInterval);
    overlay.classList.remove('open');
  }

  function retry() {
    if (lastOpts) start(lastOpts);
  }

  window.ApatmentoPay = { start, cancel, close, retry };

  /* Same alias as cabana-pay.js, so a page that loads either file
     answers to both names. Only set if cabana-pay.js has not already
     claimed it: that file is the richer implementation and, where
     both are present, must win. */
  if (!window.CabanaPay) window.CabanaPay = window.ApatmentoPay;

})();
