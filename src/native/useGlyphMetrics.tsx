import React, { useCallback, useReducer, useRef, useMemo } from "react";
import { Text } from "react-native";
import { MEASURABLE_CHARS } from "../core/constants";
import type { GlyphMetrics } from "../core/types";
import type { NumberFlowStyle } from "./types";

type TextLayoutEvent = Parameters<
  NonNullable<React.ComponentProps<typeof Text>["onTextLayout"]>
>[0];

// ─── Module-level cache ──────────────────────────────────────────────────────
// Key: "fontFamily:fontSize", Value: measured GlyphMetrics.
// Once measured for a given font config, subsequent mounts return instantly.
// Exported so the Skia pre-warmer can populate it at app startup.
export const metricsCache = new Map<string, GlyphMetrics>();

export function cacheKey(style: {
  fontFamily: string;
  fontSize: number;
}): string {
  return `${style.fontFamily}:${style.fontSize}`;
}

// ─── Hidden Measurement Component ────────────────────────────────────────────
// Renders a single off-screen <Text> with all measurable characters separated
// by newlines. React Native's onTextLayout fires once with lines[] — one entry
// per line, each containing that line's width (the advance width of the single
// character on that line). This replaces the previous 144-element approach
// (72 Views + 72 Texts + 73 callbacks) with 1 Text + 1 callback.

interface MeasureComponentProps {
  nfStyle: NumberFlowStyle;
  onComplete: (metrics: GlyphMetrics) => void;
}

const MeasureComponent = React.memo(
  ({ nfStyle, onComplete }: MeasureComponentProps) => {
    const completedRef = useRef(false);

    // Replace regular space with NBSP for measurement safety —
    // some Android text layout engines collapse trailing whitespace on a line.
    // NBSP (\u00A0) has identical advance width but won't be collapsed.
    const measureString = useMemo(
      () =>
        Array.from(MEASURABLE_CHARS)
          .map((c) => (c === " " ? "\u00A0" : c))
          .join("\n"),
      [],
    );

    const handleTextLayout = useCallback(
      (e: TextLayoutEvent) => {
        if (completedRef.current) return;
        const lines = e.nativeEvent.lines;
        if (lines.length < MEASURABLE_CHARS.length) return;

        completedRef.current = true;

        const charWidths: Record<string, number> = {};
        for (let i = 0; i < MEASURABLE_CHARS.length; i++) {
          charWidths[MEASURABLE_CHARS[i]] = lines[i].width;
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

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGlyphMetrics(style: NumberFlowStyle): {
  metrics: GlyphMetrics | null;
  MeasureElement: React.ReactElement | null;
} {
  const key = cacheKey(style);
  const cached = metricsCache.get(key);
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const completedRef = useRef(false);

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

  return {
    metrics: null,
    MeasureElement: React.createElement(MeasureComponent, {
      nfStyle: style,
      onComplete: handleComplete,
    }),
  };
}
