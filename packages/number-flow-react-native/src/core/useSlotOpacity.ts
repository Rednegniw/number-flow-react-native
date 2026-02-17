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
          if (finished && onExitComplete && exitKey) {
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
