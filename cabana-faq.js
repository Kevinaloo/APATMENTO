/* ═══════════════════════════════════════════════════════════════════
   CABANA · FAQ ACCORDION ENGINE
   Smooth slide-down animation and content fade-in for <details>
   ───────────────────────────────────────────────────────────────────
   Rules:
     1. Defensive: Never throws, fails gracefully if unsupported.
     2. Uses Web Animations API with zero dependencies.
     3. Animates height smoothly (cubic-bezier) while fading in answer.
     4. Handles closing with reverse slide-up and fade-out.
     5. Handles rapid clicks and interrupts cleanly.
     6. Fully respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.__CABANA_FAQ__) return;
  global.__CABANA_FAQ__ = 1;

  var doc = global.document;
  if (!doc) return;

  var REDUCE = false;
  try {
    REDUCE = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}

  var EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var DURATION_OPEN = 320;
  var DURATION_CLOSE = 260;

  function Accordion(el) {
    this.el = el;
    this.summary = el.querySelector('summary');
    if (!this.summary) return;

    this.content = el.querySelector('.faq-answer, .cfaq-a, .fa') || this.findContent();
    this.animation = null;
    this.contentAnimation = null;
    this.isClosing = false;
    this.isExpanding = false;

    // Accessibility attributes for keyboard navigation
    if (!this.summary.hasAttribute('tabindex')) {
      this.summary.setAttribute('tabindex', '0');
    }
    if (!this.summary.hasAttribute('role')) {
      this.summary.setAttribute('role', 'button');
    }
    this.summary.setAttribute('aria-expanded', el.hasAttribute('open') ? 'true' : 'false');

    var self = this;
    this.toggle = function () {
      if (REDUCE || typeof el.animate !== 'function') {
        if (self.el.open) {
          self.el.removeAttribute('open');
          self.summary.setAttribute('aria-expanded', 'false');
        } else {
          self.el.setAttribute('open', '');
          self.summary.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      self.el.style.overflow = 'hidden';

      if (self.isClosing || !self.el.open) {
        self.open();
      } else if (self.isExpanding || self.el.open) {
        self.shrink();
      }
    };

    this.onSummaryClick = function (e) {
      if (REDUCE || typeof el.animate !== 'function') return;
      e.preventDefault();
      self.toggle();
    };

    this.onSummaryKeyDown = function (e) {
      var key = e.key || e.code;
      if (key === 'Enter' || key === ' ' || key === 'Space' || key === 'Spacebar' || e.keyCode === 13 || e.keyCode === 32) {
        e.preventDefault();
        self.toggle();
      }
    };

    this.summary.addEventListener('click', this.onSummaryClick);
    this.summary.addEventListener('keydown', this.onSummaryKeyDown);
  }

  Accordion.prototype.findContent = function () {
    var children = Array.prototype.slice.call(this.el.children);
    for (var i = 0; i < children.length; i++) {
      if (children[i] !== this.summary) return children[i];
    }
    return null;
  };

  Accordion.prototype.shrink = function () {
    this.isClosing = true;
    var startHeight = this.el.offsetHeight + 'px';
    
    var borderTop = 0;
    var borderBottom = 0;
    try {
      var computed = global.getComputedStyle(this.el);
      borderTop = parseFloat(computed.borderTopWidth) || 0;
      borderBottom = parseFloat(computed.borderBottomWidth) || 0;
    } catch (_) {}

    var endHeight = (this.summary.offsetHeight + borderTop + borderBottom) + 'px';

    if (this.animation) this.animation.cancel();
    if (this.contentAnimation) this.contentAnimation.cancel();

    if (this.content) {
      this.contentAnimation = this.content.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-6px)' }
      ], {
        duration: 180,
        easing: 'ease-out',
        fill: 'forwards'
      });
    }

    var self = this;
    this.animation = this.el.animate([
      { height: startHeight },
      { height: endHeight }
    ], {
      duration: DURATION_CLOSE,
      easing: EASING
    });

    this.animation.onfinish = function () {
      self.onAnimationFinish(false);
    };

    this.animation.oncancel = function () {
      self.isClosing = false;
    };
  };

  Accordion.prototype.open = function () {
    this.isExpanding = true;
    var startHeight = this.el.offsetHeight + 'px';

    this.el.setAttribute('open', '');
    var endHeight = this.el.scrollHeight + 'px';

    if (this.animation) this.animation.cancel();
    if (this.contentAnimation) this.contentAnimation.cancel();

    if (this.content) {
      this.contentAnimation = this.content.animate([
        { opacity: 0, transform: 'translateY(-10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], {
        duration: DURATION_OPEN + 40,
        easing: EASING,
        fill: 'forwards'
      });
    }

    var self = this;
    this.animation = this.el.animate([
      { height: startHeight },
      { height: endHeight }
    ], {
      duration: DURATION_OPEN,
      easing: EASING
    });

    this.animation.onfinish = function () {
      self.onAnimationFinish(true);
    };

    this.animation.oncancel = function () {
      self.isExpanding = false;
    };
  };

  Accordion.prototype.onAnimationFinish = function (open) {
    if (open) {
      this.el.setAttribute('open', '');
      if (this.summary) this.summary.setAttribute('aria-expanded', 'true');
    } else {
      this.el.removeAttribute('open');
      if (this.summary) this.summary.setAttribute('aria-expanded', 'false');
    }
    this.animation = null;
    this.contentAnimation = null;
    this.isClosing = false;
    this.isExpanding = false;
    this.el.style.height = '';
    this.el.style.overflow = '';
  };

  function initAll() {
    var details = doc.querySelectorAll('details');
    for (var i = 0; i < details.length; i++) {
      var d = details[i];
      if (!d.__cbnAccordion && d.querySelector('summary')) {
        d.__cbnAccordion = new Accordion(d);
      }
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  global.CabanaFaq = {
    init: initAll,
    Accordion: Accordion
  };
})(typeof window !== 'undefined' ? window : this);
