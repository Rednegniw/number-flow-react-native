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
