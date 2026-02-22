import { assignXPositions, type CharLayout } from "./layout";
import { isDigitChar, localeDigitValue } from "./numerals";
import type { GlyphMetrics, TextAlign } from "./types";

/**
 * Keys for each digit position within a time segment.
 * Index 0 = tens digit, index 1 = ones digit.
 */
const HOUR_KEYS = ["h10", "h1"] as const;
const MINUTE_KEYS = ["m10", "m1"] as const;
const SECOND_KEYS = ["s10", "s1"] as const;
const CENTISECOND_KEYS = ["c10", "c1"] as const;

function pushChar(
  chars: CharLayout[],
  key: string,
  char: string,
  metrics: GlyphMetrics,
  zeroCodePoint = 48,
): void {
  const isDigit = isDigitChar(char, zeroCodePoint);
  const width = metrics.charWidths[char] ?? metrics.maxDigitWidth;
  chars.push({
    key,
    char,
    isDigit,
    digitValue: isDigit ? localeDigitValue(char.charCodeAt(0), zeroCodePoint) : -1,
    x: 0,
    width,
  });
}

/**
 * Pushes a group of digit characters with the given key array.
 * If the digit string is shorter than the keys array (e.g. single-digit hour),
 * only the last N keys are used (matching the useTimeFormatting behavior where
 * h10 is omitted for single-digit hours).
 */
function pushDigitGroup(
  chars: CharLayout[],
  digits: string,
  keys: readonly string[],
  metrics: GlyphMetrics,
): void {
  const offset = keys.length - digits.length;
  for (let i = 0; i < digits.length; i++) {
    pushChar(chars, keys[offset + i], digits[i], metrics);
  }
}

/**
 * Pushes seconds digits and, if present, the centisecond separator and digits.
 * Handles both "09" (seconds only) and "09.88" (seconds with centiseconds).
 */
function pushSecondsAndCentiseconds(
  chars: CharLayout[],
  segment: string,
  hasCentiseconds: boolean,
  metrics: GlyphMetrics,
): void {
  if (hasCentiseconds && segment.includes(".")) {
    const [secStr, centiStr] = segment.split(".");
    pushDigitGroup(chars, secStr, SECOND_KEYS, metrics);
    pushChar(chars, "csep", ".", metrics);
    pushDigitGroup(chars, centiStr, CENTISECOND_KEYS, metrics);
  } else {
    pushDigitGroup(chars, segment, SECOND_KEYS, metrics);
  }
}

/**
 * Computes time-aware string layout with fixed semantic keys.
 *
 * Assigns fixed semantic keys (h10, h1, sep, m10, m1, etc.) rather than
 * positional keys. This ensures worklet-driven updates produce stable
 * keys that match prop-driven updates from `useTimeFormatting`.
 *
 * @param timeString - Formatted time string like "14:30", "9:30", "2:30 PM", "05:30"
 * @param metrics - Glyph measurement data
 * @param totalWidth - Available width for alignment
 * @param textAlign - Text alignment within totalWidth
 * @param hasHours - Whether the hours segment is shown (determines how to interpret segments)
 * @param hasSeconds - Whether the seconds segment is shown
 * @param hasCentiseconds - Whether the centiseconds segment is shown (appended as ".CC" after seconds)
 */
export function computeTimeStringLayout(
  timeString: string,
  metrics: GlyphMetrics,
  totalWidth: number,
  textAlign: TextAlign,
  hasHours: boolean,
  hasSeconds: boolean,
  hasCentiseconds = false,
): CharLayout[] {
  const chars: CharLayout[] = [];

  let ampmLabel: string | null = null;
  let timePart = timeString;
  if (timePart.endsWith(" AM")) {
    ampmLabel = "AM";
    timePart = timePart.slice(0, -3);
  } else if (timePart.endsWith(" PM")) {
    ampmLabel = "PM";
    timePart = timePart.slice(0, -3);
  }

  const segments = timePart.split(":");

  if (hasHours && hasSeconds && segments.length === 3) {
    // HH:MM:SS[.CC]
    pushDigitGroup(chars, segments[0], HOUR_KEYS, metrics);
    pushChar(chars, "sep", ":", metrics);
    pushDigitGroup(chars, segments[1], MINUTE_KEYS, metrics);
    pushChar(chars, "sep2", ":", metrics);
    pushSecondsAndCentiseconds(chars, segments[2], hasCentiseconds, metrics);
  } else if (hasHours && !hasSeconds && segments.length >= 2) {
    // HH:MM
    pushDigitGroup(chars, segments[0], HOUR_KEYS, metrics);
    pushChar(chars, "sep", ":", metrics);
    pushDigitGroup(chars, segments[1], MINUTE_KEYS, metrics);
  } else if (!hasHours && hasSeconds && segments.length >= 2) {
    // MM:SS[.CC] (countdown/stopwatch mode)
    pushDigitGroup(chars, segments[0], MINUTE_KEYS, metrics);
    pushChar(chars, "sep2", ":", metrics);
    pushSecondsAndCentiseconds(chars, segments[1], hasCentiseconds, metrics);
  } else {
    // Fallback: just minutes (shouldn't normally happen)
    pushDigitGroup(chars, segments[0], MINUTE_KEYS, metrics);
  }

  // AM/PM suffix — individual characters with value-dependent keys
  if (ampmLabel) {
    pushChar(chars, "ampm-sp", " ", metrics);
    for (let i = 0; i < ampmLabel.length; i++) {
      pushChar(chars, `ampm:${ampmLabel}:${i}`, ampmLabel[i], metrics);
    }
  }

  assignXPositions(chars, totalWidth, textAlign);
  return chars;
}
