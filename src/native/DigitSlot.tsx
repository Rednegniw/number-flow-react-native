import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  type SharedValue,
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { DIGIT_STRINGS } from "../core/constants";
import type { GlyphMetrics, TimingConfig } from "../core/types";
import { computeRollDelta } from "../core/utils";

// We use makeMutable (via useState) instead of useSharedValue because
// useSharedValue's useEffect cleanup calls cancelAnimation, which kills
// in-flight animations during StrictMode double-render cycles.

const DIGIT_COUNT = 10;

// ── Per-digit element ────────────────────────────────────────────
// Extracted as its own component so useAnimatedStyle is called at
// the component top level, not inside useMemo/map (Rules of Hooks).

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

/**
 * Computes the signed modular offset for digit n relative to virtual
 * scroll position c. Returns a value in [-5, 5), where 0 means the
 * digit is centered in the viewport.
 *
 * This is the Reanimated equivalent of NumberFlow's CSS:
 *   offset-raw: mod(length + n - mod(c, length), length)
 *   offset: offset-raw - length * round(down, offset-raw / (length/2), 1)
 */
function signedDigitOffset(n: number, c: number): number {
  "worklet";
  const raw = (((n - c) % DIGIT_COUNT) + DIGIT_COUNT) % DIGIT_COUNT;
  return raw >= 5 ? raw - DIGIT_COUNT : raw;
}

export interface DigitSlotProps {
  metrics: GlyphMetrics;
  digitValue: number;
  targetX: number;
  charWidth: number;
  lineHeight: number;
  textStyle: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  trend: number;
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
    // ── Initialize ─────────────────────────────────────────────────
    const initialDigit = entering ? 0 : digitValue;
    const prevDigitRef = useRef(initialDigit);

    // animDelta starts at the computed roll distance and animates toward 0.
    // The per-digit position reaction computes c = currentDigit - animDelta
    // and uses mod-10 arithmetic to position each digit individually.
    const [animDelta] = useState(() => makeMutable(0));
    const [currentDigitSV] = useState(() => makeMutable(initialDigit));

    // Per-digit Y transforms stored as makeMutable shared values.
    // Each digit independently positions itself based on its signed
    // modular distance from the virtual scroll position.
    const [digitYValues] = useState(() => {
      const lh = metrics.lineHeight;
      return Array.from({ length: DIGIT_COUNT }, (_, n) => {
        const offset = signedDigitOffset(n, initialDigit);
        const clamped = Math.max(-1.5, Math.min(1.5, offset));
        return makeMutable(clamped * lh);
      });
    });

    // ── Per-digit position computation (every animation frame) ────
    // Mirrors NumberFlow's CSS mod(): each digit n computes its signed
    // offset from virtual position c, clamped to [-1.5, 1.5].
    // Only the current digit (offset ~ 0) and its neighbors (offset ~ +/-1)
    // are visible through the clip window. All others park just outside.
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

        if (prevDigitRef.current !== 0) {
          const delta = computeRollDelta(prevDigitRef.current, 0, trend);
          prevDigitRef.current = 0;
          currentDigitSV.value = 0;
          animDelta.value = delta;
          animDelta.value = withTiming(0, {
            duration: spinTiming.duration,
            easing: spinTiming.easing,
          });
        }
      } else if (!wasInitial) {
        slotOpacity.value = withTiming(1, {
          duration: opacityTiming.duration,
          easing: opacityTiming.easing,
        });
      }
    }

    // ── Digit rolling (non-exiting, non-worklet only) ──────────────
    const workletActive =
      workletDigitValue !== undefined && workletDigitValue.value >= 0;
    if (!exiting && !workletActive && prevDigitRef.current !== digitValue) {
      const delta = computeRollDelta(prevDigitRef.current, digitValue, trend);
      prevDigitRef.current = digitValue;
      currentDigitSV.value = digitValue;
      animDelta.value = delta;
      animDelta.value = withTiming(0, {
        duration: spinTiming.duration,
        easing: spinTiming.easing,
      });
    }

    // ── Worklet-driven digit updates ─────────────────────────────
    const syncFromWorklet = useCallback((digit: number) => {
      prevDigitRef.current = digit;
    }, []);

    useAnimatedReaction(
      () => workletDigitValue?.value ?? -1,
      (current, previous) => {
        if (current < 0 || current === previous) return;

        const prev = currentDigitSV.value;
        if (prev === current) return;

        const delta = computeRollDelta(prev, current, trend);
        currentDigitSV.value = current;

        // Accumulate remaining animation delta (composite: 'accumulate').
        animDelta.value = animDelta.value + delta;

        animDelta.value = withTiming(0, {
          duration: spinTiming.duration,
          easing: spinTiming.easing,
        });

        runOnJS(syncFromWorklet)(current);
      },
      [workletDigitValue, spinTiming, trend],
    );

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

    // ── Animated clip width ─────────────────────────────────────
    const [animatedClipWidth] = useState(() => makeMutable(charWidth));
    const prevWidthRef = useRef(charWidth);

    if (!exiting && prevWidthRef.current !== charWidth) {
      prevWidthRef.current = charWidth;
      animatedClipWidth.value = withTiming(charWidth, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }

    // ── Animated style (merged X + opacity into single mapper) ───

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: animatedX.value }],
      opacity: slotOpacity.value,
    }));

    // ── Animated clip style ──────────────────────────────────────
    const animatedClipStyle = useAnimatedStyle(() => ({
      overflow: "hidden" as const,
      height: lineHeight,
      width: animatedClipWidth.value,
    }));

    // ── 10 digit elements — each is its own component with useAnimatedStyle
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
