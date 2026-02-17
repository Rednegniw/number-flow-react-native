import type { ComponentType } from "react";

export interface DemoEntry {
  key: string;
  title: string;
  description: string;
  supportsSkia: boolean;
  NativeComponent: ComponentType;
  SkiaComponent?: ComponentType;
}

export const DEMO_REGISTRY: DemoEntry[] = [
  {
    key: "performance",
    title: "Mount Performance",
    description:
      "Compare mount-to-visible time between plain Text and NumberFlow. Tap 'Run Mount Test' to mount both simultaneously and measure the time each takes to become visible.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/PerformanceDemo").PerformanceDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/PerformanceDemo").PerformanceDemoSkia;
    },
  },
  {
    key: "scrubbing",
    title: "Scrubbing",
    description:
      "Drag a slider to update digits in real-time. Skia uses sharedValue for zero-latency UI-thread updates.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/ScrubbingDemo").ScrubbingDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/ScrubbingDemo").ScrubbingDemoSkia;
    },
  },
  {
    key: "numerals",
    title: "Numeral Systems",
    description:
      "Animated transitions across 9 numeral systems — Arabic-Indic, Bengali, Devanagari, Thai, and more.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/NumeralsDemo").NumeralsDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/NumeralsDemo").NumeralsDemoSkia;
    },
  },
  {
    key: "scientific",
    title: "Scientific Notation",
    description: "Scientific and engineering notation with animated superscript exponents.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/ScientificDemo").ScientificDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/ScientificDemo").ScientificDemoSkia;
    },
  },
  {
    key: "continuous",
    title: "Continuous Mode",
    description:
      "Compare default digit-by-digit rolling vs continuous mode where all digits animate together.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/ContinuousDemo").ContinuousDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/ContinuousDemo").ContinuousDemoSkia;
    },
  },
  {
    key: "continuous-time",
    title: "Continuous Time",
    description:
      "TimeFlow with continuous mode — compare default vs continuous rolling on time values.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/ContinuousTimeDemo").ContinuousTimeDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/ContinuousTimeDemo").ContinuousTimeDemoSkia;
    },
  },
  {
    key: "decimal",
    title: "Decimal",
    description: "Animated decimal number with prefix/suffix support and randomized values.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/DecimalDemo").DecimalDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/DecimalDemo").DecimalDemoSkia;
    },
  },
  {
    key: "integer",
    title: "Integer",
    description: "Large integers with grouping separators, prefix, and suffix animations.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/IntegerDemo").IntegerDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/IntegerDemo").IntegerDemoSkia;
    },
  },
  {
    key: "small-decimal",
    title: "Small Decimal",
    description: "High-precision small decimals (4 fraction digits) with suffix animations.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/SmallDecimalDemo").SmallDecimalDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/SmallDecimalDemo").SmallDecimalDemoSkia;
    },
  },
  {
    key: "clock-24h",
    title: "24h Clock",
    description: "TimeFlow in 24-hour format with increment and randomize controls.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/Clock24hDemo").Clock24hDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/Clock24hDemo").Clock24hDemoSkia;
    },
  },
  {
    key: "clock-12h",
    title: "12h / 24h Toggle",
    description: "Toggle between 12-hour and 24-hour display with AM/PM indicator animations.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/Clock12hDemo").Clock12hDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/Clock12hDemo").Clock12hDemoSkia;
    },
  },
  {
    key: "countdown",
    title: "Countdown",
    description: "A countdown timer with start/pause/reset controls and downward trend animation.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/CountdownDemo").CountdownDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/CountdownDemo").CountdownDemoSkia;
    },
  },
  {
    key: "full-clock",
    title: "Live Clock",
    description: "Real-time clock showing hours, minutes, and seconds with 12h/24h toggle.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/FullClockDemo").FullClockDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/FullClockDemo").FullClockDemoSkia;
    },
  },
  {
    key: "edge-case",
    title: "Edge Cases",
    description: "Test tricky time transitions: 9:59→10:00, 11:59AM→12:00PM, 23:59→0:00.",
    supportsSkia: true,
    get NativeComponent() {
      return require("../demos/EdgeCaseDemo").EdgeCaseDemoNative;
    },
    get SkiaComponent() {
      return require("../demos/EdgeCaseDemo").EdgeCaseDemoSkia;
    },
  },
];
