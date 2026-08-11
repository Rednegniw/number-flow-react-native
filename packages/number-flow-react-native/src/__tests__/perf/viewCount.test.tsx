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
   * 146 before the finding-4 work; 77 after collapsing DigitElement to a
   * single Animated.Text and merging the slot transform + clip wrappers.
   */
  expect(countNodes(result.toJSON() as JsonNode | JsonNode[])).toBe(77);
});
