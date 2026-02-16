import {
  Group,
  LinearGradient,
  Paint,
  Rect as SkiaRect,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo } from "react-native";
import { MASK_HEIGHT_RATIO, MASK_WIDTH_RATIO } from "../core/constants";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
  ZERO_TIMING,
} from "../core/timing";
import { computeKeyedLayout } from "../core/layout";
import { computeTimeStringLayout } from "../core/timeLayout";
import type { SkiaTimeFlowProps } from "../core/timeTypes";
import { useContinuousSpin } from "../core/useContinuousSpin";
import { useLayoutDiff } from "../core/useLayoutDiff";
import { useTimeFormatting } from "../core/useTimeFormatting";
import { useCanAnimate } from "../core/useCanAnimate";
import { resolveTrend, TIME_DIGIT_COUNTS } from "../core/utils";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { warnOnce } from "../core/warnings";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const SkiaTimeFlow = ({
  hours,
  minutes,
  seconds,
  timestamp,
  timezoneOffset,
  sharedValue,
  is24Hour = true,
  padHours = true,
  font,
  color = "#000000",
  x = 0,
  y = 0,
  width = 0,
  textAlign = "left",
  opacity,
  spinTiming,
  opacityTiming,
  transformTiming,
  trend,
  animated,
  respectMotionPreference,
  continuous,
  mask,
  onAnimationsStart,
  onAnimationsFinish,
}: SkiaTimeFlowProps) => {
  const metrics = useGlyphMetrics(font);

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

  const hasHours = resolvedHours !== undefined;
  const hasSeconds = resolvedSeconds !== undefined;

  const totalSeconds =
    (resolvedHours ?? 0) * 3600 +
    (resolvedMinutes ?? 0) * 60 +
    (resolvedSeconds ?? 0);

  const prevTotalRef = useRef(totalSeconds);
  const resolvedTrend = resolveTrend(trend, prevTotalRef.current, totalSeconds);
  prevTotalRef.current = totalSeconds;

  if (__DEV__) {
    if (!font) {
      warnOnce(
        "skia-tf-font",
        "font is null — pass a loaded SkFont from useFont(). Component renders empty until font loads.",
      );
    }
    if (resolvedHours !== undefined && (resolvedHours < 0 || resolvedHours > 23)) {
      warnOnce("skia-tf-hours", "hours must be 0-23.");
    }
    if (resolvedMinutes !== undefined && (resolvedMinutes < 0 || resolvedMinutes > 59)) {
      warnOnce("skia-tf-minutes", "minutes must be 0-59.");
    }
    if (resolvedSeconds !== undefined && (resolvedSeconds < 0 || resolvedSeconds > 59)) {
      warnOnce("skia-tf-seconds", "seconds must be 0-59.");
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

  const spinGenerations = useContinuousSpin(
    keyedParts,
    continuous,
    resolvedTrend,
  );

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
        width,
        textAlign,
        hasHours,
        hasSeconds,
      );
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign);
  }, [
    metrics,
    keyedParts,
    width,
    textAlign,
    sharedValue,
    resolvedHours,
    resolvedMinutes,
    hasHours,
    hasSeconds,
  ]);

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

  if (!font || !metrics) return <Group />;

  if (layout.length === 0 && exitingEntries.size === 0) {
    return <Group />;
  }

  const baseY = y;
  const resolvedMask = mask ?? true;
  const maskHeight = resolvedMask ? MASK_HEIGHT_RATIO * metrics.lineHeight : 0;
  const maskWidth = resolvedMask ? MASK_WIDTH_RATIO * metrics.lineHeight : 0;

  // Content bounds from layout (in local coordinate space before translateX)
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

  const content = (
    <Group transform={[{ translateX: x }]}>
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          const digitCount = TIME_DIGIT_COUNTS[entry.key];
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
              maskTop={maskHeight}
              maskBottom={maskHeight}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={resolvedTrend}
              workletDigitValue={wdv}
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
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}

      {Array.from(exitingEntries.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          const digitCount = TIME_DIGIT_COUNTS[entry.key];

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
              maskTop={maskHeight}
              maskBottom={maskHeight}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
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
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}
    </Group>
  );

  /**
   * Container-level 2D gradient mask matching web NumberFlow's vignette.
   * Horizontal: fade extends outside text edges (for enter/exit animations).
   * Vertical: fade is within the text line height (digits roll through it).
   * Two DstIn layers compose: final_alpha = content × h_alpha × v_alpha.
   */
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
