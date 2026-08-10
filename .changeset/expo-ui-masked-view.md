---
"number-flow-react-native": minor
---

Support `@expo/ui/community/masked-view` as an automatic fallback masked-view source. When `@rednegniw/masked-view` isn't installed but `@expo/ui` (56.0.3+, Expo SDK 56) is, the native renderer now uses Expo UI's MaskedView for smooth gradient masking instead of falling back to per-digit opacity fading (#15)
