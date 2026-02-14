# number-flow-react-native

Animated number transitions for React Native, inspired by [NumberFlow](https://number-flow.barvian.me/) by [Maxwell Barvian](https://github.com/barvian).

Each digit rolls independently to its target value using a virtual wheel — no copies, no springs, just precise modular arithmetic. Digits enter and exit with smooth opacity and slide animations.

Two rendering backends:

- **View-based** (`NumberFlow`, `TimeFlow`) — uses React Native `Animated.View` + Reanimated. Works everywhere.
- **Skia** (`SkiaNumberFlow`, `SkiaTimeFlow`) — renders inside a `@shopify/react-native-skia` Canvas. Ideal for charts and complex UIs where you're already using Skia.

## Features

- Smooth digit rolling with automatic direction detection (or manual control)
- Automatic `Intl.NumberFormat` support (currencies, percentages, grouping, locales)
- `TimeFlow` component for HH:MM:SS displays with 12h/24h support
- Worklet-driven scrubbing — update digits from the UI thread with zero bridge latency
- Enter/exit animations when digits are added or removed (e.g. 9 → 10)
- Prefix and suffix support (e.g. `$`, `%`, `mg`)
- Accessibility support (screen reader labels + announcements)
- Respects reduced motion preferences
- Hermes `formatToParts()` fallback for engines that lack it
- StrictMode safe

## Installation

```bash
npm install number-flow-react-native
# or
yarn add number-flow-react-native
# or
bun add number-flow-react-native
```

### Peer dependencies

**Required:**

```bash
npm install react-native-reanimated
```

[react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) >= 3.0.0 is required. Follow their [installation guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) if you don't have it set up.

**Optional (for Skia components):**

```bash
npm install @shopify/react-native-skia
```

[@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) >= 2.0.0 is only needed if you use `SkiaNumberFlow` or `SkiaTimeFlow`.

## Usage

### NumberFlow (View-based)

```tsx
import { NumberFlow } from "number-flow-react-native/native";

<NumberFlow
  value={1234.56}
  format={{ minimumFractionDigits: 2 }}
  style={{ fontSize: 32, color: "#000" }}
  prefix="$"
  containerStyle={{ width: 200 }}
  textAlign="center"
/>;
```

### TimeFlow (View-based)

```tsx
import { TimeFlow } from "number-flow-react-native/native";

<TimeFlow
  hours={14}
  minutes={30}
  seconds={45}
  is24Hour={true}
  style={{ fontSize: 48, color: "#000" }}
  containerStyle={{ width: 200 }}
/>;
```

### SkiaNumberFlow (Skia)

```tsx
import { Canvas, useFont } from "@shopify/react-native-skia";
import { SkiaNumberFlow } from "number-flow-react-native/skia";

const font = useFont(require("./Inter-Bold.otf"), 32);

<Canvas style={{ width: 200, height: 40 }}>
  <SkiaNumberFlow
    value={42.5}
    format={{ minimumFractionDigits: 1 }}
    font={font}
    color="#000"
    x={0}
    y={32}
    width={200}
    textAlign="right"
    suffix="%"
  />
</Canvas>;
```

### SkiaTimeFlow (Skia)

```tsx
import { Canvas, useFont } from "@shopify/react-native-skia";
import { SkiaTimeFlow } from "number-flow-react-native/skia";

const font = useFont(require("./Inter-Bold.otf"), 48);

<Canvas style={{ width: 200, height: 56 }}>
  <SkiaTimeFlow
    hours={9}
    minutes={30}
    font={font}
    color="#000"
    x={0}
    y={48}
    is24Hour={false}
    padHours={false}
  />
</Canvas>;
```

### Worklet-driven scrubbing

For chart interactions where you need zero-latency updates from the UI thread:

```tsx
import { useSharedValue } from "react-native-reanimated";
import { SkiaNumberFlow } from "number-flow-react-native/skia";

const scrubbedValue = useSharedValue("");

// In a gesture handler or animation callback:
// scrubbedValue.value = "1,234.56";

<SkiaNumberFlow
  sharedValue={scrubbedValue}
  font={font}
  color="#000"
  // ...
/>;
```

When `sharedValue` is provided, digits update directly on the UI thread without crossing the JS bridge.

## API

### NumberFlow Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | — | Numeric value to display |
| `format` | `Intl.NumberFormatOptions` | — | Number format options |
| `locales` | `Intl.LocalesArgument` | — | Locale(s) for formatting |
| `sharedValue` | `SharedValue<string>` | — | Worklet-driven pre-formatted string |
| `style` | `{ fontSize, fontFamily?, color?, ... }` | — | **Required.** Text styling (`fontSize` required) |
| `textAlign` | `"left" \| "right" \| "center"` | `"left"` | Text alignment |
| `prefix` | `string` | `""` | Static prefix (e.g. `"$"`) |
| `suffix` | `string` | `""` | Static suffix (e.g. `"%"`) |
| `trend` | `-1 \| 0 \| 1` | auto | Roll direction. Omit for auto-detection, `0` for shortest path. |
| `animated` | `boolean` | `true` | Set `false` to disable animations |
| `respectMotionPreference` | `boolean` | `true` | Disable animations when device "Reduce Motion" is on |
| `onAnimationsStart` | `() => void` | — | Called when update animations begin |
| `onAnimationsFinish` | `() => void` | — | Called when all update animations complete |
| `containerStyle` | `ViewStyle` | — | Container view style |
| `spinTiming` | `TimingConfig` | 900ms decel | Digit roll timing |
| `opacityTiming` | `TimingConfig` | 450ms ease-out | Enter/exit fade timing |
| `transformTiming` | `TimingConfig` | 900ms decel | Position/width change timing |

### TimeFlow Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `hours` | `number` | — | Hours (0-23). Omit to hide. |
| `minutes` | `number` | — | **Required.** Minutes (0-59). |
| `seconds` | `number` | — | Seconds (0-59). Omit to hide. |
| `timestamp` | `number` | — | Unix timestamp (ms). Extracts h/m/s. |
| `timezoneOffset` | `number` | — | Timezone offset (ms) for timestamp mode |
| `sharedValue` | `SharedValue<string>` | — | Worklet-driven time string |
| `is24Hour` | `boolean` | `true` | 24-hour format |
| `padHours` | `boolean` | `true` | Pad hours with leading zero |
| `style` | `{ fontSize, fontFamily?, color?, ... }` | — | **Required.** Text styling (`fontSize` required) |
| `textAlign` | `"left" \| "right" \| "center"` | `"left"` | Text alignment |
| `containerStyle` | `ViewStyle` | — | Container view style |
| `trend` | `-1 \| 0 \| 1` | auto | Roll direction. Omit for auto-detection, `0` for shortest path. |
| `animated` | `boolean` | `true` | Set `false` to disable animations |
| `respectMotionPreference` | `boolean` | `true` | Disable animations when device "Reduce Motion" is on |
| `onAnimationsStart` | `() => void` | — | Called when update animations begin |
| `onAnimationsFinish` | `() => void` | — | Called when all update animations complete |
| `spinTiming` | `TimingConfig` | 900ms decel | Digit roll timing |
| `opacityTiming` | `TimingConfig` | 450ms ease-out | Enter/exit fade timing |
| `transformTiming` | `TimingConfig` | 900ms decel | Position/width change timing |

### SkiaNumberFlow Props

Same as `NumberFlow` plus Skia-specific props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `font` | `SkFont \| null` | — | **Required.** Skia font from `useFont()` |
| `color` | `string` | `"#000000"` | Text color |
| `x` | `number` | `0` | X position in Canvas |
| `y` | `number` | `0` | Y position (baseline) |
| `width` | `number` | `0` | Available width for alignment |
| `opacity` | `SharedValue<number>` | — | Parent opacity for coordination |
| `scrubDigitWidthPercentile` | `number` | `0.75` | Digit width during scrubbing (0-1) |

### SkiaTimeFlow Props

Same as `TimeFlow` plus Skia-specific props (`font`, `color`, `x`, `y`, `width`, `opacity`).

### TimingConfig

```ts
interface TimingConfig {
  duration: number; // milliseconds
  easing: EasingFunction; // from react-native-reanimated
}
```

### Accessibility

**Native components** (`NumberFlow`, `TimeFlow`) have built-in accessibility: `accessibilityRole="text"` and `accessibilityLabel` are set automatically from the formatted value.

**Skia components** (`SkiaNumberFlow`, `SkiaTimeFlow`) auto-announce value changes when a screen reader is active. For focus-based reading (VoiceOver swipe navigation), set accessibility props on the parent `<Canvas>`:

```tsx
import { useFormattedValue } from "number-flow-react-native";

const label = useFormattedValue(value, { style: "currency", currency: "USD" });

<Canvas style={{ width: 200, height: 40 }} accessible accessibilityLabel={label}>
  <SkiaNumberFlow value={value} font={font} format={{ style: "currency", currency: "USD" }} />
</Canvas>
```

## How it works

Each character position gets a stable semantic key (e.g. `integer:0` for the ones place, `integer:1` for tens, `fraction:0` for tenths). When the value changes, each digit independently rolls to its new value using modular arithmetic on a virtual wheel of 10 digits. Only the current digit and its immediate neighbors are visible through a clip window — all others park just offscreen.

Integer digits are keyed right-to-left so that the ones place always maps to the same key regardless of digit count. This means when 9 becomes 10, the ones place rolls 9 → 0 while a new tens place enters with a fade animation.

The easing curve is an exact reproduction of NumberFlow's CSS `linear()` function — a smooth 88-point deceleration curve.

## Development

This is a monorepo managed with [Bun workspaces](https://bun.sh/docs/install/workspaces).

### Structure

- `packages/number-flow-react-native/` — The library
- `apps/example/` — Expo example app
- `docs/` — Documentation site ([Fumadocs](https://fumadocs.dev))

### Getting started

```bash
bun install

# Run the example app
bun run example start

# Run the docs site
bun run docs dev

# Type-check the library
bun run lib check-types
```

## Attribution

This library is a React Native reimplementation inspired by [NumberFlow](https://number-flow.barvian.me/) by [Maxwell Barvian](https://github.com/barvian). The animation patterns, easing curves, and digit-rolling approach are adapted from the original web implementation. All code is original — no source code is shared.

## License

MIT
