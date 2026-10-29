/* =====================================================================
   50_render.js — camera, depth-sorted drawing, overlays
   ===================================================================== */
const cv=document.getElementById('game'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,TW=64,TU=64,ox=0,oy=0,camX=0,camY=0;
const P=(x,y,z=0)=>[(x-y)*TW/2+ox,(x+y)*TW/4-z*TW*.56+oy];
let MD=null; // main draw context
function resize(){const wr=document.getElementById('wrap');W=wr.clientWidth;H=wr.clientHeight;DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);TW=Math.max(40,Math.min(110,Math.min(W,H*.58)/6.3*(DEBUG.zoom||1)));TU=Math.max(TW*1.02,46);MD=mkD(ctx,P,TW);if(S) buildFloorCache(TW);}
function drawSprite(key,wx,wy,z=0,scale=1){const a=ATLAS[key];if(!a)return;const [sx,sy]=P(wx,wy,z);const k=TW/REF*scale;ctx.drawImage(a.cv,sx-a.ax*k,sy-a.ay*k,a.w*k,a.h*k)}
function drawItemAt(key,sx,sy,scale=1){const a=ATLAS['it_'+key];if(!a)return;const k=TW/REF*scale;ctx.drawImage(a.cv,sx-a.ax*k,sy-a.ay*k,a.w*k,a.h*k)}
function drawItemU(key,sx,sy,scale=1){drawItemAt(key,sx,sy,scale*TU/TW)}
function drawEmote(key,sx,sy,scale=1){const a=ATLAS['em_'+key];if(!a)return;const k=TU/REF*scale;ctx.drawImage(a.cv,sx-a.ax*k,sy-a.ay*k,a.w*k,a.h*k)}
/* characters: live part-based rig (see 20_rig.js) */
const CHAR_H=()=>TW*.8;
/* iso grid of item spots on a flat surface (tray, counter top, table): world-aligned rows, drawn back to front */
function isoGrid(n,cols,du,dv){ const out=[]; for(let i=0;i<n;i++){ const c=i%cols, r=Math.floor(i/cols); out.push([(c-(cols-1)/2)*du, r*dv]); }
  const rows=Math.ceil(n/cols); return out.map(([u,v])=>[u,v-(rows-1)*dv/2]); }
function drawOnSurface(items,sx,sy,o={}){ const cols=o.cols||2, max=o.max||4, sc=o.scale||.5, n=Math.min(items.length,max);
  /* u runs along screen-right/up (world +x), v along screen-left/down (world +y): stays flat on the iso plane */
  const g=isoGrid(n,cols,o.du||.24,o.dv||.24); const pts=g.map(([u,v],i)=>[sx+(u-v)*TW*.5, sy+(u+v)*TW*.25, i]);
  pts.sort((a,b)=>a[1]-b[1]); for(const [x,y,i] of pts) drawItemAt(items[i],x,y,sc);
  if(items.length>max&&o.badge!==false) countBadge(sx+TW*.24,sy-TW*.28,items.length); }
function drawHeldStack(items,x,y,customer,noTray){
  if(customer){ /* customers carry their order low in front of the body, side by side */
    const n=Math.min(items.length,2); for(let i=0;i<n;i++){ const it=PIZZAS.includes(items[i])&&items[i]!=='pizza'?'box':items[i]; drawItemAt(it,x+(n>1?(i?.1:-.1):0)*TW,y+TW*.08,.42); } return; }
  if(!noTray) drawEnvAt('carrytray',x,y+TW*.06,.85);
  drawOnSurface(items,x,y+TW*.02,{cols:2,max:4,scale:.38,du:.13,dv:.09}); }
function drawEnvAt(key,sx,sy,scale=1){const d=ENV_DEF[key],e=ENV[key];if(!e||!e.img) return;const k=TW*d.tw*scale/e.w;ctx.drawImage(e.img,sx-d.ax*e.w*k,sy-d.ay*e.h*k,e.w*k,e.h*k)}
/* ---- staff: approved art sprites; only legs (+ tail in side frames) move while walking ---- */
const STAFF_KEY={chef:'chef',waiter:'waiter',cashier:'cashier',waitress:'waitress',helper:'waitress'};
const STAFF_HAND={chef:{front:[.5,.76],left:[.3,.74],right:[.7,.74]},waiter:{front:[.5,.6],left:[.22,.62],right:[.8,.62]},waitress:{front:[.5,.62],left:[.2,.64],right:[.82,.64]},cashier:{front:[.5,.66],left:[.3,.64],right:[.7,.64]}};
function staffView(dir){return {0:'front',45:'left',90:'left',135:'back',180:'back',225:'back',270:'right',315:'right'}[dir]||'front'}
function drawStaff(e,name,anim){
  const set=STAFF_SPRITES[name], z=elevAt(e.x,e.y), [sx,sy]=P(e.x,e.y,z), k=TW*1.05/218;
  const view=staffView(e.dir??0), walking=anim==='walk'||anim==='cwalk', t=e.t||now;
  let m=set['idle_'+view], flip=false, legs=false;
  if(walking&&(view==='right'||view==='left')){ m=set['walk'+(1+((Math.floor(t*8)%4)+4)%4)+'_right']||set.idle_right||m; flip=view==='left'; }
  else if(walking) legs=true;
  if(!m) return;
  const hop=anim==='happy'?Math.abs(Math.sin(t*7))*TW*.05:0;
  ctx.save();ctx.fillStyle=COL.shadow;ctx.beginPath();ctx.ellipse(sx,sy,TW*.26,TW*.09,0,0,7);ctx.fill();ctx.restore();
  const hand=(STAFF_HAND[name]||STAFF_HAND.chef)[view==='back'?'front':view];
  const hx=sx+(flip?-1:1)*((view==='back'?.5:hand[0])*m.w-m.ax)*k, hy=sy-hop+(hand[1]*m.h-m.ay)*k;
  const carry=e.carry&&e.carry.length&&!e.state;
  const drawStack=()=>{let yy=hy;for(const it of e.carry){drawItemAt(it,hx,yy,.78);yy-=TW*(ITEM_STEP[it]||.07)*.78}};
  if(carry&&view==='back') drawStack();
  ctx.save(); ctx.translate(sx,sy-hop); if(anim==='sleep'){ ctx.rotate(Math.sin(t*1.6)*.05); ctx.scale(1.02,.96); } if(flip) ctx.scale(-1,1); ctx.scale(k,k);
  if(legs&&m.img){ const ph=t*10, L=Math.max(0,Math.sin(ph))*4, R=Math.max(0,-Math.sin(ph))*4, ly=m.legY, sp=Math.round(m.ax);
    ctx.drawImage(m.img,0,ly,sp,m.h-ly,-m.ax,ly-m.ay-L,sp,m.h-ly);                // left leg
    ctx.drawImage(m.img,sp,ly,m.w-sp,m.h-ly,sp-m.ax,ly-m.ay-R,m.w-sp,m.h-ly);       // right leg
    ctx.drawImage(m.img,0,0,m.w,ly,-m.ax,-m.ay,m.w,ly); }                           // body stays still
  else if(m.img) ctx.drawImage(m.img,-m.ax,-m.ay,m.w,m.h);
  ctx.restore();
  if(carry&&view!=='back') drawStack();
  return [sx,sy];}
/* ---- customers / VIP / cleaner / manager: approved art (8-direction idle; drawn walk cycles where the sheet has them,
        otherwise the body stays still and only the leg strip steps) ---- */
const SHEET_H={chef:1.06,cashier:1.0,waiter:1.0,cleaner:1.0,cat01:.95,cat02:.95,cat03:.95,cat04:.95,vip01:1.0,vip02:1.0,manager:1.0};
/* Character sheets: the player has a full 8-direction walk + tray-carry set; the other roles have one drawn walk
   (front three-quarter, screen-right). That walk serves screen-right (270) and down-right (315) as drawn, and screen-left (90)
   and down-left (45) mirrored; the other directions step the legs on the 8-direction idle art.
   Standing sideways (90/270) shows the front three-quarter idle, the same view as the walk, so a cat does not turn its back
   when it stops (this also covers the side idles that lost face fill when cut). The player's idle_270 is drawn as a back
   view, so it uses idle_90 mirrored, which matches its walk_270 profile. Walk frames are fitted to the idle head height by
   CHAR_FIT (src/19_char_fit.js, tools/char_fit.py; keep the two remap tables in step). */
const SIDE_REMAP={idle:{90:[45,0],270:[315,0]},walk:{45:[270,1],90:[270,1],315:[270,0]}};
const SHEET_REMAP={
  chef:{idle:{270:[90,1]}},
  cashier:SIDE_REMAP, waiter:SIDE_REMAP, cleaner:SIDE_REMAP, cat01:SIDE_REMAP, cat02:SIDE_REMAP, cat03:SIDE_REMAP,
  vip01:SIDE_REMAP, vip02:SIDE_REMAP, manager:SIDE_REMAP,
  cat04:{idle:{90:[45,0],270:[315,0],45:[315,1],135:[225,1]},walk:SIDE_REMAP.walk},   /* cat04 idle_45 / idle_135: tail clipped when cut */
};
/* number of drawn walk frames per set/direction (the new sheets have 5–8) */
const WALK_N={}; function walkN(name,d){ const key=name+d; if(WALK_N[key]===undefined){ let n=0; while(MORE_SPRITES[name]['walk'+(n+1)+'_'+d]) n++; WALK_N[key]=n; } return WALK_N[key]; }
const SHEET_HAND={0:[.5,.66],45:[.36,.66],90:[.26,.66],135:[.5,.62],180:[.5,.62],225:[.5,.62],270:[.74,.66],315:[.64,.66]};
function drawSheetChar(e,name,anim,opts={}){
  const set=MORE_SPRITES[name], z=elevAt(e.x,e.y), [sx,sy0]=P(e.x,e.y,z), t=e.t||now;
  const d=(((Math.round((e.dir??0)/45)*45)%360)+360)%360;
  const walking=anim==='walk'||anim==='cwalk', seated=anim==='eat'||anim==='sit'||anim==='sitmad';
  const rm=SHEET_REMAP[name]||{}, ri=(rm.idle&&rm.idle[d])||[d,0];
  let m=set['idle_'+ri[0]], legs=false, flip=ri[1];
  const pose=k=>{m=k;flip=0};
  if(anim==='sleep'&&set.sleep) pose(set.sleep);
  else if(anim==='sweep'&&set.sweep_1) pose(set['sweep_'+(1+Math.floor(t*3)%2)]);
  else if(anim==='collect'&&set.collect) pose(set.collect);
  else if(anim==='tablet'&&set.tablet1) pose(set['tablet'+(1+Math.floor(t*3)%4)]);
  else if(anim==='talk'&&set.talk_happy) pose(set.talk_happy);
  else if(e.carry&&e.carry.length&&!seated&&set['cwalk1_'+d]){ m=set['cwalk'+(walking?1+Math.floor(t*8)%4:1)+'_'+d]; flip=0; }
  else if(walking){ const rw=rm.walk&&rm.walk[d];
    const [wd,wf]=Array.isArray(rw)?rw:[d,0];
    if(rw==='legs'||!set['walk1_'+wd]) legs=true;   /* no drawn walk for this direction: step the legs on the idle art */
    else { const n=walkN(name,wd)||4; m=set['walk'+(1+Math.floor(t*(n>4?11:8))%n)+'_'+wd]; flip=wf; } }
  if(!m||!m.img) return [sx,sy0];
  const k=TW*(SHEET_H[name]||1)/150*(opts.scale||1)*m.s;
  let sy=sy0, dx=0, sqx=1, sqy=1;
  const fitK=m.key&&CHAR_FIT[name]&&CHAR_FIT[name][m.key]; if(fitK&&!legs) sqy=fitK[d]||1;   /* walk frame fitted to the idle head height */
  if(anim==='happy') sy-=Math.abs(Math.sin(t*7))*TW*.05;
  if(anim==='mad'||anim==='sitmad') dx=Math.sin(t*38)*TW*.012;
  if(anim==='eat'){ const b=Math.max(0,Math.sin(t*6)); sqy=1-b*.035; sqx=1+b*.02; }
  if(!walking&&!seated&&anim!=='sleep'){ const br=Math.sin(t*2.2+(e.seed||0))*.012; sqy*=1+br; sqx*=1-br*.5; }
  if(!seated){ctx.save();ctx.fillStyle=COL.shadow;ctx.beginPath();ctx.ellipse(sx,sy0,TW*.24*(opts.scale||1),TW*.085*(opts.scale||1),0,0,7);ctx.fill();ctx.restore();}
  const trayFix=m.key&&CHAR_TRAY[name]&&CHAR_TRAY[name][m.key];
  const hand=trayFix||m.tray||(SHEET_HAND[d]||SHEET_HAND[0]);
  const hx=sx+(hand[0]*m.w-m.ax)*k, hy=sy+(hand[1]*m.h-m.ay)*k*sqy;
  const holding=e.carry&&e.carry.length&&!seated&&anim!=='sleep';
  const back=d>=135&&d<=225;
  const stack=()=>drawHeldStack(e.carry,hx,hy,opts.customer,!!m.tray);
  if(holding&&back) stack();
  ctx.save(); ctx.translate(sx+dx,sy); if(anim==='sleep'&&!set.sleep){ ctx.rotate(Math.sin(t*1.4)*.05+.07); sqy*=.97; } ctx.scale(k*sqx*(flip?-1:1),k*sqy);
  if(seated){ // seated: body sinks a little onto the seat, the legs stay visible but bend (strip squashed) in front of it
    const cut=m.legY, d=Math.round(m.h*.06), lh=m.h-cut-d;
    ctx.drawImage(m.img,0,cut,m.w,m.h-cut,-m.ax,-m.ay+cut+d,m.w,lh);
    ctx.drawImage(m.img,0,0,m.w,cut,-m.ax,-m.ay+d,m.w,cut); }
  else if(legs){ const ph=t*10, L=Math.max(0,Math.sin(ph))*4/m.s, R=Math.max(0,-Math.sin(ph))*4/m.s, ly=m.legY, sp=Math.round(m.ax);
    ctx.drawImage(m.img,0,ly,sp,m.h-ly,-m.ax,ly-m.ay-L,sp,m.h-ly);
    ctx.drawImage(m.img,sp,ly,m.w-sp,m.h-ly,sp-m.ax,ly-m.ay-R,m.w-sp,m.h-ly);
    ctx.drawImage(m.img,0,0,m.w,ly,-m.ax,-m.ay,m.w,ly); }
  else ctx.drawImage(m.img,-m.ax,-m.ay,m.w,m.h);
  ctx.restore();
  if(holding&&!back) stack();
  return [sx,sy0];}
function drawChar(e,skin,anim,opts={}){
  if(STAFF_KEY[skin]&&STAFF_SPRITES[STAFF_KEY[skin]]) return drawStaff(e,STAFF_KEY[skin],anim);
  if(MORE_SPRITES[skin]) return drawSheetChar(e,skin,anim,opts);
  const z=elevAt(e.x,e.y), [sx,sy]=P(e.x,e.y,z);
  const holding=e.carry&&e.carry.length&&(anim==='carry'||anim==='cwalk'||anim==='serve');
  drawRigCat(ctx,sx,sy,CHAR_H(),skin,e.dir??0,holding||anim!=='carry'&&anim!=='cwalk'?anim:'idle',e.t||now,{seed:e.seed||0,scale:opts.scale,noTray:!!opts.customer,held:holding?(g,x,y)=>drawHeldStack(e.carry,x,y,opts.customer):null});
  return [sx,sy];}
function charAnim(e,isCustomer){
  if(e.role&&e.asleep) return 'sleep';
  if(e.state==='eat') return 'eat';
  if(e.state==='vipWait') return e.patience<e.pMax*CFG.patience.impatientAt?'sitmad':'sit';
  if(e.happyT>0&&!e.walking) return 'happy';
  if(e.walking) return e.carry&&e.carry.length?'cwalk':'walk';
  if(e.serveT>0) return 'serve';
  if(e.sweepT>0) return 'sweep';
  if(e.cookT>0) return 'cook';
  if(e.reachT>0) return e.carry&&e.carry.length?'carry':'reach';
  if(isCustomer){ if(e.patience<e.pMax*.15) return 'mad'; if(e.patience<e.pMax*CFG.patience.impatientAt) return 'tired'; return e.carry&&e.carry.length?'carry':'wait'; }
  if(e.role&&(e.asleep||e.idleT>CFG.sleepAfter)) return 'sleep';
  if(e.role==='cashier') return 'register';
  if(e.carry&&e.carry.length) return 'carry';
  if(e.role&&(e.asleep||e.idleT>CFG.sleepAfter)) return 'sleep';
  return 'idle';}

function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const pz=elevAt(player.x,player.y);
  const tx=(player.x-player.y)*TW/2, ty=(player.x+player.y)*TW/4-pz*TW*.56+H*.06;
  camX+=(tx-camX)*.14; camY+=(ty-camY)*.14; ox=Math.round(W/2-camX); oy=Math.round(H/2-camY);
  ctx.fillStyle=COL.grass;ctx.fillRect(0,0,W,H);
  ctx.drawImage(floorCv,ox+floorInfo.ox,oy+floorInfo.oy,floorCv.width/floorInfo.dpr,floorCv.height/floorInfo.dpr);
  /* flat overlays: buy spots + pads + helper rings */
  for(const sp of SPOTS) if(spotVisible(sp)) drawSpotFloor(sp);
  for(const t of tables) if(t.kind==='vip'){ const [vx,vy]=P(t.x+t.w/2,t.y+t.d/2); ell(MD,vx,vy,TW*1.35,TW*.67,SAK.petal,INK,MD.OL*.8); ell(MD,vx,vy,TW*1.2,TW*.6,null,'#fff4f7',MD.OL*1.4);   /* pink sakura rug */
    const r=seeded(77); ctx.save(); ctx.beginPath(); ctx.ellipse(vx,vy,TW*1.18,TW*.58,0,0,7); ctx.clip();
    for(let i=0;i<16;i++){ const a=r()*6.3, d=Math.sqrt(r()); sakuraFlower(ctx,vx+Math.cos(a)*d*TW*1.05,vy+Math.sin(a)*d*TW*.5,TW*(.09+r()*.05),i%2?'#fff4f7':SAK.petalLt,SAK.core,SAK.petalDk,MD.OL*.35); } ctx.restore(); }
  for(const pd of PADS) if(pd.vis()) drawPad(pd);
  if(S.bought.register&&!S.bought.cashier&&!DEBUG.clean) ring(PT.cashier,'rgba(255,255,255,.25)');
  if(S.bought.register&&!DEBUG.clean) for(let i=0;i<CFG.queueMax;i++){const [qx,qy]=P(...slotPos(i));ctx.save();ctx.globalAlpha=.35;ctx.translate(qx,qy);ctx.scale(1,.5);pawPrint(MD,0,0,TW*.13,'#fff');ctx.restore()}
  /* depth-sorted world */
  const L=[], add=(d,f)=>L.push([d,f]);
  const CK=e=>charKey(e.x,e.y);
  for(const d of GROUND_DECOR) if(decorVisible(d)) add(d.x+d.y,()=>d.k==='tree'?drawTreeP1(d.x,d.y,d.s,d.seed):drawEnv(d.k,d.x,d.y,{scale:d.s}));
  for(const z of ZONES) if(!zoneOpen(z)){const sp=spotById(z.spot);if(S.task>=taskIndex(sp.unlock)-3) add(z.x+z.w/2+z.y+z.d/2,()=>drawSprite('lock_sign',z.x+z.w/2-.3,z.y+z.d/2-.15));}
  if(S.bought.register){ addCounter(add);
    /* queue posts along the far side of the line */
    const qx=[8.0,10.1,12.2]; qx.forEach((x,i)=>add(x+9.05,()=>{ drawPost(x,9.05); if(i<qx.length-1) drawRope(x,qx[i+1],9.05); })); }
  for(const st of stations) add(st.x+st.w+st.y+st.d*.5,()=>drawStation(st));
  for(const t of tables) drawTableAndSeats(t,add);
  for(const b of bins) add(b.x+b.y+.8,()=>drawEnv('bin',b.x+b.w/2,b.y+b.d/2+.2));
  for(const d of decorObjs) add(d.x+d.w/2+d.y+d.d/2,()=>d.sprite==='planter'?drawPlanter(d.x,d.y,d.w,d.d):drawEnv(d.sprite,d.x+d.w/2,d.y+d.d/2+.1));
  for(const pr of KITCHEN_PROPS) if(!pr.need||S.bought[pr.need]) add(pr.x+pr.y,()=>drawEnv(pr.k,pr.x,pr.y,{flip:pr.flip}));
  if(S.bought.office){ const o=spotById('office'); add(o.fp[0]+o.fp[2]+o.fp[1]+o.fp[3]*.5,()=>drawDesk(...o.fp)); add(CK(MGR),()=>drawManager()); }
  { const rb=spotById('ribbon'), [rx,ry]=[rb.fp[0],rb.fp[1]];
    if(S.bought.ribbon){ addBalloonArch(add,7.15,19.9,7.15,22.5,2.3,'GRAND OPENING',false); drawGrandDecor(add); }
    else if(spotVisible(rb)) addBalloonArch(add,7.15,19.9,7.15,22.5,2.3,null,true); }
  for(const c of customers) add(CK(c)+(c.seat&&c.seat.side==='Lv'&&c.x===c.seat.x&&c.y===c.seat.y?(VIP_SIT_DEPTH):0),()=>drawCustomer(c));  // the VIP sits at the near end of the booth, drawn over the table edge so the legs show
  for(const w of workers) add(CK(w),()=>{const an=charAnim(w,false);const [sx,sy]=drawChar(w,w.skin,an);if(an==='sleep')iconBubble(sx+TW*.28,sy-TW*1.1,'sleep')});
  add(CK(player),drawPlayer);
  L.sort((a,b)=>a[0]-b[0]); for(const [,f] of L) f();
  /* overhead */
  for(const sp of SPOTS) if(spotVisible(sp)){const [cx,cy]=fpCenter(sp.fp);costBubble(cx,cy,(sp.kind==='zone'||sp.kind==='stage'||sp.kind==='hire')?1.5:1.2,sp.cost-(sp.paid||0),sp.label)}
  for(const c of customers) customerOverhead(c);
  { const front=customers.find(c=>c.state==='order'); const ca=workers.find(w=>w.role==='cashier');
    if(front&&cashierPresent()&&orderLeft(front)>0){ const who=ca&&!(ca.asleep||ca.idleT>CFG.sleepAfter)?ca:player; const [cx,cy]=P(who.x,who.y,1.8); iconBubble(cx+TW*.25,cy,'cash'); } }
  for(const t of tables) if(t.trash>0&&!t.seats.some(s=>s.occ&&seatedAt(s.occ))){ const [cx,cy]=P(t.x+t.w/2,t.y+t.d/2,1.55+Math.sin(now*4+t.x)*.06); iconBubble(cx,cy,'trash'); }
  if(DEBUG.fp){ for(const sp of SPOTS) if(S.bought[sp.id]){ const [x,y,w,d]=sp.fp; poly(MD,[P(x,y),P(x+w,y),P(x+w,y+d),P(x,y+d)],null,'#f0f',2); if(sp.pt){const [a,b]=P(...sp.pt); ell(MD,a,b,4,2,'#00f',null);} } }
  for(const st of stations) if(st.def.needs&&st.ing<=0&&!DEBUG.clean){const [sx,sy]=P(st.x+st.w/2,st.y+st.d/2,elevAt(st.x,st.y)+2.1);drawEmote('bang',sx,sy+Math.sin(now*6)*2);drawItemAt('ing',sx+TW*.2,sy-TW*.05,.6)}
  for(const w of workers) if(w.emoteT>0) drawEmote(w.emote,...P(w.x,w.y,1.7));
  if(catOf(player.carry)==='food'&&dist(player.x,player.y,...PT.tray)<1.0&&!player.carry.some(k=>tray[k]<TRAY_CAP)){const [sx,sy]=P(COUNTER.x+.5,PT.tray[1],1.6);label(sx,sy,'COUNTER FULL','#ffb36b')}
  if(player.carry.length>=carryMax()){const [sx,sy]=P(player.x,player.y,pz+2.15);label(sx,sy,'MAX','#ffd34d')}
  for(const f of flyers) drawFlyer(f);
  const tg=taskTarget(); if(tg) drawGuide(tg);
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);const [sx,sy]=P(p.wx,p.wy,p.wz);ell(MD,sx,sy,TW*p.r,TW*p.r,p.c,null)}ctx.globalAlpha=1;
  for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life*1.5);const [sx,sy]=P(f.wx,f.wy,f.z+elevAt(f.wx,f.wy));label(sx,sy,f.txt,f.col)}ctx.globalAlpha=1;
  drawJoystick();
}
/* manager: turns toward the owner when they come over, waves while they use the upgrade pad, otherwise checks the tablet now and then */
const MGR={x:PT.mgr[0],y:PT.mgr[1],dir:0,t:0,seed:1.7,carry:[],path:[],walking:false,goalT:0,goal:null,talkT:0};
const MGR_SPOTS=[()=>PT.mgr,()=>[4.4,4.2],()=>[13.25,3.6],()=>[9.6,9.9],()=>[13.25,14.6]];
function updateManager(dt){ if(!S.bought.office) return; const M=MGR; M.t=now; M.talkT=Math.max(0,M.talkT-dt);
  const sleepy=workers.find(w=>w.role!=='cashier'&&(w.asleep||w.idleT>CFG.sleepAfter))||workers.find(w=>w.role==='cashier'&&(w.asleep||w.idleT>CFG.sleepAfter));
  if(sleepy){ if(M.goal!==sleepy){ M.goal=sleepy; goTo(M,sleepy.x+.6,sleepy.y+.6); }
    if(dist(M.x,M.y,sleepy.x,sleepy.y)<1.1){ wakeWorker(sleepy); emote(sleepy,'bang',1); M.talkT=1.6; faceTo(M,sleepy.x,sleepy.y); M.goal=null; M.path=[]; M.goalT=3; }
  } else { M.goalT-=dt; if(M.goalT<=0&&!M.path.length&&M.talkT<=0){ const pt=MGR_SPOTS[Math.floor(Math.random()*MGR_SPOTS.length)](); goTo(M,pt[0],pt[1]); M.goalT=7+Math.random()*5; M.goal=null; } }
  M.walking=false; if(M.path&&M.path.length&&M.talkT<=0){ followPath(M,dt,CFG.npcSpeed.worker*.9); } }
function drawManager(){ const M=MGR, near=dist(player.x,player.y,M.x,M.y)<2.2;
  if(!M.walking&&near&&!M.talkT) faceDir(M,player.x-M.x,player.y-M.y);
  const onPad=dist(player.x,player.y,...PT.padManager)<.9;
  const [sx,sy]=drawChar(M,'manager',M.walking?'walk':M.talkT>0||onPad?'talk':((now%7)<3.5?'tablet':'idle'));
  if(M.talkT>0) iconBubble(sx+TW*.28,sy-TW*1.15,'angry'); }
function drawPlayer(){const anim=player.happyT>0&&!player.walking?'happy':charAnim(player,false); drawChar(player,'chef',anim);}
const VIP_SIT_OFF=[.75,.05], VIP_SIT_DEPTH=.8, VIP_SIT_H={vipfedora:1.02,vip01:.95};   // world offset of the sitting sprite's feet anchor from the booth seat (tuned in QA)
function vipSitting(c){ return false&&c.vip&&c.seat&&c.seat.side==='Lv'&&(c.state==='eat'||c.state==='vipWait')&&c.x===c.seat.x&&c.y===c.seat.y&&MORE_SPRITES[c.skin]&&(MORE_SPRITES[c.skin].sit_315||MORE_SPRITES[c.skin].sit_eat); }
function drawVipSitting(c){ const set=MORE_SPRITES[c.skin], t=c.t||now, mad=c.state==='vipWait'&&c.patience<c.pMax*CFG.patience.impatientAt;
  let m;
  if(c.state==='eat'){ const cyc=Math.floor(t/2.8)%2, f=1+Math.floor(t*3.2)%4;      // the sheet's drink loop (and the dessert loop for VIP 2)
    m=(cyc===1&&set.dessert_1)?set['dessert_'+f]:set['drink_'+f]; }
  else m=mad?(set.sit_angry||set.sit_315):set.sit_315;
  if(!m||!m.img) return;
  const wx=c.x+VIP_SIT_OFF[0], wy=c.y+VIP_SIT_OFF[1], [sx,sy]=P(wx,wy,elevAt(wx,wy)), k=TW*(VIP_SIT_H[c.skin]||1)/(m.ay);
  ctx.save(); ctx.translate(sx+(mad?Math.sin(t*38)*TW*.008:0),sy); ctx.scale(k,k); ctx.drawImage(m.img,-m.ax,-m.ay,m.w,m.h); ctx.restore(); }
/* ---- tables: the approved red-chair table set (P1). A seated customer is drawn between the table (with the back chair)
   and the front chair: on the back chair (L) the eating frames show the upper body behind the table edge, on the front
   chair (R) the back view shows head and shoulders above the chair back. ---- */
/* ---- tables: grid-aligned iso table sets in the approved look (cream top, black pedestal, red chairs).
   Back chair L on the -x side, front chair R on the +x side. Seated customers sit between the chair and the table;
   the eating pose is one fixed frame holding the food (no arm motion). ---- */
const TB={hw:.62,z:.44,seat:.3,cx:1.1,ch:.56};
const TBC={top:'#fbe5bd',topL:'#d9b07a',topR:'#e8c58f',leg:'#3a3a40',legD:'#26262b',red:'#e2463f',redL:'#b8322e',redR:'#c93a33'};
function tableUnits(t){ return t.kind==='table4p'?[[t.x+t.w/2,t.y+.75],[t.x+t.w/2,t.y+2.2]]:[[t.x+t.w/2,t.y+t.d/2]]; }
function seatedAt(c){ return c.seat&&(c.state==='eat'||c.state==='vipWait')&&Math.abs(c.x-c.seat.x)<.01&&Math.abs(c.y-c.seat.y)<.01; }
function chairSeatBox(x,y){ const h=TB.ch/2, D=MD;
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) box(D,x+a*(h-.05)-.03,y+b*(h-.05)-.03,0,.06,.06,TB.seat,TBC.leg,TBC.legD,TBC.leg);
  box(D,x-h,y-h,TB.seat,TB.ch,TB.ch,.09,TBC.red,TBC.redL,TBC.redR); }
function chairBackY(x,y){ const h=TB.ch/2; box(MD,x-h,y-h,TB.seat+.1,TB.ch,.11,.62,TBC.red,TBC.redL,TBC.redR); }
function chairBack(x,y,side){ const h=TB.ch/2, bx=side<0?x-h:x+h-.11; box(MD,bx,y-h,TB.seat+.1,.11,TB.ch,.62,TBC.red,TBC.redL,TBC.redR); }
function tableTop(cx,cy,hd,vip){ const D=MD, hw=TB.hw;
  { const [bx,by]=P(cx,cy,0); ell(D,bx,by,TW*.28,TW*.14,TBC.leg,INK,D.OL*.7); }
  box(D,cx-.08,cy-.08,0,.16,.16,TB.z,TBC.leg,TBC.legD,TBC.leg);
  if(!vip){ box(D,cx-hw,cy-hd,TB.z,hw*2,hd*2,.08,TBC.top,TBC.topL,TBC.topR); return; }
  const o=.06, z1=TB.z+.08, z0=TB.z-.2;
  box(D,cx-hw-o,cy-hd-o,z0,hw*2+o*2,hd*2+o*2,z1-z0,'#f7c2cf','#e08ba2','#eba3b6');   /* sakura-pink VIP table */
  poly(D,[P(cx-hw-o,cy+hd+o,z0),P(cx+hw+o,cy+hd+o,z0),P(cx+hw+o,cy+hd+o,z0+.05),P(cx-hw-o,cy+hd+o,z0+.05)],'#fff4f7',INK,D.OL*.5);
  poly(D,[P(cx+hw+o,cy-hd-o,z0),P(cx+hw+o,cy+hd+o,z0),P(cx+hw+o,cy+hd+o,z0+.05),P(cx+hw+o,cy-hd-o,z0+.05)],'#fff4f7',INK,D.OL*.5);
  poly(D,[P(cx-hw*.55,cy-hd-o,z1+.002),P(cx+hw*.55,cy-hd-o,z1+.002),P(cx+hw*.55,cy+hd+o,z1+.002),P(cx-hw*.55,cy+hd+o,z1+.002)],'#fff2d0',null);
  const [vx,vy]=P(cx-hw*.55,cy-hd*.55,z1); cyl(D,vx,vy,TW*.05,TW*.025,TW*.13,'#bfe3f0',null,INK);
  sakuraFlower(ctx,vx,vy-TW*.18,TW*.07,SAK.petal,SAK.core,SAK.petalLn,D.OL*.5); ell(D,vx+TW*.04,vy-TW*.13,TW*.03,TW*.018,'#5aa63c',null);
  const [kx,ky]=P(cx+hw*.55,cy-hd*.55,z1); ctx.fillStyle='#fff6e0'; ctx.fillRect(kx-TW*.022,ky-TW*.16,TW*.044,TW*.16); ctx.strokeStyle=INK; ctx.lineWidth=D.OL*.6; ctx.strokeRect(kx-TW*.022,ky-TW*.16,TW*.044,TW*.16);
  const f=.7+.3*Math.sin(now*9+cx); ell(D,kx,ky-TW*.2,TW*.025*f,TW*.045*f,'#ffcf4a','#ff8a2a',D.OL*.5); }
function drawSeated(c,sx0,sy0,side){ const set=MORE_SPRITES[c.skin]; if(!set) return; const t=(c.t||now)+(c.seed||0);
  /* the approved sitting sprite (holding the food), whole body, drawn behind the table so the table top hides the legs.
     L chair (-x side) faces screen down-right as drawn; T chair (-y side) is the mirror. Same scale group as walking. */
  const m=set.sit1||set.sit_eat_seat1||set.idle_315; if(!m||!m.img) return;
  const T=side==='T', k=TW*(SHEET_H[c.skin]||1)/150*m.s*(c.kid?.86:1);
  const [hx,hy]=P(sx0+(T?0:.22),sy0+(T?.22:0),TB.seat-.02), mad=c.state==='vipWait'&&c.patience<c.pMax*CFG.patience.impatientAt;
  ctx.save(); ctx.translate(hx+(mad?Math.sin(t*38)*TW*.01:0),hy); ctx.scale(k*(T?-1:1),k);
  ctx.drawImage(m.img,-m.ax,-m.ay,m.w,m.h); ctx.restore(); }
function drawCustomer(c){const anim=charAnim(c,true);
  if(seatedAt(c)&&c.table) return;   // drawn with its table (see drawTableAndSeats)
  drawChar(c,c.skin,anim,{customer:true,scale:c.kid?.84:1});}
function drawTableAndSeats(t,add){
  const units=tableUnits(t), hd=TB.hw;
  units.forEach((u,ui)=>{ const [cx,cy]=u;
    add(cx+cy+.6,()=>{
      const seats=t.seats.filter((s,i)=>Math.floor(i/2)===ui), occ=sd=>seats.find(s=>s.side===sd&&s.occ&&seatedAt(s.occ));
      const hasT=seats.some(s=>s.side==='T');
      if(hasT){ chairBackY(cx,cy-TB.cx); chairSeatBox(cx,cy-TB.cx); const sT=occ('T'); if(sT) drawSeated(sT.occ,cx,cy-TB.cx,'T'); }
      chairBack(cx-TB.cx,cy,-1); chairSeatBox(cx-TB.cx,cy);
      const sL=occ('L'); if(sL) drawSeated(sL.occ,cx-TB.cx,cy,'L');
      tableTop(cx,cy,hd,t.kind==='vip');
      const top=P(cx,cy,TB.z+.07);
      const food=t.food.filter((k,i)=>i%units.length===ui), tr=ui===0?t.trash:0;
      if(food.length) drawOnSurface(food,top[0],top[1],{cols:2,max:4,scale:.62,du:.42,dv:.38,badge:false});
      if(tr>0) drawOnSurface(Array(Math.min(tr,4)).fill('trash'),top[0],top[1],{cols:2,max:4,scale:.62,du:.44,dv:.38,badge:false});
      if(t.pile>0&&ui===0) coinPile(top[0],top[1]-TW*.04,t.pile);
      if(t.kind==='vip'){ const [sx,sy]=P(cx,cy,1.75); label(sx,sy,'VIP','#ffd34d'); }
    }); });
}
/* ---- stations: approved station art; finished food sits on the station's own pickup ledge ---- */
function stationArt(st){ if(st.type==='pantry'){ const f=st.stock/Math.max(1,stCap(st)); return 'shelf'+(f<=0?0:f<.34?1:f<.67?2:3); } return STATION_ART[st.type]; }
function balloon(x,y,z,col,s=1){ const [sx,sy]=P(x,y,z), t=now+x*1.3; const bx=sx+Math.sin(t*1.5)*TW*.03;
  ctx.strokeStyle='#8a6a58'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(bx,sy-TW*.05); ctx.quadraticCurveTo(bx+TW*.04,sy+TW*.35*s,sx,sy+TW*.7*s); ctx.stroke();
  ell(MD,bx,sy-TW*.2*s,TW*.15*s,TW*.18*s,col,INK,MD.OL*.7); ell(MD,bx-TW*.05*s,sy-TW*.27*s,TW*.035*s,TW*.05*s,'rgba(255,255,255,.7)',null); }
function drawGrandDecor(add){ const cols=[SAK.petal,'#fff4f7','#f4a3bb','#9fd0f0','#ffd98a'];
  addBalloonArch(add,18.7,LANE.y0-.1,18.7,LANE.y1+.1,2.4,'GRAND OPENING',false);
  /* balloon clusters at the doors and corners */
  for(const [x,y] of [[18.4,7.2],[18.4,9.8],[7.4,.5],[18.2,.5],[7.4,23.8],[18.2,23.8]]) add(x+y,()=>{ balloon(x,y,1.2,cols[0]); balloon(x+.15,y-.1,1.45,cols[1]); balloon(x-.1,y+.15,1.3,cols[3]); });
  /* pennants (white with a red sun, pink) along the top of both walls */
  add(-1,()=>{ for(const [a,b,axis] of [[0,18.5,'x'],[0,19.6,'y']]) for(let u=a+.3;u<b;u+=.6){ const p0=axis==='x'?P(u,0,2.75):P(0,u,2.75), p1=axis==='x'?P(u+.3,0,2.45):P(0,u+.3,2.45), p2=axis==='x'?P(u+.6,0,2.75):P(0,u+.6,2.75);
    pennant(MD,p0,p2,p1,Math.round(u/.6)); } });
}
function drawDesk(x,y,w,d){ const H=.62; box(MD,x,y,0,w,d,H,'#fbe5bd','#9a5a30','#b56f3d'); box(MD,x-.05,y-.05,H,w+.1,d+.1,.1,'#fbe5bd','#e9c793','#f2d3a2');
  const [sx,sy]=P(x+w*.4,y+d*.5,H+.1); drawItemAt('ing',sx+TW*.15,sy+TW*.02,.55); }
function stationBase(st){ return [st.x+st.w/2,st.y+st.d/2]; }
/* flat steel tray, sides along the world axes so it lines up with the station it stands on */
function drawIsoTray(sx,sy,w,d){ const ux=TW/2,uy=TW/4, a=[sx-(w/2)*ux+(d/2)*ux, sy-(w/2)*uy-(d/2)*uy];
  const pt=(u,v,z=0)=>[a[0]+u*w*ux-v*d*ux, a[1]+u*w*uy+v*d*uy-z*TW];
  const rim=.05, q=(u0,v0,u1,v1,z)=>[pt(u0,v0,z),pt(u1,v0,z),pt(u1,v1,z),pt(u0,v1,z)];
  poly(MD,[pt(0,1),pt(1,1),pt(1,1,rim),pt(0,1,rim)],'#8f98a3',INK,MD.OL*.7);
  poly(MD,[pt(1,0),pt(1,1),pt(1,1,rim),pt(1,0,rim)],'#a7afb9',INK,MD.OL*.7);
  poly(MD,q(0,0,1,1,rim),'#d6dce2',INK,MD.OL*.8); poly(MD,q(.08,.08,.92,.92,rim),'#bfc6ce',null); }
function drawPost(x,y){ const [sx,sy]=P(x,y); ell(MD,sx,sy,TW*.13,TW*.065,'#4a4a52',INK,MD.OL*.7);
  ctx.fillStyle='#55555e'; ctx.fillRect(sx-TW*.035,sy-TW*.5,TW*.07,TW*.5); ctx.strokeStyle=INK; ctx.lineWidth=MD.OL*.7; ctx.strokeRect(sx-TW*.035,sy-TW*.5,TW*.07,TW*.5);
  ell(MD,sx,sy-TW*.52,TW*.055,TW*.045,'#6a6a74',INK,MD.OL*.7); }
function drawRope(x0,x1,y){ const a=P(x0,y,.85), b=P(x1,y,.85); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+TW*.1,b[0],b[1]);
  ctx.strokeStyle=INK; ctx.lineWidth=MD.OL*2.4; ctx.stroke(); ctx.strokeStyle='#e2463f'; ctx.lineWidth=MD.OL*1.3; ctx.stroke(); }
/* small storage rack against the left wall, open side facing the kitchen (+x); crates fill it Empty/Low/Half/Full */
function drawShelf(st){ const x=st.x,y=st.y,w=st.w,d=st.d,H=1.55, D=MD, f=Math.max(0,Math.min(1,st.stock/Math.max(1,stCap(st))));
  const post=(px,py)=>box(D,px,py,0,.07,.07,H,'#6b6f78','#4c5058','#5b5f68');
  post(x,y); post(x,y+d-.07);
  box(D,x,y,0,.1,d,H,'#8a8f98','#6b6f78','#7a7f88');                       // back panel on the wall
  const levels=[.12,.6,1.08], cols=[['#e2463f','#b8322e'],['#f4c04e','#c99418'],['#7cc05a','#4f8f3a'],['#f2b3c4','#d07a92'],['#d9a868','#a7652f']];
  const n=Math.round(f*9); let i=0;
  levels.forEach((z,li)=>{ box(D,x,y,z,w,d,.05,'#c3c7ce','#8a8f98','#a3a8b0');
    for(let j=0;j<3;j++){ if(i++>=n) continue; const c=cols[(li*3+j)%cols.length], cy=y+.08+j*(d-.16)/3;
      box(D,x+.1,cy,z+.05,w-.2,(d-.16)/3-.04,.3,c[0],c[1],c[0]); } });
  box(D,x,y,H,w,d,.05,'#c3c7ce','#8a8f98','#a3a8b0');
  post(x+w-.07,y); post(x+w-.07,y+d-.07); }
/* depth key for a character: never sorted behind a station/counter it stands in front of */
function charKey(x,y){ let k=x+y;
  for(const st of stations){ const k0=st.x+st.w+st.y+st.d*.5;
    if((x>=st.x+st.w-.05&&y>st.y-1.2&&y<st.y+st.d+1.2)||(y>=st.y+st.d-.05&&x>st.x-1.2&&x<st.x+st.w+1.2)) k=Math.max(k,k0+.02); }
  return k; }
/* wooden planter box with round bushes, true iso, long side along the footprint */
function drawPlanter(x,y,w,d){ const H=.42; box(MD,x,y,0,w,d,H,'#7a4a2a','#b56f3d','#9a5a30'); box(MD,x+.05,y+.05,H-.04,w-.1,d-.1,.04,'#5a3a24',null,null);
  const n=Math.max(2,Math.round(Math.max(w,d)/.45)), along=w>=d;
  for(let i=0;i<n;i++){ const f=(i+.5)/n, cx=along?x+w*f:x+w/2, cy=along?y+d/2:y+d*f, [sx,sy]=P(cx,cy,H), R=TW*.2;
    for(const [ox,oy,r,c] of [[0,-R*.55,R,'#3f8f2c'],[-R*.45,-R*.3,R*.7,'#3f8f2c'],[R*.45,-R*.3,R*.7,'#3f8f2c']]){ ctx.beginPath(); ctx.arc(sx+ox,sy+oy,r,0,7); ctx.fillStyle=c; ctx.fill(); ctx.lineWidth=MD.OL*.8; ctx.strokeStyle='#245a1a'; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(sx-R*.15,sy-R*.7,R*.6,0,7); ctx.fillStyle='#5db53a'; ctx.fill(); ctx.beginPath(); ctx.arc(sx-R*.3,sy-R*.85,R*.28,0,7); ctx.fillStyle='#86d14f'; ctx.fill();
    /* azalea-style blossoms on the bushes (Meow Sakura) */
    for(const [ox,oy,k] of [[-R*.5,-R*.75,1],[R*.35,-R*.95,0],[R*.6,-R*.35,1],[-R*.1,-R*.25,0],[R*.05,-R*1.25,1]]) sakuraFlower(ctx,sx+ox,sy+oy,R*.26,k?SAK.petal:'#fff4f7',SAK.core,SAK.petalLn,MD.OL*.4); } }
function drawStation(st){
  if(st.type==='pantry'){ drawShelf(st); const [tx,ty]=P(st.x+st.w/2,st.y+st.d/2,1.85); if(st.stock<stCap(st)){ const p=st.timer/stInterval(st); ell(MD,tx,ty,TW*.14,TW*.14,'rgba(255,255,255,.95)',INK,MD.OL*.8);ctx.beginPath();ctx.moveTo(tx,ty);ctx.arc(tx,ty,TW*.105,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.closePath();ctx.fillStyle='#7ed957';ctx.fill(); } return; }
  drawCodeStation(st);
  const it=st.def.item;
  if(st.stock>0){ const [px,py]=stReadyPt(st); drawOnSurface(Array(Math.min(st.stock,4)).fill(it),px,py,{cols:2,max:4,scale:.5,du:.3,dv:.26,badge:false}); if(st.stock>1) countBadge(px+TW*.32,py-TW*.36,st.stock); }
  const [tx,ty]=stTopPt(st);
  if(st.stock<stCap(st)&&(!st.def.needs||st.ing>0)){ const rx=tx, ry=ty-TW*.12, p=st.timer/stInterval(st);
    ell(MD,rx,ry,TW*.14,TW*.14,'rgba(255,255,255,.95)',INK,MD.OL*.8);ctx.beginPath();ctx.moveTo(rx,ry);ctx.arc(rx,ry,TW*.105,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.closePath();ctx.fillStyle=isBoost()?'#5cb4f0':'#7ed957';ctx.fill();}
  else if(st.stock>=stCap(st)&&it!=='ing'){ label(tx,ty-TW*.12,'MAX','#ffd34d'); }
  if(st.def.needs&&!DEBUG.clean){ const [px,py]=P(st.x+st.w+.25,st.y+st.d+.25,.05); const max=st.def.ingCap; for(let i=0;i<max;i++){ ell(MD,px+(i-max/2+.5)*TW*.11,py,TW*.045,TW*.045,i<st.ing?'#e2463f':'rgba(255,255,255,.7)',INK,MD.OL*.6);} }
}
/* ---- the PICK UP counter: register end (lower-left, cashier side) + the long pickup section with one display tray
   per dish. Players drop food here; the count on each tray is what is ready to hand out. ---- */
/* ---- the PICK UP counter: drawn as true-iso boxes in the approved style (cream top, wooden panels, red PICK UP sign)
   so it sits exactly on its footprint. It is split into 1-tile segments along y so cats behind (kitchen side) and in front
   (customer side) sort correctly against it. Register + plant at the lower end (cashier side). ---- */
const CTRC={h:.78,top:'#fbe5bd',topL:'#e9c793',topR:'#f2d3a2',woodL:'#9a5a30',woodR:'#b56f3d',seam:'#7e4522',sign:'#e2463f'};
function counterKinds(){ return FOODS.filter(k=>(tray[k]||0)>0||hasStationFor(k)); }
function counterSegs(){ const c=COUNTER, out=[]; for(let y=c.y;y<c.y+c.d-.01;y+=1) out.push([y,Math.min(1,c.y+c.d-y)]); return out; }
const CTR_REG_Y=()=>COUNTER.y+COUNTER.d-.75, CTR_SIGN=()=>[COUNTER.y+.5,COUNTER.y+COUNTER.d-1.9];
function drawCounterSeg(y0,len,first,last){ const c=COUNTER, H=CTRC.h, x0=c.x, x1=c.x+c.w, y1=y0+len, D=MD;
  /* base: +x face (customer side) and +y end cap */
  poly(D,[P(x1,y0,0),P(x1,y1,0),P(x1,y1,H-.08),P(x1,y0,H-.08)],CTRC.woodR,null);
  for(const v of [y0+.08,y0+len*.5]) line(D,[P(x1,v,.06),P(x1,v,H-.14)],CTRC.seam,D.OL*.7);
  line(D,[P(x1,y0,.06),P(x1,y1,.06)],CTRC.seam,D.OL*.8);
  if(last) poly(D,[P(x0,y1,0),P(x1,y1,0),P(x1,y1,H-.08),P(x0,y1,H-.08)],CTRC.woodL,INK,D.OL);
  line(D,[P(x1,y0,0),P(x1,y1,0)],INK,D.OL); if(first) line(D,[P(x1,y0,0),P(x1,y0,H)],INK,D.OL);
  /* red PICK UP sign (with sakura blossoms) on the customer face, clipped to this segment */
  const [s0,s1]=CTR_SIGN(), a=Math.max(s0,y0), b=Math.min(s1,y1);
  if(b>a){ onFace(D,'x',x1,y1,H-.18,g=>{ g.save(); g.beginPath(); g.rect(0,0,len,.6); g.clip();
      const u0=y1-s1, u1=y1-s0; g.fillStyle=CTRC.sign; g.strokeStyle=INK; g.lineWidth=.035; rr(g,u0,.04,u1-u0,.44,.06); g.fill(); g.stroke();
      g.fillStyle='#fff6ea'; g.font='700 30px Fredoka, sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      g.save(); g.translate((u0+u1)/2+.12,.27); g.scale(.0105,.0105); g.fillText('PICK UP',0,0);
      g.beginPath(); g.arc(-82,-2,13,0,7); g.fill(); g.beginPath(); g.moveTo(-94,-8); g.lineTo(-92,-22); g.lineTo(-84,-13); g.moveTo(-70,-8); g.lineTo(-72,-22); g.lineTo(-80,-13); g.fill(); g.restore();
      sakuraFlower(g,u0+.06,.08,.1,SAK.petal,SAK.core,SAK.petalLn,.012); sakuraFlower(g,u0+.2,.02,.07,'#fff4f7',SAK.core,SAK.petalLn,.01); sakuraFlower(g,u1-.08,.46,.09,SAK.petal,SAK.core,SAK.petalLn,.012);
      g.restore(); }); }
  /* overhanging cream top slab */
  const o=.07, zt=H-.08, zb=H+.05;
  poly(D,[P(x1+o,y0,zt),P(x1+o,y1,zt),P(x1+o,y1,zb),P(x1+o,y0,zb)],CTRC.topR,null);
  if(last) poly(D,[P(x0-o,y1+o,zt),P(x1+o,y1+o,zt),P(x1+o,y1+o,zb),P(x0-o,y1+o,zb)],CTRC.topL,INK,D.OL);
  poly(D,[P(x0-o,y0,zb),P(x1+o,y0,zb),P(x1+o,y1+(last?o:0),zb),P(x0-o,y1+(last?o:0),zb)],CTRC.top,null);
  line(D,[P(x1+o,y0,zt),P(x1+o,y1+(last?o:0),zt)],INK,D.OL); line(D,[P(x1+o,y0,zb),P(x1+o,y1+(last?o:0),zb)],INK,D.OL*.8);
  line(D,[P(x0-o,y0,zb),P(x0-o,y1+(last?o:0),zb)],INK,D.OL*.8);
  if(first){ poly(D,[P(x0-o,y0-o,zb),P(x1+o,y0-o,zb),P(x1+o,y0,zb),P(x0-o,y0,zb)],CTRC.top,null); line(D,[P(x0-o,y0-o,zb),P(x1+o,y0-o,zb),P(x1+o,y0-o,zt)],INK,D.OL*.8); }
  if(last){ line(D,[P(x0-o,y1+o,zb),P(x1+o,y1+o,zb)],INK,D.OL*.8); }
  /* what sits on this part of the top */
  const ks=counterKinds(), ry=CTR_REG_Y(), s0f=c.y+.45, s1f=ry-.75, n=Math.max(1,ks.length), step=Math.min(.95,(s1f-s0f)/Math.max(1,n-1));
  ks.forEach((k,i)=>{ const fy=s0f+i*step; if(fy<y0||fy>=y1) return; const [px,py]=P(c.x+c.w*.5,fy,zb); const cnt=tray[k]||0;
    if(cnt>0) drawOnSurface(Array(Math.min(cnt,4)).fill(k),px,py,{cols:2,max:4,scale:.56,du:.34,dv:.28,badge:false});
    if(cnt>1) countBadge(px+TW*.26,py-TW*.36,cnt); });
  if(ry>=y0&&ry<y1){ const [rx,ryy]=P(c.x+c.w*.45,ry,zb); drawEnvAt('register',rx,ryy+TW*.06); }
}
function addCounter(add){ const segs=counterSegs(); segs.forEach(([y,len],i)=>add(COUNTER.x+COUNTER.w*.7+y+len*.5,()=>drawCounterSeg(y,len,i===0,i===segs.length-1))); }
function countBadge(x,y,n){if(DEBUG.clean)return;if(n<2)return;ctx.save();ctx.font=`700 ${TU*.13}px Fredoka, sans-serif`;const t='×'+n,w=ctx.measureText(t).width+TU*.1;rr(ctx,x-w/2,y-TU*.09,w,TU*.17,TU*.08);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=MD.OL*.7;ctx.stroke();ctx.fillStyle=INK;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y);ctx.restore()}
function coinPile(sx,sy,amt){const n=Math.min(24,Math.ceil(amt/6));for(let c=0;c<4;c++){const cnt=Math.floor(n/4)+(c<n%4?1:0);const dx=[-1,1,-1,1][c]*TW*.08,dy=[-1,-1,1,1][c]*TW*.04;for(let i=0;i<cnt;i++) drawItemAt('coin',sx+dx,sy+dy-i*TW*.028,1)}}
function drawSpotFloor(sp){if(DEBUG.clean)return;const [x,y,w,d]=sp.fp,z=sp.zone?elevAt(x+w/2,y+d/2):0,prog=buyProg[sp.id]||0;const pts=[P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)];
  poly(MD,pts,`rgba(255,255,255,${.22+.45*prog})`,null);ctx.save();ctx.setLineDash([TW*.12,TW*.09]);ctx.lineDashOffset=-now*TW*.25;poly(MD,pts,null,INK,MD.OL*1.1);ctx.restore();}
function ring(pt,fill){const [sx,sy]=P(pt[0],pt[1]);ctx.save();ctx.setLineDash([TW*.1,TW*.08]);ell(MD,sx,sy,TW*.42,TW*.21,fill,INK,MD.OL);ctx.restore()}
function drawPad(pd){if(DEBUG.clean)return;const [sx,sy]=P(...pd.pt);ctx.save();ctx.setLineDash([TW*.1,TW*.08]);ctx.lineDashOffset=-now*TW*.25;ell(MD,sx,sy,TW*.5,TW*.25,'rgba(255,255,255,.3)',INK,MD.OL*1.1);ctx.restore();
  const b=Math.sin(now*4+pd.pt[0])*TW*.03;poly(MD,[[sx,sy-TW*.17+b],[sx+TW*.12,sy-TW*.04+b],[sx+TW*.05,sy-TW*.04+b],[sx+TW*.05,sy+TW*.08+b],[sx-TW*.05,sy+TW*.08+b],[sx-TW*.05,sy-TW*.04+b],[sx-TW*.12,sy-TW*.04+b]],pd.color)}
function label(sx,sy,txt,col){if(DEBUG.clean)return;ctx.font=`700 ${TU*.24}px Fredoka, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=MD.OL*1.8;ctx.strokeStyle=INK;ctx.strokeText(txt,sx,sy);ctx.fillStyle=col;ctx.fillText(txt,sx,sy)}
function costBubble(wx,wy,z,amt,name){const [sx,sy]=P(wx,wy,z+elevAt(wx,wy));ctx.font=`600 ${TU*.13}px Fredoka, sans-serif`;const w=Math.max(TU*.86,ctx.measureText(name).width+TU*.24),h=TU*.62;
  ctx.save();rr(ctx,sx-w/2,sy-h,w,h,TU*.18);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=MD.OL;ctx.stroke();
  ctx.beginPath();ctx.moveTo(sx-TU*.08,sy-1);ctx.lineTo(sx,sy+TU*.1);ctx.lineTo(sx+TU*.08,sy-1);ctx.fillStyle='#fff';ctx.fill();ctx.beginPath();ctx.moveTo(sx-TU*.08,sy);ctx.lineTo(sx,sy+TU*.1);ctx.lineTo(sx+TU*.08,sy);ctx.stroke();
  drawItemU('coin',sx-w*.22,sy-h*.32,1.05);ctx.fillStyle=INK;ctx.font=`700 ${TU*.22}px Fredoka, sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(String(amt),sx-w*.08,sy-h*.45);
  ctx.font=`600 ${TU*.13}px Fredoka, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#8a4f2a';ctx.fillText(name,sx,sy-h*.82);ctx.restore();}
/* round speech bubble with an icon: 'wait' (hourglass, red when nearly out of patience), 'angry', 'trash' */
function iconBubble(sx,sy,kind,urgent){ if(DEBUG.clean) return; const r=TU*.19; ctx.save();
  ctx.beginPath(); ctx.arc(sx,sy-r,r,0,7); ctx.moveTo(sx-r*.35,sy-r*.1); ctx.lineTo(sx,sy+r*.45); ctx.lineTo(sx+r*.35,sy-r*.1);
  ctx.fillStyle=kind==='angry'?'#ffe1dc':kind==='cash'?'#e9fbe0':'#fff'; ctx.fill(); ctx.lineWidth=MD.OL*1.1; ctx.strokeStyle=kind==='angry'?'#c9452f':INK; ctx.stroke();
  const cx=sx, cy=sy-r;
  if(kind==='wait'){ const f=Math.max(0,Math.min(1,urgent)), col=f<.25?'#e2463f':f<.5?'#f08a2c':'#7ed957', rr=r*.62;
    ctx.beginPath(); ctx.arc(cx,cy,rr,0,7); ctx.fillStyle='#f1e6d6'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,rr,-Math.PI/2,-Math.PI/2+f*Math.PI*2); ctx.closePath(); ctx.fillStyle=col; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,rr,0,7); ctx.strokeStyle=INK; ctx.lineWidth=MD.OL*.8; ctx.stroke(); }
  else if(kind==='cash'){ const p=1+Math.sin(now*10)*.08; ctx.fillStyle='#3f8f35'; ctx.font=`900 ${r*1.15*p}px Fredoka, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=MD.OL*1.2; ctx.strokeStyle='#fff'; ctx.strokeText('$',cx,cy+r*.06); ctx.fillText('$',cx,cy+r*.06); }
  else if(kind==='angry'){ ctx.strokeStyle='#e2463f'; ctx.lineWidth=r*.2; ctx.lineCap='round';
    for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ ctx.beginPath(); ctx.moveTo(cx+a*r*.18,cy+b*r*.55); ctx.quadraticCurveTo(cx+a*r*.18,cy+b*r*.18,cx+a*r*.55,cy+b*r*.18); ctx.stroke(); } }
  else if(kind==='sleep'){ ctx.fillStyle='#5b6bd6'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const k=(now*1.2)%1; ctx.font=`800 ${r*.95}px Fredoka, sans-serif`; ctx.fillText('Z',cx-r*.18,cy+r*.12);
    ctx.globalAlpha=.6+.4*Math.sin(now*4); ctx.font=`800 ${r*.6}px Fredoka, sans-serif`; ctx.fillText('z',cx+r*.38,cy-r*.32-k*r*.15); ctx.globalAlpha=1; }
  else if(kind==='trash'){ drawItemU('trash',cx,cy+r*.35,.95); ctx.strokeStyle='#e2463f'; ctx.lineWidth=MD.OL*1.4; ctx.beginPath(); ctx.arc(cx+r*.55,cy-r*.5,r*.22,0,7); ctx.fillStyle='#e2463f'; ctx.fill();
    ctx.fillStyle='#fff'; ctx.font=`700 ${r*.36}px Fredoka, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',cx+r*.55,cy-r*.48); }
  ctx.restore(); }
function customerOverhead(c){
  const z=elevAt(c.x,c.y);
  if(DEBUG.clean){ if(c.vip){const [sx,sy]=P(c.x,c.y,z+1.6);drawEmote('sparkle',sx+TU*.2,sy,.8)} return; }   /* clean shots: no order bubbles */
  if(c.emoteT>0){const [sx,sy]=P(c.x,c.y,z+1.85);drawEmote(c.emote,sx+TU*.18,sy-(1-c.emoteT)*TU*.2)}
  const showOrder=(c.state==='order'||c.state==='vipWait')&&orderLeft(c)>0;
  if(!showOrder) { const [sx,sy]=P(c.x,c.y,z+1.7);
    if(c.state==='leave'&&c.angry) iconBubble(sx+TW*.15,sy,'angry');
    else if((c.state==='queue'||c.state==='enter')&&c.patience<c.pMax*.5) iconBubble(sx+TW*.15,sy,'wait',c.patience/c.pMax);
    return; }
  if(c.patience<c.pMax*.5){ const [qx,qy]=P(c.x,c.y,z+1.75); iconBubble(qx-TU*.62,qy-TU*.05,'wait',c.patience/c.pMax); }
  const keys=Object.keys(c.order).filter(k=>c.order[k]-(c.got[k]||0)>0);
  const [sx,sy]=P(c.x,c.y,z+1.75);const w=TU*(.12+.38*keys.length),h=TU*.42;
  ctx.save();rr(ctx,sx-w/2,sy-h,w,h,h/2);ctx.fillStyle=c.vip?'#fff6d8':'#fff';ctx.fill();ctx.strokeStyle=c.vip?COL.goldDk:INK;ctx.lineWidth=MD.OL*(c.vip?1.4:1);ctx.stroke();
  keys.forEach((k,i)=>{const x=sx-w/2+TU*.06+i*TU*.38;if(PIZZAS.includes(k))drawItemU('ic_'+k,x+TU*.13,sy-h*.01,.66);else drawItemU(k,x+TU*.12,sy-h*.18,.7);ctx.fillStyle=INK;ctx.font=`700 ${TU*.18}px Fredoka, sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(String(c.order[k]-(c.got[k]||0)),x+TU*.25,sy-h*.45)});
  const p=Math.max(0,c.patience/c.pMax);rr(ctx,sx-w/2+TU*.06,sy+TU*.03,w-TU*.12,TU*.06,TU*.03);ctx.fillStyle='rgba(90,52,36,.25)';ctx.fill();
  rr(ctx,sx-w/2+TU*.06,sy+TU*.03,(w-TU*.12)*p,TU*.06,TU*.03);ctx.fillStyle=p>.5?'#7ed957':p>.25?'#f8c84a':'#e2463f';ctx.fill();ctx.restore();
  if(c.vip){drawEmote('sparkle',sx+w/2,sy-h+TU*.05,.8)}
}
function drawFlyer(f){const k=Math.min(1,f.t/f.dur);let a=P(f.from[0],f.from[1],f.from[2]),b;
  if(f.kind==='coinHud') b=UI.moneyPt(); else b=P(f.to[0],f.to[1],f.to[2]);
  const x=a[0]+(b[0]-a[0])*k,y=a[1]+(b[1]-a[1])*k-Math.sin(k*Math.PI)*TW*.6;
  if(f.kind==='coin'||f.kind==='coinHud') drawItemAt('coin',x,y,1.1); else drawItemAt(f.kind,x,y,.8);}
function drawGuide(tg){if(DEBUG.clean)return;const z=elevAt(tg[0],tg[1]);const d=dist(player.x,player.y,tg[0],tg[1]);
  if(d>.7){const [sx,sy]=P(tg[0],tg[1],z+2.55+Math.sin(now*5)*.12);const s=TU*.24;
    poly(MD,[[sx-s*.45,sy-s*1.3],[sx+s*.45,sy-s*1.3],[sx+s*.45,sy-s*.45],[sx+s,sy-s*.45],[sx,sy+s*.55],[sx-s,sy-s*.45],[sx-s*.45,sy-s*.45]],'#7ed957',INK,MD.OL*1.1);}
  if(d>1.4){const [px,py]=P(player.x,player.y,elevAt(player.x,player.y));const dx=tg[0]-player.x,dy=tg[1]-player.y;const sdx=(dx-dy)*TU/2,sdy=(dx+dy)*TU/4,L=Math.hypot(sdx,sdy);const ux=sdx/L,uy=sdy/L,R=TU*.6;const cx=px+ux*R,cy=py+uy*R*.6;
    poly(MD,[[cx+ux*TU*.15,cy+uy*TU*.15],[cx-uy*TU*.1,cy+ux*TU*.1],[cx+uy*TU*.1,cy-ux*TU*.1]],'#7ed957',INK,MD.OL*.9)}}
/* outdoor props: P1 trees around the restaurant (seeded), outside every zone and the street */
const GROUND_DECOR=[];
(function(){const rnd=seeded(5);
  for(let i=0;i<120&&GROUND_DECOR.length<34;i++){const x=-6+rnd()*30,y=-6+rnd()*29;
    if(x>-2.4&&x<20&&y>-2.4&&y<25.2) continue; if(x>17.5&&x<26&&y>LANE.y0-1.5&&y<LANE.y1+1.2) continue; if(x>21.6&&x<26) continue;
    if(GROUND_DECOR.some(d=>Math.hypot(d.x-x,d.y-y)<2.4)) continue;
    GROUND_DECOR.push({k:'tree',x,y,s:.9+rnd()*.5,seed:i});}})();
const KITCHEN_PROPS=[{k:'boxes',x:.5,y:10.4,need:'veggie'},{k:'plant',x:15.55,y:.5}];
function decorVisible(d){ if(d.k==='tree'&&(d.y<-.2||d.x<-.2)&&d.x<20&&d.y<20) return false;
  if(zoneAt(d.x,d.y)) return false; return true;}
