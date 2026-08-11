---
"number-flow-react-native": patch
---

Performance: eliminate unnecessary work in all renderers

- `NumberFlow`/`TimeFlow` no longer re-render every digit slot on each value change or parent re-render: the `style` prop is stabilized by content (inline literals included) and trend changes are delivered through a ref instead of a memo-busting prop. Updating one digit now commits exactly one slot.
- `SkiaNumberFlow`/`SkiaTimeFlow` digit wheels skip SharedValue writes for digits parked outside the visible window, so a spinning slot no longer re-notifies all 10 digit transforms every frame.
- Skia digit and symbol slots apply opacity via `Group opacity` instead of `layer={<Paint/>}`, removing one saveLayer (offscreen texture) per slot per frame.
- The native renderer's host-view count is roughly halved (146 to 77 views for `$1,234.56`): each wheel digit is a single `Animated.Text` instead of an `Animated.View` wrapping a `Text`, and each slot's transform and clip wrappers merge into one view.
