import React, { useCallback, useReducer, useRef, useMemo } from "react";
import { Text } from "react-native";
import { MEASURABLE_CHARS } from "../core/constants";
import type { GlyphMetrics } from "../core/types";
import type { NumberFlowStyle } from "./types";

// Combines MEASURABLE_CHARS with additional chars, deduplicating
function buildCharSet(additionalChars?: string): string {
  if (!additionalChars) return MEASURABLE_CHARS;
  const unique = Array.from(additionalChars).filter(
    (c) => !MEASURABLE_CHARS.includes(c),
  );
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

interface MeasureComponentProps {
  nfStyle: NumberFlowStyle;
  charSet: string;
  onComplete: (metrics: GlyphMetrics) => void;
}

const MeasureComponent = React.memo(
  ({ nfStyle, charSet, onComplete }: MeasureComponentProps) => {
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
        for (let d = 0; d <= 9; d++) {
          const w = charWidths[String(d)];
          if (w > maxDigitWidth) maxDigitWidth = w;
        }

        const line = lines[0];
        onComplete({
          charWidths,
          maxDigitWidth,
          lineHeight: Math.ceil(line.height),
          ascent: -line.ascender,
          descent: line.descender,
        });
      },
      [onComplete],
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

export function useGlyphMetrics(
  style: NumberFlowStyle,
  additionalChars?: string,
): {
  metrics: GlyphMetrics | null;
  MeasureElement: React.ReactElement | null;
} {
  const charSet = useMemo(
    () => buildCharSet(additionalChars),
    [additionalChars],
  );
  const key = cacheKey(style, additionalChars);
  const cached = metricsCache.get(key);
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const completedRef = useRef(false);

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
      completedRef.current = true;
      forceUpdate();
    },
    [key, forceUpdate],
  );

  if (cached) {
    return { metrics: cached, MeasureElement: null };
  }

  if (completedRef.current) {
    const nowCached = metricsCache.get(key);
    if (nowCached) return { metrics: nowCached, MeasureElement: null };
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
      onComplete: handleComplete,
    }),
  };
}
