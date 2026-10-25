/* =====================================================================
   22_objects.js — iso object painters (restaurant environment).
   Each painter draws in footprint-local world coords: (0,0,0) = the
   footprint's back corner on the floor. hot = hotspots in local coords.
   ===================================================================== */
/* draw on a vertical face: axis 'x' = plane x=x0 (faces +x), 'y' = plane y=y0 (faces +y).
   frame: u to the right as seen by the camera, v downward, 1 unit = 1 tile */
function onFace(D,axis,x0,y0,z0,fn){const g=D.g,T=D.T,Z=T*.56;const [ex,ey]=D.P(x0,y0,z0);g.save();
  if(axis==='y') g.transform(T/2,T/4,0,Z,ex,ey); else g.transform(T/2,-T/4,0,Z,ex,ey);
  fn(g); g.restore();}
function faceText(D,axis,x0,y0,z0,txt,size,fill,stroke,u=0,v=0,font='Fredoka'){onFace(D,axis,x0,y0,z0,g=>{g.scale(.01,.01);g.font=`700 ${size*100}px ${font}, "Baloo 2", system-ui, sans-serif`;g.textAlign='center';g.textBaseline='middle';
  if(stroke){g.lineJoin='round';g.lineWidth=size*22;g.strokeStyle=stroke;g.strokeText(txt,u*100,v*100)}g.fillStyle=fill;g.fillText(txt,u*100,v*100)})}
function bricks(D,axis,x0,y0,z0,len,h,color){onFace(D,axis,x0,y0,z0,g=>{g.strokeStyle=color;g.lineWidth=.025;for(let r=0;r*0.14<h;r++){const v=-r*.14;g.beginPath();g.moveTo(0,v);g.lineTo(len,v);g.stroke();for(let u=(r%2?.12:0);u<len;u+=.24){g.beginPath();g.moveTo(u,v);g.lineTo(u,v-.14);g.stroke()}}})}
function counterBase(D){
  box(D,.05,0,0,.9,1,.64,null,'#b5703c','#c98048');
  poly(D,[D.P(.95,.12,.1),D.P(.95,.88,.1),D.P(.95,.88,.54),D.P(.95,.12,.54)],'#d99258',INK,D.OL*.7);
  onFace(D,'x',.95,.88,.32,g=>{g.save();g.scale(1,-1);g.restore()});
  const [px,py]=D.P(.95,.5,.32); pawPrint(D,px,py+D.T*.03,D.T*.09,'#f3c08c');
  box(D,-.06,0,.64,1.12,1,.12,'#eab27a','#c98a50','#d39459');
  for(const k of [.33,.66]) line(D,[D.P(-.06+1.12*k,0,.76),D.P(-.06+1.12*k,1,.76)],'#d39459',D.OL*.6);
}
function vipSofa(D,x){box(D,x,0,0,.6,1.4,.2,'#a8322e','#8f2a27','#9d2e2a');box(D,x+.02,.02,.2,.56,1.36,.12,'#e2463f','#b8322e','#c63a33');
  box(D,x,-.0,.2,.6,.12,.3,'#e2463f','#b8322e','#c63a33');box(D,x,1.28,.2,.6,.12,.3,'#e2463f','#b8322e','#c63a33');}
const OBJ_PAINT={
  /* --- checkout counter segments (1×1) --- */
  ctr_tray:{fp:[1,1],h:1.0,paint:D=>{counterBase(D);const [x,y,rx,ry]=disc(D,.5,.5,.76,.4);cyl(D,x,y,rx,ry,D.T*.02,COL.steelDk,COL.steel);ell(D,x,y-D.T*.02,rx*.8,ry*.8,null,COL.steelDk,D.OL*.6)},hot:{top:[.5,.5,.79]}},
  ctr_shelf:{fp:[1,1],h:1.0,paint:D=>{counterBase(D);box(D,.12,.1,.76,.76,.8,.05,'#f6d3a8','#c98a50','#d39459')},hot:{top:[.5,.5,.81]}},
  ctr_plant:{fp:[1,1],h:1.3,paint:D=>{counterBase(D);const [x,y]=D.P(.5,.5,.76);cyl(D,x,y,D.T*.1,D.T*.05,D.T*.13,'#e07b4c','#c8653a');leaves(D,x,y-D.T*.14,D.T*.17,COL.leaf,COL.greenDk,7)}},
  ctr_register:{fp:[1,1],h:1.4,paint:D=>{counterBase(D);
    box(D,.22,.2,.76,.56,.62,.26,'#5d5866','#46414e','#524d5a');box(D,.3,.25,1.02,.3,.5,.1,'#6f6a78','#46414e','#5d5866');
    box(D,.62,.5,1.02,.06,.06,.22,'#3a3540','#3a3540','#3a3540');box(D,.55,.3,1.24,.12,.42,.24,'#2f2a33','#3a3540','#3a3540');
    poly(D,[D.P(.67,.35,1.28),D.P(.67,.68,1.28),D.P(.67,.68,1.44),D.P(.67,.35,1.44)],'#7fe08a',INK,D.OL*.6);}},
  /* --- counter segment with a stack of takeaway boxes (replaces the v3 cart canopy) --- */
  ctr_boxes:{fp:[1,1],h:1.3,paint:D=>{counterBase(D);for(let i=0;i<3;i++){const [x,y]=D.P(.5,.5,.76+i*.1);ITEM_PAINT_AT(D,'box',x+(i%2?D.T*.02:-D.T*.02),y,1.15)}}},
  /* --- queue rope posts --- */
  stanchion:{fp:[.3,.3],h:1.2,paint:D=>{const [x,y,rx,ry]=disc(D,.15,.15,0,.14);cyl(D,x,y,rx,ry,D.T*.03,COL.goldDk,COL.gold);D.g.fillStyle=COL.gold;D.g.fillRect(x-D.T*.025,y-D.T*.5,D.T*.05,D.T*.48);D.g.strokeStyle=INK;D.g.lineWidth=D.OL;D.g.strokeRect(x-D.T*.025,y-D.T*.5,D.T*.05,D.T*.48);ell(D,x,y-D.T*.52,D.T*.05,D.T*.05,COL.gold)}},
  /* --- stations --- */
  st_oven:{fp:[1.6,1.4],h:1.8,paint:D=>{
    box(D,0,0,0,1.05,1.4,.5,'#e9a070','#c8653e','#d9774a');bricks(D,'x',1.05,1.4,.5,1.4,.5,'#b75d37');bricks(D,'y',0,1.4,.5,1.05,.5,'#a9532f');
    const [cx,cy,rx,ry]=disc(D,.52,.7,.5,.6), dh=D.T*.5, g=D.g;
    g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI);g.ellipse(cx,cy,rx,dh,0,Math.PI,Math.PI*2);g.closePath();
    const gr=g.createLinearGradient(cx-rx,cy-dh,cx+rx,cy);gr.addColorStop(0,'#f0a173');gr.addColorStop(1,'#d56f43');g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=D.OL;g.stroke();
    g.save();g.clip();g.strokeStyle='#bc5f38';g.lineWidth=D.OL*.6;for(const k of [.35,.6,.82]){g.beginPath();g.ellipse(cx,cy,rx,dh*k,0,Math.PI,Math.PI*2);g.stroke()}g.restore();
    const ax=cx+rx*.42, ay=cy+ry*.15;g.beginPath();g.moveTo(ax-rx*.28,ay);g.lineTo(ax-rx*.28,ay-dh*.38);g.ellipse(ax,ay-dh*.38,rx*.28,dh*.3,0,Math.PI,0);g.lineTo(ax+rx*.28,ay);g.closePath();g.fillStyle='#3a2420';g.fill();g.strokeStyle=INK;g.stroke();
    g.beginPath();g.ellipse(ax,ay-dh*.38,rx*.36,dh*.38,0,Math.PI,0);g.strokeStyle='#f3c08c';g.lineWidth=D.OL*1.4;g.stroke();
    cyl(D,cx-rx*.25,cy-dh*.8,D.T*.06,D.T*.03,D.T*.18,'#c8653e','#8a4f2a');
    box(D,1.05,.15,0,.55,1.1,.5,'#eab27a','#b5703c','#c98048');box(D,1.08,.2,.5,.5,1.0,.03,COL.steelLt,COL.steelDk,COL.steel);
  },hot:{top:[1.33,.7,.53],glow:[.92,.7,.62]}},
  st_drink:{fp:[1.2,1.2],h:1.6,paint:D=>{
    box(D,0,0,0,.75,1.2,1.15,'#f05a4f','#c63a33','#e2463f');box(D,-.03,-.03,1.15,.81,1.26,.1,'#fff','#e6dcd2','#f2ebe3');
    poly(D,[D.P(.75,.15,.55),D.P(.75,1.05,.55),D.P(.75,1.05,1.05),D.P(.75,.15,1.05)],'#fff7ef',INK,D.OL*.8);
    onFace(D,'x',.75,1.05,1.05,g=>{g.translate(.45,.25);g.beginPath();g.arc(0,0,.16,0,Math.PI*2);g.fillStyle=COL.red;g.fill();g.lineWidth=.025;g.strokeStyle=INK;g.stroke();
      g.beginPath();g.moveTo(-.13,-.08);g.lineTo(-.1,-.22);g.lineTo(-.02,-.13);g.moveTo(.13,-.08);g.lineTo(.1,-.22);g.lineTo(.02,-.13);g.fillStyle=COL.red;g.fill();g.stroke();
      g.fillStyle='#fff';g.beginPath();g.arc(-.05,-.01,.025,0,7);g.arc(.05,-.01,.025,0,7);g.fill();});
    for(const yy of [.4,.8]) box(D,.75,yy-.06,.4,.1,.12,.12,'#3a3540','#2f2a33','#46414e');
    box(D,.75,.25,.12,.14,.7,.05,COL.steelLt,COL.steelDk,COL.steel);
    box(D,.75,.15,0,.45,.9,.45,'#eab27a','#b5703c','#c98048');box(D,.78,.2,.45,.4,.8,.03,COL.steelLt,COL.steelDk,COL.steel);
  },hot:{top:[.98,.6,.48]}},
  st_pantry:{fp:[1.4,1.4],h:1.9,paint:D=>{
    box(D,0,0,0,.16,1.4,1.6,'#b06a36','#8a4f2a','#c98048');box(D,0,0,0,.8,.08,1.6,'#b06a36','#8a4f2a','#9b5a30');
    for(const z of [.05,.55,1.05,1.55]) box(D,.16,.08,z,.64,1.24,.05,'#eab27a','#c98a50','#d39459');
    const item=(y,z,k)=>{const [x,yy]=D.P(.45,y,z+.05);const T=D.T;
      if(k==='t'){ell(D,x,yy-T*.05,T*.06,T*.05,COL.red);ell(D,x+T*.07,yy-T*.04,T*.055,T*.045,'#f04d3f')}
      if(k==='f'){g2(x,yy)}
      if(k==='c'){cyl(D,x,yy,T*.09,T*.045,T*.07,'#e9b83f','#f8d44c')}
      if(k==='j'){cyl(D,x,yy,T*.045,T*.022,T*.12,'#b6e3ef','#d65a3a');ell(D,x,yy-T*.06,T*.03,T*.03,'#e2463f',null)}
    };
    const g2=(x,y)=>{const T=D.T,g=D.g;g.beginPath();g.moveTo(x-T*.08,y);g.quadraticCurveTo(x-T*.1,y-T*.16,x,y-T*.18);g.quadraticCurveTo(x+T*.1,y-T*.16,x+T*.08,y);g.closePath();g.fillStyle='#f6ead2';g.fill();g.strokeStyle=INK;g.lineWidth=D.OL;g.stroke();line(D,[[x-T*.04,y-T*.15],[x+T*.04,y-T*.15]],'#c9a77a',D.OL*.7)};
    item(.35,.55,'t');item(.85,.55,'c');item(1.2,.55,'j');item(.4,1.05,'f');item(.9,1.05,'f');item(1.2,1.05,'t');item(.4,.05,'c');item(.95,.05,'j');
    box(D,0,1.32,0,.8,.08,1.6,'#c98048','#9b5a30','#b06a36');
    box(D,.85,.15,0,.5,1.1,.08,'#c9874d','#a7652f','#b8743c');
  },hot:{top:[1.1,.7,.08]}},
  st_prep:{fp:[1.4,1.2],h:1.2,paint:D=>{
    for(const [x,y] of [[.05,.05],[.85,.05],[.05,1.1],[.85,1.1]]) box(D,x,y,0,.06,.06,.58,COL.steel,COL.steelDk,COL.steel);
    box(D,.05,.05,.16,.86,1.1,.04,COL.steelLt,COL.steelDk,COL.steel);
    box(D,0,0,.58,.95,1.2,.07,COL.steelLt,COL.steelDk,COL.steel);
    box(D,.15,.2,.65,.55,.55,.04,'#ecc690','#c99a5c','#d8ad74');
    let [x,y,rx,ry]=disc(D,.42,.47,.69,.2);ell(D,x,y,rx,ry,'#f6e3c0');ell(D,x,y,rx*.75,ry*.75,'#e4573a',null);
    [x,y,rx,ry]=disc(D,.25,.95,.65,.14);cyl(D,x,y,rx,ry,D.T*.05,'#f3f0ea','#d23c2b');
    [x,y,rx,ry]=disc(D,.62,.95,.65,.13);cyl(D,x,y,rx,ry,D.T*.05,'#f3f0ea','#f8d44c');
    [x,y,rx,ry]=disc(D,.8,.25,.65,.1);cyl(D,x,y,rx,ry,D.T*.04,'#f3f0ea','#c33b2e');
    box(D,.95,.15,0,.45,.9,.45,'#eab27a','#b5703c','#c98048');box(D,.98,.2,.45,.4,.8,.03,COL.steelLt,COL.steelDk,COL.steel);
  },hot:{top:[1.18,.6,.48],board:[.42,.47,.69]}},
  st_veggie:{fp:[1.4,1.2],h:1.2,paint:D=>{
    for(const [x,y] of [[.05,.05],[.85,.05],[.05,1.1],[.85,1.1]]) box(D,x,y,0,.06,.06,.58,'#d98f52','#9b5a30','#b06a36');
    box(D,.05,.05,.16,.86,1.1,.04,'#eab27a','#b06a36','#c98048');box(D,0,0,.58,.95,1.2,.07,'#eab27a','#b06a36','#c98048');
    box(D,.15,.2,.65,.55,.55,.04,'#9fd56a','#6fa94a','#83c05a');
    let [x,y,rx,ry]=disc(D,.25,.95,.65,.14);cyl(D,x,y,rx,ry,D.T*.05,'#f3f0ea','#5cbf45');[x,y,rx,ry]=disc(D,.62,.95,.65,.13);cyl(D,x,y,rx,ry,D.T*.05,'#f3f0ea','#efe0c6');
    [x,y,rx,ry]=disc(D,.82,.25,.65,.1);cyl(D,x,y,rx,ry,D.T*.04,'#f3f0ea','#e2463f');
    box(D,.95,.15,0,.45,.9,.45,'#eab27a','#b5703c','#c98048');box(D,.98,.2,.45,.4,.8,.03,COL.steelLt,COL.steelDk,COL.steel);
  },hot:{top:[1.18,.6,.48],board:[.42,.47,.69]}},
  st_seafood:{fp:[1.4,1.2],h:1.3,paint:D=>{
    box(D,0,0,0,.95,1.2,.62,'#cfe9f2','#8fbccb','#a9d3e0');box(D,0,0,.62,.95,1.2,.06,COL.steelLt,COL.steelDk,COL.steel);
    const g=D.g;poly(D,[D.P(.1,.12,.69),D.P(.85,.12,.69),D.P(.85,1.08,.69),D.P(.1,1.08,.69)],'#eef8fb',INK,D.OL*.6);
    for(const [u,v] of [[.3,.3],[.55,.45],[.35,.75],[.65,.85],[.7,.25]]){const [x,y]=D.P(u,v,.7);topping(D,'shrimp',x,y,D.T*.32,D.T*.16,false)}
    poly(D,[D.P(.95,.2,.12),D.P(.95,1.0,.12),D.P(.95,1.0,.5),D.P(.95,.2,.5)],'#e6f4f8',INK,D.OL*.6);
    onFace(D,'x',.95,1.0,.5,g2=>{g2.translate(.4,.2);g2.beginPath();g2.moveTo(-.18,0);g2.quadraticCurveTo(0,-.12,.14,0);g2.quadraticCurveTo(0,.12,-.18,0);g2.lineTo(-.26,-.08);g2.lineTo(-.26,.08);g2.closePath();g2.fillStyle='#5cb4f0';g2.fill();g2.lineWidth=.025;g2.strokeStyle=INK;g2.stroke()});
    box(D,.95,.15,0,.45,.9,.45,'#eab27a','#b5703c','#c98048');box(D,.98,.2,.45,.4,.8,.03,COL.steelLt,COL.steelDk,COL.steel);
  },hot:{top:[1.18,.6,.48]}},
  st_dessert:{fp:[1.3,1.1],h:1.3,paint:D=>{
    box(D,0,0,0,.85,1.1,.55,'#fde0e6','#e9b5c2','#f4c8d3');poly(D,[D.P(.85,.1,.08),D.P(.85,1.0,.08),D.P(.85,1.0,.45),D.P(.85,.1,.45)],'#ffeef2',INK,D.OL*.6);
    for(const [yy] of [[.3],[.75]]){const [x,y]=D.P(.45,yy,.56);ITEM_PAINT_AT(D,'dessert',x,y,.85)}
    const g=D.g;g.save();g.globalAlpha=.35;box(D,.04,.04,.55,.77,1.02,.36,COL.glass,COL.glass,COL.glass,null);g.restore();
    box(D,.04,.04,.55,.77,1.02,.36,null,null,null);
    for(const p of [[.81,.06],[.81,1.06],[.04,1.06]]) line(D,[D.P(p[0],p[1],.55),D.P(p[0],p[1],.91)],INK,D.OL*.8);
    poly(D,[D.P(.04,.04,.91),D.P(.81,.04,.91),D.P(.81,1.06,.91),D.P(.04,1.06,.91)],'rgba(207,234,243,.35)');
    box(D,-.02,-.02,.91,.89,1.14,.06,'#f48fb1','#d96b90','#e57ca0');
    box(D,.85,.15,0,.45,.8,.45,'#eab27a','#b5703c','#c98048');box(D,.88,.2,.45,.4,.7,.03,COL.steelLt,COL.steelDk,COL.steel);
  },hot:{top:[1.08,.55,.48]}},
  st_special:{fp:[1.8,1.6],h:2.4,paint:D=>{
    box(D,0,0,0,1.3,1.6,.55,'#d9c8b4','#a99683','#bba895');bricks(D,'x',1.3,1.6,.55,1.6,.55,'#8f7d6b');bricks(D,'y',0,1.6,.55,1.3,.55,'#8f7d6b');
    const [cx,cy,rx,ry]=disc(D,.65,.8,.55,.72), dh=D.T*.62, g=D.g;
    g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI);g.ellipse(cx,cy,rx,dh,0,Math.PI,Math.PI*2);g.closePath();
    const gr=g.createLinearGradient(cx-rx,cy-dh,cx+rx,cy);gr.addColorStop(0,'#eea36e');gr.addColorStop(1,'#c4653a');g.fillStyle=gr;g.fill();g.strokeStyle=INK;g.lineWidth=D.OL;g.stroke();
    g.save();g.clip();g.strokeStyle='#ad5530';g.lineWidth=D.OL*.6;for(const k of [.3,.55,.78]){g.beginPath();g.ellipse(cx,cy,rx,dh*k,0,Math.PI,Math.PI*2);g.stroke()}g.restore();
    const ax=cx+rx*.42, ay=cy+ry*.15;g.beginPath();g.moveTo(ax-rx*.27,ay);g.lineTo(ax-rx*.27,ay-dh*.36);g.ellipse(ax,ay-dh*.36,rx*.27,dh*.28,0,Math.PI,0);g.lineTo(ax+rx*.27,ay);g.closePath();g.fillStyle='#3a2420';g.fill();g.strokeStyle=INK;g.stroke();
    g.beginPath();g.ellipse(ax,ay-dh*.36,rx*.35,dh*.36,0,Math.PI,0);g.strokeStyle=COL.gold;g.lineWidth=D.OL*1.6;g.stroke();
    cyl(D,cx-rx*.15,cy-dh*.75,D.T*.11,D.T*.055,D.T*.32,'#e09a5a','#c47a3a');cyl(D,cx-rx*.15,cy-dh*.75-D.T*.32,D.T*.16,D.T*.08,D.T*.06,'#e8a868','#b86c32');
    const sx=cx-rx*.6, sy=cy-dh*.45, r=D.T*.09;poly(D,Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr2=i%2?r*.45:r;return[sx+Math.cos(a)*rr2,sy+Math.sin(a)*rr2]}),COL.gold,INK,D.OL*.8);
    box(D,1.3,.2,0,.5,1.2,.5,'#eab27a','#b5703c','#c98048');box(D,1.33,.25,.5,.44,1.1,.03,'#f8d77c',COL.goldDk,COL.gold);
  },hot:{top:[1.55,.8,.53],glow:[1.2,.8,.68]}},
  /* --- dining --- */
  table:{fp:[1.5,1],h:.9,paint:D=>{   /* Meow Sakura (P1): cream square top on a black pedestal */
    { const [bx,by]=D.P(.75,.5,0); ell(D,bx,by,D.T*.3,D.T*.15,'#2f2f33',INK,D.OL*.8); }
    box(D,.66,.42,0,.18,.16,.48,'#3a3a40','#232327','#2c2c31');
    box(D,-.05,-.05,.46,1.6,1.1,.09,'#f7e2bb','#d4ad78','#e3c08e');
    const [vx,vy]=D.P(.3,.25,.55); box(D,.18,.14,.55,.24,.2,.1,'#b8743c','#8a4f2a','#9b5a30');
    ell(D,vx-D.T*.01,vy-D.T*.12,D.T*.05,D.T*.035,'#5cbf3a',INK,D.OL*.6);ell(D,vx+D.T*.03,vy-D.T*.15,D.T*.04,D.T*.03,'#6fd14a',INK,D.OL*.6);
  },hot:{top:[.75,.5,.55]}},
  table4p:{fp:[1.5,1],h:.9,paint:D=>{
    for(const [x,y] of [[.15,.12],[1.25,.12],[.15,.78],[1.25,.78]]) box(D,x,y,0,.1,.1,.46,'#9b5a30','#7e4522','#8a4f2a');
    box(D,-.05,-.05,.46,1.6,1.1,.09,'#e2a466','#b06a36','#c98048');
    for(const k of [.3,.62]) line(D,[D.P(-.05,-.05+1.1*k,.55),D.P(1.55,-.05+1.1*k,.55)],'#c98a50',D.OL*.6);
    poly(D,[D.P(-.05,.3,.555),D.P(1.55,.3,.555),D.P(1.55,.7,.555),D.P(-.05,.7,.555)],'#fff',INK,D.OL*.6);
    for(let k=0;k<8;k+=1) if(k%2===0) poly(D,[D.P(-.05+k*.2,.3,.556),D.P(.15+k*.2,.3,.556),D.P(.15+k*.2,.7,.556),D.P(-.05+k*.2,.7,.556)],'rgba(226,70,63,.75)',null);
  },hot:{top:[.75,.5,.56]}},
  chairL:{fp:[.5,.5],h:1.0,paint:D=>{chairSeat(D);backX(D,0);}},
  chairT:{fp:[.5,.5],h:1.0,paint:D=>{chairSeat(D);backY(D,0);}},
  chair_seat:{fp:[.5,.5],h:.5,paint:D=>chairSeat(D)},
  chair_backR:{fp:[.5,.5],h:1.0,paint:D=>backX(D,.43)},
  chair_backB:{fp:[.5,.5],h:1.0,paint:D=>backY(D,.43)},
  vip:{fp:[2.2,1.4],h:1.3,paint:D=>{OBJ_PAINT.vip_L.paint(D);OBJ_PAINT.vip_mid.paint(D);},hot:{top:[1.15,.7,.57]}},
  /* the booth is drawn in depth slices so seated VIPs are never covered by the sofa behind them */
  vip_L:{fp:[2.2,1.4],h:1.3,paint:D=>{vipSofa(D,0);box(D,0,0,.32,.15,1.4,.5,'#ef5a50','#b8322e','#d23c34');}},
  vip_mid:{fp:[2.2,1.4],h:1.3,paint:D=>{
    for(const [x,y] of [[.95,.4],[1.25,.4],[.95,1.0],[1.25,1.0]]) box(D,x,y,0,.08,.08,.48,'#8a4f2a','#6e3c1f','#7e4522');
    box(D,.7,.2,.48,.9,1.0,.08,'#fff',COL.red,COL.red);line(D,[D.P(1.6,.2,.5),D.P(1.6,1.2,.5)],COL.gold,D.OL*1.2);line(D,[D.P(.7,1.2,.5),D.P(1.6,1.2,.5)],COL.gold,D.OL*1.2);
    const [cx,cy]=D.P(.85,.35,.56);cyl(D,cx,cy,D.T*.025,D.T*.012,D.T*.12,'#fff8e6',null);ell(D,cx,cy-D.T*.15,D.T*.018,D.T*.03,'#ffcf4d',null);
    vipSofa(D,1.6);
  },hot:{top:[1.15,.7,.57]}},
  vip_R:{fp:[2.2,1.4],h:1.3,paint:D=>vipSofa(D,1.6)},
  vip_backR:{fp:[2.2,1.4],h:1.3,paint:D=>box(D,2.05,0,.32,.15,1.4,.5,'#ef5a50','#b8322e','#d23c34')},
  bin:{fp:[.8,.8],h:1.0,paint:D=>{const [x,y,rx,ry]=disc(D,.4,.4,0,.3);const h=D.T*.56*.62;
    cyl(D,x,y,rx,ry,h,'#6fb24f','#4f8f3a');for(const k of [-.5,0,.5]) line(D,[[x+k*rx,y-h+ry*.9],[x+k*rx,y+ry*.9-D.T*.02]],'#5a9a40',D.OL*.6);
    cyl(D,x,y-h,rx*1.06,ry*1.06,D.T*.04,'#5a9a40','#86c35a');ell(D,x,y-h-D.T*.06,rx*.3,ry*.3,'#4f8f3a');pawPrint(D,x+rx*.2,y-h*.45,D.T*.07,'#e9f6dd')}},
  office:{fp:[2.9,2.6],h:1.5,paint:D=>{
    const [rx0,ry0,rx,ry]=disc(D,1.5,1.5,0,1.0);ell(D,rx0,ry0,rx,ry,'#c94b44');ell(D,rx0,ry0,rx*.78,ry*.78,null,'#f3c08c',D.OL*.8);pawPrint(D,rx0,ry0+D.T*.02,D.T*.16,'#e9746a');
    for(const [x,y] of [[.65,.25],[2.4,.25],[.65,.75],[2.4,.75]]) box(D,x,y,0,.08,.08,.6,'#8a4f2a','#6e3c1f','#7e4522');
    box(D,.6,.2,.6,1.9,.6,.08,'#d98f52','#b06a36','#c98048');box(D,1.75,.25,0,.7,.5,.6,'#c98048','#9b5a30','#b06a36');
    box(D,1.0,.3,.68,.08,.08,.2,'#3a3540','#2f2a33','#3a3540');box(D,.92,.18,.85,.08,.5,.32,'#2f2a33','#3a3540','#46414e');
    poly(D,[D.P(1.0,.22,.9),D.P(1.0,.64,.9),D.P(1.0,.64,1.13),D.P(1.0,.22,1.13)],'#9fd4f0',INK,D.OL*.6);
    const [mx,my]=D.P(2.2,.45,.68);cyl(D,mx,my,D.T*.04,D.T*.02,D.T*.07,'#fff',COL.woodDk);
    box(D,1.5,.4,.68,.3,.25,.02,'#fff','#e6dcd2','#f2ebe3');
    const [px,py]=D.P(2.55,2.2,0);cyl(D,px,py,D.T*.12,D.T*.06,D.T*.16,'#e07b4c','#c8653a');leaves(D,px,py-D.T*.16,D.T*.28,COL.leaf,COL.greenDk,9);
  }},
  /* --- decorations --- */
  dc_planter:{fp:[1.2,.6],h:1.1,paint:D=>{box(D,0,0,0,1.2,.6,.38,'#c9874d','#a7652f','#b8743c');for(const k of [.25,.6,.95]){const [x,y]=D.P(k,.3,.38);leaves(D,x,y,D.T*.24,COL.leaf,COL.greenDk,7)}
    for(const [k,c] of [[.4,'#f45d7a'],[.8,'#ffd34d'],[.15,'#f45d7a']]){const [x,y]=D.P(k,.4,.62);ell(D,x,y,D.T*.035,D.T*.03,c,INK,D.OL*.6)}}},
  dc_board:{fp:[.7,.6],h:1.3,paint:D=>{box(D,.05,.25,0,.06,.06,1.0,'#8a4f2a','#6e3c1f','#7e4522');box(D,.6,.25,0,.06,.06,1.0,'#8a4f2a','#6e3c1f','#7e4522');
    poly(D,[D.P(0,.33,.25),D.P(.7,.33,.25),D.P(.7,.33,1.05),D.P(0,.33,1.05)],'#c98048');poly(D,[D.P(.06,.33,.31),D.P(.64,.33,.31),D.P(.64,.33,.99),D.P(.06,.33,.99)],'#2f3b35',INK,D.OL*.6);
    faceText(D,'y',.06,.33,.99,'MENU',.15,'#fff',null,.29,.17);
    onFace(D,'y',.06,.33,.99,g=>{g.translate(.29,.45);g.beginPath();g.moveTo(0,-.12);g.lineTo(-.12,.12);g.lineTo(.12,.12);g.closePath();g.strokeStyle='#f8d44c';g.lineWidth=.02;g.stroke();g.fillStyle='#f26a5c';g.beginPath();g.arc(-.02,.05,.025,0,7);g.arc(.04,.07,.02,0,7);g.fill()});}},
  dc_plant:{fp:[.9,.9],h:1.8,paint:D=>{const [x,y]=D.P(.45,.45,0);cyl(D,x,y,D.T*.2,D.T*.1,D.T*.3,'#e07b4c','#c8653a');ell(D,x,y-D.T*.3,D.T*.16,D.T*.08,'#7a4a2a',null);leaves(D,x,y-D.T*.3,D.T*.62,COL.leaf,COL.greenDk,9)}},
  grand:{fp:[1.6,1],h:2.4,pad:.4,paint:D=>{
    const col=(x)=>{for(let i=0;i<6;i++){const [px,py]=D.P(x,.5,i*.28+.15);ell(D,px-D.T*.06,py,D.T*.11,D.T*.11,[COL.red,'#fff',COL.gold][i%3]);ell(D,px+D.T*.06,py-D.T*.04,D.T*.11,D.T*.11,[COL.gold,COL.red,'#fff'][i%3])}};
    col(0);col(1.6);const [ax,ay]=D.P(0,.5,1.75),[bx,by]=D.P(1.6,.5,1.75);
    for(let i=0;i<=10;i++){const t=i/10,x=ax+(bx-ax)*t,y=ay+(by-ay)*t-Math.sin(t*Math.PI)*D.T*.35;ell(D,x,y,D.T*.1,D.T*.1,[COL.red,'#fff',COL.gold][i%3])}
    const [mx,my]=D.P(.8,.5,1.55);const g=D.g;g.fillStyle=COL.cream;rr(g,mx-D.T*.55,my-D.T*.14,D.T*1.1,D.T*.26,D.T*.06);g.fill();g.strokeStyle=INK;g.lineWidth=D.OL;g.stroke();
    g.fillStyle=COL.red;g.font=`700 ${D.T*.15}px Fredoka, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('GRAND OPENING',mx,my-D.T*.01);
  }},
  ribbon:{fp:[1.6,1],h:1.2,paint:D=>{line(D,[D.P(0,.5,.7),D.P(1.6,.5,.7)],INK,D.OL*3);line(D,[D.P(0,.5,.7),D.P(1.6,.5,.7)],COL.red,D.OL*1.6);
    const [x,y]=D.P(.8,.5,.7);ell(D,x-D.T*.08,y,D.T*.08,D.T*.05,COL.red);ell(D,x+D.T*.08,y,D.T*.08,D.T*.05,COL.red);ell(D,x,y,D.T*.035,D.T*.035,COL.redDk)}},
  rail_x:{fp:[1,.12],h:.9,paint:D=>{for(const k of [0,.5]) box(D,k,0,0,.07,.07,.62,'#c98048','#9b5a30','#b06a36');box(D,0,0,.62,1,.1,.07,'#d98f52','#9b5a30','#b06a36')}},
  rail_y:{fp:[.12,1],h:.9,paint:D=>{for(const k of [0,.5]) box(D,0,k,0,.07,.07,.62,'#c98048','#9b5a30','#b06a36');box(D,0,0,.62,.1,1,.07,'#d98f52','#9b5a30','#b06a36')}},
  lock_sign:{fp:[.6,.3],h:1.4,paint:D=>{box(D,.27,.12,0,.08,.08,.8,'#8a4f2a','#6e3c1f','#7e4522');
    poly(D,[D.P(0,.15,.75),D.P(.6,.15,.75),D.P(.6,.15,1.15),D.P(0,.15,1.15)],'#eab27a');faceText(D,'y',0,.15,1.15,'SOON',.17,'#8a4f2a',null,.3,.2);
    const [x,y]=D.P(.3,.15,.7);ell(D,x,y-D.T*.02,D.T*.08,D.T*.07,COL.gold);D.g.beginPath();D.g.arc(x,y-D.T*.09,D.T*.05,Math.PI,0);D.g.strokeStyle=INK;D.g.lineWidth=D.OL*1.2;D.g.stroke()}},
  /* --- outdoor ground decor --- */
  gd_tree:{fp:[1,1],h:3.0,pad:.5,paint:D=>{const [x,y]=D.P(.5,.5,0),T=D.T;ell(D,x,y,T*.4,T*.18,COL.shadow,null);D.g.fillStyle='#8a5a3a';rr(D.g,x-T*.07,y-T*.7,T*.14,T*.72,T*.04);D.g.fill();D.g.strokeStyle=INK;D.g.lineWidth=D.OL;D.g.stroke();
    for(const [a,b,r,c] of [[-.25,-.95,.32,'#5ea54a'],[.25,-.98,.32,'#5ea54a'],[0,-1.25,.38,'#6fb24f'],[-.12,-1.05,.3,'#7cc05a'],[.15,-1.2,.25,'#86c35a']]) ell(D,x+a*T,y+b*T,r*T,r*T*.9,c);shine(D,x-T*.2,y-T*1.45,T*.18,T*.08,.35)}},
  gd_bush:{fp:[.8,.8],h:1.0,paint:D=>{const [x,y]=D.P(.4,.4,0),T=D.T;ell(D,x,y,T*.32,T*.12,COL.shadow,null);for(const [a,b,r] of [[-.15,-.15,.2],[.15,-.15,.2],[0,-.27,.22]]) ell(D,x+a*T,y+b*T,r*T,r*T*.85,'#6fb24f');
    for(const [a,b] of [[-.12,-.25],[.1,-.3],[.18,-.12]]) ell(D,x+a*T,y+b*T,T*.03,T*.03,'#f45d7a',null)}},
  gd_lamp:{fp:[.5,.5],h:2.6,paint:D=>{const [x,y]=D.P(.25,.25,0),T=D.T;ell(D,x,y,T*.15,T*.07,'#3a3540');D.g.fillStyle='#3a3540';D.g.fillRect(x-T*.03,y-T*1.35,T*.06,T*1.35);
    poly(D,[[x-T*.1,y-T*1.35],[x+T*.1,y-T*1.35],[x+T*.13,y-T*1.6],[x-T*.13,y-T*1.6]],'#fff1b8');poly(D,[[x-T*.16,y-T*1.6],[x+T*.16,y-T*1.6],[x,y-T*1.75]],'#3a3540')}},
  gd_bench:{fp:[1.2,.45],h:.8,paint:D=>{for(const k of [.1,1.0]) box(D,k,.1,0,.08,.3,.3,'#3a3540','#2f2a33','#3a3540');box(D,0,0,.3,1.2,.45,.07,'#d98f52','#b06a36','#c98048');box(D,0,0,.37,1.2,.06,.35,'#d98f52','#b06a36','#c98048')}},
  gd_flowers:{fp:[.8,.8],h:.6,paint:D=>{const T=D.T;for(const [u,v,c] of [[.2,.2,'#f45d7a'],[.5,.3,'#ffd34d'],[.3,.6,'#fff'],[.6,.6,'#f45d7a'],[.7,.25,'#c48ef0']]){const [x,y]=D.P(u,v,0);line(D,[[x,y],[x,y-T*.12]],'#4f8f3a',D.OL*.8);ell(D,x,y-T*.13,T*.04,T*.035,c,INK,D.OL*.6)}}},
  gd_pot:{fp:[.6,.6],h:1.2,paint:D=>{const [x,y]=D.P(.3,.3,0),T=D.T;cyl(D,x,y,T*.14,T*.07,T*.2,'#e07b4c','#c8653a');leaves(D,x,y-T*.2,T*.32,COL.leaf,COL.greenDk,7)}},
};
function backX(D,x){for(const y of [0,.43]) box(D,x,y,.36,.07,.07,.5,'#c98048','#9b5a30','#b06a36');box(D,x,0,.74,.07,.5,.12,'#d98f52','#9b5a30','#b06a36');for(const y of [.14,.29]) box(D,x+.01,y,.4,.05,.06,.34,'#d98f52','#9b5a30','#b06a36')}
function backY(D,y){for(const x of [0,.43]) box(D,x,y,.36,.07,.07,.5,'#c98048','#9b5a30','#b06a36');box(D,0,y,.74,.5,.07,.12,'#d98f52','#9b5a30','#b06a36');for(const x of [.14,.29]) box(D,x,y+.01,.4,.06,.05,.34,'#d98f52','#9b5a30','#b06a36')}
function chairSeat(D){for(const [x,y] of [[.04,.04],[.4,.04],[.04,.4],[.4,.4]]) box(D,x,y,0,.06,.06,.32,'#9b5a30','#7e4522','#8a4f2a');box(D,0,0,.3,.5,.5,.07,'#eab27a','#b06a36','#c98048');
  const [x,y,rx,ry]=disc(D,.25,.25,.37,.18);ell(D,x,y,rx,ry,'#f26a5c',INK,D.OL*.7);}
/* lets object painters reuse item art (e.g. cakes inside the dessert case) */
function ITEM_PAINT_AT(D,k,x,y,sc=1){const g=D.g;g.save();g.translate(x,y);g.scale(sc,sc);ITEM_PAINT[k]({g,P:D.P,T:D.T,OL:D.OL/sc});g.restore()}
