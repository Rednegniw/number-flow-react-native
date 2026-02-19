# number-flow-react-native

## 0.1.11

### Patch Changes

- Fix overlapping characters for multi-character currency symbols (e.g. "US$" in non-US locales). All formatToParts symbol strings are now split into individual characters to match the glyph measurement granularity.

## 0.1.10

### Patch Changes

- [`07e01d8`](https://github.com/Rednegniw/number-flow-react-native/commit/07e01d801540949f46c07feec39f36bf39a3bc94) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Animate container width transitions instead of snapping when digit widths change

## 0.1.9

### Patch Changes

- [`147a5a9`](https://github.com/Rednegniw/number-flow-react-native/commit/147a5a9c1dab892a084be77bbc4a341128c8e368) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Fix container collapsing to 0 width on web when parent uses `alignItems: 'center'`

## 0.1.8

### Patch Changes

- fix(web): correct font measurement and animation for web-without-babel

  - Map `'System'` font family to the same CSS font stack that react-native-web uses, so Canvas glyph measurement matches actual rendering (fixes cut-off digits)
  - Add SharedValue dependencies to `useAnimatedReaction` so the mapper correctly tracks value changes on web without the Reanimated Babel plugin (fixes animation not updating on button click)

## 0.1.7

### Patch Changes

- Add explicit dependency arrays to all `useAnimatedStyle` hooks in native renderer, enabling web support without the Reanimated Babel plugin (e.g. Sandpack, plain webpack/Vite setups).

## 0.1.6

### Patch Changes

- 1af5a33: Add CSS gradient masking on Expo Web via `mask-image: linear-gradient()`, replacing the no-op MaskedView fallback. Extract shared `GradientMask` component with platform-specific implementations (native: MaskedView + View strips, web: CSS mask-image). Add Expo Web support for glyph measurement.
