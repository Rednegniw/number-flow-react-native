import { DIGIT_COUNT } from "./constants";
import type { Trend, TrendProp } from "./types";

/**
 * Computes the signed modular offset for digit n relative to virtual
 * scroll position c. Returns a value in [-half, half), where 0 means
 * the digit is centered in the viewport.
 *
 * This is the Reanimated equivalent of NumberFlow's CSS:
 *   offset-raw: mod(length + n - mod(c, length), length)
 *   offset: offset-raw - length * round(down, offset-raw / (length/2), 1)
 */
export function signedDigitOffset(n: number, c: number, digitCount: number = DIGIT_COUNT): number {
  "worklet";

  const raw = (((n - c) % digitCount) + digitCount) % digitCount;
  const half = digitCount / 2;

  return raw >= half ? raw - digitCount : raw;
}

/**
 * Computes the roll delta for a digit transition, respecting the trend direction.
 *
 * For trend > 0 (always up):   8→2 = +4 (through 9,0,1,2), not -6
 * For trend < 0 (always down): 2→8 = -6 (through 1,0,9,8), not +4
 * For trend = 0 (auto):        takes the shortest path
 */
export function computeRollDelta(
  prev: number,
  next: number,
  trend: number,
  digitCount: number = DIGIT_COUNT,
): number {
  "worklet";

  if (prev === next) return 0;

  // Always roll up (positive delta)
  if (trend > 0) {
    return next >= prev ? next - prev : digitCount - prev + next;
  }

  // Always roll down (negative delta)
  if (trend < 0) {
    return next <= prev ? next - prev : -(digitCount - next + prev);
  }

  // Auto: shortest path
  const half = digitCount / 2;
  const diff = next - prev;

  if (Math.abs(diff) <= half) return diff;
  return diff > 0 ? diff - digitCount : diff + digitCount;
}

/**
 * Resolves a TrendProp (static value or function) into a concrete Trend.
 * When undefined, auto-detects direction from the value change.
 */
export function resolveTrend(
  trendProp: TrendProp | undefined,
  prevValue: number | undefined,
  nextValue: number | undefined,
): Trend {
  const hasChange = prevValue !== undefined && nextValue !== undefined && prevValue !== nextValue;

  // Static trend value — pass through
  if (typeof trendProp === "number") {
    return trendProp;
  }

  // Function trend — call with prev/next when there's an actual change
  if (typeof trendProp === "function") {
    return hasChange ? trendProp(prevValue, nextValue) : 0;
  }

  // Auto-detect from direction of change
  return hasChange ? (Math.sign(nextValue - prevValue) as Trend) : 0;
}

/**
 * Extracts the significance position from a digit's keyed part key.
 * "integer:2" → 2 (hundreds), "fraction:0" → -1 (tenths).
 * Returns undefined for non-digit keys (symbols, decimals, etc.).
 */
export function parseDigitPosition(key: string): number | undefined {
  "worklet";

  // Exponent digits are a separate domain — they don't cascade in continuous spin
  if (key.startsWith("exponentInteger:")) return undefined;

  if (key.startsWith("integer:")) {
    return parseInt(key.slice(8), 10);
  }

  if (key.startsWith("fraction:")) {
    return -(parseInt(key.slice(9), 10) + 1);
  }

  // Time digit keys — significance ordered: s1 < s10 < m1 < m10 < h1 < h10
  switch (key) {
    case "s1":
      return 0;
    case "s10":
      return 1;
    case "m1":
      return 2;
    case "m10":
      return 3;
    case "h1":
      return 4;
    case "h10":
      return 5;
    default:
      return undefined;
  }
}

/**
 * Correct wheel size for each time digit position.
 * s10/m10 only go 0-5, h10 only goes 0-2.
 */
export const TIME_DIGIT_COUNTS: Record<string, number> = {
  s1: 10,
  s10: 6,
  m1: 10,
  m10: 6,
  h1: 10,
  h10: 3,
};

/**
 * Resolves the wheel size for a digit at a given key.
 * Uses the `digits` prop for NumberFlow, or TIME_DIGIT_COUNTS for TimeFlow.
 * Returns DIGIT_COUNT (10) when no constraint applies.
 */
export function getDigitCount(
  digits: Record<number, { max: number }> | undefined,
  key: string,
): number {
  if (!digits) return DIGIT_COUNT;

  const pos = parseDigitPosition(key);
  if (pos === undefined || pos < 0) return DIGIT_COUNT;

  const constraint = digits[pos];
  return constraint ? constraint.max + 1 : DIGIT_COUNT;
}
