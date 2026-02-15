import { SUPERSCRIPT_SCALE } from "./constants";
import type { GlyphMetrics, KeyedPart, TextAlign } from "./types";
import { isDigitChar } from "./utils";

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
): CharLayout[] {
  const chars: CharLayout[] = [];
  let contentWidth = 0;

  for (const part of parts) {
    const isSuperscript =
      part.key.startsWith("exponentInteger:") ||
      part.key.startsWith("exponentSign:");

    const rawWidth = metrics.charWidths[part.char] ?? metrics.maxDigitWidth;
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
): CharLayout[] {
  const chars: CharLayout[] = [];
  let contentWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const digit = isDigitChar(char);
    const width = metrics.charWidths[char] ?? metrics.maxDigitWidth;
    contentWidth += width;
    chars.push({
      key: `pos:${i}`,
      char,
      isDigit: digit,
      digitValue: digit ? char.charCodeAt(0) - 48 : -1,
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
