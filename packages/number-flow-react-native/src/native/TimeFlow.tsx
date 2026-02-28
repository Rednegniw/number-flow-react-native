import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import Animated, { makeMutable, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { DEFAULT_FONT_SIZE } from "../core/constants";
import { resolveDirection, resolveTextAlign } from "../core/direction";
import { computeKeyedLayout } from "../core/layout";
import type { TimeFlowProps } from "../core/timeTypes";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { useTimeFormatting } from "../core/useTimeFormatting";
import { TIME_DIGIT_COUNTS } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { GradientMask } from "./GradientMask";
import { renderSlots } from "./renderSlots";
import { useMeasuredGlyphMetrics } from "./useMeasuredGlyphMetrics";

export const TimeFlow = ({
  hours,
  minutes,
  seconds,
  centiseconds,
  timestamp,
  timezoneOffset,
  is24Hour = true,
  padHours = true,
  style: nfStyleProp = {},
  spinTiming,
  opacityTiming,
  transformTiming,
  trend,
  animated,
  respectMotionPreference,
  continuous,
  onAnimationsStart,
  onAnimationsFinish,
  containerStyle,
  direction,
  mask,
}: TimeFlowProps) => {
  const nfStyle = useMemo(() => {
    const { textAlign: _ta, ...rest } = nfStyleProp;
    return { ...rest, fontSize: nfStyleProp.fontSize ?? DEFAULT_FONT_SIZE };
  }, [nfStyleProp]);

  const resolvedDir = resolveDirection(direction);
  const textAlign = resolveTextAlign(resolvedDir, nfStyleProp.textAlign);

  const { metrics, MeasureElement } = useMeasuredGlyphMetrics(nfStyle);

  const resolved = useMemo(() => {
    if (timestamp !== undefined) {
      const d = new Date(timestamp + (timezoneOffset ?? 0));
      return {
        hours: d.getUTCHours(),
        minutes: d.getUTCMinutes(),
        seconds: d.getUTCSeconds(),
      };
    }
    return { hours, minutes, seconds };
  }, [timestamp, timezoneOffset, hours, minutes, seconds]);

  const resolvedHours = resolved.hours;
  const resolvedMinutes = resolved.minutes;
  const resolvedSeconds = resolved.seconds;
  const resolvedCentiseconds = centiseconds;

  if (__DEV__) {
    if (resolvedHours !== undefined && (resolvedHours < 0 || resolvedHours > 23)) {
      warnOnce("tf-hours", "hours must be 0-23.");
    }
    if (resolvedMinutes !== undefined && (resolvedMinutes < 0 || resolvedMinutes > 59)) {
      warnOnce("tf-minutes", "minutes must be 0-59.");
    }
    if (resolvedSeconds !== undefined && (resolvedSeconds < 0 || resolvedSeconds > 59)) {
      warnOnce("tf-seconds", "seconds must be 0-59.");
    }
    if (
      resolvedCentiseconds !== undefined &&
      (resolvedCentiseconds < 0 || resolvedCentiseconds > 99)
    ) {
      warnOnce("tf-centiseconds", "centiseconds must be 0-99.");
    }
    if (resolvedCentiseconds !== undefined && resolvedSeconds === undefined) {
      warnOnce("tf-cs-no-sec", "centiseconds requires seconds to be set.");
    }
  }

  const totalSeconds =
    (resolvedHours ?? 0) * 3600 + (resolvedMinutes ?? 0) * 60 + (resolvedSeconds ?? 0);
  const trendValue = totalSeconds * 100 + (resolvedCentiseconds ?? 0);

  const keyedParts = useTimeFormatting(
    resolvedHours,
    resolvedMinutes,
    resolvedSeconds,
    is24Hour,
    padHours,
    resolvedCentiseconds,
  );

  const [containerWidth, setContainerWidth] = useState(0);
  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const layout = useMemo(() => {
    if (!metrics) return [];

    // Skip layout when container hasn't measured yet and alignment needs width.
    // Without this guard, center/right alignment computes with width=0,
    // then re-computes after onLayout, causing a visible slide-in animation.
    if (containerWidth === 0 && textAlign !== "left") return [];

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, containerWidth, textAlign);
  }, [metrics, keyedParts, containerWidth, textAlign]);

  const contentWidth = useMemo(() => layout.reduce((sum, entry) => sum + entry.width, 0), [layout]);

  const pipeline = useFlowPipeline({
    keyedParts,
    trendValue: trendValue,
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
  } = pipeline;

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

  // Progressive mount: render a plain <Text> on the first frame, then swap to
  // the full animated slot tree on the next frame. At mount time there is never
  // a value change to animate, so the placeholder is visually identical while
  // avoiding the ~80ms cost of instantiating dozens of useAnimatedStyle hooks.
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
    digitCountResolver: (key) => TIME_DIGIT_COUNTS[key],
    maskTop,
    maskBottom,
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
