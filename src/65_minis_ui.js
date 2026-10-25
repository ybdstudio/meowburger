/* =====================================================================
   65_minis_ui.js — v4.4 Minis UI: loading bar, side gift buttons,
   Add-to-Home / Revisit Gift / Share Gift popups, ad chips, ad triggers
   Art comes from MX_ART (data URIs injected by build.py from assets/minis/).
   ===================================================================== */
const MX_ICON={
  share:'<svg viewBox="0 0 24 24"><g fill="#4a90e2" stroke="#1d3f7a" stroke-width="1.6"><circle cx="18" cy="5.5" r="3.4"/><circle cx="6" cy="12" r="3.4"/><circle cx="18" cy="18.5" r="3.4"/></g><path d="M8.8 10.4l6.4-3.4M8.8 13.6l6.4 3.4" stroke="#1d3f7a" stroke-width="2.4" stroke-linecap="round"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>',
  paw:'<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><circle cx="5.6" cy="10" r="2.3"/><circle cx="9.4" cy="6" r="2.3"/><circle cx="14.6" cy="6" r="2.3"/><circle cx="18.4" cy="10" r="2.3"/></svg>',
};
Object.assign(UI,{
  _lp:0, _mxT:0, _taskSeen:-1, _shortSince:0, _tipUntil:0, _tipCdUntil:0, _rvCan:false,
  /* ---------- loading bar (monotonic, eased by CSS) ---------- */
  loading(p,txt){ p=Math.max(UI._lp,Math.min(1,p)); UI._lp=p; const l=$('loading'); if(!l) return;
    l.style.setProperty('--p',p.toFixed(3)); const t=$('loadTxt'); if(t) t.textContent=(txt||'Loading…')+' '+Math.round(p*100)+'%'; },
  /* ---------- safe area + TikTok capsule ---------- */
  applyInsets(){ const r=PF.insets(), w=$('wrap');
    w.style.setProperty('--sat',r.top?r.top+'px':'env(safe-area-inset-top,0px)');
    w.style.setProperty('--sab',r.bottom?r.bottom+'px':'env(safe-area-inset-bottom,0px)');
    w.style.setProperty('--capw',r.capW+'px'); w.style.setProperty('--capb',(r.capB||0)+'px');
    w.classList.toggle('has-cap',r.capW>0); const c=$('mockCap'); if(c) c.hidden=!(PF.mock.capsule&&!PF.isMinis); },
  /* ---------- side buttons ---------- */
  initMinis(){
    $('sbRevisit').querySelector('img').src=MX_ART.btn_revisit; $('sbShare').querySelector('img').src=MX_ART.btn_share; $('sbHome').querySelector('img').src=MX_ART.btn_home;
    $('sbRevisit').onclick=()=>UI.openRevisit(); $('sbShare').onclick=()=>UI.openShare(); $('sbHome').onclick=()=>UI.openHome();
    $('tipChip').onclick=()=>UI.watchOffer(); $('tipChip').querySelector('i').innerHTML=UI_ICON.ad;
    $('bagChip').onclick=()=>UI.watchPad(); $('bagChip').querySelector('i').innerHTML=UI_ICON.ad;
    UI.applyInsets(); window.addEventListener('resize',UI.applyInsets);
  },
  afterBoot(){ UI.applyInsets(); UI.refreshRevisit(true); },
  onShow(){ UI.applyInsets(); UI.refreshRevisit(true); },
  giftsOn(){ return S.task>=taskIndex(CFG.gifts.showAfter); },
  revisitClaimed(){ return S.mx.rvDay===dayKey(); },
  shareClaimed(){ return S.mx.shDay===dayKey(); },
  homeDone(){ return !!S.mx.home; },
  refreshRevisit(autoOpen){ if(!PF.canRevisit()) return; PF.revisitReward().then(can=>{ UI._rvCan=can;
      if(UI._rvPopup) UI.openRevisit(); // re-render with the new claim state
      else if(autoOpen&&!DEBUG.noModal&&can&&!UI.revisitClaimed()&&UI.giftsOn()&&!UI.modalOpen) setTimeout(()=>{if(!UI.modalOpen)UI.openRevisit()},1200); }); },
  minisFrame(){
    const on=UI.giftsOn(), L=UI._last;
    const vis=[true, true, true].join();   /* the 3 TikTok gift buttons are on screen from the first frame after loading */
    if(L.sb!==vis){ const v=vis.split(','); $('sbRevisit').hidden=v[0]!=='true'; $('sbShare').hidden=v[1]!=='true'; $('sbHome').hidden=v[2]!=='true'; L.sb=vis; }
    const bd=[!UI.revisitClaimed(),!UI.shareClaimed()].join();
    if(L.bd!==bd){ const v=bd.split(','); $('sbRevisit').classList.toggle('badge',v[0]==='true'); $('sbShare').classList.toggle('badge',v[1]==='true'); L.bd=bd; }
    // reward chip (x2 Task Bonus / VIP tip x2 / Grand Opening): one at a time, auto-hides
    UI.padTick(); UI.interTick();
    if(UI._offer&&(UI.modalOpen||Ads.busy)) UI._offer.until=Math.max(UI._offer.until,Date.now()+UI._offer.secs*1000);
    const o=UI._offer, oOn=!!o&&Date.now()<o.until&&!Ads.busy&&!UI.modalOpen;
    if($('tipChip').hidden===oOn) $('tipChip').hidden=!oOn;
    if(oOn&&L.offer!==o.text){ $('tipChip').querySelector('b').textContent=o.text; $('tipChip').classList.remove('pop'); void $('tipChip').offsetWidth; $('tipChip').classList.add('pop'); L.offer=o.text; }
    // one-time Add-to-Home invitation after the renovation, never during a modal
    if(!DEBUG.noModal&&!S.mx.homeAsked&&!UI.modalOpen&&!Ads.busy&&PF.canShortcut()&&!UI.homeDone()&&S.task>taskIndex('t_renovate')&&taskDoneT<=0){ S.mx.homeAsked=1; save(); setTimeout(()=>{if(!UI.modalOpen)UI.openHome()},800); }
  },
  /* ---------- rewards ---------- */
  grant(a,label){ a=Number(a); if(!(a>0)) return; S.money+=a; for(let i=0;i<Math.min(8,Math.ceil(a/20));i++) setTimeout(()=>fly('coinHud',[player.x,player.y,1.4],null,.5),i*60);
    UI.bump(); UI.toast(label+' +'+fmtNum(a)); sfx('coin'); PF.vibrate(); save(); },
  /* ---------- rewarded offers shown on the chip above the task card ---------- */
  _cd:{},
  ready(key){ return Date.now()>=(UI._cd[key]||0); },
  offer(key,text,secs,onReward,cd){ if(!UI.ready(key)||!UI.giftsOn()) return; UI._offer={key,text,secs,until:Date.now()+secs*1000,onReward,cd}; UI._last.offer=null; },
  watchOffer(){ const o=UI._offer; if(!o||Ads.busy) return; UI._offer=null; $('tipChip').hidden=true;
    Ads.rewarded(o.key,()=>{ UI._cd[o.key]=Date.now()+(o.cd||0)*1000; o.onReward(); }); },
  /* Double Task Bonus: right after a task pays coins -> the same reward again */
  offerTip(r){ const c=CFG.ads.doubleTask; if(r<c.min) return; r=Math.min(r,c.max);
    UI.offer('double_task','×2 task bonus +'+r,c.show,()=>UI.grant(r,'Double task bonus'),c.cd); },
  /* VIP tip x2: after a VIP customer pays -> that bill again */
  offerVip(amt){ const c=CFG.ads.vipTip; if(!amt) return; UI.offer('vip_tip','VIP tip ×2 +'+amt,c.show,()=>UI.grant(amt,'VIP tip ×2'),c.cd); },
  /* Grand Opening: after each new restaurant stage opens, and after the grand opening event */
  offerOpening(){ const c=CFG.ads.grandOpening; UI.offer('grand_opening','Grand opening +'+c.reward,c.show,()=>UI.grant(c.reward,'Grand opening'),0); },
  /* Buying Pad (coin bag): the shortfall for the current purchase task, max 50% of its price */
  padAmount(){ const t=curTask(); if(t.kind!=='buy') return null; const sp=spotById(t.spot); if(!sp||S.bought[sp.id]||!spotVisible(sp)) return null;
    const rest=sp.cost-(sp.paid||0), short=rest-S.money; if(short<=0) return null;
    return {label:sp.label, amount:Math.min(Math.ceil(short/10)*10, Math.max(10,Math.round(sp.cost*CFG.ads.buyingPad.maxShare/10)*10))}; },
  watchPad(){ const p=UI.padAmount(); if(!p||Ads.busy||!UI.ready('buying_pad')) return;
    Ads.rewarded('buying_pad',()=>{ UI._cd.buying_pad=Date.now()+CFG.ads.buyingPad.cd*1000; UI._padSince=0; UI.grant(p.amount,'Coin bag'); }); },
  padTick(){ const p=UI.padAmount(), n=Date.now(), L=UI._last;
    if(!p) UI._padSince=0; else if(!UI._padSince) UI._padSince=n;
    const on=!!p&&UI._padSince&&n-UI._padSince>CFG.ads.buyingPad.stuck*1000&&UI.ready('buying_pad')&&!Ads.busy&&UI.giftsOn();
    if($('bagChip').hidden===on) $('bagChip').hidden=!on;
    if(on){ const t='+'+p.amount; if(L.bag!==t){ $('bagChip').querySelector('b').textContent=t; L.bag=t; } } },
  /* Oven Break: checked every frame, fires every CFG.ads.inter.every s of play */
  interTick(){ if(Ads.canInter()) Ads.interstitial('timer'); },
  onTaskAdvance(){},
  onStageUp(){ UI.offerOpening(); },
  /* ---------- popup shell (mockup style: pink header, cream card, red × ) ---------- */
  popup(icon,title,body,onClose){ UI.modalOpen=true; joy.active=false;
    $('modalRoot').innerHTML=`<div class="modal mx-modal" id="modalBg"><div class="mx-card" role="dialog" aria-label="${title}">
      <div class="mx-head"><img alt="" src="${icon}"><h2>${title}</h2><button class="mx-x" id="mxClose" aria-label="Close">${MX_ICON.x}</button></div>
      <div class="mx-body">${body}${PF.isMinis?'':'<p class="mx-test">Test mode: TikTok screens are simulated</p>'}</div></div></div>`;
    const close=()=>{UI._rvPopup=false;UI.close();onClose&&onClose()};
    $('mxClose').onclick=close; $('modalBg').onclick=e=>{if(e.target.id==='modalBg')close()}; },
  /* ---- Add to Phone Screen ---- */
  openHome(){ const amt=CFG.gifts.home, paid=UI.homeDone();
    UI.popup(MX_ART.btn_home,'Launch Reward',`<p class="mx-sub">Add Meow Sakura to your phone screen for quick access!</p>
      <img class="mx-art" alt="" src="${MX_ART.pop_home_art}">
      ${PF.isMinis?'':`<img class="mx-art mx-steps" alt="1. Tap the share button. 2. Select Add to Home Screen." src="${MX_ART.pop_home_steps}">`}
      ${paid?'':`<div class="mx-pill">${UI_ICON.coin}<b>+${amt}</b><small>first time bonus</small></div>`}
      <button class="mx-btn" id="mxGo">Add Now</button>`);
    $('mxGo').onclick=async()=>{ const b=$('mxGo'); b.disabled=true; const r=await PF.addHome();
      if(!r.ok){ b.disabled=false; UI.toast('Not added — you can try again any time'); return; }
      const can=await PF.shortcutReward(); UI.close();
      if(can&&!UI.homeDone()){ S.mx.home=1; UI.grant(amt,'Home screen bonus'); } else { S.mx.home=S.mx.home||'added'; save(); UI.toast('Meow Sakura is on your phone screen!'); } }; },
  /* ---- Revisit Gift ---- */
  openRevisit(){ const amt=CFG.gifts.revisit, claimed=UI.revisitClaimed(), can=UI._rvCan&&!claimed;
    UI._rvPopup=true;
    UI.popup(MX_ART.btn_revisit,'Entry Reward',`<ol class="mx-steps-list">
      <li><span class="mx-n">1</span><p>Tap the button below.</p></li></ol>
      <button class="mx-btn" id="mxGo" ${claimed?'disabled':''}>Go</button>
      <ol class="mx-steps-list" start="2"><li><span class="mx-n">2</span><p>Come back to Meow Sakura from your TikTok profile.</p></li></ol>
      <img class="mx-art" alt="Find us under Profile, Recently played" src="${MX_ART.pop_revisit_profile}">
      <ol class="mx-steps-list" start="3"><li><span class="mx-n">3</span><p>Claim rewards.</p></li></ol>
      <div class="mx-coins"><img alt="" src="${MX_ART.pop_revisit_coins}"><b>+${amt}</b></div>
      <p class="mx-note">${claimed?'Gift claimed — come back tomorrow for another gift.':'Come back tomorrow for another gift.'}</p>
      <button class="mx-btn" id="mxClaim" ${can?'':'disabled'}>${claimed?'Claimed ✓':'Claim'}</button>`);
    $('mxGo').onclick=async()=>{ const r=await PF.startRevisit(); if(!r.ok){UI.toast('Could not open your profile');return}
      if(!PF.isMinis){ UI.toast('Welcome back from your Profile!'); UI.refreshRevisit(false); } };
    $('mxClaim').onclick=async()=>{ if(UI.revisitClaimed()) return; $('mxClaim').disabled=true; const ok=await PF.revisitReward();
      if(!ok){ UI.toast('Open Meow Sakura from Profile › Recently played first'); UI.openRevisit(); return; }
      S.mx.rvDay=dayKey(); PF._mockRevisit=false; UI._rvPopup=false; UI.close(); UI.grant(amt,'Revisit gift'); }; },
  /* ---- Share Gift ---- */
  openShare(){ const amt=CFG.gifts.share, claimed=UI.shareClaimed();
    UI.popup(MX_ART.btn_share,'Share Game',`<p class="mx-sub">Share Meow Sakura with friends and get a reward!</p>
      <img class="mx-art" alt="" src="${MX_ART.pop_share_art}">
      <div class="mx-pill">${UI_ICON.coin}<b>${claimed?'Claimed today':'+'+amt}</b>${claimed?'<small>new gift tomorrow</small>':''}</div>
      <button class="mx-btn" id="mxGo"><i>${MX_ICON.share}</i>${claimed?'Share again':'Share Now'}</button>`);
    $('mxGo').onclick=async()=>{ const b=$('mxGo'); b.disabled=true; const r=await PF.share(); b.disabled=false;
      if(!r.ok){ UI.toast('Share cancelled'); return; }
      UI.close(); if(!UI.shareClaimed()){ S.mx.shDay=dayKey(); UI.grant(amt,'Share gift'); } else UI.toast('Thanks for sharing!'); }; },
  /* ---------- test tools (web only) ---------- */
  adLog(){ const L=Ads.log.slice(-4).reverse(); return L.length?'Last ads: '+L.map(a=>a.placement+' → '+(a.res.ended?'reward':a.res.error?'error '+a.res.error:'closed early')).join(' · '):'No ads shown yet.'; },
  testTool(x,btn){ const m=PF.mock;
    if(x==='days'){S.mx.rvDay='';S.mx.shDay='';PF._mockRevisit=false;UI._rvCan=false;save();UI.toast('Daily gifts reset')}
    if(x==='home'){S.mx.home=0;S.mx.homeAsked=0;save();UI.toast('Add-to-Home reset')}
    if(x==='fail'){m.adFailNext=true;UI.toast('Next ad will fail (no fill)')}
    if(x==='quit'){m.adQuitNext=true;UI.toast('Next ad will be closed early')}
    if(x==='cap'){m.capsule=!m.capsule;btn.textContent='TikTok capsule: '+(m.capsule?'ON':'OFF');UI.applyInsets()}
    if(x==='inter'){UI.close();Ads.lastInterPlay=-1e9;Ads.lastRewardAt=-1e9;const c=CFG.ads.inter,k=c.afterTask;c.afterTask='t_register';Ads.interstitial('test');c.afterTask=k;return}
    if(x==='money'){S.money+=500;save()}
    UI._last={}; },
});
/* wrap the per-frame HUD update and init with the Minis parts */
{ const f=UI.frame, i=UI.init, c=UI.close; UI.frame=function(){f.call(UI); UI.minisFrame();}; UI.init=function(){i.call(UI); UI.initMinis();}; UI.close=function(){UI._rvPopup=false; c.call(UI);}; }
