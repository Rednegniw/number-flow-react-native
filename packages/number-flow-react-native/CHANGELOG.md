# number-flow-react-native

## 0.5.2

### Patch Changes

- [#28](https://github.com/Rednegniw/number-flow-react-native/pull/28) [`da07729`](https://github.com/Rednegniw/number-flow-react-native/commit/da0772962c866297f1a2a452c7c5f109f22b97e6) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Accept a string `fontVariant` from React Native 0.87 `TextStyle` when building the glyph-metrics cache key, instead of assuming an array and calling `.join()` (#24)

## 0.5.1

### Patch Changes

- [#26](https://github.com/Rednegniw/number-flow-react-native/pull/26) [`b1fbf3f`](https://github.com/Rednegniw/number-flow-react-native/commit/b1fbf3f1c9ff1fb3e8c69129560b9dba201856dd) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Fix digits freezing mid-roll or disappearing when a slot mounts on a recycled Fabric view

  The native renderer's digit strip was an absolutely-positioned view at the
  origin with only absolutely-positioned children, so its layout metrics were
  exactly `{0,0,0,0}`. On Fabric, a recycled `RCTViewComponentView` compares
  incoming layout metrics against its stored ones rather than the
  `EmptyLayoutMetrics` sentinel, and those stored metrics can be all-zero too:
  React Native 0.85+ resets them to zero-initialized values in
  `prepareForRecycle`, while older versions retain the donor view's metrics,
  which may themselves be zero. A strip whose true layout is all-zero compared
  equal, the frame assignment was skipped, and the strip kept the recycled
  donor's frame - digits drew displaced or outside the clip window (frozen
  half-glyphs, invisible digits) until the next React commit happened to
  rewrite the subtree.

  The strip now lays out as a real box sized to its digit column
  (`maxDigitWidth` x strip length, offset up by the pad, digits at non-negative
  offsets inside), so its layout metrics are never all-zero and every mount
  applies a correct frame.

## 0.5.0

### Minor Changes

- [#17](https://github.com/Rednegniw/number-flow-react-native/pull/17) [`1f6392b`](https://github.com/Rednegniw/number-flow-react-native/commit/1f6392bacf018757350ad7899d2643b2ce6ed575) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Support `@expo/ui/community/masked-view` as an automatic fallback masked-view source. When `@rednegniw/masked-view` isn't installed but `@expo/ui` (56.0.3+, Expo SDK 56) is, the native renderer now uses Expo UI's MaskedView for smooth gradient masking instead of falling back to per-digit opacity fading (#15)

### Patch Changes

- [#20](https://github.com/Rednegniw/number-flow-react-native/pull/20) [`e4649e9`](https://github.com/Rednegniw/number-flow-react-native/commit/e4649e909b5544e1b3c851c3759d2f8c8f0a8946) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Performance: eliminate unnecessary work in all renderers

  - `NumberFlow`/`TimeFlow` no longer re-render every digit slot on each value change or parent re-render: the `style` prop is stabilized by content (inline literals included) and trend changes are delivered through a ref instead of a memo-busting prop. Updating one digit now commits exactly one slot.
  - `SkiaNumberFlow`/`SkiaTimeFlow` digit wheels skip SharedValue writes for digits parked outside the visible window, so a spinning slot no longer re-notifies all 10 digit transforms every frame.
  - Skia digit and symbol slots apply opacity via `Group opacity` instead of `layer={<Paint/>}`, removing one saveLayer (offscreen texture) per slot per frame.
  - The native digit wheel renders as a single translated strip: one animated style commit per slot per frame instead of roughly four, and mounting is about 3x faster. Host-view count for `$1,234.56` goes from 146 to 107. Per-digit opacity fading now applies only as the fallback when MaskedView is unavailable; with MaskedView present the container gradient fades the edges alone, so digits entering or leaving the window during a roll are slightly less faded than before. Settled rendering is unchanged.
  - The native renderer no longer eases each slot's clip width frame by frame, which was forcing a layout pass per slot per frame. The width now covers both the outgoing and incoming digit for the roll, then settles, so it is written at most twice per value change. Proportional digit widths are unaffected; on a 30-component grid ticking at 10Hz this was the difference between roughly 6 and 30 rendered frames per second.
  - `SkiaNumberFlow`/`SkiaTimeFlow` share glyph measurements between components using the same font instead of measuring per instance, cutting mount work for grids of many components.
  - Fixed: a slot's first-ever x change teleported instead of animating (a leftover first-render guard), visibly breaking digit spacing on the first transition that moved a previously stationary slot, for example rolling 199,999 to 200,000 with proportional digit widths.

## 0.4.2

### Patch Changes

- [`11aaffe`](https://github.com/Rednegniw/number-flow-react-native/commit/11aaffef59c51cbd08a0bb6641938fb013821bca) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Stop leaking `@shopify/react-native-skia` type imports into the `/native` and root entry points. `SkiaNumberFlowProps` and `SkiaTimeFlowProps` now live in `src/skia/types.ts` instead of `src/core/`, so consumers of `NumberFlow` and `TimeFlow` no longer need Skia installed to pass `tsc`. (#12)

## 0.4.1

### Patch Changes

- [`8804c81`](https://github.com/Rednegniw/number-flow-react-native/commit/8804c816b06adb86c48ac29ecd75807e63ae4589) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Add dev-mode warnings when `value` is `NaN` or `Infinity`

## 0.4.0

### Minor Changes

- [`9907018`](https://github.com/Rednegniw/number-flow-react-native/commit/9907018ec21e8b79287c587ce5e4bac0f3e79485) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Accept `SharedValue<string>` for the `color` prop on `SkiaNumberFlow` and `SkiaTimeFlow`, enabling animated color transitions (#6)

### Patch Changes

- [`6c9888c`](https://github.com/Rednegniw/number-flow-react-native/commit/6c9888c8764f61f961d879cbb982d75a2054ff60) Thanks [@marioprieta](https://github.com/marioprieta)! - Skip placeholder phase on remount when glyph metrics are already cached, fixing a layout shift caused by native text kerning differing from measured char widths (#8)

## 0.3.1

### Patch Changes

- [`754f26e`](https://github.com/Rednegniw/number-flow-react-native/commit/754f26e48187c79297fdd1d4482a51f606b7da94) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Fix stale worklet dependency in useDigitAnimation, add missing useAnimatedReaction deps in SymbolSlot, handle accessibility promise rejection, and improve code clarity

## 0.3.0

### Minor Changes

- [`7761515`](https://github.com/Rednegniw/number-flow-react-native/commit/776151504d14e3638d56aa3990bc82854e36c7b3) Thanks [@Rednegniw](https://github.com/Rednegniw)! - Add right-to-left (RTL) support with automatic bidi visual reordering

  NumberFlow now works correctly in RTL apps. When `I18nManager.isRTL` is `true` (or `direction="rtl"` is set explicitly), numbers right-align automatically and currency symbols, minus signs, and other formatting elements reorder to match native text rendering. Arabic and Hebrew locales get full visual reordering; Persian and Urdu formats preserve their logical order as intended.

  - New `direction` prop (`"ltr"` | `"rtl"` | `"auto"`) on all four components
  - Semantic `textAlign` values (`"start"`, `"end"`) that resolve based on direction
  - Simplified Unicode Bidi Algorithm (UAX#9) for visual reordering of formatted numbers

  See the [RTL documentation](https://number-flow-react-native.awingender.com/docs/examples/right-to-left) for details and examples.

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
