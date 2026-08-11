"""
Phase-tolerant parity analysis for the VisualParity screen.

Three metrics, each answering a different question:

1. INK MASS curve (position-insensitive, opacity-sensitive)
   Total ink per row per frame. Two implementations that differ in opacity
   compositing produce different ink-mass curves even if every glyph sits at
   the same place. Compared after best integer lag alignment, so an animation
   phase offset between the two component instances does not register.

2. SETTLED frames (no timing confound at all)
   Frames where both rows have been visually static for >= STATIC_RUN frames.
   Animation is finished, so the two rows MUST agree pixel for pixel; any
   difference here is a real steady-state rendering difference.

3. ANIMATING frame residual, time+shift tolerant
   For the worst animating frames, search a temporal window and a small
   vertical shift for the best match, then report the residual restricted to
   "solid ink" pixels (both rows dark, away from glyph edges). Antialiasing
   at glyph boundaries dominates any sub-pixel offset; interior ink does not.

Usage: python parity-analyze.py <video.mp4> <outdir>
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Must mirror VisualParityScreen.tsx
ROW_TOP = 80
ROW_HEIGHT = 90
ROW_LEFT = 16
ROW_WIDTH = 370
LOGICAL_WIDTH = 402  # iPhone 17 Pro points

PAIRS = (("native", 0, 1), ("skia", 2, 3))

NOISE_THRESHOLD = 24  # per-channel diff treated as codec/AA noise
STATIC_EPS = 1.5  # signature delta below this means "not moving"
STATIC_RUN = 8  # frames of stillness before a frame counts as settled
LAG_WINDOW = 15  # frames searched for ink-mass curve alignment
ALIGN_WINDOW = 4  # frames searched for per-frame pixel alignment
SHIFT_PX = 3  # vertical pixels searched for per-frame pixel alignment
INK_LEVEL = 90  # gray below this counts as "solid ink"

video, outdir = sys.argv[1], Path(sys.argv[2])
frames_dir = outdir / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)

if not any(frames_dir.glob("f*.png")):
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-fps_mode", "passthrough",
         str(frames_dir / "f%05d.png")],
        check=True,
    )

frame_files = sorted(frames_dir.glob("f*.png"))
n = len(frame_files)
first = Image.open(frame_files[0])
scale = first.width / LOGICAL_WIDTH
print(f"frames: {n}   video {first.width}x{first.height}   scale {scale:g}")

X0 = round(ROW_LEFT * scale)
W = round(ROW_WIDTH * scale)
H = round(ROW_HEIGHT * scale)


def row_bounds(row: int) -> tuple[int, int]:
    y0 = round((ROW_TOP + row * ROW_HEIGHT) * scale)
    return y0, y0 + H


def gray_of(path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("L"), dtype=np.float32)


# ---- Pass 1: streaming ink mass + coarse signature -------------------------

ink = np.zeros((4, n), dtype=np.float64)
sig = np.zeros((4, n, 8, 16), dtype=np.float32)

for i, f in enumerate(frame_files):
    g = gray_of(f)
    for row in range(4):
        y0, y1 = row_bounds(row)
        crop = g[y0:y1, X0 : X0 + W]
        ink[row, i] = float((255.0 - crop).sum()) / 255.0
        # 8x16 block means as a cheap motion/staticness signature
        bh, bw = crop.shape[0] // 8, crop.shape[1] // 16
        sig[row, i] = crop[: bh * 8, : bw * 16].reshape(8, bh, 16, bw).mean(axis=(1, 3))

print("pass 1 done")

# ---- Metric 1: ink-mass curves, best integer lag ---------------------------

print("\n=== METRIC 1: ink mass (opacity-sensitive, position-insensitive) ===")
for name, ra, rb in PAIRS:
    a, b = ink[ra], ink[rb]
    best = None
    for lag in range(-LAG_WINDOW, LAG_WINDOW + 1):
        if lag >= 0:
            x, y = a[lag:], b[: n - lag] if lag else b
        else:
            x, y = a[: n + lag], b[-lag:]
        err = float(np.abs(x - y).mean())
        if best is None or err < best[1]:
            best = (lag, err, x, y)

    lag, _, x, y = best
    scale_ref = max(float(np.abs(y).mean()), 1.0)
    rel = np.abs(x - y) / scale_ref
    print(
        f"  {name:7s} best lag={lag:+d} frames   "
        f"mean|dInk|={float(np.abs(x - y).mean()):8.1f}px  "
        f"({rel.mean() * 100:.2f}% mean, {rel.max() * 100:.2f}% max of mean ink)"
    )

# ---- Metric 2: settled frames, exact comparison ----------------------------


def static_mask(row: int) -> np.ndarray:
    d = np.abs(np.diff(sig[row], axis=0)).reshape(n - 1, -1).max(axis=1)
    still = np.concatenate([[False], d < STATIC_EPS])
    out = np.zeros(n, dtype=bool)
    run = 0
    for i in range(n):
        run = run + 1 if still[i] else 0
        out[i] = run >= STATIC_RUN
    return out


print("\n=== METRIC 2: settled frames (must be pixel-identical) ===")
for name, ra, rb in PAIRS:
    settled = static_mask(ra) & static_mask(rb)
    idx = np.flatnonzero(settled)
    if idx.size == 0:
        print(f"  {name:7s} no settled frames found")
        continue

    worst = (0, 0.0, -1)
    for i in idx:
        g = gray_of(frame_files[i])
        ya0, ya1 = row_bounds(ra)
        yb0, yb1 = row_bounds(rb)
        d = np.abs(g[ya0:ya1, X0 : X0 + W] - g[yb0:yb1, X0 : X0 + W])
        bad = float((d > NOISE_THRESHOLD).mean())
        if bad > worst[1]:
            worst = (int(d.max()), bad, int(i) + 1)

    print(
        f"  {name:7s} {idx.size:5d} settled frames   "
        f"worst: frame f{worst[2]:05d} maxAbs={worst[0]:3d} "
        f"badPixels={worst[1] * 100:.4f}%"
    )

# ---- Metric 3: animating frames, time + shift tolerant interior residual ---

print("\n=== METRIC 3: animating frames, time+shift aligned, interior ink ===")
for name, ra, rb in PAIRS:
    animating = ~(static_mask(ra) & static_mask(rb))
    cand = np.flatnonzero(animating)
    if cand.size == 0:
        print(f"  {name:7s} no animating frames")
        continue

    # Sample evenly so the whole script is represented without reloading all frames
    sample = cand[:: max(1, cand.size // 120)][:120]
    ya0, _ = row_bounds(ra)
    yb0, _ = row_bounds(rb)

    worst_full = (0.0, -1)
    worst_interior = (0.0, -1)

    for i in sample:
        cur = gray_of(frame_files[i])[ya0 : ya0 + H, X0 : X0 + W]
        best = None

        for k in range(max(0, i - ALIGN_WINDOW), min(n, i + ALIGN_WINDOW + 1)):
            gb = gray_of(frame_files[k])
            for dy in range(-SHIFT_PX, SHIFT_PX + 1):
                y0 = yb0 + dy
                bas = gb[y0 : y0 + H, X0 : X0 + W]
                if bas.shape != cur.shape:
                    continue
                d = np.abs(cur - bas)
                full_bad = float((d > NOISE_THRESHOLD).mean())
                if best is None or full_bad < best[0]:
                    # Interior ink: both rows solidly dark, eroded away from edges
                    both_ink = (cur < INK_LEVEL) & (bas < INK_LEVEL)
                    inner = both_ink.copy()
                    for sy, sx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        inner &= np.roll(both_ink, (sy, sx), axis=(0, 1))
                    interior = float(d[inner].mean()) if inner.any() else 0.0
                    best = (full_bad, interior)

        if best[0] > worst_full[0]:
            worst_full = (best[0], int(i) + 1)
        if best[1] > worst_interior[0]:
            worst_interior = (best[1], int(i) + 1)

    print(
        f"  {name:7s} {sample.size:3d} sampled   "
        f"worst full badPixels={worst_full[0] * 100:.3f}% (f{worst_full[1]:05d})   "
        f"worst interior mean|d|={worst_interior[0]:.2f}/255 (f{worst_interior[1]:05d})"
    )
