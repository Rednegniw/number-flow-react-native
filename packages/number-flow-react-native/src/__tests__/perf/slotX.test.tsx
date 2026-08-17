import { act, render } from "@testing-library/react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

/**
 * Slot targetX must stay at the layout position for every commit after a
 * value change, including commits caused by container onLayout events firing
 * mid-animation (the animated container minWidth relayouts on device).
 */

let mockNineXs: number[] = [];

jest.mock("../../native/DigitSlot", () => ({
  DigitSlot: (props: { digitValue: number; targetX: number }) => {
    if (props.digitValue === 9) mockNineXs.push(props.targetX);
    return null;
  },
}));

test("slot x stays at layout position through the settle window", async () => {
  jest.useFakeTimers();
  seedSyntheticMetrics(undefined, { narrowOne: true });

  const result = await render(<NumberFlow value={123449} />);
  const fireLayout = (width: number) =>
    act(async () => {
      result.root?.props.onLayout?.({ nativeEvent: { layout: { width, height: 24, x: 0, y: 0 } } });
    });
  await fireLayout(66);

  mockNineXs = [];
  await result.rerender(<NumberFlow value={199999} />);

  for (const [ms, width] of [
    [100, 67],
    [1000, 69],
    [4000, 70],
  ] as const) {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
    await fireLayout(width);
  }

  /** w(1)=6, w(digit)=10, w(,)=10: the five nines sit at 6, 16, 36, 46, 56 */
  const expected = [6, 16, 36, 46, 56];
  expect(mockNineXs.length % 5).toBe(0);
  for (let i = 0; i < mockNineXs.length; i += 5) {
    expect(mockNineXs.slice(i, i + 5)).toEqual(expected);
  }

  jest.useRealTimers();
});
