export { detectNumberingSystem, getDigitStrings, getZeroCodePoint } from "./core/numerals";
export type { SkiaTimeFlowProps, TimeFlowProps } from "./core/timeTypes";
export type {
  AnimationConfig,
  DigitConstraint,
  DigitsProp,
  SkiaNumberFlowProps,
  TextAlign,
  TimingConfig,
  Trend,
  TrendProp,
} from "./core/types";
export { useCanAnimate } from "./core/useCanAnimate";
export { useFormattedValue } from "./core/useFormattedValue";
export { NumberFlow, TimeFlow } from "./native";
export type { NumberFlowProps, NumberFlowStyle } from "./native/types";
export { SkiaNumberFlow, SkiaTimeFlow, useSkiaFont } from "./skia";
