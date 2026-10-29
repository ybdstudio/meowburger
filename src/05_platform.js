/* =====================================================================
   05_platform.js — TikTok Minis platform layer (v4.4)
   Everything that talks to the host goes through PF so the native port only
   has to touch this file. Inside TikTok it uses TTMinis.game (tt / wx are the
   same object on the native runtime); in a normal browser or the Claude
   artifact it falls back to a MOCK that simulates ads / share / shortcut /
   revisit so the whole flow can be tested.
   Known native-port issues handled here:
     1. localStorage is not guaranteed      -> PF.store (getStorageSync / setStorageSync, then localStorage, then memory)
     2. visibilitychange does not fire      -> PF.onHide / PF.onShow (TTMinis.game.onHide / onShow + DOM fallback)
     3. window 'error' is not delivered     -> PF.onError (TTMinis.game.onError + window fallback)
     4. env(safe-area-inset-*) is 0 and the TikTok capsule (… ×) covers the top-right
                                            -> PF.insets() from getWindowInfo().safeArea + getMenuButtonBoundingClientRect
     5. new Image() may not exist           -> PF.createImage()
     6. Intl / toLocaleString can be missing on old JS cores -> fmtNum()
     7. ad instances: reuse one instance, register listeners once, handle onError,
        isEnded=false, error 11003 (instance spent) -> recreate, 30001 (too frequent)
     8. audio is suspended after an ad / backgrounding -> PF emits 'pause'/'resume', main resumes the AudioContext
   ===================================================================== */
const PF=(()=>{
  const mem={};
  const sdk=()=>{ try{ if(typeof __TTF!=='undefined'&&__TTF) return __TTF; }catch(_){} /* native build: merged TTMinis.game / tt facade */
                  try{ if(typeof TTMinis!=='undefined'&&TTMinis&&TTMinis.game) return TTMinis.game; }catch(_){}
                  try{ if(typeof tt!=='undefined'&&tt&&typeof tt.getStorageSync==='function') return tt; }catch(_){} return null; };
  const has=name=>{const T=sdk();if(!T)return false;try{if(typeof T.canIUse==='function'){const r=T.canIUse(name);if(r===false)return false}}catch(_){}return typeof T[name]==='function'};
  const listeners={pause:[],resume:[],hide:[],show:[]};
  const emit=(k,a)=>listeners[k].forEach(f=>{try{f(a)}catch(e){console.error(e)}});
  const pf={
    sdk, has, get isMinis(){return !!sdk()}, get mode(){return sdk()?'tiktok':'mock'},
    mock:{adFailNext:false,adQuitNext:false,capsule:false},
    on(k,f){listeners[k].push(f)}, emit,
    /* ---- storage ---- */
    store:{
      get(k){ const T=sdk();
        if(T&&T.getStorageSync){ try{const v=T.getStorageSync(k); if(v!==undefined&&v!==null&&v!=='') return typeof v==='string'?v:JSON.stringify(v);}catch(_){} }
        try{const v=window.localStorage&&localStorage.getItem(k); if(v!=null) return v;}catch(_){}
        return k in mem?mem[k]:null; },
      set(k,v){ mem[k]=v; let ok=false; const T=sdk();
        if(T&&T.setStorageSync){ try{T.setStorageSync(k,v);ok=true}catch(_){} }
        try{ if(window.localStorage){localStorage.setItem(k,v);ok=true} }catch(_){}
        return ok; },
      remove(k){ delete mem[k]; const T=sdk(); try{T&&T.removeStorageSync&&T.removeStorageSync(k)}catch(_){} try{window.localStorage&&localStorage.removeItem(k)}catch(_){} }
    },
    /* ---- lifecycle ---- */
    initLifecycle(){
      const T=sdk(); let hidden=false;
      const hide=()=>{if(hidden)return;hidden=true;emit('hide')}, show=o=>{if(!hidden)return;hidden=false;emit('show',o)};
      if(T&&T.onHide){ try{T.onHide(hide);T.onShow(show)}catch(_){} }
      document.addEventListener('visibilitychange',()=>{document.hidden?hide():show()});
      window.addEventListener('pagehide',hide);
    },
    onError(f){ const T=sdk(); if(T&&T.onError){ try{T.onError(e=>f(String(e&&(e.message||e.errMsg)||e)))}catch(_){} } },
    launchQuery(){ const T=sdk(); try{ if(T&&T.getLaunchOptionsSync){const o=T.getLaunchOptionsSync()||{};return Object.assign({scene:o.scene},o.query||{})} }catch(_){}
      try{ const q={}; new URLSearchParams(location.search).forEach((v,k)=>q[k]=v); return q; }catch(_){return {}} },
    /* ---- screen: safe area + TikTok capsule ---- */
    insets(){ const T=sdk(); const r={top:0,bottom:0,capW:0,capB:0};
      try{ let wi=null; for(const f of ['getWindowInfo','getSystemInfoSync']){ try{ const r=T&&typeof T[f]==='function'&&T[f](); if(r&&typeof r.windowWidth==='number'){wi=r;break} }catch(_){} }
        if(wi&&wi.safeArea){ r.top=Math.max(0,wi.safeArea.top||0); r.bottom=Math.max(0,(wi.screenHeight||wi.windowHeight||0)-(wi.safeArea.bottom||0)); }
        if(T&&T.getMenuButtonBoundingClientRect){ const m=T.getMenuButtonBoundingClientRect(); const ww=(wi&&wi.windowWidth)||window.innerWidth;
          if(m&&typeof m.left==='number'&&typeof m.bottom==='number'&&m.width>0){ r.capW=Math.max(0,ww-m.left+6); r.capB=m.bottom+4; } } }catch(_){}
      /* runtime without getMenuButtonBoundingClientRect (seen on TikTok iOS native): keep the usual capsule area free */
      if(T&&!r.capW){ r.capW=104; r.capB=Math.max(r.top,20)+44; }
      if(!T&&pf.mock.capsule){ r.capW=100; r.capB=44; }
      return r; },
    createImage(){ const T=sdk(); if(T&&T.createImage) try{return T.createImage()}catch(_){} return new Image(); },
    vibrate(){ const T=sdk(); try{ if(T&&T.vibrateShort) T.vibrateShort({type:'light'}); else if(navigator.vibrate) navigator.vibrate(12);}catch(_){} },
    /* ---- user engagement: shortcut / revisit / share ----
       each returns a Promise<{ok:boolean, reward?:boolean, err?:string}> */
    canShortcut(){ return sdk()?has('addShortcut'):true; },
    addHome(){ const T=sdk();
      if(!T) return mockStep('Add to Home Screen','The phone asks “Add Meow Sakura to Home Screen?”',true);
      return new Promise(res=>{ try{ T.addShortcut({success:()=>res({ok:true}),fail:e=>res({ok:false,err:(e&&(e.error_msg||e.errMsg))||'cancelled'})}); }catch(e){res({ok:false,err:e.message})} }); },
    shortcutReward(){ const T=sdk(); if(!T) return Promise.resolve(true);
      if(!has('getShortcutMissionReward')) return Promise.resolve(false);
      return new Promise(res=>{ try{ T.getShortcutMissionReward({success:r=>res(!!(r&&r.canReceiveReward)),fail:()=>res(false)}); }catch(_){res(false)} }); },
    canRevisit(){ return sdk()?has('startEntranceMission'):true; },
    startRevisit(){ const T=sdk();
      if(!T){ pf._mockRevisit=true; return mockStep('Opening your TikTok Profile','In TikTok this jumps to Profile › Recently played. Here we pretend you came back from there.',true); }
      const fn=T.startEntranceMission||(typeof TTMinis!=='undefined'&&TTMinis.startEntranceMission);
      return new Promise(res=>{ try{ fn.call(T,{success:()=>res({ok:true}),fail:e=>res({ok:false,err:(e&&(e.error_msg||e.errMsg))||'failed'})}); }catch(e){res({ok:false,err:e.message})} }); },
    revisitReward(){ const T=sdk(); if(!T) return Promise.resolve(!!pf._mockRevisit);
      const fn=T.getEntranceMissionReward||(typeof TTMinis!=='undefined'&&TTMinis.getEntranceMissionReward);
      if(typeof fn!=='function') return Promise.resolve(false);
      return new Promise(res=>{ try{ fn.call(T,{success:r=>res(!!(r&&r.canReceiveReward)),fail:()=>res(false)}); }catch(_){res(false)} }); },
    share(){ const T=sdk();
      if(T&&T.shareAppMessage) return new Promise(res=>{ try{ T.shareAppMessage({query:'from=share',success:()=>res({ok:true}),fail:e=>res({ok:false,err:(e&&e.errMsg)||'cancelled'})}); }catch(e){res({ok:false,err:e.message})} });
      return mockStep('Share Meow Sakura','In TikTok this opens the friend picker. Pick “Sent” to simulate a share.',true,'Sent','Cancel'); },
  };
  /* mock confirmation sheet so the flows can be tested outside TikTok */
  function mockStep(title,body,okDefault,okTxt='Done',noTxt='Cancel'){
    if(UI.mockSheet) return UI.mockSheet(title,body,okTxt,noTxt); /* canvas UI (native build) */
    return new Promise(res=>{ const d=document.createElement('div'); d.className='mx-mock';
      d.innerHTML=`<div><small>TEST MODE · simulated TikTok screen</small><b>${title}</b><p>${body}</p><span><button data-r="0">${noTxt}</button><button data-r="1" class="ok">${okTxt}</button></span></div>`;
      document.getElementById('wrap').appendChild(d);
      d.querySelectorAll('button').forEach(b=>b.onclick=()=>{d.remove();res(b.dataset.r==='1'?{ok:true}:{ok:false,err:'cancelled'})});
    }); }
  return pf;
})();
const fmtNum=n=>{ n=Math.round(n); const s=String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g,','); return n<0?'-'+s:s; };
const dayKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

/* =====================================================================
   Ads — one manager for every placement. Placement keys used in code -> label
   (labels match the Meow Sushi ads config):
   ===================================================================== */
const AD_PLACEMENTS={
  double_task:  {label:'Double Task Bonus', type:'rewarded'},   // x2 bonus when a task is completed
  buying_pad:   {label:'Buying Pad',        type:'rewarded'},   // coin bag: short on coins for a purchase
  meow_rush:    {label:'Meow Rush',         type:'rewarded'},
  vip_tip:      {label:'VIP tip',           type:'rewarded'},
  coin_purchase:{label:'Coin Purchase',     type:'rewarded'},
  grand_opening:{label:'Grand Opening',     type:'rewarded'},
  inter:        {label:'Grill Break',        type:'interstitial'},// Grill Break
};
/* ---- plug the HS SDK here ----------------------------------------------
   Ads.adapter = {
     rewarded(label)     -> Promise<boolean>   true = watched to the end (grant), false = closed early; reject = no ad / error
     interstitial(label) -> Promise<void>
   }
   label is one of the AD_PLACEMENTS labels above. While Ads.adapter is null, test ads are simulated. */
const Ads={
  adapter:null, busy:false, pending:null, lastRewardAt:-1e9, lastInterPlay:0, log:[],
  _done(unit,res){ const p=Ads.pending; if(!p||p.unit!==unit) return; Ads.pending=null; clearTimeout(p.timer);
    Ads.busy=false; PF.emit('resume','ad'); p.cb(res); },
  /* cb gets {ended:true} (grant) | {ended:false} (closed early) | {error} */
  _show(key,cb){ if(Ads.busy) return cb({error:'busy'}); const pl=AD_PLACEMENTS[key], unit=key+':'+Date.now();
    Ads.busy=true; PF.emit('pause','ad'); const p={unit,cb,timer:0}; Ads.pending=p;
    const A=Ads.adapter||window.MeowSakuraAds||null;
    if(!A) return Ads._mockShow(key,unit);
    p.timer=setTimeout(()=>Ads._done(unit,{error:'timeout'}),90000);
    try{ const pr=pl.type==='rewarded'?A.rewarded(pl.label):A.interstitial(pl.label);
      Promise.resolve(pr).then(ok=>Ads._done(unit,{ended:pl.type==='rewarded'?!!ok:true})).catch(e=>Ads._done(unit,{error:(e&&(e.code||e.errorCode))||'error'}));
    }catch(e){ Ads._done(unit,{error:'error'}); } },
  _mockShow(key,unit){ const m=PF.mock, pl=AD_PLACEMENTS[key], rw=pl.type==='rewarded';
    if(m.adFailNext){m.adFailNext=false;return setTimeout(()=>Ads._done(unit,{error:1004,msg:'no fill (test)'}),400)}
    if(UI.mockAd) return UI.mockAd(pl.label,rw,ended=>Ads._done(unit,{ended})); /* canvas UI (native build) */
    const d=document.createElement('div'); d.className='ad mx-admock'; let n=rw?3:2;
    const draw=()=>d.innerHTML=`<div><small>TEST AD · ${pl.label}</small>${rw?'Rewarded video':'Interstitial'}<b>${n}</b>${rw?'Watch to the end for the reward':'Ad break'}<button class="mx-adx" aria-label="Close ad">✕</button></div>`;
    const finish=ended=>{clearInterval(t);d.remove();Ads._done(unit,{ended})};
    draw(); document.getElementById('wrap').appendChild(d);
    d.addEventListener('click',e=>{if(e.target.classList.contains('mx-adx')) finish(!rw)});
    if(m.adQuitNext){m.adQuitNext=false;setTimeout(()=>finish(false),700)}
    const t=setInterval(()=>{n--; if(n<=0) finish(true); else draw();},800); },
  rewarded(key,onReward){ const t0=Date.now();
    Ads._show(key,res=>{ Ads.log.push({placement:AD_PLACEMENTS[key].label,res,at:t0});
      if(res.ended){ Ads.lastRewardAt=Date.now(); S.mx.ads=(S.mx.ads||0)+1; onReward(); save(); return; }
      if(res.error==='busy') return;
      if(res.error===30001) UI.toast('Too many ads — try again in a minute');
      else if(res.error) UI.toast('No ad available right now — try later');
      else UI.toast('Watch the whole ad to get the reward'); }); },
  /* Grill Break: every CFG.ads.inter.every seconds of play, only at a safe moment; silent on every failure */
  canInter(){ const c=CFG.ads.inter;
    return !DEBUG.noModal&&!Ads.busy&&!UI.modalOpen&&!paused&&S.task>=taskIndex(c.afterTask)&&S.playTime-Ads.lastInterPlay>=c.every&&Date.now()-Ads.lastRewardAt>=c.afterReward*1000; },
  interstitial(reason){ if(!Ads.canInter()) return false; Ads.lastInterPlay=S.playTime;
    UI.toast('Grill break 🍔'); setTimeout(()=>{ if(UI.modalOpen||Ads.busy) return; Ads._show('inter',res=>Ads.log.push({placement:'Grill Break ('+reason+')',res,at:Date.now()})); },900);
    return true; },
};
