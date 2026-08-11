# Performance Benchmark Design

Status: approved
Date: 2026-06-09

## Purpose

Provide trustworthy before/after evidence for performance optimizations in
`number-flow-react-native`. Every "faster" claim must be backed by same-build
A/B data measured on the UI thread, plus deterministic mechanism tests in CI.

The optimizations this benchmark must be able to detect:

1. Memo-chain busting from the `style = {}` default parameter
   (`native/NumberFlow.tsx`, `native/TimeFlow.tsx`): whole slot tree
   re-renders on every parent render and every value tick.
2. Skia `DigitSlot` per-frame SharedValue array writes: fresh
   `[{ translateY }]` arrays bypass Reanimated's same-value short-circuit
   (verified in `react-native-reanimated@4.1.6` `valueSetter.ts`), so all
   wheel digits re-notify every frame even when parked.
3. Skia `DigitSlot` unconditional `Group layer={<Paint opacity />}`: one
   saveLayer per digit slot per frame even at steady-state opacity 1.
4. Native renderer view count: ~22 host views per digit slot (10 wheel
   digits x Animated.View + Text, plus clip and outer views).

## Structure

```
packages/number-flow-baseline/                            # frozen copy, deleted when work ends
apps/example/src/benchmark/                               # device benchmark screen + runner + stats
packages/number-flow-react-native/src/__tests__/perf/     # Jest mechanism tests (permanent, CI)
specs/                                                    # this document
```

### Baseline package

- Private workspace package (`"private": true`), name `number-flow-baseline`.
- Content: a verbatim snapshot of `packages/number-flow-react-native/src/`
  (and the minimal package.json/tsconfig needed to resolve) taken at the
  pre-optimization commit.
- Excluded from changesets and publishing; never imported by the library.
- Deleted when the optimization round is complete.

## Device tier (accuracy core)

### Measurement primitive

- `useFrameCallback` (Reanimated) records UI-thread frame deltas during a
  recording window.
- Deltas append into a pre-allocated array on the UI thread: no allocation
  and no JS round-trips during recording. The array crosses to JS once,
  after the window closes.
- JS-thread health is measured separately as event-loop drift: expected vs.
  actual `setInterval` firing times during the scenario. This is the metric
  that exposes finding 1 (re-render cost is JS-thread work).

### Workload determinism

All scenarios drive values from a seeded PRNG (fixed seed per scenario).
Both variants animate identical digit transitions, enter/exit events, and
width changes. Without this, differing digit travel distances (9->0 vs 5->6)
masquerade as performance differences.

### Scenarios

Each scenario runs once per renderer (native `NumberFlow`, `SkiaNumberFlow`):

| Scenario | Workload | Primarily exercises |
|---|---|---|
| Ticking single | 1 component, value update every 100ms x 50 ticks | Findings 2, 3; per-tick re-render efficiency |
| Stress grid | 30 components ticking simultaneously, same seed | Findings 1, 2, 3 amplified; "list of prices" case |
| Mount | Mount 30 components cold; `performance.now()` at trigger -> first frame callback after commit; unmount, cooldown, repeat | Finding 4; TTI-style cost |

### A/B protocol

- Interleaved `A B A B ...` x 6 pairs per scenario; the first pair is
  discarded as warm-up. Interleaving makes thermal drift and background
  noise hit both variants symmetrically.
- Per run, computed after recording: median frame time, p95 frame time,
  % frames > 16.7ms, JS event-loop drift (mount scenario reports wall-clock
  mount ms instead of frame stats).
- Verdict rule per metric: report the 5 kept per-pair deltas. All 5 agreeing
  in direction = sign test p ~= 0.03 -> "improved". Mixed signs -> "no
  detectable difference", reported honestly. No single-run numbers.

### Build discipline

- The screen shows a red warning banner when `__DEV__` is true.
- Headline numbers come only from Release builds
  (`bunx expo run:ios --configuration Release`).
- Runbook documents device prep: plugged in, low-power mode off, fixed
  screen brightness, no concurrent foreground activity.

## Jest tier (mechanism proof, CI)

Located in `packages/number-flow-react-native/src/__tests__/perf/`:

1. **Commit-count test**: wrap `NumberFlow` in `<Profiler>`, update `value`
   123 -> 124, assert only the changed `DigitSlot` commits. Fails before the
   `= {}` fix, passes after: a built-in before/after demonstration.
2. **Host-view-count test**: mount a 7-character value, assert the host view
   count as a tracked number (updated deliberately when finding 4 work lands).
3. **SV-write test** (conditional): attach listeners (`addListener`) to the
   Skia digit transform SharedValues during a simulated spin under the
   Reanimated Jest mock; parked digits should produce zero notifications
   after the finding-2 fix. Mock capability must be verified during
   implementation; if the mock cannot count listener notifications, this
   test is dropped and the device tier covers finding 2 alone.

CI never asserts frame-time thresholds (hardware-dependent flake). Jest
asserts only deterministic counts.

## Output

- On-screen results table per scenario: variant medians, per-pair deltas,
  verdict.
- Copyable JSON blob: device model, OS version, build type (`__DEV__`),
  scenario config (seed, tick count, grid size), per-run raw stats and
  per-pair deltas. Pasteable into PRs.

## External validation (one-off, not automated)

A short runbook (`apps/example/src/benchmark/RUNBOOK.md`) covering:

- Device prep checklist (see Build discipline).
- Capturing an Xcode Instruments / Metal frame trace to count actual Skia
  saveLayers before/after the finding-3 change: the only place saveLayer
  counts are directly visible, validating that the frame-time proxy moved
  for the claimed reason.

## Out of scope

- CI frame-time thresholds.
- Android-specific tooling (Flashlight); add later only if iOS results are
  ambiguous.
- Scrubbing scenario (excluded by decision; can be added as a follow-up).

## Success criteria

- Benchmark screen produces stable verdicts: re-running the full suite twice
  on the same device yields the same verdict per scenario/metric.
- Jest perf tests run green in CI. The commit-count test is first verified
  red against the unfixed library (proving sensitivity), then ships in the
  same change as the `= {}` fix so CI is never red on main.
- The three scenarios produce a copyable JSON report suitable for PR
  descriptions.
