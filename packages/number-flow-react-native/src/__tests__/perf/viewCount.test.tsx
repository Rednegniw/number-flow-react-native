import { render } from "@testing-library/react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

interface JsonNode {
  children?: (JsonNode | string)[] | null;
}

function countNodes(node: JsonNode | JsonNode[] | string | null): number {
  if (node === null || typeof node === "string") return 0;
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + countNodes(child), 0);

  const childCount = (node.children ?? []).reduce<number>(
    (sum, child) => sum + countNodes(child as JsonNode | string),
    0,
  );
  return 1 + childCount;
}

const CURRENCY = { style: "currency", currency: "USD" } as const;

/**
 * Tracked baseline for finding 4 (view-tree weight). This number is a
 * recorded fact, not a target: update it deliberately whenever a change
 * intentionally alters the slot view structure, and mention the delta in
 * the changeset.
 */
test("host node count for $1,234.56 stays at its recorded baseline", async () => {
  seedSyntheticMetrics(CURRENCY);
  const result = await render(<NumberFlow format={CURRENCY} value={1234.56} />);

  /**
   * 146 originally; 77 after collapsing each digit to a single Animated.Text
   * and merging the slot transform + clip wrappers; 107 after the wheel-strip
   * change, which deliberately trades static nodes for animated ones. Each
   * slot now holds a strip view plus digitCount + 4 plain Texts (padding for
   * neighbours across a wrap) instead of digitCount animated Texts, so per
   * frame a spinning slot commits one animated style rather than about four.
   */
  expect(countNodes(result.toJSON() as JsonNode | JsonNode[])).toBe(107);
});
