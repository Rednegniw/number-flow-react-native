import { useState } from "react";
import {
  makeMutable,
  type SharedValue,
  useAnimatedReaction,
  withTiming,
} from "react-native-reanimated";
import { MAX_SLOTS } from "./constants";
import { localeDigitValue } from "./numerals";

const WIDTH_ANIM_MS = 200;

/**
 * Creates a pool of SharedValue<number> that hold digit widths for worklet layout.
 *
 * **Tabular mode during scrubbing**: While sharedValue is active (scrubbing),
 * all digits use a fixed width (scrubDigitWidth) — this eliminates jitter entirely
 * because all digits occupy the same width regardless of which digit (0-9) is displayed.
 * Only digits are affected; symbols (like `.`) keep their natural width.
 *
 * **Proportional mode when idle**: When scrubbing ends (sharedValue becomes
 * empty), widths animate to proportional values for natural typography.
 *
 * This approach gives the best of both worlds: stable layout during rapid
 * scrubbing, and beautiful proportional spacing for static display.
 */
export function useDebouncedWidths(
  digitWidths: number[] | null,
  scrubDigitWidth: number,
  sharedValue: SharedValue<string> | undefined,
  prefix: string,
  suffix: string,
  zeroCodePoint = 48,
): SharedValue<number>[] {
  const [debouncedWidths] = useState(() =>
    Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)),
  );
  const [prevDigits] = useState(() => Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)));
  const [wasActive] = useState(() => makeMutable(false));

  useAnimatedReaction(
    () => sharedValue?.value ?? "",
    (current, previous) => {
      if (current === previous) return;
      if (!digitWidths) return;

      if (!current) {
        // Scrubbing ended — animate to proportional widths
        if (wasActive.value) {
          wasActive.value = false;
          for (let i = 0; i < MAX_SLOTS; i++) {
            const prevDv = prevDigits[i].value;
            if (prevDv >= 0) {
              const proportionalWidth = digitWidths[prevDv];
              debouncedWidths[i].value = withTiming(proportionalWidth, {
                duration: WIDTH_ANIM_MS,
              });
            } else {
              debouncedWidths[i].value = -1;
            }
            prevDigits[i].value = -1;
          }
        }
        return;
      }

      const isFirstActivation = !wasActive.value;
      if (isFirstActivation) wasActive.value = true;

      const fullText = prefix + current + suffix;
      const len = fullText.length;
      let digitIndex = 0;

      for (let i = 0; i < len && digitIndex < MAX_SLOTS; i++) {
        const code = fullText.charCodeAt(i);
        const dv = localeDigitValue(code, zeroCodePoint);
        if (dv >= 0) {
          prevDigits[digitIndex].value = dv;
          debouncedWidths[digitIndex].value = scrubDigitWidth;
          digitIndex++;
        }
      }

      for (let i = digitIndex; i < MAX_SLOTS; i++) {
        if (debouncedWidths[i].value !== -1) debouncedWidths[i].value = -1;
        prevDigits[i].value = -1;
      }
    },
    [prefix, suffix, digitWidths, scrubDigitWidth, zeroCodePoint],
  );

  return debouncedWidths;
}
