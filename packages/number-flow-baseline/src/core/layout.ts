import { reorderKeyedParts } from "./bidi";
import { SUPERSCRIPT_SCALE } from "./constants";
import type { GlyphMetrics, KeyedPart, ResolvedTextAlign } from "./types";

/**
 * Assigns x positions to each entry based on text alignment.
 * Mutates the `x` field of each entry in place.
 * Worklet-safe. When `precomputedContentWidth` is provided, skips the sum loop.
 */
export function assignXPositions(
  chars: { x: number; width: number }[],
  totalWidth: number,
  textAlign: ResolvedTextAlign,
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

export interface KeyedLayoutOptions {
  localeDigitStrings?: string[];
  rawCharsWithBidi?: string[];
  direction?: "ltr" | "rtl";
}

export function computeKeyedLayout(
  parts: KeyedPart[],
  metrics: GlyphMetrics,
  totalWidth: number,
  textAlign: ResolvedTextAlign,
  options?: KeyedLayoutOptions,
): CharLayout[] {
  const { localeDigitStrings, rawCharsWithBidi, direction } = options ?? {};

  // Apply bidi visual reordering for RTL content in RTL mode
  const orderedParts =
    rawCharsWithBidi && direction ? reorderKeyedParts(parts, rawCharsWithBidi, direction) : parts;

  const chars: CharLayout[] = [];

  for (const part of orderedParts) {
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
