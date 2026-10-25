/* =====================================================================
   65n_hs.js — TikTok NATIVE build only: HS TikTok SDK (hs-game.js 3.0.0 +
   hs-tiktok-sdk 1.0.7). The game reports moments by key; the HS dashboard
   (or HS_DEFAULTS below when offline) decides what they give; every reward
   arrives in hsGive (onGive). Ads are shown by placement label.
   ===================================================================== */
/* Meow Sakura credentials live in meow-config.js next to game.js (fill in before uploading) */
const HS_CFG=(function(){ try{ const c=(typeof require==='function')?require('./meow-config.js'):{}; return {gameId:String(c.appId||''),sdkKey:String(c.hsSdkKey||'')}; }catch(e){ return {gameId:'',sdkKey:''}; } })();
/* Same as the iaa_config "rewards" / "items" in Meow_Sakura.hs-dashboard.json */
const HS_DEFAULTS={
  rewards:{
    'Double Task Bonus':{ task_bonus:1 },          // x the reward of the task just finished
    'Buying Pad':       { coin_bag:1 },            // x the coins still missing for the current purchase
    'Meow Rush':        { meow_rush:1 },           // 2x kitchen speed for 60 s
    'VIP tip':          { vip_bonus:1 },           // x the bill the VIP just paid
    'Coin Purchase':    { coins:100 },
    'Grand Opening':    { coins:200 },
    share:              { coins:50, $limit:'daily' },
    tiktok_shortcut:    { coins:100 },                       // add to home screen (once)
    tiktok_profile:     { coins:100, $limit:'daily' },       // revisit gift from the TikTok profile
  },
  items:{
    coins:     { category:'currency', name:'Coins' },
    meow_rush: { category:'boost',    name:'Meow Rush' },
    task_bonus:{ category:'bonus',    name:'Task bonus' },
    vip_bonus: { category:'bonus',    name:'VIP tip' },
    coin_bag:  { category:'bonus',    name:'Coin bag' },
  },
};
const HSB={
  ctx:{},   // amounts of the ad moment being watched (task reward, VIP bill, shortfall)
  ok(){ return !!(HSGame&&HSGame.ready); },
  label(from){ return ({'Coin Purchase':'Coin purchase','Grand Opening':'Grand opening',share:'Share gift',tiktok_profile:'Revisit gift',tiktok_shortcut:'Home screen bonus'})[from]||'Reward'; },
  /* always start when the kit loaded: with placeholder credentials login simply fails -> ads/cloud off, game still plays */
  start(){ if(!HSGame) return; if(!/^sk_/.test(HS_CFG.sdkKey)||/YOUR_/.test(HS_CFG.gameId)) console.warn('[HS] meow-config.js not filled in yet: ads/missions/cloud stay off');
    HSGame.start({ gameId:HS_CFG.gameId, sdkKey:HS_CFG.sdkKey, defaults:HS_DEFAULTS, onGive:hsGive, onLoad:hsLoad })
      .then(r=>{ console.log('[HS] start',JSON.stringify(r)); HSB.trace(); HSB.cloud(true); })
      .catch(e=>console.warn('[HS] start failed',e&&e.message)); },
  /* list every placement once after start (hs-check's static scan misses labels with spaces) */
  trace(){ for(const k in AD_PLACEMENTS){ const l=AD_PLACEMENTS[k].label; let c=false; try{ c=HSGame.canShowAd(l); }catch(e){} console.log('[HS] canShowAd('+JSON.stringify(l)+') =',c); } },
  /* reward amounts shown to players come from the dashboard (HSGame.rewards), DEFAULTS when offline */
  amt(key,fb){ try{ const r=HSGame&&HSGame.rewards(key); if(r&&Number(r.coins)>0) return Number(r.coins); }catch(e){} return fb; },
  /* cloud save: one plain progress object (the save state minus timers), debounced */
  prog(){ const o=JSON.parse(JSON.stringify(S)); o.boostUntil=0; o.boostCd=0; return o; },
  _ct:0,
  cloud(now){ if(!HSGame||!HSGame.save) return; clearTimeout(HSB._ct); const f=()=>{ try{ HSGame.save(HSB.prog()); }catch(e){} }; if(now) f(); else HSB._ct=setTimeout(f,1500); },
};
/* THE only place HS rewards are given. Throws for an item it does not know -> nothing is recorded, nothing lost. */
function hsGive(items,from){
  const plan=[];
  for(const id in items){ const n=Number(items[id])||0; if(n<=0) continue;
    const it=(HSGame&&HSGame.item(id))||HS_DEFAULTS.items[id]||{}, cat=it.category;
    if(cat==='currency') plan.push(()=>UI.grant(n,HSB.label(from)));
    else if(cat==='boost') plan.push(()=>UI.startRush());
    else if(cat==='bonus'){
      const base=id==='task_bonus'?(HSB.ctx.task||CFG.ads.doubleTask.min):id==='vip_bonus'?(HSB.ctx.vip||20):id==='coin_bag'?(HSB.ctx.pad||((UI.padAmount&&UI.padAmount())||{}).amount||50):0;
      if(!base) throw new Error('unknown bonus item '+id);
      plan.push(()=>UI.grant(Math.round(base*n),it.name||'Bonus')); }
    else throw new Error('unknown item '+id+' ('+cat+')'); }
  plan.forEach(f=>f());   /* only after every item was understood */
}
/* new phone / reinstall: keep the FURTHER progress (later task wins; same task -> more coins), apply, save the merge */
function hsLoad(cloud){
  if(!cloud||typeof cloud!=='object'||!(Number(cloud.task)>=0)) return;
  const further=cloud.task>S.task||(cloud.task===S.task&&Number(cloud.money)>S.money);
  if(further){ const f=freshState(); const s=Object.assign(f,cloud); s.stats=Object.assign(freshState().stats,cloud.stats||{}); if(!s.mx||typeof s.mx!=='object') s.mx={};
    S=s; if(!S.taskBase) S.taskBase=statSnap(); S.stage=curStage(); SPOTS.forEach(x=>x.paid=0); customers=[]; workers=[]; FOODS.forEach(k=>tray[k]=0); player.carry=[]; stations=[]; tables=[];
    rebuildWorld(false); refreshSolids(); buildFloorCache(TW); UI._last={}; UI.setTask(); UI.toast('Progress restored ☁️'); }
  save(); HSB.cloud(true);
}
{ const _save=save; save=function(){ _save(); HSB.cloud(false); }; }
['share','revisit','home'].forEach(k=>{ const key={share:'share',revisit:'tiktok_profile',home:'tiktok_shortcut'}[k], fb=CFG.gifts[k];
  Object.defineProperty(CFG.gifts,k,{get:()=>HSB.amt(key,fb),configurable:true}); });
/* ---- ads through HSGame.showAd(label) ---- */
UI.adOk=key=>{ const pl=AD_PLACEMENTS[key]; return !!pl&&HSB.ok()&&HSGame.canShowAd(pl.label); };
Ads.rewarded=function(key,onReward,meta){ meta=meta||{}; const pl=AD_PLACEMENTS[key]; if(Ads.busy||!pl) return;
  if(!HSB.ok()){ UI.toast('No ad available right now — try later'); return; }
  HSB.ctx=Object.assign({},meta.ctx||{}); Ads.busy=true; PF.emit('pause','ad'); const t0=Date.now();
  HSGame.showAd(pl.label).then(r=>{ Ads.busy=false; PF.emit('resume','ad'); Ads.log.push({placement:pl.label,res:{ended:r!==null,error:r===null?HSGame.lastAdError:''},at:t0});
    if(r===null){ const e=HSGame.lastAdError; UI.toast(e==='skipped'?'Watch the whole ad to get the reward':e==='claimed'?'Already claimed':'No ad available right now — try later'); return; }
    Ads.lastRewardAt=Date.now(); S.mx.ads=(S.mx.ads||0)+1; try{ meta.after&&meta.after(); }catch(e){ console.error(e); } save(); }); };
Ads.interstitial=function(reason){ if(!Ads.canInter()) return false; Ads.lastInterPlay=S.playTime;
  if(!HSB.ok()||!HSGame.canShowAd('Grill Break')) return false;
  UI.toast('Grill break 🍔');
  setTimeout(()=>{ if(UI.modalOpen||Ads.busy) return; Ads.busy=true; PF.emit('pause','ad');
    HSGame.showAd('Grill Break').then(r=>{ Ads.busy=false; PF.emit('resume','ad'); Ads.log.push({placement:'Grill Break ('+reason+')',res:{ended:r!==null},at:Date.now()}); }); },900);
  return true; };
/* ---- gifts: TikTok missions + share go through HSGame; onGive pays them ---- */
UI.giftPay=()=>{};
UI.homeDone=()=>HSGame?HSGame.tiktokMission.done('shortcut'):!!S.mx.home;
UI.revisitClaimed=()=>HSGame?HSGame.tiktokMission.done('profile'):S.mx.rvDay===dayKey();
UI.shareClaimed=()=>HSGame?!HSGame.available('share'):S.mx.shDay===dayKey();
UI.refreshRevisit=()=>{ UI._rvCan=true; };
PF.canShortcut=()=>!HSGame||HSGame.tiktokMission.supported('shortcut');
PF.canRevisit=()=>!HSGame||HSGame.tiktokMission.supported('profile');
PF.addHome=()=>HSGame?HSGame.tiktokMission.start('shortcut').then(s=>s==='started'?{ok:true}:{ok:false,err:s}):Promise.resolve({ok:false,err:'unsupported'});
PF.shortcutReward=()=>Promise.resolve(false);   /* paid by onGive when TikTok confirms */
PF.startRevisit=()=>HSGame?HSGame.tiktokMission.start('profile').then(s=>s==='started'?{ok:true}:{ok:false,err:s}):Promise.resolve({ok:false,err:'unsupported'});
PF.revisitReward=()=>HSGame?HSGame.tiktokMission.refresh().then(()=>HSGame.tiktokMission.done('profile')):Promise.resolve(false);
PF.share=()=>HSGame?HSGame.share({title:'Meow Sakura',subtitle:'Run the cutest sakura burger diner in town!'}).then(r=>r!==null||HSGame.lastShareError==='claimed'?{ok:true}:{ok:false,err:HSGame.lastShareError}):Promise.resolve({ok:false,err:'unsupported'});
{ const o=UI.openRevisit; UI.openRevisit=function(){ UI._rvCan=true; o.call(UI); }; }
