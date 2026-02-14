import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  type SharedValue,
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  withTiming,
} from "react-native-reanimated";
import { DIGIT_COUNT } from "./constants";
import type { TimingConfig, Trend } from "./types";
import { useSlotOpacity } from "./useSlotOpacity";
import { computeRollDelta } from "./utils";

/**
 * We use makeMutable (via useState) instead of useSharedValue because
 * useSharedValue's cleanup calls cancelAnimation, which kills in-flight
 * animations when the component re-renders in StrictMode.
 */

interface UseDigitAnimationParams {
  digitValue: number;
  entering: boolean;
  exiting: boolean;
  trend: Trend;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  workletDigitValue?: SharedValue<number>;
  /** Number of values in this digit's wheel. Defaults to 10 (0-9). */
  digitCount?: number;
  /** Incrementing counter from useContinuousSpin; triggers a full-wheel rotation when changed. */
  continuousSpinGeneration?: number;
}

interface UseDigitAnimationResult {
  initialDigit: number;
  animDelta: SharedValue<number>;
  currentDigitSV: SharedValue<number>;
  slotOpacity: SharedValue<number>;
}

/**
 * Manages the digit rolling state machine: delta tracking, exit animations,
 * prop-driven digit changes, and worklet-driven digit updates.
 *
 * Each renderer creates its own format-specific Y transforms and position
 * reaction that reads animDelta + currentDigitSV from this hook.
 */
export function useDigitAnimation({
  digitValue,
  entering,
  exiting,
  trend,
  spinTiming,
  opacityTiming,
  exitKey,
  onExitComplete,
  workletDigitValue,
  digitCount,
  continuousSpinGeneration,
}: UseDigitAnimationParams): UseDigitAnimationResult {
  const resolvedDigitCount = digitCount ?? DIGIT_COUNT;
  const initialDigit = entering ? 0 : digitValue;
  const prevDigitRef = useRef(initialDigit);

  /**
   * animDelta starts at the computed roll distance and animates toward 0.
   * The per-digit position reaction computes c = currentDigit - animDelta
   * and uses mod-10 arithmetic to position each digit individually.
   */
  const [animDelta] = useState(() => makeMutable(0));
  const [currentDigitSV] = useState(() => makeMutable(initialDigit));

  const handleExitingStart = useCallback(() => {
    if (prevDigitRef.current !== 0) {
      const delta = computeRollDelta(prevDigitRef.current, 0, trend, resolvedDigitCount);
      prevDigitRef.current = 0;
      currentDigitSV.value = 0;
      animDelta.value = delta;
      animDelta.value = withTiming(0, {
        duration: spinTiming.duration,
        easing: spinTiming.easing,
      });
    }
  }, [trend, spinTiming]);

  const slotOpacity = useSlotOpacity({
    entering,
    exiting,
    opacityTiming,
    exitKey,
    onExitComplete,
    onExitingStart: handleExitingStart,
  });

  useLayoutEffect(() => {
    const workletActive =
      workletDigitValue !== undefined && workletDigitValue.value >= 0;
    if (!exiting && !workletActive && prevDigitRef.current !== digitValue) {
      const delta = computeRollDelta(prevDigitRef.current, digitValue, trend, resolvedDigitCount);
      prevDigitRef.current = digitValue;
      currentDigitSV.value = digitValue;
      animDelta.value = delta;
      animDelta.value = withTiming(0, {
        duration: spinTiming.duration,
        easing: spinTiming.easing,
      });
    }
  }, [digitValue, exiting, workletDigitValue, trend, spinTiming]);

  /**
   * Continuous spin: when the generation counter increments, this digit's
   * value didn't change but a higher-significance digit did. Perform a
   * full-wheel rotation so the digit appears to "carry" through.
   *
   * Example: 100 → 200 with trend=1 — the ones digit (0→0) spins through
   * all 10 values upward while the hundreds digit rolls 1→2 normally.
   */
  const prevSpinGenRef = useRef(continuousSpinGeneration ?? 0);

  useLayoutEffect(() => {
    const currentGen = continuousSpinGeneration ?? 0;

    // Generation unchanged — no continuous spin needed
    if (currentGen === prevSpinGenRef.current) return;
    prevSpinGenRef.current = currentGen;

    // Don't spin digits that are entering or exiting — they animate via opacity
    if (exiting || entering) return;

    // Full wheel rotation: e.g. 10 * 1 = spin up 10, or 6 * -1 = spin down 6 (for s10)
    const delta = resolvedDigitCount * trend;
    if (delta === 0) return;

    // Accumulate onto any in-flight animation, then ease back to 0
    animDelta.value = animDelta.value + delta;
    animDelta.value = withTiming(0, {
      duration: spinTiming.duration,
      easing: spinTiming.easing,
    });
  }, [continuousSpinGeneration, exiting, entering, trend, spinTiming, resolvedDigitCount]);

  const syncFromWorklet = useCallback((digit: number) => {
    prevDigitRef.current = digit;
  }, []);

  useAnimatedReaction(
    () => workletDigitValue?.value ?? -1,
    (current, previous) => {
      if (current < 0 || current === previous) return;

      const prev = currentDigitSV.value;
      if (prev === current) return;

      const delta = computeRollDelta(prev, current, trend, resolvedDigitCount);
      currentDigitSV.value = current;

      /**
       * Accumulate remaining animation delta (composite: 'accumulate').
       * Safe to read animDelta.value here — we're on the UI thread.
       */
      animDelta.value = animDelta.value + delta;

      animDelta.value = withTiming(0, {
        duration: spinTiming.duration,
        easing: spinTiming.easing,
      });

      runOnJS(syncFromWorklet)(current);
    },
    [workletDigitValue, spinTiming, trend],
  );

  return { initialDigit, animDelta, currentDigitSV, slotOpacity };
}
