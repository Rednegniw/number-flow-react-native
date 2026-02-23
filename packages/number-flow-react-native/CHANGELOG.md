# number-flow-react-native

## 0.2.5

### Patch Changes

- [`e45ee02`](https://github.com/Rednegniw/number-flow-react-native/commit/e45ee02922c4ce115dfdc7ee19ee1bec37c0e703) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Fix hairline gap in gradient mask on non-white backgrounds (#1)

  Replace discrete View strips with continuous native gradients using `experimental_backgroundImage` on RN 0.76+. Falls back to 48-step discrete strips with overlap for older versions.

## 0.2.4

### Patch Changes

- [`f7a6e80`](https://github.com/Rednegniw/number-flow-react-native/commit/f7a6e80995d2749cc17a077f84d058dcd9b87f27) Thanks [@Rednegniw](https://github.com/Rednegniw)! - fix(skia): improve shared/scrubbing mode accuracy and mask clipping

  - Preserve raw string through scrubbing bridge to avoid parseFloat losing formatting (e.g. trailing decimals)
  - Use keyed layout (RTL integer keying) in shared mode instead of positional keys
  - Animate mask bounds during scrubbing to prevent horizontal clipping
  - Skip first-render animation in useAnimatedX to prevent mount slide-in
  - Extract rawPartsToKeyedParts and parseFormattedNumber for shared mode string-based keying
  - Remove unused computeStringLayout

## 0.2.0

### Minor Changes

- **Breaking:** Removed the `textAlign` prop from `NumberFlow`, `TimeFlow`, `SkiaNumberFlow`, and `SkiaTimeFlow`. Set `textAlign` via the `style` prop instead (e.g. `style={{ textAlign: "center" }}`).

## 0.1.12

### Patch Changes

- Stable prefix/suffix character keys in `computeStringLayout` prevent unnecessary remounts when digit count changes. Expanded vertical mask bounds in Skia renderers fix clipping of rolling digits.

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
