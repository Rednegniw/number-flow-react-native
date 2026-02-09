import { useState } from "react";
import {
  type SharedValue,
  makeMutable,
  useAnimatedReaction,
  withTiming,
} from "react-native-reanimated";
import { MAX_SLOTS } from "./constants";

const WIDTH_ANIM_MS = 200;

/**
 * Creates a pool of SharedValue<number> that hold digit widths for worklet layout.
 *
 * **Tabular mode during scrubbing**: While formattedValue is active (scrubbing),
 * all digits use a fixed width (scrubDigitWidth) — this eliminates jitter entirely
 * because all digits occupy the same width regardless of which digit (0-9) is displayed.
 * Only digits are affected; symbols (like `.`) keep their natural width.
 *
 * **Proportional mode when idle**: When scrubbing ends (formattedValue becomes
 * empty), widths animate to proportional values for natural typography.
 *
 * This approach gives the best of both worlds: stable layout during rapid
 * scrubbing, and beautiful proportional spacing for static display.
 */
export function useDebouncedWidths(
  digitWidths: number[] | null,
  scrubDigitWidth: number,
  formattedValue: SharedValue<string> | undefined,
  prefix: string,
  suffix: string,
): SharedValue<number>[] {
  const [debouncedWidths] = useState(() =>
    Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)),
  );
  const [prevDigits] = useState(() =>
    Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)),
  );
  const [wasActive] = useState(() => makeMutable(false));

  useAnimatedReaction(
    () => formattedValue?.value ?? "",
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
              // Animate from tabular (scrubDigitWidth) to proportional
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
        if (code >= 48 && code <= 57) {
          const dv = code - 48;
          prevDigits[digitIndex].value = dv;
          // Always use scrubDigitWidth during scrubbing (tabular mode)
          debouncedWidths[digitIndex].value = scrubDigitWidth;
          digitIndex++;
        }
      }

      for (let i = digitIndex; i < MAX_SLOTS; i++) {
        if (debouncedWidths[i].value !== -1) debouncedWidths[i].value = -1;
        prevDigits[i].value = -1;
      }
    },
    [prefix, suffix, digitWidths, scrubDigitWidth],
  );

  return debouncedWidths;
}
