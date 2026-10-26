# Meow Sakura: swap restaurant/prop/food sprites and the TikTok UI art for the Japanese sakura kit.
# Characters are NOT touched (src/15_staff_sprites.js, src/16_more_sprites.js, assets/characters stay as they are).
#   python3 tools/sakura_art.py [KIT_DIR]      KIT_DIR = unzipped meow-jp-full (default ~/jp/src_zip)
# Patches in place: src/17_pizza_art.js (FOOD_ART entries), src/18_env_art.js (ENV_ART entries), assets/minis/*.
import sys,os,io,re,json,base64,glob
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from scipy import ndimage
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); from sakura_cat import match_cat   # kit cat -> the player's look
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT=sys.argv[1] if len(sys.argv)>1 else os.environ.get('SAKURA_KIT','/home/claude/jp/src_zip')
FONT=os.environ.get('SAKURA_FONT',os.path.join(ROOT,'tools','fonts','Fredoka.ttf'))
PREV=os.environ.get('SAKURA_PREV')            # optional preview sheet path
def kit(name): return os.path.join(KIT,name) if '/' in name else glob.glob(os.path.join(KIT,'*',name))[0]
def enc(im):
    b=io.BytesIO(); im.save(b,'WEBP',quality=90,method=6,alpha_quality=95); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
def tidy(im,top=0.0,bottom=1.0,minfrac=.04,maxside=200,erase=(),white=False):
    """crop to content, cut away the part above `top` / below `bottom` (fractions of the content box),
       drop specks (petals) smaller than `minfrac` of the biggest blob, soften the edge, then shrink."""
    im=im.convert('RGBA'); im=im.crop(im.getbbox()); A=np.array(im)
    h=A.shape[0]; A[:int(h*top),:,3]=0; A[int(h*bottom):,:,3]=0
    for (x0,y0,x1,y1) in erase:   # boxes in content fractions
        H,W=A.shape[:2]; A[int(y0*H):int(y1*H),int(x0*W):int(x1*W),3]=0
    if white:   # near-white background left around the object: clear what is connected to the transparent outside
        rgb=A[...,:3].astype(int); wh=(rgb.min(2)>225)&(rgb.max(2)-rgb.min(2)<22)&(A[...,3]>0)
        out=ndimage.binary_dilation(A[...,3]<10,iterations=2); lab,n=ndimage.label(wh|(A[...,3]<10))
        bad=np.isin(lab,np.unique(lab[out&(lab>0)])); A[...,3]=np.where(bad&wh,0,A[...,3])
    m=A[...,3]>40; lab,n=ndimage.label(m)
    if n:
        sz=ndimage.sum(m,lab,range(1,n+1)); keep=[i+1 for i,s in enumerate(sz) if s>=minfrac*sz.max()]
        A[...,3]=np.where(np.isin(lab,keep)|(ndimage.binary_dilation(np.isin(lab,keep),iterations=2)&(A[...,3]>0)),A[...,3],0)
    im=Image.fromarray(A); im=im.crop(im.getbbox()); im.thumbnail((maxside,maxside),Image.LANCZOS); return im
# ---------------- sprites -----------------------------------------------------------------------------------
FOOD={  # FOOD_ART key: (kit file, tidy options)
 'pizza':('fried_chicken_jp.png',dict(top=.47)),          # 4-piece chicken box (noren + lantern above cut off)
 'dessert':('fries_jp.png',dict(top=.36)),                # fries (noren + lantern cut off)
 'drink':('cat_cola_jp.png',{}),
 'pepperoni':('cheeseburger_jp.png',{}),
 'seafood':('chicken_burger_jp.png',{}),
 'special':('deluxe_burger_jp.png',{}),
 'veggie':('garden_salad_jp.png',dict(minfrac=.2)),
 'box':('03_food/chicken_box_jp.png',{}),
 'ing':('ingredients_jp.png',dict(maxside=120)),
 'trash':('used_tray_jp.png',{}),
}
ENVS={  # ENV_ART key: (kit file, tidy options)  -- drawn by width in tiles, so only the aspect matters
 'register':('cash_register_jp.png',dict(maxside=170)),
 'carrytray':('carry_tray_jp.png',dict(maxside=170)),
 'bin':('trash_bin_jp.png',dict(maxside=130,white=True)),
 'signstand':('sign_stand_jp.png',dict(maxside=150)),
 'boxes':('boxes_jp.png',dict(maxside=130)),
 'plant':('plant_jp.png',dict(maxside=130)),
 'menuC':('menu_board_chicken_jp.png',dict(maxside=140)),
 'menuB':('menu_board_burger_jp.png',dict(maxside=140)),
 'menuS':('menu_board_salad_jp.png',dict(maxside=140)),
}
def tip(im):
    a=np.array(im)[...,3]>128; ys,xs=np.nonzero(a); yb=ys.max(); sel=ys>=yb-max(2,int(im.height*.02)); return round(float(xs[sel].mean())/im.width,3)
def patch_js(path,var,entries,env=False):
    s=open(path,encoding='utf-8').read(); m=re.search(r'const %s=(\{.*?\});\n'%var,s,re.S); d=json.loads(m.group(1))
    for k,im in entries.items(): d[k]={'src':enc(im),'w':im.width,'h':im.height,'tip':tip(im)} if env else enc(im)
    s=s[:m.start(1)]+json.dumps(d,separators=(',',':'))+s[m.end(1):]; open(path,'w',encoding='utf-8').write(s)
food={k:tidy(Image.open(kit(f)),**o) for k,(f,o) in FOOD.items()}
envs={k:tidy(Image.open(kit(f)),**o) for k,(f,o) in ENVS.items()}
patch_js(os.path.join(ROOT,'src','17_pizza_art.js'),'FOOD_ART',food)
patch_js(os.path.join(ROOT,'src','18_env_art.js'),'ENV_ART',envs,env=True)
# ---------------- TikTok / loading UI art -------------------------------------------------------------------
MIN=os.path.join(ROOT,'assets','minis')
def font(sz,wght=700):
    f=ImageFont.truetype(FONT,sz)
    try:   # Fredoka axes: Weight, Width
        names=[ax['name'] for ax in f.get_variation_axes()]; f.set_variation_by_axes([wght if n==b'Weight' else 100 for n in names])
    except Exception: pass
    return f
def resize_w(im,w): return im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)
def retext(im,box,text,fill,size,bg=None,wght=600):
    """paint over a text line (box in pixels of `im`) with the colour sampled just above/below it, then write `text` centred"""
    d=ImageDraw.Draw(im); x0,y0,x1,y1=box
    if bg is None:
        a=np.array(im.convert('RGB')).astype(int); ring=np.concatenate([a[y0-4:y0,x0:x1].reshape(-1,3),a[y1:y1+4,x0:x1].reshape(-1,3)]); bg=tuple(int(v) for v in np.median(ring,0))
    d.rectangle(box,fill=bg); d.text(((x0+x1)/2,(y0+y1)/2),text,font=font(size,wght),fill=fill,anchor='mm'); return im
INK=(92,40,22,255)
def logo_sakura(im):
    """loading screen: the kit logo reads "Meow Burger". The yellow "Burger" letters are filled with the plate's brown,
       "Sakura" is lettered on the plate in pink, and the burger badge becomes a sakura blossom badge."""
    W,H=im.size; s=W/1184; im=im.convert('RGBA'); A=np.array(im).astype(int)
    r,g,b=A[...,0],A[...,1],A[...,2]; yy,xx=np.mgrid[:H,:W]
    region=(xx>220*s)&(xx<1005*s)&(yy>420*s)&(yy<640*s)
    yellow=(r>170)&(g>110)&(b<150)&(r-b>70)          # letter faces + their orange shading
    hilite=(r>235)&(g>220)&(b>170)&(b<235)           # warm white highlights on the letters
    brownish=(r>55)&(r<200)&(g<115)&(b<85)&(r-b>40)
    shape=ndimage.binary_closing(region&(brownish|yellow|hilite),iterations=4)
    lab,n=ndimage.label(shape); sz=ndimage.sum(shape,lab,range(1,n+1)); shape=ndimage.binary_fill_holes(lab==np.argmax(sz)+1)
    shape=ndimage.binary_erosion(shape,iterations=int(10*s))         # stay inside the plate's dark rim
    m=region&(yellow|hilite); m=ndimage.binary_closing(m,iterations=3); m=ndimage.binary_dilation(m,iterations=int(7*s))&shape
    plate=region&~m&(r<170)&(r>110)&(g<90)&(b<70)    # the mid-brown plate itself
    pc=np.median(A[plate][:,:3],0).astype(int) if plate.any() else np.array([150,72,40])
    A[m,:3]=pc; im=Image.fromarray(A.astype(np.uint8))
    # "Sakura": dark outline, pink gradient face, soft top highlight
    txt='Sakura'; f=font(int(175*s),700); cx,cy=int(600*s),int(518*s)
    d=ImageDraw.Draw(im); d.text((cx,cy+int(6*s)),txt,font=f,fill=INK,anchor='mm',stroke_width=int(12*s),stroke_fill=INK)
    d.text((cx,cy),txt,font=f,fill=(255,250,252,255),anchor='mm',stroke_width=int(7*s),stroke_fill=(255,250,252,255))
    lay=Image.new('L',im.size,0); ImageDraw.Draw(lay).text((cx,cy),txt,font=f,fill=255,anchor='mm')
    t=np.clip((np.arange(H)-(cy-70*s))/(140*s),0,1)[:,None]
    col=(np.array([255,196,214])*(1-t)+np.array([236,86,140])*t).astype(np.uint8)
    G=np.zeros((H,W,4),np.uint8); G[...,:3]=col[:,None,:]; G[...,3]=np.array(lay); im.alpha_composite(Image.fromarray(G))
    hl=np.array(lay.filter(ImageFilter.MinFilter(int(9*s)//2*2+1))); hl=np.where(yy<cy-int(28*s),hl//3,0).astype(np.uint8)
    Hh=np.zeros((H,W,4),np.uint8); Hh[...,:3]=255; Hh[...,3]=hl; im.alpha_composite(Image.fromarray(Hh))
    # blossom badge over the burger
    bx,by,R=int(925*s),int(345*s),int(118*s)
    d=ImageDraw.Draw(im); d.ellipse([bx-R*1.12,by-R*1.12,bx+R*1.12,by+R*1.12],fill=INK)
    d.ellipse([bx-R*1.02,by-R*1.02,bx+R*1.02,by+R*1.02],fill=(255,240,232,255))
    blossom(im,bx,by,int(R*.86))
    return im.convert('RGB')
def blossom(im,cx,cy,R,petal=(255,176,200),dark=(216,88,132),core=(255,214,92)):
    import math
    out=Image.new('L',im.size,0); fill=Image.new('RGBA',im.size,(0,0,0,0)); do=ImageDraw.Draw(out); df=ImageDraw.Draw(fill); ol=max(3,R//11)
    pts=[(a,cx+math.cos(a)*R*.5,cy+math.sin(a)*R*.5) for a in [-math.pi/2+i*2*math.pi/5 for i in range(5)]]
    for a,px,py in pts: do.ellipse([px-R*.5-ol,py-R*.5-ol,px+R*.5+ol,py+R*.5+ol],fill=255)
    for a,px,py in pts:
        df.ellipse([px-R*.5,py-R*.5,px+R*.5,py+R*.5],fill=petal+(255,))
        df.ellipse([px-R*.3,py-R*.32,px+R*.02,py-R*.02],fill=(255,232,240,255))
    notch=Image.new('L',im.size,0); dn=ImageDraw.Draw(notch)
    for a,px,py in pts:
        tx,ty=cx+math.cos(a)*(R*1.0+ol),cy+math.sin(a)*(R*1.0+ol)
        dn.polygon([(tx+math.cos(a+1.7)*R*.11,ty+math.sin(a+1.7)*R*.11),(cx+math.cos(a)*R*.88,cy+math.sin(a)*R*.88),(tx+math.cos(a-1.7)*R*.11,ty+math.sin(a-1.7)*R*.11)],fill=255)
    nm=np.array(notch)>0; on=np.array(out); on[nm]=0
    nm_in=np.array(notch.filter(ImageFilter.MaxFilter(ol//2*2+1)))>0
    O=np.zeros(on.shape+(4,),np.uint8); O[...,:3]=INK[:3]; O[...,3]=on; im.alpha_composite(Image.fromarray(O))
    F=np.array(fill); F[...,3]=np.where(nm_in,0,F[...,3]); im.alpha_composite(Image.fromarray(F))
    d=ImageDraw.Draw(im)
    for a,px,py in pts: d.line([(cx,cy),(cx+math.cos(a)*R*.45,cy+math.sin(a)*R*.45)],fill=dark+(255,),width=max(2,R//20))
    d.ellipse([cx-R*.2,cy-R*.2,cx+R*.2,cy+R*.2],fill=core+(255,),outline=dark+(255,),width=max(2,R//24))
JP='04_tiktok_ui/'
ui={}
CAT_IMG=lambda n: match_cat(Image.open(kit(n)),n)
ui['loading_bg.jpg']=resize_w(logo_sakura(CAT_IMG('loading_bg_jp.jpg')),941)
ha=CAT_IMG('pop_home_art_jp.jpg').convert('RGB'); W=ha.width/1280
ui['pop_home_art.jpg']=resize_w(retext(ha,(int(470*W),int(345*W),int(830*W),int(405*W)),'Meow Sakura',(255,255,255),int(46*W),wght=560),640)
rp=CAT_IMG('pop_revisit_profile_jp.jpg').convert('RGB'); W=rp.width/1048
ui['pop_revisit_profile.jpg']=resize_w(retext(rp,(int(170*W),int(232*W),int(905*W),int(300*W)),'Click Meow Sakura in profile.',(72,36,24),int(52*W),wght=700),640)
for n in ['pop_home_steps','pop_revisit_coins']: ui[n+'.jpg']=resize_w(Image.open(kit(n+'_jp.jpg')).convert('RGB'),640)
ui['pop_share_art.jpg']=resize_w(CAT_IMG('pop_share_art_jp.jpg').convert('RGB'),640)
for n in ['btn_home','btn_revisit','btn_share']:
    b=tidy(Image.open(kit(n+'_jp.png')),minfrac=.02,maxside=10000); ui[n+'.png']=b.resize((150,round(150*b.height/b.width)),Image.LANCZOS)
ui['paw_thumb.png']=tidy(Image.open(kit('paw_thumb_jp.png')),maxside=72)
icon=CAT_IMG('icon_512_jp.png').convert('RGB')   # one icon art for both sizes (the kit's two icons differ)
for n,w in [('icon_192',192),('icon_512',512)]: ui[n+'.png']=icon.resize((w,w),Image.LANCZOS)
for n,im in ui.items():
    p=os.path.join(MIN,n)
    if n.endswith('.jpg'): im.convert('RGB').save(p,quality=88,optimize=True)
    else: im.save(p,optimize=True)
    print(n,im.size)
print('popup heights at 640 wide (src/native/60n_ui_canvas.js ratios):',{n:im.size[1] for n,im in ui.items() if n.startswith('pop_')})
if PREV:
    ims=list(food.items())+list(envs.items()); H=160; row=[]
    for k,i in ims: s=H/i.height; row.append((k,i.resize((max(1,int(i.width*s)),H))))
    Wt=sum(i.width+8 for _,i in row); S=Image.new('RGB',(Wt,H+16),(90,140,90)); dd=ImageDraw.Draw(S); x=0
    for k,i in row: S.paste(i,(x,0),i); dd.text((x,H+2),k,fill=(255,255,255)); x+=i.width+8
    S.save(PREV,quality=85)
print('food',len(food),'env',len(envs))
