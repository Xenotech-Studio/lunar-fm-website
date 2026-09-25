"""Separate bounded NAC high-frequency appearance from baked broad illumination.
This is a rendering detail signal, NOT a recovered scientific albedo product.
Original imagery and measured DEM are retained unchanged.
"""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageFilter
root=Path(__file__).resolve().parents[1]/'src/assets/surface'
files={}
for name in ['context','nac-0-0','nac-1-0','nac-0-1','nac-1-1']:
 im=Image.open(root/f'{name}.webp').convert('L')
 a=np.asarray(im,dtype=np.float32)
 low=np.asarray(im.filter(ImageFilter.GaussianBlur(18)),dtype=np.float32)
 # Limit shadow residuals instead of painting black photograph shadows on lit geometry.
 detail=np.clip(.5+.25*np.log((a+20)/(low+20)),.2,.8)
 path=root/f'{name}-detail.webp'
 Image.fromarray(np.uint8(detail*255)).save(path,quality=96)
 files[path.name]={'source':name+'.webp','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size}
(root/'appearance-manifest.json').write_text(json.dumps({'method':'bounded log high-pass; 18 px Gaussian; 0.2..0.8; not intrinsic albedo','derived':files},indent=2)+'\n')
