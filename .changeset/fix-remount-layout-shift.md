---
"number-flow-react-native": patch
---

Skip placeholder phase on remount when glyph metrics are already cached, fixing a layout shift caused by native text kerning differing from measured char widths (#8)
