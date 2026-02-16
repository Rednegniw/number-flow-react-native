import { useCallback, useMemo, useState } from "react";
import {
  type SharedValue,
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";
import type { CharLayout } from "../core/layout";
import type { GlyphMetrics, TextAlign } from "../core/types";
import { useDebouncedWidths } from "../core/useDebouncedWidths";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { workletDigitValue } from "../core/utils";

// ---------------------------------------------------------------------------
// useScrubbingBridge
// ---------------------------------------------------------------------------

interface UseScrubbingBridgeParams {
  sharedValue: SharedValue<string> | undefined;
  value: number | undefined;
  prefix: string;
  suffix: string;
  zeroCodePoint: number;
}

interface UseScrubbingBridgeResult {
  effectiveValue: number | undefined;
}

/**
 * Digit-count bridging for worklet-driven scrubbing.
 *
 * When the worklet-driven sharedValue crosses a digit boundary (e.g.
 * 99.9 → 100.0), the React-side layout must re-render with the correct
 * number of digit slots. This hook watches the worklet's digit count and
 * schedules a JS-side state update when it changes.
 *
 * Must be called **before** `useNumberFormatting` so the returned
 * `effectiveValue` can feed into the formatter.
 */
export function useScrubbingBridge({
  sharedValue,
  value,
  prefix,
  suffix,
  zeroCodePoint,
}: UseScrubbingBridgeParams): UseScrubbingBridgeResult {
  const [scrubbingValue, setScrubbingValue] = useState<number | undefined>(
    undefined,
  );

  const handleScrubbingValueUpdate = useCallback((numericValue: number) => {
    if (numericValue < 0) {
      setScrubbingValue(undefined);
    } else {
      setScrubbingValue(numericValue);
    }
  }, []);

  const effectiveValue = scrubbingValue !== undefined ? scrubbingValue : value;

  const [prevWorkletDigitCount] = useState(() => makeMutable(-1));

  useAnimatedReaction(
    () => sharedValue?.value ?? "",
    (current, previous) => {
      if (current === previous) return;

      if (!current) {
        if (prevWorkletDigitCount.value !== -1) {
          prevWorkletDigitCount.value = -1;
          runOnJS(handleScrubbingValueUpdate)(-1);
        }
        return;
      }

      const fullText = prefix + current + suffix;
      let digitCount = 0;
      for (let i = 0; i < fullText.length; i++) {
        const c = fullText.charCodeAt(i);
        if (workletDigitValue(c, zeroCodePoint) >= 0) digitCount++;
      }

      if (digitCount !== prevWorkletDigitCount.value) {
        prevWorkletDigitCount.value = digitCount;
        const numericValue = parseFloat(current);
        if (!isNaN(numericValue)) {
          runOnJS(handleScrubbingValueUpdate)(numericValue);
        }
      }
    },
    [prefix, suffix, handleScrubbingValueUpdate],
  );

  return { effectiveValue };
}

// ---------------------------------------------------------------------------
// useScrubbingLayout
// ---------------------------------------------------------------------------

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
  const workletDigitValues = useWorkletFormatting(
    sharedValue,
    prefix,
    suffix,
    zeroCodePoint,
  );

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
     * Verify digit count alignment — during the 1-frame gap between
     * a worklet digit-count change and the React re-render, the layout
     * slot count doesn't match the worklet's digits. Fall back to prop
     * layout positions to avoid index misalignment artifacts.
     */
    const fullText = prefix + sharedValue.value + suffix;
    let workletDigitCount = 0;
    for (let i = 0; i < fullText.length; i++) {
      const c = fullText.charCodeAt(i);
      if (workletDigitValue(c, zeroCodePoint) >= 0) workletDigitCount++;
    }
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

    let startX = 0;
    if (textAlign === "right") startX = width - contentWidth;
    else if (textAlign === "center") startX = (width - contentWidth) / 2;

    let currentX = startX;
    for (const entry of entries) {
      entry.x = currentX;
      currentX += entry.width;
    }

    return entries;
  });

  return { workletDigitValues, workletLayout };
}
