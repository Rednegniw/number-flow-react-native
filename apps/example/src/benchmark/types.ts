/**
 * Diagnostic grid variants, both compared against "stress-grid" to attribute
 * the native renderer's residual frame cost. Neither is a supported mode
 * change: proportional widths and the mask stay on by default.
 *
 * "grid-tabular"  tabular-nums, so digit widths never change and the width /
 *                 minWidth layout animations never fire: isolates Yoga
 *                 relayout cost from transform and opacity commit cost.
 * "grid-nomask"   mask={false}, so no MaskedView wraps each component:
 *                 isolates the per-component offscreen composite cost.
 */
export type ScenarioKind = "tick-single" | "stress-grid" | "grid-tabular" | "grid-nomask" | "mount";
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
  /**
   * Longest single frame interval. p95 leaves the tail unbounded: a run can
   * show p95 = 110ms while hiding multi-second stalls, so the worst frame is
   * reported explicitly.
   */
  maxMs?: number;
  pctOverBudget?: number;
  frames?: number;
  /**
   * Frames actually produced per second of wall clock (frames / windowMs).
   * This is the metric that answers "is it dropping frames": percentile
   * metrics describe only the frames that WERE produced, so a UI thread
   * stalling for seconds still reports a healthy median.
   */
  fps?: number;
  windowMs?: number;

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
  config: {
    pairs: number;
    warmupPairs: number;
    ticks: number;
    tickMs: number;
    gridCount: number;
    seed: number;
  };
  scenarios: ScenarioReport[];
}
