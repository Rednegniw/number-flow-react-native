import {
  Group,
  Paint,
  Text as SkiaText,
  rect,
} from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import {
  type SharedValue,
  makeMutable,
  useAnimatedReaction,
  useDerivedValue,
} from "react-native-reanimated";
import {
  DIGIT_COUNT,
  DIGIT_STRINGS,
  SUPERSCRIPT_SCALE,
} from "../core/constants";
import type {
  GlyphMetrics,
  SkiaNumberFlowProps,
  TimingConfig,
  Trend,
} from "../core/types";
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
  maskHeight?: number;
  superscript?: boolean;
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
    maskHeight = 0,
    superscript,
  }: DigitSlotProps) => {
    const resolvedDigitCount = digitCount ?? DIGIT_COUNT;

    const { initialDigit, animDelta, currentDigitSV, slotOpacity } =
      useDigitAnimation({
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
      for (let d = 0; d <= 9; d++) {
        const w = metrics.charWidths[DIGIT_STRINGS[d]];
        offsets.push((metrics.maxDigitWidth - w) / 2);
      }
      return offsets;
    }, [metrics]);

    // Superscript digits use a tight clip (no mask buffer) — the container-level
    // gradient doesn't cover the superscript position, so buffer would leak neighbors.
    const effectiveMaskHeight = superscript ? 0 : maskHeight;

    const clipRect = useMemo(
      () =>
        rect(
          0,
          baseY + metrics.ascent - effectiveMaskHeight,
          metrics.maxDigitWidth,
          metrics.lineHeight + 2 * effectiveMaskHeight,
        ),
      [baseY, metrics, effectiveMaskHeight],
    );

    const opacityPaint = useMemo(
      () => <Paint opacity={slotOpacity} />,
      [slotOpacity],
    );

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
              text={DIGIT_STRINGS[n]}
              x={digitXOffsets[n]}
              y={baseY}
            />
          </Group>
        )),
      [resolvedDigitCount, baseY, color, font, digitXOffsets, digitYTransforms],
    );

    // Superscript: pivot-scale around text top so the digit shrinks downward
    // within the mask region. No explicit raise needed — the smaller glyph
    // naturally sits at the top of the line, producing a superscript appearance.
    const superscriptTransform = useMemo(() => {
      if (!superscript) return undefined;

      const textTop = baseY + metrics.ascent;

      return [
        { translateY: textTop },
        { scale: SUPERSCRIPT_SCALE },
        { translateY: -textTop },
      ];
    }, [superscript, baseY, metrics]);

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
