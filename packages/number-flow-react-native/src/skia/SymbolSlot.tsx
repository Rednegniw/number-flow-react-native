import { Group, Paint, Text as SkiaText } from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import {
  Easing,
  makeMutable,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { getSuperscriptTransform } from "../core/superscript";
import type { SkiaNumberFlowProps, TimingConfig } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useSlotOpacity } from "../core/useSlotOpacity";

// Timing for smooth prefix/suffix animation during scrubbing
const WORKLET_X_ANIMATION_MS = 150;

interface SymbolSlotProps {
  char: string;
  targetX: number;
  baseY: number;
  ascent: number;
  color: string;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  entering: boolean;
  exiting: boolean;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  workletLayout?: SharedValue<{ x: number; width: number }[]>;
  slotIndex?: number;
  superscript?: boolean;
}

export const SymbolSlot = React.memo(
  ({
    char,
    targetX,
    baseY,
    ascent,
    color,
    font,
    opacityTiming,
    transformTiming,
    entering,
    exiting,
    exitKey,
    onExitComplete,
    workletLayout,
    slotIndex,
    superscript,
  }: SymbolSlotProps) => {
    const slotOpacity = useSlotOpacity({
      entering,
      exiting,
      opacityTiming,
      exitKey,
      onExitComplete,
    });

    const animatedX = useAnimatedX(targetX, exiting, transformTiming);

    /**
     * Animated X position (worklet-driven).
     * Unlike digits (which need instant response for scrubbing),
     * symbols (prefix/suffix) should animate smoothly when the layout
     * shifts due to digit count changes. This prevents jarring jumps.
     */
    const [workletAnimatedX] = useState(() => makeMutable(targetX));

    useAnimatedReaction(
      () => {
        const wl = workletLayout?.value;
        if (wl && slotIndex !== undefined && slotIndex < wl.length) {
          return wl[slotIndex].x;
        }
        return null;
      },
      (newX, prevX) => {
        if (newX !== null && newX !== prevX) {
          workletAnimatedX.value = withTiming(newX, {
            duration: WORKLET_X_ANIMATION_MS,
            easing: Easing.out(Easing.ease),
          });
        }
      },
      [workletLayout, slotIndex],
    );

    const groupTransform = useDerivedValue(() => {
      const wl = workletLayout?.value;
      if (wl && slotIndex !== undefined && slotIndex < wl.length) {
        return [{ translateX: workletAnimatedX.value }];
      }
      return [{ translateX: animatedX.value }];
    });

    const superscriptTransform = useMemo(
      () => (superscript ? getSuperscriptTransform(baseY, ascent) : undefined),
      [superscript, baseY, ascent],
    );

    const opacityPaint = useMemo(() => <Paint opacity={slotOpacity} />, [slotOpacity]);

    const textElement = <SkiaText color={color} font={font} text={char} x={0} y={baseY} />;

    return (
      <Group layer={opacityPaint} transform={groupTransform}>
        {superscriptTransform ? (
          <Group transform={superscriptTransform}>{textElement}</Group>
        ) : (
          textElement
        )}
      </Group>
    );
  },
);

SymbolSlot.displayName = "SymbolSlot";
