import { MEASURABLE_CHARS } from "../core/constants";

// Combines MEASURABLE_CHARS with additional chars, deduplicating
export function buildCharSet(additionalChars?: string): string {
  if (!additionalChars) return MEASURABLE_CHARS;
  const unique = Array.from(additionalChars).filter((c) => !MEASURABLE_CHARS.includes(c));
  return unique.length > 0 ? MEASURABLE_CHARS + unique.join("") : MEASURABLE_CHARS;
}

/**
 * Key: "fontFamily:fontSize", Value: measured GlyphMetrics.
 * Once measured for a given font config, subsequent mounts return instantly.
 */
export const metricsCache = new Map<string, import("../core/types").GlyphMetrics>();

export function cacheKey(
  style: { fontFamily?: string; fontSize: number },
  additionalChars?: string,
): string {
  const base = `${style.fontFamily}:${style.fontSize}`;
  return additionalChars ? `${base}:${additionalChars}` : base;
}

// ASCII characters known to have no descender (bottom = 0)
export const NO_DESCENDER = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:%+-~°!^*×/$€£¥₩ \u00A0");

/**
 * Estimates per-character vertical bounds using font-level metrics.
 * Top: -capHeight for all chars (precise for digits, safe overestimate for smaller glyphs).
 * Bottom: 0 for known no-descender chars (+ locale digits), full descent otherwise.
 */
export function estimateCharBounds(
  charSet: string,
  descent: number,
  capHeight: number,
  localeDigitStrings?: string[],
): Record<string, { top: number; bottom: number }> {
  const noDescender = new Set(NO_DESCENDER);
  if (localeDigitStrings) {
    for (const d of localeDigitStrings) noDescender.add(d);
  }

  const bounds: Record<string, { top: number; bottom: number }> = {};
  const top = -capHeight;

  for (let i = 0; i < charSet.length; i++) {
    const bottom = noDescender.has(charSet[i]) ? 0 : descent;
    bounds[charSet[i]] = { top, bottom };
  }

  return bounds;
}
