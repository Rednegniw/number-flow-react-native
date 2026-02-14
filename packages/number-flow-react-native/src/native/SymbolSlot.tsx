import React from "react";
import { Text, type TextStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
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
  }: SymbolSlotProps) => {
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
      <Animated.View
        style={[{ position: "absolute", height: lineHeight }, animatedStyle]}
      >
        <Text style={textStyle}>{char}</Text>
      </Animated.View>
    );
  },
);

SymbolSlot.displayName = "SymbolSlot";
