import { useLayoutEffect, useRef, useState } from "react";
import { makeMutable, type SharedValue, withTiming } from "react-native-reanimated";
import type { TimingConfig } from "./types";

declare global {
  var __NF_TRACE: { t: number; msg: string }[] | undefined;
}

/** Dev-only trace: set globalThis.__NF_TRACE = [] in a debugger to record */
function trace(msg: string): void {
  if (__DEV__ && globalThis.__NF_TRACE) {
    globalThis.__NF_TRACE.push({ t: Date.now(), msg });
  }
}

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
      trace(
        `animatedX ${prevXRef.current} -> ${targetX} (${hasAnimatedRef.current ? "animate" : "SNAP"})`,
      );
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
