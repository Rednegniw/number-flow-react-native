import {
  Group,
  LinearGradient,
  Paint,
  Rect as SkiaRect,
  vec,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { MASK_WIDTH_RATIO } from "../core/constants";
import { computeKeyedLayout, computeStringLayout } from "../core/layout";
import { detectNumberingSystem, getDigitStrings, getZeroCodePoint } from "../core/numerals";
import type { SkiaNumberFlowProps } from "../core/types";
import { useAccessibilityAnnouncement } from "../core/useAccessibilityAnnouncement";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { getFormatCharacters } from "../core/intlHelpers";
import { useNumberFormatting } from "../core/useNumberFormatting";
import { getDigitCount } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { renderSlots } from "./renderSlots";
import { useGlyphMetrics } from "./useGlyphMetrics";
import { useScrubbingBridge, useScrubbingLayout } from "./useScrubbing";

export const SkiaNumberFlow = ({
  value,
  format,
  locales,
  sharedValue,
  font,
  color = "#000000",
  x = 0,
  y = 0,
  width = 0,
  textAlign = "left",
  prefix = "",
  suffix = "",
  opacity,
  spinTiming,
  opacityTiming,
  transformTiming,
  trend,
  animated,
  respectMotionPreference,
  continuous,
  digits,
  scrubDigitWidthPercentile = 0.75,
  onAnimationsStart,
  onAnimationsFinish,
  mask,
}: SkiaNumberFlowProps) => {
  const formatChars = useMemo(
    () => getFormatCharacters(locales, format, prefix, suffix),
    [locales, format, prefix, suffix],
  );
  const numberingSystem = useMemo(() => detectNumberingSystem(locales, format), [locales, format]);
  const zeroCodePoint = getZeroCodePoint(numberingSystem);
  const digitStringsArr = useMemo(() => getDigitStrings(numberingSystem), [numberingSystem]);
  const metrics = useGlyphMetrics(font, formatChars, digitStringsArr);

  if (__DEV__) {
    if (!font) {
      warnOnce(
        "skia-font",
        "font is null — pass a loaded SkFont from useFont(). Component renders empty until font loads.",
      );
    }
    if (value !== undefined && sharedValue !== undefined) {
      warnOnce("skia-nf-both", "Both value and sharedValue provided. Use one or the other.");
    }
    if (value === undefined && sharedValue === undefined) {
      warnOnce("skia-nf-neither", "Neither value nor sharedValue provided.");
    }
    if (scrubDigitWidthPercentile < 0 || scrubDigitWidthPercentile > 1) {
      warnOnce("nf-percentile", "scrubDigitWidthPercentile should be between 0 and 1.");
    }
    if (digits) {
      for (const [posStr, constraint] of Object.entries(digits)) {
        if (constraint.max < 1 || constraint.max > 9) {
          warnOnce(
            `skia-nf-digit-max-${posStr}`,
            `digits[${posStr}].max must be between 1 and 9, got ${constraint.max}.`,
          );
        }
      }
    }
  }

  const clampedPercentile = Math.max(0, Math.min(1, scrubDigitWidthPercentile));

  // Scrubbing bridge: digit-count bridging between worklet and JS thread
  const { effectiveValue } = useScrubbingBridge({
    sharedValue,
    value,
    prefix,
    suffix,
    zeroCodePoint,
  });

  const keyedParts = useNumberFormatting(effectiveValue, format, locales, prefix, suffix);

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (sharedValue && value === undefined) {
      const text = `${prefix}${sharedValue.value}${suffix}`;
      return computeStringLayout(text, metrics, width, textAlign);
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign, digitStringsArr);
  }, [metrics, keyedParts, width, textAlign, prefix, suffix, sharedValue, value, digitStringsArr]);

  const layoutDigitCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < layout.length; i++) {
      if (layout[i].isDigit) count++;
    }
    return count;
  }, [layout]);

  // Scrubbing layout: worklet-driven digit values and per-slot positioning
  const { workletDigitValues, workletLayout } = useScrubbingLayout({
    sharedValue,
    prefix,
    suffix,
    zeroCodePoint,
    metrics,
    digitStringsArr,
    scrubDigitWidthPercentile: clampedPercentile,
    layout,
    layoutDigitCount,
    width,
    textAlign,
  });

  const pipeline = useFlowPipeline({
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

  // Content bounds in the content group's local coordinate space
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
        digitCountResolver: (key) => getDigitCount(digits, key),
        maskTop: maskTopHeight,
        maskBottom: maskBottomHeight,
        digitStrings: digitStringsArr,
        workletDigitValues,
        workletLayout,
      })}
    </Group>
  );

  /**
   * Container-level 2D gradient mask matching web NumberFlow's vignette.
   * Two DstIn-blended rects compose independent horizontal and vertical fades:
   * final_alpha = content_alpha * horizontal_alpha * vertical_alpha.
   * This produces smooth corners naturally (alpha multiplication).
   *
   * Architecture: content draws into a saveLayer, then each gradient rect
   * composites with DstIn (result = existing_content * gradient_alpha).
   */
  // Horizontal: fade extends OUTSIDE text edges (for enter/exit animations)
  // Vertical: fade is WITHIN the text line height (digits roll through it)
  const maskLeft = x + contentLeft - maskWidth;
  const maskRight = x + contentRight + maskWidth;
  const maskY = baseY + metrics.ascent;
  const maskTotalWidth = contentWidth + 2 * maskWidth;
  const maskTotalHeight = metrics.lineHeight;
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
