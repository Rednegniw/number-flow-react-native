import { SUPERSCRIPT_SCALE } from "./constants";
import type { GlyphMetrics, KeyedPart, TextAlign } from "./types";
import { isDigitChar, workletDigitValue } from "./utils";

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
  let contentWidth = 0;

  for (const part of parts) {
    const isSuperscript =
      part.key.startsWith("exponentInteger:") ||
      part.key.startsWith("exponentSign:");

    // For digit parts, look up the width of the locale digit character
    // (what DigitSlot actually renders) rather than the format output character.
    // On Hermes, format() may output Latin "4" but DigitSlot renders e.g. "四".
    let displayChar = part.char;
    if (part.type === "digit" && localeDigitStrings && part.digitValue >= 0) {
      displayChar = localeDigitStrings[part.digitValue];
    }

    const rawWidth = metrics.charWidths[displayChar] ?? metrics.maxDigitWidth;
    const width = isSuperscript ? rawWidth * SUPERSCRIPT_SCALE : rawWidth;

    contentWidth += width;
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

  let startX = 0;
  if (textAlign === "right") {
    startX = totalWidth - contentWidth;
  } else if (textAlign === "center") {
    startX = (totalWidth - contentWidth) / 2;
  }

  let currentX = startX;
  for (const entry of chars) {
    entry.x = currentX;
    currentX += entry.width;
  }

  return chars;
}

export function computeStringLayout(
  text: string,
  metrics: GlyphMetrics,
  totalWidth: number,
  textAlign: TextAlign,
  zeroCodePoint = 48,
): CharLayout[] {
  const chars: CharLayout[] = [];
  let contentWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const digit = isDigitChar(char, zeroCodePoint);
    const width = metrics.charWidths[char] ?? metrics.maxDigitWidth;
    contentWidth += width;
    chars.push({
      key: `pos:${i}`,
      char,
      isDigit: digit,
      digitValue: digit ? workletDigitValue(char.charCodeAt(0), zeroCodePoint) : -1,
      x: 0,
      width,
    });
  }

  let startX = 0;
  if (textAlign === "right") {
    startX = totalWidth - contentWidth;
  } else if (textAlign === "center") {
    startX = (totalWidth - contentWidth) / 2;
  }

  let currentX = startX;
  for (const entry of chars) {
    entry.x = currentX;
    currentX += entry.width;
  }

  return chars;
}
