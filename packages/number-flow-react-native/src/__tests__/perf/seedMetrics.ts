import { DEFAULT_FONT_SIZE } from "../../core/constants";
import { getFormatCharacters } from "../../core/intlHelpers";
import type { GlyphMetrics } from "../../core/types";
import { buildCharSet, cacheKey, metricsCache } from "../../native/glyphMetricsShared";

/**
 * Seeds the glyph metrics cache with synthetic metrics so NumberFlow renders
 * its slot tree synchronously in tests (onTextLayout never fires in Jest).
 * Uniform widths by default; `narrowOne` makes "1" narrower to exercise
 * proportional-width x positions.
 */
export function seedSyntheticMetrics(
  format?: Intl.NumberFormatOptions,
  opts?: { narrowOne?: boolean },
): void {
  const formatChars = getFormatCharacters(undefined, format, "", "");
  const charSet = buildCharSet(formatChars);

  const charWidths: Record<string, number> = {};
  const charBounds: Record<string, { top: number; bottom: number }> = {};
  for (const ch of charSet) {
    charWidths[ch] = opts?.narrowOne && ch === "1" ? 6 : 10;
    charBounds[ch] = { top: -14, bottom: 0 };
  }

  const metrics: GlyphMetrics = {
    charWidths,
    maxDigitWidth: 10,
    lineHeight: 24,
    ascent: -16,
    descent: 4,
    charBounds,
  };

  metricsCache.set(cacheKey({ fontSize: DEFAULT_FONT_SIZE }, formatChars), metrics);
}
