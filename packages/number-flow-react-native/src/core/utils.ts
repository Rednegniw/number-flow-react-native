import { DIGIT_COUNT } from "./constants";

/**
 * Computes the signed modular offset for digit n relative to virtual
 * scroll position c. Returns a value in [-5, 5), where 0 means the
 * digit is centered in the viewport.
 *
 * This is the Reanimated equivalent of NumberFlow's CSS:
 *   offset-raw: mod(length + n - mod(c, length), length)
 *   offset: offset-raw - length * round(down, offset-raw / (length/2), 1)
 */
export function signedDigitOffset(n: number, c: number): number {
  "worklet";
  const raw = (((n - c) % DIGIT_COUNT) + DIGIT_COUNT) % DIGIT_COUNT;
  return raw >= 5 ? raw - DIGIT_COUNT : raw;
}

/**
 * Computes the roll delta for a digit transition, respecting the trend direction.
 *
 * For trend > 0 (always up): 8→2 = +4 (through 9,0,1,2), not -6
 * For trend < 0 (always down): 2→8 = -6 (through 1,0,9,8), not +4
 * For trend = 0 (auto): takes the shortest path (max 5 steps)
 */
export function computeRollDelta(
  prev: number,
  next: number,
  trend: number,
): number {
  "worklet";
  if (prev === next) return 0;

  if (trend > 0) {
    // Always roll up (positive delta)
    return next >= prev ? next - prev : 10 - prev + next;
  }
  if (trend < 0) {
    // Always roll down (negative delta)
    return next <= prev ? next - prev : -(10 - next + prev);
  }
  // Auto: shortest path
  const diff = next - prev;
  if (Math.abs(diff) <= 5) return diff;
  return diff > 0 ? diff - 10 : diff + 10;
}

// Checks if a character is a digit (0-9).
export function isDigitChar(char: string): boolean {
  "worklet";
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57; // '0' = 48, '9' = 57
}

