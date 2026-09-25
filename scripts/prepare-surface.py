"""Extract bounded HTTP byte ranges from uncompressed LROC GeoTIFFs.
No global 27k raster or model weights are downloaded. Pillow + numpy + requests.
Reproducible bounds and source hashes are recorded in surface/manifest.json.
"""
from pathlib import Path
import hashlib, io, json, time
import requests
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
OUT = Path(__file__).resolve().parents[1] / 'src/assets/surface'
OUT.mkdir(exist_ok=True)
CACHE = Path('/tmp/lunar-surface'); CACHE.mkdir(exist_ok=True)
BASE = 'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/'
URLS = {'dem': BASE+'DATA/SDP/NAC_DTM/APOLLO17_4/NAC_DTM_APOLLO17_4.TIF',
'ortho': BASE+'EXTRAS/BROWSE/NAC_DTM/APOLLO17_4/NAC_DTM_APOLLO17_4_M150314689_60CM.TIF'}
def fetch(url, start=None, end=None):
    for attempt in range(4):
        try:
            headers = {} if start is None else {'Range':f'bytes={start}-{end}'}
            r=requests.get(url + (f'?range={start}-{end}' if start is not None else ''), headers=headers, timeout=90)
            r.raise_for_status()
            if start is not None:
                assert r.status_code==206 and r.headers['Content-Range'].startswith(f'bytes {start}-')
                assert len(r.content)==end-start+1
            return r.content
        except Exception:
            if attempt==3: raise
            time.sleep(1)
def rows(name, first, count):
    header=CACHE/(name+'.head')
    if not header.exists(): header.write_bytes(fetch(URLS[name],0,1048575))
    im=Image.open(header); tags=im.tag_v2
    assert tags[259]==1 and tags[278]==1
    offsets=tags[273]; lengths=tags[279]
    a=offsets[first]; b=offsets[first+count-1]+lengths[first+count-1]-1
    cached=CACHE/f'{name}-{first}-{count}.bin'
    if not cached.exists(): cached.write_bytes(fetch(URLS[name],a,b))
    raw=cached.read_bytes()
    print(name,len(raw),'bytes',flush=True)
    arr=np.frombuffer(raw,dtype='<f4' if name=='dem' else 'u1').reshape(count,im.width)
    return arr,tags,hashlib.sha256(raw).hexdigest()
# 2457.6 m square centered on the western Taurus–Littrow terrain.
OX, OY, N = 1905, 20000, 4096
ortho, ot, oh=rows('ortho',OY,N)
img=Image.fromarray(ortho[:,OX:OX+N]);img.resize((1024,1024),Image.Resampling.LANCZOS).save(OUT/'context.webp',quality=92)
for y in range(2):
 for x in range(2):
  img.crop((1023+x*1024,1023+y*1024,2049+x*1024,2049+y*1024)).save(OUT/f'nac-{x}-{y}.webp',quality=95)
# Align centers exactly using both GeoTIFF tiepoints / pixel scales, not image brightness.
left=ot[33922][3]+OX*.6; top=ot[33922][4]-OY*.6
# Get broad context in north/south direction; width is the full valid DTM strip.
dem,dt,dh=rows('dem',4000,6000)
dem=dem.copy(); valid=dem>-1e10
# This crop is checked for nodata; never silently synthesize surveyed elevations.
xf=(left+np.linspace(0,N*.6,1025)-dt[33922][3])/2-.5
yf=(dt[33922][4]-(top-np.linspace(0,N*.6,1025)))/2-.5-4000
xi=np.floor(xf).astype(int); yi=np.floor(yf).astype(int);wx=xf-xi;wy=yf-yi
assert valid[np.ix_(yi,xi)].all() and valid[np.ix_(yi+1,xi+1)].all(), 'Crop contains nodata'
a=dem[np.ix_(yi,xi)]*(1-wx)+dem[np.ix_(yi,xi+1)]*wx
b=dem[np.ix_(yi+1,xi)]*(1-wx)+dem[np.ix_(yi+1,xi+1)]*wx
height=(a*(1-wy[:,None])+b*wy[:,None]).astype('<f4')
height.tofile(OUT/'terrain.f32')
# Broad 24 m context, from the same DTM. Fill edge voids along each row only;
# the fine footprint above rejects all nodata rather than inventing measurements.
far=dem.copy()
void_count=int((far < -1e10).sum())
for row in far:
    ok=row>-1e10
    assert ok.any()
    row[~ok]=np.interp(np.where(~ok)[0],np.where(ok)[0],row[ok])
fx=np.linspace(0,2371,199);fy=np.linspace(0,5999,501)
fxi=np.minimum(np.floor(fx).astype(int),2370);fyi=np.minimum(np.floor(fy).astype(int),5998)
fw=fx-fxi;fh=fy-fyi
fa=far[np.ix_(fyi,fxi)]*(1-fw)+far[np.ix_(fyi,fxi+1)]*fw
fb=far[np.ix_(fyi+1,fxi)]*(1-fw)+far[np.ix_(fyi+1,fxi+1)]*fw
(fa*(1-fh[:,None])+fb*fh[:,None]).astype('<f4').tofile(OUT/'context-terrain.f32')
preview=Image.fromarray(np.uint8((height-height.min())/(height.max()-height.min())*255));preview.save(CACHE/'height-preview.png')
earthurl='https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png'
earthcache=CACHE/'earth.png'
if not earthcache.exists(): earthcache.write_bytes(fetch(earthurl))
Image.open(earthcache).convert('RGB').save(OUT/'earth-blue-marble.webp',quality=94)
manifest={'sourcePages':['https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO17_4','https://svs.gsfc.nasa.gov/4720/'], 'sources':URLS,'rangeSHA256':{'ortho':oh,'dem':dh},'orthoCrop':[OX,OY,N,N],'projectedTopLeft':[left,top],'projection':'Equirectangular; center latitude 20, longitude 180; radius 1737400 m','widthMeters':N*.6,'heightGrid':1025,'sourceImageMetersPerPixel':.6,'sourceDEMMetersPerPost':2,'runtimeHeightMetersPerPost':N*.6/1024,'heightRangeMeters':[float(height.min()),float(height.max())],'contextGrid':[199,501],'contextVoidFraction':void_count/dem.size,'contextWorldBounds':[-2371.8,-5228.2,2370.2,6769.8],'earthSource':earthurl,'derived':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in OUT.iterdir() if f.name!='manifest.json'}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['heightRangeMeters'],flush=True)
