import { useLayoutEffect, useRef, useState } from "react";
import { makeMutable, type SharedValue, withTiming } from "react-native-reanimated";
import type { TimingConfig } from "./types";

/**
 * We use makeMutable (via useState) instead of useSharedValue because
 * useSharedValue's cleanup calls cancelAnimation.
 */
export function useAnimatedX(
  targetX: number,
  exiting: boolean,
  transformTiming: TimingConfig,
): SharedValue<number> {
  const [animatedX] = useState(() => makeMutable(targetX));
  const prevXRef = useRef(targetX);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    if (!exiting && prevXRef.current !== targetX) {
      prevXRef.current = targetX;

      if (!hasAnimatedRef.current) {
        hasAnimatedRef.current = true;
        animatedX.value = targetX;
        return;
      }

      animatedX.value = withTiming(targetX, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }
  }, [targetX, exiting, transformTiming, animatedX]);

  return animatedX;
}
