import React, { useCallback, useMemo, useReducer, useRef } from "react";
import { Text } from "react-native";
import { MEASURABLE_CHARS } from "../core/constants";
import type { GlyphMetrics } from "../core/types";
import type { NumberFlowStyle } from "./types";

// Combines MEASURABLE_CHARS with additional chars, deduplicating
function buildCharSet(additionalChars?: string): string {
  if (!additionalChars) return MEASURABLE_CHARS;
  const unique = Array.from(additionalChars).filter((c) => !MEASURABLE_CHARS.includes(c));
  return unique.length > 0 ? MEASURABLE_CHARS + unique.join("") : MEASURABLE_CHARS;
}

type TextLayoutEvent = Parameters<
  NonNullable<React.ComponentProps<typeof Text>["onTextLayout"]>
>[0];

/**
 * Key: "fontFamily:fontSize", Value: measured GlyphMetrics.
 * Once measured for a given font config, subsequent mounts return instantly.
 */
const metricsCache = new Map<string, GlyphMetrics>();

function cacheKey(
  style: { fontFamily?: string; fontSize: number },
  additionalChars?: string,
): string {
  const base = `${style.fontFamily}:${style.fontSize}`;
  return additionalChars ? `${base}:${additionalChars}` : base;
}

/**
 * Renders a single off-screen <Text> with all measurable characters separated
 * by newlines. onTextLayout fires once with lines[] — one entry per line, each
 * containing the advance width of that single character.
 */

// ASCII characters known to have no descender (bottom = 0)
const NO_DESCENDER = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:%+-~°!^*×/$€£¥₩ \u00A0");

/**
 * Estimates per-character vertical bounds using font-level metrics.
 * Top: -capHeight for all chars (precise for digits, safe overestimate for smaller glyphs).
 * Bottom: 0 for known no-descender chars (+ locale digits), full descent otherwise.
 */
function estimateCharBounds(
  charSet: string,
  descent: number,
  capHeight: number,
  localeDigitStrings?: string[],
): Record<string, { top: number; bottom: number }> {
  const noDescender = new Set(NO_DESCENDER);
  if (localeDigitStrings) {
    for (const d of localeDigitStrings) noDescender.add(d);
  }

  const bounds: Record<string, { top: number; bottom: number }> = {};
  const top = -capHeight;

  for (let i = 0; i < charSet.length; i++) {
    const bottom = noDescender.has(charSet[i]) ? 0 : descent;
    bounds[charSet[i]] = { top, bottom };
  }

  return bounds;
}

interface MeasureComponentProps {
  nfStyle: NumberFlowStyle;
  charSet: string;
  localeDigitStrings?: string[];
  onComplete: (metrics: GlyphMetrics) => void;
}

const MeasureComponent = React.memo(
  ({ nfStyle, charSet, localeDigitStrings, onComplete }: MeasureComponentProps) => {
    const completedRef = useRef(false);

    /**
     * Replace regular space with NBSP for measurement safety — some Android
     * text layout engines collapse trailing whitespace on a line.
     */
    const measureString = useMemo(
      () =>
        Array.from(charSet)
          .map((c) => (c === " " ? "\u00A0" : c))
          .join("\n"),
      [charSet],
    );

    const handleTextLayout = useCallback(
      (e: TextLayoutEvent) => {
        if (completedRef.current) return;
        const lines = e.nativeEvent.lines;
        if (lines.length < charSet.length) return;

        completedRef.current = true;

        const charWidths: Record<string, number> = {};
        for (let i = 0; i < charSet.length; i++) {
          charWidths[charSet[i]] = lines[i].width;
        }

        let maxDigitWidth = 0;
        const digitChars = localeDigitStrings ?? Array.from({ length: 10 }, (_, d) => String(d));
        for (const dc of digitChars) {
          const w = charWidths[dc] ?? 0;
          if (w > maxDigitWidth) maxDigitWidth = w;
        }

        let tallestLine = lines[0];
        for (let i = 1; i < charSet.length; i++) {
          if (lines[i].height > tallestLine.height) tallestLine = lines[i];
        }

        // Negate ascender to match Skia convention (negative = above baseline).
        const ascent = -tallestLine.ascender;
        const descent = tallestLine.descender;
        // Fallback 0.72 × |ascent| matches typical system font cap-height ratio.
        const capHeight =
          (tallestLine as unknown as Record<string, number>).capHeight || -ascent * 0.72;

        const charBounds = estimateCharBounds(charSet, descent, capHeight, localeDigitStrings);

        onComplete({
          charWidths,
          maxDigitWidth,
          lineHeight: Math.ceil(tallestLine.height),
          ascent,
          descent,
          charBounds,
        });
      },
      [onComplete, charSet, localeDigitStrings],
    );

    return (
      <Text
        onTextLayout={handleTextLayout}
        pointerEvents="none"
        style={{
          fontFamily: nfStyle.fontFamily,
          fontSize: nfStyle.fontSize,
          position: "absolute",
          opacity: 0,
        }}
      >
        {measureString}
      </Text>
    );
  },
);

MeasureComponent.displayName = "NumberFlowMeasure";

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
  const cached = metricsCache.get(key);
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  /**
   * Track the best available metrics for this font config — prevents
   * returning null (and unmounting all slots) when additionalChars
   * changes and triggers an async re-measurement.
   */
  const baseKey = cacheKey(style);
  const prevMetricsRef = useRef<GlyphMetrics | null>(null);
  if (cached) prevMetricsRef.current = cached;

  const handleComplete = useCallback(
    (metrics: GlyphMetrics) => {
      metricsCache.set(key, metrics);
      forceUpdate();
    },
    [key],
  );

  if (cached) {
    return { metrics: cached, MeasureElement: null };
  }

  /**
   * If we have stale metrics from a previous measurement of this font,
   * return them while re-measuring — avoids unmounting the slot tree.
   */
  const staleMetrics = prevMetricsRef.current ?? metricsCache.get(baseKey) ?? null;

  return {
    metrics: staleMetrics,
    MeasureElement: React.createElement(MeasureComponent, {
      nfStyle: style,
      charSet,
      localeDigitStrings,
      onComplete: handleComplete,
    }),
  };
}
