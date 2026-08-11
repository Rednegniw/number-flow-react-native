"""
Frame-by-frame parity diff for the VisualParity screen.

Extracts every frame of a simulator screen recording, crops the four
component rows (0=current native, 1=baseline native, 2=current skia,
3=baseline skia), and pixel-diffs each current/baseline pair. Both
variants live in the SAME frame, so encoder timing cannot skew results.

Usage: python parity-diff.py <video.mp4> <outdir>
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Must mirror VisualParityScreen.tsx constants (pt)
ROW_TOP = 80
ROW_HEIGHT = 90
ROW_LEFT = 16
ROW_WIDTH = 370
LOGICAL_WIDTH = 402  # iPhone 17 Pro points

# Per-pixel channel difference below this is treated as codec/AA noise
NOISE_THRESHOLD = 24
# Fraction of pixels allowed above the noise threshold per frame
MAX_BAD_PIXEL_FRACTION = 0.001

video, outdir = sys.argv[1], Path(sys.argv[2])
frames_dir = outdir / "frames"
worst_dir = outdir / "worst"
frames_dir.mkdir(parents=True, exist_ok=True)
worst_dir.mkdir(parents=True, exist_ok=True)

# fps_mode passthrough: extract only real frames (no CFR duplication)
subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-fps_mode", "passthrough",
     str(frames_dir / "f%05d.png")],
    check=True,
)

frame_files = sorted(frames_dir.glob("f*.png"))
print(f"frames extracted: {len(frame_files)}")

first = Image.open(frame_files[0])
scale = first.width / LOGICAL_WIDTH
print(f"video {first.width}x{first.height}, scale {scale:g}")


def crop_row(img: Image.Image, row: int) -> np.ndarray:
    x0 = round(ROW_LEFT * scale)
    y0 = round((ROW_TOP + row * ROW_HEIGHT) * scale)
    w = round(ROW_WIDTH * scale)
    h = round(ROW_HEIGHT * scale)
    return np.asarray(img.crop((x0, y0, x0 + w, y0 + h)).convert("RGB"), dtype=np.int16)


# Temporal alignment window: a variant may render 1-2 display frames behind
# its counterpart when the compositor drops frames (a performance artifact,
# not a rendering difference). Compare current@N against baseline@N+/-k and
# keep the best match; with 4x slow-motion animations this cleanly separates
# "renders later" from "renders wrong".
ALIGN_WINDOW = 3

from functools import lru_cache


@lru_cache(maxsize=16)
def load_frame(frame_idx: int) -> np.ndarray:
    return np.asarray(Image.open(frame_files[frame_idx]).convert("RGB"), dtype=np.int16)


def load_crop(frame_idx: int, row: int) -> np.ndarray:
    arr = load_frame(frame_idx)
    x0 = round(ROW_LEFT * scale)
    y0 = round((ROW_TOP + row * ROW_HEIGHT) * scale)
    w = round(ROW_WIDTH * scale)
    h = round(ROW_HEIGHT * scale)
    return arr[y0 : y0 + h, x0 : x0 + w]


results = {"native": [], "skia": []}
n = len(frame_files)

for pair, (ra, rb) in (("native", (0, 1)), ("skia", (2, 3))):
    for i in range(n):
        best = None
        cur = load_crop(i, ra)
        for k in range(max(0, i - ALIGN_WINDOW), min(n, i + ALIGN_WINDOW + 1)):
            px_max = np.abs(cur - load_crop(k, rb)).max(axis=2)
            bad = (px_max > NOISE_THRESHOLD).mean()
            cand = (i + 1, int(px_max.max()), float(bad), float(px_max.mean()))
            if best is None or cand[2] < best[2]:
                best = cand
        results[pair].append(best)

for pair, rows in results.items():
    worst = sorted(rows, key=lambda r: r[2], reverse=True)[:5]
    n_fail = sum(1 for r in rows if r[2] > MAX_BAD_PIXEL_FRACTION)
    overall_max = max(r[1] for r in rows)
    print(f"\n== {pair}: {len(rows)} frames, maxAbsDiff(all frames)={overall_max}, "
          f"frames failing (> {MAX_BAD_PIXEL_FRACTION*100:.1f}% pixels over {NOISE_THRESHOLD}): {n_fail}")
    print("   worst frames (frame#, maxAbs, badFrac, meanAbs):")
    for r in worst:
        print(f"     f{r[0]:05d}  max={r[1]:3d}  bad={r[2]*100:.3f}%  mean={r[3]:.2f}")

    # Save side-by-side crops of the worst frames for eyeballing
    for r in worst[:3]:
        img = Image.open(frame_files[r[0] - 1])
        a, b = (0, 1) if pair == "native" else (2, 3)
        top = Image.fromarray(crop_row(img, a).astype(np.uint8))
        bot = Image.fromarray(crop_row(img, b).astype(np.uint8))
        d = np.abs(crop_row(img, a) - crop_row(img, b)).max(axis=2)
        heat = Image.fromarray(np.clip(d * 4, 0, 255).astype(np.uint8))
        combo = Image.new("RGB", (top.width, top.height * 3 + 8), "white")
        combo.paste(top, (0, 0))
        combo.paste(bot, (0, top.height + 4))
        combo.paste(heat.convert("RGB"), (0, top.height * 2 + 8))
        combo.save(worst_dir / f"{pair}-f{r[0]:05d}.png")

print(f"\nworst-frame composites saved to {worst_dir}")
