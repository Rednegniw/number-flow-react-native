/**
 * Drives `count` value updates at `intervalMs` and measures JS event-loop
 * lateness: how far behind schedule each tick fired. Re-render cost on the
 * JS thread shows up directly in this number.
 */
export function runTicks(
  count: number,
  intervalMs: number,
  onTick: (tickIndex: number) => void,
): Promise<number[]> {
  return new Promise((resolve) => {
    const drifts: number[] = [];
    const startTime = performance.now();
    let i = 0;

    const id = setInterval(() => {
      const expected = startTime + (i + 1) * intervalMs;
      drifts.push(performance.now() - expected);

      i++;
      onTick(i);

      if (i >= count) {
        clearInterval(id);
        resolve(drifts);
      }
    }, intervalMs);
  });
}
