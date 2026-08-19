---
"number-flow-react-native": patch
---

Fix digits freezing mid-roll or disappearing when a slot mounts on a recycled Fabric view

The native renderer's digit strip was an absolutely-positioned view at the
origin with only absolutely-positioned children, so its layout metrics were
exactly `{0,0,0,0}`. On Fabric, `RCTViewComponentView.prepareForRecycle`
resets stored metrics to zeroed values rather than the `EmptyLayoutMetrics`
sentinel, so when a newly mounted strip received a recycled native view its
zero frame compared equal and the frame assignment was skipped - the strip
kept the recycled donor's frame and digits drew displaced or outside the clip
window (frozen half-glyphs, invisible digits) until the next React commit
happened to rewrite the subtree.

The strip now lays out as a real box sized to its digit column
(`maxDigitWidth` x strip length, offset up by the pad, digits at non-negative
offsets inside), so its layout metrics are never all-zero and every mount
applies a correct frame.
