---
"number-flow-react-native": patch
---

Fix hairline gap in gradient mask on non-white backgrounds (#1)

Replace discrete View strips with continuous native gradients using `experimental_backgroundImage` on RN 0.76+. Falls back to 48-step discrete strips with overlap for older versions.
