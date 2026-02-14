import {
  getOrCreateFormatter,
  getFormatCharacters,
  fallbackFormatToParts,
  formatToKeyedParts,
} from "../src/core/useNumberFormatting";

// ─── getOrCreateFormatter ───

describe("getOrCreateFormatter", () => {
  test("returns an Intl.NumberFormat instance", () => {
    const fmt = getOrCreateFormatter("en-US");
    expect(fmt).toBeInstanceOf(Intl.NumberFormat);
  });

  test("caches instances for same locales + format", () => {
    const a = getOrCreateFormatter("en-US", { minimumFractionDigits: 2 });
    const b = getOrCreateFormatter("en-US", { minimumFractionDigits: 2 });
    expect(a).toBe(b);
  });

  test("different options create different instances", () => {
    const a = getOrCreateFormatter("en-US", { minimumFractionDigits: 1 });
    const b = getOrCreateFormatter("en-US", { minimumFractionDigits: 3 });
    expect(a).not.toBe(b);
  });
});

// ─── getFormatCharacters ───

describe("getFormatCharacters", () => {
  test("returns string of non-standard chars", () => {
    const chars = getFormatCharacters("en-US");
    expect(typeof chars).toBe("string");
  });

  test("prefix and suffix characters are included", () => {
    const chars = getFormatCharacters("en-US", undefined, "★", "♦");
    expect(chars).toContain("★");
    expect(chars).toContain("♦");
  });
});

// ─── fallbackFormatToParts ───

describe("fallbackFormatToParts", () => {
  test("simple integer", () => {
    const fmt = new Intl.NumberFormat("en-US");
    const parts = fallbackFormatToParts(fmt, 42, "en-US");

    const integerParts = parts.filter((p) => p.type === "integer");
    expect(integerParts.map((p) => p.value).join("")).toBe("42");
  });

  test("decimal number splits at decimal point", () => {
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = fallbackFormatToParts(fmt, 3.14, "en-US");

    const types = parts.map((p) => p.type);
    expect(types).toContain("integer");
    expect(types).toContain("decimal");
    expect(types).toContain("fraction");
  });

  test("negative number has minusSign part", () => {
    const fmt = new Intl.NumberFormat("en-US");
    const parts = fallbackFormatToParts(fmt, -5, "en-US");

    const hasMinus = parts.some((p) => p.type === "minusSign");
    expect(hasMinus).toBe(true);
  });

  test("grouped number has group separators", () => {
    const fmt = new Intl.NumberFormat("en-US", { useGrouping: true });
    const parts = fallbackFormatToParts(fmt, 1234567, "en-US");

    const groups = parts.filter((p) => p.type === "group");
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].value).toBe(",");
  });

  test("matches native formatToParts structure", () => {
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
    });

    const native = fmt.formatToParts(1234.56);
    const fallback = fallbackFormatToParts(fmt, 1234.56, "en-US");

    // Same number of parts
    expect(fallback.length).toBe(native.length);

    // Same type sequence
    expect(fallback.map((p) => p.type)).toEqual(native.map((p) => p.type));

    // Same concatenated output
    expect(fallback.map((p) => p.value).join("")).toBe(
      native.map((p) => p.value).join(""),
    );
  });
});

// ─── formatToKeyedParts ───

describe("formatToKeyedParts", () => {
  const defaultFormatter = new Intl.NumberFormat("en-US");

  test("simple integer: digits keyed RTL", () => {
    const parts = formatToKeyedParts(42, defaultFormatter, "en-US");

    const digits = parts.filter((p) => p.type === "digit");
    // 42: tens=4, ones=2
    expect(digits).toHaveLength(2);
    // RTL keying: rightmost digit is integer:0 (ones)
    expect(digits[1].key).toBe("integer:0");
    expect(digits[1].digitValue).toBe(2);
    expect(digits[0].key).toBe("integer:1");
    expect(digits[0].digitValue).toBe(4);
  });

  test("large number: group separators keyed RTL alongside digits", () => {
    const fmt = new Intl.NumberFormat("en-US", { useGrouping: true });
    const parts = formatToKeyedParts(1234, fmt, "en-US");

    // 1,234: four digits + one group separator
    const digitKeys = parts
      .filter((p) => p.type === "digit")
      .map((p) => p.key);

    // integer:0=4, integer:1=3, integer:2=2, integer:3=1
    expect(digitKeys).toEqual([
      "integer:3",
      "integer:2",
      "integer:1",
      "integer:0",
    ]);
  });

  test("decimal number: fraction digits keyed LTR", () => {
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const parts = formatToKeyedParts(3.14, fmt, "en-US");

    const fractionDigits = parts.filter((p) => p.key.startsWith("fraction:"));
    // fraction:0=1 (tenths), fraction:1=4 (hundredths)
    expect(fractionDigits).toHaveLength(2);
    expect(fractionDigits[0].key).toBe("fraction:0");
    expect(fractionDigits[0].digitValue).toBe(1);
    expect(fractionDigits[1].key).toBe("fraction:1");
    expect(fractionDigits[1].digitValue).toBe(4);
  });

  test("prefix is added at the start", () => {
    const parts = formatToKeyedParts(42, defaultFormatter, "en-US", "$");

    expect(parts[0].key).toBe("prefix:0");
    expect(parts[0].char).toBe("$");
    expect(parts[0].type).toBe("symbol");
  });

  test("suffix is added at the end", () => {
    const parts = formatToKeyedParts(42, defaultFormatter, "en-US", "", "%");

    const last = parts[parts.length - 1];
    expect(last.key).toBe("suffix:0");
    expect(last.char).toBe("%");
    expect(last.type).toBe("symbol");
  });

  test("single digit: ones place is integer:0", () => {
    const parts = formatToKeyedParts(7, defaultFormatter, "en-US");
    const digits = parts.filter((p) => p.type === "digit");

    expect(digits).toHaveLength(1);
    expect(digits[0].key).toBe("integer:0");
    expect(digits[0].digitValue).toBe(7);
  });

  test("zero is a valid value", () => {
    const parts = formatToKeyedParts(0, defaultFormatter, "en-US");
    const digits = parts.filter((p) => p.type === "digit");

    expect(digits).toHaveLength(1);
    expect(digits[0].digitValue).toBe(0);
  });

  test("each part has a single character", () => {
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      useGrouping: true,
    });
    const parts = formatToKeyedParts(1234.56, fmt, "en-US", "$", "!");

    for (const part of parts) {
      expect(part.char.length).toBe(1);
    }
  });

  test("concatenated output matches formatted string with prefix/suffix", () => {
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
    });
    const parts = formatToKeyedParts(1234.56, fmt, "en-US", "$", "!");
    const result = parts.map((p) => p.char).join("");

    expect(result).toBe("$" + fmt.format(1234.56) + "!");
  });
});
