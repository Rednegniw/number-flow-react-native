import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, type TextStyle } from "react-native";
import Animated, {
  makeMutable,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { DIGIT_COUNT, SUPERSCRIPT_SCALE } from "../core/constants";
import { getSuperscriptTextStyle } from "../core/superscript";
import type { GlyphMetrics, TimingConfig, TrendRef } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useDigitAnimation } from "../core/useDigitAnimation";
import { signedDigitOffset } from "../core/utils";

/**
 * Maps a digit's clamped scroll offset to an opacity value for edge fading.
 * Digits near center (offset ~ 0) are fully opaque; digits approaching the
 * container edge fade to transparent over the mask zone.
 *
 * When mask is disabled (maskTop/Bottom = 0), fadeRatio = 0 → fadeStart = 1,
 * so the function always returns 1 (no fade).
 */
function computeDigitOpacity(
  clampedOffset: number,
  maskTop: number,
  maskBottom: number,
  lineHeight: number,
): number {
  "worklet";
  const absOffset = Math.abs(clampedOffset);
  const fadeRatio = clampedOffset < 0 ? maskTop / lineHeight : maskBottom / lineHeight;
  const fadeStart = Math.max(0, 1 - fadeRatio);

  if (absOffset <= fadeStart) return 1;
  if (absOffset >= 1) return 0;
  return (1 - absOffset) / (1 - fadeStart);
}

// Extracted as its own component so useAnimatedStyle respects Rules of Hooks
interface DigitElementProps {
  digitString: string;
  yValue: SharedValue<number>;
  opacityValue: SharedValue<number>;
  textStyle: DigitSlotProps["textStyle"];
}

/**
 * A single Animated.Text per digit (transform and opacity animate directly
 * on the text node) instead of an Animated.View wrapping a Text: halves the
 * host-view count of every wheel.
 */
const DigitElement = React.memo(
  ({ digitString, yValue, opacityValue, textStyle }: DigitElementProps) => {
    const animatedStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateY: yValue.value }],
        opacity: opacityValue.value,
      }),
      [yValue, opacityValue],
    );

    return (
      <Animated.Text style={[styles.digitText, textStyle, animatedStyle]}>
        {digitString}
      </Animated.Text>
    );
  },
);

DigitElement.displayName = "DigitElement";

interface DigitSlotProps {
  metrics: GlyphMetrics;
  digitValue: number;
  targetX: number;
  charWidth: number;
  textStyle: TextStyle;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  trendRef: TrendRef;
  entering: boolean;
  exiting: boolean;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
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
    textStyle,
    spinTiming,
    opacityTiming,
    transformTiming,
    trendRef,
    entering,
    exiting,
    exitKey,
    onExitComplete,
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

    // Superscript scaling: exponent digits/signs render smaller at the top of the line.
    // Mask heights are zeroed for superscript: the container-level gradient doesn't cover
    // the superscript position, so any buffer would show unmasked neighboring digits.
    const scale = superscript ? SUPERSCRIPT_SCALE : 1;
    const effectiveLH = metrics.lineHeight * scale;
    const effectiveMaskTop = superscript ? 0 : maskTop;
    const effectiveMaskBottom = superscript ? 0 : maskBottom;

    const effectiveTextStyle = useMemo(
      () => (superscript ? getSuperscriptTextStyle(textStyle, effectiveLH) : textStyle),
      [textStyle, superscript, effectiveLH],
    );

    const { initialDigit, animDelta, currentDigitSV, slotOpacity } = useDigitAnimation({
      digitValue,
      entering,
      exiting,
      trendRef,
      spinTiming,
      opacityTiming,
      exitKey,
      onExitComplete,
      digitCount: resolvedDigitCount,
      continuousSpinGeneration,
    });

    /**
     * Per-digit Y transforms stored as makeMutable shared values.
     * Each digit independently positions itself based on its signed
     * modular distance from the virtual scroll position.
     */
    const [digitYValues] = useState(() =>
      Array.from({ length: resolvedDigitCount }, (_, n) => {
        const offset = signedDigitOffset(n, initialDigit, resolvedDigitCount);
        const clamped = Math.max(-1.5, Math.min(1.5, offset));
        return makeMutable(clamped * effectiveLH + effectiveMaskTop);
      }),
    );

    // Per-digit opacity for edge fading (replaces container-level MaskedView)
    const [digitOpacities] = useState(() =>
      Array.from({ length: resolvedDigitCount }, (_, n) => {
        const offset = signedDigitOffset(n, initialDigit, resolvedDigitCount);
        const clamped = Math.max(-1.5, Math.min(1.5, offset));
        return makeMutable(
          computeDigitOpacity(clamped, effectiveMaskTop, effectiveMaskBottom, effectiveLH),
        );
      }),
    );

    /**
     * Mirrors NumberFlow's CSS mod(): each digit n computes its signed
     * offset from virtual position c, clamped to [-1.5, 1.5].
     * Only the current digit (offset ~ 0) and its neighbors (offset ~ +/-1)
     * are visible through the clip window. All others park just outside.
     */
    useAnimatedReaction(
      () => currentDigitSV.value - animDelta.value,
      (c) => {
        for (let n = 0; n < resolvedDigitCount; n++) {
          const offset = signedDigitOffset(n, c, resolvedDigitCount);
          const clamped = Math.max(-1.5, Math.min(1.5, offset));
          digitYValues[n].value = clamped * effectiveLH + effectiveMaskTop;
          digitOpacities[n].value = computeDigitOpacity(
            clamped,
            effectiveMaskTop,
            effectiveMaskBottom,
            effectiveLH,
          );
        }
      },
      [
        currentDigitSV,
        animDelta,
        effectiveLH,
        resolvedDigitCount,
        effectiveMaskTop,
        effectiveMaskBottom,
      ],
    );

    const animatedX = useAnimatedX(targetX, exiting, transformTiming);

    /**
     * Clip width covers BOTH the outgoing and incoming advance widths for the
     * duration of the roll, then settles on the new width.
     *
     * Easing this value instead wrote a layout prop every frame, forcing a
     * Yoga relayout per slot per frame: measured as the dominant cost of a
     * dense grid (a tabular-nums grid, whose widths never change, ran ~4.7x
     * more frames per second than the same proportional grid). This writes it
     * at most twice per value change.
     *
     * Widening immediately cannot clip glyph ink mid-roll, and the settle at
     * the end is invisible because by then only the final digit is in the
     * window and the extra width holds no ink.
     */
    const [clipWidth] = useState(() => makeMutable(charWidth));
    const prevWidthRef = useRef(charWidth);

    useLayoutEffect(() => {
      if (exiting || prevWidthRef.current === charWidth) return;

      const covering = Math.max(prevWidthRef.current, charWidth);
      prevWidthRef.current = charWidth;
      clipWidth.value = covering;

      if (covering === charWidth) return;

      clipWidth.value = withDelay(transformTiming.duration, withTiming(charWidth, { duration: 0 }));
    }, [charWidth, exiting, transformTiming, clipWidth]);

    const expandedHeight = effectiveLH + effectiveMaskTop + effectiveMaskBottom;

    /**
     * One wrapper view carries the slot transform, opacity, AND the clip
     * (overflow hidden + width). Merging the former transform and clip
     * wrappers saves a host view per slot; clipping behavior is unchanged
     * because the old outer view sized itself to the clip view.
     */
    const animatedSlotStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateX: animatedX.value }, { translateY: -effectiveMaskTop }],
        opacity: slotOpacity.value,
        height: expandedHeight,
        width: clipWidth.value,
      }),
      [animatedX, effectiveMaskTop, slotOpacity, expandedHeight, clipWidth],
    );

    const digitElements = useMemo(
      () =>
        Array.from({ length: resolvedDigitCount }, (_, n) => (
          <DigitElement
            digitString={resolvedDigitStrings[n]}
            key={n}
            textStyle={effectiveTextStyle}
            yValue={digitYValues[n]}
            opacityValue={digitOpacities[n]}
          />
        )),
      [resolvedDigitCount, resolvedDigitStrings, digitYValues, digitOpacities, effectiveTextStyle],
    );

    return (
      <Animated.View style={[styles.slotClip, animatedSlotStyle]}>{digitElements}</Animated.View>
    );
  },
);

DigitSlot.displayName = "DigitSlot";

const styles = StyleSheet.create({
  slotClip: {
    position: "absolute",
    overflow: "hidden",
  },
  digitText: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
