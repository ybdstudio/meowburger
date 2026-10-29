/* =====================================================================
   adapter.js — TikTok NATIVE build only. The native runtime has no DOM.
   Gives the game code the few browser objects it touches (one canvas,
   createElement('canvas'), devicePixelRatio, resize) on top of TTMinis.game.
   Nothing else from the browser exists; the game code runs with window /
   document / localStorage / Image shadowed by these shims.
   ===================================================================== */
var __GG=(typeof GameGlobal!=='undefined'&&GameGlobal)||(typeof globalThis!=='undefined'&&globalThis)||this;
var __TT=(function(){ var g=(typeof TTMinis!=='undefined'&&TTMinis&&TTMinis.game)||null, t=(typeof tt!=='undefined'&&tt)||null, w=(typeof wx!=='undefined'&&wx)||null;
  if(!g&&!t&&!w) return null; if(typeof Proxy==='undefined') return g||t||w;
  /* TTMinis.game, tt and wx are the same API on TikTok native; take each method from whichever has it */
  return new Proxy({},{get:function(_,p){ var s=[g,t,w],i; for(i=0;i<3;i++) if(s[i]&&typeof s[i][p]==='function') return s[i][p].bind(s[i]); for(i=0;i<3;i++) if(s[i]&&s[i][p]!==undefined) return s[i][p]; return undefined; }}); })();
var __TTF=__TT;
var __NWIN,__NDOC;
(function(){
  var T=__TT; if(!T) throw new Error('TTMinis.game is not available');
  function info(){ var fs=['getWindowInfo','getSystemInfoSync']; for(var i=0;i<fs.length;i++){ try{ var r=typeof T[fs[i]]==='function'&&T[fs[i]](); if(r&&typeof r.windowWidth==='number') return r; }catch(e){} } return {}; }
  var wi=info(), screen=__GG.canvas||T.createCanvas(), resizeFns=[];
  var dpr=Math.min(2,Number(wi.pixelRatio||wi.devicePixelRatio||1)||1);
  var vw=Number(wi.windowWidth||wi.screenWidth||screen.width||375), vh=Number(wi.windowHeight||wi.screenHeight||screen.height||667);
  /* Canvas 2D gaps seen on some mini-game runtimes */
  function patchCtx(g){ if(!g||g.__mp) return g; g.__mp=1;
    if(typeof g.ellipse!=='function') g.ellipse=function(x,y,rx,ry,rot,a0,a1,ccw){ this.save(); this.translate(x,y); this.rotate(rot||0); this.scale(rx||1e-6,ry||1e-6); this.arc(0,0,1,a0,a1,ccw); this.restore(); };
    if(typeof g.setLineDash!=='function') g.setLineDash=function(){};
    if(typeof g.arcTo!=='function') g.arcTo=function(x1,y1,x2,y2,r){ this.lineTo(x1,y1); };
    return g; }
  function wrapCanvas(c){ var gc=c.getContext; var cache={};
    var f=function(t,a){ if(cache[t]) return cache[t]; var g=gc.call(c,t,a); if(t==='2d') patchCtx(g); return cache[t]=g; };
    try{ Object.defineProperty(c,'getContext',{value:f,configurable:true,writable:true}); }catch(e){ try{ c.getContext=f; }catch(e2){} }
    return c; }
  wrapCanvas(screen);
  var wrapEl={get clientWidth(){return vw},get clientHeight(){return vh},getBoundingClientRect:function(){return {left:0,top:0,width:vw,height:vh}}};
  __NDOC={
    hidden:false, fonts:undefined,
    createElement:function(t){ t=String(t).toLowerCase(); if(t==='canvas') return wrapCanvas(T.createCanvas()); if(t==='img'||t==='image') return T.createImage(); return {style:{},classList:{add:function(){},remove:function(){}},appendChild:function(){}}; },
    getElementById:function(id){ if(id==='game') return screen; if(id==='wrap') return wrapEl; return null; },
    addEventListener:function(){}, removeEventListener:function(){},
  };
  __NWIN={
    get devicePixelRatio(){return dpr}, get innerWidth(){return vw}, get innerHeight(){return vh},
    navigator:{userAgent:'TikTokMiniGame'},
    addEventListener:function(t,f){ if(t==='resize') resizeFns.push(f); }, removeEventListener:function(){},
    AudioContext: typeof T.createWebAudioContext==='function'?function(){ return T.createWebAudioContext(); }:undefined,
    get MeowSakuraAds(){ return __GG.MeowSakuraAds; },
  };
  if(typeof T.onWindowResize==='function') T.onWindowResize(function(r){ vw=Number(r&&r.windowWidth)||vw; vh=Number(r&&r.windowHeight)||vh; resizeFns.forEach(function(f){try{f()}catch(e){}}); });
  /* monotonic clock: TikTok native has no global performance */
  var t0=Date.now(); __NWIN.performance=(__GG.performance&&typeof __GG.performance.now==='function')?__GG.performance:{now:function(){return Date.now()-t0}};
  __GG.__NWIN=__NWIN; __GG.__NDOC=__NDOC;
})();
