import type { TextStyle, ViewStyle } from "react-native";
import type { AnimationBehaviorProps, DigitsProp } from "../core/types";

/** Text style for NumberFlow/TimeFlow. */
export type NumberFlowStyle = TextStyle;

interface NumberFlowValueProps {
  /** Numeric value to display */
  value: number;
  /** Intl.NumberFormatOptions for value formatting */
  format?: Intl.NumberFormatOptions;
  /** Locale(s) for Intl.NumberFormat */
  locales?: Intl.LocalesArgument;
}

interface NumberFlowBaseProps extends AnimationBehaviorProps {
  /** Text styling. fontSize defaults to 16 when omitted; fontFamily defaults to the platform system font. textAlign defaults to "left". */
  style?: NumberFlowStyle;
  /** Static string prepended before the number */
  prefix?: string;
  /** Static string appended after the number */
  suffix?: string;

  /**
   * Per-position digit constraints. Maps integer position (0=ones, 1=tens, ...)
   * to { max: N } where N is the highest digit value (inclusive).
   * Example: { 1: { max: 5 } } for a wheel where tens go 0-5.
   */
  digits?: DigitsProp;

  /** Style applied to the outer container View */
  containerStyle?: ViewStyle;
}

/** Props for NumberFlow. Accessibility is built-in: accessibilityRole="text" and accessibilityLabel are set automatically. */
export type NumberFlowProps = NumberFlowBaseProps & NumberFlowValueProps;
