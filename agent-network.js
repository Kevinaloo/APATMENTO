(function () {
  'use strict';
  const calculator = document.querySelector('[data-agent-demo]');
  if (!calculator) return;
  const value = calculator.querySelector('#demo-value');
  const sliders = calculator.querySelectorAll('input[type="range"]');
  const presets = calculator.querySelectorAll('[data-agent-preset]');
  function updateControls() {
    sliders.forEach(slider => {
      const fill = (Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100;
      slider.style.setProperty('--range-fill', fill + '%');
    });
    presets.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.agentPreset === value.value)));
  }
  presets.forEach(button => button.addEventListener('click', () => {
    value.value = button.dataset.agentPreset;
    value.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  sliders.forEach(slider => slider.addEventListener('input', updateControls));
  updateControls();
})();
