import { useCallback, useEffect, useMemo, useState } from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
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
  timestamp,
  timezoneOffset,
  is24Hour = true,
  padHours = true,
  style: nfStyle,
  textAlign = "left",
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
  mask,
}: TimeFlowProps) => {
  const { metrics, MeasureElement } = useMeasuredGlyphMetrics(nfStyle);

  if (__DEV__) {
    if (!nfStyle.fontSize) {
      warnOnce("tf-fontSize", "style.fontSize is required for TimeFlow to measure glyphs.");
    }
  }

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
  }

  const totalSeconds =
    (resolvedHours ?? 0) * 3600 + (resolvedMinutes ?? 0) * 60 + (resolvedSeconds ?? 0);

  const keyedParts = useTimeFormatting(
    resolvedHours,
    resolvedMinutes,
    resolvedSeconds,
    is24Hour,
    padHours,
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
    return computeKeyedLayout(keyedParts, metrics, containerWidth, textAlign);
  }, [metrics, keyedParts, containerWidth, textAlign]);

  const pipeline = useFlowPipeline({
    keyedParts,
    trendValue: totalSeconds,
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
    </View>
  );
};
