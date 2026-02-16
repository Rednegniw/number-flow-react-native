import {
  CLDR_DEFAULT_NUMBERING,
  HANIDEC_ZERO,
  LATIN_ZERO,
  ZERO_CODEPOINTS,
} from "./tables";
import { hanidecDigitValue } from "./digits";

const numberingSystemCache = new Map<string, string>();

/**
 * Looks up the CLDR-expected numbering system for a locale.
 * Checks explicit -u-nu- extension, then exact match (e.g. "ar-EG"),
 * then language subtag (e.g. "ar").
 * Returns undefined if the locale defaults to "latn".
 */
function getExpectedNumberingSystem(
  locales?: Intl.LocalesArgument,
): string | undefined {
  if (!locales) return undefined;

  const tag = String(locales);

  // Parse explicit Unicode extension: "th-TH-u-nu-thai" → "thai"
  const nuMatch = tag.match(/-u-nu-([a-z]+)/);
  if (nuMatch) {
    return nuMatch[1] === "latn" ? undefined : nuMatch[1];
  }

  const exact = CLDR_DEFAULT_NUMBERING[tag];
  if (exact) return exact;

  // Try language subtag only (strip region): "ar-EG" → "ar"
  const dashIdx = tag.indexOf("-");
  if (dashIdx > 0) {
    return CLDR_DEFAULT_NUMBERING[tag.slice(0, dashIdx)];
  }

  return undefined;
}

/**
 * Scans a formatted number string and detects which numbering system's
 * digits are actually present. Returns the zero codepoint of the detected
 * system, or LATIN_ZERO if only Latin digits (or no digits) are found.
 *
 * Handles hanidec (non-contiguous ideographs) separately from contiguous systems.
 */
export function detectOutputZeroCp(formattedStr: string): number {
  for (let i = 0; i < formattedStr.length; i++) {
    const code = formattedStr.charCodeAt(i);

    // Skip Latin digits — we want to detect non-Latin systems
    if (code >= LATIN_ZERO && code <= LATIN_ZERO + 9) continue;

    // Check hanidec (non-contiguous codepoints)
    if (hanidecDigitValue(code) >= 0) return HANIDEC_ZERO;

    // Check all contiguous systems (skip latn and hanidec)
    for (const system in ZERO_CODEPOINTS) {
      if (system === "latn" || system === "hanidec") continue;
      const zeroCp = ZERO_CODEPOINTS[system];
      if (code >= zeroCp && code <= zeroCp + 9) return zeroCp;
    }
  }

  return LATIN_ZERO;
}

/**
 * Detects the numbering system for a locale/format combination.
 *
 * Strategy: query the platform first (resolvedOptions), then verify by
 * formatting a probe. If the platform reports "latn" but the CLDR table
 * says otherwise (common on Hermes), use the CLDR value.
 */
export function detectNumberingSystem(
  locales?: Intl.LocalesArgument,
  format?: Intl.NumberFormatOptions,
): string {
  const key = JSON.stringify([locales, format]);
  const cached = numberingSystemCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locales ?? undefined, format);
  const platformSystem = formatter.resolvedOptions().numberingSystem;

  // If the platform reports a known non-latn system, trust it
  if (platformSystem && platformSystem !== "latn") {
    numberingSystemCache.set(key, platformSystem);
    return platformSystem;
  }

  // Platform says "latn" or undefined — check if the locale expects something else
  const expected = getExpectedNumberingSystem(locales);
  if (!expected) {
    numberingSystemCache.set(key, "latn");
    return "latn";
  }

  // Verify by checking the actual formatted output
  const probe = formatter.format(1234567890);
  const outputZeroCp = detectOutputZeroCp(probe);

  if (outputZeroCp !== LATIN_ZERO) {
    // Platform does output non-Latin digits; find the matching system name
    for (const system in ZERO_CODEPOINTS) {
      if (ZERO_CODEPOINTS[system] === outputZeroCp) {
        numberingSystemCache.set(key, system);
        return system;
      }
    }
  }

  // Platform truly outputs Latin digits — use the CLDR expected system
  // so digitStrings render the correct locale characters on the wheel
  numberingSystemCache.set(key, expected);
  return expected;
}
