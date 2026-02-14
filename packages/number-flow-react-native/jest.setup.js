// Stub react-native-reanimated for the Node test environment.
// Only needed because constants.ts does: import { Easing } from "react-native-reanimated"
// All other RN/Skia imports in testable files are `import type` (erased by ts-jest).
jest.mock("react-native-reanimated", () => ({
  Easing: { out: (fn) => fn, ease: (t) => t },
}));
