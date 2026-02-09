import React, {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { View, type LayoutChangeEvent } from "react-native";
import {
  DEFAULT_OPACITY_TIMING,
  DEFAULT_SPIN_TIMING,
  DEFAULT_TRANSFORM_TIMING,
} from "../core/constants";
import {
  type CharLayout,
  computeKeyedLayout,
  computeStringLayout,
} from "../core/layout";
import { useNumberFormatting } from "../core/useNumberFormatting";
import { useWorkletFormatting } from "../core/useWorkletFormatting";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";
import type { NumberFlowProps } from "./types";
import { useGlyphMetrics } from "./useGlyphMetrics";

export const NumberFlow = ({
  value,
  format,
  locales,
  formattedValue,
  style: nfStyle,
  textAlign = "left",
  prefix = "",
  suffix = "",
  spinTiming,
  opacityTiming,
  transformTiming,
  trend = 0,
  containerStyle,
}: NumberFlowProps) => {
  const { metrics, MeasureElement } = useGlyphMetrics(nfStyle);

  const resolvedSpinTiming = spinTiming ?? DEFAULT_SPIN_TIMING;
  const resolvedOpacityTiming = opacityTiming ?? DEFAULT_OPACITY_TIMING;
  const resolvedTransformTiming = transformTiming ?? DEFAULT_TRANSFORM_TIMING;

  const keyedParts = useNumberFormatting(
    value,
    format,
    locales,
    prefix,
    suffix,
  );

  const workletDigitValues = useWorkletFormatting(
    formattedValue,
    prefix,
    suffix,
  );

  // ── Container width for alignment calculations ────────────────
  const [containerWidth, setContainerWidth] = useState(0);
  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const effectiveWidth = containerWidth;

  const layout = useMemo(() => {
    if (!metrics) return [];

    if (formattedValue && value === undefined) {
      const text = `${prefix}${formattedValue.value}${suffix}`;
      return computeStringLayout(text, metrics, effectiveWidth, textAlign);
    }

    if (keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, effectiveWidth, textAlign);
  }, [
    metrics,
    keyedParts,
    effectiveWidth,
    textAlign,
    prefix,
    suffix,
    formattedValue,
    value,
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

  const onExitComplete = useCallback((key: string) => {
    exitingRef.current.delete(key);
    forceUpdate();
  }, []);

  // ── Shared text style for all slots ──────────────────────────
  const textStyle = useMemo(
    () => ({
      fontFamily: nfStyle.fontFamily,
      fontSize: nfStyle.fontSize,
      color: nfStyle.color ?? "#000000",
    }),
    [nfStyle.fontFamily, nfStyle.fontSize, nfStyle.color],
  );

  if (!metrics) {
    return (
      <View onLayout={handleContainerLayout} style={containerStyle}>
        {MeasureElement}
      </View>
    );
  }

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
    return (
      <View onLayout={handleContainerLayout} style={containerStyle}>
        {MeasureElement}
      </View>
    );
  }

  let digitIndex = 0;

  return (
    <View
      onLayout={handleContainerLayout}
      style={[
        containerStyle,
        { height: metrics.lineHeight, position: "relative" },
      ]}
    >
      {MeasureElement}

      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          digitIndex++;
          return (
            <DigitSlot
              charWidth={entry.width}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              key={entry.key}
              lineHeight={metrics.lineHeight}
              metrics={metrics}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              textStyle={textStyle}
              transformTiming={resolvedTransformTiming}
              trend={trend}
              workletDigitValue={wdv}
            />
          );
        }
        return (
          <SymbolSlot
            char={entry.char}
            entering={isEntering}
            exiting={false}
            key={entry.key}
            lineHeight={metrics.lineHeight}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            textStyle={textStyle}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}

      {Array.from(exitingRef.current.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          return (
            <DigitSlot
              charWidth={entry.width}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              key={key}
              lineHeight={metrics.lineHeight}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={resolvedOpacityTiming}
              spinTiming={resolvedSpinTiming}
              targetX={entry.x}
              textStyle={textStyle}
              transformTiming={resolvedTransformTiming}
              trend={trend}
            />
          );
        }
        return (
          <SymbolSlot
            char={entry.char}
            entering={false}
            exitKey={key}
            exiting
            key={key}
            lineHeight={metrics.lineHeight}
            onExitComplete={onExitComplete}
            opacityTiming={resolvedOpacityTiming}
            targetX={entry.x}
            textStyle={textStyle}
            transformTiming={resolvedTransformTiming}
          />
        );
      })}
    </View>
  );
};
