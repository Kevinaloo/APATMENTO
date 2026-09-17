(function (global) {
  'use strict';
  function mount(host, data) {
    if (!host) return;
    host.replaceChildren();
    host.className = 'cabana-spotlight';
    host.setAttribute('data-programme', data.role.toLowerCase());
    var count = Math.max(0, Math.floor(Number(data.count) || 0));
    var levels = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
    var next = levels.find(function (n) { return n > count; }) || (Math.floor(count / 1000) + 1) * 1000;
    var achieved = levels.filter(function (n) { return n <= count; }).pop();
    function el(tag, cls, text, parent) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      (parent || host).appendChild(node);
      return node;
    }
    el('div', 'spot-kicker', 'Cabana • ' + data.role + ' spotlight');
    el('h2', '', data.role === 'Influencer' ? 'Your influence deserves the spotlight.' : 'The connections are yours. So is the recognition.');
    el('p', '', (data.name || data.role) + ', this is your impact on Cabana.');
    var proof = el('div', 'spot-proof');
    var metric = el('div', '', null, proof);
    el('div', 'spot-count', count.toLocaleString(), metric);
    el('span', 'spot-label', data.unit, metric);
    el('span', 'spot-badge', achieved ? achieved + '+ milestone reached' : 'Your story starts here', proof);
    var progress = el('progress', 'spot-progress');
    progress.max = next; progress.value = count;
    progress.setAttribute('aria-label', count + ' of ' + next + ' ' + data.unit);
    el('p', '', (next - count).toLocaleString() + ' more to your ' + next.toLocaleString() + ' milestone.');
    el('p', '', data.detail);
    var actions = el('div', 'spot-actions');
    var explore = el('a', '', 'Explore your programme ↗', actions);
    explore.href = { Influencer: '/influencers.html', Agent: '/agents.html', Ambassador: '/ambassadors.html' }[data.role] || '/';
    var share = el('button', '', 'Share my impact', actions); share.type = 'button';
    var review = el('a', '', 'Report missing credit', actions);
    review.href = 'mailto:connect@cabana.africa?subject=' + encodeURIComponent(data.role + ' attribution review') + '&body=' + encodeURIComponent('Name: ' + (data.name || '') + '\nRole: ' + data.role + '\nMy code: ' + (data.code || '') + '\n\nPlease review missing credit.\nRegistration or booking reference:\nDate:\nHow I introduced or helped this person:\n');
    var status = el('p', 'spot-status', ''); status.setAttribute('role', 'status');
    share.addEventListener('click', async function () {
      var text = (data.name || 'I') + ' • Cabana ' + data.role + '\n' + count.toLocaleString() + ' ' + data.unit + ' on Cabana.' + (data.link ? '\n' + data.link : '');
      try {
        if (navigator.share) { await navigator.share({ title: 'My Cabana impact', text: text }); status.textContent = 'Shared.'; }
        else { await navigator.clipboard.writeText(text); status.textContent = 'Your impact is copied and ready to share.'; }
      } catch (err) {
        if (err.name === 'AbortError') return;
        var box = host.querySelector('.spot-copy') || el('textarea', 'spot-copy');
        box.readOnly = true; box.value = text; box.setAttribute('aria-label', 'Your impact to copy'); box.focus(); box.select();
        status.textContent = 'Select and copy your impact below.';
      }
    });
  }
  global.CabanaSpotlight = { mount: mount };
})(window);
