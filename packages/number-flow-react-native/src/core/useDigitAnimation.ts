import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  type SharedValue,
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  withTiming,
} from "react-native-reanimated";
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
}: UseDigitAnimationParams): UseDigitAnimationResult {
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
      const delta = computeRollDelta(prevDigitRef.current, 0, trend);
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
      const delta = computeRollDelta(prevDigitRef.current, digitValue, trend);
      prevDigitRef.current = digitValue;
      currentDigitSV.value = digitValue;
      animDelta.value = delta;
      animDelta.value = withTiming(0, {
        duration: spinTiming.duration,
        easing: spinTiming.easing,
      });
    }
  }, [digitValue, exiting, workletDigitValue, trend, spinTiming]);

  const syncFromWorklet = useCallback((digit: number) => {
    prevDigitRef.current = digit;
  }, []);

  useAnimatedReaction(
    () => workletDigitValue?.value ?? -1,
    (current, previous) => {
      if (current < 0 || current === previous) return;

      const prev = currentDigitSV.value;
      if (prev === current) return;

      const delta = computeRollDelta(prev, current, trend);
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
