import { useLayoutEffect, useRef, useState } from "react";
import { makeMutable, runOnJS, type SharedValue, withTiming } from "react-native-reanimated";
import type { TimingConfig } from "./types";

/**
 * We use makeMutable (via useState) instead of useSharedValue because
 * useSharedValue's cleanup calls cancelAnimation, which kills in-flight
 * animations when the component re-renders in StrictMode.
 */

interface UseSlotOpacityParams {
  entering: boolean;
  exiting: boolean;
  opacityTiming: TimingConfig;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  onExitingStart?: () => void;
}

export function useSlotOpacity({
  entering,
  exiting,
  opacityTiming,
  exitKey,
  onExitComplete,
  onExitingStart,
}: UseSlotOpacityParams): SharedValue<number> {
  const [slotOpacity] = useState(() => makeMutable(entering ? 0 : 1));
  const prevStateRef = useRef<"entering" | "exiting" | "active" | null>(null);
  const currentState = entering ? "entering" : exiting ? "exiting" : "active";

  useLayoutEffect(() => {
    if (currentState === prevStateRef.current) return;
    const wasInitial = prevStateRef.current === null;
    prevStateRef.current = currentState;

    if (currentState === "entering") {
      slotOpacity.value = withTiming(1, {
        duration: opacityTiming.duration,
        easing: opacityTiming.easing,
      });
    } else if (currentState === "exiting") {
      slotOpacity.value = withTiming(
        0,
        {
          duration: opacityTiming.duration,
          easing: opacityTiming.easing,
        },
        (finished) => {
          "worklet";
          // Report completion even when the animation did NOT finish. An
          // interrupted withTiming reports `finished: false`, and gating the
          // callback on it leaks the slot: `useLayoutDiff` keeps the key in
          // `exitingRef` until `onExitComplete` fires, so the exiting glyph stays
          // mounted on top of the live one indefinitely.
          //
          // Pruning unconditionally is safe because `useLayoutDiff` deletes any
          // key present in the current layout during its diff, so a slot that has
          // re-entered is never removed by this path.
          if (onExitComplete && exitKey) {
            runOnJS(onExitComplete)(exitKey);
          }
        },
      );
      onExitingStart?.();
    } else if (!wasInitial) {
      slotOpacity.value = withTiming(1, {
        duration: opacityTiming.duration,
        easing: opacityTiming.easing,
      });
    }
  }, [currentState, opacityTiming, exitKey, onExitComplete, onExitingStart, slotOpacity]);

  return slotOpacity;
}
