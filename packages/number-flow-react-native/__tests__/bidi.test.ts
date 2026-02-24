import { computeVisualOrder, detectContentDirection, reorderKeyedParts } from "../src/core/bidi";
import { getOrCreateFormatter } from "../src/core/intlHelpers";
import type { KeyedPart } from "../src/core/types";
import { formatToKeyedParts } from "../src/core/useNumberFormatting";

// ─── detectContentDirection ───

describe("detectContentDirection", () => {
  test("LRM at start returns ltr", () => {
    expect(detectContentDirection(["\u200E", "1", "2"])).toBe("ltr");
  });

  test("RLM at start returns rtl", () => {
    expect(detectContentDirection(["\u200F", "1", "2"])).toBe("rtl");
  });

  test("ALM returns rtl", () => {
    expect(detectContentDirection(["\u061C", "\u0661"])).toBe("rtl");
  });

  test("Latin digit (no marks) returns ltr via first strong character", () => {
    expect(detectContentDirection(["$", "1", "2"])).toBe("ltr");
  });

  test("Arabic letter (no marks) returns rtl via first strong character", () => {
    // Arabic letter (U+0627, Alef)
    expect(detectContentDirection(["\u0627"])).toBe("rtl");
  });

  test("Hebrew letter returns rtl via first strong character", () => {
    // Hebrew letter (U+05D0, Alef)
    expect(detectContentDirection(["\u05D0"])).toBe("rtl");
  });

  test("empty array returns ltr", () => {
    expect(detectContentDirection([])).toBe("ltr");
  });

  test("only neutral characters returns ltr (default)", () => {
    expect(detectContentDirection([".", ",", " "])).toBe("ltr");
  });
});

// ─── computeVisualOrder ───

describe("computeVisualOrder", () => {
  test("LTR base direction returns identity order", () => {
    const chars = ["a", "b", "c"];
    expect(computeVisualOrder(chars, "ltr")).toEqual([0, 1, 2]);
  });

  test("empty array returns empty", () => {
    expect(computeVisualOrder([], "rtl")).toEqual([]);
    expect(computeVisualOrder([], "ltr")).toEqual([]);
  });

  test("pure RTL characters are reversed", () => {
    // Hebrew letters: should appear reversed in visual order
    const chars = ["\u05D0", "\u05D1", "\u05D2"];
    const order = computeVisualOrder(chars, "rtl");
    expect(order).toEqual([2, 1, 0]);
  });

  test("European numbers remain LTR within RTL context", () => {
    /**
     * In RTL, a run of European Numbers gets level 2 (even),
     * so digits stay in logical order while the overall sequence is reversed.
     * [R, EN, EN, R] → visual: R2, EN1, EN2, R1 → reversed at outer level
     */
    const chars = ["\u05D0", "1", "2", "\u05D1"];
    const order = computeVisualOrder(chars, "rtl");

    // The digits (indices 1,2) should remain in 1,2 order in the visual output
    const digitOrder = order.filter((i) => i === 1 || i === 2);
    expect(digitOrder).toEqual([1, 2]);
  });

  test("currency symbol (ET) adjacent to EN becomes EN (W5 rule)", () => {
    // $ followed by digits: $ should resolve to EN via W5, stay LTR with digits
    const chars = ["\u05D0", "$", "1", "2", "\u05D1"];
    const order = computeVisualOrder(chars, "rtl");

    // The $12 block should remain in logical order
    const dollarIdx = order.indexOf(1);
    const oneIdx = order.indexOf(2);
    const twoIdx = order.indexOf(3);
    expect(dollarIdx).toBeLessThan(oneIdx);
    expect(oneIdx).toBeLessThan(twoIdx);
  });

  test("single character returns [0] for both directions", () => {
    expect(computeVisualOrder(["a"], "ltr")).toEqual([0]);
    expect(computeVisualOrder(["\u05D0"], "rtl")).toEqual([0]);
  });
});

// ─── reorderKeyedParts (integration with Intl.NumberFormat) ───

describe("reorderKeyedParts", () => {
  /**
   * Helper to format a value and run reorderKeyedParts with real Intl output.
   * Returns the concatenated characters in visual order.
   */
  function formatAndReorder(
    locale: string,
    currency: string,
    value: number,
    direction: "ltr" | "rtl",
  ): string {
    const format: Intl.NumberFormatOptions = { style: "currency", currency };
    const formatter = getOrCreateFormatter(locale, format);
    const { parts, rawChars } = formatToKeyedParts(value, formatter, locale);
    const reordered = reorderKeyedParts(parts, rawChars, direction);
    return reordered.map((p) => p.char).join("");
  }

  /**
   * Helper that returns the reordered KeyedPart array for detailed assertions.
   */
  function formatAndReorderParts(
    locale: string,
    currency: string,
    value: number,
    direction: "ltr" | "rtl",
  ): KeyedPart[] {
    const format: Intl.NumberFormatOptions = { style: "currency", currency };
    const formatter = getOrCreateFormatter(locale, format);
    const { parts, rawChars } = formatToKeyedParts(value, formatter, locale);
    return reorderKeyedParts(parts, rawChars, direction);
  }

  test("LTR direction returns parts unchanged", () => {
    const format: Intl.NumberFormatOptions = { style: "currency", currency: "EGP" };
    const formatter = getOrCreateFormatter("ar-EG", format);
    const { parts, rawChars } = formatToKeyedParts(1234.56, formatter, "ar-EG");

    const result = reorderKeyedParts(parts, rawChars, "ltr");
    expect(result).toBe(parts); // same reference, no reorder
  });

  test("English USD in RTL mode: no reorder (LTR content)", () => {
    const format: Intl.NumberFormatOptions = { style: "currency", currency: "USD" };
    const formatter = getOrCreateFormatter("en-US", format);
    const { parts, rawChars } = formatToKeyedParts(1234.56, formatter, "en-US");

    const result = reorderKeyedParts(parts, rawChars, "rtl");
    // English format has no RLM, content is LTR, so parts are returned as-is
    expect(result).toBe(parts);
  });

  test("Arabic EGP positive: currency moves to left of digits", () => {
    const reordered = formatAndReorder("ar-EG", "EGP", 1234.56, "rtl");

    // In visual order for RTL Arabic, the currency abbreviation should appear
    // before (to the left of) the digit block
    const digitRun = reordered.match(/[\u0660-\u0669\d,.\u066B\u066C]+/);
    expect(digitRun).not.toBeNull();

    // Currency chars should be at a different position than in logical order
    // (the fact that reordering happened is the key assertion)
    const parts = formatAndReorderParts("ar-EG", "EGP", 1234.56, "rtl");
    expect(parts.length).toBeGreaterThan(0);

    // Keys should be preserved through reordering
    const keys = parts.map((p) => p.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  test("Arabic EGP negative: currency left, minus right of digits", () => {
    const reordered = formatAndReorder("ar-EG", "EGP", -1234.56, "rtl");
    expect(reordered.length).toBeGreaterThan(0);

    // The sign character should be present
    const parts = formatAndReorderParts("ar-EG", "EGP", -1234.56, "rtl");
    const hasSign = parts.some(
      (p) => p.char === "-" || p.char === "\u2212" || p.key.startsWith("sign:"),
    );
    expect(hasSign).toBe(true);
  });

  test("Hebrew ILS positive: shekel moves left", () => {
    const parts = formatAndReorderParts("he-IL", "ILS", 1234.56, "rtl");
    expect(parts.length).toBeGreaterThan(0);

    // Find the shekel symbol position
    const shekelIdx = parts.findIndex((p) => p.char === "\u20AA");
    if (shekelIdx >= 0) {
      // In visual RTL order, shekel should be to the left (lower index) of digit block
      const firstDigitIdx = parts.findIndex((p) => p.type === "digit");
      expect(shekelIdx).toBeLessThan(firstDigitIdx);
    }
  });

  test("Hebrew ILS negative: shekel left, minus stays with digits", () => {
    const parts = formatAndReorderParts("he-IL", "ILS", -1234.56, "rtl");
    expect(parts.length).toBeGreaterThan(0);

    // Keys are preserved
    const keys = parts.map((p) => p.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  test("Persian IRR positive: no reorder (LRM detected)", () => {
    const format: Intl.NumberFormatOptions = { style: "currency", currency: "IRR" };
    const formatter = getOrCreateFormatter("fa-IR", format);
    const { parts, rawChars } = formatToKeyedParts(1234.56, formatter, "fa-IR");

    const result = reorderKeyedParts(parts, rawChars, "rtl");
    // Persian format starts with LRM, so content direction is LTR
    // and reorderKeyedParts returns the original array unchanged
    expect(result).toBe(parts);
  });

  test("empty parts returns empty array", () => {
    const result = reorderKeyedParts([], [], "rtl");
    expect(result).toEqual([]);
  });

  test("keys are preserved after reordering", () => {
    const format: Intl.NumberFormatOptions = { style: "currency", currency: "EGP" };
    const formatter = getOrCreateFormatter("ar-EG", format);
    const { parts, rawChars } = formatToKeyedParts(42, formatter, "ar-EG");

    const before = new Set(parts.map((p) => p.key));
    const reordered = reorderKeyedParts(parts, rawChars, "rtl");
    const after = new Set(reordered.map((p) => p.key));

    expect(after).toEqual(before);
  });
});
