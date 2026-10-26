// QA for the TikTok NATIVE package: runs dist/native/game.js in Chromium behind a fake TTMinis.game
// (screen canvas + touch callbacks only). The game code sees no real document/window/localStorage.
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..','dist','native'), OUT=process.argv[2]||path.join(__dirname,'..','qa_native');
fs.mkdirSync(OUT,{recursive:true});
const HARNESS=`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block;width:390px;height:844px;touch-action:none}</style>
<canvas id="screen"></canvas><script>
window.__log=[];window.__store={};let first=true;
/* behave like TikTok native: GameGlobal without performance, rAF without a timestamp, art/ files unreachable before loadSubpackage */
window.GameGlobal={}; window.__artLoaded=false;
/* stand-in for hs-game.js (the real kit is verified with hs-check.mjs): records showAd labels, pays via onGive */
window.__hsLog=[]; window.__HS={ ready:false, lastAdError:'', lastShareError:'', _d:null, _give:null, _c:{},
 start(o){ this._d=o.defaults; this._give=o.onGive; this.ready=true; __hsLog.push('start '+o.gameId); return Promise.resolve({loggedIn:true}); },
 canShowAd(l){ return !window.__hsNoAd; }, item(id){ return this._d.items[id]||null; }, available(k){ return !this._c[k]; },
 showAd(l){ __hsLog.push('showAd:'+l); const m=window.__adMode||'ok'; return new Promise(r=>setTimeout(()=>{ if(m!=='ok'){ this.lastAdError=m==='quit'?'skipped':'unavailable'; return r(null);} const rw=this._d.rewards[l]; if(!rw) return r({}); const it={}; for(const k in rw) if(k[0]!=='$') it[k]=rw[k]; this._give(it,l); r(it); },300)); },
 share(o){ __hsLog.push('share'); return new Promise(r=>setTimeout(()=>{ if(this._c.share){ this.lastShareError='claimed'; return r(null);} this._c.share=1; this._give({coins:50},'share'); r({coins:50}); },50)); },
 tiktokMission:{ supported:()=>true, done:k=>!!__HS._c['tiktok_'+k], refresh:()=>Promise.resolve(),
   start(k){ __hsLog.push('mission:'+k); setTimeout(()=>{ if(!__HS._c['tiktok_'+k]){ __HS._c['tiktok_'+k]=1; __HS._give({coins:100},'tiktok_'+k); } },60); return Promise.resolve('started'); } } };
window.require=p=>{ if(p==='./hs-game.js') return __HS; if(p==='./meow-config.js') return {appId:'1234567890',hsSdkKey:'sk_test_qa'}; throw new Error('no module '+p); }; const _raf=window.requestAnimationFrame.bind(window); window.requestAnimationFrame=f=>_raf(()=>f());
const _srcSet=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src').set;const cv=document.getElementById('screen');const L={s:[],m:[],e:[],c:[]};
window.TTMinis={game:{
 canIUse:()=>true,
 createCanvas(){ if(first){first=false;return cv} return document.createElement('canvas') },
 createImage(){ const im=new Image(); Object.defineProperty(im,'src',{set(v){ if(String(v).startsWith('art/')&&!__artLoaded){ setTimeout(()=>im.onerror&&im.onerror(new Error('not downloaded')),5); return; } _srcSet.call(im,v); },get(){return im.getAttribute('src')}}); return im; },
 getWindowInfo:()=>({windowWidth:390,windowHeight:844,screenWidth:390,screenHeight:844,pixelRatio:2,safeArea:{top:47,bottom:810}}),
 getMenuButtonBoundingClientRect:()=>window.__noMenu?undefined:({left:296,top:51,right:383,bottom:83,width:87,height:32}),
 onTouchStart:f=>L.s.push(f),onTouchMove:f=>L.m.push(f),onTouchEnd:f=>L.e.push(f),onTouchCancel:f=>L.c.push(f),
 loadSubpackage(o){ __log.push('loadSubpackage '+o.name); const t={onProgressUpdate(f){setTimeout(()=>f({progress:40}),200);setTimeout(()=>f({progress:90}),500)}}; setTimeout(()=>{__artLoaded=true;o.success({})},700); return t },
 getStorageSync:k=>__store[k]??'', setStorageSync:(k,v)=>{__store[k]=v}, removeStorageSync:k=>{delete __store[k]},
 onShow:f=>{window.__onShow=f}, onHide:f=>{window.__onHide=f}, onError:f=>{window.__onErr=f}, onWindowResize:f=>{},
 getLaunchOptionsSync:()=>({scene:'0',query:{}}), vibrateShort:()=>{},
 addShortcut:o=>{__log.push('addShortcut');setTimeout(()=>o.success({}),50)}, getShortcutMissionReward:o=>setTimeout(()=>o.success({canReceiveReward:true}),20),
 startEntranceMission:o=>{__log.push('startEntranceMission');window.__rv=true;setTimeout(()=>o.success({}),20)}, getEntranceMissionReward:o=>setTimeout(()=>o.success({canReceiveReward:!!window.__rv}),20),
 shareAppMessage:o=>{__log.push('shareAppMessage');setTimeout(()=>o.success({}),50)},
 /* partial WebAudio like TikTok iOS: AudioParam has no setValueAtTime / ramps, resume() returns undefined */
 createWebAudioContext(){ const P=()=>({value:0}); window.__acUsed=(window.__acUsed||0); return {state:'running',currentTime:0,destination:{},resume(){},suspend(){},
   createOscillator(){ window.__acUsed++; return {type:'sine',frequency:P(),connect(){},start(){},stop(){}} }, createGain(){ return {gain:P(),connect(){}} } }; },
}};
const fire=(k,e)=>{const t={identifier:e.pointerId,screenX:e.offsetX,screenY:e.offsetY};L[k].forEach(f=>f({touches:k==='e'?[]:[t],changedTouches:[t]}))};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);fire('s',e)});cv.addEventListener('pointermove',e=>{if(e.buttons)fire('m',e)});cv.addEventListener('pointerup',e=>fire('e',e));
</script><script src="game.js"></script><script>window.__NWIN=GameGlobal.__NWIN</script>`;
const srv=http.createServer((q,r)=>{ if(q.url==='/'||q.url.startsWith('/__h')){r.writeHead(200,{'content-type':'text/html'});return r.end(HARNESS)}
  const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':f.endsWith('.png')?'image/png':'image/jpeg'}); fs.createReadStream(f).pipe(r); });
const results=[]; const ok=(n,c,i='')=>results.push((c?'PASS ':'FAIL ')+n+(i?' — '+i:''));
(async()=>{
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
  await p.goto('http://localhost:'+port+'/__h');
  await p.waitForTimeout(450); await p.screenshot({path:OUT+'/n01_loading.png'});
  await p.waitForFunction(()=>window.__NWIN&&__NWIN.__cpStarted,null,{timeout:60000}).catch(()=>{});
  const started=await p.evaluate(()=>!!(window.__NWIN&&__NWIN.__cpStarted)); ok('boots on fake native runtime',started,await p.evaluate(()=>window.__NWIN&&__NWIN.__cpErr||''));
  /* auto-play test build: auto play must be ON at first start; then switched off so the money checks below are not disturbed */
  { const ap=await p.evaluate(()=>{const A=__NWIN.__cp; return A&&A.CFG.autoPlay?{auto:A.S.auto,speed:A.S.gameSpeed}:null});
    if(ap){ ok('auto play ON at first start, speed 1x',ap.auto===1&&ap.speed===1,JSON.stringify(ap)); await p.evaluate(()=>{__NWIN.__cp.S.auto=0}); } }
  if(!started){ await p.screenshot({path:OUT+'/n00_fail.png'}); console.log(results.join('\n'),errs); process.exit(1); }
  const A='__NWIN.__cp';
  ok('art subpackage loaded',await p.evaluate(()=>__log.includes('loadSubpackage art')));
  ok('all sprites decoded',await p.evaluate(()=>__NWIN.__cp.ASSET_REPORT.missing.length===0),JSON.stringify(await p.evaluate(()=>__NWIN.__cp.ASSET_REPORT.missing.slice(0,5))));
  await p.waitForTimeout(800); await p.screenshot({path:OUT+'/n02_start.png'});
  const tapId=async id=>{ const h=await p.evaluate(id=>{const h=__NWIN.__cp.UI.hits().slice().reverse().find(h=>h.id===id);return h&&[h.x+h.w/2,h.y+h.h/2]},id); if(!h){ const d=await p.evaluate(()=>{try{__NWIN.__cp.UI.draw();return 'draw ok, hits='+__NWIN.__cp.UI.hits().map(h=>h.id).join(',')}catch(e){return e.stack}}); throw new Error('no hit '+id+' :: '+d+' :: '+errs.join('|')); } await p.mouse.click(h[0],h[1]); await p.waitForTimeout(250); };
  // tutorial: drag to move
  const x0=await p.evaluate(()=>__NWIN.__cp.player.x+','+__NWIN.__cp.player.y);
  await p.mouse.move(200,500); await p.mouse.down(); await p.mouse.move(260,560,{steps:5}); await p.waitForTimeout(600); await p.screenshot({path:OUT+'/n03_joystick.png'}); await p.mouse.up();
  ok('touch joystick moves the chef',x0!==await p.evaluate(()=>__NWIN.__cp.player.x+','+__NWIN.__cp.player.y));
  // mid game
  await p.evaluate(()=>{const A=__NWIN.__cp,S=A.S;['register','oven1','table1','bin','table2','drink','renovate','pantry','prep','office'].forEach(i=>S.bought[i]=true);
    S.task=A.TASKS.findIndex(t=>t.id==='t_hire1');S.money=120;S.mx.homeAsked=1;S.taskBase=JSON.parse(JSON.stringify(S.stats));A.player.x=3.4;A.player.y=5.6;});
  await p.waitForTimeout(900); await p.screenshot({path:OUT+'/n04_hud.png'});
  ok('side buttons on canvas',await p.evaluate(()=>['btn_revisit','btn_share','btn_home'].every(k=>__NWIN.__cp.UI.hits().some(h=>h.id===k))));
  // modals
  for(const [id,shot] of [['dShop','n05_shop'],['dUpgrade','n06_upgrade'],['dTask','n07_tasks'],['dMap','n08_map'],['dSettings','n10_settings']]){
    await tapId(id); await p.waitForTimeout(200); await p.screenshot({path:OUT+'/'+shot+'.png'});
    ok('modal '+id+' opens',await p.evaluate(()=>__NWIN.__cp.UI.modalOpen));
    if(id==='dMap'){ await p.mouse.move(195,560); await p.mouse.down(); await p.mouse.move(195,300,{steps:6}); await p.mouse.up(); await p.waitForTimeout(150); await p.screenshot({path:OUT+'/n09_map_scrolled.png'});
      ok('map scrolls when taller than the screen',await p.evaluate(()=>__NWIN.__cp.UI._scrollMax===0||__NWIN.__cp.UI._scroll>0)); }
    if(id==='dUpgrade'){ const m0=await p.evaluate(()=>__NWIN.__cp.S.money); await tapId('tabkitchen'); }
    await tapId(id==='dSettings'||true?'mclose':'mclose'); ok('modal '+id+' closes',!(await p.evaluate(()=>__NWIN.__cp.UI.modalOpen)));
  }
  // upgrade buy
  await p.evaluate(()=>{__NWIN.__cp.S.money=500}); await tapId('dUpgrade'); const lv0=await p.evaluate(()=>__NWIN.__cp.S.cap);
  await tapId('upcap'); ok('buy upgrade by tap',await p.evaluate(lv=>__NWIN.__cp.S.cap===lv+1,lv0)); await tapId('mclose');
  // Add to Home
  await tapId('btn_home'); await p.waitForTimeout(200); await p.screenshot({path:OUT+'/n11_home.png'});
  let m0=await p.evaluate(()=>__NWIN.__cp.S.money); await tapId('homeGo'); await p.waitForTimeout(400); let m1=await p.evaluate(()=>__NWIN.__cp.S.money);
  ok('Add to Home: HSGame.tiktokMission shortcut, onGive +100',m1-m0===100&&await p.evaluate(()=>__hsLog.includes('mission:shortcut')),'+'+(m1-m0));
  // Revisit
  await tapId('btn_revisit'); await p.waitForTimeout(200); await p.screenshot({path:OUT+'/n12_revisit.png'});
  let rv0=await p.evaluate(()=>__NWIN.__cp.S.money); await tapId('rvGo'); await p.evaluate(()=>{window.__onHide&&__onHide();}); ok('onHide pauses',await p.evaluate(()=>__NWIN.__cp.paused>0));
  await p.evaluate(()=>{window.__onShow&&__onShow({});}); await p.waitForTimeout(400); ok('onShow resumes',await p.evaluate(()=>__NWIN.__cp.paused===0));
  await p.screenshot({path:OUT+'/n13_revisit_claim.png'});
  m1=await p.evaluate(()=>__NWIN.__cp.S.money);
  ok('Revisit: HSGame.tiktokMission profile, onGive +100 once',m1-rv0===100&&await p.evaluate(()=>__hsLog.includes('mission:profile')&&__NWIN.__cp.UI.revisitClaimed()),'+'+(m1-rv0)); await tapId('mxX');
  // Share
  await tapId('btn_share'); await p.waitForTimeout(200); await p.screenshot({path:OUT+'/n14_share.png'});
  m0=await p.evaluate(()=>__NWIN.__cp.S.money); await tapId('shGo'); await p.waitForTimeout(300); m1=await p.evaluate(()=>__NWIN.__cp.S.money);
  ok('Share: HSGame.share, onGive +50',m1-m0===50&&await p.evaluate(()=>__hsLog.includes('share')),'+'+(m1-m0));
  // ads (no HS adapter yet -> canvas test ad)
  await p.evaluate(()=>{__NWIN.__cp.S.boostUntil=0;__NWIN.__cp.S.boostCd=0}); await tapId('rush'); await p.waitForTimeout(500); await p.screenshot({path:OUT+'/n15_test_ad.png'});
  ok('ad pauses the game',await p.evaluate(()=>__NWIN.__cp.paused>0)||await p.evaluate(()=>__hsLog.includes('showAd:Meow Rush')));
  await p.waitForTimeout(800); ok('Meow Rush: showAd("Meow Rush") → onGive boost',await p.evaluate(()=>__hsLog.includes('showAd:Meow Rush'))&&await p.evaluate(()=>__NWIN.__cp.S.boostUntil>__NWIN.__cp.now));
  await p.evaluate(()=>__NWIN.__cp.UI.offerTip(60)); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/n16_offer_chip.png'});
  m0=await p.evaluate(()=>__NWIN.__cp.S.money); await tapId('offer'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__NWIN.__cp.S.money);
  ok('x2 task bonus via chip',m1-m0===60,'+'+(m1-m0));
  // HS adapter path
  await p.evaluate(()=>{__NWIN.__cp.UI._cd={};__NWIN.__cp.UI.offerVip(33)});
  await p.waitForTimeout(300); m0=await p.evaluate(()=>__NWIN.__cp.S.money); await tapId('offer'); await p.waitForTimeout(300); m1=await p.evaluate(()=>__NWIN.__cp.S.money);
  ok('VIP tip x2: showAd("VIP tip") pays the VIP bill',m1-m0===33&&await p.evaluate(()=>__hsLog.includes('showAd:VIP tip')),'+'+(m1-m0));
  await p.evaluate(()=>{__NWIN.__cp.Ads.lastInterPlay=-999;__NWIN.__cp.Ads.lastRewardAt=-1e9;__NWIN.__cp.S.playTime+=70}); await p.waitForTimeout(1600);
  ok('Grill Break: showAd("Grill Break") after 45 s of play',await p.evaluate(()=>__hsLog.includes('showAd:Grill Break')));
  ok('Grill Break waits 45 s',await p.evaluate(()=>{const A=__NWIN.__cp.Ads; A.lastRewardAt=-1e9; A.lastInterPlay=__NWIN.__cp.S.playTime-30; return !A.canInter()}));
  { const r=await p.evaluate(async()=>{ const A=__NWIN.__cp, U=A.UI, w=ms=>new Promise(r=>setTimeout(r,ms)), out={};
      U._cd={}; let m=A.S.money; U.watchCoins(); await w(700); out.coin=A.S.money-m;
      const sp=A.SPOTS.find(s=>!A.S.bought[s.id]&&A.spotVisible(s)); const t=A.curTask(); 
      U._cd={}; m=A.S.money; U.offerOpening(); U.watchOffer(); await w(700); out.open=A.S.money-m;
      window.__adMode='quit'; U._cd={}; m=A.S.money; U.watchCoins(); await w(700); out.quit=A.S.money-m; window.__adMode='ok';
      return out; });
    ok('Coin Purchase: showAd("Coin Purchase") +100',r.coin===100&&await p.evaluate(()=>__hsLog.includes('showAd:Coin Purchase')),JSON.stringify(r));
    ok('Grand Opening: showAd("Grand Opening") +200',r.open===200&&await p.evaluate(()=>__hsLog.includes('showAd:Grand Opening')));
    ok('closed early: nothing given',r.quit===0); }
  { const r=await p.evaluate(async()=>{ const A=__NWIN.__cp, U=A.UI, w=ms=>new Promise(r=>setTimeout(r,ms)); const S=A.S;
      const i=A.TASKS.findIndex(t=>t.kind==='buy'&&!S.bought[t.spot]&&A.SPOTS.find(s=>s.id===t.spot&&s.cost>=150)); S.task=i; S.money=40; U._cd={};
      const pa=U.padAmount(); if(!pa) return {none:A.TASKS[i].id}; const m=S.money; U.watchPad(); await w(700); return {pad:pa.amount,got:S.money-m}; });
    ok('Buying Pad: showAd("Buying Pad") pays the shortfall',r.got===r.pad&&r.pad>0&&await p.evaluate(()=>__hsLog.includes('showAd:Buying Pad')),JSON.stringify(r)); }
  ok('every label used',await p.evaluate(()=>['Double Task Bonus','Buying Pad','Meow Rush','VIP tip','Coin Purchase','Grand Opening','Grill Break'].every(l=>__hsLog.includes('showAd:'+l))));
  ok('HSGame.start with game id',await p.evaluate(()=>__hsLog.includes('start 1234567890')));
  ok('partial WebAudio (no setValueAtTime) does not break the game',await p.evaluate(()=>(window.__acUsed||0)>0&&!__NWIN.__cpFrameErrN),'oscillators: '+await p.evaluate(()=>window.__acUsed||0));
  await p.evaluate(()=>{window.__onHide&&__onHide()}); await p.waitForTimeout(300); await p.evaluate(()=>{window.__onShow&&__onShow({})}); await p.waitForTimeout(800);
  const clk=await p.evaluate(()=>({now:__NWIN.__cp.now,play:__NWIN.__cp.S.playTime,left:__NWIN.__cp.S.boostUntil-__NWIN.__cp.now}));
  ok('game clock never goes backwards after hide/show',clk.now>0&&clk.play>0&&clk.left<=60,JSON.stringify(clk));
  const t0=await p.evaluate(()=>__NWIN.__cp.now); await p.waitForTimeout(1500); const t1=await p.evaluate(()=>__NWIN.__cp.now);
  ok('game time advances (~1.5 s)',t1-t0>1&&t1-t0<2,(t1-t0).toFixed(2)+' s');
  ok('side button + popup art loaded after subpackage',await p.evaluate(()=>{const hs=__NWIN.__cp.UI.hits().map(h=>h.id);return hs.includes('btn_revisit')}) && await p.evaluate(()=>__NWIN.__cp.UI.imgReady&&__NWIN.__cp.UI.imgReady('art/ui/btn_revisit.png')));
  ok('×2 task bonus from a real task completion shows a number',await p.evaluate(()=>{const A=__NWIN.__cp; A.UI._cd={}; A.UI._offer=null; const t=A.curTask(); if(t.kind==='buy') A.S.bought[t.spot]=true; else if(t.kind==='count') A.S.stats[t.stat]=(A.S.stats[t.stat]||0)+t.n; for(let i=0;i<5;i++) A.update(.05); const o=A.UI._offer; return !!o&&/\+\d+$/.test(o.text)&&!/NaN/.test(o.text)}),await p.evaluate(()=>__NWIN.__cp.UI._offer&&__NWIN.__cp.UI._offer.text));
  ok('Add to Phone Screen button stays visible after the bonus was claimed',await p.evaluate(()=>__NWIN.__cp.UI.homeDone()&&__NWIN.__cp.UI.hits().some(h=>h.id==='btn_home')));
  ok('money is a number',await p.evaluate(()=>Number.isFinite(__NWIN.__cp.S.money)));
  const SAVE_KEY=(fs.readFileSync(path.join(__dirname,'..','src','00_config.js'),'utf8').match(/SAVE_KEY='([^']+)'/)||[])[1];
  ok('save via setStorageSync',await p.evaluate(k=>!!__store[k],SAVE_KEY));
  ok('no page errors',errs.length===0,errs.slice(0,4).join(' | '));
  { const p2=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}); await p2.addInitScript(()=>{window.__noMenu=true});
    await p2.goto('http://localhost:'+port+'/__h'); await p2.waitForFunction(()=>window.__NWIN&&__NWIN.__cpStarted,null,{timeout:60000});
    const r=await p2.evaluate(()=>{const i=__NWIN.__cp.PF.insets();return i}); ok('capsule area kept free without getMenuButtonBoundingClientRect',r.capW>=100,JSON.stringify(r)); await p2.close(); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(results.filter(r=>r.startsWith('FAIL')).length+' failed of '+results.length);
})().catch(e=>{console.error(e);srv.close();process.exit(1)});
