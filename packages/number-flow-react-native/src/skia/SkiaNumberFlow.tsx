import { Group, LinearGradient, Paint, Rect as SkiaRect, vec } from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";
import { MASK_WIDTH_RATIO } from "../core/constants";
import { getFormatCharacters } from "../core/intlHelpers";
import { type CharLayout, computeKeyedLayout, computeStringLayout } from "../core/layout";
import { detectNumberingSystem, getDigitStrings, getZeroCodePoint } from "../core/numerals";
import type { GlyphMetrics, KeyedPart, SkiaNumberFlowProps } from "../core/types";
import { useAccessibilityAnnouncement } from "../core/useAccessibilityAnnouncement";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { useNumberFormatting } from "../core/useNumberFormatting";
import { getDigitCount } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { renderSlots } from "./renderSlots";
import { useGlyphMetrics } from "./useGlyphMetrics";
import { useScrubbingBridge, useScrubbingLayout } from "./useScrubbing";

interface ModeBaseProps {
  format: Intl.NumberFormatOptions | undefined;
  locales: Intl.LocalesArgument | undefined;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  color: string;
  x: number;
  y: number;
  width: number;
  textAlign: "left" | "right" | "center";
  prefix: string;
  suffix: string;
  opacity: SkiaNumberFlowProps["opacity"];
  spinTiming: SkiaNumberFlowProps["spinTiming"];
  opacityTiming: SkiaNumberFlowProps["opacityTiming"];
  transformTiming: SkiaNumberFlowProps["transformTiming"];
  trend: SkiaNumberFlowProps["trend"];
  animated: SkiaNumberFlowProps["animated"];
  respectMotionPreference: SkiaNumberFlowProps["respectMotionPreference"];
  continuous: SkiaNumberFlowProps["continuous"];
  digits: SkiaNumberFlowProps["digits"];
  scrubDigitWidthPercentile: number;
  onAnimationsStart: SkiaNumberFlowProps["onAnimationsStart"];
  onAnimationsFinish: SkiaNumberFlowProps["onAnimationsFinish"];
  mask: SkiaNumberFlowProps["mask"];
  metrics: GlyphMetrics;
  digitStringsArr: string[];
  zeroCodePoint: number;
}

interface ValueModeProps extends ModeBaseProps {
  value: number;
}

interface SharedModeProps extends ModeBaseProps {
  sharedValue: NonNullable<SkiaNumberFlowProps["sharedValue"]>;
}

interface RuntimeProps {
  keyedParts: KeyedPart[];
  trendValue: number | undefined;
  layout: CharLayout[];
  metrics: GlyphMetrics;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  color: string;
  x: number;
  y: number;
  opacity: SkiaNumberFlowProps["opacity"];
  spinTiming: SkiaNumberFlowProps["spinTiming"];
  opacityTiming: SkiaNumberFlowProps["opacityTiming"];
  transformTiming: SkiaNumberFlowProps["transformTiming"];
  trend: SkiaNumberFlowProps["trend"];
  animated: SkiaNumberFlowProps["animated"];
  respectMotionPreference: SkiaNumberFlowProps["respectMotionPreference"];
  continuous: SkiaNumberFlowProps["continuous"];
  digits: SkiaNumberFlowProps["digits"];
  onAnimationsStart: SkiaNumberFlowProps["onAnimationsStart"];
  onAnimationsFinish: SkiaNumberFlowProps["onAnimationsFinish"];
  mask: SkiaNumberFlowProps["mask"];
  digitStringsArr: string[];
  workletDigitValues?: SharedValue<number>[] | null;
  workletLayout?: SharedValue<{ x: number; width: number }[]>;
}

function SkiaNumberFlowRuntime({
  keyedParts,
  trendValue,
  layout,
  metrics,
  font,
  color,
  x,
  y,
  opacity,
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
  mask,
  digitStringsArr,
  workletDigitValues,
  workletLayout,
}: RuntimeProps) {
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
    trendValue,
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

  useAccessibilityAnnouncement(accessibilityLabel);

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
}

function SkiaNumberFlowValueMode({
  value,
  format,
  locales,
  font,
  color,
  x,
  y,
  width,
  textAlign,
  prefix,
  suffix,
  opacity,
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
  mask,
  metrics,
  digitStringsArr,
}: ValueModeProps) {
  const keyedParts = useNumberFormatting(value, format, locales, prefix, suffix);

  const layout = useMemo(() => {
    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign, digitStringsArr);
  }, [keyedParts, metrics, width, textAlign, digitStringsArr]);

  return (
    <SkiaNumberFlowRuntime
      animated={animated}
      color={color}
      continuous={continuous}
      digitStringsArr={digitStringsArr}
      digits={digits}
      font={font}
      keyedParts={keyedParts}
      layout={layout}
      mask={mask}
      metrics={metrics}
      onAnimationsFinish={onAnimationsFinish}
      onAnimationsStart={onAnimationsStart}
      opacity={opacity}
      opacityTiming={opacityTiming}
      respectMotionPreference={respectMotionPreference}
      spinTiming={spinTiming}
      transformTiming={transformTiming}
      trend={trend}
      trendValue={value}
      x={x}
      y={y}
    />
  );
}

function SkiaNumberFlowSharedMode({
  sharedValue,
  format,
  locales,
  font,
  color,
  x,
  y,
  width,
  textAlign,
  prefix,
  suffix,
  opacity,
  spinTiming,
  opacityTiming,
  transformTiming,
  trend,
  animated,
  respectMotionPreference,
  continuous,
  digits,
  scrubDigitWidthPercentile,
  onAnimationsStart,
  onAnimationsFinish,
  mask,
  metrics,
  digitStringsArr,
  zeroCodePoint,
}: SharedModeProps) {
  // Scrubbing bridge: digit-count bridging between worklet and JS thread
  const { effectiveValue } = useScrubbingBridge({
    sharedValue,
    value: undefined,
    prefix,
    suffix,
    zeroCodePoint,
  });

  const keyedParts = useNumberFormatting(effectiveValue, format, locales, prefix, suffix);

  const layout = useMemo(() => {
    const text = `${prefix}${effectiveValue}${suffix}`;
    return computeStringLayout(
      text,
      metrics,
      width,
      textAlign,
      undefined,
      prefix.length,
      suffix.length,
    );
  }, [metrics, width, textAlign, prefix, suffix, effectiveValue]);

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
    scrubDigitWidthPercentile,
    layout,
    layoutDigitCount,
    width,
    textAlign,
  });

  return (
    <SkiaNumberFlowRuntime
      animated={animated}
      color={color}
      continuous={continuous}
      digitStringsArr={digitStringsArr}
      digits={digits}
      font={font}
      keyedParts={keyedParts}
      layout={layout}
      mask={mask}
      metrics={metrics}
      onAnimationsFinish={onAnimationsFinish}
      onAnimationsStart={onAnimationsStart}
      opacity={opacity}
      opacityTiming={opacityTiming}
      respectMotionPreference={respectMotionPreference}
      spinTiming={spinTiming}
      transformTiming={transformTiming}
      trend={trend}
      trendValue={undefined}
      workletDigitValues={workletDigitValues}
      workletLayout={workletLayout}
      x={x}
      y={y}
    />
  );
}

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
  tabularNums,
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
  const metrics = useGlyphMetrics(font, formatChars, digitStringsArr, tabularNums);

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

  if (!font || !metrics) {
    return <Group />;
  }

  const baseProps: ModeBaseProps = {
    format,
    locales,
    font,
    color,
    x,
    y,
    width,
    textAlign,
    prefix,
    suffix,
    opacity,
    spinTiming,
    opacityTiming,
    transformTiming,
    trend,
    animated,
    respectMotionPreference,
    continuous,
    digits,
    scrubDigitWidthPercentile: clampedPercentile,
    onAnimationsStart,
    onAnimationsFinish,
    mask,
    metrics,
    digitStringsArr,
    zeroCodePoint,
  };

  // Shared-value mode mounts scrubbing hooks; value mode avoids them entirely.
  if (sharedValue !== undefined && value === undefined) {
    return <SkiaNumberFlowSharedMode {...baseProps} sharedValue={sharedValue} />;
  }

  if (value === undefined) {
    return <Group />;
  }

  return <SkiaNumberFlowValueMode {...baseProps} value={value} />;
};
