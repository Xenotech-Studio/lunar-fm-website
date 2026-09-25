"""Create labelled review sheets from every frame, without skipping positions."""
from pathlib import Path
from PIL import Image, ImageDraw
import sys
folder=Path(sys.argv[1]); files=sorted(folder.glob('*.png'),key=lambda f:float(f.stem))
for old in folder.glob('sheet-*.jpg'): old.unlink()
for start in range(0,len(files),6):
    part=files[start:start+6];sheet=Image.new('RGB',(1200,1272),'#16191c');draw=ImageDraw.Draw(sheet)
    for i,path in enumerate(part):
        x=(i%2)*600;y=(i//2)*424
        draw.text((x+12,y+5),f'{folder.name} / {path.stem}%',fill='white')
        sheet.paste(Image.open(path).convert('RGB').resize((600,400)),(x,y+24))
    sheet.save(folder/f'sheet-{part[0].stem}.jpg',quality=92)
