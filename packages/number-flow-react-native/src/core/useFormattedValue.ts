import { useMemo } from "react";
import { getOrCreateFormatter } from "./intlHelpers";

/**
 * Formats a numeric value to a display string using Intl.NumberFormat, with optional prefix/suffix.
 * Useful for providing an accessibility label on a parent Canvas for Skia components:
 *
 * ```tsx
 * const label = useFormattedValue(value, { style: "currency", currency: "USD" });
 *
 * <Canvas accessible accessibilityLabel={label}>
 *   <SkiaNumberFlow value={value} font={font} format={{ style: "currency", currency: "USD" }} />
 * </Canvas>
 * ```
 */
export function useFormattedValue(
  value: number | undefined,
  format?: Intl.NumberFormatOptions,
  locales?: Intl.LocalesArgument,
  prefix?: string,
  suffix?: string,
): string | undefined {
  // Serialize format/locales to a stable string — avoids re-runs when callers pass inline objects
  const formatKey = useMemo(() => JSON.stringify([locales, format]), [locales, format]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: formatKey serializes locales+format into a stable string to avoid re-runs on inline objects
  return useMemo(() => {
    if (value === undefined) return undefined;
    const formatter = getOrCreateFormatter(locales, format);
    return `${prefix ?? ""}${formatter.format(value)}${suffix ?? ""}`;
  }, [value, prefix, suffix, formatKey]);
}
