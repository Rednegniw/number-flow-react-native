---
"number-flow-react-native": patch
---

Fix digits freezing mid-roll or disappearing when a slot mounts on a recycled Fabric view

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
