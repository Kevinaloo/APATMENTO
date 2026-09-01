/* ═══════════════════════════════════════════════════════════════════
   CABANA · NEWSLETTER ENGINE
   Footer newsletter subscription handler with email validation
   ───────────────────────────────────────────────────────────────────
   Rules:
     1. Defensive: Never throws, fails gracefully offline.
     2. Validates client-side RFC 5322 regex + length + format checks.
     3. Communicates with /api/subscribe (/api/utilities?action=subscribe).
     4. Persists subscription state in localStorage.
     5. Accessible with aria-live status notifications.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.__CABANA_NEWSLETTER__) return;
  global.__CABANA_NEWSLETTER__ = 1;

  var doc = global.document;
  if (!doc) return;

  var STORAGE_KEY = 'cabana_newsletter_subscribed';
  var EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  function validateEmail(email) {
    if (!email) {
      return { valid: false, message: 'Please enter your email address.' };
    }
    var trimmed = String(email).trim();
    if (trimmed.length < 5) {
      return { valid: false, message: 'Email address is too short.' };
    }
    if (trimmed.length > 254) {
      return { valid: false, message: 'Email address is too long.' };
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address (e.g. name@example.com).' };
    }
    var parts = trimmed.split('@');
    if (parts.length !== 2) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    var domain = parts[1];
    if (!domain.includes('.') || domain.endsWith('.') || domain.startsWith('.')) {
      return { valid: false, message: 'Please include a valid domain name.' };
    }
    var tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
      return { valid: false, message: 'Please include a valid top-level domain.' };
    }
    return { valid: true, email: trimmed.toLowerCase() };
  }

  function bindNewsletterForm(form) {
    if (!form || form.dataset.cbnNewsletterInit) return;
    form.dataset.cbnNewsletterInit = '1';

    var emailInput = form.querySelector('input[type="email"]') || form.querySelector('input[name="email"]');
    var submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.sf-newsletter-btn');
    var feedback = form.querySelector('.sf-newsletter-feedback') || form.parentElement.querySelector('.sf-newsletter-feedback') || doc.getElementById('footer-newsletter-feedback');
    var group = form.querySelector('.sf-newsletter-input-group') || form.querySelector('.sf-newsletter-field');

    if (!emailInput || !submitBtn) return;

    // Check if user already subscribed in this browser
    try {
      var saved = global.localStorage ? global.localStorage.getItem(STORAGE_KEY) : null;
      if (saved && !emailInput.value) {
        emailInput.value = saved;
        if (feedback) {
          feedback.className = 'sf-newsletter-feedback success';
          feedback.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Subscribed for travel updates and deals.';
        }
      }
    } catch (_) {}

    function clearError() {
      if (group) group.classList.remove('has-error');
      if (feedback && !feedback.classList.contains('success')) {
        feedback.textContent = '';
        feedback.className = 'sf-newsletter-feedback';
      }
    }

    emailInput.addEventListener('input', clearError);
    emailInput.addEventListener('focus', clearError);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = emailInput.value;
      var check = validateEmail(raw);

      if (!check.valid) {
        if (group) group.classList.add('has-error');
        if (feedback) {
          feedback.className = 'sf-newsletter-feedback error';
          feedback.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ' + check.message;
        }
        try { emailInput.focus(); } catch (_) {}
        return;
      }

      clearError();
      var origBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Subscribing…</span>';

      var payload = {
        email: check.email,
        source: form.getAttribute('data-source') || 'footer_newsletter'
      };

      var done = function (msg) {
        try {
          if (global.localStorage) {
            global.localStorage.setItem(STORAGE_KEY, check.email);
          }
        } catch (_) {}

        if (feedback) {
          feedback.className = 'sf-newsletter-feedback success';
          feedback.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> ' + (msg || "You're subscribed! We'll keep you posted on the latest travel updates and deals.");
        }
        submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> <span>Subscribed</span>';
        submitBtn.style.background = 'linear-gradient(135deg, #2DD4BF, #0D9488)';
        setTimeout(function () {
          submitBtn.disabled = false;
        }, 1200);
      };

      var reqFailed = function (message) {
        if (group) group.classList.add('has-error');
        if (feedback) {
          feedback.className = 'sf-newsletter-feedback error';
          feedback.textContent = message || 'We could not save your subscription. Please try again.';
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      };

      if (typeof global.fetch === 'function') {
        global.fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok || !data || data.ok !== true) {
              reqFailed(data && data.message);
              return;
            }
            done(data.message);
          });
        }).catch(function () { reqFailed(); });
      } else {
        reqFailed('Subscriptions need an internet connection. Please reconnect and try again.');
      }
    });
  }

  function initAll() {
    var forms = doc.querySelectorAll('#footer-newsletter-form, .sf-newsletter-form');
    for (var i = 0; i < forms.length; i++) {
      bindNewsletterForm(forms[i]);
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  global.CabanaNewsletter = {
    init: initAll,
    validate: validateEmail,
    bind: bindNewsletterForm
  };
})(typeof window !== 'undefined' ? window : this);
