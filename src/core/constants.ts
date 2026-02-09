import { Easing } from "react-native-reanimated";
import type { TimingConfig } from "./types";

/** Maximum number of character slots in the fixed pool */
export const MAX_SLOTS = 20;

/** Characters that can appear in formatted numbers (including prefix/suffix) and need glyph measurement */
export const MEASURABLE_CHARS =
  "0123456789.,%+-$/:! €£¥₩abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~°";

/** Pre-computed digit strings to avoid String(n) allocations in render loops */
export const DIGIT_STRINGS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

/** Enter/exit slide distance as a fraction of lineHeight */
export const ENTER_EXIT_SLIDE_FRACTION = 0.5;

// ─── NumberFlow Easing Curve ───────────────────────────────────────────────────
//
// Exact reproduction of NumberFlow's CSS linear() easing function.
// This is a smooth deceleration curve defined by 88 evenly-spaced control points.
// CSS: linear(0, .005, .019, .039, ..., 1)
// Reanimated: piecewise linear interpolation over the same control points.

const NUMBER_FLOW_EASING_POINTS = [
  0, 0.005, 0.019, 0.039, 0.066, 0.096, 0.129, 0.165, 0.202, 0.24, 0.278, 0.316,
  0.354, 0.39, 0.426, 0.461, 0.494, 0.526, 0.557, 0.586, 0.614, 0.64, 0.665,
  0.689, 0.711, 0.731, 0.751, 0.769, 0.786, 0.802, 0.817, 0.831, 0.844, 0.856,
  0.867, 0.877, 0.887, 0.896, 0.904, 0.912, 0.919, 0.925, 0.931, 0.937, 0.942,
  0.947, 0.951, 0.955, 0.959, 0.962, 0.965, 0.968, 0.971, 0.973, 0.976, 0.978,
  0.98, 0.981, 0.983, 0.984, 0.986, 0.987, 0.988, 0.989, 0.99, 0.991, 0.992,
  0.992, 0.993, 0.994, 0.994, 0.995, 0.995, 0.996, 0.996, 0.9963, 0.9967,
  0.9969, 0.9972, 0.9975, 0.9977, 0.9979, 0.9981, 0.9982, 0.9984, 0.9985,
  0.9987, 0.9988, 0.9989, 1,
] as const;

/**
 * Recreates CSS linear() easing: piecewise linear interpolation
 * over evenly-spaced control points. Identical to the Web Animations API
 * linear() function used by NumberFlow.
 */
function createLinearEasing(points: readonly number[]) {
  "worklet";
  const lastIndex = points.length - 1;
  return (t: number): number => {
    "worklet";
    if (t <= 0) return points[0];
    if (t >= 1) return points[lastIndex];
    const scaledT = t * lastIndex;
    const index = Math.floor(scaledT);
    const fraction = scaledT - index;
    return points[index] + (points[index + 1] - points[index]) * fraction;
  };
}

/** NumberFlow's default transform easing — smooth deceleration curve */
export const numberFlowEasing = createLinearEasing(NUMBER_FLOW_EASING_POINTS);

// ─── Default Timing Configs (matching NumberFlow exactly) ──────────────────────

/** Transform timing: position movement, width changes (NumberFlow default: 900ms) */
export const DEFAULT_TRANSFORM_TIMING: TimingConfig = {
  duration: 900,
  easing: numberFlowEasing,
};

/** Spin timing: digit rolling (NumberFlow default: falls back to transformTiming) */
export const DEFAULT_SPIN_TIMING: TimingConfig = DEFAULT_TRANSFORM_TIMING;

/** Opacity timing: enter/exit fade (NumberFlow default: 450ms ease-out) */
export const DEFAULT_OPACITY_TIMING: TimingConfig = {
  duration: 450,
  easing: Easing.out(Easing.ease),
};
