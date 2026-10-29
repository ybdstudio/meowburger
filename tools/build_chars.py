# Builds src/16_more_sprites.js (Meow Sakura characters = the Meow Burger cats) from the approved sheets.
import sys,glob,io,base64,json,numpy as np
sys.path.insert(0,'/home/claude/burger/tools'); import cut_burger as C
from PIL import Image
from scipy import ndimage
W='/home/claude/work/'
def kit(n): return glob.glob('/home/claude/src/burgerkit/*/'+n+'_*.png')[0]
def bgl(a):
    mn=a.min(2); mx=a.max(2); lum=a.mean(2)
    b=np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]); bgc=np.median(b,axis=0)
    return ((mn>225)&(mx-mn<30))|(np.abs(a-bgc).sum(2)<55)|((mx-mn<22)&(lum>178))
C.bglike=bgl
import cut_burger
cut_burger.bglike=bgl
def segs(a,y0,y1,x0,x1,N):
    sub=a[y0:y1,x0:x1]; fg=~bgl(sub); fg=ndimage.binary_opening(fg,np.ones((5,5)))
    col=fg.sum(0)>2; s=[]
    for x,v in enumerate(col):
        if v:
            if s and x-s[-1][1]<=14: s[-1][1]=x
            else: s.append([x,x])
    s=sorted(s,key=lambda t:-(t[1]-t[0]))[:N]; s.sort()
    out=[]
    for a0,a1 in s:
        rows=np.nonzero(fg[:,a0:a1+1].sum(1)>0)[0]
        out.append((max(0,x0+a0-8),y0+max(0,rows.min()-8),min(a.shape[1],x0+a1+9),y0+min(y1-y0,rows.max()+9)))
    if len(out)!=N:
        print('WARN segs -> equal split',N,len(out),y0,y1,x0,x1); out=[]; cw=(x1-x0)/N
        for i in range(N):
            xa=int(x0+i*cw)+6; xb=int(x0+(i+1)*cw)-6; f=fg[:,xa-x0:xb-x0]; rows=np.nonzero(f.sum(1)>0)[0]; cols=np.nonzero(f.sum(0)>0)[0]
            out.append((xa+max(0,cols.min()-8),y0+max(0,rows.min()-8),min(xb,xa+cols.max()+9),y0+min(y1-y0,rows.max()+9)))
    return out
DIR8_A=[0,45,90,135,180,225,270,315]          # kit order: Down, Down-Left, Left, Up-Left / Up, Up-Right, Right, Down-Right
OUT={}; PREV=[]
def enc(im):
    b=io.BytesIO(); im.save(b,'WEBP',quality=90,method=6,alpha_quality=95); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
def tray_anchor(im):
    A=np.array(im).astype(int); r,g,b,al=A[...,0],A[...,1],A[...,2],A[...,3]
    m=(al>200)&(r>95)&(r<160)&(g>68)&(g<118)&(b>48)&(b<95)&(r-g>18)&(r-g<50)
    lab,n=ndimage.label(m)
    if n==0: return None
    sz=ndimage.sum(m,lab,range(1,n+1)); k=int(np.argmax(sz))+1; ys,xs=np.nonzero(lab==k)
    return [round(float(xs.mean())/A.shape[1],3), round(float(np.percentile(ys,30))/A.shape[0],3)]
import matte as MT
WHITE={'cat04','vip02'}
from collections import deque
def unshadow(im,white=False):
    # remove the painted floor shadow under the feet: light, low-saturation, not-white pixels in the bottom 30%
    # that connect to the transparent outside (the dark outline stops the flood, white paws stay)
    A=np.array(im).astype(np.int32); h,w=A.shape[:2]; al=A[...,3]; rgb=A[...,:3]; lum=rgb.mean(2); sat=rgb.max(2)-rgb.min(2)
    y0=int(h*.68); pas=np.zeros((h,w),bool)
    pas[y0:]=(((lum[y0:]>120)&(lum[y0:]<(256 if white else 243))&(sat[y0:]<95)&(rgb[y0:,:,0]>=rgb[y0:,:,2]))|(al[y0:]<150))
    ext=np.zeros((h,w),bool); q=deque()
    for y in range(y0,h):
        for x in range(w):
            if pas[y,x] and (al[y,x]<40 or y==h-1 or x in (0,w-1)): ext[y,x]=True; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if y0<=ny<h and 0<=nx<w and pas[ny,nx] and not ext[ny,nx]: ext[ny,nx]=True; q.append((ny,nx))
    A[...,3]=np.where(ext,0,al)
    ys,xs=np.nonzero(A[...,3]>24); A=A[ys.min():ys.max()+1,xs.min():xs.max()+1]
    return Image.fromarray(A.astype(np.uint8),'RGBA')
IMG={}
def put(set_,pose,a,box,target=150.0,maxh=230,tray=False):
    o=((dict(multi=True,tol=20,er=13,holefrac=.3) if set_=='cat04' else dict(multi=True,tol=24,neutral=False,er=5)) if pose.startswith('sit') else dict(tol=12,neutral=False,er=7,holefrac=.2)) if set_ in WHITE else dict(er=7)
    if set_=='cat04' and pose.startswith('sit'): box=(max(0,box[0]-30),box[1],min(a.shape[1],box[2]+30),box[3])
    im=MT.cut(a.astype(np.float32),box,maxh=maxh,**o)
    if im is not None and set_=='cat04' and pose.startswith('sit'):
        import fix_sit; im=fix_sit.clean_sit(im)
    if im is None: print('FAIL',set_,pose); return
    if not (pose.startswith('sit') or pose.startswith('eat')): im=unshadow(im,set_ in WHITE)
    if set_=='chef':   # drop the sheet's direction label pills (separate dark-brown blobs)
        A_=np.array(im); lab_,n_=ndimage.label(A_[...,3]>40)
        if n_>1:
            for i_,sl in enumerate(ndimage.find_objects(lab_)):
                reg=lab_[sl]==i_+1; col=A_[sl][reg][:,:3].astype(int)
                hh=sl[0].stop-sl[0].start; ww=sl[1].stop-sl[1].start
                brown=((col[:,0]<110)&(col[:,1]<80)).mean()>.45
                if brown and ww>1.8*hh: A_[sl][...,3][reg]=0
            m_=A_[...,3]>24; ys_,xs_=np.nonzero(m_); A_=A_[ys_.min():ys_.max()+1,xs_.min():xs_.max()+1]; im=Image.fromarray(A_)
    m=MT.feet(im); m['s']=round(target/m['h'],4); m['legY']=int(m['h']*.84)
    # anchor x on the upper body (head + torso) instead of the feet: walk frames no longer swing sideways
    _A=np.array(im)[...,3]>128; _h=_A.shape[0]; _ys,_xs=np.nonzero(_A[:int(_h*.6)])
    if len(_xs): m['ax']=round(float(_xs.mean()),1)
    if tray:
        t=tray_anchor(im)
        if t: m['tray']=t
    m['src']=enc(im); OUT.setdefault(set_,{})[pose]=m; PREV.append((set_+' '+pose,im)); IMG[(set_,pose)]=im
def idle8(set_,path,bands,order=DIR8_A,x0=0,x1=None):
    a=C.load(path); x1=x1 or a.shape[1]; boxes=[]
    for (y0,y1) in bands: boxes+=segs(a,y0,y1,x0,x1,4)
    for d,b in zip(order,boxes): put(set_,f'idle_{d}',a,b)
def row(set_,path,y0,y1,poses,x0=0,x1=None,target=150.0,tray=False):
    a=C.load(path); x1=x1 or a.shape[1]
    for p,b in zip(poses,segs(a,y0,y1,x0,x1,len(poses))): put(set_,p,a,b,target=target,tray=tray)
WR=['walk%d_270'%i for i in range(1,5)]
SIT=['sit_eat_seat%d'%i for i in range(1,5)]
# ---- player (user-attached sheets) ----
a=C.load(W+'P_idle2.png')
bx=segs(a,30,428,0,1536,4)+segs(a,500,898,0,1536,4)
for d,b in zip([0,315,270,225,180,135,90,45],bx): put('chef',f'idle_{d}',a,b)
for nm,pre,tray in [('P_walk.png','walk',False),('P_carry.png','cwalk',True)]:
    a=C.load(W+nm)
    for (y0,y1),(dl,dr) in zip([(22,252),(268,500),(508,738),(744,975)],[(0,180),(90,270),(45,315),(135,225)]):
        for d,(xa,xb) in [(dl,(0,768)),(dr,(768,1536))]:
            bs=segs(a,y0,y1,xa,xb,4)
            if d in (135,225): bs[0]=bs[2]     # frame 1 of the back-diagonal rows has its cap tip hidden under the sheet's label
            for f,b in enumerate(bs): put('chef',f'{pre}{f+1}_{d}',a,b,tray=tray)
# ---- cashier (016 + 002) ----
idle8('cashier',kit('016'),[(58,452),(500,885)]); row('cashier',kit('002'),86,600,WR)
# ---- runner / waiter (033 + 038) ----
idle8('waiter',kit('033'),[(62,509),(558,1020)]); row('waiter',kit('038'),276,1020,WR)
# ---- cleaner (080 + 066) ----
idle8('cleaner',kit('080'),[(58,451),(500,885)]); row('cleaner',kit('066'),86,600,WR)
# ---- customers ----
for set_,i,w,s,ib,sb in [('cat01','005','051','021',[(59,451),(499,885)],(510,781)),
                         ('cat02','011','024','028',[(113,460),(508,887)],(117,578)),
                         ('cat03','072','052','027',[(116,469),(517,887)],(117,578)),
                         ('cat04','064','040','001',[(118,470),(519,887)],(117,578))]:
    idle8(set_,kit(i),ib)
    row(set_,kit(w),{'051':262,'024':284,'052':290,'040':289}[w],887,WR)
    if set_!='cat01': row(set_,kit(s),sb[0],sb[1],SIT,target=125)
# cat01: approved sitting + eating (upper body only) frames
a=C.load(W+'cat01_sit.png')
for f,(xa,xb) in enumerate([(12,384),(394,764),(774,1144),(1154,1526)]):
    put('cat01','sit%d'%(f+1),a,(xa,96,xb,412),target=125)
    put('cat01','eat%d'%(f+1),a,(xa,512,xb,772),target=100)
# ---- VIPs ----
idle8('vip01',kit('049'),[(118,470),(519,887)]); row('vip01',kit('043'),114,498,WR); row('vip01',kit('043'),595,887,SIT,x1=1290,target=125)
idle8('vip02',kit('059'),[(117,480),(529,887)]); row('vip02',kit('074'),114,485,WR); row('vip02',kit('074'),595,887,SIT,x1=1290,target=125)
# ---- manager ----
idle8('manager',kit('006'),[(119,470),(520,887)]); row('manager',kit('039'),114,485,WR)
row('manager',kit('039'),585,887,['tablet%d'%i for i in range(1,5)],x1=1290)
# ---- consistent scale: every pose group of a character shares one scale, matched by face width (band 30-45% of
#      the height), and every character's idle face width is matched to the same target -> same size walking, queuing, eating
def facew(im):
    A=np.array(im)[...,3]>128; h=A.shape[0]; ws=[]
    for y in range(int(h*.30),int(h*.45)):
        xs=np.nonzero(A[y])[0]
        if len(xs): ws.append(xs.max()-xs.min())
    return float(np.median(ws)) if ws else A.shape[1]
def grp(p): return 'idle' if p.startswith('idle') else 'cwalk' if p.startswith('cwalk') else 'walk' if p.startswith('walk') else 'sit' if p.startswith('sit') else 'eat' if p.startswith('eat') else 'tablet' if p.startswith('tablet') else p
# across characters: same idle height (all wear a hat/cap/crown, so whole-sprite height is a fair yardstick);
# inside one character: every pose group matched to its idle by face width
# across characters: same HEAD size (row width at 46% height of the front idle = cheeks, below hats/crowns, above arms);
# inside one character: every pose group matched to its idle by face width
def cheek(im):
    A=np.array(im)[...,3]>128; h=A.shape[0]; ws=[]
    for y in range(int(h*.42),int(h*.50)):
        xs=np.nonzero(A[y])[0]
        if len(xs): ws.append(xs.max()-xs.min())
    return float(np.median(ws))
ref={k:cheek(IMG[(k,'idle_0')])/IMG[(k,'idle_0')].height for k in OUT}
CH_T=float(np.median([cheek(IMG[(k,'idle_0')]) for k in OUT if k.startswith('cat')]))
TGT=None
for set_,poses in OUT.items():
    gs={}
    for p in poses: gs.setdefault(grp(p),[]).append(p)
    c0=cheek(IMG[(set_,'idle_0')]); h0=IMG[(set_,'idle_0')].height
    s_idle=None
    fw={g:float(np.median([facew(IMG[(set_,p)]) for p in ps])) for g,ps in gs.items()}
    # target: a customer's idle (median cat) is 150 units tall; everyone's cheeks match that cat's cheeks
    s_idle=(150.0/np.median([IMG[(k,'idle_0')].height for k in OUT if k.startswith('cat')]))*CH_T/c0
    s_idle*={'cat04':1.12,'vip02':1.04}.get(set_,1.0)
    hI=float(np.median([IMG[(set_,p)].height for p in gs['idle']]))
    for g,ps in gs.items():
        if g in ('walk','cwalk'): sc=s_idle*hI/float(np.median([IMG[(set_,p)].height for p in ps]))*.97
        else: sc=s_idle*fw['idle']/fw[g]
        for p in ps: OUT[set_][p]['s']=round(float(sc),4)
    print(set_,'idle h',round(h0*s_idle),{g:round(s_idle*fw['idle']/fw[g],3) for g in fw})
# ---- walk cycles: lock the head in place across the frames of one direction (no bobbing / sideways shake).
#      ay is moved so that (feet - head top) is the median of the cycle; ax follows the head's centre.
import re as _re
for set_,poses in OUT.items():
    cyc={}
    for p in poses:
        m_=_re.match(r'(c?walk)(\d)_(\d+)$',p)
        if m_: cyc.setdefault((m_.group(1),m_.group(3)),[]).append(p)
    for key,ps in cyc.items():
        tops={}; heads={}
        for p in ps:
            A_=np.array(IMG[(set_,p)])[...,3]>128; ys_=np.nonzero(A_.any(1))[0]; t0=int(ys_.min()); tops[p]=t0
            hb=A_[t0:t0+int(A_.shape[0]*.35)]; xs_=np.nonzero(hb.any(0))[0]; heads[p]=(xs_.min()+xs_.max())/2
        med=float(np.median([OUT[set_][p]['ay']-tops[p] for p in ps]))
        for p in ps: OUT[set_][p]['ax']=round(float(heads[p]),1)   # feet stay on the ground (ay = lowest foot); only the sideways shake is removed
js='/* 16_more_sprites.js — Meow Sakura character art (unchanged from Meow Burger) cut from the approved sheets. AUTO-GENERATED by tools/build_chars.py */\nconst MORE_SPRITES='+json.dumps(OUT,separators=(',',':'))+';\n'
open('/home/claude/burger/src/16_more_sprites.js','w').write(js); print(len(js)//1024,'KB',{k:len(v) for k,v in OUT.items()})
# preview
for set_ in OUT:
    ims=[(n,im) for n,im in PREV if n.startswith(set_+' ')]
    Wd=sum(im.width for _,im in ims)+8*len(ims); Hd=max(im.height for _,im in ims)
    sh=Image.new('RGBA',(Wd,Hd+14),(90,160,90,255)); x=0
    from PIL import ImageDraw; d=ImageDraw.Draw(sh)
    for n,im in ims: sh.alpha_composite(im,(x,Hd-im.height)); d.text((x,Hd+1),n.split(' ')[1],fill='white'); x+=im.width+8
    sh.convert('RGB').save(f'/home/claude/work/dbg/prev_{set_}.jpg',quality=85)
