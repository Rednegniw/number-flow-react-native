import {
  Group,
  Paint,
  Text as SkiaText,
  rect,
} from "@shopify/react-native-skia";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  type SharedValue,
  makeMutable,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { DIGIT_STRINGS } from "../core/constants";
import type {
  GlyphMetrics,
  SkiaNumberFlowProps,
  TimingConfig,
} from "../core/types";
import { computeRollDelta } from "../core/utils";

// We use makeMutable (via useState) instead of useSharedValue because
// useSharedValue's useEffect cleanup calls cancelAnimation, which kills
// in-flight animations during StrictMode double-render cycles.

/** Number of digit elements — one per digit 0-9, no copies needed */
const DIGIT_COUNT = 10;

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
  baseY: number;
  color: string;
  font: NonNullable<SkiaNumberFlowProps["font"]>;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  trend: number;
  entering: boolean;
  exiting: boolean;
  exitKey?: string;
  onExitComplete?: (key: string) => void;
  workletDigitValue?: SharedValue<number>;
  workletLayout?: SharedValue<{ x: number; width: number }[]>;
  slotIndex?: number;
}

export const DigitSlot = React.memo(
  ({
    metrics,
    digitValue,
    targetX,
    charWidth,
    baseY,
    color,
    font,
    spinTiming,
    opacityTiming,
    transformTiming,
    trend,
    entering,
    exiting,
    exitKey,
    onExitComplete,
    workletDigitValue,
    workletLayout,
    slotIndex,
  }: DigitSlotProps) => {
    // ── Initialize ─────────────────────────────────────────────────
    const initialDigit = entering ? 0 : digitValue;
    const prevDigitRef = useRef(initialDigit);

    // animDelta starts at the computed roll distance and animates toward 0.
    // The per-digit position reaction computes c = currentDigit - animDelta
    // and uses mod-10 arithmetic to position each digit individually.
    // This creates a virtual infinite wheel — no physical copies needed.
    const [animDelta] = useState(() => makeMutable(0));
    const [currentDigitSV] = useState(() => makeMutable(initialDigit));

    // Per-digit Y transforms: each digit independently positions itself
    // based on its signed modular distance from the virtual scroll position.
    // Initialized with correct positions so the first frame is accurate.
    const [digitYTransforms] = useState(() => {
      const lh = metrics.lineHeight;
      return Array.from({ length: DIGIT_COUNT }, (_, n) => {
        const offset = signedDigitOffset(n, initialDigit);
        const clamped = Math.max(-1.5, Math.min(1.5, offset));
        return makeMutable([{ translateY: clamped * lh }]);
      });
    });

    // ── Per-digit position computation (every animation frame) ────
    // Mirrors NumberFlow's CSS mod(): each digit n computes its signed
    // offset from virtual position c, clamped to [-1.5, 1.5].
    // Only the current digit (offset ≈ 0) and its neighbors (offset ≈ ±1)
    // are visible through the clip window. All others park just outside.
    // This runs every frame via Reanimated's mapper system (confirmed:
    // animDelta changes → marks mapper dirty → microtask recalculates).
    useAnimatedReaction(
      () => currentDigitSV.value - animDelta.value,
      (c) => {
        const lh = metrics.lineHeight;
        for (let n = 0; n < DIGIT_COUNT; n++) {
          const offset = signedDigitOffset(n, c);
          const clamped = Math.max(-1.5, Math.min(1.5, offset));
          digitYTransforms[n].value = [{ translateY: clamped * lh }];
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

    // ── Worklet-driven digit updates (NumberFlow pattern) ─────────
    // Accumulates remaining in-flight delta (composite: 'accumulate').
    // The accumulated delta can grow unboundedly — the mod-based position
    // reaction handles wrapping, creating a truly infinite virtual wheel.
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
        // Safe to read animDelta.value here — we're on the UI thread.
        animDelta.value = animDelta.value + delta;

        animDelta.value = withTiming(0, {
          duration: spinTiming.duration,
          easing: spinTiming.easing,
        });

        runOnJS(syncFromWorklet)(current);
      },
      [workletDigitValue, spinTiming, trend],
    );

    // ── Animated X position ────────────────────────────────────────
    const [animatedX] = useState(() => makeMutable(targetX));
    const prevXRef = useRef(targetX);

    if (!exiting && prevXRef.current !== targetX) {
      prevXRef.current = targetX;
      animatedX.value = withTiming(targetX, {
        duration: transformTiming.duration,
        easing: transformTiming.easing,
      });
    }

    // ── Derived transforms ─────────────────────────────────────────
    // Group transform absorbs clipX (centering offset within slot width).
    // This makes clipRect and digitXOffsets static (font-metric only).
    const groupTransform = useDerivedValue(() => {
      const wl = workletLayout?.value;
      if (wl && slotIndex !== undefined && slotIndex < wl.length) {
        const slotWidth = wl[slotIndex].width;
        const cx = slotWidth / 2 - metrics.maxDigitWidth / 2;
        return [{ translateX: wl[slotIndex].x + cx }];
      }
      const cx = charWidth / 2 - metrics.maxDigitWidth / 2;
      return [{ translateX: animatedX.value + cx }];
    });

    // ── Clip rect and digit positions (relative to group origin) ──
    // Static: digit centering within the maxDigitWidth clip (font-metric only)
    const digitXOffsets = useMemo(() => {
      const offsets: number[] = [];
      for (let d = 0; d <= 9; d++) {
        const w = metrics.charWidths[DIGIT_STRINGS[d]];
        offsets.push((metrics.maxDigitWidth - w) / 2);
      }
      return offsets;
    }, [metrics]);

    // Static: clip rect at x=0 relative to group origin
    const clipRect = useMemo(
      () =>
        rect(
          0,
          baseY + metrics.ascent,
          metrics.maxDigitWidth,
          metrics.lineHeight,
        ),
      [baseY, metrics],
    );

    const opacityPaint = useMemo(
      () => <Paint opacity={slotOpacity} />,
      [slotOpacity],
    );

    // ── 10 digit elements with per-digit positioning ──────────────
    // Each digit gets its own Group transform driven by the position
    // reaction. Only 10 elements needed (vs 30 with the copy approach).
    // The useMemo creates stable JSX — shared values drive the animation.
    const digitElements = useMemo(
      () =>
        Array.from({ length: DIGIT_COUNT }, (_, n) => (
          <Group key={n} transform={digitYTransforms[n]}>
            <SkiaText
              color={color}
              font={font}
              text={DIGIT_STRINGS[n]}
              x={digitXOffsets[n]}
              y={baseY}
            />
          </Group>
        )),
      [baseY, color, font, digitXOffsets, digitYTransforms],
    );

    return (
      <Group layer={opacityPaint} transform={groupTransform}>
        <Group clip={clipRect}>{digitElements}</Group>
      </Group>
    );
  },
);

DigitSlot.displayName = "DigitSlot";
