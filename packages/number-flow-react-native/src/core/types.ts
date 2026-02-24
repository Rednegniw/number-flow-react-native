import type { SkFont } from "@shopify/react-native-skia";
import type { EasingFunction, SharedValue } from "react-native-reanimated";

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
  /** Font ascent (negative value — distance above baseline) */
  ascent: number;
  /** Font descent (positive value — distance below baseline) */
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

/** Value props — mutually exclusive: provide `value` (JS-driven) or `sharedValue` (worklet-driven), not both. */
type SkiaNumberFlowValueProps =
  | {
      /** JS-thread numeric value. Mutually exclusive with sharedValue. */
      value: number;
      /** Intl.NumberFormatOptions for value formatting */
      format?: Intl.NumberFormatOptions;
      /** Locale(s) for Intl.NumberFormat */
      locales?: Intl.LocalesArgument;
      sharedValue?: never;
    }
  | {
      value?: never;
      format?: never;
      locales?: never;
      /** Worklet-driven pre-formatted string. Mutually exclusive with value. */
      sharedValue: SharedValue<string>;
    };

interface SkiaNumberFlowBaseProps extends AnimationBehaviorProps {
  /** Force equal-width digits using percentile-based interpolation between min and max digit widths. Equivalent to `fontVariant: ['tabular-nums']` on native components. */
  tabularNums?: boolean;

  /** SkFont instance from useFont(). Required — renders empty until font loads. */
  font: SkFont | null;
  /** Text color (Skia color string). Defaults to "#000000". */
  color?: string;
  /** X position within the Canvas. Defaults to 0. */
  x?: number;
  /** Y position within the Canvas (baseline). Defaults to 0. */
  y?: number;
  /** Available width for alignment calculations. Defaults to 0. */
  width?: number;
  /** Text alignment within the available width. Defaults to "start" (left in LTR, right in RTL). Accepts "start"/"end" for direction-aware alignment. */
  textAlign?: TextAlign;
  /** Overrides automatic RTL detection from I18nManager.isRTL. Omit to follow the system setting. In sharedValue/scrubbing mode, controls alignment only (bidi visual reordering requires value mode, since the SharedValue string lacks the bidi marks that Intl.NumberFormat embeds). */
  direction?: Direction;
  /** Static string prepended before the number */
  prefix?: string;
  /** Static string appended after the number */
  suffix?: string;
  /** Parent opacity (SharedValue for animation coordination) */
  opacity?: SharedValue<number>;

  /**
   * Per-position digit constraints. Maps integer position (0=ones, 1=tens, ...)
   * to { max: N } where N is the highest digit value (inclusive).
   * Example: { 1: { max: 5 } } for a wheel where tens go 0-5.
   */
  digits?: DigitsProp;

  /**
   * Controls digit width during worklet-driven scrubbing (when sharedValue is active).
   * Value between 0 and 1 representing the percentile between min and max digit width.
   * - 0: use narrowest digit width (tightest, may clip wide digits)
   * - 0.5: use average digit width
   * - 1: use widest digit width (no clipping, but wider spacing)
   * Defaults to 0.75 (75th percentile) for a good balance.
   * Only affects digits; symbols like "." keep their natural width.
   */
  scrubDigitWidthPercentile?: number;
}

/**
 * Props for SkiaNumberFlow.
 * Value changes are auto-announced for screen reader users.
 * For VoiceOver/TalkBack focus-based reading, set `accessibilityLabel` on the parent Canvas.
 */
export type SkiaNumberFlowProps = SkiaNumberFlowBaseProps & SkiaNumberFlowValueProps;
