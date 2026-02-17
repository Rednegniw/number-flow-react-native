import type { TextStyle } from "react-native";
import type { CharLayout } from "../core/layout";
import type { GlyphMetrics, TimingConfig, Trend } from "../core/types";
import { DigitSlot } from "./DigitSlot";
import { SymbolSlot } from "./SymbolSlot";

interface RenderSlotsParams {
  layout: CharLayout[];
  exitingEntries: Map<string, CharLayout>;
  prevMap: Map<string, CharLayout>;
  isInitialRender: boolean;
  onExitComplete: (key: string) => void;
  metrics: GlyphMetrics;
  textStyle: TextStyle;
  resolvedTrend: Trend;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  spinGenerations: Map<string, number> | undefined;
  digitCountResolver: (key: string) => number;
  maskTop: number;
  maskBottom: number;
  digitStrings?: string[];
}

/**
 * Renders the active and exiting digit/symbol slot tree.
 *
 * Shared between NumberFlow and TimeFlow — the only behavioral differences
 * are abstracted via `digitCountResolver` (which digit-count lookup to use)
 * and the optional `digitStrings` (locale-specific digit characters).
 */
export function renderSlots({
  layout,
  exitingEntries,
  prevMap,
  isInitialRender,
  onExitComplete,
  metrics,
  textStyle,
  resolvedTrend,
  spinTiming,
  opacityTiming,
  transformTiming,
  spinGenerations,
  digitCountResolver,
  maskTop,
  maskBottom,
  digitStrings,
}: RenderSlotsParams) {
  return (
    <>
      {/* Active entries */}
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);

        if (entry.isDigit) {
          const digitCount = digitCountResolver(entry.key);
          const spinGeneration = spinGenerations?.get(entry.key);

          return (
            <DigitSlot
              charWidth={entry.width}
              continuousSpinGeneration={spinGeneration}
              digitCount={digitCount}
              digitStrings={digitStrings}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              key={entry.key}
              maskTop={maskTop}
              maskBottom={maskBottom}
              metrics={metrics}
              opacityTiming={opacityTiming}
              spinTiming={spinTiming}
              superscript={entry.superscript}
              targetX={entry.x}
              textStyle={textStyle}
              transformTiming={transformTiming}
              trend={resolvedTrend}
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
            opacityTiming={opacityTiming}
            superscript={entry.superscript}
            targetX={entry.x}
            textStyle={textStyle}
            transformTiming={transformTiming}
          />
        );
      })}

      {/* Exiting entries */}
      {Array.from(exitingEntries.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          const digitCount = digitCountResolver(key);

          return (
            <DigitSlot
              charWidth={entry.width}
              digitCount={digitCount}
              digitStrings={digitStrings}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              key={key}
              maskTop={maskTop}
              maskBottom={maskBottom}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={opacityTiming}
              spinTiming={spinTiming}
              superscript={entry.superscript}
              targetX={entry.x}
              textStyle={textStyle}
              transformTiming={transformTiming}
              trend={resolvedTrend}
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
            opacityTiming={opacityTiming}
            superscript={entry.superscript}
            targetX={entry.x}
            textStyle={textStyle}
            transformTiming={transformTiming}
          />
        );
      })}
    </>
  );
}
