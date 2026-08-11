import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, type TextStyle } from "react-native";
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
import { normalizeWheelPosition, wheelStripDigit } from "../core/utils";
import MaskedView from "./MaskedView";

/**
 * Extra digits rendered above and below the wheel's own range so the window
 * always has neighbours to show, including across a wrap. The clip window is
 * about 1.4 line-heights tall, so two of padding is comfortably enough.
 */
const STRIP_PAD = 2;

/**
 * Per-digit opacity fading exists only for installs without MaskedView, where
 * it is the sole approximation of the edge gradient. When MaskedView is
 * present the container gradient does the fade, and animating opacity per
 * digit as well both double-faded the edges and put ~4 extra animated style
 * updates per slot on every frame.
 *
 * Resolved once at module load, so the branch below can never flip mid-animation.
 */
const PER_DIGIT_FADE = MaskedView === null;

const EMPTY_OPACITIES: SharedValue<number>[] = [];

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

interface StripDigitProps {
  digitString: string;
  top: number;
  textStyle: TextStyle;
}

/**
 * The common case: a plain Text at a fixed offset in the strip. The strip's
 * single transform moves it, so this node has no animated style at all.
 */
const StripDigit = React.memo(({ digitString, top, textStyle }: StripDigitProps) => (
  <Text style={[styles.digitText, textStyle, { top }]}>{digitString}</Text>
));

StripDigit.displayName = "StripDigit";

/** MaskedView-less fallback: same fixed offset, but opacity fades per digit */
const FadingStripDigit = React.memo(
  ({
    digitString,
    top,
    textStyle,
    opacityValue,
  }: StripDigitProps & { opacityValue: SharedValue<number> }) => {
    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacityValue.value }), [opacityValue]);

    return (
      <Animated.Text style={[styles.digitText, textStyle, { top }, animatedStyle]}>
        {digitString}
      </Animated.Text>
    );
  },
);

FadingStripDigit.displayName = "FadingStripDigit";

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

    /**
     * Superscript scaling: exponent digits/signs render smaller at the top of
     * the line. Mask heights are zeroed for superscript: the container-level
     * gradient doesn't cover the superscript position, so any buffer would
     * show unmasked neighboring digits.
     */
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

    const stripLength = resolvedDigitCount + 2 * STRIP_PAD;

    /**
     * The whole wheel is one strip translated by a single shared value, instead
     * of every digit carrying its own animated transform. A spinning slot used
     * to commit ~4 animated styles per frame (one for each digit crossing the
     * window); it now commits exactly one.
     *
     * Digit at strip index i shows (i - STRIP_PAD) mod count and sits at a
     * fixed offset of (i - STRIP_PAD) line-heights, so translating the strip to
     * -position line-heights puts the digit for `position` in the window. When
     * position wraps past the wheel's range the strip jumps by a whole turn,
     * which is invisible because index i and index i + count render the same
     * digit with the same neighbours.
     */
    const [stripY] = useState(() =>
      makeMutable(
        -normalizeWheelPosition(initialDigit, resolvedDigitCount) * effectiveLH + effectiveMaskTop,
      ),
    );

    const [digitOpacities] = useState(() =>
      PER_DIGIT_FADE
        ? Array.from({ length: stripLength }, (_, i) => {
            const offset = i - STRIP_PAD - normalizeWheelPosition(initialDigit, resolvedDigitCount);
            const clamped = Math.max(-1.5, Math.min(1.5, offset));
            return makeMutable(
              computeDigitOpacity(clamped, effectiveMaskTop, effectiveMaskBottom, effectiveLH),
            );
          })
        : EMPTY_OPACITIES,
    );

    useAnimatedReaction(
      () => currentDigitSV.value - animDelta.value,
      (c) => {
        const position = normalizeWheelPosition(c, resolvedDigitCount);
        stripY.value = -position * effectiveLH + effectiveMaskTop;

        if (!PER_DIGIT_FADE) return;

        for (let i = 0; i < stripLength; i++) {
          const offset = i - STRIP_PAD - position;
          const clamped = Math.max(-1.5, Math.min(1.5, offset));
          digitOpacities[i].value = computeDigitOpacity(
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
        stripLength,
      ],
    );

    const animatedX = useAnimatedX(targetX, exiting, transformTiming);

    /**
     * Clip width covers BOTH the outgoing and incoming advance widths for the
     * duration of the roll, then settles on the new width.
     *
     * Easing this value instead wrote a layout prop every frame, forcing a
     * Yoga relayout per slot per frame: measured as the dominant cost of a
     * dense grid. This writes it at most twice per value change.
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
     * (overflow hidden + width).
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

    const stripStyle = useAnimatedStyle(
      () => ({ transform: [{ translateY: stripY.value }] }),
      [stripY],
    );

    const digitElements = useMemo(
      () =>
        Array.from({ length: stripLength }, (_, i) => {
          const digitString =
            resolvedDigitStrings[wheelStripDigit(i, STRIP_PAD, resolvedDigitCount)];
          const top = (i - STRIP_PAD) * effectiveLH;

          return PER_DIGIT_FADE ? (
            <FadingStripDigit
              digitString={digitString}
              key={i}
              opacityValue={digitOpacities[i]}
              textStyle={effectiveTextStyle}
              top={top}
            />
          ) : (
            <StripDigit
              digitString={digitString}
              key={i}
              textStyle={effectiveTextStyle}
              top={top}
            />
          );
        }),
      [
        stripLength,
        resolvedDigitCount,
        resolvedDigitStrings,
        effectiveLH,
        effectiveTextStyle,
        digitOpacities,
      ],
    );

    return (
      <Animated.View style={[styles.slotClip, animatedSlotStyle]}>
        <Animated.View style={[styles.strip, stripStyle]}>{digitElements}</Animated.View>
      </Animated.View>
    );
  },
);

DigitSlot.displayName = "DigitSlot";

const styles = StyleSheet.create({
  slotClip: {
    position: "absolute",
    overflow: "hidden",
  },
  strip: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  digitText: {
    position: "absolute",
    left: 0,
  },
});
