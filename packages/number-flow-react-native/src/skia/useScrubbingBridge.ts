import { useCallback, useState } from "react";
import {
  makeMutable,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
} from "react-native-reanimated";
import { countDigits } from "../core/numerals";

interface UseScrubbingBridgeParams {
  sharedValue: SharedValue<string> | undefined;
  prefix: string;
  suffix: string;
  zeroCodePoint: number;
}

export interface UseScrubbingBridgeResult {
  effectiveString: string | undefined;
}

/**
 * Digit-count bridging for worklet-driven scrubbing.
 *
 * When the worklet-driven sharedValue crosses a digit boundary (e.g.
 * 99.9 → 100.0), the React-side layout must re-render with the correct
 * number of digit slots. This hook watches the worklet's digit count and
 * schedules a JS-side state update only when it changes, minimizing
 * JS thread round-trips during fast scrubbing.
 *
 * Also preserves the raw string from the worklet so downstream formatting
 * can avoid the parseFloat round-trip (which loses trailing decimals).
 */
export function useScrubbingBridge({
  sharedValue,
  prefix,
  suffix,
  zeroCodePoint,
}: UseScrubbingBridgeParams): UseScrubbingBridgeResult {
  const [scrubbingString, setScrubbingString] = useState<string | undefined>(undefined);

  const handleScrubbingUpdate = useCallback((rawString: string) => {
    setScrubbingString(rawString || undefined);
  }, []);

  const [prevWorkletDigitCount] = useState(() => makeMutable(-1));

  useAnimatedReaction(
    () => sharedValue?.value ?? "",
    (current, previous) => {
      // Reanimated fires on mount/re-subscribe even when nothing changed
      if (current === previous) return;

      // Shared value cleared — notify JS once, then skip until it's set again
      if (!current) {
        if (prevWorkletDigitCount.value === -1) return;

        prevWorkletDigitCount.value = -1;
        runOnJS(handleScrubbingUpdate)("");
        return;
      }

      // Only bridge to JS when digit count changes (e.g. 99 → 100)
      const fullText = prefix + current + suffix;
      const digitCount = countDigits(fullText, zeroCodePoint);
      if (digitCount === prevWorkletDigitCount.value) return;

      prevWorkletDigitCount.value = digitCount;
      runOnJS(handleScrubbingUpdate)(current);
    },
    [prefix, suffix, zeroCodePoint, handleScrubbingUpdate],
  );

  return { effectiveString: scrubbingString };
}
