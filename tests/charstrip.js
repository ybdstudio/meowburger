// Renders a character's frames in the real renderer, for art review.
// usage: node tests/charstrip.js OUT.png [who=player|<worker role>|<customer skin>] [carry=1] [anims=walk]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const fs=require('fs'),path=require('path'),http=require('http');
const DIST=path.join(__dirname,'..','dist');
const srv=http.createServer((q,r)=>fs.readFile(path.join(DIST,q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.statusCode=404;return r.end()}r.end(d)}));
const [OUT,WHO='player',CARRY='0',ANIM='walk']=process.argv.slice(2);
(async()=>{await new Promise(ok=>srv.listen(0,ok));const b=await chromium.launch();const p=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:1});
 await p.goto(`http://localhost:${srv.address().port}/index.html`);await p.waitForFunction(()=>window.__cpStarted,null,{timeout:60000});
 const urls=await p.evaluate(([WHO,CARRY,ANIM])=>{const A=__cp;A.DEBUG.noModal=true;try{A.UI.close()}catch(e){};A.DEBUG.zoom=2.4;window.dispatchEvent(new Event('resize'));
  const pl=A.player; pl.x=9;pl.y=4; const cv=document.getElementById('game'), out=[];
  let e=pl; const hide=[];
  if(WHO!=='player'){ e={x:10.2,y:2.8,dir:0,t:0,carry:[],seed:0,skin:WHO,walking:false}; }
  const dirs=[0,45,90,135,180,225,270,315];
  for(const d of dirs){ const row=[];
    for(let f=0;f<5;f++){ const walking=f>0;
      if(WHO==='player'){ pl.dir=d; pl.walking=walking; pl.carry=CARRY==='1'?['pizza','drink','pizza']:[]; pl.t=walking?(f-1)/8+.01:0; pl.happyT=0; }
      else { e.dir=d; e.walking=walking; e.carry=CARRY==='1'?['pizza']:[]; e.t=walking?(f-1)/11+.01:0; }
      A.customers.length=0; for(const w of A.workers) w.x=-50;
      for(let i=0;i<40;i++) A.render();
      if(WHO!=='player'){ /* draw the extra character on top through the customer list */ A.customers.push(Object.assign(e,{state:walking?'enter':'queue',patience:9,pMax:9,order:{},got:{}})); A.render(); A.customers.length=0; }
      const W=cv.width,H=cv.height, c=document.createElement('canvas'); const X0=WHO==='player'?.3:.52; c.width=W*.4; c.height=H*.55; c.getContext('2d').drawImage(cv,W*X0,H*.12,W*.4,H*.55,0,0,W*.4,H*.55); row.push(c.toDataURL()); }
    out.push(row); }
  return out; },[WHO,CARRY,ANIM]);
 const pg=await b.newPage({viewport:{width:900,height:1800}});
 await pg.setContent('<body style="margin:0;background:#fff">'+urls.map(r=>'<div style="display:flex">'+r.map(u=>`<img src="${u}">`).join('')+'</div>').join('')+'</body>');
 await pg.waitForTimeout(300); await pg.screenshot({path:OUT,fullPage:true});
 await b.close();srv.close();})();
