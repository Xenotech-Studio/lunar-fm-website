"""100 m WAC image + signed 16-bit GLD100 DEM, cropped via HTTP ranges.
Bridges the spatial resolution gap between global LOLA and local NAC.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,requests,math,json,hashlib,time,concurrent.futures
Image.MAX_IMAGE_PIXELS=None
CACHE=Path('/tmp/lunar-surface');OUT=Path(__file__).resolve().parents[1]/'src/assets/surface'
R=1737400;PX=-4263541.2;PY=616108.8
lon=math.pi+PX/(R*math.cos(math.radians(20)))
N=1536;col=int(lon*R/100)-N//2;row=int((1819400-PY)/100)-N//2
CACHE.mkdir(exist_ok=True)
BASE='https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/'
imageURL=BASE+'EXTRAS/BROWSE/WAC_GLOBAL/WAC_GLOBAL_E300N0450_100M.TIF'
demURL=BASE+'DATA/SDP/WAC_GLD100/WAC_GLD100_E300N0450_100M.IMG'
def get(url,a,b,name):
 cache=CACHE/name
 if not cache.exists():
  for retry in range(4):
   try:
    r=requests.get(url+f'?crop={a}-{b}',headers={'Range':f'bytes={a}-{b}'},timeout=120)
    assert r.status_code==206 and r.headers['Content-Range'].startswith(f'bytes {a}-') and len(r.content)==b-a+1
    cache.write_bytes(r.content);break
   except Exception:
    if retry==3:raise
    time.sleep(1)
 raw=cache.read_bytes();print(name,len(raw),flush=True);return raw
header=CACHE/'WAC_GLOBAL_E300N0450_100M.head'
if not header.exists():get(imageURL,0,1048575,header.name)
im=Image.open(header);tags=im.tag_v2
start=tags[273][row];stop=tags[273][row+N-1]+tags[279][row+N-1]-1
with concurrent.futures.ThreadPoolExecutor() as ex:
 f=ex.submit(get,imageURL,start,stop,'wac-image-region.bin')
 g=ex.submit(get,demURL,(1+row)*54582,(1+row+N)*54582-1,'wac-height-region.bin')
 imageRaw=f.result();demRaw=g.result()
a=np.frombuffer(imageRaw,dtype='u1').reshape(N,27291)[:,col:col+N]
h=np.frombuffer(demRaw,dtype='<i2').reshape(N,27291)[:,col:col+N].copy()
assert (h>-32000).all()
h.tofile(OUT/'wac-regional.i16')
original=Image.fromarray(a);original.save(OUT/'wac-regional.webp',quality=94)
blur=np.asarray(original.filter(ImageFilter.GaussianBlur(10)),dtype=np.float32)
detail=np.clip(.5+.25*np.log((a.astype(float)+20)/(blur+20)),.15,.85)
Image.fromarray(np.uint8(detail*255)).save(OUT/'wac-regional-detail.webp',quality=95)
meta={'imageSource':imageURL,'demSource':demURL,'sourcePages':['https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E300N0450_100M','https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLD100_E300N0450_100M'],'crop':[col,row,N,N],'radius':R,'centerLatitude':0,'centerLongitude':0,'pixelMeters':100,'topLeftPixelCenter':[col*100+50,1819400-row*100-50],'heightRange':[int(h.min()),int(h.max())],'rangeHashes':{'image':hashlib.sha256(imageRaw).hexdigest(),'dem':hashlib.sha256(demRaw).hexdigest()},'derived':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in OUT.glob('wac-regional*')}}
(OUT/'regional-manifest.json').write_text(json.dumps(meta,indent=2)+'\n');print(meta['heightRange'])
