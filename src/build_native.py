"""Build the TikTok NATIVE package (no DOM): dist/native/
   game.json, project.config.json, game.js (main package, < 4 MB), img/ (loading + icons),
   art/ subpackage (all sprite PNGs + popup art, loaded with loadSubpackage('art')).
   usage: python3 src/build_native.py [appid]"""
import os,re,sys,glob,base64,shutil,subprocess,json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'src'); NAT=os.path.join(SRC,'native'); ART=os.path.join(ROOT,'assets','minis')
OUT=os.path.join(ROOT,'dist','native')
# optional, never shipped/shared: src/native/hs-config.json = {"gameId":"...","sdkKey":"sk_live_...","placements":[<HS dashboard export>]}
HSC=json.load(open(os.path.join(NAT,'hs-config.json'))) if os.path.exists(os.path.join(NAT,'hs-config.json')) else {}
APPID=sys.argv[1] if len(sys.argv)>1 else str(HSC.get('gameId') or 'YOUR_TIKTOK_APP_ID')
HSKEY=str(HSC.get('sdkKey') or 'YOUR_HS_SDK_KEY')
HSKIT=os.path.join(ROOT,'vendor','hs-tiktok-sdk-1.0.7')
ESBUILD=shutil.which('esbuild') or '/opt/npm-tools/node_modules/esbuild/bin/esbuild'
shutil.rmtree(OUT,ignore_errors=True)
for d in ['img','art/sp','art/ui']: os.makedirs(os.path.join(OUT,d),exist_ok=True)
def read(p): return open(p,encoding='utf-8').read()
def must(s,a,b,cnt=1):
    assert s.count(a)==cnt,('patch target not found',a[:80],s.count(a)); return s.replace(a,b)
# ---- 1. sprite data URIs -> files in the art/ subpackage
n=[0]
def extract(code):
    from PIL import Image; import io
    def rep(m):
        n[0]+=1; raw=base64.b64decode(m.group(2))
        if m.group(1)=='webp':   # WebP is not guaranteed on the TikTok native image decoder -> PNG
            name='art/sp/%04d.png'%n[0]; Image.open(io.BytesIO(raw)).save(os.path.join(OUT,name),'PNG',optimize=True); return name
        ext='png' if m.group(1)=='png' else 'jpg'; name='art/sp/%04d.%s'%(n[0],ext)
        open(os.path.join(OUT,name),'wb').write(raw); return name
    return re.sub(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)',rep,code)
# ---- 2. module list: shared core + native UI/main
mods=[]
for f in sorted(glob.glob(os.path.join(SRC,'[0-9]*.js'))):
    b=os.path.basename(f)
    if b in('60_ui.js','65_minis_ui.js'): continue
    code=read(f)
    if b in('15_staff_sprites.js','16_more_sprites.js','17_pizza_art.js','18_env_art.js'): code=extract(code)
    if b=='05_platform.js':  # native: missions / share go through HSGame (65n_hs.js); drop the direct TikTok fallbacks
        code=re.sub(r"\n      return new Promise\(res=>\{ try\{ T\.addShortcut\(.*?\n","\n      return Promise.resolve({ok:false,err:'use HSGame'}); },\n",code,count=1)
        code=re.sub(r"\n      if\(T&&T\.shareAppMessage\) return new Promise.*?\n","\n",code,count=1)
        code=re.sub(r"const fn=T\.startEntranceMission\|\|.*?;\n.*?\n","return Promise.resolve({ok:false,err:'use HSGame'}); },\n",code,count=1,flags=re.S)
        for bad in ['addShortcut(','shareAppMessage(','startEntranceMission(']: assert bad not in code, bad
    if b=='70_main.js':
        a=code.index('function bindInput(){'); z=code.index('function getInput(){')
        code=code[:a]+'''function bindInput(){ /* native: TTMinis.game touch callbacks (no DOM events) */
  const T=PF.sdk()||{}, on=(n,f)=>{ if(typeof T[n]==='function') T[n](f); };
  const pt=t=>[Number(t.clientX??t.screenX??t.pageX??t.x??0),Number(t.clientY??t.screenY??t.pageY??t.y??0),t.identifier??0];
  on('onTouchStart',e=>{ audioInit(); for(const t of (e&&e.changedTouches)||[]){ const [x,y,id]=pt(t); if(UI.touchStart(id,x,y)) continue; if(UI.modalOpen||joy.active||paused) continue; joy.active=true;joy.id=id;joy.ox=joy.x=x;joy.oy=joy.y=y; } });
  on('onTouchMove',e=>{ for(const t of (e&&e.changedTouches)||[]){ const [x,y,id]=pt(t); if(joy.active&&id===joy.id){joy.x=x;joy.y=y} else UI.touchMove(id,x,y); } });
  const end=e=>{ for(const t of (e&&e.changedTouches)||[]){ const [x,y,id]=pt(t); if(joy.active&&id===joy.id){joy.active=false;joy.id=null} else UI.touchEnd(id,x,y); } };
  on('onTouchEnd',end); on('onTouchCancel',end);
}
'''+code[z:]
        code=must(code,"function showError(msg){const b=$('errorBox');b.hidden=false;b.querySelector('p').textContent=msg;const l=$('loading');if(l)l.hidden=true}","function showError(msg){window.__cpErr=msg;UI.drawError(msg)}")
        code=must(code,"render();UI.frame();","render();UI.frame();UI.draw();")
        code=must(code,"    S=autoDefaults(load()); if(!S.taskBase) S.taskBase=statSnap(); S.stage=curStage();","    S=autoDefaults(load()); if(!S.taskBase) S.taskBase=statSnap(); S.stage=curStage();\n    HSB.start(); /* HS SDK: login + dashboard config; rewards arrive in hsGive */")
        code=must(code,"    UI.loading(.03,'Heating the grill…');","    const ldIv=setInterval(()=>{if(!window.__cpStarted&&!window.__cpErr)UI.drawLoading()},120);\n    UI.loading(.03,'Heating the grill…');")
        code=must(code,"""    UI.loading(.08,'Toasting the buns…');
    await preloadAssets(p=>UI.loading(.08+p*.88,""","""    await new Promise((res,rej)=>{ const T=PF.sdk(); if(!T||typeof T.loadSubpackage!=='function') return res();
      const task=T.loadSubpackage({name:'art',success:res,fail:e=>rej(new Error('loadSubpackage(art) failed: '+((e&&e.errMsg)||e)))});
      if(task&&typeof task.onProgressUpdate==='function') task.onProgressUpdate(r=>UI.loading(.03+.27*((r&&r.progress)||0)/100,'Loading the kitchen…')); });
    UI.loading(.3,'Toasting the buns…');
    await preloadAssets(p=>UI.loading(.3+p*.66,""")
        code=must(code,"    $('loading').classList.add('gone'); setTimeout(()=>{$('loading').hidden=true},400);\n","    clearInterval(ldIv);\n")
    mods.append('/* ---- %s ---- */\n'%b+code)
    if b=='50_render.js':  # own block scope: its helpers (box, txt, bar...) must not shadow the game's drawing helpers
        ui=must(read(os.path.join(NAT,'60n_ui_canvas.js')),'const UI={','UI={')
        mods.append('/* ---- native/60n_ui_canvas.js ---- */\nlet UI;\n{\n'+ui+'\n}')
        mods.append('/* ---- native/65n_hs.js ---- */\n'+read(os.path.join(NAT,'65n_hs.js')))
core='\n'.join(mods)
for bad in ['eval(','new Function(']: assert bad not in core, bad+' is forbidden on TikTok native'
body=("(function(window,document,navigator,location,localStorage,sessionStorage,Image,performance,requestAnimationFrame){'use strict';\n"+core+
      "\n})(__NWIN,__NDOC,__NWIN.navigator,undefined,undefined,undefined,undefined,__NWIN.performance,"
      "(typeof requestAnimationFrame==='function'?requestAnimationFrame:function(f){return setTimeout(function(){f()},16)}));\n")
tmp=os.path.join(OUT,'_core.js'); open(tmp,'w',encoding='utf-8').write(body)
subprocess.run([ESBUILD,tmp,'--target=es2017','--log-level=warning','--outfile='+tmp+'.out'],check=True)
HSREQ="var HSGame=(function(){ try{ return require('./hs-game.js'); }catch(e){ console.warn('HS SDK not loaded: '+(e&&e.message)); return null; } })();\n"
game='/* Meow Sakura — TikTok native mini game. Generated by src/build_native.py */\n'+HSREQ+read(os.path.join(NAT,'adapter.js'))+'\n'+read(tmp+'.out')
os.remove(tmp); os.remove(tmp+'.out')
open(os.path.join(OUT,'game.js'),'w',encoding='utf-8').write(game)
# ---- 3. images: loading + icons (main), popup art + side buttons (art/ui)
shutil.copy(os.path.join(ART,'loading_bg.jpg'),os.path.join(OUT,'img','loading_bg.jpg'))
shutil.copy(os.path.join(ART,'paw_thumb.png'),os.path.join(OUT,'img','paw_thumb.png'))
subprocess.run(['node',os.path.join(ROOT,'tools','native_icons.js'),os.path.join(OUT,'img')],check=True,stdout=subprocess.DEVNULL)
for nme in ['btn_revisit.png','btn_share.png','btn_home.png','pop_home_art.jpg','pop_revisit_profile.jpg','pop_revisit_coins.jpg','pop_share_art.jpg']:
    shutil.copy(os.path.join(ART,nme),os.path.join(OUT,'art','ui',nme))
open(os.path.join(OUT,'art','game.js'),'w').write('// Meow Sakura art subpackage: sprite images only (loaded with loadSubpackage("art")).\n')
for k in ['hs-game.js','hs-tiktok-sdk.min.js']: shutil.copy(os.path.join(HSKIT,k),os.path.join(OUT,k))
open(os.path.join(OUT,'meow-config.js'),'w').write('''// Meow Sakura — fill in before uploading to TikTok Minis.
// appId: your TikTok Minis App ID (same value as "appid" in project.config.json)
// hsSdkKey: your HS SDK key (sk_live_...). The Client Secret never goes here.
module.exports = {
  appId: '%s',
  hsSdkKey: '%s'
};
'''%(APPID,HSKEY))
# ---- 4. configs
json.dump({"deviceOrientation":"portrait","subpackages":[{"name":"art","root":"art/"}]},open(os.path.join(OUT,'game.json'),'w'),indent=2)
json.dump({"appid":APPID,"projectname":"Meow Sakura Autotest","description":"Meow Sakura - auto play test build","compileType":"game",
           "setting":{"urlCheck":False,"es6":True,"postcss":True,"minified":True}},open(os.path.join(OUT,'project.config.json'),'w'),indent=2)
# ---- 4b. HS dashboard JSON, NEXT TO the package (never uploaded): paste its iaa_config in HS → Ads Config → Edit raw JSON
GAME_LABELS=re.findall(r"label:'([^']+)'",open(os.path.join(SRC,'05_platform.js')).read().split('const AD_PLACEMENTS=')[1].split('};')[0])
AD_IDS={k:"YOUR_AD_UNIT_ID" for k in GAME_LABELS}
for p in HSC.get('placements',[]):
    if p.get('label') in AD_IDS and p.get('ads'): AD_IDS[p['label']]=p['ads'][0]['id']
# build-time check: every label the game uses is on the dashboard and every dashboard placement is used
if HSC.get('placements'):
    dash={p.get('label') for p in HSC['placements']}
    miss=[l for l in GAME_LABELS if l not in dash]; extra=[l for l in dash if l not in GAME_LABELS]
    if miss: print('WARNING: placements used by the game but missing on the dashboard:',miss)
    if extra: print('WARNING: dashboard placements the game never shows:',extra)
hsdef=subprocess.run(['node','-e',"const vm=require('vm'),fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');const c={};vm.createContext(c);"
  "vm.runInContext(s.slice(s.indexOf('const HS_DEFAULTS='),s.indexOf('const HSB=')).replace('const HS_DEFAULTS=','this.D='),c);console.log(JSON.stringify(c.D))",os.path.join(NAT,'65n_hs.js')],check=True,capture_output=True,text=True).stdout
D=json.loads(hsdef)
json.dump({"iaa_config":{"placements":[{"label":k,"ads":[{"id":v}]} for k,v in AD_IDS.items()],"rewards":D['rewards'],"items":D['items']},"products":[]},
          open(OUT+'.hs-dashboard.json','w'),indent=2)
# ---- 5. size report
def size(p):
    t=0
    for r,_,fs in os.walk(p):
        for f in fs: t+=os.path.getsize(os.path.join(r,f))
    return t
total=size(OUT); sub=size(os.path.join(OUT,'art')); main=total-sub
print('native: %d sprite files, main %.2f MB, art %.2f MB, total %.2f MB'%(n[0],main/1e6,sub/1e6,total/1e6))
assert main<4*1024*1024, 'main package over 4 MB'
assert total<30*1024*1024, 'package over 30 MB'
