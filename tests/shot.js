// Screenshots of the web build for art review.
// SAVE=<state json> (optional) is put in storage before load; SHOTS="name:x,y,zoom;..." picks camera spots.
// usage: SAVE=save.json OUT=dir node tests/shot.js   (serves dist/ on a local port)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const DIST=path.join(__dirname,'..','dist'),OUT=process.env.OUT||'/tmp/shots';fs.mkdirSync(OUT,{recursive:true});
const cfg=fs.readFileSync(path.join(__dirname,'..','src','00_config.js'),'utf8');
const KEY=(cfg.match(/SAVE_KEY='([^']+)'/)||[])[1];
const srv=http.createServer((q,r)=>{const f=path.join(DIST,decodeURIComponent(q.url.split('?')[0])==='/'?'index.html':decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end()}r.setHeader('content-type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'application/octet-stream');r.end(d)})});
(async()=>{await new Promise(ok=>srv.listen(0,ok));const port=srv.address().port;
 const b=await chromium.launch();const W=+process.env.W||390,H=+process.env.H||844;
 const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:+process.env.DPR||2});
 const save=process.env.SAVE?fs.readFileSync(process.env.SAVE,'utf8'):null;
 if(save) await ctx.addInitScript(([k,v])=>{try{localStorage.setItem(k,v)}catch(e){}},[KEY,save]);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(`http://localhost:${port}/index.html`);
 if(process.env.LOADING){await p.waitForTimeout(300);await p.screenshot({path:path.join(OUT,'loading.png')});}
 await p.waitForFunction(()=>window.__cpStarted,null,{timeout:60000});await p.waitForTimeout(1200);
 await p.screenshot({path:path.join(OUT,'start.png')});
 if(process.env.NOHUD) await p.addStyleTag({content:'body>*:not(canvas):not(#game){visibility:hidden!important} #game,canvas{visibility:visible!important}'});
 const shots=(process.env.SHOTS||'hall:11,6,1;kitchen:4,6,1;wide:9,9,.5').split(';').map(s=>{const [n,v]=s.split(':');const [x,y,z]=v.split(',').map(Number);return {n,x,y,z}});
 for(const s of shots){
  await p.evaluate(s=>{const A=__cp;A.DEBUG.noModal=true;try{A.UI.close()}catch(e){};const m=document.getElementById('modalRoot');if(m)m.innerHTML='';A.DEBUG.zoom=s.z;window.dispatchEvent(new Event('resize'));A.player.x=s.x;A.player.y=s.y;},s);
  await p.waitForTimeout(900);await p.screenshot({path:path.join(OUT,s.n+'.png')});
 }
 console.log('ERR',errs);await b.close();srv.close();})();
