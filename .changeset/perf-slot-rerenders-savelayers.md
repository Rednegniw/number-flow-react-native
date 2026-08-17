---
"number-flow-react-native": patch
---

Performance: eliminate unnecessary work in all renderers

- `NumberFlow`/`TimeFlow` no longer re-render every digit slot on each value change or parent re-render: the `style` prop is stabilized by content (inline literals included) and trend changes are delivered through a ref instead of a memo-busting prop. Updating one digit now commits exactly one slot.
- `SkiaNumberFlow`/`SkiaTimeFlow` digit wheels skip SharedValue writes for digits parked outside the visible window, so a spinning slot no longer re-notifies all 10 digit transforms every frame.
- Skia digit and symbol slots apply opacity via `Group opacity` instead of `layer={<Paint/>}`, removing one saveLayer (offscreen texture) per slot per frame.
- The native digit wheel renders as a single translated strip: one animated style commit per slot per frame instead of roughly four, and mounting is about 3x faster. Host-view count for `$1,234.56` goes from 146 to 107. Per-digit opacity fading now applies only as the fallback when MaskedView is unavailable; with MaskedView present the container gradient fades the edges alone, so digits entering or leaving the window during a roll are slightly less faded than before. Settled rendering is unchanged.
- The native renderer no longer eases each slot's clip width frame by frame, which was forcing a layout pass per slot per frame. The width now covers both the outgoing and incoming digit for the roll, then settles, so it is written at most twice per value change. Proportional digit widths are unaffected; on a 30-component grid ticking at 10Hz this was the difference between roughly 6 and 30 rendered frames per second.
- `SkiaNumberFlow`/`SkiaTimeFlow` share glyph measurements between components using the same font instead of measuring per instance, cutting mount work for grids of many components.
- Fixed: a slot's first-ever x change teleported instead of animating (a leftover first-render guard), visibly breaking digit spacing on the first transition that moved a previously stationary slot, for example rolling 199,999 to 200,000 with proportional digit widths.
