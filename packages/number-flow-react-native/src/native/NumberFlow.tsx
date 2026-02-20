import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import Animated, { makeMutable, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { DEFAULT_FONT_SIZE } from "../core/constants";
import { getFormatCharacters } from "../core/intlHelpers";
import { computeKeyedLayout } from "../core/layout";
import { detectNumberingSystem, getDigitStrings } from "../core/numerals";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { useNumberFormatting } from "../core/useNumberFormatting";
import { getDigitCount } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { GradientMask } from "./GradientMask";
import { renderSlots } from "./renderSlots";
import type { NumberFlowProps } from "./types";
import { useMeasuredGlyphMetrics } from "./useMeasuredGlyphMetrics";

export const NumberFlow = ({
  value,
  format,
  locales,
  style: nfStyleProp = {},
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
  const nfStyle = useMemo(() => {
    const { textAlign: _ta, ...rest } = nfStyleProp;
    return { ...rest, fontSize: nfStyleProp.fontSize ?? DEFAULT_FONT_SIZE };
  }, [nfStyleProp]);

  const rawTextAlign = nfStyleProp.textAlign;
  const textAlign = rawTextAlign === "center" || rawTextAlign === "right" ? rawTextAlign : "left";

  const formatChars = useMemo(
    () => getFormatCharacters(locales, format, prefix, suffix),
    [locales, format, prefix, suffix],
  );
  const numberingSystem = useMemo(() => detectNumberingSystem(locales, format), [locales, format]);
  const digitStrings = useMemo(() => getDigitStrings(numberingSystem), [numberingSystem]);
  const { metrics, MeasureElement } = useMeasuredGlyphMetrics(nfStyle, formatChars, digitStrings);

  if (__DEV__) {
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

  const keyedParts = useNumberFormatting(value, format, locales, prefix, suffix);

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
    return computeKeyedLayout(keyedParts, metrics, containerWidth, textAlign, digitStrings);
  }, [metrics, keyedParts, containerWidth, textAlign, digitStrings]);

  // On web, all children are position:'absolute' so the container has 0 intrinsic
  // width. With alignItems:'center' on a parent, the container collapses. Setting
  // minWidth to the sum of character widths prevents the collapse.
  const contentWidth = useMemo(() => layout.reduce((sum, entry) => sum + entry.width, 0), [layout]);

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

  // Animate container minWidth so width changes are smooth instead of snapping
  const [animatedWidth] = useState(() => makeMutable(contentWidth));
  const prevWidthRef = useRef(contentWidth);

  useLayoutEffect(() => {
    if (prevWidthRef.current !== contentWidth) {
      const shouldAnimate = prevWidthRef.current > 0;
      prevWidthRef.current = contentWidth;

      if (shouldAnimate) {
        animatedWidth.value = withTiming(contentWidth, {
          duration: resolvedTransformTiming.duration,
          easing: resolvedTransformTiming.easing,
        });
      } else {
        animatedWidth.value = contentWidth;
      }
    }
  }, [contentWidth, resolvedTransformTiming, animatedWidth]);

  const animatedWidthStyle = useAnimatedStyle(
    () => ({ minWidth: animatedWidth.value }),
    [animatedWidth],
  );

  const textStyle = useMemo(
    () => ({
      ...nfStyle,
      color: nfStyle.color ?? "#000000",
    }),
    [nfStyle],
  );

  const resolvedMask = mask ?? true;
  const maskTop = adaptiveMask.top;
  const maskBottom = adaptiveMask.bottom;
  const { expansionTop, expansionBottom } = adaptiveMask;

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
            minWidth: contentWidth,
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

  return (
    <Animated.View
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
        animatedWidthStyle,
      ]}
    >
      <GradientMask
        maskTop={maskTop}
        maskBottom={maskBottom}
        enabled={resolvedMask}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, position: "relative", top: expansionTop }}>
          {MeasureElement}
          {slots}
        </View>
      </GradientMask>
    </Animated.View>
  );
};
