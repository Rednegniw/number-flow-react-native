import { Group, LinearGradient, Paint, Rect as SkiaRect, vec } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { MASK_WIDTH_RATIO } from "../core/constants";
import { resolveDirection, resolveTextAlign } from "../core/direction";
import { getFormatCharacters, parseFormattedNumber } from "../core/intlHelpers";
import { type CharLayout, computeKeyedLayout } from "../core/layout";
import { detectNumberingSystem, getDigitStrings, getZeroCodePoint } from "../core/numerals";
import type {
  GlyphMetrics,
  KeyedPart,
  ResolvedTextAlign,
  SkiaNumberFlowProps,
} from "../core/types";
import { useAccessibilityAnnouncement } from "../core/useAccessibilityAnnouncement";
import { useFlowPipeline } from "../core/useFlowPipeline";
import { rawPartsToKeyedParts, useNumberFormatting } from "../core/useNumberFormatting";
import { getDigitCount } from "../core/utils";
import { warnOnce } from "../core/warnings";
import { renderSlots } from "./renderSlots";
import { useGlyphMetrics } from "./useGlyphMetrics";
import { useScrubbingBridge } from "./useScrubbingBridge";
import { useScrubbingLayout } from "./useScrubbingLayout";

interface ModeBaseProps {
  format: Intl.NumberFormatOptions | undefined;
  locales: Intl.LocalesArgument | undefined;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  color: string;
  x: number;
  y: number;
  width: number;
  textAlign: ResolvedTextAlign;
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
  resolvedDir: "ltr" | "rtl";
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

  const resolvedMask = mask ?? true;
  const maskWidth = resolvedMask ? MASK_WIDTH_RATIO * metrics.lineHeight : 0;

  const staticContentLeft =
    layout.length > 0 ? layout.reduce((min, entry) => Math.min(min, entry.x), Infinity) : 0;
  const staticContentRight =
    layout.length > 0 ? layout.reduce((max, entry) => Math.max(max, entry.x + entry.width), 0) : 0;

  /**
   * Animated mask bounds that track workletLayout during scrubbing.
   * When workletLayout has different bounds (proportional digit widths),
   * the mask expands to avoid clipping entering/exiting content.
   * In value mode (no workletLayout), falls through to static bounds.
   */
  const maskBounds = useDerivedValue(() => {
    let left = staticContentLeft;
    let right = staticContentRight;

    const wl = workletLayout?.value;
    if (wl && wl.length > 0) {
      for (let i = 0; i < wl.length; i++) {
        if (wl[i].x < left) left = wl[i].x;
        const r = wl[i].x + wl[i].width;
        if (r > right) right = r;
      }
    }

    const cw = right - left;
    const tw = cw + 2 * maskWidth;
    return {
      maskLeft: x + left - maskWidth,
      maskRight: x + right + maskWidth,
      totalWidth: tw,
      hRatio: tw > 0 ? maskWidth / tw : 0,
    };
  });

  const maskTopHeight = resolvedMask ? adaptiveMask.top : 0;
  const maskBottomHeight = resolvedMask ? adaptiveMask.bottom : 0;
  const expansionTop = resolvedMask ? adaptiveMask.expansionTop : 0;
  const expansionBottom = resolvedMask ? adaptiveMask.expansionBottom : 0;
  const baseY = y;
  const maskY = baseY + metrics.ascent - expansionTop;
  const maskTotalHeight = metrics.lineHeight + expansionTop + expansionBottom;

  const hMaskRect = useDerivedValue(() => {
    const b = maskBounds.value;
    return { x: b.maskLeft, y: maskY, width: b.totalWidth, height: maskTotalHeight };
  });
  const hGradientStart = useDerivedValue(() => vec(maskBounds.value.maskLeft, 0));
  const hGradientEnd = useDerivedValue(() => vec(maskBounds.value.maskRight, 0));
  const hGradientPositions = useDerivedValue(() => {
    const hr = maskBounds.value.hRatio;
    return [0, hr, 1 - hr, 1];
  });

  if (layout.length === 0 && exitingEntries.size === 0) {
    return <Group />;
  }

  const vRatioTop = maskTotalHeight > 0 ? maskTopHeight / maskTotalHeight : 0;
  const vRatioBottom = maskTotalHeight > 0 ? maskBottomHeight / maskTotalHeight : 0;

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
   *
   * Horizontal fade extends OUTSIDE text edges (for enter/exit animations).
   * Vertical fade is WITHIN the text line height (digits roll through it).
   * The horizontal rect/gradient use animated derived values to track
   * workletLayout bounds during scrubbing.
   */
  const maskedContent = resolvedMask ? (
    <Group layer={<Paint />}>
      {content}

      {/* Horizontal fade (animated to track worklet layout) */}
      <Group layer={<Paint blendMode="dstIn" />}>
        <SkiaRect rect={hMaskRect}>
          <LinearGradient
            colors={["transparent", "black", "black", "transparent"]}
            end={hGradientEnd}
            positions={hGradientPositions}
            start={hGradientStart}
          />
        </SkiaRect>
      </Group>

      {/* Vertical fade */}
      <Group layer={<Paint blendMode="dstIn" />}>
        <SkiaRect rect={hMaskRect}>
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
  resolvedDir,
}: ValueModeProps) {
  const { parts: keyedParts, rawChars } = useNumberFormatting(
    value,
    format,
    locales,
    prefix,
    suffix,
  );

  const layout = useMemo(() => {
    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign, {
      localeDigitStrings: digitStringsArr,
      rawCharsWithBidi: rawChars,
      direction: resolvedDir,
    });
  }, [keyedParts, metrics, width, textAlign, digitStringsArr, rawChars, resolvedDir]);

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
  resolvedDir,
}: SharedModeProps) {
  const { effectiveString } = useScrubbingBridge({
    sharedValue,
    prefix,
    suffix,
    zeroCodePoint,
  });

  // Parse the raw string directly to preserve formatting that parseFloat would lose
  const { keyedParts, rawChars } = useMemo(() => {
    if (effectiveString === undefined)
      return { keyedParts: [] as KeyedPart[], rawChars: [] as string[] };
    const parts = parseFormattedNumber(effectiveString, locales, zeroCodePoint);
    const rawString = prefix + effectiveString + suffix;
    return { keyedParts: rawPartsToKeyedParts(parts, prefix, suffix), rawChars: [...rawString] };
  }, [effectiveString, locales, zeroCodePoint, prefix, suffix]);

  const layout = useMemo(() => {
    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign, {
      localeDigitStrings: digitStringsArr,
      rawCharsWithBidi: rawChars,
      direction: resolvedDir,
    });
  }, [keyedParts, metrics, width, textAlign, digitStringsArr, rawChars, resolvedDir]);

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
  textAlign: rawTextAlign,
  direction,
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
  const resolvedDir = resolveDirection(direction);
  const textAlign = resolveTextAlign(resolvedDir, rawTextAlign);

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
        "font is null. Pass a loaded SkFont from useFont(). Component renders empty until font loads.",
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
    resolvedDir,
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
