import { computeKeyedLayout, computeStringLayout } from "../src/core/layout";
import { computeTimeStringLayout } from "../src/core/timeLayout";
import type { GlyphMetrics, KeyedPart } from "../src/core/types";

// Shared mock metrics: all characters 10px wide, digits 12px
const metrics: GlyphMetrics = {
  charWidths: {
    "0": 12, "1": 12, "2": 12, "3": 12, "4": 12,
    "5": 12, "6": 12, "7": 12, "8": 12, "9": 12,
    ":": 6, ".": 6, ",": 6, " ": 8,
    "$": 10, "%": 10, "-": 8,
    "A": 10, "M": 12, "P": 10,
  },
  maxDigitWidth: 12,
  lineHeight: 20,
  ascent: 16,
  descent: 4,
};

function digit(key: string, value: number): KeyedPart {
  return { key, type: "digit", char: String(value), digitValue: value };
}

function symbol(key: string, char: string): KeyedPart {
  return { key, type: "symbol", char, digitValue: -1 };
}

// ─── computeKeyedLayout ───

describe("computeKeyedLayout", () => {
  test("left alignment: first char starts at x=0", () => {
    const parts = [digit("integer:1", 4), digit("integer:0", 2)];
    const layout = computeKeyedLayout(parts, metrics, 200, "left");

    expect(layout[0].x).toBe(0);
    expect(layout[1].x).toBe(12);
  });

  test("right alignment: last char ends at totalWidth", () => {
    const parts = [digit("integer:1", 4), digit("integer:0", 2)];
    const layout = computeKeyedLayout(parts, metrics, 200, "right");

    const lastChar = layout[layout.length - 1];
    expect(lastChar.x + lastChar.width).toBe(200);
  });

  test("center alignment: content is centered", () => {
    const parts = [digit("integer:1", 4), digit("integer:0", 2)];
    const contentWidth = 24;
    const layout = computeKeyedLayout(parts, metrics, 200, "center");

    expect(layout[0].x).toBe((200 - contentWidth) / 2);
  });

  test("preserves keyed part metadata", () => {
    const parts = [
      symbol("prefix:0", "$"),
      digit("integer:0", 5),
    ];
    const layout = computeKeyedLayout(parts, metrics, 100, "left");

    expect(layout[0].key).toBe("prefix:0");
    expect(layout[0].isDigit).toBe(false);
    expect(layout[1].key).toBe("integer:0");
    expect(layout[1].isDigit).toBe(true);
    expect(layout[1].digitValue).toBe(5);
  });

  test("uses charWidths from metrics", () => {
    const parts = [symbol("prefix:0", "$"), digit("integer:0", 1)];
    const layout = computeKeyedLayout(parts, metrics, 100, "left");

    expect(layout[0].width).toBe(10);
    expect(layout[1].width).toBe(12);
  });
});

// ─── computeStringLayout ───

describe("computeStringLayout", () => {
  test("generates positional keys", () => {
    const layout = computeStringLayout("42", metrics, 100, "left");

    expect(layout[0].key).toBe("pos:0");
    expect(layout[1].key).toBe("pos:1");
  });

  test("detects digit characters", () => {
    const layout = computeStringLayout("$5", metrics, 100, "left");

    expect(layout[0].isDigit).toBe(false);
    expect(layout[1].isDigit).toBe(true);
    expect(layout[1].digitValue).toBe(5);
  });
});

// ─── computeTimeStringLayout ───

describe("computeTimeStringLayout", () => {
  test("HH:MM:SS assigns semantic keys", () => {
    const layout = computeTimeStringLayout(
      "14:30:45", metrics, 200, "left", true, true,
    );
    const keys = layout.map((c) => c.key);

    expect(keys).toEqual([
      "h10", "h1", "sep", "m10", "m1", "sep2", "s10", "s1",
    ]);
  });

  test("HH:MM without seconds", () => {
    const layout = computeTimeStringLayout(
      "14:30", metrics, 200, "left", true, false,
    );
    const keys = layout.map((c) => c.key);

    expect(keys).toEqual(["h10", "h1", "sep", "m10", "m1"]);
  });

  test("MM:SS countdown mode (no hours)", () => {
    const layout = computeTimeStringLayout(
      "05:30", metrics, 200, "left", false, true,
    );
    const keys = layout.map((c) => c.key);

    expect(keys).toEqual(["m10", "m1", "sep2", "s10", "s1"]);
  });

  test("single-digit hour: only h1, no h10", () => {
    const layout = computeTimeStringLayout(
      "9:30", metrics, 200, "left", true, false,
    );
    const keys = layout.map((c) => c.key);

    expect(keys).toEqual(["h1", "sep", "m10", "m1"]);
  });

  test("AM/PM suffix parsed correctly", () => {
    const layout = computeTimeStringLayout(
      "2:30 PM", metrics, 200, "left", true, false,
    );
    const keys = layout.map((c) => c.key);

    expect(keys).toEqual([
      "h1", "sep", "m10", "m1", "ampm-sp", "ampm:PM:0", "ampm:PM:1",
    ]);
  });

  test("digit values are correct", () => {
    const layout = computeTimeStringLayout(
      "14:30", metrics, 200, "left", true, false,
    );

    const digitEntries = layout.filter((c) => c.isDigit);
    const values = digitEntries.map((c) => ({ key: c.key, val: c.digitValue }));

    expect(values).toEqual([
      { key: "h10", val: 1 },
      { key: "h1", val: 4 },
      { key: "m10", val: 3 },
      { key: "m1", val: 0 },
    ]);
  });
});
