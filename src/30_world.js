/* =====================================================================
   30_world.js — zones, elevation, floor/wall cache, navigation grid
   ===================================================================== */
let S=null;                       // save state (see 60_main freshState)
const zoneOpen=z=>z.open||!!(S&&S.bought[z.spot]);
const openZones=()=>ZONES.filter(zoneOpen);
function curStage(){let st=0;for(const sp of SPOTS) if(S.bought[sp.id]&&sp.stage>st) st=sp.stage;return st}
function zoneAt(x,y){for(const z of ZONES){ if(zoneOpen(z)&&x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.d) return z }return null}
function elevAt(x,y){const z=zoneAt(x,y);if(!z) return 0;if(z.elev) return z.elev;if(z.ramp){const t=Math.max(0,Math.min(1,(x-z.x)/z.w));return z.ramp[0]+(z.ramp[1]-z.ramp[0])*t}return 0}
/* player walkability: all four corners of the body square must be on open floor */
function walkable(x,y,r){return !!(zoneAt(x-r,y-r)&&zoneAt(x+r,y-r)&&zoneAt(x-r,y+r)&&zoneAt(x+r,y+r))}
function inLane(x,y){return x>=LANE.x0&&x<=LANE.x1&&y>=LANE.y0&&y<=LANE.y1}

/* ---------------- floor + wall cache (Meow Sakura look: P1 floors, wooden plank walls, sakura) ---------------- */
const floorCv=document.createElement('canvas'); let floorInfo={ox:0,oy:0,dpr:1};
const WALL_H=3.0, CACHE_B={x0:-7,x1:27,y0:-7,y1:28};
const ENVC={grass:'#8cc552',grassDk:'#79b444',tileA:'#f8dcb2',tileB:'#f3d2a3',grout:'#e9c18f',
  woodA:'#efa864',woodB:'#e89c58',woodLn:'#cf8447',curb:'#fbf1df',curbSide:'#e5cfa9',
  wall:'#f0cf9c',wallLn:'#d7ae78',wallDk:'#e6bf88',cap:'#c98048',capDk:'#a1612f',capTop:'#d8935a',
  base:'#b9743d',baseDk:'#96592b',wains:'#b9743d',wainsDk:'#96592b',path:'#f3e2c7',pathLn:'#e2cba7',road:'#6f7377',roadLn:'#f4f1e8'};
function floorKind(z){ return z.kind==='dining'||z.kind==='patio'?'wood':'tile'; }
function seeded(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return s/2147483647}}
function quad(D,x0,y0,x1,y1,z,fill,stroke,lw){poly(D,[D.P(x0,y0,z),D.P(x1,y0,z),D.P(x1,y1,z),D.P(x0,y1,z)],fill,stroke,lw)}
function buildFloorCache(TW){
  const stage=curStage(), T=TW, Z=T*.56, dpr=Math.min(1.5,window.devicePixelRatio||1);
  const minSX=(CACHE_B.x0-CACHE_B.y1)*T/2, maxSX=(CACHE_B.x1-CACHE_B.y0)*T/2, minSY=(CACHE_B.x0+CACHE_B.y0)*T/4-WALL_H*Z-T, maxSY=(CACHE_B.x1+CACHE_B.y1)*T/4+T;
  floorCv.width=Math.ceil((maxSX-minSX)*dpr); floorCv.height=Math.ceil((maxSY-minSY)*dpr);
  const g=floorCv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const D=mkD(g,(x,y,z=0)=>[(x-y)*T/2-minSX,(x+y)*T/4-z*Z-minSY],T); const P=D.P;
  floorInfo={ox:minSX,oy:minSY,dpr};
  /* lawn + grass tufts */
  g.fillStyle=ENVC.grass; g.fillRect(0,0,maxSX-minSX,maxSY-minSY);
  const rnd=seeded(11); g.strokeStyle=ENVC.grassDk; g.lineWidth=Math.max(1,D.OL*.8); g.lineCap='round';
  for(let i=0;i<700;i++){const x=CACHE_B.x0+rnd()*(CACHE_B.x1-CACHE_B.x0),y=CACHE_B.y0+rnd()*(CACHE_B.y1-CACHE_B.y0);const [sx,sy]=P(x,y);
    g.beginPath();g.moveTo(sx-T*.05,sy);g.lineTo(sx-T*.03,sy-T*.07);g.moveTo(sx,sy);g.lineTo(sx+T*.005,sy-T*.09);g.moveTo(sx+T*.05,sy);g.lineTo(sx+T*.035,sy-T*.06);g.stroke();}
  scatterPetals(D,CACHE_B,520,23,(x,y)=>x>21.8||(x>-.4&&x<19&&y>-.4&&y<25.6));
  /* trees behind the back / left walls: painted before the walls so the walls hide their trunks */
  for(const d of GROUND_DECOR) if(d.k==='tree'&&(d.y<-.2||d.x<-.2)&&d.x<20&&d.y<20) drawTreeP1(d.x,d.y,d.s,d.seed,g,(x,y)=>P(x,y),T);
  /* street on the right + the cream path customers walk in on */
  quad(D,22.6,CACHE_B.y0,CACHE_B.x1,CACHE_B.y1,0,ENVC.road,null);
  for(let y=CACHE_B.y0;y<CACHE_B.y1;y+=2) line(D,[P(24.3,y),P(24.3,y+1)],ENVC.roadLn,D.OL*1.6);
  quad(D,22.2,CACHE_B.y0,22.6,CACHE_B.y1,0,ENVC.curb,null);
  quad(D,18.3,LANE.y0-.2,22.4,LANE.y1+.2,0,ENVC.path,null);
  for(let x=18.5;x<22.4;x+=1) for(let y=LANE.y0-.2;y<LANE.y1+.1;y+=1.2) quad(D,x+.04,y+.04,Math.min(22.4,x+1)-.04,Math.min(LANE.y1+.2,y+1.2)-.04,0,(Math.floor(x)+Math.round(y))%2?ENVC.path:'#f6e8d0',ENVC.pathLn,D.OL*.5);
  if(S.bought.ribbon){ quad(D,16.5,LANE.y0+.45,22.2,LANE.y1-.45,0,'#d8343a',null); line(D,[P(16.5,LANE.y0+.45),P(22.2,LANE.y0+.45)],'#f4c04e',D.OL*1.6); line(D,[P(16.5,LANE.y1-.45),P(22.2,LANE.y1-.45)],'#f4c04e',D.OL*1.6); }
  /* locked zones: faded floor + dashed outline */
  for(const z of ZONES){ if(zoneOpen(z)) continue; g.save(); g.globalAlpha=.35; drawZoneFloor(D,z,floorKind(z)); g.restore();
    const pts=[P(z.x,z.y),P(z.x+z.w,z.y),P(z.x+z.w,z.y+z.d),P(z.x,z.y+z.d)]; g.save();g.setLineDash([T*.18,T*.12]);poly(D,pts,null,'rgba(90,52,36,.55)',D.OL);g.restore(); }
  /* floors */
  const zs=openZones();
  for(const z of zs) drawZoneFloor(D,z,floorKind(z));
  for(const z of zs) drawZoneEdges(D,z,zs);
  drawWalls(D, stage);
}
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,gg=(n>>8)&255,b=n&255;r=Math.round(r*(1-k));gg=Math.round(gg*(1-k));b=Math.round(b*(1-k));return '#'+((1<<24)|(r<<16)|(gg<<8)|b).toString(16).slice(1)}
function zoneTop(D,z){return [D.P(z.x,z.y),D.P(z.x+z.w,z.y),D.P(z.x+z.w,z.y+z.d),D.P(z.x,z.y+z.d)]}
function drawZoneFloor(D,z,kind){const g=D.g,P=D.P,top=zoneTop(D,z);
  g.save();g.beginPath();top.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.clip();
  if(kind==='tile'){ /* big cream tiles, two tones in a soft checker, thin grout */
    for(let x=Math.floor(z.x);x<z.x+z.w;x++)for(let y=Math.floor(z.y);y<z.y+z.d;y++){
      const c=((x+y)%2)?ENVC.tileA:ENVC.tileB; poly(D,[P(x,y),P(x+1,y),P(x+1,y+1),P(x,y+1)],c,ENVC.grout,D.OL*.45);} }
  else { /* warm wooden planks running along x */
    quad(D,z.x,z.y,z.x+z.w,z.y+z.d,0,ENVC.woodA,null);
    for(let y=z.y,i=0;y<z.y+z.d;y+=.34,i++){ if(i%2) quad(D,z.x,y,z.x+z.w,y+.34,0,ENVC.woodB,null);
      line(D,[P(z.x,y),P(z.x+z.w,y)],ENVC.woodLn,D.OL*.5);
      for(let x=z.x+((i*1.7)%3);x<z.x+z.w;x+=3) line(D,[P(x,y),P(x,y+.34)],ENVC.woodLn,D.OL*.5);} }
  g.restore();
}
function cellOpenFlat(x,y){return !!zoneAt(x,y)}
/* the slab edge on the open front sides (where no other open zone continues) */
function drawZoneEdges(D,z,zs){const P=D.P,h=.12;
  const openAt=(x,y)=>zs.some(o=>o!==z&&x>o.x-.01&&x<o.x+o.w+.01&&y>o.y-.01&&y<o.y+o.d+.01);
  for(let y=z.y;y<z.y+z.d-.01;y+=.5){ const x1=z.x+z.w; if(openAt(x1+.1,y+.25)) continue;
    poly(D,[P(x1,y,0),P(x1,y+.5,0),P(x1,y+.5,-h),P(x1,y,-h)],ENVC.curbSide,null); line(D,[P(x1,y),P(x1,y+.5)],ENVC.curb,D.OL*2.2); }
  for(let x=z.x;x<z.x+z.w-.01;x+=.5){ const y1=z.y+z.d; if(openAt(x+.25,y1+.1)) continue;
    poly(D,[P(x,y1,0),P(x+.5,y1,0),P(x+.5,y1,-h),P(x,y1,-h)],ENVC.curbSide,null); line(D,[P(x,y1),P(x+.5,y1)],ENVC.curb,D.OL*2.2); }
}
/* tall beige brick walls with a wooden cap and wooden posts (P1). Right wall (y=0) has a grey baseboard and the cat door,
   the left wall (x=0) a wooden wainscot. Wall menus go up once the diner is renovated. */
function drawWalls(D,stage){const P=D.P,g=D.g,H=WALL_H,t=.3,T=D.T;
  const lenX=18.5, lenY=zoneOpen(ZONES.find(z=>z.id==='kitchen2'))?19.6:11;
  const brick=(axis,len)=>{ onFace(D,axis,0,axis==='y'?0:len,H,g2=>{ /* vertical wooden planks */
      for(let u=0,i=0;u<len;u+=.36,i++){ if(i%3===1){ g2.fillStyle=ENVC.wallDk; g2.fillRect(u,0,.36,H); } if(i%5===3){ g2.fillStyle=SAK.plankLt; g2.fillRect(u+.04,0,.1,H); }
        g2.strokeStyle=ENVC.wallLn; g2.lineWidth=.03; g2.beginPath(); g2.moveTo(u,0); g2.lineTo(u,H); g2.stroke(); }
      g2.strokeStyle=ENVC.wallLn; g2.lineWidth=.035; for(const v of [.55,H-.75]){ g2.beginPath(); g2.moveTo(0,v); g2.lineTo(len,v); g2.stroke(); }
      for(let i=0;i<len*1.2;i++){ const u=(i*.83)%len+.12, v=.7+((i*1.37)%(H-1.6)); g2.fillStyle='rgba(150,96,50,.35)'; g2.beginPath(); g2.ellipse(u,v,.05,.09,0,0,7); g2.fill(); } }); };
  /* left wall (x=0), drawn first */
  poly(D,[P(0,0,0),P(0,lenY,0),P(0,lenY,H),P(0,0,H)],ENVC.wall,null); brick('x',lenY);
  poly(D,[P(0,0,0),P(0,lenY,0),P(0,lenY,.55),P(0,0,.55)],ENVC.wains,INK,D.OL*.7);
  poly(D,[P(0,0,.55),P(0,lenY,.55),P(.12,lenY,.62),P(.12,0,.62)],ENVC.capTop,INK,D.OL*.6);
  for(let v=.6;v<lenY;v+=.6) line(D,[P(0,v,.05),P(0,v,.5)],ENVC.wainsDk,D.OL*.6);
  /* right wall (y=0) */
  poly(D,[P(0,0,0),P(lenX,0,0),P(lenX,0,H),P(0,0,H)],ENVC.wall,null); brick('y',lenX);
  poly(D,[P(0,0,0),P(lenX,0,0),P(lenX,0,.22),P(0,0,.22)],ENVC.base,INK,D.OL*.6);
  /* cat door between the storage shelf and the counter */
  onFace(D,'y',10.9,0,1.95,g2=>{g2.lineWidth=.05;g2.strokeStyle=INK;g2.fillStyle='#5a3a2c';g2.fillRect(0,0,.9,1.95);g2.strokeRect(0,0,.9,1.95);
    g2.fillStyle='#3f2a22';g2.fillRect(.08,.08,.74,1.87);g2.fillStyle='#f3c48c';g2.beginPath();g2.ellipse(.45,.55,.17,.14,0,0,7);g2.fill();
    g2.beginPath();g2.moveTo(.3,.48);g2.lineTo(.33,.33);g2.lineTo(.4,.44);g2.moveTo(.6,.48);g2.lineTo(.57,.33);g2.lineTo(.5,.44);g2.fill();
    g2.fillStyle=INK;g2.beginPath();g2.arc(.4,.55,.022,0,7);g2.arc(.5,.55,.022,0,7);g2.fill();g2.fillStyle='#d9d3cc';g2.beginPath();g2.arc(.15,1.0,.04,0,7);g2.fill();});
  /* wooden caps */
  poly(D,[P(-t,-t,H),P(lenX,-t,H),P(lenX,0,H),P(0,0,H),P(0,lenY,H),P(-t,lenY,H)],ENVC.capTop,INK,D.OL*.8);
  poly(D,[P(0,0,H),P(lenX,0,H),P(lenX,0,H-.18),P(0,0,H-.18)],ENVC.cap,INK,D.OL*.7);
  poly(D,[P(0,0,H),P(0,lenY,H),P(0,lenY,H-.18),P(0,0,H-.18)],ENVC.cap,INK,D.OL*.7);
  poly(D,[P(lenX,-t,0),P(lenX,0,0),P(lenX,0,H),P(lenX,-t,H)],ENVC.capDk,INK,D.OL*.7);
  poly(D,[P(-t,lenY,0),P(0,lenY,0),P(0,lenY,H),P(-t,lenY,H)],ENVC.cap,INK,D.OL*.7);
  /* posts */
  const post=(x,y)=>box(D,x-.16,y-.16,0,.32,.32,H+.08,ENVC.capTop,ENVC.cap,ENVC.capDk);
  for(let x=6.5;x<lenX-.5;x+=6.5) post(x,.16); post(lenX-.16,.16);
  for(let y=7.5;y<lenY-.5;y+=7.5) post(.16,y); post(.16,lenY-.16); post(.16,.16);
  /* paper lanterns hanging under the cap and sakura sprigs along it */
  const ls=T*.62;
  for(let x=2.2;x<lenX-.6;x+=2.6){ if(Math.abs(x-11.35)<.8) continue; const [lx,ly]=P(x,0,H-.12); paperLantern(g,lx,ly,ls); }
  for(let y=2.4;y<lenY-.6;y+=2.6){ const [lx,ly]=P(0,y,H-.12); paperLantern(g,lx,ly,ls); }
  for(let x=.9,i=0;x<lenX-.4;x+=1.55,i++){ const [a1,b1]=P(x,-.15,H+.02); sakuraSprig(g,a1,b1,T*.95,.46+(i%2?.15:-.1),i+3); }
  for(let y=1.4,i=0;y<lenY-.4;y+=1.55,i++){ const [a1,b1]=P(-.15,y,H+.02); sakuraSprig(g,a1,b1,T*.95,Math.PI-.46-(i%2?.15:-.1),i+40); }
  /* renovated diner: wall menus above the back counters and in the dining corner */
  if(stage>=1){ const wm=(k,x,y,z,flip)=>{const e=ENV[k]; if(!e||!e.img) return; const w=T*.6, h=w*e.h/e.w, [sx,sy]=P(x,y,z); g.save(); g.translate(sx,sy); if(flip) g.scale(-1,1); g.drawImage(e.img,-w/2,-h,w,h); g.restore();};
    wm('menuC',9.4,0,2.05); wm('menuB',13.2,0,2.05); wm('menuS',14.9,0,2.05); }
}
const NAV={cs:.5,x0:-1,y0:-1,nx:50,ny:54,grid:null};
function buildNav(solidRects){const {cs,x0,y0,nx,ny}=NAV;const gr=new Uint8Array(nx*ny);const m=.3;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=x0+(i+.5)*cs,y=y0+(j+.5)*cs;
    let ok=(zoneAt(x,y)&&zoneAt(x-.3,y-.3)&&zoneAt(x+.3,y+.3)&&zoneAt(x-.3,y+.3)&&zoneAt(x+.3,y-.3))||inLane(x,y);
    if(ok) for(const r of solidRects){ if(x>r[0]-m&&x<r[0]+r[2]+m&&y>r[1]-m&&y<r[1]+r[3]+m){ok=false;break} }
    gr[j*nx+i]=ok?1:0;}
  NAV.grid=gr;}
const navIdx=(x,y)=>[Math.floor((x-NAV.x0)/NAV.cs),Math.floor((y-NAV.y0)/NAV.cs)];
const navOk=(i,j)=>i>=0&&j>=0&&i<NAV.nx&&j<NAV.ny&&NAV.grid[j*NAV.nx+i]===1;
function nearestOpen(i,j){if(navOk(i,j))return[i,j];for(let r=1;r<8;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;if(navOk(i+di,j+dj))return[i+di,j+dj]}return null}
function findPath(ax,ay,bx,by){
  if(!NAV.grid) return [[bx,by]];
  const s=nearestOpen(...navIdx(ax,ay)), t=nearestOpen(...navIdx(bx,by)); if(!s||!t) return [[bx,by]];
  const {nx}=NAV, key=(i,j)=>j*nx+i, open=[[0,s[0],s[1]]], g=new Map([[key(...s),0]]), came=new Map(); const tk=key(...t); let found=false, guard=0;
  while(open.length&&guard++<6000){ let bi=0;for(let k=1;k<open.length;k++) if(open[k][0]<open[bi][0]) bi=k; const [,ci,cj]=open.splice(bi,1)[0]; const ck=key(ci,cj);
    if(ck===tk){found=true;break}
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ni=ci+di,nj=cj+dj;if(!navOk(ni,nj))continue;if(di&&dj&&(!navOk(ci+di,cj)||!navOk(ci,cj+dj)))continue;
      const ng=g.get(ck)+(di&&dj?1.414:1), nk=key(ni,nj); if(g.has(nk)&&g.get(nk)<=ng) continue; g.set(nk,ng); came.set(nk,ck);
      const h=Math.hypot(ni-t[0],nj-t[1]); open.push([ng+h,ni,nj]); } }
  if(!found) return [[bx,by]];
  const cells=[];let k=tk;while(k!==undefined){cells.push(k);k=came.get(k)}cells.reverse();
  const pts=cells.map(k=>[NAV.x0+((k%nx)+.5)*NAV.cs,NAV.y0+(Math.floor(k/nx)+.5)*NAV.cs]);
  // string-pull smoothing via grid line of sight
  const out=[];let a=[ax,ay];let i=0;
  while(i<pts.length){let j=pts.length-1;while(j>i&&!los(a,pts[j]))j--;out.push(pts[j]);a=pts[j];i=j+1}
  if(los(a,[bx,by])) out.push([bx,by]); else out.push([bx,by]);
  return out;
}
function los(a,b){const d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(d/(NAV.cs*.5));for(let k=1;k<n;k++){const x=a[0]+(b[0]-a[0])*k/n,y=a[1]+(b[1]-a[1])*k/n;if(!navOk(...navIdx(x,y)))return false}return true}
