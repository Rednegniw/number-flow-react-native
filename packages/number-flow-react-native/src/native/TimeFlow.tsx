import MaskedView from "@rednegniw/masked-view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { MASK_HEIGHT_RATIO } from "../core/constants";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  ZERO_TIMING,
} from "../core/timing";
import { computeKeyedLayout } from "../core/layout";
import type { TimeFlowProps } from "../core/timeTypes";
import { useContinuousSpin } from "../core/useContinuousSpin";
import { useLayoutDiff } from "../core/useLayoutDiff";
import { useTimeFormatting } from "../core/useTimeFormatting";
import { useCanAnimate } from "../core/useCanAnimate";
import { resolveTrend, TIME_DIGIT_COUNTS } from "../core/utils";
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
  const { metrics, MeasureElement } = useGlyphMetrics(nfStyle);

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

  const totalSeconds =
    (resolvedHours ?? 0) * 3600 +
    (resolvedMinutes ?? 0) * 60 +
    (resolvedSeconds ?? 0);

  const prevTotalRef = useRef(totalSeconds);
  const resolvedTrend = resolveTrend(trend, prevTotalRef.current, totalSeconds);
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
    resolvedMinutes,
    resolvedSeconds,
    is24Hour,
    padHours,
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
    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, effectiveWidth, textAlign);
  }, [metrics, keyedParts, effectiveWidth, textAlign]);

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
    if (keyedParts.length === 0) return undefined;
    return keyedParts.map((p) => p.char).join("");
  }, [keyedParts]);

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

  const slots = (
    <>
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        if (entry.isDigit) {
          const digitCount = TIME_DIGIT_COUNTS[entry.key];
          const spinGeneration = spinGenerations?.get(entry.key);

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
              maskTop={maskHeight}
              maskBottom={maskHeight}
              metrics={metrics}
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
          const digitCount = TIME_DIGIT_COUNTS[entry.key];

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
              maskTop={maskHeight}
              maskBottom={maskHeight}
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
