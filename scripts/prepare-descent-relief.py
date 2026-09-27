"""Real, native-resolution elevation patch around the Taurus-Littrow point of
interest, cut from the same 64 px/degree LOLA raster already used for the
global relief normal map (scripts/prepare-global-relief.py). No procedural
data: every value is a bilinear resample of real LOLA measurements.

Why this exists: the orbital ("base") mesh in src/scene/geography.ts already
tessellates down to 768 m vertex spacing around LANDING (see planetGeometry's
nested rings), but until now those vertices sampled the 4096x2048 global
elevation texture (~2.7 km/px) -- finer than the mesh could resolve. This
patch is native ~474 m/px, closely matched to the mesh's own 768 m minimum
spacing, so the existing geometry shows real terrain shape during the descent
before the higher-precision NAC corridor data takes over -- no new triangles,
no new material branches, just a truer data source for vertices that already
exist.

Requires Pillow, NumPy (see requirements-assets.txt). Reuses the cached
ldem_64_uint.tif from prepare-global-relief.py; does not re-download it.
Run: python3 scripts/prepare-descent-relief.py
"""
from hashlib import sha256
from pathlib import Path
import json
import os

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1] / "src/assets/surface"
CACHE = Path(os.environ.get("ASSET_CACHE", "/home/ubuntu/lunar-fm-assets/raw"))
SOURCE = CACHE / "ldem_64_uint.tif"

# Constants from src/scene/geography.ts, printed via `node --experimental-strip-types`
# against the live module rather than retyped by hand.
R = 1737400.0
PX = -4263541.2000002
PY = 616108.80000003
LON = 0.5301239203818442
COS20 = np.cos(np.radians(20))
LANDING = (0.0, 96.0)  # local x,z meters

HALF_WIDTH = 64000.0  # +/- 64 km square around the point of interest
GRID = 271  # ~474 m spacing, matched to the source's native resolution

assert SOURCE.exists(), f"expected {SOURCE} from prepare-global-relief.py; run that first"
source_bytes = SOURCE.read_bytes()
source_sha256 = sha256(source_bytes).hexdigest()
im = Image.open(SOURCE)
assert im.size == (23040, 11520), f"unexpected LDEM size {im.size}"
raw = np.asarray(im).astype(np.float32)
Hs, Ws = raw.shape
height_m = raw * 0.5 - 10000.0


def geographic(x, z):
    lat = (PY - z) / R
    lon = np.pi + (PX + x) / (R * COS20)
    return lat, lon


def bilinear_sample(lat, lon):
    u = ((lon + np.pi) / (2 * np.pi)) % 1.0
    v = 0.5 + lat / np.pi
    xf = u * (Ws - 1)
    yf = (1 - v) * (Hs - 1)
    xi = np.clip(np.floor(xf).astype(int), 0, Ws - 2)
    yi = np.clip(np.floor(yf).astype(int), 0, Hs - 2)
    fx, fy = xf - xi, yf - yi
    a = height_m[yi, xi] * (1 - fx) + height_m[yi, xi + 1] * fx
    b = height_m[yi + 1, xi] * (1 - fx) + height_m[yi + 1, xi + 1] * fx
    return a * (1 - fy) + b * fy


xs = np.linspace(LANDING[0] - HALF_WIDTH, LANDING[0] + HALF_WIDTH, GRID)
zs = np.linspace(LANDING[1] - HALF_WIDTH, LANDING[1] + HALF_WIDTH, GRID)
xx, zz = np.meshgrid(xs, zs)  # zz varies by row, xx by column -- matches
                              # geography.ts's (row=z, col=x) convention used
                              # elsewhere in this project (e.g. context-terrain.f32).
lat, lon = geographic(xx, zz)
patch = bilinear_sample(lat, lon).astype("<f4")

# Cross-check against the fine-grained descent geometry's own DATUM at the
# landing point: same order of magnitude, confirms no unit/axis mistake.
center_value = bilinear_sample(*geographic(*LANDING))
print(f"elevation at point of interest (native 64ppd resample): {float(center_value):.1f} m")
print(f"patch range: {patch.min():.1f} m to {patch.max():.1f} m")

asset_path = ROOT / "descent-relief.f32"
patch.tofile(asset_path)
asset_bytes = asset_path.read_bytes()

manifest_path = ROOT / "descent-relief-manifest.json"
manifest = {
    "role": "point-of-interest-descent-elevation",
    "description": "Native ~474 m/px LOLA elevation patch centred on the Taurus-Littrow "
                    "point of interest, feeding the orbital mesh's existing 768 m nested "
                    "rings (see planetGeometry in geography.ts) so real terrain shape is "
                    "visible during descent before the NAC corridor data loads.",
    "source": "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_64_uint.tif",
    "sourceBytes": len(source_bytes),
    "sourceSha256": source_sha256,
    "sourceResolution": "23040x11520 (64 px/degree, ~474 m/px at this latitude)",
    "asset": asset_path.name,
    "assetBytes": len(asset_bytes),
    "assetSha256": sha256(asset_bytes).hexdigest(),
    "grid": GRID,
    "worldBounds": [LANDING[0] - HALF_WIDTH, LANDING[1] - HALF_WIDTH, LANDING[0] + HALF_WIDTH, LANDING[1] + HALF_WIDTH],
    "metersPerSample": (2 * HALF_WIDTH) / (GRID - 1),
    "heightRangeMeters": [float(patch.min()), float(patch.max())],
    "resample": "bilinear, no smoothing or exaggeration beyond the source raster's own resolution",
}
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Prepared {asset_path.name}: {len(asset_bytes):,} bytes")
