# Meow Sakura matting v2 (from Meow Burger): clean cut-outs from reference sheets.
#  - light mode: background = light/neutral pixels connected to the crop border (flood through an eroded core, so
#    small gaps in the outline do not leak into white fur), interior holes filled.
#  - dark mode: background = near-black pixels connected to the border, then the coloured fringe the dark sheets
#    have around every shape is peeled off until the dark outline is reached.
#  - edge alpha is un-mixed from the background colour (no blur), and edge colours are de-contaminated.
import numpy as np
from PIL import Image
from scipy import ndimage

def load(path): return np.array(Image.open(path).convert('RGB')).astype(np.float32)

def _border_bg(sub):
    b=np.concatenate([sub[:3].reshape(-1,3),sub[-3:].reshape(-1,3),sub[:,:3].reshape(-1,3),sub[:,-3:].reshape(-1,3)])
    return np.median(b,axis=0)

def border_palette(sub,k=8):
    b=np.concatenate([sub[:4].reshape(-1,3),sub[-4:].reshape(-1,3),sub[:,:4].reshape(-1,3),sub[:,-4:].reshape(-1,3)])
    q=(b//12).astype(int); keys,cnt=np.unique(q,axis=0,return_counts=True)
    order=np.argsort(-cnt)[:k]; return [keys[i]*12+6 for i in order if cnt[i]>len(b)*0.01]
def light_bglike(sub,bgc,tol=46,pal=None,neutral=True):
    mn=sub.min(2); mx=sub.max(2); lum=sub.mean(2)
    near=np.abs(sub-bgc).sum(2)<tol
    if pal is not None:
        for c in pal: near|=np.abs(sub-np.array(c,np.float32)).sum(2)<tol
    if not neutral: return near
    nt=(mx-mn<26)&(lum>200)
    return near|nt

def flood_core(P,er):
    Pe=ndimage.binary_erosion(P,np.ones((er,er)),border_value=1)
    lab,n=ndimage.label(Pe)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    core=np.isin(lab,list(edge))
    return ndimage.binary_dilation(core,np.ones((3,3)),iterations=er//2+2)&P

def cut(path_or_arr,box,mode='light',er=7,keep=0.05,maxh=None,maxw=None,tol=46,fill=True,drop_thin=True,bg=None,multi=False,neutral=True,holefrac=0.06):
    A=load(path_or_arr) if isinstance(path_or_arr,str) else path_or_arr
    x0,y0,x1,y1=[int(v) for v in box]; sub=A[y0:y1,x0:x1]
    if mode=='dark':
        bgc=np.array([10,10,10],np.float32)
        P=sub.max(2)<48
        bgm=flood_core(P,3)
        m=~bgm
        # peel the coloured fringe: boundary pixels that are not dark outline get removed, up to 6 passes
        lum=sub.mean(2)
        for _ in range(6):
            er_=ndimage.binary_erosion(m,np.ones((3,3)))
            bnd=m&~er_
            peel=bnd&(lum>105)
            if not peel.any(): break
            m=m&~peel
    else:
        bgc=_border_bg(sub) if bg is None else np.array(bg,np.float32)
        P=light_bglike(sub,bgc,tol,border_palette(sub) if multi else None,neutral)
        bgm=flood_core(P,er)
        m=~bgm
    m=ndimage.binary_opening(m,np.ones((3,3)))
    lab,n=ndimage.label(m)
    if n==0: return None
    sz=ndimage.sum(m,lab,range(1,n+1)); big=sz.max(); ks=[]
    for i,(s,sl) in enumerate(zip(sz,ndimage.find_objects(lab))):
        hh=sl[0].stop-sl[0].start; ww=sl[1].stop-sl[1].start
        thin=drop_thin and (ww>3.0*hh or hh>6*ww) and s<.25*big       # panel borders / label pills / lines
        if s==big or (s>=keep*big and not thin): ks.append(i+1)
    m=np.isin(lab,ks)
    if fill:
        holes=ndimage.binary_fill_holes(m)&~m; hl,hn=ndimage.label(holes)
        if hn:
            hs=ndimage.sum(holes,hl,range(1,hn+1)); tot=m.sum()
            m=m|np.isin(hl,[i+1 for i,v in enumerate(hs) if v<holefrac*tot])
    # alpha: solid inside, un-mixed on a 2 px boundary band
    alpha=m.astype(np.float32)
    inner=ndimage.binary_erosion(m,np.ones((5,5)))
    band=m&~inner
    if mode=='dark':
        a=np.clip(sub.max(2)/90.0,0,1)
    else:
        Lb=bgc.mean(); L=sub.mean(2)
        a=np.clip((Lb-L)/max(30.0,Lb-70.0),0,1)
        sat=sub.max(2)-sub.min(2); a=np.maximum(a,np.clip((sat-(bgc.max()-bgc.min())-8)/60.0,0,1))
    alpha=np.where(band,np.maximum(a,0.0),alpha)
    alpha=np.where(ndimage.binary_erosion(m,np.ones((3,3))),np.maximum(alpha,0.6),alpha)
    # outer 1px soft ring outside the mask
    ring=ndimage.binary_dilation(m,np.ones((3,3)))&~m
    if mode!='dark':
        alpha=np.where(ring,np.clip(a,0,1)*0.85,alpha)
    # de-contaminate colours
    aa=np.clip(alpha,1e-3,1)[...,None]
    col=np.clip((sub-(1-aa)*bgc)/aa,0,255)
    col=np.where((alpha>=0.999)[...,None],sub,col)
    rgba=np.dstack([col,alpha*255]).astype(np.uint8)
    ys,xs=np.nonzero(rgba[...,3]>24)
    if len(ys)==0: return None
    rgba=rgba[ys.min():ys.max()+1,xs.min():xs.max()+1]
    im=Image.fromarray(rgba,'RGBA')
    if maxh and im.height>maxh: im=im.resize((max(1,round(im.width*maxh/im.height)),maxh),Image.LANCZOS)
    if maxw and im.width>maxw: im=im.resize((maxw,max(1,round(im.height*maxw/im.width))),Image.LANCZOS)
    return im

def feet(im):
    A=np.array(im); h,w=A.shape[:2]; ys,xs=np.nonzero(A[...,3]>128); yb=ys.max(); sel=ys>yb-max(4,int(h*.07))
    return {'w':w,'h':h,'ax':round(float(xs[sel].mean()),1),'ay':int(yb)+1}
