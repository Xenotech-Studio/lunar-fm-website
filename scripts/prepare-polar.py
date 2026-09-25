"""Build a polar-stereographic display mask from NASA PGDA's >1 km² PSRs.
Run with pyshp 2.3.1, Pillow 11.3.0, numpy 2.3.3:
  python scripts/prepare-polar.py /path/to/psr.shp
No invented patches, no dilation of the scientific footprint.
"""
import sys, json, hashlib
from pathlib import Path
import shapefile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
source=Path(sys.argv[1]);out=Path('src/assets/polar');out.mkdir(exist_ok=True)
size=2048;extent=310000.;supersample=2
im=Image.new('L',(size*supersample,)*2);d=ImageDraw.Draw(im)
r=shapefile.Reader(shp=str(source));count=0
for shape in r.iterShapes():
 count+=1
 offsets=list(shape.parts)+[len(shape.points)]
 for a,b in zip(offsets,offsets[1:]):
  ring=shape.points[a:b]
  signed=sum(x1*y2-x2*y1 for (x1,y1),(x2,y2) in zip(ring,ring[1:]+ring[:1]))
  points=[((x+extent)/(2*extent)*size*supersample,(extent-y)/(2*extent)*size*supersample) for x,y in ring]
  d.polygon(points,fill=255 if signed<0 else 0)
im=im.resize((size,size),Image.Resampling.BOX)
# G encodes an INNER outline: display treatment, not additional PSR coverage.
a=np.asarray(im);inner=np.asarray(im.filter(ImageFilter.MinFilter(3)))
edge=np.maximum(a.astype(int)-inner.astype(int),0).astype('uint8')
Image.merge('RGB',(im,Image.fromarray(edge),Image.new('L',im.size))).save(out/'south-psr.png',optimize=True)
manifest={'sourcePage':'https://pgda.gsfc.nasa.gov/products/90','source':'https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LPSR_80S_20MPP_ADJ_1km2.SHP','paper':'https://doi.org/10.3847/PSJ/acf3e1','dataDOI':'https://doi.org/10.60903/gsfcpgda-lola-spole','sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'polygons':count,'selection':'Only PSRs with area > 1 km²; not all PSRs and not detected ice','sourceDEMSpacingMeters':20,'projection':'South polar stereographic, central meridian 0°, standard parallel -90°, R=1737400 m; MOON_ME / DE421','extentMeters':[-extent,-extent,extent,extent],'displaySize':size,'displayPixelMeters':extent*2/size,'channels':{'R':'area coverage, supersampled 2× and box reduced','G':'inner boundary display emphasis','B':'unused'},'outputSHA256':hashlib.sha256((out/'south-psr.png').read_bytes()).hexdigest()}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(manifest)
