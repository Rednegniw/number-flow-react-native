import type { SkFont } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
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
  font: SkFont;
  color: string;
  baseY: number;
  resolvedTrend: Trend;
  spinTiming: TimingConfig;
  opacityTiming: TimingConfig;
  transformTiming: TimingConfig;
  spinGenerations: Map<string, number> | undefined;
  digitCountResolver: (key: string) => number;
  maskTop: number;
  maskBottom: number;
  digitStrings?: string[];
  workletDigitValues?: SharedValue<number>[] | null;
  workletLayout?: SharedValue<{ x: number; width: number }[]>;
}

/**
 * Renders the active and exiting digit/symbol slot tree for Skia.
 *
 * Shared between SkiaNumberFlow and SkiaTimeFlow. Behavioral differences:
 * - `digitCountResolver`: NumberFlow uses getDigitCount, TimeFlow uses TIME_DIGIT_COUNTS
 * - `digitStrings`: NumberFlow passes locale-specific digits, TimeFlow omits (Latin fallback)
 * - `workletLayout`: NumberFlow passes for scrubbing positioning, TimeFlow omits
 */
export function renderSlots({
  layout,
  exitingEntries,
  prevMap,
  isInitialRender,
  onExitComplete,
  metrics,
  font,
  color,
  baseY,
  resolvedTrend,
  spinTiming,
  opacityTiming,
  transformTiming,
  spinGenerations,
  digitCountResolver,
  maskTop,
  maskBottom,
  digitStrings,
  workletDigitValues,
  workletLayout,
}: RenderSlotsParams) {
  let digitIndex = 0;
  let slotIndex = 0;

  return (
    <>
      {/* Active entries */}
      {layout.map((entry) => {
        const isEntering = !isInitialRender && !prevMap.has(entry.key);
        const currentSlotIndex = slotIndex++;

        if (entry.isDigit) {
          const wdv = workletDigitValues?.[digitIndex];
          const digitCount = digitCountResolver(entry.key);
          const spinGeneration = spinGenerations?.get(entry.key);

          digitIndex++;

          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              continuousSpinGeneration={spinGeneration}
              digitCount={digitCount}
              digitStrings={digitStrings}
              digitValue={entry.digitValue}
              entering={isEntering}
              exiting={false}
              font={font}
              key={entry.key}
              maskTop={maskTop}
              maskBottom={maskBottom}
              metrics={metrics}
              opacityTiming={opacityTiming}
              slotIndex={workletLayout ? currentSlotIndex : undefined}
              spinTiming={spinTiming}
              superscript={entry.superscript}
              targetX={entry.x}
              transformTiming={transformTiming}
              trend={resolvedTrend}
              workletDigitValue={wdv}
              workletLayout={workletLayout}
            />
          );
        }

        return (
          <SymbolSlot
            ascent={metrics.ascent}
            baseY={baseY}
            char={entry.char}
            color={color}
            entering={isEntering}
            exiting={false}
            font={font}
            key={entry.key}
            opacityTiming={opacityTiming}
            slotIndex={workletLayout ? currentSlotIndex : undefined}
            superscript={entry.superscript}
            targetX={entry.x}
            transformTiming={transformTiming}
            workletLayout={workletLayout}
          />
        );
      })}

      {/* Exiting entries */}
      {Array.from(exitingEntries.entries()).map(([key, entry]) => {
        if (entry.isDigit) {
          const digitCount = digitCountResolver(key);

          return (
            <DigitSlot
              baseY={baseY}
              charWidth={entry.width}
              color={color}
              digitCount={digitCount}
              digitStrings={digitStrings}
              digitValue={entry.digitValue}
              entering={false}
              exitKey={key}
              exiting
              font={font}
              key={key}
              maskTop={maskTop}
              maskBottom={maskBottom}
              metrics={metrics}
              onExitComplete={onExitComplete}
              opacityTiming={opacityTiming}
              spinTiming={spinTiming}
              superscript={entry.superscript}
              targetX={entry.x}
              transformTiming={transformTiming}
              trend={resolvedTrend}
            />
          );
        }

        return (
          <SymbolSlot
            ascent={metrics.ascent}
            baseY={baseY}
            char={entry.char}
            color={color}
            entering={false}
            exitKey={key}
            exiting
            font={font}
            key={key}
            onExitComplete={onExitComplete}
            opacityTiming={opacityTiming}
            superscript={entry.superscript}
            targetX={entry.x}
            transformTiming={transformTiming}
          />
        );
      })}
    </>
  );
}
