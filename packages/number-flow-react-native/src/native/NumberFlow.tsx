import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  ZERO_TIMING,
} from "../core/constants";
import type { Trend } from "../core/types";
import { computeKeyedLayout, computeStringLayout } from "../core/layout";
import { useLayoutDiff } from "../core/useLayoutDiff";
import {
  getFormatCharacters,
  useNumberFormatting,
} from "../core/useNumberFormatting";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { warnOnce } from "../core/warnings";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import type { NumberFlowProps } from "./types";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const NumberFlow = ({
  value,
  format,
  locales,
  sharedValue,
  style: nfStyle,
  textAlign = "left",
  prefix = "",
  suffix = "",
  spinTiming,
  opacityTiming,
  transformTiming,
  trend,
  animated,
  respectMotionPreference,
  onAnimationsStart,
  onAnimationsFinish,
  containerStyle,
}: NumberFlowProps) => {
  const formatChars = useMemo(
    () => getFormatCharacters(locales, format, prefix, suffix),
    [locales, format, prefix, suffix],
  );
  const { metrics, MeasureElement } = useGlyphMetrics(nfStyle, formatChars);

  // Animated + reduced motion
  const reducedMotion = useReducedMotion();
  const shouldAnimate =
    (animated ?? true) && !(respectMotionPreference !== false && reducedMotion);

  const resolvedSpinTiming = shouldAnimate
    ? (spinTiming ?? DEFAULT_SPIN_TIMING)
    : ZERO_TIMING;
  const resolvedOpacityTiming = shouldAnimate
    ? (opacityTiming ?? DEFAULT_OPACITY_TIMING)
    : ZERO_TIMING;
  const resolvedTransformTiming = shouldAnimate
    ? (transformTiming ?? DEFAULT_TRANSFORM_TIMING)
    : ZERO_TIMING;

  // Trend auto-detection
  const prevValueRef = useRef<number | undefined>(value);
  let resolvedTrend: Trend;
  if (trend !== undefined) {
    resolvedTrend = trend;
  } else if (
    value !== undefined &&
    prevValueRef.current !== undefined &&
    prevValueRef.current !== value
  ) {
    resolvedTrend = Math.sign(value - prevValueRef.current) as Trend;
  } else {
    resolvedTrend = 0;
  }
  prevValueRef.current = value;

  // Dev warnings
  if (__DEV__) {
    if (!nfStyle.fontSize) {
      warnOnce(
        "nf-fontSize",
        "style.fontSize is required for NumberFlow to measure glyphs.",
      );
    }
    if (value !== undefined && sharedValue !== undefined) {
      warnOnce(
        "nf-both",
        "Both value and sharedValue provided. Use one or the other.",
      );
    }
    if (value === undefined && sharedValue === undefined) {
      warnOnce(
        "nf-neither",
        "Neither value nor sharedValue provided.",
      );
    }
  }

  const keyedParts = useNumberFormatting(
    value,
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

  const [containerWidth, setContainerWidth] = useState(0);
  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const effectiveWidth = containerWidth;

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (sharedValue && value === undefined) {
      const text = `${prefix}${sharedValue.value}${suffix}`;
      return computeStringLayout(text, metrics, effectiveWidth, textAlign);
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, effectiveWidth, textAlign);
  }, [
    metrics,
    keyedParts,
    effectiveWidth,
    textAlign,
    prefix,
    suffix,
    sharedValue,
    value,
  ]);

  // Animation lifecycle callbacks — use refs to avoid stale closures in setTimeout
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

  const textStyle = useMemo(
    () => ({
      ...nfStyle,
      color: nfStyle.color ?? "#000000",
    }),
    [nfStyle],
  );

  // Accessibility label
  const accessibilityLabel = useMemo(() => {
    if (sharedValue) return sharedValue.value;
    if (keyedParts.length === 0) return undefined;
    return keyedParts.map((p) => p.char).join("");
  }, [keyedParts, sharedValue]);

  if (!metrics) {
    return (
      <View onLayout={handleContainerLayout} style={containerStyle}>
        {MeasureElement}
      </View>
    );
  }

  if (layout.length === 0 && exitingEntries.size === 0) {
    return (
      <View onLayout={handleContainerLayout} style={containerStyle}>
        {MeasureElement}
      </View>
    );
  }

  let digitIndex = 0;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      onLayout={handleContainerLayout}
      style={[
        containerStyle,
        { height: metrics.lineHeight, position: "relative" },
      ]}
    >
      {MeasureElement}

      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          digitIndex++;
          return (
            <DigitSlot
              charWidth={entry.width}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              key={entry.key}
              lineHeight={metrics.lineHeight}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              textStyle={textStyle}
              transformTiming={resolvedTransformTiming}
              trend={resolvedTrend}
              workletDigitValue={wdv}
            />
          );
        }
        return (
          <SymbolSlot
            char={entry.char}
            entering={isEntering}
            exiting={false}
            key={entry.key}
            lineHeight={metrics.lineHeight}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            textStyle={textStyle}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}

      {Array.from(exitingEntries.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          return (
            <DigitSlot
              charWidth={entry.width}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              key={key}
              lineHeight={metrics.lineHeight}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              textStyle={textStyle}
              transformTiming={resolvedTransformTiming}
              trend={resolvedTrend}
            />
          );
        }
        return (
          <SymbolSlot
            char={entry.char}
            entering={false}
            exitKey={key}
            exiting
            key={key}
            lineHeight={metrics.lineHeight}
            onExitComplete={onExitComplete}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            textStyle={textStyle}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}
    </View>
  );
};
