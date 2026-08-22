---
"number-flow-react-native": patch
---

Prune exiting digit slots when their fade is interrupted. `useSlotOpacity` only reported completion on `finished: true`, so an interrupted exit left the key in `useLayoutDiff`'s `exitingRef` permanently and the stale glyph stayed mounted on top of the live one.
