import { useMemo, useRef } from "react";
import type { CharLayout } from "./layout";
import { computeAdaptiveMaskHeights, type MaskHeights } from "./mask";
import type { GlyphMetrics, KeyedPart, TimingConfig, Trend, TrendProp, TrendRef } from "./types";
import { useAnimationLifecycle } from "./useAnimationLifecycle";
import { useContinuousSpin } from "./useContinuousSpin";
import { useLayoutDiff } from "./useLayoutDiff";
import { useTimingResolution } from "./useTimingResolution";
import { resolveTrend } from "./utils";

interface FlowPipelineInput {
  keyedParts: KeyedPart[];

  // The scalar used for trend detection:
  //   NumberFlow: the numeric `value`
  //   TimeFlow: `totalSeconds` (h*3600 + m*60 + s)
  trendValue: number | undefined;

  // Pre-computed layout; each component handles its own layout computation
  // because Skia has special sharedValue layout paths
  layout: CharLayout[];

  // Metrics for adaptive mask computation
  metrics: GlyphMetrics | null;

  // AnimationBehaviorProps
  animated?: boolean;
  respectMotionPreference?: boolean;
  spinTiming?: TimingConfig;
  opacityTiming?: TimingConfig;
  transformTiming?: TimingConfig;
  trend?: TrendProp;
  continuous?: boolean;
  mask?: boolean;
  onAnimationsStart?: () => void;
  onAnimationsFinish?: () => void;
}

interface FlowPipelineOutput {
  resolvedSpinTiming: TimingConfig;
  resolvedOpacityTiming: TimingConfig;
  resolvedTransformTiming: TimingConfig;
  resolvedTrend: Trend;
  /**
   * Stable container for the latest resolved trend. Slots read it lazily
   * (inside effects) instead of receiving the trend value as a prop, so a
   * direction flip does not re-render slots whose digits did not change.
   */
  trendRef: TrendRef;
  spinGenerations: Map<string, number> | undefined;

  prevMap: Map<string, CharLayout>;
  isInitialRender: boolean;
  exitingEntries: Map<string, CharLayout>;
  onExitComplete: (key: string) => void;

  accessibilityLabel: string | undefined;
  adaptiveMask: MaskHeights;
}

const ZERO_MASK: MaskHeights = { top: 0, bottom: 0, expansionTop: 0, expansionBottom: 0 };

/**
 * Shared data pipeline for all Flow components (NumberFlow, TimeFlow,
 * SkiaNumberFlow, SkiaTimeFlow).
 *
 * Handles: timing resolution, trend tracking, continuous spin,
 * animation lifecycle, layout diffing, accessibility label,
 * and adaptive mask computation.
 *
 * Layout computation is left to callers because Skia components
 * have additional sharedValue-driven layout paths.
 */
export function useFlowPipeline(input: FlowPipelineInput): FlowPipelineOutput {
  // 1. Timing resolution
  const { resolvedSpinTiming, resolvedOpacityTiming, resolvedTransformTiming } =
    useTimingResolution(
      input.animated,
      input.respectMotionPreference,
      input.spinTiming,
      input.opacityTiming,
      input.transformTiming,
    );

  // 2. Trend tracking
  const prevValueRef = useRef<number | undefined>(input.trendValue);
  const resolvedTrend = resolveTrend(input.trend, prevValueRef.current, input.trendValue);
  prevValueRef.current = input.trendValue;

  /**
   * Render-time ref update (same pattern as prevValueRef above): child layout
   * effects run before parent effects, so an effect-time update would be stale.
   */
  const trendRef = useRef<Trend>(resolvedTrend);
  trendRef.current = resolvedTrend;

  // 3. Continuous spin
  const spinGenerations = useContinuousSpin(input.keyedParts, input.continuous, resolvedTrend);

  // 4. Animation lifecycle
  useAnimationLifecycle(
    input.layout,
    {
      spin: resolvedSpinTiming,
      opacity: resolvedOpacityTiming,
      transform: resolvedTransformTiming,
    },
    input.onAnimationsStart,
    input.onAnimationsFinish,
  );

  // 5. Layout diff
  const { prevMap, isInitialRender, exitingEntries, onExitComplete } = useLayoutDiff(input.layout);

  // 6. Accessibility label
  const accessibilityLabel = useMemo(() => {
    if (input.keyedParts.length === 0) return undefined;

    return input.keyedParts.map((p) => p.char).join("");
  }, [input.keyedParts]);

  // 7. Adaptive mask
  const resolvedMask = input.mask ?? true;
  const adaptiveMask = useMemo(() => {
    if (!input.metrics || !resolvedMask) return ZERO_MASK;

    return computeAdaptiveMaskHeights(input.layout, exitingEntries, input.metrics);
  }, [input.metrics, resolvedMask, input.layout, exitingEntries]);

  return {
    resolvedSpinTiming,
    resolvedOpacityTiming,
    resolvedTransformTiming,
    resolvedTrend,
    trendRef,
    spinGenerations,
    prevMap,
    isInitialRender,
    exitingEntries,
    onExitComplete,
    accessibilityLabel,
    adaptiveMask,
  };
}
