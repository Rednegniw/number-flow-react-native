import type { EasingFunction } from "react-native-reanimated";

export interface TimingConfig {
  /** Duration in milliseconds */
  duration: number;
  /** Easing function (t: 0→1) => 0→1 */
  easing: EasingFunction;
}

export interface AnimationConfig {
  /** Timing for layout transforms (position, width changes). Defaults to NumberFlow's 900ms deceleration curve. */
  transformTiming?: TimingConfig;
  /** Timing for digit spin/rolling. Falls back to transformTiming if unset. */
  spinTiming?: TimingConfig;
  /** Timing for enter/exit opacity. Defaults to 450ms ease-out. */
  opacityTiming?: TimingConfig;
}

/**
 * Controls digit spin direction:
 * - `1`: always spin upward
 * - `-1`: always spin downward
 * - `0`: each digit takes the shortest path
 */
export type Trend = -1 | 0 | 1;

/**
 * Trend prop accepted by components: either a static direction
 * or a function that receives (prevValue, nextValue) and returns the direction.
 */
export type TrendProp = Trend | ((prev: number, next: number) => Trend);

/**
 * Animation behavior props shared by all Flow components (NumberFlow, TimeFlow,
 * SkiaNumberFlow, SkiaTimeFlow). Controls how digit transitions behave.
 */
export interface AnimationBehaviorProps extends AnimationConfig {
  /**
   * Digit spin direction. When omitted, auto-detects from value changes:
   * increasing values spin up, decreasing spin down.
   * Pass `0` explicitly for shortest-path per-digit behavior.
   */
  trend?: TrendProp;

  /** Set to false to disable animations and update instantly. Defaults to true. */
  animated?: boolean;

  /** When true (default), disables animations when the device's "Reduce Motion" setting is on. */
  respectMotionPreference?: boolean;

  /**
   * When true, unchanged lower-significance digits spin through a full cycle
   * during transitions, making the number appear to pass through intermediate values.
   * Defaults to false.
   */
  continuous?: boolean;

  /** Enable edge gradient fade masking on digit slots. Defaults to true. */
  mask?: boolean;

  /** Called when update animations begin */
  onAnimationsStart?: () => void;

  /** Called when all update animations complete */
  onAnimationsFinish?: () => void;
}

/** A single character with a stable key from formatToParts RTL/LTR keying */
export interface KeyedPart {
  /** Stable key: "integer:0" (ones), "integer:1" (tens), "fraction:0" (tenths), "decimal:0", etc. */
  key: string;
  /** Whether this is a rolling digit or a static symbol */
  type: "digit" | "symbol";
  /** The display character */
  char: string;
  /** 0-9 for digits, -1 for symbols */
  digitValue: number;
}

export function digitPart(key: string, value: number): KeyedPart {
  return { key, type: "digit", char: String(value), digitValue: value };
}

export function symbolPart(key: string, char: string): KeyedPart {
  return { key, type: "symbol", char, digitValue: -1 };
}

export interface GlyphMetrics {
  /** Advance width for each measurable character */
  charWidths: Record<string, number>;
  /** Maximum width among digits 0-9 (used for uniform digit slot sizing) */
  maxDigitWidth: number;
  /** Line height computed from font metrics: ceil(descent - ascent) */
  lineHeight: number;
  /** Font ascent (negative value, distance above baseline) */
  ascent: number;
  /** Font descent (positive value, distance below baseline) */
  descent: number;
  /**
   * Per-character tight vertical bounds relative to the baseline.
   * `top` is negative (above baseline), `bottom` is positive (below baseline).
   * Used by the adaptive mask to avoid fading into visible glyph content.
   */
  charBounds: Record<string, { top: number; bottom: number }>;
}

export type TextAlign = "left" | "right" | "center" | "start" | "end";

// Concrete text alignment after resolving "start"/"end" based on direction
export type ResolvedTextAlign = "left" | "right" | "center";

/**
 * Layout direction for RTL support.
 * - "ltr": force left-to-right
 * - "rtl": force right-to-left
 * - "auto": read from I18nManager.isRTL (same as omitting the prop)
 */
export type Direction = "ltr" | "rtl" | "auto";

/**
 * Per-position digit constraint. `max` defines the highest value the
 * digit can display (inclusive), creating a wheel of (max + 1) values.
 * Example: { max: 5 } creates a 0-5 wheel (6 elements).
 */
export interface DigitConstraint {
  max: number;
}

/**
 * Maps integer positions to their constraints.
 * Position 0 = ones, 1 = tens, 2 = hundreds, etc.
 * Positions not listed default to { max: 9 } (standard 0-9 wheel).
 */
export type DigitsProp = Record<number, DigitConstraint>;
