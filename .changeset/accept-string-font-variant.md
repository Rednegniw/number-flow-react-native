---
"number-flow-react-native": patch
---

Accept a string `fontVariant` from React Native 0.87 `TextStyle` when building the glyph-metrics cache key, instead of assuming an array and calling `.join()` (#24)
