import { useLayoutEffect, useRef, useState } from "react";
import {
  type SharedValue,
  makeMutable,
  withTiming,
} from "react-native-reanimated";
import type { TimingConfig } from "./types";

/**
 * We use makeMutable (via useState) instead of useSharedValue because
 * useSharedValue's cleanup calls cancelAnimation, which kills in-flight
 * animations when the component re-renders in StrictMode.
 */

export function useAnimatedX(
  targetX: number,
  exiting: boolean,
  transformTiming: TimingConfig,
): SharedValue<number> {
  const [animatedX] = useState(() => makeMutable(targetX));
  const prevXRef = useRef(targetX);

  useLayoutEffect(() => {
    if (!exiting && prevXRef.current !== targetX) {
      prevXRef.current = targetX;
      animatedX.value = withTiming(targetX, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }
  }, [targetX, exiting, transformTiming]);

  return animatedX;
}
