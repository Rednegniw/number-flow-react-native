/**
 * Deterministic PRNG (mulberry32). Both variants of a pair replay the exact
 * same value sequence so digit travel distances and enter/exit events are
 * identical; without this, workload differences masquerade as perf deltas.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rows = ticks + 1 (row 0 is the initial pre-tick value set), cols = cells */
export function makeValueMatrix(seed: number, rows: number, cols: number): number[][] {
  const rand = mulberry32(seed);

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(10000 + rand() * 89990)),
  );
}
