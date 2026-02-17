import { isDigitChar } from "../src/core/numerals";
import type { Trend } from "../src/core/types";
import {
  computeRollDelta,
  getDigitCount,
  parseDigitPosition,
  resolveTrend,
  signedDigitOffset,
} from "../src/core/utils";

// ─── signedDigitOffset ───

describe("signedDigitOffset", () => {
  test("centered digit returns 0", () => {
    expect(signedDigitOffset(5, 5)).toBe(0);
  });

  test("positive offset within half", () => {
    expect(signedDigitOffset(7, 5)).toBe(2);
  });

  test("negative offset within half", () => {
    expect(signedDigitOffset(3, 5)).toBe(-2);
  });

  test("wraps around for large positive gap", () => {
    expect(signedDigitOffset(1, 8)).toBe(3);
  });

  test("wraps around for large negative gap", () => {
    expect(signedDigitOffset(8, 1)).toBe(-3);
  });

  test("boundary: exactly at half returns negative", () => {
    expect(signedDigitOffset(0, 5)).toBe(-5);
  });

  describe("custom digitCount", () => {
    test("6-digit wheel (s10/m10)", () => {
      expect(signedDigitOffset(5, 3, 6)).toBe(2);
      expect(signedDigitOffset(1, 4, 6)).toBe(-3);
    });

    test("3-digit wheel (h10)", () => {
      expect(signedDigitOffset(2, 0, 3)).toBe(-1);
      expect(signedDigitOffset(0, 2, 3)).toBe(1);
    });
  });
});

// ─── computeRollDelta ───

describe("computeRollDelta", () => {
  test("same value always returns 0", () => {
    expect(computeRollDelta(5, 5, 1)).toBe(0);
    expect(computeRollDelta(5, 5, -1)).toBe(0);
    expect(computeRollDelta(5, 5, 0)).toBe(0);
  });

  describe("trend > 0 (always up)", () => {
    test("next > prev: direct positive delta", () => {
      expect(computeRollDelta(2, 8, 1)).toBe(6);
    });

    test("next < prev: wraps around upward", () => {
      expect(computeRollDelta(8, 2, 1)).toBe(4);
    });

    test("adjacent: 9→0 wraps up by 1", () => {
      expect(computeRollDelta(9, 0, 1)).toBe(1);
    });
  });

  describe("trend < 0 (always down)", () => {
    test("next < prev: direct negative delta", () => {
      expect(computeRollDelta(8, 2, -1)).toBe(-6);
    });

    test("next > prev: wraps around downward", () => {
      expect(computeRollDelta(2, 8, -1)).toBe(-4);
    });

    test("adjacent: 0→9 wraps down by -1", () => {
      expect(computeRollDelta(0, 9, -1)).toBe(-1);
    });
  });

  describe("trend = 0 (shortest path)", () => {
    test("close values take direct path", () => {
      expect(computeRollDelta(4, 6, 0)).toBe(2);
      expect(computeRollDelta(6, 4, 0)).toBe(-2);
    });

    test("1→9 wraps backward (shorter than going forward 8 steps)", () => {
      expect(computeRollDelta(1, 9, 0)).toBe(-2);
    });

    test("9→1 wraps forward (shorter than going backward 8 steps)", () => {
      expect(computeRollDelta(9, 1, 0)).toBe(2);
    });
  });

  describe("custom digitCount", () => {
    test("6-digit wheel: 0→5 shortest wraps backward", () => {
      expect(computeRollDelta(0, 5, 0, 6)).toBe(-1);
    });

    test("6-digit wheel: 5→0 up wraps by 1", () => {
      expect(computeRollDelta(5, 0, 1, 6)).toBe(1);
    });

    test("3-digit wheel: 0→2 down wraps by -1", () => {
      expect(computeRollDelta(0, 2, -1, 3)).toBe(-1);
    });
  });
});

// ─── resolveTrend ───

describe("resolveTrend", () => {
  test("static value passes through regardless of values", () => {
    expect(resolveTrend(1, 10, 5)).toBe(1);
    expect(resolveTrend(-1, 5, 10)).toBe(-1);
    expect(resolveTrend(0, 5, 10)).toBe(0);
  });

  test("function is called with prev and next", () => {
    const fn = (prev: number, next: number): Trend => (next > prev ? 1 : -1);

    expect(resolveTrend(fn, 10, 20)).toBe(1);
    expect(resolveTrend(fn, 20, 10)).toBe(-1);
  });

  test("function returns 0 when values are the same", () => {
    const fn = (): Trend => 1;
    expect(resolveTrend(fn, 5, 5)).toBe(0);
  });

  test("function returns 0 when prev is undefined (first render)", () => {
    const fn = (): Trend => 1;
    expect(resolveTrend(fn, undefined, 5)).toBe(0);
  });

  test("undefined auto-detects from direction of change", () => {
    expect(resolveTrend(undefined, 5, 10)).toBe(1);
    expect(resolveTrend(undefined, 10, 5)).toBe(-1);
    expect(resolveTrend(undefined, 5, 5)).toBe(0);
    expect(resolveTrend(undefined, undefined, 5)).toBe(0);
  });
});

// ─── parseDigitPosition ───

describe("parseDigitPosition", () => {
  test("integer keys return position", () => {
    expect(parseDigitPosition("integer:0")).toBe(0);
    expect(parseDigitPosition("integer:1")).toBe(1);
    expect(parseDigitPosition("integer:5")).toBe(5);
  });

  test("fraction keys return negative positions", () => {
    expect(parseDigitPosition("fraction:0")).toBe(-1);
    expect(parseDigitPosition("fraction:1")).toBe(-2);
    expect(parseDigitPosition("fraction:3")).toBe(-4);
  });

  test("time digit keys map to significance order", () => {
    expect(parseDigitPosition("s1")).toBe(0);
    expect(parseDigitPosition("s10")).toBe(1);
    expect(parseDigitPosition("m1")).toBe(2);
    expect(parseDigitPosition("m10")).toBe(3);
    expect(parseDigitPosition("h1")).toBe(4);
    expect(parseDigitPosition("h10")).toBe(5);
  });

  test("non-digit keys return undefined", () => {
    expect(parseDigitPosition("decimal")).toBeUndefined();
    expect(parseDigitPosition("group")).toBeUndefined();
    expect(parseDigitPosition("sep")).toBeUndefined();
    expect(parseDigitPosition("ampm:AM:0")).toBeUndefined();
  });

  test("exponent digit keys return undefined (excluded from continuous spin)", () => {
    expect(parseDigitPosition("exponentInteger:0")).toBeUndefined();
    expect(parseDigitPosition("exponentInteger:1")).toBeUndefined();
  });
});

// ─── getDigitCount ───

describe("getDigitCount", () => {
  test("no digits prop returns 10", () => {
    expect(getDigitCount(undefined, "integer:0")).toBe(10);
  });

  test("unconstrained position returns 10", () => {
    expect(getDigitCount({ 1: { max: 5 } }, "integer:0")).toBe(10);
  });

  test("constrained position returns max+1", () => {
    expect(getDigitCount({ 1: { max: 5 } }, "integer:1")).toBe(6);
    expect(getDigitCount({ 0: { max: 3 } }, "integer:0")).toBe(4);
  });

  test("fraction positions are never constrained", () => {
    expect(getDigitCount({ 0: { max: 5 } }, "fraction:0")).toBe(10);
  });

  test("non-digit keys return 10", () => {
    expect(getDigitCount({ 0: { max: 5 } }, "decimal")).toBe(10);
  });
});

// ─── isDigitChar ───

describe("isDigitChar", () => {
  test("recognizes 0-9", () => {
    for (let i = 0; i <= 9; i++) {
      expect(isDigitChar(String(i))).toBe(true);
    }
  });

  test("rejects non-digits", () => {
    expect(isDigitChar(".")).toBe(false);
    expect(isDigitChar(",")).toBe(false);
    expect(isDigitChar("-")).toBe(false);
    expect(isDigitChar("a")).toBe(false);
    expect(isDigitChar(" ")).toBe(false);
  });

  test("recognizes Arabic-Indic digits with custom zeroCodePoint", () => {
    const arabZero = 0x0660;
    for (let i = 0; i <= 9; i++) {
      expect(isDigitChar(String.fromCharCode(arabZero + i), arabZero)).toBe(true);
    }
  });

  test("Latin digits rejected when using Arabic zeroCodePoint", () => {
    expect(isDigitChar("0", 0x0660)).toBe(false);
    expect(isDigitChar("9", 0x0660)).toBe(false);
  });
});
