---
"number-flow-react-native": patch
---

fix(skia): improve shared/scrubbing mode accuracy and mask clipping

- Preserve raw string through scrubbing bridge to avoid parseFloat losing formatting (e.g. trailing decimals)
- Use keyed layout (RTL integer keying) in shared mode instead of positional keys
- Animate mask bounds during scrubbing to prevent horizontal clipping
- Skip first-render animation in useAnimatedX to prevent mount slide-in
- Extract rawPartsToKeyedParts and parseFormattedNumber for shared mode string-based keying
- Remove unused computeStringLayout
