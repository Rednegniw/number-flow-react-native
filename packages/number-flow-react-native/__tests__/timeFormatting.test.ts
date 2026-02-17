import { formatTimeToKeyedParts, to12Hour } from "../src/core/useTimeFormatting";

// ─── to12Hour ───

describe("to12Hour", () => {
  test("midnight: 0 → 12", () => {
    expect(to12Hour(0)).toBe(12);
  });

  test("1-12 stay as-is", () => {
    for (let h = 1; h <= 12; h++) {
      expect(to12Hour(h)).toBe(h);
    }
  });

  test("13-23 subtract 12", () => {
    expect(to12Hour(13)).toBe(1);
    expect(to12Hour(18)).toBe(6);
    expect(to12Hour(23)).toBe(11);
  });
});

// ─── formatTimeToKeyedParts ───

describe("formatTimeToKeyedParts", () => {
  // Helper: extract just keys and chars for readable assertions
  const summarize = (parts: ReturnType<typeof formatTimeToKeyedParts>) =>
    parts.map((p) => ({ key: p.key, char: p.char }));

  describe("HH:MM (24h, padded)", () => {
    test("14:30", () => {
      const parts = formatTimeToKeyedParts(14, 30, undefined, true, true);
      const summary = summarize(parts);

      expect(summary).toEqual([
        { key: "h10", char: "1" },
        { key: "h1", char: "4" },
        { key: "sep", char: ":" },
        { key: "m10", char: "3" },
        { key: "m1", char: "0" },
      ]);
    });

    test("09:05 (padded single-digit hour)", () => {
      const parts = formatTimeToKeyedParts(9, 5, undefined, true, true);
      const summary = summarize(parts);

      expect(summary).toEqual([
        { key: "h10", char: "0" },
        { key: "h1", char: "9" },
        { key: "sep", char: ":" },
        { key: "m10", char: "0" },
        { key: "m1", char: "5" },
      ]);
    });
  });

  describe("H:MM (24h, no padding)", () => {
    test("9:30 (single digit hour, no h10)", () => {
      const parts = formatTimeToKeyedParts(9, 30, undefined, true, false);
      const summary = summarize(parts);

      expect(summary).toEqual([
        { key: "h1", char: "9" },
        { key: "sep", char: ":" },
        { key: "m10", char: "3" },
        { key: "m1", char: "0" },
      ]);
    });

    test("10:00 (two-digit hour still shows h10)", () => {
      const parts = formatTimeToKeyedParts(10, 0, undefined, true, false);
      const summary = summarize(parts);

      expect(summary).toEqual([
        { key: "h10", char: "1" },
        { key: "h1", char: "0" },
        { key: "sep", char: ":" },
        { key: "m10", char: "0" },
        { key: "m1", char: "0" },
      ]);
    });
  });

  describe("HH:MM:SS", () => {
    test("14:30:45", () => {
      const parts = formatTimeToKeyedParts(14, 30, 45, true, true);
      const keys = parts.map((p) => p.key);

      expect(keys).toEqual(["h10", "h1", "sep", "m10", "m1", "sep2", "s10", "s1"]);
    });
  });

  describe("MM:SS (countdown, no hours)", () => {
    test("5:30 countdown", () => {
      const parts = formatTimeToKeyedParts(undefined, 5, 30, true, true);
      const summary = summarize(parts);

      expect(summary).toEqual([
        { key: "m10", char: "0" },
        { key: "m1", char: "5" },
        { key: "sep2", char: ":" },
        { key: "s10", char: "3" },
        { key: "s1", char: "0" },
      ]);
    });
  });

  describe("12-hour format", () => {
    test("14:30 → 2:30 PM", () => {
      const parts = formatTimeToKeyedParts(14, 30, undefined, false, false);
      const chars = parts.map((p) => p.char).join("");

      expect(chars).toBe("2:30 PM");
    });

    test("0:00 → 12:00 AM (midnight)", () => {
      const parts = formatTimeToKeyedParts(0, 0, undefined, false, false);
      const chars = parts.map((p) => p.char).join("");

      expect(chars).toBe("12:00 AM");
    });

    test("12:00 → 12:00 PM (noon)", () => {
      const parts = formatTimeToKeyedParts(12, 0, undefined, false, false);
      const chars = parts.map((p) => p.char).join("");

      expect(chars).toBe("12:00 PM");
    });

    test("AM/PM characters have value-dependent keys", () => {
      const amParts = formatTimeToKeyedParts(9, 0, undefined, false, false);
      const pmParts = formatTimeToKeyedParts(14, 0, undefined, false, false);

      const amKeys = amParts.filter((p) => p.key.startsWith("ampm:"));
      const pmKeys = pmParts.filter((p) => p.key.startsWith("ampm:"));

      // AM keys: ampm:AM:0, ampm:AM:1
      expect(amKeys.map((p) => p.key)).toEqual(["ampm:AM:0", "ampm:AM:1"]);
      // PM keys: ampm:PM:0, ampm:PM:1
      expect(pmKeys.map((p) => p.key)).toEqual(["ampm:PM:0", "ampm:PM:1"]);
    });

    test("23:59 → 11:59 PM", () => {
      const parts = formatTimeToKeyedParts(23, 59, undefined, false, false);
      const chars = parts.map((p) => p.char).join("");

      expect(chars).toBe("11:59 PM");
    });
  });

  describe("digit values", () => {
    test("all digit parts have correct digitValue", () => {
      const parts = formatTimeToKeyedParts(14, 30, 45, true, true);
      const digits = parts.filter((p) => p.type === "digit");

      const values: Record<string, number> = {};
      for (const d of digits) {
        values[d.key] = d.digitValue;
      }

      expect(values).toEqual({
        h10: 1,
        h1: 4,
        m10: 3,
        m1: 0,
        s10: 4,
        s1: 5,
      });
    });

    test("symbol parts have digitValue -1", () => {
      const parts = formatTimeToKeyedParts(14, 30, 45, true, true);
      const symbols = parts.filter((p) => p.type === "symbol");

      for (const s of symbols) {
        expect(s.digitValue).toBe(-1);
      }
    });
  });
});
