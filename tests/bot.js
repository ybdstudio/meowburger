// Automated playtest bot: plays the real game logic headlessly (fixed dt), logs task completion times.
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 if(process.env.NATIVE_URL){ await p.goto(process.env.NATIVE_URL); await p.waitForFunction(()=>window.__NWIN&&__NWIN.__cpStarted,null,{timeout:60000}); await p.evaluate(()=>{window.__cp=__NWIN.__cp}); }
 else { const html=require('fs').readFileSync(process.env.HTML||require('path').join(__dirname,'..','dist','index.html'),'utf8');
 await p.setContent(html.replace('<!doctype html>',''));
 await p.waitForTimeout(2500); }
 await p.evaluate(()=>{
  const A=__cp; A.DEBUG.noModal=true; window.__ui=document.getElementById('modalRoot')||{innerHTML:''};
  const st=()=>A.S, pl=A.player; let path=[],tgtKey='',repath=0;
  const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
  const stPt=id=>{const s=A.stations.find(s=>s.id===id);return s?s.pt:null};
  const need=(c)=>Object.keys(c.order).filter(k=>(c.order[k]-(c.got[k]||0))>0);
  window.__log=[];window.__lastTask=-1;
  function decide(){
    const S=st(),t=A.curTask(),cat=A.catOf(pl.carry),hired=k=>!!S.bought[k];
    // upgrades required by a task
    if(t.kind==='level'){const row=Object.values(A.UPG).flatMap(u=>u.rows).find(r=>r.key===t.key);const c=row.cost[S[t.key]];
      const pad=t.key.startsWith('r')?A.PT.padRest:t.key.startsWith('m')?A.PT.padManager:A.PT.padKitchen;
      if(c!==undefined&&S.money>=c){ if(dist(pl.x,pl.y,...pad)<.7){A.buyUpgrade(t.key);return null} return pad; } }
    if(t.kind==='custom'&&t.check==='anyKitchenUp'){ if(dist(pl.x,pl.y,...A.PT.padKitchen)<.7){A.buyUpgrade('spd');return null} return A.PT.padKitchen }
    if(t.kind==='buy'){const sp=A.SPOTS.find(s=>s.id===t.spot);if(A.spotVisible(sp)&&S.money>=sp.cost-(sp.paid||0)) return [sp.fp[0]+sp.fp[2]/2,sp.fp[1]+sp.fp[3]/2];}
    if(t.stat==='decor'){const sp=A.SPOTS.find(s=>s.kind==='decor'&&A.spotVisible(s)&&S.money>=s.cost-(s.paid||0));if(sp)return [sp.fp[0]+sp.fp[2]/2,sp.fp[1]+sp.fp[3]/2];}
    if(cat==='ing'){const s=A.stations.filter(s=>s.def.needs&&s.ing<s.def.ingCap).sort((a,b)=>a.ing-b.ing)[0];if(s)return s.pt;const pan=A.stations.find(s=>s.type==='pantry');if(pan)return pan.pt;}
    if(cat==='food'){const v=A.customers.find(c=>c.state==='vipWait');const vt=A.tables.find(t=>t.kind==='vip');if(v&&vt&&pl.carry.some(k=>need(v).includes(k)))return [vt.x+vt.w/2,vt.y+vt.d+.6];
      if(pl.carry.some(k=>A.tray[k]<A.TRAY_CAP)&&(pl.carry.length>=A.carryMax()||!A.stations.some(s=>s.def.item!=='ing'&&s.stock>0&&dist(pl.x,pl.y,...s.pt)<3))) return A.PT.tray;}
    if(cat==='trash'){const bb=A.bins().slice().sort((a,b)=>dist(pl.x,pl.y,a.x,a.y)-dist(pl.x,pl.y,b.x,b.y))[0];if(bb)return bb.pt;}
    const q=A.customers.filter(c=>c.state==='order');
    if(!hired('cashier')&&q.length&&need(q[0]).some(k=>A.tray[k]>0)) return A.PT.cashier;
    if(!hired('cashier')&&(t.check==='servedOne')) return A.PT.cashier;
    const vt=A.tables.find(t=>t.kind==='vip'); if(vt&&vt.pile>0) return [vt.x+vt.w/2,vt.y+vt.d+.6];
    if(S.pile>=25||(S.pile>0&&(t.kind==='buy'||t.check==='collectedAny'||t.stat==='collected'))) return A.PT.pile;
    if(!hired('waiter')&&!pl.carry.length&&A.bins().length){const tb=A.tables.find(t=>t.trash>0);if(tb)return [tb.x+tb.w/2,tb.y+tb.d+.6];}
    if(!pl.carry.length||cat==='ing'){const needy=A.stations.filter(s=>s.def.needs&&s.ing<s.def.ingCap);const pan=A.stations.find(s=>s.type==='pantry');
      if(needy.length&&pan&&pan.stock>0&&pl.carry.length<needy.reduce((a,s)=>a+Math.floor((s.def.ingCap-s.ing)/s.def.perIng),0)&&(!hired('helper')||t.target==='pantry'||t.id==='t_cookspecial')) return pan.pt;}
    if(cat===null||cat==='food'){const want={};A.customers.forEach(c=>{if(c.state==='order'||c.state==='queue'||c.state==='vipWait')for(const k of need(c))want[k]=(want[k]||0)+1});const opts=A.stations.filter(s=>s.def.item!=='ing'&&s.stock>0&&(A.tray[s.def.item]+pl.carry.filter(x=>x===s.def.item).length<A.TRAY_CAP||(want[s.def.item]||0)>A.tray[s.def.item])).sort((a,b)=>(b.stock-(A.tray[b.def.item]||0)*.3)-(a.stock-(A.tray[a.def.item]||0)*.3));
      if(opts[0]&&pl.carry.length<A.carryMax()) return opts[0].pt; if(pl.carry.some(k=>A.tray[k]<A.TRAY_CAP)) return A.PT.tray;}
    if(!hired('cashier')) return A.PT.cashier;
    return A.PT.pile;
  }
  window.__botTick=function(n){const dt=1/30;
    for(let i=0;i<n;i++){
      repath-=dt; window.__hold=(window.__hold||0)-dt; let tg;
      if(window.__cur&&window.__hold>0&&dist(pl.x,pl.y,...window.__cur)>.5) tg=window.__cur; else { tg=decide(); window.__cur=tg; window.__hold=2.5; }
      if(!tg){A.DEBUG.move=[0,0];}
      else{ const key=tg.join(','); if(key!==tgtKey||repath<=0||!path.length){path=A.findPath(pl.x,pl.y,tg[0],tg[1]);tgtKey=key;repath=.6}
        while(path.length&&dist(pl.x,pl.y,...path[0])<.15) path.shift();
        const nx=path.length?path[0]:tg; const dx=nx[0]-pl.x,dy=nx[1]-pl.y; A.DEBUG.move=Math.hypot(dx,dy)<.08?[0,0]:[dx,dy]; }
      const ox=pl.x,oy=pl.y; A.update(dt); if(__ui.innerHTML) __ui.innerHTML=''; if(A.UI&&A.UI.modalOpen&&A.UI.close) A.UI.close();
      if(tg&&Math.hypot(pl.x-ox,pl.y-oy)<1e-4&&Math.hypot(A.DEBUG.move[0],A.DEBUG.move[1])>0){window.__stuck=(window.__stuck||0)+1; if(window.__stuck>20){window.__stuckAt=[pl.x.toFixed(2),pl.y.toFixed(2),String(tg)]; window.__stuck=0; window.__unstick=(window.__unstick||0)+1; path=[];}} else window.__stuck=0;
      const S=st(); if(S.task!==window.__lastTask){window.__log.push([S.task,A.TASKS[Math.min(S.task,A.TASKS.length-1)].id,Math.round(S.playTime),S.money,S.stats.collected]);window.__lastTask=S.task}
    }
    const S=st();return {task:S.task,t:Math.round(S.playTime),money:S.money,served:S.stats.served,lost:S.stats.lost};
  };
 });
 let r;
 if(process.env.CFGJS) await p.evaluate(new Function(process.env.CFGJS));
 for(let k=0;k<400;k++){ r=await p.evaluate(()=>__botTick(1800)); if(k%10===0) console.log(JSON.stringify(r)); if(r.task>=53||r.t>(+process.env.STOP_T||4800)) break; }
 if(process.env.DUMP) console.log('DUMP',JSON.stringify(await p.evaluate(()=>({w:__cp.workers.map(w=>({r:w.role,x:+w.x.toFixed(2),y:+w.y.toFixed(2),st:w.state,job:w.job&&(w.job.kind||w.job.type||JSON.stringify(w.job).slice(0,80)),c:w.carry,asleep:w.asleep})),c:__cp.customers.map(c=>c.state+'@'+c.x.toFixed(1)+','+c.y.toFixed(1)),p:[__cp.player.x,__cp.player.y,__cp.player.carry],tray:__cp.tray}))));
 if(process.env.SAVEOUT) require('fs').writeFileSync(process.env.SAVEOUT,await p.evaluate(()=>JSON.stringify(Object.assign({},__cp.S,{boostUntil:0,boostCd:0}))));
 const log=await p.evaluate(()=>__log);
 require('fs').writeFileSync(process.env.LOG||'/tmp/claude-0/botlog.json',JSON.stringify(log));console.log(log.map(([i,id,t])=>`${String(Math.floor(t/60)).padStart(2)}:${String(t%60).padStart(2,'0')}  #${i} ${id}`).join('\n'));
 const fin=await p.evaluate(()=>({S:__cp.S,workers:__cp.workers.map(w=>w.role),stations:__cp.stations.map(s=>s.id+':'+s.stock+'/'+s.ing)}));
 console.log(JSON.stringify(fin.S.stats),fin.workers,fin.stations, 'money',fin.S.money,'level',fin.S.level);
 console.log('stuck events',await p.evaluate(()=>[window.__unstick||0,window.__stuckAt]));console.log('ERR',errs);
 await b.close();})();
