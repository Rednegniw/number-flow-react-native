import { SUPERSCRIPT_SCALE } from "./constants";
import { isDigitChar, localeDigitValue } from "./numerals";
import type { GlyphMetrics, KeyedPart, TextAlign } from "./types";

/**
 * Assigns x positions to each entry based on text alignment.
 * Mutates the `x` field of each entry in place.
 * Worklet-safe. When `precomputedContentWidth` is provided, skips the sum loop.
 */
export function assignXPositions(
  chars: { x: number; width: number }[],
  totalWidth: number,
  textAlign: TextAlign,
  precomputedContentWidth?: number,
): void {
  "worklet";
  let contentWidth = precomputedContentWidth ?? 0;
  if (precomputedContentWidth === undefined) {
    for (const entry of chars) contentWidth += entry.width;
  }

  let startX = 0;
  if (textAlign === "right") startX = totalWidth - contentWidth;
  else if (textAlign === "center") startX = (totalWidth - contentWidth) / 2;

  let currentX = startX;
  for (const entry of chars) {
    entry.x = currentX;
    currentX += entry.width;
  }
}

export interface CharLayout {
  key: string;
  char: string;
  isDigit: boolean;
  digitValue: number;
  x: number;
  width: number;
  superscript?: boolean;
}

export function computeKeyedLayout(
  parts: KeyedPart[],
  metrics: GlyphMetrics,
  totalWidth: number,
  textAlign: TextAlign,
  localeDigitStrings?: string[],
): CharLayout[] {
  const chars: CharLayout[] = [];

  for (const part of parts) {
    const isSuperscript =
      part.key.startsWith("exponentInteger:") || part.key.startsWith("exponentSign:");

    // For digit parts, look up the width of the locale digit character
    // (what DigitSlot actually renders) rather than the format output character.
    // On Hermes, format() may output Latin "4" but DigitSlot renders e.g. "四".
    let displayChar = part.char;
    if (part.type === "digit" && localeDigitStrings && part.digitValue >= 0) {
      displayChar = localeDigitStrings[part.digitValue];
    }

    const rawWidth = metrics.charWidths[displayChar] ?? metrics.maxDigitWidth;
    const width = isSuperscript ? rawWidth * SUPERSCRIPT_SCALE : rawWidth;

    chars.push({
      key: part.key,
      char: part.char,
      isDigit: part.type === "digit",
      digitValue: part.digitValue,
      x: 0,
      width,
      superscript: isSuperscript,
    });
  }

  assignXPositions(chars, totalWidth, textAlign);
  return chars;
}

export function computeStringLayout(
  text: string,
  metrics: GlyphMetrics,
  totalWidth: number,
  textAlign: TextAlign,
  zeroCodePoint = 48,
  prefixLength = 0,
  suffixLength = 0,
): CharLayout[] {
  const chars: CharLayout[] = [];
  const useStableKeys = prefixLength > 0 || suffixLength > 0;
  const numberEnd = text.length - suffixLength;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const digit = isDigitChar(char, zeroCodePoint);
    const width = metrics.charWidths[char] ?? metrics.maxDigitWidth;

    let key: string;
    if (useStableKeys && i < prefixLength) {
      key = `prefix:${i}`;
    } else if (useStableKeys && i >= numberEnd) {
      key = `suffix:${i - numberEnd}`;
    } else if (useStableKeys) {
      key = `num:${i - prefixLength}`;
    } else {
      key = `pos:${i}`;
    }

    chars.push({
      key,
      char,
      isDigit: digit,
      digitValue: digit ? localeDigitValue(char.charCodeAt(0), zeroCodePoint) : -1,
      x: 0,
      width,
    });
  }

  assignXPositions(chars, totalWidth, textAlign);
  return chars;
}
