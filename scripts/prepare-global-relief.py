"""Derive a global relief normal map from the real LOLA 64 px/degree elevation
raster, so orbital views show physically-correct light/shadow across ridges
and crater rims instead of flattening to a mathematically perfect sphere.

No procedural noise or fake displacement: every normal is a finite-difference
of real measured heights, converted through the exact same geographic/world
rotation used by src/scene/geography.ts (values cross-checked against that
module via Node before being hardcoded below).

Requires Pillow, NumPy (see requirements-assets.txt). Reuses the ldem_64_uint.tif
already cached by prepare-global.py; does not re-download it.
Run: python3 scripts/prepare-global-relief.py
"""
from hashlib import sha256
from pathlib import Path
import json
import os

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1] / "src/assets"
CACHE = Path(os.environ.get("ASSET_CACHE", "/home/ubuntu/lunar-fm-assets/raw"))
SOURCE = CACHE / "ldem_64_uint.tif"
R = 1737400.0
# World-space basis vectors from src/scene/geography.ts (EAST, UP, SOUTH),
# printed via `node --experimental-strip-types` against the live module --
# not re-derived by hand, to avoid a transcription error in the rotation.
EAST_W = np.array([-0.5056402567046584, 0.0, -0.862744418005499])
UP_W = np.array([0.8090645482447408, 0.34722972287843423, -0.47417937146537614])
SOUTH_W = np.array([0.29957050517896544, -0.9377801019160973, -0.17557332621173888])

DELIVER_W, DELIVER_H = 8192, 4096

assert SOURCE.exists(), f"expected {SOURCE} from prepare-global.py; run that first"
source_bytes = SOURCE.read_bytes()
source_sha256 = sha256(source_bytes).hexdigest()
im = Image.open(SOURCE)
assert im.size == (23040, 11520), f"unexpected LDEM size {im.size}"
raw = np.asarray(im).astype(np.float32)
Hs, Ws = raw.shape
height = raw * 0.5 - 10000.0
del raw

step_lon = 2 * np.pi / (Ws - 1)
step_lat = np.pi / (Hs - 1)
lat = (0.5 - np.arange(Hs, dtype=np.float64) / (Hs - 1)) * np.pi  # per row
lon = (np.arange(Ws, dtype=np.float64) / (Ws - 1)) * 2 * np.pi - np.pi  # per column
cos_lat = np.cos(lat).astype(np.float32)
cos_lat_safe = np.maximum(cos_lat, 1e-3)  # avoid pole blow-up; poles blend to radial elsewhere

# Central differences: longitude wraps around the globe, latitude clamps at the poles.
dh_di = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
dh_dj = np.empty_like(height)
dh_dj[1:-1, :] = (height[2:, :] - height[:-2, :]) * 0.5
dh_dj[0, :] = height[1, :] - height[0, :]
dh_dj[-1, :] = height[-1, :] - height[-2, :]
del height

slope_east = dh_di / (R * cos_lat_safe[:, None] * step_lon)
slope_north = -dh_dj / (R * step_lat)
del dh_di, dh_dj

enu = np.stack([-slope_east, -slope_north, np.ones_like(slope_east)], axis=-1)
del slope_east, slope_north
enu /= np.linalg.norm(enu, axis=-1, keepdims=True)

cos_lon = np.cos(lon).astype(np.float32)
sin_lon = np.sin(lon).astype(np.float32)
sin_lat = np.sin(lat).astype(np.float32)
# Local geographic basis (pre-world-rotation), one row/column broadcast at a time.
east_geo = np.zeros((Hs, Ws, 3), dtype=np.float32)
east_geo[..., 0] = -sin_lon[None, :]
east_geo[..., 2] = -cos_lon[None, :]
north_geo = np.zeros((Hs, Ws, 3), dtype=np.float32)
north_geo[..., 0] = (-sin_lat[:, None]) * cos_lon[None, :]
north_geo[..., 1] = cos_lat[:, None]
north_geo[..., 2] = sin_lat[:, None] * sin_lon[None, :]
up_geo = np.zeros((Hs, Ws, 3), dtype=np.float32)
up_geo[..., 0] = cos_lat[:, None] * cos_lon[None, :]
up_geo[..., 1] = sin_lat[:, None]
up_geo[..., 2] = -cos_lat[:, None] * sin_lon[None, :]

n_geo = (enu[..., 0:1] * east_geo + enu[..., 1:2] * north_geo + enu[..., 2:3] * up_geo)
del enu, east_geo, north_geo, up_geo

# TO_LOCAL (see geography.ts) is makeBasis(EAST,UP,SOUTH).transpose(): its rows
# are EAST/UP/SOUTH, so applying it to a vector is a dot-product projection
# onto each axis, not a linear combination weighted by the vector's own
# components. Verified numerically against geography.ts's point()/TO_LOCAL
# before running this at full resolution.
n_world = np.stack([
    n_geo @ EAST_W,
    n_geo @ UP_W,
    n_geo @ SOUTH_W,
], axis=-1).astype(np.float32)
del n_geo
n_world /= np.linalg.norm(n_world, axis=-1, keepdims=True)

# Downsample by averaging real vectors, then renormalize -- this is the
# standard way to shrink a normal map without inventing detail (equivalent to
# what mipmap generation does for lighting-only relief).
channels = []
for c in range(3):
    chan = Image.fromarray(n_world[..., c], mode="F").resize((DELIVER_W, DELIVER_H), Image.Resampling.BOX)
    channels.append(np.asarray(chan))
small = np.stack(channels, axis=-1)
small /= np.linalg.norm(small, axis=-1, keepdims=True)
print("delivered mean normal:", small.reshape(-1, 3).mean(axis=0))

packed = np.clip((small * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
asset_path = ROOT / "lunar-relief-normal.webp"
# Lossy at high quality: visually indistinguishable from lossless in a
# hillshade preview at this resolution, but ~8x smaller (6.5 MB vs 55 MB) --
# worth it since the shader renormalizes the decoded vector anyway.
Image.fromarray(packed, mode="RGB").save(asset_path, "WEBP", quality=90, method=6)
asset_bytes = asset_path.read_bytes()

manifest_path = ROOT / "manifest.json"
manifest = json.loads(manifest_path.read_text())
manifest = [entry for entry in manifest if entry.get("asset") != asset_path.name]
manifest.append({
    "role": "global-relief-normal",
    "source": "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_64_uint.tif",
    "sourceBytes": len(source_bytes),
    "sourceSha256": source_sha256,
    "asset": asset_path.name,
    "assetBytes": len(asset_bytes),
    "assetSha256": sha256(asset_bytes).hexdigest(),
    "resolution": f"{DELIVER_W}x{DELIVER_H}",
    "sourceResolution": "23040x11520 (64 px/degree)",
    "method": "finite-difference slope from real LOLA heights -> world-space unit normal, "
              "vector-averaged (not height-averaged) down to delivery resolution, renormalized",
    "encoding": "RGB8, channel = normal_component*0.5+0.5, same equirectangular UV as color/elevation",
})
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Prepared {asset_path.name}: {len(asset_bytes):,} bytes")
