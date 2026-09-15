/* One small member card across listing, messenger and professional surfaces. */
(function () {
  'use strict';
  if (window.CabanaPeople) return;
  const ROLES = {
    traveller:['Traveller','Explores and books with Cabana.'],
    host:['Host','Publishes and manages their own stays or services.'],
    agent:['Agent','Represents listings with the host’s approval and agreed commission.'],
    influencer:['Influencer','Promotes approved listings to an audience through tracked links.'],
    ambassador:['Ambassador','An invited Cabana field representative who helps new members and providers join.']
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dialog, returnFocus;
  async function request(id, body) {
    const headers = {'Content-Type':'application/json'};
    const client = window.ApaSession?.client?.() || window.sb;
    const session = client ? (await client.auth.getSession()).data?.session : null;
    if (session?.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    const r = await fetch('/api/agents?action=public-profile' + (id ? '&id=' + encodeURIComponent(id) : ''), {
      method:body ? 'POST':'GET', headers, ...(body ? {body:JSON.stringify(body)} : {})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Profile could not load.');
    return data;
  }
  function badges(roles) {
    return (roles || []).filter(r => ROLES[r]).map(r => '<span class="cbp-badge" title="'+esc(ROLES[r][1])+'">'+ROLES[r][0]+'</span>').join('');
  }
  function close() {
    if (!dialog) return;
    dialog.close(); dialog.remove(); dialog = null;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  async function open(id) {
    close(); returnFocus = document.activeElement;
    const current = document.createElement('dialog'); dialog = current;
    current.className = 'cbp-dialog'; current.setAttribute('aria-label','Cabana member profile');
    current.innerHTML = '<button class="cbp-close" aria-label="Close profile" type="button">×</button><div class="cbp-content" role="status">Loading profile…</div>';
    current.querySelector('button').addEventListener('click', close);
    current.addEventListener('cancel', e => { e.preventDefault(); close(); });
    document.body.appendChild(current); current.showModal();
    try {
      const {profile:p} = await request(id);
      if (dialog !== current) return;
      current.querySelector('.cbp-content').innerHTML = '<div class="cbp-avatar">'+esc(p.display_name.slice(0,1).toUpperCase())+'</div>'
        + '<h2>'+esc(p.display_name)+'</h2><div class="cbp-badges">'+badges(p.roles)+'</div>'
        + (p.bio ? '<p>'+esc(p.bio)+'</p>' : '')
        + (p.member_since ? '<p class="cbp-muted">Member since '+esc(p.member_since)+'</p>' : '')
        + '<div class="cbp-roles">'+p.roles.filter(r=>ROLES[r]).map(r=>'<p><strong>'+ROLES[r][0]+'</strong> · '+ROLES[r][1]+'</p>').join('')+'</div>'
        + (p.can_edit ? '<a href="/profile#public-profile">Edit your public profile</a>' : '');
    } catch (e) { if (dialog === current) current.querySelector('.cbp-content').textContent = e.message; }
  }
  const style = document.createElement('style');
  style.textContent = '.cbp-dialog{box-sizing:border-box;width:min(440px,calc(100vw - 32px));max-height:85dvh;border:1px solid #b6a3d666;border-radius:24px;padding:28px;background:#fff;color:#252033;box-shadow:0 24px 70px #20122e33;font:14px/1.6 system-ui}.cbp-dialog::backdrop{background:#17112566;backdrop-filter:blur(5px)}.cbp-close{position:absolute;top:12px;right:14px;border:0;background:transparent;color:inherit;font-size:28px;cursor:pointer}.cbp-avatar{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#b8a4f4,#7b2ff7);color:white;font-size:27px;font-weight:700}.cbp-dialog h2{margin:14px 0 8px;font-size:23px;line-height:1.3}.cbp-badges{display:flex;flex-wrap:wrap;gap:6px}.cbp-badge{display:inline-block;border-radius:100px;background:#eee6fb;color:#6135a0;padding:4px 10px;font-size:11px;font-weight:700}.cbp-muted{color:#797181;font-size:12px}.cbp-roles{border-top:1px solid #b6a3d633;margin-top:18px;padding-top:6px;font-size:12px}.cbp-dialog a{color:#7138c0}button[data-cabana-person]{font:inherit;color:inherit;cursor:pointer}button.dl-host-ava{border:0}button.dl-host-name{border:0;background:none;padding:0;text-align:left}@media(prefers-color-scheme:dark){.cbp-dialog{background:#24202e;color:#eee8f5}.cbp-badge{background:#413254;color:#e1cffc}.cbp-muted{color:#b7acbf}.cbp-dialog a{color:#c7a4fa}}';
  document.head.appendChild(style);
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-cabana-person]');
    if (!target || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const id = target.dataset.cabanaPerson;
    if (!id) return;
    e.preventDefault(); e.stopPropagation(); open(id);
  });
  window.CabanaPeople = {open,close,request,badges};
})();
