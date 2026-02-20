import type { SkFont } from "@shopify/react-native-skia";
import type { ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { NumberFlowStyle } from "../native/types";
import type { AnimationBehaviorProps, TextAlign } from "./types";

interface TimeFlowBaseProps extends AnimationBehaviorProps {
  /** Use 24-hour format. Default: true. Only applies when hours are shown. */
  is24Hour?: boolean;
  /** Pad hours with leading zero. Default: true. "09:30" vs "9:30". */
  padHours?: boolean;

  /** Text styling. fontSize defaults to 16 when omitted; fontFamily defaults to the platform system font. textAlign defaults to "left". */
  style?: NumberFlowStyle;
  /** Style applied to the outer container View */
  containerStyle?: ViewStyle;
}

interface TimeFlowValueProps {
  /** Hours value (0-23). Omit to hide the hours segment (countdown MM:SS mode). */
  hours?: number;
  /** Minutes value (0-59). Required. */
  minutes: number;
  /** Seconds value (0-59). Omit to hide the seconds segment. */
  seconds?: number;
  /** Unix timestamp in ms. Extracts hours/minutes/seconds automatically. Takes priority over direct values. */
  timestamp?: number;
  /** Timezone offset in ms for timestamp mode. */
  timezoneOffset?: number;
}

/** Props for TimeFlow. Accessibility is built-in: accessibilityRole="text" and accessibilityLabel are set automatically. */
export type TimeFlowProps = TimeFlowBaseProps & TimeFlowValueProps;

interface SkiaTimeFlowBaseProps extends AnimationBehaviorProps {
  /** Use 24-hour format. Default: true. Only applies when hours are shown. */
  is24Hour?: boolean;
  /** Pad hours with leading zero. Default: true. "09:30" vs "9:30". */
  padHours?: boolean;

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
  /** Text alignment within the available width. Defaults to "left". */
  textAlign?: TextAlign;
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
