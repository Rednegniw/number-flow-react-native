import type { SkFont } from "@shopify/react-native-skia";
import type { ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { AnimationConfig, TextAlign, Trend } from "../core/types";
import type { NumberFlowStyle } from "./types";

export interface TimeFlowProps extends AnimationConfig {
  /** Hours value (0-23). Omit to hide the hours segment (countdown MM:SS mode). */
  hours?: number;
  /** Minutes value (0-59). Always required. */
  minutes: number;
  /** Seconds value (0-59). Omit to hide the seconds segment. */
  seconds?: number;

  /** Unix timestamp in ms. Extracts hours/minutes/seconds automatically. */
  timestamp?: number;
  /** Timezone offset in ms for timestamp mode. */
  timezoneOffset?: number;

  /** Worklet-driven pre-formatted time string (e.g. "14:30", "2:30 PM"). */
  formattedValue?: SharedValue<string>;

  /** Use 24-hour format. Default: true. Only applies when hours are shown. */
  is24Hour?: boolean;
  /** Pad hours with leading zero. Default: true. "09:30" vs "9:30". */
  padHours?: boolean;

  style: NumberFlowStyle;
  textAlign?: TextAlign;
  containerStyle?: ViewStyle;
  trend?: Trend;
}

export interface SkiaTimeFlowProps extends AnimationConfig {
  hours?: number;
  minutes: number;
  seconds?: number;

  timestamp?: number;
  timezoneOffset?: number;

  formattedValue?: SharedValue<string>;

  is24Hour?: boolean;
  padHours?: boolean;

  font: SkFont | null;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  textAlign?: TextAlign;
  opacity?: SharedValue<number>;
  trend?: Trend;
}
