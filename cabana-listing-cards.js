/* Cabana listing cards. Original controls remain the source of truth.
 * Gestures only answer explicit choices; forms and submission require buttons. */
(function () {
  'use strict';
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const make = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls || ''; if (text) el.textContent = text; return el; };
  const button = (text, cls, action) => { const b = make('button', cls, text); b.type = 'button'; b.addEventListener('click', action); return b; };
  const announce = make('div', 'cc-sr'); announce.setAttribute('role', 'status'); announce.setAttribute('aria-live', 'polite'); document.body.append(announce);
  function say(text) { announce.textContent = text; }
  function animate(el, frames, duration = 300) {
    if (!reduced() && el.animate) return el.animate(frames, { duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none' }).finished.catch(() => {});
    return Promise.resolve();
  }

  function choice(host, config) {
    if (!config.items.length) return;
    let index = 0, busy = false, history = [], expanded = false, drag = null;
    const box = make('section', 'cc-choice'); box.setAttribute('aria-label', config.label);
    const meta = make('div', 'cc-choice-meta');
    const count = make('span'); const all = button('See all', 'cc-text', () => { expanded = !expanded; render(); });
    meta.append(count, all);
    const stage = make('div', 'cc-stage');
    const card = make('div', 'cc-decision'); card.tabIndex = 0; card.setAttribute('role', 'group');
    const stamp = make('span', 'cc-stamp'); stamp.setAttribute('aria-hidden', 'true');
    const mark = make('div', 'cc-mark'); mark.setAttribute('aria-hidden', 'true');
    const eyebrow = make('p', 'cc-kicker', config.label);
    const title = make('h3', 'cc-choice-title');
    const detail = make('p', 'cc-choice-detail');
    const selected = make('span', 'cc-selected');
    card.append(stamp, mark, eyebrow, title, detail, selected); stage.append(card);
    const controls = make('div', 'cc-actions');
    const no = button('← Not this', 'cc-no', () => answer(false));
    const undo = button('↶ Undo', 'cc-undo', () => {
      if (busy || !history.length) return;
      const previous = history.pop(); index = previous.index; previous.restore(); render(); say('Previous choice restored.'); card.focus({preventScroll:true});
    });
    const yes = button('This one →', 'cc-yes', () => answer(true)); controls.append(no, undo, yes);
    const hint = make('p', 'cc-hint', 'Swipe or use the buttons. Every choice can be changed.');
    const list = make('div', 'cc-all');
    box.append(meta, stage, controls, hint, list); host.append(box);
    function render() {
      busy = false; card.style.transform = ''; card.classList.remove('cc-red', 'cc-green'); stamp.textContent = '';
      stage.hidden = expanded; controls.hidden = expanded; hint.hidden = expanded; list.hidden = !expanded;
      all.textContent = expanded ? 'Back to cards' : 'See all';
      const done = index >= config.items.length;
      count.textContent = done ? 'All options explored' : `${index + 1} / ${config.items.length}`;
      title.textContent = done ? (config.multiple ? 'Your features, sorted.' : 'Find your match') : config.items[index].label;
      detail.textContent = done ? 'Review your choices below, or go back to change an answer.' : config.items[index].detail || 'Does this describe what you offer?';
      mark.textContent = done ? '✓' : config.items[index].symbol || String(index + 1).padStart(2, '0');
      if(!done && config.items[index].icon)mark.replaceChildren(config.items[index].icon.cloneNode(true));
      selected.textContent = done ? '' : config.items[index].selected() ? '✓ Selected' : '';
      no.textContent = config.multiple ? '← No' : '← Not this'; yes.textContent = config.multiple ? 'Yes →' : 'This one →';
      no.disabled = yes.disabled = done; undo.disabled = !history.length;
      list.replaceChildren();
      config.items.forEach((item, i) => {
        const b = button(item.label, 'cc-option', () => { if(busy)return; index = i; expanded = false; answer(config.multiple ? !item.selected() : true); });
        b.setAttribute('aria-pressed', String(item.selected())); list.append(b);
      });
      if (done) { list.hidden = false; hint.hidden = true; }
      card.setAttribute('aria-label', done ? title.textContent : `${config.label}: ${title.textContent}. Left for ${config.multiple ? 'no' : 'not this'}, right for ${config.multiple ? 'yes' : 'select'}.`);
    }
    async function answer(value) {
      if (busy || index >= config.items.length) return;
      busy = true; no.disabled = yes.disabled = undo.disabled = true;
      const item = config.items[index], before = config.snapshot();
      history.push({ index, restore: () => config.restore(before) });
      card.classList.add(value ? 'cc-green' : 'cc-red'); stamp.textContent = value ? (config.multiple ? 'YES' : 'SELECTED') : (config.multiple ? 'NO' : 'NEXT');
      await animate(card, [{transform:'translateX(0) rotateY(0)'},{transform:`translateX(${value ? '' : '-'}115%) rotate(${value ? '' : '-'}16deg) rotateY(${value ? '-' : ''}20deg)`,opacity:0}], 260);
      if (!box.isConnected) return;
      if (value || config.multiple) config.set(item, value);
      index = value && !config.multiple ? index : index + 1;
      say(`${item.label}: ${value ? 'selected' : config.multiple ? 'not included' : 'skipped'}.`);
      render();
      if (value && !config.multiple && config.advance) { config.advance(); return; }
      if (value && !config.multiple) { expanded = true; render(); }
      await animate(card, [{opacity:0,transform:'translateY(18px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}]);
    }
    card.addEventListener('keydown', e => {
      if (e.target !== card) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); answer(e.key === 'ArrowRight'); }
    });
    card.addEventListener('pointerdown', e => { if (busy || e.button !== 0 || index >= config.items.length) return; drag = {id:e.pointerId,x:e.clientX,y:e.clientY}; card.setPointerCapture?.(e.pointerId); });
    card.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const x = e.clientX - drag.x, y = e.clientY - drag.y;
      if (Math.abs(y) > Math.abs(x) && Math.abs(y) > 16) { reset(); return; }
      if(reduced()) card.style.transform = `translateX(${x * .35}px)`;
      else card.style.transform = `translateX(${x}px) rotate(${x/22}deg) rotateY(${-x/18}deg)`;
      card.classList.toggle('cc-green', x > 18); card.classList.toggle('cc-red', x < -18);
      stamp.textContent = x > 18 ? (config.multiple ? 'YES' : 'SELECT') : x < -18 ? (config.multiple ? 'NO' : 'NEXT') : '';
    });
    function reset() { drag = null; card.style.transform=''; card.classList.remove('cc-red','cc-green'); stamp.textContent=''; }
    card.addEventListener('pointerup', e => { if (!drag) return; const x=e.clientX-drag.x; const y=e.clientY-drag.y; reset(); if (Math.abs(x) >= Math.min(90, card.clientWidth * .23) && Math.abs(x)>Math.abs(y)*1.25) answer(x>0); });
    card.addEventListener('pointercancel', reset); card.addEventListener('lostpointercapture', reset);
    render(); return {box, refresh:render};
  }

  // A focused form keeps real input elements mounted, including maps and uploaders.
  function focusForm(root, units, actions) {
    if (!root || units.length < 2 || root.dataset.ccFocus) return;
    root.dataset.ccFocus = 'true'; let at = 0, overview = false;
    /* A unit whose every child is hidden is not a card. Sections a service
       does not use (the stays-only 3D Tour offer, say) must not show up as
       an empty "Card 2 of 3". Worked out on every render, because the
       same panel serves every service. */
    const shown = () => units.filter(u => Array.from(u.children).some(c => !c.hidden && c.style.display !== 'none'));
    const top = make('div','cc-form-top'), progress=make('span'), toggle=button('See full form','cc-text',()=>{overview=!overview;render();});
    top.append(progress,toggle); root.prepend(top);
    const nav=make('div','cc-form-nav');
    const back=button('← Back','cc-undo',()=>{if(overview){overview=false;at=shown().length-1;}else if(at>0)at--;render(true);});
    const next=button('Proceed →','cc-proceed',()=>{
      const live = shown();
      const invalid = Array.from((live[at]||units[0]).querySelectorAll('input,select,textarea')).find(el=>!el.disabled && !el.checkValidity());
      if(invalid){invalid.reportValidity();invalid.focus();return;}
      if(at < live.length-1) at++; else overview=true;
      render(true);
    }); nav.append(back,next); root.append(nav);
    function render(focus) {
      const live = shown().length ? shown() : units;
      if (at > live.length-1) at = live.length-1;
      units.forEach(u=>u.classList.toggle('cc-concealed',!overview && u!==live[at]));
      actions?.classList.toggle('cc-concealed',!overview);
      root.classList.add('cc-form'); root.classList.toggle('cc-overview',overview);
      progress.textContent=overview?'Review your details':`Card ${at+1} of ${live.length}`;
      toggle.textContent=overview?'One card at a time':'See full form';
      back.disabled=!overview&&at===0; next.hidden=overview; next.textContent=at===live.length-1?'Review details →':'Proceed →';
      if(focus){const target=overview?top:live[at]; target.tabIndex=-1; target.focus({preventScroll:true}); target.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest'});animate(target,[{opacity:.4,transform:'translateY(12px)'},{opacity:1,transform:'none'}]);}
      // Leaflet observes container resizing after a card becomes visible.
      window.dispatchEvent(new Event('resize'));
      root.dispatchEvent(new CustomEvent('cc:form-view',{bubbles:true}));
    }
    const form=root.matches('form')?root:root.closest('form');
    form?.addEventListener('submit', e=>{if(!overview && !root.closest('.panel:not(.on)')){e.preventDefault();e.stopImmediatePropagation();next.click();}},true);
    root.addEventListener('invalid', e=>{const n=shown().findIndex(u=>u.contains(e.target));if(n>=0){at=n;overview=false;render();}},true);
    render(); const api={review:()=>{overview=true;render();},refresh:()=>render()}; root._ccForm=api; return api;
  }

  function selectChoices(id) {
    const select=document.getElementById(id); if(!select || select.dataset.ccChoice) return;
    select.dataset.ccChoice='true';
    const host=make('div'); select.insertAdjacentElement('afterend',host);
    const label=document.querySelector(`label[for="${id}"]`)?.textContent.trim()||'Choose an option';
    const items=Array.from(select.options).filter(o=>o.value).map(o=>({label:o.textContent,value:o.value,selected:()=>select.value===o.value}));
    choice(host,{label,items,snapshot:()=>select.value,restore:v=>{select.value=v;select.dispatchEvent(new Event('change',{bubbles:true}));},set:item=>{select.value=item.value;select.dispatchEvent(new Event('change',{bubbles:true}));}});
    // Keep the native selector available in full-form view and as an accessible alternative.
    select.classList.add('cc-native-select');
  }

  function checkboxChoice(input){
    if(!input || input.dataset.ccChoice)return;
    input.dataset.ccChoice='true';
    const label=input.closest('label'),host=make('div');label.after(host);
    const title=label.querySelector('strong,.cn')?.textContent||label.textContent.trim();
    const detail=label.querySelector('.cd')?.textContent||'Does this apply to your service?';
    choice(host,{label:'One quick detail',multiple:true,items:[{label:title,detail,selected:()=>input.checked}],snapshot:()=>input.checked,restore:v=>{input.checked=v;input.dispatchEvent(new Event('change',{bubbles:true}));},set:(_,value)=>{input.checked=value;input.dispatchEvent(new Event('change',{bubbles:true}));}});
    label.classList.add('cc-native-checkbox');
  }

  function assist() {
    const service=document.body.dataset.listingService||'';
    const host=document.querySelector('.right-panel,.lt-wrap,.le-wrap,.fs-body,main')||document.body;
    const bar=make('aside','cc-assist');
    const copy=make('div'); copy.append(make('strong','','Short on time?'),make('span','','Let Cabana help set up your listing.'));
    const launch=button('Set it up for me ↗','cc-assist-btn',()=>open()); bar.append(copy,launch);host.prepend(bar);
    const dialog=make('dialog','cc-assist-dialog'); dialog.setAttribute('aria-labelledby','cc-assist-title');
    const form=make('form');
    const close=button('Close ×','cc-text',()=>dialog.close());
    const h=make('h2','','A little help, a lot less work.');h.id='cc-assist-title';
    form.append(close,h,make('p','','Tell us how to reach you. The team will contact you to confirm the details and help prepare your listing.'));
    const fields={};
    [['name','Your name','text'],['phone','Phone with country code','tel'],['notes','What are you listing?','textarea']].forEach(([id,label,type])=>{
      const l=make('label','',label);const input=make(type==='textarea'?'textarea':'input');input.id='cc-assist-'+id;input.name=id;l.htmlFor=input.id;if(type!=='textarea')input.type=type;
      input.maxLength=id==='notes'?2000:id==='name'?120:32;input.required=id!=='notes';if(id==='phone')input.placeholder='+254 712 345 678';fields[id]=input;form.append(l,input);
    });
    const consent=make('label','cc-consent');const check=make('input');check.type='checkbox';check.required=true;consent.append(check,document.createTextNode('Cabana may contact me about setting up this listing.'));form.append(consent);
    const status=make('p','cc-assist-status');status.setAttribute('role','status');
    const send=make('button','cc-proceed','Request setup help');send.type='submit';form.append(send,status);dialog.append(form);document.body.append(dialog);
    let pending=false, sent=false, requestId=null;
    function open(){
      if(!sent){
        const state=window.ApaSession?.get?.();
        fields.name.value=fields.name.value||state?.name||'';
        fields.phone.value=fields.phone.value||document.querySelector('#f-wa,#o-phone,#op-phone,#a-phone')?.value||'';
        const title=document.querySelector('#f-title,#t-title,#e-title,#op-name')?.value||'';
        if(!fields.notes.value)fields.notes.value=[document.body.dataset.listingService||service,title].filter(Boolean).join(' — ');
      }
      dialog.showModal();
    }
    dialog.addEventListener('close',()=>launch.focus());
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(pending||sent)return;
      const phone=fields.phone.value.replace(/[\s().-]/g,'');
      if(!/^\+[1-9]\d{7,14}$/.test(phone)){status.textContent='Include your country code, for example +254 712 345 678.';fields.phone.focus();return;}
      if(!fields.name.value.trim()){fields.name.focus();return;}
      const client=window.ApaSession?.client?.();
      if(!client){status.textContent='Connection unavailable. Your details are still here; please try again.';return;}
      pending=true;send.disabled=true;send.textContent='Sending request…';status.textContent='';
      requestId=requestId||crypto.randomUUID();
      try{
        const {error}=await client.from('lazy_requests').insert({id:requestId,name:fields.name.value.trim(),phone,listing_type:document.body.dataset.listingService||service||null,notes:fields.notes.value.trim()||null,status:'pending',source:location.pathname});
        if(error && error.code!=='23505')throw error;
        sent=true;send.textContent='Request received ✓';status.textContent='Your setup request is with Cabana. You can close this and keep working on your listing.';
        Array.from(form.elements).forEach(el=>{if(el!==close)el.disabled=true;});
      }catch(error){send.disabled=false;send.textContent='Try again';status.textContent='We could not confirm your request. Your details are kept here. Retry to check the same request.';}
      finally{pending=false;}
    });
  }
  window.CabanaListingCards={choice,focusForm,selectChoices,checkboxChoice,assist,make,say};
})();
