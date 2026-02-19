# number-flow-react-native

## 0.1.7

### Patch Changes

- Add explicit dependency arrays to all `useAnimatedStyle` hooks in native renderer, enabling web support without the Reanimated Babel plugin (e.g. Sandpack, plain webpack/Vite setups).

## 0.1.6

### Patch Changes

- 1af5a33: Add CSS gradient masking on Expo Web via `mask-image: linear-gradient()`, replacing the no-op MaskedView fallback. Extract shared `GradientMask` component with platform-specific implementations (native: MaskedView + View strips, web: CSS mask-image). Add Expo Web support for glyph measurement.
