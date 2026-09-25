"""Optional asset rebuild. Requires Pillow and NumPy; not used by npm builds.

Downloads only NASA image TIFFs (~46 MB combined), never ML model weights.
Run: python scripts/prepare-assets.py
"""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "src/assets"
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/"
manifest = []
for source, target in [
    ("lroc_color_poles_4k.tif", "lroc-color-4k.webp"),
    ("ldem_16_uint.tif", "lola-height-rg.png"),
]:
    with urlopen(BASE + source, timeout=90) as response:
        raw = response.read()
    image = Image.open(BytesIO(raw))
    if "color" in source:
        image.convert("RGB").save(ROOT / target, "WEBP", quality=94, method=6)
    else:
        image = image.resize((4096, 2048), Image.Resampling.BILINEAR)
        height = np.asarray(image, dtype=np.uint16)
        packed = np.zeros((*height.shape, 3), dtype=np.uint8)
        packed[:, :, 0] = height >> 8
        packed[:, :, 1] = height & 255
        Image.fromarray(packed).save(ROOT / target, optimize=True)
    asset = (ROOT / target).read_bytes()
    manifest.append({"source": BASE + source, "sourceBytes": len(raw),
                     "sourceSha256": sha256(raw).hexdigest(), "asset": target,
                     "assetBytes": len(asset), "assetSha256": sha256(asset).hexdigest()})
    print(f"Prepared {target}: {len(asset):,} bytes")
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
