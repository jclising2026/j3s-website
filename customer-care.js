(function(){
  'use strict';
  const branches=()=>window.CURRENT?.branches||window.CONTENT?.branches||[];
  const byId=id=>document.getElementById(id);
  const origin=b=>{try{return new URL(b.order).origin;}catch(_){return '';}};
  let priceRequest=0;
  function options(select,placeholder){
    const previous=select.value;select.replaceChildren(new Option(placeholder,''));
    branches().forEach(b=>{if(origin(b))select.add(new Option(b.name,origin(b)));});
    if(Array.from(select.options).some(o=>o.value===previous))select.value=previous;
  }
  function applySearch(){
    const query=byId('branchSearch').value.trim().toLowerCase();let count=0;
    document.querySelectorAll('#branchGrid .branch').forEach(card=>{
      const b=branches()[Number(card.dataset.i)];
      const service=window.SVC_FILTER||'all';
      const match=b && (service==='all'||(b.services||[]).includes(service)) && [b.name,b.area,b.address].join(' ').toLowerCase().includes(query);
      card.hidden=!match;if(match)count++;
    });
    byId('branchSearchStatus').textContent=count?count+' branches match. Choose the team nearest you.':'No matching branches. Try another area or choose All branches.';
  }
  function updateTracking(){
    const value=byId('trackBranch').value;const link=byId('trackOrderLink');
    link.href=value?value+'/track':'#branches';link.dataset.branchOrigin=value;
  }
  async function loadPrices(){
    const request=++priceRequest;const base=byId('priceBranch').value;
    const rows=byId('priceRows');rows.replaceChildren();
    const status=byId('livePriceStatus');
    if(!base){status.textContent='Choose your branch to load its current ordering prices.';return;}
    status.textContent='Loading current branch prices…';
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
      let r;try{r=await fetch(base+'/api/public/order',{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}
      if(!r.ok)throw Error('unavailable');const d=await r.json();if(request!==priceRequest)return;
      const cfg=d.branch||{};let shown=0;
      (d.products||[]).forEach(p=>{
        if(p.category==='ice' && (!cfg.has_ice || !/\b(20|5|3|1)\s*kilo|bondat|^Mr Freeze Tube ICE$/i.test(p.name)))return;
        if(p.category==='wrs'&&!cfg.has_wrs)return;
        if(p.category==='laundry'&&!cfg.has_laundry)return;
        const chain={ice:['ice_delivered_retail','ice_walkin'],wrs:['wrs_delivered','wrs_dropoff','wrs_walkin'],laundry:['laundry_pickup','laundry_per_load','laundry_walkin']}[p.category];
        if(!chain)return;const key=chain.find(k=>p.prices&&p.prices[k]!=null);if(!key)return;
        const tr=document.createElement('tr');
        const name=p.name==='Mr Freeze Tube ICE'?'Mr Freeze 45 kilos (sack included)':p.name;
        const service=p.category==='ice'&&/^Mr Freeze/i.test(p.name)?'Mr Freeze Ice':{ice:'J3S Ice',wrs:'Water',laundry:'Laundry'}[p.category];
        [name,service,new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(p.prices[key])].forEach((value,index)=>{const td=document.createElement('td');td.textContent=value;if(index===2)td.className='amt';tr.append(td);});
        rows.append(tr);shown++;
      });
      status.textContent=shown?'Current regular ordering prices. Your branch confirms availability and the final total.':'Ask this branch to confirm the current price for your order.';
      const link=document.createElement('a');link.href=base+'/order';link.textContent=' Order from this branch →';link.dataset.careEvent='order_click';link.dataset.branchOrigin=base;status.append(link);
    }catch(_){if(request===priceRequest){status.textContent='Live prices are temporarily unavailable. ';const link=document.createElement('a');link.href=base+'/order';link.textContent='Open your branch to check prices or contact the team.';status.append(link);}}
  }
  function setup(){options(byId('priceBranch'),'Select your branch');options(byId('trackBranch'),'Select the branch you ordered from');applySearch();updateTracking();loadPrices();}
  byId('branchSearch').addEventListener('input',applySearch);
  byId('priceBranch').addEventListener('change',loadPrices);
  byId('trackBranch').addEventListener('change',updateTracking);
  const originalFilter=window.applySvcFilter;
  window.applySvcFilter=function(){originalFilter();applySearch();};
  const originalRender=window.renderSite;
  window.renderSite=function(content){originalRender(content);setup();};
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-care-event="order_click"]');if(!link)return;
    const service={water:'wrs',ice:'ice',laundry:'laundry'}[window.SVC_FILTER];
    if(service){const url=new URL(link.href);url.searchParams.set('service',service);link.href=url.href;}
  },true);
  function receiptPanel(){let panel=byId('feedbackReceipt');if(!panel){panel=document.createElement('div');panel.id='feedbackReceipt';panel.className='care-receipt';byId('fbForm').before(panel);}return panel;}
  window.showFeedbackReceipt=function(data,base){
    const url=new URL(location.href);url.searchParams.set('feedback_ref',data.tracking_token);url.searchParams.set('branch',base);url.hash='feedback';
    const panel=receiptPanel();panel.replaceChildren();
    const heading=document.createElement('h3');heading.textContent='Saved: '+data.reference;panel.append(heading);
    const text=document.createElement('p');text.textContent='Keep this private status link. It shows whether your message is new, being handled, or resolved.';panel.append(text);
    const link=document.createElement('a');link.href=url.href;link.textContent='Check this feedback’s status';panel.append(link);
    history.replaceState(null,'',url.href);
  };
  async function loadReceipt(){
    const params=new URLSearchParams(location.search),token=params.get('feedback_ref'),base=params.get('branch');
    if(!token||!branches().some(b=>origin(b)===base))return;
    const panel=receiptPanel();panel.textContent='Checking feedback status…';
    try{const r=await fetch(base+'/api/public/feedback-status?token='+encodeURIComponent(token),{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error('Reference unavailable');
      panel.replaceChildren();const h=document.createElement('h3');h.textContent=d.reference+' — '+({new:'Received',read:'Being handled',resolved:'Resolved'}[d.status]||d.status);panel.append(h);
      const p=document.createElement('p');p.textContent='This is the status recorded by your branch. Contact that branch if you need more help.';panel.append(p);
    }catch(_){panel.textContent='We could not load this reference. Keep your link and try again, or contact your branch.';}
  }
  setup();loadReceipt();
  const footer=document.querySelector('footer');if(footer){const note=document.createElement('p');note.className='care-privacy wrap';note.textContent='We count anonymous browsing sessions to improve customer service. Form contents are not included in these counts. Browser Do Not Track and Global Privacy Control are respected.';footer.append(note);}
})();
