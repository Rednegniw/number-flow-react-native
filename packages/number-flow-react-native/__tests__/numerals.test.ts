import {
  detectNumberingSystem,
  detectOutputZeroCp,
  getZeroCodePoint,
  getDigitStrings,
  localeDigitValue,
  isLocaleDigit,
} from "../src/core/numerals";

// ─── detectNumberingSystem ───

describe("detectNumberingSystem", () => {
  test("English uses latn", () => {
    expect(detectNumberingSystem("en-US")).toBe("latn");
  });

  test("Arabic (Egypt) uses arab", () => {
    expect(detectNumberingSystem("ar-EG")).toBe("arab");
  });

  test("Persian uses arabext", () => {
    expect(detectNumberingSystem("fa-IR")).toBe("arabext");
  });

  test("Bengali uses beng", () => {
    expect(detectNumberingSystem("bn-BD")).toBe("beng");
  });

  test("Nepali uses deva", () => {
    expect(detectNumberingSystem("ne-NP")).toBe("deva");
  });

  test("forcing -u-nu-latn overrides to Latin", () => {
    expect(detectNumberingSystem("ar-EG-u-nu-latn")).toBe("latn");
  });

  test("-u-nu-thai requests Thai digits", () => {
    expect(detectNumberingSystem("th-TH-u-nu-thai")).toBe("thai");
  });

  test("-u-nu-hanidec requests CJK ideographic digits", () => {
    expect(detectNumberingSystem("zh-CN-u-nu-hanidec")).toBe("hanidec");
  });

  test("caches repeat calls (same reference)", () => {
    const a = detectNumberingSystem("en-US");
    const b = detectNumberingSystem("en-US");
    expect(a).toBe(b);
  });
});

// ─── getZeroCodePoint ───

describe("getZeroCodePoint", () => {
  test("latn → 0x0030 (48)", () => {
    expect(getZeroCodePoint("latn")).toBe(0x0030);
  });

  test("arab → 0x0660", () => {
    expect(getZeroCodePoint("arab")).toBe(0x0660);
  });

  test("arabext → 0x06F0", () => {
    expect(getZeroCodePoint("arabext")).toBe(0x06f0);
  });

  test("beng → 0x09E6", () => {
    expect(getZeroCodePoint("beng")).toBe(0x09e6);
  });

  test("deva → 0x0966", () => {
    expect(getZeroCodePoint("deva")).toBe(0x0966);
  });

  test("mymr → 0x1040", () => {
    expect(getZeroCodePoint("mymr")).toBe(0x1040);
  });

  test("hanidec → 0x3007 (sentinel)", () => {
    expect(getZeroCodePoint("hanidec")).toBe(0x3007);
  });

  test("unknown system falls back to Latin", () => {
    expect(getZeroCodePoint("nonexistent")).toBe(0x0030);
  });
});

// ─── getDigitStrings ───

describe("getDigitStrings", () => {
  test("latn returns ASCII digits", () => {
    expect(getDigitStrings("latn")).toEqual([
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ]);
  });

  test("arab returns Arabic-Indic digits", () => {
    const digits = getDigitStrings("arab");
    expect(digits).toHaveLength(10);
    expect(digits[0]).toBe("٠");
    expect(digits[9]).toBe("٩");
  });

  test("deva returns Devanagari digits", () => {
    const digits = getDigitStrings("deva");
    expect(digits).toHaveLength(10);
    expect(digits[0]).toBe("०");
    expect(digits[9]).toBe("९");
  });

  test("beng returns Bengali digits", () => {
    const digits = getDigitStrings("beng");
    expect(digits).toHaveLength(10);
    expect(digits[0]).toBe("০");
    expect(digits[9]).toBe("৯");
  });

  test("hanidec returns CJK ideographic digits", () => {
    const digits = getDigitStrings("hanidec");
    expect(digits).toHaveLength(10);
    expect(digits[0]).toBe("〇");
    expect(digits[1]).toBe("一");
    expect(digits[5]).toBe("五");
    expect(digits[9]).toBe("九");
  });

  test("caches repeat calls (same reference)", () => {
    const a = getDigitStrings("arab");
    const b = getDigitStrings("arab");
    expect(a).toBe(b);
  });

  test("always returns exactly 10 elements", () => {
    const systems = ["latn", "arab", "arabext", "beng", "deva", "mymr", "thai", "hanidec"];
    for (const sys of systems) {
      expect(getDigitStrings(sys)).toHaveLength(10);
    }
  });
});

// ─── detectOutputZeroCp ───

describe("detectOutputZeroCp", () => {
  test("Latin string → 0x0030", () => {
    expect(detectOutputZeroCp("1,234.56")).toBe(0x0030);
  });

  test("Arabic string → 0x0660", () => {
    expect(detectOutputZeroCp("١٬٢٣٤٫٥٦")).toBe(0x0660);
  });

  test("Extended Arabic string → 0x06F0", () => {
    expect(detectOutputZeroCp("۱٬۲۳۴٫۵۶")).toBe(0x06f0);
  });

  test("Bengali string → 0x09E6", () => {
    expect(detectOutputZeroCp("১,২৩৪.৫৬")).toBe(0x09e6);
  });

  test("Devanagari string → 0x0966", () => {
    expect(detectOutputZeroCp("१,२३४.५६")).toBe(0x0966);
  });

  test("Myanmar string → 0x1040", () => {
    expect(detectOutputZeroCp("၁,၂၃၄.၅၆")).toBe(0x1040);
  });

  test("no digits → falls back to Latin", () => {
    expect(detectOutputZeroCp("$,.")).toBe(0x0030);
  });

  test("empty string → falls back to Latin", () => {
    expect(detectOutputZeroCp("")).toBe(0x0030);
  });

  test("mixed Latin and non-digit → Latin", () => {
    expect(detectOutputZeroCp("$1,234.56")).toBe(0x0030);
  });

  test("hanidec string → 0x3007 (sentinel)", () => {
    expect(detectOutputZeroCp("一,二三四.五六")).toBe(0x3007);
  });

  test("single hanidec digit detected", () => {
    expect(detectOutputZeroCp("〇")).toBe(0x3007);
  });
});

// ─── localeDigitValue ───

describe("localeDigitValue", () => {
  test("Latin digits: '0' → 0, '9' → 9", () => {
    expect(localeDigitValue(0x0030, 0x0030)).toBe(0);
    expect(localeDigitValue(0x0039, 0x0030)).toBe(9);
  });

  test("Arabic digits: ٠ → 0, ٩ → 9", () => {
    expect(localeDigitValue(0x0660, 0x0660)).toBe(0);
    expect(localeDigitValue(0x0669, 0x0660)).toBe(9);
    expect(localeDigitValue(0x0665, 0x0660)).toBe(5);
  });

  test("hanidec digits: 〇 → 0, 九 → 9", () => {
    expect(localeDigitValue(0x3007, 0x3007)).toBe(0);  // 〇
    expect(localeDigitValue(0x4e00, 0x3007)).toBe(1);  // 一
    expect(localeDigitValue(0x4e94, 0x3007)).toBe(5);  // 五
    expect(localeDigitValue(0x4e5d, 0x3007)).toBe(9);  // 九
  });

  test("non-digit returns -1", () => {
    // ASCII 'A' with Latin zero
    expect(localeDigitValue(65, 48)).toBe(-1);
    // ASCII '0' with Arabic zero
    expect(localeDigitValue(48, 0x0660)).toBe(-1);
  });

  test("hanidec non-digit returns -1", () => {
    // Random CJK character that is not a hanidec digit
    expect(localeDigitValue(0x5000, 0x3007)).toBe(-1);
    // Latin '5' with hanidec sentinel
    expect(localeDigitValue(53, 0x3007)).toBe(-1);
  });

  test("negative offset returns -1", () => {
    expect(localeDigitValue(47, 48)).toBe(-1);
  });
});

// ─── isLocaleDigit ───

describe("isLocaleDigit", () => {
  test("Latin digits are recognized", () => {
    for (let i = 0; i <= 9; i++) {
      expect(isLocaleDigit(48 + i, 48)).toBe(true);
    }
  });

  test("Arabic-Indic digits are recognized", () => {
    for (let i = 0; i <= 9; i++) {
      expect(isLocaleDigit(0x0660 + i, 0x0660)).toBe(true);
    }
  });

  test("Latin digits are NOT recognized with Arabic zero", () => {
    expect(isLocaleDigit(48, 0x0660)).toBe(false);
  });

  test("hanidec digits are recognized", () => {
    expect(isLocaleDigit(0x3007, 0x3007)).toBe(true);  // 〇
    expect(isLocaleDigit(0x4e00, 0x3007)).toBe(true);  // 一
    expect(isLocaleDigit(0x4e5d, 0x3007)).toBe(true);  // 九
  });

  test("hanidec rejects non-digit CJK", () => {
    expect(isLocaleDigit(0x5000, 0x3007)).toBe(false);
  });

  test("characters outside 0-9 range are rejected", () => {
    expect(isLocaleDigit(47, 48)).toBe(false);
    expect(isLocaleDigit(58, 48)).toBe(false);
  });
});

