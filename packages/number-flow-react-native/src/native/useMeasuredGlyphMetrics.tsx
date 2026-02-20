import React, { useCallback, useMemo, useReducer, useRef } from "react";
import { Text, type TextStyle } from "react-native";
import type { GlyphMetrics } from "../core/types";
import { buildCharSet, cacheKey, estimateCharBounds, metricsCache } from "./glyphMetricsShared";

type ResolvedStyle = TextStyle & { fontSize: number };

type TextLayoutEvent = Parameters<
  NonNullable<React.ComponentProps<typeof Text>["onTextLayout"]>
>[0];

interface MeasureComponentProps {
  nfStyle: ResolvedStyle;
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
          fontVariant: nfStyle.fontVariant,
          fontWeight: nfStyle.fontWeight,
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
  style: ResolvedStyle,
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
