# Meow Sakura: make the cat in the TikTok UI art (loading, icon, popups) look like the player cat.
# The kit art shows a grey-and-white cat with a burger logo on its cap; the player is an orange-and-cream cat with a
# white bear-face logo on its red cap. This recolours the grey fur to the player's orange (hue shift that keeps the
# shading; white fur stays white / turns cream at the edges) and replaces the cap logo with the player's bear face.
# Used by tools/sakura_art.py. Regions are hand-placed per kit image (pixel coordinates of the kit files).
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from matplotlib.colors import rgb_to_hsv,hsv_to_rgb
import cv2
CAT={  # kit file -> fur polygons, cap-logo search box
 'icon_512_jp.png':dict(poly=[[(165,380),(330,250),(820,170),(1000,160),(1060,250),(1100,520),(1200,560),(1260,640),(1250,800),(1150,860),(700,900),(260,880),(250,820),(240,700),(170,620)],
                              [(60,1050),(200,980),(230,1250),(70,1300)]],logo=(500,200,760,380)),
 'pop_share_art_jp.jpg':dict(poly=[[(150,330),(330,160),(800,120),(1000,105),(1095,125),(1100,300),(1150,480),(1310,560),(1320,700),(1150,780),(800,820),(300,780),(200,700),(150,520)],
                                   [(180,850),(330,860),(330,1100),(180,1120),(150,950)]],logo=(520,120,820,320),it=4,t=.7),
 'loading_bg_jp.jpg':dict(poly=[[(200,1040),(300,960),(650,930),(800,940),(820,1100),(900,1130),(960,1250),(820,1330),(560,1360),(330,1340),(240,1260),(200,1150)]],logo=(400,900,620,1060),it=4,t=.7),
 'pop_home_art_jp.jpg':dict(poly=[[(1030,300),(1130,270),(1200,205),(1400,205),(1420,250),(1425,350),(1490,370),(1500,460),(1400,490),(1230,470),(1100,480),(1050,430)]],logo=(1170,190,1290,300),it=3),
 'pop_revisit_profile_jp.jpg':dict(poly=[[(370,760),(400,700),(470,650),(560,640),(620,640),(690,650),(720,720),(730,820),(700,880),(560,900),(430,920),(380,880)]],logo=(440,650,560,740),it=3),
}
ORANGE_H=0.094
def smooth(x,a,b): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
RAMP=np.array([[.30,(150,70,24)],[.62,(226,124,42)],[.84,(250,166,72)],[.97,(255,196,118)],[1.0,(255,214,150)]],dtype=object)
def ramp(v):
    xs=np.array([r[0] for r in RAMP],float); cs=np.array([r[1] for r in RAMP],float)
    return np.stack([np.interp(v,xs,cs[:,k]) for k in range(3)],-1)/255
def cat_mask(A,poly,it=6,t=.6):
    """the cat's own areas: regions between the dark outlines that lie mostly inside the hand-placed polygon"""
    from scipy import ndimage
    v=A[...,:3].max(2)/255; dark=ndimage.binary_dilation(v<t,iterations=it)   # thick enough to close gaps in the outline
    lab,n=ndimage.label(~dark); P=poly>.5
    area=ndimage.sum(np.ones_like(P),lab,range(1,n+1)); inside=ndimage.sum(P,lab,range(1,n+1))
    keep=np.zeros(n+1,bool); keep[1:]=(inside/np.maximum(area,1)>.3)
    m=keep[lab]&P; m=ndimage.binary_dilation(m,iterations=it+2)&ndimage.binary_dilation(P,iterations=3)
    return m.astype(float)
def recolor_fur(A,mask):
    rgb=A[...,:3].astype(float)/255; hsv=rgb_to_hsv(rgb); h,s,v=hsv[...,0],hsv[...,1],hsv[...,2]
    hdeg=h*360
    # the kit's grey fur is warm in the light (hue 12-50) and cool / pinkish in the shade; pinks with more colour
    # (inner ears, blush, nose, tongue) and white fur are left alone
    pinkz=(hdeg>=330)|(hdeg<12); coolz=(hdeg>=285)&(hdeg<330); warmz=(hdeg>=12)&(hdeg<52)
    w=(pinkz*smooth(s,.06,.10)*(1-smooth(s,.22,.28))+coolz*smooth(s,.06,.10)*(1-smooth(s,.32,.40))
       +(s<.08)*smooth(v,.40,.46)*(1-smooth(v,.74,.82))   # neutral grey (ear backs)
       +warmz*smooth(s,.08+.10*smooth(v,.86,.97),.14+.10*smooth(v,.86,.97))*(1-smooth(s,.55,.65)))*smooth(v,.40,.50)   # pale warm shading on white fur stays white
    # soft pink blush fades through fur-like tones: keep a ring around strong pinks out of the recolour
    from scipy import ndimage
    pink=((hdeg>=330)|(hdeg<12))&(s>.25)&(v>.6)
    near=ndimage.binary_dilation(pink,iterations=max(3,int(A.shape[1]/160)))
    w=w*(1-near)
    w=np.clip(w*mask,0,1)
    w=np.array(Image.fromarray((w*255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)/255
    # grey fur -> the player's orange: the darker the grey, the deeper the orange (keeps the painted shading)
    vn=np.clip((v-.55)/(.93-.55),0,1)*.37+.6   # map the kit's grey range onto the ramp's orange range
    new=ramp(vn)
    out=rgb*(1-w[...,None])+new*w[...,None]
    return (out*255).round().astype(np.uint8), w
def bear(d,cx,cy,S,fg=(255,251,246),red=(214,40,46)):
    """the player's cap logo: white bear head with red eyes and mouth (S = head width)"""
    for ex in (-1,1): d.ellipse([cx+ex*.36*S-.2*S,cy-.42*S-.2*S,cx+ex*.36*S+.2*S,cy-.42*S+.2*S],fill=fg)
    d.ellipse([cx-.5*S,cy-.43*S,cx+.5*S,cy+.43*S],fill=fg)
    for ex in (-1,1): d.ellipse([cx+ex*.18*S-.055*S,cy-.06*S-.065*S,cx+ex*.18*S+.055*S,cy-.06*S+.065*S],fill=red)
    d.ellipse([cx-.05*S,cy+.06*S,cx+.05*S,cy+.12*S],fill=red)
    lw=max(1,int(S*.035)); d.arc([cx-.15*S,cy+.06*S,cx,cy+.22*S],20,160,fill=red,width=lw); d.arc([cx,cy+.06*S,cx+.15*S,cy+.22*S],20,160,fill=red,width=lw)
def replace_logo(A,box):
    x0,y0,x1,y1=box; sub=A[y0:y1,x0:x1,:3].astype(int); r,g,b=sub[...,0],sub[...,1],sub[...,2]
    yel=(r>200)&(g>140)&(b<130)&(r-b>90)&(g-b>40)
    from scipy import ndimage
    lab,n=ndimage.label(ndimage.binary_closing(yel,iterations=2))
    if not n: return A
    sz=ndimage.sum(yel,lab,range(1,n+1)); big=sz.max()
    m=np.isin(lab,[i+1 for i,z in enumerate(sz) if z>=.08*big])   # every bar of the burger logo
    # the logo is a stack of yellow bars with dark lines between them: fill its hull
    ys,xs=np.nonzero(m); pts=np.stack([xs,ys],1).astype(np.int32); hull=cv2.convexHull(pts)
    full=np.zeros(A.shape[:2],np.uint8); cv2.fillConvexPoly(full,hull+np.array([x0,y0]),255)
    cx,cy=xs.mean()+x0,ys.mean()+y0; W_=xs.max()-xs.min(); H_=ys.max()-ys.min()
    # tilt of the logo (bars run along its long axis)
    c=np.cov(np.stack([xs,ys]).astype(float)); ev,evec=np.linalg.eigh(c); ang=np.degrees(np.arctan2(evec[1,1],evec[0,1]))
    if ang>90: ang-=180
    if ang<-90: ang+=180
    full=cv2.dilate(full,np.ones((5,5),np.uint8),iterations=max(2,int(H_*.08)))
    # inpaint only on the cap (red cloth), never into the background around it
    R=A[...,:3].astype(int); red=((R[...,0]>150)&(R[...,1]<90)&(R[...,2]<100)).astype(np.uint8)*255
    red=cv2.morphologyEx(red,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)); red=cv2.dilate(red,np.ones((3,3),np.uint8))
    full=cv2.bitwise_and(full,cv2.bitwise_or(red,cv2.dilate(cv2.fillConvexPoly(np.zeros_like(full),hull+np.array([x0,y0]),255),np.ones((3,3),np.uint8),iterations=2)))
    # fill from the surrounding cap red only (normalised blur), so no outline or background colour is pulled in
    K=((red>0)&(full==0)).astype(np.float32); F=A[...,:3].astype(np.float32)*K[...,None]; sig=max(4.,H_*.35)
    num=cv2.GaussianBlur(F,(0,0),sig); den=cv2.GaussianBlur(K,(0,0),sig)[...,None]
    fill=np.clip(num/np.maximum(den,1e-4),0,255); mm=(cv2.GaussianBlur(full.astype(np.float32)/255,(0,0),1.5))[...,None]
    out=A.copy(); out[...,:3]=(A[...,:3]*(1-mm)+fill*mm).round().astype(np.uint8)
    S=float(min(W_*.85,H_*.95)); pad=int(S*1.2); cy+=S*.12; lay=Image.new('RGBA',(2*pad,2*pad),(0,0,0,0)); d=ImageDraw.Draw(lay)
    bear(d,pad,pad,S)
    lay=lay.rotate(-ang if abs(ang)<35 else 0,resample=Image.BICUBIC)
    im=Image.fromarray(out).convert('RGBA'); im.alpha_composite(lay,(int(cx-pad),int(cy-pad)))
    return np.array(im.convert(A.shape[2]==4 and 'RGBA' or 'RGB'))
def match_cat(im,name):
    cfg=CAT[name]; mode=im.mode; A=np.array(im.convert('RGB'))
    M=Image.new('L',im.size,0); d=ImageDraw.Draw(M)
    for p in cfg['poly']: d.polygon(p,fill=255)
    mask=cat_mask(A,np.array(M).astype(float)/255,cfg.get('it',6),cfg.get('t',.6))
    rgb,w=recolor_fur(A,mask); A=rgb
    A=replace_logo(A,cfg['logo'])
    return Image.fromarray(A).convert(mode if mode in('RGB','RGBA') else 'RGB')
if __name__=='__main__':
    import sys,os
    kit=sys.argv[1]; out=sys.argv[2]
    for n in CAT:
        p=os.path.join(kit,'04_tiktok_ui',n); im=Image.open(p); match_cat(im,n).convert('RGB').save(os.path.join(out,n.split('.')[0]+'.png'))
        print(n)
