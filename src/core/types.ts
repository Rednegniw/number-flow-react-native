import type { SkFont } from "@shopify/react-native-skia";
import type { EasingFunction, SharedValue } from "react-native-reanimated";

// ─── Animation Configuration ───────────────────────────────────────────────────

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

// ─── Trend ─────────────────────────────────────────────────────────────────────

/**
 * Controls digit spin direction:
 * - Positive (e.g. 1): always spin upward
 * - Negative (e.g. -1): always spin downward
 * - 0: auto, each digit takes the shortest path
 */
export type Trend = number;

// ─── Keyed Parts (from formatToParts) ─────────────────────────────────────────

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

// ─── Slot System ───────────────────────────────────────────────────────────────

export type SlotType = "digit" | "symbol";
export type SlotState = "continuing" | "entering" | "exiting" | "idle";

export interface SlotAssignment {
  /** Stable key for this character position (e.g. "int:0", "frac:1", "decimal:0") */
  key: string;
  /** Whether this is a rolling digit or a static symbol */
  type: SlotType;
  /** The character to display ("7", ".", "%", ",", "$", etc.) */
  char: string;
  /** 0-9 for digits, -1 for symbols */
  digitValue: number;
  /** Previous digit value, for computing roll delta. -1 if entering. */
  prevDigitValue: number;
  /** Computed x offset from the left edge of the component */
  xPosition: number;
  /** Current state of this slot in the animation lifecycle */
  state: SlotState;
}

/** Shared values for a single slot in the fixed pool */
export interface SlotSharedValues {
  /** Cumulative digit roll offset (translateY for the digit stack) */
  logicalOffset: SharedValue<number>;
  /** Horizontal position */
  slotX: SharedValue<number>;
  /** Visibility (0 = hidden, 1 = visible) */
  slotOpacity: SharedValue<number>;
  /** Enter/exit vertical slide offset */
  enterExitY: SharedValue<number>;
  /** Current character for symbol slots */
  charValue: SharedValue<string>;
}

// ─── Glyph Metrics ─────────────────────────────────────────────────────────────

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
}

// ─── Component Props ───────────────────────────────────────────────────────────

export type TextAlign = "left" | "right" | "center";

export interface SkiaNumberFlowProps extends AnimationConfig {
  // --- Value input (pick one) ---
  /** JS-thread numeric value. Mutually exclusive with formattedValue. */
  value?: number;
  /** Intl.NumberFormatOptions for value formatting */
  format?: Intl.NumberFormatOptions;
  /** Locale(s) for Intl.NumberFormat */
  locales?: Intl.LocalesArgument;
  /** Worklet-driven pre-formatted string. Mutually exclusive with value. */
  formattedValue?: SharedValue<string>;

  // --- Display ---
  /** SkFont instance from useFont(). Required. */
  font: SkFont | null;
  /** Text color (Skia color string) */
  color?: string;
  /** X position within the Canvas */
  x?: number;
  /** Y position within the Canvas (baseline) */
  y?: number;
  /** Available width for alignment calculations */
  width?: number;
  /** Text alignment within the available width */
  textAlign?: TextAlign;
  /** Static string prepended before the number */
  prefix?: string;
  /** Static string appended after the number */
  suffix?: string;
  /** Parent opacity (SharedValue for animation coordination) */
  opacity?: SharedValue<number>;

  // --- Animation ---
  /**
   * Digit spin direction:
   * - Positive (e.g. 1): always spin upward
   * - Negative (e.g. -1): always spin downward
   * - 0: auto, each digit takes the shortest path
   */
  trend?: Trend;
  /** Set to false to disable animations and update instantly */
  animated?: boolean;

  // --- Scrubbing behavior ---
  /**
   * Controls digit width during worklet-driven scrubbing (when formattedValue is active).
   * Value between 0 and 1 representing the percentile between min and max digit width.
   * - 0: use narrowest digit width (tightest, may clip wide digits)
   * - 0.5: use average digit width
   * - 1: use widest digit width (no clipping, but wider spacing)
   * Defaults to 0.75 (75th percentile) for a good balance.
   * Only affects digits; symbols like "." keep their natural width.
   */
  scrubDigitWidthPercentile?: number;

  // --- Events ---
  /** Called when update animations begin */
  onAnimationsStart?: () => void;
  /** Called when all update animations complete */
  onAnimationsFinish?: () => void;
}

export interface SkiaNumberFlowStandaloneProps extends Omit<
  SkiaNumberFlowProps,
  "font" | "x" | "y" | "opacity"
> {
  /** Font source (require path) */
  fontSource: number;
  /** Font size in points */
  fontSize: number;
  /** Container style */
  style?: { width?: number; height?: number };
}
