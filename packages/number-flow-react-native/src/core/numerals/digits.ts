import { HANIDEC_DIGITS, LATIN_ZERO, ZERO_CODEPOINTS } from "./tables";

const digitStringsCache = new Map<string, string[]>();

/**
 * Returns the numeric value (0-9) of a hanidec character code,
 * or -1 if the code is not a hanidec digit.
 *
 * Uses a switch with literal hex values (not the HANIDEC_CODEPOINTS array)
 * to guarantee safe serialization in Reanimated worklets.
 */
export function hanidecDigitValue(charCode: number): number {
  "worklet";
  switch (charCode) {
    case 0x3007: return 0;  // 〇
    case 0x4e00: return 1;  // 一
    case 0x4e8c: return 2;  // 二
    case 0x4e09: return 3;  // 三
    case 0x56db: return 4;  // 四
    case 0x4e94: return 5;  // 五
    case 0x516d: return 6;  // 六
    case 0x4e03: return 7;  // 七
    case 0x516b: return 8;  // 八
    case 0x4e5d: return 9;  // 九
    default: return -1;
  }
}

/**
 * Returns the Unicode codepoint of digit zero for a numbering system.
 * Falls back to Latin (48) for unknown or supplementary-plane systems.
 * For hanidec, returns 0x3007 as a sentinel (digits are non-contiguous).
 */
export function getZeroCodePoint(numberingSystem: string): number {
  return ZERO_CODEPOINTS[numberingSystem] ?? LATIN_ZERO;
}

/**
 * Builds an array of 10 digit strings for a numbering system.
 * digitStrings[0] = zero character, digitStrings[9] = nine character.
 */
export function getDigitStrings(numberingSystem: string): string[] {
  const cached = digitStringsCache.get(numberingSystem);
  if (cached) return cached;

  if (numberingSystem === "hanidec") {
    digitStringsCache.set("hanidec", HANIDEC_DIGITS);
    return HANIDEC_DIGITS;
  }

  const zeroCP = getZeroCodePoint(numberingSystem);
  const strings = Array.from({ length: 10 }, (_, i) => String.fromCharCode(zeroCP + i));

  digitStringsCache.set(numberingSystem, strings);
  return strings;
}

/**
 * Returns the numeric value (0-9) of a character code in the given system,
 * or -1 if the code is not a digit in that system.
 *
 * Worklet-safe. Handles hanidec (non-contiguous) via sentinel zeroCodePoint = 0x3007.
 */
export function localeDigitValue(charCode: number, zeroCodePoint: number): number {
  "worklet";
  if (zeroCodePoint === 0x3007) return hanidecDigitValue(charCode);

  const value = charCode - zeroCodePoint;
  return value >= 0 && value <= 9 ? value : -1;
}

/**
 * Checks if a character code is a digit in the given numbering system.
 * Worklet-safe. Handles hanidec via sentinel zeroCodePoint = 0x3007.
 */
export function isLocaleDigit(charCode: number, zeroCodePoint: number): boolean {
  "worklet";
  return localeDigitValue(charCode, zeroCodePoint) >= 0;
}

/**
 * Checks if a single character is a digit in the given numbering system.
 * Convenience wrapper over localeDigitValue for string-based callers.
 * Worklet-safe.
 */
export function isDigitChar(char: string, zeroCodePoint = 48): boolean {
  "worklet";
  return localeDigitValue(char.charCodeAt(0), zeroCodePoint) >= 0;
}

/**
 * Counts the number of digit characters in a string for a given numbering system.
 * Worklet-safe.
 */
export function countDigits(text: string, zeroCodePoint: number): number {
  "worklet";
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (localeDigitValue(text.charCodeAt(i), zeroCodePoint) >= 0) count++;
  }
  return count;
}
