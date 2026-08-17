import React, { useMemo } from "react";
import type { TextStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { SUPERSCRIPT_SCALE } from "../core/constants";
import { getSuperscriptTextStyle } from "../core/superscript";
import type { TimingConfig } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useSlotOpacity } from "../core/useSlotOpacity";

interface SymbolSlotProps {
  char: string;
  targetX: number;
  lineHeight: number;
  textStyle: TextStyle;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  entering: boolean;
  exiting: boolean;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  superscript?: boolean;
}

export const SymbolSlot = React.memo(
  ({
    char,
    targetX,
    lineHeight,
    textStyle,
    opacityTiming,
    transformTiming,
    entering,
    exiting,
    exitKey,
    onExitComplete,
    superscript,
  }: SymbolSlotProps) => {
    const effectiveHeight = superscript ? lineHeight * SUPERSCRIPT_SCALE : lineHeight;

    const effectiveTextStyle = useMemo(
      () => (superscript ? getSuperscriptTextStyle(textStyle, effectiveHeight) : textStyle),
      [textStyle, superscript, effectiveHeight],
    );

    const slotOpacity = useSlotOpacity({
      entering,
      exiting,
      opacityTiming,
      exitKey,
      onExitComplete,
    });

    const animatedX = useAnimatedX(targetX, exiting, transformTiming);

    /**
     * The animated style sits last in the style array, so user-provided
     * opacity/transform from the text style must be composed in rather than
     * overridden: opacity multiplies (matching the old wrapper-view nesting)
     * and the slot translation applies before any user transform.
     */
    const userOpacity =
      typeof effectiveTextStyle.opacity === "number" ? effectiveTextStyle.opacity : 1;
    const userTransform = Array.isArray(effectiveTextStyle.transform)
      ? effectiveTextStyle.transform
      : [];

    const animatedStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateX: animatedX.value }, ...userTransform],
        opacity: slotOpacity.value * userOpacity,
      }),
      [animatedX, slotOpacity, userOpacity, userTransform],
    );

    /**
     * Single Animated.Text (no wrapper view): transform and opacity animate
     * directly on the text node, halving this slot's host-view count.
     */
    return (
      <Animated.Text
        style={[
          { position: "absolute", height: effectiveHeight },
          effectiveTextStyle,
          animatedStyle,
        ]}
      >
        {char}
      </Animated.Text>
    );
  },
);

SymbolSlot.displayName = "SymbolSlot";
