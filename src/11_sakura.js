/* =====================================================================
   11_sakura.js — Meow Sakura theme pieces drawn in code: blossoms, paper lanterns, petals, pennants,
   noren curtains. Used by the walls (30_world.js), stations (26_stations_code.js), trees (24_env.js) and decor.
   ===================================================================== */
const SAK={petal:'#f9b8c9',petalLt:'#ffd9e3',petalDk:'#e886a3',petalLn:'#c9688a',core:'#ffd45c',
  canopy:'#f5a9be',canopyLt:'#fcc6d4',canopyHi:'#ffe3ea',canopyLn:'#c97894',bark:'#8a5a40',barkLn:'#5a3424',
  lantern:'#fff3e6',lanternR:'#e8506a',lanternTop:'#3c2a24',plank:'#f0cf9c',plankLt:'#f6dcb0',plankLn:'#d7ae78',
  roof:'#f6b4c0',roofB:'#f2a3b2',roofLn:'#c97a8a',noren:'#fbd7de',norenB:'#fff1ea',wave:'#e98da2',flagR:'#e2463f'};
/* five-petal blossom in screen space */
function sakuraFlower(g,x,y,r,fill=SAK.petal,core=SAK.core,ink=SAK.petalLn,lw){
  g.save(); g.translate(x,y); g.fillStyle=fill; g.strokeStyle=ink; g.lineWidth=lw||Math.max(.6,r*.16);
  g.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5; g.moveTo(0,0);
    g.ellipse(Math.cos(a)*r*.52,Math.sin(a)*r*.52,r*.5,r*.4,a,0,Math.PI*2); }
  g.fill(); if(lw!==0) g.stroke();
  g.fillStyle=core; g.beginPath(); g.arc(0,0,r*.2,0,7); g.fill(); g.restore(); }
/* paper chochin lantern hanging with its top at (x,y); s = height in px */
function paperLantern(g,x,y,s,band=SAK.lanternR,ol){ const w=s*.36, h=s*.5, lw=ol||Math.max(1,s*.04);
  g.save(); g.strokeStyle=INK; g.lineWidth=lw;
  g.beginPath(); g.moveTo(x,y-s*.18); g.lineTo(x,y); g.stroke();
  g.fillStyle=SAK.lanternTop; g.fillRect(x-w*.55,y,w*1.1,s*.07); g.strokeRect(x-w*.55,y,w*1.1,s*.07);
  g.beginPath(); g.ellipse(x,y+s*.07+h/2,w,h/2,0,0,7); g.fillStyle=SAK.lantern; g.fill(); g.stroke();
  g.save(); g.clip(); g.fillStyle=band; g.fillRect(x-w,y+s*.07+h*.18,w*2,h*.1); g.fillRect(x-w,y+s*.07+h*.72,w*2,h*.1);
  g.globalAlpha=.35; g.fillStyle='#fff'; g.beginPath(); g.ellipse(x-w*.4,y+s*.07+h*.4,w*.22,h*.28,0,0,7); g.fill(); g.restore();
  g.strokeStyle=SAK.canopyLn; g.lineWidth=lw*.5; for(const k of [-.5,0,.5]){ g.beginPath(); g.ellipse(x,y+s*.07+h/2,w*Math.abs(k)+.01,h/2,0,0,7); g.stroke(); }
  g.fillStyle=SAK.lanternTop; g.fillRect(x-w*.45,y+s*.07+h,w*.9,s*.06); g.strokeStyle=INK; g.lineWidth=lw; g.strokeRect(x-w*.45,y+s*.07+h,w*.9,s*.06);
  g.strokeStyle=band; g.beginPath(); g.moveTo(x,y+s*.13+h); g.lineTo(x,y+s*.24+h); g.stroke(); g.restore(); }
/* a loose sakura sprig: a short brown branch with blossoms, in screen space, length L px, angle a */
function sakuraSprig(g,x,y,L,a,seed){ const r=seeded(seed||7); g.save(); g.strokeStyle=SAK.bark; g.lineCap='round'; g.lineWidth=Math.max(1,L*.06);
  const ex=x+Math.cos(a)*L, ey=y+Math.sin(a)*L; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo((x+ex)/2,(y+ey)/2-L*.12,ex,ey); g.stroke();
  for(let i=0;i<6;i++){ const t=.15+i*.16, px=x+(ex-x)*t+(r()-.5)*L*.18, py=y+(ey-y)*t-L*.06+(r()-.5)*L*.2;
    sakuraFlower(g,px,py,L*(.1+r()*.05),i%3?SAK.petal:SAK.petalLt,SAK.core,SAK.petalLn,Math.max(.5,L*.012)); }
  g.restore(); }
/* triangular pennant: white with a red circle, or plain pink */
function pennant(D,p0,p2,p1,i){ const white=i%2===0; poly(D,[p0,p2,p1],white?'#fffaf4':SAK.petal,INK,D.OL*.5);
  if(white){ const cx=(p0[0]+p2[0]+p1[0])/3, cy=(p0[1]+p2[1]+p1[1])/3, r=Math.hypot(p2[0]-p0[0],p2[1]-p0[1])*.14; ell(D,cx,cy-r*.3,r,r,SAK.flagR,null); } }
/* noren panels on a station face (onFace coordinates: u along the face, v downward), width L, height h */
function drawNoren(g,u0,L,v0,h,col,colB,wave,n){ n=n||Math.max(2,Math.round(L/.42)); const gap=.04, w=(L-gap*(n-1))/n;
  g.lineWidth=.025; g.strokeStyle=INK;
  for(let i=0;i<n;i++){ const x=u0+i*(w+gap); g.fillStyle=i%2?colB:col; g.fillRect(x,v0,w,h); g.strokeRect(x,v0,w,h);
    g.save(); g.beginPath(); g.rect(x,v0,w,h); g.clip(); g.strokeStyle=wave; g.lineWidth=.03;
    for(let k=0;k<3;k++){ const yy=v0+h*(.62+k*.13); g.beginPath(); for(let j=-1;j<5;j++){ const cx=x+j*w/4; g.moveTo(cx-w/8,yy); g.arc(cx,yy,w/8,Math.PI,0); } g.stroke(); }
    g.fillStyle=SAK.petalDk; g.globalAlpha=.8; sakuraFlower(g,x+w*.5,v0+h*.3,Math.min(w,h)*.17,SAK.petalDk,SAK.core,SAK.petalLn,0); g.restore(); } }
/* falling petals scattered on a canvas over grass, in world coordinates (cached floor) */
function scatterPetals(D,bounds,n,seed,avoid){ const r=seeded(seed||31), g=D.g;
  for(let i=0;i<n;i++){ const x=bounds.x0+r()*(bounds.x1-bounds.x0), y=bounds.y0+r()*(bounds.y1-bounds.y0); if(avoid&&avoid(x,y)) continue;
    const [sx,sy]=D.P(x,y), s=D.T*(.035+r()*.03); g.save(); g.translate(sx,sy); g.rotate(r()*6.3); g.fillStyle=r()<.5?SAK.petal:SAK.petalLt;
    g.beginPath(); g.ellipse(0,0,s,s*.6,0,0,7); g.fill(); g.restore(); } }
