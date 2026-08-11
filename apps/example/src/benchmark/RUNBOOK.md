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

## Validating the Skia saveLayer change (finding 3)

Frame times are a proxy. To see actual saveLayers once, capture a GPU frame:

1. Build Release from Xcode (`apps/example/ios/example.xcworkspace`);
   use Debug -> Capture GPU Workload while the stress-grid Skia scenario
   is running.
2. In the capture, count render passes / offscreen textures attributable to
   the NumberFlow canvas before and after the change.
3. Expect: roughly one offscreen layer per digit slot before; near zero for
   steady-state slots after.
