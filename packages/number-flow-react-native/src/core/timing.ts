import { Easing } from "react-native-reanimated";
import type { TimingConfig } from "./types";

/**
 * NumberFlow's CSS linear() easing function — exact reproduction.
 * A smooth deceleration curve defined by 90 evenly-spaced control points.
 */
const NUMBER_FLOW_EASING_POINTS = [
  0, 0.005, 0.019, 0.039, 0.066, 0.096, 0.129, 0.165, 0.202, 0.24, 0.278, 0.316, 0.354, 0.39, 0.426,
  0.461, 0.494, 0.526, 0.557, 0.586, 0.614, 0.64, 0.665, 0.689, 0.711, 0.731, 0.751, 0.769, 0.786,
  0.802, 0.817, 0.831, 0.844, 0.856, 0.867, 0.877, 0.887, 0.896, 0.904, 0.912, 0.919, 0.925, 0.931,
  0.937, 0.942, 0.947, 0.951, 0.955, 0.959, 0.962, 0.965, 0.968, 0.971, 0.973, 0.976, 0.978, 0.98,
  0.981, 0.983, 0.984, 0.986, 0.987, 0.988, 0.989, 0.99, 0.991, 0.992, 0.992, 0.993, 0.994, 0.994,
  0.995, 0.995, 0.996, 0.996, 0.9963, 0.9967, 0.9969, 0.9972, 0.9975, 0.9977, 0.9979, 0.9981,
  0.9982, 0.9984, 0.9985, 0.9987, 0.9988, 0.9989, 1,
] as const;

/**
 * NumberFlow's default transform easing — smooth deceleration curve.
 * Piecewise linear interpolation over the control points above,
 * recreating CSS linear() easing from the Web Animations API.
 */
const numberFlowEasing = (t: number) => {
  "worklet";

  const lastIndex = NUMBER_FLOW_EASING_POINTS.length - 1;

  if (t <= 0) return NUMBER_FLOW_EASING_POINTS[0];
  if (t >= 1) return NUMBER_FLOW_EASING_POINTS[lastIndex];

  const scaledT = t * lastIndex;
  const index = Math.floor(scaledT);
  const fraction = scaledT - index;

  return (
    NUMBER_FLOW_EASING_POINTS[index] +
    (NUMBER_FLOW_EASING_POINTS[index + 1] - NUMBER_FLOW_EASING_POINTS[index]) * fraction
  );
};

export const DEFAULT_TRANSFORM_TIMING: TimingConfig = {
  duration: 900,
  easing: numberFlowEasing,
};

// How long a digit spins before settling into its final position
export const DEFAULT_SPIN_TIMING: TimingConfig = DEFAULT_TRANSFORM_TIMING;

export const DEFAULT_OPACITY_TIMING: TimingConfig = {
  duration: 450,
  easing: Easing.out(Easing.ease),
};

export const ZERO_TIMING: TimingConfig = {
  duration: 0,
  easing: (t: number) => {
    "worklet";
    return t;
  },
};
