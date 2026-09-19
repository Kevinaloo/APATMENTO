(function () {
  'use strict';
  const C=window.CabanaListingCards;if(!C)return;
  const path=location.pathname.replace(/\.html$/,'');
  const services={'/list-your-tour':'tours','/list-your-event':'events','/list-your-fleet':'carhire','/become-driver':'rides'};
  document.body.dataset.listingService=services[path]||'';
  function children(root, exclude){return Array.from(root.children).filter(el=>!el.matches(exclude));}
  function group(root, nodes, size=1){
    const units=[];
    for(let i=0;i<nodes.length;i+=size){const unit=C.make('div','cc-unit');nodes[i].before(unit);nodes.slice(i,i+size).forEach(n=>unit.append(n));units.push(unit);}
    return units;
  }
  if(path==='/add-listing'){
    document.body.classList.add('cc-listing');
    const wm=document.querySelector('.tb-wordmark');if(wm)wm.textContent='cabana';
    const header=document.querySelector('#step-0 .step-title');if(header)header.textContent='What will you bring to Cabana?';
    const sub=document.querySelector('#step-0 .step-sub');if(sub)sub.textContent='Find your service. Make it yours. One card at a time.';
    const defaults=JSON.parse(JSON.stringify(F)), drafts=new Map();
    function copyState(){const result=JSON.parse(JSON.stringify({...F,photoFiles:[]}));result.photoFiles=[...F.photoFiles];return result;}
    const oldSelect=window.selSvc;
    window.selSvc=function(el){
      if(F.svc===el.dataset.svc)return;
      if(F.svc){collect(cur);drafts.set(F.svc,copyState());}
      const next=el.dataset.svc;
      oldSelect(el);
      Object.assign(F,drafts.get(next)||JSON.parse(JSON.stringify(defaults)),{svc:next});
      // Shared DOM fields must not carry data from a different service.
      document.querySelectorAll('.step-card input:not([type=file]),.step-card textarea,.step-card select').forEach(input=>{
        if(input.tagName==='SELECT'){Array.from(input.options).forEach(o=>o.selected=o.defaultSelected);if(input.selectedIndex<0)input.selectedIndex=0;}
        else input.value=input.defaultValue;
      });
      for(const [id,key] of [['f-desc','desc'],['f-rules','rules'],['f-in','ci'],['f-out','co']]){const input=document.getElementById(id);if(input)input.value=F[key];}
      for(const key of ['inst','ch','pets','smk'])document.getElementById('tog-'+key)?.classList.toggle('on',F[key]);
      document.body.dataset.listingService=next;
    };
    const svcGrid=document.querySelector('.svc-grid');
    const serviceHost=C.make('div');svcGrid.after(serviceHost);svcGrid.classList.add('cc-concealed');
    const serviceNodes=Array.from(svcGrid.children);
    C.choice(serviceHost,{label:'Choose your service',items:serviceNodes.map(el=>({label:el.querySelector('.svc-name').textContent,detail:el.querySelector('.svc-desc').textContent,icon:el.querySelector('.svc-icon svg'),el,selected:()=>F.svc===el.dataset.svc})),snapshot:()=>F.svc,restore:svc=>{if(svc){const el=serviceNodes.find(n=>n.dataset.svc===svc);if(el)selSvc(el);}},set:item=>selSvc(item.el),advance:()=>goFromSvc()});
    const oldGo=window.go;
    window.go=function(n){
      if(F.svc && cur!==n)collect(cur); // Includes backward navigation, before dynamic controls are rebuilt.
      oldGo(n); enhance(n);
    };
    function enhance(n){
      document.body.dataset.listingService=F.svc||'';
      const panel=document.getElementById('step-'+n);panel.classList.remove('cc-entry');void panel.offsetWidth;panel.classList.add('cc-entry');
      if(n===1){
        panel.querySelector('.cc-type-host')?.remove();
        const original=document.getElementById('type-grid');original.classList.add('cc-concealed');
        const host=C.make('div','cc-type-host');original.after(host);
        C.choice(host,{label:'Find the right type',items:SVCS[F.svc].types.map(t=>({label:t.n,detail:t.d||SVCS[F.svc].s1s,value:t.n,selected:()=>F.type===t.n})),snapshot:()=>F.type,restore:v=>{F.type=v;},set:item=>{const el=Array.from(original.children).find(el=>el.dataset.t===item.value);selType(el);},advance:()=>nxt(1)});
      }else if(n===4){
        panel.querySelector('.cc-features-host')?.remove();
        const grid=document.getElementById('feat-grid');grid.classList.add('cc-concealed');
        const host=C.make('div','cc-features-host');grid.after(host);
        C.choice(host,{label:`${SVCS[F.svc].lbl} · features`,multiple:true,items:SVCS[F.svc].feats.map(f=>({label:f,detail:'Is this available with your listing?',value:f,selected:()=>F.feats.includes(f)})),snapshot:()=>[...F.feats],restore:v=>{F.feats=v;},set:(item,yes)=>{F.feats=F.feats.filter(f=>f!==item.value);if(yes)F.feats.push(item.value);}});
      }else if(n===7){
        // Ownership reveals dependent panels immediately. Keep the choice,
        // partners and payout consent together on one explicit form card.
        panel.classList.add('cc-form');
      }else if(n>1 && n<7 && !panel.dataset.ccFocus){
        const nodes=children(panel,'.step-header,.step-nav');
        C.focusForm(panel,group(panel,nodes),panel.querySelector('.step-nav'));
      }else if(n>1 && n<7){
        // The service may have changed since this panel was carded.
        panel._ccForm?.refresh();
      }
      const title=panel.querySelector('h1');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
    }
    enhance(cur);
  }else if(path==='/list-your-tour'||path==='/list-your-event'){
    document.querySelectorAll('form.lt-f,form.le-f').forEach(form=>{
      const actions=form.querySelector('.lt-acts,.le-acts');
      // Keep adjacent explanations with their field, instead of empty cards.
      const units=[];
      children(form,'.lt-acts,.le-acts').forEach(node=>{
        if(node.matches('p,.lt-note,.le-note')&&units.length)units[units.length-1].append(node);
        else {const unit=C.make('div','cc-unit');node.before(unit);unit.append(node);units.push(unit);}
      });
      C.focusForm(form,units,actions);
    });
    if(path==='/list-your-tour'){C.selectChoices('t-category');C.selectChoices('t-schedule');}
    else C.selectChoices('e-category');
  }else if(path==='/list-your-fleet'){
    document.querySelectorAll('#fleet-form .panel').forEach(panel=>{
      const grid=panel.querySelector('.grid');
      // Country and city are dependent; show the country first in the same card.
      if(panel.dataset.panel==='1'){
        const country=document.getElementById('op-country').closest('.field'),city=document.getElementById('op-city').closest('.field');
        city.before(country);
      }
      // Each original grid is a coherent service-specific card. This retains
      // dependent selectors, engineering constraints and explicit final consent.
      const fields=Array.from(grid.children), units=[];
      for(let i=0;i<fields.length;){
        const unit=C.make('div','cc-unit');grid.before(unit);
        const isName=fields[i].querySelector('#op-name');
        const count=isName||fields[i].matches('.wide')?1:2;
        const inner=C.make('div','grid');unit.append(inner);fields.slice(i,i+count).forEach(n=>inner.append(n));i+=count;units.push(unit);
      }
      grid.remove();
      C.focusForm(panel,units,panel.querySelector('.foot'));
    });
    C.selectChoices('v-class');C.selectChoices('v-trans');C.selectChoices('v-drive');
  }else if(path==='/become-driver'){
    // Driver identity / vehicle / payout panels have independent validation.
    document.querySelectorAll('.fs-step:not(#s4)').forEach(panel=>{
      const nodes=Array.from(panel.children), units=[];let current=null;
      nodes.forEach(node=>{
        if(node.matches('.fl,.f2,.chk')){current=C.make('div','cc-unit');node.before(current);units.push(current);}
        if(!current){current=C.make('div','cc-unit');node.before(current);units.push(current);}
        current.append(node);
      });
      C.focusForm(panel,units,null);
    });
    C.selectChoices('a-psv');
    const foot=document.getElementById('fs-foot');
    function syncFoot(){const panel=document.querySelector('.fs-step.on');foot.classList.toggle('cc-concealed',!!panel?.matches('.cc-form:not(.cc-overview)'));}
    document.addEventListener('cc:form-view',syncFoot);
    document.querySelectorAll('.fs-step').forEach(panel=>new MutationObserver(syncFoot).observe(panel,{attributes:true,attributeFilter:['class']}));
    syncFoot();
  }
  // Declarations, ownership, payments and consent are deliberately explicit.
  document.querySelectorAll('input[data-doc],#v-aircon,#v-border').forEach(C.checkboxChoice);
  C.assist();
})();
