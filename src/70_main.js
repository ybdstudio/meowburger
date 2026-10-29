/* =====================================================================
   70_main.js — input, audio, save/load, boot, loop, debug API
   ===================================================================== */
/* ---------- input: floating joystick + keyboard ---------- */
const joy={active:false,id:null,ox:0,oy:0,x:0,y:0}; const keys={};
function bindInput(){
  cv.addEventListener('pointerdown',e=>{if(UI.modalOpen)return;e.preventDefault();joy.active=true;joy.id=e.pointerId;const r=cv.getBoundingClientRect();joy.ox=joy.x=e.clientX-r.left;joy.oy=joy.y=e.clientY-r.top;try{cv.setPointerCapture(e.pointerId)}catch(_){}audioInit()},{passive:false});
  cv.addEventListener('pointermove',e=>{if(!joy.active||e.pointerId!==joy.id)return;const r=cv.getBoundingClientRect();joy.x=e.clientX-r.left;joy.y=e.clientY-r.top});
  const end=e=>{if(e.pointerId===joy.id){joy.active=false;joy.id=null}};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('lostpointercapture',end);
  document.addEventListener('touchmove',e=>{if(e.target===cv)e.preventDefault()},{passive:false});
  if(!window.PointerEvent){ /* no pointer events: drive the same joystick from touch events */
    const tp=e=>{const t=e.changedTouches[0],r=cv.getBoundingClientRect();return [t.clientX-r.left,t.clientY-r.top,t.identifier]};
    cv.addEventListener('touchstart',e=>{if(UI.modalOpen)return;e.preventDefault();const [x,y,id]=tp(e);joy.active=true;joy.id=id;joy.ox=joy.x=x;joy.oy=joy.y=y;audioInit()},{passive:false});
    cv.addEventListener('touchmove',e=>{if(!joy.active)return;for(const t of e.changedTouches)if(t.identifier===joy.id){const r=cv.getBoundingClientRect();joy.x=t.clientX-r.left;joy.y=t.clientY-r.top}},{passive:false});
    const tend=e=>{for(const t of e.changedTouches)if(t.identifier===joy.id){joy.active=false;joy.id=null}};cv.addEventListener('touchend',tend);cv.addEventListener('touchcancel',tend);
  }
  window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;audioInit()});window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
  window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;joy.active=false});
}
function getInput(){let x=0,y=0;
  if(keys.a||keys.arrowleft)x-=1;if(keys.d||keys.arrowright)x+=1;if(keys.w||keys.arrowup)y-=1;if(keys.s||keys.arrowdown)y+=1;
  if(x||y){const L=Math.hypot(x,y);return{x:x/L,y:y/L,m:1}}
  if(joy.active){const R=Math.max(42,TW*.75);let dx=joy.x-joy.ox,dy=joy.y-joy.oy;const L=Math.hypot(dx,dy);if(L<3)return{x:0,y:0,m:0};
    if(L>R){joy.ox=joy.x-dx/L*R;joy.oy=joy.y-dy/L*R}return{x:dx/L,y:dy/L,m:Math.min(1,L/R*1.6)}}
  return{x:0,y:0,m:0}}
function drawJoystick(){if(!joy.active)return;const R=Math.max(42,TW*.75);ell(MD,joy.ox,joy.oy,R,R,'rgba(255,255,255,.3)','rgba(90,52,36,.5)',MD.OL);
  let dx=joy.x-joy.ox,dy=joy.y-joy.oy;const L=Math.hypot(dx,dy);if(L>R){dx=dx/L*R;dy=dy/L*R}ell(MD,joy.ox+dx,joy.oy+dy,R*.46,R*.46,'#fff',INK,MD.OL*1.2)}

/* ---------- audio (WebAudio blips, starts after first touch) ---------- */
let AC=null,lastTick=0;
function audioInit(){if(AC){try{if(AC.state==='suspended'&&!paused){const r=AC.resume&&AC.resume();r&&r.catch&&r.catch(()=>{})}}catch(_){}return}try{const C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C()}catch(e){}}
function audioPause(){try{if(AC&&AC.state==='running'&&AC.suspend){const r=AC.suspend();r&&r.catch&&r.catch(()=>{})}}catch(_){}}
function audioResume(){try{if(AC&&AC.state!=='running'&&AC.resume){const r=AC.resume();r&&r.catch&&r.catch(()=>{})}}catch(_){}}
/* Sound must never break the game: mini-game runtimes ship partial WebAudio (e.g. TikTok iOS: AudioParam
   without setValueAtTime). Every call is feature-checked and wrapped; after 3 failures sound turns itself off. */
let sfxFail=0;
const apSet=(p,v,t)=>{ if(!p) return; if(typeof p.setValueAtTime==='function') p.setValueAtTime(v,t); else p.value=v; };
const apRamp=(p,v,t)=>{ if(!p) return; if(typeof p.exponentialRampToValueAtTime==='function') p.exponentialRampToValueAtTime(v,t); else if(typeof p.linearRampToValueAtTime==='function') p.linearRampToValueAtTime(v,t); };
function sfx(k){ if(!AC||!S||!S.sound||paused||sfxFail>=3||(AC.state&&AC.state!=='running')) return;
  try{ const t=AC.currentTime||0; if(k==='tick'){if(t-lastTick<.06)return;lastTick=t}
    const map={pick:[660,.06,'triangle'],drop:[520,.05,'triangle'],coin:[1180,.06,'square'],cash:[880,.12,'square'],buy:[523,.25,'triangle'],level:[784,.35,'triangle'],task:[659,.4,'triangle'],tick:[900,.03,'sine']};
    const [f,d,type]=map[k]||[440,.1,'sine'], vol=k==='coin'||k==='tick'?.03:.07;
    const o=AC.createOscillator(), gn=AC.createGain(); try{o.type=type}catch(_){}
    apSet(o.frequency,f,t); if(k==='buy'||k==='level'||k==='task'){apSet(o.frequency,f*1.26,t+d*.33);apSet(o.frequency,f*1.5,t+d*.66)}
    if(gn.gain&&typeof gn.gain.exponentialRampToValueAtTime==='function'){ apSet(gn.gain,.0001,t); apRamp(gn.gain,vol,t+.01); apRamp(gn.gain,.0001,t+d); } else apSet(gn.gain,vol,t);
    o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t+d+.02);
  }catch(e){ if(++sfxFail===3) console.warn('sound disabled:',e&&e.message); } }

/* ---------- save / load ---------- */
function freshState(){return{v:3,v4:true,side:0,sideBase:null,money:CFG.startMoney,task:0,taskBase:null,bought:{},stage:0,spd:0,cap:0,store:0,sup:0,mSpd:0,mCarry:0,rPrice:0,rFlow:0,
  level:1,xp:0,pile:0,boostUntil:0,boostCd:0,grand:false,done:false,playTime:0,sound:true,mx:{},
  stats:{served:0,collected:0,dumped:0,loaded:0,vip:0,decor:0,lost:0,cooked_pizza:0,cooked_drink:0,cooked_pepperoni:0,cooked_dessert:0,cooked_special:0,cooked_veggie:0,cooked_seafood:0,cookedAll:0,streak:0}}}
function migrateV1(o){ // v2 save (Halloween build) -> v3: keep money, purchases, upgrades, progress
  const s=freshState(); s.money=o.money??s.money; s.level=o.level||1; s.xp=o.xp||0; s.pile=o.pile||0;
  for(const k of ['spd','cap','mSpd','mCarry','rPrice','rFlow']) s[k]=o[k]||0;
  for(const k of ['register','oven1','table1','bin','table2','table3','table4','cashier','office','oven2']) if(o.bought&&o.bought[k]) s.bought[k]=true;
  const step=o.step||0; s.task=step>=10?taskIndex('t_serve5'):step; Object.assign(s.stats,{served:(o.stats&&o.stats.sold)||0,collected:(o.stats&&o.stats.collected)||0,dumped:(o.stats&&o.stats.dumped)||0});
  return s;}
function load(){try{const r=PF.store.get(SAVE_KEY);if(r){const o=JSON.parse(r);const f=freshState();const s=Object.assign(f,o);s.stats=Object.assign(freshState().stats,o.stats||{});
    if(!o.v4){ if(s.task>=40) s.task+=2; else if(s.task>=29) s.task+=1; } s.v4=true; if(!s.mx||typeof s.mx!=='object') s.mx={}; if(!(s.playTime>=0)||!isFinite(s.playTime)) s.playTime=0; if(!isFinite(s.money)) s.money=CFG.startMoney; if(!isFinite(s.stats.collected)) s.stats.collected=0; return s}
  const old=PF.store.get(LEGACY_SAVE_KEY);if(old) return migrateV1(JSON.parse(old));}catch(e){}return freshState()}
function save(){try{const o=Object.assign({},S);o.boostUntil=0;o.boostCd=0;PF.store.set(SAVE_KEY,JSON.stringify(o))}catch(e){}}
function resetGame(){S=freshState();S.taskBase=statSnap();SPOTS.forEach(s=>s.paid=0);customers=[];workers=[];FOODS.forEach(k=>tray[k]=0);player.x=3.4;player.y=5.6;player.carry=[];stations=[];tables=[];
  rebuildWorld(false);refreshSolids();buildFloorCache(TW);save();UI._last={};UI.setTask()}

/* ---------- boot ---------- */
function showError(msg){const b=$('errorBox');b.hidden=false;b.querySelector('p').textContent=msg;const l=$('loading');if(l)l.hidden=true}
window.addEventListener('error',e=>{if(!window.__cpStarted) showError((e.message||'Unknown error')+(e.lineno?' (line '+e.lineno+')':''))});
window.addEventListener('unhandledrejection',e=>{if(!window.__cpStarted) showError(String(e.reason&&e.reason.message||e.reason))});
PF.onError(msg=>{console.error(msg);if(!window.__cpStarted) showError(msg)});
/* pause: ads / app in background. The world freezes, audio is suspended, input is released. */
let paused=0;
function setPaused(on){paused=Math.max(0,paused+(on?1:-1));joy.active=false;for(const k in keys)keys[k]=false;if(paused)audioPause();else audioResume()}
PF.on('pause',()=>setPaused(true)); PF.on('resume',()=>setPaused(false));
PF.on('hide',()=>{if(S)save();setPaused(true)}); PF.on('show',()=>{setPaused(false);last=null;if(window.__cpStarted&&UI.onShow)UI.onShow()});
let last=0,saveT=0;
/* dt is always 0..50 ms: some runtimes call rAF without a timestamp or with a different clock than
   performance.now (TikTok native: no global performance) — a negative dt once sent the clock back 56 years */
function frame(ts){try{ if(typeof ts!=='number'||!isFinite(ts)) ts=performance.now(); if(last===null||ts<last) last=ts;
    let dt=(ts-last)/1000; if(!(dt>0)) dt=0; dt=Math.min(.05,dt); last=ts;
    if(!UI.modalOpen&&!paused){ const inp=getInput(); update(dt,inp); if(CFG.autoPlay&&S.auto===2&&AUTOP.manualT<=0) update(dt,inp); }
    render();UI.frame();saveT+=dt;if(saveT>2){saveT=0;save()}
  }catch(err){console.error(err);window.__cpFrameErrN=(window.__cpFrameErrN||0)+1;if(!window.__cpFrameErr){window.__cpFrameErr=true;UI.toast('Error: '+err.message)}}
  requestAnimationFrame(frame)}
async function boot(){
  try{
    S=load(); if(!S.taskBase) S.taskBase=statSnap(); S.stage=curStage();
    resize(); window.addEventListener('resize',resize); bindInput(); UI.init();
    UI.loading(.03,'Heating the grill…');
    if(document.fonts&&document.fonts.load){ try{await Promise.race([document.fonts.load('700 20px Fredoka'),new Promise(r=>setTimeout(r,1500))])}catch(_){} }
    UI.loading(.08,'Toasting the buns…');
    await preloadAssets(p=>UI.loading(.08+p*.88,p<.5?'Toasting the buns…':p<.9?'Frying the chicken…':'Calling the cats…'));
    rebuildWorld(false); refreshSolids(); buildFloorCache(TW);
    if(S.stage===0&&S.bought.oven1) stations.forEach(s=>{if(s.type==='oven')s.stock=2});
    camX=(player.x-player.y)*TW/2;camY=(player.x+player.y)*TW/4;
    UI.loading(1,'Ready! Meow!'); await new Promise(r=>setTimeout(r,350));
    $('loading').classList.add('gone'); setTimeout(()=>{$('loading').hidden=true},400);
    window.__cpStarted=true; last=null; requestAnimationFrame(frame);
    PF.initLifecycle(); UI.afterBoot&&UI.afterBoot();
  }catch(err){console.error(err);showError(err.message||String(err))}
}
/* debug / test hooks (used by the automated playtest) */
window.__cp={get S(){return S},player,burst,fly,emote,   /* burst/fly/emote: effect hooks for promo shots (tests) */
  get customers(){return customers},get workers(){return workers},get stations(){return stations},get tables(){return tables},get tray(){return tray},
  TRAY_CAP,DEBUG,findPath,taskTarget,curTask,taskProgress,spotVisible,SPOTS,TASKS,UPG,PT,PADS,bins:()=>bins,carryMax,catOf,update:(dt)=>update(dt,{x:0,y:0,m:0}),
  buyUpgrade:(key)=>{for(const t in UPG){const r=UPG[t].rows.find(r=>r.key===key);if(r){const c=r.cost[S[key]];if(c===undefined||S.money<c)return false;S.money-=c;S[key]++;return true}}return false},
  ATLAS,ASSET_MANIFEST,ASSET_REPORT,render,PF,Ads,UI,AD_PLACEMENTS,onBought,rebuildWorld,refreshSolids,curStage,buildFloorCache:()=>buildFloorCache(TW),ENV,get paused(){return paused},get now(){return now},spawnCustomer,leave,CFG,stCap,orderLeft,trayTotal,itemPrice,walkable};
boot();
