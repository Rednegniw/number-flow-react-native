/**
 * "grid-tabular" is the stress grid with tabular-nums: digit widths never
 * change, so width/minWidth (layout) animations never fire. Comparing it
 * against "stress-grid" isolates layout-animation cost from transform and
 * opacity commit cost. Diagnostic only; proportional widths remain the
 * supported default.
 */
export type ScenarioKind = "tick-single" | "stress-grid" | "grid-tabular" | "mount";
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
