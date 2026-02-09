import type { ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { AnimationConfig, TextAlign, Trend } from "../core/types";

export interface NumberFlowStyle {
  fontFamily: string;
  fontSize: number;
  color?: string;
}

export interface NumberFlowProps extends AnimationConfig {
  value?: number;
  format?: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
  formattedValue?: SharedValue<string>;
  style: NumberFlowStyle;
  textAlign?: TextAlign;
  prefix?: string;
  suffix?: string;
  trend?: Trend;
  containerStyle?: ViewStyle;
}
