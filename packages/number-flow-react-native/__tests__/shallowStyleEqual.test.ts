import { shallowStyleEqual } from "../src/core/useShallowStableStyle";

test("content-equal styles are equal, including one-level arrays and objects", () => {
  expect(shallowStyleEqual({ fontSize: 32 }, { fontSize: 32 })).toBe(true);
  expect(shallowStyleEqual({}, {})).toBe(true);
  expect(
    shallowStyleEqual({ fontVariant: ["tabular-nums"] }, { fontVariant: ["tabular-nums"] }),
  ).toBe(true);
  expect(
    shallowStyleEqual(
      { textShadowOffset: { width: 1, height: 2 } },
      { textShadowOffset: { width: 1, height: 2 } },
    ),
  ).toBe(true);
  expect(shallowStyleEqual({ letterSpacing: Number.NaN }, { letterSpacing: Number.NaN })).toBe(
    true,
  );
});

test("differing styles are detected", () => {
  expect(shallowStyleEqual({ fontSize: 32 }, { fontSize: 16 })).toBe(false);
  expect(shallowStyleEqual({ fontSize: 32 }, { fontSize: 32, color: "red" })).toBe(false);
  expect(shallowStyleEqual({ fontVariant: ["tabular-nums"] }, { fontVariant: [] })).toBe(false);
  expect(
    shallowStyleEqual(
      { textShadowOffset: { width: 1, height: 2 } },
      { textShadowOffset: { width: 1, height: 3 } },
    ),
  ).toBe(false);
});
