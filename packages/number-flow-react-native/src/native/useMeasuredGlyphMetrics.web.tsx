/// <reference lib="dom" />
import { useMemo } from "react";
import type { TextStyle } from "react-native";
import type { GlyphMetrics } from "../core/types";
import { buildCharSet, cacheKey, estimateCharBounds, metricsCache } from "./glyphMetricsShared";

type ResolvedStyle = TextStyle & { fontSize: number };

let offscreenCtx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D {
  if (!offscreenCtx) {
    const canvas = document.createElement("canvas");
    offscreenCtx = canvas.getContext("2d")!;
  }
  return offscreenCtx;
}

/**
 * Maps RN font names to CSS font stacks the same way react-native-web does
 * in createReactDOMStyle.js, so Canvas measurement matches actual rendering.
 */
const SYSTEM_FONT_STACK =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const MONOSPACE_FONT_STACK = "monospace,monospace";

function resolveWebFontFamily(family: string): string {
  if (family.indexOf("System") > -1) {
    const stack = family.split(/,\s*/);
    stack[stack.indexOf("System")] = SYSTEM_FONT_STACK;
    return stack.join(",");
  }

  if (family === "monospace") {
    return MONOSPACE_FONT_STACK;
  }

  return family;
}

function buildCSSFont(style: ResolvedStyle): string {
  const weight = style.fontWeight ?? "normal";
  const fontStyle = style.fontStyle ?? "normal";
  const size = `${style.fontSize}px`;
  const family = resolveWebFontFamily(style.fontFamily ?? "system-ui");
  return `${fontStyle} ${weight} ${size} ${family}`;
}

function measureWithCanvas(
  style: ResolvedStyle,
  charSet: string,
  localeDigitStrings?: string[],
): GlyphMetrics {
  const ctx = getContext();
  ctx.font = buildCSSFont(style);

  const charWidths: Record<string, number> = {};
  for (let i = 0; i < charSet.length; i++) {
    const ch = charSet[i] === " " ? "\u00A0" : charSet[i];
    const m = ctx.measureText(ch);
    const visual = (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? m.width);
    charWidths[charSet[i]] = Math.max(m.width, Math.ceil(visual));
  }

  let maxDigitWidth = 0;
  const digitChars = localeDigitStrings ?? Array.from({ length: 10 }, (_, d) => String(d));
  for (const dc of digitChars) {
    const w = charWidths[dc] ?? 0;
    if (w > maxDigitWidth) maxDigitWidth = w;
  }

  // Use font-level bounding box metrics (widely supported: Chrome 87+, Firefox 116+, Safari 11.1+)
  const refMetrics = ctx.measureText("Hg");
  const ascent = -(refMetrics.fontBoundingBoxAscent ?? refMetrics.actualBoundingBoxAscent);
  const descent = refMetrics.fontBoundingBoxDescent ?? refMetrics.actualBoundingBoxDescent;

  // Cap height approximation: use actualBoundingBoxAscent of "H"
  const hMetrics = ctx.measureText("H");
  const capHeight = hMetrics.actualBoundingBoxAscent;

  const lineHeight = Math.ceil(descent - ascent);
  const charBounds = estimateCharBounds(charSet, descent, capHeight, localeDigitStrings);

  return { charWidths, maxDigitWidth, lineHeight, ascent, descent, charBounds };
}

export function useMeasuredGlyphMetrics(
  style: ResolvedStyle,
  additionalChars?: string,
  localeDigitStrings?: string[],
): {
  metrics: GlyphMetrics | null;
  MeasureElement: React.ReactElement | null;
} {
  const charSet = useMemo(() => buildCharSet(additionalChars), [additionalChars]);
  const key = cacheKey(style, additionalChars);

  const metrics = useMemo(() => {
    const cached = metricsCache.get(key);
    if (cached) return cached;

    const measured = measureWithCanvas(style, charSet, localeDigitStrings);
    metricsCache.set(key, measured);
    return measured;
  }, [key, style, charSet, localeDigitStrings]);

  // No MeasureElement needed on web — Canvas measurement is synchronous
  return { metrics, MeasureElement: null };
}
