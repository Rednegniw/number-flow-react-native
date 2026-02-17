import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  ZERO_TIMING,
} from "./timing";
import type { TimingConfig } from "./types";
import { useCanAnimate } from "./useCanAnimate";

interface ResolvedTimings {
  resolvedSpinTiming: TimingConfig;
  resolvedOpacityTiming: TimingConfig;
  resolvedTransformTiming: TimingConfig;
}

/**
 * Resolves animation timing based on the `animated` prop and reduced-motion preference.
 * When animations are disabled, all timings collapse to zero-duration.
 */
export function useTimingResolution(
  animated: boolean | undefined,
  respectMotionPreference: boolean | undefined,
  spinTiming?: TimingConfig,
  opacityTiming?: TimingConfig,
  transformTiming?: TimingConfig,
): ResolvedTimings {
  const canAnimate = useCanAnimate(respectMotionPreference);
  const shouldAnimate = (animated ?? true) && canAnimate;

  const resolvedSpinTiming = shouldAnimate ? (spinTiming ?? DEFAULT_SPIN_TIMING) : ZERO_TIMING;

  const resolvedOpacityTiming = shouldAnimate
    ? (opacityTiming ?? DEFAULT_OPACITY_TIMING)
    : ZERO_TIMING;

  const resolvedTransformTiming = shouldAnimate
    ? (transformTiming ?? DEFAULT_TRANSFORM_TIMING)
    : ZERO_TIMING;

  return {
    resolvedSpinTiming,
    resolvedOpacityTiming,
    resolvedTransformTiming,
  };
}
