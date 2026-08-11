# Benchmark Runbook

## Producing headline numbers

1. Build Release: `bun run example ios:release` (dev builds show a red banner
   and are for harness debugging only).
2. Device prep: physical device preferred over simulator; plugged in;
   Low Power Mode off; screen brightness fixed; no other foreground apps;
   let the device sit idle ~1 min after boot before running.
3. Open Home -> Benchmark -> Run full suite. Do not interact with the device
   while it runs (~10 min).
4. Share JSON and attach it to the PR. Run the suite twice; verdicts must
   match between runs to be reportable.

## Reading the results

- Each metric shows 5 per-pair deltas (current minus baseline; negative =
  current faster). "improved"/"regressed" requires all 5 deltas to agree in
  sign (sign test, p ~= 0.03). Anything else is "inconclusive".
- The baseline package is a frozen snapshot. If `packages/number-flow-baseline`
  has drifted (check `git log packages/number-flow-baseline`), re-snapshot it
  from the commit you want to compare against before trusting results.

## Verifying no visual regression, frame by frame

The Benchmark screen answers "is it faster". The Visual Parity screen answers
"does it still look identical", by rendering current and baseline side by side
in one screen recording and diffing every extracted frame.

### Procedure

1. Home -> Visual Parity. Start a screen recording, then tap
   **Run A/B (current vs baseline)** and let the script finish (~44 s):

   ```bash
   xcrun simctl io <udid> recordVideo --codec h264 --force parity.mp4
   ```

2. Repeat with **Run control (current vs current)** into `parity-control.mp4`.
   This step is mandatory, not optional: the two rows of a pair are separate
   component instances animating on independent `withTiming` clocks, and they
   sit at different screen positions, so the codec quantizes their glyph edges
   differently. The control run measures that noise floor.

3. Analyze both (needs `pillow`, `numpy`, and `ffmpeg` on PATH):

   ```bash
   python tools/parity-analyze.py parity.mp4 parity-out
   ```

   `tools/parity-diff.py` renders side-by-side composites of the worst frames
   when you want to eyeball a specific one.

### Reading the output

Three metrics, each isolating a different failure mode:

- **Ink mass** (total ink per row per frame, compared after best lag
  alignment): position- and phase-insensitive, directly sensitive to opacity
  compositing changes.
- **Settled frames** (both rows static for >= 8 frames): no timing confound
  exists, so any steady-state rendering difference shows up here.
- **Animating frames** (time- and shift-aligned, residual restricted to
  interior ink away from glyph edges): antialiasing at edges dominates any
  sub-pixel offset, interior ink does not.

A metric only indicates a regression when the A/B number exceeds the control
number for the same metric. Interpreting A/B in isolation will produce false
positives, especially on Skia.

### Recorded result for the current optimization round

A/B over 5,095 frames vs control over 5,906 frames:

| Metric | Renderer | A/B | Control (floor) |
|---|---|---|---|
| Ink mass, mean deviation | native | 0.01% | 0.02% |
| Ink mass, mean deviation | skia | 0.25% | 0.22% |
| Settled, worst bad pixels | native | 0.019% | 0.029% |
| Settled, worst bad pixels | skia | 0.468% | 0.445% |
| Animating, worst bad pixels | native | 0.024% | 0.367% |
| Animating, worst bad pixels | skia | 2.006% | 2.408% |
| Animating, worst interior ink | native | 0.80/255 | 0.80/255 |
| Animating, worst interior ink | skia | 6.70/255 | 4.98/255 |

Every A/B figure sits at or below its control floor, so no visual difference
is detectable. Native is effectively exact. The Skia floor is coarse (~0.45%
of edge pixels) because of codec quantization, so this method cannot resolve a
Skia difference smaller than that; the ink-mass metric covers the opacity
question independently and also shows no signal.

## Validating the Skia saveLayer change (finding 3)

Frame times are a proxy. To see actual saveLayers once, capture a GPU frame:

1. Build Release from Xcode (`apps/example/ios/example.xcworkspace`);
   use Debug -> Capture GPU Workload while the stress-grid Skia scenario
   is running.
2. In the capture, count render passes / offscreen textures attributable to
   the NumberFlow canvas before and after the change.
3. Expect: roughly one offscreen layer per digit slot before; near zero for
   steady-state slots after.
