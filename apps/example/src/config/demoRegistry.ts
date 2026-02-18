import type { ComponentType } from "react";

export interface DemoEntry {
  key: string;
  title: string;
  description: string;
  NativeComponent: ComponentType;
  SkiaComponent: ComponentType;
}

export interface DemoSection {
  title: string;
  data: DemoEntry[];
}

export const DEMO_SECTIONS: DemoSection[] = [
  {
    title: "Getting Started",
    data: [
      {
        key: "numbers",
        title: "Numbers",
        description:
          "Animated numbers with grouping, decimals, and high precision. Toggle between integer, decimal, and high-precision modes.",
        get NativeComponent() {
          return require("../demos/NumbersDemo").NumbersDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/NumbersDemo").NumbersDemoSkia;
        },
      },
      {
        key: "clock",
        title: "Clock",
        description:
          "TimeFlow with increment, randomize, and 12h/24h toggle. Demonstrates animated time transitions.",
        get NativeComponent() {
          return require("../demos/ClockDemo").ClockDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/ClockDemo").ClockDemoSkia;
        },
      },
      {
        key: "full-clock",
        title: "Live Clock",
        description: "Real-time clock showing hours, minutes, and seconds with 12h/24h toggle.",
        get NativeComponent() {
          return require("../demos/FullClockDemo").FullClockDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/FullClockDemo").FullClockDemoSkia;
        },
      },
    ],
  },
  {
    title: "Animation Modes",
    data: [
      {
        key: "continuous",
        title: "Continuous Mode",
        description:
          "Compare default digit-by-digit rolling vs continuous mode for both NumberFlow and TimeFlow.",
        get NativeComponent() {
          return require("../demos/ContinuousDemo").ContinuousDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/ContinuousDemo").ContinuousDemoSkia;
        },
      },
      {
        key: "countdown",
        title: "Countdown",
        description:
          "A countdown timer with start/pause/reset controls and downward trend animation.",
        get NativeComponent() {
          return require("../demos/CountdownDemo").CountdownDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/CountdownDemo").CountdownDemoSkia;
        },
      },
      {
        key: "scrubbing",
        title: "Scrubbing",
        description:
          "Drag a slider to update digits in real-time. Skia uses sharedValue for zero-latency UI-thread updates.",
        get NativeComponent() {
          return require("../demos/ScrubbingDemo").ScrubbingDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/ScrubbingDemo").ScrubbingDemoSkia;
        },
      },
    ],
  },
  {
    title: "Formatting",
    data: [
      {
        key: "scientific",
        title: "Scientific Notation",
        description: "Scientific and engineering notation with animated superscript exponents.",
        get NativeComponent() {
          return require("../demos/ScientificDemo").ScientificDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/ScientificDemo").ScientificDemoSkia;
        },
      },
      {
        key: "numerals",
        title: "Numeral Systems",
        description:
          "Animated transitions across 9 numeral systems — Arabic-Indic, Bengali, Devanagari, Thai, and more.",
        get NativeComponent() {
          return require("../demos/NumeralsDemo").NumeralsDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/NumeralsDemo").NumeralsDemoSkia;
        },
      },
    ],
  },
  {
    title: "Developer Tools",
    data: [
      {
        key: "performance",
        title: "Mount Performance",
        description:
          "Compare mount-to-visible time between plain Text and NumberFlow. Tap 'Run Mount Test' to mount both simultaneously and measure the time each takes to become visible.",
        get NativeComponent() {
          return require("../demos/PerformanceDemo").PerformanceDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/PerformanceDemo").PerformanceDemoSkia;
        },
      },
      {
        key: "edge-case",
        title: "Edge Cases",
        description: "Test tricky time transitions: 9:59→10:00, 11:59AM→12:00PM, 23:59→0:00.",
        get NativeComponent() {
          return require("../demos/EdgeCaseDemo").EdgeCaseDemoNative;
        },
        get SkiaComponent() {
          return require("../demos/EdgeCaseDemo").EdgeCaseDemoSkia;
        },
      },
    ],
  },
];

export function findDemoEntry(key: string): DemoEntry | undefined {
  for (const section of DEMO_SECTIONS) {
    const entry = section.data.find((d) => d.key === key);
    if (entry) return entry;
  }
  return undefined;
}
