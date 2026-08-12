import { render } from "@testing-library/react-native";
import { useEffect } from "react";
import type { SharedValue } from "react-native-reanimated";
import { DEFAULT_TRANSFORM_TIMING } from "../../core/timing";
import { useAnimatedX } from "../../core/useAnimatedX";

/**
 * Regression test for the teleporting-slot bug: useAnimatedX used to SNAP a
 * slot's first-ever x change (a guard meant only for Skia shared-mode init),
 * so a slot whose x stayed constant across several values jumped instantly
 * on its first legitimate move while sibling slots animated, visibly
 * breaking digit spacing (observed as a wide gap after "1" during
 * 199,999 -> 200,000).
 */

let latest: SharedValue<number> | null = null;

const Probe = ({ targetX }: { targetX: number }) => {
  const animatedX = useAnimatedX(targetX, false, DEFAULT_TRANSFORM_TIMING);

  useEffect(() => {
    latest = animatedX;
  });
  return null;
};

beforeEach(() => {
  latest = null;
});

test("the first x change animates instead of snapping", async () => {
  jest.useFakeTimers();

  const { rerender } = await render(<Probe targetX={45} />);
  expect(latest?.value).toBe(45);

  /** First-ever change for this slot: 45 -> 58 */
  await rerender(<Probe targetX={58} />);

  /**
   * Immediately after the change the value must still be at (or near) the
   * start: withTiming animates it. The buggy code assigned 58 synchronously.
   */
  expect(latest?.value).not.toBe(58);

  jest.advanceTimersByTime(DEFAULT_TRANSFORM_TIMING.duration + 100);
  expect(latest?.value).toBe(58);

  jest.useRealTimers();
});

test("subsequent changes animate too", async () => {
  jest.useFakeTimers();

  const { rerender } = await render(<Probe targetX={0} />);
  await rerender(<Probe targetX={20} />);
  jest.advanceTimersByTime(DEFAULT_TRANSFORM_TIMING.duration + 100);
  expect(latest?.value).toBe(20);

  await rerender(<Probe targetX={40} />);
  expect(latest?.value).not.toBe(40);

  jest.advanceTimersByTime(DEFAULT_TRANSFORM_TIMING.duration + 100);
  expect(latest?.value).toBe(40);

  jest.useRealTimers();
});
