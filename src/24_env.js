/* =====================================================================
   24_env.js — Meow Sakura environment sprites (approved P1 / kit art, see tools/build_env.py)
   Every sprite is drawn by a world anchor point + its own anchor inside the image (fractions),
   sized by its width in tile units (1 TW = one cat height, the P1 proportions).
   ===================================================================== */
const ENV={};   // key -> {img,w,h}
const ENV_DEF={
  chicken:{tw:2.2,ax:.47,ay:.83}, burger:{tw:1.85,ax:.55,ay:.86}, burger2:{tw:1.35,ax:.5,ay:.88}, salad:{tw:1.85,ax:.55,ay:.86},
  drink:{tw:1.45,ax:.55,ay:.88}, fryer:{tw:1.3,ax:.5,ay:.86},
  shelf0:{tw:1.0,ax:.5,ay:.92,tip:.3}, shelf1:{tw:1.0,ax:.5,ay:.92,tip:.3}, shelf2:{tw:1.0,ax:.5,ay:.92,tip:.3}, shelf3:{tw:1.0,ax:.5,ay:.92,tip:.3}, fridge:{tw:.95,ax:.5,ay:.93},
  ctrL:{tw:2.15,ax:.5,ay:.75}, ctrC:{tw:3.3,ax:.5,ay:.75}, ctrR:{tw:1.6,ax:.5,ay:.75},
  trayR:{tw:.62,ax:.5,ay:.62}, trayG:{tw:.62,ax:.5,ay:.62},
  table:{tw:1.9,ax:.37,ay:.78}, table_front:{tw:1.9,ax:.37,ay:.78},
  bin:{tw:.5,ax:.5,ay:.9}, plant:{tw:.62,ax:.5,ay:.92}, planter:{tw:1.45,ax:.5,ay:.8}, signstand:{tw:.55,ax:.5,ay:.95},
  boxes:{tw:.8,ax:.5,ay:.9}, qpost:{tw:1.1,ax:.5,ay:.85}, ckbox:{tw:.5,ax:.5,ay:.85}, register:{tw:.62,ax:.5,ay:.86}, carrytray:{tw:.72,ax:.5,ay:.55},
};
/* where a station shows its finished food (fractions of the sprite) */
/* flat steel trays laid over each station's display spot (sprite fractions, scale): new food appears on them */
const STATION_TRAYS={
  /* [fx,fy, w(tiles along x), d(tiles along y)]: trays are drawn grid-aligned, like the stations themselves */
  chicken:[[.71,.515,.42,.52,1]], burger:[[.43,.61,.34,.4],[.585,.685,.34,.4]], burger2:[[.55,.74,.34,.46]], salad:[[.63,.80,.38,.5]],
  drink:[[.36,.705,.62,.26,1]], fryer:[[.62,.6,.5,.34]],
};
const STATION_ART={oven:'chicken',drink:'drink',prep:'burger',dessert:'fryer',veggie:'salad',seafood:'burger2',special:'burger'};
function envK(key,scale){const d=ENV_DEF[key]||{tw:1,ax:.5,ay:.9},e=ENV[key];return e&&e.img?TW*d.tw*(scale||1)/e.w:0}
/* screen point of a fraction (fx,fy) inside sprite `key` drawn at world (wx,wy) */
function envPt(key,wx,wy,fx,fy,o={}){const d=ENV_DEF[key]||{ax:.5,ay:.9},e=ENV[key];if(!e) return P(wx,wy);const k=envK(key,o.scale),[sx,sy]=P(wx,wy,o.z||0);
  const f=o.flip?-1:1; return [sx+f*(fx-d.ax)*e.w*k, sy+(fy-d.ay)*e.h*k];}
function drawEnv(key,wx,wy,o={}){const d=ENV_DEF[key]||{ax:.5,ay:.9},e=ENV[key];if(!e||!e.img) return;const k=envK(key,o.scale),[sx,sy]=P(wx,wy,o.z||0);
  ctx.save();ctx.translate(sx,sy);if(o.flip) ctx.scale(-1,1);if(o.alpha!=null) ctx.globalAlpha=o.alpha;
  ctx.drawImage(e.img,-d.ax*e.w*k,-d.ay*e.h*k,e.w*k,e.h*k);ctx.restore();}
/* sakura tree (Meow Sakura): brown trunk + a cluster of round pink blossom blobs with a dark-pink outline, dotted with flowers */
function drawTreeP1(wx,wy,s=1,seed=1,gg,PP,T){T=T||TW;const [sx,sy]=(PP||P)(wx,wy),R=T*.42*s,g=gg||ctx;const TW_=T;
  g.save();g.fillStyle='rgba(200,110,140,.18)';g.beginPath();g.ellipse(sx,sy,R*1.25,R*.5,0,0,7);g.fill();
  g.fillStyle=SAK.bark;g.strokeStyle=SAK.barkLn;g.lineWidth=Math.max(1,TW_*.03);g.beginPath();g.moveTo(sx-R*.18,sy);g.lineTo(sx-R*.12,sy-R*1.3);g.lineTo(sx+R*.12,sy-R*1.3);g.lineTo(sx+R*.2,sy);g.closePath();g.fill();g.stroke();
  g.beginPath();g.moveTo(sx,sy-R*1.1);g.lineTo(sx-R*.45,sy-R*1.65);g.moveTo(sx+R*.04,sy-R*1.2);g.lineTo(sx+R*.5,sy-R*1.7);g.stroke();
  const r=seeded(seed*97+3), blobs=[];for(let i=0;i<9;i++){const a=i/9*Math.PI*2+r()*.4,d=R*(.55+r()*.25);blobs.push([sx+Math.cos(a)*d*1.05,sy-R*2.0+Math.sin(a)*d*.8,R*(.5+r()*.18)])}
  blobs.push([sx,sy-R*2.05,R*.75]);
  for(const [x,y,rr] of blobs){g.beginPath();g.arc(x,y,rr,0,7);g.fillStyle=SAK.canopy;g.fill();g.strokeStyle=SAK.canopyLn;g.lineWidth=Math.max(1,TW_*.035);g.stroke();}
  for(const [x,y,rr] of blobs){g.beginPath();g.arc(x-rr*.12,y-rr*.15,rr*.78,0,7);g.fillStyle=SAK.canopyLt;g.fill();g.beginPath();g.arc(x-rr*.25,y-rr*.32,rr*.38,0,7);g.fillStyle=SAK.canopyHi;g.fill();}
  for(let i=0;i<14;i++){const b=blobs[Math.floor(r()*blobs.length)],a=r()*6.3,d=b[2]*r()*.8;sakuraFlower(g,b[0]+Math.cos(a)*d,b[1]+Math.sin(a)*d*.8,R*(.09+r()*.05),i%3?'#fff4f7':SAK.petal,SAK.core,SAK.canopyLn,Math.max(.5,TW_*.008));}
  g.restore();}

/* stations stand on their footprint: the sprite's lowest point (tip) sits on the footprint's near corner (x+w, y+d),
   and the sprite is scaled so its width equals the footprint diamond (w+d)*TW/2. Footprints are chosen with
   w/(w+d) = tip, so the art's back edges run exactly along the walls. */
function fpTip(key,flip){const e=ENV[key],d=ENV_DEF[key]||{};const t=d.tip!=null?d.tip:(e?e.tip:.5);return flip?1-t:t}
function fpK(key,fp){const e=ENV[key];return e&&e.img?(fp[2]+fp[3])*TW/2/e.w:0}
function fpPt(key,fp,fx,fy,flip){const e=ENV[key]; if(!e) return P(fp[0],fp[1]); const k=fpK(key,fp), [sx,sy]=P(fp[0]+fp[2],fp[1]+fp[3]); const ffx=flip?1-fx:fx; return [sx+(ffx-fpTip(key,flip))*e.w*k, sy+(fy-1)*e.h*k];}
function drawFp(key,fp,flip){const e=ENV[key]; if(!e||!e.img) return; const k=fpK(key,fp), [sx,sy]=P(fp[0]+fp[2],fp[1]+fp[3]);
  ctx.save(); ctx.translate(sx,sy); if(flip) ctx.scale(-1,1); ctx.drawImage(e.img,-(flip?1-fpTip(key,flip):fpTip(key,flip))*e.w*k,-e.h*k,e.w*k,e.h*k); ctx.restore();}
