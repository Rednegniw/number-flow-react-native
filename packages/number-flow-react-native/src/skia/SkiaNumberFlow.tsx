import {
  Group,
  LinearGradient,
  Paint,
  Rect as SkiaRect,
  Text,
  vec,
} from "@shopify/react-native-skia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";
import { MASK_HEIGHT_RATIO, MASK_WIDTH_RATIO } from "../core/constants";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  ZERO_TIMING,
} from "../core/timing";
import { useDebouncedWidths } from "../core/useDebouncedWidths";
import { computeKeyedLayout, computeStringLayout } from "../core/layout";
import type { SkiaNumberFlowProps } from "../core/types";
import { useContinuousSpin } from "../core/useContinuousSpin";
import { useLayoutDiff } from "../core/useLayoutDiff";
import {
  getFormatCharacters,
  getOrCreateFormatter,
  useNumberFormatting,
} from "../core/useNumberFormatting";
import { useCanAnimate } from "../core/useCanAnimate";
import { getDigitCount, resolveTrend } from "../core/utils";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { warnOnce } from "../core/warnings";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const SkiaNumberFlow = ({
  value,
  format,
  locales,
  sharedValue,
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
  trend,
  animated,
  respectMotionPreference,
  continuous,
  digits,
  scrubDigitWidthPercentile = 0.75,
  onAnimationsStart,
  onAnimationsFinish,
  mask,
}: SkiaNumberFlowProps) => {
  const formatChars = useMemo(
    () => getFormatCharacters(locales, format, prefix, suffix),
    [locales, format, prefix, suffix],
  );
  const metrics = useGlyphMetrics(font, formatChars);

  const canAnimate = useCanAnimate(respectMotionPreference);
  const shouldAnimate = (animated ?? true) && canAnimate;

  const resolvedSpinTiming = shouldAnimate
    ? (spinTiming ?? DEFAULT_SPIN_TIMING)
    : ZERO_TIMING;
  const resolvedOpacityTiming = shouldAnimate
    ? (opacityTiming ?? DEFAULT_OPACITY_TIMING)
    : ZERO_TIMING;
  const resolvedTransformTiming = shouldAnimate
    ? (transformTiming ?? DEFAULT_TRANSFORM_TIMING)
    : ZERO_TIMING;

  const prevValueRef = useRef<number | undefined>(value);
  const resolvedTrend = resolveTrend(trend, prevValueRef.current, value);
  prevValueRef.current = value;

  if (__DEV__) {
    if (!font) {
      warnOnce(
        "skia-font",
        "font is null — pass a loaded SkFont from useFont(). Component renders empty until font loads.",
      );
    }
    if (value !== undefined && sharedValue !== undefined) {
      warnOnce(
        "skia-nf-both",
        "Both value and sharedValue provided. Use one or the other.",
      );
    }
    if (value === undefined && sharedValue === undefined) {
      warnOnce("skia-nf-neither", "Neither value nor sharedValue provided.");
    }
    if (scrubDigitWidthPercentile < 0 || scrubDigitWidthPercentile > 1) {
      warnOnce(
        "nf-percentile",
        "scrubDigitWidthPercentile should be between 0 and 1.",
      );
    }
    if (digits) {
      for (const [posStr, constraint] of Object.entries(digits)) {
        if (constraint.max < 1 || constraint.max > 9) {
          warnOnce(
            `skia-nf-digit-max-${posStr}`,
            `digits[${posStr}].max must be between 1 and 9, got ${constraint.max}.`,
          );
        }
      }
    }
  }

  const clampedPercentile = Math.max(0, Math.min(1, scrubDigitWidthPercentile));

  /**
   * Digit-count bridging: When the worklet-driven sharedValue crosses a
   * digit boundary (e.g. 99.9→100.0), the layout must have the correct number
   * of digit slots. We track the worklet's digit count and update a local
   * state to trigger a React re-render with the right slot count.
   * The enter/exit animation system handles the transition naturally.
   */
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
    sharedValue,
    prefix,
    suffix,
  );

  const spinGenerations = useContinuousSpin(
    keyedParts,
    continuous,
    resolvedTrend,
  );

  const digitWidths = useMemo(() => {
    if (!metrics) return null;
    return Array.from(
      { length: 10 },
      (_, d) => metrics.charWidths[String(d)] ?? metrics.maxDigitWidth,
    );
  }, [metrics]);

  /**
   * Compute tabular digit width for scrubbing mode.
   * Uses clampedPercentile to interpolate between min and max digit width.
   * 0 = narrowest digit, 0.5 = midpoint, 1 = widest digit.
   */
  const scrubDigitWidth = useMemo(() => {
    if (!digitWidths) return 0;
    let minWidth = Infinity;
    let maxWidth = 0;
    for (let i = 0; i < 10; i++) {
      if (digitWidths[i] < minWidth) minWidth = digitWidths[i];
      if (digitWidths[i] > maxWidth) maxWidth = digitWidths[i];
    }
    return minWidth + (maxWidth - minWidth) * clampedPercentile;
  }, [digitWidths, clampedPercentile]);

  const debouncedWidths = useDebouncedWidths(
    digitWidths,
    scrubDigitWidth,
    sharedValue,
    prefix,
    suffix,
  );

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (sharedValue && value === undefined) {
      const text = `${prefix}${sharedValue.value}${suffix}`;
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
    sharedValue,
    value,
  ]);

  const layoutDigitCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < layout.length; i++) {
      if (layout[i].isDigit) count++;
    }
    return count;
  }, [layout]);

  /**
   * Track digit count changes from worklet-driven scrubbing.
   * When the worklet's digit count differs from the layout's, schedule a
   * JS-side update to re-render with the correct number of digit slots.
   */
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

  // Store callbacks in refs so the setTimeout always calls the latest version
  const onAnimationsStartRef = useRef(onAnimationsStart);
  onAnimationsStartRef.current = onAnimationsStart;
  const onAnimationsFinishRef = useRef(onAnimationsFinish);
  onAnimationsFinishRef.current = onAnimationsFinish;

  const prevLayoutRef = useRef(layout);
  const prevLayoutLenRef = useRef(layout.length);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (
      layout.length > 0 &&
      prevLayoutLenRef.current > 0 &&
      layout !== prevLayoutRef.current
    ) {
      onAnimationsStartRef.current?.();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      const maxDur = Math.max(
        resolvedSpinTiming.duration,
        resolvedOpacityTiming.duration,
        resolvedTransformTiming.duration,
      );
      animTimerRef.current = setTimeout(
        () => onAnimationsFinishRef.current?.(),
        maxDur,
      );
    }
    prevLayoutRef.current = layout;
    prevLayoutLenRef.current = layout.length;
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [layout, resolvedSpinTiming, resolvedOpacityTiming, resolvedTransformTiming]);

  const { prevMap, isInitialRender, exitingEntries, onExitComplete } =
    useLayoutDiff(layout);

  /**
   * Stable serialization of format/locales for placeholder memo deps —
   * avoids re-runs when callers pass inline format objects.
   */
  const formatKey = useMemo(
    () => JSON.stringify([locales, format]),
    [locales, format],
  );

  const formattedString = useMemo(() => {
    if (value === undefined) return null;
    const formatter = getOrCreateFormatter(locales, format);
    return `${prefix}${formatter.format(value)}${suffix}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatKey, prefix, suffix]);

  /**
   * Skia components render inside <Canvas>, which is opaque to the accessibility tree.
   * Auto-announce value changes when a screen reader is active so users get audio feedback.
   * First render is skipped to avoid announcing the initial value.
   */
  const isFirstRender = useRef(true);
  const formattedLabel = useMemo(() => {
    if (keyedParts.length === 0) return undefined;
    return keyedParts.map((p) => p.char).join("");
  }, [keyedParts]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!formattedLabel) return;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (enabled) AccessibilityInfo.announceForAccessibility(formattedLabel);
    });
  }, [formattedLabel]);

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

  if (layout.length === 0 && exitingEntries.size === 0) {
    return <Group />;
  }

  const baseY = y;
  const resolvedMask = mask ?? true;
  const maskHeight = resolvedMask ? MASK_HEIGHT_RATIO * metrics.lineHeight : 0;
  const maskWidth = resolvedMask ? MASK_WIDTH_RATIO * metrics.lineHeight : 0;

  // Content bounds in the content group's local coordinate space
  const contentLeft = layout.reduce(
    (min, entry) => Math.min(min, entry.x),
    Infinity,
  );
  const contentRight = layout.reduce(
    (max, entry) => Math.max(max, entry.x + entry.width),
    0,
  );
  const contentWidth = layout.length > 0 ? contentRight - contentLeft : 0;

  let digitIndex = 0;
  let slotIndex = 0;

  const content = (
    <Group transform={[{ translateX: x }]}>
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        const currentSlotIndex = slotIndex++;
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          const digitCount = getDigitCount(digits, entry.key);
          const spinGeneration = spinGenerations?.get(entry.key);

          digitIndex++;
          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              continuousSpinGeneration={spinGeneration}
              digitCount={digitCount}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              font={font}
              key={entry.key}
              maskHeight={maskHeight}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              slotIndex={currentSlotIndex}
              spinTiming={resolvedSpinTiming}
              superscript={entry.superscript}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={resolvedTrend}
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
            superscript={entry.superscript}
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
            workletLayout={workletLayout}
          />
        );
      })}

      {Array.from(exitingEntries.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          const digitCount = getDigitCount(digits, key);

          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              digitCount={digitCount}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              font={font}
              key={key}
              maskHeight={maskHeight}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              superscript={entry.superscript}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={resolvedTrend}
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
            superscript={entry.superscript}
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}
    </Group>
  );

  /**
   * Container-level 2D gradient mask matching web NumberFlow's vignette.
   * Two DstIn-blended rects compose independent horizontal and vertical fades:
   * final_alpha = content_alpha × horizontal_alpha × vertical_alpha.
   * This produces smooth corners naturally (alpha multiplication).
   *
   * Architecture: content draws into a saveLayer, then each gradient rect
   * composites with DstIn (result = existing_content × gradient_alpha).
   */
  // Horizontal: fade extends OUTSIDE text edges (for enter/exit animations)
  // Vertical: fade is WITHIN the text line height (digits roll through it)
  const maskLeft = x + contentLeft - maskWidth;
  const maskRight = x + contentRight + maskWidth;
  const maskTop = baseY + metrics.ascent;
  const maskTotalWidth = contentWidth + 2 * maskWidth;
  const maskTotalHeight = metrics.lineHeight;
  const hRatio = maskTotalWidth > 0 ? maskWidth / maskTotalWidth : 0;
  const vRatio = maskTotalHeight > 0 ? maskHeight / maskTotalHeight : 0;

  const maskedContent = resolvedMask ? (
    <Group layer={<Paint />}>
      {content}

      {/* Horizontal fade */}
      <Group layer={<Paint blendMode="dstIn" />}>
        <SkiaRect height={maskTotalHeight} width={maskTotalWidth} x={maskLeft} y={maskTop}>
          <LinearGradient
            colors={["transparent", "black", "black", "transparent"]}
            end={vec(maskRight, 0)}
            positions={[0, hRatio, 1 - hRatio, 1]}
            start={vec(maskLeft, 0)}
          />
        </SkiaRect>
      </Group>

      {/* Vertical fade */}
      <Group layer={<Paint blendMode="dstIn" />}>
        <SkiaRect height={maskTotalHeight} width={maskTotalWidth} x={maskLeft} y={maskTop}>
          <LinearGradient
            colors={["transparent", "black", "black", "transparent"]}
            end={vec(0, maskTop + maskTotalHeight)}
            positions={[0, vRatio, 1 - vRatio, 1]}
            start={vec(0, maskTop)}
          />
        </SkiaRect>
      </Group>
    </Group>
  ) : content;

  if (opacity) {
    return <Group layer={<Paint opacity={opacity} />}>{maskedContent}</Group>;
  }

  return maskedContent;
};
