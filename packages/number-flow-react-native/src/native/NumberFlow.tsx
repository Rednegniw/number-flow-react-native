import MaskedView from "@rednegniw/masked-view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  ZERO_TIMING,
} from "../core/timing";
import { computeKeyedLayout } from "../core/layout";
import { computeAdaptiveMaskHeights } from "../core/mask";
import { useContinuousSpin } from "../core/useContinuousSpin";
import { useLayoutDiff } from "../core/useLayoutDiff";
import {
  getFormatCharacters,
  useNumberFormatting,
} from "../core/useNumberFormatting";
import { useCanAnimate } from "../core/useCanAnimate";
import {
  detectNumberingSystem,
  getDigitStrings,
} from "../core/numerals";
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
  const numberingSystem = useMemo(
    () => detectNumberingSystem(locales, format),
    [locales, format],
  );
  const digitStrings = useMemo(
    () => getDigitStrings(numberingSystem),
    [numberingSystem],
  );
  const { metrics, MeasureElement } = useGlyphMetrics(nfStyle, formatChars, digitStrings);

  // Animated + reduced motion
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

  // Dev warnings
  if (__DEV__) {
    if (!nfStyle.fontSize) {
      warnOnce(
        "nf-fontSize",
        "style.fontSize is required for NumberFlow to measure glyphs.",
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

    // Skip layout when container hasn't measured yet and alignment needs width.
    // Without this guard, center/right alignment computes with width=0,
    // then re-computes after onLayout — causing a visible slide-in animation.
    if (effectiveWidth === 0 && textAlign !== "left") return [];

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, effectiveWidth, textAlign, digitStrings);
  }, [
    metrics,
    keyedParts,
    effectiveWidth,
    textAlign,
    digitStrings,
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

  const accessibilityLabel = useMemo(() => {
    if (keyedParts.length === 0) return undefined;
    return keyedParts.map((p) => p.char).join("");
  }, [keyedParts]);

  const resolvedMask = mask ?? true;

  const adaptiveMask = useMemo(() => {
    if (!metrics || !resolvedMask) return { top: 0, bottom: 0, expansionTop: 0, expansionBottom: 0 };
    return computeAdaptiveMaskHeights(layout, exitingEntries, metrics);
  }, [metrics, resolvedMask, layout, exitingEntries]);

  const maskTop = adaptiveMask.top;
  const maskBottom = adaptiveMask.bottom;
  const { expansionTop, expansionBottom } = adaptiveMask;

  // Step count scales with mask height — each step must be ≥1px (sub-pixel Views collapse to 0).
  const topSteps = Math.max(2, Math.round(maskTop));
  const bottomSteps = Math.max(2, Math.round(maskBottom));

  const gradientMaskElement = useMemo(() => {
    if (!resolvedMask || !metrics) return null;
    return (
      <View style={{ flex: 1, flexDirection: "column" }}>
        {/* Top fade: transparent → opaque */}
        {Array.from({ length: topSteps }, (_, i) => (
          <View
            key={`t${i}`}
            style={{
              height: maskTop / topSteps,
              backgroundColor: `rgba(0,0,0,${i / (topSteps - 1)})`,
            }}
          />
        ))}
        {/* Middle: fully opaque */}
        <View style={{ flex: 1, backgroundColor: "black" }} />
        {/* Bottom fade: opaque → transparent */}
        {Array.from({ length: bottomSteps }, (_, i) => (
          <View
            key={`b${i}`}
            style={{
              height: maskBottom / bottomSteps,
              backgroundColor: `rgba(0,0,0,${1 - i / (bottomSteps - 1)})`,
            }}
          />
        ))}
      </View>
    );
  }, [resolvedMask, metrics, maskTop, maskBottom, topSteps, bottomSteps]);

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
          const digitCount = getDigitCount(digits, entry.key);
          const spinGeneration = spinGenerations?.get(entry.key);

          digitIndex++;
          return (
            <DigitSlot
              charWidth={entry.width}
              continuousSpinGeneration={spinGeneration}
              digitCount={digitCount}
              digitStrings={digitStrings}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              key={entry.key}
              lineHeight={metrics.lineHeight}
              maskTop={maskTop}
              maskBottom={maskBottom}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              superscript={entry.superscript}
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
            entering={isEntering}
            exiting={false}
            key={entry.key}
            lineHeight={metrics.lineHeight}
            opacityTiming={resolvedOpacityTiming}
            superscript={entry.superscript}
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
              digitStrings={digitStrings}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              key={key}
              lineHeight={metrics.lineHeight}
              maskTop={maskTop}
              maskBottom={maskBottom}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              superscript={entry.superscript}
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
            superscript={entry.superscript}
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
      <View style={{ flex: 1, position: "relative", top: expansionTop }}>
        {MeasureElement}
        {slots}
      </View>
    </MaskedView>
  ) : (
    <View style={{ flex: 1, position: "relative", top: expansionTop }}>
      {MeasureElement}
      {slots}
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      onLayout={handleContainerLayout}
      style={[
        containerStyle,
        {
          height: metrics.lineHeight + expansionTop + expansionBottom,
          marginTop: -expansionTop,
          marginBottom: -expansionBottom,
          position: "relative",
          overflow: "hidden",
        },
      ]}
    >
      {maskedContent}
    </View>
  );
};
