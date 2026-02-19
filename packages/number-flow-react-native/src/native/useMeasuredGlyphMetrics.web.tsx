/// <reference lib="dom" />
import { useMemo } from "react";
import type { GlyphMetrics } from "../core/types";
import { buildCharSet, cacheKey, estimateCharBounds, metricsCache } from "./glyphMetricsShared";
import type { NumberFlowStyle } from "./types";

let offscreenCtx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D {
  if (!offscreenCtx) {
    const canvas = document.createElement("canvas");
    offscreenCtx = canvas.getContext("2d")!;
  }
  return offscreenCtx;
}

function buildCSSFont(style: NumberFlowStyle): string {
  const weight = style.fontWeight ?? "normal";
  const fontStyle = style.fontStyle ?? "normal";
  const size = `${style.fontSize}px`;
  const family = style.fontFamily ?? "system-ui";
  return `${fontStyle} ${weight} ${size} ${family}`;
}

function measureWithCanvas(
  style: NumberFlowStyle,
  charSet: string,
  localeDigitStrings?: string[],
): GlyphMetrics {
  const ctx = getContext();
  ctx.font = buildCSSFont(style);

  const charWidths: Record<string, number> = {};
  for (let i = 0; i < charSet.length; i++) {
    const ch = charSet[i] === " " ? "\u00A0" : charSet[i];
    charWidths[charSet[i]] = ctx.measureText(ch).width;
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
  style: NumberFlowStyle,
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
