const warned = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (__DEV__ && !warned.has(key)) {
    warned.add(key);
    console.warn(`[NumberFlow] ${message}`);
  }
}
