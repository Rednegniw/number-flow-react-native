import MaskedView from "@rednegniw/masked-view";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import { computeKeyedLayout } from "../core/layout";
import { detectNumberingSystem, getDigitStrings } from "../core/numerals";
import { getFormatCharacters } from "../core/intlHelpers";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { useNumberFormatting } from "../core/useNumberFormatting";
import { getDigitCount } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { renderSlots } from "./renderSlots";
import type { NumberFlowProps } from "./types";
import { useMeasuredGlyphMetrics } from "./useMeasuredGlyphMetrics";

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
    [locales, format, prefix, suffix]
  );
  const numberingSystem = useMemo(
    () => detectNumberingSystem(locales, format),
    [locales, format]
  );
  const digitStrings = useMemo(
    () => getDigitStrings(numberingSystem),
    [numberingSystem]
  );
  const { metrics, MeasureElement } = useMeasuredGlyphMetrics(
    nfStyle,
    formatChars,
    digitStrings
  );

  if (__DEV__) {
    if (!nfStyle.fontSize) {
      warnOnce(
        "nf-fontSize",
        "style.fontSize is required for NumberFlow to measure glyphs."
      );
    }
    if (digits) {
      for (const [posStr, constraint] of Object.entries(digits)) {
        if (constraint.max < 1 || constraint.max > 9) {
          warnOnce(
            `nf-digit-max-${posStr}`,
            `digits[${posStr}].max must be between 1 and 9, got ${constraint.max}.`
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
    suffix
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const layout = useMemo(() => {
    if (!metrics) return [];

    // Skip layout when container hasn't measured yet and alignment needs width.
    // Without this guard, center/right alignment computes with width=0,
    // then re-computes after onLayout — causing a visible slide-in animation.
    if (containerWidth === 0 && textAlign !== "left") return [];

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(
      keyedParts,
      metrics,
      containerWidth,
      textAlign,
      digitStrings
    );
  }, [metrics, keyedParts, containerWidth, textAlign, digitStrings]);

  const {
    resolvedSpinTiming,
    resolvedOpacityTiming,
    resolvedTransformTiming,
    resolvedTrend,
    spinGenerations,
    prevMap,
    isInitialRender,
    exitingEntries,
    onExitComplete,
    accessibilityLabel,
    adaptiveMask,
  } = useFlowPipeline({
    keyedParts,
    trendValue: value,
    layout,
    metrics,
    animated,
    respectMotionPreference,
    spinTiming,
    opacityTiming,
    transformTiming,
    trend,
    continuous,
    mask,
    onAnimationsStart,
    onAnimationsFinish,
  });

  const textStyle = useMemo(
    () => ({
      ...nfStyle,
      color: nfStyle.color ?? "#000000",
    }),
    [nfStyle]
  );

  const resolvedMask = mask ?? true;
  const maskTop = adaptiveMask.top;
  const maskBottom = adaptiveMask.bottom;
  const { expansionTop, expansionBottom } = adaptiveMask;

  // Step count scales with mask height — each step must be >=1px (sub-pixel Views collapse to 0).
  const topSteps = Math.max(2, Math.round(maskTop));
  const bottomSteps = Math.max(2, Math.round(maskBottom));

  const gradientMaskElement = useMemo(() => {
    if (!resolvedMask || !metrics) return null;
    return (
      <View style={{ flex: 1, flexDirection: "column" }}>
        {/* Top fade: transparent -> opaque */}
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

        {/* Bottom fade: opaque -> transparent */}
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

  
  const [slotsReady, setSlotsReady] = useState(false);
  const metricsReady = !!metrics;

  useEffect(() => {
    if (!metricsReady) return;
    const id = requestAnimationFrame(() => setSlotsReady(true));
    return () => cancelAnimationFrame(id);
  }, [metricsReady]);

  if (!metrics || (layout.length === 0 && exitingEntries.size === 0)) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        onLayout={handleContainerLayout}
        style={containerStyle}
      >
        <Text style={[textStyle, { textAlign }]}>{accessibilityLabel}</Text>
        {MeasureElement}
      </View>
    );
  }

  // Placeholder branch: show plain Text while slot tree loads
  if (!slotsReady) {
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
        <Text style={[textStyle, { textAlign }]}>{accessibilityLabel}</Text>
        {MeasureElement}
      </View>
    );
  }

  const slots = renderSlots({
    layout,
    exitingEntries,
    prevMap,
    isInitialRender,
    onExitComplete,
    metrics,
    textStyle,
    resolvedTrend,
    spinTiming: resolvedSpinTiming,
    opacityTiming: resolvedOpacityTiming,
    transformTiming: resolvedTransformTiming,
    spinGenerations,
    digitCountResolver: (key) => getDigitCount(digits, key),
    maskTop,
    maskBottom,
    digitStrings,
  });

  // Optionally wrap in MaskedView for gradient edge fade.
  const maskedContent =
    resolvedMask && gradientMaskElement ? (
      <MaskedView maskElement={gradientMaskElement} style={{ flex: 1 }}>
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
