import { Group, Paint } from "@shopify/react-native-skia";
import { useCallback, useMemo, useReducer, useRef } from "react";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
} from "../core/constants";
import { type CharLayout, computeKeyedLayout } from "../core/layout";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { computeTimeStringLayout } from "../native/timeLayout";
import type { SkiaTimeFlowProps } from "../native/timeTypes";
import { useTimeFormatting } from "../native/useTimeFormatting";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const SkiaTimeFlow = ({
  hours,
  minutes,
  seconds,
  timestamp,
  timezoneOffset,
  formattedValue,
  is24Hour = true,
  padHours = true,
  font,
  color = "#000000",
  x = 0,
  y = 0,
  width = 0,
  textAlign = "left",
  opacity,
  spinTiming,
  opacityTiming,
  transformTiming,
  trend = 0,
}: SkiaTimeFlowProps) => {
  const metrics = useGlyphMetrics(font);

  const resolvedSpinTiming = spinTiming ?? DEFAULT_SPIN_TIMING;
  const resolvedOpacityTiming = opacityTiming ?? DEFAULT_OPACITY_TIMING;
  const resolvedTransformTiming = transformTiming ?? DEFAULT_TRANSFORM_TIMING;

  // ── Resolve timestamp to h/m/s ─────────────────────────────
  const resolved = useMemo(() => {
    if (timestamp !== undefined) {
      const d = new Date(timestamp + (timezoneOffset ?? 0));
      return {
        hours: d.getUTCHours(),
        minutes: d.getUTCMinutes(),
        seconds: d.getUTCSeconds(),
      };
    }
    return { hours, minutes, seconds };
  }, [timestamp, timezoneOffset, hours, minutes, seconds]);

  const resolvedHours = resolved.hours;
  const resolvedMinutes = resolved.minutes;
  const resolvedSeconds = resolved.seconds;

  const hasHours = resolvedHours !== undefined;
  const hasSeconds = resolvedSeconds !== undefined;

  // ── Time formatting → KeyedPart[] ──────────────────────────
  const keyedParts = useTimeFormatting(
    resolvedHours,
    resolvedMinutes,
    resolvedSeconds,
    is24Hour,
    padHours,
  );

  // ── Worklet formatting for SharedValue<string> input ────────
  const workletDigitValues = useWorkletFormatting(formattedValue, "", "");

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (
      formattedValue &&
      resolvedHours === undefined &&
      resolvedMinutes === undefined
    ) {
      return computeTimeStringLayout(
        formattedValue.value,
        metrics,
        width,
        textAlign,
        hasHours,
        hasSeconds,
      );
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, width, textAlign);
  }, [
    metrics,
    keyedParts,
    width,
    textAlign,
    formattedValue,
    resolvedHours,
    resolvedMinutes,
    hasHours,
    hasSeconds,
  ]);

  // ── Enter/Exit tracking ──────────────────────────────────────
  const prevLayoutRef = useRef<CharLayout[]>([]);
  const exitingRef = useRef<Map<string, CharLayout>>(new Map());
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const isFirstLayoutRef = useRef(true);

  // StrictMode-safe: only process diff once per layout change.
  const lastDiffIdRef = useRef("");
  const diffResultRef = useRef<{
    prevMap: Map<string, CharLayout>;
    isInitialRender: boolean;
  }>({ prevMap: new Map(), isInitialRender: true });

  // useCallback must be called before any early returns (Rules of Hooks)
  const onExitComplete = useCallback((key: string) => {
    exitingRef.current.delete(key);
    forceUpdate();
  }, []);

  if (!font || !metrics) return <Group />;

  // Stable layout identity
  let layoutId = "";
  for (const s of layout) {
    layoutId += s.key;
    layoutId += s.digitValue;
  }

  // Only run diff logic once per layout change (idempotent under StrictMode)
  if (layoutId !== lastDiffIdRef.current) {
    lastDiffIdRef.current = layoutId;

    const currentKeys = new Set(layout.map((s) => s.key));
    const prevMap = new Map(prevLayoutRef.current.map((s) => [s.key, s]));

    for (const prev of prevLayoutRef.current) {
      if (!currentKeys.has(prev.key) && !exitingRef.current.has(prev.key)) {
        exitingRef.current.set(prev.key, prev);
      }
    }

    for (const key of currentKeys) {
      exitingRef.current.delete(key);
    }

    const isInitialRender = isFirstLayoutRef.current;
    if (layout.length > 0) isFirstLayoutRef.current = false;

    diffResultRef.current = { prevMap, isInitialRender };
    prevLayoutRef.current = layout;
  }

  const { prevMap, isInitialRender } = diffResultRef.current;

  if (layout.length === 0 && exitingRef.current.size === 0) {
    return <Group />;
  }

  const baseY = y;

  let digitIndex = 0;

  const content = (
    <Group transform={[{ translateX: x }]}>
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          digitIndex++;
          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              font={font}
              key={entry.key}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={trend}
              workletDigitValue={wdv}
            />
          );
        }
        return (
          <SymbolSlot
            baseY={baseY}
            char={entry.char}
            color={color}
            entering={isEntering}
            exiting={false}
            font={font}
            key={entry.key}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}

      {Array.from(exitingRef.current.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              font={font}
              key={key}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              transformTiming={resolvedTransformTiming}
              trend={trend}
            />
          );
        }
        return (
          <SymbolSlot
            baseY={baseY}
            char={entry.char}
            color={color}
            entering={false}
            exitKey={key}
            exiting
            font={font}
            key={key}
            onExitComplete={onExitComplete}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}
    </Group>
  );

  if (opacity) {
    return <Group layer={<Paint opacity={opacity} />}>{content}</Group>;
  }

  return content;
};
