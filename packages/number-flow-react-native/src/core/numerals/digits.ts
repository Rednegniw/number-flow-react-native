import {
  HANIDEC_CODEPOINTS,
  HANIDEC_DIGITS,
  HANIDEC_ZERO,
  LATIN_ZERO,
  ZERO_CODEPOINTS,
} from "./tables";

const digitStringsCache = new Map<string, string[]>();

/**
 * Returns the numeric value (0-9) of a hanidec character code,
 * or -1 if the code is not a hanidec digit.
 */
export function hanidecDigitValue(charCode: number): number {
  for (let i = 0; i < 10; i++) {
    if (HANIDEC_CODEPOINTS[i] === charCode) return i;
  }
  return -1;
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
  const strings = Array.from({ length: 10 }, (_, i) =>
    String.fromCharCode(zeroCP + i),
  );

  digitStringsCache.set(numberingSystem, strings);
  return strings;
}

/**
 * Returns the numeric value (0-9) of a character code in the given system,
 * or -1 if the code is not a digit in that system.
 * Handles hanidec (non-contiguous) via sentinel zeroCodePoint = 0x3007.
 */
export function localeDigitValue(
  charCode: number,
  zeroCodePoint: number,
): number {
  if (zeroCodePoint === HANIDEC_ZERO) return hanidecDigitValue(charCode);

  const value = charCode - zeroCodePoint;
  return value >= 0 && value <= 9 ? value : -1;
}

/**
 * Checks if a character code is a digit in the given numbering system.
 * Handles hanidec (non-contiguous) via sentinel zeroCodePoint = 0x3007.
 */
export function isLocaleDigit(
  charCode: number,
  zeroCodePoint: number,
): boolean {
  if (zeroCodePoint === HANIDEC_ZERO) return hanidecDigitValue(charCode) >= 0;

  const value = charCode - zeroCodePoint;
  return value >= 0 && value <= 9;
}
