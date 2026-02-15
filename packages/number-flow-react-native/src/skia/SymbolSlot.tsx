import { Group, Paint, Text as SkiaText } from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import {
  Easing,
  type SharedValue,
  makeMutable,
  useAnimatedReaction,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { SUPERSCRIPT_SCALE } from "../core/constants";
import type { SkiaNumberFlowProps, TimingConfig } from "../core/types";
import { useAnimatedX } from "../core/useAnimatedX";
import { useSlotOpacity } from "../core/useSlotOpacity";

// Timing for smooth prefix/suffix animation during scrubbing
const WORKLET_X_ANIMATION_MS = 150;

interface SymbolSlotProps {
  char: string;
  targetX: number;
  baseY: number;
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
    );

    const groupTransform = useDerivedValue(() => {
      const wl = workletLayout?.value;
      if (wl && slotIndex !== undefined && slotIndex < wl.length) {
        return [{ translateX: workletAnimatedX.value }];
      }
      return [{ translateX: animatedX.value }];
    });

    const superscriptTransform = useMemo(() => {
      if (!superscript) return undefined;

      const textTop = baseY + font.getMetrics().ascent;

      return [
        { translateY: textTop },
        { scale: SUPERSCRIPT_SCALE },
        { translateY: -textTop },
      ];
    }, [superscript, baseY, font]);

    const opacityPaint = useMemo(
      () => <Paint opacity={slotOpacity} />,
      [slotOpacity],
    );

    const textElement = (
      <SkiaText color={color} font={font} text={char} x={0} y={baseY} />
    );

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
