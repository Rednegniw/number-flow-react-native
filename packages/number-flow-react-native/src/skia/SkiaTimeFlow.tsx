import { Group, LinearGradient, Paint, Rect as SkiaRect, vec } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { MASK_WIDTH_RATIO } from "../core/constants";
import { resolveDirection, resolveTextAlign } from "../core/direction";
import { computeKeyedLayout } from "../core/layout";
import { computeTimeStringLayout } from "../core/timeLayout";
import type { SkiaTimeFlowProps } from "../core/timeTypes";
import { useAccessibilityAnnouncement } from "../core/useAccessibilityAnnouncement";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { useTimeFormatting } from "../core/useTimeFormatting";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { TIME_DIGIT_COUNTS } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { renderSlots } from "./renderSlots";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const SkiaTimeFlow = ({
  hours,
  minutes,
  seconds,
  centiseconds,
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
  textAlign: rawTextAlign,
  direction,
  opacity,
  spinTiming,
  opacityTiming,
  transformTiming,
  trend,
  animated,
  respectMotionPreference,
  continuous,
  mask,
  tabularNums,
  onAnimationsStart,
  onAnimationsFinish,
}: SkiaTimeFlowProps) => {
  const resolvedDir = resolveDirection(direction);
  const textAlign = resolveTextAlign(resolvedDir, rawTextAlign);

  const metrics = useGlyphMetrics(font, undefined, undefined, tabularNums);

  if (__DEV__) {
    if (!font) {
      warnOnce(
        "skia-tf-font",
        "font is null. Pass a loaded SkFont from useFont(). Component renders empty until font loads.",
      );
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
  const resolvedCentiseconds = centiseconds;

  const hasHours = resolvedHours !== undefined;
  const hasSeconds = resolvedSeconds !== undefined;
  const hasCentiseconds = resolvedCentiseconds !== undefined;

  if (__DEV__) {
    if (resolvedHours !== undefined && (resolvedHours < 0 || resolvedHours > 23)) {
      warnOnce("skia-tf-hours", "hours must be 0-23.");
    }
    if (resolvedMinutes !== undefined && (resolvedMinutes < 0 || resolvedMinutes > 59)) {
      warnOnce("skia-tf-minutes", "minutes must be 0-59.");
    }
    if (resolvedSeconds !== undefined && (resolvedSeconds < 0 || resolvedSeconds > 59)) {
      warnOnce("skia-tf-seconds", "seconds must be 0-59.");
    }
    if (
      resolvedCentiseconds !== undefined &&
      (resolvedCentiseconds < 0 || resolvedCentiseconds > 99)
    ) {
      warnOnce("skia-tf-centiseconds", "centiseconds must be 0-99.");
    }
    if (resolvedCentiseconds !== undefined && resolvedSeconds === undefined) {
      warnOnce("skia-tf-cs-no-sec", "centiseconds requires seconds to be set.");
    }
  }

  const totalSeconds =
    (resolvedHours ?? 0) * 3600 + (resolvedMinutes ?? 0) * 60 + (resolvedSeconds ?? 0);
  const trendValue = totalSeconds * 100 + (resolvedCentiseconds ?? 0);

  const keyedParts = useTimeFormatting(
    resolvedHours,
    // Fallback for sharedValue mode where minutes is undefined (unused; layout comes from string path)
    resolvedMinutes ?? 0,
    resolvedSeconds,
    is24Hour,
    padHours,
    resolvedCentiseconds,
  );

  const workletDigitValues = useWorkletFormatting(sharedValue, "", "");

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (sharedValue && resolvedHours === undefined && resolvedMinutes === undefined) {
      return computeTimeStringLayout(
        sharedValue.value,
        metrics,
        width,
        textAlign,
        hasHours,
        hasSeconds,
        hasCentiseconds,
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
    hasCentiseconds,
  ]);

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

  useAccessibilityAnnouncement(accessibilityLabel);

  if (!font || !metrics) {
    return <Group />;
  }

  if (layout.length === 0 && exitingEntries.size === 0) {
    return <Group />;
  }

  const baseY = y;
  const resolvedMask = mask ?? true;

  const maskTopHeight = resolvedMask ? adaptiveMask.top : 0;
  const maskBottomHeight = resolvedMask ? adaptiveMask.bottom : 0;
  const maskWidth = resolvedMask ? MASK_WIDTH_RATIO * metrics.lineHeight : 0;

  // Content bounds from layout (in local coordinate space before translateX)
  const contentLeft = layout.reduce((min, entry) => Math.min(min, entry.x), Infinity);
  const contentRight = layout.reduce((max, entry) => Math.max(max, entry.x + entry.width), 0);
  const contentWidth = layout.length > 0 ? contentRight - contentLeft : 0;

  const content = (
    <Group transform={[{ translateX: x }]}>
      {renderSlots({
        layout,
        exitingEntries,
        prevMap,
        isInitialRender,
        onExitComplete,
        metrics,
        font,
        color,
        baseY,
        resolvedTrend,
        spinTiming: resolvedSpinTiming,
        opacityTiming: resolvedOpacityTiming,
        transformTiming: resolvedTransformTiming,
        spinGenerations,
        digitCountResolver: (key) => TIME_DIGIT_COUNTS[key],
        maskTop: maskTopHeight,
        maskBottom: maskBottomHeight,
        workletDigitValues,
      })}
    </Group>
  );

  /**
   * Container-level 2D gradient mask matching web NumberFlow's vignette.
   * Horizontal: fade extends outside text edges (for enter/exit animations).
   * Vertical: fade is within the text line height (digits roll through it).
   * Two DstIn layers compose: final_alpha = content * h_alpha * v_alpha.
   */
  const maskLeft = x + contentLeft - maskWidth;
  const maskRight = x + contentRight + maskWidth;
  const expansionTop = resolvedMask ? adaptiveMask.expansionTop : 0;
  const expansionBottom = resolvedMask ? adaptiveMask.expansionBottom : 0;
  const maskY = baseY + metrics.ascent - expansionTop;
  const maskTotalWidth = contentWidth + 2 * maskWidth;
  const maskTotalHeight = metrics.lineHeight + expansionTop + expansionBottom;
  const hRatio = maskTotalWidth > 0 ? maskWidth / maskTotalWidth : 0;
  const vRatioTop = maskTotalHeight > 0 ? maskTopHeight / maskTotalHeight : 0;
  const vRatioBottom = maskTotalHeight > 0 ? maskBottomHeight / maskTotalHeight : 0;

  const maskedContent = resolvedMask ? (
    <Group layer={<Paint />}>
      {content}

      {/* Horizontal fade */}
      <Group layer={<Paint blendMode="dstIn" />}>
        <SkiaRect height={maskTotalHeight} width={maskTotalWidth} x={maskLeft} y={maskY}>
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
        <SkiaRect height={maskTotalHeight} width={maskTotalWidth} x={maskLeft} y={maskY}>
          <LinearGradient
            colors={["transparent", "black", "black", "transparent"]}
            end={vec(0, maskY + maskTotalHeight)}
            positions={[0, vRatioTop, 1 - vRatioBottom, 1]}
            start={vec(0, maskY)}
          />
        </SkiaRect>
      </Group>
    </Group>
  ) : (
    content
  );

  if (opacity) {
    return <Group layer={<Paint opacity={opacity} />}>{maskedContent}</Group>;
  }

  return maskedContent;
};
