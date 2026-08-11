import { useRef } from "react";
import type { KeyedPart, Trend } from "./types";
import { parseDigitPosition } from "./utils";

/**
 * Pure algorithm: given previous and current keyed parts, determines which
 * unchanged lower-significance digits should do a full-wheel continuous spin.
 *
 * Returns a new Map with incremented generation counters for those digits.
 * The generation counter is what triggers the spin animation in useDigitAnimation.
 */
export function computeContinuousGenerations(
  prevParts: KeyedPart[],
  currentParts: KeyedPart[],
  prevGenerations: Map<string, number>,
): Map<string, number> {
  // Build lookup of previous digit values by key
  const prevDigits = new Map<string, number>();
  for (const part of prevParts) {
    if (part.type === "digit") {
      prevDigits.set(part.key, part.digitValue);
    }
  }

  // Find the highest-significance position where the digit value changed
  let maxChangedPos = -Infinity;

  for (const part of currentParts) {
    if (part.type !== "digit") continue;

    const pos = parseDigitPosition(part.key);
    if (pos === undefined) continue;

    const prevValue = prevDigits.get(part.key);
    const changed = prevValue !== undefined && prevValue !== part.digitValue;

    if (changed && pos > maxChangedPos) {
      maxChangedPos = pos;
    }
  }

  // No digit changed, nothing to spin
  if (maxChangedPos === -Infinity) return prevGenerations;

  /**
   * Increment the generation counter for each unchanged digit whose
   * significance is lower than the most-significant changed digit.
   * Only digits that existed in the previous render qualify; entering
   * digits have no previous value and can't be "unchanged".
   */
  const nextGenerations = new Map(prevGenerations);

  for (const part of currentParts) {
    if (part.type !== "digit") continue;

    const pos = parseDigitPosition(part.key);
    if (pos === undefined || pos >= maxChangedPos) continue;

    const prevValue = prevDigits.get(part.key);
    const unchanged = prevValue !== undefined && prevValue === part.digitValue;

    if (unchanged) {
      const prev = nextGenerations.get(part.key) ?? 0;
      nextGenerations.set(part.key, prev + 1);
    }
  }

  return nextGenerations;
}

/**
 * Tracks which digits need a full-wheel continuous spin.
 *
 * When `continuous` is enabled, unchanged lower-significance digits spin
 * through a complete cycle alongside higher-significance digits that changed.
 * For example, 100 -> 200 with trend=1 makes ones and tens both do a
 * full upward rotation even though their values didn't change.
 *
 * Returns a Map<key, generation> where generation increments each time
 * a digit should perform a continuous spin. Returns undefined when
 * continuous is disabled (zero overhead path).
 */
export function useContinuousSpin(
  keyedParts: KeyedPart[],
  continuous: boolean | undefined,
  trend: Trend,
): Map<string, number> | undefined {
  const prevPartsRef = useRef<KeyedPart[]>([]);
  const generationsRef = useRef<Map<string, number>>(new Map());

  if (!continuous) {
    prevPartsRef.current = keyedParts;
    return undefined;
  }

  const prevParts = prevPartsRef.current;
  prevPartsRef.current = keyedParts;

  // First render, nothing to compare against
  if (prevParts.length === 0) return generationsRef.current;

  // Shortest-path trend defeats the purpose of continuous spin
  if (trend === 0) return generationsRef.current;

  generationsRef.current = computeContinuousGenerations(
    prevParts,
    keyedParts,
    generationsRef.current,
  );

  return generationsRef.current;
}
