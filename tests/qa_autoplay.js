// Auto-play test build (branch meowsakura-autoplay): runs dist/native/game.js behind the fake TikTok runtime of qa_native.js
// and checks: auto play ON at first start, the player moves by itself, Settings shows Auto play + 1x..4x, each speed
// runs the game that many times faster, the AUTO button toggles. Screenshots go to OUT.
// usage: node tests/qa_autoplay.js [outdir]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..','dist','native'), OUT=process.argv[2]||path.join(__dirname,'..','qa_autoplay'); fs.mkdirSync(OUT,{recursive:true});
const qa=fs.readFileSync(path.join(__dirname,'qa_native.js'),'utf8'); const a=qa.indexOf('const HARNESS='); eval(qa.slice(a,qa.indexOf('`;',a)+2).replace('const HARNESS=','var HARNESS='));
const srv=http.createServer((q,r)=>{ if(q.url==='/'||q.url.startsWith('/__h')){r.writeHead(200,{'content-type':'text/html'});return r.end(HARNESS)}
  const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); if(!f.startsWith(ROOT)||!fs.existsSync(f)){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':f.endsWith('.png')?'image/png':'image/jpeg'}); fs.createReadStream(f).pipe(r); });
const res=[]; const ok=(n,c,i='')=>res.push((c?'PASS ':'FAIL ')+n+(i?' — '+i:''));
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:'+port+'/__h'); await p.waitForFunction(()=>window.__NWIN&&__NWIN.__cpStarted,null,{timeout:60000});
  await p.evaluate(()=>{const A=__NWIN.__cp; A.UI.close&&A.UI.close();});
  const st=()=>p.evaluate(()=>{const A=__NWIN.__cp;return {auto:A.S.auto,speed:A.S.gameSpeed,t:A.S.playTime,x:A.player.x,y:A.player.y,task:A.S.task,money:A.S.money}});
  const s0=await st(); ok('auto play ON at first start',s0.auto===1,JSON.stringify(s0)); ok('speed 1x at first start',s0.speed===1);
  await p.waitForTimeout(4000); const s1=await st();
  ok('player moves by itself',Math.hypot(s1.x-s0.x,s1.y-s0.y)>.5||s1.task>s0.task,`moved ${Math.hypot(s1.x-s0.x,s1.y-s0.y).toFixed(2)} tiles, task ${s0.task}->${s1.task}`);
  await p.screenshot({path:path.join(OUT,'1_auto_on.png')});
  const tapId=async id=>{ const h=await p.evaluate(id=>{__NWIN.__cp.UI.draw();const h=__NWIN.__cp.UI.hits().slice().reverse().find(h=>h.id===id);return h&&[h.x+h.w/2,h.y+h.h/2]},id); if(!h) return false; await p.mouse.click(h[0],h[1]); await p.waitForTimeout(250); return true; };
  await p.evaluate(()=>__NWIN.__cp.UI.openSettings()); await p.waitForTimeout(300); await p.screenshot({path:path.join(OUT,'2_settings.png')});
  const rate={};
  for(const v of [1,2,3,4]){ ok('Settings button '+v+'x',await tapId('spd'+v)); const sp=(await st()).speed; ok('speed set to '+v+'x',sp===v,'S.gameSpeed='+sp);
    if(v===3) await p.screenshot({path:path.join(OUT,'3_settings_3x.png')});
    await p.evaluate(()=>__NWIN.__cp.UI.close()); await p.waitForTimeout(400);
    const t0=await st(), w0=Date.now(); await p.waitForTimeout(3000); const t1=await st(); rate[v]=(t1.t-t0.t)/((Date.now()-w0)/1000);
    await p.evaluate(()=>__NWIN.__cp.UI.openSettings()); await p.waitForTimeout(200); }
  const r1=rate[1]; ok('game runs 1x/2x/3x/4x as fast',[2,3,4].every(v=>Math.abs(rate[v]/r1-v)<.35*v),Object.entries(rate).map(([k,v])=>k+'x='+(v/r1).toFixed(2)).join(' '));
  ok('Auto play button in Settings',await tapId('auto2')); ok('Settings turns auto play OFF',(await st()).auto===0); await tapId('auto2'); ok('…and ON again',(await st()).auto===1);
  await p.evaluate(()=>__NWIN.__cp.UI.close()); await p.waitForTimeout(400); await p.screenshot({path:path.join(OUT,'4_auto_4x.png')});
  ok('AUTO button toggles OFF',await tapId('auto')&&(await st()).auto===0); await tapId('auto'); ok('AUTO button toggles ON',(await st()).auto===1);
  await p.waitForTimeout(20000); const s9=await st(); ok('progress at 4x after 20 s',s9.task>s1.task,`task ${s1.task} -> ${s9.task}, play time ${s9.t.toFixed(0)} s`);
  await p.screenshot({path:path.join(OUT,'5_after_20s_4x.png')});
  ok('no page errors',errs.length===0,errs.slice(0,3).join(' | '));
  console.log(res.join('\n')); console.log(res.filter(r=>r.startsWith('FAIL')).length+' failed of '+res.length);
  await b.close(); srv.close(); })();
