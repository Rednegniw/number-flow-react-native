export const MAX_SLOTS = 20;

export const DIGIT_COUNT = 10;

// Fallback character set for glyph measurement when the actual format characters are unknown
export const MEASURABLE_CHARS =
  "0123456789.,%+-$/:! €£¥₩abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~°";

// Avoids allocating new strings in hot animation paths
export const DIGIT_STRINGS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

/**
 * Vertical mask fade height as a ratio of lineHeight.
 * Matches web NumberFlow's --number-flow-mask-height: 0.25em
 */
export const MASK_HEIGHT_RATIO = 0.25;

/**
 * Horizontal mask fade width as a ratio of lineHeight.
 * Matches web NumberFlow's --number-flow-mask-width: 0.5em
 */
export const MASK_WIDTH_RATIO = 0.5;

/**
 * Superscript exponent rendering scale derived from OpenType font metrics.
 * Inter font OS/2 table: ySuperscriptYSize = 1229/2048 ≈ 0.60.
 * Consistent with TeX (\defaultscriptratio=0.7) and general typography convention (60-70%).
 */
export const SUPERSCRIPT_SCALE = 0.6;
