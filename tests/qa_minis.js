// v4.4 QA: loading bar, side buttons, 3 popups, ad scenario (mock + fake TikTok SDK), storage, capsule.
// usage: node qa_minis.js [html] [outdir]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs');
const HTML=process.argv[2]||__dirname+'/../dist/index.html', OUT=process.argv[3]||__dirname+'/../qa_v4.4';
fs.mkdirSync(OUT,{recursive:true});
const FAKE_SDK=`window.__sdkLog=[];window.__store={};
window.TTMinis={game:{
  canIUse:n=>true,
  getStorageSync:k=>window.__store[k]??'', setStorageSync:(k,v)=>{window.__store[k]=v}, removeStorageSync:k=>{delete window.__store[k]},
  onShow:f=>{window.__onShow=f}, onHide:f=>{window.__onHide=f}, onError:f=>{},
  getWindowInfo:()=>({windowWidth:390,windowHeight:844,screenHeight:844,safeArea:{top:47,bottom:810}}),
  getMenuButtonBoundingClientRect:()=>({left:296,top:51,right:383,bottom:83,width:87,height:32}),
  getLaunchOptionsSync:()=>({scene:'021001',query:{}}),
  createRewardedVideoAd:o=>{const ad={_c:[],_e:[],onClose:f=>ad._c.push(f),onError:f=>ad._e.push(f),offClose(){},offError(){},
    show:()=>{__sdkLog.push('rv.show '+o.adUnitId);const mode=window.__adMode||'ok';
      if(mode==='err'){setTimeout(()=>ad._e.forEach(f=>f({errorCode:1004,errMsg:'no fill'})),50);return Promise.reject({errorCode:1004})}
      setTimeout(()=>ad._c.forEach(f=>f({isEnded:mode==='ok'})),300);return Promise.resolve()},load:()=>Promise.resolve()};return ad},
  createInterstitialAd:o=>{const ad={_c:[],onClose:f=>ad._c.push(f),onError:f=>{},show:()=>{__sdkLog.push('iv.show');setTimeout(()=>ad._c.forEach(f=>f()),200);return Promise.resolve()}};return ad},
  addShortcut:o=>{__sdkLog.push('addShortcut');setTimeout(()=>o.success({}),50)},
  getShortcutMissionReward:o=>setTimeout(()=>o.success({canReceiveReward:true}),20),
  startEntranceMission:o=>{__sdkLog.push('startEntranceMission');window.__rv=true;setTimeout(()=>o.success({}),20)},
  getEntranceMissionReward:o=>setTimeout(()=>o.success({canReceiveReward:!!window.__rv}),20),
  shareAppMessage:o=>{__sdkLog.push('share '+o.query);setTimeout(()=>o.success({}),50)},
  vibrateShort:()=>{}, createImage:()=>new Image(),
}};`;
const results=[]; const ok=(name,cond,info='')=>{results.push((cond?'PASS ':'FAIL ')+name+(info?' — '+info:''));};
async function boot(b,{sdk=false,vw=390,vh=844}={}){
  const p=await b.newPage({viewport:{width:vw,height:vh},deviceScaleFactor:2});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g|ERR_|net::/.test(m.text()))errs.push('console: '+m.text())});
  await p.route('**/fonts.googleapis.com/**',r=>r.abort());
  if(sdk) await p.addInitScript(FAKE_SDK);
  if(sdk) await p.addInitScript(()=>{window.__fakeUnits=true});
  const html=fs.readFileSync(HTML,'utf8');
  await p.goto('about:blank'); await p.setContent(html.replace('<!doctype html>',''),{waitUntil:'commit'}).catch(()=>{});
  return {p,errs};
}
(async()=>{
  const b=await chromium.launch();
  /* ---------- web / mock mode ---------- */
  let {p,errs}=await boot(b);
  await p.waitForTimeout(500); await p.screenshot({path:OUT+'/01_loading.png'});
  const pMid=await p.evaluate(()=>getComputedStyle(document.getElementById('loading')).getPropertyValue('--p'));
  await p.waitForFunction(()=>window.__cpStarted,null,{timeout:30000});
  ok('boots in web mode',await p.evaluate(()=>__cp.PF.mode==='mock'),'loading --p at 0.5s = '+pMid);
  await p.waitForTimeout(600);
  await p.screenshot({path:OUT+'/02_start.png'});
  ok('side buttons hidden during tutorial',await p.evaluate(()=>document.getElementById('sbRevisit').hidden&&document.getElementById('sbShare').hidden));
  // jump to mid game (after the renovation) with coins
  await p.evaluate(()=>{const A=__cp;A.DEBUG.noModal=false;const S=A.S;const ids=['register','oven1','table1','bin','table2','drink','renovate','pantry','prep','office'];ids.forEach(i=>S.bought[i]=true);
    S.task=A.TASKS.findIndex(t=>t.id==='t_hire1');S.money=120;S.mx.homeAsked=1;S.taskBase=JSON.parse(JSON.stringify(S.stats));});
  await p.evaluate(()=>{location.hash='x'});
  await p.waitForTimeout(800);
  const vis=await p.evaluate(()=>['sbRevisit','sbShare','sbHome'].map(i=>!document.getElementById(i).hidden));
  ok('3 side buttons visible after tutorial',vis.every(Boolean),JSON.stringify(vis));
  ok('badges on revisit+share',await p.evaluate(()=>document.getElementById('sbRevisit').classList.contains('badge')&&document.getElementById('sbShare').classList.contains('badge')));
  ok('gift rewards are fixed',await p.evaluate(()=>{const g=__cp.CFG.gifts;return g.revisit===100&&g.share===50&&g.home===100}));
  await p.screenshot({path:OUT+'/03_hud_side_buttons.png'});
  // Add to Home popup
  await p.click('#sbHome'); await p.waitForTimeout(400); await p.screenshot({path:OUT+'/04_popup_home.png'});
  let m0=await p.evaluate(()=>__cp.S.money);
  await p.click('#mxGo'); await p.waitForSelector('.mx-mock'); await p.screenshot({path:OUT+'/05_mock_shortcut.png'});
  await p.click('.mx-mock .ok'); await p.waitForTimeout(500);
  let m1=await p.evaluate(()=>__cp.S.money);
  ok('home: fixed +100 once',m1-m0===100,'+'+(m1-m0));
  ok('home button stays visible after the bonus',await p.evaluate(()=>!document.getElementById('sbHome').hidden));
  // Revisit popup
  await p.click('#sbRevisit'); await p.waitForTimeout(400); await p.screenshot({path:OUT+'/06_popup_revisit_before.png'});
  ok('revisit claim disabled before visiting',await p.evaluate(()=>document.getElementById('mxClaim').disabled));
  await p.click('#mxGo'); await p.waitForSelector('.mx-mock'); await p.click('.mx-mock .ok'); await p.waitForTimeout(500);
  await p.screenshot({path:OUT+'/07_popup_revisit_claimable.png'});
  ok('revisit claim enabled after coming back',await p.evaluate(()=>!document.getElementById('mxClaim').disabled));
  m0=await p.evaluate(()=>__cp.S.money); await p.click('#mxClaim'); await p.waitForTimeout(400); m1=await p.evaluate(()=>__cp.S.money);
  ok('revisit: fixed +100',m1-m0===100,'+'+(m1-m0));
  await p.click('#sbRevisit'); await p.waitForTimeout(300);
  ok('revisit once per day',await p.evaluate(()=>document.getElementById('mxClaim').disabled&&/Claimed/.test(document.getElementById('mxClaim').textContent)));
  await p.screenshot({path:OUT+'/08_popup_revisit_claimed.png'}); await p.click('#mxClose');
  // Share popup
  await p.click('#sbShare'); await p.waitForTimeout(400); await p.screenshot({path:OUT+'/09_popup_share.png'});
  await p.click('#mxGo'); await p.waitForSelector('.mx-mock'); await p.click('.mx-mock button:not(.ok)'); await p.waitForTimeout(300);
  m0=await p.evaluate(()=>__cp.S.money);
  await p.click('#mxGo'); await p.waitForSelector('.mx-mock'); await p.click('.mx-mock .ok'); await p.waitForTimeout(400);
  m1=await p.evaluate(()=>__cp.S.money);
  ok('share: cancel gives nothing, send gives fixed +50',m1-m0===50,'+'+(m1-m0));
  ok('badges cleared',await p.evaluate(()=>!document.getElementById('sbRevisit').classList.contains('badge')&&!document.getElementById('sbShare').classList.contains('badge')));
  // ① Kitchen Rush: early close = no reward; full = boost
  await p.evaluate(()=>{__cp.PF.mock.adQuitNext=true;__cp.UI.startAd()}); await p.waitForTimeout(1200);
  ok('rush closed early: no boost',await p.evaluate(()=>__cp.S.boostUntil<=__cp.now));
  await p.evaluate(()=>__cp.UI.startAd()); await p.waitForTimeout(700); await p.screenshot({path:OUT+'/10_mock_rewarded.png'});
  ok('game paused during ad',await p.evaluate(()=>__cp.paused>0));
  await p.waitForTimeout(2600);
  ok('rush full watch: boost on',await p.evaluate(()=>__cp.S.boostUntil>__cp.now));
  ok('unpaused after ad',await p.evaluate(()=>__cp.paused===0));
  // no fill
  await p.evaluate(()=>{__cp.S.boostUntil=0;__cp.S.boostCd=0;__cp.PF.mock.adFailNext=true;__cp.UI.startAd()}); await p.waitForTimeout(800);
  ok('no fill: toast, no boost, unpaused',await p.evaluate(()=>__cp.S.boostUntil<=__cp.now&&__cp.paused===0&&/No ad/.test(document.getElementById('toast').textContent)));
  // Double Task Bonus chip
  await p.evaluate(()=>__cp.UI.offerTip(60)); await p.waitForTimeout(200); await p.screenshot({path:OUT+'/11_offer_double_task.png'});
  ok('Double Task Bonus chip shown',await p.evaluate(()=>!document.getElementById('tipChip').hidden&&/×2 task bonus/.test(document.getElementById('tipChip').textContent)));
  m0=await p.evaluate(()=>__cp.S.money); await p.click('#tipChip'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__cp.S.money);
  ok('Double Task Bonus pays the task reward',m1-m0===60,'+'+(m1-m0));
  // VIP tip x2
  await p.evaluate(()=>__cp.UI.offerVip(37)); await p.waitForTimeout(200); await p.screenshot({path:OUT+'/12_offer_vip.png'});
  m0=await p.evaluate(()=>__cp.S.money); await p.click('#tipChip'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__cp.S.money);
  ok('VIP tip x2 pays the VIP bill again',m1-m0===37,'+'+(m1-m0));
  // Grand Opening
  await p.evaluate(()=>__cp.UI.offerOpening()); await p.waitForTimeout(200);
  m0=await p.evaluate(()=>__cp.S.money); await p.click('#tipChip'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__cp.S.money);
  ok('Grand Opening fixed +200',m1-m0===200,'+'+(m1-m0));
  // Buying Pad (coin bag): short on coins for the current purchase task
  await p.evaluate(()=>{const A=__cp,sp=A.SPOTS.find(s=>s.id==='cashier');sp.paid=0;A.S.money=40;A.UI._padSince=Date.now()-60000;});
  await p.waitForTimeout(400); await p.screenshot({path:OUT+'/13_buying_pad_chip.png'});
  const pad=await p.evaluate(()=>__cp.UI.padAmount());
  ok('Buying Pad chip when short',await p.evaluate(()=>!document.getElementById('bagChip').hidden),JSON.stringify(pad));
  ok('Buying Pad amount = shortfall, max 50% of price',pad.amount===130,'cashier 260, have 40 → +'+pad.amount);
  m0=await p.evaluate(()=>__cp.S.money); await p.click('#bagChip'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__cp.S.money);
  ok('Buying Pad pays',m1-m0===130,'+'+(m1-m0));
  // Coin Purchase from the Upgrade panel when an upgrade is too expensive
  await p.evaluate(()=>{__cp.S.money=0;}); await p.click('#bUpg'); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/13b_upgrade_coin_purchase.png'});
  ok('Coin Purchase button on unaffordable upgrade',await p.evaluate(()=>!!document.querySelector('.buy[data-ad]')));
  m0=await p.evaluate(()=>__cp.S.money); await p.click('.buy[data-ad]'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__cp.S.money);
  ok('Coin Purchase +100 and Upgrade panel reopens',m1-m0===100&&await p.evaluate(()=>!!document.querySelector('.tabs')),'+'+(m1-m0));
  await p.click('#mClose');
  await p.evaluate(()=>{__cp.UI._cd.coin_purchase=0;});
  // Coin Purchase (shop)
  await p.click('#plusBtn'); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/14_shop.png'});
  m0=await p.evaluate(()=>__cp.S.money); await p.click('#shopCoins'); await p.waitForTimeout(3200); m1=await p.evaluate(()=>__cp.S.money);
  ok('Coin Purchase fixed +100 then cooldown',m1-m0===100&&!(await p.evaluate(()=>__cp.UI.ready('coin_purchase'))),'+'+(m1-m0));
  ok('7 placements',await p.evaluate(()=>Object.values(__cp.AD_PLACEMENTS).map(p=>p.label).join()==='Double Task Bonus,Buying Pad,Meow Rush,VIP tip,Coin Purchase,Grand Opening,Oven Break'));
  // shop
    // ④ interstitial gating
  ok('Oven Break waits 60 s of play',await p.evaluate(()=>{__cp.Ads.lastRewardAt=-1e9;__cp.Ads.lastInterPlay=__cp.S.playTime;return !__cp.Ads.canInter()}));
  await p.evaluate(()=>{__cp.Ads.lastInterPlay=__cp.S.playTime-61;}); await p.waitForTimeout(1500);
  ok('Oven Break fires by itself after 60 s',await p.evaluate(()=>!!document.querySelector('.mx-admock')||__cp.Ads.log.some(l=>/Oven Break/.test(l.placement))));
  await p.waitForTimeout(2500);
  ok('Oven Break not again right away',await p.evaluate(()=>!__cp.Ads.canInter()));
  await p.waitForTimeout(3500);
  // settings + capsule
  await p.click('#bSet'); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/15_settings_tools.png'});
  await p.click('[data-x="cap"]'); await p.click('#mClose'); await p.waitForTimeout(300);
  await p.screenshot({path:OUT+'/16_capsule_on.png'});
  const overlap=await p.evaluate(()=>{const c=document.getElementById('mockCap').getBoundingClientRect(),pp=document.getElementById('progPill').getBoundingClientRect(),bo=document.getElementById('boostBtn').getBoundingClientRect();
    const hit=(a,b)=>!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);return [hit(c,pp),hit(c,bo)]});
  ok('HUD avoids TikTok capsule',!overlap[0]&&!overlap[1],JSON.stringify(overlap));
  // persistence
  await p.evaluate(()=>{__cp.S.money=4321;});await p.waitForTimeout(2300);
  ok('save written (memory fallback when localStorage is blocked)',await p.evaluate(()=>JSON.parse(__cp.PF.store.get('meowsakura.v3')).mx.shDay.length===10));
  ok('no page errors (web)',errs.length===0,errs.slice(0,3).join(' | '));
  await p.close();
  /* ---------- fake TikTok SDK ---------- */
  ({p,errs}=await boot(b,{sdk:true}));
  await p.waitForFunction(()=>window.__cpStarted,null,{timeout:30000});
  ok('detects TikTok SDK',await p.evaluate(()=>__cp.PF.mode==='tiktok'));
  await p.evaluate(()=>{window.__adLog=[];__cp.Ads.adapter={rewarded:l=>{__adLog.push('rw '+l);const m=window.__adMode||'ok';return new Promise((res,rej)=>setTimeout(()=>m==='err'?rej({code:1004}):res(m==='ok'),300))},interstitial:l=>{__adLog.push('in '+l);return Promise.resolve()}};const S=__cp.S;['register','oven1','table1','bin','table2','drink','renovate'].forEach(i=>S.bought[i]=true);S.task=__cp.TASKS.findIndex(t=>t.id==='t_pantry');S.mx.homeAsked=1;S.money=50});
  await p.waitForTimeout(2300);
  ok('save goes to setStorageSync',await p.evaluate(k=>!!window.__store[k],(fs.readFileSync(require('path').join(__dirname,'..','src','00_config.js'),'utf8').match(/SAVE_KEY='([^']+)'/)||[])[1]));
  ok('safe area from getWindowInfo',await p.evaluate(()=>document.getElementById('wrap').style.getPropertyValue('--sat')==='47px'));
  ok('capsule width applied',await p.evaluate(()=>document.getElementById('wrap').classList.contains('has-cap')));
  await p.screenshot({path:OUT+'/16_tiktok_hud.png'});
  await p.evaluate(()=>__cp.UI.startAd()); await p.waitForTimeout(700);
  ok('adapter rewarded: true → reward',await p.evaluate(()=>__cp.S.boostUntil>__cp.now));
  await p.evaluate(()=>{window.__adMode='quit';__cp.UI._offer=null;__cp.UI.offerTip(40)});await p.waitForTimeout(200);await p.click('#tipChip');await p.waitForTimeout(600);
  ok('adapter rewarded: false → no reward',await p.evaluate(()=>/whole ad/.test(document.getElementById('toast').textContent)));
  await p.evaluate(()=>{window.__adMode='err';__cp.S.boostUntil=0;__cp.S.boostCd=0;__cp.UI.startAd()});await p.waitForTimeout(600);
  ok('adapter reject → no reward, game resumes',await p.evaluate(()=>__cp.S.boostUntil<=__cp.now&&__cp.paused===0));
  await p.click('#sbHome'); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/17_tiktok_home_popup.png'});
  let a0=await p.evaluate(()=>__cp.S.money); await p.click('#mxGo'); await p.waitForTimeout(400);
  ok('SDK addShortcut + getShortcutMissionReward',await p.evaluate(()=>__cp.S.mx.home===1)&&(await p.evaluate(()=>__cp.S.money))>a0);
  await p.click('#sbRevisit'); await p.waitForTimeout(300); await p.click('#mxGo'); await p.waitForTimeout(100);
  await p.evaluate(()=>{window.__onHide&&window.__onHide();});
  ok('onHide pauses',await p.evaluate(()=>__cp.paused>0));
  await p.evaluate(()=>{window.__onShow&&window.__onShow({scene:'sidebar'});}); await p.waitForTimeout(300);
  ok('onShow resumes + revisit claimable',await p.evaluate(()=>__cp.paused===0&&!document.getElementById('mxClaim').disabled));
  await p.click('#mxClaim'); await p.waitForTimeout(300);
  await p.click('#sbShare'); await p.waitForTimeout(300); await p.click('#mxGo'); await p.waitForTimeout(400);
  const log=await p.evaluate(()=>__sdkLog);
  ok('adapter + SDK calls made',(await p.evaluate(()=>__adLog)).includes('rw Meow Rush')&&['addShortcut','startEntranceMission','share from=share'].every(x=>log.includes(x)),log.join(', '));
  ok('no page errors (sdk)',errs.length===0,errs.slice(0,3).join(' | '));
  await p.close();
  /* ---------- wide screen loading ---------- */
  ({p,errs}=await boot(b,{vw:1280,vh:720})); await p.waitForTimeout(500); await p.screenshot({path:OUT+'/18_loading_desktop.png'});
  await p.waitForFunction(()=>window.__cpStarted,null,{timeout:30000}); await p.close();
  await b.close();
  console.log(results.join('\n')); console.log(results.filter(r=>r.startsWith('FAIL')).length+' failed of '+results.length);
})().catch(e=>{console.error(e);process.exit(1)});
