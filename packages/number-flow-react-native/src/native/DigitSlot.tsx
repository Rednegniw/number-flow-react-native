import React, { useMemo, useState } from "react";
import { StyleSheet, Text, type TextStyle } from "react-native";
import Animated, {
  type SharedValue,
  makeMutable,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { DIGIT_COUNT, DIGIT_STRINGS } from "../core/constants";
import type { GlyphMetrics, TimingConfig, Trend } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useDigitAnimation } from "../core/useDigitAnimation";
import { signedDigitOffset } from "../core/utils";
import { useLayoutEffect, useRef } from "react";

// Extracted as its own component so useAnimatedStyle respects Rules of Hooks
interface DigitElementProps {
  digitIndex: number;
  yValue: SharedValue<number>;
  textStyle: DigitSlotProps["textStyle"];
}

const DigitElement = React.memo(
  ({ digitIndex, yValue, textStyle }: DigitElementProps) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: yValue.value }],
    }));

    return (
      <Animated.View style={[styles.digitView, animatedStyle]}>
        <Text style={textStyle}>{DIGIT_STRINGS[digitIndex]}</Text>
      </Animated.View>
    );
  },
);

DigitElement.displayName = "DigitElement";

interface DigitSlotProps {
  metrics: GlyphMetrics;
  digitValue: number;
  targetX: number;
  charWidth: number;
  lineHeight: number;
  textStyle: TextStyle;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  trend: Trend;
  entering: boolean;
  exiting: boolean;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  workletDigitValue?: SharedValue<number>;
}

export const DigitSlot = React.memo(
  ({
    metrics,
    digitValue,
    targetX,
    charWidth,
    lineHeight,
    textStyle,
    spinTiming,
    opacityTiming,
    transformTiming,
    trend,
    entering,
    exiting,
    exitKey,
    onExitComplete,
    workletDigitValue,
  }: DigitSlotProps) => {
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
      });

    /**
     * Per-digit Y transforms stored as makeMutable shared values.
     * Each digit independently positions itself based on its signed
     * modular distance from the virtual scroll position.
     */
    const [digitYValues] = useState(() => {
      const lh = metrics.lineHeight;
      return Array.from({ length: DIGIT_COUNT }, (_, n) => {
        const offset = signedDigitOffset(n, initialDigit);
        const clamped = Math.max(-1.5, Math.min(1.5, offset));
        return makeMutable(clamped * lh);
      });
    });

    /**
     * Mirrors NumberFlow's CSS mod(): each digit n computes its signed
     * offset from virtual position c, clamped to [-1.5, 1.5].
     * Only the current digit (offset ~ 0) and its neighbors (offset ~ +/-1)
     * are visible through the clip window. All others park just outside.
     */
    useAnimatedReaction(
      () => currentDigitSV.value - animDelta.value,
      (c) => {
        const lh = metrics.lineHeight;
        for (let n = 0; n < DIGIT_COUNT; n++) {
          const offset = signedDigitOffset(n, c);
          const clamped = Math.max(-1.5, Math.min(1.5, offset));
          digitYValues[n].value = clamped * lh;
        }
      },
      [metrics.lineHeight],
    );

    const animatedX = useAnimatedX(targetX, exiting, transformTiming);

    const [animatedClipWidth] = useState(() => makeMutable(charWidth));
    const prevWidthRef = useRef(charWidth);

    useLayoutEffect(() => {
      if (!exiting && prevWidthRef.current !== charWidth) {
        prevWidthRef.current = charWidth;
        animatedClipWidth.value = withTiming(charWidth, {
          duration: transformTiming.duration,
          easing: transformTiming.easing,
        });
      }
    }, [charWidth, exiting, transformTiming]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: animatedX.value }],
      opacity: slotOpacity.value,
    }));

    const animatedClipStyle = useAnimatedStyle(() => ({
      overflow: "hidden" as const,
      height: lineHeight,
      width: animatedClipWidth.value,
    }));

    const digitElements = useMemo(
      () =>
        Array.from({ length: DIGIT_COUNT }, (_, n) => (
          <DigitElement
            digitIndex={n}
            key={n}
            textStyle={textStyle}
            yValue={digitYValues[n]}
          />
        )),
      [digitYValues, textStyle],
    );

    return (
      <Animated.View style={[styles.absolute, animatedStyle]}>
        <Animated.View style={animatedClipStyle}>{digitElements}</Animated.View>
      </Animated.View>
    );
  },
);

DigitSlot.displayName = "DigitSlot";

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
  },
  digitView: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
