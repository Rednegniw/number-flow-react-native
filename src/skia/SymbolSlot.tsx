import { Group, Paint, Text as SkiaText } from "@shopify/react-native-skia";
import React, { useMemo, useRef, useState } from "react";
import {
  Easing,
  type SharedValue,
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import type { SkiaNumberFlowProps, TimingConfig } from "../core/types";

// Timing for smooth prefix/suffix animation during scrubbing
const WORKLET_X_ANIMATION_MS = 150;

export interface SymbolSlotProps {
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

    // ── Animated X position (prop-driven) ──────────────────────────
    const [animatedX] = useState(() => makeMutable(targetX));
    const prevXRef = useRef(targetX);

    if (!exiting && prevXRef.current !== targetX) {
      prevXRef.current = targetX;
      animatedX.value = withTiming(targetX, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }

    // ── Animated X position (worklet-driven) ─────────────────────────
    // Unlike digits (which need instant response for scrubbing),
    // symbols (prefix/suffix) should animate smoothly when the layout
    // shifts due to digit count changes. This prevents jarring jumps.
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
        // Use animated worklet position for smooth prefix/suffix movement
        return [{ translateX: workletAnimatedX.value }];
      }
      return [{ translateX: animatedX.value }];
    });

    const opacityPaint = useMemo(
      () => <Paint opacity={slotOpacity} />,
      [slotOpacity],
    );

    return (
      <Group layer={opacityPaint} transform={groupTransform}>
        <SkiaText color={color} font={font} text={char} x={0} y={baseY} />
      </Group>
    );
  },
);

SymbolSlot.displayName = "SymbolSlot";
