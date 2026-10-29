# Meow Sakura / Meow Burger: cut character poses from the approved sheets (kit v4 + user-attached player sheets).
import numpy as np, json, io, base64, sys, os
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from collections import deque
KIT='/home/claude/src/burgerkit/'
def load(path): return np.array(Image.open(path).convert('RGB')).astype(np.int32)
def bglike(a):
    mn=a.min(2); mx=a.max(2)
    b=np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]); bgc=np.median(b,axis=0)
    return ((mn>225)&(mx-mn<30))|(np.abs(a-bgc).sum(2)<40)
def blobs(a,minh=60):
    fg=~bglike(a)
    fg=ndimage.binary_opening(fg,np.ones((5,5)))       # drop thin panel borders / text strokes
    fg=ndimage.binary_dilation(fg,np.ones((7,7)))
    lab,n=ndimage.label(fg); out=[]
    for i,sl in enumerate(ndimage.find_objects(lab)):
        ys,xs=sl; h=ys.stop-ys.start; w=xs.stop-xs.start
        if h<minh or w<25: continue
        if w>2.0*h: continue                              # label bars
        out.append((xs.start,ys.start,xs.stop,ys.stop))
    # rows
    out.sort(key=lambda b:((b[1]+b[3])/2))
    rows=[]
    for b in out:
        cy=(b[1]+b[3])/2
        if rows and abs(rows[-1][0]-cy)<0.35*(b[3]-b[1]): rows[-1][1].append(b)
        else: rows.append([cy,[b]])
    return [sorted(r,key=lambda b:b[0]) for _,r in rows]
def flood_bg(a,T=26):
    h,w,_=a.shape; bg=np.zeros((h,w),bool); q=deque()
    for x in range(w):
        for y in (0,h-1): bg[y,x]=True; q.append((y,x))
    for y in range(h):
        for x in (0,w-1):
            if not bg[y,x]: bg[y,x]=True; q.append((y,x))
    L=bglike(a)
    while q:
        y,x=q.popleft(); c=a[y,x]
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not bg[ny,nx]:
                if np.abs(a[ny,nx]-c).sum()<T or L[ny,nx] and np.abs(a[ny,nx]-c).sum()<95: bg[ny,nx]=True; q.append((ny,nx))
    return bg
def strip_shadow(rgba):
    a=rgba.astype(np.int32); h,w,_=a.shape; al=a[...,3]; rgb=a[...,:3]; lum=rgb.mean(2); sat=rgb.max(2)-rgb.min(2)
    y0=int(h*.72); pas=np.zeros((h,w),bool)
    pas[y0:]=((lum[y0:]>150)&(sat[y0:]<70))|(al[y0:]<160)
    ext=np.zeros((h,w),bool); q=deque()
    for y in range(y0,h):
        for x in range(w):
            if (al[y,x]<40 or y==h-1 or x in (0,w-1)) and pas[y,x] and not ext[y,x]: ext[y,x]=True; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if y0<=ny<h and 0<=nx<w and pas[ny,nx] and not ext[ny,nx]: ext[ny,nx]=True; q.append((ny,nx))
    a[...,3]=np.where(ext,0,al); return a.astype(np.uint8)
def cut(a,box,pad=8,maxh=200):
    x0,y0,x1,y1=box; H,W,_=a.shape
    x0=max(0,x0-pad);y0=max(0,y0-pad);x1=min(W,x1+pad);y1=min(H,y1+pad)
    sub=a[y0:y1,x0:x1]; bg=flood_bg(sub)
    m=~bg
    lab,n=ndimage.label(m)
    if n>1:   # keep the big piece (+ pieces that are at least 4% of it, e.g. a detached tail tip)
        sz=ndimage.sum(m,lab,range(1,n+1)); big=sz.max(); keep=[i+1 for i,s in enumerate(sz) if s>=.04*big]; m=np.isin(lab,keep)
    al=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))
    rgba=np.dstack([sub,np.array(al)]).astype(np.uint8)
    rgba=strip_shadow(rgba)
    ys,xs=np.nonzero(rgba[...,3]>40); rgba=rgba[ys.min():ys.max()+1,xs.min():xs.max()+1]
    im=Image.fromarray(rgba,'RGBA')
    if im.height>maxh: im=im.resize((round(im.width*maxh/im.height),maxh),Image.LANCZOS)
    A=np.array(im); h,w=A.shape[:2]; ys,xs=np.nonzero(A[...,3]>128); yb=ys.max(); sel=ys>yb-max(4,int(h*.07))
    return im,{'w':w,'h':h,'ax':round(float(xs[sel].mean()),1),'ay':int(yb)+1}
def debug(path,out):
    a=load(path); R=blobs(a); im=Image.fromarray(a.astype(np.uint8)); d=ImageDraw.Draw(im)
    for r,row in enumerate(R):
        for c,b in enumerate(row): d.rectangle(b,outline=(255,0,0),width=2); d.text((b[0]+3,b[1]+3),f'{r},{c}',fill=(0,0,255))
    im.thumbnail((1100,1100)); im.save(out); return R
if __name__=='__main__':
    for p in sys.argv[1:]:
        R=debug(p,'/home/claude/work/dbg/'+os.path.basename(p)[:3]+'.jpg'); print(os.path.basename(p)[:3],[len(r) for r in R])

def label_cells(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    br=(r>70)&(r<150)&(g>40)&(g<105)&(b>20)&(b<85)&(r>g+15)&(g>b)
    br=ndimage.binary_closing(br,np.ones((5,9)))
    lab,n=ndimage.label(br); bars=[]
    for sl in ndimage.find_objects(lab):
        ys,xs=sl; h=ys.stop-ys.start; w=xs.stop-xs.start
        if 12<=h<=70 and w>=2.0*h and w>60: bars.append((xs.start,ys.start,xs.stop,ys.stop))
    H,W=a.shape[:2]; cells=[]
    for (x0,y0,x1,y1) in bars:
        below=[b[1] for b in bars if b[1]>y1+5 and min(b[2],x1)-max(b[0],x0)>0.3*(x1-x0)]
        yb=min(below) if below else H
        if yb-y1>60: cells.append((x0,y1+2,x1,yb-3))
    cells.sort(key=lambda c:(round(c[1]/40),c[0]))
    return cells
def debug_cells(path,out):
    a=load(path); C=label_cells(a); im=Image.fromarray(a.astype(np.uint8)); d=ImageDraw.Draw(im)
    for i,c in enumerate(C): d.rectangle(c,outline=(255,0,0),width=3); d.text((c[0]+5,c[1]+5),str(i),fill=(0,0,255))
    im.thumbnail((900,900)); im.save(out); return C
def cut_cell(a,cell,maxh=200):
    x0,y0,x1,y1=cell; sub=a[y0:y1,x0:x1]
    bg=flood_bg(sub); m=~bg
    m=ndimage.binary_opening(m,np.ones((3,3)))
    lab,n=ndimage.label(m)
    if n==0: return None
    sz=ndimage.sum(m,lab,range(1,n+1)); big=sz.max(); keep=[]
    for i,(s_,sl) in enumerate(zip(sz,ndimage.find_objects(lab))):
        hh=sl[0].stop-sl[0].start; ww=sl[1].stop-sl[1].start
        if s_==big or (s_>=.06*big and not ww>2.0*hh): keep.append(i+1)
    # drop pieces touching the cell border (panel frame remnants) unless it is the big one
    m=np.isin(lab,keep)
    fh=ndimage.binary_fill_holes(m)&~m; hl,hn=ndimage.label(fh)
    if hn:
        hs=ndimage.sum(fh,hl,range(1,hn+1)); tot=m.sum()
        m=m|np.isin(hl,[i+1 for i,v in enumerate(hs) if v<0.05*tot])
    al=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))
    rgba=np.dstack([sub,np.array(al)]).astype(np.uint8); rgba=strip_shadow(rgba)
    ys,xs=np.nonzero(rgba[...,3]>40); rgba=rgba[ys.min():ys.max()+1,xs.min():xs.max()+1]
    im=Image.fromarray(rgba,'RGBA')
    if im.height>maxh: im=im.resize((round(im.width*maxh/im.height),maxh),Image.LANCZOS)
    A=np.array(im); h,w=A.shape[:2]; ys,xs=np.nonzero(A[...,3]>128); yb=ys.max(); sel=ys>yb-max(4,int(h*.07))
    return im,{'w':w,'h':h,'ax':round(float(xs[sel].mean()),1),'ay':int(yb)+1}

def panel_cells(a,minw=80,minh=80):
    wh=(a.min(2)>243)
    wh=ndimage.binary_opening(wh,np.ones((3,3)))
    lab,n=ndimage.label(wh); cells=[]
    for i,sl in enumerate(ndimage.find_objects(lab)):
        ys,xs=sl; h=ys.stop-ys.start; w=xs.stop-xs.start
        area=(lab[sl]==i+1).sum()
        if w>=minw and h>=minh and area>0.25*w*h: cells.append((xs.start,ys.start,xs.stop,ys.stop))
    # drop cells containing other cells
    cells=[c for c in cells if not any(o!=c and o[0]>=c[0] and o[1]>=c[1] and o[2]<=c[2] and o[3]<=c[3] for o in cells)]
    cells.sort(key=lambda c:(round(c[1]/60),c[0]))
    return cells
def debug_panels(path,out):
    a=load(path); C=panel_cells(a); im=Image.fromarray(a.astype(np.uint8)); d=ImageDraw.Draw(im)
    for i,c in enumerate(C): d.rectangle(c,outline=(255,0,0),width=3); d.text((c[0]+5,c[1]+5),str(i),fill=(0,0,255))
    im.thumbnail((900,900)); im.save(out); return C

ER=9
def flood_bg(a,T=None):
    P=bglike(a)
    Pe=ndimage.binary_erosion(P,np.ones((ER,ER)),border_value=1)
    lab,n=ndimage.label(Pe)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    core=np.isin(lab,list(edge))
    return ndimage.binary_dilation(core,np.ones((3,3)),iterations=ER//2+1)&P
