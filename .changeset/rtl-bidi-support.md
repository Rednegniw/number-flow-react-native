---
"number-flow-react-native": minor
---

feat: add RTL and bidi visual reordering support

- New `direction` prop ("ltr" | "rtl" | "auto") on all four components
- Semantic `textAlign` values ("start", "end") that resolve based on direction
- Unicode Bidi Algorithm (UAX#9) implementation for visual reordering of formatted numbers in RTL locales (Arabic, Hebrew)
- Bidi control character filtering throughout the formatting pipeline
- New `resolveDirection` and `resolveTextAlign` utilities in `direction.ts`
- New `bidi.ts` module with `computeVisualOrder`, `detectContentDirection`, and `reorderKeyedParts`
