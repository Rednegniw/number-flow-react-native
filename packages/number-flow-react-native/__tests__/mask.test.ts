import type { CharLayout } from "../src/core/layout";
import { computeAdaptiveMaskHeights } from "../src/core/mask";
import type { GlyphMetrics } from "../src/core/types";

/**
 * Synthetic metrics that model a typical font at ~20px.
 * ascent is negative (above baseline), descent is positive (below baseline).
 */
const baseMetrics: GlyphMetrics = {
  charWidths: { "0": 10, "1": 10, "5": 10, y: 10, g: 10 },
  maxDigitWidth: 10,
  lineHeight: 24,
  ascent: -18,
  descent: 6,
  charBounds: {
    "0": { top: -14, bottom: 0 },
    "1": { top: -14, bottom: 0 },
    "5": { top: -14, bottom: 0 },
    y: { top: -12, bottom: 5 },
    g: { top: -12, bottom: 5 },
  },
};

function makeEntry(char: string, overrides?: Partial<CharLayout>): CharLayout {
  return {
    key: `test:${char}`,
    char,
    isDigit: char >= "0" && char <= "9",
    digitValue: char >= "0" && char <= "9" ? Number(char) : -1,
    x: 0,
    width: 10,
    ...overrides,
  };
}

// ─── computeAdaptiveMaskHeights ───

describe("computeAdaptiveMaskHeights", () => {
  test("digits only: large bottom dead zone (no descenders)", () => {
    const layout = [makeEntry("1"), makeEntry("5")];
    const result = computeAdaptiveMaskHeights(layout, new Map(), baseMetrics);

    /**
     * Digits have charBounds top=-14, bottom=0.
     * Dead zone top = -ascent - (-tightestTop) - PADDING = 18 - 14 - 2 = 2
     * Dead zone bottom = descent - tightestBottom - PADDING = 6 - 0 - 2 = 4
     */
    expect(result.top).toBeGreaterThan(0);
    expect(result.bottom).toBeGreaterThan(0);

    // Bottom dead zone (4) is larger than top (2), so bottom needs less expansion
    expect(result.expansionBottom).toBeLessThanOrEqual(result.expansionTop);
  });

  test("characters with descenders: smaller bottom dead zone", () => {
    const digitsOnly = [makeEntry("1")];
    const withDescenders = [makeEntry("y"), makeEntry("g")];

    const digitsResult = computeAdaptiveMaskHeights(digitsOnly, new Map(), baseMetrics);
    const descResult = computeAdaptiveMaskHeights(withDescenders, new Map(), baseMetrics);

    /**
     * Descenders push tightestBottom up to 5 (vs 0 for digits), shrinking bottom dead zone.
     * Dead zone bottom for descenders: 6 - 5 - 2 = 0 (clamped) vs digits: 6 - 0 - 2 = 4
     */
    expect(descResult.expansionBottom).toBeGreaterThan(digitsResult.expansionBottom);
  });

  test("empty layout: top dead zone large enough, bottom may need small expansion", () => {
    const result = computeAdaptiveMaskHeights([], new Map(), baseMetrics);

    /**
     * No chars processed, tightestTop=0, tightestBottom=0.
     * Dead zone top = -ascent - 0 - PADDING = 18 - 2 = 16 (exceeds target 4.8)
     * Dead zone bottom = descent - 0 - PADDING = 6 - 2 = 4 (below target 4.8)
     */
    expect(result.expansionTop).toBe(0);

    const targetGradient = 0.2 * baseMetrics.lineHeight;
    const deadZoneBottom = baseMetrics.descent - 0 - 2;
    expect(result.expansionBottom).toBeCloseTo(targetGradient - deadZoneBottom, 5);
  });

  test("superscript entries are skipped", () => {
    const layout = [
      makeEntry("5"),
      makeEntry("1", { superscript: true, key: "exponentInteger:0" }),
    ];
    const layoutWithoutSuperscript = [makeEntry("5")];

    const withSuperscript = computeAdaptiveMaskHeights(layout, new Map(), baseMetrics);
    const withoutSuperscript = computeAdaptiveMaskHeights(
      layoutWithoutSuperscript,
      new Map(),
      baseMetrics,
    );

    expect(withSuperscript.top).toBe(withoutSuperscript.top);
    expect(withSuperscript.bottom).toBe(withoutSuperscript.bottom);
    expect(withSuperscript.expansionTop).toBe(withoutSuperscript.expansionTop);
    expect(withSuperscript.expansionBottom).toBe(withoutSuperscript.expansionBottom);
  });

  test("exiting entries contribute to bounds", () => {
    const layout: CharLayout[] = [];
    const exitingEntries = new Map<string, CharLayout>([
      ["exit:y", makeEntry("y", { key: "exit:y" })],
    ]);

    const withExiting = computeAdaptiveMaskHeights(layout, exitingEntries, baseMetrics);
    const withoutExiting = computeAdaptiveMaskHeights(layout, new Map(), baseMetrics);

    // "y" has descender (bottom=5), so exiting entries should increase tightestBottom
    expect(withExiting.expansionBottom).toBeGreaterThanOrEqual(withoutExiting.expansionBottom);
  });

  test("expansion fills gap when dead zone < target gradient", () => {
    // Create metrics where descent is very small, making bottom dead zone tiny
    const tightMetrics: GlyphMetrics = {
      ...baseMetrics,
      descent: 1,
      lineHeight: 19,
      charBounds: {
        "0": { top: -14, bottom: 0.5 },
      },
    };

    const layout = [makeEntry("0")];
    const result = computeAdaptiveMaskHeights(layout, new Map(), tightMetrics);

    /**
     * Dead zone bottom = 1 - 0.5 - 2 = clamped to 0
     * Target gradient = 0.2 * 19 = 3.8
     * Expansion = 3.8 - 0 = 3.8
     */
    expect(result.expansionBottom).toBeGreaterThan(0);

    // Total gradient = deadZone + expansion = target
    const targetGradient = 0.2 * tightMetrics.lineHeight;
    expect(result.bottom).toBeCloseTo(targetGradient, 5);
  });

  test("mixed layout + exiting: both sources contribute to maximum bounds", () => {
    const layout = [makeEntry("0")];
    const exitingEntries = new Map<string, CharLayout>([
      ["exit:g", makeEntry("g", { key: "exit:g" })],
    ]);

    const combined = computeAdaptiveMaskHeights(layout, exitingEntries, baseMetrics);
    const layoutOnly = computeAdaptiveMaskHeights(layout, new Map(), baseMetrics);
    const exitingOnly = computeAdaptiveMaskHeights([], exitingEntries, baseMetrics);

    /**
     * Combined should use the maximum bounds from both sources.
     * "g" has larger descent than "0", so combined bottom should match exiting-only.
     */
    expect(combined.bottom).toBe(exitingOnly.bottom);

    /**
     * "0" has larger ascent bound than "g", so combined top should match layout-only.
     * "0" has top=-14, "g" has top=-12, so "0" has more ascent.
     */
    expect(combined.top).toBe(layoutOnly.top);
  });
});
