const SUFFIXES = ["", "%", " mg", " ml", "\u00B0", " BAC", "$"];
const PREFIXES = ["", "$", "~", "+", "-"];

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomValue(): number {
  const digits = randomInt(1, 7);
  const maxWhole = 10 ** digits;
  const hasFraction = Math.random() > 0.4;
  if (hasFraction) {
    const fractionDigits = randomInt(1, 4);
    const factor = 10 ** fractionDigits;
    return Math.round(randomInRange(0, maxWhole) * factor) / factor;
  }
  return randomInt(0, maxWhole - 1);
}

export function pickSuffix(): string {
  return pick(SUFFIXES);
}

export function pickPrefix(): string {
  return pick(PREFIXES);
}
