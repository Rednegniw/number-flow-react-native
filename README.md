<h1 align="center">Number Flow React Native</h1>

<p align="center" style="font-size: 1.2em;">
  The best animated number component for React Native.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/number-flow-react-native"><img src="https://img.shields.io/npm/v/number-flow-react-native" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/number-flow-react-native"><img src="https://img.shields.io/npm/dm/number-flow-react-native" alt="npm downloads" /></a>
  <a href="https://github.com/Rednegniw/number-flow-react-native/actions/workflows/ci.yml"><img src="https://github.com/Rednegniw/number-flow-react-native/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/Rednegniw/number-flow-react-native/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/number-flow-react-native" alt="license" /></a>
</p>

<p align="center">
  <video src="https://github.com/user-attachments/assets/233f1fad-e928-4b98-a84e-9196076c8082" autoplay loop muted playsinline></video>
</p>

## Features

- **Beautiful digit-by-digit rolling** — each digit animates independently via virtual wheels with automatic direction detection
- **Two renderers** — a default View-based renderer with zero dependencies, and a Skia renderer if you need to have Skia numbers animating
- **Full Intl.NumberFormat** — currencies, percentages, units, compact notation, and everything that this beautiful formatter has to offer
- **TimeFlow** — dedicated animated time display with 12h/24h, timestamps, and countdown support. Even supports centiseconds.
- **120 FPS scrubbing** — worklet-driven updates entirely on the UI thread, with Skia.
- **37 numeral systems** — Arabic-Indic, Devanagari, Thai, CJK, and more. 
- **Accessibility** — VoiceOver/TalkBack announcements + reduce motion support
- **Continuous mode** — odometer-style cascading digit rolls

## Documentation

For full docs, examples, and recipes, visit **[number-flow-react-native.awingender.com](https://number-flow-react-native.awingender.com)**.

## Installation

```bash
# npm
npm install number-flow-react-native react-native-reanimated

# bun
bun add number-flow-react-native react-native-reanimated

# expo
npx expo install number-flow-react-native react-native-reanimated
```

## Quick start

```tsx
import { NumberFlow } from "number-flow-react-native";

function PriceDisplay() {
  const [price, setPrice] = useState(42.99);

  return (
    <NumberFlow
      value={price}
      format={{ style: "currency", currency: "USD" }}
      style={{ fontSize: 32, color: "#000" }}
    />
  );
}
```

## Renderers

The default import uses the **View-based renderer** — no extra dependencies needed. If you need to display numbers in Skia Canvas, use the **Skia renderer**:

```tsx
// View-based (default)
import { NumberFlow, TimeFlow } from "number-flow-react-native";

// Skia canvas (requires @shopify/react-native-skia)
import { SkiaNumberFlow, SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
```

## Attribution

This library is a complete React Native reimplementation of [NumberFlow](https://number-flow.barvian.me/) by [Max Barvian](https://github.com/barvian). Please check out his work and the original web version.

The animation patterns, easing curves, and digit-rolling approach are adapted from the original web implementation. All code is original — no source code is shared.

## License

MIT
