from pathlib import Path
from PIL import Image,ImageDraw
import json,sys
folder=Path(sys.argv[1]);meta=folder/'frames.json'
if meta.exists() and 'telemetry' in json.loads(meta.read_text()):
 data=json.loads(meta.read_text());frames=[(folder/f['file'],f"{f['wallMs']/1000:.1f}s / story {f['story']*100:.2f}%") for f in data['frames']]
else:
 frames=[(p,f'story {p.stem}%') for p in sorted(folder.glob('*.png'),key=lambda p:float(p.stem))]
portrait=bool(frames) and Image.open(frames[0][0]).height>Image.open(frames[0][0]).width
cw,ch=(390,844) if portrait else (600,400)
for old in folder.glob('sheet-*.jpg'):old.unlink()
for start in range(0,len(frames),6):
 out=Image.new('RGB',(cw*2,(ch+24)*3),'#141819');draw=ImageDraw.Draw(out)
 for i,(p,label) in enumerate(frames[start:start+6]):
  x=i%2*cw;y=i//2*(ch+24);draw.text((x+10,y+5),f'{folder.name} / {label}',fill='white');out.paste(Image.open(p).convert('RGB').resize((cw,ch)),(x,y+24))
 out.save(folder/f'sheet-{start//6:02}.jpg',quality=93)
