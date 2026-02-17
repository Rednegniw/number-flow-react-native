import { useEffect, useRef } from "react";
import type { CharLayout } from "./layout";
import type { TimingConfig } from "./types";

/**
 * Fires animation lifecycle callbacks (start/finish) when the layout changes.
 *
 * Uses refs for callbacks to avoid stale closures in the setTimeout,
 * and tracks previous layout to detect actual changes (not initial mount).
 */
export function useAnimationLifecycle(
  layout: CharLayout[],
  timings: { spin: TimingConfig; opacity: TimingConfig; transform: TimingConfig },
  onAnimationsStart?: () => void,
  onAnimationsFinish?: () => void,
): void {
  // Keep callback refs fresh so the setTimeout always calls the latest version
  const onStartRef = useRef(onAnimationsStart);
  onStartRef.current = onAnimationsStart;

  const onFinishRef = useRef(onAnimationsFinish);
  onFinishRef.current = onAnimationsFinish;

  // Track previous layout to distinguish real changes from initial mount
  const prevLayoutRef = useRef(layout);
  const prevLayoutLenRef = useRef(layout.length);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const layoutChanged = layout !== prevLayoutRef.current;
    const bothNonEmpty = layout.length > 0 && prevLayoutLenRef.current > 0;

    if (layoutChanged && bothNonEmpty) {
      onStartRef.current?.();

      if (animTimerRef.current) clearTimeout(animTimerRef.current);

      const maxDur = Math.max(
        timings.spin.duration,
        timings.opacity.duration,
        timings.transform.duration,
      );

      animTimerRef.current = setTimeout(() => onFinishRef.current?.(), maxDur);
    }

    prevLayoutRef.current = layout;
    prevLayoutLenRef.current = layout.length;

    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [layout, timings.spin, timings.opacity, timings.transform]);
}
