import { render } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useAccessibilityAnnouncement } from "../../core/useAccessibilityAnnouncement";

/**
 * Regression: caching screen-reader state process-wide must not drop
 * announcements that occur before the initial async query resolves (or when
 * it rejects). While the cached state is unknown, each announcement falls
 * back to querying, exactly like the pre-cache behavior.
 */

const Probe = ({ label }: { label: string }) => {
  useAccessibilityAnnouncement(label);
  return null;
};

test("a label change racing the initial query still announces", async () => {
  let resolveQuery: (v: boolean) => void = () => {};
  const query = jest
    .spyOn(AccessibilityInfo, "isScreenReaderEnabled")
    .mockImplementation(() => new Promise<boolean>((r) => (resolveQuery = r)));
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation();
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation(() => ({ remove: jest.fn() }) as never);

  const { rerender } = await render(<Probe label="100" />);

  /** Label changes while the initial query is still pending */
  await rerender(<Probe label="200" />);
  resolveQuery(true);
  await new Promise((r) => setTimeout(r, 0));

  expect(announce).toHaveBeenCalledWith("200");

  query.mockRestore();
  announce.mockRestore();
});
