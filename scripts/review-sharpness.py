"""Same-screen ROI high-frequency contrast diagnostic, NOT an MTF/resolution metric.
Different viewpoints/rocks mean this only complements visual review. No screenshot sharpening.
"""
from PIL import Image,ImageFilter,ImageDraw
from pathlib import Path
import numpy as np,json
out=Path('docs/pace-detail-review')
series={'04c35f5':Path('docs/transition-review/before'),'2401762':Path('docs/transition-review/after'),'final':out/'matched'}
regions={'left':[120,420,420,520],'middle':[420,460,780,550],'lower':[300,610,850,660]}
results=[]
for n in range(50,57):
 for label,path in series.items():
  im=Image.open(path/f'{n}.png').convert('L')
  for name,box in regions.items():
   roi=im.crop(box);a=np.asarray(roi,dtype=float);high=a-np.asarray(roi.filter(ImageFilter.GaussianBlur(1)),dtype=float)
   trimmed=np.sort(high.reshape(-1)**2)[:int(high.size*.9)]
   results.append({'frame':n,'version':label,'roi':name,'mean':float(a.mean()),'trimmedHighFrequencyRMS':float(np.sqrt(trimmed.mean())),'p90Absolute':float(np.percentile(abs(high),90))})
summary={label:float(np.median([r['trimmedHighFrequencyRMS'] for r in results if r['version']==label])) for label in series}
(out/'sharpness.json').write_text(json.dumps({'warning':'Screen contrast proxy only; not physical spatial resolution. Positions/framing differ. Top 10% residuals removed to reduce rock/edge bias.','rois':regions,'medianTrimmedRMS':summary,'frames':results},indent=2)+'\n')
# Unscaled 1:1 patches, labelled and aligned by frame/ROI; do not sharpen them.
sheet=Image.new('RGB',(1650,450),'#16191c');d=ImageDraw.Draw(sheet)
for col,(label,path) in enumerate(series.items()):
 im=Image.open(path/'50.png')
 for row,(name,box) in enumerate(regions.items()):
  d.text((col*550+8,row*150+5),label+' / 50 / '+name,fill='white');sheet.paste(im.crop(box),(col*550,row*150+25))
sheet.save(out/'detail-crops.png')
print(summary)
