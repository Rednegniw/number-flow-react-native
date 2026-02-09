import { Group, Paint, Text } from "@shopify/react-native-skia";
import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import {
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
} from "../core/constants";
import { useDebouncedWidths } from "../core/useDebouncedWidths";
import {
  type CharLayout,
  computeKeyedLayout,
  computeStringLayout,
} from "../core/layout";
import type { SkiaNumberFlowProps } from "../core/types";
import {
  getOrCreateFormatter,
  useNumberFormatting,
} from "../core/useNumberFormatting";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const SkiaNumberFlow = ({
  value,
  format,
  locales,
  formattedValue,
  font,
  color = "#000000",
  x = 0,
  y = 0,
  width = 0,
  textAlign = "left",
  prefix = "",
  suffix = "",
  opacity,
  spinTiming,
  opacityTiming,
  transformTiming,
  trend = 0,
  scrubDigitWidthPercentile = 0.75,
}: SkiaNumberFlowProps) => {
  // Pass prefix + suffix to measure any diacritics or special characters
  const metrics = useGlyphMetrics(font, prefix + suffix);

  const resolvedSpinTiming = spinTiming ?? DEFAULT_SPIN_TIMING;
  const resolvedOpacityTiming = opacityTiming ?? DEFAULT_OPACITY_TIMING;
  const resolvedTransformTiming = transformTiming ?? DEFAULT_TRANSFORM_TIMING;

  // ── Digit-count bridging ──────────────────────────────────────────
  // When the worklet-driven formattedValue crosses a digit boundary
  // (e.g. 99.9→100.0), the layout must have the correct number of
  // digit slots. We track the worklet's digit count and update a local
  // state to trigger a React re-render with the right slot count.
  // The enter/exit animation system handles the transition naturally.
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

  const keyedParts = useNumberFormatting(
    effectiveValue,
    format,
    locales,
    prefix,
    suffix,
  );

  const workletDigitValues = useWorkletFormatting(
    formattedValue,
    prefix,
    suffix,
  );

  // Pre-compute per-digit widths as an array for efficient worklet access
  const digitWidths = useMemo(() => {
    if (!metrics) return null;
    return Array.from(
      { length: 10 },
      (_, d) => metrics.charWidths[String(d)] ?? metrics.maxDigitWidth,
    );
  }, [metrics]);

  // Compute tabular digit width for scrubbing mode.
  // Uses scrubDigitWidthPercentile to interpolate between min and max digit width.
  // 0 = narrowest digit, 0.5 = midpoint, 1 = widest digit.
  // Default 0.75 gives a good balance: tight but minimal clipping.
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
    formattedValue,
    prefix,
    suffix,
  );

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (formattedValue && value === undefined) {
      const text = `${prefix}${formattedValue.value}${suffix}`;
      return computeStringLayout(text, metrics, width, textAlign);
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign);
  }, [
    metrics,
    keyedParts,
    width,
    textAlign,
    prefix,
    suffix,
    formattedValue,
    value,
  ]);

  // Count digit slots in the current layout (JS-side, for worklet comparison)
  const layoutDigitCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < layout.length; i++) {
      if (layout[i].isDigit) count++;
    }
    return count;
  }, [layout]);

  // Track digit count changes from worklet-driven scrubbing.
  // When the worklet's digit count differs from the layout's, schedule a
  // JS-side update to re-render with the correct number of digit slots.
  const [prevWorkletDigitCount] = useState(() => makeMutable(-1));

  useAnimatedReaction(
    () => formattedValue?.value ?? "",
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
        if (c >= 48 && c <= 57) digitCount++;
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

  // Worklet-computed layout for proportional per-digit widths during scrubbing.
  // Uses the prop layout's slot structure but substitutes digit widths based on
  // the actual workletDigitValues. This ensures the worklet layout always has
  // the same number of entries as the prop layout (no slotIndex mismatch).
  const workletLayout = useDerivedValue((): { x: number; width: number }[] => {
    if (!formattedValue || !digitWidths || layout.length === 0) return [];
    if (!formattedValue.value) return [];

    // Verify digit count alignment — during the 1-frame gap between
    // a worklet digit-count change and the React re-render, the layout
    // slot count doesn't match the worklet's digits. Fall back to prop
    // layout positions to avoid index misalignment artifacts.
    const fullText = prefix + formattedValue.value + suffix;
    let workletDigitCount = 0;
    for (let i = 0; i < fullText.length; i++) {
      const c = fullText.charCodeAt(i);
      if (c >= 48 && c <= 57) workletDigitCount++;
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

  // ── Enter/Exit tracking ────────────────────────────────────────
  const prevLayoutRef = useRef<CharLayout[]>([]);
  const exitingRef = useRef<Map<string, CharLayout>>(new Map());
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const isFirstLayoutRef = useRef(true);

  // StrictMode-safe: only process diff once per layout change.
  const lastDiffIdRef = useRef("");
  const diffResultRef = useRef<{
    prevMap: Map<string, CharLayout>;
    isInitialRender: boolean;
  }>({ prevMap: new Map(), isInitialRender: true });

  // useCallback must be called before any early returns (Rules of Hooks)
  const onExitComplete = useCallback((key: string) => {
    exitingRef.current.delete(key);
    forceUpdate();
  }, []);

  // Stable serialization of format/locales for placeholder memo deps
  // (avoids re-runs when callers pass inline format objects)
  const formatKey = useMemo(
    () => JSON.stringify([locales, format]),
    [locales, format],
  );

  // Format value to string for placeholder rendering while font/metrics load
  const formattedString = useMemo(() => {
    if (value === undefined) return null;
    const formatter = getOrCreateFormatter(locales, format);
    return `${prefix}${formatter.format(value)}${suffix}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatKey, prefix, suffix]);

  if (!font || !metrics) {
    if (font && formattedString) {
      const textWidth = font.measureText(formattedString).width;
      const xOffset =
        textAlign === "center"
          ? (width - textWidth) / 2
          : textAlign === "right"
            ? width - textWidth
            : 0;

      const placeholderContent = (
        <Group transform={[{ translateX: x }]}>
          <Text
            color={color}
            font={font}
            text={formattedString}
            x={xOffset}
            y={y}
          />
        </Group>
      );

      if (opacity) {
        return (
          <Group layer={<Paint opacity={opacity} />}>
            {placeholderContent}
          </Group>
        );
      }
      return placeholderContent;
    }
    return <Group />;
  }

  // Stable layout identity — fast string concat instead of map+join
  let layoutId = "";
  for (const s of layout) {
    layoutId += s.key;
    layoutId += s.digitValue;
  }

  // Only run diff logic once per layout change (idempotent under StrictMode)
  if (layoutId !== lastDiffIdRef.current) {
    lastDiffIdRef.current = layoutId;

    const currentKeys = new Set(layout.map((s) => s.key));
    const prevMap = new Map(prevLayoutRef.current.map((s) => [s.key, s]));

    for (const prev of prevLayoutRef.current) {
      if (!currentKeys.has(prev.key) && !exitingRef.current.has(prev.key)) {
        exitingRef.current.set(prev.key, prev);
      }
    }

    for (const key of currentKeys) {
      exitingRef.current.delete(key);
    }

    const isInitialRender = isFirstLayoutRef.current;
    if (layout.length > 0) isFirstLayoutRef.current = false;

    diffResultRef.current = { prevMap, isInitialRender };
    prevLayoutRef.current = layout;
  }

  const { prevMap, isInitialRender } = diffResultRef.current;

  if (layout.length === 0 && exitingRef.current.size === 0) {
    return <Group />;
  }

  const baseY = y;

  let digitIndex = 0;
  let slotIndex = 0;

  const content = (
    <Group transform={[{ translateX: x }]}>
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        const currentSlotIndex = slotIndex++;
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          digitIndex++;
          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              font={font}
              key={entry.key}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              slotIndex={currentSlotIndex}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={trend}
              workletDigitValue={wdv}
              workletLayout={workletLayout}
            />
          );
        }
        return (
          <SymbolSlot
            baseY={baseY}
            char={entry.char}
            color={color}
            entering={isEntering}
            exiting={false}
            font={font}
            key={entry.key}
            opacityTiming={resolvedOpacityTiming}
            slotIndex={currentSlotIndex}
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
            workletLayout={workletLayout}
          />
        );
      })}

      {Array.from(exitingRef.current.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              font={font}
              key={key}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={trend}
            />
          );
        }
        return (
          <SymbolSlot
            baseY={baseY}
            char={entry.char}
            color={color}
            entering={false}
            exitKey={key}
            exiting
            font={font}
            key={key}
            onExitComplete={onExitComplete}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}
    </Group>
  );

  if (opacity) {
    return <Group layer={<Paint opacity={opacity} />}>{content}</Group>;
  }

  return content;
};
