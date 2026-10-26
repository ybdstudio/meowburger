/* =====================================================================
   60n_ui_canvas.js — TikTok NATIVE build only: the whole HUD, modals and
   popups drawn on the game canvas (the native runtime has no DOM / CSS).
   Same UI API as 60_ui.js + 65_minis_ui.js, so the game code is unchanged.
   Images: img/ (main package) and art/ (subpackage), see build_native.py.
   ===================================================================== */
const $=()=>null; // DOM lookups do not exist natively
const FONT='"Fredoka","Arial Rounded MT Bold","PingFang SC","Helvetica Neue",sans-serif';
const C={ink:'#5a3424',cream:'#fff4e3',cream2:'#ffe9c9',wood:'#d98f52',red:'#e2463f',green:'#62b552',greenLt:'#7ed957',gold:'#f8c84a',blue:'#5cb4f0',brown2:'#8a5a3a',dk:'#6b3b22'};
const IMGS={};
const ut=()=>Date.now()/1000; /* UI clock (the game clock `now` stops while paused) */
function fmtTime(s){s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function phaseOf(ti){for(let i=TASK_PHASE.length-1;i>=0;i--){const a=taskIndex(TASK_PHASE[i].from);if(ti>=a){const b=taskIndex(TASK_PHASE[i].to);return{start:a,total:b-a+1}}}return{start:0,total:1}}
const STAGE_DESC=['Cash register, chicken fryer, tables and the first drink.','Walls go up: storage shelf, burger grill, manager office.','New dining hall, fries, salad, runners, cleaner and the VIP booth.','Bigger kitchen, the Deluxe Burger, second floor and the grand opening.'];
function img(path){ let e=IMGS[path]; const t=Date.now();
  if(!e||(e.st==='bad'&&t-e.t>1500)){ const m=PF.createImage(); e=IMGS[path]={m,st:'load',t}; m.onload=()=>{e.st='ok'}; m.onerror=()=>{e.st='bad';e.t=Date.now()}; m.src=path; }
  return e.st==='ok'?e.m:null; }
const icon=k=>img('img/ic_'+k+'.png');
/* ---------- drawing helpers (all in CSS px; ctx already scaled by DPR) ---------- */
function rrp(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.arcTo(x+w,y,x+w,y+r,r);g.lineTo(x+w,y+h-r);g.arcTo(x+w,y+h,x+w-r,y+h,r);g.lineTo(x+r,y+h);g.arcTo(x,y+h,x,y+h-r,r);g.lineTo(x,y+r);g.arcTo(x,y,x+r,y,r);g.closePath()}
function box(x,y,w,h,r,fill,stroke,lw=2.5,shadow=3){ const g=ctx;
  if(shadow){rrp(g,x,y+shadow,w,h,r);g.fillStyle='rgba(90,52,36,.32)';g.fill()}
  rrp(g,x,y,w,h,r); if(fill){ if(Array.isArray(fill)){const gr=g.createLinearGradient(0,y,0,y+h);fill.forEach((c,i)=>gr.addColorStop(i/(fill.length-1),c));g.fillStyle=gr}else g.fillStyle=fill; g.fill(); }
  if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.stroke()} }
function font(sz,w=700){return w+' '+sz+'px '+FONT}
function txt(s,x,y,sz,col=C.ink,align='left',w=700,stroke=null,sw=0){ const g=ctx; g.font=font(sz,w); g.textAlign=align; g.textBaseline='middle';
  if(stroke){g.lineJoin='round';g.lineWidth=sw;g.strokeStyle=stroke;g.strokeText(s,x,y)} g.fillStyle=col; g.fillText(s,x,y); }
function tw(s,sz,w=700){ctx.font=font(sz,w);return ctx.measureText(s).width}
const WRAPC={};
function wrap(s,maxW,sz,w=600){ const key=s+'|'+Math.round(maxW)+'|'+sz+'|'+w; if(WRAPC[key]) return WRAPC[key]; const words=String(s).split(' '),lines=[];let cur='';
  for(const wd of words){const t=cur?cur+' '+wd:wd; if(tw(t,sz,w)>maxW&&cur){lines.push(cur);cur=wd}else cur=t} if(cur)lines.push(cur); return WRAPC[key]=lines; }
function para(s,x,y,maxW,sz,col,w=600,lh=1.25,align='left'){ const L=wrap(s,maxW,sz,w); L.forEach((l,i)=>txt(l,align==='center'?x+maxW/2:x,y+sz*lh*(i+.5),sz,col,align,w)); return L.length*sz*lh; }
function ellip(s,maxW,sz,w=700){ if(tw(s,sz,w)<=maxW) return s; while(s.length>1&&tw(s+'…',sz,w)>maxW) s=s.slice(0,-1); return s+'…'; }
function drawImg(m,x,y,w,h){ if(m) ctx.drawImage(m,x,y,w,h); }
function bar(x,y,w,h,p,fill=['#9be07f','#62b552'],label){ box(x,y,w,h,h/2,'#e9d8bd',C.ink,2,0); if(p>0){ctx.save();rrp(ctx,x,y,w,h,h/2);ctx.clip();box(x,y,w*Math.min(1,p),h,0,fill,null,0,0);ctx.restore();rrp(ctx,x,y,w,h,h/2);ctx.lineWidth=2;ctx.strokeStyle=C.ink;ctx.stroke()}
  if(label) txt(label,x+w/2,y+h/2+.5,Math.min(13,h*.68),C.ink,'center'); }
/* ---------- hit regions ---------- */
let HITS=[], PRESS=null, DRAG=null, CLIP=null;
function hit(x,y,w,h,fn,id){ if(CLIP){ const a=Math.max(y,CLIP.y), b=Math.min(y+h,CLIP.y+CLIP.h); if(b<=a) return; y=a; h=b-a; } HITS.push({x,y,w,h,fn,id:id||(x|0)+','+(y|0)}); }
const pressed=id=>PRESS&&PRESS.hit.id===id;
function button(x,y,w,h,label,fn,o={}){ const id=o.id||label+x+','+y, on=!o.disabled, dn=on&&pressed(id), dy=dn?2:0;
  const fill=!on?['#e2dad3','#c9bfb6']:o.fill||['#9be07f','#4fa63f'];
  box(x,y+dy,w,h,o.r||10,fill,on?(o.stroke||C.ink):'#8f7f73',o.lw||2.5,dn?1:3);
  const ic=o.icon?icon(o.icon):null, isz=o.isz||Math.min(22,h*.6), lab=String(label), sz=o.sz||Math.min(15,h*.42);
  const total=(ic?isz+4:0)+tw(lab,sz); let cx=x+w/2-total/2;
  if(ic){ const ih=o.icon==='ad'?isz*.7:isz; ctx.drawImage(ic,cx,y+dy+h/2-ih/2,isz,ih); cx+=isz+4; }
  if(o.dark) txt(lab,cx,y+dy+h/2+1,sz,on?'#4a2414':'#f7f2ee','left');
  else txt(lab,cx,y+dy+h/2+1,sz,'#fff','left',700,on?C.ink:'#8f7f73',3);
  if(on) hit(x,y,w,h,fn,id); }
/* ---------- UI state + API (same surface as the DOM UI) ---------- */
const UI={
  modalOpen:false,_last:{},hintHidden:false,hintA:1,_toast:null,_banner:null,_bumpT:0,_popT:0,_done:null,_modal:null,_scroll:0,_scrollMax:0,
  _offer:null,_cd:{},_padSince:0,_rvCan:false,_ins:{top:0,bottom:0,capW:0,capB:0},_lp:0,_loadTxt:'',_mock:null,_sheet:null,
  init(){ UI.applyInsets(); ['coin','star','pin','shop','upgrade','task','map','gear','speed','capacity','storage','supplier','run','carry','price','flow','lock','check','ad','share'].forEach(k=>icon(k)); for(let i=0;i<4;i++) img('img/stage_'+i+'.png');
 },
  applyInsets(){ const r=PF.insets(); UI._ins=r; },
  /* --- simple feedback --- */
  toast(msg){ UI._toast={msg,t:ut(),dur:1.5}; },
  banner(title,sub){ UI._banner={title,sub,t:ut()}; sfx('level'); },
  hideHint(){ UI.hintHidden=true; },
  bump(){ UI._bumpT=ut(); },
  setTask(){ UI._done=null; UI._popT=ut(); },
  taskComplete(t,r){ UI._done={r}; },
  moneyPt(){ return UI._coinPt||[30,UI._ins.top+25]; },
  close(){ UI._modal=null; UI.modalOpen=false; UI._rvPopup=false; },
  open(kind,arg){ UI._modal={kind,arg}; UI.modalOpen=true; UI._scroll=0; joy.active=false; },
  openUpgrade(tab){ const tabs=UI.upTabs(); tab=tab||UI._tab||(tabs.find(t=>t[2]())||tabs[0])[0]; UI._tab=tab; UI.open('upgrade',tab); },
  openTasks(){UI.open('tasks')}, openMap(){UI.open('map')}, openShop(){UI.open('shop')}, openSettings(){UI._armed=false;UI.open('settings')},
  milestone(){UI.open('milestone')}, openHome(){UI.open('home')}, openShare(){UI.open('share')},
  openRevisit(){ UI._rvPopup=true; UI.open('revisit'); },
  upTabs(){ return [['kitchen','Kitchen',()=>S.task>=taskIndex('t_upgrade')&&S.bought.oven1,'Buy the oven and finish the tutorial first'],['manager','Manager',()=>!!S.bought.office,'Open the manager office to unlock'],['rest','Restaurant',()=>S.task>=taskIndex('t_serve5'),'Serve your first customers to unlock']]; },
  /* --- loading screen (drawn directly, the frame loop is not running yet) --- */
  loading(p,t){ p=Math.max(UI._lp,Math.min(1,p)); UI._lp=p; if(t) UI._loadTxt=t; UI.drawLoading(); },
  drawLoading(){ const g=ctx; g.setTransform(DPR,0,0,DPR,0,0); g.fillStyle='#f3b97a'; g.fillRect(0,0,W,H);
    const bg=img('img/loading_bg.jpg'); if(bg){ const k=W/H<.7?Math.max(W/bg.width,H/bg.height):Math.min(W/bg.width,H/bg.height); const w=bg.width*k,h=bg.height*k; g.drawImage(bg,(W-w)/2,(H-h)*.4,w,h); }
    const bw=Math.min(300,W*.64), bh=24, bx=(W-bw)/2, by=H-UI._ins.bottom-H*.09-bh;
    rrp(g,bx-3,by-3,bw+6,bh+6,15); g.fillStyle='#fff'; g.fill(); g.lineWidth=3; g.strokeStyle=C.ink; g.stroke();
    box(bx,by,bw,bh,12,'#7a3f1d',null,0,0); if(UI._lp>0) box(bx+2,by+2,(bw-4)*UI._lp,bh-4,10,['#ffe27a','#f9c02b','#e8a312'],null,0,0);
    const paw=img('img/paw_thumb.png'); if(paw) g.drawImage(paw,bx+2+(bw-4)*UI._lp-21,by+bh/2-21,42,42);
    txt((UI._loadTxt||'Loading…')+' '+Math.round(UI._lp*100)+'%',W/2,by+bh+22,15,'#fff','center',700,C.ink,4);
    txt('v'+VERSION+' native',W-8,H-UI._ins.bottom-8,10,'rgba(255,255,255,.85)','right',600,'rgba(90,52,36,.6)',2); },
  drawError(msg){ const g=ctx; g.setTransform(DPR,0,0,DPR,0,0); g.fillStyle=C.cream; g.fillRect(0,0,W,H);
    txt('The game could not start',W/2,H*.4,20,C.red,'center'); para(String(msg).slice(0,300),24,H*.45,W-48,12,C.ink,500,1.3,'center'); },
  /* ===================== per-frame logic (no drawing) ===================== */
  frame(){ UI.minisFrame(); },
  giftsOn(){ return S.task>=taskIndex(CFG.gifts.showAfter); },
  revisitClaimed(){ return S.mx.rvDay===dayKey(); }, shareClaimed(){ return S.mx.shDay===dayKey(); }, homeDone(){ return !!S.mx.home; },
  afterBoot(){ UI.applyInsets(); UI.refreshRevisit(true); }, onShow(){ UI.applyInsets(); UI.refreshRevisit(true); },
  refreshRevisit(autoOpen){ if(!PF.canRevisit()) return; PF.revisitReward().then(can=>{ UI._rvCan=can;
    if(autoOpen&&!DEBUG.noModal&&can&&!UI.revisitClaimed()&&UI.giftsOn()&&!UI.modalOpen) setTimeout(()=>{if(!UI.modalOpen)UI.openRevisit()},1200); }); },
  minisFrame(){ UI.padTick(); UI.interTick();
    if(UI._offer&&(UI.modalOpen||Ads.busy)) UI._offer.until=Math.max(UI._offer.until,Date.now()+UI._offer.secs*1000);
    if(!DEBUG.noModal&&!S.mx.homeAsked&&!UI.modalOpen&&!Ads.busy&&PF.canShortcut()&&!UI.homeDone()&&S.task>taskIndex('t_renovate')&&taskDoneT<=0){ S.mx.homeAsked=1; save(); setTimeout(()=>{if(!UI.modalOpen)UI.openHome()},800); } },
  grant(a,label){ a=Number(a); if(!(a>0)) return; S.money+=a; for(let i=0;i<Math.min(8,Math.ceil(a/20));i++) setTimeout(()=>fly('coinHud',[player.x,player.y,1.4],null,.5),i*60);
    UI.bump(); UI.toast(label+' +'+fmtNum(a)); sfx('coin'); PF.vibrate(); save(); },
  ready(key){ return Date.now()>=(UI._cd[key]||0); },
  adOk(){ return true; }, /* HS bridge: is an ad set up for this place right now */
  giftPay(amt,label){ UI.grant(amt,label); }, /* HS bridge: gifts are paid by onGive instead */
  offer(key,text,secs,onReward,cd,ctxv){ if(!UI.ready(key)||!UI.giftsOn()||!UI.adOk(key)) return; UI._offer={key,text,secs,until:Date.now()+secs*1000,onReward,cd,ctx:ctxv||{},t:ut()}; },
  watchOffer(){ const o=UI._offer; if(!o||Ads.busy) return; UI._offer=null; const cd=()=>{ UI._cd[o.key]=Date.now()+(o.cd||0)*1000; }; Ads.rewarded(o.key,()=>{ cd(); o.onReward(); },{ctx:o.ctx,after:cd}); },
  offerTip(r){ const c=CFG.ads.doubleTask; if(r<c.min) return; r=Math.min(r,c.max); UI.offer('double_task','×2 task bonus +'+r,c.show,()=>UI.grant(r,'Double task bonus'),c.cd,{task:r}); },
  offerVip(amt){ const c=CFG.ads.vipTip; if(!amt) return; UI.offer('vip_tip','VIP tip ×2 +'+amt,c.show,()=>UI.grant(amt,'VIP tip ×2'),c.cd,{vip:amt}); },
  offerOpening(){ const c=CFG.ads.grandOpening; UI.offer('grand_opening','Grand opening +'+c.reward,c.show,()=>UI.grant(c.reward,'Grand opening'),0); },
  padAmount(){ const t=curTask(); if(t.kind!=='buy') return null; const sp=spotById(t.spot); if(!sp||S.bought[sp.id]||!spotVisible(sp)) return null;
    const rest=sp.cost-(sp.paid||0), short=rest-S.money; if(short<=0) return null;
    return {label:sp.label, amount:Math.min(Math.ceil(short/10)*10, Math.max(10,Math.round(sp.cost*CFG.ads.buyingPad.maxShare/10)*10))}; },
  watchPad(){ const p=UI.padAmount(); if(!p||Ads.busy||!UI.ready('buying_pad')) return;
    const cd=()=>{ UI._cd.buying_pad=Date.now()+CFG.ads.buyingPad.cd*1000; UI._padSince=0; };
    Ads.rewarded('buying_pad',()=>{ cd(); UI.grant(p.amount,'Coin bag'); },{ctx:{pad:p.amount},after:cd}); },
  padTick(){ const p=UI.padAmount(), n=Date.now(); if(!p) UI._padSince=0; else if(!UI._padSince) UI._padSince=n;
    UI._padOn=!!p&&UI._padSince&&n-UI._padSince>CFG.ads.buyingPad.stuck*1000&&UI.ready('buying_pad')&&!Ads.busy&&UI.giftsOn()&&UI.adOk('buying_pad'); UI._pad=p; },
  interTick(){ if(Ads.canInter()) Ads.interstitial('timer'); },
  onTaskAdvance(){}, onStageUp(){ UI.offerOpening(); },
  startAd(){ if(isBoost()||now<S.boostCd||UI.modalOpen||Ads.busy) return;
    Ads.rewarded('meow_rush',()=>UI.startRush(),{}); },
  startRush(){ S.boostUntil=now+CFG.ads.rush.dur;S.boostCd=now+CFG.ads.rush.dur+CFG.ads.rush.cd;UI.toast('Meow Rush! 2× speed for 1 min');sfx('level'); },
  watchCoins(after){ if(!UI.ready('coin_purchase')||Ads.busy) return; const c=CFG.ads.coinPurchase;
    const done=()=>{UI._cd.coin_purchase=Date.now()+c.cd*1000;after&&after()};
    Ads.rewarded('coin_purchase',()=>{UI.grant(c.reward,'Coin purchase');done()},{after:done}); },
  /* mock overlays (only used before the HS SDK adapter is plugged in / outside TikTok) */
  mockAd(label,rw,done){ UI._mock={label,rw,t0:Date.now(),n:rw?3:2,done};
    if(PF.mock.adQuitNext){PF.mock.adQuitNext=false;setTimeout(()=>UI._mockEnd(false),700)} },
  _mockEnd(ended){ const m=UI._mock; if(!m) return; UI._mock=null; m.done(ended); },
  mockSheet(title,body,okTxt,noTxt){ return new Promise(res=>{ UI._sheet={title,body,okTxt,noTxt,res}; }); },
  /* ===================== drawing ===================== */
  draw(){ HITS=[]; CLIP=null; const g=ctx; g.setTransform(DPR,0,0,DPR,0,0); g.textBaseline='middle';
    if(UI._mock){ UI.drawMockAd(); return; }
    UI.drawHud(); UI.drawFeedback();
    if(UI._modal) UI.drawModal();
    if(UI._sheet) UI.drawSheet(); },
  drawHud(){ const I=UI._ins, L=10, T=I.top+8, t=ut();
    /* coin pill */
    const mt=fmtNum(S.money), bump=t-UI._bumpT<.25?1+Math.sin((t-UI._bumpT)/.25*Math.PI)*.07:1;
    const cw=4+28+4+Math.max(42,tw(mt,17))+4+24+8; ctx.save(); ctx.translate(L+cw/2,T+17); ctx.scale(bump,bump); ctx.translate(-(L+cw/2),-(T+17));
    box(L,T,cw,34,17,C.cream,C.ink); drawImg(icon('coin'),L+4,T+3,28,28); UI._coinPt=[L+18,T+17];
    txt(mt,L+36+Math.max(42,tw(mt,17)),T+18,17,C.ink,'right'); ctx.restore();
    button(L+cw-30,T+5,24,24,'+',()=>UI.openShop(),{fill:[C.greenLt,C.greenLt],r:7,lw:2,sz:18,id:'plus'});
    /* level pill */
    const lt=String(S.level), lw=4+28+4+tw(lt,17)+10, lx=L+cw+6; box(lx,T,lw,34,17,C.cream,C.ink); drawImg(icon('star'),lx+4,T+3,28,28); txt(lt,lx+36,T+18,17);
    /* progress pill */
    const px=lx+lw+6, maxR=W-10-I.capW, pw=Math.max(84,Math.min(150,maxR-px));
    const ph=phaseOf(S.task), dn=Math.max(0,Math.min(ph.total,S.task-ph.start));
    box(px,T,pw,34,17,C.cream,C.ink); bar(px+4,T+6,pw-30,22,dn/ph.total,['#9be07f','#62b552'],dn+'/'+ph.total); drawImg(icon('pin'),px+pw-24,T-8,22,28); hit(px,T,pw,34,()=>UI.openMap(),'prog');
    /* Meow Rush */
    const show=S.task>=taskIndex('t_serve5');
    if(show){ const bx=W-10-78, by=Math.max(T+48,I.capB+8), on=isBoost(), sub=on?Math.ceil(S.boostUntil-now)+'s left':now<S.boostCd?'ready in '+Math.ceil(S.boostCd-now)+'s':'for 1 min';
      const dy=pressed('rush')?2:0; box(bx,by+dy,78,66,12,C.cream,C.ink,2.5,dy?1:3); ctx.save(); rrp(ctx,bx,by+dy,78,66,12); ctx.clip(); ctx.fillStyle=on?C.green:C.blue; ctx.fillRect(bx,by+dy+30,78,40); ctx.restore(); rrp(ctx,bx,by+dy,78,66,12); ctx.lineWidth=2.5; ctx.strokeStyle=C.ink; ctx.stroke();
      txt('MEOW RUSH',bx+39,by+dy+10,11,C.ink,'center'); txt('×2 SPEED',bx+39,by+dy+23,14,'#3f8f35','center'); txt(sub,bx+39,by+dy+50,11,'#fff','center',700,C.ink,3);
      hit(bx,by,78,66,()=>UI.startAd(),'rush'); }
    /* coin bag (Buying Pad) chip */
    let sideY=T+46;
    if(UI._padOn){ const s='+'+UI._pad.amount; UI.chip(L,T+42,s,()=>UI.watchPad(),'bag',28); sideY+=36; }
    /* side gift buttons */
    { const items=[]; /* shown from the first frame after loading */ items.push(['btn_revisit',()=>UI.openRevisit(),!UI.revisitClaimed()]); items.push(['btn_share',()=>UI.openShare(),!UI.shareClaimed()]);
      items.push(['btn_home',()=>UI.openHome(),false]); /* always visible, even after the bonus */
      for(const [k,fn,badge] of items){ const m=img('art/ui/'+k+'.png'), w=58, h=m?w*m.height/m.width:58, dy=pressed(k)?2:0;
        if(m) ctx.drawImage(m,L-2,sideY+dy,w,h); else box(L-2,sideY,w,h,12,C.cream,C.ink);
        if(badge){ const bx=L-2+w-4, by=sideY+3+Math.sin(t*4)*1.5; ctx.beginPath(); ctx.arc(bx,by,11,0,7); ctx.fillStyle='#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(bx,by,9,0,7); ctx.fillStyle=C.red; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle=C.ink; ctx.stroke(); txt('!',bx,by+1,14,'#fff','center'); }
        hit(L-2,sideY,w,h,fn,k); sideY+=h+6; } }
    /* bottom: dock + task card */
    const dockW=Math.min(W-20,5*82+4*6), bw=Math.min(W>=700?82:76,(dockW-24)/5), bh=bw*1.02, dockY=H-I.bottom-8-bh, gap=(dockW-5*bw)/4, dx0=(W-dockW)/2;
    const dock=[['Shop','shop',['#ffc061','#f08d3c'],()=>UI.openShop()],['Upgrade','upgrade',['#8fd86a','#4fa63f'],()=>UI.openUpgrade()],['Task','task',['#f07a5c','#c9452f'],()=>UI.openTasks()],['Map','map',['#7cc8f5','#3f93d6'],()=>UI.openMap()],['Settings','gear',['#8a6a58','#5e4334'],()=>UI.openSettings()]];
    dock.forEach(([lab,ic,fill,fn],i)=>{ const x=dx0+i*(bw+gap), dy=pressed('d'+lab)?2:0; box(x,dockY+dy,bw,bh,14,fill,C.ink,2.5,dy?1:3); drawImg(icon(ic),x+bw*.19,dockY+dy+bh*.1,bw*.62,bw*.62); txt(lab,x+bw/2,dockY+dy+bh*.84,12,'#fff','center',700,C.ink,3); hit(x,dockY,bw,bh,fn,'d'+lab); });
    UI.drawTaskCard(L,dockY-8,Math.min(360,W-20-74));
    if(CFG.autoPlay){ const r=31, cx=W-10-r, cy=dockY-8-r, on=!!S.auto, dy=pressed('auto')?2:0, pul=on?1+Math.sin(t*4.5)*.04:1;
      ctx.save(); ctx.translate(cx,cy+dy); ctx.scale(pul,pul); ctx.beginPath(); ctx.arc(0,3,r,0,7); ctx.fillStyle='rgba(90,52,36,.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.fillStyle=on?'#7ed957':'#d9cbb8'; ctx.fill(); ctx.lineWidth=3; ctx.strokeStyle=C.ink; ctx.stroke();
      txt('AUTO',0,-4,15,C.ink,'center',700); txt((on?'ON':'OFF')+(gameSpeed()>1?' ×'+gameSpeed():''),0,12,11,C.ink,'center',600); ctx.restore();
      hit(cx-r,cy-r,2*r,2*r,()=>{ S.auto=S.auto?0:1; AUTOP.manualT=0; AUTOP.cur=null; save(); UI.toast(S.auto?'Auto play ON — drag to take over':'Auto play OFF'); },'auto'); }
    /* hint */
    if(UI.hintHidden) UI.hintA=Math.max(0,UI.hintA-.03); if(UI.hintA>0){ ctx.globalAlpha=UI.hintA; txt('Drag anywhere to move',W/2,dockY-110,13,'#fff','center',600,C.ink,3); ctx.globalAlpha=1; } },
  chip(x,y,label,fn,id,h=34){ const s=h>30?15:13, w=6+24+5+tw(label,s)+10, dy=pressed(id)?2:0; box(x,y+dy,w,h,h/2,['#ffe27a','#f6bd2b'],C.ink,2.5,dy?1:3);
    drawImg(icon('ad'),x+6,y+dy+h/2-8.5,24,17); txt(label,x+35,y+dy+h/2+1,s,C.ink); hit(x,y,w,h,fn,id); return w; },
  drawTaskCard(x,bottom,w){ const t=curTask(), [p,n]=taskProgress(t), sg=sideGoal(), h=sg?72:54, y=bottom-h, done=!!UI._done, pop=Math.min(1,(ut()-UI._popT)/.45);
    ctx.save(); ctx.globalAlpha=pop; ctx.translate(0,(1-pop)*12);
    box(x,y,w,h,14,done?'#e9fbe0':C.cream,done?'#3f8f35':C.ink); box(x+6,y+(sg?10:10),34,34,9,C.red,C.ink,2,0); drawImg(icon('task'),x+11,y+15,24,24);
    const rx=x+w-10; let tx=x+48, maxT=w-58;
    if(!done&&t.reward){ const rs='+'+t.reward, rw=tw(rs,13)+20; drawImg(icon('coin'),rx-rw,y+19,18,18); txt(rs,rx,y+28,13,'#3f8f35','right'); maxT-=rw+6; }
    txt(ellip(done?'Task complete!':t.text,maxT,14,600),tx,y+18,14,C.ink,'left',600);
    const pr=t.kind==='final'?1:Math.min(1,p/n); box(tx,y+33,Math.max(60,maxT-46),7,4,'#e9d8bd',null,0,0); if(pr>0) box(tx,y+33,Math.max(60,maxT-46)*(done?1:pr),7,4,C.green,null,0,0);
    const num=done?(UI._done.r?'+'+UI._done.r+' coins':''):t.kind==='final'?'':(n>1?Math.min(p,n)+'/'+n:''); txt(num,tx+Math.max(60,maxT-46)+6,y+37,12,C.ink);
    if(sg){ const [a,b2]=sideProgress(sg); txt('★ Bonus: ',tx,y+57,11.5,'#3f8f35','left',700); txt(ellip(sg.text+' '+Math.min(a,b2)+'/'+b2,w-110,11.5,600),tx+tw('★ Bonus: ',11.5),y+57,11.5,C.brown2,'left',600); }
    ctx.restore(); hit(x,y,w,h,()=>UI.openTasks(),'task');
    /* reward offer chip above the card */
    const o=UI._offer; if(o&&Date.now()<o.until&&!Ads.busy&&!UI.modalOpen){ const k=Math.min(1,(ut()-o.t)/.35); ctx.save(); ctx.globalAlpha=k; UI.chip(x,y-42+(1-k)*10,o.text,()=>UI.watchOffer(),'offer'); ctx.restore(); } },
  drawFeedback(){ const t=ut();
    const ts=UI._toast; if(ts&&t-ts.t<ts.dur+.25){ const a=Math.min(1,(t-ts.t)/.2,(ts.dur+.25-(t-ts.t))/.25); ctx.globalAlpha=a; const s=ellip(ts.msg,W*.86,16), w=tw(s,16)+32, y=H*.24-(a*8);
      box(W/2-w/2,y-19,w,38,14,'rgba(90,52,36,.92)',null,0,0); txt(s,W/2,y,16,'#fff','center'); ctx.globalAlpha=1; }
    const b=UI._banner; if(b){ const e=t-b.t; if(e>2.8){UI._banner=null}else{ const k=e<.34?.6+e/.34*.46:e<.56?1.06-(e-.34)/.22*.06:1, a=e<.34?e/.34:e>2.4?1-(e-2.4)/.4:1, yy=e>2.4?-(e-2.4)/.4*H*.08:0;
      ctx.save(); ctx.globalAlpha=Math.max(0,a); ctx.translate(W/2,H*.36+yy); ctx.scale(k,k); const fs=Math.min(34,Math.max(22,W*.07)), w=tw(b.title,fs)+52;
      box(-w/2,-30,w,56,16,C.red,C.ink,3,5); txt(b.title,0,-2,fs,'#fff','center',700,C.ink,4);
      if(b.sub){ const sw=tw(b.sub,14,600)+24; box(-sw/2,34,sw,28,10,C.cream,C.ink,2,0); txt(b.sub,0,48,14,C.ink,'center',600); } ctx.restore(); } } },
  /* ===================== modals ===================== */
  drawModal(){ const m=UI._modal, mx=['home','revisit','share'].includes(m.kind);
    ctx.fillStyle=mx?'rgba(50,25,15,.55)':'rgba(60,30,20,.45)'; ctx.fillRect(0,0,W,H);
    const wide=['upgrade','map','milestone'].includes(m.kind), cw=Math.min(mx?340:wide?400:330,W-32), maxH=H-UI._ins.top-UI._ins.bottom-40;
    const blocks=UI['m_'+m.kind](cw-24); const content=blocks.reduce((a,b)=>a+b.h+(b.gap??8),0);
    const headH=mx?54:40, footH=mx?14:58, ch=Math.min(maxH,headH+12+content+footH), cx=(W-cw)/2, cy=Math.max(UI._ins.top+20,(H-ch)/2);
    UI._card={x:cx,y:cy,w:cw,h:ch};
    if(mx){ box(cx,cy,cw,ch,24,'#fff4e4','#6b3b22',4,7); ctx.save(); rrp(ctx,cx+2,cy+2,cw-4,headH,20); ctx.clip(); box(cx,cy,cw,headH+2,0,['#f9b2ab','#ef8b86'],null,0,0); ctx.restore();
      ctx.fillStyle='#e07b74'; ctx.fillRect(cx+2,cy+headH,cw-4,3);
      const tile=img('art/ui/'+{home:'btn_home',revisit:'btn_revisit',share:'btn_share'}[m.kind]+'.png'); if(tile) ctx.drawImage(tile,cx-10,cy-16,68,68*tile.height/tile.width);
      const title={home:'Launch Reward',revisit:'Entry Reward',share:'Share Game'}[m.kind], fs=Math.min(23,Math.max(18,(cw-120)/tw(title,1)));
      txt(title,cx+64,cy+headH/2+1,fs,'#fff','left',700,'#7a3a2a',5);
      const xx=cx+cw-30, xy=cy-8, dn=pressed('mxX'); ctx.beginPath(); ctx.arc(xx+22,xy+22+(dn?2:0),22,0,7); ctx.fillStyle='#6b3b22'; ctx.fill(); ctx.beginPath(); ctx.arc(xx+22,xy+22+(dn?2:0),19,0,7); ctx.fillStyle='#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(xx+22,xy+22+(dn?2:0),16,0,7); ctx.fillStyle='#e0372e'; ctx.fill();
      ctx.lineWidth=3.6; ctx.lineCap='round'; ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.moveTo(xx+16,xy+16);ctx.lineTo(xx+28,xy+28);ctx.moveTo(xx+28,xy+16);ctx.lineTo(xx+16,xy+28);ctx.stroke(); ctx.lineCap='butt';
      hit(xx,xy,44,44,()=>UI.close(),'mxX'); }
    else { box(cx,cy,cw,ch,18,C.cream,C.ink,3,6); const ttl=blocks.title||''; box(cx+12,cy+10,cw-24,34,12,C.red,C.ink,2.5,0); txt(ttl,cx+cw/2,cy+28,20,'#fff','center',700,C.ink,4); }
    /* scrollable body */
    const by=cy+headH+(mx?10:12), bh=ch-headH-(mx?10:12)-footH; UI._scrollMax=Math.max(0,content-bh); UI._scroll=Math.max(0,Math.min(UI._scroll,UI._scrollMax));
    UI._body={x:cx,y:by,w:cw,h:bh}; ctx.save(); ctx.beginPath(); ctx.rect(cx,by,cw,bh); ctx.clip(); CLIP={y:by,h:bh};
    let y=by-UI._scroll; for(const b of blocks){ if(y+b.h>=by-4&&y<=by+bh+4) b.draw(cx+12,y,cw-24); y+=b.h+(b.gap??8); }
    ctx.restore(); CLIP=null;
    if(UI._scrollMax>0){ const k=bh/(content), sh=Math.max(24,bh*k), sy=by+(bh-sh)*(UI._scroll/UI._scrollMax); box(cx+cw-7,sy,3,sh,2,'rgba(90,52,36,.35)',null,0,0); }
    if(!mx) button(cx+12,cy+ch-50,cw-24,40,'CLOSE',()=>UI.close(),{fill:['#f26a5c','#c9452f'],sz:17,id:'mclose'}); },
  /* --- block builders --- */
  B:{
    row(o){ const bw=Math.max(74,tw(o.btn.label,15)+(o.btn.icon?32:16)), dw=o.w-58-bw-16; return {h:o.desc?Math.max(62,30+wrap(o.desc,dw,11.5).length*14+(o.pips?12:0)):56, draw(x,y,w){ box(x,y,w,this.h,12,'#fff',C.ink,2,0); drawImg(icon(o.icon),x+7,y+this.h/2-22,44,44);
      txt(o.title,x+58,y+16,14); let yy=y+26; if(o.desc){ yy+=para(o.desc,x+58,y+24,dw,11.5,C.brown2,600,1.2); }
      if(o.pips){ for(let i=0;i<o.pips[1];i++) box(x+58+i*17,yy+3,14,7,3,i<o.pips[0]?C.gold:'#e9d8bd',C.ink,1.5,0); }
      button(x+w-bw-7,y+this.h/2-18,bw,36,o.btn.label,o.btn.fn,{icon:o.btn.icon,disabled:o.btn.disabled,fill:o.btn.warn?['#ffb36b','#e07f3c']:undefined,id:o.btn.id}); } }; },
    tabs(tabs,cur,fn){ return {h:34, draw(x,y,w){ const tw2=(w-12)/3; tabs.forEach((t,i)=>{ const on=t[0]===cur, bx=x+i*(tw2+6); box(bx,y,tw2,34,10,on?C.wood:C.cream2,C.ink,2.5,0); txt(t[1],bx+tw2/2,y+18,14,on?'#fff':C.ink,'center',700,on?C.ink:null,on?3:0); hit(bx,y,tw2,34,()=>fn(t[0]),'tab'+t[0]); }); } }; },
    note(s,w){ return {h:wrap(s,w-4,12,600).length*15+4, draw(x,y,ww){ para(s,x+2,y+2,ww-4,12,C.brown2,600,1.25); } }; },
    locked(s,w){ return {h:Math.max(50,wrap(s,w-60,14).length*18+16), draw(x,y,ww){ box(x,y,ww,this.h,12,'#fff',C.ink,2,0); drawImg(icon('lock'),x+10,y+this.h/2-15,30,30); para(s,x+48,y+8,ww-58,14,C.ink,700,1.25); } }; },
    btn(label,fn,o={}){ return {h:o.h||40, draw(x,y,w){ button(x,y,w,o.h||40,label,fn,o); } }; },
    gap(h){ return {h,gap:0,draw(){}}; },
  },
  m_shop(w){ const on=isBoost(),cd=now<S.boostCd, cp=CFG.ads.coinPurchase, wait=Math.ceil(((UI._cd.coin_purchase||0)-Date.now())/1000), B=UI.B;
    const r=[B.row({w:w,icon:'speed',title:'Meow Rush',desc:'Stations cook twice as fast and you walk 30% faster for 1 minute.',btn:{label:on?'ACTIVE':cd?Math.ceil(S.boostCd-now)+'s':'FREE',icon:on||cd?null:'ad',disabled:on||cd,fn:()=>{UI.close();UI.startAd()},id:'sb1'}}),
      B.row({w:w,icon:'coin',title:'Bag of coins',desc:'A tip jar from happy customers.',btn:{label:wait>0?wait+'s':'+'+cp.reward,icon:wait>0?null:'ad',disabled:wait>0,fn:()=>{UI.close();UI.watchCoins()},id:'sb2'}}),
      B.note('Decorations, tables and new stations are bought directly in the restaurant by standing on their dashed spot.',w)]; r.title='SHOP'; return r; },
  m_upgrade(w){ const tabs=UI.upTabs(), tab=UI._modal.arg, cur=tabs.find(t=>t[0]===tab), u=UPG[tab], B=UI.B, r=[B.tabs(tabs,tab,t=>UI.openUpgrade(t))];
    if(!cur[2]()) r.push(B.locked(cur[3],w));
    else { for(const row of u.rows.filter(r=>!r.req||S.bought[r.req])){ const lv=S[row.key], c=lv>=row.max?null:row.cost[lv];
        const ad=c!==null&&S.money<c&&UI.ready('coin_purchase')&&UI.adOk('coin_purchase');
        const btn=c===null?{label:'MAX',disabled:true}:ad?{label:'+'+CFG.ads.coinPurchase.reward,icon:'ad',warn:true,fn:()=>{UI.close();UI.watchCoins(()=>UI.openUpgrade(tab))}}
          :{label:c===0?'FREE':String(c),icon:c===0?null:'coin',disabled:S.money<c,fn:()=>{const cc=row.cost[S[row.key]];if(S.money<cc)return;S.money-=cc;S[row.key]++;sfx('buy');save()}};
        btn.id='up'+row.key; r.push(B.row({w,icon:row.icon,title:row.label,desc:row.desc,pips:[lv,row.max],btn})); }
      if(tab==='kitchen'&&!S.bought.pantry) r.push(B.note('Storage and supplier upgrades appear after you build the ingredient storage.',w)); }
    r.title='UPGRADES'; return r; },
  m_tasks(w){ const i=Math.min(S.task,TASKS.length-1),t=TASKS[i],[p,n]=taskProgress(t), next=TASKS.slice(i+1,i+4).filter(x=>x.kind!=='final'), B=UI.B;
    const lines=wrap(t.text,w-20,16); const r=[{h:30+lines.length*20+(t.kind!=='final'?24:0)+(t.reward?24:0), draw(x,y,ww){ box(x,y,ww,this.h,12,'#fff',C.ink,2,0); txt('CURRENT',x+10,y+14,11,C.red); let yy=y+24; yy+=para(t.text,x+10,yy,ww-20,16,C.ink,700,1.25)+4;
        if(t.kind!=='final'){ bar(x+10,yy,ww-20,18,Math.min(1,p/n),undefined,Math.min(p,n)+'/'+n); yy+=24; } if(t.reward){ drawImg(icon('coin'),x+10,yy+2,18,18); txt('+'+t.reward,x+31,yy+12,14,'#3f8f35'); } } }];
    for(const x of next) r.push({h:32,gap:5,draw(xx,y,ww){ box(xx,y,ww,32,10,C.cream2,null,0,0); ctx.globalAlpha=.7; drawImg(icon('lock'),xx+8,y+7,18,18); ctx.globalAlpha=1; txt(ellip(x.text,ww-90,13,600),xx+32,y+17,13,C.brown2,'left',600); if(x.reward) txt('+'+x.reward,xx+ww-8,y+17,13,C.brown2,'right'); }});
    r.push(B.note(Math.min(S.task,TASKS.length-1)+' of '+(TASKS.length-1)+' tasks complete',w)); r.title='TASKS'; return r; },
  m_map(w){ const st=curStage(); const r=CFG.stageNames.map((name,i)=>{ const ph=TASK_PHASE[i],a=taskIndex(ph.from),b=taskIndex(ph.to),tot=b-a+1,done=Math.max(0,Math.min(tot,S.task-a));
      const state=i<st||(i===st&&done>=tot)?'done':i===st?'now':'lock', aw=Math.min(104,w*.3), dl=wrap(STAGE_DESC[i],w-aw-30,11.5);
      return {h:Math.max(aw*2/3+14,62+dl.length*14), draw(x,y,ww){ box(x,y,ww,this.h,13,state==='lock'?'#efe4d3':'#fff',C.ink,2.5,0); if(state==='now'){rrp(ctx,x-3,y-3,ww+6,this.h+6,15);ctx.lineWidth=3;ctx.strokeStyle=C.gold;ctx.stroke()}
        ctx.globalAlpha=state==='lock'?.55:1; drawImg(img('img/stage_'+i+'.png'),x+7,y+7,aw,aw*2/3); ctx.globalAlpha=1;
        const tx=x+aw+16; txt('STAGE '+(i+1),tx,y+14,11,C.red); txt(ellip(name,ww-aw-26,15),tx,y+30,15); bar(tx,y+42,ww-aw-26,16,done/tot,undefined,done+'/'+tot); para(STAGE_DESC[i],tx,y+62,ww-aw-30,11.5,C.brown2,600,1.2);
        if(state!=='now') drawImg(icon(state==='lock'?'lock':'check'),x+ww-22,y-8,28,28); } }; });
    r.title='RESTAURANT MAP'; return r; },
  m_settings(w){ const B=UI.B, rep=ASSET_REPORT; const r=[B.btn('Sound: '+(S.sound?'ON':'OFF'),()=>{S.sound=!S.sound;save()},{id:'snd'}),
      ...(CFG.autoPlay?[B.btn('Auto play: '+(S.auto?'ON':'OFF'),()=>{S.auto=S.auto?0:1;AUTOP.manualT=0;AUTOP.cur=null;save()},{id:'auto2',fill:S.auto?['#8fd86a','#4fa63f']:['#ffb36b','#e07f3c']}),
        {h:40,gap:6,draw(x,y,ww){ const n=CFG.speeds.length, bw=(ww-6*(n-1))/n; CFG.speeds.forEach((v,j)=>{ const sel=gameSpeed()===v;
          button(x+j*(bw+6),y,bw,40,v+'x',()=>{S.gameSpeed=v;save();UI.toast('Game speed '+v+'x')},{id:'spd'+v,sz:16,fill:sel?['#8fd86a','#4fa63f']:['#fff3dc','#f3d9b0'],dark:!sel}); }); }}]:[]),
      B.btn(UI._armed?'Tap again to confirm':'Restart restaurant',()=>{ if(!UI._armed){UI._armed=true;return} resetGame();UI.close();UI.toast('Fresh start!'); },{fill:['#ffb36b','#e07f3c'],id:'rst'})];
    if(!PF.isMinis){ const T=[['Reset daily gifts','days'],['Reset Add-to-Home','home'],['Next ad: no fill','fail'],['Next ad: closed early','quit'],['+500 coins','money']];
      r.push(B.note('Test tools (outside TikTok only)',w)); for(let i=0;i<T.length;i+=2) r.push({h:34,gap:6,draw(x,y,ww){ const bw=(ww-6)/2; [T[i],T[i+1]].forEach((tt,j)=>{ if(tt) button(x+j*(bw+6),y,bw,34,tt[0],()=>UI.testTool(tt[1]),{sz:12,id:'tt'+tt[1]}); }); }}); }
    r.push(B.note('Assets: '+rep.baked+' baked, '+rep.loaded+' loaded'+(rep.missing.length?', '+rep.missing.length+' missing':'')+' · Play time '+fmtTime(S.playTime)+' · v'+VERSION+' · '+(PF.isMinis?'TikTok native':'test'),w)); r.title='SETTINGS'; return r; },
  testTool(x){ const m=PF.mock; if(x==='days'){S.mx.rvDay='';S.mx.shDay='';PF._mockRevisit=false;UI._rvCan=false;save();UI.toast('Daily gifts reset')}
    if(x==='home'){S.mx.home=0;S.mx.homeAsked=0;save();UI.toast('Add-to-Home reset')} if(x==='fail'){m.adFailNext=true;UI.toast('Next ad will fail')} if(x==='quit'){m.adQuitNext=true;UI.toast('Next ad will be closed early')} if(x==='money'){S.money+=500;save()} },
  m_milestone(w){ const r=[{h:84,draw(x,y,ww){ drawImg(icon('star'),x+ww/2-38,y,76,76); }}, {h:30,draw(x,y,ww){ box(x,y,ww,30,12,C.red,C.ink,2.5,0); txt('GRAND OPENING COMPLETE',x+ww/2,y+16,15,'#fff','center',700,C.ink,3); }},
      UI.B.note('Meow Sakura is now a Sakura Palace!',w),
      {h:52,draw(x,y,ww){ const s=[[fmtTime(S.playTime),'play time'],[String(S.stats.served),'customers served'],[fmtNum(S.stats.collected),'coins collected']], bw=(ww-12)/3; s.forEach((v,i)=>{ const bx=x+i*(bw+6); box(bx,y,bw,52,10,'#fff',C.ink,2,0); txt(v[0],bx+bw/2,y+19,18,C.ink,'center'); txt(v[1],bx+bw/2,y+39,10,C.brown2,'center',600); }); }},
      UI.B.note('Keep playing: every upgrade and optional table stays available.',w)]; r.title=''; return r; },
  /* --- popups (mockup style) --- */
  P:{ sub(s,w){ return {h:wrap(s,w,15).length*19, draw(x,y,ww){ para(s,x,y,ww,15,C.ink,700,1.25,'center'); }}; },
      art(k,w,ratio){ return {h:w*ratio, draw(x,y,ww){ const m=img('art/ui/'+k); if(m){ ctx.save(); rrp(ctx,x,y,ww,ww*ratio,14); ctx.clip(); ctx.drawImage(m,x,y,ww,ww*ratio); ctx.restore(); } else box(x,y,ww,ww*ratio,14,'#f3dfc3',null,0,0); }}; },
      step(n,s,w){ return {h:Math.max(30,wrap(s,w-40,15).length*19), draw(x,y,ww){ ctx.beginPath(); ctx.arc(x+14,y+15,14,0,7); ctx.fillStyle='#b8322e'; ctx.fill(); ctx.beginPath(); ctx.arc(x+14,y+15,12.5,0,7); ctx.fillStyle='#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(x+14,y+15,10.5,0,7); ctx.fillStyle=C.red; ctx.fill(); txt(String(n),x+14,y+16,15,'#fff','center');
        para(s,x+38,y+(this.h>30?0:5.5),ww-40,15,C.ink,700,1.25); }}; },
      yellow(label,fn,o={}){ return {h:50, draw(x,y,w){ button(x,y,w,50,label,fn,{fill:['#ffe57e','#f8c234','#eeb01f'],stroke:'#6b3b22',lw:3.5,r:16,sz:22,dark:true,icon:o.icon,isz:28,disabled:o.disabled,id:o.id||label}); }}; },
      pill(main,small){ return {h:46, draw(x,y,w){ const mw=tw(main,30), sw=small?Math.min(80,tw(small,12)+6):0, pw=6+38+6+mw+(small?8+sw:0)+14, px=x+w/2-pw/2; box(px,y,pw,46,16,'#f3dfc3',null,0,0);
        drawImg(icon('coin'),px+6,y+4,38,38); txt(main,px+50,y+24,30,'#fff','left',700,'#6b3b22',6); if(small) para(small,px+50+mw+8,y+(wrap(small,sw,12).length>1?9:17),sw,12,C.brown2,700,1.1); }}; },
      coins(k,amt,w,ratio){ return {h:w*ratio, draw(x,y,ww){ const m=img('art/ui/'+k); if(m){ ctx.save(); rrp(ctx,x,y,ww,ww*ratio,14); ctx.clip(); ctx.drawImage(m,x,y,ww,ww*ratio); ctx.restore(); }
        txt(amt,x+ww/2,y+ww*ratio*.78,38,'#fff','center',700,'#6b3b22',7); }}; },
      note(s,w){ return {h:wrap(s,w,13).length*17, draw(x,y,ww){ para(s,x,y,ww,13,'#8a4a2a',700,1.25,'center'); }}; },
  },
  m_home(w){ const P=UI.P, amt=CFG.gifts.home, paid=UI.homeDone(); const r=[P.sub('Add Meow Sakura to your phone screen for quick access!',w), P.art('pop_home_art.jpg',w,208/640)];
    if(!paid) r.push(P.pill('+'+amt,'first time bonus'));
    r.push(P.yellow(UI._busy?'…':'Add Now',async()=>{ if(UI._busy) return; UI._busy=true; const res=await PF.addHome(); UI._busy=false;
      if(!res.ok){ UI.toast('Not added — you can try again any time'); return; }
      const can=await PF.shortcutReward(); UI.close();
      if(can&&!UI.homeDone()){ S.mx.home=1; UI.giftPay(amt,'Home screen bonus'); } else { S.mx.home=S.mx.home||'added'; save(); UI.toast('Meow Sakura is on your phone screen!'); } },{disabled:!!UI._busy,id:'homeGo'}));
    return r; },
  m_revisit(w){ const P=UI.P, amt=CFG.gifts.revisit, claimed=UI.revisitClaimed(), can=UI._rvCan&&!claimed;
    return [P.step(1,'Tap the button below.',w), P.yellow('Go',async()=>{ const r=await PF.startRevisit(); if(!r.ok){UI.toast('Could not open your profile');return} if(!PF.isMinis){ UI.toast('Welcome back from your Profile!'); UI.refreshRevisit(false); } },{disabled:claimed,id:'rvGo'}),
      P.step(2,'Come back to Meow Sakura from your TikTok profile.',w), P.art('pop_revisit_profile.jpg',w,352/640), P.step(3,'Claim rewards.',w), P.coins('pop_revisit_coins.jpg','+'+amt,w,224/640),
      P.note(claimed?'Gift claimed — come back tomorrow for another gift.':'Come back tomorrow for another gift.',w),
      P.yellow(claimed?'Claimed ✓':'Claim',async()=>{ if(UI.revisitClaimed()) return; const ok=await PF.revisitReward(); if(!ok){ UI._rvCan=false; UI.toast('Open Meow Sakura from Profile › Recently played first'); return; }
        S.mx.rvDay=dayKey(); PF._mockRevisit=false; UI.close(); UI.giftPay(amt,'Revisit gift'); },{disabled:!can,id:'rvClaim'})]; },
  m_share(w){ const P=UI.P, amt=CFG.gifts.share, claimed=UI.shareClaimed();
    return [P.sub('Share Meow Sakura with friends and get a reward!',w), P.art('pop_share_art.jpg',w,448/640), P.pill(claimed?'Claimed today':'+'+amt,claimed?'new gift tomorrow':null),
      P.yellow(claimed?'Share again':'Share Now',async()=>{ if(UI._busy) return; UI._busy=true; const r=await PF.share(); UI._busy=false; if(!r.ok){ UI.toast('Share cancelled'); return; }
        UI.close(); if(!UI.shareClaimed()){ S.mx.shDay=dayKey(); UI.giftPay(amt,'Share gift'); } else UI.toast('Thanks for sharing!'); },{icon:'share',id:'shGo'})]; },
  /* --- mock ad / mock TikTok sheet --- */
  drawMockAd(){ const m=UI._mock, left=Math.max(0,m.n-Math.floor((Date.now()-m.t0)/800)); if(left<=0){ UI._mockEnd(true); return; }
    ctx.fillStyle='#2a1a14'; ctx.fillRect(0,0,W,H); txt('TEST AD · '+m.label,W/2,H/2-60,12,C.gold,'center'); txt(m.rw?'Rewarded video':'Interstitial',W/2,H/2-36,16,'#fff','center',600);
    txt(String(left),W/2,H/2+4,46,'#fff','center'); txt(m.rw?'Watch to the end for the reward':'Ad break',W/2,H/2+44,15,'#fff','center',600);
    const xx=W-50, yy=UI._ins.top+14; ctx.beginPath(); ctx.arc(xx+18,yy+18,18,0,7); ctx.fillStyle='rgba(0,0,0,.4)'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#fff'; ctx.stroke(); txt('✕',xx+18,yy+19,18,'#fff','center');
    hit(xx,yy,36,36,()=>UI._mockEnd(!m.rw),'adx'); },
  drawSheet(){ const s=UI._sheet, w=Math.min(360,W*.94), h=150, x=(W-w)/2, y=H-UI._ins.bottom-16-h; ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,0,W,H);
    box(x,y,w,h,18,'#fff',null,0,0); txt('TEST MODE · simulated TikTok screen',x+14,y+18,11,'#fe2c55'); txt(s.title,x+14,y+40,17,'#161823'); para(s.body,x+14,y+54,w-28,13,'#555',500,1.2);
    const bw=(w-36)/2; const fin=v=>{UI._sheet=null;s.res(v?{ok:true}:{ok:false,err:'cancelled'})};
    button(x+14,y+h-54,bw,42,s.noTxt,()=>fin(false),{fill:['#f1f1f2','#f1f1f2'],stroke:'#f1f1f2',dark:true,id:'shNo'}); button(x+22+bw,y+h-54,bw,42,s.okTxt,()=>fin(true),{fill:['#fe2c55','#fe2c55'],stroke:'#fe2c55',id:'shOk'}); },
  hits(){ return HITS; }, imgReady(p){ return !!img(p); }, /* test hooks */
  /* ===================== touch ===================== */
  touchStart(id,x,y){ for(let i=HITS.length-1;i>=0;i--){ const h=HITS[i]; if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){ PRESS={tid:id,hit:h,x,y}; return true; } }
    if(UI._mock||UI._sheet) return true;
    if(UI._modal){ const c=UI._card; if(c&&x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h){ DRAG={tid:id,y,s:UI._scroll}; } else DRAG={tid:id,outside:true}; return true; }
    return false; },
  touchMove(id,x,y){ if(PRESS&&PRESS.tid===id&&UI._modal&&Math.abs(y-PRESS.y)>10&&UI._body&&PRESS.y>=UI._body.y&&PRESS.y<=UI._body.y+UI._body.h&&UI._scrollMax>0){ DRAG={tid:id,y:PRESS.y,s:UI._scroll}; PRESS=null; }
    if(DRAG&&DRAG.tid===id&&!DRAG.outside){ UI._scroll=Math.max(0,Math.min(UI._scrollMax,DRAG.s-(y-DRAG.y))); }
    return !!(PRESS||DRAG||UI._modal); },
  touchEnd(id,x,y){ if(PRESS&&PRESS.tid===id){ const h=PRESS.hit; PRESS=null; if(x>=h.x-8&&x<=h.x+h.w+8&&y>=h.y-8&&y<=h.y+h.h+8){ try{ h.fn(); }catch(e){ console.error(e); } } return true; }
    if(DRAG&&DRAG.tid===id){ const d=DRAG; DRAG=null; if(d.outside&&UI._modal) UI.close(); return true; }
    return !!UI._modal; },
};
const now_=()=>performance.now()/1000; function nowT(){return now_()}
