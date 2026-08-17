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

  /**
   * Every x change animates. An earlier revision snapped the FIRST change of
   * each slot (added to stop a slide-in when Skia shared mode initialized),
   * but that made a slot whose x stayed constant across several values
   * teleport on its first legitimate move while sibling slots animated,
   * visibly breaking digit spacing for the whole transition. The slide-in
   * case no longer reaches this hook: slots mount only after metrics (and,
   * for center/right alignment, container width) are known, and shared-mode
   * Skia slots are positioned by workletLayout rather than animatedX.
   */
  useLayoutEffect(() => {
    if (!exiting && prevXRef.current !== targetX) {
      trace(`animatedX ${prevXRef.current} -> ${targetX} (animate)`);
      prevXRef.current = targetX;

      animatedX.value = withTiming(targetX, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }
  }, [targetX, exiting, transformTiming, animatedX]);

  return animatedX;
}
