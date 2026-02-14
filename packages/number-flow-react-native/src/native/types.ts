import type { TextStyle, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { AnimationConfig, DigitsProp, TextAlign, TrendProp } from "../core/types";

/** Text style for NumberFlow/TimeFlow. Requires fontSize; fontFamily defaults to the system font when omitted. */
export type NumberFlowStyle = TextStyle & {
  fontSize: number;
};

/** Value props — mutually exclusive: provide `value` (JS-driven) or `sharedValue` (worklet-driven), not both. */
type NumberFlowValueProps =
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

interface NumberFlowBaseProps extends AnimationConfig {
  /** Text styling. fontSize is required; fontFamily defaults to the platform system font. */
  style: NumberFlowStyle;
  /** Text alignment. Defaults to "left". */
  textAlign?: TextAlign;
  /** Static string prepended before the number */
  prefix?: string;
  /** Static string appended after the number */
  suffix?: string;

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

  /**
   * Per-position digit constraints. Maps integer position (0=ones, 1=tens, ...)
   * to { max: N } where N is the highest digit value (inclusive).
   * Example: { 1: { max: 5 } } for a wheel where tens go 0-5.
   */
  digits?: DigitsProp;

  /** Enable edge gradient fade masking on digit slots. Requires @rednegniw/masked-view. Defaults to true. */
  mask?: boolean;

  /** Called when update animations begin */
  onAnimationsStart?: () => void;
  /** Called when all update animations complete */
  onAnimationsFinish?: () => void;

  /** Style applied to the outer container View */
  containerStyle?: ViewStyle;
}

/** Props for NumberFlow. Accessibility is built-in: accessibilityRole="text" and accessibilityLabel are set automatically. */
export type NumberFlowProps = NumberFlowBaseProps & NumberFlowValueProps;
