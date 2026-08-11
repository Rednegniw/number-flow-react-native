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
      setProgress(
        `${qi + 1}/${queue.length}  ${spec.scenario} ${spec.renderer} ${spec.variant} #${spec.pairIndex}`,
      );

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
        <View
          style={{ backgroundColor: "#DC2626", borderRadius: 10, padding: 12, marginBottom: 16 }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: FONT_SEMIBOLD, fontSize: 13 }}>
            DEV BUILD: numbers are not representative. Build with --configuration Release for
            headline results.
          </Text>
        </View>
      )}

      {/* Controls (DemoButton has no disabled prop, so hide it while running) */}
      {phase !== "running" ? (
        <DemoButton label="Run full suite" onPress={runAll} />
      ) : (
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
                  style={{
                    fontFamily: FONT_REGULAR,
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 4,
                  }}
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
