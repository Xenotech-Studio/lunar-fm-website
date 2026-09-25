"""Read NASA COG overview via HTTP ranges; pack cartographic hillshade in PSR B.
Requires rasterio 1.4.3, Pillow 11.3.0, numpy 2.3.3. Not runtime relighting.
"""
import rasterio,json,hashlib
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from pathlib import Path
from PIL import Image
import numpy as np
url='https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ_HILL.TIF'
out=Path('src/assets/polar')
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_HTTP_TIMEOUT='45',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.TIF'):
 with rasterio.open('/vsicurl/'+url) as src:
  print(src.profile,src.bounds,src.overviews(1),flush=True)
  window=from_bounds(-310000,-310000,310000,310000,transform=src.transform)
  data=src.read(1,window=window,out_shape=(2048,2048),boundless=True,fill_value=128,resampling=Resampling.bilinear)
  print('min/max',data.min(),data.max(),flush=True)
  meta={'source':url,'sourceBounds':list(src.bounds),'sourceTransform':list(src.transform),'sourcePixelMeters':80,'sourceCRS':str(src.crs),'overviews':src.overviews(1),'displayMethod':'Bilinear COG overview sampled to same 620 km / 2048 grid; simulated hillshade at 45 deg altitude and azimuth, not current lighting'}
image=Image.open(out/'south-psr.png');r,g,_=image.split()
# Source hillshade is 8-bit; retain linear display values, no color transfer.
b=Image.fromarray(np.clip(data,0,255).astype('uint8'))
Image.merge('RGB',(r,g,b)).save(out/'south-psr.png',optimize=True)
p=out/'manifest.json';m=json.loads(p.read_text());m['hillshade']=meta;m['channels']['B']='LOLA simulated hillshade (45° altitude, 45° azimuth)';m['outputSHA256']=hashlib.sha256((out/'south-psr.png').read_bytes()).hexdigest();p.write_text(json.dumps(m,indent=2)+'\n')
