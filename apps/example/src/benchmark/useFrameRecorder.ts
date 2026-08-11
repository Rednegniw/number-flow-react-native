import { useCallback } from "react";
import { runOnJS, runOnUI, useFrameCallback } from "react-native-reanimated";

declare global {
  var __benchFrames: number[] | undefined;
}

/**
 * Records UI-thread frame deltas into a worklet-runtime global array.
 * Nothing crosses to JS and nothing is allocated per frame beyond the
 * array push, so the recorder does not perturb what it measures.
 * The buffer crosses to JS exactly once, in stop().
 */
export function useFrameRecorder(): {
  start: () => void;
  stop: () => Promise<number[]>;
} {
  const frameCallback = useFrameCallback((info) => {
    const delta = info.timeSincePreviousFrame;
    if (delta === null) return;

    const buffer = global.__benchFrames;
    if (buffer !== undefined) buffer.push(delta);
  }, false);

  const start = useCallback(() => {
    runOnUI(() => {
      global.__benchFrames = [];
    })();
    frameCallback.setActive(true);
  }, [frameCallback]);

  const stop = useCallback((): Promise<number[]> => {
    frameCallback.setActive(false);

    return new Promise<number[]>((resolve) => {
      runOnUI(() => {
        const frames = global.__benchFrames ?? [];
        global.__benchFrames = undefined;
        runOnJS(resolve)(frames);
      })();
    });
  }, [frameCallback]);

  return { start, stop };
}
