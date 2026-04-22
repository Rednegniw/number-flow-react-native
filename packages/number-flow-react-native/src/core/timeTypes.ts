import type { ViewStyle } from "react-native";
import type { NumberFlowStyle } from "../native/types";
import type { AnimationBehaviorProps, Direction } from "./types";

interface TimeFlowBaseProps extends AnimationBehaviorProps {
  /** Use 24-hour format. Default: true. Only applies when hours are shown. */
  is24Hour?: boolean;
  /** Pad hours with leading zero. Default: true. "09:30" vs "9:30". */
  padHours?: boolean;

  /** Text styling. fontSize defaults to 16 when omitted; fontFamily defaults to the platform system font. textAlign defaults to "start" (left in LTR, right in RTL). */
  style?: NumberFlowStyle;
  /** Overrides automatic RTL detection from I18nManager.isRTL. Omit to follow the system setting. Controls text alignment only; bidi visual reordering of characters applies to NumberFlow/SkiaNumberFlow, not TimeFlow. */
  direction?: Direction;
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
  /** Centiseconds value (0-99). Omit to hide. Requires seconds to be set. Displayed as ".CC" after seconds. */
  centiseconds?: number;
  /** Unix timestamp in ms. Extracts hours/minutes/seconds automatically. Takes priority over direct values. */
  timestamp?: number;
  /** Timezone offset in ms for timestamp mode. */
  timezoneOffset?: number;
}

/** Props for TimeFlow. Accessibility is built-in: accessibilityRole="text" and accessibilityLabel are set automatically. */
export type TimeFlowProps = TimeFlowBaseProps & TimeFlowValueProps;
