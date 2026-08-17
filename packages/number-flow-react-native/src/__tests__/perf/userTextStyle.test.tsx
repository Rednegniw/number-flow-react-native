import { render } from "@testing-library/react-native";
import { NumberFlow } from "../../native/NumberFlow";
import { seedSyntheticMetrics } from "./seedMetrics";

/**
 * Regression: collapsing slots to single animated nodes put the internal
 * animated style LAST in the style array, so a user-provided `opacity` (or
 * `transform`) in the text style was overridden instead of composed. Slot
 * opacity is 1 at rest, so the product must equal the user's value.
 */

interface JsonNode {
  type?: string;
  props?: { style?: unknown };
  children?: (JsonNode | string)[] | null;
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    const acc: Record<string, unknown> = {};
    for (const s of style) Object.assign(acc, flatten(s));
    return acc;
  }
  return (style as Record<string, unknown>) ?? {};
}

function collectTextNodes(node: JsonNode | string | null, out: JsonNode[]): void {
  if (!node || typeof node === "string") return;
  if (node.type === "Text") out.push(node);
  for (const child of node.children ?? []) collectTextNodes(child, out);
}

const CURRENCY = { style: "currency", currency: "USD" } as const;

test("user opacity in style reaches symbol and digit glyphs", async () => {
  seedSyntheticMetrics(CURRENCY);
  const result = await render(
    <NumberFlow format={CURRENCY} style={{ opacity: 0.25 }} value={1234.56} />,
  );

  const texts: JsonNode[] = [];
  collectTextNodes(result.toJSON() as JsonNode, texts);

  const byGlyph = (glyph: string) =>
    texts.filter((t) => (t.children ?? []).some((c) => c === glyph));

  const dollar = byGlyph("$");
  const digitOne = byGlyph("1");
  expect(dollar.length).toBeGreaterThan(0);
  expect(digitOne.length).toBeGreaterThan(0);

  for (const node of [...dollar, ...digitOne]) {
    expect(flatten(node.props?.style).opacity).toBeCloseTo(0.25);
  }
});
