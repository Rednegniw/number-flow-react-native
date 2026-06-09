# Performance Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two-tier performance benchmark from `specs/2026-06-09-perf-benchmark-design.md`: a frozen-baseline A/B benchmark screen in the example app, plus deterministic Jest mechanism tests in the library.

**Architecture:** A private workspace package `number-flow-baseline` freezes the current library source so one app build renders both implementations. The example app gets a `Benchmark` screen that interleaves current/baseline runs (ABAB x 6 pairs, first pair discarded) over seeded deterministic workloads, recording UI-thread frame deltas via Reanimated `useFrameCallback` and JS event-loop drift. A second Jest config in the library (React Native preset + `@testing-library/react-native`) proves render-commit mechanics deterministically.

**Tech Stack:** Bun workspaces, Expo SDK 54 / RN 0.81.5, Reanimated 4.1.6 (`useFrameCallback`, `setUpTests`), @shopify/react-native-skia, Jest 30, @testing-library/react-native.

**Verified facts this plan relies on (do not re-derive):**
- Reanimated 4.1.6 exports `setUpTests` from its index and `useFrameCallback` whose `FrameInfo.timeSincePreviousFrame` is `number | null` (null on first frame).
- `react-native-worklets/plugin` exists in root `node_modules` (Reanimated 4 babel plugin).
- The library's existing Jest setup (`jest.config.js`) is node-env ts-jest with Reanimated stubbed; it only runs `<rootDir>/__tests__/*.test.ts`. Component tests need a separate config.
- `metricsCache`, `cacheKey(style, additionalChars)`, `buildCharSet` are exported from `src/native/glyphMetricsShared.ts`. Seeding the cache makes `NumberFlow` render its slot tree synchronously (`slotsReady` initializes to `!!metrics`).
- Changesets config ignores `["example", "docs"]`; biome includes everything not explicitly excluded.
- Example app navigation: native-stack with lazy `require()` for Skia screens, routes in `src/navigation/types.ts`.
- The jest SV-write test from the spec is **dropped** (drop path the spec allows): the Skia `DigitSlot` transform SharedValues are component-internal and unreachable from outside, so no listener can be attached even in principle. The device tier covers finding 2; the future optimization PR should extract its "skip unchanged write" logic as a pure function and unit-test it in the existing node-env Jest.

---

### Task 1: Baseline workspace package

**Files:**
- Create: `packages/number-flow-baseline/package.json`
- Create: `packages/number-flow-baseline/src/**` (snapshot copy)
- Modify: `apps/example/package.json` (add dependency)
- Modify: `.changeset/config.json` (ignore baseline)
- Modify: `biome.json` (exclude baseline)

- [ ] **Step 1: Snapshot the library source**

```bash
mkdir -p packages/number-flow-baseline
cp -R packages/number-flow-react-native/src packages/number-flow-baseline/src
```

- [ ] **Step 2: Create the baseline package.json**

Create `packages/number-flow-baseline/package.json`:

```json
{
  "name": "number-flow-baseline",
  "version": "0.0.0",
  "private": true,
  "description": "Frozen pre-optimization snapshot of number-flow-react-native, used only by the example app's benchmark screen for same-build A/B comparison. Never edit src/ here; delete this package when the optimization round ends.",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "react-native": "./src/index.ts",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "react-native": "./src/index.ts",
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./package.json": "./package.json"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-native": ">=0.73",
    "react-native-reanimated": ">=3.0.0"
  }
}
```

- [ ] **Step 3: Wire it into the example app**

In `apps/example/package.json` dependencies, add (alphabetical position, after `expo-status-bar`):

```json
"number-flow-baseline": "workspace:*",
```

- [ ] **Step 4: Exclude from changesets and biome**

In `.changeset/config.json` change:

```json
"ignore": ["example", "docs"]
```

to:

```json
"ignore": ["example", "docs", "number-flow-baseline"]
```

In `biome.json`, add to `files.includes` after `"!**/ios"`:

```json
"!**/packages/number-flow-baseline"
```

- [ ] **Step 5: Install and verify resolution**

```bash
bun install
ls node_modules/number-flow-baseline/src/index.ts
```

Expected: the file path prints (workspace symlink resolved). Also run `bun run lint` and expect no new diagnostics from the baseline package.

- [ ] **Step 6: Commit**

```bash
git add packages/number-flow-baseline apps/example/package.json .changeset/config.json biome.json bun.lock
git commit -m "chore(bench): add frozen baseline package for A/B benchmarking"
```

---

### Task 2: Benchmark core utilities (types, PRNG, stats)

**Files:**
- Create: `apps/example/src/benchmark/types.ts`
- Create: `apps/example/src/benchmark/prng.ts`
- Create: `apps/example/src/benchmark/stats.ts`

These are pure TypeScript; the example app has no Jest, so verification is type-checking plus the device smoke test in Task 6.

- [ ] **Step 1: Create types.ts**

```ts
export type ScenarioKind = "tick-single" | "stress-grid" | "mount";
export type RendererKind = "native" | "skia";
export type VariantKind = "current" | "baseline";
export type Verdict = "improved" | "regressed" | "inconclusive";

export interface RunSpec {
  scenario: ScenarioKind;
  renderer: RendererKind;
  variant: VariantKind;
  pairIndex: number;
}

export interface RunStats {
  /** UI-thread frame delta stats (tick scenarios only) */
  medianMs?: number;
  p95Ms?: number;
  pctOverBudget?: number;
  frames?: number;

  /** JS event-loop lateness p95 (tick scenarios only) */
  jsDriftP95Ms?: number;

  /** Wall-clock mount duration (mount scenario only) */
  mountMs?: number;
}

export interface RunRecord extends RunSpec {
  stats: RunStats;
}

export interface MetricComparison {
  metric: keyof RunStats;
  /** current - baseline, per kept pair (lower is better for all metrics) */
  deltas: number[];
  verdict: Verdict;
}

export interface ScenarioReport {
  scenario: ScenarioKind;
  renderer: RendererKind;
  comparisons: MetricComparison[];
  runs: RunRecord[];
}

export interface BenchmarkReport {
  os: string;
  osVersion: string;
  devBuild: boolean;
  config: { pairs: number; warmupPairs: number; ticks: number; tickMs: number; gridCount: number; seed: number };
  scenarios: ScenarioReport[];
}
```

- [ ] **Step 2: Create prng.ts**

```ts
/**
 * Deterministic PRNG (mulberry32). Both variants of a pair replay the exact
 * same value sequence so digit travel distances and enter/exit events are
 * identical; without this, workload differences masquerade as perf deltas.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rows = ticks + 1 (row 0 is the initial pre-tick value set), cols = cells */
export function makeValueMatrix(seed: number, rows: number, cols: number): number[][] {
  const rand = mulberry32(seed);

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(10000 + rand() * 89990)),
  );
}
```

- [ ] **Step 3: Create stats.ts**

```ts
import type { RunStats, Verdict } from "./types";

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

const FRAME_BUDGET_MS = 16.7;

export function summarizeFrames(frameDeltas: number[], drifts: number[]): RunStats {
  const overBudget = frameDeltas.filter((d) => d > FRAME_BUDGET_MS).length;

  return {
    medianMs: median(frameDeltas),
    p95Ms: percentile(frameDeltas, 95),
    pctOverBudget: frameDeltas.length > 0 ? (100 * overBudget) / frameDeltas.length : 0,
    frames: frameDeltas.length,
    jsDriftP95Ms: percentile(drifts, 95),
  };
}

/**
 * Sign test over kept pairs: all deltas negative (current faster) means
 * "improved" with p ~= 2^-(n) two-sided ~ 0.06, one-sided ~ 0.03 for n = 5.
 * Any tie or mixed signs is reported as inconclusive; no averaging tricks.
 */
export function signVerdict(deltas: number[]): Verdict {
  if (deltas.length === 0) return "inconclusive";
  if (deltas.every((d) => d < 0)) return "improved";
  if (deltas.every((d) => d > 0)) return "regressed";
  return "inconclusive";
}
```

- [ ] **Step 4: Type-check and commit**

```bash
bunx tsc --noEmit -p apps/example/tsconfig.json
git add apps/example/src/benchmark
git commit -m "feat(bench): benchmark types, seeded PRNG, and stats helpers"
```

Expected: tsc exits 0.

---

### Task 3: UI-thread frame recorder and JS tick driver

**Files:**
- Create: `apps/example/src/benchmark/useFrameRecorder.ts`
- Create: `apps/example/src/benchmark/runTicks.ts`

- [ ] **Step 1: Create useFrameRecorder.ts**

```ts
import { useCallback } from "react";
import { runOnJS, runOnUI, useFrameCallback } from "react-native-reanimated";

declare global {
  var __benchFrames: number[] | undefined;
}

/**
 * Records UI-thread frame deltas into a worklet-runtime global array.
 * Nothing crosses to JS and nothing is allocated per frame beyond the
 * array push, so the recorder does not perturb what it measures.
 * The buffer crosses to JS exactly once, in stop().
 */
export function useFrameRecorder(): {
  start: () => void;
  stop: () => Promise<number[]>;
} {
  const frameCallback = useFrameCallback((info) => {
    const delta = info.timeSincePreviousFrame;
    if (delta === null) return;

    const buffer = global.__benchFrames;
    if (buffer !== undefined) buffer.push(delta);
  }, false);

  const start = useCallback(() => {
    runOnUI(() => {
      global.__benchFrames = [];
    })();
    frameCallback.setActive(true);
  }, [frameCallback]);

  const stop = useCallback((): Promise<number[]> => {
    frameCallback.setActive(false);

    return new Promise<number[]>((resolve) => {
      runOnUI(() => {
        const frames = global.__benchFrames ?? [];
        global.__benchFrames = undefined;
        runOnJS(resolve)(frames);
      })();
    });
  }, [frameCallback]);

  return { start, stop };
}
```

- [ ] **Step 2: Create runTicks.ts**

```ts
/**
 * Drives `count` value updates at `intervalMs` and measures JS event-loop
 * lateness: how far behind schedule each tick fired. Re-render cost on the
 * JS thread shows up directly in this number.
 */
export function runTicks(
  count: number,
  intervalMs: number,
  onTick: (tickIndex: number) => void,
): Promise<number[]> {
  return new Promise((resolve) => {
    const drifts: number[] = [];
    const startTime = performance.now();
    let i = 0;

    const id = setInterval(() => {
      const expected = startTime + (i + 1) * intervalMs;
      drifts.push(performance.now() - expected);

      i++;
      onTick(i);

      if (i >= count) {
        clearInterval(id);
        resolve(drifts);
      }
    }, intervalMs);
  });
}
```

- [ ] **Step 3: Type-check and commit**

```bash
bunx tsc --noEmit -p apps/example/tsconfig.json
git add apps/example/src/benchmark
git commit -m "feat(bench): UI-thread frame recorder and JS tick driver"
```

---

### Task 4: Scenario components

**Files:**
- Create: `apps/example/src/benchmark/ScenarioContent.tsx`

- [ ] **Step 1: Create ScenarioContent.tsx**

```tsx
import { Canvas, type SkFont } from "@shopify/react-native-skia";
import {
  NumberFlow as BaselineNumberFlow,
  SkiaNumberFlow as BaselineSkiaNumberFlow,
} from "number-flow-baseline";
import { NumberFlow, SkiaNumberFlow } from "number-flow-react-native";
import { View } from "react-native";
import type { RunSpec } from "./types";

export const GRID_COUNT = 30;
const GRID_COLS = 3;
const CELL_WIDTH = 120;
const CELL_HEIGHT = 32;

interface ScenarioContentProps {
  spec: RunSpec;
  values: number[];
  fontLarge: SkFont | null;
  fontSmall: SkFont | null;
}

/**
 * Renders the workload for one run. The mount scenario reuses the grid
 * shape; the runner controls mounting/unmounting around it.
 */
export const ScenarioContent = ({ spec, values, fontLarge, fontSmall }: ScenarioContentProps) => {
  const isBaseline = spec.variant === "baseline";
  const NF = isBaseline ? BaselineNumberFlow : NumberFlow;
  const SNF = isBaseline ? BaselineSkiaNumberFlow : SkiaNumberFlow;
  const isSingle = spec.scenario === "tick-single";

  if (spec.renderer === "native") {
    if (isSingle) {
      return <NF style={{ fontSize: 32 }} value={values[0]} />;
    }

    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: GRID_COLS * CELL_WIDTH }}>
        {values.map((v, i) => (
          <View key={i} style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}>
            <NF style={{ fontSize: 16 }} value={v} />
          </View>
        ))}
      </View>
    );
  }

  if (!fontLarge || !fontSmall) return null;

  if (isSingle) {
    return (
      <Canvas style={{ width: 240, height: 48 }}>
        <SNF font={fontLarge} value={values[0]} x={0} y={36} />
      </Canvas>
    );
  }

  const cells = values.map((v, i) => ({
    value: v,
    x: (i % GRID_COLS) * CELL_WIDTH,
    y: 20 + Math.floor(i / GRID_COLS) * CELL_HEIGHT,
  }));
  const canvasHeight = Math.ceil(values.length / GRID_COLS) * CELL_HEIGHT + 8;

  return (
    <Canvas style={{ width: GRID_COLS * CELL_WIDTH, height: canvasHeight }}>
      {cells.map((cell, i) => (
        <SNF font={fontSmall} key={i} value={cell.value} x={cell.x} y={cell.y} />
      ))}
    </Canvas>
  );
};
```

- [ ] **Step 2: Type-check and commit**

```bash
bunx tsc --noEmit -p apps/example/tsconfig.json
git add apps/example/src/benchmark
git commit -m "feat(bench): variant-parameterized scenario components"
```

Note: if tsc reports that the baseline package's prop types do not resolve, mirror whatever fix the `number-flow-react-native` resolution uses in `apps/example/tsconfig.json` (the lib resolves today via its exports map; the baseline copies that map with all conditions pointing at `src/`).

---

### Task 5: Benchmark runner screen and navigation entry

**Files:**
- Create: `apps/example/src/benchmark/BenchmarkScreen.tsx`
- Modify: `apps/example/src/navigation/types.ts`
- Modify: `apps/example/src/navigation/RootNavigator.tsx`
- Modify: `apps/example/src/screens/HomeScreen.tsx`

- [ ] **Step 1: Create BenchmarkScreen.tsx**

```tsx
import { useFont } from "@shopify/react-native-skia";
import { useCallback, useRef, useState } from "react";
import { Platform, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DemoButton } from "../components/DemoButton";
import { colors } from "../theme/colors";
import { FONT_REGULAR, FONT_SEMIBOLD, INTER_FONT_ASSET } from "../theme/fonts";
import { makeValueMatrix } from "./prng";
import { runTicks } from "./runTicks";
import { GRID_COUNT, ScenarioContent } from "./ScenarioContent";
import { signVerdict, summarizeFrames } from "./stats";
import type {
  BenchmarkReport,
  MetricComparison,
  RendererKind,
  RunRecord,
  RunSpec,
  RunStats,
  ScenarioKind,
  ScenarioReport,
} from "./types";
import { useFrameRecorder } from "./useFrameRecorder";

const PAIRS = 6;
const WARMUP_PAIRS = 1;
const TICKS = 50;
const TICK_MS = 100;
const SETTLE_MS = 500;
const COOLDOWN_MS = 800;
const BASE_SEED = 0xc0ffee;

const SCENARIOS: ScenarioKind[] = ["tick-single", "stress-grid", "mount"];
const RENDERERS: RendererKind[] = ["native", "skia"];
const TICK_METRICS: (keyof RunStats)[] = ["medianMs", "p95Ms", "pctOverBudget", "jsDriftP95Ms"];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildRunQueue(): RunSpec[] {
  const queue: RunSpec[] = [];

  for (const scenario of SCENARIOS) {
    for (const renderer of RENDERERS) {
      for (let pairIndex = 0; pairIndex < PAIRS; pairIndex++) {
        queue.push({ scenario, renderer, variant: "current", pairIndex });
        queue.push({ scenario, renderer, variant: "baseline", pairIndex });
      }
    }
  }

  return queue;
}

/** Seed varies by scenario and pair, never by variant: A and B replay identical workloads. */
function seedFor(spec: RunSpec): number {
  return BASE_SEED + SCENARIOS.indexOf(spec.scenario) * 1000 + spec.pairIndex;
}

function buildReport(records: RunRecord[]): BenchmarkReport {
  const scenarios: ScenarioReport[] = [];

  for (const scenario of SCENARIOS) {
    for (const renderer of RENDERERS) {
      const runs = records.filter((r) => r.scenario === scenario && r.renderer === renderer);
      const metrics = scenario === "mount" ? (["mountMs"] as (keyof RunStats)[]) : TICK_METRICS;

      const comparisons: MetricComparison[] = metrics.map((metric) => {
        const deltas: number[] = [];

        for (let p = WARMUP_PAIRS; p < PAIRS; p++) {
          const current = runs.find((r) => r.variant === "current" && r.pairIndex === p);
          const baseline = runs.find((r) => r.variant === "baseline" && r.pairIndex === p);
          const cv = current?.stats[metric];
          const bv = baseline?.stats[metric];
          if (cv !== undefined && bv !== undefined) deltas.push(cv - bv);
        }

        return { metric, deltas, verdict: signVerdict(deltas) };
      });

      scenarios.push({ scenario, renderer, comparisons, runs });
    }
  }

  return {
    os: Platform.OS,
    osVersion: String(Platform.Version),
    devBuild: __DEV__,
    config: {
      pairs: PAIRS,
      warmupPairs: WARMUP_PAIRS,
      ticks: TICKS,
      tickMs: TICK_MS,
      gridCount: GRID_COUNT,
      seed: BASE_SEED,
    },
    scenarios,
  };
}

export const BenchmarkScreen = () => {
  const insets = useSafeAreaInsets();
  const fontLarge = useFont(INTER_FONT_ASSET, 32);
  const fontSmall = useFont(INTER_FONT_ASSET, 16);
  const recorder = useFrameRecorder();

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [activeSpec, setActiveSpec] = useState<RunSpec | null>(null);
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(true);
  const [report, setReport] = useState<BenchmarkReport | null>(null);

  const matrixRef = useRef<number[][]>([[0]]);
  const mountResolveRef = useRef<(() => void) | null>(null);

  /**
   * Mount timing resolves after two animation frames following layout:
   * NumberFlow renders a placeholder Text on its first committed frame and
   * swaps in the slot tree one rAF later, so frame two is the real tree.
   */
  const handleMountLayout = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mountResolveRef.current?.();
        mountResolveRef.current = null;
      });
    });
  }, []);

  const runAll = useCallback(async () => {
    setPhase("running");
    setReport(null);
    const queue = buildRunQueue();
    const records: RunRecord[] = [];

    for (let qi = 0; qi < queue.length; qi++) {
      const spec = queue[qi];
      setProgress(`${qi + 1}/${queue.length}  ${spec.scenario} ${spec.renderer} ${spec.variant} #${spec.pairIndex}`);

      const cellCount = spec.scenario === "tick-single" ? 1 : GRID_COUNT;
      matrixRef.current = makeValueMatrix(seedFor(spec), TICKS + 1, cellCount);
      setTick(0);

      if (spec.scenario === "mount") {
        setMounted(false);
        setActiveSpec(spec);
        await delay(SETTLE_MS);

        const t0 = performance.now();
        const mountMs = await new Promise<number>((resolve) => {
          mountResolveRef.current = () => resolve(performance.now() - t0);
          setMounted(true);
        });

        records.push({ ...spec, stats: { mountMs } });
        setMounted(false);
      } else {
        setMounted(true);
        setActiveSpec(spec);
        await delay(SETTLE_MS);

        recorder.start();
        const drifts = await runTicks(TICKS, TICK_MS, setTick);
        const frames = await recorder.stop();

        records.push({ ...spec, stats: summarizeFrames(frames, drifts) });
      }

      setActiveSpec(null);
      await delay(COOLDOWN_MS);
    }

    setReport(buildReport(records));
    setPhase("done");
  }, [recorder]);

  const shareReport = useCallback(() => {
    if (report) Share.share({ message: JSON.stringify(report, null, 2) });
  }, [report]);

  const values = activeSpec ? matrixRef.current[Math.min(tick, TICKS)] : [0];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Dev-build warning */}
      {__DEV__ && (
        <View style={{ backgroundColor: "#DC2626", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ color: "#FFFFFF", fontFamily: FONT_SEMIBOLD, fontSize: 13 }}>
            DEV BUILD: numbers are not representative. Build with --configuration Release for
            headline results.
          </Text>
        </View>
      )}

      {/* Controls */}
      <DemoButton
        disabled={phase === "running"}
        label={phase === "running" ? "Running..." : "Run full suite"}
        onPress={runAll}
      />
      {phase === "running" && (
        <Text style={{ fontFamily: FONT_REGULAR, color: colors.textSecondary, marginTop: 8 }}>
          {progress}
        </Text>
      )}

      {/* Active workload */}
      <View style={{ minHeight: 360, marginTop: 20, alignItems: "flex-start" }}>
        {activeSpec && mounted && (
          <ScenarioContent
            fontLarge={fontLarge}
            fontSmall={fontSmall}
            spec={activeSpec}
            values={values}
          />
        )}
        {activeSpec?.scenario === "mount" && mounted && <View onLayout={handleMountLayout} />}
      </View>

      {/* Results */}
      {report && (
        <View style={{ marginTop: 12 }}>
          <DemoButton label="Share JSON" onPress={shareReport} />

          {report.scenarios.map((s) => (
            <View key={`${s.scenario}-${s.renderer}`} style={{ marginTop: 16 }}>
              <Text style={{ fontFamily: FONT_SEMIBOLD, fontSize: 15, color: colors.text }}>
                {s.scenario} / {s.renderer}
              </Text>

              {s.comparisons.map((c) => (
                <Text
                  key={c.metric}
                  style={{ fontFamily: FONT_REGULAR, fontSize: 13, color: colors.textSecondary, marginTop: 4 }}
                >
                  {c.metric}: {c.verdict} [{c.deltas.map((d) => d.toFixed(2)).join(", ")}]
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};
```

Check `DemoButton`'s props before use (`apps/example/src/components/DemoButton.tsx`); if it lacks a `disabled` prop, render the button conditionally instead.

- [ ] **Step 2: Register the route**

In `apps/example/src/navigation/types.ts` add to `RootStackParamList`:

```ts
Benchmark: undefined;
```

In `apps/example/src/navigation/RootNavigator.tsx`, alongside the other lazy screens:

```tsx
const LazyBenchmark =
  Platform.OS === "web" ? undefined : require("../benchmark/BenchmarkScreen").BenchmarkScreen;
```

and inside the navigator, after the RecordingDemo screen:

```tsx
{LazyBenchmark && (
  <Stack.Screen component={LazyBenchmark} name="Benchmark" options={{ title: "Benchmark" }} />
)}
```

- [ ] **Step 3: Add the HomeScreen entry**

In `apps/example/src/screens/HomeScreen.tsx`:

1. Extend the `ListHeader` props with `onBenchmark: () => void`.
2. After the Recording button block, add:

```tsx
{/* Benchmark button, hidden on web (requires Skia) */}
{!isWeb && (
  <RipplePressable
    onPress={onBenchmark}
    style={{
      backgroundColor: "#0A0A0A",
      borderRadius: 14,
      padding: 16,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        fontSize: 16,
        fontFamily: FONT_SEMIBOLD,
        color: "#FFFFFF",
      }}
    >
      Benchmark
    </Text>
    <Text
      style={{
        fontSize: 13,
        fontFamily: FONT_REGULAR,
        color: "#9CA3AF",
        marginTop: 4,
        lineHeight: 18,
      }}
    >
      A/B performance suite: current vs frozen baseline
    </Text>
  </RipplePressable>
)}
```

3. At the `ListHeader` usage site, pass `onBenchmark={() => navigation.navigate("Benchmark")}` exactly mirroring how `onRecording` is wired.

- [ ] **Step 4: Type-check and commit**

```bash
bunx tsc --noEmit -p apps/example/tsconfig.json
git add apps/example/src
git commit -m "feat(bench): benchmark runner screen with interleaved A/B protocol"
```

---

### Task 6: Device smoke test

No files. Verifies the screen end to end before trusting any numbers.

- [ ] **Step 1: Check for a running Metro instance first**

```bash
lsof -i :8081
```

If Metro is already running, reuse it; otherwise start the example app (`bun run example ios`). This is a dev build: numbers are throwaway, mechanics are what's being verified.

- [ ] **Step 2: Manual verification checklist**

Open Home -> Benchmark and run the full suite. Verify:

1. The red DEV banner shows.
2. Progress advances through all 72 runs (3 scenarios x 2 renderers x 6 pairs x 2 variants).
3. Both variants render visually identically per scenario (the baseline is a copy, so any visual difference is a wiring bug).
4. The results list shows verdicts for every scenario/renderer with 5 deltas each.
5. Verdicts are mostly "inconclusive" (current and baseline are identical code right now: an "improved" or "regressed" verdict at this stage means the harness has a bias bug; investigate before proceeding).
6. Share JSON produces a parseable report.

- [ ] **Step 3: Commit any fixes discovered**

```bash
git add -A apps/example
git commit -m "fix(bench): smoke-test fixes for benchmark runner"
```

(Skip the commit if nothing needed fixing.)

---

### Task 7: Jest component-test infrastructure in the library

**Files:**
- Create: `packages/number-flow-react-native/jest.component.config.js`
- Create: `packages/number-flow-react-native/jest.component.setup.js`
- Create: `packages/number-flow-react-native/babel.jest.config.js`
- Modify: `packages/number-flow-react-native/package.json` (devDeps, test script)

- [ ] **Step 1: Verify dependency versions before installing (hard rule: never guess versions)**

```bash
bun info @testing-library/react-native | head -20
bun info react-test-renderer versions | grep 19.1
```

Confirm: the latest `@testing-library/react-native` major supports React 19 / RN 0.81 (check its peerDependencies in the output), and `react-test-renderer@19.1.0` exists (must match the workspace React version exactly).

- [ ] **Step 2: Install dev dependencies in the library workspace**

```bash
bun add -d --cwd packages/number-flow-react-native @testing-library/react-native react-test-renderer@19.1.0 @react-native/babel-preset@0.81.5 babel-jest
```

`react-native` and `react-native-reanimated` are intentionally not added: they resolve from the hoisted root `node_modules` (installed via the example app), and tests only run from the monorepo root.

- [ ] **Step 3: Create babel.jest.config.js**

Named so that `react-native-builder-bob` and the existing ts-jest config cannot pick it up; only the component Jest config references it explicitly.

```js
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: ["react-native-worklets/plugin"],
};
```

- [ ] **Step 4: Create jest.component.setup.js**

```js
require("react-native-reanimated").setUpTests();
```

- [ ] **Step 5: Create jest.component.config.js**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "react-native",
  roots: ["<rootDir>/src/__tests__/perf"],
  testMatch: ["**/*.test.tsx"],
  setupFiles: ["./jest.component.setup.js"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { configFile: "./babel.jest.config.js" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-worklets|@rednegniw)/)",
  ],
};
```

- [ ] **Step 6: Update the library test script**

In `packages/number-flow-react-native/package.json` change:

```json
"test": "jest",
```

to:

```json
"test": "jest && jest -c jest.component.config.js",
```

Leave `prepublishOnly` untouched (its `jest` call now only covers logic tests; CI runs `bun run test` for the full set).

- [ ] **Step 7: Verify the harness boots with a placeholder test**

Create `packages/number-flow-react-native/src/__tests__/perf/harness.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

test("component test harness renders", () => {
  const { getByText } = render(<Text>ok</Text>);
  expect(getByText("ok")).toBeTruthy();
});
```

Run: `bun run lib test`
Expected: both Jest projects pass.

Known risks if this fails, in likely order: (a) `@react-native/babel-preset` resolution: confirm the exact installed version matches RN 0.81.5; (b) Reanimated `setUpTests` throwing without the worklets plugin: confirm `babel.jest.config.js` is actually picked up by checking `jest -c jest.component.config.js --showConfig | grep babel`; (c) `Platform.constants.reactNativeVersion` undefined under the RN jest mock when `GradientMask` loads: if so, add `jest.mock("../../native/MaskedView", () => ({ default: null }))` is NOT the fix (wrong module); instead mock the version source in `jest.component.setup.js`. Diagnose the actual error before applying any of these.

- [ ] **Step 8: Verify bob still excludes tests from the build**

```bash
bun run lib prepare
ls packages/number-flow-react-native/lib/module | grep -c __tests__ || echo "no tests in build output"
```

Expected: "no tests in build output" (bob excludes `**/__tests__/**` by default; this verifies rather than assumes it).

- [ ] **Step 9: Commit**

```bash
git add packages/number-flow-react-native
git commit -m "test: add component-test Jest project for perf mechanism tests"
```

---

### Task 8: Synthetic metrics helper and commit-count test

**Files:**
- Create: `packages/number-flow-react-native/src/__tests__/perf/seedMetrics.ts`
- Create: `packages/number-flow-react-native/src/__tests__/perf/commitCount.test.tsx`
- Delete: `packages/number-flow-react-native/src/__tests__/perf/harness.test.tsx`

- [ ] **Step 1: Create seedMetrics.ts**

`NumberFlow` measures glyphs asynchronously via `onTextLayout`, which never fires in Jest. Seeding `metricsCache` makes the cached path return synchronously and the slot tree mount on first commit (`slotsReady` initializes to `!!metrics`).

```ts
import { DEFAULT_FONT_SIZE } from "../../core/constants";
import { getFormatCharacters } from "../../core/intlHelpers";
import type { GlyphMetrics } from "../../core/types";
import { buildCharSet, cacheKey, metricsCache } from "../../native/glyphMetricsShared";

/**
 * Seeds the glyph metrics cache with synthetic, uniform-width metrics for
 * the given format so NumberFlow renders its slot tree synchronously in
 * tests. Uniform widths keep x positions of unchanged digits stable across
 * value updates, isolating re-render behavior from layout shifts.
 */
export function seedSyntheticMetrics(
  format?: Intl.NumberFormatOptions,
  locales?: Intl.LocalesArgument,
): void {
  const formatChars = getFormatCharacters(locales, format, "", "");
  const charSet = buildCharSet(formatChars);

  const charWidths: Record<string, number> = {};
  const charBounds: Record<string, { top: number; bottom: number }> = {};
  for (const ch of charSet) {
    charWidths[ch] = 10;
    charBounds[ch] = { top: -14, bottom: 0 };
  }

  const metrics: GlyphMetrics = {
    charWidths,
    maxDigitWidth: 10,
    lineHeight: 24,
    ascent: -16,
    descent: 4,
    charBounds,
  };

  metricsCache.set(cacheKey({ fontSize: DEFAULT_FONT_SIZE }, formatChars), metrics);
}
```

Before writing, confirm the `GlyphMetrics` field names against `src/core/types.ts` and adjust if they differ.

- [ ] **Step 2: Write the commit-count test**

Create `commitCount.test.tsx`. The counting wrapper replaces `DigitSlot` via `jest.mock` with a memoized pass-through that logs each post-memo render; `jest.spyOn` on module exports is unreliable under the Babel CJS transform (getter-only exports), which is why mocking the whole module is used instead.

```tsx
import { render } from "@testing-library/react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

const mockRenderLog: number[] = [];

jest.mock("../../native/DigitSlot", () => {
  const ReactActual = require("react");
  const actual = jest.requireActual("../../native/DigitSlot");

  const CountingDigitSlot = ReactActual.memo((props: { digitValue: number }) => {
    mockRenderLog.push(props.digitValue);
    return ReactActual.createElement(actual.DigitSlot, props);
  });

  return { DigitSlot: CountingDigitSlot };
});

beforeEach(() => {
  mockRenderLog.length = 0;
});

/**
 * Mechanism test for the memo-busting `style = {}` default: with the bug,
 * every DigitSlot re-renders on a value change because textStyle gets a new
 * identity each render. test.failing flips to a hard failure once the fix
 * lands, at which point remove the .failing modifier.
 */
test.failing("updating one digit re-renders only that DigitSlot", () => {
  seedSyntheticMetrics();
  const { rerender } = render(<NumberFlow value={123} />);

  expect(mockRenderLog.length).toBe(3);
  mockRenderLog.length = 0;

  rerender(<NumberFlow value={124} />);

  expect(mockRenderLog).toEqual([4]);
});

test("mounting renders each DigitSlot exactly once", () => {
  seedSyntheticMetrics();
  render(<NumberFlow value={123} />);

  expect(mockRenderLog.length).toBe(3);
});
```

- [ ] **Step 3: Run and verify the failing test fails for the right reason**

```bash
bun run lib test 2>&1 | tail -30
```

Expected: suite green overall. The `test.failing` case passes as "failing as expected". Temporarily remove `.failing`, re-run, and confirm the assertion failure is `mockRenderLog` containing 3 entries (all slots re-rendered), not some unrelated error; then restore `.failing`. This proves the test detects the bug it claims to detect.

- [ ] **Step 4: Delete the placeholder harness test and commit**

```bash
rm packages/number-flow-react-native/src/__tests__/perf/harness.test.tsx
git add packages/number-flow-react-native/src/__tests__
git commit -m "test: add commit-count mechanism test for slot memoization"
```

---

### Task 9: Host-view-count test

**Files:**
- Create: `packages/number-flow-react-native/src/__tests__/perf/viewCount.test.tsx`

- [ ] **Step 1: Write the test with a sentinel count**

```tsx
import { render } from "@testing-library/react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

interface JsonNode {
  children?: (JsonNode | string)[] | null;
}

function countNodes(node: JsonNode | JsonNode[] | string | null): number {
  if (node === null || typeof node === "string") return 0;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + countNodes(child), 0);

  const childCount = (node.children ?? []).reduce<number>(
    (sum, child) => sum + countNodes(child as JsonNode | string),
    0,
  );
  return 1 + childCount;
}

const CURRENCY = { style: "currency", currency: "USD" } as const;

/**
 * Tracked baseline for finding 4 (view-tree weight). This number is a
 * recorded fact, not a target: update it deliberately whenever a change
 * intentionally alters the slot view structure, and mention the delta in
 * the changeset.
 */
test("host node count for $1,234.56 stays at its recorded baseline", () => {
  seedSyntheticMetrics(CURRENCY);
  const tree = render(<NumberFlow format={CURRENCY} value={1234.56} />).toJSON();

  expect(countNodes(tree as JsonNode | JsonNode[])).toBe(-1);
});
```

- [ ] **Step 2: Pin the real number**

Run: `bun run lib test 2>&1 | grep -A3 "stays at its recorded baseline"`

The failure output shows the actual count (`Received: <N>`). Replace `-1` with `<N>` in the test. Re-run and confirm it passes.

- [ ] **Step 3: Commit**

```bash
git add packages/number-flow-react-native/src/__tests__
git commit -m "test: pin host view count baseline for NumberFlow"
```

---

### Task 10: Runbook, release script, and finish

**Files:**
- Create: `apps/example/src/benchmark/RUNBOOK.md`
- Modify: `apps/example/package.json` (release script)

- [ ] **Step 1: Add the Release build script**

In `apps/example/package.json` scripts:

```json
"ios:release": "expo run:ios --configuration Release",
```

- [ ] **Step 2: Create RUNBOOK.md**

```markdown
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

1. Build Release from Xcode (`apps/example/ios/example.xcworkspace`),
   Product -> Profile is not needed; use Debug -> Capture GPU Workload while
   the stress-grid Skia scenario is running.
2. In the capture, count render passes / offscreen textures attributable to
   the NumberFlow canvas before and after the change.
3. Expect: roughly one offscreen layer per digit slot before; near zero for
   steady-state slots after.
```

- [ ] **Step 3: Full verification pass**

```bash
bun run lint
bun run check-types
bun run test
bunx tsc --noEmit -p apps/example/tsconfig.json
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/example
git commit -m "docs(bench): benchmark runbook and release build script"
```

---

## Self-review notes (already applied)

- Spec coverage: baseline package (Task 1), device tier with recorder/driver/scenarios/runner/protocol (Tasks 2-5), smoke test (Task 6), Jest tier (Tasks 7-9), runbook + Instruments validation (Task 10). The spec's conditional SV-write test is resolved via its drop path; rationale recorded in the header facts list.
- The harness-bias check (Task 6, checklist item 5) is the benchmark's own null test: identical code must produce "inconclusive".
- `test.failing` semantics verified conceptually against Jest 30 (jest-circus); Task 8 Step 3 verifies behaviorally.
