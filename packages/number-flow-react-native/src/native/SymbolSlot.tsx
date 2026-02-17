import React, { useMemo } from "react";
import { Text, type TextStyle } from "react-native";
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

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: animatedX.value }],
      opacity: slotOpacity.value,
    }));

    return (
      <Animated.View style={[{ position: "absolute", height: effectiveHeight }, animatedStyle]}>
        <Text style={effectiveTextStyle}>{char}</Text>
      </Animated.View>
    );
  },
);

SymbolSlot.displayName = "SymbolSlot";
