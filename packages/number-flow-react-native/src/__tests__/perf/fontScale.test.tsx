import { act, render } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

/**
 * Regression: the glyph metrics cache ignored the system font scale, so
 * changing Dynamic Type / Android font size reused widths measured at the old
 * scale and digits overlapped or clipped. A new scale must mount the
 * (onTextLayout-driven) measurement text again.
 */
test("re-measures glyphs when the system font scale changes", async () => {
  seedSyntheticMetrics();
  const result = await render(<NumberFlow value={42} />);
  const measuring = () =>
    result.container.queryAll((node) => typeof node.props.onTextLayout === "function").length > 0;

  expect(measuring()).toBe(false);

  const window = Dimensions.get("window");
  await act(() => {
    Dimensions.set({ window: { ...window, fontScale: window.fontScale + 1 } });
  });

  expect(measuring()).toBe(true);
});
