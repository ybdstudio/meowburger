/* =====================================================================
   60_ui.js — DOM HUD, task card, dock buttons, modals, map screen
   ===================================================================== */
const $=id=>document.getElementById(id);
const UI={
  modalOpen:false,_last:{},hintHidden:false,
  init(){
    $('icCoin').innerHTML=UI_ICON.coin;$('taskReward').querySelector('i').innerHTML=UI_ICON.coin;$('icStar').innerHTML=UI_ICON.star;$('icPin').innerHTML=UI_ICON.pin;
    for(const [id,ic] of [['bShop','shop'],['bUpg','upgrade'],['bTask','task'],['bMap','map'],['bSet','gear']]) $(id).querySelector('i').innerHTML=UI_ICON[ic];
    UI.syncAuto=()=>{const b=$('autoBtn');if(!b)return;b.classList.toggle('on',!!S.auto);b.classList.toggle('x2',S.auto===2);b.setAttribute('aria-pressed',String(!!S.auto));b.querySelector('small').textContent=S.auto===2?'×2':S.auto?'ON':'OFF'};
    if(!CFG.autoPlay){S.auto=0;$('autoBtn').hidden=true;$('autoBtn').style.display='none';} $('autoBtn').onclick=()=>{S.auto=S.auto===2?0:S.auto?2:1;AUTOP.manualT=0;AUTOP.cur=null;save();UI.syncAuto();UI.toast(S.auto===2?'Auto play ×2 speed':S.auto?'Auto play ON — drag to take over':'Auto play OFF')};UI.syncAuto();
    $('bShop').onclick=()=>UI.openShop(); $('bUpg').onclick=()=>UI.openUpgrade(); $('bTask').onclick=()=>UI.openTasks(); $('bMap').onclick=()=>UI.openMap(); $('bSet').onclick=()=>UI.openSettings();
    $('progPill').onclick=()=>UI.openMap(); $('plusBtn').onclick=()=>UI.openShop(); $('taskCard').onclick=()=>UI.openTasks();
    $('boostBtn').onclick=()=>UI.startAd();
    UI.setTask();
  },
  frame(){
    const L=UI._last;
    if(L.m!==S.money){$('moneyTxt').textContent=fmtNum(S.money);L.m=S.money}
    if(L.l!==S.level){$('lvlTxt').textContent=S.level;L.l=S.level}
    const ph=phaseOf(S.task);const done=Math.max(0,Math.min(ph.total,S.task-ph.start));
    const pt=done+'/'+ph.total; if(L.p!==pt){$('progTxt').textContent=pt;$('progFill').style.width=(done/ph.total*100)+'%';L.p=pt}
    const t=curTask();const [p,n]=taskProgress(t);const pk=t.id+p;
    if(L.t!==pk){ $('taskTxt').textContent=t.text; $('taskNum').textContent=t.kind==='final'?'':(n>1?`${Math.min(p,n)}/${n}`:''); $('taskBar').style.width=(t.kind==='final'?100:Math.min(1,p/n)*100)+'%';
      $('taskReward').hidden=!t.reward; if(t.reward) $('taskReward').querySelector('b').textContent='+'+t.reward; L.t=pk; }
    const sg=sideGoal(); const st=sg?(()=>{const [a,b2]=sideProgress(sg);return `Bonus: ${sg.text} ${Math.min(a,b2)}/${b2}`})():'';
    if(L.s!==st){ $('sideTxt').hidden=!sg; if(sg) $('sideTxt').innerHTML=st.replace('Bonus:','<b>★ Bonus:</b>'); L.s=st; }
    const bb=$('boostBtn'); const show=S.task>=taskIndex('t_serve5'); if(bb.hidden===show) bb.hidden=!show;
    if(show){ const on=isBoost(); bb.classList.toggle('on',on); const sub=on?Math.ceil(S.boostUntil-now)+'s left':now<S.boostCd?'ready in '+Math.ceil(S.boostCd-now)+'s':'for 1 min'; if(L.b!==sub){$('boostSub').textContent=sub;L.b=sub} }
  },
  setTask(){const c=$('taskCard');c.classList.remove('done','pop');void c.offsetWidth;c.classList.add('pop');UI._last.t=null},
  taskComplete(t,r){const c=$('taskCard');c.classList.add('done');$('taskTxt').textContent='Task complete!';$('taskNum').textContent=r?'+'+r+' coins':'';$('taskBar').style.width='100%';UI._last.t='__done'},
  toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(UI._tt);UI._tt=setTimeout(()=>t.classList.remove('show'),1500)},
  banner(title,sub){const b=$('banner');b.querySelector('b').textContent=title;b.querySelector('span').textContent=sub||'';b.classList.remove('show');void b.offsetWidth;b.classList.add('show');sfx('level')},
  hideHint(){if(UI.hintHidden)return;UI.hintHidden=true;$('hint').style.opacity=0},
  bump(){const m=$('coinPill');m.classList.remove('bump');void m.offsetWidth;m.classList.add('bump')},
  moneyPt(){const r=$('icCoin').getBoundingClientRect(),w=$('wrap').getBoundingClientRect();return [r.left-w.left+r.width/2,r.top-w.top+r.height/2]},
  close(){$('modalRoot').innerHTML='';UI.modalOpen=false},
  modal(html,cls=''){UI.modalOpen=true;joy.active=false;$('modalRoot').innerHTML=`<div class="modal" id="modalBg"><div class="card ${cls}" role="dialog">${html}<button class="btn-close" id="mClose">CLOSE</button></div></div>`;
    $('mClose').onclick=UI.close;$('modalBg').onclick=e=>{if(e.target.id==='modalBg')UI.close()};$('mClose').focus();},
  /* ---- upgrades ---- */
  openUpgrade(tab){
    const tabs=[['kitchen','Kitchen',()=>S.task>=taskIndex('t_upgrade')&&S.bought.oven1,'Buy the oven and finish the tutorial first'],['manager','Manager',()=>!!S.bought.office,'Open the manager office to unlock'],['rest','Restaurant',()=>S.task>=taskIndex('t_serve5'),'Serve your first customers to unlock']];
    tab=tab||UI._tab||(tabs.find(t=>t[2]())||tabs[0])[0]; UI._tab=tab;
    const cur=tabs.find(t=>t[0]===tab), u=UPG[tab];
    let body='';
    if(!cur[2]()) body=`<p class="locked">${UI_ICON.lock}<span>${cur[3]}</span></p>`;
    else body=u.rows.filter(r=>!r.req||S.bought[r.req]).map(r=>{const lv=S[r.key],c=lv>=r.max?null:r.cost[lv];
      const btn=c===null?'<button class="buy" disabled>MAX</button>':S.money<c&&UI.ready('coin_purchase')?`<button class="buy warn" data-ad="1" title="Not enough coins">${UI_ICON.ad}+${CFG.ads.coinPurchase.reward}</button>`:`<button class="buy" data-k="${r.key}" ${S.money<c?'disabled':''}>${c===0?'FREE':UI_ICON.coin+c}</button>`;
      return `<div class="urow"><i>${UI_ICON[r.icon]}</i><div class="uinfo"><b>${r.label}</b><small>${r.desc}</small><div class="pips">${Array.from({length:r.max},(_,i)=>`<span class="${i<lv?'on':''}"></span>`).join('')}</div></div>${btn}</div>`}).join('')
      + (tab==='kitchen'&&!S.bought.pantry?`<p class="note">Storage and supplier upgrades appear after you build the ingredient storage.</p>`:'');
    UI.modal(`<h2>UPGRADES</h2><div class="tabs">${tabs.map(t=>`<button class="tab ${t[0]===tab?'on':''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div class="ulist">${body}</div>`,'wide');
    $('modalRoot').querySelectorAll('.tab').forEach(b=>b.onclick=()=>UI.openUpgrade(b.dataset.t));
    $('modalRoot').querySelectorAll('.buy[data-ad]').forEach(b=>b.onclick=()=>{UI.close();UI.watchCoins(()=>UI.openUpgrade(tab))});
    $('modalRoot').querySelectorAll('.buy[data-k]').forEach(b=>b.onclick=()=>{const r=u.rows.find(x=>x.key===b.dataset.k);const c=r.cost[S[r.key]];if(S.money<c)return;S.money-=c;S[r.key]++;sfx('buy');save();UI.openUpgrade(tab)});
  },
  /* ---- tasks ---- */
  openTasks(){const i=Math.min(S.task,TASKS.length-1),t=TASKS[i];const [p,n]=taskProgress(t);
    const next=TASKS.slice(i+1,i+4).filter(x=>x.kind!=='final');
    UI.modal(`<h2>TASKS</h2><div class="tcur"><small>CURRENT</small><b>${t.text}</b>${t.kind!=='final'?`<div class="tbar"><i style="width:${Math.min(1,p/n)*100}%"></i><span>${Math.min(p,n)}/${n}</span></div>`:''}${t.reward?`<em>${UI_ICON.coin}+${t.reward}</em>`:''}</div>
      <ul class="tnext">${next.map(x=>`<li>${UI_ICON.lock}<span>${x.text}</span>${x.reward?`<em>+${x.reward}</em>`:''}</li>`).join('')}</ul><p class="note">${Math.min(S.task,TASKS.length-1)} of ${TASKS.length-1} tasks complete</p>`)},
  /* ---- map / progression ---- */
  openMap(){const st=curStage();
    const cards=CFG.stageNames.map((name,i)=>{const ph=TASK_PHASE[i],a=taskIndex(ph.from),b=taskIndex(ph.to);const tot=b-a+1,done=Math.max(0,Math.min(tot,S.task-a));
      const state=i<st||(i===st&&done>=tot)?'done':i===st?'now':'lock';
      return `<div class="stage ${state}"><div class="art">${STAGE_ART[i]}</div><div class="sinfo"><small>STAGE ${i+1}</small><b>${name}</b><div class="tbar"><i style="width:${done/tot*100}%"></i><span>${done}/${tot}</span></div><p>${STAGE_DESC[i]}</p></div>${state==='lock'?`<i class="lk">${UI_ICON.lock}</i>`:state==='done'?`<i class="lk">${UI_ICON.check}</i>`:''}</div>`}).join('');
    UI.modal(`<h2>RESTAURANT MAP</h2><div class="stages">${cards}</div>`,'wide')},
  /* ---- shop ---- */
  openShop(){const on=isBoost(),cd=now<S.boostCd, cp=CFG.ads.coinPurchase, cpWait=Math.ceil(((UI._cd.coin_purchase||0)-Date.now())/1000);
    UI.modal(`<h2>SHOP</h2><div class="ulist"><div class="urow"><i>${UI_ICON.speed}</i><div class="uinfo"><b>Meow Rush</b><small>Stations cook twice as fast and you walk 30% faster for 1 minute.</small></div><button class="buy" id="shopBoost" ${on||cd?'disabled':''}>${on?'ACTIVE':cd?Math.ceil(S.boostCd-now)+'s':UI_ICON.ad+' FREE'}</button></div>
      <div class="urow"><i>${UI_ICON.coin}</i><div class="uinfo"><b>Bag of coins</b><small>A tip jar from happy customers.</small></div><button class="buy" id="shopCoins" ${cpWait>0?'disabled':''}>${cpWait>0?cpWait+'s':UI_ICON.ad+' +'+cp.reward}</button></div></div>
      <p class="note">Decorations, tables and new stations are bought directly in the restaurant by standing on their dashed spot.</p>`);
    const b=$('shopBoost'); if(b) b.onclick=()=>{UI.close();UI.startAd()};
    const g=$('shopCoins'); if(g) g.onclick=()=>{UI.close();UI.watchCoins()};},
  /* Meow Rush (rewarded) */
  startAd(){ if(isBoost()||now<S.boostCd||UI.modalOpen||Ads.busy) return;
    Ads.rewarded('meow_rush',()=>{S.boostUntil=now+CFG.ads.rush.dur;S.boostCd=now+CFG.ads.rush.dur+CFG.ads.rush.cd;UI.toast('Meow Rush! 2× speed for 1 min');sfx('level')}); },
  /* Coin Purchase (rewarded): fixed coins per watch */
  watchCoins(after){ if(!UI.ready('coin_purchase')||Ads.busy) return; const c=CFG.ads.coinPurchase;
    Ads.rewarded('coin_purchase',()=>{UI._cd.coin_purchase=Date.now()+c.cd*1000;UI.grant(c.reward,'Coin purchase');after&&after()}); },
  /* ---- settings ---- */
  openSettings(){const rep=ASSET_REPORT;
    UI.modal(`<h2>SETTINGS</h2><div class="srow"><button class="buy" id="sSound">Sound: ${S.sound?'ON':'OFF'}</button></div>
      <div class="srow"><button class="buy warn" id="sReset">Restart restaurant</button></div>
      ${PF.isMinis?'':`<div class="mx-tools"><b>Minis test tools</b><small>Only visible outside TikTok. Ads and TikTok screens are simulated.</small>
        <span><button class="buy" data-x="days">Reset daily gifts</button><button class="buy" data-x="home">Reset Add-to-Home</button>
        <button class="buy" data-x="fail">Next ad: no fill</button><button class="buy" data-x="quit">Next ad: closed early</button>
        <button class="buy" data-x="cap">TikTok capsule: ${PF.mock.capsule?'ON':'OFF'}</button><button class="buy" data-x="inter">Show interstitial</button>
        <button class="buy" data-x="money">+500 coins</button></span><small id="mxLog">${UI.adLog()}</small></div>`}
      <p class="note">Assets: ${rep.baked} baked from the manifest, ${rep.loaded} loaded from files${rep.missing.length?`, <b>${rep.missing.length} missing:</b> ${rep.missing.join(', ')}`:''}${rep.errors.length?`<br>${rep.errors.join('<br>')}`:''}<br>Play time ${fmtTime(S.playTime)} · v${VERSION} · ${PF.isMinis?'TikTok Minis':'web (test mode)'}</p>`);
    $('modalRoot').querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>UI.testTool(b.dataset.x,b));
    $('sSound').onclick=()=>{S.sound=!S.sound;$('sSound').textContent='Sound: '+(S.sound?'ON':'OFF');save()};
    let armed=false;$('sReset').onclick=()=>{if(!armed){armed=true;$('sReset').textContent='Tap again to confirm';return}resetGame();UI.close();UI.toast('Fresh start!')}},
  milestone(){UI.modal(`<div class="trophy">${UI_ICON.star}</div><h2>GRAND OPENING COMPLETE</h2><p class="big">Meow Sakura is now a Sakura Palace!</p>
    <div class="mstats"><div><b>${fmtTime(S.playTime)}</b><small>play time</small></div><div><b>${S.stats.served}</b><small>customers served</small></div><div><b>${fmtNum(S.stats.collected)}</b><small>coins collected</small></div></div><p class="note">Keep playing: every upgrade and optional table stays available.</p>`,'wide')},
};
function fmtTime(s){s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function phaseOf(ti){for(let i=TASK_PHASE.length-1;i>=0;i--){const a=taskIndex(TASK_PHASE[i].from);if(ti>=a){const b=taskIndex(TASK_PHASE[i].to);return{start:a,total:b-a+1}}}return{start:0,total:1}}
const STAGE_DESC=['Cash register, chicken fryer, tables and the first drink.','Walls go up: storage shelf, burger grill, manager office.','New dining hall, fries, salad, runners, cleaner and the VIP booth.','Bigger kitchen, the Deluxe Burger, second floor and the grand opening.'];
const STAGE_ART=[ /* Meow Sakura: pink roofs and awning, sakura trees and petals */
 '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#cfeaf3"/><rect y="56" width="120" height="24" fill="#dcd3c4"/><rect x="34" y="40" width="52" height="22" fill="#d98f52" stroke="#5a3424" stroke-width="2.5"/><path d="M28 24h64l-4 12H32z" fill="#fff" stroke="#5a3424" stroke-width="2.5"/><path d="M36 24l-2 12M52 24v12M68 24v12M84 24l2 12" stroke="#ef7f9d" stroke-width="7"/><circle cx="42" cy="64" r="6" fill="#5a3424"/><circle cx="78" cy="64" r="6" fill="#5a3424"/><circle cx="102" cy="40" r="12" fill="#f5a9be" stroke="#5a3424" stroke-width="2.5"/><g fill="#f9b8c9"><circle cx="12" cy="14" r="2"/><circle cx="110" cy="10" r="1.6"/><circle cx="104" cy="22" r="1.4"/><circle cx="18" cy="26" r="1.4"/></g></svg>',
 '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#cfeaf3"/><rect y="60" width="120" height="20" fill="#a3d06e"/><path d="M22 34l38-20 38 20v30H22z" fill="#f8e6c2" stroke="#5a3424" stroke-width="2.5"/><path d="M16 36l44-24 44 24" fill="none" stroke="#ef7f9d" stroke-width="6" stroke-linecap="round"/><rect x="52" y="44" width="16" height="20" fill="#b06a36" stroke="#5a3424" stroke-width="2.5"/><rect x="30" y="40" width="14" height="12" fill="#bfe5f3" stroke="#5a3424" stroke-width="2.5"/><rect x="76" y="40" width="14" height="12" fill="#bfe5f3" stroke="#5a3424" stroke-width="2.5"/><g fill="#f9b8c9"><circle cx="12" cy="14" r="2"/><circle cx="110" cy="10" r="1.6"/><circle cx="104" cy="22" r="1.4"/><circle cx="18" cy="26" r="1.4"/></g><path d="M106 64v-12" stroke="#8a5a40" stroke-width="3"/><circle cx="106" cy="46" r="9" fill="#f5a9be" stroke="#c97894" stroke-width="2"/><circle cx="103" cy="43" r="3.5" fill="#fcc6d4"/><g stroke="#5a3424" stroke-width="1.5"><ellipse cx="30" cy="38" rx="3.5" ry="4.5" fill="#fff3e6"/><ellipse cx="90" cy="38" rx="3.5" ry="4.5" fill="#fff3e6"/></g><path d="M26.5 37h7M86.5 37h7" stroke="#e8506a" stroke-width="1.5"/></svg>',
 '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#cfeaf3"/><rect y="60" width="120" height="20" fill="#a3d06e"/><path d="M8 36l28-16 28 16v28H8zM56 30l30-18 30 18v34H56z" fill="#f8e6c2" stroke="#5a3424" stroke-width="2.5"/><path d="M4 38l32-18 32 18M52 32l34-20 34 20" fill="none" stroke="#ef7f9d" stroke-width="5" stroke-linecap="round"/><rect x="78" y="44" width="16" height="20" fill="#b06a36" stroke="#5a3424" stroke-width="2.5"/><rect x="18" y="42" width="12" height="10" fill="#bfe5f3" stroke="#5a3424" stroke-width="2"/><rect x="40" y="42" width="12" height="10" fill="#bfe5f3" stroke="#5a3424" stroke-width="2"/><rect x="62" y="38" width="10" height="10" fill="#bfe5f3" stroke="#5a3424" stroke-width="2"/><rect x="100" y="38" width="10" height="10" fill="#bfe5f3" stroke="#5a3424" stroke-width="2"/><g fill="#f9b8c9"><circle cx="12" cy="14" r="2"/><circle cx="110" cy="10" r="1.6"/><circle cx="104" cy="22" r="1.4"/><circle cx="18" cy="26" r="1.4"/></g></svg>',
 '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="10" fill="#cfeaf3"/><rect y="64" width="120" height="16" fill="#a3d06e"/><path d="M20 30l40-22 40 22v36H20z" fill="#f8e6c2" stroke="#5a3424" stroke-width="2.5"/><path d="M14 32l46-26 46 26" fill="none" stroke="#ef7f9d" stroke-width="5" stroke-linecap="round"/><path d="M20 46h80" stroke="#b06a36" stroke-width="4"/><path d="M24 44v-6M36 44v-6M48 44v-6M72 44v-6M84 44v-6M96 44v-6" stroke="#b06a36" stroke-width="2.5"/><rect x="52" y="50" width="16" height="16" fill="#b06a36" stroke="#5a3424" stroke-width="2.5"/><rect x="30" y="26" width="12" height="10" fill="#bfe5f3" stroke="#5a3424" stroke-width="2"/><rect x="78" y="26" width="12" height="10" fill="#bfe5f3" stroke="#5a3424" stroke-width="2"/><circle cx="60" cy="24" r="5" fill="#f8c84a" stroke="#5a3424" stroke-width="2"/><g fill="#f9b8c9"><circle cx="12" cy="14" r="2"/><circle cx="110" cy="10" r="1.6"/><circle cx="104" cy="22" r="1.4"/><circle cx="18" cy="26" r="1.4"/></g><path d="M106 64v-12" stroke="#8a5a40" stroke-width="3"/><circle cx="106" cy="46" r="9" fill="#f5a9be" stroke="#c97894" stroke-width="2"/><circle cx="103" cy="43" r="3.5" fill="#fcc6d4"/></svg>',
];
