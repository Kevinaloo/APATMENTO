(function () {
  'use strict';

  const buttons = Array.from(document.querySelectorAll('[data-amb-stage]'));
  const detail = document.getElementById('amb-journey-detail');
  if (!buttons.length || !detail) return;

  const stages = [
    {
      mark: '↗', label: 'The first hello', title: 'A connection, recorded.',
      copy: 'Reserve your introduction in the dashboard. You have 45 days to help them take the next step.',
      status: 'Reserved · No earnings yet'
    },
    {
      mark: '✳', label: 'Build it together', title: 'Give their place a home.',
      copy: 'Help the host or operator prepare their listing. It stays unpublished until the owner signs in and accepts it.',
      status: 'Listing prepared · Awaiting the owner'
    },
    {
      mark: '✓', label: 'The handover', title: 'Their keys. Your impact.',
      copy: 'The owner accepts the listing and takes control. Your dashboard records the handover and recognises your contribution.',
      status: 'Owner accepted · No commission yet'
    },
    {
      mark: '↗', label: 'Room for growth', title: 'Good things follow.',
      copy: 'Eligible attributed bookings can earn you a share of Cabana’s service fee during the 365-day referral period. Your dashboard shows the details.',
      status: 'Eligible booking · Commission recorded'
    }
  ];
  const targets = {
    mark: document.getElementById('amb-example-mark'),
    label: document.getElementById('amb-example-label'),
    title: document.getElementById('amb-example-title'),
    copy: document.getElementById('amb-example-copy'),
    status: document.getElementById('amb-example-status')
  };
  let animationFrame;

  function select(index) {
    if (!stages[index]) return;
    buttons.forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
    Object.entries(targets).forEach(([key, element]) => {
      if (element) element.textContent = stages[index][key];
    });
    document.getElementById('amb-example-number').textContent = '0' + (index + 1) + ' / 04';
    detail.dataset.activeStage = String(index);
    detail.classList.remove('is-changing');
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      // Two frames allow the previous animation to finish resetting before a new selection.
      animationFrame = requestAnimationFrame(() => detail.classList.add('is-changing'));
    });
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });
  });
})();
