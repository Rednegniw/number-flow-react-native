import type { SkFont } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { MEASURABLE_CHARS } from "../core/constants";
import type { GlyphMetrics } from "../core/types";

/**
 * Pre-computes glyph width lookup table and line metrics from an SkFont.
 * Runs once on font load. All measurements use advance widths (not bounding boxes)
 * for correct text layout spacing.
 *
 * Digit slots use `maxDigitWidth` (the widest of 0-9) for the clip window
 * so all 10 digit glyphs fit during rolling. Individual digit positions
 * within the clip use proportional charWidths for natural spacing.
 *
 * @param font - The SkFont to measure
 * @param additionalChars - Optional additional characters to measure (e.g., from prefix/suffix with diacritics)
 */
export function useGlyphMetrics(
  font: SkFont | null,
  additionalChars?: string,
  localeDigitStrings?: string[],
): GlyphMetrics | null {
  return useMemo(() => {
    if (!font) return null;

    /**
     * Combine base chars with any additional chars from prefix/suffix so
     * diacritics and special characters get proper width measurements.
     */
    let charsToMeasure = MEASURABLE_CHARS;
    if (additionalChars) {
      const uniqueAdditional = additionalChars
        .split("")
        .filter((c) => !MEASURABLE_CHARS.includes(c))
        .join("");
      if (uniqueAdditional) {
        charsToMeasure = MEASURABLE_CHARS + uniqueAdditional;
      }
    }

    const glyphIDs = font.getGlyphIDs(charsToMeasure);
    const widths = font.getGlyphWidths(glyphIDs);

    const charWidths: Record<string, number> = {};
    for (let i = 0; i < charsToMeasure.length; i++) {
      charWidths[charsToMeasure[i]] = widths[i];
    }

    let maxDigitWidth = 0;
    const digitChars = localeDigitStrings ?? Array.from({ length: 10 }, (_, d) => String(d));
    for (const dc of digitChars) {
      const w = charWidths[dc] ?? 0;
      if (w > maxDigitWidth) maxDigitWidth = w;
    }

    const metrics = font.getMetrics();
    // ascent is negative (above baseline), descent is positive (below baseline)
    const lineHeight = Math.ceil(metrics.descent - metrics.ascent);

    // Per-character tight vertical bounds from measureText SkRect.
    // rect.y = top of glyph (negative = above baseline),
    // rect.y + rect.height = bottom of glyph (positive = below baseline).
    const charBounds: Record<string, { top: number; bottom: number }> = {};
    for (let i = 0; i < charsToMeasure.length; i++) {
      const char = charsToMeasure[i];
      const rect = font.measureText(char);
      charBounds[char] = { top: rect.y, bottom: rect.y + rect.height };
    }

    return {
      charWidths,
      maxDigitWidth,
      lineHeight,
      ascent: metrics.ascent,
      descent: metrics.descent,
      charBounds,
    };
  }, [font, additionalChars, localeDigitStrings]);
}
