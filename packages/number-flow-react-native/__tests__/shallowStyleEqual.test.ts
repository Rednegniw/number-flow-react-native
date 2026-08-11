import { shallowStyleEqual } from "../src/core/useShallowStableStyle";

describe("shallowStyleEqual", () => {
  it("treats content-equal inline literals as equal", () => {
    expect(shallowStyleEqual({ fontSize: 32 }, { fontSize: 32 })).toBe(true);
    expect(shallowStyleEqual({}, {})).toBe(true);
  });

  it("detects primitive value differences", () => {
    expect(shallowStyleEqual({ fontSize: 32 }, { fontSize: 16 })).toBe(false);
    expect(shallowStyleEqual({ fontSize: 32 }, { fontSize: 32, color: "red" })).toBe(false);
    expect(shallowStyleEqual({ color: "red" }, { fontWeight: "600" })).toBe(false);
  });

  it("compares fontVariant arrays one level deep", () => {
    expect(
      shallowStyleEqual({ fontVariant: ["tabular-nums"] }, { fontVariant: ["tabular-nums"] }),
    ).toBe(true);
    expect(
      shallowStyleEqual({ fontVariant: ["tabular-nums"] }, { fontVariant: ["oldstyle-nums"] }),
    ).toBe(false);
    expect(shallowStyleEqual({ fontVariant: ["tabular-nums"] }, { fontVariant: [] })).toBe(false);
  });

  it("compares textShadowOffset objects one level deep", () => {
    expect(
      shallowStyleEqual(
        { textShadowOffset: { width: 1, height: 2 } },
        { textShadowOffset: { width: 1, height: 2 } },
      ),
    ).toBe(true);
    expect(
      shallowStyleEqual(
        { textShadowOffset: { width: 1, height: 2 } },
        { textShadowOffset: { width: 1, height: 3 } },
      ),
    ).toBe(false);
  });

  it("handles undefined values and NaN via Object.is", () => {
    expect(shallowStyleEqual({ letterSpacing: undefined }, { letterSpacing: undefined })).toBe(
      true,
    );
    expect(shallowStyleEqual({ letterSpacing: Number.NaN }, { letterSpacing: Number.NaN })).toBe(
      true,
    );
  });
});
