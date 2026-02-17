import type { TextStyle } from "react-native";
import { SUPERSCRIPT_SCALE } from "./constants";

/**
 * Returns the scaled TextStyle for superscript rendering in native slots.
 * Reduces fontSize and lineHeight by SUPERSCRIPT_SCALE.
 */
export function getSuperscriptTextStyle(textStyle: TextStyle, lineHeight: number): TextStyle {
  return {
    ...textStyle,
    fontSize: (textStyle.fontSize ?? 16) * SUPERSCRIPT_SCALE,
    lineHeight,
  };
}

/**
 * Returns the pivot-scale transform array for superscript rendering in Skia slots.
 * Pivots around the text top so the digit shrinks downward within the mask region.
 */
export function getSuperscriptTransform(
  baseY: number,
  ascent: number,
): ({ translateY: number } | { scale: number })[] {
  const textTop = baseY + ascent;

  return [{ translateY: textTop }, { scale: SUPERSCRIPT_SCALE }, { translateY: -textTop }];
}
