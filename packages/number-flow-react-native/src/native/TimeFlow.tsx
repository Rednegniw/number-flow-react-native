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
import { computeKeyedLayout } from "../core/layout";
import { computeTimeStringLayout } from "../core/timeLayout";
import type { TimeFlowProps } from "../core/timeTypes";
import { useLayoutDiff } from "../core/useLayoutDiff";
import { useTimeFormatting } from "../core/useTimeFormatting";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { warnOnce } from "../core/warnings";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const TimeFlow = ({
  hours,
  minutes,
  seconds,
  timestamp,
  timezoneOffset,
  sharedValue,
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
  onAnimationsStart,
  onAnimationsFinish,
  containerStyle,
}: TimeFlowProps) => {
  const { metrics, MeasureElement } = useGlyphMetrics(nfStyle);

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

  const hasHours = resolvedHours !== undefined;
  const hasSeconds = resolvedSeconds !== undefined;

  // Auto-detect trend by comparing total seconds between renders
  const totalSeconds =
    (resolvedHours ?? 0) * 3600 +
    (resolvedMinutes ?? 0) * 60 +
    (resolvedSeconds ?? 0);
  const prevTotalRef = useRef(totalSeconds);
  let resolvedTrend: Trend;
  if (trend !== undefined) {
    resolvedTrend = trend;
  } else if (prevTotalRef.current !== totalSeconds) {
    resolvedTrend = Math.sign(totalSeconds - prevTotalRef.current) as Trend;
  } else {
    resolvedTrend = 0;
  }
  prevTotalRef.current = totalSeconds;

  if (__DEV__) {
    if (!nfStyle.fontSize) {
      warnOnce(
        "tf-fontSize",
        "style.fontSize is required for TimeFlow to measure glyphs.",
      );
    }
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

  const keyedParts = useTimeFormatting(
    resolvedHours,
    // Fallback for sharedValue mode where minutes is undefined (unused — layout comes from string path)
    resolvedMinutes ?? 0,
    resolvedSeconds,
    is24Hour,
    padHours,
  );

  const workletDigitValues = useWorkletFormatting(sharedValue, "", "");

  const [containerWidth, setContainerWidth] = useState(0);
  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const effectiveWidth = containerWidth;

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (
      sharedValue &&
      resolvedHours === undefined &&
      resolvedMinutes === undefined
    ) {
      return computeTimeStringLayout(
        sharedValue.value,
        metrics,
        effectiveWidth,
        textAlign,
        hasHours,
        hasSeconds,
      );
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, effectiveWidth, textAlign);
  }, [
    metrics,
    keyedParts,
    effectiveWidth,
    textAlign,
    sharedValue,
    resolvedHours,
    resolvedMinutes,
    hasHours,
    hasSeconds,
  ]);

  // Store callbacks in refs so the setTimeout in the effect always calls the latest version
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

  // Spread full nfStyle so all TextStyle properties (lineHeight, letterSpacing, etc.) reach <Text>
  const textStyle = useMemo(
    () => ({
      ...nfStyle,
      color: nfStyle.color ?? "#000000",
    }),
    [nfStyle],
  );

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
