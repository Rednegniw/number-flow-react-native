import { normalizeWheelPosition, wheelStripDigit } from "../src/core/utils";

const PAD = 2;
const COUNT = 10;

test("normalizeWheelPosition folds any position into one turn", () => {
  expect(normalizeWheelPosition(12.25, COUNT)).toBeCloseTo(2.25);
  expect(normalizeWheelPosition(-1, COUNT)).toBe(9);
  expect(normalizeWheelPosition(-23, COUNT)).toBe(7);
  expect(normalizeWheelPosition(7, 6)).toBe(1);
});

test("the strip shows the requested digit at the window index", () => {
  /**
   * The strip translates by -position line-heights, so index position + PAD
   * must resolve to `position`. Normalizing by anything other than COUNT
   * (e.g. the strip length, COUNT + 2*PAD) rotates the whole wheel.
   */
  for (let position = 0; position < COUNT; position++) {
    expect(wheelStripDigit(position + PAD, PAD, COUNT)).toBe(position);
  }
  expect(wheelStripDigit(0, PAD, COUNT)).toBe(8);
  expect(wheelStripDigit(1, PAD, COUNT)).toBe(9);
});

test("index i and i + count render the same digit (wrap jump invisibility)", () => {
  const stripLength = COUNT + 2 * PAD;
  for (let i = 0; i + COUNT < stripLength; i++) {
    expect(wheelStripDigit(i, PAD, COUNT)).toBe(wheelStripDigit(i + COUNT, PAD, COUNT));
  }
});
