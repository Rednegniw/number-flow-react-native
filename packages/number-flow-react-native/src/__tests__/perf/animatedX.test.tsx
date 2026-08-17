import { render } from "@testing-library/react-native";
import { useEffect } from "react";
import type { SharedValue } from "react-native-reanimated";
import { DEFAULT_TRANSFORM_TIMING } from "../../core/timing";
import { useAnimatedX } from "../../core/useAnimatedX";

/**
 * Regression: useAnimatedX used to SNAP a slot's first-ever x change (a
 * guard meant only for Skia shared-mode init), so a slot whose x stayed
 * constant across several values jumped instantly on its first legitimate
 * move, visibly breaking digit spacing (e.g. rolling 199,999 -> 200,000).
 */

let latest: SharedValue<number> | null = null;

const Probe = ({ targetX }: { targetX: number }) => {
  const animatedX = useAnimatedX(targetX, false, DEFAULT_TRANSFORM_TIMING);
  useEffect(() => {
    latest = animatedX;
  });
  return null;
};

test("every x change animates, including the first", async () => {
  jest.useFakeTimers();

  const { rerender } = await render(<Probe targetX={45} />);
  expect(latest?.value).toBe(45);

  for (const target of [58, 70]) {
    await rerender(<Probe targetX={target} />);
    /** The buggy code assigned the first change synchronously */
    expect(latest?.value).not.toBe(target);

    jest.advanceTimersByTime(DEFAULT_TRANSFORM_TIMING.duration + 100);
    expect(latest?.value).toBe(target);
  }

  jest.useRealTimers();
});
