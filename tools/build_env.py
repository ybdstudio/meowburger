# Meow Sakura (from the Meow Burger pipeline): environment / station / prop art cut from the approved P1 scene and kit sheets -> src/18_env_art.js
import sys,glob,io,base64,json,numpy as np
sys.path.insert(0,'/home/claude/burger/tools'); import matte as M
from PIL import Image, ImageDraw
from scipy import ndimage
E='/home/claude/work/env/'
K=lambda n: glob.glob('/home/claude/src/burgerkit/*/'+n+'_*.png')[0]
CKC=E+'chicken19_clean.png'; AT=E+'atlas.png'; PU=E+'pickup.png'; CK=E+'chicken19.png'; P1=E+'p1_full.png'; P1E=E+'p1_empty.png'
GRASS=(139,197,74)
L={
 'chicken':(CKC,(40,58,670,570),dict(multi=True,tol=40,keep=.5)),
 'burger':(AT,(990,22,1195,298),dict(neutral=False,tol=30,er=5)),
 'burger2':(AT,(1196,30,1316,208),dict(neutral=False,tol=30,er=5)),
 'salad':(AT,(8,368,214,608),dict(neutral=False,tol=30,er=5)),
 'drink':(AT,(535,386,705,580),dict(neutral=False,tol=30,er=5)),
 'fryer':(CK,(565,620,760,788),{}),
 'shelf0':(K('060'),(15,410,135,592),{}),'shelf1':(K('060'),(150,410,272,592),{}),
 'shelf2':(K('060'),(285,410,410,592),{}),'shelf3':(K('060'),(423,410,548,592),{}),
 'fridge':(K('060'),(570,415,690,592),{}),
 'ctrL':(PU,(25,520,255,745),{}),'ctrC':(PU,(258,520,605,730),{}),'ctrR':(PU,(610,500,790,705),{}),
 'trayR':(PU,(930,548,1036,632),{}),'trayG':(PU,(1150,548,1266,632),{}),
 'table':(P1,(300,855,522,1088),dict(multi=True,tol=34,keep=.2)),
 'bin':(AT,(640,720,705,822),{}),'plant':(AT,(800,712,880,820),{}),'planter':(AT,(255,862,342,965),{}),
 'signstand':(AT,(875,845,935,950),{}),'boxes':(AT,(795,860,875,955),{}),'qpost':(AT,(930,855,1040,960),{}),
 'menuC':(AT,(900,710,985,815),{}),'menuB':(AT,(995,710,1078,815),{}),'menuS':(AT,(1088,710,1170,815),{}),
 'register':(PU,(28,848,145,960),{}),
 'ckbox':(CK,(515,845,645,962),{}),'carrytray':(CK,(690,872,822,968),{}),
}
OUT={}; prev=[]
def enc(im):
    b=io.BytesIO(); im.save(b,'WEBP',quality=90,method=6,alpha_quality=95); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
for k,(src,box,o) in L.items():
    im=M.cut(src,box,**o)
    if k=='table':   # remove the painted floor shadow left between the legs
        A=np.array(im).astype(int); h=A.shape[0]; r,g,b,a=A[...,0],A[...,1],A[...,2],A[...,3]
        sh=(r>170)&(g>110)&(g<200)&(b>50)&(b<160)&(r-b>60)&(np.arange(h)[:,None]>h*.62)
        A[...,3]=np.where(sh,0,a); im=Image.fromarray(A.astype(np.uint8),'RGBA')
    if k=='chicken':
        # alpha from the original sheet (clean outline), colours from the repainted copy; clutter right of the stall dropped
        import importlib.util
        orig=M.cut(CK,(40,58,670,570),**dict(multi=True,tol=40,keep=.5))
        Aa=np.array(orig).astype(int); Ac=np.array(Image.open(CKC).convert('RGB').crop((40,58,670,570))).astype(int)
        ys,xs=np.nonzero(np.array(orig)[...,3]>24)
        # M.cut crops to content: recover offset by re-running the bbox on the source crop size
        full=np.zeros((512,630,4),int)
        oy0,ox0=0,10
        h,w=Aa.shape[:2]; full[oy0:oy0+h,ox0:ox0+w]=Aa
        yy,xx=np.mgrid[:512,:630]; X=xx+40; Y=yy+58
        pm=Image.new('L',(630,512),0); ImageDraw.Draw(pm).polygon([(x-40,y-58) for x,y in [(464,0),(820,0),(820,560),(488,560),(488,318),(480,306),(480,214),(464,200)]],fill=255)
        clutter=np.array(pm)>0
        alpha=np.where(clutter,0,full[...,3])
        redm=(Ac[...,0]>170)&(Ac[...,1]<120)
        wallc=(Ac[...,0]>170)&(Ac[...,1]>120)&(Ac[...,2]>80)&(Ac.min(2)<228)&((Ac[...,0]-Ac[...,2])>25)
        alpha=np.where((xx<275)&(yy<75)&wallc&~redm,0,alpha)
        rgb=np.where((alpha>0)[...,None],Ac,0)
        A=np.dstack([rgb,alpha]).astype(np.uint8)
        m=A[...,3]>40; lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); A[...,3]=np.where(lab==np.argmax(sz)+1,A[...,3],0)
        ys,xs=np.nonzero(A[...,3]>24); A=A[ys.min():ys.max()+1,xs.min():xs.max()+1]
        im=Image.fromarray(A)
    if k=='salad':
        # 5 ingredient trays with clear, separate ingredients; the front tray is replaced by free counter space for ready salads
        im=im.convert('RGBA'); W,H=im.size; dr=ImageDraw.Draw(im); F=lambda x,y:(x*W,y*H)
        dr.polygon([F(.36,.74),F(.49,.655),F(.62,.735),F(.49,.83)],fill=(246,244,236,255))
        dr.line([F(.36,.74),F(.49,.83),F(.62,.735)],fill=(214,208,196,255),width=2)
        trays=[((.364,.533),'lettuce'),((.25,.61),'tomato'),((.477,.59),'corn'),((.364,.678),'carrot'),((.60,.656),'cucumber')]
        col={'lettuce':((116,196,72),(70,140,44)),'tomato':((232,64,52),(160,30,26)),'corn':((250,206,52),(196,146,20)),'carrot':((244,138,40),(178,88,20)),'cucumber':((176,222,120),(80,150,60))}
        import random; rnd=random.Random(3)
        for (cx,cy),ing in trays:
            x,y=F(cx,cy); rx,ry=W*.068,H*.036; c,dk=col[ing]
            dr.ellipse([x-rx,y-ry,x+rx,y+ry],fill=dk+(255,))
            for i in range(7):
                ox=rnd.uniform(-.7,.7)*rx; oy=rnd.uniform(-.6,.6)*ry; rr=rx*(.26 if ing!='corn' else .18)
                dr.ellipse([x+ox-rr,y+oy-rr*.8,x+ox+rr,y+oy+rr*.8],fill=c+(255,),outline=dk+(255,))
                dr.ellipse([x+ox-rr*.45,y+oy-rr*.6,x+ox-rr*.05,y+oy-rr*.2],fill=(255,255,255,150))
    if k=='fryer':
        # the front basket becomes a flat steel pass where ready fries are put down
        im=im.convert('RGBA'); W,H=im.size; dr=ImageDraw.Draw(im); F=lambda x,y:(x*W,y*H)
        dr.polygon([F(.385,.535),F(.64,.345),F(.915,.47),F(.63,.675)],fill=(178,184,192,255),outline=(96,100,108,255))
        dr.polygon([F(.43,.535),F(.64,.375),F(.87,.475),F(.63,.645)],fill=(214,219,225,255))
    if k=='drink':
        # erase the cups the sheet painted on the ledge (new drinks appear there in game), then widen to true 2:1 iso
        A=np.array(im).astype(int); h,w=A.shape[:2]; yy,xx=np.mgrid[:h,:w]; r,g,b=A[...,0],A[...,1],A[...,2]
        reg=(xx>w*.41)&(xx<w*.70)&(yy>h*.53)&(yy<h*.86)
        cup=reg&(((r-g>45)&(r>120))|((r>170)&(g>150)&(b<150))|((r>200)&(g>200)&(b>200)&(yy<h*.66)))
        cup=ndimage.binary_dilation(cup,np.ones((3,3)))&reg
        dx,dy=int(w*.17),int(w*.085)
        for _ in range(4):
            ys,xs=np.nonzero(cup)
            sy,sx=np.clip(ys-dy,0,h-1),np.clip(xs-dx,0,w-1)
            ok=~cup[sy,sx]; A[ys[ok],xs[ok]]=A[sy[ok],sx[ok]]; cup[ys[ok],xs[ok]]=False
        im=Image.fromarray(A.astype(np.uint8)).resize((int(w*1.22),h),Image.LANCZOS)
    if k.startswith('tree'):  # keep only the canopy+trunk blob nearest the centre
        A=np.array(im); m=A[...,3]>40; lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); A[...,3]=np.where(lab==np.argmax(sz)+1,A[...,3],0); im=Image.fromarray(A)
    if k in ('burger','burger2','salad','drink','fryer','shelf0','shelf1','shelf2','shelf3','bin','register'):
        A=np.array(im.convert('RGBA')); pad=4; B=np.zeros((A.shape[0]+2*pad,A.shape[1]+2*pad,4),np.uint8); B[pad:-pad,pad:-pad]=A
        m=B[...,3]>110; ring=ndimage.binary_dilation(m,iterations=2)&~ndimage.binary_erosion(m,iterations=1)
        B[ring]=(90,52,36,255); B[ndimage.binary_erosion(m,iterations=1)]=np.pad(A,((pad,pad),(pad,pad),(0,0)))[ndimage.binary_erosion(m,iterations=1)]
        im=Image.fromarray(B)
    Aa=np.array(im)[...,3]>128; ys,xs=np.nonzero(Aa); yb=ys.max(); sel=ys>=yb-max(2,int(im.height*.02))
    OUT[k]={'src':enc(im),'w':im.width,'h':im.height,'tip':round(float(xs[sel].mean())/im.width,3)}; prev.append((k,im)); print(k,im.size)
# front chair layer of the table: red / dark chair pixels in the lower-right box (drawn over a seated customer)
A=np.array(prev[[n for n,_ in prev].index('table')][1]).astype(int); h,w=A.shape[:2]
yy,xx=np.mgrid[:h,:w]; r,g,b,a=A[...,0],A[...,1],A[...,2],A[...,3]
cream=(r>200)&(g>160)&(b>100)&(r-b<110)
edge=(r>180)&(g>110)&(b<120)&(r-g<90)&(g-b>30)
reg=(xx>=w*.49)&(yy>=h*.42)&~((xx<w*.80)&(yy<h*.62)&(cream|edge))
ch=reg&(a>0)&~cream
Fm=A.copy(); Fm[...,3]=np.where(ch,a,0); fc=Image.fromarray(Fm.astype(np.uint8),'RGBA')
OUT['table_front']={'src':enc(fc),'w':w,'h':h}; prev.append(('table_front',fc))
js='/* 18_env_art.js — Meow Sakura environment, station and prop art cut from the approved P1 scene and kit sheets. AUTO-GENERATED by tools/build_env.py */\nconst ENV_ART='+json.dumps(OUT,separators=(',',':'))+';\n'
open('/home/claude/burger/src/18_env_art.js','w').write(js); print(len(js)//1024,'KB')
H=240; row=[]
for k,im in prev:
    s=min(1,H/im.height); row.append(im.resize((max(1,int(im.width*s)),max(1,int(im.height*s)))))
W=sum(i.width+6 for i in row); S=Image.new('RGBA',(W,H),(80,150,80,255)); x=0
for i in row: S.alpha_composite(i,(x,H-i.height)); x+=i.width+6
S.convert('RGB').save('/home/claude/work/env/envall.jpg',quality=85)
