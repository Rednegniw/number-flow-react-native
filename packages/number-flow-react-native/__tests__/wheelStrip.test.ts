import { normalizeWheelPosition, wheelStripDigit } from "../src/core/utils";

const PAD = 2;
const COUNT = 10;

describe("normalizeWheelPosition", () => {
  it("folds any position into one turn", () => {
    expect(normalizeWheelPosition(0, COUNT)).toBe(0);
    expect(normalizeWheelPosition(3.5, COUNT)).toBeCloseTo(3.5);
    expect(normalizeWheelPosition(10, COUNT)).toBe(0);
    expect(normalizeWheelPosition(12.25, COUNT)).toBeCloseTo(2.25);
  });

  it("handles negative positions (downward rolls)", () => {
    expect(normalizeWheelPosition(-1, COUNT)).toBe(9);
    expect(normalizeWheelPosition(-0.5, COUNT)).toBeCloseTo(9.5);
    expect(normalizeWheelPosition(-23, COUNT)).toBe(7);
  });

  it("works for non-decimal wheels (TimeFlow uses 6 and 24)", () => {
    expect(normalizeWheelPosition(7, 6)).toBe(1);
    expect(normalizeWheelPosition(-1, 24)).toBe(23);
  });
});

describe("wheelStripDigit", () => {
  /**
   * The strip is translated by -position line-heights, so index
   * position + PAD sits in the window and must resolve to `position`.
   * Getting this normalization wrong rotates the entire wheel.
   */
  it("puts the requested digit at the window index", () => {
    for (let position = 0; position < COUNT; position++) {
      expect(wheelStripDigit(position + PAD, PAD, COUNT)).toBe(position);
    }
  });

  it("normalizes the leading padding instead of rotating the wheel", () => {
    expect(wheelStripDigit(0, PAD, COUNT)).toBe(8);
    expect(wheelStripDigit(1, PAD, COUNT)).toBe(9);
    expect(wheelStripDigit(2, PAD, COUNT)).toBe(0);
  });

  /**
   * Wrap invariance: the strip jumps by a whole turn when position wraps, so
   * index i and index i + count must render the same digit for that jump to be
   * invisible.
   */
  it("repeats every full turn", () => {
    const stripLength = COUNT + 2 * PAD;
    for (let i = 0; i + COUNT < stripLength; i++) {
      expect(wheelStripDigit(i, PAD, COUNT)).toBe(wheelStripDigit(i + COUNT, PAD, COUNT));
    }
  });

  it("covers neighbours on both sides at every position", () => {
    const stripLength = COUNT + 2 * PAD;

    for (let position = 0; position < COUNT; position++) {
      const center = position + PAD;
      // The window shows roughly +/-1.5 line-heights, so these must exist
      expect(center - 2).toBeGreaterThanOrEqual(0);
      expect(center + 2).toBeLessThan(stripLength);
    }
  });

  it("returns values inside the wheel for every strip index", () => {
    const stripLength = COUNT + 2 * PAD;

    for (let i = 0; i < stripLength; i++) {
      const digit = wheelStripDigit(i, PAD, COUNT);
      expect(digit).toBeGreaterThanOrEqual(0);
      expect(digit).toBeLessThan(COUNT);
      expect(Number.isInteger(digit)).toBe(true);
    }
  });
});
