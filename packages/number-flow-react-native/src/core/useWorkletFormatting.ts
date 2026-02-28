import { useState } from "react";
import { makeMutable, type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { MAX_SLOTS } from "./constants";
import { localeDigitValue } from "./numerals";

/**
 * Watches a SharedValue<string> and extracts per-digit numeric values on the
 * UI thread. Returns an array of SharedValues indexed by digit position
 * (0 = first digit, 1 = second digit, etc.), skipping non-digit characters.
 *
 * This enables zero-latency digit updates during chart scrubbing: the worklet
 * writes directly to SharedValues without crossing the JS bridge.
 *
 * When sharedValue is empty (e.g., scrubbing ended), all slots are set to
 * -1, signaling DigitSlots to fall back to prop-driven animated updates.
 */
export function useWorkletFormatting(
  sharedValue: SharedValue<string> | undefined,
  prefix: string,
  suffix: string,
  zeroCodePoint = 48,
): SharedValue<number>[] | null {
  const [digitValues] = useState(() => Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)));

  useAnimatedReaction(
    () => sharedValue?.value ?? "",
    (current, previous) => {
      if (current === previous) return;

      if (!current) {
        for (let i = 0; i < MAX_SLOTS; i++) {
          digitValues[i].value = -1;
        }
        return;
      }

      const fullText = prefix + current + suffix;
      const len = fullText.length;
      let digitIndex = 0;

      for (let i = 0; i < len && digitIndex < MAX_SLOTS; i++) {
        const code = fullText.charCodeAt(i);
        const dv = localeDigitValue(code, zeroCodePoint);
        if (dv >= 0) {
          digitValues[digitIndex].value = dv;
          digitIndex++;
        }
      }

      for (let i = digitIndex; i < MAX_SLOTS; i++) {
        digitValues[i].value = -1;
      }
    },
    [prefix, suffix, zeroCodePoint],
  );

  if (!sharedValue) return null;
  return digitValues;
}
