"""Build Meow Sakura (web builds; engine: Meow Pizza v4.8)
   dist/artifact.html         – page body for the Claude artifact (test build)
   dist/index.html            – standalone page (same code)
   dist/minis/index.html      – TikTok Minis HTML build: ES2017-transpiled, no remote fonts required, icon files next to it
   dist/game.js               – the concatenated game code (for diffing)
usage: python3 build.py [esbuild-binary]"""
import glob,os,sys,base64,subprocess,shutil
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'src'); ART=os.path.join(ROOT,'assets','minis'); DIST=os.path.join(ROOT,'dist')
ESBUILD=sys.argv[1] if len(sys.argv)>1 else shutil.which('esbuild') or '/opt/npm-tools/node_modules/esbuild/bin/esbuild'
def uri(name):
    p=os.path.join(ART,name); mt='image/png' if name.endswith('.png') else 'image/jpeg'
    return 'data:%s;base64,%s'%(mt,base64.b64encode(open(p,'rb').read()).decode())
EMBED=['loading_bg.jpg','paw_thumb.png','btn_revisit.png','btn_share.png','btn_home.png','pop_home_art.jpg','pop_home_steps.jpg','pop_revisit_profile.jpg','pop_revisit_coins.jpg','pop_share_art.jpg']
art={os.path.splitext(n)[0]:uri(n) for n in EMBED}
mx='const MX_ART={'+','.join("%s:'%s'"%(k,v) for k,v in art.items() if k not in('loading_bg','paw_thumb'))+'};\n'
src=sorted(glob.glob(os.path.join(SRC,'[0-9]*.js')))
js="(function(){'use strict';\n"+mx+"\n".join(open(f,encoding='utf-8').read() for f in src)+"\n})();"
tpl=open(os.path.join(SRC,'index.template.html'),encoding='utf-8').read()
for k,v in art.items(): tpl=tpl.replace('__ART_%s__'%k,v)
os.makedirs(os.path.join(DIST,'minis'),exist_ok=True)
def page(code): return tpl.replace('/*__GAME__*/',code)
HEAD=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
      '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#f3b97a">\n<link rel="icon" href="icon_192.png"><link rel="apple-touch-icon" href="icon_192.png">\n')
def standalone(body): return HEAD+body.replace('<div id="wrap">','</head><body>\n<div id="wrap">',1)+'\n</body></html>'
out=page(js)
open(os.path.join(DIST,'artifact.html'),'w',encoding='utf-8').write(out)
open(os.path.join(DIST,'index.html'),'w',encoding='utf-8').write(standalone(out))
open(os.path.join(DIST,'game.js'),'w',encoding='utf-8').write(js)
# Minis build: transpile to ES2017 (?? and ?. are not parsed by older JS cores)
tmp=os.path.join(DIST,'game.es2017.js')
subprocess.run([ESBUILD,os.path.join(DIST,'game.js'),'--target=es2017','--log-level=warning','--outfile='+tmp],check=True)
code=open(tmp,encoding='utf-8').read().replace('</script','<\\/script'); os.remove(tmp)
open(os.path.join(DIST,'minis','index.html'),'w',encoding='utf-8').write(standalone(page(code)))
for n in ['icon_192.png','icon_512.png']: shutil.copy(os.path.join(ART,n),os.path.join(DIST,'minis',n)); shutil.copy(os.path.join(ART,n),os.path.join(DIST,n))
print('artifact',len(out),'minis',os.path.getsize(os.path.join(DIST,'minis','index.html')))
