/* =====================================================================
   23_assets.js — CENTRAL ASSET MANIFEST + preloader/baker.
   Every sprite used by the game is listed in ASSET_MANIFEST. At boot the
   preloader bakes each entry into an offscreen canvas (or loads the PNG
   from ASSET_OVERRIDES if provided). Missing files are reported, never
   silently skipped, and fall back to the baked art.
   ===================================================================== */
const ASSET_OVERRIDES={}; // e.g. {'st_oven':'assets/objects/st_oven.png'} — PNG must match the manifest size/anchor
const ATLAS={};            // key -> {cv,ax,ay,w,h} | sheet {cv,fw,fh,ax,ay,map}
const ASSET_REPORT={baked:0,loaded:0,missing:[],errors:[]};

function isoBounds(def,R){const [w,d]=def.fp,pad=(def.pad??.25)*R;return{minX:-d*R/2-pad,maxX:w*R/2+pad,minY:-def.h*R*.56-pad,maxY:(w+d)*R/4+pad}}
function newCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}
function bakeIso(key,def){const R=REF,b=isoBounds(def,R);const cv=newCanvas(b.maxX-b.minX,b.maxY-b.minY);const g=cv.getContext('2d');
  const D=mkD(g,(x,y,z=0)=>[(x-y)*R/2-b.minX,(x+y)*R/4-z*R*.56-b.minY],R);def.paint(D);return{cv,ax:-b.minX,ay:-b.minY,w:cv.width,h:cv.height,fp:def.fp,hot:def.hot}}
function bakeScreen(paint,w,h,ax,ay,R=REF){const cv=newCanvas(w,h);const g=cv.getContext('2d');g.translate(ax,ay);paint(mkD(g,(x,y,z=0)=>[(x-y)*R/2,(x+y)*R/4-z*R*.56],R));return{cv,ax,ay,w:cv.width,h:cv.height}}
/* character rigs are drawn live (part-based, 8 directions); the manifest bakes an 8-direction preview strip for reference/QA */
function bakeRigPreview(skin){const H=REF_C,fw=Math.round(H*1.0),fh=Math.round(H*1.45);const cv=newCanvas(fw*8,fh);const g=cv.getContext('2d');
  DIRS.forEach((d,i)=>drawRigCat(g,i*fw+fw/2,fh-H*.12,H,skin,d,'idle',.5,{}));return{cv,ax:fw/2,ay:fh-H*.12,w:cv.width,h:cv.height,rig:true,frameSize:[fw,fh],dirs:DIRS}}
/* The manifest: [{key,type,group,desc,file}] — exported as assets/manifest.json */
const ASSET_MANIFEST=[];
(function buildManifest(){
  for(const n in STAFF_SPRITES) for(const p in STAFF_SPRITES[n]) ASSET_MANIFEST.push({key:'staff_'+n+'_'+p,type:'staff',group:'characters',file:`assets/characters/${n}_${p}.png`,desc:'approved art (cut from sheet)'});
  for(const k in CAT_SKINS) ASSET_MANIFEST.push({key:'cat_'+k,type:'rig',group:'characters',file:`assets/characters/cat_${k}_8dir.png`,desc:`${CAT_SKINS[k].name} — part rig, 8-direction preview (0..315°)`});
  for(const k in ITEM_PAINT) ASSET_MANIFEST.push({key:'it_'+k,type:'item',group:'items',file:`assets/items/it_${k}.png`,desc:k.startsWith('raw_')?'raw '+((ITEMS[k.slice(4)]||{}).name||k):k.startsWith('ic_')?'order-bubble icon '+((ITEMS[k.slice(3)]||{}).name||k):(ITEMS[k]||{}).name||k});
  for(const k in EMOTE_PAINT) ASSET_MANIFEST.push({key:'em_'+k,type:'emote',group:'ui',file:`assets/ui/em_${k}.png`,desc:'emote '+k});
  for(const k in OBJ_PAINT) ASSET_MANIFEST.push({key:k,type:'iso',group:k.startsWith('gd_')?'outdoor':k.startsWith('st_')?'stations':'restaurant',file:`assets/${k.startsWith('gd_')?'outdoor':k.startsWith('st_')?'stations':'restaurant'}/${k}.png`,desc:k});
})();
const ITEM_SPR={w:Math.round(REF*.5),h:Math.round(REF*.5)}; ITEM_SPR.ax=ITEM_SPR.w/2; ITEM_SPR.ay=Math.round(ITEM_SPR.h*.8);
const EMO_SPR={w:Math.round(REF*.36),h:Math.round(REF*.4)}; EMO_SPR.ax=EMO_SPR.w/2; EMO_SPR.ay=Math.round(EMO_SPR.h*.95);

function bakeEntry(e){
  if(e.type==='rig') return bakeRigPreview(e.key.slice(4));
  if(e.type==='staff'){const [,n,...r]=e.key.split('_');const m=STAFF_SPRITES[n][r.join('_')];return{cv:null,ax:m.ax,ay:m.ay,w:m.w,h:m.h,staff:true}}
  if(e.type==='item') return bakeScreen(ITEM_PAINT[e.key.slice(3)],ITEM_SPR.w,ITEM_SPR.h,ITEM_SPR.ax,ITEM_SPR.ay);
  if(e.type==='emote') return bakeScreen(EMOTE_PAINT[e.key.slice(3)],EMO_SPR.w,EMO_SPR.h,EMO_SPR.ax,EMO_SPR.ay);
  if(e.type==='iso') return bakeIso(e.key,OBJ_PAINT[e.key]);
  throw new Error('Unknown asset type '+e.type);
}
function loadImage(url){return new Promise((res,rej)=>{const im=PF.createImage();im.onload=()=>res(im);im.onerror=()=>rej(new Error('missing '+url));im.src=url})}
/* Preload: bake everything (yielding to the browser so the progress bar animates), then apply overrides */
async function preloadAssets(onProgress){
  const N=ASSET_MANIFEST.length;let i=0;
  for(const e of ASSET_MANIFEST){
    try{ ATLAS[e.key]=bakeEntry(e); ASSET_REPORT.baked++; }
    catch(err){ ASSET_REPORT.errors.push(e.key+': '+err.message); }
    if(++i%6===0){onProgress&&onProgress(i/N*.9);await new Promise(r=>setTimeout(r,0));}
  }
  if(window.CAT_PIZZA_USE_FILES) for(const e of ASSET_MANIFEST) if(!ASSET_OVERRIDES[e.key]&&e.type!=='rig'&&e.type!=='staff') ASSET_OVERRIDES[e.key]=e.file;
  for(const key in ASSET_OVERRIDES){
    try{ const im=await loadImage(ASSET_OVERRIDES[key]); const a=ATLAS[key];
      if(a){ const cv=newCanvas(a.w,a.h); const k=Math.min(a.w/im.width,a.h/im.height); // uniform scale only: never stretch art
        cv.getContext('2d').drawImage(im,(a.w-im.width*k)/2,(a.h-im.height*k),im.width*k,im.height*k); a.cv=cv;
        if(Math.abs(im.width-a.w)>1||Math.abs(im.height-a.h)>1) ASSET_REPORT.errors.push(key+': size '+im.width+'x'+im.height+' differs from manifest '+a.w+'x'+a.h+' (scaled uniformly)'); }
      ASSET_REPORT.loaded++; }
    catch(err){ ASSET_REPORT.missing.push(ASSET_OVERRIDES[key]); }
  }
  /* Image-backed sprites (staff, pizza art, character sheets). v4.4: decoded in parallel (6 at a time)
     and reported to the loading bar, which used to sit at 90% while these decoded one by one. */
  const jobs=[];
  for(const name in STAFF_SPRITES) for(const pose in STAFF_SPRITES[name]){ const m=STAFF_SPRITES[name][pose];
    jobs.push(async()=>{ try{ m.img=await loadImage(m.src); ASSET_REPORT.loaded++; } catch(err){ ASSET_REPORT.missing.push(name+'_'+pose); } }); }
  /* pizzas: the approved pizza art itself (sheet "Pizza - Nhiều loại").
     ic_*  order-bubble icons: the round art as drawn.
     it_*  pizza lying flat in the world: the same art on the iso floor plane (ry = rx/2) on a crust edge.
     raw_* the same art, paler and less baked, for the oven / prep board. Baked at 3x for crisp high-DPI rendering. */
  for(const k in FOOD_ART) jobs.push(async()=>{ try{ const im=await loadImage(FOOD_ART[k]); bakeFoodArt(k,im); ASSET_REPORT.loaded++; } catch(err){ ASSET_REPORT.missing.push('food_'+k); } });
  for(const k in KIT_OBJ) jobs.push(async()=>{ try{ const im=await loadImage(KIT_OBJ[k].src); bakeKitObj(k,im,KIT_OBJ[k]); ASSET_REPORT.loaded++; } catch(err){ ASSET_REPORT.missing.push('kit_'+k); } });
  for(const name in MORE_SPRITES) for(const pose in MORE_SPRITES[name]){ const m=MORE_SPRITES[name][pose]; m.key=pose;
    jobs.push(async()=>{ try{ m.img=await loadImage(m.src); ASSET_REPORT.loaded++; } catch(err){ ASSET_REPORT.missing.push(name+'_'+pose); } }); }
  for(const k in ENV_ART) jobs.push(async()=>{ try{ const im=await loadImage(ENV_ART[k].src); ENV[k]={img:im,w:ENV_ART[k].w,h:ENV_ART[k].h,tip:ENV_ART[k].tip||.5}; ASSET_REPORT.loaded++; } catch(err){ ASSET_REPORT.missing.push('env_'+k); } });
  let done=0; const total=jobs.length||1, q=jobs.slice();
  const worker=async()=>{ while(q.length){ await q.shift()(); done++; if(done%4===0) onProgress&&onProgress(.9+.1*done/total); } };
  await Promise.all(Array.from({length:6},worker));
  const required=ASSET_MANIFEST.filter(e=>!ATLAS[e.key]).map(e=>e.key);
  if(required.length) throw new Error('Assets failed to build: '+required.join(', '));
  onProgress&&onProgress(1);
}
/* Meow Sakura: kit food art -> world item (it_*), order-bubble icon (ic_*) and raw state (it_raw_*), baked at 3x */
const FOOD_FIT={pizza:1.0,drink:.8,pepperoni:.72,dessert:.62,veggie:.82,seafood:.72,special:.76,box:.72,ing:.62,trash:.78,
  raw_pizza:.8,raw_pepperoni:.7,raw_veggie:.7,raw_seafood:.66,raw_special:.7};
function bakeFoodArt(k,im){ const S=3, W=ITEM_SPR.w*S, H=ITEM_SPR.h*S, AX=ITEM_SPR.ax*S, AY=ITEM_SPR.ay*S;
  const put=(key,fit)=>{ const cv=newCanvas(W,H), g=cv.getContext('2d'); const sc=Math.min(W*fit/im.width,H*.95*fit/im.height*1.15);
    const w=im.width*sc, h=im.height*sc; g.drawImage(im,AX-w/2,AY-h+H*.06,w,h); ATLAS[key]={cv,ax:ITEM_SPR.ax,ay:ITEM_SPR.ay,w:ITEM_SPR.w,h:ITEM_SPR.h}; };
  put('it_'+k,FOOD_FIT[k]||.7);
  if(!k.startsWith('raw_')&&!['box','ing','trash'].includes(k)) put('it_ic_'+k,.9);
}
/* station / furniture art from the kit: drawn into the object's own footprint canvas, uniform scale, feet on the footprint */
function bakeKitObj(k,im,o){ const a=ATLAS[k]; if(!a) return; const cv=newCanvas(a.w,a.h), g=cv.getContext('2d');
  const sc=Math.min(a.w*(o.fit||.98)/im.width,a.h/im.height), w=im.width*sc, h=im.height*sc;
  g.save(); g.translate(a.w/2,0); if(o.flip) g.scale(-1,1); g.drawImage(im,-w/2+(o.dx||0)*a.w,a.h-h,w,h); g.restore();
  a.cv=cv; if(a.hot){ delete a.hot.glow; delete a.hot.board; } }
/* Deluxe and Vegetarian look alike in the sheet art, so each gets a colour ring plus a tiny badge:
   Deluxe = gold ring + crown, Vegetarian = green ring + leaf. The art itself is unchanged. */
const PIZZA_MARK={
  special:{ring:'#f2b81c',badge:(g,x,y,s)=>{g.save();g.translate(x,y);g.beginPath();g.moveTo(-s,s*.55);g.lineTo(-s,-s*.35);g.lineTo(-s*.5,s*.05);g.lineTo(0,-s*.6);g.lineTo(s*.5,s*.05);g.lineTo(s,-s*.35);g.lineTo(s,s*.55);g.closePath();
    g.fillStyle='#ffd23f';g.fill();g.lineWidth=s*.28;g.strokeStyle=INK;g.lineJoin='round';g.stroke();g.restore();}},
  veggie:{ring:'#4fb341',badge:(g,x,y,s)=>{g.save();g.translate(x,y);g.rotate(-.6);g.beginPath();g.moveTo(0,s*.9);g.quadraticCurveTo(s*1.1,0,0,-s*.95);g.quadraticCurveTo(-s*1.1,0,0,s*.9);g.closePath();
    g.fillStyle='#5cc24a';g.fill();g.lineWidth=s*.26;g.strokeStyle=INK;g.stroke();g.beginPath();g.moveTo(0,s*.8);g.lineTo(0,-s*.6);g.lineWidth=s*.14;g.strokeStyle='#d9f5c9';g.stroke();g.restore();}},
};
function bakePizzaArt(k,im){ const S=3, R=REF*S, W=ITEM_SPR.w*S, H=ITEM_SPR.h*S, AX=ITEM_SPR.ax*S, AY=ITEM_SPR.ay*S;
  const rawIm=(()=>{const c=newCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height),p=d.data;
    for(let i=0;i<p.length;i+=4){const l=(p[i]+p[i+1]+p[i+2])/3;p[i]=p[i]*.55+l*.15+255*.30;p[i+1]=p[i+1]*.55+l*.15+228*.30;p[i+2]=p[i+2]*.5+l*.15+180*.35;}g.putImageData(d,0,0);return c})();
  const flat=(src,edge)=>{ const cv=newCanvas(W,H), g=cv.getContext('2d'); g.translate(AX,AY);
    const rx=.215*R, ry=rx/2, t=.045*R;
    g.beginPath();g.ellipse(0,0,rx,ry,0,0,Math.PI);g.lineTo(-rx,-t);g.ellipse(0,-t,rx,ry,0,Math.PI,0,true);g.closePath();
    g.fillStyle=edge;g.fill();g.lineWidth=R*.012;g.strokeStyle=INK;g.stroke();
    g.drawImage(src,-rx,-t-ry,rx*2,ry*2);
    if(PIZZA_MARK[k]){ g.beginPath();g.ellipse(0,-t,rx*.96,ry*.96,0,0,7);g.lineWidth=R*.028;g.strokeStyle=PIZZA_MARK[k].ring;g.stroke(); }
    g.beginPath();g.ellipse(0,-t,rx,ry,0,0,7);g.lineWidth=R*.011;g.strokeStyle=INK;g.stroke();
    if(PIZZA_MARK[k]) PIZZA_MARK[k].badge(g,rx*.62,-t-ry*.62,R*.042);
    return {cv,ax:ITEM_SPR.ax,ay:ITEM_SPR.ay,w:ITEM_SPR.w,h:ITEM_SPR.h}; };
  ATLAS['it_'+k]=flat(im,'#b9662a'); ATLAS['it_raw_'+k]=flat(rawIm,'#e0bf8a');
  const cv=newCanvas(W,H), g=cv.getContext('2d'); const r=.19*R; g.translate(AX,AY); g.drawImage(im,-r,-r*2,r*2,r*2);
  if(PIZZA_MARK[k]){ g.beginPath();g.arc(0,-r,r*.95,0,7);g.lineWidth=R*.03;g.strokeStyle=PIZZA_MARK[k].ring;g.stroke(); PIZZA_MARK[k].badge(g,r*.62,-r*1.66,R*.065); }
  ATLAS['it_ic_'+k]={cv,ax:ITEM_SPR.ax,ay:ITEM_SPR.ay,w:ITEM_SPR.w,h:ITEM_SPR.h};
}
/* UI icons (inline SVG) used by the DOM HUD and upgrade panels */
const UI_ICON={
  coin:'<svg viewBox="0 0 40 40"><ellipse cx="20" cy="22" rx="16" ry="15" fill="#d99a22" stroke="#5a3424" stroke-width="3"/><ellipse cx="20" cy="19" rx="16" ry="15" fill="#f8c84a" stroke="#5a3424" stroke-width="3"/><ellipse cx="20" cy="19" rx="10" ry="9" fill="none" stroke="#e3a92c" stroke-width="2.5"/><path d="M14 13a7 6 0 0 1 6-3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
  star:'<svg viewBox="0 0 40 40"><path d="M20 3l5.2 10.6 11.7 1.7-8.5 8.2 2 11.6L20 29.6 9.6 35.1l2-11.6-8.5-8.2 11.7-1.7z" fill="#f8c84a" stroke="#5a3424" stroke-width="3" stroke-linejoin="round"/></svg>',
  pin:'<svg viewBox="0 0 22 28"><path d="M11 26C4 17 2 13 2 10a9 9 0 0 1 18 0c0 3-2 7-9 16z" fill="#e2463f" stroke="#5a3424" stroke-width="2.5"/><circle cx="11" cy="10" r="3.4" fill="#fff"/></svg>',
  shop:'<svg viewBox="0 0 48 48"><path d="M8 20h32v20H8z" fill="#fff4e3" stroke="#5a3424" stroke-width="3"/><path d="M6 10h36l3 10H3z" fill="#e2463f" stroke="#5a3424" stroke-width="3" stroke-linejoin="round"/><path d="M13 10l-2 10M24 10v10M35 10l2 10" stroke="#fff" stroke-width="4"/><rect x="19" y="27" width="10" height="13" fill="#5cb4f0" stroke="#5a3424" stroke-width="3"/></svg>',
  upgrade:'<svg viewBox="0 0 48 48"><path d="M24 5L42 24H31v17H17V24H6z" fill="#7ed957" stroke="#5a3424" stroke-width="3.2" stroke-linejoin="round"/><path d="M24 11l-9 9" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>',
  task:'<svg viewBox="0 0 48 48"><rect x="9" y="7" width="30" height="36" rx="4" fill="#fff4e3" stroke="#5a3424" stroke-width="3"/><rect x="17" y="3" width="14" height="8" rx="2" fill="#e2463f" stroke="#5a3424" stroke-width="3"/><path d="M15 21l4 4 7-8M15 33h18" stroke="#3f8f35" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>',
  map:'<svg viewBox="0 0 48 48"><path d="M5 11l12-5 14 5 12-5v31l-12 5-14-5-12 5z" fill="#9fd4f0" stroke="#5a3424" stroke-width="3" stroke-linejoin="round"/><path d="M17 6v31M31 11v31" stroke="#5a3424" stroke-width="2.5"/><path d="M8 26c6-4 10 4 16 0s10-6 16-2" stroke="#7ed957" stroke-width="4" fill="none"/><path d="M33 24c-4-5-5-7-5-9a5 5 0 0 1 10 0c0 2-1 4-5 9z" fill="#e2463f" stroke="#5a3424" stroke-width="2.4"/></svg>',
  gear:'<svg viewBox="0 0 48 48"><path fill="#fff4e3" stroke="#5a3424" stroke-width="3" stroke-linejoin="round" d="M21 4h6l1 6 5 2 5-4 4 4-4 5 2 5 6 1v6l-6 1-2 5 4 5-4 4-5-4-5 2-1 6h-6l-1-6-5-2-5 4-4-4 4-5-2-5-6-1v-6l6-1 2-5-4-5 4-4 5 4 5-2z"/><circle cx="24" cy="24" r="7" fill="#d98f52" stroke="#5a3424" stroke-width="3"/></svg>',
  speed:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><circle cx="30" cy="34" r="20" fill="#fff4e3"/><rect x="24" y="6" width="12" height="6" rx="2" fill="#e2463f"/><path d="M30 34l9-9" stroke-linecap="round"/></g></svg>',
  capacity:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><ellipse cx="30" cy="46" rx="20" ry="8" fill="#d68a45"/><ellipse cx="30" cy="40" rx="20" ry="8" fill="#f2b45c"/><ellipse cx="30" cy="32" rx="20" ry="8" fill="#f2b45c"/><ellipse cx="30" cy="31" rx="15" ry="5" fill="#e4573a" stroke="none"/><path d="M30 2l-9 10h6v7h6v-7h6z" fill="#7ed957"/></g></svg>',
  storage:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><path d="M10 24l20-10 20 10v22L30 56 10 46z" fill="#c9874d"/><path d="M10 24l20 10 20-10" fill="none"/><path d="M30 34v22"/><circle cx="22" cy="20" r="6" fill="#e2463f"/><circle cx="36" cy="18" r="6" fill="#f04d3f"/></g></svg>',
  supplier:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><rect x="6" y="20" width="30" height="20" rx="3" fill="#e2463f"/><path d="M36 26h10l7 8v6H36z" fill="#fff4e3"/><circle cx="16" cy="44" r="6" fill="#5a3424"/><circle cx="44" cy="44" r="6" fill="#5a3424"/><path d="M12 12h14M8 6h10" stroke="#5cb4f0" stroke-linecap="round"/></g></svg>',
  run:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><path d="M14 40c0-8 6-14 16-14h10c6 0 10 4 10 10v4z" fill="#e2463f"/><path d="M14 40h36v6H14z" fill="#fff4e3"/><path d="M4 22h12M8 30h8M2 38h8" stroke="#5cb4f0" stroke-linecap="round"/></g></svg>',
  carry:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><ellipse cx="30" cy="48" rx="18" ry="7" fill="#d68a45"/><ellipse cx="30" cy="42" rx="18" ry="7" fill="#f2b45c"/><ellipse cx="30" cy="34" rx="18" ry="7" fill="#f2b45c"/><ellipse cx="30" cy="26" rx="18" ry="7" fill="#f2b45c"/><path d="M30 1l-8 9h5v6h6v-6h5z" fill="#7ed957"/></g></svg>',
  price:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><ellipse cx="28" cy="40" rx="18" ry="9" fill="#d99a22"/><ellipse cx="28" cy="35" rx="18" ry="9" fill="#f8c84a"/><ellipse cx="28" cy="27" rx="18" ry="9" fill="#f8c84a"/><path d="M46 4l9 10h-5v8h-8v-8h-5z" fill="#7ed957"/></g></svg>',
  flow:'<svg viewBox="0 0 60 60"><g stroke="#5a3424" stroke-width="3" stroke-linejoin="round"><circle cx="20" cy="22" r="9" fill="#f5a04f"/><circle cx="40" cy="22" r="9" fill="#a9a2a6"/><path d="M5 54c0-10 6-16 15-16s15 6 15 16z" fill="#e2463f"/><path d="M25 54c0-10 6-16 15-16s15 6 15 16z" fill="#5cb4f0"/></g></svg>',
  lock:'<svg viewBox="0 0 40 40"><rect x="8" y="17" width="24" height="18" rx="4" fill="#f8c84a" stroke="#5a3424" stroke-width="3"/><path d="M13 17v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#5a3424" stroke-width="3"/></svg>',
  check:'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#62b552" stroke="#5a3424" stroke-width="3"/><path d="M12 20l6 6 10-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ad:'<svg viewBox="0 0 20 14"><rect x="1" y="1" width="18" height="12" rx="3" fill="#e2463f" stroke="#5a3424" stroke-width="2"/><path d="M8 4l5 3-5 3z" fill="#fff"/></svg>',
};
