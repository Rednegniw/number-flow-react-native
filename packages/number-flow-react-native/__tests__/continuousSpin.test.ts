import type { KeyedPart } from "../src/core/types";
import { computeContinuousGenerations } from "../src/core/useContinuousSpin";

function digit(key: string, value: number): KeyedPart {
  return { key, type: "digit", char: String(value), digitValue: value };
}

function symbol(key: string, char: string): KeyedPart {
  return { key, type: "symbol", char, digitValue: -1 };
}

/**
 * Helper: builds keyed parts for an integer value.
 * 42 → [integer:1=4, integer:0=2]
 * 200 → [integer:2=2, integer:1=0, integer:0=0]
 */
function integerParts(value: number): KeyedPart[] {
  const str = String(value);
  const parts: KeyedPart[] = [];

  for (let i = 0; i < str.length; i++) {
    const pos = str.length - 1 - i;
    const d = Number(str[i]);
    parts.push(digit(`integer:${pos}`, d));
  }

  return parts;
}

/**
 * Helper: builds keyed parts for a time HH:MM:SS.
 */
function timeParts(h: number, m: number, s: number): KeyedPart[] {
  return [
    digit("h10", Math.floor(h / 10)),
    digit("h1", h % 10),
    symbol("sep", ":"),
    digit("m10", Math.floor(m / 10)),
    digit("m1", m % 10),
    symbol("sep2", ":"),
    digit("s10", Math.floor(s / 10)),
    digit("s1", s % 10),
  ];
}

describe("computeContinuousGenerations", () => {
  test("100→200: ones and tens spin, hundreds doesn't", () => {
    const prev = integerParts(100);
    const current = integerParts(200);

    const result = computeContinuousGenerations(prev, current, new Map());

    // integer:2 (hundreds) changed 1→2 — no spin
    expect(result.has("integer:2")).toBe(false);

    // integer:1 (tens) unchanged 0→0, pos 1 < maxChanged 2 — spins
    expect(result.get("integer:1")).toBe(1);

    // integer:0 (ones) unchanged 0→0, pos 0 < maxChanged 2 — spins
    expect(result.get("integer:0")).toBe(1);
  });

  test("100→101: only ones changed, no continuous spin needed", () => {
    const prev = integerParts(100);
    const current = integerParts(101);

    const result = computeContinuousGenerations(prev, current, new Map());

    // Only integer:0 changed (0→1), it's the most significant changed digit
    // No digits below it → nothing to spin
    expect(result.size).toBe(0);
  });

  test("no digit changed: returns previous generations unchanged", () => {
    const parts = integerParts(100);
    const prevGen = new Map([["integer:0", 3]]);

    const result = computeContinuousGenerations(parts, parts, prevGen);

    expect(result).toBe(prevGen);
  });

  test("generations accumulate across transitions", () => {
    const step1 = integerParts(100);
    const step2 = integerParts(200);
    const step3 = integerParts(300);

    const gen1 = computeContinuousGenerations(step1, step2, new Map());
    expect(gen1.get("integer:0")).toBe(1);

    const gen2 = computeContinuousGenerations(step2, step3, gen1);
    expect(gen2.get("integer:0")).toBe(2);
    expect(gen2.get("integer:1")).toBe(2);
  });

  test("entering digit (not in prev) is not affected", () => {
    // 9→10: integer:0 changed (9→0), integer:1 is new (entering)
    const prev = integerParts(9);
    const current = integerParts(10);

    const result = computeContinuousGenerations(prev, current, new Map());

    // integer:1 is new (didn't exist in prev) — should not be marked for spin
    expect(result.has("integer:1")).toBe(false);
  });

  test("changed digit below max is not marked for spin", () => {
    // 120→230: integer:2 changed (1→2), integer:1 changed (2→3), integer:0 unchanged (0→0)
    const prev = integerParts(120);
    const current = integerParts(230);

    const result = computeContinuousGenerations(prev, current, new Map());

    // integer:0 (ones) unchanged, pos 0 < maxChanged 2 — spins
    expect(result.get("integer:0")).toBe(1);
    // integer:1 changed — doesn't spin (it rolls normally)
    expect(result.has("integer:1")).toBe(false);
  });

  test("time keys: 1:00:00→2:00:00 spins m and s digits", () => {
    const prev = timeParts(1, 0, 0);
    const current = timeParts(2, 0, 0);

    const result = computeContinuousGenerations(prev, current, new Map());

    // h1 changed (1→2), maxChangedPos = 4
    // All unchanged digits below pos 4 should spin
    expect(result.get("m10")).toBe(1);
    expect(result.get("m1")).toBe(1);
    expect(result.get("s10")).toBe(1);
    expect(result.get("s1")).toBe(1);

    // h10 is unchanged but pos 5 >= maxChanged 4 — doesn't spin
    expect(result.has("h10")).toBe(false);
  });

  test("symbols are ignored", () => {
    const prev = [digit("integer:1", 1), symbol("group:0", ","), digit("integer:0", 0)];
    const current = [digit("integer:1", 2), symbol("group:0", ","), digit("integer:0", 0)];

    const result = computeContinuousGenerations(prev, current, new Map());

    // Only integer:0 should be in the map, not group:0
    expect(result.get("integer:0")).toBe(1);
    expect(result.has("group:0")).toBe(false);
  });
});
