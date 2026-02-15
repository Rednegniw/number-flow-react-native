export { SkiaNumberFlow } from "./skia";
export { SkiaTimeFlow } from "./skia";
export { NumberFlow } from "./native";
export { TimeFlow } from "./native";
export { useFormattedValue } from "./core/useFormattedValue";
export { useCanAnimate } from "./core/useCanAnimate";

export type {
  SkiaNumberFlowProps,
  GlyphMetrics,
  TimingConfig,
  AnimationConfig,
  TextAlign,
  Trend,
  TrendProp,
  DigitConstraint,
  DigitsProp,
  KeyedPart,
} from "./core/types";

export type { NumberFlowProps, NumberFlowStyle } from "./native/types";
export type { TimeFlowProps, SkiaTimeFlowProps } from "./core/timeTypes";
