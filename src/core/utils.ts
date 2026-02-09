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

/**
 * Checks if a character is a digit (0-9).
 */
export function isDigitChar(char: string): boolean {
  "worklet";
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57; // '0' = 48, '9' = 57
}

/**
 * Parses a single digit character to its numeric value.
 * Returns -1 for non-digit characters.
 */
export function charToDigit(char: string): number {
  "worklet";
  const code = char.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  return -1;
}
