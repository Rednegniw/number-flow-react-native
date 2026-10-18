---
"number-flow-react-native": patch
---

Re-measure glyph metrics when the system font scale changes (iOS Dynamic Type, Android font size). The metrics cache ignored `fontScale`, so after a change digits kept the old widths and overlapped or clipped until the app restarted.
