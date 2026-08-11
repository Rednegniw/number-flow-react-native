import { Group, rect, Text as SkiaText } from "@shopify/react-native-skia";
import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  makeMutable,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";
import { DIGIT_COUNT, SUPERSCRIPT_SCALE } from "../core/constants";
import { getSuperscriptTransform } from "../core/superscript";
import type { GlyphMetrics, TimingConfig, Trend, TrendRef } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useDigitAnimation } from "../core/useDigitAnimation";
import { signedDigitOffset } from "../core/utils";
import type { SkiaNumberFlowProps } from "./types";

interface DigitSlotProps {
  metrics: GlyphMetrics;
  digitValue: number;
  targetX: number;
  charWidth: number;
  baseY: number;
  color: string | SharedValue<string>;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  trendRef: TrendRef;
  /** Plain trend for the worklet-driven reaction; only set in shared-value mode */
  workletTrend?: Trend;
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
    trendRef,
    workletTrend,
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
      trendRef,
      workletTrend,
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
          const translateY = clamped * lh;

          /**
           * Skip parked digits: a fresh array write always re-notifies
           * Reanimated's mappers (object identity defeats the same-value
           * short-circuit), so during a spin only digits whose clamped
           * position actually moved get a new transform. Digits parked at
           * the +/-1.5 boundary stay silent.
           */
          const sv = digitYTransforms[n];
          if (sv.value[0].translateY !== translateY) {
            sv.value = [{ translateY }];
          }
        }
      },
      [currentDigitSV, animDelta, metrics.lineHeight, resolvedDigitCount],
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

    /**
     * The centering offset lives in a shared value rather than being read from
     * `charWidth` inside the worklet.
     *
     * `useDerivedValue` without an explicit dependency array derives its effect
     * dependencies from the worklet's captured closure values, so closing over
     * a plain `charWidth` tore the mapper down and started a new one on every
     * value change (proportional digit widths change constantly). Reading a
     * shared value instead keeps the closure stable: the mapper registers once
     * and simply recomputes when the value is written.
     */
    const [centeringOffset] = useState(() => makeMutable(charWidth / 2 - visualClipWidth / 2));

    useLayoutEffect(() => {
      centeringOffset.value = charWidth / 2 - visualClipWidth / 2;
    }, [charWidth, visualClipWidth, centeringOffset]);

    const groupTransform = useDerivedValue(() => {
      const wl = workletLayout?.value;
      if (wl && slotIndex !== undefined && slotIndex < wl.length) {
        const slotWidth = wl[slotIndex].width;
        const cx = slotWidth / 2 - visualClipWidth / 2;
        return [{ translateX: wl[slotIndex].x + cx }];
      }
      return [{ translateX: animatedX.value + centeringOffset.value }];
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

    // Superscript digits use a tight clip (no mask buffer): the container-level
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

    /**
     * Each digit gets its own Group transform driven by the position
     * reaction. Only 10 elements needed (vs 30 with the copy approach).
     * useMemo creates stable JSX; shared values drive the animation.
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

    /**
     * Group opacity multiplies into each child's paint at draw time; unlike
     * layer={<Paint opacity/>} it needs no saveLayer (offscreen texture) per
     * slot per frame. Visually identical here because the digits inside a
     * slot never overlap.
     */
    return (
      <Group opacity={slotOpacity} transform={groupTransform}>
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
