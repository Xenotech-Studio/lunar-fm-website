"""Rebuild the global-layer assets (full-globe color and elevation) from NASA's
highest-resolution public CGI Moon Kit deliverables. Requires Pillow, NumPy,
requests (see requirements-assets.txt); not used by npm builds.

Large source TIFFs (~580 MB combined) are cached outside the git repo in
ASSET_CACHE (defaults to /home/ubuntu/lunar-fm-assets/raw) so rebuilds are
reproducible without re-downloading or bloating the repository. Only the
small derived web assets are written into src/assets/.

Run: python3 scripts/prepare-global.py
"""
from hashlib import sha256
from pathlib import Path
import json
import os

import numpy as np
import requests
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1] / "src/assets"
CACHE = Path(os.environ.get("ASSET_CACHE", "/home/ubuntu/lunar-fm-assets/raw"))
CACHE.mkdir(parents=True, exist_ok=True)
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/"


def fetch(name: str) -> Path:
    """Download a CGI Moon Kit source TIFF into the external cache if missing."""
    path = CACHE / name
    if not path.exists():
        with requests.get(BASE + name, stream=True, timeout=180) as response:
            response.raise_for_status()
            with open(path, "wb") as handle:
                for chunk in response.iter_content(1 << 20):
                    handle.write(chunk)
    return path


def digest(path: Path) -> tuple[int, str]:
    data = path.read_bytes()
    return len(data), sha256(data).hexdigest()


manifest = []

# --- Fast placeholder / WebGL-failure fallback (App.tsx CSS background). ---
# Shown small and cropped before the scene is ready, so 4K is already more
# than enough resolution; keeping it separate protects the very first paint.
placeholder_path = fetch("lroc_color_poles_4k.tif")
placeholder = Image.open(placeholder_path).convert("RGB")
placeholder_asset = ROOT / "lroc-color-4k.webp"
placeholder.save(placeholder_asset, "WEBP", quality=94, method=6)
sb, sh = digest(placeholder_path)
ab, ah = digest(placeholder_asset)
manifest.append({"role": "placeholder-and-fallback-color", "source": BASE + "lroc_color_poles_4k.tif",
                  "sourceBytes": sb, "sourceSha256": sh, "asset": placeholder_asset.name,
                  "assetBytes": ab, "assetSha256": ah, "resolution": "4096x2048"})
print(f"Prepared {placeholder_asset.name}: {ab:,} bytes")

# --- Global color: NASA CGI Moon Kit 8K "poles" mosaic (same dataset/projection
# family as the 4K placeholder, just delivered at native higher resolution). ---
color_path = fetch("lroc_color_poles_8k.tif")
color = Image.open(color_path).convert("RGB")
color_asset = ROOT / "lroc-color-8k.webp"
color.save(color_asset, "WEBP", quality=92, method=6)
sb, sh = digest(color_path)
ab, ah = digest(color_asset)
manifest.append({"role": "global-scene-color", "source": BASE + "lroc_color_poles_8k.tif",
                  "sourceBytes": sb, "sourceSha256": sh, "asset": color_asset.name,
                  "assetBytes": ab, "assetSha256": ah, "resolution": "8192x4096"})
print(f"Prepared {color_asset.name}: {ab:,} bytes")

# --- Global elevation: re-derived from the true 64 px/deg LOLA raster (23040x11520,
# ~474 m/px at the equator) instead of the kit's pre-baked 16 px/deg raster, box-
# filtered down to the same 4096x2048 delivery size used at runtime. This changes
# no byte budget but replaces an upsampled-then-downsampled path with a proper
# area-average of real higher-resolution measurements. Packed R=high8,G=low8 to
# survive an 8-bit browser canvas readback; height_m = uint16*0.5 - 10000.
height_path = fetch("ldem_64_uint.tif")
source = Image.open(height_path)
assert source.size == (23040, 11520), f"unexpected LDEM size {source.size}"
values = np.asarray(source).astype(np.float32)
resized = Image.fromarray(values, mode="F").resize((4096, 2048), Image.Resampling.BOX)
height = np.clip(np.round(np.asarray(resized)), 0, 65535).astype(np.uint16)
packed = np.zeros((*height.shape, 3), dtype=np.uint8)
packed[:, :, 0] = height >> 8
packed[:, :, 1] = height & 255
height_asset = ROOT / "lola-height-rg.webp"
Image.fromarray(packed).save(height_asset, "WEBP", lossless=True, method=6)
sb, sh = digest(height_path)
ab, ah = digest(height_asset)
manifest.append({"role": "global-scene-elevation", "source": BASE + "ldem_64_uint.tif",
                  "sourceBytes": sb, "sourceSha256": sh, "asset": height_asset.name,
                  "assetBytes": ab, "assetSha256": ah, "resolution": "4096x2048",
                  "sourceResolution": "23040x11520 (64 px/degree)", "resample": "box filter",
                  "heightFormula": "meters = (R*256 + G) * 0.5 - 10000, radius 1737400 m"})
print(f"Prepared {height_asset.name}: {ab:,} bytes")

(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
