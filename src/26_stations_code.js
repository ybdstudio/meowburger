/* =====================================================================
   26_stations_code.js — Meow Sakura kitchen stalls (yatai) drawn in true iso geometry (same style as the PICK UP counter
   and the storage rack): wooden base with a cream top and a pink wave band, a steel back unit against the wall,
   wooden posts with paper lanterns, a pink plank roof with noren curtains, and a sign board carrying the station's icon. Every station sits flush on its footprint and against its wall.
   wall 'L' = left wall (x=0), front faces +x.   wall 'B' = back wall (y=0), front faces +y.
   Local axes: u runs along the wall, v runs from the wall into the kitchen.
   ===================================================================== */
const STC={wood:'#b56f3d',woodD:'#9a5a30',woodT:'#c98048',top:'#fbe5bd',topD:'#e9c793',topR:'#f2d3a2',
  steel:'#c3c7ce',steelD:'#8a8f98',steelM:'#a3a8b0',dark:'#3a3a40',darkD:'#26262b'};
const ST_THEME={
  oven:   {sign:'#e2463f',signD:'#b8322e',aw:[SAK.roof,SAK.roofB],noren:[SAK.noren,SAK.norenB],band:SAK.petal,text:'CHICKEN',icon:'leg',cook:'fryer'},
  prep:   {sign:'#f08a2c',signD:'#c96a18',aw:[SAK.roof,SAK.roofB],noren:[SAK.noren,'#fde3e8'],band:SAK.petal,text:'BURGER',icon:'burger',cook:'grill'},
  special:{sign:'#7a4ad8',signD:'#5a32a8',aw:[SAK.roof,SAK.roofB],noren:['#f7c4d2',SAK.norenB],band:SAK.petal,text:'DELUXE',icon:'burger',crown:true,cook:'grill'},
  seafood:{sign:'#e2463f',signD:'#b8322e',aw:[SAK.roof,SAK.roofB],noren:[SAK.noren,SAK.norenB],band:SAK.petal,text:'CK BURGER',icon:'ckburger',cook:'grill'},
  veggie: {sign:'#4fb341',signD:'#3a8a30',aw:['#bcd39a','#adc78a'],noren:['#cfe3b0','#e8f1d6'],band:'#bcd39a',wave:'#7fae5a',text:'SALAD',icon:'salad',cook:'bins'},
  dessert:{sign:'#f4c04e',signD:'#c99418',aw:[SAK.roof,SAK.roofB],noren:['#d8e6f4','#f2f6fb'],band:SAK.petal,wave:'#6f95c8',text:'FRIES',icon:'fries',cook:'fryer2'},
  drink:  {sign:'#e2463f',signD:'#b8322e',aw:null,band:SAK.petal,text:'SODA',icon:'cup',cook:'soda'},
};
function stWall(st){ return st.y<.05&&st.x>.05?'B':'L'; }
/* local frame of a station: u along the wall, v away from it */
function stFrame(st){ const B=stWall(st)==='B';
  return {B, L:B?st.w:st.d, Dp:B?st.d:st.w,
    W:(u,v)=>B?[st.x+u,st.y+v]:[st.x+v,st.y+u],
    box:(u,v,z,lu,lv,h,top,front,side)=>{ if(B) box(MD,st.x+u,st.y+v,z,lu,lv,h,top,front,side); else box(MD,st.x+v,st.y+u,z,lv,lu,h,top,side,front); },
    face:(v,z,fn)=>{ if(B) onFace(MD,'y',st.x,st.y+v,z,fn); else onFace(MD,'x',st.x+v,st.y+st.d,z,fn); } }; }
/* the point where finished food is put down (front strip of the counter top) */
function stReadyPt(st){ const f=stFrame(st), [x,y]=f.W(f.L*.62,f.Dp-.32); return P(x,y,.8); }
function stTopPt(st){ const f=stFrame(st), [x,y]=f.W(f.L*.5,.25); return P(x,y,3.75); }

function signIcon(g,kind,cx,cy,s){ g.save(); g.translate(cx,cy); g.lineWidth=.035; g.strokeStyle=INK;
  const E=(x,y,rx,ry,c)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fillStyle=c;g.fill();g.stroke();};
  if(kind==='leg'){ g.rotate(-.6); E(0,-.05*s,.17*s,.12*s,'#f0962c'); g.fillStyle='#fff6e0'; g.fillRect(-.03*s,.05*s,.06*s,.16*s); g.strokeRect(-.03*s,.05*s,.06*s,.16*s); E(-.04*s,.23*s,.04*s,.035*s,'#fff6e0'); E(.04*s,.23*s,.04*s,.035*s,'#fff6e0'); }
  else if(kind==='burger'||kind==='ckburger'){ g.beginPath(); g.ellipse(0,-.05*s,.2*s,.13*s,0,Math.PI,0); g.closePath(); g.fillStyle='#f2a54a'; g.fill(); g.stroke();
    g.fillStyle='#5cbf3a'; g.fillRect(-.21*s,-.05*s,.42*s,.045*s); g.fillStyle=kind==='ckburger'?'#f0962c':'#7a3f22'; g.fillRect(-.2*s,0,.4*s,.07*s); g.strokeRect(-.2*s,0,.4*s,.07*s);
    g.fillStyle='#ffd23f'; if(kind==='burger'){ g.fillRect(-.19*s,-.005*s,.38*s,.03*s); }
    g.beginPath(); g.moveTo(-.2*s,.07*s); g.lineTo(.2*s,.07*s); g.lineTo(.17*s,.13*s); g.lineTo(-.17*s,.13*s); g.closePath(); g.fillStyle='#f2a54a'; g.fill(); g.stroke();
    g.fillStyle='#fff'; for(const [a,b] of [[-.08,-.12],[.02,-.14],[.1,-.1]]){ g.beginPath(); g.ellipse(a*s,b*s,.017*s,.01*s,0,0,7); g.fill(); } }
  else if(kind==='salad'){ g.beginPath(); g.ellipse(0,0,.22*s,.15*s,0,0,Math.PI); g.closePath(); g.fillStyle='#fff'; g.fill(); g.stroke();
    for(const [a,b,c] of [[-.1,-.03,'#5cbf3a'],[.02,-.06,'#7cd14a'],[.12,-.02,'#5cbf3a'],[-.03,.01,'#e2463f'],[.07,.02,'#ffd23f']]) E(a*s,b*s,.06*s,.045*s,c); }
  else if(kind==='fries'){ for(let i=0;i<5;i++){ g.fillStyle='#ffd23f'; g.fillRect((-.12+i*.055)*s,(-.2+(i%2)*.04)*s,.04*s,.2*s); g.strokeRect((-.12+i*.055)*s,(-.2+(i%2)*.04)*s,.04*s,.2*s); }
    g.beginPath(); g.moveTo(-.16*s,-.03*s); g.lineTo(.16*s,-.03*s); g.lineTo(.12*s,.2*s); g.lineTo(-.12*s,.2*s); g.closePath(); g.fillStyle='#e2463f'; g.fill(); g.stroke(); }
  else if(kind==='cup'){ g.beginPath(); g.moveTo(-.13*s,-.15*s); g.lineTo(.13*s,-.15*s); g.lineTo(.1*s,.2*s); g.lineTo(-.1*s,.2*s); g.closePath(); g.fillStyle='#fff'; g.fill(); g.stroke();
    g.fillStyle='#e2463f'; g.fillRect(-.115*s,-.02*s,.23*s,.08*s); g.strokeStyle='#e2463f'; g.lineWidth=.04; g.beginPath(); g.moveTo(.03*s,-.15*s); g.lineTo(.08*s,-.3*s); g.stroke(); }
  g.restore(); }

function drawCodeStation(st){
  const th=ST_THEME[st.type]||ST_THEME.prep, f=stFrame(st), L=f.L, Dp=f.Dp, H=.74;
  const soda=th.cook==='soda';
  /* back unit against the wall */
  f.box(0,0,0,L,.4,soda?2.1:1.75,STC.steel,STC.steelM,STC.steelD);
  if(!soda) for(let i=1;i<3;i++) f.box(.06,.4,.3+i*.45,L-.12,.02,.03,null,STC.steelD,null);
  /* counter */
  f.box(0,.4,0,L,Dp-.4,H,STC.top,STC.wood,STC.woodD);
  f.face(Dp,H-.18,g=>{ /* coloured band on the counter front */ const u0=0; g.fillStyle=th.band; g.fillRect(u0+.04,.02,L-.08,.13); g.lineWidth=.03; g.strokeStyle=INK; g.strokeRect(u0+.04,.02,L-.08,.13);
    g.save(); g.beginPath(); g.rect(u0+.04,.02,L-.08,.13); g.clip(); g.strokeStyle=th.wave||SAK.wave; g.lineWidth=.022; g.beginPath(); for(let x=u0+.04;x<L;x+=.12){ g.moveTo(x,.13); g.arc(x+.06,.13,.06,Math.PI,0); } g.stroke(); g.restore(); });
  /* cooking surface on the back half of the top */
  const cook=(u,v,lu,lv)=>{ const [x,y]=f.W(u,v); return [x,y]; };
  if(th.cook==='grill'){ f.box(.12,.48,H,L-.24,.5,.06,STC.dark,STC.darkD,STC.darkD);
    for(let i=0;i<3;i++){ const [x,y]=f.W(.3+i*(L-.6)/2,.73); const [sx,sy]=P(x,y,H+.07); ell(MD,sx,sy,TW*.11,TW*.055,'#7a3f22',INK,MD.OL*.6); ell(MD,sx-TW*.03,sy-TW*.015,TW*.035,TW*.015,'#a35a32',null); }
    const [fx,fy]=f.W(L*.15,.6); const [sx,sy]=P(fx,fy,H+.1); ctx.save(); ctx.globalAlpha=.35+.2*Math.sin(now*3); ell(MD,sx,sy-TW*.2,TW*.07,TW*.1,'#ffffff',null); ctx.restore(); }
  else if(th.cook==='fryer'||th.cook==='fryer2'){ const n=th.cook==='fryer'?2:1;
    for(let i=0;i<n;i++){ const lu=(L-.3)/n-.08, u=.15+i*((L-.3)/n);
      f.box(u,.46,H,lu,.55,.08,STC.steel,STC.steelM,STC.steelD); f.box(u+.06,.5,H+.08,lu-.12,.47,.01,'#c98a2c',null,null);
      for(let j=0;j<3;j++){ const [x,y]=f.W(u+lu*(.25+j*.25),.74); const [sx,sy]=P(x,y,H+.12); ell(MD,sx,sy,TW*.06,TW*.04,th.cook==='fryer'?'#f0962c':'#ffd23f',INK,MD.OL*.5); } } }
  else if(th.cook==='bins'){ const cols=['#5cbf3a','#e2463f','#ffd23f','#f08a2c'];
    for(let i=0;i<4;i++){ const u=.12+i*((L-.24)/4), lu=(L-.24)/4-.05; f.box(u,.48,H,lu,.42,.07,STC.steel,STC.steelM,STC.steelD);
      const [x,y]=f.W(u+lu/2,.69); const [sx,sy]=P(x,y,H+.08); for(let k=0;k<4;k++) ell(MD,sx+(k%2?1:-1)*TW*.04,sy+(k<2?-1:1)*TW*.018,TW*.04,TW*.022,cols[i],INK,MD.OL*.4); } }
  else if(soda){ /* dispenser block on the back unit: red header, nozzles */
    f.box(.1,.4,H,L-.2,.42,.95,'#2f2f35','#3a3a40','#26262b');
    f.box(.06,.36,H+.95,L-.12,.5,.38,'#e2463f','#c93a33','#b8322e');
    for(let i=0;i<4;i++){ const [x,y]=f.W(.3+i*(L-.6)/3,.84); const [sx,sy]=P(x,y,H+.55); ctx.fillStyle=['#e2463f','#f08a2c','#5cbf3a','#7a3f22'][i]; ctx.fillRect(sx-TW*.04,sy-TW*.08,TW*.08,TW*.1); ctx.strokeStyle=INK; ctx.lineWidth=MD.OL*.6; ctx.strokeRect(sx-TW*.04,sy-TW*.08,TW*.08,TW*.1); }
    f.face(.86,H+1.25,g=>{ signIcon(g,'cup',L/2,.2,1); }); }
  /* posts + awning + sign (not on the soda machine) */
  if(!soda){ const hp=2.05;
    for(const u of [.02,L-.1]) f.box(u,Dp-.12,H,.08,.08,hp-H,STC.woodT,STC.wood,STC.woodD);
    /* roof: pink planks sloping from the back unit to the front posts, a wooden fascia, noren curtains, paper lanterns */
    const n=Math.max(4,Math.round(L/.3)), seg=L/n, p=(u,v,z)=>{ const [x,y]=f.W(u,v); return P(x,y,z); };
    for(let i=0;i<n;i++){ const c=th.aw[i%2], u0=i*seg, u1=u0+seg;
      poly(MD,[p(u0,.4,hp+.35),p(u1,.4,hp+.35),p(u1,Dp+.12,hp),p(u0,Dp+.12,hp)],c,SAK.roofLn,MD.OL*.45); }
    poly(MD,[p(0,.4,hp+.35),p(L,.4,hp+.35),p(L,Dp+.12,hp),p(0,Dp+.12,hp)],null,INK,MD.OL*.8);
    f.face(Dp+.12,hp,g=>{ g.fillStyle=STC.woodT; g.fillRect(0,0,L,.1); g.lineWidth=.03; g.strokeStyle=INK; g.strokeRect(0,0,L,.1);
      drawNoren(g,.1,L-.2,.1,.5,th.noren[0],th.noren[1],th.wave||SAK.wave); });
    for(const u of [.06,L-.06]){ const [lx,ly]=p(u,Dp+.12,hp-.02); paperLantern(ctx,lx,ly,TW*.42); }
    /* sign board standing on top of the back unit */
    f.face(.18,hp+1.45,g=>{ const w=L*.96, x0=(L-w)/2, h=1.08; g.lineWidth=.045; g.strokeStyle=INK;
      rr(g,x0,0,w,h,.14); g.fillStyle=th.sign; g.fill(); g.stroke();
      rr(g,x0+.08,.08,w-.16,h-.16,.1); g.fillStyle='#fff8ec'; g.fill();
      signIcon(g,th.icon,x0+Math.min(.36,w*.2),h*.55,1.35);
      g.save(); g.fillStyle=th.signD; g.font='800 30px Fredoka, sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      const ic=Math.min(.72,w*.4), tx=x0+ic+(w-ic)/2, tw=(w-ic)*.9; const fs=Math.min(.32,tw/(th.text.length*.66)); g.translate(tx,h*.53); g.scale(fs/30,fs/30); g.fillText(th.text,0,0); g.restore();
      if(th.crown){ g.fillStyle='#f4c04e'; g.beginPath(); const cx=x0+w*.24, cy=.02; g.moveTo(cx-.12,cy); g.lineTo(cx-.12,cy-.14); g.lineTo(cx-.05,cy-.06); g.lineTo(cx,cy-.17); g.lineTo(cx+.05,cy-.06); g.lineTo(cx+.12,cy-.14); g.lineTo(cx+.12,cy); g.closePath(); g.fill(); g.lineWidth=.03; g.stroke(); } }); }
}
/* code-drawn balloon arch standing on the floor between two points (semicircle of clustered balloons) */
function addBalloonArch(add,x0,y0,x1,y1,hgt,label,ribbon){ const cols=[SAK.petal,'#fff4f7','#9fd0f0','#ffd98a','#f4a3bb'], N=18, mx=(x0+x1)/2, my=(y0+y1)/2;
  for(let i=0;i<=N;i++){ const a=Math.PI*(1-i/N), x=mx+Math.cos(a)*(x1-x0)/2, y=my+Math.cos(a)*(y1-y0)/2, z=Math.sin(a)*hgt;
    add(x+y+.02,()=>{ const [sx,sy]=P(x,y,z); for(let j=0;j<3;j++) ell(MD,sx+(j-1)*TW*.07,sy-(j%2)*TW*.06,TW*.11,TW*.11,cols[(i+j)%cols.length],INK,MD.OL*.6);
      if(i%2===0) sakuraFlower(ctx,sx,sy-TW*.1,TW*.1,SAK.petal,SAK.core,SAK.petalLn,MD.OL*.4); }); }
  for(const [x,y] of [[x0,y0],[x1,y1]]) add(x+y,()=>{ const [sx,sy]=P(x,y,0); ell(MD,sx,sy,TW*.16,TW*.08,'#8a8f98',INK,MD.OL*.6); });
  if(ribbon) add(mx+my+.03,()=>{ const a=P(x0,y0,.6), b=P(x1,y1,.6); ctx.strokeStyle=INK; ctx.lineWidth=MD.OL*3; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.strokeStyle='#e2463f'; ctx.lineWidth=MD.OL*1.8; ctx.stroke();
    const [cx,cy]=P(mx,my,.6); ell(MD,cx-TW*.08,cy,TW*.08,TW*.06,'#e2463f',INK,MD.OL*.6); ell(MD,cx+TW*.08,cy,TW*.08,TW*.06,'#e2463f',INK,MD.OL*.6); });
  if(label) add(mx+my+.05,()=>{ const [sx,sy]=P(mx,my,hgt+.3); ctx.save(); ctx.font=`800 ${TW*.2}px Fredoka, sans-serif`; const w=ctx.measureText(label).width+TW*.3;
    rr(ctx,sx-w/2,sy-TW*.16,w,TW*.32,TW*.1); ctx.fillStyle='#e2463f'; ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=MD.OL; ctx.stroke(); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label,sx,sy+1); ctx.restore(); });
}
