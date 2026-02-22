import { useMemo } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { assignXPositions, type CharLayout } from "../core/layout";
import { countDigits } from "../core/numerals";
import type { GlyphMetrics, TextAlign } from "../core/types";
import { useDebouncedWidths } from "../core/useDebouncedWidths";
import { useWorkletFormatting } from "../core/useWorkletFormatting";

interface UseScrubbingLayoutParams {
  sharedValue: SharedValue<string> | undefined;
  prefix: string;
  suffix: string;
  zeroCodePoint: number;
  metrics: GlyphMetrics | null;
  digitStringsArr: string[];
  scrubDigitWidthPercentile: number;
  layout: CharLayout[];
  layoutDigitCount: number;
  width: number;
  textAlign: TextAlign;
}

interface UseScrubbingLayoutResult {
  workletDigitValues: SharedValue<number>[] | null;
  workletLayout: SharedValue<{ x: number; width: number }[]>;
}

/**
 * Worklet-driven layout and digit extraction for scrubbing mode.
 *
 * Encapsulates:
 * - `useWorkletFormatting`: per-digit SharedValues from the sharedValue string
 * - Tabular digit widths: fixed-width digits during scrubbing to prevent jitter
 * - `useDebouncedWidths`: animated transition between tabular and proportional
 * - `workletLayout`: UI-thread-computed per-slot x/width using debounced widths
 *
 * Must be called **after** the layout is computed from `computeKeyedLayout`.
 */
export function useScrubbingLayout({
  sharedValue,
  prefix,
  suffix,
  zeroCodePoint,
  metrics,
  digitStringsArr,
  scrubDigitWidthPercentile,
  layout,
  layoutDigitCount,
  width,
  textAlign,
}: UseScrubbingLayoutParams): UseScrubbingLayoutResult {
  const workletDigitValues = useWorkletFormatting(sharedValue, prefix, suffix, zeroCodePoint);

  const digitWidths = useMemo(() => {
    if (!metrics) return null;
    return Array.from(
      { length: 10 },
      (_, d) => metrics.charWidths[digitStringsArr[d]] ?? metrics.maxDigitWidth,
    );
  }, [metrics, digitStringsArr]);

  /**
   * Tabular digit width for scrubbing mode.
   * Interpolates between min and max digit width using the percentile.
   * 0 = narrowest, 0.5 = midpoint, 1 = widest.
   */
  const scrubDigitWidth = useMemo(() => {
    if (!digitWidths) return 0;

    let minWidth = Infinity;
    let maxWidth = 0;
    for (let i = 0; i < 10; i++) {
      if (digitWidths[i] < minWidth) minWidth = digitWidths[i];
      if (digitWidths[i] > maxWidth) maxWidth = digitWidths[i];
    }

    return minWidth + (maxWidth - minWidth) * scrubDigitWidthPercentile;
  }, [digitWidths, scrubDigitWidthPercentile]);

  const debouncedWidths = useDebouncedWidths(
    digitWidths,
    scrubDigitWidth,
    sharedValue,
    prefix,
    suffix,
    zeroCodePoint,
  );

  /**
   * Worklet-computed layout for proportional per-digit widths during scrubbing.
   * Uses the prop layout's slot structure but substitutes digit widths based on
   * the actual workletDigitValues. This ensures the worklet layout always has
   * the same number of entries as the prop layout (no slotIndex mismatch).
   */
  const workletLayout = useDerivedValue((): { x: number; width: number }[] => {
    if (!sharedValue || !digitWidths || layout.length === 0) return [];
    if (!sharedValue.value) return [];

    /**
     * During the 1-frame gap between a worklet digit-count change and
     * the React re-render, the layout slot count doesn't match the
     * worklet's digits. Fall back to empty to avoid misalignment.
     */
    const fullText = prefix + sharedValue.value + suffix;
    const workletDigitCount = countDigits(fullText, zeroCodePoint);
    if (workletDigitCount !== layoutDigitCount) return [];

    const entries: { x: number; width: number }[] = [];
    let contentWidth = 0;
    let digitIdx = 0;

    for (let i = 0; i < layout.length; i++) {
      const slot = layout[i];
      let slotWidth: number;

      if (slot.isDigit) {
        const dw = debouncedWidths[digitIdx].value;
        slotWidth = dw > 0 ? dw : slot.width;
        digitIdx++;
      } else {
        slotWidth = slot.width;
      }

      contentWidth += slotWidth;
      entries.push({ x: 0, width: slotWidth });
    }

    assignXPositions(entries, width, textAlign, contentWidth);

    return entries;
  });

  return { workletDigitValues, workletLayout };
}
