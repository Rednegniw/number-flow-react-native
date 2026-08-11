import type { SkFont } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import type { AnimationBehaviorProps, DigitsProp, Direction, TextAlign } from "../core/types";

/** Value props, mutually exclusive: provide `value` (JS-driven) or `sharedValue` (worklet-driven), not both. */
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

  /** SkFont instance from useFont(). Required; renders empty until font loads. */
  font: SkFont | null;
  /** Text color. Accepts a static string or a SharedValue for animated color transitions. Defaults to "#000000". */
  color?: string | SharedValue<string>;
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

interface SkiaTimeFlowBaseProps extends AnimationBehaviorProps {
  /** Use 24-hour format. Default: true. Only applies when hours are shown. */
  is24Hour?: boolean;
  /** Pad hours with leading zero. Default: true. "09:30" vs "9:30". */
  padHours?: boolean;

  /** Force equal-width digits using percentile-based interpolation between min and max digit widths. Equivalent to `fontVariant: ['tabular-nums']` on native components. */
  tabularNums?: boolean;

  /** SkFont instance from useFont(). Required; renders empty until font loads. */
  font: SkFont | null;
  /** Text color. Accepts a static string or a SharedValue for animated color transitions. Defaults to "#000000". */
  color?: string | SharedValue<string>;
  /** X position within the Canvas. Defaults to 0. */
  x?: number;
  /** Y position within the Canvas (baseline). Defaults to 0. */
  y?: number;
  /** Available width for alignment calculations. Defaults to 0. */
  width?: number;
  /** Text alignment within the available width. Defaults to "start" (left in LTR, right in RTL). Accepts "start"/"end" for direction-aware alignment. */
  textAlign?: TextAlign;
  /** Overrides automatic RTL detection from I18nManager.isRTL. Omit to follow the system setting. Controls text alignment only; bidi visual reordering of characters applies to NumberFlow/SkiaNumberFlow, not SkiaTimeFlow. */
  direction?: Direction;
  /** Parent opacity (SharedValue for animation coordination) */
  opacity?: SharedValue<number>;
}

type SkiaTimeFlowValueProps =
  | {
      /** Hours value (0-23). Omit to hide the hours segment. */
      hours?: number;
      /** Minutes value (0-59). Required when using direct time values. */
      minutes: number;
      /** Seconds value (0-59). Omit to hide the seconds segment. */
      seconds?: number;
      /** Centiseconds value (0-99). Omit to hide. Requires seconds to be set. Displayed as ".CC" after seconds. */
      centiseconds?: number;
      /** Unix timestamp in ms. Extracts hours/minutes/seconds automatically. */
      timestamp?: number;
      /** Timezone offset in ms for timestamp mode. */
      timezoneOffset?: number;
      sharedValue?: never;
    }
  | {
      hours?: never;
      minutes?: never;
      seconds?: never;
      centiseconds?: never;
      timestamp?: never;
      timezoneOffset?: never;
      /** Worklet-driven pre-formatted time string (e.g. "14:30", "2:30 PM"). */
      sharedValue: SharedValue<string>;
    };

/**
 * Props for SkiaTimeFlow.
 * Value changes are auto-announced for screen reader users.
 * For VoiceOver/TalkBack focus-based reading, set `accessibilityLabel` on the parent Canvas.
 */
export type SkiaTimeFlowProps = SkiaTimeFlowBaseProps & SkiaTimeFlowValueProps;
