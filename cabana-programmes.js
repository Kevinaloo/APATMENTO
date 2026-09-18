(function () {
  'use strict';
  const root = document.documentElement;
  if (!document.querySelector('.pg-motion-dock')) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'pg-motion-dock';
    control.setAttribute('data-motion-toggle', '');
    control.textContent = 'Pause motion';
    document.body.appendChild(control);
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  try { paused = paused || sessionStorage.getItem('cabana-programme-motion') === 'paused'; } catch (_) {}
  function motion() {
    root.classList.toggle('pg-no-motion', paused);
    if (paused || reduced.matches) {
      document.querySelectorAll('[data-tilt]').forEach(card => { card.style.transform = ''; });
      document.getAnimations().forEach(animation => {
        if (animation.effect && animation.effect.target && animation.effect.target.closest('.programme-page')) animation.cancel();
      });
    }
    document.querySelectorAll('[data-motion-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = paused ? 'Enable motion' : 'Pause motion';
    });
  }
  document.querySelectorAll('[data-motion-toggle]').forEach(button => button.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('cabana-programme-motion', paused ? 'paused' : 'enabled'); } catch (_) {}
    motion();
  }));
  reduced.addEventListener('change', event => { paused = event.matches; motion(); });
  motion();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.pg-reveal').forEach(section => observer.observe(section));
    root.classList.add('pg-enhanced');
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: paused || reduced.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', link.hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', event => {
        if (paused || reduced.matches) return;
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        card.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
  const studio = document.querySelector('[data-creator-demo]');
  if (studio) {
    const settings = {
      coast: { title: 'The coast is calling.', image: 'influencer-editorial.png', alt: 'Coastal campaign inspiration', story: 'A slower morning. Salt in the air. One more reason to stay.\n\nYour next coastal chapter starts here.', guide: 'Save this for your next coastal escape: slow mornings, sea air, and a place to make your own.\n\nCheck the listing for current prices, photos and availability.', minimal: 'Salt air. Slow days.\nYour next coastal chapter.' },
      city: { title: 'A different side of the city.', image: 'agent-editorial.png', alt: 'Architectural travel campaign inspiration', story: 'An unhurried check-in. A city full of possibilities. A little space that feels like yours.\n\nMake a weekend of it.', guide: 'Your city break starts with the right base. Explore the photos, check the location, and choose the dates that work for you.', minimal: 'New city. Your rhythm.\nStay a little longer.' },
      wild: { title: 'A little closer to nature.', image: 'ambassador-editorial.png', alt: 'Courtyard travel campaign inspiration', story: 'Trade the everyday rush for a change of scenery. Open skies, long conversations, and a different kind of weekend.', guide: 'Planning a nature escape? Check the listing for its location, what is included, and current availability before you go.', minimal: 'More sky. Less hurry.\nFind your next escape.' },
    };
    let setting = 'coast', mood = 'story';
    function paint() {
      const content = settings[setting];
      studio.querySelector('[data-demo-title]').textContent = content.title;
      const photo = studio.querySelector('[data-demo-image]');
      photo.src = '/assets/programmes/' + content.image; photo.alt = content.alt;
      const tag = studio.querySelector('[data-demo-tag]');
      if (tag) tag.textContent = 'THE ' + setting.toUpperCase() + ' / YOUR EDIT';
      studio.querySelector('[data-demo-caption]').textContent = content[mood] + '\n\nI may earn commission when you book through my link.';
      const post = studio.querySelector('.cr-post');
      if (post && !paused && !reduced.matches && post.animate) {
        post.animate([{ opacity: .5, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
      }
      studio.querySelector('[data-copy-status]').textContent = '';
      studio.querySelectorAll('[data-setting]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setting === setting)));
      studio.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === mood)));
    }
    studio.querySelectorAll('[data-setting]').forEach(button => button.addEventListener('click', () => { setting = button.dataset.setting; paint(); }));
    studio.querySelectorAll('[data-mood]').forEach(button => button.addEventListener('click', () => { mood = button.dataset.mood; paint(); }));
    studio.querySelector('[data-copy-post]').addEventListener('click', async () => {
      const caption = studio.querySelector('[data-demo-caption]');
      const status = studio.querySelector('[data-copy-status]');
      try { await navigator.clipboard.writeText(caption.textContent); status.textContent = 'Copied. Make it your own before sharing.'; }
      catch (_) {
        const range = document.createRange(); range.selectNodeContents(caption);
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        status.textContent = 'Caption selected. Use your device’s copy command.';
      }
    });
  }
  const calculator = document.querySelector('[data-agent-demo]');
  if (calculator) {
    const value = calculator.querySelector('#demo-value'), rate = calculator.querySelector('#demo-rate');
    const money = number => 'KES ' + new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(number);
    const calculate = () => {
      calculator.querySelector('[data-booking-label]').textContent = money(value.value);
      calculator.querySelector('[data-rate-label]').textContent = rate.value + '%';
      calculator.querySelector('[data-ledger-value]').textContent = money(value.value);
      calculator.querySelector('[data-ledger-rate]').textContent = rate.value + '%';
      calculator.querySelector('[data-commission]').textContent = money(Number(value.value) * Number(rate.value) / 100);
    };
    value.addEventListener('input', calculate); rate.addEventListener('input', calculate); calculate();
  }
})();
