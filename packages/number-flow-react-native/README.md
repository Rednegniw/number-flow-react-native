<p align="center">
  <img src="https://github.com/Rednegniw/number-flow-react-native/raw/main/.github/assets/demo.gif" alt="number-flow-react-native demo" width="300" />
</p>

<h1 align="center">number-flow-react-native</h1>

<p align="center">
  An animated number component for React Native.
  <br />
  Inspired by <a href="https://number-flow.barvian.me/">NumberFlow</a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/number-flow-react-native"><img src="https://img.shields.io/npm/v/number-flow-react-native" alt="npm version" /></a>
  <a href="https://github.com/Rednegniw/number-flow-react-native/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/number-flow-react-native" alt="license" /></a>
</p>

---

For full documentation, visit **[number-flow-react-native.awingender.com](https://number-flow-react-native.awingender.com)**.

## Quick start

```bash
npm install number-flow-react-native react-native-reanimated
```

```tsx
import { NumberFlow } from "number-flow-react-native/native";

<NumberFlow
  value={1234.56}
  format={{ style: "currency", currency: "USD" }}
  style={{ fontSize: 32, color: "#000" }}
/>;
```

## Attribution

This library is a React Native reimplementation inspired by [NumberFlow](https://number-flow.barvian.me/) by [Maxwell Barvian](https://github.com/barvian). The animation patterns, easing curves, and digit-rolling approach are adapted from the original web implementation. All code is original — no source code is shared.

## License

MIT
