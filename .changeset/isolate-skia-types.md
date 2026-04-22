---
"number-flow-react-native": patch
---

Stop leaking `@shopify/react-native-skia` type imports into the `/native` and root entry points. `SkiaNumberFlowProps` and `SkiaTimeFlowProps` now live in `src/skia/types.ts` instead of `src/core/`, so consumers of `NumberFlow` and `TimeFlow` no longer need Skia installed to pass `tsc`. (#12)
