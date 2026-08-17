import { render } from "@testing-library/react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

const mockRenderLog: number[] = [];

jest.mock("../../native/DigitSlot", () => {
  const ReactActual = require("react");
  const actual = jest.requireActual("../../native/DigitSlot");

  const CountingDigitSlot = ReactActual.memo((props: { digitValue: number }) => {
    mockRenderLog.push(props.digitValue);
    return ReactActual.createElement(actual.DigitSlot, props);
  });

  return { DigitSlot: CountingDigitSlot };
});

beforeEach(() => {
  mockRenderLog.length = 0;
});

/**
 * Mechanism test for the memo-busting `style = {}` default: with the bug,
 * every DigitSlot re-renders on a value change because textStyle gets a new
 * identity each render. test.failing flips to a hard failure once the fix
 * lands, at which point remove the .failing modifier.
 */
test("updating one digit re-renders only that DigitSlot", async () => {
  seedSyntheticMetrics();
  const { rerender } = await render(<NumberFlow value={123} />);

  expect(mockRenderLog.length).toBe(3);
  mockRenderLog.length = 0;

  await rerender(<NumberFlow value={124} />);

  expect(mockRenderLog).toEqual([4]);
});
