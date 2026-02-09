import React, { useRef, useState } from "react";
import { Text } from "react-native";
import Animated, {
  makeMutable,
  runOnJS,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import type { TimingConfig } from "../core/types";

export interface SymbolSlotProps {
  char: string;
  targetX: number;
  lineHeight: number;
  textStyle: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
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
    // ── Opacity (state-transition driven) ─────────────────────────
    const [slotOpacity] = useState(() => makeMutable(entering ? 0 : 1));
    const prevStateRef = useRef<"entering" | "exiting" | "active" | null>(null);
    const currentState = entering ? "entering" : exiting ? "exiting" : "active";

    if (currentState !== prevStateRef.current) {
      const wasInitial = prevStateRef.current === null;
      prevStateRef.current = currentState;

      if (currentState === "entering") {
        slotOpacity.value = withTiming(1, {
          duration: opacityTiming.duration,
          easing: opacityTiming.easing,
        });
      } else if (currentState === "exiting") {
        slotOpacity.value = withTiming(
          0,
          {
            duration: opacityTiming.duration,
            easing: opacityTiming.easing,
          },
          (finished) => {
            "worklet";
            if (finished && onExitComplete && exitKey) {
              runOnJS(onExitComplete)(exitKey);
            }
          },
        );
      } else if (!wasInitial) {
        slotOpacity.value = withTiming(1, {
          duration: opacityTiming.duration,
          easing: opacityTiming.easing,
        });
      }
    }

    // ── Animated X position ──────────────────────────────────────
    const [animatedX] = useState(() => makeMutable(targetX));
    const prevXRef = useRef(targetX);

    if (!exiting && prevXRef.current !== targetX) {
      prevXRef.current = targetX;
      animatedX.value = withTiming(targetX, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }

    // ── Animated styles ──────────────────────────────────────────
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
