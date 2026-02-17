import { Group, Paint, rect, Text as SkiaText } from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import {
  makeMutable,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";
import { DIGIT_COUNT, SUPERSCRIPT_SCALE } from "../core/constants";
import { getSuperscriptTransform } from "../core/superscript";
import type { GlyphMetrics, SkiaNumberFlowProps, TimingConfig, Trend } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useDigitAnimation } from "../core/useDigitAnimation";
import { signedDigitOffset } from "../core/utils";

interface DigitSlotProps {
  metrics: GlyphMetrics;
  digitValue: number;
  targetX: number;
  charWidth: number;
  baseY: number;
  color: string;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  trend: Trend;
  entering: boolean;
  exiting: boolean;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  workletDigitValue?: SharedValue<number>;
  workletLayout?: SharedValue<{ x: number; width: number }[]>;
  slotIndex?: number;
  digitCount?: number;
  continuousSpinGeneration?: number;
  maskTop?: number;
  maskBottom?: number;
  superscript?: boolean;
  digitStrings?: string[];
}

export const DigitSlot = React.memo(
  ({
    metrics,
    digitValue,
    targetX,
    charWidth,
    baseY,
    color,
    font,
    spinTiming,
    opacityTiming,
    transformTiming,
    trend,
    entering,
    exiting,
    exitKey,
    onExitComplete,
    workletDigitValue,
    workletLayout,
    slotIndex,
    digitCount,
    continuousSpinGeneration,
    maskTop = 0,
    maskBottom = 0,
    superscript,
    digitStrings,
  }: DigitSlotProps) => {
    const resolvedDigitCount = digitCount ?? DIGIT_COUNT;
    const resolvedDigitStrings =
      digitStrings ?? Array.from({ length: resolvedDigitCount }, (_, i) => String(i));

    const { initialDigit, animDelta, currentDigitSV, slotOpacity } = useDigitAnimation({
      digitValue,
      entering,
      exiting,
      trend,
      spinTiming,
      opacityTiming,
      exitKey,
      onExitComplete,
      workletDigitValue,
      digitCount: resolvedDigitCount,
      continuousSpinGeneration,
    });

    /**
     * Per-digit Y transforms: each digit independently positions itself
     * based on its signed modular distance from the virtual scroll position.
     * Initialized with correct positions so the first frame is accurate.
     */
    const [digitYTransforms] = useState(() => {
      const lh = metrics.lineHeight;
      return Array.from({ length: resolvedDigitCount }, (_, n) => {
        const offset = signedDigitOffset(n, initialDigit, resolvedDigitCount);
        const clamped = Math.max(-1.5, Math.min(1.5, offset));
        return makeMutable([{ translateY: clamped * lh }]);
      });
    });

    /**
     * Mirrors NumberFlow's CSS mod(): each digit n computes its signed
     * offset from virtual position c, clamped to [-1.5, 1.5].
     * Only the current digit (offset ≈ 0) and its neighbors (offset ≈ ±1)
     * are visible through the clip window. All others park just outside.
     * Runs every frame via Reanimated's mapper system (animDelta changes →
     * marks mapper dirty → microtask recalculates).
     */
    useAnimatedReaction(
      () => currentDigitSV.value - animDelta.value,
      (c) => {
        const lh = metrics.lineHeight;
        for (let n = 0; n < resolvedDigitCount; n++) {
          const offset = signedDigitOffset(n, c, resolvedDigitCount);
          const clamped = Math.max(-1.5, Math.min(1.5, offset));
          digitYTransforms[n].value = [{ translateY: clamped * lh }];
        }
      },
      [metrics.lineHeight, resolvedDigitCount],
    );

    const animatedX = useAnimatedX(targetX, exiting, transformTiming);

    /**
     * Group transform absorbs clipX (centering offset within slot width).
     * This makes clipRect and digitXOffsets static (font-metric only).
     * For superscript slots the visual clip is scaled, so cx accounts for that.
     */
    const visualClipWidth = superscript
      ? metrics.maxDigitWidth * SUPERSCRIPT_SCALE
      : metrics.maxDigitWidth;

    const groupTransform = useDerivedValue(() => {
      const wl = workletLayout?.value;
      if (wl && slotIndex !== undefined && slotIndex < wl.length) {
        const slotWidth = wl[slotIndex].width;
        const cx = slotWidth / 2 - visualClipWidth / 2;
        return [{ translateX: wl[slotIndex].x + cx }];
      }
      const cx = charWidth / 2 - visualClipWidth / 2;
      return [{ translateX: animatedX.value + cx }];
    });

    // Digit centering within the maxDigitWidth clip (font-metric only, static)
    const digitXOffsets = useMemo(() => {
      const offsets: number[] = [];
      for (let d = 0; d < resolvedDigitCount; d++) {
        const w = metrics.charWidths[resolvedDigitStrings[d]] ?? metrics.maxDigitWidth;
        offsets.push((metrics.maxDigitWidth - w) / 2);
      }
      return offsets;
    }, [metrics, resolvedDigitCount, resolvedDigitStrings]);

    // Superscript digits use a tight clip (no mask buffer) — the container-level
    // gradient doesn't cover the superscript position, so buffer would leak neighbors.
    const effectiveMaskTop = superscript ? 0 : maskTop;
    const effectiveMaskBottom = superscript ? 0 : maskBottom;

    const clipRect = useMemo(
      () =>
        rect(
          0,
          baseY + metrics.ascent - effectiveMaskTop,
          metrics.maxDigitWidth,
          metrics.lineHeight + effectiveMaskTop + effectiveMaskBottom,
        ),
      [baseY, metrics, effectiveMaskTop, effectiveMaskBottom],
    );

    const opacityPaint = useMemo(() => <Paint opacity={slotOpacity} />, [slotOpacity]);

    /**
     * Each digit gets its own Group transform driven by the position
     * reaction. Only 10 elements needed (vs 30 with the copy approach).
     * useMemo creates stable JSX — shared values drive the animation.
     */
    const digitElements = useMemo(
      () =>
        Array.from({ length: resolvedDigitCount }, (_, n) => (
          <Group key={n} transform={digitYTransforms[n]}>
            <SkiaText
              color={color}
              font={font}
              text={resolvedDigitStrings[n]}
              x={digitXOffsets[n]}
              y={baseY}
            />
          </Group>
        )),
      [
        resolvedDigitCount,
        resolvedDigitStrings,
        baseY,
        color,
        font,
        digitXOffsets,
        digitYTransforms,
      ],
    );

    const superscriptTransform = useMemo(
      () => (superscript ? getSuperscriptTransform(baseY, metrics.ascent) : undefined),
      [superscript, baseY, metrics],
    );

    const clipContent = <Group clip={clipRect}>{digitElements}</Group>;

    return (
      <Group layer={opacityPaint} transform={groupTransform}>
        {superscriptTransform ? (
          <Group transform={superscriptTransform}>{clipContent}</Group>
        ) : (
          clipContent
        )}
      </Group>
    );
  },
);

DigitSlot.displayName = "DigitSlot";
