import MaskedView from "@rednegniw/masked-view";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  MASK_HEIGHT_RATIO,
  ZERO_TIMING,
} from "../core/constants";
import { computeKeyedLayout, computeStringLayout } from "../core/layout";
import { useContinuousSpin } from "../core/useContinuousSpin";
import { useLayoutDiff } from "../core/useLayoutDiff";
import {
  getFormatCharacters,
  useNumberFormatting,
} from "../core/useNumberFormatting";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { getDigitCount, resolveTrend } from "../core/utils";
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
  continuous,
  digits,
  onAnimationsStart,
  onAnimationsFinish,
  containerStyle,
  mask,
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

  const prevValueRef = useRef<number | undefined>(value);
  const resolvedTrend = resolveTrend(trend, prevValueRef.current, value);
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
    if (digits) {
      for (const [posStr, constraint] of Object.entries(digits)) {
        if (constraint.max < 1 || constraint.max > 9) {
          warnOnce(
            `nf-digit-max-${posStr}`,
            `digits[${posStr}].max must be between 1 and 9, got ${constraint.max}.`,
          );
        }
      }
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

  const spinGenerations = useContinuousSpin(
    keyedParts,
    continuous,
    resolvedTrend,
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

  const resolvedMask = mask ?? true;
  const lineHeight = metrics?.lineHeight ?? 0;
  const maskHeight = resolvedMask ? MASK_HEIGHT_RATIO * lineHeight : 0;
  const MASK_STEPS = 12;
  const stepHeight = maskHeight / MASK_STEPS;

  const gradientMaskElement = useMemo(() => {
    if (!resolvedMask || lineHeight === 0) return null;
    return (
      <View style={{ flex: 1, flexDirection: "column" }}>
        {/* Top fade: transparent → opaque */}
        {Array.from({ length: MASK_STEPS }, (_, i) => (
          <View
            key={`t${i}`}
            style={{
              height: stepHeight,
              backgroundColor: `rgba(0,0,0,${i / (MASK_STEPS - 1)})`,
            }}
          />
        ))}
        {/* Middle: fully opaque */}
        <View style={{ flex: 1, backgroundColor: "black" }} />
        {/* Bottom fade: opaque → transparent */}
        {Array.from({ length: MASK_STEPS }, (_, i) => (
          <View
            key={`b${i}`}
            style={{
              height: stepHeight,
              backgroundColor: `rgba(0,0,0,${1 - i / (MASK_STEPS - 1)})`,
            }}
          />
        ))}
      </View>
    );
  }, [resolvedMask, lineHeight, stepHeight]);

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

  const slots = (
    <>
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          const digitCount = getDigitCount(digits, entry.key);
          const spinGeneration = spinGenerations?.get(entry.key);

          digitIndex++;
          return (
            <DigitSlot
              charWidth={entry.width}
              continuousSpinGeneration={spinGeneration}
              digitCount={digitCount}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              key={entry.key}
              lineHeight={metrics.lineHeight}
              maskHeight={maskHeight}
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
          const digitCount = getDigitCount(digits, key);

          return (
            <DigitSlot
              charWidth={entry.width}
              digitCount={digitCount}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              key={key}
              lineHeight={metrics.lineHeight}
              maskHeight={maskHeight}
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
    </>
  );

  // Optionally wrap in MaskedView for gradient edge fade.
  // Content must be inside a single wrapper View so MaskedView's native
  // didUpdateReactSubviews always sees one stable child — avoids Fabric
  // "Attempt to recycle a mounted view" crash from dynamic slot churn.
  const maskedContent = resolvedMask && gradientMaskElement ? (
    <MaskedView
      maskElement={gradientMaskElement}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, position: "relative" }}>
        {MeasureElement}
        {slots}
      </View>
    </MaskedView>
  ) : (
    <>
      {MeasureElement}
      {slots}
    </>
  );

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
      {maskedContent}
    </View>
  );
};
